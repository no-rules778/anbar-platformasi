import { beforeEach, describe, expect, it, vi } from 'vitest'

/* T2 — M12-10, M12-11, M12-12, M12-59, M12-76, M12-79, M12-80, M12-82,
   M12-90, M12-97. The Supabase client is mocked: this is UNIT evidence of the
   request SHAPE and failure normalisation, never server or RLS evidence. */

const order = vi.fn()
const select = vi.fn((_cols: string) => ({ order }))
const from = vi.fn((_table: string) => ({ select }))
const rpc = vi.fn()

vi.mock('./supabase', () => ({ supabase: { from: (t: string) => from(t), rpc: (f: string, a: unknown) => rpc(f, a) } }))

const blockedReason = vi.fn((_action: string) => null as string | null)
vi.mock('../lib/mutationGuard', () => ({ blockedReason: (a: string) => blockedReason(a) }))

import {
  approveItemRequest, cancelItemRequest, fetchItemRequests, mapItemRequest,
  rejectItemRequest, requestNewItem,
} from './itemRequests.api'

const row = (over: Record<string, unknown> = {}) => ({
  id: 'r1', name: 'Sement M400', unit: 'kq', category: 'Tikinti', note: 'təcili',
  status: 'pending', created_by: 'u1', created_warehouse: 'Test Anbar',
  created_at: '2026-09-11T08:00:00Z', decided_by: null, decided_at: null,
  decision_reason: null, item_code: null, ...over,
})

beforeEach(() => {
  vi.clearAllMocks()
  blockedReason.mockReturnValue(null)
})

describe('fetchItemRequests — M12-10 exact read', () => {
  it('reads item_requests, SELECT * ordered created_at DESC, with NO client row filter', async () => {
    order.mockResolvedValue({ data: [row()], error: null })
    await fetchItemRequests()
    expect(from).toHaveBeenCalledWith('item_requests')
    expect(select).toHaveBeenCalledWith('*')
    expect(order).toHaveBeenCalledWith('created_at', { ascending: false })
    /* No movements/warehouses/partners/balances read, and no snapshot RPC. */
    expect(from).toHaveBeenCalledTimes(1)
    expect(rpc).not.toHaveBeenCalled()
  })
})

describe('mapItemRequest — M12-12 exact field mapping', () => {
  it('maps every column to its legacy view name', () => {
    expect(mapItemRequest(row({
      decided_by: 'u2', decided_at: '2026-09-12T00:00:00Z',
      decision_reason: 'artıq var', item_code: '0000009', status: 'rejected',
    }))).toEqual({
      id: 'r1', name: 'Sement M400', unit: 'kq', category: 'Tikinti', note: 'təcili',
      status: 'rejected', by: 'u1', w: 'Test Anbar',
      ts: Date.parse('2026-09-11T08:00:00Z'),
      decidedBy: 'u2', decidedAt: '2026-09-12T00:00:00Z',
      reason: 'artıq var', code: '0000009',
    })
  })

  it('defaults every legacy empty value, and status defaults to pending', () => {
    const mapped = mapItemRequest(row({
      unit: null, category: null, note: null, status: null,
      created_by: null, created_warehouse: null, item_code: null, decision_reason: null,
    }))
    expect(mapped).toMatchObject({
      unit: '', category: '', note: '', status: 'pending',
      by: '', w: '', code: '', reason: '', decidedBy: '', decidedAt: '',
    })
  })

  it('a null created_at yields ts = 0 — the boundary M12-31 renders as 01.01.1970', () => {
    expect(mapItemRequest(row({ created_at: null })).ts).toBe(0)
  })

  it('an unparseable created_at yields ts = 0, never NaN', () => {
    expect(mapItemRequest(row({ created_at: 'not-a-date' })).ts).toBe(0)
  })
})

describe('fetchItemRequests — M12-11 failure is NEVER a successful empty list', () => {
  it('a returned { error } yields ok:false with no rows', async () => {
    order.mockResolvedValue({ data: null, error: { message: 'permission denied' } })
    expect(await fetchItemRequests()).toEqual({ rows: [], ok: false, error: 'permission denied' })
  })

  it('a REJECTED promise (network) yields ok:false, not a throw', async () => {
    order.mockRejectedValue(new Error('Failed to fetch'))
    expect(await fetchItemRequests()).toEqual({ rows: [], ok: false, error: 'Failed to fetch' })
  })

  it('falsifiable contrast: a genuinely empty table IS ok:true with zero rows', async () => {
    order.mockResolvedValue({ data: [], error: null })
    expect(await fetchItemRequests()).toEqual({ rows: [], ok: true, error: null })
  })
})

describe('RPC wrappers — exact parameters, empties as null', () => {
  it('requestNewItem sends exactly four parameters, trimmed, no creator/warehouse/status — M12-59', async () => {
    rpc.mockResolvedValue({ data: { id: 'r9' }, error: null })
    await requestNewItem({ name: '  Kabel NYM  ', unit: '', category: null, note: '  qeyd  ' })
    expect(rpc).toHaveBeenCalledWith('request_new_item', {
      p_name: 'Kabel NYM', p_unit: null, p_category: null, p_note: 'qeyd',
    })
    const [, args] = rpc.mock.calls[0]
    expect(Object.keys(args as object).sort()).toEqual(['p_category', 'p_name', 'p_note', 'p_unit'])
  })

  it('approveItemRequest sends the id and the admin corrections, empties as null — M12-76', async () => {
    rpc.mockResolvedValue({ data: { code: '0000010' }, error: null })
    await approveItemRequest({ requestId: 'r1', name: ' Sement ', unit: '', category: 'Tikinti' })
    expect(rpc).toHaveBeenCalledWith('approve_item_request', {
      p_request_id: 'r1', p_name: 'Sement', p_unit: null, p_category: 'Tikinti',
    })
  })

  it('rejectItemRequest sends the trimmed reason — M12-80', async () => {
    rpc.mockResolvedValue({ data: null, error: null })
    await rejectItemRequest({ requestId: 'r1', reason: '  artıq var  ' })
    expect(rpc).toHaveBeenCalledWith('reject_item_request', { p_request_id: 'r1', p_reason: 'artıq var' })
  })

  it('cancelItemRequest sends p_reason: null exactly as legacy does — M12-82', async () => {
    rpc.mockResolvedValue({ data: null, error: null })
    await cancelItemRequest('r1')
    expect(rpc).toHaveBeenCalledWith('cancel_item_request', { p_request_id: 'r1', p_reason: null })
  })
})

describe('RPC wrappers — failure normalisation, never a throw', () => {
  it.each([
    ['requestNewItem', () => requestNewItem({ name: 'Kabel NYM' })],
    ['approveItemRequest', () => approveItemRequest({ requestId: 'r', name: 'Kabel NYM' })],
    ['rejectItemRequest', () => rejectItemRequest({ requestId: 'r', reason: 'x' })],
    ['cancelItemRequest', () => cancelItemRequest('r')],
  ])('%s surfaces a returned { error } as ok:false', async (_n, call) => {
    rpc.mockResolvedValue({ data: null, error: { message: 'İcazə yoxdur' } })
    expect(await call()).toEqual({ ok: false, data: null, error: 'İcazə yoxdur' })
  })

  it.each([
    ['requestNewItem', () => requestNewItem({ name: 'Kabel NYM' })],
    ['approveItemRequest', () => approveItemRequest({ requestId: 'r', name: 'Kabel NYM' })],
    ['rejectItemRequest', () => rejectItemRequest({ requestId: 'r', reason: 'x' })],
    ['cancelItemRequest', () => cancelItemRequest('r')],
  ])('%s surfaces a REJECTED promise as ok:false', async (_n, call) => {
    rpc.mockRejectedValue(new Error('Failed to fetch'))
    expect(await call()).toEqual({ ok: false, data: null, error: 'Failed to fetch' })
  })

  it('a successful approval returns the server payload (code, already_approved) — M12-77, M12-78', async () => {
    rpc.mockResolvedValue({ data: { code: '0000010', already_approved: false, created_item: true }, error: null })
    const r = await approveItemRequest({ requestId: 'r1', name: 'Sement M400' })
    expect(r).toEqual({ ok: true, data: { code: '0000010', already_approved: false, created_item: true }, error: null })
  })
})

describe('mutation guard — M12-97', () => {
  it.each([
    ['nreq.create', () => requestNewItem({ name: 'Kabel NYM' })],
    ['nreq.approve', () => approveItemRequest({ requestId: 'r', name: 'Kabel NYM' })],
    ['nreq.reject', () => rejectItemRequest({ requestId: 'r', reason: 'x' })],
    ['nreq.cancel', () => cancelItemRequest('r')],
  ])('%s is checked by blockedReason BEFORE the RPC is dispatched', async (action, call) => {
    blockedReason.mockReturnValue('bloklanıb')
    const r = await call()
    expect(blockedReason).toHaveBeenCalledWith(action)
    /* The load-bearing half: a blocked action never reaches the server. */
    expect(rpc).not.toHaveBeenCalled()
    expect(r).toEqual({ ok: false, data: null, error: 'bloklanıb' })
  })

  it('falsifiable contrast: with the guard open the RPC IS dispatched', async () => {
    blockedReason.mockReturnValue(null)
    rpc.mockResolvedValue({ data: null, error: null })
    await cancelItemRequest('r')
    expect(rpc).toHaveBeenCalledTimes(1)
  })
})

describe('M12-90 — every write is an RPC; the table is never written directly', () => {
  it('no wrapper calls .from() at all', async () => {
    rpc.mockResolvedValue({ data: null, error: null })
    await requestNewItem({ name: 'Kabel NYM' })
    await approveItemRequest({ requestId: 'r', name: 'Kabel NYM' })
    await rejectItemRequest({ requestId: 'r', reason: 'x' })
    await cancelItemRequest('r')
    expect(from).not.toHaveBeenCalled()
    expect(rpc).toHaveBeenCalledTimes(4)
  })
})
