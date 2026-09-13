import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

/* Azpetrol / Araz — the WIRED export control (M17-95, M17-96, M17-98,
   M17-99).

   ═══ SYNTHETIC FIXTURES ONLY. NO REAL DATA WAS EXPORTED. ═══

   The snapshot read is mocked, and every export boundary — fetch, JSZip,
   SheetJS, the download — is injected. No network call, no live data, no file
   written.

   WHAT THIS CANNOT PROVE (protocol §7). M17-100 is the EGRESS row, about
   whether the real module set may leave the system. Driving this button over
   invented rows is not evidence about that and does not authorise it; the row
   stays BLOCKED. */

const fetchAzpSnapshot = vi.fn()
vi.mock('../api/azpSnapshot.api', () => ({
  fetchAzpSnapshot: (m: string) => fetchAzpSnapshot(m),
}))

import { AzpPage, AzpExportButton } from './AzpPage'
import { useAzpStore, __resetAzpRequestSeq } from '../store/azp.store'
import { useToastStore } from '../store/toast.store'
import type { AzpExportDeps, AzpZip, AzpJsZip } from '../lib/azpExportRun'
import type { Me } from '../lib/roles'

const ME_ID = '11111111-1111-4111-8111-111111111111'
const me = (role: string): Me => ({
  id: ME_ID, sbId: ME_ID, email: 'a@example.com', name: 'Anar İbrahimov', role, wh: 'Ələt',
})

const card = (over: Record<string, unknown> = {}) => ({
  card_id: 'c1', card_no: '0012', holder: 'Anar', project: 'L1', module: 'azpetrol',
  active: true, sort_order: 1, balance: 10, medaxil_total: 30, mexaric_total: 20, mov_count: 2,
  ...over,
})

const mov = (over: Record<string, unknown> = {}) => ({
  id: 5, module: 'azpetrol', card_id: 'c1', kind: 'medaxil', amount: 30,
  op_date: '2026-09-01', doc_num: 'Q-1', note: 'qeyd', cancelled: false,
  cancel_reason: null, vat_included: false, replaces_id: null, replaced_by: null,
  created_by: 'anar', created_at: '2026-09-01T10:00:00Z', app_balance_effect: true,
  cancelled_at: null, cancelled_by: null,
  ...over,
})

/** Two cards and four movements, so a filter has something to remove. */
const CARDS = [card(), card({ card_id: 'c2', card_no: '0034', holder: 'Rəna', sort_order: 2 })]
const MOVS = [
  mov({ id: 1, card_id: 'c1', kind: 'medaxil', amount: 30, op_date: '2026-09-01' }),
  mov({ id: 2, card_id: 'c1', kind: 'mexaric', amount: 20, op_date: '2026-09-02' }),
  mov({ id: 3, card_id: 'c2', kind: 'medaxil', amount: 777, op_date: '2026-09-05' }),
  mov({ id: 4, card_id: 'c2', kind: 'mexaric', amount: 10, op_date: '2026-09-06' }),
]

function snapshot() {
  return {
    ok: true as const,
    snapshot: { cards: CARDS, movs: MOVS, log: [], appBalance: 500 },
  }
}

const SHEET =
  '<?xml version="1.0"?><worksheet xmlns="x"><dimension ref="A1:Z99"/>'
  + '<cols><col min="1" max="1" width="3.88" style="2"/></cols>'
  + '<sheetData><row r="1"><c r="A1" s="38"/></row></sheetData>'
  + '<pageMargins left="0.7"/></worksheet>'

function fakeZip() {
  const files = new Map<string, string>([
    ['xl/worksheets/sheet1.xml', SHEET],
    ['xl/worksheets/sheet2.xml', SHEET],
    ['xl/workbook.xml',
      '<workbook xmlns:r="rr"><sheets>'
      + '<sheet name="AZP kartların hesabatı " r:id="rId1"/>'
      + '<sheet name="ARAZ" r:id="rId2"/></sheets></workbook>'],
    ['xl/_rels/workbook.xml.rels',
      '<Relationships><Relationship Id="rId1" Target="worksheets/sheet1.xml"/>'
      + '<Relationship Id="rId2" Target="worksheets/sheet2.xml"/></Relationships>'],
    ['[Content_Types].xml',
      '<Types><Override PartName="/xl/worksheets/sheet1.xml"/>'
      + '<Override PartName="/xl/worksheets/sheet2.xml"/></Types>'],
    ['xl/calcChain.xml', '<calcChain/>'],
  ])
  const zip: AzpZip = {
    file(path: string, data?: string) {
      if (data === undefined) {
        const v = files.get(path)
        return v === undefined ? null : { async: async () => v }
      }
      files.set(path, data)
      return undefined
    },
    remove(path: string) { files.delete(path); return undefined },
    generateAsync: async () => ({ __blob: true }) as unknown as Blob,
  } as AzpZip
  const jsZip: AzpJsZip = { loadAsync: async () => zip }
  return { files, jsZip }
}

/** A deps bundle whose template step can be held open, to test in-flight. */
function exportDeps(opts: { gate?: Promise<void> } = {}) {
  const z = fakeZip()
  const downloads: string[] = []
  const deps: AzpExportDeps = {
    fetch: (async () => {
      if (opts.gate) await opts.gate
      return { ok: true, arrayBuffer: async () => new ArrayBuffer(8) } as unknown as Response
    }) as unknown as typeof globalThis.fetch,
    jsZip: () => z.jsZip,
    download: (_blob, fileName) => { downloads.push(fileName) },
    day: '2026-09-12',
  }
  return { z, downloads, deps }
}

beforeEach(() => {
  vi.clearAllMocks()
  __resetAzpRequestSeq()
  useAzpStore.getState().reset()
  useToastStore.setState({ messages: [] })
  fetchAzpSnapshot.mockResolvedValue(snapshot())
})

async function loadBoard() {
  await useAzpStore.getState().load('azpetrol')
  await waitFor(() => expect(useAzpStore.getState().data.azpetrol.ready).toBe(true))
}

const toasts = () => useToastStore.getState().messages.map((t) => t.text)

/* --------------------------------------------------------- the page wiring */

describe('the export control is wired on the page', () => {
  it('renders one export control per board, for a READ role too', async () => {
    render(<AzpPage me={me('rehber')} />)
    await waitFor(() => expect(useAzpStore.getState().data.azpetrol.ready).toBe(true))
    /* Both boards render (M17-10), so both controls exist. */
    expect(document.getElementById('azp-exp-azpetrol')).toBeTruthy()
    expect(document.getElementById('azp-exp-araz')).toBeTruthy()
    /* The CONTROL: the admin-only ones are absent for this same role, so the
       export's presence is the export's own rule, not a missing gate. */
    expect(document.getElementById('azp-newcard-azpetrol')).toBeNull()
    expect(document.getElementById('azp-imp-azpetrol')).toBeNull()
  })
})

/* ------------------------------------------------------ the run and its UI */

describe('clicking the control runs the real export (M17-95, M17-96)', () => {
  it('downloads exactly one file and shows the exact success toast', async () => {
    await loadBoard()
    const { z, downloads, deps } = exportDeps()
    render(<AzpExportButton m="azpetrol" deps={deps} />)

    await userEvent.click(screen.getByRole('button', { name: 'Excel ixracı' }))
    await waitFor(() => expect(downloads).toHaveLength(1))

    expect(downloads).toEqual(['Azpetrol_kart_hesabati_2026-09-12.xlsx'])
    expect(toasts()).toEqual(['Azpetrol hesabatı yükləndi — 2 kart'])
    expect(useToastStore.getState().messages[0].isError).toBe(false)
    /* the other module's sheet really left the package */
    expect(z.files.has('xl/worksheets/sheet2.xml')).toBe(false)
    expect(z.files.has('xl/calcChain.xml')).toBe(false)
  })

  it('shows “Hazırlanır…”, disables the control, then restores both', async () => {
    await loadBoard()
    let release: () => void = () => {}
    const gate = new Promise<void>((r) => { release = r })
    const { downloads, deps } = exportDeps({ gate })
    render(<AzpExportButton m="azpetrol" deps={deps} />)

    const btn = screen.getByRole('button', { name: 'Excel ixracı' }) as HTMLButtonElement
    expect(btn.disabled).toBe(false)

    await userEvent.click(btn)
    await waitFor(() => expect(btn.textContent).toBe('Hazırlanır…'))
    expect(btn.disabled).toBe(true)

    release()
    await waitFor(() => expect(downloads).toHaveLength(1))
    /* THE `finally` HALF — the prior state comes back whichever path ran. */
    await waitFor(() => expect(btn.textContent).toBe('Excel ixracı'))
    expect(btn.disabled).toBe(false)
  })

  it('restores the control after a FAILING run too', async () => {
    await loadBoard()
    const deps: AzpExportDeps = {
      jsZip: () => null, xlsx: null, day: '2026-09-12',
    }
    render(<AzpExportButton m="azpetrol" deps={deps} />)
    const btn = screen.getByRole('button', { name: 'Excel ixracı' }) as HTMLButtonElement
    await userEvent.click(btn)
    await waitFor(() => expect(toasts()).toHaveLength(1))
    expect(toasts()[0]).toBe('JSZip kitabxanası yüklənmədi')
    expect(btn.disabled).toBe(false)
    expect(btn.textContent).toBe('Excel ixracı')
  })

  /* Two clicks inside one frame must start ONE export. `disabled` alone does
     not settle this — it is applied on the next render. */
  it('starts only one export when the control is double-clicked in flight', async () => {
    await loadBoard()
    let release: () => void = () => {}
    const gate = new Promise<void>((r) => { release = r })
    const { downloads, deps } = exportDeps({ gate })
    render(<AzpExportButton m="azpetrol" deps={deps} />)

    const btn = screen.getByRole('button', { name: 'Excel ixracı' })
    await userEvent.click(btn)
    await userEvent.click(btn)
    await userEvent.click(btn)

    release()
    await waitFor(() => expect(downloads).toHaveLength(1))
    /* Settle any second run that might have been queued. */
    await new Promise((r) => setTimeout(r, 0))
    expect(downloads).toHaveLength(1)
    expect(toasts()).toHaveLength(1)
  })
})

/* ------------------------------------------------- the filters do not apply */

describe('screen filters never reach the export (M17-98)', () => {
  it('exports the full set while the board is filtered down to one card', async () => {
    await loadBoard()
    /* Filter the SCREEN hard: one card, one kind, a one-day window. */
    useAzpStore.getState().setFilter('azpetrol', {
      card: 'c1', kind: 'medaxil', d1: '2026-09-01', d2: '2026-09-01',
    })

    const { z, deps } = exportDeps()
    render(<AzpExportButton m="azpetrol" deps={deps} />)
    await userEvent.click(screen.getByRole('button', { name: 'Excel ixracı' }))
    await waitFor(() => expect(toasts()).toHaveLength(1))

    const sheet = z.files.get('xl/worksheets/sheet1.xml') as string
    /* BOTH cards are in the file, though the screen shows one. */
    expect(sheet).toContain('<t xml:space="preserve">0012</t>')
    expect(sheet).toContain('<t xml:space="preserve">0034</t>')
    /* The filtered-out card's distinctive amount is there. */
    expect(sheet).toContain('<v>777</v>')
    /* And so is the filtered-out KIND and the out-of-range date's amount. */
    expect(sheet).toContain('<v>20</v>')
    expect(sheet).toContain('<v>10</v>')
    /* The toast counts every card, not the filtered subset. */
    expect(toasts()[0]).toBe('Azpetrol hesabatı yükləndi — 2 kart')
    /* The filter itself is untouched — the export did not clear it to win. */
    expect(useAzpStore.getState().filter.azpetrol.card).toBe('c1')
  })

  /* THE CONTROL. The same filter really does narrow what the SCREEN shows, so
     the assertion above is about the export ignoring a LIVE filter, not about
     a filter that never did anything. */
  it('that same filter does narrow the on-screen movement table', async () => {
    render(<AzpPage me={me('admin')} />)
    await waitFor(() => expect(useAzpStore.getState().data.azpetrol.ready).toBe(true))
    const board = document.getElementById('azp-movs-azpetrol') as HTMLElement
    expect(board.textContent).toContain('777')

    useAzpStore.getState().setFilter('azpetrol', {
      card: 'c1', kind: 'medaxil', d1: '2026-09-01', d2: '2026-09-01',
    })
    await waitFor(() => expect(
      (document.getElementById('azp-movs-azpetrol') as HTMLElement).textContent,
    ).not.toContain('777'))
  })
})

/* ------------------------------------------------------------ the refusals */

describe('the control refuses before doing any work', () => {
  it('refuses an unloaded board without fetching the template', async () => {
    const { downloads, deps } = exportDeps()
    render(<AzpExportButton m="azpetrol" deps={deps} />)
    await userEvent.click(screen.getByRole('button', { name: 'Excel ixracı' }))
    await waitFor(() => expect(toasts()).toEqual(['Məlumat yüklənməyib']))
    expect(downloads).toHaveLength(0)
  })

  it('refuses a loaded but empty module, naming it', async () => {
    fetchAzpSnapshot.mockResolvedValue({
      ok: true, snapshot: { cards: [], movs: [], log: [], appBalance: 0 },
    })
    await useAzpStore.getState().load('araz')
    const { downloads, deps } = exportDeps()
    render(<AzpExportButton m="araz" deps={deps} />)
    await userEvent.click(screen.getByRole('button', { name: 'Excel ixracı' }))
    await waitFor(() => expect(toasts()).toEqual(['Araz üçün kart yoxdur']))
    expect(downloads).toHaveLength(0)
  })
})
