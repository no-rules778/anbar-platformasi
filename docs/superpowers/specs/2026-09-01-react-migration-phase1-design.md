# ANBAR React Migration — Phase 1 Design

> **Read first, every phase:** [`docs/superpowers/ANBAR_REACT_MIGRATION_PRINCIPLES.md`](../ANBAR_REACT_MIGRATION_PRINCIPLES.md)
> and [`docs/superpowers/ANBAR_FUNCTIONAL_PARITY_REGISTRY.md`](../ANBAR_FUNCTIONAL_PARITY_REGISTRY.md).
> They are permanent project rules: behavioural parity with the production
> platform, the verification levels a feature must pass, and the deployment
> boundary. A phase adds its registry rows during research, before writing code.

Date: 2026-09-01
Branch: `react-migration`
Status: awaiting user review

## Context

`platform/index.html` (mirrored at `ANBAR_SHARED/platform/index.html`, currently
604KB / ~9800 lines) is a single-file vanilla JS + Supabase warehouse
management app, live in production at `anbar-platformasi.vercel.app`. Per
`ANBAR_SHARED/platform/anbar-platform-tovsiyeler.md`, the agreed long-term
direction is a migration to **React + TypeScript + Vite + Zustand +
shadcn/ui**, done incrementally (never a working-vs-broken split state),
module by module.

**Hard constraint from the user (verbatim intent):** all functionality,
business logic, permissions, restrictions, and data must be preserved
exactly. This phase is a technology/structure change only — not a feature
change. Nothing is deployed without the user's explicit approval, after
local verification.

## Goals (Phase 1)

1. Stand up the Vite + React + TS + Zustand + shadcn/ui skeleton inside the
   existing repo, without touching `index.html`.
2. Port the login/auth flow with 1:1 behavioral parity.
3. Port warehouse management (create / edit / deactivate / reactivate) with
   1:1 behavioral parity.
4. Establish the `api/` layer pattern and Supabase type generation, so later
   phases (partners, items, movements) follow the same recipe.

## Non-goals (explicitly deferred)

- The read-only "Anbarlar" report tab (`rAnb()`, stock/value summary) — it
  depends on movements/stock data, not just the `warehouses` table, and
  belongs with a later Reports/Movements phase.
- Any other `manage_reference` kind (location, partner, channel, unit,
  category, project) — the CRUD component is written generically enough to
  extend, but only `kind='warehouse'` gets a wired-up screen in Phase 1.
- Any deploy, merge to `main`, or Vercel cutover. Phase 1 ends at "verified
  working on `localhost`, changes committed locally on `react-migration`."

## Key finding from code research (informs this design)

There is **no dedicated warehouse CRUD screen** in the current app. Two
separate things exist today:

- A read-only "Anbarlar" report tab (out of scope, see above).
- Warehouse CRUD is one `kind` inside a generic "Soraqçalar" (Reference
  Directories) admin module shared with location/partner/channel/unit/
  category/project, all going through a single RPC: `manage_reference(p_kind,
  p_action, p_id, p_name, p_meta)` with `p_action` ∈
  `create|update|deactivate|activate|delete`. Relevant current code:
  `refOpen`/`refRemove`/`refSend` (index.html ~line 3075–3141).

Phase 1 therefore builds the generic Reference-Directory CRUD component, but
wires up and tests only the `warehouse` kind.

**Also found:** `docs/DB_SCHEMA.md` and `docs/RLS_POLICIES.md` (in
`ANBAR_SHARED/docs/`) are stale — they claim RLS/role enforcement is
client-only, but the current `index.html` code and its comments indicate
server-side enforcement now exists via RLS and RPCs (`manage_reference`,
`admin_update_user`, referencing `sql/007_role_security_migration.sql`,
`sql/011_reference_directories.sql`). **This spec does not trust those two
docs.** Before writing the API layer, the actual RLS policies and RPC
signatures must be pulled directly from the live Supabase project (read-only,
via the already-linked Supabase CLI) and used as the source of truth.

## Architecture

- **Location:** new folder `web/` at the repo root of
  `Codex_Code_chat/anbar-platformasi-github` (the git repo Vercel deploys
  `main` from). `index.html` stays at the repo root, untouched.
- **Branch:** `react-migration`, created off `main`. All work is committed
  locally on this branch. **No push, no PR, no merge, no deploy** until the
  user explicitly approves — this is a hard stop, not a default-yes.
- **Stack:** Vite, React, TypeScript (strict mode), Zustand, shadcn/ui —
  exactly as recommended in `anbar-platform-tovsiyeler.md`.
- **Folder structure inside `web/`** (trimmed to Phase 1 scope; later phases
  add sibling files following the same pattern, not a restructure):

  ```
  web/
  ├── src/
  │   ├── main.tsx
  │   ├── App.tsx
  │   ├── store/
  │   │   ├── auth.store.ts          # ME-equivalent: id, sbId, email, name, role, warehouse
  │   │   └── warehouses.store.ts
  │   ├── api/
  │   │   ├── supabase.ts            # client init, reads import.meta.env
  │   │   ├── auth.api.ts            # signIn/signOut/getUser/session, profile fetch
  │   │   └── referenceDirectory.api.ts  # manage_reference wrapper, kind-generic
  │   ├── pages/
  │   │   ├── LoginPage.tsx
  │   │   └── WarehousesPage.tsx
  │   ├── components/
  │   │   ├── ui/                    # shadcn/ui primitives (Table, Dialog, Toast, Button...)
  │   │   └── reference-directory/
  │   │       └── ReferenceDirectoryForm.tsx   # generic create/edit form, used with kind='warehouse'
  │   ├── lib/
  │   │   └── roles.ts               # effectiveRole(), ROLE_PERMS, can()/need()/isAdmin()/isAnbardar() — ported 1:1
  │   ├── types/
  │   │   └── database.ts            # `supabase gen types typescript` output
  │   └── hooks/
  │       └── useAuth.ts
  ├── .env                            # VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY (same public anon key already in index.html — not a new secret)
  ├── .env.example
  ├── .gitignore                      # must include .env
  ├── tsconfig.json                   # strict: true
  ├── vite.config.ts
  └── package.json
  ```

## Auth flow (1:1 port)

Source of truth is the current `index.html` code, ported without behavior
change:

- `api/supabase.ts` mirrors `initSB()` (index.html ~772–778) and
  `authStore()` (~759–771): pluggable localStorage-vs-sessionStorage session
  persistence depending on a "remember me" toggle.
- `api/auth.api.ts` mirrors `sbSignIn`/`sbSignOut`/`sbGetUser`/`sbSession`
  (~793–816).
- On successful sign-in, mirror `enterApp()` (~7492–7501): fetch the caller's
  row from `users` by id, check `active`, populate the `auth.store.ts`
  Zustand store with `{ id, sbId, email, name, role, warehouse }` — this
  is the direct equivalent of the current global `ME` object.
- `lib/roles.ts` ports `ROLES`, `effectiveRole()`, `ROLE_PERMS`, `can()`,
  `need()`, `isAdmin()`, `isRehber()`, `isAnbardar()` (index.html ~608–643)
  verbatim in logic: legacy roles (`techizat`/`muhasib`/`baxis`/unknown)
  still collapse to `rehber`; only `admin`/`anbardar` pass through as-is.
  This client-side table is **not** a security boundary in the current app
  (its own comments say so) and stays that way here — real enforcement is
  server-side RLS/RPC, verified separately (see Verification, below).
- Warehouse scoping (`allowedWarehouses()`, `sourceWarehouses()`,
  `sourceGroupWarehouses()`, index.html ~712–719) is ported into
  `warehouses.store.ts` selectors with identical semantics, including the
  Astara↔Harmony source-group exception.

## Warehouse CRUD (scoped generic component)

- `api/referenceDirectory.api.ts` wraps the `manage_reference` RPC exactly
  as `refSend()` does today (index.html ~3141): one function,
  `p_kind` passed as a parameter. Phase 1 calls it only with
  `p_kind: 'warehouse'`.
- `ReferenceDirectoryForm.tsx` ports `refOpen()`/`refRemove()` behavior
  (~3075–3117): name is locked/read-only once a warehouse is in use
  (`nameLocked`), and the only mutation offered on an in-use warehouse is
  deactivate/reactivate, never delete or rename — delete is only offered
  for genuinely-unused rows.
- All create/edit/deactivate entry points are gated by `isAdmin()`
  client-side (matching current behavior) — server-side, `manage_reference`
  is expected to re-validate independently (to be confirmed against the
  live RPC definition before implementation, per the stale-docs finding
  above).
- Fields: `id`, `name` (unique), `type` (`'anbar'` | `'layihə'`), `active` —
  per `DB_SCHEMA.md`'s `warehouses` table description, cross-checked against
  the live schema via `supabase db` / CLI before coding.

## Testing / verification plan

No separate staging environment exists (user's earlier explicit decision) —
this points at the same live production Supabase project
(`bbjmhaerssakbreykxiw`) that `index.html` uses today. Verification for
Phase 1:

1. **Before coding the API layer:** pull real RLS policies and the
   `manage_reference` / `admin_update_user` RPC definitions from the live
   Supabase project (read-only, via the linked Supabase CLI) — do not trust
   `DB_SCHEMA.md`/`RLS_POLICIES.md`.
2. **Static checks:** `tsc --noEmit` (strict mode) must pass clean.
3. **Local run:** `npm run dev` (Vite, a different port from the existing
   static `serve` on 5173) against the real Supabase backend.
4. **Read-path testing:** login as each of admin/rehber/anbardar (existing
   test/real accounts), confirm role-gated UI matches current app exactly,
   confirm anbardar's warehouse-scoping matches.
5. **Write-path testing (explicitly approved by the user):** create one
   clearly-labeled throwaway warehouse (e.g. `TEST_REACT_MIGRATION`),
   confirm it behaves correctly (appears in lists, editable, name locks
   once "in use" is simulated if feasible), then immediately deactivate it.
   No other write testing against real data in Phase 1.
6. Side-by-side comparison against the equivalent flow in the current
   `index.html` (via the already-running local static server on :5173) to
   confirm behavioral parity, not just "it works."

## Deploy boundary (hard stop)

Phase 1's definition of done is: code committed locally on `react-migration`,
verification steps above completed and reported with evidence. No `git
push`, no PR, no Vercel deploy, no merge to `main` — those require the
user's explicit go-ahead, per the project's standing change-control gateway
(`CLAUDE.md` §4) and the user's explicit instruction in this task.

## Open risks / follow-ups

- Stale `DB_SCHEMA.md`/`RLS_POLICIES.md` — flagged to the user; these docs
  should eventually be regenerated from the live schema (out of scope here).
- `sql/0xx_*.sql` migration files referenced in code comments
  (`sql/007_role_security_migration.sql`, `sql/011_reference_directories.sql`)
  are not present in this checked-out folder — needed to fully confirm
  server-side RPC/RLS behavior; will check `ANBAR_SHARED/sql/` and/or query
  live Supabase directly.
- Phase 2+ (partners, items, movements) are not designed here — each gets
  its own short design/confirmation cycle once Phase 1 is verified, per the
  incremental-migration strategy in `anbar-platform-tovsiyeler.md`.
