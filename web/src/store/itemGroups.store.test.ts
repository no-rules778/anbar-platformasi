import { describe, it, expect, vi, beforeEach } from 'vitest'

const fetchItemGroupsSnapshot = vi.fn()
vi.mock('../api/itemGroupsSnapshot.api', () => ({
  fetchItemGroupsSnapshot: () => fetchItemGroupsSnapshot(),
}))

import { useItemGroupsStore, selectionKey } from './itemGroups.store'
import { EMPTY_GROUP_FILTERS } from '../lib/groupFilters'
import type { MovementRow } from '../api/itemMovements.api'

const mv = (p: Partial<MovementRow>): MovementRow => ({
  id: 'm1', item_code: 'C1', warehouse: 'Ələt', date: '2026-01-01',
  in_qty: 10, out_qty: 0, price: 5, partner: 'P', type: 'Satınalma',
  invoice_num: null, note: null, doc_num: null, created_at: '2026-01-01T00:00:00Z', ...p,
})

const snapshot = {
  items: [{ code: 'C1', name: 'Nasos', unit: 'ədəd', price: 999, category: 'Nasos' }],
  movements: [mv({})],
  warehouses: ['Ələt'],
  categories: ['Nasos'],
  refsReady: true,
}

function resetStore() {
  useItemGroupsStore.setState({
    items: [], itemBy: new Map(), lastPurchase: new Map(),
    warehouses: [], categories: [], refsReady: false,
    loading: false, error: null, loaded: false,
    filters: { ...EMPTY_GROUP_FILTERS, whs: new Set(), cats: new Set() },
    selection: new Set(), showAll: false,
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  resetStore()
  fetchItemGroupsSnapshot.mockResolvedValue({ ok: true, snapshot })
})

describe('selectionKey (M6-24)', () => {
  it('is code|warehouse', () => {
    expect(selectionKey({ code: '0000152', wh: 'Ələt' })).toBe('0000152|Ələt')
  })

  it('keeps the same item in two warehouses independent', () => {
    expect(selectionKey({ code: 'C1', wh: 'Ələt' })).not.toBe(selectionKey({ code: 'C1', wh: 'Astara' }))
  })
})

describe('load — success', () => {
  it('derives balances and the last-purchase map, and reports ok', async () => {
    const res = await useItemGroupsStore.getState().load()
    expect(res).toEqual({ ok: true, error: null })
    const s = useItemGroupsStore.getState()
    expect(s.loaded).toBe(true)
    expect(s.indexes.bal).toHaveLength(1)
    expect(s.lastPurchase.get('C1')?.price).toBe(5)
    expect(s.itemBy.get('C1')?.name).toBe('Nasos')
  })
})

/* M6-S3 / R-G9 — atomic refresh. */
describe('refresh — atomicity (M6-S3)', () => {
  it('returns an explicit failure result', async () => {
    await useItemGroupsStore.getState().load()
    fetchItemGroupsSnapshot.mockResolvedValue({ ok: false, error: 'network down' })
    const res = await useItemGroupsStore.getState().refresh()
    expect(res).toEqual({ ok: false, error: 'network down' })
  })

  it('KEEPS the previous data when the refresh fails', async () => {
    await useItemGroupsStore.getState().load()
    const before = useItemGroupsStore.getState()
    expect(before.indexes.bal).toHaveLength(1)

    fetchItemGroupsSnapshot.mockResolvedValue({ ok: false, error: 'boom' })
    await useItemGroupsStore.getState().refresh()

    const after = useItemGroupsStore.getState()
    expect(after.indexes.bal).toHaveLength(1) // not blanked
    expect(after.items).toHaveLength(1)
    expect(after.lastPurchase.get('C1')?.price).toBe(5)
    expect(after.error).toBe('boom')
    expect(after.loading).toBe(false)
  })

  it('does not clear the selection on a failed refresh', async () => {
    await useItemGroupsStore.getState().load()
    useItemGroupsStore.getState().toggleSelection('C1|Ələt')
    fetchItemGroupsSnapshot.mockResolvedValue({ ok: false, error: 'x' })
    await useItemGroupsStore.getState().refresh()
    expect(useItemGroupsStore.getState().selection.has('C1|Ələt')).toBe(true)
  })

  it('clears a stale error on a later success', async () => {
    fetchItemGroupsSnapshot.mockResolvedValue({ ok: false, error: 'x' })
    await useItemGroupsStore.getState().load()
    expect(useItemGroupsStore.getState().error).toBe('x')

    fetchItemGroupsSnapshot.mockResolvedValue({ ok: true, snapshot })
    await useItemGroupsStore.getState().refresh()
    expect(useItemGroupsStore.getState().error).toBeNull()
  })
})

describe('selection pruning (M6-25, M6-S12)', () => {
  it('drops keys outside the visible set', () => {
    const st = useItemGroupsStore.getState()
    st.toggleSelection('A|Ələt')
    st.toggleSelection('B|Ələt')
    useItemGroupsStore.getState().pruneSelection(new Set(['A|Ələt']))
    expect([...useItemGroupsStore.getState().selection]).toEqual(['A|Ələt'])
  })

  it('keeps every key when all remain visible', () => {
    const st = useItemGroupsStore.getState()
    st.toggleSelection('A|Ələt')
    st.toggleSelection('B|Ələt')
    useItemGroupsStore.getState().pruneSelection(new Set(['A|Ələt', 'B|Ələt']))
    expect(useItemGroupsStore.getState().selection.size).toBe(2)
  })

  /* The correction: pruning must run against the FULL filtered result. A row
     beyond the 3000-row cut is still selectable and must survive. */
  it('keeps a selection that is filtered-in but beyond the display cut', () => {
    useItemGroupsStore.getState().toggleSelection('FAR|Ələt')
    // The full filtered set contains it, even though a cut page would not.
    useItemGroupsStore.getState().pruneSelection(new Set(['NEAR|Ələt', 'FAR|Ələt']))
    expect(useItemGroupsStore.getState().selection.has('FAR|Ələt')).toBe(true)
  })

  it('returns the same state object when nothing changes', () => {
    useItemGroupsStore.getState().toggleSelection('A|Ələt')
    const before = useItemGroupsStore.getState().selection
    useItemGroupsStore.getState().pruneSelection(new Set(['A|Ələt']))
    expect(useItemGroupsStore.getState().selection).toBe(before)
  })

  it('is a no-op on an empty selection', () => {
    useItemGroupsStore.getState().pruneSelection(new Set(['A|Ələt']))
    expect(useItemGroupsStore.getState().selection.size).toBe(0)
  })
})

describe('showAll stickiness (M6-S13)', () => {
  it('survives a filter change', () => {
    useItemGroupsStore.getState().setShowAll(true)
    useItemGroupsStore.getState().setFilters({ q: 'nasos' })
    expect(useItemGroupsStore.getState().showAll).toBe(true)
  })

  it('survives a warehouse toggle', () => {
    useItemGroupsStore.getState().setShowAll(true)
    useItemGroupsStore.getState().toggleWarehouse('Ələt')
    expect(useItemGroupsStore.getState().showAll).toBe(true)
  })

  it('survives reset', () => {
    useItemGroupsStore.getState().setShowAll(true)
    useItemGroupsStore.getState().reset()
    expect(useItemGroupsStore.getState().showAll).toBe(true)
  })

  it('survives a reload', async () => {
    useItemGroupsStore.getState().setShowAll(true)
    await useItemGroupsStore.getState().load()
    expect(useItemGroupsStore.getState().showAll).toBe(true)
  })
})

describe('reset (M6-22, M6-S14)', () => {
  it('clears filters and selection', () => {
    const st = useItemGroupsStore.getState()
    st.setFilters({ q: 'x', min: '1', max: '9' })
    st.toggleWarehouse('Ələt')
    st.toggleCategory('Nasos')
    st.toggleSelection('C1|Ələt')

    useItemGroupsStore.getState().reset()

    const s = useItemGroupsStore.getState()
    expect(s.filters.q).toBe('')
    expect(s.filters.min).toBe('')
    expect(s.filters.max).toBe('')
    expect(s.filters.whs.size).toBe(0)
    expect(s.filters.cats.size).toBe(0)
    expect(s.selection.size).toBe(0)
  })

  it('does NOT discard loaded data or unrelated state', async () => {
    await useItemGroupsStore.getState().load()
    useItemGroupsStore.getState().reset()
    const s = useItemGroupsStore.getState()
    expect(s.items).toHaveLength(1)
    expect(s.warehouses).toEqual(['Ələt'])
    expect(s.categories).toEqual(['Nasos'])
    expect(s.loaded).toBe(true)
  })
})

describe('filter toggles', () => {
  it('toggles a warehouse on and off', () => {
    useItemGroupsStore.getState().toggleWarehouse('Ələt')
    expect(useItemGroupsStore.getState().filters.whs.has('Ələt')).toBe(true)
    useItemGroupsStore.getState().toggleWarehouse('Ələt')
    expect(useItemGroupsStore.getState().filters.whs.has('Ələt')).toBe(false)
  })

  it('toggles a category on and off', () => {
    useItemGroupsStore.getState().toggleCategory('Nasos')
    expect(useItemGroupsStore.getState().filters.cats.has('Nasos')).toBe(true)
    useItemGroupsStore.getState().toggleCategory('Nasos')
    expect(useItemGroupsStore.getState().filters.cats.has('Nasos')).toBe(false)
  })

  it('toggling a filter does not clear the selection', () => {
    useItemGroupsStore.getState().toggleSelection('C1|Ələt')
    useItemGroupsStore.getState().toggleWarehouse('Ələt')
    expect(useItemGroupsStore.getState().selection.has('C1|Ələt')).toBe(true)
  })
})
