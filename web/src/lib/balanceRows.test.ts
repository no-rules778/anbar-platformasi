import { describe, expect, it } from 'vitest'
import { ALL_WAREHOUSES, CONDF, NO_WAREHOUSE, buildBalanceRows } from './balanceRows'
import type { CondRecord } from './condSplit'
import { condKey } from './condSplit'
import type { WarehouseBalance } from './itemIndex'
import type { ItemRow } from '../api/items.api'

/* M9-30…M9-35 plus the marker attachment they carry (M9-41…M9-43, M9-45) —
   index.html:2280-2324. */

const bal = (over: Partial<WarehouseBalance> = {}): WarehouseBalance => ({
  w: 'Elet', c: '0000001', in: 0, out: 0, n: 0, q: 0,
  last: '2026-01-01', first: '2026-01-01', price: 10, val: 0,
  name: 'Sement', unit: 'kq', ...over,
})

const item = (over: Partial<ItemRow> = {}): ItemRow => ({
  code: '0000001', name: 'Sement', unit: 'kq', price: 10, category: null, ...over,
})

const cond = (over: Partial<CondRecord> = {}): CondRecord => ({
  unfit: 0, repair: 0, onsite: 0, icare: 0, ...over,
})

const noConds = new Map<string, CondRecord>()

describe('separate mode — M9-30', () => {
  it('keeps one row per warehouse × item', () => {
    const rows = buildBalanceRows([
      bal({ w: 'Elet', c: '0000001', in: 10, q: 10 }),
      bal({ w: 'Astara', c: '0000001', in: 4, q: 4 }),
      bal({ w: 'Elet', c: '0000002', in: 7, q: 7 }),
    ], [], noConds, '')
    expect(rows).toHaveLength(3)
    expect(rows.map((r) => `${r.w}|${r.c}`)).toEqual([
      'Elet|0000001', 'Astara|0000001', 'Elet|0000002',
    ])
  })

  it('does not mutate the source IX.bal rows', () => {
    const source = [bal({ in: 10, q: 10, val: 100 })]
    const snapshot = JSON.parse(JSON.stringify(source))
    const rows = buildBalanceRows(source, [], noConds, '')
    rows[0].cUnfit = 99
    rows[0].q = -1
    expect(source).toEqual(snapshot)
  })

  it('carries `first` on rows sourced from IX.bal', () => {
    const rows = buildBalanceRows([bal({ first: '2025-05-05' })], [], noConds, '')
    expect(rows[0].first).toBe('2025-05-05')
  })
})

describe('__sum mode — M9-31, M9-32', () => {
  it('sums in/out/n across warehouses and takes the maximum last date', () => {
    const rows = buildBalanceRows([
      bal({ w: 'Elet', in: 10, out: 2, n: 3, last: '2026-01-05' }),
      bal({ w: 'Astara', in: 5, out: 1, n: 2, last: '2026-03-09' }),
    ], [], noConds, '__sum')
    expect(rows).toHaveLength(1)
    expect(rows[0].in).toBe(15)
    expect(rows[0].out).toBe(3)
    expect(rows[0].n).toBe(5)
    expect(rows[0].last).toBe('2026-03-09')
  })

  /* The load-bearing one. An implementation that sums the per-warehouse `val`
     instead of recomputing it from the summed quantities passes the in/out
     assertions above and fails here: each source `val` was rounded through its
     own `q`, so the summed figure drifts. */
  it('recomputes q and val AFTER summing — summing val instead diverges', () => {
    const rows = buildBalanceRows([
      bal({ w: 'Elet', in: 1 / 3, out: 0, q: 0.3333, val: 3.333, price: 10 }),
      bal({ w: 'Astara', in: 1 / 3, out: 0, q: 0.3333, val: 3.333, price: 10 }),
    ], [], noConds, '__sum')
    const summedVal = 3.333 + 3.333
    expect(rows[0].q).toBe(0.6667)
    expect(rows[0].val).toBe(6.667)
    expect(rows[0].val).not.toBe(summedVal)
  })

  it('applies the 4-decimal q rounding rather than a raw float subtraction', () => {
    const rows = buildBalanceRows([
      bal({ w: 'Elet', in: 0.3, out: 0 }),
      bal({ w: 'Astara', in: 0, out: 0.1 }),
    ], [], noConds, '__sum')
    expect(0.3 - 0.1).not.toBe(0.2)
    expect(rows[0].q).toBe(0.2)
  })

  it('labels every aggregate row «bütün anbarlar»', () => {
    const rows = buildBalanceRows([
      bal({ w: 'Elet' }), bal({ w: 'Astara' }),
    ], [], noConds, '__sum')
    expect(rows[0].w).toBe(ALL_WAREHOUSES)
    expect(rows[0].w).toBe('bütün anbarlar')
  })

  it('treats a missing price as 0 when valuing', () => {
    const rows = buildBalanceRows([bal({ in: 5, price: 0 })], [], noConds, '__sum')
    expect(rows[0].val).toBe(0)
    expect(Number.isNaN(rows[0].val)).toBe(false)
  })
})

describe('named warehouse — M9-33', () => {
  it('keeps only rows of that warehouse', () => {
    const rows = buildBalanceRows([
      bal({ w: 'Elet', c: '0000001' }),
      bal({ w: 'Astara', c: '0000001' }),
      bal({ w: 'Elet', c: '0000002' }),
    ], [], noConds, 'Elet')
    expect(rows).toHaveLength(2)
    expect(rows.every((r) => r.w === 'Elet')).toBe(true)
  })

  it('returns nothing for a warehouse with no rows', () => {
    const rows = buildBalanceRows([bal({ w: 'Elet' })], [], noConds, 'Xocahesen')
    expect(rows).toHaveLength(0)
  })
})

describe('no-movement catalogue rows — M9-34, M9-35', () => {
  it('appends them with zeros and «—» in separate mode', () => {
    const rows = buildBalanceRows(
      [bal({ c: '0000001', in: 10, q: 10 })],
      [item({ code: '0000001' }), item({ code: '0000002', name: 'Mismar', unit: 'ədəd', price: 3 })],
      noConds, '',
    )
    expect(rows).toHaveLength(2)
    const nomv = rows.find((r) => r.c === '0000002')!
    expect(nomv.nomv).toBe(1)
    expect(nomv.w).toBe(NO_WAREHOUSE)
    expect(nomv.w).toBe('—')
    expect(nomv.name).toBe('Mismar')
    expect(nomv.unit).toBe('ədəd')
    expect(nomv.price).toBe(3)
    expect([nomv.in, nomv.out, nomv.n, nomv.q, nomv.val]).toEqual([0, 0, 0, 0, 0])
    expect(nomv.last).toBe('')
  })

  it('labels them «bütün anbarlar» in __sum mode', () => {
    const rows = buildBalanceRows(
      [bal({ c: '0000001' })],
      [item({ code: '0000002' })],
      noConds, '__sum',
    )
    expect(rows.find((r) => r.c === '0000002')!.w).toBe(ALL_WAREHOUSES)
  })

  it('never appends them for a specific warehouse — M9-35', () => {
    const rows = buildBalanceRows(
      [bal({ w: 'Elet', c: '0000001' })],
      [item({ code: '0000001' }), item({ code: '0000002' })],
      noConds, 'Elet',
    )
    expect(rows).toHaveLength(1)
    expect(rows.some((r) => r.nomv)).toBe(false)
  })

  it('does not append an item that already has a movement row', () => {
    const rows = buildBalanceRows(
      [bal({ w: 'Elet', c: '0000001' }), bal({ w: 'Astara', c: '0000001' })],
      [item({ code: '0000001' })],
      noConds, '',
    )
    expect(rows).toHaveLength(2)
    expect(rows.some((r) => r.nomv)).toBe(false)
  })

  it('marks a moved row with no `nomv` flag at all', () => {
    const rows = buildBalanceRows([bal({ c: '0000001' })], [item()], noConds, '')
    expect(rows[0].nomv).toBeUndefined()
  })

  it('gives a no-movement row no `first` key', () => {
    const rows = buildBalanceRows([], [item({ code: '0000002' })], noConds, '')
    expect(rows[0].first).toBeUndefined()
  })

  it('treats null unit and price as «» and 0', () => {
    const rows = buildBalanceRows(
      [], [item({ code: '0000002', unit: null, price: null })], noConds, '',
    )
    expect(rows[0].unit).toBe('')
    expect(rows[0].price).toBe(0)
  })
})

describe('condition markers — M9-41, M9-42, M9-43, M9-45', () => {
  it('attaches by condOf(w, c) outside __sum', () => {
    const conds = new Map([
      [condKey('Elet', '0000001'), cond({ unfit: 2, repair: 1, onsite: 3, icare: 4 })],
      [condKey('Astara', '0000001'), cond({ unfit: 9 })],
    ])
    const rows = buildBalanceRows([bal({ w: 'Elet', c: '0000001' })], [], conds, 'Elet')
    expect(rows[0].cUnfit).toBe(2)
    expect(rows[0].cRepair).toBe(1)
    expect(rows[0].cOnsite).toBe(3)
    expect(rows[0].cIcare).toBe(4)
  })

  it('does not borrow another warehouse’s markers', () => {
    const conds = new Map([[condKey('Astara', '0000001'), cond({ unfit: 9 })]])
    const rows = buildBalanceRows([bal({ w: 'Elet', c: '0000001' })], [], conds, 'Elet')
    expect(rows[0].cUnfit).toBe(0)
  })

  it('sums markers across warehouses by code in __sum — M9-43', () => {
    const conds = new Map([
      [condKey('Elet', '0000001'), cond({ unfit: 2, icare: 1 })],
      [condKey('Astara', '0000001'), cond({ unfit: 3, icare: 5 })],
      [condKey('Elet', '0000002'), cond({ unfit: 7 })],
    ])
    const rows = buildBalanceRows([
      bal({ w: 'Elet', c: '0000001' }), bal({ w: 'Astara', c: '0000001' }),
    ], [], conds, '__sum')
    expect(rows[0].cUnfit).toBe(5)
    expect(rows[0].cIcare).toBe(6)
  })

  /* M9-41 — the markers are display-only. This fails if an implementation
     ever nets them out of the balance. */
  it('never alters q or val', () => {
    const conds = new Map([[condKey('Elet', '0000001'), cond({ unfit: 4, icare: 3 })]])
    const rows = buildBalanceRows(
      [bal({ w: 'Elet', c: '0000001', in: 10, q: 10, val: 100 })], [], conds, 'Elet',
    )
    expect(rows[0].q).toBe(10)
    expect(rows[0].val).toBe(100)
  })

  /* M9-45 — set_stock_condition only warns; nothing here clamps. */
  it('keeps a marker that exceeds the balance', () => {
    const conds = new Map([[condKey('Elet', '0000001'), cond({ unfit: 50 })]])
    const rows = buildBalanceRows(
      [bal({ w: 'Elet', c: '0000001', in: 5, q: 5 })], [], conds, 'Elet',
    )
    expect(rows[0].cUnfit).toBe(50)
    expect(rows[0].q).toBe(5)
  })

  it('leaves markers at 0 on a no-movement row with no condition', () => {
    const rows = buildBalanceRows([], [item({ code: '0000002' })], noConds, '')
    expect([rows[0].cUnfit, rows[0].cRepair, rows[0].cOnsite, rows[0].cIcare])
      .toEqual([0, 0, 0, 0])
  })

  it('maps every condition key to its row field via CONDF', () => {
    const conds = new Map([
      [condKey('Elet', '0000001'), cond({ unfit: 1, repair: 2, onsite: 3, icare: 4 })],
    ])
    const rows = buildBalanceRows([bal({ w: 'Elet', c: '0000001' })], [], conds, 'Elet')
    expect(rows[0][CONDF.unfit]).toBe(1)
    expect(rows[0][CONDF.repair]).toBe(2)
    expect(rows[0][CONDF.onsite]).toBe(3)
    expect(rows[0][CONDF.icare]).toBe(4)
  })
})
