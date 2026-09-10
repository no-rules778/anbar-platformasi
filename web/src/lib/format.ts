/* Number formatting, ported verbatim from index.html:594-599 (Q4 approved).

   These produce az-AZ thousands separators, which is exactly the difference
   recorded as deferred visual item V-01. Module F inherits that question
   rather than creating a new one: the final visual review settles both
   together. Do not "fix" the separators here. */

/**
 * `nf(n, d)` — index.html:594-598.
 * `d` omitted means 0..2 decimals; a number pins both minimum and maximum.
 * null/undefined/NaN render as an em-dash, never as `0` or `NaN`.
 */
export function nf(n: number | null | undefined, d?: number): string {
  if (n == null || isNaN(Number(n))) return '—'
  const v = Number(n)
  return v.toLocaleString('az-AZ', {
    minimumFractionDigits: d == null ? 0 : d,
    maximumFractionDigits: d == null ? 2 : d,
  })
}

/**
 * `money(n)` — index.html:599.
 * Note the third case: **exactly 0 renders an em-dash**, not `0,00 ₼`.
 * A value of zero is treated as "nothing to show", matching the original.
 */
export function money(n: number | null | undefined): string {
  if (n == null || isNaN(Number(n)) || Number(n) === 0) return '—'
  return nf(n, 2) + ' ₼'
}

/** `today()` — index.html:600. Used for export filenames. */
export function today(): string {
  return new Date().toISOString().slice(0, 10)
}

/**
 * `fmtD(s)` — index.html:602. `YYYY-MM-DD…` → `DD.MM.YYYY`.
 *
 * Anything that is not an ISO date prefix is returned unchanged, and null
 * becomes the empty string — NOT an em-dash. The original is deliberate about
 * that: an absent date renders as nothing at all, so a blank date cell is
 * visually different from a value that is genuinely unknown.
 */
export function fmtD(s: string | null | undefined): string {
  if (typeof s === 'string' && /^\d{4}-\d{2}-\d{2}/.test(s)) {
    return s.slice(8, 10) + '.' + s.slice(5, 7) + '.' + s.slice(0, 4)
  }
  return s ?? ''
}

/**
 * `TYPE_TAG` — index.html:1415-1418, as the CLASS ONLY.
 *
 * The original returns an HTML string; JSX renders the element, so only the
 * class lookup is ported. `İcarə` and `Əvvələ qalıq` deliberately share
 * `t-op`, and `Satış` is absent from the map — it falls through to `t-mut`,
 * exactly as the original's `m[t] || 't-mut'` does.
 */
const TYPE_TAG_CLASS: Record<string, string> = {
  'Satınalma': 't-in',
  'Əvvələ qalıq': 't-op',
  'Yerdəyişmə': 't-mv',
  'Silinmə': 't-rm',
  'Sahəyə': 't-out',
  'Qaytarma': 't-mut',
  'İcarə': 't-op',
}

export function typeTagClass(type: string | null | undefined): string {
  return TYPE_TAG_CLASS[String(type ?? '')] ?? 't-mut'
}
