# Phase 13 — design reconciliation and handoff for the independent Codex audit

Date: 2026-09-11
Verdict: **DESIGN DRAFTED — Phase 13 is `NOT STARTED / NOT ACCEPTED`.** No
application code exists for this module, all 77 ledger rows are `NOT STARTED`,
and no row is promoted. Implementation requires this audit to pass Codex's
independent review AND owner decisions D-N1…D-N3 and D-N5…D-N7. D-N4 was
subsequently withdrawn by the Codex audit because its premise was false.
Environment: **no Supabase contact of any kind in this session** (neither TEST
`alkjjbaawmsirsfvqljm` nor production `bbjmhaerssakbreykxiw`); documentation
only.

## What was done

After Phase 12's scoped acceptance, Claude read the post-Phase-9 roadmap, the
Phase 12 final acceptance audit, and the Phase 11/12 packages as format
references, then the primary sources for this module only:

| Source | Read |
|---|---|
| Legacy page | `index.html:262` (rail), `382-390` (shell), `1163-1181` (realtime), `1212-1235` (`toNum`/`xls`), `1331-1349` (`modal`/`closeModal`), `1495-1512` (`go()` and `render()` dispatch), `594-605` (formatters, `toast`, `debounce`), `839` + `1024-1034` (`UMAIL`), `6178-6246` (module header, `SM`, `smLoad`, `rSm` and the four small helpers), `6250-6362` (`smRenderForm`), `6364-6395` (`smImportLines`), `6397-6512` (the document-import family), `6514-6574` (`smRenderLines`, `smSubmitDocument`, `smOpenEditDocument`, `smDeleteDocument`), `6576-6646` (`smReportRows`, `smRenderReport`), `6650-6726` (`smRenderDocsTable`, `smFilteredRows`, `smRenderReportTable`, `smExportExcel`), `7505-7507` (nav visibility), `70-124` (the stylesheet region this page depends on) |
| Server contract | The captured TEST schema in full for this module: `create_serfiyyat_document` (2398-2484), `delete_serfiyyat_document` (2508-2541), `edit_serfiyyat_document` (2716-2805), `current_user_role`/`current_user_warehouse` (2486-2506), `next_serfiyyat_doc_num` (3990-3994), the three tables (160-191), constraints and indexes (5357-5365, 5499-5507, 5587-5627), RLS policies (5753-5764) and grants (5876-5898) |
| React side | `roles.ts`, `format.ts`, `mutationGuard.ts`, `utils.ts`, `itemFilters.ts`, `bulkItemParse.ts`, `referenceFallbacks.ts`, `xls.ts`, `xlsGroups.ts`, `serfiyyatProjects.api.ts`, `referenceValues.api.ts`, `userDirectory.api.ts`, `itemRequests.api.ts`, `itemRequests.store.ts`, `dashboard.store.ts`, `toast.store.ts`, `useRealtimeRefresh.ts`, `ui/{Table,Dialog,Button,Input}.tsx`, `ItemRequestsPage.tsx`, `RequestCreateDialog.tsx`, `App.tsx`, `types/database.ts`, `index.css`, `index.css.dashboard.test.ts` |

Produced exactly four documents:

| Deliverable | File |
|---|---|
| Proposal | [specs/2026-09-11-react-migration-phase13-serfiyyat-materiallari-proposal.md](../specs/2026-09-11-react-migration-phase13-serfiyyat-materiallari-proposal.md) |
| Ledger (authoritative `M13-*`) | [specs/2026-09-11-phase13-registry-rows.md](../specs/2026-09-11-phase13-registry-rows.md) |
| TEST-only plan | [plans/2026-09-11-react-migration-phase13-serfiyyat-materiallari.md](../plans/2026-09-11-react-migration-phase13-serfiyyat-materiallari.md) |
| This handoff audit | `audits/2026-09-11-phase13-design-handoff.md` |

## Ledger tally (mechanical)

Derived from the `| M13-* |` rows by a parser that splits on unescaped pipes
and classifies by the primary status at the start of the final cell
(protocol §17), not from prose:

**77 unique rows; 0 duplicates; 77 `NOT STARTED`; 0 `CODE VERIFIED`, 0
`LIVE VERIFIED`, 0 `IN PROGRESS`, 0 `BLOCKED`; 0 unclassified. Sum of status
counts = 77 = unique ids. Every row is a uniform 5-cell table row.**

Row groups, summing to 77 and each verified against the parsed id list:
shell/route/role 7 (M13-01…07), readiness/snapshot/store/realtime 10
(M13-10…19), form guards 6 (M13-20…25), form fields and draft lines 12
(M13-30…36, M13-39…43), submit and edit 5 (M13-50…54), imports 10
(M13-60…63, M13-65…70), delete/document table/report scope 7 (M13-71…77),
filters and aggregation 8 (M13-80…87), export 2 (M13-88, M13-89),
safety/server/evidence 10 (M13-90…99). Those ranges are slice **scope**, not
status claims; all 77 rows share one status. The ids are deliberately
non-contiguous — `M13-08/09`, `26…29`, `37/38`, `44…49`, `55…59`, `64` and
`78/79` are unused — so no range may be read as a count (protocol §16).

## Two corrections recorded in passing (protocol §10, §12)

Both were caught by checking rather than by inspection, and both are recorded
here instead of in separate audits:

1. **A fabricated line range.** The proposal's first §8 draft claimed
   `web/src/index.css` has "no `.tbl` rule" and cited `index.html:88-104` as
   where legacy defines the `.tbl` family. Reading the legacy stylesheet showed
   **there is no `.tbl` class rule anywhere in the platform** — `tbl` is only a
   class attribute, and the styling comes from the bare `table`/`th`/`td`
   selectors at 75-81, which React already has. The cited range was wrong and
   the conclusion inverted: the real gap is a single missing rule, `.row`
   (legacy 111). §8 now carries the verified selector-by-selector table and
   states the retraction explicitly. This is the §2 "never rely on a summary
   when the primary source is available" failure.
2. **A prose-counted tally.** The ledger's first banner, tally table, group
   paragraph and the proposal's link text all asserted **86** rows from an
   estimate made while writing. The mechanical parse returned **77**. All five
   locations were corrected before this audit and the plan were written, and
   the parse was re-run afterwards to confirm 77 / 77 unique / 0 duplicates /
   0 unclassified with every row a uniform 5-cell row. This is precisely the
   §10 "never count prose tokens" failure.

A third, smaller defect is also recorded: M13-21 initially quoted the legacy
refusal as «Sənəq yaratmaq…». The source (6254) reads «Sənəd yaratmaq…». It
was corrected, and every other exact Azerbaijani string quoted in a ledger row
(M13-39, M13-53, M13-63, M13-70, M13-71, M13-72, M13-85, M13-89) was then
re-read from the source and confirmed verbatim.

## Reconciliation points for Codex

1. **The rail entry has an id but no gate.** `nav-sm` carries an `id` and no
   `display:none`; the sign-in block sets the display of `nav-refs`,
   `nav-nreq` and `nav-azp` and never `nav-sm`; and `go()`'s full body has
   branches only for `refs`, `nreq` and `azp`. M13-02 therefore records the
   page as **ungated for every role** and says so explicitly, because "has an
   id" invites the opposite assumption. Verified by enumerating every
   `nav-sm` occurrence in the file (exactly one) — Codex should confirm.
2. **No SQL change is proposed.** `sql/032` is applied and present in the
   captured TEST schema. Phase 13 migrates the UI onto an unchanged server
   contract, exactly as Phase 12 did over `sql/017`.
3. **The one real reuse limit is `fetchSerfiyyat()`.** It exists and is
   accepted, but reads only the narrow column set the Soraqçalar usage counter
   needs. This page needs every document and line column. D-N2 proposes a
   page-specific reader rather than widening it — widening a shared narrow
   reader to serve a new page is exactly the M12-10 fan-out defect Codex
   corrected in Phase 12.
4. **Two independent import paths on one screen.** Legacy is explicit that the
   line-level and document-level imports must not be conflated (6397-6403).
   They are separate ledger groups with separate parsers, and the plan's T3
   tests them independently, including the avtomobil/qaimə column exclusion
   (which needs a fixture carrying both headers or it is vacuous) and the
   seven-component grouping key (which needs each component varied
   independently, per protocol §4).
5. **The import loop is not atomic across groups (D-N3).** Each document is
   atomic in its own transaction, but a mid-loop failure leaves the earlier
   documents permanently created. Recorded as legacy behaviour in M13-70 rather
   than quietly fixed; making it atomic would require a new RPC, i.e. a SQL
   change this phase does not propose.
6. **Three server facts the browser cannot demonstrate.** The qty regex refuses
   a negative or exponent-formatted number outright (M13-92) — unreachable
   from the UI because the browser's own `qty > 0` guard refuses first, so the
   first-refusing-guard rule (§5) makes this a T7-only row; `edit_serfiyyat_document`
   deletes and re-inserts every line so line ids are not stable (M13-93); and
   all three RPCs write `audit_log` rows (M13-94).
7. **Deletion is real.** There is no reversal document, unlike the movements
   module: the row is DELETEd, lines cascade, and only the `audit_log` entry
   survives. D-N1's write window is therefore catalogue-reversible but **not
   database-net-zero**. The base create/edit/delete document consumes one
   sequence value and leaves three audit rows; every successful group in the
   M13-70 partial-success leg consumes another value and its later cleanup
   leaves INSERT plus DELETE audit history. Exact residuals must be measured,
   not stated as a fixed total.
8. **Structural isolation is the module's premise.** It writes no `movements`
   row and must never reach balances, the item index, the movements register or
   any stock export (M13-95). Codex should confirm no proposed module routes
   these rows through a movement primitive.
9. **Realtime is an improvement, not parity (D-N5).** Legacy's fixed
   subscription list (1174) is `movements, items, partners, warehouses` and
   contains no `serfiyyat_*` table — verified by reading the line, not inferred.

## Owner decisions raised (each with a recommendation)

| Id | Question | Recommendation |
|---|---|---|
| D-N1 | Authorise a narrow TEST write window | Yes, only with explicit acceptance of measured residuals. Base create/edit/delete leaves one consumed sequence value plus three audit rows; the M13-70 partial-success leg adds a sequence advance and INSERT/cleanup-DELETE audit history per successful group. Delete every created document and report the exact final deltas |
| D-N2 | Widen `fetchSerfiyyat()` or add a page reader | Add a page-specific reader; widening is the M12-10 fan-out defect |
| D-N3 | The document-import loop is not atomic across groups | Keep legacy behaviour and state it in the UI summary; atomicity needs a new RPC |
| D-N4 | **WITHDRAWN by Codex audit:** the draft said an exact zero bound is ignored | No decision required. Input values are strings; `'0'` is truthy and the zero bound is applied through `parseFloat()` |
| D-N5 | Add the `serfiyyat_*` tables to the realtime set | Yes, recorded as an improvement — the D-M4 precedent |
| D-N6 | «Daxil edən» falls back to the raw uuid when unresolved | Keep legacy behaviour; the audit log already does the same |
| D-N7 | The export has no CSV fallback | Keep legacy behaviour for this phase and record it |

## Evidence classes in this package

| Class | Used here |
|---|---|
| Source (legacy `index.html`, the captured TEST schema, React files read in-session) | every contract row's legacy and server ref |
| Unit / browser / live / persisted TEST | **none** — no code exists and all 77 rows are `NOT STARTED` |
| Unavailable external | a TEST **admin** identity (needed for M13-93, M13-94 and the admin document table) remains unavailable — the same boundary M10-51, M11-91 and M12-98 carry; a TEST write window is unauthorised pending D-N1 |

## Evidence boundaries and non-claims

- No application, test, SQL, CSS or environment file was changed. The only
  files written are the four documents above plus the authority-surface
  banners named below.
- No Supabase project was contacted; production `bbjmhaerssakbreykxiw` was
  never referenced by any command.
- Nothing was staged, committed, pushed or deployed; the dirty tree is
  preserved and staging is empty.
- No password or token was read, stored or printed.
- No row is promoted; no count is copied forward from any earlier phase; the
  77-row figure was derived mechanically in this session and re-verified after
  every edit.
- The legacy behaviours listed in proposal §7 are reproduced deliberately and
  are **not** claimed as defects fixed.
- The captured TEST schema is the read source for the server contract. It is
  treated as the applied contract's faithful capture, **not** as live
  verification — no RPC was invoked and no `to_regprocedure` check was run
  this session.

## Validation performed (documentation integrity)

Recorded with outputs in the final report: the mechanical row/id/status/cell
tally over the ledger (run twice — before and after the 86→77 correction),
the uniform 5-cell check, the group-count cross-check against the parsed id
list, existence of every relative link target, verbatim re-reading of every
exact Azerbaijani string quoted in a ledger row, `git diff --check`, empty
staging, and read-back of each changed authority surface.

## Next step

Independent Codex design audit of the proposal, the 77-row ledger and the
plan, then owner decisions D-N1…D-N3 and D-N5…D-N7. Until both are complete Phase 13 remains
**NOT STARTED / NOT ACCEPTED** and no application code may be written.
