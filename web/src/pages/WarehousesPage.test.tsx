import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

vi.mock('../api/warehouses.api', () => ({
  fetchWarehouses: vi.fn(),
  fetchWarehouseUsage: vi.fn(),
}))
const channel = { on: vi.fn(), subscribe: vi.fn() }
channel.on.mockReturnValue(channel)
vi.mock('../api/supabase', () => ({
  supabase: {
    channel: vi.fn(() => channel),
    removeChannel: vi.fn(),
  },
}))

import { fetchWarehouses, fetchWarehouseUsage } from '../api/warehouses.api'
import { WarehousesPage } from './WarehousesPage'
import { useWarehousesStore } from '../store/warehouses.store'
import type { Me } from '../lib/roles'
import { supabase } from '../api/supabase'
import { useToastStore } from '../store/toast.store'
import { useSyncStore } from '../store/sync.store'

const admin: Me = { id: '1', sbId: '1', email: 'a@x.com', name: 'Admin', role: 'admin', wh: '' }
const rehber: Me = { id: '2', sbId: '2', email: 'r@x.com', name: 'Rehber', role: 'rehber', wh: '' }
const anbardar: Me = { id: '3', sbId: '3', email: 'n@x.com', name: 'Anbardar', role: 'anbardar', wh: 'Astara' }
const legacyRole: Me = { id: '4', sbId: '4', email: 't@x.com', name: 'Techizat', role: 'techizat', wh: '' }

beforeEach(() => {
  vi.clearAllMocks()
  useWarehousesStore.setState({ rows: [], usage: new Map(), loading: false, error: null })
  useToastStore.setState({ messages: [] })
  channel.on.mockClear()
  channel.subscribe.mockClear()
  useSyncStore.setState({ state: 'idle' })
  vi.mocked(fetchWarehouses).mockResolvedValue([{ id: 1, name: 'Astara', type: 'anbar', active: true }])
  vi.mocked(fetchWarehouseUsage).mockResolvedValue(new Map([['Astara', { count: 2, exact: true }]]))
})

/* Soraqçalar is Admin-only in the production platform: the nav entry is hidden
   (index.html:7505), go('refs') refuses (1496) and rRefs() bounces (3009). */
describe('WarehousesPage — Admin gate', () => {
  it.each([
    ['rehber', rehber],
    ['anbardar', anbardar],
    ['legacy role mapped to rehber', legacyRole],
  ])('refuses %s and never loads any warehouse data', async (_label, me) => {
    render(<WarehousesPage me={me} />)

    expect(screen.getByText('Soraqçalar yalnız Admin üçündür.')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Əlavə et +' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Redaktə et' })).toBeNull()

    // The administrative queries — including the usage counters — must not run.
    await waitFor(() => {
      expect(fetchWarehouses).not.toHaveBeenCalled()
      expect(fetchWarehouseUsage).not.toHaveBeenCalled()
    })
  })

  it('lets an Admin in and loads the directory', async () => {
    render(<WarehousesPage me={admin} />)

    await waitFor(() => expect(fetchWarehouses).toHaveBeenCalled())
    expect(screen.queryByText('Soraqçalar yalnız Admin üçündür.')).toBeNull()
    expect(screen.getByRole('button', { name: 'Əlavə et +' })).toBeTruthy()
    await waitFor(() => expect(screen.getByText('Astara')).toBeTruthy())
  })
})

describe('WarehousesPage — usage column', () => {
  it('shows the exact count when it is trustworthy', async () => {
    render(<WarehousesPage me={admin} />)
    await waitFor(() => expect(screen.getByText('2')).toBeTruthy())
  })

  it('shows "?" instead of a number when the usage query failed', async () => {
    vi.mocked(fetchWarehouseUsage).mockResolvedValue(new Map([['Astara', { count: 1, exact: false }]]))
    render(<WarehousesPage me={admin} />)
    await waitFor(() => expect(screen.getByText('?')).toBeTruthy())
  })
})

const manyWarehouses = Array.from({ length: 12 }, (_, i) => ({
  id: i + 1,
  name: `Anbar ${String(i + 1).padStart(2, '0')}`,
  type: 'anbar',
  active: i % 2 === 0,
}))

async function renderWithMany() {
  vi.mocked(fetchWarehouses).mockResolvedValue(manyWarehouses)
  vi.mocked(fetchWarehouseUsage).mockResolvedValue(new Map(manyWarehouses.map((w) => [w.name, { count: 0, exact: true }])))
  render(<WarehousesPage me={admin} />)
  await waitFor(() => expect(screen.getByText('Anbar 01')).toBeTruthy())
}

/* F12: the original list has search, an active/hidden filter, page size,
   pagination and row numbers (index.html:3036-3057). */
describe('WarehousesPage — list controls', () => {
  it('numbers the rows and paginates with 10 per page by default', async () => {
    await renderWithMany()

    expect(screen.getByText('Səhifə 1 / 2')).toBeTruthy()
    expect(screen.getByText('1–10, cəmi 12')).toBeTruthy()
    expect(screen.queryByText('Anbar 11')).toBeNull()

    await userEvent.click(screen.getByRole('button', { name: '›' }))

    expect(screen.getByText('Anbar 11')).toBeTruthy()
    expect(screen.getByText('11–12, cəmi 12')).toBeTruthy()
    expect(screen.getByText('Səhifə 2 / 2')).toBeTruthy()
  })

  it('filters by name and resets to the first page', async () => {
    await renderWithMany()
    await userEvent.click(screen.getByRole('button', { name: '›' }))

    await userEvent.type(screen.getByLabelText('Ada görə axtarış'), 'Anbar 1')

    expect(screen.getByText('Səhifə 1 / 1')).toBeTruthy()
    // names are zero-padded, so only Anbar 10, 11 and 12 match
    expect(screen.getByText('1–3, cəmi 3')).toBeTruthy()
  })

  it('search is case-insensitive', async () => {
    await renderWithMany()
    await userEvent.type(screen.getByLabelText('Ada görə axtarış'), 'ANBAR 05')
    expect(screen.getByText('Anbar 05')).toBeTruthy()
    expect(screen.getByText('1–1, cəmi 1')).toBeTruthy()
  })

  it('filters by status', async () => {
    await renderWithMany()

    await userEvent.selectOptions(screen.getByLabelText('Status'), 'off')
    expect(screen.getByText('1–6, cəmi 6')).toBeTruthy()
    expect(screen.queryByText('Anbar 01')).toBeNull()

    await userEvent.selectOptions(screen.getByLabelText('Status'), 'active')
    expect(screen.getByText('Anbar 01')).toBeTruthy()
  })

  it('changes the page size', async () => {
    await renderWithMany()
    await userEvent.selectOptions(screen.getByLabelText('Hər səhifədə'), '25')
    expect(screen.getByText('1–12, cəmi 12')).toBeTruthy()
    expect(screen.getByText('Səhifə 1 / 1')).toBeTruthy()
  })

  it('tells the user when nothing matches', async () => {
    await renderWithMany()
    await userEvent.type(screen.getByLabelText('Ada görə axtarış'), 'yoxdur')
    expect(screen.getByText('Bu filtrlərə uyğun anbar tapılmadı.')).toBeTruthy()
  })
})

/* F7: a change made by another Admin must appear without a manual reload
   (index.html:1163-1181). */
describe('WarehousesPage — realtime', () => {
  it('subscribes once to the tables this screen reads, and refreshes on a change', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    try {
      await renderWithMany()

      expect(supabase.channel).toHaveBeenCalledWith('anbar_changes')
      const watched = channel.on.mock.calls.map((c) => (c[1] as { table: string }).table)
      expect(watched).toEqual(['warehouses', 'movements', 'users'])

      vi.mocked(fetchWarehouses).mockClear()
      const bump = channel.on.mock.calls[0][2] as () => void
      bump(); bump(); bump() // a burst must collapse into one refresh
      await vi.advanceTimersByTimeAsync(500)

      expect(fetchWarehouses).toHaveBeenCalledTimes(1)
      expect(useToastStore.getState().messages.map((m) => m.text))
        .toContain('Məlumatlar yeniləndi (digər istifadəçi)')
    } finally {
      vi.useRealTimers()
    }
  })

  it('does not subscribe for a non-Admin', () => {
    render(<WarehousesPage me={rehber} />)
    expect(supabase.channel).not.toHaveBeenCalled()
  })

  it('removes the channel on unmount', async () => {
    const view = render(<WarehousesPage me={admin} />)
    await waitFor(() => expect(supabase.channel).toHaveBeenCalled())
    view.unmount()
    expect(supabase.removeChannel).toHaveBeenCalled()
  })
})

/* The success notice may only appear after the refresh actually succeeded. */
describe('WarehousesPage — realtime refresh reports truthfully', () => {
  const fireRealtimeChange = async () => {
    const bump = channel.on.mock.calls[0][2] as () => void
    bump()
    await vi.advanceTimersByTimeAsync(500)
  }

  it('announces success only after the reload resolves', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    try {
      await renderWithMany()
      useToastStore.setState({ messages: [] })

      let release!: () => void
      vi.mocked(fetchWarehouses).mockImplementation(
        () => new Promise((resolve) => { release = () => resolve(manyWarehouses) }),
      )

      await fireRealtimeChange()
      // reload is in flight — nothing may be claimed yet
      expect(useToastStore.getState().messages).toEqual([])

      release()
      await waitFor(() => expect(useToastStore.getState().messages.map((m) => m.text))
        .toContain('Məlumatlar yeniləndi (digər istifadəçi)'))
    } finally {
      vi.useRealTimers()
    }
  })

  it('shows an error notice, keeps the old rows, and exposes the error when the reload fails', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    try {
      await renderWithMany()
      useToastStore.setState({ messages: [] })

      vi.mocked(fetchWarehouses).mockRejectedValue(new Error('şəbəkə xətası'))

      await fireRealtimeChange()

      await waitFor(() => {
        const texts = useToastStore.getState().messages.map((m) => m.text)
        expect(texts.some((t) => t.startsWith('Məlumatlar yenilənmədi'))).toBe(true)
        expect(texts).not.toContain('Məlumatlar yeniləndi (digər istifadəçi)')
      })
      expect(useToastStore.getState().messages.some((m) => m.isError)).toBe(true)
      // previously loaded data survives a failed refresh
      expect(useWarehousesStore.getState().rows).toHaveLength(manyWarehouses.length)
      expect(useWarehousesStore.getState().error).toBe('şəbəkə xətası')
    } finally {
      vi.useRealTimers()
    }
  })
})

/* Subscription state drives the sync indicator (index.html:1177-1180). */
describe('WarehousesPage — sync state transitions', () => {
  const statusCallback = () => channel.subscribe.mock.calls[0][0] as (s: string) => void

  it('reports "connecting" until SUBSCRIBED arrives — never claims sync early', async () => {
    await renderWithMany()
    expect(useSyncStore.getState().state).toBe('connecting')

    statusCallback()('SUBSCRIBED')
    expect(useSyncStore.getState().state).toBe('synced')
  })

  it.each(['CHANNEL_ERROR', 'TIMED_OUT'])('reports an error on %s', async (status) => {
    await renderWithMany()
    statusCallback()('SUBSCRIBED')
    statusCallback()(status)
    expect(useSyncStore.getState().state).toBe('error')
  })

  it('returns to idle on CLOSED', async () => {
    await renderWithMany()
    statusCallback()('SUBSCRIBED')
    statusCallback()('CLOSED')
    expect(useSyncStore.getState().state).toBe('idle')
  })

  it('resets to idle when the screen unmounts', async () => {
    vi.mocked(fetchWarehouses).mockResolvedValue(manyWarehouses)
    vi.mocked(fetchWarehouseUsage).mockResolvedValue(new Map())
    const view = render(<WarehousesPage me={admin} />)
    await waitFor(() => expect(supabase.channel).toHaveBeenCalled())
    statusCallback()('SUBSCRIBED')
    expect(useSyncStore.getState().state).toBe('synced')

    view.unmount()

    expect(useSyncStore.getState().state).toBe('idle')
  })

  it('ignores late status callbacks after teardown', async () => {
    vi.mocked(fetchWarehouses).mockResolvedValue(manyWarehouses)
    vi.mocked(fetchWarehouseUsage).mockResolvedValue(new Map())
    const view = render(<WarehousesPage me={admin} />)
    await waitFor(() => expect(supabase.channel).toHaveBeenCalled())
    const notify = statusCallback()
    view.unmount()

    notify('SUBSCRIBED')

    expect(useSyncStore.getState().state).toBe('idle')
  })

  it('stays idle for a non-Admin, who never subscribes', () => {
    render(<WarehousesPage me={rehber} />)
    expect(useSyncStore.getState().state).toBe('idle')
  })
})
