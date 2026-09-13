import { describe, expect, it } from 'vitest'
import { sparklinePath } from './sparkline'

/* T5 — the sparkline geometry (M14-48, M14-49). The empty-set case (M14-50)
   is the component's, since legacy returns '' before building any element. */

describe('sparkline geometry — index.html:1397-1408', () => {
  it('starts with M, continues with L, and closes the area to the baseline', () => {
    const { line, area } = sparklinePath([{ k: 'a', v: 0 }, { k: 'b', v: 10 }], 100, 50)
    expect(line.startsWith('M')).toBe(true)
    expect(line).toContain('L')
    expect(area.endsWith('L100 50 L0 50 Z')).toBe(true)
    /* The area is the line plus the closing segments — not a separate path. */
    expect(area.startsWith(line)).toBe(true)
  })

  it('spreads points evenly across the full width', () => {
    const { dots } = sparklinePath(
      [{ k: 'a', v: 1 }, { k: 'b', v: 1 }, { k: 'c', v: 1 }], 100, 50,
    )
    expect(dots.map((d) => d.cx)).toEqual(['0.0', '50.0', '100.0'])
  })

  /* M14-49 — a SINGLE point must not compute w/(n-1) = w/0. */
  it('does not divide by zero for a single point', () => {
    const { dots, line } = sparklinePath([{ k: 'only', v: 5 }], 620, 90)
    expect(dots).toHaveLength(1)
    expect(dots[0].cx).toBe('0.0')
    expect(Number.isFinite(Number(dots[0].cx))).toBe(true)
    expect(line).not.toContain('NaN')
    expect(line).not.toContain('Infinity')
  })

  /* M14-49 — the scale floors at 1, so an all-zero series draws flat on the
     baseline rather than producing NaN from 0/0. */
  it('floors the scale at 1 so an all-zero series stays on the baseline', () => {
    const { dots, line } = sparklinePath([{ k: 'a', v: 0 }, { k: 'b', v: 0 }], 100, 50)
    expect(line).not.toContain('NaN')
    /* v=0 maps to y = h - 0 = h, the baseline. */
    expect(dots.every((d) => d.cy === '50.0')).toBe(true)
  })

  it('maps the maximum value to the top with the legacy 10px head-room', () => {
    const { dots } = sparklinePath([{ k: 'a', v: 0 }, { k: 'b', v: 10 }], 100, 90)
    /* max=10 → y = 90 - 10/10*(90-10) = 10. */
    expect(dots[1].cy).toBe('10.0')
    expect(dots[0].cy).toBe('90.0')
  })

  it('scales intermediate values proportionally to the series maximum', () => {
    const { dots } = sparklinePath(
      [{ k: 'a', v: 5 }, { k: 'b', v: 10 }], 100, 90,
    )
    /* v=5, max=10 → y = 90 - 0.5*80 = 50. */
    expect(dots[0].cy).toBe('50.0')
  })

  /* The original emits every coordinate through toFixed(1). */
  it('emits coordinates at one decimal place', () => {
    const { dots } = sparklinePath(
      [{ k: 'a', v: 1 }, { k: 'b', v: 2 }, { k: 'c', v: 3 }], 620, 90,
    )
    for (const d of dots) {
      expect(d.cx).toMatch(/^\d+\.\d$/)
      expect(d.cy).toMatch(/^\d+\.\d$/)
    }
  })

  it('uses the legacy default viewBox dimensions', () => {
    const { area } = sparklinePath([{ k: 'a', v: 1 }, { k: 'b', v: 2 }])
    expect(area.endsWith('L620 90 L0 90 Z')).toBe(true)
  })
})
