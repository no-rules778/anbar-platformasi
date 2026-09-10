/* Qaimə № reuse rule — index.html:3516-3567.

   Agreed with the user: the same Qaimə № may repeat ONLY when the date AND the
   counterparty also match — that is the second half of one delivery. A
   different date or a different counterparty means two SEPARATE documents
   sharing a number, which is blocked.

   Comparison runs against operational (non-cancelled, non-reversal) movements
   and, in edit mode, excludes the document being corrected. An empty Qaimə № is
   never checked. */

/** index.html:3526. */
export function normKey(s: unknown): string {
  return String(s == null ? '' : s).trim().toLowerCase()
}

/**
 * `bareWh(s)` — index.html:3531.
 *
 * A transfer's two legs store DIFFERENT counterparty text: the outbound row
 * says "B anbarına" and the inbound row "A anbarı" (post_transfer_document,
 * sql/007). Both are stripped to the bare warehouse name so the same route does
 * not look like two different counterparties.
 */
export function bareWh(s: unknown): string {
  return normKey(String(s ?? '').replace(/\s+anbar(ına|ı)?$/i, ''))
}

export interface QaimeMovement {
  /** invoice_num */
  iv: string | null
  /** date */
  d: string | null
  /** partner */
  p: string | null
  /** doc_num */
  doc: string | null
}

export interface QaimeConflict {
  iv: string
  doc: string
  date: string
  partner: string
}

/**
 * `qaimeConflict(iv, date, partner, selfDoc)` — index.html:3532-3560.
 *
 * Every row of a document is collected into date/partner SETS keyed by
 * `doc_num` — deliberately NOT "the first matching row". A transfer document is
 * two rows whose counterparties differ, and row order is not guaranteed, so
 * taking the first would block a legitimate continuation at random.
 *
 * A document is a continuation when ANY of its rows matches both the date and
 * the counterparty. Anything else is a conflict.
 */
export function qaimeConflict(
  iv: string | null | undefined,
  date: string | null | undefined,
  partner: string | null | undefined,
  operational: readonly QaimeMovement[],
  selfDoc?: string | null,
): QaimeConflict | null {
  const key = normKey(iv)
  if (!key) return null
  const d = normKey(date)
  const p = bareWh(partner)

  const seen = new Map<string, { doc: string; dates: Set<string>; partners: Set<string> }>()
  for (const m of operational) {
    if (normKey(m.iv) !== key) continue
    const doc = m.doc ?? ''
    if (selfDoc && doc === selfDoc) continue
    let rec = seen.get(doc)
    if (!rec) {
      rec = { doc, dates: new Set(), partners: new Set() }
      seen.set(doc, rec)
    }
    rec.dates.add(normKey(m.d))
    rec.partners.add(bareWh(m.p))
  }

  for (const rec of seen.values()) {
    if (!rec.dates.has(d) || !rec.partners.has(p)) {
      return {
        iv: String(iv ?? ''),
        doc: rec.doc,
        date: Array.from(rec.dates).join(', '),
        partner: Array.from(rec.partners).join(', '),
      }
    }
  }
  return null
}

export interface QaimeLine {
  kind: string
  iv: string | null
  d: string | null
  p: string | null
  w2?: string | null
}

/**
 * `documentQaimeConflict(lines, selfDoc)` — index.html:3562-3567.
 *
 * Each line carries its own `iv`, so each is checked separately. On a transfer
 * the counterparty for this comparison is the DESTINATION warehouse.
 */
export function documentQaimeConflict(
  lines: readonly QaimeLine[],
  operational: readonly QaimeMovement[],
  selfDoc?: string | null,
): QaimeConflict | null {
  for (const l of lines) {
    const partner = l.kind === 'mv' ? (l.w2 ?? '') : l.p
    const c = qaimeConflict(l.iv, l.d, partner, operational, selfDoc)
    if (c) return c
  }
  return null
}
