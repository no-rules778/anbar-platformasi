import { describe, it, expect } from 'vitest'

/* D-L5 / M11-72 — the dashboard's stylesheet rules, read as TEXT from disk
   for the same reason index.css.test.ts does (jsdom applies no stylesheet;
   the defect this guards against — a `.bar` with no height, an unstyled
   `.kpi` — is invisible to any render-based test). Values are the legacy
   index.html:30, 66-72, 89-91, 121, 151 verbatim. */
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

describe('dashboard stylesheet (D-L5, M11-72)', () => {
  it.each([
    ['.eyebrow', 'font-size:10px;text-transform:uppercase;letter-spacing:.13em;color:var(--ink-3);font-weight:650'],
    ['.grid', 'display:grid;gap:12px'],
    ['.kpis', 'display:grid;grid-template-columns:repeat(auto-fit,minmax(168px,1fr));gap:10px'],
    ['.kpi', 'background:var(--panel);border:1px solid var(--line);border-radius:5px;padding:11px 13px;position:relative;overflow:hidden'],
    ['.kpi:after', 'content:"";position:absolute;left:0;top:0;bottom:0;width:3px;background:var(--steel)'],
    ['.kpi.g:after', 'background:var(--in)'],
    ['.kpi.o:after', 'background:var(--out)'],
    ['.kpi.r:after', 'background:var(--alarm)'],
    ['.kpi.v:after', 'background:var(--move)'],
    ['.kpi .v', 'font-family:var(--mono);font-variant-numeric:tabular-nums;font-size:22px;font-weight:600;letter-spacing:-.02em;margin-top:3px'],
    ['.kpi .s', 'font-size:11px;color:var(--ink-3);margin-top:2px'],
    ['.bar', 'height:6px;background:var(--line-2);border-radius:3px;overflow:hidden;min-width:60px'],
    ['.bar i', 'display:block;height:100%;background:var(--steel)'],
    ['.muted', 'color:var(--ink-3)'],
    ['.pill-row', 'display:flex;gap:6px;flex-wrap:wrap'],
    ['.chart', 'width:100%;height:auto;display:block;overflow:visible'],
  ])('%s carries the legacy declaration block', (selector, declarations) => {
    expect(rule(selector)).toBe(declarations)
  })

  it('every token the rules reference is defined on :root', () => {
    /* `:root` follows the @tailwind directives without a `}` between them,
       so the whole-selector matcher above cannot isolate it; match directly. */
    const root = CSS.match(/:root\{([^}]*)\}/)?.[1] ?? ''
    for (const token of ['--panel', '--line', '--line-2', '--steel', '--in', '--out', '--alarm', '--move', '--mono', '--ink-3']) {
      expect(root).toContain(token + ':')
    }
  })
})
