import { create } from 'zustand'
import type { UnresolvedBatch, UnresolvedPhase } from '../lib/batchOutcome'

/* THE UNRESOLVED-BATCH RECORD — Phase 8, milestone I-5.

   Kept OUTSIDE the dialog component on purpose. After an UNKNOWN outcome the
   client does not know whether the documents were cancelled, and closing the
   dialog is not evidence about a database. If this record lived in component
   state, closing and reopening «Qrup üzrə ləğv» would silently clear the block
   and let the user resend a batch that may already have committed.

   It is deliberately NOT in `movements.store.ts`: that store's `load()` replaces
   its snapshot wholesale, and this record must survive exactly that.

   MULTIPLE records, not one. A single `unresolved | null` slot means a second
   UNKNOWN outcome (for different documents) overwrites the first, silently
   dropping the block on the first batch's documents while they remain
   genuinely uncertain. Records are kept in a map by `id` and cleared
   individually.

   ---------------------------------------------------------------------------
   PERSISTENCE — and why it must FAIL CLOSED (I-5 correction 2).

   Records are persisted to `sessionStorage` so a page reload does not grant
   resubmission permission on documents whose outcome is unknown. Three
   properties are load-bearing, and the first revision had none of them:

   1. A READ FAILURE IS NOT AN EMPTY HISTORY. `readStore` used to swallow every
      error and return `{}`, and `hydrate` then ASSIGNED that over whatever was
      already in memory. A quota error, a corrupt value or a browser with site
      data blocked therefore ERASED live blocks and reported nothing. A read
      failure now returns an ERROR, existing memory is preserved untouched, and
      the failure is exposed as `persistenceError` — which the dialog treats as
      blocking, because a client that cannot read its own pending history
      cannot show that a batch is safe to send.

   2. RECORDS ARE VALIDATED. Anything that is not a well-formed record is
      dropped, and a stored blob that is not a record map at all is a read
      ERROR rather than an empty result — corrupt data must not read as
      "nothing was pending".

   3. THE SCOPE IS PROJECT + ACCOUNT. The key used to be the account id alone,
      so the same browser pointed at a different Supabase project would read
      the other project's records as its own. The key now includes the project
      ref, and each record additionally CARRIES the scope it was written under
      (`scope`), captured at ATTEMPT time. A response arriving after the user
      switched accounts therefore cannot write its record into the new
      account's scope: the write is dropped, because it describes a batch the
      current account never sent.

   What is stored is the SUBMITTED DOCUMENT LIST, the phase, and the scope
   string — no credentials, no session token, no access token, no email. It
   records an ATTEMPT, and carries NO expiry: an unresolved record does not
   become resolved merely by growing old, because ageing is not evidence about
   the database. It is cleared only by `clearUnresolved` (a positive
   observation, or an explicit informed dismissal). `sessionStorage`, not
   `localStorage`, so a record does not outlive the tab that created it. */

const STORAGE_PREFIX = 'anbar_batch_unresolved_'

/** The Supabase project this build talks to — the project half of the scope.
    Read defensively: a test environment may not define it. */
const projectRef = (): string => {
  try {
    const url = (import.meta.env?.VITE_SUPABASE_URL as string | undefined) || ''
    /* `https://<ref>.supabase.co` -> `<ref>`. An unparseable value falls back
       to the raw string, which still DISTINGUISHES projects — the point of
       the scope is separation, not prettiness. */
    const m = url.match(/^https?:\/\/([^.]+)\./)
    return m ? m[1] : url
  } catch {
    return ''
  }
}

/** Project AND account. Neither alone is sufficient — see note 3 above. */
export const scopeOf = (userId: string | null | undefined): string =>
  projectRef() + '|' + (userId || 'anon')

const storageKey = (scope: string): string => STORAGE_PREFIX + scope

/** The scope currently hydrated. Writes outside it are refused. */
let currentScope: string | null = null

type RecordMap = Record<string, UnresolvedBatch>

const PHASES: readonly UnresolvedPhase[] = ['pending', 'unknown', 'success']

/** Whether a stored blob CLAIMS this scope. Used to tell a damaged record of
    ours (blocking) from another account's record (ordinary isolation). A blob
    with no readable scope is treated as ours: we cannot prove it is not, and
    the safe reading of an unidentifiable attempt is that it may be ours. */
const belongsToScope = (v: unknown, scope: string): boolean => {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return true
  const raw = (v as Record<string, unknown>).scope
  if (typeof raw !== 'string') return true
  return raw === scope
}

/** Validates ONE stored record. Anything malformed is not a record. */
const validRecord = (v: unknown, id: string, scope: string): UnresolvedBatch | null => {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return null
  const r = v as Record<string, unknown>
  if (r.id !== id) return null
  if (!Array.isArray(r.docNums) || r.docNums.length === 0) return null
  if (!r.docNums.every((d) => typeof d === 'string')) return null
  if (typeof r.refreshFailed !== 'boolean') return null
  if (!PHASES.includes(r.phase as UnresolvedPhase)) return null
  /* A record written under a DIFFERENT scope is not this scope's record. It is
     dropped rather than adopted — see note 3. */
  if (typeof r.scope !== 'string' || r.scope !== scope) return null
  return {
    id,
    docNums: r.docNums as string[],
    refreshFailed: r.refreshFailed,
    phase: r.phase as UnresolvedPhase,
    scope,
  }
}

type ReadResult =
  | { ok: true; records: RecordMap }
  /** Storage unreadable or corrupt — NEVER interpreted as an empty history.
      `records` carries whatever WAS readable, so valid siblings survive an
      invalid one instead of being lost along with it. */
  | { ok: false; error: string; records?: RecordMap }

const READ_FAILED =
  'Əvvəlki qrup ləğvi qeydləri oxunmadı — brauzer yaddaşı əlçatmazdır. '
  + 'Təhlükəsizlik üçün qrup üzrə ləğv dayandırıldı. Səhifəni yeniləyin.'

const readStore = (scope: string): ReadResult => {
  let raw: string | null
  try {
    raw = sessionStorage.getItem(storageKey(scope))
  } catch {
    return { ok: false, error: READ_FAILED }
  }
  if (!raw) return { ok: true, records: {} }
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    /* Corrupt JSON is NOT an empty history — it is an unreadable one. */
    return { ok: false, error: READ_FAILED }
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    return { ok: false, error: READ_FAILED }
  }
  const out: RecordMap = {}
  let invalid = 0
  for (const [id, v] of Object.entries(parsed as Record<string, unknown>)) {
    const rec = validRecord(v, id, scope)
    if (rec) {
      out[id] = rec
      continue
    }
    /* AN INVALID RECORD IS A BLOCKING ERROR, not a droppable one.

       This previously did `if (rec) out[id] = rec` and returned `ok: true` —
       so a stored attempt for document B with one damaged field vanished,
       `persistenceError` stayed null, B was no longer blocked, and
       `beginAttempt(['B'])` SUCCEEDED. That is the same fail-open hole the
       read-error path was closed against, one level down: valid JSON does not
       imply a readable attempt history.

       A record written under ANOTHER scope is not counted here — that is
       normal isolation, not damage; `validRecord` rejects it for a different
       reason. Only a record belonging to THIS scope that fails validation is
       an unreadable attempt. */
    if (belongsToScope(v, scope)) invalid++
  }
  /* Valid siblings are still returned: the caller preserves them AND raises
     the error, so real blocks keep blocking while dispatch is refused. */
  if (invalid > 0) return { ok: false, error: RECORD_INVALID, records: out }
  return { ok: true, records: out }
}

/* A record that PARSED but is not a valid record. Distinct from READ_FAILED:
   storage answered and the JSON was well-formed, so the fault is the CONTENT.
   Valid JSON does not imply a readable attempt history — a stored attempt
   whose fields are damaged is an attempt whose documents we cannot identify,
   and dropping it would silently return those documents to the cancellable
   pool. The original stored value is deliberately LEFT INTACT for diagnosis;
   nothing here rewrites or prunes it. */
const RECORD_INVALID =
  'Əvvəlki qrup ləğvi qeydlərindən biri oxunmadı (qeyd zədələnib). '
  + 'Hansı sənədlərin gözlədiyini müəyyən etmək mümkün deyil, ona görə '
  + 'qrup üzrə ləğv dayandırıldı. Səhifəni yeniləyin və ya administratora '
  + 'müraciət edin.'

const WRITE_FAILED =
  'Qrup ləğvi qeydi brauzer yaddaşına yazılmadı — sorğu göndərilmir. '
  + 'Brauzer yaddaşına icazə verin və yenidən cəhd edin.'

/** Writes, and REPORTS whether it worked. The caller decides what a failure
    means; this function never pretends one did not happen. */
const writeStore = (scope: string, records: RecordMap): boolean => {
  try {
    sessionStorage.setItem(storageKey(scope), JSON.stringify(records))
    return true
  } catch {
    return false
  }
}

let idSeq = 0
/** Unique per call within this session; monotonic, not time-based, so two
    records created in the same millisecond never collide. */
const nextId = (): string => 'ub-' + Date.now() + '-' + ++idSeq

/* PENDING SUBMISSIONS — protection across the DIALOG's lifetime, not just the
   component instance's.

   The dialog's own `useRef` synchronous guard (`submitting.current`) only
   stops two clicks in the SAME mounted instance from both firing. It says
   nothing about closing and reopening the dialog: `Dialog`'s mask and × call
   `onClose` unconditionally, even while a request is in flight, and `onClose`
   in `MovementsPage` unmounts `BatchCancelDialog` — destroying the ref along
   with it. A reopened dialog gets a FRESH ref reading `false`, so the exact
   documents already mid-submission can be resubmitted from the new instance
   before the first request even resolves.

   This in-memory set covers the SAME-PAGE case. The `'pending'` RECORD
   (persisted before dispatch) covers the reload case, which this set cannot:
   it dies with the page. */
const pendingDocNums = new Set<string>()

export interface BatchCancelState {
  /** Every batch whose outcome was never reconciled, keyed by id. */
  unresolvedById: RecordMap
  /** Same records as a list, for callers that only need to iterate. */
  unresolvedList: UnresolvedBatch[]
  /** Non-null when persistence could not be read or written — BLOCKS dispatch. */
  persistenceError: string | null
  /** Loads the persisted records for this project+account scope. On failure it
      PRESERVES existing memory and sets `persistenceError`. */
  hydrate: (userId: string | null | undefined) => void
  /** Records an ATTEMPT before dispatch. Returns the id, or null when the
      record could not be persisted — in which case the caller MUST NOT
      dispatch. */
  beginAttempt: (docNums: readonly string[]) => string | null
  /** Moves a record to a new phase. Never changes `docNums` or the scope, and
      is a no-op for an id that is gone or written under another scope. */
  setPhase: (id: string, phase: UnresolvedPhase, refreshFailed?: boolean) => void
  /** Records an outcome directly, without a prior `beginAttempt` — an UNKNOWN
      by default. Kept for callers that learn an outcome for a batch they did
      not register up front; the normal submit path uses `beginAttempt` then
      `setPhase`. Returns the id, or null when the scope is unestablished. */
  markUnresolved: (
    docNums: readonly string[],
    refreshFailed: boolean,
    phase?: UnresolvedPhase,
  ) => string | null
  /** Updates the `refreshFailed` flag of an existing record IN PLACE. */
  setRefreshFailed: (id: string, refreshFailed: boolean) => void
  /** Clears ONE record by id. Called ONLY on a positive observation that its
      documents are now cancelled, or when the user dismisses it having
      checked themselves — never merely because a refresh returned rows. */
  clearUnresolved: (id: string) => void
  /** Reserves these documents as pending a live RPC response. Call
      synchronously before the request, never after an `await`. */
  beginPending: (docNums: readonly string[]) => void
  /** Releases the reservation. Call in every exit path of the submit handler,
      success or failure, so a document is never stuck pending. */
  endPending: (docNums: readonly string[]) => void
  /** Whether any of these documents currently has a request in flight,
      possibly started from an earlier (now-unmounted) dialog instance. */
  isPending: (docNums: readonly string[]) => boolean
  reset: () => void
}

const toList = (byId: RecordMap): UnresolvedBatch[] => Object.values(byId)

export const useBatchCancelStore = create<BatchCancelState>((set, get) => ({
  unresolvedById: {},
  unresolvedList: [],
  persistenceError: null,

  hydrate: (userId) => {
    const scope = scopeOf(userId)
    const res = readStore(scope)
    currentScope = scope
    if (!res.ok) {
      /* FAIL CLOSED. Existing in-memory records are PRESERVED — they are real
         blocks held this session — and the error is exposed so the dialog can
         refuse to dispatch. The old code assigned `{}` here and silently
         destroyed exactly those blocks.

         When the read recovered SOME valid records (an invalid sibling among
         good ones), those are MERGED IN as well: they are genuine blocks, and
         raising the error must not cost us the protection we could read. The
         merge never removes an in-memory record. */
      const recovered = res.records
      if (recovered && Object.keys(recovered).length) {
        const byId = { ...get().unresolvedById, ...recovered }
        set({
          unresolvedById: byId,
          unresolvedList: toList(byId),
          persistenceError: res.error,
        })
        return
      }
      set({ persistenceError: res.error })
      return
    }
    /* A successful read REPLACES memory for this scope: the stored map is
       authoritative for the scope just loaded. Records held in memory under a
       DIFFERENT scope belong to another account and must not leak across. */
    set({
      unresolvedById: res.records,
      unresolvedList: toList(res.records),
      persistenceError: null,
    })
  },

  beginAttempt: (docNums) => {
    const scope = currentScope
    /* No hydrate ran, so no scope is established — refuse rather than write an
       unscoped record. */
    if (scope === null) return null
    /* THE BLOCK IS ENFORCED HERE, not only in the UI. A disabled button is a
       rendering decision; this is the dispatch gate itself, so no caller —
       a stale click handler, a future call site, a test — can route around
       it. While the attempt history is unreadable we cannot show these
       documents are free of an earlier unconfirmed attempt. */
    if (get().persistenceError !== null) return null
    const id = nextId()
    const record: UnresolvedBatch = {
      id,
      docNums: [...docNums],
      refreshFailed: false,
      phase: 'pending',
      scope,
    }
    const byId = { ...get().unresolvedById, [id]: record }
    /* PERSIST BEFORE DISPATCH. If this fails the caller must not send: a
       reload mid-request would otherwise leave no trace of the attempt. */
    if (!writeStore(scope, byId)) {
      set({ persistenceError: WRITE_FAILED })
      return null
    }
    /* `persistenceError` is NOT cleared here: a successful write proves this
       record was stored, not that the earlier unreadable history became
       readable. Only a clean `hydrate` clears it. (Unreachable while an error
       stands, given the gate above — stated so it stays true if the gate ever
       moves.) */
    set({ unresolvedById: byId, unresolvedList: toList(byId) })
    return id
  },

  markUnresolved: (docNums, refreshFailed, phase = 'unknown') => {
    const id = get().beginAttempt(docNums)
    if (id === null) return null
    get().setPhase(id, phase, refreshFailed)
    return id
  },

  setPhase: (id, phase, refreshFailed) => {
    const existing = get().unresolvedById[id]
    if (!existing) return
    /* A late response whose record was written under another scope (the
       account changed mid-flight) must not be redirected into this scope. */
    if (existing.scope !== currentScope) return
    const next: UnresolvedBatch = {
      ...existing,
      phase,
      refreshFailed: refreshFailed ?? existing.refreshFailed,
    }
    const byId = { ...get().unresolvedById, [id]: next }
    set({ unresolvedById: byId, unresolvedList: toList(byId) })
    if (currentScope !== null) writeStore(currentScope, byId)
  },

  setRefreshFailed: (id, refreshFailed) => {
    const existing = get().unresolvedById[id]
    if (!existing) return
    if (existing.scope !== currentScope) return
    const byId = { ...get().unresolvedById, [id]: { ...existing, refreshFailed } }
    set({ unresolvedById: byId, unresolvedList: toList(byId) })
    if (currentScope !== null) writeStore(currentScope, byId)
  },

  clearUnresolved: (id) => {
    const byId = { ...get().unresolvedById }
    delete byId[id]
    set({ unresolvedById: byId, unresolvedList: toList(byId) })
    if (currentScope !== null) writeStore(currentScope, byId)
  },

  beginPending: (docNums) => {
    for (const d of docNums) pendingDocNums.add(d)
  },
  endPending: (docNums) => {
    for (const d of docNums) pendingDocNums.delete(d)
  },
  isPending: (docNums) => docNums.some((d) => pendingDocNums.has(d)),

  reset: () => {
    pendingDocNums.clear()
    set({ unresolvedById: {}, unresolvedList: [], persistenceError: null })
    if (currentScope !== null) writeStore(currentScope, {})
  },
}))

/** Test-only: forget the hydrated scope so a suite can start clean. */
export const __resetScope = (): void => { currentScope = null }
