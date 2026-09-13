import { describe, expect, it } from 'vitest'
import type { MovementRow } from '../api/itemMovements.api'
import type { WarehouseBalance } from './itemIndex'
import { controlIssues, INTERNAL_PARTNER_LITERALS, type ControlIssuesInput } from './controlIssues'

/* T1 — M11-51 … M11-61. One positive, one negative and the equality boundary
   per rule, over fixtures; unit evidence only. */

const bal = (over: Partial<WarehouseBalance>): WarehouseBalance => ({
  w: 'Ələt', c: 'A', in: 2, out: 0, n: 1, q: 2, last: '2026-01-01', first: '2026-01-01',
  price: 10, val: 20, name: 'Item A', unit: 'ədəd', ...over,
})
const mv = (over: Partial<MovementRow>): MovementRow => ({
  id: 'm', item_code: 'A', warehouse: 'Ələt', date: '2026-01-10', in_qty: 2, out_qty: 0, price: null,
  partner: 'Ext Co', type: 'Satınalma', invoice_num: 'INV', note: null, doc_num: null, created_at: null, contract_num: null, ...over,
})
const items = [
  { code: 'A', name: 'Item A', unit: 'ədəd', price: 10, category: null },
  { code: 'B', name: 'Item B', unit: 'ədəd', price: 0, category: null },
]
const base = (over: Partial<ControlIssuesInput> = {}): ControlIssuesInput => ({
  bal: [], byItem: new Map(), operational: [], items, partners: [{ name: 'Ext Co', voen: '1234567890' }],
  locationNames: ['Ələt', 'Astara', 'Layihə X'], warehouses: ['Ələt', 'Astara'], today: '2026-06-01',
  recorder: (m) => m.created_by ?? 'Excel idxalı', ...over,
})
const ids = (input: ControlIssuesInput) => controlIssues(input).map((g) => g.id)
const group = (input: ControlIssuesInput, id: string) => controlIssues(input).find((g) => g.id === id)

describe('shape and order — M11-51', () => {
  it('returns no group on clean data', () => {
    expect(controlIssues(base())).toEqual([])
  })

  it('emits only the rules with rows, in the fixed legacy order, with the full group shape', () => {
    const input = base({
      bal: [bal({ q: -1, val: -10 }), bal({ c: 'B', q: 1, price: 0, val: 0 })],
      operational: [mv({ invoice_num: null }), mv({ id: 'f', date: '2026-07-01' })],
      items: [...items, { code: 'C', name: 'item-a', unit: 'ədəd', price: 1, category: null }],
    })
    const G = controlIssues(input)
    expect(G.map((g) => g.id)).toEqual(['neg', 'nop', 'doc', 'dup', 'fut'])
    expect(G.map((g) => g.sev)).toEqual(['high', 'med', 'low', 'med', 'med'])
    expect(G.map((g) => g.title)).toEqual(['Mənfi qalıq', 'Qiyməti olmayan qalıq', 'Sənədsiz satınalma', 'Nomenklaturada təkrar', 'Gələcək tarixli qeyd'])
    for (const g of G) {
      expect(g.why.length).toBeGreaterThan(10)
      expect(g.cols.length).toBeGreaterThan(0)
      expect(g.rows.length).toBe(g.codes.length)
      for (const r of g.rows) expect(r).toHaveLength(g.cols.length)
    }
  })
})

describe('neg — M11-52', () => {
  it('counts q < −1e-9 with the aliased warehouse; exactly −1e-9 and 0 are excluded', () => {
    const g = group(base({ bal: [bal({ w: 'Xocahəsən', q: -1 }), bal({ c: 'e', q: -1e-9 }), bal({ c: 'z', q: 0 }), bal({ c: 'i', q: -1.1e-9 })] }), 'neg')
    expect(g?.rows.map((r) => r[1])).toEqual(['A', 'i'])
    expect(g?.rows[0]).toEqual(['Xocəsən', 'A', 'Item A', '-1,00'])
  })
})

describe('nop — M11-53', () => {
  it('counts non-zero priceless positions only', () => {
    const g = group(base({ bal: [bal({ c: 'p', q: 2, price: 0 }), bal({ c: 'z', q: 0, price: 0 }), bal({ c: 'ok', q: 2, price: 5 })] }), 'nop')
    expect(g?.codes).toEqual(['p'])
  })
})

describe('doc — M11-54', () => {
  it('flags Satınalma with neither invoice nor contract; either one clears it; other types ignored', () => {
    const rows = [
      mv({ id: 'none', invoice_num: null, contract_num: null }),
      mv({ id: 'inv', invoice_num: 'X', contract_num: null }),
      mv({ id: 'ct', invoice_num: null, contract_num: 'C' }),
      mv({ id: 'other', invoice_num: null, contract_num: null, type: 'Qaytarma' }),
    ]
    expect(group(base({ operational: rows }), 'doc')?.rows).toEqual([['10.01.2026', 'Ələt', 'A', 'Ext Co']])
  })

  it('prints «—» for an empty partner', () => {
    expect(group(base({ operational: [mv({ invoice_num: null, partner: '' })] }), 'doc')?.rows[0][3]).toBe('—')
  })
})

describe('voen — M11-55', () => {
  it('flags a purchase from an external partner without VÖEN', () => {
    const g = group(base({ operational: [mv({ partner: 'NoVoen Ltd', in_qty: 3 })], partners: [{ name: 'NoVoen Ltd', voen: '' }] }), 'voen')
    expect(g?.rows).toEqual([['10.01.2026', 'NoVoen Ltd', 'A', '3,00']])
  })

  it('does not flag a partner with VÖEN, an unknown partner… wait: an unknown partner IS flagged; an empty partner is not', () => {
    expect(ids(base({ operational: [mv({ partner: 'Ext Co' })] }))).toEqual([])
    expect(ids(base({ operational: [mv({ partner: 'Unknown Co' })] }))).toEqual(['voen'])
    expect(ids(base({ operational: [mv({ partner: '' })] }))).toEqual([])
  })

  it.each([
    ['a location name', 'Layihə X'], ['a warehouse name', 'Astara'],
    ...INTERNAL_PARTNER_LITERALS.map((l) => ['the literal ' + l, l] as [string, string]),
  ])('ignores %s as an internal counterparty', (_label, partner) => {
    expect(ids(base({ operational: [mv({ partner })] }))).toEqual([])
  })

  it('matches the partner name exactly (case and whitespace matter)', () => {
    expect(ids(base({ operational: [mv({ partner: 'ext co' })] }))).toEqual(['voen'])
  })
})

describe('orph — M11-56', () => {
  it('flags codes missing from the catalogue with the net quantity', () => {
    const g = group(base({ operational: [mv({ item_code: 'ZZZ', in_qty: 5, out_qty: 2 }), mv({ id: 'ok' })] }), 'orph')
    expect(g?.rows).toEqual([['10.01.2026', 'Ələt', 'ZZZ', '3,00']])
  })
})

describe('tr / lag — M11-57, M11-58', () => {
  const out = (over: Partial<MovementRow> = {}) => mv({ id: 'out', type: 'Yerdəyişmə', warehouse: 'Ələt', partner: 'Astara anbarına', in_qty: 0, out_qty: 4, date: '2026-01-10', ...over })
  const inn = (over: Partial<MovementRow> = {}) => mv({ id: 'in', type: 'Yerdəyişmə', warehouse: 'Astara', partner: 'Ələt anbarından', in_qty: 4, out_qty: 0, date: '2026-01-10', ...over })

  it('a matched opposite-direction transfer of the same code and quantity is paired (no group)', () => {
    expect(ids(base({ operational: [out(), inn()] }))).toEqual([])
  })

  it('an outbound with no inbound in the prefixed warehouse is unpaired', () => {
    const g = group(base({ operational: [out()] }), 'tr')
    expect(g?.rows).toEqual([['10.01.2026', 'Ələt', 'A', '4,00', 'Astara anbarına']])
  })

  it('a partner text that is not prefixed by any configured warehouse is unpaired', () => {
    expect(ids(base({ operational: [out({ partner: 'Somewhere else' }), inn()] }))).toEqual(['tr'])
  })

  it('quantity boundary: a difference of exactly 1e-6 is unpaired, 0.9e-6 is paired', () => {
    expect(ids(base({ operational: [out({ out_qty: 4 }), inn({ in_qty: 4 + 1e-6 })] }))).toEqual(['tr'])
    expect(ids(base({ operational: [out({ out_qty: 4 }), inn({ in_qty: 4 + 0.9e-6 })] }))).toEqual([])
  })

  it('the counterparty is the FIRST configured warehouse that prefixes the partner text', () => {
    /* «Ələt» prefixes «Ələt 2 …»; with «Ələt» configured first the pair is sought in «Ələt», not «Ələt 2». */
    const rows = [
      out({ warehouse: 'Astara', partner: 'Ələt 2 anbarına' }),
      inn({ warehouse: 'Ələt 2', partner: 'Astara anbarından' }),
    ]
    expect(ids(base({ warehouses: ['Ələt', 'Ələt 2', 'Astara'], operational: rows }))).toEqual(['tr'])
    expect(ids(base({ warehouses: ['Ələt 2', 'Ələt', 'Astara'], operational: rows }))).toEqual([])
  })

  it('lag: paired dates 4 days apart are flagged, exactly 3 days are not', () => {
    const four = group(base({ operational: [out(), inn({ date: '2026-01-14' })] }), 'lag')
    expect(four?.rows).toEqual([['A', 'Ələt', '10.01.2026', '14.01.2026', '4']])
    expect(ids(base({ operational: [out(), inn({ date: '2026-01-13' })] }))).toEqual([])
  })

  it('lag: a missing date counts as 0 days (not flagged)', () => {
    expect(ids(base({ operational: [out(), inn({ date: '' })] }))).toEqual([])
  })
})

describe('dup — M11-59', () => {
  it('groups by the normalised name and counts GROUPS, listing codes and balances', () => {
    const three = [
      { code: 'A', name: 'Boru 20mm', unit: 'ədəd', price: 1, category: null },
      { code: 'B', name: 'boru-20 mm', unit: 'ədəd', price: 1, category: null },
      { code: 'C', name: 'BORU, 20/mm.', unit: 'ədəd', price: 1, category: null },
      { code: 'D', name: 'Distinct', unit: 'ədəd', price: 1, category: null },
    ]
    const g = group(base({ items: three, byItem: new Map([['A', { q: 1 }], ['C', { q: 2.5 }]]) }), 'dup')
    expect(g?.rows).toHaveLength(1)
    expect(g?.rows[0]).toEqual(['Boru 20mm', 'A, B, C', '1,00 / 0,00 / 2,50'])
    expect(g?.codes).toEqual(['A'])
  })
})

describe('fut — M11-60', () => {
  it('flags dates after today with the recorder label; today itself is not future', () => {
    const g = group(base({ operational: [mv({ id: 'f', date: '2026-06-02', created_by: 'ali@x' }), mv({ id: 't', date: '2026-06-01' })] }), 'fut')
    expect(g?.rows).toEqual([['02.06.2026', 'Ələt', 'A', 'ali@x']])
  })
})

describe('wo — M11-61', () => {
  const wo = (over: Partial<MovementRow>) => mv({ type: 'Silinmə', in_qty: 0, ...over })

  it('flags out × ITEM price > 500; exactly 500 is not flagged', () => {
    const g = group(base({ operational: [wo({ out_qty: 51 })], items: [{ code: 'A', name: 'Item A', unit: 'ədəd', price: 10, category: null }] }), 'wo')
    expect(g?.rows).toEqual([['10.01.2026', 'Ələt', 'A', '510,00 ₼']])
    expect(ids(base({ operational: [wo({ out_qty: 50 })] }))).toEqual([])
  })

  it('ignores the movement price: a 1000 ₼ movement price on a priceless item is not flagged', () => {
    expect(ids(base({ operational: [wo({ item_code: 'B', out_qty: 10, price: 1000 })] }))).toEqual([])
  })
})
