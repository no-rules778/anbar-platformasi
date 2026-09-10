import { describe, it, expect } from 'vitest'
import { nf, money, today } from './format'

/* M5-14 / M5-15 — ported verbatim from index.html:594-599 (Q4). */

describe('nf', () => {
  it('renders an em-dash for null, undefined and NaN — never 0 or NaN', () => {
    expect(nf(null)).toBe('—')
    expect(nf(undefined)).toBe('—')
    expect(nf(NaN)).toBe('—')
  })

  it('renders 0 as a real zero, not an em-dash (unlike money)', () => {
    expect(nf(0)).toBe('0')
  })

  it('defaults to 0..2 decimals when d is omitted', () => {
    expect(nf(5)).toBe('5')
    /* Max 2 decimals: a third is rounded away. */
    expect(nf(5.125)).toMatch(/^5[.,]13$/)
  })

  it('pins both minimum and maximum decimals when d is given', () => {
    expect(nf(5, 2)).toMatch(/^5[.,]00$/)
    expect(nf(5.1, 2)).toMatch(/^5[.,]10$/)
  })

  it('groups thousands in the az-AZ locale — the V-01 behaviour, kept deliberately', () => {
    const out = nf(1234567)
    /* az-AZ groups with a separator; assert grouping happened without
       pinning which character the runtime's ICU data uses. */
    expect(out).not.toBe('1234567')
    expect(out.replace(/\D/g, '')).toBe('1234567')
  })

  it('formats negatives', () => {
    expect(nf(-42)).toContain('42')
    expect(nf(-42).startsWith('-')).toBe(true)
  })
})

describe('money', () => {
  it('renders an em-dash for null, undefined and NaN', () => {
    expect(money(null)).toBe('—')
    expect(money(undefined)).toBe('—')
    expect(money(NaN)).toBe('—')
  })

  /* The trap: money() treats exactly 0 as nothing to show. A naive
     implementation would print "0,00 ₼" and diverge from every zero-value
     cell in the original. */
  it('renders EXACTLY 0 as an em-dash, not 0,00 ₼', () => {
    expect(money(0)).toBe('—')
    expect(money(-0)).toBe('—')
  })

  it('appends the manat sign with two decimals otherwise', () => {
    expect(money(5)).toMatch(/^5[.,]00 ₼$/)
    expect(money(1234.5)).toMatch(/ ₼$/)
    expect(money(1234.5)).toMatch(/50 ₼$/)
  })

  it('formats a small non-zero value rather than suppressing it', () => {
    expect(money(0.01)).toMatch(/^0[.,]01 ₼$/)
  })
})

describe('today', () => {
  it('returns an ISO yyyy-mm-dd string', () => {
    expect(today()).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})
