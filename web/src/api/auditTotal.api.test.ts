import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('./supabase', () => ({ supabase: { from: vi.fn() } }))

import { supabase } from './supabase'
import { fetchAuditTotal } from './auditTotal.api'

beforeEach(() => vi.clearAllMocks())

function mockCount(result: { count?: number | null; error?: unknown }) {
  const select = vi.fn().mockResolvedValue({ count: result.count ?? null, error: result.error ?? null })
  vi.mocked(supabase.from).mockReturnValue({ select } as never)
  return select
}

describe('fetchAuditTotal', () => {
  it('requests a count-only head query, no rows', async () => {
    const select = mockCount({ count: 42 })
    await fetchAuditTotal()
    expect(select).toHaveBeenCalledWith('id', { count: 'exact', head: true })
  })

  it('returns the count on success', async () => {
    mockCount({ count: 42 })
    expect(await fetchAuditTotal()).toEqual({ total: 42, ok: true })
  })

  it('treats a null count as zero but still ok', async () => {
    mockCount({ count: null })
    expect(await fetchAuditTotal()).toEqual({ total: 0, ok: true })
  })

  it('reports ok:false on a returned error', async () => {
    mockCount({ error: { message: 'denied' } })
    expect(await fetchAuditTotal()).toEqual({ total: 0, ok: false })
  })

  it('reports ok:false when the query rejects, without throwing', async () => {
    vi.mocked(supabase.from).mockImplementation((() => {
      throw new Error('Failed to fetch')
    }) as never)
    await expect(fetchAuditTotal()).resolves.toEqual({ total: 0, ok: false })
  })
})
