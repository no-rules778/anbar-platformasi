import { describe, it, expect, vi, beforeEach } from 'vitest'
import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

/* Phase 18 — the application SHELL.

   Phases 1-17 each migrated a page; nobody owned the frame they hang in.
   These tests cover that frame: the page-switch side effects legacy `go()`
   performed (index.html:1495-1512), the responsive rail, and the topbar.

   Every assertion here is about the CLIENT. A rendered rail is a browser
   affordance and is never evidence of a server policy, an RLS decision or a
   grant. */

vi.mock('./api/auth.api', () => ({
  getSession: vi.fn(), fetchProfile: vi.fn(), signOut: vi.fn(), signIn: vi.fn(),
}))
vi.mock('./api/session.api', () => ({
  DEVICE_ID: 'dev_test', registerSession: vi.fn(), unregisterSession: vi.fn(),
  touchSession: vi.fn(), setAccessToken: vi.fn(), releaseDeviceBeacon: vi.fn(),
  listMySessions: vi.fn(), endOtherSessions: vi.fn(), endSession: vi.fn(),
}))
vi.mock('./api/supabase', () => ({
  setRemember: vi.fn(), rememberOn: vi.fn(() => false), savedEmail: vi.fn(() => ''),
  saveEmail: vi.fn(),
  supabase: {
    auth: {
      getSession: vi.fn(async () => ({ data: { session: { access_token: 'tok' } } })),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
    },
  },
}))
vi.mock('./api/auditTotal.api', () => ({ fetchAuditTotal: vi.fn() }))
vi.mock('./api/navCounters.api', () => ({ fetchNavCounts: vi.fn() }))
vi.mock('./store/auditLog.store', () => ({ useAuditLogStore: vi.fn() }))

/* Pages are stubbed: these tests exercise the SHELL, not the screens, and the
   real components would open their own data loads. The Nomenklatura stub
   reports the store's card state, which is what M18-21 turns on. */
vi.mock('./pages/DashboardPage', () => ({ DashboardPage: () => <div>İdarə paneli ekranı</div> }))
vi.mock('./pages/NomenclaturePage', () => ({
  NomenclaturePage: () => {
    const code = useNomenclatureStore((s) => s.cardCode)
    return <div>Nomenklatura ekranı{code ? ` · kartoçka ${code}` : ''}</div>
  },
}))
vi.mock('./pages/ItemGroupsPage', () => ({ ItemGroupsPage: () => <div>Mal qrupları ekranı</div> }))
vi.mock('./pages/NewOperationPage', () => ({ NewOperationPage: () => <div>Yeni əməliyyat ekranı</div> }))
vi.mock('./pages/MovementsPage', () => ({ MovementsPage: () => <div>Mal hərəkəti ekranı</div> }))
vi.mock('./pages/BalancesPage', () => ({
  BalancesPage: ({ onEditItem }: { onEditItem: (c: string) => void }) => (
    <div>Anbar qalıqları ekranı<button onClick={() => onEditItem('0000042')}>Malı redaktə et</button></div>
  ),
}))
vi.mock('./pages/WarehouseOverviewPage', () => ({ WarehouseOverviewPage: () => <div>Anbar və layihələr ekranı</div> }))
vi.mock('./pages/ItemRequestsPage', () => ({ ItemRequestsPage: () => <div>Sorğular ekranı</div> }))
vi.mock('./pages/SerfiyyatPage', () => ({ SerfiyyatPage: () => <div>Sərfiyyat ekranı</div> }))
vi.mock('./pages/ReportsPage', () => ({ ReportsPage: () => <div>Hesabatlar ekranı</div> }))
vi.mock('./pages/FinancePage', () => ({ FinancePage: () => <div>Maliyyə ekranı</div> }))
vi.mock('./pages/ControlsPage', () => ({ ControlsPage: () => <div>Nəzarət ekranı</div> }))
vi.mock('./pages/SettingsPage', () => ({ SettingsPage: () => <div>Parametrlər ekranı</div> }))
vi.mock('./pages/AzpPage', () => ({ AzpPage: () => <div>Azpetrol ekranı</div> }))
vi.mock('./pages/ReferenceDirectoryPage', () => ({ ReferenceDirectoryPage: () => <div>Soraqçalar ekranı</div> }))
vi.mock('./pages/AuditLogPage', () => ({ AuditLogPage: () => <div>Audit ekranı</div> }))

import { getSession, fetchProfile } from './api/auth.api'
import { listMySessions, registerSession } from './api/session.api'
import { fetchAuditTotal } from './api/auditTotal.api'
import { fetchNavCounts } from './api/navCounters.api'
import { useAuditLogStore } from './store/auditLog.store'
import { useAuthStore } from './store/auth.store'
import { useNomenclatureStore } from './store/nomenclature.store'
import App from './App'

beforeEach(() => {
  vi.clearAllMocks()
  /* Neutral default for tests that navigate without inspecting scroll. The
     M18-20 cases below replace it with their own falsifiable spy. */
  vi.stubGlobal('scrollTo', vi.fn())
  useAuthStore.setState(useAuthStore.getInitialState())
  useNomenclatureStore.getState().openCard(null)
  vi.mocked(fetchAuditTotal).mockResolvedValue({ total: 7, ok: true })
  vi.mocked(fetchNavCounts).mockResolvedValue({ items: 120, warehouses: 14 })
  vi.mocked(registerSession).mockResolvedValue({ allowed: true })
  vi.mocked(listMySessions).mockResolvedValue({ limit: 3, devices: [] })
  const loadDirectory = vi.fn().mockResolvedValue(undefined)
  vi.mocked(useAuditLogStore).mockImplementation(
    ((sel: (s: { loadDirectory: () => Promise<void> }) => unknown) => sel({ loadDirectory })) as never,
  )
})

async function signedIn(role = 'admin', name = 'Aysel Məmmədova') {
  vi.mocked(getSession).mockResolvedValue({ user: { id: 'u1', email: 'a@b.com' } } as never)
  vi.mocked(fetchProfile).mockResolvedValue({
    data: { id: 'u1', email: 'a@b.com', name, role, warehouse: '', active: true },
    error: null,
  } as never)
  render(<App />)
  await waitFor(() => expect(screen.getByText('İdarə paneli ekranı')).toBeTruthy())
}

/* M18-21 — `CARD_CODE = ''` (index.html:1510).

   This is the one page-switch side effect that is NOT made redundant by
   React unmounting the page: `cardCode` lives in the Nomenklatura STORE, so
   it outlives the screen. */
describe('App — a page switch clears the open item card (M18-21)', () => {
  it('does not re-open a card left behind on a previous visit', async () => {
    const user = userEvent.setup()
    await signedIn()

    await user.click(screen.getByText((_t, el) => el?.tagName === 'A' && /^Nomenklatura\s*\d*$/.test(el.textContent ?? '')))
    expect(screen.getByText('Nomenklatura ekranı')).toBeTruthy()

    /* Open a card, the way the screen itself would. */
    act(() => useNomenclatureStore.getState().openCard('0000007'))
    await waitFor(() => expect(screen.getByText(/kartoçka 0000007/)).toBeTruthy())

    await user.click(screen.getByText('Mal qrupları'))
    await user.click(screen.getByText((_t, el) => el?.tagName === 'A' && /^Nomenklatura\s*\d*$/.test(el.textContent ?? '')))

    expect(screen.getByText('Nomenklatura ekranı')).toBeTruthy()
    expect(screen.queryByText(/kartoçka/)).toBeNull()
    expect(useNomenclatureStore.getState().cardCode).toBeNull()
  })

  it('CONTROL — the card survives while the page does NOT change', async () => {
    const user = userEvent.setup()
    await signedIn()
    await user.click(screen.getByText((_t, el) => el?.tagName === 'A' && /^Nomenklatura\s*\d*$/.test(el.textContent ?? '')))
    act(() => useNomenclatureStore.getState().openCard('0000007'))
    await waitFor(() => expect(screen.getByText(/kartoçka 0000007/)).toBeTruthy())

    /* Without this the test above would pass even if the clear happened on
       every render rather than on navigation — a wrong-reason pass. */
    expect(screen.getByText(/kartoçka 0000007/)).toBeTruthy()
    expect(useNomenclatureStore.getState().cardCode).toBe('0000007')
  })

  /* The «Malı redaktə et» handoff is the ONE transition that must survive the
     clear, because the card IS its payload. Legacy is exempt for the same
     reason: it navigates first and opens the card second (index.html:1888). */
  it('still delivers the card for the «Malı redaktə et» handoff', async () => {
    const user = userEvent.setup()
    await signedIn()
    await user.click(screen.getByText('Anbar qalıqları'))
    await user.click(screen.getByRole('button', { name: 'Malı redaktə et' }))

    expect(screen.getByText(/Nomenklatura ekranı · kartoçka 0000042/)).toBeTruthy()
    expect(useNomenclatureStore.getState().cardCode).toBe('0000042')
  })
})

/* M18-20 — `window.scrollTo(0,0)` (index.html:1511). */
describe('App — a page switch resets the scroll position (M18-20)', () => {
  it('scrolls to the top on every rail navigation', async () => {
    const user = userEvent.setup()
    const scrollTo = vi.fn()
    vi.stubGlobal('scrollTo', scrollTo)
    await signedIn()

    scrollTo.mockClear()
    await user.click(screen.getByText('Mal hərəkəti'))
    expect(scrollTo).toHaveBeenCalledWith(0, 0)

    scrollTo.mockClear()
    await user.click(screen.getByText('Hesabatlar'))
    expect(scrollTo).toHaveBeenCalledWith(0, 0)
    vi.unstubAllGlobals()
  })

  it('also scrolls for a cross-page handoff, not only a rail click', async () => {
    const user = userEvent.setup()
    const scrollTo = vi.fn()
    vi.stubGlobal('scrollTo', scrollTo)
    await signedIn()
    await user.click(screen.getByText('Anbar qalıqları'))

    /* Routing every switch through one helper is what makes this hold for the
       handoffs too — the failure mode a per-click fix would have left. */
    scrollTo.mockClear()
    await user.click(screen.getByRole('button', { name: 'Malı redaktə et' }))
    expect(scrollTo).toHaveBeenCalledWith(0, 0)
    vi.unstubAllGlobals()
  })
})

/* M18-30 — the responsive rail (index.html:204-211, 1514). */
describe('App — the off-canvas rail below 900px (M18-30)', () => {
  it('renders a burger that toggles the rail open and closed', async () => {
    const user = userEvent.setup()
    await signedIn()

    const rail = document.querySelector('nav.rail') as HTMLElement
    const burger = screen.getByRole('button', { name: 'Menyu' })

    /* Closed is the default: without `.open` the media query keeps the rail
       translated out of view. */
    expect(rail.className).toBe('rail')
    expect(burger.getAttribute('aria-expanded')).toBe('false')

    await user.click(burger)
    expect(rail.className).toBe('rail open')
    expect(burger.getAttribute('aria-expanded')).toBe('true')

    await user.click(burger)
    expect(rail.className).toBe('rail')
  })

  it('closes the drawer when a page is chosen, so the new screen is visible', async () => {
    const user = userEvent.setup()
    await signedIn()
    const rail = document.querySelector('nav.rail') as HTMLElement

    await user.click(screen.getByRole('button', { name: 'Menyu' }))
    expect(rail.className).toBe('rail open')

    /* Legacy does this inside go() (`$('#rail').classList.remove('open')`,
       index.html:1508): on a phone the drawer covers the content it just
       navigated to. */
    await user.click(screen.getByText('Mal hərəkəti'))
    expect(rail.className).toBe('rail')
    expect(screen.getByText('Mal hərəkəti ekranı')).toBeTruthy()
  })
})

/* M18-31 — the topbar presence chip (index.html:243, 1191-1194). */
describe('App — the topbar presence chip (M18-31)', () => {
  it('shows the signed-in user’s initials and first name', async () => {
    await signedIn('admin', 'Aysel Məmmədova')
    const chip = document.querySelector('.presence .chip') as HTMLElement
    expect(chip).toBeTruthy()
    expect(chip.querySelector('i')?.textContent).toBe('AM')
    expect(chip.textContent).toContain('Aysel')
    /* The full name is the tooltip, the first name is the label. */
    expect(chip.getAttribute('title')).toBe('Aysel Məmmədova')
  })

  it('CONTROL — the chip reflects the actual user, not a fixed string', async () => {
    await signedIn('rehber', 'Rəşad Quliyev')
    const chip = document.querySelector('.presence .chip') as HTMLElement
    expect(chip.querySelector('i')?.textContent).toBe('RQ')
    expect(chip.textContent).toContain('Rəşad')
    expect(chip.textContent).not.toContain('Aysel')
  })
})

/* M18-02 — the stale «Miqrasiya» notice. */
describe('App — the migration notice is gone (M18-02)', () => {
  it('no longer tells the user other sections are on the old platform', async () => {
    await signedIn()
    expect(screen.queryByText(/köhnə platformadadır/)).toBeNull()
    expect(screen.queryByText('Miqrasiya')).toBeNull()
    /* CONTROL — the rail still drew; the absence above is not a blank rail. */
    expect(screen.getByText('Hesabatlar')).toBeTruthy()
    expect(screen.getByText('Sistem')).toBeTruthy()
  })
})

/* M18-01 — «Nomenklatura sorğuları» takes its legacy rail position. */
describe('App — rail order matches legacy (M18-01)', () => {
  it('places «Nomenklatura sorğuları» directly under «Nomenklatura»', async () => {
    await signedIn()
    const rail = document.querySelector('nav.rail') as HTMLElement
    const labels = Array.from(rail.children).map((el) => el.textContent?.trim() ?? '')
    const nom = labels.findIndex((l) => l.startsWith('Nomenklatura '))
    /* index.html:256-258 — nom, nreq, grp. */
    expect(labels[nom + 1]).toBe('Nomenklatura sorğuları')
    expect(labels[nom + 2]).toBe('Mal qrupları')
  })
})

/* M18-10 — the badges render the counts they were given. */
describe('App — rail counter badges (M18-10)', () => {
  it('shows the resolved counts on Nomenklatura and Anbar və layihələr', async () => {
    await signedIn()
    const rail = document.querySelector('nav.rail') as HTMLElement
    const labels = Array.from(rail.children).map((el) => el.textContent?.trim() ?? '')
    expect(labels.some((l) => l === 'Nomenklatura 120')).toBe(true)
    expect(labels.some((l) => l === 'Anbar və layihələr 14')).toBe(true)
  })

  it('degrades a failed count to «!», never to 0', async () => {
    vi.mocked(fetchNavCounts).mockResolvedValue({ items: null, warehouses: null })
    await signedIn()
    const rail = document.querySelector('nav.rail') as HTMLElement
    const labels = Array.from(rail.children).map((el) => el.textContent?.trim() ?? '')
    expect(labels.some((l) => l === 'Nomenklatura !')).toBe(true)
    expect(labels.some((l) => l === 'Nomenklatura 0')).toBe(false)
  })

  it('renders a genuine zero as 0, not as a failure', async () => {
    vi.mocked(fetchNavCounts).mockResolvedValue({ items: 0, warehouses: 0 })
    await signedIn()
    const rail = document.querySelector('nav.rail') as HTMLElement
    const labels = Array.from(rail.children).map((el) => el.textContent?.trim() ?? '')
    expect(labels.some((l) => l === 'Nomenklatura 0')).toBe(true)
    expect(labels.some((l) => l === 'Nomenklatura !')).toBe(false)
  })
})
