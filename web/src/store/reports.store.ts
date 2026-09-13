import { create } from 'zustand'
import { fetchReportsSnapshot } from '../api/reportsSnapshot.api'
import type { ItemRow } from '../api/items.api'
import type { MovementRow } from '../api/itemMovements.api'
import type { WarehouseRow } from '../api/warehouses.api'
import type { PartnerRow } from '../api/partners.api'
import { buildItemIndexes, type ItemIndexes } from '../lib/itemIndex'
import { buildReportAggregates, type ReportAggregates } from '../lib/reportAggregates'
import type { ReportKind } from '../lib/reports'
import { defaultQaimeSelection, type QaimeColumnKey } from '../lib/qaimeReport'

/* «Hesabatlar» store — M14-14, M14-87.

   Holds the snapshot, the derived indexes and the user's two choices: which
   report is selected and which qaimə columns are shown.

   WHY THE COLUMN SELECTION LIVES HERE (M14-87 / D-P3): legacy `QAIME_SEL` is
   MODULE-level state initialised once (index.html:6848-6849), so a user's
   column choice survives navigating away from the page and back, for the
   lifetime of the page load. A component-local `useState` would silently
   reset it on unmount — a behaviour change that no test of the component
   alone would catch. */

const EMPTY_INDEXES: ItemIndexes = { byItem: new Map(), bal: [], priceObs: new Map(), operational: [] }
const EMPTY_AGGREGATES: ReportAggregates = {
  byPartner: new Map(), byType: new Map(), byWh: new Map(), byDate: new Map(),
  dates: [], positions: [], totVal: 0,
}

/** Guards against a slow refresh overwriting a newer one. */
let requestSeq = 0

interface State {
  movements: MovementRow[]
  items: ItemRow[]
  locations: WarehouseRow[]
  partners: PartnerRow[]
  indexes: ItemIndexes
  aggregates: ReportAggregates
  loading: boolean
  loaded: boolean
  error: string | null
  kind: ReportKind
  qaimeSel: Record<QaimeColumnKey, boolean>
  load: () => Promise<void>
  setKind: (kind: ReportKind) => void
  toggleQaimeColumn: (k: QaimeColumnKey) => void
}

export const useReportsStore = create<State>((set) => ({
  movements: [], items: [], locations: [], partners: [],
  indexes: EMPTY_INDEXES, aggregates: EMPTY_AGGREGATES,
  loading: false, loaded: false, error: null,
  /* `knt` is the first option, so it is the default (M14-07). */
  kind: 'knt',
  qaimeSel: defaultQaimeSelection(),

  load: async () => {
    const ticket = ++requestSeq
    set({ loading: true })
    const result = await fetchReportsSnapshot()
    /* A superseded response is discarded entirely — it must not overwrite a
       newer snapshot, nor clear a newer error. */
    if (ticket !== requestSeq) return

    if (!result.ok) {
      /* M14-14 — a failed REFRESH retains the previous complete snapshot and
         only flags it. `loaded` is deliberately not cleared, and no data
         field is touched. */
      set({ loading: false, error: result.error })
      return
    }

    const { movements, items, locations, partners } = result.snapshot
    /* The accepted index build, unchanged (M14-19), then the Phase 14
       aggregates alongside it over the SAME operational rows (M14-18). */
    const indexes = buildItemIndexes(items, movements)
    const aggregates = buildReportAggregates(indexes.operational, items, indexes.bal)
    set({
      movements, items, locations, partners,
      indexes, aggregates,
      loading: false, loaded: true, error: null,
    })
  },

  setKind: (kind) => set({ kind }),

  /* Mutating a copy, never the stored object: zustand compares by reference. */
  toggleQaimeColumn: (k) => set((s) => ({ qaimeSel: { ...s.qaimeSel, [k]: !s.qaimeSel[k] } })),
}))
