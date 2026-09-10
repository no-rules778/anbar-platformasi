import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

vi.mock('../api/auditLog.api', async (orig) => ({
  ...(await orig<typeof import('../api/auditLog.api')>()),
  fetchAuditLog: vi.fn(),
}))
vi.mock('../api/userDirectory.api', () => ({ fetchUserDirectory: vi.fn() }))

import { fetchAuditLog, EMPTY_FILTERS } from '../api/auditLog.api'
import { fetchUserDirectory } from '../api/userDirectory.api'
import { AuditLogPage } from './AuditLogPage'
import { useAuditLogStore } from '../store/auditLog.store'

const row = (over: Record<string, unknown> = {}) => ({
  ts: '2026-03-05T10:00:00Z',
  user_id: 'u-1',
  table_name: 'partners',
  action: 'UPDATE',
  record_id: 'p-9',
  old_values: { name: 'Old' },
  new_values: { name: 'New' },
  reason: null,
  ...over,
})

beforeEach(() => {
  vi.clearAllMocks()
  useAuditLogStore.setState({
    filters: EMPTY_FILTERS,
    rows: [],
    total: 0,
    loading: false,
    error: null,
    errorKind: null,
    emails: new Map(),
    directoryError: false,
  })
  vi.mocked(fetchAuditLog).mockResolvedValue({ rows: [row()], total: 1, error: null, errorKind: null })
  vi.mocked(fetchUserDirectory).mockResolvedValue({ emails: new Map([['u-1', 'a@x.com']]), ok: true })
  /* App loads the directory once at authenticated boot (M4-17); the page
     itself must never fetch it (M4-18c). Seed it here the way boot would. */
  useAuditLogStore.setState({ emails: new Map([['u-1', 'a@x.com']]), directoryError: false })
})

const me = { name: 'Admin User' }

async function renderPage() {
  const view = render(<AuditLogPage me={me} />)
  await waitFor(() => expect(fetchAuditLog).toHaveBeenCalled())
  return view
}

describe('AuditLogPage — rendering', () => {
  it('loads audit rows on mount, but not the user directory', async () => {
    await renderPage()
    expect(fetchAuditLog).toHaveBeenCalledTimes(1)
    /* The directory is boot-scoped (M4-17/M4-18c). */
    expect(fetchUserDirectory).not.toHaveBeenCalled()
  })

  it('renders the actor email, action label, object label, record_id, summary and reason', async () => {
    await renderPage()
    const table = await screen.findByRole('table')
    const cell = within(table)
    /* «a@x.com» also appears as an actor-filter option, so scope to the table. */
    expect(cell.getByText('a@x.com')).toBeTruthy()
    expect(cell.getByText('düzəliş')).toBeTruthy()
    expect(cell.getByText('Kontragent')).toBeTruthy()
    expect(cell.getByText('p-9')).toBeTruthy()
    expect(cell.getByText('Dəyişdi: name')).toBeTruthy()
    expect(cell.getByText('—')).toBeTruthy() // null reason
  })

  it('falls back to the raw id when the actor has no resolved email', async () => {
    vi.mocked(fetchAuditLog).mockResolvedValue({
      rows: [row({ user_id: 'unknown-id' })], total: 1, error: null, errorKind: null,
    })
    await renderPage()
    expect(await screen.findByText('unknown-id')).toBeTruthy()
  })

  it('shows «Sistem/naməlum» for a null user_id', async () => {
    vi.mocked(fetchAuditLog).mockResolvedValue({
      rows: [row({ user_id: null })], total: 1, error: null, errorKind: null,
    })
    await renderPage()
    /* «Sistem/naməlum» also appears as an actor-filter option; scope to the table. */
    const table = await screen.findByRole('table')
    expect(within(table).getByText('Sistem/naməlum')).toBeTruthy()
  })

  it('renders the raw table_name and action when they are unmapped', async () => {
    vi.mocked(fetchAuditLog).mockResolvedValue({
      rows: [row({ table_name: 'unknown_table', action: 'TRUNCATE' })], total: 1, error: null, errorKind: null,
    })
    await renderPage()
    expect(await screen.findByText('unknown_table')).toBeTruthy()
    expect(screen.getByText('TRUNCATE')).toBeTruthy()
  })

  it('shows the DELETE action tag class', async () => {
    vi.mocked(fetchAuditLog).mockResolvedValue({
      rows: [row({ action: 'DELETE' })], total: 1, error: null, errorKind: null,
    })
    await renderPage()
    /* «silinmə» also appears as an action-filter option; scope to the table. */
    const table = await screen.findByRole('table')
    const tag = within(table).getByText('silinmə')
    expect(tag.className).toContain('t-rm')
  })

  it('renders — for a null ts and a null record_id', async () => {
    vi.mocked(fetchAuditLog).mockResolvedValue({
      rows: [row({ ts: null, record_id: null })], total: 1, error: null, errorKind: null,
    })
    await renderPage()
    /* Two em dashes: one for the missing time, one for record_id. */
    expect(await screen.findAllByText('—')).not.toHaveLength(0)
  })
})

describe('AuditLogPage — filters call setFilters/reset on the store', () => {
  it('changing the object filter reloads with the new table', async () => {
    const user = userEvent.setup()
    await renderPage()
    await user.selectOptions(screen.getByLabelText('Obyekt'), 'movements')
    await waitFor(() => expect(fetchAuditLog).toHaveBeenLastCalledWith(
      expect.objectContaining({ table: 'movements', page: 0 }),
    ))
  })

  it('changing the action filter reloads with the new action', async () => {
    const user = userEvent.setup()
    await renderPage()
    await user.selectOptions(screen.getByLabelText('Əməliyyat'), 'DELETE')
    await waitFor(() => expect(fetchAuditLog).toHaveBeenLastCalledWith(
      expect.objectContaining({ action: 'DELETE', page: 0 }),
    ))
  })

  it('selecting «Sistem/naməlum» sends the __null sentinel', async () => {
    const user = userEvent.setup()
    await renderPage()
    await user.selectOptions(screen.getByLabelText('İstifadəçi'), '__null')
    await waitFor(() => expect(fetchAuditLog).toHaveBeenLastCalledWith(
      expect.objectContaining({ actor: '__null', page: 0 }),
    ))
  })

  it('lists resolved actors sorted by email', async () => {
    useAuditLogStore.setState({
      emails: new Map([['u-2', 'zed@x.com'], ['u-3', 'amy@x.com']]),
      directoryError: false,
    })
    await renderPage()
    const select = await screen.findByLabelText('İstifadəçi') as HTMLSelectElement
    const options = Array.from(select.options).map((o) => o.textContent)
    expect(options.indexOf('amy@x.com')).toBeLessThan(options.indexOf('zed@x.com'))
  })

  it('date filters reload with gte/lte-mapped values', async () => {
    const user = userEvent.setup()
    await renderPage()
    const d1 = screen.getByLabelText('Başlanğıc tarix') as HTMLInputElement
    await user.type(d1, '2026-01-15')
    await waitFor(() => expect(fetchAuditLog).toHaveBeenLastCalledWith(
      expect.objectContaining({ d1: '2026-01-15', page: 0 }),
    ))
  })

  it('«Sıfırla» clears every filter', async () => {
    const user = userEvent.setup()
    await renderPage()
    await user.selectOptions(screen.getByLabelText('Obyekt'), 'partners')
    await waitFor(() => expect(fetchAuditLog).toHaveBeenLastCalledWith(expect.objectContaining({ table: 'partners' })))

    await user.click(screen.getByRole('button', { name: 'Sıfırla' }))
    await waitFor(() => expect(fetchAuditLog).toHaveBeenLastCalledWith(EMPTY_FILTERS))
  })
})

describe('AuditLogPage — pagination', () => {
  it('disables «Əvvəlki» on the first page and «Növbəti» on the last', async () => {
    vi.mocked(fetchAuditLog).mockResolvedValue({ rows: [row()], total: 1, error: null, errorKind: null })
    await renderPage()
    expect((screen.getByRole('button', { name: '← Əvvəlki' }) as HTMLButtonElement).disabled).toBe(true)
    expect((screen.getByRole('button', { name: 'Növbəti →' }) as HTMLButtonElement).disabled).toBe(true)
  })

  it('enables «Növbəti» when more rows exist beyond this page', async () => {
    vi.mocked(fetchAuditLog).mockResolvedValue({
      rows: Array.from({ length: 50 }, (_, i) => row({ record_id: String(i) })), total: 120, error: null, errorKind: null,
    })
    await renderPage()
    expect((screen.getByRole('button', { name: 'Növbəti →' }) as HTMLButtonElement).disabled).toBe(false)
  })

  it('advancing the page calls fetchAuditLog with page 1', async () => {
    const user = userEvent.setup()
    vi.mocked(fetchAuditLog).mockResolvedValue({
      rows: Array.from({ length: 50 }, (_, i) => row({ record_id: String(i) })), total: 120, error: null, errorKind: null,
    })
    await renderPage()
    await user.click(screen.getByRole('button', { name: 'Növbəti →' }))
    await waitFor(() => expect(fetchAuditLog).toHaveBeenLastCalledWith(expect.objectContaining({ page: 1 })))
  })
})

describe('AuditLogPage — error and empty states', () => {
  it('shows «İcazə yoxdur» for a permission-classified error', async () => {
    vi.mocked(fetchAuditLog).mockResolvedValue({ rows: [], total: 0, error: 'permission denied', errorKind: 'permission' })
    await renderPage()
    expect(await screen.findByText('İcazə yoxdur')).toBeTruthy()
    expect(screen.getByText('permission denied')).toBeTruthy()
  })

  it('shows «Yükləmə xətası» for a load-classified error', async () => {
    vi.mocked(fetchAuditLog).mockResolvedValue({ rows: [], total: 0, error: 'network down', errorKind: 'load' })
    await renderPage()
    expect(await screen.findByText('Yükləmə xətası')).toBeTruthy()
  })

  it('shows the empty-filter message when no rows match', async () => {
    vi.mocked(fetchAuditLog).mockResolvedValue({ rows: [], total: 0, error: null, errorKind: null })
    await renderPage()
    expect(await screen.findByText('Bu filtrlərə uyğun audit qeydi tapılmadı.')).toBeTruthy()
  })

  it('shows the directory-failure warning without failing the whole page', async () => {
    /* Boot's directory read failed — the flag is what the page renders from. */
    useAuditLogStore.setState({ emails: new Map(), directoryError: true })
    await renderPage()
    expect(await screen.findByText(/istifadəçi e-poçtları yüklənə bilmədi/i)).toBeTruthy()
    // The row still renders — actor falls back to the raw id, table is intact.
    const table = screen.getByRole('table')
    expect(within(table).getByText('u-1')).toBeTruthy()
  })
})

describe('AuditLogPage — Excel export stays disabled (Q2)', () => {
  it('renders a disabled Excel button with the original tooltip', async () => {
    await renderPage()
    const btn = screen.getByRole('button', { name: 'Excel' }) as HTMLButtonElement
    expect(btn.disabled).toBe(true)
    expect(btn.title).toBe('Audit jurnalı üçün Excel ixracı bu mərhələdə deaktivdir')
  })
})

/* M4-18b — print parity. The original sets a print header before printing
   (printHead, index.html:1238-1243 / 7167); calling window.print() alone
   produces an untitled, undated sheet with no author. */
describe('AuditLogPage — print header', () => {
  it('renders a hidden print header carrying the title, platform, timestamp and user', async () => {
    const user = userEvent.setup()
    const printSpy = vi.spyOn(window, 'print').mockImplementation(() => {})
    await renderPage()
    const head = document.getElementById('printhead')
    expect(head).toBeTruthy()
    /* .printonly is display:none on screen and revealed by @media print. */
    expect(head!.className).toContain('printonly')
    expect(head!.querySelector('.ph-t')!.textContent).toBe('Audit jurnalı')

    /* The subtitle is written by the print run, as in the original — before
       the first «Çap» there is nothing to date, exactly as the original's
       #printhead sits empty until printHead() fills it. */
    expect(head!.querySelector('.ph-s')).toBeNull()

    await user.click(screen.getByRole('button', { name: 'Çap' }))

    const sub = document.getElementById('printhead')!.querySelector('.ph-s')!.textContent!
    expect(sub).toContain('Anbar Platforması')
    expect(sub).toContain('Admin User')
    printSpy.mockRestore()
  })

  it('still calls window.print() when «Çap» is pressed', async () => {
    const user = userEvent.setup()
    const printSpy = vi.spyOn(window, 'print').mockImplementation(() => {})
    await renderPage()

    await user.click(screen.getByRole('button', { name: 'Çap' }))

    expect(printSpy).toHaveBeenCalledTimes(1)
    printSpy.mockRestore()
  })

  /* The original stamps the header inside the «Çap» handler (printHead's own
     `new Date()`, index.html:1242, called at 7167), NOT when the screen is
     opened. A page left open for hours must still print today's date. */
  it('stamps the timestamp when «Çap» is clicked, not when the page was opened', async () => {
    const timeA = new Date('2026-03-05T09:00:00')
    const timeB = new Date('2026-03-06T17:45:00')
    /* The clock advances from A to B while the page sits open, so a stamp
       taken at render would read A and a stamp taken at click reads B. */
    let clock = timeA
    const user = userEvent.setup()
    const printSpy = vi.spyOn(window, 'print').mockImplementation(() => {})

    render(<AuditLogPage me={me} now={() => clock} />)
    await waitFor(() => expect(fetchAuditLog).toHaveBeenCalled())

    /* Time B: the tab has been sitting open since A. */
    clock = timeB
    await user.click(screen.getByRole('button', { name: 'Çap' }))

    const sub = document.getElementById('printhead')!.querySelector('.ph-s')!.textContent!
    expect(sub).toContain(timeB.toLocaleString('az-AZ'))
    expect(sub).not.toContain(timeA.toLocaleString('az-AZ'))
    printSpy.mockRestore()
  })

  /* The header must be in the DOM before window.print() reads it — the
     original's 60ms setTimeout. A batched React update would still be pending
     when print() fired, printing an undated first sheet. */
  it('has the stamped header in the DOM before window.print() is called', async () => {
    const user = userEvent.setup()
    let subAtPrintTime: string | null = null
    const printSpy = vi.spyOn(window, 'print').mockImplementation(() => {
      subAtPrintTime = document.getElementById('printhead')?.querySelector('.ph-s')?.textContent ?? null
    })
    await renderPage()

    await user.click(screen.getByRole('button', { name: 'Çap' }))

    expect(subAtPrintTime).toContain('Anbar Platforması')
    expect(subAtPrintTime).toContain('Admin User')
    printSpy.mockRestore()
  })
})

/* M4-18c — the directory is loaded once at boot by App, never on page mount.
   Refetching here let a transient failure on a revisit replace an already-good
   directory with an empty map, silently downgrading every actor to a raw id. */
describe('AuditLogPage — does not refetch the user directory', () => {
  it('never calls fetchUserDirectory on mount', async () => {
    await renderPage()
    expect(fetchUserDirectory).not.toHaveBeenCalled()
  })

  it('keeps an already-loaded directory when the page is reopened', async () => {
    /* Boot loaded it successfully. */
    useAuditLogStore.setState({ emails: new Map([['u-1', 'a@x.com']]), directoryError: false })

    const first = render(<AuditLogPage me={me} />)
    await waitFor(() => expect(fetchAuditLog).toHaveBeenCalled())
    first.unmount()

    /* Reopening must not re-read it, so a transient failure cannot clear it. */
    await renderPage()

    expect(fetchUserDirectory).not.toHaveBeenCalled()
    expect(useAuditLogStore.getState().emails.get('u-1')).toBe('a@x.com')
    const table = await screen.findByRole('table')
    expect(within(table).getByText('a@x.com')).toBeTruthy()
  })

  it('re-reads the rows on every visit, unlike the directory', async () => {
    /* rLog() runs whenever the page is opened (index.html:7134) — only the
       directory is boot-scoped. */
    const first = render(<AuditLogPage me={me} />)
    await waitFor(() => expect(fetchAuditLog).toHaveBeenCalledTimes(1))
    first.unmount()

    await renderPage()
    expect(fetchAuditLog).toHaveBeenCalledTimes(2)
  })
})
