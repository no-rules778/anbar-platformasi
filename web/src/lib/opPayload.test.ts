import { describe, it, expect } from 'vitest'
import {
  toMovementPayload, toTransferPayload, toCorrectionPayload, splitByRoute,
  type DraftOpLine,
} from './opPayload'

const L = (o: Partial<DraftOpLine> = {}): DraftOpLine => ({
  kind: 'out', d: '2026-09-04', t: 'Silinmə', w: 'Elet', c: 'A', q: 3,
  pr: 10, p: 'Sahə üzrə məsul şəxs', ch: '', ct: '', iv: '83951', note: 'qeyd',
  ...o,
})

describe('toMovementPayload — M7-100', () => {
  it('maps an outbound line to out_qty with in_qty 0', () => {
    const p = toMovementPayload(L())
    expect(p).toMatchObject({
      date: '2026-09-04', warehouse: 'Elet', code: 'A', type: 'Silinmə',
      in_qty: 0, out_qty: 3, invoice: '83951', price: 10, note: 'qeyd',
    })
  })

  it('maps an inbound line to in_qty with out_qty 0', () => {
    const p = toMovementPayload(L({ kind: 'in', t: 'Satınalma' }))
    expect(p.in_qty).toBe(3)
    expect(p.out_qty).toBe(0)
  })

  it('normalises null text fields to empty strings', () => {
    const p = toMovementPayload(L({ p: null, ch: null, ct: null, iv: null, note: null }))
    expect(p).toMatchObject({ partner: '', channel: '', contract: '', invoice: '', note: '' })
  })

  it('normalises a null or non-numeric price to 0', () => {
    expect(toMovementPayload(L({ pr: null })).price).toBe(0)
    expect(toMovementPayload(L({ pr: NaN })).price).toBe(0)
  })

  it('emits conditions for an outbound line carrying a split', () => {
    const p = toMovementPayload(L({ cond: { normal: 1, icare: 2 } }))
    expect(p.conditions).toEqual({ icare: 2 })
  })

  /* The server refuses a split on an inbound row outright, so it is never
     emitted for one. */
  it('NEVER emits conditions on an inbound line', () => {
    const p = toMovementPayload(L({ kind: 'in', t: 'Satınalma', cond: { icare: 2 } }))
    expect(p.conditions).toBeNull()
  })

  it('emits null conditions when there is no split', () => {
    expect(toMovementPayload(L()).conditions).toBeNull()
  })

  /* An empty string would fail the server's numeric pattern. */
  it('sends final_amount as null when blank, string otherwise', () => {
    expect(toMovementPayload(L()).final_amount).toBeNull()
    expect(toMovementPayload(L({ finalAmount: '' })).final_amount).toBeNull()
    expect(toMovementPayload(L({ finalAmount: null })).final_amount).toBeNull()
    expect(toMovementPayload(L({ finalAmount: '99.50' })).final_amount).toBe('99.50')
    expect(toMovementPayload(L({ finalAmount: 99.5 })).final_amount).toBe('99.5')
  })

  it('passes layer revision and allocations through', () => {
    const p = toMovementPayload(L({
      layerRevision: 'rev1', allocations: [{ layer_id: 'L1', qty: 3 }],
    }))
    expect(p.revision).toBe('rev1')
    expect(p.allocations).toEqual([{ layer_id: 'L1', qty: 3 }])
  })

  it('defaults revision to an empty string and allocations to null', () => {
    const p = toMovementPayload(L())
    expect(p.revision).toBe('')
    expect(p.allocations).toBeNull()
  })
})

describe('toTransferPayload — M7-99', () => {
  const mv = L({ kind: 'mv', t: 'Yerdəyişmə', w: 'Elet', w2: 'Astara' })

  it('maps to source/dest/qty', () => {
    const p = toTransferPayload(mv)
    expect(p).toMatchObject({
      date: '2026-09-04', source: 'Elet', dest: 'Astara', code: 'A', qty: 3,
      invoice: '83951', note: 'qeyd',
    })
  })

  /* post_transfer_document accepts no price — both legs are written with 0. */
  it('carries NO price field', () => {
    expect(toTransferPayload(mv)).not.toHaveProperty('price')
  })

  it('carries no in_qty/out_qty — the server writes both legs', () => {
    const p = toTransferPayload(mv)
    expect(p).not.toHaveProperty('in_qty')
    expect(p).not.toHaveProperty('out_qty')
  })

  it('emits the split, which moves with the goods', () => {
    expect(toTransferPayload(L({ ...mv, cond: { icare: 2 } })).conditions).toEqual({ icare: 2 })
  })

  it('normalises a missing destination to an empty string', () => {
    expect(toTransferPayload(L({ ...mv, w2: null })).dest).toBe('')
  })
})

describe('toCorrectionPayload — M7-97', () => {
  it('carries only the fields correct_document accepts', () => {
    const p = toCorrectionPayload(L())
    expect(Object.keys(p).sort()).toEqual([
      'channel', 'code', 'contract', 'date', 'in_qty', 'invoice',
      'note', 'out_qty', 'partner', 'price', 'type', 'warehouse',
    ])
  })

  /* correct_document re-posts through post_movement_document and carries no
     layer or split fields; it appends «Əvəz edir: <doc>» itself. */
  it('carries NO conditions, revision, allocations or final_amount', () => {
    const p = toCorrectionPayload(L({
      cond: { icare: 1 }, layerRevision: 'r', allocations: [{ layer_id: 'L', qty: 1 }],
      finalAmount: '5',
    }))
    expect(p).not.toHaveProperty('conditions')
    expect(p).not.toHaveProperty('revision')
    expect(p).not.toHaveProperty('allocations')
    expect(p).not.toHaveProperty('final_amount')
  })

  it('does not add the «Əvəz edir» marker — the server does', () => {
    expect(toCorrectionPayload(L({ note: 'qeyd' })).note).toBe('qeyd')
  })

  it('maps direction the same way as the movement payload', () => {
    expect(toCorrectionPayload(L({ kind: 'in' })).in_qty).toBe(3)
    expect(toCorrectionPayload(L({ kind: 'in' })).out_qty).toBe(0)
  })
})

describe('splitByRoute — M7-103', () => {
  it('separates transfer lines from the rest', () => {
    const lines = [L(), L({ kind: 'mv' }), L({ kind: 'in' })]
    const { mvLines, other } = splitByRoute(lines)
    expect(mvLines).toHaveLength(1)
    expect(other).toHaveLength(2)
  })

  it('handles all-transfer and all-other sets', () => {
    expect(splitByRoute([L({ kind: 'mv' })]).other).toEqual([])
    expect(splitByRoute([L()]).mvLines).toEqual([])
  })
})
