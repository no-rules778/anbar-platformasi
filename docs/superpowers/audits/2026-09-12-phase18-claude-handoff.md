# Phase 18 — final Claude handoff for independent Codex review

Date: 2026-09-12 · Phase 18 status: **ACCEPTED** for the implemented shell /
read-only scope (owner decision, 2026-09-12, after the independent Codex audit)

> **CLOSED — 2026-09-12.** This handoff has served its purpose: the independent
> Codex audit is complete and found no application defect, and the owner has
> accepted Phase 18's shell / read-only scope. It is retained as the record of
> what was handed over, not as an open request.
>
> Outcomes against the six attack points in §4 below: the audit corrected two
> HARNESS defects (`window.scrollTo` errors, `act()` warnings) and recorded a
> load-sensitive parallel-run boundary, so the original "clean full suite" claim
> is corrected in the plan. It promoted five presentation rows to LIVE VERIFIED
> (M18-01, M18-02, M18-30, M18-31, M18-34) via a TEST admin/anbardar read-only
> rehearsal. It upheld M18-22's reasoned exclusion and the client/server split of
> M18-42 vs M18-43. D-P1 and D-P4 were then ACCEPTED, D-P3 partially completed
> and D-P2 deferred; the remaining 10 contracts moved, retaining BLOCKED, to the
> [authority](../plans/2026-09-12-phase18-authority-verification-package.md) and
> [cutover](../plans/2026-09-12-phase18-cutover-package.md) packages.
> Current derived tally: **24 / 5 / 3 / 0 / 0 / 10 · 42 unique**.

## 1. What to audit

| Document | Role |
|---|---|
| [Ledger](../specs/2026-09-12-phase18-registry-rows.md) | **Authoritative** for all Phase 18 figures and row statuses |
| [Proposal](../specs/2026-09-12-react-migration-phase18-whole-platform-parity-proposal.md) | Scope, the eight defects and their legacy/React evidence |
| [Plan](../plans/2026-09-12-react-migration-phase18-whole-platform-parity.md) | Safety envelope, verification strategy, gate results, untested boundaries |
| [Design handoff audit](./2026-09-12-phase18-design-handoff.md) | Pre-implementation self-review |
| [Implementation audit](./2026-09-12-phase18-implementation.md) | Post-implementation self-review, including residual concerns |

## 2. Mechanically derived tally

**CURRENT (post-audit, post-decision): 24 CODE VERIFIED · 5 LIVE VERIFIED ·
3 ACCEPTED · 0 IN PROGRESS · 0 NOT STARTED · 10 BLOCKED · 0 unclassified ·
42 unique rows · 0 duplicates.**

*HISTORY — as handed to Codex: 28 CODE VERIFIED · 0 LIVE VERIFIED · 0 IN
PROGRESS · 0 NOT STARTED · 14 BLOCKED · 42 unique. The audit's live rehearsal
promoted five rows, and the owner decisions settled three; no row was promoted
on evidence that did not exist.*

Derived by parsing the primary status token at the start of each `| M18-* |`
row's final cell. The banner, the tally table and the derived figures agree.

A correction is recorded in the ledger: the hand-written first draft said
27 / 13 / 40 and was wrong. The rows were not changed to fit either number.

## 3. What was actually exercised

**Executed:** the full offline gate — 208 test files / 4366 tests,
`tsc -b --noEmit`, `oxlint src`, `vite build --mode sandbox`,
`git diff --check`, `tools/ledger-check.mjs`, and a mechanical ledger parse.

**Not executed BY CLAUDE** — no Supabase call, dev server, browser, role leg,
realtime event, export or egress. That was true when this handoff was written.

**SUPERSEDED in part — 2026-09-12:** Codex then executed a TEST admin/anbardar
read-only responsive rehearsal, promoting five presentation rows to LIVE
VERIFIED. Its evidence is preserved verbatim in the audit and in §7 of the plan;
**do not re-run it.**

Still not executed by anyone: rehber-role evidence, server-side enforcement,
realtime delivery, export parity, cross-module reads, stale-session behaviour and
every cutover step. Those ten rows are BLOCKED in the two packages.

## 4. Specific things to attack — RESOLVED BY THE AUDIT

Retained as the record of what was flagged. Each is now dispositioned:

1. **M18-15 / D-P4** — three legacy counter badges deliberately unimplemented
   on architectural grounds. This is a judgement call, not evidence.
   → **RESOLVED: D-P4 ACCEPTED — intentionally omitted.** No boot load added.
2. **M18-52 / D-P1** — «Kontragentlər» has no rail entry and Phase 18 declines
   to decide whether it should. Is migration completeness (M18-50) provable
   while one legacy rail entry is undecided?
   → **RESOLVED: D-P1 ACCEPTED — no rail entry.** M18-52/M18-53 are settled
   dispositions and the consumerless `c-knt` fetch was removed (M18-14).
3. **M18-30 / M18-34** — the responsive rail is proved in the DOM and in CSS
   text. Nobody has rendered it. Is two-layer offline evidence enough for
   CODE VERIFIED, or does it over-reach?
   → **RESOLVED: rendered live.** Codex exercised 800×700 and 1200×800 on TEST;
   M18-30 and M18-34 are LIVE VERIFIED. Legacy was not rendered beside it, so
   M18-55 stays BLOCKED.
4. **M18-22** — `closeOverlays()` deliberately not ported. The reasoning
   distinguishes component-local state from store state; check whether any
   page holds dialog state in a store and was missed.
   → **UPHELD.** The audit found no application defect here.
5. **Test churn** — 25 existing tests edited. Verify that each was a genuine
   test/expectation defect and that no application source was bent to pass.
   → **UPHELD, and extended:** the audit found two FURTHER harness defects of
   its own (`scrollTo` errors, `act()` warnings) and fixed them, plus a
   load-sensitive parallel-run boundary. The plan's full-suite claim is
   corrected accordingly. No application defect.
6. **M18-42 vs M18-43** — confirm the client/server split is honest everywhere
   and that no rendered UI is being read as a server guarantee.
   → **UPHELD.** The audit explicitly records that the rehearsal promotes no
   request-shape, catalog, realtime, export, all-role or cutover contract.

## 5. Owner decisions — all resolved 2026-09-12

| Id | Outcome | Effect |
|---|---|---|
| D-P1 | **ACCEPTED — no rail entry** | M18-52, M18-53 → ACCEPTED; `c-knt` fetch removed (M18-14) |
| D-P2 | **DEFERRED** | M18-60…M18-63 → cutover package, retaining BLOCKED |
| D-P3 | **PARTIALLY COMPLETE** | Admin/anbardar leg promoted 5 rows; rest → authority package, retaining BLOCKED |
| D-P4 | **ACCEPTED — intentionally omitted** | M18-15 → ACCEPTED |

None was assumed. All independent work was completed before they arrived.

## 6. Boundary confirmations

- **Phase 17:** M17-17…M17-21, M17-28, M17-80…M17-89 and M17-100 were not
  executed, reopened or absorbed. They remain in the Phase 17 verification
  package.
- **Phases 1–16:** no accepted contract reopened. M18-01 executes a move
  Phase 12 explicitly deferred to Phase 18.
- **Safety:** production contacts 0; TEST mutations 0; permanent residuals 0;
  staged files 0; dirty tree preserved; no commit, push or deploy; `web/.env`
  untouched; no I-10 row.

Phase 18 is ACCEPTED for its implemented shell / read-only scope. That
acceptance is **not** authority to retire legacy, deploy, mutate TEST, or
execute any transferred contract; each of the ten requires its own explicit
authority at execution time.
