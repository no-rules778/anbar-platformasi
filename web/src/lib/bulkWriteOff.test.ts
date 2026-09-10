import { describe, it, expect } from 'vitest'
import {
  bulkWriteOffRows, bulkWriteOffFiltered, bulkWriteOffSummary, bwSelectRow,
  type BulkRow,
} from './bulkWriteOff'

const itemBy = new Map([
  ['A', { code: 'A', name: 'Zəncir', unit: 'ədəd', price: 10 }],
  ['B', { code: 'B', name: 'Alət', unit: 'm', price: 0 }],
  ['0000001', { code: '0000001', name: 'Kabel', unit: 'ədəd', price: 5 }],
])
const cond = (icare = 0) => ({ unfit: 0, repair: 0, onsite: 0, icare })

describe('bulkWriteOffRows — M7-58', () => {
  const bal = [
    { w: 'Elet', c: 'A', q: 10 },
    { w: 'Elet', c: 'B', q: 4 },
    { w: 'Astara', c: 'A', q: 99 },
  ]

  it('returns positive-balance rows of the chosen warehouse only', () => {
    const rows = bulkWriteOffRows('Elet', bal, itemBy, [])
    expect(rows.map((r) => r.c).sort()).toEqual(['A', 'B'])
  })

  it('excludes zero and negative balances', () => {
    const rows = bulkWriteOffRows('Elet', [
      { w: 'Elet', c: 'A', q: 0 },
      { w: 'Elet', c: 'B', q: -3 },
    ], itemBy, [])
    expect(rows).toEqual([])
  })

  it('drops a code missing from the nomenclature', () => {
    const rows = bulkWriteOffRows('Elet', [{ w: 'Elet', c: 'ZZZ', q: 5 }], itemBy, [])
    expect(rows).toEqual([])
  })

  it('subtracts pending draft lines from availability', () => {
    const lines = [{ kind: 'out', w: 'Elet', c: 'A', q: 3 }] as never
    const rows = bulkWriteOffRows('Elet', bal, itemBy, lines)
    const a = rows.find((r) => r.c === 'A')!
    expect(a.bal).toBe(10)
    expect(a.pending).toBe(3)
    expect(a.avail).toBe(7)
  })

  it('ignores inbound, other-warehouse and other-item pending lines', () => {
    const lines = [
      { kind: 'in', w: 'Elet', c: 'A', q: 5 },
      { kind: 'out', w: 'Astara', c: 'A', q: 5 },
      { kind: 'out', w: 'Elet', c: 'B', q: 5 },
    ] as never
    const a = bulkWriteOffRows('Elet', bal, itemBy, lines).find((r) => r.c === 'A')!
    expect(a.avail).toBe(10)
  })

  it('drops a row whose availability is fully consumed by the draft', () => {
    const lines = [{ kind: 'out', w: 'Elet', c: 'A', q: 10 }] as never
    expect(bulkWriteOffRows('Elet', bal, itemBy, lines).map((r) => r.c)).toEqual(['B'])
  })

  it('sorts by name with the Azerbaijani collator', () => {
    const rows = bulkWriteOffRows('Elet', bal, itemBy, [])
    expect(rows.map((r) => r.name)).toEqual(['Alət', 'Zəncir'])
  })

  it('rounds availability to four decimals', () => {
    const lines = [{ kind: 'out', w: 'Elet', c: 'A', q: 0.00001 }] as never
    const a = bulkWriteOffRows('Elet', [{ w: 'Elet', c: 'A', q: 1 }], itemBy, lines)
      .find((r) => r.c === 'A')!
    expect(a.avail).toBe(1)
  })
})

describe('bulkWriteOffFiltered — M7-59', () => {
  const rows = bulkWriteOffRows(
    'Elet',
    [{ w: 'Elet', c: 'A', q: 1 }, { w: 'Elet', c: '0000001', q: 1 }],
    itemBy, [],
  )

  it('returns everything for an empty query', () => {
    expect(bulkWriteOffFiltered(rows, '').length).toBe(2)
    expect(bulkWriteOffFiltered(rows, '  ').length).toBe(2)
  })

  it('matches by name, case-insensitively', () => {
    expect(bulkWriteOffFiltered(rows, 'kabel').map((r) => r.c)).toEqual(['0000001'])
  })

  /* The code is compared as TEXT — a zero-padded code keeps its zeroes. */
  it('matches a zero-padded code as text', () => {
    expect(bulkWriteOffFiltered(rows, '0000001').map((r) => r.c)).toEqual(['0000001'])
    expect(bulkWriteOffFiltered(rows, '00000').map((r) => r.c)).toEqual(['0000001'])
  })

  it('returns nothing when neither field matches', () => {
    expect(bulkWriteOffFiltered(rows, 'yoxdur')).toEqual([])
  })
})

describe('bwSelectRow — M7-60', () => {
  const row: BulkRow = { c: 'A', name: 'Zəncir', unit: 'ədəd', price: 10, bal: 10, pending: 0, avail: 10 }

  it('an unmarked item takes the whole availability, with no split', () => {
    expect(bwSelectRow(row, cond(0), {})).toEqual({ sel: 10, split: null })
  })

  /* Both individual selection AND «select all» call this — two paths would let
     one skip the split and be blocked later as "bölgü göstərilməyib". */
  it('a marked item fills every bucket to its own maximum', () => {
    const p = bwSelectRow(row, cond(3), {})
    expect(p.split).not.toBeNull()
    expect(p.split!.icare).toBe(3)
    expect(p.split!.normal).toBe(7)
    expect(p.sel).toBe(10)
  })

  it('the selected total is always the sum of the buckets', () => {
    const p = bwSelectRow(row, cond(4), {})
    const sum = p.split!.normal + p.split!.icare + p.split!.unfit
      + p.split!.repair + p.split!.onsite
    expect(p.sel).toBe(sum)
  })

  it('honours pending buckets', () => {
    const p = bwSelectRow(row, cond(3), { icare: 2 })
    expect(p.split!.icare).toBe(1)
  })
})

describe('bulkWriteOffSummary — M7-63', () => {
  const rows: BulkRow[] = [
    { c: 'A', name: 'Zəncir', unit: 'ədəd', price: 10, bal: 10, pending: 0, avail: 10 },
  ]
  const base = {
    rows,
    split: new Map(),
    lots: new Map(),
    values: new Map(),
    condOf: () => null,
    condPendingOf: () => ({}),
    layerActive: false,
  }

  it('counts a ready row and its amount', () => {
    const s = bulkWriteOffSummary({ ...base, sel: new Map([['A', 4]]) })
    expect(s).toMatchObject({ n: 1, qty: 4, amount: 40 })
    expect(s.bad).toEqual([])
  })

  it('flags a code that is no longer available', () => {
    const s = bulkWriteOffSummary({ ...base, sel: new Map([['ZZZ', 1]]) })
    expect(s.bad).toEqual([{ code: 'ZZZ', why: 'mövcud deyil' }])
    expect(s.n).toBe(0)
  })

  it('flags a zero quantity', () => {
    const s = bulkWriteOffSummary({ ...base, sel: new Map([['A', 0]]) })
    expect(s.bad[0].why).toBe('miqdar sıfırdır')
  })

  it('flags a quantity above the balance', () => {
    const s = bulkWriteOffSummary({ ...base, sel: new Map([['A', 11]]) })
    expect(s.bad[0].why).toBe('qalıqdan çoxdur')
  })

  it('flags a marked item with no split', () => {
    const s = bulkWriteOffSummary({
      ...base, sel: new Map([['A', 4]]), condOf: () => cond(3),
    })
    expect(s.bad[0].why).toBe('tiplərə görə bölgü göstərilməyib')
  })

  it('flags a marked item whose split exceeds a bucket', () => {
    const s = bulkWriteOffSummary({
      ...base,
      sel: new Map([['A', 4]]),
      condOf: () => cond(3),
      split: new Map([['A', { normal: 0, icare: 9, unfit: 0, repair: 0, onsite: 0 }]]),
    })
    expect(s.bad[0].why).toContain('kifayət deyil')
  })

  it('accepts a marked item with a valid split', () => {
    const s = bulkWriteOffSummary({
      ...base,
      sel: new Map([['A', 4]]),
      condOf: () => cond(3),
      split: new Map([['A', { normal: 1, icare: 3, unfit: 0, repair: 0, onsite: 0 }]]),
    })
    expect(s.bad).toEqual([])
    expect(s.n).toBe(1)
  })

  it('with layers active, flags a missing lot', () => {
    const s = bulkWriteOffSummary({ ...base, sel: new Map([['A', 4]]), layerActive: true })
    expect(s.bad[0].why).toBe('mənbə partiyası seçilməyib')
  })

  it('with layers active, flags an allocation sum that differs from the quantity', () => {
    const s = bulkWriteOffSummary({
      ...base,
      sel: new Map([['A', 4]]),
      layerActive: true,
      lots: new Map([['A', { allocations: [{ layer_id: 'L1', qty: 3 }], sourceAmount: 30, revision: 'r1' }]]),
    })
    expect(s.bad[0].why).toBe('partiya cəmi miqdara bərabər deyil')
  })

  it('with layers active, flags a final amount with no reason', () => {
    const s = bulkWriteOffSummary({
      ...base,
      sel: new Map([['A', 4]]),
      layerActive: true,
      lots: new Map([['A', { allocations: [{ layer_id: 'L1', qty: 4 }], sourceAmount: 40, revision: 'r1' }]]),
      values: new Map([['A', { finalAmount: '99', reason: '  ' }]]),
    })
    expect(s.bad[0].why).toBe('məbləğ dəyişikliyinin səbəbi yoxdur')
  })

  it('accepts a final amount that carries a reason', () => {
    const s = bulkWriteOffSummary({
      ...base,
      sel: new Map([['A', 4]]),
      layerActive: true,
      lots: new Map([['A', { allocations: [{ layer_id: 'L1', qty: 4 }], sourceAmount: 40, revision: 'r1' }]]),
      values: new Map([['A', { finalAmount: '99', reason: 'razılaşdırılıb' }]]),
    })
    expect(s.bad).toEqual([])
  })

  it('lot checks are skipped entirely when layers are inactive', () => {
    const s = bulkWriteOffSummary({ ...base, sel: new Map([['A', 4]]), layerActive: false })
    expect(s.bad).toEqual([])
  })

  it('collects several bad rows', () => {
    const s = bulkWriteOffSummary({ ...base, sel: new Map([['ZZZ', 1], ['A', 0]]) })
    expect(s.bad).toHaveLength(2)
  })
})
