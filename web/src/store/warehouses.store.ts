import { create } from 'zustand'
import { fetchWarehouses, fetchWarehouseUsage, type WarehouseRow } from '../api/warehouses.api'

interface WarehousesState {
  rows: WarehouseRow[]
  usage: Map<string, number>
  loading: boolean
  load: () => Promise<void>
}

export const useWarehousesStore = create<WarehousesState>((set) => ({
  rows: [],
  usage: new Map(),
  loading: false,
  load: async () => {
    set({ loading: true })
    const rows = await fetchWarehouses()
    const usage = await fetchWarehouseUsage(rows.map((r) => r.name))
    set({ rows, usage, loading: false })
  },
}))
