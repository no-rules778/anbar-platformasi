# Phase 18 owner decision — shell / read-only acceptance scope

Date: 2026-09-12 · Decision: **ACCEPTED**

The owner accepts Phase 18 in its implemented shell / read-only scope, following
the [final independent Codex audit](../audits/2026-09-12-phase18-final-codex-audit.md).

## Decisions applied

**D-P1 — ACCEPTED.** No duplicate «Kontragentlər» rail page is created. The
already-migrated `knt` report remains the single migrated surface for that
module's content (ledger M18-51). This resolves M18-52 and M18-53 as settled
decisions rather than open questions.

Consequence applied in code: `c-knt` is no longer fetched at boot. With the rail
entry permanently declined, a partners count has no consumer, and issuing a
request whose result nothing can ever display is waste, not parity. `NavCounts`
now carries `items` and `warehouses` only.

**D-P4 — ACCEPTED.** `c-mov`, `c-bal` and `c-ctrl` are intentionally omitted.
They are derived badges requiring the full movement/balance dataset and the
client rules Phases 8, 9 and 15 migrated into the pages themselves; computing
them at sign-in would reintroduce the whole-platform boot load the migration
removed. M18-15 becomes a settled omission, not a blocked contract.

**D-P3 — PARTIALLY COMPLETE.** Codex's TEST admin/anbardar read-only responsive
rehearsal is complete and its evidence is preserved verbatim in the audit and in
the promoted rows. It promoted exactly M18-01, M18-02, M18-30, M18-31 and
M18-34. The remaining rehber, realtime, server-enforcement, export,
cross-module and stale-session contracts move to the
[authority verification package](../plans/2026-09-12-phase18-authority-verification-package.md).

**D-P2 — DEFERRED.** The legacy platform is not retired and nothing is deployed.
Cutover, retirement date, rollback readiness and production deployment move to
the [cutover package](../plans/2026-09-12-phase18-cutover-package.md), each
requiring explicit owner approval.

## What this decision does and does not do

This is a **scope decision, not fabricated evidence.** The ten transferred rows
retain `BLOCKED` as their package statuses. None becomes `CODE VERIFIED` or
`LIVE VERIFIED` because the phase is accepted. Their contracts, risks and
evidence ceilings are unchanged.

Three rows changed status because the owner **settled the question** they were
blocked on, not because new evidence appeared:

| Row | Was | Now | Basis |
|---|---|---|---|
| M18-15 | BLOCKED on D-P4 | ACCEPTED | D-P4 settled: intentional omission |
| M18-52 | BLOCKED on D-P1 | ACCEPTED | D-P1 settled: no rail entry, by decision |
| M18-53 | BLOCKED on D-P1 | ACCEPTED | D-P1 settled: the page it depended on is declined |

`ACCEPTED` here means "the owner has decided this contract's disposition", which
is distinct from `CODE VERIFIED` (proved offline) and `LIVE VERIFIED` (proved
against TEST). No evidence claim is implied by it.

## Authority granted

None beyond acceptance of the implemented scope. This decision authorises no
mutation, fixture, import, deletion, export, egress, catalog access, deployment,
legacy retirement or production contact. Each transferred contract still
requires its own explicit authority at execution time.
