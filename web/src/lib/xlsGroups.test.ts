import { describe, it, expect, vi, beforeEach } from 'vitest'

/* The real `utils` are kept — these tests assert actual cell addresses and
   types — while `writeFile` is replaced so nothing touches the filesystem.
   `hasWriter` lets the M6-38 case simulate a SheetJS build without a writer,
   which an ESM namespace object will not let a spy remove. */
const writeFile = vi.fn()
let hasWriter = true
vi.mock('xlsx', async (importOriginal) => {
  const actual = await importOriginal<typeof import('xlsx')>()
  return {
    ...actual,
    utils: actual.utils,
    get writeFile() {
      return hasWriter ? (...a: unknown[]) => writeFile(...a) : undefined
    },
  }
})

import * as XLSX from 'xlsx'
import {
  buildGroupsSheet, groupsExportStamp, groupsExportFilename, xlsGroups,
  GROUPS_EXPORT_HEADER, GROUPS_EXPORT_COLS, GROUPS_SHEET_NAME,
} from './xlsGroups'
import type { GroupRow } from './groupFilters'

const row = (p: Partial<GroupRow> = {}): GroupRow => ({
  code: '0000152', name: 'Nasos', qty: 5, unit: 'ədəd', wh: 'Ələt', cat: 'Nasos', price: 12.5, ...p,
})

/* A fixed instant so the az-AZ / Asia/Baku formatting is deterministic (R-G6). */
const TS = Date.parse('2026-09-04T12:00:00Z')

beforeEach(() => { vi.clearAllMocks(); hasWriter = true })

describe('xlsGroups — workbook shape (M6-33)', () => {
  it('writes the six legacy header cells', () => {
    const ws = buildGroupsSheet([row()], TS)
    const got = GROUPS_EXPORT_HEADER.map((_, c) => ws[XLSX.utils.encode_cell({ r: 0, c })]?.v)
    expect(got).toEqual([
      'Kod', 'Malın adı', 'Miqdar', 'Son alış qiyməti', 'Anbar', 'İxrac tarixi',
    ])
  })

  it('sets !ref over header + rows and the legacy !cols widths', () => {
    const ws = buildGroupsSheet([row(), row({ code: 'C2' })], TS)
    expect(ws['!ref']).toBe('A1:F3')
    expect(ws['!cols']).toEqual(GROUPS_EXPORT_COLS)
  })

  it('uses the legacy sheet name', () => {
    expect(GROUPS_SHEET_NAME).toBe('Mal qrupları')
  })

  it('names the file mal_qruplari_<today>.xlsx', () => {
    expect(groupsExportFilename()).toMatch(/^mal_qruplari_\d{4}-\d{2}-\d{2}\.xlsx$/)
  })
})

describe('xlsGroups — cell types (M6-34, M6-35, M6-S7)', () => {
  it('writes the code as TEXT with leading zeros preserved', () => {
    const ws = buildGroupsSheet([row({ code: '0000152' })], TS)
    const cell = ws[XLSX.utils.encode_cell({ r: 1, c: 0 })]
    expect(cell.t).toBe('s')
    expect(cell.v).toBe('0000152')
    expect(cell.z).toBe('@')
  })

  /* The reason this module exists separately from xls(): toNum would have
     turned the same code into the number 1 (R-F9 / R-G4). */
  it('does not degrade a zero-padded code to a number, unlike the shared xls()', () => {
    const ws = buildGroupsSheet([row({ code: '0000001' })], TS)
    expect(ws[XLSX.utils.encode_cell({ r: 1, c: 0 })].v).toBe('0000001')
    expect(typeof ws[XLSX.utils.encode_cell({ r: 1, c: 0 })].v).toBe('string')
  })

  it('writes quantity as a number', () => {
    const ws = buildGroupsSheet([row({ qty: 5.25 })], TS)
    const cell = ws[XLSX.utils.encode_cell({ r: 1, c: 2 })]
    expect(cell.t).toBe('n')
    expect(cell.v).toBe(5.25)
  })

  it('writes a present price as a number', () => {
    const ws = buildGroupsSheet([row({ price: 12.5 })], TS)
    const cell = ws[XLSX.utils.encode_cell({ r: 1, c: 3 })]
    expect(cell.t).toBe('n')
    expect(cell.v).toBe(12.5)
  })

  it('creates NO price cell when the price is null — a genuinely empty cell', () => {
    const ws = buildGroupsSheet([row({ price: null })], TS)
    expect(ws[XLSX.utils.encode_cell({ r: 1, c: 3 })]).toBeUndefined()
  })

  it('creates no price cell for NaN either', () => {
    const ws = buildGroupsSheet([row({ price: Number.NaN })], TS)
    expect(ws[XLSX.utils.encode_cell({ r: 1, c: 3 })]).toBeUndefined()
  })

  it('writes the RAW warehouse value, not a display label (M6-S7)', () => {
    // Xocahəsən is the stored value; whLabel() would render «Xocəsən».
    const ws = buildGroupsSheet([row({ wh: 'Xocahəsən' })], TS)
    expect(ws[XLSX.utils.encode_cell({ r: 1, c: 4 })].v).toBe('Xocahəsən')
  })
})

describe('xlsGroups — stamp (M6-36)', () => {
  it('formats the snapshot instant in az-AZ / Asia/Baku', () => {
    const expected = new Date(TS).toLocaleString('az-AZ', { timeZone: 'Asia/Baku' })
    expect(groupsExportStamp(TS)).toBe(expected)
  })

  it('repeats the same stamp on every row', () => {
    const ws = buildGroupsSheet([row(), row({ code: 'C2' }), row({ code: 'C3' })], TS)
    const stamps = [1, 2, 3].map((r) => ws[XLSX.utils.encode_cell({ r, c: 5 })].v)
    expect(new Set(stamps).size).toBe(1)
    expect(stamps[0]).toBe(groupsExportStamp(TS))
  })

  it('uses the instant it is given, not the current clock', () => {
    const other = Date.parse('2020-01-01T00:00:00Z')
    expect(groupsExportStamp(other)).not.toBe(groupsExportStamp(TS))
  })
})

describe('xlsGroups — download (M6-37, M6-38)', () => {
  it('writes the file and reports the row count', () => {
    const res = xlsGroups([row(), row({ code: 'C2' })], TS)
    expect(res).toEqual({ ok: true, count: 2 })
    expect(writeFile).toHaveBeenCalledTimes(1)
    expect(writeFile.mock.calls[0][1]).toMatch(/^mal_qruplari_/)
  })

  it('appends the sheet under the legacy name', () => {
    xlsGroups([row()], TS)
    const wb = writeFile.mock.calls[0][0] as { SheetNames: string[] }
    expect(wb.SheetNames).toEqual([GROUPS_SHEET_NAME])
  })

  it('reports the legacy message and downloads nothing when SheetJS is unusable', () => {
    hasWriter = false
    const res = xlsGroups([row()], TS)
    expect(res.ok).toBe(false)
    expect(res.error).toBe('Excel kitabxanası yüklənmədi')
    expect(writeFile).not.toHaveBeenCalled()
  })
})
