import { useState } from 'react'
import { signIn, signOut } from '../api/auth.api'
import { registerSession, type RegisterSessionResult } from '../api/session.api'
import { setRemember, savedEmail, saveEmail } from '../api/supabase'
import { useAuthStore } from '../store/auth.store'
import { useToastStore } from '../store/toast.store'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { SessionLimitDialog } from '../components/SessionLimitDialog'
import { fetchProfile } from '../api/auth.api'
import type { Me } from '../lib/roles'

interface Props {
  onLoggedIn: (me: Me) => void
}

export function LoginPage({ onLoggedIn }: Props) {
  const [email, setEmail] = useState(savedEmail())
  const [password, setPassword] = useState('')
  const [remember, setRememberState] = useState(false)
  const [busy, setBusy] = useState(false)
  const [limitInfo, setLimitInfo] = useState<RegisterSessionResult | null>(null)
  const setError = useAuthStore((s) => s.setError)
  const show = useToastStore((s) => s.show)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email || !password) {
      show('E-poçt və şifrəni daxil edin', true)
      return
    }
    setBusy(true)
    setRemember(remember)
    try {
      const { data, error } = await signIn(email, password)
      if (error) throw error
      const reg = await registerSession()
      if (reg.allowed === false) {
        await signOut()
        setLimitInfo(reg)
        setBusy(false)
        return
      }
      saveEmail(remember ? email : '')
      const { data: profile, error: profileErr } = await fetchProfile(data.user.id)
      if (profileErr || !profile) throw new Error('İstifadəçi profili tapılmadı. Rəhbər ilə əlaqə saxlayın.')
      if (!profile.active) throw new Error('Hesabınız deaktiv edilib.')
      const me: Me = {
        id: data.user.id,
        sbId: data.user.id,
        email: data.user.email ?? profile.email ?? '',
        name: profile.name || (data.user.email ?? '').split('@')[0],
        role: profile.role || 'baxis',
        wh: profile.warehouse || '',
      }
      onLoggedIn(me)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Giriş xətası'
      setError(message)
      show(message, true)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <form onSubmit={handleSubmit} className="w-full max-w-sm rounded-lg bg-white p-8 shadow">
        <h1 className="mb-6 text-xl font-semibold">ANBAR</h1>
        <label className="mb-3 block text-sm">
          <span className="mb-1 block text-slate-600">E-poçt ünvanı</span>
          <Input type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label className="mb-3 block text-sm">
          <span className="mb-1 block text-slate-600">Şifrə</span>
          <Input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>
        <label className="mb-4 flex items-center gap-2 text-sm text-slate-600">
          <input type="checkbox" checked={remember} onChange={(e) => setRememberState(e.target.checked)} />
          Məni bu cihazda yadda saxla
        </label>
        <Button type="submit" disabled={busy} className="w-full">
          {busy ? 'Yüklənir...' : 'Daxil ol'}
        </Button>
      </form>
      {limitInfo && <SessionLimitDialog info={limitInfo} onClose={() => setLimitInfo(null)} />}
    </div>
  )
}
