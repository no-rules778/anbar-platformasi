import { describe, it, expect } from 'vitest'
import { auditSummary } from './auditSummary'

describe('auditSummary — DELETE', () => {
  it('lists up to 3 old keys as key=value', () => {
    expect(auditSummary({ action: 'DELETE', old_values: { a: 1, b: 'x', c: true, d: 4 }, new_values: null }))
      .toBe('Silindi: a=1, b=x, c=true')
  })

  it('falls back to a plain label when old_values has no keys', () => {
    expect(auditSummary({ action: 'DELETE', old_values: {}, new_values: null })).toBe('Silindi')
    expect(auditSummary({ action: 'DELETE', old_values: null, new_values: null })).toBe('Silindi')
  })
})

describe('auditSummary — INSERT', () => {
  it('lists up to 4 new keys as key=value', () => {
    expect(auditSummary({ action: 'INSERT', old_values: null, new_values: { a: 1, b: 2, c: 3, d: 4, e: 5 } }))
      .toBe('Yeni: a=1, b=2, c=3, d=4')
  })

  it('falls back to a plain label when new_values has no keys', () => {
    expect(auditSummary({ action: 'INSERT', old_values: null, new_values: {} })).toBe('Yeni qeyd')
    expect(auditSummary({ action: 'INSERT', old_values: null, new_values: null })).toBe('Yeni qeyd')
  })
})

describe('auditSummary — UPDATE', () => {
  it('lists up to 6 CHANGED keys, comparing by JSON.stringify', () => {
    const old_values = { a: 1, b: 2, c: 3 }
    const new_values = { a: 1, b: 20, c: 3 } // only b changed
    expect(auditSummary({ action: 'UPDATE', old_values, new_values })).toBe('Dəyişdi: b')
  })

  it('caps the changed-key list at 6', () => {
    const old_values = { a: 0, b: 0, c: 0, d: 0, e: 0, f: 0, g: 0 }
    const new_values = { a: 1, b: 1, c: 1, d: 1, e: 1, f: 1, g: 1 }
    expect(auditSummary({ action: 'UPDATE', old_values, new_values })).toBe('Dəyişdi: a, b, c, d, e, f')
  })

  it('treats a key present only in new_values as changed', () => {
    expect(auditSummary({ action: 'UPDATE', old_values: { a: 1 }, new_values: { a: 1, b: 2 } }))
      .toBe('Dəyişdi: b')
  })

  it('compares nested objects by stringified value, not reference', () => {
    /* A structurally-equal-but-different-reference object must NOT count as
       changed — matches the original's JSON.stringify comparison exactly. */
    const old_values = { meta: { x: 1 } }
    const new_values = { meta: { x: 1 } }
    expect(auditSummary({ action: 'UPDATE', old_values, new_values })).toBe('Dəyişiklik detalı yoxdur')
  })

  it('says so when nothing actually changed', () => {
    expect(auditSummary({ action: 'UPDATE', old_values: { a: 1 }, new_values: { a: 1 } }))
      .toBe('Dəyişiklik detalı yoxdur')
  })

  it('treats null old_values/new_values as empty objects', () => {
    expect(auditSummary({ action: 'UPDATE', old_values: null, new_values: null })).toBe('Dəyişiklik detalı yoxdur')
  })
})

describe('auditSummary — other actions and malformed rows', () => {
  it('returns em dash for an unrecognised action', () => {
    expect(auditSummary({ action: 'TRUNCATE', old_values: null, new_values: null })).toBe('—')
    expect(auditSummary({ action: null, old_values: null, new_values: null })).toBe('—')
  })

  it('never throws — a non-object old_values/new_values falls back to empty, not a crash', () => {
    expect(() => auditSummary({ action: 'DELETE', old_values: 'not an object' as never, new_values: null }))
      .not.toThrow()
    expect(auditSummary({ action: 'DELETE', old_values: 'not an object' as never, new_values: null })).toBe('Silindi')
  })

  it('truncates a long value at 40 characters', () => {
    const long = 'x'.repeat(60)
    const result = auditSummary({ action: 'DELETE', old_values: { a: long }, new_values: null })
    expect(result).toBe(`Silindi: a=${long.slice(0, 40)}`)
  })

  it('renders a null field value as em dash inside the summary', () => {
    expect(auditSummary({ action: 'DELETE', old_values: { a: null }, new_values: null })).toBe('Silindi: a=—')
  })

  it('stringifies and truncates an object-valued field', () => {
    const result = auditSummary({ action: 'INSERT', old_values: null, new_values: { meta: { verylongkeyname: 'verylongvaluehere', another: 1 } } })
    expect(result).toMatch(/^Yeni: meta=\{.{1,40}$/)
  })
})
