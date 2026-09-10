# Post-Phase-9 migration roadmap — inventory and proposed phases

**Status:** DRAFT — planning only. This document creates no implementation or
acceptance authority. Phase 9 remains in progress and not accepted.

## Scope measured on 2026-09-10

The legacy application has 17 top-level page sections in `index.html`:
`dash`, `op`, `mov`, `bal`, `nom`, `nreq`, `grp`, `knt`, `anb`, `sm`, `refs`,
`rep`, `fin`, `ctrl`, `log`, `set`, and `azp`.

React currently routes six of these: reference directories, audit log,
nomenclature, item groups, new operation, and movements. Partners (`knt`) are
already covered inside the Phase 2 reference-directory work rather than by a
separate React page. Phase 9 implements the seventh: balances (`bal`).

Therefore, completion of Phase 9 does **not** complete the product migration.
Nine top-level legacy areas remain to be designed and migrated.

## Remaining inventory after Phase 9

| Legacy area | Legacy entry point | React state after Phase 9 | Approximate legacy page-logic size | Main risk |
|---|---:|---|---:|---|
| Anbar və layihələr plus the `dead` report | `rAnb()` / `dead` consumers | not migrated | ~100 lines plus shared `IX.bal` consumers | warehouse/project semantics; shared balance input |
| Dashboard | `rDash()` | not migrated | ~100 lines | KPI definitions and permission-safe aggregation |
| Nomenklatura sorğuları | `rNreq()` | not migrated | ~270 lines | multi-role request/approval write workflow |
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

