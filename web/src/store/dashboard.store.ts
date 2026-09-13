import { create } from 'zustand'
import { fetchDashboardSnapshot } from '../api/dashboardSnapshot.api'
import type { WarehouseRow } from '../api/warehouses.api'
import type { PartnerRow } from '../api/partners.api'
import type { ItemRow } from '../api/items.api'
import type { MovementRow } from '../api/itemMovements.api'
import { buildItemIndexes, type ItemIndexes } from '../lib/itemIndex'

/* «İdarə paneli» state — the legacy DB/IX slice rDash() reads plus the
   `#dash-wh` selection (index.html:1535-1540).

   The selection lives HERE, not in the page: the legacy select is long-lived
   DOM that survives go(), React unmounts the page (M11-06, the M4-18 rule).

   D-L4 (owner-approved deviation): legacy builds the option list once and
   never rebuilds it (1536). Here the options are derived from the current
   snapshot on every render, and a selection whose warehouse is no longer an
   active `anbar` is reset to «Bütün anbarlar» when the new snapshot lands. */

const EMPTY_INDEXES: ItemIndexes = { byItem: new Map(), bal: [], priceObs: new Map(), operational: [] }
let requestSeq = 0

export interface LoadOutcome {
  ok: boolean
  error: string | null
}

interface State {
  movements: MovementRow[]
  items: ItemRow[]
  /** Every `warehouses` row (`DB.locs`); `DB.whs` is derived by the page. */
  locations: WarehouseRow[]
  partners: PartnerRow[]
  indexes: ItemIndexes
  /** `#dash-wh` value — '' = «Bütün anbarlar», else the RAW warehouse name. */
  warehouse: string
  loading: boolean
  loaded: boolean
  error: string | null
  load: () => Promise<LoadOutcome>
  setWarehouse: (w: string) => void
}

/** `DB.whs` — `active && type === 'anbar'` (933). */
export const activeWarehouseNames = (locations: readonly WarehouseRow[]): string[] =>
  locations.filter((r) => r.active && r.type === 'anbar').map((r) => r.name)

export const useDashboardStore = create<State>((set, get) => ({
  movements: [], items: [], locations: [], partners: [], indexes: EMPTY_INDEXES,
  warehouse: '', loading: false, loaded: false, error: null,
  load: async () => {
    const ticket = ++requestSeq
    set({ loading: true })
    const result = await fetchDashboardSnapshot()
    /* A reply from an older request never overwrites a newer one (M11-15). */
    if (ticket !== requestSeq) return { ok: result.ok, error: result.ok ? null : result.error }
    if (!result.ok) {
      /* Failed refresh: the previous complete snapshot stays (M11-12). */
      set({ loading: false, error: result.error })
      return { ok: false, error: result.error }
    }
    const { movements, items, locations, partners } = result.snapshot
    const current = get().warehouse
    const warehouse = current && !activeWarehouseNames(locations).includes(current) ? '' : current
    set({
      movements, items, locations, partners,
      indexes: buildItemIndexes(items, movements),
      warehouse, loading: false, loaded: true, error: null,
    })
    return { ok: true, error: null }
  },
  setWarehouse: (warehouse) => set({ warehouse }),
}))
