import { describe, it, expect } from 'vitest'
import { movementValuation, writeOffUnitPrice, type ValuationMovement } from './movementValuation'
import type { WriteoffValuationRow } from '../api/writeoffValuations.api'

const mv = (over: Partial<ValuationMovement> = {}): ValuationMovement => ({
  id: 'm1', out_qty: 10, price: 3, ...over,
})

const stored = (over: Partial<WriteoffValuationRow> = {}): WriteoffValuationRow => ({
  movement_id: 'm1', source_amount: 55, known_amount: 40, unknown_qty: 2,
  final_amount: 48, valuation_method: 'fifo', override_reason: null, ...over,
})

const map = (...rows: WriteoffValuationRow[]) =>
  new Map(rows.map((r) => [String(r.movement_id), r]))

describe('the STORED valuation wins over the legacy fallback', () => {
  /* MUTATION: the fallback computed first, or preferred. `out_qty × price`
     is 30 here while the accounting truth is 48, because the stored row knows
     which lots were consumed and which part had no known price at all.
     Preferring the fallback would silently restate a posted write-off. */
  it('returns the stored row untouched when one exists', () => {
    const v = movementValuation(mv(), map(stored()))
    expect(v).toEqual({
      source: 55, known: 40, unknownQty: 2, final: 48, method: 'fifo', reason: '',
    })
  })

  it('does NOT recompute or re-round the stored numbers', () => {
    const v = movementValuation(mv({ out_qty: 3, price: 999 }), map(stored({ final_amount: 1.239 })))
    expect(v.final).toBe(1.239)
  })

  it('surfaces the override reason, and normalises null to an empty string', () => {
    expect(movementValuation(mv(), map(stored({ override_reason: 'Admin düzəlişi' }))).reason)
      .toBe('Admin düzəlişi')
    expect(movementValuation(mv(), map(stored())).reason).toBe('')
  })

  it('matches by movement id, so another row&apos;s valuation is never used', () => {
    const v = movementValuation(mv({ id: 'other' }), map(stored({ movement_id: 'm1' })))
    expect(v.method).toBe('legacy')
  })
})

describe('the legacy fallback — index.html:1703-1706', () => {
  /* MUTATION: `pr >= 0` instead of `pr > 0`, or unknownQty always 0. A row
     with no price is UNVALUED, not worth zero: `final` must be null so the
     table prints «—» and the quantity lands in unknownQty. A 0 would sum into
     totals as though the write-off had genuinely cost nothing. */
  it('an unpriced row is unvalued, not zero-valued', () => {
    const v = movementValuation(mv({ price: 0, out_qty: 7 }), new Map())
    expect(v).toEqual({
      source: null, known: 0, unknownQty: 7, final: null, method: 'legacy', reason: '',
    })
  })

  it('a priced row values the whole quantity, with nothing unknown', () => {
    const v = movementValuation(mv({ price: 3, out_qty: 10 }), new Map())
    expect(v).toEqual({
      source: 30, known: 30, unknownQty: 0, final: 30, method: 'legacy', reason: '',
    })
  })

  /* MUTATION: `toFixed(2)` dropped. The legacy returns a NUMBER rounded to
     2dp; without it a float artefact (2.9999999999999996) reaches the cell. */
  it('rounds the derived amount to two decimals, as a number', () => {
    const v = movementValuation(mv({ price: 0.1, out_qty: 29.99 }), new Map())
    expect(v.final).toBe(3)
    expect(typeof v.final).toBe('number')
  })

  it('a negative price takes the unvalued branch', () => {
    expect(movementValuation(mv({ price: -5, out_qty: 4 }), new Map()).final).toBeNull()
  })

  /* MUTATION: `Number(x)` without the finite guard, which yields NaN and
     renders as «—» for the wrong reason while poisoning any sum. */
  it('coerces a null or malformed quantity/price to 0 rather than NaN', () => {
    const v = movementValuation(mv({ price: null, out_qty: null }), new Map())
    expect(v.unknownQty).toBe(0)
    expect(v.final).toBeNull()
    expect(Number.isNaN(v.known)).toBe(false)
  })

  it('a null movement still returns the unvalued shape rather than throwing', () => {
    expect(movementValuation(null, new Map()).method).toBe('legacy')
    expect(movementValuation(undefined, new Map()).final).toBeNull()
  })
})

describe('writeOffUnitPrice — the Qiymət cell (index.html:1793-1795)', () => {
  /* MUTATION: rounding the quotient to 2dp. Four decimals are required
     because the unit price is derived by division: at 2dp, multiplying back
     by the quantity would not reproduce `final`, so the row's own Qiymət ×
     Miqdar would visibly disagree with its Məbləğ. */
  it('derives final / out_qty at FOUR decimals', () => {
    const m = mv({ out_qty: 3, price: 99 })
    expect(writeOffUnitPrice(m, movementValuation(m, map(stored({ final_amount: 10 })))))
      .toBe(3.3333)
  })

  /* MUTATION: falling back to the nomenclature price. For a Silinmə row that
     would invent a price the write-off never used — the item price is
     deliberately NOT in this chain. */
  it('falls back to the row&apos;s OWN price when final is null', () => {
    const m = mv({ out_qty: 5, price: 7 })
    const v = movementValuation(m, map(stored({ final_amount: null })))
    expect(writeOffUnitPrice(m, v)).toBe(7)
  })

  it('falls back to the row&apos;s own price when the quantity is zero', () => {
    const m = mv({ out_qty: 0, price: 7 })
    expect(writeOffUnitPrice(m, movementValuation(m, map(stored({ final_amount: 10 }))))).toBe(7)
  })

  it('yields 0 when neither a final amount nor a row price exists', () => {
    const m = mv({ out_qty: 0, price: null })
    expect(writeOffUnitPrice(m, movementValuation(m, new Map()))).toBe(0)
  })
})
