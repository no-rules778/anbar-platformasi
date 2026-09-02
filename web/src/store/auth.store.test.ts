import { describe, it, expect, beforeEach } from 'vitest'
import { useAuthStore } from './auth.store'
import type { Me } from '../lib/roles'

const sampleMe: Me = { id: '1', sbId: '1', email: 'a@b.com', name: 'A', role: 'admin', wh: '' }

beforeEach(() => useAuthStore.getState().reset())

describe('useAuthStore', () => {
  /* The very first state the app renders from. It must NOT be `idle`, or the
     login form appears for one frame before the session-restore effect runs. */
  it('boots in loading with no user, so no login form is shown before the session check', () => {
    const initial = useAuthStore.getInitialState()
    expect(initial.me).toBeNull()
    expect(initial.status).toBe('loading')
    expect(initial.error).toBeNull()
  })
  it('after reset (logout / no session found) it is idle with no user', () => {
    const s = useAuthStore.getState()
    expect(s.me).toBeNull()
    expect(s.status).toBe('idle')
    expect(s.error).toBeNull()
  })
  it('setMe / setStatus / setError update state independently', () => {
    useAuthStore.getState().setMe(sampleMe)
    useAuthStore.getState().setStatus('ready')
    expect(useAuthStore.getState().me).toEqual(sampleMe)
    expect(useAuthStore.getState().status).toBe('ready')
  })
  it('reset clears everything back to idle', () => {
    useAuthStore.getState().setMe(sampleMe)
    useAuthStore.getState().setStatus('ready')
    useAuthStore.getState().setError('boom')
    useAuthStore.getState().reset()
    const s = useAuthStore.getState()
    expect(s.me).toBeNull()
    expect(s.status).toBe('idle')
    expect(s.error).toBeNull()
  })
})
