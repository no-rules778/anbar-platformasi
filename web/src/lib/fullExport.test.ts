import { describe, it, expect, vi, beforeEach } from 'vitest'

/* «⬇ Tam ixrac» — index.html:7597-7671.

   ═══ SYNTHETIC FIXTURES ONLY. NO REAL EXPORT WAS RUN. ═══

   Every row below is invented in this file. Nothing was read from TEST or
   production and no file was written: `XLSX.writeFile` is the only replaced
   export, so the workbook is captured in memory instead of hitting the disk.

   Each block states the DEFECTIVE VARIANT it would catch, so a rule that
   stops holding fails a named test rather than surviving to a manual check. */

const writeFile = vi.fn()
vi.mock('xlsx', async (orig) => {
  const actual = await orig<typeof import('xlsx')>()
  return { ...actual, writeFile: (...a: unknown[]) => writeFile(...a) }
})

import * as XLSX from 'xlsx'
import {
  BAL_HEADER, FIL_HEADER, FULL_EXPORT_NO_XLSX,
  FULL_EXPORT_RAW_SHEETS, FULL_EXPORT_SHEETS, KNT_HEADER, MOV_HEADER, NOM_HEADER,
  RAW_ITEMS_HEADER, RAW_MOVS_HEADER, RAW_PARTNERS_HEADER,
  activePositionCount, balanceMatrix, fullExportFileName,
  fullExportWidths, movementRegistryMatrix, nomenclatureMatrix, partnersMatrix,
  purchasesMatrix, rawItemsMatrix, rawMovementsMatrix, rawPartnersMatrix,
  type FullExportInput,
} from './fullExport'
import { fullRunExport } from './fullExportRun'
import { buildItemIndexes } from './itemIndex'

beforeEach(() => vi.clearAllMocks())

const items = [
  { code: '0000002', name: 'Mismar', unit: 'ədəd', price: 2, category: null },
  { code: '0000001', name: 'Sement M400', unit: 'kq', price: 10, category: null },
]

const mov = (over: Record<string, unknown> = {}) => ({
  id: 'm1', item_code: '0000001', warehouse: 'Ələt', date: '2026-01-05',
  in_qty: 4, out_qty: 0, price: 12, partner: 'Azpetrol', type: 'Satınalma',
  invoice_num: 'IV-1', contract_num: 'CT-1', channel: 'Nağd alış',
  note: 'qeyd', doc_num: 'D-1', created_at: '2026-01-05T10:00:00Z',
  created_by: null, cancelled: false,
  ...over,
}) as unknown as Parameters<typeof buildItemIndexes>[1][number]

const movements = [
  mov({ id: 'b', date: '2026-02-01', item_code: '0000002', in_qty: 0, out_qty: 1, type: 'Sahəyə', warehouse: 'Astara', price: null, created_at: '2026-02-01T09:00:00Z' }),
  mov({ id: 'a', date: '2026-01-05' }),
]

const partners = [
  { name: 'Azpetrol', voen: '1234567890', contract: 'CT-1', contract_date: '2026-01-01' },
  { name: 'Bravo MMC', voen: null, contract: null, contract_date: null },
]

function input(over: Partial<FullExportInput> = {}): FullExportInput {
  const indexes = buildItemIndexes(items as never, movements as never)
  return { movements: indexes.operational, items: items as never, partners, indexes, ...over }
}

describe('movementRegistryMatrix — «Hərəkət registri» (7603-7609)', () => {
  it('uses the exact legacy 15-column header', () => {
    expect(movementRegistryMatrix(input())[0]).toEqual([...MOV_HEADER])
  })

  /* DEFECTIVE VARIANT: leaving rows in array order. The fixture is built
     DESCENDING by date on purpose, so an unsorted implementation fails. */
  it('sorts by date ascending, not by array order', () => {
    const rows = movementRegistryMatrix(input()).slice(1)
    expect(rows.map((r) => r[0])).toEqual(['2026-01-05', '2026-02-01'])
  })

  /* DEFECTIVE VARIANT: `it.price || m.price` (the wrong precedence). The
     movement carries 12 while the item carries 10 — the row must show 12. */
  it('prefers the movement price over the item price', () => {
    const row = movementRegistryMatrix(input()).slice(1)[0]
    expect(row[10]).toBe(12)
  })

  it('falls back to the item price when the movement has none', () => {
    const row = movementRegistryMatrix(input()).slice(1)[1]
    /* Mismar, price 2, out 1 → amount (0+1)*2 = '2.00'. */
    expect(row[10]).toBe(2)
    expect(row[11]).toBe('2.00')
  })

  /* DEFECTIVE VARIANT: exporting 0 instead of an empty cell — a zero would
     sum into a spreadsheet total as a real movement. */
  it('exports an absent quantity as an EMPTY cell, never 0', () => {
    const row = movementRegistryMatrix(input()).slice(1)[0]
    expect(row[9]).toBe('')
    expect(row[8]).toBe(4)
  })

  it('computes «Məbləğ» as (in+out)×price, 2dp string', () => {
    const row = movementRegistryMatrix(input()).slice(1)[0]
    expect(row[11]).toBe('48.00')
  })
})

describe('balanceMatrix — «Anbar qalıqları» (7613-7617)', () => {
  it('uses the exact legacy 9-column header', () => {
    expect(balanceMatrix(input())[0]).toEqual([...BAL_HEADER])
  })

  /* DEFECTIVE VARIANT: keeping zero-quantity rows. A fully consumed position
     is not a balance line (7615). */
  it('drops a position whose quantity nets to zero', () => {
    const zeroed = [
      mov({ id: 'z1', item_code: '0000001', warehouse: 'Ofis', in_qty: 5, out_qty: 0 }),
      mov({ id: 'z2', item_code: '0000001', warehouse: 'Ofis', in_qty: 0, out_qty: 5, type: 'Sahəyə' }),
    ]
    const ix = buildItemIndexes(items as never, zeroed as never)
    const rows = balanceMatrix({ movements: ix.operational, items: items as never, partners, indexes: ix }).slice(1)
    expect(rows.find((r) => r[0] === 'Ofis')).toBeUndefined()
  })

  it('sorts by warehouse then item name', () => {
    const rows = balanceMatrix(input()).slice(1)
    expect(rows.map((r) => r[0])).toEqual(['Astara', 'Ələt'])
  })

  it('exports a missing price as an empty cell rather than 0', () => {
    const noPrice = [{ code: 'X1', name: 'Naməlum', unit: 'ədəd', price: null, category: null }]
    const ms = [mov({ id: 'x', item_code: 'X1', in_qty: 2, out_qty: 0 })]
    const ix = buildItemIndexes(noPrice as never, ms as never)
    const row = balanceMatrix({ movements: ix.operational, items: noPrice as never, partners, indexes: ix }).slice(1)[0]
    expect(row[7]).toBe('')
    expect(row[8]).toBe('')
  })
})

describe('purchasesMatrix — «Satınalmalar» (7621-7626)', () => {
  it('uses the exact legacy 11-column header', () => {
    expect(purchasesMatrix(input())[0]).toEqual([...FIL_HEADER])
  })

  /* DEFECTIVE VARIANT: exporting every movement. Only «Satınalma» belongs. */
  it('includes ONLY Satınalma rows', () => {
    const rows = purchasesMatrix(input()).slice(1)
    expect(rows).toHaveLength(1)
    expect(rows[0][1]).toBe('Sement M400')
  })

  it('uses the INBOUND quantity and in×price for the amount', () => {
    const row = purchasesMatrix(input()).slice(1)[0]
    expect(row[4]).toBe(4)
    expect(row[6]).toBe(48)
  })
})

describe('nomenclatureMatrix — «Nomenklatura» (7630-7634)', () => {
  it('uses the exact legacy 6-column header', () => {
    expect(nomenclatureMatrix(input())[0]).toEqual([...NOM_HEADER])
  })

  /* DEFECTIVE VARIANT: sorting by name, or echoing input order. The fixture
     lists Mismar first, so a code sort must reorder it. */
  it('sorts by CODE, not by input order', () => {
    const rows = nomenclatureMatrix(input()).slice(1)
    expect(rows.map((r) => r[0])).toEqual(['0000001', '0000002'])
  })

  /* DEFECTIVE VARIANT: dropping stockless items. Every item exports. */
  it('exports an item with no balance as quantity 0', () => {
    const extra = [...items, { code: '0000009', name: 'Yeni', unit: 'm', price: null, category: null }]
    const ix = buildItemIndexes(extra as never, movements as never)
    const row = nomenclatureMatrix({ movements: ix.operational, items: extra as never, partners, indexes: ix })
      .slice(1).find((r) => r[0] === '0000009')
    expect(row).toBeDefined()
    expect(row![4]).toBe(0)
    expect(row![3]).toBe('')
  })
})

describe('partnersMatrix — «Kontragentlər» (7638-7639)', () => {
  it('uses the exact legacy 4-column header', () => {
    expect(partnersMatrix(input())[0]).toEqual([...KNT_HEADER])
  })

  it('preserves load order and empties every absent field', () => {
    const rows = partnersMatrix(input()).slice(1)
    expect(rows[0]).toEqual(['Azpetrol', '1234567890', 'CT-1', '2026-01-01'])
    expect(rows[1]).toEqual(['Bravo MMC', '', '', ''])
  })
})

describe('the three RAW sheets (7655-7667)', () => {
  it('_movements uses the lowercase DB column names', () => {
    expect(rawMovementsMatrix(input())[0]).toEqual([...RAW_MOVS_HEADER])
  })

  /* DEFECTIVE VARIANT: reusing the presentation empty-cell rule. The raw
     sheets are a DB echo, so an absent quantity is a real 0 here. */
  it('_movements writes 0 for an absent quantity, unlike the registry', () => {
    const row = rawMovementsMatrix(input()).slice(1).find((r) => r[2] === '0000002')
    expect(row![3]).toBe(0)
    expect(row![4]).toBe(1)
  })

  it('_items and _partners carry their DB headers', () => {
    expect(rawItemsMatrix(input())[0][0]).toBe('code')
    expect(rawPartnersMatrix(input())[0]).toEqual(['name', 'voen', 'contract', 'contract_date'])
  })
})

describe('widths and filename', () => {
  /* index.html:7645-7649 — `m` STARTS at 6 and the result is `min(m+2, 55)`,
     so the narrowest possible column is 8, not 6. (This differs from
     `xls()`, which measures 400 rows with its own `max(m+2, 8)` floor.) */
  it('floors the measured width at 8 and caps it at 55', () => {
    expect(fullExportWidths([['ab'], ['x'.repeat(90)]])[0].wch).toBe(55)
    expect(fullExportWidths([['a'], ['b']])[0].wch).toBe(8)
    /* A 20-char cell is measured, not floored: 20 + 2 padding. */
    expect(fullExportWidths([['h'], ['y'.repeat(20)]])[0].wch).toBe(22)
  })

  it('builds Anbar_<day>.xlsx', () => {
    expect(fullExportFileName('2026-09-13')).toBe('Anbar_2026-09-13.xlsx')
  })

  it('counts only non-zero positions', () => {
    expect(activePositionCount(input().indexes)).toBe(2)
  })
})

describe('fullRunExport — the workbook (7599-7670)', () => {
  it('appends the eight sheets in the exact legacy order', () => {
    const out = fullRunExport(input(), { day: '2026-09-13' })
    expect(out.ok).toBe(true)
    const wb = writeFile.mock.calls[0][0] as XLSX.WorkBook
    expect(wb.SheetNames).toEqual([...FULL_EXPORT_SHEETS, ...FULL_EXPORT_RAW_SHEETS])
  })

  it('writes the legacy filename and reports the legacy toast', () => {
    const out = fullRunExport(input(), { day: '2026-09-13' })
    expect(writeFile.mock.calls[0][1]).toBe('Anbar_2026-09-13.xlsx')
    expect(out.message).toContain('Anbar_2026-09-13.xlsx yükləndi')
    expect(out.message).toContain('2 hərəkət')
    expect(out.message).toContain('2 mal')
    expect(out.message).toContain('2 aktiv mövqe')
  })

  /* The serializer runs for real, so this proves the matrices survive into
     readable cells rather than only into an intermediate object. */
  it('round-trips through the real SheetJS writer and reader', () => {
    fullRunExport(input(), { day: '2026-09-13' })
    const wb = writeFile.mock.calls[0][0] as XLSX.WorkBook
    const back = XLSX.read(XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }), { type: 'buffer' })
    const rows = XLSX.utils.sheet_to_json(back.Sheets['Hərəkət registri'], { header: 1 }) as unknown[][]
    expect(rows[0]).toEqual([...MOV_HEADER])
    expect(rows[1][1]).toBe('Ələt')
  })

  it('sets an autofilter and frozen header on a presentation sheet', () => {
    fullRunExport(input(), { day: '2026-09-13' })
    const wb = writeFile.mock.calls[0][0] as XLSX.WorkBook
    const ws = wb.Sheets['Hərəkət registri'] as Record<string, unknown>
    expect(ws['!autofilter']).toBeTruthy()
    expect(ws['!freeze']).toEqual({ xSplit: 0, ySplit: 1 })
    expect((ws['!cols'] as unknown[]).length).toBe(MOV_HEADER.length)
  })

  /* DEFECTIVE VARIANT: coercing the raw sheets too. A VÖEN must stay a
     string; `toNum` would turn '1234567890' into a number. */
  it('leaves the raw partner VÖEN a string', () => {
    fullRunExport(input(), { day: '2026-09-13' })
    const wb = writeFile.mock.calls[0][0] as XLSX.WorkBook
    expect((wb.Sheets._partners as Record<string, { v: unknown }>).B2.v).toBe('1234567890')
  })

  /* ═══ EMPTY-SNAPSHOT PARITY. ═══
     DEFECTIVE VARIANT: refusing an empty snapshot. Legacy has no emptiness
     check — its only refusal is the missing-library guard (7598) — so a port
     that returned `ok: false` here would diverge from production. The
     assertions below are the falsifiable form of "writes the legacy file":
     the download happens, under the legacy name, carrying all eight sheets
     with their header rows and nothing else. */
  it('exports a headers-only workbook for an empty snapshot', () => {
    const ix = buildItemIndexes([], [])
    const out = fullRunExport(
      { movements: [], items: [], partners: [], indexes: ix }, { day: '2026-09-13' },
    )

    expect(out.ok).toBe(true)
    expect(out.isError).toBe(false)
    expect(out.fileName).toBe('Anbar_2026-09-13.xlsx')

    expect(writeFile).toHaveBeenCalledTimes(1)
    expect(writeFile.mock.calls[0][1]).toBe('Anbar_2026-09-13.xlsx')

    const wb = writeFile.mock.calls[0][0] as XLSX.WorkBook
    expect(wb.SheetNames).toEqual([...FULL_EXPORT_SHEETS, ...FULL_EXPORT_RAW_SHEETS])

    /* Each sheet carries its header row and NO body row: read back through
       the real serializer so this asserts cells, not the matrix objects. */
    const back = XLSX.read(XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }), { type: 'buffer' })
    const headers = [
      MOV_HEADER, BAL_HEADER, FIL_HEADER, NOM_HEADER, KNT_HEADER,
      RAW_ITEMS_HEADER, RAW_MOVS_HEADER, RAW_PARTNERS_HEADER,
    ]
    const names = [...FULL_EXPORT_SHEETS, ...FULL_EXPORT_RAW_SHEETS]
    names.forEach((name, i) => {
      const rows = XLSX.utils.sheet_to_json(back.Sheets[name], { header: 1 }) as unknown[][]
      expect(rows).toHaveLength(1)
      expect(rows[0]).toEqual([...headers[i]])
    })
  })

  it('still exports when there are items but no movements', () => {
    const ix = buildItemIndexes(items as never, [])
    const out = fullRunExport({ movements: [], items: items as never, partners, indexes: ix }, { day: 'd' })
    expect(out.ok).toBe(true)
    expect(writeFile).toHaveBeenCalledTimes(1)
  })

  it('reports the legacy library-missing refusal and writes nothing', () => {
    const out = fullRunExport(input(), { xlsx: null })
    expect(out.ok).toBe(false)
    expect(out.message).toBe(FULL_EXPORT_NO_XLSX)
    expect(writeFile).not.toHaveBeenCalled()
  })
})

/* The no-divergence rule: the export must not re-derive anything. These pin
   the exported figures to `buildItemIndexes`, the accepted derivation the
   Balances page already uses. */
describe('no calculation diverges from the accepted derivations', () => {
  it('balance quantities equal IX.bal exactly', () => {
    const inp = input()
    const rows = balanceMatrix(inp).slice(1)
    for (const r of rows) {
      const src = inp.indexes.bal.find((b) => b.c === r[1] && b.name === r[2])
      expect(r[6]).toBe(src!.q)
      expect(r[4]).toBe(src!.in)
      expect(r[5]).toBe(src!.out)
    }
  })

  it('nomenclature totals equal IX.byItem exactly', () => {
    const inp = input()
    for (const r of nomenclatureMatrix(inp).slice(1)) {
      const bi = inp.indexes.byItem.get(r[0] as string)
      expect(r[4]).toBe(bi?.q || 0)
    }
  })

  /* The cancellation model has NO boolean column: a cancellation is encoded
     in the row's `note` text (lib/operationalMovements.ts, ported from
     index.html:1249-1269). So the fixture uses a real legacy marker — the
     `Ləğv ID:` shape — which hides BOTH the named row and the marker row
     itself. An invented `cancelled: true` flag would be ignored by that
     model and would make this test vacuous. */
  it('exports the cancellation-filtered operational set, not raw movements', () => {
    const withCancel = [
      ...movements,
      mov({ id: 'victim', date: '2026-03-01', type: 'Silinmə', note: null }),
      mov({ id: 'marker', date: '2026-03-02', type: 'Silinmə', note: 'Ləğv ID: victim' }),
    ]
    const ix = buildItemIndexes(items as never, withCancel as never)
    /* The derivation itself drops both rows — this export re-derives nothing. */
    expect(ix.operational.map((m) => m.id)).not.toContain('victim')
    expect(ix.operational.map((m) => m.id)).not.toContain('marker')

    const rows = movementRegistryMatrix({
      movements: ix.operational, items: items as never, partners, indexes: ix,
    }).slice(1)
    expect(rows.find((r) => r[0] === '2026-03-01')).toBeUndefined()
    expect(rows.find((r) => r[0] === '2026-03-02')).toBeUndefined()
    /* The surviving rows are exactly the two operational fixtures. */
    expect(rows).toHaveLength(2)
  })
})
