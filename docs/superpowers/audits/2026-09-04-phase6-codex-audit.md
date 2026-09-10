# Phase 6 Codex audit — Mal qrupları

**Date:** 2026-09-04  
**Verdict:** CODE VERIFIED; LIVE VERIFIED for the available Admin read-only and
Excel scenarios
**Remediation:** all three findings FIXED and independently re-audited
2026-09-04. Remaining conditional checks are listed below and do not contradict
the verified implementation.

## Verified

- Full suite: **974 tests / 61 files passed**.
- Typecheck, oxlint, build and `git diff --check`: clean.
- No Phase 6 write path was added.
- Root `index.html` contains only the pre-existing `manage_reference p_id`
  difference and was not changed by Phase 6.
- The implementation preserves the important legacy contracts: operational
  movements, four-decimal balances, last-purchase pricing, three-level
  purchase ordering, active warehouse scoping, filters, full-result selection
  pruning, sticky show-all state and the dedicated Excel workbook structure.

## Findings

### A01 — Initial core-load failure also renders a false empty-result state (P2)

`ItemGroupsPage` displays «Nəticə yoxdur / Bu süzgəclərə uyğun müsbət qalıq
yoxdur» when the first snapshot load fails, then appends the real error in the
footer. That presents a fatal items/movements/warehouses failure as if a valid
zero-result calculation had completed, contradicting `M6-S3/M6-S4` and the
snapshot loader's safety boundary.

Required fix: when `error && !loaded`, replace the table/empty-result area with
an explicit load-error state. Preserve the existing behaviour for a failed
refresh after a valid snapshot: keep the rows and show the refresh error.
Extend the existing initial-failure test to assert that the empty-result text
is absent, not merely that rows are absent.

### A02 — Registry completion states contradict the implemented code (P2 docs)

Module G still marks `M6-39` (selected `created_at`) and `M6-42` (page-scoped
Realtime) as `NOT STARTED`, although both are implemented and tested. `M6-S16`
also reads `NOT STARTED` even though the absence of a new import path and the
unchanged SheetJS version are verified constraints. This makes the Module G
headline `CODE VERIFIED` internally inconsistent.

Required fix: update these rows to the evidence-backed code status. Keep
`M6-40` as `NOT DONE`; payload measurement genuinely remains open. Do not mark
anything `LIVE VERIFIED`.

### A03 — Navigation renders the «Bazalar» group heading twice (P2 visual)

`App.tsx` renders one «Bazalar» heading before the admin-only Soraqçalar link
and a second immediately before Nomenklatura/Mal qrupları. The legacy rail has
one Bazalar group containing all of those entries. Phase 6 touched this exact
navigation surface, so the duplicate should not be carried into acceptance.

Required fix: render a single «Bazalar» heading while preserving the existing
role gate on Soraqçalar and the ungated Nomenklatura/Mal qrupları links. Add a
behavioural render test for admin and non-admin navigation; do not rely only on
source-text assertions.

## Not yet verified

- `M6-40` payload measurement.
- Read-only old/new live comparison.
- `anbardar` warehouse scoping against live test data.
- A real generated workbook opened and inspected.
- Refresh-failure behaviour in the browser.

No production or test data was changed by this audit.


## Remediation — 2026-09-04

All three findings are fixed. **Checks after remediation: 986 tests / 61 files,
typecheck, oxlint, build and `git diff --check` — all clean** (974 / 61 at
audit time; +12 tests, no new files beyond the existing suites).

Nothing was marked `LIVE VERIFIED`. No calculation, filter, selection rule,
Excel structure, Supabase object, SQL/RPC, root `index.html`, GitHub remote or
Vercel deployment was touched, and the unrelated working-tree changes are
preserved.

### A01 — FIXED · false empty-result on an initial load failure

`ItemGroupsPage` now distinguishes «no snapshot has ever loaded» from «the
filters matched nothing», using `loaded` as the discriminator:

- **Initial failure** (`error && !loaded`) renders an explicit
  «Məlumat yüklənmədi» state carrying the real error. The «Nəticə yoxdur /
  Bu süzgəclərə uyğun müsbət qalıq yoxdur» branch is not reached.
- The pager was making the same false claim and was fixed with it: it no longer
  prints «0 sətir (müsbət qalıq)» when no calculation ever ran.
- The footer error span is now guarded on `loaded`, so the error appears once
  rather than twice.
- **Failed refresh after a good snapshot is unchanged** (`loaded` is true):
  rows are retained and the error is shown in the footer — the atomic
  behaviour `M6-S3` requires.

Recorded as registry row **`M6-S17`**.

**Tests** (`web/src/pages/ItemGroupsPage.test.tsx`, «load failure» block):
five cases, of which three were **verified to fail against the pre-fix
render** —

| Test | Pre-fix |
|---|---|
| does NOT claim an empty result when the initial load failed | FAILS |
| shows an explicit load-error state instead | FAILS |
| a movements failure is fatal and reported, not shown as zero balance | FAILS |
| a failed REFRESH keeps the rows and shows the error in the footer | passes (guards the unchanged half) |
| an empty-but-successful load still shows the genuine empty result | passes (guards against over-correction) |

The strengthened assertions are positive and negative: the load-error text is
present, and «Nəticə yoxdur», the empty-result sentence and any
`/sətir \(müsbət qalıq\)/` count are all asserted **absent**.

### A02 — FIXED · registry statuses

| Row | Was | Now |
|---|---|---|
| `M6-39` selected `created_at` | NOT STARTED — Q1 | **CODE VERIFIED — Q1** |
| `M6-42` page-scoped Realtime | NOT STARTED — Q2 | **CODE VERIFIED — Q2** |
| `M6-S16` no import path, SheetJS unchanged | NOT STARTED | **CODE VERIFIED** (verified constraint) |
| `M6-40` payload measurement | NOT DONE | **NOT DONE — unchanged, genuinely open** |

The three had been missed by the earlier bulk promotion because their status
cells carry trailing qualifier text. Module G's headline `CODE VERIFIED` is now
internally consistent. Nothing was promoted to `LIVE VERIFIED`.

### A03 — FIXED · duplicated «Bazalar» heading

`App.tsx` renders **one** «Bazalar» group. Entry order follows the original
rail within that group (index.html:255-261): Nomenklatura, Mal qrupları,
Soraqçalar. Soraqçalar keeps its `isAdmin` gate; Nomenklatura and Mal qrupları
stay ungated.

**Tests** — behavioural, not source-text. `App.test.tsx` gains an
«App — navigation rail (A03)» block that renders the real `App` for both an
`admin` and a `rehber` and queries the DOM. `NomenclaturePage` and
`ItemGroupsPage` are stubbed there like the other pages, so the tests exercise
the rail rather than opening the screens' data loads.

| Test | Pre-fix |
|---|---|
| renders «Bazalar» exactly once for an admin | FAILS |
| renders «Bazalar» exactly once for a non-admin | FAILS |
| groups Nomenklatura, Mal qrupları and Soraqçalar under that one heading | FAILS |
| keeps Soraqçalar admin-gated while leaving the other two ungated | passes |
| navigates to Mal qrupları for an admin | passes |
| navigates to Mal qrupları for a non-admin too | passes |
| marks only the active entry | passes |

`App.nav.test.ts` is retained as a cheap wiring check and its header now says
so explicitly: it is no longer the acceptance evidence for the rail, because a
source-text assertion cannot see a heading rendered twice nor prove a runtime
role gate.

## Codex re-audit and live verification — 2026-09-04

- Full post-fix suite: **986 tests / 61 files passed**.
- Typecheck, oxlint, build and `git diff --check`: clean.
- The isolated test environment at localhost rendered the expected sole
  positive-balance row: `0000001 / TEST Mal 1 / Test kateqoriya / Test Anbar /
  8.00 ədəd / —`.
- The empty last-purchase price is correct for this fixture. Phase 6 must not
  substitute the nomenclature price when no qualifying priced `Satınalma`
  movement exists.
- A read-only comparison against the production legacy screen confirmed the
  same title, explanatory copy, filter families, AND/OR guidance, table
  columns, positive-balance rule, quantity/unit display and `—` representation
  for a missing last-purchase price. Production data was not changed.
- The test row was selected and a real workbook was generated and inspected:
  sheet `Mal qrupları`, range `A1:F2`, expected six headers, quantity `8`, raw
  warehouse `Test Anbar`, empty price cell and Azerbaijan/Baku export stamp.
  The code is physically stored as string `0000001` with Excel text format
  (`t="str"`, built-in format 49), so leading zeroes are preserved. The file
  has the expected explicit widths and no formula errors.
- No Supabase, production, GitHub, Vercel, SQL/RPC or application data was
  changed during the audit.

## Remaining conditional verification

- `M6-40` payload measurement.
- `anbardar` warehouse scoping against live test data.
- Refresh-failure behaviour in the browser.

The last two require a suitable non-admin fixture and a deliberately failed
read. Their logic is covered by the passing automated suite; they remain
explicit follow-up checks rather than unearned live claims.
