import { describe, it, expect } from 'vitest'
import { movementExportMatrix, MOVEMENT_EXPORT_HEADER } from './movementExport'
import type { MovementFilterItem, MovementFilterRow } from './movementFilters'
import type { WriteoffValuationRow } from '../api/writeoffValuations.api'

/* M8-50 (I-7) — the ordinary «Mal hərəkəti» Excel matrix,
   index.html:1848-1849. Every expectation below is the legacy expression's
   own output, not a tidied version of it. */

const WH = ['Elet', 'Astara', 'Xocahəsən']

function mv(over: Partial<MovementFilterRow> = {}): MovementFilterRow {
  return {
    id: 'm1',
    item_code: 'A1',
    warehouse: 'Elet',
    date: '2026-09-01',
    type: 'Mədaxil',
    partner: 'Kontragent A',
    in_qty: 5,
    out_qty: null,
    invoice_num: 'INV-1',
    contract_num: 'CT-1',
    note: null,
    price: 10,
    created_at: '2026-09-01T08:00:00Z',
    doc_num: 'D-1',
    channel: null,
    created_by: null,
    ...over,
  } as MovementFilterRow
}

const items = (over: Partial<MovementFilterItem> = {}) =>
  new Map<string, MovementFilterItem>([
    ['A1', { name: 'Sement', price: 9, unit: 'kq', ...over }],
  ])

/** A stored valuation row; only the fields the export consumes. */
function val(over: Partial<WriteoffValuationRow> = {}): WriteoffValuationRow {
  return {
    movement_id: 'm1',
    source_amount: 100,
    known_amount: 100,
    unknown_qty: 0,
    final_amount: 100,
    valuation_method: 'lot',
    override_reason: null,
    ...over,
  }
}

const NO_VALS = new Map<string, WriteoffValuationRow>()
const NO_EMAILS = new Map<string, string>()

/** Column indexes, so a reorder fails loudly rather than silently. */
const C = {
  date: 0, wh: 1, code: 2, name: 3, unit: 4, type: 5, key: 6, channel: 7,
  in: 8, out: 9, price: 10, amount: 11, contract: 12, invoice: 13, by: 14,
} as const

describe('movementExportMatrix — shape and columns', () => {
  it('emits the exact legacy header, in order, as row 0', () => {
    const m = movementExportMatrix([], items(), WH, NO_VALS, NO_EMAILS, null)
    expect(m[0]).toEqual([
      'Tarix', 'Anbar', 'Kod', 'Malın adı', 'Ölçü', 'Növü',
      'İstiqamət / Kontragent', 'Alınma kanalı', 'Giriş', 'Çıxış',
      'Vahid qiyməti', 'Məbləğ', 'Müqavilə', 'Qaimə', 'Qeyd edən',
    ])
    expect(m[0]).toHaveLength(15)
  })

  it('exports a header-only workbook for an empty set — legacy does the same', () => {
    const m = movementExportMatrix([], items(), WH, NO_VALS, NO_EMAILS, null)
    expect(m).toHaveLength(1)
    expect(m[0]).toEqual(MOVEMENT_EXPORT_HEADER)
  })

  it('does not mutate the exported header constant between calls', () => {
    const a = movementExportMatrix([], items(), WH, NO_VALS, NO_EMAILS, null)
    ;(a[0] as unknown[])[0] = 'MUTATED'
    const b = movementExportMatrix([], items(), WH, NO_VALS, NO_EMAILS, null)
    expect(b[0]![0]).toBe('Tarix')
    expect(MOVEMENT_EXPORT_HEADER[0]).toBe('Tarix')
  })

  it('every body row has exactly 15 cells', () => {
    const m = movementExportMatrix([mv(), mv({ id: 'm2' })], items(), WH, NO_VALS, NO_EMAILS, null)
    expect(m).toHaveLength(3)
    for (const r of m.slice(1)) expect(r).toHaveLength(15)
  })

  it('preserves the order it is given — the export does not re-sort', () => {
    const rows = [mv({ id: 'a', date: '2026-01-01' }), mv({ id: 'b', date: '2026-09-09' })]
    const m = movementExportMatrix(rows, items(), WH, NO_VALS, NO_EMAILS, null)
    expect([m[1]![C.date], m[2]![C.date]]).toEqual(['2026-01-01', '2026-09-09'])
  })
})

describe('movementExportMatrix — cell rules', () => {
  it('writes the RAW date, not the dd.mm.yyyy screen format', () => {
    const m = movementExportMatrix([mv({ date: '2026-09-01' })], items(), WH, NO_VALS, NO_EMAILS, null)
    expect(m[1]![C.date]).toBe('2026-09-01')
  })

  it('writes the warehouse ALIAS via whLabel', () => {
    const m = movementExportMatrix([mv({ warehouse: 'Xocahəsən' })], items(), WH, NO_VALS, NO_EMAILS, null)
    expect(m[1]![C.wh]).toBe('Xocəsən')
  })

  it('takes name and unit from the nomenclature index', () => {
    const m = movementExportMatrix([mv()], items(), WH, NO_VALS, NO_EMAILS, null)
    expect(m[1]![C.name]).toBe('Sement')
    expect(m[1]![C.unit]).toBe('kq')
  })

  it('an unknown item exports empty name and unit, not undefined', () => {
    const m = movementExportMatrix(
      [mv({ item_code: 'GHOST' })], items(), WH, NO_VALS, NO_EMAILS, null,
    )
    expect(m[1]![C.name]).toBe('')
    expect(m[1]![C.unit]).toBe('')
  })

  it('an item whose unit is null exports an empty cell', () => {
    const m = movementExportMatrix([mv()], items({ unit: null }), WH, NO_VALS, NO_EMAILS, null)
    expect(m[1]![C.unit]).toBe('')
  })

  it('İstiqamət uses movKeyText — the canonical route for a resolved transfer', () => {
    /* The counterparty warehouse of a transfer lives in `partner`, not in
       `channel` — `channel` is the purchase channel and on a transfer it
       holds the stray warehouse name an old import left behind. */
    const t = mv({ type: 'Yerdəyişmə', warehouse: 'Elet', partner: 'Astara', out_qty: 3, in_qty: null })
    const m = movementExportMatrix([t], items(), WH, NO_VALS, NO_EMAILS, null)
    expect(String(m[1]![C.key])).toContain('Astara')
  })

  it('a non-transfer exports the partner text', () => {
    const m = movementExportMatrix([mv({ partner: 'Kontragent A' })], items(), WH, NO_VALS, NO_EMAILS, null)
    expect(m[1]![C.key]).toBe('Kontragent A')
  })

  it('Giriş / Çıxış are EMPTY, never 0, when absent or zero', () => {
    const m = movementExportMatrix(
      [mv({ in_qty: 0, out_qty: null })], items(), WH, NO_VALS, NO_EMAILS, null,
    )
    expect(m[1]![C.in]).toBe('')
    expect(m[1]![C.out]).toBe('')
    /* Explicitly NOT zero: a 0 would sum into a spreadsheet total. */
    expect(m[1]![C.in]).not.toBe(0)
  })

  it('a real quantity exports as a number', () => {
    const m = movementExportMatrix([mv({ in_qty: 5 })], items(), WH, NO_VALS, NO_EMAILS, null)
    expect(m[1]![C.in]).toBe(5)
  })

  it('contract and invoice fall back to empty strings', () => {
    const m = movementExportMatrix(
      [mv({ contract_num: null, invoice_num: null })], items(), WH, NO_VALS, NO_EMAILS, null,
    )
    expect(m[1]![C.contract]).toBe('')
    expect(m[1]![C.invoice]).toBe('')
  })

  it('channel falls back to an empty cell', () => {
    const m = movementExportMatrix([mv({ channel: null })], items(), WH, NO_VALS, NO_EMAILS, null)
    expect(m[1]![C.channel]).toBe('')
  })
})

describe('movementExportMatrix — the ordinary price/amount chain', () => {
  it('uses m.price when present, and amount = (in+out)*pr as a 2dp STRING', () => {
    const m = movementExportMatrix([mv({ in_qty: 5, price: 10 })], items(), WH, NO_VALS, NO_EMAILS, null)
    expect(m[1]![C.price]).toBe(10)
    expect(m[1]![C.amount]).toBe('50.00')
  })

  it('falls back to the nomenclature price when the row carries none', () => {
    const m = movementExportMatrix([mv({ price: null, in_qty: 2 })], items(), WH, NO_VALS, NO_EMAILS, null)
    expect(m[1]![C.price]).toBe(9)
    expect(m[1]![C.amount]).toBe('18.00')
  })

  it('no price anywhere → both price and amount are empty', () => {
    const m = movementExportMatrix(
      [mv({ price: null })], items({ price: null }), WH, NO_VALS, NO_EMAILS, null,
    )
    expect(m[1]![C.price]).toBe('')
    expect(m[1]![C.amount]).toBe('')
  })

  it('the nomenclature price is NEVER applied to a Silinmə row', () => {
    /* The write-off has no price of its own; legacy must not invent one from
       the item card, which would export a cost the write-off never used. */
    const m = movementExportMatrix(
      [mv({ type: 'Silinmə', price: null, in_qty: null, out_qty: 4 })],
      items({ price: 9 }), WH, NO_VALS, NO_EMAILS, null,
    )
    expect(m[1]![C.price]).toBe('')
    expect(m[1]![C.amount]).toBe('')
  })
})

describe('movementExportMatrix — Silinmə valuation (the map must be passed)', () => {
  const wo = (over: Partial<MovementFilterRow> = {}) =>
    mv({ type: 'Silinmə', in_qty: null, out_qty: 4, price: 10, ...over })

  it('a STORED valuation differing from qty × price wins over the fallback', () => {
    /* qty × price would be 40. The stored lot valuation says 33.60, and that
       is the accounting truth the sheet must carry. */
    const vals = new Map([['m1', val({ final_amount: 33.6, source_amount: 33.6 })]])
    const m = movementExportMatrix([wo()], items(), WH, vals, NO_EMAILS, null)
    expect(m[1]![C.amount]).toBe(33.6)
    expect(m[1]![C.amount]).not.toBe('40.00')
    /* Unit price is the 4dp quotient final/qty, not the row's own 10. */
    expect(m[1]![C.price]).toBe(8.4)
  })

  it('a stored final of ZERO exports 0, not an empty cell', () => {
    /* 0 is a determined amount — genuinely worth nothing — and is a different
       statement from «undeterminable». Only null is empty. */
    const vals = new Map([['m1', val({ final_amount: 0, known_amount: 0, unknown_qty: 0 })]])
    const m = movementExportMatrix([wo()], items(), WH, vals, NO_EMAILS, null)
    expect(m[1]![C.amount]).toBe(0)
    expect(m[1]![C.amount]).not.toBe('')

    /* The UNIT PRICE of that same row is EMPTY, and the asymmetry is legacy's
       own, verified against the source rather than assumed:

         pr   = v.final != null && +(m.o||0)>0 ? +(v.final/m.o).toFixed(4) : (m.pr||0)
              = 0 != null && 4 > 0  →  +(0/4).toFixed(4)  →  0
         cell = pr || ''  →  0 || ''  →  ''

       So a stored final of 0 does NOT fall back to the row's own price of 10:
       the quotient branch is taken, yields 0, and `|| ''` then blanks it.
       Meanwhile the amount column has no `||` guard and keeps the 0. Pinned
       because it looks like an inconsistency and must not be "fixed". */
    expect(m[1]![C.price]).toBe('')
  })

  it('a stored final of NULL exports an EMPTY amount, not 0', () => {
    const vals = new Map([['m1', val({ final_amount: null })]])
    const m = movementExportMatrix([wo()], items(), WH, vals, NO_EMAILS, null)
    expect(m[1]![C.amount]).toBe('')
    expect(m[1]![C.amount]).not.toBe(0)
  })

  it('NO stored valuation → the legacy qty × price fallback', () => {
    const m = movementExportMatrix([wo()], items(), WH, NO_VALS, NO_EMAILS, null)
    expect(m[1]![C.amount]).toBe(40)
    expect(m[1]![C.price]).toBe(10)
  })

  it('an unpriced write-off with no stored valuation exports empty, not zero', () => {
    const m = movementExportMatrix([wo({ price: 0 })], items(), WH, NO_VALS, NO_EMAILS, null)
    expect(m[1]![C.amount]).toBe('')
    expect(m[1]![C.price]).toBe('')
  })

  it('MUTATION GUARD: dropping the valuations map changes the exported amount', () => {
    /* If a future refactor read the map from the store — or defaulted it —
       this is the test that fails: the same row exports 33.6 with the map and
       the 40 fallback without it. */
    const vals = new Map([['m1', val({ final_amount: 33.6 })]])
    const withMap = movementExportMatrix([wo()], items(), WH, vals, NO_EMAILS, null)
    const without = movementExportMatrix([wo()], items(), WH, NO_VALS, NO_EMAILS, null)
    expect(withMap[1]![C.amount]).toBe(33.6)
    expect(without[1]![C.amount]).toBe(40)
    expect(withMap[1]![C.amount]).not.toEqual(without[1]![C.amount])
  })

  it('the valuation map is keyed by movement id, so it values only its own row', () => {
    const vals = new Map([['m1', val({ final_amount: 33.6 })]])
    const rows = [wo({ id: 'm1' }), wo({ id: 'm2' })]
    const m = movementExportMatrix(rows, items(), WH, vals, NO_EMAILS, null)
    expect(m[1]![C.amount]).toBe(33.6)
    expect(m[2]![C.amount]).toBe(40)
  })

  it('a valuation for a NON-Silinmə row is ignored — the type decides', () => {
    const vals = new Map([['m1', val({ final_amount: 33.6 })]])
    const m = movementExportMatrix([mv({ in_qty: 5, price: 10 })], items(), WH, vals, NO_EMAILS, null)
    expect(m[1]![C.amount]).toBe('50.00')
  })
})

describe('movementExportMatrix — «Qeyd edən»', () => {
  const ME = { sbId: 'u-me', name: 'Anbardar A' }

  it('a null created_by is the Excel import label, never blank', () => {
    const m = movementExportMatrix([mv({ created_by: null })], items(), WH, NO_VALS, NO_EMAILS, ME)
    expect(m[1]![C.by]).toBe('Excel idxalı')
  })

  it('a known id resolves to the directory email', () => {
    const emails = new Map([['u-1', 'user@example.com']])
    const m = movementExportMatrix([mv({ created_by: 'u-1' })], items(), WH, NO_VALS, emails, ME)
    expect(m[1]![C.by]).toBe('user@example.com')
  })

  it('the current user resolves to their own name when absent from the directory', () => {
    const m = movementExportMatrix([mv({ created_by: 'u-me' })], items(), WH, NO_VALS, NO_EMAILS, ME)
    expect(m[1]![C.by]).toBe('Anbardar A')
  })

  it('MUTATION GUARD: an unknown id never exports a raw UUID', () => {
    const id = '3f0c1a2e-0000-4000-8000-000000000001'
    const m = movementExportMatrix([mv({ created_by: id })], items(), WH, NO_VALS, NO_EMAILS, ME)
    expect(m[1]![C.by]).toBe('digər istifadəçi')
    expect(m[1]![C.by]).not.toBe(id)
  })
})
