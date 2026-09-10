import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../api/items.api', () => ({ fetchItems: vi.fn() }))
vi.mock('../api/itemMovements.api', () => ({ fetchItemMovements: vi.fn() }))
vi.mock('../api/referenceValues.api', () => ({ fetchReferenceValues: vi.fn() }))
vi.mock('../api/warehouses.api', () => ({ fetchWarehouses: vi.fn() }))

import { fetchItems } from '../api/items.api'
import { fetchItemMovements } from '../api/itemMovements.api'
import { fetchReferenceValues } from '../api/referenceValues.api'
import { fetchWarehouses } from '../api/warehouses.api'
import { useNomenclatureStore } from './nomenclature.store'
import { EMPTY_ITEM_FILTERS } from '../lib/itemFilters'
import { DEFAULT_UNITS, ITEM_CATEGORIES } from '../lib/referenceFallbacks'

const item = { code: '0000001', name: 'Sement', unit: 'kq', price: 10, category: null }
const mv = {
  id: 'm1', item_code: '0000001', warehouse: 'Elet', date: '2026-01-01',
  in_qty: 5, out_qty: 0, price: 12, partner: 'ACME', type: 'Satınalma',
  invoice_num: null, note: null, doc_num: null, created_at: null,
}

const refs = (over: Record<string, unknown> = {}) => ({
  ready: true,
  values: {
    channel: [], serfiyyat_channel: [],
    unit: [{ id: 'u1', name: 'kq', active: true }, { id: 'u2', name: 'köhnə', active: false }],
    category: [{ id: 'c1', name: 'Filtrlər', active: true }],
  },
  ...over,
})

beforeEach(() => {
  vi.clearAllMocks()
  useNomenclatureStore.setState({
    items: [], indexes: { byItem: new Map(), bal: [], priceObs: new Map(), operational: [] },
    units: [], categories: [], warehouses: [], refsReady: false, loading: false, error: null,
    filters: EMPTY_ITEM_FILTERS, showAll: false, cardCode: null,
  })
  vi.mocked(fetchItems).mockResolvedValue({ rows: [item], ok: true, error: null })
  vi.mocked(fetchItemMovements).mockResolvedValue({ rows: [mv], ok: true, error: null })
  vi.mocked(fetchReferenceValues).mockResolvedValue(refs() as never)
  vi.mocked(fetchWarehouses).mockResolvedValue([{ name: 'Ələt' }, { name: 'Xocahəsən' }] as never)
})

describe('load', () => {
  it('loads items and derives the indexes', async () => {
    await useNomenclatureStore.getState().load()
    const s = useNomenclatureStore.getState()
    expect(s.items).toHaveLength(1)
    expect(s.indexes.byItem.get('0000001')!.q).toBe(5)
    expect(s.loading).toBe(false)
  })

  it('offers only ACTIVE units and categories from the reference directory', async () => {
    await useNomenclatureStore.getState().load()
    const s = useNomenclatureStore.getState()
    expect(s.units).toEqual(['kq'])
    expect(s.categories).toEqual(['Filtrlər'])
  })

  /* Items are the screen: without them there is no list. */
  it('treats an items failure as fatal for the screen', async () => {
    vi.mocked(fetchItems).mockResolvedValue({ rows: [], ok: false, error: 'denied' })
    await useNomenclatureStore.getState().load()
    const s = useNomenclatureStore.getState()
    expect(s.error).toBe('denied')
    expect(s.items).toEqual([])
  })

  /* Movements are not: the original still renders the table, just without
     balances, rather than blanking the screen. */
  it('still lists items when the MOVEMENTS read fails, with empty indexes', async () => {
    vi.mocked(fetchItemMovements).mockResolvedValue({ rows: [], ok: false, error: 'timeout' })
    await useNomenclatureStore.getState().load()
    const s = useNomenclatureStore.getState()
    expect(s.items).toHaveLength(1)
    expect(s.indexes.byItem.size).toBe(0)
    expect(s.error).toBe('timeout')
  })

  /* A14 — «not ready» and «ready but empty» are DIFFERENT states
     (unitOptions/categoryOptions, index.html:684-705). The pre-fix store
     collapsed both to `[]`, which silently reported a failed load as «the
     Admin hid everything» and left the forms with nothing to choose. */
  it('falls back to the built-in lists when the reference read FAILS', async () => {
    vi.mocked(fetchReferenceValues).mockResolvedValue(refs({ ready: false }) as never)
    await useNomenclatureStore.getState().load()
    const s = useNomenclatureStore.getState()
    expect(s.items).toHaveLength(1)
    expect(s.refsReady).toBe(false)
    expect(s.units).toEqual(DEFAULT_UNITS)
    expect(s.categories).toEqual(ITEM_CATEGORIES)
  })

  /* The opposite case, and the reason the fallback may not be unconditional:
     a directory that loaded with every value hidden must STAY empty, or the
     Admin's deliberate configuration would be undone by the defaults. */
  it('stays EMPTY when the directory is ready but has no active values', async () => {
    vi.mocked(fetchReferenceValues).mockResolvedValue(
      refs({ ready: true, values: { unit: [], category: [] } }) as never,
    )
    await useNomenclatureStore.getState().load()
    const s = useNomenclatureStore.getState()
    expect(s.refsReady).toBe(true)
    expect(s.units).toEqual([])
    expect(s.categories).toEqual([])
  })

  /* A12 — the card's route resolution needs the configured warehouse names. */
  it('loads the warehouse names for route resolution', async () => {
    await useNomenclatureStore.getState().load()
    expect(useNomenclatureStore.getState().warehouses).toEqual(['Ələt', 'Xocahəsən'])
  })

  /* fetchWarehouses() THROWS rather than returning `{ error }`. An unhandled
     rejection inside the load's Promise.all would blank the entire screen —
     the M3-06a failure mode. A failed warehouse read may only cost the route
     rendering, which then falls back to the stored partner text. */
  it('absorbs a THROWN warehouse read and still renders the list', async () => {
    vi.mocked(fetchWarehouses).mockRejectedValue(new Error('rls'))
    await useNomenclatureStore.getState().load()
    const s = useNomenclatureStore.getState()
    expect(s.items).toHaveLength(1)
    expect(s.warehouses).toEqual([])
    expect(s.loading).toBe(false)
  })

  it('offers only the ACTIVE values when the directory is ready', async () => {
    vi.mocked(fetchReferenceValues).mockResolvedValue(refs({
      ready: true,
      values: {
        unit: [{ name: 'kq', active: true }, { name: 'ton', active: false }],
        category: [{ name: 'Filtrlər', active: true }],
      },
    }) as never)
    await useNomenclatureStore.getState().load()
    const s = useNomenclatureStore.getState()
    expect(s.units).toEqual(['kq'])
    expect(s.categories).toEqual(['Filtrlər'])
  })
})

/* M5-16 — the M4-18 lesson applied up front: controls live in the store, so
   they survive the page unmounting on navigation. */
describe('list controls', () => {
  it('merges a filter patch', () => {
    useNomenclatureStore.getState().setFilters({ q: 'sement' })
    expect(useNomenclatureStore.getState().filters).toEqual({ q: 'sement', only: '' })
    useNomenclatureStore.getState().setFilters({ only: 'dup' })
    expect(useNomenclatureStore.getState().filters).toEqual({ q: 'sement', only: 'dup' })
  })

  /* A13 — SHOW_ALL['nom'] (index.html:1679) is STICKY. The original resets
     NF_.page to 0 on a filter change but never clears SHOW_ALL; they are
     different variables. The pre-fix store cleared the expansion on every
     setFilters, so the search box, a segment click and even the page's own
     debounced setFilters on mount all silently collapsed the list back to
     3000 rows. Approved Q3 requires the legacy behaviour. */
  it('keeps «show all» when the search text changes', () => {
    useNomenclatureStore.getState().setShowAll(true)
    useNomenclatureStore.getState().setFilters({ q: 'x' })
    expect(useNomenclatureStore.getState().showAll).toBe(true)
  })

  it('keeps «show all» when the segment filter changes', () => {
    useNomenclatureStore.getState().setShowAll(true)
    useNomenclatureStore.getState().setFilters({ only: 'dup' })
    expect(useNomenclatureStore.getState().showAll).toBe(true)
  })

  it('keeps «show all» across a reload', async () => {
    useNomenclatureStore.getState().setShowAll(true)
    await useNomenclatureStore.getState().load()
    expect(useNomenclatureStore.getState().showAll).toBe(true)
  })

  it('still lets the user collapse it explicitly', () => {
    useNomenclatureStore.getState().setShowAll(true)
    useNomenclatureStore.getState().setShowAll(false)
    expect(useNomenclatureStore.getState().showAll).toBe(false)
  })

  it('keeps the controls across a reload — load() must not reset them', async () => {
    useNomenclatureStore.getState().setFilters({ q: 'sement', only: 'nop' })
    await useNomenclatureStore.getState().load()
    expect(useNomenclatureStore.getState().filters).toEqual({ q: 'sement', only: 'nop' })
  })

  it('tracks the open card code', () => {
    useNomenclatureStore.getState().openCard('0000001')
    expect(useNomenclatureStore.getState().cardCode).toBe('0000001')
    useNomenclatureStore.getState().openCard(null)
    expect(useNomenclatureStore.getState().cardCode).toBeNull()
  })
})
