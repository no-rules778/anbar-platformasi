import { describe, it, expect, vi, beforeEach } from 'vitest'

const fetchItems = vi.fn()
const fetchItemMovements = vi.fn()
const fetchWarehouses = vi.fn()
const fetchWriteoffValuations = vi.fn()

vi.mock('./items.api', () => ({ fetchItems: () => fetchItems() }))
vi.mock('./itemMovements.api', () => ({ fetchItemMovements: () => fetchItemMovements() }))
vi.mock('./warehouses.api', () => ({ fetchWarehouses: () => fetchWarehouses() }))
vi.mock('./writeoffValuations.api', () => ({
  fetchWriteoffValuations: () => fetchWriteoffValuations(),
}))

import { fetchMovementsSnapshot } from './movementsSnapshot.api'

const okMovs = { ok: true, rows: [{ id: 'm1', item_code: 'C1' }], error: null }
const okItems = { ok: true, rows: [{ code: 'C1', name: 'N', unit: 'ə', price: 1 }], error: null }
const okWhs = [
  { id: 1, name: 'Ələt', type: 'anbar', active: true },
  { id: 2, name: 'Bakı ofis', type: 'location', active: true },
  { id: 3, name: 'Köhnə', type: 'anbar', active: false },
]
const val = { movement_id: 'm1', final_amount: 100 }
const okVals = { ok: true, rows: [val], error: null }

beforeEach(() => {
  vi.clearAllMocks()
  fetchItemMovements.mockResolvedValue(okMovs)
  fetchItems.mockResolvedValue(okItems)
  fetchWarehouses.mockResolvedValue(okWhs)
  fetchWriteoffValuations.mockResolvedValue(okVals)
})

describe('fetchMovementsSnapshot — the happy path', () => {
  it('returns all four reads, with DB.whs filtered to active anbar rows', async () => {
    const res = await fetchMovementsSnapshot()

    expect(res.ok).toBe(true)
    if (!res.ok) return
    expect(res.snapshot.movements).toEqual(okMovs.rows)
    expect(res.snapshot.items).toEqual(okItems.rows)
    expect(res.snapshot.warehouses).toEqual(['Ələt'])
    expect(res.snapshot.valuations).toEqual([val])
  })

  /* The audit's own carve-out: a SUCCESSFUL read that finds nothing is a
     perfectly valid snapshot. It is the state of the system before SQL 036 has
     produced any valuation, and Silinmə then uses the legacy per-row price. */
  it('accepts a successful valuation read that returns ZERO rows', async () => {
    fetchWriteoffValuations.mockResolvedValue({ ok: true, rows: [], error: null })

    const res = await fetchMovementsSnapshot()

    expect(res.ok).toBe(true)
    if (!res.ok) return
    expect(res.snapshot.valuations).toEqual([])
    /* And it is still a complete snapshot, not a degraded one. */
    expect(res.snapshot.movements).toEqual(okMovs.rows)
  })
})

/* I-2 AUDIT, finding 1 — the snapshot is ATOMIC in all four reads.

   The previous implementation returned `ok: true` with `valuations: []` and a
   `valuationsReady: false` flag when the valuation read failed. The store
   could not distinguish that from a real empty result, so it overwrote a good
   valuation map with an empty one and every Silinmə amount silently changed. */
describe('fetchMovementsSnapshot — a failed valuation read is FATAL (I-2 audit)', () => {
  it('returns ok:false when fetchWriteoffValuations() reports an error', async () => {
    fetchWriteoffValuations.mockResolvedValue({
      ok: false, rows: [], error: 'writeoff_valuations oxunmadı',
    })

    const res = await fetchMovementsSnapshot()

    expect(res.ok).toBe(false)
    if (res.ok) return
    expect(res.error).toBe('writeoff_valuations oxunmadı')
  })

  it('falls back to a stated message when the failure carries no error text', async () => {
    fetchWriteoffValuations.mockResolvedValue({ ok: false, rows: [], error: null })

    const res = await fetchMovementsSnapshot()

    expect(res.ok).toBe(false)
    if (res.ok) return
    expect(res.error).toBe('Silinmə dəyərləri yüklənmədi')
  })

  /* A REJECTION is the other failure shape and must not escape as a thrown
     Promise.all or be mistaken for success. */
  it('returns ok:false when the valuation request REJECTS', async () => {
    fetchWriteoffValuations.mockRejectedValue(new Error('network down'))

    const res = await fetchMovementsSnapshot()

    expect(res.ok).toBe(false)
    if (res.ok) return
    expect(res.error).toBe('network down')
  })

  it('never returns a snapshot carrying an empty valuation array on failure', async () => {
    fetchWriteoffValuations.mockRejectedValue(new Error('boom'))

    const res = await fetchMovementsSnapshot()

    /* The precise regression: no `ok: true` with `valuations: []`. */
    expect(res).not.toMatchObject({ ok: true })
  })
})

describe('fetchMovementsSnapshot — the other three reads stay fatal', () => {
  it('fails on a movements error', async () => {
    fetchItemMovements.mockResolvedValue({ ok: false, rows: [], error: 'mov xəta' })
    await expect(fetchMovementsSnapshot()).resolves.toEqual({ ok: false, error: 'mov xəta' })
  })

  it('fails on an items error', async () => {
    fetchItems.mockResolvedValue({ ok: false, rows: [], error: 'nom xəta' })
    await expect(fetchMovementsSnapshot()).resolves.toEqual({ ok: false, error: 'nom xəta' })
  })

  /* fetchWarehouses() throws rather than returning `{ error }` (M3-06a). */
  it('fails on a rejected warehouses read', async () => {
    fetchWarehouses.mockRejectedValue(new Error('anbar xəta'))
    await expect(fetchMovementsSnapshot()).resolves.toEqual({ ok: false, error: 'anbar xəta' })
  })

  it('never throws', async () => {
    fetchItemMovements.mockRejectedValue('a bare string')
    const res = await fetchMovementsSnapshot()
    expect(res.ok).toBe(false)
  })
})
