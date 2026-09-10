import { create } from 'zustand'
import { fetchAuditLog, EMPTY_FILTERS, type AuditFilters, type AuditRow, type AuditErrorKind } from '../api/auditLog.api'
import { fetchUserDirectory } from '../api/userDirectory.api'

interface AuditLogState {
  filters: AuditFilters
  rows: AuditRow[]
  total: number
  loading: boolean
  error: string | null
  errorKind: AuditErrorKind | null
  /** id → email, from get_user_directory(). Loaded once, independent of `load`. */
  emails: Map<string, string>
  /** True once the directory read has failed — the page shows a warning banner, not an error. */
  directoryError: boolean
  setFilters: (patch: Partial<Omit<AuditFilters, 'page'>>) => void
  setPage: (page: number) => void
  reset: () => void
  load: () => Promise<void>
  loadDirectory: () => Promise<void>
}

/* LOG_REQ (index.html:7068, checked at 7143). Filter changes fire requests
   faster than they can resolve; without a per-request sequence number, a slow
   reply for an abandoned filter set can land after a newer one and show stale
   rows under the current filter labels. This counter, and discarding any
   reply whose id is not the latest issued, is exactly M4-13. */
let requestSeq = 0

export const useAuditLogStore = create<AuditLogState>((set, get) => ({
  filters: EMPTY_FILTERS,
  rows: [],
  total: 0,
  loading: false,
  error: null,
  errorKind: null,
  emails: new Map(),
  directoryError: false,

  setFilters: (patch) => {
    set((s) => ({ filters: { ...s.filters, ...patch, page: 0 } }))
    void get().load()
  },

  setPage: (page) => {
    set((s) => ({ filters: { ...s.filters, page } }))
    void get().load()
  },

  reset: () => {
    set({ filters: EMPTY_FILTERS })
    void get().load()
  },

  load: async () => {
    const reqId = ++requestSeq
    set({ loading: true })
    const result = await fetchAuditLog(get().filters)
    /* A newer request has since been issued — this reply is stale, discard it. */
    if (reqId !== requestSeq) return
    set({
      rows: result.rows,
      total: result.total,
      error: result.error,
      errorKind: result.errorKind,
      loading: false,
    })
  },

  loadDirectory: async () => {
    const { emails, ok } = await fetchUserDirectory()
    set({ emails, directoryError: !ok })
  },
}))
