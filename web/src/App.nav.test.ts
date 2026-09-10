import { describe, it, expect } from 'vitest'

/* Read from disk with the same Node globals src/index.css.test.ts declares
   locally, rather than pulling @types/node into the application build. */
declare const process: { cwd(): string }
declare function require(id: string): { readFileSync(p: string, enc: string): string }

/* M6-41 — the Mal qrupları nav entry.

   App.tsx is still the minimal page switch Phase 4 added, not a router, and
   mounting it in a test needs the whole session/auth/heartbeat stack. The
   wiring itself is what this phase changed, so it is pinned at source level —
   the same technique src/index.css.test.ts uses for the .drawer rule, and for
   the same reason: the failure mode is a missing line, which a source
   assertion catches directly.

   Behaviour of the page itself is covered by ItemGroupsPage.test.tsx.

   A03 UPDATE: these source assertions are no longer the primary coverage. The
   audit found they could not see a heading rendered twice, nor prove a role
   gate removes a link at runtime, so App.test.tsx («App — navigation rail»)
   now renders the app and queries the DOM for both admin and non-admin. This
   file is kept as a cheap wiring check, not as the acceptance evidence. */
const src = require('fs').readFileSync(process.cwd() + '/src/App.tsx', 'utf8')

describe('App nav — Mal qrupları (M6-41)', () => {
  it('imports the page', () => {
    expect(src).toContain("import { ItemGroupsPage } from './pages/ItemGroupsPage'")
  })

  it('adds `grp` to the migrated-page union', () => {
    expect(src).toMatch(/type MigratedPage =[^\n]*'grp'/)
  })

  it('renders a rail entry that selects it', () => {
    expect(src).toContain("setPage('grp')")
    expect(src).toContain('Mal qrupları')
  })

  it('mounts the page for the grp route', () => {
    expect(src).toContain("activePage === 'grp' && <ItemGroupsPage me={me} />")
  })

  /* The legacy rail places «Mal qrupları» directly under «Nomenklatura»
     (index.html:256-259). */
  it('places the entry after Nomenklatura in the rail', () => {
    expect(src.indexOf('Mal qrupları')).toBeGreaterThan(src.indexOf('Nomenklatura'))
  })

  /* No role gate: go() guards only refs, nreq and azp (index.html:1496-1502),
     and grp is not among them. */
  it('does not gate the entry behind isAdmin', () => {
    const entry = src.slice(src.indexOf("setPage('grp')") - 200, src.indexOf('Mal qrupları'))
    expect(entry).not.toContain('isAdmin')
  })
})

/* M9-01 / M9-04 — the «Anbar qalıqları» wiring, pinned at source level like
   the Mal qrupları block above. The runtime rail behaviour (order, no role
   gate, the two card handoffs) is in App.test.tsx («App — «Anbar qalıqları»
   rail entry»); this is the cheap missing-line check. */
describe('App nav — Anbar qalıqları (M9-01, M9-04)', () => {
  it('imports the page', () => {
    expect(src).toContain("import { BalancesPage } from './pages/BalancesPage'")
  })

  it('adds `bal` to the migrated-page union', () => {
    expect(src).toMatch(/type MigratedPage =[^\n]*'bal'/)
  })

  it('renders a rail entry that selects it', () => {
    expect(src).toContain("setPage('bal')")
    expect(src).toContain('Anbar qalıqları')
  })

  it('mounts the page for the bal route with the two card handoffs', () => {
    expect(src).toContain("activePage === 'bal' && (")
    expect(src).toContain('<BalancesPage')
    const block = src.slice(src.indexOf("activePage === 'bal' && ("), src.indexOf('</main>'))
    expect(block).toContain('onOpenOperation=')
    expect(block).toContain("useOperationStore.getState().prefill(code)")
    expect(block).toContain('onEditItem=')
    expect(block).toContain("useNomenclatureStore.getState().openCard(code)")
  })

  /* The legacy rail: «Yeni əməliyyat», «Mal hərəkəti», «Anbar qalıqları»
     (index.html:252-254) — third in the group, above «Bazalar». */
  it('places the entry after Mal hərəkəti and before Bazalar', () => {
    const bal = src.indexOf("setPage('bal')")
    expect(bal).toBeGreaterThan(src.indexOf("setPage('mov')"))
    expect(bal).toBeLessThan(src.indexOf('Bazalar'))
  })

  /* M9-04 — no role gate: go() guards only refs, nreq and azp
     (index.html:1496-1503). */
  it('does not gate the entry behind isAdmin', () => {
    const entry = src.slice(src.indexOf("setPage('bal')") - 200, src.indexOf("setPage('bal')") + 120)
    expect(entry).not.toContain('isAdmin')
  })
})
