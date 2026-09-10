import { create } from 'zustand'
import { fetchItems, type ItemRow } from '../api/items.api'
import { fetchItemMovements } from '../api/itemMovements.api'
import { fetchWarehouses } from '../api/warehouses.api'
import { buildItemIndexes, type ItemIndexes } from '../lib/itemIndex'
import { EMPTY_ITEM_FILTERS, type ItemListFilters } from '../lib/itemFilters'
import { fetchReferenceValues } from '../api/referenceValues.api'
import { DEFAULT_UNITS, ITEM_CATEGORIES } from '../lib/referenceFallbacks'

/* Nomenclature screen state.

   The list controls live HERE, not in the page component. The original's
   screens are long-lived DOM that go() shows and hides (index.html:1496-1530),
   so its filter inputs are never destroyed; React unmounts the page, and
   component-local state would silently discard a filter the user had set.
   This is the M4-18 lesson, applied up front rather than after an audit. */

const EMPTY_INDEXES: ItemIndexes = {
  byItem: new Map(),
  bal: [],
  priceObs: new Map(),
  operational: [],
}

export interface NomenclatureState {
  items: ItemRow[]
  indexes: ItemIndexes
  /** Active unit labels from the reference directory (`unit` kind). */
  units: string[]
  /** Active item-category labels (`item_category` kind). */
  categories: string[]
  /** Whether the reference directory loaded. False means the lists above are
      the built-in fallbacks, not the directory's own contents (A14). */
  refsReady: boolean
  /** Configured warehouse names, for resolving transfer routes (A12). */
  warehouses: string[]
  loading: boolean
  error: string | null
  filters: ItemListFilters
  /** SHOW_ALL['nom'] — sticky once the user asks for the full list. */
  showAll: boolean
  /** The code whose card is open, or null. */
  cardCode: string | null

  setFilters: (patch: Partial<ItemListFilters>) => void
  setShowAll: (v: boolean) => void
  openCard: (code: string | null) => void
  load: () => Promise<void>
}

export const useNomenclatureStore = create<NomenclatureState>((set) => ({
  items: [],
  indexes: EMPTY_INDEXES,
  units: [],
  categories: [],
  refsReady: false,
  warehouses: [],
  loading: false,
  error: null,
  filters: EMPTY_ITEM_FILTERS,
  showAll: false,
  cardCode: null,

  /* A13 — «show all» is STICKY across filter changes.

     The original keeps two separate pieces of state and only resets one of
     them: NF_.page goes back to 0 on every filter change (2418-2419), but
     SHOW_ALL['nom'] (1679) is never cleared — it survives until the app is
     reloaded. Conflating them meant the expansion was thrown away by the
     search box, by a segment click, and even by the debounced setFilters the
     page fires on mount, so navigating away and back silently collapsed the
     list. Approved Q3 requires the legacy behaviour. */
  setFilters: (patch) => set((s) => ({ filters: { ...s.filters, ...patch } })),
  setShowAll: (v) => set({ showAll: v }),
  openCard: (code) => set({ cardCode: code }),

  load: async () => {
    set({ loading: true, error: null })

    /* A12 — the card's transfer route resolves both sides against the
       CONFIGURED warehouse list, exactly as resolveWh() does against DB.whs
       (index.html:1434-1438). Read-only; the names are used for display
       matching and never written back.

       fetchWarehouses() THROWS rather than returning `{ error }`, so it is
       wrapped here: an unhandled rejection inside this Promise.all would blank
       the whole screen. That is the M3-06a lesson, applied to this load path
       too — a failed warehouse read must only cost the route rendering, which
       then falls back to the stored partner text. */
    const [items, movements, refs, warehouses] = await Promise.all([
      fetchItems(),
      fetchItemMovements(),
      fetchReferenceValues(),
      fetchWarehouses().then((rows) => rows.map((w) => w.name)).catch(() => [] as string[]),
    ])

    /* A failed ITEMS read is fatal for this screen — there is no list without
       it. A failed movements read is not: the original renders the table and
       simply shows no balances, so the screen stays usable. */
    if (!items.ok) {
      set({ loading: false, error: items.error ?? 'Nomenklatura yüklənmədi', items: [], indexes: EMPTY_INDEXES })
      return
    }

    const indexes = movements.ok
      ? buildItemIndexes(items.rows, movements.rows)
      : EMPTY_INDEXES

    /* Units and categories come from the reference directory (Phase 3a):
       reference_values, stored kinds `unit` and `item_category` — the latter
       surfaced under the UI name `category` (index.html:1002, 648). Only
       ACTIVE values are offered, matching unitOptions()/categoryOptions().

       A14 — «not ready» and «ready but empty» are DIFFERENT states and the
       original keeps them apart (unitOptions/categoryOptions, 684-705):

         - refs NOT ready (the load failed, or the SQL is not applied yet):
           fall back to the built-in lists, so the forms stay usable;
         - refs ready with an empty ACTIVE list: stay empty on purpose. An
           Admin who hid every value must not have them reappear through a
           fallback — that is the F3 finding the original's own comment
           records.

       Replacing both with `[]`, as this store previously did, silently turned
       a failed load into "the Admin hid everything". */
    const activeNames = (list: { name: string; active: boolean }[]) =>
      list.filter((r) => r.active).map((r) => r.name)

    set({
      items: items.rows,
      indexes,
      warehouses,
      units: refs.ready ? activeNames(refs.values.unit) : DEFAULT_UNITS.slice(),
      categories: refs.ready ? activeNames(refs.values.category) : ITEM_CATEGORIES.slice(),
      refsReady: refs.ready,
      loading: false,
      error: movements.ok ? null : (movements.error ?? null),
    })
  },
}))
