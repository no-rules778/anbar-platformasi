import { describe, expect, it } from 'vitest'
import {
  qaimeReportRows, QAIME_COLS, defaultQaimeSelection, selectedColumns,
  isNumericColumn, dateCell, exportCell, screenCell, qaimeExportMatrix,
  QAIME_FIXED_HEADER, QAIME_SOURCE_NOTE, QAIME_EMPTY, type QaimeColumnKey,
} from './qaimeReport'
import type { MovementRow } from '../api/itemMovements.api'
import type { WriteoffValuationRow } from '../api/writeoffValuations.api'

/* T3 — «Qaimələr üzrə hesabat» (M14-74 … M14-90). Unit evidence only. */

const movement = (over: Partial<MovementRow>): MovementRow => ({
  id: 'm', item_code: 'A', warehouse: 'W', date: '2026-02-01', in_qty: 0,
  out_qty: 0, price: 0, partner: '', type: 'Satınalma', invoice_num: 'IV-1',
  note: '', doc_num: 'D-1', created_at: '', channel: '', contract_num: '',
  created_by: '', ...over,
})

const NO_VALUATIONS = new Map<string, WriteoffValuationRow>()

describe('grouping key — index.html:6856 (M14-74, M14-75)', () => {
  /* M14-74 — BOTH components. One Qaimə spanning two documents is TWO rows,
     which is the whole reason the legacy comment exists (6830-6834). */
  it('splits one Qaimə № across two document numbers into two groups', () => {
    const rows = qaimeReportRows([
      movement({ id: 'a', invoice_num: 'IV-9', doc_num: 'D-1' }),
      movement({ id: 'b', invoice_num: 'IV-9', doc_num: 'D-2' }),
    ], NO_VALUATIONS)
    expect(rows).toHaveLength(2)
    expect(rows.map((g) => g.doc).sort()).toEqual(['D-1', 'D-2'])
  })

  it('merges rows sharing both the Qaimə № and the document №', () => {
    const rows = qaimeReportRows([
      movement({ id: 'a', invoice_num: 'IV-9', doc_num: 'D-1' }),
      movement({ id: 'b', invoice_num: 'IV-9', doc_num: 'D-1' }),
    ], NO_VALUATIONS)
    expect(rows).toHaveLength(1)
    expect(rows[0].n).toBe(2)
  })

  it('keys a missing document number under the em-dash fallback', () => {
    const rows = qaimeReportRows([
      movement({ invoice_num: 'IV-9', doc_num: null }),
    ], NO_VALUATIONS)
    expect(rows[0].doc).toBe('—')
  })

  /* M14-75 — skipped ENTIRELY: no group, not even an empty-keyed one. */
  it('skips a row whose Qaimə № is empty, null or whitespace only', () => {
    const rows = qaimeReportRows([
      movement({ id: 'a', invoice_num: '' }),
      movement({ id: 'b', invoice_num: null }),
      movement({ id: 'c', invoice_num: '   ' }),
    ], NO_VALUATIONS)
    expect(rows).toEqual([])
  })

  it('trims the Qaimə № before using it as the key', () => {
    const rows = qaimeReportRows([
      movement({ id: 'a', invoice_num: ' IV-9 ', doc_num: 'D-1' }),
      movement({ id: 'b', invoice_num: 'IV-9', doc_num: 'D-1' }),
    ], NO_VALUATIONS)
    expect(rows).toHaveLength(1)
    expect(rows[0].iv).toBe('IV-9')
  })
})

describe('date range — 6865-6866, 6891/6909 (M14-79)', () => {
  it('tracks the minimum and maximum date across the group', () => {
    const rows = qaimeReportRows([
      movement({ id: 'a', date: '2026-03-05' }),
      movement({ id: 'b', date: '2026-01-02' }),
      movement({ id: 'c', date: '2026-02-01' }),
    ], NO_VALUATIONS)
    expect(rows[0].dMin).toBe('2026-01-02')
    expect(rows[0].dMax).toBe('2026-03-05')
  })

  it('renders one date when the range is a single day', () => {
    expect(dateCell({ dMin: '2026-01-02', dMax: '2026-01-02' }, true)).toBe('02.01.2026')
    expect(dateCell({ dMin: '2026-01-02', dMax: '2026-01-02' }, false)).toBe('2026-01-02')
  })

  /* The SCREEN formats through fmtD; the EXPORT keeps raw ISO (M14-79). */
  it('renders a span differently on screen and in the export', () => {
    const g = { dMin: '2026-01-02', dMax: '2026-03-05' }
    expect(dateCell(g, true)).toBe('02.01.2026 – 05.03.2026')
    expect(dateCell(g, false)).toBe('2026-01-02 – 2026-03-05')
  })
})

describe('notes — 6870 (M14-76)', () => {
  it('de-duplicates while preserving first-appearance order', () => {
    const rows = qaimeReportRows([
      movement({ id: 'a', note: 'second-seen' }),
      movement({ id: 'b', note: 'first-dupe' }),
      movement({ id: 'c', note: 'second-seen' }),
    ], NO_VALUATIONS)
    expect(rows[0].notes).toEqual(['second-seen', 'first-dupe'])
  })

  it('ignores empty notes entirely', () => {
    const rows = qaimeReportRows([
      movement({ id: 'a', note: '' }),
      movement({ id: 'b', note: null }),
    ], NO_VALUATIONS)
    expect(rows[0].notes).toEqual([])
  })

  /* M14-76 — there is NO length cap anywhere. A reviewer may expect one and
     "restore" it; this asserts the full string survives to both surfaces. */
  it('never truncates a long note, in the group or the export', () => {
    const long = 'x'.repeat(500)
    const rows = qaimeReportRows([movement({ note: long })], NO_VALUATIONS)
    expect(rows[0].notes[0]).toHaveLength(500)
    expect(String(exportCell(rows[0], 'note'))).toHaveLength(500)
    expect(screenCell(rows[0], 'note')).toHaveLength(500)
  })

  it('joins multiple notes with the legacy separator', () => {
    const rows = qaimeReportRows([
      movement({ id: 'a', note: 'one' }),
      movement({ id: 'b', note: 'two' }),
    ], NO_VALUATIONS)
    expect(exportCell(rows[0], 'note')).toBe('one · two')
  })
})

describe('quantity is a SUM — 6871 (M14-78)', () => {
  /* Deliberately contrasted against `tr`'s `(i || o)` fallthrough, which for
     the same row would yield 2 rather than 5. */
  it('adds incoming and outgoing rather than falling through', () => {
    const rows = qaimeReportRows([movement({ in_qty: 2, out_qty: 3 })], NO_VALUATIONS)
    expect(rows[0].qty).toBe(5)
  })
})

describe('value branching — 6872-6873 (M14-77)', () => {
  /* The non-Silinmə branch has NO item-price fallback: a zero movement price
     yields zero value even when the item card has a price. */
  it('values a non-Silinmə row by the movement price only, with no item fallback', () => {
    const rows = qaimeReportRows([
      movement({ type: 'Satınalma', in_qty: 2, out_qty: 0, price: 10 }),
    ], NO_VALUATIONS)
    expect(rows[0].val).toBe(20)
  })

  it('values a non-Silinmə row at zero when its own price is zero or null', () => {
    const zero = qaimeReportRows([
      movement({ type: 'Satınalma', in_qty: 2, price: 0 }),
    ], NO_VALUATIONS)
    expect(zero[0].val).toBe(0)

    const nul = qaimeReportRows([
      movement({ type: 'Satınalma', in_qty: 2, price: null }),
    ], NO_VALUATIONS)
    expect(nul[0].val).toBe(0)
  })

  /* A Silinmə row goes through movementValuation. With no stored valuation
     and a positive price it derives qty × price (the legacy fallback). */
  it('values a Silinmə row through movementValuation', () => {
    const rows = qaimeReportRows([
      movement({ type: 'Silinmə', out_qty: 3, price: 10 }),
    ], NO_VALUATIONS)
    expect(rows[0].val).toBe(30)
  })

  /* The null-final case: an unvalued write-off contributes 0, NOT NaN, and
     is not treated as «the row is worth nothing» anywhere else. */
  it('contributes zero for a Silinmə row whose valuation is genuinely null', () => {
    const rows = qaimeReportRows([
      movement({ type: 'Silinmə', out_qty: 3, price: 0 }),
    ], NO_VALUATIONS)
    expect(rows[0].val).toBe(0)
  })

  it('prefers a STORED valuation over the derived fallback', () => {
    const valuations = new Map<string, WriteoffValuationRow>([
      ['wo-1', {
        movement_id: 'wo-1', source_amount: 999, known_amount: 999,
        unknown_qty: 0, final_amount: 777, valuation_method: 'layer',
        override_reason: null,
      } as WriteoffValuationRow],
    ])
    const rows = qaimeReportRows([
      movement({ id: 'wo-1', type: 'Silinmə', out_qty: 3, price: 10 }),
    ], valuations)
    expect(rows[0].val).toBe(777)
  })
})

describe('sort order — 6876 (M14-80)', () => {
  /* Fixture OPPOSES the expected order: the earliest group is inserted first,
     so an unsorted implementation fails (§4). */
  it('sorts by the maximum date DESCENDING', () => {
    const rows = qaimeReportRows([
      movement({ id: 'a', invoice_num: 'IV-1', doc_num: 'D-1', date: '2026-01-01' }),
      movement({ id: 'b', invoice_num: 'IV-2', doc_num: 'D-2', date: '2026-06-01' }),
    ], NO_VALUATIONS)
    expect(rows.map((g) => g.iv)).toEqual(['IV-2', 'IV-1'])
  })

  it('tie-breaks by Qaimə № ascending when the dates match', () => {
    const rows = qaimeReportRows([
      movement({ id: 'b', invoice_num: 'IV-B', doc_num: 'D-2', date: '2026-01-01' }),
      movement({ id: 'a', invoice_num: 'IV-A', doc_num: 'D-1', date: '2026-01-01' }),
    ], NO_VALUATIONS)
    expect(rows.map((g) => g.iv)).toEqual(['IV-A', 'IV-B'])
  })
})

describe('column model — 6835-6849 (M14-81 … M14-84)', () => {
  it('carries exactly eleven columns in the legacy order', () => {
    expect(QAIME_COLS.map((c) => c.k)).toEqual([
      'date', 'type', 'wh', 'partner', 'ch', 'ct', 'lines', 'qty', 'val', 'note', 'by',
    ])
  })

  it('carries the exact legacy column titles', () => {
    expect(QAIME_COLS.map((c) => c.t)).toEqual([
      'Tarix', 'Növ', 'Anbar(lar)', 'Kontragent', 'Kanal', 'Müqavilə №',
      'Sətir sayı', 'Miqdar', 'Məbləğ', 'Qeyd', 'Qeyd edən',
    ])
  })

  /* M14-82 — seven ON, four OFF. */
  it('defaults seven columns on and four off', () => {
    const sel = defaultQaimeSelection()
    expect(Object.values(sel).filter(Boolean)).toHaveLength(7)
    expect(Object.values(sel).filter((v) => !v)).toHaveLength(4)
    expect(sel.date && sel.type && sel.wh && sel.partner && sel.lines && sel.qty && sel.val).toBe(true)
    expect(sel.ch || sel.ct || sel.note || sel.by).toBe(false)
  })

  it('names the two fixed leading columns', () => {
    expect(QAIME_FIXED_HEADER).toEqual(['Qaimə №', 'Sənəd №'])
  })

  /* M14-84 — alignment is decided by the key, not by cell content. */
  it('right-aligns exactly the qty, val and lines columns', () => {
    const numeric = QAIME_COLS.filter((c) => isNumericColumn(c.k)).map((c) => c.k)
    expect(numeric).toEqual(['lines', 'qty', 'val'])
  })

  it('filters to the selected columns in the fixed order', () => {
    const sel = defaultQaimeSelection()
    sel.note = true
    sel.date = false
    expect(selectedColumns(sel).map((c) => c.k)).toEqual([
      'type', 'wh', 'partner', 'lines', 'qty', 'val', 'note',
    ])
  })
})

describe('set cells — 6892-6900 vs 6909-6919 (M14-85)', () => {
  const rows = qaimeReportRows([
    movement({ id: 'a', warehouse: 'W1', partner: 'P1', channel: 'Nağd', contract_num: 'C1', created_by: 'u1' }),
    movement({ id: 'b', warehouse: 'W2', partner: 'P2', channel: 'Nağd', contract_num: 'C2', created_by: 'u2' }),
  ], NO_VALUATIONS)

  it('joins a populated set with a comma and space', () => {
    expect(exportCell(rows[0], 'wh')).toBe('W1, W2')
    expect(exportCell(rows[0], 'partner')).toBe('P1, P2')
  })

  it('de-duplicates repeated set values', () => {
    expect(exportCell(rows[0], 'ch')).toBe('Nağd')
  })

  /* The screen/export divergence: «—» vs the empty string. */
  it('renders an empty set as an em-dash on screen and an empty string in the export', () => {
    const empty = qaimeReportRows([movement({ partner: '', channel: '', contract_num: '', created_by: '' })], NO_VALUATIONS)
    for (const k of ['partner', 'ch', 'ct', 'by'] as QaimeColumnKey[]) {
      expect(screenCell(empty[0], k)).toBe('—')
      expect(exportCell(empty[0], k)).toBe('')
    }
  })
})

describe('export matrix — 6905-6919 (M14-89)', () => {
  it('builds the header from the fixed columns plus the selection', () => {
    const rows = qaimeReportRows([
      movement({ invoice_num: 'IV-1', doc_num: 'D-1', in_qty: 2, price: 10, date: '2026-02-01', type: 'Satınalma', warehouse: 'W', partner: 'P' }),
    ], NO_VALUATIONS)
    const matrix = qaimeExportMatrix(rows, defaultQaimeSelection())
    expect(matrix[0]).toEqual([
      'Qaimə №', 'Sənəd №', 'Tarix', 'Növ', 'Anbar(lar)', 'Kontragent',
      'Sətir sayı', 'Miqdar', 'Məbləğ',
    ])
    expect(matrix[1]).toEqual([
      'IV-1', 'D-1', '2026-02-01', 'Satınalma', 'W', 'P', 1, 2, '20.00',
    ])
  })

  /* M14-86 — changing the selection changes both header and body. */
  it('follows the selection, adding and removing columns together', () => {
    const rows = qaimeReportRows([movement({ note: 'N1' })], NO_VALUATIONS)
    const sel = defaultQaimeSelection()
    sel.note = true
    sel.val = false
    const matrix = qaimeExportMatrix(rows, sel)
    expect(matrix[0]).toContain('Qeyd')
    expect(matrix[0]).not.toContain('Məbləğ')
    expect(matrix[1][matrix[0].indexOf('Qeyd')]).toBe('N1')
  })

  it('emits a header-only matrix when there are no groups', () => {
    const matrix = qaimeExportMatrix([], defaultQaimeSelection())
    expect(matrix).toHaveLength(1)
  })
})

describe('fixed strings — 6920-6924 (M14-90)', () => {
  it('carries the exact source note and empty state', () => {
    expect(QAIME_SOURCE_NOTE).toBe('mənbə: qeyd edilmiş və ləğv edilməmiş əməliyyatlar.')
    expect(QAIME_EMPTY).toBe('Qaimə № yazılmış sənəd tapılmadı.')
  })
})
