import { describe, it, expect } from 'vitest'
import {
  BALANCE_EXPORT_NAME,
  CURRENT_EXPORT_HEADER,
  CURRENT_TABLE_HEADER,
  currentBalanceExportMatrix,
  initialBalanceExportMatrix,
  initialExportHeader,
  initialTableHeader,
} from './balanceExport'
import { COND_COLS } from './condSplit'
import type { BalanceRow } from './balanceRows'
import type { InitialBalanceRow } from './initialBalance'
import { fmtD, nf } from './format'

/* M9-110…M9-116, M9-110a, M9-111 — index.html:2374-2377 and 2276-2277. */

const row = (over: Partial<BalanceRow> = {}): BalanceRow => ({
  w: 'Ələt', c: '0000001', name: 'Nasos', unit: 'ədəd', price: 12.5,
  in: 10, out: 3, n: 2, q: 7, val: 87.5, last: '2026-09-01',
  cUnfit: 0, cRepair: 0, cOnsite: 0, cIcare: 0,
  ...over,
})

const opening = (over: Partial<InitialBalanceRow> = {}): InitialBalanceRow => ({
  c: '0000001', name: 'Nasos', w: 'Ələt', unit: 'ədəd',
  initial_qty: 5, current_qty: 2, opening_warehouse: 'Ələt',
  opening_date: '2026-01-15', last: '2026-09-01',
  ...over,
})

describe('current-view export header (M9-110)', () => {
  it('is the exact 14-column legacy order', () => {
    expect(CURRENT_EXPORT_HEADER).toEqual([
      'Anbar', 'Kod', 'Malın adı', 'Ölçü', 'Mədaxil', 'Məxaric', 'Qalıq',
      'Yararsız', 'Təmirə ehtiyaclı', 'Sahədə', 'İcarədə',
      'Vahid qiyməti', 'Dəyər', 'Son hərəkət',
    ])
    expect(CURRENT_EXPORT_HEADER).toHaveLength(14)
  })

  /* The four titles come FROM the array, at positions 7..10 — a hand-typed
     list would not follow a future COND_COLS change. */
  it('generates the four condition titles from COND_COLS, in COND_COLS order', () => {
    expect(CURRENT_EXPORT_HEADER.slice(7, 11)).toEqual(COND_COLS.map((c) => c.t))
  })
})

/* M9-110a — the TABLE and the EXPORT have DIFFERENT first three columns and
   both are ported as-is. This test exists so the two cannot be "tidied" into
   one order: it fails if either is changed to match the other. */
describe('table-vs-export column order (M9-110a)', () => {
  it('the table begins Kod · Malın adı · Anbar · Ölçü', () => {
    expect(CURRENT_TABLE_HEADER.slice(0, 4)).toEqual(['Kod', 'Malın adı', 'Anbar', 'Ölçü'])
  })

  it('the export begins Anbar · Kod · Malın adı · Ölçü', () => {
    expect(CURRENT_EXPORT_HEADER.slice(0, 4)).toEqual(['Anbar', 'Kod', 'Malın adı', 'Ölçü'])
  })

  it('the two orders are the same 14 fields and are NOT equal', () => {
    expect([...CURRENT_TABLE_HEADER].sort()).toEqual([...CURRENT_EXPORT_HEADER].sort())
    expect(CURRENT_TABLE_HEADER).not.toEqual(CURRENT_EXPORT_HEADER)
    /* From «Mədaxil» on the two agree — only the first three differ. */
    expect(CURRENT_TABLE_HEADER.slice(4)).toEqual(CURRENT_EXPORT_HEADER.slice(4))
  })
})

describe('currentBalanceExportMatrix — cell rules (2375-2377)', () => {
  it('row 0 is the export header and each body row has 14 cells', () => {
    const m = currentBalanceExportMatrix([row()])
    expect(m[0]).toEqual([...CURRENT_EXPORT_HEADER])
    expect(m).toHaveLength(2)
    expect(m[1]).toHaveLength(14)
  })

  it('lays the cells out in the export order, not the table order', () => {
    const m = currentBalanceExportMatrix([row()])
    /* Anbar first, then Kod — the export order. */
    expect(m[1].slice(0, 4)).toEqual(['Ələt', '0000001', 'Nasos', 'ədəd'])
  })

  /* M9-113 — warehouse cells pass through whLabel(): the DISPLAY alias goes
     into the file while the stored key is untouched. */
  it('applies the warehouse display alias', () => {
    const m = currentBalanceExportMatrix([row({ w: 'Xocahəsən' })])
    expect(m[1][0]).toBe('Xocəsən')
  })

  it('passes the synthetic «bütün anbarlar» and «—» warehouses through unchanged', () => {
    const m = currentBalanceExportMatrix([row({ w: 'bütün anbarlar' }), row({ w: '—' })])
    expect(m[1][0]).toBe('bütün anbarlar')
    expect(m[2][0]).toBe('—')
  })

  /* NO locale conversion: quantities are RAW numbers, not `nf()` strings.
     1234.5 must stay 1234.5, not become «1.234,5». */
  it('exports Mədaxil / Məxaric / Qalıq as raw numbers, never nf() strings', () => {
    const m = currentBalanceExportMatrix([row({ in: 1234.5, out: 0.25, q: 1234.25 })])
    expect(m[1][4]).toBe(1234.5)
    expect(m[1][5]).toBe(0.25)
    expect(m[1][6]).toBe(1234.25)
    expect(m[1][4]).not.toBe(nf(1234.5, 2))
  })

  it('exports the four condition markers from CONDF, `|| 0` for an unmarked cell', () => {
    const m = currentBalanceExportMatrix([row({ cUnfit: 1.5, cRepair: 0, cOnsite: 2, cIcare: 0.01 })])
    expect(m[1].slice(7, 11)).toEqual([1.5, 0, 2, 0.01])
  })

  /* M9-114 — `b.price || ''`: a priceless row exports an EMPTY cell, not 0.
     A 0 would sum into a spreadsheet total; an empty cell does not. */
  it('exports an empty price cell for a priceless row, not 0', () => {
    const m = currentBalanceExportMatrix([row({ price: 0 })])
    expect(m[1][11]).toBe('')
    expect(m[1][11]).not.toBe(0)
  })

  it('exports the price itself when present', () => {
    const m = currentBalanceExportMatrix([row({ price: 12.5 })])
    expect(m[1][11]).toBe(12.5)
  })

  /* M9-115 — `val.toFixed(2)`: a 2-dp STRING, which `toNum()` inside `xls()`
     converts back to a number. The exact legacy cell is the string. */
  it('exports Dəyər as val.toFixed(2)', () => {
    expect(currentBalanceExportMatrix([row({ val: 87.5 })])[1][12]).toBe('87.50')
    expect(currentBalanceExportMatrix([row({ val: 1 / 3 })])[1][12]).toBe('0.33')
    expect(currentBalanceExportMatrix([row({ val: 0 })])[1][12]).toBe('0.00')
  })

  /* M9-116 — RAW ISO date, never fmtD(). */
  it('exports Son hərəkət as the raw ISO date, not DD.MM.YYYY', () => {
    const m = currentBalanceExportMatrix([row({ last: '2026-09-01' })])
    expect(m[1][13]).toBe('2026-09-01')
    expect(m[1][13]).not.toBe(fmtD('2026-09-01'))
  })

  it('exports an empty last date for a no-movement row', () => {
    const m = currentBalanceExportMatrix([row({ last: '', nomv: 1, w: '—' })])
    expect(m[1][13]).toBe('')
  })

  /* M9-112 — the COMPLETE set. The matrix cannot enforce that the caller
     passed the full set, but it must never cap on its own. */
  it('exports every row it is given, above the 3000-row display cap', () => {
    const rows = Array.from({ length: 3001 }, (_, i) => row({ c: String(i) }))
    expect(currentBalanceExportMatrix(rows)).toHaveLength(3002)
  })

  it('exports a header-only matrix for an empty set', () => {
    expect(currentBalanceExportMatrix([])).toEqual([[...CURRENT_EXPORT_HEADER]])
  })
})

describe('«Əvvələ qalıq» headers (M9-111, M9-80)', () => {
  it('export header is the exact 8-column legacy order with the mode label', () => {
    expect(initialExportHeader('initial')).toEqual([
      'Anbar', 'Kod', 'Malın adı', 'Ölçü', 'İlkin miqdar',
      'İlk mənbə anbar', 'Əvvələ qalıq tarixi', 'Son hərəkət',
    ])
    expect(initialExportHeader('current')[4]).toBe('Cari qalıq')
    expect(initialExportHeader('current')).toHaveLength(8)
  })

  /* M9-111 — NOT the table's order. */
  it('table header begins Kod · Malın adı · Anbar; export begins Anbar · Kod · Malın adı', () => {
    expect(initialTableHeader('initial').slice(0, 3)).toEqual(['Kod', 'Malın adı', 'Anbar'])
    expect(initialExportHeader('initial').slice(0, 3)).toEqual(['Anbar', 'Kod', 'Malın adı'])
    expect(initialTableHeader('initial')).not.toEqual(initialExportHeader('initial'))
    expect([...initialTableHeader('initial')].sort()).toEqual([...initialExportHeader('initial')].sort())
  })

  it('the table quantity column header equals the active mode label (M9-78)', () => {
    expect(initialTableHeader('initial')[4]).toBe('İlkin miqdar')
    expect(initialTableHeader('current')[4]).toBe('Cari qalıq')
  })
})

describe('initialBalanceExportMatrix — cell rules (2277)', () => {
  it('row 0 is the mode-specific export header and each body row has 8 cells', () => {
    const m = initialBalanceExportMatrix([opening()], 'initial')
    expect(m[0]).toEqual(initialExportHeader('initial'))
    expect(m[1]).toHaveLength(8)
  })

  it('exports the ACTIVE mode quantity — initial_qty in «İlkin miqdar», current_qty in «Cari qalıq»', () => {
    const r = opening({ initial_qty: 5, current_qty: 2 })
    expect(initialBalanceExportMatrix([r], 'initial')[1][4]).toBe(5)
    expect(initialBalanceExportMatrix([r], 'current')[1][4]).toBe(2)
  })

  it('exports the quantity as a raw number, `|| 0` for an absent value', () => {
    expect(initialBalanceExportMatrix([opening({ initial_qty: 1234.5 })], 'initial')[1][4]).toBe(1234.5)
    expect(initialBalanceExportMatrix([opening({ current_qty: 0 })], 'current')[1][4]).toBe(0)
  })

  /* M9-113 — BOTH warehouse cells pass through whLabel(). */
  it('applies the display alias to the warehouse AND to opening_warehouse', () => {
    const m = initialBalanceExportMatrix(
      [opening({ w: 'Xocahəsən', opening_warehouse: 'Xocahəsən' })],
      'initial',
    )
    expect(m[1][0]).toBe('Xocəsən')
    expect(m[1][5]).toBe('Xocəsən')
  })

  it('exports an empty string for a missing opening_warehouse, not «—»', () => {
    const m = initialBalanceExportMatrix([opening({ opening_warehouse: undefined })], 'initial')
    expect(m[1][5]).toBe('')
  })

  /* M9-116 — RAW ISO dates in both date columns. */
  it('exports opening_date and last as raw ISO, never fmtD()', () => {
    const m = initialBalanceExportMatrix(
      [opening({ opening_date: '2026-01-15', last: '2026-09-01' })],
      'initial',
    )
    expect(m[1][6]).toBe('2026-01-15')
    expect(m[1][7]).toBe('2026-09-01')
    expect(m[1][6]).not.toBe(fmtD('2026-01-15'))
  })

  it('exports every row it is given, above the display cap (M9-112)', () => {
    const rows = Array.from({ length: 3001 }, (_, i) => opening({ c: String(i) }))
    expect(initialBalanceExportMatrix(rows, 'initial')).toHaveLength(3002)
  })
})

describe('filename base (M9-117)', () => {
  it('is anbar_qaliqlari — xls() appends the date and extension', () => {
    expect(BALANCE_EXPORT_NAME).toBe('anbar_qaliqlari')
  })
})
