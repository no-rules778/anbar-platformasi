import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('./supabase', () => ({ supabase: { rpc: vi.fn() } }))
vi.mock('../lib/mutationGuard', () => ({ blockedReason: vi.fn(() => null) }))

import { supabase } from './supabase'
import { blockedReason } from '../lib/mutationGuard'
import {
  cancelDocument, cancelLayerDocument,
  cancelTransferDocument, cancelLayerTransferDocument,
  cancelMovementRow, cancelLayerMovementRow,
  replaceMovementItem,
  cancelLegacyMovement, cancelLayerLegacyMovement,
  cancelLegacyTransfer, cancelLayerLegacyTransfer,
  cancelDocumentsBatch, cancelLayerDocumentsBatch,
} from './documentCancel.api'

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(blockedReason).mockReturnValue(null)
})

const ok = (data: unknown) =>
  vi.mocked(supabase.rpc).mockResolvedValue({ data, error: null } as never)
const fail = (msg: string) =>
  vi.mocked(supabase.rpc).mockResolvedValue({ data: null, error: { message: msg } } as never)

/* ===================================================================== */
describe('documentCancel.api — exact RPC payloads (M8-24 … M8-30)', () => {
  it('cancel_document sends p_doc_num, with the date when given', async () => {
    ok({ reversal_doc_num: 'R-1' })
    await cancelDocument('D-1', '2026-09-06')
    expect(supabase.rpc).toHaveBeenCalledWith('cancel_document', {
      p_doc_num: 'D-1', p_reversal_date: '2026-09-06',
    })
  })

  it('cancel_layer_document sends p_doc_num too', async () => {
    ok({ reversal_doc_num: 'R-1' })
    await cancelLayerDocument('D-1', '2026-09-06')
    expect(supabase.rpc).toHaveBeenCalledWith('cancel_layer_document', {
      p_doc_num: 'D-1', p_reversal_date: '2026-09-06',
    })
  })

  /* ------------------------------------------------------------------ */
  /* D-I1. The whole reason these two are separate typed functions.

     The live signatures differ: cancel_transfer_document declares
     p_original_doc_num, cancel_layer_transfer_document declares p_doc_num.
     Legacy (index.html:5250-5251) sends p_original_doc_num to BOTH, switching
     only the function name — which cannot bind against the live layer
     function. Mutation-check: swapping either name below must fail. */

  it('cancel_transfer_document sends p_original_doc_num — NOT p_doc_num', async () => {
    ok({ reversal_doc_num: 'R-2' })
    await cancelTransferDocument('T-1', '2026-09-06')
    expect(supabase.rpc).toHaveBeenCalledWith('cancel_transfer_document', {
      p_original_doc_num: 'T-1', p_reversal_date: '2026-09-06',
    })
    const args = vi.mocked(supabase.rpc).mock.calls[0][1] as Record<string, unknown>
    expect(args).not.toHaveProperty('p_doc_num')
  })

  it('cancel_layer_transfer_document sends p_doc_num — NOT p_original_doc_num (D-I1)', async () => {
    ok({ reversal_doc_num: 'R-2' })
    await cancelLayerTransferDocument('T-1', '2026-09-06')
    expect(supabase.rpc).toHaveBeenCalledWith('cancel_layer_transfer_document', {
      p_doc_num: 'T-1', p_reversal_date: '2026-09-06',
    })
    const args = vi.mocked(supabase.rpc).mock.calls[0][1] as Record<string, unknown>
    expect(args).not.toHaveProperty('p_original_doc_num')
  })

  /* The two transfer variants must never share one argument object. */
  it('the two transfer variants use DIFFERENT argument names for the same doc', async () => {
    ok({})
    await cancelTransferDocument('T-9')
    await cancelLayerTransferDocument('T-9')
    const calls = vi.mocked(supabase.rpc).mock.calls
    expect(calls[0][1]).toEqual({ p_original_doc_num: 'T-9' })
    expect(calls[1][1]).toEqual({ p_doc_num: 'T-9' })
  })

  /* ------------------------------------------------------------------ */
  it('cancel_movement_row sends the id and the reason', async () => {
    ok({ doc_num: 'D-1' })
    await cancelMovementRow('m-1', 'səhvən ikiqat')
    expect(supabase.rpc).toHaveBeenCalledWith('cancel_movement_row', {
      p_movement_id: 'm-1', p_reason: 'səhvən ikiqat',
    })
  })

  it('cancel_layer_movement_row sends the same two arguments', async () => {
    ok({ doc_num: 'D-1' })
    await cancelLayerMovementRow('m-1', 'səbəb')
    expect(supabase.rpc).toHaveBeenCalledWith('cancel_layer_movement_row', {
      p_movement_id: 'm-1', p_reason: 'səbəb',
    })
  })

  it('replace_movement_item sends id, new code and reason', async () => {
    ok({ old_item_code: 'A', new_item_code: 'B', doc_num: 'D-1' })
    const r = await replaceMovementItem('m-1', 'B', 'kod səhvdir')
    expect(supabase.rpc).toHaveBeenCalledWith('replace_movement_item', {
      p_movement_id: 'm-1', p_new_item_code: 'B', p_reason: 'kod səhvdir',
    })
    expect(r).toMatchObject({ ok: true, oldItemCode: 'A', newItemCode: 'B', docNum: 'D-1' })
  })

  /* There is exactly ONE replacement function live — no layer variant exists,
     so no capability flag may select anything here. */
  it('item replacement has no layer variant to route to', async () => {
    ok({})
    await replaceMovementItem('m-1', 'B', 'r')
    expect(vi.mocked(supabase.rpc).mock.calls[0][0]).toBe('replace_movement_item')
  })

  it.each([
    ['cancel_legacy_movement', cancelLegacyMovement],
    ['cancel_layer_legacy_movement', cancelLayerLegacyMovement],
    ['cancel_legacy_transfer', cancelLegacyTransfer],
    ['cancel_layer_legacy_transfer', cancelLayerLegacyTransfer],
  ] as const)('%s sends p_movement_id', async (name, fn) => {
    ok({ reversal_doc_num: 'R-3' })
    await fn('m-7', '2026-09-06')
    expect(supabase.rpc).toHaveBeenCalledWith(name, {
      p_movement_id: 'm-7', p_reversal_date: '2026-09-06',
    })
  })

  it.each([
    ['cancel_documents_batch', cancelDocumentsBatch],
    ['cancel_layer_documents_batch', cancelLayerDocumentsBatch],
  ] as const)('%s sends p_doc_nums as an array', async (name, fn) => {
    ok({ cancelled_count: 2 })
    const r = await fn(['A', 'B'], '2026-09-06')
    expect(supabase.rpc).toHaveBeenCalledWith(name, {
      p_doc_nums: ['A', 'B'], p_reversal_date: '2026-09-06',
    })
    expect(r.cancelledCount).toBe(2)
    /* The status is PRESERVED, not collapsed into the message — it is the only
       thing that distinguishes a server rejection from a transport failure. */
    expect(r.ok).toBe(true)
  })
})

/* ===================================================================== */
describe('documentCancel.api — the blank-date omission rule', () => {
  /* The server default is CURRENT_DATE. Sending '' fails the date cast and
     sending null overrides the default with NULL — neither is the same as
     leaving the argument out, which is what legacy does. */
  it.each(['', null, undefined] as const)('omits p_reversal_date entirely for %p', async (d) => {
    ok({})
    await cancelDocument('D-1', d)
    expect(supabase.rpc).toHaveBeenCalledWith('cancel_document', { p_doc_num: 'D-1' })
    const args = vi.mocked(supabase.rpc).mock.calls[0][1] as Record<string, unknown>
    expect('p_reversal_date' in args).toBe(false)
  })

  it('omits it for every date-taking function', async () => {
    ok({})
    await cancelLayerDocument('D')
    await cancelTransferDocument('T')
    await cancelLayerTransferDocument('T')
    await cancelLegacyMovement('m')
    await cancelLayerLegacyMovement('m')
    await cancelLegacyTransfer('m')
    await cancelLayerLegacyTransfer('m')
    await cancelDocumentsBatch(['A'])
    await cancelLayerDocumentsBatch(['A'])
    for (const call of vi.mocked(supabase.rpc).mock.calls) {
      expect(call[1] as Record<string, unknown>).not.toHaveProperty('p_reversal_date')
    }
  })
})

/* ===================================================================== */
describe('documentCancel.api — the guard runs BEFORE Supabase', () => {
  const BLOCKED = 'Bu əməliyyat lokal rejimdə bloklanıb'

  /* The load-bearing assertion of the whole module: a blocked call must not
     reach the network at all. Verified to fail if any function calls
     supabase.rpc() before consulting blockedReason(). */
  it('makes NO rpc call when the guard refuses, for every function', async () => {
    vi.mocked(blockedReason).mockReturnValue(BLOCKED)
    const results = [
      await cancelDocument('D'), await cancelLayerDocument('D'),
      await cancelTransferDocument('T'), await cancelLayerTransferDocument('T'),
      await cancelMovementRow('m', 'r'), await cancelLayerMovementRow('m', 'r'),
      await replaceMovementItem('m', 'B', 'r'),
      await cancelLegacyMovement('m'), await cancelLayerLegacyMovement('m'),
      await cancelLegacyTransfer('m'), await cancelLayerLegacyTransfer('m'),
      await cancelDocumentsBatch(['A']), await cancelLayerDocumentsBatch(['A']),
    ]
    expect(supabase.rpc).not.toHaveBeenCalled()
    expect(results).toHaveLength(13)
    for (const r of results) {
      expect(r.ok).toBe(false)
      expect(r.blocked).toBe(true)
      expect(r.error).toBe(BLOCKED)
    }
  })

  it('asks the guard with the right action name per family', async () => {
    ok({})
    await cancelDocument('D')
    expect(blockedReason).toHaveBeenCalledWith('doc.cancel')
    await cancelTransferDocument('T')
    expect(blockedReason).toHaveBeenCalledWith('doc.cancel-transfer')
    await cancelMovementRow('m', 'r')
    expect(blockedReason).toHaveBeenCalledWith('doc.cancel-row')
    await replaceMovementItem('m', 'B', 'r')
    expect(blockedReason).toHaveBeenCalledWith('doc.replace-item')
    await cancelLegacyMovement('m')
    expect(blockedReason).toHaveBeenCalledWith('doc.cancel-legacy')
    await cancelLegacyTransfer('m')
    expect(blockedReason).toHaveBeenCalledWith('doc.cancel-legacy-transfer')
    await cancelDocumentsBatch(['A'])
    expect(blockedReason).toHaveBeenCalledWith('doc.cancel-batch')
  })

  it('uses one action for both variants of a family', async () => {
    ok({})
    await cancelLayerDocument('D')
    expect(blockedReason).toHaveBeenCalledWith('doc.cancel')
    await cancelLayerTransferDocument('T')
    expect(blockedReason).toHaveBeenCalledWith('doc.cancel-transfer')
  })
})

/* ===================================================================== */
describe('documentCancel.api — server refusals reach the caller verbatim', () => {
  /* The SQL functions explain exactly why they refused. Re-wording or
     replacing that text would hide the one piece of information the admin
     needs to decide what to do next. */
  const SERVER_TEXTS = [
    'Qalıq çatmır: Elet anbarında 5 ədəd var',
    'Bu sənəd artıq ləğv edilib',
    'Köhnə yerdəyişmə üçün qarşı cüt qeyri-müəyyəndir',
    'Yerdəyişmə sətri bu yolla ləğv edilmir',
  ]

  it.each(SERVER_TEXTS)('passes %p through unchanged', async (text) => {
    fail(text)
    const r = await cancelDocument('D-1')
    expect(r).toEqual({ ok: false, error: text, blocked: false, reversalDocNum: null, docNum: null })
  })

  it('preserves the text for every family', async () => {
    const text = 'Server rədd etdi: qalıq çatmır'
    fail(text)
    expect((await cancelLayerDocument('D')).error).toBe(text)
    expect((await cancelTransferDocument('T')).error).toBe(text)
    expect((await cancelLayerTransferDocument('T')).error).toBe(text)
    expect((await cancelMovementRow('m', 'r')).error).toBe(text)
    expect((await cancelLayerMovementRow('m', 'r')).error).toBe(text)
    expect((await replaceMovementItem('m', 'B', 'r')).error).toBe(text)
    expect((await cancelLegacyMovement('m')).error).toBe(text)
    expect((await cancelLegacyTransfer('m')).error).toBe(text)
    expect((await cancelDocumentsBatch(['A'])).error).toBe(text)
  })

  it('falls back to the legacy default only when there is no message', async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({ data: null, error: { message: '' } } as never)
    expect((await cancelDocument('D')).error).toBe('server xətası')
  })
})

/* ===================================================================== */
describe('documentCancel.api — never throws', () => {
  it('returns a failure for a rejected promise', async () => {
    vi.mocked(supabase.rpc).mockRejectedValue(new Error('network down') as never)
    await expect(cancelDocument('D')).resolves.toMatchObject({
      ok: false, error: 'network down',
    })
  })

  it('returns a failure for a non-Error rejection, on every function', async () => {
    vi.mocked(supabase.rpc).mockRejectedValue('boom' as never)
    await expect(cancelLayerTransferDocument('T')).resolves.toMatchObject({ ok: false })
    await expect(replaceMovementItem('m', 'B', 'r')).resolves.toMatchObject({
      ok: false, oldItemCode: null, newItemCode: null,
    })
    /* A non-Error rejection never reached PostgREST's own error path, so no
       status exists. It stays UNKNOWN — the count is null, never 0, because 0
       would read as "the server cancelled nothing". */
    await expect(cancelDocumentsBatch(['A'])).resolves.toMatchObject({
      ok: false, cancelledCount: null, status: null,
    })
  })
})

/* ===================================================================== */
describe('documentCancel.api — reading the result', () => {
  it('reports the reversal document number', async () => {
    ok({ reversal_doc_num: 'REV-77' })
    expect((await cancelDocument('D')).reversalDocNum).toBe('REV-77')
  })

  /* The row and replacement families write INSIDE the original document, so
     they report doc_num rather than a new reversal document. */
  it('reports doc_num for the row family', async () => {
    ok({ doc_num: 'D-5' })
    const r = await cancelMovementRow('m', 'r')
    expect(r.docNum).toBe('D-5')
    expect(r.reversalDocNum).toBeNull()
  })

  it('yields null rather than the string "null" for a missing field', async () => {
    ok({})
    const r = await cancelDocument('D')
    expect(r.reversalDocNum).toBeNull()
    expect(r.docNum).toBeNull()
  })

  it('survives a null payload', async () => {
    ok(null)
    await expect(cancelDocument('D')).resolves.toMatchObject({ ok: true, reversalDocNum: null })
  })

  /* A missing count is NULL, not 0 — I-5. `0` is a claim that the server
     cancelled nothing; absence of a count is not that claim. The layer RPC
     returns `document_count` and no `cancelled_count`, so reading only the
     first key reported 0 documents after a successful layer batch. */
  it('reports a missing count as null, never 0', async () => {
    ok({})
    expect((await cancelDocumentsBatch(['A'])).cancelledCount).toBeNull()
  })

  it('reads document_count when cancelled_count is absent — the layer shape', async () => {
    ok({ document_count: 3, results: [1, 2, 3] })
    expect((await cancelLayerDocumentsBatch(['A', 'B', 'C'])).cancelledCount).toBe(3)
  })

  it('prefers cancelled_count when both keys are present', async () => {
    ok({ cancelled_count: 2, document_count: 9 })
    expect((await cancelDocumentsBatch(['A', 'B'])).cancelledCount).toBe(2)
  })

  it('rejects a non-integer count rather than coercing it', async () => {
    ok({ cancelled_count: '2' })
    expect((await cancelDocumentsBatch(['A', 'B'])).cancelledCount).toBeNull()
  })

  /* THE STRUCTURED TRANSPORT ERROR — the reason `status` is carried at all.

     postgrest-js 2.112.4 synthesises `{message, details, hint, code}` with
     `status: 0` for ANY fetch rejection (dist/index.cjs:422-437) and delivers
     it in the SAME `error` field a real rejection uses. Classifying on "an
     error object exists" would call this a confirmed rejection and tell the
     user nothing was written — while the batch may well have committed. */
  it('preserves status 0 for a synthesised transport error', async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({
      data: null,
      error: { message: 'TypeError: Failed to fetch', details: '', hint: '', code: '' },
      status: 0,
      statusText: '',
    } as never)
    const r = await cancelDocumentsBatch(['A'])
    expect(r).toMatchObject({ ok: false, status: 0, code: '', cancelledCount: null })
  })

  it('preserves a 4xx status for a real server rejection', async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({
      data: null,
      error: { message: 'Bu sənəd artıq ləğv edilib', details: '', hint: '', code: 'P0001' },
      status: 400,
      statusText: 'Bad Request',
    } as never)
    const r = await cancelDocumentsBatch(['A'])
    expect(r).toMatchObject({ ok: false, status: 400, code: 'P0001' })
    expect(r.error).toBe('Bu sənəd artıq ləğv edilib')
  })
})
