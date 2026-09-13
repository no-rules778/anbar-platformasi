import { create } from 'zustand'
import { fetchReportsSnapshot } from '../api/reportsSnapshot.api'
import { buildItemIndexes, type ItemIndexes } from '../lib/itemIndex'
import { buildReportAggregates, type ReportAggregates } from '../lib/reportAggregates'
import type { ItemRow } from '../api/items.api'
import type { MovementRow } from '../api/itemMovements.api'
import type { WarehouseRow } from '../api/warehouses.api'
import type { PartnerRow } from '../api/partners.api'

const EMPTY_INDEXES: ItemIndexes = { byItem: new Map(), bal: [], priceObs: new Map(), operational: [] }
const EMPTY_AGGREGATES: ReportAggregates = { byPartner: new Map(), byType: new Map(), byWh: new Map(), byDate: new Map(), dates: [], positions: [], totVal: 0 }
let requestSeq = 0

interface AnalysisState {
  movements: MovementRow[]
  items: ItemRow[]
  locations: WarehouseRow[]
  partners: PartnerRow[]
  indexes: ItemIndexes
  aggregates: ReportAggregates
  loading: boolean
  loaded: boolean
  error: string | null
  load: () => Promise<void>
}

export const useAnalysisStore = create<AnalysisState>((set) => ({
  movements: [], items: [], locations: [], partners: [], indexes: EMPTY_INDEXES,
  aggregates: EMPTY_AGGREGATES, loading: false, loaded: false, error: null,
  load: async () => {
    const ticket = ++requestSeq
    set({ loading: true })
    const result = await fetchReportsSnapshot()
    if (ticket !== requestSeq) return
    if (!result.ok) { set({ loading: false, error: result.error }); return }
    const { movements, items, locations, partners } = result.snapshot
    const indexes = buildItemIndexes(items, movements)
    set({ movements, items, locations, partners, indexes,
      aggregates: buildReportAggregates(indexes.operational, items, indexes.bal),
      loading: false, loaded: true, error: null })
  },
}))
