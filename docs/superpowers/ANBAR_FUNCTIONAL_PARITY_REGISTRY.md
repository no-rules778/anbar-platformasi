# ANBAR Functional Parity Registry

Project-wide registry of every old-platform function and its React counterpart.
Governed by [`ANBAR_REACT_MIGRATION_PRINCIPLES.md`](ANBAR_REACT_MIGRATION_PRINCIPLES.md).
Phase 1 outcome and the manual acceptance checklist: [`PHASE1_FINAL_REPORT.md`](PHASE1_FINAL_REPORT.md).

- **Behavioural reference:** `origin/main:index.html` (the deployed production
  platform). Line numbers below refer to that file.
- **React implementation:** `web/` on branch `react-migration`.
- **Last updated:** 2026-09-02, at commit `8bd917e` (Phase 2).
- **Automated test suite at that commit:** 192 passing in 19 files;
  `typecheck`, `lint` (oxlint) and `build` clean.

## Statuses

| Status | Meaning |
|---|---|
| `NOT STARTED` | No React implementation. |
| `IN PROGRESS` | Started, incomplete. |
| `CODE VERIFIED` | Source-inspected against the old platform + automated tests. **Mocks only.** |
| `LIVE VERIFIED` | Verified in a real browser against the live environment, on the current code. |
| `ACCEPTED` | Both levels passed, no blocking issues. |

## ✅ Live-verification state of Phase 1 — accepted by user

On 2026-09-02 the user confirmed that the complete live/manual Phase 1
checklist in `PHASE1_FINAL_REPORT.md` passed. Phase 1 is therefore **ACCEPTED**.
The per-function rows below retain `CODE VERIFIED` as their evidence level;
the acceptance decision is the phase-level result based on the completed live
checklist.

## ⚠️ Historical live-verification note

The user did perform a live browser test (admin login, the warehouse list with
real data, and warehouse create/edit/hide/delete — reported as "anbarla pass").
**That test was run at commit `05cf22f`, before the comparative audit.**

Commits `4073ea1`, `3d7a0cd`, `68b69fe`, `8a8f99c`, `390fabe` and `958db31`
then rewrote or added: the entire usage-count query path, the Admin gate, the
two-step delete, remember-me restoration, e-mail trimming, the restore-state
screen, the session window, logout, password change, the unload beacon,
realtime refresh and every list control.

Per §6 of the principles, that earlier live pass did not carry forward across
the rewrite. The user subsequently completed the current checklist, so the
phase-level result is now **ACCEPTED**.

---


## Audit findings F1–F12 — true status

Each finding from the comparative audit, its fix commit, and where it is
verified. **Every one is `CODE VERIFIED` only** — see the live-verification
warning above.

| F | Finding | Fixed in | React location | Tests | Status |
|---|---|---|---|---|---|
| F1 | No session window: no logout, device management or password change existed | `68b69fe` | `components/SessionDialog.tsx`, `components/PasswordChangeDialog.tsx`, header in `App.tsx` | `SessionDialog.test` (15), `PasswordChangeDialog.test` (10), `App.test` | `CODE VERIFIED` |
| F2 | Tab close did not free this device's slot | `68b69fe`, hardened in `03f38e1` | `hooks/useReleaseDeviceOnUnload.ts`, `api/session.api.ts` `releaseDeviceBeacon` | `session.api.test` (6), `App.test` (2) | `CODE VERIFIED` |
| F3 | `register_session().devices` typed from assumption; device name rendered blank | `4073ea1` | `api/session.api.ts` `SessionDevice`, `components/SessionLimitDialog.tsx` | `sessionDevices.test` (13), `SessionDialog.test` | `CODE VERIFIED` — shape re-read from the live RPC |
| F4 | Warehouse screen rendered for every signed-in user | `4073ea1` | `pages/WarehousesPage.tsx` | `WarehousesPage.test` (3 roles + no-subscribe) | `CODE VERIFIED` |
| F5 | Usage query errors became `0`, so a used warehouse could look free | `4073ea1` | `api/warehouses.api.ts` `WarehouseUsage`, `WarehouseFormDialog.tsx` | `warehouses.api.test` (3), `WarehouseFormDialog.test` | `CODE VERIFIED` |
| F6 | Usage counted cancelled movements | `4073ea1`, matching fixed in `3d7a0cd` | `lib/operationalMovements.ts`, `lib/refEq.ts`, `api/warehouses.api.ts` | `operationalMovements.test` (11), `refEq.test` (16), `warehouses.api.test` | `CODE VERIFIED` — no SQL change was needed |
| F7 | No Realtime subscription | `390fabe`, corrected in `609f4ca` | `hooks/useRealtimeRefresh.ts`, `store/sync.store.ts`, `components/SyncIndicator.tsx` | `WarehousesPage.test` (realtime + sync transitions), `SyncIndicator.test` (6) | `CODE VERIFIED` |
| F8 | Login form shown while restoring a session | `4073ea1`, completed in `3d7a0cd` | `App.tsx`, `store/auth.store.ts` (boots `loading`) | `App.test` (3), `auth.store.test` | `CODE VERIFIED` |
| F9 | Remember-me checkbox not restored | `4073ea1` | `pages/LoginPage.tsx` | `LoginPage.test` (3) | `CODE VERIFIED` |
| F10 | E-mail not trimmed | `4073ea1` | `pages/LoginPage.tsx` | `LoginPage.test` (3) | `CODE VERIFIED` |
| F11 | Warehouse deleted without confirmation | `4073ea1` | `components/warehouses/WarehouseFormDialog.tsx` | `WarehouseFormDialog.test` (5) | `CODE VERIFIED` |
| F12 | List had no search, filter, paging or numbering | `390fabe` | `pages/WarehousesPage.tsx` | `WarehousesPage.test` (6) | `CODE VERIFIED` |

### Follow-up review corrections (after F1–F12)

| # | Issue | Fixed in | Tests | Status |
|---|---|---|---|---|
| P-01 | Logout sent `end_session` twice (status-dependent cleanup + explicit call) | `03f38e1` | `App.test` (4) | `CODE VERIFIED` |
| P-02 | Beacon's rejected fetch promise was unconsumed | `03f38e1` | `session.api.test` (2) | `CODE VERIFIED` |
| P-03 | Realtime announced success before the refresh finished | `609f4ca` | `WarehousesPage.test` (2) | `CODE VERIFIED` |
| P-04 | Subscription status ignored; no sync indicator | `609f4ca` | `WarehousesPage.test` (6), `SyncIndicator.test` (6) | `CODE VERIFIED` |
| P-05 | `SessionDialog`/`PasswordChangeDialog` had no direct tests | `bc09b18` | 25 new tests | `CODE VERIFIED` |

---

## Module A — Authentication & Session

Tables/RPCs: `users`, `sessions`; `register_session`, `touch_session`,
`end_session`, `end_other_sessions`, `list_my_sessions`; Supabase Auth
(`signInWithPassword`, `updateUser`, `getSession`).
RLS: `users` readable per `current_user_role()`; `sessions` has **no** write
policy — all writes go through the SECURITY DEFINER RPCs.

| # | Function | Old ref | React ref | Roles | Tests | Status |
|---|---|---|---|---|---|---|
| A-01 | Sign in with e-mail + password | 7557-7582 | `pages/LoginPage.tsx`, `api/auth.api.ts` | all | `auth.api.test`, `LoginPage.test` | `CODE VERIFIED` |
| A-02 | E-mail trimmed before validate/sign-in/save (F10) | 7558 | `pages/LoginPage.tsx:32` | all | `LoginPage.test` (3 cases) | `CODE VERIFIED` |
| A-03 | Remember-me checkbox restored from storage (F9) | 7554 | `pages/LoginPage.tsx:20` | all | `LoginPage.test` (3 cases) | `CODE VERIFIED` |
| A-04 | Session persistence: localStorage when remembered, else sessionStorage | 761-771 | `api/supabase.ts` `authStorage()` | all | `supabase.test` (8 cases) | `CODE VERIFIED` |
| A-05 | Saved e-mail prefill | 7552-7553 | `pages/LoginPage.tsx:18` | all | `LoginPage.test` | `CODE VERIFIED` |
| A-06 | Session restore on page load | 7584-7595 | `App.tsx` restore effect | all | `App.test` (3 cases) | `CODE VERIFIED` |
| A-07 | No interactive login form while restoring (F8) | 7589 | `App.tsx`, `store/auth.store.ts` (boots `loading`) | all | `App.test`, `auth.store.test` | `CODE VERIFIED` |
| A-08 | Profile fetch; reject missing profile / inactive account | 7495-7497 | `api/auth.api.ts` `fetchProfile`, `App.tsx` | all | `auth.api.test` | `CODE VERIFIED` |
| A-09 | Role mapping incl. legacy roles → read-only | 617-643 | `lib/roles.ts` `effectiveRole` | all | `roles.test` (full matrix) | `CODE VERIFIED` |
| A-10 | Permission table `can()` / denial message | 626-638 | `lib/roles.ts` | all | `roles.test` | `CODE VERIFIED` |
| A-11 | Warehouse scoping helpers (Astara↔Harmony group) | 709-723 | `lib/warehouseScope.ts` | anbardar | `warehouseScope.test` | `CODE VERIFIED` — **ported but not yet consumed by any screen** (belongs to Movements) |
| A-12 | Device registration on sign-in and on restore | 7320-7335, 7569, 7587 | `api/session.api.ts`, `App.tsx`, `LoginPage.tsx` | all | `session.api.test`, `App.test` | `CODE VERIFIED` |
| A-13 | Degrade to "allowed" if SQL 026 absent | 7329-7334 | `api/session.api.ts` `registerSession` catch | all | `session.api.test` | `CODE VERIFIED` |
| A-14 | Device-limit rejection → sign out + dialog (F3 contract) | 7481-7492, 7570-7574 | `components/SessionLimitDialog.tsx` | all | `sessionDevices.test` | `CODE VERIFIED` — RPC shape re-read from live DB |
| A-15 | Heartbeat every 60 s; forced sign-out when closed elsewhere | 7343-7359 | `hooks/useHeartbeat.ts` | all | `session.api.test` (`touchSession`) | `CODE VERIFIED` — **hook itself still has no test** (R-02) |
| A-16 | Release this device on tab close (F2) | 7380-7393 | `hooks/useReleaseDeviceOnUnload.ts`, `api/session.api.ts` `releaseDeviceBeacon` | all | `session.api.test` (4 cases), `App.test` (2) | `CODE VERIFIED` |
| A-17 | «Sessiya» window: identity, role, warehouse, permissions, remember state (F1) | 7422-7440 | `components/SessionDialog.tsx` | all | `App.test` | `CODE VERIFIED` |
| A-18 | Active-device list (`list_my_sessions`) | 7452-7478 | `components/SessionDialog.tsx` | all | `SessionDialog.test` (rows, current-device marker, missing label, degraded mode) | `CODE VERIFIED` — contract read from the live DB |
| A-19 | Close one other device / close all others | 7441-7448, 7468-7476 | `components/SessionDialog.tsx` | all | `SessionDialog.test` (close one, close others, reload, errors, busy, current device excluded) | `CODE VERIFIED` |
| A-20 | Change password with all validations (F1) | 7398-7420 | `components/PasswordChangeDialog.tsx` | all | `PasswordChangeDialog.test` (10: every validation, server rejection, success-only close, busy label) | `CODE VERIFIED` |
| A-21 | Logout: free device → forget remember → sign out, exactly one release (F1, P-01) | 7444 | `App.tsx` `logout()` | all | `App.test` (order, exactly-once, no double release on later unmount) | `CODE VERIFIED` |

## Module B — Warehouses directory (Soraqçalar, `kind='warehouse'`)

Tables/RPCs: `warehouses` (`id int`, `name`, `type`, `active`), `movements`,
`users`; `manage_reference(p_kind,p_action,p_id,p_name,p_meta)`.
RLS: `warehouses_select` = `is_admin() OR is_rehber() OR (is_anbardar() AND name <> 'Ofis')`;
no write policy — all mutations via `manage_reference` (Admin-only, SECURITY DEFINER).

| # | Function | Old ref | React ref | Roles | Tests | Status |
|---|---|---|---|---|---|---|
| B-01 | Screen is Admin-only; non-Admin loads nothing (F4) | 1496, 3009, 7505 | `pages/WarehousesPage.tsx` | admin only | `WarehousesPage.test` (3 roles) | `CODE VERIFIED` |
| B-02 | List warehouses (`type='anbar'`), paginated fetch | 848-861, 933-935 | `api/warehouses.api.ts` `fetchWarehouses` | admin | `warehouses.api.test` | `CODE VERIFIED` |
| B-03 | Usage count = operational movements (warehouse OR partner) + assigned users (F6) | 2977-2988, 1249-1270, 2970 | `api/warehouses.api.ts`, `lib/operationalMovements.ts`, `lib/refEq.ts` | admin | `operationalMovements.test` (11), `refEq.test` (16), `warehouses.api.test` | `CODE VERIFIED` |
| B-04 | Usage fail-safe: unreadable ⇒ treat as in use (F5) | 2971-2976, 3096-3100 | `api/warehouses.api.ts`, `WarehouseFormDialog.tsx` | admin | `warehouses.api.test` (3), `WarehouseFormDialog.test` | `CODE VERIFIED` |
| B-05 | Create warehouse | 3118, 3152-3183 | `WarehouseFormDialog.tsx` `send('create')` | admin | `referenceDirectory.api.test` | `CODE VERIFIED` |
| B-06 | Rename only when unused; name locked when in use | 3085, 3101-3117 | `WarehouseFormDialog.tsx` `nameLocked` | admin | `WarehouseFormDialog.test` | `CODE VERIFIED` |
| B-07 | Deactivate / activate | 3115-3120 | `WarehouseFormDialog.tsx` | admin | — | `CODE VERIFIED` — **no dedicated test** |
| B-08 | Delete only when unused, two-step confirmation (F11) | 3125-3150 | `WarehouseFormDialog.tsx` | admin | `WarehouseFormDialog.test` (5) | `CODE VERIFIED` |
| B-09 | Server error surfacing incl. duplicate-name wording | 3178-3182 | `WarehouseFormDialog.tsx` | admin | `referenceDirectory.api.test` | `CODE VERIFIED` |
| B-10 | Cascade notice after rename (`cascaded_rows`) | 3172-3177 | `WarehouseFormDialog.tsx` | admin | — | `CODE VERIFIED` — **no test** |
| B-11 | List controls: numbering, search, status filter, page size, paging (F12) | 3036-3057 | `pages/WarehousesPage.tsx` | admin | `WarehousesPage.test` (6) | `CODE VERIFIED` |
| B-12 | Realtime refresh + «Məlumatlar yeniləndi» notice, announced only after a successful reload (F7, P-03) | 1163-1181 | `hooks/useRealtimeRefresh.ts`, `store/warehouses.store.ts` `LoadResult` | admin | `WarehousesPage.test` (5) | `CODE VERIFIED` |
| B-14 | Sync indicator driven by subscription status (P-04) | 1177-1180, 1184-1188 | `store/sync.store.ts`, `components/SyncIndicator.tsx` | admin | `WarehousesPage.test` (6), `SyncIndicator.test` (6) | `CODE VERIFIED` |
| B-13 | Server-side rules relied upon but never exercised: zero-balance check before deactivate, active-anbardar check, partner/warehouse name collision | `manage_reference` body | — (server) | admin | — | `NOT STARTED` — behaviour never triggered from React |

## Server-side rules inherited, not reimplemented

Deliberate: these live in `manage_reference` and must NOT be duplicated in the
client. They are listed so a future phase does not mistake them for missing
work — but note the UI has never been observed reacting to them (B-13).

- Deactivation refused when the warehouse holds a non-zero balance.
- Deactivation refused when an active `anbardar` is assigned to it.
- Create/rename refused when the name collides with a `partners` name.
- Rename refused entirely once the warehouse is used anywhere.
- Delete refused once used; audit row written for every mutation.


## Module C — Reference directories: unified «Soraqçalar» + Partners (Phase 2)

Tables/RPCs: `warehouses`, `partners`, `movements`, `users`;
`manage_reference(p_kind,p_action,p_id,p_name,p_meta)`.
RLS (verified live 2026-09-02): `partners` has exactly one policy,
`partners_select` = `current_user_role() IS NOT NULL` — readable by any
recognised role, **no write policy**; every mutation goes through
`manage_reference` (SECURITY DEFINER, Admin-only). `partners.id` is a `uuid`,
so no C-15-style type concern.
Live shape at implementation time: 32 partners (all active), 1915 movements.

| # | Function | Old ref | React ref | Roles | Tests | Status |
|---|---|---|---|---|---|---|
| C-01 | One table for all kinds, with a kind filter | 3008-3074, 2934-2944 | `pages/ReferenceDirectoryPage.tsx`, `types/referenceDirectory.ts` | admin only | `ReferenceDirectoryPage.test` (kind filter, mixed listing) | `CODE VERIFIED` |
| C-02 | Create row: kind selector + name + «Əlavə et +» | 3021-3031, 3064-3065 | `pages/ReferenceDirectoryPage.tsx` | admin | `ReferenceDirectoryPage.test` (2) | `CODE VERIFIED` |
| C-03 | Partner list source (all partners, active and hidden) | 2958, 869-874, 880-883 | `api/partners.api.ts`, `store/referenceDirectory.store.ts` | admin | `ReferenceDirectoryPage.test` | `CODE VERIFIED` |
| C-04 | Warehouse rows keep the `type='anbar'` filter; `layihə` belongs to the `location` kind | 2962 | `store/referenceDirectory.store.ts` | admin | `ReferenceDirectoryPage.test` | `CODE VERIFIED` |
| C-05 | Usage per kind: warehouse = movements(warehouse OR partner) + users; partner = movements(partner) only | 2977-2988, 2973-2976 | `api/referenceUsage.api.ts` | admin | `referenceUsage.api.test` (10) | `CODE VERIFIED` |
| C-06 | Usage excludes cancelled movements for every kind | 1249-1270 | `api/referenceUsage.api.ts` + `lib/operationalMovements.ts` | admin | `referenceUsage.api.test` | `CODE VERIFIED` |
| C-07 | Usage fail-safe; a failed `users` read makes warehouses inexact but leaves partners exact | 2971-2976, 3096-3100 | `api/referenceUsage.api.ts` | admin | `referenceUsage.api.test` (2) | `CODE VERIFIED` |
| C-08 | Partner create/update with VÖEN, Müqavilə tarixi, Müqavilə № | 3086-3089, 3156-3159 | `components/reference-directory/ReferenceDirectoryFormDialog.tsx` | admin | `ReferenceDirectoryFormDialog.test` (4) | `CODE VERIFIED` |
| C-09 | VÖEN must be 10 digits; field capped at 10 chars | 3163, 3087 | same | admin | `ReferenceDirectoryFormDialog.test` (5) | `CODE VERIFIED` |
| C-10 | Name lock applies to warehouse/location only — a used partner stays renameable | 3085 | same | admin | `ReferenceDirectoryFormDialog.test` (2) | `CODE VERIFIED` |
| C-11 | Rename cascade notice (`cascaded_rows`) | 3172-3177 | same | admin | `ReferenceDirectoryFormDialog.test` | `CODE VERIFIED` |
| C-12 | Two-step delete, offered only for an unused value | 3125-3150 | same | admin | `ReferenceDirectoryFormDialog.test` (3) | `CODE VERIFIED` |
| C-13 | Hide / reactivate | 3115-3120 | same | admin | `ReferenceDirectoryFormDialog.test` | `CODE VERIFIED` |
| C-14 | Server refusals surfaced verbatim, incl. partner/warehouse name collision and duplicate name | 3178-3182 | same | admin | `ReferenceDirectoryFormDialog.test` (2) | `CODE VERIFIED` |
| C-15 | List controls (numbering, search, status, page size, paging) across kinds | 3036-3057 | `pages/ReferenceDirectoryPage.tsx` | admin | `ReferenceDirectoryPage.test` (6) | `CODE VERIFIED` |
| C-16 | Realtime refresh over all four source tables | 1163-1181 | `hooks/useRealtimeRefresh.ts` + page | admin | `ReferenceDirectoryPage.test` (2) | `CODE VERIFIED` |
| C-17 | Server-side partner rules never exercised from React: name collision against `warehouses`, delete blocked when used in movements | `manage_reference` body | — (server) | admin | — | `NOT STARTED` |

**Phase 2 live verification: not started.** Nothing in Module C has been run in
a real browser against live data. No row may become `LIVE VERIFIED` or
`ACCEPTED` until that happens; a production write test needs separate approval.

## Explicitly approved deviations

| ID | Deviation | Approval | Registry effect |
|---|---|---|---|
| D-01 | Pure logic extracted to `src/lib/` (roles, refEq, cancellation, device formatting) instead of inline globals; `need()`'s toast side effect split from the pure check | Structural improvement disclosed in the Phase 1 spec; user approved the spec | Behaviour identical; message text preserved verbatim |
| D-02 | Toast is a Zustand store + host component instead of a global `toast()` | Same as D-01 | Same messages, same error styling |
| D-03 | `components/ui/` are hand-written Tailwind primitives, not shadcn/ui | User: "точное использование shadcn/ui … желательно, но не важнее сохранения поведения" | Open deviation from `anbar-platform-tovsiyeler.md`; swap possible without touching pages |
| D-04 | No `router/` yet; `App.tsx` renders the single screen directly | Phase 1 had one screen | Must be resolved in Phase 2 (two kinds on one page) |
| D-05 | Logout resets the store instead of `location.reload()` | Same end state, no tab discard | Behaviour equivalent |
| D-06 | Access token kept fresh via `onAuthStateChange` instead of a one-shot capture | Avoids reproducing `BUG_REGISTRY` C-12 | Strictly safer; no user-visible change |
| D-07 | Warehouse-only page instead of the unified multi-kind «Soraqçalar» table | User then decided navigation must match the original | Phase 2 corrects this; tracked in the Phase 2 spec |
| D-08 | Usage counting loads the `movements` table (paginated) rather than issuing per-name SQL counts | Chosen to match `REF_EQ` semantics exactly; the old platform loads the same table in full on every login | Accurate, but see R-01 |
| D-09 | **Scoped exception to Supabase-isolation:** `App.tsx:77-78` calls `supabase.auth.getSession()` and `supabase.auth.onAuthStateChange()` directly | Needed so the unload beacon (A-16) has the access token synchronously; the subscription's lifetime is tied to the component, which is why it sits in `App`. Not yet moved because the task that surfaced it was documentation-only, and moving an auth subscription can change teardown timing | **Cleanup pending:** extract to an auth-session API wrapper. Prerequisite per principles §9: regression tests for token refresh and for beacon-after-refresh first. Tests today: `App.test` (beacon fires only while signed in), `session.api.test` (beacon contract) |
| D-10 | **Scoped exception to Supabase-isolation:** `hooks/useRealtimeRefresh.ts:45,54` calls `supabase.channel()` / `supabase.removeChannel()` directly | The hook owns the channel's lifecycle (subscribe on mount, remove on unmount); splitting lifecycle from subscription risks leaking a channel or removing it twice | **Cleanup pending:** extract the client calls into `api/realtime.api.ts`, keeping lifecycle in the hook. Tests today: `WarehousesPage.test` (subscribes once to the three tables, burst collapses into one refresh, channel removed on unmount) |

| D-11 | Phase 1 screens did not reproduce the production platform's visual design | **Resolved** by `d8fbd43` (user chose to re-skin rather than accept the interim look) | Closed: `web/src/index.css` now carries the production design contract ported from `origin/main:index.html` (11-211) — same `:root` tokens, topbar, rail, cards, dense tables, tags, buttons, form fields, modal, toast and login gate. Behaviour untouched |

| D-12 | Only `warehouse` and `partner` appear in the kind selector; the original lists eight kinds | Phase 2 non-goal, stated in its approved design | The other six (`location`, `channel`, `unit`, `category`, `project`, `serfiyyat_channel`) need only a row in `WIRED_KINDS` plus an entity fetcher — no structural change |
| D-13 | A partner whose stored `contract_date` is not ISO cannot be displayed by the `type=date` field. Live data (verified 2026-09-02): 15 non-empty values — **8 ISO, 7 legacy** (six `dd.MM.yyyy`, one bare `2026`). Saving such a partner clears the date, exactly as the production platform does; this build additionally **warns** the user, showing the stored value | **APPROVED — user decision 2026-09-02, option (a):** keep the original's behaviour, add the warning. Nothing changes in data or logic; the date still disappears if the admin saves, but they are told first | Pinned by regression tests in `ReferenceDirectoryFormDialog.test.tsx` (a legacy value still saves as `''`; an ISO value survives an unrelated edit; the warning appears only for unshowable values). Changing this behaviour later means revisiting D-13. **Returning the stored value unchanged is NOT viable:** the RPC casts with `::date` under `DateStyle = ISO, MDY`, so 5 rows raise `date/time field value out of range`, `2026` raises `invalid input syntax`, and `08.06.2026` silently becomes 6 August instead of 8 June — all verified by direct read-only queries. Option (c), a one-off normalisation of the 7 rows, remains available as a separate, separately-approved data task |

Checked and **not** violations: `pages/LoginPage.tsx` and
`components/SessionDialog.tsx` import only `rememberOn`/`setRemember`/
`savedEmail`/`saveEmail` from `api/supabase.ts` — browser-storage helpers, not
table, RPC, auth-subscription or Realtime client calls.

## Known risks and deferred work

| ID | Risk / deferred item | Impact |
|---|---|---|
| R-01 | Usage counting reads all `movements` rows (1915 today). Cost grows with the table | Performance only; revisit if the table grows by an order of magnitude |
| R-02 | `useHeartbeat`, deactivate/activate (B-07) and the cascade notice (B-10) still have no automated tests. A-19 and A-20 were closed by `bc09b18` | Regressions in the remaining three would not be caught |
| R-03 | Server-side refusals (B-13) never exercised from React | The UI's handling of those exact server errors is unproven |
| R-04 | `ANBAR_SHARED/docs/DB_SCHEMA.md` and `RLS_POLICIES.md` remain stale and contradict the live database | Any future phase trusting them will be misled — principles §3 |
| R-05 | `manage_reference` type mismatch (`BUG_REGISTRY` C-15) was fixed live by others during Phase 1; the React code depends on the fixed contract | If that fix were reverted, warehouse mutations break |
| R-06 | Repository-root `index.html` carries an uncommitted user edit that removes the `String(id)` conversion | Never staged by migration work; must not be swept into a React commit |
| R-07 | Two scoped exceptions to Supabase-isolation remain open (D-09 auth subscription in `App.tsx`, D-10 Realtime client in `useRealtimeRefresh`) | Architectural debt, not behavioural. Cleanup is gated on regression tests first, per principles §9 |
| R-08 | ~~React screens look nothing like the production platform~~ — **closed** by `d8fbd43`. Residual: only the classes Phase 1 renders were ported; later phases must extend `index.css` from the original rather than invent styling | Low. Side-by-side acceptance comparison is now meaningful |
| R-09 | **Accepted risk** (D-13, user decision option (a)): 7 of 15 non-empty `partners.contract_date` values are legacy non-ISO, and editing such a partner and saving still clears the date. The warning makes it visible, not impossible | Data loss on an unrelated edit; 7 rows, disclosed, warned about in the UI, and pinned by tests. Removable only by option (c) — a separate data task |
| R-10 | Module C's server-side partner rules (C-17) — the name collision against `warehouses` and the delete-when-used refusal — have never been triggered from React | The UI's handling of those exact refusals is unproven |
| R-11 | Usage now reads `movements` once per refresh for the whole table rather than per name — cheaper than Phase 1, but still a full-table read that grows with the table (see R-01) | Performance only |

## Historical live-verification checklist (completed)

| # | Item | Why it needs a live check |
|---|---|---|
| L-01 | Admin sign-in, restore on reload, logout | Rewritten after the last live pass |
| L-02 | `rehber` and `anbardar` sign-in → refusal screen, no admin queries | Role gating has **never** been tested live, with any role |
| L-03 | Warehouse list + usage numbers vs the old platform on the same data | Counting was rewritten entirely; numbers must be compared side by side |
| L-04 | Create / rename / hide / activate / delete with the two-step confirm | Delete flow changed; usage-based gating changed |
| L-05 | Session window: device list, close one device, close all others | Never existed at the time of the live pass |
| L-06 | Password change end to end | Same |
| L-07 | Device-limit dialog with a real second device (esp. a 1-device role) | Requires occupying the limit |
| L-08 | Tab-close beacon actually frees the slot | Requires observing `sessions` after closing a tab |
| L-09 | Realtime: a change by a second Admin appears automatically | Requires two browsers |
| L-10 | List controls against the real five warehouses | Cheap, but unverified |

## Modules not yet migrated — `NOT STARTED`

Dashboard; Yeni əməliyyat; Mal hərəkəti; Anbar qalıqları; stock layers and
Silinmə; nomenclature and item requests; group operations; documents,
cancellation and correction; Excel import/export and SON export; reports;
finance; Azpetrol/Araz; audit log; users administration; the remaining
reference kinds (`location`, `channel`, `unit`, `category`, `project`,
`serfiyyat_channel`).

Their absence is expected — the React app is a parallel test platform and must
not replace the production one (principles §8).

## Phase 2 entry criteria

Phase 2 (unified «Soraqçalar» + Kontragentlər,
`docs/superpowers/specs/2026-09-02-react-migration-phase2-partners-design.md`)
must add its registry rows during research, before implementation, and must
carry D-04 and D-07 to resolution.
