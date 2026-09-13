import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Me } from '../lib/roles'
import type { MovementRow } from '../api/itemMovements.api'
import { useDashboardStore, activeWarehouseNames } from '../store/dashboard.store'
import { useRealtimeRefresh } from '../hooks/useRealtimeRefresh'
import { useToastStore } from '../store/toast.store'
import { useAuditLogStore } from '../store/auditLog.store'
import {
  scopeByWarehouse, dashboardKpis, warehouseValueBars, movementTypeCounts,
  topPositions, recentMovements, dashboardSubtitle,
} from '../lib/dashboard'
import { controlIssues } from '../lib/controlIssues'
import { nf, money, fmtD, today, typeTagClass } from '../lib/format'
import { whLabel } from '../lib/movementRoute'
import { recorderLabel } from '../lib/recorderLabel'
import { BarChart } from '../components/dashboard/BarChart'
import { Donut } from '../components/dashboard/Donut'
import { Button } from '../components/ui/Button'
import { ItemCard } from '../components/nomenclature/ItemCard'
import { fullRunExport, type FullExportDeps } from '../lib/fullExportRun'
import {
  sonRunExport, sonInputFromSnapshot, FULL_EXPORT_LABEL, FULL_EXPORT_TITLE,
  SON_EXPORT_BUSY, SON_EXPORT_LABEL, SON_EXPORT_TITLE, type SonExportDeps,
} from '../lib/sonExportRun'

/* «İdarə paneli» — the legacy `p-dash` shell (index.html:277-292) and
   rDash() (1534-1589). Ungated for every role (M11-02); what it shows is the
   RLS-shaped snapshot as returned (M11-18). Read-only.

   Selector asymmetry preserved from legacy: KPIs, donut, both tables and
   the subtitle COUNT follow `#dash-wh`; the bar chart, the subtitle's `last`
   date and the alerts card do not (M11-04, M11-30, M11-51).

   THE TWO HEADER EXPORTS SHIP (Phase 16). «⬇ Tam ixrac» and «⬇ Excel (SON
   formatı)» sit between the subtitle block and the warehouse select, in that
   order, exactly as index.html:279-281. Both are pure CLIENT-SIDE builds over
   the snapshot this page has already read — no RPC, no write, no extra fetch
   beyond the static SON template asset.

   THE EXPORTS IGNORE `#dash-wh` — and must. The selector scopes what the page
   DISPLAYS; «Tam ixrac» is by definition the whole dataset, and the SON
   workbook's pivots reconcile only against the complete movement set. A
   warehouse-scoped export would print totals that disagree with the file's own
   pivot tables. Legacy reads `DB`/`IX` directly for both (7604, 7908),
   never the selection. */

/** Exactly the legacy realtime table set (index.html:1174) — M11-13. */
const WATCHED = ['movements', 'items', 'partners', 'warehouses'] as const

/** index.html:1169 — M11-14. */
export const REALTIME_TOAST = 'Məlumatlar yeniləndi (digər istifadəçi)'

/** Historical Phase 11 label retained for audit/test imports. Phase 15 wires
 * the pill to the migrated Controls page, so rendered buttons no longer use it. */
export const CONTROL_PENDING_TITLE = 'Nəzarət və risklər hələ köhnə platformadadır'

/** D-L3 — the pills' legacy target `go('ctrl')` is Phase 15; until then a
    pill is inert and says so (the M5-55 precedent). */
interface Props {
  me: Me
  /** «Hamısı» → `go('mov')` (index.html:289, 1363) — M11-44. */
  onOpenMovements: () => void
  onOpenControls?: () => void
  onOpenOperation?: (code: string) => void
  onEditItem?: (code: string) => void
  /** Export boundaries, injected so tests drive the real control flow. */
  fullExportDeps?: FullExportDeps
  sonExportDeps?: SonExportDeps
}

/** `tbl()` with no rows — index.html:1411. */
function EmptyRows() {
  return <div className="empty"><b>Məlumat yoxdur</b>Filtrləri dəyişin və ya yeni qeyd əlavə edin.</div>
}

const num = (v: number | null | undefined): number => (v == null || isNaN(Number(v)) ? 0 : Number(v))

export function DashboardPage({
  me, onOpenMovements, onOpenControls, onOpenOperation, onEditItem,
  fullExportDeps, sonExportDeps,
}: Props) {
  const { movements, locations, items, partners, indexes, warehouse, loading, loaded, error, load, setWarehouse } = useDashboardStore()
  const emails = useAuditLogStore((s) => s.emails)
  const show = useToastStore((s) => s.show)
  const [cardCode, setCardCode] = useState<string | null>(null)
  /* THE TWO BUTTONS NEED DIFFERENT PROTECTION, because only one of them can
     actually be re-entered.

     «Excel (SON formatı)» AWAITS a fetch and a ZIP build, so there is a real
     in-flight window: a second click before the promise settles would start a
     second export. Two things close it, and they are not the same thing:

       · `disabled={sonBusy}` — the PRIMARY gate. React flushes the state
         update when the click handler returns, so by the next dispatched
         event the attribute is committed and the DOM refuses the click.
       · `sonBusyRef` — DEFENCE IN DEPTH for the case the attribute cannot
         cover: two real pointer events delivered before React commits, which
         a real browser can do and which `disabled` therefore misses.

     HONESTY ABOUT THE EVIDENCE: the ref is NOT provable through DOM events
     under jsdom. Testing Library wraps `fireEvent` in `act()`, which flushes
     the state update synchronously, so `disabled` is already set before a
     second synthetic click and the DOM swallows it — guarded and unguarded
     behave identically there (measured, 2026-09-13). The ref is exercised
     directly instead, by invoking the handler twice without the DOM. Same
     precedent as `woExportBusy` (MovementsPage.tsx:362), an awaited handler.

     «Tam ixrac» is SYNCHRONOUS: it builds the workbook and returns inside one
     event handler, so there is no window to re-enter — any flag it sets is
     already cleared by its own `finally` before the next event is dispatched.
     A ref here would be dead code pretending to be a guard, so it has none.
     Legacy agrees: `#full-exp` carries no disable, no busy label and no
     re-entry flag at all (index.html:279, 7673), unlike `#son-exp`
     (7902-7903, 7926). Two genuinely simultaneous clicks write the file
     twice, in this port exactly as in production. `fullBusy` exists only to
     render `disabled` between renders, not as a correctness guarantee. */
  const sonBusyRef = useRef(false)
  const [fullBusy, setFullBusy] = useState(false)
  const [sonBusy, setSonBusy] = useState(false)

  /* Both exports read the UNSCOPED snapshot. `indexes.operational` is the
     already-accepted `normalMovements()` set — cancellations filtered by
     `buildItemIndexes`, no second derivation. */
  function runFullExport() {
    setFullBusy(true)
    try {
      const out = fullRunExport(
        { movements: indexes.operational, items, partners, indexes },
        fullExportDeps,
      )
      show(out.message, out.isError)
    } finally {
      setFullBusy(false)
    }
  }

  /* The ref is checked and set at the TOP of the handler, before the first
     await, so a second click in the same tick returns immediately. */
  async function runSonExport() {
    if (sonBusyRef.current) return
    sonBusyRef.current = true
    setSonBusy(true)
    try {
      const out = await sonRunExport(
        sonInputFromSnapshot(
          items,
          partners as unknown as Record<string, unknown>[],
          indexes.operational as unknown as Record<string, unknown>[],
        ),
        sonExportDeps,
      )
      show(out.message, out.isError)
    } finally {
      sonBusyRef.current = false
      setSonBusy(false)
    }
  }
  void movements

  useEffect(() => { void load() }, [load])
  /* A realtime-triggered reload toasts on success only (1169); a first or
     manual load, and a failed reload, do not. */
  useRealtimeRefresh(true, WATCHED, () => {
    void load().then(({ ok }) => { if (ok) show(REALTIME_TOAST) })
  })

  /* `DB.whs` (933) — the selector's option set, rebuilt from the current
     snapshot on every render (D-L4). */
  const warehouses = useMemo(() => activeWarehouseNames(locations), [locations])
  const scope = useMemo(() => scopeByWarehouse(indexes.bal, indexes.operational, warehouse), [indexes, warehouse])
  const kpis = useMemo(() => dashboardKpis(scope, items), [scope, items])
  const bars = useMemo(() => warehouseValueBars(warehouses, indexes.bal), [warehouses, indexes])
  const types = useMemo(() => movementTypeCounts(scope.movs), [scope])
  const top = useMemo(() => topPositions(scope.pos), [scope])
  const recent = useMemo(() => recentMovements(scope.movs), [scope])
  const itemBy = useMemo(() => new Map(items.map((i) => [i.code, i])), [items])
  /* `m.by` — index.html:990, through the App-warmed directory (M11-43). */
  const recorder = useCallback((m: MovementRow) => recorderLabel(m.created_by, emails, me), [emails, me])
  const groups = useMemo(() => controlIssues({
    bal: indexes.bal, byItem: indexes.byItem, operational: indexes.operational, items, partners,
    locationNames: locations.map((l) => l.name), warehouses, today: today(), recorder,
  }), [indexes, items, partners, locations, warehouses, recorder])
  const subtitle = dashboardSubtitle(warehouse, indexes.operational, scope.movs)

  return <>
    <div className="phead">
      <div><h2>İdarə paneli</h2><p data-testid="dash-sub">{subtitle}</p></div>
      <div className="sp" />
      {/* index.html:279-281 — both exports precede the warehouse select, in
          this order, with the legacy titles. `.btn` with no `pri`. */}
      <Button
        variant="secondary" id="full-exp" title={FULL_EXPORT_TITLE}
        disabled={fullBusy} onClick={runFullExport}
      >
        {FULL_EXPORT_LABEL}
      </Button>
      <Button
        variant="secondary" id="son-exp" title={SON_EXPORT_TITLE}
        disabled={sonBusy} onClick={() => { void runSonExport() }}
      >
        {sonBusy ? SON_EXPORT_BUSY : SON_EXPORT_LABEL}
      </Button>
      <select data-testid="dash-wh" aria-label="Anbar" value={warehouse} onChange={(e) => setWarehouse(e.target.value)} style={{ width: 'auto', minWidth: 150 }}>
        <option value="">Bütün anbarlar</option>
        {warehouses.map((w) => <option key={w} value={w}>{whLabel(w)}</option>)}
      </select>
    </div>
    {loading && !loaded && <div className="empty" data-testid="dash-loading"><b>Yüklənir…</b>İdarə paneli Supabase-dən oxunur.</div>}
    {error && !loaded && <div className="empty" data-testid="dash-load-error"><b>Yükləmə xətası</b>{error}</div>}
    {/* M11-12 — a failed REFRESH keeps the previous complete snapshot on
        screen and only flags it. */}
    {error && loaded && <div className="hint" data-testid="dash-refresh-error"><span className="tag t-rm">Yenilənmədi</span> {error}</div>}
    {loaded && <>
      <div className="kpis" data-testid="dash-kpis">
        {kpis.map((k) => (
          <div key={k.label} className={'kpi' + (k.cls ? ' ' + k.cls : '')} data-kpi={k.label}>
            <div className="eyebrow">{k.label}</div><div className="v">{k.value}</div><div className="s">{k.sub}</div>
          </div>
        ))}
      </div>
      <div className="grid" style={{ gridTemplateColumns: '1.35fr 1fr', marginTop: 12 }}>
        <div className="card"><header><h3>Anbarlar üzrə dəyər və mövqe sayı</h3></header><div className="pad" data-testid="ch-wh">
          <BarChart data={bars} fmt={money} />
          <div className="hint" style={{ marginTop: 11 }}>Dəyər = qalıq × son məlum vahid qiyməti. Qiyməti daxil edilməmiş mallar sıfır dəyərlə iştirak edir.</div>
        </div></div>
        <div className="card"><header><h3>Əməliyyat növləri</h3></header><div className="pad" data-testid="ch-type"><Donut data={types} /></div></div>
      </div>
      <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', marginTop: 12 }}>
        <div className="card"><header><h3>Dəyərə görə ilk 10 mövqe</h3></header><div className="tw" data-testid="t-top">
          {top.length === 0 ? <EmptyRows /> : <table><thead><tr><th>Mal</th><th>Anbar</th><th className="r">Qalıq</th><th className="r">Dəyər</th></tr></thead><tbody>
            {top.map((b) => (
              <tr key={b.w + '|' + b.c} className="clk" onClick={() => setCardCode(b.c)}>
                <td><div>{b.name}</div><span className="code">{b.c}</span></td>
                <td>{whLabel(b.w)}</td>
                <td className="num">{nf(b.q, 2) + ' ' + b.unit}</td>
                <td className="num">{money(b.val)}</td>
              </tr>
            ))}
          </tbody></table>}
        </div></div>
        <div className="card"><header><h3>Son əməliyyatlar</h3><div className="sp" /><Button variant="secondary" size="sm" data-testid="dash-all-movements" onClick={onOpenMovements}>Hamısı</Button></header><div className="tw" data-testid="t-recent">
          {recent.length === 0 ? <EmptyRows /> : <table><thead><tr><th>Tarix</th><th>Mal</th><th>Növ</th><th className="r">Miqdar</th></tr></thead><tbody>
            {recent.map((m) => {
              const i = num(m.in_qty), o = num(m.out_qty)
              return (
                <tr key={m.id} className="clk" onClick={() => setCardCode(m.item_code)}>
                  <td>{fmtD(m.date)}<div className="hint">{recorder(m)}</div></td>
                  <td><div>{itemBy.get(m.item_code)?.name || m.item_code}</div><span className="code">{whLabel(m.warehouse)}</span></td>
                  <td><span className={'tag ' + typeTagClass(m.type)}>{m.type}</span></td>
                  <td className="num">
                    {i ? <span style={{ color: 'var(--in)' }}>{'+' + nf(i, 2)}</span> : null}
                    {o ? <span style={{ color: 'var(--out)' }}>{'−' + nf(o, 2)}</span> : null}
                  </td>
                </tr>
              )
            })}
          </tbody></table>}
        </div></div>
      </div>
      <div className="card" style={{ marginTop: 12 }}><header><h3>Diqqət tələb edən məsələlər</h3></header><div className="pad" data-testid="dash-alerts">
        {groups.length
          ? <div className="pill-row">{groups.map((g) => (
            <button key={g.id} type="button" className={'btn' + (g.sev === 'high' ? ' dgr' : '')} onClick={onOpenControls} data-alert={g.id}>
              {g.title + ' — '}<b className="num">{nf(g.rows.length)}</b>
            </button>
          ))}</div>
          : <span className="hint">Avtomatik yoxlamalar problem aşkarlamadı.</span>}
      </div></div>
    </>}
    {cardCode && <ItemCard code={cardCode} items={items} indexes={indexes} me={me} warehouses={warehouses} onEdit={(c) => onEditItem?.(c)} onOperation={(c) => onOpenOperation?.(c)} onClose={() => setCardCode(null)} />}
  </>
}
