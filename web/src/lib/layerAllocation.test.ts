import { describe, it, expect } from 'vitest'
import {
  layerCalc, selectedQty, layerSourceLabel, layerQtyMatches, LAYER_QTY_TOLERANCE,
  checkFinalAmount, priceVariants, layerUnitPrice, type StockLayer,
} from './layerAllocation'

const L = (o: Partial<StockLayer> & { id: string }): StockLayer => ({
  source_type: 'receipt',
  received_date: '2026-01-01',
  source_doc_num: '',
  source_invoice_num: '',
  price_status: 'known',
  unit_price: 10,
  available_qty: 100,
  ...o,
})

describe('layerCalc — M7-77', () => {
  const layers = [L({ id: 'L1' }), L({ id: 'L2', unit_price: 5 })]

  it('sums the known amount across selected layers', () => {
    const r = layerCalc(new Map([['L1', 2], ['L2', 4]]), layers)
    expect(r.qty).toBe(6)
    expect(r.knownAmount).toBe(40)
    expect(r.sourceAmount).toBe(40)
    expect(r.unknownQty).toBe(0)
  })

  it('emits allocations rounded to four decimals', () => {
    const r = layerCalc(new Map([['L1', 1.000049]]), layers)
    expect(r.allocations).toEqual([{ layer_id: 'L1', qty: 1 }])
  })

  /* A partial total must never read as a complete one. */
  it('an unknown-price layer nulls sourceAmount but still counts quantity', () => {
    const withUnknown = [...layers, L({ id: 'L3', price_status: 'unknown', unit_price: null })]
    const r = layerCalc(new Map([['L1', 2], ['L3', 3]]), withUnknown)
    expect(r.qty).toBe(5)
    expect(r.unknownQty).toBe(3)
    expect(r.knownAmount).toBe(20)
    expect(r.sourceAmount).toBeNull()
  })

  it('skips zero and negative selections', () => {
    const r = layerCalc(new Map([['L1', 0], ['L2', -1]]), layers)
    expect(r.allocations).toEqual([])
    expect(r.knownAmount).toBe(0)
  })

  it('skips a selection whose layer no longer exists', () => {
    const r = layerCalc(new Map([['GONE', 5]]), layers)
    expect(r.allocations).toEqual([])
    /* selectedQty still counts it — it mirrors the original's separate sum. */
    expect(r.qty).toBe(5)
  })

  it('rounds each line amount to two decimals before summing', () => {
    const r = layerCalc(new Map([['L1', 0.333]]), [L({ id: 'L1', unit_price: 3 })])
    expect(r.knownAmount).toBe(1)
  })
})

describe('selectedQty', () => {
  it('sums the selection', () => {
    expect(selectedQty(new Map([['a', 1], ['b', 2]]))).toBe(3)
  })
  it('treats non-numeric values as zero', () => {
    expect(selectedQty(new Map([['a', NaN as number]]))).toBe(0)
  })
})

describe('layerSourceLabel — M7-76', () => {
  it('maps all four source types', () => {
    expect(layerSourceLabel({ source_type: 'legacy_unresolved' }))
      .toBe('Köhnə qalıq · mənbə dəqiqləşməyib')
    expect(layerSourceLabel({ source_type: 'legacy_adjustment' })).toBe('Tarixi bərpa')
    expect(layerSourceLabel({ source_type: 'transfer' })).toBe('Yerdəyişmə partiyası')
    expect(layerSourceLabel({ source_type: 'receipt' })).toBe('Mədaxil partiyası')
    expect(layerSourceLabel({ source_type: 'anything-else' })).toBe('Mədaxil partiyası')
  })
})

describe('layerQtyMatches', () => {
  it('accepts within the tolerance and rejects beyond it', () => {
    expect(layerQtyMatches(5, 5)).toBe(true)
    expect(layerQtyMatches(5.00004, 5)).toBe(true)
    expect(layerQtyMatches(5.001, 5)).toBe(false)
    expect(LAYER_QTY_TOLERANCE).toBe(0.00005)
  })
})

describe('checkFinalAmount — M7-73', () => {
  it('an empty amount needs no reason', () => {
    expect(checkFinalAmount('', '')).toEqual({ ok: true })
    expect(checkFinalAmount('   ', '')).toEqual({ ok: true })
  })

  it('accepts a valid amount with a reason', () => {
    expect(checkFinalAmount('123.45', 'razılaşdırılıb')).toEqual({ ok: true })
    expect(checkFinalAmount('0', 'səbəb')).toEqual({ ok: true })
  })

  /* An amount without a reason is refused — the audit trail depends on it. */
  it('refuses an amount with no reason', () => {
    const r = checkFinalAmount('99', '  ')
    expect(r.ok).toBe(false)
    expect(r.error).toBe('Məbləğ dəyişikliyinin səbəbi tələb olunur.')
  })

  it('refuses a malformed amount', () => {
    expect(checkFinalAmount('12.345', 'x').error).toBe('Yekun məbləğ düzgün deyil.')
    expect(checkFinalAmount('-5', 'x').ok).toBe(false)
    expect(checkFinalAmount('abc', 'x').ok).toBe(false)
    expect(checkFinalAmount('1'.repeat(17), 'x').ok).toBe(false)
  })
})

describe('priceVariants — M7-74', () => {
  const layers = [
    L({ id: 'L1', unit_price: 10 }),
    L({ id: 'L2', unit_price: 5 }),
    L({ id: 'L3', unit_price: 10 }),
    L({ id: 'L4', price_status: 'unknown', unit_price: null }),
  ]

  /* No average is ever displayed — source layers can differ and one blended
     figure would misrepresent them. */
  it('lists DISTINCT prices, sorted ascending', () => {
    const a = [
      { layer_id: 'L1', qty: 1 }, { layer_id: 'L2', qty: 1 }, { layer_id: 'L3', qty: 1 },
    ]
    expect(priceVariants(a, layers)).toEqual([5, 10])
  })

  it('omits unknown-price layers', () => {
    expect(priceVariants([{ layer_id: 'L4', qty: 1 }], layers)).toEqual([])
  })

  it('returns an empty list when nothing is allocated', () => {
    expect(priceVariants([], layers)).toEqual([])
  })
})

describe('layerUnitPrice', () => {
  it('divides the shown amount by the quantity, to four decimals', () => {
    expect(layerUnitPrice(100, 3)).toBe(33.3333)
  })
  it('is 0 when the amount is unknown or the quantity is not positive', () => {
    expect(layerUnitPrice(null, 3)).toBe(0)
    expect(layerUnitPrice(100, 0)).toBe(0)
  })
})
