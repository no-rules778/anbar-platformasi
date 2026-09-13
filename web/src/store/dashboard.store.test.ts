import { beforeEach, describe, expect, it, vi } from 'vitest'

const fetchDashboardSnapshot = vi.fn()
vi.mock('../api/dashboardSnapshot.api', () => ({
  fetchDashboardSnapshot: () => fetchDashboardSnapshot(),
}))

import { useDashboardStore, activeWarehouseNames } from './dashboard.store'
import type { MovementRow } from '../api/itemMovements.api'

/* T2 — M11-06, M11-07 (D-L4), M11-12, M11-15, M11-16, M11-17. The snapshot
   API is mocked; nothing here is live evidence. */

const mv = (over: Partial<MovementRow> = {}): MovementRow => ({
  id: 'm1', item_code: '0000001', warehouse: 'Ələt', date: '2026-09-01',
  in_qty: 10, out_qty: 0, price: 2, partner: 'Azpetrol', type: 'Satınalma',
  invoice_num: null, note: null, doc_num: null, created_at: '2026-09-01T10:00:00Z',
  channel: null, contract_num: null, created_by: null, ...over,
})

const LOCATIONS = [
  { id: 1, name: 'Ələt', type: 'anbar', active: true },
  { id: 2, name: 'Layihə X', type: 'layihə', active: false },
  { id: 3, name: 'Astara', type: 'anbar', active: true },
]

function snapshot(over: Record<string, unknown> = {}) {
  return {
    ok: true as const,
    snapshot: {
      movements: [mv()],
      items: [{ code: '0000001', name: 'Nasos', unit: 'ədəd', price: 5, category: null }],
      locations: LOCATIONS,
      partners: [{ id: 1, name: 'Azpetrol', voen: '1' }],
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
  useDashboardStore.setState({
    movements: [], items: [], locations: [], partners: [], indexes: EMPTY_INDEXES,
    warehouse: '', loading: false, loaded: false, error: null,
  })
})

const store = () => useDashboardStore.getState()

describe('activeWarehouseNames — DB.whs (933)', () => {
  it('keeps active anbar rows only, in order', () => {
    expect(activeWarehouseNames(LOCATIONS as never)).toEqual(['Ələt', 'Astara'])
    expect(activeWarehouseNames([{ id: 9, name: 'Old', type: 'anbar', active: false }] as never)).toEqual([])
  })
})

describe('load — success', () => {
  it('applies the snapshot atomically: rows, locations, partners, indexes, loaded, no error, ok outcome', async () => {
    fetchDashboardSnapshot.mockResolvedValue(snapshot())
    expect(await store().load()).toEqual({ ok: true, error: null })
    expect(store().movements).toHaveLength(1)
    expect(store().items).toHaveLength(1)
    expect(store().locations).toEqual(LOCATIONS)
    expect(store().partners).toHaveLength(1)
    expect(store().indexes.bal[0]).toMatchObject({ w: 'Ələt', c: '0000001', q: 10, val: 50 })
    expect(store().loaded).toBe(true)
    expect(store().loading).toBe(false)
    expect(store().error).toBeNull()
  })

  /* M11-16 / M11-17 — indexes come from the SHARED `buildItemIndexes()`,
     which applies `excludeCancelled()` first. The reversal is NOT the exact
     inverse, so indexing the raw rows would give q = 9 and three rows. */
  it('derives balances and the operational set through excludeCancelled', async () => {
    fetchDashboardSnapshot.mockResolvedValue(snapshot({
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
    fetchDashboardSnapshot.mockResolvedValue({ ok: false, error: 'x' })
    await store().load()
    expect(store().error).toBe('x')
    fetchDashboardSnapshot.mockResolvedValue(snapshot())
    await store().load()
    expect(store().error).toBeNull()
    expect(store().loaded).toBe(true)
  })
})

describe('load — failure (M11-11, M11-12)', () => {
  it('a FIRST failure sets the error, not loaded, nothing applied, failed outcome', async () => {
    fetchDashboardSnapshot.mockResolvedValue({ ok: false, error: 'Nomenklatura yüklənmədi' })
    expect(await store().load()).toEqual({ ok: false, error: 'Nomenklatura yüklənmədi' })
    expect(store().error).toBe('Nomenklatura yüklənmədi')
    expect(store().loaded).toBe(false)
    expect(store().loading).toBe(false)
    expect(store().movements).toEqual([])
    expect(store().indexes.bal).toEqual([])
  })

  it('a failed REFRESH retains the previous complete snapshot (by identity) and the selection, and only sets the error', async () => {
    fetchDashboardSnapshot.mockResolvedValue(snapshot())
    await store().load()
    store().setWarehouse('Astara')
    const before = { movements: store().movements, items: store().items, locations: store().locations, partners: store().partners, indexes: store().indexes }

    fetchDashboardSnapshot.mockResolvedValue({ ok: false, error: 'Mal hərəkəti yüklənmədi' })
    await store().load()
    expect(store().error).toBe('Mal hərəkəti yüklənmədi')
    expect(store().loaded).toBe(true)
    expect(store().loading).toBe(false)
    expect(store().movements).toBe(before.movements)
    expect(store().items).toBe(before.items)
    expect(store().locations).toBe(before.locations)
    expect(store().partners).toBe(before.partners)
    expect(store().indexes).toBe(before.indexes)
    expect(store().warehouse).toBe('Astara')
  })
})

describe('warehouse selection — M11-06, M11-07 (D-L4)', () => {
  it('is module-level state, so it survives a page unmount/remount', () => {
    store().setWarehouse('Ələt')
    /* A remounted page reads the same store instance. */
    expect(useDashboardStore.getState().warehouse).toBe('Ələt')
  })

  it('keeps a still-valid selection across a reload', async () => {
    fetchDashboardSnapshot.mockResolvedValue(snapshot())
    await store().load()
    store().setWarehouse('Astara')
    await store().load()
    expect(store().warehouse).toBe('Astara')
  })

  it('resets the selection when the reloaded snapshot no longer lists that warehouse as an active anbar', async () => {
    fetchDashboardSnapshot.mockResolvedValue(snapshot())
    await store().load()
    store().setWarehouse('Astara')
    fetchDashboardSnapshot.mockResolvedValue(snapshot({ locations: [LOCATIONS[0], { ...LOCATIONS[2], active: false }] }))
    await store().load()
    expect(store().warehouse).toBe('')
  })

  it('never resets «Bütün anbarlar»', async () => {
    fetchDashboardSnapshot.mockResolvedValue(snapshot({ locations: [] }))
    await store().load()
    expect(store().warehouse).toBe('')
  })
})

describe('load — stale replies are discarded (M11-15)', () => {
  it('an older request that settles AFTER a newer one does not overwrite the newer snapshot', async () => {
    const first = deferred<unknown>()
    const second = deferred<unknown>()
    fetchDashboardSnapshot.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise)

    const p1 = store().load()
    const p2 = store().load()
    expect(store().loading).toBe(true)

    second.resolve(snapshot({ partners: [{ id: 2, name: 'NEW', voen: '' }] }))
    await p2
    expect(store().partners.map((p) => p.name)).toEqual(['NEW'])
    expect(store().loading).toBe(false)

    first.resolve(snapshot({ partners: [{ id: 3, name: 'OLD', voen: '' }] }))
    await p1
    expect(store().partners.map((p) => p.name)).toEqual(['NEW'])
    expect(store().loading).toBe(false)
    expect(store().error).toBeNull()
  })

  it('a stale FAILURE neither sets the error nor touches loading', async () => {
    const first = deferred<unknown>()
    const second = deferred<unknown>()
    fetchDashboardSnapshot.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise)
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
