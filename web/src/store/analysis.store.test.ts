import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../api/reportsSnapshot.api', () => ({ fetchReportsSnapshot: vi.fn() }))
import { fetchReportsSnapshot } from '../api/reportsSnapshot.api'
import { useAnalysisStore } from './analysis.store'

const ok = (partner = 'P') => ({ ok: true as const, snapshot: {
  movements: [{ id: 'm', item_code: 'A', warehouse: 'W', date: '2026-01-01', in_qty: 1, out_qty: 0, price: 2, partner, type: 'Satınalma', invoice_num: null, note: null, doc_num: null, created_at: null }],
  items: [{ code: 'A', name: 'A', unit: 'əd', price: 2, category: null }],
  locations: [{ name: 'W', type: 'anbar', active: true }], partners: [{ name: partner }],
} })

beforeEach(() => {
  vi.clearAllMocks()
  useAnalysisStore.setState({ movements: [], items: [], locations: [], partners: [], loading: false, loaded: false, error: null })
})

describe('analysis snapshot store', () => {
  it('commits one complete snapshot and both derived index layers', async () => {
    vi.mocked(fetchReportsSnapshot).mockResolvedValue(ok() as never)
    await useAnalysisStore.getState().load()
    const s = useAnalysisStore.getState()
    expect(s.loaded).toBe(true)
    expect(s.indexes.bal[0].q).toBe(1)
    expect(s.aggregates.byPartner.get('P')?.val).toBe(2)
  })

  it('retains a successful snapshot when refresh fails', async () => {
    vi.mocked(fetchReportsSnapshot).mockResolvedValue(ok() as never)
    await useAnalysisStore.getState().load()
    const before = useAnalysisStore.getState().indexes
    vi.mocked(fetchReportsSnapshot).mockResolvedValue({ ok: false, error: '503' } as never)
    await useAnalysisStore.getState().load()
    expect(useAnalysisStore.getState()).toMatchObject({ loaded: true, error: '503', indexes: before })
  })

  it('discards a late older response', async () => {
    let release!: (v: unknown) => void
    vi.mocked(fetchReportsSnapshot).mockReturnValueOnce(new Promise((r) => { release = r }) as never)
    const first = useAnalysisStore.getState().load()
    vi.mocked(fetchReportsSnapshot).mockResolvedValue(ok('NEW') as never)
    await useAnalysisStore.getState().load()
    release(ok('OLD')); await first
    expect(useAnalysisStore.getState().partners).toEqual([{ name: 'NEW' }])
  })
})
