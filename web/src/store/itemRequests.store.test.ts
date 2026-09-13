import { beforeEach, describe, expect, it, vi } from 'vitest'

const fetchItemRequests = vi.fn()
const fetchItems = vi.fn()
const fetchReferenceValues = vi.fn()
vi.mock('../api/itemRequests.api', () => ({ fetchItemRequests: () => fetchItemRequests() }))
vi.mock('../api/items.api', () => ({ fetchItems: () => fetchItems() }))
vi.mock('../api/referenceValues.api', () => ({ fetchReferenceValues: () => fetchReferenceValues() }))

import { useItemRequestsStore } from './itemRequests.store'
import { DEFAULT_FILTERS, type ItemRequestView } from '../lib/nomenclatureRequests'

/* T3 — M12-13, M12-14, M12-15, M12-17. Both readers are mocked; nothing here
   is live or server evidence. */

const req = (over: Partial<ItemRequestView> = {}): ItemRequestView => ({
  id: 'r1', name: 'Sement M400', unit: 'kq', category: 'Tikinti', note: '', status: 'pending',
  by: 'u1', w: 'Test Anbar', ts: 1, decidedBy: '', decidedAt: '', reason: '', code: '', ...over,
})

const ITEM = { code: '0000001', name: 'Kabel', unit: 'metr', price: 1, category: null }

const okReqs = (rows: ItemRequestView[] = [req()]) => ({ rows, ok: true, error: null })
const okItems = () => ({ rows: [ITEM], ok: true, error: null })

function deferred<T>() {
  let resolve!: (v: T) => void
  const promise = new Promise<T>((r) => { resolve = r })
  return { promise, resolve }
}

const store = () => useItemRequestsStore.getState()

beforeEach(() => {
  vi.clearAllMocks()
  fetchReferenceValues.mockResolvedValue({
    values: { channel: [], unit: [], category: [], serfiyyat_channel: [] },
    ready: true,
  })
  useItemRequestsStore.setState({
    requests: [], items: [],
    referenceValues: { channel: [], unit: [], category: [], serfiyyat_channel: [] },
    refsReady: false, filters: DEFAULT_FILTERS,
    loading: false, loaded: false, error: null,
  })
})

describe('load — success applies one atomic generation', () => {
  it('applies requests, items, loaded and clears the error', async () => {
    fetchItemRequests.mockResolvedValue(okReqs())
    fetchItems.mockResolvedValue(okItems())
    expect(await store().load()).toEqual({ ok: true, error: null })
    expect(store().requests).toHaveLength(1)
    expect(store().items).toHaveLength(1)
    expect(store().loaded).toBe(true)
    expect(store().loading).toBe(false)
    expect(store().error).toBeNull()
    expect(fetchReferenceValues).toHaveBeenCalledTimes(1)
  })

  it('keeps the A14 fallback usable when the dedicated reference-values read is not ready', async () => {
    fetchItemRequests.mockResolvedValue(okReqs())
    fetchItems.mockResolvedValue(okItems())
    fetchReferenceValues.mockResolvedValue({
      values: { channel: [], unit: [], category: [], serfiyyat_channel: [] },
      ready: false,
    })
    expect(await store().load()).toEqual({ ok: true, error: null })
    expect(store().refsReady).toBe(false)
    expect(store().loaded).toBe(true)
  })
})

describe('M12-13 — any reader failing applies NOTHING', () => {
  it('a failed item_requests read applies no rows and is NOT a successful empty list (M12-11)', async () => {
    fetchItemRequests.mockResolvedValue({ rows: [], ok: false, error: 'permission denied' })
    fetchItems.mockResolvedValue(okItems())
    expect(await store().load()).toEqual({ ok: false, error: 'permission denied' })
    expect(store().loaded).toBe(false)
    expect(store().requests).toEqual([])
    /* The load-bearing half: the successful items read must NOT be applied. */
    expect(store().items).toEqual([])
    expect(store().error).toBe('permission denied')
  })

  it('a failed items read likewise applies nothing, even though requests succeeded', async () => {
    fetchItemRequests.mockResolvedValue(okReqs())
    fetchItems.mockResolvedValue({ rows: [], ok: false, error: 'Nomenklatura yüklənmədi' })
    expect(await store().load()).toEqual({ ok: false, error: 'Nomenklatura yüklənmədi' })
    expect(store().loaded).toBe(false)
    expect(store().requests).toEqual([])
  })
})

describe('M12-14 — a failed REFRESH retains the previous snapshot', () => {
  it('keeps the previous complete rows and raises only the error flag; recovery clears it', async () => {
    fetchItemRequests.mockResolvedValue(okReqs([req({ id: 'first' })]))
    fetchItems.mockResolvedValue(okItems())
    await store().load()
    expect(store().loaded).toBe(true)

    fetchItemRequests.mockResolvedValue({ rows: [], ok: false, error: '503' })
    await store().load()
    /* Retained, not blanked — and still `loaded`, so the page shows the stale
       tag rather than the first-load error block. */
    expect(store().requests.map((r) => r.id)).toEqual(['first'])
    expect(store().loaded).toBe(true)
    expect(store().error).toBe('503')

    fetchItemRequests.mockResolvedValue(okReqs([req({ id: 'second' })]))
    await store().load()
    expect(store().requests.map((r) => r.id)).toEqual(['second'])
    expect(store().error).toBeNull()
  })
})

describe('M12-15 — a stale reply never overwrites a newer one', () => {
  it('an older SUCCESS settling after a newer success is discarded', async () => {
    const slow = deferred<ReturnType<typeof okReqs>>()
    fetchItems.mockResolvedValue(okItems())
    fetchItemRequests.mockReturnValueOnce(slow.promise)

    const first = store().load()

    fetchItemRequests.mockResolvedValue(okReqs([req({ id: 'newer' })]))
    await store().load()
    expect(store().requests.map((r) => r.id)).toEqual(['newer'])

    slow.resolve(okReqs([req({ id: 'older' })]))
    await first
    /* The newer generation stands. */
    expect(store().requests.map((r) => r.id)).toEqual(['newer'])
  })

  it('an older FAILURE settling after a newer success does not raise the error flag', async () => {
    const slow = deferred<{ rows: ItemRequestView[]; ok: boolean; error: string | null }>()
    fetchItems.mockResolvedValue(okItems())
    fetchItemRequests.mockReturnValueOnce(slow.promise)

    const first = store().load()

    fetchItemRequests.mockResolvedValue(okReqs([req({ id: 'newer' })]))
    await store().load()

    slow.resolve({ rows: [], ok: false, error: 'stale 503' })
    expect(await first).toEqual({ ok: false, error: 'stale 503' })
    /* Reported to ITS OWN caller, but never applied to the store. */
    expect(store().error).toBeNull()
    expect(store().requests.map((r) => r.id)).toEqual(['newer'])
    expect(store().loaded).toBe(true)
  })
})

describe('M12-17 — filters live in the store and survive a reload', () => {
  it('defaults to the pending segment and an empty query', () => {
    expect(store().filters).toEqual({ q: '', status: 'pending' })
  })

  it('patches one field without disturbing the other, and survives a reload', async () => {
    store().setFilters({ status: '' })
    store().setFilters({ q: 'kabel' })
    expect(store().filters).toEqual({ q: 'kabel', status: '' })

    fetchItemRequests.mockResolvedValue(okReqs())
    fetchItems.mockResolvedValue(okItems())
    await store().load()
    expect(store().filters).toEqual({ q: 'kabel', status: '' })
  })
})
