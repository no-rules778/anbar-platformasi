import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('./supabase', () => ({ supabase: { from: vi.fn() } }))

import { supabase } from './supabase'
import { fetchStockConditions, toCondMap } from './stockConditions.api'

beforeEach(() => vi.clearAllMocks())

const row = (o: Record<string, unknown> = {}) => ({
  warehouse: 'Elet', item_code: 'A',
  unfit_qty: '0', repair_qty: '0', onsite_qty: '0', icare_qty: '5', note: '', ...o,
})

/* Records the query chain so A02 can assert BOTH order clauses and that they
   precede range(). One result per page, so a mid-pagination failure can be
   simulated. */
interface Calls { order: string[]; ranges: [number, number][]; orderedBeforeRange: boolean[] }
let calls: Calls

function mockPages(pages: { data?: unknown[] | null; error?: unknown }[]) {
  let i = 0
  calls = { order: [], ranges: [], orderedBeforeRange: [] }
  vi.mocked(supabase.from).mockReturnValue({
    select: () => {
      const perPage: string[] = []
      const builder = {
        order: (col: string) => { perPage.push(col); calls.order.push(col); return builder },
        range: (a: number, b: number) => {
          calls.ranges.push([a, b])
          calls.orderedBeforeRange.push(perPage.length === 2)
          return Promise.resolve(pages[i++] ?? { data: [], error: null })
        },
      }
      return builder
    },
  } as never)
}

function mockThrows(err: unknown) {
  calls = { order: [], ranges: [], orderedBeforeRange: [] }
  vi.mocked(supabase.from).mockReturnValue({
    select: () => {
      const builder = {
        order: (col: string) => { calls.order.push(col); return builder },
        range: () => Promise.reject(err),
      }
      return builder
    },
  } as never)
}

describe('fetchStockConditions — happy path', () => {
  it('maps the server columns onto the split record shape', async () => {
    mockPages([{ data: [row()], error: null }])
    const r = await fetchStockConditions()
    expect(r.ok).toBe(true)
    expect(r.error).toBeNull()
    expect(r.rows).toEqual([
      { w: 'Elet', c: 'A', unfit: 0, repair: 0, onsite: 0, icare: 5, note: '' },
    ])
  })

  /* icare_qty is column 031 — absent on an older server, read as 0. */
  it('reads a missing icare_qty as 0 rather than NaN', async () => {
    mockPages([{ data: [{ warehouse: 'Elet', item_code: 'A' }], error: null }])
    const r = await fetchStockConditions()
    expect(r.rows[0]).toMatchObject({ icare: 0, unfit: 0, repair: 0, onsite: 0 })
  })

  it('returns an empty successful result for an empty table', async () => {
    mockPages([{ data: [], error: null }])
    const r = await fetchStockConditions()
    expect(r).toEqual({ rows: [], ok: true, error: null })
  })
})

describe('fetchStockConditions — both failure shapes', () => {
  /* The Phase 3a rule: a returned {error} AND a rejected promise must both be
     absorbed, or a rejection escapes into the caller's Promise.all. */
  it('absorbs a RETURNED error', async () => {
    mockPages([{ data: null, error: { message: 'rls denied' } }])
    const r = await fetchStockConditions()
    expect(r.ok).toBe(false)
    expect(r.error).toBe('rls denied')
  })

  it('absorbs a REJECTED promise', async () => {
    mockThrows(new Error('network down'))
    const r = await fetchStockConditions()
    expect(r.ok).toBe(false)
    expect(r.error).toBe('network down')
  })

  it('absorbs a non-Error rejection', async () => {
    mockThrows('plain string')
    const r = await fetchStockConditions()
    expect(r.ok).toBe(false)
    expect(r.error).toBe('Naməlum xəta')
  })

  it('never throws', async () => {
    mockThrows(new Error('x'))
    await expect(fetchStockConditions()).resolves.toBeDefined()
  })

  it('falls back to a generic message when the error carries none', async () => {
    mockPages([{ data: null, error: {} }])
    expect((await fetchStockConditions()).error).toBe('Naməlum xəta')
  })
})

describe('fetchStockConditions — M7-S2 partial page failure', () => {
  /* A failure part-way through paging must be reported as a FAILURE, not as a
     short result. The rows gathered so far are returned for diagnostics only;
     the readiness matrix refuses to commit them. */
  it('flags a failure on a later page as partial and NOT ok', async () => {
    const full = Array.from({ length: 1000 }, (_, i) => row({ item_code: `C${i}` }))
    mockPages([
      { data: full, error: null },
      { data: null, error: { message: 'dropped on page 2' } },
    ])
    const r = await fetchStockConditions()
    expect(r.ok).toBe(false)
    expect(r.partial).toBe(true)
    expect(r.error).toBe('dropped on page 2')
    expect(r.rows.length).toBe(1000)   // returned, but never committed
  })

  it('a first-page failure is not partial', async () => {
    mockPages([{ data: null, error: { message: 'boom' } }])
    const r = await fetchStockConditions()
    expect(r.ok).toBe(false)
    expect(r.partial).toBe(false)
  })

  it('a rejection part-way through paging is partial too', async () => {
    const full = Array.from({ length: 1000 }, (_, i) => row({ item_code: `C${i}` }))
    let i = 0
    vi.mocked(supabase.from).mockReturnValue({
      select: () => {
        const builder = {
          order: () => builder,
          range: () => (i++ === 0
            ? Promise.resolve({ data: full, error: null })
            : Promise.reject(new Error('socket closed'))),
        }
        return builder
      },
    } as never)
    const r = await fetchStockConditions()
    expect(r.ok).toBe(false)
    expect(r.partial).toBe(true)
    expect(r.error).toBe('socket closed')
  })

  it('pages until a short page arrives', async () => {
    const full = Array.from({ length: 1000 }, (_, i) => row({ item_code: `C${i}` }))
    mockPages([
      { data: full, error: null },
      { data: [row({ item_code: 'LAST' })], error: null },
    ])
    const r = await fetchStockConditions()
    expect(r.ok).toBe(true)
    expect(r.rows).toHaveLength(1001)
  })
})

describe('toCondMap', () => {
  it('keys by warehouse|code and drops the note', () => {
    const m = toCondMap([
      { w: 'Elet', c: 'A', unfit: 1, repair: 2, onsite: 3, icare: 4, note: 'x' },
    ])
    expect(m.get('Elet|A')).toEqual({ unfit: 1, repair: 2, onsite: 3, icare: 4 })
  })

  it('returns an empty map for no rows', () => {
    expect(toCondMap([]).size).toBe(0)
  })
})

/* ---------- A02 — deterministic paging order ----------
   Without an ORDER BY, PostgREST page boundaries are not stable: rows can be
   skipped or duplicated across `range()` windows even though every request
   succeeds. A SKIPPED condition row makes its item read as unmarked, so the
   split UI never renders and the whole quantity posts as `normal` — the M7-S3
   wrong write, reached without any error. */
describe('fetchStockConditions — A02 stable ordering', () => {
  it('orders by warehouse THEN item_code, the table primary key', async () => {
    mockPages([{ data: [row()], error: null }])
    await fetchStockConditions()
    expect(calls.order).toEqual(['warehouse', 'item_code'])
  })

  it('applies BOTH order clauses before range() on every page', async () => {
    const full = Array.from({ length: 1000 }, (_, i) => row({ item_code: `C${i}` }))
    mockPages([
      { data: full, error: null },
      { data: [row({ item_code: 'LAST' })], error: null },
    ])
    const r = await fetchStockConditions()
    expect(r.ok).toBe(true)
    expect(calls.ranges).toEqual([[0, 999], [1000, 1999]])
    // two order() calls per page, each recorded before that page's range()
    expect(calls.orderedBeforeRange).toEqual([true, true])
    expect(calls.order).toEqual(['warehouse', 'item_code', 'warehouse', 'item_code'])
  })

  it('still orders when the very first page fails', async () => {
    mockPages([{ data: null, error: { message: 'boom' } }])
    await fetchStockConditions()
    expect(calls.order).toEqual(['warehouse', 'item_code'])
  })
})
