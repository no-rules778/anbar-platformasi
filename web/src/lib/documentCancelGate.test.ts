import { describe, it, expect } from 'vitest'
import {
  canCancelDocument, canCancelLegacy, canActOnRow,
  canReplaceItems, canCancelRows, canUseRowAction, hasAnyRowAction,
  rowActionEligibility, canWriteCancellation,
  rowActionRefusal, reversalDocLabel, normalizeReversalDate,
  ROW_ALREADY_DONE, TRANSFER_ROW_NOT_CANCELLABLE, TRANSFER_ITEM_NOT_REPLACEABLE,
  ACTION_NO_LONGER_AVAILABLE, ROW_VANISHED,
} from './documentCancelGate'
import type { DocumentView } from './documentView'
import type { CancelStateMovement } from './documentCancelState'

const view = (over: Partial<DocumentView> = {}): DocumentView => ({
  kind: 'ordinary-doc',
  docNum: 'D-1',
  type: 'Satınalma',
  clicked: {} as DocumentView['clicked'],
  status: { kind: 'open' },
  lines: [],
  headerLineCount: 1,
  rawLineCount: 1,
  emptyAfterStrip: false,
  invoiceNums: [],
  contractNums: [],
  lotDoc: false,
  ...over,
})

const mov = (o: Partial<CancelStateMovement>): CancelStateMovement =>
  ({ id: '1', type: 'Satınalma', note: null, doc_num: null, ...o })

describe('canCancelDocument — the legacy status ladder (M8-24, M8-25)', () => {
  it('offers cancellation to an admin on an open document', () => {
    expect(canCancelDocument(view(), true)).toBe(true)
    expect(canCancelDocument(view({ kind: 'transfer-doc' }), true)).toBe(true)
  })

  it('refuses a non-admin — the UI never offers it', () => {
    expect(canCancelDocument(view(), false)).toBe(false)
  })

  /* A reversal document can never be cancelled again (M8-21). */
  it('refuses a reversal document, even for an admin', () => {
    expect(canCancelDocument(view({ status: { kind: 'reversal' } }), true)).toBe(false)
  })

  it('refuses an already-cancelled document, even for an admin', () => {
    const v = view({ status: { kind: 'cancelled', reversalDoc: 'R-1' } })
    expect(canCancelDocument(v, true)).toBe(false)
  })

  /* The doc-less families have their own RPCs and their own gate. */
  it('refuses a legacy doc-less record — that is canCancelLegacy', () => {
    expect(canCancelDocument(view({ kind: 'legacy-ordinary', docNum: '' }), true)).toBe(false)
    expect(canCancelDocument(view({ kind: 'legacy-transfer', docNum: '' }), true)).toBe(false)
  })

  it('refuses a document view that somehow carries no number', () => {
    expect(canCancelDocument(view({ docNum: '' }), true)).toBe(false)
  })
})

describe('canCancelLegacy — doc-less records (M8-29)', () => {
  it('allows an admin when the record is not yet cancelled', () => {
    expect(canCancelLegacy(mov({ id: 'm1' }), [], true)).toBe(true)
  })

  it('refuses a non-admin', () => {
    expect(canCancelLegacy(mov({ id: 'm1' }), [], false)).toBe(false)
  })

  /* The per-id marker, not a document-level one: a doc-less record has no
     document number to look up. */
  it('refuses a record whose per-id cancel marker exists', () => {
    const rows = [mov({ id: 'x', note: 'Ləğv ID: m1', doc_num: 'R-9' })]
    expect(canCancelLegacy(mov({ id: 'm1' }), rows, true)).toBe(false)
  })

  it('refuses a doc-less transfer whose pair marker exists', () => {
    const rows = [mov({ id: 'x', note: 'Ləğv (əks yerdəyişmə) ID: m1:m2', doc_num: 'R-9' })]
    expect(canCancelLegacy(mov({ id: 'm1', type: 'Yerdəyişmə' }), rows, true)).toBe(false)
  })
})

describe('the two row actions are DIFFERENT gates — I-4 audit, finding 1', () => {
  /* THE FINDING. `legacyCancelView()` (index.html:5264-5275) offers whole-record
     cancellation and «Malı əvəz et» — and NO «Sətri ləğv et». Row cancellation
     belongs to `documentCancelView()` (index.html:5019-5022), i.e. a document
     with a real doc_num. A single combined gate offered row cancellation on a
     doc-less legacy record, which legacy never does. */

  const legacyView = () => {
    const clicked = { id: 'm1', type: 'Satınalma', note: null, doc_num: null }
    return view({
      kind: 'legacy-ordinary',
      docNum: '',
      clicked: clicked as unknown as DocumentView['clicked'],
    })
  }

  describe('canReplaceItems — «Malı əvəz et»', () => {
    it('allows an admin on an open ordinary document', () => {
      expect(canReplaceItems(view(), [], true)).toBe(true)
    })

    it('refuses a non-admin', () => {
      expect(canReplaceItems(view(), [], false)).toBe(false)
    })

    it('refuses a reversal and an already-cancelled document', () => {
      expect(canReplaceItems(view({ status: { kind: 'reversal' } }), [], true)).toBe(false)
      expect(canReplaceItems(view({ status: { kind: 'cancelled', reversalDoc: 'R' } }), [], true))
        .toBe(false)
    })

    /* The legacy `lotDoc` condition. A partia-valued document loses the per-row
       controls for ALL of its lines, including unvalued ones. */
    it('refuses a lotDoc document', () => {
      expect(canReplaceItems(view({ lotDoc: true }), [], true)).toBe(false)
    })

    it('refuses both transfer kinds', () => {
      expect(canReplaceItems(view({ kind: 'transfer-doc' }), [], true)).toBe(false)
      expect(canReplaceItems(view({ kind: 'legacy-transfer' }), [], true)).toBe(false)
    })

    /* index.html:5275 — `#lc-repl` exists in the doc-less ordinary view. */
    it('ALLOWS a doc-less ordinary record — legacy offers «Malı əvəz et» there', () => {
      expect(canReplaceItems(legacyView(), [mov({ id: 'm1' })], true)).toBe(true)
    })

    /* index.html:5265 — `allowed = isAdmin() && !revDoc`, the PER-ID marker. */
    it('refuses a doc-less record that carries its per-id cancellation marker', () => {
      const rows = [mov({ id: 'm1' }), mov({ id: 'x', note: 'Ləğv ID: m1', doc_num: 'R-9' })]
      expect(canReplaceItems(legacyView(), rows, true)).toBe(false)
    })
  })

  describe('canCancelRows — «Sətri ləğv et»', () => {
    it('allows an admin on an open ordinary document', () => {
      expect(canCancelRows(view(), true)).toBe(true)
    })

    /* THE MUTATION this finding is about: returning true for a doc-less
       record would offer a control legacy has no equivalent of, and
       `cancel_movement_row` cancels a line INSIDE a document — a doc-less
       record has no document to leave standing. */
    it('REFUSES a doc-less ordinary record — legacy has no such control', () => {
      expect(canCancelRows(view({ kind: 'legacy-ordinary', docNum: '' }), true)).toBe(false)
    })

    it('refuses a non-admin, a reversal, a cancelled document and a lotDoc', () => {
      expect(canCancelRows(view(), false)).toBe(false)
      expect(canCancelRows(view({ status: { kind: 'reversal' } }), true)).toBe(false)
      expect(canCancelRows(view({ status: { kind: 'cancelled', reversalDoc: 'R' } }), true))
        .toBe(false)
      expect(canCancelRows(view({ lotDoc: true }), true)).toBe(false)
    })

    it('refuses both transfer kinds', () => {
      expect(canCancelRows(view({ kind: 'transfer-doc' }), true)).toBe(false)
      expect(canCancelRows(view({ kind: 'legacy-transfer' }), true)).toBe(false)
    })
  })

  /* The whole matrix in one place, as the audit states it. */
  it('preserves the real matrix per family', () => {
    const rows = [mov({ id: 'm1' })]

    /* ordinary document, admin, open, non-lotDoc → BOTH */
    expect(canUseRowAction(view(), rows, true, 'replace-item')).toBe(true)
    expect(canUseRowAction(view(), rows, true, 'cancel-row')).toBe(true)

    /* legacy ordinary, admin, not cancelled → replacement ONLY */
    expect(canUseRowAction(legacyView(), rows, true, 'replace-item')).toBe(true)
    expect(canUseRowAction(legacyView(), rows, true, 'cancel-row')).toBe(false)

    /* transfer and legacy transfer → NEITHER */
    for (const kind of ['transfer-doc', 'legacy-transfer'] as const) {
      expect(canUseRowAction(view({ kind }), rows, true, 'replace-item')).toBe(false)
      expect(canUseRowAction(view({ kind }), rows, true, 'cancel-row')).toBe(false)
    }

    /* reversal / already-cancelled → no valid action */
    for (const status of [
      { kind: 'reversal' } as const,
      { kind: 'cancelled', reversalDoc: 'R' } as const,
    ]) {
      expect(canUseRowAction(view({ status }), rows, true, 'replace-item')).toBe(false)
      expect(canUseRowAction(view({ status }), rows, true, 'cancel-row')).toBe(false)
    }
  })

  it('hasAnyRowAction is true wherever either action is offered', () => {
    expect(hasAnyRowAction(view(), [], true)).toBe(true)
    expect(hasAnyRowAction(legacyView(), [mov({ id: 'm1' })], true)).toBe(true)
    expect(hasAnyRowAction(view({ kind: 'transfer-doc' }), [], true)).toBe(false)
    expect(hasAnyRowAction(view(), [], false)).toBe(false)
  })
})

describe('rowActionEligibility — the COMPLETE gate (I-4 audit, finding 2)', () => {
  const rows = () => [mov({ id: 'r1', doc_num: 'D-1' })]
  const ctx = (over: Record<string, unknown> = {}) => ({
    rowId: 'r1',
    allRows: rows(),
    admin: true,
    assemble: () => view(),
    ...over,
  })

  it('allows an eligible row', () => {
    expect(rowActionEligibility(ctx(), 'cancel-row')).toBeNull()
    expect(rowActionEligibility(ctx(), 'replace-item')).toBeNull()
  })

  it('refuses a vanished row', () => {
    expect(rowActionEligibility(ctx({ allRows: [] }), 'cancel-row')).toBe(ROW_VANISHED)
  })

  /* The row-local half is kept — it must still win, so a transfer row keeps
     its own specific message. */
  it('keeps the row-level refusals verbatim', () => {
    const transfer = [mov({ id: 'r1', type: 'Yerdəyişmə', doc_num: 'D-1' })]
    expect(rowActionEligibility(ctx({ allRows: transfer }), 'cancel-row'))
      .toBe(TRANSFER_ROW_NOT_CANCELLABLE)
    expect(rowActionEligibility(ctx({ allRows: transfer }), 'replace-item'))
      .toBe(TRANSFER_ITEM_NOT_REPLACEABLE)

    const marked = [...rows(), mov({ id: 'x', note: 'Ləğv ID: r1' })]
    expect(rowActionEligibility(ctx({ allRows: marked }), 'cancel-row')).toBe(ROW_ALREADY_DONE)
  })

  /* THE FINDING: each of these was previously invisible to the submit path. */
  it('refuses when the DOCUMENT became a reversal', () => {
    const c = ctx({ assemble: () => view({ status: { kind: 'reversal' } }) })
    expect(rowActionEligibility(c, 'cancel-row')).toBe(ACTION_NO_LONGER_AVAILABLE)
    expect(rowActionEligibility(c, 'replace-item')).toBe(ACTION_NO_LONGER_AVAILABLE)
  })

  it('refuses when the DOCUMENT was cancelled at document level', () => {
    const c = ctx({ assemble: () => view({ status: { kind: 'cancelled', reversalDoc: 'R-1' } }) })
    expect(rowActionEligibility(c, 'cancel-row')).toBe(ACTION_NO_LONGER_AVAILABLE)
  })

  it('refuses when the document became lotDoc', () => {
    const c = ctx({ assemble: () => view({ lotDoc: true }) })
    expect(rowActionEligibility(c, 'replace-item')).toBe(ACTION_NO_LONGER_AVAILABLE)
  })

  it('refuses when the user is not admin', () => {
    expect(rowActionEligibility(ctx({ admin: false }), 'cancel-row'))
      .toBe(ACTION_NO_LONGER_AVAILABLE)
  })

  it('refuses row cancellation on a doc-less legacy branch (finding 1 matrix)', () => {
    const clicked = { id: 'r1', type: 'Satınalma', note: null, doc_num: null }
    const c = ctx({
      allRows: [mov({ id: 'r1' })],
      assemble: () => view({
        kind: 'legacy-ordinary',
        docNum: '',
        clicked: clicked as unknown as DocumentView['clicked'],
      }),
    })
    expect(rowActionEligibility(c, 'cancel-row')).toBe(ACTION_NO_LONGER_AVAILABLE)
    /* …while replacement remains legitimately available there. */
    expect(rowActionEligibility(c, 'replace-item')).toBeNull()
  })

  it('refuses an unsupported/unassemblable row', () => {
    expect(rowActionEligibility(ctx({ assemble: () => null }), 'replace-item'))
      .toBe(ACTION_NO_LONGER_AVAILABLE)
  })
})

describe('canWriteCancellation — fail-closed capability (I-4 audit, finding 3)', () => {
  it('permits a write only when the probe ANSWERED', () => {
    expect(canWriteCancellation(true)).toBe(true)
    expect(canWriteCancellation(false)).toBe(false)
  })
})

describe('canActOnRow / rowActionRefusal — per-line eligibility', () => {
  it('allows a clean row', () => {
    expect(canActOnRow({ id: 'r1' }, [])).toBe(true)
    expect(rowActionRefusal({ id: 'r1', type: 'Satınalma' }, [], 'cancel-row')).toBeNull()
  })

  it('refuses a row that already carries a cancel marker', () => {
    const rows = [mov({ id: 'x', note: 'Ləğv ID: r1' })]
    expect(canActOnRow({ id: 'r1' }, rows)).toBe(false)
    expect(rowActionRefusal({ id: 'r1', type: 'Satınalma' }, rows, 'cancel-row'))
      .toBe(ROW_ALREADY_DONE)
    expect(rowActionRefusal({ id: 'r1', type: 'Satınalma' }, rows, 'replace-item'))
      .toBe(ROW_ALREADY_DONE)
  })

  it('gives each family its own transfer refusal text', () => {
    expect(rowActionRefusal({ id: 'r', type: 'Yerdəyişmə' }, [], 'cancel-row'))
      .toBe(TRANSFER_ROW_NOT_CANCELLABLE)
    expect(rowActionRefusal({ id: 'r', type: 'Yerdəyişmə' }, [], 'replace-item'))
      .toBe(TRANSFER_ITEM_NOT_REPLACEABLE)
  })

  /* The transfer check precedes the marker check, as in legacy. */
  it('reports the transfer refusal before the already-done one', () => {
    const rows = [mov({ id: 'x', note: 'Ləğv ID: r1' })]
    expect(rowActionRefusal({ id: 'r1', type: 'Yerdəyişmə' }, rows, 'cancel-row'))
      .toBe(TRANSFER_ROW_NOT_CANCELLABLE)
  })
})

describe('reversalDocLabel / normalizeReversalDate', () => {
  it('keeps the legacy em-dash fallback', () => {
    expect(reversalDocLabel('R-1')).toBe('R-1')
    expect(reversalDocLabel(null)).toBe('—')
    expect(reversalDocLabel('')).toBe('—')
    expect(reversalDocLabel(undefined)).toBe('—')
  })

  /* Blank means OMIT, which the API expresses as null. */
  it('maps a blank date to null so the argument is omitted', () => {
    expect(normalizeReversalDate('2026-09-06')).toBe('2026-09-06')
    expect(normalizeReversalDate('')).toBeNull()
    expect(normalizeReversalDate('   ')).toBeNull()
    expect(normalizeReversalDate(null)).toBeNull()
    expect(normalizeReversalDate(undefined)).toBeNull()
  })
})
