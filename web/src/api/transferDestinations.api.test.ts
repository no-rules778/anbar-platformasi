import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('./supabase', () => ({ supabase: { rpc: vi.fn() } }))

import { supabase } from './supabase'
import { fetchTransferDestinations } from './transferDestinations.api'

beforeEach(() => vi.clearAllMocks())

const FALLBACK = ['Elet', 'Astara']

describe('fetchTransferDestinations — M7-08', () => {
  it('returns the server list when the RPC succeeds', async () => {
    vi.mocked(supabase.rpc)
      .mockResolvedValue({ data: ['Astara', 'Elet', 'Ofis'], error: null } as never)
    const r = await fetchTransferDestinations(FALLBACK)
    expect(r).toEqual({ names: ['Astara', 'Elet', 'Ofis'], ok: true, error: null })
  })

  /* On failure the list falls back to the ordinary warehouse list — the
     original leaves DB.transferDests as DB.whs (index.html:934, 1011). */
  it('falls back to the warehouse list on a returned error', async () => {
    vi.mocked(supabase.rpc)
      .mockResolvedValue({ data: null, error: { message: 'İcazə yoxdur' } } as never)
    const r = await fetchTransferDestinations(FALLBACK)
    expect(r.names).toEqual(FALLBACK)
    expect(r.ok).toBe(false)
    expect(r.error).toBe('İcazə yoxdur')
  })

  it('falls back on a rejected promise', async () => {
    vi.mocked(supabase.rpc).mockRejectedValue(new Error('network') as never)
    const r = await fetchTransferDestinations(FALLBACK)
    expect(r.names).toEqual(FALLBACK)
    expect(r.error).toBe('network')
  })

  /* The original only replaces the list when the response is a NON-EMPTY
     array (1010) — an empty answer keeps the fallback. */
  it('keeps the fallback for an empty array', async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({ data: [], error: null } as never)
    const r = await fetchTransferDestinations(FALLBACK)
    expect(r.names).toEqual(FALLBACK)
    expect(r.ok).toBe(false)
  })

  it('keeps the fallback for a non-array payload', async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({ data: { x: 1 }, error: null } as never)
    expect((await fetchTransferDestinations(FALLBACK)).names).toEqual(FALLBACK)
  })

  it('never mutates the fallback it was given', async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({ data: [], error: null } as never)
    const src = [...FALLBACK]
    const r = await fetchTransferDestinations(src)
    r.names.push('X')
    expect(src).toEqual(FALLBACK)
  })

  /* D-H1 belongs to transferDestWarehouses(), not here: this module stays a
     faithful transport of the server's answer. */
  it('does NOT apply the D-H1 narrowing itself — Ofis survives', async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({ data: ['Elet', 'Ofis'], error: null } as never)
    expect((await fetchTransferDestinations(FALLBACK)).names).toContain('Ofis')
  })

  it('never throws', async () => {
    vi.mocked(supabase.rpc).mockRejectedValue('x' as never)
    await expect(fetchTransferDestinations(FALLBACK)).resolves.toBeDefined()
  })
})
