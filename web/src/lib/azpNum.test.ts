import { describe, expect, it } from 'vitest'
import { azpMoney, azpN, azpR2 } from './azpNum'
import { money } from './format'

/* T0 — M17-31, M17-32, M17-33. Pure unit evidence only. */

describe('azpN', () => {
  it('passes finite numbers through, including negatives and zero', () => {
    expect(azpN(12.34)).toBe(12.34)
    expect(azpN(-5)).toBe(-5)
    expect(azpN(0)).toBe(0)
  })

  /* Negative case: every non-finite input collapses to 0 rather than
     propagating NaN into a money total. */
  it('returns 0 for NaN, Infinity, null, undefined and non-numeric input', () => {
    expect(azpN(NaN)).toBe(0)
    expect(azpN(Infinity)).toBe(0)
    expect(azpN(-Infinity)).toBe(0)
    expect(azpN(null)).toBe(0)
    expect(azpN(undefined)).toBe(0)
    expect(azpN('abc')).toBe(0)
    expect(azpN({})).toBe(0)
  })

  /* Legacy uses Number(v), so a numeric STRING converts. Load-bearing: the
     Supabase numeric columns arrive as strings often enough that dropping
     this would zero real amounts. */
  it('converts numeric strings, because the original uses Number()', () => {
    expect(azpN('12.5')).toBe(12.5)
    expect(azpN('-3')).toBe(-3)
    expect(azpN('')).toBe(0)
  })
})

describe('azpR2', () => {
  it('rounds to two decimals', () => {
    expect(azpR2(1.234)).toBe(1.23)
    expect(azpR2(1.235)).toBe(1.24)
    expect(azpR2(10)).toBe(10)
  })

  /* Boundary: the exact .005 case, above and below, on both signs. */
  it('rounds half up on positives at the 2dp boundary', () => {
    expect(azpR2(0.004)).toBe(0)
    expect(azpR2(0.005)).toBe(0.01)
    expect(azpR2(0.006)).toBe(0.01)
  })

  /* Math.round rounds -0.5 toward +∞, so -0.005 becomes -0 rather than -0.01.
     This is the legacy expression's real behaviour and is pinned deliberately:
     a "corrected" rounding would disagree with the screen and with round().

     Both sub-0.005 magnitudes collapse to NEGATIVE zero, not positive zero —
     `toBe` is Object.is, so `toBe(0)` would fail here. The distinction is
     asserted rather than sidestepped: it is the same fact the -0.005 case
     pins, and a rounding "fix" would change all three lines. */
  it('inherits Math.round behaviour on the negative boundary', () => {
    expect(Object.is(azpR2(-0.004), -0)).toBe(true)
    expect(azpR2(-0.006)).toBe(-0.01)
    expect(Object.is(azpR2(-0.005), -0)).toBe(true)
    /* Control: the positive side of the same boundary is +0, not -0. */
    expect(Object.is(azpR2(0.004), 0)).toBe(true)
  })

  it('collapses non-finite input to 0 through azpN', () => {
    expect(azpR2(NaN)).toBe(0)
    expect(azpR2(null)).toBe(0)
  })
})

describe('azpMoney', () => {
  it('formats a finite amount with two decimals and the manat sign', () => {
    expect(azpMoney(1234.5)).toBe('1.234,50 ₼')
    expect(azpMoney(0.5)).toBe('0,50 ₼')
  })

  it('formats negatives rather than hiding them', () => {
    expect(azpMoney(-12.3)).toBe('-12,30 ₼')
  })

  /* Negative case: only null and non-finite yield the em-dash. */
  it('returns an em-dash for null, undefined and non-finite values', () => {
    expect(azpMoney(null)).toBe('—')
    expect(azpMoney(undefined)).toBe('—')
    expect(azpMoney(NaN)).toBe('—')
    expect(azpMoney(Infinity)).toBe('—')
    expect(azpMoney('abc')).toBe('—')
  })

  /* THE divergence from the shared money(): at exactly zero the two disagree.
     A card with no movements must show a real 0,00 ₼ balance here. This test
     fails immediately if azpMoney is ever "simplified" to reuse money(). */
  it('renders exactly 0 as 0,00 ₼, unlike the shared money() helper', () => {
    expect(azpMoney(0)).toBe('0,00 ₼')
    expect(money(0)).toBe('—')
    expect(azpMoney(0)).not.toBe(money(0))
  })
})
