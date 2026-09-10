# Phase 9 T2 — balance row construction

Date: 2026-09-10  
Scope: M9-30, M9-31, M9-32, M9-33, M9-34, M9-35, M9-42, M9-43, M9-45  
Verdict: `CODE VERIFIED`

Added `web/src/lib/balanceRows.ts` and `balanceRows.test.ts`, transcribed from
legacy `index.html:2280-2324`. Two new untracked files; nothing else changed.

## What was implemented

`buildBalanceRows(bal, items, conds, mode)` produces the three legacy source
shapes and attaches the display-only condition markers:

- **Separate mode** (`mode === ''`) keeps one row per warehouse × item
  (2293) — M9-30.
- **`__sum`** re-aggregates by code: `in`/`out`/`n` summed and `last` taken as
  the maximum, then `q = +(in - out).toFixed(4)` and `val = q × (price || 0)`
  **recomputed after** summing (2281-2289) — M9-31. `name`/`unit`/`price` are
  copied from the first `IX.bal` row seen for that code, as legacy does, not
  re-read from the catalogue.
- **`__sum` rows carry the exact label `bütün anbarlar`** (2285) — M9-32.
- **A named warehouse** filters `IX.bal` by `w` (2290-2291) — M9-33.
- **No-movement catalogue rows** are appended in separate and `__sum` modes
  only, with zeros, `nomv: 1`, and warehouse `bütün anbarlar` (`__sum`) or `—`
  (separate) (2296-2302) — M9-34; they are **never** appended for a specific
  warehouse (2296) — M9-35.
- **Markers** come from `condOf(w, c)` outside `__sum` (2318-2323) — M9-42 — and
  are summed across warehouses by code in `__sum` (2306-2317) — M9-43. Nothing
  clamps them, so a marker exceeding the balance is still displayed — M9-45.

`COND_COLS`, `CondRecord` and `condKey` are reused from `lib/condSplit.ts`
unmodified.

## Two legacy details deliberately preserved

`BalanceRow` is **not** `WarehouseBalance`. The legacy `__sum` and no-movement
rows are fresh object literals carrying no `first` key at all (2285, 2300), so
`first` is optional and present only on rows sourced directly from `IX.bal`. A
row type demanding `first` would misdescribe two of the three shapes.

`val` is deliberately left unrounded, matching `x.q * (x.price || 0)` at 2289.
The `|| 0` is load-bearing and covered by its own test.

`bal` is never mutated: every branch builds new objects. A test asserts the
source array is byte-identical after the returned rows are written to.

## Falsifiability — proved, not asserted

Three defects were injected one at a time into the implementation, each with the
file restored from a verified backup between runs. Each failed precisely the
assertion that governs it:

| Injected defect | Result |
|---|---|
| `__sum` sums `val` instead of recomputing it | **2 failed** — the M9-31 recompute test and the missing-price valuation test (both read that line) |
| No-movement rows appended for a named warehouse too | **1 failed** — the M9-35 test |
| `__sum` markers keyed by `w\|c` instead of summed by code | **1 failed** — the M9-43 test |

The file was then restored and confirmed byte-identical to the backup, green at
24/24.

An earlier attempt at this proof used an unset `$TMPDIR`, so the backup was
never created and the three mutants **stacked** instead of applying
individually. That run's per-defect attribution was invalid and is not relied
on; the implementation was rebuilt from the authored content and the proof
redone as recorded above.

## Verification

| Check | Result |
|---|---|
| Focused `balanceRows` tests | **24 passed** |
| Consumer/`itemIndex` regression (7 files) | **168 passed** |
| Full suite | **129 files / 2763 tests passed** (baseline 128/2739; +1 file, +24 tests) |
| `tsc -b --noEmit` | clean (exit 0) |
| `oxlint src` | clean (exit 0) |
| `vite build --mode sandbox` | built, 199 modules |
| `git diff --check` | clean (CRLF advisories only) |
| Staged files | 0 |
| Ledger unique rows | 124 |
| Dirty tree | 223 entries — 221 baseline + the 2 new untracked files |

**Baseline note.** The pre-change baseline run showed one failure,
`src/pages/ItemGroupsPage.test.tsx` — a 5 s timeout under full parallel load. Run
in isolation it passed 32/32, and it passed in the post-change full suite above.
It is a load-dependent flake in a file this slice does not touch, not a
regression and not caused by this work.

## What was NOT promoted, and why

- **M9-36** («hərəkət yoxdur» tag instead of a date) is a
  `pages/BalancesPage.tsx` presentation row. This slice produces the exact `nomv`
  marker that row will consume, but renders nothing, so it stays `NOT STARTED`.
- **M9-41** (markers never alter `q`, `val`, **KPIs or export figures**) is only
  partly evidenced: `q`/`val` are asserted, but KPIs and export do not exist
  yet. It stays `NOT STARTED` until those land.
- **M9-40** is `condSplit.ts` reuse that predates this slice.
- Filters, sorts and KPI aggregates (M9-51…M9-64) are the next slice and are not
  implemented here.

## Boundary

Pure logic — no Supabase call, browser, RPC or login was needed or made. No
production contact (`bbjmhaerssakbreykxiw` never addressed), no TEST mutation,
no fixture, no layer deactivation, no cutover, no stage, commit, push or deploy,
no I-10 row, no password used or recorded. The dirty working tree was preserved.

Phase 9 remains `NOT ACCEPTED`; only Codex's independent audit can change that.
