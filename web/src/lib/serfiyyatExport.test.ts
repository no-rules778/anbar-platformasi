import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import type { SmReportRow } from './serfiyyat'

/* T5 — M13-88, M13-89. The workbook is built and inspected in memory; the
   only thing mocked is the library itself, so the sheet CONTENT is real. */

const writeFile = vi.fn()

vi.mock('xlsx', async (importOriginal) => {
  const actual = await importOriginal<typeof import('xlsx')>()
  return { ...actual, writeFile: (...a: unknown[]) => writeFile(...a) }
})

import * as XLSX from 'xlsx'
import {
  buildJurnalAoa, buildYekunAoa, exportSerfiyyatWorkbook, smExportFilename,
  SM_EXPORT_HEADER, SM_SHEET_JURNAL, SM_SHEET_YEKUN, SM_SUMMARY_HEADER,
} from './serfiyyatExport'
import { today } from './format'

const row = (over: Partial<SmReportRow> = {}): SmReportRow => ({
  d: '2026-09-11', proj: 'Layihə A', item: 'Sement M400', code: '0000001', unit: 'kq',
  qty: 2, price: 5, sum: 10, kontragent: 'MMC', avto: '10-AA-123', kanal: 'Nağd',
  iv: '83951', note: 'qeyd', by: 'anbardar@example.com', docNum: 'SM-2026-000001', ...over,
})

beforeEach(() => vi.clearAllMocks())
afterEach(() => vi.unstubAllGlobals())

describe('the «Jurnal» sheet — M13-88', () => {
  it('carries the fifteen legacy columns in the exact legacy order', () => {
    expect(SM_EXPORT_HEADER).toEqual([
      'Tarix', 'Sənəd №', 'Qaimə №', 'Layihə', 'Material', 'Kod', 'Ölçü', 'Miqdar',
      'Qiymət', 'Cəm', 'Kontragent', 'Avtomobil', 'Alınma kanalı', 'Qeyd', 'Daxil edən',
    ])
    expect(SM_EXPORT_HEADER).toHaveLength(15)
  })

  it('writes one row per report row, in the header’s field order', () => {
    const aoa = buildJurnalAoa([row()])
    expect(aoa).toHaveLength(2)
    expect(aoa[1]).toEqual([
      '2026-09-11', 'SM-2026-000001', '83951', 'Layihə A', 'Sement M400', '0000001', 'kq',
      2, 5, 10, 'MMC', '10-AA-123', 'Nağd', 'qeyd', 'anbardar@example.com',
    ])
  })

  it('writes the header alone when there are no rows (boundary)', () => {
    expect(buildJurnalAoa([])).toEqual([SM_EXPORT_HEADER])
  })

  /* The RAW date and code, exactly as legacy writes them: no fmtD(), and no
     toNum() coercion that would strip a code's leading zeros. */
  it('writes the RAW ISO date and keeps the code’s leading zeros as text', () => {
    const aoa = buildJurnalAoa([row()])
    expect(aoa[1][0]).toBe('2026-09-11')
    expect(aoa[1][5]).toBe('0000001')
  })

  it('writes the STORED line_sum, not a recomputed qty*price', () => {
    expect(buildJurnalAoa([row({ sum: 99 })])[1][9]).toBe(99)
  })
})

describe('the «Yekun» sheet — M13-88', () => {
  it('carries the two-column header and per-project totals', () => {
    const aoa = buildYekunAoa([row({ proj: 'A', sum: 3 }), row({ proj: 'B', sum: 4 })])
    expect(aoa[0]).toEqual(SM_SUMMARY_HEADER)
    expect(aoa.slice(1)).toEqual([['A', 3], ['B', 4]])
  })

  it('aggregates repeats and preserves FIRST-APPEARANCE order', () => {
    const aoa = buildYekunAoa([
      row({ proj: 'Zəfər', sum: 5 }), row({ proj: 'Aran', sum: 100 }), row({ proj: 'Zəfər', sum: 7 }),
    ])
    expect(aoa.slice(1)).toEqual([['Zəfər', 12], ['Aran', 100]])
  })
})

describe('exportSerfiyyatWorkbook — M13-88', () => {
  it('writes a workbook with BOTH sheets, named «Jurnal» and «Yekun»', () => {
    const res = exportSerfiyyatWorkbook([row()])
    expect(res).toEqual({ ok: true, count: 1 })
    expect(writeFile).toHaveBeenCalledTimes(1)
    const wb = writeFile.mock.calls[0][0] as XLSX.WorkBook
    expect(wb.SheetNames).toEqual([SM_SHEET_JURNAL, SM_SHEET_YEKUN])
  })

  it('names the file Serfiyyat_materiallari_{today}.xlsx', () => {
    exportSerfiyyatWorkbook([row()])
    expect(writeFile.mock.calls[0][1]).toBe('Serfiyyat_materiallari_' + today() + '.xlsx')
    expect(smExportFilename()).toMatch(/^Serfiyyat_materiallari_\d{4}-\d{2}-\d{2}\.xlsx$/)
  })

  it('round-trips the real cell values into the «Jurnal» sheet', () => {
    exportSerfiyyatWorkbook([row()])
    const wb = writeFile.mock.calls[0][0] as XLSX.WorkBook
    const back = XLSX.utils.sheet_to_json(wb.Sheets[SM_SHEET_JURNAL], { header: 1 })
    expect(back[0]).toEqual(SM_EXPORT_HEADER)
    expect((back[1] as unknown[])[1]).toBe('SM-2026-000001')
  })

  /* Legacy bypasses xls() entirely: none of these workbook properties is set.
     A future "improvement" that routed this through the shared helper would
     add them and fail here. */
  it('sets NO autofilter, column-width or freeze-pane property on either sheet', () => {
    exportSerfiyyatWorkbook([row()])
    const wb = writeFile.mock.calls[0][0] as XLSX.WorkBook
    for (const name of [SM_SHEET_JURNAL, SM_SHEET_YEKUN]) {
      const ws = wb.Sheets[name] as Record<string, unknown>
      expect(ws['!autofilter']).toBeUndefined()
      expect(ws['!cols']).toBeUndefined()
      expect(ws['!freeze']).toBeUndefined()
    }
  })

  it('still writes both sheets for an empty report (boundary)', () => {
    expect(exportSerfiyyatWorkbook([])).toEqual({ ok: true, count: 0 })
    const wb = writeFile.mock.calls[0][0] as XLSX.WorkBook
    expect(wb.SheetNames).toEqual([SM_SHEET_JURNAL, SM_SHEET_YEKUN])
  })
})

/* M13-89 / D-N7 — the missing-library branch. The assertion that NOTHING is
   written is the falsifiable half: an implementation routed through the
   shared xls(), which falls back to CSV, would write a file here and fail. */
describe('the missing-library branch — M13-89, D-N7 (no CSV fallback)', () => {
  it('reports the exact message and writes NOTHING', () => {
    /* The guard tests `typeof XLSX.writeFile !== 'function'`, so the library
       is made unusable exactly the way a failed load leaves it. Restored in
       the same test, and the descriptor is captured first so the module
       namespace is put back byte-for-byte. */
    const ns = XLSX as unknown as Record<string, unknown>
    const original = Object.getOwnPropertyDescriptor(ns, 'writeFile')!
    Object.defineProperty(ns, 'writeFile', { value: undefined, configurable: true })
    try {
      const res = exportSerfiyyatWorkbook([row()])
      expect(res.ok).toBe(false)
      expect(res.error).toBe('Excel kitabxanası yüklənmədi')
      expect(res.count).toBe(0)
      expect(writeFile).not.toHaveBeenCalled()
    } finally {
      Object.defineProperty(ns, 'writeFile', original)
    }
  })
})
