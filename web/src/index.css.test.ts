import { describe, it, expect } from 'vitest'
/* The stylesheet is read as TEXT from disk.

   `import './index.css?raw'` is not an option: Vitest's CSS handling returns
   an empty string for it, so every assertion below would vacuously fail.
   Reading the file is also the more honest test — it checks what ships, not
   what a transform produced. `process`/`require` are Node globals that the
   app tsconfig does not type, so they are declared locally rather than
   pulling @types/node into the application build. */
declare const process: { cwd(): string }
declare function require(id: string): { readFileSync(p: string, enc: string): string }

const CSS = require('node:fs').readFileSync(process.cwd() + '/src/index.css', 'utf-8')

/* A04 — the item card was rendered as `<aside className="drawer on">` while
   index.css defined no `.drawer` rule at all. jsdom applies no stylesheet, so
   every DOM-presence test still passed: the card was in the document, and
   unreachable in a real browser. It laid out `position: static` at the very
   bottom of a 1531-row table — about 98,000 px down the page — behind the
   fixed mask that covers the viewport.

   These assertions therefore read the stylesheet as text. That is deliberate:
   the defect lives in the CSS, not in the component, and no render-based test
   in this environment can see it. The values are index.html:124-138 verbatim. */

/**
 * Pulls one rule's declaration block out of the stylesheet.
 *
 * The selector must be the WHOLE selector of the rule, so that asking for
 * `.drawer` cannot accidentally return `.drawer.on`'s block. Comments are
 * stripped first so a rule introduced by one still matches.
 */
function rule(selector: string): string {
  const body = CSS.replace(/\/\*[\s\S]*?\*\//g, '')
  for (const m of body.matchAll(/([^{}]+)\{([^}]*)\}/g)) {
    if (m[1].trim() === selector) return m[2]
  }
  return ''
}

const zIndexOf = (selector: string): number => {
  const m = rule(selector).match(/z-index:\s*(\d+)/)
  return m ? Number(m[1]) : NaN
}

describe('drawer (A04)', () => {
  it('defines a .drawer rule at all', () => {
    expect(rule('.drawer')).not.toBe('')
  })

  /* Without `position: fixed` the aside falls to the bottom of the document
     flow — the exact failure the audit reproduced in the browser. */
  it('is fixed to the right edge of the viewport, not in the document flow', () => {
    const r = rule('.drawer')
    expect(r).toContain('position:fixed')
    expect(r).toContain('top:0')
    expect(r).toContain('right:0')
    expect(r).toContain('bottom:0')
  })

  it('takes the original width', () => {
    expect(rule('.drawer')).toContain('width:min(620px,96vw)')
  })

  it('scrolls its own content rather than the page', () => {
    expect(rule('.drawer')).toContain('overflow:auto')
  })

  /* `.drawer.on` is what the component actually renders. Without it the panel
     stays translated fully off-screen. */
  it('slides into view under .on', () => {
    expect(rule('.drawer')).toContain('transform:translateX(100%)')
    expect(rule('.drawer.on')).toContain('transform:none')
  })
})

/* The layering is the whole point: the card must sit ABOVE the mask that dims
   the page, and BELOW the edit modal that opens on top of the card. Getting
   this wrong in either direction makes the card unusable — buried behind the
   mask, or covering the dialog the user opened from it. */
describe('overlay layering (A04)', () => {
  it('orders mask < drawer < modal, matching index.html:124-138', () => {
    const mask = zIndexOf('.mask')
    const drawer = zIndexOf('.drawer')
    const modal = zIndexOf('.modal')
    expect(mask).toBe(100)
    expect(drawer).toBe(101)
    expect(modal).toBe(120)
    expect(mask).toBeLessThan(drawer)
    expect(drawer).toBeLessThan(modal)
  })
})
