import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, waitFor } from '@testing-library/react'

/* M16-11 — the «Mal hərəkəti» half of the delegation.

   Mocks follow MovementsPageExport.test.tsx exactly: the snapshot API and the
   workbook WRITER are replaced, while `movementExportMatrix` runs for real.
   So what these tests prove is that a Settings-initiated export reaches the
   EXISTING export path with the existing matrix — not a copy of it. No live
   data is touched. */

const fetchMovementsSnapshot = vi.fn()
vi.mock('../api/movementsSnapshot.api', () => ({
  fetchMovementsSnapshot: () => fetchMovementsSnapshot(),
}))

vi.mock('../api/stockLayers.api', () => ({
  fetchLayerCapability: async () => ({ ready: true, active: false, version: 1 }),
  LAYERS_INACTIVE: { ready: false, active: false, version: 0 },
}))

vi.mock('../hooks/useRealtimeRefresh', () => ({ useRealtimeRefresh: () => {} }))

vi.mock('../lib/xls', async (orig) => ({
  ...(await orig<typeof import('../lib/xls')>()),
  xls: vi.fn(),
}))

import { MovementsPage } from './MovementsPage'
import { useMovementsStore, __resetMovementsRequestSeq } from '../store/movements.store'
import { useAuditLogStore } from '../store/auditLog.store'
import { useExportRequestStore } from '../store/exportRequest.store'
import { EMPTY_MOVEMENT_FILTERS } from '../lib/movementFilters'
import { MOVEMENT_EXPORT_HEADER } from '../lib/movementExport'
import { xls } from '../lib/xls'
import type { MovementRow } from '../api/itemMovements.api'
import type { Me } from '../lib/roles'

const mv = (over: Partial<MovementRow> = {}): MovementRow => ({
  id: 'm1', item_code: '0000001', warehouse: 'Ələt', date: '2026-09-01',
  in_qty: 10, out_qty: 0, price: 2, partner: 'Azpetrol', type: 'Satınalma',
  invoice_num: null, note: null, doc_num: null, created_at: '2026-09-01T10:00:00Z',
  channel: null, contract_num: null, created_by: null, ...over,
})

const ITEMS = [{ code: '0000001', name: 'Nasos', unit: 'ədəd', price: 5, category: null }]
const WHS = ['Ələt', 'Astara', 'Xocahəsən']

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
  useAuditLogStore.setState({ emails: new Map() })
  useExportRequestStore.setState({ pending: null })
  fetchMovementsSnapshot.mockResolvedValue({
    ok: true as const,
    snapshot: { movements: [mv()], items: ITEMS, warehouses: WHS, valuations: [] },
  })
})

const renderPage = () =>
  render(<MovementsPage me={ME} onEditDocument={vi.fn()} onNewOperation={vi.fn()} />)

describe('MovementsPage export delegation (M16-11)', () => {
  it('does not export when no request is pending', async () => {
    renderPage()
    await waitFor(() => expect(useMovementsStore.getState().loaded).toBe(true))
    expect(xls).not.toHaveBeenCalled()
  })

  it('consumes a `mov` request and exports through the existing derivation', async () => {
    useExportRequestStore.setState({ pending: 'mov' })
    renderPage()

    await waitFor(() => expect(xls).toHaveBeenCalledOnce())

    const [matrix, name] = vi.mocked(xls).mock.calls[0]!
    expect(name).toBe('mal_hereketi')
    /* The REAL header, imported rather than retyped: if this page ever grew a
       matrix of its own, the two would diverge here. */
    expect((matrix as unknown[][])[0]).toEqual([...MOVEMENT_EXPORT_HEADER])
    /* One data row, and «Ölçü» carried through from the snapshot's items —
       proof the page's own store fed the existing matrix. */
    expect(matrix as unknown[][]).toHaveLength(2)
    expect((matrix as unknown[][])[1]![4]).toBe('ədəd')

    expect(useExportRequestStore.getState().pending).toBeNull()
  })

  it('ignores a request addressed to another page', async () => {
    useExportRequestStore.setState({ pending: 'nom' })
    renderPage()
    await waitFor(() => expect(useMovementsStore.getState().loaded).toBe(true))
    expect(xls).not.toHaveBeenCalled()
    expect(useExportRequestStore.getState().pending).toBe('nom')
  })

  /* The gate is the page's own `canExport = loaded`. A failed first read must
     not produce a header-only workbook that reads as a genuine empty result. */
  it('refuses to export before a complete snapshot', async () => {
    fetchMovementsSnapshot.mockResolvedValue({ ok: false as const, error: 'network' })
    useExportRequestStore.setState({ pending: 'mov' })
    renderPage()

    await waitFor(() => expect(useMovementsStore.getState().error).toBeTruthy())
    expect(useMovementsStore.getState().loaded).toBe(false)
    expect(xls).not.toHaveBeenCalled()
  })

  /* REGRESSION — the defect this milestone's first implementation had.

     Settings navigates here while the snapshot is still in flight, so the
     page's FIRST render has `canExport === false`. Consuming the request at
     that moment cleared it a tick before the data arrived and the user got no
     file at all. The request must survive the not-loaded → loaded transition.

     Falsifiable: restore `consumeExport()` above the gate and this fails while
     every other test in the file still passes. */
  it('exports once the snapshot arrives, even though the first render is gated', async () => {
    let release!: (v: unknown) => void
    fetchMovementsSnapshot.mockReturnValue(new Promise((res) => { release = res }))
    useExportRequestStore.setState({ pending: 'mov' })
    renderPage()

    /* Mid-flight: gated, nothing exported, and the request is still ALIVE. */
    expect(useMovementsStore.getState().loaded).toBe(false)
    expect(xls).not.toHaveBeenCalled()
    expect(useExportRequestStore.getState().pending).toBe('mov')

    release({
      ok: true as const,
      snapshot: { movements: [mv()], items: ITEMS, warehouses: WHS, valuations: [] },
    })

    await waitFor(() => expect(xls).toHaveBeenCalledOnce())
    expect(vi.mocked(xls).mock.calls[0]![1]).toBe('mal_hereketi')
    expect(useExportRequestStore.getState().pending).toBeNull()
  })

  /* The unmount cleanup: an unsatisfied request belongs to THIS visit and must
     not fire the next time the page opens. */
  it('abandons an unsatisfied request when the page is left', async () => {
    fetchMovementsSnapshot.mockResolvedValue({ ok: false as const, error: 'network' })
    useExportRequestStore.setState({ pending: 'mov' })
    const { unmount } = renderPage()

    await waitFor(() => expect(useMovementsStore.getState().error).toBeTruthy())
    unmount()
    expect(useExportRequestStore.getState().pending).toBeNull()
  })
})
