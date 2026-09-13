import { supabase } from './supabase'
import { blockedReason, type AzpWriteAction } from '../lib/mutationGuard'
import { azpMod, type AzpModule } from '../lib/azpLabels'
import type { AzpParsedRow } from '../lib/azpImportParse'
import type { Json } from '../types/database'

/* Azpetrol / Araz — the WRITE client (M17-80 … M17-89).

   ═══ OFFLINE IMPLEMENTATION (D-T1). ═══

   Every function here is built, typed and tested, and NONE has been invoked
   against any Supabase project. Phase 17 executed zero azp writes: no TEST
   fixture exists (D-T2), `azp_delete_card` was never run (D-T3), and no
   import was performed (D-T4). The tests in `azpWrite.api.test.ts` mock the
   client entirely.

   WHAT A MOCKED TEST CANNOT PROVE. These functions shape an RPC call; whether
   the SERVER performs it, refuses it, or enforces atomicity is
   M17-80…M17-89 and M17-17…M17-21 — all BLOCKED. A passing test here is
   evidence that the client asks correctly, never that the server answers as
   described. Every refusal reproduced below is the CLIENT's pre-flight; the
   authoritative one is the RPC's own first statement (sql/020), which no test
   in this repository exercises.

   THE GUARD RUNS FIRST. Every function calls `blockedReason()` before
   touching the client, so a localhost session with no opt-in never reaches
   the network. That is a development safety net, not a permission: it is
   keyed on hostname, and the server decides regardless. */

/** Both failure shapes collapse into one result — nothing here throws. */
export type AzpWriteResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string }

const FAIL = 'Əməliyyat alınmadı'

function message(e: unknown, fallback: string): string {
  if (e && typeof e === 'object' && 'message' in e) {
    const m = (e as { message?: unknown }).message
    if (typeof m === 'string' && m) return m
  }
  if (typeof e === 'string' && e) return e
  return fallback
}

/** The guard pre-flight every write shares. Returns the refusal, or null. */
function guard(action: AzpWriteAction): string | null {
  return blockedReason(action)
}

/** `azp_save_card` — create when `card_id` is absent, update when present. */
export interface AzpCardPatch {
  /** The RPC reads `p_card.id`, not the view's `card_id` field. */
  id?: string
  card_no: string
  holder: string
  project?: string | null
  sort_order?: number | null
  active?: boolean
  note?: string | null
}

/**
 * M17-80 — `azp_save_card(p_module, p_card)`.
 *
 * Returns the card id the server assigns or confirms. The server also writes
 * one `azp_audit_log` row per call; that the row appears is a SERVER contract
 * this client cannot observe.
 */
export async function azpSaveCard(
  m: AzpModule, card: AzpCardPatch,
): Promise<AzpWriteResult<string>> {
  azpMod(m)
  const blocked = guard('azp.card-save')
  if (blocked) return { ok: false, error: blocked }
  try {
    const { data, error } = await supabase.rpc('azp_save_card', {
      p_module: m, p_card: card as unknown as Json,
    })
    if (error) return { ok: false, error: message(error, FAIL) }
    return { ok: true, data: String(data ?? '') }
  } catch (e) {
    return { ok: false, error: message(e, FAIL) }
  }
}

/** The exact client-side refusal when a card still carries movements. */
export const AZP_DELETE_HAS_MOVEMENTS =
  'Bu kartın əməliyyatları var — silinmir.'

/**
 * M17-81 — `azp_delete_card(p_module, p_card_id)`.
 *
 * ═══ IRREVERSIBLE, AND NEVER EXECUTED IN PHASE 17 (D-T3). ═══
 *
 * This is a HARD DELETE. Unlike every cancellation path elsewhere in the
 * platform it posts no reversal row and leaves no document to trace: once the
 * card is gone it is recoverable only from a backup. It was implemented and
 * tested with mocks; it has never been run against TEST or production.
 *
 * THREE REFUSALS, IN THIS ORDER. Two are reproduced client-side so the user
 * is stopped before a pointless round trip, but the AUTHORITATIVE check is
 * the server's:
 *
 *  1. the localhost guard (`azp.card-delete`);
 *  2. a card that still carries movements — refused here AND by the RPC;
 *  3. admin — refused here by the caller's `azpNeedAdmin`, and by the RPC.
 *
 * `movementCount` is supplied by the caller from the loaded snapshot. It is a
 * CONVENIENCE: a snapshot can be stale, so a zero count here is not proof the
 * card is empty. The server re-counts, and its answer is the one that
 * decides. Passing a wrong count cannot create a delete the server would
 * refuse — it can only cause a refusal the server would have allowed.
 */
export async function azpDeleteCard(
  m: AzpModule, cardId: string, movementCount: number,
): Promise<AzpWriteResult> {
  azpMod(m)
  const blocked = guard('azp.card-delete')
  if (blocked) return { ok: false, error: blocked }
  if (movementCount > 0) return { ok: false, error: AZP_DELETE_HAS_MOVEMENTS }
  try {
    const { error } = await supabase.rpc('azp_delete_card', {
      p_module: m, p_card_id: cardId,
    })
    if (error) return { ok: false, error: message(error, FAIL) }
    return { ok: true, data: undefined }
  } catch (e) {
    return { ok: false, error: message(e, FAIL) }
  }
}

/** The server's batch ceiling — sql/020. Row 5001 is refused. */
export const AZP_MAX_POST_ROWS = 5000

/** The exact client-side refusal for an over-size batch. */
export const AZP_TOO_MANY_ROWS =
  'Bir paketdə ən çox ' + AZP_MAX_POST_ROWS + ' sətir yazıla bilər.'

/** The exact client-side refusal for an empty batch. */
export const AZP_NO_ROWS = 'Yazılacaq sətir yoxdur.'

export interface AzpPostRow {
  card_id: string
  kind: 'medaxil' | 'mexaric'
  amount: number
  op_date: string | null
  doc_num?: string | null
  note?: string | null
  vat_included: boolean
}

/**
 * M17-82, M17-83, M17-84 — `azp_post_movements(p_module, p_rows, p_source)`.
 *
 * ATOMIC ON THE SERVER, for 1..5000 rows. The client mirrors both bounds so
 * an obviously invalid batch never leaves the browser, but atomicity itself
 * is a SERVER property: no client test can show that row 3000 failing rolls
 * back rows 1..2999.
 *
 * `p_source` MATTERS (M17-83). The server sets `app_balance_effect` only for
 * a `medaxil` whose source is NOT `'import'`, so an import never moves the
 * module's fund — that is why the import path passes `'import'` explicitly
 * and the manual path leaves it at the server default. Passing the wrong
 * source here would silently move a fund that should not move; it is the
 * single most consequential argument in this file.
 *
 * M17-84 — an insufficient application balance refuses the WHOLE batch, with
 * the server's own message. There is no partial post.
 */
export async function azpPostMovements(
  m: AzpModule, rows: readonly AzpPostRow[], source?: string,
): Promise<AzpWriteResult<number>> {
  azpMod(m)
  const blocked = guard('azp.post')
  if (blocked) return { ok: false, error: blocked }
  if (!rows.length) return { ok: false, error: AZP_NO_ROWS }
  if (rows.length > AZP_MAX_POST_ROWS) return { ok: false, error: AZP_TOO_MANY_ROWS }
  try {
    const args: { p_module: string; p_rows: Json; p_source?: string } = {
      p_module: m, p_rows: rows as unknown as Json,
    }
    /* Omitted rather than passed as undefined, so the server's own default
       applies for a manual post instead of an explicit null. */
    if (source !== undefined) args.p_source = source
    const { data, error } = await supabase.rpc('azp_post_movements', args)
    if (error) return { ok: false, error: message(error, FAIL) }
    return { ok: true, data: Number(data ?? 0) }
  } catch (e) {
    return { ok: false, error: message(e, FAIL) }
  }
}

/**
 * M17-85 — `azp_cancel_movement(p_module, p_id, p_reason)`.
 *
 * The server restores the fund ONLY when the cancelled row actually carried
 * `app_balance_effect` — so cancelling an imported Mədaxil, which never moved
 * the fund, must not credit it. That conditional restore is a server
 * contract; this client only names the row.
 */
export async function azpCancelMovement(
  m: AzpModule, id: number, reason?: string,
): Promise<AzpWriteResult> {
  azpMod(m)
  const blocked = guard('azp.cancel')
  if (blocked) return { ok: false, error: blocked }
  try {
    const args: { p_module: string; p_id: number; p_reason?: string } = { p_module: m, p_id: id }
    if (reason !== undefined) args.p_reason = reason
    const { error } = await supabase.rpc('azp_cancel_movement', args)
    if (error) return { ok: false, error: message(error, FAIL) }
    return { ok: true, data: undefined }
  } catch (e) {
    return { ok: false, error: message(e, FAIL) }
  }
}

/** The exact client-side refusal when a correction would change the kind. */
export const AZP_KIND_CHANGE_REFUSED =
  'Düzəlişdə əməliyyatın növü dəyişdirilə bilməz — ləğv edib yenisini yazın.'

/** The fields a correction may patch. `kind` is deliberately absent. */
export interface AzpCorrectionPatch {
  amount?: number
  op_date?: string | null
  doc_num?: string | null
  note?: string | null
  card_id?: string
  vat_included?: boolean
  /* `kind` is NOT part of this type. A kind change is refused, and leaving it
     out of the type means a caller cannot even express one by accident. The
     runtime check below exists for values that arrive untyped. */
}

/**
 * M17-86, M17-87 — `azp_correct_movement(p_module, p_id, p_patch, p_reason)`.
 *
 * ONE TRANSACTION on the server: the original is cancelled and a replacement
 * inserted, linked in both directions (`replaces` / `replaced_by`). Returns
 * the new row's id.
 *
 * A `kind` CHANGE IS REFUSED (M17-86). Correcting a Mədaxil into a Məxaric
 * would reverse the sign of a fund movement while presenting itself as an
 * edit; the supported path is to cancel and post anew. Refused here by type
 * AND at runtime, and again by the server.
 *
 * SUFFICIENCY IS CHECKED ON THE NET DELTA (M17-87), so LOWERING a Mədaxil can
 * never fail for insufficient funds — the correction releases money rather
 * than consuming it. That arithmetic is the server's; this client does not
 * reproduce it, because a client-side copy could disagree with the authority
 * and refuse a correction the server would allow.
 */
export async function azpCorrectMovement(
  m: AzpModule, id: number, patch: AzpCorrectionPatch, reason?: string,
): Promise<AzpWriteResult<number>> {
  azpMod(m)
  const blocked = guard('azp.correct')
  if (blocked) return { ok: false, error: blocked }
  if (patch && Object.prototype.hasOwnProperty.call(patch, 'kind')) {
    return { ok: false, error: AZP_KIND_CHANGE_REFUSED }
  }
  try {
    const args: { p_module: string; p_id: number; p_patch: Json; p_reason?: string } = {
      p_module: m, p_id: id, p_patch: patch as unknown as Json,
    }
    if (reason !== undefined) args.p_reason = reason
    const { data, error } = await supabase.rpc('azp_correct_movement', args)
    if (error) return { ok: false, error: message(error, FAIL) }
    return { ok: true, data: Number(data ?? 0) }
  } catch (e) {
    return { ok: false, error: message(e, FAIL) }
  }
}

/**
 * `azp_set_application_balance(p_module, p_balance)` — the M17-67 edit
 * button's write. Admin-only on the server; the fund is maintained by hand.
 */
export async function azpSetApplicationBalance(
  m: AzpModule, balance: number,
): Promise<AzpWriteResult<number>> {
  azpMod(m)
  const blocked = guard('azp.app-balance')
  if (blocked) return { ok: false, error: blocked }
  try {
    const { data, error } = await supabase.rpc('azp_set_application_balance', {
      p_module: m, p_balance: balance,
    })
    if (error) return { ok: false, error: message(error, FAIL) }
    return { ok: true, data: Number(data ?? 0) }
  } catch (e) {
    return { ok: false, error: message(e, FAIL) }
  }
}

/** The exact refusal when a card could not be created during an import. */
export const AZP_IMPORT_CARD_FAILED =
  'Bəzi kartlar yaradılmadı — idxal dayandırıldı.'

export interface AzpImportOutcome {
  /** How many movement rows the server accepted. */
  posted: number
  /** How many cards the loop created before the post. */
  created: number
}

/**
 * M17-88, M17-89 — the import orchestration (index.html:9167-9191).
 *
 * ═══ NOT ATOMIC AS A WHOLE. This is the residual risk M17-89 names. ═══
 *
 * Step 1 creates each missing card through its OWN `azp_save_card` call, in a
 * loop. Step 2 posts every movement in ONE atomic `azp_post_movements` batch.
 * The two steps are not in a shared transaction, so a failure in step 2 —
 * or midway through step 1 — leaves real cards behind with no movements.
 * Those cards are harmless (a card with no movements carries no balance) and
 * a re-run reuses them rather than duplicating, because `known` is keyed on
 * the trimmed lower-cased card number. But they are NOT rolled back, and no
 * client-side arrangement can make them so; only a server-side import RPC
 * could, and none exists.
 *
 * `p_source` is `'import'` (M17-83), so no imported Mədaxil moves the fund.
 *
 * A SINGLE parse error must have blocked this before it was called (M17-88);
 * the caller checks `azpImportBlocked()` and this function re-checks nothing
 * about parsing — it is given rows it is expected to write.
 *
 * NEVER EXECUTED (D-T4). Its tests mock every RPC.
 */
export async function azpRunImport(
  m: AzpModule,
  parsedCards: readonly { card_no: string; holder: string }[],
  parsedRows: readonly AzpParsedRow[],
  existing: readonly { card_no?: string | null; card_id?: string | null }[],
): Promise<AzpWriteResult<AzpImportOutcome>> {
  azpMod(m)
  /* Guarded by the ORCHESTRATION's own name, so the card loop is stopped
     before its first write rather than midway (M17-89). */
  const blocked = guard('azp.import')
  if (blocked) return { ok: false, error: blocked }

  const key = (v: unknown) => String(v ?? '').trim().toLowerCase()
  const known = new Map<string, string>()
  for (const c of existing) {
    if (c.card_id) known.set(key(c.card_no), String(c.card_id))
  }

  let created = 0
  try {
    /* 1) create the missing cards, one RPC each */
    for (const c of parsedCards) {
      const k = key(c.card_no)
      if (known.has(k)) continue
      const { data, error } = await supabase.rpc('azp_save_card', {
        p_module: m, p_card: { card_no: c.card_no, holder: c.holder } as unknown as Json,
      })
      if (error) return { ok: false, error: message(error, FAIL) }
      known.set(k, String(data ?? ''))
      created++
    }

    /* 2) post every movement as ONE atomic batch */
    const rows: AzpPostRow[] = parsedRows.map((r) => ({
      card_id: known.get(key(r.card_no)) ?? '',
      kind: r.kind, amount: r.amount, op_date: r.op_date, vat_included: r.vat_included,
    }))
    if (rows.some((r) => !r.card_id)) {
      return { ok: false, error: AZP_IMPORT_CARD_FAILED }
    }

    const posted = await azpPostMovements(m, rows, 'import')
    if (!posted.ok) return { ok: false, error: posted.error }
    return { ok: true, data: { posted: posted.data, created } }
  } catch (e) {
    return { ok: false, error: message(e, FAIL) }
  }
}
