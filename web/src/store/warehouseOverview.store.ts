import { create } from 'zustand'
import { fetchWarehouseOverviewSnapshot } from '../api/warehouseOverviewSnapshot.api'
import type { WarehouseRow } from '../api/warehouses.api'
import type { ItemRow } from '../api/items.api'
import type { MovementRow } from '../api/itemMovements.api'
import { buildItemIndexes, type ItemIndexes } from '../lib/itemIndex'

const EMPTY_INDEXES: ItemIndexes = { byItem: new Map(), bal: [], priceObs: new Map(), operational: [] }
let requestSeq = 0

interface State {
  movements: MovementRow[]
  items: ItemRow[]
  locations: WarehouseRow[]
  indexes: ItemIndexes
  loading: boolean
  loaded: boolean
  error: string | null
  load: () => Promise<void>
}

export const useWarehouseOverviewStore = create<State>((set) => ({
  movements: [], items: [], locations: [], indexes: EMPTY_INDEXES,
  loading: false, loaded: false, error: null,
  load: async () => {
    const ticket = ++requestSeq
    set({ loading: true })
    const result = await fetchWarehouseOverviewSnapshot()
    if (ticket !== requestSeq) return
    if (!result.ok) { set({ loading: false, error: result.error }); return }
    const { movements, items, locations } = result.snapshot
    set({ movements, items, locations, indexes: buildItemIndexes(items, movements), loading: false, loaded: true, error: null })
  },
}))

