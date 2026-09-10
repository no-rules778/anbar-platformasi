import { describe, it, expect, beforeEach, vi } from 'vitest'
import * as XLSX from 'xlsx'

/* I-9 — the Silinmə report through the REAL serializer.

   Follows the I-8 pattern (`movementExportWorkbook.test.ts`): only the final
   download boundary, `XLSX.writeFile`, is intercepted. `aoa_to_sheet`,
   `book_new`, `book_append_sheet`, `encode_cell`, `encode_range` and the
   serializer all run for real, and every assertion below is made against bytes
   that went through the xlsx writer AND reader — not against an intermediate
   object.

   That matters more here than for the ordinary export, because this report's
   whole contract is per-CELL: a text-formatted code, an OMITTED cell that must
   not become a zero, and a conditional second sheet. An object-level assertion
   could pass while the serialized workbook carried none of it.

   WHAT THIS DOES NOT PROVE: it is not live verification and not visual Excel
   compatibility. SheetJS reading its own output confirms the workbook is
   well-formed and that cell types survive a round trip; it says nothing about
   how Microsoft Excel renders widths, and nothing about live data. */

const cap: { wb: XLSX.WorkBook | null; filename: string; calls: number } = {
  wb: null, filename: '', calls: 0,
}

vi.mock('xlsx', async (orig) => {
  const actual = await orig<typeof import('xlsx')>()
  return {
    ...actual,
    writeFile: (wb: XLSX.WorkBook, filename: string) => {
      cap.wb = wb
      cap.filename = filename
      cap.calls += 1
    },
  }
})

import { xlsWriteOff, MAIN_SHEET_NAME, SOURCE_SHEET_NAME } from './xlsWriteOff'
import {
  writeOffExportRows, sourceRows, SILINME_EXPORT_HEADER, SILINME_SOURCE_HEADER,
  type WriteOffExportRow, type WriteOffSourceRow,
} from './writeOffExport'
import type { MovementFilterItem, MovementFilterRow } from './movementFilters'
import type { WriteoffAllocationRow } from '../api/writeoffAllocations.api'
import type { WriteoffValuationRow } from '../api/writeoffValuations.api'

beforeEach(() => { cap.wb = null; cap.filename = ''; cap.calls = 0 })

/** Round-trips the captured workbook through real bytes. */
function roundTrip(): XLSX.WorkBook {
  const buf = XLSX.write(cap.wb!, { bookType: 'xlsx', type: 'array' })
  return XLSX.read(buf, { type: 'array' })
}

const row = (p: Partial<WriteOffExportRow> = {}): WriteOffExportRow => ({
  movementId: 'm1', doc: 'D-1', date: '2026-01-05', wh: 'Elet', code: 'C1',
  name: 'Sement', unit: 'kg', qty: 10, price: 5, amount: 50,
  sourceAmount: 50, knownAmount: 50, unknownQty: 0, valuation: 'fifo',
  overrideReason: '', invoice: 'INV-1', note: '', by: 'admin@x.az', ...p,
})

const src = (p: Partial<WriteoffAllocationRow> = {}): WriteoffAllocationRow => ({
  writeoff_movement_id: 'm1', source_movement_id: 's1',
  source_doc_num_snapshot: 'SD-1', source_invoice_snapshot: 'INV-9',
  source_date_snapshot: '2025-12-01', qty: 4, price_status_snapshot: 'known',
  unit_price_snapshot: 25, source_amount_snapshot: 100, reversed_at: null,
  id: 'a1', created_at: '2026-01-05T00:00:00Z', ...p,
})

const cell = (ws: XLSX.WorkSheet, a: string): XLSX.CellObject | undefined =>
  ws[a] as XLSX.CellObject | undefined

describe('the workbook and its filename', () => {
  it('writes exactly one file, named Silinme_hesabati_<date>.xlsx', () => {
    xlsWriteOff([row()], [])
    expect(cap.calls).toBe(1)
    expect(cap.filename).toMatch(/^Silinme_hesabati_\d{4}-\d{2}-\d{2}\.xlsx$/)
  })

  it('names the first sheet «Silinmə hesabatı»', () => {
    xlsWriteOff([row()], [])
    expect(roundTrip().SheetNames[0]).toBe(MAIN_SHEET_NAME)
    expect(MAIN_SHEET_NAME).toBe('Silinmə hesabatı')
  })

  it('writes the 17-column header verbatim, surviving serialization', () => {
    xlsWriteOff([row()], [])
    const ws = roundTrip().Sheets[MAIN_SHEET_NAME]
    const header = SILINME_EXPORT_HEADER.map((_, c) =>
      cell(ws, XLSX.utils.encode_cell({ r: 0, c }))?.v)
    expect(header).toEqual(SILINME_EXPORT_HEADER)
  })
})

describe('text-formatted identifiers survive as TEXT', () => {
  /* MUTATION: writing these as number cells (what the shared `xls()` writer's
     toNum() would do) turns 0000001 into 1 and loses the leading zeros —
     R-F9. This is why lib/xls.ts is not reused. */
  it('keeps a zero-padded Kod as a string, not the number 1', () => {
    xlsWriteOff([row({ code: '0000001' })], [])
    const c = cell(roundTrip().Sheets[MAIN_SHEET_NAME], 'D2')!
    expect(c.t).toBe('s')
    expect(c.v).toBe('0000001')
    expect(c.v).not.toBe(1)
  })

  it('keeps a zero-padded Sənəd № as a string', () => {
    xlsWriteOff([row({ doc: '00123' })], [])
    const c = cell(roundTrip().Sheets[MAIN_SHEET_NAME], 'A2')!
    expect(c.t).toBe('s')
    expect(c.v).toBe('00123')
  })

  it('keeps a zero-padded Qaimə № as a string', () => {
    xlsWriteOff([row({ invoice: '0009' })], [])
    const c = cell(roundTrip().Sheets[MAIN_SHEET_NAME], 'O2')!
    expect(c.t).toBe('s')
    expect(c.v).toBe('0009')
  })

  it('carries the @ text format on those three cells in the built workbook', () => {
    xlsWriteOff([row({ code: '0000001', doc: '00123', invoice: '0009' })], [])
    const ws = cap.wb!.Sheets[MAIN_SHEET_NAME]
    for (const a of ['A2', 'D2', 'O2']) expect((cell(ws, a) as { z?: string }).z).toBe('@')
  })
})

describe('an OMITTED cell is absent — never 0 and never an empty string', () => {
  /* MUTATION: writing 0 for a null price/amount. A 0 reads as a genuine price
     of zero and sums into a spreadsheet total; an absent cell does not. */
  it('omits price and amount entirely when both are null', () => {
    xlsWriteOff([row({ price: null, amount: null })], [])
    const ws = roundTrip().Sheets[MAIN_SHEET_NAME]
    expect(cell(ws, 'H2')).toBeUndefined()
    expect(cell(ws, 'I2')).toBeUndefined()
  })

  it('omits the three valuation-breakdown cells when null', () => {
    xlsWriteOff([row({ sourceAmount: null, knownAmount: null, unknownQty: null })], [])
    const ws = roundTrip().Sheets[MAIN_SHEET_NAME]
    expect(cell(ws, 'J2')).toBeUndefined()
    expect(cell(ws, 'K2')).toBeUndefined()
    expect(cell(ws, 'L2')).toBeUndefined()
  })

  it('omits doc, override reason, invoice and note when falsy', () => {
    xlsWriteOff([row({ doc: '', overrideReason: '', invoice: '', note: '' })], [])
    const ws = roundTrip().Sheets[MAIN_SHEET_NAME]
    for (const a of ['A2', 'N2', 'O2', 'P2']) expect(cell(ws, a)).toBeUndefined()
  })

  it('WRITES a real zero amount, which is not the same as an absent one', () => {
    xlsWriteOff([row({ amount: 0, price: 0 })], [])
    const ws = roundTrip().Sheets[MAIN_SHEET_NAME]
    expect(cell(ws, 'H2')!.v).toBe(0)
    expect(cell(ws, 'I2')!.v).toBe(0)
    expect(cell(ws, 'I2')!.t).toBe('n')
  })

  it('ALWAYS writes qty, including a real 0', () => {
    xlsWriteOff([row({ qty: 0 })], [])
    const c = cell(roundTrip().Sheets[MAIN_SHEET_NAME], 'G2')!
    expect(c.t).toBe('n')
    expect(c.v).toBe(0)
  })

  it('always writes «Qeyd edən» and the valuation method', () => {
    xlsWriteOff([row({ valuation: '' })], [])
    const ws = roundTrip().Sheets[MAIN_SHEET_NAME]
    expect(cell(ws, 'Q2')!.v).toBe('admin@x.az')
    expect(cell(ws, 'M2')!.v).toBe('')
  })

  it('writes numbers as numeric cells, not as text', () => {
    xlsWriteOff([row({ qty: 10, price: 5, amount: 50 })], [])
    const ws = roundTrip().Sheets[MAIN_SHEET_NAME]
    for (const a of ['G2', 'H2', 'I2']) expect(cell(ws, a)!.t).toBe('n')
  })
})

describe('«Mənbə partiyalar» is conditional', () => {
  it('produces a SINGLE sheet when there are no allocations', () => {
    xlsWriteOff([row()], [])
    const wb = roundTrip()
    expect(wb.SheetNames).toEqual([MAIN_SHEET_NAME])
    expect(wb.SheetNames).not.toContain(SOURCE_SHEET_NAME)
  })

  it('appends the second sheet, in order, when allocations exist', () => {
    const parents = [row()]
    const { rows } = sourceRows([src()], parents)
    xlsWriteOff(parents, rows)
    expect(roundTrip().SheetNames).toEqual([MAIN_SHEET_NAME, SOURCE_SHEET_NAME])
  })

  it('writes the 11-column source header and the legacy column order', () => {
    const parents = [row({ doc: 'D-1', code: 'C1' })]
    const { rows } = sourceRows([src()], parents)
    xlsWriteOff(parents, rows)
    const ws = roundTrip().Sheets[SOURCE_SHEET_NAME]
    const header = SILINME_SOURCE_HEADER.map((_, c) =>
      cell(ws, XLSX.utils.encode_cell({ r: 0, c }))?.v)
    expect(header).toEqual(SILINME_SOURCE_HEADER)
    const body = SILINME_SOURCE_HEADER.map((_, c) =>
      cell(ws, XLSX.utils.encode_cell({ r: 1, c }))?.v)
    expect(body).toEqual([
      'm1', 'D-1', 'C1', 's1', 'SD-1', 'INV-9', '2025-12-01', 4, 'known', 25, 100,
    ])
  })

  it('does NOT repeat the parent final amount on the source sheet', () => {
    const parents = [row({ amount: 50 })]
    const { rows } = sourceRows([src()], parents)
    xlsWriteOff(parents, rows)
    const ws = roundTrip().Sheets[SOURCE_SHEET_NAME]
    expect(ws['!ref']).toBe('A1:K2')
    expect(cell(ws, 'L2')).toBeUndefined()
  })

  it('leaves a missing source price as an EMPTY cell value, not a zero', () => {
    const parents = [row()]
    const { rows } = sourceRows(
      [src({ unit_price_snapshot: null, source_amount_snapshot: null })], parents,
    )
    xlsWriteOff(parents, rows)
    const ws = roundTrip().Sheets[SOURCE_SHEET_NAME]
    /* aoa_to_sheet has no omitted form; legacy writes ''. Either an absent
       cell or an empty string is acceptable — a 0 is NOT. */
    expect(cell(ws, 'J2')?.v ?? '').not.toBe(0)
    expect(cell(ws, 'K2')?.v ?? '').not.toBe(0)
  })
})

describe('sheet shape', () => {
  it('sets !ref over the header plus every data row', () => {
    xlsWriteOff([row(), row({ movementId: 'm2' }), row({ movementId: 'm3' })], [])
    expect(cap.wb!.Sheets[MAIN_SHEET_NAME]['!ref']).toBe('A1:Q4')
  })

  it('writes a header-only sheet for an empty row set without throwing', () => {
    expect(() => xlsWriteOff([], [])).not.toThrow()
    const wb = roundTrip()
    expect(wb.SheetNames).toEqual([MAIN_SHEET_NAME])
    expect(cell(wb.Sheets[MAIN_SHEET_NAME], 'A2')).toBeUndefined()
  })

  it('uses the 17 and 11 FIXED legacy column widths', () => {
    const parents = [row()]
    const { rows } = sourceRows([src()], parents)
    xlsWriteOff(parents, rows)
    const main = cap.wb!.Sheets[MAIN_SHEET_NAME]['!cols'] as Array<{ wch: number }>
    expect(main.map((c) => c.wch)).toEqual(
      [16, 12, 14, 12, 42, 12, 14, 16, 16, 16, 18, 16, 20, 34, 14, 36, 22],
    )
    const source = cap.wb!.Sheets[SOURCE_SHEET_NAME]['!cols'] as Array<{ wch: number }>
    expect(source.map((c) => c.wch)).toEqual([38, 18, 12, 38, 18, 18, 12, 12, 18, 18, 18])
  })

  /* MUTATION: adding `!autofilter`, which the SHARED xls() sets. Legacy
     xlsWriteOff() does not, and no feature absent from legacy is added. */
  it('adds NO autofilter, on either sheet', () => {
    const parents = [row()]
    const { rows } = sourceRows([src()], parents)
    xlsWriteOff(parents, rows)
    expect(cap.wb!.Sheets[MAIN_SHEET_NAME]['!autofilter']).toBeUndefined()
    expect(cap.wb!.Sheets[SOURCE_SHEET_NAME]['!autofilter']).toBeUndefined()
  })

  it('sets the legacy freeze pane on the built sheet', () => {
    xlsWriteOff([row()], [])
    expect(cap.wb!.Sheets[MAIN_SHEET_NAME]['!freeze']).toEqual({ xSplit: 0, ySplit: 1 })
  })

  /* INHERITED, pinned as such: xlsx@0.18.5 drops !freeze on write. Shared with
     the legacy platform — not a migration regression, and not worked around. */
  it('the freeze pane does NOT survive serialization (xlsx@0.18.5)', () => {
    xlsWriteOff([row()], [])
    expect(roundTrip().Sheets[MAIN_SHEET_NAME]['!freeze']).toBeUndefined()
  })
})

describe('end to end, from movements to bytes', () => {
  const mov = (p: Partial<MovementFilterRow> = {}): MovementFilterRow => ({
    id: 'm1', type: 'Silinmə', item_code: '0000007', date: '2026-01-05',
    warehouse: 'Elet', partner: null, in_qty: null, out_qty: 10, price: 0,
    invoice_num: null, contract_num: null, note: null, doc_num: '00123',
    created_at: '2026-01-05T00:00:00Z', created_by: null, ...p,
  })

  it('carries an UNVALUED row through as blank price and amount cells', () => {
    const itemBy = new Map<string, MovementFilterItem>([
      ['0000007', { name: 'Sement', unit: 'kg', price: 3 }],
    ])
    const parents = writeOffExportRows(
      [mov()], itemBy, new Map<string, WriteoffValuationRow>(), new Map(), null,
    )
    const { rows } = sourceRows([], parents)
    xlsWriteOff(parents, rows)

    const ws = roundTrip().Sheets[MAIN_SHEET_NAME]
    expect(cell(ws, 'A2')!.v).toBe('00123')   // text, zeros intact
    expect(cell(ws, 'D2')!.v).toBe('0000007') // text, zeros intact
    expect(cell(ws, 'C2')!.v).toBe('Elet')    // RAW warehouse
    expect(cell(ws, 'G2')!.v).toBe(10)
    expect(cell(ws, 'H2')).toBeUndefined()    // no price at all
    expect(cell(ws, 'I2')).toBeUndefined()    // no amount at all
    expect(cell(ws, 'L2')!.v).toBe(10)        // the whole qty is unpriced
    expect(cell(ws, 'M2')!.v).toBe('legacy')
    expect(cell(ws, 'Q2')!.v).toBe('Excel idxalı')
  })

  it('excludes a reversed allocation from the serialized source sheet', () => {
    const parents = [row()]
    const { rows } = sourceRows(
      [src({ id: 'a1' }), src({ id: 'a2', reversed_at: '2026-02-01T00:00:00Z' })],
      parents,
    )
    xlsWriteOff(parents, rows as WriteOffSourceRow[])
    const ws = roundTrip().Sheets[SOURCE_SHEET_NAME]
    expect(ws['!ref']).toBe('A1:K2') // header + ONE row
  })
})
