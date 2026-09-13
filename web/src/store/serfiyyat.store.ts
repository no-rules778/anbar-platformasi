import { create } from 'zustand'
import { fetchSerfiyyatSnapshot } from '../api/serfiyyatDocuments.api'
import { fetchItems, type ItemRow } from '../api/items.api'
import { fetchReferenceValues } from '../api/referenceValues.api'
import type { SmDocument, SmDraftLine, SmLine, SmProject } from '../lib/serfiyyat'
import { EMPTY_FILTERS, type SmFilters } from '../lib/serfiyyatFilters'

/* «Sərfiyyat Materialları» state — the legacy `DB.sm*` slice plus the
   long-lived `SM = { lines, filters, editDocId }` module object
   (index.html:6184).

   THE DRAFT, FILTERS, EDIT TARGET AND ACTIVE TAB LIVE HERE, not in the page
   (M13-15, M13-17): legacy's `SM` survives go() because its screens are
   long-lived DOM, while React unmounts the page. Store state reproduces that,
   the same M4-18 / M9-06 rule Phase 12 applied to `NREQ`.

   Snapshot discipline mirrors the accepted dashboard / itemRequests stores:
   one atomic generation, retention on a failed refresh, and a module-level
   ticket so a stale reply can never overwrite a newer one. */

let requestSeq = 0

export interface LoadOutcome {
  ok: boolean
  error: string | null
}

export type SmTab = 'doc' | 'rep'

interface State {
  projects: SmProject[]
  documents: SmDocument[]
  lines: SmLine[]
  /** The item catalogue the search, the draft table and the report resolve against. */
  items: ItemRow[]
  itemsByCode: Map<string, ItemRow>
  /** Active `serfiyyat_channel` names; empty when the reference read failed (M13-12). */
  channels: { name: string; active: boolean }[]
  /* `DB.smReady` (index.html:6206) — true only when all THREE core reads
     succeeded. The page renders one hint and nothing else while it is false. */
  ready: boolean
  loading: boolean
  loaded: boolean
  error: string | null

  /** `SM.lines` — the open document's draft (6184). */
  draft: SmDraftLine[]
  /** `SM.editDocId` — null when creating (6184). */
  editDocId: string | null
  /** `SM.filters` — `{}` until «Filtrləri tətbiq et» (6184, 6631). */
  filters: SmFilters
  /** Legacy keeps the active tab in a DOM dataset (6244); React holds it here. */
  tab: SmTab

  load: () => Promise<LoadOutcome>
  setTab: (tab: SmTab) => void
  addDraftLine: (line: SmDraftLine) => void
  removeDraftLine: (index: number) => void
  setDraft: (lines: SmDraftLine[]) => void
  clearDraft: () => void
  openEdit: (docId: string, lines: SmDraftLine[]) => void
  cancelEdit: () => void
  setFilters: (filters: SmFilters) => void
  clearFilters: () => void
}

const FAIL_READ = 'Sərfiyyat Materialları yüklənmədi'

export const useSerfiyyatStore = create<State>((set) => ({
  projects: [],
  documents: [],
  lines: [],
  items: [],
  itemsByCode: new Map(),
  channels: [],
  ready: false,
  loading: false,
  loaded: false,
  error: null,
  draft: [],
  editDocId: null,
  filters: EMPTY_FILTERS,
  tab: 'doc',

  load: async () => {
    const ticket = ++requestSeq
    set({ loading: true })

    const [snap, items, refs] = await Promise.all([
      fetchSerfiyyatSnapshot(), fetchItems(), fetchReferenceValues(),
    ])

    /* M13-18 — a reply from an older load never overwrites a newer one,
       success AND failure alike. */
    if (ticket !== requestSeq) {
      const ok = snap.ok && items.ok
      return { ok, error: ok ? null : (snap.error ?? items.error ?? null) }
    }

    /* M13-13 — ATOMIC over the THREE SERFIYYAT TABLE READS plus the item
       catalogue the screen cannot render or validate imports without: either failing applies
       NOTHING. M13-14 — a failed REFRESH retains the previous complete
       snapshot and only raises the error flag.

       M13-12 — the reference-values read is deliberately NOT part of this
       rule. Its failure leaves readiness TRUE with an empty channel list.
       Author emails come from the application-wide audit directory warmed at
       boot, so this page issues no duplicate directory RPC. */
    if (!snap.ok || !items.ok) {
      const error = (!snap.ok ? snap.error : items.error) ?? FAIL_READ
      set({ loading: false, error })
      return { ok: false, error }
    }

    set({
      projects: snap.projects,
      documents: snap.documents,
      lines: snap.lines,
      items: items.rows,
      itemsByCode: new Map(items.rows.map((i) => [i.code, i])),
      channels: refs.values.serfiyyat_channel.map((c) => ({ name: c.name, active: c.active })),
      ready: true,
      loading: false,
      loaded: true,
      error: null,
    })
    return { ok: true, error: null }
  },

  setTab: (tab) => set({ tab }),

  addDraftLine: (line) => set((s) => ({ draft: [...s.draft, line] })),

  /* M13-41 — removes THAT row by index; the remaining rows are neither
     re-sorted nor renumbered. */
  removeDraftLine: (index) => set((s) => ({ draft: s.draft.filter((_, i) => i !== index) })),

  setDraft: (lines) => set({ draft: lines }),

  clearDraft: () => set({ draft: [], editDocId: null }),

  /* M13-74 — «Düzəliş» loads the document's existing lines into the draft and
     forces the segment to `doc`. The report's FILTERS are deliberately left
     untouched, so an admin who was filtering loses no filter state. */
  openEdit: (docId, lines) => set({ editDocId: docId, draft: lines, tab: 'doc' }),

  /* M13-24 — «ləğv et» clears the edit target and the draft. */
  cancelEdit: () => set({ editDocId: null, draft: [] }),

  /* M13-81 — filters apply only on «Filtrləri tətbiq et», as one snapshot. */
  setFilters: (filters) => set({ filters }),

  /* M13-82 — «Təmizlə» resets every field. */
  clearFilters: () => set({ filters: EMPTY_FILTERS }),
}))
