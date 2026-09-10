import { supabase } from './supabase'

/** One row of the central `reference_values` directory. */
export interface ReferenceValue {
  id: string
  name: string
  active: boolean
}

/* The four kinds `reference_values` physically holds, keyed by the UI kind name.
   `reference_values_kind_chk` restricts the column to exactly these four stored
   values, and get_reference_values() returns all of them in one call. */
export interface ReferenceValues {
  channel: ReferenceValue[]
  unit: ReferenceValue[]
  category: ReferenceValue[]
  /* Parsed here because it arrives in the same response. Phase 3a does not
      surface it — its availability is gated on Sərfiyyat readiness, which
      Phase 3b builds (design §4.4, registry M3-02a/M3-06). */
  serfiyyat_channel: ReferenceValue[]
}

/** Stored `kind` value in the table → the UI kind name (index.html:999-1002). */
const STORED_KIND = {
  purchase_channel: 'channel',
  unit: 'unit',
  item_category: 'category',
  serfiyyat_channel: 'serfiyyat_channel',
} as const

export interface ReferenceValuesResult {
  values: ReferenceValues
  /* DB.refs.ready (index.html:1003): true only when the RPC succeeded. The
     original logs a warning and carries on with empty lists rather than failing
     the screen, so this never throws. */
  ready: boolean
}

function empty(): ReferenceValues {
  return { channel: [], unit: [], category: [], serfiyyat_channel: [] }
}

/* Ported from the DB.refs load (index.html:995-1004).

   One RPC call feeds all four kinds — get_reference_values() returns every
   `reference_values` row the caller may see, and the client splits by `kind`.
   Calling it once per kind would be four round trips for the same data.

   The RPC is SECURITY DEFINER and applies its own visibility rule: an admin
   sees inactive rows too, anyone else only active ones. This screen is
   admin-only, so in practice it sees everything.

   Failure is reported as `ready: false`, never thrown. The original wraps the
   whole call in try/catch (995-1004) precisely because BOTH failure shapes
   occur: PostgREST returns `{ error }` for a SQL-level problem, while a
   network or fetch failure REJECTS the promise. Letting a rejection escape
   would take down the entire Soraqçalar page through the store's Promise.all,
   where the original merely warns and carries on with the remaining kinds. */
export async function fetchReferenceValues(): Promise<ReferenceValuesResult> {
  try {
    const { data, error } = await supabase.rpc('get_reference_values')
    if (error) return { values: empty(), ready: false }

    const values = empty()
    for (const row of (data ?? []) as { id: string; kind: string; name: string; active: boolean | null }[]) {
      const uiKind = STORED_KIND[row.kind as keyof typeof STORED_KIND]
      if (!uiKind) continue
      values[uiKind].push({ id: String(row.id), name: row.name, active: row.active !== false })
    }
    return { values, ready: true }
  } catch {
    return { values: empty(), ready: false }
  }
}
