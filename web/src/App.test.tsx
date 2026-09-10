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
vi.mock('./pages/ReferenceDirectoryPage', () => ({
  ReferenceDirectoryPage: ({ me }: { me: { name: string } }) => <div>Soraqçalar ekranı: {me.name}</div>,
}))
vi.mock('./pages/AuditLogPage', () => ({
  AuditLogPage: () => <div>Audit jurnalı ekranı</div>,
}))
/* Stubbed like the other pages: these tests exercise the RAIL, not the
   screens, and the real components would open their own data loads. */
vi.mock('./pages/NomenclaturePage', () => ({
  NomenclaturePage: ({ onOpenOperation }: { onOpenOperation?: (code: string) => void }) => (
    <div>
      Nomenklatura ekranı
      <button onClick={() => onOpenOperation?.('0000001')}>Bu mal üzrə əməliyyat</button>
    </div>
  ),
}))
vi.mock('./pages/ItemGroupsPage', () => ({
  ItemGroupsPage: ({ me }: { me: { name: string } }) => <div>Mal qrupları ekranı: {me.name}</div>,
}))
/* H-4 — stubbed like the other pages. These tests exercise the RAIL and the
   M5-55 transition's ORDER, not the operation screen itself; the real page
   would open five core reads. `prefill()` is called on the REAL store, so the
   pending prefill is observable here. */
vi.mock('./pages/NewOperationPage', () => ({
  NewOperationPage: ({ me }: { me: { name: string } }) => <div>Yeni əməliyyat ekranı: {me.name}</div>,
}))
vi.mock('./pages/MovementsPage', () => ({
  MovementsPage: ({ onNewOperation }: { onNewOperation: () => void }) => (
    <div>
      Mal hərəkəti ekranı
      <button onClick={onNewOperation}>Yeni əməliyyat (registrdən)</button>
    </div>
  ),
}))
/* M9-01 / M9-04 — stubbed like the other pages: the rail and the two
   card handoffs are under test here, not the balance screen (its own suite
   is BalancesPage.test.tsx). Both handoffs act on REAL stores, so what they
   seed is observable. */
vi.mock('./pages/BalancesPage', () => ({
  BalancesPage: ({ me, onOpenOperation, onEditItem }: {
    me: { name: string }
    onOpenOperation?: (code: string) => void
    onEditItem?: (code: string) => void
  }) => (
    <div>
      Anbar qalıqları ekranı: {me.name}
      <button onClick={() => onOpenOperation?.('0000001')}>Bu mal üzrə əməliyyat (qalıqdan)</button>
      <button onClick={() => onEditItem?.('0000002')}>Malı redaktə et (qalıqdan)</button>
    </div>
  ),
}))
vi.mock('./api/auditTotal.api', () => ({ fetchAuditTotal: vi.fn() }))
vi.mock('./store/auditLog.store', () => ({ useAuditLogStore: vi.fn() }))

import { getSession, fetchProfile, signOut } from './api/auth.api'
import { registerSession, unregisterSession, releaseDeviceBeacon, listMySessions } from './api/session.api'
import { setRemember } from './api/supabase'
import { fetchAuditTotal } from './api/auditTotal.api'
import { useAuditLogStore } from './store/auditLog.store'
import userEvent from '@testing-library/user-event'
import App from './App'
import { useAuthStore } from './store/auth.store'
import { useOperationStore } from './store/operation.store'
import { useNomenclatureStore } from './store/nomenclature.store'

const deferred = <T,>() => {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((r) => { resolve = r })
  return { promise, resolve }
}

beforeEach(() => {
  vi.clearAllMocks()
  useAuthStore.setState(useAuthStore.getInitialState())
  vi.mocked(registerSession).mockResolvedValue({ allowed: true })
  vi.mocked(fetchAuditTotal).mockResolvedValue({ total: 12, ok: true })
  const loadDirectory = vi.fn().mockResolvedValue(undefined)
  vi.mocked(useAuditLogStore).mockImplementation(
    ((selector: (s: { loadDirectory: () => Promise<void> }) => unknown) => selector({ loadDirectory })) as never,
  )
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
    await waitFor(() => expect(screen.getByText('Soraqçalar ekranı: Admin')).toBeTruthy())
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
  await waitFor(() => expect(screen.getByText('Soraqçalar ekranı: Admin User')).toBeTruthy())
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

    expect(screen.getByText('Şifrəni dəyiş', { selector: 'h3' })).toBeTruthy()
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
    await waitFor(() => expect(screen.getByText('Soraqçalar ekranı: Admin User')).toBeTruthy())

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
    await waitFor(() => expect(screen.getByText('Soraqçalar ekranı: Admin User')).toBeTruthy())
    expect(unregisterSession).not.toHaveBeenCalled()

    view.unmount()

    expect(unregisterSession).toHaveBeenCalledTimes(1)
  })
})

/* Phase 4, approved scope: a minimal switch to reach Audit jurnalı — not a
   router, no entries for unmigrated modules. */
describe('App — nav switch between Soraqçalar and Audit jurnalı', () => {
  it('defaults an admin to Soraqçalar, with both nav entries visible', async () => {
    await renderSignedIn()
    expect(screen.getByText('Soraqçalar ekranı: Admin User')).toBeTruthy()
    expect(screen.getByText('Soraqçalar')).toBeTruthy()
    expect(screen.getByText(/Audit jurnalı/)).toBeTruthy()
  })

  it('switches to Audit jurnalı on click, and back', async () => {
    const user = userEvent.setup()
    await renderSignedIn()

    await user.click(screen.getByText(/Audit jurnalı/))
    expect(screen.getByText('Audit jurnalı ekranı')).toBeTruthy()
    expect(screen.queryByText('Soraqçalar ekranı: Admin User')).toBeNull()

    await user.click(screen.getByText('Soraqçalar'))
    expect(screen.getByText('Soraqçalar ekranı: Admin User')).toBeTruthy()
    expect(screen.queryByText('Audit jurnalı ekranı')).toBeNull()
  })

  it('defaults a non-admin to Audit jurnalı — the only page it can reach, since Soraqçalar stays admin-gated', async () => {
    vi.mocked(getSession).mockResolvedValue({ user: { id: 'u2', email: 'r@b.com' } } as never)
    vi.mocked(fetchProfile).mockResolvedValue({
      data: { id: 'u2', email: 'r@b.com', name: 'Rehber User', role: 'rehber', warehouse: '', active: true },
      error: null,
    } as never)
    vi.mocked(listMySessions).mockResolvedValue({ limit: 3, devices: [] })

    render(<App />)

    await waitFor(() => expect(screen.getByText('Audit jurnalı ekranı')).toBeTruthy())
    expect(screen.queryByText(/^Soraqçalar$/)).toBeNull()
    expect(screen.queryByText('Soraqçalar ekranı: Rehber User')).toBeNull()
  })

  it('loads the nav-badge total and the user directory once at boot', async () => {
    await renderSignedIn()
    await waitFor(() => expect(fetchAuditTotal).toHaveBeenCalledTimes(1))
    expect(screen.getByText('12')).toBeTruthy()
  })

  it('shows "…" for the badge before the total resolves, and "!" if it fails', async () => {
    let resolve!: (v: { total: number; ok: boolean }) => void
    vi.mocked(fetchAuditTotal).mockReturnValue(new Promise((r) => { resolve = r }))

    await renderSignedIn()
    expect(screen.getByText('…')).toBeTruthy()

    resolve({ total: 0, ok: false })
    await waitFor(() => expect(screen.getByText('!')).toBeTruthy())
  })
})

/* A03 — the navigation rail itself.

   These are BEHAVIOURAL: the app is rendered and the DOM is queried, rather
   than App.tsx being read as text. The audit asked for exactly that, because a
   source-text assertion cannot see a heading that is rendered twice, nor prove
   that a role gate actually removes a link at runtime. */
describe('App — navigation rail (A03)', () => {
  async function renderAs(role: string, name: string) {
    vi.mocked(getSession).mockResolvedValue({ user: { id: 'u9', email: 'n@b.com' } } as never)
    vi.mocked(fetchProfile).mockResolvedValue({
      data: { id: 'u9', email: 'n@b.com', name, role, warehouse: '', active: true },
      error: null,
    } as never)
    vi.mocked(listMySessions).mockResolvedValue({ limit: 3, devices: [] })
    render(<App />)
    await waitFor(() => expect(screen.getByText('Mal qrupları')).toBeTruthy())
  }

  it('renders «Bazalar» exactly once for an admin', async () => {
    await renderAs('admin', 'Admin User')
    expect(screen.getAllByText('Bazalar')).toHaveLength(1)
  })

  it('renders «Bazalar» exactly once for a non-admin', async () => {
    await renderAs('rehber', 'Rehber User')
    expect(screen.getAllByText('Bazalar')).toHaveLength(1)
  })

  it('groups Nomenklatura, Mal qrupları and Soraqçalar under that one heading', async () => {
    await renderAs('admin', 'Admin User')
    const rail = document.querySelector('nav.rail') as HTMLElement
    const labels = Array.from(rail.children).map((el) => el.textContent?.trim())
    const bazalar = labels.indexOf('Bazalar')
    const sistem = labels.indexOf('Sistem')

    // Everything between the two headings belongs to the Bazalar group, in the
    // original's order (index.html:255-261).
    expect(labels.slice(bazalar + 1, sistem)).toEqual([
      'Nomenklatura', 'Mal qrupları', 'Soraqçalar',
    ])
  })

  it('keeps Soraqçalar admin-gated while leaving the other two ungated', async () => {
    await renderAs('rehber', 'Rehber User')
    expect(screen.getByText('Nomenklatura')).toBeTruthy()
    expect(screen.getByText('Mal qrupları')).toBeTruthy()
    expect(screen.queryByText(/^Soraqçalar$/)).toBeNull()
  })

  it('navigates to Mal qrupları for an admin', async () => {
    const user = userEvent.setup()
    await renderAs('admin', 'Admin User')
    await user.click(screen.getByText('Mal qrupları'))
    expect(screen.getByText('Mal qrupları ekranı: Admin User')).toBeTruthy()
  })

  it('navigates to Mal qrupları for a non-admin too', async () => {
    const user = userEvent.setup()
    await renderAs('rehber', 'Rehber User')
    await user.click(screen.getByText('Mal qrupları'))
    expect(screen.getByText('Mal qrupları ekranı: Rehber User')).toBeTruthy()
  })

  it('marks only the active entry', async () => {
    const user = userEvent.setup()
    await renderAs('admin', 'Admin User')
    await user.click(screen.getByText('Mal qrupları'))

    const rail = document.querySelector('nav.rail') as HTMLElement
    const on = Array.from(rail.querySelectorAll('a.on')).map((a) => a.textContent?.trim())
    expect(on).toEqual(['Mal qrupları'])
  })
})


/* ===== H-4 / T7 — «Yeni əməliyyat» in the rail, and the M5-55 transition ===== */
describe('App — «Yeni əməliyyat» rail entry (M7-02)', () => {
  async function renderAs(role: string, name: string) {
    vi.mocked(getSession).mockResolvedValue({ user: { id: 'u9', email: 'n@b.com' } } as never)
    vi.mocked(fetchProfile).mockResolvedValue({
      data: { id: 'u9', email: 'n@b.com', name, role, warehouse: '', active: true },
      error: null,
    } as never)
    vi.mocked(listMySessions).mockResolvedValue({ limit: 3, devices: [] })
    render(<App />)
    await waitFor(() => expect(screen.getByText('Mal qrupları')).toBeTruthy())
  }

  it('places «Yeni əməliyyat» under «Əməliyyat», ABOVE the «Bazalar» group', async () => {
    await renderAs('admin', 'Admin User')
    const rail = document.querySelector('nav.rail') as HTMLElement
    const labels = Array.from(rail.children).map((el) => el.textContent?.trim())
    expect(labels.indexOf('Əməliyyat')).toBe(0)
    expect(labels[1]).toBe('Yeni əməliyyat')
    expect(labels.indexOf('Əməliyyat')).toBeLessThan(labels.indexOf('Bazalar'))
  })

  it('renders the entry for an ADMIN and navigates to the screen', async () => {
    const user = userEvent.setup()
    await renderAs('admin', 'Admin User')
    await user.click(screen.getByText('Yeni əməliyyat'))
    expect(screen.getByText('Yeni əməliyyat ekranı: Admin User')).toBeTruthy()
  })

  it('renders the entry for a REHBER too — M7-02, the link carries no role gate', async () => {
    const user = userEvent.setup()
    await renderAs('rehber', 'Rehber User')
    expect(screen.getByText('Yeni əməliyyat')).toBeTruthy()
    await user.click(screen.getByText('Yeni əməliyyat'))
    expect(screen.getByText('Yeni əməliyyat ekranı: Rehber User')).toBeTruthy()
  })

  it('renders the entry for an ANBARDAR', async () => {
    const user = userEvent.setup()
    await renderAs('anbardar', 'Anbardar User')
    await user.click(screen.getByText('Yeni əməliyyat'))
    expect(screen.getByText('Yeni əməliyyat ekranı: Anbardar User')).toBeTruthy()
  })

  it('marks only that entry active once opened', async () => {
    const user = userEvent.setup()
    await renderAs('admin', 'Admin User')
    await user.click(screen.getByText('Yeni əməliyyat'))
    const rail = document.querySelector('nav.rail') as HTMLElement
    const on = Array.from(rail.querySelectorAll('a.on')).map((a) => a.textContent?.trim())
    expect(on).toEqual(['Yeni əməliyyat'])
  })

  /* M5-55 — the transition PREFILLS and then navigates. Navigation alone is
     explicitly not parity, so both halves are asserted. */
  it('«Bu mal üzrə əməliyyat» prefills the store AND navigates', async () => {
    const user = userEvent.setup()
    useOperationStore.setState({ pick: null, pendingPrefill: null })
    await renderAs('admin', 'Admin User')
    await user.click(screen.getByText('Nomenklatura'))
    await user.click(screen.getByRole('button', { name: 'Bu mal üzrə əməliyyat' }))
    expect(screen.getByText('Yeni əməliyyat ekranı: Admin User')).toBeTruthy()
    expect(useOperationStore.getState().pick).toBe('0000001')
    /* The prefill survives the page load — it is cleared only when applied. */
    expect(useOperationStore.getState().pendingPrefill).toBe('0000001')
  })

  it('the transition works for a non-admin as well', async () => {
    const user = userEvent.setup()
    useOperationStore.setState({ pick: null, pendingPrefill: null })
    await renderAs('rehber', 'Rehber User')
    await user.click(screen.getByText('Nomenklatura'))
    await user.click(screen.getByRole('button', { name: 'Bu mal üzrə əməliyyat' }))
    expect(screen.getByText('Yeni əməliyyat ekranı: Rehber User')).toBeTruthy()
    expect(useOperationStore.getState().pick).toBe('0000001')
  })
})


/* M8-01 / M8-41 — the «Mal hərəkəti» rail entry (Phase 8, I-2).

   Two things are asserted: its POSITION, which is parity with
   index.html:251-253, and the absence of any role gate. */
describe('App — «Mal hərəkəti» rail entry', () => {
  /** Rail links in DOM order, by their visible text. */
  function railLinks(): string[] {
    return Array.from(document.querySelectorAll('nav.rail a'))
      .map((a) => (a.textContent ?? '').trim())
  }

  async function renderAs(role: string, warehouse = '') {
    vi.mocked(getSession).mockResolvedValue({ user: { id: 'u1', email: 'a@b.com' } } as never)
    vi.mocked(fetchProfile).mockResolvedValue({
      data: { id: 'u1', email: 'a@b.com', name: 'Test User', role, warehouse, active: true },
      error: null,
    } as never)
    vi.mocked(listMySessions).mockResolvedValue({ limit: 3, devices: [] })
    render(<App />)
    await waitFor(() => expect(document.querySelector('nav.rail')).toBeTruthy())
  }

  /* MUTATION: appending the entry to the end of the group, or placing it
     before «Yeni əməliyyat». The original order is «Yeni əməliyyat» first,
     «Mal hərəkəti» second (index.html:252-253). */
  it('sits directly after «Yeni əməliyyat» in the Əməliyyat group', async () => {
    await renderAs('admin')
    const links = railLinks()
    const op = links.indexOf('Yeni əməliyyat')
    const mov = links.indexOf('Mal hərəkəti')
    expect(op).toBeGreaterThanOrEqual(0)
    expect(mov).toBe(op + 1)
  })

  /* M8-41 — the screen is UNGATED. The legacy `<a data-p="mov">` has neither
     an id nor a display:none rule, and go() has no `mov` branch. What an
     anbardar SEES on the screen is decided by RLS, not by this link.

     MUTATION: wrapping the entry in an isAdmin(me) guard, as «Soraqçalar»
     legitimately is. That would lock every non-admin out of a screen the
     original leaves open. */
  it.each(['admin', 'rehber', 'anbardar'])('is present for role %s', async (role) => {
    await renderAs(role, role === 'anbardar' ? 'Astara' : '')
    expect(railLinks()).toContain('Mal hərəkəti')
  })

  it('opens the movements screen when clicked', async () => {
    const user = userEvent.setup()
    await renderAs('admin')
    await user.click(screen.getByText('Mal hərəkəti'))
    expect(screen.getByText('Mal hərəkəti ekranı')).toBeTruthy()
  })

  /* M8-13 — «Yeni əməliyyat» from the registry header is a PLAIN page switch.
     It must land on the operation screen without seeding a prefill, unlike
     the Nomenklatura handoff which deliberately does. */
  it('the registry&apos;s «Yeni əməliyyat» navigates to the operation screen', async () => {
    const user = userEvent.setup()
    await renderAs('admin')
    await user.click(screen.getByText('Mal hərəkəti'))
    await user.click(screen.getByRole('button', { name: 'Yeni əməliyyat (registrdən)' }))
    expect(screen.getByText(/Yeni əməliyyat ekranı/)).toBeTruthy()
  })
})

/* M9-01 / M9-04 — «Anbar qalıqları» in the rail.

   Behavioural, like the A03 block: the app is rendered and the DOM queried.
   The original rail lists the entry THIRD in «Əməliyyat» (index.html:254),
   and go() has no `bal` branch (1495-1503), so every role reaches it. */
describe('App — «Anbar qalıqları» rail entry (M9-01, M9-04)', () => {
  function railLinks(): string[] {
    return Array.from(document.querySelectorAll('nav.rail a'))
      .map((a) => (a.textContent ?? '').trim())
  }

  async function renderAs(role: string, warehouse = '') {
    vi.mocked(getSession).mockResolvedValue({ user: { id: 'u1', email: 'a@b.com' } } as never)
    vi.mocked(fetchProfile).mockResolvedValue({
      data: { id: 'u1', email: 'a@b.com', name: 'Test User', role, warehouse, active: true },
      error: null,
    } as never)
    vi.mocked(listMySessions).mockResolvedValue({ limit: 3, devices: [] })
    render(<App />)
    await waitFor(() => expect(document.querySelector('nav.rail')).toBeTruthy())
  }

  beforeEach(() => {
    useOperationStore.setState(useOperationStore.getInitialState())
    useNomenclatureStore.setState(useNomenclatureStore.getInitialState())
  })

  /* MUTATION: placing the entry before «Mal hərəkəti», or in another group.
     The original order is «Yeni əməliyyat», «Mal hərəkəti», «Anbar qalıqları»
     (index.html:252-254). */
  it('is the THIRD entry of the Əməliyyat group, directly after «Mal hərəkəti»', async () => {
    await renderAs('admin')
    const links = railLinks()
    const op = links.indexOf('Yeni əməliyyat')
    const mov = links.indexOf('Mal hərəkəti')
    const bal = links.indexOf('Anbar qalıqları')
    expect(op).toBeGreaterThanOrEqual(0)
    expect(mov).toBe(op + 1)
    expect(bal).toBe(mov + 1)
  })

  it('sits ABOVE the «Bazalar» group', async () => {
    await renderAs('admin')
    const nav = document.querySelector('nav.rail')!
    const html = nav.innerHTML
    expect(html.indexOf('Anbar qalıqları')).toBeLessThan(html.indexOf('Bazalar'))
  })

  /* M9-04 — no role gate. MUTATION: wrapping the entry in isAdmin(me). */
  it.each(['admin', 'rehber', 'anbardar'])('is present for role %s', async (role) => {
    await renderAs(role, role === 'anbardar' ? 'Astara' : '')
    expect(railLinks()).toContain('Anbar qalıqları')
  })

  it('opens the balance screen when clicked, and marks only that entry active', async () => {
    const user = userEvent.setup()
    await renderAs('admin')
    await user.click(screen.getByText('Anbar qalıqları'))
    expect(screen.getByText(/Anbar qalıqları ekranı/)).toBeTruthy()
    const active = Array.from(document.querySelectorAll('nav.rail a.on')).map((a) => a.textContent?.trim())
    expect(active).toEqual(['Anbar qalıqları'])
  })

  it('a non-admin opens it too', async () => {
    const user = userEvent.setup()
    await renderAs('rehber')
    await user.click(screen.getByText('Anbar qalıqları'))
    expect(screen.getByText(/Anbar qalıqları ekranı/)).toBeTruthy()
  })

  /* M5-55 precedent — the card's «Bu mal üzrə əməliyyat» seeds the prefill
     FIRST and navigates SECOND. MUTATION: navigating without prefilling. */
  it('«Bu mal üzrə əməliyyat» from the item card prefills the operation store AND navigates', async () => {
    const user = userEvent.setup()
    await renderAs('admin')
    await user.click(screen.getByText('Anbar qalıqları'))
    await user.click(screen.getByRole('button', { name: 'Bu mal üzrə əməliyyat (qalıqdan)' }))
    expect(screen.getByText(/Yeni əməliyyat ekranı/)).toBeTruthy()
    expect(useOperationStore.getState().pendingPrefill).toBe('0000001')
  })

  /* «Malı redaktə et» — the item form lives on the Nomenklatura screen; the
     card is opened THERE first, then the rail switches. */
  it('«Malı redaktə et» from the item card opens that card on Nomenklatura and navigates', async () => {
    const user = userEvent.setup()
    await renderAs('admin')
    await user.click(screen.getByText('Anbar qalıqları'))
    await user.click(screen.getByRole('button', { name: 'Malı redaktə et (qalıqdan)' }))
    expect(screen.getByText(/Nomenklatura ekranı/)).toBeTruthy()
    expect(useNomenclatureStore.getState().cardCode).toBe('0000002')
  })
})
