# Phase 8 — final independent Codex acceptance

Date: 2026-09-09
Environment boundary: TEST `alkjjbaawmsirsfvqljm` only
Verdict: **ACCEPTED**

## Basis

Codex independently reviewed the Phase 8 proposal, authoritative row ledger,
parity registry, implementation and audit trail. The earlier independent review
found one invalid transfer-based layer-gate attribution and several unreconciled
row notes. Claude accepted the finding, retracted the attribution, reused the
valid ordinary-document evidence, and completed/reconciled the actual M8-32,
M8-47 and M8-54 contracts. Codex then reviewed those corrections and scoped
audits against the implementation and approved one-line contracts.

The product owner explicitly approved the two remaining scope decisions:

- M8-39/M8-46 inactive-layer correction/replacement branches are outside this
  active-layer Phase 8 live-acceptance boundary;
- M8-29 layer-legacy transfer success may remain unexecuted without a new
  cutover or fabricated historical layer state.

Neither exception is recorded as live execution. The limitations remain named
in their ledger rows and decision record.

## Independent verification

Before the documentation-only reconciliation, Codex independently ran the
complete available checks: 126 test files / 2708 tests passed; TypeScript
typecheck, oxlint and the production-optimised sandbox build passed; `git
diff --check` passed and the staged diff was empty. The subsequent work changed
documentation only, so those results remain applicable. Non-fatal React
`act(...)` warnings and the existing large-chunk advisory remain recorded.

The cumulative TEST browser/server evidence covers the approved Phase 8
contracts, including role/RLS behaviour, operational filtering and totals,
exports, cancellation families and atomicity, layer routing, stale/failure
retention, realtime debounce/interleaving, submit gates, and net-zero fixture
closure. Browser-only response-harness evidence is not represented as persisted
database evidence.

## Safety state

No production action is authorised or implied by acceptance. Latest reconciled
TEST state: 125 immutable movement-history rows, baseline effective balances
restored (`Test Anbar / 0000001 = 8.00`), zero negative balances, active layer
inventory 7 + 1 at capability version 36. Localhost was returned read-only with
`VITE_ALLOW_LOCAL_WRITES=false`. Dirty worktree preserved, staged state empty;
no commit, push, deploy, cutover, layer deactivation or I-10 row.

## Result

Module I / Phase 8 is **ACCEPTED** for the owner-approved active-layer TEST
scope. `Çap` remains excluded by the earlier product decision. Historical and
inactive-layer exclusions remain documented risks, not silently claimed passes.

