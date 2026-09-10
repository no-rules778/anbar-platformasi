import type { EditImpactBlock, EditImpactLine, EditImpactResult } from '../api/documentEditImpact.api'

/* THE CORRECTION / EDIT FLOW — Phase 8, milestone I-6 (`M8-33` … `M8-39`),
   closing `M7-109`'s deferred caller. Ported from index.html:5124-5205.

   This module is PURE. It decides three things and performs none of them:

     1. whether the «Sənədi redaktə et» entry may be offered at all (the gate),
     2. whether an impact response is STRUCTURALLY USABLE (the contract), and
     3. how a usable response becomes draft lines and a header (the mapping).

   ONE GATE, TWO CALL SITES — the I-4 `documentCancelGate` discipline. The
   rendered button and the click handler call the SAME function, and the
   handler calls it AGAIN after the impact response arrives, because every
   input to it (role, document state, layer readiness, the edit session) can
   change across an await.

   WHY THE CONTRACT IS VALIDATED HERE AND NOT TRUSTED FROM THE API.
   `fetchDocumentEditImpact` coerces `blocks` and `lines` with `Array.isArray`
   and then CASTS the elements — `Array.isArray(d.lines) ? (d.lines as
   EditImpactLine[]) : []`. The cast is a compile-time assertion with no
   runtime check, so an array of nulls, of numbers, or of objects with a
   missing `code` or a NaN quantity passes through with the declared type and
   is wrong only at the moment it is read. Feeding that to the mapper would
   replace the user's draft with garbage lines — a destructive act driven by
   an unvalidated payload. So a response is validated as a WHOLE before it is
   allowed to render or to touch a draft, and a malformed one is an ERROR:
   no navigation, no state change, nothing discarded.

   The validator is deliberately STRICTER than the renderer needs, because the
   cost of the two failures is asymmetric: refusing a usable document wastes a
   click, while accepting an unusable one destroys work in progress. */

/* ---------------------------------------------------------------------------
   1. THE ENTRY GATE
   ------------------------------------------------------------------------ */

export type EditRefusalCode =
  | 'not-admin'
  | 'no-doc-num'
  | 'layer-active'
  | 'layer-unknown'
  | 'not-editable-view'
  | 'other-doc-in-edit'

export interface EditGateInput {
  /** Whether the CURRENT session is an admin. Re-read, never captured. */
  isAdmin: boolean
  /** The document number, or '' for a doc-less legacy record. */
  docNum: string
  /** True only for an ordinary document view — never a transfer or doc-less. */
  isOrdinaryDoc: boolean
  /** Already cancelled by a reversal, or itself a reversal. */
  isCancelledOrReversal: boolean
  /** Live `stock_layers_supported()`. Meaningful only when `layerReady`. */
  layerActive: boolean
  /** Whether the capability probe ANSWERED. False = unknown = refuse. */
  layerReady: boolean
  /** The document already in edit mode, if any. */
  editDocNum: string | null
}

export type EditGate =
  | { allowed: true }
  | { allowed: false; code: EditRefusalCode; message: string }

/* Legacy messages, verbatim (index.html:5130-5140). `layer-unknown` has no
   legacy counterpart: the legacy screen reads `DB.layerActive` as a plain
   boolean with no notion of "not yet answered", while the React screen knows
   the probe may not have replied. Refusing there is a documented deviation in
   the SAFE direction — the I-4 `canWriteCancellation` rule, applied to the
   one control that can rewrite a posted document. */
const REFUSALS: Record<EditRefusalCode, string> = {
  'not-admin': 'Sənədi yalnız Rəhbər (Admin) redaktə edə bilər',
  'no-doc-num': 'Bu qeydin etibarlı sənəd nömrəsi yoxdur',
  'layer-active':
    'Partiya uçotu aktivdir — keçirilmiş sənəd birbaşa redaktə edilmir. '
    + 'Sənədi ləğv edin və düzgün partiyalarla yenisini yaradın.',
  'layer-unknown':
    'Partiya uçotunun vəziyyəti müəyyən edilmədi — sənəd redaktəsi dayandırıldı. '
    + 'Səhifəni yeniləyin və yenidən cəhd edin.',
  'not-editable-view': 'Bu sənəd bu yolla redaktə edilmir',
  'other-doc-in-edit': 'Artıq başqa sənəd düzəliş rejimindədir: ',
}

/**
 * The single gate. Called to decide whether to RENDER the button, again in the
 * handler before the RPC, again after the response, and again at confirmation.
 *
 * `other-doc-in-edit` names the blocking document, exactly as legacy 5139
 * does. Re-entering the SAME document is permitted, as legacy permits it.
 */
export function canEditDocument(input: EditGateInput): EditGate {
  const refuse = (code: EditRefusalCode, suffix = ''): EditGate =>
    ({ allowed: false, code, message: REFUSALS[code] + suffix })

  if (!input.isAdmin) return refuse('not-admin')
  if (!input.isOrdinaryDoc) return refuse('not-editable-view')
  if (!input.docNum) return refuse('no-doc-num')
  if (input.isCancelledOrReversal) return refuse('not-editable-view')
  /* FAIL CLOSED before FAIL SAFE: an unknown capability is refused before the
     `layerActive` branch, because `layerActive` is meaningless until the probe
     answers and reading it as `false` would silently permit the edit. */
  if (!input.layerReady) return refuse('layer-unknown')
  if (input.layerActive) return refuse('layer-active')
  if (input.editDocNum && input.editDocNum !== input.docNum) {
    return refuse('other-doc-in-edit', input.editDocNum)
  }
  return { allowed: true }
}

/* ---------------------------------------------------------------------------
   2. THE IMPACT CONTRACT
   ------------------------------------------------------------------------ */

export const IMPACT_MALFORMED =
  'Təsir yoxlamasının cavabı oxunmadı — sənəd redaktəyə yüklənmədi. '
  + 'Formadakı sətirlərə toxunulmadı.'

/** Legacy 5182 — an editable document with no lines is refused, not loaded. */
export const IMPACT_NO_LINES = 'Sənəddə redaktə ediləcək sətir yoxdur'

/** Legacy 5147 prefix, kept verbatim so a server refusal reads unchanged. */
export const IMPACT_FAILED_PREFIX = 'Təsir yoxlaması alınmadı: '

/** The only two directions `document_edit_impact` may report for an editable
    document. `mv` is not among them: a transfer is BLOCKED by the server
    (`transfer_document`), and a correction never carries `mv` lines — the
    store's edit branch refuses them outright. */
const DIRECTIONS = new Set(['in', 'out'])

export type ImpactContract =
  /** Structurally sound AND editable — safe to map. */
  | { kind: 'editable'; direction: 'in' | 'out'; type: string; lines: EditImpactLine[]; exportWarning: string }
  /** Structurally sound and explicitly NOT editable — render the blocks. */
  | { kind: 'blocked'; blocks: EditImpactBlock[] }
  /** Unusable. Never rendered as a block list, never mapped. */
  | { kind: 'malformed'; message: string }

const isPlainObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v)

/** A finite, non-negative number. Rejects NaN, Infinity and negatives — a
    negative quantity would invert the direction of a posted line. */
const isUsableQty = (v: unknown): v is number =>
  typeof v === 'number' && Number.isFinite(v) && v >= 0

/** A string field that may legitimately be empty (partner, note, …). */
const isStr = (v: unknown): v is string => typeof v === 'string'

/**
 * Validates ONE line. Every field the mapper reads is checked, because the API
 * layer casts rather than validates.
 *
 * The quantity rule mirrors legacy 5183: the line's quantity is `in_qty` when
 * positive, otherwise `out_qty`. So BOTH must be usable numbers and at least
 * one must be positive — a line of 0/0 cannot be posted and would silently
 * become a zero-quantity draft row.
 *
 * EXACTLY ONE SIDE MAY BE POSITIVE. A movement row is inbound or outbound, not
 * both: `toCorrectionPayload` writes one side from `kind` and hard-zeroes the
 * other, so a line carrying both quantities cannot round-trip. Under the
 * legacy rule the `out_qty` of such a line is silently DISCARDED (`in_qty > 0`
 * wins), which turns a contradictory server row into a plausible-looking draft
 * line of the wrong amount. Rejected instead — an incoherent row is not a row
 * whose meaning may be guessed.
 *
 * The `direction` agreement is checked one level up, in `readImpactContract`,
 * because it is a property of the line AND the document together.
 */
export function isValidImpactLine(v: unknown): v is EditImpactLine {
  if (!isPlainObject(v)) return false
  if (!isStr(v.date) || !v.date) return false
  if (!isStr(v.warehouse) || !v.warehouse) return false
  if (!isStr(v.code) || !v.code) return false
  if (!isStr(v.type)) return false
  if (!isUsableQty(v.in_qty) || !isUsableQty(v.out_qty)) return false
  if (v.in_qty === 0 && v.out_qty === 0) return false
  if (v.in_qty > 0 && v.out_qty > 0) return false
  if (!isUsableQty(v.price)) return false
  /* The optional text fields are permitted to be ABSENT — the server always
     sends them, but a missing one maps cleanly to ''. A present value of the
     wrong TYPE is malformed: it would reach the payload as `[object Object]`. */
  for (const k of ['partner', 'channel', 'contract', 'invoice', 'note'] as const) {
    if (v[k] !== undefined && v[k] !== null && !isStr(v[k])) return false
  }
  return true
}

/** A block must be renderable: an object with at least one usable label. */
export function isValidImpactBlock(v: unknown): v is EditImpactBlock {
  if (!isPlainObject(v)) return false
  const hasMessage = isStr(v.message) && v.message.length > 0
  const hasCode = isStr(v.code) && v.code.length > 0
  return hasMessage || hasCode
}

/**
 * Validate a whole impact response before ANY use.
 *
 * A response that fails here produces `malformed` — which the caller renders
 * as an error and nothing else: no navigation, no draft mutation, no block
 * table (a block table built from unvalidated entries is itself a lie about
 * why the document was refused).
 */
export function readImpactContract(res: EditImpactResult): ImpactContract {
  if (!res.editable) {
    /* A refusal must still be INTELLIGIBLE. Blocks are the entire content of
       the not-editable modal; if none of them is renderable the user would see
       an empty table and no reason, so that is malformed rather than blocked. */
    const blocks = res.blocks.filter(isValidImpactBlock)
    if (blocks.length === 0) return { kind: 'malformed', message: IMPACT_MALFORMED }
    return { kind: 'blocked', blocks }
  }

  if (!DIRECTIONS.has(res.direction)) {
    return { kind: 'malformed', message: IMPACT_MALFORMED }
  }
  /* PARTIAL VALIDITY IS NOT ACCEPTABLE for lines. Dropping the bad ones would
     post a document MISSING rows the original had — a silent data loss with a
     plausible-looking result. All or nothing. */
  if (res.lines.length > 0 && !res.lines.every(isValidImpactLine)) {
    return { kind: 'malformed', message: IMPACT_MALFORMED }
  }
  /* EVERY LINE MUST AGREE WITH THE DOCUMENT'S DIRECTION.

     `mapImpact` stamps `kind` from `contract.direction` — ONE value for the
     whole document — while it takes each line's quantity from that line. So a
     line whose own quantity contradicts the document direction is mapped into
     the WRONG direction: an `out_qty` row inside an `in` document becomes an
     inbound draft line of that quantity, reversing the sign of a posted
     movement. The restore map compounds it, since it accumulates `out_qty`
     only for `out` documents — so the same contradiction either inflates
     availability or omits a restore that was due.

     `document_edit_impact` never mixes directions (mixed direction is one of
     the blocks it reports), so a response that does is not a document this
     client can map. Refused as malformed: no navigation, no draft replaced. */
  const contradicts = res.lines.some((l) =>
    res.direction === 'in' ? l.out_qty > 0 : l.in_qty > 0,
  )
  if (contradicts) {
    return { kind: 'malformed', message: IMPACT_MALFORMED }
  }
  if (res.lines.length === 0) {
    return { kind: 'malformed', message: IMPACT_NO_LINES }
  }
  return {
    kind: 'editable',
    direction: res.direction as 'in' | 'out',
    type: res.type,
    lines: res.lines,
    exportWarning: res.exportWarning,
  }
}

/* ---------------------------------------------------------------------------
   3. THE MAPPING
   ------------------------------------------------------------------------ */

/* index.html:5128 — the marker the SERVER appends to a corrected line's note
   («· Əvəz edir: <doc>»). It is stripped on the way IN so a document corrected
   twice does not accumulate markers; `correct_document` appends it again on
   the way out, so the client must never send one. */
export const EDIT_REPLACES_MARKER = /\s*·?\s*Əvəz edir:\s*[^·]+$/

/** Legacy's fallback when the server sends no `export_warning` (5171). */
export const EXPORT_WARNING_FALLBACK =
  'Excel ixracı sistemdə qeyd edilmir — bu sənəd artıq ixrac edilibsə, düzəliş etməyin.'

/* Structurally a `DraftOpLineState`: the index signature comes from
   `DraftLine`, which the store's line type extends. Declared here rather than
   importing the store type so this module stays pure and dependency-free —
   the assignability is checked by the store's own call site. */
export interface MappedLine {
  [k: string]: unknown
  kind: 'in' | 'out'
  d: string
  t: string
  w: string
  w2: string
  c: string
  name: string
  unit: string
  q: number
  pr: number
  p: string
  ch: string
  ct: string
  iv: string
  note: string
}

/** A COMPLETE header — every field, never a partial patch. See `mapImpact`. */
export interface MappedHeader {
  d: string
  t: string
  w: string
  w2: string
  p: string
  ch: string
  ct: string
  iv: string
  note: string
  pr: string
}

export interface MappedEdit {
  kind: 'in' | 'out'
  lines: MappedLine[]
  header: MappedHeader
  /** `w|c` → outbound quantity, for the validator's availability arithmetic. */
  restore: Map<string, number>
}

const s = (v: unknown): string => (typeof v === 'string' ? v : '')

/**
 * Map a VALIDATED editable contract into draft lines, a header and the restore
 * map — index.html:5178-5199, preserved field for field.
 *
 * THE RESTORE MAP IS OUTBOUND-ONLY (5185-5188). Correcting an outbound
 * document must let the admin re-post the same quantity the original consumed,
 * so that quantity is added back to availability during validation. An inbound
 * document consumed nothing, so it restores nothing; building a restore map
 * for it would inflate availability by the received quantity and let the
 * corrected document overdraw stock. Quantities for the same `w|c` ACCUMULATE
 * across lines, as legacy accumulates them.
 *
 * THE HEADER IS COMPLETE, NOT A PATCH. Legacy assigns a whole `OP.hdr` object
 * (5195-5196), clearing every field it does not seed. The store's
 * `enterEditMode` merges (`{...s.header, ...header}`), so any field omitted
 * here would SURVIVE from whatever the user had typed before — a previous
 * draft's Qaimə № or note leaking into a corrected document and reaching
 * `correct_document` as if it belonged to it. Every field is therefore set
 * explicitly, including the ones legacy sets to '' (`w2`, `note`, and `pr`,
 * which legacy's header object omits entirely and so leaves undefined).
 */
export function mapImpact(
  contract: Extract<ImpactContract, { kind: 'editable' }>,
  itemBy: Map<string, { name?: string | null; unit?: string | null }>,
): MappedEdit {
  const kind: 'in' | 'out' = contract.direction === 'in' ? 'in' : 'out'
  const restore = new Map<string, number>()

  const lines: MappedLine[] = contract.lines.map((r) => {
    const it = itemBy.get(r.code)
    /* 5183 — `in_qty` when positive, else `out_qty`. Validation has already
       established both are finite and at least one is positive. */
    const q = r.in_qty > 0 ? r.in_qty : r.out_qty
    if (kind !== 'in') {
      const k = r.warehouse + '|' + r.code
      restore.set(k, (restore.get(k) ?? 0) + r.out_qty)
    }
    return {
      kind,
      d: r.date,
      t: r.type,
      w: r.warehouse,
      w2: '',
      c: r.code,
      name: s(it?.name) || r.code,
      unit: s(it?.unit),
      q,
      pr: r.price,
      p: s(r.partner),
      ch: s(r.channel),
      ct: s(r.contract),
      iv: s(r.invoice),
      note: s(r.note).replace(EDIT_REPLACES_MARKER, '').trim(),
    }
  })

  /* 5195 — seeded from the FIRST line, with `note` deliberately blank: the
     header note is a document-level field the admin re-enters, and copying one
     line's note into it would apply that line's text to every other line. */
  const f = lines[0]
  return {
    kind,
    lines,
    restore,
    header: {
      d: f.d,
      t: f.t,
      w: f.w,
      w2: '',
      p: f.p,
      ch: f.ch,
      ct: f.ct,
      iv: f.iv,
      note: '',
      pr: '',
    },
  }
}

/** The `export_warning` to display, with the legacy fallback (`M8-35`). */
export function exportWarningOf(warning: string): string {
  return warning.trim() ? warning : EXPORT_WARNING_FALLBACK
}
