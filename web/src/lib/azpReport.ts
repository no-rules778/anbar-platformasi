/* Azpetrol / Araz — the report model and its export matrix
   (M17-52, M17-54, M17-55, M17-57, M17-60, M17-61).

   Ported from index.html:8724-8913.

   ONE model feeds both the screen and the Excel export, so an exported figure
   can never differ from the displayed one. The screen renderer and the export
   writer both consume `buildAzpReport()`; neither recalculates. */

import { azpDate, azpDayKey } from './azpDate'
import { azpN, azpR2 } from './azpNum'
import { azpFilterRows, azpOpeningBalance, azpTotals, type AzpCard, type AzpMovement } from './azpFilter'
import { azpKindLabel, AZP_LABEL, type AzpModule } from './azpLabels'
import { fmtD } from './format'

/** A card as the balances view returns it, plus the aggregates the report reads. */
export interface AzpReportCardInput extends AzpCard {
  project?: string | null
  active?: boolean | null
  balance?: number | string | null
}

export interface AzpReportSelection {
  mode: 'group' | 'single'
  /** Explicit card selection; empty means "all ACTIVE cards". */
  cards: readonly string[]
  kind: string
  d1: string
  d2: string
}

export interface AzpReportCard {
  card_id: string
  card_no: string
  holder: string
  project: string
  opening: number
  medaxil: number
  mexaric: number
  closing: number
  live: number
  cancelled: number
  current: number
  rows: AzpMovement[]
}

export interface AzpReport {
  module: AzpModule
  title: string
  outLabel: string
  mode: 'group' | 'single'
  d1: string
  d2: string
  kind: string
  cards: AzpReportCard[]
  totals: {
    opening: number
    medaxil: number
    mexaric: number
    closing: number
    current: number
    cancelled: number
  }
  undatedHidden: number
}

/**
 * `azpBuildReport(m)` — index.html:8724-8770.
 *
 * Card selection (M17-52): an explicit non-empty selection is used AS GIVEN
 * and may include inactive cards; an empty selection falls back to ACTIVE
 * cards only. That asymmetry is deliberate — a user who names a deactivated
 * card wants to see it.
 *
 * Per card: rows are the shared filter's output for that card, sorted by
 * normalised date then numeric id; `opening` comes from the UNFILTERED
 * movement list (a period's opening balance must see rows outside the period);
 * `closing` is `R2(opening + net)`; `current` is the card's own stored
 * balance, which is NOT the same number as `closing` whenever the period
 * excludes some rows.
 *
 * Totals accumulate with `azpR2` at EVERY step, matching legacy's per-step
 * rounding rather than summing first and rounding once.
 */
export function buildAzpReport(
  m: AzpModule,
  allCards: readonly AzpReportCardInput[],
  allMovs: readonly AzpMovement[],
  sel: AzpReportSelection,
): AzpReport {
  const L = AZP_LABEL[m]
  const pick =
    sel.cards && sel.cards.length
      ? allCards.filter((c) => sel.cards.indexOf(c.card_id as string) >= 0)
      : allCards.filter((c) => c.active)

  const f = {
    cards: pick.map((c) => c.card_id as string),
    kind: sel.kind,
    d1: sel.d1,
    d2: sel.d2,
    q: '',
  }
  const rows = azpFilterRows(m, allMovs, f, allCards)
  const byCard = new Map(pick.map((c) => [c.card_id, c]))

  const cards: AzpReportCard[] = pick.map((c) => {
    const cr = rows
      .filter((r) => r.card_id === c.card_id)
      .slice()
      .sort(
        (a, b) =>
          (azpDayKey(a.op_date) || '').localeCompare(azpDayKey(b.op_date) || '') ||
          azpN(a.id) - azpN(b.id),
      )
    const T = azpTotals(cr)
    const opening = azpOpeningBalance(m, allMovs, c.card_id, sel.d1)
    return {
      card_id: String(c.card_id ?? ''),
      card_no: String(c.card_no ?? ''),
      holder: String(c.holder ?? ''),
      project: c.project || '',
      opening,
      medaxil: T.medaxil,
      mexaric: T.mexaric,
      closing: azpR2(opening + T.net),
      live: T.live,
      cancelled: T.cancelled,
      current: azpR2(c.balance),
      rows: cr,
    }
  })

  const totals = cards.reduce(
    (a, c) => {
      a.opening = azpR2(a.opening + c.opening)
      a.medaxil = azpR2(a.medaxil + c.medaxil)
      a.mexaric = azpR2(a.mexaric + c.mexaric)
      a.closing = azpR2(a.closing + c.closing)
      a.current = azpR2(a.current + c.current)
      a.cancelled += c.cancelled
      return a
    },
    { opening: 0, medaxil: 0, mexaric: 0, closing: 0, current: 0, cancelled: 0 },
  )

  return {
    module: m,
    title: L.title,
    outLabel: L.out,
    mode: sel.mode,
    d1: azpDate(sel.d1),
    d2: azpDate(sel.d2),
    kind: sel.kind,
    cards,
    totals,
    /* Counted over the SELECTED cards only, and after the kind filter — the
       same population the report itself covers. */
    undatedHidden: allMovs.filter((r) => {
      if (!byCard.has(r.card_id)) return false
      if (sel.kind && r.kind !== sel.kind) return false
      if (!azpDate(sel.d1) && !azpDate(sel.d2)) return false
      return !azpDayKey(r.op_date)
    }).length,
  }
}

/**
 * `azpPeriodText(rep)` — index.html:8766-8769.
 *
 * No bounds at all → «bütün dövr». Otherwise `d1 — d2`, with a literal `…`
 * standing in for whichever side is missing.
 */
export function azpPeriodText(rep: Pick<AzpReport, 'd1' | 'd2'>): string {
  if (!rep.d1 && !rep.d2) return 'bütün dövr'
  return (rep.d1 ? fmtD(rep.d1) : '…') + ' — ' + (rep.d2 ? fmtD(rep.d2) : '…')
}

/**
 * `azpReportRows(rep)` — index.html:8874-8913.
 *
 * The export matrix, row for row. Two shapes: a per-movement ledger in single
 * mode and a per-card summary in group mode. Cancelled rows appear in the
 * single-mode ledger marked `LƏĞV EDİLİB` but are already excluded from every
 * total by `azpTotals`.
 *
 * The trailing note row is part of the contract: it tells the reader that
 * cancelled rows are shown but not counted.
 */
export function azpReportRows(rep: AzpReport): unknown[][] {
  const out: unknown[][] = []
  const per = azpPeriodText(rep)
  out.push([rep.title + ' — hesabat'])
  out.push(['Dövr', per])
  out.push([
    'Əməliyyat növü',
    rep.kind ? (rep.kind === 'medaxil' ? 'Mədaxil' : rep.outLabel) : 'Hamısı',
  ])
  out.push(['Hesabatın növü', rep.mode === 'single' ? 'Fərdi' : 'Qrup'])
  if (rep.undatedHidden) {
    out.push(['Tarixsiz qeydlər (dövrə daxil edilməyib)', rep.undatedHidden])
  }
  out.push([])

  if (rep.mode === 'single' && rep.cards.length) {
    const c = rep.cards[0]
    out.push(['Kart №', c.card_no])
    out.push(['Sahib / Obyekt', c.holder])
    out.push(['Layihə', c.project || ''])
    out.push([])
    out.push(['Tarix', 'Növ', 'Məbləğ (₼)', 'Qaimə №', 'Qeyd', 'Status'])
    out.push(['Dövrün əvvəlinə qalıq', '', c.opening, '', '', ''])
    c.rows.forEach((r) =>
      out.push([
        r.op_date ? azpDate(r.op_date) : '',
        azpKindLabel(rep.module, String(r.kind ?? '')),
        azpN(r.amount),
        r.doc_num || '',
        r.note || '',
        r.cancelled ? 'LƏĞV EDİLİB' : 'aktiv',
      ]),
    )
    out.push(['Mədaxil cəmi', '', c.medaxil, '', '', ''])
    out.push([rep.outLabel + ' cəmi', '', c.mexaric, '', '', ''])
    out.push(['Dövrün sonuna qalıq', '', c.closing, '', '', ''])
    out.push(['Cari kart balansı', '', c.current, '', '', ''])
  } else {
    out.push([
      'Kart №', 'Sahib / Obyekt', 'Layihə', 'Əvvələ qalıq',
      'Mədaxil', rep.outLabel, 'Dövrün sonuna', 'Cari balans',
    ])
    rep.cards.forEach((c) =>
      out.push([
        c.card_no, c.holder, c.project || '',
        c.opening, c.medaxil, c.mexaric, c.closing, c.current,
      ]),
    )
    out.push([
      'Yekun', '', '',
      rep.totals.opening, rep.totals.medaxil,
      rep.totals.mexaric, rep.totals.closing, rep.totals.current,
    ])
  }

  out.push([])
  out.push(['Qeyd', 'Ləğv edilmiş sətirlər göstərilir, lakin cəmlərə daxil edilmir.'])
  return out
}
