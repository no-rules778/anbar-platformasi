import { create } from 'zustand'
import { fetchWarehouses } from '../api/warehouses.api'
import { fetchPartners } from '../api/partners.api'
import { fetchReferenceUsage, type ReferenceUsage } from '../api/referenceUsage.api'
import { usageKey, type ReferenceEntity } from '../types/referenceDirectory'

/* Explicit result so a caller (e.g. the Realtime refresh) can report success
   or failure truthfully, without racing against the store's `error` field. */
export interface LoadResult {
  ok: boolean
  error: string | null
}

interface ReferenceDirectoryState {
  rows: ReferenceEntity[]
  usage: Map<string, ReferenceUsage>
  loading: boolean
  error: string | null
  load: () => Promise<LoadResult>
}

/* The production platform builds this table from every kind's own source
   (refEntities, index.html:2954-2963) and then counts usage per row. The two
   wired kinds are read here and normalised to one shape. Warehouses keep the
   original's `type === 'anbar'` filter — 'layihə' rows belong to the
   `location` kind, which is not wired up yet. */
export const useReferenceDirectoryStore = create<ReferenceDirectoryState>((set) => ({
  rows: [],
  usage: new Map(),
  loading: false,
  error: null,
  load: async () => {
    set({ loading: true, error: null })
    try {
      const [warehouses, partners] = await Promise.all([fetchWarehouses(), fetchPartners()])

      const rows: ReferenceEntity[] = [
        ...warehouses
          .filter((w) => w.type === 'anbar')
          .map((w) => ({
            kind: 'warehouse' as const,
            id: String(w.id),
            name: w.name,
            active: w.active !== false,
            voen: '',
            contract: '',
            contractDate: '',
          })),
        ...partners.map((p) => ({
          kind: 'partner' as const,
          id: String(p.id),
          name: p.name,
          active: p.active !== false,
          voen: p.voen ?? '',
          contract: p.contract ?? '',
          contractDate: p.contract_date ?? '',
        })),
      ]

      const usage = await fetchReferenceUsage(rows.map((r) => ({ kind: r.kind, name: r.name })))
      set({ rows, usage })
      return { ok: true, error: null }
    } catch (err) {
      /* Previously loaded rows are deliberately left in place — a failed
         refresh must not blank a screen that was showing valid data. */
      const message = err instanceof Error ? err.message : 'Soraqçalar yüklənmədi'
      set({ error: message })
      return { ok: false, error: message }
    } finally {
      set({ loading: false })
    }
  },
}))

/** Cautious default when a row has no usage entry at all: treat as in use. */
export const UNKNOWN_USAGE: ReferenceUsage = { count: 1, exact: false }

export function usageOf(usage: Map<string, ReferenceUsage>, kind: string, name: string): ReferenceUsage {
  return usage.get(usageKey(kind, name)) ?? UNKNOWN_USAGE
}
