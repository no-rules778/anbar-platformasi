import type { WriteoffValuationRow } from '../api/writeoffValuations.api'

/* `movementValuation(m)` — index.html:1701-1707. M8-05.

   Answers ONE question: what is a Silinmə row worth? There are two sources and
   the order between them is the whole point.

     1. The STORED valuation in `writeoff_valuations`, written by the posting
        RPC when the write-off was allocated against receipt lots. This is the
        accounting truth — it knows which lots were consumed and at which
        prices, including the part that had no known price at all.

     2. Failing that, a LEGACY fallback derived from the row itself:
        `out_qty × price`. Rows posted before lot valuation existed have no
        stored row, and they must still show an amount.

   The fallback is NOT an approximation of the stored value and must never
   overwrite it — it is what the number meant before the table existed. */

/** The shape both sources are normalised into — the legacy return object. */
export interface MovementValuation {
  /** «Mənbə məbləği» — null when nothing priced could be sourced. */
  source: number | null
  /** The part of the write-off whose price WAS known. Never null. */
  known: number
  /** The quantity that carried no known price. Never null. */
  unknownQty: number
  /** The final amount, or null when it is genuinely undeterminable. The table
      renders null as «—», NOT as zero — see `money()`, where 0 is also an
      em-dash but for a different reason. */
  final: number | null
  /** `'legacy'` marks a value DERIVED here rather than read from the table. */
  method: string
  /** The admin's override reason, or '' — never null, matching legacy. */
  reason: string
}

/** The subset of a movement the valuation reads. */
export interface ValuationMovement {
  id: string | number
  /** The legacy `m.o`. */
  out_qty: number | null
  /** The legacy `m.pr`. */
  price: number | null
}

/** `+(n).toFixed(2)` — legacy rounds to 2dp and returns a NUMBER, not a string. */
const money2 = (n: number): number => Number(n.toFixed(2))

/**
 * `movementValuation` — index.html:1701-1707.
 *
 * `valuations` is `DB.woVals`. A HIT is returned as-is, in full: the stored
 * numbers are never recomputed, re-rounded or second-guessed here.
 *
 * A MISS derives the legacy shape, and the branch is driven by `pr > 0`:
 *
 *   pr > 0  → source/known/final all `qty × pr` (2dp), unknownQty 0
 *   pr <= 0 → source and final are NULL, known 0, and the whole quantity is
 *             `unknownQty` — the row is unvalued, not worth zero.
 *
 * The distinction matters on screen: a null `final` prints «—», whereas a 0
 * would print «—» too but for the wrong reason, and would sum into a total as
 * though the write-off had genuinely cost nothing.
 *
 * A missing/NaN price or quantity coerces to 0 exactly as the legacy `+(x||0)`
 * does, so a malformed row takes the unvalued branch rather than producing NaN.
 */
export function movementValuation(
  m: ValuationMovement | null | undefined,
  valuations: Map<string, WriteoffValuationRow>,
): MovementValuation {
  const stored = m ? valuations.get(String(m.id)) : undefined
  if (stored) {
    return {
      source: stored.source_amount,
      known: stored.known_amount ?? 0,
      unknownQty: stored.unknown_qty ?? 0,
      final: stored.final_amount,
      method: stored.valuation_method,
      reason: stored.override_reason ?? '',
    }
  }

  const num = (v: number | null | undefined): number => {
    const n = Number(v ?? 0)
    return Number.isFinite(n) ? n : 0
  }
  const qty = num(m?.out_qty)
  const pr = num(m?.price)
  const priced = pr > 0
  const amount = priced ? money2(qty * pr) : null

  return {
    source: amount,
    known: priced ? money2(qty * pr) : 0,
    unknownQty: priced ? 0 : qty,
    final: amount,
    method: 'legacy',
    reason: '',
  }
}

/**
 * The table's Qiymət cell for a Silinmə row — index.html:1793-1795.
 *
 *   `final != null && out_qty > 0` → `final / out_qty` at FOUR decimals
 *   otherwise                      → the row's own `m.pr`, or 0
 *
 * Four decimals, not two: the derived unit price of a lot-allocated write-off
 * is a quotient and rounding it to 2dp early would not reproduce `final` when
 * multiplied back. The nomenclature price is deliberately NOT in this chain —
 * for a Silinmə row it would invent a price the write-off never used.
 */
export function writeOffUnitPrice(m: ValuationMovement, v: MovementValuation): number {
  const qty = Number(m.out_qty ?? 0)
  if (v.final != null && qty > 0) return Number((v.final / qty).toFixed(4))
  return Number(m.price ?? 0) || 0
}
