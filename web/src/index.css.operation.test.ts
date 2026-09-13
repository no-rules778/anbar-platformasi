import { describe, it, expect } from 'vitest'

/* M18-42 … M18-49 — the stylesheet rules the «Yeni əməliyyat» workspace and
   the platform's tables need.

   Read as TEXT from disk, the technique index.css.test.ts established and
   index.css.dashboard/reports/serfiyyat.test.ts follow: jsdom applies no
   stylesheet, so a class that is used in JSX but defined in NO stylesheet is
   invisible to every render-based test while being plainly broken in a real
   browser. That is exactly the defect class this file guards.

   Each rule below was measured in headless Chrome BEFORE the fix and found
   inert — `.grid2` computed `display:block; grid-template-columns:none`,
   `.notice` `background:rgba(0,0,0,0); padding:0px`, `.combobox-results`
   `position:static`, `.pager` `border-top-width:0px`, `.alarm`
   `color:rgb(14,20,26)` (plain ink, not red) — and re-measured after it. */
declare const process: { cwd(): string }
declare function require(id: string): { readFileSync(p: string, enc: string): string }

const CSS = require('node:fs').readFileSync(process.cwd() + '/src/index.css', 'utf-8')
const FORM = require('node:fs').readFileSync(
  process.cwd() + '/src/components/operation/OperationForm.tsx', 'utf-8',
)
const PAGE = require('node:fs').readFileSync(
  process.cwd() + '/src/pages/NewOperationPage.tsx', 'utf-8',
)

/** One rule's declaration block, matched on the WHOLE selector. */
function rule(selector: string): string {
  const body = CSS.replace(/\/\*[\s\S]*?\*\//g, '')
  for (const m of body.matchAll(/([^{}]+)\{([^}]*)\}/g)) {
    if (m[1].trim() === selector) return m[2]
  }
  return ''
}

/** Class names used in JSX, with comments stripped so prose cannot match. */
function classAttrs(src: string): string[] {
  const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
  return [...code.matchAll(/className="([^"]+)"/g)].flatMap((m) => m[1].split(/\s+/))
}

describe('.tw — the table scroll box (M18-42)', () => {
  /* index.html:73-74 verbatim. React kept only `overflow:auto`, so every
     table on every screen grew to its full row count instead of scrolling
     inside a bounded box. */
  it('carries the legacy viewport cap and min-height', () => {
    expect(rule('.tw')).toBe('overflow:auto;max-height:calc(100vh - 250px);min-height:180px')
  })

  /* The escape hatch the cap needs: AzpPage, ControlsPage and
     BatchCancelDialog each set their own inline max-height, and without this
     they would still inherit the 180px floor. */
  it("releases the min-height floor for a .tw carrying its own inline max-height", () => {
    expect(rule(".tw[style*='max-height']")).toBe('min-height:0')
  })
})

describe('the two-column workspace (M18-40, M18-44)', () => {
  /* `grid2` was used in TWO places and defined in NO stylesheet — not
     index.css, not the legacy <style> block. Both are now the legacy idiom:
     a defined class carrying an inline grid-template-columns. */
  it('no longer references the undefined grid2 class in JSX', () => {
    expect(classAttrs(PAGE)).not.toContain('grid2')
    expect(classAttrs(FORM)).not.toContain('grid2')
  })

  /* index.html:297 — the page split. */
  it('splits the page with .grid and the legacy 1.15fr / .85fr template', () => {
    expect(PAGE).toContain("gridTemplateColumns: 'minmax(0,1.15fr) minmax(0,.85fr)'")
    expect(rule('.grid')).toBe('display:grid;gap:12px')
  })

  /* index.html:3262 — the header field grid inside the left card. `.row` is
     what supplies display:grid; the inline template supplies the columns. */
  it('lays the header fields out as a .row with two columns', () => {
    expect(FORM).toContain("className=\"row\" style={{ gridTemplateColumns: '1fr 1fr' }}")
    expect(rule('.row')).toBe('display:grid;gap:10px')
  })

  /* index.html:303-310 — «Sənədin sətirləri» FIRST, «Seçilmiş malın
     vəziyyəti» beneath it. The lines panel used to render OUTSIDE the grid,
     below both columns, so it never appeared beside the form at all. */
  it('stacks the draft-lines panel ABOVE the item-state panel in the right column', () => {
    const lines = PAGE.indexOf('<DraftLinesPanel')
    const state = PAGE.indexOf('<ItemStatePanel')
    const grid = PAGE.indexOf("minmax(0,1.15fr)")
    expect(lines).toBeGreaterThan(grid)
    expect(state).toBeGreaterThan(lines)
  })
})

describe('.seg button state class (M18-43)', () => {
  /* `.seg button.on` is the platform rule; `active` is defined nowhere, so
     the selected tab rendered with no steel background. Every other segment
     control on the platform already used `on`. */
  it('marks the selected operation tab with `on`, not `active`', () => {
    expect(FORM).toContain("className={kind === k ? 'on' : undefined}")
    expect(classAttrs(FORM)).not.toContain('active')
  })

  it('still defines the selected-segment rule', () => {
    expect(rule('.seg button.on')).toBe('background:var(--steel);color:#fff')
  })
})

describe('.notice — the draft / edit-mode banner (M18-46)', () => {
  /* index.html:3728 writes these declarations inline on a `.hint`; React
     factored the banner into two shared components, so they are named once. */
  it('carries the legacy amber band declarations', () => {
    const r = rule('.notice')
    expect(r).toContain('background:var(--out-l)')
    expect(r).toContain('display:flex')
    expect(r).toContain('padding:8px 10px')
    expect(r).toContain('border-radius:4px')
  })

  it('lets the message span take the free space, as the legacy flex:1 does', () => {
    expect(rule('.notice>span')).toBe('flex:1')
  })
})

describe('.combobox-results — the item search list (M18-47)', () => {
  /* index.html:3299 — an absolutely positioned overlay inside a relative
     wrapper. Rendered static, the list displaced every field below it. */
  it('overlays the form rather than displacing it', () => {
    const r = rule('.combobox-results')
    expect(r).toContain('position:absolute')
    expect(r).toContain('top:100%')
    expect(r).toContain('max-height:230px')
    expect(r).toContain('z-index:20')
  })

  /* An absolute box resolves against the nearest POSITIONED ancestor, so the
     wrapper is load-bearing: without it the list positions against the page. */
  it('defines the relative wrapper the absolute list resolves against', () => {
    expect(rule('.combobox-wrap')).toBe('position:relative')
    expect(FORM).toContain('className="f combobox-wrap"')
  })
})

describe('error text uses the platform .err class (M18-48)', () => {
  /* `.err` is legacy's own error class and was always defined; `alarm` never
     was, so these messages rendered in plain ink instead of red. */
  it('defines .err in the platform red', () => {
    expect(rule('.err')).toBe('color:var(--alarm);font-size:11.5px;margin-top:4px;display:block')
  })

  it('no operation component still uses the undefined alarm class', () => {
    const fs = require('node:fs') as unknown as {
      readdirSync(p: string): string[]
      readFileSync(p: string, e: string): string
    }
    const dir = process.cwd() + '/src/components/operation'
    for (const f of fs.readdirSync(dir)) {
      if (!f.endsWith('.tsx') || f.endsWith('.test.tsx')) continue
      expect(classAttrs(fs.readFileSync(dir + '/' + f, 'utf-8'))).not.toContain('alarm')
    }
  })
})

describe('.link — «Yeni mal yarat →» (M18-49)', () => {
  /* Legacy renders a bare <a>; React renders a <button>, which is the better
     control. Only its appearance needed the rule. */
  it('strips the button chrome so it reads as a link', () => {
    const r = rule('.link')
    expect(r).toContain('border:0')
    expect(r).toContain('background:transparent')
    expect(r).toContain('text-decoration:underline')
  })
})
