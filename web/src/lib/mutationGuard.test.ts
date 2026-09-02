import { describe, it, expect } from 'vitest'
import { blockedReason, isDestructive, isLocalhost, DESTRUCTIVE_ACTIONS } from './mutationGuard'

describe('mutationGuard — which actions count as destructive', () => {
  it.each(['delete', 'deactivate', 'activate'] as const)('treats %s as destructive', (a) => {
    expect(isDestructive(a)).toBe(true)
  })
  it.each(['create', 'update'] as const)('leaves %s alone', (a) => {
    expect(isDestructive(a)).toBe(false)
  })
  it('lists exactly the three actions the guard covers', () => {
    expect([...DESTRUCTIVE_ACTIONS]).toEqual(['delete', 'deactivate', 'activate'])
  })
})

describe('mutationGuard — host detection', () => {
  it.each(['localhost', '127.0.0.1', '::1', '[::1]'])('recognises %s as local', (h) => {
    expect(isLocalhost(h)).toBe(true)
  })
  it.each(['anbar-platformasi.vercel.app', '192.168.0.94', 'example.com'])('treats %s as not local', (h) => {
    expect(isLocalhost(h)).toBe(false)
  })
})

describe('mutationGuard — blocking policy', () => {
  it('blocks destructive actions on localhost by default', () => {
    for (const a of DESTRUCTIVE_ACTIONS) {
      expect(blockedReason(a, { local: true, allowed: false })).toMatch(/VITE_ALLOW_DESTRUCTIVE/)
    }
  })

  it('never blocks create or update', () => {
    expect(blockedReason('create', { local: true, allowed: false })).toBeNull()
    expect(blockedReason('update', { local: true, allowed: false })).toBeNull()
  })

  it('allows destructive actions once the developer opts in', () => {
    expect(blockedReason('delete', { local: true, allowed: true })).toBeNull()
  })

  /* Production must behave exactly as before — the guard is localhost-only. */
  it('never blocks anything off localhost, opt-in or not', () => {
    for (const a of DESTRUCTIVE_ACTIONS) {
      expect(blockedReason(a, { local: false, allowed: false })).toBeNull()
      expect(blockedReason(a, { local: false, allowed: true })).toBeNull()
    }
  })
})
