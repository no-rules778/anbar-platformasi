import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('./supabase', () => ({
  supabase: {
    auth: {
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
      getUser: vi.fn(),
      getSession: vi.fn(),
      updateUser: vi.fn(),
    },
    from: vi.fn(),
  },
}))

import { supabase } from './supabase'
import { signIn, signOut, getUser, getSession, changePassword, fetchProfile } from './auth.api'

beforeEach(() => vi.clearAllMocks())

describe('signIn', () => {
  it('delegates to supabase.auth.signInWithPassword', async () => {
    vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({ data: {}, error: null } as never)
    await signIn('a@b.com', 'pw')
    expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({ email: 'a@b.com', password: 'pw' })
  })
})

describe('changePassword', () => {
  it('rejects with "Cari şifrə yanlışdır" when the old password check fails', async () => {
    vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({ data: {}, error: { message: 'bad creds' } } as never)
    const res = await changePassword('a@b.com', 'wrong', 'new')
    expect(res.error?.message).toBe('Cari şifrə yanlışdır')
    expect(supabase.auth.updateUser).not.toHaveBeenCalled()
  })
  it('updates the password when the old password check succeeds', async () => {
    vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({ data: {}, error: null } as never)
    vi.mocked(supabase.auth.updateUser).mockResolvedValue({ data: {}, error: null } as never)
    const res = await changePassword('a@b.com', 'right', 'new')
    expect(res.error).toBeNull()
    expect(supabase.auth.updateUser).toHaveBeenCalledWith({ password: 'new' })
  })
})

describe('fetchProfile', () => {
  it('queries users by id and returns a single row', async () => {
    const single = vi.fn().mockResolvedValue({ data: { id: 'u1', role: 'admin' }, error: null })
    const eq = vi.fn().mockReturnValue({ single })
    const select = vi.fn().mockReturnValue({ eq })
    vi.mocked(supabase.from).mockReturnValue({ select } as never)
    const res = await fetchProfile('u1')
    expect(supabase.from).toHaveBeenCalledWith('users')
    expect(select).toHaveBeenCalledWith('*')
    expect(eq).toHaveBeenCalledWith('id', 'u1')
    expect(res.data).toEqual({ id: 'u1', role: 'admin' })
  })
})

describe('getUser / getSession / signOut', () => {
  it('getUser unwraps data.user, defaulting to null', async () => {
    vi.mocked(supabase.auth.getUser).mockResolvedValue({ data: { user: null } } as never)
    expect(await getUser()).toBeNull()
  })
  it('getSession unwraps data.session, defaulting to null', async () => {
    vi.mocked(supabase.auth.getSession).mockResolvedValue({ data: { session: null } } as never)
    expect(await getSession()).toBeNull()
  })
  it('signOut calls supabase.auth.signOut', async () => {
    vi.mocked(supabase.auth.signOut).mockResolvedValue({ error: null } as never)
    await signOut()
    expect(supabase.auth.signOut).toHaveBeenCalled()
  })
})
