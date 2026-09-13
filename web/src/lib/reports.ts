import type { MovementRow } from '../api/itemMovements.api'
import type { PartnerRow } from '../api/partners.api'
import type { WarehouseBalance } from './itemIndex'
import type { ReportAggregates } from './reportAggregates'
import { dsort } from './reportAggregates'
import { whLabel } from './movementRoute'
import { fmtM } from './format'

/* The seven non-`dead` branches of rRep() (index.html:6741-6820) as PURE
   derivations over the accepted Phase 9 outputs and the Phase 14 aggregates.

   Each branch returns the on-screen rows AND the export matrix, because the
   legacy branch assigns both in the same statement and they deliberately
   DIFFER in several places (M14-41, M14-46, M14-57, M14-64). Computing the
   matrix from the rendered rows would lose those differences.

   `dead` is NOT here: it reuses the ACCEPTED Phase 10 functions in
   `lib/warehouseOverview.ts` as its single derivation (M14-60 … M14-64). */

const EPS = 1e-9

/** The eight `#rep-pick` values, in legacy order — index.html:402-409. */
export const REPORT_KINDS = ['knt', 'type', 'wh', 'per', 'abc', 'dead', 'tr', 'qaime'] as const
export type ReportKind = typeof REPORT_KINDS[number]

/** The exact option labels — index.html:402-409 (M14-06). */
export const REPORT_LABELS: Readonly<Record<ReportKind, string>> = {
  knt: 'Kontragentlər üzrə dövriyyə',
  type: 'Əməliyyat növləri üzrə xülasə',
  wh: 'Anbarlar üzrə müqayisə',
  per: 'Dövr (gün/ay) üzrə hərəkət',
  abc: 'ABC təhlili',
  dead: 'Hərəkətsiz və ölü qalıq',
  tr: 'Anbarlararası yerdəyişmə matrisi',
  qaime: 'Qaimələr üzrə hesabat',
}

/** `REP_NAME` per branch — the EXPORT SLUG, not the label (M14-93). */
export const REPORT_NAMES: Readonly<Record<ReportKind, string>> = {
  knt: 'kontragent_dovriyye',
  type: 'novler_uzre',
  wh: 'anbarlar_muqayise',
  per: 'dovr_uzre',
  abc: 'abc_tehlili',
  dead: 'hereketsiz_qaliq',
  tr: 'yerdeyisme_matrisi',
  qaime: 'qaimeler_uzre',
}

/** `REP_NAME` before any branch has rendered — index.html:6729. */
export const INITIAL_REPORT_NAME = 'hesabat'

const num = (v: number | string | null | undefined): number => {
  if (v == null) return 0
  const n = Number(v)
  return isNaN(n) ? 0 : n
}

/* ---------------- knt — index.html:6741-6751 ---------------- */

export interface PartnerReportRow {
  name: string
  n: number
  in: number
  out: number
  val: number
  /** '' when the partner is absent from the directory (M14-28). */
  voen: string
  /** '' when the partner is absent from the directory (M14-28). */
  contract: string
}

/**
 * `knt` — `IX.byPartner` sorted by value descending (6742).
 *
 * D-P4: legacy runs `DB.partners.find(x => x.name === r.n)` PER ROW (6746,
 * 6750) — a linear scan whose result is `{}` for an unknown partner, so both
 * cells fall back to ''. This builds ONE Map instead. The output is identical,
 * including the missing-partner case, which `reports.test.ts` pins.
 */
export function partnerReportRows(
  agg: ReportAggregates,
  partners: readonly PartnerRow[],
): PartnerReportRow[] {
  const byName = new Map<string, PartnerRow>()
  /* `find()` returns the FIRST match, so a duplicate name must not overwrite. */
  for (const p of partners) if (!byName.has(p.name)) byName.set(p.name, p)

  return Array.from(agg.byPartner.entries())
    .map(([name, s]) => {
      const p = byName.get(name)
      return {
        name,
        n: s.n,
        in: s.in,
        out: s.out,
        val: s.val,
        voen: p?.voen ?? '',
        contract: p?.contract ?? '',
      }
    })
    .sort((a, b) => b.val - a.val)
}

/** 6743-6745 — the exact header and cells (M14-31). */
export const PARTNER_EXPORT_HEADER = [
  'Kontragent/Layihə', 'Əməliyyat sayı', 'Mədaxil miqdarı', 'Məxaric miqdarı',
  'Mədaxil dəyəri', 'VÖEN', 'Müqavilə',
]

export function partnerExportMatrix(rows: readonly PartnerReportRow[]): unknown[][] {
  return [
    [...PARTNER_EXPORT_HEADER],
    ...rows.map((r) => [r.name, r.n, r.in, r.out, r.val.toFixed(2), r.voen, r.contract]),
  ]
}

/** The bar chart beside the table — TOP 12 BY VALUE only (6748, M14-30). */
export function partnerTopBars(rows: readonly PartnerReportRow[]) {
  return rows.slice(0, 12).map((r) => ({ k: r.name, v: Math.round(r.val), sub: `${r.n} əm.` }))
}

/* ---------------- type — index.html:6752-6757 ---------------- */

export interface TypeReportRow {
  type: string
  n: number
  in: number
  out: number
  val: number
}

/** `type` — `IX.byType` sorted by COUNT descending (6753). */
export function typeReportRows(agg: ReportAggregates): TypeReportRow[] {
  return Array.from(agg.byType.entries())
    .map(([type, s]) => ({ type, n: s.n, in: s.in, out: s.out, val: s.val }))
    .sort((a, b) => b.n - a.n)
}

/**
 * The «Payı» bar width — 6756 (M14-33).
 *
 * The denominator is the GLOBAL operational row count, NOT the sum of this
 * branch's own counts. They coincide only when every operational row has a
 * type in the index; the fixture in the tests makes them differ so the rule is
 * falsifiable.
 */
export function typeSharePercent(rowCount: number, totalOperational: number): string {
  return (rowCount / Math.max(1, totalOperational) * 100).toFixed(1)
}

/** 6753 — header and cells (M14-35). */
export const TYPE_EXPORT_HEADER = ['Növ', 'Sayı', 'Mədaxil', 'Məxaric', 'Dəyər']

export function typeExportMatrix(rows: readonly TypeReportRow[]): unknown[][] {
  return [
    [...TYPE_EXPORT_HEADER],
    ...rows.map((r) => [r.type, r.n, r.in, r.out, r.val.toFixed(2)]),
  ]
}

/* ---------------- wh — index.html:6758-6767 ---------------- */

export interface WarehouseReportRow {
  w: string
  pos: number
  val: number
  in: number
  out: number
  n: number
  neg: number
}

/**
 * `wh` — one row per CONFIGURED warehouse, in `DB.whs` order (6759).
 *
 * NOT sorted, and a warehouse with no movements still produces a row through
 * the `{in:0,out:0,n:0}` fallback (M14-36, M14-38).
 *
 * Two counting rules differ deliberately inside one function:
 *   `pos` uses the epsilon `abs(q) > 1e-9`   (6760)
 *   `neg` uses a STRICT `q < 0`, no epsilon  (6761)
 */
export function warehouseReportRows(
  warehouses: readonly string[],
  agg: ReportAggregates,
  bal: readonly WarehouseBalance[],
): WarehouseReportRow[] {
  return warehouses.map((w) => {
    const b = bal.filter((x) => x.w === w)
    const s = agg.byWh.get(w) ?? { in: 0, out: 0, n: 0 }
    return {
      w,
      pos: b.filter((x) => Math.abs(x.q) > EPS).length,
      /* Every balance value, including zero-quantity and negative rows. */
      val: b.reduce((acc, x) => acc + x.val, 0),
      in: s.in,
      out: s.out,
      n: s.n,
      neg: b.filter((x) => x.q < 0).length,
    }
  })
}

/** `r.in ? (r.out / r.in * 100).toFixed(1) + '%' : '—'` — 6766 (M14-40). */
export function turnoverPercent(row: Pick<WarehouseReportRow, 'in' | 'out'>): string {
  return row.in ? (row.out / row.in * 100).toFixed(1) + '%' : '—'
}

/** 6762 — the export set DIFFERS from the screen set (M14-41, M14-42). */
export const WAREHOUSE_EXPORT_HEADER = [
  'Anbar', 'Mövqe', 'Mədaxil', 'Məxaric', 'Dəyər', 'Mənfi qalıq', 'Əməliyyat',
]

export function warehouseExportMatrix(rows: readonly WarehouseReportRow[]): unknown[][] {
  return [
    [...WAREHOUSE_EXPORT_HEADER],
    /* `whLabel` in the EXPORT; the screen prints it too here (6766), unlike
       the `dead` branch where only the export aliases. */
    ...rows.map((r) => [whLabel(r.w), r.pos, r.in, r.out, r.val.toFixed(2), r.neg, r.n]),
  ]
}

/* ---------------- per — index.html:6768-6775 ---------------- */

export interface MonthReportRow {
  /** The ISO `YYYY-MM` key — sorting uses THIS, never the label (M14-44). */
  month: string
  n: number
  in: number
  out: number
  val: number
}

/**
 * `per` — `IX.byDate` folded onto `d.slice(0, 7)` and sorted by `dsort` on the
 * ISO key (6769-6770).
 *
 * Sorting by the formatted `MM.YYYY` label instead would order `01.2026`
 * before `12.2025`; the tests use a year-crossing fixture so the two orders
 * disagree.
 */
export function monthReportRows(agg: ReportAggregates): MonthReportRow[] {
  const byMonth = new Map<string, MonthReportRow>()
  for (const [d, s] of agg.byDate) {
    const key = d.slice(0, 7)
    let x = byMonth.get(key)
    if (!x) { x = { month: key, n: 0, in: 0, out: 0, val: 0 }; byMonth.set(key, x) }
    x.in += s.in; x.out += s.out; x.n += s.n; x.val += s.val
  }
  return Array.from(byMonth.values()).sort((a, b) => dsort(a.month, b.month))
}

/** The daily sparkline series — one point per date, valued by COUNT (6771). */
export function dailyCountSeries(agg: ReportAggregates) {
  return agg.dates.map((d) => ({ k: d, v: agg.byDate.get(d)?.n ?? 0 }))
}

/** 6772 — the export carries the FORMATTED `MM.YYYY` label (M14-46, M14-47). */
export const MONTH_EXPORT_HEADER = ['Ay', 'Əməliyyat', 'Mədaxil', 'Məxaric', 'Mədaxil dəyəri']

export function monthExportMatrix(rows: readonly MonthReportRow[]): unknown[][] {
  return [
    [...MONTH_EXPORT_HEADER],
    ...rows.map((r) => [fmtM(r.month), r.n, r.in, r.out, r.val.toFixed(2)]),
  ]
}

/* ---------------- abc — index.html:6776-6787 ---------------- */

export type AbcClass = 'A' | 'B' | 'C'

export interface AbcReportRow {
  b: WarehouseBalance
  /** Running cumulative value up to and including this row. */
  cum: number
  cls: AbcClass
  /** This row's INDIVIDUAL share of the total. */
  share: number
}

export interface AbcReport {
  rows: AbcReportRow[]
  /** The divisor actually used — falls back to 1 when the sum is 0 (M14-53). */
  tot: number
}

/**
 * `abc` — positions by value descending, then a running cumulative share
 * (6777-6779).
 *
 * Boundaries are INCLUSIVE at both thresholds: `p <= .8 → A`, `p <= .95 → B`,
 * else `C`. `tot` falls back to 1 when the value sum is zero, so an all-zero
 * portfolio classes every row `A` rather than dividing by zero.
 */
export function abcReport(agg: ReportAggregates): AbcReport {
  const pos = agg.positions.slice().sort((a, b) => b.val - a.val)
  const tot = pos.reduce((s, b) => s + b.val, 0) || 1
  let cum = 0
  const rows = pos.map((b) => {
    cum += b.val
    const p = cum / tot
    return { b, cum, cls: (p <= 0.8 ? 'A' : p <= 0.95 ? 'B' : 'C') as AbcClass, share: b.val / tot }
  })
  return { rows, tot }
}

/** The three KPIs — count and summed value per class (6782, M14-54). */
export function abcKpis(rows: readonly AbcReportRow[]) {
  const of = (c: AbcClass) => rows.filter((r) => r.cls === c)
  return (['A', 'B', 'C'] as const).map((c) => ({
    cls: c,
    count: of(c).length,
    value: of(c).reduce((s, r) => s + r.b.val, 0),
  }))
}

/** 6782 — the exact eyebrow suffixes and KPI classes (M14-55). */
export const ABC_KPI_SUFFIX: Readonly<Record<AbcClass, string>> = {
  A: 'dəyərin 80%-i',
  B: 'növbəti 15%',
  C: 'qalan 5%',
}
export const ABC_KPI_CLASS: Readonly<Record<AbcClass, string>> = { A: 'g', B: '', C: 'o' }

/** 6785 — the row tag colour (M14-56). */
export const ABC_TAG_CLASS: Readonly<Record<AbcClass, string>> = {
  A: 't-in', B: 't-op', C: 't-mut',
}

/**
 * 6787 — reproduced VERBATIM (D-P2, M14-59).
 *
 * It contradicts `SHOW_MAX = 3000` (index.html:1678): the table is cut at
 * 3000 rows, not 200. Stale legacy copy, preserved as parity; correcting
 * user-facing text is a product decision, not a migration one.
 */
export const ABC_STALE_HINT = 'İlk 200 sətir göstərilir — tam siyahı üçün CSV ixrac edin.'

/** 6781 — export carries the INDIVIDUAL share at 2dp (M14-57, M14-58). */
export const ABC_EXPORT_HEADER = ['Sinif', 'Kod', 'Mal', 'Anbar', 'Qalıq', 'Dəyər', 'Pay %']

export function abcExportMatrix(rows: readonly AbcReportRow[]): unknown[][] {
  return [
    [...ABC_EXPORT_HEADER],
    ...rows.map((r) => [
      r.cls, r.b.c, r.b.name, whLabel(r.b.w), r.b.q, r.b.val.toFixed(2),
      (r.share * 100).toFixed(2),
    ]),
  ]
}

/** 6785 — the SCREEN prints the CUMULATIVE share at 1dp (M14-57). */
export function abcScreenPercent(row: AbcReportRow, tot: number): string {
  return (row.cum / tot * 100).toFixed(1) + '%'
}

/* ---------------- tr — index.html:6805-6820 ---------------- */

export interface TransferMatrixRow {
  from: string
  to: string
  q: number
  n: number
  val: number
}

/**
 * `tr` — the inter-warehouse flow matrix (6806-6816).
 *
 * THE RESOLUTION RULE IS A BARE CASE-SENSITIVE PREFIX MATCH (6808, M14-66):
 *
 *     DB.whs.find(w => (m.p || '').indexOf(w) === 0)
 *
 * It deliberately does NOT use the accepted `transferRoute()` normaliser,
 * which lower-cases, canonicalises `ı`→`i` and strips «anbar/anbarı/anbarına»
 * (index.html:1430-1454, `lib/movementRoute.ts`). The two DISAGREE: a stored
 * «astara anbarı» resolves under the normaliser and is DROPPED here.
 *
 * That divergence is preserved, not fixed (M14-71). Substituting the
 * normaliser would change which rows appear in a financial matrix, which is a
 * product decision outside this migration's scope.
 *
 * A row matching no warehouse prefix is SILENTLY dropped — no placeholder row,
 * no counter, no error (M14-67).
 */
export function transferMatrixRows(
  operational: readonly MovementRow[],
  warehouses: readonly string[],
  itemPrice: ReadonlyMap<string, number>,
): TransferMatrixRow[] {
  const mat = new Map<string, TransferMatrixRow>()
  for (const m of operational) {
    if (m.type !== 'Yerdəyişmə') continue
    const partner = m.partner || ''
    const other = warehouses.find((w) => partner.indexOf(w) === 0)
    if (!other) continue

    const inQ = num(m.in_qty)
    const outQ = num(m.out_qty)
    const from = outQ > 0 ? m.warehouse : other
    const to = outQ > 0 ? other : m.warehouse
    const key = from + '→' + to

    let x = mat.get(key)
    if (!x) { x = { from, to, q: 0, n: 0, val: 0 }; mat.set(key, x) }
    /* `(m.i || m.o)` — a JS `||`, so a zero incoming falls through to the
       outgoing quantity (M14-69). NOT a sum, unlike the qaimə report. */
    const qty = inQ || outQ
    x.q += qty
    x.n++
    /* `m.pr || itemPrice || 0` — the movement price wins whenever TRUTHY
       here, which is a weaker test than the aggregates' `> 0` (M14-70). */
    x.val += qty * (num(m.price) || itemPrice.get(m.item_code) || 0)
    mat.set(key, x)
  }
  return Array.from(mat.values()).sort((a, b) => b.q - a.q)
}

/** 6818 — the exact empty-state text (M14-72). */
export const TRANSFER_EMPTY = 'Yerdəyişmə qeydi tapılmadı.'

/** 6817 — RAW stored names, not `whLabel` (M14-73). */
export const TRANSFER_EXPORT_HEADER = ['Haradan', 'Hara', 'Əməliyyat', 'Miqdar', 'Dəyər']

export function transferExportMatrix(rows: readonly TransferMatrixRow[]): unknown[][] {
  return [
    [...TRANSFER_EXPORT_HEADER],
    ...rows.map((r) => [r.from, r.to, r.n, r.q, r.val.toFixed(2)]),
  ]
}

/* ---------------- shared print contract ---------------- */

/**
 * The printed row count — `nf(Math.max(0, REP_ROWS.length - 1))` (6732).
 *
 * The header row is excluded and the result is floored at 0, so an EMPTY
 * matrix prints «0 sətir» rather than «-1 sətir» (M14-94).
 */
export function printRowCount(matrix: readonly unknown[][]): number {
  return Math.max(0, matrix.length - 1)
}

/** `'Hesabat: ' + REP_NAME` — the SLUG, never the label (6732, M14-93). */
export function printTitle(name: string): string {
  return 'Hesabat: ' + name
}
