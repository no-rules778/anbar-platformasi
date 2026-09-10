import { create } from 'zustand'
import { fetchMovementsSnapshot, type MovementsSnapshot } from '../api/movementsSnapshot.api'
import { fetchLayerCapability } from '../api/stockLayers.api'
import { buildWriteoffValuationMap, type WriteoffValuationRow } from '../api/writeoffValuations.api'
import { excludeCancelled } from '../lib/operationalMovements'
import { EMPTY_MOVEMENT_FILTERS, type MovementFilters, type MovementFilterItem, type MovementFilterRow } from '../lib/movementFilters'
import type { MovementRow } from '../api/itemMovements.api'
import type { ItemRow } from '../api/items.api'

/* «Mal hərəkəti» state — the original's module-level `MF` (index.html:1592).

   The filters live HERE, not in the page component. The original's screens are
   long-lived DOM that go() shows and hides, so its inputs survive navigation;
   React unmounts the page, and component-local filter state would be silently
   discarded on every visit. That is the M4-18 lesson, applied up front.

   `MF.page`/`MF.size` are deliberately NOT ported: they belong to a numbered
   pager this screen does not use — it uses the 3000-row soft cap instead. */

export interface MovementsState {
  /** The RAW loaded set, before `excludeCancelled()`. The cancellation-state
      helpers need the marker rows the operational view removes, so both are
      kept: `rows` is the source of truth, `operational` the row source. */
  rows: MovementRow[]
  /** `normalMovements()` — the table's row source (M8-03). */
  operational: MovementFilterRow[]
  /** `DB.itemBy` — code → nomenclature row. */
  itemBy: Map<string, MovementFilterItem>
  /** `DB.whs`. Never scoped to the user's warehouse — see the API module. */
  warehouses: string[]
  /** `DB.woVals` — movement id → its write-off valuation. A genuinely empty
      map means the read SUCCEEDED and found no rows, so Silinmə falls back to
      the legacy per-row price. It never means "the table was not read": that
      case fails the whole snapshot and leaves this map untouched (I-2 audit). */
  valuations: Map<string, WriteoffValuationRow>

  loading: boolean
  error: string | null
  /** True once a snapshot has been applied, so the page can tell "still
      loading" from "loaded and genuinely empty". */
  loaded: boolean

  /**
   * `stock_layers_supported().active` — M8-26, milestone I-4.
   *
   * Chooses the LAYER variant of every cancellation RPC. Meaningful ONLY when
   * `layerReady` is true; while capability is unknown this value is not a
   * decision and must not select a write family.
   */
  layerActive: boolean

  /**
   * Whether the capability probe ACTUALLY ANSWERED — I-4 audit, finding 3.
   *
   * `fetchLayerCapability()` distinguishes two states that both carry
   * `active:false`:
   *   {ready:true,  active:false}  the server answered: layers are OFF
   *   {ready:false, active:false}  the probe FAILED: we do not know
   *
   * The store previously kept only `active`, collapsing the two — so a failed
   * probe silently routed cancellations to the NON-LAYER RPC family. If layer
   * accounting was in fact active, that is the wrong write against real stock,
   * chosen on no evidence.
   *
   * DOCUMENTED SAFETY DEVIATION FROM LEGACY. index.html:949-975 degrades to
   * the pre-layer path on a failed probe. That is acceptable for the READS it
   * guards there; it is not acceptable for a cancellation, which mutates
   * stock. Here an unknown capability blocks the write and shows a retry
   * instead. This changes behaviour ONLY in the uncertain/error state — a
   * successful `{ready:true, active:false}` still selects the non-layer RPCs
   * exactly as before.
   *
   * A refresh whose probe fails after a previously KNOWN capability keeps the
   * known value rather than flipping families: losing the probe is not
   * evidence that the capability changed.
   */
  layerReady: boolean

  /**
   * Whether the capability behind `layerReady`/`layerActive` was confirmed by
   * the probe belonging to the CURRENTLY APPLIED snapshot — I-9 audit.
   *
   * `layerReady` above is deliberately STICKY: a refresh whose probe fails
   * keeps the last known capability, because losing a probe is not evidence
   * that the capability changed, and flipping the cancellation write family on
   * a lost probe would be worse than keeping it. That is correct for
   * cancellation ROUTING and is not changed here.
   *
   * It is NOT sufficient for the Silinmə export, which uses the same pair to
   * decide whether to SKIP the allocation read entirely. There, a stale
   * `{ready:true, active:false}` means «Mənbə partiyalar» is omitted from a
   * report on evidence that the latest probe failed to reconfirm — and a
   * missing sheet reads as "this write-off had no source lots", not as "we did
   * not check".
   *
   * So this flag records FRESHNESS separately from the capability itself:
   *   true   the probe that shipped with the applied snapshot ANSWERED
   *   false  it did not — the retained capability is a memory, not evidence
   *
   * Read by the export only. Cancellation routing keeps using `layerReady`
   * alone and its retained capability is untouched.
   */
  layerFresh: boolean

  filters: MovementFilters
  /** `SHOW_ALL['mov']` — sticky, never cleared by a filter change (M8-11). */
  showAll: boolean

  setFilters: (patch: Partial<MovementFilters>) => void
  /** The İstiqamət selection alone, which does NOT reset the others. */
  setMovKey: (p: string) => void
  setShowAll: (v: boolean) => void
  reset: () => void
  load: () => Promise<{ ok: boolean; error: string | null }>
}

const EMPTY: Pick<MovementsState, 'rows' | 'operational' | 'itemBy' | 'warehouses' | 'valuations'> = {
  rows: [],
  operational: [],
  itemBy: new Map(),
  warehouses: [],
  valuations: new Map(),
}

/* M8-44 — the monotonic request sequence.

   The legacy code calls loadFromDB() after every action and renders whatever
   arrives last (index.html). In React that is a real ordering bug: realtime
   fires a refresh, the user changes a filter, and two loads are in flight at
   once. If the FIRST resolves last it overwrites newer data with older rows,
   and nothing on screen indicates it happened.

   Every load takes a ticket; a reply whose ticket is not the newest issued is
   discarded outright — it does not write rows, does not clear the error and
   does not touch `loading`. Same discipline as `auditLog.store.ts` (M4-13).

   Module-level, not store state: it must survive a `set()` and must never
   itself trigger a re-render. */
let requestSeq = 0

/** Test seam — resets the sequence so one test's counter cannot leak into the
    next. Never called by application code. */
export function __resetMovementsRequestSeq(): void {
  requestSeq = 0
}

function derive(snapshot: MovementsSnapshot) {
  return {
    rows: snapshot.movements,
    /* M8-03 — the row source is `excludeCancelled()`, REUSED from
       lib/operationalMovements.ts, never reimplemented here. It is computed
       once per load rather than per render: it is O(n) over the whole table
       and its result changes only when the data does. */
    operational: excludeCancelled(snapshot.movements) as MovementFilterRow[],
    /* `unit` is carried through for the Excel export (I-7). It is already in
       `snapshot.items` — `items.api.ts` selects it — so preserving it here
       adds no read and no request; dropping it was what forced the export to
       be considered blocked on a wider read. */
    itemBy: new Map<string, MovementFilterItem>(
      snapshot.items.map((i: ItemRow) => [i.code, { name: i.name, price: i.price, unit: i.unit }]),
    ),
    warehouses: snapshot.warehouses,
    valuations: buildWriteoffValuationMap(snapshot.valuations),
  }
}

export const useMovementsStore = create<MovementsState>((set, get) => ({
  ...EMPTY,
  loading: false,
  error: null,
  loaded: false,
  layerActive: false,
  layerReady: false,
  layerFresh: false,
  filters: EMPTY_MOVEMENT_FILTERS,
  showAll: false,

  /* The legacy `upd()` (index.html:1624-1628) resets only `MF.page`, which
     this screen does not have. `showAll` is NOT reset: SHOW_ALL['mov'] is
     global in the original and survives every filter change (M8-11). */
  setFilters: (patch) => set((s) => ({ filters: { ...s.filters, ...patch } })),

  setMovKey: (p) => set((s) => ({ filters: { ...s.filters, p } })),

  setShowAll: (v) => set({ showAll: v }),

  /* «Sıfırla» — index.html:1631. Clears the six filters and nothing else: not
     `showAll`, and not the loaded data. */
  reset: () => set({ filters: EMPTY_MOVEMENT_FILTERS }),

  load: async () => {
    const reqId = ++requestSeq
    set({ loading: true })
    /* Both reads are issued together. The capability probe never throws and
       never fails the load: `fetchLayerCapability()` returns the inactive
       state on any failure. */
    const [res, layerCap] = await Promise.all([
      fetchMovementsSnapshot(),
      fetchLayerCapability(),
    ])

    /* A newer load has been issued since — this reply is stale. Return
       WITHOUT touching state: the newer request owns `loading` and will
       settle it, so clearing it here would flicker the screen out of its
       loading state while a load is still running. */
    if (reqId !== requestSeq) return { ok: res.ok, error: res.ok ? null : res.error }

    if (!res.ok) {
      /* M8-45 — a failed refresh KEEPS the previous snapshot, WHOLE. Only
         `error` and `loading` change, so a transient network failure cannot
         blank a working screen or turn real rows into an apparent "no
         movements". The user sees the last good data AND an honest error, not
         one or the other. `loaded` is likewise untouched.

         This now covers a failed VALUATION read too (I-2 audit): the snapshot
         is atomic, so `valuations` is retained here exactly like `rows`, and
         displayed Silinmə amounts cannot shift under a transient failure. */
      set({ loading: false, error: res.error })
      return { ok: false, error: res.error }
    }

    /* The probe result is applied only alongside a SUCCESSFUL snapshot, so a
       transient failure cannot silently flip the cancellation routing while
       the previous rows stay on screen.

       A probe that DID answer replaces the capability. A probe that did not
       leaves the previous one untouched — known-good capability survives a
       transient probe failure (finding 3), and an unknown one stays unknown
       rather than defaulting to a write family. */
    const prev = get()
    const capability = layerCap.ready
      ? { layerReady: true, layerActive: layerCap.active }
      : { layerReady: prev.layerReady, layerActive: prev.layerActive }
    /* Freshness tracks THIS probe only and is never retained: it is the one
       fact the retained capability above cannot express. */
    const layerFresh = layerCap.ready

    set({
      ...derive(res.snapshot),
      ...capability,
      layerFresh,
      loading: false,
      error: null,
      loaded: true,
    })
    return { ok: true, error: null }
  },
}))

/** Non-hook accessor for tests and for callers outside React. */
export const movementsStore = () => useMovementsStore.getState()
