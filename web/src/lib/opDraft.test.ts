import { describe, it, expect } from 'vitest'
import {
  DRAFT_V, DRAFT_TTL_MS, DRAFT_MAX_LINES, draftKey, draftStamp,
  shouldSaveDraft, serialiseDraft, restoreDraft,
} from './opDraft'

const line = (w = 'Elet') => ({ kind: 'out', w, c: 'A', q: 1 })
const NOW = Date.UTC(2026, 8, 4, 12, 0, 0)

const payload = (o: Record<string, unknown> = {}) => JSON.stringify({
  v: DRAFT_V, ts: NOW, kind: 'out', lines: [line()], hdr: null, requestKey: 'K', ...o,
})

describe('draftKey — M7-51', () => {
  /* Per-user: another user on the same device sees their own draft, never
     somebody else's. */
  it('is scoped to the user id', () => {
    expect(draftKey('u1')).toBe('anbar_op_draft_u1')
    expect(draftKey('u2')).not.toBe(draftKey('u1'))
  })
  it('falls back to anon', () => {
    expect(draftKey(null)).toBe('anbar_op_draft_anon')
    expect(draftKey('')).toBe('anbar_op_draft_anon')
  })
})

describe('draftStamp — M7-55', () => {
  it('formats dd.mm.yyyy hh:mm with zero padding', () => {
    const d = new Date(2026, 0, 5, 9, 7)
    expect(draftStamp(d.getTime())).toBe('05.01.2026 09:07')
  })
  it('returns an em-dash for an invalid timestamp', () => {
    expect(draftStamp(NaN)).toBe('—')
  })
})

describe('shouldSaveDraft — M7-52', () => {
  it('saves a normal draft', () => {
    expect(shouldSaveDraft([line()], false)).toBe(true)
  })

  it('does not save an empty draft', () => {
    expect(shouldSaveDraft([], false)).toBe(false)
  })

  it('does not save beyond the line cap', () => {
    expect(shouldSaveDraft(new Array(DRAFT_MAX_LINES).fill(line()), false)).toBe(true)
    expect(shouldSaveDraft(new Array(DRAFT_MAX_LINES + 1).fill(line()), false)).toBe(false)
  })

  /* A restored edit-mode draft would lose its correction context and post as a
     NEW document, leaving the original uncancelled — a duplicate. */
  it('NEVER saves in edit mode, even with lines present', () => {
    expect(shouldSaveDraft([line()], true)).toBe(false)
  })
})

describe('serialiseDraft', () => {
  it('stamps the version and timestamp', () => {
    const d = serialiseDraft({ kind: 'in', lines: [line()], hdr: { a: 1 }, requestKey: 'K', now: NOW })
    expect(d).toMatchObject({ v: DRAFT_V, ts: NOW, kind: 'in', requestKey: 'K' })
  })
  it('normalises a missing header and request key', () => {
    const d = serialiseDraft({ kind: 'in', lines: [], hdr: undefined, requestKey: '', now: NOW })
    expect(d.hdr).toBeNull()
    expect(d.requestKey).toBe('')
  })
})

describe('restoreDraft — M7-53', () => {
  const wh = ['Elet', 'Astara']

  it('restores a valid draft', () => {
    const r = restoreDraft(payload(), wh, NOW)
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.lines).toHaveLength(1)
      expect(r.kind).toBe('out')
      expect(r.requestKey).toBe('K')
      expect(r.dropped).toBe(0)
    }
  })

  it('rejects an absent draft', () => {
    expect(restoreDraft(null, wh, NOW)).toEqual({ ok: false, reason: 'absent' })
  })

  it('rejects malformed JSON', () => {
    expect(restoreDraft('{not json', wh, NOW)).toEqual({ ok: false, reason: 'malformed' })
    expect(restoreDraft('null', wh, NOW)).toEqual({ ok: false, reason: 'malformed' })
  })

  it('rejects a different version', () => {
    expect(restoreDraft(payload({ v: 99 }), wh, NOW)).toEqual({ ok: false, reason: 'version' })
  })

  it('rejects an empty or non-array line set', () => {
    expect(restoreDraft(payload({ lines: [] }), wh, NOW)).toEqual({ ok: false, reason: 'empty' })
    expect(restoreDraft(payload({ lines: 'x' }), wh, NOW)).toEqual({ ok: false, reason: 'empty' })
  })

  /* A draft older than 7 days is not restored — it would risk posting a
     stale-dated document. */
  it('rejects a draft older than the 7-day TTL', () => {
    const old = payload({ ts: NOW - DRAFT_TTL_MS - 1 })
    expect(restoreDraft(old, wh, NOW)).toEqual({ ok: false, reason: 'expired' })
  })

  it('accepts a draft exactly at the TTL boundary', () => {
    expect(restoreDraft(payload({ ts: NOW - DRAFT_TTL_MS }), wh, NOW).ok).toBe(true)
  })

  it('rejects a missing timestamp', () => {
    expect(restoreDraft(payload({ ts: 0 }), wh, NOW)).toEqual({ ok: false, reason: 'expired' })
  })
})

describe('restoreDraft — permission re-filter (M7-54)', () => {
  it('drops lines for a warehouse the user no longer has', () => {
    const raw = payload({ lines: [line('Elet'), line('Ofis')] })
    const r = restoreDraft(raw, ['Elet'], NOW)
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.lines).toHaveLength(1)
      expect(r.dropped).toBe(1)
    }
  })

  it('reports no-permission when NOTHING survives', () => {
    const raw = payload({ lines: [line('Ofis')] })
    expect(restoreDraft(raw, ['Elet'], NOW)).toEqual({ ok: false, reason: 'no-permission' })
  })

  it('drops a line with no item code', () => {
    const raw = payload({ lines: [{ kind: 'out', w: 'Elet', c: '' }, line()] })
    const r = restoreDraft(raw, ['Elet'], NOW)
    if (r.ok) expect(r.dropped).toBe(1)
  })

  it('keeps every line when all warehouses are still allowed', () => {
    const raw = payload({ lines: [line('Elet'), line('Astara')] })
    const r = restoreDraft(raw, ['Elet', 'Astara'], NOW)
    if (r.ok) {
      expect(r.lines).toHaveLength(2)
      expect(r.dropped).toBe(0)
    }
  })
})
