import { create } from 'zustand'
import { fetchAzpSnapshot, type AzpAuditRow, type AzpCardBalanceRow, type AzpMovementRow } from '../api/azpSnapshot.api'
import { AZP_MODULES, type AzpModule } from '../lib/azpLabels'

/* Azpetrol / Araz — the module store (M17-24 … M17-27).

   Ported from `AZP` (index.html:8084-8095) and `azpLoad()` (8171-8199).

   TWO BOARDS, NEVER MERGED. `AZP.data.azpetrol` and `AZP.data.araz` are
   separate objects in legacy and separate entries here. Every action takes a
   mandatory module. Nothing in this file aggregates across the two: they are
   distinct accounting spaces that happen to share a table, and blending them
   would produce a figure that belongs to neither.

   READ-ONLY. The store exposes `load` and the filter setters and NOTHING
   else. No write action exists, because Phase 17 holds no write authority
   (D-T1…D-T4 undecided). `mutationGuard.ts` deliberately still has no `azp.*`
   action (M17-107) — adding one belongs to the write decision, not here.

   NO REALTIME (M17-29). Legacy's `subscribeRealtime()` covers exactly
   `movements`, `items`, `partners`, `warehouses` and no azp table, so the
   board refreshes only on an explicit force. Adding a subscription would be
   an improvement, not parity — that is D-T6 (T1B), and it is deliberately
   absent so it cannot block the page. */

export interface AzpBoardState {
  cards: AzpCardBalanceRow[]
  movs: AzpMovementRow[]
  log: AzpAuditRow[]
  appBalance: number
  /** True once a snapshot has been applied — distinguishes "still loading"
      from "loaded and genuinely empty". */
  ready: boolean
  loading: boolean
  err: string | null
}

/** `AZP.filter[m]` — index.html:8090-8093. Per board, never shared. */
export interface AzpBoardFilter {
  card: string
  kind: string
  d1: string
  d2: string
  q: string
}

export const EMPTY_AZP_FILTER: AzpBoardFilter = { card: '', kind: '', d1: '', d2: '', q: '' }

const EMPTY_BOARD: AzpBoardState = {
  cards: [], movs: [], log: [], appBalance: 0, ready: false, loading: false, err: null,
}

export interface AzpState {
  /** `AZP.board` — which dashboard is showing. Azpetrol first (8085). */
  board: AzpModule
  data: Record<AzpModule, AzpBoardState>
  filter: Record<AzpModule, AzpBoardFilter>

  setBoard: (m: AzpModule) => void
  setFilter: (m: AzpModule, patch: Partial<AzpBoardFilter>) => void
  clearFilter: (m: AzpModule) => void
  /** `azpLoad(m, force)` — index.html:8171. */
  load: (m: AzpModule, force?: boolean) => Promise<{ ok: boolean; error: string | null }>
  reset: () => void
}

function emptyData(): Record<AzpModule, AzpBoardState> {
  return { azpetrol: { ...EMPTY_BOARD }, araz: { ...EMPTY_BOARD } }
}

function emptyFilters(): Record<AzpModule, AzpBoardFilter> {
  return { azpetrol: { ...EMPTY_AZP_FILTER }, araz: { ...EMPTY_AZP_FILTER } }
}

/* The monotonic request sequence (M9-133 precedent), kept PER MODULE so a
   slow Azpetrol reply cannot invalidate a fresh Araz one. */
let requestSeq: Record<AzpModule, number> = { azpetrol: 0, araz: 0 }

/** Test seam — resets the sequences so one test's counter cannot leak. */
export function __resetAzpRequestSeq(): void {
  requestSeq = { azpetrol: 0, araz: 0 }
}

export const useAzpStore = create<AzpState>((set, get) => ({
  board: 'azpetrol',
  data: emptyData(),
  filter: emptyFilters(),

  setBoard: (m) => set({ board: m }),

  setFilter: (m, patch) =>
    set((s) => ({ filter: { ...s.filter, [m]: { ...s.filter[m], ...patch } } })),

  clearFilter: (m) =>
    set((s) => ({ filter: { ...s.filter, [m]: { ...EMPTY_AZP_FILTER } } })),

  load: async (m, force) => {
    const st = get().data[m]

    /* index.html:8174-8175, both guards, in the legacy order.

       CONCURRENT LOAD: a second call while one is in flight returns at once
       and issues no read. This is not an optimisation — two overlapping loads
       of the same board can settle out of order and leave the older snapshot
       displayed.

       READY WITHOUT FORCE: once loaded, the board does not reload. The module
       has no realtime (M17-29), so a refresh is always an explicit user act.
       `force` is the only way past this. */
    if (st.loading) return { ok: false, error: null }
    if (st.ready && !force) return { ok: true, error: null }

    const reqId = ++requestSeq[m]
    set((s) => ({ data: { ...s.data, [m]: { ...s.data[m], loading: true, err: null } } }))

    const res = await fetchAzpSnapshot(m)

    /* A newer load for THIS board has been issued — this reply is stale.
       Return without touching state; the newer request owns `loading`. */
    if (reqId !== requestSeq[m]) return { ok: res.ok, error: res.ok ? null : res.error }

    if (!res.ok) {
      /* Legacy `azpLoad()` sets `ready = false` on EVERY failure, including a
         failed refresh (index.html:8192-8195). Keep the previous arrays in
         memory, but make the board render the module-unavailable state until
         a later successful load replaces the snapshot. */
      set((s) => ({
        data: {
          ...s.data,
          [m]: { ...s.data[m], ready: false, loading: false, err: res.error },
        },
      }))
      return { ok: false, error: res.error }
    }

    set((s) => ({
      data: {
        ...s.data,
        [m]: {
          cards: res.snapshot.cards,
          movs: res.snapshot.movs,
          log: res.snapshot.log,
          appBalance: res.snapshot.appBalance,
          ready: true,
          loading: false,
          err: null,
        },
      },
    }))
    return { ok: true, error: null }
  },

  reset: () => set({ board: 'azpetrol', data: emptyData(), filter: emptyFilters() }),
}))

/** Non-hook accessor, matching the other stores' convention. */
export const azpStore = () => useAzpStore.getState()

/** The board list, re-exported so the page need not import two modules. */
export { AZP_MODULES }
