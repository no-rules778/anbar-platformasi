import { classifyFailure, type TransportFailure } from './batchOutcome'

/* THE OUTCOMES OF A CORRECTION WRITE — Phase 8, milestone I-6, decision `D6`.

   `correct_document` is ONE server transaction: the impact gate, then
   `cancel_document`, then `post_movement_document`, then an explicit
   `audit_log` row (sql/030). So the DATABASE ends in one of two states — the
   original document cancelled and replaced, or nothing changed at all.

   The CLIENT can be in a third. Between COMMIT and the response reaching the
   browser sit a PostgREST process, a gateway and a network; a response lost
   after the commit is ordinary. In that case the correction HAPPENED and the
   client holds only an error.

   The pre-I-6 store said, on every failure:

       «Düzəliş qeyd edilmədi: … — <doc> sənədi dəyişməyib.»

   That sentence is a POSITIVE CLAIM ABOUT THE DATABASE, and under a lost
   response it is false: the document was cancelled and replaced. Worse, it
   invites the admin to correct the document again — which, against a document
   already cancelled, either fails confusingly or, if the correction re-posted
   under a new number, leaves two documents where the admin believes there is
   one. `D6` resolves this: the false sentence is NOT retained.

   WHAT IS REUSED, AND WHAT IS DELIBERATELY NOT.

   `classifyFailure` and `isRecognisedServerCode` (lib/batchOutcome.ts) are
   TRANSPORT-level and carry nothing batch-specific: they read an HTTP status
   and a PostgREST/Postgres error code and decide whether the server positively
   refused. That reasoning is identical here and is reused verbatim — a second
   copy would be a second thing to get wrong.

   `validateSuccessBody` is NOT reused. It validates a BATCH body:
   `cancelled_count` / `document_count`, a `results` array, and coherence
   against a submitted document list. `correct_document` returns none of those
   — it returns `original_doc_num`, `reversal_doc_num`, `new_doc_num`, `type`,
   `row_count` and `reason` (sql/030). Running the batch validator over a
   correction body would reject every genuine success for lacking keys the RPC
   never emits. Corrections get their OWN success contract, below.

   Nothing here reads or writes batch state. I-5's records, scope and
   `persistenceError` are untouched; the correction record is a separate store
   with its own key. */

export type CorrectionOutcomeKind =
  /** The server answered, refused, and nothing was written. */
  | 'rejected'
  /** The server answered with a coherent success body. */
  | 'success'
  /** No usable answer. The correction MAY have committed. */
  | 'unknown'
  /** Committed, but the follow-up refresh failed — the screen is stale. */
  | 'success-refresh-failed'

/** The validated view of a successful `correct_document` response. */
export interface CorrectionSuccessBody {
  /** The replacement document. */
  newDocNum: string
  /** The reversal document, when the server reported one. */
  reversalDocNum: string | null
  /** Server-reported row count, or null when absent/unusable. */
  rowCount: number | null
}

export type CorrectionValidation =
  | { ok: true; body: CorrectionSuccessBody }
  | { ok: false; reason: string }

const isPlainObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v)

const nonEmptyStr = (v: unknown): string | null =>
  typeof v === 'string' && v.trim() ? v : null

/* An explicit failure signal in the BODY of a 2xx. PostgREST returns 200 for
   anything an RPC returns normally, so a function that reports its own refusal
   as a value — `{ok:false, error:'...'}` — arrives with a success STATUS. The
   correction contract below must read the body's own verdict before it reads
   anything else, or a declared failure that happens to carry a `new_doc_num`
   (an echo, a stub, a wrapper that reports what it TRIED to do) is announced
   to the admin as a completed correction. */
const declaresFailure = (d: Record<string, unknown>): string | null => {
  if (d.ok === false) return 'server cavabında ok:false'
  if (d.success === false) return 'server cavabında success:false'
  const err = d.error
  if (typeof err === 'string' && err.trim()) return 'server cavabında xəta: ' + err.trim()
  /* A non-string, non-null `error` is still an error — its SHAPE is unknown,
     so it is reported generically rather than interpolated. */
  if (err !== undefined && err !== null && typeof err !== 'string') {
    return 'server cavabında xəta sahəsi var'
  }
  return null
}

/**
 * THE CORRECTION SUCCESS CONTRACT.
 *
 * A 2xx is necessary and not sufficient. `new_doc_num` is the load-bearing
 * field: it is the document the admin must be told about, and the RPC cannot
 * succeed without producing one (sql/030 builds it before it returns). A 2xx
 * whose body carries no `new_doc_num` is therefore NOT a confirmed success —
 * something other than this RPC answered, or it answered about something else.
 *
 * That case is UNKNOWN rather than rejected: the absence of a coherent body is
 * not evidence that the transaction rolled back. The same holds for every
 * check below — this validator's `ok:false` means "not a CONFIRMED success",
 * never "the transaction rolled back". The caller maps it to `unknown`.
 *
 * THE ORDER MATTERS. An explicit failure marker is read FIRST, before
 * `new_doc_num`: a body that declares its own failure is not rescued by
 * carrying a document number, and reading the number first would let
 * `{ok:false, error:'…', new_doc_num:'X'}` be declared a confirmed success.
 *
 * THE IDENTIFIERS MUST BE MUTUALLY COHERENT (sql/030 lines 393-397 build all
 * three from one transaction):
 *
 *   - `original_doc_num`, when present, must MATCH the document we submitted.
 *     A mismatch means the response does not describe our request, and folding
 *     it into success would report the wrong document as corrected.
 *   - `new_doc_num` must DIFFER from the submitted document. The correction
 *     cancels the original and posts a replacement under a NEW number; a
 *     response naming the original as the replacement contradicts the RPC's
 *     own contract, and accepting it would tell the admin their document was
 *     replaced by itself.
 *   - `reversal_doc_num`, when present, must differ from BOTH. It is the
 *     counter-document `cancel_document` wrote; equal to either identifier it
 *     describes an impossible transaction.
 */
export function validateCorrectionBody(data: unknown, submittedDoc: string): CorrectionValidation {
  if (!isPlainObject(data)) {
    return { ok: false, reason: 'cavab gövdəsi oxunmadı' }
  }
  /* FIRST: an explicit failure verdict outranks every positive-looking field. */
  const declared = declaresFailure(data)
  if (declared) {
    return { ok: false, reason: declared }
  }
  const newDocNum = nonEmptyStr(data.new_doc_num)
  if (!newDocNum) {
    return { ok: false, reason: 'yeni sənəd nömrəsi qaytarılmadı' }
  }
  const original = nonEmptyStr(data.original_doc_num)
  if (original !== null && original !== submittedDoc) {
    return { ok: false, reason: 'cavab başqa sənədə aiddir' }
  }
  if (newDocNum === submittedDoc) {
    return { ok: false, reason: 'yeni sənəd nömrəsi köhnə ilə eynidir' }
  }
  const reversal = nonEmptyStr(data.reversal_doc_num)
  if (reversal !== null && (reversal === submittedDoc || reversal === newDocNum)) {
    return { ok: false, reason: 'ləğv sənədi nömrəsi ziddiyyətlidir' }
  }
  const rawCount = data.row_count
  const rowCount =
    typeof rawCount === 'number' && Number.isInteger(rawCount) && rawCount >= 0
      ? rawCount
      : null
  return {
    ok: true,
    body: {
      newDocNum,
      reversalDocNum: reversal,
      rowCount,
    },
  }
}

/** Classify a correction FAILURE. Delegates to the shared transport rule. */
export function classifyCorrectionFailure(f: TransportFailure): 'rejected' | 'unknown' {
  return classifyFailure(f)
}

/* ---------------------------------------------------------------------------
   MESSAGES — the only place the outcome is put into words.
   ------------------------------------------------------------------------ */

/** CONFIRMED rejection. Only here may «sənədi dəyişməyib» be said, because
    only here is there positive evidence that the server refused. */
export function correctionRejectedMessage(serverText: string, docNum: string): string {
  return `Düzəliş qeyd edilmədi: ${serverText} — ${docNum} sənədi dəyişməyib.`
}

/** CONFIRMED success — legacy's wording (index.html:4772). */
export function correctionSuccessMessage(
  docNum: string,
  newDocNum: string,
  rows: number,
): string {
  return `Sənəd düzəldildi · köhnə: ${docNum} → yeni: ${newDocNum} · ${rows} sətir`
}

/** Success whose follow-up refresh failed: the write is confirmed, the SCREEN
    is stale. Both facts, in that order — the reload must not read as a doubt
    about the correction. */
export function correctionRefreshFailedMessage(
  docNum: string,
  newDocNum: string,
): string {
  return (
    `Sənəd düzəldildi · köhnə: ${docNum} → yeni: ${newDocNum}. `
    + 'Siyahı yenilənmədi — ekrandakı məlumat köhnədir, səhifəni yeniləyin.'
  )
}

/**
 * UNKNOWN. States the uncertainty plainly, names both possible states, and
 * tells the admin what to do — never «sənəd dəyişməyib».
 */
export function correctionUnknownMessage(serverText: string, docNum: string): string {
  return (
    `Düzəlişin nəticəsi məlum deyil: ${serverText} — ${docNum} sənədinin `
    + 'düzəldilib-düzəldilmədiyi TƏSDİQLƏNMƏDİ. Təkrar göndərmə bloklandı. '
    + '«Mal hərəkəti» siyahısını yeniləyib sənədin vəziyyətini yoxlayın.'
  )
}

/** Shown when a correction is refused because an earlier attempt on the SAME
    document was never reconciled. Survives dialog close and page reload. */
export function correctionBlockedMessage(docNum: string): string {
  return (
    `${docNum} sənədi üzrə əvvəlki düzəlişin nəticəsi təsdiqlənməyib. `
    + 'Eyni sənədi ikinci dəfə düzəltmək sənədin iki dəfə əvəzlənməsinə səbəb '
    + 'ola bilər — əvvəlcə siyahıdan sənədin vəziyyətini yoxlayın.'
  )
}
