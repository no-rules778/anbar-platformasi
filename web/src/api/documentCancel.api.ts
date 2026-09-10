import { supabase } from './supabase'
import { blockedReason } from '../lib/mutationGuard'
import { COUNT_KEYS } from '../lib/batchOutcome'

/* The CANCELLATION transport layer — Phase 8, milestone I-4.

   The action half of the four document views I-3 rendered read-only:
   index.html:5060-5080 (ordinary), 5249-5251 (transfer), 5105-5110 (row),
   4997-4999 (item replacement), 5276-5278 / 5298-5300 (the two doc-less
   legacy families) and 5492-5494 (batch).

   ---------------------------------------------------------------------------
   LIVE SIGNATURES. Read on 2026-09-06 by a SELECT-only catalogue query against
   the TEST project `alkjjbaawmsirsfvqljm` — not from documentation, not from
   the migration files, and NOT from the legacy call sites. All thirteen were
   found, all return `jsonb`, all are SECURITY DEFINER:

     cancel_document(p_doc_num text, p_reversal_date date)
     cancel_layer_document(p_doc_num text, p_reversal_date date)
     cancel_transfer_document(p_original_doc_num text, p_reversal_date date)
     cancel_layer_transfer_document(p_doc_num text, p_reversal_date date)
     cancel_movement_row(p_movement_id uuid, p_reason text)
     cancel_layer_movement_row(p_movement_id uuid, p_reason text)
     replace_movement_item(p_movement_id uuid, p_new_item_code text, p_reason text)
     cancel_legacy_movement(p_movement_id uuid, p_reversal_date date)
     cancel_layer_legacy_movement(p_movement_id uuid, p_reversal_date date)
     cancel_legacy_transfer(p_movement_id uuid, p_reversal_date date)
     cancel_layer_legacy_transfer(p_movement_id uuid, p_reversal_date date)
     cancel_documents_batch(p_doc_nums text[], p_reversal_date date)
     cancel_layer_documents_batch(p_doc_nums text[], p_reversal_date date)

   ---------------------------------------------------------------------------
   DEVIATION `D-I1` — APPROVED, and the reason this module has no generic
   "cancel family" helper.

   The two transfer variants take DIFFERENT argument names:

     cancel_transfer_document        -> p_original_doc_num
     cancel_layer_transfer_document  -> p_doc_num

   Legacy sends `p_original_doc_num` to BOTH (index.html:5250-5251), selecting
   only the FUNCTION NAME from `DB.layerActive` while keeping one argument
   object. Against the live layer function that call cannot bind — PostgREST
   resolves by argument name — so the layer transfer cancellation fails there.
   This module sends each RPC the names its own live signature declares. That
   is a deliberate, evidence-backed correction of legacy behaviour, recorded as
   an approved migration deviation, NOT accidental parity drift.

   It is also why every function below is written out separately with its own
   literal argument object. A shared helper parameterised by family is exactly
   the shape that produced the legacy bug: it makes one argument name serve two
   signatures, and a later edit to the "common" path would silently reintroduce
   the mismatch. The repetition is the safety property.

   ---------------------------------------------------------------------------
   NO FUNCTION HERE THROWS. Every one returns a typed result, and every one
   consults `blockedReason()` BEFORE touching Supabase: localhost talks to the
   live database, and these calls write real reversal documents into real
   warehouses.

   SERVER TEXT IS PRESERVED VERBATIM. The SQL functions raise Azerbaijani
   messages stating precisely why a cancellation was refused (insufficient
   stock, an ambiguous legacy pair, a re-cancellation). They pass through
   unchanged — never re-worded, never replaced with a generic failure line.

   REVERSALS CREATE NEW ROWS. Every function in this file writes a COUNTER
   entry; not one of them updates or deletes the original movement. */

/** The shape every function here returns. Never thrown, always returned. */
export interface CancelResult {
  ok: boolean
  /** The server's own message, verbatim. Null on success. */
  error: string | null
  /** True when the localhost guard refused before any network call. */
  blocked?: boolean
  /** `reversal_doc_num` — the counter-document the server created. */
  reversalDocNum: string | null
  /** `doc_num` — used by the row and replacement families, which write the
      counter entry INSIDE the original document rather than creating one. */
  docNum: string | null
}

/** `replace_movement_item` additionally reports both item codes. */
export interface ReplaceResult extends CancelResult {
  oldItemCode: string | null
  newItemCode: string | null
}

const failure = (error: string, blocked = false): CancelResult =>
  ({ ok: false, error, blocked, reversalDocNum: null, docNum: null })

/* The legacy fallback chain — `err.message || 'server xətası'`. A Supabase
   error object carries `message`; anything else keeps the legacy default. */
const message = (err: unknown, fallback = 'server xətası'): string => {
  if (err && typeof err === 'object' && 'message' in err) {
    const m = (err as { message?: unknown }).message
    if (m) return String(m)
  }
  if (err instanceof Error && err.message) return err.message
  return fallback
}

const str = (v: unknown): string | null => (v == null ? null : String(v))

function readResult(data: unknown): Pick<CancelResult, 'reversalDocNum' | 'docNum'> {
  const d = (data ?? {}) as Record<string, unknown>
  return { reversalDocNum: str(d.reversal_doc_num), docNum: str(d.doc_num) }
}

/**
 * The `p_reversal_date` OMISSION rule — index.html:5069-5070, 5250-5251, 5493.
 *
 * A blank date input must leave the argument OUT of the payload entirely so the
 * server's own `DEFAULT CURRENT_DATE` applies. Sending `p_reversal_date: ''`
 * or `null` instead is not the same thing: an empty string fails the date cast
 * and a null overrides the default with NULL. Legacy builds two different
 * argument objects for exactly this reason, and so does every function here.
 *
 * The two legacy doc-less views are the ONE exception in the original: they
 * read `$('#lc-date').value` unconditionally (index.html:5277 / 5299) because
 * their date input is always rendered and pre-filled. This module still routes
 * them through the same omission rule — a blank value there is a caller bug,
 * not an instruction to post NULL.
 */
const withDate = <T extends Record<string, unknown>>(
  base: T,
  reversalDate: string | null | undefined,
): T | (T & { p_reversal_date: string }) =>
  reversalDate ? { ...base, p_reversal_date: reversalDate } : base

/* ========================= ORDINARY DOCUMENTS ========================= */

/** `cancel_document` — index.html:5068. Non-layer ordinary cancellation. */
export async function cancelDocument(
  docNum: string,
  reversalDate?: string | null,
): Promise<CancelResult> {
  const blocked = blockedReason('doc.cancel')
  if (blocked) return failure(blocked, true)
  try {
    const { data, error } = await supabase.rpc(
      'cancel_document',
      withDate({ p_doc_num: docNum }, reversalDate),
    )
    if (error) return failure(message(error))
    return { ok: true, error: null, ...readResult(data) }
  } catch (err) {
    return failure(message(err))
  }
}

/** `cancel_layer_document` — index.html:5068. Same argument name as the
    non-layer ordinary function; only the transfer pair differs (`D-I1`). */
export async function cancelLayerDocument(
  docNum: string,
  reversalDate?: string | null,
): Promise<CancelResult> {
  const blocked = blockedReason('doc.cancel')
  if (blocked) return failure(blocked, true)
  try {
    const { data, error } = await supabase.rpc(
      'cancel_layer_document',
      withDate({ p_doc_num: docNum }, reversalDate),
    )
    if (error) return failure(message(error))
    return { ok: true, error: null, ...readResult(data) }
  } catch (err) {
    return failure(message(err))
  }
}

/* ========================= TRANSFER DOCUMENTS =========================
   The `D-I1` pair. The two argument names below are NOT interchangeable and
   must never be factored together — see the deviation note at the top. */

/** `cancel_transfer_document(p_original_doc_num, …)` — index.html:5250. */
export async function cancelTransferDocument(
  docNum: string,
  reversalDate?: string | null,
): Promise<CancelResult> {
  const blocked = blockedReason('doc.cancel-transfer')
  if (blocked) return failure(blocked, true)
  try {
    const { data, error } = await supabase.rpc(
      'cancel_transfer_document',
      withDate({ p_original_doc_num: docNum }, reversalDate),
    )
    if (error) return failure(message(error))
    return { ok: true, error: null, ...readResult(data) }
  } catch (err) {
    return failure(message(err))
  }
}

/**
 * `cancel_layer_transfer_document(p_doc_num, …)` — the corrected call.
 *
 * `p_doc_num`, NOT `p_original_doc_num`. Legacy sends the latter here
 * (index.html:5251) and the live signature does not declare it. This is
 * deviation `D-I1`.
 */
export async function cancelLayerTransferDocument(
  docNum: string,
  reversalDate?: string | null,
): Promise<CancelResult> {
  const blocked = blockedReason('doc.cancel-transfer')
  if (blocked) return failure(blocked, true)
  try {
    const { data, error } = await supabase.rpc(
      'cancel_layer_transfer_document',
      withDate({ p_doc_num: docNum }, reversalDate),
    )
    if (error) return failure(message(error))
    return { ok: true, error: null, ...readResult(data) }
  } catch (err) {
    return failure(message(err))
  }
}

/* ======================== SINGLE-ROW CANCELLATION ========================
   Cancels ONE line inside a document. The document number and every other line
   stay untouched — the server writes the counter entry under the SAME
   `doc_num`, which is why these two report `doc_num` rather than a reversal
   document (index.html:5116). Transfers are refused by the server. */

/** `cancel_movement_row` — index.html:5109. The reason is MANDATORY. */
export async function cancelMovementRow(
  movementId: string,
  reason: string,
): Promise<CancelResult> {
  const blocked = blockedReason('doc.cancel-row')
  if (blocked) return failure(blocked, true)
  try {
    const { data, error } = await supabase.rpc('cancel_movement_row', {
      p_movement_id: movementId,
      p_reason: reason,
    })
    if (error) return failure(message(error))
    return { ok: true, error: null, ...readResult(data) }
  } catch (err) {
    return failure(message(err))
  }
}

/** `cancel_layer_movement_row` — index.html:5109, layer variant. */
export async function cancelLayerMovementRow(
  movementId: string,
  reason: string,
): Promise<CancelResult> {
  const blocked = blockedReason('doc.cancel-row')
  if (blocked) return failure(blocked, true)
  try {
    const { data, error } = await supabase.rpc('cancel_layer_movement_row', {
      p_movement_id: movementId,
      p_reason: reason,
    })
    if (error) return failure(message(error))
    return { ok: true, error: null, ...readResult(data) }
  } catch (err) {
    return failure(message(err))
  }
}

/* ========================== ITEM REPLACEMENT ==========================
   `D4`, resolved as INCLUDED for parity. */

/**
 * `replace_movement_item` — index.html:4997-4999.
 *
 * There is NO layer variant: the live catalogue carries one function only, so
 * the capability flag must not select anything here. The server writes a
 * counter line plus a new-item line under the SAME `doc_num`; the original row
 * is never modified. The reason is MANDATORY.
 */
export async function replaceMovementItem(
  movementId: string,
  newItemCode: string,
  reason: string,
): Promise<ReplaceResult> {
  const blocked = blockedReason('doc.replace-item')
  if (blocked) {
    return { ...failure(blocked, true), oldItemCode: null, newItemCode: null }
  }
  try {
    const { data, error } = await supabase.rpc('replace_movement_item', {
      p_movement_id: movementId,
      p_new_item_code: newItemCode,
      p_reason: reason,
    })
    if (error) return { ...failure(message(error)), oldItemCode: null, newItemCode: null }
    const d = (data ?? {}) as Record<string, unknown>
    return {
      ok: true,
      error: null,
      ...readResult(data),
      oldItemCode: str(d.old_item_code),
      newItemCode: str(d.new_item_code),
    }
  } catch (err) {
    return { ...failure(message(err)), oldItemCode: null, newItemCode: null }
  }
}

/* ===================== LEGACY DOC-LESS CANCELLATION =====================
   Records predating document numbering. They are identified by MOVEMENT ID,
   never by a document number — none exists and none may be invented. */

/** `cancel_legacy_movement` — index.html:5277. Doc-less ORDINARY. */
export async function cancelLegacyMovement(
  movementId: string,
  reversalDate?: string | null,
): Promise<CancelResult> {
  const blocked = blockedReason('doc.cancel-legacy')
  if (blocked) return failure(blocked, true)
  try {
    const { data, error } = await supabase.rpc(
      'cancel_legacy_movement',
      withDate({ p_movement_id: movementId }, reversalDate),
    )
    if (error) return failure(message(error))
    return { ok: true, error: null, ...readResult(data) }
  } catch (err) {
    return failure(message(err))
  }
}

/** `cancel_layer_legacy_movement` — index.html:5277, layer variant. */
export async function cancelLayerLegacyMovement(
  movementId: string,
  reversalDate?: string | null,
): Promise<CancelResult> {
  const blocked = blockedReason('doc.cancel-legacy')
  if (blocked) return failure(blocked, true)
  try {
    const { data, error } = await supabase.rpc(
      'cancel_layer_legacy_movement',
      withDate({ p_movement_id: movementId }, reversalDate),
    )
    if (error) return failure(message(error))
    return { ok: true, error: null, ...readResult(data) }
  } catch (err) {
    return failure(message(err))
  }
}

/**
 * `cancel_legacy_transfer` — index.html:5299. Doc-less TRANSFER.
 *
 * The server itself decides whether a single unambiguous counter-leg exists;
 * when the pair is ambiguous or stock is short it writes NOTHING and raises.
 * That refusal text is surfaced verbatim — the client never guesses the pair.
 */
export async function cancelLegacyTransfer(
  movementId: string,
  reversalDate?: string | null,
): Promise<CancelResult> {
  const blocked = blockedReason('doc.cancel-legacy-transfer')
  if (blocked) return failure(blocked, true)
  try {
    const { data, error } = await supabase.rpc(
      'cancel_legacy_transfer',
      withDate({ p_movement_id: movementId }, reversalDate),
    )
    if (error) return failure(message(error))
    return { ok: true, error: null, ...readResult(data) }
  } catch (err) {
    return failure(message(err))
  }
}

/** `cancel_layer_legacy_transfer` — index.html:5299, layer variant. */
export async function cancelLayerLegacyTransfer(
  movementId: string,
  reversalDate?: string | null,
): Promise<CancelResult> {
  const blocked = blockedReason('doc.cancel-legacy-transfer')
  if (blocked) return failure(blocked, true)
  try {
    const { data, error } = await supabase.rpc(
      'cancel_layer_legacy_transfer',
      withDate({ p_movement_id: movementId }, reversalDate),
    )
    if (error) return failure(message(error))
    return { ok: true, error: null, ...readResult(data) }
  } catch (err) {
    return failure(message(err))
  }
}

/* ============================ BATCH WRAPPERS ============================
   «Qrup üzrə ləğv» — index.html:5492-5494. The SELECTION UI is I-5 and lives
   in `components/movements/BatchCancelDialog.tsx`; these two are the transport.

   The server applies the batch ATOMICALLY: every document is cancelled or none
   is. That constrains the DATABASE to two end states — it does NOT tell the
   caller which one occurred when no answer arrives. These wrappers therefore
   preserve enough of a failure for `lib/batchOutcome.ts` to classify it, and
   deliberately do NOT decide success themselves.

   WHY `status` IS CARRIED. The installed postgrest-js (2.112.4) synthesises a
   structured `{message, details, hint, code}` object with `status: 0` for ANY
   fetch rejection (`dist/index.cjs:422-437`) and delivers it in the SAME
   `error` field a real server rejection uses. The presence of an error object
   is therefore NOT evidence that the server rejected anything. The HTTP status
   is the only discriminator, so it is preserved rather than collapsed into a
   message string — see `classifyFailure()`.

   BOTH COUNT SHAPES ARE READ. `cancel_documents_batch` returns
   `cancelled_count`; `cancel_layer_documents_batch` returns `document_count`
   and no `cancelled_count`, so reading only the first reported 0 documents
   after a successful layer batch. Legacy masks this by falling back to
   `docNums.length` (index.html:5498); that fallback is NOT ported, because both
   server values are counts of ATTEMPTS and the selection size is not evidence
   of anything the server did. */

/** What the caller needs to classify the result. Never thrown, always returned. */
export interface BatchCancelResponse {
  /** True only when transport succeeded AND the body validated. */
  ok: boolean
  /** The server's own message, verbatim. Null on success. */
  error: string | null
  /** True when the localhost guard refused before any network call. */
  blocked?: boolean
  /** The HTTP status, preserved for classification. 0 = transport failure. */
  status: number | null
  /** PostgREST `code` when supplied; empty string for aborts, null if absent. */
  code: string | null
  /** The server-reported count from either shape, or null when unusable. */
  cancelledCount: number | null
  /** The raw body, for the validator. */
  data: unknown
}

/** Reads the two count shapes in order. Never falls back to a client value. */
const readBatchCount = (data: unknown): number | null => {
  if (typeof data !== 'object' || data === null || Array.isArray(data)) return null
  const d = data as Record<string, unknown>
  for (const key of COUNT_KEYS) {
    const v = d[key]
    if (typeof v === 'number' && Number.isInteger(v) && v >= 0) return v
  }
  return null
}

/* A PostgrestError carries `code`; a synthesised transport error carries an
   empty one. Both are preserved as-is — the distinction is the caller's. */
const readStatus = (v: unknown): number | null =>
  typeof v === 'number' && Number.isFinite(v) ? v : null

const readCode = (err: unknown): string | null => {
  if (err && typeof err === 'object' && 'code' in err) {
    const c = (err as { code?: unknown }).code
    if (typeof c === 'string') return c
  }
  return null
}

const batchFailure = (
  error: string,
  status: number | null,
  code: string | null,
  blocked = false,
): BatchCancelResponse => ({
  ok: false,
  error,
  blocked,
  status,
  code,
  cancelledCount: null,
  data: null,
})

/** `cancel_documents_batch` — index.html:5493, non-layer family. */
export async function cancelDocumentsBatch(
  docNums: readonly string[],
  reversalDate?: string | null,
): Promise<BatchCancelResponse> {
  const blocked = blockedReason('doc.cancel-batch')
  if (blocked) return batchFailure(blocked, null, null, true)
  try {
    const res = await supabase.rpc(
      'cancel_documents_batch',
      withDate({ p_doc_nums: docNums as string[] }, reversalDate),
    )
    const status = readStatus((res as { status?: unknown }).status)
    if (res.error) return batchFailure(message(res.error), status, readCode(res.error))
    return {
      ok: true,
      error: null,
      status,
      code: null,
      cancelledCount: readBatchCount(res.data),
      data: res.data,
    }
  } catch (err) {
    /* A throw here never reaches PostgREST's own error path, so no status
       exists. It stays UNKNOWN — never a rejection. */
    return batchFailure(message(err), null, readCode(err))
  }
}

/** `cancel_layer_documents_batch` — index.html:5492, layer family. */
export async function cancelLayerDocumentsBatch(
  docNums: readonly string[],
  reversalDate?: string | null,
): Promise<BatchCancelResponse> {
  const blocked = blockedReason('doc.cancel-batch')
  if (blocked) return batchFailure(blocked, null, null, true)
  try {
    const res = await supabase.rpc(
      'cancel_layer_documents_batch',
      withDate({ p_doc_nums: docNums as string[] }, reversalDate),
    )
    const status = readStatus((res as { status?: unknown }).status)
    if (res.error) return batchFailure(message(res.error), status, readCode(res.error))
    return {
      ok: true,
      error: null,
      status,
      code: null,
      cancelledCount: readBatchCount(res.data),
      data: res.data,
    }
  } catch (err) {
    return batchFailure(message(err), null, readCode(err))
  }
}
