# Phase 12 — design reconciliation and handoff for the independent Codex audit

Date: 2026-09-11  
Verdict: **SUPERSEDED — 2026-09-11.** This was the DESIGN handoff and its
verdict held at that time. Phase 12 has since been implemented (61
`CODE VERIFIED`, 0 `LIVE VERIFIED`, 3 `IN PROGRESS`, 6 `NOT STARTED` of 70);
D-M2 remains deferred. Phase 12 is still **NOT ACCEPTED** pending Codex's
independent audit.
[Implementation audit](./2026-09-11-phase12-implementation.md)  
Environment: no Supabase contact of any kind in this session (neither TEST
nor production); documentation only.

> **CODEX CORRECTION — 2026-09-11.** The first draft contained two unsafe
> contradictions. It described the failed `item_requests` read both as a
> successful empty list and as a fatal atomic-snapshot error; the React plan
> now consistently returns `ok:false` and uses initial-error/retention
> handling. It also called withdrawal/rejection net-zero even though decided
> request and audit rows are immutable; those legs are now described only as
> item-catalogue-neutral, with all residual history acknowledged. The
> unrelated statement that Phases 8-11 were read-only was also corrected.
> A further UI/server attribution ambiguity was removed: only the browser
> helper silently returns for a missing/closed withdrawal target; the RPC
> raises, and its refusal remains separate M12-92 evidence. D-M2's affected
> row list was narrowed so structural M12-93 is not called write-blocked.
> The 70-row tally is unchanged.

## What was done

After Phase 11's final acceptance, Claude read the post-Phase-9 roadmap, the
Phase 11 final acceptance audit, ledger and design handoff (as format
references), and then the primary sources for this module only:

| Source | Read |
|---|---|
| Legacy page | `index.html:257` (rail), `346-350` (shell), `1499` (`go()` gate), `1517` (dispatch), `7506` (nav visibility), `889-903` (loader), `2464-2551` (`rNreq()` and its state), `2555-2711` (helpers and both dialogs), `641-642` (role predicates), `1409-1418` (`tbl()`, `TYPE_TAG`), `81/84-87/115-118` (CSS) |
| Server contract | `sql/017_nomenclature_requests.sql` **in full** (530 lines) |
| Existing harness | `tests/nomenclature_requests_simulation.js` — a faithful JS model of 017 with 17 sections |
| React side | `roles.ts`, `format.ts`, `mutationGuard.ts`, `itemWrite.api.ts`, `items.api.ts`, `referenceValues.api.ts`, `userDirectory.api.ts`, `warehouseOverviewSnapshot.api.ts`, `warehouseOverview.store.ts`, `nomenclature.store.ts`, `useRealtimeRefresh.ts`, `ItemFormDialog.tsx`, `DashboardPage.tsx`, `App.tsx`, `ui/{Table,Dialog}.tsx`, `types/database.ts`, `index.css` |

Produced exactly four documents:

| Deliverable | File |
|---|---|
| Proposal | [specs/2026-09-11-react-migration-phase12-nomenclature-requests-proposal.md](../specs/2026-09-11-react-migration-phase12-nomenclature-requests-proposal.md) |
| Ledger (authoritative `M12-*`) | [specs/2026-09-11-phase12-registry-rows.md](../specs/2026-09-11-phase12-registry-rows.md) |
| TEST-only plan | [plans/2026-09-11-react-migration-phase12-nomenclature-requests.md](../plans/2026-09-11-react-migration-phase12-nomenclature-requests.md) |
| This handoff audit | `audits/2026-09-11-phase12-design-handoff.md` |

## Ledger tally (mechanical)

Derived from the `| M12-* |` rows by a parser that splits on unescaped pipes
and classifies by the primary status at the start of the final cell
(protocol §17), not from prose:

**70 unique rows; 0 duplicates; 70 `NOT STARTED`; 0 `CODE VERIFIED`, 0
`LIVE VERIFIED`, 0 `IN PROGRESS`, 0 `BLOCKED`; 0 unclassified. Sum of status
counts = 70 = unique ids. Every row is a uniform 5-cell table row.**

Row groups, summing to 70: shell/route/role 7 (M12-01…07),
snapshot/store/realtime 8 (M12-10…17), filters 6 (M12-20…25), table 10
(M12-30…39), row actions 4 (M12-40…43), create dialog 13 (M12-50…62), review
and withdraw 13 (M12-70…82), safety/server/evidence 9 (M12-90…98). Those
ranges are slice **scope**, not status claims; all 70 rows share one status.

**Correction recorded in passing (protocol §10, §12):** the first draft of
the ledger banner and tally table asserted **58** rows from an uncounted
estimate. The mechanical parse returned 70, and all three figures were
corrected before this audit was written. This is exactly the "never count
prose tokens" failure the protocol names, caught by the checker rather than
by inspection; it is recorded here rather than in a separate audit.

## Reconciliation points for Codex

1. **This is the migration's first write workflow.** Every affordance row is
   deliberately separated from its server counterpart (M12-07 vs M12-91;
   M12-40/41 vs M12-91) so a hidden button is never recorded as a
   permission. Codex should confirm the split is complete and that no row's
   wording lets UI observation satisfy a server contract.
2. **No SQL change is proposed.** `sql/017` is applied and confirmed live
   (2026-08-23) and `sql/018` closes the import bypass. Phase 12 migrates the
   UI onto an unchanged server contract. Codex should confirm nothing in the
   package implies a migration.
3. **The existing simulation is an asset, not a duplicate.**
   `tests/nomenclature_requests_simulation.js` already models 017 statement by
   statement. T1 reuses its normaliser case list so the browser rule cannot
   drift from the SQL rule. It is **not** a substitute for live evidence:
   it is a model, and the ledger treats it as unit/source evidence only.
4. **D-M2 is the acceptance gate, and it is not free.** Approval permanently
   creates an item and consumes a 7-digit code — not reversible by any
   supported interface. The plan states that in advance (T7) rather than
   discovering it mid-window. Withdrawal and rejection leave immutable
   request/audit history and are only item-catalogue-neutral; approval also
   leaves a permanent item and consumes a code.
5. **Role-gate wording.** The rail entry is genuinely gated (id +
   `display:none` + a `go()` guard), but because `effectiveRole()` maps every
   legacy role into the three permitted ones, the gate currently excludes
   nobody. M12-03 says this explicitly rather than letting "role-gated" imply
   a restriction that does not exist.
6. **CSS gap (source-verified).** `web/src/index.css` has no `.t-op`,
   `.t-mv`, `.t-out`, `.seg` or `td.nm` rule (`grep -c` → 0 each), so the
   «Gözləyir» status tag and the whole filter segment control are unstyled
   today. Folded into plan T4 on the D-L5 precedent rather than raised as a
   sixth decision.
7. **Realtime is an improvement, not parity.** Legacy's fixed subscription
   list (1174) omits `item_requests`, so a new request does not appear until
   a manual reload. M12-16 proposes adding it and says plainly that it is a
   deviation (D-M4).
8. **No item-card handoff.** Unlike Phases 9-11, `tbl()` is called without
   `clk` here (2539), so rows are not clickable and there is no navigation
   out of this screen. M12-30 pins that as a legacy fact.

## Owner decisions raised (each with a recommendation)

| Id | Question | Recommendation |
|---|---|---|
| D-M1 | Rail placement (legacy: last in «Bazalar», after the admin-only «Soraqçalar») | Keep legacy order; usability belongs to the Phase 18 shell review |
| D-M2 | Authorise a narrow TEST write window | Yes only with explicit acceptance of every residual: withdrawn/rejected request rows and audit rows for all legs, plus one permanent item and consumed code for approval; otherwise leave write rows unpromoted |
| D-M3 | Port `item_request_candidates()` cross-user similarity | Defer — legacy's browser path does not call it |
| D-M4 | Add `item_requests` to the realtime set | Yes, recorded as an improvement |
| D-M5 | Rail pending-counter badge `#c-nreq` | Defer to Phase 18 with the other rail counters |
| D-M6 | Add a confirmation prompt to «Geri götür» | Keep legacy behaviour (no prompt) |

## Evidence classes in this package

| Class | Used here |
|---|---|
| Source (legacy `index.html`, `sql/017`, React files read in-session) | every contract row's legacy and server ref |
| Unit / browser / live / persisted TEST | **none** — no code exists and all 70 rows are `NOT STARTED` |
| Unavailable external | a TEST **admin** identity (needed for M12-77, M12-91, M12-96) remains unavailable, the same boundary M10-51 and M11-91 carry; a TEST write window is unauthorised pending D-M2 |

## Evidence boundaries and non-claims

- No application, test, SQL, CSS or environment file was changed.
- No Supabase project was contacted; production `bbjmhaerssakbreykxiw` was
  never referenced by any command.
- Nothing was staged, committed, pushed or deployed; the dirty tree is
  preserved and staging is empty.
- No password or token was read, stored or printed.
- No row is promoted; no count is copied forward from any earlier phase; the
  70-row figure was derived mechanically in this session.
- The legacy behaviours listed in proposal §7 are reproduced deliberately and
  are **not** claimed as defects fixed.

## Validation performed (documentation integrity)

Recorded with outputs in the final report: mechanical row/id/status/cell
tally over the ledger, uniform 5-cell check, group-count cross-check against
the closing paragraph, existence of every relative link target,
`git diff --check`, empty staging, and read-back of each changed authority
surface.

## Next step

Independent Codex design audit of the proposal, ledger and plan, then owner
decisions D-M1…D-M6. Until both are complete Phase 12 remains
**NOT STARTED / NOT ACCEPTED** and no application code may be written.
**(SUPERSEDED 2026-09-11 — application code HAS since been written under the
owner's D-M1/D-M3…D-M6 acceptance; only D-M2's write window remains
forbidden. See the implementation audit.)**
