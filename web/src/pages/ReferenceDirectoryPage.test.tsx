import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

vi.mock('../api/warehouses.api', () => ({ fetchWarehouses: vi.fn() }))
vi.mock('../api/partners.api', () => ({ fetchPartners: vi.fn() }))
vi.mock('../api/referenceUsage.api', () => ({ fetchReferenceUsage: vi.fn() }))
const channel = { on: vi.fn(), subscribe: vi.fn() }
channel.on.mockReturnValue(channel)
vi.mock('../api/supabase', () => ({
  supabase: { channel: vi.fn(() => channel), removeChannel: vi.fn() },
}))

import { fetchWarehouses } from '../api/warehouses.api'
import { fetchPartners } from '../api/partners.api'
import { fetchReferenceUsage } from '../api/referenceUsage.api'
import { supabase } from '../api/supabase'
import { ReferenceDirectoryPage } from './ReferenceDirectoryPage'
import { useReferenceDirectoryStore } from '../store/referenceDirectory.store'
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

const usageMap = new Map([
  [usageKey('warehouse', 'Ələt'), { count: 12, exact: true }],
  [usageKey('warehouse', 'Astara'), { count: 0, exact: true }],
  [usageKey('partner', 'Bakcell MMC'), { count: 3, exact: true }],
  [usageKey('partner', 'Azərsun'), { count: 0, exact: true }],
])

beforeEach(() => {
  vi.clearAllMocks()
  useReferenceDirectoryStore.setState({ rows: [], usage: new Map(), loading: false, error: null })
  useToastStore.setState({ messages: [] })
  useSyncStore.setState({ state: 'idle' })
  channel.on.mockClear()
  channel.subscribe.mockClear()
  vi.mocked(fetchWarehouses).mockResolvedValue(warehouses as never)
  vi.mocked(fetchPartners).mockResolvedValue(partners as never)
  vi.mocked(fetchReferenceUsage).mockResolvedValue(usageMap)
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

  it('excludes warehouses of type "layihə" — they belong to the location kind', async () => {
    await renderPage()
    expect(screen.queryByText('Layihə sahəsi')).toBeNull()
    expect(screen.getByText('1–4, cəmi 4')).toBeTruthy()
  })

  it('asks for usage of every listed row, per kind', async () => {
    await renderPage()
    expect(fetchReferenceUsage).toHaveBeenCalledWith([
      { kind: 'warehouse', name: 'Ələt' },
      { kind: 'warehouse', name: 'Astara' },
      { kind: 'partner', name: 'Bakcell MMC' },
      { kind: 'partner', name: 'Azərsun' },
    ])
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

  it('filters by status across both kinds', async () => {
    await renderPage()
    await userEvent.selectOptions(screen.getByLabelText('Status'), 'off')
    expect(screen.getByText('Astara')).toBeTruthy()
    expect(screen.queryByText('Ələt')).toBeNull()
    expect(screen.getByText('1–1, cəmi 1')).toBeTruthy()
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

describe('ReferenceDirectoryPage — realtime', () => {
  it('watches both entity tables and the two usage sources', async () => {
    await renderPage()
    expect(supabase.channel).toHaveBeenCalledWith('anbar_changes')
    const watched = channel.on.mock.calls.map((c) => (c[1] as { table: string }).table)
    expect(watched).toEqual(['warehouses', 'partners', 'movements', 'users'])
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
      expect(useReferenceDirectoryStore.getState().rows).toHaveLength(4)
    } finally {
      vi.useRealTimers()
    }
  })
})
