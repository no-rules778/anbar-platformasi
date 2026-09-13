import { describe, expect, it } from 'vitest'
import type { MovementRow } from '../api/itemMovements.api'
import type { WarehouseBalance } from './itemIndex'
import {
  scopeByWarehouse, dashboardKpis, warehouseValueBars, movementTypeCounts,
  topPositions, recentMovements, dashboardSubtitle, TYPE_COLOR_FALLBACK,
} from './dashboard'

/* T1 — M11-04, M11-20 … M11-25, M11-30, M11-33, M11-40, M11-42. Unit
   evidence over fixtures; nothing here is live. */

const bal = (over: Partial<WarehouseBalance>): WarehouseBalance => ({
  w: 'Ələt', c: 'A', in: 2, out: 0, n: 1, q: 2, last: '2026-01-01', first: '2026-01-01',
  price: 10, val: 20, name: 'Item A', unit: 'ədəd', ...over,
})
const mv = (over: Partial<MovementRow>): MovementRow => ({
  id: 'm', item_code: 'A', warehouse: 'Ələt', date: '2026-01-01', in_qty: 2, out_qty: 0, price: null,
  partner: '', type: 'Satınalma', invoice_num: null, note: null, doc_num: null, created_at: null, ...over,
})
const items = [{ code: 'A', name: 'Item A', unit: 'ədəd', price: 10, category: null }, { code: 'B', name: 'Item B', unit: 'ədəd', price: 0, category: null }]

describe('scopeByWarehouse — M11-20', () => {
  const B = [bal({}), bal({ w: 'Astara', c: 'B', q: 1e-9, val: 0 }), bal({ w: 'Astara', c: 'C', q: 1.1e-9 }), bal({ w: 'Astara', c: 'D', q: -0.5 }), bal({ w: 'Astara', c: 'E', q: 0 })]
  const M = [mv({}), mv({ id: 'x', warehouse: 'Astara' })]

  it('returns the same arrays by identity when no warehouse is selected', () => {
    const s = scopeByWarehouse(B, M, '')
    expect(s.bal).toBe(B)
    expect(s.movs).toBe(M)
  })

  it('filters balances and movements to the selected warehouse', () => {
    const s = scopeByWarehouse(B, M, 'Astara')
    expect(s.bal.map((b) => b.c)).toEqual(['B', 'C', 'D', 'E'])
    expect(s.movs.map((m) => m.id)).toEqual(['x'])
  })

  /* Boundary matrix: exactly 1e-9 is OUT (strict >), 1.1e-9 and −0.5 IN, 0 OUT. */
  it('pos excludes abs(q) <= 1e-9 and keeps 1.1e-9 and negatives', () => {
    const s = scopeByWarehouse(B, M, 'Astara')
    expect(s.pos.map((b) => b.c)).toEqual(['C', 'D'])
  })
})

describe('dashboardKpis — M11-21 … M11-25', () => {
  it('produces the five KPIs in order with exact labels, subs and classes (Σin > 0, priced)', () => {
    const scope = scopeByWarehouse(
      [bal({ val: 20 }), bal({ c: 'B', price: 0, val: 0, q: 3 })],
      [mv({ in_qty: 4, price: 2.5 }), mv({ id: 'o', in_qty: 0, out_qty: 1, type: 'Sahəyə' })],
      '',
    )
    const k = dashboardKpis(scope, items)
    expect(k.map((x) => [x.label, x.cls])).toEqual([
      ['Qalıq dəyəri', 'g'], ['Ümumi mədaxil', ''], ['Ümumi məxaric', 'o'], ['Satınalma məbləği', 'v'], ['Qiyməti olmayan mövqe', 'r'],
    ])
    expect(k[0].value).toBe('20,00 ₼')
    expect(k[0].sub).toBe('2 aktiv mövqe')
    expect(k[1].value).toBe('4,00')
    expect(k[1].sub).toBe('bütün dövr üzrə')
    expect(k[2].value).toBe('1,00')
    /* 1 / 4 × 100 = 25.0 — toFixed(1), dot decimal, not az-AZ. */
    expect(k[2].sub).toBe('25.0% dövriyyə')
    /* 4 × movement price 2.5 = 10. */
    expect(k[3].value).toBe('10,00 ₼')
    expect(k[3].sub).toBe('qiyməti bəlli sətirlər üzrə')
    expect(k[4].value).toBe('1')
    expect(k[4].sub).toBe('dəyərləndirmə natamamdır')
  })

  /* M11-23 boundary: Σin = 0 gives the LITERAL `0`, never `0.0`. */
  it('prints «0% dövriyyə» when nothing came in (negative control: not 0.0%)', () => {
    const k = dashboardKpis(scopeByWarehouse([], [mv({ in_qty: 0, out_qty: 3, type: 'Sahəyə' })], ''), items)
    expect(k[2].sub).toBe('0% dövriyyə')
    expect(k[2].sub).not.toBe('0.0% dövriyyə')
  })

  it('a one-decimal ratio keeps toFixed(1) rounding (2/3 → 66.7)', () => {
    const k = dashboardKpis(scopeByWarehouse([], [mv({ in_qty: 3 }), mv({ id: 'o', in_qty: 0, out_qty: 2, type: 'Sahəyə' })], ''), items)
    expect(k[2].sub).toBe('66.7% dövriyyə')
  })

  /* M11-21 — money(0) renders the em-dash; the position count is separate. */
  it('renders «—» for a zero total value while still counting positions', () => {
    const k = dashboardKpis(scopeByWarehouse([bal({ price: 0, val: 0 })], [], ''), items)
    expect(k[0].value).toBe('—')
    expect(k[0].sub).toBe('1 aktiv mövqe')
  })

  /* M11-24 — movement price first; falsy (0 / null) falls back to the ITEM
     price; a NEGATIVE movement price is truthy and is kept (Codex correction). */
  it('purchase amount: movement price → item price → 0, non-Satınalma ignored', () => {
    const movs = [
      mv({ id: 'p1', in_qty: 2, price: 7 }),            // 14 (movement price)
      mv({ id: 'p2', in_qty: 3, price: 0 }),            // 30 (item A price 10)
      mv({ id: 'p3', in_qty: 5, price: null }),         // 50 (item A price 10)
      mv({ id: 'p4', in_qty: 4, price: null, item_code: 'B' }), // 0 (item B price 0)
      mv({ id: 'p5', in_qty: 4, price: null, item_code: 'Z' }), // 0 (unknown item)
      mv({ id: 'n1', in_qty: 9, price: 100, type: 'Qaytarma' }), // ignored
    ]
    const k = dashboardKpis(scopeByWarehouse([], movs, ''), items)
    expect(k[3].value).toBe('94,00 ₼')
  })

  it('a negative movement price is preserved, not replaced by the item price', () => {
    const k = dashboardKpis(scopeByWarehouse([], [mv({ in_qty: 2, price: -3 })], ''), items)
    /* 2 × (−3) = −6, NOT 2 × 10 = 20. */
    expect(k[3].value).toBe('-6,00 ₼')
    expect(k[3].value).not.toBe('20,00 ₼')
  })

  /* M11-25 — only NON-ZERO positions count; class flips at 0/1. */
  it('priceless count excludes zero-quantity rows and flips the class and sub at zero', () => {
    const zeroOnly = dashboardKpis(scopeByWarehouse([bal({ q: 0, price: 0, val: 0 })], [], ''), items)
    expect(zeroOnly[4]).toMatchObject({ value: '0', sub: 'hamısı qiymətlidir', cls: 'g' })
    const one = dashboardKpis(scopeByWarehouse([bal({ q: 1, price: 0, val: 0 })], [], ''), items)
    expect(one[4]).toMatchObject({ value: '1', sub: 'dəyərləndirmə natamamdır', cls: 'r' })
  })
})

describe('warehouseValueBars — M11-30', () => {
  const B = [bal({ val: 10.4, q: 1 }), bal({ c: 'B', val: 0.1, q: 1e-9 }), bal({ w: 'Astara', c: 'C', val: 100.5, q: 2 })]

  it('one entry per configured warehouse, rounded value, position count, sorted descending', () => {
    expect(warehouseValueBars(['Ələt', 'Astara', 'Ofis'], B)).toEqual([
      { k: 'Astara', v: 101, sub: '1 mövqe' },
      { k: 'Ələt', v: 11, sub: '1 mövqe' },
      { k: 'Ofis', v: 0, sub: '0 mövqe' },
    ])
  })

  /* Positive control for the selector asymmetry: the bars take the UNscoped
     balances, so a scoped call and an unscoped call must be identical. */
  it('is independent of the warehouse selector', () => {
    const all = warehouseValueBars(['Ələt', 'Astara'], B)
    const scoped = warehouseValueBars(['Ələt', 'Astara'], scopeByWarehouse(B, [], '').bal)
    expect(scoped).toEqual(all)
    expect(all).toHaveLength(2)
  })
})

describe('movementTypeCounts — M11-33', () => {
  it('counts distinct types of the given rows, colours them and sorts by count descending', () => {
    const movs = [mv({}), mv({ id: 'b', type: 'Sahəyə' }), mv({ id: 'c', type: 'Sahəyə' }), mv({ id: 'd', type: 'Satış' })]
    expect(movementTypeCounts(movs)).toEqual([
      { k: 'Sahəyə', v: 2, color: '#B06A11' },
      { k: 'Satınalma', v: 1, color: '#0E7C6B' },
      { k: 'Satış', v: 1, color: TYPE_COLOR_FALLBACK },
    ])
  })

  it('returns an empty list for no rows', () => {
    expect(movementTypeCounts([])).toEqual([])
  })
})

describe('topPositions — M11-40', () => {
  it('sorts by value descending and caps at 10', () => {
    const pos = Array.from({ length: 11 }, (_, i) => bal({ c: 'P' + i, val: i }))
    const top = topPositions(pos)
    expect(top).toHaveLength(10)
    expect(top.map((b) => b.val)).toEqual([10, 9, 8, 7, 6, 5, 4, 3, 2, 1])
    expect(top.find((b) => b.val === 0)).toBeUndefined()
  })

  it('renders all when fewer than 10 and does not mutate the input', () => {
    const pos = [bal({ c: 'x', val: 1 }), bal({ c: 'y', val: 5 })]
    expect(topPositions(pos).map((b) => b.c)).toEqual(['y', 'x'])
    expect(pos.map((b) => b.c)).toEqual(['x', 'y'])
  })
})

describe('recentMovements — M11-42', () => {
  it('orders by created_at DESC, then date DESC, and caps at 10', () => {
    const movs = [
      mv({ id: 'old-ts', date: '2026-03-01', created_at: '2026-01-01T00:00:00Z' }),
      mv({ id: 'new-ts', date: '2026-01-01', created_at: '2026-02-01T00:00:00Z' }),
      mv({ id: 'no-ts-late', date: '2026-05-01', created_at: null }),
      mv({ id: 'no-ts-early', date: '2026-04-01', created_at: 'not a date' }),
    ]
    /* Timestamps win over dates; the two zero-timestamp rows fall to date desc. */
    expect(recentMovements(movs).map((m) => m.id)).toEqual(['new-ts', 'old-ts', 'no-ts-late', 'no-ts-early'])
    const many = Array.from({ length: 11 }, (_, i) => mv({ id: 'r' + i, created_at: `2026-01-${String(i + 1).padStart(2, '0')}T00:00:00Z` }))
    expect(recentMovements(many)).toHaveLength(10)
    expect(recentMovements(many)[0].id).toBe('r10')
  })
})

describe('dashboardSubtitle — M11-04', () => {
  const all = [mv({ date: '2026-01-05' }), mv({ id: 'b', warehouse: 'Astara', date: '2026-02-09' })]

  it('uses the newest date over ALL warehouses while counting the SCOPED rows, and prints w raw', () => {
    const scope = scopeByWarehouse([], all, 'Ələt')
    expect(scope.movs).toHaveLength(1)
    expect(dashboardSubtitle('Ələt', all, scope.movs)).toBe('Ələt · son əməliyyat tarixi 2026-02-09 · 1 hərəkət qeydi')
  })

  it('prints «Bütün anbarlar» and the full count when nothing is selected', () => {
    expect(dashboardSubtitle('', all, all)).toBe('Bütün anbarlar · son əməliyyat tarixi 2026-02-09 · 2 hərəkət qeydi')
  })

  it('prints «—» when there is no operational movement', () => {
    expect(dashboardSubtitle('', [], [])).toBe('Bütün anbarlar · son əməliyyat tarixi — · 0 hərəkət qeydi')
  })

  it('does not alias the warehouse name (Xocahəsən stays raw)', () => {
    expect(dashboardSubtitle('Xocahəsən', [], [])).toContain('Xocahəsən ·')
  })
})
