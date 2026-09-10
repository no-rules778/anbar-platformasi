import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

/* Supabase is mocked at the API BOUNDARY: the real api/documentCancel module
   runs, so the RPC names and argument objects asserted here are the ones the
   production code actually builds. */
vi.mock('../../api/supabase', () => ({ supabase: { rpc: vi.fn() } }))

/* jsdom serves from localhost, where the mutation guard blocks every write by
   design. These tests are about batch BEHAVIOUR, so the guard is opened — and
   the block itself is proven at the end of this file with the real guard. */
vi.mock('../../lib/mutationGuard', async (orig) => ({
  ...(await orig<typeof import('../../lib/mutationGuard')>()),
  blockedReason: vi.fn(() => null),
}))

import { supabase } from '../../api/supabase'
import { blockedReason } from '../../lib/mutationGuard'
import { BatchCancelDialog } from './BatchCancelDialog'
import { useBatchCancelStore, scopeOf } from '../../store/batchCancel.store'
import type { BatchMovement } from '../../lib/batchCancel'

let seq = 0
const row = (p: Partial<BatchMovement> = {}): BatchMovement => ({
  id: p.id ?? 'id-' + ++seq,
  item_code: p.item_code ?? 'C1',
  date: p.date ?? '2026-05-10',
  invoice_num: null,
  note: p.note ?? null,
  price: p.price ?? 10,
  created_at: null,
  doc_num: 'doc_num' in p ? p.doc_num! : 'D-1',
  type: p.type ?? 'Satınalma',
  warehouse: p.warehouse ?? 'Elet',
  partner: p.partner ?? null,
  in_qty: p.in_qty ?? 5,
  out_qty: p.out_qty ?? 0,
  created_by: p.created_by ?? 'u1',
} as BatchMovement)

const TWO_DOCS = [
  row({ id: 'a', doc_num: 'D-1', type: 'Satınalma' }),
  row({ id: 'b', doc_num: 'D-2', type: 'Silinmə' }),
]

const toasts: { text: string; isError?: boolean }[] = []

function mount(over: Partial<React.ComponentProps<typeof BatchCancelDialog>> = {}) {
  const onClose = vi.fn()
  const onRefresh = over.onRefresh ?? vi.fn(async () => ({ ok: true, error: null }))
  const props: React.ComponentProps<typeof BatchCancelDialog> = {
    allRows: TWO_DOCS,
    itemBy: new Map([['C1', { name: 'Sement', price: 12 }]]),
    warehouses: ['Elet', 'Astara'],
    layerActive: false,
    layerReady: true,
    isAdmin: true,
    onClose,
    onRefresh,
    onToast: (text: string, isError?: boolean) => { toasts.push({ text, isError }) },
    ...over,
  }
  const utils = render(<BatchCancelDialog {...props} />)
  return { ...utils, onClose, onRefresh, props }
}

/** Select both documents and advance to the confirm step. */
async function selectAndReview(u: ReturnType<typeof userEvent.setup>) {
  await u.click(screen.getByTestId('bc-cb-doc:D-1'))
  await u.click(screen.getByTestId('bc-cb-doc:D-2'))
  await u.click(screen.getByTestId('bc-review'))
}

/** One `results` entry in the shape the RPCs really emit. The identifying
    evidence is `reversal_doc_num` — the counter-document actually written
    (`sql/010:193-198`; layer batch nests `cancel_document`'s own result,
    `sql/003:144`). A body whose entries lack it is NOT success evidence
    (I-5 correction 4). */
const okRow = (n = 'R-1') => ({
  doc_num: 'D-1', is_transfer: false, reversal_doc_num: n, row_count: 2,
})

const rpcOk = (data: unknown) =>
  vi.mocked(supabase.rpc).mockResolvedValue({ data, error: null, status: 200 } as never)

/** A REAL server rejection: a 4xx carrying the raised message. */
const rpcRejected = (message: string) =>
  vi.mocked(supabase.rpc).mockResolvedValue({
    data: null, error: { message, details: '', hint: '', code: 'P0001' }, status: 400,
  } as never)

/** The SYNTHESISED transport error postgrest-js 2.112.4 produces for any fetch
    rejection (dist/index.cjs:422-437): structured, with status 0. */
const rpcTransportFailure = (name = 'TypeError', msg = 'Failed to fetch') =>
  vi.mocked(supabase.rpc).mockResolvedValue({
    data: null,
    error: { message: `${name}: ${msg}`, details: '', hint: '', code: '' },
    status: 0,
    statusText: '',
  } as never)

const lastToast = () => toasts[toasts.length - 1]

/** The store now keeps a LIST of unresolved batches (I-5 audit finding 3), not
    a single record. Most call sites in this file exercise exactly one batch,
    so this reads "the one record, if any" for assertions that predate the
    multi-batch change; the dedicated multi-batch tests read the list directly. */
const soleUnresolved = () => {
  const list = useBatchCancelStore.getState().unresolvedList
  return list.length ? list[0] : null
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(blockedReason).mockReturnValue(null)
  toasts.length = 0
  sessionStorage.clear()
  useBatchCancelStore.getState().reset()
  /* `MovementsPage` hydrates the store on mount, and the dialog now REFUSES to
     dispatch without an established persistence scope (I-5 correction 2). The
     harness mounts the dialog directly, so it hydrates here for the same
     reason the page does. The tests that exercise a persistence FAILURE
     override this deliberately. */
  useBatchCancelStore.getState().hydrate('test-user')
})

/* ===================================================================== */
describe('BatchCancelDialog — selection, filters and gates', () => {
  it('lists ineligible documents with their reason instead of hiding them', () => {
    mount({
      allRows: [
        row({ id: 'a', doc_num: 'OK-1', type: 'Satınalma' }),
        row({ id: 'b', doc_num: 'BAD-1', type: 'Sifariş' }),
      ],
    })
    expect(screen.getByTestId('bc-row-doc:BAD-1')).toBeTruthy()
    expect(screen.getByTestId('bc-cb-doc:BAD-1').hasAttribute('disabled')).toBe(true)
    expect(screen.getByTestId('bc-cb-doc:OK-1').hasAttribute('disabled')).toBe(false)
  })

  /* «seçim filtrlə itmir» (index.html:5446-5453). A selection made before a
     filter change survives it, so the count must be reported independently of
     the visible list — the selected rows can be off-screen. */
  it('keeps a selection that a later filter hides, and still counts it', async () => {
    const u = userEvent.setup()
    mount()
    await u.click(screen.getByTestId('bc-cb-doc:D-1'))
    expect(screen.getByTestId('bc-selcnt').textContent).toContain('1')

    await u.type(screen.getByTestId('bc-doc'), 'D-2')
    /* D-1 is now filtered out of the list… */
    expect(screen.queryByTestId('bc-row-doc:D-1')).toBeNull()
    /* …but it is still selected and still counted. */
    expect(screen.getByTestId('bc-selcnt').textContent).toContain('1')
  })

  it('blocks execution while the layer capability is unknown', async () => {
    const u = userEvent.setup()
    mount({ layerReady: false })
    await selectAndReview(u)
    expect(screen.getByTestId('bc-exec').hasAttribute('disabled')).toBe(true)
    expect(supabase.rpc).not.toHaveBeenCalled()
  })

  it('blocks execution for a non-admin', async () => {
    const u = userEvent.setup()
    mount({ isAdmin: false })
    await selectAndReview(u)
    expect(screen.getByTestId('bc-exec').hasAttribute('disabled')).toBe(true)
    expect(supabase.rpc).not.toHaveBeenCalled()
  })

  it('sends the layer RPC when layers are active', async () => {
    const u = userEvent.setup()
    rpcOk({ document_count: 2, results: [okRow('R-1'), okRow('R-2')] })
    mount({ layerActive: true })
    await selectAndReview(u)
    await u.click(screen.getByTestId('bc-exec'))
    await waitFor(() => expect(supabase.rpc).toHaveBeenCalled())
    expect(vi.mocked(supabase.rpc).mock.calls[0][0]).toBe('cancel_layer_documents_batch')
  })

  it('omits p_reversal_date entirely when the date is blank', async () => {
    const u = userEvent.setup()
    rpcOk({ cancelled_count: 2, results: [okRow('R-1'), okRow('R-2')] })
    mount()
    await selectAndReview(u)
    await u.click(screen.getByTestId('bc-exec'))
    await waitFor(() => expect(supabase.rpc).toHaveBeenCalled())
    expect(vi.mocked(supabase.rpc).mock.calls[0][1]).toEqual({ p_doc_nums: ['D-1', 'D-2'] })
  })
})

/* ===================================================================== */
describe('BatchCancelDialog — the four outcomes', () => {
  it('A. confirmed success reports the SERVER count and refreshes', async () => {
    const u = userEvent.setup()
    rpcOk({ cancelled_count: 2, results: [okRow('R-1'), okRow('R-2')] })
    const { onRefresh, onClose } = mount()
    await selectAndReview(u)
    await u.click(screen.getByTestId('bc-exec'))
    await waitFor(() => expect(onClose).toHaveBeenCalled())
    expect(onRefresh).toHaveBeenCalled()
    expect(lastToast().text).toContain('2 sənəd')
    expect(lastToast().isError).toBe(false)
  })

  it('A. a count-free but coherent success claims no number, and never 0', async () => {
    const u = userEvent.setup()
    rpcOk({ results: [okRow('R-1'), okRow('R-2')] })
    mount()
    await selectAndReview(u)
    await u.click(screen.getByTestId('bc-exec'))
    await waitFor(() => expect(lastToast().text).toContain('ləğv edildi'))
    expect(lastToast().text).not.toMatch(/\d/)
  })

  it('B. a 4xx rejection surfaces the server text verbatim and says nothing was cancelled', async () => {
    const u = userEvent.setup()
    const serverText = 'Bu sənəd artıq ləğv edilib: D-2'
    rpcRejected(serverText)
    const { onClose } = mount()
    await selectAndReview(u)
    await u.click(screen.getByTestId('bc-exec'))
    await waitFor(() => expect(lastToast().isError).toBe(true))
    expect(lastToast().text).toContain(serverText)
    expect(lastToast().text).toContain('heç bir sənəd ləğv edilmədi')
    /* A confirmed rejection is the ONE outcome that leaves the dialog usable:
       the server is known not to have written, so retry is safe. */
    expect(onClose).not.toHaveBeenCalled()
    expect(screen.getByTestId('bc-exec').hasAttribute('disabled')).toBe(false)
    expect(soleUnresolved()).toBeNull()
  })

  /* THE CENTRAL CASE. postgrest-js synthesises a structured error with status 0
     for any fetch failure. Classifying on "an error object exists" would report
     «heç bir sənəd ləğv edilmədi» — while the batch may well have committed. */
  it('C. a structured SDK transport error becomes UNKNOWN, never a rejection', async () => {
    const u = userEvent.setup()
    rpcTransportFailure()
    const { onClose } = mount()
    await selectAndReview(u)
    await u.click(screen.getByTestId('bc-exec'))
    await waitFor(() => expect(lastToast().isError).toBe(true))
    expect(lastToast().text).toContain('təsdiqlənmədi')
    expect(lastToast().text).not.toContain('heç bir sənəd ləğv edilmədi')
    expect(onClose).not.toHaveBeenCalled()
    expect(soleUnresolved()).toMatchObject({
      docNums: ['D-1', 'D-2'], refreshFailed: false,
    })
  })

  it('C. an aborted request becomes UNKNOWN', async () => {
    const u = userEvent.setup()
    rpcTransportFailure('AbortError', 'The operation was aborted')
    mount()
    await selectAndReview(u)
    await u.click(screen.getByTestId('bc-exec'))
    await waitFor(() => expect(soleUnresolved()).not.toBeNull())
    expect(lastToast().text).not.toContain('heç bir sənəd ləğv edilmədi')
  })

  it.each([502, 503, 504])('C. a %i gateway response becomes UNKNOWN', async (status) => {
    const u = userEvent.setup()
    vi.mocked(supabase.rpc).mockResolvedValue({
      data: null, error: { message: 'Gateway', details: '', hint: '', code: '' }, status,
    } as never)
    mount()
    await selectAndReview(u)
    await u.click(screen.getByTestId('bc-exec'))
    await waitFor(() => expect(soleUnresolved()).not.toBeNull())
  })

  it.each([
    ['an empty object', {}],
    ['a contradictory count', { cancelled_count: 7 }],
    ['a non-integer count', { cancelled_count: '2' }],
    ['results disagreeing with the count', { cancelled_count: 2, results: [{}] }],
    ['no confirmation evidence', { layer_version: 36 }],
    ['an explicit failure marker', { success: false, results: [{}, {}] }],
  ])('C. a 2xx with %s becomes UNKNOWN, not success', async (_label, body) => {
    const u = userEvent.setup()
    rpcOk(body)
    const { onClose } = mount()
    await selectAndReview(u)
    await u.click(screen.getByTestId('bc-exec'))
    await waitFor(() => expect(soleUnresolved()).not.toBeNull())
    expect(onClose).not.toHaveBeenCalled()
    expect(lastToast().text).toContain('təsdiqlənmədi')
  })

  /* §8 — legacy puts the refresh inside the same try as the RPC (5491-5504),
     so a refresh failing AFTER a successful cancellation reports «heç bir sənəd
     ləğv edilmədi», which is false, and re-enables the button. */
  /* I-5 CORRECTION 1. The success message stays accurate — the server
     confirmed the cancellation before the refresh was ever attempted — but
     the record is now KEPT in the `'success'` phase and the dialog stays
     open. Previously the dialog closed and recorded nothing, so reopening
     against the stale rows re-permitted the very same batch. */
  it('D. a failed refresh after SUCCESS still reports the success, and KEEPS a record', async () => {
    const u = userEvent.setup()
    rpcOk({ cancelled_count: 2, results: [okRow('R-1'), okRow('R-2')] })
    const onRefresh = vi.fn(async () => ({ ok: false, error: 'network' }))
    const { onClose } = mount({ onRefresh })
    await selectAndReview(u)
    await u.click(screen.getByTestId('bc-exec'))
    await waitFor(() => expect(lastToast().text).toContain('ləğv edildi'))
    expect(lastToast().text).not.toContain('heç bir sənəd ləğv edilmədi')
    /* It IS flagged, because the on-screen list is stale. */
    expect(lastToast().isError).toBe(true)
    /* The dialog does NOT close — the block belongs where the user is. */
    expect(onClose).not.toHaveBeenCalled()
    /* And the protection is retained, marked as a CONFIRMED success. */
    const rec = soleUnresolved()
    expect(rec).not.toBeNull()
    expect(rec!.phase).toBe('success')
    expect(rec!.refreshFailed).toBe(true)
    expect(rec!.docNums).toEqual(['D-1', 'D-2'])
  })

  it('D. a SUCCEEDING refresh closes the dialog and leaves no block once rows are fresh', async () => {
    const u = userEvent.setup()
    rpcOk({ cancelled_count: 2, results: [okRow('R-1'), okRow('R-2')] })
    const { onClose } = mount()
    await selectAndReview(u)
    await u.click(screen.getByTestId('bc-exec'))
    await waitFor(() => expect(onClose).toHaveBeenCalled())
    expect(lastToast().text).toContain('ləğv edildi')
    expect(lastToast().isError).toBe(false)
  })

  it('D-vs-C. a failed refresh after an UNKNOWN stays UNKNOWN, not a success', async () => {
    const u = userEvent.setup()
    rpcTransportFailure()
    const onRefresh = vi.fn(async () => ({ ok: false, error: 'network' }))
    mount({ onRefresh })
    await selectAndReview(u)
    await u.click(screen.getByTestId('bc-exec'))
    await waitFor(() => expect(soleUnresolved()).not.toBeNull())
    expect(soleUnresolved()!.refreshFailed).toBe(true)
    expect(lastToast().text).not.toContain('ləğv edildi')
  })
})

/* ===================================================================== */
describe('BatchCancelDialog — resubmission after an unknown outcome', () => {
  it('preserves the submitted list and blocks resubmitting those documents', async () => {
    const u = userEvent.setup()
    rpcTransportFailure()
    mount()
    await selectAndReview(u)
    await u.click(screen.getByTestId('bc-exec'))
    await waitFor(() => expect(soleUnresolved()).not.toBeNull())

    expect(screen.getByTestId('bc-unresolved-docs').textContent).toContain('D-1')
    expect(screen.getByTestId('bc-unresolved-docs').textContent).toContain('D-2')
    expect(screen.getByTestId('bc-exec').hasAttribute('disabled')).toBe(true)

    /* A second attempt sends nothing. */
    const callsAfterFirst = vi.mocked(supabase.rpc).mock.calls.length
    await u.click(screen.getByTestId('bc-exec'))
    expect(vi.mocked(supabase.rpc).mock.calls.length).toBe(callsAfterFirst)
  })

  /* Closing a dialog is not evidence about a database. The record lives in its
     own store precisely so unmounting cannot clear it. */
  it('survives closing and reopening the dialog', async () => {
    const u = userEvent.setup()
    rpcTransportFailure()
    const first = mount()
    await selectAndReview(u)
    await u.click(screen.getByTestId('bc-exec'))
    await waitFor(() => expect(soleUnresolved()).not.toBeNull())

    first.unmount()
    mount()
    expect(screen.getByTestId('bc-unresolved').textContent).toContain('təsdiqlənməyib')

    /* And it still blocks those documents on the reopened dialog. */
    await u.click(screen.getByTestId('bc-cb-doc:D-1'))
    await u.click(screen.getByTestId('bc-review'))
    expect(screen.getByTestId('bc-exec').hasAttribute('disabled')).toBe(true)
  })

  /* A refresh returning rows with no cancellation markers does NOT prove a
     rollback: the original transaction may still be running. */
  it('is NOT cleared merely by a successful refresh', async () => {
    const u = userEvent.setup()
    rpcTransportFailure()
    const onRefresh = vi.fn(async () => ({ ok: true, error: null }))
    mount({ onRefresh })
    await selectAndReview(u)
    await u.click(screen.getByTestId('bc-exec'))
    await waitFor(() => expect(onRefresh).toHaveBeenCalled())
    expect(soleUnresolved()).not.toBeNull()
  })

  it('leaves untouched documents cancellable', async () => {
    const u = userEvent.setup()
    useBatchCancelStore.getState().markUnresolved(['D-1'], false)
    rpcOk({ cancelled_count: 1, results: [okRow('R-1')] })
    mount()
    await u.click(screen.getByTestId('bc-cb-doc:D-2'))
    await u.click(screen.getByTestId('bc-review'))
    expect(screen.getByTestId('bc-exec').hasAttribute('disabled')).toBe(false)
    await u.click(screen.getByTestId('bc-exec'))
    await waitFor(() => expect(supabase.rpc).toHaveBeenCalled())
    expect(vi.mocked(supabase.rpc).mock.calls[0][1]).toMatchObject({ p_doc_nums: ['D-2'] })
  })

  /* REGRESSION — I-5 audit finding 3. `markUnresolved(B)` must not silently
     overwrite the unresolved record for an EARLIER batch A, leaving A's
     documents wrongly resubmittable while A's outcome is still unknown. */
  it('keeps a SECOND unresolved batch alongside the first, blocking both sets of documents', () => {
    useBatchCancelStore.getState().markUnresolved(['D-1'], false)
    useBatchCancelStore.getState().markUnresolved(['D-9'], false)
    const list = useBatchCancelStore.getState().unresolvedList
    expect(list).toHaveLength(2)
    expect(list.map((u) => u.docNums).flat().sort()).toEqual(['D-1', 'D-9'])

    mount({
      allRows: [...TWO_DOCS, row({ id: 'c', doc_num: 'D-9', type: 'Satınalma' })],
    })
    expect(screen.getByTestId('bc-unresolved').textContent).toContain('D-1')
    expect(screen.getByTestId('bc-unresolved').textContent).toContain('D-9')
  })

  /* REGRESSION — I-5 audit finding 5. Reconciliation is wired to the existing
     `docCancelledBy` marker read: once the CURRENT rows show a genuine
     cancellation marker for every document in an unresolved batch, that
     batch's record is cleared automatically — but a record with a MISSING
     marker, or belonging to a different unresolved batch, is untouched. */
  it('clears an unresolved record once its documents show a real cancellation marker', async () => {
    useBatchCancelStore.getState().markUnresolved(['D-1'], false)
    const cancelledRows: BatchMovement[] = [
      ...TWO_DOCS,
      row({ id: 'rev', doc_num: 'REV-1', note: 'Ləğv: D-1', type: 'Satınalma' }),
    ]
    mount({ allRows: cancelledRows })
    await waitFor(() => expect(useBatchCancelStore.getState().unresolvedList).toHaveLength(0))
  })

  it('does NOT clear a record whose documents show no marker yet', () => {
    useBatchCancelStore.getState().markUnresolved(['D-1'], false)
    mount({ allRows: TWO_DOCS })
    expect(useBatchCancelStore.getState().unresolvedList).toHaveLength(1)
  })

  it('clears only the batch whose documents are confirmed, leaving an unrelated one held', async () => {
    useBatchCancelStore.getState().markUnresolved(['D-1'], false)
    useBatchCancelStore.getState().markUnresolved(['D-2'], false)
    const cancelledRows: BatchMovement[] = [
      ...TWO_DOCS,
      row({ id: 'rev', doc_num: 'REV-1', note: 'Ləğv: D-1', type: 'Satınalma' }),
    ]
    mount({ allRows: cancelledRows })
    await waitFor(() => {
      const list = useBatchCancelStore.getState().unresolvedList
      expect(list).toHaveLength(1)
      expect(list[0].docNums).toEqual(['D-2'])
    })
  })
})

/* ===================================================================== */
describe('BatchCancelDialog — submission protection across dialog close/reopen', () => {
  /* REGRESSION — I-5 audit finding 4. `Dialog`'s own × and mask call `onClose`
     unconditionally, even mid-request (`ui/Dialog.tsx`), and `onClose` here
     unmounts the component — destroying the `submitting` ref. A reopened
     instance's fresh ref must still refuse to resend documents whose first
     request has not yet resolved. */
  it('refuses to resubmit the same documents from a freshly reopened instance while the first request is still pending', async () => {
    const u = userEvent.setup()
    let resolveFirst!: (v: unknown) => void
    vi.mocked(supabase.rpc).mockReturnValueOnce(
      new Promise((r) => { resolveFirst = r }) as never,
    )
    const first = mount()
    await selectAndReview(u)
    await u.click(screen.getByTestId('bc-exec'))
    /* The RPC call is outstanding — nothing has resolved yet. */
    expect(vi.mocked(supabase.rpc).mock.calls.length).toBe(1)

    /* Simulate the mask/× unmounting the dialog while the request is still in
       flight (its promise has not resolved, so `execute`'s `finally` — and
       therefore `endPending` — has not run). */
    first.unmount()

    const second = mount()
    await u.click(second.getByTestId('bc-cb-doc:D-1'))
    await u.click(second.getByTestId('bc-cb-doc:D-2'))
    await u.click(second.getByTestId('bc-review'))
    await u.click(second.getByTestId('bc-exec'))

    /* No second RPC call was made — the store-level pending reservation from
       the FIRST instance still holds these documents. */
    expect(vi.mocked(supabase.rpc).mock.calls.length).toBe(1)

    /* Resolving the original request releases the reservation. */
    resolveFirst({ data: { cancelled_count: 2, results: [{}, {}] }, error: null, status: 200 })
    await waitFor(() => expect(useBatchCancelStore.getState().isPending(['D-1', 'D-2'])).toBe(false))
  })

  /* REGRESSION — I-5 audit finding 4. The mask and × must not close the
     dialog while a request is genuinely in flight, in this same instance. */
  it('the mask click does not close the dialog while a request is in flight', async () => {
    const u = userEvent.setup()
    vi.mocked(supabase.rpc).mockReturnValue(new Promise(() => {}) as never)
    const { onClose, container } = mount()
    await selectAndReview(u)
    await u.click(screen.getByTestId('bc-exec'))

    const mask = container.querySelector('.mask') as HTMLElement
    expect(mask).toBeTruthy()
    await u.click(mask)
    expect(onClose).not.toHaveBeenCalled()
  })
})

/* ===================================================================== */
describe('BatchCancelDialog — stale eligibility and duplicate submission', () => {
  /* Legacy builds BC.docs once (5375) and the confirm step re-filters on that
     stale flag (5454), so a document cancelled meanwhile is still submitted and
     the server aborts the WHOLE batch naming a document the user never chose. */
  it('drops a document that became cancelled, and requires renewed confirmation', async () => {
    const u = userEvent.setup()
    rpcOk({ cancelled_count: 1, results: [okRow('R-1')] })
    const { rerender, props } = mount()
    await selectAndReview(u)
    expect(screen.getByTestId('bc-exec').textContent).toContain('2')

    /* Another admin cancels D-2 while the confirm step stands open. */
    rerender(
      <BatchCancelDialog
        {...props}
        allRows={[...TWO_DOCS, row({ id: 'rev', doc_num: 'REV', note: 'Ləğv: D-2' })]}
      />,
    )
    expect(screen.getByTestId('bc-dropped').textContent).toContain('D-2')

    /* The first click does NOT send: the confirmed list no longer matches. */
    await u.click(screen.getByTestId('bc-exec'))
    expect(supabase.rpc).not.toHaveBeenCalled()
    expect(lastToast().text).toContain('yenidən təsdiqləyin')

    /* After re-confirming, only the still-eligible document is sent. */
    await u.click(screen.getByTestId('bc-exec'))
    await waitFor(() => expect(supabase.rpc).toHaveBeenCalled())
    expect(vi.mocked(supabase.rpc).mock.calls[0][1]).toMatchObject({ p_doc_nums: ['D-1'] })
  })

  /* SYNCHRONOUS protection. `useState` updates are async and batched: two
     clicks in the same tick both read inFlight as false. The ref is written
     before the first await, so the second click returns immediately. */
  it('sends exactly ONE request for two clicks in the same tick', async () => {
    const u = userEvent.setup()
    let resolve!: (v: unknown) => void
    vi.mocked(supabase.rpc).mockReturnValue(
      new Promise((r) => { resolve = r }) as never,
    )
    mount()
    await selectAndReview(u)

    const btn = screen.getByTestId('bc-exec')
    btn.click()
    btn.click()
    btn.click()
    expect(vi.mocked(supabase.rpc).mock.calls.length).toBe(1)

    resolve({
      data: { cancelled_count: 2, results: [okRow('R-1'), okRow('R-2')] },
      error: null,
      status: 200,
    })
    await waitFor(() => expect(lastToast().text).toContain('ləğv edildi'))
  })

  it('refuses when the selection became entirely ineligible', async () => {
    const u = userEvent.setup()
    const { rerender, props } = mount()
    await u.click(screen.getByTestId('bc-cb-doc:D-1'))
    await u.click(screen.getByTestId('bc-review'))

    rerender(
      <BatchCancelDialog
        {...props}
        allRows={[...TWO_DOCS, row({ id: 'rev', doc_num: 'REV', note: 'Ləğv: D-1' })]}
      />,
    )
    expect(screen.getByTestId('bc-exec').hasAttribute('disabled')).toBe(true)
    expect(supabase.rpc).not.toHaveBeenCalled()
  })
})

/* ===================================================================== */
describe('BatchCancelDialog — the localhost write guard', () => {
  /* With the REAL guard restored, the block is a CONFIRMED rejection: nothing
     was sent, so claiming nothing was written is true here. */
  it('refuses before any network call and reports it as a rejection', async () => {
    const u = userEvent.setup()
    vi.mocked(blockedReason).mockReturnValue('Localhost: yazma əməliyyatı bağlıdır')
    mount()
    await selectAndReview(u)
    await u.click(screen.getByTestId('bc-exec'))
    await waitFor(() => expect(lastToast().isError).toBe(true))
    expect(supabase.rpc).not.toHaveBeenCalled()
    expect(soleUnresolved()).toBeNull()
  })
})

/* =====================================================================
   COMPLETE USER SEQUENCES — I-5 corrections 1, 2 and 3.

   These drive the RENDERED dialog through a whole sequence rather than
   calling store methods, because every one of these corrections is about a
   sequence: what the user can do NEXT after a particular outcome. The
   assertion that matters in most of them is the RPC CALL COUNT — the point
   is that no additional request is dispatched. */

describe('sequence — success, failed refresh, reopen, attempted resubmit (correction 1)', () => {
  /* THE CENTRAL REGRESSION. Server confirms the cancellation; the refresh
     then fails, so the rows on screen are the PRE-cancellation ones and
     every document still looks eligible. Previously the dialog released the
     reservation, recorded nothing and closed — so reopening against those
     stale rows allowed the identical batch to be submitted a second time,
     against documents already cancelled. */
  it('a reopened dialog cannot resubmit a batch whose success is awaiting refresh', async () => {
    const u = userEvent.setup()
    rpcOk({ cancelled_count: 2, results: [okRow('R-1'), okRow('R-2')] })
    /* The refresh fails, so `allRows` stays exactly as it was — no markers. */
    const onRefresh = vi.fn(async () => ({ ok: false, error: 'network' }))

    const first = mount({ onRefresh })
    await selectAndReview(u)
    await u.click(screen.getByTestId('bc-exec'))
    await waitFor(() => expect(lastToast().text).toContain('ləğv edildi'))

    expect(vi.mocked(supabase.rpc).mock.calls.length).toBe(1)
    const afterFirst = vi.mocked(supabase.rpc).mock.calls.length

    /* The user closes and reopens against the STALE rows. */
    first.unmount()
    mount({ onRefresh })

    /* The block is visible, and it says the batch ALREADY SUCCEEDED — it must
       not describe a confirmed success as unconfirmed. */
    const banner = screen.getByTestId('bc-unresolved').textContent ?? ''
    expect(banner).toContain('artıq ləğv edilib')
    expect(banner).not.toContain('təsdiqlənməyib')

    /* Attempting the same batch again: execute is disabled... */
    await u.click(screen.getByTestId('bc-cb-doc:D-1'))
    await u.click(screen.getByTestId('bc-cb-doc:D-2'))
    await u.click(screen.getByTestId('bc-review'))
    expect(screen.getByTestId('bc-exec').hasAttribute('disabled')).toBe(true)

    /* ...and clicking it anyway dispatches NOTHING. ZERO additional RPCs. */
    screen.getByTestId('bc-exec').click()
    await Promise.resolve()
    expect(vi.mocked(supabase.rpc).mock.calls.length).toBe(afterFirst)
  })

  it('the success message stays accurate even when the refresh THROWS', async () => {
    const u = userEvent.setup()
    rpcOk({ cancelled_count: 2, results: [okRow('R-1'), okRow('R-2')] })
    const onRefresh = vi.fn(async () => { throw new Error('boom') })
    mount({ onRefresh: onRefresh as never })
    await selectAndReview(u)
    await u.click(screen.getByTestId('bc-exec'))

    await waitFor(() => expect(lastToast().text).toContain('ləğv edildi'))
    /* A thrown refresh must never be reported as "nothing was cancelled". */
    expect(lastToast().text).not.toContain('heç bir sənəd ləğv edilmədi')
    const rec = soleUnresolved()
    expect(rec).not.toBeNull()
    expect(rec!.phase).toBe('success')
  })

  /* The record is protection, not a permanent penalty: once the rows really
     do show the cancellations, reconciliation clears it automatically. */
  it('the retained success record clears once fresh rows show the markers', async () => {
    const u = userEvent.setup()
    rpcOk({ cancelled_count: 2, results: [okRow('R-1'), okRow('R-2')] })
    const onRefresh = vi.fn(async () => ({ ok: false, error: 'network' }))
    const first = mount({ onRefresh })
    await selectAndReview(u)
    await u.click(screen.getByTestId('bc-exec'))
    await waitFor(() => expect(soleUnresolved()).not.toBeNull())
    first.unmount()

    /* A later load succeeds and brings the reversal rows with it. */
    mount({
      allRows: [
        ...TWO_DOCS,
        row({ id: 'r1', doc_num: 'LEGV-1', note: 'Ləğv: D-1' }),
        row({ id: 'r2', doc_num: 'LEGV-2', note: 'Ləğv: D-2' }),
      ],
    })
    await waitFor(() => expect(soleUnresolved()).toBeNull())
  })
})

describe('sequence — persistence failure blocks dispatch (correction 2)', () => {
  it('refuses to dispatch at all when the pending history cannot be READ', async () => {
    const u = userEvent.setup()
    rpcOk({ cancelled_count: 2, results: [okRow('R-1'), okRow('R-2')] })

    /* The browser denies storage — the client cannot know whether these
       documents already have an unconfirmed attempt against them. */
    const spy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('SecurityError')
    })
    useBatchCancelStore.getState().hydrate('test-user')
    spy.mockRestore()

    mount()
    /* The blocking reason is shown, not hidden. */
    expect(screen.getByTestId('bc-persistence')).toBeTruthy()

    await selectAndReview(u)
    expect(screen.getByTestId('bc-exec').hasAttribute('disabled')).toBe(true)
    screen.getByTestId('bc-exec').click()
    await Promise.resolve()
    /* NOTHING was sent. */
    expect(vi.mocked(supabase.rpc).mock.calls.length).toBe(0)
  })

  it('refuses to dispatch when the attempt cannot be PERSISTED before sending', async () => {
    const u = userEvent.setup()
    rpcOk({ cancelled_count: 2, results: [okRow('R-1'), okRow('R-2')] })
    mount()
    await selectAndReview(u)

    /* Storage fails at the moment of writing the pending record. */
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError')
    })
    await u.click(screen.getByTestId('bc-exec'))
    spy.mockRestore()

    /* Refused, with an actionable message, and no request went out. */
    expect(vi.mocked(supabase.rpc).mock.calls.length).toBe(0)
    expect(lastToast().isError).toBe(true)
    expect(lastToast().text).toContain('göndərilmir')
  })

  it('a reload while the RPC is outstanding restores UNCERTAINTY, not a clean slate', async () => {
    const u = userEvent.setup()
    /* A request that never resolves — the tab reloads mid-flight. */
    vi.mocked(supabase.rpc).mockReturnValue(new Promise(() => {}) as never)
    const first = mount()
    await selectAndReview(u)
    await u.click(screen.getByTestId('bc-exec'))
    await waitFor(() =>
      expect(vi.mocked(supabase.rpc).mock.calls.length).toBe(1))

    /* THE RELOAD: in-memory state dies, storage survives. */
    first.unmount()
    useBatchCancelStore.setState({ unresolvedById: {}, unresolvedList: [] })
    useBatchCancelStore.getState().hydrate('test-user')

    /* The attempt is remembered as pending — uncertainty, not absence. */
    const rec = soleUnresolved()
    expect(rec).not.toBeNull()
    expect(rec!.phase).toBe('pending')
    expect(rec!.docNums).toEqual(['D-1', 'D-2'])

    /* And it blocks resubmitting exactly those documents. */
    mount()
    await u.click(screen.getByTestId('bc-cb-doc:D-1'))
    await u.click(screen.getByTestId('bc-review'))
    expect(screen.getByTestId('bc-exec').hasAttribute('disabled')).toBe(true)
  })
})

describe('sequence — a damaged stored record blocks dispatch (correction 2b)', () => {
  /* Storage is READABLE and the JSON is VALID; one RECORD inside it is
     damaged. Previously that record was silently dropped, `persistenceError`
     stayed null, its documents stopped being blocked, and the batch could be
     resubmitted. Valid JSON is not a readable attempt history. */
  const seedDamaged = (extra: Record<string, unknown> = {}) => {
    const scope = scopeOf('test-user')
    sessionStorage.setItem('anbar_batch_unresolved_' + scope, JSON.stringify({
      damaged: {
        id: 'damaged', docNums: ['D-2'], refreshFailed: 'CORRUPT',
        phase: 'unknown', scope,
      },
      ...extra,
    }))
    useBatchCancelStore.getState().hydrate('test-user')
  }

  it('sends ZERO RPCs when a stored record for these documents is damaged', async () => {
    const u = userEvent.setup()
    rpcOk({ cancelled_count: 2, results: [okRow('R-1'), okRow('R-2')] })
    seedDamaged()

    mount()
    /* The reason is shown, not hidden. */
    expect(screen.getByTestId('bc-persistence')).toBeTruthy()

    await selectAndReview(u)
    expect(screen.getByTestId('bc-exec').hasAttribute('disabled')).toBe(true)
    /* Clicking anyway dispatches nothing — the gate is in the store, so a
       click that bypassed the disabled attribute still sends zero. */
    screen.getByTestId('bc-exec').click()
    await Promise.resolve()
    expect(vi.mocked(supabase.rpc).mock.calls.length).toBe(0)
  })

  it('an ENTIRELY invalid record map still sends ZERO RPCs', async () => {
    const u = userEvent.setup()
    rpcOk({ cancelled_count: 2, results: [okRow('R-1'), okRow('R-2')] })
    sessionStorage.setItem(
      'anbar_batch_unresolved_' + scopeOf('test-user'),
      JSON.stringify({ bad: 'garbage' }),
    )
    useBatchCancelStore.getState().hydrate('test-user')

    mount()
    await selectAndReview(u)
    screen.getByTestId('bc-exec').click()
    await Promise.resolve()
    expect(vi.mocked(supabase.rpc).mock.calls.length).toBe(0)
    expect(useBatchCancelStore.getState().persistenceError).toBeTruthy()
  })

  it('a VALID sibling still blocks its own documents while the error stands', async () => {
    const u = userEvent.setup()
    rpcOk({ cancelled_count: 1, results: [okRow('R-1')] })
    const scope = scopeOf('test-user')
    seedDamaged({
      good: { id: 'good', docNums: ['D-1'], refreshFailed: false, phase: 'unknown', scope },
    })

    /* The readable record survived alongside the error. */
    const held = useBatchCancelStore.getState().unresolvedList
    expect(held).toHaveLength(1)
    expect(held[0].docNums).toEqual(['D-1'])

    mount()
    await selectAndReview(u)
    screen.getByTestId('bc-exec').click()
    await Promise.resolve()
    expect(vi.mocked(supabase.rpc).mock.calls.length).toBe(0)
  })

  it('normal hydration is unaffected — a clean history still dispatches', async () => {
    const u = userEvent.setup()
    rpcOk({ cancelled_count: 2, results: [okRow('R-1'), okRow('R-2')] })
    /* No damaged record: the ordinary path must still work end to end. */
    mount()
    expect(screen.queryByTestId('bc-persistence')).toBeNull()
    await selectAndReview(u)
    await u.click(screen.getByTestId('bc-exec'))
    await waitFor(() => expect(lastToast().text).toContain('ləğv edildi'))
    expect(vi.mocked(supabase.rpc).mock.calls.length).toBe(1)
  })
})

describe('sequence — reconciliation by document family (correction 3)', () => {
  const T1 = row({ id: 't1', doc_num: 'T-1', type: 'Yerdəyişmə', warehouse: 'Elet', out_qty: 4, in_qty: 0 })
  const T1IN = row({ id: 't1b', doc_num: 'T-1', type: 'Yerdəyişmə', warehouse: 'Astara', in_qty: 4, out_qty: 0 })

  /* A TRANSFER batch. Its cancellation marker is «Ləğv (əks yerdəyişmə): T-1»,
     which `docCancelledBy` never matches — so before this correction such a
     record could never resolve and the block was permanent. */
  it('resolves a TRANSFER batch once its reversal marker appears', async () => {
    const u = userEvent.setup()
    rpcTransportFailure()
    const first = mount({ allRows: [T1, T1IN] })
    await u.click(screen.getByTestId('bc-cb-doc:T-1'))
    await u.click(screen.getByTestId('bc-review'))
    await u.click(screen.getByTestId('bc-exec'))
    await waitFor(() => expect(soleUnresolved()).not.toBeNull())
    first.unmount()

    mount({
      allRows: [
        T1, T1IN,
        row({ id: 'rev', doc_num: 'REV-1', type: 'Yerdəyişmə', note: 'Ləğv (əks yerdəyişmə): T-1' }),
      ],
    })
    await waitFor(() => expect(soleUnresolved()).toBeNull())
  })

  it('a transfer batch is NOT resolved by the ordinary marker', async () => {
    const u = userEvent.setup()
    rpcTransportFailure()
    const first = mount({ allRows: [T1, T1IN] })
    await u.click(screen.getByTestId('bc-cb-doc:T-1'))
    await u.click(screen.getByTestId('bc-review'))
    await u.click(screen.getByTestId('bc-exec'))
    await waitFor(() => expect(soleUnresolved()).not.toBeNull())
    first.unmount()

    /* The WRONG family's marker must not resolve it. */
    mount({
      allRows: [T1, T1IN, row({ id: 'x', doc_num: 'LEGV-1', note: 'Ləğv: T-1' })],
    })
    await new Promise((r) => setTimeout(r, 0))
    expect(soleUnresolved()).not.toBeNull()
  })

  it('a MIXED batch resolves only when BOTH families show their own marker', async () => {
    const u = userEvent.setup()
    rpcTransportFailure()
    const mixed = [row({ id: 'a', doc_num: 'D-1', type: 'Satınalma' }), T1, T1IN]

    const first = mount({ allRows: mixed })
    await u.click(screen.getByTestId('bc-cb-doc:D-1'))
    await u.click(screen.getByTestId('bc-cb-doc:T-1'))
    await u.click(screen.getByTestId('bc-review'))
    await u.click(screen.getByTestId('bc-exec'))
    await waitFor(() => expect(soleUnresolved()).not.toBeNull())
    first.unmount()

    /* PARTIAL evidence — only the ordinary document is visibly cancelled.
       Absence of the transfer's marker is not evidence of rollback. */
    const partial = mount({
      allRows: [...mixed, row({ id: 'r1', doc_num: 'LEGV-1', note: 'Ləğv: D-1' })],
    })
    await new Promise((r) => setTimeout(r, 0))
    expect(soleUnresolved()).not.toBeNull()
    partial.unmount()

    /* Now BOTH markers are present, each in its own family's form. */
    mount({
      allRows: [
        ...mixed,
        row({ id: 'r1', doc_num: 'LEGV-1', note: 'Ləğv: D-1' }),
        row({ id: 'r2', doc_num: 'REV-1', type: 'Yerdəyişmə', note: 'Ləğv (əks yerdəyişmə): T-1' }),
      ],
    })
    await waitFor(() => expect(soleUnresolved()).toBeNull())
  })

  it('a FAILED refresh leaves a mixed batch held, whatever the stale rows show', async () => {
    const u = userEvent.setup()
    rpcTransportFailure()
    const onRefresh = vi.fn(async () => ({ ok: false, error: 'network' }))
    mount({ allRows: [row({ id: 'a', doc_num: 'D-1', type: 'Satınalma' }), T1, T1IN], onRefresh })
    await u.click(screen.getByTestId('bc-cb-doc:D-1'))
    await u.click(screen.getByTestId('bc-cb-doc:T-1'))
    await u.click(screen.getByTestId('bc-review'))
    await u.click(screen.getByTestId('bc-exec'))

    await waitFor(() => expect(soleUnresolved()).not.toBeNull())
    const rec = soleUnresolved()!
    expect(rec.phase).toBe('unknown')
    expect(rec.refreshFailed).toBe(true)
    expect(rec.docNums.sort()).toEqual(['D-1', 'T-1'])
  })
})

/* CORRECTION 4, through the RENDERED path rather than the helper alone. */
describe('sequence — invalid success evidence renders UNKNOWN (correction 4)', () => {
  it.each([
    ['a null results entry', { cancelled_count: 1, results: [null] }],
    ['an empty-object results entry', { cancelled_count: 1, results: [{}] }],
    ['a string results entry', { cancelled_count: 1, results: ['garbage'] }],
    ['an entry with no reversal_doc_num', { cancelled_count: 1, results: [{ doc_num: 'D-1' }] }],
  ])('renders UNKNOWN, not success, for %s', async (_label, body) => {
    const u = userEvent.setup()
    rpcOk(body)
    const { onClose } = mount({ allRows: [row({ id: 'a', doc_num: 'D-1', type: 'Satınalma' })] })
    await u.click(screen.getByTestId('bc-cb-doc:D-1'))
    await u.click(screen.getByTestId('bc-review'))
    await u.click(screen.getByTestId('bc-exec'))

    await waitFor(() => expect(soleUnresolved()).not.toBeNull())
    /* The user is told the outcome is unconfirmed — never "cancelled". */
    expect(lastToast().text).toContain('təsdiqlənmədi')
    expect(lastToast().isError).toBe(true)
    /* And the dialog does not close on an unconfirmed outcome. */
    expect(onClose).not.toHaveBeenCalled()
  })
})

/* CORRECTION 5, through the rendered path. */
describe('sequence — a code-free 4xx is UNKNOWN, not "nothing cancelled" (correction 5)', () => {
  const rpc4xxNoCode = (status: number) =>
    vi.mocked(supabase.rpc).mockResolvedValue({
      /* The shape postgrest-js produces when a non-2xx body is not JSON —
         an intermediary's HTML error page (dist/index.cjs:489-497). */
      data: null, error: { message: '<html>Forbidden</html>' }, status,
    } as never)

  it.each([403, 404, 400])('treats a %i with no server code as UNKNOWN', async (status) => {
    const u = userEvent.setup()
    rpc4xxNoCode(status)
    mount()
    await selectAndReview(u)
    await u.click(screen.getByTestId('bc-exec'))

    await waitFor(() => expect(soleUnresolved()).not.toBeNull())
    expect(lastToast().text).toContain('təsdiqlənmədi')
    /* It must NOT claim nothing was cancelled. */
    expect(lastToast().text).not.toContain('heç bir sənəd ləğv edilmədi')
  })

  it('still reports a REAL server rejection verbatim, and holds no record', async () => {
    const u = userEvent.setup()
    /* A genuine PostgREST rejection: a 4xx carrying a SQLSTATE. */
    vi.mocked(supabase.rpc).mockResolvedValue({
      data: null,
      error: { message: 'Sənəd artıq ləğv edilib', details: '', hint: '', code: 'P0001' },
      status: 400,
    } as never)
    mount()
    await selectAndReview(u)
    await u.click(screen.getByTestId('bc-exec'))

    await waitFor(() => expect(lastToast().text).toContain('Sənəd artıq ləğv edilib'))
    expect(lastToast().text).toContain('heç bir sənəd ləğv edilmədi')
    /* A confirmed rejection leaves NO block — these documents stay usable. */
    expect(soleUnresolved()).toBeNull()
  })
})

