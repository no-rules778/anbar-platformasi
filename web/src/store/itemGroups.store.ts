import { create } from 'zustand'
import { fetchItemGroupsSnapshot, type ItemGroupsSnapshot } from '../api/itemGroupsSnapshot.api'
import { buildItemIndexes, type ItemIndexes } from '../lib/itemIndex'
import { buildLastPurchaseMap, type LastPurchase } from '../lib/lastPurchase'
import { EMPTY_GROUP_FILTERS, type GroupFilters, type GroupRow } from '../lib/groupFilters'
import type { ItemRow } from '../api/items.api'

/* Mal qrupları state — the original's module-level `GRP` (index.html:2716).

   Every list control lives HERE rather than in the page component. The
   original's screens are long-lived DOM that go() shows and hides, so its
   filters survive navigation; React unmounts the page, and component-local
   state would silently discard them. That is the M4-18 lesson, applied up
   front. */

const EMPTY_INDEXES: ItemIndexes = {
  byItem: new Map(),
  bal: [],
  priceObs: new Map(),
  operational: [],
}

export interface ItemGroupsState {
  items: ItemRow[]
  itemBy: Map<string, ItemRow>
  indexes: ItemIndexes
  lastPurchase: Map<string, LastPurchase>
  /** Legacy `DB.whs` — active `anbar` rows only. */
  warehouses: string[]
  categories: string[]
  refsReady: boolean

  loading: boolean
  error: string | null
  /** True once a snapshot has been applied, so the page can tell "still
      loading" from "loaded and genuinely empty". */
  loaded: boolean

  filters: GroupFilters
  /** `GRP.sel` — keys are `code|warehouse` (M6-24). */
  selection: Set<string>
  /** `SHOW_ALL['grp']` — sticky, never cleared by a filter change (M6-S13). */
  showAll: boolean

  setFilters: (patch: Partial<GroupFilters>) => void
  toggleWarehouse: (w: string) => void
  toggleCategory: (c: string) => void
  toggleSelection: (key: string) => void
  /** Drops selections that are not in `visibleKeys` (M6-25, M6-S12). */
  pruneSelection: (visibleKeys: Set<string>) => void
  clearSelection: () => void
  setShowAll: (v: boolean) => void
  reset: () => void
  load: () => Promise<{ ok: boolean; error: string | null }>
  refresh: () => Promise<{ ok: boolean; error: string | null }>
}

/** Selection key — `r.code + '|' + r.wh` (index.html:2807). */
export function selectionKey(row: Pick<GroupRow, 'code' | 'wh'>): string {
  return row.code + '|' + row.wh
}

function toggle<T>(set: Set<T>, v: T): Set<T> {
  const next = new Set(set)
  if (next.has(v)) next.delete(v)
  else next.add(v)
  return next
}

function derive(snapshot: ItemGroupsSnapshot) {
  const indexes = buildItemIndexes(snapshot.items, snapshot.movements)
  return {
    items: snapshot.items,
    itemBy: new Map(snapshot.items.map((i) => [i.code, i])),
    indexes,
    lastPurchase: buildLastPurchaseMap(snapshot.movements),
    warehouses: snapshot.warehouses,
    categories: snapshot.categories,
    refsReady: snapshot.refsReady,
  }
}

export const useItemGroupsStore = create<ItemGroupsState>((set, get) => ({
  items: [],
  itemBy: new Map(),
  indexes: EMPTY_INDEXES,
  lastPurchase: new Map(),
  warehouses: [],
  categories: [],
  refsReady: false,
  loading: false,
  error: null,
  loaded: false,
  filters: { ...EMPTY_GROUP_FILTERS, whs: new Set(), cats: new Set() },
  selection: new Set(),
  showAll: false,

  setFilters: (patch) => set((s) => ({ filters: { ...s.filters, ...patch } })),

  toggleWarehouse: (w) => set((s) => ({ filters: { ...s.filters, whs: toggle(s.filters.whs, w) } })),
  toggleCategory: (c) => set((s) => ({ filters: { ...s.filters, cats: toggle(s.filters.cats, c) } })),

  toggleSelection: (key) => set((s) => ({ selection: toggle(s.selection, key) })),

  /* M6-25 / M6-S12 — pruning.

     The caller MUST pass the keys of the COMPLETE filtered result, not of the
     rendered page. The original prunes against `rows` (2802), which is the
     full filtered set; the 3000-row cut is applied afterwards, at 2804. Using
     the cut page instead would silently discard selections the user made and
     can still reach through «Hamısını göstər».

     A no-op is returned unchanged so React does not re-render on every pass. */
  pruneSelection: (visibleKeys) => set((s) => {
    if (s.selection.size === 0) return s
    const next = new Set<string>()
    for (const k of s.selection) if (visibleKeys.has(k)) next.add(k)
    return next.size === s.selection.size ? s : { selection: next }
  }),

  clearSelection: () => set({ selection: new Set() }),

  setShowAll: (v) => set({ showAll: v }),

  /* «Süzgəcləri sıfırla» — index.html:2792.

     The original clears the five filters and the selection, then rebuilds the
     filter panel. It does NOT touch SHOW_ALL['grp'], which is global and
     survives (M6-S13), and it does not discard the loaded data (M6-S14).
     Everything outside `filters`/`selection` is therefore left alone here. */
  reset: () => set({
    filters: { ...EMPTY_GROUP_FILTERS, whs: new Set(), cats: new Set() },
    selection: new Set(),
  }),

  load: async () => {
    set({ loading: true, error: null })
    const res = await fetchItemGroupsSnapshot()
    if (!res.ok) {
      /* M6-S3 — atomic. Previously loaded data is KEPT; only the error and the
         loading flag change, so a transient failure cannot blank a working
         screen or turn real rows into an apparent "no positive balance". */
      set({ loading: false, error: res.error })
      return { ok: false, error: res.error }
    }
    set({ ...derive(res.snapshot), loading: false, error: null, loaded: true })
    return { ok: true, error: null }
  },

  /* Refresh-before-export — index.html:2833-2841.

     Identical to load() by design: the original calls the same loadFromDB().
     It is named separately because the export path depends on the RESULT, and
     a future change to one must be a deliberate change to the other. */
  refresh: async () => get().load(),
}))
