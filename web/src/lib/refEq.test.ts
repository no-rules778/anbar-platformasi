import { describe, it, expect } from 'vitest'
import { refEq } from './refEq'

describe('refEq — case insensitivity', () => {
  it('matches regardless of case', () => {
    expect(refEq('Astara', 'astara')).toBe(true)
    expect(refEq('ASTARA', 'AsTaRa')).toBe(true)
  })
  it('still distinguishes genuinely different names', () => {
    expect(refEq('Astara', 'Harmony')).toBe(false)
    expect(refEq('Ofis', 'Ofis 2')).toBe(false)
  })
})

describe('refEq — surrounding whitespace (both sides, like the original)', () => {
  it('ignores leading/trailing spaces on the stored value', () => {
    expect(refEq('  Astara  ', 'Astara')).toBe(true)
  })
  it('ignores leading/trailing spaces on the compared name', () => {
    expect(refEq('Astara', '\tAstara\n')).toBe(true)
  })
  it('does not ignore inner whitespace', () => {
    expect(refEq('Xoca hesen', 'Xocahesen')).toBe(false)
  })
})

describe('refEq — SQL wildcard characters are literal, not patterns', () => {
  it('treats % as an ordinary character', () => {
    expect(refEq('Anbar%', 'Anbar%')).toBe(true)
    expect(refEq('Anbar%', 'AnbarXYZ')).toBe(false)
    expect(refEq('%', 'Astara')).toBe(false)
  })
  it('treats _ as an ordinary character', () => {
    expect(refEq('Anbar_1', 'Anbar_1')).toBe(true)
    expect(refEq('Anbar_1', 'AnbarX1')).toBe(false)
  })
  it('treats a backslash as an ordinary character', () => {
    expect(refEq('A\\B', 'A\\B')).toBe(true)
    expect(refEq('A\\B', 'AB')).toBe(false)
  })
})

describe('refEq — nullish and empty handling', () => {
  it('treats null/undefined/empty as equal to each other', () => {
    expect(refEq(null, '')).toBe(true)
    expect(refEq(undefined, '')).toBe(true)
    expect(refEq(null, undefined)).toBe(true)
    expect(refEq('   ', '')).toBe(true)
  })
  it('never matches a real name against an empty value', () => {
    expect(refEq(null, 'Astara')).toBe(false)
    expect(refEq('', 'Astara')).toBe(false)
  })
})

describe('refEq — Azerbaijani characters', () => {
  it('matches the real warehouse names case-insensitively', () => {
    expect(refEq('Ələt', 'ələt')).toBe(true)
    expect(refEq('Xocahəsən', 'XOCAHƏSƏN')).toBe(true)
  })
})
