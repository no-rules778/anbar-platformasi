import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'

/* T3 — the page (M10-01 … M10-05, M10-12, M10-13, M10-20 … M10-50). The
   store and the realtime hook are mocked; the ItemCard is REAL so the card
   handoffs are exercised through its own buttons. Unit/page evidence only. */

const load = vi.fn()

interface Bal { w: string; c: string; in: number; out: number; n: number; q: number; last: string; first: string; price: number; val: number; name: string; unit: string }
interface Mov { id: string; item_code: string; warehouse: string; date: string; in_qty: number; out_qty: number; price: number; partner: string; type: string; note?: string | null; doc_num?: string | null }

const bal = (over: Partial<Bal>): Bal => ({
  w: 'W', c: 'A', in: 2, out: 0, n: 1, q: 2, last: '2026-01-01', first: '2026-01-01', price: 10, val: 20, name: 'Item A', unit: 'ədəd', ...over,
})
const mov = (over: Partial<Mov>): Mov => ({
  id: 'm', item_code: 'A', warehouse: 'W', date: '2026-01-01', in_qty: 2, out_qty: 0, price: 10, partner: 'Hidden project', type: 'Satınalma', ...over,
})

const baseState = () => ({
  locations: [
    { id: 1, name: 'W', type: 'anbar', active: true },
    { id: 4, name: 'Xocahəsən', type: 'anbar', active: true },
    { id: 3, name: 'Old anbar', type: 'anbar', active: false },
    { id: 2, name: 'Hidden project', type: 'layihə', active: false },
  ],
  items: [{ code: 'A', name: 'Item A', unit: 'ədəd', price: 10 }, { code: 'B', name: 'Item B', unit: 'ədəd', price: 3 }],
  indexes: {
    byItem: new Map(), priceObs: new Map(),
    operational: [
      mov({}),
      /* B: an ordinary outbound in Xocahəsən 61 days before the newest date → «hərəkətsiz». */
      mov({ id: 'b-in', item_code: 'B', warehouse: 'Xocahəsən', date: '2025-10-01', in_qty: 3, partner: '' }),
      mov({ id: 'b-out', item_code: 'B', warehouse: 'Xocahəsən', date: '2025-11-01', in_qty: 0, out_qty: 2, type: 'Silinmə', partner: 'Hidden project' }),
    ],
    bal: [
      bal({}),
      bal({ w: 'Xocahəsən', c: 'B', in: 3, out: 2, n: 2, q: 1, last: '2025-11-01', first: '2025-10-01', price: 3, val: 3, name: 'Item B' }),
    ],
  },
  loading: false, loaded: true, error: null as string | null, load,
})

let state = baseState()

vi.mock('../store/warehouseOverview.store', () => ({ useWarehouseOverviewStore: () => state }))
vi.mock('../hooks/useRealtimeRefresh', () => ({ useRealtimeRefresh: vi.fn() }))
vi.mock('../lib/xls', () => ({ xls: vi.fn() }))
/* The soft cap is mocked to 3 so the cut/export split is proved without
   rendering 3000 rows (which times out under a parallel full run). The real
   value, 3000, is pinned by showAllCut's own tests; what THIS file proves is
   that the page cuts the TABLE through applyCut and exports the FULL set. */
vi.mock('../lib/showAllCut', () => ({
  SHOW_MAX: 3,
  applyCut: <T,>(rows: T[], showAll: boolean) => (showAll || rows.length <= 3 ? rows : rows.slice(0, 3)),
}))

import { WarehouseOverviewPage } from './WarehouseOverviewPage'
import { useRealtimeRefresh } from '../hooks/useRealtimeRefresh'
import { xls } from '../lib/xls'

const admin = { id: 'a', sbId: 'a', email: 'a@x', name: 'Admin', role: 'admin', wh: '' }
const anbardar = { ...admin, id: 'b', role: 'anbardar', wh: 'W' }
const rehber = { ...admin, id: 'c', role: 'rehber' }

const rowsOf = (testId: string) => within(screen.getByTestId(testId)).getAllByRole('row').slice(1)
const cells = (tr: HTMLElement) => Array.from(tr.querySelectorAll('td')).map((td) => td.textContent)

beforeEach(() => {
  vi.clearAllMocks()
  state = baseState()
})

describe('shell — M10-02, M10-03, M10-04, M10-13', () => {
  it('renders the exact heading and subtitle', () => {
    render(<WarehouseOverviewPage me={anbardar} onManage={vi.fn()} />)
    expect(screen.getByRole('heading', { name: 'Anbar və layihələr' })).toBeTruthy()
    expect(screen.getByText('Fiziki anbarlar qalıq saxlayır; layihə/təhvil məntəqələri isə məxaric ünvanı kimi çıxış edir.')).toBeTruthy()
  })

  it('loads on mount and subscribes to exactly movements, items and warehouses with the default debounce', () => {
    render(<WarehouseOverviewPage me={admin} onManage={vi.fn()} />)
    expect(load).toHaveBeenCalled()
    const call = vi.mocked(useRealtimeRefresh).mock.calls[0]
    expect(call[0]).toBe(true)
    expect([...call[1]]).toEqual(['movements', 'items', 'warehouses'])
    expect(typeof call[2]).toBe('function')
    /* No debounce override — the hook's 400 ms default applies. */
    expect(call.length).toBe(3)
    /* The realtime callback re-loads through the store. */
    load.mockClear()
    call[2]()
    expect(load).toHaveBeenCalledTimes(1)
  })

  it('«Yeni ünvan» is enabled for admin and navigates through onManage', () => {
    const onManage = vi.fn()
    render(<WarehouseOverviewPage me={admin} onManage={onManage} />)
    const btn = screen.getByRole('button', { name: 'Yeni ünvan' }) as HTMLButtonElement
    expect(btn.disabled).toBe(false)
    fireEvent.click(btn)
    expect(onManage).toHaveBeenCalledOnce()
  })

  it.each([['anbardar', anbardar], ['rehber', rehber]])('the screen stays visible for %s but «Yeni ünvan» is disabled and inert', (_role, me) => {
    const onManage = vi.fn()
    render(<WarehouseOverviewPage me={me} onManage={onManage} />)
    expect(screen.getByRole('heading', { name: 'Anbar və layihələr' })).toBeTruthy()
    expect(screen.getByText('Fiziki anbarlar')).toBeTruthy()
    const btn = screen.getByRole('button', { name: 'Yeni ünvan' }) as HTMLButtonElement
    expect(btn.disabled).toBe(true)
    fireEvent.click(btn)
    expect(onManage).not.toHaveBeenCalled()
  })
})

describe('physical warehouses — M10-20 … M10-26', () => {
  it('lists active `anbar` rows only, in snapshot order, with alias, counts, value and «—» for no movement', () => {
    render(<WarehouseOverviewPage me={admin} onManage={vi.fn()} />)
    const rows = rowsOf('anb-wh')
    expect(rows.map(cells)).toEqual([
      ['W', '1', '20,00 ₼', '1', '2026-01-01'],
      ['Xocəsən', '1', '3,00 ₼', '2', '2025-11-01'],
    ])
    /* Inactive anbar and the layihə are NOT physical warehouses. */
    expect(within(screen.getByTestId('anb-wh')).queryByText('Old anbar')).toBeNull()
    expect(within(screen.getByTestId('anb-wh')).queryByText('Hidden project')).toBeNull()
  })

  it('renders «—» when a warehouse has no operational movement and 0 positions', () => {
    state.locations = [{ id: 1, name: 'Empty', type: 'anbar', active: true }]
    render(<WarehouseOverviewPage me={admin} onManage={vi.fn()} />)
    expect(rowsOf('anb-wh').map(cells)).toEqual([['Empty', '0', '—', '0', '—']])
  })

  it('renders the exact five headers', () => {
    render(<WarehouseOverviewPage me={admin} onManage={vi.fn()} />)
    const ths = within(screen.getByTestId('anb-wh')).getAllByRole('columnheader').map((th) => th.textContent)
    expect(ths).toEqual(['Anbar', 'Mövqe', 'Qalıq dəyəri', 'Hərəkət', 'Son əməliyyat'])
  })
})

describe('locations — M10-30 … M10-34 (D-K2)', () => {
  it('lists EVERY loaded row including inactive ones and anbar rows, with badge classes and quantity turnover', () => {
    render(<WarehouseOverviewPage me={admin} onManage={vi.fn()} />)
    const rows = rowsOf('anb-loc')
    expect(rows.map(cells)).toEqual([
      ['W', 'anbar', '0', '0,00'],
      ['Xocahəsən', 'anbar', '0', '0,00'],
      ['Old anbar', 'anbar', '0', '0,00'],
      /* two movements name it as partner: in 2 + out 2 = 4 */
      ['Hidden project', 'layihə', '2', '4,00'],
    ])
    const badge = (tr: HTMLElement) => tr.querySelector('.tag')?.className
    expect(badge(rows[0])).toBe('tag t-op')
    expect(badge(rows[3])).toBe('tag t-mut')
    const ths = within(screen.getByTestId('anb-loc')).getAllByRole('columnheader').map((th) => th.textContent)
    expect(ths).toEqual(['Ünvan / layihə', 'Tipi', 'Əməliyyat', 'Dövriyyə'])
  })

  it('prints the legacy empty block when the snapshot has no rows', () => {
    state.locations = []
    state.indexes = { byItem: new Map(), priceObs: new Map(), operational: [], bal: [] }
    render(<WarehouseOverviewPage me={admin} onManage={vi.fn()} />)
    expect(within(screen.getByTestId('anb-wh')).getByText('Məlumat yoxdur')).toBeTruthy()
    expect(within(screen.getByTestId('anb-loc')).getByText('Məlumat yoxdur')).toBeTruthy()
  })
})

describe('load states — M10-11, M10-12', () => {
  it('shows the loading block before the first snapshot', () => {
    state.loading = true; state.loaded = false
    render(<WarehouseOverviewPage me={admin} onManage={vi.fn()} />)
    expect(screen.getByTestId('anb-loading')).toBeTruthy()
    expect(screen.queryByTestId('anb-wh')).toBeNull()
  })

  it('a first-ever failure shows the load error and no tables', () => {
    state.loaded = false; state.error = 'Nomenklatura yüklənmədi'
    render(<WarehouseOverviewPage me={admin} onManage={vi.fn()} />)
    expect(screen.getByTestId('anb-load-error').textContent).toContain('Nomenklatura yüklənmədi')
    expect(screen.queryByTestId('anb-wh')).toBeNull()
    expect(screen.queryByTestId('anb-refresh-error')).toBeNull()
  })

  /* MUTATION: hiding the tables while `error` is set would blank a screen
     whose store still holds the previous complete snapshot. */
  it('a failed refresh keeps the previous complete snapshot on screen and flags «Yenilənmədi»', () => {
    state.error = 'Mal hərəkəti yüklənmədi'
    render(<WarehouseOverviewPage me={admin} onManage={vi.fn()} />)
    expect(screen.getByTestId('anb-refresh-error').textContent).toContain('Yenilənmədi')
    expect(screen.getByTestId('anb-refresh-error').textContent).toContain('Mal hərəkəti yüklənmədi')
    expect(rowsOf('anb-wh')).toHaveLength(2)
    expect(rowsOf('anb-loc')).toHaveLength(4)
    expect(screen.queryByTestId('anb-load-error')).toBeNull()
  })
})

describe('dead stock view — D-K1, M10-40 … M10-50', () => {
  const openDead = () => fireEvent.click(screen.getByRole('button', { name: 'Hərəkətsiz və ölü qalıq' }))

  it('is a view of THIS page: the tab swaps the tables for the KPIs + table and the export button, without any Reports module', () => {
    render(<WarehouseOverviewPage me={admin} onManage={vi.fn()} />)
    openDead()
    expect(screen.queryByTestId('anb-wh')).toBeNull()
    expect(screen.getByTestId('anb-dead')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Yeni ünvan' })).toBeNull()
    expect(screen.getByRole('button', { name: 'Excel' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Anbarlar' }))
    expect(screen.getByTestId('anb-wh')).toBeTruthy()
    expect(screen.queryByTestId('anb-dead')).toBeNull()
  })

  it('renders all three KPIs with the legacy classes and the derived rows in value-descending order with status tags', () => {
    render(<WarehouseOverviewPage me={admin} onManage={vi.fn()} />)
    openDead()
    const kpi = (label: string) => document.querySelector(`[data-kpi="${label}"]`) as HTMLElement
    expect(kpi('Hərəkətsiz mövqe').querySelector('.v')?.textContent).toBe('2')
    expect(kpi('Hərəkətsiz mövqe').className).toBe('kpi o')
    expect(kpi('Dondurulmuş dəyər').querySelector('.v')?.textContent).toBe('23,00 ₼')
    expect(kpi('Dondurulmuş dəyər').className).toBe('kpi r')
    expect(kpi('Heç istifadə olunmayıb').querySelector('.v')?.textContent).toBe('1')
    expect(kpi('Heç istifadə olunmayıb').className).toBe('kpi')

    const ths = within(screen.getByTestId('anb-dead')).getAllByRole('columnheader').map((th) => th.textContent)
    expect(ths).toEqual(['Kod', 'Mal', 'Anbar', 'Qalıq', 'Dəyər', 'Son hərəkət', 'Gün', 'Status'])
    const rows = rowsOf('anb-dead')
    /* A (val 20, never used, 0 days from the newest date 2026-01-01) then B
       (val 3, used, 61 days). The table prints the RAW warehouse name. */
    expect(rows.map(cells)).toEqual([
      ['A', 'Item A', 'W', '2,00', '20,00 ₼', '01.01.2026', '0', 'istifadəsiz'],
      ['B', 'Item B', 'Xocahəsən', '1,00', '3,00 ₼', '01.11.2025', '61', 'hərəkətsiz'],
    ])
    expect(rows[0].querySelector('.tag')?.className).toBe('tag t-rm')
    expect(rows[1].querySelector('.tag')?.className).toBe('tag t-mut')
    expect(rows[0].className).toBe('clk')
  })

  it('«Excel» exports the eight-column matrix over the full set under the legacy name', () => {
    render(<WarehouseOverviewPage me={admin} onManage={vi.fn()} />)
    openDead()
    fireEvent.click(screen.getByRole('button', { name: 'Excel' }))
    expect(xls).toHaveBeenCalledTimes(1)
    const [matrix, name] = vi.mocked(xls).mock.calls[0]
    expect(name).toBe('hereketsiz_qaliq')
    expect(matrix).toEqual([
      ['Kod', 'Mal', 'Anbar', 'Qalıq', 'Dəyər', 'Son hərəkət', 'Hərəkətsiz gün', 'Heç vaxt istifadə olunmayıb'],
      ['A', 'Item A', 'W', 2, '20.00', '2026-01-01', 0, 'bəli'],
      ['B', 'Item B', 'Xocəsən', 1, '3.00', '2025-11-01', 61, ''],
    ])
  })

  /* `cut(rows, 'dead')` — the table stops at SHOW_MAX (mocked to 3 here,
     3000 in showAllCut.ts) while the export keeps every derived row
     (M10-49 «complete set»). MUTATION: exporting `deadShown` instead of
     `deadRows` gives 4 lines, not 5. */
  it('cuts the table at SHOW_MAX rows but exports all of them', () => {
    const many = Array.from({ length: 4 }, (_, i) => bal({ c: 'C' + i, val: i + 1, name: 'N' + i }))
    state.indexes = { byItem: new Map(), priceObs: new Map(), operational: [mov({ item_code: 'Z' })], bal: many }
    render(<WarehouseOverviewPage me={admin} onManage={vi.fn()} />)
    openDead()
    expect(rowsOf('anb-dead').map((tr) => tr.querySelector('.code')?.textContent)).toEqual(['C3', 'C2', 'C1'])
    fireEvent.click(screen.getByRole('button', { name: 'Excel' }))
    const matrix = vi.mocked(xls).mock.calls[0][0] as unknown[][]
    expect(matrix).toHaveLength(5)
    expect(matrix.slice(1).map((r) => r[0])).toEqual(['C3', 'C2', 'C1', 'C0'])
  })

  it('prints the legacy empty block when nothing is inactive', () => {
    state.indexes = { byItem: new Map(), priceObs: new Map(), operational: [mov({ out_qty: 1, in_qty: 0, type: 'Silinmə' })], bal: [bal({ last: '2026-01-01' })] }
    render(<WarehouseOverviewPage me={admin} onManage={vi.fn()} />)
    openDead()
    expect(within(screen.getByTestId('anb-dead')).getByText('Məlumat yoxdur')).toBeTruthy()
  })

  /* M10-48 — the row opens the EXISTING item card, whose own buttons drive
     the two handoffs (M5-55 order: the page's callback, not navigation
     inside the card). */
  it('a row click opens the shared item card and its buttons reach the page callbacks', () => {
    const onOpenOperation = vi.fn()
    const onEditItem = vi.fn()
    render(<WarehouseOverviewPage me={admin} onManage={vi.fn()} onOpenOperation={onOpenOperation} onEditItem={onEditItem} />)
    openDead()
    fireEvent.click(rowsOf('anb-dead')[1])
    const card = screen.getByRole('dialog', { name: 'Mal kartoçkası' })
    expect(card.textContent).toContain('Mal kartoçkası · B')
    fireEvent.click(within(card).getByRole('button', { name: 'Bu mal üzrə əməliyyat' }))
    expect(onOpenOperation).toHaveBeenCalledWith('B')
    fireEvent.click(within(card).getByRole('button', { name: 'Malı redaktə et' }))
    expect(onEditItem).toHaveBeenCalledWith('B')
    fireEvent.click(within(card).getByRole('button', { name: 'Bağla' }))
    expect(screen.queryByRole('dialog', { name: 'Mal kartoçkası' })).toBeNull()
  })
})
