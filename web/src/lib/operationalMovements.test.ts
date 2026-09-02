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
