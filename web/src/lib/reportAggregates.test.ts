import { describe, expect, it } from 'vitest'
import { buildReportAggregates, UNNAMED_PARTNER } from './reportAggregates'
import type { MovementRow } from '../api/itemMovements.api'
import type { ItemRow } from '../api/items.api'
import type { WarehouseBalance } from './itemIndex'

/* T1 — the six `IX.*` aggregates «Hesabatlar» needs (M14-18 … M14-26).
   Unit evidence only. The cancellation filter is the caller's job (M14-18,
   proved in the store tests); nothing here re-filters. */

const movement = (over: Partial<MovementRow>): MovementRow => ({
  id: 'm', item_code: 'A', warehouse: 'W', date: '2026-02-01', in_qty: 0,
  out_qty: 0, price: 0, partner: '', type: 'Satınalma', invoice_num: '', note: '',
  doc_num: '', created_at: '', channel: '', contract_num: '', created_by: '', ...over,
})

/* The real `ItemRow` shape — code/name/unit/price/category (items.api.ts:9-15).
   An earlier draft declared a non-existent `group_name` and used an `as` cast
   that masked the mismatch, so the overridden price never reached the index
   and both fallback cases read 0. The cast is gone deliberately: the fixture
   must fail to compile if `ItemRow` changes, not silently produce a wrong
   price. */
const item = (over: Partial<ItemRow> = {}): ItemRow => ({
  code: 'A', name: 'Item A', unit: 'ədəd', price: 0, category: null, ...over,
})

const balance = (over: Partial<WarehouseBalance>): WarehouseBalance => ({
  w: 'W', c: 'A', in: 1, out: 0, n: 1, q: 1, last: '2026-01-01', first: '2026-01-01',
  price: 10, val: 10, name: 'Item A', unit: 'ədəd', ...over,
})

describe('price rule — index.html:1282 (M14-20)', () => {
  /* The movement price wins ONLY when present AND strictly positive. The
     zero and NEGATIVE cases are the whole point: `m.price || itemPrice`
     would keep a negative price, because it is truthy. */
  it('uses the movement price when it is strictly positive', () => {
    const agg = buildReportAggregates(
      [movement({ in_qty: 2, price: 7, partner: 'P' })],
      [item({ price: 100 })],
      [],
    )
    expect(agg.byPartner.get('P')!.val).toBe(14)
  })

  it('falls back to the item price when the movement price is exactly 0', () => {
    const agg = buildReportAggregates(
      [movement({ in_qty: 2, price: 0, partner: 'P' })],
      [item({ price: 100 })],
      [],
    )
    expect(agg.byPartner.get('P')!.val).toBe(200)
  })

  /* The load-bearing negative control: a NEGATIVE movement price is truthy,
     so a `||` shortcut would keep it and yield -20. Legacy requires > 0. */
  it('falls back to the item price when the movement price is negative', () => {
    const agg = buildReportAggregates(
      [movement({ in_qty: 2, price: -10, partner: 'P' })],
      [item({ price: 100 })],
      [],
    )
    expect(agg.byPartner.get('P')!.val).toBe(200)
  })

  it('falls back to 0 when the movement price is null and the item is unknown', () => {
    const agg = buildReportAggregates(
      [movement({ in_qty: 2, price: null, item_code: 'MISSING', partner: 'P' })],
      [item({ price: 100 })],
      [],
    )
    expect(agg.byPartner.get('P')!.val).toBe(0)
  })
})

describe('the three value asymmetries — 1297/1298/1299 (M14-21, M14-22, M14-23)', () => {
  /* THE load-bearing test of this module. One row carrying BOTH an in and an
     out quantity must contribute DIFFERENTLY to the three indexes:
       byPartner  incoming only   → 2 * 10 = 20
       byType     both directions → (2+3) * 10 = 50
       byDate     incoming only   → 20
     A receipts-only fixture makes all three agree and proves nothing. */
  const agg = buildReportAggregates(
    [movement({ in_qty: 2, out_qty: 3, price: 10, partner: 'P', type: 'Satınalma', date: '2026-02-01' })],
    [],
    [],
  )

  it('byPartner.val counts INCOMING quantity only', () => {
    expect(agg.byPartner.get('P')!.val).toBe(20)
  })

  it('byType.val counts BOTH directions', () => {
    expect(agg.byType.get('Satınalma')!.val).toBe(50)
  })

  it('byDate.val counts INCOMING quantity only', () => {
    expect(agg.byDate.get('2026-02-01')!.val).toBe(20)
  })

  /* Stated as its own assertion so the asymmetry cannot be "unified" without
     a red test: byType must NOT equal the other two. */
  it('keeps byType distinct from byPartner and byDate for the same row', () => {
    expect(agg.byType.get('Satınalma')!.val).not.toBe(agg.byPartner.get('P')!.val)
    expect(agg.byPartner.get('P')!.val).toBe(agg.byDate.get('2026-02-01')!.val)
  })
})

describe('byPartner key fallback — 1296 (M14-21)', () => {
  it('attributes a null or empty partner to «(göstərilməyib)» and a real one to itself', () => {
    const agg = buildReportAggregates([
      movement({ id: 'a', partner: null, in_qty: 1 }),
      movement({ id: 'b', partner: '', in_qty: 1 }),
      movement({ id: 'c', partner: 'Real', in_qty: 1 }),
    ], [], [])
    expect(agg.byPartner.get(UNNAMED_PARTNER)!.n).toBe(2)
    expect(agg.byPartner.get('Real')!.n).toBe(1)
    expect(UNNAMED_PARTNER).toBe('(göstərilməyib)')
  })

  it('collects the distinct types seen for a partner', () => {
    const agg = buildReportAggregates([
      movement({ id: 'a', partner: 'P', type: 'Satınalma' }),
      movement({ id: 'b', partner: 'P', type: 'Silinmə' }),
      movement({ id: 'c', partner: 'P', type: 'Satınalma' }),
    ], [], [])
    expect([...agg.byPartner.get('P')!.types].sort()).toEqual(['Satınalma', 'Silinmə'])
  })
})

describe('byWh.val arrives in the finalisation pass — 1294-1295/1311 (M14-24)', () => {
  /* A warehouse with movements but NO surviving balance row legitimately ends
     with n > 0 and val === 0: the value comes from balances, not movements. */
  it('leaves val at 0 for a warehouse that has movements but no balance rows', () => {
    const agg = buildReportAggregates([movement({ warehouse: 'W', in_qty: 5, price: 10 })], [], [])
    const bw = agg.byWh.get('W')!
    expect(bw.n).toBe(1)
    expect(bw.in).toBe(5)
    expect(bw.val).toBe(0)
  })

  it('adds each balance value to its warehouse, including zero and negative rows', () => {
    const agg = buildReportAggregates([movement({ warehouse: 'W' })], [], [
      balance({ w: 'W', c: 'A', val: 10 }),
      balance({ w: 'W', c: 'B', q: -1, val: -4 }),
      balance({ w: 'W', c: 'C', q: 0, val: 0 }),
      balance({ w: 'OTHER', c: 'D', val: 99 }),
    ])
    expect(agg.byWh.get('W')!.val).toBe(6)
  })

  it('ignores a balance whose warehouse has no movement index entry', () => {
    const agg = buildReportAggregates([], [], [balance({ w: 'GHOST', val: 50 })])
    expect(agg.byWh.has('GHOST')).toBe(false)
    /* totVal still counts it — 1310 sums every balance (M14-24 vs totVal). */
    expect(agg.totVal).toBe(50)
  })

  it('tracks the distinct item codes seen per warehouse', () => {
    const agg = buildReportAggregates([
      movement({ id: 'a', warehouse: 'W', item_code: 'A' }),
      movement({ id: 'b', warehouse: 'W', item_code: 'B' }),
      movement({ id: 'c', warehouse: 'W', item_code: 'A' }),
    ], [], [])
    expect(agg.byWh.get('W')!.items.size).toBe(2)
  })
})

describe('positions epsilon — 1319 (M14-25)', () => {
  /* Boundary matrix: below, EXACTLY 1e-9, above, and the negative equivalent.
     Exactly 1e-9 is NOT a position (`>`, not `>=`). */
  it('excludes exactly 1e-9 and includes anything beyond it, in both signs', () => {
    const agg = buildReportAggregates([], [], [
      balance({ c: 'under', q: 5e-10 }),
      balance({ c: 'equal', q: 1e-9 }),
      balance({ c: 'over', q: 1.1e-9 }),
      balance({ c: 'negEqual', q: -1e-9 }),
      balance({ c: 'negOver', q: -0.5 }),
    ])
    expect(agg.positions.map((p) => p.c).sort()).toEqual(['negOver', 'over'])
  })
})

describe('dates ordering — 1320 (M14-26)', () => {
  /* The fixture is deliberately UNSORTED so the sort is falsifiable; an
     already-ordered fixture would pass without any sort at all (§4). */
  it('returns the byDate keys in ascending ISO order from an opposing fixture', () => {
    const agg = buildReportAggregates([
      movement({ id: 'a', date: '2026-03-05' }),
      movement({ id: 'b', date: '2025-12-31' }),
      movement({ id: 'c', date: '2026-01-02' }),
    ], [], [])
    expect(agg.dates).toEqual(['2025-12-31', '2026-01-02', '2026-03-05'])
  })

  it('returns an empty date list for no rows', () => {
    expect(buildReportAggregates([], [], []).dates).toEqual([])
  })
})

describe('totVal — 1310', () => {
  it('sums every balance value including negatives, not only positions', () => {
    const agg = buildReportAggregates([], [], [
      balance({ c: 'A', val: 100 }),
      balance({ c: 'B', q: -1, val: -30 }),
      balance({ c: 'C', q: 0, val: 0 }),
    ])
    expect(agg.totVal).toBe(70)
  })
})

describe('counts accumulate per index', () => {
  it('counts rows and quantities independently in each index', () => {
    const agg = buildReportAggregates([
      movement({ id: 'a', warehouse: 'W1', partner: 'P', type: 'Satınalma', date: '2026-01-01', in_qty: 1 }),
      movement({ id: 'b', warehouse: 'W2', partner: 'P', type: 'Silinmə', date: '2026-01-01', out_qty: 2 }),
    ], [], [])
    expect(agg.byPartner.get('P')!.n).toBe(2)
    expect(agg.byPartner.get('P')!.in).toBe(1)
    expect(agg.byPartner.get('P')!.out).toBe(2)
    expect(agg.byWh.get('W1')!.n).toBe(1)
    expect(agg.byWh.get('W2')!.n).toBe(1)
    expect(agg.byDate.get('2026-01-01')!.n).toBe(2)
    expect(agg.byType.size).toBe(2)
  })
})
