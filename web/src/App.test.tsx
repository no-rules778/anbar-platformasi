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
}))
vi.mock('./api/supabase', () => ({
  setRemember: vi.fn(),
  rememberOn: vi.fn(() => false),
  savedEmail: vi.fn(() => ''),
  saveEmail: vi.fn(),
}))
vi.mock('./pages/WarehousesPage', () => ({
  WarehousesPage: ({ me }: { me: { name: string } }) => <div>Anbarlar ekranı: {me.name}</div>,
}))

import { getSession, fetchProfile } from './api/auth.api'
import { registerSession } from './api/session.api'
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
