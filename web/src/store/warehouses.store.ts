import { create } from 'zustand'
import { fetchWarehouses, fetchWarehouseUsage, type WarehouseRow, type WarehouseUsage } from '../api/warehouses.api'

/* Explicit result so a caller (e.g. the Realtime refresh) can report success
   or failure truthfully, without racing against the store's `error` field. */
export interface LoadResult {
  ok: boolean
  error: string | null
}

interface WarehousesState {
  rows: WarehouseRow[]
  usage: Map<string, WarehouseUsage>
  loading: boolean
  error: string | null
  load: () => Promise<LoadResult>
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
      return { ok: true, error: null }
    } catch (err) {
      /* Previously loaded rows are deliberately left in place — a failed
         refresh must not blank a screen that was showing valid data. */
      const message = err instanceof Error ? err.message : 'Anbarlar yüklənmədi'
      set({ error: message })
      return { ok: false, error: message }
    } finally {
      set({ loading: false })
    }
  },
}))
