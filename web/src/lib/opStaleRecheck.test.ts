import { describe, it, expect } from 'vitest'
import { staleRecheck, NOTHING_TO_POST_MSG, type StaleLine } from './opStaleRecheck'

const line = (p: Partial<StaleLine> = {}): StaleLine => ({
  kind: 'out', w: 'Ələt', c: 'C1', q: 5, name: 'Nasos', ...p,
})

const none = () => 0

describe('staleRecheck — M7-96', () => {
  it('keeps every line untouched when availability still covers them', () => {
    const lines = [line({ q: 3 }), line({ c: 'C2', q: 2, name: 'Ventil' })]
    const res = staleRecheck(lines, () => 10, none)
    expect(res.outcome).toBe('ok')
    if (res.outcome !== 'ok') return
    expect(res.changed).toBe(false)
    expect(res.message).toBeNull()
    expect(res.lines).toHaveLength(2)
    expect(res.lines[0].q).toBe(3)
  })

  it('never re-checks an `in` line — it adds stock rather than consuming it', () => {
    const res = staleRecheck([line({ kind: 'in', q: 99 })], () => 0, none)
    expect(res.outcome).toBe('ok')
    if (res.outcome !== 'ok') return
    expect(res.lines).toHaveLength(1)
    expect(res.lines[0].q).toBe(99)
    expect(res.changed).toBe(false)
  })

  it('drops a line whose availability fell to zero', () => {
    const res = staleRecheck([line({ q: 4 })], () => 0, none)
    expect(res.outcome).toBe('empty')
    if (res.outcome !== 'empty') return
    expect(res.message).toBe(NOTHING_TO_POST_MSG)
  })

  it('trims an over-quantity non-layered line to the available maximum', () => {
    const res = staleRecheck([line({ q: 8 })], () => 3, none)
    expect(res.outcome).toBe('ok')
    if (res.outcome !== 'ok') return
    expect(res.lines[0].q).toBe(3)
    expect(res.changed).toBe(true)
    expect(res.message).toContain('endirildi')
  })

  it('does not mutate the caller\'s line when trimming — the draft survives a refusal', () => {
    const original = line({ q: 8 })
    staleRecheck([original], () => 3, none)
    expect(original.q).toBe(8)
  })

  it('reports a drop and a trim TOGETHER in one message, not one per line', () => {
    const lines = [
      line({ c: 'C1', q: 4, name: 'Nasos' }),
      line({ c: 'C2', q: 9, name: 'Ventil' }),
    ]
    const res = staleRecheck(lines, (_w, c) => (c === 'C1' ? 0 : 2), none)
    expect(res.outcome).toBe('ok')
    if (res.outcome !== 'ok') return
    expect(res.lines).toHaveLength(1)
    expect(res.message).toContain('Nasos')
    expect(res.message).toContain('Ventil')
    expect(res.message?.split(' · ')).toHaveLength(2)
  })

  it('refuses the WHOLE post when a layered line no longer fits, and keeps the draft', () => {
    const lines = [line({ q: 8, allocations: [{ layer_id: 'L1', qty: 8 }] })]
    const res = staleRecheck(lines, () => 3, none)
    expect(res.outcome).toBe('abort')
    if (res.outcome !== 'abort') return
    expect(res.message).toContain('partiyalar yenidən seçilməlidir')
    expect(res.message).toContain('Qaralama saxlanıldı')
  })

  it('never TRIMS a layered line — a shortfall aborts instead of reducing it', () => {
    const lines = [line({ q: 8, allocations: [{ layer_id: 'L1', qty: 8 }] })]
    const res = staleRecheck(lines, () => 3, none)
    /* If this ever returns `ok`, some implementation trimmed the allocations'
       line and would post allocations summing to more than the quantity. */
    expect(res.outcome).not.toBe('ok')
  })

  it('keeps a layered line that still fits and decrements the shared pool', () => {
    const lines = [
      line({ q: 3, allocations: [{ layer_id: 'L1', qty: 3 }] }),
      line({ q: 9 }),
    ]
    const res = staleRecheck(lines, () => 10, none)
    expect(res.outcome).toBe('ok')
    if (res.outcome !== 'ok') return
    /* 10 − 3 = 7 remain, so the second line trims from 9 to 7. */
    expect(res.lines[1].q).toBe(7)
  })

  it('adds the edit restore ONCE per warehouse+code key, never per line', () => {
    /* Balance 0, restore 6, two lines of 3 on the SAME key. Applied once the
       pair fits exactly; applied per line the pool would be 12 and a
       three-line document of 3 each would wrongly pass. */
    const lines = [line({ q: 3 }), line({ q: 3 }), line({ q: 3 })]
    const res = staleRecheck(lines, () => 0, () => 6)
    expect(res.outcome).toBe('ok')
    if (res.outcome !== 'ok') return
    expect(res.lines).toHaveLength(2)
    expect(res.lines.map((l) => l.q)).toEqual([3, 3])
    expect(res.changed).toBe(true)
  })

  it('applies the restore per KEY — two different codes each get their own', () => {
    const lines = [line({ c: 'C1', q: 4 }), line({ c: 'C2', q: 4 })]
    const res = staleRecheck(lines, () => 0, () => 4)
    expect(res.outcome).toBe('ok')
    if (res.outcome !== 'ok') return
    expect(res.lines).toHaveLength(2)
    expect(res.changed).toBe(false)
  })

  it('two lines on one key compete for the SAME pool', () => {
    const lines = [line({ q: 6 }), line({ q: 6 })]
    const res = staleRecheck(lines, () => 10, none)
    expect(res.outcome).toBe('ok')
    if (res.outcome !== 'ok') return
    expect(res.lines.map((l) => l.q)).toEqual([6, 4])
  })

  it('the same code in a DIFFERENT warehouse keeps its own pool', () => {
    const lines = [line({ w: 'Ələt', q: 6 }), line({ w: 'Astara', q: 6 })]
    const res = staleRecheck(lines, () => 10, none)
    expect(res.outcome).toBe('ok')
    if (res.outcome !== 'ok') return
    expect(res.lines.map((l) => l.q)).toEqual([6, 6])
    expect(res.changed).toBe(false)
  })

  it('returns `empty` when every line is dropped', () => {
    const res = staleRecheck([line({ q: 1 }), line({ c: 'C2', q: 1 })], () => 0, none)
    expect(res.outcome).toBe('empty')
  })

  it('falls back to the code when a line carries no name', () => {
    const res = staleRecheck([{ kind: 'out', w: 'Ələt', c: 'C9', q: 4 }], () => 0, none)
    expect(res.outcome).toBe('empty')
    const trimmed = staleRecheck([{ kind: 'out', w: 'Ələt', c: 'C9', q: 4 }], () => 1, none)
    if (trimmed.outcome !== 'ok') { expect.fail('expected ok'); return }
    expect(trimmed.message).toContain('C9')
  })
})
