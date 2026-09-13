import type { SmReportRow } from './serfiyyat'

/* «Sərfiyyat Materialları» report filters and the «Yekun» aggregation —
   smFilteredRows() (index.html:6669-6690) and the two Map aggregates in
   smRenderReportTable() (6703-6711). */

/**
 * The fifteen filter inputs (M13-80), held exactly as legacy holds them.
 *
 * EVERY numeric bound is an INPUT STRING, not a number, and that is
 * load-bearing (M13-84): `''` is falsy and disables its guard, but `'0'` is
 * TRUTHY, so an exact zero bound IS applied through `parseFloat('0')`. Typing
 * these as `number` would erase the distinction and silently change behaviour.
 *
 * The text fields are stored ALREADY trimmed and lower-cased — legacy does
 * that when it snapshots the inputs on «Filtrləri tətbiq et» (6631-6639), not
 * when it compares.
 */
export interface SmFilters {
  d1: string
  d2: string
  /** EXACT project name, not a substring. */
  proj: string
  item: string
  kontragent: string
  avto: string
  /** EXACT channel name, not a substring. */
  kanal: string
  iv: string
  note: string
  by: string
  q1: string
  q2: string
  p1: string
  p2: string
  s1: string
  s2: string
}

/** `SM.filters = {}` (index.html:6184, 6643) — every field empty. */
export const EMPTY_FILTERS: SmFilters = {
  d1: '', d2: '', proj: '', item: '', kontragent: '', avto: '', kanal: '', iv: '',
  note: '', by: '', q1: '', q2: '', p1: '', p2: '', s1: '', s2: '',
}

/** Lower-cased substring test against a possibly-empty field (6673-6681). */
const has = (value: string, needle: string): boolean =>
  (value || '').toLowerCase().indexOf(needle) >= 0

/**
 * M13-83, M13-84 — `smFilteredRows()` (index.html:6669-6690).
 *
 * Semantics, per field group:
 *   * date  — ISO string `<` / `>` comparison;
 *   * proj, kanal — EXACT equality against the stored name;
 *   * item, kontragent, avto, iv, note, by — lower-cased SUBSTRING;
 *   * qty, price, sum — numeric range via parseFloat.
 *
 * The guards are truthiness checks on the STRING, reproduced verbatim. An
 * implementation that coerced the bounds to numbers first would treat `'0'`
 * as falsy and skip the guard — the exact defect D-N4 wrongly claimed legacy
 * had, and which the Codex audit withdrew.
 */
export function filterReportRows(
  rows: readonly SmReportRow[],
  f: SmFilters,
): SmReportRow[] {
  return rows.filter((r) => {
    if (f.d1 && r.d < f.d1) return false
    if (f.d2 && r.d > f.d2) return false
    if (f.proj && r.proj !== f.proj) return false
    if (f.item && !has(r.item, f.item)) return false
    if (f.kontragent && !has(r.kontragent, f.kontragent)) return false
    if (f.avto && !has(r.avto, f.avto)) return false
    if (f.kanal && r.kanal !== f.kanal) return false
    if (f.iv && !has(r.iv, f.iv)) return false
    if (f.note && !has(r.note, f.note)) return false
    if (f.by && !has(r.by, f.by)) return false
    if (f.q1 && r.qty < parseFloat(f.q1)) return false
    if (f.q2 && r.qty > parseFloat(f.q2)) return false
    if (f.p1 && r.price < parseFloat(f.p1)) return false
    if (f.p2 && r.price > parseFloat(f.p2)) return false
    if (f.s1 && r.sum < parseFloat(f.s1)) return false
    if (f.s2 && r.sum > parseFloat(f.s2)) return false
    return true
  })
}

/** One «Yekun» line: a key and its summed `line_sum`. */
export interface SmSummaryRow {
  key: string
  sum: number
}

/* Both aggregates preserve Map INSERTION order — first appearance in the
   filtered rows — not alphabetical and not descending by value (M13-87). */
function summarise(rows: readonly SmReportRow[], pick: (r: SmReportRow) => string): SmSummaryRow[] {
  const acc = new Map<string, number>()
  for (const r of rows) acc.set(pick(r), (acc.get(pick(r)) || 0) + r.sum)
  return Array.from(acc, ([key, sum]) => ({ key, sum }))
}

/** M13-86, M13-87 — «Layihə üzrə» (index.html:6704-6708). */
export const summariseByProject = (rows: readonly SmReportRow[]): SmSummaryRow[] =>
  summarise(rows, (r) => r.proj)

/** M13-86, M13-87 — «Material üzrə» (index.html:6704-6709). */
export const summariseByItem = (rows: readonly SmReportRow[]): SmSummaryRow[] =>
  summarise(rows, (r) => r.item)
