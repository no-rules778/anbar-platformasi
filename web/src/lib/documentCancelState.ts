/* Cancellation / reversal STATE of a document or a single row — M8-06, M8-20,
   M8-21, M8-22. Ported from index.html:4868-4941.

   These are read-only derivations over the loaded movement set. They answer
   "has this already been cancelled, and by which document?" — they never
   cancel anything, and no cancellation RPC lives here.

   The marker strings are a SERVER contract mirrored client-side: the SQL
   functions `cancel_document` / `cancel_transfer_document` write exactly these
   notes, so a change on either side must be made on both.

   `lib/operationalMovements.ts` already encodes the same four marker shapes for
   a different question — which rows are operational. It is reused for that and
   deliberately NOT merged with this file: `excludeCancelled()` filters a list,
   while everything below looks a specific document or row up. */

/** `CANCELLABLE_TYPES` — index.html:645. Note that `Yerdəyişmə` is ABSENT:
    transfers are cancelled through their own RPC family, which is why the
    dispatcher treats them as a separate branch rather than a case here. */
export const CANCELLABLE_TYPES = [
  'Satınalma',
  'Əvvələ qalıq',
  'Qaytarma',
  'İcarə',
  'Silinmə',
  'Sahəyə',
  'Satış',
] as const

/** The subset of a movement these derivations read. */
export interface CancelStateMovement {
  id: string | number
  type: string
  note: string | null
  doc_num: string | null
}

/** `REVERSAL_MARKER` — index.html:4869. Must match SQL `cancel_transfer_document`. */
export const reversalMarker = (originalDoc: string): string =>
  'Ləğv (əks yerdəyişmə): ' + originalDoc

/** `docCancelMarker` — index.html:4886. Must match SQL `cancel_document`. */
export const docCancelMarker = (originalDoc: string): string => 'Ləğv: ' + originalDoc

/* Both server transfer-counter shapes are terminal reversal documents:
   - numbered transfer:        `Ləğv (əks yerdəyişmə): <doc>`
   - numbered counter created while cancelling a doc-less legacy pair:
                               `Ləğv (əks yerdəyişmə) ID: <id>:<id>`
   The latter still has a generated `SND-LR-*` doc_num, so treating only the
   first shape as a reversal would expose that counter-document for a second
   cancellation. */
const REVERSAL_PREFIX = /^Ləğv \(əks yerdəyişmə\)(?:: | ID: )/
const CANCEL_PREFIX = /^Ləğv: /
const LEGACY_ROW_MARKER = /^Ləğv ID:\s*(.+)$/
const LEGACY_TRANSFER_PREFIX = /^Ləğv \(əks yerdəyişmə\) ID: /

const doc = (m: CancelStateMovement): string => String(m.doc_num ?? '')
const note = (m: CancelStateMovement): string => String(m.note ?? '')

/**
 * `docReversalDoc` — index.html:4871-4876. The counter-document's number when
 * this TRANSFER document has already been reversed, otherwise null.
 *
 * The `'—'` fallback is legacy behaviour and is preserved: a marker row that
 * itself carries no `doc_num` still proves the reversal happened, so the
 * caller must not read null as "not cancelled".
 */
export function docReversalDoc(
  docNum: string | null | undefined,
  movements: CancelStateMovement[],
): string | null {
  if (!docNum) return null
  const marker = reversalMarker(docNum)
  const rev = movements.find((m) => note(m) === marker)
  return rev ? doc(rev) || '—' : null
}

/** `isReversalDoc` — index.html:4878-4881 plus the server's legacy-pair
    counter shape. Is this document itself a transfer counter-document? Such a
    document can never be cancelled again. */
export function isReversalDoc(
  docNum: string | null | undefined,
  movements: CancelStateMovement[],
): boolean {
  if (!docNum) return false
  return movements.some((m) => doc(m) === docNum && REVERSAL_PREFIX.test(note(m)))
}

/** `docCancelledBy` — index.html:4888-4893. The reversing document's number
    when this ORDINARY document has already been cancelled, otherwise null.
    Same `'—'` fallback as `docReversalDoc()`. */
export function docCancelledBy(
  docNum: string | null | undefined,
  movements: CancelStateMovement[],
): string | null {
  if (!docNum) return null
  const marker = docCancelMarker(docNum)
  const rev = movements.find((m) => note(m) === marker)
  return rev ? doc(rev) || '—' : null
}

/** `isCancelDoc` — index.html:4895-4898. Is this document itself an ordinary
    reversal (counter-entry) document? */
export function isCancelDoc(
  docNum: string | null | undefined,
  movements: CancelStateMovement[],
): boolean {
  if (!docNum) return false
  return movements.some((m) => doc(m) === docNum && CANCEL_PREFIX.test(note(m)))
}

/**
 * `cancelledDocFor` — index.html:4900-4909. For any supported type: the
 * reversing document's number when THIS row's document is already cancelled.
 *
 * A row with no `doc_num` falls back to the legacy per-id markers, which differ
 * by family — a transfer pair is named `Ləğv (əks yerdəyişmə) ID: <a>:<b>` and
 * matched by CONTAINMENT (either side of the pair), while an ordinary legacy
 * row is matched by the exact `Ləğv ID: <id>` string.
 *
 * The type gate applies only to a row that HAS a `doc_num`: there, a type that
 * is neither `Yerdəyişmə` nor in `CANCELLABLE_TYPES` yields null, because it has
 * no document-level cancellation route. A DOC-LESS row never reaches that gate —
 * legacy checks the per-id marker first (index.html:4902-4907) and the ordinary
 * branch matches `Ləğv ID: <id>` for ANY non-transfer type, supported or not. So
 * an unsupported doc-less row that carries a legacy marker still reports its
 * canceller, and that is deliberate parity, not an oversight.
 */
export function cancelledDocFor(
  m: CancelStateMovement | null | undefined,
  movements: CancelStateMovement[],
): string | null {
  if (!m) return null
  const own = doc(m)
  if (!own) {
    const rev =
      m.type === 'Yerdəyişmə'
        ? movements.find(
            (x) => LEGACY_TRANSFER_PREFIX.test(note(x)) && note(x).includes(String(m.id)),
          )
        : movements.find((x) => note(x) === 'Ləğv ID: ' + String(m.id))
    return rev ? doc(rev) || '—' : null
  }
  if (m.type === 'Yerdəyişmə') return docReversalDoc(own, movements)
  if ((CANCELLABLE_TYPES as readonly string[]).includes(m.type)) {
    return docCancelledBy(own, movements)
  }
  return null
}

/**
 * `rowReplacedOrCancelled` — index.html:4929-4932. A row-level cancellation
 * marker (`Ləğv ID: <id>`) hides ONE row; the document itself is untouched.
 *
 * The legacy comparison is against the TRIMMED note, so a marker stored with
 * surrounding whitespace still counts.
 */
export function rowReplacedOrCancelled(
  row: { id: string | number },
  movements: CancelStateMovement[],
): boolean {
  const marker = 'Ləğv ID: ' + String(row.id)
  return movements.some((x) => note(x).trim() === marker)
}

/**
 * `stripRowLevelCancelled` — index.html:4934-4941. Removes, from a document's
 * line list, both the row-level-cancelled originals and the technical marker
 * rows that cancelled them.
 *
 * The document itself is NOT cancelled by this: only one line was replaced.
 * Document-level cancellation (`Ləğv: <doc>`) is unaffected here.
 *
 * `movements` is the full loaded set — the markers may live outside the
 * document being displayed — while `rows` is the list being rendered. A
 * document whose every line is stripped is a REAL state (risk R6): the caller
 * must render an empty line list without claiming the document is cancelled.
 */
export function stripRowLevelCancelled<T extends { id: string | number; note?: string | null }>(
  rows: T[],
  movements: CancelStateMovement[],
): T[] {
  const hidden = new Set<string>()
  for (const m of movements) {
    const match = note(m).trim().match(LEGACY_ROW_MARKER)
    if (match) hidden.add(match[1].trim())
  }
  return rows.filter(
    (r) => !hidden.has(String(r.id)) && !/^Ləğv ID:/.test(String(r.note ?? '').trim()),
  )
}
