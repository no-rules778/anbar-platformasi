import { useEffect, useState } from 'react'
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
import { Button } from './components/ui/Button'
import { ToastHost } from './components/ui/Toast'
import { WarehousesPage } from './pages/WarehousesPage'
import { ROLES, type Me } from './lib/roles'

function App() {
  const { me, status, setMe, setStatus, reset } = useAuthStore()
  const [restoreLimitInfo, setRestoreLimitInfo] = useState<RegisterSessionResult | null>(null)
  const [sessionOpen, setSessionOpen] = useState(false)
  const [passwordOpen, setPasswordOpen] = useState(false)

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

  useEffect(() => {
    return () => { if (status === 'ready') unregisterSession() }
  }, [status])

  /* Ported from index.html sessionDialog()'s «Çıxış» (7444): stop the
     heartbeat, free this device's slot, forget the "remember me" choice, then
     sign out. The original then reloaded the page; resetting the store puts us
     in the same state without discarding the tab. */
  async function logout() {
    setStatus('idle')
    await unregisterSession()
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
        <div className="min-h-screen bg-slate-50">
          <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-3">
            <span className="text-sm font-semibold tracking-wide">ANBAR</span>
            <Button variant="secondary" onClick={() => setSessionOpen(true)}>
              {me.name.split(' ')[0]} · {ROLES[me.role ?? ''] ? ROLES[me.role ?? ''].name : me.role}
            </Button>
          </header>
          <WarehousesPage me={me} />
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
        <div className="flex min-h-screen items-center justify-center bg-slate-50">
          <p className="text-sm text-slate-500">Sessiya bərpa olunur...</p>
        </div>
      ) : (
        <LoginPage onLoggedIn={(loggedInMe) => { setMe(loggedInMe); setStatus('ready') }} />
      )}
      {restoreLimitInfo && <SessionLimitDialog info={restoreLimitInfo} onClose={() => setRestoreLimitInfo(null)} />}
    </>
  )
}

export default App
