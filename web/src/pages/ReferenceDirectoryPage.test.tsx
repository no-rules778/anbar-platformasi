import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

vi.mock('../api/warehouses.api', () => ({ fetchWarehouses: vi.fn() }))
vi.mock('../api/partners.api', () => ({ fetchPartners: vi.fn() }))
vi.mock('../api/referenceUsage.api', () => ({ fetchReferenceUsage: vi.fn() }))
vi.mock('../api/referenceValues.api', () => ({ fetchReferenceValues: vi.fn() }))
vi.mock('../api/serfiyyatProjects.api', () => ({ fetchSerfiyyat: vi.fn() }))
const channel = { on: vi.fn(), subscribe: vi.fn() }
channel.on.mockReturnValue(channel)
vi.mock('../api/supabase', () => ({
  supabase: { channel: vi.fn(() => channel), removeChannel: vi.fn() },
}))

import { fetchWarehouses } from '../api/warehouses.api'
import { fetchPartners } from '../api/partners.api'
import { fetchReferenceUsage } from '../api/referenceUsage.api'
import { fetchReferenceValues } from '../api/referenceValues.api'
import { fetchSerfiyyat } from '../api/serfiyyatProjects.api'
import { supabase } from '../api/supabase'
import { ReferenceDirectoryPage } from './ReferenceDirectoryPage'
import { useReferenceDirectoryStore, DEFAULT_LIST_CONTROLS } from '../store/referenceDirectory.store'
import { useToastStore } from '../store/toast.store'
import { useSyncStore } from '../store/sync.store'
import { usageKey } from '../types/referenceDirectory'
import type { Me } from '../lib/roles'

const admin: Me = { id: '1', sbId: '1', email: 'a@x.com', name: 'Admin', role: 'admin', wh: '' }
const rehber: Me = { id: '2', sbId: '2', email: 'r@x.com', name: 'Rehber', role: 'rehber', wh: '' }
const anbardar: Me = { id: '3', sbId: '3', email: 'n@x.com', name: 'Anbardar', role: 'anbardar', wh: 'Astara' }

const warehouses = [
  { id: 1, name: 'Ələt', type: 'anbar', active: true },
  { id: 2, name: 'Astara', type: 'anbar', active: false },
  { id: 9, name: 'Layihə sahəsi', type: 'layihə', active: true },
]
const partners = [
  { id: 'p-1', name: 'Bakcell MMC', voen: '1234567890', contract: 'MQ-1', contract_date: '2026-06-05', active: true },
  { id: 'p-2', name: 'Azərsun', voen: null, contract: null, contract_date: null, active: true },
]

/* Phase 3a kinds, all from the one get_reference_values() response. */
const refValues = {
  channel: [{ id: 'rv-c1', name: 'Nağd', active: true }],
  unit: [{ id: 'rv-u1', name: 'ədəd', active: true }, { id: 'rv-u2', name: 'köhnə vahid', active: false }],
  category: [{ id: 'rv-k1', name: 'Kanselyariya', active: true }],
  serfiyyat_channel: [{ id: 'rv-s1', name: 'SM kanalı', active: true }],
}

/* Phase 3b: projects come from their own table; serfiyyat_channel shares the
   reference-values response but is gated on `serfiyyat`. */
const serfiyyatData = {
  projects: [{ id: 'pj-1', name: 'Layihə A', active: true, linkedWarehouse: 'Ələt' }],
  documents: [{ id: 'd-1', projectId: 'pj-1', kanal: 'SM kanalı' }],
  ready: true,
}
const noSerfiyyat = { projects: [], documents: [], ready: false }

const usageMap = new Map([
  [usageKey('warehouse', 'Ələt'), { count: 12, exact: true }],
  [usageKey('warehouse', 'Astara'), { count: 0, exact: true }],
  [usageKey('location', 'Layihə sahəsi'), { count: 2, exact: true }],
  [usageKey('partner', 'Bakcell MMC'), { count: 3, exact: true }],
  [usageKey('partner', 'Azərsun'), { count: 0, exact: true }],
  [usageKey('channel', 'Nağd'), { count: 7, exact: true }],
  [usageKey('unit', 'ədəd'), { count: 41, exact: true }],
  [usageKey('unit', 'köhnə vahid'), { count: 0, exact: true }],
  [usageKey('category', 'Kanselyariya'), { count: 5, exact: true }],
  /* project is keyed by id, not name (index.html:2984). */
  [usageKey('project', 'pj-1'), { count: 1, exact: true }],
  [usageKey('serfiyyat_channel', 'SM kanalı'), { count: 1, exact: true }],
])

beforeEach(() => {
  vi.clearAllMocks()
  useReferenceDirectoryStore.setState({
    rows: [],
    usage: new Map(),
    readiness: { referenceValues: false, serfiyyat: false },
    activeWarehouseNames: [],
    loading: false,
    error: null,
    /* The list controls now live in the store so they survive navigation
       (M4-18); reset them between tests or filters leak across cases. */
    controls: DEFAULT_LIST_CONTROLS,
  })
  useToastStore.setState({ messages: [] })
  useSyncStore.setState({ state: 'idle' })
  channel.on.mockClear()
  channel.subscribe.mockClear()
  vi.mocked(fetchWarehouses).mockResolvedValue(warehouses as never)
  vi.mocked(fetchPartners).mockResolvedValue(partners as never)
  vi.mocked(fetchReferenceUsage).mockResolvedValue(usageMap)
  vi.mocked(fetchReferenceValues).mockResolvedValue({ values: refValues, ready: true })
  vi.mocked(fetchSerfiyyat).mockResolvedValue(serfiyyatData)
})

async function renderPage(me: Me = admin) {
  render(<ReferenceDirectoryPage me={me} />)
  if (me === admin) await waitFor(() => expect(screen.getByText('Ələt')).toBeTruthy())
}

/* Admin-only, exactly as the original (index.html:1496, 3009, 7505). */
describe('ReferenceDirectoryPage — Admin gate', () => {
  it.each([['rehber', rehber], ['anbardar', anbardar]])('refuses %s and loads nothing', async (_l, me) => {
    render(<ReferenceDirectoryPage me={me} />)

    expect(screen.getByText('Soraqçalar yalnız Admin üçündür.')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Əlavə et +' })).toBeNull()
    await waitFor(() => {
      expect(fetchWarehouses).not.toHaveBeenCalled()
      expect(fetchPartners).not.toHaveBeenCalled()
      expect(fetchReferenceUsage).not.toHaveBeenCalled()
    })
    expect(supabase.channel).not.toHaveBeenCalled()
  })
})

/* jsdom serves the page from localhost, which is exactly the situation the
   banner exists for: the local session is wired to the live database. */
describe('ReferenceDirectoryPage — localhost banner', () => {
  it('warns that the local session writes to the live database, and that writes are shut', async () => {
    await renderPage()

    expect(screen.getByText(/CANLI Supabase bazasına qoşulub/)).toBeTruthy()
    expect(screen.getByText(/Bütün yazma əməliyyatları bloklanıb/)).toBeTruthy()
    expect(screen.getByText(/VITE_ALLOW_LOCAL_WRITES/)).toBeTruthy()
  })
})

describe('ReferenceDirectoryPage — unified table', () => {
  it('lists both kinds with their kind label, usage and status', async () => {
    await renderPage()

    const row = screen.getByText('Bakcell MMC').closest('tr')!
    // cells: No | Soraqça növü | Soraqça adı | İstifadə | Status | Əməliyyatlar
    const cells = within(row).getAllByRole('cell')
    expect(cells[1].textContent).toBe('Kontragent')
    expect(cells[3].textContent).toBe('3')
    expect(cells[4].textContent).toBe('Aktiv')

    const hiddenCells = within(screen.getByText('Astara').closest('tr')!).getAllByRole('cell')
    expect(hiddenCells[1].textContent).toBe('Anbar')
    expect(hiddenCells[4].textContent).toBe('Gizli')
  })

  it('lists a layihə warehouse as a location, not as a warehouse', async () => {
    /* refEntities (index.html:2962) splits the one table by `type`. */
    await renderPage()
    const cells = within(screen.getByText('Layihə sahəsi').closest('tr')!).getAllByRole('cell')
    expect(cells[1].textContent).toBe('Ünvan / layihə')
    /* 2 warehouses + 1 location + 2 partners + 1 channel + 2 units
       + 1 category + 1 project + 1 serfiyyat channel. */
    expect(screen.getByText('1–10, cəmi 11')).toBeTruthy()
  })

  it('asks for usage of every listed row, per kind, with ids and the serfiyyat documents', async () => {
    await renderPage()
    expect(fetchReferenceUsage).toHaveBeenCalledWith(
      [
        { kind: 'warehouse', id: '1', name: 'Ələt' },
        { kind: 'warehouse', id: '2', name: 'Astara' },
        { kind: 'location', id: '9', name: 'Layihə sahəsi' },
        { kind: 'partner', id: 'p-1', name: 'Bakcell MMC' },
        { kind: 'partner', id: 'p-2', name: 'Azərsun' },
        { kind: 'channel', id: 'rv-c1', name: 'Nağd' },
        { kind: 'unit', id: 'rv-u1', name: 'ədəd' },
        { kind: 'unit', id: 'rv-u2', name: 'köhnə vahid' },
        { kind: 'category', id: 'rv-k1', name: 'Kanselyariya' },
        { kind: 'project', id: 'pj-1', name: 'Layihə A' },
        { kind: 'serfiyyat_channel', id: 'rv-s1', name: 'SM kanalı' },
      ],
      { serfiyyatDocuments: serfiyyatData.documents },
    )
  })

  it('shows "?" when a usage count is not trustworthy', async () => {
    vi.mocked(fetchReferenceUsage).mockResolvedValue(
      new Map([[usageKey('warehouse', 'Ələt'), { count: 1, exact: false }]]),
    )
    await renderPage()
    const cells = within(screen.getByText('Ələt').closest('tr')!).getAllByRole('cell')
    expect(cells[3].textContent).toBe('?')
  })
})

describe('ReferenceDirectoryPage — filters', () => {
  it('filters by kind', async () => {
    await renderPage()

    await userEvent.selectOptions(screen.getByLabelText('Soraqça növü'), 'partner')
    expect(screen.getByText('Bakcell MMC')).toBeTruthy()
    expect(screen.queryByText('Ələt')).toBeNull()
    expect(screen.getByText('1–2, cəmi 2')).toBeTruthy()

    await userEvent.selectOptions(screen.getByLabelText('Soraqça növü'), 'warehouse')
    expect(screen.getByText('Ələt')).toBeTruthy()
    expect(screen.queryByText('Bakcell MMC')).toBeNull()
  })

  it('filters by status across every kind', async () => {
    await renderPage()
    await userEvent.selectOptions(screen.getByLabelText('Status'), 'off')
    expect(screen.getByText('Astara')).toBeTruthy()
    expect(screen.queryByText('Ələt')).toBeNull()
    /* The hidden warehouse and the hidden unit, across two different kinds. */
    expect(screen.getByText('köhnə vahid')).toBeTruthy()
    expect(screen.getByText('1–2, cəmi 2')).toBeTruthy()
  })

  it('searches by name, case-insensitively, across both kinds', async () => {
    await renderPage()
    await userEvent.type(screen.getByLabelText('Ada görə axtarış'), 'bakcell')
    expect(screen.getByText('Bakcell MMC')).toBeTruthy()
    expect(screen.getByText('1–1, cəmi 1')).toBeTruthy()
  })

  it('combines the kind and status filters', async () => {
    await renderPage()
    await userEvent.selectOptions(screen.getByLabelText('Soraqça növü'), 'warehouse')
    await userEvent.selectOptions(screen.getByLabelText('Status'), 'off')
    expect(screen.getByText('1–1, cəmi 1')).toBeTruthy()
    expect(screen.getByText('Astara')).toBeTruthy()
  })

  it('reports when nothing matches', async () => {
    await renderPage()
    await userEvent.type(screen.getByLabelText('Ada görə axtarış'), 'yoxdur')
    expect(screen.getByText('Bu filtrlərə uyğun soraqça tapılmadı.')).toBeTruthy()
  })
})

describe('ReferenceDirectoryPage — create row', () => {
  it('opens the dialog for the chosen kind, carrying the typed name', async () => {
    await renderPage()

    await userEvent.selectOptions(screen.getByLabelText('Soraqça növünü seçin'), 'partner')
    await userEvent.type(screen.getByLabelText('Soraqça adı'), 'Yeni MMC')
    await userEvent.click(screen.getByRole('button', { name: 'Əlavə et +' }))

    expect(screen.getByText('Kontragent — yeni dəyər')).toBeTruthy()
    expect((screen.getByLabelText('Ad') as HTMLInputElement).value).toBe('Yeni MMC')
    expect(screen.getByLabelText('VÖEN')).toBeTruthy()
  })

  it('defaults to the warehouse kind, which has no partner fields', async () => {
    await renderPage()
    await userEvent.click(screen.getByRole('button', { name: 'Əlavə et +' }))

    expect(screen.getByText('Anbar — yeni dəyər')).toBeTruthy()
    expect(screen.queryByLabelText('VÖEN')).toBeNull()
  })
})

describe('ReferenceDirectoryPage — editing', () => {
  it('opens a partner row with its own kind and usage', async () => {
    await renderPage()
    const row = screen.getByText('Bakcell MMC').closest('tr')!

    await userEvent.click(within(row).getByRole('button', { name: 'Redaktə et' }))

    expect(screen.getByText('Kontragent — redaktə')).toBeTruthy()
    expect((screen.getByLabelText('VÖEN') as HTMLInputElement).value).toBe('1234567890')
    // used partner: name stays editable, no delete offered
    expect((screen.getByLabelText('Ad') as HTMLInputElement).readOnly).toBe(false)
    expect(screen.queryByRole('button', { name: 'Tamamilə sil' })).toBeNull()
  })

  it('opens a used warehouse row locked, as Phase 1 did', async () => {
    await renderPage()
    const row = screen.getByText('Ələt').closest('tr')!

    await userEvent.click(within(row).getByRole('button', { name: 'Redaktə et' }))

    expect(screen.getByText('Anbar — redaktə')).toBeTruthy()
    expect((screen.getByLabelText('Ad') as HTMLInputElement).readOnly).toBe(true)
  })
})

describe('ReferenceDirectoryPage — paging', () => {
  it('pages the combined list and numbers rows continuously', async () => {
    const many = Array.from({ length: 12 }, (_, i) => ({
      id: `p-${i}`, name: `Kontragent ${String(i + 1).padStart(2, '0')}`,
      voen: null, contract: null, contract_date: null, active: true,
    }))
    vi.mocked(fetchWarehouses).mockResolvedValue([] as never)
    vi.mocked(fetchPartners).mockResolvedValue(many as never)
    vi.mocked(fetchReferenceUsage).mockResolvedValue(new Map())
    /* Paging is tested on the partner rows alone. */
    vi.mocked(fetchReferenceValues).mockResolvedValue({
      values: { channel: [], unit: [], category: [], serfiyyat_channel: [] },
      ready: true,
    })
    vi.mocked(fetchSerfiyyat).mockResolvedValue({ projects: [], documents: [], ready: true })
    render(<ReferenceDirectoryPage me={admin} />)
    await waitFor(() => expect(screen.getByText('Kontragent 01')).toBeTruthy())

    expect(screen.getByText('1–10, cəmi 12')).toBeTruthy()
    await userEvent.click(screen.getByRole('button', { name: '›' }))
    expect(screen.getByText('11–12, cəmi 12')).toBeTruthy()
    expect(screen.getByText('Kontragent 11')).toBeTruthy()

    await userEvent.selectOptions(screen.getByLabelText('Hər səhifədə'), '25')
    expect(screen.getByText('1–12, cəmi 12')).toBeTruthy()
  })
})

/* Phase 3a: channel/unit/category rows, and the readiness probe that governs
   them (refServerReady, index.html:2949-2953; registry M3-01/M3-02/M3-06). */
describe('ReferenceDirectoryPage — Phase 3a kinds', () => {
  it('lists channel, unit and category rows with their labels and usage counts', async () => {
    await renderPage()
    for (const [name, label, used] of [
      ['Nağd', 'Alınma kanalı', '7'],
      ['ədəd', 'Ölçü vahidi', '41'],
      ['Kanselyariya', 'Mal kateqoriyası', '5'],
    ]) {
      const cells = within(screen.getByText(name).closest('tr')!).getAllByRole('cell')
      expect(cells[1].textContent).toBe(label)
      expect(cells[3].textContent).toBe(used)
    }
  })

  it('offers all eight kinds in both selectors, in REF_KINDS order', async () => {
    await renderPage()
    const expected = [
      'Anbar', 'Ünvan / layihə', 'Kontragent', 'Alınma kanalı',
      'Ölçü vahidi', 'Mal kateqoriyası',
      'Layihə (Sərfiyyat Materialları)', 'Alınma kanalı (Sərfiyyat Materialları)',
    ]
    const create = within(screen.getByLabelText('Soraqça növünü seçin')).getAllByRole('option')
    expect(create.map((o) => o.textContent)).toEqual(expected)
    const filter = within(screen.getByLabelText('Soraqça növü')).getAllByRole('option')
    expect(filter.map((o) => o.textContent)).toEqual(['Bütün növlər', ...expected])
  })

  it('surfaces serfiyyat_channel once the Sərfiyyat gate is open', async () => {
    await renderPage()
    /* 11 rows at 10 per page — filter to the kind rather than paging. */
    await userEvent.selectOptions(screen.getByLabelText('Soraqça növü'), 'serfiyyat_channel')
    const cells = within(screen.getByText('SM kanalı').closest('tr')!).getAllByRole('cell')
    expect(cells[1].textContent).toBe('Alınma kanalı (Sərfiyyat Materialları)')
    expect(screen.getByText('1–1, cəmi 1')).toBeTruthy()
  })

  it('shows a project row with its id-keyed usage count', async () => {
    await renderPage()
    await userEvent.selectOptions(screen.getByLabelText('Soraqça növü'), 'project')
    const cells = within(screen.getByText('Layihə A').closest('tr')!).getAllByRole('cell')
    expect(cells[1].textContent).toBe('Layihə (Sərfiyyat Materialları)')
    /* usageMap keys this by 'pj-1', not by the name — a name-keyed lookup
       would miss and fall back to the cautious "?" placeholder. */
    expect(cells[3].textContent).toBe('1')
  })

  it('shows a location row with its usage count', async () => {
    await renderPage()
    await userEvent.selectOptions(screen.getByLabelText('Soraqça növü'), 'location')
    const cells = within(screen.getByText('Layihə sahəsi').closest('tr')!).getAllByRole('cell')
    expect(cells[1].textContent).toBe('Ünvan / layihə')
    expect(cells[3].textContent).toBe('2')
  })

  it('filters to a single Phase 3a kind', async () => {
    await renderPage()
    await userEvent.selectOptions(screen.getByLabelText('Soraqça növü'), 'unit')
    expect(screen.getByText('ədəd')).toBeTruthy()
    expect(screen.getByText('köhnə vahid')).toBeTruthy()
    expect(screen.queryByText('Nağd')).toBeNull()
    expect(screen.getByText('1–2, cəmi 2')).toBeTruthy()
  })

  it('opens the editor for a reference-values row', async () => {
    await renderPage()
    const row = screen.getByText('Nağd').closest('tr')!
    await userEvent.click(within(row).getByRole('button', { name: 'Redaktə et' }))
    expect(screen.getByText('Alınma kanalı — redaktə')).toBeTruthy()
  })
})

describe('ReferenceDirectoryPage — readiness probe', () => {
  const notReadyValues = {
    values: { channel: [], unit: [], category: [], serfiyyat_channel: [] },
    ready: false,
  }

  it('shows no banner while every wired kind is available', async () => {
    await renderPage()
    expect(screen.queryByText(/tətbiq ediləndən sonra aktivləşir/)).toBeNull()
  })

  it('names exactly the unavailable kinds in the banner', async () => {
    vi.mocked(fetchReferenceValues).mockResolvedValue(notReadyValues)
    await renderPage()

    const banner = screen.getByText(/tətbiq ediləndən sonra aktivləşir/)
    /* The three referenceValues kinds, and no others — warehouse, location and
       partner are always available, and Sərfiyyat is up in this case. */
    expect(banner.textContent).toContain('Alınma kanalı, Ölçü vahidi, Mal kateqoriyası')
    expect(banner.textContent).not.toContain('Anbar,')
    expect(banner.textContent).not.toContain('Ünvan')
    expect(banner.textContent).not.toContain('Kontragent')
  })

  it('names both Sərfiyyat kinds when only that subsystem is down', async () => {
    /* Design §4.4 matrix state M2: the referenceValues kinds stay available
       while project AND serfiyyat_channel disappear together. */
    vi.mocked(fetchSerfiyyat).mockResolvedValue(noSerfiyyat)
    await renderPage()

    const banner = screen.getByText(/tətbiq ediləndən sonra aktivləşir/)
    expect(banner.textContent).toContain('Layihə (Sərfiyyat Materialları)')
    expect(banner.textContent).toContain('Alınma kanalı (Sərfiyyat Materialları)')
    /* The plain "Alınma kanalı" must NOT be named — it is a different kind
       from the same RPC and is still available. */
    expect(screen.getByText('Nağd')).toBeTruthy()
    expect(screen.getByText('ədəd')).toBeTruthy()
  })

  it('omits unavailable kinds entirely rather than showing an empty section', async () => {
    vi.mocked(fetchReferenceValues).mockResolvedValue(notReadyValues)
    await renderPage()
    expect(screen.queryByText('Nağd')).toBeNull()
    expect(screen.queryByText('ədəd')).toBeNull()
    /* The always-available kinds are unaffected — Phase 1/2 behaviour intact. */
    expect(screen.getByText('Ələt')).toBeTruthy()
    expect(screen.getByText('Layihə sahəsi')).toBeTruthy()
    expect(screen.getByText('Bakcell MMC')).toBeTruthy()
    /* 2 warehouses + 1 location + 2 partners + 1 project; serfiyyat_channel
       has no rows because its SOURCE failed, though its gate is open. */
    expect(screen.getByText('1–6, cəmi 6')).toBeTruthy()
  })

  it('hides both Sərfiyyat kinds together when that subsystem is down', async () => {
    vi.mocked(fetchSerfiyyat).mockResolvedValue(noSerfiyyat)
    await renderPage()
    expect(screen.queryByText('Layihə A')).toBeNull()
    expect(screen.queryByText('SM kanalı')).toBeNull()
  })

  it('disables the unavailable kinds in the create selector, leaving the others enabled', async () => {
    vi.mocked(fetchReferenceValues).mockResolvedValue(notReadyValues)
    await renderPage()
    const options = within(screen.getByLabelText('Soraqça növünü seçin')).getAllByRole('option')
    const disabled = Object.fromEntries(
      options.map((o) => [o.textContent, (o as HTMLOptionElement).disabled]),
    )
    expect(disabled).toEqual({
      Anbar: false,
      'Ünvan / layihə': false,
      Kontragent: false,
      'Alınma kanalı': true,
      'Ölçü vahidi': true,
      'Mal kateqoriyası': true,
      'Layihə (Sərfiyyat Materialları)': false,
      'Alınma kanalı (Sərfiyyat Materialları)': false,
    })
  })

  it('disables exactly the two Sərfiyyat kinds when only that subsystem is down', async () => {
    vi.mocked(fetchSerfiyyat).mockResolvedValue(noSerfiyyat)
    await renderPage()
    const options = within(screen.getByLabelText('Soraqça növünü seçin')).getAllByRole('option')
    const disabled = options.filter((o) => (o as HTMLOptionElement).disabled).map((o) => o.textContent)
    expect(disabled).toEqual(['Layihə (Sərfiyyat Materialları)', 'Alınma kanalı (Sərfiyyat Materialları)'])
  })

  it('refuses to open the create dialog for an unavailable kind, with the original message', async () => {
    /* refOpen (index.html:3079). The option is disabled, but the guard is
       repeated at the point of action. */
    vi.mocked(fetchReferenceValues).mockResolvedValue(notReadyValues)
    await renderPage()
    useReferenceDirectoryStore.setState({ readiness: { referenceValues: false, serfiyyat: false } })

    const select = screen.getByLabelText('Soraqça növünü seçin') as HTMLSelectElement
    select.value = 'unit'
    select.dispatchEvent(new Event('change', { bubbles: true }))
    await userEvent.click(screen.getByRole('button', { name: 'Əlavə et +' }))

    expect(useToastStore.getState().messages.map((m) => m.text)).toContain(
      'Əvvəlcə SQL 011/012 tətbiq edilməlidir',
    )
    expect(screen.queryByText('Ölçü vahidi — yeni dəyər')).toBeNull()
  })

  it('keeps warehouse and partner creation working while the reference kinds are down', async () => {
    vi.mocked(fetchReferenceValues).mockResolvedValue(notReadyValues)
    await renderPage()
    await userEvent.click(screen.getByRole('button', { name: 'Əlavə et +' }))
    expect(screen.getByText('Anbar — yeni dəyər')).toBeTruthy()
  })
})

describe('ReferenceDirectoryPage — realtime', () => {
  it('watches every entity table and usage source on one channel', async () => {
    await renderPage()
    expect(supabase.channel).toHaveBeenCalledWith('anbar_changes')
    const watched = channel.on.mock.calls.map((c) => (c[1] as { table: string }).table)
    /* Phase 3a added reference_values and items; Phase 3b adds the two
       serfiyyat tables this screen actually reads rows or counts from.
       serfiyyat_lines is deliberately absent: it is only a readiness probe,
       so a write there changes nothing on this screen. One channel, one
       subscription — M3-15. */
    expect(watched).toEqual([
      'warehouses', 'partners', 'movements', 'users',
      'reference_values', 'items',
      'serfiyyat_projects', 'serfiyyat_documents',
    ])
    expect(supabase.channel).toHaveBeenCalledTimes(1)
  })

  it('announces success only after the reload resolves, and an error when it fails', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    try {
      await renderPage()
      useToastStore.setState({ messages: [] })
      vi.mocked(fetchPartners).mockRejectedValue(new Error('şəbəkə xətası'))

      const bump = channel.on.mock.calls[0][2] as () => void
      bump()
      await vi.advanceTimersByTimeAsync(500)

      await waitFor(() => {
        const texts = useToastStore.getState().messages.map((m) => m.text)
        expect(texts.some((t) => t.startsWith('Məlumatlar yenilənmədi'))).toBe(true)
        expect(texts).not.toContain('Məlumatlar yeniləndi (digər istifadəçi)')
      })
      // rows survive a failed refresh
      expect(useReferenceDirectoryStore.getState().rows).toHaveLength(11)
    } finally {
      vi.useRealTimers()
    }
  })
})

/* M4-18 — the navigation regression this fixes.

   Browser reproduction: pick a kind and type a search on Soraqçalar, open
   Audit jurnalı, come back — React had cleared both, while the original
   preserves them. The original's screens are long-lived DOM that go() shows
   and hides (index.html:1496-1530), so its filter inputs are never destroyed;
   React unmounts the page, so any component-local control state is discarded.

   Unmount + remount is exactly what navigating away and back does, so these
   tests reproduce the bug without needing the router. */
describe('ReferenceDirectoryPage — list controls survive navigation', () => {
  it('preserves the kind filter and the search text across an unmount/remount', async () => {
    const user = userEvent.setup()
    const first = render(<ReferenceDirectoryPage me={admin} />)
    await waitFor(() => expect(screen.getByText('Ələt')).toBeTruthy())

    await user.selectOptions(screen.getByLabelText('Soraqça növü'), 'category')
    await user.type(screen.getByLabelText('Ada görə axtarış'), 'Kansel')
    await waitFor(() => expect(screen.getByText('Kanselyariya')).toBeTruthy())

    first.unmount() // → navigate to Audit jurnalı

    render(<ReferenceDirectoryPage me={admin} />) // → navigate back
    await waitFor(() => expect(screen.getByText('Kanselyariya')).toBeTruthy())

    expect((screen.getByLabelText('Soraqça növü') as HTMLSelectElement).value).toBe('category')
    expect((screen.getByLabelText('Ada görə axtarış') as HTMLInputElement).value).toBe('Kansel')
  })

  it('preserves the status filter', async () => {
    const user = userEvent.setup()
    const first = render(<ReferenceDirectoryPage me={admin} />)
    await waitFor(() => expect(screen.getByText('Ələt')).toBeTruthy())

    await user.selectOptions(screen.getByLabelText('Status'), 'off')
    first.unmount()

    render(<ReferenceDirectoryPage me={admin} />)
    await waitFor(() => expect(screen.getByLabelText('Status')).toBeTruthy())
    expect((screen.getByLabelText('Status') as HTMLSelectElement).value).toBe('off')
  })

  it('preserves the page size', async () => {
    const user = userEvent.setup()
    const first = render(<ReferenceDirectoryPage me={admin} />)
    await waitFor(() => expect(screen.getByText('Ələt')).toBeTruthy())

    await user.selectOptions(screen.getByLabelText('Hər səhifədə'), '25')
    first.unmount()

    render(<ReferenceDirectoryPage me={admin} />)
    await waitFor(() => expect(screen.getByLabelText('Hər səhifədə')).toBeTruthy())
    expect((screen.getByLabelText('Hər səhifədə') as HTMLSelectElement).value).toBe('25')
  })

  it('preserves the current page number', async () => {
    const user = userEvent.setup()
    const first = render(<ReferenceDirectoryPage me={admin} />)
    /* 11 rows at 10 per page — two pages. */
    await waitFor(() => expect(screen.getByText('1–10, cəmi 11')).toBeTruthy())

    await user.click(screen.getByRole('button', { name: '›' }))
    await waitFor(() => expect(screen.getByText('11–11, cəmi 11')).toBeTruthy())

    first.unmount()

    render(<ReferenceDirectoryPage me={admin} />)
    await waitFor(() => expect(screen.getByText('11–11, cəmi 11')).toBeTruthy())
    expect(screen.getByText('Səhifə 2 / 2')).toBeTruthy()
  })

  it('still returns to page 0 when a filter changes — preservation is not staleness', async () => {
    const user = userEvent.setup()
    render(<ReferenceDirectoryPage me={admin} />)
    await waitFor(() => expect(screen.getByText('1–10, cəmi 11')).toBeTruthy())

    await user.click(screen.getByRole('button', { name: '›' }))
    await waitFor(() => expect(screen.getByText('Səhifə 2 / 2')).toBeTruthy())

    /* Changing what is filtered invalidates the page number. */
    await user.selectOptions(screen.getByLabelText('Soraqça növü'), 'warehouse')
    await waitFor(() => expect(screen.getByText('Səhifə 1 / 1')).toBeTruthy())
  })
})
