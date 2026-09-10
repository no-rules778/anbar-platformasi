import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('./supabase', () => ({ supabase: { rpc: vi.fn() } }))

import { supabase } from './supabase'
import { fetchUserDirectory } from './userDirectory.api'

beforeEach(() => vi.clearAllMocks())

describe('fetchUserDirectory', () => {
  it('calls get_user_directory and maps id → email', async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({
      data: [{ id: 'u-1', email: 'a@x.com' }, { id: 'u-2', email: 'b@x.com' }],
      error: null,
    } as never)

    const { emails, ok } = await fetchUserDirectory()

    expect(supabase.rpc).toHaveBeenCalledWith('get_user_directory')
    expect(ok).toBe(true)
    expect(emails.get('u-1')).toBe('a@x.com')
    expect(emails.get('u-2')).toBe('b@x.com')
  })

  it('skips a row with no id', async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({ data: [{ id: '', email: 'x@x.com' }], error: null } as never)
    const { emails } = await fetchUserDirectory()
    expect(emails.size).toBe(0)
  })

  it('defaults a missing email to an empty string, never falling back to a name', async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({ data: [{ id: 'u-3', email: null }], error: null } as never)
    const { emails } = await fetchUserDirectory()
    expect(emails.get('u-3')).toBe('')
  })

  it('treats a null payload as an empty, ok directory', async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({ data: null, error: null } as never)
    const { emails, ok } = await fetchUserDirectory()
    expect(ok).toBe(true)
    expect(emails.size).toBe(0)
  })

  it('reports ok:false on a returned error, with an empty map', async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({ data: null, error: { message: 'denied' } } as never)
    const { emails, ok } = await fetchUserDirectory()
    expect(ok).toBe(false)
    expect(emails.size).toBe(0)
  })

  it('reports ok:false when the RPC promise rejects, without throwing', async () => {
    vi.mocked(supabase.rpc).mockRejectedValue(new Error('Failed to fetch'))
    await expect(fetchUserDirectory()).resolves.toEqual({ emails: new Map(), ok: false })
  })
})
