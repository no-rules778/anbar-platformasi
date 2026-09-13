# Phase 13 TEST-only implementation plan — Module N («Sərfiyyat Materialları»)

Status: **IMPLEMENTED ON CLAUDE'S SIDE — 2026-09-11.** The owner accepted
D-N1, D-N2, D-N3, D-N5, D-N6 and D-N7, and T1-T6 and T9 have run.
**T7 did NOT run: no TEST identity was supplied**, so 0 Supabase contacts, 0
write attempts, 0 sequence advances and 0 `audit_log` rows occurred, and
D-N1's residual accounting is all-zero with nothing to clean up.
**Tally, measured mechanically from the 77 `| M13-* |` status cells: 69
`CODE VERIFIED`, 0 `LIVE VERIFIED`, 2 `IN PROGRESS` (M13-70, M13-71), 6
`NOT STARTED` (M13-90…M13-94, M13-98), 0 `BLOCKED`, 0 unclassified.**
Phase 13 remains `NOT ACCEPTED` pending Codex's final independent audit.
[Implementation audit](../audits/2026-09-11-phase13-implementation.md).

**SUPERSEDED (HISTORY):** this plan's original status line said implementation
was not yet authorised, that no task could run until the owner answered
D-N1…D-N3 and D-N5…D-N7, and that all 77 rows were `NOT STARTED`. All three
statements were true when written and are now false; the T0-T10 task text
below is retained as the executed plan of record.
[Proposal](../specs/2026-09-11-react-migration-phase13-serfiyyat-materiallari-proposal.md) ·
[Ledger (77 rows)](../specs/2026-09-11-phase13-registry-rows.md) ·
[Design handoff audit](../audits/2026-09-11-phase13-design-handoff.md)

## Hard constraints for every task

TEST `alkjjbaawmsirsfvqljm` only; **never** contact production
`bbjmhaerssakbreykxiw`; sandbox mode; preserve the dirty tree; no stage,
commit, push or deploy; **no SQL change** (`sql/032` is applied and unchanged);
never store or print a password. The localhost dev server is started with
`npm run dev -- --mode sandbox --host 127.0.0.1 --port 5175`; if that port is
taken, **inspect and reuse** the existing server after confirming the TEST ref
and `VITE_ALLOW_LOCAL_WRITES=false`, rather than killing an unknown process.

## T0 — design closure (external, blocking)

1. Codex independent design audit of the proposal, the 77-row ledger and this
   plan against `index.html:262, 382-390, 1163-1181, 1495-1512, 6178-6246,
   6250-6362, 6364-6395, 6397-6512, 6514-6574, 6576-6646, 6650-6726, 7505-7507`
   and the three `serfiyyat_*` RPCs, tables, policies and grants in the
   captured TEST schema (`2398-2484`, `2508-2541`, `2716-2805`, `160-191`,
   `5753-5764`, `5876-5898`).
2. Owner decisions D-N1…D-N3 and D-N5…D-N7. D-N4 is withdrawn; its false
   zero-bound premise was corrected by the Codex audit. **D-N1 gates every write row**: without a TEST
   write window, the persisted/server-live clauses in M13-50…M13-54, M13-70,
   M13-71 and M13-90…M13-94 cannot be promoted beyond `CODE VERIFIED`.
   M13-95 and M13-96 are structural and remain provable from source, so
   neither is falsely labelled write-blocked.
3. Confirm no other session is editing `App.tsx`, `index.css` or
   `mutationGuard.ts` — the three shared files this phase touches.

No row is promoted by T0.

## T1 — pure logic (`lib/serfiyyat.ts`), tests first

Falsifiable positive / negative / boundary cases per protocol §3, §4.

- `allowedProjects(me, projects, forWrite)` — M13-06, M13-07. Full matrix:
  {admin, anbardar-matching, anbardar-other, anbardar-no-warehouse, rehber} ×
  {forWrite true, false}. The load-bearing negative control is **rehber +
  `forWrite:false` returns every active project** while `forWrite:true` returns
  none — a single-value test cannot separate those. Inactive projects are
  excluded in every cell.
- `canWrite(me)` — M13-05. Admin and anbardar true, rehber false. Named as an
  **affordance** in the test title so no reader mistakes it for a permission.
- `draftLineTotal(lines)` / `draftGrandTotal(lines)` — M13-42, M13-43. Boundary:
  a grand total of exactly `0` renders `—` through `money()`, not `0,00 ₼`.
  A separate case pins that the draft uses raw `qty * price` while the stored
  `line_sum` is `round(qty*price, 2)`, so the two may differ before a reload.
- `reportRows(lines, docs, projects, items, emails, allowedIds)` — M13-75,
  M13-76, M13-77. Negative controls: a line whose document is missing is
  dropped; a line whose project is outside the allowed set is dropped; an
  unresolved author falls back to the raw uuid; an unknown item code falls back
  to the code with an empty unit.
- `itemSearchHits(query, items)` — M13-32. Boundary matrix on the length rule:
  1 char returns nothing, 2 chars searches; matches by name substring OR code
  substring; caps at 12 with a 13-candidate fixture. Explicitly **not** one of
  the platform's three existing normalisers (`dupNormalise`, `NORM`, `REF_EQ`)
  — a test asserts a fourth is not introduced.

## T2 — filters and aggregation (`lib/serfiyyatFilters.ts`), tests first

- `filterReportRows(rows, filters)` — M13-83, M13-84. One positive and one
  negative per filter across all fifteen. **The load-bearing boundary is the
  string-backed guard:** `''` disables a numeric bound, whereas `'0'` is
  truthy and applies numeric zero. Use a zero-price/zero-sum row plus a
  positive row so `p2 = '0'` or `s2 = '0'` must retain only the zero row.
  Equality filters (Layihə, Alınma
  kanalı) must fail a substring fixture that a `includes()` implementation
  would wrongly pass.
- `summariseByProject(rows)` / `summariseByItem(rows)` — M13-86, M13-87.
  **The fixture must deliberately oppose alphabetical and descending-value
  order** so first-appearance ordering is falsifiable (protocol §4); an
  already-ordered fixture proves nothing. Empty input yields the em-dash row.

## T3 — import parsers (`lib/serfiyyatImport.ts`), tests first

The phase's largest new risk surface. Both parsers are pure and take a 2-D
array, so no file or workbook is needed in a test.

- `parseLineImport(rows2d, itemsByCode)` — M13-61, M13-62, M13-63. Header vs
  positional detection; the three row outcomes as separate cases — **an empty
  code is skipped silently and counted nowhere**, an unknown code and a
  non-positive qty are each rejected WITH their exact message; comma decimals
  convert; a missing price defaults to 0.
- `parseDocsImport(rows2d, allowedProjects, items)` — M13-65…M13-68.
  - The avtomobil/qaimə column exclusion (M13-66) needs a fixture carrying
    BOTH «Avtomobil nömrəsi» and «Qaimə nömrəsi» headers; without both, the
    exclusion is vacuous.
  - The grouping key (M13-67) must be tested by **varying each of the seven
    components independently** — protocol §4 states that one mismatched
    component does not prove the others participate. Seven positive splits
    plus one control where all seven match and the rows merge.
  - A project outside the write-allowed set produces the per-row error naming
    the 1-based worksheet line, proving the line number is the sheet's, not
    the array index.
- No test in T3 calls Supabase or reads a file; the XLSX→2-D conversion is a
  thin adapter tested separately in T5.

## T4 — API and store

`api/serfiyyatDocuments.api.ts` — M13-10…M13-13:

- The page's OWN snapshot reader over the three tables and required item
  catalogue, plus the shared `fetchReferenceValues()` for channels. It reuses
  the boot-warmed application user directory and must **not** widen or reuse
  `fetchSerfiyyat()`, whose narrow column set is the accepted Phase 3 contract
  (D-N2, the M12-10 fan-out precedent) — a test asserts the exact source set.
- The readiness rule: **all three** table reads and the item catalogue must succeed, and a
  `serfiyyat_lines` failure alone yields `ok:false` (M13-10). A separate test
  pins that a `get_reference_values` failure leaves readiness TRUE with an
  empty channel list (M13-12) — the two failure scopes must not merge.
- Both failure shapes normalised: a returned `{ error }` and a rejected
  promise.
- Three RPC wrappers — `createSerfiyyatDocument`, `editSerfiyyatDocument`,
  `deleteSerfiyyatDocument`. Each passes exactly the documented parameters with
  empties as `null` (M13-51), returns `{ ok, data, error }`, never throws, and
  calls `blockedReason()` FIRST (M13-97).
- `mutationGuard.ts` gains an additive
  `SerfiyyatWriteAction = 'sm.create' | 'sm.edit' | 'sm.delete'` union plus the
  three `WRITE_ACTIONS` entries. Nothing existing is modified.

`store/serfiyyat.store.ts` — M13-13…M13-18: module-level `requestSeq` ticket,
atomic apply for the three core table reads plus the item catalogue, retention on a failed refresh,
and draft lines / `editDocId` / filters / active tab held in the store. Tests:
any core table or item reader failing applies nothing; a reference-values failure is
non-fatal and applies the complete core snapshot with an empty channel list;
a failed refresh retains the previous snapshot and raises the stale
flag; an older success **and** an older failure settling after a newer reply
are both discarded; the draft and filters survive a simulated unmount/remount.

## T5 — export (`lib/serfiyyatExport.ts`)

- `buildSerfiyyatWorkbook(rows)` — M13-88. **Two sheets**, «Jurnal» (15 columns
  in the exact legacy order) and «Yekun» (per-project totals). It bypasses the
  shared `xls()` entirely, following the `xlsGroups.ts` cell-by-cell precedent;
  a test asserts both sheet names, the header row and that no autofilter,
  column-width or freeze-pane property is set.
- M13-89: when the workbook library is unavailable it toasts «Excel
  kitabxanası yüklənmədi» and writes nothing — **no CSV fallback** (D-N7). The
  test asserts nothing is written, which a `xls()`-routed implementation would
  fail.

## T6 — page, components and CSS

`pages/SerfiyyatPage.tsx` — M13-03, M13-04, M13-14, M13-16, M13-17: shell,
fixed subtitle, two-button segment, readiness gate, loading / first-error /
retained-refresh surfaces.
`components/serfiyyat/DocumentForm.tsx` — M13-20…M13-25, M13-30…M13-36,
M13-39…M13-43, M13-50…M13-54. **The four early-return guards are tested in
order**, each fixture reaching exactly one, so no later guard is credited with
an earlier guard's refusal (protocol §5).
`components/serfiyyat/ReportView.tsx` — M13-72…M13-74, M13-80…M13-87.
`components/serfiyyat/DocsImportPreviewDialog.tsx` — M13-69, M13-70, including
the disabled confirm button when no group parsed.
`App.tsx` — the `sm` route and rail entry (M13-01, M13-02). The nav test must
assert the entry is rendered for **all three roles** with no gate, which is the
falsifiable half of M13-02.

CSS: port `index.html:111` — `.row{display:grid;gap:10px}` — verbatim into
`web/src/index.css`, pinned by a text-read assertion in the manner of the
existing `index.css.dashboard.test.ts` (M13-99). That is the ONLY rule this
page needs; everything else it uses is already present (proposal §8).

## T7 — live write window (**requires D-N1**)

Only if the owner authorises it, and with the boundary stated in advance:
a Sərfiyyat document **is** removable — create → delete restores the document
catalogue — but the window is **NOT database-net-zero**. The base create →
edit → delete leg consumes one `serfiyyat_doc_seq` value and leaves three
`audit_log` rows. The M13-70 multi-group leg adds one sequence advance and one
INSERT audit row for every group that succeeds before the deliberate failure;
each cleanup DELETE adds another permanent audit row. Record the baseline,
every returned document id/number, every cleanup, the exact final sequence
advance and the complete audit-row delta. Do not describe the total as fixed
at one sequence/three audit rows.

Per-row: M13-50…M13-54 (create and edit, success and failure), M13-70 (the
per-group import loop, including a deliberate mid-loop failure proving earlier
documents persist), M13-71 (delete), M13-90 (a direct PostgREST write refused
for every role), M13-91 (each role refusal observed as a **server** refusal),
M13-92 (first refusing guard named for at least the not-admin/anbardar,
wrong-warehouse and qty-regex cases — **the negative-quantity refusal is
reachable only here**, since the browser's own guard refuses first),
M13-93 (line ids differ after an edit, read back), M13-94 (`audit_log` rows
read back — needs a TEST admin identity). Every document successfully created
by M13-70 must be deleted before the window closes; only sequence and audit
history may remain.

Identities required: a TEST **anbardar** whose warehouse is linked to an active
project, and a TEST **admin** (does not exist — the same boundary M10-51,
M11-91 and M12-98 carry). Supply either only as a process-only variable, never
in a repo file.

## T8 — read-only live sweep (no D-N1 needed)

As the existing TEST identity, read-only, on the sandbox server with the
production-abort and blanket-mutation guards armed:

- rail entry present, last in «Bazalar», and reachable (M13-01, M13-02);
- exactly the three `serfiyyat_*` reads plus `items` and `get_reference_values`,
  with no duplicate user-directory RPC and no movements, balances or valuation
  read (M13-10, M13-95);
- the readiness gate's rendered state, and the segment control switching tabs
  (M13-16);
- the form's role-dependent guard actually reached for this identity
  (M13-21…M13-23), naming which one;
- report filters, the fourteen-column table, the «Yekun» aggregation and the
  admin-only document table's presence or absence (M13-72, M13-80…M13-87);
- retention under an injected 503 **and** under a network abort, with clean
  recovery (M13-14);
- **0 production hits, 0 write attempts** — asserted, not assumed.

## T9 — full gate

`tsc -b --noEmit`, `oxlint src`, full vitest suite, `vite build --mode
sandbox`, `git diff --check`, staging empty, and a regression check that no
accepted Phase 9-12 module's file changed. Focused suites run during T1-T6;
the full gate runs once after code completion.

## T10 — documentation and reconciliation

Update the ledger statuses from measured evidence only, re-derive the tally
mechanically from the `| M13-* |` status cells, update every authoritative
summary surface (ledger banner, ledger tally table, parity registry banner,
`CLAUDE_NEXT_PROMPT.md` banner, the new audit's verdict), run the documentation
integrity checks, and write one implementation audit. Phase 13 stays
`NOT ACCEPTED` until Codex's final independent audit.
