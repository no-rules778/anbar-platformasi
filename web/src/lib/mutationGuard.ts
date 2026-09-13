import type { ReferenceAction } from '../api/referenceDirectory.api'

/* Localhost talks to the SAME production Supabase project as the deployed
   platform — there is no separate test database (a deliberate project
   decision). Every write made while developing is therefore a real production
   write, including `create` and `update`: a test partner left behind is a real
   row in a real directory that every user sees.

   This guard blocks ALL reference writes when the app is served from
   localhost, unless the developer explicitly opts in with
   VITE_ALLOW_LOCAL_WRITES=true in web/.env. It is a development-only safety
   net: a deployed build (any other hostname) is unaffected, so production
   behaviour is unchanged. */

/* Phase 5 widened this guard past the reference directories: Nomenklatura
   writes items, and those go DIRECTLY to the table rather than through
   manage_reference(), so they need the same localhost protection. The
   reference action names are unchanged; the item ones are additive. */
export type ItemWriteAction =
  | 'item.create' | 'item.update' | 'item.bulk' | 'item.import' | 'item.category-import'

/* Phase 7 widens the guard again, this time to the paths that create MOVEMENTS.
   Those are the first writes in the migration that change stock rather than a
   directory row, so the localhost protection matters more here than anywhere
   before: a stray localhost post would be a real document in a real warehouse.

   `op.post`          post_movement_document
   `op.post-transfer` post_transfer_document
   `op.layer-post`    post_layer_movement_document / post_layer_transfer_document
   `op.correct`       correct_document (cancels the original and re-posts) */
export type OperationWriteAction =
  | 'op.post' | 'op.post-transfer' | 'op.layer-post' | 'op.correct'

/* Phase 8 (milestone I-4) widens the guard once more, to the CANCELLATION
   family. These are the most consequential writes the guard has covered: each
   one posts a real reversal document into a real warehouse, and unlike a
   directory row a stray one cannot simply be edited away — it is undone only by
   another counter-entry, leaving both in the permanent audit trail.

   `doc.cancel`                 cancel_document / cancel_layer_document
   `doc.cancel-transfer`        cancel_transfer_document /
                                cancel_layer_transfer_document
   `doc.cancel-row`             cancel_movement_row / cancel_layer_movement_row
   `doc.replace-item`           replace_movement_item (no layer variant exists)
   `doc.cancel-legacy`          cancel_legacy_movement / layer variant
   `doc.cancel-legacy-transfer` cancel_legacy_transfer / layer variant
   `doc.cancel-batch`           cancel_documents_batch / layer variant

   One action covers BOTH variants of a family: the localhost decision is about
   whether a write may happen at all, never about which RPC would serve it. */
export type DocumentCancelAction =
  | 'doc.cancel' | 'doc.cancel-transfer' | 'doc.cancel-row' | 'doc.replace-item'
  | 'doc.cancel-legacy' | 'doc.cancel-legacy-transfer' | 'doc.cancel-batch'

/* Phase 9 (M9-107) widens the guard to the stock-condition marker write.
   `set_stock_condition` is the ONLY application write on the balance screen
   (M9-106); it changes no stock, but it is a real row in a real table that
   every user of that warehouse sees, so it gets the same localhost protection.

   `cond.set`   set_stock_condition (seven-argument, with the six-argument
                PGRST202 fallback — one action covers both signatures) */
export type ConditionWriteAction = 'cond.set'

/* Phase 12 (M12-97) widens the guard to the four nomenclature-request writes.
   Each is its own action name because they are not interchangeable: one of
   them is irreversible in a way nothing else on this screen is.

   `nreq.create`  request_new_item      (a pending row, withdrawable)
   `nreq.approve` approve_item_request  (PERMANENTLY creates an item and
                                         consumes a 7-digit code — not undoable
                                         through any supported interface)
   `nreq.reject`  reject_item_request   (decided row + audit row remain)
   `nreq.cancel`  cancel_item_request   (decided row + audit row remain)

   None of the four is database-net-zero: withdrawal and rejection are only
   item-catalogue-neutral, since the decided request and its audit_log row stay
   permanently (sql/017:432-436, 477-481). */
export type ItemRequestWriteAction =
  | 'nreq.create' | 'nreq.approve' | 'nreq.reject' | 'nreq.cancel'

/* Phase 13 (M13-97) widens the guard to the three «Sərfiyyat Materialları»
   document writes. Each is its own action name because they are not
   interchangeable, and one of them is irreversible:

   `sm.create`  create_serfiyyat_document (a new document; consumes a
                `serfiyyat_doc_seq` value that never returns)
   `sm.edit`    edit_serfiyyat_document   (admin-only server-side; DELETEs and
                re-INSERTs every line, so line ids are not stable)
   `sm.delete`  delete_serfiyyat_document (admin-only server-side; the row is
                DELETEd and its lines cascade — there is NO reversal document,
                unlike the movements module, and only the audit_log row
                survives)

   None of the three is database-net-zero: create → delete restores the
   document CATALOGUE, but the consumed sequence value and the INSERT/DELETE
   audit history remain permanently (sql/032, schema 2476-2480, 2535-2537). */
export type SerfiyyatWriteAction = 'sm.create' | 'sm.edit' | 'sm.delete'

/* Phase 17 (M17-107) widens the guard to the Azpetrol / Araz module. Until
   now this file had NO `azp.*` action at all, which was correct while no
   write path existed; these are added together with the first write callers,
   not after them.

   `azp.card-save`   azp_save_card      (create or update a fuel card)
   `azp.card-delete` azp_delete_card    (a HARD DELETE — see below)
   `azp.post`        azp_post_movements (1..5000 rows, atomic)
   `azp.cancel`      azp_cancel_movement
   `azp.correct`     azp_correct_movement (cancel + replace in one transaction)
   `azp.app-balance` azp_set_application_balance (moves the module's fund)
   `azp.import`      the import orchestration as a whole

   `azp.card-delete` is the most consequential action the guard has ever
   covered. Unlike every cancellation family above it, it leaves NO reversal
   row and no document to trace: `azp_delete_card` DELETEs the card outright
   and is recoverable only from a backup. The server refuses any card that
   carries movements, which bounds the blast radius but does not make the
   action reversible.

   `azp.import` is guarded SEPARATELY from `azp.post` even though it ends in
   one, because the import is NOT atomic as a whole (M17-89): it creates
   cards in a per-card RPC loop first, and a failure after that loop leaves
   real cards behind with no movements. Blocking the orchestration by its own
   name stops the loop before its first write rather than midway. */
export type AzpWriteAction =
  | 'azp.card-save' | 'azp.card-delete' | 'azp.post' | 'azp.cancel'
  | 'azp.correct' | 'azp.app-balance' | 'azp.import'

export type GuardedAction =
  ReferenceAction | ItemWriteAction | OperationWriteAction | DocumentCancelAction
  | ConditionWriteAction | ItemRequestWriteAction | SerfiyyatWriteAction
  | AzpWriteAction

export const WRITE_ACTIONS: readonly GuardedAction[] = [
  'create', 'update', 'delete', 'deactivate', 'activate',
  'item.create', 'item.update', 'item.bulk', 'item.import', 'item.category-import',
  'op.post', 'op.post-transfer', 'op.layer-post', 'op.correct',
  'doc.cancel', 'doc.cancel-transfer', 'doc.cancel-row', 'doc.replace-item',
  'doc.cancel-legacy', 'doc.cancel-legacy-transfer', 'doc.cancel-batch',
  'cond.set',
  'nreq.create', 'nreq.approve', 'nreq.reject', 'nreq.cancel',
  'sm.create', 'sm.edit', 'sm.delete',
  'azp.card-save', 'azp.card-delete', 'azp.post', 'azp.cancel',
  'azp.correct', 'azp.app-balance', 'azp.import',
]

/** Every guarded action mutates live data; none is read-only. */
export function isWrite(action: GuardedAction): boolean {
  return WRITE_ACTIONS.includes(action)
}

/** True when the page is served from a local development host. */
export function isLocalhost(hostname: string = globalThis.location?.hostname ?? ''): boolean {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1' || hostname === '[::1]'
}

/** Explicit developer opt-in, via web/.env — off unless it is exactly 'true'. */
export function localWritesAllowed(): boolean {
  return import.meta.env.VITE_ALLOW_LOCAL_WRITES === 'true'
}

/**
 * Decides whether an action may run.
 * Returns null when allowed, or the message to show when it is blocked.
 */
export function blockedReason(
  action: GuardedAction,
  opts: { local?: boolean; allowed?: boolean } = {},
): string | null {
  const local = opts.local ?? isLocalhost()
  const allowed = opts.allowed ?? localWritesAllowed()
  if (!local || !isWrite(action) || allowed) return null
  return 'Bu əməliyyat lokal rejimdə bloklanıb: localhost CANLI Supabase bazasına qoşulub. '
    + 'İcazə vermək üçün web/.env faylında VITE_ALLOW_LOCAL_WRITES=true yazın.'
}

/** Banner text shown while running against the live database from localhost. */
export const LOCALHOST_WARNING =
  'Diqqət: bu lokal rejimdir, lakin CANLI Supabase bazasına qoşulub — burada edilən hər dəyişiklik real məlumatlara yazılır.'

/** Second banner line: whether writes are currently open in this local session. */
export function localWriteStatusText(allowed: boolean): string {
  return allowed
    ? 'Yazma əməliyyatları (yaratma, redaktə, gizlətmə, aktivləşdirmə, silmə) bu rejimdə AÇIQDIR (VITE_ALLOW_LOCAL_WRITES=true).'
    : 'Bütün yazma əməliyyatları bloklanıb: yaratma, redaktə, gizlətmə, aktivləşdirmə və silmə. Açmaq üçün web/.env → VITE_ALLOW_LOCAL_WRITES=true.'
}
