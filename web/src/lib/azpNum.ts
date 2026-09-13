/* Azpetrol / Araz — numeric normalisers (M17-31, M17-32, M17-33).

   Ported from index.html:8118-8120. */

import { nf } from './format'

/**
 * `azpN(v)` — index.html:8118.
 *
 * Anything that is not a finite number becomes 0: NaN, Infinity, null,
 * undefined, objects and non-numeric strings. A NUMERIC string still converts,
 * because the original uses `Number(v)` rather than a type check.
 */
export function azpN(v: unknown): number {
  const n = Number(v)
  return isFinite(n) ? n : 0
}

/**
 * `azpR2(v)` — index.html:8119.
 *
 * Rounds to 2 decimals through `Math.round(n * 100) / 100`, so it inherits
 * that expression's exact behaviour — including half-up rounding on positive
 * values and half-toward-+∞ on negative ones (`Math.round(-0.5) === -0`).
 * Reproducing it literally matters: every stored and displayed money figure in
 * the module passes through here, and a "better" rounding would silently
 * disagree with the server's `round()` and with the legacy screen.
 */
export function azpR2(v: unknown): number {
  return Math.round(azpN(v) * 100) / 100
}

/**
 * `azpMoney(v)` — index.html:8120.
 *
 * DELIBERATELY NOT the shared `money()` from lib/format.ts. The two differ at
 * zero: `money(0)` renders an em-dash, while `azpMoney(0)` renders «0,00 ₼».
 * A card with no movements must show a real zero balance on this screen, not
 * an em-dash, so the module carries its own formatter. The em-dash here is
 * reserved for null and non-finite values only.
 */
export function azpMoney(v: unknown): string {
  if (v == null || !isFinite(Number(v))) return '—'
  return nf(Number(v), 2) + ' ₼'
}
