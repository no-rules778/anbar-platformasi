import { describe, it, expect, vi, beforeEach } from 'vitest'

/* M18-10 — the rail counter badges' data layer.

   What these tests can and cannot prove: they exercise the CLIENT's query
   shape and its degradation, against a mocked builder. They prove nothing
   about RLS, grants or what any role's count actually is on the server. A
   count returned here is the mock's number, not the database's. */

const eq = vi.fn()
const select = vi.fn()
const from = vi.fn()

vi.mock('../api/supabase', () => ({ supabase: { from: (t: string) => from(t) } }))

import { fetchNavCounts } from '../api/navCounters.api'

/** A thenable count query that records the .eq() filters applied to it. */
function q(result: { count: number | null; error: unknown }, filters: string[][] = []) {
  const self: Record<string, unknown> = {
    eq: (c: string, v: unknown) => { filters.push([c, String(v)]); eq(c, v); return self },
    then: (r: (v: typeof result) => unknown) => Promise.resolve(result).then(r),
  }
  return self
}

beforeEach(() => { vi.clearAllMocks() })

describe('fetchNavCounts — query shape (M18-10)', () => {
  it('counts items and BOTH warehouse legs, head-only — and NOT partners', () => {
    const tables: string[] = []
    from.mockImplementation((t: string) => {
      tables.push(t)
      return { select: (cols: string, opts: unknown) => { select(cols, opts); return q({ count: 1, error: null }) } }
    })

    void fetchNavCounts()

    /* Legacy c-anb sums DB.whs and DB.locs, and BOTH come from the single
       `warehouses` table (index.html:933-935). There is no `locations`
       table — a count against one would silently fail. */
    expect(tables).toEqual(['items', 'warehouses', 'warehouses'])
    /* D-P1 ACCEPTED (2026-09-12) — «Kontragentlər» gets no rail entry, so
       `c-knt` has no consumer and partners must NOT be counted at boot. A
       request whose result nothing can display is pure waste. */
    expect(tables).not.toContain('partners')
    /* head:true — the badge needs a number, never rows. */
    for (const call of select.mock.calls) {
      expect(call[1]).toEqual({ count: 'exact', head: true })
    }
  })

  it('filters the DB.whs leg to active anbar rows, and the DB.locs leg not at all', async () => {
    const filters: string[][][] = []
    from.mockImplementation(() => ({
      select: () => { const f: string[][] = []; filters.push(f); return q({ count: 3, error: null }, f) },
    }))

    await fetchNavCounts()

    const [, whs, locs] = filters
    /* `DB.whs = warehouses.filter(r => r.active && r.type === 'anbar')` (933). */
    expect(whs).toEqual([['active', 'true'], ['type', 'anbar']])
    /* `DB.locs = warehouses.map(...)` — EVERY row, no filter (935). */
    expect(locs).toEqual([])
  })
})

describe('fetchNavCounts — arithmetic and degradation (M18-10)', () => {
  function counts(results: { count: number | null; error: unknown }[]) {
    let i = 0
    from.mockImplementation(() => ({ select: () => q(results[i++]) }))
    return fetchNavCounts()
  }

  it('sums the two warehouse legs the way legacy does', async () => {
    /* Order: items, whs (active anbar), locs (all rows). */
    const r = await counts([
      { count: 10, error: null },
      { count: 3, error: null }, { count: 7, error: null },
    ])
    expect(r.items).toBe(10)
    /* 3 active anbar + 7 total rows = 10. Legacy double-counts the active
       anbar rows; that arithmetic is reproduced, not "fixed". */
    expect(r.warehouses).toBe(10)
  })

  it('CONTROL — a passing sum is not a coincidence of equal inputs', async () => {
    const r = await counts([
      { count: 1, error: null },
      { count: 2, error: null }, { count: 5, error: null },
    ])
    expect(r.warehouses).toBe(7)
    expect(r.warehouses).not.toBe(2)
    expect(r.warehouses).not.toBe(5)
  })

  it('yields null — never 0 — for a failed leg, and isolates it', async () => {
    const r = await counts([
      { count: null, error: { message: 'denied' } },
      { count: 3, error: null }, { count: 7, error: null },
    ])
    /* A failed count must not render as "none": 0 is a claim about the data
       that nothing verified. */
    expect(r.items).toBeNull()
    expect(r.items).not.toBe(0)
    /* The broken items leg must not blank the warehouse sum. */
    expect(r.warehouses).toBe(10)
  })

  it('nulls the whole warehouse sum when EITHER leg fails', async () => {
    const a = await counts([
      { count: 1, error: null },
      { count: null, error: { message: 'x' } }, { count: 7, error: null },
    ])
    /* A partial sum would understate the total while looking like a real,
       smaller number — worse than showing the failure glyph. */
    expect(a.warehouses).toBeNull()
    expect(a.warehouses).not.toBe(7)

    const b = await counts([
      { count: 1, error: null },
      { count: 3, error: null }, { count: null, error: { message: 'x' } },
    ])
    expect(b.warehouses).toBeNull()
    expect(b.warehouses).not.toBe(3)
  })

  it('treats a thrown builder as a failed count, not a crash', async () => {
    from.mockImplementation(() => { throw new Error('offline') })
    const r = await fetchNavCounts()
    expect(r).toEqual({ items: null, warehouses: null })
  })

  it('distinguishes a genuine zero from a failure', async () => {
    const r = await counts([
      { count: 0, error: null },
      { count: 0, error: null }, { count: 0, error: null },
    ])
    /* An empty table really is 0 and must render as 0, not as '!'. */
    expect(r.items).toBe(0)
    expect(r.items).not.toBeNull()
    expect(r.warehouses).toBe(0)
  })
})
