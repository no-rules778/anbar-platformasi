import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('./supabase', () => ({ supabase: { from: vi.fn() } }))

import { supabase } from './supabase'
import { fetchAuditLog, EMPTY_FILTERS, AUDIT_PAGE_SIZE, type AuditFilters } from './auditLog.api'

beforeEach(() => vi.clearAllMocks())

/* A recording query builder — captures every clause called so the test can
   assert exactly which PostgREST calls a given filter set produces, in order.
   Each method returns `this` (a real chainable query) except the terminal
   `.range()`, which resolves the mocked result — matching the real
   supabase-js builder's shape closely enough for this module. */
interface Call { method: string; args: unknown[] }

function mockQuery(result: { data?: unknown[] | null; error?: unknown; count?: number | null }) {
  const calls: Call[] = []
  const builder: Record<string, unknown> = {}
  const chain = (method: string) => (...args: unknown[]) => {
    calls.push({ method, args })
    return builder
  }
  builder.select = chain('select')
  builder.eq = chain('eq')
  builder.is = chain('is')
  builder.gte = chain('gte')
  builder.lte = chain('lte')
  builder.order = chain('order')
  builder.range = (...args: unknown[]) => {
    calls.push({ method: 'range', args })
    return Promise.resolve({ data: result.data ?? null, error: result.error ?? null, count: result.count ?? null })
  }
  vi.mocked(supabase.from).mockReturnValue(builder as never)
  return calls
}

const filters = (over: Partial<AuditFilters> = {}): AuditFilters => ({ ...EMPTY_FILTERS, ...over })

describe('fetchAuditLog — filters become server-side clauses', () => {
  it('applies no filter clause when every filter is empty', async () => {
    const calls = mockQuery({ data: [], count: 0 })
    await fetchAuditLog(filters())
    expect(calls.map((c) => c.method)).toEqual(['select', 'order', 'range'])
  })

  it('applies table_name, action, actor(id), and both date bounds together', async () => {
    const calls = mockQuery({ data: [], count: 0 })
    await fetchAuditLog(filters({ table: 'partners', action: 'UPDATE', actor: 'u-1', d1: '2026-01-01', d2: '2026-01-31' }))
    const byMethod = (m: string) => calls.filter((c) => c.method === m)
    expect(byMethod('eq')).toEqual([
      { method: 'eq', args: ['table_name', 'partners'] },
      { method: 'eq', args: ['action', 'UPDATE'] },
      { method: 'eq', args: ['user_id', 'u-1'] },
    ])
    expect(byMethod('gte')).toEqual([{ method: 'gte', args: ['ts', '2026-01-01T00:00:00'] }])
    expect(byMethod('lte')).toEqual([{ method: 'lte', args: ['ts', '2026-01-31T23:59:59'] }])
  })

  it('maps the "__null" actor sentinel to is(user_id, null), not eq', async () => {
    const calls = mockQuery({ data: [], count: 0 })
    await fetchAuditLog(filters({ actor: '__null' }))
    expect(calls.find((c) => c.method === 'is')).toEqual({ method: 'is', args: ['user_id', null] })
    expect(calls.find((c) => c.method === 'eq' && c.args[0] === 'user_id')).toBeUndefined()
  })

  it('orders by ts descending and pages with a fixed size of 50', async () => {
    const calls = mockQuery({ data: [], count: 0 })
    await fetchAuditLog(filters({ page: 2 }))
    expect(calls.find((c) => c.method === 'order')).toEqual({ method: 'order', args: ['ts', { ascending: false }] })
    expect(AUDIT_PAGE_SIZE).toBe(50)
    expect(calls.find((c) => c.method === 'range')).toEqual({ method: 'range', args: [100, 149] })
  })

  it('preserves the exact date-boundary strings — T00:00:00/T23:59:59 concatenation (Q5)', async () => {
    /* Approved 2026-09-02: this is intentionally NOT a timezone-correct range.
       Any correction is a separate product decision, not a migration fix. */
    const calls = mockQuery({ data: [], count: 0 })
    await fetchAuditLog(filters({ d1: '2026-03-05' }))
    expect(calls.find((c) => c.method === 'gte')).toEqual({ method: 'gte', args: ['ts', '2026-03-05T00:00:00'] })
  })
})

describe('fetchAuditLog — result and error shape', () => {
  it('returns rows and the exact-count total on success', async () => {
    mockQuery({ data: [{ id: '1' }], count: 7 })
    const result = await fetchAuditLog(filters())
    expect(result).toEqual({ rows: [{ id: '1' }], total: 7, error: null, errorKind: null })
  })

  it('treats a null data/count as empty, not a crash', async () => {
    mockQuery({ data: null, count: null })
    const result = await fetchAuditLog(filters())
    expect(result).toEqual({ rows: [], total: 0, error: null, errorKind: null })
  })

  it('classifies a permission-shaped error message as "permission"', async () => {
    mockQuery({ error: { message: 'permission denied for table audit_log' } })
    const result = await fetchAuditLog(filters())
    expect(result.errorKind).toBe('permission')
    expect(result.error).toBe('permission denied for table audit_log')
    expect(result.rows).toEqual([])
  })

  it('classifies an RLS-shaped error message as "permission" too', async () => {
    /* The classifier matches the literal substring "rls" (case-insensitive),
       not any message that is semantically about row-level security — e.g.
       "row-level security policy" alone does NOT match and is classified as
       "load". This pins the classifier's actual regex, not an idealised one. */
    mockQuery({ error: { message: 'RLS policy violation' } })
    expect((await fetchAuditLog(filters())).errorKind).toBe('permission')
  })

  it('does NOT classify "row-level security" as permission unless it contains "rls" literally', async () => {
    mockQuery({ error: { message: 'blocked by row-level security policy' } })
    expect((await fetchAuditLog(filters())).errorKind).toBe('load')
  })

  it('classifies a 401/403-shaped error as "permission"', async () => {
    mockQuery({ error: { message: 'Request failed with status code 401' } })
    expect((await fetchAuditLog(filters())).errorKind).toBe('permission')
  })

  it('classifies any other error as "load"', async () => {
    mockQuery({ error: { message: 'relation "audit_log" does not exist' } })
    const result = await fetchAuditLog(filters())
    expect(result.errorKind).toBe('load')
  })

  it('falls back to a generic message when the error carries none', async () => {
    mockQuery({ error: {} })
    expect((await fetchAuditLog(filters())).error).toBe('Naməlum xəta')
  })

  it('reports a rejected promise as a load failure, never throwing', async () => {
    vi.mocked(supabase.from).mockImplementation((() => {
      throw new Error('Failed to fetch')
    }) as never)
    await expect(fetchAuditLog(filters())).resolves.toEqual({
      rows: [], total: 0, error: 'Failed to fetch', errorKind: 'load',
    })
  })
})
