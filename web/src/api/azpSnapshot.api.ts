import { supabase } from './supabase'
import { azpR2 } from '../lib/azpNum'
import type { AzpModule } from '../lib/azpLabels'
import type { Database } from '../types/database'

/* Azpetrol / Araz — the READ-ONLY module snapshot (M17-22 … M17-27).

   Ported from `azpLoad()` (index.html:8171-8199).

   READ-ONLY BY CONSTRUCTION. Four SELECTs, no RPC, no write. Phase 17 holds
   no write authority at all: D-T1 (writes), D-T2 (TEST fixture), D-T3
   (`azp_delete_card`), D-T4 (import) and D-T5 (bulk export egress) are all
   undecided, so this module deliberately exposes no `azp_save_card`,
   `azp_post_movements`, `azp_cancel_movement`, `azp_correct_movement`,
   `azp_delete_card` or `azp_set_application_balance` path.

   MODULE ISOLATION (M17-30). Only `azp_*` relations are touched. `items`,
   `movements`, `partners`, `warehouses` and ANBAR's `audit_log` are never
   read here — the isolation legacy states at index.html:8057-8072 and sql/020
   enforces. Every read additionally carries `.eq('module', m)`, so the two
   boards can never blend even before the client filter runs.

   WHAT THIS MODULE DOES NOT PROVE. The reads are shaped here; whether the
   server ALLOWS them is `azp_can_read()`, the RLS SELECT policies and the
   sql/021 privilege lockdown — ledger rows M17-17…M17-21, all BLOCKED. No
   test in this file's suite can satisfy any of them: a mocked client proves
   the query shape, never the server's answer. */

/* The three row shapes are DERIVED from the generated `Database` types rather
   than restated by hand, so they cannot drift from the schema. An earlier
   draft of this file described them by hand and disagreed with the real
   schema in eight places — `amount`/`card_id`/`kind` are NOT NULL, `cancelled`
   and `vat_included` are plain booleans, `detail` is `Json`, `azp_audit_log`
   has `entity_id` and no `actor`-shaped nullable text of the kind assumed.
   Deriving removes the whole class of error. */

/** `azp_card_balances` — the security_invoker view, non-cancelled aggregates.

    Every column is nullable HERE even though the underlying `azp_cards`
    columns are NOT NULL, because a view's projected columns carry no
    not-null guarantee. The render path must therefore tolerate nulls; it is
    not permitted to assume the table's stricter shape. */
export type AzpCardBalanceRow = Database['public']['Views']['azp_card_balances']['Row']

/** `azp_movements` — the raw movement rows, cancelled ones included. */
export type AzpMovementRow = Database['public']['Tables']['azp_movements']['Row']

/** `azp_audit_log` — the module's OWN audit trail, never ANBAR's. */
export type AzpAuditRow = Database['public']['Tables']['azp_audit_log']['Row']

export interface AzpSnapshot {
  cards: AzpCardBalanceRow[]
  movs: AzpMovementRow[]
  log: AzpAuditRow[]
  /** `azp_application_balances.current_balance`, or 0 when no row exists. */
  appBalance: number
}

export type AzpSnapshotResult =
  | { ok: true; snapshot: AzpSnapshot }
  | { ok: false; error: string }

/** The exact legacy fallback when a thrown value carries no message. */
const FAIL = 'Modul məlumatları yüklənmədi'

function message(e: unknown, fallback: string): string {
  if (e && typeof e === 'object' && 'message' in e) {
    const m = (e as { message?: unknown }).message
    if (typeof m === 'string' && m) return m
  }
  if (typeof e === 'string' && e) return e
  return fallback
}

/**
 * The four-read snapshot, for ONE module, as one atomic unit (M17-22).
 *
 * Reads, in the legacy order and with the legacy ordering/limits (M17-23):
 *   1. `azp_card_balances` — `order('sort_order')` then `order('card_no')`
 *   2. `azp_movements`     — `order('id', desc)` `limit(5000)`
 *   3. `azp_audit_log`     — `order('at', desc)` `limit(300)`
 *   4. `azp_application_balances` — `select('current_balance').maybeSingle()`
 *
 * ATOMIC FAILURE (M17-24): if ANY of the four reports an error the whole load
 * fails. The caller then keeps its previous snapshot rather than rendering a
 * half-read board — a partially-read card set would understate balances, and
 * this module's whole point is that its figures reconcile.
 *
 * A MISSING APPLICATION-BALANCE ROW IS NOT AN ERROR (M17-25). `maybeSingle()`
 * yields `data: null` with no error, and the balance is then 0 — legacy
 * index.html:8190. That is a real state: a module whose fund row has never
 * been set has a zero fund, not a broken load. It is NOT the same as a FAILED
 * read of that table, which does fail the snapshot.
 *
 * Never throws: both failure shapes — a returned `error` and a rejected
 * promise — end as `ok: false`.
 */
export async function fetchAzpSnapshot(m: AzpModule): Promise<AzpSnapshotResult> {
  try {
    const [cards, movs, log, app] = await Promise.all([
      supabase.from('azp_card_balances').select('*').eq('module', m)
        .order('sort_order').order('card_no'),
      supabase.from('azp_movements').select('*').eq('module', m)
        .order('id', { ascending: false }).limit(5000),
      supabase.from('azp_audit_log').select('*').eq('module', m)
        .order('at', { ascending: false }).limit(300),
      supabase.from('azp_application_balances').select('current_balance').eq('module', m)
        .maybeSingle(),
    ])

    /* Legacy takes the FIRST error of the four, in this order (8186-8187). */
    const bad = cards.error || movs.error || log.error || app.error
    if (bad) return { ok: false, error: message(bad, FAIL) }

    return {
      ok: true,
      snapshot: {
        cards: (cards.data as AzpCardBalanceRow[] | null) || [],
        movs: (movs.data as AzpMovementRow[] | null) || [],
        log: (log.data as AzpAuditRow[] | null) || [],
        /* index.html:8190 — the null row means 0, and the stored value is
           rounded through the module's own R2 like every other money figure. */
        appBalance: app.data ? azpR2((app.data as { current_balance?: unknown }).current_balance) : 0,
      },
    }
  } catch (e) {
    return { ok: false, error: message(e, FAIL) }
  }
}
