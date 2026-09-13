/* Azpetrol / Araz — the shared row filter and the totals rules
   (M17-41 … M17-48).

   Ported from index.html:8337-8431.

   ONE filter backs four surfaces — the module register, the card history, the
   Hesabat screen and the report export — precisely so they can never disagree
   with each other. Any new surface must call this rather than re-deriving. */

import { azpInRange, azpDayKey } from './azpDate'
import { azpN, azpR2 } from './azpNum'
import type { AzpModule } from './azpLabels'

/** A movement row, narrowed to the fields the filter and totals read. */
export interface AzpMovement {
  id?: number | string
  module?: string | null
  card_id?: string | null
  kind?: string | null
  amount?: number | string | null
  op_date?: string | null
  doc_num?: string | null
  note?: string | null
  cancelled?: boolean | null
}

/** A card row, used only for the text search and for display joins. */
export interface AzpCard {
  card_id?: string | null
  card_no?: string | null
  holder?: string | null
}

export interface AzpFilter {
  /** Single-card selection, from the register's dropdown. */
  card?: string
  /** Multi-card selection, from the report. Takes precedence over `card`. */
  cards?: readonly string[]
  kind?: string
  d1?: string
  d2?: string
  q?: string
}

/**
 * `azpFilterRows(m, movs, f, cards)` — index.html:8390-8407.
 *
 * Predicate order is load-bearing and preserved exactly:
 *
 *   1. MODULE FIRST — a row whose `module` disagrees is dropped before any
 *      other test, so cross-board leakage cannot survive a later predicate.
 *      A row with no `module` at all is NOT dropped (the original tests
 *      `r.module && r.module !== m`).
 *   2. card selection — `f.cards` when non-empty, otherwise `f.card`.
 *   3. kind.
 *   4. date range, through the shared inclusive `azpInRange`.
 *   5. free text, matched case-insensitively against doc_num, note, and the
 *      joined card's card_no and holder.
 *
 * The text haystack joins with a space and tolerates a missing card, so a row
 * whose card is absent from the map still matches on its own fields.
 */
export function azpFilterRows(
  m: AzpModule,
  movs: readonly AzpMovement[],
  f: AzpFilter,
  cards?: readonly AzpCard[],
): AzpMovement[] {
  const byCard = new Map((cards || []).map((c) => [c.card_id, c]))
  const q = (f.q || '').trim().toLowerCase()
  const cardSet = f.cards && f.cards.length ? new Set(f.cards) : null
  return movs.filter((r) => {
    if (r.module && r.module !== m) return false
    if (cardSet) {
      if (!cardSet.has(r.card_id as string)) return false
    } else if (f.card && r.card_id !== f.card) return false
    if (f.kind && r.kind !== f.kind) return false
    if (!azpInRange(r.op_date, f.d1, f.d2)) return false
    if (q) {
      const c = byCard.get(r.card_id)
      const hay = [r.doc_num, r.note, c && c.card_no, c && c.holder].join(' ').toLowerCase()
      if (hay.indexOf(q) < 0) return false
    }
    return true
  })
}

export interface AzpTotals {
  medaxil: number
  mexaric: number
  net: number
  /** How many of the supplied rows are NOT cancelled. */
  live: number
  /** How many ARE cancelled — shown to the user, excluded from every sum. */
  cancelled: number
}

/**
 * `azpTotals(rows)` — index.html:8425-8431.
 *
 * Cancelled rows are excluded from medaxil, mexaric and net EVERYWHERE in this
 * module — screen, history, report and export alike — but they are still
 * counted and displayed, so a user can see that they exist.
 *
 * Each side is rounded once with `azpR2`, and `net` is rounded again from the
 * two rounded halves, exactly as the original does.
 */
export function azpTotals(rows: readonly AzpMovement[]): AzpTotals {
  const live = rows.filter((r) => !r.cancelled)
  const i = azpR2(
    live.filter((r) => r.kind === 'medaxil').reduce((s, r) => s + azpN(r.amount), 0),
  )
  const o = azpR2(
    live.filter((r) => r.kind === 'mexaric').reduce((s, r) => s + azpN(r.amount), 0),
  )
  return {
    medaxil: i,
    mexaric: o,
    net: azpR2(i - o),
    live: live.length,
    cancelled: rows.length - live.length,
  }
}

/**
 * `azpOpeningBalance(m, movs, cardId, d1)` — index.html:8412-8423.
 *
 * The signed balance carried into a period: every non-cancelled row of this
 * module, for this card, strictly BEFORE the start date — `medaxil` adds,
 * anything else subtracts.
 *
 * With no start date the opening balance is 0 by definition, because "all
 * time" has no before. Undated rows never contribute: they cannot be placed
 * relative to the boundary. `cardId` is optional; omitting it opens across
 * every card of the module.
 */
export function azpOpeningBalance(
  m: AzpModule,
  movs: readonly AzpMovement[],
  cardId: string | null | undefined,
  d1: unknown,
): number {
  const a = azpDayKey(d1)
  if (!a) return 0
  return azpR2(
    movs.reduce((s, r) => {
      if (r.cancelled) return s
      if (r.module && r.module !== m) return s
      if (cardId && r.card_id !== cardId) return s
      const d = azpDayKey(r.op_date)
      if (!d || d >= a) return s
      return s + (r.kind === 'medaxil' ? azpN(r.amount) : -azpN(r.amount))
    }, 0),
  )
}
