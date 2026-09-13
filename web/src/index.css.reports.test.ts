import { describe, it, expect } from 'vitest'

/* M14-98 — the three ADDITIVE stylesheet rules «Hesabatlar» needs.

   Read as TEXT from disk, the technique `src/index.css.test.ts` established:
   jsdom applies no stylesheet, so no render-based test in this environment can
   see a missing rule. The failure mode is a missing line, which a source
   assertion catches directly. */
declare const process: { cwd(): string }
declare function require(id: string): { readFileSync(p: string, enc: string): string }

const CSS = require('node:fs').readFileSync(process.cwd() + '/src/index.css', 'utf-8')

/** One rule's declaration block, matched on the WHOLE selector. */
function rule(selector: string): string {
  const body = CSS.replace(/\/\*[\s\S]*?\*\//g, '')
  for (const m of body.matchAll(/([^{}]+)\{([^}]*)\}/g)) {
    if (m[1].trim() === selector) return m[2]
  }
  return ''
}

describe('.nm — the name cell inside abc/dead rows (M14-98)', () => {
  /* The pre-existing rule is `td.nm`, which scopes to a CELL. The legacy
     branches render `<div class="nm">` INSIDE the cell (index.html:6785,
     6803), so that rule never matches it and a bare `.nm` is genuinely
     needed — not a duplicate. */
  it('defines a bare .nm rule, distinct from the existing td.nm', () => {
    expect(rule('.nm')).not.toBe('')
    expect(rule('td.nm')).not.toBe('')
    expect(rule('.nm')).not.toBe(rule('td.nm'))
  })

  it('keeps the existing td.nm width rule untouched', () => {
    expect(rule('td.nm')).toContain('max-width:390px')
  })

  it('gives the bare .nm an ellipsis so a long item name does not overflow', () => {
    expect(rule('.nm')).toContain('text-overflow:ellipsis')
    expect(rule('.nm')).toContain('overflow:hidden')
  })
})

describe('.neg — the negative-balance count in the wh report (M14-98)', () => {
  /* index.html:6766 renders `<span class="neg">` when a warehouse has
     negative balances; without a rule it is visually identical to a normal
     count, which is exactly the signal the cell exists to give. */
  it('defines a .neg rule', () => {
    expect(rule('.neg')).not.toBe('')
  })

  it('colours it with the alarm token rather than a hard-coded value', () => {
    expect(rule('.neg')).toContain('var(--alarm)')
  })
})

describe('.clk — clickable rows in abc/dead (M14-98)', () => {
  /* `tbl(..., {clk:1})` (index.html:1412) marks a row clickable. Without a
     cursor rule the row opens a card on click while looking inert. */
  it('defines a tr.clk rule with a pointer cursor', () => {
    expect(rule('tr.clk')).toContain('cursor:pointer')
  })

  it('defines a hover affordance for a clickable row', () => {
    expect(rule('tr.clk:hover')).not.toBe('')
  })
})

describe('additive only — no accepted rule was modified', () => {
  /* The Phase 13 precedent (M13-99): this phase may ADD rules, never change
     one an accepted phase depends on. These spot-checks pin the rules whose
     selectors are adjacent to the new ones. */
  it('leaves the shared table and tag rules in place', () => {
    expect(rule('.bar')).toContain('height:6px')
    expect(rule('.chart')).toContain('width:100%')
    expect(rule('.filters')).toContain('display:flex')
  })
})
