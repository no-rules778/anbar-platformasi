import { describe, it, expect } from 'vitest'
import {
  COND_COLS, condBuckets, condPending, condSplitZero, condSplitSum,
  condSplitPayload, condSplitCheck, condKey, SPLIT_UNSUPPORTED_MSG,
} from './condSplit'
import { nf } from './format'

const rec = (p: Partial<Record<string, number>> = {}) => ({
  unfit: p.unfit ?? 0, repair: p.repair ?? 0, onsite: p.onsite ?? 0, icare: p.icare ?? 0,
})

describe('COND_COLS', () => {
  it('carries the four markers in the legacy order (2068-2073)', () => {
    expect(COND_COLS.map((c) => c.k)).toEqual(['unfit', 'repair', 'onsite', 'icare'])
    expect(COND_COLS.map((c) => c.t))
      .toEqual(['Yararsız', 'Təmirə ehtiyaclı', 'Sahədə', 'İcarədə'])
  })
})

describe('condBuckets — M7-25', () => {
  it('normal is the balance minus every marker', () => {
    const b = condBuckets(rec({ icare: 3, unfit: 2 }), 10)
    expect(b.icare).toBe(3)
    expect(b.unfit).toBe(2)
    expect(b.normal).toBe(5)
    expect(b.marked).toBe(true)
    expect(b.keys).toEqual(['unfit', 'icare'])
  })

  it('an unmarked item is entirely normal', () => {
    const b = condBuckets(rec(), 7)
    expect(b.normal).toBe(7)
    expect(b.marked).toBe(false)
    expect(b.keys).toEqual([])
  })

  /* set_stock_condition only WARNS when markers exceed the balance, so each
     bucket is clamped individually and normal never goes negative. */
  it('clamps each bucket to the available balance', () => {
    const b = condBuckets(rec({ icare: 50 }), 4)
    expect(b.icare).toBe(4)
    expect(b.normal).toBe(0)
  })

  it('never produces a negative normal when markers overflow', () => {
    const b = condBuckets(rec({ icare: 6, unfit: 6 }), 5)
    expect(b.normal).toBe(0)
    expect(b.normal).toBeGreaterThanOrEqual(0)
  })

  it('subtracts pending buckets held by draft lines — M7-26', () => {
    const b = condBuckets(rec({ icare: 3 }), 10, { icare: 2 })
    expect(b.icare).toBe(1)
  })

  it('a bucket fully consumed by pending stops being marked', () => {
    const b = condBuckets(rec({ icare: 3 }), 10, { icare: 3 })
    expect(b.icare).toBe(0)
    expect(b.marked).toBe(false)
  })

  /* A null record is indistinguishable from "nothing marked" — safe ONLY
     because a failed stock_conditions read is fatal upstream (M7-S3). */
  it('a null cond record yields an unmarked, all-normal split', () => {
    const b = condBuckets(null, 8)
    expect(b.marked).toBe(false)
    expect(b.normal).toBe(8)
  })

  it('rounds to four decimals', () => {
    const b = condBuckets(rec({ icare: 0.00005 }), 1)
    expect(b.icare).toBe(0.0001)
  })

  it('treats a non-finite stored value as zero', () => {
    const b = condBuckets({ unfit: NaN, repair: 0, onsite: 0, icare: 0 } as never, 5)
    expect(b.unfit).toBe(0)
    expect(b.normal).toBe(5)
  })
})

describe('condPending — M7-26', () => {
  const line = (o: Record<string, unknown>) => ({ kind: 'out', w: 'Elet', c: 'A', ...o }) as never

  it('sums buckets across draft lines on the same warehouse+item', () => {
    const p = condPending([
      line({ cond: { icare: 2 } }),
      line({ cond: { icare: 1, unfit: 3 } }),
    ], 'Elet', 'A')
    expect(p.icare).toBe(3)
    expect(p.unfit).toBe(3)
  })

  it('ignores inbound lines, other warehouses, other items and split-less lines', () => {
    const p = condPending([
      line({ kind: 'in', cond: { icare: 9 } }),
      line({ w: 'Astara', cond: { icare: 9 } }),
      line({ c: 'B', cond: { icare: 9 } }),
      line({ cond: null }),
    ], 'Elet', 'A')
    expect(p.icare ?? 0).toBe(0)
  })

  it('counts transfer lines by their SOURCE warehouse', () => {
    const p = condPending([line({ kind: 'mv', cond: { icare: 2 } })], 'Elet', 'A')
    expect(p.icare).toBe(2)
  })
})

describe('condSplitZero / condSplitSum', () => {
  it('zero split has every key at 0', () => {
    const z = condSplitZero()
    expect(z.normal).toBe(0)
    for (const c of COND_COLS) expect(z[c.k]).toBe(0)
  })

  it('the sum INCLUDES normal', () => {
    expect(condSplitSum({ normal: 2, icare: 3, unfit: 0, repair: 0, onsite: 0 })).toBe(5)
  })

  it('tolerates null and partial splits', () => {
    expect(condSplitSum(null)).toBe(0)
    expect(condSplitSum({ icare: 1 })).toBe(1)
  })
})

describe('condSplitPayload — M7-29', () => {
  /* The server derives `normal` from the balance; sending it too would create
     a second source of truth for the same number. */
  it('NEVER includes normal', () => {
    const p = condSplitPayload({ normal: 5, icare: 2, unfit: 0, repair: 0, onsite: 0 })
    expect(p).toEqual({ icare: 2 })
    expect(p).not.toHaveProperty('normal')
  })

  it('omits zero buckets', () => {
    expect(condSplitPayload({ normal: 0, icare: 0, unfit: 1, repair: 0, onsite: 0 }))
      .toEqual({ unfit: 1 })
  })

  it('returns null when no marker bucket is positive', () => {
    expect(condSplitPayload(condSplitZero())).toBeNull()
    expect(condSplitPayload({ normal: 9 })).toBeNull()
    expect(condSplitPayload(null)).toBeNull()
  })

  it('rounds to four decimals', () => {
    expect(condSplitPayload({ icare: 1.000049 })).toEqual({ icare: 1 })
  })
})

describe('condSplitCheck — M7-28', () => {
  const buckets = condBuckets(rec({ icare: 3, unfit: 2 }), 10)

  it('accepts a split within its buckets', () => {
    expect(condSplitCheck({ normal: 1, icare: 1, unfit: 0, repair: 0, onsite: 0 }, buckets))
      .toEqual({ ok: true })
  })

  it('rejects a negative quantity with the exact message', () => {
    const r = condSplitCheck({ icare: -1 }, buckets)
    expect(r.ok).toBe(false)
    expect(r.error).toBe('İcarədə: miqdar mənfi ola bilməz')
  })

  it('rejects exceeding a bucket with the exact message', () => {
    const r = condSplitCheck({ icare: 4 }, buckets)
    expect(r.ok).toBe(false)
    expect(r.error).toBe('İcarədə statuslu mal kifayət deyil. Mövcud: 3,00')
  })

  it('rejects an all-zero split', () => {
    expect(condSplitCheck(condSplitZero(), buckets))
      .toEqual({ ok: false, error: 'Ən azı bir tipdən miqdar göstərin' })
  })

  it('checks normal too, not only the markers', () => {
    const r = condSplitCheck({ normal: 99 }, buckets)
    expect(r.ok).toBe(false)
    expect(r.error).toContain('Normal')
  })

  it('formats the available figure exactly as nf(v, 2) does', () => {
    const b = condBuckets(rec({ icare: 1234.5 }), 99999)
    const r = condSplitCheck({ icare: 99999 }, b)
    expect(r.error).toContain(nf(1234.5, 2))
  })

  it('tolerates float noise at the bucket ceiling', () => {
    const b = condBuckets(rec({ icare: 0.3 }), 10)
    expect(condSplitCheck({ icare: 0.1 + 0.2 }, b).ok).toBe(true)
  })
})

describe('misc', () => {
  it('condKey matches the legacy map key', () => {
    expect(condKey('Elet', '0000001')).toBe('Elet|0000001')
  })
  it('SPLIT_UNSUPPORTED_MSG is the verbatim legacy text', () => {
    expect(SPLIT_UNSUPPORTED_MSG).toContain('sql/031 tətbiq edilməyib')
    expect(SPLIT_UNSUPPORTED_MSG).toContain('işarələr mənbədə qalardı')
  })
})
