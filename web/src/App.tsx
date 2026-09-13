import { useEffect, useRef, useState } from 'react'
import { getSession } from './api/auth.api'
import { registerSession, unregisterSession, setAccessToken, type RegisterSessionResult } from './api/session.api'
import { supabase, setRemember } from './api/supabase'
import { fetchProfile, signOut } from './api/auth.api'
import { useAuthStore } from './store/auth.store'
import { useHeartbeat } from './hooks/useHeartbeat'
import { useReleaseDeviceOnUnload } from './hooks/useReleaseDeviceOnUnload'
import { LoginPage } from './pages/LoginPage'
import { SessionLimitDialog } from './components/SessionLimitDialog'
import { SessionDialog } from './components/SessionDialog'
import { PasswordChangeDialog } from './components/PasswordChangeDialog'
import { ToastHost } from './components/ui/Toast'
import { SyncIndicator } from './components/SyncIndicator'
import { ReferenceDirectoryPage } from './pages/ReferenceDirectoryPage'
import { AuditLogPage } from './pages/AuditLogPage'
import { NomenclaturePage } from './pages/NomenclaturePage'
import { ItemGroupsPage } from './pages/ItemGroupsPage'
import { NewOperationPage } from './pages/NewOperationPage'
import { MovementsPage } from './pages/MovementsPage'
import { BalancesPage } from './pages/BalancesPage'
import { WarehouseOverviewPage } from './pages/WarehouseOverviewPage'
import { DashboardPage } from './pages/DashboardPage'
import { ItemRequestsPage } from './pages/ItemRequestsPage'
import { SerfiyyatPage } from './pages/SerfiyyatPage'
import { ReportsPage } from './pages/ReportsPage'
import { FinancePage } from './pages/FinancePage'
import { ControlsPage } from './pages/ControlsPage'
import { SettingsPage } from './pages/SettingsPage'
import { AzpPage } from './pages/AzpPage'
import { azpCanRead } from './lib/azpRole'
import { useOperationStore } from './store/operation.store'
import { useNomenclatureStore } from './store/nomenclature.store'
import { ROLES, isAdmin, type Me } from './lib/roles'
import { initials, nf } from './lib/format'
import { fetchAuditTotal } from './api/auditTotal.api'
import { fetchNavCounts, type NavCounts } from './api/navCounters.api'
import { useAuditLogStore } from './store/auditLog.store'

/* The two pages migrated so far. Not a router — a minimal internal switch,
   in scope only because Audit jurnalı must be reachable (Phase 4 approval).
   No entry is added for any unmigrated module. */
type MigratedPage = 'dash' | 'refs' | 'log' | 'nom' | 'grp' | 'op' | 'mov' | 'bal' | 'anb' | 'nreq' | 'sm' | 'rep' | 'fin' | 'ctrl' | 'set' | 'azp'

function App() {
  const { me, status, setMe, setStatus, reset } = useAuthStore()
  const [restoreLimitInfo, setRestoreLimitInfo] = useState<RegisterSessionResult | null>(null)
  const [sessionOpen, setSessionOpen] = useState(false)
  const [passwordOpen, setPasswordOpen] = useState(false)
  const [page, setPage] = useState<MigratedPage | null>(null)
  /* M18-30 — the off-canvas rail's open state below 900px. Legacy keeps this
     on the DOM node (`$('#rail').classList.toggle('open')`, index.html:1514)
     and `go()` removes it on every page change (1508). */
  const [railOpen, setRailOpen] = useState(false)
  const [auditTotal, setAuditTotal] = useState<{ value: number; error: boolean } | null>(null)
  /* M18-10 — the three plain-count rail badges. `null` while loading. */
  const [navCounts, setNavCounts] = useState<NavCounts | null>(null)
  const loadDirectory = useAuditLogStore((s) => s.loadDirectory)

  useEffect(() => {
    let cancelled = false
    async function restore() {
      setStatus('loading')
      const session = await getSession()
      if (cancelled) return
      if (!session?.user) {
        setStatus('idle')
        return
      }
      const reg = await registerSession()
      if (cancelled) return
      if (reg.allowed === false) {
        await signOut()
        if (!cancelled) {
          setRestoreLimitInfo(reg)
          setStatus('idle')
        }
        return
      }
      const { data: profile, error } = await fetchProfile(session.user.id)
      if (cancelled) return
      if (error || !profile || !profile.active) {
        await signOut()
        if (!cancelled) setStatus('idle')
        return
      }
      const restored: Me = {
        id: session.user.id,
        sbId: session.user.id,
        email: session.user.email ?? profile.email ?? '',
        name: profile.name || (session.user.email ?? '').split('@')[0],
        role: profile.role || 'baxis',
        wh: profile.warehouse || '',
      }
      if (!cancelled) {
        setMe(restored)
        setStatus('ready')
      }
    }
    restore()
    return () => { cancelled = true }
  }, [setMe, setStatus])

  useHeartbeat(status === 'ready')
  useReleaseDeviceOnUnload(status === 'ready')

  /* loadAuditTotal() + loadAuditUsers() (index.html:7515-7516): both run once
     at boot, not when the audit page is first opened — M4-16/M4-17. The badge
     shows '…' while loading, '!' on a failed count, else the formatted total
     (1528); the directory warms so the actor column resolves immediately the
     first time Audit jurnalı is opened. */
  useEffect(() => {
    if (status !== 'ready') return
    let cancelled = false
    fetchAuditTotal().then(({ total, ok }) => {
      if (!cancelled) setAuditTotal({ value: total, error: !ok })
    })
    void loadDirectory()
    /* M18-10 — legacy counters() runs inside render() off an already-loaded
       global cache (index.html:1518). React has no such cache, so the three
       plain counts are fetched once at boot beside the audit total, the same
       way M4-16 does. */
    fetchNavCounts().then((c) => { if (!cancelled) setNavCounts(c) })
    return () => { cancelled = true }
  }, [status, loadDirectory])

  /* D-L1 / M11-03 — the legacy app lands on the dashboard for every role
     (`renderAll(); go('dash')`, index.html:7523), and «İdarə paneli» is
     ungated. The interim `refs`/`log` default existed only while the
     dashboard was unmigrated. `page` starts `null` (state is initialised
     before `me` is known) and is derived here at render time rather than
     pushed via an effect; an explicit click overrides it via `setPage`. */
  const activePage: MigratedPage = page ?? 'dash'

  /* M18-20 / M18-21 / M18-22 — the page-switch side effects.

     Every rail entry and every cross-page handoff went through legacy `go()`
     (index.html:1495-1512), which did three things after setting the page that
     no React caller does: it closed any open overlay, cleared `CARD_CODE`, and
     reset the scroll position.

     Two of those matter here and one does not:

     - `window.scrollTo(0,0)` (1511) — M18-20. React never resets scroll, so
       arriving on a new screen halfway down the previous screen's scroll
       offset is a real, user-visible divergence.
     - `CARD_CODE = ''` (1510) — M18-21. This is NOT made redundant by
       unmounting: `cardCode` lives in the Nomenklatura store
       (store/nomenclature.store.ts:42-43,75), so it OUTLIVES the page. Without
       this, opening an item card, leaving and coming back re-opens the card.
     - `closeOverlays()` (1509) — M18-22 is deliberately NOT ported. React
       dialogs are children of their page and are destroyed when it unmounts,
       so there is nothing left hanging; the legacy call existed only because
       its overlays were singleton DOM nodes outside the page. Porting it would
       be a change with no failure it prevents.

     Routing every page change through one helper is what makes this hold for
     the cross-page handoffs too, not just the rail clicks. */
  function go(next: MigratedPage) {
    setPage(next)
    useNomenclatureStore.getState().openCard(null)
    setRailOpen(false)
    window.scrollTo(0, 0)
  }

  /* M18-10 — a badge renders '…' while the count is in flight and '!' when it
     failed, exactly as the audit badge does (index.html:1528). A failed count
     must never render as 0: that would assert "there are none", which nothing
     verified. */
  function badge(n: number | null | undefined) {
    if (navCounts === null) return '…'
    return n === null || n === undefined ? '!' : nf(n)
  }

  /* «Malı redaktə et» — the one handoff that must survive the card reset
     above, because the card IS the payload. Legacy's own editItem() is exempt
     for the same reason: it navigates and then opens the card
     (index.html:1888), so the clear inside go() happens BEFORE the open, never
     after. Calling openCard() first and go() second would clear the very card
     that was just requested — the bug this ordering exists to prevent. */
  function goEditItem(code: string) {
    go('nom')
    useNomenclatureStore.getState().openCard(code)
  }

  /* The prefill handoffs keep the M5-55 order — seed the store FIRST, switch
     SECOND — because go() does not touch the operation store. */
  function goOperation(code: string) {
    useOperationStore.getState().prefill(code)
    go('op')
  }

  /* The unload beacon needs the access token synchronously, so keep a cached
     copy fresh. The original captured it once at login (window.SB_TOKEN,
     index.html:7510), which went stale after an hour when the token refreshed
     (BUG_REGISTRY C-12); subscribing keeps it correct without changing any
     observable behaviour. */
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setAccessToken(data.session?.access_token ?? null))
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setAccessToken(session?.access_token ?? null)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  /* This device's session row must be released exactly once. Two paths can
     want to do it — an explicit logout and a genuine unmount while signed in —
     so a single latch decides which one actually sends the RPC.

     The unmount effect deliberately has no `status` dependency: with one, a
     normal ready → idle logout re-ran the effect and fired its cleanup, so the
     RPC went out twice (once from the cleanup, once from logout()). `statusRef`
     lets the unmount cleanup still know whether anyone was signed in. */
  const statusRef = useRef(status)
  useEffect(() => { statusRef.current = status }, [status])
  const deviceReleasedRef = useRef(false)

  useEffect(() => {
    return () => {
      if (statusRef.current === 'ready' && !deviceReleasedRef.current) {
        deviceReleasedRef.current = true
        void unregisterSession()
      }
    }
  }, [])

  /* Ported from index.html sessionDialog()'s «Çıxış» (7444): stop the
     heartbeat, free this device's slot, forget the "remember me" choice, then
     sign out. The original then reloaded the page; resetting the store puts us
     in the same state without discarding the tab. */
  async function logout() {
    setStatus('idle')
    if (!deviceReleasedRef.current) {
      deviceReleasedRef.current = true
      await unregisterSession()
    }
    setRemember(false)
    await signOut()
    setAccessToken(null)
    setSessionOpen(false)
    reset()
  }

  return (
    <>
      <ToastHost />
      {status === 'ready' && me ? (
        <div>
          {/* Topbar and rail reproduce the production shell (index.html
              topbar 34-44, rail 46-53). Only the migrated entries are
              listed — «Soraqçalar» (Admin-only, index.html:7505) and «Audit
              jurnalı» (no UI gate, matching the original's own nav-log entry,
              which carries neither an id nor a display:none rule at
              index.html:270/7503-7507 — Q1, Phase 4). This is a minimal
              internal switch, not a router: no entry exists for any
              unmigrated module. */}
          <div className="topbar">
            {/* M18-30 — the burger. Legacy's is the FIRST child of the topbar,
                hidden by default and revealed only under 900px
                (index.html:204-211, 240). It toggles the rail's `open` class
                (1514); here that lives in React state instead of on the node,
                which is the same behaviour by a different mechanism. */}
            <button
              id="burger"
              title="Menyu"
              aria-label="Menyu"
              aria-expanded={railOpen}
              onClick={() => setRailOpen((v) => !v)}
            >
              ☰
            </button>
            <div className="brand">Anbar <span>Uçot və Təchizat Platforması</span></div>
            <div className="sp" />
            {/* M18-31 — the presence chip (index.html:243, 1191-1194). Legacy
                shows the signed-in user's initials and first name; it is
                purely informational and carries no permission meaning. */}
            <div className="presence">
              <span className="chip" title={me.name}>
                <i>{initials(me.name)}</i>{me.name.split(' ')[0]}
              </span>
            </div>
            <SyncIndicator />
            <button
              className="btn sm"
              style={{ background: 'rgba(255,255,255,.14)', borderColor: 'transparent', color: '#fff' }}
              onClick={() => setSessionOpen(true)}
            >
              {me.name.split(' ')[0]} · {ROLES[me.role ?? ''] ? ROLES[me.role ?? ''].name : me.role}
            </button>
          </div>

          <div className="layout">
            <nav className={railOpen ? 'rail open' : 'rail'}>
              {/* «Əməliyyat» comes FIRST in the original rail
                  (index.html:250-252) and «Yeni əməliyyat» is its second
                  entry, directly under «İdarə paneli». «Mal hərəkəti» (Phase 8)
                  and «Anbar qalıqları» (Phase 9, M9-01) follow it below in the
                  original order; «İdarə paneli» itself is not migrated, so
                  the group starts here.

                  M7-02 — the LINK itself carries NO role gate: the original's
                  `<a data-p="op">` has neither an id nor a display:none rule
                  (251), so a rehber reaches the screen and is refused at the
                  post, not at the door. */}
              <div className="grp">Əməliyyat</div>
              {/* M11-01 / M11-02 — «İdarə paneli» is the FIRST entry of the
                  group (index.html:251). No id, no display:none, no go()
                  branch: ungated for every role. */}
              <a className={activePage === 'dash' ? 'on' : undefined} onClick={() => go('dash')}>
                İdarə paneli
              </a>
              <a className={activePage === 'op' ? 'on' : undefined} onClick={() => go('op')}>
                Yeni əməliyyat
              </a>
              {/* M8-01 — «Mal hərəkəti» is the SECOND entry of the group, in
                  the original's own order (index.html:252-253): «Yeni
                  əməliyyat» first, «Mal hərəkəti» second. «Anbar qalıqları»
                  follows it there — the THIRD entry, wired below (M9-01).

                  UNGATED for every role (M8-41): the legacy `<a data-p="mov">`
                  carries neither an id nor a display:none rule, and go() has
                  no `mov` branch (1495-1503). The screen is open; what an
                  anbardar SEES on it is decided by RLS, not by this link. */}
              <a className={activePage === 'mov' ? 'on' : undefined} onClick={() => go('mov')}>
                Mal hərəkəti
              </a>
              {/* M9-01 — «Anbar qalıqları» is the THIRD entry of the group,
                  after «Yeni əməliyyat» and «Mal hərəkəti» (index.html:254).

                  UNGATED for every role (M9-04): the legacy `<a data-p="bal">`
                  carries neither an id nor a display:none rule, and go() has
                  no `bal` branch (1495-1503). Role affects the row set (RLS)
                  and cell editability, never access. */}
              <a className={activePage === 'bal' ? 'on' : undefined} onClick={() => go('bal')}>
                Anbar qalıqları
              </a>
              {/* ONE «Bazalar» group, as the original rail has
                  (index.html:255-262). The heading was briefly rendered twice
                  — once before Soraqçalar and again before Nomenklatura — which
                  the Phase 6 audit flagged as A03.

                  Order follows the original within the group: Nomenklatura,
                  then Mal qrupları, then Soraqçalar. */}
              <div className="grp">Bazalar</div>
              {/* «Nomenklatura» carries no id and no display:none in the
                  original (index.html:256), so like Audit jurnalı the page
                  itself is ungated — only its action buttons are. */}
              <a className={activePage === 'nom' ? 'on' : undefined} onClick={() => go('nom')}>
                Nomenklatura <b>{badge(navCounts?.items)}</b>
              </a>
              {/* «Mal qrupları» sits directly under Nomenklatura in the
                  original rail (index.html:258) and, like it, carries no id
                  and no display:none — the screen is ungated for every role,
                  with the warehouse scope doing the narrowing. */}
              {/* M18-01 — «Nomenklatura sorğuları» sits DIRECTLY under
                  «Nomenklatura» in the legacy rail: it is the SECOND entry of
                  «Bazalar» (index.html:257), before «Mal qrupları», not the
                  last. Phase 12 knowingly parked it at the end and recorded
                  the move as «a Phase 18 shell concern»; this is that move.

                  The legacy entry is `display:none` and revealed by
                  `isAdmin() || isAnbardar() || isRehber()` (7506). Because
                  effectiveRole() maps EVERY role to one of those three
                  (641-642), the gate excludes nobody in the current role
                  model — including the legacy techizat/muhasib/baxis values,
                  which map to rehber. It is rendered unconditionally here for
                  exactly that reason, and it is a UI gate either way, never a
                  permission (M12-04). */}
              <a className={activePage === 'nreq' ? 'on' : undefined} onClick={() => go('nreq')}>
                Nomenklatura sorğuları
              </a>
              <a className={activePage === 'grp' ? 'on' : undefined} onClick={() => go('grp')}>
                Mal qrupları
              </a>
              <a className={activePage === 'anb' ? 'on' : undefined} onClick={() => go('anb')}>
                Anbar və layihələr <b>{badge(navCounts?.warehouses)}</b>
              </a>
              {/* «Soraqçalar» keeps its role gate: the original hides it with
                  `display:none` and go() refuses the page for a non-Admin
                  (index.html:261, 1496). */}
              {isAdmin(me) && (
                <a className={activePage === 'refs' ? 'on' : undefined} onClick={() => go('refs')}>
                  Soraqçalar
                </a>
              )}
              {/* M13-01 / M13-02 — «Sərfiyyat Materialları» is the LAST entry
                  of «Bazalar», after «Nomenklatura sorğuları» (index.html:262).

                  UNGATED for every role (M13-02): the legacy `<a data-p="sm"
                  id="nav-sm">` carries an id but NO display:none, the sign-in
                  block never assigns its display (7505-7507 touches only
                  nav-refs, nav-nreq and nav-azp), and go() has no `sm` branch
                  (1495-1512). The id exists without a gate attached to it, so
                  «has an id» must not be read as «role-gated». Role affects
                  only what is INSIDE the page. */}
              <a className={activePage === 'sm' ? 'on' : undefined} onClick={() => go('sm')}>
                Sərfiyyat Materialları
              </a>
              {/* M14-01 / M14-02 — «Hesabatlar» opens the «Təhlil» group, which
                  follows «Bazalar» in the legacy rail (index.html:263-265).
                  «Maliyyə göstəriciləri» and «Nəzarət və risklər» complete that
                  group in legacy and belong to Phase 15, so the group heading
                  is introduced here with its first entry only.

                  UNGATED for every role (M14-02): the legacy `<a data-p="rep">`
                  carries neither an id nor a display:none rule, the sign-in
                  block never assigns its visibility (7505-7507 touches only
                  nav-refs, nav-nreq and nav-azp), and go() has no `rep` branch
                  (1495-1512). Role shapes the ROWS through RLS, never access. */}
              <div className="grp">Təhlil</div>
              <a className={activePage === 'rep' ? 'on' : undefined} onClick={() => go('rep')}>
                Hesabatlar
              </a>
              <a className={activePage === 'fin' ? 'on' : undefined} onClick={() => go('fin')}>
                Maliyyə göstəriciləri
              </a>
              <a className={activePage === 'ctrl' ? 'on' : undefined} onClick={() => go('ctrl')}>
                Nəzarət və risklər
              </a>
              {/* M17-01 / M17-02 — «Azpetrol / Araz» is the SOLE entry of its
                  own «Yanacaq» group, which sits after «Nəzarət və risklər»
                  and before «Sistem» (index.html:266-270).

                  M17-02 — unlike every other rail entry, this one IS role
                  gated: legacy ships it `display:none` and reveals it at
                  sign-in only when `azpCanRead()` (index.html:268, 7507). The
                  module has its OWN role model, in which `anbardar` is refused
                  outright — so this is not ANBAR's `effectiveRole()`.

                  M17-03 — the entry carries NO `<b>` counter; `counters()`
                  never touches azp.

                  This is a BROWSER AFFORDANCE, never a permission: the
                  authority is `azp_can_read()` and the RLS SELECT policies
                  (ledger M17-17…M17-21, BLOCKED). Hiding the link is not what
                  keeps a refused role out of the data. */}
              {azpCanRead(me) && (
                <div className="grp">Yanacaq</div>
              )}
              {azpCanRead(me) && (
                <a
                  data-p="azp"
                  className={activePage === 'azp' ? 'on' : undefined}
                  onClick={() => go('azp')}
                >
                  Azpetrol / Araz
                </a>
              )}
              <div className="grp">Sistem</div>
              <a className={activePage === 'log' ? 'on' : undefined} onClick={() => go('log')}>
                Audit jurnalı{' '}
                <b>{auditTotal === null ? '…' : auditTotal.error ? '!' : auditTotal.value}</b>
              </a>
              <a className={activePage === 'set' ? 'on' : undefined} onClick={() => go('set')}>
                Parametrlər və ixrac
              </a>
            </nav>

            <main className="main">
              {activePage === 'dash' && (
                <DashboardPage
                  me={me}
                  /* M11-44 — «Hamısı» is a PLAIN page switch (data-goto="mov",
                     index.html:289, 1363): no state transfer. */
                  onOpenMovements={() => go('mov')}
                  onOpenControls={() => go('ctrl')}
                  /* M11-45 — the item card's handoffs, in the M5-55 order:
                     seed the store FIRST, switch the page SECOND. */
                  onOpenOperation={(code) => goOperation(code)}
                  onEditItem={(code) => goEditItem(code)}
                />
              )}
              {activePage === 'nreq' && <ItemRequestsPage me={me} />}
              {activePage === 'sm' && <SerfiyyatPage me={me} />}
              {activePage === 'rep' && (
                /* The two card handoffs follow the M5-55 order used by every
                   other screen: seed the store FIRST, switch the page SECOND.
                   The `abc` and `dead` tables open an item card, so both
                   transitions are reachable from here. */
                <ReportsPage
                  me={me}
                  onOpenOperation={(code) => goOperation(code)}
                  onEditItem={(code) => goEditItem(code)}
                />
              )}
              {activePage === 'fin' && <FinancePage me={me} onOpenOperation={(code) => goOperation(code)} onEditItem={(code) => goEditItem(code)} />}
              {activePage === 'ctrl' && <ControlsPage me={me} onOpenOperation={(code) => goOperation(code)} onEditItem={(code) => goEditItem(code)} />}
              {/* M16-11 — the Settings export delegation. SettingsPage records
                  the pending export in the store and this switches the page;
                  the destination consumes the request and runs its OWN export.
                  A plain page switch here, like «Hamısı» above: the state that
                  travels is the export request itself, already recorded. */}
              {activePage === 'set' && <SettingsPage me={me} onOpenPage={(target) => go(target)} />}
              {/* M17-04 / M17-05 — the route gate. Legacy's `go('azp')`
                  refuses with «Azpetrol / Araz moduluna girişiniz yoxdur»
                  when `azpCanRead()` is false (index.html:1503), and
                  `render()` dispatches azp through a guard (1517).

                  Here the page itself renders its own «Giriş yoxdur» gate for
                  a refused role, so a role that reaches this branch by any
                  route still sees the refusal rather than the board. The rail
                  entry above is hidden for the same roles; neither is a
                  permission. */}
              {activePage === 'azp' && <AzpPage me={me} />}
              {activePage === 'refs' && <ReferenceDirectoryPage me={me} />}
              {activePage === 'log' && <AuditLogPage me={me} />}
              {activePage === 'nom' && (
                <NomenclaturePage
                  me={me}
                  /* M5-55 / M7-115 — the legacy prefillOp() (index.html:3452)
                     sets the pick FIRST and navigates second. The same order
                     is kept here: the store records the pending prefill, then
                     the rail switches. Navigation on its own is explicitly
                     not parity, so both steps happen or neither does. */
                  onOpenOperation={(code) => goOperation(code)}
                />
              )}
              {activePage === 'grp' && <ItemGroupsPage me={me} />}
              {activePage === 'op' && <NewOperationPage me={me} />}
              {activePage === 'mov' && (
                /* M8-13 — «Yeni əməliyyat» from the movements header is a
                   PLAIN page switch (index.html:321 + the data-goto="op"
                   delegation at 1363): no prefill, no draft seeding, no state
                   transfer. Deliberately unlike the Nomenklatura handoff
                   above, which seeds the store first BECAUSE it carries a
                   pick; there is nothing to carry here. */
                <MovementsPage
                  me={me}
                  onNewOperation={() => go('op')}
                  /* M8-37 — the correction transition, and the ONE handoff on
                     this screen that carries state. The store is seeded FIRST
                     and the page switches SECOND, the same order the
                     Nomenklatura prefill above uses and for the same reason:
                     navigating to a form that has not been seeded would show
                     an empty «Yeni əməliyyat» with no sign that a correction
                     was requested. Both steps happen or neither does.

                     Nothing is written to the database here. `enterEditMode`
                     only loads the lines; the correction is submitted from
                     «Düzəlişi qeyd et» on the operation screen. */
                  onEditDocument={(mapped, docNum, type) => {
                    useOperationStore.getState().enterEditMode(
                      {
                        docNum,
                        restore: mapped.restore,
                        type,
                        direction: mapped.kind,
                      },
                      mapped.lines,
                      mapped.header,
                    )
                    go('op')
                  }}
                />
              )}
              {activePage === 'bal' && (
                <BalancesPage
                  me={me}
                  /* M5-55 precedent — the item card's «Bu mal üzrə əməliyyat»
                     seeds the store FIRST and navigates SECOND, exactly as the
                     Nomenklatura handoff above does. */
                  onOpenOperation={(code) => goOperation(code)}
                  /* «Malı redaktə et» — the item form lives on the Nomenklatura
                     screen (legacy editItem(), index.html:1888). The card is
                     opened THERE first, then the rail switches, so the user
                     lands on the same card with its edit button in reach.
                     No Phase 9 ledger row governs this handoff; it is a
                     navigation convenience, not a parity claim. */
                  onEditItem={(code) => goEditItem(code)}
                />
              )}
              {activePage === 'anb' && (
                <WarehouseOverviewPage
                  me={me}
                  onManage={() => go('refs')}
                  onOpenOperation={(code) => goOperation(code)}
                  onEditItem={(code) => goEditItem(code)}
                />
              )}
            </main>
          </div>
          {sessionOpen && (
            <SessionDialog
              me={me}
              onLogout={logout}
              onChangePassword={() => { setSessionOpen(false); setPasswordOpen(true) }}
              onClose={() => setSessionOpen(false)}
            />
          )}
          {passwordOpen && <PasswordChangeDialog email={me.email} onClose={() => setPasswordOpen(false)} />}
        </div>
      ) : status === 'loading' ? (
        /* While an existing session is being restored the original disables the
           gate and shows «Sessiya bərpa olunur...» (index.html:7589) — the login
           form must not accept a second, competing sign-in during that window. */
        <div id="gate">
          <div className="box">
            <h1>Anbar</h1>
            <p className="sub">Sessiya bərpa olunur...</p>
          </div>
        </div>
      ) : (
        <LoginPage onLoggedIn={(loggedInMe) => { setMe(loggedInMe); setStatus('ready') }} />
      )}
      {restoreLimitInfo && <SessionLimitDialog info={restoreLimitInfo} onClose={() => setRestoreLimitInfo(null)} />}
    </>
  )
}

export default App
