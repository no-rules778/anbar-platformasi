import { describe, it, expect } from 'vitest'

/* M19-10 — the five-column `.row` re-flow.

   Read as TEXT from disk, the technique index.css.test.ts established: jsdom
   applies no stylesheet AND has no layout engine, so no render-based test in
   this environment can see either the rule or the overflow it fixes. The
   widths quoted below were measured in real Chrome at 390px against this
   stylesheet, on synthetic fixtures carrying the shipped markup — the
   populated «Sərfiyyat Materialları → Hesabat» filter row never mounted on
   TEST, so it was never browser-falsified from live data.

   The failure mode here is a missing or wrongly-scoped line, and a source
   assertion catches that directly.

   This file reads BOTH sides of the contract — the stylesheet and the
   component — because the fix only works if they agree on one class name. A
   test that checked only the CSS would still pass if the class were dropped
   from the markup, which is exactly the brittleness the class replaced. */
declare const process: { cwd(): string }
declare function require(id: string): { readFileSync(p: string, enc: string): string }

const read = (p: string) => require('node:fs').readFileSync(process.cwd() + p, 'utf-8')

const CSS = read('/src/index.css')
const REPORT_VIEW = read('/src/components/serfiyyat/ReportView.tsx')
const OPERATION_FORM = read('/src/components/operation/OperationForm.tsx')
const DOCUMENT_FORM = read('/src/components/serfiyyat/DocumentForm.tsx')

/** The shared hook. One name, asserted on both sides. */
const CLASS = 'sm-report-filter-row'
const SELECTOR = `.main .row.${CLASS}`

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

/** Every `className="…"` whose value contains `row`, with its inline style. */
function rowElements(source: string): { className: string; style: string }[] {
  const out: { className: string; style: string }[] = []
  for (const m of source.matchAll(/className="([^"]*\brow\b[^"]*)"(\s*style=\{\{([^}]*)\}\})?/g)) {
    out.push({ className: m[1], style: m[3] ?? '' })
  }
  return out
}

describe('the component side — both five-column rows carry the semantic class', () => {
  const fiveCol = rowElements(REPORT_VIEW).filter((r) => r.style.includes('repeat(5,1fr)'))

  it('finds exactly the two five-column filter rows in ReportView', () => {
    /* ReportView:115 and :142. If a third is ever added it must be classed
       too, and this assertion is what forces that decision. */
    expect(fiveCol).toHaveLength(2)
  })

  it('every five-column row carries the class', () => {
    for (const r of fiveCol) expect(r.className.split(/\s+/)).toContain(CLASS)
  })

  it('keeps the INLINE desktop template on each of them', () => {
    /* The class carries no desktop styling; the inline `repeat(5,1fr)` is
       still what lays the row out above the breakpoint. */
    for (const r of fiveCol) expect(r.style).toContain("gridTemplateColumns: 'repeat(5,1fr)'")
  })

  it('applies the class to NOTHING else in ReportView', () => {
    /* The 3-column (:163) and 2-column (:281) rows in the same file must not
       pick it up. Asserted over parsed ELEMENTS rather than raw string
       occurrences, so the explanatory comment that names the class does not
       count as a third usage. */
    const classed = rowElements(REPORT_VIEW).filter((r) => r.className.split(/\s+/).includes(CLASS))
    expect(classed).toHaveLength(2)
    for (const r of classed) expect(r.style).toContain('repeat(5,1fr)')
  })
})

describe('NEGATIVE CONTROL — three-column rows do not carry the class', () => {
  it('the operation header row is untouched', () => {
    /* OperationForm:638, measured clean at 390px: three 115.3px fields. */
    const threeCol = rowElements(OPERATION_FORM).filter((r) => r.style.includes("'1fr 1fr 1fr'"))
    expect(threeCol.length).toBeGreaterThan(0)
    for (const r of threeCol) expect(r.className).not.toContain(CLASS)
  })

  it('the Sərfiyyat document header rows are untouched', () => {
    /* DocumentForm:295 and :313, measured clean at 390px: 112-122px. */
    const threeCol = rowElements(DOCUMENT_FORM).filter((r) => r.style.includes("'1fr 1fr 1fr'"))
    expect(threeCol.length).toBeGreaterThan(0)
    for (const r of threeCol) expect(r.className).not.toContain(CLASS)
  })

  it('no component outside ReportView uses the class at all', () => {
    expect(OPERATION_FORM).not.toContain(CLASS)
    expect(DOCUMENT_FORM).not.toContain(CLASS)
  })
})

describe('the stylesheet side — the phone rule targets that class', () => {
  const phone = mediaBlock('(max-width:900px)')

  /* THE defect: at 390px `repeat(5,1fr)` put the document at 474px — real
     horizontal overflow — with columns collapsing unequally to 42.3px /
     57.3px / 77.9px and «Kontragent» clipping its value into 76px. */
  it('re-flows the classed row to two columns', () => {
    expect(rule(SELECTOR, phone)).toContain('grid-template-columns:minmax(0,1fr) minmax(0,1fr)')
  })

  it('uses !important, which the INLINE grid-template-columns requires', () => {
    /* The template is set inline on the element, so a plain declaration loses
       to the style attribute and the rule would silently do nothing. */
    expect(rule(SELECTOR, phone)).toContain('!important')
  })

  it('lives INSIDE the phone breakpoint, not at every width', () => {
    expect(rule(SELECTOR, phone)).not.toBe('')
    /* CONTROL — the same selector must not also exist unconditionally, which
       would re-flow the desktop report that was measured as correct. */
    expect(rule(SELECTOR, CSS.replace(phone, ''))).toBe('')
  })

  it('no longer uses the brittle attribute selector', () => {
    /* The retired form stopped matching the moment the inline template was
       reformatted, with no test failure to catch it.

       Scoped to THAT selector, not to `[style*=` generally: the stylesheet
       carries an unrelated and still-correct `.tw[style*='max-height']` rule
       (line 89), and the comment above the replacement names the retired
       form on purpose. */
    const declarations = CSS.replace(/\/\*[\s\S]*?\*\//g, '')
    expect(declarations).not.toContain('.row[style*=')
    expect(declarations).toContain(`.row.${CLASS}`)
  })
})

describe('NEGATIVE CONTROL — desktop templates and every other .row are unchanged', () => {
  const phone = mediaBlock('(max-width:900px)')

  it('does NOT collapse every .row', () => {
    expect(rule('.main .row', phone)).toBe('')
    expect(rule('.row', phone)).toBe('')
  })

  it('leaves the BASE .row rule exactly as the legacy port defined it', () => {
    /* index.html:111 verbatim — the load-bearing `display:grid` that every
       inline grid-template-columns depends on. */
    expect(rule('.row')).toBe('display:grid;gap:10px')
  })

  it('gives the class NO rule outside the phone block', () => {
    /* Desktop layout comes from the inline template alone, so the class must
       be inert above the breakpoint. */
    expect(rule(`.${CLASS}`, CSS.replace(phone, ''))).toBe('')
    expect(rule(SELECTOR, CSS.replace(phone, ''))).toBe('')
  })
})

describe('REGRESSION — the two accepted responsive fixes still stand', () => {
  const phone = mediaBlock('(max-width:900px)')

  it('keeps the unconditional grid-item clamp', () => {
    expect(rule('.main .grid>*')).toContain('min-width:0')
    expect(rule('.main .grid>*', phone)).toBe('')
  })

  it('keeps the phone-scoped header wrap and the page-grid stacking', () => {
    expect(rule('.card>header', phone)).toContain('flex-wrap:wrap')
    expect(phone).toContain('.main .grid{grid-template-columns:minmax(0,1fr)!important}')
  })

  it('keeps the shell rules the sweep relied on', () => {
    expect(rule('.rail', phone)).toContain('transform:translateX(-100%)')
    expect(rule('#burger', phone)).toContain('display:inline-flex!important')
  })
})
