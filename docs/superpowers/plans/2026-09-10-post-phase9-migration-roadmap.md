# Post-Phase-9 migration roadmap — inventory and proposed phases

> **CURRENT UPDATE — 2026-09-11:** Phases 13 and the Phase 14 offline
> implementation are complete; Phase 15 Finance/Controls is implemented with
> 56 CODE VERIFIED and four live-evidence gaps in its 60-row ledger. Phase 15
> remains NOT ACCEPTED. Phase 16 is the next independent implementation scope
> and inherits no earlier write or destructive-operation authority.

> **PHASE 16 PROGRESS — SUPERSEDED IN PART:** its safe read-only/client slice
> is implemented; M16-11 was subsequently implemented too, so the "M16-11
> remains NOT STARTED" clause below is HISTORY. Eight authority-gated rows
> remain BLOCKED and Phase 16 is NOT ACCEPTED. Its ledger is authoritative
> for the current figures: `specs/2026-09-11-phase16-registry-rows.md`.

> **PHASE 18 ACCEPTED — 2026-09-12 (latest):** Phase 18, the final integration
> phase this roadmap proposed, is **ACCEPTED in its implemented shell /
> read-only scope** after the independent Codex audit, which found no
> application defect. Derived tally: **24 CODE VERIFIED / 5 LIVE VERIFIED /
> 3 ACCEPTED / 10 BLOCKED / 42 unique**. D-P1 and D-P4 ACCEPTED, D-P3 partially
> complete (TEST admin/anbardar read-only responsive rehearsal — do not re-run),
> D-P2 DEFERRED.
>
> **Rule 4 of this roadmap is satisfied, not waived.** Phase 18 did not accept
> deferred visual parity, cross-screen role behaviour or legacy retirement by
> implication: those ten contracts were transferred INTACT, retaining BLOCKED,
> to the [authority package](./2026-09-12-phase18-authority-verification-package.md)
> and the [cutover package](./2026-09-12-phase18-cutover-package.md). Legacy
> retirement (M18-60), production deployment (M18-62) and rollback readiness
> (M18-63) remain unapproved and require explicit owner authority; Phase 18's
> acceptance confers none.
>
> **The nine-phase tail this roadmap proposed (Phase 10 → Phase 18) is now
> complete as a migration sequence.** What remains is not a further phase but
> the two verification packages plus the Phase 17 authority package.
> [Decision](../decisions/2026-09-12-phase18-shell-acceptance-scope.md) ·
> [Codex audit](../audits/2026-09-12-phase18-final-codex-audit.md) ·
> [Ledger](../specs/2026-09-12-phase18-registry-rows.md)
>
> **HISTORY — SUPERSEDED BY THE ACCEPTANCE ABOVE. PHASE 18 UPDATE — 2026-09-12:** Phase 18, the final integration
> phase this roadmap proposed, is no longer a proposal. It has a drafted design
> package — proposal, a 42-row `M18-*` ledger, a TEST-only plan, a design
> handoff audit, an implementation audit and a Codex handoff — and its entire
> offline slice is implemented. Its subject is the application SHELL, which no
> page-by-page phase owned: rail order and counter badges, the responsive
> off-canvas rail, the page-switch scroll reset and item-card clear, the topbar
> presence chip, and the stale migration notice. Mechanically derived tally:
> **28 CODE VERIFIED / 0 LIVE VERIFIED / 14 BLOCKED / 42 unique**. Every
> role-enforcement, realtime, export, rendered-visual and cutover row is
> BLOCKED on owner decisions D-P1…D-P4; **no Supabase call was executed and no
> row is LIVE VERIFIED**. That package, not this roadmap, is authoritative for
> Phase 18. Phase 18 is NOT ACCEPTED pending independent Codex audit.
> Rule 4 above still holds: it may not accept deferred visual parity,
> cross-screen role behaviour or legacy retirement by implication — and it does
> not, which is why 14 rows are BLOCKED rather than claimed.
> [Proposal](../specs/2026-09-12-react-migration-phase18-whole-platform-parity-proposal.md) ·
> [Ledger](../specs/2026-09-12-phase18-registry-rows.md) ·
> [Plan](./2026-09-12-react-migration-phase18-whole-platform-parity.md) ·
> [Handoff](../audits/2026-09-12-phase18-claude-handoff.md)
>
> **HISTORY — SUPERSEDED BY THE PHASE 18 UPDATE ABOVE. PHASE 17 ACCEPTANCE UPDATE — 2026-09-12:** Phase 17 is ACCEPTED
> in the owner-approved read/pure scope after the independent Codex gate. The
> 17 authority-gated catalog/role/network/write/delete/import/egress contracts
> were transferred intact to
> `2026-09-12-phase17-authority-verification-package.md`; they retain honest
> BLOCKED backlog statuses but do not block Phase 17. **Phase 18 is now the
> active migration phase.**
>
> **HISTORY — SUPERSEDED BY THE ACCEPTANCE UPDATE ABOVE. PHASE 17 UPDATE — 2026-09-12:** Phase 17 (Azpetrol / Araz) is no longer
> only a roadmap proposal. It has a drafted design package — proposal, an
> `M17-*` ledger, a TEST-only plan and a design handoff audit — and its
> decision-independent pure-logic slice is implemented. Every write, import,
> destructive-cleanup and bulk-egress row is BLOCKED on owner decisions
> D-T1…D-T5. That package, not this roadmap, is authoritative for Phase 17.
> Phase 17 was NOT ACCEPTED at that revision.
> [Proposal](../specs/2026-09-12-react-migration-phase17-azpetrol-araz-proposal.md) ·
> [Ledger](../specs/2026-09-12-phase17-registry-rows.md) ·
> [Plan](./2026-09-12-react-migration-phase17-azpetrol-araz.md) ·
> [Audit](../audits/2026-09-12-phase17-design-handoff.md)

**Status:** DRAFT roadmap — planning only. Phases 9, 10, 11 and the
owner-approved scope of Phase 12 were independently `ACCEPTED` by 2026-09-11;
this roadmap still creates no
implementation or acceptance authority for a later phase. Phase 12
(«Nomenklatura sorğuları», legacy `rNreq()`) now has its own drafted design
package — a [proposal](../specs/2026-09-11-react-migration-phase12-nomenclature-requests-proposal.md),
a [70-row ledger](../specs/2026-09-11-phase12-registry-rows.md), a
[TEST-only plan](2026-09-11-react-migration-phase12-nomenclature-requests.md)
and a [design handoff audit](../audits/2026-09-11-phase12-design-handoff.md).

**SUPERSEDED — 2026-09-11:** that package is no longer `NOT STARTED`. Codex's
design audit passed, the owner accepted D-M1 and D-M3…D-M6, and Phase 12 was
implemented — 61 `CODE VERIFIED`, 0 `LIVE VERIFIED`, 3 `IN PROGRESS`, 6
`NOT STARTED` of 70 rows. D-M2 alone remains deferred, so the write/server
rows stay unpromoted. Phase 12 is still `NOT ACCEPTED` pending Codex's
independent audit. That package, not this roadmap, is authoritative for
Phase 12. D-M2 remains a separately deferred live-write extension.
[Phase 9 final audit](../audits/2026-09-10-phase9-final-codex-acceptance.md) ·
[Phase 10 final audit](../audits/2026-09-11-phase10-final-codex-acceptance.md) ·
[Phase 11 final audit](../audits/2026-09-11-phase11-final-codex-acceptance.md).

## Scope measured on 2026-09-10

The legacy application has 17 top-level page sections in `index.html`:
`dash`, `op`, `mov`, `bal`, `nom`, `nreq`, `grp`, `knt`, `anb`, `sm`, `refs`,
`rep`, `fin`, `ctrl`, `log`, `set`, and `azp`.

React currently routes eight of these: reference directories, audit log,
nomenclature, item groups, new operation, movements, balances, and warehouses
and projects. Partners (`knt`) are already covered inside the Phase 2
reference-directory work rather than by a separate React page. Phase 9 added
balances (`bal`) and Phase 10 added warehouses/projects (`anb`).

Therefore, completion of Phase 10 does **not** complete the product migration.
Eight top-level legacy areas remain to be designed and migrated.

## Remaining inventory after Phase 9

| Legacy area | Legacy entry point | React state after Phase 9 | Approximate legacy page-logic size | Main risk |
|---|---:|---|---:|---|
| Dashboard | `rDash()` | migrated in Phase 11 (2026-09-11), `NOT ACCEPTED` pending Codex | ~100 lines | KPI definitions and permission-safe aggregation |
| Nomenklatura sorğuları | `rNreq()` | migrated 2026-09-11, `NOT ACCEPTED` pending Codex | ~270 lines | multi-role request/approval write workflow |
| Sərfiyyat Materialları | `rSm()` | not migrated | ~500 lines | independent document workflow and reference dependencies |
| Hesabatlar | `rRep()` / `rQaimeReport()` | not migrated | ~200 lines | report variants, filters, export parity |
| Maliyyə göstəriciləri | `rFin()` | not migrated | ~100 lines | financial aggregation and data interpretation |
| Nəzarət və risklər | `rCtrl()` | not migrated | ~100 lines | derived risk rules and drill-down correctness |
| Parametrlər və ixrac | `rSet()` | not migrated | ~1,000 lines including import/export helpers | backup/import, users, permissions, destructive-data risk |
| Azpetrol / Araz | `rAzp()` | not migrated | ~1,590 lines | separate high-write accounting module with cards, operations, import/export and audit |

The line estimates are triage signals, not delivery estimates: Phase 9 shows
that a short legacy renderer can still require a large contract ledger, live
evidence and concurrency work.

## Proposed follow-on phases

| Proposed phase | Scope | Why it is grouped this way | Relative size / risk |
|---|---|---|---|
| Phase 10 | Anbar və layihələr and the `dead` report | Both are explicitly outside Phase 9 and consume the shared balance index. This proves that Phase 9 did not regress their inputs before broader reporting work. | medium |
| Phase 11 | Dashboard | A bounded read-only overview once the core operational screens and balances exist. | medium |
| Phase 12 | Nomenklatura sorğuları | A focused approval workflow, distinct from the already-migrated nomenclature catalogue. | medium-high |
| Phase 13 | Sərfiyyat Materialları | Its own document and reference workflow; should not be folded into ordinary stock movements. | high |
| Phase 14 | Hesabatlar | Report families, filters and exports deserve a dedicated ledger and independent reconciliation. | high |
| Phase 15 | Maliyyə göstəriciləri and Nəzarət və risklər | Both are derived analytical views over mature operational data, but retain separate contracts and ledgers. | medium-high |
| Phase 16 | Parametrlər, backup/import/export and user administration | Highest operational and destructive-data risk; must be isolated from normal screen migration. | very high |
| Phase 17 | Azpetrol / Araz | A separately modelled accounting subsystem; its writes, imports, exports and audit history require its own acceptance gate. | very high |
| Phase 18 | Whole-platform final parity, visual review and cutover readiness | Cross-module navigation, roles, exports, realtime, visual differences, legacy retirement decision and production release preparation. | very high |

## Ordering and dependency rules

1. Phase 10 starts only after Phase 9 is independently accepted, because it
   reuses and must regression-test the Phase 9 shared balance computation.
2. Every proposed phase requires its own design audit, authoritative ledger,
   TEST-only plan and independent acceptance audit. Phase numbering is a
   roadmap proposal, not approval to implement the next phase automatically.
3. Phase 16 and Phase 17 must each use specially scoped write containment;
   neither may inherit a generic write authorisation from earlier phases.
4. Phase 18 cannot accept deferred visual parity, cross-screen role behaviour
   or legacy retirement by implication. It is a final integration phase, not a
   documentation cleanup.

## Current volume conclusion

After Phase 9, the project has nine unmigrated top-level areas and a proposed
nine-phase tail (Phase 10 through Phase 18). The largest remaining blocks are
Settings/import-export, Azpetrol/Araz, Sərfiyyat Materialları, and reports.
Exact row counts and delivery estimates must be created during each phase's
design reconciliation; they cannot be responsibly inferred from legacy line
counts alone.
