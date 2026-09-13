/* Azpetrol / Araz — date normalisation and range filtering
   (M17-34 … M17-40).

   Ported from index.html:8124-8168.

   Why this exists at all: the Azpetrol source workbook has NO date column
   (documented in sql/020's header), so imported and manually entered rows
   carry `op_date = NULL`. An older filter dropped every undated row the moment
   any bound was set, silently emptying the list. The rule kept here is that an
   undated row cannot belong to a period — including it would falsify period
   totals — but the COUNT of rows hidden for that reason is reported to the
   user rather than swallowed. */

/**
 * `azpDate(v)` — index.html:8124-8138. Normalises to `YYYY-MM-DD` or `''`.
 *
 * Three accepted shapes, in the original's order:
 *   1. an Excel serial number, strictly inside 1..60000 (both bounds
 *      EXCLUSIVE of failure — `v < 1` and `v > 60000` return `''`);
 *   2. an ISO prefix, so a full timestamp keeps only its date part;
 *   3. `D.M.YYYY` / `DD.MM.YYYY` with `.`, `/` or `-` separators, zero-padded.
 *
 * Anything else yields `''`. It never guesses and never returns a partial
 * date.
 */
export function azpDate(v: unknown): string {
  if (v == null || v === '') return ''
  if (typeof v === 'number' && isFinite(v)) {
    if (v < 1 || v > 60000) return ''
    const d = new Date(Date.UTC(1899, 11, 30) + Math.round(v) * 86400000)
    return isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10)
  }
  const s = String(v).trim()
  let mm = s.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (mm) return mm[1] + '-' + mm[2] + '-' + mm[3]
  mm = s.match(/^(\d{1,2})[.//-](\d{1,2})[.//-](\d{4})$/)
  if (mm) return mm[3] + '-' + ('0' + mm[2]).slice(-2) + '-' + ('0' + mm[1]).slice(-2)
  return ''
}

/** `azpDayKey(v)` — index.html:8154. The comparison key is the date itself. */
export function azpDayKey(v: unknown): string {
  return azpDate(v)
}

/**
 * `azpInRange(rowDate, d1, d2)` — index.html:8155-8163.
 *
 * BOTH bounds are inclusive, and both sides are normalised first — so a value
 * arriving as `2026-08-08T00:00:00+04:00` no longer sorts above the string
 * `2026-08-08` and therefore no longer falls outside an `08-08` end bound.
 *
 * With no bound at all, everything passes, undated rows included. With ANY
 * bound set, an undated row is excluded: it cannot be assigned to a period.
 */
export function azpInRange(rowDate: unknown, d1: unknown, d2: unknown): boolean {
  const a = azpDate(d1)
  const b = azpDate(d2)
  if (!a && !b) return true
  const d = azpDayKey(rowDate)
  if (!d) return false
  if (a && d < a) return false
  if (b && d > b) return false
  return true
}

/** A row carrying an operation date, which is the only field these read. */
export interface AzpDatedRow {
  op_date?: string | null
}

/**
 * `azpUndatedHidden(rows, d1, d2)` — index.html:8165-8168.
 *
 * How many rows are excluded SOLELY because they carry no usable date. Zero
 * when no bound is set, because in that case nothing is excluded for dating.
 * The caller pre-filters by card and kind, so this counts only within the
 * user's other selections.
 */
export function azpUndatedHidden(
  rows: readonly AzpDatedRow[],
  d1: unknown,
  d2: unknown,
): number {
  if (!azpDate(d1) && !azpDate(d2)) return 0
  return rows.filter((r) => !azpDayKey(r.op_date)).length
}
