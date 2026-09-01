import { describe, it, expect, beforeEach } from 'vitest'
import { setRemember, rememberOn, savedEmail, saveEmail, authStorage } from './supabase'

beforeEach(() => {
  localStorage.clear()
  sessionStorage.clear()
})

describe('remember-me flag', () => {
  it('defaults to false', () => {
    expect(rememberOn()).toBe(false)
  })
  it('turns on and off', () => {
    setRemember(true)
    expect(rememberOn()).toBe(true)
    setRemember(false)
    expect(rememberOn()).toBe(false)
  })
})

describe('saved email', () => {
  it('defaults to empty string', () => {
    expect(savedEmail()).toBe('')
  })
  it('saves and clears', () => {
    saveEmail('a@b.com')
    expect(savedEmail()).toBe('a@b.com')
    saveEmail('')
    expect(savedEmail()).toBe('')
  })
})

describe('authStorage', () => {
  it('writes to localStorage (not sessionStorage) when remember is on', () => {
    setRemember(true)
    authStorage().setItem('k', 'v')
    expect(localStorage.getItem('k')).toBe('v')
    expect(sessionStorage.getItem('k')).toBeNull()
    expect(authStorage().getItem('k')).toBe('v')
  })

  it('writes to sessionStorage (not localStorage) when remember is off', () => {
    authStorage().setItem('k', 'v')
    expect(sessionStorage.getItem('k')).toBe('v')
    expect(localStorage.getItem('k')).toBeNull()
    expect(authStorage().getItem('k')).toBe('v')
  })

  it('removeItem clears the key from both storages', () => {
    localStorage.setItem('k', 'v')
    sessionStorage.setItem('k', 'v')
    authStorage().removeItem('k')
    expect(localStorage.getItem('k')).toBeNull()
    expect(sessionStorage.getItem('k')).toBeNull()
  })

  it('getItem returns null for a key that was never written', () => {
    expect(authStorage().getItem('never-written')).toBeNull()
  })
})
