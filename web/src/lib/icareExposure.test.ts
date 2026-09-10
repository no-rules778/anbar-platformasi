import { describe, it, expect } from 'vitest'
import {
  ICARE_USE_MARK, ICARE_USE_RE, icareQtyOf, icareExposure,
  icareExposedLines, applyIcareMark, type ExposureLine,
} from './icareExposure'

const cond = (icare: number) => ({ unfit: 0, repair: 0, onsite: 0, icare })

describe('icareExposure — M7-78', () => {
  it('is zero while free stock covers the quantity', () => {
    // balance 10, rented 5 → free 5; taking 5 touches nothing rented
    expect(icareExposure(cond(5), 10, 5)).toBe(0)
  })

  it('exposes exactly the overflow into the rented part', () => {
    // free 5, taking 6 → 1 unit comes out of somebody else's goods
    expect(icareExposure(cond(5), 10, 6)).toBe(1)
  })

  it('is zero when nothing is rented', () => {
    expect(icareExposure(cond(0), 10, 10)).toBe(0)
    expect(icareExposure(null, 10, 10)).toBe(0)
  })

  it('is zero for a non-positive quantity', () => {
    expect(icareExposure(cond(5), 10, 0)).toBe(0)
    expect(icareExposure(cond(5), 10, -3)).toBe(0)
  })

  it('never returns a negative exposure', () => {
    expect(icareExposure(cond(5), 100, 1)).toBe(0)
  })

  it('rounds to two decimals, as the original does', () => {
    // free = 10 - 5 = 5
    expect(icareExposure(cond(5), 10, 5.5)).toBe(0.5)
    expect(icareExposure(cond(5), 10, 5.006)).toBe(0.01)
  })

  /* INHERITED float quirk, pinned so it cannot change silently: the original
     computes Math.round((qty - free) * 100) / 100, and (5.005 - 5) * 100 is
     0.49999999999998934 in IEEE-754, so this rounds DOWN to 0 rather than up
     to 0.01. Verified against the legacy expression (index.html:3496). */
  it('inherits the legacy float rounding at the .005 boundary', () => {
    expect(icareExposure(cond(5), 10, 5.005)).toBe(0)
  })

  it('treats free stock as zero when markers exceed the balance', () => {
    expect(icareExposure(cond(20), 10, 3)).toBe(3)
  })

  it('subtracts alreadyTaken from the free stock — M7-80', () => {
    expect(icareExposure(cond(5), 10, 3, 0)).toBe(0)
    expect(icareExposure(cond(5), 10, 3, 4)).toBe(2)
  })

  it('icareQtyOf reads the stored figure', () => {
    expect(icareQtyOf(cond(4))).toBe(4)
    expect(icareQtyOf(null)).toBe(0)
  })
})

describe('icareExposedLines — M7-79, M7-80', () => {
  const lookup = (icare: number, balance: number) => () => ({ cond: cond(icare), balance })
  const L = (o: Partial<ExposureLine> = {}): ExposureLine =>
    ({ kind: 'out', t: 'Silinmə', w: 'Elet', c: 'A', q: 1, ...o })

  it('reports a line that reaches into the rented part', () => {
    const hits = icareExposedLines([L({ q: 6 })], lookup(5, 10))
    expect(hits).toHaveLength(1)
    expect(hits[0].exp).toBe(1)
    expect(hits[0].w).toBe('Elet')
  })

  /* Handing rented goods back to their owner is what the İcarədə figure is
     FOR — not an exception to it. */
  it('EXCLUDES «Qaytarma»', () => {
    expect(icareExposedLines([L({ t: 'Qaytarma', q: 10 })], lookup(5, 10))).toHaveLength(0)
  })

  it('EXCLUDES inbound lines', () => {
    expect(icareExposedLines([L({ kind: 'in', q: 10 })], lookup(5, 10))).toHaveLength(0)
  })

  it('uses the SOURCE warehouse on a transfer, never the destination', () => {
    const seen: string[] = []
    const mvLine = L({ kind: 'mv', t: 'Yerdəyişmə', w: 'Elet', q: 6 })
    icareExposedLines(
      [mvLine],
      (w) => { seen.push(w); return { cond: cond(5), balance: 10 } },
    )
    expect(seen).toEqual(['Elet'])
    expect(seen).not.toContain('Astara')
  })

  /* Two lines on the same warehouse+item consume the free stock cumulatively:
     the first is covered, the second is not. */
  it('accumulates alreadyTaken across lines on the same warehouse+item', () => {
    const hits = icareExposedLines([L({ q: 5 }), L({ q: 3 })], lookup(5, 10))
    expect(hits).toHaveLength(1)
    expect(hits[0].line.q).toBe(3)
    expect(hits[0].exp).toBe(3)
  })

  it('keeps separate tallies per warehouse+item', () => {
    const hits = icareExposedLines(
      [L({ q: 5 }), L({ c: 'B', q: 5 })],
      lookup(5, 10),
    )
    expect(hits).toHaveLength(0)
  })
})

describe('applyIcareMark — M7-82', () => {
  it('appends the marker to an empty note', () => {
    expect(applyIcareMark('', 'təcili lazım oldu'))
      .toBe('İcarədə olan maldan: təcili lazım oldu')
    expect(applyIcareMark(null, 'x')).toBe(ICARE_USE_MARK('x'))
  })

  it('joins an existing note with ' + '·', () => {
    expect(applyIcareMark('akt №12', 'səbəb'))
      .toBe('akt №12 · İcarədə olan maldan: səbəb')
  })

  /* The user can confirm the İcarə dialog and then cancel the post dialog;
     a second attempt must NOT stack a second marker. */
  it('two rounds produce exactly ONE marker', () => {
    const once = applyIcareMark('akt №12', 'birinci')
    const twice = applyIcareMark(once, 'ikinci')
    expect(twice).toBe('akt №12 · İcarədə olan maldan: ikinci')
    expect(twice.match(/İcarədə olan maldan:/g)).toHaveLength(1)
  })

  it('strips a marker that stands alone', () => {
    const only = ICARE_USE_MARK('birinci')
    expect(applyIcareMark(only, 'ikinci')).toBe(ICARE_USE_MARK('ikinci'))
  })

  it('the strip regex only matches at the end', () => {
    expect(ICARE_USE_RE.test('İcarədə olan maldan: x')).toBe(true)
    expect(ICARE_USE_RE.test('note · İcarədə olan maldan: x')).toBe(true)
  })
})
