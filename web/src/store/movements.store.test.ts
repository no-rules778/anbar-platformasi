import { describe, it, expect, vi, beforeEach } from 'vitest'

const fetchMovementsSnapshot = vi.fn()
/* I-4 added a layer-capability probe to `load()`. Mocked so this suite makes
   no network call; the probe is exercised on its own below. */
const fetchLayerCapability = vi.fn(async () => ({ ready: true, active: false, version: 1 }))
vi.mock('../api/stockLayers.api', () => ({
  fetchLayerCapability: () => fetchLayerCapability(),
  LAYERS_INACTIVE: { ready: false, active: false, version: 0 },
}))

vi.mock('../api/movementsSnapshot.api', () => ({
  fetchMovementsSnapshot: () => fetchMovementsSnapshot(),
}))

import { useMovementsStore, __resetMovementsRequestSeq } from './movements.store'
import { EMPTY_MOVEMENT_FILTERS } from '../lib/movementFilters'
import type { MovementRow } from '../api/itemMovements.api'

const mv = (over: Partial<MovementRow> = {}): MovementRow => ({
  id: 'm1', item_code: '0000001', warehouse: 'Ələt', date: '2026-09-01',
  in_qty: 10, out_qty: 0, price: 2, partner: 'Azpetrol', type: 'Satınalma',
  invoice_num: null, note: null, doc_num: null, created_at: '2026-09-01T10:00:00Z',
  channel: null, contract_num: null, created_by: null, ...over,
})

function snapshot(over: Record<string, unknown> = {}) {
  return {
    ok: true as const,
    snapshot: {
      movements: [mv()],
      items: [{ code: '0000001', name: 'Nasos', unit: 'ədəd', price: 5, category: null }],
      warehouses: ['Ələt', 'Astara'],
      valuations: [],
      ...over,
    },
  }
}

/** A promise this test controls the resolution of. */
function deferred<T>() {
  let resolve!: (v: T) => void
  const promise = new Promise<T>((r) => { resolve = r })
  return { promise, resolve }
}

beforeEach(() => {
  vi.clearAllMocks()
  fetchLayerCapability.mockResolvedValue({ ready: true, active: false, version: 1 })
  __resetMovementsRequestSeq()
  useMovementsStore.setState({
    rows: [], operational: [], itemBy: new Map(), warehouses: [],
    valuations: new Map(),
    loading: false, error: null, loaded: false, layerActive: false, layerReady: false,
    layerFresh: false,
    filters: EMPTY_MOVEMENT_FILTERS, showAll: false,
  })
})

const store = () => useMovementsStore.getState()

describe('load', () => {
  it('applies the snapshot and marks the screen loaded', async () => {
    fetchMovementsSnapshot.mockResolvedValue(snapshot())
    const res = await store().load()
    expect(res).toEqual({ ok: true, error: null })
    expect(store().rows).toHaveLength(1)
    expect(store().warehouses).toEqual(['Ələt', 'Astara'])
    /* `unit` joined this index in I-7: the Excel export's «Ölçü» column reads
       it, and `snapshot.items` already carried it — `derive()` was simply
       dropping it. Asserted as an exact object so a future field cannot be
       added here unnoticed. */
    expect(store().itemBy.get('0000001')).toEqual({ name: 'Nasos', price: 5, unit: 'ədəd' })
    expect(store().loaded).toBe(true)
    expect(store().loading).toBe(false)
  })

  /* M8-03 — the row source is `excludeCancelled()`. The marker row and the
     row it cancels must both leave `operational`, while `rows` keeps them:
     the cancellation-state helpers need the markers the operational view drops.

     MUTATION: `operational` set to the raw movements. The cancelled row and
     its «Ləğv:» marker would then both appear in the registry. */
  it('derives operational rows through excludeCancelled, keeping rows raw', async () => {
    fetchMovementsSnapshot.mockResolvedValue(snapshot({
      movements: [
        mv({ id: 'a', doc_num: 'D-1' }),
        mv({ id: 'b', doc_num: 'D-2', note: 'Ləğv: D-1' }),
      ],
    }))
    await store().load()
    expect(store().rows).toHaveLength(2)
    expect(store().operational).toHaveLength(0)
  })

  /* I-2 AUDIT, finding 1 — a valuation read that SUCCEEDS with no rows is a
     normal, complete snapshot. The failure case is no longer representable as
     a successful snapshot at all: the API returns `ok: false` for it, which
     lands on the M8-45 retention path tested below. */
  it('applies a successful snapshot whose valuation set is empty', async () => {
    fetchMovementsSnapshot.mockResolvedValue(snapshot({ valuations: [] }))
    await store().load()
    expect(store().loaded).toBe(true)
    expect(store().error).toBe(null)
    expect(store().valuations.size).toBe(0)
  })

  it('indexes valuations by movement id', async () => {
    fetchMovementsSnapshot.mockResolvedValue(snapshot({
      valuations: [{
        movement_id: 'm1', source_amount: 1, known_amount: 1, unknown_qty: 0,
        final_amount: 1, valuation_method: 'fifo', override_reason: null,
      }],
    }))
    await store().load()
    expect(store().valuations.get('m1')?.final_amount).toBe(1)
  })
})

/* M8-45 — a failed refresh must retain the last good snapshot.

   This is the behaviour that keeps a transient network blip from blanking a
   working screen, or from turning a real registry into an apparent "no
   movements yet". */
describe('a failed refresh keeps the previous snapshot (M8-45)', () => {
  /* MUTATION: the failure branch clearing rows/operational, or setting
     `loaded: false`. Either would replace real data with an empty table while
     showing only an error — the user loses the data they already had. */
  it('keeps rows, warehouses and loaded after a failure', async () => {
    fetchMovementsSnapshot.mockResolvedValue(snapshot())
    await store().load()

    fetchMovementsSnapshot.mockResolvedValue({ ok: false, error: 'şəbəkə xətası' })
    const res = await store().load()

    expect(res).toEqual({ ok: false, error: 'şəbəkə xətası' })
    expect(store().rows).toHaveLength(1)
    expect(store().operational).toHaveLength(1)
    expect(store().warehouses).toEqual(['Ələt', 'Astara'])
    expect(store().loaded).toBe(true)
    expect(store().error).toBe('şəbəkə xətası')
    expect(store().loading).toBe(false)
  })

  /* I-2 AUDIT, finding 1 — the retained snapshot includes the VALUATION MAP.

     MUTATION: the failure branch resetting `valuations` to an empty Map, which
     is exactly what the old degraded-success path caused indirectly. Existing
     Silinmə rows would keep their movement data but lose `final_amount`, so
     they would silently re-render at the legacy per-row fallback amount after
     nothing worse than one transient network failure. */
  it('keeps the previous VALUATION MAP after a failed refresh', async () => {
    fetchMovementsSnapshot.mockResolvedValue(snapshot({
      valuations: [{
        movement_id: 'm1', source_amount: 90, known_amount: 90, unknown_qty: 0,
        final_amount: 90, valuation_method: 'fifo', override_reason: null,
      }],
    }))
    await store().load()
    expect(store().valuations.get('m1')?.final_amount).toBe(90)

    /* The valuation read failing is now this: an ok:false snapshot. */
    fetchMovementsSnapshot.mockResolvedValue({ ok: false, error: 'Silinmə dəyərləri yüklənmədi' })
    await store().load()

    expect(store().valuations.size).toBe(1)
    expect(store().valuations.get('m1')?.final_amount).toBe(90)
    expect(store().rows).toHaveLength(1)
    expect(store().error).toBe('Silinmə dəyərləri yüklənmədi')
  })

  it('clears the error once a later load succeeds', async () => {
    fetchMovementsSnapshot.mockResolvedValue({ ok: false, error: 'boom' })
    await store().load()
    expect(store().error).toBe('boom')

    fetchMovementsSnapshot.mockResolvedValue(snapshot())
    await store().load()
    expect(store().error).toBeNull()
  })

  it('a first-ever failure leaves loaded false, so the page shows a real error state', async () => {
    fetchMovementsSnapshot.mockResolvedValue({ ok: false, error: 'boom' })
    await store().load()
    expect(store().loaded).toBe(false)
    expect(store().rows).toEqual([])
  })
})

/* M8-44 — monotonic request sequencing. */
describe('a late response cannot overwrite newer state (M8-44)', () => {
  /* MUTATION: the `reqId !== requestSeq` guard removed. The FIRST load
     resolves LAST here, so without the guard the older rows would win and the
     screen would silently show stale data under the newer filters. */
  it('discards a stale success that resolves after a newer one', async () => {
    const slow = deferred<unknown>()
    const fast = deferred<unknown>()
    fetchMovementsSnapshot.mockReturnValueOnce(slow.promise).mockReturnValueOnce(fast.promise)

    const first = store().load()
    const second = store().load()

    fast.resolve(snapshot({ movements: [mv({ id: 'NEW' })] }))
    await second
    slow.resolve(snapshot({ movements: [mv({ id: 'OLD' }), mv({ id: 'OLD2' })] }))
    await first

    expect(store().rows.map((r) => r.id)).toEqual(['NEW'])
  })

  /* MUTATION: the stale branch still writing the error. A late FAILURE from
     an abandoned request would then show an error over data that loaded
     perfectly well afterwards. */
  it('a stale failure does not raise an error over newer good data', async () => {
    const slow = deferred<unknown>()
    const fast = deferred<unknown>()
    fetchMovementsSnapshot.mockReturnValueOnce(slow.promise).mockReturnValueOnce(fast.promise)

    const first = store().load()
    const second = store().load()

    fast.resolve(snapshot())
    await second
    slow.resolve({ ok: false, error: 'stale boom' })
    await first

    expect(store().error).toBeNull()
    expect(store().rows).toHaveLength(1)
  })

  /* MUTATION: the stale branch calling `set({ loading: false })`. The newer
     request is still in flight, so the screen would drop out of its loading
     state while a load is genuinely running. */
  it('a stale reply does not settle the loading flag owned by the newer request', async () => {
    const slow = deferred<unknown>()
    const fast = deferred<unknown>()
    fetchMovementsSnapshot.mockReturnValueOnce(slow.promise).mockReturnValueOnce(fast.promise)

    const first = store().load()
    void store().load()

    slow.resolve(snapshot())
    await first

    expect(store().loading).toBe(true)
    fast.resolve(snapshot())
  })
})

describe('filters', () => {
  it('patches one filter without disturbing the others', () => {
    store().setFilters({ w: 'Ələt' })
    store().setFilters({ t: 'Silinmə' })
    expect(store().filters.w).toBe('Ələt')
    expect(store().filters.t).toBe('Silinmə')
  })

  it('setMovKey changes only the İstiqamət selection', () => {
    store().setFilters({ w: 'Ələt' })
    store().setMovKey('partner:Azpetrol')
    expect(store().filters).toMatchObject({ w: 'Ələt', p: 'partner:Azpetrol' })
  })

  /* M8-11 — SHOW_ALL['mov'] is global in the original and is never cleared by
     a filter change (index.html:1679).

     MUTATION: `setFilters` resetting showAll. The expansion would be thrown
     away by the search box and by every date change. */
  it('a filter change does NOT collapse an expanded list', () => {
    store().setShowAll(true)
    store().setFilters({ q: 'nasos' })
    expect(store().showAll).toBe(true)
  })

  /* «Sıfırla» clears the filters and nothing else (index.html:1631). */
  it('reset clears every filter but keeps showAll and the loaded data', async () => {
    fetchMovementsSnapshot.mockResolvedValue(snapshot())
    await store().load()
    store().setFilters({ q: 'x', w: 'Ələt', t: 'Satış', d1: '2026-01-01', d2: '2026-02-01' })
    store().setMovKey('partner:P')
    store().setShowAll(true)

    store().reset()

    expect(store().filters).toEqual(EMPTY_MOVEMENT_FILTERS)
    expect(store().showAll).toBe(true)
    expect(store().rows).toHaveLength(1)
  })
})

/* ===================================================================== */
describe('layer capability — fail-closed routing (M8-26, I-4 audit finding 3)', () => {
  /* `fetchLayerCapability()` distinguishes two states that BOTH carry
     `active:false`:
       {ready:true,  active:false}  the server answered: layers are OFF
       {ready:false, active:false}  the probe FAILED: capability UNKNOWN
     Keeping only `active` collapsed them, so a failed probe silently selected
     the non-layer cancellation RPCs on no evidence. */

  it('starts UNKNOWN, not "layers off"', () => {
    expect(store().layerReady).toBe(false)
    expect(store().layerActive).toBe(false)
  })

  it('takes the live capability answer on a successful load', async () => {
    fetchLayerCapability.mockResolvedValueOnce({ ready: true, active: true, version: 2 })
    fetchMovementsSnapshot.mockResolvedValue(snapshot())
    await store().load()
    expect(store().layerReady).toBe(true)
    expect(store().layerActive).toBe(true)
  })

  /* A probe that ANSWERED "inactive" is a real answer and legitimately
     selects the non-layer RPCs — unchanged from legacy. */
  it('a successful {ready:true, active:false} selects the non-layer family', async () => {
    fetchLayerCapability.mockResolvedValueOnce({ ready: true, active: false, version: 1 })
    fetchMovementsSnapshot.mockResolvedValue(snapshot())
    await store().load()
    expect(store().layerReady).toBe(true)
    expect(store().layerActive).toBe(false)
  })

  /* THE MUTATION: treating a FAILED probe as "layers off". That is the
     unverified write-family selection this finding is about. */
  it('a FAILED probe leaves the capability UNKNOWN — it does not mean "off"', async () => {
    fetchLayerCapability.mockResolvedValueOnce({ ready: false, active: false, version: 0 })
    fetchMovementsSnapshot.mockResolvedValue(snapshot())
    await store().load()
    expect(store().layerReady).toBe(false)
    /* The rows still load — only the cancellation WRITE is blocked. */
    expect(store().loaded).toBe(true)
    expect(store().rows.length).toBe(1)
  })

  /* Losing the probe is not evidence that the capability changed. */
  it('a refresh whose probe fails PRESERVES a previously known capability', async () => {
    fetchLayerCapability.mockResolvedValueOnce({ ready: true, active: true, version: 2 })
    fetchMovementsSnapshot.mockResolvedValue(snapshot())
    await store().load()
    expect(store().layerReady).toBe(true)
    expect(store().layerActive).toBe(true)

    fetchLayerCapability.mockResolvedValueOnce({ ready: false, active: false, version: 0 })
    fetchMovementsSnapshot.mockResolvedValue(snapshot())
    await store().load()
    /* Still known-good: the families must not flip under a lost probe. */
    expect(store().layerReady).toBe(true)
    expect(store().layerActive).toBe(true)
  })

  /* The flag is applied only alongside a SUCCESSFUL snapshot, so a transient
     snapshot failure cannot silently flip the routing under retained rows. */
  it('keeps the previous capability when the snapshot read fails', async () => {
    fetchLayerCapability.mockResolvedValueOnce({ ready: true, active: true, version: 2 })
    fetchMovementsSnapshot.mockResolvedValue(snapshot())
    await store().load()
    expect(store().layerActive).toBe(true)

    fetchLayerCapability.mockResolvedValueOnce({ ready: false, active: false, version: 0 })
    fetchMovementsSnapshot.mockResolvedValue({ ok: false as const, error: 'şəbəkə xətası' })
    await store().load()
    expect(store().layerReady).toBe(true)
    expect(store().layerActive).toBe(true)
  })

  /* A later successful probe genuinely CHANGES the capability. */
  it('an answering probe replaces a previously known capability', async () => {
    fetchLayerCapability.mockResolvedValueOnce({ ready: true, active: true, version: 2 })
    fetchMovementsSnapshot.mockResolvedValue(snapshot())
    await store().load()
    expect(store().layerActive).toBe(true)

    fetchLayerCapability.mockResolvedValueOnce({ ready: true, active: false, version: 2 })
    await store().load()
    expect(store().layerReady).toBe(true)
    expect(store().layerActive).toBe(false)
  })
})

/* ===================================================================== */
describe('capability FRESHNESS — `layerFresh` (I-9 audit)', () => {
  /* `layerReady`/`layerActive` are deliberately STICKY: a refresh whose probe
     fails keeps the last known capability so cancellation routing does not
     flip on a lost probe. That retention is correct and is NOT changed.

     But it makes the pair unable to answer a second, different question the
     Silinmə export must ask: was this capability confirmed by the probe that
     shipped with the snapshot now on screen, or merely remembered? Only a
     fresh confirmation may skip the allocation read. */

  it('is false before any load', () => {
    expect(store().layerFresh).toBe(false)
  })

  it('is TRUE when the probe answered alongside the applied snapshot', async () => {
    fetchLayerCapability.mockResolvedValueOnce({ ready: true, active: false, version: 1 })
    fetchMovementsSnapshot.mockResolvedValue(snapshot())
    await store().load()
    expect(store().layerFresh).toBe(true)
    expect(store().layerReady).toBe(true)
  })

  /* THE FINDING, at the store level: the capability is RETAINED (correctly)
     but is no longer fresh evidence. Both facts must be visible at once. */
  it('goes FALSE when a later successful snapshot carries a FAILED probe, while the capability is retained', async () => {
    fetchLayerCapability.mockResolvedValueOnce({ ready: true, active: false, version: 1 })
    fetchMovementsSnapshot.mockResolvedValue(snapshot())
    await store().load()
    expect(store().layerFresh).toBe(true)

    fetchLayerCapability.mockResolvedValueOnce({ ready: false, active: false, version: 0 })
    fetchMovementsSnapshot.mockResolvedValue(snapshot({ movements: [mv({ id: 'm2' })] }))
    await store().load()

    /* Routing evidence RETAINED — the I-4 guarantee is untouched. */
    expect(store().layerReady).toBe(true)
    expect(store().layerActive).toBe(false)
    /* Freshness LOST — the new fact the export needs. */
    expect(store().layerFresh).toBe(false)
    /* And the snapshot really did refresh, so this is the stale-capability
       state and not simply a failed load. */
    expect(store().rows.map((r) => r.id)).toEqual(['m2'])
  })

  it('is restored by a later answering probe', async () => {
    fetchLayerCapability.mockResolvedValueOnce({ ready: false, active: false, version: 0 })
    fetchMovementsSnapshot.mockResolvedValue(snapshot())
    await store().load()
    expect(store().layerFresh).toBe(false)

    fetchLayerCapability.mockResolvedValueOnce({ ready: true, active: true, version: 2 })
    await store().load()
    expect(store().layerFresh).toBe(true)
    expect(store().layerActive).toBe(true)
  })

  /* A FAILED snapshot changes nothing at all (M8-45): the rows on screen are
     still the ones whose probe answered, so their freshness stands. */
  it('is untouched by a failed snapshot read', async () => {
    fetchLayerCapability.mockResolvedValueOnce({ ready: true, active: false, version: 1 })
    fetchMovementsSnapshot.mockResolvedValue(snapshot())
    await store().load()
    expect(store().layerFresh).toBe(true)

    fetchLayerCapability.mockResolvedValueOnce({ ready: false, active: false, version: 0 })
    fetchMovementsSnapshot.mockResolvedValue({ ok: false as const, error: 'şəbəkə xətası' })
    await store().load()
    expect(store().layerFresh).toBe(true)
  })
})
