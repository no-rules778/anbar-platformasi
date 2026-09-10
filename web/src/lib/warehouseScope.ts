import type { Me } from './roles'
import { isAnbardar } from './roles'

/* Astara/Harmony share a source group; every other warehouse is its own
   group. Mirrors source_group_warehouses() in
   sql/007_role_security_migration.sql. */
export function sourceGroupWarehouses(wh: string): string[] {
  if (wh === 'Astara' || wh === 'Harmony') return ['Astara', 'Harmony']
  return wh ? [wh] : []
}

/* Non-transfer operations (e.g. Silinmə) — an anbardar only sees their own
   assigned warehouse, not the source group. */
export function allowedWarehouses(me: Me | null, whs: string[]): string[] {
  if (isAnbardar(me) && me?.wh) return whs.filter((w) => w === me.wh)
  return whs.slice()
}

/* Transfer (Yerdəyişmə) source options — an anbardar sees every warehouse
   in their source group.

   NOTE: this is the LEGACY client rule (index.html:720-723) and it is WIDER
   than the live server contract. Phase 6 and every earlier phase depend on it
   unchanged, so it is left exactly as it is. Phase 7's transfer picker uses
   `transferSourceWarehouses()` below instead — see D-H1. */
export function sourceWarehouses(me: Me | null, whs: string[]): string[] {
  if (isAnbardar(me) && me?.wh) {
    const group = sourceGroupWarehouses(me.wh)
    return whs.filter((w) => group.includes(w))
  }
  return whs.slice()
}

/* ---------- D-H1: the live transfer contract (Phase 7, Q3) ----------

   Transcribed from the live `post_transfer_document` body
   (production-functions-2026-09-03.json), which is STRICTER than both
   `sourceWarehouses()` above and the `sql/007` file in this repository:

     IF v_role = 'anbardar' THEN
       IF v_wh IS NULL OR TRIM(v_line->>'source') <> v_wh THEN
         RAISE EXCEPTION '... yalnız öz anbarınızdan yerdəyişmə edə bilərsiniz';
       IF TRIM(v_line->>'dest') = 'Ofis' THEN
         RAISE EXCEPTION '... Ofisə yerdəyişməyə icazəniz yoxdur';

   So for an anbardar the source is their OWN warehouse only — not the
   Astara↔Harmony source group — and «Ofis» is not a valid destination. The
   function even carries a note (dated 2026-08-22) recording that the live rule
   outranks sql/007, and that `source_group_warehouses()` does not exist in the
   database at all.

   The legacy CLIENT offers both anyway, so the user can fill in a whole
   transfer that the server will always refuse. Q3 approved narrowing the
   picker to the server contract as deviation D-H1. This can never permit a
   write the server would reject — the server rule is the stricter one — it
   only removes options that always fail. Admin behaviour is untouched. */

/** The destination an anbardar may never transfer into (live server rule). */
export const ANBARDAR_FORBIDDEN_DEST = 'Ofis'

/**
 * D-H1 — transfer SOURCE options matching the live server contract.
 * An anbardar gets their own warehouse only; an admin gets everything.
 */
export function transferSourceWarehouses(me: Me | null, whs: string[]): string[] {
  if (isAnbardar(me) && me?.wh) return whs.filter((w) => w === me.wh)
  return whs.slice()
}

/**
 * D-H1 — transfer DESTINATION options matching the live server contract.
 * «Ofis» is removed for an anbardar; an admin's list is unchanged.
 */
export function transferDestWarehouses(me: Me | null, dests: string[]): string[] {
  if (isAnbardar(me)) return dests.filter((w) => w !== ANBARDAR_FORBIDDEN_DEST)
  return dests.slice()
}
