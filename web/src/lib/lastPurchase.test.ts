import { describe, it, expect } from 'vitest'
import { purchaseTimestamp, laterPurchase, buildLastPurchaseMap } from './lastPurchase'
import type { MovementRow } from '../api/itemMovements.api'

function mv(p: Partial<MovementRow>): MovementRow {
  return {
    id: 'm1',
    item_code: 'C1',
    warehouse: 'Ələt',
    date: '2026-01-01',
    in_qty: 1,
    out_qty: 0,
    price: 10,
    partner: 'P',
    type: 'Satınalma',
    invoice_num: null,
    note: null,
    doc_num: null,
    created_at: '2026-01-01T10:00:00Z',
    ...p,
  }
}

/* M6-S10 / Q1 — the correction that motivated this module. */
describe('purchaseTimestamp (M6-S10)', () => {
  it('converts an ISO string to epoch ms', () => {
    expect(purchaseTimestamp('2026-01-01T10:00:00Z')).toBe(Date.parse('2026-01-01T10:00:00Z'))
  })

  it('treats null as unavailable', () => {
    expect(purchaseTimestamp(null)).toBeNull()
    expect(purchaseTimestamp(undefined)).toBeNull()
  })

  it('treats a malformed timestamp as unavailable, not as 0', () => {
    expect(purchaseTimestamp('not-a-date')).toBeNull()
    expect(purchaseTimestamp('')).toBeNull()
  })

  /* The whole point: the legacy guard is Number.isFinite(m.ts) against a
     NUMBER. Applied to the string Supabase returns it is false for every row,
     which would silently disable tie-break level 2. */
  it('would have been rejected by a naive Number.isFinite on the raw string', () => {
    const raw = '2026-01-01T10:00:00Z'
    expect(Number.isFinite(raw as unknown as number)).toBe(false)
    expect(purchaseTimestamp(raw)).not.toBeNull()
  })
})

describe('laterPurchase — three tie-break levels (M6-05)', () => {
  const base = { d: '2026-01-01', ts: 1000, id: 'b' }

  it('1) a later date wins regardless of timestamp or id', () => {
    expect(laterPurchase({ d: '2026-02-01', ts: 1, id: 'a' }, base)).toBe(true)
    expect(laterPurchase({ d: '2025-12-01', ts: 9999, id: 'z' }, base)).toBe(false)
  })

  it('2) equal dates — the later valid timestamp wins', () => {
    expect(laterPurchase({ d: '2026-01-01', ts: 2000, id: 'a' }, base)).toBe(true)
    expect(laterPurchase({ d: '2026-01-01', ts: 500, id: 'z' }, base)).toBe(false)
  })

  it('2) a row WITH a valid timestamp beats one without', () => {
    expect(laterPurchase({ d: '2026-01-01', ts: 1, id: 'a' }, { d: '2026-01-01', ts: null, id: 'z' })).toBe(true)
    expect(laterPurchase({ d: '2026-01-01', ts: null, id: 'z' }, { d: '2026-01-01', ts: 1, id: 'a' })).toBe(false)
  })

  it('3) equal date and timestamp — the greater string id wins', () => {
    expect(laterPurchase({ d: '2026-01-01', ts: 1000, id: 'c' }, base)).toBe(true)
    expect(laterPurchase({ d: '2026-01-01', ts: 1000, id: 'a' }, base)).toBe(false)
  })

  it('3) both timestamps missing — falls through to the id', () => {
    const prev = { d: '2026-01-01', ts: null, id: 'b' }
    expect(laterPurchase({ d: '2026-01-01', ts: null, id: 'c' }, prev)).toBe(true)
    expect(laterPurchase({ d: '2026-01-01', ts: null, id: 'a' }, prev)).toBe(false)
  })

  it('compares ids as strings, not numbers (the original uses String())', () => {
    const prev = { d: '2026-01-01', ts: null, id: '9' }
    // '10' < '9' as strings, even though 10 > 9 numerically
    expect(laterPurchase({ d: '2026-01-01', ts: null, id: '10' }, prev)).toBe(false)
  })
})

describe('buildLastPurchaseMap (M6-04, M6-06, M6-S9)', () => {
  it('keeps only the global latest purchase per code, across warehouses', () => {
    const map = buildLastPurchaseMap([
      mv({ id: 'a', item_code: 'C1', warehouse: 'Ələt', date: '2026-01-01', price: 10 }),
      mv({ id: 'b', item_code: 'C1', warehouse: 'Astara', date: '2026-03-01', price: 25 }),
    ])
    expect(map.get('C1')?.price).toBe(25)
  })

  it('ignores non-Satınalma rows', () => {
    const map = buildLastPurchaseMap([
      mv({ id: 'a', date: '2026-01-01', price: 10 }),
      mv({ id: 'b', date: '2026-05-01', price: 99, type: 'Silinmə' }),
    ])
    expect(map.get('C1')?.price).toBe(10)
  })

  it('ignores null, zero, negative and non-numeric prices', () => {
    const map = buildLastPurchaseMap([
      mv({ id: 'a', date: '2026-01-01', price: 10 }),
      mv({ id: 'b', date: '2026-02-01', price: null }),
      mv({ id: 'c', date: '2026-03-01', price: 0 }),
      mv({ id: 'd', date: '2026-04-01', price: -5 }),
      mv({ id: 'e', date: '2026-05-01', price: Number.NaN }),
    ])
    expect(map.get('C1')?.price).toBe(10)
  })

  it('excludes cancelled movements (M6-06)', () => {
    const map = buildLastPurchaseMap([
      mv({ id: 'a', date: '2026-01-01', price: 10, doc_num: 'D1' }),
      mv({ id: 'b', date: '2026-06-01', price: 77, doc_num: 'D2' }),
      // cancels D2, and hides itself
      mv({ id: 'c', date: '2026-06-02', price: 77, doc_num: 'D3', note: 'Ləğv: D2' }),
    ])
    expect(map.get('C1')?.price).toBe(10)
  })

  it('never falls back to items.price — an item with no valid purchase is absent (M6-S9)', () => {
    const map = buildLastPurchaseMap([mv({ item_code: 'C9', price: 0 })])
    expect(map.has('C9')).toBe(false)
  })

  it('uses created_at to break a same-date tie (M6-39 end to end)', () => {
    const map = buildLastPurchaseMap([
      mv({ id: 'a', date: '2026-01-01', price: 10, created_at: '2026-01-01T08:00:00Z' }),
      mv({ id: 'b', date: '2026-01-01', price: 20, created_at: '2026-01-01T18:00:00Z' }),
    ])
    expect(map.get('C1')?.price).toBe(20)
  })

  it('falls back to the id when created_at is malformed on both rows', () => {
    const map = buildLastPurchaseMap([
      mv({ id: 'a', date: '2026-01-01', price: 10, created_at: 'garbage' }),
      mv({ id: 'b', date: '2026-01-01', price: 20, created_at: null }),
    ])
    expect(map.get('C1')?.price).toBe(20) // 'b' > 'a'
  })
})
