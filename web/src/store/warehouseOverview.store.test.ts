import { beforeEach, describe, expect, it, vi } from 'vitest'

const fetchWarehouseOverviewSnapshot = vi.fn()
vi.mock('../api/warehouseOverviewSnapshot.api', () => ({
  fetchWarehouseOverviewSnapshot: () => fetchWarehouseOverviewSnapshot(),
}))

import { useWarehouseOverviewStore } from './warehouseOverview.store'
import type { MovementRow } from '../api/itemMovements.api'

/* T2 — M10-11, M10-12, M10-14, M10-15 and the stale-reply ordering. The
   snapshot API is mocked; nothing here is live evidence. */

const mv = (over: Partial<MovementRow> = {}): MovementRow => ({
  id: 'm1', item_code: '0000001', warehouse: 'Ələt', date: '2026-09-01',
  in_qty: 10, out_qty: 0, price: 2, partner: 'Azpetrol', type: 'Satınalma',
  invoice_num: null, note: null, doc_num: null, created_at: '2026-09-01T10:00:00Z',
  channel: null, contract_num: null, created_by: null, ...over,
})

const LOCATIONS = [
  { id: 1, name: 'Ələt', type: 'anbar', active: true },
  { id: 2, name: 'Layihə X', type: 'layihə', active: false },
]

function snapshot(over: Record<string, unknown> = {}) {
  return {
    ok: true as const,
    snapshot: {
      movements: [mv()],
      items: [{ code: '0000001', name: 'Nasos', unit: 'ədəd', price: 5, category: null }],
      locations: LOCATIONS,
      ...over,
    },
  }
}

function deferred<T>() {
  let resolve!: (v: T) => void
  const promise = new Promise<T>((r) => { resolve = r })
  return { promise, resolve }
}

const EMPTY_INDEXES = { byItem: new Map(), bal: [], priceObs: new Map(), operational: [] }

beforeEach(() => {
  vi.clearAllMocks()
  useWarehouseOverviewStore.setState({
    movements: [], items: [], locations: [], indexes: EMPTY_INDEXES,
    loading: false, loaded: false, error: null,
  })
})

const store = () => useWarehouseOverviewStore.getState()

describe('load — success', () => {
  it('applies the snapshot atomically: rows, locations (inactive kept), indexes, loaded, no error', async () => {
    fetchWarehouseOverviewSnapshot.mockResolvedValue(snapshot())
    await store().load()
    expect(store().movements).toHaveLength(1)
    expect(store().items).toHaveLength(1)
    expect(store().locations).toEqual(LOCATIONS)
    expect(store().indexes.bal).toHaveLength(1)
    expect(store().indexes.bal[0]).toMatchObject({ w: 'Ələt', c: '0000001', q: 10, val: 50 })
    expect(store().loaded).toBe(true)
    expect(store().loading).toBe(false)
    expect(store().error).toBeNull()
  })

  /* M10-14 / M10-15 — the indexes come from the SHARED `buildItemIndexes()`,
     which applies `excludeCancelled()` first. The reversal is deliberately
     NOT the exact inverse so raw and operational differ and the test can
     tell which set the store indexed. MUTATION: indexing the raw rows gives
     q = 10 + 3 − 4 = 9 and three operational rows. */
  it('derives balances and the operational set through excludeCancelled (M10-14)', async () => {
    fetchWarehouseOverviewSnapshot.mockResolvedValue(snapshot({
      movements: [
        mv({ id: 'a', doc_num: 'D-1', in_qty: 10 }),
        mv({ id: 'c', doc_num: 'D-2', in_qty: 3 }),
        mv({ id: 'b', doc_num: 'D-1-C', note: 'Ləğv: D-1', out_qty: 4, in_qty: 0 }),
      ],
    }))
    await store().load()
    expect(store().movements).toHaveLength(3)
    expect(store().indexes.operational.map((m) => m.id)).toEqual(['c'])
    expect(store().indexes.bal[0].q).toBe(3)
  })

  it('a later success clears a previous error', async () => {
    fetchWarehouseOverviewSnapshot.mockResolvedValue({ ok: false, error: 'x' })
    await store().load()
    expect(store().error).toBe('x')
    fetchWarehouseOverviewSnapshot.mockResolvedValue(snapshot())
    await store().load()
    expect(store().error).toBeNull()
    expect(store().loaded).toBe(true)
  })
})

describe('load — failure (M10-11, M10-12)', () => {
  it('a FIRST failure shows the error and nothing else: no rows, not loaded', async () => {
    fetchWarehouseOverviewSnapshot.mockResolvedValue({ ok: false, error: 'Nomenklatura yüklənmədi' })
    await store().load()
    expect(store().error).toBe('Nomenklatura yüklənmədi')
    expect(store().loaded).toBe(false)
    expect(store().loading).toBe(false)
    expect(store().movements).toEqual([])
    expect(store().locations).toEqual([])
    expect(store().indexes.bal).toEqual([])
  })

  /* MUTATION: clearing rows/indexes/locations on failure, or flipping
     `loaded` to false — either would blank a screen that had good data. */
  it('a failed REFRESH retains the previous complete snapshot whole and only sets the error', async () => {
    fetchWarehouseOverviewSnapshot.mockResolvedValue(snapshot())
    await store().load()
    const before = { movements: store().movements, items: store().items, locations: store().locations, indexes: store().indexes }

    fetchWarehouseOverviewSnapshot.mockResolvedValue({ ok: false, error: 'Mal hərəkəti yüklənmədi' })
    await store().load()
    expect(store().error).toBe('Mal hərəkəti yüklənmədi')
    expect(store().loaded).toBe(true)
    expect(store().loading).toBe(false)
    expect(store().movements).toBe(before.movements)
    expect(store().items).toBe(before.items)
    expect(store().locations).toBe(before.locations)
    expect(store().indexes).toBe(before.indexes)
  })
})

describe('load — stale replies are discarded', () => {
  it('an older request that settles AFTER a newer one does not overwrite the newer snapshot', async () => {
    const first = deferred<unknown>()
    const second = deferred<unknown>()
    fetchWarehouseOverviewSnapshot.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise)

    const p1 = store().load()
    const p2 = store().load()
    expect(store().loading).toBe(true)

    second.resolve(snapshot({ locations: [{ id: 9, name: 'NEW', type: 'anbar', active: true }] }))
    await p2
    expect(store().locations.map((l) => l.name)).toEqual(['NEW'])
    expect(store().loading).toBe(false)

    first.resolve(snapshot({ locations: [{ id: 8, name: 'OLD', type: 'anbar', active: true }] }))
    await p1
    /* Still the newer generation, and nothing was re-flagged as loading. */
    expect(store().locations.map((l) => l.name)).toEqual(['NEW'])
    expect(store().loading).toBe(false)
    expect(store().error).toBeNull()
  })

  it('a stale FAILURE neither sets the error nor touches loading', async () => {
    const first = deferred<unknown>()
    const second = deferred<unknown>()
    fetchWarehouseOverviewSnapshot.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise)
    const p1 = store().load()
    const p2 = store().load()
    second.resolve(snapshot())
    await p2
    first.resolve({ ok: false, error: 'stale failure' })
    await p1
    expect(store().error).toBeNull()
    expect(store().loading).toBe(false)
    expect(store().loaded).toBe(true)
  })
})
