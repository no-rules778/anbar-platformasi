import { describe, it, expect, beforeEach, vi } from 'vitest'
import * as XLSX from 'xlsx'

/* I-7 follow-up — movementExportMatrix → xls() through the REAL serializer.

   Every other export suite mocks `xlsx` wholesale: `movementExport.test.ts`
   inspects the matrix before it reaches a writer, `xls.test.ts` replaces
   `XLSX.utils` with stubs, and `MovementsPageExport.test.tsx` mocks `xls()`
   itself. That leaves one link unproven — that the matrix, handed to the REAL
   SheetJS build the app ships (`xlsx@0.18.5`, the version pinned in
   package.json), actually serializes into a readable workbook carrying the
   cells this project's Excel contract promises.

   This suite closes exactly that link and nothing more. Only the final
   download boundary — `XLSX.writeFile`, which would hit the filesystem — is
   intercepted; `aoa_to_sheet`, `book_new`, `book_append_sheet`,
   `encode_range` and the serializer all run for real. The captured workbook is
   then written to an in-memory buffer with `XLSX.write` and parsed back with
   `XLSX.read`, so every assertion below is made against bytes that went
   through the xlsx writer and reader, not against an intermediate object.

   THE CALL IT MIRRORS: `MovementsPage.exportXls()` calls
   `xls(matrix, 'mal_hereketi')` with no sheet override (MovementsPage.tsx:280).
   The main path below reproduces that exactly — file `mal_hereketi_<date>.xlsx`,
   sheet `Hesabat`. Sheet-override behaviour is real but belongs to other
   callers, so it is exercised in its own describe block rather than mixed into
   the integration path.

   WHAT THIS DOES NOT PROVE: it is not live verification, and it is not visual
   Excel compatibility. SheetJS reading its own output confirms the workbook is
   well-formed and that cell types and values survive a round trip; it says
   nothing about how Microsoft Excel renders column widths or the autofilter,
   and nothing about live data. Those remain open checks.

   THE FREEZE PANE IS ABSENT and is pinned as such — see the dedicated block
   below. It is an inherited limitation of `xlsx@0.18.5`, shared with the
   legacy platform, not a migration regression.

   The shared writer, the matrix and the dependency set are untouched. */

const cap: { wb: XLSX.WorkBook | null; filename: string; calls: number } = {
  wb: null, filename: '', calls: 0,
}

vi.mock('xlsx', async (orig) => {
  const actual = await orig<typeof import('xlsx')>()
  return {
    ...actual,
    /* The ONLY replaced export. Everything the matrix touches on its way into
       the workbook is the genuine implementation. */
    writeFile: (wb: XLSX.WorkBook, filename: string) => {
      cap.wb = wb
      cap.filename = filename
      cap.calls += 1
    },
  }
})

import { xls } from './xls'
import { movementExportMatrix, MOVEMENT_EXPORT_HEADER } from './movementExport'
import type { MovementFilterItem, MovementFilterRow } from './movementFilters'
import type { WriteoffValuationRow } from '../api/writeoffValuations.api'

const WHS = ['Ələt', 'Astara', 'Xocahəsən']

/** Column indexes, so a reorder fails loudly rather than silently. */
const C = {
  date: 0, wh: 1, code: 2, name: 3, unit: 4, type: 5, key: 6, channel: 7,
  in: 8, out: 9, price: 10, amount: 11, contract: 12, invoice: 13, by: 14,
} as const

function mv(over: Partial<MovementFilterRow> = {}): MovementFilterRow {
  return {
    id: 'm1',
    item_code: '0000001',
    warehouse: 'Ələt',
    date: '2026-09-01',
    type: 'Satınalma',
    partner: 'Azpetrol',
    in_qty: 5,
    out_qty: null,
    invoice_num: 'INV-1',
    contract_num: 'CT-1',
    note: null,
    price: 10,
    created_at: '2026-09-01T08:00:00Z',
    doc_num: 'D-1',
    channel: 'Nağd',
    created_by: null,
    ...over,
  } as MovementFilterRow
}

function val(over: Partial<WriteoffValuationRow> = {}): WriteoffValuationRow {
  return {
    movement_id: 'm2',
    source_amount: 100,
    known_amount: 100,
    unknown_qty: 0,
    final_amount: 100,
    valuation_method: 'lot',
    override_reason: null,
    ...over,
  }
}

const ITEMS = new Map<string, MovementFilterItem>([
  ['0000001', { name: 'Nasos', unit: 'ədəd', price: 9 }],
  ['0000002', { name: 'Boru', unit: 'metr', price: 3 }],
])

const NO_VALS = new Map<string, WriteoffValuationRow>()
const NO_EMAILS = new Map<string, string>()

/* THE REAL EXPORT CONTRACT, corrected.

   `MovementsPage.exportXls()` calls `xls(matrix, 'mal_hereketi')` with NO
   third argument (MovementsPage.tsx:280-283). So the artifact a user actually
   receives is `mal_hereketi_<yyyy-mm-dd>.xlsx` and its single sheet is named
   `Hesabat` — the default in `xls()` (`(sheet || 'Hesabat')`).

   An earlier version of this suite passed `'Mal_hereketi'` as the name and
   `'Mal hereketi'` as an explicit sheet override. Both were wrong: no caller
   passes either, so the integration path was pinning a workbook the app never
   produces. The mismatch is corrected here; the sheet-override behaviour of
   `xls()` is still real and is kept, in its own tests below. */
const EXPORT_NAME = 'mal_hereketi'
const DEFAULT_SHEET = 'Hesabat'

/**
 * Runs the real export pipeline and reads the produced file back.
 *
 * The workbook is serialized with `XLSX.write` to a buffer and re-parsed, so
 * the returned rows and cells are the ones a spreadsheet would load.
 */
function roundTrip(matrix: unknown[][], sheet?: string) {
  /* Called exactly as MovementsPage calls it: no sheet argument unless a test
     is deliberately exercising the override. */
  if (sheet === undefined) xls(matrix, EXPORT_NAME)
  else xls(matrix, EXPORT_NAME, sheet)
  expect(cap.wb).not.toBeNull()
  const buf = XLSX.write(cap.wb as XLSX.WorkBook, { type: 'buffer', bookType: 'xlsx' })
  const wb = XLSX.read(buf, { type: 'buffer' })
  const sheetName = wb.SheetNames[0]
  const ws = wb.Sheets[sheetName]
  const rows = XLSX.utils.sheet_to_json(ws, {
    header: 1, raw: true, defval: null, blankrows: true,
  }) as unknown[][]
  return { wb, ws, rows, sheetName }
}

/** The cell at a body row / column, or undefined when the cell is absent. */
const cellAt = (ws: XLSX.WorkSheet, r: number, c: number) =>
  ws[XLSX.utils.encode_cell({ r, c })] as XLSX.CellObject | undefined

/**
 * Asserts a cell is EMPTY in the produced file.
 *
 * VERIFIED, and not what was assumed when this suite was drafted: the matrix
 * emits `''` for a missing quantity, price or amount, `toNum('')` returns it
 * untouched, and SheetJS writes a PRESENT string cell — `{ t: 's', v: '' }` —
 * rather than omitting the cell. Reading it back yields `''`, not null.
 *
 * That still satisfies the rule the matrix exists to enforce: the cell is
 * blank, carries no 0, and cannot sum into a spreadsheet total. The
 * distinction pinned here is only HOW the blank is represented, which no test
 * could observe while the writer was mocked.
 */
function expectEmptyCell(ws: XLSX.WorkSheet, r: number, c: number) {
  const cell = cellAt(ws, r, c)
  expect(cell).toBeDefined()
  expect(cell?.t).toBe('s')
  expect(cell?.v).toBe('')
}

beforeEach(() => {
  cap.wb = null
  cap.filename = ''
  cap.calls = 0
})

describe('movementExportMatrix → xls() → real xlsx serialization', () => {
  it('writes one file named mal_hereketi_<yyyy-mm-dd>.xlsx, as MovementsPage asks for it', () => {
    const matrix = movementExportMatrix([mv()], ITEMS, WHS, NO_VALS, NO_EMAILS, null)
    roundTrip(matrix)

    expect(cap.calls).toBe(1)
    /* Lower-case, matching the literal at MovementsPage.tsx:282 and the toast
       text «mal_hereketi.xlsx yükləndi» shown next to it. */
    expect(cap.filename).toMatch(/^mal_hereketi_\d{4}-\d{2}-\d{2}\.xlsx$/)
  })

  /* The sheet the user opens is the DEFAULT, because the caller passes no
     override. This is the assertion the old suite got wrong. */
  it('names the single sheet «Hesabat», the default for a caller with no override', () => {
    const matrix = movementExportMatrix([mv()], ITEMS, WHS, NO_VALS, NO_EMAILS, null)
    const { wb, sheetName } = roundTrip(matrix)

    expect(wb.SheetNames).toEqual([DEFAULT_SHEET])
    expect(sheetName).toBe(DEFAULT_SHEET)
    expect(wb.SheetNames).toHaveLength(1)
  })

  it('round-trips the exact 15-column header as row 0, all as text', () => {
    const matrix = movementExportMatrix([mv()], ITEMS, WHS, NO_VALS, NO_EMAILS, null)
    const { ws, rows } = roundTrip(matrix)

    expect(rows[0]).toEqual([...MOVEMENT_EXPORT_HEADER])
    expect(rows[0]).toHaveLength(15)
    /* Every header cell is a string cell — `xls()` stringifies row 0. */
    for (let c = 0; c < 15; c++) {
      expect(cellAt(ws, 0, c)?.t).toBe('s')
    }
  })

  it('writes one body row per movement, header included in the count', () => {
    const rowsIn = [
      mv({ id: 'm1' }),
      mv({ id: 'm2', item_code: '0000002' }),
      mv({ id: 'm3', item_code: '0000002', type: 'Yerdəyişmə' }),
    ]
    const matrix = movementExportMatrix(rowsIn, ITEMS, WHS, NO_VALS, NO_EMAILS, null)
    const { rows, ws } = roundTrip(matrix)

    expect(rows).toHaveLength(4)
    const ref = XLSX.utils.decode_range(ws['!ref'] as string)
    expect(ref.e.r).toBe(3)
    expect(ref.e.c).toBe(14)
  })

  /* A header-only export: the legitimate «no rows matched the filter» case. It
     must still produce a readable one-row workbook, not an empty or corrupt
     file — `xls()` builds the autofilter range from `data.length - 1`, which
     is row 0 here. */
  it('serializes a header-only workbook when no movements match', () => {
    const matrix = movementExportMatrix([], ITEMS, WHS, NO_VALS, NO_EMAILS, null)
    const { rows, ws, wb } = roundTrip(matrix)

    expect(matrix).toHaveLength(1)
    expect(wb.SheetNames).toEqual([DEFAULT_SHEET])
    expect(rows).toHaveLength(1)
    expect(rows[0]).toEqual([...MOVEMENT_EXPORT_HEADER])
    const ref = XLSX.utils.decode_range(ws['!ref'] as string)
    expect(ref.e.r).toBe(0)
    expect(ref.e.c).toBe(14)
  })
})

/* The sheet-name OVERRIDE — real behaviour of `xls()`, exercised separately.

   «Mal hərəkəti» does not use it, so these cannot sit on the main integration
   path. They stay because `xls()` is shared and another caller may pass a
   sheet name; keeping them apart is what makes the path above an honest
   picture of what MovementsPage produces. */
describe('xls() sheet-name override (not used by the movements export)', () => {
  it('uses an explicit sheet name when a caller passes one', () => {
    const matrix = movementExportMatrix([mv()], ITEMS, WHS, NO_VALS, NO_EMAILS, null)
    const { wb, sheetName } = roundTrip(matrix, 'Mal hereketi')

    expect(wb.SheetNames).toEqual(['Mal hereketi'])
    expect(sheetName).toBe('Mal hereketi')
  })

  /* `xls()` truncates a sheet name to 28 chars before appending it; Excel's
     own limit is 31, so the bound is the port's, and it survives the file. */
  it('truncates an over-long sheet name to 28 characters', () => {
    const long = 'Mal hereketi cox uzun hesabat adi 2026'
    const matrix = movementExportMatrix([], ITEMS, WHS, NO_VALS, NO_EMAILS, null)
    const { wb } = roundTrip(matrix, long)

    expect(wb.SheetNames[0]).toBe(long.slice(0, 28))
    expect(wb.SheetNames[0]).toHaveLength(28)
  })
})

/* THE FREEZE PANE IS NOT WRITTEN — inherited limitation, pinned not fixed.

   `xls()` sets `ws['!freeze'] = { xSplit: 0, ySplit: 1 }`, ported verbatim from
   index.html:1230. VERIFIED against the installed `xlsx@0.18.5` writer by
   serializing and unzipping the result: `xl/worksheets/sheet1.xml` contains
   `<sheetView workbookViewId="0"/>` with NO `<pane>` child, and a workbook
   built with `!freeze` set is byte-identical (same md5) to one built without
   it. `!freeze` is simply not a key the 0.18.5 writer consumes.

   THIS IS NOT A MIGRATION REGRESSION. The legacy platform sets the identical
   property and loads the same 0.18.5 build from its CDN (index.html:5), so
   legacy exports carry no freeze pane either. The React port reproduces
   legacy behaviour exactly; it did not introduce the gap.

   Deliberately NOT fixed here: changing the writer or moving to a SheetJS
   build that supports panes is a dependency and export-contract decision
   under §7 of the migration principles (see R-F7), not a test-suite change.
   The assertion is written to FAIL if a future dependency change starts
   emitting a pane, so the decision is made explicitly rather than by drift. */
describe('freeze pane — inherited limitation of xlsx@0.18.5', () => {
  it('does not emit a <pane> element, matching legacy output', () => {
    const matrix = movementExportMatrix([mv()], ITEMS, WHS, NO_VALS, NO_EMAILS, null)
    roundTrip(matrix)

    /* Read the actual sheet XML out of the produced .xlsx package. */
    const buf = XLSX.write(cap.wb as XLSX.WorkBook, { type: 'buffer', bookType: 'xlsx' })
    const back = XLSX.read(buf, { type: 'buffer', bookFiles: true })
    const files = (back as unknown as { files: Record<string, { content?: string }> }).files
    const key = Object.keys(files).find((k) => k.includes('worksheets/sheet1.xml'))
    expect(key).toBeDefined()
    const xml = String(files[key as string].content ?? '')

    /* The sheetView is emitted, but carries no pane child. */
    expect(xml).toContain('<sheetView')
    expect(xml).not.toContain('<pane')
    /* And nothing restores pane state on the way back in. */
    const ws = back.Sheets[back.SheetNames[0]]
    expect(ws['!freeze']).toBeUndefined()
  })

  /* The autofilter, by contrast, IS written and survives the round trip —
     the contrast is what shows the freeze gap is the writer's, not ours. */
  it('does write the autofilter over the full used range', () => {
    const matrix = movementExportMatrix([mv(), mv({ id: 'm2' })], ITEMS, WHS, NO_VALS, NO_EMAILS, null)
    const { ws } = roundTrip(matrix)

    expect(ws['!autofilter']).toBeDefined()
    expect((ws['!autofilter'] as { ref: string }).ref).toBe('A1:O3')
  })
})

describe('cell typing after a real round trip', () => {
  /* The matrix hands the writer a mix of numbers, 2-dp strings and empty
     strings; `toNum()` inside `xls()` decides which become numeric cells. */
  it('stores quantity, price and amount as NUMBER cells', () => {
    const matrix = movementExportMatrix(
      [mv({ in_qty: 5, out_qty: null, price: 10 })],
      ITEMS, WHS, NO_VALS, NO_EMAILS, null,
    )
    const { ws, rows } = roundTrip(matrix)

    expect(cellAt(ws, 1, C.in)?.t).toBe('n')
    expect(cellAt(ws, 1, C.in)?.v).toBe(5)
    expect(cellAt(ws, 1, C.price)?.t).toBe('n')
    expect(cellAt(ws, 1, C.price)?.v).toBe(10)
    /* `(5 + 0) * 10` → the string '50.00' → converted back to the number 50. */
    expect(cellAt(ws, 1, C.amount)?.t).toBe('n')
    expect(cellAt(ws, 1, C.amount)?.v).toBe(50)
    expect(rows[1][C.amount]).toBe(50)
  })

  /* An absent quantity is an EMPTY cell, never a 0 — a 0 would read as a
     genuine zero-quantity movement and would sum into a spreadsheet total.
     After serialization the cell must be absent from the sheet entirely. */
  it('leaves an absent quantity EMPTY, not zero', () => {
    const matrix = movementExportMatrix(
      [mv({ in_qty: 5, out_qty: null })],
      ITEMS, WHS, NO_VALS, NO_EMAILS, null,
    )
    const { ws, rows } = roundTrip(matrix)

    expectEmptyCell(ws, 1, C.out)
    expect(rows[1][C.out]).toBe('')
    expect(rows[1][C.out]).not.toBe(0)
    /* The populated side is still a real number. */
    expect(rows[1][C.in]).toBe(5)
  })

  it('leaves an unpriced row with an empty price and an empty amount', () => {
    const matrix = movementExportMatrix(
      [mv({ price: null, item_code: 'UNKNOWN', in_qty: 4 })],
      ITEMS, WHS, NO_VALS, NO_EMAILS, null,
    )
    const { ws, rows } = roundTrip(matrix)

    expectEmptyCell(ws, 1, C.price)
    expectEmptyCell(ws, 1, C.amount)
    expect(rows[1][C.price]).toBe('')
    expect(rows[1][C.amount]).toBe('')
    /* An unknown code still exports the row, with blank name and unit. */
    expectEmptyCell(ws, 1, C.name)
    expectEmptyCell(ws, 1, C.unit)
  })

  it('keeps text columns as STRING cells', () => {
    const matrix = movementExportMatrix([mv()], ITEMS, WHS, NO_VALS, NO_EMAILS, null)
    const { ws, rows } = roundTrip(matrix)

    expect(cellAt(ws, 1, C.date)?.t).toBe('s')
    /* RAW ISO date, not fmtD() — the export does not format dates. */
    expect(rows[1][C.date]).toBe('2026-09-01')
    expect(cellAt(ws, 1, C.wh)?.t).toBe('s')
    expect(rows[1][C.wh]).toBe('Ələt')
    expect(cellAt(ws, 1, C.type)?.t).toBe('s')
    expect(rows[1][C.type]).toBe('Satınalma')
    expect(cellAt(ws, 1, C.name)?.t).toBe('s')
    expect(rows[1][C.name]).toBe('Nasos')
    expect(cellAt(ws, 1, C.unit)?.t).toBe('s')
    expect(rows[1][C.unit]).toBe('ədəd')
    expect(cellAt(ws, 1, C.channel)?.t).toBe('s')
    expect(rows[1][C.channel]).toBe('Nağd')
    expect(rows[1][C.key]).toBe('Azpetrol')
  })

  /* Azerbaijani text must survive the round trip byte-for-byte: the header and
     the warehouse and unit labels carry ə, ı, ğ, ç, ş, ö, ü, and İ. */
  it('preserves non-ASCII Azerbaijani text through serialization', () => {
    const matrix = movementExportMatrix(
      [mv({ warehouse: 'Ələt' })], ITEMS, WHS, NO_VALS, NO_EMAILS, null,
    )
    const { rows } = roundTrip(matrix)

    expect(rows[0][C.name]).toBe('Malın adı')
    expect(rows[0][C.key]).toBe('İstiqamət / Kontragent')
    expect(rows[0][C.unit]).toBe('Ölçü')
    expect(rows[1][C.wh]).toBe('Ələt')
    expect(rows[1][C.unit]).toBe('ədəd')
  })

  /* The export writes the DISPLAY alias, not the stored name: `whLabel()` maps
     the stored «Xocahəsən» to «Xocəsən» (WH_DISPLAY, index.html:592), and the
     export goes through that mapping exactly as the screen does.

     Confirmed here rather than assumed — the first draft of this suite
     expected the stored spelling and was wrong. The stored value is unchanged;
     only the visible text is aliased, so the sheet matching the screen is the
     intended contract, and a divergence between the two would be the defect. */
  it('writes the warehouse DISPLAY alias, matching the screen', () => {
    const matrix = movementExportMatrix(
      [mv({ warehouse: 'Xocahəsən' })], ITEMS, WHS, NO_VALS, NO_EMAILS, null,
    )
    const { ws, rows } = roundTrip(matrix)

    expect(cellAt(ws, 1, C.wh)?.t).toBe('s')
    expect(rows[1][C.wh]).toBe('Xocəsən')
    expect(rows[1][C.wh]).not.toBe('Xocahəsən')
  })

  /* A warehouse with no alias passes through untouched. */
  it('leaves an unaliased warehouse name as stored', () => {
    const matrix = movementExportMatrix(
      [mv({ warehouse: 'Astara' })], ITEMS, WHS, NO_VALS, NO_EMAILS, null,
    )
    const { rows } = roundTrip(matrix)

    expect(rows[1][C.wh]).toBe('Astara')
  })
})

describe('stored write-off valuation through the workbook', () => {
  /* A Silinmə row is valued from the STORED map, not from qty × price. The
     unit price is `final / qty` and the amount is the stored `final` as a
     NUMBER — the legacy asymmetry the matrix ports deliberately. */
  it('exports the stored final amount and the derived unit price as numbers', () => {
    const rowsIn = [mv({ id: 'm2', type: 'Silinmə', in_qty: null, out_qty: 4, price: 10 })]
    const vals = new Map([['m2', val({ movement_id: 'm2', final_amount: 90 })]])

    const matrix = movementExportMatrix(rowsIn, ITEMS, WHS, vals, NO_EMAILS, null)
    const { ws, rows } = roundTrip(matrix)

    /* 90 / 4 = 22.5 — the stored valuation, NOT the row's own price of 10. */
    expect(cellAt(ws, 1, C.price)?.t).toBe('n')
    expect(cellAt(ws, 1, C.price)?.v).toBe(22.5)
    expect(cellAt(ws, 1, C.amount)?.t).toBe('n')
    expect(cellAt(ws, 1, C.amount)?.v).toBe(90)
    expect(rows[1][C.out]).toBe(4)
    expectEmptyCell(ws, 1, C.in)
  })

  /* A stored valuation whose `final_amount` is null exports an EMPTY amount
     cell — not a 0, and not the qty × price fallback. */
  it('exports an empty amount when the stored final is null', () => {
    const rowsIn = [mv({ id: 'm2', type: 'Silinmə', in_qty: null, out_qty: 4, price: 10 })]
    const vals = new Map([
      ['m2', val({ movement_id: 'm2', final_amount: null, known_amount: null })],
    ])

    const matrix = movementExportMatrix(rowsIn, ITEMS, WHS, vals, NO_EMAILS, null)
    const { ws, rows } = roundTrip(matrix)

    expectEmptyCell(ws, 1, C.amount)
    expect(rows[1][C.amount]).toBe('')
    /* With no stored final the unit price falls back to the row's price. */
    expect(rows[1][C.price]).toBe(10)
  })

  /* A fractional unit price is rounded to 4 dp by `writeOffUnitPrice` and must
     reach the sheet as that exact number, not as a text cell. */
  it('round-trips a 4-dp unit price as an exact number', () => {
    const rowsIn = [mv({ id: 'm2', type: 'Silinmə', in_qty: null, out_qty: 3, price: 1 })]
    const vals = new Map([['m2', val({ movement_id: 'm2', final_amount: 100 })]])

    const matrix = movementExportMatrix(rowsIn, ITEMS, WHS, vals, NO_EMAILS, null)
    const { ws } = roundTrip(matrix)

    /* 100 / 3 → 33.3333 after the port's own toFixed(4). */
    expect(cellAt(ws, 1, C.price)?.t).toBe('n')
    expect(cellAt(ws, 1, C.price)?.v).toBe(33.3333)
  })
})

describe('inherited leading-zero conversion, confirmed in the file', () => {
  /* INHERITED DEFECT, pinned deliberately (R-F9, Codex audit 2026-09-03 §3).
     `toNum()` converts an all-digit item code, so `0000001` lands in the sheet
     as the NUMBER 1 and the padding is lost. `xls.test.ts` pins this at the
     helper; this test proves it is what a real .xlsx file actually contains,
     which is the form the user would see.

     If the export contract is ever changed under §7 of the migration
     principles, this test should fail and be updated deliberately. */
  it('stores a zero-padded code as a NUMBER, losing the padding', () => {
    const matrix = movementExportMatrix(
      [mv({ item_code: '0000001' })], ITEMS, WHS, NO_VALS, NO_EMAILS, null,
    )
    const { ws, rows } = roundTrip(matrix)

    expect(cellAt(ws, 1, C.code)?.t).toBe('n')
    expect(cellAt(ws, 1, C.code)?.v).toBe(1)
    expect(rows[1][C.code]).toBe(1)
    expect(rows[1][C.code]).not.toBe('0000001')
  })

  /* The matrix itself still carries the untouched string: the conversion is
     the WRITER's, which is why it could not be observed before this suite. */
  it('leaves the matrix string intact — the loss happens in the writer', () => {
    const matrix = movementExportMatrix(
      [mv({ item_code: '0000001' })], ITEMS, WHS, NO_VALS, NO_EMAILS, null,
    )
    expect(matrix[1][C.code]).toBe('0000001')

    const { rows } = roundTrip(matrix)
    expect(rows[1][C.code]).toBe(1)
  })

  /* A code that is NOT entirely digits is not a number, so it survives whole —
     the boundary of the defect, worth pinning alongside it. */
  it('keeps a non-numeric code as text', () => {
    const items = new Map<string, MovementFilterItem>([
      ['A-0001', { name: 'Nasos', unit: 'ədəd', price: 9 }],
    ])
    const matrix = movementExportMatrix(
      [mv({ item_code: 'A-0001' })], items, WHS, NO_VALS, NO_EMAILS, null,
    )
    const { ws, rows } = roundTrip(matrix)

    expect(cellAt(ws, 1, C.code)?.t).toBe('s')
    expect(rows[1][C.code]).toBe('A-0001')
  })
})

describe('«Qeyd edən» mapping in the produced file', () => {
  it('writes the directory email, the signed-in name, and the import label', () => {
    const MINE = '11111111-1111-4111-8111-111111111111'
    const OTHER = '22222222-2222-4222-8222-222222222222'
    const emails = new Map([[OTHER, 'nurlan@example.com']])
    const me = { sbId: MINE, name: 'Anar İbrahimov' }

    const rowsIn = [
      mv({ id: 'm1', created_by: OTHER }),
      mv({ id: 'm2', created_by: MINE }),
      mv({ id: 'm3', created_by: null }),
    ]
    const matrix = movementExportMatrix(rowsIn, ITEMS, WHS, NO_VALS, emails, me)
    const { rows } = roundTrip(matrix)

    expect(rows[1][C.by]).toBe('nurlan@example.com')
    expect(rows[2][C.by]).toBe('Anar İbrahimov')
    expect(rows[3][C.by]).toBe('Excel idxalı')
    /* Never a raw UUID. */
    for (const r of [1, 2, 3]) expect(rows[r][C.by]).not.toBe(OTHER)
  })
})
