import { useEffect, useState } from 'react'
import { getSession } from './api/auth.api'
import { registerSession, unregisterSession, type RegisterSessionResult } from './api/session.api'
import { fetchProfile, signOut } from './api/auth.api'
import { useAuthStore } from './store/auth.store'
import { useHeartbeat } from './hooks/useHeartbeat'
import { LoginPage } from './pages/LoginPage'
import { SessionLimitDialog } from './components/SessionLimitDialog'
import { ToastHost } from './components/ui/Toast'
import { WarehousesPage } from './pages/WarehousesPage'
import type { Me } from './lib/roles'

function App() {
  const { me, status, setMe, setStatus } = useAuthStore()
  const [restoreLimitInfo, setRestoreLimitInfo] = useState<RegisterSessionResult | null>(null)

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

  useEffect(() => {
    return () => { if (status === 'ready') unregisterSession() }
  }, [status])

  return (
    <>
      <ToastHost />
      {status === 'ready' && me ? (
        <WarehousesPage me={me} />
      ) : (
        <LoginPage onLoggedIn={(loggedInMe) => { setMe(loggedInMe); setStatus('ready') }} />
      )}
      {restoreLimitInfo && <SessionLimitDialog info={restoreLimitInfo} onClose={() => setRestoreLimitInfo(null)} />}
    </>
  )
}

export default App
