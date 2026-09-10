import { describe, it, expect } from 'vitest'
import {
  replacesMarker, replacementDocFor, correctionEvidence,
  resolvedCorrections, unresolvedCorrectionText, type ReconcileRow,
} from './correctionReconcile'
import type { UnresolvedCorrection } from '../store/correction.store'

/* I-6 finding 3 — reconciling an UNKNOWN correction from the loaded rows.

   The properties under test are the conservative ones: a correction resolves
   ONLY when the rows show both halves of `correct_document`, and every
   ambiguity leaves the record blocking. */

const rec = (over: Partial<UnresolvedCorrection> = {}): UnresolvedCorrection => ({
  id: 'c1',
  docNum: 'D-1',
  newDocNum: null,
  phase: 'unknown',
  refreshFailed: false,
  reconciled: false,
  scope: 's',
  lineCount: 2,
  ...over,
})

const row = (id: string, note: string | null, docNum: string | null): ReconcileRow =>
  ({ id, type: 'Satınalma', note, doc_num: docNum })

/** The two rows a completed correction of `doc` leaves behind. */
const correctedRows = (doc: string, newDoc: string): ReconcileRow[] => [
  row('r1', 'Ləğv: ' + doc, 'REV-1'),
  row('r2', replacesMarker(doc), newDoc),
]

describe('replacementDocFor', () => {
  it('finds the replacement through a bare marker', () => {
    expect(replacementDocFor('D-1', correctedRows('D-1', 'D-2'))).toBe('D-2')
  })

  it('finds it when the marker is appended to the admin’s own note', () => {
    const rows = [row('r', 'Səbəb: qiymət səhvi · ' + replacesMarker('D-1'), 'D-2')]
    expect(replacementDocFor('D-1', rows)).toBe('D-2')
  })

  it('falls back to «—» for a marker row carrying no doc_num', () => {
    expect(replacementDocFor('D-1', [row('r', replacesMarker('D-1'), null)])).toBe('—')
  })

  it('does not match a marker naming a DIFFERENT document', () => {
    expect(replacementDocFor('D-1', [row('r', replacesMarker('D-9'), 'D-2')])).toBeNull()
  })

  it('does not match the document number appearing mid-note', () => {
    /* The marker is anchored at the end, so prose mentioning the number is
       not evidence of a replacement. */
    expect(replacementDocFor('D-1', [row('r', 'D-1 haqqında qeyd', 'X')])).toBeNull()
  })

  it('is null for empty rows and for a missing doc number', () => {
    expect(replacementDocFor('D-1', [])).toBeNull()
    expect(replacementDocFor('', correctedRows('D-1', 'D-2'))).toBeNull()
    expect(replacementDocFor(null, correctedRows('D-1', 'D-2'))).toBeNull()
  })
})

describe('correctionEvidence', () => {
  it('resolves when BOTH the cancellation and the replacement are visible', () => {
    expect(correctionEvidence(rec(), correctedRows('D-1', 'D-2')))
      .toEqual({ kind: 'corrected', newDocNum: 'D-2' })
  })

  it('does NOT resolve on a cancellation alone', () => {
    /* THE CENTRAL RULE. An ordinary «Ləğv» or an I-5 batch cancellation leaves
       exactly this row. Clearing the block on it would unblock a resend in the
       very case where the document was cancelled but never replaced. */
    const rows = [row('r1', 'Ləğv: D-1', 'REV-1')]
    expect(correctionEvidence(rec(), rows)).toEqual({ kind: 'unobserved' })
  })

  it('does NOT resolve on a replacement marker alone', () => {
    const rows = [row('r2', replacesMarker('D-1'), 'D-2')]
    expect(correctionEvidence(rec(), rows)).toEqual({ kind: 'unobserved' })
  })

  it('does NOT resolve from an empty row set — absence is not rollback', () => {
    expect(correctionEvidence(rec(), [])).toEqual({ kind: 'unobserved' })
  })

  it('leaves a `pending` attempt to the write path', () => {
    const r = rec({ phase: 'pending' })
    expect(correctionEvidence(r, correctedRows('D-1', 'D-2'))).toEqual({ kind: 'unobserved' })
  })

  it('resolves a stale success whose recorded replacement matches the rows', () => {
    const r = rec({ phase: 'success', newDocNum: 'D-2', refreshFailed: true })
    expect(correctionEvidence(r, correctedRows('D-1', 'D-2')))
      .toEqual({ kind: 'corrected', newDocNum: 'D-2' })
  })

  it('refuses to resolve when the observed replacement CONTRADICTS the record', () => {
    const r = rec({ phase: 'success', newDocNum: 'D-2', refreshFailed: true })
    expect(correctionEvidence(r, correctedRows('D-1', 'D-99')))
      .toEqual({ kind: 'unobserved' })
  })

  it('accepts the «—» fallback against a recorded replacement', () => {
    const r = rec({ phase: 'success', newDocNum: 'D-2', refreshFailed: true })
    const rows = [row('r1', 'Ləğv: D-1', 'REV-1'), row('r2', replacesMarker('D-1'), null)]
    expect(correctionEvidence(r, rows)).toEqual({ kind: 'corrected', newDocNum: 'D-2' })
  })

  it('does not resolve one document from ANOTHER document’s correction', () => {
    expect(correctionEvidence(rec({ docNum: 'D-7' }), correctedRows('D-1', 'D-2')))
      .toEqual({ kind: 'unobserved' })
  })
})

describe('resolvedCorrections', () => {
  it('returns only the records the rows positively prove', () => {
    const a = rec({ id: 'a', docNum: 'D-1' })
    const b = rec({ id: 'b', docNum: 'D-5' })
    const out = resolvedCorrections([a, b], correctedRows('D-1', 'D-2'))
    expect(out).toEqual([{ id: 'a', docNum: 'D-1', newDocNum: 'D-2' }])
  })

  it('returns nothing when the rows prove nothing', () => {
    expect(resolvedCorrections([rec()], [])).toEqual([])
  })
})

describe('unresolvedCorrectionText', () => {
  it('names the document in every phase', () => {
    for (const phase of ['pending', 'unknown', 'success'] as const) {
      expect(unresolvedCorrectionText(rec({ phase }))).toContain('D-1')
    }
  })

  it('never claims the document is unchanged for an unknown outcome', () => {
    const t = unresolvedCorrectionText(rec({ phase: 'unknown' }))
    expect(t).toContain('TƏSDİQLƏNMƏYİB')
    expect(t).not.toContain('dəyişməyib')
  })

  it('names the replacement for a stale success', () => {
    const t = unresolvedCorrectionText(rec({ phase: 'success', newDocNum: 'D-2' }))
    expect(t).toContain('D-2')
  })
})
