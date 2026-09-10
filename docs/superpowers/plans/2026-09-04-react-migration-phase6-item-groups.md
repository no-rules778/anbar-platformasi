# Phase 6 plan — Mal qrupları (Module G)

**Status: APPROVED and IMPLEMENTED 2026-09-04. Codex-audited the same day
(verdict CHANGES REQUIRED, three findings); all three remediated 2026-09-04.
`CODE VERIFIED` — awaiting the Codex re-audit. Nothing here is
`LIVE VERIFIED`.**
Companion to
[the proposal](../specs/2026-09-04-react-migration-phase6-item-groups-proposal.md),
whose §7 safety corrections govern every task below.
Behavioural reference: `origin/main:index.html` (line numbers are that file).

## Entry criteria — status at implementation

1. ✅ User approved the phase and decided Q1-Q3 (proposal §5).
2. ✅ Phase 5 print-preview inspection **deferred by the user**; it does not
   block Phase 6 and is **not** marked verified.
3. ✅ Module G rows merged into the registry with `NOT STARTED` before any
   application code (principles §10).
4. ✅ `VITE_ALLOW_LOCAL_WRITES` untouched and unset. This module has no write
   path; the guard was not modified.
5. ✅ Work on `react-migration`, no commit, no push, no PR, no Vercel, no
   change to the root `index.html`.

`M5-55` is **not** an entry criterion here — it is blocked on Yeni əməliyyat,
which this phase neither touches nor unblocks. It stays `BLOCKED`.

## Baseline

Full suite run **before** implementation: **843 tests / 54 files passing**,
matching the recorded Phase 5 figure.

## Stages

### Stage A — contract (T1-T2)

**T1 · Measure before widening.** Read-only, test environment only. Record the
actual `movements` row count and response size with and without `created_at`,
or record explicitly that the measurement could not be made — do not repeat
Phase 5's `T1` outcome of a done-marked task with no recorded counts.

**T2 · Widen the movement read.** Add `created_at` to `COLUMNS` and to
`MovementRow` in `api/itemMovements.api.ts`. Full suite before and after; no
Phase 5 consumer may change behaviour (`R-G1`).

### Stage B — pure logic (T3-T5), each test-first

**T3 · `lib/lastPurchase.ts`** — ports `laterPurchase` (727-738) and
`buildLastPurchaseMap` (739-750), with the Q1 string→timestamp correction.
Tests: date wins; equal dates → valid `created_at` wins; equal both → `id`
wins; `null` and malformed `created_at` fall through to `id`; `price <= 0`,
non-numeric and non-`Satınalma` rows excluded; cancelled rows excluded;
`items.price` never used as a fallback (`R-G2`, §7.9-7.11).

**T4 · `lib/groupFilters.ts`** — ports `grpPriceRange` (2719-2726) and
`grpRows` (2728-2757). Tests: the three validation messages verbatim;
inclusive bounds; a priceless item excluded when a bound is set and included
when neither is; AND across filters, OR within one; positive balance only with
4-decimal rounding; `allowedWarehouses` scoping for an `anbardar`; `CAT_UNSET`;
the warehouse-then-name `az` sort; the unknown-item name (§7.8, §7.12, §7.18-7.19).

**T5 · `lib/xlsGroups.ts`** — a **separate** module; `lib/xls.ts` untouched
(`R-G4`, §7.20). Tests: the six-column header; code cell `{t:'s', z:'@'}` with
a leading zero preserved; a missing price emits **no cell**; `!ref` and
`!cols`; sheet name; filename; an injected instant formatted `az-AZ` /
`Asia/Baku` (`R-G6`, §7.21).

### Stage C — state and screen (T6-T8)

**T6 · `api/itemGroupsSnapshot.api.ts`** — the typed snapshot loader required
by §7.2-7.4. Returns explicit `{ ok, error }`; **items and movements are both
fatal**; warehouses are filtered to `active && type === 'anbar'` (§7.5).
Absorbs both failure shapes (returned `{error}` and a rejected promise) — the
Phase 3a `M3-06a` lesson.

**T7 · `store/itemGroups.store.ts`** — filter state, the `code|wh` selection
set, and the sticky `SHOW_ALL['grp']` flag, all in the store so they survive
navigation (the `M4-18` lesson). `refresh()` is atomic: on failure the previous
snapshot is kept intact (§7.3). Tests: pruning against the **full filtered
result before the cut** (§7.14); reset clearing filters and selection without
touching `showAll` or the snapshot (§7.15-7.16).

**T8 · `pages/ItemGroupsPage.tsx` + export flow** — ports markup 354-361 and
`rGroups` 2758-2820 with existing `components/ui` classes; ports `grpExport`
(2822-2854). Loads on mount so direct navigation works (§7.1). Page-scoped
Realtime on `items`/`movements`/`warehouses` only (Q2). Export: revalidate,
refresh atomically, abort on either failure shape, prune with the exact dropped
count, abort only when nothing remains (§7.22).

### Stage D — wiring and verification (T9-T11)

**T9 · Nav.** One entry in the `App.tsx` switch. No router (`R-G8`).

**T10 · Automated checks.** Full suite, typecheck, oxlint, build,
`git diff --check`. Counts recorded against the 843 / 54 baseline.

**T11 · Live verification — NOT DONE.** Read-only comparison, `anbardar`
scoping, a real generated workbook opened, and the refresh-failure abort all
happen **after** Codex's audit. No row may be promoted to `LIVE VERIFIED`
before then.

## Stage E — audit remediation (2026-09-04)

The Codex audit
([`../audits/2026-09-04-phase6-codex-audit.md`](../audits/2026-09-04-phase6-codex-audit.md))
returned three P2 findings. All are fixed; per-finding evidence, including
which tests were verified to fail against the pre-fix code, is in that
document's «Remediation» section.

**T12 · A01** — a failed INITIAL load now renders an explicit
«Məlumat yüklənmədi» state instead of the false «Nəticə yoxdur … müsbət qalıq
yoxdur», and the pager no longer reports «0 sətir (müsbət qalıq)» for a
calculation that never ran. A failed REFRESH after a good snapshot is
unchanged: rows retained, error in the footer (`M6-S3`). New registry row
`M6-S17`. Five tests; three verified to fail pre-fix.

**T13 · A02** — `M6-39`, `M6-42` and `M6-S16` promoted to `CODE VERIFIED`;
they had been missed by the bulk promotion because their status cells carry
trailing qualifier text. `M6-40` stays **NOT DONE**. Nothing marked
`LIVE VERIFIED`.

**T14 · A03** — one «Bazalar» heading, entries in the original's order
(Nomenklatura, Mal qrupları, Soraqçalar), Soraqçalar still `isAdmin`-gated.
Seven **behavioural** render tests for admin and non-admin in `App.test.tsx`;
three verified to fail against the duplicated heading. `App.nav.test.ts` is
demoted to a wiring check.

**Checks after remediation: 986 tests / 61 files, typecheck, oxlint, build and
`git diff --check` — all clean** (974 / 61 at audit time).

## Acceptance

`CODE VERIFIED` when Stages A-C and T10 pass. `ACCEPTED` only after Codex's
independent audit and the user's decision (principles §11). No row reaches
`LIVE VERIFIED` except on evidence recorded in T11.

## Explicit non-goals

Anbar qalıqları, Mal hərəkəti, stock conditions, the cancellation sub-system,
the SON export, Tam ixrac, the deferred visual backlog (V-01…V-03), any
shell-wide sync refactor (Q2), any new import path or SheetJS change (§7.23),
and `M5-55`.
