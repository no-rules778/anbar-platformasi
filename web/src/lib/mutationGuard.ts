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

export type GuardedAction =
  ReferenceAction | ItemWriteAction | OperationWriteAction | DocumentCancelAction
  | ConditionWriteAction

export const WRITE_ACTIONS: readonly GuardedAction[] = [
  'create', 'update', 'delete', 'deactivate', 'activate',
  'item.create', 'item.update', 'item.bulk', 'item.import', 'item.category-import',
  'op.post', 'op.post-transfer', 'op.layer-post', 'op.correct',
  'doc.cancel', 'doc.cancel-transfer', 'doc.cancel-row', 'doc.replace-item',
  'doc.cancel-legacy', 'doc.cancel-legacy-transfer', 'doc.cancel-batch',
  'cond.set',
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
