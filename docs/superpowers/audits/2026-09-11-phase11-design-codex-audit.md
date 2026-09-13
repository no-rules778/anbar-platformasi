# Phase 11 — independent Codex design audit

Date: 2026-09-11  
Scope: dashboard `rDash()` design only

## Verdict

**DESIGN PASS, pending the five explicit owner decisions D-L1…D-L5.** No
application implementation is authorised by this audit alone. Phase 11
remains **NOT STARTED / NOT ACCEPTED**.

Codex compared the proposal, 55-row authoritative ledger, TEST-only plan and
handoff with the legacy dashboard shell, `rDash()`, chart/table helpers and
`controlIssues()`. The proposed snapshot boundary, selector asymmetry, KPI
formulas, chart/table contracts, shared Phase 9/10 reuse and read-only safety
boundary are internally consistent and traceable to the legacy source.

## Correction applied

The initial M11-24 plan said a negative movement price falls back to the item
price. That was false: legacy uses `m.pr || itemPrice || 0`, and a negative
number is truthy. Codex corrected the proposal, ledger and test plan so only
falsy values such as `0`/`null` fall back, with a negative-price control that
must preserve the movement price. The correction history is retained in the
handoff. No ledger row or tally changed.

## Owner package assessment

The five recommendations are coherent and safe to accept as one package:

- D-L1: restore `dash` as the ungated default landing page;
- D-L2: keep both whole-platform exports in Phase 16;
- D-L3: port the shared `controlIssues()` calculation now and keep pills
  explicitly inert until Phase 15 wires the destination;
- D-L4: rebuild selector options from the current snapshot and reset only an
  invalid selection (documented deviation from stale legacy behaviour);
- D-L5: port the required legacy dashboard CSS now.

No recommendation silently expands a write surface. D-L3 adds the read-only
`partners` read to a new dashboard snapshot rather than changing Phase 10's
accepted three-read snapshot.

## Integrity

**HISTORY (as of this design audit; superseded the same day by the
owner-approved implementation — see the
[ledger banner](../specs/2026-09-11-phase11-registry-rows.md) and the
[implementation audit](./2026-09-11-phase11-implementation-live-check.md)
for the current tally).**
The authoritative ledger contains **55 unique rows**, all `NOT STARTED`, with
no duplicate or unclassified row. The design package remains documentation
only; no database, application, test, CSS or environment change is claimed.

Once the owner explicitly accepts D-L1…D-L5, Claude may reconcile the design
status and execute the TEST-only implementation plan. Independent Codex
acceptance is still required after implementation.

