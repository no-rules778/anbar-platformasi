# Phase 7 H-1 Codex implementation audit

**Date:** 2026-09-04  
**Scope:** milestone H-1 (`T1`, `T1b`, `T2`, `T2b`, `T3`)  
**Verdict:** CHANGES REQUIRED before H-2

Independent checks passed: **1350 tests / 78 files**, typecheck, oxlint, build
and `git diff --check`. No live write was performed by this audit.

## Findings

### A01 — Split capability accepts an explicit false result (P1)

`fetchSplitSupported()` returns `true` whenever the RPC has no error and ignores
the returned boolean. The approved readiness contract says a failed probe **or
an explicit `false` value** must leave `splitReady=false`. If a compatible
server exposes the function but returns false, the current client would allow a
condition split and could send data the server is not ready to preserve.

Required correction: return true only for `data === true`. Add a regression
test for `{data:false,error:null}` and retain the existing returned-error and
rejected-promise tests.

### A02 — Paged `stock_conditions` read has no stable ordering (P1)

`fetchStockConditions()` uses `range()` in pages of 1000 without an `order()`.
PostgREST page boundaries are not stable without a deterministic order, so a
large table can skip or duplicate condition rows. On this write screen that can
produce a wrong condition split even though every request succeeds.

Required correction: order every page by the row's stable key (warehouse then
item code, matching the captured schema/contract), and add a test that asserts
both order clauses precede `range()`. Keep the partial-page failure behaviour.

### A03 — 56 rows were promoted beyond the implemented milestone (P2)

H-1 deliberately contains no store, form, page, dialogs, navigation or posting
orchestration, but several rows whose contracts require those layers are marked
`CODE VERIFIED`. Examples include `M7-10`, `M7-31`, `M7-51`–`M7-56`, `M7-74`,
`M7-101`–`M7-103`, and `M7-S1`, `M7-S5`, `M7-S6`. Their helpers or API wrappers
exist, but their user-visible/handler contracts do not yet exist. This conflicts
with the registry definition of `CODE VERIFIED`.

Required correction: audit all 56 promoted rows. Keep `CODE VERIFIED (H-1)`
only where the full row is implemented by the completed pure/API scope. Mark a
row whose future store/UI portion is still missing `IN PROGRESS (H-1 helper/API
verified; completion in H-2/H-3/H-4 as applicable)`. Update the H-1 count and
handoff truthfully; do not demote genuinely complete pure/API rows.

## Verified positives

- The load matrix makes all five core reads fatal and retains a good snapshot
  after a failed refresh while blocking posting.
- Partial-page failures are represented as failures rather than committed
  truncated results.
- `stock_conditions` is correctly core for this write surface.
- The D-H1 warehouse narrowing is additive and leaves the older helper intact.
- All five RPC transports consult the localhost mutation guard.
- `M6-40` has recorded evidence; `M7-123` correctly remains open because read
  10 cannot be measured while layers are unavailable in the test project.

No Phase 7 UI or live-write verification is authorized until these findings
are remediated and re-audited.

## Re-audit

**Status:** H-1 CODE APPROVED; H-2 may begin.

`A01` and `A02` are fixed and regression-tested. `A03` is fixed with 31 fully
`CODE VERIFIED` pure/API rows and 25 `IN PROGRESS` rows whose store/UI halves
remain for later milestones. Codex corrected two residual status omissions
(`M7-52`, `M7-S4`) without changing application code. `M7-123` remains open.
