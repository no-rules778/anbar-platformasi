import { create } from 'zustand'
import { fetchItemRequests } from '../api/itemRequests.api'
import { fetchItems, type ItemRow } from '../api/items.api'
import { fetchReferenceValues, type ReferenceValues } from '../api/referenceValues.api'
import { DEFAULT_FILTERS, type ItemRequestView, type RequestFilters } from '../lib/nomenclatureRequests'

/* «Nomenklatura sorğuları» state — the legacy `DB.itemReqs` slice plus the
   long-lived `NREQ` filter object (index.html:2470).

   The FILTERS live here, not in the page: legacy's `NREQ` survives go()
   because its screens are long-lived DOM, while React unmounts the page. Store
   state reproduces that (M12-17, the M4-18 / M9-06 rule).

   Snapshot discipline mirrors the accepted warehouseOverview / dashboard
   stores: one atomic generation, retention on a failed refresh, and a
   module-level ticket so a stale reply can never overwrite a newer one. */

let requestSeq = 0

export interface LoadOutcome {
  ok: boolean
  error: string | null
}

interface State {
  requests: ItemRequestView[]
  /** `DB.items` — the duplicate/similar warning source (M12-10). */
  items: ItemRow[]
  /** Shared active unit/category source; failure is non-fatal under A14. */
  referenceValues: ReferenceValues
  refsReady: boolean
  filters: RequestFilters
  loading: boolean
  loaded: boolean
  error: string | null
  load: () => Promise<LoadOutcome>
  setFilters: (patch: Partial<RequestFilters>) => void
}

const FAIL_ITEMS = 'Nomenklatura yüklənmədi'
const EMPTY_REFERENCE_VALUES: ReferenceValues = { channel: [], unit: [], category: [], serfiyyat_channel: [] }

export const useItemRequestsStore = create<State>((set) => ({
  requests: [],
  items: [],
  referenceValues: EMPTY_REFERENCE_VALUES,
  refsReady: false,
  filters: DEFAULT_FILTERS,
  loading: false,
  loaded: false,
  error: null,

  load: async () => {
    const ticket = ++requestSeq
    set({ loading: true })

    /* M12-10 correction: load only the shared reference-values RPC needed by
       the two dialogs. Never mount/load the whole Soraqçalar store, which
       would add warehouses, partners, Sərfiyyat and usage reads. Reference
       failure stays non-fatal by the accepted A14 fallback rule. */
    const [reqs, items, refs] = await Promise.all([
      fetchItemRequests(), fetchItems(), fetchReferenceValues(),
    ])

    /* A reply from an older load never overwrites a newer one — success AND
       failure alike (M12-15). */
    if (ticket !== requestSeq) {
      const ok = reqs.ok && items.ok
      return { ok, error: ok ? null : (reqs.error ?? items.error ?? null) }
    }

    /* M12-13 — ATOMIC: either reader failing applies nothing. A failed
       `item_requests` read is explicit, never a successful empty list
       (M12-11). M12-14 — a failed REFRESH retains the previous complete
       snapshot; only the error flag is raised. */
    if (!reqs.ok || !items.ok) {
      const error = (!reqs.ok ? reqs.error : items.error) ?? FAIL_ITEMS
      set({ loading: false, error })
      return { ok: false, error }
    }

    set({
      requests: reqs.rows,
      items: items.rows,
      referenceValues: refs.values,
      refsReady: refs.ready,
      loading: false,
      loaded: true,
      error: null,
    })
    return { ok: true, error: null }
  },

  setFilters: (patch) => set((s) => ({ filters: { ...s.filters, ...patch } })),
}))
