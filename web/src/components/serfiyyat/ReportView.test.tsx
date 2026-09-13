import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen, within } from '@testing-library/react'

/* T6 — M13-71…M13-74, M13-80…M13-87, M13-89.

   UNIT/PAGE EVIDENCE ONLY. The admin-only document table below is a BROWSER
   AFFORDANCE: `edit_serfiyyat_document` and `delete_serfiyyat_document` are
   admin-only SERVER-side (schema 2732-2734, 2518-2520), and neither refusal
   is satisfied by the absence of a link here (protocol §7). */

const deleteSerfiyyatDocument = vi.fn()
const exportSerfiyyatWorkbook = vi.fn()
const show = vi.fn()

vi.mock('../../api/serfiyyatDocuments.api', () => ({
  deleteSerfiyyatDocument: (...a: unknown[]) => deleteSerfiyyatDocument(...a),
}))
vi.mock('../../lib/serfiyyatExport', () => ({
  exportSerfiyyatWorkbook: (...a: unknown[]) => exportSerfiyyatWorkbook(...a),
}))
vi.mock('../../store/toast.store', () => ({
  useToastStore: (sel: (s: { show: typeof show }) => unknown) => sel({ show }),
}))
vi.mock('../../store/auditLog.store', () => ({
  useAuditLogStore: (sel: (s: { emails: Map<string, string> }) => unknown) =>
    sel({ emails: new Map([['u1', 'anbardar@example.com']]) }),
}))

let state: Record<string, unknown>
vi.mock('../../store/serfiyyat.store', () => ({ useSerfiyyatStore: () => state }))

import { ReportView } from './ReportView'
import { EMPTY_FILTERS } from '../../lib/serfiyyatFilters'

const PROJECT = { id: 'p1', name: 'Layihə A', wh: 'Test Anbar', active: true }
const PROJECT2 = { id: 'p2', name: 'Layihə B', wh: 'Başqa Anbar', active: true }
const ITEM = { code: '0000001', name: 'Sement M400', unit: 'kq', price: 5, category: null }
const ITEM2 = { code: '0000002', name: 'Qum', unit: 'ton', price: 2, category: null }

const DOC = {
  id: 'd1', num: 'SM-2026-000001', projectId: 'p1', kontragent: 'MMC', avto: '10-AA-123',
  kanal: 'Nağd', iv: '83951', d: '2026-09-11', note: 'qeyd', by: 'u1', ts: 1,
}
const DOC2 = {
  id: 'd2', num: 'SM-2026-000002', projectId: 'p2', kontragent: '', avto: '',
  kanal: '', iv: '', d: '2026-09-20', note: '', by: 'u-unknown', ts: 2,
}
const LINE = { id: 'l1', docId: 'd1', code: '0000001', qty: 2, price: 5, sum: 10 }
const LINE2 = { id: 'l2', docId: 'd2', code: '0000002', qty: 3, price: 2, sum: 6 }

const me = { id: 'u1', sbId: 'u1', email: 'a@x', name: 'A', role: 'anbardar', wh: 'Test Anbar' }
const admin = { ...me, role: 'admin', wh: '' }
const rehber = { ...me, role: 'rehber', wh: '' }

const setFilters = vi.fn()
const clearFilters = vi.fn()
const openEdit = vi.fn()
const load = vi.fn()

const baseState = (over: Record<string, unknown> = {}) => ({
  projects: [PROJECT, PROJECT2],
  documents: [DOC, DOC2],
  lines: [LINE, LINE2],
  itemsByCode: new Map([[ITEM.code, ITEM], [ITEM2.code, ITEM2]]),
  channels: [{ name: 'Nağd', active: true }, { name: 'Köhnə', active: false }],
  filters: EMPTY_FILTERS,
  setFilters, clearFilters, openEdit, load,
  ...over,
})

const bodyRows = () =>
  within(screen.getByTestId('sm-rep-tbl')).getAllByRole('row').slice(1)

beforeEach(() => {
  vi.clearAllMocks()
  state = baseState()
  deleteSerfiyyatDocument.mockResolvedValue({ ok: true, data: {}, error: null })
  exportSerfiyyatWorkbook.mockReturnValue({ ok: true, count: 2 })
})

describe('the report table — M13-85', () => {
  it('renders exactly the fourteen columns, none right-aligned', () => {
    render(<ReportView me={admin} />)
    const headers = within(screen.getByTestId('sm-rep-tbl')).getAllByRole('columnheader')
    expect(headers.map((h) => h.textContent)).toEqual([
      'Tarix', 'Sənəd №', 'Layihə', 'Material', 'Ölçü', 'Miqdar', 'Qiymət', 'Cəm',
      'Kontragent', 'Avtomobil', 'Alınma kanalı', 'Qaimə №', 'Qeyd', 'Daxil edən',
    ])
    for (const h of headers) expect(h.className).not.toContain('r')
  })

  it('renders one row per visible line, with the resolved author', () => {
    render(<ReportView me={admin} />)
    expect(bodyRows()).toHaveLength(2)
    expect(bodyRows()[0].textContent).toContain('anbardar@example.com')
  })

  /* D-N6 — an unresolved author keeps the RAW uuid. */
  it('falls back to the raw uuid when the directory cannot resolve the author', () => {
    render(<ReportView me={admin} />)
    expect(bodyRows()[1].textContent).toContain('u-unknown')
  })

  /* M13-85 — the empty message sits BELOW a still-rendered header. */
  it('keeps the header and shows «Uyğun sətir tapılmadı.» when empty', () => {
    state = baseState({ lines: [] })
    render(<ReportView me={admin} />)
    expect(screen.getByTestId('sm-rep-empty').textContent).toBe('Uyğun sətir tapılmadı.')
    expect(within(screen.getByTestId('sm-rep-tbl')).getAllByRole('columnheader')).toHaveLength(14)
  })
})

/* M13-76 — the report is read-scoped: a rehber sees EVERY active project's
   rows even though they may write nothing. */
describe('report scope by role — M13-75, M13-76', () => {
  it('shows a rehber every active project’s rows', () => {
    render(<ReportView me={rehber} />)
    expect(bodyRows()).toHaveLength(2)
  })

  it('narrows an anbardar to their own warehouse’s project', () => {
    render(<ReportView me={me} />)
    expect(bodyRows()).toHaveLength(1)
    expect(bodyRows()[0].textContent).toContain('Layihə A')
  })

  it('drops a line whose document is missing', () => {
    state = baseState({ lines: [{ ...LINE, docId: 'gone' }] })
    render(<ReportView me={admin} />)
    expect(screen.queryByTestId('sm-rep-empty')).toBeTruthy()
  })
})

describe('the filter inputs — M13-80, M13-81, M13-82', () => {
  it('renders exactly fifteen filter inputs', () => {
    render(<ReportView me={admin} />)
    const ids = [
      'sm-f-d1', 'sm-f-d2', 'sm-f-proj', 'sm-f-item', 'sm-f-kontragent',
      'sm-f-avto', 'sm-f-kanal', 'sm-f-iv', 'sm-f-note', 'sm-f-by',
      'sm-f-q1', 'sm-f-q2', 'sm-f-p1', 'sm-f-p2', 'sm-f-s1', 'sm-f-s2',
    ]
    /* Sixteen testids for fifteen LABELLED filters: Miqdar/Qiymət/Cəm each
       carry a min and a max input under one label. */
    expect(ids).toHaveLength(16)
    for (const id of ids) expect(screen.queryByTestId(id)).toBeTruthy()
  })

  /* M13-81 — the report does NOT filter as you type. */
  it('does NOT apply a filter until «Filtrləri tətbiq et» is pressed', () => {
    render(<ReportView me={admin} />)
    fireEvent.change(screen.getByTestId('sm-f-item'), { target: { value: 'qum' } })
    expect(setFilters).not.toHaveBeenCalled()
    /* The table is still unfiltered. */
    expect(bodyRows()).toHaveLength(2)

    fireEvent.click(screen.getByTestId('sm-f-apply'))
    expect(setFilters).toHaveBeenCalledTimes(1)
  })

  it('trims and lower-cases the text filters when applying', () => {
    render(<ReportView me={admin} />)
    fireEvent.change(screen.getByTestId('sm-f-item'), { target: { value: '  SEMENT  ' } })
    fireEvent.click(screen.getByTestId('sm-f-apply'))
    expect(setFilters).toHaveBeenCalledWith(expect.objectContaining({ item: 'sement' }))
  })

  /* The equality filters are NOT lower-cased — they compare to a stored name. */
  it('passes Layihə and Alınma kanalı through unchanged', () => {
    render(<ReportView me={admin} />)
    fireEvent.change(screen.getByTestId('sm-f-proj'), { target: { value: 'Layihə A' } })
    fireEvent.change(screen.getByTestId('sm-f-kanal'), { target: { value: 'Nağd' } })
    fireEvent.click(screen.getByTestId('sm-f-apply'))
    expect(setFilters).toHaveBeenCalledWith(expect.objectContaining({
      proj: 'Layihə A', kanal: 'Nağd',
    }))
  })

  it('applies the APPLIED filter set to the rendered rows', () => {
    state = baseState({ filters: { ...EMPTY_FILTERS, item: 'qum' } })
    render(<ReportView me={admin} />)
    expect(bodyRows()).toHaveLength(1)
    expect(bodyRows()[0].textContent).toContain('Qum')
  })

  it('«Təmizlə» resets the store filters and every input', () => {
    state = baseState({ filters: { ...EMPTY_FILTERS, item: 'qum' } })
    render(<ReportView me={admin} />)
    fireEvent.change(screen.getByTestId('sm-f-item'), { target: { value: 'zzz' } })
    fireEvent.click(screen.getByTestId('sm-f-clear'))
    expect(clearFilters).toHaveBeenCalled()
    expect((screen.getByTestId('sm-f-item') as HTMLInputElement).value).toBe('')
  })

  it('offers only the ACTIVE channels in the channel filter', () => {
    render(<ReportView me={admin} />)
    const options = screen.getByTestId('sm-f-kanal').querySelectorAll('option')
    expect([...options].map((o) => o.textContent)).toEqual(['Hamısı', 'Nağd'])
  })
})

/* M13-86, M13-87 — the «Yekun» aggregates, in FIRST-APPEARANCE order. */
describe('the «Yekun» block — M13-86, M13-87', () => {
  it('aggregates by project and by material over the FILTERED rows', () => {
    render(<ReportView me={admin} />)
    const proj = within(screen.getByTestId('sm-sum-proj')).getAllByRole('row')
    expect(proj.map((r) => r.textContent)).toEqual(['Layihə A10,00 ₼', 'Layihə B6,00 ₼'])
    const item = within(screen.getByTestId('sm-sum-item')).getAllByRole('row')
    expect(item.map((r) => r.textContent)).toEqual(['Sement M40010,00 ₼', 'Qum6,00 ₼'])
  })

  it('reflects the applied filter rather than the whole set', () => {
    state = baseState({ filters: { ...EMPTY_FILTERS, item: 'qum' } })
    render(<ReportView me={admin} />)
    const rows = within(screen.getByTestId('sm-sum-item')).getAllByRole('row')
    expect(rows).toHaveLength(1)
    expect(rows[0].textContent).toContain('Qum')
  })

  it('renders a single em-dash row when the aggregate is empty', () => {
    state = baseState({ lines: [] })
    render(<ReportView me={admin} />)
    expect(within(screen.getByTestId('sm-sum-proj')).getAllByRole('row')[0].textContent).toBe('—')
    expect(within(screen.getByTestId('sm-sum-item')).getAllByRole('row')[0].textContent).toBe('—')
  })
})

/* M13-72, M13-73, M13-74 — the admin-only document table. An AFFORDANCE. */
describe('the document table — M13-72, M13-73, M13-74 (AFFORDANCE)', () => {
  it('is rendered for an admin', () => {
    render(<ReportView me={admin} />)
    expect(screen.queryByTestId('sm-docs-tbl')).toBeTruthy()
  })

  it.each([['anbardar', me], ['rehber', rehber]])(
    'is NOT rendered for %s — an affordance, never the authority', (_r, who) => {
      render(<ReportView me={who} />)
      expect(screen.queryByTestId('sm-docs-tbl')).toBeNull()
    })

  it('renders exactly the seven columns', () => {
    render(<ReportView me={admin} />)
    const headers = within(screen.getByTestId('sm-docs-tbl')).getAllByRole('columnheader')
    expect(headers.map((h) => h.textContent))
      .toEqual(['Sənəd №', 'Qaimə №', 'Tarix', 'Layihə', 'Sətir sayı', 'Cəm', ''])
  })

  /* The fixture is deliberately in ASCENDING date order, so an unsorted
     implementation would fail this. */
  it('sorts by doc_date DESCENDING', () => {
    render(<ReportView me={admin} />)
    const rows = within(screen.getByTestId('sm-docs-tbl')).getAllByRole('row').slice(1)
    expect(rows[0].textContent).toContain('SM-2026-000002')
    expect(rows[1].textContent).toContain('SM-2026-000001')
  })

  it('takes the per-document sum from the STORED line_sum', () => {
    render(<ReportView me={admin} />)
    const rows = within(screen.getByTestId('sm-docs-tbl')).getAllByRole('row').slice(1)
    expect(rows[1].textContent).toContain('10,00 ₼')
  })

  it('«Düzəliş» seeds the draft from that document’s stored lines', () => {
    render(<ReportView me={admin} />)
    fireEvent.click(screen.getByTestId('sm-doc-edit-d1'))
    expect(openEdit).toHaveBeenCalledWith('d1', [{ code: '0000001', qty: 2, price: 5 }])
  })
})

/* M13-71 — the module's ONLY confirm() prompt. */
describe('deletion — M13-71', () => {
  it('states the irreversibility in the prompt', () => {
    const confirmSpy = vi.spyOn(globalThis, 'confirm').mockReturnValue(false)
    render(<ReportView me={admin} />)
    fireEvent.click(screen.getByTestId('sm-doc-del-d1'))
    expect(confirmSpy).toHaveBeenCalledWith(
      'Sənəd silinsin? SM-2026-000001 — bu geri qaytarılmır (audit jurnalında iz qalır).',
    )
    confirmSpy.mockRestore()
  })

  /* DECLINING MAKES NO CALL — the load-bearing negative. */
  it('makes NO call when the prompt is declined', () => {
    const confirmSpy = vi.spyOn(globalThis, 'confirm').mockReturnValue(false)
    render(<ReportView me={admin} />)
    fireEvent.click(screen.getByTestId('sm-doc-del-d1'))
    expect(deleteSerfiyyatDocument).not.toHaveBeenCalled()
    confirmSpy.mockRestore()
  })

  it('deletes and reloads when confirmed', async () => {
    const confirmSpy = vi.spyOn(globalThis, 'confirm').mockReturnValue(true)
    render(<ReportView me={admin} />)
    await act(async () => { fireEvent.click(screen.getByTestId('sm-doc-del-d1')) })
    expect(deleteSerfiyyatDocument).toHaveBeenCalledWith('d1')
    expect(show).toHaveBeenCalledWith('Sənəd silindi: SM-2026-000001')
    expect(load).toHaveBeenCalled()
    confirmSpy.mockRestore()
  })

  it('surfaces a server refusal and does NOT reload', async () => {
    deleteSerfiyyatDocument.mockResolvedValue({ ok: false, data: null, error: 'İcazə yoxdur: ...' })
    const confirmSpy = vi.spyOn(globalThis, 'confirm').mockReturnValue(true)
    render(<ReportView me={admin} />)
    await act(async () => { fireEvent.click(screen.getByTestId('sm-doc-del-d1')) })
    expect(show).toHaveBeenCalledWith('Xəta: İcazə yoxdur: ...', true)
    expect(load).not.toHaveBeenCalled()
    confirmSpy.mockRestore()
  })
})

/* M13-89 / D-N7 — the export, including the missing-library branch. */
describe('the export button — M13-89, D-N7', () => {
  it('exports the FILTERED rows and toasts the count', () => {
    state = baseState({ filters: { ...EMPTY_FILTERS, item: 'qum' } })
    render(<ReportView me={admin} />)
    fireEvent.click(screen.getByTestId('sm-exp'))
    expect(exportSerfiyyatWorkbook).toHaveBeenCalledTimes(1)
    const passed = exportSerfiyyatWorkbook.mock.calls[0][0] as { item: string }[]
    expect(passed).toHaveLength(1)
    expect(passed[0].item).toBe('Qum')
  })

  it('reports the missing library and writes nothing — no CSV fallback', () => {
    exportSerfiyyatWorkbook.mockReturnValue({ ok: false, count: 0, error: 'Excel kitabxanası yüklənmədi' })
    render(<ReportView me={admin} />)
    fireEvent.click(screen.getByTestId('sm-exp'))
    expect(show).toHaveBeenCalledWith('Excel kitabxanası yüklənmədi', true)
  })
})
