import { describe, it, expect } from 'vitest'
import {
  documentViewKind,
  assembleDocumentView,
  IMMUTABLE_RECORD_REFUSAL,
  type DocumentViewMovement,
  type ValuationLookup,
} from './documentView'

/* Read-only document inspection — M8-15 … M8-22, I-3.

   Behaviour is checked against index.html:4868-4943 (state), 5012-5087
   (ordinary), 5209-5263 (transfer), 5264-5308 (legacy) and 5506-5514
   (dispatcher). */

let seq = 0
function mov(p: Partial<DocumentViewMovement> = {}): DocumentViewMovement {
  return {
    id: p.id ?? 'm' + ++seq,
    item_code: 'C1',
    date: '2026-09-01',
    type: 'Satınalma',
    warehouse: 'Ələt',
    partner: 'Kontragent',
    in_qty: 1,
    out_qty: 0,
    price: 10,
    invoice_num: null,
    contract_num: null,
    note: null,
    doc_num: null,
    channel: null,
    created_by: null,
    created_at: '2026-09-01T00:00:00Z',
    ...p,
  } as DocumentViewMovement
}

const NO_VALUATIONS: ValuationLookup = { has: () => false }

function assemble(
  m: DocumentViewMovement,
  allRows: DocumentViewMovement[],
  valuations: ValuationLookup = NO_VALUATIONS,
) {
  return assembleDocumentView({
    movement: m,
    allRows,
    itemName: (c) => 'Ad ' + c,
    direction: (r) =>
      r.type === 'Yerdəyişmə' ? 'Ələt → Astara' : ((r.in_qty || 0) > 0 ? 'Mədaxil: ' : 'Məxaric: ') + r.warehouse,
    valuations,
  })
}

describe('documentViewKind — the four-way dispatcher (index.html:5506-5512)', () => {
  it('Yerdəyişmə WITH doc_num opens the transfer document view', () => {
    expect(documentViewKind(mov({ type: 'Yerdəyişmə', doc_num: 'T-1' }))).toBe('transfer-doc')
  })

  it('Yerdəyişmə WITHOUT doc_num opens the legacy transfer view', () => {
    expect(documentViewKind(mov({ type: 'Yerdəyişmə', doc_num: null }))).toBe('legacy-transfer')
  })

  it('a CANCELLABLE_TYPES row WITH doc_num opens the ordinary document view', () => {
    for (const t of ['Satınalma', 'Əvvələ qalıq', 'Qaytarma', 'İcarə', 'Silinmə', 'Sahəyə', 'Satış']) {
      expect(documentViewKind(mov({ type: t, doc_num: 'D-1' }))).toBe('ordinary-doc')
    }
  })

  it('a CANCELLABLE_TYPES row WITHOUT doc_num opens the legacy ordinary view', () => {
    for (const t of ['Satınalma', 'Əvvələ qalıq', 'Qaytarma', 'İcarə', 'Silinmə', 'Sahəyə', 'Satış']) {
      expect(documentViewKind(mov({ type: t, doc_num: null }))).toBe('legacy-ordinary')
    }
  })

  /* MUTATION: an unsupported type falling through to the ordinary branch. The
     legacy dispatcher refuses it (index.html:5514) and opens no view at all. */
  it('an unsupported type is refused, with or without a doc_num', () => {
    expect(documentViewKind(mov({ type: 'Naməlum', doc_num: 'D-1' }))).toBe('unsupported')
    expect(documentViewKind(mov({ type: 'Naməlum', doc_num: null }))).toBe('unsupported')
    expect(assemble(mov({ type: 'Naməlum', doc_num: 'D-1' }), [])).toBeNull()
  })

  /* MUTATION: `Yerdəyişmə` tested after CANCELLABLE_TYPES, or added to that
     list. It must NEVER take an ordinary branch — the families use different
     markers and different RPCs. */
  it('Yerdəyişmə never takes an ordinary branch', () => {
    const kinds = [
      documentViewKind(mov({ type: 'Yerdəyişmə', doc_num: 'T-1' })),
      documentViewKind(mov({ type: 'Yerdəyişmə', doc_num: null })),
    ]
    expect(kinds).not.toContain('ordinary-doc')
    expect(kinds).not.toContain('legacy-ordinary')
  })

  /* MUTATION: trimming `doc_num` before the truthiness test. Legacy dispatches
     on `m.doc ? … : …` over `r.doc_num || ''` (index.html:943, 5509-5512), so
     ONLY null and '' are doc-less; a whitespace-only string is truthy there and
     opens a DOCUMENT view. Trimming would reroute it to the legacy branch. */
  it('only null and empty doc_num are doc-less; whitespace stays a document', () => {
    expect(documentViewKind(mov({ type: 'Satınalma', doc_num: null }))).toBe('legacy-ordinary')
    expect(documentViewKind(mov({ type: 'Satınalma', doc_num: '' }))).toBe('legacy-ordinary')
    expect(documentViewKind(mov({ type: 'Satınalma', doc_num: '  ' }))).toBe('ordinary-doc')
    expect(documentViewKind(mov({ type: 'Yerdəyişmə', doc_num: '  ' }))).toBe('transfer-doc')
  })

  /* MUTATION: trimming the retained document number. Legacy keeps the stored
     string verbatim, so the header renders it as-is and it never collapses
     onto a differently-spaced value. */
  it('retains the doc number verbatim, untrimmed', () => {
    const m = mov({ type: 'Satınalma', doc_num: ' D-1 ' })
    expect(assemble(m, [m])?.docNum).toBe(' D-1 ')
  })

  /* MUTATION: grouping with a trimmed comparison. Legacy groups on exact
     equality (`x.doc === doc`), so numbers differing only by surrounding
     whitespace are DIFFERENT documents and must not be merged. */
  it('groups on exact doc_num equality, not a trimmed match', () => {
    const a = mov({ id: 'a', type: 'Satınalma', doc_num: 'D-1' })
    const spaced = mov({ id: 'b', type: 'Satınalma', doc_num: ' D-1' })
    const view = assemble(a, [a, spaced])
    expect(view?.lines.map((l) => l.id)).toEqual(['a'])
    expect(view?.headerLineCount).toBe(1)
  })

  it('the refusal text is the legacy sentence, verbatim', () => {
    expect(IMMUTABLE_RECORD_REFUSAL).toBe(
      'Keçirilmiş qeyd dəyişdirilmir və silinmir. Düzəliş üçün ayrıca storno əməliyyatı tələb olunur.',
    )
  })
})

describe('ordinary document grouping (index.html:5014)', () => {
  /* MUTATION: grouping on `doc_num` ALONE. A differently-typed row sharing the
     number would join the document and be counted and displayed as part of it. */
  it('groups only rows with the same doc_num AND the same type', () => {
    const clicked = mov({ id: 'a', type: 'Satınalma', doc_num: 'D-1' })
    const sameDoc = mov({ id: 'b', type: 'Satınalma', doc_num: 'D-1' })
    const otherType = mov({ id: 'c', type: 'Qaytarma', doc_num: 'D-1' })
    const otherDoc = mov({ id: 'd', type: 'Satınalma', doc_num: 'D-2' })
    const rows = [clicked, sameDoc, otherType, otherDoc]

    const v = assemble(clicked, rows)!
    expect(v.lines.map((l) => l.id)).toEqual(['a', 'b'])
    expect(v.lines.map((l) => l.id)).not.toContain('c')
  })

  it('a doc-less record is its own single line and invents no document number', () => {
    const clicked = mov({ id: 'a', type: 'Satınalma', doc_num: null })
    const other = mov({ id: 'b', type: 'Satınalma', doc_num: null })
    const v = assemble(clicked, [clicked, other])!
    expect(v.kind).toBe('legacy-ordinary')
    expect(v.docNum).toBe('')
    expect(v.lines.map((l) => l.id)).toEqual(['a'])
  })
})

describe('row-level stripping in the document views (M8-20)', () => {
  /* MUTATION: stripRowLevelCancelled() not applied — the cancelled original
     and its technical marker row both stay visible. */
  it('strips the row-level-cancelled original AND its marker row', () => {
    const clicked = mov({ id: 'a', type: 'Satınalma', doc_num: 'D-1' })
    const cancelledRow = mov({ id: 'b', type: 'Satınalma', doc_num: 'D-1' })
    const marker = mov({ id: 'c', type: 'Satınalma', doc_num: 'D-1', note: 'Ləğv ID: b' })
    const v = assemble(clicked, [clicked, cancelledRow, marker])!
    expect(v.lines.map((l) => l.id)).toEqual(['a'])
  })

  /* MUTATION / risk R6: an empty stripped document labelled cancelled. It is a
     valid partially modified document; its status must stay `open`. */
  it('a document emptied by stripping is NOT cancelled', () => {
    const clicked = mov({ id: 'a', type: 'Satınalma', doc_num: 'D-1' })
    const marker = mov({ id: 'm', type: 'Satınalma', doc_num: 'D-1', note: 'Ləğv ID: a' })
    const v = assemble(clicked, [clicked, marker])!
    expect(v.lines).toEqual([])
    expect(v.emptyAfterStrip).toBe(true)
    expect(v.status).toEqual({ kind: 'open' })
  })

  it('a genuinely empty result is not reported as emptied-by-stripping', () => {
    const clicked = mov({ id: 'a', type: 'Satınalma', doc_num: 'D-1' })
    const v = assemble(clicked, [clicked])!
    expect(v.lines).toHaveLength(1)
    expect(v.emptyAfterStrip).toBe(false)
  })
})

describe('status branches (M8-21, M8-22)', () => {
  it('an ordinary document already cancelled shows the reversing document', () => {
    const clicked = mov({ id: 'a', type: 'Satınalma', doc_num: 'D-1' })
    const rev = mov({ id: 'r', type: 'Satınalma', doc_num: 'R-9', note: 'Ləğv: D-1' })
    const v = assemble(clicked, [clicked, rev])!
    expect(v.status).toEqual({ kind: 'cancelled', reversalDoc: 'R-9' })
  })

  /* The legacy '—' fallback: a marker row with no doc_num still proves the
     reversal, so it must not read as "not cancelled". */
  it('keeps the legacy — fallback when the marker row carries no doc_num', () => {
    const clicked = mov({ id: 'a', type: 'Satınalma', doc_num: 'D-1' })
    const rev = mov({ id: 'r', type: 'Satınalma', doc_num: null, note: 'Ləğv: D-1' })
    expect(assemble(clicked, [clicked, rev])!.status).toEqual({ kind: 'cancelled', reversalDoc: '—' })
  })

  it('a document that IS a reversal reports `reversal`, which wins over cancelled', () => {
    const clicked = mov({ id: 'a', type: 'Satınalma', doc_num: 'R-9', note: 'Ləğv: D-1' })
    const v = assemble(clicked, [clicked])!
    expect(v.status).toEqual({ kind: 'reversal' })
  })

  it('a transfer document uses the TRANSFER markers, not the ordinary ones', () => {
    const clicked = mov({ id: 'a', type: 'Yerdəyişmə', doc_num: 'T-1', out_qty: 5, in_qty: 0 })
    const rev = mov({ id: 'r', type: 'Yerdəyişmə', doc_num: 'RT-1', note: 'Ləğv (əks yerdəyişmə): T-1' })
    expect(assemble(clicked, [clicked, rev])!.status).toEqual({ kind: 'cancelled', reversalDoc: 'RT-1' })
  })

  /* MUTATION: the ordinary marker used for a transfer document — a cancelled
     transfer would read as open. */
  it('a transfer is NOT reported cancelled by an ordinary `Ləğv:` marker', () => {
    const clicked = mov({ id: 'a', type: 'Yerdəyişmə', doc_num: 'T-1', out_qty: 5, in_qty: 0 })
    const wrong = mov({ id: 'r', type: 'Yerdəyişmə', doc_num: 'RT-1', note: 'Ləğv: T-1' })
    expect(assemble(clicked, [clicked, wrong])!.status).toEqual({ kind: 'open' })
  })

  it('a transfer reversal document reports `reversal`', () => {
    const clicked = mov({
      id: 'a', type: 'Yerdəyişmə', doc_num: 'RT-1', out_qty: 5, in_qty: 0,
      note: 'Ləğv (əks yerdəyişmə): T-1',
    })
    expect(assemble(clicked, [clicked])!.status).toEqual({ kind: 'reversal' })
  })

  it('a numbered legacy-transfer counter document also reports `reversal`', () => {
    const clicked = mov({
      id: 'a', type: 'Yerdəyişmə', doc_num: 'SND-LR-1', out_qty: 5, in_qty: 0,
      note: 'Ləğv (əks yerdəyişmə) ID: source-id:paired-id',
    })
    expect(assemble(clicked, [clicked])!.status).toEqual({ kind: 'reversal' })
  })

  /* MUTATION: the status helpers fed the OPERATIONAL list. `excludeCancelled()`
     removes exactly the marker rows they look for, so a cancelled document
     would report open. Simulated by omitting the marker row. */
  it('without the marker rows in the set, nothing can be found cancelled', () => {
    const clicked = mov({ id: 'a', type: 'Satınalma', doc_num: 'D-1' })
    expect(assemble(clicked, [clicked])!.status).toEqual({ kind: 'open' })
  })
})

describe('transfer view — outbound legs only (M8-17)', () => {
  /* MUTATION: rendering BOTH database legs. One logical transfer would appear
     twice and the line count would double. */
  it('shows one line per logical transfer, not both legs', () => {
    const out = mov({ id: 'out', type: 'Yerdəyişmə', doc_num: 'T-1', out_qty: 5, in_qty: 0, warehouse: 'Ələt' })
    const inn = mov({ id: 'in', type: 'Yerdəyişmə', doc_num: 'T-1', out_qty: 0, in_qty: 5, warehouse: 'Astara' })
    const v = assemble(out, [out, inn])!
    expect(v.lines).toHaveLength(1)
    expect(v.lines[0].id).toBe('out')
  })

  /* MUTATION: deriving the header count from `lines.length`. Legacy renders
     `nf(rows.length)` — the post-strip DOCUMENT rows, BOTH legs — while the
     preview is outbound-only (index.html:5211-5217, 5238). A two-leg transfer
     must read «2 sətir» over a single rendered line. */
  it('the header counts both legs while only the outbound one renders', () => {
    const out = mov({ id: 'out', type: 'Yerdəyişmə', doc_num: 'T-1', out_qty: 5, in_qty: 0 })
    const inn = mov({ id: 'in', type: 'Yerdəyişmə', doc_num: 'T-1', out_qty: 0, in_qty: 5 })
    const v = assemble(out, [out, inn])!
    expect(v.headerLineCount).toBe(2)
    expect(v.lines).toHaveLength(1)
  })

  /* An ordinary document renders every post-strip row, so the two counts agree
     there — the transfer split must not leak into the ordinary view. */
  it('an ordinary document header matches its rendered line count', () => {
    const a = mov({ id: 'a', type: 'Satınalma', doc_num: 'D-1' })
    const b = mov({ id: 'b', type: 'Satınalma', doc_num: 'D-1' })
    const v = assemble(a, [a, b])!
    expect(v.headerLineCount).toBe(2)
    expect(v.lines).toHaveLength(2)
  })

  it('the inbound leg opens the same one-line view', () => {
    const out = mov({ id: 'out', type: 'Yerdəyişmə', doc_num: 'T-1', out_qty: 5, in_qty: 0 })
    const inn = mov({ id: 'in', type: 'Yerdəyişmə', doc_num: 'T-1', out_qty: 0, in_qty: 5 })
    const v = assemble(inn, [out, inn])!
    expect(v.lines.map((l) => l.id)).toEqual(['out'])
  })

  it('uses the canonical route display for the transfer line', () => {
    const out = mov({ id: 'out', type: 'Yerdəyişmə', doc_num: 'T-1', out_qty: 5, in_qty: 0 })
    expect(assemble(out, [out])!.lines[0].direction).toBe('Ələt → Astara')
  })

  it('the transfer quantity falls back out_qty → in_qty', () => {
    const out = mov({ id: 'out', type: 'Yerdəyişmə', doc_num: 'T-1', out_qty: 7, in_qty: 0 })
    expect(assemble(out, [out])!.lines[0].qty).toBe(7)
  })

  it('legacy fallback: with no outbound leg left, the remaining rows are shown', () => {
    const inn = mov({ id: 'in', type: 'Yerdəyişmə', doc_num: 'T-1', out_qty: 0, in_qty: 5 })
    const v = assemble(inn, [inn])!
    expect(v.lines.map((l) => l.id)).toEqual(['in'])
    expect(v.lines[0].qty).toBe(5)
  })

  it('the ordinary quantity falls back in_qty → out_qty, the other way round', () => {
    const m = mov({ id: 'a', type: 'Satınalma', doc_num: 'D-1', in_qty: 3, out_qty: 0 })
    expect(assemble(m, [m])!.lines[0].qty).toBe(3)
  })
})

describe('docRefsLine semantics (index.html:4916-4924)', () => {
  /* MUTATION: doc_num rendered as the Qaimə or Müqavilə value. They are three
     different fields — one server-generated, two typed by the user. */
  it('keeps doc_num, invoice_num and contract_num strictly separate', () => {
    const a = mov({ id: 'a', type: 'Satınalma', doc_num: 'DOC-1', invoice_num: 'INV-1', contract_num: 'CT-1' })
    const v = assemble(a, [a])!
    expect(v.docNum).toBe('DOC-1')
    expect(v.invoiceNums).toEqual(['INV-1'])
    expect(v.contractNums).toEqual(['CT-1'])
    expect(v.invoiceNums).not.toContain('DOC-1')
    expect(v.contractNums).not.toContain('DOC-1')
  })

  it('lists UNIQUE, non-empty, trimmed values across the document', () => {
    const a = mov({ id: 'a', type: 'Satınalma', doc_num: 'D-1', invoice_num: 'INV-1', contract_num: '' })
    const b = mov({ id: 'b', type: 'Satınalma', doc_num: 'D-1', invoice_num: ' INV-1 ', contract_num: null })
    const c = mov({ id: 'c', type: 'Satınalma', doc_num: 'D-1', invoice_num: 'INV-2', contract_num: 'CT-9' })
    const v = assemble(a, [a, b, c])!
    expect(v.invoiceNums).toEqual(['INV-1', 'INV-2'])
    expect(v.contractNums).toEqual(['CT-9'])
  })

  it('an empty Müqavilə list stays empty rather than gaining a placeholder', () => {
    const a = mov({ id: 'a', type: 'Satınalma', doc_num: 'D-1', invoice_num: null, contract_num: null })
    const v = assemble(a, [a])!
    expect(v.invoiceNums).toEqual([])
    expect(v.contractNums).toEqual([])
  })
})

describe('lotDoc (index.html:5019)', () => {
  /* MUTATION: lotDoc checked on the CLICKED ROW only. A lot-valued document
     would look unvalued whenever the clicked line carries no valuation. */
  it('is true when ANY document row has a valuation, not only the clicked one', () => {
    const clicked = mov({ id: 'a', type: 'Silinmə', doc_num: 'D-1', out_qty: 1, in_qty: 0 })
    const other = mov({ id: 'b', type: 'Silinmə', doc_num: 'D-1', out_qty: 1, in_qty: 0 })
    const valuations = { has: (id: string) => id === 'b' }
    expect(assemble(clicked, [clicked, other], valuations)!.lotDoc).toBe(true)
  })

  it('is false when no row of the document has a valuation', () => {
    const clicked = mov({ id: 'a', type: 'Silinmə', doc_num: 'D-1', out_qty: 1, in_qty: 0 })
    const outsider = mov({ id: 'z', type: 'Silinmə', doc_num: 'D-9', out_qty: 1, in_qty: 0 })
    const valuations = { has: (id: string) => id === 'z' }
    expect(assemble(clicked, [clicked, outsider], valuations)!.lotDoc).toBe(false)
  })

  it('ignores a valuation belonging to a stripped row', () => {
    const clicked = mov({ id: 'a', type: 'Silinmə', doc_num: 'D-1', out_qty: 1, in_qty: 0 })
    const stripped = mov({ id: 'b', type: 'Silinmə', doc_num: 'D-1', out_qty: 1, in_qty: 0 })
    const marker = mov({ id: 'm', type: 'Silinmə', doc_num: 'D-1', note: 'Ləğv ID: b' })
    const valuations = { has: (id: string) => id === 'b' }
    expect(assemble(clicked, [clicked, stripped, marker], valuations)!.lotDoc).toBe(false)
  })
})

describe('assembled line content', () => {
  it('carries item, warehouse, quantities, price, note and recorder', () => {
    const a = mov({
      id: 'a', type: 'Satınalma', doc_num: 'D-1', item_code: 'K9',
      warehouse: 'Ələt', in_qty: 4, out_qty: 0, price: 12.5,
      note: 'qeyd mətni', created_by: 'uuid-1',
    })
    const l = assemble(a, [a])!.lines[0]
    expect(l).toMatchObject({
      id: 'a', itemCode: 'K9', itemName: 'Ad K9', warehouse: 'Ələt',
      direction: 'Mədaxil: Ələt', qty: 4, inQty: 4, outQty: 0,
      price: 12.5, note: 'qeyd mətni', createdBy: 'uuid-1',
    })
  })

  it('an outbound ordinary line reads Məxaric', () => {
    const a = mov({ id: 'a', type: 'Silinmə', doc_num: 'D-1', in_qty: 0, out_qty: 2 })
    expect(assemble(a, [a])!.lines[0].direction).toBe('Məxaric: Ələt')
  })
})
