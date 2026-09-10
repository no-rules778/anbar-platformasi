import { create } from 'zustand'
import { fetchBalancesSnapshot, type BalancesSnapshot } from '../api/balancesSnapshot.api'
import type { StockConditionRow } from '../api/stockConditions.api'
import type { MovementRow } from '../api/itemMovements.api'
import type { ItemRow } from '../api/items.api'
import { buildItemIndexes, type ItemIndexes } from '../lib/itemIndex'
import { condKey } from '../lib/condSplit'
import type { CondFilter, ZeroSegment } from '../lib/balanceFilters'
import type { InitialBalanceMode } from '../lib/initialBalance'

/* «Anbar qalıqları» state — the legacy module-level `BF` (index.html:1894),
   `DB.conds`/`DB.condsReady` (908-923) and `IX` (1272-1317) for this screen.

   The filters live HERE, not in the page component (M9-06). The original's
   screens are long-lived DOM that go() shows and hides, so its inputs survive
   navigation; React unmounts the page, and component-local filter state would
   be silently discarded on every visit — the M4-18 lesson.

   `BF.page`/`BF.size` are deliberately NOT ported. They belong to a numbered
   pager this screen never renders: `rBal()` pages through `cut()`/`SHOW_ALL`
   (2346, 2367) and never reads `BF.page`, so the `BF.page = 0` writes at
   2219-2230 are dead in the original. The 3000-row soft cap and its sticky
   `showAll` flag are the paging model here (M9-56, M9-57). */

/** `BF.z` — the four zero-segments, plus `init` for the «Əvvələ qalıq» view
    (2216-2227: the seg button sets `BF.z = 'init'` AND `BF.init = true`;
    one field expresses both here). */
export type BalanceView = ZeroSegment | 'init'

/** `BF` (index.html:1894) minus the dead pager fields. */
export interface BalanceFilters {
  /** Lower-cased and trimmed by the page, exactly as `BF.q` is (2219). */
  q: string
  /** '' = «Anbarlar üzrə ayrı», `__sum` = «Ümumi», else a warehouse name. */
  w: string
  /** The active segment; `init` selects the «Əvvələ qalıq» view. */
  z: BalanceView
  /** `val` (default), `q`, `name`, `last` or `cond:<key>`. */
  sort: string
  /** `BF.initMode` — «İlkin miqdar» (default) or «Cari qalıq». */
  initMode: InitialBalanceMode
  /** `BF.cond` — '', `any`, or one condition key. */
  cond: CondFilter
}

/** The legacy initial `BF` (1894). */
export const EMPTY_BALANCE_FILTERS: BalanceFilters = {
  q: '', w: '', z: 'act', sort: 'val', initMode: 'initial', cond: '',
}

/** `BF.init` — derived from `z`, never stored twice. */
export const isInitialView = (f: BalanceFilters): boolean => f.z === 'init'

export interface BalancesState {
  /** The RAW loaded set, before `excludeCancelled()`. */
  movements: MovementRow[]
  /** `DB.items`. */
  items: ItemRow[]
  /** `DB.whs`. Never scoped to the user's warehouse — see the API module. */
  warehouses: string[]
  /** `IX` — built by the shared `buildItemIndexes()`, which applies
      `excludeCancelled()` FIRST (M9-20). `indexes.bal` is `IX.bal`;
      `indexes.operational` is `normalMovements()`, the «Əvvələ qalıq»
      source (M9-71). */
  indexes: ItemIndexes
  /** `DB.conds` — `w|c` → the full stored row INCLUDING the note, which the
      write path resends (M9-98). Replaced WHOLE on every successful snapshot:
      a record absent from the newest read is gone from this map (M9-105). */
  conds: Map<string, StockConditionRow>

  loading: boolean
  error: string | null
  /** True once a snapshot has been applied. Because the condition read is
      FATAL (D-J1), `loaded` is also `DB.condsReady`: there is no state in
      which rows are on screen but markers were not read. */
  loaded: boolean

  filters: BalanceFilters
  /** `SHOW_ALL['bal']` — sticky, never cleared by a filter change (M9-57). */
  showAll: boolean

  setFilters: (patch: Partial<BalanceFilters>) => void
  setShowAll: (v: boolean) => void
  load: () => Promise<{ ok: boolean; error: string | null }>
  /**
   * `saveCond()`'s local update (2185-2194, M9-101): `null` removes the entry
   * (DELETE or an empty response); a row replaces it. Always a NEW map, so
   * the table re-renders from the server-confirmed value (M9-105).
   */
  applyConditionResult: (warehouse: string, code: string, row: StockConditionRow | null) => void
}

const EMPTY_INDEXES: ItemIndexes = {
  byItem: new Map(), bal: [], priceObs: new Map(), operational: [],
}

const EMPTY: Pick<BalancesState, 'movements' | 'items' | 'warehouses' | 'indexes' | 'conds'> = {
  movements: [],
  items: [],
  warehouses: [],
  indexes: EMPTY_INDEXES,
  conds: new Map(),
}

/* M9-133 — the monotonic request sequence (M8-44 precedent).

   Every load takes a ticket; a reply whose ticket is not the newest issued is
   discarded outright — it does not write rows, does not clear or set the
   error and does not touch `loading`. Module-level, not store state: it must
   survive a `set()` and must never itself trigger a re-render. */
let requestSeq = 0

/** Test seam — resets the sequence so one test's counter cannot leak into the
    next. Never called by application code. */
export function __resetBalancesRequestSeq(): void {
  requestSeq = 0
}

/** `DB.conds` from the snapshot rows — index.html:911-920. */
export function toConditionMap(rows: readonly StockConditionRow[]): Map<string, StockConditionRow> {
  return new Map(rows.map((r) => [condKey(r.w, r.c), r]))
}

function derive(snapshot: BalancesSnapshot) {
  return {
    movements: snapshot.movements,
    items: snapshot.items,
    warehouses: snapshot.warehouses,
    /* M9-20 — `buildItemIndexes()` runs `excludeCancelled()` before any
       arithmetic; nothing here re-derives a balance from raw rows. */
    indexes: buildItemIndexes(snapshot.items, snapshot.movements),
    /* COMPLETE replacement — a NEW map from the newest read, so a record the
       server no longer returns is removed, not retained. */
    conds: toConditionMap(snapshot.conditions),
  }
}

export const useBalancesStore = create<BalancesState>((set, get) => ({
  ...EMPTY,
  loading: false,
  error: null,
  loaded: false,
  filters: EMPTY_BALANCE_FILTERS,
  showAll: false,

  /* `showAll` is NOT reset here: SHOW_ALL['bal'] is global in the original
     and survives every filter change (1679-1687, M9-57). */
  setFilters: (patch) => set((s) => ({ filters: { ...s.filters, ...patch } })),

  setShowAll: (v) => set({ showAll: v }),

  load: async () => {
    const reqId = ++requestSeq
    set({ loading: true })
    const res = await fetchBalancesSnapshot()

    /* A newer load has been issued since — this reply is stale (M9-133).
       Return WITHOUT touching state: the newer request owns `loading` and
       will settle it. A stale FAILURE likewise shows no error. */
    if (reqId !== requestSeq) return { ok: res.ok, error: res.ok ? null : res.error }

    if (!res.ok) {
      /* M9-12 — a failed refresh KEEPS the previous snapshot, WHOLE: rows,
         indexes AND the condition map. Only `error` and `loading` change.
         `loaded` is likewise untouched, so a first-ever failure shows the
         real error state and a later one shows the retained data plus the
         error — never blank rows, never «sıfır qalıq» (M9-136). */
      set({ loading: false, error: res.error })
      return { ok: false, error: res.error }
    }

    set({ ...derive(res.snapshot), loading: false, error: null, loaded: true })
    return { ok: true, error: null }
  },

  applyConditionResult: (warehouse, code, row) => {
    const next = new Map(get().conds)
    const key = condKey(warehouse, code)
    if (row) next.set(key, row)
    else next.delete(key)
    set({ conds: next })
  },
}))

/** Non-hook accessor for tests and for callers outside React. */
export const balancesStore = () => useBalancesStore.getState()
