import {
  cancelledDocFor,
  rowReplacedOrCancelled,
  type CancelStateMovement,
} from './documentCancelState'
import type { DocumentView } from './documentView'

/* WHICH CANCELLATION ACTIONS A DOCUMENT OFFERS — Phase 8, milestone I-4.

   The decision half of the four legacy views, extracted as pure functions:
   index.html:5023 (`canReplaceRows`), 5036-5049 (the ordinary status ladder),
   5223-5234 (the transfer ladder) and 5265-5271 / 5287-5293 (the two doc-less
   ladders).

   ONE GATE, TWO CALLERS. The dialog renders a button only when the gate allows
   the action, and the submit handler re-runs the SAME function before calling
   the API. That is deliberate: a gate duplicated as "hide the button" plus a
   separately written "check before submitting" drifts, and the drift is only
   ever discovered as an action that should have been impossible. Here there is
   nothing to drift — both paths call this module.

   THE UI GATE IS NOT THE SECURITY BOUNDARY. Every RPC behind these actions is
   SECURITY DEFINER and re-checks the admin role itself; the server stays
   authoritative. What this module prevents is offering a user an action that
   will certainly be refused, and acting on a row whose state has since changed.

   PURE. No React, no Supabase, no store. */

/** The single admin-only reason text — index.html:5043, adapted per family. */
export const ADMIN_ONLY_DOCUMENT =
  'Bu əməliyyatı yalnız Rəhbər (Admin) ləğv edə bilər.'
export const ADMIN_ONLY_LEGACY =
  'Köhnə qeyd yalnız Rəhbər (Admin) tərəfindən ləğv edilə bilər.'
export const ADMIN_ONLY_LEGACY_TRANSFER =
  'Köhnə yerdəyişmə yalnız Rəhbər (Admin) tərəfindən ləğv edilə bilər.'

/** The row-level refusals — index.html:5090-5091, 4950-4951. */
export const ROW_ALREADY_DONE = 'Bu sətir artıq ləğv edilib və ya əvəzlənib'
export const TRANSFER_ROW_NOT_CANCELLABLE =
  'Yerdəyişmə sətri bu yolla ləğv edilmir — sənədi bütövlükdə ləğv edin'
export const TRANSFER_ITEM_NOT_REPLACEABLE =
  'Yerdəyişmə sətrində mal əvəzlənmir — sənədi ləğv edin'

/**
 * Whether the DOCUMENT-level cancellation action is offered.
 *
 * The legacy ladder, in order (index.html:5036-5049):
 *   1. this document IS a reversal        → no action
 *   2. it has already been cancelled      → no action
 *   3. it has no document number          → no action (the legacy families
 *                                           have their own route)
 *   4. the user is not an admin           → no action
 *   5. otherwise                          → offered
 *
 * Order matters and is preserved: a non-admin looking at a reversal document
 * must be told it is a reversal, not that they lack permission.
 */
export function canCancelDocument(view: DocumentView, admin: boolean): boolean {
  if (view.kind !== 'ordinary-doc' && view.kind !== 'transfer-doc') return false
  if (view.status.kind !== 'open') return false
  if (!view.docNum) return false
  return admin
}

/**
 * Whether a DOC-LESS legacy record may be cancelled — index.html:5265 / 5287.
 *
 * `allowed = isAdmin() && !revDoc`. A doc-less record has no document-level
 * status, so its cancellation state is the per-id `cancelledDocFor()` marker.
 */
export function canCancelLegacy(
  movement: CancelStateMovement,
  allRows: CancelStateMovement[],
  admin: boolean,
): boolean {
  if (!admin) return false
  return !cancelledDocFor(movement, allRows)
}

/**
 * `canReplaceRows` — index.html:5023, verbatim in its conditions:
 *
 *   isAdmin() && !isRev && !revDoc && !lotDoc
 *
 * plus the family gate legacy expresses structurally rather than as a flag:
 * the per-row controls exist only in `documentCancelView`, never in
 * `transferDocView`, so a TRANSFER document offers neither replacement nor row
 * cancellation. That is not an oversight to be tidied away — the server
 * rejects both for transfers as well.
 *
 * `lotDoc` gates this and nothing else. A partia-valued document has
 * `writeoff_valuations` rows tied to its lines; replacing an item under it
 * would leave a valuation pointing at a line whose item changed, so the whole
 * document loses the per-row controls even for its unvalued lines.
 *
 * `D4` is resolved as INCLUDED: item replacement ships in I-4 with exactly
 * these legacy conditions preserved.
 *
 * THE TWO ROW ACTIONS ARE NOT THE SAME GATE — I-4 audit, finding 1.
 *
 * `Sətri ləğv et` and `Malı əvəz et` are rendered together by
 * `documentCancelView()` (index.html:5019-5022), which is reached ONLY by a
 * document with a real `doc_num`. The doc-less ordinary view is a different
 * function, `legacyCancelView()` (index.html:5264-5275), and it offers
 * `Malı əvəz et` (`#lc-repl`) plus WHOLE-record cancellation (`#lc-go`) —
 * there is no `Sətri ləğv et` anywhere in it, because row cancellation
 * (`cancel_movement_row`, sql/034) cancels one line INSIDE a document and a
 * doc-less legacy record has no document to leave standing.
 *
 * A single `canUseRowActions()` covering both actions therefore offered row
 * cancellation on a legacy record that legacy never offered it on. The gate is
 * split so each action carries its own real matrix.
 */

/** The two per-row actions, named so a caller cannot silently conflate them. */
export type RowAction = 'cancel-row' | 'replace-item'

/**
 * `Malı əvəz et` at the DOCUMENT level — offered by both the ordinary document
 * view (index.html:5023) and the doc-less legacy ordinary view
 * (index.html:5275).
 *
 * Legacy conditions, per family:
 *   ordinary document  isAdmin && !isRev && !revDoc && !lotDoc
 *   legacy ordinary    isAdmin && !revDoc          (the `allowed` of 5265)
 *
 * A transfer — with or without a document number — offers neither.
 */
export function canReplaceItems(
  view: DocumentView,
  allRows: CancelStateMovement[],
  admin: boolean,
): boolean {
  if (!admin) return false
  /* Transfers have no per-row controls in any legacy view. */
  if (view.kind === 'transfer-doc' || view.kind === 'legacy-transfer') return false
  if (view.kind === 'ordinary-doc') {
    if (view.status.kind !== 'open') return false
    if (view.lotDoc) return false
    return true
  }
  if (view.kind === 'legacy-ordinary') {
    /* The doc-less record's status is its per-id marker, exactly as
       `legacyCancelView()` computes `revDoc = cancelledDocFor(m)`. */
    return !cancelledDocFor(view.clicked as unknown as CancelStateMovement, allRows)
  }
  return false
}

/**
 * `Sətri ləğv et` at the DOCUMENT level — offered ONLY by the ordinary
 * document view (index.html:5019-5022).
 *
 * There is deliberately no legacy branch: `legacyCancelView()` has no row
 * cancellation control, and `cancel_movement_row` operates on a line within a
 * document. A doc-less record is cancelled whole, through
 * `cancel_legacy_movement`.
 */
export function canCancelRows(view: DocumentView, admin: boolean): boolean {
  if (!admin) return false
  if (view.kind !== 'ordinary-doc') return false
  if (view.status.kind !== 'open') return false
  if (view.lotDoc) return false
  return true
}

/**
 * Whether the document offers a given row action. The one entry point the
 * renderer and both submit handlers share, so the matrix cannot drift.
 */
export function canUseRowAction(
  view: DocumentView,
  allRows: CancelStateMovement[],
  admin: boolean,
  action: RowAction,
): boolean {
  return action === 'replace-item'
    ? canReplaceItems(view, allRows, admin)
    : canCancelRows(view, admin)
}

/**
 * Whether the document offers ANY per-row control — i.e. whether the actions
 * column exists at all. Replacement is the wider of the two gates, so this is
 * exactly `canReplaceItems()`; it is named separately because the renderer is
 * asking a different question and must not be read as asking about one action.
 */
export function hasAnyRowAction(
  view: DocumentView,
  allRows: CancelStateMovement[],
  admin: boolean,
): boolean {
  return canReplaceItems(view, allRows, admin) || canCancelRows(view, admin)
}

/** One line's own eligibility, on top of the document-level gate above —
    index.html:5019-5022. A row already cancelled or replaced shows the
    «ləğv edilib» tag instead of the two buttons. */
export function canActOnRow(
  row: { id: string | number },
  allRows: CancelStateMovement[],
): boolean {
  return !rowReplacedOrCancelled(row, allRows)
}

/**
 * The single-row REFUSAL reason, or null when the row may be acted on.
 *
 * Used by the submit handler to explain a refusal the button never showed —
 * the state can change between render and submit, and the handler must say
 * WHY it refused rather than silently doing nothing.
 *
 * This is the ROW-LOCAL half only: the row's own type and its own marker. The
 * document-level half lives in `rowActionEligibility()` below, which calls
 * this. A submit handler must never call this one alone — see finding 2.
 */
export function rowActionRefusal(
  row: { id: string | number; type: string },
  allRows: CancelStateMovement[],
  kind: RowAction,
): string | null {
  if (row.type === 'Yerdəyişmə') {
    return kind === 'cancel-row' ? TRANSFER_ROW_NOT_CANCELLABLE : TRANSFER_ITEM_NOT_REPLACEABLE
  }
  if (rowReplacedOrCancelled(row, allRows)) return ROW_ALREADY_DONE
  return null
}

/** The refusal shown when the DOCUMENT no longer offers the action at all —
    it became a reversal, was cancelled, turned out to be lot-valued, or the
    user is not (or is no longer) an admin. Deliberately one message: the
    handler states that the action is not available, and the server remains
    the authority on the precise reason. */
export const ACTION_NO_LONGER_AVAILABLE =
  'Bu əməliyyat artıq mümkün deyil — sənədin vəziyyəti dəyişib'

/** What a submit handler needs to rebuild the CURRENT document context. */
export interface RowActionContext {
  /** The clicked row's id, so the document is re-assembled from live rows. */
  rowId: string
  /** The RAW current rows, markers included. */
  allRows: CancelStateMovement[]
  /** The CURRENT admin flag, read at submit time — not captured at open. */
  admin: boolean
  /** Re-assembles the document view from the CURRENT rows. Supplied by the
      caller because assembling needs the item/valuation lookups this pure
      module deliberately does not import. Returns null when the row is gone
      or its type is unsupported. */
  assemble: (row: CancelStateMovement) => DocumentView | null
}

/**
 * THE COMPLETE per-row eligibility, re-evaluated immediately before the API
 * call — I-4 audit, finding 2.
 *
 * The visible button is gated by the document-level matrix
 * (`canUseRowAction`) AND the row-level one (`canActOnRow`). Before this
 * function existed the submit handlers re-ran only the row-level half, so a
 * dialog that was open while the DOCUMENT changed underneath it — cancelled,
 * turned into a reversal, revalued as `lotDoc`, or the user demoted — still
 * called the RPC. The two paths now run the identical composite check.
 *
 * Nothing here is captured when the dialog opens: the row is re-read from
 * `allRows`, the view is re-assembled from those same rows, and `admin` is
 * passed in fresh by the caller on every submit.
 *
 * Returns null when the action may proceed, otherwise the refusal text.
 */
export function rowActionEligibility(
  ctx: RowActionContext,
  action: RowAction,
): string | null {
  const current = ctx.allRows.find((r) => String(r.id) === ctx.rowId)
  if (!current) return ROW_VANISHED

  /* The row-local half first, so a transfer row keeps its own specific
     message rather than the generic document one. */
  const rowRefusal = rowActionRefusal(current, ctx.allRows, action)
  if (rowRefusal) return rowRefusal

  /* The document half, re-derived from the CURRENT rows. */
  const view = ctx.assemble(current)
  if (!view) return ACTION_NO_LONGER_AVAILABLE
  if (!canUseRowAction(view, ctx.allRows, ctx.admin, action)) {
    return ACTION_NO_LONGER_AVAILABLE
  }
  return null
}

/** The row-vanished message — the dialog's own «artıq mövcud deyil». */
export const ROW_VANISHED = 'Bu sətir artıq mövcud deyil'

/**
 * WHETHER A CANCELLATION MAY BE WRITTEN AT ALL — I-4 audit, finding 3.
 *
 * Every cancellation RPC exists in two families, layer and non-layer, and the
 * live `stock_layers_supported()` capability chooses between them. When the
 * probe has not answered, choosing either family is a guess about which write
 * is correct against real stock. This refuses instead.
 *
 * `layerReady` — the probe answered. `layerActive` is meaningful only then.
 *
 * This is a documented deviation from the legacy degraded fallback
 * (index.html:949-975), which routes to the non-layer path on a failed probe.
 * It changes only the uncertain state and prevents a potentially wrong stock
 * mutation; a probe that answers `{ready:true, active:false}` still selects
 * the non-layer RPCs exactly as legacy does.
 */
export function canWriteCancellation(layerReady: boolean): boolean {
  return layerReady
}

/** Shown wherever a cancellation is blocked because the capability is unknown.
    It states the real reason and asks for a retry rather than silently
    disabling a button. */
export const LAYER_CAPABILITY_UNKNOWN =
  'Partiya uçotu vəziyyəti müəyyən edilmədi — ləğv əməliyyatı təhlükəsiz deyil. Yenidən yükləyin.'

/**
 * The reversal-document number for a toast — index.html:5076, 5257, 5281.
 *
 * The legacy `'—'` fallback is preserved: the server may return a result whose
 * `reversal_doc_num` is absent, and the cancellation still happened. The toast
 * must not print «undefined», and must not claim a number that does not exist.
 */
export const reversalDocLabel = (v: string | null | undefined): string => v || '—'

/** The date sent with a cancellation. Blank means OMIT the argument entirely
    so the server default applies — see `withDate()` in the API module. */
export const normalizeReversalDate = (v: string | null | undefined): string | null =>
  v && v.trim() ? v.trim() : null
