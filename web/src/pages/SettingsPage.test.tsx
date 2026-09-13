import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'

const load = vi.fn(async () => {})
const fetchSettingsUsers = vi.fn()
const state = {
  items: [{ code: 'A' }, { code: 'B' }],
  partners: [{ id: 'p', name: 'P', voen: null, contract: null, contract_date: null }],
  indexes: { operational: [{ id: 'one' }, { id: 'two' }, { id: 'three' }] },
  loading: false, loaded: true, error: null, load,
}

vi.mock('../store/analysis.store', () => ({ useAnalysisStore: () => state }))
vi.mock('../hooks/useRealtimeRefresh', () => ({ useRealtimeRefresh: vi.fn() }))
vi.mock('../api/settingsUsers.api', () => ({ fetchSettingsUsers: (...args: unknown[]) => fetchSettingsUsers(...args) }))
vi.mock('../store/toast.store', () => ({ useToastStore: (sel: (s: { show: ReturnType<typeof vi.fn> }) => unknown) => sel({ show: vi.fn() }) }))

import { SettingsPage } from './SettingsPage'

const admin = { id: 'u1', sbId: 'u1', email: 'a@x', name: 'Admin', role: 'admin', wh: '' }
const anbardar = { ...admin, id: 'u2', role: 'anbardar', name: 'Keeper' }

beforeEach(() => { vi.clearAllMocks(); fetchSettingsUsers.mockResolvedValue({ ok: true, rows: [] }) })

describe('SettingsPage', () => {
  it('renders the exact shell, ten-by-six permission matrix, source counts and disabled audit export', () => {
    render(<SettingsPage me={anbardar} />)
    expect(screen.getByRole('heading', { name: 'Parametrlər və ixrac' })).toBeTruthy()
    expect(screen.getByText('Məlumat mübadiləsi, ehtiyat nüsxə və istifadəçi hüquqları.')).toBeTruthy()
    const matrix = screen.getByRole('heading', { name: 'Hüquq matrisi' }).closest('.card')!
    expect(matrix.querySelectorAll('tbody tr')).toHaveLength(10)
    expect(matrix.querySelectorAll('thead th')).toHaveLength(7)
    const source = screen.getByRole('heading', { name: 'Məlumat mənbəyi' }).closest('.card')!
    expect(source.textContent).toContain('2 nomenklatura mövqeyi, 1 kontragent, 3 mal hərəkəti qeydi')
    expect(screen.getByRole('button', { name: 'Audit jurnalı' }).getAttribute('title')).toBe('Audit jurnalı üçün Excel ixracı bu mərhələdə deaktivdir')
    expect(fetchSettingsUsers).not.toHaveBeenCalled()
  })

  it('shows the exact non-admin users boundary', () => {
    render(<SettingsPage me={anbardar} />)
    expect(screen.getByText('Yalnız Admin bütün istifadəçiləri görə və rol təyin edə bilər.')).toBeTruthy()
  })

  it('loads, sorts and labels admin-visible users without enabling mutation', async () => {
    fetchSettingsUsers.mockResolvedValue({ ok: true, rows: [
      { id: 'u2', email: 'z@x', role: 'anbardar', warehouse: 'W', active: false },
      { id: 'u1', email: 'a@x', role: 'admin', warehouse: null, active: true },
    ] })
    render(<SettingsPage me={admin} />)
    await waitFor(() => expect(screen.getByText('a@x')).toBeTruthy())
    const emails = Array.from(document.querySelectorAll('tbody tr td:first-child b')).map((x) => x.textContent).filter((x) => x?.includes('@'))
    expect(emails).toEqual(['a@x', 'z@x'])
    expect(screen.getByText('siz')).toBeTruthy()
    expect(screen.getByText('deaktiv')).toBeTruthy()
    expect(screen.getAllByRole('button', { name: 'Rol təyin et' }).every((b) => (b as HTMLButtonElement).disabled)).toBe(true)
  })

  it('distinguishes an admin user-read failure', async () => {
    fetchSettingsUsers.mockResolvedValue({ ok: false, error: '403' })
    render(<SettingsPage me={admin} />)
    await waitFor(() => expect(screen.getByText('İstifadəçilər yüklənə bilmədi.')).toBeTruthy())
  })
})
