import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, within, waitFor, act, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ComponentProps } from 'react'
/* Read from disk with the same Node globals App.nav.test.ts declares locally,
   rather than pulling @types/node into the application build. */
declare const process: { cwd(): string }
declare function require(id: string): { readFileSync(p: string, enc: string): string }

/* «Anbar qalıqları» — the page rows of Module J (Phase 9), T3.

   The snapshot READ and the condition WRITE are both mocked: this suite
   performs no network call and touches no live data. What is asserted is the
   page's own behaviour over the store and the T1/T2 pure logic it composes —
   markup, states, filters, the export wiring, the item-card drawer and the
   condition-edit flow including the D-J3 mid-edit refresh (M9-134b). */

const fetchBalancesSnapshot = vi.fn()
vi.mock('../api/balancesSnapshot.api', () => ({
  fetchBalancesSnapshot: () => fetchBalancesSnapshot(),
}))

const setStockCondition = vi.fn()
vi.mock('../api/setStockCondition.api', () => ({
  setStockCondition: (input: unknown) => setStockCondition(input),
}))

/* The realtime hook is replaced so a change can be FIRED without a Supabase
   channel, and so the page's subscription list is observable (M9-130). The
   hook's own debounce/teardown contract is covered in its own suite. */
const realtimeCalls: { enabled: boolean; tables: readonly string[] }[] = []
let fireRealtime: (() => void) | null = null
vi.mock('../hooks/useRealtimeRefresh', () => ({
  useRealtimeRefresh: (enabled: boolean, tables: readonly string[], onChange: () => void) => {
    realtimeCalls.push({ enabled, tables })
    fireRealtime = onChange
  },
}))

/* Only the WRITER is replaced; the matrix builders run for real. */
vi.mock('../lib/xls', async (orig) => ({
  ...(await orig<typeof import('../lib/xls')>()),
  xls: vi.fn(),
}))

/* The item card is Phase 5 code with its own suite; here only the drawer
   wiring is under test (M9-140) plus the two handoffs it exposes. */
vi.mock('../components/nomenclature/ItemCard', () => ({
  ItemCard: ({ code, onEdit, onOperation, onClose }: {
    code: string
    onEdit: (c: string) => void
    onOperation: (c: string) => void
    onClose: () => void
  }) => (
    <div data-testid="item-card">
      Kart: {code}
      <button onClick={() => onOperation(code)}>Bu mal üzrə əməliyyat</button>
      <button onClick={() => onEdit(code)}>Malı redaktə et</button>
      <button onClick={onClose}>Bağla</button>
    </div>
  ),
}))

import { BalancesPage } from './BalancesPage'
import { useBalancesStore, __resetBalancesRequestSeq, EMPTY_BALANCE_FILTERS } from '../store/balances.store'
import { useToastStore } from '../store/toast.store'
import { useSyncStore } from '../store/sync.store'
import { xls } from '../lib/xls'
import { nf, money, fmtD } from '../lib/format'
import { SHOW_MAX } from '../lib/showAllCut'
import { COND_COLS } from '../lib/condSplit'
import { COND_INPUT_ERROR } from '../lib/condInput'
import { CURRENT_EXPORT_HEADER, CURRENT_TABLE_HEADER } from '../lib/balanceExport'
import { INIT_BAL_TYPE } from '../lib/opLineValidation'
import type { MovementRow } from '../api/itemMovements.api'
import type { StockConditionRow } from '../api/stockConditions.api'
import type { Me } from '../lib/roles'

/* ------------------------------------------------------------ fixtures */

const ADMIN: Me = { id: 'u1', sbId: 's1', email: 'a@b.com', name: 'Admin User', role: 'admin', wh: '' }
const REHBER: Me = { ...ADMIN, id: 'u2', name: 'Rehber User', role: 'rehber' }
const ANBARDAR_ELET: Me = { ...ADMIN, id: 'u3', name: 'Anbardar Ələt', role: 'anbardar', wh: 'Ələt' }
const ANBARDAR_ASTARA: Me = { ...ADMIN, id: 'u4', name: 'Anbardar Astara', role: 'anbardar', wh: 'Astara' }

const WHS = ['Ələt', 'Astara', 'Xocahəsən']

const ITEMS = [
  { code: '0000001', name: 'Nasos', unit: 'ədəd', price: 5, category: null },
  { code: '0000002', name: 'Boru', unit: 'metr', price: 3, category: null },
  { code: '0000003', name: 'Kabel', unit: 'metr', price: 0, category: null },
  { code: '0000004', name: 'Vint', unit: 'ədəd', price: 2, category: null },
]

let mvId = 0
const mv = (over: Partial<MovementRow> = {}): MovementRow => ({
  id: 'm' + ++mvId, item_code: '0000001', warehouse: 'Ələt', date: '2026-09-01',
  in_qty: 0, out_qty: 0, price: 2, partner: 'Azpetrol', type: 'Satınalma',
  invoice_num: null, note: null, doc_num: null, created_at: '2026-09-01T10:00:00Z',
  channel: null, contract_num: null, created_by: null, ...over,
})

/** The «Əvvələ qalıq» + «Anbar qalığı» marker pair (M9-70, M9-84). */
const opening = (over: Partial<MovementRow>): MovementRow =>
  mv({ type: INIT_BAL_TYPE, partner: 'Anbar qalığı', ...over })

/* The ordinary history:
     Ələt/0000001  in 10, out 4         → q 6, val 30 (price 5)
     Ələt/0000002  opening 7            → q 7, val 21 (price 3)
     Astara/0000002 in 5                → q 5, val 15
     Ələt/0000003  out 2, priceless     → q −2, val 0  (negative, price «—»)
     0000004 has no movement at all     → the catalogue `nomv` row
   plus a CANCELLED opening document at Astara/0000001 (M9-71): the original
   and its «Ləğv:» reversal must both vanish from the operational source, so
   no opening row for Astara/0000001 may exist. */
function movements(): MovementRow[] {
  mvId = 0
  return [
    mv({ item_code: '0000001', warehouse: 'Ələt', in_qty: 10, date: '2026-09-01' }),
    mv({ item_code: '0000001', warehouse: 'Ələt', out_qty: 4, date: '2026-09-02', type: 'Silinmə' }),
    mv({ item_code: '0000002', warehouse: 'Astara', in_qty: 5, date: '2026-09-03' }),
    mv({ item_code: '0000003', warehouse: 'Ələt', out_qty: 2, date: '2026-09-04', type: 'Silinmə' }),
    opening({ item_code: '0000002', warehouse: 'Ələt', in_qty: 7, date: '2026-01-01' }),
    opening({ item_code: '0000001', warehouse: 'Astara', in_qty: 9, date: '2026-01-02', doc_num: 'SND-OLD' }),
    mv({ item_code: '0000001', warehouse: 'Astara', out_qty: 9, date: '2026-01-03', doc_num: 'SND-REV', note: 'Ləğv: SND-OLD' }),
  ]
}

const COND_ELET_1: StockConditionRow = { w: 'Ələt', c: '0000001', unfit: 1, repair: 0, onsite: 2, icare: 0, note: 'qeyd' }

function snapshot(over: Record<string, unknown> = {}) {
  return {
    ok: true as const,
    snapshot: {
      movements: movements(), items: ITEMS, warehouses: WHS, conditions: [COND_ELET_1], ...over,
    },
  }
}

const deferred = <T,>() => {
  let resolve!: (v: T) => void
  const promise = new Promise<T>((r) => { resolve = r })
  return { promise, resolve }
}

/* ------------------------------------------------------------ helpers */

async function renderPage(me: Me = ADMIN, extra: Partial<ComponentProps<typeof BalancesPage>> = {}) {
  const utils = render(<BalancesPage me={me} {...extra} />)
  await waitFor(() => expect(useBalancesStore.getState().loaded).toBe(true))
  return utils
}

function table(): HTMLTableElement {
  return document.querySelector('#t-bal table') as HTMLTableElement
}
function headerTexts(): string[] {
  return Array.from(table().querySelectorAll('thead th')).map((th) => th.textContent ?? '')
}
function bodyRows(): HTMLTableRowElement[] {
  return Array.from(table().querySelectorAll('tbody tr'))
}
function rowOf(code: string, warehouseLabel?: string): HTMLTableRowElement {
  const r = bodyRows().find((tr) =>
    tr.querySelector('.code')?.textContent === code
    && (warehouseLabel === undefined || tr.cells[2].textContent === warehouseLabel),
  )
  if (!r) throw new Error(`row ${code}${warehouseLabel ? '@' + warehouseLabel : ''} not rendered`)
  return r
}
function cells(tr: HTMLTableRowElement): string[] {
  return Array.from(tr.cells).map((td) => td.textContent ?? '')
}
function kpi(label: string): { value: string; sub: string; cls: string } {
  const el = document.querySelector(`[data-kpi="${label}"]`) as HTMLElement
  if (!el) throw new Error(`KPI ${label} missing`)
  return { value: el.querySelector('.v')!.textContent ?? '', sub: el.querySelector('.s')!.textContent ?? '', cls: el.className }
}
function toasts(): string[] {
  return useToastStore.getState().messages.map((m) => m.text)
}
const select = (label: string) => screen.getByLabelText(label) as HTMLSelectElement

beforeEach(() => {
  vi.clearAllMocks()
  realtimeCalls.length = 0
  fireRealtime = null
  __resetBalancesRequestSeq()
  useBalancesStore.setState({
    ...useBalancesStore.getInitialState(),
    filters: { ...EMPTY_BALANCE_FILTERS },
    showAll: false,
    loaded: false,
    loading: false,
    error: null,
    conds: new Map(),
  })
  useToastStore.setState({ messages: [] })
  useSyncStore.setState({ state: 'idle' })
  fetchBalancesSnapshot.mockResolvedValue(snapshot())
})
afterEach(() => {
  vi.useRealTimers()
})

/* ==================================================== markup and load */

describe('markup (M9-02, M9-03)', () => {
  it('renders the heading and subtitle verbatim', async () => {
    await renderPage()
    expect(screen.getByRole('heading', { level: 2 }).textContent).toBe('Anbar qalıqları')
    expect(screen.getByText('Qalıq = mədaxil − məxaric. Dəyər son məlum vahid qiyməti əsasında hesablanır.')).toBeTruthy()
  })

  it('carries «Excel» then «Çap», in that order', async () => {
    await renderPage()
    const btns = Array.from(document.querySelectorAll('.phead button')).map((b) => b.textContent)
    expect(btns).toEqual(['Excel', 'Çap'])
  })
})

describe('own data load and realtime scope (M9-05, M9-130, M9-130a)', () => {
  it('loads its own snapshot once on mount', async () => {
    await renderPage()
    expect(fetchBalancesSnapshot).toHaveBeenCalledTimes(1)
  })

  /* D-J2 — exactly the four tables this screen reads: `stock_conditions`
     is ADDED versus legacy (1174) and `partners` is DROPPED. MUTATION:
     copying the legacy list, or subscribing to audit_log. */
  it('subscribes to exactly movements, items, warehouses, stock_conditions — never partners or audit_log', async () => {
    await renderPage()
    expect(realtimeCalls.length).toBeGreaterThan(0)
    const { enabled, tables } = realtimeCalls[0]
    expect(enabled).toBe(true)
    expect([...tables]).toEqual(['movements', 'items', 'warehouses', 'stock_conditions'])
    expect(tables).not.toContain('partners')
    expect(tables).not.toContain('audit_log')
  })

  it('a realtime change reloads the snapshot through the store', async () => {
    await renderPage()
    expect(fetchBalancesSnapshot).toHaveBeenCalledTimes(1)
    await act(async () => { fireRealtime?.() })
    await waitFor(() => expect(fetchBalancesSnapshot).toHaveBeenCalledTimes(2))
  })
})

/* ====================================================== screen states */

describe('loading, error, empty and retained states (M9-12, M9-136)', () => {
  it('shows the loading block until the first snapshot arrives', async () => {
    const d = deferred<ReturnType<typeof snapshot>>()
    fetchBalancesSnapshot.mockReturnValue(d.promise)
    render(<BalancesPage me={ADMIN} />)
    expect(screen.getByText('Yüklənir…')).toBeTruthy()
    expect(document.querySelector('#t-bal table')).toBeNull()
    await act(async () => { d.resolve(snapshot()) })
    await waitFor(() => expect(table()).toBeTruthy())
  })

  it('a first-ever failure is a real error state, never an empty table or «sıfır qalıq»', async () => {
    fetchBalancesSnapshot.mockResolvedValue({ ok: false, error: 'Mal vəziyyəti işarələri yüklənmədi' })
    render(<BalancesPage me={ADMIN} />)
    await waitFor(() => expect(screen.getByTestId('bal-load-error')).toBeTruthy())
    expect(screen.getByTestId('bal-load-error').textContent).toContain('Mal vəziyyəti işarələri yüklənmədi')
    expect(screen.queryByTestId('bal-empty')).toBeNull()
    expect(kpi('Mövqe sayı').value).toBe(nf(0))
  })

  it('a genuine empty result is the empty block, not an error', async () => {
    fetchBalancesSnapshot.mockResolvedValue(snapshot({ movements: [], items: [], conditions: [] }))
    await renderPage()
    expect(screen.getByTestId('bal-empty').textContent).toContain('Məlumat yoxdur')
    expect(screen.queryByTestId('bal-load-error')).toBeNull()
    expect(screen.queryByTestId('bal-refresh-error')).toBeNull()
  })

  /* M9-12 — a failed REFRESH keeps the previous snapshot whole. */
  it('a failed refresh keeps the rows and markers on screen and shows «Yenilənmədi» above them', async () => {
    await renderPage()
    expect(bodyRows().length).toBe(4)
    fetchBalancesSnapshot.mockResolvedValue({ ok: false, error: 'şəbəkə' })
    await act(async () => { fireRealtime?.() })
    await waitFor(() => expect(screen.getByTestId('bal-refresh-error')).toBeTruthy())
    expect(screen.getByTestId('bal-refresh-error').textContent).toContain('Yenilənmədi')
    expect(screen.getByTestId('bal-refresh-error').textContent).toContain('şəbəkə')
    expect(bodyRows().length).toBe(4)
    /* the marker survived too (D-J1 → M9-12 retention includes conds) */
    expect(cells(rowOf('0000001', 'Ələt'))[7]).toBe(nf(1, 2))
    expect(screen.queryByTestId('bal-load-error')).toBeNull()
  })
})

/* ===================================================== current view */

describe('current-view table (M9-40, M9-110a, M9-110b, M9-36, M9-20)', () => {
  it('uses the TABLE header order — Kod first — not the export order', async () => {
    await renderPage()
    expect(headerTexts()).toEqual([...CURRENT_TABLE_HEADER])
    expect(headerTexts()[0]).toBe('Kod')
    expect(CURRENT_EXPORT_HEADER[0]).toBe('Anbar')
    expect(headerTexts()).not.toEqual([...CURRENT_EXPORT_HEADER])
  })

  it('renders the four condition columns in COND_COLS order between Qalıq and Vahid qiyməti', async () => {
    await renderPage()
    expect(headerTexts().slice(7, 11)).toEqual(COND_COLS.map((c) => c.t))
  })

  it('formats an ordinary row exactly as the legacy cells do', async () => {
    await renderPage()
    const tr = rowOf('0000001', 'Ələt')
    expect(tr.cells[0].querySelector('span.code')?.textContent).toBe('0000001')
    expect(tr.cells[1].querySelector('div.nm')?.textContent).toBe('Nasos')
    const c = cells(tr)
    expect(c.slice(2, 7)).toEqual(['Ələt', 'ədəd', nf(10, 2), nf(4, 2), nf(6, 2)])
    expect(tr.cells[6].querySelector('b')?.className).toBe('')
    /* markers: unfit 1, repair 0 → «—», onsite 2, icare 0 → «—» */
    expect(c.slice(7, 11)).toEqual([nf(1, 2), '—', nf(2, 2), '—'])
    expect(c[11]).toBe(nf(5, 2))
    expect(c[12]).toBe(money(30))
    expect(c[13]).toBe(fmtD('2026-09-02'))
  })

  it('a negative quantity is bold with the neg class; a priceless row shows a muted «—» and value money(0)', async () => {
    await renderPage()
    const tr = rowOf('0000003', 'Ələt')
    expect(tr.cells[6].querySelector('b.neg')?.textContent).toBe(nf(-2, 2))
    expect(tr.cells[11].querySelector('span.muted')?.textContent).toBe('—')
    expect(cells(tr)[12]).toBe(money(0))
  })

  it('passes the warehouse through whLabel() while the row keeps the stored name', async () => {
    fetchBalancesSnapshot.mockResolvedValue(snapshot({
      movements: [mv({ item_code: '0000001', warehouse: 'Xocahəsən', in_qty: 1 })],
      conditions: [],
    }))
    await renderPage()
    expect(cells(bodyRows()[0])[2]).toBe('Xocəsən')
  })

  /* M9-36 — the catalogue row with no movement, visible in «Hamısı». */
  it('a nomv row shows the «hərəkət yoxdur» tag instead of a date and «—» as its warehouse', async () => {
    await renderPage()
    fireEvent.click(screen.getByRole('button', { name: 'Hamısı' }))
    const tr = rowOf('0000004')
    expect(tr.cells[13].querySelector('span.tag')?.textContent).toBe('hərəkət yoxdur')
    expect(cells(tr)[2]).toBe('—')
  })

  /* M9-20 — the cancelled opening document and its reversal are GONE
     before any arithmetic: no row for Astara/0000001 at all. */
  it('a cancelled document and its reversal contribute nothing', async () => {
    await renderPage()
    fireEvent.click(screen.getByRole('button', { name: 'Hamısı' }))
    expect(bodyRows().some((tr) => tr.querySelector('.code')?.textContent === '0000001' && tr.cells[2].textContent === 'Astara')).toBe(false)
  })
})

/* M9-41 — markers are DISPLAY-ONLY. The same history with and without
   condition rows must yield identical q / val / KPI / export figures.
   MUTATION: letting a marker feed the balance arithmetic anywhere. */
describe('markers never alter balances (M9-41)', () => {
  async function figures(conditions: StockConditionRow[]) {
    vi.mocked(xls).mockReturnValue('xlsx')
    fetchBalancesSnapshot.mockResolvedValue(snapshot({ conditions }))
    const { unmount } = await renderPage()
    const k = ['Mövqe sayı', 'Ümumi miqdar', 'Ümumi dəyər', 'Sıfır qalıq', 'Mənfi qalıq'].map((l) => kpi(l).value)
    const q = bodyRows().map((r) => [cells(r)[6], cells(r)[12]])
    fireEvent.click(screen.getByTestId('bal-export'))
    const matrix = vi.mocked(xls).mock.calls.at(-1)![0] as unknown[][]
    /* export columns 4-6 (in/out/q) and 12 (val) — the marker columns 7-10 are excluded on purpose */
    const ex = matrix.slice(1).map((r) => [r[4], r[5], r[6], r[12]])
    unmount()
    return { k, q, ex, marked: matrix.slice(1).map((r) => r.slice(7, 11)) }
  }

  it('q, val, every KPI and the export balance columns are identical with and without markers', async () => {
    const withMarkers = await figures([{ ...COND_ELET_1, unfit: 4, repair: 3, onsite: 2, icare: 1 }])
    const without = await figures([])
    /* control: the marker columns themselves DID differ */
    expect(withMarkers.marked).not.toEqual(without.marked)
    expect(withMarkers.k).toEqual(without.k)
    expect(withMarkers.q).toEqual(without.q)
    expect(withMarkers.ex).toEqual(without.ex)
  })
})

describe('KPIs (M9-60, M9-62, M9-63)', () => {
  it('shows five tiles with the legacy values and classes', async () => {
    await renderPage()
    const labels = Array.from(document.querySelectorAll('[data-kpi]')).map((e) => e.getAttribute('data-kpi'))
    expect(labels).toEqual(['Mövqe sayı', 'Ümumi miqdar', 'Ümumi dəyər', 'Sıfır qalıq', 'Mənfi qalıq'])
    expect(kpi('Mövqe sayı')).toMatchObject({ value: nf(4), sub: 'anbar × mal sətri' })
    expect(kpi('Ümumi miqdar')).toMatchObject({ value: nf(16, 2), sub: 'ölçü vahidləri qarışıqdır' })
    expect(kpi('Ümumi dəyər')).toMatchObject({ value: money(66), sub: 'son qiymətlərlə' })
    expect(kpi('Ümumi dəyər').cls).toContain('g')
    expect(kpi('Sıfır qalıq')).toMatchObject({ value: nf(0), sub: 'bu filtrdə' })
    expect(kpi('Mənfi qalıq')).toMatchObject({ value: nf(1), sub: 'uçot xətası riski' })
    expect(kpi('Mənfi qalıq').cls).toMatch(/\br\b/)
  })

  it('«Mənfi qalıq» is green when no row is negative', async () => {
    fetchBalancesSnapshot.mockResolvedValue(snapshot({
      movements: [mv({ in_qty: 3 })], conditions: [],
    }))
    await renderPage()
    expect(kpi('Mənfi qalıq').cls).toMatch(/\bg\b/)
    expect(kpi('Mənfi qalıq').cls).not.toMatch(/\br\b/)
  })

  it('«Mövqe sayı» reads «mal üzrə cəmi» in the __sum view', async () => {
    await renderPage()
    fireEvent.change(select('Anbar'), { target: { value: '__sum' } })
    expect(kpi('Mövqe sayı').sub).toBe('mal üzrə cəmi')
  })
})

/* ============================================================ filters */

describe('filters (M9-18, M9-50, M9-53, M9-56, M9-57)', () => {
  it('the warehouse list is the FULL DB.whs even for an anbardar, with raw values and aliased labels', async () => {
    await renderPage(ANBARDAR_ASTARA)
    const opts = Array.from(select('Anbar').options).map((o) => [o.value, o.textContent])
    expect(opts).toEqual([
      ['', 'Anbarlar üzrə ayrı'], ['__sum', 'Ümumi (anbarlar birlikdə)'],
      ['Ələt', 'Ələt'], ['Astara', 'Astara'], ['Xocahəsən', 'Xocəsən'],
    ])
  })

  /* M9-50 — 200 ms debounce; name + code, lower-cased. MUTATION: filtering
     on every keystroke, or matching only the name. */
  it('search is debounced 200 ms and matches name + code case-insensitively', async () => {
    await renderPage()
    vi.useFakeTimers()
    fireEvent.change(screen.getByLabelText('Axtarış'), { target: { value: 'NASOS' } })
    act(() => { vi.advanceTimersByTime(199) })
    expect(useBalancesStore.getState().filters.q).toBe('')
    expect(bodyRows().length).toBe(4)
    act(() => { vi.advanceTimersByTime(1) })
    expect(useBalancesStore.getState().filters.q).toBe('nasos')
    expect(bodyRows().length).toBe(1)
    /* the code half of the haystack */
    fireEvent.change(screen.getByLabelText('Axtarış'), { target: { value: ' 0000003 ' } })
    act(() => { vi.advanceTimersByTime(200) })
    expect(bodyRows().map((r) => r.querySelector('.code')?.textContent)).toEqual(['0000003'])
  })

  it('the condition filter and the condition columns are hidden in the «Əvvələ qalıq» view', async () => {
    await renderPage()
    expect(screen.getByLabelText('Vəziyyət')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Əvvələ qalıq' }))
    expect(screen.queryByLabelText('Vəziyyət')).toBeNull()
    const hdr = headerTexts()
    expect(hdr).toHaveLength(8)
    for (const cc of COND_COLS) expect(hdr).not.toContain(cc.t)
  })

  it('the condition filter narrows to marked rows', async () => {
    await renderPage()
    fireEvent.change(select('Vəziyyət'), { target: { value: 'any' } })
    expect(bodyRows().map((r) => r.querySelector('.code')?.textContent)).toEqual(['0000001'])
    fireEvent.change(select('Vəziyyət'), { target: { value: 'repair' } })
    /* nothing is marked «Təmirə ehtiyaclı» — the empty block replaces the table */
    expect(document.querySelector('#t-bal table')).toBeNull()
    expect(screen.getByTestId('bal-empty')).toBeTruthy()
  })

  /* M9-56 / M9-57 / M9-112 / M9-118 — the 3000-row soft cap, its sticky
     expansion, and an export that ignores the cap. One heavy render. */
  it('caps at SHOW_MAX with a sticky «Hamısını göstər», while the export carries every filtered row', async () => {
    const many = Array.from({ length: SHOW_MAX + 1 }, (_, i) => ({
      code: String(100000 + i), name: 'Mal ' + i, unit: 'ədəd', price: 0, category: null,
    }))
    fetchBalancesSnapshot.mockResolvedValue(snapshot({ movements: [], items: many, conditions: [] }))
    useBalancesStore.getState().setFilters({ z: 'all' })
    await renderPage()
    expect(bodyRows().length).toBe(SHOW_MAX)
    const pager = screen.getByTestId('bal-pager')
    expect(pager.textContent).toContain(`${nf(SHOW_MAX + 1)} sətir`)
    const btn = within(pager).getByRole('button', { name: `Hamısını göstər (${nf(SHOW_MAX + 1)})` })

    /* export BEFORE expanding — the full filtered set, not the page */
    fireEvent.click(screen.getByTestId('bal-export'))
    const matrix = vi.mocked(xls).mock.calls[0][0] as unknown[][]
    expect(matrix).toHaveLength(SHOW_MAX + 2)
    expect(matrix[0]).toEqual([...CURRENT_EXPORT_HEADER])

    fireEvent.click(btn)
    expect(bodyRows().length).toBe(SHOW_MAX + 1)
    /* sticky across a filter change */
    fireEvent.change(select('Anbar'), { target: { value: '__sum' } })
    expect(bodyRows().length).toBe(SHOW_MAX + 1)
    expect(within(screen.getByTestId('bal-pager')).queryByRole('button')).toBeNull()
  }, 90_000)

  it('has no cap note at exactly SHOW_MAX rows', async () => {
    const exact = Array.from({ length: SHOW_MAX }, (_, i) => ({
      code: String(200000 + i), name: 'Mal ' + i, unit: 'ədəd', price: 0, category: null,
    }))
    fetchBalancesSnapshot.mockResolvedValue(snapshot({ movements: [], items: exact, conditions: [] }))
    useBalancesStore.getState().setFilters({ z: 'all' })
    await renderPage()
    expect(bodyRows().length).toBe(SHOW_MAX)
    expect(within(screen.getByTestId('bal-pager')).queryByRole('button')).toBeNull()
  }, 90_000)
})

/* ================================================= «Əvvələ qalıq» view */

describe('«Əvvələ qalıq» view (M9-71, M9-78, M9-80 … M9-83, M9-58)', () => {
  async function openInit(mode?: 'current') {
    await renderPage()
    fireEvent.click(screen.getByRole('button', { name: 'Əvvələ qalıq' }))
    if (mode) fireEvent.click(screen.getByRole('button', { name: 'Cari qalıq' }))
  }

  it('the table header is the legacy 8-column order with the ACTIVE mode label as the quantity column', async () => {
    await openInit()
    expect(headerTexts()).toEqual(['Kod', 'Malın adı', 'Anbar', 'Ölçü', 'İlkin miqdar', 'İlk mənbə anbar', 'Əvvələ qalıq tarixi', 'Son hərəkət'])
    fireEvent.click(screen.getByRole('button', { name: 'Cari qalıq' }))
    expect(headerTexts()[4]).toBe('Cari qalıq')
  })

  /* M9-71 — the source is the OPERATIONAL set: the cancelled opening
     document at Astara/0000001 must not reconstruct. MUTATION: feeding the
     raw movements to buildInitialBalanceRows(). */
  it('reconstructs only from operational movements — a cancelled opening document yields no row', async () => {
    await openInit()
    const codes = bodyRows().map((r) => [r.querySelector('.code')?.textContent, r.cells[2].textContent])
    expect(codes).toEqual([['0000002', 'Ələt']])
  })

  it('renders the source warehouse RAW (not aliased), dates through fmtD, and the pager with the mode label', async () => {
    /* legacy 2272 prints `b.opening_warehouse` through esc() only — the
       alias applies in the EXPORT (M9-113), never in this table cell. */
    fetchBalancesSnapshot.mockResolvedValue(snapshot({
      movements: [opening({ item_code: '0000002', warehouse: 'Xocahəsən', in_qty: 7, date: '2026-01-01' })],
      conditions: [],
    }))
    await openInit()
    const c = cells(bodyRows()[0])
    expect(c[2]).toBe('Xocəsən')
    expect(c[4]).toBe(nf(7, 2))
    expect(c[5]).toBe('Xocahəsən')
    expect(c[6]).toBe(fmtD('2026-01-01'))
    expect(c[7]).toBe(fmtD('2026-01-01'))
    expect(screen.getByTestId('bal-pager').textContent).toContain(`${nf(1)} sətir · İlkin miqdar`)
  })

  /* M9-81 — the «—» placeholder. It is reachable when the opening lots are
     fully consumed: the row is created at legacy 2005 WITHOUT a source
     warehouse and 2043 finds no surviving opening lot to fill it from. */
  it('renders «—» for a missing source warehouse once the opening lots are consumed', async () => {
    fetchBalancesSnapshot.mockResolvedValue(snapshot({
      movements: [
        opening({ item_code: '0000002', warehouse: 'Ələt', in_qty: 7, date: '2026-01-01' }),
        mv({ item_code: '0000002', warehouse: 'Ələt', out_qty: 7, date: '2026-02-01', type: 'Silinmə' }),
      ],
      conditions: [],
    }))
    await openInit()
    const c = cells(bodyRows()[0])
    expect(c[4]).toBe(nf(7, 2))
    expect(c[5]).toBe('—')
    expect(c[7]).toBe(fmtD('2026-02-01'))
  })

  it('shows the four opening-view KPIs, with «Ümumi dəyər» fixed at money(0)', async () => {
    await openInit()
    const labels = Array.from(document.querySelectorAll('[data-kpi]')).map((e) => e.getAttribute('data-kpi'))
    expect(labels).toEqual(['Mövqe sayı', 'Ümumi miqdar', 'Ümumi dəyər', 'Sıfır qalıq'])
    expect(kpi('Ümumi dəyər')).toMatchObject({ value: money(0), sub: 'bu görünüşdə hesablanmır' })
    expect(kpi('Ümumi miqdar')).toMatchObject({ value: nf(7, 2), sub: 'İlkin miqdar · ölçü vahidləri qarışıqdır' })
    expect(kpi('Mövqe sayı')).toMatchObject({ value: nf(1), sub: 'bütün anbarlar' })
    expect(kpi('Sıfır qalıq')).toMatchObject({ value: nf(0), sub: 'bu filtrdə' })
    /* no colour class on any opening-view tile (M9-85) */
    for (const el of document.querySelectorAll('[data-kpi]')) expect(el.className).toBe('kpi')
    /* the subtitle follows the selected warehouse */
    fireEvent.change(select('Anbar'), { target: { value: 'Ələt' } })
    expect(kpi('Mövqe sayı').sub).toBe('Ələt')
  })

  describe('the three distinct empty states (M9-82)', () => {
    it('no opening rows at all', async () => {
      fetchBalancesSnapshot.mockResolvedValue(snapshot({ movements: [mv({ in_qty: 1 })], conditions: [] }))
      await openInit()
      expect(screen.getByTestId('bal-empty-noinit').textContent).toContain('İlkin qalıq tapılmadı')
    })

    it('«Cari qalıq» with nothing surviving', async () => {
      fetchBalancesSnapshot.mockResolvedValue(snapshot({
        movements: [
          opening({ item_code: '0000002', warehouse: 'Ələt', in_qty: 7, date: '2026-01-01' }),
          mv({ item_code: '0000002', warehouse: 'Ələt', out_qty: 7, date: '2026-02-01', type: 'Silinmə' }),
        ],
        conditions: [],
      }))
      await openInit('current')
      expect(screen.getByTestId('bal-empty-nocurrent').textContent).toContain('Cari qalıq tapılmadı')
    })

    it('filtered to nothing', async () => {
      await openInit()
      fireEvent.change(select('Anbar'), { target: { value: 'Astara' } })
      expect(screen.getByTestId('bal-empty-filtered').textContent).toContain('Nəticə yoxdur')
    })
  })

  /* M9-83 — the `neg` class on a negative opening quantity.

     STRUCTURALLY UNREACHABLE through the supported model, and proved so
     rather than asserted: `initial_qty += qty` is unconditional (legacy 2011),
     so an opening-marked row with out > in drives it negative, and
     `current_qty` is a sum of surviving lots (never negative) — but BOTH view
     modes filter strictly `> 1e-9` (M9-77, legacy 2244-2245), so a negative
     row never reaches the table in either mode. The class expression itself
     is ported (source-level parity with 2271) and pinned below; it cannot be
     falsified from rendered output. An earlier version of this test rendered
     a POSITIVE row and asserted the class was absent, which proved nothing
     about `.neg` — superseded by these two. */
  it('M9-83: a negative opening quantity is filtered out of «İlkin miqdar», and «Cari qalıq» is never negative — .neg is unreachable', async () => {
    fetchBalancesSnapshot.mockResolvedValue(snapshot({
      movements: [
        opening({ item_code: '0000002', warehouse: 'Ələt', in_qty: 7, date: '2026-01-01' }),
        /* an opening-MARKED outbound row: net initial_qty = 7 − 9 = −2 */
        opening({ item_code: '0000002', warehouse: 'Ələt', out_qty: 9, date: '2026-01-02' }),
      ],
      conditions: [],
    }))
    await openInit()
    /* the row EXISTS in the reconstruction (so the empty state is «filtered»,
       not «no opening rows») but is excluded by the > 1e-9 filter */
    expect(screen.getByTestId('bal-empty-filtered')).toBeTruthy()
    expect(document.querySelector('#t-bal table')).toBeNull()
    /* «Cari qalıq» reads the SURVIVING opening lot (7): an opening-marked
       outbound row is not consumption, so current_qty stays ≥ 0 by
       construction and the row renders positive, never with .neg */
    fireEvent.click(screen.getByRole('button', { name: 'Cari qalıq' }))
    expect(cells(bodyRows()[0])[4]).toBe(nf(7, 2))
    expect(document.querySelector('#t-bal b.neg')).toBeNull()
  })

  it('M9-83: the neg class expression is ported for the opening quantity cell (source-level)', () => {
    const src = require('fs').readFileSync(process.cwd() + '/src/pages/BalancesPage.tsx', 'utf8')
    expect(src).toContain("className={b[qtyCol] < 0 ? 'neg' : undefined}")
  })
})

/* ============================================================ export */

describe('export (M9-110 … M9-119)', () => {
  it('is disabled until a snapshot has loaded', async () => {
    const d = deferred<ReturnType<typeof snapshot>>()
    fetchBalancesSnapshot.mockReturnValue(d.promise)
    render(<BalancesPage me={ADMIN} />)
    expect((screen.getByTestId('bal-export') as HTMLButtonElement).disabled).toBe(true)
    await act(async () => { d.resolve(snapshot()) })
    await waitFor(() => expect((screen.getByTestId('bal-export') as HTMLButtonElement).disabled).toBe(false))
  })

  it('writes the current-view matrix in the EXPORT order and toasts the legacy xlsx message', async () => {
    vi.mocked(xls).mockReturnValue('xlsx')
    await renderPage()
    fireEvent.click(screen.getByTestId('bal-export'))
    expect(xls).toHaveBeenCalledTimes(1)
    const [matrix, name] = vi.mocked(xls).mock.calls[0]
    expect(name).toBe('anbar_qaliqlari')
    expect(matrix[0]).toEqual([...CURRENT_EXPORT_HEADER])
    expect(matrix).toHaveLength(5)
    /* Anbar first, raw numbers, `val.toFixed(2)`, raw ISO date */
    expect(matrix[1]).toEqual(['Ələt', '0000001', 'Nasos', 'ədəd', 10, 4, 6, 1, 0, 2, 0, 5, '30.00', '2026-09-02'])
    expect(toasts()).toEqual(['anbar_qaliqlari.xlsx yükləndi'])
  })

  it('exports the opening view when it is active', async () => {
    vi.mocked(xls).mockReturnValue('xlsx')
    await renderPage()
    fireEvent.click(screen.getByRole('button', { name: 'Əvvələ qalıq' }))
    fireEvent.click(screen.getByTestId('bal-export'))
    const matrix = vi.mocked(xls).mock.calls[0][0] as unknown[][]
    expect(matrix[0]).toEqual(['Anbar', 'Kod', 'Malın adı', 'Ölçü', 'İlkin miqdar', 'İlk mənbə anbar', 'Əvvələ qalıq tarixi', 'Son hərəkət'])
    expect(matrix[1]).toEqual(['Ələt', '0000002', 'Boru', 'metr', 7, 'Ələt', '2026-01-01', '2026-01-01'])
  })

  /* M9-119 — the toast is the caller's; the writer only reports the outcome. */
  it('toasts the CSV fallback message when the writer reports csv', async () => {
    vi.mocked(xls).mockReturnValue('csv')
    await renderPage()
    fireEvent.click(screen.getByTestId('bal-export'))
    expect(toasts()).toEqual(['Excel kitabxanası yüklənmədi, CSV yüklənir'])
    expect(useToastStore.getState().messages[0].isError).toBe(true)
  })

  it('is available to a rehber (ungated)', async () => {
    vi.mocked(xls).mockReturnValue('xlsx')
    await renderPage(REHBER)
    expect((screen.getByTestId('bal-export') as HTMLButtonElement).disabled).toBe(false)
    fireEvent.click(screen.getByTestId('bal-export'))
    expect(xls).toHaveBeenCalledTimes(1)
  })
})

/* ========================================================= item card */

describe('item card drawer (M9-140)', () => {
  it('opens on a row click and hands the two actions up', async () => {
    const onOpenOperation = vi.fn()
    const onEditItem = vi.fn()
    await renderPage(ADMIN, { onOpenOperation, onEditItem })
    expect(screen.queryByTestId('item-card')).toBeNull()
    fireEvent.click(rowOf('0000002', 'Astara'))
    expect(screen.getByTestId('item-card').textContent).toContain('Kart: 0000002')
    fireEvent.click(screen.getByRole('button', { name: 'Bu mal üzrə əməliyyat' }))
    expect(onOpenOperation).toHaveBeenCalledWith('0000002')
    fireEvent.click(screen.getByRole('button', { name: 'Malı redaktə et' }))
    expect(onEditItem).toHaveBeenCalledWith('0000002')
    fireEvent.click(screen.getByRole('button', { name: 'Bağla' }))
    expect(screen.queryByTestId('item-card')).toBeNull()
  })

  it('the rows carry data-card, like the legacy delegation target', async () => {
    await renderPage()
    expect(rowOf('0000001', 'Ələt').getAttribute('data-card')).toBe('0000001')
  })
})

/* ================================================ condition editing */

describe('condition cells by role (M9-93, canEditCond)', () => {
  const editable = (tr: HTMLTableRowElement) => tr.querySelectorAll('[data-cond-cell]').length

  it('an admin can edit every real-warehouse row', async () => {
    await renderPage()
    expect(editable(rowOf('0000001', 'Ələt'))).toBe(4)
    expect(editable(rowOf('0000002', 'Astara'))).toBe(4)
  })

  it('a rehber sees the same numbers as plain text', async () => {
    await renderPage(REHBER)
    const tr = rowOf('0000001', 'Ələt')
    expect(editable(tr)).toBe(0)
    expect(cells(tr).slice(7, 11)).toEqual([nf(1, 2), '—', nf(2, 2), '—'])
  })

  it('an anbardar edits only their own warehouse', async () => {
    await renderPage(ANBARDAR_ELET)
    expect(editable(rowOf('0000001', 'Ələt'))).toBe(4)
    expect(editable(rowOf('0000002', 'Astara'))).toBe(0)
  })

  it('nothing is editable in the __sum view or on a nomv row', async () => {
    await renderPage()
    fireEvent.click(screen.getByRole('button', { name: 'Hamısı' }))
    expect(editable(rowOf('0000004'))).toBe(0)
    fireEvent.change(select('Anbar'), { target: { value: '__sum' } })
    for (const tr of bodyRows()) expect(editable(tr)).toBe(0)
  })
})

describe('saving a condition (M9-96 … M9-105, M9-134b)', () => {
  const okResult = (row: Partial<StockConditionRow>, extra: Record<string, unknown> = {}) => ({
    ok: true, action: 'UPDATE', exceedsBalance: false, balance: 0, retriedLegacySignature: false,
    row: { ...COND_ELET_1, ...row }, ...extra,
  })

  async function startEdit(key = 'unfit') {
    const user = userEvent.setup()
    const tr = rowOf('0000001', 'Ələt')
    const cell = tr.querySelector(`[data-cond-cell="Ələt|0000001|${key}"]`) as HTMLElement
    await user.click(cell)
    const input = tr.querySelector(`[data-cond-editor="Ələt|0000001|${key}"]`) as HTMLInputElement
    expect(input).toBeTruthy()
    return { user, input, tr }
  }

  it('a bad value means NO RPC and the legacy message (M9-96/97)', async () => {
    await renderPage()
    const { user, input } = await startEdit()
    await user.clear(input)
    await user.type(input, '-3{Enter}')
    expect(setStockCondition).not.toHaveBeenCalled()
    expect(toasts()).toEqual([COND_INPUT_ERROR])
  })

  it('sends all four quantities plus the existing note, with the edited key (M9-98)', async () => {
    setStockCondition.mockResolvedValue(okResult({ unfit: 3 }))
    await renderPage()
    const { user, input } = await startEdit()
    await user.clear(input)
    await user.type(input, '3{Enter}')
    await waitFor(() => expect(setStockCondition).toHaveBeenCalledTimes(1))
    expect(setStockCondition).toHaveBeenCalledWith({
      warehouse: 'Ələt', itemCode: '0000001', unfit: 3, repair: 0, onsite: 2, icare: 0, note: 'qeyd', editedKey: 'unfit',
    })
  })

  it('on success the table re-renders from the SERVER row, toasts «Vəziyyət yeniləndi» and marks sync synced (M9-101, M9-103, M9-105)', async () => {
    /* the server "corrects" the value — the screen must show 2.5, not 3 */
    setStockCondition.mockResolvedValue(okResult({ unfit: 2.5 }))
    await renderPage()
    const { user, input, tr } = await startEdit()
    await user.clear(input)
    await user.type(input, '3{Enter}')
    await waitFor(() => expect(cells(tr)[7]).toBe(nf(2.5, 2)))
    expect(toasts()).toEqual(['Vəziyyət yeniləndi'])
    expect(useSyncStore.getState().state).toBe('synced')
    expect(useBalancesStore.getState().conds.get('Ələt|0000001')?.unfit).toBe(2.5)
  })

  it('a DELETE response removes the local entry so every marker shows «—»', async () => {
    setStockCondition.mockResolvedValue({ ...okResult({}), action: 'DELETE', row: null })
    await renderPage()
    const { user, input, tr } = await startEdit()
    await user.clear(input)
    await user.type(input, '0{Enter}')
    await waitFor(() => expect(cells(tr).slice(7, 11)).toEqual(['—', '—', '—', '—']))
    expect(useBalancesStore.getState().conds.has('Ələt|0000001')).toBe(false)
  })

  it('exceeds_balance is a WARNING on a successful write (M9-102)', async () => {
    setStockCondition.mockResolvedValue(okResult({ unfit: 50 }, { exceedsBalance: true, balance: 6 }))
    await renderPage()
    const { user, input, tr } = await startEdit()
    await user.clear(input)
    await user.type(input, '50{Enter}')
    await waitFor(() => expect(cells(tr)[7]).toBe(nf(50, 2)))
    expect(toasts()).toEqual([`Diqqət: işarələnmiş miqdar qalıqdan (${nf(6, 2)}) çoxdur`])
    expect(useToastStore.getState().messages[0].isError).toBe(true)
  })

  it('a server error shows «Xəta: <message>», marks sync failed and REVERTS the cell (M9-104, M9-108)', async () => {
    setStockCondition.mockResolvedValue({ ok: false, kind: 'server', error: 'Anbar sizə aid deyil' })
    await renderPage()
    const { user, input, tr } = await startEdit()
    await user.clear(input)
    await user.type(input, '3{Enter}')
    await waitFor(() => expect(toasts()).toEqual(['Xəta: Anbar sizə aid deyil']))
    expect(useSyncStore.getState().state).toBe('error')
    expect(cells(tr)[7]).toBe(nf(1, 2))
    expect(tr.querySelector('[data-cond-editor]')).toBeNull()
  })

  it('the guard and the İcarə messages are shown VERBATIM, without the «Xəta:» prefix (M9-100, M9-107)', async () => {
    setStockCondition.mockResolvedValue({ ok: false, kind: 'icare-unsupported', error: 'İcarə sütunu bazada yoxdur — sql/031 hələ tətbiq edilməyib' })
    await renderPage()
    const { user, input } = await startEdit('icare')
    await user.type(input, '1{Enter}')
    await waitFor(() => expect(toasts()).toEqual(['İcarə sütunu bazada yoxdur — sql/031 hələ tətbiq edilməyib']))
    expect(useSyncStore.getState().state).toBe('error')
  })

  it('shows «…» in the cell while the commit is in flight and never an optimistic value', async () => {
    const d = deferred<ReturnType<typeof okResult>>()
    setStockCondition.mockReturnValue(d.promise)
    await renderPage()
    const { user, input, tr } = await startEdit()
    await user.clear(input)
    await user.type(input, '3{Enter}')
    await waitFor(() => expect(tr.querySelector('[data-cond-pending="Ələt|0000001|unfit"]')?.textContent).toBe('…'))
    expect(cells(tr)[7]).not.toContain(nf(3, 2))
    await act(async () => { d.resolve(okResult({ unfit: 3 })) })
    await waitFor(() => expect(cells(tr)[7]).toBe(nf(3, 2)))
  })

  /* M9-134b — THE required falsifiable regression. While `unfit` is being
     edited, a realtime refresh changes `repair` on the SAME warehouse × item.
     The single commit must carry repair's NEW value (5). MUTATION: composing
     the payload from a copy taken when the edit began — that resends the
     pre-edit baseline (0) and this test fails. */
  it('a realtime change to ANOTHER key during the edit is carried by the commit, not overwritten by the baseline', async () => {
    setStockCondition.mockResolvedValue(okResult({ unfit: 3, repair: 5 }))
    await renderPage()
    const { user, input, tr } = await startEdit('unfit')
    await user.clear(input)
    await user.type(input, '3')

    /* the refresh: another user set repair = 5 */
    fetchBalancesSnapshot.mockResolvedValue(snapshot({ conditions: [{ ...COND_ELET_1, repair: 5 }] }))
    await act(async () => { fireRealtime?.() })
    await waitFor(() => expect(useBalancesStore.getState().conds.get('Ələt|0000001')?.repair).toBe(5))

    /* M9-134 — the editor and the draft survived the refresh */
    const stillOpen = tr.querySelector('[data-cond-editor="Ələt|0000001|unfit"]') as HTMLInputElement
    expect(stillOpen).toBeTruthy()
    expect(stillOpen.value).toBe('3')
    /* the rest of the row DID re-render from the new snapshot */
    expect(cells(tr)[8]).toBe(nf(5, 2))

    await user.type(stillOpen, '{Enter}')
    await waitFor(() => expect(setStockCondition).toHaveBeenCalledTimes(1))
    const payload = setStockCondition.mock.calls[0][0]
    expect(payload.unfit).toBe(3)
    expect(payload.repair).toBe(5)
    expect(payload.repair).not.toBe(COND_ELET_1.repair)
    expect(payload.editedKey).toBe('unfit')
  })

  it('Escape after such a refresh shows the LATEST value for the edited key (M9-134a)', async () => {
    await renderPage()
    const { user, input, tr } = await startEdit('unfit')
    await user.clear(input)
    await user.type(input, '3')
    fetchBalancesSnapshot.mockResolvedValue(snapshot({ conditions: [{ ...COND_ELET_1, unfit: 9 }] }))
    await act(async () => { fireRealtime?.() })
    await waitFor(() => expect(useBalancesStore.getState().conds.get('Ələt|0000001')?.unfit).toBe(9))
    await user.type(tr.querySelector('[data-cond-editor="Ələt|0000001|unfit"]') as HTMLInputElement, '{Escape}')
    expect(setStockCondition).not.toHaveBeenCalled()
    expect(cells(tr)[7]).toBe(nf(9, 2))
  })
})
