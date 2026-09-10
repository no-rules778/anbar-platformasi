import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

/* I-7 — the «Excel» button on «Mal hərəkəti» (M8-50, ordinary export only).

   The WRITER is mocked: `xls()` is already covered by its own suite, and
   letting it run would attempt a real file download in jsdom. What is asserted
   here is the wiring — that the button calls the EXISTING writer, with the
   full filtered set and the snapshot's valuation map, and only once a complete
   snapshot has loaded. No live data is touched: the snapshot API is mocked. */

const fetchMovementsSnapshot = vi.fn()
vi.mock('../api/movementsSnapshot.api', () => ({
  fetchMovementsSnapshot: () => fetchMovementsSnapshot(),
}))

vi.mock('../api/stockLayers.api', () => ({
  fetchLayerCapability: async () => ({ ready: true, active: false, version: 1 }),
  LAYERS_INACTIVE: { ready: false, active: false, version: 0 },
}))

vi.mock('../hooks/useRealtimeRefresh', () => ({ useRealtimeRefresh: () => {} }))

/* Only the writer is replaced; `movementExportMatrix` runs for real, so the
   matrix these tests inspect is the one a user would actually download. */
vi.mock('../lib/xls', async (orig) => ({
  ...(await orig<typeof import('../lib/xls')>()),
  xls: vi.fn(),
}))

import { MovementsPage } from './MovementsPage'
import { useMovementsStore, __resetMovementsRequestSeq } from '../store/movements.store'
import { useAuditLogStore } from '../store/auditLog.store'
import { EMPTY_MOVEMENT_FILTERS } from '../lib/movementFilters'
import { SHOW_MAX } from '../lib/showAllCut'
import { xls } from '../lib/xls'
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
    snapshot: { movements: [mv()], items: ITEMS, warehouses: WHS, valuations: [], ...over },
  }
}

const ME_ID = '11111111-1111-4111-8111-111111111111'
const ME: Me = {
  id: ME_ID, sbId: ME_ID, email: 'anar@example.com',
  name: 'Anar İbrahimov', role: 'admin', wh: 'Ələt',
}

beforeEach(() => {
  vi.clearAllMocks()
  __resetMovementsRequestSeq()
  useMovementsStore.setState({
    rows: [], operational: [], itemBy: new Map(), warehouses: [],
    valuations: new Map(), loading: false, error: null, loaded: false,
    filters: EMPTY_MOVEMENT_FILTERS, showAll: false,
  })
  fetchMovementsSnapshot.mockResolvedValue(snapshot())
  useAuditLogStore.setState({ emails: new Map() })
})

function renderPage(me: Me = ME) {
  render(<MovementsPage me={me} onEditDocument={vi.fn()} onNewOperation={vi.fn()} />)
}

async function open(over: Record<string, unknown> = {}) {
  if (Object.keys(over).length) fetchMovementsSnapshot.mockResolvedValue(snapshot(over))
  renderPage()
  await waitFor(() => expect(useMovementsStore.getState().loaded).toBe(true))
}

const exportBtn = () => screen.getByTestId('mv-export') as HTMLButtonElement

/** The matrix handed to the writer by the last click. */
function lastMatrix(): unknown[][] {
  const call = vi.mocked(xls).mock.calls.at(-1)
  if (!call) throw new Error('xls() was not called')
  return call[0] as unknown[][]
}

describe('I-7 — the Excel button is wired to the existing writer', () => {
  it('calls xls() with the legacy filename and no sheet name override', async () => {
    await open()
    await userEvent.click(exportBtn())

    expect(xls).toHaveBeenCalledTimes(1)
    const call = vi.mocked(xls).mock.calls[0]!
    expect(call[1]).toBe('mal_hereketi')
    /* Legacy passes no third argument, so the workbook keeps the shared
       helper's own «Hesabat» default. */
    expect(call[2]).toBeUndefined()
  })

  it('exports the header plus one row per movement', async () => {
    await open({ movements: [mv({ id: 'a' }), mv({ id: 'b' })] })
    await userEvent.click(exportBtn())

    const m = lastMatrix()
    expect(m).toHaveLength(3)
    expect(m[0]).toHaveLength(15)
    expect(m[0]![0]).toBe('Tarix')
    expect(m[0]![14]).toBe('Qeyd edən')
  })

  it('carries the item UNIT through — the store must not drop it', async () => {
    /* The one field I-7 had to preserve in derive(). If it is dropped again,
       «Ölçü» silently exports blank for every row. */
    await open()
    await userEvent.click(exportBtn())
    expect(lastMatrix()[1]![4]).toBe('ədəd')
  })
})

describe('I-7 — the export follows the filters, not the page', () => {
  it('respects an active filter', async () => {
    await open({
      movements: [mv({ id: 'a', item_code: '0000001' }), mv({ id: 'b', item_code: '0000002' })],
    })
    useMovementsStore.setState({ filters: { ...EMPTY_MOVEMENT_FILTERS, q: 'boru' } })

    await userEvent.click(exportBtn())
    const m = lastMatrix()
    expect(m).toHaveLength(2)
    expect(m[1]![2]).toBe('0000002')
  })

  it('exports in the screen order — date desc', async () => {
    await open({
      movements: [
        mv({ id: 'old', date: '2026-01-01' }),
        mv({ id: 'new', date: '2026-09-09' }),
      ],
    })
    await userEvent.click(exportBtn())
    const m = lastMatrix()
    expect([m[1]![0], m[2]![0]]).toEqual(['2026-09-09', '2026-01-01'])
  })

  /* MUTATION GUARD: the table shows SHOW_MAX rows; the export must carry every
     filtered row. Substituting `page` for `all` at the call site fails here.

     The REAL SHOW_MAX is used, not a reduced stand-in, so the raised timeout
     is retained as headroom — and the click is dispatched directly rather than
     through userEvent, whose pointer-event setup walks the whole 3001-row DOM
     (the same jsdom cost documented for the cap tests in MovementsPage.test). */
  it('exports the FULL set past the display cap, not the slice', async () => {
    const many = Array.from({ length: SHOW_MAX + 1 }, (_, i) =>
      mv({ id: 'm' + i, date: '2026-09-01' }))
    await open({ movements: many })

    expect(document.querySelectorAll('tbody tr').length).toBe(SHOW_MAX)

    fireEvent.click(exportBtn())
    expect(lastMatrix()).toHaveLength(SHOW_MAX + 2)
  }, 240_000)
})

describe('I-7 — the valuation map reaches the matrix', () => {
  const wo = mv({
    id: 'w1', type: 'Silinmə', in_qty: 0, out_qty: 4, price: 10, item_code: '0000001',
  })
  const stored = {
    movement_id: 'w1', source_amount: 33.6, known_amount: 33.6, unknown_qty: 0,
    final_amount: 33.6, valuation_method: 'lot', override_reason: null,
  }

  it('MUTATION GUARD: a stored valuation is exported, not the qty × price fallback', async () => {
    /* Omitting `valuations` at the call site would export 40 here — a wrong
       accounting amount that disagrees with the screen. */
    await open({ movements: [wo], valuations: [stored] })
    await userEvent.click(exportBtn())
    expect(lastMatrix()[1]![11]).toBe(33.6)
  })

  it('without a stored row the legacy fallback still applies', async () => {
    await open({ movements: [wo], valuations: [] })
    await userEvent.click(exportBtn())
    expect(lastMatrix()[1]![11]).toBe(40)
  })
})

describe('I-7 — export is gated on a complete successful snapshot', () => {
  it('is DISABLED while the first read is still in flight', async () => {
    let release!: (v: unknown) => void
    fetchMovementsSnapshot.mockReturnValue(new Promise((r) => { release = r }))
    renderPage()

    await waitFor(() => expect(useMovementsStore.getState().loading).toBe(true))
    expect(exportBtn().disabled).toBe(true)

    release(snapshot())
    await waitFor(() => expect(useMovementsStore.getState().loaded).toBe(true))
    expect(exportBtn().disabled).toBe(false)
  })

  it('is DISABLED when the first read FAILED — nothing has ever loaded', async () => {
    fetchMovementsSnapshot.mockResolvedValue({ ok: false, error: 'şəbəkə xətası' })
    renderPage()

    await waitFor(() => expect(useMovementsStore.getState().error).toBeTruthy())
    expect(useMovementsStore.getState().loaded).toBe(false)
    expect(exportBtn().disabled).toBe(true)
  })

  it('clicking while disabled writes nothing', async () => {
    fetchMovementsSnapshot.mockResolvedValue({ ok: false, error: 'şəbəkə xətası' })
    renderPage()
    await waitFor(() => expect(useMovementsStore.getState().error).toBeTruthy())

    await userEvent.click(exportBtn())
    expect(xls).not.toHaveBeenCalled()
  })

  it('after a FAILED REFRESH it stays enabled and exports the retained snapshot', async () => {
    /* M8-45: a failed refresh keeps the last good snapshot as one unit and
       writes no rows. Exporting then is correct — it is exactly what the
       «Yenilənmədi» banner says is on screen — and there is no partial fresh
       data that could reach the file. */
    await open({ movements: [mv({ id: 'good', date: '2026-09-01' })] })

    fetchMovementsSnapshot.mockResolvedValue({ ok: false, error: 'şəbəkə xətası' })
    await useMovementsStore.getState().load()
    await waitFor(() => expect(useMovementsStore.getState().error).toBeTruthy())

    expect(useMovementsStore.getState().loaded).toBe(true)
    expect(screen.getByText(/Yenilənmədi/)).toBeTruthy()
    expect(exportBtn().disabled).toBe(false)

    await userEvent.click(exportBtn())
    const m = lastMatrix()
    expect(m).toHaveLength(2)
    expect(m[1]![0]).toBe('2026-09-01')
  })

  it('a successfully loaded EMPTY set exports the header-only workbook', async () => {
    await open({ movements: [] })
    expect(exportBtn().disabled).toBe(false)

    await userEvent.click(exportBtn())
    const m = lastMatrix()
    expect(m).toHaveLength(1)
    expect(m[0]).toHaveLength(15)
  })
})

describe('I-7 — access is not widened', () => {
  const as = (role: Me['role']): Me => ({ ...ME, role })

  it.each(['admin', 'rehber', 'anbardar'] as const)(
    'the export button is offered to %s, exactly as legacy offers it',
    async (role) => {
      renderPage(as(role))
      await waitFor(() => expect(useMovementsStore.getState().loaded).toBe(true))

      /* `#mov-exp` carries no isAdmin() gate in the original, unlike the batch
         button beside it. RLS decides which rows a role can see; the client
         does not re-decide who may export what it already shows. */
      expect(exportBtn().disabled).toBe(false)
    },
  )

  it('a non-admin gets Excel but still NOT the admin-only batch button', async () => {
    renderPage(as('anbardar'))
    await waitFor(() => expect(useMovementsStore.getState().loaded).toBe(true))

    expect(screen.getByTestId('mv-export')).toBeTruthy()
    expect(screen.queryByTestId('mv-batch-cancel')).toBeNull()
  })
})

describe('I-7 — deferred scope is still absent', () => {
  /* NARROWED BY I-9, not weakened. When this test was written both «Çap» and
     the separate Silinmə report were deferred. I-9 DELIVERED the Silinmə
     report — `mv-export-writeoff`, covered by its own suite — so asserting its
     absence would now assert that a shipped feature is missing.

     «Çap» remains deferred and is still asserted here. The Silinmə control is
     asserted PRESENT rather than simply dropped, so this test keeps failing if
     either control's status changes without a decision. */
  it('renders no Çap, and now DOES render the Silinmə report (I-9)', async () => {
    await open()
    const labels = Array.from(document.querySelectorAll('button')).map((b) => b.textContent ?? '')
    expect(labels.some((t) => /Çap/.test(t))).toBe(false)
    expect(labels.some((t) => /Silinmə hesabat/i.test(t))).toBe(true)
    expect(screen.getByTestId('mv-export-writeoff')).toBeTruthy()
  })
})
