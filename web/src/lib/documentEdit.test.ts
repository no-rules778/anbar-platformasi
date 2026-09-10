import { describe, it, expect } from 'vitest'
import {
  canEditDocument, readImpactContract, mapImpact, exportWarningOf,
  isValidImpactLine, isValidImpactBlock,
  EDIT_REPLACES_MARKER, EXPORT_WARNING_FALLBACK,
  IMPACT_MALFORMED, IMPACT_NO_LINES,
  type EditGateInput,
} from './documentEdit'
import type { EditImpactResult, EditImpactLine } from '../api/documentEditImpact.api'

/* I-6 — `M8-33` … `M8-39`. Pure logic only; no DOM, no transport. */

const gateInput = (over: Partial<EditGateInput> = {}): EditGateInput => ({
  isAdmin: true,
  docNum: 'SND-1',
  isOrdinaryDoc: true,
  isCancelledOrReversal: false,
  layerActive: false,
  layerReady: true,
  editDocNum: null,
  ...over,
})

const line = (over: Partial<EditImpactLine> = {}): EditImpactLine => ({
  date: '2026-09-01',
  warehouse: 'Elet',
  code: 'C1',
  type: 'Satınalma',
  in_qty: 5,
  out_qty: 0,
  partner: 'P',
  channel: 'CH',
  contract: 'CT',
  invoice: 'IV',
  price: 10,
  note: '',
  ...over,
})

const impact = (over: Partial<EditImpactResult> = {}): EditImpactResult => ({
  ok: true,
  error: null,
  editable: true,
  blocks: [],
  lines: [line()],
  type: 'Satınalma',
  direction: 'in',
  exportWarning: 'W',
  ...over,
})

describe('canEditDocument — the entry gate (M8-38, M8-39)', () => {
  it('allows an admin on an open ordinary document', () => {
    expect(canEditDocument(gateInput())).toEqual({ allowed: true })
  })

  it('refuses a non-admin with the legacy message', () => {
    const g = canEditDocument(gateInput({ isAdmin: false }))
    expect(g).toMatchObject({ allowed: false, code: 'not-admin' })
    expect(g.allowed === false && g.message).toBe('Sənədi yalnız Rəhbər (Admin) redaktə edə bilər')
  })

  it('refuses a doc-less record', () => {
    expect(canEditDocument(gateInput({ docNum: '' }))).toMatchObject({ code: 'no-doc-num' })
  })

  it('refuses a transfer or legacy view', () => {
    expect(canEditDocument(gateInput({ isOrdinaryDoc: false }))).toMatchObject({
      code: 'not-editable-view',
    })
  })

  it('refuses a cancelled or reversal document', () => {
    expect(canEditDocument(gateInput({ isCancelledOrReversal: true }))).toMatchObject({
      code: 'not-editable-view',
    })
  })

  it('refuses while layers are ACTIVE (M8-38, legacy 5085)', () => {
    expect(canEditDocument(gateInput({ layerActive: true }))).toMatchObject({
      code: 'layer-active',
    })
  })

  it('refuses while the layer capability is UNKNOWN, before reading layerActive', () => {
    /* layerActive false + layerReady false must NOT read as "no layers". */
    const g = canEditDocument(gateInput({ layerReady: false, layerActive: false }))
    expect(g).toMatchObject({ code: 'layer-unknown' })
  })

  it('refuses a SECOND document and names the one in edit mode (M8-39)', () => {
    const g = canEditDocument(gateInput({ docNum: 'SND-2', editDocNum: 'SND-1' }))
    expect(g).toMatchObject({ allowed: false, code: 'other-doc-in-edit' })
    expect(g.allowed === false && g.message).toContain('SND-1')
  })

  it('permits RE-entering the SAME document, as legacy does', () => {
    expect(canEditDocument(gateInput({ docNum: 'SND-1', editDocNum: 'SND-1' }))).toEqual({
      allowed: true,
    })
  })
})

describe('impact line validation — the API casts, so this checks', () => {
  it('accepts a well-formed line', () => {
    expect(isValidImpactLine(line())).toBe(true)
  })

  it.each([
    ['null', null],
    ['a number', 7],
    ['an array', []],
    ['a string', 'x'],
  ])('rejects %s', (_label, v) => {
    expect(isValidImpactLine(v)).toBe(false)
  })

  it('rejects a missing or empty warehouse, code or date', () => {
    expect(isValidImpactLine(line({ warehouse: '' }))).toBe(false)
    expect(isValidImpactLine(line({ code: '' }))).toBe(false)
    expect(isValidImpactLine(line({ date: '' }))).toBe(false)
  })

  it('rejects NaN, Infinity and negative quantities', () => {
    expect(isValidImpactLine(line({ in_qty: Number.NaN }))).toBe(false)
    expect(isValidImpactLine(line({ out_qty: Number.POSITIVE_INFINITY }))).toBe(false)
    expect(isValidImpactLine(line({ in_qty: -1 }))).toBe(false)
  })

  it('rejects a 0/0 line — it would become an unpostable draft row', () => {
    expect(isValidImpactLine(line({ in_qty: 0, out_qty: 0 }))).toBe(false)
  })

  it('rejects a non-finite price', () => {
    expect(isValidImpactLine(line({ price: Number.NaN }))).toBe(false)
  })

  it('accepts absent optional text but rejects a wrong-typed one', () => {
    const { partner: _p, ...withoutPartner } = line()
    expect(isValidImpactLine(withoutPartner)).toBe(true)
    expect(isValidImpactLine({ ...line(), note: { a: 1 } })).toBe(false)
  })

  it('accepts a block with either a message or a code, rejects an empty one', () => {
    expect(isValidImpactBlock({ code: 'x', message: '' })).toBe(true)
    expect(isValidImpactBlock({ code: '', message: 'why' })).toBe(true)
    expect(isValidImpactBlock({ code: '', message: '' })).toBe(false)
    expect(isValidImpactBlock(null)).toBe(false)
  })
})

describe('readImpactContract — the whole-response contract', () => {
  it('reports a well-formed editable response', () => {
    const c = readImpactContract(impact())
    expect(c).toMatchObject({ kind: 'editable', direction: 'in' })
  })

  it('reports a well-formed NOT-editable response as blocked', () => {
    const c = readImpactContract(impact({
      editable: false,
      blocks: [{ code: 'later_movement', message: 'Sonrakı hərəkət var' }],
    }))
    expect(c).toMatchObject({ kind: 'blocked' })
    expect(c.kind === 'blocked' && c.blocks).toHaveLength(1)
  })

  it('treats a not-editable response with NO renderable block as malformed', () => {
    /* An empty reasons table would tell the admin nothing about the refusal. */
    const c = readImpactContract(impact({ editable: false, blocks: [] }))
    expect(c).toEqual({ kind: 'malformed', message: IMPACT_MALFORMED })
  })

  it('drops unrenderable blocks but keeps renderable siblings', () => {
    const c = readImpactContract(impact({
      editable: false,
      blocks: [
        null as never,
        { code: 'x', message: 'real' },
      ],
    }))
    expect(c.kind === 'blocked' && c.blocks).toEqual([{ code: 'x', message: 'real' }])
  })

  it('rejects an unknown direction', () => {
    expect(readImpactContract(impact({ direction: 'sideways' }))).toEqual({
      kind: 'malformed', message: IMPACT_MALFORMED,
    })
    expect(readImpactContract(impact({ direction: '' }))).toMatchObject({ kind: 'malformed' })
  })

  it('rejects the WHOLE response when ANY line is malformed — never partially', () => {
    /* Dropping the bad line would post a document missing rows the original
       had: a silent data loss with a plausible-looking result. */
    const c = readImpactContract(impact({ lines: [line(), line({ code: '' })] }))
    expect(c).toEqual({ kind: 'malformed', message: IMPACT_MALFORMED })
  })

  it('refuses an editable document with no lines (legacy 5182)', () => {
    expect(readImpactContract(impact({ lines: [] }))).toEqual({
      kind: 'malformed', message: IMPACT_NO_LINES,
    })
  })
})

describe('mapImpact — the legacy mapping (M8-36)', () => {
  const itemBy = new Map([['C1', { name: 'Mal 1', unit: 'ədəd' }]])

  it('maps an inbound document and builds NO restore map', () => {
    const c = readImpactContract(impact())
    const m = mapImpact(c as never, itemBy)
    expect(m.kind).toBe('in')
    expect(m.lines[0]).toMatchObject({ kind: 'in', q: 5, c: 'C1', name: 'Mal 1', unit: 'ədəd' })
    /* An inbound document consumed nothing; a restore map would inflate
       availability and let the corrected document overdraw stock. */
    expect(m.restore.size).toBe(0)
  })

  it('builds the restore map from out_qty for an OUTBOUND document', () => {
    const c = readImpactContract(impact({
      direction: 'out',
      lines: [line({ in_qty: 0, out_qty: 4 })],
    }))
    const m = mapImpact(c as never, itemBy)
    expect(m.kind).toBe('out')
    expect(m.lines[0].q).toBe(4)
    expect(m.restore.get('Elet|C1')).toBe(4)
  })

  it('ACCUMULATES restore quantities for the same warehouse+item', () => {
    const c = readImpactContract(impact({
      direction: 'out',
      lines: [
        line({ in_qty: 0, out_qty: 3 }),
        line({ in_qty: 0, out_qty: 2 }),
      ],
    }))
    const m = mapImpact(c as never, itemBy)
    expect(m.restore.get('Elet|C1')).toBe(5)
  })

  it('strips the «Əvəz edir» marker so it does not accumulate', () => {
    const c = readImpactContract(impact({
      lines: [line({ note: 'əsl qeyd · Əvəz edir: SND-OLD' })],
    }))
    const m = mapImpact(c as never, itemBy)
    expect(m.lines[0].note).toBe('əsl qeyd')
    expect(EDIT_REPLACES_MARKER.test(m.lines[0].note)).toBe(false)
  })

  it('falls back to the item CODE when the item is unknown', () => {
    const c = readImpactContract(impact({ lines: [line({ code: 'GHOST' })] }))
    const m = mapImpact(c as never, new Map())
    expect(m.lines[0]).toMatchObject({ name: 'GHOST', unit: '' })
  })

  it('seeds a COMPLETE header from the first line, with note and w2 blank', () => {
    const c = readImpactContract(impact({
      lines: [line({ note: 'sətir qeydi' }), line({ code: 'C2', invoice: 'OTHER' })],
    }))
    const m = mapImpact(c as never, itemBy)
    /* Every field is present — the store merges over an EMPTY header, so a
       missing key here would leave a previous draft's value in place. */
    expect(Object.keys(m.header).sort()).toEqual(
      ['ch', 'ct', 'd', 'iv', 'note', 'p', 'pr', 't', 'w', 'w2'],
    )
    expect(m.header).toMatchObject({
      d: '2026-09-01', t: 'Satınalma', w: 'Elet', iv: 'IV', w2: '', note: '', pr: '',
    })
  })
})

describe('exportWarningOf', () => {
  it('uses the server warning when present', () => {
    expect(exportWarningOf('server deyir')).toBe('server deyir')
  })
  it('falls back to the legacy sentence when absent or blank (M8-35)', () => {
    expect(exportWarningOf('')).toBe(EXPORT_WARNING_FALLBACK)
    expect(exportWarningOf('   ')).toBe(EXPORT_WARNING_FALLBACK)
  })
})


/* I-6 finding 4 — INCOHERENT QUANTITIES must not reach the mapper.

   `mapImpact` stamps every line's `kind` from the DOCUMENT's direction while
   taking each line's quantity from the LINE (`in_qty > 0 ? in_qty : out_qty`).
   Two shapes break that:

     - a line with BOTH quantities positive: the `out_qty` is silently
       discarded, so a contradictory row becomes a plausible draft line of the
       wrong amount;
     - a line whose quantity contradicts the document direction: an outbound
       row inside an inbound document is mapped as INBOUND, reversing the sign
       of a posted movement, and the restore map (outbound-only) either
       inflates availability or omits a restore that was due.

   Both are refused as `malformed`, which the caller renders as an error and
   nothing else — no navigation, no draft replaced. */

describe('isValidImpactLine — quantity coherence', () => {
  it('refuses a line with BOTH quantities positive', () => {
    expect(isValidImpactLine(line({ in_qty: 5, out_qty: 3 }))).toBe(false)
  })

  it('still accepts each single-sided form', () => {
    expect(isValidImpactLine(line({ in_qty: 5, out_qty: 0 }))).toBe(true)
    expect(isValidImpactLine(line({ in_qty: 0, out_qty: 5 }))).toBe(true)
  })

  it('still refuses 0/0 and negatives, as before', () => {
    expect(isValidImpactLine(line({ in_qty: 0, out_qty: 0 }))).toBe(false)
    expect(isValidImpactLine(line({ in_qty: -1, out_qty: 0 }))).toBe(false)
  })
})

describe('readImpactContract — direction agreement', () => {
  it('refuses an OUT line inside an IN document', () => {
    const c = readImpactContract(impact({
      direction: 'in',
      lines: [line({ in_qty: 0, out_qty: 4 })],
    }))
    expect(c).toEqual({ kind: 'malformed', message: IMPACT_MALFORMED })
  })

  it('refuses an IN line inside an OUT document', () => {
    const c = readImpactContract(impact({
      direction: 'out',
      lines: [line({ in_qty: 4, out_qty: 0 })],
    }))
    expect(c).toEqual({ kind: 'malformed', message: IMPACT_MALFORMED })
  })

  it('refuses the whole document when only ONE line contradicts', () => {
    /* All or nothing, as for structural validity: dropping the odd line would
       post a document missing a row the original had. */
    const c = readImpactContract(impact({
      direction: 'in',
      lines: [line({ in_qty: 5, out_qty: 0 }), line({ in_qty: 0, out_qty: 2 })],
    }))
    expect(c).toEqual({ kind: 'malformed', message: IMPACT_MALFORMED })
  })

  it('refuses a both-positive line before the direction check', () => {
    const c = readImpactContract(impact({
      direction: 'in',
      lines: [line({ in_qty: 5, out_qty: 2 })],
    }))
    expect(c).toEqual({ kind: 'malformed', message: IMPACT_MALFORMED })
  })

  it('accepts a coherent inbound document', () => {
    const c = readImpactContract(impact({
      direction: 'in',
      lines: [line({ in_qty: 5, out_qty: 0 })],
    }))
    expect(c.kind).toBe('editable')
  })

  it('accepts a coherent outbound document, and maps its restore', () => {
    const c = readImpactContract(impact({
      direction: 'out',
      lines: [line({ in_qty: 0, out_qty: 4 })],
    }))
    expect(c.kind).toBe('editable')
    const m = mapImpact(c as Extract<typeof c, { kind: 'editable' }>, new Map())
    expect(m.kind).toBe('out')
    expect(m.lines[0].q).toBe(4)
    expect(m.restore.get('Elet|C1')).toBe(4)
  })

  it('a refused document maps NOTHING — the contract never reaches the mapper', () => {
    /* The guarantee the caller depends on: a malformed contract carries no
       `lines`, so there is nothing a caller could map from it even by
       mistake, and the draft it would have replaced is untouched. */
    const c = readImpactContract(impact({
      direction: 'in',
      lines: [line({ in_qty: 0, out_qty: 4 })],
    }))
    expect(c.kind).toBe('malformed')
    expect('lines' in c).toBe(false)
  })
})
