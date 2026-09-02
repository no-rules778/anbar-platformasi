import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

vi.mock('../api/auth.api', () => ({ changePassword: vi.fn() }))

import { changePassword } from '../api/auth.api'
import { PasswordChangeDialog } from './PasswordChangeDialog'
import { useToastStore } from '../store/toast.store'

const EMAIL = 'admin@x.com'

beforeEach(() => {
  vi.clearAllMocks()
  useToastStore.setState({ messages: [] })
  vi.mocked(changePassword).mockResolvedValue({ error: null })
})

const fields = () => ({
  old: screen.getByLabelText('Cari şifrə'),
  next: screen.getByLabelText('Yeni şifrə'),
  repeat: screen.getByLabelText('Yeni şifrə (təkrar)'),
})
const submit = () => screen.getByRole('button', { name: 'Dəyiş' })
const toasts = () => useToastStore.getState().messages.map((m) => m.text)

async function fill(old: string, next: string, repeat: string) {
  const user = userEvent.setup()
  const f = fields()
  if (old) await user.type(f.old, old)
  if (next) await user.type(f.next, next)
  if (repeat) await user.type(f.repeat, repeat)
  await user.click(submit())
  return user
}

/* Every validation and message is ported from index.html pwChangeDialog()
   (7398-7420). None of them may reach the server. */
describe('PasswordChangeDialog — client validations', () => {
  it('refuses empty fields', async () => {
    render(<PasswordChangeDialog email={EMAIL} onClose={vi.fn()} />)
    await fill('', '', '')

    expect(changePassword).not.toHaveBeenCalled()
    expect(toasts()).toContain('Bütün xanaları doldurun')
  })

  it('refuses when only the old password is filled', async () => {
    render(<PasswordChangeDialog email={EMAIL} onClose={vi.fn()} />)
    await fill('current-pw', '', '')

    expect(changePassword).not.toHaveBeenCalled()
    expect(toasts()).toContain('Bütün xanaları doldurun')
  })

  it('refuses a new password shorter than eight characters', async () => {
    render(<PasswordChangeDialog email={EMAIL} onClose={vi.fn()} />)
    await fill('current-pw', 'short7', 'short7')

    expect(changePassword).not.toHaveBeenCalled()
    expect(toasts()).toContain('Yeni şifrə ən azı 8 simvol olmalıdır')
  })

  it('refuses when the repeat does not match', async () => {
    render(<PasswordChangeDialog email={EMAIL} onClose={vi.fn()} />)
    await fill('current-pw', 'new-password-1', 'new-password-2')

    expect(changePassword).not.toHaveBeenCalled()
    expect(toasts()).toContain('Yeni şifrələr üst-üstə düşmür')
  })

  it('refuses when the new password equals the old one', async () => {
    render(<PasswordChangeDialog email={EMAIL} onClose={vi.fn()} />)
    await fill('same-password', 'same-password', 'same-password')

    expect(changePassword).not.toHaveBeenCalled()
    expect(toasts()).toContain('Yeni şifrə köhnədən fərqli olmalıdır')
  })
})

describe('PasswordChangeDialog — server outcome', () => {
  it('sends the old and new password for this account', async () => {
    render(<PasswordChangeDialog email={EMAIL} onClose={vi.fn()} />)
    await fill('current-pw', 'new-password-1', 'new-password-1')

    await waitFor(() => expect(changePassword).toHaveBeenCalledWith(EMAIL, 'current-pw', 'new-password-1'))
  })

  it('keeps the dialog open and shows the server message when the server rejects', async () => {
    const onClose = vi.fn()
    vi.mocked(changePassword).mockResolvedValue({ error: { message: 'Cari şifrə yanlışdır' } })
    render(<PasswordChangeDialog email={EMAIL} onClose={onClose} />)

    await fill('wrong-pw', 'new-password-1', 'new-password-1')

    await waitFor(() => expect(toasts()).toContain('Cari şifrə yanlışdır'))
    expect(onClose).not.toHaveBeenCalled()
    expect(toasts()).not.toContain('Şifrə dəyişdirildi')
    expect(screen.getByRole('button', { name: 'Dəyiş' })).toBeTruthy()
  })

  it('closes only after a successful change, and says so', async () => {
    const onClose = vi.fn()
    render(<PasswordChangeDialog email={EMAIL} onClose={onClose} />)

    await fill('current-pw', 'new-password-1', 'new-password-1')

    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1))
    expect(toasts()).toContain('Şifrə dəyişdirildi')
  })

  it('does not close when a validation fails', async () => {
    const onClose = vi.fn()
    render(<PasswordChangeDialog email={EMAIL} onClose={onClose} />)

    await fill('current-pw', 'short7', 'short7')

    expect(onClose).not.toHaveBeenCalled()
  })

  it('shows a busy label while the server call is in flight', async () => {
    let release!: (value: { error: null }) => void
    vi.mocked(changePassword).mockReturnValue(new Promise((resolve) => { release = resolve }) as never)
    render(<PasswordChangeDialog email={EMAIL} onClose={vi.fn()} />)

    await fill('current-pw', 'new-password-1', 'new-password-1')

    expect(screen.getByRole('button', { name: 'Yoxlanılır...' })).toBeTruthy()
    release({ error: null })
    await waitFor(() => expect(toasts()).toContain('Şifrə dəyişdirildi'))
  })
})
