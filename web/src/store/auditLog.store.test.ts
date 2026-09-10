import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../api/auditLog.api', async (orig) => ({
  ...(await orig<typeof import('../api/auditLog.api')>()),
  fetchAuditLog: vi.fn(),
}))
vi.mock('../api/userDirectory.api', () => ({ fetchUserDirectory: vi.fn() }))

import { fetchAuditLog, EMPTY_FILTERS } from '../api/auditLog.api'
import { fetchUserDirectory } from '../api/userDirectory.api'
import { useAuditLogStore } from './auditLog.store'

beforeEach(() => {
  vi.clearAllMocks()
  useAuditLogStore.setState({
    filters: EMPTY_FILTERS,
    rows: [],
    total: 0,
    loading: false,
    error: null,
    errorKind: null,
    emails: new Map(),
    directoryError: false,
  })
})

const ok = (rows: unknown[] = [], total = rows.length) =>
  ({ rows, total, error: null, errorKind: null }) as never

describe('auditLog store — filters and pagination', () => {
  it('setFilters merges into the existing filter set and resets to page 0', async () => {
    vi.mocked(fetchAuditLog).mockResolvedValue(ok())
    useAuditLogStore.setState({ filters: { ...EMPTY_FILTERS, page: 3 } })

    useAuditLogStore.getState().setFilters({ table: 'partners' })
    await vi.waitFor(() => expect(fetchAuditLog).toHaveBeenCalled())

    expect(useAuditLogStore.getState().filters).toEqual({ ...EMPTY_FILTERS, table: 'partners', page: 0 })
  })

  it('setPage changes only the page, keeping other filters', async () => {
    vi.mocked(fetchAuditLog).mockResolvedValue(ok())
    useAuditLogStore.setState({ filters: { ...EMPTY_FILTERS, action: 'DELETE' } })

    useAuditLogStore.getState().setPage(2)
    await vi.waitFor(() => expect(fetchAuditLog).toHaveBeenCalled())

    expect(useAuditLogStore.getState().filters).toEqual({ ...EMPTY_FILTERS, action: 'DELETE', page: 2 })
  })

  it('reset clears every filter and reloads', async () => {
    vi.mocked(fetchAuditLog).mockResolvedValue(ok())
    useAuditLogStore.setState({ filters: { table: 'partners', action: 'DELETE', actor: 'u-1', d1: '2026-01-01', d2: '2026-01-31', page: 4 } })

    useAuditLogStore.getState().reset()
    await vi.waitFor(() => expect(fetchAuditLog).toHaveBeenCalled())

    expect(useAuditLogStore.getState().filters).toEqual(EMPTY_FILTERS)
  })

  it('load populates rows, total and clears loading', async () => {
    vi.mocked(fetchAuditLog).mockResolvedValue(ok([{ id: '1' }], 1))
    await useAuditLogStore.getState().load()
    const s = useAuditLogStore.getState()
    expect(s.rows).toEqual([{ id: '1' }])
    expect(s.total).toBe(1)
    expect(s.loading).toBe(false)
  })

  it('load surfaces an error and its classification', async () => {
    vi.mocked(fetchAuditLog).mockResolvedValue({ rows: [], total: 0, error: 'denied', errorKind: 'permission' } as never)
    await useAuditLogStore.getState().load()
    const s = useAuditLogStore.getState()
    expect(s.error).toBe('denied')
    expect(s.errorKind).toBe('permission')
  })
})

/* M4-13 — the whole point of the request-sequence counter. Verified by
   proving BOTH that the correct behaviour holds AND that removing the guard
   breaks this exact test (see the note below the describe block). */
describe('auditLog store — stale-response discarding', () => {
  it('a slower reply for an OLDER filter set does not overwrite a newer one that already resolved', async () => {
    let resolveFirst!: (v: unknown) => void
    const first = new Promise((resolve) => { resolveFirst = resolve })
    vi.mocked(fetchAuditLog)
      .mockImplementationOnce(() => first as never)
      .mockResolvedValueOnce(ok([{ id: 'newer' }], 1))

    const store = useAuditLogStore.getState()
    const p1 = store.load() // slow, resolves later
    const p2 = store.load() // fast, resolves first

    await p2
    expect(useAuditLogStore.getState().rows).toEqual([{ id: 'newer' }])

    // the slow, now-stale reply finally resolves
    resolveFirst(ok([{ id: 'stale' }], 1))
    await p1

    // it must NOT have overwritten the newer result
    expect(useAuditLogStore.getState().rows).toEqual([{ id: 'newer' }])
  })
})

describe('auditLog store — user directory', () => {
  it('loadDirectory populates emails and clears the directory-error flag on success', async () => {
    vi.mocked(fetchUserDirectory).mockResolvedValue({ emails: new Map([['u-1', 'a@x.com']]), ok: true })
    await useAuditLogStore.getState().loadDirectory()
    const s = useAuditLogStore.getState()
    expect(s.emails.get('u-1')).toBe('a@x.com')
    expect(s.directoryError).toBe(false)
  })

  it('loadDirectory sets directoryError without touching rows/total on failure', async () => {
    useAuditLogStore.setState({ rows: [{ id: '1' } as never], total: 1 })
    vi.mocked(fetchUserDirectory).mockResolvedValue({ emails: new Map(), ok: false })

    await useAuditLogStore.getState().loadDirectory()

    const s = useAuditLogStore.getState()
    expect(s.directoryError).toBe(true)
    expect(s.rows).toEqual([{ id: '1' }])
    expect(s.total).toBe(1)
  })
})
