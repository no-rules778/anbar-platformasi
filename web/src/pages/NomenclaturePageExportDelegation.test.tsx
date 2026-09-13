import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, waitFor } from '@testing-library/react'

/* M16-11 — the Nomenklatura half of the delegation.

   The WRITER is mocked; `nomenclatureExportMatrix` runs for real, so what
   these tests inspect is the matrix a user would actually download. That is
   the point of the milestone: a Settings-initiated export must reach the
   EXISTING derivation, not a copy of it. */

const load = vi.fn(async () => {})

vi.mock('../hooks/useRealtimeRefresh', () => ({ useRealtimeRefresh: vi.fn() }))

vi.mock('../lib/xls', async (orig) => ({
  ...(await orig<typeof import('../lib/xls')>()),
  xls: vi.fn(),
}))

import { NomenclaturePage } from './NomenclaturePage'
import { useNomenclatureStore } from '../store/nomenclature.store'
import { useExportRequestStore } from '../store/exportRequest.store'
import { xls, NOMENCLATURE_EXPORT_HEADER } from '../lib/xls'

const me = { id: 'u1', sbId: 'u1', email: 'a@x', name: 'Admin', role: 'admin', wh: '' }

const baseState = {
  items: [
    { code: '0000002', name: 'Bolt', unit: 'ədəd', price: 3 },
    { code: '0000001', name: 'Aqreqat', unit: 'ədəd', price: 2 },
  ],
  indexes: { byItem: new Map([['0000001', { q: 5, val: 10 }], ['0000002', { q: 1, val: 3 }]]) },
  units: [], categories: [], warehouses: [],
  loading: false, error: null, filters: {}, showAll: false, cardCode: null,
  setFilters: vi.fn(), setShowAll: vi.fn(), openCard: vi.fn(), load,
}

beforeEach(() => {
  vi.clearAllMocks()
  load.mockResolvedValue(undefined)
  useExportRequestStore.setState({ pending: null })
  useNomenclatureStore.setState(baseState as never)
})

describe('NomenclaturePage export delegation (M16-11)', () => {
  it('does not export when no request is pending', () => {
    render(<NomenclaturePage me={me} />)
    expect(xls).not.toHaveBeenCalled()
  })

  it('consumes a `nom` request and exports through the existing derivation', async () => {
    useExportRequestStore.setState({ pending: 'nom' })
    render(<NomenclaturePage me={me} />)

    await waitFor(() => expect(xls).toHaveBeenCalledOnce())

    const [matrix, name] = vi.mocked(xls).mock.calls[0]
    expect(name).toBe('nomenklatura')
    /* The real header from lib/xls, not a literal retyped here: if the page
       ever grew its own matrix, this would diverge. */
    expect((matrix as unknown[][])[0]).toEqual([...NOMENCLATURE_EXPORT_HEADER])
    /* Balance-derived columns prove the page's own `indexes` feed the matrix.

       ORDER IS THE STORE'S, NOT SORTED: `rows` is `filterItems(items, …)`
       with no sort of its own, so the export preserves input order. Pinned
       deliberately — an expectation of code order here would be a guess, and
       it is what an earlier revision of this test got wrong. */
    expect((matrix as unknown[][]).slice(1)).toEqual([
      ['0000002', 'Bolt', 'ədəd', 3, 1, '3.00'],
      ['0000001', 'Aqreqat', 'ədəd', 2, 5, '10.00'],
    ])

    /* One-shot: the request is cleared, so a remount exports nothing more. */
    expect(useExportRequestStore.getState().pending).toBeNull()
  })

  it('ignores a request addressed to another page', () => {
    useExportRequestStore.setState({ pending: 'bal' })
    render(<NomenclaturePage me={me} />)
    expect(xls).not.toHaveBeenCalled()
    expect(useExportRequestStore.getState().pending).toBe('bal')
  })

  it('waits for a cold page load before exporting instead of writing an empty workbook', async () => {
    let release!: () => void
    load.mockImplementation(() => new Promise<void>((resolve) => {
      release = () => {
        useNomenclatureStore.setState(baseState as never)
        resolve()
      }
    }))
    useNomenclatureStore.setState({ items: [], indexes: { byItem: new Map(), bal: [], priceObs: new Map(), operational: [] } } as never)
    useExportRequestStore.setState({ pending: 'nom' })

    render(<NomenclaturePage me={me} />)

    expect(xls).not.toHaveBeenCalled()
    expect(useExportRequestStore.getState().pending).toBe('nom')

    release()
    await waitFor(() => expect(xls).toHaveBeenCalledOnce())
    expect((vi.mocked(xls).mock.calls[0]![0] as unknown[][]).slice(1)).toHaveLength(2)
    expect(useExportRequestStore.getState().pending).toBeNull()
  })
})
