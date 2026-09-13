import { describe, expect, it } from 'vitest'
import { deadStockExportMatrix, deadStockKpis, deadStockRows, locationSummaries, warehouseSummaries } from './warehouseOverview'
import type { MovementRow } from '../api/itemMovements.api'
import type { WarehouseBalance } from './itemIndex'
import type { WarehouseRow } from '../api/warehouses.api'

/* T1 — pure derivations over OPERATIONAL rows (M10-20 … M10-49). Unit
   evidence only; the cancellation filter is the store's job (M10-14) and is
   proved in warehouseOverview.store.test.ts. */

const movement = (over: Partial<MovementRow>): MovementRow => ({
  id: 'm', item_code: 'A', warehouse: 'W', date: '2026-02-01', in_qty: 0,
  out_qty: 0, price: 0, partner: '', type: 'Satınalma', invoice_num: '', note: '',
  doc_num: '', created_at: '', channel: '', contract_num: '', created_by: '', ...over,
})

const balance = (over: Partial<WarehouseBalance>): WarehouseBalance => ({
  w: 'W', c: 'A', in: 1, out: 0, n: 1, q: 1, last: '2026-01-01', first: '2026-01-01',
  price: 10, val: 10, name: 'Item A', unit: 'ədəd', ...over,
})

describe('warehouse summaries — index.html:2902-2907', () => {
  it('keeps configured warehouse order and computes positions, value, count and max date', () => {
    const rows = warehouseSummaries(['W2', 'W1'], [
      balance({ w: 'W1', q: 2, val: 20 }), balance({ w: 'W1', c: 'B', q: 0, val: 0 }),
    ], [movement({ warehouse: 'W1', date: '2026-01-01' }), movement({ id: 'm2', warehouse: 'W1', date: '2026-02-03' })])
    expect(rows[0]).toEqual({ warehouse: 'W2', positions: 0, value: 0, movements: 0, last: '' })
    expect(rows[1]).toEqual({ warehouse: 'W1', positions: 1, value: 20, movements: 2, last: '2026-02-03' })
  })

  /* M10-22 — the epsilon is `abs(q) > 1e-9`, so exactly 1e-9 is NOT a
     position while a negative balance beyond it IS one. */
  it('counts a position only when abs(q) exceeds 1e-9 (equality excluded, negatives included)', () => {
    const rows = warehouseSummaries(['W'], [
      balance({ c: 'eq', q: 1e-9 }),
      balance({ c: 'under', q: 5e-10 }),
      balance({ c: 'over', q: 1.1e-9 }),
      balance({ c: 'neg', q: -0.5 }),
    ], [])
    expect(rows[0].positions).toBe(2)
  })

  /* M10-23 — value is the sum of the SHARED balance values, including a
     zero-quantity row's 0 and a negative row's negative value. */
  it('sums shared balance values per warehouse, not only positive positions', () => {
    const rows = warehouseSummaries(['W', 'X'], [
      balance({ w: 'W', val: 10 }), balance({ w: 'W', c: 'B', q: -1, val: -4 }),
      balance({ w: 'W', c: 'C', q: 0, val: 0 }), balance({ w: 'X', val: 99 }),
    ], [])
    expect(rows.map((r) => r.value)).toEqual([6, 99])
  })

  /* M10-24 / M10-25 — Hərəkət and Son əməliyyat come from the rows PASSED
     IN (the operational set); a movement of another warehouse counts for
     neither. An empty date set gives '' (the page prints «—»). */
  it('takes movement count and max date from the supplied rows of that warehouse only', () => {
    const rows = warehouseSummaries(['W', 'Empty'], [], [
      movement({ warehouse: 'W', date: '2026-03-01' }),
      movement({ id: 'x', warehouse: 'Other', date: '2026-09-09' }),
    ])
    expect(rows[0]).toMatchObject({ movements: 1, last: '2026-03-01' })
    expect(rows[1]).toMatchObject({ movements: 0, last: '' })
  })
})

describe('location summaries — index.html:2909-2913', () => {
  it('keeps inactive locations and uses exact partner matches for count and quantity turnover', () => {
    const locations = [{ id: 1, name: 'P', type: 'layihə', active: false }] as WarehouseRow[]
    const rows = locationSummaries(locations, [movement({ partner: 'P', in_qty: 2 }), movement({ id: 'x', partner: 'P', out_qty: 3 })])
    expect(rows).toEqual([{ id: 1, name: 'P', kind: 'layihə', active: false, movements: 2, turnover: 5 }])
  })

  /* M10-33 — the partner index is keyed `m.p || '(göstərilməyib)'` (1297).
     A movement with no partner belongs to a location literally named
     «(göstərilməyib)» and to no other; a prefix/case variant never matches. */
  it('attributes partner-less movements to «(göstərilməyib)» only and matches names exactly', () => {
    const locations = [
      { id: 1, name: '(göstərilməyib)', type: 'layihə', active: true },
      { id: 2, name: 'P', type: 'layihə', active: true },
      { id: 3, name: 'p', type: 'layihə', active: true },
    ] as WarehouseRow[]
    const rows = locationSummaries(locations, [
      movement({ id: 'a', partner: null, out_qty: 1 }),
      movement({ id: 'b', partner: '', out_qty: 2 }),
      movement({ id: 'c', partner: 'P', out_qty: 4 }),
      movement({ id: 'd', partner: 'P ', out_qty: 8 }),
    ])
    expect(rows.map((r) => [r.name, r.movements, r.turnover])).toEqual([
      ['(göstərilməyib)', 2, 3], ['P', 1, 4], ['p', 0, 0],
    ])
  })

  /* M10-34 — turnover is QUANTITY in + out; the price never enters. */
  it('ignores price in turnover', () => {
    const rows = locationSummaries([{ id: 1, name: 'P', type: 'anbar', active: true }] as WarehouseRow[], [
      movement({ partner: 'P', in_qty: 1.5, out_qty: 0.25, price: 1000 }),
    ])
    expect(rows[0].turnover).toBe(1.75)
    expect(rows[0].kind).toBe('anbar')
  })
})

describe('dead-stock derivation — index.html:6789-6794', () => {
  /* M10-44 — the boundary is `days >= 30`. Both items were USED (ordinary
     outbound), so inclusion depends on the day count alone: A at 29 days is
     out, B at exactly 30 days is in. */
  it('excludes 29 days and includes exactly 30 days when ordinary outbound proves prior use', () => {
    const movements = [
      movement({ id: 'latest', item_code: 'Z', date: '2026-02-01' }),
      movement({ id: 'a-out', item_code: 'A', date: '2026-01-10', out_qty: 1, type: 'Silinmə' }),
      movement({ id: 'b-out', item_code: 'B', date: '2026-01-10', out_qty: 1, type: 'Silinmə' }),
    ]
    const rows = deadStockRows([
      balance({ c: 'A', last: '2026-01-03' }),
      balance({ c: 'B', last: '2026-01-02' }),
    ], movements, '2099-01-01')
    expect(rows.map((r) => [r.balance.c, r.days, r.moved])).toEqual([['B', 30, true]])
  })

  /* M10-43 — «used» needs an ORDINARY outbound of the SAME item in the SAME
     warehouse. Transfer-only outbound, an inbound, an outbound of another
     warehouse and a zero-quantity outbound all leave it «never used»
     (M10-45: sorted by value descending). */
  it('treats transfer-only, foreign-warehouse, zero and inbound rows as never used; sorts by value desc', () => {
    const rows = deadStockRows([
      balance({ c: 'A', val: 5, last: '2026-02-01' }),
      balance({ c: 'B', val: 20, last: '2026-02-01' }),
      balance({ c: 'C', val: 7, last: '2026-02-01' }),
      balance({ c: 'D', val: 9, last: '2026-02-01' }),
    ], [
      movement({ item_code: 'A', out_qty: 1, type: 'Yerdəyişmə' }),
      movement({ id: 'b', item_code: 'B', in_qty: 1 }),
      movement({ id: 'c', item_code: 'C', warehouse: 'Other', out_qty: 1, type: 'Silinmə' }),
      movement({ id: 'd', item_code: 'D', out_qty: 0, type: 'Silinmə' }),
    ], '2026-02-01')
    expect(rows.map((r) => [r.balance.c, r.moved])).toEqual([['B', false], ['D', false], ['C', false], ['A', false]])
  })

  it('an ordinary outbound of the same item and warehouse marks the row used, and a used row under 30 days is excluded', () => {
    const rows = deadStockRows([balance({ c: 'A', last: '2026-01-20' })], [
      movement({ id: 'ref', item_code: 'Z', date: '2026-02-01' }),
      movement({ id: 'a', item_code: 'A', date: '2026-01-20', out_qty: 0.5, type: 'Sahəyə' }),
    ], '2099-01-01')
    expect(rows).toEqual([])
  })

  /* M10-41 — the reference is the NEWEST operational date even when today
     is later; only with no movements at all does `today()` apply. */
  it('uses the newest operational date as the reference, and today only when there are no movements', () => {
    const withMovements = deadStockRows([balance({ last: '2026-01-01' })], [
      movement({ date: '2026-01-31' }), movement({ id: 'older', date: '2025-12-01' }),
    ], '2026-12-31')
    expect(withMovements[0].days).toBe(30)
    const none = deadStockRows([balance({ last: '2026-01-01' })], [], '2026-01-11')
    expect(none[0].days).toBe(10)
  })

  /* M10-42 — `Math.round((ref - last) / 86400000)` on ISO dates parsed as
     UTC midnight: whole days, never a fraction. */
  it('computes whole calendar days', () => {
    const rows = deadStockRows([balance({ last: '2026-01-01' })], [movement({ date: '2026-03-01' })], '2099-01-01')
    expect(rows[0].days).toBe(59)
  })

  /* M10-40 — the source is `IX.positions`: a zero balance is not a row even
     when never used; a NEGATIVE balance is. */
  it('drops zero-quantity balances and keeps negative ones', () => {
    const rows = deadStockRows([
      balance({ c: 'zero', q: 0, val: 0 }),
      balance({ c: 'eps', q: 1e-9, val: 0 }),
      balance({ c: 'neg', q: -1, val: -10 }),
    ], [], '2026-02-01')
    expect(rows.map((r) => r.balance.c)).toEqual(['neg'])
  })

  /* M10-46 — the three KPIs over the derived rows. */
  it('computes all three KPIs: count, frozen value, never-used count', () => {
    const rows = deadStockRows([
      balance({ c: 'A', val: 12, last: '2025-01-01' }),
      balance({ c: 'B', val: 8, last: '2025-01-01' }),
    ], [
      movement({ id: 'ref', item_code: 'Z', date: '2026-02-01' }),
      movement({ id: 'a', item_code: 'A', out_qty: 1, type: 'Silinmə' }),
    ], '2099-01-01')
    expect(deadStockKpis(rows)).toEqual({ positions: 2, value: 20, neverUsed: 1 })
  })

  /* M10-49 — eight exact columns over the COMPLETE set (here: every derived
     row, none cut), the warehouse column through `whLabel()` (6796), value
     `toFixed(2)`, raw `last`, days, «bəli» only when never used. */
  it('exports the exact eight columns over the full set, aliasing the warehouse', () => {
    const rows = deadStockRows([
      balance({ c: 'A', w: 'Xocahəsən', val: 12, last: '2026-01-01' }),
      balance({ c: 'B', w: 'W', q: 2, val: 3, last: '2025-12-01' }),
    ], [
      movement({ id: 'ref', item_code: 'Z', date: '2026-02-01' }),
      movement({ id: 'b', item_code: 'B', out_qty: 1, type: 'Silinmə' }),
    ], '2099-01-01')
    const matrix = deadStockExportMatrix(rows)
    expect(matrix).toHaveLength(3)
    expect(matrix[0]).toEqual(['Kod', 'Mal', 'Anbar', 'Qalıq', 'Dəyər', 'Son hərəkət', 'Hərəkətsiz gün', 'Heç vaxt istifadə olunmayıb'])
    expect(matrix[1]).toEqual(['A', 'Item A', 'Xocəsən', 1, '12.00', '2026-01-01', 31, 'bəli'])
    expect(matrix[2]).toEqual(['B', 'Item A', 'W', 2, '3.00', '2025-12-01', 62, ''])
    /* The derived row itself keeps the RAW name — only the export aliases. */
    expect(rows[0].balance.w).toBe('Xocahəsən')
  })
})
