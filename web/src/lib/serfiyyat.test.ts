import { describe, expect, it } from 'vitest'
import type { ItemRow } from '../api/items.api'
import type { Me } from './roles'
import {
  activeChannelNames, allowedProjects, canWrite, docById, draftGrandTotal, draftLineTotal,
  itemSearchHits, projById, reportRows,
  type SmDocument, type SmLine, type SmProject,
} from './serfiyyat'

/* T1 — M13-05, M13-06, M13-07, M13-32, M13-42, M13-43, M13-75, M13-76, M13-77.

   PURE UNIT EVIDENCE ONLY. Nothing here touches a server, so every "may/may
   not" below is a BROWSER AFFORDANCE and is named as one (protocol §7). The
   server-authoritative counterparts are M13-90…M13-94 and are not satisfied
   by any assertion in this file. */

const me = (over: Partial<Me> = {}): Me =>
  ({ id: 'u1', sbId: 'u1', email: 'a@x', name: 'A', role: 'anbardar', wh: 'Test Anbar', ...over })

const admin = me({ id: 'u-admin', role: 'admin', wh: '' })
const anbardar = me({ id: 'u-anb' })
const anbardarOther = me({ id: 'u-anb2', wh: 'Başqa Anbar' })
const anbardarNoWh = me({ id: 'u-anb3', wh: '' })
const rehber = me({ id: 'u-reh', role: 'rehber', wh: '' })

const proj = (over: Partial<SmProject> = {}): SmProject =>
  ({ id: 'p1', name: 'Layihə A', wh: 'Test Anbar', active: true, ...over })

const PROJECTS: SmProject[] = [
  proj(),
  proj({ id: 'p2', name: 'Layihə B', wh: 'Başqa Anbar' }),
  proj({ id: 'p3', name: 'Layihə C (deaktiv)', wh: 'Test Anbar', active: false }),
  proj({ id: 'p4', name: 'Layihə D (anbarsız)', wh: '' }),
]

const item = (over: Partial<ItemRow> = {}): ItemRow =>
  ({ code: '0000001', name: 'Sement M400', unit: 'kq', price: 5, category: null, ...over })

describe('allowedProjects — M13-06, M13-07 (AFFORDANCE, never a permission)', () => {
  /* The full {role} × {forWrite} matrix the plan names. */
  it('admin gets every ACTIVE project, for write and for read alike', () => {
    expect(allowedProjects(admin, PROJECTS, true).map((p) => p.id)).toEqual(['p1', 'p2', 'p4'])
    expect(allowedProjects(admin, PROJECTS, false).map((p) => p.id)).toEqual(['p1', 'p2', 'p4'])
  })

  it('anbardar with a matching warehouse gets only that warehouse’s active projects', () => {
    expect(allowedProjects(anbardar, PROJECTS, true).map((p) => p.id)).toEqual(['p1'])
    expect(allowedProjects(anbardar, PROJECTS, false).map((p) => p.id)).toEqual(['p1'])
  })

  it('anbardar of another warehouse gets that OTHER warehouse’s projects, not p1 (negative)', () => {
    expect(allowedProjects(anbardarOther, PROJECTS, true).map((p) => p.id)).toEqual(['p2'])
  })

  /* `ME.wh` falsy falls through to the final branch, NOT to the anbardar one. */
  it('anbardar with NO warehouse falls through: none for write, all active for read', () => {
    expect(allowedProjects(anbardarNoWh, PROJECTS, true)).toEqual([])
    expect(allowedProjects(anbardarNoWh, PROJECTS, false).map((p) => p.id)).toEqual(['p1', 'p2', 'p4'])
  })

  /* THE LOAD-BEARING CONTROL (M13-07). A single-value test cannot separate
     these two cells: the asymmetry IS the contract. */
  it('rehber: NO project for writing, but EVERY active project for reading', () => {
    expect(allowedProjects(rehber, PROJECTS, true)).toEqual([])
    expect(allowedProjects(rehber, PROJECTS, false).map((p) => p.id)).toEqual(['p1', 'p2', 'p4'])
  })

  it.each([
    ['admin', admin], ['anbardar', anbardar], ['anbardar-no-wh', anbardarNoWh], ['rehber', rehber],
  ])('never returns an INACTIVE project for %s, in either mode', (_r, who) => {
    for (const forWrite of [true, false]) {
      expect(allowedProjects(who, PROJECTS, forWrite).some((p) => p.id === 'p3')).toBe(false)
    }
  })
})

describe('canWrite — M13-05 (AFFORDANCE, never a permission)', () => {
  it('is true for admin and anbardar (positive)', () => {
    expect(canWrite(admin)).toBe(true)
    expect(canWrite(anbardar)).toBe(true)
  })

  it('is false for a rehber and for a signed-out caller (negative)', () => {
    expect(canWrite(rehber)).toBe(false)
    expect(canWrite(null)).toBe(false)
  })

  /* effectiveRole() maps the legacy values to rehber — they may not write. */
  it.each(['techizat', 'muhasib', 'baxis'])('is false for the legacy role %s', (role) => {
    expect(canWrite(me({ role }))).toBe(false)
  })
})

describe('docById / projById — index.html:6227-6228', () => {
  const docs: SmDocument[] = [{
    id: 'd1', num: 'SM-2026-000001', projectId: 'p1', kontragent: '', avto: '', kanal: '',
    iv: '', d: '2026-09-11', note: '', by: '', ts: 0,
  }]

  it('finds a present id and returns undefined for a missing one', () => {
    expect(docById(docs, 'd1')?.num).toBe('SM-2026-000001')
    expect(docById(docs, 'nope')).toBeUndefined()
    expect(projById(PROJECTS, 'p2')?.name).toBe('Layihə B')
    expect(projById(PROJECTS, 'nope')).toBeUndefined()
  })
})

describe('activeChannelNames — M13-30', () => {
  it('keeps only the active names, in order (positive + negative)', () => {
    expect(activeChannelNames([
      { name: 'Nağd', active: true },
      { name: 'Köhnə kanal', active: false },
      { name: 'Bank', active: true },
    ])).toEqual(['Nağd', 'Bank'])
  })
})

describe('draft line arithmetic — M13-42, M13-43', () => {
  it('uses the RAW qty*price, NOT the rounded stored line_sum (the recorded difference)', () => {
    /* 0.1*0.1 = 0.010000000000000002 in IEEE-754; round(...,2) stores 0.01.
       Pinning the raw value proves the draft is not silently rounded. */
    expect(draftLineTotal({ code: 'c', qty: 0.1, price: 0.1 })).toBe(0.1 * 0.1)
    expect(draftLineTotal({ code: 'c', qty: 0.1, price: 0.1 })).not.toBe(0.01)
  })

  it('sums every draft line (positive)', () => {
    expect(draftGrandTotal([
      { code: 'a', qty: 2, price: 3 },
      { code: 'b', qty: 1, price: 0.5 },
    ])).toBe(6.5)
  })

  /* BOUNDARY — the grand total of exactly 0 is what money() renders as an
     em-dash rather than `0,00 ₼`. The zero must survive this function
     unchanged for that rule to be reachable. */
  it('returns exactly 0 for an empty draft and for zero-priced lines (boundary)', () => {
    expect(draftGrandTotal([])).toBe(0)
    expect(draftGrandTotal([{ code: 'a', qty: 5, price: 0 }])).toBe(0)
  })
})

describe('itemSearchHits — M13-32', () => {
  const ITEMS = [
    item({ code: '0000001', name: 'Sement M400' }),
    item({ code: '0000002', name: 'Qum' }),
    item({ code: '0000123', name: 'Armatur 12' }),
  ]

  /* BOUNDARY MATRIX on the length rule: below, exactly at, above. */
  it('returns nothing for 0 and 1 characters, and searches at exactly 2 (boundary)', () => {
    expect(itemSearchHits('', ITEMS)).toEqual([])
    expect(itemSearchHits('s', ITEMS)).toEqual([])
    expect(itemSearchHits('se', ITEMS).map((i) => i.code)).toEqual(['0000001'])
    expect(itemSearchHits('sem', ITEMS).map((i) => i.code)).toEqual(['0000001'])
  })

  it('trims before applying the length rule, so a spaced single char still returns nothing', () => {
    expect(itemSearchHits('  s  ', ITEMS)).toEqual([])
  })

  it('matches a NAME substring case-insensitively (positive)', () => {
    expect(itemSearchHits('MENT', ITEMS).map((i) => i.code)).toEqual(['0000001'])
  })

  it('matches a CODE substring — the OR half, which a name-only search would fail', () => {
    expect(itemSearchHits('0123', ITEMS).map((i) => i.code)).toEqual(['0000123'])
  })

  it('returns nothing when neither name nor code matches (negative)', () => {
    expect(itemSearchHits('zzzz', ITEMS)).toEqual([])
  })

  /* 13 candidates, so a missing `.slice(0, 12)` is visible. */
  it('caps at 12 hits with a 13-candidate fixture (boundary)', () => {
    const many = Array.from({ length: 13 }, (_, i) =>
      item({ code: String(i).padStart(7, '0'), name: 'Kabel ' + i }))
    expect(itemSearchHits('kabel', many)).toHaveLength(12)
  })

  /* This search is its own rule. It must NOT strip punctuation the way
     nreqNorm() does, or a fourth shared normaliser would have been
     introduced where legacy has none. */
  it('is NOT a punctuation-stripping normaliser (negative control)', () => {
    const withPunct = [item({ code: '0000009', name: 'Kabel NYM 3x1.5' })]
    expect(itemSearchHits('nym 3x1.5', withPunct)).toHaveLength(1)
    expect(itemSearchHits('nym3x15', withPunct)).toHaveLength(0)
  })
})

describe('reportRows — M13-75, M13-76, M13-77', () => {
  const docs: SmDocument[] = [
    {
      id: 'd1', num: 'SM-2026-000001', projectId: 'p1', kontragent: 'MMC', avto: '10-AA-123',
      kanal: 'Nağd', iv: '83951', d: '2026-09-11', note: 'qeyd', by: 'u-anb', ts: 1,
    },
    {
      id: 'd2', num: 'SM-2026-000002', projectId: 'p2', kontragent: '', avto: '',
      kanal: '', iv: '', d: '2026-09-10', note: '', by: 'u-unknown', ts: 2,
    },
  ]

  const line = (over: Partial<SmLine> = {}): SmLine =>
    ({ id: 'l1', docId: 'd1', code: '0000001', qty: 2, price: 5, sum: 10, ...over })

  const itemsByCode = new Map([['0000001', item()]])
  const emails = new Map([['u-anb', 'anbardar@example.com']])

  it('builds a complete row from a resolvable line (positive)', () => {
    const rows = reportRows([line()], docs, PROJECTS, itemsByCode, emails, new Set(['p1']))
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({
      d: '2026-09-11', docNum: 'SM-2026-000001', proj: 'Layihə A', item: 'Sement M400',
      code: '0000001', unit: 'kq', qty: 2, price: 5, sum: 10, kontragent: 'MMC',
      avto: '10-AA-123', kanal: 'Nağd', iv: '83951', note: 'qeyd', by: 'anbardar@example.com',
    })
  })

  it('drops a line whose DOCUMENT is missing (negative control)', () => {
    const rows = reportRows([line({ docId: 'gone' })], docs, PROJECTS, itemsByCode, emails, new Set(['p1']))
    expect(rows).toEqual([])
  })

  it('drops a line whose project is OUTSIDE the allowed set (negative control)', () => {
    const rows = reportRows([line({ docId: 'd2' })], docs, PROJECTS, itemsByCode, emails, new Set(['p1']))
    expect(rows).toEqual([])
  })

  /* D-N6 — the unresolved author keeps the raw uuid rather than blanking. */
  it('falls back to the RAW uuid when the directory cannot resolve the author', () => {
    const rows = reportRows([line({ docId: 'd2' })], docs, PROJECTS, itemsByCode, emails, new Set(['p2']))
    expect(rows[0].by).toBe('u-unknown')
  })

  it('falls back to the CODE and an empty unit for an unknown item', () => {
    const rows = reportRows([line({ code: '9999999' })], docs, PROJECTS, itemsByCode, emails, new Set(['p1']))
    expect(rows[0].item).toBe('9999999')
    expect(rows[0].unit).toBe('')
  })

  /* M13-43 — the report shows the STORED sum, not a recomputation. A
     recomputing implementation would return 10 here and fail. */
  it('carries the STORED line_sum even when it differs from qty*price', () => {
    const rows = reportRows([line({ sum: 99 })], docs, PROJECTS, itemsByCode, emails, new Set(['p1']))
    expect(rows[0].sum).toBe(99)
  })

  /* M13-76 — the rehber report scope, built the way the page must build it. */
  it('a rehber’s read-scoped allowed set yields rows a write-scoped set would blank', () => {
    const readIds = new Set(allowedProjects(rehber, PROJECTS, false).map((p) => p.id))
    const writeIds = new Set(allowedProjects(rehber, PROJECTS, true).map((p) => p.id))
    expect(reportRows([line()], docs, PROJECTS, itemsByCode, emails, readIds)).toHaveLength(1)
    expect(reportRows([line()], docs, PROJECTS, itemsByCode, emails, writeIds)).toHaveLength(0)
  })
})
