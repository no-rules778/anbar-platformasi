import { describe, expect, it, vi, beforeEach } from 'vitest'
import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

/* T5 — «Hesabatlar» page behaviour (M14-03 … M14-08, M14-88, M14-91 … M14-96).

   The snapshot reader is mocked so the page renders against a fixed dataset;
   this is UNIT/component evidence, never live or server evidence. */

vi.mock('../api/reportsSnapshot.api', () => ({ fetchReportsSnapshot: vi.fn() }))
vi.mock('../hooks/useRealtimeRefresh', () => ({ useRealtimeRefresh: vi.fn() }))

const xlsSpy = vi.fn()
vi.mock('../lib/xls', () => ({ xls: (...args: unknown[]) => xlsSpy(...args) }))

import { ReportsPage } from './ReportsPage'
import { fetchReportsSnapshot } from '../api/reportsSnapshot.api'
import { useReportsStore } from '../store/reports.store'
import { defaultQaimeSelection } from '../lib/qaimeReport'
import type { Me } from '../lib/roles'

const me: Me = { id: 'u1', sbId: 'u1', email: 'a@b.c', name: 'Test User', role: 'admin', wh: '' }
const rehber: Me = { ...me, role: 'rehber' }

const movement = (over: Record<string, unknown> = {}) => ({
  id: 'm1', item_code: 'A', warehouse: 'Elet', date: '2026-02-01', in_qty: 2,
  out_qty: 0, price: 10, partner: 'Alfa', type: 'Satınalma', invoice_num: 'IV-1',
  note: '', doc_num: 'D-1', created_at: '', channel: '', contract_num: '',
  created_by: '', ...over,
})

const SNAPSHOT = {
  ok: true as const,
  snapshot: {
    movements: [
      movement(),
      movement({ id: 'm2', item_code: 'B', partner: 'Beta', in_qty: 0, out_qty: 1, type: 'Silinmə', invoice_num: 'IV-2', doc_num: 'D-2', date: '2026-03-01' }),
      movement({ id: 'm3', type: 'Yerdəyişmə', partner: 'Astara anbarına', in_qty: 0, out_qty: 3, invoice_num: '', doc_num: 'D-3' }),
    ],
    items: [
      { code: 'A', name: 'Sement', unit: 'kq', price: 10, category: null },
      { code: 'B', name: 'Qum', unit: 'kq', price: 5, category: null },
    ],
    locations: [
      { name: 'Elet', type: 'anbar', active: true },
      { name: 'Astara', type: 'anbar', active: true },
      { name: 'Layihə-1', type: 'layihe', active: true },
    ],
    partners: [{ name: 'Alfa', voen: '1234567890', contract: 'C-1' }],
  },
}

function resetStore() {
  useReportsStore.setState({
    movements: [], items: [], locations: [], partners: [],
    loading: false, loaded: false, error: null,
    kind: 'knt', qaimeSel: defaultQaimeSelection(),
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  xlsSpy.mockClear()
  resetStore()
  vi.mocked(fetchReportsSnapshot).mockResolvedValue(SNAPSHOT as never)
})

const renderPage = async (who: Me = me) => {
  render(<ReportsPage me={who} />)
  expect(await screen.findByTestId('rep-out')).toBeTruthy()
}

describe('page shell — index.html:399-412 (M14-03, M14-04, M14-08)', () => {
  it('renders the heading and the fixed subtitle', async () => {
    await renderPage()
    expect(screen.getByRole('heading', { name: 'Hesabatlar' })).toBeTruthy()
    expect(screen.getByText('Hesabatlar hər əməliyyatdan sonra dərhal yenilənir.')).toBeTruthy()
  })

  /* M14-04 — the subtitle is FIXED: no role-dependent variant. */
  it('shows the same subtitle for a rehber as for an admin', async () => {
    await renderPage(rehber)
    expect(screen.getByText('Hesabatlar hər əməliyyatdan sonra dərhal yenilənir.')).toBeTruthy()
  })

  /* M14-08 — both buttons exist for every role, with no permission gate. */
  it('renders both action buttons, enabled, for a rehber', async () => {
    await renderPage(rehber)
    expect(screen.getByTestId('rep-exp').hasAttribute('disabled')).toBe(false)
    expect(screen.getByTestId('rep-print').hasAttribute('disabled')).toBe(false)
  })
})

describe('report selector — index.html:401-410 (M14-05, M14-06, M14-07)', () => {
  it('offers exactly the eight legacy options in order', async () => {
    await renderPage()
    const options = within(screen.getByTestId('rep-pick')).getAllByRole('option')
    expect(options.map((o) => (o as HTMLOptionElement).value)).toEqual([
      'knt', 'type', 'wh', 'per', 'abc', 'dead', 'tr', 'qaime',
    ])
    expect(options.map((o) => o.textContent)).toEqual([
      'Kontragentlər üzrə dövriyyə', 'Əməliyyat növləri üzrə xülasə',
      'Anbarlar üzrə müqayisə', 'Dövr (gün/ay) üzrə hərəkət', 'ABC təhlili',
      'Hərəkətsiz və ölü qalıq', 'Anbarlararası yerdəyişmə matrisi',
      'Qaimələr üzrə hesabat',
    ])
  })

  it('defaults to knt and renders its table', async () => {
    await renderPage()
    expect((screen.getByTestId('rep-pick') as HTMLSelectElement).value).toBe('knt')
    expect(screen.getByTestId('rep-knt')).toBeTruthy()
  })

  /* M18-03 — legacy gives the full-list card a «Tam siyahı» header
     (index.html:6749), pairing it with «Dəyərə görə ilk 12 kontragent»
     beside it. The header was dropped when the report was migrated. */
  it('heads the full-list card «Tam siyahı», like its paired card', async () => {
    await renderPage()
    expect(screen.getByRole('heading', { name: 'Tam siyahı' })).toBeTruthy()
    /* CONTROL — the paired header is present too, so this asserts a RESTORED
       header rather than passing on any heading the page happens to have. */
    expect(screen.getByRole('heading', { name: 'Dəyərə görə ilk 12 kontragent' })).toBeTruthy()
  })

  /* Every branch must render without error over one dataset. */
  it.each(['type', 'wh', 'per', 'abc', 'dead', 'tr', 'qaime'] as const)(
    'switches to the %s report and renders its own surface',
    async (kind) => {
      await renderPage()
      await userEvent.selectOptions(screen.getByTestId('rep-pick'), kind)
      expect(screen.getByTestId('rep-' + kind)).toBeTruthy()
    },
  )

  it('shows only the selected report at a time', async () => {
    await renderPage()
    expect(screen.queryByTestId('rep-abc')).toBeNull()
    await userEvent.selectOptions(screen.getByTestId('rep-pick'), 'abc')
    expect(screen.queryByTestId('rep-knt')).toBeNull()
    expect(screen.getByTestId('rep-abc')).toBeTruthy()
  })
})

describe('qaimə column picker — 6739, 6879 (M14-88, M14-86)', () => {
  /* M14-88 — the filter strip belongs to `qaime` ALONE; every other branch
     clears it, so it must not be in the document at all. */
  it('renders the column picker only for the qaimə report', async () => {
    await renderPage()
    expect(screen.queryByTestId('rep-filters')).toBeNull()
    await userEvent.selectOptions(screen.getByTestId('rep-pick'), 'qaime')
    expect(screen.getByTestId('rep-filters')).toBeTruthy()
    await userEvent.selectOptions(screen.getByTestId('rep-pick'), 'abc')
    expect(screen.queryByTestId('rep-filters')).toBeNull()
  })

  it('offers all eleven columns with seven checked by default', async () => {
    await renderPage()
    await userEvent.selectOptions(screen.getByTestId('rep-pick'), 'qaime')
    const boxes = within(screen.getByTestId('rep-filters')).getAllByRole('checkbox')
    expect(boxes).toHaveLength(11)
    expect(boxes.filter((b) => (b as HTMLInputElement).checked)).toHaveLength(7)
  })

  /* M14-86 — toggling rebuilds the table; M14-87 — and the choice survives
     leaving the report and coming back. */
  it('adds a column to the table when toggled, and retains it across a switch', async () => {
    await renderPage()
    await userEvent.selectOptions(screen.getByTestId('rep-pick'), 'qaime')
    expect(within(screen.getByTestId('rep-qaime')).queryByText('Qeyd')).toBeNull()

    await userEvent.click(screen.getByRole('checkbox', { name: 'Qeyd' }))
    expect(within(screen.getByTestId('rep-qaime')).getByText('Qeyd')).toBeTruthy()

    await userEvent.selectOptions(screen.getByTestId('rep-pick'), 'abc')
    await userEvent.selectOptions(screen.getByTestId('rep-pick'), 'qaime')
    expect(within(screen.getByTestId('rep-qaime')).getByText('Qeyd')).toBeTruthy()
  })
})

describe('export tracks the selected report — 6732-6733 (M14-91, M14-95)', () => {
  /* THE equivalence test. Legacy's latched handlers close over REP_ROWS /
     REP_NAME; here the matrix is derived with the table. Either way, pressing
     «Excel» must export the report currently on screen. */
  it('exports the knt matrix under the knt slug by default', async () => {
    await renderPage()
    await userEvent.click(screen.getByTestId('rep-exp'))
    expect(xlsSpy).toHaveBeenCalledTimes(1)
    const [matrix, name] = xlsSpy.mock.calls[0]
    expect(name).toBe('kontragent_dovriyye')
    expect((matrix as unknown[][])[0]).toContain('Kontragent/Layihə')
  })

  it('exports the newly selected report after switching, not the previous one', async () => {
    await renderPage()
    await userEvent.selectOptions(screen.getByTestId('rep-pick'), 'abc')
    await userEvent.click(screen.getByTestId('rep-exp'))
    const [matrix, name] = xlsSpy.mock.calls[0]
    expect(name).toBe('abc_tehlili')
    expect((matrix as unknown[][])[0]).toEqual(['Sinif', 'Kod', 'Mal', 'Anbar', 'Qalıq', 'Dəyər', 'Pay %'])
  })

  it('exports the qaimə matrix following the current column selection', async () => {
    await renderPage()
    await userEvent.selectOptions(screen.getByTestId('rep-pick'), 'qaime')
    await userEvent.click(screen.getByRole('checkbox', { name: 'Qeyd' }))
    await userEvent.click(screen.getByTestId('rep-exp'))
    const [matrix, name] = xlsSpy.mock.calls[0]
    expect(name).toBe('qaimeler_uzre')
    expect((matrix as unknown[][])[0]).toContain('Qeyd')
  })
})

describe('print header — 6732 (M14-93, M14-94)', () => {
  /* The header is undated until the user prints (PrintHead's contract), so
     the title is asserted on the element itself. */
  it('titles the sheet with the export slug, not the option label', async () => {
    await renderPage()
    expect(document.querySelector('#printhead .ph-t')?.textContent)
      .toBe('Hesabat: kontragent_dovriyye')
  })

  it('retitles when the selected report changes', async () => {
    await renderPage()
    await userEvent.selectOptions(screen.getByTestId('rep-pick'), 'tr')
    expect(document.querySelector('#printhead .ph-t')?.textContent)
      .toBe('Hesabat: yerdeyisme_matrisi')
  })

  /* M14-94 — the count excludes the header row.

     The fixture yields THREE byPartner groups: «Alfa», «Beta» and «Astara
     anbarına» — a transfer's partner text is a partner key like any other
     (index.html:1296), so it forms its own group. The knt matrix is therefore
     4 rows and the printed count is 3.

     An earlier draft asserted «2 sətir» from an uncounted guess; the count is
     derived from the fixture here instead, and the second assertion makes the
     test non-vacuous by pinning that the count is NOT the matrix length. */
  it('stamps the row count excluding the header when printed', async () => {
    const printSpy = vi.fn()
    Object.defineProperty(window, 'print', { value: printSpy, writable: true })
    vi.useFakeTimers({ shouldAdvanceTime: true })
    await renderPage()

    await userEvent.click(screen.getByTestId('rep-print'))
    vi.advanceTimersByTime(100)
    expect(printSpy).toHaveBeenCalled()

    const sub = document.querySelector('#printhead .ph-s')?.textContent ?? ''
    /* 3 partner groups → a 4-row matrix → «3 sətir», the header excluded. */
    expect(sub).toContain('3 sətir')
    expect(sub).not.toContain('4 sətir')
    vi.useRealTimers()
  })
})

describe('load and refresh surfaces — M14-14', () => {
  it('shows a load error when the first snapshot fails', async () => {
    vi.mocked(fetchReportsSnapshot).mockResolvedValue({ ok: false, error: 'ilk xəta' } as never)
    render(<ReportsPage me={me} />)
    expect(await screen.findByTestId('rep-load-error')).toBeTruthy()
    expect(screen.queryByTestId('rep-out')).toBeNull()
  })

  /* A failed REFRESH keeps the report on screen and only flags it. */
  it('keeps the rendered report when a later refresh fails', async () => {
    await renderPage()
    vi.mocked(fetchReportsSnapshot).mockResolvedValue({ ok: false, error: 'yenilənmə xətası' } as never)
    await act(async () => {
      await useReportsStore.getState().load()
    })

    expect(await screen.findByTestId('rep-refresh-error')).toBeTruthy()
    expect(screen.getByTestId('rep-out')).toBeTruthy()
    expect(screen.getByTestId('rep-knt')).toBeTruthy()
  })
})

describe('rendered content spot-checks', () => {
  it('resolves the VÖEN for a known partner and an em-dash for an unknown one', async () => {
    await renderPage()
    const table = within(screen.getByTestId('rep-knt'))
    expect(table.getByText('1234567890')).toBeTruthy()
    /* «Beta» is not in the partner directory — its VÖEN cell is an em-dash. */
    expect(table.getByText('Beta')).toBeTruthy()
  })

  /* M14-59 — the stale hint is on screen verbatim. */
  it('renders the stale ABC hint verbatim', async () => {
    await renderPage()
    await userEvent.selectOptions(screen.getByTestId('rep-pick'), 'abc')
    expect(screen.getByText('İlk 200 sətir göstərilir — tam siyahı üçün CSV ixrac edin.')).toBeTruthy()
  })

  /* M14-65 / M14-66 — the transfer resolves «Astara anbarına» by prefix. */
  it('renders the resolved transfer corridor', async () => {
    await renderPage()
    await userEvent.selectOptions(screen.getByTestId('rep-pick'), 'tr')
    const table = within(screen.getByTestId('rep-tr'))
    expect(table.getByText('Elet')).toBeTruthy()
    expect(table.getByText('Astara')).toBeTruthy()
  })

  /* M14-75 — the transfer row carries no Qaimə № and appears in no group. */
  it('omits a row without a Qaimə № from the qaimə report', async () => {
    await renderPage()
    await userEvent.selectOptions(screen.getByTestId('rep-pick'), 'qaime')
    const table = within(screen.getByTestId('rep-qaime'))
    expect(table.getByText('IV-1')).toBeTruthy()
    expect(table.getByText('IV-2')).toBeTruthy()
    expect(table.queryByText('D-3')).toBeNull()
  })
})
