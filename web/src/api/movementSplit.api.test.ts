import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('./supabase', () => ({ supabase: { rpc: vi.fn() } }))

import { supabase } from './supabase'
import { fetchSplitSupported } from './movementSplit.api'

beforeEach(() => vi.clearAllMocks())

describe('fetchSplitSupported — M7-30', () => {
  it('is true when the probe succeeds (the live production value)', async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({ data: true, error: null } as never)
    expect(await fetchSplitSupported()).toBe(true)
    expect(supabase.rpc).toHaveBeenCalledWith('movement_split_supported')
  })

  /* A01 — a compatible server that EXPOSES the function but answers `false` is
     telling us it cannot preserve a split yet. Treating "no error" as
     "supported" would let the client send `conditions` the server silently
     drops, leaving the markers behind in the source warehouse. Verified to fail
     against the pre-fix `return !error`. */
  it('is false for an explicit {data:false, error:null}', async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({ data: false, error: null } as never)
    expect(await fetchSplitSupported()).toBe(false)
  })

  it('is false for a null or missing payload with no error', async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({ data: null, error: null } as never)
    expect(await fetchSplitSupported()).toBe(false)
    vi.mocked(supabase.rpc).mockResolvedValue({ data: undefined, error: null } as never)
    expect(await fetchSplitSupported()).toBe(false)
  })

  /* Only a real boolean true counts — no truthiness coercion. */
  it('is false for a truthy non-boolean payload', async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({ data: 'true', error: null } as never)
    expect(await fetchSplitSupported()).toBe(false)
    vi.mocked(supabase.rpc).mockResolvedValue({ data: 1, error: null } as never)
    expect(await fetchSplitSupported()).toBe(false)
  })

  /* The flag exists to BLOCK, never to grant permission: an unknown
     `conditions` key would be silently ignored by an older server and the
     document would post with the split lost. */
  it('is false when the function does not exist', async () => {
    vi.mocked(supabase.rpc)
      .mockResolvedValue({ data: null, error: { message: 'does not exist' } } as never)
    expect(await fetchSplitSupported()).toBe(false)
  })

  it('is false on a rejected promise', async () => {
    vi.mocked(supabase.rpc).mockRejectedValue(new Error('network') as never)
    expect(await fetchSplitSupported()).toBe(false)
  })

  it('never throws', async () => {
    vi.mocked(supabase.rpc).mockRejectedValue('x' as never)
    await expect(fetchSplitSupported()).resolves.toBe(false)
  })
})
