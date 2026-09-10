import { describe, it, expect } from 'vitest'
import {
  CANCELLABLE_TYPES,
  cancelledDocFor,
  docCancelMarker,
  docCancelledBy,
  docReversalDoc,
  isCancelDoc,
  isReversalDoc,
  reversalMarker,
  rowReplacedOrCancelled,
  stripRowLevelCancelled,
  type CancelStateMovement,
} from './documentCancelState'

const row = (over: Partial<CancelStateMovement> = {}): CancelStateMovement => ({
  id: '1',
  type: 'Satınalma',
  note: null,
  doc_num: 'DOC-1',
  ...over,
})

describe('CANCELLABLE_TYPES (index.html:645)', () => {
  it('holds the seven document-cancellable types in legacy order', () => {
    expect([...CANCELLABLE_TYPES]).toEqual([
      'Satınalma',
      'Əvvələ qalıq',
      'Qaytarma',
      'İcarə',
      'Silinmə',
      'Sahəyə',
      'Satış',
    ])
  })

  it('does NOT contain Yerdəyişmə — transfers use their own RPC family', () => {
    expect((CANCELLABLE_TYPES as readonly string[]).includes('Yerdəyişmə')).toBe(false)
  })
})

describe('markers mirror the SQL contract', () => {
  it('builds the two document markers verbatim', () => {
    expect(docCancelMarker('DOC-1')).toBe('Ləğv: DOC-1')
    expect(reversalMarker('DOC-1')).toBe('Ləğv (əks yerdəyişmə): DOC-1')
  })
})

describe('docCancelledBy / isCancelDoc (M8-22, M8-21)', () => {
  const original = row({ id: '1', doc_num: 'DOC-1' })
  const reversal = row({ id: '2', doc_num: 'DOC-9', note: 'Ləğv: DOC-1' })

  it('returns the reversing document number for a cancelled document', () => {
    expect(docCancelledBy('DOC-1', [original, reversal])).toBe('DOC-9')
  })

  it('returns null when the document is not cancelled', () => {
    expect(docCancelledBy('DOC-1', [original])).toBeNull()
  })

  it('returns null for a blank document number', () => {
    expect(docCancelledBy('', [original, reversal])).toBeNull()
    expect(docCancelledBy(null, [original, reversal])).toBeNull()
  })

  it('falls back to «—» when the marker row itself carries no doc_num', () => {
    /* The legacy fallback matters: the reversal DID happen, so a caller must
       not read this as "not cancelled". */
    const noDoc = row({ id: '2', doc_num: null, note: 'Ləğv: DOC-1' })
    expect(docCancelledBy('DOC-1', [original, noDoc])).toBe('—')
  })

  it('does not treat a TRANSFER reversal marker as an ordinary cancellation', () => {
    const transferRev = row({ id: '2', doc_num: 'DOC-9', note: 'Ləğv (əks yerdəyişmə): DOC-1' })
    expect(docCancelledBy('DOC-1', [original, transferRev])).toBeNull()
  })

  it('identifies the reversal document itself', () => {
    expect(isCancelDoc('DOC-9', [original, reversal])).toBe(true)
    expect(isCancelDoc('DOC-1', [original, reversal])).toBe(false)
    expect(isCancelDoc('', [original, reversal])).toBe(false)
  })
})

describe('docReversalDoc / isReversalDoc (transfer family)', () => {
  const original = row({ id: '1', type: 'Yerdəyişmə', doc_num: 'TR-1' })
  const counter = row({
    id: '2',
    type: 'Yerdəyişmə',
    doc_num: 'TR-9',
    note: 'Ləğv (əks yerdəyişmə): TR-1',
  })

  it('returns the counter-document number', () => {
    expect(docReversalDoc('TR-1', [original, counter])).toBe('TR-9')
  })

  it('does not accept an ORDINARY cancel marker as a transfer reversal', () => {
    const ordinary = row({ id: '2', doc_num: 'TR-9', note: 'Ləğv: TR-1' })
    expect(docReversalDoc('TR-1', [original, ordinary])).toBeNull()
  })

  it('falls back to «—» when the counter row carries no doc_num', () => {
    const noDoc = row({ id: '2', doc_num: '', note: 'Ləğv (əks yerdəyişmə): TR-1' })
    expect(docReversalDoc('TR-1', [original, noDoc])).toBe('—')
  })

  it('identifies a counter-document, which can never be cancelled again', () => {
    expect(isReversalDoc('TR-9', [original, counter])).toBe(true)
    expect(isReversalDoc('TR-1', [original, counter])).toBe(false)
    expect(isReversalDoc(null, [original, counter])).toBe(false)
  })

  it('identifies the numbered counter created from a doc-less legacy transfer pair', () => {
    const legacyCounter = row({
      id: '3',
      type: 'Yerdəyişmə',
      doc_num: 'SND-LR-1',
      note: 'Ləğv (əks yerdəyişmə) ID: source-id:paired-id',
    })
    expect(isReversalDoc('SND-LR-1', [legacyCounter])).toBe(true)
  })
})

describe('cancelledDocFor (M8-06)', () => {
  it('routes a Yerdəyişmə row through the transfer marker', () => {
    const m = row({ id: '1', type: 'Yerdəyişmə', doc_num: 'TR-1' })
    const counter = row({ id: '2', doc_num: 'TR-9', note: 'Ləğv (əks yerdəyişmə): TR-1' })
    expect(cancelledDocFor(m, [m, counter])).toBe('TR-9')
  })

  it('routes a CANCELLABLE_TYPES row through the ordinary marker', () => {
    const m = row({ id: '1', type: 'İcarə', doc_num: 'DOC-1' })
    const rev = row({ id: '2', doc_num: 'DOC-9', note: 'Ləğv: DOC-1' })
    expect(cancelledDocFor(m, [m, rev])).toBe('DOC-9')
  })

  it('returns null for a type that has no cancellation route at all', () => {
    const m = row({ id: '1', type: 'Naməlum növ', doc_num: 'DOC-1' })
    const rev = row({ id: '2', doc_num: 'DOC-9', note: 'Ləğv: DOC-1' })
    expect(cancelledDocFor(m, [m, rev])).toBeNull()
  })

  it('matches a doc-less ordinary row by its EXACT legacy id marker', () => {
    const m = row({ id: '77', doc_num: null })
    const rev = row({ id: '78', doc_num: 'DOC-9', note: 'Ləğv ID: 77' })
    expect(cancelledDocFor(m, [m, rev])).toBe('DOC-9')
  })

  it('does not match a doc-less ordinary row on a mere id substring', () => {
    /* «Ləğv ID: 777» must not cancel row 77 — the ordinary branch compares the
       whole note, unlike the transfer branch below. */
    const m = row({ id: '77', doc_num: null })
    const other = row({ id: '78', doc_num: 'DOC-9', note: 'Ləğv ID: 777' })
    expect(cancelledDocFor(m, [m, other])).toBeNull()
  })

  it('matches a doc-less TRANSFER row against either side of the legacy pair', () => {
    const a = row({ id: '10', type: 'Yerdəyişmə', doc_num: null })
    const b = row({ id: '11', type: 'Yerdəyişmə', doc_num: null })
    const rev = row({ id: '12', doc_num: 'TR-9', note: 'Ləğv (əks yerdəyişmə) ID: 10:11' })
    expect(cancelledDocFor(a, [a, b, rev])).toBe('TR-9')
    expect(cancelledDocFor(b, [a, b, rev])).toBe('TR-9')
  })

  it('returns null for a null movement', () => {
    expect(cancelledDocFor(null, [])).toBeNull()
    expect(cancelledDocFor(undefined, [])).toBeNull()
  })
})

describe('rowReplacedOrCancelled / stripRowLevelCancelled (M8-20)', () => {
  it('detects a row-level cancellation marker', () => {
    const target = row({ id: '5' })
    const marker = row({ id: '6', note: 'Ləğv ID: 5' })
    expect(rowReplacedOrCancelled(target, [target, marker])).toBe(true)
    expect(rowReplacedOrCancelled(row({ id: '7' }), [target, marker])).toBe(false)
  })

  it('accepts a marker note stored with surrounding whitespace', () => {
    const target = row({ id: '5' })
    const marker = row({ id: '6', note: '  Ləğv ID: 5  ' })
    expect(rowReplacedOrCancelled(target, [target, marker])).toBe(true)
  })

  it('hides BOTH the cancelled original and the technical marker row', () => {
    const rows = [row({ id: '5' }), row({ id: '6', note: 'Ləğv ID: 5' }), row({ id: '7' })]
    expect(stripRowLevelCancelled(rows, rows).map((r) => r.id)).toEqual(['7'])
  })

  it('honours a marker that lives OUTSIDE the displayed row list', () => {
    const displayed = [row({ id: '5' }), row({ id: '7' })]
    const all = [...displayed, row({ id: '6', doc_num: 'OTHER', note: 'Ləğv ID: 5' })]
    expect(stripRowLevelCancelled(displayed, all).map((r) => r.id)).toEqual(['7'])
  })

  it('leaves a DOCUMENT-level cancellation marker untouched', () => {
    /* «Ləğv: DOC-1» hides a document elsewhere; it must not strip a line here. */
    const rows = [row({ id: '5' }), row({ id: '6', note: 'Ləğv: DOC-1' })]
    expect(stripRowLevelCancelled(rows, rows).map((r) => r.id)).toEqual(['5', '6'])
  })

  it('can empty a document whose lines were all replaced — a real state (R6)', () => {
    const rows = [row({ id: '5' }), row({ id: '6', note: 'Ləğv ID: 5' })]
    expect(stripRowLevelCancelled(rows, rows)).toEqual([])
  })

  it('does not mutate the input list', () => {
    const rows = [row({ id: '5' }), row({ id: '6', note: 'Ləğv ID: 5' })]
    stripRowLevelCancelled(rows, rows)
    expect(rows).toHaveLength(2)
  })
})

/* ===================================================================== */
describe('cancelledDocFor — cost and equivalence (I-4 audit, finding 4)', () => {
  /* THE AUDIT NAMED THE WRONG CAUSE, and the measurement is recorded here so
     the claim is not re-derived from scratch later.

     The audit proposed that the `SHOW_MAX` expansion test timed out because
     `cancelledDocFor(m, allRows)` is called for every rendered row — O(n²) —
     and asked for a memoized/indexed lookup. Measured on the same 3001-row
     set that test builds, the whole per-row sweep costs ~223 ms. The test was
     taking ~104 s. The cost was `getByRole('button', …)` inside the test
     itself: a single role query computes the accessible name of every node in
     the document, ~96 s at 3001 rendered rows (measured). Replacing that ONE
     query with a direct DOM lookup — the technique the file already uses for
     `bodyRowCount()`, and for the same stated reason — brought the test from
     ~104 s to ~3.7 s.

     So no index was introduced: it would have added a second implementation
     of the marker semantics, with its own drift risk, to save ~223 ms of a
     ~104 s problem that lives in the test harness. The helper stays the
     single source of truth. These tests pin its exact semantics — the ones an
     index would have had to reproduce — so the decision stays checkable and
     so a future optimisation has an oracle to be tested against. */

  const rows = (...ms: CancelStateMovement[]) => ms

  it('is fast enough at the 3000-row soft cap to be irrelevant to render cost', () => {
    const many = Array.from({ length: 3001 }, (_, i) =>
      row({ id: 'm' + i, type: 'Satınalma', doc_num: null }))
    const started = performance.now()
    for (const m of many) cancelledDocFor(m, many)
    /* Deliberately loose: this asserts an ORDER OF MAGNITUDE, not a
       benchmark, and must not turn into a flaky timing test on slow CI. The
       point is that this is not a multi-second cost. */
    expect(performance.now() - started).toBeLessThan(5000)
  })

  /* ---- the exact semantics, family by family ---- */

  it('an ordinary document row reports its «Ləğv: <doc>» canceller', () => {
    const m = row({ id: 'a', type: 'Satınalma', doc_num: 'D-1' })
    const all = rows(m, row({ id: 'r', type: 'Satınalma', doc_num: 'R-1', note: 'Ləğv: D-1' }))
    expect(cancelledDocFor(m, all)).toBe('R-1')
  })

  it('a transfer row uses the REVERSAL marker, not the ordinary one', () => {
    const m = row({ id: 'a', type: 'Yerdəyişmə', doc_num: 'T-1' })
    /* The ordinary marker must NOT satisfy a transfer. */
    const wrong = rows(m, row({ id: 'r', doc_num: 'R-1', note: 'Ləğv: T-1' }))
    expect(cancelledDocFor(m, wrong)).toBeNull()
    const right = rows(m, row({
      id: 'r', type: 'Yerdəyişmə', doc_num: 'R-1',
      note: 'Ləğv (əks yerdəyişmə): T-1',
    }))
    expect(cancelledDocFor(m, right)).toBe('R-1')
  })

  it('a doc-less ordinary row matches «Ləğv ID: <id>» EXACTLY', () => {
    const m = row({ id: 'a', type: 'Satınalma', doc_num: null })
    expect(cancelledDocFor(m, rows(m, row({ id: 'x', doc_num: 'R-2', note: 'Ləğv ID: a' }))))
      .toBe('R-2')
    /* A different id that merely CONTAINS this one must not match. */
    expect(cancelledDocFor(m, rows(m, row({ id: 'x', doc_num: 'R-2', note: 'Ləğv ID: ab' }))))
      .toBeNull()
  })

  /* The doc-less TRANSFER rule is containment over the `a:b` pair, which is
     exactly the behaviour an index keyed on a single id would have broken. */
  it('a doc-less transfer matches its pair by CONTAINMENT, either side', () => {
    const a = row({ id: 'a', type: 'Yerdəyişmə', doc_num: null })
    const b = row({ id: 'b', type: 'Yerdəyişmə', doc_num: null })
    const marker = row({
      id: 'x', type: 'Yerdəyişmə', doc_num: 'R-3',
      note: 'Ləğv (əks yerdəyişmə) ID: a:b',
    })
    expect(cancelledDocFor(a, rows(a, b, marker))).toBe('R-3')
    expect(cancelledDocFor(b, rows(a, b, marker))).toBe('R-3')
  })

  /* Containment is substring-based, so an id that is a substring of another
     id in the pair also matches. That is the ORIGINAL behaviour
     (index.html:4902-4907) and is pinned deliberately, not endorsed: any
     future index must reproduce it rather than silently "fix" it. */
  it('pins the substring consequence of containment for tricky ids', () => {
    const short = row({ id: 'a', type: 'Yerdəyişmə', doc_num: null })
    const marker = row({
      id: 'x', type: 'Yerdəyişmə', doc_num: 'R-4',
      note: 'Ləğv (əks yerdəyişmə) ID: ab:cd',
    })
    expect(cancelledDocFor(short, rows(short, marker))).toBe('R-4')
  })

  it('the «—» fallback survives a marker row with no doc_num', () => {
    const m = row({ id: 'a', type: 'Satınalma', doc_num: 'D-1' })
    const all = rows(m, row({ id: 'r', type: 'Satınalma', doc_num: null, note: 'Ləğv: D-1' }))
    expect(cancelledDocFor(m, all)).toBe('—')
  })

  it('a documented row of an unsupported type has no cancellation route', () => {
    const m = row({ id: 'a', type: 'Mövcud deyil', doc_num: 'D-1' })
    expect(cancelledDocFor(m, rows(m, row({ id: 'r', doc_num: 'R-1', note: 'Ləğv: D-1' }))))
      .toBeNull()
  })

  /* …but a DOC-LESS unsupported row still reports its per-id canceller: the
     type gate applies only after the doc-less branch (index.html:4902-4907). */
  it('a DOC-LESS unsupported row still reports its per-id canceller', () => {
    const m = row({ id: 'a', type: 'Mövcud deyil', doc_num: null })
    expect(cancelledDocFor(m, rows(m, row({ id: 'x', doc_num: 'R-5', note: 'Ləğv ID: a' }))))
      .toBe('R-5')
  })

  it('numeric and string ids resolve to the same marker', () => {
    const m = row({ id: 7 as unknown as string, type: 'Satınalma', doc_num: null })
    expect(cancelledDocFor(m, rows(m, row({ id: 'x', doc_num: 'R-6', note: 'Ləğv ID: 7' }))))
      .toBe('R-6')
  })
})
