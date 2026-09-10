# Phase 7 Codex design audit — Yeni əməliyyat

**Date:** 2026-09-04  
**Scope:** proposal, implementation plan and draft parity rows only  
**Verdict:** CHANGES REQUIRED before user approval or implementation

No application code, database, SQL/RPC, production data, GitHub or Vercel was
changed by this audit.

## What is sound

- The proposal treats `Yeni əməliyyat` as a complete legacy screen and records
  all operation types, draft lines, bulk selection, condition splits, stock
  layers, correction mode, posting routes, roles and the `M5-55` transition.
- Production writes are forbidden and future mutations are limited to the
  isolated test project.
- The captured RPC signatures and the two discovered client/server
  divergences are recorded rather than silently rewritten.
- All draft registry rows remain `NOT STARTED`; no implementation status was
  claimed.

## Findings

### A01 — The proposed 7a/7b seam is not independently safe (P1)

Q1 describes 7a as a complete, live-verifiable unit containing posting while
placing stock layers in 7b. When `stock_layers_supported().active === true`,
the legacy screen routes outbound and transfer posting through the layer-aware
selection and RPC paths. A 7a without those paths cannot safely claim complete
posting parity or a general live-write pass.

Required correction: keep Module H as one acceptance boundary. It may be
implemented across short internal milestones/new chats for token control, but
do not call 7a complete or live verified. Either defer every live write until
all of Module H exists, or define 7a explicitly as code-only foundation with
no phase acceptance and no general posting claim.

### A02 — Fatal versus optional reads are contradictory (P1)

Plan T4 says `load()` is atomic across items, movements, warehouses, partners,
reference values, stock conditions and capability probes. Elsewhere the same
design correctly says a failed stock-layer probe leaves the old flow working,
a failed split probe produces a safety block only when a split is needed, and
reference values have established fallbacks. The legacy loader also treats
stock conditions and both capability probes as optional/non-fatal.

Required correction: define the load matrix explicitly. Core inputs whose
absence could allow an incorrect stock write must be fatal. Optional
capabilities and established fallbacks must have explicit degraded states and
must not contradict the page-level load gate. Add tests for each failed read,
including proof that no unsafe post becomes possible.

### A03 — «Yeni mal yarat» has no complete transition contract (P2)

`M7-21` checks only the empty-result text and whether the link is visible. The
legacy click calls `editItem(null, inp.value)`: it opens the create-item dialog
and passes the current search text as the preset name. The plan does not assign
that click behaviour, reuse of `ItemFormDialog`, post-save reload, or the
expected return state to any task/test.

Required correction: add a dedicated parity row and implementation task for
the full click transition, including permission enforcement, preset name,
successful create/reload behaviour, refusal preservation, and the localhost
write guard. Do not duplicate the Phase 5 item-creation implementation.

### A04 — Payload-measurement scope disagrees across artifacts (P2 docs)

Plan T1 measures items, movements, stock conditions, partners, warehouses and
reference values. Draft row `M7-123` names only items, movements, stock
conditions and partners, while `M6-40` remains an underspecified carried debt.
This permits a partial measurement to be marked complete.

Required correction: give `M6-40` its exact Phase 6 query set and give
`M7-123` the exact incremental/full Phase 7 query set. Record row count,
transferred bytes and measurement method for every named read; keep both rows
open until their own scopes are satisfied.

## Decision guidance after remediation

- Q1: one Module H acceptance boundary, implemented in short milestones; no
  live-write acceptance until the complete screen exists.
- Q2: implement all layer paths now; live verify them only if the isolated test
  project exposes an active layer mode.
- Q3: prefer narrowing the anbardar picker to the live server contract, but
  only as an explicit user-approved deviation. Offering choices that the
  server will always refuse is not useful behaviour.
- Q4: port the client restriction now and prepare a read-only preflight plus a
  separate proposed server migration. Do not apply SQL in Phase 7.
- Q5: use the explicit in-flight lock; do not invent a recent-document guess.
- Q6: implement the edit-mode contract now and expose it for Phase 8 without
  adding a reduced movements screen.
- Q7: accept the `M7-` prefix.

## Re-audit after revision 2

**Status:** APPROVED FOR IMPLEMENTATION as one Module H acceptance boundary.

Revision 2 resolves `A01` through `A04`: it removes the unsafe 7a/7b
acceptance seam, defines fatal and degraded read behaviour, specifies the full
«Yeni mal yarat» transition through the existing Phase 5 dialog, and gives
`M6-40`/`M7-123` exact independent measurement scopes.

Codex corrected three non-behavioural documentation slips during re-audit:
`T1b` is now assigned to milestone H-1, the two wrong-write corrections point
to `M7-S2`/`M7-S3`, and the item-create range ends at `M7-21e`. No application
code, database, SQL/RPC, production data, GitHub or Vercel was changed.
