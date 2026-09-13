import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('./supabase', () => ({ supabase: { rpc: vi.fn() } }))
vi.mock('../lib/mutationGuard', async (orig) => {
  const real = await orig<typeof import('../lib/mutationGuard')>()
  return { ...real, blockedReason: vi.fn(() => null) }
})

import { supabase } from './supabase'
import { blockedReason } from '../lib/mutationGuard'
import {
  AZP_DELETE_HAS_MOVEMENTS, AZP_IMPORT_CARD_FAILED, AZP_KIND_CHANGE_REFUSED,
  AZP_MAX_POST_ROWS, AZP_NO_ROWS, AZP_TOO_MANY_ROWS,
  azpCancelMovement, azpCorrectMovement, azpDeleteCard, azpPostMovements,
  azpRunImport, azpSaveCard, azpSetApplicationBalance, type AzpPostRow,
} from './azpWrite.api'

/* Phase 17 — M17-80 … M17-89, the WRITE contracts.

   ═══ THE SUPABASE CLIENT IS MOCKED. NO WRITE WAS EVER EXECUTED. ═══

   Phase 17 ran zero azp writes: no TEST fixture (D-T2), no `azp_delete_card`
   against TEST (D-T3), no live import (D-T4). Every RPC below is a mock that
   answers whatever this file tells it to.

   WHAT THIS SUITE PROVES: the call SHAPE, the argument mapping, the
   client-side pre-flight refusals, and the import orchestration's ORDER and
   failure handling.

   WHAT IT CANNOT PROVE, and does not claim: that the server performs any of
   it. Atomicity (M17-82), the `app_balance_effect` rule (M17-83), fund
   sufficiency (M17-84, M17-87), the conditional fund restore (M17-85), the
   two-way correction link (M17-86) and the movement-bearing delete refusal
   (M17-81) are all SERVER contracts, and all remain BLOCKED. A mocked test
   that "passes" an atomicity assertion would be measuring its own mock. */

/** Records every rpc(name, args) and answers from a per-name script. */
function mockRpc(script: Record<string, { data?: unknown; error?: unknown }>) {
  const calls: { name: string; args: Record<string, unknown> }[] = []
  vi.mocked(supabase.rpc).mockImplementation(((name: string, args: Record<string, unknown>) => {
    calls.push({ name, args })
    const s = script[name] ?? {}
    return Promise.resolve({ data: s.data ?? null, error: s.error ?? null })
  }) as never)
  return calls
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(blockedReason).mockReturnValue(null)
})

describe('azpSaveCard — M17-80', () => {
  it('calls azp_save_card with the module and the patch, and returns the id', async () => {
    const calls = mockRpc({ azp_save_card: { data: 'c-new' } })
    const r = await azpSaveCard('azpetrol', { card_no: '0012', holder: 'Anar' })
    expect(r).toEqual({ ok: true, data: 'c-new' })
    expect(calls).toEqual([{
      name: 'azp_save_card',
      args: { p_module: 'azpetrol', p_card: { card_no: '0012', holder: 'Anar' } },
    }])
  })

  it('passes the SQL-recognised id and the complete editable card payload for an update', async () => {
    const calls = mockRpc({ azp_save_card: { data: 'c1' } })
    await azpSaveCard('araz', {
      id: 'c1', card_no: '0012', holder: 'Yeni', project: 'P1', note: 'qeyd',
      sort_order: 2, active: false,
    })
    expect(calls[0].args.p_card).toEqual({
      id: 'c1', card_no: '0012', holder: 'Yeni', project: 'P1', note: 'qeyd',
      sort_order: 2, active: false,
    })
    expect(calls[0].args.p_card).not.toHaveProperty('card_id')
    expect(calls[0].args.p_module).toBe('araz')
  })

  it('returns the server error message rather than throwing', async () => {
    mockRpc({ azp_save_card: { error: { message: 'yalnız admin' } } })
    expect(await azpSaveCard('azpetrol', {} as never)).toEqual({ ok: false, error: 'yalnız admin' })
  })

  it('refuses an unknown module before any call', async () => {
    const calls = mockRpc({})
    await expect(azpSaveCard('nonsense' as never, {} as never)).rejects.toThrow('AZP: yanlış modul: nonsense')
    expect(calls).toHaveLength(0)
  })

  /* The guard runs BEFORE the client is touched — not after. */
  it('makes no call at all when the guard blocks it', async () => {
    vi.mocked(blockedReason).mockReturnValue('bloklanıb')
    const calls = mockRpc({ azp_save_card: { data: 'c-new' } })
    expect(await azpSaveCard('azpetrol', {} as never)).toEqual({ ok: false, error: 'bloklanıb' })
    expect(calls).toHaveLength(0)
  })
})

describe('azpDeleteCard — M17-81, every refusal (D-T3)', () => {
  /* Refusal 1 — the localhost guard, checked before everything else. */
  it('refuses on the guard without calling the RPC', async () => {
    vi.mocked(blockedReason).mockReturnValue('bloklanıb')
    const calls = mockRpc({ azp_delete_card: {} })
    expect(await azpDeleteCard('azpetrol', 'c1', 0)).toEqual({ ok: false, error: 'bloklanıb' })
    expect(calls).toHaveLength(0)
  })

  /* Refusal 2 — a card that still carries movements. The CLIENT stops it to
     avoid a pointless round trip; the server refuses it too, and only the
     server's refusal is authoritative (M17-81, BLOCKED). */
  it('refuses a card with movements without calling the RPC', async () => {
    const calls = mockRpc({ azp_delete_card: {} })
    const r = await azpDeleteCard('azpetrol', 'c1', 3)
    expect(r).toEqual({ ok: false, error: AZP_DELETE_HAS_MOVEMENTS })
    expect(calls).toHaveLength(0)
  })

  it('refuses at exactly one movement — the boundary, not just "many"', async () => {
    const calls = mockRpc({ azp_delete_card: {} })
    expect((await azpDeleteCard('azpetrol', 'c1', 1)).ok).toBe(false)
    expect(calls).toHaveLength(0)
  })

  /* Refusal 3 — admin. Enforced by the SERVER and, in the UI, by
     `azpNeedAdmin` before this function is reached. Here it arrives as a
     server error, which this client must surface rather than swallow. */
  it('surfaces the server admin refusal', async () => {
    mockRpc({ azp_delete_card: { error: { message: 'yalnız Admin' } } })
    expect(await azpDeleteCard('azpetrol', 'c1', 0)).toEqual({ ok: false, error: 'yalnız Admin' })
  })

  /* The server may still refuse a card the CLIENT believed was empty — a
     stale snapshot. The client must not present that as success. */
  it('surfaces a server refusal even when the client count said zero', async () => {
    mockRpc({ azp_delete_card: { error: { message: 'kartın əməliyyatları var' } } })
    const r = await azpDeleteCard('azpetrol', 'c1', 0)
    expect(r.ok).toBe(false)
  })

  it('calls azp_delete_card with both arguments when nothing refuses', async () => {
    const calls = mockRpc({ azp_delete_card: {} })
    expect(await azpDeleteCard('araz', 'c9', 0)).toEqual({ ok: true, data: undefined })
    expect(calls).toEqual([{ name: 'azp_delete_card', args: { p_module: 'araz', p_card_id: 'c9' } }])
  })
})

describe('azpPostMovements — M17-82, M17-83, M17-84', () => {
  const row = (n: number): AzpPostRow => ({
    card_id: 'c1', kind: 'medaxil', amount: n, op_date: null, vat_included: false,
  })

  it('posts rows and returns the server count', async () => {
    const calls = mockRpc({ azp_post_movements: { data: 2 } })
    const r = await azpPostMovements('azpetrol', [row(1), row(2)])
    expect(r).toEqual({ ok: true, data: 2 })
    expect(calls[0].name).toBe('azp_post_movements')
    expect(calls[0].args.p_module).toBe('azpetrol')
    expect((calls[0].args.p_rows as unknown[])).toHaveLength(2)
  })

  it('preserves the manual document number and note in the RPC payload', async () => {
    const calls = mockRpc({ azp_post_movements: { data: 1 } })
    await azpPostMovements('azpetrol', [{
      ...row(10), doc_num: 'Q-17', note: 'manual qeyd',
    }])
    expect((calls[0].args.p_rows as AzpPostRow[])[0]).toMatchObject({
      doc_num: 'Q-17', note: 'manual qeyd',
    })
  })

  /* M17-83 — the single most consequential argument in the file. A manual
     post OMITS p_source so the server default applies; an import passes
     'import' so no Mədaxil moves the fund. */
  it('omits p_source entirely for a manual post', async () => {
    const calls = mockRpc({ azp_post_movements: { data: 1 } })
    await azpPostMovements('azpetrol', [row(1)])
    expect(Object.keys(calls[0].args)).not.toContain('p_source')
  })

  it('passes p_source verbatim when given', async () => {
    const calls = mockRpc({ azp_post_movements: { data: 1 } })
    await azpPostMovements('azpetrol', [row(1)], 'import')
    expect(calls[0].args.p_source).toBe('import')
  })

  /* M17-82's client half: the 1..5000 bounds. Row 5001 never leaves the
     browser. That the SERVER refuses it is BLOCKED. */
  it('accepts exactly 5000 rows and refuses 5001', async () => {
    const calls = mockRpc({ azp_post_movements: { data: 5000 } })
    const at = Array.from({ length: AZP_MAX_POST_ROWS }, (_, i) => row(i + 1))
    expect((await azpPostMovements('azpetrol', at)).ok).toBe(true)
    expect(calls).toHaveLength(1)

    const over = [...at, row(5001)]
    expect(await azpPostMovements('azpetrol', over)).toEqual({ ok: false, error: AZP_TOO_MANY_ROWS })
    /* Still one call — the over-size batch made none. */
    expect(calls).toHaveLength(1)
  })

  it('refuses an empty batch without calling', async () => {
    const calls = mockRpc({ azp_post_movements: {} })
    expect(await azpPostMovements('azpetrol', [])).toEqual({ ok: false, error: AZP_NO_ROWS })
    expect(calls).toHaveLength(0)
  })

  /* M17-84 — an insufficient fund refuses the WHOLE batch. The refusal text
     is the SERVER's, surfaced unchanged; there is no partial success shape
     for this client to return. */
  it('surfaces an insufficient-balance refusal for the whole batch', async () => {
    mockRpc({ azp_post_movements: { error: { message: 'Tətbiqin balansı kifayət etmir' } } })
    const r = await azpPostMovements('azpetrol', [row(1), row(2)])
    expect(r).toEqual({ ok: false, error: 'Tətbiqin balansı kifayət etmir' })
    /* No partial count is invented on failure. */
    expect('data' in r).toBe(false)
  })

  it('turns a rejected promise into an error result', async () => {
    vi.mocked(supabase.rpc).mockRejectedValue(new Error('şəbəkə'))
    expect(await azpPostMovements('azpetrol', [row(1)])).toEqual({ ok: false, error: 'şəbəkə' })
  })
})

describe('azpCancelMovement — M17-85', () => {
  it('calls with module and id, omitting an absent reason', async () => {
    const calls = mockRpc({ azp_cancel_movement: {} })
    expect(await azpCancelMovement('azpetrol', 42)).toEqual({ ok: true, data: undefined })
    expect(calls[0].args).toEqual({ p_module: 'azpetrol', p_id: 42 })
  })

  it('passes a reason when given', async () => {
    const calls = mockRpc({ azp_cancel_movement: {} })
    await azpCancelMovement('araz', 7, 'səhv məbləğ')
    expect(calls[0].args.p_reason).toBe('səhv məbləğ')
  })

  it('surfaces a server refusal', async () => {
    mockRpc({ azp_cancel_movement: { error: { message: 'artıq ləğv edilib' } } })
    expect(await azpCancelMovement('azpetrol', 42)).toEqual({ ok: false, error: 'artıq ləğv edilib' })
  })
})

describe('azpCorrectMovement — M17-86, M17-87', () => {
  it('calls with the patch and returns the replacement id', async () => {
    const calls = mockRpc({ azp_correct_movement: { data: 99 } })
    const r = await azpCorrectMovement('azpetrol', 42, { amount: 50 }, 'düzəliş')
    expect(r).toEqual({ ok: true, data: 99 })
    expect(calls[0].args).toEqual({
      p_module: 'azpetrol', p_id: 42, p_patch: { amount: 50 }, p_reason: 'düzəliş',
    })
  })

  it('preserves doc_num and note in a correction patch', async () => {
    const calls = mockRpc({ azp_correct_movement: { data: 100 } })
    await azpCorrectMovement('araz', 7, { doc_num: 'Q-NEW', note: 'düzəldildi' })
    expect(calls[0].args.p_patch).toEqual({ doc_num: 'Q-NEW', note: 'düzəldildi' })
  })

  /* M17-86 — a kind change is refused BEFORE the call. Correcting a Mədaxil
     into a Məxaric would reverse a fund movement while presenting itself as
     an edit; the supported path is cancel + post anew. */
  it('refuses a kind change without calling the RPC', async () => {
    const calls = mockRpc({ azp_correct_movement: { data: 99 } })
    const r = await azpCorrectMovement('azpetrol', 42, { kind: 'mexaric' } as never)
    expect(r).toEqual({ ok: false, error: AZP_KIND_CHANGE_REFUSED })
    expect(calls).toHaveLength(0)
  })

  /* Even a kind set to its ORIGINAL value is refused: the check is on the
     key's presence, not on whether the value differs. */
  it('refuses a kind key even when it repeats the current value', async () => {
    const calls = mockRpc({ azp_correct_movement: { data: 99 } })
    expect((await azpCorrectMovement('azpetrol', 42, { kind: 'medaxil' } as never)).ok).toBe(false)
    expect(calls).toHaveLength(0)
  })

  /* M17-87 is a SERVER contract and is deliberately NOT reproduced here: a
     client-side sufficiency copy could disagree with the authority and refuse
     a correction the server would allow. All this client does is pass a
     lowered amount through unchanged. */
  it('passes a lowered amount through without any client-side fund check', async () => {
    const calls = mockRpc({ azp_correct_movement: { data: 99 } })
    expect((await azpCorrectMovement('azpetrol', 42, { amount: 1 })).ok).toBe(true)
    expect((calls[0].args.p_patch as { amount: number }).amount).toBe(1)
  })
})

describe('azpSetApplicationBalance', () => {
  it('calls with the module and the new balance', async () => {
    const calls = mockRpc({ azp_set_application_balance: { data: 500 } })
    expect(await azpSetApplicationBalance('araz', 500)).toEqual({ ok: true, data: 500 })
    expect(calls[0].args).toEqual({ p_module: 'araz', p_balance: 500 })
  })

  it('surfaces a server refusal', async () => {
    mockRpc({ azp_set_application_balance: { error: { message: 'yalnız Admin' } } })
    expect((await azpSetApplicationBalance('araz', 500)).ok).toBe(false)
  })
})

describe('azpRunImport — M17-88, M17-89 (D-T4: never executed)', () => {
  const cards = [{ card_no: '0012', holder: 'Anar' }, { card_no: '0013', holder: 'Elvin' }]
  const rows = [
    { card_no: '0012', kind: 'medaxil' as const, amount: 10, op_date: null, vat_included: false },
    { card_no: '0013', kind: 'mexaric' as const, amount: 5, op_date: null, vat_included: false },
  ]

  it('creates only the missing cards, then posts once with source=import', async () => {
    const calls = mockRpc({ azp_save_card: { data: 'c-new' }, azp_post_movements: { data: 2 } })
    const r = await azpRunImport('azpetrol', cards, rows, [{ card_no: '0012', card_id: 'c1' }])
    expect(r).toEqual({ ok: true, data: { posted: 2, created: 1 } })

    /* Exactly one save (0013 only — 0012 already existed), then one post. */
    expect(calls.map((c) => c.name)).toEqual(['azp_save_card', 'azp_post_movements'])
    expect(calls[0].args.p_card).toEqual({ card_no: '0013', holder: 'Elvin' })
    /* M17-83 — the import never moves the fund. */
    expect(calls[1].args.p_source).toBe('import')
  })

  it('matches existing cards trimmed and case-insensitively', async () => {
    const calls = mockRpc({ azp_save_card: { data: 'x' }, azp_post_movements: { data: 2 } })
    await azpRunImport('azpetrol', cards, rows,
      [{ card_no: ' 0012 ', card_id: 'c1' }, { card_no: '0013', card_id: 'c2' }])
    /* No card was created — both matched. */
    expect(calls.map((c) => c.name)).toEqual(['azp_post_movements'])
  })

  it('resolves every row to the card id the loop learned', async () => {
    const calls = mockRpc({ azp_save_card: { data: 'c-new' }, azp_post_movements: { data: 2 } })
    await azpRunImport('azpetrol', cards, rows, [{ card_no: '0012', card_id: 'c1' }])
    expect(calls[1].args.p_rows).toEqual([
      { card_id: 'c1', kind: 'medaxil', amount: 10, op_date: null, vat_included: false },
      { card_id: 'c-new', kind: 'mexaric', amount: 5, op_date: null, vat_included: false },
    ])
  })

  /* M17-89 — the residual risk, stated by execution. The card loop is NOT
     atomic with the post: when the post fails, the card the loop already
     created is NOT rolled back. No client arrangement can undo it. */
  it('leaves an already-created card behind when the post fails', async () => {
    const calls = mockRpc({
      azp_save_card: { data: 'c-new' },
      azp_post_movements: { error: { message: 'balans kifayət etmir' } },
    })
    const r = await azpRunImport('azpetrol', cards, rows, [{ card_no: '0012', card_id: 'c1' }])
    expect(r).toEqual({ ok: false, error: 'balans kifayət etmir' })
    /* The save HAPPENED and there is no compensating call after the failure. */
    expect(calls.map((c) => c.name)).toEqual(['azp_save_card', 'azp_post_movements'])
  })

  /* A failure MIDWAY through the loop stops it: the second card is never
     attempted, and no post is issued. */
  it('stops the loop on the first card failure and never posts', async () => {
    const calls: { name: string }[] = []
    vi.mocked(supabase.rpc).mockImplementation(((name: string) => {
      calls.push({ name })
      return Promise.resolve({ data: null, error: { message: 'kart yaradılmadı' } })
    }) as never)
    const r = await azpRunImport('azpetrol', cards, rows, [])
    expect(r).toEqual({ ok: false, error: 'kart yaradılmadı' })
    expect(calls.map((c) => c.name)).toEqual(['azp_save_card'])
  })

  it('refuses when a row cannot be resolved to a card id', async () => {
    const calls = mockRpc({ azp_save_card: { data: '' }, azp_post_movements: { data: 0 } })
    const r = await azpRunImport('azpetrol', cards, rows, [{ card_no: '0012', card_id: 'c1' }])
    expect(r).toEqual({ ok: false, error: AZP_IMPORT_CARD_FAILED })
    /* No post was attempted with an empty card id. */
    expect(calls.map((c) => c.name)).toEqual(['azp_save_card'])
  })

  /* The guard blocks the ORCHESTRATION by its own name, so the card loop is
     stopped before its FIRST write rather than midway (M17-89). */
  it('makes no call at all when the import guard blocks it', async () => {
    vi.mocked(blockedReason).mockReturnValue('bloklanıb')
    const calls = mockRpc({ azp_save_card: { data: 'x' }, azp_post_movements: { data: 2 } })
    expect(await azpRunImport('azpetrol', cards, rows, [])).toEqual({ ok: false, error: 'bloklanıb' })
    expect(calls).toHaveLength(0)
  })
})
