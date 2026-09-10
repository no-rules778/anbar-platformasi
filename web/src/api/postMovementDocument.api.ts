import { supabase } from './supabase'
import type { Json } from '../types/database'
import { blockedReason } from '../lib/mutationGuard'
import type {
  MovementPayloadLine, TransferPayloadLine, CorrectionPayloadLine,
} from '../lib/opPayload'

/* The five write paths of «Yeni əməliyyat» — index.html:4740-4862.

   ⚠ NO WRITE IS EXECUTED BY MILESTONE H-1. This module is the transport layer
   only; the store and the posting UI arrive in H-2/H-3, and the first live
   write happens at the single live gate (plan T10) after every route exists.

   ---------------------------------------------------------------------------
   LIVE SIGNATURES, read from production-functions-2026-09-03.json — NOT from
   documentation, and NOT from the legacy call sites:

     post_movement_document(p_lines jsonb, p_doc_num text DEFAULT NULL)
     post_transfer_document(p_lines jsonb, p_doc_num text DEFAULT NULL)
     post_layer_movement_document(p_lines jsonb, p_request_key uuid,
                                  p_doc_num text DEFAULT NULL)
     post_layer_transfer_document(p_lines jsonb, p_request_key uuid,
                                  p_doc_num text DEFAULT NULL)
     correct_document(p_doc_num text, p_lines jsonb, p_reason text,
                      p_reversal_date date DEFAULT CURRENT_DATE)

   IDEMPOTENCY IS NOT UNIFORM. Only the two LAYER functions take a request key
   and record it in `stock_layer_requests`; replaying a key with the SAME
   payload returns the stored result, and replaying it with a DIFFERENT payload
   raises «Eyni sorğu açarı fərqli məlumatla istifadə edilib». The two non-layer
   functions take no key at all, so a duplicated submit on those paths creates a
   DUPLICATE DOCUMENT. Protection there is entirely client-side: the legacy
   request-key discipline plus the explicit in-flight lock (Q5). Never describe
   those two as server-guaranteed.

   Every call consults `blockedReason` first: localhost talks to the live
   database, and these are the first writes in the migration that create stock
   movements rather than directory rows. */

export interface PostResult {
  ok: boolean
  /** Server message, verbatim, so the caller can surface it unchanged. */
  error: string | null
  /** True when the localhost guard refused before any network call. */
  blocked?: boolean
  docNum: string | null
  rowCount: number
  /** `correct_document` only. */
  newDocNum?: string | null
  reversalDocNum?: string | null
}

const failure = (error: string, blocked = false): PostResult =>
  ({ ok: false, error, blocked, docNum: null, rowCount: 0 })

/* supabase-js types an RPC argument as `Json`, which a named interface does not
   satisfy without an index signature. Widening the payload interfaces to add
   one would let any key through and weaken the contract those types exist to
   express, so the cast happens HERE, at the single boundary where the object
   stops being a typed payload and becomes `jsonb`. The payload shape is still
   enforced by the parameter types above and pinned by opPayload's tests. */
const asJson = <T>(lines: readonly T[]): Json => lines as unknown as Json

function readDoc(data: unknown): { docNum: string | null; rowCount: number } {
  const d = (data ?? {}) as Record<string, unknown>
  return {
    docNum: d.doc_num == null ? null : String(d.doc_num),
    rowCount: Number(d.row_count ?? 0) || 0,
  }
}

const message = (err: unknown, fallback: string): string => {
  if (err && typeof err === 'object' && 'message' in err) {
    const m = (err as { message?: unknown }).message
    if (m) return String(m)
  }
  if (err instanceof Error && err.message) return err.message
  return fallback
}

/** index.html:4849. Non-layer, non-transfer. NO request key exists server-side. */
export async function postMovementDocument(
  lines: readonly MovementPayloadLine[],
): Promise<PostResult> {
  const blocked = blockedReason('op.post')
  if (blocked) return failure(blocked, true)
  try {
    const { data, error } = await supabase.rpc('post_movement_document', { p_lines: asJson(lines) })
    if (error) return failure(message(error, 'server xətası'))
    return { ok: true, error: null, ...readDoc(data) }
  } catch (err) {
    return failure(message(err, 'server xətası'))
  }
}

/** index.html:4809. The server writes BOTH legs itself. No request key. */
export async function postTransferDocument(
  lines: readonly TransferPayloadLine[],
): Promise<PostResult> {
  const blocked = blockedReason('op.post-transfer')
  if (blocked) return failure(blocked, true)
  try {
    const { data, error } = await supabase.rpc('post_transfer_document', { p_lines: asJson(lines) })
    if (error) return failure(message(error, 'server xətası'))
    return { ok: true, error: null, ...readDoc(data) }
  } catch (err) {
    return failure(message(err, 'server xətası'))
  }
}

/** index.html:4848. Idempotent via `stock_layer_requests`. */
export async function postLayerMovementDocument(
  lines: readonly MovementPayloadLine[],
  requestKey: string,
): Promise<PostResult> {
  const blocked = blockedReason('op.layer-post')
  if (blocked) return failure(blocked, true)
  try {
    const { data, error } = await supabase.rpc('post_layer_movement_document', {
      p_lines: asJson(lines),
      p_request_key: requestKey,
    })
    if (error) return failure(message(error, 'server xətası'))
    return { ok: true, error: null, ...readDoc(data) }
  } catch (err) {
    return failure(message(err, 'server xətası'))
  }
}

/** index.html:4807. Idempotent via `stock_layer_requests`. */
export async function postLayerTransferDocument(
  lines: readonly TransferPayloadLine[],
  requestKey: string,
): Promise<PostResult> {
  const blocked = blockedReason('op.layer-post')
  if (blocked) return failure(blocked, true)
  try {
    const { data, error } = await supabase.rpc('post_layer_transfer_document', {
      p_lines: asJson(lines),
      p_request_key: requestKey,
    })
    if (error) return failure(message(error, 'server xətası'))
    return { ok: true, error: null, ...readDoc(data) }
  } catch (err) {
    return failure(message(err, 'server xətası'))
  }
}

/* I-6, decision `D6`. The correction wrapper alone preserves the HTTP status
   and the PostgREST code, because it is the only path here whose failure the
   caller must CLASSIFY rather than merely report.

   WHY IT IS CARRIED. The installed postgrest-js (2.112.4) synthesises a
   structured `{message, details, hint, code}` object with `status: 0` for ANY
   fetch rejection and delivers it in the SAME `error` field a real server
   refusal uses. The presence of an error object is therefore not evidence
   that the server refused anything, and `correct_document` is one
   transaction: a response lost after COMMIT leaves the document corrected
   while the client holds an error. Only the status and code can tell those
   apart — see `lib/correctionOutcome.ts`.

   The other four posting paths are deliberately NOT changed. Their outcome
   handling is `M7-97`/H-3 behaviour that Phase 8 preserves. */
export interface CorrectionResult extends PostResult {
  /** The HTTP status, preserved for classification. 0 = transport failure. */
  status: number | null
  /** PostgREST `code` when supplied; empty string for aborts, null if absent. */
  code: string | null
  /** The raw body, for the correction success validator. */
  data: unknown
}

const readStatus = (v: unknown): number | null =>
  typeof v === 'number' && Number.isFinite(v) ? v : null

const readCode = (err: unknown): string | null => {
  if (err && typeof err === 'object' && 'code' in err) {
    const c = (err as { code?: unknown }).code
    if (typeof c === 'string') return c
  }
  return null
}

const correctionFailure = (
  error: string,
  status: number | null,
  code: string | null,
  blocked = false,
): CorrectionResult => ({
  ok: false,
  error,
  blocked,
  docNum: null,
  rowCount: 0,
  status,
  code,
  data: null,
})

/**
 * `correct_document` — index.html:4759-4761.
 *
 * ADMIN ONLY. One transaction: `document_edit_impact` gate → `cancel_document`
 * → `post_movement_document` → an explicit `audit_log` row carrying the reason.
 *
 * A CONFIRMED failure leaves the original document unchanged. This wrapper
 * does NOT decide that: it returns the status and code and lets
 * `classifyCorrectionFailure` decide whether the server positively refused,
 * because claiming «sənəd dəyişməyib» after a lost response is a false
 * statement about the caller's data.
 *
 * The server appends «Əvəz edir: <doc>» to every note itself, so the payload
 * must not carry one. The fourth parameter (`p_reversal_date`) is left to its
 * CURRENT_DATE default, exactly as the legacy three-argument call does.
 */
export async function correctDocument(
  docNum: string,
  lines: readonly CorrectionPayloadLine[],
  reason: string,
): Promise<CorrectionResult> {
  const blocked = blockedReason('op.correct')
  /* The guard refused before any network call, so nothing was sent and the
     document is genuinely untouched. `blocked` carries that certainty. */
  if (blocked) return correctionFailure(blocked, null, null, true)
  try {
    const res = await supabase.rpc('correct_document', {
      p_doc_num: docNum,
      p_lines: asJson(lines),
      p_reason: reason,
    })
    const status = readStatus((res as { status?: unknown }).status)
    if (res.error) return correctionFailure(message(res.error, 'server xətası'), status, readCode(res.error))
    const d = (res.data ?? {}) as Record<string, unknown>
    return {
      ok: true,
      error: null,
      status,
      code: null,
      data: res.data,
      docNum: d.original_doc_num == null ? null : String(d.original_doc_num),
      rowCount: Number(d.row_count ?? 0) || 0,
      newDocNum: d.new_doc_num == null ? null : String(d.new_doc_num),
      reversalDocNum: d.reversal_doc_num == null ? null : String(d.reversal_doc_num),
    }
  } catch (err) {
    /* A throw never reaches PostgREST's own error path, so no status exists.
       It stays UNKNOWN — never a confirmed rejection. */
    return correctionFailure(message(err, 'server xətası'), null, readCode(err))
  }
}
