import { describe, expect, it, vi, beforeEach } from 'vitest'

/* T4 — the «Hesabatlar» snapshot (M14-10 … M14-16). Unit evidence only:
   every reader is mocked, so this proves the COMPOSITION rule — exactly four
   reads, atomic failure, zero-row success — not the live SQL. */

vi.mock('./items.api', () => ({ fetchItems: vi.fn() }))
vi.mock('./itemMovements.api', () => ({ fetchItemMovements: vi.fn() }))
vi.mock('./warehouses.api', () => ({ fetchWarehouses: vi.fn() }))
vi.mock('./partners.api', () => ({ fetchPartners: vi.fn() }))

import { fetchReportsSnapshot } from './reportsSnapshot.api'
import { fetchItems } from './items.api'
import { fetchItemMovements } from './itemMovements.api'
import { fetchWarehouses } from './warehouses.api'
import { fetchPartners } from './partners.api'

const okMovements = { rows: [{ id: 'm' }], ok: true, error: null }
const okItems = { rows: [{ code: 'A' }], ok: true, error: null }
const okWarehouses = [{ name: 'W', type: 'anbar', active: true }]
const okPartners = [{ name: 'P' }]

function allGood() {
  vi.mocked(fetchItemMovements).mockResolvedValue(okMovements as never)
  vi.mocked(fetchItems).mockResolvedValue(okItems as never)
  vi.mocked(fetchWarehouses).mockResolvedValue(okWarehouses as never)
  vi.mocked(fetchPartners).mockResolvedValue(okPartners as never)
}

beforeEach(() => { vi.clearAllMocks(); allGood() })

describe('read set — M14-10, M14-11', () => {
  it('reads exactly the four tables, once each, and issues no RPC', async () => {
    await fetchReportsSnapshot()
    expect(fetchItemMovements).toHaveBeenCalledTimes(1)
    expect(fetchItems).toHaveBeenCalledTimes(1)
    expect(fetchWarehouses).toHaveBeenCalledTimes(1)
    expect(fetchPartners).toHaveBeenCalledTimes(1)
  })

  it('returns every read in the snapshot, keeping locations unfiltered', async () => {
    const r = await fetchReportsSnapshot()
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.snapshot.movements).toEqual(okMovements.rows)
    expect(r.snapshot.items).toEqual(okItems.rows)
    /* `locations` is EVERY warehouses row; the page derives DB.whs itself. */
    expect(r.snapshot.locations).toEqual(okWarehouses)
    expect(r.snapshot.partners).toEqual(okPartners)
  })
})

describe('atomicity — M14-12', () => {
  /* BOTH failure shapes of EVERY reader must reach ok:false. A returned
     error result and a rejected promise are different code paths. */
  const cases: [string, () => void][] = [
    ['movements returns an error', () => vi.mocked(fetchItemMovements).mockResolvedValue({ rows: [], ok: false, error: 'mov boom' } as never)],
    ['movements rejects', () => vi.mocked(fetchItemMovements).mockRejectedValue(new Error('mov reject'))],
    ['items returns an error', () => vi.mocked(fetchItems).mockResolvedValue({ rows: [], ok: false, error: 'item boom' } as never)],
    ['items rejects', () => vi.mocked(fetchItems).mockRejectedValue(new Error('item reject'))],
    ['warehouses rejects', () => vi.mocked(fetchWarehouses).mockRejectedValue(new Error('wh reject'))],
    ['partners rejects', () => vi.mocked(fetchPartners).mockRejectedValue(new Error('partner reject'))],
  ]

  for (const [label, arrange] of cases) {
    it(`fails the whole snapshot when ${label}`, async () => {
      arrange()
      const r = await fetchReportsSnapshot()
      expect(r.ok).toBe(false)
      if (r.ok) return
      expect(r.error).toBeTruthy()
    })
  }

  it('never throws, whatever the readers do', async () => {
    vi.mocked(fetchItemMovements).mockRejectedValue('a bare string')
    await expect(fetchReportsSnapshot()).resolves.toBeDefined()
  })

  it('returns nothing partial on failure', async () => {
    vi.mocked(fetchPartners).mockRejectedValue(new Error('partner reject'))
    const r = await fetchReportsSnapshot()
    expect(r).not.toHaveProperty('snapshot')
  })
})

describe('zero rows is a valid snapshot — M14-13', () => {
  it('succeeds with empty arrays rather than reporting an error', async () => {
    vi.mocked(fetchItemMovements).mockResolvedValue({ rows: [], ok: true, error: null } as never)
    vi.mocked(fetchItems).mockResolvedValue({ rows: [], ok: true, error: null } as never)
    vi.mocked(fetchWarehouses).mockResolvedValue([] as never)
    vi.mocked(fetchPartners).mockResolvedValue([] as never)

    const r = await fetchReportsSnapshot()
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.snapshot.movements).toEqual([])
    expect(r.snapshot.partners).toEqual([])
  })
})

describe('error messages carry the reader’s own text', () => {
  it('prefers the reader error over the generic fallback', async () => {
    vi.mocked(fetchItems).mockResolvedValue({ rows: [], ok: false, error: 'Nomenklatura spesifik xəta' } as never)
    const r = await fetchReportsSnapshot()
    if (r.ok) throw new Error('expected failure')
    expect(r.error).toBe('Nomenklatura spesifik xəta')
  })

  it('falls back to the table-specific message when a rejection has none', async () => {
    vi.mocked(fetchPartners).mockRejectedValue(new Error(''))
    const r = await fetchReportsSnapshot()
    if (r.ok) throw new Error('expected failure')
    expect(r.error).toBe('Kontragentlər yüklənmədi')
  })
})
