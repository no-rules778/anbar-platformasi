import { describe, expect, it } from 'vitest'
import { controlExportMatrix, controlKpis } from './controlReport'
import type { ControlGroup } from './controlIssues'

const groups: ControlGroup[] = [
  { id: 'a', sev: 'high', title: 'A', why: 'x', cols: ['x'], rows: [['one'], ['two']], codes: ['1', '2'] },
  { id: 'b', sev: 'low', title: 'B', why: 'y', cols: ['x'], rows: [['three']], codes: ['3'] },
]

describe('control report', () => {
  it('computes legacy totals and clamps completeness at zero', () => {
    expect(controlKpis(groups, 2, '2026-09-11')).toEqual({ total: 3, high: 2, categories: 2, completeness: '0.0%', date: '2026-09-11' })
  })

  /* index.html:7035 — `.toFixed(1)` is INSIDE the truthy branch, so an empty
     database renders the bare `100%`. An earlier revision of this test pinned
     `100.0%`, which locked in a divergence from legacy rather than parity. */
  it('renders the zero-movement branch as the legacy bare 100%', () => {
    expect(controlKpis([], 0, 'x').completeness).toBe('100%')
    expect(controlKpis(groups, 6, 'x').completeness).toBe('50.0%')
  })
  it('exports one row per finding with the legacy joined detail', () => {
    expect(controlExportMatrix(groups)).toEqual([
      ['Kateqoriya', 'Risk', 'Sətir'], ['A', 'high', 'one'], ['A', 'high', 'two'], ['B', 'low', 'three'],
    ])
  })
})
