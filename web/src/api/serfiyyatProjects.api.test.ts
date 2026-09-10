import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('./supabase', () => ({ supabase: { from: vi.fn() } }))

import { supabase } from './supabase'
import { fetchSerfiyyat } from './serfiyyatProjects.api'

beforeEach(() => vi.clearAllMocks())

interface TableMock {
  data?: unknown[]
  error?: unknown
}
interface Mocks {
  serfiyyat_projects?: TableMock
  serfiyyat_documents?: TableMock
  serfiyyat_lines?: TableMock
}

const readTables: string[] = []
const selectedColumns: Record<string, string> = {}

function mockTables(mocks: Mocks) {
  readTables.length = 0
  vi.mocked(supabase.from).mockImplementation(((table: string) => ({
    select: (columns: string) => {
      readTables.push(table)
      selectedColumns[table] = columns
      const source = mocks[table as keyof Mocks] ?? { data: [] }
      return {
        order: () => ({
          range: () => Promise.resolve({ data: source.data ?? null, error: source.error ?? null }),
        }),
      }
    },
  })) as never)
}

const project = (over: Record<string, unknown> = {}) => ({
  id: 'pj-1', name: 'Layihə A', active: true, linked_warehouse: null, ...over,
})
const doc = (over: Record<string, unknown> = {}) => ({
  id: 'd-1', project_id: 'pj-1', alinma_kanali: null, ...over,
})

const ERR = { error: { message: 'relation does not exist' } }

describe('fetchSerfiyyat — reads and mapping', () => {
  it('reads all three serfiyyat tables', async () => {
    mockTables({})
    await fetchSerfiyyat()
    expect(readTables.sort()).toEqual(['serfiyyat_documents', 'serfiyyat_lines', 'serfiyyat_projects'])
  })

  it('maps projects, defaulting a null linked_warehouse to an empty string', async () => {
    mockTables({
      serfiyyat_projects: {
        data: [project(), project({ id: 'pj-2', name: 'Layihə B', linked_warehouse: 'Astara' })],
      },
    })
    const { projects, ready } = await fetchSerfiyyat()
    expect(ready).toBe(true)
    expect(projects).toEqual([
      { id: 'pj-1', name: 'Layihə A', active: true, linkedWarehouse: '' },
      { id: 'pj-2', name: 'Layihə B', active: true, linkedWarehouse: 'Astara' },
    ])
  })

  it('keeps inactive projects — an admin manages hidden values from this screen', async () => {
    mockTables({ serfiyyat_projects: { data: [project({ active: false })] } })
    const { projects } = await fetchSerfiyyat()
    expect(projects[0].active).toBe(false)
  })

  it('treats a null active as active, like the original', async () => {
    mockTables({ serfiyyat_projects: { data: [project({ active: null })] } })
    const { projects } = await fetchSerfiyyat()
    expect(projects[0].active).toBe(true)
  })

  it('maps documents to the fields usage counting needs', async () => {
    mockTables({
      serfiyyat_documents: { data: [doc({ id: 'd-9', project_id: 'pj-3', alinma_kanali: 'SM kanalı' })] },
    })
    const { documents } = await fetchSerfiyyat()
    expect(documents).toEqual([{ id: 'd-9', projectId: 'pj-3', kanal: 'SM kanalı' }])
  })

  it('reads serfiyyat_lines as a bare existence probe — none of its columns are used', async () => {
    mockTables({ serfiyyat_lines: { data: [{ id: 'l-1' }] } })
    const result = await fetchSerfiyyat()
    /* Only `id` is requested; qty/price/line_sum belong to the later
       Sərfiyyat documents phase, not to this directory screen. */
    expect(selectedColumns['serfiyyat_lines']).toBe('id')
    expect(Object.keys(result)).toEqual(['projects', 'documents', 'ready'])
  })
})

/* Design §5.1.1 — the `serfiyyat` flag is the AND of three independent reads.
   Each must be shown to veto it alone, or a refactor could drop one read
   without any test failing. */
describe('fetchSerfiyyat — readiness sub-matrix (S1-S5)', () => {
  const rows = {
    serfiyyat_projects: { data: [project()] },
    serfiyyat_documents: { data: [doc()] },
    serfiyyat_lines: { data: [{ id: 'l-1' }] },
  }

  it('S1: all three succeed → ready', async () => {
    mockTables(rows)
    const result = await fetchSerfiyyat()
    expect(result.ready).toBe(true)
    expect(result.projects).toHaveLength(1)
    expect(result.documents).toHaveLength(1)
  })

  it('S2: serfiyyat_projects fails alone → not ready', async () => {
    mockTables({ ...rows, serfiyyat_projects: ERR })
    expect((await fetchSerfiyyat()).ready).toBe(false)
  })

  it('S3: serfiyyat_documents fails alone → not ready', async () => {
    mockTables({ ...rows, serfiyyat_documents: ERR })
    expect((await fetchSerfiyyat()).ready).toBe(false)
  })

  it('S4: serfiyyat_lines fails alone → NOT ready, although no column of it is used', async () => {
    /* The regression test for the readiness correction. Projects and documents
       both loaded and every row the screen needs is in memory, yet the whole
       Sərfiyyat subsystem must still be unavailable, because that is what
       smLoad()'s combined error check does (index.html:6196). An
       implementation that reads only two tables passes S1-S3 and S5 and fails
       only here. */
    mockTables({ ...rows, serfiyyat_lines: ERR })

    const result = await fetchSerfiyyat()

    expect(result.ready).toBe(false)
    /* Not ready means no rows are handed out at all — the caller must not be
       able to render a project whose subsystem is down. */
    expect(result.projects).toEqual([])
    expect(result.documents).toEqual([])
  })

  it('S5: all three fail → not ready', async () => {
    mockTables({ serfiyyat_projects: ERR, serfiyyat_documents: ERR, serfiyyat_lines: ERR })
    expect((await fetchSerfiyyat()).ready).toBe(false)
  })
})

describe('fetchSerfiyyat — failure is readiness, not an exception', () => {
  it('reports ready:false when a read REJECTS, and does not propagate the rejection', async () => {
    /* Same contract as fetchReferenceValues (M3-06a): a rejected promise is a
       distinct failure shape from a returned { error }, and letting it escape
       would break the whole page through the store's Promise.all. */
    vi.mocked(supabase.from).mockImplementation((() => ({
      select: () => ({ order: () => ({ range: () => Promise.reject(new Error('Failed to fetch')) }) }),
    })) as never)

    await expect(fetchSerfiyyat()).resolves.toEqual({ projects: [], documents: [], ready: false })
  })

  it('swallows a non-Error rejection too', async () => {
    vi.mocked(supabase.from).mockImplementation((() => ({
      select: () => ({ order: () => ({ range: () => Promise.reject('offline') }) }),
    })) as never)

    await expect(fetchSerfiyyat()).resolves.toEqual({ projects: [], documents: [], ready: false })
  })
})
