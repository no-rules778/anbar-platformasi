import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('./supabase', () => ({ supabase: { from: vi.fn() } }))

import { supabase } from './supabase'
import { fetchAzpSnapshot } from './azpSnapshot.api'

/* Phase 17 — M17-22 … M17-27, M17-30.

   THE SUPABASE CLIENT IS MOCKED. What this suite proves is the SHAPE of the
   four reads and the snapshot's composition/failure contract. It proves
   NOTHING about what the server allows: `azp_can_read()`, the RLS SELECT
   policies and the sql/021 privilege lockdown are ledger rows M17-17…M17-21,
   all BLOCKED, and no assertion here can satisfy any of them. A mocked client
   answers whatever this file tells it to. */

interface Call { method: string; args: unknown[] }

/** One table's recorded chain plus the result its terminal resolves. */
interface TableScript {
  /** Resolved by the terminal call (`order`-last, `limit`, or `maybeSingle`). */
  result: { data?: unknown; error?: unknown }
}

/* A recording builder in the auditLog.api.test.ts shape. Every clause returns
   the builder so the chain is real; the object is ALSO a thenable, because
   these queries are awaited directly rather than ended by `.range()`. */
function mockClient(scripts: Record<string, TableScript>) {
  const calls: Record<string, Call[]> = {}
  vi.mocked(supabase.from).mockImplementation(((table: string) => {
    const list: Call[] = calls[table] = calls[table] ?? []
    const script = scripts[table]
    const settle = () =>
      Promise.resolve({ data: script?.result.data ?? null, error: script?.result.error ?? null })
    const builder: Record<string, unknown> = {}
    const chain = (method: string) => (...args: unknown[]) => {
      list.push({ method, args })
      return builder
    }
    builder.select = chain('select')
    builder.eq = chain('eq')
    builder.order = chain('order')
    builder.limit = chain('limit')
    builder.maybeSingle = (...args: unknown[]) => {
      list.push({ method: 'maybeSingle', args })
      return settle()
    }
    /* Awaiting the builder resolves it — the three list reads have no
       terminal method of their own. */
    builder.then = (res: (v: unknown) => unknown, rej?: (e: unknown) => unknown) =>
      settle().then(res, rej)
    return builder
  }) as never)
  return calls
}

const CARD = {
  card_id: 'c1', card_no: '0012', holder: 'Anar', project: 'L1', module: 'azpetrol',
  active: true, sort_order: 1, balance: 10, medaxil_total: 30, mexaric_total: 20, mov_count: 2,
}
const MOV = { id: 5, module: 'azpetrol', card_id: 'c1', kind: 'medaxil', amount: 30 }
const LOG = { id: 9, module: 'azpetrol', entity: 'card', action: 'create', at: '2026-09-01T10:00:00Z' }

function ok(over: Record<string, TableScript> = {}) {
  return mockClient({
    azp_card_balances: { result: { data: [CARD] } },
    azp_movements: { result: { data: [MOV] } },
    azp_audit_log: { result: { data: [LOG] } },
    azp_application_balances: { result: { data: { current_balance: 123.456 } } },
    ...over,
  })
}

beforeEach(() => vi.clearAllMocks())

describe('fetchAzpSnapshot — the four reads (M17-22, M17-23)', () => {
  it('reads exactly the four azp relations, once each, and no other table', async () => {
    ok()
    await fetchAzpSnapshot('azpetrol')
    const tables = vi.mocked(supabase.from).mock.calls.map((c) => c[0])
    expect(tables.sort()).toEqual([
      'azp_application_balances', 'azp_audit_log', 'azp_card_balances', 'azp_movements',
    ])
  })

  /* M17-30 — the module isolation. Named explicitly so a future edit that
     reaches for an ANBAR table fails here rather than in review. */
  it('reads NO ANBAR operational table', async () => {
    ok()
    await fetchAzpSnapshot('azpetrol')
    const tables = vi.mocked(supabase.from).mock.calls.map((c) => c[0])
    for (const forbidden of ['items', 'movements', 'partners', 'warehouses', 'audit_log']) {
      expect(tables).not.toContain(forbidden)
    }
  })

  it('filters every one of the four by the module', async () => {
    const calls = ok()
    await fetchAzpSnapshot('araz')
    for (const t of ['azp_card_balances', 'azp_movements', 'azp_audit_log', 'azp_application_balances']) {
      expect(calls[t].filter((c) => c.method === 'eq')).toEqual([
        { method: 'eq', args: ['module', 'araz'] },
      ])
    }
  })

  it('orders cards by sort_order then card_no, with no limit', async () => {
    const calls = ok()
    await fetchAzpSnapshot('azpetrol')
    expect(calls.azp_card_balances.map((c) => c.method)).toEqual(['select', 'eq', 'order', 'order'])
    expect(calls.azp_card_balances.filter((c) => c.method === 'order')).toEqual([
      { method: 'order', args: ['sort_order'] },
      { method: 'order', args: ['card_no'] },
    ])
  })

  it('orders movements by id descending and limits to 5000', async () => {
    const calls = ok()
    await fetchAzpSnapshot('azpetrol')
    expect(calls.azp_movements.find((c) => c.method === 'order'))
      .toEqual({ method: 'order', args: ['id', { ascending: false }] })
    expect(calls.azp_movements.find((c) => c.method === 'limit'))
      .toEqual({ method: 'limit', args: [5000] })
  })

  it('orders the audit log by at descending and limits to 300', async () => {
    const calls = ok()
    await fetchAzpSnapshot('azpetrol')
    expect(calls.azp_audit_log.find((c) => c.method === 'order'))
      .toEqual({ method: 'order', args: ['at', { ascending: false }] })
    expect(calls.azp_audit_log.find((c) => c.method === 'limit'))
      .toEqual({ method: 'limit', args: [300] })
  })

  it('reads only current_balance from the application balance, via maybeSingle', async () => {
    const calls = ok()
    await fetchAzpSnapshot('azpetrol')
    expect(calls.azp_application_balances.map((c) => c.method))
      .toEqual(['select', 'eq', 'maybeSingle'])
    expect(calls.azp_application_balances[0])
      .toEqual({ method: 'select', args: ['current_balance'] })
  })

  it('issues NO rpc — Phase 17 has no write authority', async () => {
    ok()
    await fetchAzpSnapshot('azpetrol')
    expect((supabase as unknown as { rpc?: unknown }).rpc).toBeUndefined()
  })
})

describe('fetchAzpSnapshot — the happy path', () => {
  it('returns the three row sets verbatim and the rounded balance', async () => {
    ok()
    const res = await fetchAzpSnapshot('azpetrol')
    expect(res.ok).toBe(true)
    if (!res.ok) return
    expect(res.snapshot.cards).toEqual([CARD])
    expect(res.snapshot.movs).toEqual([MOV])
    expect(res.snapshot.log).toEqual([LOG])
    /* azpR2(123.456) — the module's own rounding, not a raw passthrough. */
    expect(res.snapshot.appBalance).toBe(123.46)
  })

  it('turns a null data array into an empty array, not null', async () => {
    ok({
      azp_card_balances: { result: { data: null } },
      azp_movements: { result: { data: null } },
      azp_audit_log: { result: { data: null } },
    })
    const res = await fetchAzpSnapshot('azpetrol')
    expect(res.ok && res.snapshot.cards).toEqual([])
    expect(res.ok && res.snapshot.movs).toEqual([])
    expect(res.ok && res.snapshot.log).toEqual([])
  })
})

/* M17-25 — the asymmetry that matters most in this module. A MISSING
   application-balance row is a real state worth 0; a FAILED read of that same
   table is not representable as 0 and must fail the whole snapshot. */
describe('fetchAzpSnapshot — a missing application-balance row is NOT an error (M17-25)', () => {
  it('yields balance 0 when maybeSingle returns null with no error', async () => {
    ok({ azp_application_balances: { result: { data: null } } })
    const res = await fetchAzpSnapshot('azpetrol')
    expect(res.ok).toBe(true)
    if (!res.ok) return
    expect(res.snapshot.appBalance).toBe(0)
    /* The other three reads are unaffected — this is a complete snapshot. */
    expect(res.snapshot.cards).toEqual([CARD])
  })

  it('but a FAILED application-balance read fails the whole snapshot', async () => {
    ok({ azp_application_balances: { result: { error: { message: 'fond oxunmadı' } } } })
    expect(await fetchAzpSnapshot('azpetrol')).toEqual({ ok: false, error: 'fond oxunmadı' })
  })

  it('never reports a zero balance that came from a failed read', async () => {
    ok({ azp_application_balances: { result: { data: null, error: { message: 'x' } } } })
    expect(await fetchAzpSnapshot('azpetrol')).not.toMatchObject({ ok: true })
  })
})

/* M17-24 — atomic failure. Each of the four is varied INDEPENDENTLY, so a
   guard that covered only one of them cannot pass this block. */
describe('fetchAzpSnapshot — any failed read fails the whole load (M17-24)', () => {
  const cases: [string, string][] = [
    ['azp_card_balances', 'kartlar oxunmadı'],
    ['azp_movements', 'hərəkətlər oxunmadı'],
    ['azp_audit_log', 'jurnal oxunmadı'],
    ['azp_application_balances', 'fond oxunmadı'],
  ]

  for (const [table, msg] of cases) {
    it(`fails when ${table} reports an error`, async () => {
      ok({ [table]: { result: { error: { message: msg } } } })
      expect(await fetchAzpSnapshot('azpetrol')).toEqual({ ok: false, error: msg })
    })
  }

  /* Legacy takes the FIRST error in read order (index.html:8186-8187), so two
     simultaneous failures report the cards' message, not the movements'. */
  it('reports the first error in the legacy read order', async () => {
    ok({
      azp_card_balances: { result: { error: { message: 'birinci' } } },
      azp_movements: { result: { error: { message: 'ikinci' } } },
    })
    expect(await fetchAzpSnapshot('azpetrol')).toEqual({ ok: false, error: 'birinci' })
  })

  it('falls back to a stated message when the error carries no text', async () => {
    ok({ azp_movements: { result: { error: {} } } })
    const res = await fetchAzpSnapshot('azpetrol')
    expect(res).toEqual({ ok: false, error: 'Modul məlumatları yüklənmədi' })
  })

  it('returns ok:false rather than throwing when a read REJECTS', async () => {
    vi.mocked(supabase.from).mockImplementation((() => {
      throw new Error('network down')
    }) as never)
    expect(await fetchAzpSnapshot('azpetrol')).toEqual({ ok: false, error: 'network down' })
  })
})
