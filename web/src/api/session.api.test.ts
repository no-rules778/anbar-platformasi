import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('./supabase', () => ({
  supabase: { rpc: vi.fn() },
  SB_URL: 'https://example.supabase.co',
  SB_KEY: 'anon-key',
}))

import { supabase } from './supabase'
import { registerSession, touchSession, unregisterSession, DEVICE_ID, setAccessToken, releaseDeviceBeacon } from './session.api'

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

/* The beacon is the C-07-sensitive path: it must never fire without a real
   token, and must only ever name THIS device. */
describe('releaseDeviceBeacon', () => {
  const fetchMock = vi.fn()

  beforeEach(() => {
    fetchMock.mockReset().mockResolvedValue({ ok: true })
    vi.stubGlobal('fetch', fetchMock)
    setAccessToken(null)
  })

  it('sends nothing when there is no access token (never "Bearer null")', () => {
    releaseDeviceBeacon()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('posts end_session for THIS device only, with keepalive and a real token', () => {
    setAccessToken('real-token')
    releaseDeviceBeacon()

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0]
    expect(String(url)).toMatch(/\/rest\/v1\/rpc\/end_session$/)
    expect(init.method).toBe('POST')
    expect(init.keepalive).toBe(true)
    expect(init.headers.Authorization).toBe('Bearer real-token')
    expect(JSON.parse(init.body)).toEqual({ p_device_id: DEVICE_ID })
  })

  it('stops sending once the token is cleared on logout', () => {
    setAccessToken('real-token')
    setAccessToken(null)
    releaseDeviceBeacon()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('never throws, even if fetch itself blows up during unload', () => {
    setAccessToken('real-token')
    fetchMock.mockImplementation(() => { throw new Error('tab is going away') })
    expect(() => releaseDeviceBeacon()).not.toThrow()
  })
})
