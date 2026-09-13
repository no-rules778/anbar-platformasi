import { describe, expect, it } from 'vitest'
import type { SmReportRow } from './serfiyyat'
import {
  EMPTY_FILTERS, filterReportRows, summariseByItem, summariseByProject, type SmFilters,
} from './serfiyyatFilters'

/* T2 — M13-83, M13-84, M13-86, M13-87. Pure unit evidence only. */

const row = (over: Partial<SmReportRow> = {}): SmReportRow => ({
  d: '2026-09-11', proj: 'Layihə A', item: 'Sement M400', code: '0000001', unit: 'kq',
  qty: 2, price: 5, sum: 10, kontragent: 'Anbar Tədarük MMC', avto: '10-AA-123',
  kanal: 'Nağd', iv: '83951', note: 'təcili qeyd', by: 'anbardar@example.com',
  docNum: 'SM-2026-000001', ...over,
})

const f = (over: Partial<SmFilters> = {}): SmFilters => ({ ...EMPTY_FILTERS, ...over })

describe('filterReportRows — every filter has a positive and a negative (M13-83)', () => {
  const r = row()

  it('an EMPTY filter set retains everything (control)', () => {
    expect(filterReportRows([r], EMPTY_FILTERS)).toHaveLength(1)
  })

  it.each([
    ['d1 (dan)', { d1: '2026-09-01' }, { d1: '2026-09-12' }],
    ['d2 (kimi)', { d2: '2026-09-30' }, { d2: '2026-09-10' }],
    ['proj', { proj: 'Layihə A' }, { proj: 'Layihə B' }],
    ['item', { item: 'sement' }, { item: 'qum' }],
    ['kontragent', { kontragent: 'tədarük' }, { kontragent: 'başqa' }],
    ['avto', { avto: '10-aa' }, { avto: '99-zz' }],
    ['kanal', { kanal: 'Nağd' }, { kanal: 'Bank' }],
    ['iv', { iv: '8395' }, { iv: '00000' }],
    ['note', { note: 'təcili' }, { note: 'yoxdur' }],
    ['by', { by: 'anbardar@' }, { by: 'admin@' }],
    ['q1', { q1: '1' }, { q1: '3' }],
    ['q2', { q2: '3' }, { q2: '1' }],
    ['p1', { p1: '4' }, { p1: '6' }],
    ['p2', { p2: '6' }, { p2: '4' }],
    ['s1', { s1: '9' }, { s1: '11' }],
    ['s2', { s2: '11' }, { s2: '9' }],
  ])('%s retains on a match and drops on a miss', (_name, keep, drop) => {
    expect(filterReportRows([r], f(keep))).toHaveLength(1)
    expect(filterReportRows([r], f(drop))).toHaveLength(0)
  })

  /* EQUALITY BOUNDARIES on the date comparison — legacy uses `<` and `>`, so
     a row dated exactly on the bound is RETAINED by both. */
  it('retains a row dated exactly ON either date bound (boundary)', () => {
    expect(filterReportRows([r], f({ d1: '2026-09-11' }))).toHaveLength(1)
    expect(filterReportRows([r], f({ d2: '2026-09-11' }))).toHaveLength(1)
  })

  /* Likewise the numeric ranges use `<` / `>`, so the exact bound is kept. */
  it('retains a row sitting exactly ON each numeric bound (boundary)', () => {
    expect(filterReportRows([r], f({ q1: '2', q2: '2' }))).toHaveLength(1)
    expect(filterReportRows([r], f({ p1: '5', p2: '5' }))).toHaveLength(1)
    expect(filterReportRows([r], f({ s1: '10', s2: '10' }))).toHaveLength(1)
  })

  /* Layihə and Alınma kanalı are EQUALITY, not substring. A substring
     implementation would wrongly pass these. */
  it('Layihə is EXACT: a substring of the real name does NOT match', () => {
    expect(filterReportRows([r], f({ proj: 'Layihə' }))).toHaveLength(0)
    expect(filterReportRows([r], f({ proj: 'Layihə A' }))).toHaveLength(1)
  })

  it('Alınma kanalı is EXACT: a substring of the real name does NOT match', () => {
    const nagdli = row({ kanal: 'Nağdsız' })
    expect(filterReportRows([nagdli], f({ kanal: 'Nağd' }))).toHaveLength(0)
    expect(filterReportRows([nagdli], f({ kanal: 'Nağdsız' }))).toHaveLength(1)
  })

  it('substring filters are case-insensitive against the stored value', () => {
    expect(filterReportRows([row({ item: 'SEMENT M400' })], f({ item: 'sement' }))).toHaveLength(1)
  })

  it('a substring filter on an EMPTY stored field drops the row (negative)', () => {
    expect(filterReportRows([row({ note: '' })], f({ note: 'qeyd' }))).toHaveLength(0)
  })

  it('applies several filters together, all of which must pass', () => {
    expect(filterReportRows([r], f({ proj: 'Layihə A', item: 'sement', q1: '1' }))).toHaveLength(1)
    expect(filterReportRows([r], f({ proj: 'Layihə A', item: 'qum', q1: '1' }))).toHaveLength(0)
  })
})

/* THE LOAD-BEARING BOUNDARY (M13-84). The bounds are INPUT STRINGS: '' is
   falsy and disables the guard, but '0' is TRUTHY and applies a real zero
   through parseFloat. An implementation that coerced to a number first would
   treat 0 as falsy, skip the guard, and retain BOTH rows — the defect the
   withdrawn D-N4 wrongly attributed to legacy. */
describe('the string-backed zero bound — M13-84', () => {
  const zero = row({ price: 0, sum: 0, item: 'Sıfır qiymətli' })
  const positive = row({ price: 5, sum: 10, item: 'Müsbət' })
  const both = [zero, positive]

  it("p2='0' retains ONLY the zero-priced row, while p2='' retains both", () => {
    expect(filterReportRows(both, f({ p2: '0' })).map((r) => r.item)).toEqual(['Sıfır qiymətli'])
    expect(filterReportRows(both, f({ p2: '' }))).toHaveLength(2)
  })

  it("s2='0' retains ONLY the zero-sum row, while s2='' retains both", () => {
    expect(filterReportRows(both, f({ s2: '0' })).map((r) => r.item)).toEqual(['Sıfır qiymətli'])
    expect(filterReportRows(both, f({ s2: '' }))).toHaveLength(2)
  })

  it("q2='0' drops every positive-quantity row (the same rule on Miqdar)", () => {
    expect(filterReportRows(both, f({ q2: '0' }))).toHaveLength(0)
  })

  /* The other half: a MINIMUM of '0' is applied too, and keeps everything
     non-negative — which is a real comparison, not a skipped guard. */
  it("p1='0' applies a real zero minimum and retains both rows", () => {
    expect(filterReportRows(both, f({ p1: '0' }))).toHaveLength(2)
  })
})

describe('summariseByProject / summariseByItem — M13-86, M13-87', () => {
  /* THE FIXTURE DELIBERATELY OPPOSES both alphabetical and descending-value
     order (protocol §4): first appearance is Zəfər (5), then Aran (100). An
     already-ordered fixture could not falsify the ordering claim. */
  const rows = [
    row({ proj: 'Zəfər', item: 'Zink', sum: 5 }),
    row({ proj: 'Aran', item: 'Armatur', sum: 100 }),
    row({ proj: 'Zəfər', item: 'Zink', sum: 7 }),
  ]

  it('aggregates by project in FIRST-APPEARANCE order, not alphabetical or by value', () => {
    const out = summariseByProject(rows)
    expect(out).toEqual([{ key: 'Zəfər', sum: 12 }, { key: 'Aran', sum: 100 }])
    /* Negative controls: neither competing order would produce this. */
    expect(out.map((r) => r.key)).not.toEqual(['Aran', 'Zəfər'])
  })

  it('aggregates by material in FIRST-APPEARANCE order', () => {
    const out = summariseByItem(rows)
    expect(out).toEqual([{ key: 'Zink', sum: 12 }, { key: 'Armatur', sum: 100 }])
    expect(out.map((r) => r.key)).not.toEqual(['Armatur', 'Zink'])
  })

  it('sums the STORED line_sum, not qty*price', () => {
    /* qty*price would be 2*5=10 here; the stored sum is deliberately 99. */
    expect(summariseByProject([row({ sum: 99 })])).toEqual([{ key: 'Layihə A', sum: 99 }])
  })

  it('returns an EMPTY list for no rows — the caller renders the em-dash row', () => {
    expect(summariseByProject([])).toEqual([])
    expect(summariseByItem([])).toEqual([])
  })

  it('groups an empty project name under one key rather than dropping it', () => {
    expect(summariseByProject([row({ proj: '', sum: 3 }), row({ proj: '', sum: 4 })]))
      .toEqual([{ key: '', sum: 7 }])
  })
})
