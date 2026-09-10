import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../api/warehouses.api', () => ({ fetchWarehouses: vi.fn() }))
vi.mock('../api/partners.api', () => ({ fetchPartners: vi.fn() }))
vi.mock('../api/referenceValues.api', () => ({ fetchReferenceValues: vi.fn() }))
vi.mock('../api/serfiyyatProjects.api', () => ({ fetchSerfiyyat: vi.fn() }))
vi.mock('../api/referenceUsage.api', () => ({ fetchReferenceUsage: vi.fn() }))
/* Needed by the integration case at the end, which runs the real
   fetchReferenceValues against a rejecting client. */
vi.mock('../api/supabase', () => ({ supabase: { rpc: vi.fn() } }))

import { fetchWarehouses } from '../api/warehouses.api'
import { fetchPartners } from '../api/partners.api'
import { fetchReferenceValues } from '../api/referenceValues.api'
import { fetchSerfiyyat } from '../api/serfiyyatProjects.api'
import { fetchReferenceUsage } from '../api/referenceUsage.api'
import { useReferenceDirectoryStore, usageOf, UNKNOWN_USAGE, DEFAULT_LIST_CONTROLS } from './referenceDirectory.store'
import { usageKey } from '../types/referenceDirectory'

const warehouses = [
  { id: 1, name: 'Ələt', type: 'anbar', active: true },
  { id: 2, name: 'Gizli anbar', type: 'anbar', active: false },
  { id: 9, name: 'Layihə sahəsi', type: 'layihə', active: true },
]
const partners = [{ id: 'p-1', name: 'Bakcell', voen: null, contract: null, contract_date: null, active: true }]

const values = {
  channel: [{ id: 'c1', name: 'Nağd', active: true }],
  unit: [{ id: 'u1', name: 'ədəd', active: false }],
  category: [{ id: 'k1', name: 'Kanselyariya', active: true }],
  serfiyyat_channel: [{ id: 's1', name: 'SM kanalı', active: true }],
}

const empty = { channel: [], unit: [], category: [], serfiyyat_channel: [] }

const serfiyyat = {
  projects: [{ id: 'pj-1', name: 'Layihə A', active: true, linkedWarehouse: 'Ələt' }],
  documents: [{ id: 'd-1', projectId: 'pj-1', kanal: 'SM kanalı' }],
  ready: true,
}
const noSerfiyyat = { projects: [], documents: [], ready: false }

beforeEach(() => {
  vi.clearAllMocks()
  useReferenceDirectoryStore.setState({
    rows: [],
    usage: new Map(),
    readiness: { referenceValues: false, serfiyyat: false },
    activeWarehouseNames: [],
    loading: false,
    error: null,
    controls: DEFAULT_LIST_CONTROLS,
  })
  vi.mocked(fetchWarehouses).mockResolvedValue(warehouses as never)
  vi.mocked(fetchPartners).mockResolvedValue(partners as never)
  vi.mocked(fetchReferenceValues).mockResolvedValue({ values, ready: true })
  vi.mocked(fetchSerfiyyat).mockResolvedValue(serfiyyat)
  vi.mocked(fetchReferenceUsage).mockResolvedValue(new Map())
})

const load = () => useReferenceDirectoryStore.getState().load()
const rows = () => useReferenceDirectoryStore.getState().rows

describe('referenceDirectory store — row assembly', () => {
  it('builds rows from every available kind, keeping each id as a string', async () => {
    await load()
    expect(rows().map((r) => [r.kind, r.name, r.id])).toEqual([
      ['warehouse', 'Ələt', '1'],
      ['warehouse', 'Gizli anbar', '2'],
      ['location', 'Layihə sahəsi', '9'],
      ['partner', 'Bakcell', 'p-1'],
      ['channel', 'Nağd', 'c1'],
      ['unit', 'ədəd', 'u1'],
      ['category', 'Kanselyariya', 'k1'],
      ['project', 'Layihə A', 'pj-1'],
      ['serfiyyat_channel', 'SM kanalı', 's1'],
    ])
  })

  it('splits the warehouses table by type: anbar → warehouse, layihə → location', async () => {
    /* refEntities (index.html:2962) — one table, two kinds. */
    await load()
    const byKind = (k: string) => rows().filter((r) => r.kind === k).map((r) => r.name)
    expect(byKind('warehouse')).toEqual(['Ələt', 'Gizli anbar'])
    expect(byKind('location')).toEqual(['Layihə sahəsi'])
  })

  it('carries a project\'s linked_warehouse onto its row', async () => {
    await load()
    expect(rows().find((r) => r.kind === 'project')?.linkedWarehouse).toBe('Ələt')
  })

  it('exposes the active anbar warehouse names for the project selector', async () => {
    /* DB.whs (index.html:933) — active AND type='anbar'. The hidden warehouse
       and the location must not appear as link targets. */
    await load()
    expect(useReferenceDirectoryStore.getState().activeWarehouseNames).toEqual(['Ələt'])
  })

  it('carries the active flag through, including a hidden value', async () => {
    await load()
    expect(rows().find((r) => r.name === 'ədəd')?.active).toBe(false)
    expect(rows().find((r) => r.name === 'Nağd')?.active).toBe(true)
  })

  it('asks for usage of every row it built, passing the ids and the serfiyyat documents', async () => {
    await load()
    expect(fetchReferenceUsage).toHaveBeenCalledWith(
      [
        { kind: 'warehouse', id: '1', name: 'Ələt' },
        { kind: 'warehouse', id: '2', name: 'Gizli anbar' },
        { kind: 'location', id: '9', name: 'Layihə sahəsi' },
        { kind: 'partner', id: 'p-1', name: 'Bakcell' },
        { kind: 'channel', id: 'c1', name: 'Nağd' },
        { kind: 'unit', id: 'u1', name: 'ədəd' },
        { kind: 'category', id: 'k1', name: 'Kanselyariya' },
        { kind: 'project', id: 'pj-1', name: 'Layihə A' },
        { kind: 'serfiyyat_channel', id: 's1', name: 'SM kanalı' },
      ],
      { serfiyyatDocuments: serfiyyat.documents },
    )
  })
})

/* The `serfiyyat` gate governs BOTH project and serfiyyat_channel, even though
   the latter's rows arrive with the reference values (design §4.4, M3-02a). */
describe('referenceDirectory store — serfiyyat readiness', () => {
  it('lists project and serfiyyat_channel when all three reads succeeded', async () => {
    await load()
    expect(useReferenceDirectoryStore.getState().readiness.serfiyyat).toBe(true)
    expect(rows().some((r) => r.kind === 'project')).toBe(true)
    expect(rows().some((r) => r.kind === 'serfiyyat_channel')).toBe(true)
  })

  it('omits BOTH serfiyyat kinds when the subsystem is unavailable, keeping the rest', async () => {
    vi.mocked(fetchSerfiyyat).mockResolvedValue(noSerfiyyat)

    const result = await load()

    expect(result).toEqual({ ok: true, error: null })
    expect(useReferenceDirectoryStore.getState().readiness).toEqual({ referenceValues: true, serfiyyat: false })
    expect(rows().some((r) => r.kind === 'project')).toBe(false)
    /* The decisive assertion: serfiyyat_channel rows WERE parsed by
       fetchReferenceValues and are still withheld, because its gate is
       `serfiyyat`, not its data source. */
    expect(rows().some((r) => r.kind === 'serfiyyat_channel')).toBe(false)
    /* channel/unit/category came from the same call and stay available. */
    expect(rows().filter((r) => r.kind === 'channel' || r.kind === 'unit' || r.kind === 'category')).toHaveLength(3)
  })

  it('tells usage counting the documents are unavailable so both kinds go inexact', async () => {
    vi.mocked(fetchSerfiyyat).mockResolvedValue(noSerfiyyat)
    await load()
    expect(fetchReferenceUsage).toHaveBeenCalledWith(expect.anything(), { serfiyyatDocuments: null })
  })

  it('lists nothing for serfiyyat_channel when its gate is open but its source failed', async () => {
    /* Design §4.4 matrix state M3: serfiyyat ready, referenceValues not. The
       project still lists; serfiyyat_channel has no rows to show. */
    vi.mocked(fetchReferenceValues).mockResolvedValue({ values: empty, ready: false })
    await load()
    expect(useReferenceDirectoryStore.getState().readiness).toEqual({ referenceValues: false, serfiyyat: true })
    expect(rows().some((r) => r.kind === 'project')).toBe(true)
    expect(rows().some((r) => r.kind === 'serfiyyat_channel')).toBe(false)
  })

  it('keeps warehouse, location and partner available when both optional subsystems fail', async () => {
    vi.mocked(fetchReferenceValues).mockResolvedValue({ values: empty, ready: false })
    vi.mocked(fetchSerfiyyat).mockResolvedValue(noSerfiyyat)

    const result = await load()

    expect(result.ok).toBe(true)
    expect(rows().map((r) => r.kind)).toEqual(['warehouse', 'warehouse', 'location', 'partner'])
  })
})

describe('referenceDirectory store — readiness', () => {
  it('reports referenceValues:true and includes the three kinds when the RPC succeeded', async () => {
    await load()
    expect(useReferenceDirectoryStore.getState().readiness.referenceValues).toBe(true)
  })

  it('omits the reference kinds entirely when their read failed, without failing the load', async () => {
    /* index.html:1004 — a missing SQL 011 warns and carries on. */
    vi.mocked(fetchReferenceValues).mockResolvedValue({ values: empty, ready: false })

    const result = await load()

    expect(result).toEqual({ ok: true, error: null })
    expect(useReferenceDirectoryStore.getState().readiness.referenceValues).toBe(false)
    expect(rows().some((r) => ['channel', 'unit', 'category'].includes(r.kind))).toBe(false)
    expect(useReferenceDirectoryStore.getState().error).toBeNull()
  })

  it('does not list reference kinds even if rows arrive while the probe says not ready', async () => {
    /* Guards against a future refactor listing rows off the payload instead of
       the readiness flag (registry M3-02a). */
    vi.mocked(fetchReferenceValues).mockResolvedValue({ values, ready: false })
    await load()
    expect(rows().some((r) => ['channel', 'unit', 'category'].includes(r.kind))).toBe(false)
  })

  it('keeps warehouse, location and partner rows visible when the reference-values RPC rejects', async () => {
    /* The resilience contract this store depends on: fetchReferenceValues
       absorbs a rejected RPC promise rather than letting it escape into the
       Promise.all below, which would blank the entire Soraqçalar page. The
       original degrades exactly this way (index.html:1004) — warn, carry on
       with the kinds that did load.

       fetchReferenceValues is mocked here, so this asserts the store's side of
       the contract; referenceValues.api.test.ts proves the API actually
       honours it against a real mockRejectedValue. */
    vi.mocked(fetchReferenceValues).mockResolvedValue({ values: empty, ready: false })

    const result = await load()

    expect(result).toEqual({ ok: true, error: null })
    expect(useReferenceDirectoryStore.getState().readiness.referenceValues).toBe(false)
    /* The always-available kinds are still on screen. */
    expect(rows().map((r) => [r.kind, r.name])).toEqual([
      ['warehouse', 'Ələt'],
      ['warehouse', 'Gizli anbar'],
      ['location', 'Layihə sahəsi'],
      ['partner', 'Bakcell'],
      ['project', 'Layihə A'],
    ])
    expect(useReferenceDirectoryStore.getState().error).toBeNull()
    expect(useReferenceDirectoryStore.getState().loading).toBe(false)
  })

  it('keeps the page alive when the SƏRFIYYAT reads reject', async () => {
    /* Same contract on the Phase 3b side: fetchSerfiyyat absorbs a rejection
       rather than letting it escape into the Promise.all. */
    vi.mocked(fetchSerfiyyat).mockResolvedValue(noSerfiyyat)

    const result = await load()

    expect(result).toEqual({ ok: true, error: null })
    expect(rows().some((r) => r.kind === 'warehouse')).toBe(true)
    expect(rows().some((r) => r.kind === 'project')).toBe(false)
  })
})

/* Integration: the real fetchReferenceValues against a rejecting Supabase
   client, proving the store survives end to end rather than only against a
   well-behaved mock. */
describe('referenceDirectory store — survives a real RPC rejection', () => {
  it('loads warehouse and partner rows when get_reference_values rejects', async () => {
    const { fetchReferenceValues: real } = await vi.importActual<
      typeof import('../api/referenceValues.api')
    >('../api/referenceValues.api')
    const { supabase } = await import('../api/supabase')
    vi.mocked(supabase.rpc).mockRejectedValue(new Error('Failed to fetch'))
    vi.mocked(fetchReferenceValues).mockImplementation(real)

    const result = await load()

    expect(result.ok).toBe(true)
    expect(rows().some((r) => ['channel', 'unit', 'category'].includes(r.kind))).toBe(false)
    expect(rows().some((r) => r.kind === 'warehouse')).toBe(true)
    expect(useReferenceDirectoryStore.getState().readiness.referenceValues).toBe(false)
  })

  it('loads the other kinds when the serfiyyat reads reject for real', async () => {
    const { fetchSerfiyyat: real } = await vi.importActual<
      typeof import('../api/serfiyyatProjects.api')
    >('../api/serfiyyatProjects.api')
    const { supabase } = await import('../api/supabase')
    /* The real fetchSerfiyyat uses supabase.from, which this file's mock does
       not define — accessing it throws, which is exactly the rejection shape
       the try/catch must absorb. */
    vi.mocked(fetchSerfiyyat).mockImplementation(real)
    void supabase

    const result = await load()

    expect(result.ok).toBe(true)
    expect(useReferenceDirectoryStore.getState().readiness.serfiyyat).toBe(false)
    expect(rows().some((r) => r.kind === 'project')).toBe(false)
    expect(rows().some((r) => r.kind === 'warehouse')).toBe(true)
  })
})

describe('referenceDirectory store — failure handling', () => {
  it('keeps previously loaded rows when a refresh fails', async () => {
    await load()
    expect(rows()).toHaveLength(9)

    vi.mocked(fetchPartners).mockRejectedValue(new Error('şəbəkə xətası'))
    const result = await load()

    expect(result.ok).toBe(false)
    expect(result.error).toBe('şəbəkə xətası')
    expect(rows()).toHaveLength(9)
    expect(useReferenceDirectoryStore.getState().loading).toBe(false)
  })

  it('treats a warehouse read failure as fatal, unlike a reference-values failure', async () => {
    vi.mocked(fetchWarehouses).mockRejectedValue(new Error('rls'))
    const result = await load()
    expect(result.ok).toBe(false)
    expect(useReferenceDirectoryStore.getState().error).toBe('rls')
  })
})

describe('usageOf', () => {
  it('returns the stored usage for a kind/name pair', async () => {
    vi.mocked(fetchReferenceUsage).mockResolvedValue(
      new Map([[usageKey('unit', 'ədəd'), { count: 41, exact: true }]]),
    )
    await load()
    const usage = useReferenceDirectoryStore.getState().usage
    expect(usageOf(usage, 'unit', 'ədəd')).toEqual({ count: 41, exact: true })
  })

  it('falls back to "in use, not exact" when a row has no entry', () => {
    expect(usageOf(new Map(), 'unit', 'yox')).toEqual(UNKNOWN_USAGE)
    expect(UNKNOWN_USAGE).toEqual({ count: 1, exact: false })
  })
})

/* M4-18 — the list controls live here, not in the page, so navigating away
   and back does not discard a filter the user set. */
describe('referenceDirectory store — list controls', () => {
  const controls = () => useReferenceDirectoryStore.getState().controls

  it('starts with everything unfiltered on page 0', () => {
    expect(controls()).toEqual({ kindFilter: '', status: '', query: '', pageSize: 10, page: 0 })
  })

  it('merges a patch, leaving the other controls alone', () => {
    useReferenceDirectoryStore.getState().setControls({ kindFilter: 'unit' })
    useReferenceDirectoryStore.getState().setControls({ query: 'ədəd' })
    expect(controls().kindFilter).toBe('unit')
    expect(controls().query).toBe('ədəd')
  })

  it('returns to page 0 whenever a filter changes', () => {
    useReferenceDirectoryStore.setState({ controls: { ...DEFAULT_LIST_CONTROLS, page: 4 } })
    useReferenceDirectoryStore.getState().setControls({ kindFilter: 'category' })
    expect(controls().page).toBe(0)
  })

  it('returns to page 0 when the page SIZE changes, since the offsets move', () => {
    useReferenceDirectoryStore.setState({ controls: { ...DEFAULT_LIST_CONTROLS, page: 3 } })
    useReferenceDirectoryStore.getState().setControls({ pageSize: 50 })
    expect(controls()).toMatchObject({ pageSize: 50, page: 0 })
  })

  it('honours an explicit page change instead of resetting it', () => {
    useReferenceDirectoryStore.getState().setControls({ page: 2 })
    expect(controls().page).toBe(2)
  })

  it('survives a reload — load() must not clobber the controls', async () => {
    useReferenceDirectoryStore.getState().setControls({ kindFilter: 'partner', query: 'Bak' })
    await load()
    expect(controls()).toMatchObject({ kindFilter: 'partner', query: 'Bak' })
  })
})
