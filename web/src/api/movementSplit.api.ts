import { supabase } from './supabase'

/* `movement_split_supported()` — index.html:928-932 (SQL 031/032).

   A separate probe exists because `post_movement_document`'s SIGNATURE does not
   change with the feature: an unknown `conditions` key would be silently
   IGNORED by an older server and the document would post with the split lost,
   leaving the markers behind in the source warehouse. The flag exists to BLOCK,
   never to grant permission (the original's own comment, 925-927).

   The live production capture returns TRUE, so in production this is the normal
   state and the block is a fallback — not the everyday path. */

/**
 * Never throws. Returns true ONLY when the RPC succeeds AND answers `true`.
 *
 * Three distinct outcomes all mean "not ready", and all three must yield false:
 *   · the function does not exist        → a returned `{error}`
 *   · the call never completed           → a rejected promise
 *   · the server EXPOSES the function but answers `false`
 *
 * The third is the one that matters here (audit A01). A compatible server that
 * reports `false` is telling us it cannot preserve a split yet; treating "no
 * error" as "supported" would let the client send `conditions` that the server
 * silently drops, leaving the markers behind in the source warehouse — exactly
 * the failure this probe exists to prevent. The flag BLOCKS, it never grants
 * (index.html:925-927).
 *
 * A false result blocks only the lines that actually carry a split (see
 * `splitEligible`); lines without one post normally, so the screen keeps
 * working.
 */
export async function fetchSplitSupported(): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc('movement_split_supported')
    if (error) return false
    return data === true
  } catch {
    return false
  }
}
