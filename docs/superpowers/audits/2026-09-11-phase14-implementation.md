# Phase 14 — implementation report (Module P, «Hesabatlar»)

Date: 2026-09-11
Verdict: **IMPLEMENTED ON CLAUDE'S SIDE — Phase 14 remains `NOT ACCEPTED`.**
Only Codex's final independent audit can accept it.

The owner's FAST CONTINUATION instruction resolved D-P1 and authorised
implementation. T1-T7 ran as one block. **T8 did not run** — see the evidence
boundary below.

## The one open execution item, stated first

**No TEST identity was supplied to this session**, so no authenticated read
could be performed against TEST `alkjjbaawmsirsfvqljm`.

- **0** Supabase contacts (production `bbjmhaerssakbreykxiw` included), **0**
  authenticated reads, **0** writes, **0** RPCs.
- This phase performs no write by design, so there is no residual accounting
  to reconcile and nothing to clean up — the all-zero result is the expected
  one, not a deferred obligation.

The check was mechanical: `web/.env.sandbox.local` carries only
`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_TEST_ENVIRONMENT` and
`VITE_ALLOW_LOCAL_WRITES=false` — it targets TEST `alkjjbaawmsirsfvqljm` and
contains **no user or password variable**; no `ANBAR_*` / `TEST_*` /
`SUPABASE_*` variable exists in the session environment either. An
unauthenticated page load would prove nothing about the four-read set, the
realtime subscription or an RLS-shaped row set, so none of those was claimed.
Per protocol §13, every remaining independent task was completed instead of
stopping at the blocker.

This is the same identity boundary recorded at M10-51 / M11-91 / M12-98 /
M13-93. Running T8 later needs any TEST identity for M14-10 and M14-17, and
**two** identities — an anbardar and an admin — for M14-99.

## Mechanical tally

Derived in this session from the 99 `| M14-* |` status cells by a parser that
splits on **unescaped** pipes and classifies by the **primary status at the
start of the final cell** (protocol §17). Run before and after promotion.

| Status | Rows |
|---|---|
| `CODE VERIFIED` | **96** |
| `LIVE VERIFIED` | **0** |
| `IN PROGRESS` | 0 |
| `NOT STARTED` | **3** |
| `BLOCKED` | 0 |
| unclassified | 0 |
| **total unique** | **99** |

99 rows, 99 unique ids, 0 duplicates, uniform 5-cell rows, ids M14-01…M14-99
contiguous, sum of status counts = 99 = unique ids.

**No row is `LIVE VERIFIED`, because nothing was executed against TEST.**

The 3 `NOT STARTED` rows are **M14-10, M14-17 and M14-99** — the live
four-read observation, the live realtime subscription, and the RLS row-set
comparison. Every one requires an identity that does not exist in this
session. Every other row is `CODE VERIFIED`.

**Parser validity (§18).** The same parser returns 77 / 68 / 9 on the
independently `ACCEPTED` Phase 13 ledger, matching its accepted banner — so
the 99 is a real count, not a parser artefact. The unescaped-pipe rule is
load-bearing: several M14 contract cells quote `\|\|`.

## What was built

| File | Contents |
|---|---|
| `lib/reportAggregates.ts` | the six `IX.*` aggregates React lacked, as a SEPARATE module |
| `lib/reports.ts` | the seven non-`dead` branch derivations + export matrices + the print contract |
| `lib/qaimeReport.ts` | qaimə grouping, the eleven-column model, screen/export cells |
| `lib/sparkline.ts` | the sparkline geometry, pure |
| `api/reportsSnapshot.api.ts` | the page's own four-read atomic snapshot |
| `store/reports.store.ts` | snapshot, derived indexes, selected kind, qaimə column retention, stale ticket |
| `pages/ReportsPage.tsx` | shell, selector, all eight branches, export/print, load surfaces |
| `components/reports/Sparkline.tsx` | the `per` chart |

Each has its own test file, plus `lib/reportsDeadReuse.test.ts` and
`index.css.reports.test.ts`. **Additive edits only** to four shared files:
`lib/format.ts` (the `fmtM` helper, M14-46), `index.css` (three additive
rules, M14-98), `App.tsx` (the `rep` route, the «Təhlil» group and its rail
entry) and the two rail fixtures noted below. No accepted Phase 9-13 module's
source was modified.

**`mutationGuard.ts` gains no entry (M14-97)** — this page performs no write,
so there is no action to guard, and the absence is evidenced rather than
incidental.

**Test-fixture exception, recorded rather than hidden.** Two fixtures in the
accepted `App.test.tsx` enumerate everything between «Bazalar» and «Sistem»
exhaustively (one for admin, one for anbardar). Adding the legacy «Təhlil»
group necessarily extends both lists. No previously asserted entry changed
position; the anbardar fixture's extension is itself M14-02 evidence for that
role. This is the same exception M13-01 recorded.

## Correction history (recorded, not erased)

Five corrections were made during this session. None is erased, per §12.

1. **Ledger row count: 96 → 99.** A first draft of the proposal and ledger
   banner asserted 96 rows from an uncounted prose estimate; the mechanical
   parse returned 99. Corrected before any downstream document was written.
   Third occurrence of this class (Phase 12: 58→70; Phase 13: 86→77).
2. **Legacy line ranges.** The session's inventory cited `abc` at 6781 and
   `dead` at 6789-6794; an offset re-read established `abc` 6776-6787, `dead`
   6788-6804, `tr` 6805-6820. The `REP_*` assignment lines were right; the
   branch-start numbers were approximate.
3. **A real defect in my code — `fmtM` did not exist.** `reports.ts` imported
   it from `lib/format.ts`, but that module never defined it; my proposal's
   reuse list wrongly claimed it was available. Added as an additive helper
   with its own boundary tests (a full `YYYY-MM-DD` must NOT match).
4. **Two broken test fixtures, not module bugs.** `item()` declared a
   non-existent `group_name` field and `partner()` omitted `...over`; both used
   `as` casts that masked the mismatch, so overrides were silently discarded
   and five tests failed against correct modules. Both rewritten against the
   real row shapes with the casts removed. Had I "fixed" the modules to make
   them pass, I would have broken the `> 0` price rule and the VÖEN lookup.
5. **Two wrong test expectations, not module bugs.** A sole ABC position has a
   cumulative share of exactly 1.0, so legacy classes it **C**, not `A`; and
   the page fixture yields **three** `byPartner` groups (a transfer's partner
   text is a partner key like any other), so the printed count is 3, not 2.
   Both expectations were asserted without deriving them from the fixture.
6. **Final Codex test-harness correction.** The M14-14 failed-refresh test
   called the Zustand async `load()` action outside React Testing Library's
   `act()`, yielding two React warnings despite a green assertion. The action
   is now awaited inside `act()`. This changes no application code or contract;
   it makes the refresh-retention evidence synchronised with the rendered UI.

Corrections 4 and 5 share a root cause worth naming: an expected value must be
*derived* from the fixture, never guessed — the same discipline §10 imposes on
ledger counts.

## Gate

| Check | Result |
|---|---|
| Full suite | **177 files / 3935 tests passed** |
| Baseline before this phase | 168 files / 3741 tests passed |
| Typecheck (`tsc -b --noEmit`) | clean |
| Lint (`oxlint src`) | clean for Phase 14; 4 pre-existing warnings in Phase 12/13 files, untouched |
| Sandbox build (`vite build --mode sandbox`) | clean |
| `git diff --check` | clean (only pre-existing CRLF advisories) |
| Staged files | **0** |
| Ledger validation | 99 rows, 99 unique, 0 duplicates, 0 unclassified, sum = unique |

The baseline was captured BEFORE any Phase 14 file existed, so the 194 added
tests are attributable and no accepted test was lost.

A first full-suite attempt was invoked with `--reporter=basic` and died in
`ERR_LOAD_URL` while loading the reporter; Vitest never started. That is a
harness failure, not a test result, and it is not counted as a baseline.

## Findings worth carrying forward

**1. The export/print equivalence (M14-95) is the phase's central risk and is
recorded as an equivalence, not as parity of implementation.** Legacy latches
both handlers once behind `pick.dataset.done` so they close over the module
globals and always act on the last-rendered branch. React holds the matrix and
name in state, derived by the same `useMemo` that feeds the table. The
observable behaviour is identical — proved by switching reports and asserting
what `xls()` receives — but the mechanism differs, and the ledger says so.

**2. `tr` diverges from the accepted route normaliser, and the test proves
both halves (M14-71).** The branch's prefix match is case-sensitive, so
«astara anbarı» is dropped; the accepted `transferRoute()` resolves it to
«Ələt → Astara». The test asserts the drop AND the normaliser's success in the
same case, so the divergence is demonstrated rather than assumed. Substituting
the normaliser would change which rows appear in a financial matrix.

**3. Three value asymmetries survive, with a fixture that can see them.**
`byPartner`/`byDate` accrue incoming value only; `byType` accrues both
directions. The test uses one row carrying both an in and an out quantity, so
the three contributions differ (20 / 50 / 20) and a "unification" fails.

**4. The `dead` reuse is evidenced as reuse, not re-verified (M14-60…M14-64).**
`reportsDeadReuse.test.ts` is deliberately narrow: it pins that the Reports
branch consumes the accepted Phase 10 functions and that the branch's own
surface facts hold. Phase 10's derivation contracts stay Phase 10 rows;
re-asserting them here would double-count accepted evidence (§6).

**5. Two stale legacy behaviours preserved verbatim.** The `abc` hint claims
«İlk 200 sətir» while `SHOW_MAX` is 3000 (M14-59, D-P2), and the qaimə report
has no note truncation at all (M14-76). Both are asserted as-is so a later
reader cannot "restore" a cap or correct the copy without a red test.

## Owner decisions to report

**D-P1** was resolved by the owner and implemented as instructed.

**D-P2, D-P3, D-P4** were implemented as recommended, each with a pinning
test, and none blocked a slice:

- **D-P2** — the stale `abc` hint is reproduced verbatim. Correcting
  user-facing copy is a product decision, not a migration one.
- **D-P3** — the qaimə column selection lives in the store, so it survives
  navigation exactly as legacy's module-level `QAIME_SEL` does. A
  component-local `useState` would silently reset it.
- **D-P4** — the per-row partner `find()` is a Map, with the equivalence
  pinned including the missing-partner and duplicate-name cases.

## Status

Phase 14 is **NOT ACCEPTED**. The open evidence is M14-10, M14-17 and M14-99,
each requiring a TEST identity this session did not have. Next step is Codex's
independent audit.
