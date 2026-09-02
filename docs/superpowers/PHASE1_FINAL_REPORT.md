# ANBAR React Migration — Phase 1 Final Report

Date: 2026-09-02 · Branch: `react-migration` · Head at report time: `eafb298`

Governed by [`ANBAR_REACT_MIGRATION_PRINCIPLES.md`](ANBAR_REACT_MIGRATION_PRINCIPLES.md).
Per-function detail lives in [`ANBAR_FUNCTIONAL_PARITY_REGISTRY.md`](ANBAR_FUNCTIONAL_PARITY_REGISTRY.md).

This report records what actually happened. The original
[design](specs/2026-09-01-react-migration-phase1-design.md),
[plan](plans/2026-09-01-react-migration-phase1.md) and
[ledger](../../.superpowers/sdd/2026-09-01-react-migration-phase1/progress.md)
are preserved unchanged as the historical record; none of them was rewritten
to claim that a manual step already happened.

## 1. Scope completed

Two areas of the production platform were rebuilt in React:

**Authentication and session** — sign-in (with e-mail trimming, remember-me
restoration and saved-e-mail prefill), session persistence that switches
between `localStorage` and `sessionStorage`, session restore on load without
showing an interactive login form, profile fetch with inactive-account
rejection, the role model including legacy-role collapsing, device
registration with the server-side limit, the device-limit dialog, the 60-second
heartbeat with forced sign-out when a session is closed elsewhere, releasing
this device when the tab closes, the «Sessiya» window (identity, role, scope,
permissions, remember state, active devices, closing one or all other
devices), password change with every original validation, and logout.

**Warehouses directory** (`Soraqçalar`, `kind='warehouse'`) — Admin-only
access, the warehouse list, the usage counter with the original's cancellation
semantics and fail-safe behaviour, create, rename (only while unused), the
name lock once in use, hide/reactivate, delete behind a two-step confirmation,
server error surfacing, the rename cascade notice, the list controls (row
numbers, search, status filter, page size, paging), Realtime refresh and the
sync indicator.

**Out of scope, unchanged:** every other module — dashboard, movements, stock
balances and layers, items and nomenclature, group operations, documents and
cancellation, Excel import/export, reports, finance, Azpetrol/Araz, audit log,
users administration, and the remaining reference kinds.

## 2. Old implementation references

All line numbers refer to `origin/main:index.html`.

| Area | Old reference |
|---|---|
| Supabase client + session storage | 756-790 |
| Auth helpers | 791-820 |
| Role model, permissions, denial message | 608-643 |
| Warehouse scoping | 707-723 |
| Full-table fetch pattern | 848-861 |
| Cancellation model | 1249-1270 |
| Realtime subscription + sync indicator | 1163-1188 |
| Access refusal for non-Admin | 1496, 3009, 7505 |
| Reference directory list + controls | 3008-3074 |
| Create/edit dialog, name lock | 3077-3122 |
| Delete/hide confirmation | 3125-3150 |
| `manage_reference` call | 3152-3183 |
| Usage counting | 2970-2988 |
| Device id/label, registration, heartbeat | 7285-7359 |
| `pagehide` release | 7380-7393 |
| Password change | 7398-7420 |
| Session window + device list | 7422-7478 |
| Device-limit dialog | 7481-7492 |
| `enterApp` bootstrap | 7494-7525 |
| Login handler + session restore | 7557-7595 |

## 3. React implementation references

```
web/src/
├── api/            supabase.ts · auth.api.ts · session.api.ts
│                   warehouses.api.ts · referenceDirectory.api.ts
├── lib/            roles.ts · warehouseScope.ts · refEq.ts
│                   operationalMovements.ts · sessionDevices.ts · utils.ts
├── store/          auth.store.ts · warehouses.store.ts · toast.store.ts · sync.store.ts
├── hooks/          useHeartbeat.ts · useReleaseDeviceOnUnload.ts · useRealtimeRefresh.ts
├── components/     SessionDialog.tsx · PasswordChangeDialog.tsx · SessionLimitDialog.tsx
│                   SyncIndicator.tsx · ui/* · warehouses/WarehouseFormDialog.tsx
├── pages/          LoginPage.tsx · WarehousesPage.tsx
└── types/          database.ts   (generated from the live schema)
```

## 4. Automated verification

At `bc09b18`, all run independently for this report:

| Check | Result |
|---|---|
| `npm test` | **188 passed**, 19 files |
| `npm run typecheck` (`tsc -b --noEmit`, strict) | clean |
| `npm run lint` (oxlint) | clean |
| `npm run build` | succeeds |
| `git diff --check` | clean |

Test growth over the audit and its corrections: 58 → 143 → 188.

Coverage highlights: the cancellation port (11), name matching incl. wildcard
and whitespace cases (16), the device contract (13), session dialog (15),
password dialog (10), warehouses page incl. Admin gate, list controls,
realtime and sync transitions (24), app boot/logout/beacon (12).

## 5. Explicitly approved deviations

Full list in the registry (D-01 … D-10). Summary:

- Pure logic extracted to `src/lib/`; toast as a store; permission check split
  from its side effect (behaviour and message text unchanged).
- `components/ui/` are hand-written Tailwind primitives rather than shadcn/ui —
  the user ruled exact shadcn use desirable but not above behaviour.
- No `router/` yet; a single screen is rendered directly (Phase 2 resolves it).
- Logout resets the store instead of reloading the page.
- The access token is kept fresh via `onAuthStateChange` instead of a one-shot
  capture, which avoids reproducing `BUG_REGISTRY` C-12.
- Usage counting reads the `movements` table (paginated) rather than issuing
  per-name SQL counts, in order to reproduce `REF_EQ` exactly.
- Two scoped exceptions to Supabase-access isolation remain open: the auth
  subscription in `App.tsx` (D-09) and the Realtime client in
  `useRealtimeRefresh` (D-10). Both are documented with reason, tests and a
  pending-cleanup status; cleanup is gated on regression tests first.

## 6. Unresolved risks

From the registry (R-01 … R-07): usage counting cost grows with the
`movements` table; `useHeartbeat`, deactivate/activate and the cascade notice
still lack automated tests; the server-side refusals inside `manage_reference`
(zero balance, active anbardar, name collision) have never been exercised from
React; `ANBAR_SHARED/docs/DB_SCHEMA.md` and `RLS_POLICIES.md` remain stale and
contradict the live database; the React code depends on the live C-15 fix
staying in place; the repository-root `index.html` carries the user's own
uncommitted edit that must never be swept into a migration commit; and the two
isolation exceptions above.

## 7. Live / manual acceptance checklist

**Status: completed by user confirmation on 2026-09-02.** The user confirmed
that all listed live/manual checks passed without errors. The three checks
performed by Codex are also included in that confirmation.

Run the app locally (`cd web && npm run dev -- --port 5174`), against the live
Supabase project, with real accounts.

| # | Check | Expected | Result |
|---|---|---|---|
| 1 | Sign in with remember-me **off**, then again with it **on** | Off: session ends with the tab. On: the box is pre-checked next time and the session survives a browser restart | ✅ PASS (user) |
| 2 | Reload the page with a stored session | «Sessiya bərpa olunur...» appears; the login form never flashes; the app opens signed in | ✅ PASS (Codex + user) |
| 3 | Occupy the device limit (second browser/device; use a 1-device role such as `rehber`/`anbardar`) | Sign-in is refused, the dialog lists the occupying devices with real names, start and last-activity times | ✅ PASS (user) |
| 4 | In «Sessiya», close **one** other device | That row disappears after the list reloads; the current device is unaffected and offers no close action | ✅ PASS (user) |
| 5 | In «Sessiya», use «Digər cihazları bağla» | All other devices disappear; this one stays signed in | ✅ PASS (user) |
| 6 | Explicit logout | Returns to the login form; the device row is released immediately (verify in the session list from another device) | ✅ PASS (user) |
| 7 | Close the tab while signed in | The slot is released without waiting for the 3-minute cutoff (verify from another device) | ✅ PASS (user) |
| 8 | Change the password, then sign in again with the new one | Wrong current password is refused with «Cari şifrə yanlışdır»; a valid change closes the dialog and the new password works | ✅ PASS (user) |
| 9 | Sign in as **Admin** | «Anbarlar» opens with the real warehouses; usage numbers match the old platform on the same data | ✅ PASS (user) |
| 10 | Sign in as **`rehber`** and as **`anbardar`** | Both see the refusal message; no warehouse rows and no usage counters are fetched (check the network tab) | ✅ PASS (user) |
| 11 | Use search, the status filter, page size and paging; check row numbers | Behaves as the old «Soraqçalar» list; filters reset to page 1 | ✅ PASS (Codex + user) |
| 12 | Open two Admin sessions in different browsers; change a warehouse in one | The other refreshes on its own and shows «Məlumatlar yeniləndi (digər istifadəçi)»; the header indicator reads «sinxron» | ✅ PASS (user) |
| 13 | Create/edit/hide/reactivate/delete a throwaway warehouse | Two-step delete; name locked once in use; server refusals surfaced verbatim | ✅ PASS (user-confirmed) |

The user explicitly confirmed completion of all checks, including the
write-path check. No additional production action was performed by Codex.

## 8. Deployment boundary

The React app remains a **parallel test platform**. It does not replace the
production platform and must not be deployed.

Current state: branch `react-migration`, local commits only, no upstream
configured — nothing has been pushed, merged, PR'd or deployed. Supabase, SQL,
the repository-root `index.html`, GitHub and Vercel are untouched by all
Phase 1 work.

Replacement of the old platform stays blocked until the parity registry is
complete for every module, every critical function is `ACCEPTED`, and the user
explicitly authorises the cutover (principles §8).

## 9. Phase 1 completion statement

Phase 1 is **code-complete, code-verified and accepted by the user**. The
manual acceptance checklist is complete. Phase 1 status is **ACCEPTED**.
