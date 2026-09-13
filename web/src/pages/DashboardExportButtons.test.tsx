import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

/* Phase 16 — the two Dashboard header exports, index.html:277-281.

   ═══ SYNTHETIC FIXTURES ONLY. NO REAL EXPORT WAS RUN. ═══

   The dashboard store is mocked; every export boundary — SheetJS's writeFile,
   fetch, JSZip and the download — is injected. No network call, no live data,
   no file written. This suite drives the REAL control flow of both buttons,
   so it asserts what was actually produced rather than re-asserting helpers. */

const load = vi.fn()
const setWarehouse = vi.fn()
const show = vi.fn()

const items = [{ code: '0000001', name: 'Sement', unit: 'kq', price: 10, category: null }]
const movements = [{
  id: 'm1', item_code: '0000001', warehouse: 'Ələt', date: '2026-01-05',
  in_qty: 4, out_qty: 0, price: 12, partner: 'Azpetrol', type: 'Satınalma',
  invoice_num: 'IV-1', contract_num: 'CT-1', channel: 'Nağd alış',
  note: null, doc_num: null, created_at: '2026-01-05T10:00:00Z', created_by: null,
}]
const partners = [{ id: 1, name: 'Azpetrol', voen: '111', contract: 'C1', contract_date: '2026-01-01' }]

const bal = [{
  w: 'Ələt', c: '0000001', in: 4, out: 0, n: 1, q: 4, last: '2026-01-05',
  first: '2026-01-05', price: 10, val: 40, name: 'Sement', unit: 'kq',
}]

const baseState = () => ({
  movements,
  items,
  locations: [{ id: 1, name: 'Ələt', type: 'anbar', active: true }],
  partners,
  indexes: {
    byItem: new Map([['0000001', { in: 4, out: 0, n: 1, last: '2026-01-05', q: 4, price: 10, val: 40 }]]),
    bal,
    priceObs: new Map(),
    operational: movements,
  },
  warehouse: '',
  loading: false, loaded: true, error: null as string | null, load, setWarehouse,
})

let state = baseState()

vi.mock('../store/dashboard.store', async (orig) => {
  const actual = await orig<typeof import('../store/dashboard.store')>()
  return {
    ...actual,
    useDashboardStore: Object.assign(() => state, { getState: () => state }),
  }
})

vi.mock('../store/toast.store', () => ({
  useToastStore: Object.assign(
    (sel?: (s: unknown) => unknown) => (sel ? sel({ show }) : { show }),
    { getState: () => ({ show }) },
  ),
}))

vi.mock('../store/auditLog.store', () => ({
  useAuditLogStore: (sel?: (s: unknown) => unknown) => (
    sel ? sel({ emails: new Map() }) : { emails: new Map() }
  ),
}))

vi.mock('../hooks/useRealtimeRefresh', () => ({ useRealtimeRefresh: () => {} }))

import { DashboardPage } from './DashboardPage'
import {
  FULL_EXPORT_LABEL, FULL_EXPORT_TITLE, SON_EXPORT_BUSY, SON_EXPORT_LABEL,
  SON_EXPORT_TITLE, SON_TPL_MISSING, type SonZip,
} from '../lib/sonExportRun'
import type { Me } from '../lib/roles'

const ME: Me = { id: 'u1', sbId: 'u1', email: 'a@a.com', name: 'A', role: 'admin', wh: '' }

beforeEach(() => {
  vi.clearAllMocks()
  state = baseState()
})

/** A minimal template archive, enough for one warehouse and one item. */
function fakeZip() {
  const parts: Record<string, string> = {
    'xl/workbook.xml':
      '<workbook><sheets>'
      + '<sheet name="Filtrasiya" r:id="rId1"/>'
      + '<sheet name="Nomenklatura bazası" r:id="rId2"/>'
      + '<sheet name="Kontragent bazası" r:id="rId3"/>'
      + '<sheet name="Ələt (Anbar)" r:id="rId4"/>'
      + '</sheets><calcPr calcId="1"/></workbook>',
    'xl/_rels/workbook.xml.rels':
      '<Relationships>'
      + '<Relationship Id="rId1" Target="worksheets/sheet3.xml"/>'
      + '<Relationship Id="rId2" Target="worksheets/sheet11.xml"/>'
      + '<Relationship Id="rId3" Target="worksheets/sheet12.xml"/>'
      + '<Relationship Id="rId4" Target="worksheets/sheet6.xml"/>'
      + '</Relationships>',
    'xl/worksheets/sheet3.xml': '<worksheet><dimension ref="B3:M9"/><sheetData><row r="3"><c r="B3"/></row></sheetData></worksheet>',
    'xl/worksheets/sheet11.xml': '<worksheet><dimension ref="B2:E9"/><sheetData><row r="2"><c r="B2"/></row></sheetData></worksheet>',
    'xl/worksheets/sheet12.xml': '<worksheet><dimension ref="B2:G9"/><sheetData><row r="2"><c r="B2"/></row></sheetData></worksheet>',
    'xl/worksheets/sheet6.xml':
      '<worksheet><dimension ref="A3:I9"/><sheetData><row r="3"><c r="B3"/></row>'
      + '<row r="4" ht="15.6"><c r="B4" s="26"/><c r="C4" s="27"/><c r="D4" s="28"/>'
      + '<c r="E4" s="29"><f>Table4[Mal</f></c></row></sheetData></worksheet>',
    'xl/sharedStrings.xml': '<sst count="0" uniqueCount="0"></sst>',
    '[Content_Types].xml': '<Types><Override PartName="/xl/calcChain.xml"/></Types>',
    'xl/calcChain.xml': '<calcChain/>',
  }
  const zip = {
    files: parts,
    file(path: string, data?: string) {
      if (data !== undefined) { parts[path] = data; return zip }
      const v = parts[path]
      return v === undefined ? null : { async: async () => v }
    },
    remove(path: string) { delete parts[path]; return zip },
    generateAsync: async () => new Blob(['zip']),
  }
  return zip as unknown as SonZip
}

const okFetch = () => vi.fn(async () => ({
  ok: true, arrayBuffer: async () => new ArrayBuffer(8),
})) as unknown as typeof globalThis.fetch

function renderPage(over: {
  writeFile?: ReturnType<typeof vi.fn>
  download?: ReturnType<typeof vi.fn>
  fetch?: typeof globalThis.fetch
  jsZip?: () => { loadAsync: (b: ArrayBuffer) => Promise<SonZip> } | null
} = {}) {
  const writeFile = over.writeFile ?? vi.fn()
  const download = (over.download ?? vi.fn()) as ReturnType<typeof vi.fn>
    & ((blob: Blob, fileName: string) => void)
  render(
    <DashboardPage
      me={ME}
      onOpenMovements={vi.fn()}
      fullExportDeps={{
        day: '2026-09-13',
        xlsx: {
          utils: {
            aoa_to_sheet: (d: unknown) => ({ _d: d }),
            book_new: () => ({ SheetNames: [] as string[], Sheets: {} as Record<string, unknown> }),
            book_append_sheet: (wb: { SheetNames: string[]; Sheets: Record<string, unknown> }, ws: unknown, n: string) => {
              wb.SheetNames.push(n); wb.Sheets[n] = ws
            },
            encode_range: () => 'A1:Z9',
          },
          writeFile,
        } as never,
      }}
      sonExportDeps={{
        day: '2026-09-13',
        fetch: over.fetch ?? okFetch(),
        jsZip: over.jsZip ?? (() => ({ loadAsync: async () => fakeZip() })),
        download,
      }}
    />,
  )
  return { writeFile, download }
}

describe('the header controls — index.html:279-281', () => {
  it('renders both exports with the legacy labels and titles', () => {
    renderPage()
    const full = screen.getByRole('button', { name: FULL_EXPORT_LABEL })
    const son = screen.getByRole('button', { name: SON_EXPORT_LABEL })
    expect(full.getAttribute('title')).toBe(FULL_EXPORT_TITLE)
    expect(son.getAttribute('title')).toBe(SON_EXPORT_TITLE)
  })

  it('uses the legacy Azerbaijani labels verbatim', () => {
    expect(FULL_EXPORT_LABEL).toBe('⬇ Tam ixrac')
    expect(SON_EXPORT_LABEL).toBe('⬇ Excel (SON formatı)')
  })

  /* DEFECTIVE VARIANT: appending the buttons after the select, or swapping
     them. Legacy order is Tam ixrac → SON → the warehouse select. */
  it('places both buttons before the warehouse select, in the legacy order', () => {
    renderPage()
    const full = screen.getByRole('button', { name: FULL_EXPORT_LABEL })
    const son = screen.getByRole('button', { name: SON_EXPORT_LABEL })
    const sel = screen.getByTestId('dash-wh')
    expect(full.compareDocumentPosition(son) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(son.compareDocumentPosition(sel) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  /* `.btn` with no `pri` — legacy uses the plain secondary style (279-280). */
  it('renders them as plain .btn controls, not primary', () => {
    renderPage()
    const full = screen.getByRole('button', { name: FULL_EXPORT_LABEL })
    expect(full.className).toContain('btn')
    expect(full.className).not.toContain('pri')
  })
})

describe('«Tam ixrac» wiring', () => {
  it('writes the legacy filename and toasts the legacy success message', async () => {
    const { writeFile } = renderPage()
    await userEvent.click(screen.getByRole('button', { name: FULL_EXPORT_LABEL }))
    await waitFor(() => expect(writeFile).toHaveBeenCalledTimes(1))
    expect(writeFile.mock.calls[0][1]).toBe('Anbar_2026-09-13.xlsx')
    expect(show).toHaveBeenCalledWith(
      expect.stringContaining('Anbar_2026-09-13.xlsx yükləndi'), false,
    )
  })

  it('builds the eight legacy sheets in order', async () => {
    const { writeFile } = renderPage()
    await userEvent.click(screen.getByRole('button', { name: FULL_EXPORT_LABEL }))
    await waitFor(() => expect(writeFile).toHaveBeenCalled())
    const wb = writeFile.mock.calls[0][0] as { SheetNames: string[] }
    expect(wb.SheetNames).toEqual([
      'Hərəkət registri', 'Anbar qalıqları', 'Satınalmalar', 'Nomenklatura',
      'Kontragentlər', '_items', '_movements', '_partners',
    ])
  })

  /* ═══ EMPTY-SNAPSHOT PARITY. ═══
     Legacy carries no emptiness check, so the button downloads the
     headers-only workbook and toasts the ordinary success message rather
     than an error. DEFECTIVE VARIANT: refusing, which would diverge from
     production. */
  it('exports a headers-only workbook for an empty snapshot', async () => {
    state = { ...baseState(), items: [], movements: [], indexes: { ...baseState().indexes, bal: [], operational: [] } }
    const { writeFile } = renderPage()
    await userEvent.click(screen.getByRole('button', { name: FULL_EXPORT_LABEL }))
    await waitFor(() => expect(writeFile).toHaveBeenCalledTimes(1))
    expect(writeFile.mock.calls[0][1]).toBe('Anbar_2026-09-13.xlsx')
    expect(show).toHaveBeenCalledWith(
      expect.stringContaining('Anbar_2026-09-13.xlsx yükləndi'), false,
    )
  })

  /* DEFECTIVE VARIANT: scoping the export to `#dash-wh`. The export is the
     WHOLE dataset; a scoped file would disagree with its own totals. */
  it('ignores the warehouse selector and exports everything', async () => {
    state = { ...baseState(), warehouse: 'Astara' }
    const { writeFile } = renderPage()
    await userEvent.click(screen.getByRole('button', { name: FULL_EXPORT_LABEL }))
    await waitFor(() => expect(writeFile).toHaveBeenCalled())
    expect(show).toHaveBeenCalledWith(expect.stringContaining('1 hərəkət'), false)
  })

  /* NO same-tick guard is claimed for «Tam ixrac», and none is tested.

     Its handler is synchronous: it builds the workbook and returns within one
     event, so any busy flag is cleared by its own `finally` before a second
     event can be dispatched. No in-handler flag can defend that, and a test
     asserting otherwise would fail whether or not a guard existed — which is
     exactly what an earlier version of this suite did. Legacy carries no
     guard either (index.html:279, 7673: no disable, no busy label, no flag),
     so two genuinely simultaneous clicks writing two files is inherited
     behaviour, not a regression. The SON button, which awaits, IS guarded and
     IS tested below. */
})

describe('«Excel (SON formatı)» wiring', () => {
  it('downloads the legacy filename and toasts the legacy summary', async () => {
    const { download } = renderPage()
    await userEvent.click(screen.getByRole('button', { name: SON_EXPORT_LABEL }))
    await waitFor(() => expect(download).toHaveBeenCalledTimes(1))
    expect(download.mock.calls[0][1]).toBe('Anbar_2026-09-13.xlsx')
    expect(show).toHaveBeenCalledWith(
      'Excel (SON formatı) yükləndi — Filtrasiya 1, Nomenklatura 1 | Ələt 1', false,
    )
  })

  /* ═══ THE BUSY LABEL AND ITS RESTORATION (7903, 7926). ═══ */
  it('shows «Hazırlanır...» while running and restores the label afterwards', async () => {
    let release: (() => void) | null = null
    const gate = new Promise<void>((r) => { release = r })
    const { download } = renderPage({
      jsZip: () => ({ loadAsync: async () => { await gate; return fakeZip() } }),
    })
    await userEvent.click(screen.getByRole('button', { name: SON_EXPORT_LABEL }))

    const busy = await screen.findByRole('button', { name: SON_EXPORT_BUSY })
    expect((busy as HTMLButtonElement).disabled).toBe(true)

    release!()
    await waitFor(() => expect(download).toHaveBeenCalled())
    /* Restored in `finally` — including on the success path. */
    await waitFor(() => expect(screen.getByRole('button', { name: SON_EXPORT_LABEL })).toBeTruthy())
    expect((screen.getByRole('button', { name: SON_EXPORT_LABEL }) as HTMLButtonElement).disabled).toBe(false)
  })

  it('restores the label after a FAILURE too', async () => {
    const { download } = renderPage({
      fetch: (async () => ({ ok: false })) as unknown as typeof globalThis.fetch,
    })
    await userEvent.click(screen.getByRole('button', { name: SON_EXPORT_LABEL }))
    await waitFor(() => expect(show).toHaveBeenCalledWith(SON_TPL_MISSING, true))
    expect(download).not.toHaveBeenCalled()
    expect((screen.getByRole('button', { name: SON_EXPORT_LABEL }) as HTMLButtonElement).disabled).toBe(false)
  })

  /* ═══ THE DOUBLE-CLICK PROTECTION, and exactly what this proves. ═══

     MEASURED FACT (2026-09-13): Testing Library wraps `fireEvent` in `act()`,
     which flushes React's state update synchronously. So `disabled` is
     ALREADY committed before a second synthetic click, and jsdom — which does
     honour `disabled` — swallows it. That makes this test a proof of the
     DISABLED GATE, and it cannot distinguish the in-handler ref: the suite
     behaves identically with `sonBusyRef` removed.

     It is kept, named for what it actually verifies, because the disabled
     gate is the primary protection and a regression that dropped it (an
     always-enabled button) would fail here. The ref, which covers the real
     browser's pre-commit race that `disabled` misses, is exercised directly
     below instead — without the DOM, where nothing can mask it. */
  it('blocks a second click while running, via the disabled gate', async () => {
    let release: (() => void) | null = null
    const gate = new Promise<void>((r) => { release = r })
    const { download } = renderPage({
      jsZip: () => ({ loadAsync: async () => { await gate; return fakeZip() } }),
    })
    const btn = screen.getByRole('button', { name: SON_EXPORT_LABEL })
    fireEvent.click(btn)
    /* The gate itself: committed before the next event is dispatched. */
    expect((btn as HTMLButtonElement).disabled).toBe(true)
    fireEvent.click(btn)
    release!()
    await waitFor(() => expect(download).toHaveBeenCalledTimes(1))
    expect(show).toHaveBeenCalledTimes(1)
  })


  it('reports a missing-warehouse refusal as a visible error and downloads nothing', async () => {
    state = {
      ...baseState(),
      indexes: {
        ...baseState().indexes,
        operational: [{ ...movements[0], warehouse: 'Yoxdur Anbar' }],
      },
    }
    const { download } = renderPage()
    await userEvent.click(screen.getByRole('button', { name: SON_EXPORT_LABEL }))
    await waitFor(() => expect(show).toHaveBeenCalledWith(
      expect.stringContaining('Şablonda bu anbar(lar)ın vərəqi yoxdur'), true,
    ))
    expect(download).not.toHaveBeenCalled()
  })
})
