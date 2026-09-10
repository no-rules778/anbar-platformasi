import { describe, it, expect, vi, beforeEach } from 'vitest'

const fetchItems = vi.fn()
const fetchItemMovements = vi.fn()
const fetchWarehouses = vi.fn()
const readPartners = vi.fn()
const fetchStockConditions = vi.fn()
const fetchReferenceValues = vi.fn()
const fetchSplitSupported = vi.fn()
const fetchLayerCapability = vi.fn()
const fetchTransferDestinations = vi.fn()
const correctDocument = vi.fn()

vi.mock('../api/items.api', () => ({ fetchItems: () => fetchItems() }))
vi.mock('../api/itemMovements.api', () => ({ fetchItemMovements: () => fetchItemMovements() }))
vi.mock('../api/warehouses.api', () => ({ fetchWarehouses: () => fetchWarehouses() }))
vi.mock('../api/partners.api', () => ({ readPartners: () => readPartners() }))
vi.mock('../api/stockConditions.api', () => ({
  fetchStockConditions: () => fetchStockConditions(),
  toCondMap: () => new Map(),
}))
vi.mock('../api/referenceValues.api', () => ({ fetchReferenceValues: () => fetchReferenceValues() }))
vi.mock('../api/movementSplit.api', () => ({ fetchSplitSupported: () => fetchSplitSupported() }))
vi.mock('../api/stockLayers.api', () => ({
  fetchLayerCapability: () => fetchLayerCapability(),
  LAYERS_INACTIVE: { ready: false, active: false, version: 0 },
}))
vi.mock('../api/transferDestinations.api', () => ({
  fetchTransferDestinations: (f: string[]) => fetchTransferDestinations(f),
}))
vi.mock('../api/postMovementDocument.api', () => ({
  postMovementDocument: vi.fn(),
  postTransferDocument: vi.fn(),
  postLayerMovementDocument: vi.fn(),
  postLayerTransferDocument: vi.fn(),
  correctDocument: (...a: unknown[]) => correctDocument(...a),
}))

import { useOperationStore } from './operation.store'
import { useCorrectionStore } from './correction.store'
import { scopeOf } from './batchCancel.store'
import type { Me } from '../lib/roles'

/* I-6, decision `D6` — the four correction-write outcomes, and the repeat
   protection around them. Every transport is mocked; nothing live is called. */

const ADMIN: Me = { id: 'u1', sbId: 'u1', email: 'a@a.com', name: 'A', role: 'admin', wh: '' }

function okCore() {
  fetchItems.mockResolvedValue({
    rows: [{ code: 'C1', name: 'Nasos', unit: 'ədəd', price: 10, category: null }],
    ok: true, error: null,
  })
  fetchItemMovements.mockResolvedValue({
    rows: [{
      id: 'm1', item_code: 'C1', warehouse: 'Ələt', date: '2026-01-01',
      in_qty: 100, out_qty: 0, price: 10, partner: 'P', type: 'Satınalma',
      invoice_num: null, note: null, doc_num: 'D1', created_at: '2026-01-01T00:00:00Z',
    }],
    ok: true, error: null,
  })
  fetchWarehouses.mockResolvedValue([{ name: 'Ələt', type: 'anbar', active: true }])
  readPartners.mockResolvedValue({ rows: [{ id: 'p1', name: 'P', active: true }], ok: true, error: null })
  fetchStockConditions.mockResolvedValue({ rows: [], ok: true, error: null })
  fetchReferenceValues.mockResolvedValue({
    values: { channel: [], unit: [], category: [], serfiyyat_channel: [] }, ready: true,
  })
  fetchSplitSupported.mockResolvedValue(true)
  fetchLayerCapability.mockResolvedValue({ ready: true, active: false, version: 1 })
  fetchTransferDestinations.mockImplementation((f: string[]) =>
    Promise.resolve({ names: f, ok: true, error: null }))
}

const LINE = {
  kind: 'in' as const, d: '2026-01-02', t: 'Satınalma', w: 'Ələt', c: 'C1',
  q: 5, pr: 10, p: 'P', ch: '', ct: '', iv: 'IV-9', note: '',
}

/** Loads the store and puts it in edit mode with one postable line. */
async function inEditMode() {
  okCore()
  useOperationStore.setState(useOperationStore.getInitialState(), true)
  await useOperationStore.getState().load(ADMIN)
  useOperationStore.getState().enterEditMode(
    { docNum: 'SND-1', restore: new Map(), type: 'Satınalma', direction: 'in' },
    [LINE] as never,
    { d: '2026-01-02', t: 'Satınalma', w: 'Ələt' },
  )
  useCorrectionStore.getState().hydrate(ADMIN.sbId)
}

const post = () => useOperationStore.getState().postDocument(ADMIN, { reason: 'səhv miqdar' })

beforeEach(() => {
  vi.clearAllMocks()
  sessionStorage.clear()
  useCorrectionStore.getState().reset()
})

describe('confirmed SUCCESS', () => {
  it('reports both documents, clears edit mode and leaves no block', async () => {
    await inEditMode()
    correctDocument.mockResolvedValue({
      ok: true, error: null, status: 200, code: null,
      data: { original_doc_num: 'SND-1', new_doc_num: 'SND-2', row_count: 1 },
      docNum: 'SND-1', rowCount: 1, newDocNum: 'SND-2', reversalDocNum: 'SND-R',
    })
    const res = await post()
    expect(res.kind).toBe('corrected')
    expect(res.message).toContain('SND-1')
    expect(res.message).toContain('SND-2')
    expect(useOperationStore.getState().editDoc).toBe(null)
    expect(useOperationStore.getState().lines).toEqual([])
    /* Confirmed and reconciled — the only path that clears the record. */
    expect(useCorrectionStore.getState().blockingFor('SND-1')).toBe(null)
  })
})

describe('confirmed REJECTION — the ONE case that may say «dəyişməyib»', () => {
  it('a 4xx with a server code says the document is unchanged and KEEPS the draft', async () => {
    await inEditMode()
    correctDocument.mockResolvedValue({
      ok: false, error: 'Sənəd redaktə edilə bilməz', status: 400, code: 'P0001',
      data: null, docNum: null, rowCount: 0,
    })
    const res = await post()
    expect(res.kind).toBe('refused')
    expect(res.message).toContain('dəyişməyib')
    /* Nothing was written, so the admin keeps what they typed and edit mode
       stays on — they can correct the input and resubmit. */
    expect(useOperationStore.getState().editDoc).not.toBe(null)
    expect(useOperationStore.getState().lines).toHaveLength(1)
    expect(useCorrectionStore.getState().blockingFor('SND-1')).toBe(null)
  })

  it('a guard refusal never reaches the network and is a confirmed rejection', async () => {
    await inEditMode()
    correctDocument.mockResolvedValue({
      ok: false, error: 'localhost qadağandır', blocked: true,
      status: null, code: null, data: null, docNum: null, rowCount: 0,
    })
    const res = await post()
    expect(res.kind).toBe('refused')
    expect(res.message).toContain('dəyişməyib')
    expect(useCorrectionStore.getState().blockingFor('SND-1')).toBe(null)
  })
})

describe('UNKNOWN outcomes — never claim the document is unchanged', () => {
  it.each([
    ['a transport failure (status 0)', { status: 0, code: '' }],
    ['a gateway 502', { status: 502, code: null }],
    ['a code-free 404 from an intermediary', { status: 404, code: null }],
    ['a 408 timeout', { status: 408, code: 'PGRST000' }],
  ])('%s blocks a repeat and does not say «dəyişməyib»', async (_l, over) => {
    await inEditMode()
    correctDocument.mockResolvedValue({
      ok: false, error: 'şəbəkə xətası', data: null, docNum: null, rowCount: 0, ...over,
    })
    const res = await post()
    expect(res.kind).toBe('correction-unknown')
    expect(res.message).not.toContain('dəyişməyib')
    expect(useCorrectionStore.getState().blockingFor('SND-1')).not.toBe(null)
    /* The draft is KEPT: nothing typed is lost while the admin reconciles. */
    expect(useOperationStore.getState().lines).toHaveLength(1)
    expect(useOperationStore.getState().editDoc).not.toBe(null)
  })

  it('a 2xx with NO new_doc_num is UNKNOWN, not a success', async () => {
    await inEditMode()
    correctDocument.mockResolvedValue({
      ok: true, error: null, status: 200, code: null,
      data: { original_doc_num: 'SND-1' },
      docNum: 'SND-1', rowCount: 0, newDocNum: null, reversalDocNum: null,
    })
    const res = await post()
    expect(res.kind).toBe('correction-unknown')
    expect(useCorrectionStore.getState().blockingFor('SND-1')).not.toBe(null)
  })

  it('a 2xx describing a DIFFERENT document is UNKNOWN', async () => {
    await inEditMode()
    correctDocument.mockResolvedValue({
      ok: true, error: null, status: 200, code: null,
      data: { original_doc_num: 'SND-99', new_doc_num: 'SND-2' },
      docNum: 'SND-99', rowCount: 1, newDocNum: 'SND-2', reversalDocNum: null,
    })
    expect((await post()).kind).toBe('correction-unknown')
  })
})

describe('success followed by a REFRESH failure', () => {
  it('confirms the write, reports the stale screen and still blocks a repeat', async () => {
    await inEditMode()
    correctDocument.mockResolvedValue({
      ok: true, error: null, status: 200, code: null,
      data: { original_doc_num: 'SND-1', new_doc_num: 'SND-2', row_count: 1 },
      docNum: 'SND-1', rowCount: 1, newDocNum: 'SND-2', reversalDocNum: null,
    })
    /* The post-write reload fails. `load()` deliberately KEEPS the previous
       snapshot on failure (the M8-45 rule) but reports `ok:false` only when
       nothing was ever loaded — so the store's own `loaded` flag is what
       distinguishes them. Here the reload is made to fail outright AFTER the
       write, which is exactly the production shape: the correction committed
       and the list could not be re-read. */
    fetchItems.mockResolvedValue({ rows: [], ok: false, error: 'şəbəkə' })
    fetchItemMovements.mockResolvedValue({ rows: [], ok: false, error: 'şəbəkə' })
    const res = await post()
    expect(res.kind).toBe('correction-stale')
    expect(res.message).toContain('SND-2')
    expect(res.message).not.toContain('dəyişməyib')
    /* The write is confirmed but the screen cannot prove it, so a second
       correction of this document is still refused. */
    expect(useCorrectionStore.getState().blockingFor('SND-1')).not.toBe(null)
  })
})

describe('duplicate submission', () => {
  it('a second correction of the SAME document is refused after an UNKNOWN', async () => {
    await inEditMode()
    correctDocument.mockResolvedValue({
      ok: false, error: 'şəbəkə xətası', status: 0, code: '',
      data: null, docNum: null, rowCount: 0,
    })
    expect((await post()).kind).toBe('correction-unknown')
    expect(correctDocument).toHaveBeenCalledTimes(1)

    const second = await post()
    expect(second.kind).toBe('refused')
    expect(second.message).toContain('iki dəfə')
    /* The RPC was NOT called a second time. */
    expect(correctDocument).toHaveBeenCalledTimes(1)
  })

  it('the block SURVIVES a reload — re-hydrating still refuses', async () => {
    await inEditMode()
    correctDocument.mockResolvedValue({
      ok: false, error: 'şəbəkə xətası', status: 0, code: '',
      data: null, docNum: null, rowCount: 0,
    })
    await post()

    /* Simulate a reload: in-memory records gone, sessionStorage intact. */
    useCorrectionStore.getState().reset()
    useCorrectionStore.getState().hydrate(ADMIN.sbId)

    const after = await post()
    expect(after.kind).toBe('refused')
    expect(correctDocument).toHaveBeenCalledTimes(1)
  })

  it('an unreadable attempt history refuses the correction outright', async () => {
    await inEditMode()
    /* Seeded AFTER the edit-mode setup (which hydrates a clean store), then
       re-hydrated so the damaged history is what the store actually holds.
       The key is derived, never hardcoded — it carries the project ref. */
    sessionStorage.setItem('anbar_correction_unresolved_' + scopeOf(ADMIN.sbId), '{bad')
    useCorrectionStore.getState().reset()
    useCorrectionStore.getState().hydrate(ADMIN.sbId)
    expect(useCorrectionStore.getState().persistenceError).toBeTruthy()
    const res = await post()
    expect(res.kind).toBe('refused')
    expect(correctDocument).not.toHaveBeenCalled()
  })

  it('a DIFFERENT document is not blocked by another document\'s unknown', async () => {
    await inEditMode()
    correctDocument.mockResolvedValue({
      ok: false, error: 'şəbəkə', status: 0, code: '', data: null, docNum: null, rowCount: 0,
    })
    await post()
    expect(useCorrectionStore.getState().blockingFor('SND-OTHER')).toBe(null)
  })
})

describe('enterEditMode — the header must not inherit a previous draft', () => {
  it('clears fields the caller does not supply', async () => {
    okCore()
    useOperationStore.setState(useOperationStore.getInitialState(), true)
    await useOperationStore.getState().load(ADMIN)
    /* A previous draft's header, with fields the corrected document has no
       business inheriting. */
    useOperationStore.setState({
      header: {
        d: '2026-01-01', t: 'Silinmə', w: 'Ələt', w2: 'Astara', p: 'KÖHNƏ',
        ch: 'KÖHNƏ-CH', ct: 'KÖHNƏ-CT', iv: 'KÖHNƏ-IV', note: 'köhnə qeyd', pr: '99',
      },
    })
    useOperationStore.getState().enterEditMode(
      { docNum: 'SND-1', restore: new Map(), type: 'Satınalma', direction: 'in' },
      [LINE] as never,
      { d: '2026-01-02', t: 'Satınalma', w: 'Ələt', p: 'P', ch: '', ct: '', iv: 'IV-9', w2: '', note: '', pr: '' },
    )
    const h = useOperationStore.getState().header
    expect(h).toMatchObject({
      d: '2026-01-02', t: 'Satınalma', w: 'Ələt', p: 'P',
      w2: '', ch: '', ct: '', iv: 'IV-9', note: '', pr: '',
    })
    /* Nothing from the previous header survived. */
    expect(JSON.stringify(h)).not.toContain('KÖHNƏ')
    expect(JSON.stringify(h)).not.toContain('köhnə')
  })

  it('a partial header patch leaves the OMITTED fields blank, not inherited', async () => {
    okCore()
    useOperationStore.setState(useOperationStore.getInitialState(), true)
    await useOperationStore.getState().load(ADMIN)
    useOperationStore.setState({
      header: {
        d: 'x', t: 'x', w: 'x', w2: 'x', p: 'x',
        ch: 'x', ct: 'x', iv: 'LEAK', note: 'LEAK', pr: 'LEAK',
      },
    })
    /* Only three fields supplied — the rest MUST be blank. */
    useOperationStore.getState().enterEditMode(
      { docNum: 'SND-1', restore: new Map(), type: 'Satınalma', direction: 'in' },
      [LINE] as never,
      { d: '2026-01-02', t: 'Satınalma', w: 'Ələt' },
    )
    const h = useOperationStore.getState().header
    expect(h.iv).toBe('')
    expect(h.note).toBe('')
    expect(h.pr).toBe('')
    expect(h.w2).toBe('')
  })
})

describe('the persisted draft in edit mode', () => {
  it('saveDraftNow REMOVES the stored draft rather than writing one', async () => {
    okCore()
    useOperationStore.setState(useOperationStore.getInitialState(), true)
    await useOperationStore.getState().load(ADMIN)
    useOperationStore.getState().saveDraftNow(ADMIN)
    /* A normal draft exists first… */
    useOperationStore.setState({ lines: [LINE] as never })
    useOperationStore.getState().saveDraftNow(ADMIN)
    const keys = Object.keys(localStorage)
    expect(keys.some((k) => localStorage.getItem(k))).toBe(true)

    /* …and entering edit mode removes it on the next save, with no second
       clearing call anywhere (M7-52). */
    useOperationStore.getState().enterEditMode(
      { docNum: 'SND-1', restore: new Map(), type: 'Satınalma', direction: 'in' },
      [LINE] as never,
      { d: '2026-01-02', t: 'Satınalma', w: 'Ələt' },
    )
    useOperationStore.getState().saveDraftNow(ADMIN)
    for (const k of Object.keys(localStorage)) {
      if (k.includes('draft')) expect(localStorage.getItem(k)).toBe(null)
    }
  })
})


/* ===========================================================================
   I-6 finding 1, AT THE STORE — an explicit failure body must not become a
   confirmed success. The helper tests pin the contract; these pin the OUTCOME
   the user actually gets, which is the thing that matters: a `corrected`
   verdict clears the D6 record and announces a replacement document.
   ======================================================================== */

describe('a 2xx body that declares its own failure', () => {
  const okEnvelope = (data: unknown) => ({
    ok: true, error: null, status: 200, code: null,
    data, docNum: 'SND-1', rowCount: 1, newDocNum: 'SND-2', reversalDocNum: 'SND-R',
  })

  const cases: [string, unknown][] = [
    ['ok:false', { ok: false, original_doc_num: 'SND-1', new_doc_num: 'SND-2' }],
    ['success:false', { success: false, new_doc_num: 'SND-2' }],
    ['an error string', { error: 'icazə yoxdur', new_doc_num: 'SND-2' }],
    ['a replacement equal to the original', { new_doc_num: 'SND-1' }],
    ['a reversal equal to the original', {
      new_doc_num: 'SND-2', reversal_doc_num: 'SND-1',
    }],
  ]

  for (const [label, data] of cases) {
    it(`is UNKNOWN, not corrected, for ${label}`, async () => {
      await inEditMode()
      correctDocument.mockResolvedValue(okEnvelope(data))
      const res = await post()

      /* NOT a success: no replacement is announced. */
      expect(res.kind).toBe('correction-unknown')
      /* NEVER the false positive claim — the body gave no evidence of a
         rollback either, so the document state is genuinely unknown. */
      expect(res.message).not.toContain('dəyişməyib')
      expect(res.message).toContain('SND-1')
      /* And the repeat protection STANDS. */
      expect(useCorrectionStore.getState().blockingFor('SND-1')).not.toBe(null)
    })
  }

  it('keeps edit mode and the draft on an unknown body', async () => {
    await inEditMode()
    correctDocument.mockResolvedValue(okEnvelope({ ok: false, new_doc_num: 'SND-2' }))
    await post()
    expect(useOperationStore.getState().editDoc).not.toBe(null)
    expect(useOperationStore.getState().lines).toHaveLength(1)
  })

  it('refuses a SECOND correction of the same document afterwards', async () => {
    await inEditMode()
    correctDocument.mockResolvedValue(okEnvelope({ ok: false, new_doc_num: 'SND-2' }))
    await post()
    correctDocument.mockClear()

    const again = await post()
    expect(again.kind).toBe('refused')
    expect(again.message).toContain('SND-1')
    /* The load-bearing assertion: no second RPC was dispatched. */
    expect(correctDocument).not.toHaveBeenCalled()
  })
})

/* ===========================================================================
   I-6 finding 2, AT THE STORE — a confirmed success stays protected until the
   post-write reload has RECONCILED the screen.
   ======================================================================== */

describe('protection across the post-write reload', () => {
  const goodBody = {
    ok: true, error: null, status: 200, code: null,
    data: { original_doc_num: 'SND-1', new_doc_num: 'SND-2', row_count: 1 },
    docNum: 'SND-1', rowCount: 1, newDocNum: 'SND-2', reversalDocNum: 'SND-R',
  }

  it('BLOCKS while the reload is still in flight', async () => {
    await inEditMode()
    correctDocument.mockResolvedValue(goodBody)

    /* Hold the reload open on its first core read, and inspect the block at
       exactly the moment the old rule released it: phase `success`,
       `refreshFailed` false, reload not yet resolved. */
    let release!: () => void
    const held = new Promise<void>((r) => { release = r })
    let blockedDuringReload: unknown = 'not observed'
    fetchItems.mockImplementationOnce(async () => {
      blockedDuringReload = useCorrectionStore.getState().blockingFor('SND-1')
      await held
      return { rows: [], ok: true, error: null }
    })

    const pending = post()
    await Promise.resolve()
    release()
    const res = await pending

    expect(blockedDuringReload).not.toBe(null)
    expect(blockedDuringReload).not.toBe('not observed')
    /* And once reconciled, the block is gone. */
    expect(res.kind).toBe('corrected')
    expect(useCorrectionStore.getState().blockingFor('SND-1')).toBe(null)
  })

  it('KEEPS the block when the reload fails, and confirms the success', async () => {
    await inEditMode()
    correctDocument.mockResolvedValue(goodBody)
    fetchItems.mockResolvedValueOnce({ rows: [], ok: false, error: 'şəbəkə xətası' })

    const res = await post()
    expect(res.kind).toBe('correction-stale')
    /* The write is CONFIRMED — both documents are named — and only the SCREEN
       is stale. The message must not read as doubt about the correction. */
    expect(res.message).toContain('SND-1')
    expect(res.message).toContain('SND-2')
    expect(res.message).not.toContain('dəyişməyib')

    const rec = useCorrectionStore.getState().blockingFor('SND-1')
    expect(rec).not.toBe(null)
    expect(rec?.phase).toBe('success')
    expect(rec?.refreshFailed).toBe(true)
  })

  it('KEEPS the block when the reload THROWS, and still reports the outcome', async () => {
    await inEditMode()
    correctDocument.mockResolvedValue(goodBody)
    /* `load()` has a rejection handler only on its warehouses leg, so a
       rejecting reader propagates. Unguarded this threw out of `postDocument`
       entirely: no outcome for the caller, and a record left permanently
       success/not-reconciled — blocking nothing. */
    fetchItems.mockRejectedValueOnce(new Error('bağlantı kəsildi'))

    const res = await post()
    expect(res.kind).toBe('correction-stale')
    expect(res.message).toContain('SND-2')

    const rec = useCorrectionStore.getState().blockingFor('SND-1')
    expect(rec).not.toBe(null)
    expect(rec?.refreshFailed).toBe(true)
  })

  it('a stale success SURVIVES a reload of the page and still blocks', async () => {
    await inEditMode()
    correctDocument.mockResolvedValue(goodBody)
    fetchItems.mockResolvedValueOnce({ rows: [], ok: false, error: 'şəbəkə xətası' })
    await post()

    /* Simulate a page reload: in-memory state dies, sessionStorage does not. */
    useCorrectionStore.getState().reset()
    expect(useCorrectionStore.getState().blockingFor('SND-1')).toBe(null)
    useCorrectionStore.getState().hydrate(ADMIN.sbId)

    const rec = useCorrectionStore.getState().blockingFor('SND-1')
    expect(rec?.docNum).toBe('SND-1')
    expect(rec?.refreshFailed).toBe(true)
  })

  it('a record persisted WITHOUT `reconciled` is read as not reconciled', () => {
    /* Forward-compatibility in the fail-closed direction: a record written
       before the flag existed cannot prove reconciliation happened, so it
       blocks rather than silently releasing. */
    const scope = scopeOf(ADMIN.sbId)
    sessionStorage.setItem('anbar_correction_unresolved_' + scope, JSON.stringify({
      old: {
        id: 'old', docNum: 'SND-7', newDocNum: 'SND-8', phase: 'success',
        refreshFailed: false, scope, lineCount: 1,
      },
    }))
    useCorrectionStore.getState().hydrate(ADMIN.sbId)
    expect(useCorrectionStore.getState().blockingFor('SND-7')).not.toBe(null)
  })
})
