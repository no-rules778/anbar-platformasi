import { describe, it, expect } from 'vitest'
import { buildItemIndexes } from './itemIndex'
import type { MovementRow } from '../api/itemMovements.api'
import type { ItemRow } from '../api/items.api'

const item = (over: Partial<ItemRow> = {}): ItemRow => ({
  code: '0000001', name: 'Sement', unit: 'kq', price: 10, category: null, ...over,
})

const mv = (over: Partial<MovementRow> = {}): MovementRow => ({
  id: 'm1', item_code: '0000001', warehouse: 'Elet', date: '2026-01-01',
  in_qty: 0, out_qty: 0, price: null, partner: null, type: 'Satınalma',
  invoice_num: null, note: null, doc_num: null, created_at: null, ...over,
})

/* M5-03…M5-06, M5-22, M5-23 — index() (index.html:1272-1317). */

describe('buildItemIndexes — byItem (M5-04…M5-06)', () => {
  it('sums in/out and counts movements per item', () => {
    const { byItem } = buildItemIndexes([item()], [
      mv({ id: 'a', in_qty: 10 }),
      mv({ id: 'b', out_qty: 4 }),
    ])
    const bi = byItem.get('0000001')!
    expect(bi.in).toBe(10)
    expect(bi.out).toBe(4)
    expect(bi.q).toBe(6)
    expect(bi.n).toBe(2)
  })

  /* R-F2: the original rounds to 4 decimals BEFORE display. A naive float
     subtraction leaves 0.30000000000000004-style drift; this case fails
     against an implementation that skips the toFixed(4). */
  it('rounds q to 4 decimals — a naive float subtraction diverges', () => {
    const { byItem } = buildItemIndexes([item()], [
      mv({ id: 'a', in_qty: 0.3 }),
      mv({ id: 'b', out_qty: 0.1 }),
    ])
    const naive = 0.3 - 0.1
    expect(naive).not.toBe(0.2)
    expect(byItem.get('0000001')!.q).toBe(0.2)
  })

  it('rounds a repeating remainder to exactly 4 decimals', () => {
    const { byItem } = buildItemIndexes([item()], [mv({ in_qty: 1 / 3 })])
    expect(byItem.get('0000001')!.q).toBe(0.3333)
  })

  /* M5-05: the value uses the ITEM's price (1313), not the movement's. */
  it('values stock at the ITEM price, ignoring the movement price', () => {
    const { byItem } = buildItemIndexes([item({ price: 10 })], [
      mv({ in_qty: 5, price: 999 }),
    ])
    const bi = byItem.get('0000001')!
    expect(bi.price).toBe(10)
    expect(bi.val).toBe(50)
  })

  it('treats a null item price as 0 for valuation', () => {
    const { byItem } = buildItemIndexes([item({ price: null })], [mv({ in_qty: 5 })])
    expect(byItem.get('0000001')!.price).toBe(0)
    expect(byItem.get('0000001')!.val).toBe(0)
  })

  it('treats null quantities as 0 rather than NaN', () => {
    const { byItem } = buildItemIndexes([item()], [mv({ in_qty: null, out_qty: null })])
    const bi = byItem.get('0000001')!
    expect(bi.q).toBe(0)
    expect(Number.isNaN(bi.q)).toBe(false)
  })

  it('tracks the latest movement date', () => {
    const { byItem } = buildItemIndexes([item()], [
      mv({ id: 'a', date: '2026-01-01' }),
      mv({ id: 'b', date: '2026-03-05' }),
      mv({ id: 'c', date: '2026-02-02' }),
    ])
    expect(byItem.get('0000001')!.last).toBe('2026-03-05')
  })

  it('omits an item that has no movements at all — the nomv filter depends on absence', () => {
    const { byItem } = buildItemIndexes([item(), item({ code: '0000002' })], [mv({ in_qty: 1 })])
    expect(byItem.has('0000001')).toBe(true)
    expect(byItem.has('0000002')).toBe(false)
  })
})

describe('buildItemIndexes — cancellation (M5-03)', () => {
  /* An item whose only movements are cancelled must look like an item with
     NO movements, so it appears under «Hərəkəti yox». */
  it('drops a cancelled document and its reversal, leaving the item movement-less', () => {
    const { byItem, operational } = buildItemIndexes([item()], [
      mv({ id: 'a', in_qty: 10, doc_num: 'D-1' }),
      mv({ id: 'b', out_qty: 10, doc_num: 'D-2', note: 'Ləğv: D-1' }),
    ])
    expect(operational).toHaveLength(0)
    expect(byItem.has('0000001')).toBe(false)
  })

  it('drops a legacy id-based cancellation pair', () => {
    const { byItem } = buildItemIndexes([item()], [
      mv({ id: 'a', in_qty: 10 }),
      mv({ id: 'b', out_qty: 10, note: 'Ləğv ID: a' }),
    ])
    expect(byItem.has('0000001')).toBe(false)
  })

  it('keeps an uncancelled movement alongside a cancelled one', () => {
    const { byItem } = buildItemIndexes([item()], [
      mv({ id: 'a', in_qty: 10, doc_num: 'D-1' }),
      mv({ id: 'b', out_qty: 10, doc_num: 'D-2', note: 'Ləğv: D-1' }),
      mv({ id: 'c', in_qty: 7, doc_num: 'D-3' }),
    ])
    expect(byItem.get('0000001')!.q).toBe(7)
    expect(byItem.get('0000001')!.n).toBe(1)
  })
})

describe('buildItemIndexes — bal (M5-22)', () => {
  it('splits one item across two warehouses', () => {
    const { bal } = buildItemIndexes([item()], [
      mv({ id: 'a', warehouse: 'Elet', in_qty: 10 }),
      mv({ id: 'b', warehouse: 'Astara', in_qty: 4 }),
      mv({ id: 'c', warehouse: 'Elet', out_qty: 3 }),
    ])
    const elet = bal.find((b) => b.w === 'Elet')!
    const astara = bal.find((b) => b.w === 'Astara')!
    expect(elet.q).toBe(7)
    expect(elet.n).toBe(2)
    expect(astara.q).toBe(4)
  })

  it('rounds per-warehouse q to 4 decimals as well', () => {
    const { bal } = buildItemIndexes([item()], [
      mv({ id: 'a', in_qty: 0.3 }),
      mv({ id: 'b', out_qty: 0.1 }),
    ])
    expect(bal[0].q).toBe(0.2)
  })

  it('fills the Phase 9 warehouse metadata from movement dates and the item catalogue', () => {
    const { bal } = buildItemIndexes([item({ name: 'Kataloq adı', unit: 'metr', price: 7.25 })], [
      mv({ id: 'a', date: '2026-03-05', in_qty: 3, price: 999 }),
      mv({ id: 'b', date: '2026-01-02', out_qty: 1, price: 888 }),
      mv({ id: 'c', date: '2026-02-04', in_qty: 0.33336 }),
    ])
    expect(bal[0]).toEqual({
      w: 'Elet', c: '0000001', in: 3.33336, out: 1, n: 3, q: 2.3334,
      last: '2026-03-05', first: '2026-01-02', price: 7.25,
      val: 2.3334 * 7.25, name: 'Kataloq adı', unit: 'metr',
    })
  })

  it('uses the exact legacy fallback for a movement whose item is absent', () => {
    const { bal } = buildItemIndexes([], [mv({ item_code: 'MISSING', in_qty: 2, price: 99 })])
    expect(bal[0]).toMatchObject({
      c: 'MISSING', price: 0, val: 0,
      name: '(nomenklaturada yoxdur: MISSING)', unit: '',
    })
  })
})

describe('buildItemIndexes — priceObs (M5-23)', () => {
  /* index.html:1283 records an observation only when m.pr > 0. */
  it('records an observation only for a POSITIVE movement price', () => {
    const { priceObs } = buildItemIndexes([item()], [
      mv({ id: 'a', in_qty: 1, price: 12, date: '2026-01-01', partner: 'ACME' }),
      mv({ id: 'b', in_qty: 1, price: 0 }),
      mv({ id: 'c', in_qty: 1, price: null }),
    ])
    const obs = priceObs.get('0000001')!
    expect(obs).toHaveLength(1)
    expect(obs[0]).toEqual({ p: 12, d: '2026-01-01', k: 'ACME' })
  })

  it('has no entry at all for an item that never had a priced movement', () => {
    const { priceObs } = buildItemIndexes([item()], [mv({ in_qty: 1, price: 0 })])
    expect(priceObs.has('0000001')).toBe(false)
  })

  it('renders a missing partner as an empty counterparty, not null', () => {
    const { priceObs } = buildItemIndexes([item()], [mv({ in_qty: 1, price: 5, partner: null })])
    expect(priceObs.get('0000001')![0].k).toBe('')
  })

  it('excludes observations from cancelled movements', () => {
    const { priceObs } = buildItemIndexes([item()], [
      mv({ id: 'a', in_qty: 1, price: 12, doc_num: 'D-1' }),
      mv({ id: 'b', out_qty: 1, price: 12, doc_num: 'D-2', note: 'Ləğv: D-1' }),
    ])
    expect(priceObs.has('0000001')).toBe(false)
  })
})
