import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'

vi.mock('./api/auth.api', () => ({
  getSession: vi.fn(),
  fetchProfile: vi.fn(),
  signOut: vi.fn(),
  signIn: vi.fn(),
}))
vi.mock('./api/session.api', () => ({
  DEVICE_ID: 'dev_test',
  registerSession: vi.fn(),
  unregisterSession: vi.fn(),
  touchSession: vi.fn(),
  setAccessToken: vi.fn(),
  releaseDeviceBeacon: vi.fn(),
  listMySessions: vi.fn(),
  endOtherSessions: vi.fn(),
  endSession: vi.fn(),
}))
vi.mock('./api/supabase', () => ({
  setRemember: vi.fn(),
  rememberOn: vi.fn(() => false),
  savedEmail: vi.fn(() => ''),
  saveEmail: vi.fn(),
  supabase: {
    auth: {
      getSession: vi.fn(async () => ({ data: { session: { access_token: 'tok' } } })),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
    },
  },
}))
vi.mock('./pages/WarehousesPage', () => ({
  WarehousesPage: ({ me }: { me: { name: string } }) => <div>Anbarlar ekranı: {me.name}</div>,
}))

import { getSession, fetchProfile, signOut } from './api/auth.api'
import { registerSession, unregisterSession, releaseDeviceBeacon, listMySessions } from './api/session.api'
import { setRemember } from './api/supabase'
import userEvent from '@testing-library/user-event'
import App from './App'
import { useAuthStore } from './store/auth.store'

const deferred = <T,>() => {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((r) => { resolve = r })
  return { promise, resolve }
}

beforeEach(() => {
  vi.clearAllMocks()
  useAuthStore.setState(useAuthStore.getInitialState())
  vi.mocked(registerSession).mockResolvedValue({ allowed: true })
})

/* The original never shows an interactive gate while a stored session is being
   restored — it disables it and prints «Sessiya bərpa olunur...»
   (index.html:7589). */
describe('App — session restore never flashes the login form', () => {
  it('shows the restoring state on the very first paint, not the login form', () => {
    const pending = deferred<unknown>()
    vi.mocked(getSession).mockReturnValue(pending.promise as never)

    render(<App />)

    expect(screen.getByText('Sessiya bərpa olunur...')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Daxil ol' })).toBeNull()
    expect(screen.queryByRole('textbox')).toBeNull()
  })

  it('keeps the form hidden for the whole restore, then shows the app when a session is found', async () => {
    vi.mocked(getSession).mockResolvedValue({ user: { id: 'u1', email: 'a@b.com' } } as never)
    vi.mocked(fetchProfile).mockResolvedValue({
      data: { id: 'u1', email: 'a@b.com', name: 'Admin', role: 'admin', warehouse: '', active: true },
      error: null,
    } as never)

    render(<App />)

    expect(screen.queryByRole('button', { name: 'Daxil ol' })).toBeNull()
    await waitFor(() => expect(screen.getByText('Anbarlar ekranı: Admin')).toBeTruthy())
    expect(screen.queryByRole('button', { name: 'Daxil ol' })).toBeNull()
  })

  it('falls back to the login form once the restore finds no session', async () => {
    vi.mocked(getSession).mockResolvedValue(null as never)

    render(<App />)

    expect(screen.getByText('Sessiya bərpa olunur...')).toBeTruthy()
    await waitFor(() => expect(screen.getByRole('button', { name: 'Daxil ol' })).toBeTruthy())
    expect(screen.queryByText('Sessiya bərpa olunur...')).toBeNull()
    expect(registerSession).not.toHaveBeenCalled()
  })
})

async function renderSignedIn() {
  vi.mocked(getSession).mockResolvedValue({ user: { id: 'u1', email: 'a@b.com' } } as never)
  vi.mocked(fetchProfile).mockResolvedValue({
    data: { id: 'u1', email: 'a@b.com', name: 'Admin User', role: 'admin', warehouse: '', active: true },
    error: null,
  } as never)
  vi.mocked(listMySessions).mockResolvedValue({ limit: 3, devices: [] })
  render(<App />)
  await waitFor(() => expect(screen.getByText('Anbarlar ekranı: Admin User')).toBeTruthy())
}

/* F1: without this the user cannot sign out, free a device or change a
   password at all — the original offers all three (index.html:7422-7449). */
describe('App — session window and logout', () => {
  it('exposes a user chip that opens the session window', async () => {
    const user = userEvent.setup()
    await renderSignedIn()

    await user.click(screen.getByRole('button', { name: /Admin · Admin/ }))

    expect(screen.getByText('Sessiya')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Çıxış' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Şifrəni dəyiş' })).toBeTruthy()
    expect(screen.getByText('Aktiv cihazlar')).toBeTruthy()
  })

  it('logout frees this device, forgets remember-me, signs out and returns to the login form', async () => {
    const user = userEvent.setup()
    await renderSignedIn()

    await user.click(screen.getByRole('button', { name: /Admin · Admin/ }))
    await user.click(screen.getByRole('button', { name: 'Çıxış' }))

    await waitFor(() => expect(unregisterSession).toHaveBeenCalled())
    expect(setRemember).toHaveBeenCalledWith(false)
    expect(signOut).toHaveBeenCalled()
    await waitFor(() => expect(screen.getByRole('button', { name: 'Daxil ol' })).toBeTruthy())
  })

  it('opens the password dialog from the session window', async () => {
    const user = userEvent.setup()
    await renderSignedIn()

    await user.click(screen.getByRole('button', { name: /Admin · Admin/ }))
    await user.click(screen.getByRole('button', { name: 'Şifrəni dəyiş' }))

    expect(screen.getByText('Şifrəni dəyiş', { selector: 'h2' })).toBeTruthy()
    expect(screen.getByLabelText('Cari şifrə')).toBeTruthy()
  })
})

/* F2: closing the tab must release this device's slot, or a 1-device role is
   locked out until the 3-minute server cutoff (index.html:7380-7393). */
describe('App — device release on tab close', () => {
  it('sends the beacon on pagehide while signed in', async () => {
    await renderSignedIn()

    window.dispatchEvent(new Event('pagehide'))

    expect(releaseDeviceBeacon).toHaveBeenCalledTimes(1)
  })

  it('does not send the beacon when nobody is signed in', async () => {
    vi.mocked(getSession).mockResolvedValue(null as never)
    render(<App />)
    await waitFor(() => expect(screen.getByRole('button', { name: 'Daxil ol' })).toBeTruthy())

    window.dispatchEvent(new Event('pagehide'))

    expect(releaseDeviceBeacon).not.toHaveBeenCalled()
  })
})

/* One logout must close this device exactly once. The old shape — an effect
   whose cleanup ran on every ready → idle transition, plus an explicit call in
   logout() — sent the RPC twice. */
describe('App — logout releases the device exactly once', () => {
  it('calls unregisterSession once per logout action', async () => {
    const user = userEvent.setup()
    await renderSignedIn()

    await user.click(screen.getByRole('button', { name: /Admin · Admin/ }))
    await user.click(screen.getByRole('button', { name: 'Çıxış' }))

    await waitFor(() => expect(screen.getByRole('button', { name: 'Daxil ol' })).toBeTruthy())
    expect(unregisterSession).toHaveBeenCalledTimes(1)
  })

  it('releases the device before signing out of Supabase', async () => {
    const order: string[] = []
    vi.mocked(unregisterSession).mockImplementation(async () => { order.push('unregister') })
    vi.mocked(signOut).mockImplementation(async () => { order.push('signOut') })

    const user = userEvent.setup()
    await renderSignedIn()
    await user.click(screen.getByRole('button', { name: /Admin · Admin/ }))
    await user.click(screen.getByRole('button', { name: 'Çıxış' }))

    await waitFor(() => expect(order).toEqual(['unregister', 'signOut']))
  })

  it('does not release again when the app unmounts after a logout', async () => {
    const user = userEvent.setup()
    vi.mocked(getSession).mockResolvedValue({ user: { id: 'u1', email: 'a@b.com' } } as never)
    vi.mocked(fetchProfile).mockResolvedValue({
      data: { id: 'u1', email: 'a@b.com', name: 'Admin User', role: 'admin', warehouse: '', active: true },
      error: null,
    } as never)
    vi.mocked(listMySessions).mockResolvedValue({ limit: 3, devices: [] })
    const view = render(<App />)
    await waitFor(() => expect(screen.getByText('Anbarlar ekranı: Admin User')).toBeTruthy())

    await user.click(screen.getByRole('button', { name: /Admin · Admin/ }))
    await user.click(screen.getByRole('button', { name: 'Çıxış' }))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Daxil ol' })).toBeTruthy())

    view.unmount()

    expect(unregisterSession).toHaveBeenCalledTimes(1)
  })

  it('still performs one best-effort release when the app unmounts while signed in', async () => {
    vi.mocked(getSession).mockResolvedValue({ user: { id: 'u1', email: 'a@b.com' } } as never)
    vi.mocked(fetchProfile).mockResolvedValue({
      data: { id: 'u1', email: 'a@b.com', name: 'Admin User', role: 'admin', warehouse: '', active: true },
      error: null,
    } as never)
    vi.mocked(listMySessions).mockResolvedValue({ limit: 3, devices: [] })

    const view = render(<App />)
    await waitFor(() => expect(screen.getByText('Anbarlar ekranı: Admin User')).toBeTruthy())
    expect(unregisterSession).not.toHaveBeenCalled()

    view.unmount()

    expect(unregisterSession).toHaveBeenCalledTimes(1)
  })
})
