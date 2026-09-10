import { describe, it, expect, vi, beforeEach } from 'vitest'

const fetchItems = vi.fn()
const fetchItemMovements = vi.fn()
const fetchWarehouses = vi.fn()
const fetchReferenceValues = vi.fn()

vi.mock('./items.api', () => ({ fetchItems: () => fetchItems() }))
vi.mock('./itemMovements.api', () => ({ fetchItemMovements: () => fetchItemMovements() }))
vi.mock('./warehouses.api', () => ({ fetchWarehouses: () => fetchWarehouses() }))
vi.mock('./referenceValues.api', () => ({ fetchReferenceValues: () => fetchReferenceValues() }))

import { fetchItemGroupsSnapshot, warehouseNames } from './itemGroupsSnapshot.api'
import { ITEM_CATEGORIES } from '../lib/referenceFallbacks'

const okItems = { ok: true, rows: [{ code: 'C1', name: 'N', unit: 'ə', price: 1, category: null }], error: null }
const okMovs = { ok: true, rows: [], error: null }
const okWhs = [
  { id: 1, name: 'Ələt', type: 'anbar', active: true },
  { id: 2, name: 'Bakı ofis', type: 'location', active: true },
  { id: 3, name: 'Köhnə', type: 'anbar', active: false },
]
const okRefs = { ready: true, values: { channel: [], unit: [], category: [{ name: 'Nasos', active: true }], serfiyyat_channel: [] } }

beforeEach(() => {
  vi.clearAllMocks()
  fetchItems.mockResolvedValue(okItems)
  fetchItemMovements.mockResolvedValue(okMovs)
  fetchWarehouses.mockResolvedValue(okWhs)
  fetchReferenceValues.mockResolvedValue(okRefs)
})

/* M6-S5 / R-G10 — the legacy DB.whs definition (index.html:933). */
describe('warehouseNames (M6-S5)', () => {
  it('keeps only active rows of type anbar', () => {
    expect(warehouseNames(okWhs)).toEqual(['Ələt'])
  })

  it('excludes locations even when active', () => {
    expect(warehouseNames([{ name: 'L', type: 'location', active: true }])).toEqual([])
  })

  it('excludes a deactivated warehouse', () => {
    expect(warehouseNames([{ name: 'W', type: 'anbar', active: false }])).toEqual([])
  })

  it('excludes a null active or null type', () => {
    expect(warehouseNames([
      { name: 'A', type: 'anbar', active: null },
      { name: 'B', type: null, active: true },
    ])).toEqual([])
  })
})

describe('fetchItemGroupsSnapshot — success', () => {
  it('returns an explicit ok result with a filtered warehouse list', async () => {
    const res = await fetchItemGroupsSnapshot()
    expect(res.ok).toBe(true)
    if (!res.ok) return
    expect(res.snapshot.warehouses).toEqual(['Ələt'])
    expect(res.snapshot.items).toHaveLength(1)
  })
})

/* M6-S4 / R-G9 — both core reads are FATAL here, unlike Nomenklatura. */
describe('fetchItemGroupsSnapshot — fatal failures (M6-S4)', () => {
  it('fails when items fail, returning the real error', async () => {
    fetchItems.mockResolvedValue({ ok: false, rows: [], error: 'items down' })
    const res = await fetchItemGroupsSnapshot()
    expect(res).toEqual({ ok: false, error: 'items down' })
  })

  /* The specific divergence from useNomenclatureStore.load(), which survives
     this case and would let an export proceed on empty balances. */
  it('fails when MOVEMENTS fail — not survivable on this screen', async () => {
    fetchItemMovements.mockResolvedValue({ ok: false, rows: [], error: 'movements down' })
    const res = await fetchItemGroupsSnapshot()
    expect(res).toEqual({ ok: false, error: 'movements down' })
  })

  it('fails when warehouses REJECT, absorbing the throw', async () => {
    fetchWarehouses.mockRejectedValue(new Error('network'))
    const res = await fetchItemGroupsSnapshot()
    expect(res).toEqual({ ok: false, error: 'network' })
  })

  it('absorbs a non-Error rejection', async () => {
    fetchWarehouses.mockRejectedValue('boom')
    const res = await fetchItemGroupsSnapshot()
    expect(res).toEqual({ ok: false, error: 'boom' })
  })

  it('never returns partial data on failure', async () => {
    fetchItemMovements.mockResolvedValue({ ok: false, rows: [], error: 'x' })
    const res = await fetchItemGroupsSnapshot()
    expect('snapshot' in res).toBe(false)
  })

  it('falls back to a generic message when the error carries none', async () => {
    fetchItems.mockResolvedValue({ ok: false, rows: [], error: null })
    const res = await fetchItemGroupsSnapshot()
    expect(res).toEqual({ ok: false, error: 'Nomenklatura yüklənmədi' })
  })
})

/* M6-S15 / A14 — «failed» and «ready but empty» are different states. */
describe('fetchItemGroupsSnapshot — reference directory (M6-S15)', () => {
  it('uses the loaded ACTIVE categories when the directory is ready', async () => {
    const res = await fetchItemGroupsSnapshot()
    expect(res.ok && res.snapshot.categories).toEqual(['Nasos'])
    expect(res.ok && res.snapshot.refsReady).toBe(true)
  })

  it('drops inactive categories', async () => {
    fetchReferenceValues.mockResolvedValue({
      ready: true,
      values: { channel: [], unit: [], category: [{ name: 'A', active: true }, { name: 'B', active: false }], serfiyyat_channel: [] },
    })
    const res = await fetchItemGroupsSnapshot()
    expect(res.ok && res.snapshot.categories).toEqual(['A'])
  })

  it('falls back to the built-in list when the directory FAILED', async () => {
    fetchReferenceValues.mockResolvedValue({ ready: false, values: { channel: [], unit: [], category: [], serfiyyat_channel: [] } })
    const res = await fetchItemGroupsSnapshot()
    expect(res.ok && res.snapshot.categories).toEqual(ITEM_CATEGORIES)
    expect(res.ok && res.snapshot.refsReady).toBe(false)
  })

  it('stays EMPTY when the directory is ready but has no active values', async () => {
    fetchReferenceValues.mockResolvedValue({ ready: true, values: { channel: [], unit: [], category: [], serfiyyat_channel: [] } })
    const res = await fetchItemGroupsSnapshot()
    expect(res.ok && res.snapshot.categories).toEqual([])
  })

  it('a failed directory does not make the snapshot fail', async () => {
    fetchReferenceValues.mockResolvedValue({ ready: false, values: { channel: [], unit: [], category: [], serfiyyat_channel: [] } })
    const res = await fetchItemGroupsSnapshot()
    expect(res.ok).toBe(true)
  })
})
