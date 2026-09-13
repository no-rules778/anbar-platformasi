# Phase 13 draft proposal — «Sərfiyyat Materialları» (legacy `rSm()`)

> **PHASE 13 IMPLEMENTED ON CLAUDE'S SIDE — 2026-09-11 (authoritative,
> latest).** The owner accepted D-N1, D-N2, D-N3, D-N5, D-N6 and D-N7; T1-T6
> and T9 ran. **T7 did NOT run — no TEST identity was supplied** (0 Supabase
> contacts, 0 write attempts, 0 sequence advances, 0 `audit_log` rows).
> Tally: 69 `CODE VERIFIED`, 0 `LIVE VERIFIED`, 2 `IN PROGRESS`, 6
> `NOT STARTED`, 0 `BLOCKED`, 0 unclassified across 77 unique rows. Phase 13
> remains `NOT ACCEPTED`.
> [Implementation audit](../audits/2026-09-11-phase13-implementation.md).

> **CODEX DESIGN AUDIT PASSED — 2026-09-11 (SUPERSEDED as the current status
> by the banner above; its design verdict still stands).** The audit
> corrected the false D-N4 zero-bound claim. Implementation audit later refined
> the atomic React generation to the three core reads plus the required item
> catalogue, preserving the non-fatal reference-values branch and reusing the
> boot-warmed application user directory.
> D-N4 is withdrawn. [Audit](../audits/2026-09-11-phase13-design-codex-audit.md).

Date: 2026-09-11
Status: **IMPLEMENTED ON CLAUDE'S SIDE; `NOT ACCEPTED`.**
**SUPERSEDED (HISTORY):** the status line here read «DESIGN ACCEPTED — no
implementation authorised yet», with no application code existing and no row
promoted. That was true of the design session and is now false — the code
exists and 69 rows are `CODE VERIFIED` with 2 `IN PROGRESS`; the current
figures are in the banner above. No Supabase project was contacted in EITHER session. D-N4 was withdrawn
by the design audit because its premise was false.
[Ledger (77 rows)](./2026-09-11-phase13-registry-rows.md) ·
[TEST-only plan](../plans/2026-09-11-react-migration-phase13-serfiyyat-materiallari.md) ·
[Design handoff audit](../audits/2026-09-11-phase13-design-handoff.md) ·
[Roadmap](../plans/2026-09-10-post-phase9-migration-roadmap.md)

## 1. Scope and dependency

Phase 13 follows the independently accepted Phases 9, 10, 11 and the
owner-approved scope of Phase 12. It covers only the legacy page `sm`: the rail
entry (`index.html:262`), the page shell with its two-button segment control
(`382-390`), the module state `SM` (`6184`), the loader `smLoad()`
(`6186-6213`) and the renderer `rSm()` (`6230-6246`), plus every helper those
call directly:

| Helper | Legacy lines |
|---|---|
| `smActiveChannelNames()` | 6216 |
| `smAllowedProjects(forWrite)` | 6220-6225 |
| `smCanWrite()`, `smDocById()`, `smProjById()` | 6226-6228 |
| `smRenderForm()` | 6250-6362 |
| `smImportLines()` | 6368-6395 |
| `smFindProjectByName()`, `smFindItemByNameOrCode()` | 6404-6414 |
| `smParseDocsImport()` | 6415-6459 |
| `smImportDocsFile()`, `smPreviewDocsImport()`, `smConfirmDocsImport()` | 6461-6512 |
| `smRenderLines()` | 6514-6524 |
| `smSubmitDocument()` | 6526-6553 |
| `smOpenEditDocument()`, `smDeleteDocument()` | 6556-6574 |
| `smReportRows()` | 6577-6591 |
| `smRenderReport()` | 6593-6646 |
| `smRenderDocsTable()` | 6650-6667 |
| `smFilteredRows()` | 6669-6690 |
| `smRenderReportTable()` | 6692-6712 |
| `smExportExcel()` | 6714-6726 |

Its server contract is `sql/032_serfiyyat_materiallari.sql`, **applied and
present in the captured TEST schema**: three tables, three RPCs, one sequence
and one doc-number function, all read in full this session from
`docs/superpowers/test-environment/restore-test-schema.sql`. Phase 13 changes
none of it: it is a UI migration onto an existing server contract. **No SQL
change is proposed and none is required.**

Out of scope: «Soraqçalar» project and channel administration (`manage_reference`
kinds `project` and `serfiyyat_channel`, already migrated in Phase 2/3 and
reused read-only here), the rail counter badges (Phase 18 shell work), and
`Çap` — this page has no print button.

Everything below was read from primary sources in this session: the legacy page
and every helper listed above, the three `serfiyyat_*` table definitions, their
RLS policies and grants, the three RPCs in full, and the React modules named in
§3. Legacy line numbers refer to the repository-root `index.html` as of
2026-09-11; server line numbers refer to the captured TEST schema.

## 2. Verified legacy contract

### 2.1 Why this phase is different

Phase 12 was the migration's first multi-role approval workflow. **Phase 13 is
the first DOCUMENT workflow that is not a stock movement**, and it is the
largest single legacy surface migrated so far (~500 lines against Phase 12's
~270). Five facts shape every row in the ledger:

1. **It does not touch stock.** The module writes to `serfiyyat_documents` /
   `serfiyyat_lines` and never to `movements` (legacy header comment,
   6178-6183). Nothing here may reach balances, the item index, movements or
   any stock export (M13-95). That isolation is the module's entire design
   premise and must survive the port.
2. **The browser is not the authority.** `smCanWrite()` and
   `smAllowedProjects(true)` decide what is *rendered*; `create_serfiyyat_document`
   re-checks role and warehouse-to-project binding server-side
   (schema 2416-2427), and edit/delete are admin-only there (2732-2734,
   2518-2520). Affordance rows and server rows are kept separate throughout
   (M13-06 vs M13-90, M13-51 vs M13-91, M13-70/71 vs M13-92/93).
3. **There are two INDEPENDENT Excel import paths on one screen**, and legacy
   is explicit that they must not be conflated (comment 6397-6403). The
   line-level import (`sm-imp-file`) appends rows to the OPEN document; the
   document-level import (`sm-doc-imp-file`) creates **entirely new documents**,
   one RPC call per group. This is the largest new risk surface in the phase.
4. **A gated subsystem.** When any of the three reads fails, `DB.smReady` stays
   false and the whole page renders one hint instead of any form or report
   (6240-6243). That readiness rule is already ported and accepted as
   `fetchSerfiyyat()`'s `ready` flag — see §3.
5. **Deletion is real and irreversible.** `delete_serfiyyat_document` DELETEs
   the document; `serfiyyat_lines` cascades (schema 5505). Only an `audit_log`
   row survives. No reversal document exists, unlike the movements module.

### 2.2 Route, rail, role

- `<a data-p="sm" id="nav-sm">Sərfiyyat Materialları</a>` is the LAST entry of
  the «Bazalar» group (262), after «Soraqçalar».
- It carries an **id but no `display:none`**, and — unlike `nav-nreq` and
  `nav-refs` — the sign-in block never sets its display (7505-7507 touches only
  `nav-refs`, `nav-nreq`, `nav-azp`). `go()` has **no `sm` branch** (1496-1501).
  **The page is therefore ungated for every role** (M13-02). The id exists
  without a gate attached to it; a reader who assumes "has an id ⇒ gated" would
  record a restriction that does not exist.
- Role affects only what is *inside*: `smCanWrite()` hides the form for a
  rehber, `smAllowedProjects()` narrows an anbardar's projects, and the
  document table is admin-only.

### 2.3 The readiness gate

`smLoad()` (6186-6213) resets state, then issues one `Promise.all` over
`serfiyyat_projects`, `serfiyyat_documents` and `serfiyyat_lines`, throwing if
**any** errored, and sets `DB.smReady = true` only as the try block's last
statement. A `serfiyyat_lines` failure alone therefore leaves the entire
subsystem unavailable (M13-10). The `get_reference_values` call for
`serfiyyat_channel` is a **separate** try/catch (6207-6212): its failure leaves
the channel list empty but does **not** clear `smReady` (M13-12). Those two
failure scopes are deliberately different and the port must not merge them.

This exact rule is already implemented and accepted as `fetchSerfiyyat()`
(`api/serfiyyatProjects.api.ts`), whose header documents the same trap. Phase 13
reuses it rather than restating it — but it needs MORE columns than that
function returns (§3).

### 2.4 The segment control and page state

`SM = { lines: [], filters: {}, editDocId: null }` (6184) is a long-lived module
object, so in React it belongs in the store, not the component (M13-15, the
M4-18 / M9-06 rule). The `#sm-seg` control has exactly two buttons, «Yeni sənəd»
(`doc`, initially `.on`) and «Hesabat» (`rep`); the active tab lives in a DOM
`dataset` attribute rather than in `SM` (6231-6238, 6244), and the wiring guard
`dataset.wired` makes the handler attach exactly once (M13-16, M13-17).

### 2.5 The document form (`doc` tab)

Four independent early returns, **in this order** (M13-20…M13-23), and the first
one reached decides the screen:

| Order | Condition | Rendered instead |
|---|---|---|
| 1 | editing a document that no longer exists | clears `editDocId`/`lines`, falls through |
| 2 | not editing AND `!smCanWrite()` | «Sənəd yaratmaq üçün icazəniz yoxdur (yalnız Admin və Anbardar).» |
| 3 | editing AND `!isAdmin()` | «Provedilmiş sənədi yalnız Admin düzəldə bilər.» |
| 4 | not editing AND no allowed project | «Sizə bağlı aktiv layihə yoxdur. Admin Soraqçalar bölməsində layihəni sizin anbarınıza bağlamalıdır.» |

Note the asymmetry in guard 4: it is skipped in edit mode, deliberately, so an
admin can edit a document whose project is not one of their own (comment
6256-6257).

Header fields: project select, date (defaults `today()`), channel select
(active names only, with a leading empty option), kontragent, avtomobil nömrəsi,
qaimə №, qeyd. The line editor holds an item search (debounced 160 ms, minimum
2 characters, max 12 hits, matching name substring OR code substring), quantity,
price, and «Sətri əlavə et →». Picking an item fills the price **only when the
price field is empty** (6326) — a detail easy to lose (M13-33).

Line validation refuses in a fixed order: no item selected → «Mal seçilməyib»;
then `!(qty > 0)` → «Miqdar müsbət olmalıdır» (M13-35). Both write to the inline
`#sm-err` span, not a toast.

The lines table shows Mal · Kod · Ölçü · Miqdar · Qiymət · Cəm and a per-row ✕,
with a footer «Cəmi» over `qty * price` (M13-40…M13-42). The empty state is a
two-line hint, not the shared `tbl()` empty block (M13-39).

### 2.6 Submit and edit

`smSubmitDocument()` (6526-6553) validates project, date and at least one line
— each with its own `#sm-err` message — then calls **`edit_serfiyyat_document`
when `SM.editDocId` is set and `create_serfiyyat_document` otherwise**, with an
identical argument object plus `p_doc_id` for the edit (M13-50, M13-52). Empty
header strings are sent as `null`. On success it toasts «Sənəd yaradıldı: {num}»
or «Sənəd düzəldildi: {num}», clears the draft, edit target and all local editor
fields, reloads via `smLoad()` and re-renders (M13-53). On failure it toasts the server message and **keeps the
draft** (M13-54).

`smOpenEditDocument()` (6556-6563) loads the document's existing lines into the
draft, forces the segment to `doc` and re-renders. `smDeleteDocument()`
(6565-6574) is the module's only `confirm()` prompt, and its text states plainly
that the deletion is not reversible (M13-71).

### 2.7 The two import paths

**Line-level** (`smImportLines`, 6368-6395): reads only code, qty, price.
Header detection is a regex over the first row; when absent, columns are
positional (0,1,2). A row whose code is empty is **skipped silently**; a row
whose code is unknown or whose qty is not positive is **rejected and counted**,
never silently swallowed (the legacy comment says so explicitly, 6364-6367).
The toast reports both counts and the rejects go to `console.warn` (M13-60…M13-63).

**Document-level** (`smParseDocsImport`, 6415-6459): a wider column map with
name-based detection, and one deliberate subtlety — the avtomobil column
explicitly excludes any header matching `qaim|invoice`, because «Qaimə nömrəsi»
also contains «nömrə» and would otherwise capture the same column (comment
6429-6432, M13-66). Rows group by
`projectId|kontragent|avto|kanal|iv|date|note`, all lower-cased except the
project id and the date (M13-67). A project the user is not allowed to write to
produces a per-row error naming the line number (M13-65).

Nothing is written silently: `smPreviewDocsImport()` renders a modal listing
every group and every rejected row, and only «Təsdiqlə və yarat» calls
`smConfirmDocsImport()`, which loops the groups and issues **one RPC per group**,
tallying successes and failures (M13-68…M13-70). **This loop is not atomic
across groups** — each document is atomic in its own transaction, but a failure
half-way leaves the earlier documents created. That is legacy behaviour and the
ledger records it as such (M13-70).

### 2.8 The report (`rep` tab)

`smReportRows()` (6577-6591) flattens lines to rows, dropping any line whose
document is missing or whose project is outside `smAllowedProjects(false)` —
note `forWrite = false`, so a rehber sees every active project's rows
(M13-75, M13-76). It maps the author through `UMAIL.get(doc.by) || doc.by`
(M13-77), exactly as the audit log does.

Fifteen filter inputs across three rows (M13-80), applied **only** on «Filtrləri
tətbiq et» — the report does not filter as you type (M13-81). «Təmizlə» resets
`SM.filters` to `{}` and re-renders the whole report (M13-82). Date, project and
channel compare by equality; item, kontragent, avto, qaimə, note and author by
lower-cased substring; qty, price and sum by numeric range. Every range bound
is stored as an input **string**. The empty string disables the guard, while
the non-empty string `"0"` is truthy and therefore applies a real numeric zero
bound through `parseFloat()` (M13-83, M13-84).

The table has fourteen columns (M13-85); the admin-only document table above it
has seven and carries «Düzəliş» / «Sil» (M13-72, M13-73). The «Yekun» block
aggregates the filtered rows by project and by material, in first-appearance
order (M13-86, M13-87).

### 2.9 Export

`smExportExcel()` (6714-6726) builds a **two-sheet** workbook — «Jurnal» (15
columns, one row per filtered line) and «Yekun» (project totals) — and writes
`Serfiyyat_materiallari_{today}.xlsx`. It **bypasses the shared `xls()` helper
entirely**: no `toNum` mapping, no column widths, no autofilter, no freeze pane
(M13-88). The accepted React `xls()` supports only one sheet, so this export
needs its own builder, exactly as `xlsGroups.ts` already does for Mal qrupları.
The missing-library branch toasts «Excel kitabxanası yüklənmədi» and, unlike
`xls()`, has **no CSV fallback** (M13-89).

### 2.10 Server contract and guard order

| RPC | Role gate | Then, in order |
|---|---|---|
| `create_serfiyyat_document` (2398-2484) | session AND role ∈ {admin, anbardar} | project exists+active → anbardar's warehouse equals `linked_warehouse` → date present → channel valid+active → ≥1 line → per line: code present → code exists in `items` → qty matches `^[0-9]+(\.[0-9]+)?$` and > 0 → price format |
| `edit_serfiyyat_document` (2716-2805) | session AND role = admin | document exists (`FOR UPDATE`) → project active → date → channel → ≥1 line → the same per-line validation, **pre-validated in a first pass before any write** |
| `delete_serfiyyat_document` (2508-2541) | session AND role = admin | document exists (`FOR UPDATE`) |

Every refusal test must name the **first** guard reached (protocol §5). Three
server-side facts the browser cannot see and must not be inferred from the UI:
the qty regex **rejects a negative or exponent-formatted number outright**
(M13-92); `edit_serfiyyat_document` **deletes and re-inserts every line**, so
line ids are not stable across an edit (M13-93); and all three RPCs write an
`audit_log` row (M13-94).

All three tables are RPC-write-only: `authenticated` holds `SELECT` and no
`INSERT`/`UPDATE`/`DELETE` grant (schema 5876-5898), so a direct PostgREST write
is refused for every role including admin (M13-90).

RLS narrows reads by role: `serfiyyat_projects` shows active rows to everyone
and inactive ones only to admin; `serfiyyat_documents` and `serfiyyat_lines`
show everything to admin and rehber, and to an anbardar only rows whose project
is linked to their warehouse (5753-5764, M13-11).

### 2.11 Deliberately not ledger rows

The Soraqçalar administration of projects and channels (already migrated), the
rail counter badges (Phase 18), `Çap` (absent), and the `next_serfiyyat_doc_num()`
sequence format `SM-YYYY-NNNNNN` (server-internal, never asserted by the
browser).

## 3. Reuse boundary

| Need | Existing accepted primitive | Fit |
|---|---|---|
| Role predicates | `lib/roles.ts` — `isAdmin`/`isAnbardar`/`isRehber`, `Me` | exact |
| Formatting | `lib/format.ts` — `nf`, `money`, `fmtD`, `today` | exact |
| Item search source | `api/items.api.ts` | exact |
| Channel names | `api/referenceValues.api.ts` → `serfiyyat_channel` | exact |
| Author emails | `api/userDirectory.api.ts` — the `UMAIL` mapping | exact |
| Readiness rule | `api/serfiyyatProjects.api.ts` — `fetchSerfiyyat()` | **partial — see below** |
| Snapshot + retention + stale ticket | `dashboard` / `itemRequests` store precedent | pattern |
| Realtime | `hooks/useRealtimeRefresh.ts` | exact |
| Localhost write guard | `lib/mutationGuard.ts` (extended, M13-97) | additive |
| Two-sheet workbook | **none** — `xls()` is single-sheet; `xlsGroups.ts` is the cell-by-cell precedent | new module |
| Generated types | `types/database.ts` already carries all three `serfiyyat_*` tables and all three RPCs | **no type addition needed** |

**The `fetchSerfiyyat()` gap is the one real reuse limit.** It reads exactly the
columns the Soraqçalar usage counter needs — `id,name,active,linked_warehouse`
for projects, `id,project_id,alinma_kanali` for documents, and a bare existence
probe for lines. This page needs every document header column and every line
column. Phase 13 therefore needs its own snapshot reader. **It must not widen
`fetchSerfiyyat()`**, whose narrow column set is part of the accepted Phase 3
contract and whose consumers do not want the extra payload — the M12-10 fan-out
defect is the precedent for why widening a shared reader to serve a new page is
a defect, not a shortcut (D-N2).

## 4. Proposed React structure

```
lib/serfiyyat.ts                 allowed projects, canWrite, line maths, report row build
lib/serfiyyatFilters.ts          the fifteen-filter predicate and the Yekun aggregation
lib/serfiyyatImport.ts           BOTH import parsers, pure and separately testable
lib/serfiyyatExport.ts           the two-sheet workbook builder (xlsGroups.ts precedent)
api/serfiyyatDocuments.api.ts    the page's own snapshot reader + three RPC wrappers
store/serfiyyat.store.ts         snapshot, draft lines, editDocId, filters, tab, retention
pages/SerfiyyatPage.tsx          shell, segment control, readiness gate
components/serfiyyat/DocumentForm.tsx
components/serfiyyat/ReportView.tsx
components/serfiyyat/DocsImportPreviewDialog.tsx
```

No accepted module's file is modified, with the additive exceptions of the
`GuardedAction` union in `mutationGuard.ts` and the route/rail entry in
`App.tsx`.

## 5. Accepted deviations carried forward

Worded as deviations, not parity, exactly as Phases 8-12 did: atomic snapshot
(M13-13), first-load error block and failed-refresh retention (M13-14),
stale-response discarding (M13-18). Legacy renders partial data after a
per-table toast; these are Phase 8-12 precedents.

## 6. Owner decisions (each with a recommendation)

| Id | Question | Recommendation |
|---|---|---|
| D-N1 | Whether Phase 13 may write to TEST at all. Persisted/server-live evidence for M13-50…M13-54, M13-70, M13-71, M13-90…M13-94 needs a real write/refusal window | Authorise a **narrow TEST-only write window with explicit per-document residual accounting**. A base create → edit → delete leg consumes one `serfiyyat_doc_seq` value and leaves three audit rows. M13-70's non-atomic multi-group leg necessarily creates at least one additional document before a later failure; cleaning it up consumes no further sequence but leaves its INSERT and DELETE audit rows. Therefore the total is NOT fixed at one sequence/three audit rows: record every successful group, delete every created document, and reconcile the exact sequence advances and permanent audit rows. Without this explicit acceptance, run read-only/code verification and leave the write clauses unpromoted |
| D-N2 | Whether to widen the accepted `fetchSerfiyyat()` or add a page-specific reader | Add a page-specific reader. Widening a shared narrow reader to serve a new page is exactly the M12-10 fan-out defect Codex corrected in Phase 12 |
| D-N3 | The document-level import loop is not atomic across groups: a mid-loop failure leaves earlier documents created (6494-6512) | Keep legacy behaviour and state it in the UI summary. Making the loop atomic would need a new server RPC, which is a SQL change this phase explicitly does not propose |
| D-N4 | **WITHDRAWN by Codex audit.** The draft claimed a bound of exactly `0` is ignored because the guard is a truthiness check | No owner decision exists or is needed. Input values are strings: `"0"` is truthy, so the guard runs and `parseFloat("0")` supplies a real zero bound. Preserve and test that actual legacy behaviour |
| D-N5 | Realtime — legacy's fixed subscription list (1174) omits all three `serfiyyat_*` tables, so another user's document does not appear until a manual reload | Subscribe to `serfiyyat_documents` and `serfiyyat_lines` (M13-19). Recorded as an improvement, not parity — the D-M4 precedent |
| D-N6 | The report's «Daxil edən» filter matches the resolved email, but falls back to the raw uuid when `UMAIL` is missing that user (6588, 6681) | Keep legacy behaviour. The fallback is the same one the audit log uses and is already accepted there |
| D-N7 | The export has no CSV fallback, unlike every other export in the platform (6720) | Keep legacy behaviour for this phase and record it. Adding a fallback is an improvement; the shared `xls()` CSV path is not reachable from a two-sheet workbook without redesigning the export |

## 7. Optional improvements, explicitly not proposed for this phase

The silent skip of an empty-code import row (6383-6384), the non-atomic import
loop (D-N3), the string-backed zero-bound filter behaviour (corrected M13-84), the missing CSV fallback
(D-N7), and the fact that the active tab lives in a DOM dataset rather than in
`SM` (6244) are all legacy behaviours the port reproduces. They are listed here
so a future reviewer can see they were noticed and kept deliberately, not
missed.

## 8. Known CSS gap (source-verified this session)

**Correction recorded deliberately (protocol §2, §11).** An earlier draft of
this section claimed `web/src/index.css` has "no `.tbl` rule" and cited
`index.html:88-104`. Both statements were wrong and are retracted here rather
than silently fixed. Inspecting the legacy stylesheet directly shows there is
**no `.tbl` class rule anywhere in the platform**: `tbl` appears only as a
class attribute in markup generated by `tbl()` (1409) and in this module's own
hand-written `<table class="tbl">` strings, while the styling comes entirely
from the bare element selectors `table`, `th`, `td` (legacy 75-81). A grep for
`.tbl` returning zero is therefore the expected result, not a gap.

The verified position, selector by selector:

| Rule | Legacy | In `web/src/index.css` |
|---|---|---|
| `table`, `th`, `td`, `th.r,td.r`, `tbody tr:hover` | 75-78, 77, 79 | **present** (80-84) |
| `.tw`, `label.f`, `label.f>span`, `.filters` family | 73, 109-110, 112-114 | **present** (79, 112-116) |
| `.seg` family, `td.nm`, `.t-op`/`.t-mv`/`.t-out` | 115-118, 81, 84-87 | **present** — ported by Phase 12 (88, 97-99, 120-123) |
| `.tag`, `.t-in`, `.t-rm`, `.t-mut`, `.muted`, `.bar` | 82-88, 89-91 | **present** (89-92) |
| **`.row`** | **111** | **ABSENT** |
| `tbody tr.clk` | 80 | absent — not needed here (no row of this module's four tables is clickable) |
| `.neg` | 92 | absent — not needed here (this module renders no negative-balance cell) |

So exactly **one** rule must be ported: `.row{display:grid;gap:10px}` (legacy
111). It is load-bearing rather than cosmetic — every header block, the
three-column form rows and all three filter rows are `<div class="row">` with
an inline `grid-template-columns`, and without the `display:grid` declaration
the inline template does nothing and each block collapses to stacked blocks.

The recommendation follows the D-L5 / Phase 12 precedent: port that single rule
verbatim as part of the implementation task, pinned by a text-read assertion in
the manner of the existing `index.css.dashboard.test.ts`, folded into the
plan's T6 rather than raised as an eighth decision.
