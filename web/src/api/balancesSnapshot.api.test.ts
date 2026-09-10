import { describe, it, expect, vi, beforeEach } from 'vitest'

const fetchItems = vi.fn()
const fetchItemMovements = vi.fn()
const fetchWarehouses = vi.fn()
const fetchStockConditions = vi.fn()

vi.mock('./items.api', () => ({ fetchItems: () => fetchItems() }))
vi.mock('./itemMovements.api', () => ({ fetchItemMovements: () => fetchItemMovements() }))
vi.mock('./warehouses.api', () => ({ fetchWarehouses: () => fetchWarehouses() }))
vi.mock('./stockConditions.api', () => ({ fetchStockConditions: () => fetchStockConditions() }))

import { fetchBalancesSnapshot, FAIL_CONDITIONS } from './balancesSnapshot.api'

/* T3 — M9-10 … M9-18. Every reader is MOCKED; this suite proves the snapshot's
   composition and failure contract, not the readers' queries (those are
   covered by their own suites) and not any live behaviour. */

const okMovs = {
  ok: true, error: null,
  rows: [
    { id: 'm1', item_code: 'C1', warehouse: 'Ələt' },
    { id: 'm2', item_code: 'C1', warehouse: 'Astara' },
  ],
}
const okItems = { ok: true, rows: [{ code: 'C1', name: 'N', unit: 'ə', price: 1, category: null }], error: null }
const okWhs = [
  { id: 1, name: 'Ələt', type: 'anbar', active: true },
  { id: 2, name: 'Bakı ofis', type: 'location', active: true },
  { id: 3, name: 'Köhnə', type: 'anbar', active: false },
  { id: 4, name: 'Astara', type: 'anbar', active: true },
]
const cond = { w: 'Ələt', c: 'C1', unfit: 1, repair: 0, onsite: 0, icare: 0, note: '' }
const okConds = { rows: [cond], ok: true, error: null }

beforeEach(() => {
  vi.clearAllMocks()
  fetchItemMovements.mockResolvedValue(okMovs)
  fetchItems.mockResolvedValue(okItems)
  fetchWarehouses.mockResolvedValue(okWhs)
  fetchStockConditions.mockResolvedValue(okConds)
})

describe('fetchBalancesSnapshot — the happy path (M9-10)', () => {
  it('returns exactly the four reads, movements/items/conditions verbatim', async () => {
    const res = await fetchBalancesSnapshot()
    expect(res.ok).toBe(true)
    if (!res.ok) return
    expect(Object.keys(res.snapshot).sort()).toEqual(['conditions', 'items', 'movements', 'warehouses'])
    expect(res.snapshot.movements).toEqual(okMovs.rows)
    expect(res.snapshot.items).toEqual(okItems.rows)
    expect(res.snapshot.conditions).toEqual([cond])
  })

  it('issues each of the four reads exactly once and nothing else', async () => {
    await fetchBalancesSnapshot()
    expect(fetchItemMovements).toHaveBeenCalledTimes(1)
    expect(fetchItems).toHaveBeenCalledTimes(1)
    expect(fetchWarehouses).toHaveBeenCalledTimes(1)
    expect(fetchStockConditions).toHaveBeenCalledTimes(1)
  })

  /* M9-15 — DB.whs is active `anbar` rows only. Varied independently: an
     active location, an inactive anbar, and two active anbar rows. */
  it('DB.whs keeps only active anbar rows, in read order', async () => {
    const res = await fetchBalancesSnapshot()
    expect(res.ok && res.snapshot.warehouses).toEqual(['Ələt', 'Astara'])
  })

  /* M9-13 — the ONE case where D-J1 and legacy agree: a successful read that
     finds no condition rows is a complete, valid snapshot. */
  it('accepts a successful condition read that returns ZERO rows', async () => {
    fetchStockConditions.mockResolvedValue({ rows: [], ok: true, error: null })
    const res = await fetchBalancesSnapshot()
    expect(res.ok).toBe(true)
    if (!res.ok) return
    expect(res.snapshot.conditions).toEqual([])
    expect(res.snapshot.movements).toEqual(okMovs.rows)
  })
})

/* D-J1 (M9-11) — a failed stock_conditions read is FATAL. This is the
   DEVIATION from legacy (908-923), which swallows the failure and renders
   blank markers. */
describe('fetchBalancesSnapshot — a failed condition read is FATAL (D-J1, M9-11)', () => {
  it('returns ok:false when fetchStockConditions() reports an error', async () => {
    fetchStockConditions.mockResolvedValue({ rows: [], ok: false, error: 'stock_conditions oxunmadı' })
    const res = await fetchBalancesSnapshot()
    expect(res).toEqual({ ok: false, error: 'stock_conditions oxunmadı' })
  })

  /* A PARTIAL read (rows gathered, then a failed page) is still a failure —
     the gathered rows are diagnostics, never a snapshot. */
  it('returns ok:false on a partial read even though rows were gathered', async () => {
    fetchStockConditions.mockResolvedValue({ rows: [cond], ok: false, error: 'səhifə 2 oxunmadı', partial: true })
    const res = await fetchBalancesSnapshot()
    expect(res).toEqual({ ok: false, error: 'səhifə 2 oxunmadı' })
  })

  it('falls back to a stated message when the failure carries no text', async () => {
    fetchStockConditions.mockResolvedValue({ rows: [], ok: false, error: null })
    const res = await fetchBalancesSnapshot()
    expect(res).toEqual({ ok: false, error: FAIL_CONDITIONS })
  })

  it('returns ok:false when the condition request REJECTS (M9-14)', async () => {
    fetchStockConditions.mockRejectedValue(new Error('network down'))
    const res = await fetchBalancesSnapshot()
    expect(res).toEqual({ ok: false, error: 'network down' })
  })

  /* The precise regression D-J1 forbids: `ok: true` carrying `conditions: []`
     after a FAILED read. */
  it('never returns a snapshot carrying an empty condition array on failure', async () => {
    fetchStockConditions.mockRejectedValue(new Error('boom'))
    expect(await fetchBalancesSnapshot()).not.toMatchObject({ ok: true })
    fetchStockConditions.mockResolvedValue({ rows: [], ok: false, error: 'x' })
    expect(await fetchBalancesSnapshot()).not.toMatchObject({ ok: true })
  })
})

describe('fetchBalancesSnapshot — the other three reads are fatal too (M9-11, M9-14)', () => {
  it('fails on a movements error result', async () => {
    fetchItemMovements.mockResolvedValue({ ok: false, rows: [], error: 'mov xəta' })
    await expect(fetchBalancesSnapshot()).resolves.toEqual({ ok: false, error: 'mov xəta' })
  })

  it('fails on a rejected movements read', async () => {
    fetchItemMovements.mockRejectedValue(new Error('mov rədd'))
    await expect(fetchBalancesSnapshot()).resolves.toEqual({ ok: false, error: 'mov rədd' })
  })

  it('fails on an items error result', async () => {
    fetchItems.mockResolvedValue({ ok: false, rows: [], error: 'nom xəta' })
    await expect(fetchBalancesSnapshot()).resolves.toEqual({ ok: false, error: 'nom xəta' })
  })

  it('fails on a rejected items read', async () => {
    fetchItems.mockRejectedValue(new Error('nom rədd'))
    await expect(fetchBalancesSnapshot()).resolves.toEqual({ ok: false, error: 'nom rədd' })
  })

  /* fetchWarehouses() throws rather than returning `{ error }` (M3-06a). */
  it('fails on a rejected warehouses read', async () => {
    fetchWarehouses.mockRejectedValue(new Error('anbar xəta'))
    await expect(fetchBalancesSnapshot()).resolves.toEqual({ ok: false, error: 'anbar xəta' })
  })

  it('a movements failure with no text uses the stated fallback', async () => {
    fetchItemMovements.mockResolvedValue({ ok: false, rows: [], error: null })
    await expect(fetchBalancesSnapshot()).resolves.toEqual({ ok: false, error: 'Mal hərəkəti yüklənmədi' })
  })

  it('never throws, even on a bare non-Error rejection', async () => {
    fetchItemMovements.mockRejectedValue('a bare string')
    const res = await fetchBalancesSnapshot()
    expect(res).toEqual({ ok: false, error: 'a bare string' })
  })
})

/* M9-17 — NO client-side warehouse scoping. The function takes no user at
   all, and rows from several warehouses pass through untouched. */
describe('fetchBalancesSnapshot — no client-side scoping (M9-17, M9-18)', () => {
  it('takes no caller identity', () => {
    expect(fetchBalancesSnapshot.length).toBe(0)
  })

  it('passes rows for every warehouse the server returned', async () => {
    const res = await fetchBalancesSnapshot()
    expect(res.ok && res.snapshot.movements.map((m) => m.warehouse)).toEqual(['Ələt', 'Astara'])
  })

  it('the warehouse list is the full DB.whs, not narrowed to any user', async () => {
    const res = await fetchBalancesSnapshot()
    expect(res.ok && res.snapshot.warehouses).toHaveLength(2)
  })
})
