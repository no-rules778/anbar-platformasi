# Phase 9 T2 — balance filters, sorts and KPI aggregates

Date: 2026-09-10  
Scope: M9-51, M9-52, M9-54, M9-61  
Verdict: `CODE VERIFIED`

Added `web/src/lib/balanceFilters.ts` and `balanceFilters.test.ts`, transcribed
from legacy `index.html:2326-2345`. Two new untracked files. The accepted
`balanceRows` implementation was **not modified** — no test proved a defect in
it, and its own suite still passes unchanged.

## What was implemented

Three pure functions over the `BalanceRow[]` that `buildBalanceRows()` produces:

- **`filterBalanceRows(rows, {z, q, cond})`** — the three filters in the legacy
  order (2326-2334). The zero-segment is subtractive: `all` names no branch and
  is the no-op; `act` drops rows strictly within `1e-9` of zero; `zero` drops
  rows strictly beyond it; `neg` keeps `q < 0`, so an exactly-zero balance is
  **not** negative — M9-51. Because `act` rejects only `< 1e-9` and `zero`
  rejects only `> 1e-9`, exactly `q = ±1e-9` is rejected by neither and belongs
  to **both** segments — see the boundary correction below.
  The condition filter is all / `any` (any of four `> 0`) / one named key `> 0`
  — M9-52. The search haystack is `name + ' ' + code` lower-cased with
  `indexOf(...) < 0` (2330).
- **`sortBalanceRows(rows, sort)`** — `val` (default), `q` and every
  `cond:<key>` descending; `name` ascending under `localeCompare(…, 'az')`;
  `last` descending via `dsort`; an unrecognised key falls back to `val`
  exactly as `cmp[BF.sort] || cmp.val` does, so a stale stored sort cannot
  throw — M9-54.
- **`balanceKpis(rows)`** — `count`, `qty`, `val`, `zeroCount`, `negCount` and
  `anyNegative`, reduced over the **complete filtered set** (2338), which the
  original computes *before* paging at 2346 — M9-61.

`COND_COLS` and `CONDF` are reused from `condSplit.ts` / `balanceRows.ts`
unmodified, so a new condition column extends the filter and the sort table
without further edits.

## Three decisions worth recording

**KPIs return numbers, not strings.** `nf`/`money` formatting, the tile classes
and the subtitles are presentation and belong to the page. `anyNegative` is
exposed because it drives the «Mənfi qalıq» tile's `r`/`g` class (2344), but the
class itself is not chosen here.

**`sortBalanceRows` copies before sorting.** The original sorts in place, but
its `rows` is already the private result of `.filter()`. Copying preserves that
property when a caller passes an array it still owns; a test pins it.

**`dsort` is transcribed locally, not imported.** The existing copy in
`movementFilters.ts` is module-private; exporting it would couple two unrelated
screens for one line. Both derive from `index.html:601`.

## Falsifiability — proved, not asserted

Four defects were injected one at a time, the file restored from a verified
backup between runs. Each failed precisely the assertion that governs it:

| Injected defect | Result |
|---|---|
| `act`/`zero` use `=== 0` instead of the `1e-9` epsilon | **1 failed** — the sub-epsilon residue test (M9-51) |
| `any` accepts a zero marker (`>= 0`) | **1 failed** — the `any` test (M9-52) |
| `last` sorted ascending | **2 failed** — both date-order tests (M9-54) |
| KPIs aggregate a 3000-row slice | **1 failed** — the complete-filtered-set test (M9-61) |

The file was then restored and confirmed byte-identical to the backup, green at
29/29.

## Verification

| Check | Result |
|---|---|
| Focused `balanceFilters` tests | **32 passed** (29 + 3 boundary tests) |
| `balanceRows` / `itemIndex` / `condSplit` regression | **72 passed** |
| Full suite | **130 files / 2792 tests passed** (previous 129/2763; +1 file, +29 tests) |
| `tsc -b --noEmit` | clean (exit 0) |
| `oxlint src` | clean (exit 0) |
| `vite build --mode sandbox` | built, 199 modules |
| `git diff --check` | clean (CRLF advisories only) |
| Staged files | 0 |
| Ledger unique rows | 124 |

The «chunks larger than 500 kB» advisory is the pre-existing Phase 8 one. The
`ItemGroupsPage.test.tsx` load-flake recorded in the previous slice did **not**
recur in this full run.

## Correction — M9-51 exact boundary (Codex-found, 2026-09-10)

An independent Codex review confirmed `balanceFilters.ts` matches the legacy
implementation overall, but found an **exact-boundary defect in the ledger
wording and in the test coverage** — not in the application code.

Legacy `index.html:2327-2329`:

```js
if (BF.z === 'act'  && Math.abs(b.q) < 1e-9) return false;   // rejects only < EPS
if (BF.z === 'zero' && Math.abs(b.q) > 1e-9) return false;   // rejects only > EPS
```

So `act` keeps `|q| >= 1e-9` and `zero` keeps `|q| <= 1e-9`; exactly
`q = 1e-9` and `q = -1e-9` belong to **both** segments. This overlap is
intentional legacy behaviour.

- **The algorithm was already correct and was NOT changed.** `filterBalanceRows`
  transcribed both comparisons verbatim from the start.
- **The ledger said `zero |q| < 1e-9`**, which is wrong at the boundary. M9-51
  now reads `zero |q| <= 1e-9` and states the overlap explicitly.
- **No test pinned the equality case.** The original pair only tested `1e-12`
  (below) and `1e-6` (above), which is exactly the omission this protocol's
  boundary-matrix rule forbids: a threshold claimed from tests that skip
  equality.

Three tests were added — `q = 1e-9` and `q = -1e-9` included by both `act` and
`zero` (the negative one also confirming `neg`, since `neg` is a plain `q >= 0`
rejection), plus a one-ulp control proving the two neighbouring values are
claimed by exactly one segment each. That control is what makes the pair
non-vacuous: without it, an implementation that returned every row for every
segment would also pass. The existing below/above tests are preserved unchanged.

**Evidence level: `CODE VERIFIED`.** This is a contract/evidence correction, not
an application-code defect; no application source was modified, so the promoted
status of M9-51 is unchanged.

## What was NOT promoted, and why

- **M9-50** (search) — the *matching rule* is exercised here, but the row also
  asserts a **200 ms debounce** and **paging reset**, which are page concerns.
  Pure-function tests cannot evidence either, so the row stays `NOT STARTED`.
- **M9-53** (control hidden in «Əvvələ qalıq»), **M9-56**/**M9-57** (soft cap
  and its sticky store flag), **M9-58** (pager text), **M9-60**/**M9-62**/
  **M9-63**/**M9-64** (KPI tile count, subtitles, classes and formatted values)
  are UI/store rows. This module supplies the figures M9-64 will format; it
  renders nothing.
- **M9-55** is the «Əvvələ qalıq» sort and belongs to `lib/initialBalance.ts`.
- **M9-36** and **M9-41** remain unpromoted, unchanged from the previous slice.

No UI rendering, debounce, export or live behaviour is claimed anywhere in this
slice.

## Boundary

Pure logic — no Supabase call, browser, RPC or login was needed or made. No
production contact (`bbjmhaerssakbreykxiw` never addressed), no TEST mutation,
fixture, layer deactivation, cutover, stage, commit, push or deploy, no I-10
row, no password used or recorded. The dirty working tree was preserved, and
T1, the T2 condition rules and the T2 balance-rows work are untouched.

Phase 9 remains `NOT ACCEPTED`; only Codex's independent audit can change that.
