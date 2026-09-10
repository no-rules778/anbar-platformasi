/* İcarə exposure — index.html:3481-3512, 4674-4682.

   Balance 10 of which 5 are rented → 5 are free (ours). Writing off 6 takes
   1 unit out of SOMEBODY ELSE'S goods. That is not forbidden — an anbardar may
   genuinely have to move rented stock — but it requires confirmation and a
   written reason. The server performs the same calculation and records the
   fact in the audit log (sql/031), so skipping the dialog leaves a trace. */

import type { CondRecord } from './condSplit'

/** index.html:3484. The marker appended to an exposed line's note. */
export const ICARE_USE_MARK = (reason: string): string =>
  'İcarədə olan maldan: ' + reason

/** index.html:3486-3487. Strips a previous marker, whether it stands alone or
    after a ' · ' separator — so confirming twice cannot stack two markers. */
export const ICARE_USE_RE = /\s*·?\s*İcarədə olan maldan:[^·]*$/

export interface ExposureLine {
  kind: string
  t: string
  w: string
  c: string
  q: number
  name?: string
  unit?: string
  note?: string | null
}

export interface ExposureHit<T extends ExposureLine = ExposureLine> {
  line: T
  w: string
  exp: number
}

const num = (v: unknown): number => {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

/** index.html:3488. The rented quantity standing on this warehouse+item. */
export function icareQtyOf(cond: CondRecord | null | undefined): number {
  return cond ? num(cond.icare) : 0
}

/**
 * `icareExposure(w, c, qty, alreadyTaken)` — index.html:3489-3497.
 *
 * How much of `qty` comes out of the rented part; 0 means all of it is free
 * stock. `alreadyTaken` lets several lines on the same warehouse+item consume
 * the free stock cumulatively rather than each seeing the full amount.
 */
export function icareExposure(
  cond: CondRecord | null | undefined,
  balance: number,
  qty: number,
  alreadyTaken = 0,
): number {
  const ic = icareQtyOf(cond)
  if (!(ic > 0) || !(qty > 0)) return 0
  const free = Math.max(num(balance) - ic - num(alreadyTaken), 0)
  return Math.max(Math.round((qty - free) * 100) / 100, 0)
}

/**
 * `icareExposedLines(lines)` — index.html:3499-3512.
 *
 * Inbound lines and «Qaytarma» are skipped: handing rented goods back to their
 * owner is precisely what the İcarədə figure exists for, not an exception to
 * it. On a transfer the stock leaves the SOURCE warehouse (`l.w`), never the
 * destination.
 */
export function icareExposedLines<T extends ExposureLine>(
  lines: readonly T[],
  lookup: (w: string, c: string) => { cond: CondRecord | null; balance: number },
): ExposureHit<T>[] {
  const taken = new Map<string, number>()
  const out: ExposureHit<T>[] = []
  for (const l of lines) {
    if (l.kind === 'in' || l.t === 'Qaytarma') continue
    const w = l.w
    const k = `${w}|${l.c}`
    const { cond, balance } = lookup(w, l.c)
    const exp = icareExposure(cond, balance, l.q, taken.get(k) ?? 0)
    taken.set(k, (taken.get(k) ?? 0) + l.q)
    if (exp > 0) out.push({ line: l, w, exp })
  }
  return out
}

/**
 * Appends the reason marker to a note, stripping any previous one first
 * (index.html:4676-4681).
 *
 * The strip is not tidiness: the user can confirm the İcarə dialog and then
 * cancel the «qeyd edilsin?» dialog, leaving the note already marked. A second
 * attempt would otherwise append a duplicate marker.
 */
export function applyIcareMark(note: string | null | undefined, reason: string): string {
  const cur = String(note ?? '').replace(ICARE_USE_RE, '').trim()
  const mark = ICARE_USE_MARK(reason)
  return cur ? `${cur} · ${mark}` : mark
}
