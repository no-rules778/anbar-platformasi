import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

vi.mock('../api/supabase', () => ({
  setRemember: vi.fn(),
  rememberOn: vi.fn(() => false),
  savedEmail: vi.fn(() => ''),
  saveEmail: vi.fn(),
}))
vi.mock('../api/auth.api', () => ({
  signIn: vi.fn(),
  signOut: vi.fn(),
  fetchProfile: vi.fn(),
}))
vi.mock('../api/session.api', () => ({
  DEVICE_ID: 'dev_test',
  registerSession: vi.fn(),
}))

import { rememberOn, savedEmail, saveEmail } from '../api/supabase'
import { signIn, fetchProfile } from '../api/auth.api'
import { registerSession } from '../api/session.api'
import { LoginPage } from './LoginPage'
import { useAuthStore } from '../store/auth.store'
import { useToastStore } from '../store/toast.store'

beforeEach(() => {
  vi.clearAllMocks()
  useAuthStore.getState().reset()
  useToastStore.setState({ messages: [] })
  vi.mocked(rememberOn).mockReturnValue(false)
  vi.mocked(savedEmail).mockReturnValue('')
  vi.mocked(signIn).mockResolvedValue({ data: { user: { id: 'u1', email: 'a@b.com' } }, error: null } as never)
  vi.mocked(registerSession).mockResolvedValue({ allowed: true })
  vi.mocked(fetchProfile).mockResolvedValue({
    data: { id: 'u1', email: 'a@b.com', name: 'Admin', role: 'admin', warehouse: '', active: true },
    error: null,
  } as never)
})

const checkbox = () => screen.getByRole('checkbox') as HTMLInputElement
const emailBox = () => screen.getByLabelText('E-poçt ünvanı') as HTMLInputElement
const passwordBox = () => screen.getByLabelText('Şifrə') as HTMLInputElement

/* Original: `$('#g-rem').checked = rememberOn()` (index.html:7554). */
describe('LoginPage — remember-me is restored', () => {
  it('shows the box checked when the preference was saved', () => {
    vi.mocked(rememberOn).mockReturnValue(true)
    render(<LoginPage onLoggedIn={vi.fn()} />)
    expect(checkbox().checked).toBe(true)
  })

  it('shows the box unchecked when it was never saved', () => {
    vi.mocked(rememberOn).mockReturnValue(false)
    render(<LoginPage onLoggedIn={vi.fn()} />)
    expect(checkbox().checked).toBe(false)
  })

  it('prefills the saved e-mail', () => {
    vi.mocked(savedEmail).mockReturnValue('saved@x.com')
    render(<LoginPage onLoggedIn={vi.fn()} />)
    expect(emailBox().value).toBe('saved@x.com')
  })
})

/* Original: `const email = $('#g-name').value.trim()` (index.html:7558). */
describe('LoginPage — e-mail is trimmed', () => {
  it('signs in with the trimmed address', async () => {
    const user = userEvent.setup()
    render(<LoginPage onLoggedIn={vi.fn()} />)

    await user.type(emailBox(), '  a@b.com  ')
    await user.type(passwordBox(), 'pw')
    await user.click(screen.getByRole('button', { name: 'Daxil ol' }))

    await waitFor(() => expect(signIn).toHaveBeenCalledWith('a@b.com', 'pw'))
  })

  it('saves the trimmed address when remember-me is on', async () => {
    vi.mocked(rememberOn).mockReturnValue(true)
    const user = userEvent.setup()
    render(<LoginPage onLoggedIn={vi.fn()} />)

    await user.type(emailBox(), ' a@b.com ')
    await user.type(passwordBox(), 'pw')
    await user.click(screen.getByRole('button', { name: 'Daxil ol' }))

    await waitFor(() => expect(saveEmail).toHaveBeenCalledWith('a@b.com'))
  })

  it('refuses a whitespace-only address instead of calling the server', async () => {
    const user = userEvent.setup()
    render(<LoginPage onLoggedIn={vi.fn()} />)

    await user.type(emailBox(), '   ')
    await user.type(passwordBox(), 'pw')
    await user.click(screen.getByRole('button', { name: 'Daxil ol' }))

    expect(signIn).not.toHaveBeenCalled()
    // The toast host lives in App, so assert the message the page raised.
    expect(useToastStore.getState().messages.map((m) => m.text)).toContain('E-poçt və şifrəni daxil edin')
  })
})
