import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('./supabase', () => ({ supabase: { from: vi.fn() } }))

import { supabase } from './supabase'
import {
  fetchWriteoffValuations,
  buildWriteoffValuationMap,
  type WriteoffValuationRow,
} from './writeoffValuations.api'

beforeEach(() => vi.clearAllMocks())

interface Call { method: string; args: unknown[] }

function mockPages(pages: Array<{ data?: unknown[] | null; error?: unknown }>) {
  const calls: Call[] = []
  const tables: unknown[] = []
  let n = 0
  const builder: Record<string, unknown> = {}
  builder.select = (...args: unknown[]) => { calls.push({ method: 'select', args }); return builder }
  builder.order = (...args: unknown[]) => { calls.push({ method: 'order', args }); return builder }
  builder.range = (...args: unknown[]) => {
    calls.push({ method: 'range', args })
    const page = pages[Math.min(n, pages.length - 1)]
    n++
    return Promise.resolve({ data: page.data ?? null, error: page.error ?? null })
  }
  vi.mocked(supabase.from).mockImplementation((t: unknown) => { tables.push(t); return builder as never })
  return { calls, tables }
}

const wv = (over: Partial<WriteoffValuationRow> = {}): WriteoffValuationRow => ({
  movement_id: 'm1', source_amount: 100, known_amount: 100, unknown_qty: 0,
  final_amount: 100, valuation_method: 'fifo', override_reason: null, ...over,
})

/* The confirmed LIVE column set of `writeoff_valuations`, read read-only from
   the TEST project through the SQL editor. Anything outside this set does not
   exist on the table; anything inside it that we do not select is a
   deliberate omission. */
const LIVE_COLUMNS = [
  'movement_id', 'source_amount', 'known_amount', 'unknown_qty', 'final_amount',
  'valuation_method', 'override_reason', 'created_by', 'created_at',
  'reversed_by_movement_id', 'reversed_at',
]

describe('the read is column-explicit (R2 / M8-51)', () => {
  /* MUTATION: `select('*')`. A wildcard read would pass every other test in
     this file — the rows come back identically — which is exactly why the
     column list needs a test of its own. It also silently widens the payload
     whenever the table gains a column, and makes the row type an unverified
     claim about the live schema. */
  it('never selects a wildcard', async () => {
    const { calls } = mockPages([{ data: [] }])
    await fetchWriteoffValuations()
    const select = calls.find((c) => c.method === 'select')
    expect(select).toBeDefined()
    expect(String(select!.args[0])).not.toContain('*')
  })

  it('selects exactly the seven columns the screen consumes', async () => {
    const { calls } = mockPages([{ data: [] }])
    await fetchWriteoffValuations()
    const cols = String(calls.find((c) => c.method === 'select')!.args[0])
      .split(',').map((s) => s.trim()).sort()
    expect(cols).toEqual([
      'final_amount', 'known_amount', 'movement_id', 'override_reason',
      'source_amount', 'unknown_qty', 'valuation_method',
    ])
  })

  /* Every selected column must actually exist live. This is the check that
     would have caught a column invented from the legacy field names. */
  it('selects only columns confirmed to exist in the live table', async () => {
    const { calls } = mockPages([{ data: [] }])
    await fetchWriteoffValuations()
    const cols = String(calls.find((c) => c.method === 'select')!.args[0])
      .split(',').map((s) => s.trim())
    for (const c of cols) expect(LIVE_COLUMNS).toContain(c)
  })

  it('reads the writeoff_valuations table', async () => {
    const { tables } = mockPages([{ data: [] }])
    await fetchWriteoffValuations()
    expect(tables).toEqual(['writeoff_valuations'])
  })
})

describe('paging', () => {
  /* MUTATION: ordering removed. Without an ORDER BY, PostgREST may return
     rows in any order, so `range()` pages can overlap or skip and the
     assembled set is silently incomplete. */
  it('orders before ranging so the page window is taken from a sorted set', async () => {
    const { calls } = mockPages([{ data: [] }])
    await fetchWriteoffValuations()
    const methods = calls.map((c) => c.method)
    expect(calls.filter((c) => c.method === 'order').map((c) => c.args[0])).toEqual(['movement_id'])
    expect(methods.lastIndexOf('order')).toBeLessThan(methods.indexOf('range'))
  })

  it('keeps paging past the 1000-row boundary and stops on a short page', async () => {
    const full = Array.from({ length: 1000 }, (_, i) => wv({ movement_id: 'm' + i }))
    const { calls } = mockPages([{ data: full }, { data: [wv({ movement_id: 'last' })] }])
    const res = await fetchWriteoffValuations()
    expect(res.rows).toHaveLength(1001)
    expect(calls.filter((c) => c.method === 'range').map((c) => c.args)).toEqual([[0, 999], [1000, 1999]])
  })

  it('stops immediately when the first page is short', async () => {
    const { calls } = mockPages([{ data: [wv()] }])
    await fetchWriteoffValuations()
    expect(calls.filter((c) => c.method === 'range')).toHaveLength(1)
  })
})

describe('never throws, and never returns partial rows on failure', () => {
  /* MUTATION: returning the rows gathered so far alongside `ok: false`. A
     partially-read valuation set is indistinguishable from a complete one at
     the call site, so real Silinmə rows would silently fall back to the legacy
     price path and display a DIFFERENT amount with nothing indicating it. */
  it('discards already-read pages when a later page errors', async () => {
    const full = Array.from({ length: 1000 }, (_, i) => wv({ movement_id: 'm' + i }))
    mockPages([{ data: full }, { error: { message: 'boom' } }])
    const res = await fetchWriteoffValuations()
    expect(res.ok).toBe(false)
    expect(res.rows).toEqual([])
    expect(res.error).toBe('boom')
  })

  it('absorbs a returned error', async () => {
    mockPages([{ error: { message: 'İcazə yoxdur' } }])
    const res = await fetchWriteoffValuations()
    expect(res).toEqual({ rows: [], ok: false, error: 'İcazə yoxdur' })
  })

  it('absorbs a rejected promise rather than throwing', async () => {
    const builder: Record<string, unknown> = {}
    builder.select = () => builder
    builder.order = () => builder
    builder.range = () => Promise.reject(new Error('network down'))
    vi.mocked(supabase.from).mockReturnValue(builder as never)
    await expect(fetchWriteoffValuations()).resolves.toEqual({
      rows: [], ok: false, error: 'network down',
    })
  })

  it('an empty table is a SUCCESS, not a failure', async () => {
    mockPages([{ data: [] }])
    const res = await fetchWriteoffValuations()
    expect(res).toEqual({ rows: [], ok: true, error: null })
  })
})

describe('buildWriteoffValuationMap', () => {
  it('keys by movement id as a string', () => {
    const map = buildWriteoffValuationMap([wv({ movement_id: 'a' }), wv({ movement_id: 'b' })])
    expect(map.get('a')?.movement_id).toBe('a')
    expect(map.size).toBe(2)
  })

  it('is empty for no rows, so every lookup misses and falls back', () => {
    expect(buildWriteoffValuationMap([]).size).toBe(0)
  })
})

/* This module is READ-ONLY. A write helper appearing here would be an I-4
   concern at the earliest, and this milestone authorises no write at all. */
describe('read-only', () => {
  it('exposes no write, delete or rpc helper', async () => {
    const mod = await import('./writeoffValuations.api')
    const names = Object.keys(mod).join(' ').toLowerCase()
    for (const forbidden of ['insert', 'update', 'delete', 'upsert', 'rpc', 'cancel']) {
      expect(names).not.toContain(forbidden)
    }
  })
})
