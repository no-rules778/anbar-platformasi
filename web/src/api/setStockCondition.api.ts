import { supabase } from './supabase'
import { blockedReason } from '../lib/mutationGuard'
import type { CondKey } from '../lib/condSplit'
import type { StockConditionRow } from './stockConditions.api'
import type { Database } from '../types/database'

/* The generated signature declares `p_note?: string` (optional, never null),
   but the live function's parameter is a nullable TEXT with a default, and
   legacy sends `cur.note || null` (index.html:2171) — an explicit null, not an
   omitted key. The wire value is kept exactly legacy; only the TypeScript
   view is widened here. */
type RpcArgs = Database['public']['Functions']['set_stock_condition']['Args']
type WireArgs = Omit<RpcArgs, 'p_note'> & { p_note: string | null }
const asRpcArgs = (a: WireArgs): RpcArgs => a as unknown as RpcArgs

/* `set_stock_condition` — the ONLY application write on the balance screen.
   Ported from legacy `saveCond()` (index.html:2153-2205), the RPC half.

   M9-98   all four quantities plus the existing note are sent every time, so
           a concurrent partial edit cannot write an inconsistent row;
   M9-99   on `PGRST202` the call retries with the pre-031 six-argument
           signature (no `p_icare_qty`);
   M9-100  on `PGRST202` while the edited key IS `icare`: no retry, the exact
           legacy message, and the caller marks sync failed;
   M9-101  `action === 'DELETE'` (or an empty response) means "remove the local
           entry"; otherwise the returned row replaces it;
   M9-102  `exceeds_balance: true` is a WARNING — the write still succeeded;
   M9-106  no direct PostgREST write to `stock_conditions` is attempted here or
           anywhere: the table's captured ACL grants no INSERT/UPDATE/DELETE;
   M9-107  the write goes through `lib/mutationGuard.ts` (`cond.set`), so
           VITE_ALLOW_LOCAL_WRITES=false blocks it on localhost;
   M9-108  a server refusal surfaces its exact message text.

   Input NORMALISATION (trim, comma→dot, blank→0, non-negative, 2-dp rounding —
   M9-96/M9-97) lives in `lib/condInput.ts` and is applied by the caller
   BEFORE this function. Passing a raw string here is a type error by design.

   Never throws. Both failure shapes are absorbed — a returned `{ error }` and
   a rejected promise. */

/** index.html:2177. */
export const ICARE_UNSUPPORTED_MSG = 'İcarə sütunu bazada yoxdur — sql/031 hələ tətbiq edilməyib'

/** index.html:2203 — the fallback when a thrown error carries no message. */
export const COND_SAVE_FALLBACK_MSG = 'vəziyyət saxlanılmadı'

export interface SetStockConditionInput {
  warehouse: string
  itemCode: string
  /** The four quantities, ALREADY normalised (M9-96/M9-97). */
  unfit: number
  repair: number
  onsite: number
  icare: number
  /** The existing note, resent unchanged (M9-98). `null` when none. */
  note: string | null
  /** Which key the user edited — decides the `icare` PGRST202 branch (M9-100). */
  editedKey: CondKey
}

export type SetStockConditionResult =
  | {
      ok: true
      /** The server's `action` — `INSERT` / `UPDATE` / `DELETE` / `NOOP`, or
          `''` when the response carried none. */
      action: string
      /** `null` for DELETE or an empty response (remove the local entry);
          otherwise the row to store, built from the returned columns (M9-101). */
      row: StockConditionRow | null
      /** M9-102 — the write succeeded; the caller shows a warning. */
      exceedsBalance: boolean
      /** The server's balance figure for that warning. */
      balance: number
      /** True when the six-argument fallback was what succeeded (M9-99). */
      retriedLegacySignature: boolean
    }
  | {
      ok: false
      /** `blocked` — mutation guard (M9-107); `icare-unsupported` — M9-100;
          `server` — a returned error (M9-108); `network` — a rejected promise. */
      kind: 'blocked' | 'icare-unsupported' | 'server' | 'network'
      error: string
    }

const num = (v: unknown): number => {
  const n = parseFloat(String(v))
  return Number.isFinite(n) ? n : 0
}

/** The pre-031 six-argument signature (index.html:2168-2172). */
function baseArgs(input: SetStockConditionInput): WireArgs {
  return {
    p_warehouse: input.warehouse,
    p_item_code: input.itemCode,
    p_unfit_qty: input.unfit,
    p_repair_qty: input.repair,
    p_onsite_qty: input.onsite,
    p_note: input.note || null,
  }
}

export async function setStockCondition(
  input: SetStockConditionInput,
  opts: { local?: boolean; allowed?: boolean } = {},
): Promise<SetStockConditionResult> {
  /* M9-107 — FIRST refusing guard. On localhost without the opt-in no RPC is
     issued at all. */
  const blocked = blockedReason('cond.set', opts)
  if (blocked) return { ok: false, kind: 'blocked', error: blocked }

  const base = baseArgs(input)
  try {
    /* Full seven-argument call first (2174-2175). */
    let res = await supabase.rpc('set_stock_condition', asRpcArgs({ ...base, p_icare_qty: input.icare }))
    let retried = false

    if (res.error && res.error.code === 'PGRST202') {
      /* M9-100 — the İcarə column cannot exist on a server that rejects the
         seven-argument signature, so retrying would silently drop the edit. */
      if (input.editedKey === 'icare') {
        return { ok: false, kind: 'icare-unsupported', error: ICARE_UNSUPPORTED_MSG }
      }
      /* M9-99 — the pre-031 signature (2182). */
      res = await supabase.rpc('set_stock_condition', asRpcArgs(base))
      retried = true
    }

    if (res.error) {
      /* M9-108 — the exact server text; legacy `throw error` → `err.message`. */
      return { ok: false, kind: 'server', error: res.error.message || COND_SAVE_FALLBACK_MSG }
    }

    const data = (res.data ?? null) as Record<string, unknown> | null
    const action = String(data?.action ?? '')

    /* M9-101 — DELETE or an empty response removes the local entry; otherwise
       the returned row (2185-2194) is the new local value. */
    const row: StockConditionRow | null =
      !data || action === 'DELETE'
        ? null
        : {
            w: input.warehouse,
            c: input.itemCode,
            unfit: num(data.unfit_qty),
            repair: num(data.repair_qty),
            onsite: num(data.onsite_qty),
            icare: num(data.icare_qty),
            note: String(data.note ?? ''),
          }

    return {
      ok: true,
      action,
      row,
      exceedsBalance: data?.exceeds_balance === true,
      balance: num(data?.balance),
      retriedLegacySignature: retried,
    }
  } catch (err) {
    return {
      ok: false,
      kind: 'network',
      error: err instanceof Error && err.message ? err.message : COND_SAVE_FALLBACK_MSG,
    }
  }
}
