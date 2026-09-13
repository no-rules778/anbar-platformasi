import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'

/* T3 — the page (M11-04 … M11-07, M11-12 … M11-14, M11-21 … M11-26,
   M11-30 … M11-35, M11-40 … M11-45, M11-50, M11-62, M11-73, M11-74). The
   store, the realtime hook, the toast store and the directory store are
   mocked; the ItemCard is REAL. Unit/page evidence only. */

const load = vi.fn()
const setWarehouse = vi.fn()
const show = vi.fn()

interface Bal { w: string; c: string; in: number; out: number; n: number; q: number; last: string; first: string; price: number; val: number; name: string; unit: string }
interface Mov { id: string; item_code: string; warehouse: string; date: string; in_qty: number; out_qty: number; price: number | null; partner: string; type: string; invoice_num?: string | null; contract_num?: string | null; created_at?: string | null; created_by?: string | null; note?: string | null; doc_num?: string | null }

const bal = (over: Partial<Bal>): Bal => ({
  w: 'Ələt', c: 'A', in: 4, out: 0, n: 1, q: 4, last: '2026-01-05', first: '2026-01-05', price: 10, val: 40, name: 'Item A', unit: 'ədəd', ...over,
})
const mov = (over: Partial<Mov>): Mov => ({
  id: 'm', item_code: 'A', warehouse: 'Ələt', date: '2026-01-05', in_qty: 4, out_qty: 0, price: 2.5, partner: 'Azpetrol', type: 'Satınalma',
  invoice_num: 'INV-1', contract_num: null, created_at: '2026-01-05T10:00:00Z', created_by: 'u-ali', ...over,
})

const baseState = () => ({
  locations: [
    { id: 1, name: 'Ələt', type: 'anbar', active: true },
    { id: 2, name: 'Xocahəsən', type: 'anbar', active: true },
    { id: 3, name: 'Old anbar', type: 'anbar', active: false },
    { id: 4, name: 'Layihə X', type: 'layihə', active: true },
  ],
  items: [
    { code: 'A', name: 'Item A', unit: 'ədəd', price: 10, category: null },
    { code: 'B', name: 'Item B', unit: 'kq', price: 3, category: null },
  ],
  partners: [{ id: 1, name: 'Azpetrol', voen: '1234' }],
  indexes: {
    byItem: new Map(), priceObs: new Map(),
    operational: [
      mov({}),
      mov({ id: 'o1', item_code: 'B', warehouse: 'Xocahəsən', date: '2026-02-01', in_qty: 0, out_qty: 1, type: 'Sahəyə', partner: 'Layihə X', created_at: '2026-02-01T10:00:00Z', created_by: null }),
      mov({ id: 'zz', item_code: 'ZZZ', warehouse: 'Ələt', date: '2026-01-02', in_qty: 1, out_qty: 0, type: 'Qaytarma', created_at: '2026-01-02T10:00:00Z', created_by: 'unknown-id' }),
    ],
    bal: [
      bal({}),
      bal({ w: 'Xocahəsən', c: 'B', in: 0, out: 1, n: 1, q: -1, price: 3, val: -3, name: 'Item B', unit: 'kq', last: '2026-02-01' }),
      bal({ w: 'Ələt', c: 'ZZZ', in: 1, out: 0, n: 1, q: 1, price: 0, val: 0, name: '(nomenklaturada yoxdur: ZZZ)', unit: '' }),
    ],
  },
  warehouse: '',
  loading: false, loaded: true, error: null as string | null, load, setWarehouse,
})

let state = baseState()

vi.mock('../store/dashboard.store', async () => {
  const real = await vi.importActual<typeof import('../store/dashboard.store')>('../store/dashboard.store')
  return { useDashboardStore: () => state, activeWarehouseNames: real.activeWarehouseNames }
})
vi.mock('../hooks/useRealtimeRefresh', () => ({ useRealtimeRefresh: vi.fn() }))
vi.mock('../store/toast.store', () => ({ useToastStore: (sel: (s: { show: typeof show }) => unknown) => sel({ show }) }))
vi.mock('../store/auditLog.store', () => ({
  useAuditLogStore: (sel: (s: { emails: Map<string, string> }) => unknown) => sel({ emails: new Map([['u-ali', 'ali@example.com']]) }),
}))

import { DashboardPage, REALTIME_TOAST } from './DashboardPage'
import { useRealtimeRefresh } from '../hooks/useRealtimeRefresh'

const admin = { id: 'a', sbId: 'a', email: 'a@x', name: 'Admin', role: 'admin', wh: '' }
const anbardar = { ...admin, id: 'b', sbId: 'b', role: 'anbardar', wh: 'Ələt' }

const rowsOf = (testId: string) => within(screen.getByTestId(testId)).getAllByRole('row').slice(1)
const cells = (tr: HTMLElement) => Array.from(tr.querySelectorAll('td')).map((td) => td.textContent)
const renderPage = (me = admin, onOpenMovements = vi.fn(), onOpenControls = vi.fn()) => render(<DashboardPage me={me} onOpenMovements={onOpenMovements} onOpenControls={onOpenControls} />)

beforeEach(() => {
  vi.clearAllMocks()
  load.mockResolvedValue({ ok: true, error: null })
  state = baseState()
})

describe('shell — M11-04, M11-05, M11-07, M11-13, M11-14', () => {
  it('renders the heading and the subtitle over ALL warehouses with the scoped count', () => {
    renderPage()
    expect(screen.getByRole('heading', { name: 'İdarə paneli' })).toBeTruthy()
    expect(screen.getByTestId('dash-sub').textContent).toBe('Bütün anbarlar · son əməliyyat tarixi 2026-02-01 · 3 hərəkət qeydi')
  })

  it('with a warehouse selected the subtitle prints the RAW name, keeps the global last date and counts only that warehouse', () => {
    state.warehouse = 'Xocahəsən'
    renderPage()
    expect(screen.getByTestId('dash-sub').textContent).toBe('Xocahəsən · son əməliyyat tarixi 2026-02-01 · 1 hərəkət qeydi')
  })

  it('selector: «Bütün anbarlar» + active anbar names only, aliased text with raw values; change reaches the store', () => {
    renderPage()
    const sel = screen.getByTestId('dash-wh') as HTMLSelectElement
    expect(Array.from(sel.options).map((o) => [o.value, o.textContent])).toEqual([['', 'Bütün anbarlar'], ['Ələt', 'Ələt'], ['Xocahəsən', 'Xocəsən']])
    fireEvent.change(sel, { target: { value: 'Xocahəsən' } })
    expect(setWarehouse).toHaveBeenCalledWith('Xocahəsən')
  })

  it('loads on mount without a toast, subscribes to exactly the four legacy tables with the default debounce, and toasts only after a successful realtime reload', async () => {
    renderPage()
    expect(load).toHaveBeenCalledTimes(1)
    await Promise.resolve()
    expect(show).not.toHaveBeenCalled()
    const call = vi.mocked(useRealtimeRefresh).mock.calls[0]
    expect(call[0]).toBe(true)
    expect([...call[1]]).toEqual(['movements', 'items', 'partners', 'warehouses'])
    expect(call.length).toBe(3)
    load.mockClear()
    call[2]()
    expect(load).toHaveBeenCalledTimes(1)
    await Promise.resolve(); await Promise.resolve()
    expect(show).toHaveBeenCalledWith(REALTIME_TOAST)
    /* Negative control: a failed realtime reload does not toast. */
    show.mockClear()
    load.mockResolvedValue({ ok: false, error: 'x' })
    call[2]()
    await Promise.resolve(); await Promise.resolve()
    expect(show).not.toHaveBeenCalled()
  })
})

describe('KPIs — M11-21 … M11-26', () => {
  it('renders the five KPIs in order with exact values, subs and classes', () => {
    renderPage()
    const kpis = Array.from(screen.getByTestId('dash-kpis').children) as HTMLElement[]
    expect(kpis.map((k) => k.className)).toEqual(['kpi g', 'kpi', 'kpi o', 'kpi v', 'kpi r'])
    expect(kpis.map((k) => k.querySelector('.eyebrow')!.textContent)).toEqual(['Qalıq dəyəri', 'Ümumi mədaxil', 'Ümumi məxaric', 'Satınalma məbləği', 'Qiyməti olmayan mövqe'])
    /* 40 − 3 + 0 = 37; positions with |q| > 1e-9 = 3; in 4 + 1 = 5; out 1; 1/5 = 20.0%;
       purchase 4 × 2.5 = 10; priceless non-zero positions = 1 (ZZZ). */
    expect(kpis.map((k) => k.querySelector('.v')!.textContent)).toEqual(['37,00 ₼', '5,00', '1,00', '10,00 ₼', '1'])
    expect(kpis.map((k) => k.querySelector('.s')!.textContent)).toEqual(['3 aktiv mövqe', 'bütün dövr üzrə', '20.0% dövriyyə', 'qiyməti bəlli sətirlər üzrə', 'dəyərləndirmə natamamdır'])
  })

  it('follows the selector: Xocahəsən alone has no inbound, so «0% dövriyyə» and class g on the priceless KPI', () => {
    state.warehouse = 'Xocahəsən'
    renderPage()
    const kpis = Array.from(screen.getByTestId('dash-kpis').children) as HTMLElement[]
    expect(kpis[2].querySelector('.s')!.textContent).toBe('0% dövriyyə')
    expect(kpis[4].className).toBe('kpi g')
    expect(kpis[4].querySelector('.s')!.textContent).toBe('hamısı qiymətlidir')
    expect(kpis[0].querySelector('.v')!.textContent).toBe('-3,00 ₼')
  })
})

describe('charts — M11-30 … M11-35', () => {
  it('the bar chart covers every active anbar, sorted by rounded value, and IGNORES the selector; the hint is present', () => {
    state.warehouse = 'Xocahəsən'
    renderPage()
    const bars = Array.from(screen.getByTestId('ch-wh').querySelectorAll('[data-bar]'))
    expect(bars.map((b) => b.getAttribute('data-bar'))).toEqual(['Ələt', 'Xocahəsən'])
    expect(bars.map((b) => b.querySelector('span.num')!.textContent)).toEqual(['40,00 ₼', '-3,00 ₼'])
    expect(bars.map((b) => b.querySelector('span.muted')!.textContent)).toEqual(['2 mövqe', '1 mövqe'])
    expect(screen.getByText('Dəyər = qalıq × son məlum vahid qiyməti. Qiyməti daxil edilməmiş mallar sıfır dəyərlə iştirak edir.')).toBeTruthy()
  })

  it('the donut FOLLOWS the selector', () => {
    renderPage()
    let legend = Array.from(screen.getByTestId('donut-legend').children).map((l) => l.textContent)
    expect(legend).toEqual(['Satınalma1', 'Sahəyə1', 'Qaytarma1'])
    state.warehouse = 'Xocahəsən'
    renderPage()
    legend = Array.from(screen.getAllByTestId('donut-legend')[1].children).map((l) => l.textContent)
    expect(legend).toEqual(['Sahəyə1'])
  })
})

describe('tables — M11-40 … M11-45, M11-73, M11-74', () => {
  it('top-10: value-descending rows with name/code, aliased warehouse, quantity+unit, money; headers with th.r', () => {
    renderPage()
    const heads = Array.from(screen.getByTestId('t-top').querySelectorAll('th')).map((th) => [th.textContent, th.className])
    expect(heads).toEqual([['Mal', ''], ['Anbar', ''], ['Qalıq', 'r'], ['Dəyər', 'r']])
    const rows = rowsOf('t-top')
    expect(rows.map(cells)).toEqual([
      ['Item AA', 'Ələt', '4,00 ədəd', '40,00 ₼'],
      ['(nomenklaturada yoxdur: ZZZ)ZZZ', 'Ələt', '1,00 ', '—'],
      ['Item BB', 'Xocəsən', '-1,00 kq', '-3,00 ₼'],
    ])
    expect(rows.every((r) => r.className === 'clk')).toBe(true)
  })

  it('recent: created_at-desc rows with fmtD date + recorder hint, name-or-code + aliased warehouse, type tag, signed quantities', () => {
    renderPage()
    const rows = rowsOf('t-recent')
    expect(rows.map(cells)).toEqual([
      ['01.02.2026Excel idxalı', 'Item BXocəsən', 'Sahəyə', '−1,00'],
      ['05.01.2026ali@example.com', 'Item AƏlət', 'Satınalma', '+4,00'],
      ['02.01.2026digər istifadəçi', 'ZZZƏlət', 'Qaytarma', '+1,00'],
    ])
    expect(rows.map((r) => r.querySelector('.tag')!.className)).toEqual(['tag t-out', 'tag t-in', 'tag t-mut'])
    const qty = rows[1].querySelectorAll('td')[3].querySelector('span') as HTMLElement
    expect(qty.style.color).toBe('var(--in)')
    expect((rows[0].querySelectorAll('td')[3].querySelector('span') as HTMLElement).style.color).toBe('var(--out)')
  })

  it('recent shows both signs when a row carries in and out, and caps at 10 rows', () => {
    state.indexes.operational = [
      mov({ id: 'both', in_qty: 2, out_qty: 1 }),
      ...Array.from({ length: 12 }, (_, i) => mov({ id: 'r' + i, created_at: `2025-01-${String(i + 1).padStart(2, '0')}T00:00:00Z` })),
    ]
    renderPage()
    const rows = rowsOf('t-recent')
    expect(rows).toHaveLength(10)
    expect(cells(rows[0])[3]).toBe('+2,00−1,00')
  })

  it('prints the legacy empty block in both tables when the scope has nothing', () => {
    state.indexes = { byItem: new Map(), priceObs: new Map(), operational: [], bal: [] }
    renderPage()
    expect(within(screen.getByTestId('t-top')).getByText('Məlumat yoxdur')).toBeTruthy()
    expect(within(screen.getByTestId('t-recent')).getByText('Məlumat yoxdur')).toBeTruthy()
    expect(screen.getByTestId('dash-sub').textContent).toContain('son əməliyyat tarixi —')
  })

  it('«Hamısı» navigates through onOpenMovements', () => {
    const onOpenMovements = vi.fn()
    renderPage(admin, onOpenMovements)
    fireEvent.click(screen.getByTestId('dash-all-movements'))
    expect(onOpenMovements).toHaveBeenCalledOnce()
  })

  it('a row click in either table opens the shared item card, whose buttons reach the page callbacks; close returns', () => {
    const onOpenOperation = vi.fn()
    const onEditItem = vi.fn()
    render(<DashboardPage me={admin} onOpenMovements={vi.fn()} onOpenOperation={onOpenOperation} onEditItem={onEditItem} />)
    fireEvent.click(rowsOf('t-top')[0])
    expect(screen.getByText(/Mal kartoçkası · A/)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: /Bu mal üzrə əməliyyat/ }))
    expect(onOpenOperation).toHaveBeenCalledWith('A')
    fireEvent.click(screen.getByRole('button', { name: /Malı redaktə et/ }))
    expect(onEditItem).toHaveBeenCalledWith('A')
    fireEvent.click(screen.getByRole('button', { name: /Bağla/ }))
    expect(screen.queryByText(/Mal kartoçkası · A/)).toBeNull()
    fireEvent.click(rowsOf('t-recent')[0])
    expect(screen.getByText(/Mal kartoçkası · B/)).toBeTruthy()
  })
})

describe('alerts — M11-50, M11-62 (D-L3)', () => {
  it('renders one routed pill per control group with title, count and dgr on high severity', () => {
    const onOpenControls = vi.fn()
    renderPage(admin, vi.fn(), onOpenControls)
    const pills = Array.from(screen.getByTestId('dash-alerts').querySelectorAll('button')) as HTMLButtonElement[]
    /* Fixture yields: neg (B, high), nop (ZZZ, med), orph (ZZZ movement, high). */
    expect(pills.map((p) => [p.getAttribute('data-alert'), p.className, p.textContent])).toEqual([
      ['neg', 'btn dgr', 'Mənfi qalıq — 1'],
      ['nop', 'btn', 'Qiyməti olmayan qalıq — 1'],
      ['orph', 'btn dgr', 'Nomenklaturada olmayan mal — 1'],
    ])
    expect(pills.every((p) => p.getAttribute('aria-disabled') === null)).toBe(true)
    fireEvent.click(pills[0])
    expect(onOpenControls).toHaveBeenCalledTimes(1)
  })

  it('alerts are GLOBAL — the selector does not change them', () => {
    state.warehouse = 'Ələt'
    renderPage()
    expect(screen.getByTestId('dash-alerts').querySelectorAll('button')).toHaveLength(3)
  })

  it('prints the legacy hint when no rule fires', () => {
    state.indexes = { byItem: new Map(), priceObs: new Map(), operational: [mov({})], bal: [bal({})] }
    renderPage()
    expect(screen.getByText('Avtomatik yoxlamalar problem aşkarlamadı.')).toBeTruthy()
  })
})

describe('load states — M11-12', () => {
  it('shows the loading block before the first snapshot', () => {
    state.loading = true; state.loaded = false
    renderPage()
    expect(screen.getByTestId('dash-loading')).toBeTruthy()
    expect(screen.queryByTestId('dash-kpis')).toBeNull()
  })

  it('a first-ever failure shows the load error and no dashboard', () => {
    state.loaded = false; state.error = 'Kontragentlər yüklənmədi'
    renderPage()
    expect(screen.getByTestId('dash-load-error').textContent).toContain('Kontragentlər yüklənmədi')
    expect(screen.queryByTestId('dash-kpis')).toBeNull()
  })

  it('a failed refresh keeps the previous dashboard on screen and flags «Yenilənmədi»', () => {
    state.error = 'Mal hərəkəti yüklənmədi'
    renderPage()
    expect(screen.getByTestId('dash-refresh-error').textContent).toContain('Yenilənmədi')
    expect(screen.getByTestId('dash-kpis')).toBeTruthy()
    expect(rowsOf('t-top')).toHaveLength(3)
  })

  it('renders for an anbardar exactly as returned (no client narrowing): both anbars still listed', () => {
    renderPage(anbardar)
    const sel = screen.getByTestId('dash-wh') as HTMLSelectElement
    expect(sel.options).toHaveLength(3)
    expect(screen.getByTestId('ch-wh').querySelectorAll('[data-bar]')).toHaveLength(2)
  })
})
