import { describe, it, expect } from 'vitest'

/* The two presentation defects found by the authenticated TEST route sweep at
   viewport widths no earlier leg covered (390px, and the 901-979px band; the
   accepted Codex legs were 800x700 and 1200x800).

   Read as TEXT from disk, the technique `src/index.css.test.ts` established:
   jsdom applies no stylesheet, so no render-based test in this environment can
   see a missing rule. The failure mode is a missing line, and a source
   assertion catches it directly. */
declare const process: { cwd(): string }
declare function require(id: string): { readFileSync(p: string, enc: string): string }

const CSS = require('node:fs').readFileSync(process.cwd() + '/src/index.css', 'utf-8')

/** The body of the first `@media <query>` block, brace-matched. */
function mediaBlock(query: string): string {
  const start = CSS.indexOf('@media ' + query)
  if (start < 0) return ''
  const open = CSS.indexOf('{', start)
  let depth = 0
  for (let i = open; i < CSS.length; i++) {
    if (CSS[i] === '{') depth++
    else if (CSS[i] === '}') { depth--; if (depth === 0) return CSS.slice(open + 1, i) }
  }
  return ''
}

/** One rule's declaration block, matched on the WHOLE selector. */
function rule(selector: string, source: string = CSS): string {
  const body = source.replace(/\/\*[\s\S]*?\*\//g, '')
  for (const m of body.matchAll(/([^{}]+)\{([^}]*)\}/g)) {
    if (m[1].trim() === selector) return m[2]
  }
  return ''
}

describe('grid columns may shrink below their table (901-979px band)', () => {
  /* THE defect: «Anbar və layihələr» reached 980px and «Hesabatlar» 981px
     inside a 901-979px viewport, because a grid item defaults to
     `min-width:auto` and will not go below its table's intrinsic width. */
  it('clamps .main .grid children to min-width:0', () => {
    expect(rule('.main .grid>*')).toContain('min-width:0')
  })

  it('applies the clamp UNCONDITIONALLY, not only under the phone breakpoint', () => {
    /* The overflow band is 901-979px, which is ABOVE the 900px query. A clamp
       placed inside that block would leave the defect exactly where it was
       measured. */
    expect(rule('.main .grid>*', mediaBlock('(max-width:900px)'))).toBe('')
    expect(rule('.main .grid>*')).not.toBe('')
  })

  it('does NOT widen the stacking breakpoint', () => {
    /* The three screens that carry the same two-column `.main .grid` and
       render CORRECTLY in that band (İdarə paneli, Maliyyə göstəriciləri,
       Parametrlər və ixrac) must keep their columns. Restacking them to fix
       two other screens would be a behaviour change, not a fix — so the
       stacking rule stays scoped to the original 900px query. */
    expect(mediaBlock('(max-width:900px)')).toContain('.main .grid{grid-template-columns:minmax(0,1fr)!important}')
    expect(CSS).not.toContain('@media (max-width:979px)')
    expect(mediaBlock('(max-width:900px)')).not.toBe('')
  })
})

describe('card headers wrap at phone width (390px)', () => {
  const phone = mediaBlock('(max-width:900px)')

  it('sets flex-wrap:wrap on .card>header inside the phone block', () => {
    expect(rule('.card>header', phone)).toContain('flex-wrap:wrap')
  })

  it('leaves the BASE header rule on one line for desktop', () => {
    /* CONTROL — without this the assertion above would also pass on a header
       that wraps at every width, which is a different (desktop) change. */
    const base = rule('.card>header', CSS.replace(phone, ''))
    expect(base).toContain('display:flex')
    expect(base).not.toContain('flex-wrap')
  })

  it('keeps the header declarations the sweep relied on', () => {
    const base = rule('.card>header', CSS.replace(phone, ''))
    expect(base).toContain('align-items:center')
    expect(base).toContain('gap:10px')
  })
})

describe('regression — the accepted M18-30 shell rules are untouched', () => {
  const phone = mediaBlock('(max-width:900px)')

  it('still carries the off-canvas rail, burger and main padding', () => {
    expect(rule('.rail', phone)).toContain('transform:translateX(-100%)')
    expect(rule('.rail.open', phone)).toContain('transform:none')
    expect(rule('#burger', phone)).toContain('display:inline-flex!important')
    expect(rule('.main', phone)).toContain('padding:14px 12px 60px')
  })

  it('still hides the shell in print', () => {
    expect(mediaBlock('print')).toContain('.rail,.topbar,.filters,.btn,.noprint{display:none!important}')
  })
})
