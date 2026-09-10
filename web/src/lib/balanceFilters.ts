import { COND_COLS } from './condSplit'
import type { CondKey } from './condSplit'
import { CONDF } from './balanceRows'
import type { BalanceRow } from './balanceRows'

/* Balance filters, sorts and KPI aggregates — index.html:2326-2345.

   Pure functions over the rows `buildBalanceRows()` produced. Nothing here
   renders, formats, debounces or pages: `nf`/`money` formatting, the 200 ms
   search debounce, paging reset and the soft cap all belong to the page and
   the store. */

/** `BF.z` — the zero-segment filter (2327-2329). */
export type ZeroSegment = 'act' | 'all' | 'neg' | 'zero'

/** `BF.cond` — '' (all), 'any', or one condition key (2331-2332). */
export type CondFilter = '' | 'any' | CondKey

/** `BF.sort` — a plain key or `cond:<key>` (2335-2337). */
export type BalanceSort = 'val' | 'q' | 'name' | 'last' | `cond:${CondKey}`

export interface BalanceFilter {
  z: ZeroSegment
  /** Already lower-cased by the caller, exactly as `BF.q` is (2219). */
  q: string
  cond: CondFilter
}

/* The legacy epsilon (2327-2329, 2343). A balance is "zero" when it is within
   1e-9 of it — never `=== 0`, because q is a rounded float. */
const EPS = 1e-9

/**
 * `dsort` — index.html:601. Plain string comparison, NOT `localeCompare`:
 * the dates are ISO `YYYY-MM-DD`, where lexical order IS chronological.
 *
 * Duplicated rather than imported: the existing copy in `movementFilters.ts`
 * is module-private, and widening that module's public surface for an
 * unrelated consumer would couple the two screens.
 */
const dsort = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0)

/**
 * Applies the three filters in the legacy order (2326-2334).
 *
 * The zero-segment is subtractive in the original: `all` names no branch at
 * all, so it is the no-op. `act` drops rows within EPS of zero, `zero` keeps
 * only those, and `neg` keeps `q < 0` — which means an exactly-zero balance is
 * NOT negative.
 *
 * The search haystack is `name + ' ' + code` lower-cased (2330). `q` is
 * assumed already lower-cased, matching `BF.q`; a caller that passes mixed
 * case gets the legacy behaviour, which is to match nothing.
 */
export function filterBalanceRows(rows: BalanceRow[], f: BalanceFilter): BalanceRow[] {
  return rows.filter((b) => {
    if (f.z === 'act' && Math.abs(b.q) < EPS) return false
    if (f.z === 'neg' && b.q >= 0) return false
    if (f.z === 'zero' && Math.abs(b.q) > EPS) return false
    if (f.q && (b.name + ' ' + b.c).toLowerCase().indexOf(f.q) < 0) return false
    if (f.cond === 'any') {
      if (!(b.cUnfit > 0 || b.cRepair > 0 || b.cOnsite > 0 || b.cIcare > 0)) return false
    } else if (f.cond && !(b[CONDF[f.cond]] > 0)) return false
    return true
  })
}

/** The comparator table — `cmp` at 2335-2336. */
const CMP: Record<string, (a: BalanceRow, b: BalanceRow) => number> = {
  val: (a, b) => b.val - a.val,
  q: (a, b) => b.q - a.q,
  name: (a, b) => a.name.localeCompare(b.name, 'az'),
  last: (a, b) => dsort(b.last, a.last),
}
for (const cc of COND_COLS) {
  CMP['cond:' + cc.k] = (a, b) => b[CONDF[cc.k]] - a[CONDF[cc.k]]
}

/**
 * Sorts a COPY of the rows (2337).
 *
 * `val`, `q` and every condition sort are DESCENDING (`b - a`); `name` is
 * ascending under the Azerbaijani collation; `last` is descending by date.
 * An unrecognised sort key falls back to `val`, exactly as `cmp[BF.sort] ||
 * cmp.val` does — so a stale stored sort cannot throw.
 *
 * The original sorts `rows` in place, but `rows` there is already the private
 * result of `.filter()`. Copying here keeps that property when a caller passes
 * an array it still owns.
 */
export function sortBalanceRows(rows: BalanceRow[], sort: BalanceSort | string): BalanceRow[] {
  return rows.slice().sort(CMP[sort] || CMP.val)
}

/** The five current-view KPI figures (2338-2344), as raw numbers. */
export interface BalanceKpis {
  /** «Mövqe sayı» */
  count: number
  /** «Ümumi miqdar» */
  qty: number
  /** «Ümumi dəyər» */
  val: number
  /** «Sıfır qalıq» */
  zeroCount: number
  /** «Mənfi qalıq» */
  negCount: number
  /** Drives the «Mənfi qalıq» tile's `r`/`g` class (2344). */
  anyNegative: boolean
}

/**
 * Computes the KPI figures from the COMPLETE filtered set (M9-61).
 *
 * The original reduces over `rows` at 2338 and only pages afterwards at 2346
 * (`cut(rows, 'bal')`), so the capped page never reaches these totals. Passing
 * a capped array here would silently understate every figure.
 *
 * Returns numbers, not strings: `nf`/`money` formatting is the page's job.
 */
export function balanceKpis(rows: BalanceRow[]): BalanceKpis {
  let qty = 0
  let val = 0
  let zeroCount = 0
  let negCount = 0
  for (const b of rows) {
    qty += b.q
    val += b.val
    if (Math.abs(b.q) < EPS) zeroCount++
    if (b.q < 0) negCount++
  }
  return { count: rows.length, qty, val, zeroCount, negCount, anyNegative: negCount > 0 }
}
