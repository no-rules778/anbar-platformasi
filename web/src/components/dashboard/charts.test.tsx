import { describe, expect, it } from 'vitest'
import { render } from '@testing-library/react'
import { BarChart } from './BarChart'
import { Donut } from './Donut'
import { barMax, barWidth, donutSegments } from '../../lib/dashboardCharts'

/* T3 — M11-31, M11-34, M11-35. Unit evidence: class names, inline styles,
   titles and the path strings, compared against the legacy formula. */

describe('BarChart — M11-31', () => {
  it('renders one row per datum with title, value, sub, and a width of v/max×100 toFixed(1)', () => {
    const { container } = render(<BarChart data={[{ k: 'Ələt', v: 30, sub: '2 mövqe' }, { k: 'Astara', v: 10, sub: '1 mövqe' }, { k: 'Ofis', v: 0, sub: '0 mövqe' }]} fmt={(v) => v + ' ₼'} />)
    const rows = Array.from(container.querySelectorAll('[data-bar]'))
    expect(rows).toHaveLength(3)
    const labels = rows.map((r) => r.querySelector('span[title]')!)
    expect(labels.map((l) => l.getAttribute('title'))).toEqual(['Ələt', 'Astara', 'Ofis'])
    expect(rows.map((r) => r.querySelector('span.num')!.textContent)).toEqual(['30 ₼', '10 ₼', '0 ₼'])
    expect(rows.map((r) => r.querySelector('span.muted')!.textContent)).toEqual(['2 mövqe', '1 mövqe', '0 mövqe'])
    const bars = rows.map((r) => r.querySelector('.bar > i') as HTMLElement)
    /* The CSSOM normalises `100.0%` → `100%` on read-back (jsdom and browsers
       alike), so the DOM assertion is on the normalised value and the legacy
       `toFixed(1)` string is pinned on the pure helper below. */
    expect(bars.map((b) => b.style.width)).toEqual(['100%', '33.3%', '0%'])
    expect(bars[0].style.background).toBe('var(--steel)')
  })

  it('width is (v / max × 100).toFixed(1) + "%" with max never below 1 (index.html:1370, 1379)', () => {
    expect(barWidth(30, 30)).toBe('100.0%')
    expect(barWidth(10, 30)).toBe('33.3%')
    expect(barWidth(0, 30)).toBe('0.0%')
    expect(barMax([{ k: 'a', v: 0 }])).toBe(1)
    expect(barMax([])).toBe(1)
    expect(barMax([{ k: 'a', v: 0.4 }, { k: 'b', v: 7 }])).toBe(7)
  })

  it('max is never below 1: an all-zero series renders 0% widths, and an empty series an empty grid', () => {
    const zero = render(<BarChart data={[{ k: 'A', v: 0 }]} />)
    expect((zero.container.querySelector('.bar > i') as HTMLElement).style.width).toBe('0%')
    expect(zero.container.querySelector('span.num')!.textContent).toBe('0')
    expect(zero.container.querySelector('span.muted')).toBeNull()
    const empty = render(<BarChart data={[]} />)
    expect(empty.container.querySelector('[data-testid="bar-chart"]')!.children).toHaveLength(0)
  })
})

/* The legacy loop (index.html:1383-1391), copied here as the oracle. */
function legacyPaths(data: { v: number }[], start = -Math.PI / 2): string[] {
  const tot = data.reduce((s, d) => s + d.v, 0) || 1
  let a = start
  const R = 62, r = 38, cx = 74, cy = 74
  return data.map((d) => {
    const ang = d.v / tot * Math.PI * 2, b = a + ang, big = ang > Math.PI ? 1 : 0
    const p = (rad: number, an: number) => [cx + rad * Math.cos(an), cy + rad * Math.sin(an)]
    const [x1, y1] = p(R, a), [x2, y2] = p(R, b), [x3, y3] = p(r, b), [x4, y4] = p(r, a)
    const s = `M${x1} ${y1} A${R} ${R} 0 ${big} 1 ${x2} ${y2} L${x3} ${y3} A${r} ${r} 0 ${big} 0 ${x4} ${y4} Z`
    a = b
    return s
  })
}

describe('Donut — M11-34, M11-35', () => {
  const data = [{ k: 'Sahəyə', v: 3, color: '#B06A11' }, { k: 'Satınalma', v: 1, color: '#0E7C6B' }]

  it('builds the legacy path strings (positive control) and not a rotated variant (negative control)', () => {
    const d = donutSegments(data).map((s) => s.d)
    expect(d).toEqual(legacyPaths(data))
    expect(d).not.toEqual(legacyPaths(data, 0))
    /* 3/4 of the circle exceeds π → large-arc flag 1; 1/4 → 0. */
    expect(d[0]).toMatch(/A62 62 0 1 1 /)
    expect(d[1]).toMatch(/A62 62 0 0 1 /)
  })

  it('renders one path per type with the legacy title text, and a legend with swatch, name and count', () => {
    const { container } = render(<Donut data={data} />)
    const paths = Array.from(container.querySelectorAll('svg.chart path'))
    expect(paths.map((p) => p.getAttribute('fill'))).toEqual(['#B06A11', '#0E7C6B'])
    expect(paths.map((p) => p.querySelector('title')!.textContent)).toEqual(['Sahəyə: 3', 'Satınalma: 1'])
    expect(container.querySelector('svg')!.getAttribute('viewBox')).toBe('0 0 148 148')
    const legend = Array.from(container.querySelectorAll('[data-testid="donut-legend"] > div'))
    expect(legend.map((l) => l.textContent)).toEqual(['Sahəyə3', 'Satınalma1'])
    expect((legend[0].querySelector('i') as HTMLElement).style.background).toBe('rgb(176, 106, 17)')
  })

  it('renders no paths and an empty legend for no data (tot falls back to 1)', () => {
    const { container } = render(<Donut data={[]} />)
    expect(container.querySelectorAll('path')).toHaveLength(0)
    expect(container.querySelector('[data-testid="donut-legend"]')!.children).toHaveLength(0)
    expect(donutSegments([])).toEqual([])
  })

  it('reproduces the single-type degenerate arc exactly as legacy (not fixed)', () => {
    const one = [{ k: 'Satınalma', v: 5, color: '#0E7C6B' }]
    expect(donutSegments(one).map((s) => s.d)).toEqual(legacyPaths(one))
  })
})
