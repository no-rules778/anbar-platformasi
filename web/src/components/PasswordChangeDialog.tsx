import { useState } from 'react'
import { changePassword } from '../api/auth.api'
import { Dialog } from './ui/Dialog'
import { Button } from './ui/Button'
import { Input } from './ui/Input'
import { useToastStore } from '../store/toast.store'

interface Props {
  email: string
  onClose: () => void
}

/* Ported from index.html pwChangeDialog() (lines 7398-7420), including every
   validation and its exact message. The old password is re-checked server-side
   by changePassword() before the new one is set. */
export function PasswordChangeDialog({ email, onClose }: Props) {
  const [oldPass, setOldPass] = useState('')
  const [newPass, setNewPass] = useState('')
  const [repeat, setRepeat] = useState('')
  const [busy, setBusy] = useState(false)
  const show = useToastStore((s) => s.show)

  async function submit() {
    if (!oldPass || !newPass) return show('Bütün xanaları doldurun', true)
    if (newPass.length < 8) return show('Yeni şifrə ən azı 8 simvol olmalıdır', true)
    if (newPass !== repeat) return show('Yeni şifrələr üst-üstə düşmür', true)
    if (newPass === oldPass) return show('Yeni şifrə köhnədən fərqli olmalıdır', true)

    setBusy(true)
    const { error } = await changePassword(email, oldPass, newPass)
    setBusy(false)
    if (error) return show(error.message || 'Şifrə dəyişdirilmədi', true)
    show('Şifrə dəyişdirildi')
    onClose()
  }

  return (
    <Dialog
      title="Şifrəni dəyiş"
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>İmtina</Button>
          <div className="sp" style={{ flex: 1 }} />
          <Button disabled={busy} onClick={submit}>{busy ? 'Yoxlanılır...' : 'Dəyiş'}</Button>
        </>
      }
    >
      <label className="f">
        <span>Cari şifrə</span>
        <Input type="password" autoComplete="current-password" value={oldPass} onChange={(e) => setOldPass(e.target.value)} />
      </label>
      <label className="f">
        <span>Yeni şifrə</span>
        <Input type="password" autoComplete="new-password" placeholder="ən azı 8 simvol" value={newPass} onChange={(e) => setNewPass(e.target.value)} />
      </label>
      <label className="f">
        <span>Yeni şifrə (təkrar)</span>
        <Input type="password" autoComplete="new-password" value={repeat} onChange={(e) => setRepeat(e.target.value)} />
      </label>
      <p className="hint">Şifrəni unutsanız, rəhbər Supabase panelindən sıfırlaya bilər.</p>
    </Dialog>
  )
}
