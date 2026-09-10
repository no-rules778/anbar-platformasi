# Phase 9 T2 — «Əvvələ qalıq» reconstruction (`lib/initialBalance.ts`)

Date: 2026-09-10 (updated after the Codex correction round — see that section)
Scope (rows examined, not a status claim): M9-70…M9-77, M9-79, M9-79a, M9-79b,
M9-84 (D-J4), M9-55
Verdict: **M9-55, M9-70, M9-72…M9-77, M9-79, M9-79a, M9-79b and M9-84 are
`CODE VERIFIED` (12 rows); M9-71 is `IN PROGRESS`** (sorting clause verified,
`normalMovements()` source clause still open).

Added `web/src/lib/initialBalance.ts` and `initialBalance.test.ts` — two new
untracked files. No existing application source was modified.

## What was implemented

Ported from legacy `index.html:1898-1952`, `1959-2048` and the view's
filter/sort at `2240-2253`:

- **`buildInitialBalanceRows(movements, items, bal, whs)`** — the
  reconstruction. Walks operational movements in the legacy order (date asc,
  transfer-OUT legs before other same-date rows, then `ts` — M9-71), treats
  every marked row as an opening FIFO lot (M9-70), consumes lots oldest-first
  with only `opening`-origin consumption counting toward provenance (M9-72),
  moves layers between warehouses on paired transfer legs without creating a
  second `initial_qty` (M9-73), pairs legs by `doc|<doc>|<code>` or the
  document-less `legacy|<date>|<code>|<from>|<to>` key (M9-74), recovers the
  counterparty warehouse from the declined label (M9-75), and keeps the
  earliest opening date while raising `last` from `IX.bal` (M9-76).
- **`filterInitialBalanceRows(rows, {q, w, mode})`** — search, then warehouse,
  then the mode threshold, in that guard order (M9-79b). `__sum` becomes "no
  warehouse filter" rather than a merge (M9-79); a named warehouse matches
  exactly and no nomenclature augmentation applies (M9-79a); both modes filter
  strictly `> 1e-9` (M9-77).
- **`sortInitialBalanceRows(rows, sort, mode)`** — `val` and `q` BOTH read the
  active quantity column, `name` ascending under the `az` collation, `last`
  descending, and the fallback is **`name`, not `val`** (M9-55).
- **`isOpeningMovement`**, **`warehouseFromLabel`**, **`modeQtyColumn`**,
  **`modeLabel`** as the named sub-contracts.

## D-J4 — the one deliberate deviation

M9-84 is an **owner-approved correction**, not byte-identical legacy behaviour,
and is labelled as such. Legacy is asymmetric: the write guard
`isInitialBalanceLine()` (1926-1928) accepts the marker in partner **or**
channel, while the read at **2001** accepts **partner only** — so a
channel-only historical row is refused at write for a non-admin yet never
reconstructed in this view. Per the
[2026-09-10 owner decision §5](../decisions/2026-09-10-phase9-design-package.md)
the read is widened to match the write.

It is implemented by **delegating to the very same exported predicate the write
path uses** (`opLineValidation.isInitialBalanceLine`), so the two definitions
cannot drift. The TYPE half stays strict (NFKC+trim+lowercase, **no** ğ/q
folding); only the marker half tolerates ğ/q.

**Falsifiability of the D-J4 claim, measured — not asserted.** Both predicates
were evaluated on the same three fixtures:

| Fixture | Legacy partner-only read | D-J4 read |
|---|---|---|
| channel-only marker | `false` | `true` — the test fails pre-widening |
| partner-only marker | `true` | `true` — no regression |
| unrelated partner AND channel | `false` | `false` — negative control |

## Two corrections made during this slice

Recorded here rather than in separate audits, per the reliability protocol §12.

**1. A test encoded a false belief about legacy normalisation.** An assertion
that `'  ƏVVƏLƏ QALIQ  '` matches the type failed. Investigation showed the
**code was right and the test was wrong**: `toLowerCase()` is locale-independent,
so Azerbaijani dotless «ı» uppercases to «I» and lowercases back to dotted «i»
— `'Əvvələ qalıq'.toUpperCase().toLowerCase()` is `'əvvələ qaliq'`, which does
not match. Legacy `_normBase` (1907) has exactly this property. The assertion
was replaced by a true tolerance test (whitespace + mixed case, both verified)
plus an explicit negative control pinning the all-caps limit as **ported
behaviour, not a port defect**.

**2. A vacuous assertion was removed.** A catalogue-lookup test read
`expect(unit).toBe('kq' === unit ? unit : 'ədəd')`, a tautology that passes for
any value. It now asserts `'ədəd'` outright. Two one-ulp boundary literals were
also respelled to their exact runtime values, clearing the
`no-loss-of-precision` lint warnings without changing what they test (verified:
`above > EPS`, `below < EPS`, neither `=== EPS`).

## Codex correction round — 2026-09-10 (SUPERSEDES parts of the sections above)

Codex rejected the previous "Done" report and applied narrow corrections. All
were validated here against the legacy source, not accepted from the summary.
The sections above are retained as HISTORY; where they conflict with this
section, **this section governs**.

**A code defect (not merely an evidence defect): `??` vs legacy `||`.** Both
item-name fallbacks used `it?.name ?? '(nomenklaturada yoxdur: …)'`. Legacy
**2006** and **2035** both use `it.name || '(…)'`. With `??`, an item whose
catalogue name is the **empty string** would render as `''`; with `||` it gets
the placeholder. Codex's change to `||` is **correct and confirmed against both
legacy lines**, and is covered by a new empty-name regression test. (`unit` is
left as `?? ''`: legacy is `it.unit || ''`, and for `string | null` both forms
produce `''` for null and for `''` — no behavioural difference.)

**Evidence defects, all confirmed:**

- **Favourable timestamp fixture.** The `created_at` tie-break test fed the
  rows already in the expected order, so it passed without the sort. Input is
  now reversed — it opposes the expected output.
- **Missing date-priority control.** Nothing proved date ordering outranks the
  same-date transfer-OUT rule. A control now does.
- **Incomplete composite-key controls (M9-74).** Only one component had been
  varied. Codex added mismatched document numbers, same-document/different item
  code, and mismatched source/destination for the document-less key. **One
  component was still unvaried after Codex's round — the item code in the
  DOCUMENT-LESS key** — so this session added exactly that one missing negative
  control. Every named component of both keys (`doc`+`code`; `date`+`code`+
  `from`+`to`) is now independently varied.
- **Weak `__sum` fixture.** The old fixture could not distinguish "no warehouse
  filter" from "merge by code". It now uses two rows sharing one item code in
  two warehouses, and requires both to survive separately.
- **Weak collation pair.** `Ağac`/`Çınqıl` order identically under generic and
  `az` comparison. The pair is now `Ərik`/`Zəfər`, with an explicit assertion
  that generic `<` gives the OPPOSITE order to `localeCompare(…, 'az')`.

**Status corrections arising from this round:**

- **M9-71 was promoted prematurely and is now `IN PROGRESS`.** The row has two
  clauses. The **sorting** clause is `CODE VERIFIED` after the corrected
  fixtures. The **`normalMovements()` operational-source** clause is *not*
  implemented or proved: `buildInitialBalanceRows()` accepts an array merely
  *documented* as operational, never calls `excludeCancelled()`, and a
  repository-wide grep confirms **no module imports `initialBalance` at all** —
  no page or snapshot caller exists yet. Promoting the whole row from
  sorting-only evidence was a §6 over-generalisation.
- **M9-79b evidence limitation stated.** Search, warehouse and quantity are pure
  **commuting** predicates: every execution order produces the same final array,
  so guard order cannot be falsified from outputs. The row stays
  `CODE VERIFIED` — the matching rule is unit-tested and the order matches
  legacy 2242-2245 by direct source comparison — but the order is **not**
  claimed as behaviourally proved.
- **M9-70 / M9-84 contradiction removed.** M9-70 said "AND a partner"; M9-84
  widens the read to partner OR channel. M9-70 now scopes itself to the
  type/spelling normalisation and defers the marker field set to M9-84, which
  remains the authoritative owner-approved deviation.

**Protocol strengthened** (`CLAUDE_RELIABILITY_PROTOCOL.md` §4): ordering
fixtures must oppose the expected output order, and composite-key tests must
vary every named load-bearing component independently.

**SUPERSEDED above:** the "Verdict: `CODE VERIFIED`" header line (M9-71 is now
`IN PROGRESS`), the "54 passed" figure, and the verification table's suite
counts. Current figures are in the table below.

## Verification (current, after the Codex round and this session's edits)

| Check | Result |
|---|---|
| Focused `initialBalance` + `balanceFilters` | **92 passed** (Codex's 91 + one added M9-74 control) |
| `balanceRows` / `itemIndex` / `opLineValidation` regression | **82 passed** |
| Full suite | **131 files / 2855 tests passed** (2849 before this round; +6, no regressions) |
| `tsc -b --noEmit` | clean (exit 0) |
| `oxlint src` | clean (exit 0) |
| `vite build --mode sandbox` | built (pre-existing 500 kB advisory only) |
| `git diff --check` | clean (exit 0) |
| Staged files | **0** |
| Dirty tree preserved | **228 entries**, Codex's edits intact |
| Ledger rows / unique / duplicates | **124 / 124 / none** |
| Mechanical tally | **37 `CODE VERIFIED` / 84 `NOT STARTED` / 1 `LIVE VERIFIED` / 2 `IN PROGRESS` (M9-19, M9-71) / 0 unclassified** |

**HISTORY — the pre-correction run** recorded 54 focused `initialBalance` tests,
131 files / 2849 tests, and a 38 / 84 / 1 / 1 / 0 tally. Those figures predate
the Codex round and this session's edits and are superseded by the table above
and the final run recorded below.

The «chunks larger than 500 kB» advisory is the pre-existing Phase 8 one.

## What was NOT promoted, and why

Pure-function evidence cannot reach presentation, and these rows are therefore
left unchanged:

- **M9-78** (quantity column header equals the mode label), **M9-80** (column
  order), **M9-81** (`—` placeholders and `fmtD`), **M9-82** (the three empty
  states), **M9-83** (`neg` class) — all `pages/BalancesPage.tsx`. This module
  supplies `modeLabel()`; it renders nothing.
- **M9-85** (the four opening-view KPI tiles) — presentation, and the row also
  fixes subtitles and the always-`money(0)` value tile.
- **M9-50**, **M9-53**, **M9-56**…**M9-58**, **M9-60**…**M9-64**, **M9-36**,
  **M9-41** — unchanged from the previous slices.

No page rendering, KPI, export, debounce, store, server, RLS or live behaviour
is claimed anywhere in this slice.

## Boundary

Pure logic — no Supabase call, browser, RPC or login was needed or made. No
production contact (`bbjmhaerssakbreykxiw` never addressed), no TEST mutation,
fixture, layer deactivation, cutover, stage, commit, push or deploy, no I-10
row, no password used or recorded. The dirty working tree was preserved and
staging is empty.

Phase 9 remains `NOT ACCEPTED`; only Codex's independent audit can change that.
