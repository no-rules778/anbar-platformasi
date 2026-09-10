import { describe, it, expect } from 'vitest'
import {
  writeOffExportRows,
  writeOffReportPrice,
  sourceRows,
  SILINME_EXPORT_HEADER,
  SILINME_SOURCE_HEADER,
} from './writeOffExport'
import { writeOffUnitPrice } from './movementValuation'
import type { MovementFilterItem, MovementFilterRow } from './movementFilters'
import type { WriteoffValuationRow } from '../api/writeoffValuations.api'
import type { WriteoffAllocationRow } from '../api/writeoffAllocations.api'

/* I-9 — the separate Silinmə report's ROW builders.

   The workbook is not built here; `xlsWriteOffWorkbook.test.ts` proves the
   serialization. This suite proves what the cells CONTAIN, including the
   null-versus-zero distinction that decides whether a cell exists at all. */

const mov = (p: Partial<MovementFilterRow> = {}): MovementFilterRow => ({
  id: 'm1',
  type: 'Silinmə',
  item_code: 'C1',
  date: '2026-01-05',
  warehouse: 'Elet',
  partner: null,
  in_qty: null,
  out_qty: 10,
  price: 5,
  invoice_num: null,
  contract_num: null,
  note: null,
  doc_num: 'D-1',
  created_at: '2026-01-05T00:00:00Z',
  created_by: null,
  ...p,
})

const val = (p: Partial<WriteoffValuationRow> = {}): WriteoffValuationRow => ({
  movement_id: 'm1',
  source_amount: 100,
  known_amount: 100,
  unknown_qty: 0,
  final_amount: 100,
  valuation_method: 'fifo',
  override_reason: null,
  ...p,
})

const alloc = (p: Partial<WriteoffAllocationRow> = {}): WriteoffAllocationRow => ({
  writeoff_movement_id: 'm1',
  source_movement_id: 's1',
  source_doc_num_snapshot: 'SD-1',
  source_invoice_snapshot: 'INV-1',
  source_date_snapshot: '2025-12-01',
  qty: 4,
  price_status_snapshot: 'known',
  unit_price_snapshot: 25,
  source_amount_snapshot: 100,
  reversed_at: null,
  id: 'a1',
  created_at: '2026-01-05T00:00:00Z',
  ...p,
})

const items = (): Map<string, MovementFilterItem> =>
  new Map([['C1', { name: 'Sement', unit: 'kg', price: 3 }]])

const NO_VALS = new Map<string, WriteoffValuationRow>()
const NO_EMAILS = new Map<string, string>()

describe('SILINME headers', () => {
  it('carries the 17 legacy columns in the legacy order', () => {
    expect(SILINME_EXPORT_HEADER).toHaveLength(17)
    expect(SILINME_EXPORT_HEADER[0]).toBe('Sənəd №')
    expect(SILINME_EXPORT_HEADER[6]).toBe('Silinən miqdar')
    expect(SILINME_EXPORT_HEADER[7]).toBe('Yekun vahid qiyməti')
    expect(SILINME_EXPORT_HEADER[8]).toBe('Yekun məbləğ')
    expect(SILINME_EXPORT_HEADER[16]).toBe('Qeyd edən')
  })

  it('carries the 11 legacy source columns in the legacy order', () => {
    expect(SILINME_SOURCE_HEADER).toHaveLength(11)
    expect(SILINME_SOURCE_HEADER[0]).toBe('Silmə hərəkəti ID')
    expect(SILINME_SOURCE_HEADER[3]).toBe('Mənbə hərəkəti ID')
    expect(SILINME_SOURCE_HEADER[10]).toBe('Mənbə məbləği')
  })
})

/* THE CENTRAL PRICE CONTRACT. Every case below distinguishes this report's
   expression from the table helper it must NOT reuse. */
describe('writeOffReportPrice', () => {
  it('derives final / qty at four decimals when both are usable', () => {
    expect(writeOffReportPrice(3, 100, 5)).toBe(33.3333)
  })

  it('prefers the derived price over the row price', () => {
    expect(writeOffReportPrice(10, 100, 999)).toBe(10)
  })

  it('falls back to a POSITIVE row price when final is null', () => {
    expect(writeOffReportPrice(10, null, 7.5)).toBe(7.5)
  })

  it('returns NULL, not 0, for a MISSING price', () => {
    expect(writeOffReportPrice(10, null, null)).toBeNull()
    expect(writeOffReportPrice(10, null, undefined)).toBeNull()
  })

  it('returns NULL, not 0, for a ZERO price', () => {
    expect(writeOffReportPrice(10, null, 0)).toBeNull()
  })

  it('returns NULL for a NEGATIVE price — never the negative number', () => {
    expect(writeOffReportPrice(10, null, -4)).toBeNull()
  })

  it('returns NULL for a NaN price rather than NaN', () => {
    expect(writeOffReportPrice(10, null, Number.NaN)).toBeNull()
  })

  it('falls back when qty is 0, since final / 0 is not a price', () => {
    expect(writeOffReportPrice(0, 100, 8)).toBe(8)
    expect(writeOffReportPrice(0, 100, 0)).toBeNull()
  })

  it('treats a stored final of 0 as a REAL value, giving a price of 0', () => {
    /* final = 0 is not null, so the first branch applies and 0/qty = 0. This
       is a genuine zero unit price, distinct from the null the fallback
       produces — the report must not conflate them. */
    expect(writeOffReportPrice(10, 0, 5)).toBe(0)
  })

  /* MUTATION GUARD: this is the exact behavioural difference that makes the
     shared table helper unusable here. If someone "simplifies" this module by
     calling writeOffUnitPrice(), these expectations fail. */
  it('DIVERGES from writeOffUnitPrice() on every non-positive fallback', () => {
    const m = { id: 'm1', out_qty: 10, price: 0 }
    const v = { source: null, known: 0, unknownQty: 10, final: null, method: 'legacy', reason: '' }
    expect(writeOffUnitPrice(m, v)).toBe(0)
    expect(writeOffReportPrice(10, null, 0)).toBeNull()

    const neg = { id: 'm2', out_qty: 10, price: -4 }
    expect(writeOffUnitPrice(neg, v)).toBe(-4)
    expect(writeOffReportPrice(10, null, -4)).toBeNull()
  })
})

describe('writeOffExportRows', () => {
  it('keeps ONLY Silinmə rows', () => {
    const rows = writeOffExportRows(
      [mov(), mov({ id: 'm2', type: 'Satınalma' }), mov({ id: 'm3', type: 'Sahəyə' })],
      items(), NO_VALS, NO_EMAILS, null,
    )
    expect(rows.map((r) => r.movementId)).toEqual(['m1'])
  })

  it('reads name and unit from the nomenclature index', () => {
    const [r] = writeOffExportRows([mov()], items(), NO_VALS, NO_EMAILS, null)
    expect(r.name).toBe('Sement')
    expect(r.unit).toBe('kg')
  })

  it('leaves name and unit empty for an unknown code, rather than failing', () => {
    const [r] = writeOffExportRows([mov({ item_code: 'ZZ' })], items(), NO_VALS, NO_EMAILS, null)
    expect(r.name).toBe('')
    expect(r.unit).toBe('')
  })

  /* The warehouse asymmetry against the ORDINARY export, pinned deliberately. */
  it('writes the RAW warehouse value, NOT the whLabel() mapping', () => {
    const [r] = writeOffExportRows([mov({ warehouse: 'Elet' })], items(), NO_VALS, NO_EMAILS, null)
    expect(r.wh).toBe('Elet')
  })

  it('uses the stored valuation when one exists', () => {
    const vals = new Map([['m1', val({ final_amount: 250, source_amount: 250, known_amount: 250 })]])
    const [r] = writeOffExportRows([mov({ out_qty: 10 })], items(), vals, NO_EMAILS, null)
    expect(r.amount).toBe(250)
    expect(r.price).toBe(25)
    expect(r.valuation).toBe('fifo')
  })

  it('falls back to the legacy per-row valuation when none is stored', () => {
    const [r] = writeOffExportRows([mov({ out_qty: 10, price: 5 })], items(), NO_VALS, NO_EMAILS, null)
    expect(r.amount).toBe(50)
    expect(r.valuation).toBe('legacy')
    expect(r.unknownQty).toBe(0)
  })

  it('leaves an UNVALUED row null-priced with the whole quantity unknown', () => {
    const [r] = writeOffExportRows([mov({ out_qty: 10, price: 0 })], items(), NO_VALS, NO_EMAILS, null)
    expect(r.price).toBeNull()
    expect(r.amount).toBeNull()
    expect(r.sourceAmount).toBeNull()
    expect(r.knownAmount).toBe(0)
    expect(r.unknownQty).toBe(10)
  })

  it('keeps a stored final_amount of 0 as a real 0, not as null', () => {
    const vals = new Map([['m1', val({ final_amount: 0, source_amount: 0, known_amount: 0 })]])
    const [r] = writeOffExportRows([mov({ out_qty: 10 })], items(), vals, NO_EMAILS, null)
    expect(r.amount).toBe(0)
    expect(r.price).toBe(0)
  })

  it('keeps a ZERO quantity as a real 0', () => {
    const [r] = writeOffExportRows([mov({ out_qty: 0 })], items(), NO_VALS, NO_EMAILS, null)
    expect(r.qty).toBe(0)
  })

  it('coerces a missing quantity to 0 rather than NaN', () => {
    const [r] = writeOffExportRows([mov({ out_qty: null })], items(), NO_VALS, NO_EMAILS, null)
    expect(r.qty).toBe(0)
  })

  it('stringifies every text field, turning null into an empty string', () => {
    const [r] = writeOffExportRows(
      [mov({ doc_num: null, invoice_num: null, note: null, warehouse: null })],
      items(), NO_VALS, NO_EMAILS, null,
    )
    expect(r.doc).toBe('')
    expect(r.invoice).toBe('')
    expect(r.note).toBe('')
    expect(r.wh).toBe('')
  })

  it('maps «Qeyd edən» through recorderLabel, never the raw uuid', () => {
    const emails = new Map([['u-1', 'anbardar@x.az']])
    const [r] = writeOffExportRows([mov({ created_by: 'u-1' })], items(), NO_VALS, emails, null)
    expect(r.by).toBe('anbardar@x.az')

    const [r2] = writeOffExportRows([mov({ created_by: null })], items(), NO_VALS, emails, null)
    expect(r2.by).toBe('Excel idxalı')

    const [r3] = writeOffExportRows(
      [mov({ created_by: 'u-9' })], items(), NO_VALS, emails, { sbId: 'u-9', name: 'Admin' },
    )
    expect(r3.by).toBe('Admin')
  })

  it('carries the admin override reason through, defaulting to an empty string', () => {
    const vals = new Map([['m1', val({ override_reason: 'düzəliş' })]])
    const [r] = writeOffExportRows([mov()], items(), vals, NO_EMAILS, null)
    expect(r.overrideReason).toBe('düzəliş')

    const [r2] = writeOffExportRows([mov()], items(), NO_VALS, NO_EMAILS, null)
    expect(r2.overrideReason).toBe('')
  })

  it('handles an empty input without throwing', () => {
    expect(writeOffExportRows([], items(), NO_VALS, NO_EMAILS, null)).toEqual([])
  })
})

describe('sourceRows', () => {
  const parents = () => writeOffExportRows([mov()], items(), NO_VALS, NO_EMAILS, null)

  it('builds the 11 legacy columns, with doc and code from the PARENT', () => {
    const { rows } = sourceRows([alloc()], parents())
    expect(rows).toHaveLength(1)
    expect(rows[0]).toEqual([
      'm1', 'D-1', 'C1', 's1', 'SD-1', 'INV-1', '2025-12-01', 4, 'known', 25, 100,
    ])
  })

  /* MUTATION GUARD: dropping the reversed_at filter must fail here. */
  it('EXCLUDES reversed allocations', () => {
    const { rows, counts } = sourceRows(
      [alloc(), alloc({ id: 'a2', reversed_at: '2026-02-01T00:00:00Z' })],
      parents(),
    )
    expect(rows).toHaveLength(1)
    expect(counts.reversed).toBe(1)
    expect(counts.written).toBe(1)
  })

  it('excludes an allocation whose parent is outside the exported filter', () => {
    const { rows, counts } = sourceRows([alloc({ writeoff_movement_id: 'other' })], parents())
    expect(rows).toEqual([])
    expect(counts.outsideFilter).toBe(1)
    expect(counts.read).toBe(1)
    expect(counts.written).toBe(0)
  })

  it('counts an outside-filter parent WITHOUT treating it as an error', () => {
    /* The result is a plain rows/counts pair — no error field, no throw, no
       flag. Ordinary filtering must not be reported as an anomaly. */
    const res = sourceRows([alloc({ writeoff_movement_id: 'other' })], parents())
    expect(Object.keys(res).sort()).toEqual(['counts', 'rows'])
    expect(res.counts).toEqual({ read: 1, reversed: 0, outsideFilter: 1, written: 0 })
  })

  it('writes an EMPTY STRING, not null, for a missing price or amount', () => {
    const { rows } = sourceRows(
      [alloc({ unit_price_snapshot: null, source_amount_snapshot: null })],
      parents(),
    )
    expect(rows[0][9]).toBe('')
    expect(rows[0][10]).toBe('')
  })

  it('keeps a zero price and a zero amount as real numbers', () => {
    const { rows } = sourceRows(
      [alloc({ unit_price_snapshot: 0, source_amount_snapshot: 0 })],
      parents(),
    )
    expect(rows[0][9]).toBe(0)
    expect(rows[0][10]).toBe(0)
  })

  it('empties a null source movement id rather than printing "null"', () => {
    const { rows } = sourceRows(
      [alloc({ source_movement_id: null, source_doc_num_snapshot: null,
        source_invoice_snapshot: null, source_date_snapshot: null })],
      parents(),
    )
    expect(rows[0].slice(3, 7)).toEqual(['', '', '', ''])
  })

  it('preserves the ORDER in which allocations were read', () => {
    const { rows } = sourceRows(
      [alloc({ id: 'a1', qty: 1 }), alloc({ id: 'a2', qty: 2 }), alloc({ id: 'a3', qty: 3 })],
      parents(),
    )
    expect(rows.map((r) => r[7])).toEqual([1, 2, 3])
  })

  it('returns nothing for an empty allocation set', () => {
    const { rows, counts } = sourceRows([], parents())
    expect(rows).toEqual([])
    expect(counts).toEqual({ read: 0, reversed: 0, outsideFilter: 0, written: 0 })
  })
})
