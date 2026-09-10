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
import { useOperationStore } from './store/operation.store'
import { useNomenclatureStore } from './store/nomenclature.store'
import { ROLES, isAdmin, type Me } from './lib/roles'
import { fetchAuditTotal } from './api/auditTotal.api'
import { useAuditLogStore } from './store/auditLog.store'

/* The two pages migrated so far. Not a router — a minimal internal switch,
   in scope only because Audit jurnalı must be reachable (Phase 4 approval).
   No entry is added for any unmigrated module. */
type MigratedPage = 'refs' | 'log' | 'nom' | 'grp' | 'op' | 'mov' | 'bal'

function App() {
  const { me, status, setMe, setStatus, reset } = useAuthStore()
  const [restoreLimitInfo, setRestoreLimitInfo] = useState<RegisterSessionResult | null>(null)
  const [sessionOpen, setSessionOpen] = useState(false)
  const [passwordOpen, setPasswordOpen] = useState(false)
  const [page, setPage] = useState<MigratedPage | null>(null)
  const [auditTotal, setAuditTotal] = useState<{ value: number; error: boolean } | null>(null)
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
    return () => { cancelled = true }
  }, [status, loadDirectory])

  /* A non-admin has no «Soraqçalar» link to land on (it stays admin-gated,
     matching the original — index.html:7505), so default to the one page
     every signed-in user can actually reach. `page` starts `null` (state is
     initialised before `me` is known) and is derived here at render time
     rather than pushed via an effect; an explicit click overrides it via
     `setPage` from then on. */
  const activePage: MigratedPage = page ?? (isAdmin(me) ? 'refs' : 'log')

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
            <div className="brand">Anbar <span>Uçot və Təchizat Platforması</span></div>
            <div className="sp" />
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
            <nav className="rail">
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
              <a className={activePage === 'op' ? 'on' : undefined} onClick={() => setPage('op')}>
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
              <a className={activePage === 'mov' ? 'on' : undefined} onClick={() => setPage('mov')}>
                Mal hərəkəti
              </a>
              {/* M9-01 — «Anbar qalıqları» is the THIRD entry of the group,
                  after «Yeni əməliyyat» and «Mal hərəkəti» (index.html:254).

                  UNGATED for every role (M9-04): the legacy `<a data-p="bal">`
                  carries neither an id nor a display:none rule, and go() has
                  no `bal` branch (1495-1503). Role affects the row set (RLS)
                  and cell editability, never access. */}
              <a className={activePage === 'bal' ? 'on' : undefined} onClick={() => setPage('bal')}>
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
              <a className={activePage === 'nom' ? 'on' : undefined} onClick={() => setPage('nom')}>
                Nomenklatura
              </a>
              {/* «Mal qrupları» sits directly under Nomenklatura in the
                  original rail (index.html:258) and, like it, carries no id
                  and no display:none — the screen is ungated for every role,
                  with the warehouse scope doing the narrowing. */}
              <a className={activePage === 'grp' ? 'on' : undefined} onClick={() => setPage('grp')}>
                Mal qrupları
              </a>
              {/* «Soraqçalar» keeps its role gate: the original hides it with
                  `display:none` and go() refuses the page for a non-Admin
                  (index.html:261, 1496). */}
              {isAdmin(me) && (
                <a className={activePage === 'refs' ? 'on' : undefined} onClick={() => setPage('refs')}>
                  Soraqçalar
                </a>
              )}
              <div className="grp">Sistem</div>
              <a className={activePage === 'log' ? 'on' : undefined} onClick={() => setPage('log')}>
                Audit jurnalı{' '}
                <b>{auditTotal === null ? '…' : auditTotal.error ? '!' : auditTotal.value}</b>
              </a>
              <div className="grp">Miqrasiya</div>
              <span className="hint" style={{ display: 'block', padding: '4px 16px' }}>
                Digər bölmələr köhnə platformadadır.
              </span>
            </nav>

            <main className="main">
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
                  onOpenOperation={(code) => {
                    useOperationStore.getState().prefill(code)
                    setPage('op')
                  }}
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
                  onNewOperation={() => setPage('op')}
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
                    setPage('op')
                  }}
                />
              )}
              {activePage === 'bal' && (
                <BalancesPage
                  me={me}
                  /* M5-55 precedent — the item card's «Bu mal üzrə əməliyyat»
                     seeds the store FIRST and navigates SECOND, exactly as the
                     Nomenklatura handoff above does. */
                  onOpenOperation={(code) => {
                    useOperationStore.getState().prefill(code)
                    setPage('op')
                  }}
                  /* «Malı redaktə et» — the item form lives on the Nomenklatura
                     screen (legacy editItem(), index.html:1888). The card is
                     opened THERE first, then the rail switches, so the user
                     lands on the same card with its edit button in reach.
                     No Phase 9 ledger row governs this handoff; it is a
                     navigation convenience, not a parity claim. */
                  onEditItem={(code) => {
                    useNomenclatureStore.getState().openCard(code)
                    setPage('nom')
                  }}
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
