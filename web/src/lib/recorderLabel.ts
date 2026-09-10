/* «Qeyd edən» — the movement recorder label (Phase 8, I-2 audit correction).

   THE LEGACY MAPPING RUNS IN TWO STAGES and only the SECOND one is what the
   user ever sees. The read at index.html:943 sets an intermediate value:

     by: r.created_by || 'sistem'

   and the final pass at index.html:990 rewrites every row of it:

     m.by = !m.by || m.by === 'sistem'
       ? 'Excel idxalı'
       : (uname.get(m.by) || (ME && m.by === ME.sbId ? ME.name : 'digər istifadəçi'))

   where `uname` is the id → email map from the `get_user_directory()` RPC
   (index.html:991-994). Rendering the intermediate stage instead of the final
   one is not parity: `created_by` is a UUID column, so it puts a raw UUID on
   screen — something the original NEVER shows.

   The four branches, in the original's own order:
     1. no recorder (or the literal 'sistem' sentinel) → 'Excel idxalı'
     2. id present in the directory              → that user's email
     3. id absent from the directory, but it is the SIGNED-IN user → their name
     4. any other unknown id                     → 'digər istifadəçi'

   Branch 3 exists because `get_user_directory()` returns only ACTIVE users:
   the caller can legitimately be missing from a directory they are not in, and
   the original prefers their own known name over the anonymous fallback.

   Pure and directory-only: this NEVER fetches. The map is the one already
   warmed at boot by App.tsx for the audit screen (M4-17), reused here so the
   movements screen adds no second `get_user_directory()` call. */

/** The legacy sentinel written by the intermediate read at index.html:943. */
const SYSTEM_SENTINEL = 'sistem'

export const EXCEL_IMPORT_LABEL = 'Excel idxalı'
export const OTHER_USER_LABEL = 'digər istifadəçi'

/** Only the two fields the mapping actually reads, so tests need no full `Me`
    and the helper stays independent of the auth store's shape. */
export interface RecorderMe {
  sbId: string
  name: string
}

/**
 * index.html:990, exactly.
 *
 * @param createdBy `movements.created_by` — a UUID, or null on an Excel import.
 * @param emails    `get_user_directory()` id → email, already loaded.
 * @param me        the signed-in user, or null when not yet known.
 */
export function recorderLabel(
  createdBy: string | null | undefined,
  emails: Map<string, string>,
  me: RecorderMe | null | undefined,
): string {
  if (!createdBy || createdBy === SYSTEM_SENTINEL) return EXCEL_IMPORT_LABEL

  /* `||` not `??`, matching the original: `get_user_directory()` can return an
     empty email (userDirectory.api.ts stores `u.email || ''`), and an empty
     string must fall through rather than render as a blank cell. */
  const email = emails.get(createdBy)
  if (email) return email

  if (me && createdBy === me.sbId) return me.name

  return OTHER_USER_LABEL
}
