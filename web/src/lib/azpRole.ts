/* Azpetrol / Araz — the module's OWN role model (M17-11 … M17-14).

   Ported from index.html:8098-8111.

   ═══ THIS FILE CONTAINS NO PERMISSIONS. ═══

   Every function here is a BROWSER AFFORDANCE: it decides what a control
   looks like, never what the server will allow. The authority is
   `azp_user_role()` / `azp_is_admin()` / `azp_can_read()` in sql/020, which
   are SECURITY DEFINER, read `users` by `auth.uid()`, require `active = TRUE`
   and are fail-closed. RLS grants SELECT only, and sql/021 revokes every table
   privilege so there is no direct write path at all — each write RPC re-checks
   admin as its first statement.

   A caller that treats `azpCanRead()` or `azpIsAdmin()` as security has
   misread this file. Ledger rows M17-11…M17-16 are affordances; their server
   counterparts are M17-17…M17-21 and cannot be satisfied by any test here.

   WHY THIS IS NOT ANBAR's role model: ANBAR's `effectiveRole()` maps
   `muhasib` to `rehber` and treats `anbardar` as a real working role. Here
   `anbardar` is refused outright, so the module keeps its own mapping. The
   two models are independent by design (sql/020's header says so), and
   merging them would grant warehouse staff access to fuel-card accounting. */

export type AzpRole = 'admin' | 'read' | 'none'

/** The caller's identity, narrowed to the single field this reads. */
export interface AzpMe {
  role?: string | null
}

/**
 * `azpRole(me)` — index.html:8098-8104.
 *
 * admin → `admin`; anbardar → `none` (an explicit refusal, listed before the
 * read group); rehber/muhasib/techizat/baxis → `read`; everything else,
 * including a null identity or an unknown role, → `none`.
 *
 * Fail-closed: the default is refusal, never read access.
 */
export function azpRole(me: AzpMe | null | undefined): AzpRole {
  const r = me && me.role
  if (r === 'admin') return 'admin'
  if (r === 'anbardar') return 'none'
  if (r === 'rehber' || r === 'muhasib' || r === 'techizat' || r === 'baxis') return 'read'
  return 'none'
}

/** `azpCanRead(me)` — index.html:8105. True for admin and read roles. */
export function azpCanRead(me: AzpMe | null | undefined): boolean {
  return azpRole(me) !== 'none'
}

/** `azpIsAdmin(me)` — index.html:8106. True only for admin. */
export function azpIsAdmin(me: AzpMe | null | undefined): boolean {
  return azpRole(me) === 'admin'
}

/** The exact refusal toast `azpNeedAdmin()` shows (index.html:8109). */
export const AZP_ADMIN_ONLY_MESSAGE = 'Bu əməliyyat yalnız Admin üçündür'

/** The exact route refusal toast `go('azp')` shows (index.html:1503). */
export const AZP_NO_ACCESS_MESSAGE = 'Azpetrol / Araz moduluna girişiniz yoxdur'

/**
 * `azpNeedAdmin()` — index.html:8107-8111 (M17-16).
 *
 * The first statement of EVERY legacy write entry point. Returns true for an
 * admin; otherwise raises the exact refusal toast and returns false so the
 * caller aborts before doing anything.
 *
 * ═══ THIS IS NOT A PERMISSION CHECK. ═══
 *
 * It decides whether the browser bothers to ASK, never whether the server
 * agrees. Each write RPC re-checks admin as its own first statement
 * (sql/020), and sql/021 revokes direct table privileges so no client can
 * bypass them. A caller that passed this gate has proved nothing about the
 * server's answer — that is M17-17…M17-21, all BLOCKED.
 *
 * `toast` is injected rather than imported so the refusal can be observed
 * without a DOM, and so this file keeps its no-side-effect shape.
 */
export function azpNeedAdmin(
  me: AzpMe | null | undefined,
  toast: (message: string, isError?: boolean) => void,
): boolean {
  if (azpIsAdmin(me)) return true
  toast(AZP_ADMIN_ONLY_MESSAGE, true)
  return false
}

/** The three admin-only toolbar controls `azpSyncButtons()` governs. */
export type AzpSyncButtonKey = 'newcard' | 'newmov' | 'imp'

/** index.html:8232 — the exact key list, in the legacy order. */
export const AZP_ADMIN_BUTTON_KEYS: readonly AzpSyncButtonKey[] = ['newcard', 'newmov', 'imp']

/**
 * `azpSyncButtons(m)` — index.html:8231-8238 (M17-15).
 *
 * Returns the visibility each of the three admin-only controls should take.
 * Legacy sets `style.display = admin ? '' : 'none'` on EXACTLY `newcard`,
 * `newmov` and `imp`, and touches nothing else — so «İxrac» and «Hesabat»
 * stay visible for a read role. That negative half is the substance of the
 * row: hiding everything for a read role would be a different contract, and
 * would take the export away from the people whose whole access is reading.
 *
 * Returning a map rather than mutating the DOM keeps the decision testable
 * and lets the page render it declaratively.
 */
export function azpSyncButtons(
  me: AzpMe | null | undefined,
): Record<AzpSyncButtonKey, boolean> {
  const admin = azpIsAdmin(me)
  return { newcard: admin, newmov: admin, imp: admin }
}
