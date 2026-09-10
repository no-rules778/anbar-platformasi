import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('./supabase', () => ({ supabase: { from: vi.fn() } }))

import { supabase } from './supabase'
import { fetchReferenceUsage } from './referenceUsage.api'
import { usageKey } from '../types/referenceDirectory'

beforeEach(() => vi.clearAllMocks())

interface Mocks {
  movements?: { data?: unknown[]; error?: unknown }
  users?: { data?: unknown[]; error?: unknown }
  items?: { data?: unknown[]; error?: unknown }
}

const orderCalls: string[] = []

function mockQueries({ movements = { data: [] }, users = { data: [] }, items = { data: [] } }: Mocks) {
  orderCalls.length = 0
  vi.mocked(supabase.from).mockImplementation(((table: string) => ({
    select: () => ({
      order: (column: string) => {
        orderCalls.push(`${table}.${column}`)
        const source = table === 'users' ? users : table === 'items' ? items : movements
        return { range: () => Promise.resolve({ data: source.data ?? null, error: source.error ?? null }) }
      },
    }),
  })) as never)
}

const mv = (over: Record<string, unknown>) => ({ id: 1, note: null, doc_num: null, warehouse: null, partner: null, channel: null, ...over })
const it_ = (over: Record<string, unknown>) => ({ code: 'C1', unit: null, category: null, ...over })
/* `id` is only consulted for `project`, which is counted by project_id
   (index.html:2984); the name-keyed kinds carry a placeholder. */
const wh = (name: string) => ({ kind: 'warehouse' as const, id: `w-${name}`, name })
const pt = (name: string) => ({ kind: 'partner' as const, id: `p-${name}`, name })
const ch = (name: string) => ({ kind: 'channel' as const, id: `c-${name}`, name })
const un = (name: string) => ({ kind: 'unit' as const, id: `u-${name}`, name })
const ct = (name: string) => ({ kind: 'category' as const, id: `k-${name}`, name })
const loc = (name: string) => ({ kind: 'location' as const, id: `l-${name}`, name })
const prj = (id: string, name: string) => ({ kind: 'project' as const, id, name })
const sch = (name: string) => ({ kind: 'serfiyyat_channel' as const, id: `s-${name}`, name })
const get = (m: Map<string, unknown>, kind: string, name: string) => m.get(usageKey(kind, name))

/* refUsage counts different things per kind (index.html:2977-2988). */
describe('fetchReferenceUsage — per-kind counting', () => {
  it('counts a warehouse from movements.warehouse OR movements.partner, plus assigned users', async () => {
    mockQueries({
      movements: {
        data: [mv({ id: 1, warehouse: 'Astara' }), mv({ id: 2, partner: 'Astara' }), mv({ id: 3, warehouse: 'Ofis' })],
      },
      users: { data: [{ warehouse: 'Astara' }] },
    })
    const usage = await fetchReferenceUsage([wh('Astara')])
    expect(get(usage, 'warehouse', 'Astara')).toEqual({ count: 3, exact: true })
  })

  it('counts a partner from movements.partner only — never from movements.warehouse', async () => {
    mockQueries({
      movements: {
        data: [mv({ id: 1, partner: 'Bakcell' }), mv({ id: 2, warehouse: 'Bakcell' })],
      },
    })
    const usage = await fetchReferenceUsage([pt('Bakcell')])
    expect(get(usage, 'partner', 'Bakcell')).toEqual({ count: 1, exact: true })
  })

  it('does not count users towards a partner even when a user warehouse shares the name', async () => {
    mockQueries({ movements: { data: [] }, users: { data: [{ warehouse: 'Astara' }] } })
    const usage = await fetchReferenceUsage([pt('Astara'), wh('Astara')])
    expect(get(usage, 'partner', 'Astara')).toEqual({ count: 0, exact: true })
    expect(get(usage, 'warehouse', 'Astara')).toEqual({ count: 1, exact: true })
  })

  it('keys usage by kind, so a warehouse and a partner sharing a name do not collide', async () => {
    mockQueries({ movements: { data: [mv({ id: 1, warehouse: 'Eyni' }), mv({ id: 2, partner: 'Eyni' })] } })
    const usage = await fetchReferenceUsage([wh('Eyni'), pt('Eyni')])
    expect(get(usage, 'warehouse', 'Eyni')).toEqual({ count: 2, exact: true })
    expect(get(usage, 'partner', 'Eyni')).toEqual({ count: 1, exact: true })
  })

  it('excludes cancelled movements for both kinds', async () => {
    mockQueries({
      movements: {
        data: [
          mv({ id: 1, partner: 'Bakcell', doc_num: 'SND-1' }),
          mv({ id: 2, partner: 'Bakcell', doc_num: 'SND-2', note: 'Ləğv: SND-1' }),
          mv({ id: 3, partner: 'Bakcell', doc_num: 'SND-3' }),
        ],
      },
    })
    expect(get(await fetchReferenceUsage([pt('Bakcell')]), 'partner', 'Bakcell')).toEqual({ count: 1, exact: true })
  })

  it('matches with REF_EQ semantics: case, outer whitespace, literal % and _', async () => {
    mockQueries({ movements: { data: [mv({ id: 1, partner: '  BAKCELL ' }), mv({ id: 2, partner: 'Anbar_1' })] } })
    const usage = await fetchReferenceUsage([pt('bakcell'), pt('%'), pt('Anbar_1')])
    expect(get(usage, 'partner', 'bakcell')).toEqual({ count: 1, exact: true })
    expect(get(usage, 'partner', '%')).toEqual({ count: 0, exact: true })
    expect(get(usage, 'partner', 'Anbar_1')).toEqual({ count: 1, exact: true })
  })

  it('reads both tables in one pass, ordered by id', async () => {
    mockQueries({})
    await fetchReferenceUsage([wh('Astara'), pt('Bakcell')])
    expect(orderCalls.filter((c) => c === 'movements.id')).toHaveLength(1)
    expect(orderCalls.filter((c) => c === 'users.id')).toHaveLength(1)
  })

  it('skips the users query entirely when only partners are requested', async () => {
    mockQueries({})
    await fetchReferenceUsage([pt('Bakcell')])
    expect(orderCalls).not.toContain('users.id')
  })
})

describe('fetchReferenceUsage — fail-safe', () => {
  it('marks every kind inexact, never below 1, when the movements read fails', async () => {
    mockQueries({ movements: { error: { message: 'network' } } })
    const usage = await fetchReferenceUsage([wh('Astara'), pt('Bakcell')])
    expect(get(usage, 'warehouse', 'Astara')).toEqual({ count: 1, exact: false })
    expect(get(usage, 'partner', 'Bakcell')).toEqual({ count: 1, exact: false })
  })

  it('a failed users read makes warehouses inexact but leaves partners exact', async () => {
    mockQueries({ movements: { data: [mv({ id: 1, partner: 'Bakcell' })] }, users: { error: { message: 'rls' } } })
    const usage = await fetchReferenceUsage([wh('Astara'), pt('Bakcell')])
    expect(get(usage, 'warehouse', 'Astara')).toEqual({ count: 1, exact: false })
    expect(get(usage, 'partner', 'Bakcell')).toEqual({ count: 1, exact: true })
  })
})

/* Phase 3a kinds. refUsage (index.html:2980-2982): channel counts movements,
   unit and category count items. */
describe('fetchReferenceUsage — channel', () => {
  it('counts a channel from movements.channel only', async () => {
    mockQueries({
      movements: {
        data: [
          mv({ id: 1, channel: 'Nağd' }),
          mv({ id: 2, channel: 'Köçürmə' }),
          mv({ id: 3, partner: 'Nağd' }),
          mv({ id: 4, warehouse: 'Nağd' }),
        ],
      },
    })
    const usage = await fetchReferenceUsage([ch('Nağd')])
    /* Only row 1 — a partner or warehouse that happens to share the name is
       not a channel usage. */
    expect(get(usage, 'channel', 'Nağd')).toEqual({ count: 1, exact: true })
  })

  it('excludes cancelled movements, exactly like the other movement-based kinds', async () => {
    /* index.html:2980 wraps normalMovements(), so a cancelled pair nets to zero. */
    mockQueries({
      movements: {
        data: [
          mv({ id: 1, channel: 'Nağd', doc_num: 'SND-1' }),
          mv({ id: 2, channel: 'Nağd', doc_num: 'SND-2', note: 'Ləğv: SND-1' }),
          mv({ id: 3, channel: 'Nağd', doc_num: 'SND-3' }),
        ],
      },
    })
    expect(get(await fetchReferenceUsage([ch('Nağd')]), 'channel', 'Nağd')).toEqual({ count: 1, exact: true })
  })

  it('matches with REF_EQ semantics', async () => {
    mockQueries({ movements: { data: [mv({ id: 1, channel: '  NAĞD ' })] } })
    expect(get(await fetchReferenceUsage([ch('nağd')]), 'channel', 'nağd')).toEqual({ count: 1, exact: true })
  })

  it('never reads items for a channel', async () => {
    mockQueries({})
    await fetchReferenceUsage([ch('Nağd')])
    expect(orderCalls).not.toContain('items.code')
  })

  it('is inexact when the movements read fails', async () => {
    mockQueries({ movements: { error: { message: 'network' } } })
    expect(get(await fetchReferenceUsage([ch('Nağd')]), 'channel', 'Nağd')).toEqual({ count: 1, exact: false })
  })
})

describe('fetchReferenceUsage — unit and category', () => {
  it('counts a unit from items.unit and a category from items.category', async () => {
    mockQueries({
      items: {
        data: [
          it_({ code: 'A', unit: 'ədəd', category: 'Kanselyariya' }),
          it_({ code: 'B', unit: 'ədəd', category: 'Təsərrüfat' }),
          it_({ code: 'C', unit: 'kq', category: 'Kanselyariya' }),
        ],
      },
    })
    const usage = await fetchReferenceUsage([un('ədəd'), un('kq'), ct('Kanselyariya')])
    expect(get(usage, 'unit', 'ədəd')).toEqual({ count: 2, exact: true })
    expect(get(usage, 'unit', 'kq')).toEqual({ count: 1, exact: true })
    expect(get(usage, 'category', 'Kanselyariya')).toEqual({ count: 2, exact: true })
  })

  it('does not cross unit and category even when a name appears in both columns', async () => {
    mockQueries({ items: { data: [it_({ code: 'A', unit: 'Eyni', category: 'Eyni' })] } })
    const usage = await fetchReferenceUsage([un('Eyni'), ct('Eyni')])
    expect(get(usage, 'unit', 'Eyni')).toEqual({ count: 1, exact: true })
    expect(get(usage, 'category', 'Eyni')).toEqual({ count: 1, exact: true })
  })

  it('is unaffected by cancelled movements — items have no cancellation concept', async () => {
    /* refUsage counts DB.items directly for these two kinds (index.html:2981-2982),
       with no normalMovements() wrapper. A cancelled movement must not change
       an item count. */
    mockQueries({
      movements: {
        data: [
          mv({ id: 1, doc_num: 'SND-1', channel: 'Nağd' }),
          mv({ id: 2, doc_num: 'SND-2', note: 'Ləğv: SND-1', channel: 'Nağd' }),
        ],
      },
      items: { data: [it_({ code: 'A', unit: 'ədəd' }), it_({ code: 'B', unit: 'ədəd' })] },
    })
    expect(get(await fetchReferenceUsage([un('ədəd')]), 'unit', 'ədəd')).toEqual({ count: 2, exact: true })
  })

  it('matches with REF_EQ semantics', async () => {
    mockQueries({ items: { data: [it_({ code: 'A', unit: ' ƏDƏD ' })] } })
    expect(get(await fetchReferenceUsage([un('ədəd')]), 'unit', 'ədəd')).toEqual({ count: 1, exact: true })
  })

  it('reads items once, ordered by code, and skips movements when only item kinds are asked for', async () => {
    mockQueries({})
    await fetchReferenceUsage([un('ədəd'), ct('Kanselyariya')])
    expect(orderCalls.filter((c) => c === 'items.code')).toHaveLength(1)
    expect(orderCalls).not.toContain('movements.id')
    expect(orderCalls).not.toContain('users.id')
  })

  it('reads both sources when item kinds and movement kinds are mixed', async () => {
    mockQueries({})
    await fetchReferenceUsage([un('ədəd'), ch('Nağd')])
    expect(orderCalls.filter((c) => c === 'items.code')).toHaveLength(1)
    expect(orderCalls.filter((c) => c === 'movements.id')).toHaveLength(1)
  })
})

describe('fetchReferenceUsage — per-source failure isolation', () => {
  it('a failed items read makes only unit/category inexact, leaving the others exact', async () => {
    /* Scoping matters: an unreadable `items` table says nothing about how many
       movements use a channel. */
    mockQueries({
      movements: { data: [mv({ id: 1, channel: 'Nağd' }), mv({ id: 2, partner: 'Bakcell' })] },
      users: { data: [] },
      items: { error: { message: 'rls' } },
    })
    const usage = await fetchReferenceUsage([un('ədəd'), ct('Kanselyariya'), ch('Nağd'), pt('Bakcell'), wh('Astara')])
    expect(get(usage, 'unit', 'ədəd')).toEqual({ count: 1, exact: false })
    expect(get(usage, 'category', 'Kanselyariya')).toEqual({ count: 1, exact: false })
    expect(get(usage, 'channel', 'Nağd')).toEqual({ count: 1, exact: true })
    expect(get(usage, 'partner', 'Bakcell')).toEqual({ count: 1, exact: true })
    expect(get(usage, 'warehouse', 'Astara')).toEqual({ count: 0, exact: true })
  })

  it('a failed movements read leaves unit/category exact', async () => {
    mockQueries({
      movements: { error: { message: 'network' } },
      items: { data: [it_({ code: 'A', unit: 'ədəd' })] },
    })
    const usage = await fetchReferenceUsage([un('ədəd'), ch('Nağd')])
    expect(get(usage, 'unit', 'ədəd')).toEqual({ count: 1, exact: true })
    expect(get(usage, 'channel', 'Nağd')).toEqual({ count: 1, exact: false })
  })

  it('a failed users read leaves the Phase 3a kinds exact', async () => {
    mockQueries({
      movements: { data: [mv({ id: 1, channel: 'Nağd' })] },
      users: { error: { message: 'rls' } },
      items: { data: [it_({ code: 'A', unit: 'ədəd' })] },
    })
    const usage = await fetchReferenceUsage([un('ədəd'), ch('Nağd'), wh('Astara')])
    expect(get(usage, 'unit', 'ədəd')).toEqual({ count: 1, exact: true })
    expect(get(usage, 'channel', 'Nağd')).toEqual({ count: 1, exact: true })
    expect(get(usage, 'warehouse', 'Astara')).toEqual({ count: 1, exact: false })
  })
})

/* Phase 3b. refUsage has no `location` branch — it falls through to the
   default, i.e. the warehouse rule (index.html:2986-2987). */
describe('fetchReferenceUsage — location', () => {
  it('counts movements(warehouse OR partner) plus assigned users, exactly like a warehouse', async () => {
    mockQueries({
      movements: {
        data: [mv({ id: 1, warehouse: 'Sahə A' }), mv({ id: 2, partner: 'Sahə A' }), mv({ id: 3, partner: 'X' })],
      },
      users: { data: [{ warehouse: 'Sahə A' }] },
    })
    const usage = await fetchReferenceUsage([loc('Sahə A')])
    expect(get(usage, 'location', 'Sahə A')).toEqual({ count: 3, exact: true })
  })

  it('excludes cancelled movements', async () => {
    mockQueries({
      movements: {
        data: [
          mv({ id: 1, warehouse: 'Sahə A', doc_num: 'SND-1' }),
          mv({ id: 2, warehouse: 'Sahə A', doc_num: 'SND-2', note: 'Ləğv: SND-1' }),
        ],
      },
    })
    expect(get(await fetchReferenceUsage([loc('Sahə A')]), 'location', 'Sahə A')).toEqual({ count: 0, exact: true })
  })

  it('reads the users table for a location — a warehouse in the same call does not mask this', async () => {
    mockQueries({})
    await fetchReferenceUsage([loc('Sahə A')])
    expect(orderCalls).toContain('users.id')
  })

  it('is inexact when the users read fails, like a warehouse', async () => {
    mockQueries({ movements: { data: [] }, users: { error: { message: 'rls' } } })
    expect(get(await fetchReferenceUsage([loc('Sahə A')]), 'location', 'Sahə A')).toEqual({ count: 1, exact: false })
  })

  it('does not collide with a warehouse of the same name', async () => {
    mockQueries({ movements: { data: [mv({ id: 1, warehouse: 'Eyni' })] } })
    const usage = await fetchReferenceUsage([wh('Eyni'), loc('Eyni')])
    expect(get(usage, 'warehouse', 'Eyni')).toEqual({ count: 1, exact: true })
    expect(get(usage, 'location', 'Eyni')).toEqual({ count: 1, exact: true })
  })
})

describe('fetchReferenceUsage — project and serfiyyat_channel', () => {
  const docs = [
    { id: 'd1', projectId: 'pj-1', kanal: 'SM kanalı' },
    { id: 'd2', projectId: 'pj-1', kanal: 'Digər' },
    { id: 'd3', projectId: 'pj-2', kanal: 'SM kanalı' },
  ]

  it('counts a project by project_id, NOT by name', async () => {
    /* index.html:2984 matches d.projectId === x.id. The decisive case: a
       project renamed to another's name must not inherit its count. */
    mockQueries({})
    const usage = await fetchReferenceUsage(
      [prj('pj-1', 'Layihə A'), prj('pj-2', 'Layihə A')],
      { serfiyyatDocuments: docs },
    )
    /* Same name, different ids, different counts. */
    expect(get(usage, 'project', 'pj-1')).toEqual({ count: 2, exact: true })
    expect(get(usage, 'project', 'pj-2')).toEqual({ count: 1, exact: true })
  })

  it('keys a project by id, so a name lookup finds nothing', async () => {
    mockQueries({})
    const usage = await fetchReferenceUsage([prj('pj-1', 'Layihə A')], { serfiyyatDocuments: docs })
    expect(get(usage, 'project', 'Layihə A')).toBeUndefined()
    expect(get(usage, 'project', 'pj-1')).toEqual({ count: 2, exact: true })
  })

  it('counts a serfiyyat_channel by name, with REF_EQ semantics', async () => {
    mockQueries({})
    const usage = await fetchReferenceUsage(
      [sch('sm kanalı'), sch('Yoxdur')],
      { serfiyyatDocuments: [...docs, { id: 'd4', projectId: 'pj-9', kanal: '  SM kanalı ' }] },
    )
    /* d1, d3 and the surrounding-whitespace d4 — case and outer whitespace
       are ignored, exactly as REF_EQ does. */
    expect(get(usage, 'serfiyyat_channel', 'sm kanalı')).toEqual({ count: 3, exact: true })
    expect(get(usage, 'serfiyyat_channel', 'Yoxdur')).toEqual({ count: 0, exact: true })
  })

  it('inherits REF_EQ\'s dotted-İ behaviour rather than "fixing" it', async () => {
    /* Azerbaijani "SM KANALI".toLowerCase() yields "sm kanali" — a dotless ı,
       which is NOT equal to the dotted ı in "SM kanalı". The production
       platform's REF_EQ has the same result, so a value entered in caps does
       not match one entered in lower case here either. Copied deliberately:
       "improving" the comparison would make React count differently from the
       old platform and from the server. */
    mockQueries({})
    const usage = await fetchReferenceUsage(
      [sch('SM kanalı')],
      { serfiyyatDocuments: [{ id: 'd9', projectId: 'pj-1', kanal: 'SM KANALI' }] },
    )
    expect(get(usage, 'serfiyyat_channel', 'SM kanalı')).toEqual({ count: 0, exact: true })
  })

  it('never reads movements, users or items for the serfiyyat kinds alone', async () => {
    mockQueries({})
    await fetchReferenceUsage([prj('pj-1', 'A'), sch('SM kanalı')], { serfiyyatDocuments: docs })
    expect(orderCalls).toEqual([])
  })

  it('is inexact when the Sərfiyyat subsystem is unavailable', async () => {
    /* null documents = the three-read gate failed; the counts are unknown, so
       both kinds are treated as in use. */
    mockQueries({})
    const usage = await fetchReferenceUsage(
      [prj('pj-1', 'A'), sch('SM kanalı')],
      { serfiyyatDocuments: null },
    )
    expect(get(usage, 'project', 'pj-1')).toEqual({ count: 1, exact: false })
    expect(get(usage, 'serfiyyat_channel', 'SM kanalı')).toEqual({ count: 1, exact: false })
  })

  it('defaults to unavailable when no sources argument is passed', async () => {
    mockQueries({})
    const usage = await fetchReferenceUsage([prj('pj-1', 'A')])
    expect(get(usage, 'project', 'pj-1')).toEqual({ count: 1, exact: false })
  })

  it('leaves the other kinds exact when only Sərfiyyat is unavailable', async () => {
    mockQueries({
      movements: { data: [mv({ id: 1, channel: 'Nağd' })] },
      items: { data: [it_({ code: 'A', unit: 'ədəd' })] },
    })
    const usage = await fetchReferenceUsage(
      [prj('pj-1', 'A'), ch('Nağd'), un('ədəd')],
      { serfiyyatDocuments: null },
    )
    expect(get(usage, 'project', 'pj-1')).toEqual({ count: 1, exact: false })
    expect(get(usage, 'channel', 'Nağd')).toEqual({ count: 1, exact: true })
    expect(get(usage, 'unit', 'ədəd')).toEqual({ count: 1, exact: true })
  })

  it('is unaffected by cancelled movements — serfiyyat documents have no cancellation concept', async () => {
    mockQueries({
      movements: {
        data: [mv({ id: 1, doc_num: 'SND-1' }), mv({ id: 2, doc_num: 'SND-2', note: 'Ləğv: SND-1' })],
      },
    })
    const usage = await fetchReferenceUsage([prj('pj-1', 'A')], { serfiyyatDocuments: docs })
    expect(get(usage, 'project', 'pj-1')).toEqual({ count: 2, exact: true })
  })
})
