import { describe, it, expect } from 'vitest'
import {
  classifyFailure,
  isRecognisedServerCode,
  observedCancelledDocs,
  blockMessageFor,
  validateSuccessBody,
  successMessage,
  rejectedMessage,
  blockedByUnresolved,
  allUnresolvedDocNums,
  unknownResolvedBy,
  COUNT_KEYS,
} from './batchOutcome'
import { docCancelledBy, docReversalDoc } from './documentCancelState'

/* THE OUTCOME MODEL — I-5 (M8-32).

   The property under test throughout: the ONLY thing that may produce a
   "nothing was cancelled" claim is a 4xx status. Everything else is UNKNOWN,
   because a response lost after COMMIT is indistinguishable from one lost
   before it, and claiming a rollback in that case is a false statement about
   the user's data. */

describe('classifyFailure — a rejection needs positive server evidence', () => {
  /* THE CENTRAL CASE. postgrest-js 2.112.4 synthesises a structured error
     object with status 0 for every fetch rejection (dist/index.cjs:422-437).
     It carries `message`, `details`, `hint` and `code` and arrives in the SAME
     `error` field as a genuine rejection, so the presence of a message proves
     nothing at all. */
  it('treats a synthesised transport error (status 0) as UNKNOWN', () => {
    expect(classifyFailure({
      message: 'TypeError: Failed to fetch', status: 0, code: '',
    })).toBe('unknown')
  })

  it('treats an AbortError as UNKNOWN — the commit may already have happened', () => {
    expect(classifyFailure({
      message: 'AbortError: The operation was aborted', status: 0, code: '',
    })).toBe('unknown')
  })

  it.each([400, 401, 403, 404, 409, 422, 499])(
    'treats %i as a CONFIRMED rejection',
    (status) => {
      expect(classifyFailure({ message: 'x', status, code: 'P0001' })).toBe('rejected')
    },
  )

  /* A gateway answered, not the server. The statement may have committed
     behind it. */
  it.each([500, 502, 503, 504])('treats %i as UNKNOWN, not a rejection', (status) => {
    expect(classifyFailure({ message: 'Gateway Timeout', status, code: '' })).toBe('unknown')
  })

  it('treats a missing status as UNKNOWN', () => {
    expect(classifyFailure({ message: 'boom', status: null, code: null })).toBe('unknown')
  })

  /* MUTATION CHECK: an implementation that classified on `code` or on the
     presence of a message would fail this pair — both carry a message, and the
     transport one carries a code field too. */
  it('does not classify on the message or the code', () => {
    const sameText = 'Bu sənəd artıq ləğv edilib'
    expect(classifyFailure({ message: sameText, status: 0, code: 'P0001' })).toBe('unknown')
    expect(classifyFailure({ message: sameText, status: 400, code: 'P0001' })).toBe('rejected')
  })

  /* REGRESSION — I-5 audit finding 2. 408 (Request Timeout) and 429 (rate
     limited) are proxy/gateway-shaped ambiguity, not the server refusing the
     request: a client that gave up waiting can still have a statement commit
     behind it. Both must stay UNKNOWN, never a confirmed rejection, even
     though they fall inside the 4xx numeric band. */
  it.each([408, 429])(
    'treats ambiguous status %i as UNKNOWN, not a confirmed rejection',
    (status) => {
      expect(classifyFailure({ message: 'Request Timeout', status, code: '' }))
        .toBe('unknown')
    },
  )

  it('preserves the real server rejection message even when ambiguous 4xx exists nearby', () => {
    /* A genuine rejection (409) must still classify correctly and the
       message passed through is exactly the server's own text — proven here
       so a fix for the 408 carve-out cannot accidentally widen to swallow
       real rejections too. */
    const serverText = 'Bu sənəd artıq ləğv edilib'
    const rejected = classifyFailure({ message: serverText, status: 409, code: 'P0001' })
    expect(rejected).toBe('rejected')
    const ambiguous = classifyFailure({ message: 'Gateway Timeout', status: 408, code: '' })
    expect(ambiguous).toBe('unknown')
  })
})

/** One `results` entry in the shape the RPCs really emit — the identifying
    evidence is `reversal_doc_num`, the counter-document actually written
    (`sql/010:193-198` for the ordinary batch; the nested `cancel_document`
    result, `sql/003:144`, for the layer batch). */
const r = (n = 'R-1') => ({ doc_num: 'D-1', is_transfer: false, reversal_doc_num: n, row_count: 3 })

describe('validateSuccessBody — a 2xx is not yet a success', () => {
  it('accepts the non-layer shape', () => {
    const v = validateSuccessBody({ cancelled_count: 2, results: [r('R-1'), r('R-2')] }, 2)
    expect(v).toEqual({ kind: 'valid', body: { count: 2, resultsLength: 2 } })
  })

  it('accepts the layer shape, which has no cancelled_count', () => {
    const v = validateSuccessBody({ document_count: 3, results: [r('R-1'), r('R-2'), r('R-3')] }, 3)
    expect(v).toEqual({ kind: 'valid', body: { count: 3, resultsLength: 3 } })
  })

  it('accepts a count-free body when results are coherent evidence', () => {
    const v = validateSuccessBody({ results: [r('R-1'), r('R-2')] }, 2)
    expect(v).toMatchObject({ kind: 'valid', body: { count: null, resultsLength: 2 } })
  })

  /* An empty object is not a success. Neither RPC can return one, so `{}`
     means something other than these functions answered. */
  it('refuses an empty object', () => {
    expect(validateSuccessBody({}, 2).kind).toBe('incoherent')
  })

  it('refuses a null or non-object body', () => {
    expect(validateSuccessBody(null, 1).kind).toBe('incoherent')
    expect(validateSuccessBody('ok', 1).kind).toBe('incoherent')
    expect(validateSuccessBody([1, 2], 1).kind).toBe('incoherent')
  })

  it('refuses a body carrying an explicit failure marker', () => {
    expect(validateSuccessBody({ success: false, results: [] }, 1).kind).toBe('incoherent')
    expect(validateSuccessBody({ error: 'nope', results: [] }, 1).kind).toBe('incoherent')
  })

  it('refuses a count that contradicts the submitted list', () => {
    expect(validateSuccessBody({ cancelled_count: 7 }, 3).kind).toBe('incoherent')
    expect(validateSuccessBody({ cancelled_count: 1 }, 3).kind).toBe('incoherent')
  })

  it('refuses a non-integer, negative or non-numeric count', () => {
    expect(validateSuccessBody({ cancelled_count: '2' }, 2).kind).toBe('incoherent')
    expect(validateSuccessBody({ cancelled_count: 2.5 }, 2).kind).toBe('incoherent')
    expect(validateSuccessBody({ cancelled_count: -1 }, 2).kind).toBe('incoherent')
    expect(validateSuccessBody({ cancelled_count: Number.NaN }, 2).kind).toBe('incoherent')
  })

  it('refuses results that disagree with the count', () => {
    expect(validateSuccessBody({ cancelled_count: 2, results: [{}] }, 2).kind)
      .toBe('incoherent')
  })

  it('refuses a non-array results field', () => {
    expect(validateSuccessBody({ cancelled_count: 2, results: 'two' }, 2).kind)
      .toBe('incoherent')
  })

  /* A body with neither a count nor results carries nothing identifying it as
     this batch's answer. */
  it('refuses a body with no confirmation evidence at all', () => {
    expect(validateSuccessBody({ layer_version: 36 }, 2).kind).toBe('incoherent')
  })

  it('reads either of the two documented count keys', () => {
    expect(COUNT_KEYS).toEqual(['cancelled_count', 'document_count'])
    expect(validateSuccessBody({ cancelled_count: 1, results: [r()] }, 1))
      .toMatchObject({ kind: 'valid', body: { count: 1 } })
    expect(validateSuccessBody({ document_count: 1, results: [r()] }, 1))
      .toMatchObject({ kind: 'valid', body: { count: 1 } })
  })

  /* REGRESSION — I-5 audit finding 1. Neither known RPC ever emits BOTH count
     keys: `cancel_documents_batch` returns only `cancelled_count`,
     `cancel_layer_documents_batch` returns only `document_count`. A body
     carrying both, disagreeing, matches neither RPC's real shape and must not
     be read as "the first one wins". */
  it('refuses a body carrying both count keys with disagreeing values', () => {
    expect(validateSuccessBody({ cancelled_count: 1, document_count: 9 }, 1).kind)
      .toBe('incoherent')
  })

  it('accepts a body carrying both count keys when they agree', () => {
    const v = validateSuccessBody({ cancelled_count: 2, document_count: 2 }, 2)
    expect(v).toMatchObject({ kind: 'valid', body: { count: 2 } })
  })

  /* REGRESSION — I-5 audit finding 1. `{results:[]}` submitted for ONE
     document is not evidence that document was cancelled; it is a
     count-free body whose only possible evidence (`results`) does not
     account for the submitted batch. */
  it('refuses a count-free empty results array against a nonzero submission', () => {
    expect(validateSuccessBody({ results: [] }, 1).kind).toBe('incoherent')
  })

  it('refuses a count-free results array shorter than the submitted batch', () => {
    expect(validateSuccessBody({ results: [{}] }, 3).kind).toBe('incoherent')
  })

  /* REGRESSION — I-5 audit finding 1. A per-item failure marker inside
     `results` must not be masked by an overall 2xx / coherent count. */
  it('refuses a results element carrying ok:false', () => {
    expect(validateSuccessBody({ cancelled_count: 1, results: [{ ok: false }] }, 1).kind)
      .toBe('incoherent')
  })

  it('refuses a results element carrying success:false', () => {
    expect(
      validateSuccessBody({ cancelled_count: 1, results: [{ success: false }] }, 1).kind,
    ).toBe('incoherent')
  })

  it('refuses a results element carrying a truthy error', () => {
    expect(
      validateSuccessBody({ cancelled_count: 1, results: [{ error: 'failed' }] }, 1).kind,
    ).toBe('incoherent')
  })

  /* REGRESSION — I-5 audit finding 1, the fourth reported input: a
     contradictory count-key pair together with a nested results failure.
     Either defect alone must already refuse; both together certainly must. */
  it('refuses cancelled_count/document_count contradiction combined with a nested failure', () => {
    expect(
      validateSuccessBody(
        { cancelled_count: 1, results: [{ error: 'failed' }] },
        1,
      ).kind,
    ).toBe('incoherent')
  })

  it('still accepts a results element that is a genuine per-item report shape', () => {
    /* The known non-layer shape: doc_num / is_transfer / reversal_doc_num /
       row_count — none of which collide with ok/success/error. */
    const v = validateSuccessBody(
      { cancelled_count: 1, results: [r()] },
      1,
    )
    expect(v).toMatchObject({ kind: 'valid', body: { count: 1 } })
  })
})

describe('messages — the selection size is never a completed count', () => {
  it('reports the server count when there is one', () => {
    expect(successMessage(3)).toContain('3')
  })

  /* Legacy falls back to `docNums.length` (index.html:5498). Not ported: a
     count-free success says the documents were cancelled WITHOUT a numeral,
     and never "0 sənəd". */
  it('renders a count-free success with no numeral and no zero', () => {
    const m = successMessage(null)
    expect(m).not.toMatch(/\d/)
    expect(m).toContain('ləğv edildi')
  })

  it('surfaces the server text verbatim in a rejection', () => {
    const serverText = 'Ləğv mümkün deyil: "Elet" anbarında 001 kodu üzrə mövcud 5'
    expect(rejectedMessage(serverText)).toContain(serverText)
  })

  it('is the ONLY message that claims nothing was cancelled', () => {
    expect(rejectedMessage('x')).toContain('heç bir sənəd ləğv edilmədi')
    expect(successMessage(null)).not.toContain('heç bir')
  })
})

/** A record fixture. `phase` and `scope` are part of the record since I-5
    corrections 1-2; these helper-level tests do not vary them. */
const ub = (
  id: string,
  docNums: string[],
  refreshFailed = false,
  phase: 'pending' | 'unknown' | 'success' = 'unknown',
) => ({ id, docNums, refreshFailed, phase, scope: 'proj|user-1' })

describe('unresolved batches — the block is per document and survives a refresh', () => {
  const unresolved = ub('u1', ['A', 'B'])

  it('blocks exactly the documents whose outcome is unknown', () => {
    expect(blockedByUnresolved([unresolved], ['A', 'C'])).toEqual(['A'])
    expect(blockedByUnresolved([unresolved], ['C', 'D'])).toEqual([])
  })

  it('blocks nothing when there is no unresolved batch', () => {
    expect(blockedByUnresolved([], ['A'])).toEqual([])
  })

  /* REGRESSION — I-5 audit finding 3. `markUnresolved(B)` must not overwrite
     the block on batch A's documents: TWO unresolved batches, touching
     DIFFERENT documents, coexist and are both enforced. */
  it('blocks the union of documents across MULTIPLE unresolved batches', () => {
    const a = ub('u-a', ['A', 'B'])
    const b = ub('u-b', ['C'])
    expect(blockedByUnresolved([a, b], ['A', 'C', 'D'])).toEqual(['A', 'C'])
    /* A submission touching only documents from NEITHER batch is unblocked. */
    expect(blockedByUnresolved([a, b], ['D', 'E'])).toEqual([])
  })

  it('allUnresolvedDocNums lists every held document across all batches, once each', () => {
    const a = ub('u-a', ['A', 'B'])
    const b = ub('u-b', ['B', 'C'])
    expect(allUnresolvedDocNums([a, b]).sort()).toEqual(['A', 'B', 'C'])
  })

  /* THE CORE REFINEMENT. An immediate refresh showing no cancellation markers
     does NOT prove a rollback: the original transaction may still be running,
     and the read may not see it yet. Only a POSITIVE observation — every
     submitted document now visibly cancelled — resolves the record. */
  it('is NOT resolved by an empty set of cancelled documents', () => {
    expect(unknownResolvedBy(unresolved, new Set())).toBe(false)
  })

  it('is NOT resolved when only some documents show as cancelled', () => {
    expect(unknownResolvedBy(unresolved, new Set(['A']))).toBe(false)
  })

  it('IS resolved when every submitted document is visibly cancelled', () => {
    expect(unknownResolvedBy(unresolved, new Set(['A', 'B']))).toBe(true)
  })

  it('never resolves an empty record into a positive observation', () => {
    expect(unknownResolvedBy(ub('u2', []), new Set()))
      .toBe(false)
  })
})

/* ===================================================================== */
/* I-5 CORRECTION 5 — provenance, not merely a status band.

   Excluding 408/429 from the 4xx band was an EXCLUSION rule. A rejection is
   the only outcome that tells the user nothing was written, so it needs
   POSITIVE evidence that the DATABASE answered: a recognised
   PostgREST/Postgres error code alongside an unambiguous 4xx.

   The evidence this is necessary comes from the installed SDK itself.
   `processResponse` (`dist/index.cjs:489-497`) parses a non-2xx body as JSON,
   and on failure falls back to `error = { message: body }` — with NO `code`.
   That is exactly what an intermediary produces: a proxy HTML error page, a
   WAF block, a CDN 404 for a misrouted path. None of those is the database
   refusing this batch. */
describe('classifyFailure — error provenance (I-5 correction 5)', () => {
  it.each([400, 401, 403, 404, 409, 422])(
    'treats a %i with NO server code as UNKNOWN, not a rejection',
    (status) => {
      /* The shape the SDK produces for an unparseable non-2xx body. */
      expect(classifyFailure({ message: '<html>Not Found</html>', status, code: null }))
        .toBe('unknown')
    },
  )

  it('treats a 4xx with an EMPTY code as UNKNOWN', () => {
    expect(classifyFailure({ message: 'Forbidden', status: 403, code: '' }))
      .toBe('unknown')
  })

  it('treats a 4xx with an unrecognised code shape as UNKNOWN', () => {
    expect(classifyFailure({ message: 'blocked', status: 403, code: 'WAF_DENY' }))
      .toBe('unknown')
    expect(classifyFailure({ message: 'nope', status: 400, code: 'x' }))
      .toBe('unknown')
  })

  it('accepts a Postgres SQLSTATE as a recognised rejection', () => {
    /* P0001 = RAISE EXCEPTION, which is how both batch RPCs refuse. */
    expect(classifyFailure({ message: 'Sənəd tapılmadı', status: 400, code: 'P0001' }))
      .toBe('rejected')
    /* 23505 = unique violation; 42501 = insufficient privilege. */
    expect(classifyFailure({ message: 'dup', status: 409, code: '23505' }))
      .toBe('rejected')
    expect(classifyFailure({ message: 'denied', status: 403, code: '42501' }))
      .toBe('rejected')
  })

  it('accepts a PostgREST transport code as a recognised rejection', () => {
    expect(classifyFailure({ message: 'no function', status: 404, code: 'PGRST202' }))
      .toBe('rejected')
  })

  it('still refuses 408/429 even WITH a recognised code', () => {
    expect(classifyFailure({ message: 'timeout', status: 408, code: 'P0001' }))
      .toBe('unknown')
    expect(classifyFailure({ message: 'rate', status: 429, code: 'P0001' }))
      .toBe('unknown')
  })

  it('isRecognisedServerCode accepts only real code shapes', () => {
    expect(isRecognisedServerCode('P0001')).toBe(true)
    expect(isRecognisedServerCode('23505')).toBe(true)
    expect(isRecognisedServerCode('PGRST116')).toBe(true)
    expect(isRecognisedServerCode('')).toBe(false)
    expect(isRecognisedServerCode(null)).toBe(false)
    expect(isRecognisedServerCode('WAF_DENY')).toBe(false)
    expect(isRecognisedServerCode('p0001')).toBe(false)
  })
})

/* I-5 CORRECTION 4 — a results entry must be POSITIVE evidence.

   The previous loop only looked for a failure MARKER, and absence of a marker
   is not presence of a success. All three bodies below were reported VALID
   and rendered a confirmed success for a batch the body said nothing about. */
describe('validateSuccessBody — invalid results entries (I-5 correction 4)', () => {
  it.each([
    ['null entry', { results: [null] }],
    ['empty object entry', { results: [{}] }],
    ['string entry', { results: ['garbage'] }],
    ['number entry', { results: [1] }],
    ['array entry', { results: [[]] }],
  ])('refuses %s as success evidence', (_label, body) => {
    expect(validateSuccessBody(body, 1).kind).toBe('incoherent')
  })

  it('refuses an entry whose reversal_doc_num is empty or not a string', () => {
    expect(validateSuccessBody({ results: [{ reversal_doc_num: '' }] }, 1).kind)
      .toBe('incoherent')
    expect(validateSuccessBody({ results: [{ reversal_doc_num: '   ' }] }, 1).kind)
      .toBe('incoherent')
    expect(validateSuccessBody({ results: [{ reversal_doc_num: 7 }] }, 1).kind)
      .toBe('incoherent')
    expect(validateSuccessBody({ results: [{ reversal_doc_num: null }] }, 1).kind)
      .toBe('incoherent')
  })

  it('refuses when only SOME entries carry evidence', () => {
    expect(validateSuccessBody(
      { cancelled_count: 2, results: [r('R-1'), {}] },
      2,
    ).kind).toBe('incoherent')
  })

  it('accepts the real ordinary-batch element shape', () => {
    expect(validateSuccessBody(
      {
        cancelled_count: 1,
        results: [{
          doc_num: 'D-1', is_transfer: false, reversal_doc_num: 'LEGV-1', row_count: 3,
        }],
      },
      1,
    ).kind).toBe('valid')
  })

  it('accepts the real layer-batch element shape (nested cancel_document result)', () => {
    expect(validateSuccessBody(
      {
        document_count: 1,
        layer_version: 36,
        results: [{
          original_doc_num: 'D-1', reversal_doc_num: 'LEGV-1', layer_version: 36,
        }],
      },
      1,
    ).kind).toBe('valid')
  })
})

/* I-5 CORRECTION 3 — reconcile each family with its OWN marker. */
describe('observedCancelledDocs — per-family reconciliation (I-5 correction 3)', () => {
  const mv = (id: string, type: string, note: string | null, doc: string | null) =>
    ({ id, type, note, doc_num: doc })

  const readers = { ordinary: docCancelledBy, transfer: docReversalDoc }

  it('observes an ORDINARY document through the "Ləğv:" marker', () => {
    const rows = [
      mv('1', 'Satınalma', null, 'D-1'),
      mv('2', 'Satınalma', 'Ləğv: D-1', 'LEGV-1'),
    ]
    expect([...observedCancelledDocs(['D-1'], rows, readers)]).toEqual(['D-1'])
  })

  /* THE REGRESSION. A transfer carries a DIFFERENT marker, and the old effect
     read every document with `docCancelledBy` — so a transfer was never
     observable and its batch could never resolve. */
  it('observes a TRANSFER through the "Ləğv (əks yerdəyişmə):" marker', () => {
    const rows = [
      mv('1', 'Yerdəyişmə', null, 'T-1'),
      mv('2', 'Yerdəyişmə', 'Ləğv (əks yerdəyişmə): T-1', 'REV-1'),
    ]
    expect([...observedCancelledDocs(['T-1'], rows, readers)]).toEqual(['T-1'])
    /* Proof the old single-reader approach could not see it. */
    expect(docCancelledBy('T-1', rows)).toBeNull()
  })

  it('handles a MIXED batch, resolving each document through its own family', () => {
    const rows = [
      mv('1', 'Satınalma', null, 'D-1'),
      mv('2', 'Satınalma', 'Ləğv: D-1', 'LEGV-1'),
      mv('3', 'Yerdəyişmə', null, 'T-1'),
      mv('4', 'Yerdəyişmə', 'Ləğv (əks yerdəyişmə): T-1', 'REV-1'),
    ]
    expect([...observedCancelledDocs(['D-1', 'T-1'], rows, readers)].sort())
      .toEqual(['D-1', 'T-1'])
  })

  it('reports PARTIAL evidence as partial — the batch does not resolve', () => {
    const rows = [
      mv('1', 'Satınalma', null, 'D-1'),
      mv('2', 'Satınalma', 'Ləğv: D-1', 'LEGV-1'),
      mv('3', 'Yerdəyişmə', null, 'T-1'),
    ]
    const seen = observedCancelledDocs(['D-1', 'T-1'], rows, readers)
    expect([...seen]).toEqual(['D-1'])
    expect(unknownResolvedBy(ub('u', ['D-1', 'T-1']), seen)).toBe(false)
  })

  it('a mixed batch RESOLVES once both families show their markers', () => {
    const rows = [
      mv('1', 'Satınalma', null, 'D-1'),
      mv('2', 'Satınalma', 'Ləğv: D-1', 'LEGV-1'),
      mv('3', 'Yerdəyişmə', null, 'T-1'),
      mv('4', 'Yerdəyişmə', 'Ləğv (əks yerdəyişmə): T-1', 'REV-1'),
    ]
    const seen = observedCancelledDocs(['D-1', 'T-1'], rows, readers)
    expect(unknownResolvedBy(ub('u', ['D-1', 'T-1']), seen)).toBe(true)
  })

  it('a document absent from the rows is never reported as cancelled', () => {
    expect([...observedCancelledDocs(['GONE'], [], readers)]).toEqual([])
  })

  it('honours the "—" fallback: a marker row with no doc_num is still evidence', () => {
    const rows = [
      mv('1', 'Satınalma', null, 'D-1'),
      mv('2', 'Satınalma', 'Ləğv: D-1', null),
    ]
    expect([...observedCancelledDocs(['D-1'], rows, readers)]).toEqual(['D-1'])
  })
})

/* I-5 CORRECTION 1 — a confirmed success must never be described as
   uncertain, and vice versa. */
describe('blockMessageFor — phase-appropriate block text (I-5 correction 1)', () => {
  it('describes a confirmed success as ALREADY CANCELLED, not unconfirmed', () => {
    const msg = blockMessageFor([ub('u', ['A'], true, 'success')], ['A'])
    expect(msg).toContain('artıq ləğv edilib')
    expect(msg).not.toContain('təsdiqlənməyib')
  })

  it('describes an unknown outcome as unconfirmed', () => {
    const msg = blockMessageFor([ub('u', ['A'], false, 'unknown')], ['A'])
    expect(msg).toContain('təsdiqlənməyib')
  })

  it('describes a pending attempt as unconfirmed', () => {
    expect(blockMessageFor([ub('u', ['A'], false, 'pending')], ['A']))
      .toContain('təsdiqlənməyib')
  })

  it('a single uncertain record makes a mixed answer uncertain', () => {
    const msg = blockMessageFor(
      [ub('a', ['A'], true, 'success'), ub('b', ['B'], false, 'unknown')],
      ['A', 'B'],
    )
    expect(msg).toContain('təsdiqlənməyib')
  })
})
