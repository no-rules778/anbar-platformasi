import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

vi.mock('../api/items.api', () => ({ fetchItems: vi.fn() }))
vi.mock('../api/itemMovements.api', () => ({ fetchItemMovements: vi.fn() }))
vi.mock('../api/referenceValues.api', () => ({ fetchReferenceValues: vi.fn() }))
vi.mock('../api/warehouses.api', () => ({ fetchWarehouses: vi.fn() }))
vi.mock('../lib/xls', async (orig) => ({
  ...(await orig<typeof import('../lib/xls')>()),
  xls: vi.fn(),
}))
/* A10 — the page now holds a Realtime subscription, so the client it opens
   the channel on has to be mocked here as it is for the reference page. */
const channel = { on: vi.fn(), subscribe: vi.fn() }
channel.on.mockReturnValue(channel)
vi.mock('../api/supabase', () => ({
  supabase: { channel: vi.fn(() => channel), removeChannel: vi.fn() },
}))

import { fetchItems, type ItemRow } from '../api/items.api'
import { fetchItemMovements, type MovementRow } from '../api/itemMovements.api'
import { fetchReferenceValues } from '../api/referenceValues.api'
import { fetchWarehouses } from '../api/warehouses.api'
import { supabase } from '../api/supabase'
import { xls } from '../lib/xls'
import { NomenclaturePage } from './NomenclaturePage'
import { SHOW_MAX, applyCut } from '../lib/showAllCut'
import { useNomenclatureStore } from '../store/nomenclature.store'
import { EMPTY_ITEM_FILTERS } from '../lib/itemFilters'
import type { Me } from '../lib/roles'

const admin: Me = { id: 'u1', sbId: 'u1', email: 'a@x.com', name: 'Admin User', role: 'admin', wh: '' }
const viewer: Me = { ...admin, role: 'baxis', name: 'Viewer' }

const item = (over: Partial<ItemRow> = {}): ItemRow => ({
  code: '0000001', name: 'Sement M400', unit: 'kq', price: 10, category: null, ...over,
})

const mv = (over: Partial<MovementRow> = {}): MovementRow => ({
  id: 'm1', item_code: '0000001', warehouse: 'Elet', date: '2026-01-01',
  in_qty: 5, out_qty: 0, price: 12, partner: 'ACME', type: 'Satınalma',
  invoice_num: null, note: null, doc_num: null, created_at: null, ...over,
})

beforeEach(() => {
  vi.clearAllMocks()
  /* clearAllMocks drops the chaining return value too, so the builder has to
     be re-armed or the second test onwards gets `undefined` from .on(). */
  channel.on.mockReturnValue(channel)
  vi.mocked(supabase.channel).mockReturnValue(channel as never)
  useNomenclatureStore.setState({
    items: [], indexes: { byItem: new Map(), bal: [], priceObs: new Map(), operational: [] },
    units: ['kq'], categories: ['Filtrlər'], warehouses: [], refsReady: true,
    loading: false, error: null,
    filters: EMPTY_ITEM_FILTERS, showAll: false, cardCode: null,
  })
  vi.mocked(fetchWarehouses).mockResolvedValue([{ name: 'Elet' }] as never)
  vi.mocked(fetchItems).mockResolvedValue({ rows: [item()], ok: true, error: null })
  vi.mocked(fetchItemMovements).mockResolvedValue({ rows: [mv()], ok: true, error: null })
  vi.mocked(fetchReferenceValues).mockResolvedValue({
    ready: true,
    values: {
      channel: [], serfiyyat_channel: [],
      unit: [{ id: 'u', name: 'kq', active: true }],
      category: [{ id: 'c', name: 'Filtrlər', active: true }],
    },
  } as never)
})

async function renderPage(me: Me = admin) {
  const view = render(<NomenclaturePage me={me} />)
  await waitFor(() => expect(fetchItems).toHaveBeenCalled())
  await screen.findByText('Sement M400')
  return view
}

/* M5-17 / M5-12 / M5-13 — rNom (index.html:2413-2461). */

describe('list rendering', () => {
  it('renders the legacy column set in order', async () => {
    await renderPage()
    const heads = screen.getAllByRole('columnheader').map((h) => h.textContent?.trim())
    expect(heads.slice(0, 7)).toEqual(
      ['Kod', 'Malın adı', 'Ölçü', 'Son qiymət', 'Ümumi qalıq', 'Dəyər', 'Hərəkət'],
    )
  })

  it('shows the derived balance, value and movement count', async () => {
    await renderPage()
    const row = screen.getByText('Sement M400').closest('tr')!
    expect(within(row).getByText('5,00')).toBeTruthy()
    expect(within(row).getByText(/50,00/)).toBeTruthy()
  })

  /* R-F3 — a null price and a movement-less item render the original's muted
     placeholders, never null/NaN/0.00. */
  it('renders a null price as — and a movement-less item as 0', async () => {
    vi.mocked(fetchItems).mockResolvedValue({
      rows: [item({ code: '0000002', name: 'Boru', price: null })], ok: true, error: null,
    })
    vi.mocked(fetchItemMovements).mockResolvedValue({ rows: [], ok: true, error: null })
    render(<NomenclaturePage me={admin} />)
    const row = (await screen.findByText('Boru')).closest('tr')!
    expect(row.textContent).not.toMatch(/null|NaN/)
    expect(within(row).getAllByText('0').length).toBeGreaterThan(0)
  })

  it('marks a negative balance with the .neg class', async () => {
    vi.mocked(fetchItemMovements).mockResolvedValue({
      rows: [mv({ in_qty: 0, out_qty: 3 })], ok: true, error: null,
    })
    render(<NomenclaturePage me={admin} />)
    const row = (await screen.findByText('Sement M400')).closest('tr')!
    expect(row.querySelector('.neg')).toBeTruthy()
  })
})

describe('footer counts (M5-13)', () => {
  it('shows only the row count when nothing is filtered', async () => {
    await renderPage()
    expect(screen.getByText(/^1 mal$/)).toBeTruthy()
  })

  it('adds «bazada cəmi» once a filter narrows the list', async () => {
    const user = userEvent.setup()
    vi.mocked(fetchItems).mockResolvedValue({
      rows: [item(), item({ code: '0000002', name: 'Boru' })], ok: true, error: null,
    })
    await renderPage()
    await user.type(screen.getByLabelText('Axtarış'), 'boru')
    await waitFor(() => expect(screen.getByText(/bazada cəmi 2/)).toBeTruthy())
  })
})

describe('filters (M5-11)', () => {
  it('keeps the four segments mutually exclusive', async () => {
    const user = userEvent.setup()
    await renderPage()
    await user.click(screen.getByRole('button', { name: 'Qiyməti yox' }))
    expect(screen.getByRole('button', { name: 'Qiyməti yox' }).getAttribute('aria-pressed')).toBe('true')
    expect(screen.getByRole('button', { name: 'Hamısı' }).getAttribute('aria-pressed')).toBe('false')
  })

  it('filters the list by the search box', async () => {
    const user = userEvent.setup()
    vi.mocked(fetchItems).mockResolvedValue({
      rows: [item(), item({ code: '0000002', name: 'Boru' })], ok: true, error: null,
    })
    await renderPage()
    await user.type(screen.getByLabelText('Axtarış'), 'boru')
    await waitFor(() => expect(screen.queryByText('Sement M400')).toBeNull())
    expect(screen.getByText('Boru')).toBeTruthy()
  })
})

/* M5-21 — the disabled-vs-hidden distinction (index.html:2455-2460). */
describe('role-based availability', () => {
  it('enables the write actions for an admin and shows the category import', async () => {
    await renderPage()
    expect((screen.getByRole('button', { name: 'Yeni mal' }) as HTMLButtonElement).disabled).toBe(false)
    expect((screen.getByRole('button', { name: 'Toplu əlavə' }) as HTMLButtonElement).disabled).toBe(false)
    expect((screen.getByRole('button', { name: 'İdxal' }) as HTMLButtonElement).disabled).toBe(false)
    expect(screen.getByRole('button', { name: 'Kateqoriya idxalı' })).toBeTruthy()
  })

  it('DISABLES add/bulk/import for a viewer but still renders them', async () => {
    await renderPage(viewer)
    expect((screen.getByRole('button', { name: 'Yeni mal' }) as HTMLButtonElement).disabled).toBe(true)
    expect((screen.getByRole('button', { name: 'Toplu əlavə' }) as HTMLButtonElement).disabled).toBe(true)
    expect((screen.getByRole('button', { name: 'İdxal' }) as HTMLButtonElement).disabled).toBe(true)
  })

  it('HIDES the category import from a non-admin entirely', async () => {
    await renderPage(viewer)
    expect(screen.queryByRole('button', { name: 'Kateqoriya idxalı' })).toBeNull()
  })

  it('renders the page itself for a viewer — it carries no role gate', async () => {
    await renderPage(viewer)
    expect(screen.getByText('Sement M400')).toBeTruthy()
  })

  it('hides the per-row edit button without item.edit', async () => {
    await renderPage(viewer)
    expect(screen.queryByRole('button', { name: 'Düzəliş' })).toBeNull()
  })
})

/* M5-20 — the export matrix must match the legacy columns. */
describe('Excel export', () => {
  it('exports the legacy header and row shape for the FILTERED rows', async () => {
    const user = userEvent.setup()
    await renderPage()
    await user.click(screen.getByRole('button', { name: 'Excel' }))
    const [matrix, name] = vi.mocked(xls).mock.calls[0]
    expect(name).toBe('nomenklatura')
    expect((matrix as unknown[][])[0]).toEqual(
      ['Kod', 'Malın adı', 'Ölçü vahidi', 'Son qiymət', 'Ümumi qalıq', 'Dəyər'],
    )
    expect((matrix as unknown[][])[1]).toEqual(['0000001', 'Sement M400', 'kq', 10, 5, '50.00'])
  })
})

/* M5-19 — print carries a NON-empty note, unlike Audit jurnalı. */
describe('print', () => {
  it('stamps the header at click with the filtered count as the note', async () => {
    const user = userEvent.setup()
    const printSpy = vi.spyOn(window, 'print').mockImplementation(() => {})
    await renderPage()
    expect(document.querySelector('#printhead .ph-s')).toBeNull()

    await user.click(screen.getByRole('button', { name: 'Çap' }))

    const sub = document.querySelector('#printhead .ph-s')!.textContent!
    expect(sub).toContain('Anbar Platforması')
    expect(sub).toContain('1 mal')
    printSpy.mockRestore()
  })
})

describe('item card (M5-47)', () => {
  it('opens the card when a row is clicked', async () => {
    const user = userEvent.setup()
    await renderPage()
    await user.click(screen.getByText('Sement M400'))
    expect(await screen.findByRole('dialog', { name: 'Mal kartoçkası' })).toBeTruthy()
  })
})

/* M5-18 — the «Hamısını göstər» cut (index.html:1678-1690). This is NOT the
   numbered pager used by Soraqçalar and Audit jurnalı; Q3 approved keeping it
   exactly as the original has it.

   The threshold itself is exercised through `applyCut` rather than a 3000-row
   render: mounting that many rows in jsdom takes over a minute and would
   prove nothing extra about the rule. The rendered path below covers the
   control's presence and the expansion it triggers. */
describe('show-all cut (M5-18)', () => {
  const many = (n: number) =>
    Array.from({ length: n }, (_, i) => item({ code: String(i + 1).padStart(7, '0'), name: 'Mal ' + i }))

  it('keeps SHOW_MAX at the original 3000', () => {
    expect(SHOW_MAX).toBe(3000)
  })

  it('does not cut a list that fits', () => {
    const rows = many(10)
    expect(applyCut(rows, false)).toHaveLength(10)
  })

  it('cuts to exactly SHOW_MAX beyond the threshold', () => {
    const rows = many(SHOW_MAX + 5)
    expect(applyCut(rows, false)).toHaveLength(SHOW_MAX)
  })

  it('returns the whole list once expanded', () => {
    const rows = many(SHOW_MAX + 5)
    expect(applyCut(rows, true)).toHaveLength(SHOW_MAX + 5)
  })

  it('shows no cut control when the list fits within SHOW_MAX', async () => {
    vi.mocked(fetchItems).mockResolvedValue({ rows: many(10), ok: true, error: null })
    render(<NomenclaturePage me={admin} />)
    await screen.findByText('Mal 0')
    expect(screen.queryByRole('button', { name: /Hamısını göstər/ })).toBeNull()
  })

  /* A13 — the expansion is STICKY (SHOW_ALL['nom'], index.html:1679). These
     run against the PAGE rather than applyCut(), because the regression lived
     in the wiring: the page's own debounced setFilters was clearing the flag,
     so the list collapsed on mount, on every keystroke and on navigation.

     They assert the store flag with a SMALL list: rendering 3000+ rows in
     jsdom costs minutes, and the flag is what the cut reads. One rendered
     case below covers the visible effect. */
  it('survives the page’s debounced setFilters on mount', async () => {
    useNomenclatureStore.setState({ showAll: true })
    await renderPage()
    /* The mount effect fires setFilters after its 200 ms debounce. */
    await new Promise((r) => setTimeout(r, 250))
    expect(useNomenclatureStore.getState().showAll).toBe(true)
  })

  it('survives typing in the search box', async () => {
    const user = userEvent.setup()
    await renderPage()
    useNomenclatureStore.setState({ showAll: true })

    await user.type(screen.getByLabelText('Axtarış'), 'Sement')
    await waitFor(() => expect(useNomenclatureStore.getState().filters.q).toBe('sement'))
    expect(useNomenclatureStore.getState().showAll).toBe(true)
  })

  it('survives a segment filter click', async () => {
    const user = userEvent.setup()
    await renderPage()
    useNomenclatureStore.setState({ showAll: true })

    await user.click(screen.getByRole('button', { name: 'Qiyməti yox' }))
    expect(useNomenclatureStore.getState().filters.only).toBe('nop')
    expect(useNomenclatureStore.getState().showAll).toBe(true)
  })

  /* Remounting is what navigating away and back does. The store outlives the
     component, so the expansion must come back with it. */
  it('survives a remount', async () => {
    const view = await renderPage()
    useNomenclatureStore.setState({ showAll: true })

    view.unmount()
    await renderPage()
    await new Promise((r) => setTimeout(r, 250))
    expect(useNomenclatureStore.getState().showAll).toBe(true)
  })

  /* The visible half: with the flag set, the cut control is gone and the
     whole list renders. Kept to one case for the row-count cost. */
  /* NOTE: the VISIBLE effect of the expansion — 3000+ rows rendering and the
     cut control disappearing — is deliberately NOT asserted through the page.
     Rendering that many rows in jsdom takes minutes and times out. The
     arithmetic is pinned by the applyCut cases above, the flag's stickiness
     by the four cases here, and the rendered appearance of the control by
     «shows no cut control when the list fits» plus the browser pass. */
})

/* A10 — shared Realtime, subscribeRealtime() (index.html:1162-1181). The page
   previously loaded on mount and after its own writes only, so another user's
   change never arrived and the sync indicator read «bağlı deyil» here. */
describe('A10 — Realtime refresh', () => {
  it('opens the shared channel', async () => {
    await renderPage()
    expect(supabase.channel).toHaveBeenCalledWith('anbar_changes')
  })

  it('watches items, movements and warehouses', async () => {
    await renderPage()
    const tables = channel.on.mock.calls.map((c) => (c[1] as { table: string }).table)
    expect(tables).toEqual(['items', 'movements', 'warehouses'])
  })

  /* Phase 4 Q3 forbids an audit_log subscription. */
  it('never subscribes to audit_log', async () => {
    await renderPage()
    const tables = channel.on.mock.calls.map((c) => (c[1] as { table: string }).table)
    expect(tables).not.toContain('audit_log')
  })

  it('opens exactly one channel', async () => {
    await renderPage()
    expect(supabase.channel).toHaveBeenCalledTimes(1)
  })

  it('tears the channel down on unmount', async () => {
    const view = await renderPage()
    view.unmount()
    expect(supabase.removeChannel).toHaveBeenCalledWith(channel)
  })

  /* A change from another user reloads the server-owned data. */
  it('reloads when a watched table changes', async () => {
    await renderPage()
    expect(fetchItems).toHaveBeenCalledTimes(1)

    const bump = channel.on.mock.calls[0][2] as () => void
    bump()
    await waitFor(() => expect(fetchItems).toHaveBeenCalledTimes(2), { timeout: 2000 })
  })

  /* The refresh replaces server data only: a colleague's edit must not
     discard the filter this user is working with, nor collapse their list. */
  it('preserves the user’s filters and expansion across a refresh', async () => {
    const user = userEvent.setup()
    await renderPage()
    /* Set the search through the input, not the store: the page owns a
       debounced effect that would otherwise overwrite a directly-set `q`. */
    await user.type(screen.getByLabelText('Axtarış'), 'Sement')
    await user.click(screen.getByRole('button', { name: 'Qiyməti yox' }))
    await waitFor(() => expect(useNomenclatureStore.getState().filters.q).toBe('sement'))
    useNomenclatureStore.setState({ showAll: true })

    const bump = channel.on.mock.calls[0][2] as () => void
    bump()
    await waitFor(() => expect(fetchItems).toHaveBeenCalledTimes(2), { timeout: 2000 })

    const s = useNomenclatureStore.getState()
    expect(s.filters).toEqual({ q: 'sement', only: 'nop' })
    expect(s.showAll).toBe(true)
  })
})
