import { describe, it, expect, vi, beforeEach } from 'vitest'

/* The whole `xlsx` module is replaced, in the lib/xls.test.ts shape, so the
   worksheet object is inspectable and NO FILE IS EVER WRITTEN. Nothing here
   exports real data: every figure comes from the fixture below. */
const writeFile = vi.fn()
vi.mock('xlsx', () => ({
  utils: {
    aoa_to_sheet: (data: unknown[][]) => {
      /* A minimal but real-shaped sheet: one addressed cell per value, typed
         the way SheetJS types them, so the text-coercion rule has something
         to act on. */
      const ws: Record<string, unknown> = { _data: data }
      data.forEach((row, r) => {
        row.forEach((v, c) => {
          if (v == null || v === '') return
          const addr = String.fromCharCode(65 + c) + (r + 1)
          ws[addr] = typeof v === 'number' ? { v, t: 'n' } : { v, t: 's' }
        })
      })
      return ws
    },
    /* Needed by the shared-xls() POSITIVE CONTROL below, which calls it to
       build the autofilter ref. `azpReportExport` itself never calls it —
       that is the point of the control. */
    encode_range: (r: unknown) => JSON.stringify(r),
    book_new: () => ({ sheets: [] as unknown[] }),
    book_append_sheet: (wb: { sheets: unknown[] }, ws: unknown, name: string) => {
      wb.sheets.push({ ws, name })
    },
  },
  writeFile: (...a: unknown[]) => writeFile(...a),
}))

import {
  azpReportExport, azpForceTextCells, azpReportFileName, azpReportSheetName,
} from './azpReportExport'
import { azpReportRows } from './azpReport'
import { xls } from './xls'
import type { AzpReport } from './azpReport'

beforeEach(() => vi.clearAllMocks())

/* M17-62, M17-63. Every expected value below is DERIVED from this fixture by
   running the accepted `azpReportRows()`, never hand-copied. */
const CARD = {
  card_id: 'c1',
  /* A leading-zero card number — the whole reason this writer exists. */
  card_no: '0012',
  holder: 'Anar',
  project: 'L1',
  opening: 5, medaxil: 30, mexaric: 20, closing: 15,
  live: 2, cancelled: 0, current: 15,
  rows: [],
}

const rep = (over: Partial<AzpReport> = {}): AzpReport => ({
  module: 'azpetrol',
  title: 'Azpetrol',
  outLabel: 'Y/D',
  mode: 'group',
  d1: '', d2: '', kind: '',
  cards: [CARD],
  totals: { opening: 5, medaxil: 30, mexaric: 20, closing: 15, current: 15, cancelled: 0 },
  undatedHidden: 0,
  ...over,
})

/** The sheet the writer handed to `book_append_sheet`. */
function writtenSheet(wb: unknown): Record<string, unknown> {
  return (wb as { sheets: { ws: Record<string, unknown> }[] }).sheets[0].ws
}

describe('the report writer is SEPARATE from shared xls() (M17-63)', () => {
  /* The three properties `xls()` adds and legacy's report writer does not.
     Asserted as absences, with a positive control below proving the
     assertions can actually fail — otherwise they would pass vacuously. */
  it('writes NO autofilter, NO freeze pane and NO column widths', () => {
    azpReportExport(rep(), '2026-09-12')
    const ws = writtenSheet(vi.mocked(writeFile).mock.calls[0][0])
    expect(ws['!autofilter']).toBeUndefined()
    expect(ws['!freeze']).toBeUndefined()
    expect(ws['!cols']).toBeUndefined()
  })

  /* POSITIVE CONTROL — the same three keys ARE set by shared `xls()`. This is
     what the report writer would have inherited had it delegated, and it is
     why M17-63 is a real contract rather than a stylistic preference. */
  it('control: shared xls() DOES set all three, so the absences above are meaningful', () => {
    xls([['a', 'b'], [1, 2]], 'control')
    const wb = vi.mocked(writeFile).mock.calls[0][0] as { sheets: { ws: Record<string, unknown> }[] }
    const ws = wb.sheets[0].ws
    expect(ws['!autofilter']).toBeDefined()
    expect(ws['!freeze']).toEqual({ xSplit: 0, ySplit: 1 })
    expect(ws['!cols']).toBeDefined()
  })

  it('does not route through xls(): the filename carries no xls() date suffix', () => {
    /* `xls()` appends `_<today>` to the NAME it is given and always writes
       `.xlsx`; this writer builds the whole filename itself. */
    azpReportExport(rep(), '2026-09-12')
    expect(writeFile).toHaveBeenCalledTimes(1)
    expect(vi.mocked(writeFile).mock.calls[0][1]).toBe('Azpetrol_hesabat_2026-09-12.xlsx')
  })
})

describe('leading-zero card numbers survive (M17-62)', () => {
  it('forces an entirely-numeric STRING cell to text', () => {
    const ws: Record<string, unknown> = { A1: { v: '0012', t: 's' } }
    azpForceTextCells(ws)
    expect(ws.A1).toEqual({ v: '0012', t: 's', z: '@' })
  })

  it('leaves a genuine NUMBER alone, so amounts are not turned into text', () => {
    const ws: Record<string, unknown> = { A1: { v: 30, t: 'n' } }
    azpForceTextCells(ws)
    expect(ws.A1).toEqual({ v: 30, t: 'n' })
  })

  it('leaves a non-numeric string alone', () => {
    const ws: Record<string, unknown> = { A1: { v: 'Anar', t: 's' } }
    azpForceTextCells(ws)
    expect(ws.A1).toEqual({ v: 'Anar', t: 's' })
  })

  it('skips the !-prefixed metadata keys', () => {
    const ws: Record<string, unknown> = { '!ref': 'A1:B2', A1: { v: '7', t: 's' } }
    azpForceTextCells(ws)
    expect(ws['!ref']).toBe('A1:B2')
  })

  /* The end-to-end case: the card number reaches the sheet as text. Its
     address is derived from the matrix, not assumed. */
  it('the exported card number cell is text, not a number', () => {
    azpReportExport(rep(), '2026-09-12')
    const ws = writtenSheet(vi.mocked(writeFile).mock.calls[0][0])
    const rows = azpReportRows(rep())
    let found: { v?: unknown; t?: string; z?: string } | undefined
    rows.forEach((row, r) => {
      row.forEach((v, c) => {
        if (v === '0012') found = ws[String.fromCharCode(65 + c) + (r + 1)] as typeof found
      })
    })
    expect(found).toBeDefined()
    expect(found).toMatchObject({ v: '0012', t: 's', z: '@' })
  })
})

describe('the workbook contract', () => {
  it('exports the SAME matrix the screen renders — nothing recalculated (M17-56)', () => {
    const r = rep()
    const out = azpReportExport(r, '2026-09-12')
    expect(out.rows).toEqual(azpReportRows(r))
  })

  it('names the sheet per mode', () => {
    expect(azpReportSheetName('group')).toBe('Qrup hesabatı')
    expect(azpReportSheetName('single')).toBe('Fərdi hesabat')
  })

  it('appends exactly one sheet, under the mode name', () => {
    azpReportExport(rep({ mode: 'single' }), '2026-09-12')
    const wb = vi.mocked(writeFile).mock.calls[0][0] as { sheets: { name: string }[] }
    expect(wb.sheets).toHaveLength(1)
    expect(wb.sheets[0].name).toBe('Fərdi hesabat')
  })

  it('names the file per module and day', () => {
    expect(azpReportFileName('azpetrol', '2026-09-12')).toBe('Azpetrol_hesabat_2026-09-12.xlsx')
    expect(azpReportFileName('araz', '2026-09-12')).toBe('Araz_hesabat_2026-09-12.xlsx')
  })

  it('uses the Araz label for the araz module, not the raw module name', () => {
    azpReportExport(rep({ module: 'araz', title: 'Araz', outLabel: 'Məxaric' }), '2026-01-02')
    expect(vi.mocked(writeFile).mock.calls[0][1]).toBe('Araz_hesabat_2026-01-02.xlsx')
  })
})
