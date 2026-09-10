import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('./supabase', () => ({ supabase: { from: vi.fn() } }))

import { supabase } from './supabase'
import { fetchPartners, readPartners } from './partners.api'

beforeEach(() => vi.clearAllMocks())

const row = (name: string) => ({ id: name, name, active: true }) as never

function mockPages(pages: { data?: unknown[] | null; error?: unknown }[]) {
  let i = 0
  vi.mocked(supabase.from).mockReturnValue({
    select: () => ({
      order: () => ({ range: () => Promise.resolve(pages[i++] ?? { data: [], error: null }) }),
    }),
  } as never)
}

describe('fetchPartners — unchanged legacy contract (Phase 2/3)', () => {
  it('still returns rows directly', async () => {
    mockPages([{ data: [row('A')], error: null }])
    await expect(fetchPartners()).resolves.toHaveLength(1)
  })

  it('still THROWS on error — the existing callers depend on it', async () => {
    mockPages([{ data: null, error: { message: 'boom' } }])
    await expect(fetchPartners()).rejects.toBeDefined()
  })
})

describe('readPartners — Phase 7 core-read contract', () => {
  it('returns a result shape and never throws', async () => {
    mockPages([{ data: [row('A')], error: null }])
    const r = await readPartners()
    expect(r).toMatchObject({ ok: true, error: null })
    expect(r.rows).toHaveLength(1)
  })

  it('absorbs a returned error', async () => {
    mockPages([{ data: null, error: { message: 'rls denied' } }])
    const r = await readPartners()
    expect(r.ok).toBe(false)
    expect(r.error).toBe('rls denied')
    expect(r.partial).toBe(false)
  })

  it('absorbs a rejected promise', async () => {
    vi.mocked(supabase.from).mockReturnValue({
      select: () => ({ order: () => ({ range: () => Promise.reject(new Error('network')) }) }),
    } as never)
    const r = await readPartners()
    expect(r.ok).toBe(false)
    expect(r.error).toBe('network')
  })

  /* A truncated partner list would silently narrow the counterparty options on
     a write screen, so a partial read is a FAILED read (M7-S2). */
  it('reports a mid-pagination failure as partial and NOT ok', async () => {
    const full = Array.from({ length: 1000 }, (_, i) => row(`P${i}`))
    mockPages([
      { data: full, error: null },
      { data: null, error: { message: 'dropped' } },
    ])
    const r = await readPartners()
    expect(r.ok).toBe(false)
    expect(r.partial).toBe(true)
    expect(r.rows).toHaveLength(1000)
  })

  it('pages until a short page arrives', async () => {
    const full = Array.from({ length: 1000 }, (_, i) => row(`P${i}`))
    mockPages([{ data: full, error: null }, { data: [row('LAST')], error: null }])
    const r = await readPartners()
    expect(r.ok).toBe(true)
    expect(r.rows).toHaveLength(1001)
  })

  it('never throws', async () => {
    vi.mocked(supabase.from).mockReturnValue({
      select: () => ({ order: () => ({ range: () => Promise.reject('x') }) }),
    } as never)
    await expect(readPartners()).resolves.toBeDefined()
  })
})
