import { create } from 'zustand'
import { fetchWarehouses, fetchWarehouseUsage, type WarehouseRow, type WarehouseUsage } from '../api/warehouses.api'

interface WarehousesState {
  rows: WarehouseRow[]
  usage: Map<string, WarehouseUsage>
  loading: boolean
  error: string | null
  load: () => Promise<void>
}

export const useWarehousesStore = create<WarehousesState>((set) => ({
  rows: [],
  usage: new Map(),
  loading: false,
  error: null,
  load: async () => {
    set({ loading: true, error: null })
    try {
      const rows = await fetchWarehouses()
      const usage = await fetchWarehouseUsage(rows.map((r) => r.name))
      set({ rows, usage })
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Anbarlar yüklənmədi' })
    } finally {
      set({ loading: false })
    }
  },
}))
