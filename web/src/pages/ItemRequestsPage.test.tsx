import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import type { ItemRequestView } from '../lib/nomenclatureRequests'

/* T4 — the page (M12-05, M12-06, M12-07, M12-14, M12-20…M12-25, M12-30…M12-43,
   M12-82's UI early return, M12-16). The store and the
   realtime hook are mocked; the two dialogs are REAL, so the create/review
   affordances are exercised through their own markup.

   UNIT/PAGE EVIDENCE ONLY. Not one assertion here is server, RLS or live
   evidence: every "can/cannot" below is a browser affordance (protocol §7). */

const load = vi.fn()
const setFilters = vi.fn()
const cancelItemRequest = vi.fn()

vi.mock('../api/itemRequests.api', () => ({
  cancelItemRequest: (id: string) => cancelItemRequest(id),
  requestNewItem: vi.fn(),
  approveItemRequest: vi.fn(),
  rejectItemRequest: vi.fn(),
}))
vi.mock('../hooks/useRealtimeRefresh', () => ({ useRealtimeRefresh: vi.fn() }))

const req = (over: Partial<ItemRequestView> = {}): ItemRequestView => ({
  id: 'r1', name: 'Sement M400', unit: 'kq', category: 'Tikinti', note: '', status: 'pending',
  by: 'u-anbardar', w: 'Test Anbar', ts: Date.UTC(2026, 8, 11), decidedBy: '', decidedAt: '',
  reason: '', code: '', ...over,
})

const ITEM = { code: '0000001', name: 'Kabel', unit: 'metr', price: 1, category: null }

let state: Record<string, unknown>

const baseState = (over: Record<string, unknown> = {}) => ({
  requests: [req()], items: [ITEM], filters: { q: '', status: 'pending' },
  referenceValues: {
    channel: [], serfiyyat_channel: [],
    unit: [{ id: '1', name: 'kq', active: true }],
    category: [{ id: '2', name: 'Tikinti', active: true }],
  },
  refsReady: true,
  loading: false, loaded: true, error: null, load, setFilters, ...over,
})

vi.mock('../store/itemRequests.store', () => ({ useItemRequestsStore: () => state }))

import { ItemRequestsPage } from './ItemRequestsPage'
import { useRealtimeRefresh } from '../hooks/useRealtimeRefresh'

const admin = { id: 'u-admin', sbId: 'u-admin', email: 'a@x', name: 'Admin', role: 'admin', wh: '' }
const anbardar = { ...admin, id: 'u-anbardar', name: 'Anbardar', role: 'anbardar', wh: 'Test Anbar' }
const rehber = { ...admin, id: 'u-rehber', name: 'Rəhbər', role: 'rehber' }

const rows = () => within(screen.getByTestId('t-nreq')).getAllByRole('row').slice(1)
const cells = (tr: HTMLElement) => Array.from(tr.querySelectorAll('td')).map((td) => td.textContent)

beforeEach(() => {
  vi.clearAllMocks()
  state = baseState()
})

describe('shell and subtitle — M12-05, M12-06', () => {
  it('renders the heading', () => {
    render(<ItemRequestsPage me={anbardar} />)
    expect(screen.getByRole('heading', { name: 'Nomenklatura sorğuları' })).toBeTruthy()
  })

  it.each([
    ['admin', admin, 'Anbardarların təklifləri'],
    ['anbardar', anbardar, 'Yeni mal təklif edin'],
    ['rehber', rehber, 'Yalnız oxu.'],
  ])('drives the %s subtitle variant', (_r, me, lead) => {
    render(<ItemRequestsPage me={me} />)
    expect(screen.getByTestId('nreq-sub').textContent).toContain(lead)
  })
})

describe('«Yeni nomenklatura sorğusu» — M12-07 AFFORDANCE, never a permission', () => {
  it('is offered to an anbardar', () => {
    render(<ItemRequestsPage me={anbardar} />)
    expect(screen.queryByTestId('nreq-new')).toBeTruthy()
  })

  it.each([['admin', admin], ['rehber', rehber]])('is NOT offered to %s (negative control)', (_r, me) => {
    render(<ItemRequestsPage me={me} />)
    expect(screen.queryByTestId('nreq-new')).toBeNull()
  })
})

describe('filters — M12-20, M12-21, M12-22', () => {
  it('renders exactly four segments in the fixed order, «Gözləyən» carrying .on', () => {
    render(<ItemRequestsPage me={anbardar} />)
    const buttons = within(screen.getByTestId('nrq-s')).getAllByRole('button')
    expect(buttons.map((b) => b.textContent)).toEqual(['Gözləyən', 'Təsdiqlənən', 'Rədd edilən', 'Hamısı'])
    expect(buttons[0].className).toBe('on')
  })

  it('has NO «Ləğv edilən» segment — M12-21', () => {
    render(<ItemRequestsPage me={anbardar} />)
    expect(within(screen.getByTestId('nrq-s')).queryByText('Ləğv edilən')).toBeNull()
  })

  it('clicking a segment patches ONLY the status', () => {
    render(<ItemRequestsPage me={anbardar} />)
    fireEvent.click(screen.getByText('Hamısı'))
    expect(setFilters).toHaveBeenCalledWith({ status: '' })
  })
})

describe('table cells — M12-30…M12-37', () => {
  it('renders exactly the eight columns, none right-aligned', () => {
    render(<ItemRequestsPage me={anbardar} />)
    const th = within(screen.getByTestId('t-nreq')).getAllByRole('columnheader')
    expect(th.map((h) => h.textContent)).toEqual(
      ['Tarix', 'Malın adı', 'Ölçü', 'Kateqoriya', 'Anbar', 'Status', 'Kod', ''],
    )
    expect(th.some((h) => h.className.includes('r'))).toBe(false)
  })

  it('renders the date, raw warehouse, status tag and the code em-dash', () => {
    render(<ItemRequestsPage me={anbardar} />)
    const c = cells(rows()[0])
    expect(c[0]).toBe('11.09.2026')
    /* M12-35 — RAW, not whLabel()'d. */
    expect(c[4]).toBe('Test Anbar')
    expect(c[5]).toBe('Gözləyir')
    expect(c[6]).toBe('—')
    expect(screen.getByText('Gözləyir').className).toBe('tag t-op')
  })

  it('renders an em-dash for an empty unit and category — M12-34', () => {
    state = baseState({ requests: [req({ unit: '', category: '' })] })
    render(<ItemRequestsPage me={anbardar} />)
    const c = cells(rows()[0])
    expect(c[2]).toBe('—')
    expect(c[3]).toBe('—')
  })

  it('an unknown status renders raw text with NO tag — M12-36 negative control', () => {
    state = baseState({ requests: [req({ status: 'draft' })], filters: { q: '', status: '' } })
    render(<ItemRequestsPage me={anbardar} />)
    expect(cells(rows()[0])[5]).toBe('draft')
    expect(screen.queryByText('draft')?.className ?? '').not.toContain('tag')
  })

  it('shows the rejection reason ONLY on a rejected row — M12-32, M12-33', () => {
    state = baseState({
      requests: [req({ status: 'rejected', reason: 'artıq var' })],
      filters: { q: '', status: '' },
    })
    render(<ItemRequestsPage me={admin} />)
    expect(screen.getByText('Səbəb: artıq var')).toBeTruthy()
  })

  it('a CANCELLED row carrying a reason does NOT display it — M12-33 falsifiable half', () => {
    state = baseState({
      requests: [req({ status: 'cancelled', reason: 'geri götürüldü' })],
      filters: { q: '', status: '' },
    })
    render(<ItemRequestsPage me={admin} />)
    expect(screen.queryByText(/Səbəb:/)).toBeNull()
  })

  it('renders the code in a .code span when present — M12-37', () => {
    state = baseState({ requests: [req({ status: 'approved', code: '0000009' })], filters: { q: '', status: '' } })
    render(<ItemRequestsPage me={admin} />)
    expect(screen.getByText('0000009').className).toBe('code')
  })
})

describe('empty text and footer — M12-38, M12-39', () => {
  it('uses the pending-specific empty text under the pending segment', () => {
    state = baseState({ requests: [] })
    render(<ItemRequestsPage me={anbardar} />)
    expect(screen.getByTestId('t-nreq').textContent).toContain('Gözləyən sorğu yoxdur.')
  })

  it('uses the generic empty text under any other segment', () => {
    state = baseState({ requests: [], filters: { q: '', status: '' } })
    render(<ItemRequestsPage me={anbardar} />)
    expect(screen.getByTestId('t-nreq').textContent).toContain('Sorğu tapılmadı.')
  })

  it('counts the FILTERED rows and appends the suffix for an anbardar ONLY', () => {
    render(<ItemRequestsPage me={anbardar} />)
    expect(screen.getByTestId('nreq-note').textContent)
      .toBe('1 sorğu · yalnız sizin yaratdığınız sorğular göstərilir')
  })

  it.each([['admin', admin], ['rehber', rehber]])('omits the suffix for %s', (_r, me) => {
    render(<ItemRequestsPage me={me} />)
    expect(screen.getByTestId('nreq-note').textContent).toBe('1 sorğu')
  })
})

describe('row actions — M12-40…M12-43 AFFORDANCES', () => {
  it('offers «Nəzərdən keçir» to an admin on a pending row', () => {
    render(<ItemRequestsPage me={admin} />)
    expect(screen.queryByTestId('nrq-rev-r1')).toBeTruthy()
  })

  it.each([['anbardar', anbardar], ['rehber', rehber]])(
    'never offers «Nəzərdən keçir» to %s (negative control)', (_r, me) => {
      render(<ItemRequestsPage me={me} />)
      expect(screen.queryByTestId('nrq-rev-r1')).toBeNull()
    },
  )

  it('offers «Geri götür» to the author and to an admin', () => {
    render(<ItemRequestsPage me={anbardar} />)
    expect(screen.queryByTestId('nrq-cx-r1')).toBeTruthy()
    render(<ItemRequestsPage me={admin} />)
    expect(screen.queryAllByTestId('nrq-cx-r1').length).toBeGreaterThan(0)
  })

  it('does NOT offer «Geri götür» to a non-author anbardar — M12-43', () => {
    render(<ItemRequestsPage me={{ ...anbardar, id: 'someone-else' }} />)
    expect(screen.queryByTestId('nrq-cx-r1')).toBeNull()
  })

  it.each(['approved', 'rejected', 'cancelled'])(
    'a %s row offers NO action to an admin — M12-42', (status) => {
      state = baseState({ requests: [req({ status })], filters: { q: '', status: '' } })
      render(<ItemRequestsPage me={admin} />)
      expect(screen.queryByTestId('nrq-rev-r1')).toBeNull()
      expect(screen.queryByTestId('nrq-cx-r1')).toBeNull()
    },
  )
})

describe('withdrawal — M12-82 (UI leg only)', () => {
  it('calls cancel_item_request and reloads on success', async () => {
    cancelItemRequest.mockResolvedValue({ ok: true, data: null, error: null })
    render(<ItemRequestsPage me={anbardar} />)
    fireEvent.click(screen.getByTestId('nrq-cx-r1'))
    await vi.waitFor(() => expect(cancelItemRequest).toHaveBeenCalledWith('r1'))
    await vi.waitFor(() => expect(load).toHaveBeenCalled())
  })

  it('a FAILED withdrawal does not reload — the refusal is surfaced instead', async () => {
    cancelItemRequest.mockResolvedValue({ ok: false, data: null, error: 'Sorğu artıq qapanıb' })
    load.mockClear()
    render(<ItemRequestsPage me={anbardar} />)
    load.mockClear()
    fireEvent.click(screen.getByTestId('nrq-cx-r1'))
    await vi.waitFor(() => expect(cancelItemRequest).toHaveBeenCalled())
    expect(load).not.toHaveBeenCalled()
  })
})

describe('loading, error and retention — M12-13, M12-14', () => {
  it('shows the loading block on a first load', () => {
    state = baseState({ loading: true, loaded: false })
    render(<ItemRequestsPage me={anbardar} />)
    expect(screen.queryByTestId('nreq-loading')).toBeTruthy()
    expect(screen.queryByTestId('t-nreq')).toBeNull()
  })

  it('an INITIAL failure shows the load-error block and NO table', () => {
    state = baseState({ loaded: false, error: '503' })
    render(<ItemRequestsPage me={anbardar} />)
    expect(screen.getByTestId('nreq-load-error').textContent).toContain('503')
    expect(screen.queryByTestId('t-nreq')).toBeNull()
  })

  it('a FAILED REFRESH keeps the table and flags it «Yenilənmədi» — M12-14', () => {
    state = baseState({ loaded: true, error: '503' })
    render(<ItemRequestsPage me={anbardar} />)
    expect(screen.getByTestId('nreq-refresh-error').textContent).toContain('Yenilənmədi')
    /* The load-bearing half: the previous snapshot is still on screen. */
    expect(rows()).toHaveLength(1)
  })
})

describe('realtime — M12-16 (D-M4 improvement, not parity)', () => {
  it('watches item_requests and items', () => {
    render(<ItemRequestsPage me={anbardar} />)
    const [, tables] = vi.mocked(useRealtimeRefresh).mock.calls[0]
    expect(tables).toEqual(['item_requests', 'items'])
  })
})

describe('reference options — A14 readiness split', () => {
  it('a READY but empty active list stays EMPTY (an Admin who hid every unit meant it)', () => {
    state = baseState({
      referenceValues: { channel: [], unit: [], category: [], serfiyyat_channel: [] },
      refsReady: true,
    })
    render(<ItemRequestsPage me={anbardar} />)
    fireEvent.click(screen.getByTestId('nreq-new'))
    /* Only the leading «Seçilməyib» option. */
    expect(within(screen.getByTestId('nq-unit')).getAllByRole('option')).toHaveLength(1)
  })

  it('a NOT-READY directory falls back to the built-in list', () => {
    state = baseState({
      referenceValues: { channel: [], unit: [], category: [], serfiyyat_channel: [] },
      refsReady: false,
    })
    render(<ItemRequestsPage me={anbardar} />)
    fireEvent.click(screen.getByTestId('nreq-new'))
    expect(within(screen.getByTestId('nq-unit')).getAllByRole('option').length).toBeGreaterThan(1)
  })
})
