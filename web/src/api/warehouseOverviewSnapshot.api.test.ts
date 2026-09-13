import { beforeEach, describe, expect, it, vi } from 'vitest'

const fetchItemMovements = vi.fn()
const fetchItems = vi.fn()
const fetchWarehouses = vi.fn()
vi.mock('./itemMovements.api', () => ({ fetchItemMovements: () => fetchItemMovements() }))
vi.mock('./items.api', () => ({ fetchItems: () => fetchItems() }))
vi.mock('./warehouses.api', () => ({ fetchWarehouses: () => fetchWarehouses() }))

import { fetchWarehouseOverviewSnapshot } from './warehouseOverviewSnapshot.api'

/* T2 — M10-10 / M10-11. The three readers are mocked; nothing here is live
   evidence of what the server returns. */

describe('warehouse overview atomic snapshot', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    fetchItemMovements.mockResolvedValue({ ok: true, rows: [{ id: 'm' }] })
    fetchItems.mockResolvedValue({ ok: true, rows: [{ code: 'A' }] })
    fetchWarehouses.mockResolvedValue([{ id: 1, name: 'W', type: 'anbar', active: true }, { id: 2, name: 'P', type: 'layihə', active: false }])
  })

  /* M10-10 — exactly the three readers, each once, and the raw rows pass
     through untouched (no client narrowing, D-K3; inactive rows kept, D-K2). */
  it('reads movements, items and warehouses once each and returns the raw rows, preserving inactive locations', async () => {
    const result = await fetchWarehouseOverviewSnapshot()
    expect(fetchItemMovements).toHaveBeenCalledTimes(1)
    expect(fetchItems).toHaveBeenCalledTimes(1)
    expect(fetchWarehouses).toHaveBeenCalledTimes(1)
    expect(result).toEqual({
      ok: true,
      snapshot: {
        movements: [{ id: 'm' }],
        items: [{ code: 'A' }],
        locations: [{ id: 1, name: 'W', type: 'anbar', active: true }, { id: 2, name: 'P', type: 'layihə', active: false }],
      },
    })
  })

  /* M10-11 — a failure of ANY reader fails the generation; no partial
     snapshot is ever returned alongside the error. */
  it('fails the whole generation when the items reader returns an error', async () => {
    fetchItems.mockResolvedValue({ ok: false, rows: [], error: 'items failed' })
    expect(await fetchWarehouseOverviewSnapshot()).toEqual({ ok: false, error: 'items failed' })
  })

  it('fails the whole generation when the movements reader returns an error, with the reader message', async () => {
    fetchItemMovements.mockResolvedValue({ ok: false, rows: [], error: 'movements failed' })
    expect(await fetchWarehouseOverviewSnapshot()).toEqual({ ok: false, error: 'movements failed' })
  })

  it('falls back to the fixed messages when a reader reports failure without text', async () => {
    fetchItemMovements.mockResolvedValue({ ok: false, rows: [], error: null })
    expect(await fetchWarehouseOverviewSnapshot()).toEqual({ ok: false, error: 'Mal hərəkəti yüklənmədi' })
    fetchItemMovements.mockResolvedValue({ ok: true, rows: [] })
    fetchItems.mockResolvedValue({ ok: false, rows: [], error: null })
    expect(await fetchWarehouseOverviewSnapshot()).toEqual({ ok: false, error: 'Nomenklatura yüklənmədi' })
  })

  /* `fetchWarehouses()` THROWS rather than returning `{ error }` (M3-06a);
     both shapes must end in `ok: false`, never in a rejected promise. */
  it('absorbs a rejected warehouse read', async () => {
    fetchWarehouses.mockRejectedValue(new Error('warehouse failed'))
    expect(await fetchWarehouseOverviewSnapshot()).toEqual({ ok: false, error: 'warehouse failed' })
  })

  it('absorbs a rejected movements read without throwing', async () => {
    fetchItemMovements.mockRejectedValue(new Error('boom'))
    await expect(fetchWarehouseOverviewSnapshot()).resolves.toEqual({ ok: false, error: 'boom' })
  })
})
