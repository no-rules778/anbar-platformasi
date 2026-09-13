import { describe, it, expect } from 'vitest'

/* M13-99 — the ONE stylesheet rule «Sərfiyyat Materialları» needs, read as
   TEXT from disk for the same reason index.css.test.ts and
   index.css.dashboard.test.ts do: jsdom applies no stylesheet, so a missing
   `display:grid` is invisible to every render-based test while being plainly
   broken in a real browser.

   The proposal's §8 survey established that this is the only gap: `table`,
   `th`, `td`, `th.r,td.r`, `.tw`, `label.f`, `.filters`, `.seg`, `.tag` and
   `.card` are all already present, and there is no `.tbl` class rule anywhere
   in the platform — `tbl` is only a class attribute, styled by the bare
   element selectors. */
declare const process: { cwd(): string }
declare function require(id: string): { readFileSync(p: string, enc: string): string }

const CSS = require('node:fs').readFileSync(process.cwd() + '/src/index.css', 'utf-8')

function rule(selector: string): string {
  const body = CSS.replace(/\/\*[\s\S]*?\*\//g, '')
  for (const m of body.matchAll(/([^{}]+)\{([^}]*)\}/g)) {
    if (m[1].trim() === selector) return m[2]
  }
  return ''
}

describe('the .row grid rule (M13-99)', () => {
  /* index.html:111 verbatim. */
  it('carries the legacy declaration block exactly', () => {
    expect(rule('.row')).toBe('display:grid;gap:10px')
  })

  /* The load-bearing half: without `display:grid` the inline
     `grid-template-columns` on every header, form and filter block does
     nothing and the block collapses to stacked elements. */
  it('declares display:grid, which the inline grid-template-columns needs', () => {
    expect(rule('.row')).toContain('display:grid')
  })

  /* The rules this page depends on that were ALREADY present — a negative
     control proving the port added one rule, not a stylesheet fork. */
  it.each(['.tw', 'label.f', '.filters', '.seg', '.muted'])(
    '%s was already present and is untouched', (selector) => {
      expect(rule(selector)).not.toBe('')
    })

  it('does NOT introduce a .tbl class rule — legacy has none anywhere', () => {
    expect(rule('.tbl')).toBe('')
  })
})
