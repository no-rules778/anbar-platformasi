import { describe, it, expect } from 'vitest'
import { excludeCancelled, type CancellableMovementRow } from './operationalMovements'

const row = (over: Partial<CancellableMovementRow> & { id: string | number }): CancellableMovementRow => ({
  note: null,
  doc_num: null,
  ...over,
})

describe('excludeCancelled — document-level reversal', () => {
  it('hides both the cancelled document and the reversing document', () => {
    const rows = [
      row({ id: 1, doc_num: 'SND-100' }),
      row({ id: 2, doc_num: 'SND-100' }),
      row({ id: 3, doc_num: 'SND-200', note: 'Ləğv: SND-100' }),
      row({ id: 4, doc_num: 'SND-300' }),
    ]
    expect(excludeCancelled(rows).map((r) => r.id)).toEqual([4])
  })

  it('handles the transfer counter-entry wording', () => {
    const rows = [
      row({ id: 1, doc_num: 'SND-10' }),
      row({ id: 2, doc_num: 'SND-11', note: 'Ləğv (əks yerdəyişmə): SND-10' }),
      row({ id: 3, doc_num: 'SND-12' }),
    ]
    expect(excludeCancelled(rows).map((r) => r.id)).toEqual([3])
  })

  it('does not hide a document when the reversing row itself has no doc_num', () => {
    const rows = [
      row({ id: 1, doc_num: 'SND-100' }),
      row({ id: 2, doc_num: null, note: 'Ləğv: SND-100' }),
    ]
    // The marker row is still dropped (it is a Ləğv row), but SND-100 survives —
    // this mirrors the original's `if (docMatch && m.doc)` guard exactly.
    expect(excludeCancelled(rows).map((r) => r.id)).toEqual([1])
  })
})

describe('excludeCancelled — legacy id forms', () => {
  it('hides a single legacy-cancelled row', () => {
    const rows = [
      row({ id: 'a1', doc_num: null }),
      row({ id: 'a2', note: 'Ləğv ID: a1' }),
      row({ id: 'a3' }),
    ]
    expect(excludeCancelled(rows).map((r) => r.id)).toEqual(['a3'])
  })

  it('hides both rows of a legacy transfer pair', () => {
    const rows = [
      row({ id: 'p1' }),
      row({ id: 'p2' }),
      row({ id: 'p3', note: 'Ləğv (əks yerdəyişmə) ID: p1:p2' }),
      row({ id: 'p4' }),
    ]
    expect(excludeCancelled(rows).map((r) => r.id)).toEqual(['p4'])
  })
})

describe('excludeCancelled — marker rows and untouched data', () => {
  it('always drops rows whose note starts with a Ləğv marker', () => {
    const rows = [row({ id: 1, note: 'Ləğv: SND-999' }), row({ id: 2, note: 'Ləğv ID: zzz' })]
    expect(excludeCancelled(rows)).toEqual([])
  })

  it('keeps ordinary rows, including notes that merely mention the word elsewhere', () => {
    const rows = [
      row({ id: 1, note: 'Adi qeyd' }),
      row({ id: 2, note: 'Sənəd Ləğv edilməyib' }),
      row({ id: 3, note: null }),
      row({ id: 4, note: '   ' }),
    ]
    expect(excludeCancelled(rows).map((r) => r.id)).toEqual([1, 2, 3, 4])
  })

  it('returns an empty array unchanged', () => {
    expect(excludeCancelled([])).toEqual([])
  })

  it('trims surrounding whitespace before matching, like the original', () => {
    const rows = [row({ id: 1, doc_num: 'D1' }), row({ id: 2, doc_num: 'D2', note: '  Ləğv: D1  ' })]
    expect(excludeCancelled(rows)).toEqual([])
  })
})

/* ===================================================================== */
/* M9-141b — RAW vs OPERATIONAL balance invariant, every supported
   cancellation family.

   `stock_condition_balance()` sums ALL movements; the balance screen sums
   `excludeCancelled()`. A different row set does not imply a different
   number: every supported cancellation inserts an exact inverse, so the
   source and its counter sum to zero raw, and removing both is also zero.

   Each fixture models the rows the live SQL body inserts — the note markers
   and the quantities — and asserts, per warehouse × item, that
   Σ(in − out) over ALL rows equals Σ(in − out) over the OPERATIONAL rows.

   The fixtures are NOT live evidence of the SQL bodies; they are the
   invariant those bodies are documented to satisfy (ledger M9-141). */

interface QtyRow extends CancellableMovementRow {
  warehouse: string
  item_code: string
  in_qty: number
  out_qty: number
}

const qrow = (
  id: string,
  warehouse: string,
  item_code: string,
  in_qty: number,
  out_qty: number,
  over: Partial<CancellableMovementRow> = {},
): QtyRow => ({ id, warehouse, item_code, in_qty, out_qty, note: null, doc_num: null, ...over })

/**
 * Σ(in − out) per `warehouse|item_code`, rounded like `index()` does, over
 * the UNION of keys seen in `universe` (default: the rows themselves). A key
 * with no operational row is a balance of 0, not an absent key — otherwise a
 * fully cancelled pair would compare `{}` against `{k: 0}` and look unequal
 * for a reason that has nothing to do with quantities.
 */
function balances(rows: readonly QtyRow[], universe: readonly QtyRow[] = rows): Record<string, number> {
  const out: Record<string, number> = {}
  for (const r of universe) out[r.warehouse + '|' + r.item_code] = 0
  for (const r of rows) {
    const k = r.warehouse + '|' + r.item_code
    out[k] = +((out[k] ?? 0) + r.in_qty - r.out_qty).toFixed(4)
  }
  return out
}

/** The invariant under test, as one expression. */
const rawEqualsOperational = (rows: QtyRow[]) =>
  expect(balances(excludeCancelled(rows), rows)).toEqual(balances(rows))

describe('M9-141b — raw balance equals operational balance for every cancellation family', () => {
  /* POSITIVE CONTROL first: the harness must be able to see an inequality.
     An UNBALANCED reversal (out 9 against in 10) is not a supported history,
     and raw ≠ operational there — proving the equality assertions below are
     not vacuous. */
  it('control: an unbalanced reversal makes raw and operational DIFFER', () => {
    const rows = [
      qrow('o', 'Ələt', 'X', 10, 0, { doc_num: 'D-9' }),
      qrow('r', 'Ələt', 'X', 0, 9, { doc_num: 'D-9-C', note: 'Ləğv: D-9' }),
    ]
    expect(balances(rows)).toEqual({ 'Ələt|X': 1 })
    expect(balances(excludeCancelled(rows), rows)).toEqual({ 'Ələt|X': 0 })
    expect(balances(excludeCancelled(rows), rows)).not.toEqual(balances(rows))
  })

  /* cancel_legacy_movement — `out_qty,in_qty` swapped into the insert,
     marker «Ləğv ID: <id>». */
  it('legacy row cancellation', () => {
    const rows = [
      qrow('a1', 'Ələt', 'X', 5, 0),
      qrow('a2', 'Ələt', 'X', 0, 5, { note: 'Ləğv ID: a1' }),
      qrow('a3', 'Ələt', 'X', 2, 0),
    ]
    rawEqualsOperational(rows)
    expect(balances(rows)).toEqual({ 'Ələt|X': 2 })
    expect(excludeCancelled(rows).map((r) => r.id)).toEqual(['a3'])
  })

  /* cancel_legacy_transfer — exact-quantity leg match, both inverse legs
     carry «Ləğv (əks yerdəyişmə) ID: <out>:<in>». */
  it('legacy transfer pair cancellation', () => {
    const rows = [
      qrow('p1', 'Ələt', 'X', 0, 3),
      qrow('p2', 'Astara', 'X', 3, 0),
      qrow('p3', 'Ələt', 'X', 3, 0, { note: 'Ləğv (əks yerdəyişmə) ID: p1:p2' }),
      qrow('p4', 'Astara', 'X', 0, 3, { note: 'Ləğv (əks yerdəyişmə) ID: p1:p2' }),
    ]
    rawEqualsOperational(rows)
    expect(balances(rows)).toEqual({ 'Ələt|X': 0, 'Astara|X': 0 })
    expect(excludeCancelled(rows)).toEqual([])
  })

  /* cancel_document — `in>0 → (0,in)`, `out>0 → (out,0)` per line, into a
     reversal document whose note is «Ləğv: <doc>». */
  it('whole-document cancellation', () => {
    const rows = [
      qrow('d1', 'Ələt', 'X', 4, 0, { doc_num: 'D-1' }),
      qrow('d2', 'Ələt', 'Y', 0, 6, { doc_num: 'D-1' }),
      qrow('d3', 'Ələt', 'X', 0, 4, { doc_num: 'D-1-C', note: 'Ləğv: D-1' }),
      qrow('d4', 'Ələt', 'Y', 6, 0, { doc_num: 'D-1-C', note: 'Ləğv: D-1' }),
      qrow('d5', 'Ələt', 'X', 1, 0, { doc_num: 'D-2' }),
    ]
    rawEqualsOperational(rows)
    expect(balances(rows)).toEqual({ 'Ələt|X': 1, 'Ələt|Y': 0 })
  })

  /* cancel_transfer_document — same rule on BOTH legs, marker
     «Ləğv (əks yerdəyişmə): <doc>». */
  it('transfer-document cancellation', () => {
    const rows = [
      qrow('t1', 'Ələt', 'X', 0, 2, { doc_num: 'T-1' }),
      qrow('t2', 'Astara', 'X', 2, 0, { doc_num: 'T-1' }),
      qrow('t3', 'Ələt', 'X', 2, 0, { doc_num: 'T-1-C', note: 'Ləğv (əks yerdəyişmə): T-1' }),
      qrow('t4', 'Astara', 'X', 0, 2, { doc_num: 'T-1-C', note: 'Ləğv (əks yerdəyişmə): T-1' }),
    ]
    rawEqualsOperational(rows)
    expect(balances(rows)).toEqual({ 'Ələt|X': 0, 'Astara|X': 0 })
  })

  /* cancel_layer_transfer_document — reverses `SUM(out − in)` per leg, so a
     document with two lines on one side is countered by ONE aggregated row. */
  it('layer-transfer cancellation (aggregated SUM(out − in) reversal)', () => {
    const rows = [
      qrow('l1', 'Ələt', 'X', 0, 1, { doc_num: 'LT-1' }),
      qrow('l2', 'Ələt', 'X', 0, 2, { doc_num: 'LT-1' }),
      qrow('l3', 'Astara', 'X', 3, 0, { doc_num: 'LT-1' }),
      qrow('l4', 'Ələt', 'X', 3, 0, { doc_num: 'LT-1-C', note: 'Ləğv (əks yerdəyişmə): LT-1' }),
      qrow('l5', 'Astara', 'X', 0, 3, { doc_num: 'LT-1-C', note: 'Ləğv (əks yerdəyişmə): LT-1' }),
    ]
    rawEqualsOperational(rows)
    expect(balances(rows)).toEqual({ 'Ələt|X': 0, 'Astara|X': 0 })
  })

  /* correct_document — NOT a note-marker append. It calls
     cancel_document(v_doc) and then post_movement_document(v_lines): the
     fixture is the ORIGINAL, its «Ləğv:» REVERSAL, and the REPLACEMENT whose
     lines carry the decorative «Əvəz edir: <doc>» note (no quantity effect).

     The original and its reversal cancel to zero in BOTH sets; the
     replacement survives in BOTH. */
  describe('correct_document = cancellation pair + surviving replacement', () => {
    const original = qrow('c1', 'Ələt', 'X', 10, 0, { doc_num: 'D-5' })
    const reversal = qrow('c2', 'Ələt', 'X', 0, 10, { doc_num: 'D-5-C', note: 'Ləğv: D-5' })
    const replacement = qrow('c3', 'Ələt', 'X', 7, 0, { doc_num: 'D-6', note: 'Əvəz edir: D-5' })
    const rows = [original, reversal, replacement]

    it('raw sum equals the excludeCancelled() sum', () => {
      rawEqualsOperational(rows)
    })

    it('the original plus its reversal is net zero on its own', () => {
      expect(balances([original, reversal])).toEqual({ 'Ələt|X': 0 })
    })

    /* Fails if the replacement is treated as cancelled: the operational
       balance would then be 0, not 7. */
    it('the replacement survives in the operational set and carries the balance', () => {
      const op = excludeCancelled(rows)
      expect(op.map((r) => r.id)).toEqual(['c3'])
      expect(balances(op, rows)).toEqual({ 'Ələt|X': 7 })
      expect(balances(rows)).toEqual({ 'Ələt|X': 7 })
    })

    /* The «Əvəz edir:» marker is decoration on the replacement, not a
       cancellation marker: it must NOT be matched by the Ləğv patterns. */
    it('the «Əvəz edir:» note is not read as a cancellation marker', () => {
      expect(excludeCancelled([replacement])).toEqual([replacement])
    })

    /* Fails if the pair is treated as unbalanced: a replacement with the SAME
       quantity as the original leaves the balance where it started. */
    it('a same-quantity correction leaves the balance unchanged in both sets', () => {
      const same = [original, reversal, qrow('c4', 'Ələt', 'X', 10, 0, { doc_num: 'D-7', note: 'Əvəz edir: D-5' })]
      expect(balances(same)).toEqual({ 'Ələt|X': 10 })
      expect(balances(excludeCancelled(same), same)).toEqual({ 'Ələt|X': 10 })
    })
  })

  /* All families in one history, across two warehouses × two items. */
  it('a mixed history of every family is equal per warehouse × item', () => {
    const rows = [
      qrow('a1', 'Ələt', 'X', 5, 0),
      qrow('a2', 'Ələt', 'X', 0, 5, { note: 'Ləğv ID: a1' }),
      qrow('p1', 'Ələt', 'Y', 0, 3),
      qrow('p2', 'Astara', 'Y', 3, 0),
      qrow('p3', 'Ələt', 'Y', 3, 0, { note: 'Ləğv (əks yerdəyişmə) ID: p1:p2' }),
      qrow('p4', 'Astara', 'Y', 0, 3, { note: 'Ləğv (əks yerdəyişmə) ID: p1:p2' }),
      qrow('d1', 'Astara', 'X', 4, 0, { doc_num: 'D-1' }),
      qrow('d3', 'Astara', 'X', 0, 4, { doc_num: 'D-1-C', note: 'Ləğv: D-1' }),
      qrow('c1', 'Ələt', 'X', 10, 0, { doc_num: 'D-5' }),
      qrow('c2', 'Ələt', 'X', 0, 10, { doc_num: 'D-5-C', note: 'Ləğv: D-5' }),
      qrow('c3', 'Ələt', 'X', 7, 0, { doc_num: 'D-6', note: 'Əvəz edir: D-5' }),
      qrow('k1', 'Astara', 'Y', 1.25, 0, { doc_num: 'K-1' }),
    ]
    rawEqualsOperational(rows)
    expect(balances(rows)).toEqual({ 'Ələt|X': 7, 'Ələt|Y': 0, 'Astara|Y': 1.25, 'Astara|X': 0 })
  })
})
