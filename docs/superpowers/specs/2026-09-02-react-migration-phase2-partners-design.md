# ANBAR React Migration — Phase 2 (Partners) Design

Date: 2026-09-02
Branch: `react-migration` (continues Phase 1, not a new branch)
Status: awaiting user review

## Context

Phase 1 (`docs/superpowers/specs/2026-09-01-react-migration-phase1-design.md`, merged into this same branch) established the architecture: Vite+React+TS(strict)+Zustand+Tailwind, an `api/` layer wrapping Supabase, pure logic in `lib/`, and a working end-to-end slice (login + Warehouses CRUD) — verified both by automated tests and by the user in a live browser against production Supabase.

Phase 2 extends the same architecture to the **Partners (Kontragentlər)** module — the next-simplest module per `anbar-platform-tovsiyeler.md`'s migration strategy, and structurally the closest sibling to Warehouses: same `manage_reference` RPC, same generic Reference-Directory CRUD pattern, one more `kind`.

## Goals (revised after user decision on navigation)

The user confirmed: the original app's navigation is the reference to follow. In `index.html`, Warehouses and Partners are **not** separate pages — they are two `kind` values inside **one** unified "Soraqçalar" admin table (`rRefs()`, `REF_KINDS`), filtered by a `kind` dropdown, sharing one create-form and one row-actions column. Phase 2 therefore:

1. **Refactors** Phase 1's Warehouses-only `WarehousesPage`/`WarehouseFormDialog` into a generic, `kind`-parameterized `ReferenceDirectoryPage`/`ReferenceDirectoryFormDialog` — a behavior-preserving generalization, not a rewrite (Warehouses' exact CRUD rules keep working unchanged, just reachable through the kind filter instead of being the only content).
2. **Adds** the `partner` kind alongside `warehouse` — CRUD with 1:1 parity against `index.html`, including the VÖEN/contract fields and the reverse name-collision rule.
3. `api/referenceDirectory.api.ts` (Phase 1's `manageReference`) is reused unchanged — it was already kind-generic.

This directly matches the real app's structure and reduces, rather than increases, future divergence — the alternative (separate pages per kind) would have been the project's own invention, not a port.

## Non-goals

- Still only `warehouse` and `partner` kinds — the other five (`location`, `channel`, `unit`, `category`, `project`, `serfiyyat_channel`) stay out of scope; the component is generic enough to extend to them later without another refactor, but they are not wired up now.
- No navigation shell / other modules (Items, Movements, Reports) beyond the Soraqçalar page itself — still out of scope.

## Key facts from the live schema (verified 2026-09-02, read-only)

`partners` table: `id uuid` (default `gen_random_uuid()`, **not** integer like `warehouses.id` — no C-15-style type concern here), `name text not null`, `voen text`, `contract text`, `contract_date text`, `created_by uuid`, `created_at timestamptz`, `active boolean not null default true`.

RLS: one `SELECT` policy, `current_user_role() IS NOT NULL` — any authenticated user with a recognized role can read all partners (no per-warehouse scoping, unlike `warehouses`). Mutations go exclusively through `manage_reference` (SECURITY DEFINER, admin-only), same as Warehouses.

`manage_reference`'s `partner` branch (already read in full during Phase 1's investigation): on `create`/`update`, rejects if the name collides with an existing `warehouses.name` (case-insensitive) — the reverse of Warehouses' own collision check against `partners.name`. On `update`, cascades a name change into `movements.partner` (via `lock_reference_labels` + bulk `UPDATE`) exactly like Warehouses cascades into `movements.warehouse`/`partner`. `deactivate`/`activate` are plain flag flips (no balance-zero check, unlike Warehouses — partners don't carry a stock balance). `delete` is blocked if any `movements.partner` row matches.

Source lines to port from, in `ANBAR_SHARED/platform/index.html`:
- `refOpen`'s partner-specific fields block (VÖEN, contract date, contract number inputs) — lines 3086-3089.
- `refUsage`'s partner branch — line 2983: `normalMovements().filter(m => REF_EQ(m.p, name)).length` (single-field count, simpler than Warehouses' three-source count).
- `refSend`'s partner meta assembly — lines 3156-3159: `{ voen, contract, contract_date }`, plus the VÖEN format validation at line 3163 (`/^\d{10}$/`).

## Architecture (generalizes Phase 1's warehouse-only files)

```
web/src/
├── types/
│   └── referenceDirectory.ts      # ReferenceKind, ReferenceEntity (common shape both kinds map to)
├── api/
│   ├── warehouses.api.ts          # KEPT AS-IS (Phase 1) — fetchWarehouses/fetchWarehouseUsage still exist
│   ├── partners.api.ts            # NEW — fetchPartners, fetchPartnerUsage (mirrors warehouses.api.ts shape)
│   └── referenceDirectory.api.ts  # UNCHANGED (Phase 1) — manageReference(kind, action, id, name, meta)
├── store/
│   ├── warehouses.store.ts        # RETIRED — superseded by referenceDirectory.store.ts (see Migration note)
│   └── referenceDirectory.store.ts # NEW — holds {kind filter, rows: ReferenceEntity[], usage, loading, error}, load(kind)
├── components/reference-directory/
│   └── ReferenceDirectoryFormDialog.tsx  # NEW — generalizes WarehouseFormDialog.tsx; renders VÖEN/contract fields only when kind==='partner'
└── pages/
    └── ReferenceDirectoryPage.tsx  # NEW — generalizes WarehousesPage.tsx; adds the kind-filter dropdown from index.html's rRefs() (lines 3018-3024, 3035-3036)
```

**Common `ReferenceEntity` shape** both kinds normalize to (needed because `warehouses.id` is `number` and `partners.id` is `uuid`/`string` — the generic UI needs one consistent id type):
```ts
interface ReferenceEntity {
  id: string        // warehouse: String(numericId); partner: the uuid as-is
  name: string
  active: boolean
  kind: 'warehouse' | 'partner'
}
```

**Migration note on retiring `warehouses.store.ts`/`WarehousesPage.tsx`/`WarehouseFormDialog.tsx`:** these three Phase 1 files are deleted in Phase 2, replaced by their generic equivalents. This is safe because: (a) their only consumer is `App.tsx`, which Phase 2 updates to render `ReferenceDirectoryPage` instead; (b) `warehouses.api.ts` (the data-fetching layer, not the store/UI) is kept, since `partners.api.ts` mirrors rather than replaces it — both remain the kind-specific fetchers the generic store calls into. Deleting rather than leaving dead code matches this project's own convention of not accumulating unreferenced files.

`App.tsx` changes from unconditionally rendering `WarehousesPage` to rendering `ReferenceDirectoryPage` (no kind pre-selected — matches `RF.kind = ''` default in `index.html`, i.e. "Bütün növlər").

## Usage-count query (same disclosed limitation as Phase 1)

Mirrors Phase 1's approved simplification: a lightweight `movements.partner` existence-count query, not the full `normalMovements()` cancelled-exclusion logic. Same trade-off, already accepted by the user for Warehouses; carried forward identically here rather than re-litigated.

## Testing / verification plan

Same as Phase 1: automated unit tests for the API/store layer (mocked Supabase), `npm run typecheck`/`build` as gates, then live-browser verification by the user (create a throwaway `TEST_REACT_MIGRATION` partner, edit it, deactivate/reactivate, delete it) — the same manual step the user already performed successfully for Warehouses.

## Deploy boundary (unchanged)

Same branch (`react-migration`), same hard stop: no push/PR/merge/deploy without the user's explicit go-ahead.
