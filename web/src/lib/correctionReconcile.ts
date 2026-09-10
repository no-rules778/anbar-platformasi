import { docCancelledBy, type CancelStateMovement } from './documentCancelState'
import type { UnresolvedCorrection } from '../store/correction.store'

/* RECONCILING AN UNRESOLVED CORRECTION — Phase 8, milestone I-6.

   `correction.store.ts` records an attempt before dispatch and blocks a second
   correction of the same document until that attempt's fate is established.
   The WRITE path establishes it for every outcome it sees. What it cannot see
   is the outcome it never received: an `unknown` record — the response was
   lost — survives the dialog, the page reload and the session, and nothing in
   the read path ever cleared it. The admin refreshed «Mal hərəkəti», saw the
   correction plainly applied, and was still refused.

   This module supplies the missing half: a READ-ONLY derivation over the
   movement rows already loaded for the screen. It performs no query, no write
   and no RPC; it only answers "do the rows on screen PROVE what happened to
   this attempt?".

   ---------------------------------------------------------------------------
   WHAT COUNTS AS PROOF.

   `correct_document` (sql/030) is one transaction with two observable halves:

     1. `cancel_document(<doc>)` writes a counter-document whose note is
        exactly `Ləğv: <doc>` — read by `docCancelledBy`.
     2. every replacement line is stamped `… · Əvəz edir: <doc>`
        (sql/030:365-372) — the forward link from the old document to the new.

   BOTH are required. The cancellation alone is NOT evidence of a correction:
   an ordinary «Ləğv» from the cancel dialog, or an I-5 batch cancellation,
   produces exactly the same marker. Clearing a correction block on that would
   be clearing it because SOMETHING happened to the document, not because THE
   CORRECTION happened — and it would unblock a resend precisely in the case
   where the document was cancelled but never replaced.

   The `Əvəz edir:` marker is what establishes the RELATIONSHIP. It is written
   only by `correct_document`, it names the original document, and it cannot
   collide with the cancellation markers (sql/030:363-364 — those all begin
   with `Ləğv`, this one does not).

   ---------------------------------------------------------------------------
   WHAT IS NOT PROOF — the fail-closed direction.

   A MISSING marker means nothing was observed. It does NOT mean the
   correction was rolled back, and it must never clear a record or be reported
   as a rollback: the rows may simply not have loaded, the read may have
   failed, or the correction may have committed on a server whose response was
   lost and whose rows this client has not yet fetched. An unobserved attempt
   stays unresolved and goes on blocking — the same discipline `readStore`
   applies to an unreadable storage blob.

   So this module has exactly one positive verdict and no negative one. */

/** The subset of a movement row the readers below need. */
export type ReconcileRow = CancelStateMovement

/** The forward-link marker `correct_document` stamps on every replacement
    line (sql/030:365). Must match the SQL exactly — a change on either side
    is a change on both. */
export const replacesMarker = (originalDoc: string): string => 'Əvəz edir: ' + originalDoc

/** The separator the RPC puts between an existing note and the marker
    (sql/030:370). */
const MARKER_SEP = ' · '

/**
 * The replacement document's number, when the loaded rows show that THIS
 * document was corrected — otherwise null.
 *
 * A row proves it by carrying the `Əvəz edir: <doc>` marker; the row's OWN
 * `doc_num` is the replacement. The marker is appended to whatever note the
 * admin typed (`'<note> · Əvəz edir: <doc>'`) or stands alone when there was
 * none, so it is matched as a SUFFIX rather than by equality — and anchored at
 * the end so a document number appearing mid-note cannot be mistaken for it.
 *
 * The `'—'` fallback follows `docCancelledBy`: a marker row that carries no
 * `doc_num` of its own still proves the replacement exists, so the caller must
 * not read a null `doc_num` as "no correction".
 */
export function replacementDocFor(
  docNum: string | null | undefined,
  rows: readonly ReconcileRow[],
): string | null {
  if (!docNum) return null
  const marker = replacesMarker(docNum)
  const hit = rows.find((r) => {
    const note = String(r.note ?? '').trim()
    return note === marker || note.endsWith(MARKER_SEP + marker)
  })
  return hit ? String(hit.doc_num ?? '') || '—' : null
}

/** What the loaded rows establish about one unresolved correction. */
export type CorrectionEvidence =
  /** Both halves observed: the original is cancelled AND a replacement names
      it. The correction demonstrably happened. */
  | { kind: 'corrected'; newDocNum: string }
  /** Nothing conclusive on screen. The record STAYS — this is not a rollback
      verdict, only an absence of evidence. */
  | { kind: 'unobserved' }

/**
 * Read the evidence for ONE unresolved correction out of the loaded rows.
 *
 * Deliberately conservative on every axis:
 *
 *   - it requires BOTH markers, so a plain cancellation cannot resolve it;
 *   - it returns `unobserved` — never a rollback — when either is missing;
 *   - it is a pure function of the rows handed to it, so a caller holding a
 *     STALE or EMPTY row set gets `unobserved` and the block is retained.
 *
 * A record already carrying a `newDocNum` (a confirmed success whose refresh
 * failed) is still checked against the rows: the point of reconciliation is
 * that the SCREEN now shows the correction, not that the client once believed
 * it. When the observed replacement disagrees with the recorded one the
 * verdict is `unobserved`, because two different replacements for one original
 * is a state no single correction produces and none of it may be assumed.
 */
export function correctionEvidence(
  rec: UnresolvedCorrection,
  rows: readonly ReconcileRow[],
): CorrectionEvidence {
  /* A `pending` attempt is still in flight in THIS page. Its fate belongs to
     the write path, which will resolve it when the response arrives; reading
     the rows underneath it could only observe a correction that the write path
     is about to report anyway. */
  if (rec.phase === 'pending') return { kind: 'unobserved' }

  const cancelledBy = docCancelledBy(rec.docNum, rows as CancelStateMovement[])
  if (cancelledBy == null) return { kind: 'unobserved' }

  const replacement = replacementDocFor(rec.docNum, rows)
  if (replacement == null) return { kind: 'unobserved' }

  if (rec.newDocNum && replacement !== '—' && rec.newDocNum !== replacement) {
    return { kind: 'unobserved' }
  }
  return { kind: 'corrected', newDocNum: rec.newDocNum ?? replacement }
}

/** The ids that the loaded rows prove may be cleared, with the replacement
    each was resolved to — for the caller's message. Everything absent from
    this list stays blocked. */
export function resolvedCorrections(
  records: readonly UnresolvedCorrection[],
  rows: readonly ReconcileRow[],
): { id: string; docNum: string; newDocNum: string }[] {
  const out: { id: string; docNum: string; newDocNum: string }[] = []
  for (const rec of records) {
    const ev = correctionEvidence(rec, rows)
    if (ev.kind === 'corrected') {
      out.push({ id: rec.id, docNum: rec.docNum, newDocNum: ev.newDocNum })
    }
  }
  return out
}

/* ---------------------------------------------------------------------------
   THE UNRESOLVED BANNER — what the user is told while a record still blocks.
   ------------------------------------------------------------------------ */

/**
 * The affected document and its state, for the «Mal hərəkəti» banner. An
 * unresolved correction that is never DISPLAYED is a block with no
 * explanation: the admin finds «Sənədi redaktə et» refusing and no reason on
 * screen. Each state names the document and says what to do.
 */
export function unresolvedCorrectionText(rec: UnresolvedCorrection): string {
  if (rec.phase === 'pending') {
    return `${rec.docNum} sənədi üzrə düzəliş göndərilib, cavab gözlənilir.`
  }
  if (rec.phase === 'success') {
    const to = rec.newDocNum ? ` (yeni sənəd: ${rec.newDocNum})` : ''
    return (
      `${rec.docNum} sənədi düzəldildi${to}, lakin siyahı yenilənmədiyi üçün `
      + 'ekranda təsdiqlənməyib. Siyahını yeniləyin.'
    )
  }
  return (
    `${rec.docNum} sənədi üzrə düzəlişin nəticəsi TƏSDİQLƏNMƏYİB — sənədin `
    + 'düzəldilib-düzəldilmədiyi bilinmir. Siyahını yeniləyin və sənədin '
    + 'vəziyyətini yoxlayın; təkrar düzəliş bloklanıb.'
  )
}
