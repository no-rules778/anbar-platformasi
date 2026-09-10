import { create } from 'zustand'

/* THE UNRESOLVED-CORRECTION RECORD — Phase 8, milestone I-6, decision `D6`.

   After an UNKNOWN correction outcome the client does not know whether
   `correct_document` committed. Re-sending the same correction is the one
   action that can do real damage: if the first call DID commit, the original
   document is already cancelled and replaced, and a second call either fails
   confusingly or replaces the replacement — two corrections where the admin
   believes there was one, and an audit trail nobody can read back.

   So an unresolved attempt BLOCKS a repeat correction of that document, and
   the block must survive the two things that would otherwise clear it:

     - closing and reopening the dialog (component state dies with the mount)
     - reloading the page (in-memory state dies with the page)

   Hence `sessionStorage`, and hence a store rather than component state.

   ---------------------------------------------------------------------------
   WHY THIS IS A SEPARATE STORE FROM `batchCancel.store.ts`.

   The two protect different things and must not share a slot. A batch record
   is keyed by a LIST of document numbers and cleared when those documents are
   observed cancelled; a correction record is keyed by ONE document and is
   cleared only when that document's fate is established. Merging them would
   put a batch's reconciliation logic in a position to clear a correction's
   block, and I-5's records must keep behaving exactly as I-5 left them. The
   only thing borrowed is the SHAPE of the discipline — and `scopeOf`, so both
   stores agree on what "this project and this account" means.

   FAIL CLOSED, on the same three properties I-5 established:

   1. A READ FAILURE IS NOT AN EMPTY HISTORY. Existing memory is preserved and
      `persistenceError` is raised; a client that cannot read its own pending
      corrections cannot show that a correction is safe to send.
   2. RECORDS ARE VALIDATED, and a damaged record BELONGING TO THIS SCOPE is a
      blocking error rather than a droppable one — valid JSON does not imply a
      readable attempt history.
   3. THE SCOPE IS PROJECT + ACCOUNT, carried inside each record, so a response
      arriving after an account switch cannot write into the new scope.

   What is stored is the document number, the phase and the scope. No
   credentials, no token, no email, and NO EXPIRY: an unresolved correction
   does not become resolved by growing old. */

import { scopeOf } from './batchCancel.store'

const STORAGE_PREFIX = 'anbar_correction_unresolved_'

const storageKey = (scope: string): string => STORAGE_PREFIX + scope

/** `pending` — dispatched, no answer yet. `unknown` — answered unusably.
    `success` — committed; kept until the post-write refresh has RECONCILED
    the screen with the database (see `reconciled`). */
export type CorrectionPhase = 'pending' | 'unknown' | 'success'

export interface UnresolvedCorrection {
  id: string
  /** The document the correction was attempted ON. */
  docNum: string
  /** The replacement document, once one is known. */
  newDocNum: string | null
  phase: CorrectionPhase
  /** True when the post-success refresh failed — the screen is stale. */
  refreshFailed: boolean
  /* A CONFIRMED success is not yet a SAFE one. Between the moment the server
     confirms the correction and the moment the refreshed list proves it, the
     screen still shows the pre-correction rows: an admin looking at them sees
     an uncorrected document and can ask to correct it again. `refreshFailed`
     alone cannot cover that window, because it is only knowable AFTER the
     reload resolves — and if the reload THROWS it is never written at all,
     leaving a `success`/`refreshFailed:false` record that blocks nothing for
     the rest of the session.

     So protection is retained POSITIVELY: `reconciled` starts false and is set
     true only on the one path that observed a good refresh. Everything else —
     a failed refresh, a thrown refresh, a reload of the page mid-flight —
     leaves it false, and `blockingFor` keeps refusing. */
  /** True only once a successful post-write refresh has been observed. */
  reconciled: boolean
  /** Project + account, captured at ATTEMPT time. */
  scope: string
  /** Line count of the attempted payload, for the reconciliation message.
      The payload ITSELF is not stored: it can carry partner and note text,
      and a document number plus a count is enough to identify the attempt. */
  lineCount: number
}

type RecordMap = Record<string, UnresolvedCorrection>

const PHASES: readonly CorrectionPhase[] = ['pending', 'unknown', 'success']

/** The scope currently hydrated. Writes outside it are refused. */
let currentScope: string | null = null

export const READ_FAILED =
  'Əvvəlki sənəd düzəlişi qeydləri oxunmadı — brauzer yaddaşı əlçatmazdır. '
  + 'Təhlükəsizlik üçün sənəd düzəlişi dayandırıldı. Səhifəni yeniləyin.'

export const RECORD_INVALID =
  'Əvvəlki sənəd düzəlişi qeydlərindən biri oxunmadı (qeyd zədələnib). '
  + 'Hansı sənədin gözlədiyini müəyyən etmək mümkün deyil, ona görə sənəd '
  + 'düzəlişi dayandırıldı. Səhifəni yeniləyin və ya administratora müraciət edin.'

export const WRITE_FAILED =
  'Düzəliş qeydi brauzer yaddaşına yazılmadı — sorğu göndərilmir. '
  + 'Brauzer yaddaşına icazə verin və yenidən cəhd edin.'

/** Whether a stored blob CLAIMS this scope. A blob with no readable scope is
    treated as ours: we cannot prove otherwise, and the safe reading of an
    unidentifiable attempt is that it may be ours. */
const belongsToScope = (v: unknown, scope: string): boolean => {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return true
  const raw = (v as Record<string, unknown>).scope
  if (typeof raw !== 'string') return true
  return raw === scope
}

/** Validates ONE stored record. Anything malformed is not a record. */
const validRecord = (v: unknown, id: string, scope: string): UnresolvedCorrection | null => {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return null
  const r = v as Record<string, unknown>
  if (r.id !== id) return null
  if (typeof r.docNum !== 'string' || !r.docNum) return null
  if (r.newDocNum !== null && typeof r.newDocNum !== 'string') return null
  if (typeof r.refreshFailed !== 'boolean') return null
  /* A record persisted before this field existed, or one whose value is not a
     boolean, is read as NOT reconciled — the fail-closed direction. It is not
     a damaged record: an absent field cannot prove reconciliation happened. */
  const reconciled = r.reconciled === true
  if (!PHASES.includes(r.phase as CorrectionPhase)) return null
  if (typeof r.lineCount !== 'number' || !Number.isInteger(r.lineCount) || r.lineCount < 0) {
    return null
  }
  if (typeof r.scope !== 'string' || r.scope !== scope) return null
  return {
    id,
    docNum: r.docNum,
    newDocNum: (r.newDocNum as string | null) ?? null,
    phase: r.phase as CorrectionPhase,
    refreshFailed: r.refreshFailed,
    reconciled,
    scope,
    lineCount: r.lineCount,
  }
}

type ReadResult =
  | { ok: true; records: RecordMap }
  | { ok: false; error: string; records?: RecordMap }

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
    /* Only a record belonging to THIS scope counts as damage; another
       account's record is ordinary isolation. The stored value is left
       INTACT for diagnosis — hydration never rewrites or prunes storage. */
    if (belongsToScope(v, scope)) invalid++
  }
  if (invalid > 0) return { ok: false, error: RECORD_INVALID, records: out }
  return { ok: true, records: out }
}

const writeStore = (scope: string, records: RecordMap): boolean => {
  try {
    sessionStorage.setItem(storageKey(scope), JSON.stringify(records))
    return true
  } catch {
    return false
  }
}

let idSeq = 0
const nextId = (): string => 'uc-' + Date.now() + '-' + ++idSeq

/* Covers the SAME-PAGE double dispatch that a persisted record cannot see
   until it is written: a second click, or a second dialog instance, while the
   first request is still in flight. Dies with the page — the `pending` record
   is what covers a reload. */
const pendingDocs = new Set<string>()

export interface CorrectionState {
  unresolvedById: RecordMap
  unresolvedList: UnresolvedCorrection[]
  /** Non-null when persistence could not be read or written — BLOCKS writes. */
  persistenceError: string | null
  hydrate: (userId: string | null | undefined) => void
  /** Records an ATTEMPT before dispatch. Returns the id, or null when it could
      not be persisted — in which case the caller MUST NOT dispatch. */
  beginAttempt: (docNum: string, lineCount: number) => string | null
  setPhase: (
    id: string,
    phase: CorrectionPhase,
    patch?: { newDocNum?: string | null; refreshFailed?: boolean; reconciled?: boolean },
  ) => void
  /** Clears ONE record — only on a positive observation, or an informed
      dismissal by the user. Never merely because a refresh returned rows. */
  clearUnresolved: (id: string) => void
  /** The unresolved record blocking this document, if any. */
  blockingFor: (docNum: string) => UnresolvedCorrection | null
  beginPending: (docNum: string) => void
  endPending: (docNum: string) => void
  isPending: (docNum: string) => boolean
  reset: () => void
}

const toList = (byId: RecordMap): UnresolvedCorrection[] => Object.values(byId)

export const useCorrectionStore = create<CorrectionState>((set, get) => ({
  unresolvedById: {},
  unresolvedList: [],
  persistenceError: null,

  hydrate: (userId) => {
    const scope = scopeOf(userId)
    const res = readStore(scope)
    currentScope = scope
    if (!res.ok) {
      /* FAIL CLOSED: preserve in-memory blocks, merge anything recoverable,
         and expose the error so the caller refuses to dispatch. */
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
    set({
      unresolvedById: res.records,
      unresolvedList: toList(res.records),
      persistenceError: null,
    })
  },

  beginAttempt: (docNum, lineCount) => {
    const scope = currentScope
    if (!scope) return null
    /* A standing persistence error means the attempt history is unreadable.
       Writing a new record would not make it readable, and dispatching would
       be exactly the fail-open this store exists to prevent. */
    if (get().persistenceError) return null
    const id = nextId()
    const rec: UnresolvedCorrection = {
      id,
      docNum,
      newDocNum: null,
      phase: 'pending',
      refreshFailed: false,
      reconciled: false,
      scope,
      lineCount,
    }
    const byId = { ...get().unresolvedById, [id]: rec }
    if (!writeStore(scope, byId)) {
      /* The record could not be persisted, so a reload would lose the block.
         Refuse the dispatch instead of sending an unprotected correction. */
      set({ persistenceError: WRITE_FAILED })
      return null
    }
    set({ unresolvedById: byId, unresolvedList: toList(byId) })
    return id
  },

  setPhase: (id, phase, patch) => {
    const scope = currentScope
    if (!scope) return
    const existing = get().unresolvedById[id]
    /* A no-op for an id that is gone or was written under another scope. */
    if (!existing || existing.scope !== scope) return
    const next: UnresolvedCorrection = {
      ...existing,
      phase,
      newDocNum: patch?.newDocNum !== undefined ? patch.newDocNum : existing.newDocNum,
      refreshFailed: patch?.refreshFailed ?? existing.refreshFailed,
      reconciled: patch?.reconciled ?? existing.reconciled,
    }
    const byId = { ...get().unresolvedById, [id]: next }
    /* A failed write here does not lose an existing block — the record is
       still in memory — but the persisted copy is now behind, so a reload
       could under-report. Surfaced rather than swallowed. */
    if (!writeStore(scope, byId)) set({ persistenceError: WRITE_FAILED })
    set({ unresolvedById: byId, unresolvedList: toList(byId) })
  },

  clearUnresolved: (id) => {
    const scope = currentScope
    if (!scope) return
    const existing = get().unresolvedById[id]
    if (!existing || existing.scope !== scope) return
    const byId = { ...get().unresolvedById }
    delete byId[id]
    if (!writeStore(scope, byId)) set({ persistenceError: WRITE_FAILED })
    set({ unresolvedById: byId, unresolvedList: toList(byId) })
  },

  blockingFor: (docNum) => {
    /* PROTECTION IS RELEASED ONLY BY POSITIVE EVIDENCE, never by the absence
       of a failure flag.

       The earlier rule skipped every `success` whose `refreshFailed` was
       false. But the store is moved to `success` BEFORE the post-write reload
       is awaited, so `refreshFailed:false` is the state during the whole
       reload — the exact window in which the screen still shows the
       pre-correction rows. Worse, a reload that THROWS never reaches the code
       that would set `refreshFailed`, leaving the record permanently
       success/false and blocking nothing.

       A record therefore blocks unless it has been positively RECONCILED: a
       confirmed success whose follow-up refresh was observed to succeed. That
       is the only combination that proves the list on screen already shows the
       correction. */
    for (const rec of Object.values(get().unresolvedById)) {
      if (rec.docNum !== docNum) continue
      if (rec.phase === 'success' && rec.reconciled && !rec.refreshFailed) continue
      return rec
    }
    return null
  },

  beginPending: (docNum) => { pendingDocs.add(docNum) },
  endPending: (docNum) => { pendingDocs.delete(docNum) },
  isPending: (docNum) => pendingDocs.has(docNum),

  reset: () => {
    pendingDocs.clear()
    currentScope = null
    set({ unresolvedById: {}, unresolvedList: [], persistenceError: null })
  },
}))
