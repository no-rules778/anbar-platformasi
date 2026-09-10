# Phase 9 T3 — «Anbar qalıqları» page, store, API and export integration

Date: 2026-09-10
Scope: the Module J rows targeting `pages/BalancesPage.tsx`,
`store/balances.store.ts`, `api/balancesSnapshot.api.ts`,
`api/setStockCondition.api.ts`, `components/balances/ConditionCell.tsx`,
`lib/balanceExport.ts`, `lib/xls.ts`, `hooks/useRealtimeRefresh.ts`,
`App.tsx` and the reuse rows (rows examined, not a status claim — the exact
set is the ledger banner)
Verdict: **seventy-five rows promoted on unit/page evidence — seventy-two
rows now `CODE VERIFIED` (M9-71 closed among them), four rows `IN PROGRESS`**
(M9-92, M9-99, M9-100, M9-108: client half verified, server/live leg open).
The resulting ledger tally is stated once, in the ledger banner, and was
derived mechanically by `tools/ledger-check.mjs`. Phase 9 remains
**NOT ACCEPTED**.

## Provenance — code that existed but was unverified

Between 17:26 and 17:38 on 2026-09-10 a separate session wrote the whole T3
surface — `balanceExport.ts`, `xls.ts` (M9-117/M9-119), `balancesSnapshot.api.ts`,
`setStockCondition.api.ts`, `balances.store.ts`, `ConditionCell.tsx`,
`BalancesPage.tsx` (569 lines), their unit tests, the M9-141b invariant tests
in `operationalMovements.test.ts`, the `useRealtimeRefresh` tests and the
`cond.set` guard action in `mutationGuard.ts` — and stopped on a red suite,
without an audit, ledger promotion, route or page tests.

That code was **preserved and audited**, not discarded or reimplemented
(owner instruction). Every row below was checked against the exact legacy
lines it cites and against the owner-approved decisions
(`decisions/2026-09-10-phase9-design-package.md`: Q1 in-phase, D-J1 … D-J4).
No new Q1 decision was requested.

## What was absent and is now added

| Gap | Fix | Evidence |
|---|---|---|
| `bal` route not wired — the page was unreachable | `App.tsx`: import, `'bal'` in the page union, rail entry THIRD in «Əməliyyat» after «Mal hərəkəti», ungated, mounted with the two card handoffs; two stale «not migrated» comments corrected | `App.test.tsx` «Anbar qalıqları rail entry» (8 tests), `App.nav.test.ts` (6) |
| No page tests | `pages/BalancesPage.test.tsx` — 56 tests | this audit |
| M9-134b cross-key regression absent | page test: while `unfit` is edited a realtime refresh sets `repair = 5` on the same warehouse × item; the single commit carries `repair: 5`, and the test fails if the pre-edit baseline `0` is resent | «a realtime change to ANOTHER key during the edit is carried by the commit» |

## Demonstrated defects fixed

1. **`xlsFallback.test.ts` — harness defect (§8), 3 failing tests.** The
   implementation writes the UTF-8 BOM exactly as legacy `csv()` does
   (`index.html:1204`); proven at byte level (`blob.size` 6 = 3 BOM bytes + 3,
   first bytes `EF BB BF`). The test observed through `Blob.text()`, whose
   TextDecoder default `ignoreBOM:false` consumes the BOM, so a correct
   implementation failed. The helper now decodes `arrayBuffer()` with
   `ignoreBOM:true`. Test-only change.
2. **`ConditionCell.tsx:73` — `react/set-state-in-effect` lint warning.** The
   "lost edit rights closes the editor" rule ran in an effect, painting the
   editor once for a user who may no longer edit. It now adjusts state during
   render (React's documented pattern). Behaviour covered by the existing
   «losing edit rights under a refresh closes the editor without committing»
   test; `oxlint src` is clean again.

## Contract-by-contract findings

- **M9-50 «resets paging».** Legacy writes `BF.page = 0` at 2219-2235 and
  never reads `BF.page` anywhere; the screen pages through `cut()`/`SHOW_ALL`
  (2346, 2367). The clause describes dead code; the paging model is the sticky
  soft cap (M9-56/M9-57), both proved. Promoted with that note in the cell.
- **M9-71 closed.** The store derives `indexes.operational` through the shared
  `buildItemIndexes()` → `excludeCancelled()` (store test), and the page feeds
  it to `buildInitialBalanceRows()`. Page test: a cancelled opening document
  (`SND-OLD` + «Ləğv: SND-OLD») reconstructs no row.
- **M9-81 «—» placeholder is reachable**, not defensive: when the opening
  lots are fully consumed the row is created at legacy 2005 without a source
  warehouse and 2043 finds no surviving lot. Fixture: opening 7 then out 7.
  A separate test proves the table prints `opening_warehouse` RAW
  («Xocahəsən») while the export aliases it («Xocəsən», M9-113).
- **M9-41 markers display-only.** Same history with and without condition
  rows: identical q, val, all five KPIs and the export balance columns, while
  the marker columns differ (positive control).
- **M9-106.** Client half — every call is the RPC, no direct write (api
  test); metadata half — the captured ACL `authenticated=rDxtm/postgres`
  (no `a`/`w`/`d`) and the single SELECT policy (proposal §3.1, T0A capture).
- **M9-146.** The snapshot issues exactly four reads and nothing else (no
  `stock_layers`); no deactivation or cutover was performed.
- **`onEditItem` handoff.** «Malı redaktə et» from the card opens that card on
  the Nomenklatura screen (`openCard`) and switches the rail, because the item
  form lives there (legacy `editItem()`, 1888). No ledger row governs this;
  it is a navigation convenience, not a parity claim.

## Rows kept `IN PROGRESS` and why (§6, §7)

| Row | Verified half | Open half |
|---|---|---|
| M9-92 | UI gate (`canEditCond`, page role tests) | binding server refusal — Q4/T10 live |
| M9-99 | PGRST202 six-argument retry (api test) | T0B signature verification |
| M9-100 | no retry for `icare`, exact message, sync failed (api + page) | executable live probe — T10 |
| M9-108 | client shows server text verbatim behind «Xəta: » (api + page) | the nine refusal texts — live RPC body (Q4) |
| M9-19 | unchanged | T0B |

## Rows NOT promoted

M9-109 (server-written audit row, Q4), M9-120 / M9-121 («Çap», outside
acceptance by Q2), M9-141 (claim withdrawn), M9-142 (V-01 deferred),
M9-145 (`rAnb`/`dead`, out of scope).

## Verification

| Check | Result |
|---|---|
| `BalancesPage.test.tsx` | **56 passed** |
| focused Phase 9 set (16 files: lib, api, store, component, hook, page, App, mutationGuard) | **454 passed** |
| full suite | **139 files / 3088 tests passed** (was 138 / 3017 with 3 failed before this session) |
| `tsc -b --noEmit` | exit 0 |
| `oxlint src` | exit 0 (was 1 warning) |
| `vite build --mode sandbox` | built, exit 0 |
| `git diff --check` | exit 0 |
| staged files | **0** |
| dirty tree | preserved (244 entries; the other session's files intact) |
| ledger checker `tools/ledger-check.mjs` | `--self-test` 27/27; real run **PASS** — 124 rows, tally table equal to derived totals, 26 numeric claims across ledger / registry / next-prompt compared, every asserted range expanded |

## Boundary

No Supabase call, browser, RPC, login or password; production
`bbjmhaerssakbreykxiw` never addressed; no TEST mutation, fixture, layer
deactivation, cutover, stage, commit, push, deploy or I-10 row. Application
source changed only in `App.tsx` (route) and `ConditionCell.tsx` (lint fix);
the other session's implementation files were not modified.

Phase 9 remains `NOT ACCEPTED`; only Codex's independent audit can change that.
