# Phase 13 — implementation report (Module N, «Sərfiyyat Materialları»)

> **CODEX CORRECTION — 2026-09-11.** Independent review found and fixed a
> duplicate page-scoped user-directory RPC and incomplete local editor clearing
> after successful create. The authoritative result is the
> [final Codex audit](2026-09-11-phase13-final-codex-audit.md). T7 remains unrun
> and Phase 13 remains NOT ACCEPTED.

Date: 2026-09-11
Verdict: **IMPLEMENTED ON CLAUDE'S SIDE — Phase 13 remains `NOT ACCEPTED`.**
Only Codex's final independent audit can accept it.

The owner accepted **D-N1, D-N2, D-N3, D-N5, D-N6 and D-N7** and authorised
full implementation plus TEST read/write verification. T1-T6 and T9 ran as one
block. **T7 did not run** — see the evidence boundary below.

## The one open execution item, stated first

**No TEST identity was supplied to this session**, so the authorised D-N1 write
window could not be opened.

- **0** Supabase contacts (TEST `alkjjbaawmsirsfvqljm` included), **0** write
  attempts, **0** documents created, edited or deleted.
- **0** `serfiyyat_doc_seq` advances and **0** `audit_log` rows.
- D-N1's required residual accounting is therefore **all-zero**, and the
  instruction to delete every created TEST document — including the M13-70
  partial-success groups — had **nothing to act on**. No cleanup was needed and
  none was performed.

This is an external boundary, not a decision: the check was mechanical — no
`ANBAR_*` / `TEST_*` / `SUPABASE_*` environment variable was present, and no
credential file exists tracked or untracked. Per protocol §13 every remaining
independent task was completed rather than stopping at the blocker.

Running T7 later needs a TEST **anbardar** whose warehouse is linked to an
active project, and — for M13-93, M13-94 and the admin document table — a TEST
**admin**, which the M10-51 / M11-91 / M12-98 boundary records as still
non-existent. Supply either only as a process-only variable, never in a repo
file.

## Mechanical tally

Derived in this session from the 77 `| M13-* |` status cells by a parser that
splits on unescaped pipes and classifies by the **primary status at the start
of the final cell** (protocol §17), run before and after promotion.

| Status | Rows |
|---|---|
| `CODE VERIFIED` | **69** |
| `LIVE VERIFIED` | **0** |
| `IN PROGRESS` | **2** |
| `NOT STARTED` | **6** |
| `BLOCKED` | **0** |
| unclassified | **0** |
| **total unique** | **77** |

77 rows, 77 unique ids, 0 duplicates, every row a uniform 5-cell row, sum of
status counts = 77 = unique ids.

**No row is `LIVE VERIFIED`, because nothing was executed against TEST.**

The 2 `IN PROGRESS` rows are **M13-70 and M13-71**; each has a unit-verified
CLIENT contract but an unevidenced SERVER/persisted clause. The 6
`NOT STARTED` rows are **M13-90, M13-91, M13-92, M13-93, M13-94 and M13-98** —
every one server-authoritative or an evidence boundary, none reachable without
a TEST identity. Every other row is `CODE VERIFIED`.

## What was built

| File | Contents |
|---|---|
| `lib/serfiyyat.ts` | `allowedProjects`, `canWrite`, `activeChannelNames`, draft line maths, `itemSearchHits`, `reportRows` |
| `lib/serfiyyatFilters.ts` | the fifteen-filter predicate and both «Yekun» aggregations |
| `lib/serfiyyatImport.ts` | BOTH import parsers, kept deliberately separate |
| `lib/serfiyyatExport.ts` | the two-sheet workbook builder |
| `api/serfiyyatDocuments.api.ts` | the page's OWN snapshot reader + three RPC wrappers |
| `store/serfiyyat.store.ts` | snapshot, draft, `editDocId`, filters, tab, retention, stale ticket |
| `pages/SerfiyyatPage.tsx` | shell, segment control, readiness gate, load surfaces |
| `components/serfiyyat/DocumentForm.tsx` | the four ordered guards, header, line editor, both imports, submit |
| `components/serfiyyat/ReportView.tsx` | filters, document table, report table, «Yekun», export |
| `components/serfiyyat/DocsImportPreviewDialog.tsx` | the preview and the non-atomic per-group loop |

Each has its own test file. **Additive edits only** to three shared files:
`mutationGuard.ts` (the three `sm.*` actions, M13-97), `index.css` (the single
`.row{display:grid;gap:10px}` rule, M13-99) and `App.tsx` (the `sm` route and
rail entry). No accepted Phase 9-12 module's source was modified.

**Test-fixture exception, recorded rather than hidden.** Two rail fixtures in
the accepted `App.test.tsx` enumerate the «Bazalar» group exhaustively, so
adding a real rail entry necessarily extends both lists; a `SerfiyyatPage`
stub was added beside the other page stubs, and a runtime M13-01/M13-02 block
was appended. These are fixture changes only — no previously asserted entry
changed position and no accepted behaviour was altered.

## Decisions as implemented

- **D-N2** — `api/serfiyyatDocuments.api.ts` is the page's own reader. A test
  asserts it reads exactly the three `serfiyyat_*` tables with `select('*')`
  plus the required item catalogue and reference values, never widens the
  accepted narrow `fetchSerfiyyat()`, and never duplicates the application-wide
  user-directory RPC.
- **D-N3** — the import loop stays non-atomic across groups, and the dialog
  says so in the UI. The load-bearing test drives a mid-loop failure and proves
  all three groups were attempted and both outcomes tallied.
- **D-N5** — realtime watches `serfiyyat_documents` and `serfiyyat_lines`, with
  a negative control that no stock table is subscribed.
- **D-N6** — an unresolved author keeps the raw uuid.
- **D-N7** — the export has no CSV fallback; the missing-library test asserts
  nothing is written.

## Corrections recorded in passing (protocol §10, §12)

1. **A false test expectation about the positional fallback, corrected to the
   real legacy contract.** A first draft asserted that a headerless
   document-import sheet beginning `['Layihə A', 'Sement M400', …]` parses
   positionally. It does not: legacy's header regex
   `/layih|material|mal|miqdar|qty|qiym|price|tarix|date/` matches «Layihə A»,
   so that row is consumed as a header and the data is silently lost. The
   implementation reproduces legacy exactly; the **test** was wrong and was
   corrected, and the trap is now pinned by its own case so a future change to
   the regex fails it.
2. **A test that passed for the wrong reason.** The «Yekun» project-aggregate
   assertion was written as a `.map` over a mismatched array that happened to
   reduce to the right two strings. It passed, but a test that passes by
   accident is not evidence (§4); it was replaced with a direct assertion over
   both aggregates.
3. **Four typecheck defects and one lint defect in new test code** (a widened
   `Map` literal, two missing `afterEach` imports, two unused bindings, and a
   namespace assignment) were found by the gate and fixed before reporting.

## Verification

| Check | Result |
|---|---|
| Full suite | **168 files / 3741 tests passed** |
| `tsc -b --noEmit` | clean |
| `oxlint src` | clean (exit 0; only pre-existing-pattern `only-export-components` advisories, matching `ItemRequestsPage.tsx`) |
| `vite build --mode sandbox` | built, 238 modules |
| `git diff --check` | clean |
| Staged files | **0** |
| Dirty tree | preserved |

The «chunks larger than 500 kB» advisory is the pre-existing Phase 8 one.

Focused suites ran throughout: 110 pure-logic tests (T1-T3), 58 export/API,
58 store/API, 96 component, 61 `App.test.tsx`, 31 CSS pins.

## Evidence boundaries and non-claims

- **Unit/source evidence only.** Every "can/cannot" in the component and lib
  tests is a **browser affordance**, named as one in its test title. None of
  them evidences a server refusal: M13-90…M13-94 remain unpromoted precisely
  because a hidden control is never a permission (§5, §7).
- No Supabase project was contacted. Production `bbjmhaerssakbreykxiw` was
  never referenced by any command, and no Phase 13 file contains either
  project ref.
- A dev server was already listening on 127.0.0.1:5175 (PID 24976, started
  10:18, hours before this session). It was **not started, used or contacted**
  by this session; no browser harness was run.
- Nothing was staged, committed, pushed or deployed. No SQL was changed —
  `sql/032` is applied and untouched.
- No password or token was read, stored or printed.
- The captured TEST schema was the read source for the server contract. It is
  treated as the applied contract's faithful capture, **not** as live
  verification: no RPC was invoked and no `to_regprocedure` check was run.
- The legacy behaviours in proposal §7 are reproduced deliberately and are
  **not** claimed as defects fixed.

## Next step

Codex's final independent audit. Phase 13 stays **NOT ACCEPTED** until then,
and T7 stays open pending a TEST identity.
