import { beforeEach, describe, expect, it, vi } from 'vitest'

/* T4 — M13-12, M13-13, M13-14, M13-15, M13-17, M13-18, M13-41, M13-74,
   M13-81, M13-82. Unit evidence only; every reader is mocked. */

const fetchSerfiyyatSnapshot = vi.fn()
const fetchItems = vi.fn()
const fetchReferenceValues = vi.fn()

vi.mock('../api/serfiyyatDocuments.api', () => ({ fetchSerfiyyatSnapshot: () => fetchSerfiyyatSnapshot() }))
vi.mock('../api/items.api', () => ({ fetchItems: () => fetchItems() }))
vi.mock('../api/referenceValues.api', () => ({ fetchReferenceValues: () => fetchReferenceValues() }))

import { useSerfiyyatStore } from './serfiyyat.store'
import { EMPTY_FILTERS } from '../lib/serfiyyatFilters'

const PROJECT = { id: 'p1', name: 'Layihə A', wh: 'Test Anbar', active: true }
const DOCUMENT = {
  id: 'd1', num: 'SM-1', projectId: 'p1', kontragent: '', avto: '', kanal: '',
  iv: '', d: '2026-09-11', note: '', by: 'u1', ts: 1,
}
const LINE = { id: 'l1', docId: 'd1', code: '0000001', qty: 2, price: 5, sum: 10 }
const ITEM = { code: '0000001', name: 'Sement', unit: 'kq', price: 5, category: null }

const okSnap = () => ({ projects: [PROJECT], documents: [DOCUMENT], lines: [LINE], ok: true, error: null })
const failSnap = (error = 'boom') => ({ projects: [], documents: [], lines: [], ok: false, error })
const okItems = () => ({ rows: [ITEM], ok: true, error: null })
const okRefs = (over: { name: string; active: boolean }[] = [{ name: 'Nağd', active: true }]) =>
  ({ values: { channel: [], unit: [], category: [], serfiyyat_channel: over.map((c, i) => ({ id: String(i), ...c })) }, ready: true })
const reset = () => useSerfiyyatStore.setState({
  projects: [], documents: [], lines: [], items: [], itemsByCode: new Map(), channels: [],
  ready: false, loading: false, loaded: false, error: null,
  draft: [], editDocId: null, filters: EMPTY_FILTERS, tab: 'doc',
})

beforeEach(() => {
  vi.clearAllMocks()
  reset()
  fetchSerfiyyatSnapshot.mockResolvedValue(okSnap())
  fetchItems.mockResolvedValue(okItems())
  fetchReferenceValues.mockResolvedValue(okRefs())
})

describe('load — the atomic snapshot (M13-13)', () => {
  it('loads the page snapshot, items and references exactly once', async () => {
    await useSerfiyyatStore.getState().load()
    expect(fetchSerfiyyatSnapshot).toHaveBeenCalledTimes(1)
    expect(fetchItems).toHaveBeenCalledTimes(1)
    expect(fetchReferenceValues).toHaveBeenCalledTimes(1)
  })

  it('applies the complete snapshot and sets readiness on success', async () => {
    const out = await useSerfiyyatStore.getState().load()
    const s = useSerfiyyatStore.getState()
    expect(out).toEqual({ ok: true, error: null })
    expect(s.ready).toBe(true)
    expect(s.loaded).toBe(true)
    expect(s.projects).toEqual([PROJECT])
    expect(s.lines).toEqual([LINE])
    expect(s.itemsByCode.get('0000001')).toEqual(ITEM)
    expect(s.channels).toEqual([{ name: 'Nağd', active: true }])
  })

  it.each([
    ['the serfiyyat snapshot', () => fetchSerfiyyatSnapshot.mockResolvedValue(failSnap())],
    ['the item catalogue', () => fetchItems.mockResolvedValue({ rows: [], ok: false, error: 'items down' })],
  ])('a %s failure applies NOTHING and leaves readiness false', async (_n, fail) => {
    fail()
    const out = await useSerfiyyatStore.getState().load()
    const s = useSerfiyyatStore.getState()
    expect(out.ok).toBe(false)
    expect(s.ready).toBe(false)
    expect(s.loaded).toBe(false)
    expect(s.projects).toEqual([])
    expect(s.documents).toEqual([])
    expect(s.lines).toEqual([])
  })
})

/* M13-12 — THE TWO FAILURE SCOPES MUST NOT MERGE. A reference-values failure
   is non-fatal: the complete core snapshot still applies with an empty
   channel list. The user directory is application-wide and is not fetched by
   this store. */
describe('the reference read is NON-FATAL (M13-12)', () => {
  it('a get_reference_values failure leaves readiness TRUE with an empty channel list', async () => {
    fetchReferenceValues.mockResolvedValue({ values: { channel: [], unit: [], category: [], serfiyyat_channel: [] }, ready: false })
    const out = await useSerfiyyatStore.getState().load()
    const s = useSerfiyyatStore.getState()
    expect(out.ok).toBe(true)
    expect(s.ready).toBe(true)
    /* The complete core snapshot is applied — the negative half of the claim. */
    expect(s.projects).toEqual([PROJECT])
    expect(s.documents).toEqual([DOCUMENT])
    expect(s.lines).toEqual([LINE])
    expect(s.channels).toEqual([])
  })

  it('keeps only the channel name and active flag, including INACTIVE ones', async () => {
    fetchReferenceValues.mockResolvedValue(okRefs([
      { name: 'Nağd', active: true }, { name: 'Köhnə', active: false },
    ]))
    await useSerfiyyatStore.getState().load()
    /* Filtering to active names is the CALLER's rule (M13-30); the store
       carries both so the report can tell them apart. */
    expect(useSerfiyyatStore.getState().channels).toEqual([
      { name: 'Nağd', active: true }, { name: 'Köhnə', active: false },
    ])
  })
})

describe('failed-refresh retention (M13-14)', () => {
  it('retains the previous complete snapshot and raises only the error flag', async () => {
    await useSerfiyyatStore.getState().load()
    fetchSerfiyyatSnapshot.mockResolvedValue(failSnap('refresh failed'))
    const out = await useSerfiyyatStore.getState().load()
    const s = useSerfiyyatStore.getState()
    expect(out.ok).toBe(false)
    expect(s.error).toBe('refresh failed')
    /* The retained data — a failed refresh must NOT blank the screen. */
    expect(s.projects).toEqual([PROJECT])
    expect(s.documents).toEqual([DOCUMENT])
    expect(s.lines).toEqual([LINE])
    expect(s.loaded).toBe(true)
    expect(s.ready).toBe(true)
  })

  it('clears the error on a later successful refresh (recovery)', async () => {
    await useSerfiyyatStore.getState().load()
    fetchSerfiyyatSnapshot.mockResolvedValue(failSnap())
    await useSerfiyyatStore.getState().load()
    expect(useSerfiyyatStore.getState().error).toBeTruthy()
    fetchSerfiyyatSnapshot.mockResolvedValue(okSnap())
    await useSerfiyyatStore.getState().load()
    expect(useSerfiyyatStore.getState().error).toBeNull()
  })
})

/* M13-18 — the stale-reply ticket. An older reply must never overwrite a
   newer one, success AND failure alike. */
describe('stale-response discarding (M13-18)', () => {
  it('discards an older SUCCESS that settles after a newer reply', async () => {
    let releaseOld: (v: unknown) => void = () => {}
    const oldSnap = { ...okSnap(), documents: [{ ...DOCUMENT, id: 'OLD', num: 'SM-OLD' }] }
    fetchSerfiyyatSnapshot.mockReturnValueOnce(new Promise((r) => { releaseOld = r }))

    const first = useSerfiyyatStore.getState().load()
    fetchSerfiyyatSnapshot.mockResolvedValue(okSnap())
    await useSerfiyyatStore.getState().load()
    releaseOld(oldSnap)
    await first

    expect(useSerfiyyatStore.getState().documents[0].id).toBe('d1')
  })

  it('discards an older FAILURE that settles after a newer success', async () => {
    let releaseOld: (v: unknown) => void = () => {}
    fetchSerfiyyatSnapshot.mockReturnValueOnce(new Promise((r) => { releaseOld = r }))

    const first = useSerfiyyatStore.getState().load()
    fetchSerfiyyatSnapshot.mockResolvedValue(okSnap())
    await useSerfiyyatStore.getState().load()
    releaseOld(failSnap('late failure'))
    await first

    const s = useSerfiyyatStore.getState()
    expect(s.error).toBeNull()
    expect(s.documents).toEqual([DOCUMENT])
  })
})

/* M13-15, M13-17 — the draft, edit target, filters and tab live in the STORE,
   so they survive the page unmounting and remounting. */
describe('the long-lived SM slice (M13-15, M13-17)', () => {
  it('holds draft lines and appends in order', () => {
    const { addDraftLine } = useSerfiyyatStore.getState()
    addDraftLine({ code: 'a', qty: 1, price: 1 })
    addDraftLine({ code: 'b', qty: 2, price: 2 })
    expect(useSerfiyyatStore.getState().draft.map((l) => l.code)).toEqual(['a', 'b'])
  })

  /* M13-41 — removal is BY INDEX and never re-sorts or renumbers. */
  it('removes a draft line by index, leaving the others in order', () => {
    useSerfiyyatStore.getState().setDraft([
      { code: 'a', qty: 1, price: 1 }, { code: 'b', qty: 2, price: 2 }, { code: 'c', qty: 3, price: 3 },
    ])
    useSerfiyyatStore.getState().removeDraftLine(1)
    expect(useSerfiyyatStore.getState().draft.map((l) => l.code)).toEqual(['a', 'c'])
  })

  it('removes the correct row when two lines share a code (index, not identity)', () => {
    useSerfiyyatStore.getState().setDraft([
      { code: 'a', qty: 1, price: 1 }, { code: 'a', qty: 9, price: 9 },
    ])
    useSerfiyyatStore.getState().removeDraftLine(0)
    expect(useSerfiyyatStore.getState().draft).toEqual([{ code: 'a', qty: 9, price: 9 }])
  })

  /* M13-74 — «Düzəliş» seeds the draft, sets the edit target and forces the
     `doc` tab, while deliberately LEAVING the filters alone. */
  it('openEdit seeds the draft, sets editDocId and switches to the doc tab', () => {
    useSerfiyyatStore.getState().setFilters({ ...EMPTY_FILTERS, proj: 'Layihə A' })
    useSerfiyyatStore.getState().setTab('rep')
    useSerfiyyatStore.getState().openEdit('d1', [{ code: 'x', qty: 1, price: 2 }])
    const s = useSerfiyyatStore.getState()
    expect(s.editDocId).toBe('d1')
    expect(s.draft).toEqual([{ code: 'x', qty: 1, price: 2 }])
    expect(s.tab).toBe('doc')
    /* The filter state is NOT lost — an admin who was filtering keeps it. */
    expect(s.filters.proj).toBe('Layihə A')
  })

  it('cancelEdit and clearDraft both clear the draft and the edit target', () => {
    useSerfiyyatStore.getState().openEdit('d1', [{ code: 'x', qty: 1, price: 2 }])
    useSerfiyyatStore.getState().cancelEdit()
    expect(useSerfiyyatStore.getState()).toMatchObject({ editDocId: null, draft: [] })

    useSerfiyyatStore.getState().openEdit('d2', [{ code: 'y', qty: 1, price: 2 }])
    useSerfiyyatStore.getState().clearDraft()
    expect(useSerfiyyatStore.getState()).toMatchObject({ editDocId: null, draft: [] })
  })

  /* M13-81, M13-82 — filters apply as one snapshot and «Təmizlə» resets all. */
  it('setFilters applies one snapshot and clearFilters resets every field', () => {
    useSerfiyyatStore.getState().setFilters({ ...EMPTY_FILTERS, proj: 'A', item: 'sement', p2: '0' })
    expect(useSerfiyyatStore.getState().filters).toMatchObject({ proj: 'A', item: 'sement', p2: '0' })
    useSerfiyyatStore.getState().clearFilters()
    expect(useSerfiyyatStore.getState().filters).toEqual(EMPTY_FILTERS)
  })

  it('survives a load: the draft, filters and edit target are not reset by a refresh', async () => {
    useSerfiyyatStore.getState().openEdit('d1', [{ code: 'x', qty: 1, price: 2 }])
    useSerfiyyatStore.getState().setFilters({ ...EMPTY_FILTERS, item: 'sement' })
    await useSerfiyyatStore.getState().load()
    const s = useSerfiyyatStore.getState()
    expect(s.draft).toEqual([{ code: 'x', qty: 1, price: 2 }])
    expect(s.editDocId).toBe('d1')
    expect(s.filters.item).toBe('sement')
  })

  it('defaults to the doc tab and switches on demand (M13-16)', () => {
    expect(useSerfiyyatStore.getState().tab).toBe('doc')
    useSerfiyyatStore.getState().setTab('rep')
    expect(useSerfiyyatStore.getState().tab).toBe('rep')
  })
})
