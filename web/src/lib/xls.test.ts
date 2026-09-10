import { describe, it, expect, vi, beforeEach } from 'vitest'

const writeFile = vi.fn()
vi.mock('xlsx', () => ({
  utils: {
    aoa_to_sheet: (data: unknown[][]) => ({ _data: data } as Record<string, unknown>),
    encode_range: (r: unknown) => JSON.stringify(r),
    book_new: () => ({ sheets: [] as unknown[] }),
    book_append_sheet: (wb: { sheets: unknown[] }, ws: unknown, name: string) => { wb.sheets.push({ ws, name }) },
  },
  writeFile: (...a: unknown[]) => writeFile(...a),
}))

import { xls, toNum, nomenclatureExportMatrix, NOMENCLATURE_EXPORT_HEADER } from './xls'

beforeEach(() => vi.clearAllMocks())

/* M5-20 / M5-24 — xls() (index.html:1219-1236) and the Nomenklatura export
   matrix (2452-2453). */

describe('toNum (index.html:1212-1218)', () => {
  it('passes a number through', () => {
    expect(toNum(5)).toBe(5)
  })

  it('converts a fully numeric string', () => {
    expect(toNum('42')).toBe(42)
    expect(toNum('-3.5')).toBe(-3.5)
  })

  it('accepts a decimal comma', () => {
    expect(toNum('9,5')).toBe(9.5)
  })

  it('leaves a non-numeric string untouched', () => {
    expect(toNum('Sement M400')).toBe('Sement M400')
    expect(toNum('12 kq')).toBe('12 kq')
  })

  it('leaves an empty value untouched', () => {
    expect(toNum('')).toBe('')
    expect(toNum(null)).toBe(null)
  })

  /* INHERITED DEFECT, pinned deliberately (Codex audit 2026-09-03 §3).
     A zero-padded item code is entirely digits, so it converts and loses its
     leading zeros: `0000001` exports as the NUMBER 1. The legacy
     implementation behaves identically (index.html:1212-1218), so this is a
     pre-existing export characteristic, not a migration regression. An
     earlier comment in xls.ts claimed codes were protected here; they are not.

     This test exists to make the behaviour VISIBLE and to stop it changing by
     accident. Altering it changes the Excel output contract and needs its own
     decision under §7 of the migration principles; if that decision is ever
     taken, this test should fail and be updated deliberately. */
  it('converts a zero-padded code to a number, losing the padding (inherited)', () => {
    expect(toNum('0000001')).toBe(1)
    expect(toNum('0001532')).toBe(1532)
  })
})

describe('nomenclatureExportMatrix', () => {
  const row = {
    code: '0000001', name: 'Sement', unit: 'kq', price: 10, q: 5, val: 50,
  }

  it('starts with the legacy header row', () => {
    expect(nomenclatureExportMatrix([])[0]).toEqual(NOMENCLATURE_EXPORT_HEADER)
    expect(NOMENCLATURE_EXPORT_HEADER).toEqual(
      ['Kod', 'Malın adı', 'Ölçü vahidi', 'Son qiymət', 'Ümumi qalıq', 'Dəyər'],
    )
  })

  it('emits the six legacy columns in order', () => {
    expect(nomenclatureExportMatrix([row])[1]).toEqual(['0000001', 'Sement', 'kq', 10, 5, '50.00'])
  })

  /* `price || ''` — a missing price is an EMPTY cell, not a zero. */
  it('exports a null price and a zero price as an empty cell', () => {
    expect(nomenclatureExportMatrix([{ ...row, price: null }])[1][3]).toBe('')
    expect(nomenclatureExportMatrix([{ ...row, price: 0 }])[1][3]).toBe('')
  })

  it('exports the value as a 2-decimal string, matching toFixed(2)', () => {
    expect(nomenclatureExportMatrix([{ ...row, val: 1234.5 }])[1][5]).toBe('1234.50')
  })

  /* An item with no movements still exports, with the {q:0,val:0} fallback. */
  it('exports an item with no balance as 0 / 0.00', () => {
    const out = nomenclatureExportMatrix([{ ...row, q: 0, val: 0 }])[1]
    expect(out[4]).toBe(0)
    expect(out[5]).toBe('0.00')
  })

  it('exports a null unit as an empty cell', () => {
    expect(nomenclatureExportMatrix([{ ...row, unit: null }])[1][2]).toBe('')
  })
})

describe('xls — workbook shaping (M5-24)', () => {
  const matrix = nomenclatureExportMatrix([
    { code: '0000001', name: 'Sement M400', unit: 'kq', price: 10, q: 5, val: 50 },
  ])

  it('writes a file named <name>_<yyyy-mm-dd>.xlsx', () => {
    xls(matrix, 'nomenklatura')
    const name = writeFile.mock.calls[0][1] as string
    expect(name).toMatch(/^nomenklatura_\d{4}-\d{2}-\d{2}\.xlsx$/)
  })

  it('stringifies the header row and converts later rows via toNum', () => {
    xls([['Kod', 'Say'], ['0000001', '42']], 'x')
    const ws = (writeFile.mock.calls[0][0] as { sheets: { ws: Record<string, unknown> }[] }).sheets[0].ws
    const data = ws._data as unknown[][]
    expect(data[0]).toEqual(['Kod', 'Say'])
    expect(data[1][1]).toBe(42)
  })

  it('sets column widths bounded to 8..55 characters', () => {
    xls(matrix, 'x')
    const ws = (writeFile.mock.calls[0][0] as { sheets: { ws: Record<string, unknown> }[] }).sheets[0].ws
    const cols = ws['!cols'] as { wch: number }[]
    expect(cols).toHaveLength(6)
    for (const c of cols) {
      expect(c.wch).toBeGreaterThanOrEqual(8)
      expect(c.wch).toBeLessThanOrEqual(55)
    }
  })

  it('sets an autofilter across the whole used range', () => {
    xls(matrix, 'x')
    const ws = (writeFile.mock.calls[0][0] as { sheets: { ws: Record<string, unknown> }[] }).sheets[0].ws
    expect(JSON.parse((ws['!autofilter'] as { ref: string }).ref)).toEqual({
      s: { r: 0, c: 0 }, e: { r: 1, c: 5 },
    })
  })

  it('freezes the header row', () => {
    xls(matrix, 'x')
    const ws = (writeFile.mock.calls[0][0] as { sheets: { ws: Record<string, unknown> }[] }).sheets[0].ws
    expect(ws['!freeze']).toEqual({ xSplit: 0, ySplit: 1 })
  })

  it('defaults the sheet name to Hesabat and truncates at 28 characters', () => {
    xls(matrix, 'x')
    const wb1 = writeFile.mock.calls[0][0] as { sheets: { name: string }[] }
    expect(wb1.sheets[0].name).toBe('Hesabat')

    vi.clearAllMocks()
    xls(matrix, 'x', 'a'.repeat(40))
    const wb2 = writeFile.mock.calls[0][0] as { sheets: { name: string }[] }
    expect(wb2.sheets[0].name).toHaveLength(28)
  })

  it('handles an empty matrix without crashing', () => {
    expect(() => xls([], 'x')).not.toThrow()
  })
})
