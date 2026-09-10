import { useEffect, useMemo, useRef, useState } from 'react'
import { useBalancesStore, isInitialView } from '../store/balances.store'
import { useRealtimeRefresh } from '../hooks/useRealtimeRefresh'
import { useToastStore } from '../store/toast.store'
import { useSyncStore } from '../store/sync.store'
import { Button } from '../components/ui/Button'
import { PrintHead } from '../components/PrintHead'
import { ItemCard } from '../components/nomenclature/ItemCard'
import { ConditionCell } from '../components/balances/ConditionCell'
import { nf, money, fmtD } from '../lib/format'
import { whLabel } from '../lib/movementRoute'
import { applyCut, SHOW_MAX } from '../lib/showAllCut'
import { xls } from '../lib/xls'
import { COND_COLS, condKey, type CondKey } from '../lib/condSplit'
import { buildBalanceRows, CONDF, type BalanceRow } from '../lib/balanceRows'
import {
  filterBalanceRows, sortBalanceRows, balanceKpis,
  type ZeroSegment, type CondFilter,
} from '../lib/balanceFilters'
import {
  buildInitialBalanceRows, filterInitialBalanceRows, sortInitialBalanceRows,
  modeLabel, modeQtyColumn, type InitialBalanceMode, type InitialBalanceRow,
} from '../lib/initialBalance'
import {
  BALANCE_EXPORT_NAME, CURRENT_TABLE_HEADER, initialTableHeader,
  currentBalanceExportMatrix, initialBalanceExportMatrix,
} from '../lib/balanceExport'
import { canEditCond } from '../lib/canEditCond'
import { normaliseCondInput } from '../lib/condInput'
import { setStockCondition } from '../api/setStockCondition.api'
import type { Me } from '../lib/roles'

/* «Anbar qalıqları» — Module J (Phase 9). Ported from index.html:326-332
   (markup) and rBal() 2207-2378, with the condition editor 2380-2410 and
   saveCond() 2153-2205.

   Every piece of logic behind it was built and tested in T1/T2 and is REUSED
   here, not reimplemented: this component composes, formats and renders.

   NO CLIENT-SIDE ANBARDAR SCOPING (M9-17). The legacy screen applies no
   warehouse restriction of its own, and neither does this one: an anbardar's
   rows are limited by the live RLS SELECT policies. The warehouse FILTER LIST
   is likewise the full `DB.whs` (M9-18).

   The ONE write on this screen is the condition marker (Q1, owner-approved),
   through `setStockCondition()` behind the mutation guard (M9-106, M9-107).

   D-J2 — realtime scope departs from legacy (owner-approved, M9-130a): the
   subscription is exactly the four tables THIS screen reads — including
   `stock_conditions`, which legacy omits, and excluding `partners`, which
   legacy carries but this screen never reads. `audit_log` is never subscribed. */

/** M9-130 / D-J2 — exactly the four tables the snapshot reads. */
const WATCHED_TABLES = ['movements', 'items', 'warehouses', 'stock_conditions'] as const

/** The zero-segment buttons — `#bf-z` (index.html:2216). `init` switches views. */
const SEGMENTS: { key: ZeroSegment | 'init'; label: string; gap?: boolean }[] = [
  { key: 'act', label: 'Aktiv qalıq' },
  { key: 'all', label: 'Hamısı' },
  { key: 'neg', label: 'Mənfi' },
  { key: 'zero', label: 'Sıfır' },
  { key: 'init', label: 'Əvvələ qalıq', gap: true },
]

/** `#bf-init-mode` (2217). */
const INIT_MODES: { key: InitialBalanceMode; label: string }[] = [
  { key: 'initial', label: 'İlkin miqdar' },
  { key: 'current', label: 'Cari qalıq' },
]

/** The legacy epsilon used by the opening-view «Sıfır qalıq» tile (2260). */
const EPS = 1e-9

interface Props {
  me: Me
  /** M5-55 precedent — «Bu mal üzrə əməliyyat» from the item card. Optional so
      the page stays renderable on its own. */
  onOpenOperation?: (code: string) => void
  /** The item card's «Malı redaktə et» — handed up, like the operation link,
      because the item form lives on the Nomenklatura screen. Optional. */
  onEditItem?: (code: string) => void
}

export function BalancesPage({ me, onOpenOperation, onEditItem }: Props) {
  const {
    items, warehouses, indexes, conds,
    loading, error, loaded, filters, showAll,
    setFilters, setShowAll, load, applyConditionResult,
  } = useBalancesStore()
  const showToast = useToastStore((st) => st.show)
  const setSync = useSyncStore((st) => st.setState)

  /* M9-05 — the screen loads its own data when opened. */
  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /* M9-130 … M9-132 — the debounce (400 ms) and teardown live in the hook;
     ordering between a realtime refresh and any concurrent load is the
     store's monotonic sequence (M9-133), not this component's business. */
  useRealtimeRefresh(true, WATCHED_TABLES, () => { void load() })

  const mounted = useRef(true)
  useEffect(() => {
    mounted.current = true
    return () => { mounted.current = false }
  }, [])

  /* M9-50 — the search box is debounced 200 ms like `debounce(..., 200)`
     (2219). The INPUT is local; the committed value goes to the store already
     trimmed and lower-cased, matching `BF.q`. Legacy also writes `BF.page = 0`
     there, which nothing on this screen reads (see the store's note). */
  const [queryInput, setQueryInput] = useState(filters.q)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  useEffect(() => () => clearTimeout(debounceRef.current), [])
  function onQueryChange(v: string) {
    setQueryInput(v)
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => setFilters({ q: v.trim().toLowerCase() }), 200)
  }

  const init = isInitialView(filters)

  /* ---------- current view (2280-2346) ---------- */
  const rows = useMemo(
    () => buildBalanceRows(indexes.bal, items, conds, filters.w),
    [indexes, items, conds, filters.w],
  )
  /** `rows` in rBal() — the FULL filtered, sorted set; the cap is applied after. */
  const all = useMemo(
    () => init
      ? []
      : sortBalanceRows(
          filterBalanceRows(rows, { z: filters.z as ZeroSegment, q: filters.q, cond: filters.cond }),
          filters.sort,
        ),
    [rows, init, filters.z, filters.q, filters.cond, filters.sort],
  )
  /* M9-61 — over the COMPLETE filtered set, never the capped page. */
  const kpis = useMemo(() => balanceKpis(all), [all])

  /* ---------- «Əvvələ qalıq» view (2236-2278) ---------- */
  /* M9-71 — the source is `indexes.operational`, i.e. `excludeCancelled()`
     output from the shared index builder: `normalMovements()`, never the raw
     rows. */
  const initialBase = useMemo(
    () => init ? buildInitialBalanceRows(indexes.operational, items, indexes.bal, warehouses) : [],
    [init, indexes, items, warehouses],
  )
  const initialAll = useMemo(
    () => init
      ? sortInitialBalanceRows(
          filterInitialBalanceRows(initialBase, { q: filters.q, w: filters.w, mode: filters.initMode }),
          filters.sort,
          filters.initMode,
        )
      : [],
    [init, initialBase, filters.q, filters.w, filters.initMode, filters.sort],
  )
  const qtyCol = modeQtyColumn(filters.initMode)
  const label = modeLabel(filters.initMode)
  /** `wSel` (2240) — `__sum` is "no warehouse filter" in this view (M9-79). */
  const wSel = filters.w && filters.w !== '__sum' ? filters.w : ''
  const initTotQty = useMemo(
    () => initialAll.reduce((s, b) => s + (b[qtyCol] || 0), 0),
    [initialAll, qtyCol],
  )
  const initZeroCount = useMemo(
    () => initialAll.filter((b) => Math.abs(b[qtyCol]) < EPS).length,
    [initialAll, qtyCol],
  )

  /* M9-56 / M9-57 — the 3000-row soft cap; `showAll` is sticky. */
  const list: readonly (BalanceRow | InitialBalanceRow)[] = init ? initialAll : all
  const page = applyCut(list as unknown[], showAll)
  const capped = !showAll && list.length > SHOW_MAX

  /* ---------- item card (M9-140) ---------- */
  const [cardCode, setCardCode] = useState<string | null>(null)

  /* ---------- export (M9-110 … M9-119) ---------- */
  /* Gated on `loaded`, like «Mal hərəkəti»: after a FAILED refresh the store
     keeps the last good snapshot whole (M9-12), and exporting that intact
     snapshot is correct — it is what the «Yenilənmədi» banner says is on
     screen. Before the first success there is nothing to export. */
  const canExport = loaded
  function exportXls() {
    /* The FULL filtered set of the ACTIVE view — never the capped page. */
    const matrix = init
      ? initialBalanceExportMatrix(initialAll, filters.initMode)
      : currentBalanceExportMatrix(all)
    const outcome = xls(matrix, BALANCE_EXPORT_NAME)
    /* The legacy toasts live at the call site (see lib/xls.ts). */
    if (outcome === 'csv') showToast('Excel kitabxanası yüklənmədi, CSV yüklənir', true)
    else showToast(BALANCE_EXPORT_NAME + '.xlsx yükləndi')
  }

  /* ---------- print (M9-120 / M9-121 — OUTSIDE acceptance, Q2) ---------- */
  const [stampedAt, setStampedAt] = useState<Date | null>(null)
  const printTitle = init ? `Anbar qalıqları — Əvvələ qalıq (${label})` : 'Anbar qalıqları'
  const printNote = init
    ? `${wSel || 'bütün anbarlar'} · ${nf(initialAll.length)} mövqe`
    : `${filters.w === '__sum' ? 'ümumi' : (filters.w || 'bütün anbarlar')} · ${nf(all.length)} mövqe`
  function print() {
    setStampedAt(new Date())
    setTimeout(() => window.print(), 60)
  }

  /* ---------- condition editing (Q1; M9-92 … M9-108, M9-134b) ---------- */
  /** The cell whose commit is in flight — `w|c|key`. */
  const [pendingCell, setPendingCell] = useState<string | null>(null)

  async function saveCondition(w: string, c: string, key: CondKey, raw: string) {
    /* M9-96 / M9-97 — normalise FIRST; a bad value means NO RPC. */
    const parsed = normaliseCondInput(raw)
    if (!parsed.ok) { showToast(parsed.error, true); return }

    const cell = `${w}|${c}|${key}`
    setPendingCell(cell)

    /* D-J3 / M9-134b — the payload is COMPOSED at commit time from the
       LATEST snapshot record, read from the store NOW, not from a copy taken
       when the edit began: the edited key gets the user's value, the other
       three keys and the note get whatever the newest snapshot holds. The
       pre-edit baseline is never resent (M9-98). */
    const latest = useBalancesStore.getState().conds.get(condKey(w, c))
    const cur = latest ?? { unfit: 0, repair: 0, onsite: 0, icare: 0, note: '' }
    const next = { unfit: cur.unfit, repair: cur.repair, onsite: cur.onsite, icare: cur.icare || 0 }
    next[key] = parsed.value

    const res = await setStockCondition({
      warehouse: w, itemCode: c, ...next, note: cur.note || null, editedKey: key,
    })
    if (!mounted.current) return
    setPendingCell(null)

    if (!res.ok) {
      /* M9-100 and the guard message are shown verbatim; a server or network
         failure gets the legacy «Xəta: » prefix (2203) — M9-104, M9-108. The
         store is untouched, so the cell REVERTS to the previous value. */
      const verbatim = res.kind === 'icare-unsupported' || res.kind === 'blocked'
      showToast(verbatim ? res.error : 'Xəta: ' + res.error, true)
      setSync('error')
      return
    }
    /* M9-101 / M9-105 — the server-confirmed row (or its removal) is the
       only thing the table ever re-renders from. */
    applyConditionResult(w, c, res.row)
    setSync('synced')
    if (res.exceedsBalance) {
      /* M9-102 — a WARNING on a successful write. */
      showToast('Diqqət: işarələnmiş miqdar qalıqdan (' + nf(res.balance, 2) + ') çoxdur', true)
    } else {
      showToast('Vəziyyət yeniləndi')
    }
  }

  /* ---------- render ---------- */
  const emptyCurrent = !init && loaded && !all.length
  const emptyInitial = init && loaded && !initialAll.length

  return (
    <>
      <PrintHead title={printTitle} userName={me.name} note={printNote} stampedAt={stampedAt} />

      {/* M9-02 / M9-03 — heading, subtitle and «Excel» then «Çap». */}
      <div className="phead">
        <div>
          <h2>Anbar qalıqları</h2>
          <p>Qalıq = mədaxil − məxaric. Dəyər son məlum vahid qiyməti əsasında hesablanır.</p>
        </div>
        <div className="sp" />
        {/* UNGATED by role, matching legacy `#bal-exp` (M9-118): every role that
            may open this screen may export what RLS lets it see. */}
        <Button variant="secondary" data-testid="bal-export" disabled={!canExport} onClick={exportXls}>
          Excel
        </Button>
        {/* «Çap» — ported as the legacy call; OUTSIDE the acceptance boundary
            (Q2 settled: M9-120/M9-121). Never claimed as working. */}
        <Button variant="secondary" data-testid="bal-print" onClick={print}>
          Çap
        </Button>
      </div>

      {/* `#bal-filters` — index.html:2212-2218. */}
      <div className="filters">
        <input
          type="search"
          aria-label="Axtarış"
          placeholder="Mal adı və ya kod…"
          value={queryInput}
          onChange={(e) => onQueryChange(e.target.value)}
        />
        {/* M9-18 — built from ALL of DB.whs, never the user's scope. The
            option VALUE is the stored name; only the text passes through
            whLabel() (M9-143). */}
        <select aria-label="Anbar" value={filters.w} onChange={(e) => setFilters({ w: e.target.value })}>
          <option value="">Anbarlar üzrə ayrı</option>
          <option value="__sum">Ümumi (anbarlar birlikdə)</option>
          {warehouses.map((w) => <option key={w} value={w}>{whLabel(w)}</option>)}
        </select>
        <div className="seg" role="group" aria-label="Qalıq seqmenti">
          {SEGMENTS.map((s) => (
            <button
              key={s.key}
              className={filters.z === s.key ? 'on' : undefined}
              aria-pressed={filters.z === s.key}
              style={s.gap ? { marginLeft: 16 } : undefined}
              onClick={() => setFilters({ z: s.key })}
            >
              {s.label}
            </button>
          ))}
        </div>
        {/* `#bf-init-mode` — shown only in the «Əvvələ qalıq» view (2225). */}
        {init && (
          <div className="seg" role="group" aria-label="Əvvələ qalıq rejimi">
            {INIT_MODES.map((m) => (
              <button
                key={m.key}
                className={filters.initMode === m.key ? 'on' : undefined}
                aria-pressed={filters.initMode === m.key}
                onClick={() => setFilters({ initMode: m.key })}
              >
                {m.label}
              </button>
            ))}
          </div>
        )}
        {/* M9-53 — the condition filter is HIDDEN while «Əvvələ qalıq» is
            active (2229): markers are meaningless in a historical view. */}
        {!init && (
          <select
            aria-label="Vəziyyət"
            value={filters.cond}
            onChange={(e) => setFilters({ cond: e.target.value as CondFilter })}
          >
            <option value="">Vəziyyət: hamısı</option>
            <option value="any">İşarələnmişlər</option>
            {COND_COLS.map((c) => <option key={c.k} value={c.k}>{c.t}</option>)}
          </select>
        )}
        <select aria-label="Sıralama" value={filters.sort} onChange={(e) => setFilters({ sort: e.target.value })}>
          <option value="val">Dəyərə görə</option>
          <option value="q">Miqdara görə</option>
          <option value="name">Ada görə</option>
          <option value="last">Son hərəkətə görə</option>
          {COND_COLS.map((c) => <option key={c.k} value={'cond:' + c.k}>{c.t} üzrə</option>)}
        </select>
      </div>

      {/* `#bal-kpis` — five tiles in the current view (2339-2345, M9-60 …
          M9-64), four in the opening view (2255-2260, M9-85). */}
      <div className="kpis" style={{ marginBottom: 12 }} data-testid="bal-kpis">
        {init ? (
          <>
            <Kpi label="Mövqe sayı" value={nf(initialAll.length)} sub={wSel || 'bütün anbarlar'} />
            <Kpi label="Ümumi miqdar" value={nf(initTotQty, 2)} sub={label + ' · ölçü vahidləri qarışıqdır'} />
            <Kpi label="Ümumi dəyər" value={money(0)} sub="bu görünüşdə hesablanmır" />
            <Kpi label="Sıfır qalıq" value={nf(initZeroCount)} sub="bu filtrdə" />
          </>
        ) : (
          <>
            <Kpi label="Mövqe sayı" value={nf(kpis.count)} sub={filters.w === '__sum' ? 'mal üzrə cəmi' : 'anbar × mal sətri'} />
            <Kpi label="Ümumi miqdar" value={nf(kpis.qty, 2)} sub="ölçü vahidləri qarışıqdır" />
            <Kpi label="Ümumi dəyər" value={money(kpis.val)} sub="son qiymətlərlə" cls="g" />
            <Kpi label="Sıfır qalıq" value={nf(kpis.zeroCount)} sub="bu filtrdə" />
            <Kpi label="Mənfi qalıq" value={nf(kpis.negCount)} sub="uçot xətası riski" cls={kpis.anyNegative ? 'r' : 'g'} />
          </>
        )}
      </div>

      <div className="card">
        <div className="tw" id="t-bal">
          {/* M9-12 / M9-136 — a failed refresh keeps the last good snapshot,
              so the error is shown ABOVE the table rather than instead of it,
              unless nothing has ever loaded. */}
          {error && loaded && (
            <div className="pad" data-testid="bal-refresh-error">
              <span className="tag t-rm">Yenilənmədi</span>{' '}
              <span className="hint">{error} · Ekranda son uğurlu oxunuşun məlumatı göstərilir.</span>
            </div>
          )}
          {loading && !loaded ? (
            <div className="empty"><b>Yüklənir…</b>Anbar qalıqları Supabase-dən oxunur.</div>
          ) : error && !loaded ? (
            <div className="empty" data-testid="bal-load-error"><b>Yükləmə xətası</b>{error}</div>
          ) : emptyInitial ? (
            /* M9-82 — three DISTINCT empty states, in the legacy order
               (2261-2265): no opening rows at all; «Cari qalıq» with none;
               filtered to nothing. */
            !initialBase.length ? (
              <div className="empty" data-testid="bal-empty-noinit">
                <b>İlkin qalıq tapılmadı</b>«Əvvələ qalıq» və «Anbar qalığı» ilə işarələnmiş mövqe yoxdur.
              </div>
            ) : filters.initMode === 'current' ? (
              <div className="empty" data-testid="bal-empty-nocurrent">
                <b>Cari qalıq tapılmadı</b>Seçilmiş mal/anbar üzrə cari qalıq yoxdur.
              </div>
            ) : (
              <div className="empty" data-testid="bal-empty-filtered">
                <b>Nəticə yoxdur</b>Bu süzgəclərə uyğun ilkin qalıq mövqeyi yoxdur.
              </div>
            )
          ) : emptyCurrent ? (
            /* The legacy `tbl()` default empty block (index.html:1411). */
            <div className="empty" data-testid="bal-empty">
              <b>Məlumat yoxdur</b>Filtrləri dəyişin və ya yeni qeyd əlavə edin.
            </div>
          ) : init ? (
            <table>
              <thead>
                <tr>
                  {initialTableHeader(filters.initMode).map((h, i) => (
                    <th key={h} className={i === 4 ? 'r' : undefined}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(page as InitialBalanceRow[]).map((b) => (
                  <tr
                    key={b.w + '|' + b.c}
                    className="clk"
                    data-card={b.c}
                    onClick={() => setCardCode(b.c)}
                  >
                    <td><span className="code">{b.c}</span></td>
                    <td><div className="nm">{b.name}</div></td>
                    <td>{whLabel(b.w)}</td>
                    <td>{b.unit}</td>
                    {/* M9-83 — `neg` on a negative quantity. */}
                    <td className="num"><b className={b[qtyCol] < 0 ? 'neg' : undefined}>{nf(b[qtyCol] || 0, 2)}</b></td>
                    {/* M9-81 — «—» placeholders; dates through fmtD. The
                        source warehouse is rendered RAW here (2272), unlike
                        the export. */}
                    <td>{b.opening_warehouse || '—'}</td>
                    <td>{fmtD(b.opening_date) || '—'}</td>
                    <td>{fmtD(b.last) || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <table>
              <thead>
                <tr>
                  {CURRENT_TABLE_HEADER.map((h, i) => (
                    <th key={h} className={i >= 4 && i <= 12 ? 'r' : undefined}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(page as BalanceRow[]).map((b) => (
                  <BalanceRowCells
                    key={b.w + '|' + b.c}
                    b={b}
                    me={me}
                    loaded={loaded}
                    pendingCell={pendingCell}
                    onOpen={setCardCode}
                    onSave={saveCondition}
                  />
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* `#bal-pager` — M9-58: «<n> sətir» (+ cap note); opening view
            «<n> sətir · <modeLabel>». */}
        <div
          className="pad"
          data-testid="bal-pager"
          style={{ borderTop: '1px solid var(--line-2)', display: 'flex', alignItems: 'center', gap: 10 }}
        >
          <span className="hint">
            {nf(list.length)} sətir{init ? ' · ' + label : ''}
            {capped && (
              <>
                {' · '}<b>{nf(SHOW_MAX)}</b> göstərilir{' '}
                <Button variant="secondary" size="sm" onClick={() => setShowAll(true)}>
                  {'Hamısını göstər (' + nf(list.length) + ')'}
                </Button>
              </>
            )}
          </span>
        </div>
      </div>

      {/* M9-140 — the item card drawer, opened by `data-card` row clicks. */}
      {cardCode && (
        <ItemCard
          code={cardCode}
          items={items}
          indexes={indexes}
          me={me}
          warehouses={warehouses}
          onEdit={(c) => onEditItem?.(c)}
          onOperation={(c) => onOpenOperation?.(c)}
          onClose={() => setCardCode(null)}
        />
      )}
    </>
  )
}

/** One KPI tile — the legacy template at 2345. */
function Kpi({ label, value, sub, cls }: { label: string; value: string; sub: string; cls?: string }) {
  return (
    <div className={'kpi' + (cls ? ' ' + cls : '')} data-kpi={label}>
      <div className="eyebrow">{label}</div>
      <div className="v">{value}</div>
      <div className="s">{sub}</div>
    </div>
  )
}

interface RowProps {
  b: BalanceRow
  me: Me
  loaded: boolean
  pendingCell: string | null
  onOpen: (code: string) => void
  onSave: (w: string, c: string, key: CondKey, raw: string) => void
}

/* One current-view row — index.html:2357-2364 (M9-110b).

   Module-level rather than nested inside the page: a component declared
   inside another is a NEW type on every render, so React would remount all
   3000 rows per keystroke. */
function BalanceRowCells({ b, me, loaded, pendingCell, onOpen, onSave }: RowProps) {
  /* M9-90 / M9-91 — the UI convenience gate. `loaded` stands in for
     `DB.condsReady`: the condition read is fatal (D-J1), so a loaded
     snapshot always carries the markers. The binding rule is the server's
     (M9-92). */
  const editable = canEditCond(me, b.w, loaded)
  return (
    <tr className="clk" data-card={b.c} onClick={() => onOpen(b.c)}>
      <td><span className="code">{b.c}</span></td>
      <td><div className="nm">{b.name}</div></td>
      <td>{whLabel(b.w)}</td>
      <td>{b.unit}</td>
      <td className="num">{nf(b.in, 2)}</td>
      <td className="num">{nf(b.out, 2)}</td>
      <td className="num"><b className={b.q < 0 ? 'neg' : undefined}>{nf(b.q, 2)}</b></td>
      {/* M9-40 — the four columns in COND_COLS order. */}
      {COND_COLS.map((cc) => (
        <td className="num" key={cc.k}>
          <ConditionCell
            warehouse={b.w}
            code={b.c}
            condKey={cc.k}
            title={cc.t}
            value={b[CONDF[cc.k]] || 0}
            canEdit={editable}
            pending={pendingCell === `${b.w}|${b.c}|${cc.k}`}
            onCommit={(raw) => onSave(b.w, b.c, cc.k, raw)}
          />
        </td>
      ))}
      <td className="num">{b.price ? nf(b.price, 2) : <span className="muted">—</span>}</td>
      <td className="num">{money(b.val)}</td>
      {/* M9-36 — a `nomv` row shows the tag instead of a date. */}
      <td>{b.nomv ? <span className="tag t-mut">hərəkət yoxdur</span> : fmtD(b.last)}</td>
    </tr>
  )
}
