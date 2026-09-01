import { describe, it, expect, beforeEach } from 'vitest'
import { setRemember, rememberOn, savedEmail, saveEmail } from './supabase'

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
