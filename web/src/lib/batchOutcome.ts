/* THE FOUR OUTCOMES OF A BATCH CANCELLATION — Phase 8, milestone I-5 (M8-32).

   Server atomicity constrains the DATABASE to two end states: the whole batch
   committed, or none of it. It says NOTHING about which one the client learns.
   Between COMMIT and the response reaching the browser sit a PostgREST process,
   a gateway and a network, and a response lost after the commit is ordinary:

     - fetch rejects while the commit already succeeded
     - a gateway returns 502/503/504 after the statement committed
     - an abort or client timeout fires after the server committed
     - the tab is suspended mid-flight

   In every one of those the documents ARE cancelled and the client holds only
   an error. Telling the user «nothing was cancelled» there is a false statement
   about their data, and it invites a resubmission that will then fail against a
   batch already cancelled.

   So atomicity reduces the outcome space from 2^n partial states to THREE
   database states — committed, rolled back, and NOT YET KNOWN WHICH — plus the
   separate case of a refresh that fails after a confirmed success. Four
   outcomes, and the UI must render all four.

   ---------------------------------------------------------------------------
   HOW A REJECTION IS RECOGNISED, and why the presence of an error object is
   NOT the test.

   The installed `@supabase/postgrest-js` (2.112.4) SYNTHESISES a structured
   error for any fetch rejection — `dist/index.cjs:422-437`:

     return { success: false, error: { message: `${name}: ${message}`,
              details, hint, code }, data: null, count: null,
              status: 0, statusText: '' }

   That object has `message`, `details`, `hint` and `code` — it is shaped
   exactly like a server error and arrives in the SAME `error` field. A network
   failure, a DNS failure and an AbortError all produce it. Classifying on "an
   error object with a message" would therefore mark every network failure as a
   CONFIRMED REJECTION and tell the user nothing was written — the precise error
   this module exists to prevent.

   The discriminator is the HTTP STATUS. A real PostgREST rejection carries the
   response's own status (`processResponse`, `index.cjs:487-505`): 400 for a
   raised exception, 401/403 for a refusal, 409 for a conflict. The synthesised
   transport error carries `status: 0`, and `code` is empty for aborts.

     status >= 400 and < 500   → the server answered and rejected  → REJECTED
     status 0                  → the request never completed        → UNKNOWN
     status 502 / 503 / 504    → a gateway answered, not the server → UNKNOWN
     anything else, or absent  → cannot be classified               → UNKNOWN

   UNKNOWN IS THE SAFE DEFAULT. It is honest under both database states, and
   its only cost is a reconciliation. REJECTED is the only outcome that claims
   nothing was written, so it requires positive evidence from the server. */

/** The four outcomes. Nothing outside this union is renderable. */
export type BatchOutcomeKind =
  | 'success'
  | 'rejected'
  | 'unknown'
  | 'success-refresh-failed'

/** What the API layer preserves about a failure so it can be classified. */
export interface TransportFailure {
  /** The server's own message, verbatim — never re-worded. */
  message: string
  /** The HTTP status. 0 for a synthesised transport error; null when absent. */
  status: number | null
  /** PostgREST `code`, when the server supplied one. Empty for aborts. */
  code: string | null
}

/* 408 (Request Timeout) is deliberately carved OUT of the 4xx→rejected rule.
   It is not the server refusing the request the way 400/401/403/409/422 are —
   it is a proxy or the server itself giving up on a slow client, and a
   PostgREST/pgbouncer statement that was already committing when the timeout
   fired can still land. Treating 408 as a confirmed rejection would repeat
   exactly the mistake this module exists to prevent, one HTTP status later.
   429 (rate limited) is the same shape of ambiguity — the request may not
   have reached the database at all — so it stays UNKNOWN too. */
const AMBIGUOUS_4XX = new Set([408, 429])

/* THE POSITIVE-EVIDENCE RULE, and why a bare 4xx is not enough — I-5
   correction 5.

   The previous rule was "any 4xx except 408/429 is a rejection". That is an
   EXCLUSION rule, not the positive-evidence rule the outcome model requires,
   and the installed SDK shows why it is unsafe. In `processResponse`
   (`'`supabase/postgrest-js'` 2.112.4, `dist/index.cjs:489-497`) a non-2xx
   response whose body does NOT parse as JSON produces:

     error = { message: body }

   — a bare message with NO `code`. That is the shape an INTERMEDIARY
   produces: a proxy HTML error page, a WAF block, a CDN 404 for a misrouted
   path, an auth gateway's own 403. None of them is the DATABASE refusing the
   statement, and several of them (a gateway that dropped a request already
   forwarded upstream) are exactly as ambiguous as a 502.

   PostgREST itself always answers with a JSON body carrying a `code`: a
   `PGRSTxxx` transport-layer code, or the five-character SQLSTATE Postgres
   raised (`P0001` for a RAISE EXCEPTION, `23xxx` for a constraint violation,
   `42501` for permission denied). The type declaration bundled with the
   installed SDK states it as a REQUIRED field (`dist/index.d.cts:26-29` —
   `details`, `hint` and `code` are non-optional on `PostgrestError`).

   So the recognised server-rejection contract is: a 4xx that is not
   structurally ambiguous AND a well-formed PostgREST/Postgres error code.
   Anything else — a code-free 4xx, an unrecognised code shape, a 404 from
   something that was never PostgREST — is UNKNOWN, because we cannot show
   that the database saw and refused this batch. */

/** A PostgREST transport-layer code: `PGRST` + three digits. */
const PGRST_CODE = /^PGRST\d{3}$/
/** A Postgres SQLSTATE: five alphanumerics, e.g. `P0001`, `23505`, `42501`. */
const SQLSTATE_CODE = /^[0-9A-Z]{5}$/

/**
 * Whether `code` is a code either PostgREST or Postgres actually emits.
 *
 * An empty string is NOT recognised: that is what the SDK synthesises for an
 * abort (`dist/index.cjs:417`), and what a body-less intermediary error
 * leaves behind.
 */
export function isRecognisedServerCode(code: string | null): boolean {
  if (!code) return false
  return PGRST_CODE.test(code) || SQLSTATE_CODE.test(code)
}

/**
 * Classify a failure. The ONLY function that may return `'rejected'`.
 *
 * REJECTED requires POSITIVE evidence that the database saw the request and
 * refused it: an unambiguous 4xx status AND a recognised PostgREST/Postgres
 * error code. Everything else stays UNKNOWN — status 0, a gateway 5xx, a
 * missing status, an unrecognised status, and now also a 4xx that arrived
 * without a recognisable server error code.
 *
 * 500 is deliberately NOT a rejection: an internal error can be raised after a
 * commit as easily as before one, and PostgREST returns 500 for conditions the
 * client cannot attribute. 408 and 429 are carved out of the 4xx band for the
 * same reason — a proxy or the server giving up on a slow client says nothing
 * about a statement that may already have been committing.
 */
export function classifyFailure(f: TransportFailure): 'rejected' | 'unknown' {
  const s = f.status
  if (s == null) return 'unknown'
  if (AMBIGUOUS_4XX.has(s)) return 'unknown'
  if (s < 400 || s >= 500) return 'unknown'
  /* An unambiguous 4xx, but only the server's own code proves the server is
     what answered. A code-free 4xx is an intermediary until proven otherwise. */
  return isRecognisedServerCode(f.code) ? 'rejected' : 'unknown'
}

/* -------------------------------------------------------------------------
   SUCCESS VALIDATION — one validator, and what it may and may not decide.

   A 2xx response is necessary but not sufficient. The body must also be
   COHERENT before the UI claims a confirmed success:

     - `data` must be a non-null object (an empty object is NOT a success:
       neither RPC can return one, so an empty body means something else
       answered)
     - an explicit failure marker in the body wins over the status, including
       one nested inside a `results` element — neither RPC emits one today,
       but a results entry that says it failed is never folded into success
     - a count, when present, must be a finite non-negative integer AND must
       not contradict the submitted list
     - if BOTH count keys are present, they must agree — a body with neither
       RPC's known shape is not this batch's answer
     - a count-free `results` array must account for every submitted document
       (`{results:[]}` for one submitted document is silence, not evidence)

   THE PROPOSAL CONTRADICTION, RESOLVED. §4.4 rule 5 said "the count never
   drives control flow", while rule 4 routed a contradictory count to UNKNOWN.
   Both cannot hold. The resolution, and the rule this module implements:

     A count NEVER decides HOW MANY documents were cancelled.
     A count MAY decide WHETHER THE RESPONSE IS COHERENT.

   Those are different questions. The first is forbidden because both server
   counts are counts of ATTEMPTS, not of confirmed cancellations
   (`010:203` is `COUNT(*) FROM _sel`, the SELECTED count; `036:832` is
   `jsonb_array_length(v_results)`, an iteration count). The second is the
   ordinary business of validating a payload: a count of 7 against 3 submitted
   documents means the response does not describe the request that was sent, and
   an incoherent body is weaker evidence than a coherent one.

   So the count is an INPUT to validation and never an OUTPUT to the user as a
   completion figure beyond what the server itself reported. And the selection
   size is NEVER substituted as a completed count — legacy does that
   (index.html:5498) and it is not ported. */

/** Both server count shapes, and neither is trusted beyond coherence. */
export const COUNT_KEYS = ['cancelled_count', 'document_count'] as const

/** The validated view of a successful response. */
export interface BatchSuccessBody {
  /** The server-reported count, or null when absent or unusable. */
  count: number | null
  /** `results` length when the array is present, for the coherence check. */
  resultsLength: number | null
}

export type SuccessValidation =
  | { kind: 'valid'; body: BatchSuccessBody }
  /** The body cannot be trusted — the caller must render UNKNOWN, not success. */
  | { kind: 'incoherent'; reason: string }

const isPlainObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v)

const asCount = (v: unknown): number | null => {
  if (typeof v !== 'number') return null
  if (!Number.isFinite(v) || !Number.isInteger(v) || v < 0) return null
  return v
}

/**
 * THE ONE response validator. Both wrappers and the dialog use it; there is no
 * second place where a response is judged.
 *
 * `submittedCount` is the number of documents actually sent, used ONLY for the
 * coherence bounds — never as a fallback value.
 *
 * A count-free success is allowed, but only when the rest of the body is valid
 * success evidence: a non-empty object that is not an explicit failure. An
 * empty object `{}` is rejected as incoherent, because neither RPC can produce
 * one and treating it as success would turn "something else answered" into a
 * confirmed cancellation.
 */
export function validateSuccessBody(
  data: unknown,
  submittedCount: number,
): SuccessValidation {
  if (!isPlainObject(data)) {
    return { kind: 'incoherent', reason: 'cavab gövdəsi tanınmadı' }
  }
  const keys = Object.keys(data)
  if (keys.length === 0) {
    return { kind: 'incoherent', reason: 'cavab boşdur' }
  }

  /* An explicit failure marker in a 2xx body. Neither RPC emits one today —
     they raise instead — but a body that says it failed is never a success. */
  if (data.success === false || data.ok === false || data.error) {
    return { kind: 'incoherent', reason: 'cavab uğursuzluq bildirir' }
  }

  /* Both documented count keys are read, and if BOTH are present they must
     agree. `cancel_documents_batch` returns only `cancelled_count`;
     `cancel_layer_documents_batch` returns only `document_count`. A response
     carrying both with different values does not match either RPC's known
     shape and is not this batch's answer, whatever value would otherwise be
     picked first. */
  const hasA = 'cancelled_count' in data && data.cancelled_count !== null
    && data.cancelled_count !== undefined
  const hasB = 'document_count' in data && data.document_count !== null
    && data.document_count !== undefined
  if (hasA && hasB) {
    const a = asCount(data.cancelled_count)
    const b = asCount(data.document_count)
    if (a === null || b === null || a !== b) {
      return { kind: 'incoherent', reason: 'sənəd sayı ziddiyyətlidir' }
    }
  }

  const rawCount = hasA ? data.cancelled_count : hasB ? data.document_count : undefined

  let count: number | null = null
  if (rawCount !== undefined && rawCount !== null) {
    count = asCount(rawCount)
    /* Present but not a usable integer — a string, a float, a negative. */
    if (count === null) {
      return { kind: 'incoherent', reason: 'sənəd sayı oxunmadı' }
    }
    /* Present and contradicting the request. Both server counts are counts of
       attempts over the submitted list, so anything other than the submitted
       count means the response does not describe this request. */
    if (count !== submittedCount) {
      return { kind: 'incoherent', reason: 'sənəd sayı uyğun gəlmir' }
    }
  }

  let resultsLength: number | null = null
  if ('results' in data && data.results !== null && data.results !== undefined) {
    if (!Array.isArray(data.results)) {
      return { kind: 'incoherent', reason: 'nəticə siyahısı tanınmadı' }
    }
    resultsLength = data.results.length
    if (count !== null && resultsLength !== count) {
      return { kind: 'incoherent', reason: 'nəticə siyahısı sayla uyğun gəlmir' }
    }
    /* `results` is only valid evidence when it accounts for the FULL
       submitted batch — a count-free body with a short or empty `results`
       (e.g. `{results:[]}` for one submitted document) is not proof that
       document was cancelled, it is silence about it. Both known RPCs emit
       one results entry per submitted document. */
    if (count === null && resultsLength !== submittedCount) {
      return { kind: 'incoherent', reason: 'nəticə siyahısı sənəd sayına uyğun deyil' }
    }
    /* EVERY entry must be POSITIVE per-document evidence — I-5 correction 4.

       Checking only for a failure MARKER was an absence test, and absence of
       a failure marker is not presence of a success. `{results:[null]}`,
       `{results:[{}]}` and `{results:['garbage']}` all passed it and rendered
       a confirmed success for a batch about which the body said nothing.

       Both known RPC contracts emit one OBJECT per submitted document, and
       both carry `reversal_doc_num` — the identifier of the counter-document
       actually written:

         `cancel_documents_batch` (`sql/010:193-198`) builds each entry as
         `{doc_num, is_transfer, reversal_doc_num, row_count}`.

         `cancel_layer_documents_batch` (`sql/036:831`) appends the nested
         result of `cancel_layer_document` / `cancel_layer_transfer_document`,
         which is `cancel_document`'s own object — `{original_doc_num,
         reversal_doc_num, ...}` (`sql/003:144`, `:285`) — plus
         `layer_version`.

       So a valid entry is a plain object carrying a NON-EMPTY
       `reversal_doc_num` string, and no failure marker. Anything else means
       the body does not describe a completed cancellation, and the outcome is
       UNKNOWN rather than success. */
    for (const item of data.results) {
      if (!isPlainObject(item)) {
        return { kind: 'incoherent', reason: 'nəticə siyahısı tanınmayan qeyd daxil edir' }
      }
      if (item.ok === false || item.success === false || item.error) {
        return { kind: 'incoherent', reason: 'nəticə siyahısında uğursuz qeyd var' }
      }
      const rev = item.reversal_doc_num
      if (typeof rev !== 'string' || rev.trim() === '') {
        return { kind: 'incoherent', reason: 'nəticə qeydində əks-sənəd nömrəsi yoxdur' }
      }
    }
  }

  /* Count-free success needs OTHER valid success evidence: a coherent
     `results` array. A body with neither a count nor results carries nothing
     identifying it as this batch's answer. */
  if (count === null && resultsLength === null) {
    return { kind: 'incoherent', reason: 'cavabda təsdiq məlumatı yoxdur' }
  }

  return { kind: 'valid', body: { count, resultsLength } }
}

/* -------------------------------------------------------------------------
   THE USER-FACING MESSAGES.

   Technical detail stays OUT of the interface. The server's own Azerbaijani
   refusal text is surfaced verbatim for a REJECTION — it states precisely why
   (insufficient stock, an already-cancelled document) and is actionable. HTTP
   statuses, `code`s, stack details and hints are never shown. */

/** Confirmed success. The count is the server's, or absent entirely. */
export function successMessage(count: number | null): string {
  return count === null
    ? 'Seçilmiş sənədlər qrup üzrə ləğv edildi'
    : `${count} sənəd qrup üzrə ləğv edildi`
}

/** Confirmed rejection — the only message that may say nothing was cancelled. */
export function rejectedMessage(serverText: string): string {
  return `Qrup üzrə ləğv baş tutmadı: ${serverText} — heç bir sənəd ləğv edilmədi`
}

/** UNKNOWN. Claims neither success nor failure, and asks for a check. */
export const UNKNOWN_OUTCOME_MESSAGE =
  'Nəticə təsdiqlənmədi — sorğu göndərildi, lakin cavab alınmadı. Sənədlər ləğv edilmiş də ola bilər, edilməmiş də. Siyahını yeniləyib aşağıdakı sənədləri yoxlayın.'

/** Success, then a failed refresh — the cancellation DID happen. */
export const REFRESH_FAILED_MESSAGE =
  'Sənədlər ləğv edildi, lakin siyahı yenilənmədi — ekrandakı məlumat köhnə ola bilər. Səhifəni yeniləyin.'

/** UNKNOWN, and the refresh also failed. Still UNKNOWN, not a success. */
export const UNKNOWN_AND_REFRESH_FAILED_MESSAGE =
  'Nəticə təsdiqlənmədi və siyahı da yenilənmədi. Sənədlərin vəziyyətini yoxlaya bilmirik — səhifəni yeniləyib aşağıdakı sənədləri yoxlayın.'

/**
 * The unresolved-batch record kept after an UNKNOWN outcome.
 *
 * It OUTLIVES the dialog. Closing and reopening «Qrup üzrə ləğv» must not clear
 * it, because closing a dialog is not evidence about a database.
 *
 * MULTIPLE unresolved batches can coexist. A second submission touching
 * DIFFERENT documents while the first is still unresolved is a normal,
 * expected sequence — the admin submitted batch A, got no answer, and (for
 * documents A never touched) submitted batch B, which also came back
 * unknown. Overwriting A's record with B's would silently drop the block on
 * A's documents and let them be resubmitted while A's outcome is still
 * unconfirmed. Each record is therefore kept under its own `id` until it is
 * individually resolved.
 */
/**
 * WHY A RECORD HAS A PHASE — I-5 corrections 1 and 2.
 *
 * The record was originally created only for an UNKNOWN outcome. Two other
 * moments need the same protection, for the same reason: the client cannot
 * prove the documents are still resubmittable.
 *
 * `'pending'` — written BEFORE the RPC is dispatched. If the tab reloads while
 *   the request is outstanding, the in-memory reservation dies with the page
 *   and nothing would record that a batch was ever sent. On reload a
 *   `'pending'` record is exactly as uncertain as an `'unknown'` one: the
 *   request may have committed, and it is restored as uncertainty rather than
 *   silently dropped.
 *
 * `'unknown'` — the response never arrived, or was incoherent.
 *
 * `'success'` — the server CONFIRMED the cancellation, but the follow-up
 *   refresh failed, so the screen still shows the pre-cancellation rows.
 *   Releasing the block here (as the dialog previously did) let the user
 *   reopen against those stale rows and resubmit a batch that demonstrably
 *   already committed. The record is kept until fresh evidence reconciles it —
 *   and unlike `'unknown'`, this one is KNOWN to have succeeded, so its
 *   message must never suggest otherwise.
 */
export type UnresolvedPhase = 'pending' | 'unknown' | 'success'

export interface UnresolvedBatch {
  /** Unique per submission, so a later unknown outcome cannot overwrite an
      earlier one. Generated by the caller (store) at record time. */
  id: string
  /** The payload EXACTLY as submitted, preserved for reconciliation. */
  docNums: string[]
  /** Whether the refresh after the outcome also failed. */
  refreshFailed: boolean
  /** How much the client actually knows about this batch. */
  phase: UnresolvedPhase
  /** The Supabase PROJECT and ACCOUNT this attempt was made under, captured at
      ATTEMPT time. Scoping by account alone would let a late response write
      its record into whatever account happened to be signed in when it
      arrived; carrying the scope on the record makes that write refusable.
      It is an opaque identity string — never a credential or a token. */
  scope: string
}

/**
 * WHY A REFRESH CANNOT RESOLVE AN UNKNOWN OUTCOME BY ITSELF.
 *
 * After an unknown outcome the natural move is to reload and look. But an
 * immediate refresh showing NO cancellation markers does not prove a rollback:
 *
 *   - the original transaction may still be RUNNING. The client gave up on the
 *     response; the server did not give up on the statement. A batch that
 *     commits two seconds later was uncommitted at the moment we looked.
 *   - the read may not see it yet: a replica, a pooled connection on an older
 *     snapshot, or a cached response.
 *   - the reload itself may have partially failed while still returning rows.
 *
 * So absence of evidence is not evidence of rollback, and this module refuses
 * to convert one into the other. The unresolved record is cleared only by a
 * POSITIVE observation — the documents are now visibly cancelled — or by the
 * user explicitly dismissing it, having checked themselves.
 *
 * This is why `refreshResolvesUnknown` does not exist as a function that
 * returns true on an empty result. What follows is the only automatic
 * resolution, and it requires markers to be PRESENT.
 */
export function unknownResolvedBy(
  unresolved: UnresolvedBatch,
  cancelledDocNums: ReadonlySet<string>,
): boolean {
  if (!unresolved.docNums.length) return false
  return unresolved.docNums.every((d) => cancelledDocNums.has(d))
}

/* -------------------------------------------------------------------------
   RECONCILING A BATCH THAT CONTAINED TRANSFERS — I-5 correction 3.

   `unknownResolvedBy` above takes a SET of document numbers already known to
   be cancelled. Building that set is the caller's job, and the caller was
   building it with `docCancelledBy` for every document — the ORDINARY
   family's reader, which matches the note `'Ləğv: <doc>'`.

   A transfer is never marked that way. `cancel_transfer_document` writes
   `'Ləğv (əks yerdəyişmə): <doc>'`, read only by `docReversalDoc`
   (`lib/documentCancelState.ts:61-69`). So a transfer document in an
   unresolved batch could NEVER be observed as cancelled, and a batch
   containing one could never resolve automatically — the block stayed
   forever, even after the cancellation was plainly visible on screen.

   The dispatch below is the SAME one `buildBatchDocs` already applies when it
   decides a document's status (`lib/batchCancel.ts:147-160`): a document
   whose rows include `'Yerdəyişmə'` reads the reversal marker, any other
   document reads the ordinary one. It is reproduced here rather than
   imported so this module keeps no dependency on the grouping module, and
   both call the same two exact readers.

   NOTE the deliberate `!= null` comparisons: both readers fall back to the
   string `'—'` for a marker row that carries no `doc_num` of its own, and
   that fallback is still POSITIVE evidence of cancellation. Testing
   truthiness would be identical here, but `!= null` states the contract. */

/** The subset of a row these readers need, plus the type that picks the family. */
export interface ReconcileMovement {
  id: string | number
  type: string
  note: string | null
  doc_num: string | null
}

/**
 * Which of `docNums` are now VISIBLY cancelled, each read through the family
 * its own rows declare.
 *
 * A document with no rows in `movements` is NOT reported as cancelled: it is
 * absent evidence, and absence never resolves an unresolved batch.
 */
export function observedCancelledDocs(
  docNums: readonly string[],
  movements: readonly ReconcileMovement[],
  readers: {
    ordinary: (doc: string, rows: ReconcileMovement[]) => string | null
    transfer: (doc: string, rows: ReconcileMovement[]) => string | null
  },
): Set<string> {
  const rows = movements as ReconcileMovement[]
  /* Which documents are transfers, by their OWN rows — one pass, not one
     scan per submitted document. */
  const transferDocs = new Set<string>()
  for (const m of rows) {
    if (m.type === 'Yerdəyişmə' && m.doc_num) transferDocs.add(String(m.doc_num))
  }
  const out = new Set<string>()
  for (const d of docNums) {
    const read = transferDocs.has(d) ? readers.transfer : readers.ordinary
    if (read(d, rows) != null) out.add(d)
  }
  return out
}

/** Shown while an unresolved batch blocks resubmission of its documents. */
export function unresolvedBlockMessage(docNums: readonly string[]): string {
  return `Əvvəlki qrup ləğvinin nəticəsi hələ təsdiqlənməyib (${docNums.length} sənəd). Həmin sənədlər üçün yeni sorğu göndərilmir — əvvəlcə vəziyyəti yoxlayın.`
}

/**
 * The block message for a CONFIRMED SUCCESS whose refresh failed.
 *
 * It must not say the outcome is unconfirmed — the server confirmed it. What
 * is stale is the SCREEN, and resubmitting would attack an already-cancelled
 * batch. Kept separate from `unresolvedBlockMessage` so a known success is
 * never described as uncertain.
 */
export function confirmedSuccessBlockMessage(docNums: readonly string[]): string {
  return `Bu sənədlər (${docNums.length}) artıq ləğv edilib, lakin siyahı yenilənmədi — ekrandakı məlumat köhnədir. Təkrar sorğu göndərilmir. Səhifəni yeniləyin.`
}

/** Phase-appropriate block text for a set of records. */
export function blockMessageFor(
  unresolved: readonly UnresolvedBatch[],
  docNums: readonly string[],
): string {
  const held = new Set(docNums)
  const touching = unresolved.filter((u) => u.docNums.some((d) => held.has(d)))
  /* Only when EVERY record involved is a confirmed success may the message
     claim success; a single uncertain record makes the whole answer
     uncertain. */
  const allSuccess = touching.length > 0 && touching.every((u) => u.phase === 'success')
  return allSuccess
    ? confirmedSuccessBlockMessage(docNums)
    : unresolvedBlockMessage(docNums)
}

/**
 * Whether a new submission is blocked by ANY unresolved batch.
 *
 * The block is per DOCUMENT, not global, and not per-batch: documents
 * untouched by every unresolved batch stay cancellable. Resending a document
 * whose first call may have committed is what must be prevented — if it did
 * commit, the resubmission aborts against an already-cancelled document and
 * reports a failure for a batch that in fact succeeded. Because several
 * unresolved batches can coexist (see `UnresolvedBatch`), the check unions
 * every one of their document lists.
 */
export function blockedByUnresolved(
  unresolved: readonly UnresolvedBatch[],
  docNums: readonly string[],
): string[] {
  if (!unresolved.length) return []
  const held = new Set<string>()
  for (const u of unresolved) for (const d of u.docNums) held.add(d)
  return docNums.filter((d) => held.has(d))
}

/** Every document currently held by any unresolved batch, for display. */
export function allUnresolvedDocNums(unresolved: readonly UnresolvedBatch[]): string[] {
  const held = new Set<string>()
  for (const u of unresolved) for (const d of u.docNums) held.add(d)
  return [...held]
}
