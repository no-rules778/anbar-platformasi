import { describe, it, expect } from 'vitest'

/* M18-30 / M18-31 — the shell stylesheet.

   Read as TEXT for the A04 reason index.css.test.ts records: jsdom applies no
   stylesheet, so App.shell.test.tsx can prove the burger toggles a class but
   NOT that the class does anything. A rail that renders `className="rail"` in
   jsdom and stays a 210px column on a real phone would pass every render
   test. The defect lives in the CSS, so the CSS is what is asserted. */

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
  const re = new RegExp('(^|[}\\n])\\s*' + selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*\\{([^}]*)\\}')
  return (source.match(re) ?? ['', '', ''])[2].trim()
}

describe('index.css — the responsive rail (M18-30)', () => {
  const block = mediaBlock('(max-width:900px)')

  it('defines the max-width:900px breakpoint at all', () => {
    /* Its absence is the defect: without this block the rail keeps its fixed
       column on a phone and cannot be dismissed. */
    expect(block).not.toBe('')
  })

  it('takes the rail out of flow and translates it off-canvas', () => {
    const r = rule('.rail', block)
    expect(r).toContain('position:fixed')
    expect(r).toContain('transform:translateX(-100%)')
    expect(r).toContain('z-index:55')
  })

  it('brings it back for .rail.open — the class the burger toggles', () => {
    /* This pairing is what makes the toggle in App.shell.test.tsx mean
       anything. Either half alone is inert. */
    expect(rule('.rail.open', block)).toContain('transform:none')
  })

  it('reveals the burger only inside the breakpoint', () => {
    expect(rule('#burger', block)).toContain('display:inline-flex!important')
    /* CONTROL — outside the query the burger is hidden. Without this the
       assertion above would pass on a burger that is always visible, which is
       a different (desktop) defect. */
    const outside = CSS.replace(block, '')
    expect(rule('#burger', outside)).toContain('display:none')
  })

  it('relaxes the main padding and table height, as legacy does', () => {
    expect(rule('.main', block)).toContain('padding:14px 12px 60px')
    expect(rule('.tw', block)).toContain('max-height:calc(100vh - 200px)')
  })
})

describe('index.css — the presence chip (M18-31)', () => {
  it('defines .presence and .chip with the legacy pill shape', () => {
    expect(rule('.presence')).toContain('display:flex')
    const chip = rule('.chip')
    expect(chip).toContain('display:inline-flex')
    expect(chip).toContain('border-radius:20px')
  })

  it('gives the initials badge a fixed circular avatar', () => {
    const i = rule('.chip i')
    expect(i).toContain('width:18px')
    expect(i).toContain('height:18px')
    expect(i).toContain('border-radius:50%')
    /* `font-style:normal` is load-bearing: the element is an <i>, which the
       UA would otherwise italicise. */
    expect(i).toContain('font-style:normal')
  })
})

describe('index.css — print still hides the shell (regression)', () => {
  it('keeps the rail and topbar out of print', () => {
    /* The new rules must not have displaced the print block's chrome
       stripping; `.rail` now has rules in three places. */
    expect(mediaBlock('print')).toContain('.rail,.topbar,.filters,.btn,.noprint{display:none!important}')
  })
})
