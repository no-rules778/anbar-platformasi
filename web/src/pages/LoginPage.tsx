import { useState } from 'react'
import { signIn, signOut } from '../api/auth.api'
import { registerSession, type RegisterSessionResult } from '../api/session.api'
import { setRemember, rememberOn, savedEmail, saveEmail } from '../api/supabase'
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
  /* The original restores the saved preference into the checkbox
     (`$('#g-rem').checked = rememberOn()`, index.html:7554) — otherwise a
     returning user silently loses their persistent session on next sign-in. */
  const [remember, setRememberState] = useState(rememberOn())
  const [busy, setBusy] = useState(false)
  const [limitInfo, setLimitInfo] = useState<RegisterSessionResult | null>(null)
  const setError = useAuthStore((s) => s.setError)
  const show = useToastStore((s) => s.show)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    /* Original trims the address before every use (index.html:7558). */
    const trimmedEmail = email.trim()
    if (!trimmedEmail || !password) {
      show('E-poçt və şifrəni daxil edin', true)
      return
    }
    setBusy(true)
    setRemember(remember)
    try {
      const { data, error } = await signIn(trimmedEmail, password)
      if (error) throw error
      const reg = await registerSession()
      if (reg.allowed === false) {
        await signOut()
        setLimitInfo(reg)
        setBusy(false)
        return
      }
      saveEmail(remember ? trimmedEmail : '')
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
    <div id="gate">
      {/* The production login gate: a white card on the dark steel gradient
          (index.html:144-149). */}
      <form className="box" onSubmit={handleSubmit}>
        <h1>Anbar</h1>
        <p className="sub">Uçot və Təchizat Platforması</p>

        <label className="f">
          <span>E-poçt ünvanı</span>
          <Input type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label className="f">
          <span>Şifrə</span>
          <Input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>
        <label style={{ display: 'flex', gap: 8, alignItems: 'center', margin: '2px 0 14px' }}>
          <input type="checkbox" style={{ width: 'auto' }} checked={remember} onChange={(e) => setRememberState(e.target.checked)} />
          <span className="hint">Məni bu cihazda yadda saxla</span>
        </label>

        <Button type="submit" disabled={busy} style={{ width: '100%', justifyContent: 'center' }}>
          {busy ? 'Yüklənir...' : 'Daxil ol'}
        </Button>
      </form>
      {limitInfo && <SessionLimitDialog info={limitInfo} onClose={() => setLimitInfo(null)} />}
    </div>
  )
}
