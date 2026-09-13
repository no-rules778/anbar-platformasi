import { describe, expect, it, vi, beforeEach } from 'vitest'

/* T4 — the «Hesabatlar» store (M14-14, M14-18, M14-19, M14-87). */

vi.mock('../api/reportsSnapshot.api', () => ({ fetchReportsSnapshot: vi.fn() }))

import { useReportsStore } from './reports.store'
import { fetchReportsSnapshot } from '../api/reportsSnapshot.api'

const movement = (over: Record<string, unknown> = {}) => ({
  id: 'm', item_code: 'A', warehouse: 'W', date: '2026-02-01', in_qty: 1,
  out_qty: 0, price: 10, partner: 'P', type: 'Satınalma', invoice_num: '',
  note: '', doc_num: '', created_at: '', channel: '', contract_num: '',
  created_by: '', ...over,
})

const snapshot = (over: Record<string, unknown> = {}) => ({
  ok: true as const,
  snapshot: {
    movements: [movement()],
    items: [{ code: 'A', name: 'Item A', unit: 'ədəd', price: 10, category: null }],
    locations: [{ name: 'W', type: 'anbar', active: true }],
    partners: [{ name: 'P', voen: 'V1' }],
    ...over,
  },
})

const reset = () => useReportsStore.setState({
  movements: [], items: [], locations: [], partners: [],
  loading: false, loaded: false, error: null, kind: 'knt',
})

beforeEach(() => { vi.clearAllMocks(); reset() })

describe('load — M14-18, M14-19', () => {
  it('stores the snapshot and derives both index layers', async () => {
    vi.mocked(fetchReportsSnapshot).mockResolvedValue(snapshot() as never)
    await useReportsStore.getState().load()
    const s = useReportsStore.getState()
    expect(s.loaded).toBe(true)
    expect(s.error).toBeNull()
    expect(s.indexes.bal).toHaveLength(1)
    /* The Phase 14 aggregates are built alongside the accepted indexes. */
    expect(s.aggregates.byPartner.get('P')?.val).toBe(10)
    expect(s.aggregates.dates).toEqual(['2026-02-01'])
  })

  /* M14-18 — the aggregates are built from the OPERATIONAL rows, so a
     cancelled document and its reversal never reach any report. */
  it('excludes cancelled documents from the aggregates', async () => {
    vi.mocked(fetchReportsSnapshot).mockResolvedValue(snapshot({
      movements: [
        movement({ id: 'orig', doc_num: 'D-1', partner: 'Cancelled' }),
        movement({ id: 'rev', doc_num: 'D-2', note: 'Ləğv: D-1', partner: 'Cancelled' }),
        movement({ id: 'live', doc_num: 'D-3', partner: 'Live' }),
      ],
    }) as never)
    await useReportsStore.getState().load()
    const agg = useReportsStore.getState().aggregates
    expect(agg.byPartner.has('Cancelled')).toBe(false)
    expect(agg.byPartner.has('Live')).toBe(true)
  })
})

describe('failed refresh retains the previous snapshot — M14-14', () => {
  it('keeps the loaded data and only flags the error', async () => {
    vi.mocked(fetchReportsSnapshot).mockResolvedValue(snapshot() as never)
    await useReportsStore.getState().load()
    const before = useReportsStore.getState()
    expect(before.loaded).toBe(true)

    vi.mocked(fetchReportsSnapshot).mockResolvedValue({ ok: false, error: 'şəbəkə xətası' } as never)
    await useReportsStore.getState().load()
    const after = useReportsStore.getState()

    expect(after.error).toBe('şəbəkə xətası')
    /* Still loaded, and the data is the SAME object — not blanked. */
    expect(after.loaded).toBe(true)
    expect(after.movements).toBe(before.movements)
    expect(after.aggregates).toBe(before.aggregates)
    expect(after.loading).toBe(false)
  })

  it('reports an initial failure without claiming to be loaded', async () => {
    vi.mocked(fetchReportsSnapshot).mockResolvedValue({ ok: false, error: 'ilk xəta' } as never)
    await useReportsStore.getState().load()
    const s = useReportsStore.getState()
    expect(s.loaded).toBe(false)
    expect(s.error).toBe('ilk xəta')
  })
})

describe('stale response guard', () => {
  it('discards a superseded response rather than overwriting a newer one', async () => {
    let releaseSlow: (v: unknown) => void = () => {}
    const slow = new Promise((r) => { releaseSlow = r })

    vi.mocked(fetchReportsSnapshot).mockReturnValueOnce(slow as never)
    const first = useReportsStore.getState().load()

    vi.mocked(fetchReportsSnapshot).mockResolvedValue(snapshot({ partners: [{ name: 'NEWER' }] }) as never)
    await useReportsStore.getState().load()

    /* The slow first request now resolves — and must change nothing. */
    releaseSlow(snapshot({ partners: [{ name: 'STALE' }] }))
    await first

    expect(useReportsStore.getState().partners).toEqual([{ name: 'NEWER' }])
  })
})

describe('selection state — M14-07, M14-87', () => {
  it('defaults to the first report kind', () => {
    expect(useReportsStore.getState().kind).toBe('knt')
  })

  it('changes the selected kind', () => {
    useReportsStore.getState().setKind('qaime')
    expect(useReportsStore.getState().kind).toBe('qaime')
  })

  /* M14-87 / D-P3 — the column choice lives in the STORE so it survives the
     page unmounting, exactly as legacy's module-level QAIME_SEL does. */
  it('defaults the qaimə selection to seven columns on', () => {
    const sel = useReportsStore.getState().qaimeSel
    expect(Object.values(sel).filter(Boolean)).toHaveLength(7)
  })

  it('toggles a column and retains the change across an unrelated load', async () => {
    useReportsStore.getState().toggleQaimeColumn('note')
    expect(useReportsStore.getState().qaimeSel.note).toBe(true)

    vi.mocked(fetchReportsSnapshot).mockResolvedValue(snapshot() as never)
    await useReportsStore.getState().load()

    /* A data refresh must not reset the user's column choice. */
    expect(useReportsStore.getState().qaimeSel.note).toBe(true)
  })

  it('toggles a default-on column off', () => {
    useReportsStore.getState().toggleQaimeColumn('val')
    expect(useReportsStore.getState().qaimeSel.val).toBe(false)
  })

  it('replaces the selection object rather than mutating it', () => {
    const before = useReportsStore.getState().qaimeSel
    useReportsStore.getState().toggleQaimeColumn('ch')
    expect(useReportsStore.getState().qaimeSel).not.toBe(before)
    expect(before.ch).toBe(false)
  })
})
