import { create } from 'zustand'
import { fetchWarehouses } from '../api/warehouses.api'
import { fetchPartners } from '../api/partners.api'
import { fetchReferenceValues } from '../api/referenceValues.api'
import { fetchSerfiyyat } from '../api/serfiyyatProjects.api'
import { fetchReferenceUsage, type ReferenceUsage } from '../api/referenceUsage.api'
import { entityUsageKey, usageKey, type ReferenceEntity, type ReferenceReadiness, type WiredKind } from '../types/referenceDirectory'

/* Explicit result so a caller (e.g. the Realtime refresh) can report success
   or failure truthfully, without racing against the store's `error` field. */
export interface LoadResult {
  ok: boolean
  error: string | null
}

/* The list controls: kind filter, status filter, name search, page size and
   page. These live in the STORE, not in the page component, so they survive
   navigating away and back.

   The original keeps them because its screens are long-lived DOM that is
   shown and hidden (go() flips `.page` visibility, index.html:1496-1530) —
   the filter inputs and their values are never destroyed. React unmounts the
   page instead, so component-local state would be silently discarded on every
   navigation, losing a filter and search the user had set. Registry M4-18. */
export interface ReferenceListControls {
  kindFilter: '' | WiredKind
  status: '' | 'active' | 'off'
  query: string
  pageSize: number
  page: number
}

export const DEFAULT_LIST_CONTROLS: ReferenceListControls = {
  kindFilter: '',
  status: '',
  query: '',
  pageSize: 10,
  page: 0,
}

interface ReferenceDirectoryState {
  rows: ReferenceEntity[]
  usage: Map<string, ReferenceUsage>
  readiness: ReferenceReadiness
  /** Active `anbar` warehouse names — the project dialog's linked-warehouse options (DB.whs, index.html:933). */
  activeWarehouseNames: string[]
  loading: boolean
  error: string | null
  controls: ReferenceListControls
  /** Patch the list controls; any change except `page` itself returns to page 0. */
  setControls: (patch: Partial<ReferenceListControls>) => void
  load: () => Promise<LoadResult>
}

const INITIAL_READINESS: ReferenceReadiness = { referenceValues: false, serfiyyat: false }

const EMPTY_ENTITY_FIELDS = { voen: '', contract: '', contractDate: '', linkedWarehouse: '' }

/* The production platform builds this table from every kind's own source
   (refEntities, index.html:2954-2963) and then counts usage per row.
   Warehouses keep the original's `type === 'anbar'` filter — 'layihə' rows
   belong to the `location` kind, which is Phase 3b. */
export const useReferenceDirectoryStore = create<ReferenceDirectoryState>((set) => ({
  rows: [],
  usage: new Map(),
  readiness: INITIAL_READINESS,
  activeWarehouseNames: [],
  loading: false,
  error: null,
  controls: DEFAULT_LIST_CONTROLS,

  /* Changing what is being filtered invalidates the current page number, so
     every patch resets to page 0 — except a patch that IS the page change. */
  setControls: (patch) =>
    set((s) => ({
      controls: {
        ...s.controls,
        ...patch,
        page: 'page' in patch ? (patch.page as number) : 0,
      },
    })),

  load: async () => {
    set({ loading: true, error: null })
    try {
      /* Neither a reference-values nor a Sərfiyyat failure is fatal: the
         original logs a warning and renders the remaining kinds
         (index.html:1004, 6206). Only the warehouse and partner reads can fail
         the whole screen, as in Phase 1-2. */
      const [warehouses, partners, refValues, serfiyyat] = await Promise.all([
        fetchWarehouses(),
        fetchPartners(),
        fetchReferenceValues(),
        fetchSerfiyyat(),
      ])

      const readiness: ReferenceReadiness = {
        referenceValues: refValues.ready,
        serfiyyat: serfiyyat.ready,
      }

      /* DB.whs (index.html:933) — active `anbar` warehouses, by name. The
         project dialog's linked-warehouse selector offers exactly these. */
      const activeWarehouseNames = warehouses
        .filter((w) => w.active && w.type === 'anbar')
        .map((w) => w.name)

      /* refEntities (index.html:2954-2963): warehouse and location share the
         `warehouses` table, split by `type`. */
      const rows: ReferenceEntity[] = [
        ...warehouses
          .filter((w) => w.type === 'anbar')
          .map((w) => ({
            kind: 'warehouse' as const,
            id: String(w.id),
            name: w.name,
            active: w.active !== false,
            ...EMPTY_ENTITY_FIELDS,
          })),
        ...warehouses
          .filter((w) => w.type === 'layihə')
          .map((w) => ({
            kind: 'location' as const,
            id: String(w.id),
            name: w.name,
            active: w.active !== false,
            ...EMPTY_ENTITY_FIELDS,
          })),
        ...partners.map((p) => ({
          kind: 'partner' as const,
          id: String(p.id),
          name: p.name,
          active: p.active !== false,
          ...EMPTY_ENTITY_FIELDS,
          voen: p.voen ?? '',
          contract: p.contract ?? '',
          contractDate: p.contract_date ?? '',
        })),
      ]

      /* refAllRows (index.html:2990-2999) omits a kind entirely when its
         readiness probe fails, rather than showing an empty section. */
      if (readiness.referenceValues) {
        for (const kind of ['channel', 'unit', 'category'] as const) {
          for (const v of refValues.values[kind]) {
            rows.push({ kind, id: v.id, name: v.name, active: v.active, ...EMPTY_ENTITY_FIELDS })
          }
        }
      }

      /* project and serfiyyat_channel share the `serfiyyat` gate, even though
         serfiyyat_channel's rows arrived with the reference values. */
      if (readiness.serfiyyat) {
        for (const p of serfiyyat.projects) {
          rows.push({
            kind: 'project',
            id: p.id,
            name: p.name,
            active: p.active,
            ...EMPTY_ENTITY_FIELDS,
            linkedWarehouse: p.linkedWarehouse,
          })
        }
        /* Its gate is `serfiyyat`, but its rows come from
           get_reference_values(). Both must have succeeded — design §4.4's
           matrix state M3 is exactly the case where the gate is open and the
           source failed, leaving nothing to list. */
        for (const v of refValues.values.serfiyyat_channel) {
          rows.push({ kind: 'serfiyyat_channel', id: v.id, name: v.name, active: v.active, ...EMPTY_ENTITY_FIELDS })
        }
      }

      const usage = await fetchReferenceUsage(
        rows.map((r) => ({ kind: r.kind, id: r.id, name: r.name })),
        { serfiyyatDocuments: readiness.serfiyyat ? serfiyyat.documents : null },
      )
      set({ rows, usage, readiness, activeWarehouseNames })
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

/** Usage for a row, honouring the kind's key rule (`project` is keyed by id). */
export function usageOfEntity(
  usage: Map<string, ReferenceUsage>,
  entity: { kind: string; id: string; name: string },
): ReferenceUsage {
  return usage.get(entityUsageKey(entity)) ?? UNKNOWN_USAGE
}
