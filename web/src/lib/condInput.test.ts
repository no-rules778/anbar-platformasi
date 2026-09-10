import { describe, expect, it } from 'vitest'
import { COND_INPUT_ERROR, normaliseCondInput } from './condInput'

describe('normaliseCondInput — M9-96/M9-97', () => {
  it('trims, accepts a decimal comma, and maps blank/null to zero', () => {
    expect(normaliseCondInput(' 12,34 ')).toEqual({ ok: true, value: 12.34 })
    expect(normaliseCondInput('')).toEqual({ ok: true, value: 0 })
    expect(normaliseCondInput('   ')).toEqual({ ok: true, value: 0 })
    expect(normaliseCondInput(null)).toEqual({ ok: true, value: 0 })
  })

  it('rejects negative, non-finite, and malformed values with the exact message', () => {
    for (const raw of ['-0.01', 'abc', 'Infinity', '1,2,3']) {
      expect(normaliseCondInput(raw)).toEqual({ ok: false, error: COND_INPUT_ERROR })
    }
  })

  it('rounds to two decimals with the legacy Math.round rule', () => {
    expect(normaliseCondInput('1.234')).toEqual({ ok: true, value: 1.23 })
    expect(normaliseCondInput('1.235')).toEqual({ ok: true, value: 1.24 })
    expect(normaliseCondInput('0.005')).toEqual({ ok: true, value: 0.01 })
  })
})
