import { useEffect, useMemo, useState } from 'react'
import { useAzpStore } from '../store/azp.store'
import { useToastStore } from '../store/toast.store'
import { Dialog } from '../components/ui/Dialog'
import { Button } from '../components/ui/Button'
import { nf, fmtD } from '../lib/format'
import {
  azpCanRead, azpIsAdmin, azpNeedAdmin, azpSyncButtons, AZP_NO_ACCESS_MESSAGE,
} from '../lib/azpRole'
import { azpN, azpR2, azpMoney } from '../lib/azpNum'
import { azpDayKey, azpUndatedHidden } from '../lib/azpDate'
import { azpFilterRows, azpTotals, type AzpMovement } from '../lib/azpFilter'
import { AZP_LABEL, AZP_MODULES, azpKindLabel, type AzpModule } from '../lib/azpLabels'
import { buildAzpReport, azpPeriodText, type AzpReport } from '../lib/azpReport'
import { azpReportExport } from '../lib/azpReportExport'
import {
  azpRunExport, AZP_EXPORT_BUSY, AZP_EXPORT_LABEL, type AzpExportDeps,
} from '../lib/azpExportRun'
import type { Me } from '../lib/roles'

/* Azpetrol / Araz — Module T (Phase 17). Ported from the `p-azp` markup
   (index.html:479-563) and `rAzp()` / `azpRender*()` (8201-8505, 8650-8913).

   READ-ONLY. Phase 17 holds no write authority: D-T1 (writes), D-T2 (TEST
   fixture), D-T3 (`azp_delete_card`), D-T4 (import) and D-T5 (bulk template
   export) are all undecided. So this page has NO «+ Kart», NO «+ Əməliyyat»,
   NO «⬆ Excel idxalı» — not a disabled one, an ABSENT one. A disabled button
   is a promise that the feature exists; that one does not exist in this
   phase. «Hesabat» and its export DO ship: the report is read-only, legacy
   leaves it visible to read roles, and its writer is the separate plain one
   (M17-63).

   THE FULL-MODULE «Excel ixracı» CONTROL SHIPS TOO (M17-95, M17-96, M17-98,
   M17-99). It is a pure CLIENT-SIDE build over data the board has already
   read — it opens the shipped template, patches it and downloads the file. It
   performs NO write and issues no request beyond fetching the template, so it
   is not gated by D-T1. D-T5 governs M17-100, the EGRESS row — whether real
   data may actually leave — and that row stays BLOCKED: nothing in this
   phase was run against real data.

   NO REALTIME (M17-29). Legacy subscribes to no azp table, so the board
   refreshes only on an explicit force. Adding a subscription is D-T6 (T1B)
   and is deliberately absent so it cannot block this page.

   BROWSER AFFORDANCE ONLY. `azpCanRead`/`azpIsAdmin` decide what renders,
   never what the server permits — the authority is `azp_can_read()` and the
   RLS SELECT policies (ledger M17-17…M17-21, all BLOCKED). Nothing on this
   page is evidence about them. */

interface Props {
  me: Me
}

/** The card columns' shared money cell, with the legacy negative marker. */
function moneyCell(v: unknown) {
  return <td className={'num' + (azpN(v) < 0 ? ' neg' : '')}>{azpMoney(v)}</td>
}

/** `azpNotReady(m)` — index.html:8239-8245. Null when the board may render. */
function notReady(loading: boolean, err: string | null) {
  if (loading) return <div className="empty">Yüklənir…</div>
  if (err) {
    return (
      <div className="empty">
        <b>Modul bazası əlçatan deyil</b>
        {err}
        <br />
        <span className="hint">
          sql/020_azpetrol_module.sql hələ tətbiq edilməyibsə, bu gözləniləndir.
        </span>
      </div>
    )
  }
  return null
}

/* The admin-gated write surfaces this page can open. Each corresponds to a
   legacy modal and to one `azp.*` guarded action; none is invoked in Phase 17
   (D-T1). Naming them as a closed union means a new surface cannot be added
   without being considered here. */
export type AzpWriteSurface =
  | { kind: 'card'; cardId: string | null }
  | { kind: 'movement'; cardId: string | null; movKind: 'medaxil' | 'mexaric' | null }
  | { kind: 'import' }
  | { kind: 'app-balance' }

export function AzpPage({ me }: Props) {
  /* Only the shell's own concerns are read here; each board component
     subscribes to its OWN store slice, so this must not destructure `data`
     or the filters — doing so would re-render the whole page on any board's
     change. */
  const { board, setBoard, load } = useAzpStore()
  const show = useToastStore((s) => s.show)
  const [historyCard, setHistoryCard] = useState<string | null>(null)
  const [reportOpen, setReportOpen] = useState(false)
  /* Which admin-gated write surface is open, if any. Phase 17 opens the
     surface and performs no write (D-T1). */
  const [writeSurface, setWriteSurface] = useState<AzpWriteSurface | null>(null)

  const canRead = azpCanRead(me)
  const admin = azpIsAdmin(me)

  /* `rAzp()` (8225-8227) — the board loads itself once when shown, and the
     store's own guards make a second render a no-op. */
  useEffect(() => {
    if (!canRead) return
    void load(board)
  }, [canRead, board, load])

  /* The gate — index.html:488, 8202-8208. The whole body is replaced, not
     merely hidden: there is nothing here a refused role may see. */
  if (!canRead) {
    return (
      <section className="page on" id="p-azp">
        <div className="azp-band">
          <div>
            <h2>Azpetrol / Araz</h2>
            <p id="azp-sub">Yanacaq kartlarının uçotu — ANBAR-dan tam ayrı modul</p>
          </div>
        </div>
        <div id="azp-gate" className="empty">
          <b>Giriş yoxdur</b>
          Bu modul yalnız Admin, Rəhbər və Mühasib üçün açıqdır.
        </div>
      </section>
    )
  }

  const L = AZP_LABEL[board]

  /* The write entry points (M17-67, M17-70, M17-15).

     EVERY ONE re-checks admin through `azpNeedAdmin` before opening anything,
     exactly as legacy does at the top of `azpQuick`, `azpCardModal`,
     `azpMovModal`, `azpImportModal` and `azpAppBalanceModal`. Hiding the
     button is not the check: an identity can change between render and click,
     and a hidden control is never a permission (M17-17…M17-21, BLOCKED).

     D-T1: the client write paths exist in `api/azpWrite.api.ts`, are guarded
     by `azp.*` actions, and are NOT invoked from here — Phase 17 opens the
     admin-gated entry point and performs no live write. */
  const needAdmin = () => azpNeedAdmin(me, show)
  const openWrite = (what: AzpWriteSurface) => {
    if (!needAdmin()) return
    setWriteSurface(what)
  }

  return (
    <section className="page on" id="p-azp">
      <div className="azp-band">
        <div>
          <h2>Azpetrol / Araz</h2>
          {/* 8209 — the subtitle names the SELECTED board. */}
          <p id="azp-sub">
            {L.title} — yanacaq kartlarının uçotu (ANBAR-dan tam ayrı modul)
          </p>
        </div>
        <div className="sp" />
        <div className="azp-switch" id="azp-switch">
          {AZP_MODULES.map((m) => (
            <button
              key={m}
              type="button"
              data-board={m}
              className={m === board ? 'on' : undefined}
              onClick={() => setBoard(m)}
            >
              {AZP_LABEL[m].title}
            </button>
          ))}
        </div>
      </div>

      <div id="azp-body">
        {/* BOTH boards are rendered, and exactly one carries `on` (M17-10).
            Their state never merges: each reads its own store entry. */}
        {AZP_MODULES.map((m) => (
          <AzpBoard
            key={m}
            m={m}
            on={m === board}
            admin={admin}
            onHistory={setHistoryCard}
            onReport={() => setReportOpen(true)}
            onQuick={(cardId, movKind) => openWrite({ kind: 'movement', cardId, movKind })}
            onEditCard={(cardId) => openWrite({ kind: 'card', cardId })}
            onNewCard={() => openWrite({ kind: 'card', cardId: null })}
            onNewMov={() => openWrite({ kind: 'movement', cardId: null, movKind: null })}
            onImport={() => openWrite({ kind: 'import' })}
            onEditAppBalance={() => openWrite({ kind: 'app-balance' })}
          />
        ))}
      </div>

      {historyCard && (
        <AzpHistoryDialog
          m={board}
          cardId={historyCard}
          onClose={() => setHistoryCard(null)}
        />
      )}
      {reportOpen && (
        <AzpReportDialog m={board} onClose={() => setReportOpen(false)} onToast={show} />
      )}
      {writeSurface && (
        <AzpWritePending
          surface={writeSurface}
          m={board}
          onClose={() => setWriteSurface(null)}
        />
      )}
    </section>
  )
}

/* ------------------------------------------------- write surfaces (D-T1) */

/** The title each write surface carries — the legacy modal titles.
    Not exported: it is used only by the surface below, and exporting a
    non-component from a component file breaks Fast Refresh. */
function azpWriteTitle(s: AzpWriteSurface, m: AzpModule): string {
  const L = AZP_LABEL[m]
  switch (s.kind) {
    case 'card': return (s.cardId ? 'Kartın redaktəsi' : 'Yeni kart') + ' — ' + L.title
    case 'movement': return 'Yeni əməliyyat — ' + L.title
    case 'import': return 'Excel idxalı — ' + L.title
    case 'app-balance': return 'Tətbiqin balansı — ' + L.title
  }
}

/**
 * The admin-gated write surface, as Phase 17 ships it.
 *
 * ═══ NO WRITE IS PERFORMED HERE (D-T1). ═══
 *
 * The affordance, the admin re-check and the surface are real — that is what
 * M17-15, M17-67 and M17-70 contract for. The write itself is deliberately
 * not wired: `api/azpWrite.api.ts` implements every RPC behind an `azp.*`
 * guarded action, and Phase 17 invokes none of them. Rendering an explicit
 * statement of that is honest; a form whose submit silently did nothing would
 * not be.
 */
function AzpWritePending(
  { surface, m, onClose }: { surface: AzpWriteSurface; m: AzpModule; onClose: () => void },
) {
  return (
    <Dialog
      title={azpWriteTitle(surface, m)}
      onClose={onClose}
      footer={<><div style={{ flex: 1 }} /><Button variant="secondary" onClick={onClose}>Bağla</Button></>}
    >
      <div className="empty" id="azp-write-pending">
        <b>Bu əməliyyat hələ aktiv deyil</b>
        Yazma yolları hazırdır, lakin bu mərhələdə işə salınmır.
      </div>
    </Dialog>
  )
}

/* ---------------------------------------------------------------- board */

interface BoardProps {
  m: AzpModule
  on: boolean
  admin: boolean
  onHistory: (cardId: string) => void
  onReport: () => void
  /** M17-70 — admin-only card write entry points. */
  onQuick: (cardId: string, kind: 'medaxil' | 'mexaric') => void
  onEditCard: (cardId: string) => void
  /** M17-15 — the three admin-only toolbar controls. */
  onNewCard: () => void
  onNewMov: () => void
  onImport: () => void
  /** M17-67 — the application-balance edit button. */
  onEditAppBalance: () => void
}

function AzpBoard({
  m, on, admin, onHistory, onReport,
  onQuick, onEditCard, onNewCard, onNewMov, onImport, onEditAppBalance,
}: BoardProps) {
  const st = useAzpStore((s) => s.data[m])
  const f = useAzpStore((s) => s.filter[m])
  const setFilter = useAzpStore((s) => s.setFilter)
  const clearFilter = useAzpStore((s) => s.clearFilter)
  const L = AZP_LABEL[m]
  const na = notReady(st.loading, st.err)
  /* M17-15 — derived from the same predicate legacy uses, not from a second
     copy of the role rule. */
  const buttons = azpSyncButtons(admin ? { role: 'admin' } : null)

  return (
    <div className={'azp-board' + (on ? ' on' : '')} id={'azp-board-' + m}>
      <AzpKpis m={m} admin={admin} onEditAppBalance={onEditAppBalance} />

      <div className="card" style={{ marginTop: 12 }}>
        <header>
          <h3>Kartların hesabatı</h3>
          {/* 537 — the Araz board alone carries the VAT tag. */}
          {L.vat && <span className="tag t-az">ƏDV DAXİL</span>}
          <div className="sp" />
          {/* M17-15 — `azpSyncButtons()` governs EXACTLY newcard, newmov and
              imp (legacy 8231-8238). It never names «Hesabat», which is why
              that control stays visible for a read role: the module's read
              users exist to read and report, and taking the report away would
              leave them nothing. */}
          {buttons.newcard && (
            <Button variant="secondary" size="sm" id={'azp-newcard-' + m} onClick={onNewCard}>
              + Kart
            </Button>
          )}
          {buttons.newmov && (
            <Button variant="secondary" size="sm" id={'azp-newmov-' + m} onClick={onNewMov}>
              + Əməliyyat
            </Button>
          )}
          {buttons.imp && (
            <Button variant="secondary" size="sm" id={'azp-imp-' + m} onClick={onImport}>
              Excel idxalı
            </Button>
          )}
          {/* M17-95…M17-99 — the full-module template export. Outside
              `azpSyncButtons`, so a READ role keeps it: legacy never hides it
              (azpRole.ts:102-106) and reading roles exist to read and
              report. */}
          <AzpExportButton m={m} />
          <Button variant="secondary" size="sm" id={'azp-rep-' + m} onClick={onReport}>
            Hesabat
          </Button>
        </header>
        <div className="tw" style={{ maxHeight: 'none' }} id={'azp-cards-' + m}>
          {na ?? (
            <AzpCardTable
              m={m} admin={admin} onHistory={onHistory}
              onQuick={onQuick} onEditCard={onEditCard}
            />
          )}
        </div>
      </div>

      <div className="card" style={{ marginTop: 12 }}>
        <header><h3>Kart əməliyyatları</h3></header>
        <div className="pad" style={{ paddingBottom: 0 }}>
          <div className="filters">
            <select
              id={'azp-f-card-' + m}
              value={f.card}
              onChange={(e) => setFilter(m, { card: e.target.value })}
            >
              <option value="">Bütün kartlar</option>
              {st.cards.map((c) => (
                <option key={String(c.card_id)} value={String(c.card_id ?? '')}>
                  {c.card_no} — {c.holder}
                </option>
              ))}
            </select>
            <select
              id={'azp-f-kind-' + m}
              value={f.kind}
              onChange={(e) => setFilter(m, { kind: e.target.value })}
            >
              <option value="">Bütün növlər</option>
              <option value="medaxil">Mədaxil</option>
              <option value="mexaric">{L.out}</option>
            </select>
            <input
              type="date" id={'azp-f-d1-' + m} title="Başlanğıc tarix"
              value={f.d1} onChange={(e) => setFilter(m, { d1: e.target.value })}
            />
            <input
              type="date" id={'azp-f-d2-' + m} title="Son tarix"
              value={f.d2} onChange={(e) => setFilter(m, { d2: e.target.value })}
            />
            <input
              type="search" id={'azp-f-q-' + m}
              placeholder="Qaimə № və ya qeyd üzrə axtar"
              value={f.q} onChange={(e) => setFilter(m, { q: e.target.value })}
            />
            <Button
              variant="secondary" size="sm" id={'azp-f-clr-' + m}
              onClick={() => clearFilter(m)}
            >
              Təmizlə
            </Button>
          </div>
        </div>
        <div className="tw" id={'azp-movs-' + m}>
          {na ?? <AzpMovTable m={m} admin={admin} />}
        </div>
      </div>

      <div className="card" style={{ marginTop: 12 }}>
        <header>
          <h3>Modulun audit jurnalı</h3>
          <div className="sp" />
          <span className="hint">yalnız {L.title}</span>
        </header>
        <div className="tw" style={{ maxHeight: 320 }} id={'azp-log-' + m}>
          {na ?? <AzpLogTable m={m} />}
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------- the export button */

/**
 * The full-module template export control (M17-95, M17-96, M17-98, M17-99) —
 * `azpExport(m)`'s button half, index.html:9725-9726, 9754-9755.
 *
 * ═══ THE UNFILTERED SET IS THE CONTRACT (M17-98). ═══
 *
 * It reads `data[m]` and NEVER `filter[m]`. The board's filters shape what the
 * user is looking at; the export is always the whole non-cancelled card
 * report, because its block totals must reconcile with each card's balance.
 * Subscribing to the filter slice at all would make that easy to break by
 * accident, so this component does not.
 *
 * ═══ ONE EXPORT AT A TIME. ═══
 *
 * `busy` is checked at the top of the handler, not merely reflected in
 * `disabled`. A disabled attribute is applied on the next render, so two
 * clicks inside one frame would otherwise start two exports and download two
 * files. The `finally` restores the label whichever path ran.
 */
export function AzpExportButton({ m, deps }: { m: AzpModule; deps?: AzpExportDeps }) {
  const st = useAzpStore((s) => s.data[m])
  const show = useToastStore((s) => s.show)
  const [busy, setBusy] = useState(false)

  const run = async () => {
    if (busy) return
    setBusy(true)
    try {
      const out = await azpRunExport(
        m,
        { cards: st.cards, movs: st.movs, appBalance: st.appBalance, ready: st.ready },
        deps,
      )
      show(out.message, out.isError)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Button
      variant="secondary" size="sm" id={'azp-exp-' + m}
      disabled={busy}
      onClick={() => { void run() }}
    >
      {busy ? AZP_EXPORT_BUSY : AZP_EXPORT_LABEL}
    </Button>
  )
}

/* ------------------------------------------------------------------ KPIs */

/* index.html:8248-8270. Aggregates ACTIVE cards only, while the first tile's
   subtitle names the FULL card count (M17-65). */
function AzpKpis(
  { m, admin, onEditAppBalance }:
  { m: AzpModule; admin: boolean; onEditAppBalance: () => void },
) {
  const st = useAzpStore((s) => s.data[m])
  const L = AZP_LABEL[m]
  const na = notReady(st.loading, st.err)

  if (na) {
    return (
      <div className="kpis" id={'azp-kpi-' + m}>
        <div className="card" style={{ gridColumn: '1/-1' }}>{na}</div>
      </div>
    )
  }

  const act = st.cards.filter((c) => c.active)
  const inn = act.reduce((s, c) => s + azpN(c.medaxil_total), 0)
  const out = act.reduce((s, c) => s + azpN(c.mexaric_total), 0)
  const bal = azpR2(inn - out)
  const neg = act.filter((c) => azpN(c.balance) < 0).length

  /* The five tiles in legacy order, plus the sixth only when a negative
     balance exists (M17-64). `app` is emitted on the fifth exactly as legacy
     does — it is an inert class there and stays inert here (M17-105). */
  const tiles: [string, string, string, string][] = [
    ['Aktiv kart', nf(act.length), st.cards.length + ' kartdan', ''],
    ['Ümumi mədaxil', azpMoney(inn), L.title + ' üzrə', 'gd'],
    ['Ümumi ' + L.out, azpMoney(out), L.title + ' üzrə', 'wn'],
    [L.total, azpMoney(bal), L.vat ? 'ƏDV daxil' : 'kartlar üzrə cari vəziyyət', neg ? 'al' : ''],
    ['Tətbiqin cari balansı', azpMoney(st.appBalance), 'əl ilə idarə olunur', 'app'],
  ]

  return (
    <div className="kpis" id={'azp-kpi-' + m}>
      {tiles.map(([eyebrow, value, sub, cls]) => (
        <div className={'kpi ' + cls} key={eyebrow}>
          {/* M17-67 — legacy 8262-8263 appends the edit button INSIDE the
              eyebrow of the application-balance tile, for an admin only. The
              fund is maintained by hand, so this is the module's only way to
              change it; a read role sees the figure with no control. */}
          <div className="eyebrow">
            {eyebrow}
            {cls === 'app' && admin && (
              <>
                {' '}
                <Button
                  variant="secondary" size="sm"
                  id={'azp-appbal-' + m}
                  style={{ marginLeft: 8 }}
                  onClick={onEditAppBalance}
                >
                  ✎ Düzəliş
                </Button>
              </>
            )}
          </div>
          <div className="v">{value}</div>
          <div className="s">{sub}</div>
        </div>
      ))}
      {neg > 0 && (
        <div className="kpi al">
          <div className="eyebrow">Mənfi balans</div>
          <div className="v">{nf(neg)}</div>
          <div className="s">kart yoxlanmalıdır</div>
        </div>
      )}
    </div>
  )
}

/* ------------------------------------------------------------ card table */

/* index.html:8272-8320. */
interface CardTableProps {
  m: AzpModule
  admin: boolean
  onHistory: (id: string) => void
  /** M17-70 — the admin-only quick write entry points. */
  onQuick: (id: string, kind: 'medaxil' | 'mexaric') => void
  onEditCard: (id: string) => void
}

function AzpCardTable({ m, admin, onHistory, onQuick, onEditCard }: CardTableProps) {
  const st = useAzpStore((s) => s.data[m])
  const L = AZP_LABEL[m]

  if (!st.cards.length) {
    return (
      <div className="empty">
        <b>Kart yoxdur</b>
        {admin ? '“+ Kart” düyməsi ilə ilk kartı əlavə edin.' : 'Admin hələ kart əlavə etməyib.'}
      </div>
    )
  }

  const tot = st.cards.reduce(
    (a, c) => {
      a.i += azpN(c.medaxil_total)
      a.o += azpN(c.mexaric_total)
      a.b += azpN(c.balance)
      return a
    },
    { i: 0, o: 0, b: 0 },
  )

  return (
    <table>
      <thead>
        <tr>
          <th>Kart №</th>
          <th>{L.cardHead}</th>
          <th>Layihə</th>
          <th className="r">Mədaxil</th>
          <th className="r">{L.out}</th>
          <th className="r">Kart balansı</th>
          <th className="r">Əməliyyat</th>
          <th>Status</th>
          <th />
        </tr>
      </thead>
      <tbody>
        {st.cards.map((c) => (
          <tr key={String(c.card_id)}>
            <td className="code">{c.card_no}</td>
            <td className="nm">{c.holder}</td>
            <td className="muted">{c.project || '—'}</td>
            <td className="num">{azpMoney(c.medaxil_total)}</td>
            <td className="num">{azpMoney(c.mexaric_total)}</td>
            {moneyCell(c.balance)}
            <td className="num">{nf(azpN(c.mov_count))}</td>
            <td>
              {c.active
                ? <span className="tag t-az">aktiv</span>
                : <span className="tag t-mut">deaktiv</span>}
            </td>
            {/* M17-70 — legacy 8307-8313, in the legacy order.

                The quick Mədaxil/out buttons require an admin AND an ACTIVE
                card: a deactivated card takes no new movements, so an admin
                sees only «Tarixçə» and «Redaktə» on one. «Tarixçə» is open to
                every READING role and is therefore outside the admin branch.

                These are AFFORDANCES. Hiding a button is not a permission —
                each write RPC re-checks admin server-side (M17-17…M17-21,
                BLOCKED), and `azpNeedAdmin` re-checks on click for a stale
                identity. */}
            <td className="r" style={{ whiteSpace: 'nowrap' }}>
              {admin && c.active && (
                <>
                  <Button
                    variant="secondary" size="sm"
                    onClick={() => onQuick(String(c.card_id ?? ''), 'medaxil')}
                  >
                    Mədaxil
                  </Button>{' '}
                  <Button
                    variant="secondary" size="sm"
                    onClick={() => onQuick(String(c.card_id ?? ''), 'mexaric')}
                  >
                    {L.out}
                  </Button>{' '}
                </>
              )}
              <Button
                variant="secondary" size="sm"
                onClick={() => onHistory(String(c.card_id ?? ''))}
              >
                Tarixçə
              </Button>
              {admin && (
                <>
                  {' '}
                  <Button
                    variant="secondary" size="sm"
                    onClick={() => onEditCard(String(c.card_id ?? ''))}
                  >
                    Redaktə
                  </Button>
                </>
              )}
            </td>
          </tr>
        ))}
      </tbody>
      <tfoot>
        <tr>
          <td colSpan={3}><b>{L.total}</b></td>
          <td className="num"><b>{azpMoney(tot.i)}</b></td>
          <td className="num"><b>{azpMoney(tot.o)}</b></td>
          <td className="num"><b>{azpMoney(azpR2(tot.b))}</b></td>
          <td colSpan={3} />
        </tr>
      </tfoot>
    </table>
  )
}

/* -------------------------------------------------------- movement table */

/* index.html:8382-8434. The register's row source is the SHARED filter, so it
   can never disagree with the history, the report or the export. */
function AzpMovTable({ m, admin }: { m: AzpModule; admin: boolean }) {
  const st = useAzpStore((s) => s.data[m])
  const f = useAzpStore((s) => s.filter[m])
  const L = AZP_LABEL[m]

  const rows = useMemo(
    () => azpFilterRows(m, st.movs as AzpMovement[], f, st.cards),
    [m, st.movs, st.cards, f],
  )

  /* 8387-8391 — rows dropped SOLELY for being undated are announced, counted
     within the user's other selections (M17-71). */
  const hidden = azpUndatedHidden(
    st.movs.filter((r) => (!f.card || r.card_id === f.card) && (!f.kind || r.kind === f.kind)),
    f.d1,
    f.d2,
  )
  const hiddenNote = hidden > 0
    ? (
      <div
        className="hint"
        style={{ padding: 8, background: 'var(--out-l)', borderRadius: 4, marginBottom: 8 }}
      >
        {nf(hidden)} tarixsiz qeyd seçilmiş tarix aralığına daxil edilmədi — tarixi olmayan
        sətir dövrə aid edilə bilməz. Onları görmək üçün tarix sahələrini boşaldın.
      </div>
    )
    : null

  if (!rows.length) {
    return (
      <>
        {hiddenNote}
        <div className="empty">
          <b>Əməliyyat yoxdur</b>
          Seçilmiş filtrlərə uyğun qeyd tapılmadı.
        </div>
      </>
    )
  }

  /* Keyed on a COERCED string on both sides: the view row's `card_id` is
     nullable and the movement's is not, so keying on the raw values would
     make the map's key type and the lookup's argument type disagree. */
  const byCard = new Map(st.cards.map((c) => [String(c.card_id ?? ''), c]))
  const T = azpTotals(rows)
  const live = rows.filter((r) => !r.cancelled)

  return (
    <>
      {hiddenNote}
      <table>
        <thead>
          <tr>
            <th>Tarix</th>
            <th>Kart</th>
            <th>{L.cardHead}</th>
            <th>Növ</th>
            <th className="r">Məbləğ</th>
            <th>Qaimə №</th>
            <th>Qeyd</th>
            {/* The admin column carries only WRITE actions, so in Phase 17 it
                is rendered empty rather than omitted: the legacy column count
                is preserved for the footer's colSpan arithmetic. */}
            {admin && <th />}
          </tr>
        </thead>
        <tbody>
          {/* 8400 — the first 1000 filtered rows only (M17-73). */}
          {rows.slice(0, 1000).map((r) => {
            const c = byCard.get(String(r.card_id ?? ''))
            return (
              <tr key={String(r.id)} style={r.cancelled ? { opacity: 0.5 } : undefined}>
                <td>{r.op_date ? fmtD(r.op_date) : '—'}</td>
                <td className="code">{c ? c.card_no : '—'}</td>
                <td className="nm">{c ? c.holder : '—'}</td>
                <td>
                  <span className={'tag ' + (r.kind === 'medaxil' ? 't-in' : 't-out')}>
                    {azpKindLabel(m, String(r.kind ?? ''))}
                  </span>
                  {r.cancelled ? <> <span className="tag t-rm">ləğv edilib</span></> : null}
                  {(r as { vat_included?: boolean }).vat_included
                    ? <> <span className="tag t-mut">ƏDV</span></>
                    : null}
                </td>
                <td className="num">{azpMoney(r.amount)}</td>
                <td className="code">{r.doc_num || '—'}</td>
                {/* 8412 — a cancelled row with no note shows its reason. */}
                <td className="muted">
                  {r.note
                    || ((r as { cancel_reason?: string | null }).cancel_reason
                      ? 'Ləğv səbəbi: ' + (r as { cancel_reason?: string | null }).cancel_reason
                      : '')}
                </td>
                {admin && <td className="r" />}
              </tr>
            )
          })}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={4}><b>Cəmi (ləğv edilməmiş): {nf(live.length)} qeyd</b></td>
            <td className="num"><b>{azpMoney(azpR2(T.medaxil - T.mexaric))}</b></td>
            <td colSpan={admin ? 3 : 2} className="hint">
              Mədaxil {azpMoney(T.medaxil)} · {L.out} {azpMoney(T.mexaric)}
            </td>
          </tr>
        </tfoot>
      </table>
      {rows.length > 1000 && (
        <div className="hint" style={{ padding: 8 }}>
          İlk 1000 sətir göstərilir ({nf(rows.length)} uyğun qeyd). Filtri daraldın.
        </div>
      )}
    </>
  )
}

/* ------------------------------------------------------------- audit log */

/* index.html:8436-8450. The module's OWN log — never ANBAR's `audit_log`. */
const AZP_ACTION_LABEL: Record<string, string> = {
  create: 'yaradıldı',
  update: 'dəyişdirildi',
  delete: 'silindi',
  post: 'yazıldı',
  cancel: 'ləğv edildi',
  import: 'idxal edildi',
}

function AzpLogTable({ m }: { m: AzpModule }) {
  const st = useAzpStore((s) => s.data[m])

  if (!st.log.length) return <div className="empty">Hələ qeyd yoxdur.</div>

  return (
    <table>
      <thead>
        <tr><th>Vaxt</th><th>Obyekt</th><th>Əməliyyat</th><th>Təfərrüat</th></tr>
      </thead>
      <tbody>
        {st.log.map((r) => (
          <tr key={String(r.id)}>
            <td>{r.at ? new Date(r.at).toLocaleString('az-AZ') : ''}</td>
            <td>{r.entity === 'card' ? 'Kart' : 'Əməliyyat'}</td>
            {/* 8447 — an unknown action code falls back to the raw value. */}
            <td>{AZP_ACTION_LABEL[String(r.action)] || r.action}</td>
            <td className="muted">{r.detail ? JSON.stringify(r.detail) : ''}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

/* --------------------------------------------------------------- history */

/* index.html:8650-8722. Read-only, open to every reading role, and filtered
   through the SAME `azpFilterRows` as the register (M17-77). */
function AzpHistoryDialog(
  { m, cardId, onClose }: { m: AzpModule; cardId: string; onClose: () => void },
) {
  const st = useAzpStore((s) => s.data[m])
  const L = AZP_LABEL[m]
  const [kind, setKind] = useState('')
  const [d1, setD1] = useState('')
  const [d2, setD2] = useState('')
  const [q, setQ] = useState('')

  const c = st.cards.find((x) => x.card_id === cardId)

  const rows = useMemo(() => {
    if (!c) return []
    return azpFilterRows(m, st.movs as AzpMovement[], { card: cardId, kind, d1, d2, q }, st.cards)
      .slice()
      .sort(
        (a, b) =>
          (azpDayKey(a.op_date) || '').localeCompare(azpDayKey(b.op_date) || '')
          || azpN(a.id) - azpN(b.id),
      )
  }, [c, m, st.movs, st.cards, cardId, kind, d1, d2, q])

  const T = azpTotals(rows)
  const own = st.movs.filter((r) => r.card_id === cardId && (!kind || r.kind === kind))
  const hidden = azpUndatedHidden(own, d1, d2)

  if (!c) return null

  return (
    <Dialog
      title={'Tarixçə — ' + c.card_no + ' · ' + c.holder}
      onClose={onClose}
      footer={<><div style={{ flex: 1 }} /><Button variant="secondary" onClick={onClose}>Bağla</Button></>}
    >
      <div className="hint" style={{ marginBottom: 8 }}>
        {L.title} · {c.project || '—'} · cari kart balansı <b>{azpMoney(c.balance)}</b>
      </div>
      <div className="row" style={{ gridTemplateColumns: '1fr 1fr 1fr 2fr' }}>
        <label className="f">
          <span>Növ</span>
          <select id="azp-h-kind" value={kind} onChange={(e) => setKind(e.target.value)}>
            <option value="">Hamısı</option>
            <option value="medaxil">Mədaxil</option>
            <option value="mexaric">{L.out}</option>
          </select>
        </label>
        <label className="f">
          <span>Başlanğıc</span>
          <input type="date" id="azp-h-d1" value={d1} onChange={(e) => setD1(e.target.value)} />
        </label>
        <label className="f">
          <span>Son</span>
          <input type="date" id="azp-h-d2" value={d2} onChange={(e) => setD2(e.target.value)} />
        </label>
        <label className="f">
          <span>Qaimə № / Qeyd</span>
          <input type="search" id="azp-h-q" value={q} onChange={(e) => setQ(e.target.value)} />
        </label>
      </div>
      <div id="azp-h-body" className="azp-table">
        {hidden > 0 && (
          <div
            className="hint"
            style={{ padding: 8, background: 'var(--out-l)', borderRadius: 4, marginBottom: 8 }}
          >
            {nf(hidden)} tarixsiz qeyd tarix aralığına daxil edilmədi.
          </div>
        )}
        {!rows.length ? (
          <div className="empty">
            <b>Əməliyyat yoxdur</b>
            Seçilmiş filtrlərə uyğun qeyd tapılmadı.
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Tarix</th><th>Növ</th><th className="r">Məbləğ</th>
                <th>Qaimə №</th><th>Qeyd</th><th>Status</th><th>Yazan</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const row = r as AzpMovement & {
                  cancel_reason?: string | null
                  replaced_by?: number | null
                  replaces_id?: number | null
                  created_by?: string | null
                }
                return (
                  <tr key={String(r.id)} style={r.cancelled ? { opacity: 0.55 } : undefined}>
                    <td>{r.op_date ? fmtD(r.op_date) : '—'}</td>
                    <td>
                      <span className={'tag ' + (r.kind === 'medaxil' ? 't-in' : 't-out')}>
                        {azpKindLabel(m, String(r.kind ?? ''))}
                      </span>
                    </td>
                    <td className="num">{azpMoney(r.amount)}</td>
                    <td className="code">{r.doc_num || '—'}</td>
                    <td className="muted">{r.note || ''}</td>
                    {/* 8696-8700 — the replacement linkage, both directions
                        (M17-78). */}
                    <td>
                      {r.cancelled ? (
                        <>
                          <span className="tag t-rm">ləğv edilib</span>
                          {row.cancel_reason && <div className="hint">{row.cancel_reason}</div>}
                          {row.replaced_by != null && (
                            <div className="hint">əvəz: #{String(row.replaced_by)}</div>
                          )}
                        </>
                      ) : (
                        <>
                          <span className="tag t-az">aktiv</span>
                          {row.replaces_id != null && (
                            <div className="hint">düzəliş: #{String(row.replaces_id)}</div>
                          )}
                        </>
                      )}
                    </td>
                    <td className="muted">{row.created_by || '—'}</td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={2}>
                  <b>Cəmi (ləğv edilməmiş {nf(T.live)} qeyd)</b>
                </td>
                <td className="num"><b>{azpMoney(T.net)}</b></td>
                <td colSpan={4} className="hint">
                  Mədaxil {azpMoney(T.medaxil)} · {L.out} {azpMoney(T.mexaric)}
                  {T.cancelled > 0
                    && ` · ${nf(T.cancelled)} ləğv edilmiş sətir cəmlərə daxil deyil`}
                </td>
              </tr>
            </tfoot>
          </table>
        )}
      </div>
    </Dialog>
  )
}

/* ---------------------------------------------------------------- report */

/* index.html:8772-8913. Read-only for every reading role — legacy leaves
   «Hesabat» and its export visible to read roles by design (M17-15). */
function AzpReportDialog(
  { m, onClose, onToast }: {
    m: AzpModule
    onClose: () => void
    onToast: (text: string, isError?: boolean) => void
  },
) {
  const st = useAzpStore((s) => s.data[m])
  const L = AZP_LABEL[m]
  const [mode, setMode] = useState<'group' | 'single'>('group')
  const [kind, setKind] = useState('')
  const [d1, setD1] = useState('')
  const [d2, setD2] = useState('')
  const [cards, setCards] = useState<string[]>([])

  /* `selected` is derived INSIDE the memo: as a separate array it would be a
     new reference every render and the memo would never hold.

     No cast is needed on `st.cards`. `AzpReportCardInput`'s fields are all
     optional and nullable, and the `azp_card_balances` view row is all
     nullable, so the view row satisfies it structurally. An earlier draft
     carried a conditional-type cast here, which defeated the check rather
     than resolving it. */
  const rep = useMemo(
    () => {
      /* 8813 — single mode keeps only the FIRST selected card (M17-53). */
      const selected = mode === 'single' && cards.length > 1 ? [cards[0]] : cards
      return buildAzpReport(m, st.cards, st.movs as AzpMovement[], { mode, cards: selected, kind, d1, d2 })
    },
    [m, st.cards, st.movs, mode, cards, kind, d1, d2],
  )

  function doExport() {
    const { fileName } = azpReportExport(rep)
    onToast(fileName + ' yükləndi')
  }

  return (
    <Dialog
      title={'Hesabat — ' + L.title}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" id="azp-r-exp" onClick={doExport}>Excel-ə ixrac</Button>
          <div style={{ flex: 1 }} />
          <Button variant="secondary" onClick={onClose}>Bağla</Button>
        </>
      }
    >
      <div className="row" style={{ gridTemplateColumns: '1fr 1fr 1fr 1fr' }}>
        <label className="f">
          <span>Hesabatın növü</span>
          <select
            id="azp-r-mode" value={mode}
            onChange={(e) => setMode(e.target.value as 'group' | 'single')}
          >
            <option value="group">Qrup (bir neçə / bütün kartlar)</option>
            <option value="single">Fərdi (bir kart)</option>
          </select>
        </label>
        <label className="f">
          <span>Əməliyyat növü</span>
          <select id="azp-r-kind" value={kind} onChange={(e) => setKind(e.target.value)}>
            <option value="">Hamısı</option>
            <option value="medaxil">Mədaxil</option>
            <option value="mexaric">{L.out}</option>
          </select>
        </label>
        <label className="f">
          <span>Başlanğıc tarix</span>
          <input type="date" id="azp-r-d1" value={d1} onChange={(e) => setD1(e.target.value)} />
        </label>
        <label className="f">
          <span>Son tarix</span>
          <input type="date" id="azp-r-d2" value={d2} onChange={(e) => setD2(e.target.value)} />
        </label>
      </div>
      <label className="f">
        <span>Kartlar — seçilməzsə bütün aktiv kartlar</span>
        <select
          id="azp-r-cards" multiple size={6} style={{ height: 'auto' }}
          value={cards}
          onChange={(e) =>
            setCards(Array.from(e.target.selectedOptions, (o) => o.value))}
        >
          {st.cards.map((c) => (
            <option key={String(c.card_id)} value={String(c.card_id ?? '')}>
              {c.card_no} — {c.holder}{c.active ? '' : ' (deaktiv)'}
            </option>
          ))}
        </select>
      </label>
      <div id="azp-r-body" className="azp-table" style={{ marginTop: 10 }}>
        <AzpReportBody rep={rep} />
      </div>
    </Dialog>
  )
}

/* index.html:8816-8871 — the screen rendering of the SAME model the export
   consumes, so a displayed figure and an exported one cannot differ. */
function AzpReportBody({ rep }: { rep: AzpReport }) {
  const head = (
    <>
      <div className="hint" style={{ marginBottom: 8 }}>
        <b>{rep.title}</b> · dövr: {azpPeriodText(rep)} · {nf(rep.cards.length)} kart
        {rep.kind ? ' · yalnız ' + (rep.kind === 'medaxil' ? 'Mədaxil' : rep.outLabel) : ''}
      </div>
      {rep.undatedHidden > 0 && (
        <div
          className="hint"
          style={{ padding: 8, background: 'var(--out-l)', borderRadius: 4, marginBottom: 8 }}
        >
          {nf(rep.undatedHidden)} tarixsiz qeyd seçilmiş dövrə daxil edilmədi.
        </div>
      )}
      {rep.totals.cancelled > 0 && (
        <div className="hint" style={{ marginBottom: 8 }}>
          {nf(rep.totals.cancelled)} ləğv edilmiş sətir göstərilir, lakin cəmlərə daxil edilmir.
        </div>
      )}
    </>
  )

  if (!rep.cards.length) {
    return <>{head}<div className="empty"><b>Kart seçilməyib</b></div></>
  }

  if (rep.mode === 'single') {
    const c = rep.cards[0]
    return (
      <>
        {head}
        <div className="hint" style={{ marginBottom: 6 }}>
          Kart <b className="code">{c.card_no}</b> · {c.holder}
          {c.project ? ' · ' + c.project : ''}
        </div>
        <table>
          <thead>
            <tr>
              <th>Tarix</th><th>Növ</th><th className="r">Məbləğ</th>
              <th>Qaimə №</th><th>Qeyd</th><th>Status</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan={2}><b>Dövrün əvvəlinə qalıq</b></td>
              <td className="num"><b>{azpMoney(c.opening)}</b></td>
              <td colSpan={3} />
            </tr>
            {c.rows.length ? c.rows.map((r) => (
              <tr key={String(r.id)} style={r.cancelled ? { opacity: 0.55 } : undefined}>
                <td>{r.op_date ? fmtD(r.op_date) : '—'}</td>
                <td>{azpKindLabel(rep.module, String(r.kind ?? ''))}</td>
                <td className="num">{azpMoney(r.amount)}</td>
                <td className="code">{r.doc_num || '—'}</td>
                <td className="muted">{r.note || ''}</td>
                <td>
                  {r.cancelled
                    ? <span className="tag t-rm">ləğv edilib</span>
                    : <span className="tag t-az">aktiv</span>}
                </td>
              </tr>
            )) : (
              <tr><td colSpan={6} className="muted">Bu dövrdə əməliyyat yoxdur.</td></tr>
            )}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={2}><b>Mədaxil cəmi</b></td>
              <td className="num"><b>{azpMoney(c.medaxil)}</b></td>
              <td colSpan={3} />
            </tr>
            <tr>
              <td colSpan={2}><b>{rep.outLabel} cəmi</b></td>
              <td className="num"><b>{azpMoney(c.mexaric)}</b></td>
              <td colSpan={3} />
            </tr>
            <tr>
              <td colSpan={2}><b>Dövrün sonuna qalıq</b></td>
              <td className="num"><b>{azpMoney(c.closing)}</b></td>
              <td colSpan={3} className="hint">Cari kart balansı: {azpMoney(c.current)}</td>
            </tr>
          </tfoot>
        </table>
      </>
    )
  }

  return (
    <>
      {head}
      <table>
        <thead>
          <tr>
            <th>Kart №</th><th>Sahib / Obyekt</th><th>Layihə</th>
            <th className="r">Əvvələ qalıq</th><th className="r">Mədaxil</th>
            <th className="r">{rep.outLabel}</th><th className="r">Dövrün sonuna</th>
            <th className="r">Cari balans</th>
          </tr>
        </thead>
        <tbody>
          {rep.cards.map((c) => (
            <tr key={c.card_id}>
              <td className="code">{c.card_no}</td>
              <td className="nm">{c.holder}</td>
              <td className="muted">{c.project || '—'}</td>
              <td className="num">{azpMoney(c.opening)}</td>
              <td className="num">{azpMoney(c.medaxil)}</td>
              <td className="num">{azpMoney(c.mexaric)}</td>
              <td className="num">{azpMoney(c.closing)}</td>
              <td className="num">{azpMoney(c.current)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={3}><b>Yekun</b></td>
            <td className="num"><b>{azpMoney(rep.totals.opening)}</b></td>
            <td className="num"><b>{azpMoney(rep.totals.medaxil)}</b></td>
            <td className="num"><b>{azpMoney(rep.totals.mexaric)}</b></td>
            <td className="num"><b>{azpMoney(rep.totals.closing)}</b></td>
            <td className="num"><b>{azpMoney(rep.totals.current)}</b></td>
          </tr>
        </tfoot>
      </table>
    </>
  )
}

export { AZP_NO_ACCESS_MESSAGE }
