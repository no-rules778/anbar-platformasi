import { describe, it, expect, vi, beforeEach } from 'vitest'

const rpc = vi.fn()
vi.mock('./supabase', () => ({ supabase: { rpc: (...a: unknown[]) => rpc(...a) } }))

import {
  setStockCondition,
  ICARE_UNSUPPORTED_MSG,
  COND_SAVE_FALLBACK_MSG,
  type SetStockConditionInput,
} from './setStockCondition.api'

/* M9-98 … M9-102, M9-106 … M9-108 — legacy saveCond() (index.html:2153-2205),
   the RPC half. Every branch is exercised against a MOCKED response; nothing
   here is live server evidence and nothing is presented as such. */

const input = (over: Partial<SetStockConditionInput> = {}): SetStockConditionInput => ({
  warehouse: 'Ələt', itemCode: '0000001',
  unfit: 1, repair: 2, onsite: 3, icare: 4, note: 'qeyd',
  editedKey: 'unfit',
  ...over,
})

/** Off-localhost by default so the guard is not the branch under test. */
const OFF = { local: false, allowed: false }

const serverRow = (over: Record<string, unknown> = {}) => ({
  action: 'UPDATE', warehouse: 'Ələt', item_code: '0000001',
  unfit_qty: '1.00', repair_qty: '2.00', onsite_qty: '3.00', icare_qty: '4.00',
  note: 'qeyd', exceeds_balance: false, balance: '10.00', ...over,
})

beforeEach(() => {
  vi.clearAllMocks()
  rpc.mockResolvedValue({ data: serverRow(), error: null })
})

describe('the outgoing payload (M9-98)', () => {
  it('sends all four quantities plus the note in the seven-argument call', async () => {
    await setStockCondition(input(), OFF)
    expect(rpc).toHaveBeenCalledTimes(1)
    expect(rpc).toHaveBeenCalledWith('set_stock_condition', {
      p_warehouse: 'Ələt', p_item_code: '0000001',
      p_unfit_qty: 1, p_repair_qty: 2, p_onsite_qty: 3, p_icare_qty: 4,
      p_note: 'qeyd',
    })
  })

  it('sends p_note as null when the note is empty', async () => {
    await setStockCondition(input({ note: '' }), OFF)
    expect(rpc.mock.calls[0][1]).toMatchObject({ p_note: null })
    await setStockCondition(input({ note: null }), OFF)
    expect(rpc.mock.calls[1][1]).toMatchObject({ p_note: null })
  })

  /* Every key is a distinct argument — vary each independently. */
  it.each([
    ['unfit', 'p_unfit_qty'],
    ['repair', 'p_repair_qty'],
    ['onsite', 'p_onsite_qty'],
    ['icare', 'p_icare_qty'],
  ] as const)('%s reaches %s', async (key, arg) => {
    await setStockCondition(input({ [key]: 9.75 }), OFF)
    expect(rpc.mock.calls[0][1]).toMatchObject({ [arg]: 9.75 })
  })
})

describe('the response branches (M9-101, M9-102)', () => {
  it('DELETE → ok with a null row (remove the local entry)', async () => {
    rpc.mockResolvedValue({ data: serverRow({ action: 'DELETE' }), error: null })
    const res = await setStockCondition(input(), OFF)
    expect(res).toMatchObject({ ok: true, action: 'DELETE', row: null, exceedsBalance: false })
  })

  it('an EMPTY response → ok with a null row, like DELETE', async () => {
    rpc.mockResolvedValue({ data: null, error: null })
    const res = await setStockCondition(input(), OFF)
    expect(res).toMatchObject({ ok: true, action: '', row: null })
  })

  it.each(['NOOP', 'INSERT', 'UPDATE'])('%s → ok with the row built from the returned columns', async (action) => {
    rpc.mockResolvedValue({
      data: serverRow({ action, unfit_qty: '1.50', repair_qty: '0', onsite_qty: '2.25', icare_qty: '0.01', note: 'n2' }),
      error: null,
    })
    const res = await setStockCondition(input(), OFF)
    expect(res.ok).toBe(true)
    if (!res.ok) return
    expect(res.action).toBe(action)
    expect(res.row).toEqual({
      w: 'Ələt', c: '0000001', unfit: 1.5, repair: 0, onsite: 2.25, icare: 0.01, note: 'n2',
    })
  })

  /* The returned row is authoritative even when it differs from what was
     sent — the screen must re-render the SERVER's value (M9-105). */
  it('the row carries the server values, not the sent ones', async () => {
    rpc.mockResolvedValue({ data: serverRow({ unfit_qty: '7' }), error: null })
    const res = await setStockCondition(input({ unfit: 1 }), OFF)
    expect(res.ok && res.row?.unfit).toBe(7)
  })

  it('a missing icare_qty column reads as 0', async () => {
    const { icare_qty: _omitted, ...withoutIcare } = serverRow()
    rpc.mockResolvedValue({ data: withoutIcare, error: null })
    const res = await setStockCondition(input(), OFF)
    expect(res.ok && res.row?.icare).toBe(0)
  })

  /* M9-102 — exceeds_balance is a WARNING on a SUCCESSFUL write. */
  it('exceeds_balance: true → ok:true with the flag and the balance', async () => {
    rpc.mockResolvedValue({ data: serverRow({ exceeds_balance: true, balance: '8.5' }), error: null })
    const res = await setStockCondition(input(), OFF)
    expect(res).toMatchObject({ ok: true, exceedsBalance: true, balance: 8.5 })
    expect(res.ok && res.row).not.toBeNull()
  })

  it('exceeds_balance absent or false → no warning', async () => {
    rpc.mockResolvedValue({ data: serverRow({ exceeds_balance: false }), error: null })
    expect((await setStockCondition(input(), OFF))).toMatchObject({ exceedsBalance: false })
    const { exceeds_balance: _o, ...none } = serverRow()
    rpc.mockResolvedValue({ data: none, error: null })
    expect((await setStockCondition(input(), OFF))).toMatchObject({ exceedsBalance: false })
  })
})

describe('PGRST202 compatibility (M9-99, M9-100)', () => {
  const pgrst202 = { code: 'PGRST202', message: 'Could not find the function' }

  it('retries with the SIX-argument signature when a non-icare key was edited', async () => {
    rpc
      .mockResolvedValueOnce({ data: null, error: pgrst202 })
      .mockResolvedValueOnce({ data: serverRow({ action: 'UPDATE' }), error: null })

    const res = await setStockCondition(input({ editedKey: 'repair' }), OFF)

    expect(rpc).toHaveBeenCalledTimes(2)
    /* The retry carries exactly the six base arguments — no p_icare_qty. */
    expect(rpc.mock.calls[1][1]).toEqual({
      p_warehouse: 'Ələt', p_item_code: '0000001',
      p_unfit_qty: 1, p_repair_qty: 2, p_onsite_qty: 3, p_note: 'qeyd',
    })
    expect(rpc.mock.calls[1][1]).not.toHaveProperty('p_icare_qty')
    expect(res).toMatchObject({ ok: true, action: 'UPDATE', retriedLegacySignature: true })
  })

  it.each(['unfit', 'onsite'] as const)('retries for the %s key too', async (key) => {
    rpc
      .mockResolvedValueOnce({ data: null, error: pgrst202 })
      .mockResolvedValueOnce({ data: serverRow(), error: null })
    const res = await setStockCondition(input({ editedKey: key }), OFF)
    expect(rpc).toHaveBeenCalledTimes(2)
    expect(res.ok).toBe(true)
  })

  /* M9-100 — the icare special case: NO retry, exact message. */
  it('does NOT retry when the icare key was edited, and returns the exact message', async () => {
    rpc.mockResolvedValueOnce({ data: null, error: pgrst202 })
    const res = await setStockCondition(input({ editedKey: 'icare' }), OFF)
    expect(rpc).toHaveBeenCalledTimes(1)
    expect(res).toEqual({ ok: false, kind: 'icare-unsupported', error: ICARE_UNSUPPORTED_MSG })
  })

  it('a failed retry surfaces the retry\'s error, not the PGRST202 one', async () => {
    rpc
      .mockResolvedValueOnce({ data: null, error: pgrst202 })
      .mockResolvedValueOnce({ data: null, error: { code: 'P0001', message: 'Anbar mövcud deyil' } })
    const res = await setStockCondition(input({ editedKey: 'unfit' }), OFF)
    expect(res).toEqual({ ok: false, kind: 'server', error: 'Anbar mövcud deyil' })
  })

  /* Only PGRST202 triggers the retry; any other code is a refusal. */
  it('does not retry on a non-PGRST202 error', async () => {
    rpc.mockResolvedValueOnce({ data: null, error: { code: 'P0001', message: 'rədd' } })
    const res = await setStockCondition(input({ editedKey: 'unfit' }), OFF)
    expect(rpc).toHaveBeenCalledTimes(1)
    expect(res).toEqual({ ok: false, kind: 'server', error: 'rədd' })
  })
})

describe('failure shapes (M9-108)', () => {
  it('a returned error surfaces its exact message', async () => {
    rpc.mockResolvedValue({
      data: null,
      error: { code: 'P0001', message: 'Bu anbar üzrə vəziyyət dəyişmək icazəniz yoxdur' },
    })
    const res = await setStockCondition(input(), OFF)
    expect(res).toEqual({
      ok: false, kind: 'server', error: 'Bu anbar üzrə vəziyyət dəyişmək icazəniz yoxdur',
    })
  })

  it('a returned error without text falls back to the legacy phrase', async () => {
    rpc.mockResolvedValue({ data: null, error: { code: 'P0001', message: '' } })
    const res = await setStockCondition(input(), OFF)
    expect(res).toEqual({ ok: false, kind: 'server', error: COND_SAVE_FALLBACK_MSG })
  })

  it('a rejected promise is absorbed, never thrown', async () => {
    rpc.mockRejectedValue(new Error('network down'))
    const res = await setStockCondition(input(), OFF)
    expect(res).toEqual({ ok: false, kind: 'network', error: 'network down' })
  })

  it('a rejection without a message falls back to the legacy phrase', async () => {
    rpc.mockRejectedValue('bare')
    const res = await setStockCondition(input(), OFF)
    expect(res).toEqual({ ok: false, kind: 'network', error: COND_SAVE_FALLBACK_MSG })
  })
})

describe('mutation guard (M9-107) and the write surface (M9-106)', () => {
  it('is blocked on localhost without the opt-in and issues NO RPC', async () => {
    const res = await setStockCondition(input(), { local: true, allowed: false })
    expect(res.ok).toBe(false)
    expect(res).toMatchObject({ kind: 'blocked' })
    expect(rpc).not.toHaveBeenCalled()
  })

  it('proceeds on localhost with the opt-in', async () => {
    const res = await setStockCondition(input(), { local: true, allowed: true })
    expect(res.ok).toBe(true)
    expect(rpc).toHaveBeenCalledTimes(1)
  })

  it('proceeds off localhost regardless of the flag', async () => {
    const res = await setStockCondition(input(), { local: false, allowed: false })
    expect(res.ok).toBe(true)
  })

  /* M9-106 — the RPC is the ONLY write: every call goes to `rpc()` with the
     function name, never to a table builder. */
  it('every call is the set_stock_condition RPC', async () => {
    await setStockCondition(input(), OFF)
    rpc.mockResolvedValueOnce({ data: null, error: { code: 'PGRST202', message: 'x' } })
      .mockResolvedValueOnce({ data: serverRow(), error: null })
    await setStockCondition(input({ editedKey: 'unfit' }), OFF)
    for (const call of rpc.mock.calls) expect(call[0]).toBe('set_stock_condition')
  })
})
