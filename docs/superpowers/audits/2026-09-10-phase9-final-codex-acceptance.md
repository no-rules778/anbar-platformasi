# Phase 9 — final independent Codex acceptance

Date: 2026-09-10  
Environment boundary: TEST `alkjjbaawmsirsfvqljm` only  
Verdict: **ACCEPTED**

## Basis

Codex independently reviewed the Phase 9 implementation, authoritative
124-row ledger, parity registry, T3 audit, T10 audit and correction history.
The earlier review rejected the original M9-83 test because it asserted the
absence of `.neg` on a positive row. The replacement evidence now demonstrates
why a negative opening row is filtered from the supported views and scopes the
remaining class-expression evidence honestly as source-level only.

Codex also rejected the original description of the T10 cleanup as exact
net-zero. The corrected record shows that the six-argument probe deleted and
the next full call recreated the TEST `stock_conditions` row. Its four
quantities and note match the baseline, while `created_at` and `updated_by` do
not. The owner explicitly accepted that TEST-only identity-metadata residual
and prohibited direct repair or deletion of audit history.

The owner also accepted T0B, the unreadable M9-109 server audit rows and the
unavailable M9-108 identity/state legs as named external evidence boundaries.
They remain unpromoted in the ledger and are not represented as live proof.

## Independent verification

Codex reran the final working tree checks:

- `BalancesPage.test.tsx`: 57/57 passed;
- full suite: 139 files / 3089 tests passed;
- TypeScript typecheck and oxlint passed;
- sandbox production build passed (210 modules; existing large-chunk advisory);
- ledger checker self-test: 27/27; real ledger: 124 unique rows, no duplicate or
  unclassified row, with 108 `CODE VERIFIED`, 6 `LIVE VERIFIED`, 6
  `NOT STARTED`, 4 `IN PROGRESS`, and 0 `BLOCKED`;
- `git diff --check` reported no whitespace errors and the staged diff was empty.

The cumulative evidence covers the Phase 9 balance page, current/opening
computations, filtering, sorting, KPIs, export, realtime behaviour, inline
condition editing, server-side warehouse binding, representative refusal
paths, and the `exceeds_balance` branch. Persisted TEST, browser-interception,
unit/source and captured-metadata evidence remain explicitly separated.

## Safety and residuals

Production `bbjmhaerssakbreykxiw` was not contacted. The accepted scope does
not authorise deployment or production writes. The dirty working tree remains
preserved and nothing is staged. No direct-table repair, layer deactivation,
cutover, commit, push, deploy, or repetition of the hazardous six-argument
probe was performed by this audit. `Çap` remains outside acceptance under the
existing product decision.

## Result

Module J / Phase 9 is **ACCEPTED** for the owner-approved TEST scope. The open
ledger statuses are retained as documented scope/evidence limits; acceptance
does not turn them into executed contracts.

