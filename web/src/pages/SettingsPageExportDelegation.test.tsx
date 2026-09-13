import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

/* M16-11 — the Settings half of the export delegation.

   What is asserted here is ONLY the delegation: that each button records the
   correct pending target and navigates to the matching page, in that order,
   and that Settings derives NO movement/balance/nomenclature export of its
   own. The exports themselves are covered by their pages' existing suites;
   re-deriving them here would be exactly the second implementation M16-11
   forbids.

   No live data and no workbook writer are touched. */

const load = vi.fn(async () => {})
const fetchSettingsUsers = vi.fn()
const state = {
  items: [{ code: 'A' }],
  partners: [{ id: 'p', name: 'P', voen: null, contract: null, contract_date: null }],
  indexes: { operational: [{ id: 'one' }] },
  loading: false, loaded: true, error: null, load,
}

vi.mock('../store/analysis.store', () => ({ useAnalysisStore: () => state }))
vi.mock('../hooks/useRealtimeRefresh', () => ({ useRealtimeRefresh: vi.fn() }))
vi.mock('../api/settingsUsers.api', () => ({ fetchSettingsUsers: (...a: unknown[]) => fetchSettingsUsers(...a) }))
vi.mock('../store/toast.store', () => ({ useToastStore: (sel: (s: { show: ReturnType<typeof vi.fn> }) => unknown) => sel({ show: vi.fn() }) }))

/* The writer is mocked so a click cannot attempt a real download in jsdom.
   It also lets the «Kontragentlər» control prove it still exports DIRECTLY,
   which is what makes the mov/bal/nom assertions meaningful by contrast. */
vi.mock('../lib/xls', async (orig) => ({
  ...(await orig<typeof import('../lib/xls')>()),
  xls: vi.fn(),
}))

import { SettingsPage } from './SettingsPage'
import { useExportRequestStore } from '../store/exportRequest.store'
import { xls } from '../lib/xls'

const admin = { id: 'u1', sbId: 'u1', email: 'a@x', name: 'Admin', role: 'admin', wh: '' }

beforeEach(() => {
  vi.clearAllMocks()
  fetchSettingsUsers.mockResolvedValue({ ok: true, rows: [] })
  useExportRequestStore.setState({ pending: null })
})

describe('SettingsPage export delegation (M16-11)', () => {
  it.each([
    ['set-exp-mov', 'mov', 'Mal hərəkəti'],
    ['set-exp-bal', 'bal', 'Anbar qalıqları'],
    ['set-exp-nom', 'nom', 'Nomenklatura'],
  ])('%s records `%s` and navigates there, exporting nothing itself', (testid, target, label) => {
    const onOpenPage = vi.fn()
    render(<SettingsPage me={admin} onOpenPage={onOpenPage} />)

    const button = screen.getByTestId(testid)
    /* The legacy labels survive the change from disabled to enabled. */
    expect(button.textContent).toBe(label)
    expect((button as HTMLButtonElement).disabled).toBe(false)

    fireEvent.click(button)

    expect(useExportRequestStore.getState().pending).toBe(target)
    expect(onOpenPage).toHaveBeenCalledExactlyOnceWith(target)
    /* The load-bearing negative: Settings must not write a workbook for these
       three. If it did, a second export implementation would exist. */
    expect(xls).not.toHaveBeenCalled()
  })

  /* Falsifiable ordering check. The request must be recorded BEFORE the page
     switches; the reverse order mounts the destination with an empty store
     and silently exports nothing. */
  it('records the request before navigating', () => {
    const seen: (string | null)[] = []
    const onOpenPage = vi.fn(() => { seen.push(useExportRequestStore.getState().pending) })
    render(<SettingsPage me={admin} onOpenPage={onOpenPage} />)
    fireEvent.click(screen.getByTestId('set-exp-bal'))
    expect(seen).toEqual(['bal'])
  })

  it('stays usable with no navigation handler, still recording the request', () => {
    render(<SettingsPage me={admin} />)
    fireEvent.click(screen.getByTestId('set-exp-mov'))
    expect(useExportRequestStore.getState().pending).toBe('mov')
  })

  /* The contrast case, and the boundary M16-09/M16-10 fixed: «Kontragentlər»
     has no page of its own and therefore still exports directly, while
     «Audit jurnalı» stays disabled and delegates to nothing. */
  it('keeps Kontragentlər a direct export and Audit jurnalı disabled', () => {
    const onOpenPage = vi.fn()
    render(<SettingsPage me={admin} onOpenPage={onOpenPage} />)

    fireEvent.click(screen.getByRole('button', { name: 'Kontragentlər' }))
    expect(xls).toHaveBeenCalledOnce()
    expect(useExportRequestStore.getState().pending).toBeNull()
    expect(onOpenPage).not.toHaveBeenCalled()

    const audit = screen.getByRole('button', { name: 'Audit jurnalı' })
    expect((audit as HTMLButtonElement).disabled).toBe(true)
    expect(audit.getAttribute('title')).toBe('Audit jurnalı üçün Excel ixracı bu mərhələdə deaktivdir')
  })

  /* D-S1 / D-S2 remain owner-gated: this slice must not have enabled them. */
  it('leaves the backup and bulk-import controls disabled', () => {
    render(<SettingsPage me={admin} />)
    expect((screen.getByRole('button', { name: 'Tam ehtiyat nüsxə (JSON)' }) as HTMLButtonElement).disabled).toBe(true)
    expect((screen.getByRole('button', { name: 'Yoxla və yüklə' }) as HTMLButtonElement).disabled).toBe(true)
  })
})
