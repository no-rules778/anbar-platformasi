import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, waitFor } from '@testing-library/react'

/* M16-11 — the «Anbar qalıqları» half of the delegation.

   Mocks follow BalancesPage.test.tsx: the snapshot READ and the condition
   WRITE are mocked and the workbook WRITER is replaced, while the matrix
   builders run for real. No network call, no live data. */

const fetchBalancesSnapshot = vi.fn()
vi.mock('../api/balancesSnapshot.api', () => ({
  fetchBalancesSnapshot: () => fetchBalancesSnapshot(),
}))

vi.mock('../api/setStockCondition.api', () => ({ setStockCondition: vi.fn() }))
vi.mock('../hooks/useRealtimeRefresh', () => ({ useRealtimeRefresh: () => {} }))

vi.mock('../lib/xls', async (orig) => ({
  ...(await orig<typeof import('../lib/xls')>()),
  xls: vi.fn(),
}))

import { BalancesPage } from './BalancesPage'
import { useBalancesStore } from '../store/balances.store'
import { useExportRequestStore } from '../store/exportRequest.store'
import { BALANCE_EXPORT_NAME, CURRENT_EXPORT_HEADER } from '../lib/balanceExport'
import { xls } from '../lib/xls'
import type { Me } from '../lib/roles'

const ME: Me = {
  id: 'u1', sbId: 'u1', email: 'a@x', name: 'Admin', role: 'admin', wh: '',
}

const SNAPSHOT = {
  ok: true as const,
  snapshot: {
    movements: [{
      id: 'm1', item_code: '0000001', warehouse: 'Ələt', date: '2026-09-01',
      in_qty: 10, out_qty: 0, price: 2, partner: null, type: 'Satınalma',
      invoice_num: null, note: null, doc_num: null,
      created_at: '2026-09-01T10:00:00Z', channel: null,
      contract_num: null, created_by: null,
    }],
    items: [{ code: '0000001', name: 'Nasos', unit: 'ədəd', price: 5, category: null }],
    warehouses: ['Ələt', 'Astara'],
    conditions: [],
  },
}

beforeEach(() => {
  vi.clearAllMocks()
  useExportRequestStore.setState({ pending: null })
  useBalancesStore.setState({ loaded: false, loading: false, error: null })
  fetchBalancesSnapshot.mockResolvedValue(SNAPSHOT)
})

describe('BalancesPage export delegation (M16-11)', () => {
  it('does not export when no request is pending', async () => {
    render(<BalancesPage me={ME} />)
    await waitFor(() => expect(useBalancesStore.getState().loaded).toBe(true))
    expect(xls).not.toHaveBeenCalled()
  })

  it('consumes a `bal` request and exports through the existing derivation', async () => {
    useExportRequestStore.setState({ pending: 'bal' })
    render(<BalancesPage me={ME} />)

    await waitFor(() => expect(xls).toHaveBeenCalledOnce())

    const [matrix, name] = vi.mocked(xls).mock.calls[0]!
    expect(name).toBe(BALANCE_EXPORT_NAME)
    /* The REAL current-view header, imported rather than retyped. */
    expect((matrix as unknown[][])[0]).toEqual([...CURRENT_EXPORT_HEADER])

    expect(useExportRequestStore.getState().pending).toBeNull()
  })

  it('ignores a request addressed to another page', async () => {
    useExportRequestStore.setState({ pending: 'mov' })
    render(<BalancesPage me={ME} />)
    await waitFor(() => expect(useBalancesStore.getState().loaded).toBe(true))
    expect(xls).not.toHaveBeenCalled()
    expect(useExportRequestStore.getState().pending).toBe('mov')
  })

  it('refuses to export before a complete snapshot', async () => {
    fetchBalancesSnapshot.mockResolvedValue({ ok: false as const, error: 'network' })
    useExportRequestStore.setState({ pending: 'bal' })
    render(<BalancesPage me={ME} />)

    await waitFor(() => expect(useBalancesStore.getState().error).toBeTruthy())
    expect(useBalancesStore.getState().loaded).toBe(false)
    expect(xls).not.toHaveBeenCalled()
  })

  /* REGRESSION — the same first-render gating defect proved on this page.
     Falsifiable: consume above the gate in BalancesPage and only this fails. */
  it('exports once the snapshot arrives, even though the first render is gated', async () => {
    let release!: (v: unknown) => void
    fetchBalancesSnapshot.mockReturnValue(new Promise((res) => { release = res }))
    useExportRequestStore.setState({ pending: 'bal' })
    render(<BalancesPage me={ME} />)

    expect(useBalancesStore.getState().loaded).toBe(false)
    expect(xls).not.toHaveBeenCalled()
    expect(useExportRequestStore.getState().pending).toBe('bal')

    release(SNAPSHOT)

    await waitFor(() => expect(xls).toHaveBeenCalledOnce())
    expect(vi.mocked(xls).mock.calls[0]![1]).toBe(BALANCE_EXPORT_NAME)
    expect(useExportRequestStore.getState().pending).toBeNull()
  })

  it('abandons an unsatisfied request when the page is left', async () => {
    fetchBalancesSnapshot.mockResolvedValue({ ok: false as const, error: 'network' })
    useExportRequestStore.setState({ pending: 'bal' })
    const { unmount } = render(<BalancesPage me={ME} />)

    await waitFor(() => expect(useBalancesStore.getState().error).toBeTruthy())
    unmount()
    expect(useExportRequestStore.getState().pending).toBeNull()
  })
})
