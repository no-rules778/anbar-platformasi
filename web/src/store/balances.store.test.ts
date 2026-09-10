import { describe, it, expect, vi, beforeEach } from 'vitest'

const fetchBalancesSnapshot = vi.fn()
vi.mock('../api/balancesSnapshot.api', () => ({
  fetchBalancesSnapshot: () => fetchBalancesSnapshot(),
}))

import {
  useBalancesStore,
  __resetBalancesRequestSeq,
  EMPTY_BALANCE_FILTERS,
  isInitialView,
  toConditionMap,
} from './balances.store'
import type { MovementRow } from '../api/itemMovements.api'
import type { StockConditionRow } from '../api/stockConditions.api'

/* T4 — M9-06, M9-12, M9-20, M9-57, M9-101, M9-105, M9-133. The snapshot API
   is mocked; nothing here is live evidence. */

const mv = (over: Partial<MovementRow> = {}): MovementRow => ({
  id: 'm1', item_code: '0000001', warehouse: 'Ələt', date: '2026-09-01',
  in_qty: 10, out_qty: 0, price: 2, partner: 'Azpetrol', type: 'Satınalma',
  invoice_num: null, note: null, doc_num: null, created_at: '2026-09-01T10:00:00Z',
  channel: null, contract_num: null, created_by: null, ...over,
})

const cond = (over: Partial<StockConditionRow> = {}): StockConditionRow => ({
  w: 'Ələt', c: '0000001', unfit: 1, repair: 0, onsite: 0, icare: 0, note: 'n', ...over,
})

function snapshot(over: Record<string, unknown> = {}) {
  return {
    ok: true as const,
    snapshot: {
      movements: [mv()],
      items: [{ code: '0000001', name: 'Nasos', unit: 'ədəd', price: 5, category: null }],
      warehouses: ['Ələt', 'Astara'],
      conditions: [cond()],
      ...over,
    },
  }
}

/** A promise this test controls the resolution of. */
function deferred<T>() {
  let resolve!: (v: T) => void
  const promise = new Promise<T>((r) => { resolve = r })
  return { promise, resolve }
}

beforeEach(() => {
  vi.clearAllMocks()
  __resetBalancesRequestSeq()
  useBalancesStore.setState({
    movements: [], items: [], warehouses: [],
    indexes: { byItem: new Map(), bal: [], priceObs: new Map(), operational: [] },
    conds: new Map(),
    loading: false, error: null, loaded: false,
    filters: EMPTY_BALANCE_FILTERS, showAll: false,
  })
})

const store = () => useBalancesStore.getState()

describe('load', () => {
  it('applies the snapshot atomically and marks the screen loaded', async () => {
    fetchBalancesSnapshot.mockResolvedValue(snapshot())
    const res = await store().load()
    expect(res).toEqual({ ok: true, error: null })
    expect(store().movements).toHaveLength(1)
    expect(store().items).toHaveLength(1)
    expect(store().warehouses).toEqual(['Ələt', 'Astara'])
    expect(store().indexes.bal).toHaveLength(1)
    expect(store().conds.get('Ələt|0000001')).toEqual(cond())
    expect(store().loaded).toBe(true)
    expect(store().loading).toBe(false)
    expect(store().error).toBeNull()
  })

  /* M9-20 — balances derive from operationalMovements() ONLY. A cancelled
     document and its «Ləğv:» reversal must both leave the arithmetic, while
     `movements` keeps them raw.

     MUTATION: indexing the raw rows. The cancelled 10 and the reversing −10
     would then both count — net zero by accident here, so the fixture uses an
     UNBALANCED history that only excludeCancelled() can make right. */
  it('derives IX.bal and the operational source through excludeCancelled (M9-20, M9-71)', async () => {
    fetchBalancesSnapshot.mockResolvedValue(snapshot({
      movements: [
        mv({ id: 'a', doc_num: 'D-1', in_qty: 10 }),
        /* An operational 3 in a different document. */
        mv({ id: 'c', doc_num: 'D-2', in_qty: 3 }),
        /* The reversal of D-1 — hides D-1 and itself. Deliberately NOT the
           exact inverse, so raw and operational differ and the test can tell
           which one the store used. */
        mv({ id: 'b', doc_num: 'D-1-C', note: 'Ləğv: D-1', out_qty: 4, in_qty: 0 }),
      ],
    }))
    await store().load()
    expect(store().movements).toHaveLength(3)
    /* Operational: only `c`. */
    expect(store().indexes.operational.map((m) => m.id)).toEqual(['c'])
    expect(store().indexes.bal[0].q).toBe(3)
  })

  it('accepts a snapshot whose condition set is empty (M9-13)', async () => {
    fetchBalancesSnapshot.mockResolvedValue(snapshot({ conditions: [] }))
    await store().load()
    expect(store().loaded).toBe(true)
    expect(store().error).toBeNull()
    expect(store().conds.size).toBe(0)
  })
})

/* M9-105 / D-J1 — COMPLETE replacement of the condition map, INCLUDING the
   removal of records the newest snapshot no longer carries. */
describe('the condition map is replaced whole on every successful snapshot (M9-105)', () => {
  it('removes a record absent from the newest read and adds a new one', async () => {
    fetchBalancesSnapshot.mockResolvedValue(snapshot({
      conditions: [cond({ c: '0000001' }), cond({ c: '0000002' })],
    }))
    await store().load()
    expect([...store().conds.keys()].sort()).toEqual(['Ələt|0000001', 'Ələt|0000002'])

    fetchBalancesSnapshot.mockResolvedValue(snapshot({
      conditions: [cond({ c: '0000002', unfit: 9 }), cond({ c: '0000003' })],
    }))
    await store().load()
    /* 0000001 is GONE, 0000002 is UPDATED, 0000003 is NEW. */
    expect([...store().conds.keys()].sort()).toEqual(['Ələt|0000002', 'Ələt|0000003'])
    expect(store().conds.get('Ələt|0000002')?.unfit).toBe(9)
  })

  it('produces a new Map identity on each load, so subscribers re-render', async () => {
    fetchBalancesSnapshot.mockResolvedValue(snapshot())
    await store().load()
    const first = store().conds
    await store().load()
    expect(store().conds).not.toBe(first)
  })

  it('toConditionMap keys by warehouse|code and keeps the note', () => {
    const m = toConditionMap([cond({ w: 'Astara', c: 'X', note: 'qeyd' })])
    expect(m.get('Astara|X')).toMatchObject({ note: 'qeyd', w: 'Astara', c: 'X' })
  })
})

/* M9-12 — a failed refresh retains the previous snapshot WHOLE. */
describe('a failed refresh keeps the previous snapshot (M9-12)', () => {
  it('keeps movements, indexes, warehouses, conds and loaded after a failure', async () => {
    fetchBalancesSnapshot.mockResolvedValue(snapshot())
    await store().load()
    const before = { indexes: store().indexes, conds: store().conds, movements: store().movements }

    fetchBalancesSnapshot.mockResolvedValue({ ok: false, error: 'şəbəkə xətası' })
    const res = await store().load()

    expect(res).toEqual({ ok: false, error: 'şəbəkə xətası' })
    expect(store().movements).toBe(before.movements)
    expect(store().indexes).toBe(before.indexes)
    expect(store().conds).toBe(before.conds)
    expect(store().conds.size).toBe(1)
    expect(store().warehouses).toEqual(['Ələt', 'Astara'])
    expect(store().loaded).toBe(true)
    expect(store().error).toBe('şəbəkə xətası')
    expect(store().loading).toBe(false)
  })

  /* D-J1 at the store level: a FAILED condition read arrives as ok:false and
     lands on this path — the previously displayed markers stay, unchanged. */
  it('a failed condition read (ok:false) does not blank the markers on screen', async () => {
    fetchBalancesSnapshot.mockResolvedValue(snapshot({ conditions: [cond({ unfit: 4 })] }))
    await store().load()
    fetchBalancesSnapshot.mockResolvedValue({ ok: false, error: 'Mal vəziyyəti işarələri yüklənmədi' })
    await store().load()
    expect(store().conds.get('Ələt|0000001')?.unfit).toBe(4)
    expect(store().error).toBe('Mal vəziyyəti işarələri yüklənmədi')
  })

  it('clears the error once a later load succeeds', async () => {
    fetchBalancesSnapshot.mockResolvedValue({ ok: false, error: 'boom' })
    await store().load()
    expect(store().error).toBe('boom')
    fetchBalancesSnapshot.mockResolvedValue(snapshot())
    await store().load()
    expect(store().error).toBeNull()
  })

  it('a first-ever failure leaves loaded false, so the page shows a real error state', async () => {
    fetchBalancesSnapshot.mockResolvedValue({ ok: false, error: 'boom' })
    await store().load()
    expect(store().loaded).toBe(false)
    expect(store().movements).toEqual([])
    expect(store().conds.size).toBe(0)
  })
})

/* M9-133 — monotonic request sequencing, with overlapping requests. */
describe('out-of-order responses cannot regress the view (M9-133)', () => {
  /* POSITIVE CONTROL: the NEWEST response really can update the state. Without
     this, the two discard tests below could pass against a store that ignores
     every response. */
  it('control: the newest of two overlapping loads applies its data', async () => {
    const slow = deferred<unknown>()
    const fast = deferred<unknown>()
    fetchBalancesSnapshot.mockReturnValueOnce(slow.promise).mockReturnValueOnce(fast.promise)

    const first = store().load()
    const second = store().load()

    fast.resolve(snapshot({ movements: [mv({ id: 'NEW' })] }))
    await second
    expect(store().movements.map((r) => r.id)).toEqual(['NEW'])
    expect(store().loading).toBe(false)

    slow.resolve(snapshot({ movements: [mv({ id: 'OLD' })] }))
    await first
  })

  /* MUTATION: the `reqId !== requestSeq` guard removed. The FIRST load
     resolves LAST here, so without the guard the older rows would win. */
  it('discards a stale success that resolves after a newer one', async () => {
    const slow = deferred<unknown>()
    const fast = deferred<unknown>()
    fetchBalancesSnapshot.mockReturnValueOnce(slow.promise).mockReturnValueOnce(fast.promise)

    const first = store().load()
    const second = store().load()

    fast.resolve(snapshot({ movements: [mv({ id: 'NEW' })], conditions: [cond({ unfit: 7 })] }))
    await second
    slow.resolve(snapshot({ movements: [mv({ id: 'OLD' }), mv({ id: 'OLD2' })], conditions: [cond({ unfit: 1 })] }))
    await first

    expect(store().movements.map((r) => r.id)).toEqual(['NEW'])
    /* The condition map too — a stale reply must not roll the markers back. */
    expect(store().conds.get('Ələt|0000001')?.unfit).toBe(7)
  })

  /* MUTATION: the stale branch still writing the error. */
  it('a stale failure does not raise an error over newer good data', async () => {
    const slow = deferred<unknown>()
    const fast = deferred<unknown>()
    fetchBalancesSnapshot.mockReturnValueOnce(slow.promise).mockReturnValueOnce(fast.promise)

    const first = store().load()
    const second = store().load()

    fast.resolve(snapshot())
    await second
    slow.resolve({ ok: false, error: 'stale boom' })
    const res = await first

    expect(res).toEqual({ ok: false, error: 'stale boom' })
    expect(store().error).toBeNull()
    expect(store().movements).toHaveLength(1)
    expect(store().loaded).toBe(true)
  })

  /* MUTATION: the stale branch calling `set({ loading: false })`. */
  it('a stale reply does not settle the loading flag owned by the newer request', async () => {
    const slow = deferred<unknown>()
    const fast = deferred<unknown>()
    fetchBalancesSnapshot.mockReturnValueOnce(slow.promise).mockReturnValueOnce(fast.promise)

    const first = store().load()
    const second = store().load()

    slow.resolve(snapshot())
    await first
    expect(store().loading).toBe(true)

    /* And a stale FAILURE does not settle it either. */
    fast.resolve(snapshot())
    await second
    expect(store().loading).toBe(false)
  })

  it('loading belongs only to the newest request — a stale failure leaves it true', async () => {
    const slow = deferred<unknown>()
    const fast = deferred<unknown>()
    fetchBalancesSnapshot.mockReturnValueOnce(slow.promise).mockReturnValueOnce(fast.promise)

    const first = store().load()
    const second = store().load()

    slow.resolve({ ok: false, error: 'stale boom' })
    await first
    expect(store().loading).toBe(true)
    expect(store().error).toBeNull()

    fast.resolve(snapshot())
    await second
    expect(store().loading).toBe(false)
  })
})

describe('filters (M9-06, M9-57)', () => {
  it('starts as the legacy BF defaults', () => {
    expect(store().filters).toEqual({ q: '', w: '', z: 'act', sort: 'val', initMode: 'initial', cond: '' })
    expect(isInitialView(store().filters)).toBe(false)
  })

  it('patches one filter without disturbing the others', () => {
    store().setFilters({ w: 'Ələt' })
    store().setFilters({ cond: 'any' })
    store().setFilters({ z: 'init', initMode: 'current' })
    expect(store().filters).toMatchObject({ w: 'Ələt', cond: 'any', z: 'init', initMode: 'current', sort: 'val' })
    expect(isInitialView(store().filters)).toBe(true)
  })

  /* M9-57 — SHOW_ALL['bal'] is sticky: once expanded it survives filter
     changes (1679-1687).

     MUTATION: `setFilters` resetting showAll. */
  it('a filter change does NOT collapse an expanded list', () => {
    store().setShowAll(true)
    store().setFilters({ q: 'nasos' })
    store().setFilters({ w: '__sum' })
    store().setFilters({ z: 'zero' })
    expect(store().showAll).toBe(true)
  })

  it('showAll can be set back to false explicitly', () => {
    store().setShowAll(true)
    store().setShowAll(false)
    expect(store().showAll).toBe(false)
  })

  /* M9-06 — state is store-held, so it survives a page unmount/remount by
     construction; a fresh read of the store after "navigation" sees it. */
  it('survives outside any component lifetime', () => {
    store().setFilters({ q: 'x', w: 'Astara', sort: 'name' })
    expect(useBalancesStore.getState().filters).toMatchObject({ q: 'x', w: 'Astara', sort: 'name' })
  })
})

describe('applyConditionResult (M9-101, M9-105)', () => {
  it('a row replaces the local entry', () => {
    store().applyConditionResult('Ələt', '0000001', cond({ unfit: 3 }))
    expect(store().conds.get('Ələt|0000001')?.unfit).toBe(3)
  })

  it('null removes the local entry (DELETE or empty response)', () => {
    store().applyConditionResult('Ələt', '0000001', cond())
    store().applyConditionResult('Ələt', '0000001', null)
    expect(store().conds.has('Ələt|0000001')).toBe(false)
  })

  it('touches only the addressed key', () => {
    store().applyConditionResult('Ələt', 'A', cond({ c: 'A' }))
    store().applyConditionResult('Astara', 'A', cond({ w: 'Astara', c: 'A', unfit: 5 }))
    store().applyConditionResult('Ələt', 'A', null)
    expect(store().conds.has('Ələt|A')).toBe(false)
    expect(store().conds.get('Astara|A')?.unfit).toBe(5)
  })

  it('always produces a new Map identity', () => {
    const before = store().conds
    store().applyConditionResult('Ələt', '0000001', cond())
    expect(store().conds).not.toBe(before)
  })
})
