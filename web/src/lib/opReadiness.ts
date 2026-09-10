/* Load / readiness matrix and the single post-eligibility gate.

   Written BEFORE the store so the store cannot invent its own rules
   (plan T2b, proposal §5). Registry rows M7-S1…M7-S6.

   ---------------------------------------------------------------------------
   WHY THIS MODULE EXISTS

   The legacy loader (index.html:864-1017) has two tiers: four core reads in one
   Promise.all, then every other read wrapped in try/catch with a readiness
   flag. Two of its behaviours produce a WRONG WRITE rather than a refusal, and
   both are corrected here under principles §7 (documented, not copied). Neither
   correction changes a calculation, permission, document, balance or Excel
   output — each turns a silent wrong answer into a visible refusal.

   1. PARTIAL READS COMMIT (M7-S2). `fetchAll()` breaks out of its paging loop
      on error and RETURNS THE ROWS GATHERED SO FAR (855), setting a module-level
      LOAD_ERR; the operation screen's own refresh callers (4768, 4863) ignore
      the returned `ok` entirely. A `movements` failure on page 3 of 5 therefore
      builds every balance from a truncated dataset and OVERSTATES available
      stock, so the negative-stock ban passes on quantities that do not exist.
      → Here a partial read is a FAILED read, and a failed core read blocks
        posting.

   2. A FAILED stock_conditions READ SILENTLY DISABLES THE SPLIT (M7-S3).
      `condsReady` gates only `canEditCond()` (2149), NOT `condBuckets()`
      (2087). With the map empty every bucket reads 0, `marked` is false, the
      split UI never renders, and the whole quantity posts as `normal` — quietly
      moving rented or unfit stock as if it were free.
      → Here stock_conditions is a CORE read: its failure blocks posting.

   Optional probes keep their legacy degraded behaviour exactly: a failed
   stock-layer probe leaves the pre-layer flow working, a failed split probe
   blocks only lines that actually carry a split, and the reference/transfer
   destination reads fall back to their documented defaults. */

import type { OpKind } from './opTypes'

/* ---------- the matrix ---------- */

/** Reads whose absence could allow an incorrect stock write. */
export const CORE_READS = [
  'items',
  'movements',
  'warehouses',
  'partners',
  'stock_conditions',
] as const

/** Capability probes and reads with an established fallback. */
export const OPTIONAL_READS = [
  'reference_values',
  'movement_split_supported',
  'stock_layers_supported',
  'transfer_destinations',
] as const

export type CoreRead = (typeof CORE_READS)[number]
export type OptionalRead = (typeof OPTIONAL_READS)[number]

export function isCoreRead(name: string): name is CoreRead {
  return (CORE_READS as readonly string[]).includes(name)
}

/** index.html:2795-2800 wording, reused for a fatal load. */
export const LOAD_FAILED_TITLE = 'Məlumat yüklənmədi'

/* ---------- read results ---------- */

/**
 * The shape every Phase 7 read returns.
 *
 * `ok:false` covers BOTH a returned `{error}` and a rejected promise, and — for
 * a paged read — a failure part-way through paging. `partial` records that rows
 * were already gathered when the failure happened; they are reported but MUST
 * NOT be committed (M7-S2).
 */
export interface ReadResult<T> {
  rows: T[]
  ok: boolean
  error: string | null
  /** True when the read failed after at least one successful page. */
  partial?: boolean
}

export interface ProbeResult<T> {
  value: T | null
  ok: boolean
  error: string | null
}

/* ---------- readiness state ---------- */

export interface ReadinessState {
  /** A complete core snapshot has been committed at least once. */
  loaded: boolean
  /** Non-null when the LAST core load failed. */
  coreError: string | null
  /** Which core read failed, when one did. */
  failedCore: CoreRead | null
  /** movement_split_supported() — false when the probe failed or returned false. */
  splitReady: boolean
  /** stock_layers_supported().active. */
  layerActive: boolean
  /** get_reference_values() succeeded — «failed» is NOT «ready but empty». */
  refsReady: boolean
  /** get_transfer_destinations() succeeded; false means the fallback is in use. */
  transferDestsReady: boolean
}

export const EMPTY_READINESS: ReadinessState = {
  loaded: false,
  coreError: null,
  failedCore: null,
  splitReady: false,
  layerActive: false,
  refsReady: false,
  transferDestsReady: false,
}

/**
 * Folds the core reads into a readiness verdict.
 *
 * The core set is ATOMIC: unless every read succeeded outright, nothing is
 * committed. A partial read is treated exactly like a total failure — see
 * M7-S2 above.
 *
 * `previouslyLoaded` carries the Phase 6 `M6-S3` behaviour: a failed REFRESH
 * after a good snapshot keeps `loaded` true so the caller retains its rows and
 * shows the error in the footer, instead of blanking a working screen.
 */
export function foldCoreReads(
  results: Partial<Record<CoreRead, ReadResult<unknown>>>,
  previouslyLoaded = false,
): Pick<ReadinessState, 'loaded' | 'coreError' | 'failedCore'> {
  for (const name of CORE_READS) {
    const r = results[name]
    if (!r) {
      return {
        loaded: previouslyLoaded,
        coreError: `${name}: nəticə yoxdur`,
        failedCore: name,
      }
    }
    if (!r.ok) {
      return {
        loaded: previouslyLoaded,
        coreError: r.error || 'Naməlum xəta',
        failedCore: name,
      }
    }
  }
  return { loaded: true, coreError: null, failedCore: null }
}

/** True when a committed snapshot exists and the last load did not fail. */
export function coreHealthy(s: ReadinessState): boolean {
  return s.loaded && !s.coreError
}

/**
 * A failed refresh keeps the previous snapshot — M7-S6.
 * The caller renders the rows it already has plus the error; it must NOT show
 * the empty-result state (the Phase 6 A01 lesson).
 */
export function retainsSnapshot(s: ReadinessState): boolean {
  return s.loaded && s.coreError != null
}

/* ---------- post eligibility ---------- */

export interface EligibilityLine {
  kind: OpKind
  cond?: Record<string, number> | null | undefined
  allocations?: unknown[] | null | undefined
}

/**
 * A line carrying a condition split cannot be posted while the server cannot
 * store one — index.html:4799, 4835.
 *
 * The block is per-DOCUMENT, matching the original: if ANY line carries a
 * split, the whole post is refused. Lines with no split are unaffected, which
 * is why a failed probe does not disable the screen.
 */
export function splitEligible(
  lines: readonly EligibilityLine[],
  splitReady: boolean,
): boolean {
  if (splitReady) return true
  return !lines.some((l) => l.kind !== 'in' && hasSplit(l.cond))
}

function hasSplit(cond: Record<string, number> | null | undefined): boolean {
  if (!cond) return false
  for (const k of Object.keys(cond)) {
    if (k === 'normal') continue
    if (Number(cond[k]) > 1e-9) return true
  }
  return false
}

/**
 * With layer accounting active every outbound line must carry allocations —
 * index.html:4804-4806, 4840-4847. With it inactive the pre-layer flow runs and
 * allocations are irrelevant.
 */
export function layerEligible(
  lines: readonly EligibilityLine[],
  layerActive: boolean,
): boolean {
  if (!layerActive) return true
  return !lines.some(
    (l) => l.kind !== 'in' && (!Array.isArray(l.allocations) || l.allocations.length === 0),
  )
}

export interface PostGateState {
  readiness: ReadinessState
  lines: readonly EligibilityLine[]
  canAdd: boolean
  inFlight: boolean
}

export type PostBlockReason =
  | 'not-loaded'
  | 'core-error'
  | 'no-permission'
  | 'no-lines'
  | 'in-flight'
  | 'split-unsupported'
  | 'layers-required'

/**
 * THE single post-eligibility predicate — M7-S5.
 *
 * Every button and every handler consults this one function. The original's
 * refusals are scattered across the render (3754), the click handler (4631) and
 * the poster (4692-4699), which is what let the two silent-write paths above
 * exist at all. One predicate means no UI path can reach a post the matrix
 * forbids.
 */
export function postBlockReason(s: PostGateState): PostBlockReason | null {
  if (!s.readiness.loaded) return 'not-loaded'
  if (s.readiness.coreError) return 'core-error'
  if (!s.canAdd) return 'no-permission'
  if (!s.lines.length) return 'no-lines'
  if (s.inFlight) return 'in-flight'
  if (!splitEligible(s.lines, s.readiness.splitReady)) return 'split-unsupported'
  if (!layerEligible(s.lines, s.readiness.layerActive)) return 'layers-required'
  return null
}

/** Convenience inverse of `postBlockReason`. */
export function canPost(s: PostGateState): boolean {
  return postBlockReason(s) === null
}
