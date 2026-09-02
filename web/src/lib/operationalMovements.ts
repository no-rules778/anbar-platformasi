/* Cancellation model of the production platform, ported 1:1 from
   index.html operationalMovements() (lines 1249-1269).

   There is no boolean "cancelled" column in `movements`. A cancellation is
   encoded in the row's `note` text, in three historical shapes:
     1. "Ləğv: <doc>"                      — document-level reversal
        "Ləğv (əks yerdəyişmə): <doc>"     — transfer counter-entry
        Both hide the referenced document AND the reversing row's own document.
     2. "Ləğv ID: <id>"                    — legacy single-row cancellation
     3. "Ləğv (əks yerdəyişmə) ID: <a>:<b>" — legacy transfer pair
   A row is operational when it is neither hidden by a cancelled document,
   nor named by a legacy id, nor itself a "Ləğv…" marker row. */

export interface CancellableMovementRow {
  id: string | number
  note: string | null
  doc_num: string | null
}

const DOC_CANCEL = /^Ləğv(?: \(əks yerdəyişmə\))?:\s*(.+)$/
const LEGACY_ONE = /^Ləğv ID:\s*(.+)$/
const LEGACY_PAIR = /^Ləğv \(əks yerdəyişmə\) ID:\s*([^:]+):([^:]+)$/
const ANY_CANCEL_MARKER = /^Ləğv(?: ID:|:| \(əks yerdəyişmə\))/

/** Mirrors operationalMovements(): drops cancelled rows and the rows that cancel them. */
export function excludeCancelled<T extends CancellableMovementRow>(rows: T[]): T[] {
  const hiddenDocs = new Set<string>()
  const hiddenLegacyIds = new Set<string>()

  for (const row of rows) {
    const note = String(row.note ?? '').trim()
    const doc = String(row.doc_num ?? '')

    const docMatch = note.match(DOC_CANCEL)
    if (docMatch && doc) {
      hiddenDocs.add(doc)
      hiddenDocs.add(docMatch[1].trim())
    }
    const legacyOne = note.match(LEGACY_ONE)
    if (legacyOne) hiddenLegacyIds.add(legacyOne[1].trim())
    const legacyPair = note.match(LEGACY_PAIR)
    if (legacyPair) {
      hiddenLegacyIds.add(legacyPair[1].trim())
      hiddenLegacyIds.add(legacyPair[2].trim())
    }
  }

  return rows.filter((row) => {
    const note = String(row.note ?? '').trim()
    const doc = String(row.doc_num ?? '')
    if (doc && hiddenDocs.has(doc)) return false
    if (hiddenLegacyIds.has(String(row.id))) return false
    return !ANY_CANCEL_MARKER.test(note)
  })
}
