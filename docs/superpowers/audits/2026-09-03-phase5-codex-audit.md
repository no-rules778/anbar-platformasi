# Phase 5 Nomenklatura — independent Codex audit

Date: 2026-09-03. Verdict: **CHANGES REQUIRED — not CODE VERIFIED / not ACCEPTED.**

## Scope and evidence

Reviewed the revised full-scope spec, plan, handoff, Module F registry, actual React implementation, tests and legacy implementation. Approved Q1(c), full Excel scope, Q3, Q4 and Q5(a) are preserved. The disabled operation transition M5-55 is an approved dependency, not an audit defect.

Repository: `C:/Users/HP/Desktop/MY COMPUTER Torsion/MY/Anbar platforması/Codex_Code_chat/anbar-platformasi-github`.
Branch HEAD: `239b8a054a8fb5cc722f2fc04c26e0c168058a50`; local `origin/main`: `40516fa7cdb5df454f0343ef92648d1e839866f9`. Phase 5 is predominantly untracked/local code, so a committed-branch diff alone does not contain this implementation. The pre-existing root index.html difference is the unrelated manage_reference p_id line; the inspected nomenclature sections match the local origin/main reference. No remote fetch/push or deployment was performed.

Independent checks: **716/716 tests in 50 files passed**, typecheck, oxlint, build and git diff --check passed. Build warns about a 930.43 kB JS bundle. Passing tests do not cover the defects below.

Read-only browser comparison at localhost:5174 and production:

| View | Local | Old | Result |
|---|---:|---:|---|
| All items | 1531 | 1531 | All seven data cells per row match exactly |
| No price | 1033 | 1033 | All displayed data rows match |
| No movements | 11 | 11 | All displayed data rows match |
| Similar names | 0 | 0 | Matching empty result |

Browsers were also used to open forms/cards and inspect previews. No save/import/apply operation was submitted. Preview-only sample text was discarded when closing dialogs. No credentials or session storage were inspected. No production data, SQL/RPC, root index.html, GitHub or Vercel changes were made by this audit. Only this local audit document is added.

The live mutation pass, fresh Supabase function/RLS inspection, real generated Excel-file comparison and print-preview inspection remain unperformed. No Phase 5 ledger/progress file was found in the searched workspace; plan/handoff/registry were used as the available implementation record. skills/MAIN.md was unavailable; the existing parent AGENTS.md and migration principles were read.

## Required corrections

### A01 — P1: bulk updates erase a stored price when the input omits it

- React: `web/src/components/nomenclature/BulkItemsDialog.tsx:60` passes `price: r.price` directly.
- Legacy: index.html:5754 uses `r.price || (r.st === 'upd' ? existing.price || 0 : 0)`.
- Reproduction with the real new parser, in memory only: an existing `0000001 / Sement / kq / price=10`, input `1\tSement\tkq`, update-existing enabled, produces an update row with price=0. React sends **0**; legacy sends **10**.
- Restore the legacy update fallback. Add an integration test asserting the exact update payload for omitted price, zero price and a positive replacement price. The existing test checks only that updateItem was called.

### A02 — P1: category import bypasses the legacy whole-file error gate

- React: `CategoryImportDialog.tsx:46-76,106`; `lib/csv.ts:60` silently skips rows with no code.
- Legacy: `catImpPreview`, `catImpCount`, `catImpApply`, index.html:5811-5883. Any error blocks the entire apply, in both the button and handler. Duplicate codes and invalid seven-digit codes are errors. `Təyin edilməyib` is a separate informational, non-writing bucket, not an error.
- Browser reproduction: CSV containing valid `0000001,Filtrlər` plus unknown `9999999,Filtrlər` displays an error yet leaves **Bazaya yaz (RPC) enabled**. No apply was clicked. Code would send the valid subset.
- Restore validation/buckets, retain blank-code records as errors rather than discarding them, reject duplicate codes, and block all writes when errors exist. Preserve two-stage confirmation and the non-writing unset bucket. Test mixed valid/error input and confirm zero RPC calls, including direct handler protection.

### A03 — P1: new-item import permits applying a file containing error rows

- React: `ImportItemsDialog.tsx:62-89` selects valid rows and disables apply only when none exist.
- Legacy: `niCount`, index.html:6085-6093, disables import whenever any row has `st === 'err'` (I-14).
- Browser reproduction: one new preview-only name plus `ab` gives one new row and one short-name error, but **Yeni malları yarat remains enabled**. No write was clicked.
- Restore the whole-file error gate and error-count message. Test a mixed valid/error file, not only an all-error file; no import RPC may run until the errors are resolved.

### A04 — P1: the item card is inaccessible behind its own mask

- React: `ItemCard.tsx:61` uses `drawer on`, but `web/src/index.css` has no `.drawer` or `.drawer.on` rules.
- Legacy: index.html:137-138 defines a fixed right-side drawer with z-index 101, above the mask (100), below the edit modal (120).
- Browser reproduction: clicking item 0000001 creates a static aside after the entire 1531-row table. Computed style: `position: static`, `z-index: auto`; top was about 98,660 CSS px in the current narrow panel. The fixed mask covers the viewport. This is an interaction failure, not a deferred cosmetic issue.
- Port the required drawer styles and verify the real browser flow: open card, scroll it, open edit above it, cancel/close edit while retaining the card, then close card. DOM-presence tests alone cannot catch this.

### A05 — P2: both bulk/import previews lost per-row selection

- React: `BulkItemsDialog.tsx:130`, `ImportItemsDialog.tsx:123` render plain preview rows. Their `use` values cannot be changed by the user.
- Legacy: `bulkPreview` and `niPreview` render row checkboxes; import selection recomputes predicted codes and selected count.
- Users cannot exclude an unwanted new/similar item. Both React previews show only 250 rows but omit the original warning that all applicable rows beyond the preview are included; bulk also omits the price preview column.
- Restore checkboxes with the original eligibility, selected counts, import code predictions, preview summaries/prices and >250-row scope warning. Assert only selected eligible rows reach the mocked APIs.

### A06 — P2: existing-row update toggle leaves a stale bulk preview

- React: `BulkItemsDialog.tsx:115` changes updateExisting without recalculating rows.
- Legacy: index.html:5740 re-runs bulkPreview when this checkbox changes and a preview exists.
- Reproduce: preview an existing row with updating enabled, then disable updating. React retains an applicable `upd` row and would still update it.
- Recompute the preview/eligibility on the toggle. Test both directions and inspect exact update/create calls.

### A07 — P2: file-upload paths are missing from two dialogs

- BulkItemsDialog has no legacy CSV/TXT/TSV file input (`bulkItems`, index.html:5733-5747).
- CategoryImportDialog has no legacy CSV/TXT file input (`categoryImport`, index.html:5794-5807).
- Restore file reading, BOM handling and automatic preview. Existing tests exercise paste only; add file-input tests and read-only browser checks.

### A08 — P2: create-form code is always readonly

- React: `ItemFormDialog.tsx:46,113` has no code setter and always applies readOnly.
- Legacy: index.html:5576 makes code readonly only for editing; users may change the proposed code when creating.
- Browser confirmed: suggested code 0001532 is editable in old create form, readonly in React.
- Restore editable code on create, readonly on edit, preserving seven-digit/duplicate checks and the existing suggestion behavior.

### A09 — P2: category form behavior is incomplete

- React: `ItemFormDialog.tsx:150` renders only currently active categories; the stored hidden category is not retained as an option. Unit preservation is implemented, but the matching category preservation is missing.
- Legacy: `categoryOptionsFor(current)`, index.html:699, explicitly retains the item's stored category. Restore this so editing other fields shows the real saved category and does not mislead the user.
- The approved advisory category suggestion (M5-36; legacy suggestCategory/catSug, index.html:677,5595-5602) is absent entirely. Restore the explicit-click suggestion; never auto-save it.
- Add tests for hidden current category and optional suggestion application. The latter was declared delivered but has no implementation/test.

### A10 — P2: nomenclature stops receiving other users' updates

- React: `NomenclaturePage.tsx:49-52` loads on mount and after its own writes; it has no Realtime subscription. The existing subscription belongs to ReferenceDirectoryPage and unmounts on navigation.
- Legacy: `subscribeRealtime`, index.html:1162-1181, refreshes shared data/rendering after movements/items/partners/warehouses changes.
- Opening React Nomenklatura currently changes the sync indicator to `bağlı deyil`. More importantly, names, prices, quantities and card histories remain stale when another user changes them.
- Restore appropriate shared/event refresh while preserving list controls and user drafts, with cleanup and late-response protection. Do not introduce audit_log Realtime (Phase 4 explicitly forbids it). Verify using mocked events first; do not create a production record just to trigger an event.

### A11 — P2: paged movement reads lost their ordering

- React: `api/itemMovements.api.ts:61` uses range without any order.
- Legacy: index.html:871 calls fetchAll('movements', ['date', 'created_at']).
- With multiple pages, unordered results do not provide a stable page boundary and can affect completeness/order of history and the aggregation input. Today's complete visible snapshot matches; this finding is a query-contract regression, not a claim that today's totals are wrong.
- Restore the chronological order contract and test ordered reads beyond 1000 rows. If adding an ID tie-breaker, document its purpose. Verify quantities/counts and same-date card history.

### A12 — P2: item-card route and warehouse presentation differ

- React: `ItemCard.tsx:104,150-152` renders raw warehouse and partner strings.
- Legacy: itemCard index.html:1880,1885 uses `whLabel` and `routeOrPartner`; transferRoute/resolveWh at 1433-1454 render source → destination according to incoming/outgoing quantities and known warehouse names.
- Restore the route logic and display-only alias `Xocahəsən` → `Xocəsən`, keeping stored keys unchanged. Missing partner should display the original em dash. Movement type tags should retain their legacy meaning/presentation.
- Test both transfer directions, unresolvable route sides, no partner and the warehouse alias. Include any required read-only warehouse input in Q1's dependency inventory.

### A13 — P2: show-all expansion is reset by filtering and remounting

- React: `store/nomenclature.store.ts:57` clears showAll on every setFilters. The page's search effect also calls setFilters on mount.
- Legacy: SHOW_ALL['nom'] remains set until the app reloads. NF_.page resetting to 0 does not reset SHOW_ALL; they are different state variables.
- Preserve expansion across search/filter changes and navigation, as approved Q3 requires. Add a page/store integration test, including the initial debounce after remount, rather than testing only applyCut.

### A14 — P2: reference-load failure behavior changed

- React: `nomenclature.store.ts:94-95` replaces units/categories with empty arrays when reference loading fails, silently treating failure like a ready-but-empty directory.
- Legacy: `unitOptions`/`categoryOptions`, index.html:684-705, use fallback lists only when refs are not ready; a successfully loaded empty active list intentionally stays empty. editItem also refuses opening when no unit options exist (5573).
- Preserve that distinction, including the no-unit refusal and existing-item value exceptions. Test failed load, ready/empty, active data and hidden current values separately. Do not silently populate ready/empty references with defaults.

## Documentation, inherited risks and limits

1. Module F's heading says every row except M5-55 is CODE VERIFIED, while its actual row statuses remain NOT STARTED. M5-36 is absent in code despite the completion claim. The proposal still says awaiting implementation; several places say Q5 is open although it was resolved. Reconcile individual statuses/evidence, plan and short handoff after fixes. T1 is marked complete without recorded counts in the inspected result sections; record actual evidence or mark it pending. Do not invent a missing ledger retrospectively.
2. `xlsx@0.18.5` is intentionally matched to production, but **not established as safe** by that choice. Independent npm audit found one vulnerable dependency with two high-severity advisories: [prototype pollution](https://github.com/advisories/GHSA-4r6h-8v6p-xvw6) and [ReDoS](https://github.com/advisories/GHSA-5pgg-2g8v-p4x9). User-selected files can still be hostile. The first affects versions before 0.19.3; the second before 0.20.2. npm's `fixAvailable:false` is not proof that no vendor-fixed version exists. Treat this as an inherited risk requiring a documented version decision and compatibility checks, not an excuse to silently accept it. Do not alter production or install a replacement without the required approval.
3. The new xls.ts comment incorrectly says toNum preserves zero-padded codes; it converts `0000001` to numeric 1. The legacy implementation does the same. This is an inherited behavior, not a newly introduced export regression. Correct the comment and record any proposed behavior change separately; do not silently alter the export contract.
4. Deferred visual backlog remains deferred. Additional presentation differences include missing numeric cell alignment, absent empty-table text, duplicated Bazalar nav group and missing nomenclature nav count. Card accessibility (A04), missing selection (A05) and missing upload controls (A07) are functional and cannot be deferred as cosmetic.
5. Parent AGENTS.md contains historical note/media feature requests. These were not found in the inspected legacy itemCard and are not evidence that Phase 5 should invent new Storage/schema features. Resolve their backlog status separately under the source-of-truth hierarchy.
6. Keep Phase 4 accepted with its outstanding populated-data/print check; keep M5-55 blocked on Yeni əməliyyat. This audit does not reopen either user decision.

## Repair and re-audit protocol

Claude should independently confirm each finding against the cited legacy path and explicit decisions, then fix the approved regressions locally, starting with A01-A04. Add focused regression tests that fail before each fix. Keep the localhost write guard closed and use mocks for all mutation tests. Maintain a short progress/handoff record with finding IDs, files and evidence; do not reattach the full archived chat or reread the entire repository.

After corrections, run the normal checks and report DONE. Codex will re-audit the changed paths and resume browser acceptance. The matching list snapshot above is useful evidence, but it does not make the full screen or any write path ACCEPTED. Actual writes require separate explicit authorization at the time of live testing.
