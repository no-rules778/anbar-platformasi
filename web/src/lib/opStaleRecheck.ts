/* The confirm-time stale-response re-check — M7-96, index.html:4700-4738.

   WHY THIS IS A SEPARATE PURE MODULE

   The legacy check lives inline in `postOpDocument()`, mutates `OP.lines` in
   place, and interleaves three different decisions (drop / trim / abort) with
   toasting and re-rendering. Written that way in React it would be untestable
   without a page render, and the ONE behaviour that matters most — that a
   LAYERED line is never silently trimmed — would sit inside an if-branch of a
   500-line handler. So the decision is a pure function here; the store applies
   its verdict and does the toasting.

   The rules, ported exactly:

   · An `in` line is never re-checked — it ADDS stock, so no availability
     applies to it.
   · Availability is computed ONCE per warehouse+code key, as
     `balance(w,c) + editRestore(w,c)`, and then DECREMENTED as each surviving
     line consumes it. Two lines on the same key therefore compete for the
     same stock, exactly as they do on the server.
   · The edit restore is added ONCE PER KEY, never per line (4718-4721). The
     original document's outbound quantity comes back once when the server
     cancels it; adding it per line would invent stock that does not exist and
     let an over-quantity document through.
   · A LAYERED line (one carrying `allocations`) is NEVER trimmed. Its
     allocations describe specific source layers summing to its quantity, so a
     trimmed quantity would post allocations that no longer match. The whole
     post aborts and the draft is preserved — the user re-picks the layers.
   · A non-layered line with no availability is DROPPED; one exceeding
     availability is TRIMMED to the maximum. Both are reported together in one
     message (4732-4735), not one toast per line.
   · If nothing survives, the post is refused with «Yazılacaq etibarlı sətir
     yoxdur.» */

import { nf } from './format'

export interface StaleLine {
  kind: string
  w: string
  c: string
  q: number
  name?: string
  allocations?: unknown[] | null
}

export type StaleVerdict<L extends StaleLine> =
  /** A layered line no longer fits — the whole document is refused. */
  | { outcome: 'abort'; message: string }
  /** Nothing survived the drop/trim pass. */
  | { outcome: 'empty'; message: string }
  /** Post these lines. `changed` is true when any line was dropped or trimmed. */
  | { outcome: 'ok'; lines: L[]; changed: boolean; message: string | null }

export const NOTHING_TO_POST_MSG = 'Yazılacaq etibarlı sətir yoxdur.'

/** index.html:4726 — the layered abort keeps the draft, and says so. */
export function layerStaleMessage(name: string, w: string): string {
  return `${name} (${w}): qalıq dəyişib — partiyalar yenidən seçilməlidir. Qaralama saxlanıldı.`
}

function isLayered(l: StaleLine): boolean {
  return Array.isArray(l.allocations) && l.allocations.length > 0
}

/**
 * Recomputes availability immediately before writing and decides what to post.
 *
 * `availabilityOf(w, c)` must return the CURRENT balance for the key WITHOUT
 * the edit restore; `editRestoreOf(w, c)` supplies the restore separately so
 * this function can guarantee it is added exactly once per key.
 *
 * Nothing is mutated: a trimmed line is returned as a COPY with the reduced
 * quantity, so a refused document leaves the caller's draft byte-identical.
 */
export function staleRecheck<L extends StaleLine>(
  lines: readonly L[],
  availabilityOf: (w: string, c: string) => number,
  editRestoreOf: (w: string, c: string) => number,
): StaleVerdict<L> {
  const remain = new Map<string, number>()
  const kept: L[] = []
  const msgs: string[] = []
  let changed = false

  for (const l of lines) {
    if (l.kind === 'in') { kept.push(l); continue }

    const k = `${l.w}|${l.c}`
    if (!remain.has(k)) {
      /* ONCE per key — see the header note on the edit restore. */
      remain.set(k, availabilityOf(l.w, l.c) + editRestoreOf(l.w, l.c))
    }
    const avail = remain.get(k) as number
    const label = l.name ?? l.c

    if (isLayered(l)) {
      /* Never trimmed: the allocations would stop matching the quantity. */
      if (avail <= 0 || l.q > avail + 1e-9) {
        return { outcome: 'abort', message: layerStaleMessage(label, l.w) }
      }
      remain.set(k, avail - l.q)
      kept.push(l)
      continue
    }

    if (avail <= 0) {
      msgs.push(`${label} (${l.w}): qalıq dəyişib, mövcud deyil — sətir çıxarıldı`)
      changed = true
      continue
    }
    if (l.q > avail) {
      msgs.push(`${label} (${l.w}): qalıq dəyişib, miqdar ${nf(l.q, 2)} → ${nf(avail, 2)} endirildi`)
      changed = true
      remain.set(k, 0)
      kept.push({ ...l, q: avail })
      continue
    }
    remain.set(k, avail - l.q)
    kept.push(l)
  }

  if (!kept.length) return { outcome: 'empty', message: NOTHING_TO_POST_MSG }
  /* One combined report, never one per line — index.html:4735. */
  return { outcome: 'ok', lines: kept, changed, message: msgs.length ? msgs.join(' · ') : null }
}
