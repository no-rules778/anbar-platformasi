import { beforeEach, describe, expect, it, vi } from 'vitest'

const fetchItemMovements = vi.fn()
const fetchItems = vi.fn()
const fetchWarehouses = vi.fn()
const fetchPartners = vi.fn()
vi.mock('./itemMovements.api', () => ({ fetchItemMovements: () => fetchItemMovements() }))
vi.mock('./items.api', () => ({ fetchItems: () => fetchItems() }))
vi.mock('./warehouses.api', () => ({ fetchWarehouses: () => fetchWarehouses() }))
vi.mock('./partners.api', () => ({ fetchPartners: () => fetchPartners() }))

import { fetchDashboardSnapshot } from './dashboardSnapshot.api'

/* T2 — M11-10 / M11-11. The four readers are mocked; nothing here is live
   evidence of what the server returns. */

describe('dashboard atomic snapshot', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    fetchItemMovements.mockResolvedValue({ ok: true, rows: [{ id: 'm' }] })
    fetchItems.mockResolvedValue({ ok: true, rows: [{ code: 'A' }] })
    fetchWarehouses.mockResolvedValue([{ id: 1, name: 'W', type: 'anbar', active: true }, { id: 2, name: 'P', type: 'layihə', active: false }])
    fetchPartners.mockResolvedValue([{ id: 7, name: 'Ext', voen: '1' }])
  })

  /* M11-10 — exactly the four readers, each once, raw rows through. */
  it('reads movements, items, warehouses and partners once each and returns the raw rows', async () => {
    const result = await fetchDashboardSnapshot()
    expect(fetchItemMovements).toHaveBeenCalledTimes(1)
    expect(fetchItems).toHaveBeenCalledTimes(1)
    expect(fetchWarehouses).toHaveBeenCalledTimes(1)
    expect(fetchPartners).toHaveBeenCalledTimes(1)
    expect(result).toEqual({
      ok: true,
      snapshot: {
        movements: [{ id: 'm' }],
        items: [{ code: 'A' }],
        locations: [{ id: 1, name: 'W', type: 'anbar', active: true }, { id: 2, name: 'P', type: 'layihə', active: false }],
        partners: [{ id: 7, name: 'Ext', voen: '1' }],
      },
    })
  })

  /* M11-11 — ANY reader failing fails the generation, both shapes. */
  it('fails the whole generation when movements or items report an error, with the reader message or the fixed fallback', async () => {
    fetchItemMovements.mockResolvedValue({ ok: false, rows: [], error: 'movements failed' })
    expect(await fetchDashboardSnapshot()).toEqual({ ok: false, error: 'movements failed' })
    fetchItemMovements.mockResolvedValue({ ok: false, rows: [], error: null })
    expect(await fetchDashboardSnapshot()).toEqual({ ok: false, error: 'Mal hərəkəti yüklənmədi' })
    fetchItemMovements.mockResolvedValue({ ok: true, rows: [] })
    fetchItems.mockResolvedValue({ ok: false, rows: [], error: null })
    expect(await fetchDashboardSnapshot()).toEqual({ ok: false, error: 'Nomenklatura yüklənmədi' })
  })

  it('absorbs a rejected warehouse read and a rejected partners read', async () => {
    fetchWarehouses.mockRejectedValue(new Error('warehouse failed'))
    expect(await fetchDashboardSnapshot()).toEqual({ ok: false, error: 'warehouse failed' })
    fetchWarehouses.mockResolvedValue([])
    fetchPartners.mockRejectedValue(new Error('partners failed'))
    expect(await fetchDashboardSnapshot()).toEqual({ ok: false, error: 'partners failed' })
    fetchPartners.mockRejectedValue('not an Error')
    expect(await fetchDashboardSnapshot()).toEqual({ ok: false, error: 'Kontragentlər yüklənmədi' })
  })

  it('absorbs a rejected movements read without throwing', async () => {
    fetchItemMovements.mockRejectedValue(new Error('boom'))
    await expect(fetchDashboardSnapshot()).resolves.toEqual({ ok: false, error: 'boom' })
  })
})
