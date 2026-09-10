import { describe, it, expect } from 'vitest'
import {
  groupPriceRange, groupRows, CAT_UNSET,
  MSG_MIN_INVALID, MSG_MAX_INVALID, MSG_MIN_GT_MAX,
  EMPTY_GROUP_FILTERS, type GroupFilters, type GroupRowsInput,
} from './groupFilters'
import { allowedWarehouses } from './warehouseScope'
import type { ItemRow } from '../api/items.api'
import type { WarehouseBalance } from './itemIndex'
import type { LastPurchase } from './lastPurchase'
import type { Me } from './roles'

const bal = (w: string, c: string, q: number): WarehouseBalance =>
  ({ w, c, in: q, out: 0, n: 1, q, last: '', first: '9999', price: 0, val: 0, name: '', unit: '' })

const item = (code: string, p: Partial<ItemRow> = {}): ItemRow =>
  ({ code, name: 'Item ' + code, unit: 'ədəd', price: 999, category: null, ...p })

const lp = (price: number): LastPurchase => ({ price, d: '2026-01-01', ts: null, id: 'x' })

function filters(p: Partial<GroupFilters> = {}): GroupFilters {
  return { ...EMPTY_GROUP_FILTERS, whs: new Set(), cats: new Set(), ...p }
}

function run(over: Partial<GroupRowsInput> = {}) {
  const base: GroupRowsInput = {
    bal: [bal('Ələt', 'C1', 5)],
    itemBy: new Map([['C1', item('C1')]]),
    lastPurchase: new Map([['C1', lp(10)]]),
    allowed: ['Ələt', 'Astara'],
    filters: filters(),
    ...over,
  }
  return groupRows(base)
}

describe('groupPriceRange — validation (M6-16, M6-17)', () => {
  it('accepts blank bounds', () => {
    expect(groupPriceRange({ min: '', max: '' })).toEqual({ ok: true, min: null, max: null })
  })

  it('rejects a negative min with the exact legacy message', () => {
    expect(groupPriceRange({ min: '-1', max: '' })).toEqual({ ok: false, msg: MSG_MIN_INVALID })
  })

  it('rejects a non-numeric min', () => {
    expect(groupPriceRange({ min: 'abc', max: '' })).toEqual({ ok: false, msg: MSG_MIN_INVALID })
  })

  it('rejects a negative max with the exact legacy message', () => {
    expect(groupPriceRange({ min: '', max: '-2' })).toEqual({ ok: false, msg: MSG_MAX_INVALID })
  })

  it('rejects min > max with the exact legacy message', () => {
    expect(groupPriceRange({ min: '50', max: '10' })).toEqual({ ok: false, msg: MSG_MIN_GT_MAX })
  })

  it('allows min === max', () => {
    expect(groupPriceRange({ min: '10', max: '10' })).toEqual({ ok: true, min: 10, max: 10 })
  })
})

describe('groupRows — balance and scope (M6-02, M6-03, M6-S11)', () => {
  it('keeps only strictly positive balances', () => {
    const r = run({
      bal: [bal('Ələt', 'C1', 5), bal('Ələt', 'C2', 0), bal('Ələt', 'C3', -3)],
      itemBy: new Map([['C1', item('C1')], ['C2', item('C2')], ['C3', item('C3')]]),
      lastPurchase: new Map(),
    })
    expect(r.ok && r.rows.map((x) => x.code)).toEqual(['C1'])
  })

  it('treats a sub-epsilon balance as zero', () => {
    const r = run({ bal: [bal('Ələt', 'C1', 1e-12)], lastPurchase: new Map() })
    expect(r.ok && r.rows).toEqual([])
  })

  it('excludes warehouses outside the allowed list', () => {
    const r = run({
      bal: [bal('Ələt', 'C1', 5), bal('Xocahəsən', 'C1', 7)],
      allowed: ['Ələt'],
      lastPurchase: new Map(),
    })
    expect(r.ok && r.rows.map((x) => x.wh)).toEqual(['Ələt'])
  })

  /* M6-S6 — anbardar sees ONLY the assigned warehouse, not the source group. */
  it('an anbardar in Astara does not see Harmony (no source group)', () => {
    const me: Me = { id: 'u', sbId: 'u', email: 'a@b.c', name: 'A', role: 'anbardar', wh: 'Astara' }
    const allowed = allowedWarehouses(me, ['Ələt', 'Astara', 'Harmony'])
    expect(allowed).toEqual(['Astara'])

    const r = run({
      bal: [bal('Astara', 'C1', 5), bal('Harmony', 'C1', 9)],
      allowed,
      lastPurchase: new Map(),
    })
    expect(r.ok && r.rows.map((x) => x.wh)).toEqual(['Astara'])
  })
})

describe('groupRows — price (M6-04, M6-19, M6-S9)', () => {
  it('uses the last purchase price, never items.price', () => {
    const r = run({
      itemBy: new Map([['C1', item('C1', { price: 999 })]]),
      lastPurchase: new Map([['C1', lp(10)]]),
    })
    expect(r.ok && r.rows[0].price).toBe(10)
  })

  it('renders null when no purchase exists, even though items.price is set', () => {
    const r = run({
      itemBy: new Map([['C1', item('C1', { price: 999 })]]),
      lastPurchase: new Map(),
    })
    expect(r.ok && r.rows[0].price).toBeNull()
  })

  it('drops a priceless row when only min is set', () => {
    const r = run({ lastPurchase: new Map(), filters: filters({ min: '1' }) })
    expect(r.ok && r.rows).toEqual([])
  })

  it('drops a priceless row when only max is set — not treated as 0', () => {
    const r = run({ lastPurchase: new Map(), filters: filters({ max: '100' }) })
    expect(r.ok && r.rows).toEqual([])
  })

  it('keeps a priceless row when neither bound is set', () => {
    const r = run({ lastPurchase: new Map() })
    expect(r.ok && r.rows.length).toBe(1)
  })

  it('bounds are inclusive at both ends', () => {
    const input = {
      bal: [bal('Ələt', 'A', 1), bal('Ələt', 'B', 1), bal('Ələt', 'C', 1)],
      itemBy: new Map([['A', item('A')], ['B', item('B')], ['C', item('C')]]),
      lastPurchase: new Map([['A', lp(10)], ['B', lp(20)], ['C', lp(30)]]),
    }
    const r = run({ ...input, filters: filters({ min: '10', max: '30' }) })
    expect(r.ok && r.rows.map((x) => x.code)).toEqual(['A', 'B', 'C'])

    const r2 = run({ ...input, filters: filters({ min: '11', max: '29' }) })
    expect(r2.ok && r2.rows.map((x) => x.code)).toEqual(['B'])
  })

  it('returns the validation error instead of rows', () => {
    const r = run({ filters: filters({ min: '50', max: '10' }) })
    expect(r).toEqual({ ok: false, error: MSG_MIN_GT_MAX })
  })
})

describe('groupRows — category, search, name (M6-07, M6-20, M6-S8)', () => {
  it('maps a missing category to CAT_UNSET', () => {
    const r = run({ itemBy: new Map([['C1', item('C1', { category: null })]]) })
    expect(r.ok && r.rows[0].cat).toBe(CAT_UNSET)
  })

  it('filters by CAT_UNSET like any other category', () => {
    const r = run({
      bal: [bal('Ələt', 'A', 1), bal('Ələt', 'B', 1)],
      itemBy: new Map([['A', item('A', { category: null })], ['B', item('B', { category: 'Nasos' })]]),
      lastPurchase: new Map(),
      filters: filters({ cats: new Set([CAT_UNSET]) }),
    })
    expect(r.ok && r.rows.map((x) => x.code)).toEqual(['A'])
  })

  it('ORs multiple categories', () => {
    const r = run({
      bal: [bal('Ələt', 'A', 1), bal('Ələt', 'B', 1), bal('Ələt', 'C', 1)],
      itemBy: new Map([
        ['A', item('A', { category: 'Nasos' })],
        ['B', item('B', { category: 'Boru' })],
        ['C', item('C', { category: 'Kabel' })],
      ]),
      lastPurchase: new Map(),
      filters: filters({ cats: new Set(['Nasos', 'Kabel']) }),
    })
    expect(r.ok && r.rows.map((x) => x.code)).toEqual(['A', 'C'])
  })

  it('ANDs the warehouse and category filters', () => {
    const r = run({
      bal: [bal('Ələt', 'A', 1), bal('Astara', 'A', 1), bal('Astara', 'B', 1)],
      itemBy: new Map([['A', item('A', { category: 'Nasos' })], ['B', item('B', { category: 'Boru' })]]),
      lastPurchase: new Map(),
      filters: filters({ whs: new Set(['Astara']), cats: new Set(['Nasos']) }),
    })
    expect(r.ok && r.rows.map((x) => x.wh + '/' + x.code)).toEqual(['Astara/A'])
  })

  it('searches code and name case-insensitively', () => {
    const r = run({
      bal: [bal('Ələt', '0000152', 1), bal('Ələt', 'C2', 1)],
      itemBy: new Map([['0000152', item('0000152', { name: 'Nasos' })], ['C2', item('C2', { name: 'Boru' })]]),
      lastPurchase: new Map(),
      filters: filters({ q: 'nasos' }),
    })
    expect(r.ok && r.rows.map((x) => x.code)).toEqual(['0000152'])

    const r2 = run({
      bal: [bal('Ələt', '0000152', 1)],
      itemBy: new Map([['0000152', item('0000152', { name: 'Nasos' })]]),
      lastPurchase: new Map(),
      filters: filters({ q: '0152' }),
    })
    expect(r2.ok && r2.rows.length).toBe(1)
  })

  /* M6-S8 — never blank. */
  it('renders the legacy unknown-item name for a code not in nomenclature', () => {
    const r = run({ itemBy: new Map(), lastPurchase: new Map() })
    expect(r.ok && r.rows[0].name).toBe('(nomenklaturada yoxdur: C1)')
  })

  it('finds an unknown item by its legacy placeholder name', () => {
    const r = run({ itemBy: new Map(), lastPurchase: new Map(), filters: filters({ q: 'yoxdur' }) })
    expect(r.ok && r.rows.length).toBe(1)
  })
})

describe('groupRows — sorting (M6-08)', () => {
  it('sorts by warehouse then name using az collation', () => {
    const r = run({
      bal: [bal('Astara', 'B', 1), bal('Ələt', 'A', 1), bal('Astara', 'A', 1)],
      itemBy: new Map([['A', item('A', { name: 'Alfa' })], ['B', item('B', { name: 'Beta' })]]),
      lastPurchase: new Map(),
      allowed: ['Astara', 'Ələt'],
    })
    expect(r.ok && r.rows.map((x) => x.wh + '/' + x.name)).toEqual([
      'Astara/Alfa', 'Astara/Beta', 'Ələt/Alfa',
    ])
  })
})
