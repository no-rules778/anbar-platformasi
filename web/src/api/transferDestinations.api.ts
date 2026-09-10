import { supabase } from './supabase'

/* `get_transfer_destinations()` — index.html:1006-1011.

   A SECURITY DEFINER RPC that bypasses `warehouses` RLS so an anbardar sees
   «Ofis» as a valid destination without gaining access to its stock or
   metadata. The live function returns active `type='anbar'` warehouses ordered
   by name, and refuses any role outside admin/anbardar.

   OPTIONAL read: on failure the destination list falls back to the ordinary
   warehouse list (the original leaves `DB.transferDests` as `DB.whs`, 934/1011).
   The server re-validates the destination at post time regardless.

   NOTE: the returned list is the raw server list. The D-H1 narrowing — removing
   «Ofis» for an anbardar — is applied on top of it by
   `transferDestWarehouses()`, not here, so this module stays a faithful
   transport of the server's answer. */

export interface TransferDestinationsResult {
  /** The server list, or the caller's fallback when `ok` is false. */
  names: string[]
  ok: boolean
  error: string | null
}

/**
 * Never throws. `fallback` is returned unchanged when the RPC fails or answers
 * with an empty/invalid payload — matching the original, which only replaces
 * the list when the response is a non-empty array (1010).
 */
export async function fetchTransferDestinations(
  fallback: readonly string[],
): Promise<TransferDestinationsResult> {
  try {
    const { data, error } = await supabase.rpc('get_transfer_destinations')
    if (error) {
      return { names: [...fallback], ok: false, error: error.message || 'Naməlum xəta' }
    }
    if (Array.isArray(data) && data.length) {
      return { names: (data as unknown[]).map(String), ok: true, error: null }
    }
    return { names: [...fallback], ok: false, error: null }
  } catch (err) {
    return {
      names: [...fallback],
      ok: false,
      error: err instanceof Error ? err.message : 'Naməlum xəta',
    }
  }
}
