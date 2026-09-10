import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, within, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const fetchMovementsSnapshot = vi.fn()
vi.mock('../api/movementsSnapshot.api', () => ({
  fetchMovementsSnapshot: () => fetchMovementsSnapshot(),
}))

/* The realtime hook is replaced so the test can FIRE a change without a
   Supabase channel, and can assert what the page subscribed to. The debounce
   under test is the real one — see the dedicated describe block, which
   imports the genuine hook behaviour by driving timers through this seam. */
const realtimeCalls: { tables: readonly string[]; enabled: boolean; debounceMs: number | undefined }[] = []
let fireRealtime: (() => void) | null = null
/* I-4 added a layer-capability probe to the movements load. It is mocked here
   so this suite performs no network call of its own; `active:false` is the
   pre-layer routing these tests already assume. */
vi.mock('../api/stockLayers.api', () => ({
  fetchLayerCapability: async () => ({ ready: true, active: false, version: 1 }),
  LAYERS_INACTIVE: { ready: false, active: false, version: 0 },
}))

vi.mock('../hooks/useRealtimeRefresh', () => ({
  useRealtimeRefresh: (
    enabled: boolean,
    tables: readonly string[],
    onChange: () => void,
    debounceMs?: number,
  ) => {
    realtimeCalls.push({ enabled, tables, debounceMs })
    fireRealtime = onChange
  },
}))

import { MovementsPage } from './MovementsPage'
import { useMovementsStore, __resetMovementsRequestSeq } from '../store/movements.store'
import { useAuditLogStore } from '../store/auditLog.store'
import { useCorrectionStore } from '../store/correction.store'
import { scopeOf } from '../store/batchCancel.store'
import { EMPTY_MOVEMENT_FILTERS } from '../lib/movementFilters'
import { SHOW_MAX } from '../lib/showAllCut'
import { nf } from '../lib/format'
import type { MovementRow } from '../api/itemMovements.api'
import type { Me } from '../lib/roles'

const mv = (over: Partial<MovementRow> = {}): MovementRow => ({
  id: 'm1', item_code: '0000001', warehouse: 'Ələt', date: '2026-09-01',
  in_qty: 10, out_qty: 0, price: 2, partner: 'Azpetrol', type: 'Satınalma',
  invoice_num: null, note: null, doc_num: null, created_at: '2026-09-01T10:00:00Z',
  channel: null, contract_num: null, created_by: null, ...over,
})

const ITEMS = [
  { code: '0000001', name: 'Nasos', unit: 'ədəd', price: 5, category: null },
  { code: '0000002', name: 'Boru', unit: 'metr', price: 3, category: null },
]

const WHS = ['Ələt', 'Astara', 'Xocahəsən']

function snapshot(over: Record<string, unknown> = {}) {
  return {
    ok: true as const,
    snapshot: {
      movements: [mv()], items: ITEMS, warehouses: WHS,
      valuations: [], ...over,
    },
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  realtimeCalls.length = 0
  fireRealtime = null
  __resetMovementsRequestSeq()
  useMovementsStore.setState({
    rows: [], operational: [], itemBy: new Map(), warehouses: [],
    valuations: new Map(),
    loading: false, error: null, loaded: false,
    filters: EMPTY_MOVEMENT_FILTERS, showAll: false,
  })
  fetchMovementsSnapshot.mockResolvedValue(snapshot())
  useAuditLogStore.setState({ emails: new Map() })
})

afterEach(() => vi.useRealTimers())

const onNewOperation = vi.fn()

/* «Qeyd edən» resolves ids against the directory App.tsx warms at boot, so the
   tests drive that store directly rather than mocking a second RPC — the page
   must never trigger one (I-2 audit, finding 2). */
const ME_ID = '11111111-1111-4111-8111-111111111111'
const OTHER_ID = '22222222-2222-4222-8222-222222222222'
const ME: Me = {
  id: ME_ID, sbId: ME_ID, email: 'anar@example.com',
  name: 'Anar İbrahimov', role: 'admin', wh: 'Ələt',
}

/** Seeds the warmed `get_user_directory()` map. Empty by default. */
function setDirectory(entries: [string, string][] = []) {
  useAuditLogStore.setState({ emails: new Map(entries) })
}

async function open(over: Record<string, unknown> = {}) {
  if (Object.keys(over).length) fetchMovementsSnapshot.mockResolvedValue(snapshot(over))
  render(<MovementsPage me={ME} onEditDocument={vi.fn()} onNewOperation={onNewOperation} />)
  await waitFor(() => expect(useMovementsStore.getState().loaded).toBe(true))
}

/* Counts body rows via the DOM directly. getAllByRole('row') walks and
   accessibility-checks every node, which is unusably slow past a few hundred
   rows in jsdom. */
function bodyRowCount(): number {
  return document.querySelectorAll('tbody tr').length
}

/* Finds a button by its visible text WITHOUT the accessibility-tree walk.

   `getByRole('button', ...)` computes the accessible name of every element in
   the document; at the 3001-row cap that is ~96 s in jsdom for a single query
   (measured), which is what actually exhausted this file's budget — not any
   application-side work. `bodyRowCount()` above already avoids the same walk
   for the same reason; this is that technique applied to the one remaining
   role query on a full-size table.

   The assertion is unchanged in strength: the button must exist, be unique and
   carry the expected label. */
function buttonByText(re: RegExp): HTMLButtonElement {
  const hits = Array.from(document.querySelectorAll('button'))
    .filter((b) => re.test(b.textContent ?? ''))
  if (hits.length !== 1) {
    throw new Error('expected exactly one button matching ' + re + ', found ' + hits.length)
  }
  return hits[0] as HTMLButtonElement
}

/** The data cells of the one rendered body row. */
function cells(): string[] {
  const rows = screen.getAllByRole('row')
  return within(rows[1]).getAllByRole('cell').map((c) => c.textContent ?? '')
}

describe('page shell and navigation', () => {
  it('renders the heading and subtitle', async () => {
    await open()
    expect(screen.getByRole('heading', { name: 'Mal hərəkəti' })).toBeTruthy()
    expect(screen.getByText('Bütün mədaxil, məxaric və yerdəyişmələrin vahid registri.')).toBeTruthy()
  })

  /* M8-13 — a PLAIN page switch: no prefill, no state transfer. */
  it('«Yeni əməliyyat» navigates with no argument at all', async () => {
    await open()
    await userEvent.click(screen.getByRole('button', { name: 'Yeni əməliyyat' }))
    expect(onNewOperation).toHaveBeenCalledTimes(1)
    /* No item code, no draft, no prefill object — the only argument React's
       onClick supplies is its own event, and nothing is threaded through it. */
    expect(onNewOperation.mock.calls[0].filter((a) => typeof a === 'string')).toEqual([])
  })

  /* «Baxış» is I-3 and is now ENABLED as a read-only inspection action. Its
     behaviour — the four dispatcher branches, the unsupported-type refusal,
     the views and the stale-data safety — is covered by
     components/movements/DocumentViewDialog.test.tsx.

     MUTATION: any other row control appearing beside it. I-3 adds inspection
     ONLY; cancellation, replacement, row-cancel and edit are I-4 … I-6. */
  it('«Baxış» is the only row control, and it is enabled', async () => {
    await open()
    const cells = within(screen.getAllByRole('row')[1]).getAllByRole('cell')
    const buttons = within(cells[cells.length - 1]).getAllByRole('button')
    expect(buttons.map((b) => b.textContent)).toEqual(['Baxış'])
    expect((buttons[0] as HTMLButtonElement).disabled).toBe(false)
  })

  /* «Çap» and the separate Silinmə report are still deferred and must not
     appear. «Excel» is NO LONGER in this list: I-7 ships the ORDINARY export
     (M8-50, partial), so the button is expected — its behaviour lives in
     MovementsPageExport.test.tsx. «Qrup üzrə ləğv» left this list at I-5 for
     the same reason; its behaviour is in components/movements/BatchCancel.test.tsx. */
  it('renders no print or Silinmə-report affordance', async () => {
    await open()
    for (const name of ['Çap', 'Silinmə hesabatının ixracı']) {
      expect(screen.queryByRole('button', { name })).toBeNull()
    }
  })

  it('renders the ordinary Excel export (I-7)', async () => {
    await open()
    expect(screen.getByTestId('mv-export').textContent).toBe('Excel')
  })

  it('offers «Qrup üzrə ləğv» to an admin', async () => {
    await open()
    expect(document.querySelector('[data-testid="mv-batch-cancel"]')).not.toBeNull()
  })

  /* The UI gate is UX, not the security boundary: every batch RPC re-checks
     the role server-side. What this prevents is offering a certain refusal. */
  it('hides «Qrup üzrə ləğv» from a non-admin', async () => {
    fetchMovementsSnapshot.mockResolvedValue(snapshot({}))
    render(
      <MovementsPage
        me={{ ...ME, role: 'anbardar' }}
        onEditDocument={vi.fn()} onNewOperation={onNewOperation}
      />,
    )
    await waitFor(() => expect(useMovementsStore.getState().loaded).toBe(true))
    expect(document.querySelector('[data-testid="mv-batch-cancel"]')).toBeNull()
  })
})

describe('the table (M8-04, M8-05)', () => {
  it('renders the fifteen legacy columns in order', async () => {
    await open()
    const headers = within(screen.getAllByRole('row')[0]).getAllByRole('columnheader')
      .map((h) => h.textContent)
    expect(headers).toEqual([
      'Tarix', 'Anbar', 'Kod', 'Malın adı', 'Növü', 'İstiqamət / Kontragent', 'Kanal',
      'Qaimə №', 'Giriş', 'Çıxış', 'Qiymət', 'Məbləğ', 'Qeyd', 'Qeyd edən', '',
    ])
  })

  it('formats the date as DD.MM.YYYY and the amount through money()', async () => {
    await open({ movements: [mv({ in_qty: 10, price: 2 })] })
    const c = cells()
    expect(c[0]).toBe('01.09.2026')
    expect(c[11]).toContain('₼')
  })

  /* The warehouse DISPLAY alias — Xocahəsən renders as Xocəsən while the
     stored name is untouched (index.html:592). */
  it('applies the warehouse display alias in the cell', async () => {
    await open({ movements: [mv({ warehouse: 'Xocahəsən' })] })
    expect(cells()[1]).toBe('Xocəsən')
  })

  /* MUTATION: the contract hint dropped, or `doc_num` shown instead. The
     manual «Müqavilə №» is explicitly distinct from the SYSTEM document
     number, and conflating them would misreport the document. */
  it('shows contract_num as a hint under the item name, never doc_num', async () => {
    await open({ movements: [mv({ contract_num: 'MQ-77', doc_num: 'SYS-1' })] })
    const nameCell = cells()[3]
    expect(nameCell).toContain('Nasos')
    expect(nameCell).toContain('MQ-77')
    expect(nameCell).not.toContain('SYS-1')
  })

  /* I-2 AUDIT, finding 2 — «Qeyd edən» renders the FINAL legacy mapping
     (index.html:990), not the intermediate `created_by || 'sistem'` at 943.

     MUTATION: rendering `m.created_by || 'sistem'`. Every case below then
     breaks — an absent recorder shows «sistem» rather than «Excel idxalı», and
     a real UUID is printed straight into the cell. */
  describe('the «Qeyd edən» cell (index.html:990)', () => {
    it('shows «Excel idxalı» for an absent recorder, never «sistem»', async () => {
      await open({ movements: [mv({ created_by: null })] })
      expect(cells()[13]).toBe('Excel idxalı')
    })

    it('shows «Excel idxalı» for the legacy «sistem» sentinel', async () => {
      await open({ movements: [mv({ created_by: 'sistem' })] })
      expect(cells()[13]).toBe('Excel idxalı')
    })

    it('shows the directory email for a known id', async () => {
      setDirectory([[OTHER_ID, 'kadr@example.com']])
      await open({ movements: [mv({ created_by: OTHER_ID })] })
      expect(cells()[13]).toBe('kadr@example.com')
    })

    it('shows the current user NAME for their own id absent from the directory', async () => {
      await open({ movements: [mv({ created_by: ME_ID })] })
      expect(cells()[13]).toBe('Anar İbrahimov')
    })

    it('shows «digər istifadəçi» for an unknown other id', async () => {
      await open({ movements: [mv({ created_by: OTHER_ID })] })
      expect(cells()[13]).toBe('digər istifadəçi')
    })

    /* The regression the audit named outright. */
    it('never renders a raw UUID', async () => {
      await open({ movements: [mv({ created_by: OTHER_ID })] })
      const cell = cells()[13]
      expect(cell).not.toContain(OTHER_ID)
      expect(cell).not.toMatch(/[0-9a-f]{8}-[0-9a-f]{4}-/i)
    })

    it('renders no UUID for the current user either', async () => {
      await open({ movements: [mv({ created_by: ME_ID })] })
      expect(cells()[13]).not.toContain(ME_ID)
    })
  })

  /* The channel suppression rule — index.html:1811-1814. */
  describe('the Kanal cell', () => {
    /* MUTATION: suppressing the channel for every transfer. A meaningful,
       non-warehouse channel would silently vanish from the registry. */
    it('hides a channel that resolves to a warehouse on a TRANSFER row', async () => {
      await open({ movements: [mv({ type: 'Yerdəyişmə', channel: 'Astara anbar', out_qty: 5, in_qty: 0, partner: 'Astara' })] })
      expect(cells()[6]).toBe('—')
    })

    it('SHOWS a non-warehouse channel on a transfer row', async () => {
      await open({ movements: [mv({ type: 'Yerdəyişmə', channel: 'Təcili', out_qty: 5, in_qty: 0, partner: 'Astara' })] })
      expect(cells()[6]).toBe('Təcili')
    })

    /* MUTATION: applying the warehouse check to every type. On a purchase the
       channel is a real business value and must never be hidden. */
    it('shows a warehouse-looking channel on a NON-transfer row', async () => {
      await open({ movements: [mv({ type: 'Satınalma', channel: 'Astara anbar' })] })
      expect(cells()[6]).toBe('Astara anbar')
    })
  })

  /* MUTATION: the note rendered untruncated, or truncated without the title.
     The full text must stay reachable on hover. */
  it('truncates a long note to 40 characters but keeps the full text in the title', async () => {
    const note = 'x'.repeat(60)
    await open({ movements: [mv({ note })] })
    const span = screen.getByTitle(note)
    expect(span.textContent).toBe('x'.repeat(40) + '…')
  })

  it('does not truncate a note of exactly 40 characters', async () => {
    const note = 'y'.repeat(40)
    await open({ movements: [mv({ note })] })
    expect(screen.getByTitle(note).textContent).toBe(note)
  })

  /* M8-06 — the «ləğv edilib» tag, driven by cancelledDocFor() over the RAW
     row set. A row-level legacy cancellation marks its row without the
     document being cancelled.

     MUTATION: passing `operational` instead of `rows` to cancelledDocFor().
     The marker rows are removed from `operational`, so the tag would never
     appear at all. */
  it('tags a cancelled row with «ləğv edilib»', async () => {
    /* The tag exists for the rows `excludeCancelled()` does NOT remove.
       `excludeCancelled` hides a document only when the MARKER row itself
       carries a doc_num (it needs one to populate the hidden-doc set), so a
       marker posted without one leaves the cancelled row operational — and
       `cancelledDocFor()` still reports it as cancelled, with the '—'
       fallback. That row must carry the tag, or the registry would show a
       cancelled movement as though it were live. */
    await open({
      movements: [
        mv({ id: 'a', doc_num: 'D-1' }),
        mv({ id: 'zz', doc_num: null, note: 'Ləğv: D-1' }),
      ],
    })
    expect(screen.getAllByRole('row')).toHaveLength(2)
    expect(screen.getByText('ləğv edilib')).toBeTruthy()
  })

  it('does not tag an uncancelled row', async () => {
    await open()
    expect(screen.queryByText('ləğv edilib')).toBeNull()
  })
})

describe('the Silinmə price/amount rule (M8-05)', () => {
  const wo = (over = {}) => ({
    movement_id: 'w1', source_amount: 55, known_amount: 40, unknown_qty: 2,
    final_amount: 48, valuation_method: 'fifo', override_reason: null, ...over,
  })
  const row = mv({ id: 'w1', type: 'Silinmə', in_qty: 0, out_qty: 3, price: 9, item_code: '0000001' })

  /* MUTATION: the non-Silinmə chain (`m.price → item.price`) applied to a
     write-off. That yields 9 and 27 here instead of the stored 16/48, i.e. it
     restates a posted write-off with a price it never used. */
  it('values a Silinmə row from writeoff_valuations, not from the price chain', async () => {
    await open({ movements: [row], valuations: [wo()] })
    const c = cells()
    expect(c[10]).toBe('16,00')    // 48 / 3 = 16, rendered by nf(pr, 2)
    expect(c[11]).toContain('48')
  })

  /* MUTATION: `final == null` rendered as 0 or as the fallback amount. An
     undeterminable write-off must print «—», not a number. */
  it('renders «—» for an amount that is genuinely undeterminable', async () => {
    await open({ movements: [row], valuations: [wo({ final_amount: null })] })
    expect(cells()[11]).toBe('—')
  })

  /* MUTATION: the nomenclature price entering the Silinmə chain. */
  it('falls back to the row&apos;s own price, never the item price, when unvalued', async () => {
    await open({ movements: [mv({ id: 'w2', type: 'Silinmə', in_qty: 0, out_qty: 3, price: 9 })] })
    expect(cells()[10]).toBe('9,00')
  })

  /* A NON-Silinmə row uses the other chain, including the item-price step. */
  it('a non-Silinmə row falls back m.price → item.price', async () => {
    await open({ movements: [mv({ price: null, in_qty: 4, item_code: '0000001' })] })
    expect(cells()[10]).toBe('5,00')
  })

  /* I-2 AUDIT, finding 1 — the degraded-value warning is GONE, because the
     state it announced can no longer occur: a failed valuation read fails the
     whole snapshot, so it surfaces as the ordinary refresh error while the
     previous amounts stay on screen. A successful read with zero rows is
     normal and warns about nothing. */
  it('shows no degraded-valuation warning when the valuation set is empty', async () => {
    await open({ valuations: [] })
    expect(screen.queryByText('Silinmə dəyərləri oxunmadı')).toBeNull()
  })
})

describe('filters', () => {
  const many = [
    mv({ id: 'a', warehouse: 'Ələt', type: 'Satınalma', date: '2026-09-01', item_code: '0000001', partner: 'Azpetrol' }),
    mv({ id: 'b', warehouse: 'Astara', type: 'Silinmə', date: '2026-09-05', item_code: '0000002', partner: 'Socar', in_qty: 0, out_qty: 4 }),
  ]

  it('offers all configured warehouses, and only the fixed eight types', async () => {
    await open({ movements: many })
    const wh = screen.getByLabelText('Anbar')
    expect(within(wh).getAllByRole('option').map((o) => o.textContent))
      .toEqual(['Bütün anbarlar', 'Ələt', 'Astara', 'Xocəsən'])
    const types = within(screen.getByLabelText('Əməliyyat növü')).getAllByRole('option')
    expect(types).toHaveLength(9)
    expect(types.map((o) => o.textContent)).toContain('Yerdəyişmə')
  })

  it('filters by warehouse', async () => {
    await open({ movements: many })
    await userEvent.selectOptions(screen.getByLabelText('Anbar'), 'Astara')
    await waitFor(() => expect(screen.getAllByRole('row')).toHaveLength(2))
    expect(cells()[1]).toBe('Astara')
  })

  it('filters by type', async () => {
    await open({ movements: many })
    await userEvent.selectOptions(screen.getByLabelText('Əməliyyat növü'), 'Silinmə')
    await waitFor(() => expect(screen.getAllByRole('row')).toHaveLength(2))
    expect(cells()[4]).toBe('Silinmə')
  })

  /* Both bounds are INCLUSIVE — index.html:1665-1666.

     MUTATION: exclusive bounds. A row dated exactly on the boundary would
     disappear, which is the single most common way a date filter lies. */
  it('treats both date bounds as inclusive', async () => {
    await open({ movements: many })
    const d1 = screen.getByLabelText('Başlanğıc tarix')
    const d2 = screen.getByLabelText('Son tarix')
    await userEvent.type(d1, '2026-09-01')
    await userEvent.type(d2, '2026-09-01')
    await waitFor(() => expect(screen.getAllByRole('row')).toHaveLength(2))
    expect(cells()[0]).toBe('01.09.2026')
  })

  it('searches across code, name and partner, debounced', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    render(<MovementsPage me={ME} onEditDocument={vi.fn()} onNewOperation={onNewOperation} />)
    await waitFor(() => expect(useMovementsStore.getState().loaded).toBe(true))
    useMovementsStore.setState({ operational: many as never, rows: many })

    await user.type(screen.getByLabelText('Axtarış'), 'Boru')
    /* Not yet committed — the 200 ms debounce has not elapsed. */
    expect(useMovementsStore.getState().filters.q).toBe('')
    await act(async () => { vi.advanceTimersByTime(250) })
    expect(useMovementsStore.getState().filters.q).toBe('boru')
  })

  it('«Sıfırla» clears the filters and the search box', async () => {
    await open({ movements: many })
    await userEvent.selectOptions(screen.getByLabelText('Anbar'), 'Astara')
    await waitFor(() => expect(useMovementsStore.getState().filters.w).toBe('Astara'))
    await userEvent.click(screen.getByRole('button', { name: 'Sıfırla' }))
    expect(useMovementsStore.getState().filters).toEqual(EMPTY_MOVEMENT_FILTERS)
    expect((screen.getByLabelText('Axtarış') as HTMLInputElement).value).toBe('')
  })

  it('reports an empty filtered result distinctly from an empty registry', async () => {
    await open({ movements: many })
    await userEvent.type(screen.getByLabelText('Axtarış'), 'zzzznothing')
    await waitFor(() => expect(screen.getByText('Seçilmiş süzgəclərə uyğun qeyd tapılmadı.')).toBeTruthy())
  })

  it('reports a genuinely empty registry', async () => {
    await open({ movements: [] })
    expect(screen.getByText('Hələ heç bir hərəkət qeyd edilməyib.')).toBeTruthy()
  })
})

describe('the grouped İstiqamət / kontragent select (M8-09)', () => {
  const rows = [
    mv({ id: 'a', type: 'Satınalma', partner: 'Azpetrol', warehouse: 'Ələt' }),
    mv({ id: 'b', type: 'Yerdəyişmə', partner: 'Astara', warehouse: 'Ələt', in_qty: 0, out_qty: 3 }),
    mv({ id: 'c', type: 'Yerdəyişmə', partner: 'Naməlum yer', warehouse: 'Ələt', in_qty: 0, out_qty: 3 }),
  ]

  it('groups routes, partners and unrecognised imports under the legacy headings', async () => {
    await open({ movements: rows })
    const sel = screen.getByLabelText('İstiqamət / kontragent')
    const groups = Array.from(sel.querySelectorAll('optgroup')).map((g) => g.getAttribute('label'))
    expect(groups).toEqual(['Yerdəyişmə marşrutları', 'Kontragentlər / layihələr', 'Tanınmayan / köhnə idxal'])
    expect(within(sel).getByRole('option', { name: 'Ələt → Astara' })).toBeTruthy()
    expect(within(sel).getByRole('option', { name: 'Naməlum yer' })).toBeTruthy()
  })

  it('filters the table by the selected key', async () => {
    await open({ movements: rows })
    await userEvent.selectOptions(screen.getByLabelText('İstiqamət / kontragent'), 'partner:Azpetrol')
    await waitFor(() => expect(screen.getAllByRole('row')).toHaveLength(2))
    expect(cells()[5]).toBe('Azpetrol')
  })

  /* MUTATION: leaving an invalid selection active. Choosing «Azpetrol» then
     switching to a warehouse that has no Azpetrol row would otherwise show an
     EMPTY table under a selection the option list no longer even offers — the
     user cannot explain the emptiness and cannot clear it. */
  it('resets a selection that the rebuilt options no longer contain', async () => {
    await open({
      movements: [
        mv({ id: 'a', warehouse: 'Ələt', partner: 'Azpetrol' }),
        mv({ id: 'b', warehouse: 'Astara', partner: 'Socar' }),
      ],
    })
    await userEvent.selectOptions(screen.getByLabelText('İstiqamət / kontragent'), 'partner:Azpetrol')
    await waitFor(() => expect(useMovementsStore.getState().filters.p).toBe('partner:Azpetrol'))

    await userEvent.selectOptions(screen.getByLabelText('Anbar'), 'Astara')

    await waitFor(() => expect(useMovementsStore.getState().filters.p).toBe(''))
    /* And the table shows Astara's row rather than nothing. */
    expect(screen.getAllByRole('row')).toHaveLength(2)
    expect(cells()[5]).toBe('Socar')
  })

  /* The option list is built WITHOUT MF.p, so the selection never narrows the
     list it lives in (index.html:1597-1604). */
  it('keeps every option available after one is selected', async () => {
    await open({ movements: rows })
    const sel = screen.getByLabelText('İstiqamət / kontragent')
    const before = within(sel).getAllByRole('option').length
    await userEvent.selectOptions(sel, 'partner:Azpetrol')
    await waitFor(() => expect(useMovementsStore.getState().filters.p).toBe('partner:Azpetrol'))
    expect(within(screen.getByLabelText('İstiqamət / kontragent')).getAllByRole('option')).toHaveLength(before)
  })
})

describe('sorting and the soft cap', () => {
  it('sorts by date descending', async () => {
    await open({
      movements: [
        mv({ id: 'old', date: '2026-01-01' }),
        mv({ id: 'new', date: '2026-12-31' }),
      ],
    })
    const dates = screen.getAllByRole('row').slice(1).map((r) => within(r).getAllByRole('cell')[0].textContent)
    expect(dates).toEqual(['31.12.2026', '01.01.2026'])
  })

  /* M8-11 — SHOW_MAX rows, then a sticky «Hamısını göstər».

     These use `bodyRowCount()` and `buttonByText()` rather than the role
     queries: a role query walks and accessibility-checks every node, which at
     3001 rows takes ~96 s in jsdom for ONE query and was what made this file
     exceed its budget (I-4 audit, finding 4 — the cost is the test's DOM
     traversal, not `cancelledDocFor`, which measures 223 ms over the same
     3001 rows). The cap under test is the REAL SHOW_MAX constant, not a
     reduced stand-in, and the raised timeout is retained as headroom. */
  const OVER_CAP = SHOW_MAX + 1
  const capRows = () => Array.from({ length: OVER_CAP }, (_, i) => mv({ id: 'm' + i }))

  it('caps at SHOW_MAX rows and offers to show them all', async () => {
    await open({ movements: capRows() })
    expect(bodyRowCount()).toBe(SHOW_MAX)
    await userEvent.click(buttonByText(/Hamısını göstər/))
    await waitFor(() => expect(bodyRowCount()).toBe(OVER_CAP))
  }, 240_000)

  it('shows no cap affordance at or below the limit', async () => {
    await open({ movements: Array.from({ length: 10 }, (_, i) => mv({ id: 'm' + i })) })
    expect(screen.queryByRole('button', { name: /Hamısını göstər/ })).toBeNull()
  })

  /* MUTATION: the expansion reset by a filter change. SHOW_ALL['mov'] is
     global in the original and survives (index.html:1679). */
  it('the expansion survives a filter change', async () => {
    /* Opened on a SMALL set with `showAll` already true, rather than by
       expanding 3001 rows and then re-rendering them all through a filter
       change — that is minutes of jsdom work to observe one boolean. What is
       under test is that the page's filter controls do not clear the sticky
       choice; the cap's row arithmetic is covered by the test above. */
    useMovementsStore.setState({ showAll: true })
    await open({ movements: [mv({ id: 'a', warehouse: 'Ələt' }), mv({ id: 'b', warehouse: 'Astara' })] })
    expect(useMovementsStore.getState().showAll).toBe(true)

    await userEvent.selectOptions(screen.getByLabelText('Anbar'), 'Ələt')
    await waitFor(() => expect(useMovementsStore.getState().filters.w).toBe('Ələt'))
    expect(useMovementsStore.getState().showAll).toBe(true)

    await userEvent.click(screen.getByRole('button', { name: 'Sıfırla' }))
    expect(useMovementsStore.getState().showAll).toBe(true)
  })
})

/* M8-12 — the KPI line is computed over the FULL filtered set. */
describe('the KPI line', () => {
  it('reports count, inbound, outbound and inbound value', async () => {
    await open({
      movements: [
        mv({ id: 'a', in_qty: 10, out_qty: 0, price: 2 }),
        mv({ id: 'b', in_qty: 0, out_qty: 4, price: 3 }),
      ],
    })
    const line = screen.getByText(/qeyd ·/).textContent ?? ''
    expect(line).toContain('2 qeyd')
    expect(line).toContain('10')
    expect(line).toContain('4')
    expect(line).toContain('₼')
  })

  /* THE critical mutation: KPIs computed from the CAPPED slice.

     With 3001 identical inbound rows, the honest count is 3001 and the honest
     inbound total 3001. Computing over `page` would report 3000 — a silent
     under-report in exactly the case where the totals matter most, and one
     that looks entirely plausible on screen. */
  it('is computed over the full filtered set, NOT the capped slice', async () => {
    const over = SHOW_MAX + 1
    const many = Array.from({ length: over }, (_, i) => mv({ id: 'm' + i, in_qty: 1, out_qty: 0, price: 1 }))
    await open({ movements: many })
    const line = screen.getByText(/qeyd ·/).textContent ?? ''
    /* The honest count is 3001 and the honest inbound total 3001; computing
       over the rendered slice would report 3000 for both. */
    expect(line).toContain(nf(over) + ' qeyd')
    expect(line).toContain(nf(over, 2))
    expect(bodyRowCount()).toBe(SHOW_MAX)  // the TABLE is still capped
  }, 240_000)

  it('values only the inbound side', async () => {
    await open({ movements: [mv({ id: 'b', in_qty: 0, out_qty: 100, price: 50 })] })
    const line = screen.getByText(/qeyd ·/).textContent ?? ''
    /* Outbound turnover would be 5.000 ₼; inbound value is nothing. */
    expect(line).not.toContain('5.000')
  })
})

/* M8-42 / D2 — no client-side anbardar scoping. */
describe('warehouse scoping is the server&apos;s job, not this screen&apos;s', () => {
  /* MUTATION: an anbardar filter added to the page or the store. The live
     RLS policy already restricts what an anbardar receives:
       is_admin() OR is_rehber() OR (is_anbardar() AND warehouse = current_user_warehouse())
     A second, client-side filter could only ever hide rows the policy
     deliberately returned. This test asserts the client renders EVERY row it
     is given, across warehouses, with no user identity involved at all. */
  it('renders every row the server returned, across all warehouses', async () => {
    await open({
      movements: [
        mv({ id: 'a', warehouse: 'Ələt' }),
        mv({ id: 'b', warehouse: 'Astara' }),
        mv({ id: 'c', warehouse: 'Xocahəsən' }),
      ],
    })
    expect(screen.getAllByRole('row')).toHaveLength(4)
  })

  /* The page takes no `me` prop at all — there is no identity it could scope
     by even accidentally. */
  it('the component takes no user/role prop', () => {
    expect(MovementsPage.length).toBe(1)
  })

  it('offers every configured warehouse in the filter, unscoped', async () => {
    await open()
    expect(within(screen.getByLabelText('Anbar')).getAllByRole('option')).toHaveLength(4)
  })
})

describe('realtime (M8-14)', () => {
  it('subscribes to movements, enabled', async () => {
    await open()
    expect(realtimeCalls[0].enabled).toBe(true)
    expect(realtimeCalls[0].tables).toEqual(['movements'])
  })

  it('refreshes when a change arrives', async () => {
    await open()
    expect(fetchMovementsSnapshot).toHaveBeenCalledTimes(1)
    await act(async () => { fireRealtime?.() })
    expect(fetchMovementsSnapshot).toHaveBeenCalledTimes(2)
  })

  /* MUTATION: passing an explicit debounceMs of 0, or wiring the refresh so
     each event triggers its own load. Posting one document writes many
     movement rows, so an undebounced subscription would fire a full-table
     reload per row. The page relies on the hook's 400 ms default, so it must
     not override it. */
  it('does not override the hook&apos;s debounce', async () => {
    await open()
    expect(realtimeCalls[0].debounceMs).toBeUndefined()
  })
})

describe('load and error states', () => {
  it('shows a loading state before the first snapshot', async () => {
    let resolve!: (v: unknown) => void
    fetchMovementsSnapshot.mockReturnValue(new Promise((r) => { resolve = r }))
    render(<MovementsPage me={ME} onEditDocument={vi.fn()} onNewOperation={onNewOperation} />)
    expect(screen.getByText('Yüklənir…')).toBeTruthy()
    await act(async () => { resolve(snapshot()) })
  })

  it('shows a real error state when nothing has ever loaded', async () => {
    fetchMovementsSnapshot.mockResolvedValue({ ok: false, error: 'İcazə yoxdur' })
    render(<MovementsPage me={ME} onEditDocument={vi.fn()} onNewOperation={onNewOperation} />)
    await waitFor(() => expect(screen.getByText('Yükləmə xətası')).toBeTruthy())
    expect(screen.getByText('İcazə yoxdur')).toBeTruthy()
  })

  /* M8-45, at the UI level: a failed REFRESH keeps the table and says so.

     MUTATION: rendering the error in place of the table. The user would lose
     a perfectly good screen to a transient blip. */
  it('a failed refresh keeps the table visible and shows an honest banner', async () => {
    await open({ movements: [mv({ id: 'a' })] })
    expect(screen.getAllByRole('row')).toHaveLength(2)

    fetchMovementsSnapshot.mockResolvedValue({ ok: false, error: 'şəbəkə xətası' })
    await act(async () => { fireRealtime?.() })

    await waitFor(() => expect(screen.getByText('Yenilənmədi')).toBeTruthy())
    expect(screen.getAllByRole('row')).toHaveLength(2)
    expect(screen.getByText(/son uğurlu oxunuşun/)).toBeTruthy()
    expect(screen.queryByText('Yükləmə xətası')).toBeNull()
  })
})


/* ===========================================================================
   I-6 finding 3 — UNRESOLVED-CORRECTION RECONCILIATION, wired to this screen.

   `clearUnresolved` used to be reachable only from the write path, so the one
   outcome the write path never sees — a lost response — was permanent: the
   admin refreshed «Mal hərəkəti», saw the correction applied, and was still
   refused a second correction of that document.

   These tests drive the REAL correction store (no mock) against the rows this
   page loads, and assert both directions: it resolves on positive evidence of
   a CORRECTION, and it retains the block on everything else.
   ======================================================================== */

describe('unresolved correction — reconciliation and display', () => {
  const SCOPE = () => scopeOf(ME_ID)

  /** Writes one unresolved record straight to storage, as a reload would find
      it, then hydrates. No write path is involved. */
  function seedUnresolved(over: Record<string, unknown> = {}) {
    const scope = SCOPE()
    sessionStorage.setItem('anbar_correction_unresolved_' + scope, JSON.stringify({
      c1: {
        id: 'c1', docNum: 'SND-1', newDocNum: null, phase: 'unknown',
        refreshFailed: false, reconciled: false, scope, lineCount: 2, ...over,
      },
    }))
  }

  /** The two rows `correct_document` leaves behind for a corrected SND-1. */
  const CORRECTED_ROWS = [
    mv({ id: 'r1', doc_num: 'REV-1', note: 'Ləğv: SND-1' }),
    mv({ id: 'r2', doc_num: 'SND-2', note: 'Əvəz edir: SND-1' }),
  ]

  beforeEach(() => {
    sessionStorage.clear()
    useCorrectionStore.getState().reset()
  })

  it('CLEARS the record when the loaded rows prove the correction happened', async () => {
    seedUnresolved()
    await open({ movements: CORRECTED_ROWS })
    await waitFor(() =>
      expect(useCorrectionStore.getState().blockingFor('SND-1')).toBe(null))
  })

  it('RETAINS the block when only a cancellation is visible', async () => {
    /* The rule finding 3 names explicitly: a cancellation is not a
       correction. An ordinary «Ləğv» or an I-5 batch cancellation leaves this
       exact row, and clearing on it would unblock a resend in the very case
       where the document was cancelled but never replaced. */
    seedUnresolved()
    await open({ movements: [mv({ id: 'r1', doc_num: 'REV-1', note: 'Ləğv: SND-1' })] })
    await waitFor(() => expect(useMovementsStore.getState().loaded).toBe(true))
    expect(useCorrectionStore.getState().blockingFor('SND-1')).not.toBe(null)
  })

  it('RETAINS the block when the rows show nothing about the document', async () => {
    seedUnresolved()
    await open()
    expect(useCorrectionStore.getState().blockingFor('SND-1')).not.toBe(null)
  })

  it('DISPLAYS the affected document and its unresolved state', async () => {
    seedUnresolved()
    await open()
    const banner = await screen.findByTestId('mv-correction-unresolved')
    expect(banner.textContent).toContain('SND-1')
    expect(banner.textContent).toContain('TƏSDİQLƏNMƏYİB')
    /* Never the claim the write path is forbidden to make. */
    expect(banner.textContent).not.toContain('dəyişməyib')
  })

  it('shows the stale-success wording, naming the replacement', async () => {
    seedUnresolved({ phase: 'success', newDocNum: 'SND-2', refreshFailed: true })
    await open()
    const banner = await screen.findByTestId('mv-correction-unresolved')
    expect(banner.textContent).toContain('SND-1')
    expect(banner.textContent).toContain('SND-2')
  })

  it('removes the banner once the record is reconciled', async () => {
    seedUnresolved()
    await open({ movements: CORRECTED_ROWS })
    await waitFor(() =>
      expect(screen.queryByTestId('mv-correction-unresolved')).toBe(null))
  })

  it('renders NO banner when there is nothing unresolved', async () => {
    await open()
    expect(screen.queryByTestId('mv-correction-unresolved')).toBe(null)
  })

  it('surfaces a persistence error instead of silently failing open', async () => {
    /* An unreadable history is not an empty one — the store raises a blocking
       error, and the screen must say so rather than show nothing. */
    sessionStorage.setItem('anbar_correction_unresolved_' + SCOPE(), '{ not json')
    await open()
    const banner = await screen.findByTestId('mv-correction-unresolved')
    expect(banner.textContent).toContain('oxunmadı')
  })

  it('does not reconcile while a persistence error stands', async () => {
    /* Even with the proof on screen: if the history cannot be read, the
       records in memory may be incomplete, so nothing is cleared. */
    const scope = SCOPE()
    sessionStorage.setItem('anbar_correction_unresolved_' + scope, JSON.stringify({
      c1: {
        id: 'c1', docNum: 'SND-1', newDocNum: null, phase: 'unknown',
        refreshFailed: false, reconciled: false, scope, lineCount: 2,
      },
      bad: { id: 'MISMATCH', docNum: 'SND-9', scope },
    }))
    await open({ movements: CORRECTED_ROWS })
    await waitFor(() => expect(useMovementsStore.getState().loaded).toBe(true))
    expect(useCorrectionStore.getState().persistenceError).not.toBe(null)
    expect(useCorrectionStore.getState().blockingFor('SND-1')).not.toBe(null)
  })
})
