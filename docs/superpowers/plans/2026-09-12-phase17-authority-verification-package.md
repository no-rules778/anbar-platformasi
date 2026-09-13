# Phase 17 authority verification package

Date: 2026-09-12 · Status: **DEFERRED / NOT AUTHORISED FOR EXECUTION**

This package owns the 17 contracts transferred by the Phase 17 owner decision.
They no longer block acceptance of the implemented read/pure migration, but
remain unverified until separately authorised and executed.

| Group | Rows | Required authority/evidence |
|---|---|---|
| Catalog and function facts | M17-17…M17-19 | Authorised catalog access or a new trusted schema/function capture; UI evidence is insufficient. |
| Role/server matrix | M17-20…M17-21 | Appropriate TEST identities; direct allowed/refused server calls with no inferred policy claims. |
| Exact read set | M17-28 | Authenticated TEST browser interception recording the four `azp_*` reads and absence of ANBAR reads/RPCs. |
| Write family | M17-80, M17-82…M17-87 | Explicit approval for permanent TEST audit/sequence/movement residuals and a contained TEST-only write window. |
| Hard delete | M17-81 | Separate action-time approval because `azp_delete_card` permanently deletes a card. |
| Import | M17-88…M17-89 | Explicit import approval and acceptance of non-atomic orphan-card residual risk. |
| Full export | M17-100 | Explicit approval for bulk egress of all cards and non-cancelled movements of one TEST module. |

## Mandatory safety boundary

- TEST `alkjjbaawmsirsfvqljm` only; production `bbjmhaerssakbreykxiw` must be
  hard-aborted.
- Credentials remain process-only and are never written into repository files,
  logs or reports.
- Measure and report permanent residuals before and after every authorised
  mutation window; never claim database net-zero where sequence/audit/history
  remains.
- Do not combine catalog authority, destructive deletion, import and bulk
  egress under one vague approval.
- Promote only the exact row whose own falsifiable contract was exercised.

Until those approvals are supplied, this document is a backlog boundary, not
an instruction to execute the scenarios.

