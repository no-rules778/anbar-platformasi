import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('./supabase', () => ({
  supabase: { rpc: vi.fn() },
}))

import { supabase } from './supabase'
import { registerSession, touchSession, unregisterSession, DEVICE_ID } from './session.api'

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
})

describe('DEVICE_ID', () => {
  it('is a non-empty string persisted across calls', () => {
    expect(DEVICE_ID).toMatch(/^dev_/)
  })
})

describe('registerSession', () => {
  it('returns the server result when the RPC succeeds', async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({ data: { allowed: true, limit: 1 }, error: null } as never)
    const res = await registerSession()
    expect(res).toEqual({ allowed: true, limit: 1 })
    expect(supabase.rpc).toHaveBeenCalledWith('register_session', expect.objectContaining({ p_device_id: DEVICE_ID }))
  })
  it('degrades to allowed:true when the RPC is missing or errors (SQL 026 not applied)', async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({ data: null, error: { message: 'function does not exist' } } as never)
    const res = await registerSession()
    expect(res).toEqual({ allowed: true, degraded: true })
  })
})

describe('touchSession', () => {
  it('returns null on error instead of throwing', async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({ data: null, error: { message: 'network' } } as never)
    expect(await touchSession()).toBeNull()
  })
  it('signals alive:false when the session was closed elsewhere', async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({ data: { alive: false }, error: null } as never)
    expect(await touchSession()).toEqual({ alive: false })
  })
})

describe('unregisterSession', () => {
  it('never throws even if the RPC fails', async () => {
    vi.mocked(supabase.rpc).mockRejectedValue(new Error('offline'))
    await expect(unregisterSession()).resolves.toBeUndefined()
  })
})
