import type { ControlGroup } from './controlIssues'

export interface ControlKpis {
  total: number
  high: number
  categories: number
  completeness: string
  date: string
}

export function controlKpis(groups: readonly ControlGroup[], movementCount: number, date: string): ControlKpis {
  const total = groups.reduce((s, g) => s + g.rows.length, 0)
  const high = groups.filter((g) => g.sev === 'high').reduce((s, g) => s + g.rows.length, 0)
  /* index.html:7035 — `.toFixed(1)` sits INSIDE the truthy branch only, so the
     zero-movement branch yields the bare number 100 and renders `100%`, not
     `100.0%`. Hoisting the call outside the ternary changes the empty-database
     KPI text, so the two branches are kept literally distinct (M15-50). */
  const completeness = (movementCount ? (100 - Math.min(100, total / movementCount * 100)).toFixed(1) : 100) + '%'
  return { total, high, categories: groups.length, completeness, date }
}

export function controlExportMatrix(groups: readonly ControlGroup[]): unknown[][] {
  const rows: unknown[][] = [['Kateqoriya', 'Risk', 'Sətir']]
  groups.forEach((g) => g.rows.forEach((row) => rows.push([g.title, g.sev, row.join(' | ')])))
  return rows
}
