# Phase 11 — design reconciliation and handoff for the independent Codex audit

Date: 2026-09-11  
Verdict: **DESIGN DRAFTED; NOT STARTED / NOT ACCEPTED; no implementation.**
Environment: no Supabase contact of any kind in this session (neither TEST
nor production); documentation only.

> **CODEX CORRECTION — 2026-09-11.** The first draft incorrectly said a
> negative movement price falls back to the item price in M11-24's purchase
> KPI. Legacy uses `m.pr || itemPrice || 0`; negative numbers are truthy and
> therefore remain in the calculation. The proposal, ledger and planned
> boundary test now state this exactly. The 55-row tally is unchanged.

## What was done

After Phase 10's final acceptance, Claude read the post-Phase-9 roadmap, the
Phase 9 and Phase 10 final acceptance audits and owner decisions, the Phase
10 proposal/ledger/plan/design audit as format references, and the legacy
dashboard only: shell `index.html:277-292`, rail 250-251, `go()`/`render()`
1494-1520, `rDash()` 1534-1589, `barChart`/`donut`/`tbl`/`TYPE_TAG`
1368-1418, click delegation 1361-1364 and 1851-1858, formatters 592-602,
loader 844-1017, realtime 1162-1181, `index()` 1246-1320, `controlIssues()`
6996-7031, `fullExport` 7597-7673, `sonExport` 7900-7928, sign-in landing
7523. On the React side it read the accepted Phase 9/10 primitives
(`itemIndex.ts`, `operationalMovements.ts`, `format.ts`, `movementRoute.ts`,
`recorderLabel.ts`, `warehouseOverview.*`, `balancesSnapshot.api.ts`,
`useRealtimeRefresh.ts`, `ItemCard` props, `App.tsx` rail/default page,
`index.css`).

Produced exactly four documents:

| Deliverable | File |
|---|---|
| Proposal | [specs/2026-09-11-react-migration-phase11-dashboard-proposal.md](../specs/2026-09-11-react-migration-phase11-dashboard-proposal.md) |
| Ledger (authoritative `M11-*`) | [specs/2026-09-11-phase11-registry-rows.md](../specs/2026-09-11-phase11-registry-rows.md) |
| TEST-only plan | [plans/2026-09-11-react-migration-phase11-dashboard.md](../plans/2026-09-11-react-migration-phase11-dashboard.md) |
| This handoff audit | `audits/2026-09-11-phase11-design-handoff.md` |

Banners updated: `CLAUDE_NEXT_PROMPT.md`, `ANBAR_FUNCTIONAL_PARITY_REGISTRY.md`,
the roadmap status paragraph, and one `CLAUDE_HANDOFF.md` log entry.

## Ledger tally (mechanical) — HISTORY as of 2026-09-11

> **SUPERSEDED.** The owner then approved D-L1…D-L5 and the implementation
> ran the same day. The tally below is the DESIGN-TIME figure and is history;
> the current one lives in the
> [ledger banner](../specs/2026-09-11-phase11-registry-rows.md) and the
> [implementation audit](./2026-09-11-phase11-implementation-live-check.md).
> Everything else in this document — the contract inventory, the reuse
> boundary and the reconciliation points — still stands as written.

Derived from the `| M11-* |` rows of the ledger by the command recorded in
§ Validation, not from prose, **at design time**: **55 unique rows; 0
duplicates; 55 `NOT STARTED`; 0 `CODE VERIFIED`, 0 `LIVE VERIFIED`, 0
`IN PROGRESS`, 0 `BLOCKED`; 0 unclassified.** Row groups: shell/route 7 (M11-01…07),
snapshot/store/realtime 9 (M11-10…18), scope 1 (M11-20), KPIs 6
(M11-21…26), charts 6 (M11-30…35), tables 6 (M11-40…45), alerts 13
(M11-50…62), presentation 5 (M11-70…74), safety/evidence 2 (M11-90…91).

## Reconciliation points for Codex

1. **Reuse boundary.** Every calculation the dashboard needs is a pure
   function over the accepted `buildItemIndexes()` outputs; no index code is
   modified. The only new read is `partners`, required solely by the VÖEN
   rule (7003). Codex should confirm that adding a fourth read to a NEW
   `dashboard` snapshot (rather than widening the `LIVE VERIFIED` three-read
   Phase 10 snapshot, M10-10) is the correct way to keep accepted contracts
   intact.
2. **Selector-scoping asymmetry (legacy fact, verified twice).** KPIs, donut,
   both tables and the movement count in the subtitle follow the selector;
   the bar chart (1558, `IX.bal`), the subtitle's `last` date (1548,
   `IX.dates`) and the alerts card (1585, `controlIssues()`) do NOT. The
   ledger preserves this (M11-04, M11-30, M11-51); it is not proposed as a
   fix.
3. **Two valuation rules on one page.** KPI 4 uses movement price first with
   item-price fallback (1546); KPI 1, the bar chart, top-10 and the `wo`
   rule use item price only (1313, 7025). Pinned separately (M11-24 vs
   M11-21/M11-30/M11-61) so a test cannot pass for the wrong reason.
4. **Accepted deviations carried forward, worded as deviations:** atomic
   snapshot, first-load error block, failed-refresh retention, stale-response
   ordering (M11-11/12/15). Legacy renders partial data after a per-table
   toast (855). These are Phase 8-10 precedents, not parity.
5. **Realtime toast.** Legacy toasts «Məlumatlar yeniləndi (digər
   istifadəçi)» after every realtime reload (1169). Phase 10 did not port it
   and its M10-13 wording did not claim it; `ReferenceDirectoryPage.tsx:62`
   did port it. Phase 11 includes it as M11-14. Codex may wish to note the
   Phase 10 omission as a separate follow-up; it is not reopened here.
6. **Stylesheet gap (new finding, source-verified).** `web/src/index.css`
   contains no `.kpi`, `.kpis`, `.eyebrow`, `.grid`, `.bar`, `.bar i`,
   `.pill-row` or `.chart` rule (`grep -c "kpi"` → 0). The bar chart is
   therefore invisible without D-L5, and Phase 9/10 KPI blocks are currently
   unstyled. Raised as D-L5 with a recommendation to port verbatim now.
7. **`controlIssues()` shape.** Designed as the shared function Phase 15
   will consume whole; Phase 11 renders only title/severity/count. This
   avoids a second implementation later. If D-L3 defers the card, M11-50…62
   move to the Phase 15 ledger and the total is re-derived at design
   acceptance, never silently.
8. **Rows kept out of the ledger** (prose boundary in proposal §2.10/§6):
   `Tam ixrac`, `Excel (SON formatı)` (D-L2), rail counter badges (shell,
   Phase 18), `Çap` (absent from the page). If the owner brings an export
   forward, rows are added before acceptance.

## Owner decisions raised (each with a recommendation)

| Id | Question | Recommendation |
|---|---|---|
| D-L1 | Default landing page | `dash` for every role, ungated (legacy 7523) |
| D-L2 | Header exports | exclude from Phase 11; Phase 16 |
| D-L3 | Alerts card / `ctrl` drill-down | port `controlIssues()` now; pills inert with a `title` until Phase 15 |
| D-L4 | Selector options built once vs rebuilt | rebuild from the snapshot, keep a valid selection (approved deviation) |
| D-L5 | Missing stylesheet rules | port legacy CSS lines 30, 66-72, 89-90, 121, 151 verbatim now |

## Evidence classes in this package (as of the design pass; see the header note)

| Class | Used here |
|---|---|
| Source (legacy `index.html` and React files read in-session) | every contract row's legacy ref |
| Unit / browser / live | none at design time — no code existed yet, and all 55 rows were `NOT STARTED`. The implementation that followed carries its own evidence |
| Persisted TEST | none; no Supabase contact |
| Unavailable external | a TEST admin/rehber identity remains unavailable (M11-91 boundary, as M10-51) |

## Evidence boundaries and non-claims

- No application, test, SQL, CSS or environment file was changed.
- No Supabase project was contacted; production `bbjmhaerssakbreykxiw` was
  never referenced by any command.
- Nothing was staged, committed, pushed or deployed; the dirty tree from
  Phases 9-10 is preserved.
- No password or token was read, stored or printed; the `.env.sandbox.local`
  file open in the IDE was not read.
- No row is promoted; no count is copied forward from any earlier phase.

## Validation performed (documentation integrity)

Recorded in the final report with outputs: unique `M11-*` ids and total
(awk over the ledger), per-row cell count of every markdown table in the
four documents, existence of every relative link target, `git diff --check`,
empty staging, and read-back of each changed banner.

## Next step

Independent Codex design audit of the proposal, ledger and plan, then owner
decisions D-L1…D-L5. Until both are complete Phase 11 remains
**NOT STARTED / NOT ACCEPTED** and no application code may be written.
