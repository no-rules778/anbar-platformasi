import { describe, it, expect } from 'vitest'
import { blockedReason, isWrite, isLocalhost, localWriteStatusText, WRITE_ACTIONS } from './mutationGuard'

describe('mutationGuard — which actions the guard covers', () => {
  it.each(['create', 'update', 'delete', 'deactivate', 'activate'] as const)('treats %s as a write', (a) => {
    expect(isWrite(a)).toBe(true)
  })
  it('covers every reference action — none of them is read-only', () => {
    expect([...WRITE_ACTIONS]).toEqual(['create', 'update', 'delete', 'deactivate', 'activate'])
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
  it('blocks every write on localhost by default, create and update included', () => {
    for (const a of WRITE_ACTIONS) {
      expect(blockedReason(a, { local: true, allowed: false })).toMatch(/VITE_ALLOW_LOCAL_WRITES/)
    }
  })

  it('allows every write once the developer opts in', () => {
    for (const a of WRITE_ACTIONS) {
      expect(blockedReason(a, { local: true, allowed: true })).toBeNull()
    }
  })

  /* Production must behave exactly as before — the guard is localhost-only. */
  it('never blocks anything off localhost, opt-in or not', () => {
    for (const a of WRITE_ACTIONS) {
      expect(blockedReason(a, { local: false, allowed: false })).toBeNull()
      expect(blockedReason(a, { local: false, allowed: true })).toBeNull()
    }
  })
})

describe('mutationGuard — banner wording', () => {
  it('names the flag and lists the blocked actions when writes are shut', () => {
    const text = localWriteStatusText(false)
    expect(text).toMatch(/VITE_ALLOW_LOCAL_WRITES/)
    expect(text).toMatch(/bloklanıb/)
  })

  it('says writes are open when the developer opted in', () => {
    expect(localWriteStatusText(true)).toMatch(/AÇIQDIR/)
  })
})
