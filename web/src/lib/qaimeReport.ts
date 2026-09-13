import type { MovementRow } from '../api/itemMovements.api'
import type { WriteoffValuationRow } from '../api/writeoffValuations.api'
import { movementValuation } from './movementValuation'
import { dsort } from './reportAggregates'
import { fmtD } from './format'

/* «Qaimələr üzrə hesabat» — qaimeReportRows() (index.html:6851-6877) and the
   column model of rQaimeReport() (6835-6849, 6878-6931). M14-74 … M14-90.

   GROUPING IS BY BOTH `invoice_num` AND `doc_num` (6856), and the legacy
   comment at 6830-6834 explains why: one Qaimə may legitimately consist of
   several documents — the same delivery recorded as two separate operations
   (CHANGELOG 2026-08-21, Qaimə 42893). The document number is ALWAYS shown,
   because it is what makes a specific operation reachable in an audit.

   Source is the OPERATIONAL set, so cancelled documents are already gone; no
   cancellation logic is repeated here. */

const num = (v: number | string | null | undefined): number => {
  if (v == null) return 0
  const n = Number(v)
  return isNaN(n) ? 0 : n
}

/** One grouped Qaimə row — the legacy `g` object (6857-6861). */
export interface QaimeGroup {
  iv: string
  /** `m.doc || '—'` (6858) — the fallback is part of the KEY, not display. */
  doc: string
  dMin: string
  dMax: string
  types: Set<string>
  whs: Set<string>
  partners: Set<string>
  chs: Set<string>
  cts: Set<string>
  /** De-duplicated, ORDER-PRESERVING, never truncated (M14-76). */
  notes: string[]
  bys: Set<string>
  /** Row count within the group. */
  n: number
  /** `(in + out)` — a SUM, unlike the `tr` branch's `||` fallthrough. */
  qty: number
  val: number
}

/**
 * `qaimeReportRows()` — index.html:6851-6877.
 *
 * VALUE BRANCHING (M14-77), 6872-6873:
 *
 *   Silinmə  → movementValuation(m), taking `final == null ? 0 : final`
 *   anything → (in + out) * (m.pr || 0)   — NO item-price fallback
 *
 * That second branch is the only place on this page where a missing price is
 * NOT backfilled from the item card. It is deliberate and must not be
 * "harmonised" with the other branches.
 *
 * SORT (M14-80), 6876: `dMax` DESCENDING, tie-broken by `iv` ascending under
 * the `az` collation. The collation is load-bearing — Azerbaijani orders
 * letters differently from the default.
 */
export function qaimeReportRows(
  operational: readonly MovementRow[],
  valuations: ReadonlyMap<string, WriteoffValuationRow>,
): QaimeGroup[] {
  const groups = new Map<string, QaimeGroup>()

  for (const m of operational) {
    const iv = String(m.invoice_num ?? '').trim()
    /* M14-75 — an empty or whitespace-only Qaimə № is skipped entirely; the
       row appears in no group at all. */
    if (!iv) continue

    const doc = m.doc_num || '—'
    const key = iv + '|' + doc

    let g = groups.get(key)
    if (!g) {
      g = {
        iv, doc, dMin: m.date, dMax: m.date,
        types: new Set(), whs: new Set(), partners: new Set(),
        chs: new Set(), cts: new Set(), notes: [], bys: new Set(),
        n: 0, qty: 0, val: 0,
      }
      groups.set(key, g)
    }

    g.n++
    if (m.date < g.dMin) g.dMin = m.date
    if (m.date > g.dMax) g.dMax = m.date
    g.types.add(m.type)
    g.whs.add(m.warehouse)
    if (m.partner) g.partners.add(m.partner)
    if (m.channel) g.chs.add(m.channel)
    if (m.contract_num) g.cts.add(m.contract_num)
    if (m.created_by) g.bys.add(m.created_by)
    /* Linear-scan de-duplication, order preserved, NO length cap (M14-76). */
    if (m.note && g.notes.indexOf(m.note) < 0) g.notes.push(m.note)

    /* A SUM (M14-78) — deliberately unlike `tr`'s `(i || o)`. */
    g.qty += num(m.in_qty) + num(m.out_qty)

    if (m.type === 'Silinmə') {
      const qv = movementValuation({ id: m.id, out_qty: m.out_qty, price: m.price }, valuations as Map<string, WriteoffValuationRow>)
      g.val += qv.final == null ? 0 : qv.final
    } else {
      /* NO item-price fallback here — `m.pr || 0` only. */
      g.val += (num(m.in_qty) + num(m.out_qty)) * num(m.price)
    }
  }

  return Array.from(groups.values())
    .sort((a, b) => dsort(b.dMax, a.dMax) || a.iv.localeCompare(b.iv, 'az'))
}

/* ---------------- the column model — 6835-6849 ---------------- */

export type QaimeColumnKey =
  | 'date' | 'type' | 'wh' | 'partner' | 'ch' | 'ct'
  | 'lines' | 'qty' | 'val' | 'note' | 'by'

export interface QaimeColumn {
  k: QaimeColumnKey
  t: string
  def: boolean
}

/** `QAIME_COLS` — eleven columns in fixed order (M14-81, M14-82). */
export const QAIME_COLS: readonly QaimeColumn[] = [
  { k: 'date', t: 'Tarix', def: true },
  { k: 'type', t: 'Növ', def: true },
  { k: 'wh', t: 'Anbar(lar)', def: true },
  { k: 'partner', t: 'Kontragent', def: true },
  { k: 'ch', t: 'Kanal', def: false },
  { k: 'ct', t: 'Müqavilə №', def: false },
  { k: 'lines', t: 'Sətir sayı', def: true },
  { k: 'qty', t: 'Miqdar', def: true },
  { k: 'val', t: 'Məbləğ', def: true },
  { k: 'note', t: 'Qeyd', def: false },
  { k: 'by', t: 'Qeyd edən', def: false },
]

/** `QAIME_SEL` initialisation — 6848-6849. */
export function defaultQaimeSelection(): Record<QaimeColumnKey, boolean> {
  const sel = {} as Record<QaimeColumnKey, boolean>
  for (const c of QAIME_COLS) sel[c.k] = c.def
  return sel
}

/** The two FIXED leading columns — 6888, 6906 (M14-83). */
export const QAIME_FIXED_HEADER = ['Qaimə №', 'Sənəd №']

/** `/qty|val|lines/.test(c.k)` — 6888 (M14-84). */
export function isNumericColumn(k: QaimeColumnKey): boolean {
  return /qty|val|lines/.test(k)
}

export function selectedColumns(sel: Record<QaimeColumnKey, boolean>): QaimeColumn[] {
  return QAIME_COLS.filter((c) => sel[c.k])
}

/**
 * The date cell — 6891 for the screen, 6909 for the export.
 *
 * A single-day group prints ONE date; a span prints `min – max` joined by an
 * en-dash with spaces. The screen formats through `fmtD` (DD.MM.YYYY); the
 * export keeps the RAW ISO dates (M14-79).
 */
export function dateCell(g: Pick<QaimeGroup, 'dMin' | 'dMax'>, formatted: boolean): string {
  const f = (s: string) => (formatted ? fmtD(s) : s)
  return g.dMin === g.dMax ? f(g.dMin) : f(g.dMin) + ' – ' + f(g.dMax)
}

/** Set cells join with ', ' — 6893-6900, 6911-6918 (M14-85). */
const joinSet = (s: Set<string>): string => Array.from(s).join(', ')

/**
 * One EXPORT cell — 6909-6919.
 *
 * The export differs from the screen in two ways: dates are raw ISO, and an
 * empty set is the EMPTY STRING rather than the screen's «—» (M14-85).
 */
export function exportCell(g: QaimeGroup, k: QaimeColumnKey): unknown {
  switch (k) {
    case 'date': return dateCell(g, false)
    case 'type': return joinSet(g.types)
    case 'wh': return joinSet(g.whs)
    case 'partner': return joinSet(g.partners)
    case 'ch': return joinSet(g.chs)
    case 'ct': return joinSet(g.cts)
    case 'lines': return g.n
    case 'qty': return g.qty
    case 'val': return g.val.toFixed(2)
    case 'note': return g.notes.join(' · ')
    case 'by': return joinSet(g.bys)
    default: return ''
  }
}

/**
 * The SCREEN text of one cell — 6891-6901.
 *
 * Returns the display string; an empty set yields '—' here, where the export
 * yields ''. `type` is rendered as tags by the component, so this returns the
 * joined raw text for the non-tag path and the caller decides.
 */
export function screenCell(g: QaimeGroup, k: QaimeColumnKey): string {
  switch (k) {
    case 'date': return dateCell(g, true)
    case 'type': return joinSet(g.types)
    case 'wh': return joinSet(g.whs)
    case 'partner': return joinSet(g.partners) || '—'
    case 'ch': return joinSet(g.chs) || '—'
    case 'ct': return joinSet(g.cts) || '—'
    case 'lines': return String(g.n)
    case 'qty': return String(g.qty)
    case 'val': return String(g.val)
    case 'note': return g.notes.length ? g.notes.join(' · ') : '—'
    case 'by': return joinSet(g.bys) || '—'
    default: return ''
  }
}

/** `REP_ROWS` for the qaimə report — 6905-6919 (M14-89). */
export function qaimeExportMatrix(
  groups: readonly QaimeGroup[],
  sel: Record<QaimeColumnKey, boolean>,
): unknown[][] {
  const cols = selectedColumns(sel)
  return [
    [...QAIME_FIXED_HEADER, ...cols.map((c) => c.t)],
    ...groups.map((g) => [g.iv, g.doc, ...cols.map((c) => exportCell(g, c.k))]),
  ]
}

/** 6920-6924 — the fixed header hint and empty state (M14-90). */
export const QAIME_SOURCE_NOTE =
  'mənbə: qeyd edilmiş və ləğv edilməmiş əməliyyatlar.'
export const QAIME_EMPTY = 'Qaimə № yazılmış sənəd tapılmadı.'
