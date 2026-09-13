import { describe, expect, it } from 'vitest'
import type { ItemRow } from '../api/items.api'
import type { Me } from './roles'
import {
  canReview, canWithdraw, DEFAULT_FILTERS, emptyText, filterRequests, nreqCanCreate,
  nreqNorm, nreqSimilar, requestDateLabel, requestsSubtitle, statusTag,
  SUBTITLE_ADMIN, SUBTITLE_ANBARDAR, SUBTITLE_READONLY,
  type ItemRequestView,
} from './nomenclatureRequests'

/* T1 — M12-53, M12-54, M12-55, M12-22…M12-25, M12-36, M12-31, M12-40…M12-43,
   M12-06, M12-38. Pure unit evidence ONLY: nothing here touches a server, and
   the affordance tests say so in their own names (protocol §7). */

const item = (over: Partial<ItemRow> = {}): ItemRow => ({
  code: '0000001', name: 'Kabel NYM 3x1.5', unit: 'metr', price: 1, category: null, ...over,
})

const req = (over: Partial<ItemRequestView> = {}): ItemRequestView => ({
  id: 'r1', name: 'Sement M400', unit: 'kq', category: 'Tikinti', note: '', status: 'pending',
  by: 'u-anbardar', w: 'Test Anbar', ts: 1_756_000_000_000, decidedBy: '', decidedAt: '',
  reason: '', code: '', ...over,
})

const me = (over: Partial<Me> = {}): Me =>
  ({ id: 'u-anbardar', sbId: 'u-anbardar', email: 'a@x', name: 'A', role: 'anbardar', wh: 'Test Anbar', ...over })

const admin = me({ id: 'u-admin', role: 'admin' })
const anbardar = me()
const otherAnbardar = me({ id: 'u-other' })
const rehber = me({ id: 'u-rehber', role: 'rehber' })

describe('nreqNorm — M12-53', () => {
  /* The SAME case list tests/nomenclature_requests_simulation.js uses to prove
     the browser normaliser equals the server's item_request_norm(). Reused so
     the two cannot drift — but this is a UNIT cross-check against the shared
     corpus, NOT live server evidence (the simulation models SQL, it does not
     execute it). */
  const SHARED_CASES = [
    'Kabel NYM 3x1.5', '  kabel   nym 3x1.5  ', 'KABEL/NYM.3x1,5',
    'Sement M400', 'Şüşə-pambıq', 'Boru (d 20)', '',
  ]

  it.each(SHARED_CASES)('matches the shared simulation corpus for %j', (input) => {
    /* Recomputed by the same documented rule the SQL mirror uses. */
    const expected = String(input).normalize('NFKC').trim().toLowerCase()
      .replace(/[\s/.,"'`’()\-–—]+/g, '')
    expect(nreqNorm(input)).toBe(expected)
  })

  it('collapses whitespace and punctuation to the same key (positive)', () => {
    expect(nreqNorm('Kabel NYM 3x1.5')).toBe(nreqNorm('  KABEL/NYM.3x1,5  '))
    expect(nreqNorm('Kabel NYM 3x1.5')).toBe('kabelnym3x15')
  })

  it('does NOT collide different items (negative control)', () => {
    expect(nreqNorm('Sement M400')).not.toBe(nreqNorm('Sement M500'))
  })

  it('returns empty for null, undefined and empty (boundary)', () => {
    expect(nreqNorm(null)).toBe('')
    expect(nreqNorm(undefined)).toBe('')
    expect(nreqNorm('')).toBe('')
    /* Punctuation-only input normalises away entirely. */
    expect(nreqNorm('  --  ')).toBe('')
  })
})

describe('nreqSimilar — M12-54 length boundary matrix', () => {
  it('returns empty below 2 normalised chars, WITHOUT an exactReq key (legacy shape)', () => {
    const r = nreqSimilar('a', [item({ name: 'a' })], [req({ name: 'a' })])
    expect(r).toEqual({ exact: null, items: [], reqs: [] })
    expect('exactReq' in r).toBe(false)
  })

  it('at exactly 2 chars it matches by EQUALITY (boundary — the rule turns on here)', () => {
    const r = nreqSimilar('ab', [item({ name: 'AB' })], [])
    expect(r.exact?.name).toBe('AB')
  })

  it('a 3-char query matches only by equality — neither containment arm fires', () => {
    /* 'abc' is contained in 'abcd', but the query is 3 chars so the
       `n.length >= 4` arm must NOT fire; 'abcd' is 4 chars, so the OTHER arm
       (k contained in n) also cannot fire because 'abcd' is not inside 'abc'. */
    const r = nreqSimilar('abc', [item({ name: 'abcd' })], [])
    expect(r.items).toHaveLength(0)
    expect(r.exact).toBeNull()
  })

  it('at exactly 4 chars containment fires BOTH ways (boundary)', () => {
    /* query >= 4, contained in the longer candidate name. */
    const forward = nreqSimilar('abcd', [item({ name: 'xabcdx' })], [])
    expect(forward.items).toHaveLength(1)
    /* candidate >= 4, contained in the longer query. */
    const backward = nreqSimilar('xabcdx', [item({ name: 'abcd' })], [])
    expect(backward.items).toHaveLength(1)
  })

  it('exact equality beats containment and is reported as `exact`', () => {
    const r = nreqSimilar('Kabel NYM 3x1.5', [item(), item({ code: '2', name: 'Kabel NYM 3x1.5 uzun' })], [])
    expect(r.exact?.code).toBe('0000001')
    expect(r.items).toHaveLength(2)
  })

  it('caps each list at 10 (boundary: 11 matching items yield 10)', () => {
    const many = Array.from({ length: 11 }, (_, i) => item({ code: String(i), name: 'kabelnym' + i }))
    expect(nreqSimilar('kabelnym', many, []).items).toHaveLength(10)
    const manyReqs = Array.from({ length: 11 }, (_, i) => req({ id: String(i), name: 'kabelnym' + i }))
    expect(nreqSimilar('kabelnym', [], manyReqs).reqs).toHaveLength(10)
  })
})

describe('nreqSimilar — M12-55 only PENDING requests are candidates', () => {
  it.each(['approved', 'rejected', 'cancelled'])(
    'a %s request never appears as a candidate (negative control)',
    (status) => {
      const r = nreqSimilar('Sement M400', [], [req({ status })])
      expect(r.reqs).toHaveLength(0)
      expect(r.exactReq).toBeNull()
    },
  )

  it('a PENDING request with the same normalised name IS reported as exactReq (positive)', () => {
    const r = nreqSimilar('sement  m400', [], [req()])
    expect(r.exactReq?.id).toBe('r1')
    expect(r.reqs).toHaveLength(1)
  })
})

describe('filterRequests — M12-22…M12-25', () => {
  const rows = [
    req({ id: 'p', status: 'pending', name: 'Sement M400' }),
    req({ id: 'a', status: 'approved', name: 'Kabel', code: '0000009' }),
    req({ id: 'r', status: 'rejected', name: 'Boru' }),
    req({ id: 'c', status: 'cancelled', name: 'Nasos' }),
  ]

  it('the default filter is the pending segment — M12-20', () => {
    expect(DEFAULT_FILTERS).toEqual({ q: '', status: 'pending' })
  })

  it.each(['pending', 'approved', 'rejected'])('the %s segment keeps only that status', (status) => {
    const out = filterRequests(rows, { status, q: '' })
    expect(out.map((r) => r.status)).toEqual([status])
  })

  it("«Hamısı» (empty status) keeps every row INCLUDING cancelled — M12-21, the only route to it", () => {
    const out = filterRequests(rows, { status: '', q: '' })
    expect(out).toHaveLength(4)
    expect(out.some((r) => r.status === 'cancelled')).toBe(true)
  })

  it('searches name, unit, category and code — M12-23 positive', () => {
    const all = { status: '', q: '' }
    expect(filterRequests(rows, { ...all, q: 'sement' }).map((r) => r.id)).toEqual(['p'])
    expect(filterRequests(rows, { ...all, q: '0000009' }).map((r) => r.id)).toEqual(['a'])
    expect(filterRequests([req({ unit: 'litr' })], { ...all, q: 'litr' })).toHaveLength(1)
    expect(filterRequests([req({ category: 'Elektrik' })], { ...all, q: 'elektrik' })).toHaveLength(1)
  })

  it('does NOT search the note or the warehouse — M12-23 falsifiable negative', () => {
    const rowsWithNote = [req({ note: 'təcili lazımdır', w: 'Xocahəsən' })]
    expect(filterRequests(rowsWithNote, { status: '', q: 'təcili' })).toHaveLength(0)
    expect(filterRequests(rowsWithNote, { status: '', q: 'xocahəsən' })).toHaveLength(0)
  })

  it('combines status AND search; neither resets the other — M12-25', () => {
    expect(filterRequests(rows, { status: 'approved', q: 'kabel' }).map((r) => r.id)).toEqual(['a'])
    /* Right status, wrong term → empty, proving both predicates apply. */
    expect(filterRequests(rows, { status: 'approved', q: 'sement' })).toHaveLength(0)
    /* Right term, wrong status → empty. */
    expect(filterRequests(rows, { status: 'pending', q: 'kabel' })).toHaveLength(0)
  })

  it('an empty query matches every row regardless of empty unit/category/code', () => {
    expect(filterRequests([req({ unit: '', category: '', code: '' })], { status: '', q: '' })).toHaveLength(1)
  })
})

describe('statusTag — M12-36', () => {
  it.each([
    ['pending', 'tag t-op', 'Gözləyir'],
    ['approved', 'tag t-in', 'Təsdiqlənib'],
    ['rejected', 'tag t-rm', 'Rədd edilib'],
    ['cancelled', 'tag', 'Ləğv edilib'],
  ])('%s renders the exact tag markup', (status, cls, text) => {
    expect(statusTag(status)).toEqual({ cls, text })
  })

  it('an unknown status falls back to the RAW text with NO tag (negative control)', () => {
    expect(statusTag('draft')).toEqual({ cls: null, text: 'draft' })
    expect(statusTag('')).toEqual({ cls: null, text: '' })
  })
})

describe('requestDateLabel — M12-31', () => {
  it('formats an ordinary timestamp as DD.MM.YYYY', () => {
    expect(requestDateLabel(Date.UTC(2026, 8, 11))).toBe('11.09.2026')
  })

  it('ts = 0 renders the EPOCH date, NOT an em-dash (boundary; legacy fact)', () => {
    expect(requestDateLabel(0)).toBe('01.01.1970')
  })
})

describe('canReview / canWithdraw — AFFORDANCE ONLY, never a permission', () => {
  /* M12-40…M12-43. The server gate is sql/017 and is proven separately by
     refusal (M12-91); nothing in this block is security evidence. */
  const STATUSES = ['pending', 'approved', 'rejected', 'cancelled']

  it('«Nəzərdən keçir» is offered to admin on a PENDING row only — M12-40', () => {
    for (const status of STATUSES) {
      expect(canReview(admin, req({ status }))).toBe(status === 'pending')
    }
  })

  it.each([['anbardar-author', anbardar], ['anbardar-other', otherAnbardar], ['rehber', rehber]])(
    '«Nəzərdən keçir» is never offered to %s on any status — M12-40 negative',
    (_label, who) => {
      for (const status of STATUSES) expect(canReview(who, req({ status }))).toBe(false)
    },
  )

  it('«Geri götür» — admin on pending only; author on their own pending only — M12-41', () => {
    for (const status of STATUSES) {
      const pending = status === 'pending'
      expect(canWithdraw(admin, req({ status }))).toBe(pending)
      expect(canWithdraw(anbardar, req({ status, by: 'u-anbardar' }))).toBe(pending)
    }
  })

  it("an anbardar gets NO «Geri götür» on another anbardar's pending row — M12-43", () => {
    expect(canWithdraw(otherAnbardar, req({ status: 'pending', by: 'u-anbardar' }))).toBe(false)
  })

  it('a rehber gets NO action on any status — M12-42 negative', () => {
    for (const status of STATUSES) {
      expect(canWithdraw(rehber, req({ status }))).toBe(false)
      expect(canReview(rehber, req({ status }))).toBe(false)
    }
  })

  it('a DECIDED row offers nothing to ANY role — M12-42', () => {
    for (const status of ['approved', 'rejected', 'cancelled']) {
      for (const who of [admin, anbardar, otherAnbardar, rehber]) {
        expect(canReview(who, req({ status }))).toBe(false)
        expect(canWithdraw(who, req({ status, by: who.id }))).toBe(false)
      }
    }
  })

  it('a null viewer is offered nothing (boundary)', () => {
    expect(canReview(null, req())).toBe(false)
    expect(canWithdraw(null, req())).toBe(false)
  })
})

describe('nreqCanCreate — M12-07 affordance', () => {
  it('is true for an anbardar ONLY — not admin, not rehber', () => {
    expect(nreqCanCreate(anbardar)).toBe(true)
    expect(nreqCanCreate(admin)).toBe(false)
    expect(nreqCanCreate(rehber)).toBe(false)
    expect(nreqCanCreate(null)).toBe(false)
  })
})

describe('requestsSubtitle — M12-06', () => {
  it('renders exactly three variants, admin taking precedence', () => {
    expect(requestsSubtitle(admin)).toBe(SUBTITLE_ADMIN)
    expect(requestsSubtitle(anbardar)).toBe(SUBTITLE_ANBARDAR)
    expect(requestsSubtitle(rehber)).toBe(SUBTITLE_READONLY)
  })

  it('a legacy role mapped to rehber gets the read-only variant', () => {
    expect(requestsSubtitle(me({ role: 'muhasib' }))).toBe(SUBTITLE_READONLY)
    expect(requestsSubtitle(null)).toBe(SUBTITLE_READONLY)
  })
})

describe('emptyText — M12-38', () => {
  it('depends on the ACTIVE filter, not on the row count', () => {
    expect(emptyText('pending')).toBe('Gözləyən sorğu yoxdur.')
    expect(emptyText('')).toBe('Sorğu tapılmadı.')
    expect(emptyText('approved')).toBe('Sorğu tapılmadı.')
  })
})
