/* Draft lines → RPC payloads — index.html:4750-4756, 4784-4798, 4823-4834.

   Field names here are the SERVER's, read from the live function bodies in
   production-functions-2026-09-03.json — `warehouse`/`code`/`in_qty`/`out_qty`
   for movements, `source`/`dest`/`qty` for transfers. They are not the draft
   line's own field names and must not be "tidied" to match them. */

import { condSplitPayload, type CondKey, type CondSplit } from './condSplit'

export interface DraftOpLine {
  kind: string
  d: string
  t: string
  w: string
  w2?: string | null
  c: string
  q: number
  pr?: number | null
  p?: string | null
  ch?: string | null
  ct?: string | null
  iv?: string | null
  note?: string | null
  cond?: Partial<CondSplit> | null
  layerRevision?: string | null
  allocations?: { layer_id: string; qty: number }[] | null
  finalAmount?: string | number | null
  overrideReason?: string | null
}

export interface MovementPayloadLine {
  date: string
  warehouse: string
  code: string
  type: string
  in_qty: number
  out_qty: number
  partner: string
  channel: string
  contract: string
  invoice: string
  price: number
  note: string
  conditions: Partial<Record<CondKey, number>> | null
  revision: string
  allocations: { layer_id: string; qty: number }[] | null
  final_amount: string | null
  override_reason: string
}

export interface TransferPayloadLine {
  date: string
  source: string
  dest: string
  code: string
  qty: number
  note: string
  channel: string
  contract: string
  invoice: string
  conditions: Partial<Record<CondKey, number>> | null
  revision: string
  allocations: { layer_id: string; qty: number }[] | null
}

export interface CorrectionPayloadLine {
  date: string
  warehouse: string
  code: string
  type: string
  in_qty: number
  out_qty: number
  partner: string
  channel: string
  contract: string
  invoice: string
  price: number
  note: string
}

const str = (v: unknown): string => String(v ?? '')
const numOr0 = (v: unknown): number => {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

/**
 * Non-transfer payload — index.html:4823-4834.
 *
 * `conditions` is emitted ONLY for a non-inbound line: the server refuses a
 * split on an inbound row outright («mədaxil sətrində tiplərə görə bölgü ola
 * bilməz»). `final_amount` is null when blank — an empty string would fail the
 * server's numeric pattern.
 */
export function toMovementPayload(l: DraftOpLine): MovementPayloadLine {
  const isIn = l.kind === 'in'
  return {
    date: l.d,
    warehouse: l.w,
    code: l.c,
    type: l.t,
    in_qty: isIn ? l.q : 0,
    out_qty: isIn ? 0 : l.q,
    partner: str(l.p),
    channel: str(l.ch),
    contract: str(l.ct),
    invoice: str(l.iv),
    price: numOr0(l.pr),
    note: str(l.note),
    conditions: !isIn && l.cond ? condSplitPayload(l.cond) : null,
    revision: str(l.layerRevision),
    allocations: l.allocations ?? null,
    final_amount:
      l.finalAmount === '' || l.finalAmount == null ? null : String(l.finalAmount),
    override_reason: str(l.overrideReason),
  }
}

/**
 * Transfer payload — index.html:4784-4798.
 *
 * No `price`: `post_transfer_document` accepts none, and both legs are written
 * by the server with price 0. The split moves WITH the goods — the same buckets
 * appear at the destination (sql/031).
 */
export function toTransferPayload(l: DraftOpLine): TransferPayloadLine {
  return {
    date: l.d,
    source: l.w,
    dest: str(l.w2),
    code: l.c,
    qty: l.q,
    note: str(l.note),
    channel: str(l.ch),
    contract: str(l.ct),
    invoice: str(l.iv),
    conditions: l.cond ? condSplitPayload(l.cond) : null,
    revision: str(l.layerRevision),
    allocations: l.allocations ?? null,
  }
}

/**
 * Correction payload — index.html:4750-4756.
 *
 * Deliberately NARROWER than the movement payload: `correct_document` re-posts
 * through `post_movement_document` and carries no layer or split fields. It
 * appends the «Əvəz edir: <doc>» marker to each note ITSELF, so the client must
 * not add one.
 */
export function toCorrectionPayload(l: DraftOpLine): CorrectionPayloadLine {
  const isIn = l.kind === 'in'
  return {
    date: l.d,
    warehouse: l.w,
    code: l.c,
    type: l.t,
    in_qty: isIn ? l.q : 0,
    out_qty: isIn ? 0 : l.q,
    partner: str(l.p),
    channel: str(l.ch),
    contract: str(l.ct),
    invoice: str(l.iv),
    price: numOr0(l.pr),
    note: str(l.note),
  }
}

/** index.html:4776. Transfer lines and everything else are posted separately. */
export function splitByRoute<T extends { kind: string }>(lines: readonly T[]): {
  mvLines: T[]
  other: T[]
} {
  return {
    mvLines: lines.filter((l) => l.kind === 'mv'),
    other: lines.filter((l) => l.kind !== 'mv'),
  }
}
