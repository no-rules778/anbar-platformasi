import { describe, it, expect } from 'vitest'
import {
  buildBatchDocs,
  batchFilterDocs,
  normalizeBatchFilters,
  resolveBatchSelection,
  sameDocNums,
  BATCH_TYPE_OPTIONS,
  BATCH_STATUS_REVERSAL,
  BATCH_STATUS_LEGACY,
  BATCH_STATUS_MIXED,
  BATCH_STATUS_TRANSFER_OK,
  BATCH_STATUS_OK,
  BATCH_STATUS_UNSUPPORTED,
  EMPTY_BATCH_FILTERS,
  type BatchMovement,
} from './batchCancel'

/* GROUPING, ELIGIBILITY AND FILTERS — I-5 (M8-30, M8-31).

   Ported from index.html:5314-5403. The ladder's ORDER is the property most
   worth pinning: a doc-less row that is also a reversal must report «reversal»,
   because legacy tests `isRev` first. */

let seq = 0
const row = (p: Partial<BatchMovement> = {}): BatchMovement => ({
  id: p.id ?? 'id-' + ++seq,
  item_code: p.item_code ?? 'C1',
  date: p.date ?? '2026-05-10',
  invoice_num: null,
  note: p.note ?? null,
  price: p.price ?? 10,
  created_at: null,
  /* `in` not `??`: an explicitly passed null must stay null, which is exactly
     what makes a row doc-less. */
  doc_num: 'doc_num' in p ? p.doc_num! : 'D-1',
  type: p.type ?? 'Satınalma',
  warehouse: p.warehouse ?? 'Elet',
  partner: p.partner ?? null,
  in_qty: p.in_qty ?? 5,
  out_qty: p.out_qty ?? 0,
  created_by: p.created_by ?? 'u1',
} as BatchMovement)

const ctx = {
  itemBy: new Map([['C1', { name: 'Sement', price: 12 }]]),
  warehouses: ['Elet', 'Astara'],
}

const byDoc = (docs: ReturnType<typeof buildBatchDocs>, d: string) =>
  docs.find((x) => x.doc === d)!

describe('buildBatchDocs — grouping', () => {
  it('groups by document number and keeps the doc string EXACTLY as stored', () => {
    const docs = buildBatchDocs([
      row({ doc_num: 'D-1', item_code: 'C1' }),
      row({ doc_num: 'D-1', item_code: 'C1' }),
      row({ doc_num: ' D-1 ' }),
    ], ctx)
    /* ' D-1 ' is a DIFFERENT document: no trimming, no normalisation. The
       string is what gets sent to the server. */
    expect(docs.map((d) => d.doc).sort()).toEqual([' D-1 ', 'D-1'])
    expect(byDoc(docs, 'D-1').lines).toBe(2)
  })

  it('never merges doc-less rows into a synthetic document', () => {
    const docs = buildBatchDocs([
      row({ id: 'a', doc_num: null }),
      row({ id: 'b', doc_num: null }),
    ], ctx)
    expect(docs).toHaveLength(2)
    expect(docs.every((d) => d.legacy && d.key.startsWith('legacy:'))).toBe(true)
  })

  it('drops a group whose every line was row-level cancelled (5330)', () => {
    const docs = buildBatchDocs([
      row({ id: 'x', doc_num: 'D-9' }),
      row({ id: 'm', doc_num: 'D-9', note: 'Ləğv ID: x' }),
    ], ctx)
    expect(docs.find((d) => d.doc === 'D-9')).toBeUndefined()
  })

  /* The REAL shape written by `cancel_legacy_movement` / its layer wrapper:
     the reversal is its own numbered `SND-L-*` document whose single row carries
     `Ləğv ID: <original id>`, while the cancelled original is a DOC-LESS row in
     a different group. `REVERSAL_ANY` deliberately does not match that marker,
     so the safety here rests entirely on `stripRowLevelCancelled()` emptying
     both groups (5330). This is the ordinary sibling of the `SND-LR-*` transfer
     counter that was found selectable on TEST. */
  it('drops the SND-L-* legacy reversal document AND its doc-less original', () => {
    const docs = buildBatchDocs([
      row({ id: 'legacy-src', doc_num: null }),
      row({ id: 'rev', doc_num: 'SND-L-01905D9CEE', note: 'Ləğv ID: legacy-src' }),
    ], ctx)
    expect(docs.find((d) => d.doc === 'SND-L-01905D9CEE')).toBeUndefined()
    expect(docs.find((d) => d.key === 'legacy:legacy-src')).toBeUndefined()
    expect(docs).toHaveLength(0)
  })

  it('uses the EARLIEST row date, which is what the filters compare', () => {
    const docs = buildBatchDocs([
      row({ doc_num: 'D-2', date: '2026-06-01' }),
      row({ doc_num: 'D-2', date: '2026-03-15' }),
    ], ctx)
    expect(byDoc(docs, 'D-2').date).toBe('2026-03-15')
  })

  it('summarises a transfer from its OUTGOING rows only', () => {
    const docs = buildBatchDocs([
      row({ doc_num: 'T-1', type: 'Yerdəyişmə', out_qty: 4, in_qty: 0, warehouse: 'Elet' }),
      row({ doc_num: 'T-1', type: 'Yerdəyişmə', out_qty: 0, in_qty: 4, warehouse: 'Astara' }),
    ], ctx)
    const t = byDoc(docs, 'T-1')
    expect(t.lines).toBe(1)
    expect(t.totQty).toBe(4)
  })

  it('sorts newest first, then by document number', () => {
    const docs = buildBatchDocs([
      row({ doc_num: 'B', date: '2026-01-01' }),
      row({ doc_num: 'A', date: '2026-09-01' }),
    ], ctx)
    expect(docs.map((d) => d.doc)).toEqual(['A', 'B'])
  })
})

describe('buildBatchDocs — the eligibility ladder, in order', () => {
  it('1. a reversal marker wins over EVERY later branch', () => {
    /* Doc-less AND a reversal. Legacy tests isRev first, so it reports
       «reversal», not «doc-less». Reordering the ladder fails this. */
    const docs = buildBatchDocs([
      row({ id: 'r', doc_num: null, note: 'Ləğv: D-1' }),
    ], ctx)
    expect(docs[0].eligible).toBe(false)
    expect(docs[0].status).toBe(BATCH_STATUS_REVERSAL)
  })

  it('1. matches the transfer reversal marker too', () => {
    const docs = buildBatchDocs([
      row({ doc_num: 'R-1', note: 'Ləğv (əks yerdəyişmə): T-1' }),
    ], ctx)
    expect(docs[0].status).toBe(BATCH_STATUS_REVERSAL)
  })

  it('1. rejects a numbered counter created from a doc-less legacy transfer pair', () => {
    const docs = buildBatchDocs([
      row({
        doc_num: 'SND-LR-1',
        type: 'Yerdəyişmə',
        note: 'Ləğv (əks yerdəyişmə) ID: source-id:paired-id',
        in_qty: 0,
        out_qty: 5,
      }),
    ], ctx)
    expect(docs[0]).toMatchObject({
      eligible: false,
      status: BATCH_STATUS_REVERSAL,
    })
  })

  it('2. a doc-less row is listed but not selectable', () => {
    const docs = buildBatchDocs([row({ doc_num: null })], ctx)
    expect(docs[0].eligible).toBe(false)
    expect(docs[0].status).toBe(BATCH_STATUS_LEGACY)
  })

  it('3. an already-cancelled document names its reversal document', () => {
    const docs = buildBatchDocs([
      row({ doc_num: 'D-3' }),
      row({ doc_num: 'REV-3', note: 'Ləğv: D-3' }),
    ], ctx)
    const d = byDoc(docs, 'D-3')
    expect(d.eligible).toBe(false)
    expect(d.status).toContain('REV-3')
  })

  it('4. a mixed transfer + ordinary document is unsupported', () => {
    const docs = buildBatchDocs([
      row({ doc_num: 'M-1', type: 'Yerdəyişmə', out_qty: 1 }),
      row({ doc_num: 'M-1', type: 'Satınalma' }),
    ], ctx)
    expect(byDoc(docs, 'M-1')).toMatchObject({
      eligible: false, status: BATCH_STATUS_MIXED,
    })
  })

  it('5. a pure transfer is ELIGIBLE', () => {
    const docs = buildBatchDocs([
      row({ doc_num: 'T-2', type: 'Yerdəyişmə', out_qty: 2 }),
    ], ctx)
    expect(byDoc(docs, 'T-2')).toMatchObject({
      eligible: true, status: BATCH_STATUS_TRANSFER_OK,
    })
  })

  it('6. one cancellable type is ELIGIBLE', () => {
    const docs = buildBatchDocs([row({ doc_num: 'D-4', type: 'Silinmə' })], ctx)
    expect(byDoc(docs, 'D-4')).toMatchObject({
      eligible: true, status: BATCH_STATUS_OK,
    })
  })

  it('6. two DIFFERENT cancellable types are NOT eligible', () => {
    const docs = buildBatchDocs([
      row({ doc_num: 'D-5', type: 'Satınalma' }),
      row({ doc_num: 'D-5', type: 'Silinmə' }),
    ], ctx)
    expect(byDoc(docs, 'D-5')).toMatchObject({
      eligible: false, status: BATCH_STATUS_UNSUPPORTED,
    })
  })

  it('7. an unsupported type is listed with its reason, not hidden', () => {
    const docs = buildBatchDocs([row({ doc_num: 'D-6', type: 'Sifariş' })], ctx)
    expect(byDoc(docs, 'D-6')).toMatchObject({
      eligible: false, status: BATCH_STATUS_UNSUPPORTED,
    })
  })

  /* Ineligible documents must REMAIN in the list: hiding them would make an
     ineligible document indistinguishable from a filter miss (5408). */
  it('returns ineligible documents rather than dropping them', () => {
    const docs = buildBatchDocs([
      row({ doc_num: 'OK-1', type: 'Satınalma' }),
      row({ doc_num: 'BAD-1', type: 'Sifariş' }),
      row({ doc_num: null }),
    ], ctx)
    expect(docs).toHaveLength(3)
    expect(docs.filter((d) => d.eligible)).toHaveLength(1)
  })
})

describe('batchFilterDocs — the six filters', () => {
  const docs = buildBatchDocs([
    row({ doc_num: 'AAA-1', date: '2026-03-01', warehouse: 'Elet', type: 'Satınalma', item_code: 'C1' }),
    row({ doc_num: 'BBB-2', date: '2026-07-15', warehouse: 'Astara', type: 'Silinmə', item_code: 'C2' }),
  ], ctx)
  const f = (p: Partial<typeof EMPTY_BATCH_FILTERS>) =>
    batchFilterDocs(docs, normalizeBatchFilters(p)).map((d) => d.doc)

  it('treats empty inputs as no-ops', () => {
    expect(f({})).toHaveLength(2)
  })

  it('applies the date bounds INCLUSIVELY', () => {
    expect(f({ from: '2026-03-01' })).toContain('AAA-1')
    expect(f({ to: '2026-03-01' })).toEqual(['AAA-1'])
    expect(f({ from: '2026-03-02' })).toEqual(['BBB-2'])
  })

  it('filters by warehouse membership', () => {
    expect(f({ wh: 'Astara' })).toEqual(['BBB-2'])
  })

  it('filters by type membership', () => {
    expect(f({ type: 'Silinmə' })).toEqual(['BBB-2'])
  })

  it('matches the document number case-insensitively, as a substring', () => {
    expect(f({ doc: 'aaa' })).toEqual(['AAA-1'])
    expect(f({ doc: 'A-1' })).toEqual(['AAA-1'])
  })

  it('matches the item search against BOTH codes and names', () => {
    expect(f({ q: 'c1' })).toEqual(['AAA-1'])
    /* 'Sement' is C1's NAME from itemBy — a name-only match must work. */
    expect(f({ q: 'seme' })).toEqual(['AAA-1'])
  })

  /* Legacy quirk, ported deliberately: the type options are the CANCELLABLE
     set, so an unsupported-type document cannot be reached by the type filter
     at all. Flagged, not "improved". */
  it('offers only Yerdəyişmə + the cancellable types as filter options', () => {
    expect(BATCH_TYPE_OPTIONS[0]).toBe('Yerdəyişmə')
    expect(BATCH_TYPE_OPTIONS).not.toContain('Sifariş')
  })
})

describe('resolveBatchSelection — the one gate both callers use', () => {
  const docs = buildBatchDocs([
    row({ doc_num: 'D-1', type: 'Satınalma' }),
    row({ doc_num: 'D-2', type: 'Silinmə' }),
    row({ doc_num: 'BAD', type: 'Sifariş' }),
  ], ctx)

  it('keeps eligible selections and reports the payload', () => {
    const r = resolveBatchSelection(docs, new Set(['doc:D-1', 'doc:D-2']))
    expect(r.docNums.sort()).toEqual(['D-1', 'D-2'])
    expect(r.dropped).toEqual([])
  })

  it('drops an ineligible selection and NAMES it with its reason', () => {
    const r = resolveBatchSelection(docs, new Set(['doc:D-1', 'doc:BAD']))
    expect(r.docNums).toEqual(['D-1'])
    expect(r.dropped).toEqual([
      { key: 'doc:BAD', doc: 'BAD', status: BATCH_STATUS_UNSUPPORTED },
    ])
  })

  /* THE STALE-SNAPSHOT FIX. Legacy builds BC.docs once (5375) and the confirm
     step re-filters on that stale `eligible` (5454), so a document cancelled
     meanwhile is still submitted — and the server aborts the WHOLE batch. Here
     the same call against REBUILT documents drops it. */
  it('drops a document that became cancelled since selection', () => {
    const selection = new Set(['doc:D-1', 'doc:D-2'])
    const before = resolveBatchSelection(docs, selection)
    expect(before.docNums).toHaveLength(2)

    const after = resolveBatchSelection(
      buildBatchDocs([
        row({ doc_num: 'D-1', type: 'Satınalma' }),
        row({ doc_num: 'D-2', type: 'Silinmə' }),
        row({ doc_num: 'REV', note: 'Ləğv: D-2' }),
      ], ctx),
      selection,
    )
    expect(after.docNums).toEqual(['D-1'])
    expect(after.dropped[0].doc).toBe('D-2')
  })

  it('reports a selection whose document vanished entirely', () => {
    const r = resolveBatchSelection(docs, new Set(['doc:GONE']))
    expect(r.vanished).toEqual(['doc:GONE'])
    expect(r.docNums).toEqual([])
  })

  /* A duplicate doc_num is a server ERROR, not a silent dedupe, so the payload
     builder must never emit one. */
  it('dedupes the payload defensively', () => {
    const dupes = buildBatchDocs([
      row({ id: 'a', doc_num: 'SAME', type: 'Satınalma' }),
      row({ id: 'b', doc_num: 'SAME', type: 'Satınalma' }),
    ], ctx)
    const r = resolveBatchSelection(dupes, new Set(dupes.map((d) => d.key)))
    expect(r.docNums).toEqual(['SAME'])
  })
})

describe('sameDocNums — a changed selection needs renewed confirmation', () => {
  it('is true only for the identical list in the identical order', () => {
    expect(sameDocNums(['A', 'B'], ['A', 'B'])).toBe(true)
    expect(sameDocNums(['A', 'B'], ['B', 'A'])).toBe(false)
    expect(sameDocNums(['A'], ['A', 'B'])).toBe(false)
    expect(sameDocNums([], [])).toBe(true)
  })
})
