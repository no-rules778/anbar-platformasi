import { describe, expect, it } from 'vitest'
import { azpDate, azpDayKey, azpInRange, azpUndatedHidden } from './azpDate'

/* T0 — M17-34 … M17-40. Pure unit evidence only. */

describe('azpDate', () => {
  it('keeps the date part of an ISO value, timestamp or not', () => {
    expect(azpDate('2026-08-08')).toBe('2026-08-08')
    expect(azpDate('2026-08-08T00:00:00+04:00')).toBe('2026-08-08')
  })

  it('converts DD.MM.YYYY with any of the three separators', () => {
    expect(azpDate('08.09.2026')).toBe('2026-09-08')
    expect(azpDate('08/09/2026')).toBe('2026-09-08')
    expect(azpDate('08-09-2026')).toBe('2026-09-08')
  })

  /* Single-digit day and month must zero-pad, or the string comparison the
     range filter relies on would order '2026-9-8' after '2026-10-01'. */
  it('zero-pads a single-digit day and month', () => {
    expect(azpDate('8.9.2026')).toBe('2026-09-08')
    expect(azpDate('1.1.2026')).toBe('2026-01-01')
  })

  /* The serial epoch is 1899-12-30, so serial n is that date plus n days.
     Each expectation below was derived from the epoch arithmetic and
     cross-checked in the opposite direction — (2025-12-09 − 1899-12-30) is
     exactly 46000 days — rather than copied from a previous run. */
  it('converts an Excel serial number', () => {
    expect(azpDate(1)).toBe('1899-12-31')
    expect(azpDate(2)).toBe('1900-01-01')
    expect(azpDate(46000)).toBe('2025-12-09')
  })

  /* Boundary matrix on the serial bounds: below, exactly at, and above, on
     both ends. 1 and 60000 are accepted; 0 and 60001 are not. The accepted
     bounds assert their real converted value, so the test cannot pass on a
     mere "not empty". */
  it('accepts serials 1 and 60000 but rejects 0 and 60001', () => {
    expect(azpDate(0)).toBe('')
    expect(azpDate(1)).toBe('1899-12-31')
    expect(azpDate(60000)).toBe('2064-04-08')
    expect(azpDate(60001)).toBe('')
    expect(azpDate(-5)).toBe('')
  })

  /* Negative case: anything unparseable yields '', never a partial date. */
  it('returns an empty string for unparseable input', () => {
    expect(azpDate(null)).toBe('')
    expect(azpDate(undefined)).toBe('')
    expect(azpDate('')).toBe('')
    expect(azpDate('nonsense')).toBe('')
    expect(azpDate('2026-13')).toBe('')
    expect(azpDate('8.9.26')).toBe('')
    expect(azpDate(NaN)).toBe('')
    expect(azpDate(Infinity)).toBe('')
  })

  it('azpDayKey is the same normalisation', () => {
    expect(azpDayKey('2026-08-08T12:00:00Z')).toBe('2026-08-08')
    expect(azpDayKey(null)).toBe('')
  })
})

describe('azpInRange', () => {
  it('passes everything when no bound is set, undated rows included', () => {
    expect(azpInRange('2026-08-08', '', '')).toBe(true)
    expect(azpInRange(null, '', '')).toBe(true)
  })

  /* Boundary matrix: below, exactly equal at each bound, and above. Both
     bounds are INCLUSIVE — the equality cases are the whole point. */
  it('includes both bounds', () => {
    expect(azpInRange('2026-08-07', '2026-08-08', '2026-08-10')).toBe(false)
    expect(azpInRange('2026-08-08', '2026-08-08', '2026-08-10')).toBe(true)
    expect(azpInRange('2026-08-09', '2026-08-08', '2026-08-10')).toBe(true)
    expect(azpInRange('2026-08-10', '2026-08-08', '2026-08-10')).toBe(true)
    expect(azpInRange('2026-08-11', '2026-08-08', '2026-08-10')).toBe(false)
  })

  it('applies a one-sided bound inclusively', () => {
    expect(azpInRange('2026-08-08', '2026-08-08', '')).toBe(true)
    expect(azpInRange('2026-08-07', '2026-08-08', '')).toBe(false)
    expect(azpInRange('2026-08-08', '', '2026-08-08')).toBe(true)
    expect(azpInRange('2026-08-09', '', '2026-08-08')).toBe(false)
  })

  /* The original live defect: a timestamp compared as a raw string sorts
     ABOVE the plain end-bound date and falls out of an inclusive range.
     Normalising both sides fixes it, and this is the regression that proves
     it — it fails against a raw string comparison. */
  it('places a timestamp inside an end bound of its own date', () => {
    expect(azpInRange('2026-08-08T00:00:00+04:00', '2026-08-08', '2026-08-08')).toBe(true)
    expect(azpInRange('2026-08-08T23:59:59Z', '', '2026-08-08')).toBe(true)
  })

  it('matches an equivalent DD.MM.YYYY bound to an ISO row date', () => {
    expect(azpInRange('2026-08-08', '08.08.2026', '08.08.2026')).toBe(true)
  })

  /* With ANY bound set an undated row is excluded; with none it passes. */
  it('excludes an undated row whenever a bound is set', () => {
    expect(azpInRange(null, '2026-08-08', '')).toBe(false)
    expect(azpInRange(null, '', '2026-08-08')).toBe(false)
    expect(azpInRange('', '2026-08-01', '2026-08-31')).toBe(false)
    expect(azpInRange(null, '', '')).toBe(true)
  })
})

describe('azpUndatedHidden', () => {
  const rows = [
    { op_date: '2026-08-08' },
    { op_date: null },
    { op_date: '' },
    { op_date: 'nonsense' },
  ]

  it('is zero when no bound is set, however many rows are undated', () => {
    expect(azpUndatedHidden(rows, '', '')).toBe(0)
  })

  /* Three of the four rows have no usable date: null, empty and unparseable. */
  it('counts every row with no usable date once a bound is set', () => {
    expect(azpUndatedHidden(rows, '2026-08-01', '')).toBe(3)
    expect(azpUndatedHidden(rows, '', '2026-08-31')).toBe(3)
    expect(azpUndatedHidden(rows, '2026-08-01', '2026-08-31')).toBe(3)
  })

  /* Control: it counts only undated rows, never rows excluded for being
     outside the period. Both dated rows here fall outside it. */
  it('does not count dated rows that merely fall outside the period', () => {
    const dated = [{ op_date: '2020-01-01' }, { op_date: '2030-01-01' }]
    expect(azpUndatedHidden(dated, '2026-08-01', '2026-08-31')).toBe(0)
  })

  it('is zero for an empty row set', () => {
    expect(azpUndatedHidden([], '2026-08-01', '2026-08-31')).toBe(0)
  })
})
