# Phase 18 authoritative registry — Module U (whole-platform parity and cutover readiness)

**PHASE STATUS: ACCEPTED (owner decision, 2026-09-12)** for the implemented
shell / read-only scope, after the independent Codex audit. The 10
authority/realtime/export/cutover contracts retain `BLOCKED` as verification-
package statuses and no longer block acceptance; none was promoted by the
transfer. [Decision](../decisions/2026-09-12-phase18-shell-acceptance-scope.md) ·
[Codex audit](../audits/2026-09-12-phase18-final-codex-audit.md) ·
[authority package](../plans/2026-09-12-phase18-authority-verification-package.md) ·
[cutover package](../plans/2026-09-12-phase18-cutover-package.md) ·
[proposal](./2026-09-12-react-migration-phase18-whole-platform-parity-proposal.md) ·
[plan](../plans/2026-09-12-react-migration-phase18-whole-platform-parity.md).

**Current tally:** 24 `CODE VERIFIED`, 5 `LIVE VERIFIED`, 3 `ACCEPTED`,
0 `IN PROGRESS`, 0 `NOT STARTED`, 10 `BLOCKED`, 0 unclassified;
**42 unique rows**, 0 duplicates.

`ACCEPTED` on a row means the owner settled that contract's disposition
(D-P1, D-P4). It is **not** an evidence claim and must never be read as
`CODE VERIFIED` or `LIVE VERIFIED`.

This tally is derived mechanically from the primary status cell of each
`| M18-* |` row below — the first status token at the start of the final cell —
never by counting status words in prose. Ids are non-contiguous by design
(M18-01…M18-70, grouped in blocks per module); all 42 are unique with no
duplicates.

**Update, 2026-09-12 (owner decisions applied — latest).** D-P1 and D-P4 were
ACCEPTED and D-P2 DEFERRED; D-P3 is partially complete. Three rows moved
`BLOCKED` → `ACCEPTED` because the owner **settled the question** they were
blocked on, not because evidence appeared: M18-15 (badges intentionally
omitted), M18-52 and M18-53 (no «Kontragentlər» rail entry). Ten rows were
transferred to the authority and cutover packages, all retaining `BLOCKED`.
Derived tally moved 24/5/0/0/13 → **24/5/3/0/0/10**; the 24 `CODE VERIFIED` and
5 `LIVE VERIFIED` figures are unchanged, because nothing was promoted on
evidence in this round.

A code consequence followed D-P1: `c-knt` is no longer fetched (`NavCounts` is
now `items` + `warehouses`). With the rail entry permanently declined the count
had no possible consumer. The implementation audit had flagged that dead request
as a residual concern; it is now removed rather than justified.

**HISTORY — the correction below stands as recorded. Correction, 2026-09-12 (before any downstream citation).** The first draft of
this banner and its tally table asserted 27 / 13 / 40 from a hand count made
while the rows were being written. The mechanical parse of the primary status
cells returns **28 / 14 / 42**. The hand count was wrong, not the rows; no row
status was changed to fit either figure. This is the fifth occurrence of this
defect class after Phase 12 (58→70), Phase 13 (86→77), Phase 14 (96→99) and
Phase 17 (24/53/12/89 → 44/48/18/110), and it is recorded here rather than
silently overwritten, per protocol §10/§12.

**Evidence ceiling (binding).** Every `CODE VERIFIED` row below is proved by
offline tests in the jsdom harness or by source inspection against
`index.html`. Not one of them is evidence of a server policy, an RLS decision,
a grant, a function body or a server refusal. A rendered rail entry is a
browser affordance. Five presentation rows were subsequently exercised live
against TEST `alkjjbaawmsirsfvqljm`; no server/catalog claim is inferred from
them. See the final Codex audit.

**Phase 17 boundary.** M17-17…M17-21, M17-28, M17-80…M17-89 and M17-100 are NOT
part of this ledger. They belong to
[the Phase 17 authority verification package](../plans/2026-09-12-phase17-authority-verification-package.md)
and are not silently absorbed here.

**No TEST mutation, fixture, import, deletion, egress, deployment or production
contact was performed in this phase. Permanent residuals: 0.**

## Module U1 — rail structure and navigation

| Id | Contract | Legacy authority | Evidence | Status |
|---|---|---|---|---|
| M18-01 | «Nomenklatura sorğuları» is the SECOND entry of «Bazalar», directly under «Nomenklatura» and above «Mal qrupları» | index.html:256-258 | `LIVE VERIFIED` — exact order observed in real TEST admin and anbardar rails at desktop/mobile widths; shell tests retained | LIVE VERIFIED |
| M18-02 | The «Miqrasiya» rail notice («Digər bölmələr köhnə platformadadır») is removed | — | `LIVE VERIFIED` — notice absent while the complete real rail rendered in both authenticated TEST roles | LIVE VERIFIED |
| M18-03 | The `knt` report's full-list card carries the «Tam siyahı» header | index.html:6749 | `ReportsPage.test.tsx`, with a control on the paired card's header | CODE VERIFIED |
| M18-04 | All 16 routed sections remain reachable and no accepted rail entry changed group, gate or relative order beyond M18-01 | index.html:250-271 | `App.test.tsx` exhaustive group fixtures (admin, anbardar); full suite green | CODE VERIFIED |
| M18-05 | «Azpetrol / Araz» remains the ONE role-gated rail entry, gated by `azpCanRead`, not `isAdmin` | index.html:268, 7507 | `App.test.tsx` runtime gate tests for admin / rehber / anbardar | CODE VERIFIED — a browser affordance; the authority is `azp_can_read()` and the RLS SELECT policies, which no offline test can reach |

## Module U2 — rail counter badges

| Id | Contract | Legacy authority | Evidence | Status |
|---|---|---|---|---|
| M18-10 | `c-nom` and `c-anb` badges are restored; counts are fetched once at boot, count-only (`head:true`), never as rows | index.html:1521-1531, 1518 | `lib/navCounters.test.ts` (8 tests incl. controls); `App.shell.test.tsx` badge rendering | CODE VERIFIED |
| M18-11 | `c-anb` sums the ACTIVE-anbar leg and the ALL-rows leg of the single `warehouses` table, reproducing legacy's arithmetic | index.html:933-935 | `navCounters.test.ts` «filters the DB.whs leg…», «sums the two warehouse legs» + a non-coincidence control | CODE VERIFIED — there is no `locations` table; legacy double-counts active anbar rows and that is reproduced, not "corrected" |
| M18-12 | A failed count renders `!`, never `0`; a genuine zero renders `0` | index.html:1528 | `navCounters.test.ts` null/zero discrimination; `App.shell.test.tsx` badge degradation + zero tests | CODE VERIFIED — a failed count displayed as 0 would assert "there are none", which nothing verified |
| M18-13 | One failed count leg does not blank the others; a partial warehouse sum is suppressed | — | `navCounters.test.ts` isolation and either-leg-null tests | CODE VERIFIED |
| M18-14 | `c-knt` is NOT fetched, because «Kontragentlər» has no rail entry to display it on | index.html:259 | `navCounters.api.ts` no longer queries `partners`; `navCounters.test.ts` asserts the table list and `not.toContain('partners')` | CODE VERIFIED — **corrected after D-P1 ACCEPTED 2026-09-12.** The row previously read «fetched but not displayed»: the count WAS issued at boot with no consumer, which the implementation audit flagged as a residual concern. With the rail entry permanently declined the request was removed, and a control now proves it is not issued |
| M18-15 | `c-mov`, `c-bal` and `c-ctrl` are NOT implemented | index.html:1522-1523, 1530 | none — deliberately unimplemented | ACCEPTED — **D-P4 ACCEPTED 2026-09-12: intentionally omitted.** Each needs the full movement/balance dataset and migrated client rules; computing them at boot would reintroduce the global cache the migration removed. A guessed badge is worse than no badge. This is a settled owner disposition, NOT an evidence claim |

## Module U3 — page-switch side effects

| Id | Contract | Legacy authority | Evidence | Status |
|---|---|---|---|---|
| M18-20 | Every page switch resets the scroll position to the top | index.html:1511 | `App.shell.test.tsx` rail-click and cross-page-handoff scroll tests | CODE VERIFIED |
| M18-21 | Every page switch clears the open item card | index.html:1510 | `App.shell.test.tsx` card-reset test + a CONTROL proving the card survives when the page does NOT change | CODE VERIFIED — not made redundant by unmount: `cardCode` lives in the store and outlives the page |
| M18-22 | `closeOverlays()` is deliberately NOT ported | index.html:1351-1354, 1509 | reasoned exclusion recorded in `App.tsx` | CODE VERIFIED — React dialogs are children of their page and die with it; the legacy call existed only because its overlays were singleton DOM nodes outside the page. Porting it would prevent no failure |
| M18-23 | The «Malı redaktə et» handoff still delivers its card despite M18-21 | index.html:1888 | `App.shell.test.tsx` «still delivers the card for the «Malı redaktə et» handoff» | CODE VERIFIED — navigate first, open the card second; the reverse order would clear the very card requested |
| M18-24 | Every rail entry and every cross-page handoff routes through one `go()` helper, so the side effects cannot be missed by a caller | index.html:1495-1512, 1363 | `App.nav.test.ts` source checks; the scroll-on-handoff test above | CODE VERIFIED |

## Module U4 — responsive layout and topbar

| Id | Contract | Legacy authority | Evidence | Status |
|---|---|---|---|---|
| M18-30 | At the 900px breakpoint and below the rail becomes a fixed off-canvas drawer toggled by a burger, and closes on navigation | index.html:204-211, 240, 1508, 1514 | `LIVE VERIFIED` at 800×700: rail hidden, burger opened it, real «Anbar qalıqları» navigation closed it; 1200×800 restored the fixed desktop rail. Offline controls retained | LIVE VERIFIED |
| M18-31 | The topbar carries the presence chip: two initials and the first name, full name as tooltip | index.html:243, 606, 1191-1194 | `LIVE VERIFIED` — admin `AT / ANBAR` and anbardar `A / anbar-anbardar-test` chips observed in real TEST UI; unit/CSS controls retained | LIVE VERIFIED |
| M18-32 | `initials()` is ported verbatim, including the two-part cap and the `'?'` fallback | index.html:606 | `lib/format.test.ts` whitespace, single-word, over-length and empty cases | CODE VERIFIED |
| M18-33 | The print stylesheet still strips the shell after the new rules | index.html:203 | `index.css.shell.test.ts` print regression test | CODE VERIFIED |
| M18-34 | Responsive behaviour verified in a real browser at real viewport widths | — | `LIVE VERIFIED` — TEST sandbox at 800×700 and 1200×800, with screenshots inspected and a real drawer open/navigation/close cycle | LIVE VERIFIED |

## Module U5 — cross-module consistency, roles, realtime, exports

| Id | Contract | Legacy authority | Evidence | Status |
|---|---|---|---|---|
| M18-40 | All 15 data pages subscribe to realtime refresh through the shared `useRealtimeRefresh` hook | — | source inventory: every page under `src/pages` with a data load calls it | CODE VERIFIED — wiring only; that a server change actually arrives is M18-41 |
| M18-41 | A real Supabase change event refreshes an open page | — | none | BLOCKED — TRANSFERRED to the [authority verification package](../plans/2026-09-12-phase18-authority-verification-package.md); retains BLOCKED. Needs a live TEST window and an authorised writer; no mocked test can satisfy it |
| M18-42 | Role visibility across the whole rail behaves identically for admin, rehber and anbardar | index.html:7505-7507 | `App.test.tsx` runtime rail assertions for all three roles | CODE VERIFIED — CLIENT affordance only. What each role may READ is RLS and is not evidenced here |
| M18-43 | Server-side role enforcement across modules (RLS, grants, function refusals) | — | none | BLOCKED — TRANSFERRED to the [authority verification package](../plans/2026-09-12-phase18-authority-verification-package.md); retains BLOCKED. Requires live role legs; explicitly not inferable from any rendered UI, including the completed admin/anbardar rehearsal |
| M18-44 | Export entry points exist on every screen that legacy exports from | index.html:457 and per-page controls | existing per-phase export delegation suites, all green | CODE VERIFIED — entry points and delegation; byte-level workbook parity is M18-45 |
| M18-45 | Exported workbooks match the approved Excel specification byte-for-byte | — | none | BLOCKED — TRANSFERRED to the [authority verification package](../plans/2026-09-12-phase18-authority-verification-package.md); retains BLOCKED. Needs authorised egress and template comparison |
| M18-46 | Cross-screen data consistency: the same item/partner/warehouse reads identically on every screen | — | none | BLOCKED — TRANSFERRED to the [authority verification package](../plans/2026-09-12-phase18-authority-verification-package.md); retains BLOCKED. Needs one live dataset read across modules; the rehearsal's balance/dashboard agreement is one screen pair, not a cross-module claim |
| M18-47 | Shared snapshot stores are not reset by navigation, so a page switch does not silently discard a loaded filter | — | full suite green after routing every switch through `go()`; `go()` touches only `cardCode` and the rail | CODE VERIFIED |

## Module U6 — migration completeness and cutover readiness

| Id | Contract | Legacy authority | Evidence | Status |
|---|---|---|---|---|
| M18-50 | All 17 legacy top-level sections are enumerated and accounted for | index.html:250-271, 1517 | proposal §2; 16 routed in `MigratedPage`, `knt` accounted for as the Hesabatlar `knt` report | CODE VERIFIED |
| M18-51 | «Kontragentlər» content is migrated as the `knt` report, column-for-column | index.html:2883-2897, 6741-6751 | `lib/reports.ts:59-89`; `ReportsPage.test.tsx` | CODE VERIFIED — the CONTENT is migrated; the rail ENTRY is M18-52 |
| M18-52 | Whether «Kontragentlər» regains a rail entry | index.html:259 | none | ACCEPTED — **D-P1 ACCEPTED 2026-09-12: no rail entry is created.** The `knt` report (M18-51) remains the single migrated surface; a second one would be a duplicate, not parity. Settled owner disposition, NOT an evidence claim |
| M18-53 | The legacy `rKnt()` admin «Soraqçalarda idarə et» buttons have no React equivalent | index.html:2893-2896 | source inspection | ACCEPTED — **D-P1 ACCEPTED 2026-09-12.** They live on the page M18-52 declines, so they are out of scope by the same decision. Settled owner disposition, NOT an evidence claim |
| M18-54 | Visual parity swept for defects across migrated screens | — | M18-03 found and fixed; no further divergence found by source comparison in this pass | CODE VERIFIED — a source-comparison sweep, NOT a rendered visual diff. M18-55 is the real visual check |
| M18-55 | Rendered visual parity against legacy at real viewport sizes | — | none | BLOCKED — TRANSFERRED to the [authority verification package](../plans/2026-09-12-phase18-authority-verification-package.md); retains BLOCKED. The rehearsal proved the REACT layout responds (M18-34); it did not render legacy beside it |
| M18-56 | Error, loading and empty states behave consistently across screens | — | existing per-phase state suites, all green | CODE VERIFIED — per-screen coverage inherited from accepted phases; no cross-screen live check |
| M18-57 | Stale-refresh behaviour after a token refresh or a long idle window | — | none | BLOCKED — TRANSFERRED to the [authority verification package](../plans/2026-09-12-phase18-authority-verification-package.md); retains BLOCKED. Needs a live session observed across a token refresh and a long idle window |
| M18-60 | Legacy `index.html` retirement | — | none | BLOCKED — TRANSFERRED to the [cutover package](../plans/2026-09-12-phase18-cutover-package.md); retains BLOCKED. D-P2 DEFERRED 2026-09-12: irreversible and production-affecting; requires explicit owner approval and M18-63 first |
| M18-61 | Production release preparation and cutover rehearsal | — | none | BLOCKED — TRANSFERRED to the [cutover package](../plans/2026-09-12-phase18-cutover-package.md); retains BLOCKED. D-P2 DEFERRED 2026-09-12; depends on the authority package's live legs |
| M18-62 | Production deployment | — | none | BLOCKED — TRANSFERRED to the [cutover package](../plans/2026-09-12-phase18-cutover-package.md); retains BLOCKED. Explicitly outside every migration phase's authority; requires explicit owner approval |
| M18-63 | Post-cutover rollback plan is written and agreed | — | none | BLOCKED — TRANSFERRED to the [cutover package](../plans/2026-09-12-phase18-cutover-package.md); retains BLOCKED. D-P2 DEFERRED 2026-09-12; must be agreed BEFORE M18-60 or M18-62 is considered |
| M18-70 | The full offline gate passes on the integrated implementation | — | 208 files / 4366 tests; `tsc -b --noEmit` clean; `oxlint src` 4 warnings, all pre-existing in untouched files; `vite build --mode sandbox` OK; `git diff --check` OK; 0 staged | CODE VERIFIED |

## Mechanical tally

| Category | Count |
|---|---:|
| CODE VERIFIED | 24 |
| LIVE VERIFIED | 5 |
| ACCEPTED | 3 |
| IN PROGRESS | 0 |
| NOT STARTED | 0 |
| BLOCKED | 10 |
| unclassified | 0 |
| total unique | 42 |

## Owner decisions — all resolved or transferred

| Id | Decision | Blocks |
|---|---|---|
| D-P1 | Should «Kontragentlər» regain a rail entry, given its content is migrated as the `knt` report? | **ACCEPTED 2026-09-12 — no.** Resolved M18-52, M18-53; `c-knt` fetch removed (M18-14) |
| D-P2 | Is legacy `index.html` retired at cutover, and when? | **DEFERRED 2026-09-12.** M18-60, M18-61, M18-62, M18-63 → cutover package |
| D-P3 | Authorise a live read-only cross-role rehearsal on TEST? | **PARTIALLY COMPLETE 2026-09-12.** Admin/anbardar leg promoted M18-01, M18-02, M18-30, M18-31, M18-34. Rehber/realtime/enforcement/export/cross-module/stale legs → authority package (M18-41, M18-43, M18-45, M18-46, M18-55, M18-57) |
| D-P4 | Accept that `c-mov`, `c-bal` and `c-ctrl` badges stay unimplemented rather than reintroduce a whole-platform boot load? | **ACCEPTED 2026-09-12 — yes.** Resolved M18-15 |
