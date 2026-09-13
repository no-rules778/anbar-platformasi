import { fmtM } from './format'
import { describe, it, expect } from 'vitest'

/* `fmtM` — index.html:603, added by Phase 14 (M14-46). */
describe('fmtM — index.html:603', () => {
  it('formats an exact YYYY-MM key as MM.YYYY', () => {
    expect(fmtM('2026-03')).toBe('03.2026')
    expect(fmtM('2025-12')).toBe('12.2025')
  })

  /* The anchored regex is the point: a full date must NOT match, or the day
     would be silently discarded. */
  it('returns a full YYYY-MM-DD date unchanged rather than dropping the day', () => {
    expect(fmtM('2026-03-15')).toBe('2026-03-15')
  })

  it('returns any other string unchanged', () => {
    expect(fmtM('mart')).toBe('mart')
    expect(fmtM('')).toBe('')
  })

  /* Like fmtD: null becomes the EMPTY STRING, never an em-dash. */
  it('maps null and undefined to the empty string', () => {
    expect(fmtM(null)).toBe('')
    expect(fmtM(undefined)).toBe('')
  })
})
import { initials, nf, money, today } from './format'

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

/* M18-31 — `initials()`, index.html:606. Ported verbatim, including the two
   guards that look redundant and are not. */
describe('initials — index.html:606', () => {
  it('takes the first letter of the first TWO parts, uppercased', () => {
    expect(initials('Aysel Məmmədova')).toBe('AM')
    expect(initials('rəşad quliyev')).toBe('RQ')
  })

  it('stops at two even when the name has more parts', () => {
    /* `.slice(0,2)` — a three-part name must not yield three letters. */
    expect(initials('Aysel Nigar Məmmədova')).toBe('AN')
  })

  it('handles a single-word name', () => {
    expect(initials('Admin')).toBe('A')
  })

  it('falls back to «?» for an empty or whitespace-only name', () => {
    /* The legacy `|| '?'` is load-bearing: an empty chip would look broken. */
    expect(initials('')).toBe('?')
    expect(initials('   ')).toBe('?')
    expect(initials(null)).toBe('?')
    expect(initials(undefined)).toBe('?')
  })

  it('is unharmed by irregular whitespace', () => {
    /* `split(/\s+/)` after `trim()` — a double space must not produce an
       empty initial, which is what the `x[0] || ''` guard is for. */
    expect(initials('  Aysel   Məmmədova  ')).toBe('AM')
    expect(initials('Aysel	Məmmədova')).toBe('AM')
  })
})
