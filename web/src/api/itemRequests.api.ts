import { supabase } from './supabase'
import { blockedReason } from '../lib/mutationGuard'
import type { ItemRequestView } from '../lib/nomenclatureRequests'

/* «Nomenklatura sorğuları» data access — the legacy DB.itemReqs loader
   (index.html:889-903) and the four RPCs of sql/017.

   THE READ IS NOT FAULT-TOLERANT HERE, AND THAT IS DELIBERATE (M12-11).
   Legacy swallows a failed `item_requests` read and leaves the list empty so
   the rest of the platform keeps working (889-903). The React page is isolated
   from the rest of the application, so under the accepted atomic model
   (M12-13/M12-14) a failed read MUST surface as `ok:false` — never as a
   successful empty snapshot, which would tell the user "no requests" when the
   truth is "we could not find out".

   EVERY WRITE IS AN RPC (M12-90). `item_requests` carries a SELECT-only policy
   and a SELECT-only grant, so a direct PostgREST write is refused for every
   role including admin. Nothing in this file INSERTs, UPDATEs or DELETEs. */

export interface ItemRequestsResult {
  rows: ItemRequestView[]
  ok: boolean
  error: string | null
}

const FAIL_READ = 'Nomenklatura sorğuları yüklənmədi'

const msg = (e: unknown, fallback: string): string =>
  (e instanceof Error && e.message ? e.message : fallback)

/* index.html:894-901 (M12-12) — the loader renames almost every column and
   defaults each empty value. The React view model mirrors it exactly, because
   every downstream row is written against these names. */
interface ItemRequestRow {
  id: string
  name: string
  unit: string | null
  category: string | null
  note: string | null
  status: string | null
  created_by: string | null
  created_warehouse: string | null
  created_at: string | null
  decided_by: string | null
  decided_at: string | null
  decision_reason: string | null
  item_code: string | null
}

export function mapItemRequest(r: ItemRequestRow): ItemRequestView {
  return {
    id: r.id,
    name: r.name,
    unit: r.unit || '',
    category: r.category || '',
    note: r.note || '',
    status: r.status || 'pending',
    by: r.created_by || '',
    w: r.created_warehouse || '',
    /* `new Date(...).getTime()` else 0 — an unparseable date yields NaN in
       legacy; the `|| 0` guard below keeps the view model's contract that
       `ts` is always a number (M12-12, M12-31). */
    ts: r.created_at ? new Date(r.created_at).getTime() || 0 : 0,
    decidedBy: r.decided_by || '',
    decidedAt: r.decided_at || '',
    reason: r.decision_reason || '',
    code: r.item_code || '',
  }
}

/**
 * M12-10, M12-11, M12-12 — reads `item_requests` (SELECT `*`, `created_at`
 * DESC) and nothing else. The client sends NO row filter: RLS decides what an
 * anbardar, a rehber or an admin sees (sql/017:124-129).
 *
 * Never throws. Both failure shapes are normalised into an explicit failed
 * result — a returned `{ error }` and a rejected promise — and neither is ever
 * represented as a successful empty list.
 */
export async function fetchItemRequests(): Promise<ItemRequestsResult> {
  try {
    const { data, error } = await supabase
      .from('item_requests')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) return { rows: [], ok: false, error: error.message || FAIL_READ }
    return { rows: ((data ?? []) as ItemRequestRow[]).map(mapItemRequest), ok: true, error: null }
  } catch (e) {
    return { rows: [], ok: false, error: msg(e, FAIL_READ) }
  }
}

export interface RpcResult<T = unknown> {
  ok: boolean
  data: T | null
  error: string | null
}

/* Every wrapper below calls blockedReason() FIRST (M12-97), so a stray
   localhost write is refused before the RPC is dispatched, and returns
   `{ ok, data, error }` rather than throwing. */
async function callRpc<T>(
  action: Parameters<typeof blockedReason>[0],
  fn: string,
  args: Record<string, unknown>,
): Promise<RpcResult<T>> {
  const blocked = blockedReason(action)
  if (blocked) return { ok: false, data: null, error: blocked }
  try {
    /* The generated Args types are per-RPC unions; this module is the single
       typed boundary in front of them, so the cast is contained here. */
    const { data, error } = await supabase.rpc(fn as never, args as never)
    if (error) return { ok: false, data: null, error: error.message || 'server xətası' }
    return { ok: true, data: (data ?? null) as T, error: null }
  } catch (e) {
    return { ok: false, data: null, error: msg(e, 'server xətası') }
  }
}

/** Empty → null, exactly as legacy sends it (`$('#nq-unit').value || null`). */
const orNull = (v: string | null | undefined): string | null => (v ? v : null)

/**
 * M12-59 — `request_new_item` with EXACTLY four parameters: no creator, no
 * warehouse, no status. The signature accepts none (sql/017:200-205), so a
 * client cannot file for another warehouse or pre-set a decision.
 */
export function requestNewItem(input: {
  name: string
  unit?: string | null
  category?: string | null
  note?: string | null
}): Promise<RpcResult<{ id?: string; name?: string; status?: string }>> {
  return callRpc('nreq.create', 'request_new_item', {
    p_name: input.name.trim(),
    p_unit: orNull(input.unit),
    p_category: orNull(input.category),
    p_note: orNull(input.note?.trim()),
  })
}

/**
 * M12-76, M12-77, M12-78 — `approve_item_request`.
 *
 * IRREVERSIBLE: on success the server permanently creates an `items` row and
 * consumes the next 7-digit code under advisory lock 424242 (sql/017:361-385).
 * It is idempotent — re-approving returns the existing code with
 * `already_approved: true` and `created_item: false` (325-330).
 */
export function approveItemRequest(input: {
  requestId: string
  name: string
  unit?: string | null
  category?: string | null
}): Promise<RpcResult<{ code?: string; already_approved?: boolean; created_item?: boolean }>> {
  return callRpc('nreq.approve', 'approve_item_request', {
    p_request_id: input.requestId,
    p_name: input.name.trim(),
    p_unit: orNull(input.unit),
    p_category: orNull(input.category),
  })
}

/**
 * M12-79, M12-80 — `reject_item_request`. The reason is mandatory at three
 * independent layers: this client, the RPC (sql/017:417-418) and a table CHECK
 * constraint (89-90). The decided row and its audit row remain permanently.
 */
export function rejectItemRequest(input: {
  requestId: string
  reason: string
}): Promise<RpcResult<{ status?: string }>> {
  return callRpc('nreq.reject', 'reject_item_request', {
    p_request_id: input.requestId,
    p_reason: input.reason.trim(),
  })
}

/**
 * M12-82 — `cancel_item_request` with `p_reason: null`, exactly as legacy
 * sends it (index.html:2704). The server independently raises «Sorğu
 * tapılmadı» for a missing id and «Sorğu artıq qapanıb …» for a non-pending
 * row (sql/017:447-450, 468-470); those refusals belong to M12-92 and are NOT
 * satisfied by the caller's early return.
 */
export function cancelItemRequest(requestId: string): Promise<RpcResult<{ status?: string }>> {
  return callRpc('nreq.cancel', 'cancel_item_request', {
    p_request_id: requestId,
    p_reason: null,
  })
}
