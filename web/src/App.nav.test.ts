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
    expect(src).toContain("go('grp')")
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
    const entry = src.slice(src.indexOf("go('grp')") - 200, src.indexOf('Mal qrupları'))
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
    expect(src).toContain("go('bal')")
    expect(src).toContain('Anbar qalıqları')
  })

  it('mounts the page for the bal route with the two card handoffs', () => {
    expect(src).toContain("activePage === 'bal' && (")
    expect(src).toContain('<BalancesPage')
    const block = src.slice(src.indexOf("activePage === 'bal' && ("), src.indexOf('</main>'))
    expect(block).toContain('onOpenOperation=')
    expect(block).toContain('onOpenOperation=')
    expect(block).toContain('onEditItem=')
    expect(block).toContain('onEditItem=')
  })

  /* The legacy rail: «Yeni əməliyyat», «Mal hərəkəti», «Anbar qalıqları»
     (index.html:252-254) — third in the group, above «Bazalar». */
  it('places the entry after Mal hərəkəti and before Bazalar', () => {
    const bal = src.indexOf("go('bal')")
    expect(bal).toBeGreaterThan(src.indexOf("go('mov')"))
    expect(bal).toBeLessThan(src.indexOf('Bazalar'))
  })

  /* M9-04 — no role gate: go() guards only refs, nreq and azp
     (index.html:1496-1503). */
  it('does not gate the entry behind isAdmin', () => {
    const entry = src.slice(src.indexOf("go('bal')") - 200, src.indexOf("go('bal')") + 120)
    expect(entry).not.toContain('isAdmin')
  })
})

/* M10-01 / M10-04 — the «Anbar və layihələr» wiring, pinned at source level
   like the blocks above. The runtime behaviour (order, no role gate, refs
   navigation, the two card handoffs) is in App.test.tsx («App — «Anbar və
   layihələr» rail entry»); this is the cheap missing-line check. */
describe('App nav — Anbar və layihələr (M10-01, M10-04)', () => {
  it('imports the page', () => {
    expect(src).toContain("import { WarehouseOverviewPage } from './pages/WarehouseOverviewPage'")
  })

  it('adds `anb` to the migrated-page union', () => {
    expect(src).toMatch(/type MigratedPage =[^\n]*'anb'/)
  })

  it('renders a rail entry that selects it, after Mal qrupları', () => {
    expect(src).toContain("go('anb')")
    expect(src.indexOf('Anbar və layihələr')).toBeGreaterThan(src.indexOf('Mal qrupları'))
  })

  it('mounts the page with onManage → refs and the two card handoffs', () => {
    const block = src.slice(src.indexOf("activePage === 'anb' && ("), src.indexOf('</main>'))
    expect(block).toContain('<WarehouseOverviewPage')
    expect(block).toContain("onManage={() => go('refs')}")
    expect(block).toContain('onOpenOperation=')
    expect(block).toContain('onEditItem=')
  })

  it('does not gate the entry behind isAdmin', () => {
    const entry = src.slice(src.indexOf("go('anb')") - 200, src.indexOf('Anbar və layihələr'))
    expect(entry).not.toContain('isAdmin')
  })
})

/* M11-01 / M11-02 / M11-03 / M11-44 / M11-45 — the «İdarə paneli» wiring,
   pinned at source level like the blocks above. Runtime behaviour is in
   App.test.tsx («App — «İdarə paneli» rail entry»). */
describe('App nav — İdarə paneli (M11-01 … M11-03)', () => {
  it('imports the page', () => {
    expect(src).toContain("import { DashboardPage } from './pages/DashboardPage'")
  })

  it('adds `dash` to the migrated-page union', () => {
    expect(src).toMatch(/type MigratedPage =[^\n]*'dash'/)
  })

  it('renders a rail entry that selects it as the FIRST entry of the Əməliyyat group', () => {
    /* M18-20 — `go('dash')` also appears in the legacy citation
       «renderAll(); go('dash')» inside the page-switch comment, which sits
       ABOVE the rail. Anchor the search to the rail itself so this asserts the
       rail entry's position and not a comment's. This brittleness is exactly
       why App.test.tsx renders the rail and queries the DOM; these source
       checks remain the cheap missing-line net, never the acceptance
       evidence. */
    const dash = src.indexOf("go('dash')", src.indexOf('<nav className='))
    const group = src.indexOf('<div className="grp">Əməliyyat</div>')
    expect(dash).toBeGreaterThan(group)
    /* The entry text follows its onClick within the same anchor. */
    /* Anchored for the same reason as `dash` above: go('op') also appears in
       the goOperation() helper, which sits above the rail. */
    const op = src.indexOf("go('op')", src.indexOf('<nav className='))
    expect(src.indexOf('İdarə paneli', dash)).toBeGreaterThan(dash)
    expect(src.indexOf('İdarə paneli', dash)).toBeLessThan(op)
    expect(dash).toBeLessThan(op)
  })

  /* D-L1 — the legacy landing page for every role (index.html:7523). */
  it('lands on dash by default for every role, with no isAdmin branch in the default', () => {
    expect(src).toContain("const activePage: MigratedPage = page ?? 'dash'")
    expect(src).not.toContain("isAdmin(me) ? 'refs' : 'log'")
  })

  it('mounts the page with onOpenMovements → mov and the two card handoffs', () => {
    const block = src.slice(src.indexOf("activePage === 'dash' && ("), src.indexOf("activePage === 'refs' && <ReferenceDirectoryPage"))
    expect(block).toContain('<DashboardPage')
    expect(block).toContain("onOpenMovements={() => go('mov')}")
    expect(block).toContain('onOpenOperation=')
    expect(block).toContain('onEditItem=')
  })

  it('does not gate the entry behind isAdmin', () => {
    const dash = src.indexOf("go('dash')")
    const entry = src.slice(dash - 200, src.indexOf('İdarə paneli', dash))
    expect(entry).not.toContain('isAdmin')
  })
})

/* M13-01 / M13-02 — the «Sərfiyyat Materialları» wiring, pinned at source
   level like the blocks above. Runtime rail behaviour (order, and that the
   entry is rendered for ALL THREE roles with no gate) is in App.test.tsx;
   this is the cheap missing-line check. */
describe('App nav — Sərfiyyat Materialları (M13-01, M13-02)', () => {
  it('imports the page', () => {
    expect(src).toContain("import { SerfiyyatPage } from './pages/SerfiyyatPage'")
  })

  it('adds `sm` to the migrated-page union', () => {
    expect(src).toMatch(/type MigratedPage =[^\n]*'sm'/)
  })

  it('renders a rail entry that selects it', () => {
    expect(src).toContain("go('sm')")
    expect(src).toContain('Sərfiyyat Materialları')
  })

  it('mounts the page for the sm route', () => {
    expect(src).toContain("activePage === 'sm' && <SerfiyyatPage me={me} />")
  })

  /* index.html:262 — the LAST entry of «Bazalar», after «Nomenklatura
     sorğuları», and still above the «Sistem» group. */
  it('places the entry after Nomenklatura sorğuları and before Sistem', () => {
    const sm = src.indexOf("go('sm')")
    expect(sm).toBeGreaterThan(src.indexOf("go('nreq')"))
    expect(sm).toBeLessThan(src.indexOf('Sistem'))
  })

  /* M13-02 — UNGATED. The legacy entry has an id but no display:none, no
     sign-in visibility assignment and no go() branch, so no isAdmin() may
     appear around it. */
  it('does not gate the entry behind isAdmin', () => {
    const sm = src.indexOf("go('sm')")
    const entry = src.slice(sm - 200, src.indexOf('Sərfiyyat Materialları', sm))
    expect(entry).not.toContain('isAdmin')
  })
})

/* M14-01 / M14-02 — the «Hesabatlar» wiring, pinned at source level like the
   blocks above. Runtime rail behaviour (group placement, and that the entry is
   rendered for all three roles with no gate) is in App.test.tsx; this is the
   cheap missing-line check. */
describe('App nav — Hesabatlar (M14-01, M14-02)', () => {
  it('imports the page', () => {
    expect(src).toContain("import { ReportsPage } from './pages/ReportsPage'")
  })

  it('adds `rep` to the migrated-page union', () => {
    expect(src).toMatch(/type MigratedPage =[^\n]*'rep'/)
  })

  it('renders a rail entry that selects it', () => {
    expect(src).toContain("go('rep')")
    expect(src).toContain('Hesabatlar')
  })

  it('mounts the page for the rep route with the two card handoffs', () => {
    expect(src).toContain("activePage === 'rep' && (")
    expect(src).toContain('<ReportsPage')
    const block = src.slice(src.indexOf("activePage === 'rep' && ("), src.indexOf('</main>'))
    expect(block).toContain('onOpenOperation=')
    expect(block).toContain('onOpenOperation=')
    expect(block).toContain('onEditItem=')
    expect(block).toContain('onEditItem=')
  })

  /* index.html:263-265 — «Hesabatlar» OPENS the «Təhlil» group, which follows
     «Bazalar» and precedes «Sistem». */
  it('opens a Təhlil group placed after Bazalar and before Sistem', () => {
    const tehlil = src.indexOf('<div className="grp">Təhlil</div>')
    expect(tehlil).toBeGreaterThan(src.indexOf('<div className="grp">Bazalar</div>'))
    expect(tehlil).toBeLessThan(src.indexOf('<div className="grp">Sistem</div>'))
    /* The entry is the FIRST thing in that group. */
    expect(src.indexOf("go('rep')")).toBeGreaterThan(tehlil)
    expect(src.indexOf("go('rep')")).toBeLessThan(src.indexOf('<div className="grp">Sistem</div>'))
  })

  it('places the entry after Sərfiyyat Materialları', () => {
    expect(src.indexOf("go('rep')")).toBeGreaterThan(src.indexOf("go('sm')"))
  })

  /* M14-02 — UNGATED: the legacy `<a data-p="rep">` has no id, no
     display:none and no go() branch, so no isAdmin() may appear around it. */
  it('does not gate the entry behind isAdmin', () => {
    const rep = src.indexOf("go('rep')")
    const entry = src.slice(rep - 200, src.indexOf('Hesabatlar', rep))
    expect(entry).not.toContain('isAdmin')
  })
})

/* M17-01 … M17-05 — the «Azpetrol / Araz» wiring, pinned at source level like
   every block above. The page's own behaviour (the gate, both boards, the
   register, the history and the report) is in pages/AzpPage.test.tsx.

   This entry is the ONE rail link in the app that is genuinely role gated:
   legacy ships it `display:none` and reveals it at sign-in only when
   `azpCanRead()` (index.html:268, 7507), and go() refuses the route outright
   (1503). That gate is a BROWSER AFFORDANCE, never a permission — the
   authority is `azp_can_read()` and the RLS SELECT policies (M17-17…M17-21,
   BLOCKED). */
describe('App nav — Azpetrol / Araz (M17-01 … M17-05)', () => {
  it('imports the page', () => {
    expect(src).toContain("import { AzpPage } from './pages/AzpPage'")
  })

  it('adds `azp` to the migrated-page union', () => {
    expect(src).toMatch(/type MigratedPage =[^\n]*'azp'/)
  })

  it('renders a rail entry that selects it', () => {
    expect(src).toContain("go('azp')")
    expect(src).toContain('Azpetrol / Araz')
  })

  it('mounts the page for the azp route', () => {
    expect(src).toContain("activePage === 'azp' && <AzpPage me={me} />")
  })

  /* M17-01 — «Yanacaq» is its OWN group, after «Nəzarət və risklər» and
     before «Sistem» (index.html:266-270). */
  it('opens a Yanacaq group placed after Nəzarət və risklər and before Sistem', () => {
    const yanacaq = src.indexOf('<div className="grp">Yanacaq</div>')
    expect(yanacaq).toBeGreaterThan(src.indexOf("go('ctrl')"))
    expect(yanacaq).toBeLessThan(src.indexOf('<div className="grp">Sistem</div>'))
    expect(src.indexOf("go('azp')")).toBeGreaterThan(yanacaq)
    expect(src.indexOf("go('azp')")).toBeLessThan(src.indexOf('<div className="grp">Sistem</div>'))
  })

  /* M17-02 — gated by the module's OWN role model, not ANBAR's. `anbardar`
     is refused here while being a full working role elsewhere, so
     `effectiveRole()`/`isAdmin` must NOT appear around this entry. */
  it('gates the entry behind azpCanRead, not isAdmin', () => {
    expect(src).toContain("import { azpCanRead } from './lib/azpRole'")
    const azp = src.indexOf("go('azp')")
    const entry = src.slice(azp - 400, azp)
    expect(entry).toContain('azpCanRead(me)')
    expect(entry).not.toContain('isAdmin')
  })

  /* M17-03 — no `<b>` counter: counters() never touches azp. */
  it('carries no counter badge', () => {
    const azp = src.indexOf("go('azp')")
    const entry = src.slice(azp, src.indexOf('</a>', azp))
    expect(entry).not.toContain('<b>')
  })
})
