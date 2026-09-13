# Claude next task — Phase 18 whole-platform parity and cutover readiness


> **PHASE 18 ACCEPTED — 2026-09-12 (latest).** The owner accepted Phase 18 in its
> implemented **shell / read-only** scope after the independent Codex audit,
> which found no application defect. Mechanically derived tally: **24 CODE
> VERIFIED / 5 LIVE VERIFIED / 3 ACCEPTED / 0 IN PROGRESS / 0 NOT STARTED /
> 10 BLOCKED / 42 unique**. D-P1 and D-P4 ACCEPTED (no duplicate «Kontragentlər»
> rail page — the `knt` report stays the single surface, and the consumerless
> `c-knt` fetch was removed; `c-mov`/`c-bal`/`c-ctrl` intentionally omitted).
> D-P3 PARTIALLY COMPLETE: Codex's TEST admin/anbardar read-only responsive
> rehearsal promoted M18-01, M18-02, M18-30, M18-31 and M18-34 — do NOT re-run
> it. D-P2 DEFERRED: legacy is NOT retired and nothing is deployed. The 10
> remaining contracts were transferred intact, retaining BLOCKED, to the
> [authority package](./plans/2026-09-12-phase18-authority-verification-package.md) and the [cutover package](./plans/2026-09-12-phase18-cutover-package.md); **none was
> promoted by the transfer**, and each still needs its own explicit authority.
> Server enforcement, realtime delivery, export parity, cross-module
> consistency, stale-session behaviour, rehber-role evidence and all cutover
> work remain unproved. Phase 18 acceptance is NOT authority to retire legacy or
> deploy. [Decision](./decisions/2026-09-12-phase18-shell-acceptance-scope.md) · [audit](./audits/2026-09-12-phase18-final-codex-audit.md) · [ledger](./specs/2026-09-12-phase18-registry-rows.md).

> **HISTORY — SUPERSEDED BY THE PHASE 18 ACCEPTANCE ABOVE. FINAL CODEX AUDIT — 2026-09-12.** No
> application defect was found. Five TEST read-only presentation contracts are
> now LIVE VERIFIED (M18-01, M18-02, M18-30, M18-31, M18-34); derived tally is
> **24 CODE VERIFIED / 5 LIVE VERIFIED / 13 BLOCKED / 42 unique**. Test-harness
> `scrollTo`/`act()` noise was corrected. The full parallel suite remains an
> honest load-sensitive boundary: five old Phase 7/8 tests failed under load
> and passed 218/218 in isolation. Next: owner decisions D-P1…D-P4, then only
> the authorised remaining verification/cutover work. [Audit](./audits/2026-09-12-phase18-final-codex-audit.md).


> **HISTORY — SUPERSEDED BY THE FINAL CODEX AUDIT ABOVE. PHASE 18 IMPLEMENTED, NOT ACCEPTED — 2026-09-12.** Whole-platform
> final parity and cutover readiness. Phase 18 owns the application SHELL, which
> no page-by-page phase owned: it repaired the rail order, the missing counter
> badges, the absent responsive layout and burger, the missing page-switch
> scroll reset and item-card clear, the missing topbar presence chip, one report
> card header, and the stale «Miqrasiya» notice. Mechanically derived tally:
> **28 CODE VERIFIED / 0 LIVE VERIFIED / 0 IN PROGRESS / 0 NOT STARTED /
> 14 BLOCKED / 42 unique**. **No Phase 18 row is LIVE VERIFIED and no Supabase
> call was executed**; every role-enforcement, realtime, export, rendered-visual
> and cutover row is BLOCKED on D-P1…D-P4. The full offline gate passes
> (208 files / 4366 tests, typecheck, lint, sandbox build, ledger parse).
> Phase 18 stays NOT ACCEPTED pending independent Codex audit.
> [Ledger](./specs/2026-09-12-phase18-registry-rows.md) · [proposal](./specs/2026-09-12-react-migration-phase18-whole-platform-parity-proposal.md) ·
> [plan](./plans/2026-09-12-react-migration-phase18-whole-platform-parity.md) · [handoff](./audits/2026-09-12-phase18-claude-handoff.md).

> **HISTORY — SUPERSEDED BY THE PHASE 18 BANNER ABOVE. PHASE 17 ACCEPTED — 2026-09-12.** Do not reopen or reimplement
> Phase 17. The owner accepted its read/pure scope. The 17 authority-gated
> contracts now live in `plans/2026-09-12-phase17-authority-verification-package.md`
> and require separate explicit authority; they do not block Phase 17. The next
> migration task must start from the post-Phase-17 roadmap/inventory, preserving
> all accepted work and the dirty tree.

> **HISTORY — SUPERSEDED BY THE OWNER ACCEPTANCE ABOVE. FINAL CODEX AUDIT — 2026-09-12.** The Phase 17 implementation
> passes the independent full gate (205 files / 4330 tests, typecheck, lint,
> sandbox build and ledger checker). No application defect was found. Phase 17
> remains NOT ACCEPTED solely because 17 authoritative rows require explicit
> catalog/role/network/write/delete/import/egress authority. Do not reimplement
> the client or repeat offline tests. Next action is the owner's scope decision:
> accept the read/pure migration while deferring those 17 rows, or explicitly
> authorise the required residual-bearing live package. [Audit](./audits/2026-09-12-phase17-final-codex-audit.md).

> **CODEX READ-ONLY LIVE UPDATE — 2026-09-12 (latest).** Do not repeat the
> identity-boundary search: the owner-supplied credentials in the active
> conversation worked. Admin and anbardar live legs promoted M17-01, M17-02,
> M17-06…M17-10 and M17-110. Current mechanically derived tally is **85 CODE
> VERIFIED / 8 LIVE VERIFIED / 0 IN PROGRESS / 0 NOT STARTED / 17 BLOCKED /
> 110 unique**. M17-17…21 and M17-28 remain blocked because presentation is not
> catalog, server-refusal or captured-network evidence. Continue only with an
> authority-gated remaining row; do not redo the completed live presentation
> sweep. [Audit](./audits/2026-09-12-phase17-admin-anbardar-readonly-live-check.md).

> **AUTHORITATIVE PHASE 17 UPDATE — 2026-09-12 (latest, export integration).**
> The template EXPORT ORCHESTRATION is now built and wired, completing the
> four rows Codex left IN PROGRESS. `web/src/lib/azpExportRun.ts` fetches
> `./azpetrol-template.xlsx`, loads it through JSZip, writes back the
> worksheet patched in exactly `dimension`/`cols`/`sheetData`/`mergeCells`,
> removes the other module's sheet from `workbook.xml`,
> `workbook.xml.rels` and `[Content_Types].xml` plus its part, its rels and
> `xl/calcChain.xml`, generates one blob and downloads it under the legacy
> filename; its catch branch actually runs the plain SheetJS fallback with the
> exact «Şablonsuz ixrac (dizayn tətbiq olunmadı)» warning, and when SheetJS
> is also absent the ORIGINAL error surfaces with no success claim.
> `web/src/lib/azpSheetBuild.ts` carries the shared sheet model both writers
> consume, so a fallback cannot ship a different dataset. The page's
> `azp-exp-<m>` control is wired, shows «Hazırlanır…» while running, restores
> its prior state in `finally`, and starts one export per click even when
> double-clicked in flight. Current tally: **93 CODE VERIFIED / 0 IN PROGRESS
> / 0 NOT STARTED / 17 BLOCKED / 110 unique** — DERIVED by
> `node tools/ledger-check-m17.mjs`, which first FAILED against the stale
> 89/4 banner.
> Codex's final audit added the missing production JSZip dependency and
> published the existing template under `web/public`; do not revert to an
> undeclared `globalThis.JSZip` dependency or remove the asset.
>
> **NOTHING WAS EXECUTED.** Zero Supabase writes, zero RPC invocations, no
> TEST fixture, no live import, no `azp_delete_card` call, no real-data
> export, and no production contact. Every fixture is hand-written and
> `fetch`, JSZip, SheetJS and the anchor download are all injected doubles.
>
> **M17-100 was NOT promoted.** Synthetic export tests prove the control flow;
> they are not authority for, and not evidence about, real egress.
>
> **THAT DELIVERY GAP IS CLOSED (Codex, 2026-09-12).** The paragraph here
> previously recorded that JSZip was undeclared and `web/public/` carried no
> template, so every real click fell back. Codex added `jszip` as a production
> dependency, changed the resolver to import that package instead of
> `globalThis`, and published the template at
> `web/public/azpetrol-template.xlsx` (21,427 bytes, SHA-256 identical to the
> repository source). Verified still in place. Do NOT revert the resolver to
> `globalThis.JSZip` and do NOT remove the asset.
>
> **LIVE READ-ONLY CLOSURE ATTEMPTED AND BLOCKED (2026-09-12).** The cheapest
> authenticated TEST read-only window was NOT executed: no authenticated TEST
> identity is available to a session — no process credential, no saved browser
> session, no persistent profile, no harness, no Playwright. `.env*` carries a
> project URL and anon key only, and an anon key is not an identity because
> every `azp_*` policy is gated on `azp_can_read()` → `auth.uid()`. Nothing was
> run and no row moved. Do not retry without a credential and do not
> re-run offline tests in its place. The boundary and the exact minimal owner
> input are recorded ONCE in
> [the identity-boundary record](./audits/2026-09-12-phase17-live-readonly-identity-boundary.md).
> Ceiling if that input arrives: M17-28 and M17-20 fully, M17-21 and M17-18 in
> their OBSERVABLE halves only. M17-17 and M17-19 are catalog/function-body
> facts and must NEVER be promoted from UI evidence.
>
> Do not reimplement or repeat any completed slice. The 17 remaining rows are
> BLOCKED on evidence Phase 17 cannot produce offline, not on code:
> M17-17…M17-21 and M17-28 need an authenticated identity and a live server
> answer; M17-80…M17-89 need an authorised TEST execution window; M17-100
> needs authorised egress. D-T8 remains the accepted additive-checker policy.
> Phase 17 remains NOT ACCEPTED and awaits independent Codex audit.
> [Export integration audit](./audits/2026-09-12-phase17-export-integration.md)
> · [Offline slice Codex audit](./audits/2026-09-12-phase17-offline-slice-codex-audit.md)
> · [Read-only Codex audit](./audits/2026-09-12-phase17-readonly-codex-audit.md)

> **HISTORY — SUPERSEDED PHASE 17 BANNER (2026-09-12, offline write/import
> slice).** Retained as chronology. It read: the admin affordances (M17-15,
> M17-16, M17-67, M17-70), the complete Excel import parser (M17-90…M17-94)
> and a write client for all seven `azp_*` RPCs behind seven new `azp.*`
> mutationGuard actions exist; Codex corrected its payload model (`id`,
> `doc_num`, `note`); M17-95/96/98/99 remained IN PROGRESS because only pure
> helpers existed; tally 89 CODE VERIFIED / 4 IN PROGRESS / 0 NOT STARTED /
> 17 BLOCKED / 110 unique. Those four rows are now complete.

> **HISTORY — SUPERSEDED IMPLEMENTATION INSTRUCTION.** The following Phase 17
> design update is retained only as chronology.

> **PHASE 17 DESIGN UPDATE — 2026-09-12 (SUPERSEDED).** The Phase 17 design
> package exists and its decision-independent, server-free pure-logic slice is
> implemented: role mapping (a browser affordance, never a permission), the
> numeric and date normalisers, the shared row filter, the inclusive date
> range with its undated-row counter, the totals and opening-balance rules,
> and the report model with its export matrix. **No page, route, rail entry,
> store, API module, CSS rule, write path, import or export writer was built,
> and no Supabase project was contacted.** For the tally, read the ledger —
> this banner deliberately restates no figure. **Every remaining write row is
> blocked on an owner decision:** D-T1 (write containment), D-T2 (a TEST
> fixture whose residuals are permanent and NOT exactly restorable), D-T3
> (destructive `azp_delete_card`), D-T4 (import), D-T5 (bulk export egress),
> D-T6 (realtime), D-T7 (stale `sql/020`/`021` headers) and D-T8 (ledger
> tooling). Do not implement or invoke any Phase 17 write path until D-T1…D-T4
> are decided. The independent Codex design audit is complete and corrected
> M17-110 evidence attribution, M17-63 classification and the checker gap.
> Current tally is 44 CODE VERIFIED / 49 NOT STARTED / 17 BLOCKED / 110
> unique. Phase 17 remains NOT ACCEPTED.
> [Proposal](./specs/2026-09-12-react-migration-phase17-azpetrol-araz-proposal.md) ·
> [Ledger](./specs/2026-09-12-phase17-registry-rows.md) ·
> [Plan](./plans/2026-09-12-react-migration-phase17-azpetrol-araz.md) ·
> [Design handoff audit](./audits/2026-09-12-phase17-design-handoff.md)
> · [Codex design audit](./audits/2026-09-12-phase17-design-codex-audit.md)

# Claude next task — Phase 16 authority-gated closure (STILL OPEN)

> **AUTHORITATIVE PHASE 16 UPDATE — 2026-09-11 (latest).** The safe Settings
> slice AND M16-11 are implemented: route/shell, permission matrix, source
> counts, partner export, Audit-disabled contract, read-only user states, and
> the Settings→page export delegation that reuses each page's own accepted
> export. Ledger: 16 CODE VERIFIED, 0 NOT STARTED, 8 BLOCKED, 24 unique. Do
> not reimplement. **Every remaining row is blocked on an owner decision:**
> D-S1 (full JSON backup / bulk data egress), D-S2 (bulk import write path —
> also needs a separate TEST write window) and D-S3 (role/user mutation —
> also needs an authenticated TEST admin identity). Resolve those with the
> owner; then implement only the explicitly authorised portions. Phase 16
> remains NOT ACCEPTED pending Codex's independent acceptance audit.
> [Ledger](./specs/2026-09-11-phase16-registry-rows.md) ·
> [Safe-slice audit](./audits/2026-09-11-phase16-safe-slice.md) ·
> [M16-11 audit](./audits/2026-09-11-phase16-m16-11-export-delegation.md)

# Claude next task — Phase 15 live closure / independent audit (SUPERSEDED)

> **AUTHORITATIVE PHASE 15 UPDATE — 2026-09-11.** Finance and Controls are
> implemented. Ledger: 56 CODE VERIFIED, 4 NOT STARTED (M15-10, M15-17,
> M15-58, M15-60), 60 unique. Offline gates pass. Do not reimplement or repeat
> legacy research. The remaining work is the narrow authenticated read-only
> TEST matrix and independent Codex audit. If suitable role sessions remain
> unavailable, preserve these gaps and continue the next independent roadmap
> work under reliability protocol §13.
> [Ledger](./specs/2026-09-11-phase15-registry-rows.md) ·
> [Implementation audit](./audits/2026-09-11-phase15-implementation.md)

# Claude next task — Phase 14 (SUPERSEDED)

> **AUTHORITATIVE AUDIT UPDATE — 2026-09-11 (latest).** Codex independently
> verified Phase 14: 177 files / 3935 tests, typecheck, lint, sandbox build,
> diff hygiene and the 99-row ledger all pass. One M14-14 test-harness
> `act()` warning was corrected without application-code change. **Phase 14
> remains NOT ACCEPTED** only for M14-10 (authenticated four reads), M14-17
> (live realtime/debounce), and M14-99 (admin/anbardar RLS comparison). Do not
> reimplement source or repeat offline gates. Run this narrow read-only TEST
> matrix once existing admin and anbardar sessions are available. **Do not wait
> on those isolated evidence gaps:** preserve them and continue the independent
> Phase 15 roadmap work under reliability protocol §13.

> **SUPERSEDED INSTRUCTION — 2026-09-11.** The following prior next-step
> banner is retained as chronology.

> **AUTHORITATIVE NEXT STEP — 2026-09-11 (SUPERSEDED). PHASE 14 IMPLEMENTED ON
> CLAUDE'S SIDE; next step is Codex's independent audit.** Do not re-implement
> and do not repeat the design research. The owner resolved D-P1 (reuse the
> accepted Phase 10 dead-stock functions as the single derivation, Phase 10
> behaviour unchanged); D-P2, D-P3 and D-P4 were implemented as recommended,
> each with a pinning test.
>
> **T8 did NOT run — no TEST identity was supplied** (`web/.env.sandbox.local`
> targets TEST `alkjjbaawmsirsfvqljm` with `VITE_ALLOW_LOCAL_WRITES=false` and
> carries only a URL and an anon key; no user/password variable exists). **0
> Supabase contacts, 0 authenticated reads, 0 writes, 0 RPCs.** This phase
> performs no write by design, so nothing needs cleaning up.
>
> **Tally, measured mechanically from the 99 `| M14-* |` status cells: 96
> `CODE VERIFIED`, 0 `LIVE VERIFIED`, 0 `IN PROGRESS`, 3 `NOT STARTED`
> (M14-10, M14-17, M14-99), 0 `BLOCKED`, 0 unclassified; 99 unique ids, 0
> duplicates.** Gate: 177 files / 3935 tests (baseline 168 / 3741),
> `tsc -b --noEmit`, `oxlint src`, sandbox build, `git diff --check` clean, 0
> staged, dirty tree preserved. Phase 14 remains **NOT ACCEPTED**.
> [Implementation audit](./audits/2026-09-11-phase14-implementation.md) ·
> [Ledger (99 rows)](./specs/2026-09-11-phase14-registry-rows.md)

> **SUPERSEDED — the Phase 13 material below is retained as chronology.**

# Claude next task — Phase 13 (SUPERSEDED)

> **AUTHORITATIVE CLOSURE UPDATE — 2026-09-11 (latest).** The owner accepted
> M13-91's missing rehber live refusal as non-blocking. A TEST Supabase
> Dashboard `SELECT` read-back under database role `postgres` closed M13-94:
> `audit_log` contains 7 INSERT, 2 UPDATE and 7 DELETE
> `serfiyyat_documents` records with exact reasons; every DELETE retains header
> fields and `lines` in `old_values`. No database mutation occurred. **Tally:
> 68 `CODE VERIFIED`, 9 `LIVE VERIFIED`, 0 `IN PROGRESS`, 0 `NOT STARTED`,
> 0 `BLOCKED`, 0 unclassified; 77 unique rows.** The final independent Codex
> acceptance audit passed: **Phase 13 is ACCEPTED.** Do not reopen it unless a
> concrete regression is found; continue with the next planned phase.

> **SUPERSEDED STATUS BANNER — 2026-09-11.** The following prior banner is
> preserved as chronology only.

> **AUTHORITATIVE NEXT STEP — 2026-09-11 (SUPERSEDED). PHASE 13 IMPLEMENTED ON
> CLAUDE'S SIDE; next step is Codex's final independent audit.** Do not
> re-implement, do not repeat the design research, and do not rerun the gate
> unless application or test code changes. The owner accepted D-N1, D-N2,
> D-N3, D-N5, D-N6 and D-N7.
>
> **T7 ran and its temporary TEST fixtures were deleted.** Both TEST identities
> authenticated; real UI create/edit/delete was followed by server checks for
> direct-table refusal, negative-quantity refusal and line-id replacement.
> The approved permanent residual is document-sequence/audit history; audit-log
> rows remain unreadable to this TEST admin. Do not repeat the obsolete
> six-argument compatibility probe. See the [live-window audit](./audits/2026-09-11-phase13-t7-live-window.md).
>
> **Tally, measured mechanically from the 77 `| M13-* |` status cells: 67
> `CODE VERIFIED`, 8 `LIVE VERIFIED` (M13-52, M13-53, M13-70, M13-71,
> M13-90, M13-92, M13-93, M13-98), 2 `IN PROGRESS` (M13-91, M13-94), 0
> `NOT STARTED`, 0 `BLOCKED`, 0 unclassified; 77
> unique ids, 0 duplicates.** Gate: 168 files / 3741 tests, `tsc -b --noEmit`,
> `oxlint src`, sandbox build (238 modules), `git diff --check` clean, 0
> staged, dirty tree preserved. Phase 13 remains **NOT ACCEPTED**.
> [Implementation audit](./audits/2026-09-11-phase13-implementation.md).

> **PHASE 13 DESIGN ACCEPTED — 2026-09-11 (SUPERSEDED AS AN INSTRUCTION by
> the implementation banner above; its design verdict still stands).** Do not
> repeat design research. Codex corrected D-N4 (withdrawn: string `"0"` is
> truthy and applies the zero bound) and M13-13/T4 (the three core table reads plus the required item catalogue
> reads are jointly fatal; reference-values failure is non-fatal). All 77 rows
> remain `NOT STARTED`. Await and record the owner's decisions D-N1…D-N3 and
> D-N5…D-N7; then implement the approved scope as one coherent pass. Do not
> execute any TEST write until D-N1 is explicitly accepted with its permanent
> sequence/audit residuals. Phase 13 remains NOT STARTED / NOT ACCEPTED.
> [Audit](./audits/2026-09-11-phase13-design-codex-audit.md).

> **PHASE 13 DESIGN PACKAGE DRAFTED — 2026-09-11 (latest). Next step: Codex's
> independent design audit, then owner decisions D-N1…D-N7.** **SUPERSEDED by
> the audited banner above.** Claude produced
> the [proposal](./specs/2026-09-11-react-migration-phase13-serfiyyat-materiallari-proposal.md),
> the authoritative [77-row `M13-*` ledger](./specs/2026-09-11-phase13-registry-rows.md),
> the [TEST-only plan](./plans/2026-09-11-react-migration-phase13-serfiyyat-materiallari.md)
> and the [design handoff audit](./audits/2026-09-11-phase13-design-handoff.md).
> **Tally, measured mechanically from the 77 `| M13-* |` rows: 0 `CODE
> VERIFIED`, 0 `LIVE VERIFIED`, 0 `IN PROGRESS`, 77 `NOT STARTED`, 0
> `BLOCKED`, 0 unclassified; 77 unique ids, 0 duplicates.** No application
> code exists for this module and no row is promoted. No Supabase project was
> contacted in the design session; no application, test, SQL or CSS file was
> changed; the dirty tree is preserved and staging is empty.
>
> Phase 13 is the migration's FIRST document workflow that is not a stock
> movement, and its largest legacy surface so far (~500 lines, 19 helpers, two
> independent Excel import paths). Its server contract `sql/032` is applied and
> unchanged — **no SQL change is proposed**. **D-N1 is the write gate:** unlike
> Phase 12's approval a document IS catalogue-reversible (create → delete), but
> the window is not database-net-zero — the consumed `serfiyyat_doc_seq` value
> never returns and three `audit_log` rows remain. A TEST admin identity is
> still unavailable — the same boundary M10-51, M11-91 and M12-98 carry.
> Two corrections were recorded in passing rather than hidden: a fabricated
> CSS line range in the proposal's first §8 draft, and an 86-row prose estimate
> that the mechanical parse corrected to 77. Phase 13 remains
> `NOT STARTED / NOT ACCEPTED`.

> **SUPERSEDED AS AN INSTRUCTION — 2026-09-11.** The banner below assigned the
> Phase 13 design task. That task is now DONE; its package is named in the
> banner above. The Phase 12 acceptance it records still stands, and its
> prohibition on implementing Phase 13 application code likewise stands until
> Codex's design audit passes and the owner answers D-N1…D-N7.

> **AUTHORITATIVE CONTINUATION — 2026-09-11. Phase 12 is ACCEPTED for the
> owner-approved scope D-M1 and D-M3…D-M6.** Do not repeat Phase 12
> implementation or its gates. D-M2 remains deferred and must not be executed
> without a new explicit owner decision. Read the final audit:
> `audits/2026-09-11-phase12-final-codex-acceptance.md`.
>
> Begin **Phase 13 design/reconciliation only** for the next unmigrated legacy
> area, «Sərfiyyat Materialları» (`rSm()`). Inspect the actual legacy entry
> point and every helper/server dependency it calls, then create one proposal,
> one authoritative unique `M13-*` ledger, one TEST-only plan and one design
> handoff audit. Separate UI affordances from server permissions and distinguish
> read-only, reversible TEST writes and permanent residuals. Preserve the dirty
> tree; do not implement application code, mutate TEST, contact production,
> stage, commit, push or deploy. Return the package for independent Codex design
> audit and owner decisions. Phase 13 remains NOT STARTED / NOT ACCEPTED.

## Phase 12 history

> **PHASE 12 IMPLEMENTED ON CLAUDE'S SIDE — 2026-09-11 (latest). Next step:
> Codex's independent audit.** **SUPERSEDED by the acceptance banner above.** Do not re-implement, re-audit the code line by
> line, or rerun the gate unless application or test code changes. T1-T6 and
> T8 ran as one block; **T7 was NOT run and D-M2 remains deferred** — no TEST
> request was created, withdrawn, rejected or approved, and no permanent TEST
> item or 7-digit code exists. New files: `lib/nomenclatureRequests.ts`,
> `api/itemRequests.api.ts`, `store/itemRequests.store.ts`,
> `pages/ItemRequestsPage.tsx` and the two `components/item-requests/`
> dialogs, each with its own test file; additive edits to `mutationGuard.ts`
> (four `nreq.*` actions), `index.css` (five verbatim legacy rules) and
> `App.tsx` (the `nreq` route and rail entry, plus its two rail fixtures).
> **Tally, measured mechanically from the 70 `| M12-* |` status cells: 61
> `CODE VERIFIED`, 0 `LIVE VERIFIED`, 3 `IN PROGRESS` (M12-04, M12-24,
> M12-98), 6 `NOT STARTED` (M12-78, M12-91, M12-92, M12-94, M12-95, M12-96),
> 0 `BLOCKED`, 0 unclassified.** Gate: 157 files / 3429 tests, tsc, oxlint,
> sandbox build, `git diff --check` clean, 0 staged, dirty tree preserved.
> Five targeted mutants (containment threshold, store atomicity, epoch date,
> search haystack, swallowed read failure) each broke exactly their intended
> test and were restored byte-for-byte.
> **External boundary:** no TEST identity was supplied, so **no row is
> `LIVE VERIFIED`** — the read-only sweep armed its production-abort and
> blanket mutation guards, reached the login gate and stopped (**0 Supabase
> mutations, 0 production contacts, 0 write attempts**). Supply a TEST
> anbardar only as a process-only variable to run the T6 legs; the six
> `NOT STARTED` rows additionally need D-M2. Phase 12 remains **NOT
> ACCEPTED**. Evidence:
> `audits/2026-09-11-phase12-implementation.md`.

> **IMPLEMENTATION AUTHORISED — 2026-09-11 (authoritative).** Owner accepted
> D-M1 and D-M3…D-M6 and authorised complete Phase 12 code implementation and
> read-only TEST verification. D-M2 remains explicitly deferred: no TEST
> request create/withdraw/reject/approve and no permanent item/code.
> [Decision](./decisions/2026-09-11-phase12-design-scope.md) ·
> [Codex design audit](./audits/2026-09-11-phase12-design-codex-audit.md).

FAST CONTINUATION MODE. Execute the accepted Phase 12 plan from T1 through
T6 and T8 as one coherent block. Do not run T7. Do not stop because D-M2,
admin credentials or server-live write evidence are unavailable; implement
and verify every independent contract, then leave only the exact D-M2 clauses
unpromoted.

Required execution:

1. Read the owner decision, Codex design audit, corrected proposal, corrected
   70-row ledger, TEST-only plan and reliability protocol. Preserve all
   accepted Phase 1–11 work and the entire dirty tree.
2. Implement the pure nomenclature-request logic, API wrappers and failure
   normalisation, atomic store/retention/ticket ordering, page, create/review
   dialogs, App route/rail gate, mutation-guard actions and approved CSS.
3. Keep browser affordances separate from server authority. A failed
   `item_requests` read must be explicit `ok:false`; never apply it as a
   successful empty snapshot. Withdrawal/rejection are not database-net-zero.
   The UI silent early return must never satisfy an RPC refusal row.
4. Add falsifiable positive, negative and equality-boundary tests for every
   implemented contract. Reuse the existing normaliser simulation cases, but
   do not treat the model as live server evidence. Verify tests fail for the
   intended reason against targeted mutations before reporting them.
5. Run focused tests during implementation, then one final gate: full suite,
   `tsc -b --noEmit`, `oxlint src`, sandbox production build,
   `git diff --check`, empty staging and regression checks for accepted
   shared modules.
6. Run the complete T6 read-only browser sweep on TEST with writes disabled,
   a hard production abort and blanket mutation abort. Verify route/role UI,
   exact reads, filters, table, dialogs without submitting, failure retention
   for HTTP and transport errors, recovery, zero write attempts and zero
   production contacts.
7. Reconcile the ledger and authority documents once at the end. Promote only
   exact evidence. D-M2-dependent persisted/server-live clauses must remain
   `NOT STARTED`, `IN PROGRESS` or `CODE VERIFIED` as their exact evidence
   warrants; their existence is not a blocker to completing this run.

Hard constraints: TEST `alkjjbaawmsirsfvqljm` only; never production
`bbjmhaerssakbreykxiw`; sandbox mode only; `VITE_ALLOW_LOCAL_WRITES=false`
for browser work; no Supabase mutation, request creation, withdrawal,
rejection, approval, fixture, SQL change, stage, commit, push or deploy; do
not read/store/print passwords; do not implement Phase 13.

Return one concise implementation/read-only report for Codex's independent
audit. Phase 12 remains NOT ACCEPTED.

> **PHASE 12 DESIGN AUDITED — 2026-09-11 (authoritative).** Codex passed the
> design after correcting the failed-read/atomic-snapshot contradiction,
> immutable-history accounting and the withdrawal UI/server attribution.
> Implementation remains unauthorised until the owner answers D-M1…D-M6;
> D-M2 requires explicit acceptance of permanent TEST residuals, not a
> generic continuation instruction.
> [Audit](./audits/2026-09-11-phase12-design-codex-audit.md).

> **AUTHORITATIVE NEXT TASK — 2026-09-11.** Phase 11 is independently
> `ACCEPTED`. Begin **Phase 12 design only** for «Nomenklatura sorğuları»
> (legacy `rNreq()`). Do not implement application code until Codex accepts
> the Phase 12 design package. The Phase 11 material below is completed
> history.

Use FAST CONTINUATION MODE. Preserve all verified work; do not restart or
repeat accepted Phases 1–11.

Required work:

1. Read the roadmap, the Phase 11 final audit, the accepted nomenclature and
   role/RLS evidence that `rNreq()` directly depends on, and only the legacy
   request page plus directly called helpers, loaders, RPCs and policies.
2. Inventory the exact end-to-end contract: rail/role visibility, request
   creation and validation, request states and transitions, approval/refusal
   authority, server enforcement, idempotency/concurrency, tables, filters,
   forms/dialogs, audit effects, realtime, loading/errors/retention, and
   navigation handoffs.
3. Treat this as a write workflow: separate browser affordances from
   server-authoritative permissions; identify every TEST fixture and exact
   net-zero or immutable-history closure requirement. Never infer security
   from hidden UI controls.
4. Produce exactly one Phase 12 proposal, one authoritative unique `M12-*`
   ledger, one TEST-only implementation/verification plan, and one design
   reconciliation/handoff audit. Separate strict legacy parity, accepted
   safety precedents and optional improvements. Raise only genuine owner
   decisions, each with a recommendation.
5. Validate row totals mechanically, markdown tables, relative links,
   authority-summary consistency, `git diff --check` and empty staging. Read
   back every changed authority surface before reporting.

Hard constraints: TEST `alkjjbaawmsirsfvqljm` only; never contact production
`bbjmhaerssakbreykxiw`; sandbox mode; no application implementation or
Supabase mutation in this design task; no fixture, layer change, cutover,
stage, commit, push or deploy; preserve the dirty tree; never store or print
passwords. Do not stop for unavailable credentials—record the narrow live
evidence boundary and complete all independent source/design work.

Return one concise report for Codex's independent Phase 12 design audit.
Phase 12 remains `NOT STARTED / NOT ACCEPTED`.

> **PHASE 12 DESIGN PACKAGE DRAFTED — 2026-09-11 (latest). Next step: Codex's
> independent design audit, then owner decisions D-M1…D-M6.** Claude produced
> the [proposal](./specs/2026-09-11-react-migration-phase12-nomenclature-requests-proposal.md),
> the authoritative [70-row `M12-*` ledger](./specs/2026-09-11-phase12-registry-rows.md),
> the [TEST-only plan](./plans/2026-09-11-react-migration-phase12-nomenclature-requests.md)
> and the [design handoff audit](./audits/2026-09-11-phase12-design-handoff.md).
> **Tally, measured mechanically from the 70 `| M12-* |` rows: 0 `CODE
> VERIFIED`, 0 `LIVE VERIFIED`, 0 `IN PROGRESS`, 70 `NOT STARTED`, 0
> `BLOCKED`, 0 unclassified; 70 unique ids, 0 duplicates.** No application
> code exists for this module and no row is promoted. No Supabase project was
> contacted in the design session; no application, test, SQL or CSS file was
> changed; the dirty tree is preserved and staging is empty.
>
> Phase 12 is the migration's FIRST multi-role write workflow, so every
> browser affordance row is kept separate from its server-authoritative
> counterpart (M12-07 vs M12-91, M12-40/41 vs M12-91). Its server contract
> `sql/017` is applied and unchanged — **no SQL change is proposed**.
> **D-M2 is the acceptance gate:** without an authorised narrow TEST write
> window the write rows cannot be promoted, and approval is explicitly NOT
> reversible (it permanently creates an item and consumes a 7-digit code). A
> TEST admin identity is still unavailable — the same boundary M10-51 and
> M11-91 carry. Phase 12 remains `NOT STARTED / NOT ACCEPTED`.

> **PHASE 11 IMPLEMENTATION COMPLETE ON CLAUDE'S SIDE — 2026-09-11 (latest).
> Next step: Codex's final independent audit.** Do not re-implement, re-audit
> the code line by line, or rerun the gate unless application or test code
> changes. The owner accepted the complete recommended package D-L1…D-L5
> ([decision](./decisions/2026-09-11-phase11-design-scope.md)) and the
> [design audit](./audits/2026-09-11-phase11-design-codex-audit.md) passed, so
> T1-T4 ran as one block: `lib/dashboard.ts`, `lib/dashboardCharts.ts`,
> `lib/controlIssues.ts`, `api/dashboardSnapshot.api.ts`,
> `store/dashboard.store.ts`, `components/dashboard/{BarChart,Donut}.tsx`,
> `pages/DashboardPage.tsx`, the `dash` route/rail/default in `App.tsx` and
> the D-L5 CSS port. No earlier accepted module's file was modified.
> **Tally, measured mechanically from the 55 `M11-*` rows: 28 `CODE
> VERIFIED`, 26 `LIVE VERIFIED`, 1 `IN PROGRESS` (M11-91 admin leg), 0 `NOT
> STARTED`, 0 unclassified.** Gate: 151 files / 3270 tests, tsc, oxlint,
> sandbox build, `git diff --check` clean, 0 staged. Live read-only sweep
> (anbardar, TEST only, **0 production hits, 0 write attempts**): landing
> page and rail order, the exact four-read request set, subtitle, selector
> with persistence, five KPIs reconciled against the balances screen,
> both charts including the selector asymmetry, both tables, «Hamısı», the
> item card, and retention under injected 503 AND network abort with
> recovery. External boundary: no TEST admin (or rehber) identity — supply one
> only as a process-only variable if the admin comparison leg is to be run.
> Phase 11 remains `NOT ACCEPTED`. Evidence:
> `audits/2026-09-11-phase11-implementation-live-check.md`.

> **PHASE 11 DESIGN PACKAGE DRAFTED — 2026-09-11 (HISTORY; superseded by the
> banner above, which carries the current tally).** Claude produced the
> [proposal](./specs/2026-09-11-react-migration-phase11-dashboard-proposal.md),
> the authoritative [55-row `M11-*` ledger](./specs/2026-09-11-phase11-registry-rows.md),
> the [TEST-only plan](./plans/2026-09-11-react-migration-phase11-dashboard.md)
> and the [design handoff audit](./audits/2026-09-11-phase11-design-handoff.md).
> **HISTORY —** at that moment the tally was 55 `NOT STARTED` with 0 in every
> other status, and no application code existed. That figure is superseded;
> the current one is in the banner at the top of this file. The five
> decisions named there (D-L1 landing page, D-L2 exports → Phase 16, D-L3
> alerts card, D-L4 selector rebuild, D-L5 CSS) are now all owner-approved,
> and the instruction not to implement is likewise superseded.

> **AUTHORITATIVE NEXT TASK — 2026-09-11.** Phase 10 is independently
> `ACCEPTED`. Begin **Phase 11 design only** for the legacy Dashboard
> (`rDash()`). Do not implement application code until Codex accepts the
> Phase 11 design package. The Phase 10 material below is retained as
> completed history.

Use FAST CONTINUATION MODE: preserve verified prior work, do not restart
completed phases, and do not repeat gates or live scenarios unless a changed
file or a concrete audit finding requires it.

Required work:

1. Read the post-Phase-9 roadmap, the Phase 9 and Phase 10 final acceptance
   audits, their owner decisions, and only the legacy `rDash()` code plus
   directly used helpers.
2. Inventory the exact dashboard contract: route/rail/role visibility, every
   KPI and aggregation formula, source datasets and RLS assumptions,
   tables/charts/cards, navigation and drill-down actions, empty/loading/error
   states, failed-refresh retention, realtime subscriptions, formatting,
   limits, and any export/print behaviour.
3. Reuse accepted Phase 9/10 snapshot and calculation contracts where they
   are genuinely identical. Do not copy logic, widen queries, or invent a
   new store when an accepted shared primitive already fits. Record exact
   dependencies and regression obligations.
4. Create one Phase 11 proposal, one authoritative `M11-*` ledger with unique
   mechanically countable rows, one TEST-only implementation plan, and one
   design-handoff/reconciliation audit. Keep legacy parity separate from
   proposed improvements. Raise only genuine owner decisions and include a
   recommendation for each.
5. Run documentation integrity checks: unique row ids/count, markdown tables,
   relative links, current-status summaries, `git diff --check`, and empty
   staging. Read back every changed authority surface before reporting.

Hard constraints: TEST project `alkjjbaawmsirsfvqljm` only; never contact
production `bbjmhaerssakbreykxiw`; sandbox mode only; no application
implementation, Supabase mutation, fixture, layer deactivation, cutover,
stage, commit, push or deploy; preserve the entire dirty tree; `Çap` stays
outside acceptance unless the owner explicitly changes that decision. Do not
stop for already-resolved Phase 10 matters. If evidence is unavailable,
record the narrow evidence boundary and continue every independent design
task that remains possible.

Deliver one concise report for Codex's independent Phase 11 design audit.
Phase 11 remains `NOT STARTED / NOT ACCEPTED`.

> **PHASE 10 IMPLEMENTATION COMPLETE ON CLAUDE'S SIDE — 2026-09-11 (latest).
> Next step: Codex final independent audit.** Do not re-implement, re-audit
> the code line by line, or rerun the gate unless application or test code
> changes. What was done: the pre-existing Module K code was audited against
> legacy `index.html` and preserved; three concrete defects fixed (M10-49
> export alias `whLabel`, M10-33 partner key `m.p || '(göstərilməyib)'`,
> legacy `tbl()` empty block + `th.r` + `cut(rows,'dead')`); tests added for
> the store (retention, stale ordering), realtime table set, rail order and
> single active entry, inactive locations, admin/non-admin «Yeni ünvan», D-K1
> placement, 29/30 boundary, transfer-only vs ordinary outbound, reference
> date + today fallback, descending sort, three KPIs, eight-column export over
> the full set, item-card handoffs, failed-refresh retention. Gate: 144 files
> / 3153 tests, tsc, oxlint, sandbox build, `git diff --check` clean, 0
> staged. Live read-only sweep (anbardar, TEST only, 0 production hits, 0
> write attempts): request set, RLS-shaped data with the unscoped warehouse
> list, disabled affordance, both tables' headers/badges, the D-K1 tab, and
> retention under injected 503 AND network abort with recovery. **Tally,
> mechanically from the 36 `M10-*` rows: 26 `CODE VERIFIED`, 9 `LIVE VERIFIED`,
> 1 `IN PROGRESS` (M10-51 admin leg), 0 `NOT STARTED`.** External boundary:
> no TEST admin (or rehber) identity — supply one only as a process-only
> variable if the admin comparison leg is to be run. Phase 10 remains
> `NOT ACCEPTED`. Evidence:
> `audits/2026-09-11-phase10-implementation-live-check.md`.

> **AUTHORITATIVE CODEX UPDATE — 2026-09-10. STOP: Phase 9 / Module J is
> `ACCEPTED`.** Do not resume Phase 9 implementation, T10, T0B or the historical
> instructions below. Preserve the owner-approved TEST metadata residual and
> the unpromoted external evidence boundaries. Do not repeat the six-argument
> probe or attempt direct-table repair. Read the
> [scope decision](./decisions/2026-09-10-phase9-acceptance-scope.md) and
> [final audit](./audits/2026-09-10-phase9-final-codex-acceptance.md). A later
> phase must begin only from its own approved proposal/ledger; none is inferred
> here.

> **PHASE 10 DESIGN KICKOFF — 2026-09-10 (SUPERSEDED by the authoritative
> acceptance update below).** Phase 9 is accepted. Phase 10 was
> now in design research only: «Anbar və layihələr» plus the `dead` report.
> Read [`specs/2026-09-10-react-migration-phase10-warehouses-dead-proposal.md`](./specs/2026-09-10-react-migration-phase10-warehouses-dead-proposal.md)
> plus the [36-row draft ledger](./specs/2026-09-10-phase10-registry-rows.md)
> and [TEST-only draft plan](./plans/2026-09-10-react-migration-phase10-warehouses-dead.md).
> Independently audit and reconcile the Phase 10 ledger and plan;
> verify every contract against legacy source and current Phase 9 consumers.
> At that point application code was blocked pending independent design review
> and owner decisions D-K1 through D-K3; both are now complete below.

> **AUTHORITATIVE PHASE 10 UPDATE — 2026-09-10. DESIGN ACCEPTED; IMPLEMENTATION
> AUTHORISED.** D-K1…D-K3 are owner-approved. Read the proposal, 36-row ledger,
> approved plan, [decision](./decisions/2026-09-10-phase10-design-scope.md) and
> [design audit](./audits/2026-09-10-phase10-design-codex-acceptance.md), then
> execute T1 through T4 as one coherent block. Preserve existing Phase 9 code;
> reuse its balance/operational helpers and item card. Phase 10 is read-only:
> no Supabase mutation or write window. Update documentation once at the end,
> run focused tests during work and the full gate once after code completion.
> Phase 10 remains `NOT ACCEPTED` pending final independent Codex audit.

> **MANDATORY — read first.** [`CLAUDE_RELIABILITY_PROTOCOL.md`](./CLAUDE_RELIABILITY_PROTOCOL.md)
> is binding for every ANBAR task: exact contract before implementation,
> boundary matrices including the equality case, falsifiable positive/negative
> tests, first refusing guard, no generalisation beyond the tested dimension,
> distinct evidence levels, mechanically computed ledger tallies, contradiction
> sweep and final self-review. Independent Codex review remains authoritative
> for acceptance.

> **PHASE 9 ACCEPTANCE CLOSURE — 2026-09-10 (latest). Next step: Codex final
> independent audit.** Do not implement, re-probe or rerun anything. The
> package is closed on Claude's side; only these items remain and all are
> external: (1) **owner decision** on the T10 identity drift — the
> six-argument probe deleted and the next call re-inserted the
> `stock_conditions` row, so `created_at` and `updated_by` changed while
> quantities and note equal the baseline (content-equivalent, NOT byte-identical,
> NOT exact net-zero); accept as an identity-only residual or authorise a
> separate restoration — never a direct-table write, never delete `audit_log`
> history, never repeat the six-argument probe; (2) T0B catalog authority
> (M9-19) — no session has had it; (3) a TEST admin identity for the M9-109
> `audit_log` read-back and a rehber identity for that M9-108 leg — supply them
> only as a process-only variable, never in a repo file; M9-108's session leg
> is unreachable from the supported interface (captured `REVOKE … FROM anon`)
> and its NaN leg is structurally unavailable via JSON. Tally unchanged,
> derived mechanically from the 124 `| M9-* |` rows: 108 `CODE VERIFIED`, 6
> `NOT STARTED`, 6 `LIVE VERIFIED` (M9-10, M9-17, M9-18, M9-92, M9-141a,
> M9-146), 4 `IN PROGRESS` (M9-19, M9-99, M9-100, M9-108), 0 `BLOCKED`, 0
> unclassified. Phase 9 remains `NOT ACCEPTED`. Evidence:
> `audits/2026-09-10-phase9-t10-live-window.md` (§ Correction, § Closure pass).

> **CURRENT T10 PROGRESS — 2026-09-10.** The single live TEST window
> is done and audited (`audits/2026-09-10-phase9-t10-live-window.md`); the
> live UI read-only pass is done. Do not repeat either. **Authoritative tally,
> measured mechanically from the 124 `| M9-* |` rows: 108 `CODE VERIFIED`, 6 `NOT STARTED`, 6 `LIVE VERIFIED` (M9-10, M9-17, M9-18, M9-92, M9-141a, M9-146), 4 `IN PROGRESS` (M9-19, M9-99, M9-100, M9-108), 0 `BLOCKED`, 0 unclassified.**
> **What is left, and it is external:** (1) T0B catalog authority (M9-19,
> M9-99 signature); (2) an ADMIN identity to read back the server-written
> `audit_log` rows (M9-109) and to observe the rehber refusal text (M9-108);
> (3) the independent Codex acceptance audit. The six-argument fallback
> (M9-99/M9-100) is unreachable on the 031 schema — do not try to provoke it
> again; a six-argument call zeroes İcarə and can delete the row.

> **CURRENT T3 PROGRESS — 2026-09-10.** The page/store/API slice
> is complete and audited: the `bal` route is wired, `BalancesPage.test.tsx`
> carries 56 tests including the M9-134b cross-key regression, the
> `xlsFallback` harness defect and the `ConditionCell` lint defect are fixed.
> Do not repeat it. **Authoritative tally, measured mechanically from the 124
> `| M9-* |` rows (SUPERSEDED — T10): 112 `CODE VERIFIED`, 6 `NOT STARTED`, 1 `LIVE VERIFIED` (M9-141a), 5 `IN PROGRESS` (M9-19, M9-92, M9-99, M9-100, M9-108), 0 `BLOCKED`, 0 unclassified.**
> **Remaining Phase 9 work is live/server only:** T0B (M9-19, M9-99 signature),
> the Q4/T10 write window (M9-92 refusal, M9-100 probe, M9-108 texts, M9-109),
> then the independent Codex acceptance audit. No pure-logic slice remains.
> See `audits/2026-09-10-phase9-t3-balances-page.md`.

> **CURRENT T2 PROGRESS — 2026-09-10.** The «Əvvələ qalıq»
> reconstruction slice is complete: **M9-55, M9-70, M9-72…M9-77, M9-79, M9-79a,
> M9-79b and M9-84 are `CODE VERIFIED`; M9-71 is `IN PROGRESS`** (its sorting
> clause is verified, its `normalMovements()` source clause is not) in
> `lib/initialBalance.ts` (legacy
> `index.html:1898-1952, 1959-2048, 2240-2253`). Do not repeat it. **M9-84 is
> the owner-approved D-J4 correction** — the read recognises the marker in
> partner OR channel, delegating to the same predicate the write path uses;
> it is explicitly NOT byte-identical legacy behaviour. **M9-78, M9-80…M9-83
> and M9-85 were deliberately NOT promoted** — `BalancesPage.tsx` presentation
> that no pure test can evidence.
>
> **SUPERSEDED (T3):** at that slice the 124 rows measured 37 `CODE VERIFIED`, 84 `NOT STARTED`, 1 `LIVE VERIFIED` (M9-141a), 2
> `IN PROGRESS` (M9-19, M9-71), 0 unclassified (HISTORY); the current figure is in the T3 banner above.
>
> **CODEX CORRECTION ROUND — 2026-09-10.** **M9-71 is `IN PROGRESS`, not
> `CODE VERIFIED`:** its sorting clause is verified, but the
> `normalMovements()` operational-source clause is unimplemented —
> `buildInitialBalanceRows()` never calls `excludeCancelled()` and no caller
> imports it yet. It closes when the real `BalancesPage`/snapshot caller
> supplies `excludeCancelled()` output. Also corrected: `??` → legacy `||` on
> both item-name fallbacks (a real code defect), M9-70 now defers the marker
> FIELD SET to M9-84, and M9-79b's guard order is verified by source
> comparison only — the predicates commute, so order cannot be falsified from
> outputs. See `audits/2026-09-10-phase9-t2-initial-balance.md`.
>
> **SUPERSEDED next step:** the `lib/balanceExport.ts` slice named here is
> DONE and audited in T3; see the banner at the top of this file.

> **M9-51 BOUNDARY CORRECTION — 2026-09-10 (Codex-found).** The ledger wording
> `zero |q| < 1e-9` was wrong and now reads `<= 1e-9`. Legacy 2327-2329 rejects
> only `< 1e-9` for `act` and only `> 1e-9` for `zero`, so exactly `q = ±1e-9`
> belongs to **both** segments — intentional legacy behaviour the
> implementation already reproduced. **No application code changed**; three
> boundary tests were added (32 focused tests, was 29). This is a
> contract/evidence correction, so M9-51 stays `CODE VERIFIED`. **HISTORY —**
> the tally of that moment (25 / 97 / 1 / 1 / 0) was unaffected and is now
> superseded. The 37 / 84 / 1 / 2 / 0 tally that followed is likewise
> (SUPERSEDED — T3); the current figure is at the top of this file.

> **CURRENT T2 PROGRESS — 2026-09-10 (latest).** The filters/sorts/KPI slice is
> complete: **M9-51, M9-52, M9-54, M9-61 are `CODE VERIFIED`** in
> `lib/balanceFilters.ts` (legacy `index.html:2326-2345`). Do not repeat it.
> **M9-50 was deliberately NOT promoted** — its 200 ms debounce and paging
> reset are page concerns no pure test can evidence.
>
> **SUPERSEDED — tally and next step (2026-09-10).** **HISTORY —** this banner's
> tally (25 / 97 / 1 / 1 / 0) and its "next slice" instruction are superseded.
> The `initialBalance` slice named here is **DONE**; the 37 / 84 / 1 / 2 / 0
> tally that followed it is (SUPERSEDED — T3). The current figure is at the
> top of this file.
> The M9-51/52/54/61 promotions in this banner still stand.

> **EARLIER T2 PROGRESS — 2026-09-10.** The `balanceRows` slice is
> complete: **M9-30…M9-35, M9-42, M9-43, M9-45 are `CODE VERIFIED`**. Do not
> repeat it. `lib/balanceRows.ts` builds the three source shapes, the
> no-movement catalogue rows (with the exact `nomv` marker the future UI needs)
> and the display-only marker attachment. **M9-36 and M9-41 were deliberately
> NOT promoted** — they depend on presentation, KPI and export code that does
> not exist yet.
>
> **Next T2 slice:** filters, sorts and KPI aggregates (M9-51, M9-52, M9-54,
> M9-61) reading `BalanceRow` as input, and/or `lib/initialBalance.ts`
> (M9-70…M9-79b, M9-84) and `lib/balanceExport.ts` (M9-110…M9-116).
> See `audits/2026-09-10-phase9-t2-balance-rows.md`.
> **SUPERSEDED (2026-09-10):** this "next slice" instruction is HISTORY — the
> `initialBalance` slice is DONE and the ranges above are the slice's *scope*,
> not a status claim. Current statuses are in the banner at the top of this
> file: M9-71 is `IN PROGRESS`, M9-78 is `NOT STARTED`.
>
> **Baseline note:** `src/pages/ItemGroupsPage.test.tsx` can time out under full
> parallel load; it passes in isolation and passed in the latest full run. It is
> a flake, not a regression — do not "fix" it as part of another slice.

> **EARLIER T2 PROGRESS — 2026-09-10.** The condition pure-rule slice is
> complete: M9-90/M9-91 and M9-96/M9-97 are `CODE VERIFIED`. Do not repeat it.
> T0B remains separately blocked.
> See `audits/2026-09-10-phase9-t2-condition-pure-rules.md`.

> **CURRENT IMPLEMENTATION HANDOFF — 2026-09-10.** T0A passed under the owner
> waiver and **T1 is complete**: M9-21…M9-28 are `CODE VERIFIED`; see
> `audits/2026-09-10-phase9-t1-balance-index.md`. Do not repeat T0A or T1.
> Continue with **T2 pure logic**, starting with the smallest independently
> testable module. T0B-dependent work remains blocked on authorised catalog
> evidence. TEST/sandbox only; preserve the dirty tree; no production contact,
> stage, commit, push or deploy. Phase 9 remains `NOT ACCEPTED`.

> **SUPERSEDED ON ONE POINT — the banner below says «Phase 9 implementation is
> `NOT STARTED`». That was true when it was written and is now false:** T1 and
> part of T2 are complete. **HISTORY —** the tally at that point was 21
> `CODE VERIFIED` / 101 `NOT STARTED`. **The 37 / 84 / 1 / 2 / 0 figure that
> followed the T2 «Əvvələ qalıq» slice is (SUPERSEDED — T3)**; the current
> tally is at the top of this file.
> Everything else in the banner — the design acceptance, the T0A/T0B split and
> the safety boundary — still stands.

> **AUTHORITATIVE CODEX UPDATE — 2026-09-10. Phase 9 design is
> `ACCEPTED`; Phase 9 implementation is `NOT STARTED`.** Do not repeat the
> Phase 9 design audit and do not resume historical Phase 7 text below. Read
> `audits/2026-09-10-phase9-design-codex-acceptance.md`, then execute **T0A
> read-only** from `plans/2026-09-10-react-migration-phase9-balances.md` against
> TEST `alkjjbaawmsirsfvqljm`. T0A must issue no mutation attempt: obtain the
> exposed RPC signature only under T0B metadata authority (the publishable-key
> OpenAPI probe returned HTTP 401); defer the `rehber` refusal and executable
> `PGRST202` probes to separately authorised T10. Never contact production
> `bbjmhaerssakbreykxiw`. If ordinary TEST
> identities are unavailable, report that exact credential blocker without
> changing code or promoting rows. T0B requires authorised catalog access or a
> fresh trusted capture and cannot be satisfied by a UI password.

> The Phase 7 body below is retained as chronology and is superseded by this
> current Phase 9 assignment.

> **T0A PROGRESS — 2026-09-10.** Do not repeat the admin leg or M9-141a.
> Admin reads are recorded in
> `audits/2026-09-10-phase9-t0a-admin-and-m9-141a-live-check.md`: 127 movements,
> 6 items, 2 complete condition rows, 3 warehouses; M9-141a passed on all 3
> warehouse × item keys. The admin and `anbar-anbardar-test@example.com` legs
> are complete; the latter proves current warehouse RLS (107 movements and one
> condition, all `Test Anbar`). The only remaining T0A role leg is
> `anbar-rehber-codex-test@example.com`; both available candidate passwords were
> rejected. Obtain its TEST-only password/session without writing it to the
> repo, then run only GET/read checks. T0B remains a separate authorised-metadata
> task.

> **AUTHORITATIVE CODEX UPDATE — 2026-09-10. STOP: Phase 7 is `ACCEPTED`.**
> Do not run another Phase 7 scenario and do not reopen M7 rows from historical
> text below. Read `audits/2026-09-10-phase7-final-codex-acceptance.md` and the
> authoritative status column in `specs/2026-09-04-phase7-registry-rows.md`.
> The next phase/task must be chosen separately; no automatic continuation is
> assigned by this file.


> **AUTHORITATIVE CODEX UPDATE — 2026-09-10 (latest).** The corrected
> two-simultaneous-line request-key run is accepted: `M7-39` is
> **LIVE VERIFIED**. The K_MID attempt remains withdrawn history.
>
> The M7-38 split audit is only partly accepted. Positive overflow is clamped
> and a non-positive total disables the button, but the UI clamp has no lower
> bound. Run a read-only leg with `-0.001` in the max-0 Yararsız bucket plus
> `+0.01` İcarədə; the positive derived total should enable the button and reach
> the exact negative `condSplitCheck` refusal before any layer read. Read
> `audits/2026-09-10-phase7-m7-39-correction-m7-38-split-codex-audit.md`.

> **AUTHORITATIVE UPDATE — 2026-09-10 (latest).** `M7-39` is now
> **`LIVE VERIFIED`**: the corrected request-key rerun used two simultaneously
> postable outbound lines (minimal TEST fixture `SND-BAE2EF3FBF`, closed
> net-zero via reversal `b960da62…`), so K1 → K1 → commit line B → K2 ≠ K1 with
> the action trail proving line B's `addLineRaw` was the only invalidator
> between captures. Zero mutations reached TEST; baseline byte-identical;
> read-only restored. See
> `audits/2026-09-10-phase7-m7-39-request-key-correction.md`.
>
> **Superseded below (retained as chronology):** `M7-39` was
> **`IN PROGRESS`**. Field clearing + refocus are accepted code/live evidence.
> The request-key run was safely contained and K1→K1 is a valid stability
> control, but Codex rejected the claimed K2≠K_MID causal attribution: removing
> the only line also clears the key; with zero lines K_MID cannot be captured;
> rebuilding a postable line is already a commit, and current stock prevents a
> second simultaneous line without another invalidating action. Read
> `audits/2026-09-10-phase7-m7-39-request-key-codex-audit.md`.
>
> The body below is retained as chronology and is superseded where it still
> describes `lines.length`, says only M7-39 refocus is live, or calls retained
> price "by design". Read
> `audits/2026-09-10-phase7-m7-39-request-key-live.md` and
> `audits/2026-09-10-phase7-m7-39-field-clearing-codex-audit.md` before the next
> action.
>
> **`M7-38` — negative split + inbound non-routing CLOSED (2026-09-10).** The
> earlier "all three `condSplitCheck` messages unreachable" claim was FALSE and
> is corrected: `Math.min` bounds only the upper side, so `Yararsız = -0.001`
> with `İcarədə = +0.01` gives total `0.009`, opens the button gate, and yields
> the exact «Yararsız: miqdar mənfi ola bilməz» with 0 layer reads, no dialog,
> no row; the healthy control then reached the layer read. Inbound «Mədaxil»
> appends directly with 0 layer reads and no dialog. **`validateOpLine`
> clamp/`warn` is NOT claimed** — measured unreachable read-only (the only
> outbound-eligible TEST item always renders a split). The inactive-layer branch
> stays out of scope. `M7-38` remains `IN PROGRESS`. See
> `audits/2026-09-10-phase7-m7-38-negative-split-inbound-live.md`.
>
> **`M7-38` — third branch closed (2026-09-10).** The **split-guard chain** is
> live measured: `condSplitCheck`'s messages are UNREACHABLE from the UI because
> the bucket input clamps (`Math.min(value, buckets[k])`, `OperationForm.tsx:611`)
> and the button gate (`disabled={!qty || num(qty) <= 0}`, `:626`) refuse first;
> a valid-split positive control did reach `get_stock_layers`. `M7-38` stays
> `IN PROGRESS` — `validateOpLine` clamp/`warn`, the inbound non-routing branch
> and the inactive-layer branch (needs deactivation, out of scope) are unclaimed.
> See `audits/2026-09-10-phase7-m7-38-split-guard-chain-live.md`.
>
> **`M7-38` — second branch (2026-09-10).** The failed
> `get_stock_layers` refusal path is now **live verified** on the read-only
> origin: 503 injected over a window and proven observed, no dialog, no line
> appended, exact `.toast.bad` refusal, and recovery proving causation.
> `M7-38` stays `IN PROGRESS` (two branches evidenced) — the split check, the
> `validateOpLine` clamp/`warn` surface, the inbound non-routing branch and the
> inactive-layer branch are still unevidenced. See
> `audits/2026-09-10-phase7-m7-38-layer-read-failure-live.md`.
>
> **Next required correction:** rerun M7-39 with two simultaneously postable
> active-layer outbound lines: capture K1 with line A, commit line B without
> removing/editing A or changing any header, capture K2, and prove K2≠K1. A
> small supported TEST-only second-item layer fixture may be created and closed
> net-zero under the existing TEST authorisation. Then continue with the
> remaining `M7-38` branches above;
> then `M7-96` stale re-check, `M7-S2` broken-read, İcarə/`log_icare_exposure`,
> transfers and anbardar scoping. Phase 7 remains **NOT ACCEPTED**.

> **STATE 2026-09-09.** Phase 8 is ACCEPTED. On Phase 7: `M7-123` CLOSED
> (Codex-reviewed), `M7-18` and `M7-116` `LIVE VERIFIED`, and the confirmed
> focus-parity defect is **FIXED** — `M7-22` is now `LIVE VERIFIED` (complete)
> and `M7-39` is `IN PROGRESS` with **only its refocus clause** evidenced.
> **Phase 7 remains INCOMPLETE and NOT `ACCEPTED`; the next step is independent
> Codex audit.** TEST `alkjjbaawmsirsfvqljm` only; never contact production
> `bbjmhaerssakbreykxiw`; preserve the dirty tree (214 entries); no
> stage/commit/push/deploy; no cutover, no layer deactivation; no I-10 row; no
> `Çap` work.

## What the last session did — focus-parity remediation

Acted on `audits/2026-09-09-phase7-m7-22-focus-codex-finding.md` (Codex:
**CONFIRMED DEFECT**). Legacy has two focus transitions the port implemented in
neither branch: `pickItem()`'s `if (!keep && !OP.condSplit) $('#o-qty').focus()`
(`index.html:3400`) and `commitDraftLine()`'s `$('#o-item').focus()` (3669).

**One file changed:** `web/src/components/operation/OperationForm.tsx`.

Implemented with **element refs + transition-scoped one-shot state, no global DOM
selectors**:

- `qtyRef` / `searchRef` on the existing `Input` (which already forwarded refs).
- Quantity focus is armed **only** by an explicit combobox choice or by the M5-55
  prefill actually being consumed, then applied by a post-render effect **only
  when `showSplit` is false**. The flag clears in both branches, so a split pick
  consumes the arm without focusing. An ordinary rerender of an existing pick
  arms nothing — the legacy `keep = true` case.
- Item-search focus is driven by **`lines.length` growing**, not by `onAddLine()`
  completing. A layered non-inbound line leaves the form via `onNeedsLayerPick`
  and is committed later by `LayerPickDialog → addLineRaw`; both routes converge
  on `addLineRaw`, so one rule covers both and **inherently excludes** an
  unconfirmed dialog. A `null` starting baseline means mount and restored drafts
  are not commits; a removal lowers the count and is not either.

No other logic touched: fields, draft persistence, request-key invalidation,
validation and posting behaviour are unchanged.

Audit: `audits/2026-09-09-phase7-m7-22-m7-39-focus-parity-remediation.md`.

## Verification

**10 focused tests added, and proved falsifiable:** the pre-fix file was restored
and the suite re-run — **4 failed, exactly the positive focus assertions**
(explicit pick, M5-55 prefill, ordinary commit, layer-dialog return). The six
negative controls pass pre-fix too, which is correct: code that focuses nothing
trivially satisfies "does not focus". The fix was restored and re-verified green.

The tests drive a small controlled wrapper because the file's existing
`renderForm` passes a mock `onSetPick` — without it a pick never reaches the
rendered state and every focus assertion would be **vacuous**.

| Check | Result |
|---|---|
| Focused tests | 10 passed |
| Full suite | **126 files / 2718 tests passed** (2708 before; +10, no regressions) |
| `tsc --noEmit` | clean |
| `oxlint src` | clean (exit 0) |
| `vite build --mode sandbox` | built, 199 modules |
| `git diff --check` | clean |

The «chunks larger than 500 kB» advisory is the pre-existing Phase 8 one.
`web/dist` is git-ignored, so no tracked artefact was left.

**Real read-only browser verification** — normal pick moved focus `BODY` →
`INPUT[number] label="Miqdar"`; a real TEST condition split
(`İCARƏDƏ (MAX 0.01)`) left focus off quantity while it stayed read-only; adding
one local draft line moved focus to `INPUT label="Mal axtar"` and cleared the
picked-item block. **The final document-post button was never pressed**, the
interceptor for production URLs / posting RPCs / table writes **never fired**, and
only read-only RPCs were dispatched.

**Port note:** 5175 was already occupied by a pre-existing server. Per
instruction it was **inspected and reused, not terminated** — verified to serve
TEST `alkjjbaawmsirsfvqljm`, `ALLOW_LOCAL_WRITES=false`, zero production refs,
and (via a source marker) the edited working tree rather than stale code.

**Net-zero:** 125 movements, 6 items, 2 `stock_conditions`,
`Test Anbar / 0000001 = 8.00`, 0 negative balances — identical to the accepted
Phase 8 baseline. Dirty tree preserved at 214 entries, staging empty.

## Why `M7-39` was NOT fully promoted

Its contract is «pushes the line, invalidates the request key, clears
pick/qty/unit/split/price, re-renders **and refocuses the item input**». Only the
**refocus** clause (plus the observed pick clear) is live-evidenced. The
request-key invalidation and the full field-clearing set have unit coverage but
were not live-asserted, and the row's planned test («request key cleared») still
has no live evidence. It therefore stays `IN PROGRESS`.

## Next step

**Independent Codex audit** of the remediation and of `M7-22`'s completion.
Claude must not mark Phase 7 `ACCEPTED` (`registry-rows.md`, principles §11,
`CLAUDE.md` §4). Points for Codex:

1. Whether `lines.length` growth is accepted as the commit signal for `M7-39`'s
   refocus clause, given it covers the layer-dialog return without the page
   needing a new callback.
2. Whether `M7-22` is complete, or whether the split branch being satisfied by an
   explicit «arm then decline» (rather than never arming) needs its own note.
3. Whether `M7-39`'s remaining clauses should be closed by live assertion or
   accepted on existing unit coverage.

Remaining OPEN rows need either a write authorisation or a blocked precondition:
`M7-94` needs a route into edit mode (the «Baxış» dialog did not open on probe);
`M7-121` needs a real counterparty (`partners` = 0, the last surviving H-5
fixture blocker); `M7-14`, `M7-38`, `M7-95`, `M7-113` are posting/draft contracts.

## If a new Claude task is assigned

Preserve the dirty tree; TEST `alkjjbaawmsirsfvqljm` only; never contact
production; start localhost only with
`npm run dev -- --mode sandbox --host 127.0.0.1 --port 5175` — if that port is
already taken, **inspect and reuse the existing server** (confirm the TEST ref,
`ALLOW_LOCAL_WRITES=false` and that it serves the current tree) rather than
killing an unknown process. Keep it read-only for harness work; do not repeat
evidenced scenarios; no new cutover, no layer deactivation, no fabricated
accounting state; no I-10 row. `Çap` is outside the acceptance boundary.
