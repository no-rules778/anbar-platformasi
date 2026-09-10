import { describe, expect, it } from 'vitest'
import { balanceKpis, filterBalanceRows, sortBalanceRows } from './balanceFilters'
import type { BalanceFilter } from './balanceFilters'
import type { BalanceRow } from './balanceRows'

/* M9-51, M9-52, M9-54, M9-61 — index.html:2326-2345. */

const row = (over: Partial<BalanceRow> = {}): BalanceRow => ({
  w: 'Elet', c: '0000001', name: 'Sement', unit: 'kq', price: 10,
  in: 0, out: 0, n: 0, q: 0, val: 0, last: '2026-01-01',
  cUnfit: 0, cRepair: 0, cOnsite: 0, cIcare: 0, ...over,
})

const f = (over: Partial<BalanceFilter> = {}): BalanceFilter => ({
  z: 'all', q: '', cond: '', ...over,
})

describe('zero-segment filter — M9-51', () => {
  const rows = [
    row({ c: 'POS', q: 5 }),
    row({ c: 'NEG', q: -3 }),
    row({ c: 'ZERO', q: 0 }),
  ]

  it('`all` is a no-op', () => {
    expect(filterBalanceRows(rows, f({ z: 'all' }))).toHaveLength(3)
  })

  it('`act` drops zero rows but keeps negatives', () => {
    const out = filterBalanceRows(rows, f({ z: 'act' }))
    expect(out.map((r) => r.c)).toEqual(['POS', 'NEG'])
  })

  it('`neg` keeps only q < 0 — an exactly-zero balance is not negative', () => {
    const out = filterBalanceRows(rows, f({ z: 'neg' }))
    expect(out.map((r) => r.c)).toEqual(['NEG'])
  })

  it('`zero` keeps only the zero row', () => {
    const out = filterBalanceRows(rows, f({ z: 'zero' }))
    expect(out.map((r) => r.c)).toEqual(['ZERO'])
  })

  /* The epsilon is load-bearing: q is a rounded float, so `=== 0` would
     misclassify a residue. This fails against an implementation using
     strict equality. */
  it('treats a sub-epsilon residue as zero, not as stock', () => {
    const tiny = [row({ c: 'TINY', q: 1e-12 })]
    expect(tiny[0].q).not.toBe(0)
    expect(filterBalanceRows(tiny, f({ z: 'zero' }))).toHaveLength(1)
    expect(filterBalanceRows(tiny, f({ z: 'act' }))).toHaveLength(0)
  })

  it('keeps a value just outside the epsilon as active', () => {
    const near = [row({ c: 'NEAR', q: 1e-6 })]
    expect(filterBalanceRows(near, f({ z: 'act' }))).toHaveLength(1)
    expect(filterBalanceRows(near, f({ z: 'zero' }))).toHaveLength(0)
  })

  /* EXACT BOUNDARY — Codex-found ledger/evidence correction, 2026-09-10.
     Legacy 2327-2329 rejects only `< 1e-9` for `act` and only `> 1e-9` for
     `zero`, so `|q| === 1e-9` is rejected by NEITHER branch and belongs to
     BOTH segments. The overlap is intentional legacy behaviour, not a defect;
     the algorithm already reproduced it, but no test pinned the equality case
     and the ledger wording said `zero |q| < 1e-9`.

     These fail against the two plausible "tidied" variants: `act` using
     `<= EPS` (drops the row from act) and `zero` using `< EPS` (drops it
     from zero). */
  it('keeps q === 1e-9 in BOTH act and zero — the boundary overlaps', () => {
    const edge = [row({ c: 'EDGE', q: 1e-9 })]
    expect(filterBalanceRows(edge, f({ z: 'act' })).map((r) => r.c)).toEqual(['EDGE'])
    expect(filterBalanceRows(edge, f({ z: 'zero' })).map((r) => r.c)).toEqual(['EDGE'])
  })

  it('keeps q === -1e-9 in BOTH act and zero, and in neg', () => {
    const edge = [row({ c: 'EDGE', q: -1e-9 })]
    expect(filterBalanceRows(edge, f({ z: 'act' })).map((r) => r.c)).toEqual(['EDGE'])
    expect(filterBalanceRows(edge, f({ z: 'zero' })).map((r) => r.c)).toEqual(['EDGE'])
    /* `neg` is a plain `q >= 0` rejection, so a negative epsilon IS negative. */
    expect(filterBalanceRows(edge, f({ z: 'neg' })).map((r) => r.c)).toEqual(['EDGE'])
  })

  /* The control that makes the pair above non-vacuous: one ulp outside the
     boundary is claimed by exactly one segment, never both. */
  it('claims a value one ulp outside the boundary for exactly one segment', () => {
    const above = [row({ c: 'ABOVE', q: 1.0000000000000003e-9 })]
    expect(filterBalanceRows(above, f({ z: 'act' }))).toHaveLength(1)
    expect(filterBalanceRows(above, f({ z: 'zero' }))).toHaveLength(0)

    const below = [row({ c: 'BELOW', q: 9.999999999999999e-10 })]
    expect(filterBalanceRows(below, f({ z: 'act' }))).toHaveLength(0)
    expect(filterBalanceRows(below, f({ z: 'zero' }))).toHaveLength(1)
  })
})

describe('search filter — the matching rule only (part of M9-50)', () => {
  it('matches on name and on code', () => {
    const rows = [row({ c: '0000001', name: 'Sement' }), row({ c: '0000002', name: 'Mismar' })]
    expect(filterBalanceRows(rows, f({ q: 'sement' })).map((r) => r.c)).toEqual(['0000001'])
    expect(filterBalanceRows(rows, f({ q: '0000002' })).map((r) => r.c)).toEqual(['0000002'])
  })

  it('matches across the `name + " " + code` haystack', () => {
    const rows = [row({ c: '0000001', name: 'Sement' })]
    expect(filterBalanceRows(rows, f({ q: 'sement 0000001' }))).toHaveLength(1)
  })

  it('lower-cases the row side of the comparison', () => {
    const rows = [row({ name: 'SEMENT' })]
    expect(filterBalanceRows(rows, f({ q: 'sement' }))).toHaveLength(1)
  })

  it('an empty query filters nothing', () => {
    const rows = [row(), row({ c: '0000002', name: 'Mismar' })]
    expect(filterBalanceRows(rows, f({ q: '' }))).toHaveLength(2)
  })
})

describe('condition filter — M9-52', () => {
  const rows = [
    row({ c: 'UNFIT', cUnfit: 2 }),
    row({ c: 'ICARE', cIcare: 5 }),
    row({ c: 'CLEAN' }),
  ]

  it('empty filter keeps everything', () => {
    expect(filterBalanceRows(rows, f({ cond: '' }))).toHaveLength(3)
  })

  it('`any` keeps rows with any marker above zero', () => {
    const out = filterBalanceRows(rows, f({ cond: 'any' }))
    expect(out.map((r) => r.c)).toEqual(['UNFIT', 'ICARE'])
  })

  it('a named key keeps only that key', () => {
    expect(filterBalanceRows(rows, f({ cond: 'unfit' })).map((r) => r.c)).toEqual(['UNFIT'])
    expect(filterBalanceRows(rows, f({ cond: 'icare' })).map((r) => r.c)).toEqual(['ICARE'])
  })

  it('requires strictly greater than zero', () => {
    expect(filterBalanceRows([row({ cUnfit: 0 })], f({ cond: 'unfit' }))).toHaveLength(0)
  })

  it('combines with the zero-segment', () => {
    const mixed = [row({ c: 'A', q: 0, cUnfit: 3 }), row({ c: 'B', q: 7, cUnfit: 3 })]
    const out = filterBalanceRows(mixed, f({ z: 'act', cond: 'unfit' }))
    expect(out.map((r) => r.c)).toEqual(['B'])
  })
})

describe('sorts — M9-54', () => {
  it('sorts by val descending by default', () => {
    const rows = [row({ c: 'A', val: 10 }), row({ c: 'B', val: 90 })]
    expect(sortBalanceRows(rows, 'val').map((r) => r.c)).toEqual(['B', 'A'])
  })

  it('sorts by q descending', () => {
    const rows = [row({ c: 'A', q: 1 }), row({ c: 'B', q: 50 })]
    expect(sortBalanceRows(rows, 'q').map((r) => r.c)).toEqual(['B', 'A'])
  })

  it('sorts by name ascending under the az collation', () => {
    const rows = [row({ c: 'C', name: 'Çınqıl' }), row({ c: 'A', name: 'Ağac' })]
    expect(sortBalanceRows(rows, 'name').map((r) => r.c)).toEqual(['A', 'C'])
  })

  it('sorts by last movement date descending', () => {
    const rows = [
      row({ c: 'OLD', last: '2025-01-01' }),
      row({ c: 'NEW', last: '2026-06-30' }),
      row({ c: 'MID', last: '2026-01-01' }),
    ]
    expect(sortBalanceRows(rows, 'last').map((r) => r.c)).toEqual(['NEW', 'MID', 'OLD'])
  })

  it('puts a blank last date last under a descending date sort', () => {
    const rows = [row({ c: 'BLANK', last: '' }), row({ c: 'DATED', last: '2025-01-01' })]
    expect(sortBalanceRows(rows, 'last').map((r) => r.c)).toEqual(['DATED', 'BLANK'])
  })

  it('offers one descending sort per condition key', () => {
    const rows = [row({ c: 'A', cRepair: 1 }), row({ c: 'B', cRepair: 8 })]
    expect(sortBalanceRows(rows, 'cond:repair').map((r) => r.c)).toEqual(['B', 'A'])
    const icare = [row({ c: 'A', cIcare: 9 }), row({ c: 'B', cIcare: 2 })]
    expect(sortBalanceRows(icare, 'cond:icare').map((r) => r.c)).toEqual(['A', 'B'])
  })

  it('falls back to val for an unknown sort key', () => {
    const rows = [row({ c: 'A', val: 10 }), row({ c: 'B', val: 90 })]
    expect(sortBalanceRows(rows, 'nonsense').map((r) => r.c)).toEqual(['B', 'A'])
  })

  it('does not mutate the caller’s array', () => {
    const rows = [row({ c: 'A', val: 10 }), row({ c: 'B', val: 90 })]
    sortBalanceRows(rows, 'val')
    expect(rows.map((r) => r.c)).toEqual(['A', 'B'])
  })
})

describe('KPI aggregates — M9-61', () => {
  it('sums quantity and value and counts zero/negative rows', () => {
    const rows = [
      row({ q: 10, val: 100 }),
      row({ q: -2, val: -20 }),
      row({ q: 0, val: 0 }),
    ]
    const k = balanceKpis(rows)
    expect(k.count).toBe(3)
    expect(k.qty).toBe(8)
    expect(k.val).toBe(80)
    expect(k.zeroCount).toBe(1)
    expect(k.negCount).toBe(1)
    expect(k.anyNegative).toBe(true)
  })

  it('reports anyNegative false when nothing is negative', () => {
    expect(balanceKpis([row({ q: 5, val: 50 })]).anyNegative).toBe(false)
  })

  it('counts a sub-epsilon residue as a zero balance', () => {
    expect(balanceKpis([row({ q: 1e-12 })]).zeroCount).toBe(1)
  })

  /* M9-61 — the totals come from the COMPLETE filtered set, never the capped
     page. This fails against an implementation that aggregates a slice. */
  it('aggregates every filtered row, not a capped page', () => {
    const many = Array.from({ length: 3200 }, () => row({ q: 1, val: 2 }))
    const k = balanceKpis(many)
    expect(k.count).toBe(3200)
    expect(k.qty).toBe(3200)
    expect(k.val).toBe(6400)
  })

  it('returns zeros for an empty set', () => {
    const k = balanceKpis([])
    expect(k).toEqual({ count: 0, qty: 0, val: 0, zeroCount: 0, negCount: 0, anyNegative: false })
  })
})

describe('filter → sort → KPI compose in the legacy order', () => {
  it('KPIs reflect the filtered set, not the unfiltered input', () => {
    const rows = [row({ c: 'A', q: 5, val: 50 }), row({ c: 'B', q: 0, val: 0 })]
    const filtered = filterBalanceRows(rows, f({ z: 'act' }))
    const k = balanceKpis(sortBalanceRows(filtered, 'val'))
    expect(k.count).toBe(1)
    expect(k.qty).toBe(5)
    expect(k.zeroCount).toBe(0)
  })
})
