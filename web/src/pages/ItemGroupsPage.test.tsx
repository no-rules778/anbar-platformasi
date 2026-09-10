import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const fetchItemGroupsSnapshot = vi.fn()
vi.mock('../api/itemGroupsSnapshot.api', () => ({
  fetchItemGroupsSnapshot: () => fetchItemGroupsSnapshot(),
}))

const xlsGroupsMock = vi.fn()
vi.mock('../lib/xlsGroups', () => ({
  xlsGroups: (...a: unknown[]) => xlsGroupsMock(...a),
}))

const realtimeCalls: { tables: readonly string[]; enabled: boolean }[] = []
const unsubscribed = vi.fn()
vi.mock('../hooks/useRealtimeRefresh', async () => {
  const { useEffect } = await import('react')
  return {
    useRealtimeRefresh: (enabled: boolean, tables: readonly string[]) => {
      realtimeCalls.push({ enabled, tables })
      useEffect(() => () => { unsubscribed() }, [])
    },
  }
})

import { ItemGroupsPage } from './ItemGroupsPage'
import { useItemGroupsStore } from '../store/itemGroups.store'
import { useToastStore } from '../store/toast.store'
import { EMPTY_GROUP_FILTERS } from '../lib/groupFilters'
import type { MovementRow } from '../api/itemMovements.api'
import type { Me } from '../lib/roles'

const admin: Me = { id: 'u', sbId: 'u', email: 'a@b.c', name: 'Admin', role: 'admin', wh: '' }
const anbardar: Me = { id: 'u2', sbId: 'u2', email: 'w@b.c', name: 'W', role: 'anbardar', wh: 'Astara' }

const mv = (p: Partial<MovementRow>): MovementRow => ({
  id: 'm1', item_code: 'C1', warehouse: 'Ələt', date: '2026-01-01',
  in_qty: 10, out_qty: 0, price: 5, partner: 'P', type: 'Satınalma',
  invoice_num: null, note: null, doc_num: null, created_at: '2026-01-01T00:00:00Z', ...p,
})

function snap(over: Record<string, unknown> = {}) {
  return {
    items: [
      { code: '0000152', name: 'Vintli nasos', unit: 'ədəd', price: 999, category: 'Nasos' },
      { code: '0000200', name: 'Boru', unit: 'metr', price: 5, category: null },
    ],
    movements: [
      mv({ id: 'a', item_code: '0000152', warehouse: 'Ələt', in_qty: 10, price: 12 }),
      mv({ id: 'b', item_code: '0000200', warehouse: 'Astara', in_qty: 4, price: 0 }),
    ],
    warehouses: ['Ələt', 'Astara', 'Harmony'],
    categories: ['Nasos'],
    refsReady: true,
    ...over,
  }
}

function resetStore() {
  useItemGroupsStore.setState({
    items: [], itemBy: new Map(), lastPurchase: new Map(),
    indexes: { byItem: new Map(), bal: [], priceObs: new Map(), operational: [] },
    warehouses: [], categories: [], refsReady: false,
    loading: false, error: null, loaded: false,
    filters: { ...EMPTY_GROUP_FILTERS, whs: new Set(), cats: new Set() },
    selection: new Set(), showAll: false,
  })
  useToastStore.setState({ messages: [] })
}

beforeEach(() => {
  vi.clearAllMocks()
  realtimeCalls.length = 0
  resetStore()
  fetchItemGroupsSnapshot.mockResolvedValue({ ok: true, snapshot: snap() })
  xlsGroupsMock.mockReturnValue({ ok: true, count: 1 })
})

const toasts = () => useToastStore.getState().messages.map((m) => m.text)

/* M6-S1 — the correction that matters most for a first-time visitor. */
describe('direct navigation (M6-S1)', () => {
  it('loads its own data on mount, without visiting Nomenklatura first', async () => {
    render(<ItemGroupsPage me={admin} />)
    await waitFor(() => expect(fetchItemGroupsSnapshot).toHaveBeenCalledTimes(1))
    expect(await screen.findByText('Vintli nasos')).toBeTruthy()
  })

  it('does not refetch when the store already holds a snapshot (navigate away and back)', async () => {
    const first = render(<ItemGroupsPage me={admin} />)
    await waitFor(() => expect(fetchItemGroupsSnapshot).toHaveBeenCalledTimes(1))
    first.unmount()

    render(<ItemGroupsPage me={admin} />)
    await waitFor(() => expect(screen.getByText('Vintli nasos')).toBeTruthy())
    expect(fetchItemGroupsSnapshot).toHaveBeenCalledTimes(1)
  })

  it('keeps filters and selection across unmount/remount', async () => {
    const first = render(<ItemGroupsPage me={admin} />)
    await screen.findByText('Vintli nasos')
    await userEvent.click(screen.getByLabelText('Seç 0000152 Ələt'))
    first.unmount()

    render(<ItemGroupsPage me={admin} />)
    expect(await screen.findByText('1 sətir seçilib')).toBeTruthy()
  })
})

describe('Realtime (Q2, M6-42)', () => {
  it('watches only items, movements and warehouses — never audit_log', async () => {
    render(<ItemGroupsPage me={admin} />)
    await screen.findByText('Vintli nasos')
    expect(realtimeCalls[0].tables).toEqual(['items', 'movements', 'warehouses'])
    expect(realtimeCalls[0].tables).not.toContain('audit_log')
  })

  it('tears the subscription down on unmount', async () => {
    const view = render(<ItemGroupsPage me={admin} />)
    await screen.findByText('Vintli nasos')
    view.unmount()
    expect(unsubscribed).toHaveBeenCalled()
  })
})

describe('rows and scope (M6-10, M6-11, M6-S6, M6-S7)', () => {
  it('renders positive-balance rows with the last-purchase price', async () => {
    render(<ItemGroupsPage me={admin} />)
    expect(await screen.findByText('Vintli nasos')).toBeTruthy()
    expect(screen.getByText('0000152')).toBeTruthy()
    expect(screen.getByText('12,00')).toBeTruthy() // last purchase, not items.price 999
  })

  it('shows an em-dash for a row with no valid purchase price', async () => {
    render(<ItemGroupsPage me={admin} />)
    await screen.findByText('Boru')
    const row = screen.getByText('Boru').closest('tr')!
    expect(row.textContent).toContain('—')
    expect(row.textContent).not.toContain('5,00') // items.price is not used
  })

  it('an anbardar sees only their own warehouse, not the source group', async () => {
    render(<ItemGroupsPage me={anbardar} />)
    await waitFor(() => expect(fetchItemGroupsSnapshot).toHaveBeenCalled())
    expect(await screen.findByText('Boru')).toBeTruthy() // Astara row
    expect(screen.queryByText('Vintli nasos')).toBeNull() // Ələt row excluded
    // Harmony is in the same source group but must NOT appear as a filter.
    expect(screen.queryByText('Harmony')).toBeNull()
    // Astara appears twice (filter tag + table cell); one filter tag is enough.
    expect(screen.getAllByText('Astara').length).toBeGreaterThan(0)
  })

  it('renders the raw stored warehouse value in the table', async () => {
    fetchItemGroupsSnapshot.mockResolvedValue({
      ok: true,
      snapshot: snap({
        warehouses: ['Xocahəsən'],
        movements: [mv({ id: 'a', item_code: '0000152', warehouse: 'Xocahəsən', in_qty: 3, price: 12 })],
      }),
    })
    render(<ItemGroupsPage me={admin} />)
    await screen.findByText('Vintli nasos')
    const row = screen.getByText('Vintli nasos').closest('tr')!
    expect(row.textContent).toContain('Xocahəsən') // not the «Xocəsən» label
  })

  it('labels the warehouse FILTER with whLabel, as the original does', async () => {
    fetchItemGroupsSnapshot.mockResolvedValue({
      ok: true, snapshot: snap({ warehouses: ['Xocahəsən'] }),
    })
    render(<ItemGroupsPage me={admin} />)
    await waitFor(() => expect(fetchItemGroupsSnapshot).toHaveBeenCalled())
    expect(await screen.findByText('Xocəsən')).toBeTruthy()
  })

  it('shows the legacy empty-warehouse message', async () => {
    fetchItemGroupsSnapshot.mockResolvedValue({ ok: true, snapshot: snap({ warehouses: [] }) })
    render(<ItemGroupsPage me={admin} />)
    expect(await screen.findByText('İcazəli anbar yoxdur')).toBeTruthy()
  })
})

describe('filters (M6-15, M6-18, M6-21, M6-23)', () => {
  it('offers CAT_UNSET plus the loaded active categories', async () => {
    render(<ItemGroupsPage me={admin} />)
    await screen.findByText('Vintli nasos')
    // Once as the filter tag, once as the Boru row's category cell.
    expect(screen.getAllByText('Təyin edilməyib').length).toBe(2)
    expect(screen.getAllByText('Nasos').length).toBeGreaterThan(0)
  })

  it('shows the validation error instead of the table, in both places', async () => {
    render(<ItemGroupsPage me={admin} />)
    await screen.findByText('Vintli nasos')

    await userEvent.type(screen.getByLabelText('Min qiymət'), '50')
    await userEvent.type(screen.getByLabelText('Max qiymət'), '10')

    expect(await screen.findByText('Süzgəc xətası')).toBeTruthy()
    await waitFor(() => {
      expect(screen.getAllByText('Min qiymət Max qiymətdən böyük ola bilməz').length).toBeGreaterThan(0)
    })
    expect(screen.queryByText('0000152')).toBeNull()
  })

  /* The pruning effect must not run while the range is INVALID.

     `rows` is empty then only because groupRows() refused to compute, not
     because the rows stopped matching — the original returns at 2795 before
     touching GRP.sel. Pruning against that empty list would wipe a selection
     the user is about to get back by fixing a half-typed bound.

     Note what this does NOT claim: a VALID intermediate state prunes normally.
     Typing «50» into Min commits min=50 with Max still blank, which is a legal
     filter that legitimately drops a row priced 12 — the original's own
     per-keystroke debounce (2789-2791) behaves the same way. */
  it('does not prune the selection while a validation error is showing', async () => {
    render(<ItemGroupsPage me={admin} />)
    await screen.findByText('Vintli nasos')
    await userEvent.click(screen.getByLabelText('Seç 0000152 Ələt'))
    await screen.findByText('1 sətir seçilib')

    // Max alone is invalid (negative) — never a valid intermediate state.
    await userEvent.type(screen.getByLabelText('Max qiymət'), '-5')
    await screen.findByText('Süzgəc xətası')

    expect(useItemGroupsStore.getState().selection.has('0000152|Ələt')).toBe(true)
    expect(screen.getByText('1 sətir seçilib')).toBeTruthy()
  })

  it('reset clears the inputs and the selection', async () => {
    render(<ItemGroupsPage me={admin} />)
    await screen.findByText('Vintli nasos')
    await userEvent.type(screen.getByLabelText('Axtarış'), 'nasos')
    await userEvent.click(screen.getByLabelText('Seç 0000152 Ələt'))
    await screen.findByText('1 sətir seçilib')

    await userEvent.click(screen.getByText('Süzgəcləri sıfırla'))

    expect((screen.getByLabelText('Axtarış') as HTMLInputElement).value).toBe('')
    expect(await screen.findByText('Sətir seçilməyib')).toBeTruthy()
  })
})

describe('selection (M6-26, M6-27)', () => {
  it('counts the selection and gates the export button', async () => {
    render(<ItemGroupsPage me={admin} />)
    await screen.findByText('Vintli nasos')

    const btn = screen.getByText('⬇ Seçilənləri Excel-ə ixrac et') as HTMLButtonElement
    expect(btn.disabled).toBe(true)
    expect(screen.getByText('Sətir seçilməyib')).toBeTruthy()

    await userEvent.click(screen.getByLabelText('Seç 0000152 Ələt'))
    expect(await screen.findByText('1 sətir seçilib')).toBeTruthy()
    expect((screen.getByText('⬇ Seçilənləri Excel-ə ixrac et') as HTMLButtonElement).disabled).toBe(false)
  })

  it('drops a selection that leaves the filtered set', async () => {
    render(<ItemGroupsPage me={admin} />)
    await screen.findByText('Vintli nasos')
    await userEvent.click(screen.getByLabelText('Seç 0000152 Ələt'))
    await screen.findByText('1 sətir seçilib')

    await userEvent.type(screen.getByLabelText('Axtarış'), 'boru')
    expect(await screen.findByText('Sətir seçilməyib')).toBeTruthy()
  })
})

describe('export (M6-28…M6-32)', () => {
  async function selectAndExport() {
    render(<ItemGroupsPage me={admin} />)
    await screen.findByText('Vintli nasos')
    await userEvent.click(screen.getByLabelText('Seç 0000152 Ələt'))
    await screen.findByText('1 sətir seçilib')
    await userEvent.click(screen.getByText('⬇ Seçilənləri Excel-ə ixrac et'))
  }

  it('refreshes immediately before writing, then exports', async () => {
    await selectAndExport()
    await waitFor(() => expect(xlsGroupsMock).toHaveBeenCalledTimes(1))
    expect(fetchItemGroupsSnapshot).toHaveBeenCalledTimes(2) // mount + refresh
    await waitFor(() => expect(toasts()).toContain('mal_qruplari.xlsx yükləndi (1 sətir)'))
  })

  it('ABORTS and reports the real error when the refresh fails', async () => {
    render(<ItemGroupsPage me={admin} />)
    await screen.findByText('Vintli nasos')
    await userEvent.click(screen.getByLabelText('Seç 0000152 Ələt'))

    fetchItemGroupsSnapshot.mockResolvedValue({ ok: false, error: 'movements down' })
    await userEvent.click(screen.getByText('⬇ Seçilənləri Excel-ə ixrac et'))

    await waitFor(() => {
      expect(toasts()).toContain('Məlumat yenilənmədi — ixrac dayandırıldı: movements down')
    })
    expect(xlsGroupsMock).not.toHaveBeenCalled()
    // the previous rows are still on screen — nothing was blanked
    expect(screen.getByText('Vintli nasos')).toBeTruthy()
  })

  it('aborts when the refresh REJECTS rather than returning a failure', async () => {
    render(<ItemGroupsPage me={admin} />)
    await screen.findByText('Vintli nasos')
    await userEvent.click(screen.getByLabelText('Seç 0000152 Ələt'))

    fetchItemGroupsSnapshot.mockRejectedValue(new Error('socket closed'))
    await userEvent.click(screen.getByText('⬇ Seçilənləri Excel-ə ixrac et'))

    await waitFor(() => expect(toasts().some((t) => t.includes('socket closed'))).toBe(true))
    expect(xlsGroupsMock).not.toHaveBeenCalled()
  })

  it('prunes rows that lost their positive balance and reports the exact count', async () => {
    render(<ItemGroupsPage me={admin} />)
    await screen.findByText('Vintli nasos')
    await userEvent.click(screen.getByLabelText('Seç 0000152 Ələt'))
    await userEvent.click(screen.getByLabelText('Seç 0000200 Astara'))
    await screen.findByText('2 sətir seçilib')

    // Boru's balance is consumed before the export refresh.
    fetchItemGroupsSnapshot.mockResolvedValue({
      ok: true,
      snapshot: snap({
        movements: [
          mv({ id: 'a', item_code: '0000152', warehouse: 'Ələt', in_qty: 10, price: 12 }),
          mv({ id: 'b', item_code: '0000200', warehouse: 'Astara', in_qty: 4, price: 0 }),
          mv({ id: 'c', item_code: '0000200', warehouse: 'Astara', in_qty: 0, out_qty: 4, price: 0, type: 'Silinmə' }),
        ],
      }),
    })
    await userEvent.click(screen.getByText('⬇ Seçilənləri Excel-ə ixrac et'))

    await waitFor(() => expect(xlsGroupsMock).toHaveBeenCalledTimes(1))
    expect((xlsGroupsMock.mock.calls[0][0] as unknown[]).length).toBe(1)
    await waitFor(() => {
      expect(toasts()).toContain('1 sətir qalıqsız olduğu üçün ixracdan çıxarıldı')
    })
  })

  it('aborts with the legacy message when NO selected row survives', async () => {
    render(<ItemGroupsPage me={admin} />)
    await screen.findByText('Boru')
    await userEvent.click(screen.getByLabelText('Seç 0000200 Astara'))

    fetchItemGroupsSnapshot.mockResolvedValue({
      ok: true,
      snapshot: snap({
        movements: [
          mv({ id: 'b', item_code: '0000200', warehouse: 'Astara', in_qty: 4, price: 0 }),
          mv({ id: 'c', item_code: '0000200', warehouse: 'Astara', in_qty: 0, out_qty: 4, price: 0, type: 'Silinmə' }),
        ],
      }),
    })
    await userEvent.click(screen.getByText('⬇ Seçilənləri Excel-ə ixrac et'))

    await waitFor(() => {
      expect(toasts()).toContain('Seçilmiş sətirlərin müsbət qalığı qalmayıb — ixrac dayandırıldı')
    })
    expect(xlsGroupsMock).not.toHaveBeenCalled()
  })

  it('reports a SheetJS failure and claims no download', async () => {
    xlsGroupsMock.mockReturnValue({ ok: false, count: 0, error: 'Excel kitabxanası yüklənmədi' })
    await selectAndExport()
    await waitFor(() => expect(toasts()).toContain('Excel kitabxanası yüklənmədi'))
    expect(toasts().some((t) => t.includes('yükləndi ('))).toBe(false)
  })

  it('passes a snapshot timestamp taken after the successful refresh', async () => {
    await selectAndExport()
    await waitFor(() => expect(xlsGroupsMock).toHaveBeenCalled())
    const ts = xlsGroupsMock.mock.calls[0][1] as number
    expect(typeof ts).toBe('number')
    expect(ts).toBeGreaterThan(0)
  })
})

describe('load failure (M6-S3, M6-S4, M6-S17)', () => {
  it('shows the real error and no rows when the initial load fails', async () => {
    fetchItemGroupsSnapshot.mockResolvedValue({ ok: false, error: 'items down' })
    render(<ItemGroupsPage me={admin} />)
    await waitFor(() => expect(screen.getByText('items down')).toBeTruthy())
    expect(screen.queryByText('0000152')).toBeNull()
  })

  /* A01 / M6-S17 — the audit finding.

     Absence of rows was previously the only assertion, which passed while the
     screen simultaneously claimed «Nəticə yoxdur / Bu süzgəclərə uyğun müsbət
     qalıq yoxdur» — a calculated zero-result the platform had never computed.
     These assertions are the ones that fail against the pre-fix render. */
  it('does NOT claim an empty result when the initial load failed', async () => {
    fetchItemGroupsSnapshot.mockResolvedValue({ ok: false, error: 'items down' })
    render(<ItemGroupsPage me={admin} />)
    await waitFor(() => expect(screen.getByText('items down')).toBeTruthy())

    expect(screen.queryByText('Nəticə yoxdur')).toBeNull()
    expect(screen.queryByText('Bu süzgəclərə uyğun müsbət qalıq yoxdur.')).toBeNull()
    // and no row-count claim either — there is no count to report
    expect(screen.queryByText(/sətir \(müsbət qalıq\)/)).toBeNull()
  })

  it('shows an explicit load-error state instead', async () => {
    fetchItemGroupsSnapshot.mockResolvedValue({ ok: false, error: 'items down' })
    render(<ItemGroupsPage me={admin} />)
    expect(await screen.findByText('Məlumat yüklənmədi')).toBeTruthy()
    // the real error is shown once, not duplicated across table and footer
    expect(screen.getAllByText('items down')).toHaveLength(1)
  })

  it('a movements failure is fatal and reported, not shown as zero balance', async () => {
    fetchItemGroupsSnapshot.mockResolvedValue({ ok: false, error: 'movements down' })
    render(<ItemGroupsPage me={admin} />)
    expect(await screen.findByText('Məlumat yüklənmədi')).toBeTruthy()
    expect(screen.getByText('movements down')).toBeTruthy()
    expect(screen.queryByText('Nəticə yoxdur')).toBeNull()
  })

  /* The other half of M6-S3, unchanged by this fix: once a good snapshot
     exists, a later failure keeps the rows and reports the error in the
     footer — it must NOT fall into the load-error state. */
  it('a failed REFRESH keeps the rows and shows the error in the footer', async () => {
    render(<ItemGroupsPage me={admin} />)
    await screen.findByText('Vintli nasos')

    fetchItemGroupsSnapshot.mockResolvedValue({ ok: false, error: 'refresh failed' })
    await act(async () => { await useItemGroupsStore.getState().refresh() })

    expect(screen.getByText('Vintli nasos')).toBeTruthy() // rows retained
    expect(screen.getByText('refresh failed')).toBeTruthy()
    expect(screen.queryByText('Məlumat yüklənmədi')).toBeNull()
    expect(screen.getByText(/2 sətir \(müsbət qalıq\)/)).toBeTruthy()
  })

  it('an empty-but-successful load still shows the genuine empty result', async () => {
    fetchItemGroupsSnapshot.mockResolvedValue({
      ok: true, snapshot: snap({ items: [], movements: [] }),
    })
    render(<ItemGroupsPage me={admin} />)
    expect(await screen.findByText('Nəticə yoxdur')).toBeTruthy()
    expect(screen.queryByText('Məlumat yüklənmədi')).toBeNull()
  })
})

describe('show-all cut (M6-09, M6-12)', () => {
  it('reports the row count in the pager', async () => {
    render(<ItemGroupsPage me={admin} />)
    await screen.findByText('Vintli nasos')
    expect(screen.getByText(/2 sətir \(müsbət qalıq\)/)).toBeTruthy()
  })

  /* 3005 rows render slowly in jsdom, so this case gets a wider budget than
     the 5 s default; it is the only test that crosses the SHOW_MAX boundary. */
  it('offers «Hamısını göstər» past the cut and keeps it sticky across a filter change', { timeout: 60000 }, async () => {
    const items = []
    const movements = []
    for (let i = 0; i < 3005; i++) {
      const code = String(i).padStart(7, '0')
      items.push({ code, name: 'Mal ' + code, unit: 'ədəd', price: 1, category: 'Nasos' })
      movements.push(mv({ id: 'x' + i, item_code: code, warehouse: 'Ələt', in_qty: 1, price: 3 }))
    }
    fetchItemGroupsSnapshot.mockResolvedValue({
      ok: true, snapshot: snap({ items, movements, warehouses: ['Ələt'] }),
    })

    render(<ItemGroupsPage me={admin} />)
    const btn = await screen.findByText(/Hamısını göstər/)
    await act(async () => { await userEvent.click(btn) })

    await waitFor(() => expect(screen.queryByText(/Hamısını göstər/)).toBeNull())
    expect(useItemGroupsStore.getState().showAll).toBe(true)

    // A filter change must NOT collapse it back.
    act(() => { useItemGroupsStore.getState().setFilters({ q: 'mal' }) })
    expect(useItemGroupsStore.getState().showAll).toBe(true)
  })
})
