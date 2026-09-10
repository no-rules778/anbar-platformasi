import { COND_COLS } from './condSplit'
import { CONDF, type BalanceRow } from './balanceRows'
import { whLabel } from './movementRoute'
import {
  modeLabel,
  modeQtyColumn,
  type InitialBalanceMode,
  type InitialBalanceRow,
} from './initialBalance'

/* «Anbar qalıqları» Excel matrices — index.html:2374-2377 (current view) and
   2276-2277 («Əvvələ qalıq» view). M9-110…M9-116, M9-110a, M9-111.

   These functions build the 2-D array ONLY. Writing the workbook stays in
   `lib/xls.ts` (M9-117), which supplies the filename date suffix, the
   «Hesabat» sheet, autofilter, frozen header, widths and `toNum` coercion.
   Nothing here formats for display: the screen's `nf`/`money`/`fmtD` are
   deliberately NOT applied, because a spreadsheet needs raw numbers and
   ISO dates it can sort, not locale strings.

   TWO COLUMN ORDERS EXIST PER VIEW AND BOTH ARE PORTED AS-IS (M9-110a,
   M9-111). The on-screen table begins «Kod · Malın adı · Anbar · Ölçü»
   (2357, 2268) while the export begins «Anbar · Kod · Malın adı · Ölçü»
   (2374, 2276). Same fields, different first three. That is legacy
   behaviour, not drift, and the tests pin the DIFFERENCE so nobody "tidies"
   the two into a false parity. */

/** The base name; `xls()` appends `_<YYYY-MM-DD>.xlsx` (index.html:1233). */
export const BALANCE_EXPORT_NAME = 'anbar_qaliqlari'

/** The four condition titles, generated from the array (2375). */
const condTitles = (): string[] => COND_COLS.map((cc) => cc.t)

/**
 * Current-view TABLE header — index.html:2357-2359. Begins with `Kod`.
 * Exported so the page and the export tests share one definition of the
 * on-screen order; the page renders exactly this list.
 */
export const CURRENT_TABLE_HEADER: readonly string[] = [
  'Kod', 'Malın adı', 'Anbar', 'Ölçü', 'Mədaxil', 'Məxaric', 'Qalıq',
  ...condTitles(),
  'Vahid qiyməti', 'Dəyər', 'Son hərəkət',
]

/**
 * Current-view EXPORT header — index.html:2374, 14 columns. Begins with
 * `Anbar`. The four condition titles are GENERATED from `COND_COLS` (M9-110):
 * the legacy comment at 2369-2373 explains why — a hand-counted row would
 * carry three condition cells under a four-title header and shift every later
 * column by one.
 */
export const CURRENT_EXPORT_HEADER: readonly string[] = [
  'Anbar', 'Kod', 'Malın adı', 'Ölçü', 'Mədaxil', 'Məxaric', 'Qalıq',
  ...condTitles(),
  'Vahid qiyməti', 'Dəyər', 'Son hərəkət',
]

/**
 * `currentBalanceExportMatrix` — the body of the `xls([...])` call at
 * index.html:2374-2377, row for row.
 *
 * @param rows the FULL filtered, sorted set (`rows` in `rBal()`), never the
 *   `cut()` page slice (M9-112). The caller owns that distinction; this
 *   function cannot detect a truncated input.
 *
 * Per cell (2375-2377):
 *  - warehouse through `whLabel()` — the display alias goes into the file
 *    (agreed 2026-08-25), the stored key does not (M9-113);
 *  - `in`, `out`, `q` RAW numbers (no `nf`);
 *  - each condition marker `b[CONDF[k]] || 0`;
 *  - `price || ''` — a priceless row exports an EMPTY cell, not 0 (M9-114);
 *  - `val.toFixed(2)` — a 2-dp STRING that `toNum()` turns back into a
 *    number inside `xls()` (M9-115);
 *  - `last` RAW ISO, never `fmtD()` (M9-116).
 */
export function currentBalanceExportMatrix(rows: readonly BalanceRow[]): unknown[][] {
  const body: unknown[][] = rows.map((b) => [
    whLabel(b.w),
    b.c,
    b.name,
    b.unit,
    b.in,
    b.out,
    b.q,
    ...COND_COLS.map((cc) => b[CONDF[cc.k]] || 0),
    b.price || '',
    b.val.toFixed(2),
    b.last,
  ])
  return [[...CURRENT_EXPORT_HEADER], ...body]
}

/**
 * «Əvvələ qalıq» TABLE header — index.html:2268. Begins with `Kod`; the
 * quantity column header IS the active mode label (M9-78, M9-80).
 */
export function initialTableHeader(mode: InitialBalanceMode): string[] {
  return [
    'Kod', 'Malın adı', 'Anbar', 'Ölçü', modeLabel(mode),
    'İlk mənbə anbar', 'Əvvələ qalıq tarixi', 'Son hərəkət',
  ]
}

/**
 * «Əvvələ qalıq» EXPORT header — index.html:2276, 8 columns. Begins with
 * `Anbar` (M9-111). NOT the table's order.
 */
export function initialExportHeader(mode: InitialBalanceMode): string[] {
  return [
    'Anbar', 'Kod', 'Malın adı', 'Ölçü', modeLabel(mode),
    'İlk mənbə anbar', 'Əvvələ qalıq tarixi', 'Son hərəkət',
  ]
}

/**
 * `initialBalanceExportMatrix` — the body of the `xls([...])` call at
 * index.html:2276-2277.
 *
 * @param rows the FULL filtered, sorted opening set (`filtered`), never the
 *   page slice (M9-112).
 *
 * Per cell (2277): warehouse AND `opening_warehouse` through `whLabel()`
 * (M9-113 names both); the active mode's quantity `|| 0`; `opening_date` and
 * `last` RAW ISO (M9-116). Note the on-screen table renders
 * `opening_warehouse` WITHOUT the alias (2272) — that asymmetry is legacy and
 * is kept on both sides.
 */
export function initialBalanceExportMatrix(
  rows: readonly InitialBalanceRow[],
  mode: InitialBalanceMode,
): unknown[][] {
  const col = modeQtyColumn(mode)
  const body: unknown[][] = rows.map((b) => [
    whLabel(b.w),
    b.c,
    b.name,
    b.unit,
    b[col] || 0,
    whLabel(b.opening_warehouse || ''),
    b.opening_date,
    b.last,
  ])
  return [initialExportHeader(mode), ...body]
}
