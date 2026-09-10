import { excludeCancelled } from './operationalMovements'
import type { MovementRow } from '../api/itemMovements.api'

/* The global last-purchase price per item code — buildLastPurchaseMap()
   (index.html:739-750) and laterPurchase() (727-738).

   Read the original's own comment (735-738): "Hər mal üçün QLOBAL sonuncu
   etibarlı Satınalma qiyməti (anbardan asılı olmayaraq). … items.price
   fallback kimi İSTİFADƏ OLUNMUR."

   Three properties are load-bearing (registry M6-04, M6-05, M6-S9):

   1. GLOBAL, not per warehouse. The same code has ONE last purchase price
      whichever warehouse the balance row belongs to.
   2. `items.price` is NEVER a fallback. This is a different price concept from
      the one Nomenklatura shows, and a row legitimately renders «—» here while
      Nomenklatura shows a price for the same item. Do not "reconcile" them.
   3. Only `Satınalma` rows with a numeric `price > 0` qualify. A null, zero or
      negative price is "not recorded", not a price of zero. */

/** One winning purchase observation. Mirrors the original's map value. */
export interface LastPurchase {
  price: number
  /** movement date (`m.d`) */
  d: string
  /** `created_at` as epoch ms, or null when absent/unparseable */
  ts: number | null
  id: string
}

/**
 * `created_at` → epoch milliseconds, or `null` when it cannot be used.
 *
 * M6-S10, Phase 6 Q1. The legacy tiebreak reads `Number.isFinite(m.ts)`
 * (index.html:735) because `DB.movs` already holds `ts` as a NUMBER
 * (index.html:940, `+new Date(r.created_at)`).
 *
 * Supabase hands this column back as a NULLABLE ISO STRING. Calling
 * `Number.isFinite()` on that string returns `false` for every row — which
 * would not throw, would not fail typecheck, and would silently collapse the
 * three-level tiebreak into two levels, changing which purchase wins whenever
 * two share a date. Hence the explicit conversion, and hence the test that
 * pins a valid string against a malformed one.
 */
export function purchaseTimestamp(createdAt: string | null | undefined): number | null {
  if (createdAt == null) return null
  const ms = new Date(createdAt).getTime()
  return Number.isFinite(ms) ? ms : null
}

/**
 * `laterPurchase(m, prev)` — index.html:727-738. True when `m` should replace
 * the currently held `prev`.
 *
 * Deterministic three-level order:
 *   1. movement date (`m.d`), string comparison as in the original;
 *   2. a VALID `created_at` timestamp — when only one side has one it wins;
 *      when neither does, fall through;
 *   3. the id, compared as a STRING (the original's final fallback).
 */
export function laterPurchase(
  m: { d: string; ts: number | null; id: string },
  prev: { d: string; ts: number | null; id: string },
): boolean {
  if (m.d !== prev.d) return m.d > prev.d // 1) date

  /* 2) valid created_at. Ported in the original's exact shape (729-735) —
     the `a !== b` gate, then the two null cases, then the comparison. A row
     WITH a usable timestamp beats one without; when neither has one, or both
     hold the same instant, control falls through to the id. */
  const a = m.ts
  const b = prev.ts
  if (a !== b) {
    if (a === null) return false // prev has a valid time, m does not
    if (b === null) return true // m has a valid time, prev does not
    return a > b
  }

  return String(m.id) > String(prev.id) // 3) deterministic final fallback
}

/**
 * `buildLastPurchaseMap()` — index.html:739-750.
 *
 * Cancelled movements are removed first via the shared cancellation model,
 * exactly as the original's `normalMovements()` does (M6-06).
 */
export function buildLastPurchaseMap(movements: MovementRow[]): Map<string, LastPurchase> {
  const map = new Map<string, LastPurchase>()

  for (const m of excludeCancelled(movements)) {
    if (m.type !== 'Satınalma') continue

    /* `+m.pr` then `!(pr > 0)` (index.html:743) — this rejects null, 0,
       negatives AND NaN in one expression, because every comparison with NaN
       is false. Keep the negated form; `pr <= 0` would let NaN through. */
    const price = Number(m.price)
    if (!(price > 0)) continue

    const candidate: LastPurchase = {
      price,
      d: String(m.date ?? ''),
      ts: purchaseTimestamp(m.created_at),
      id: String(m.id),
    }

    const prev = map.get(m.item_code)
    if (!prev || laterPurchase(candidate, prev)) map.set(m.item_code, candidate)
  }

  return map
}
