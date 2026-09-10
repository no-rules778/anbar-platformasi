import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('./supabase', () => ({ supabase: { rpc: vi.fn() } }))
vi.mock('../lib/mutationGuard', () => ({ blockedReason: vi.fn(() => null) }))

import { supabase } from './supabase'
import { blockedReason } from '../lib/mutationGuard'
import {
  postMovementDocument, postTransferDocument,
  postLayerMovementDocument, postLayerTransferDocument, correctDocument,
} from './postMovementDocument.api'
import type { MovementPayloadLine, TransferPayloadLine, CorrectionPayloadLine } from '../lib/opPayload'

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(blockedReason).mockReturnValue(null)
})

const mvLine = {} as MovementPayloadLine
const trLine = {} as TransferPayloadLine
const coLine = {} as CorrectionPayloadLine

const rpcOk = (data: unknown) =>
  vi.mocked(supabase.rpc).mockResolvedValue({ data, error: null } as never)
const rpcErr = (message: string) =>
  vi.mocked(supabase.rpc).mockResolvedValue({ data: null, error: { message } } as never)

describe('postMovementDocument — M7-101', () => {
  it('calls the RPC with p_lines only and reads the document number', async () => {
    rpcOk({ doc_num: 'SND-ABC', row_count: 2 })
    const r = await postMovementDocument([mvLine])
    expect(supabase.rpc).toHaveBeenCalledWith('post_movement_document', { p_lines: [mvLine] })
    expect(r).toMatchObject({ ok: true, docNum: 'SND-ABC', rowCount: 2, error: null })
  })

  /* M7-107: the live signature takes NO request key — a duplicated submit on
     this path creates a duplicate document, so protection is client-side only. */
  it('sends NO request key — the live signature has none', async () => {
    rpcOk({ doc_num: 'X', row_count: 1 })
    await postMovementDocument([mvLine])
    const args = vi.mocked(supabase.rpc).mock.calls[0][1] as Record<string, unknown>
    expect(args).not.toHaveProperty('p_request_key')
    expect(Object.keys(args)).toEqual(['p_lines'])
  })

  it('surfaces a server refusal verbatim and leaves the caller to keep its lines', async () => {
    rpcErr('Kifayət qədər qalıq yoxdur: "Elet" anbarında A kodu üzrə mövcud 2, tələb olunan 5')
    const r = await postMovementDocument([mvLine])
    expect(r.ok).toBe(false)
    expect(r.error).toBe(
      'Kifayət qədər qalıq yoxdur: "Elet" anbarında A kodu üzrə mövcud 2, tələb olunan 5',
    )
    expect(r.docNum).toBeNull()
  })

  it('absorbs a rejected promise', async () => {
    vi.mocked(supabase.rpc).mockRejectedValue(new Error('network') as never)
    expect((await postMovementDocument([mvLine])).error).toBe('network')
  })

  it('falls back to a generic message', async () => {
    vi.mocked(supabase.rpc).mockRejectedValue('plain' as never)
    expect((await postMovementDocument([mvLine])).error).toBe('server xətası')
  })
})

describe('postTransferDocument', () => {
  it('calls the transfer RPC with p_lines only', async () => {
    rpcOk({ doc_num: 'SND-T', row_count: 1 })
    const r = await postTransferDocument([trLine])
    expect(supabase.rpc).toHaveBeenCalledWith('post_transfer_document', { p_lines: [trLine] })
    expect(r.docNum).toBe('SND-T')
  })

  it('sends no request key either', async () => {
    rpcOk({ doc_num: 'X' })
    await postTransferDocument([trLine])
    const args = vi.mocked(supabase.rpc).mock.calls[0][1] as Record<string, unknown>
    expect(args).not.toHaveProperty('p_request_key')
  })

  it('surfaces the anbardar source refusal verbatim', async () => {
    rpcErr('Sətir 1: yalnız öz anbarınızdan yerdəyişmə edə bilərsiniz (Harmony)')
    expect((await postTransferDocument([trLine])).error)
      .toBe('Sətir 1: yalnız öz anbarınızdan yerdəyişmə edə bilərsiniz (Harmony)')
  })

  it('surfaces the Ofis destination refusal verbatim', async () => {
    rpcErr('Sətir 1: Ofisə yerdəyişməyə icazəniz yoxdur')
    expect((await postTransferDocument([trLine])).error)
      .toBe('Sətir 1: Ofisə yerdəyişməyə icazəniz yoxdur')
  })
})

describe('layer posts — M7-107 idempotency', () => {
  /* Only these two take a request key, recorded in stock_layer_requests. */
  it('postLayerMovementDocument sends the request key', async () => {
    rpcOk({ doc_num: 'SND-L', row_count: 1 })
    await postLayerMovementDocument([mvLine], 'key-1')
    expect(supabase.rpc).toHaveBeenCalledWith('post_layer_movement_document', {
      p_lines: [mvLine], p_request_key: 'key-1',
    })
  })

  it('postLayerTransferDocument sends the request key', async () => {
    rpcOk({ doc_num: 'SND-LT', row_count: 1 })
    await postLayerTransferDocument([trLine], 'key-2')
    expect(supabase.rpc).toHaveBeenCalledWith('post_layer_transfer_document', {
      p_lines: [trLine], p_request_key: 'key-2',
    })
  })

  it('surfaces the reused-key refusal verbatim', async () => {
    rpcErr('Eyni sorğu açarı fərqli məlumatla istifadə edilib')
    expect((await postLayerMovementDocument([mvLine], 'k')).error)
      .toBe('Eyni sorğu açarı fərqli məlumatla istifadə edilib')
  })

  it('surfaces the missing-allocations refusal', async () => {
    rpcErr('Sətir 1: partiya seçilməyib')
    expect((await postLayerMovementDocument([mvLine], 'k')).error).toBe('Sətir 1: partiya seçilməyib')
  })
})

describe('correctDocument — M7-97', () => {
  it('sends doc, lines and reason, leaving p_reversal_date to its default', async () => {
    rpcOk({ original_doc_num: 'SND-1', new_doc_num: 'SND-2', reversal_doc_num: 'SND-R', row_count: 3 })
    const r = await correctDocument('SND-1', [coLine], 'səhv miqdar')
    expect(supabase.rpc).toHaveBeenCalledWith('correct_document', {
      p_doc_num: 'SND-1', p_lines: [coLine], p_reason: 'səhv miqdar',
    })
    const args = vi.mocked(supabase.rpc).mock.calls[0][1] as Record<string, unknown>
    expect(args).not.toHaveProperty('p_reversal_date')
    expect(r).toMatchObject({
      ok: true, docNum: 'SND-1', newDocNum: 'SND-2', reversalDocNum: 'SND-R', rowCount: 3,
    })
  })

  it('surfaces the admin-only refusal', async () => {
    rpcErr('İcazə yoxdur: sənədi yalnız Admin redaktə edə bilər (rol: anbardar)')
    const r = await correctDocument('SND-1', [coLine], 'x')
    expect(r.ok).toBe(false)
    expect(r.error).toContain('yalnız Admin redaktə edə bilər')
  })

  it('surfaces the missing-reason refusal', async () => {
    rpcErr('Redaktənin səbəbi tələb olunur (audit üçün)')
    expect((await correctDocument('SND-1', [coLine], '')).error)
      .toBe('Redaktənin səbəbi tələb olunur (audit üçün)')
  })

  it('surfaces the not-editable refusal with its block list', async () => {
    rpcErr('Sənəd redaktə edilə bilməz: Yerdəyişmə sənədi bu yolla redaktə edilmir')
    expect((await correctDocument('SND-T', [coLine], 'x')).error)
      .toContain('Sənəd redaktə edilə bilməz')
  })

  it('absorbs a rejected promise', async () => {
    vi.mocked(supabase.rpc).mockRejectedValue(new Error('network') as never)
    expect((await correctDocument('SND-1', [coLine], 'x')).ok).toBe(false)
  })
})

describe('localhost write guard — M7-122', () => {
  /* Localhost talks to the LIVE database, and these are the first writes in the
     migration that create stock movements rather than directory rows. */
  it.each([
    ['op.post', () => postMovementDocument([mvLine])],
    ['op.post-transfer', () => postTransferDocument([trLine])],
    ['op.layer-post', () => postLayerMovementDocument([mvLine], 'k')],
    ['op.correct', () => correctDocument('SND-1', [coLine], 'r')],
  ])('%s is blocked before any network call', async (_action, call) => {
    vi.mocked(blockedReason).mockReturnValue('Bu əməliyyat lokal rejimdə bloklanıb')
    const r = await call()
    expect(r.ok).toBe(false)
    expect(r.blocked).toBe(true)
    expect(r.error).toBe('Bu əməliyyat lokal rejimdə bloklanıb')
    expect(supabase.rpc).not.toHaveBeenCalled()
  })

  it('consults the guard with the correct action name for each path', async () => {
    rpcOk({ doc_num: 'X' })
    await postMovementDocument([mvLine])
    await postTransferDocument([trLine])
    await postLayerMovementDocument([mvLine], 'k')
    await postLayerTransferDocument([trLine], 'k')
    await correctDocument('SND-1', [coLine], 'r')
    expect(vi.mocked(blockedReason).mock.calls.map((c) => c[0])).toEqual([
      'op.post', 'op.post-transfer', 'op.layer-post', 'op.layer-post', 'op.correct',
    ])
  })
})
