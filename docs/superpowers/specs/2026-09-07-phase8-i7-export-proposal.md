# Phase 8 · I-7 — Excel export proposal (M8-50)

**This document was documentation-only when written (2026-09-07).** The Excel
scope it proposes was implemented later the same day — see the STATUS note and
§8. Throughout, §§1-7 are preserved as the PROPOSAL text; §8 records what was
actually built and where it deviated.

No live query or write, SQL, fixture, dependency or environment change occurred
in either pass, and nothing was committed or deployed.

Scope follows the user's stated priority: **Excel first.** Printing and the
Silinmə report are treated separately below and are NOT part of the smallest
complete Excel scope.

> **STATUS (2026-09-07): the ordinary Excel export in this proposal is
> IMPLEMENTED and CODE VERIFIED.** §5 shipped as written, with two
> corrections applied during implementation (§8). §6 is unchanged: the Silinmə
> report and «Çap» remain deferred, so **`M8-50` is PARTIAL, not complete**.
> Nothing here is LIVE VERIFIED and Phase 8 is not ACCEPTED.

Related: [`2026-09-05-phase8-registry-rows.md`](2026-09-05-phase8-registry-rows.md)
(row `M8-50`, decision `D1`),
[`2026-09-05-react-migration-phase8-movements-proposal.md`](2026-09-05-react-migration-phase8-movements-proposal.md) §9.

## 1. Independent I-6 verification (Codex)

Recorded as reported, unchanged:

- Full suite **2511 passed / 119 files**, exit 0.
- `typecheck`, `lint`, `build` and diff checks passed.
- Root `index.html` MD5 unchanged.

**I-6 is CODE VERIFIED.** It is **not** LIVE VERIFIED and **not** ACCEPTED.
Module I remains one acceptance boundary; the `D5` live checks stay open.

## 2. What belongs to this screen

Legacy «Mal hərəkəti» has exactly three affordances, all wired in `rMov()`
(`index.html:1789-1845`):

| Affordance | Legacy handler | Old ref |
|---|---|---|
| **Excel** (`#mov-exp`) | inline `xls([...])` call | 1841-1845 |
| **Çap** (`#mov-print`) | `printHead()` + `window.print()` | 1830 |
| **Silinmə hesabatı** (`#mov-wo-exp`) | `writeOffExportRows()` + `xlsWriteOff()` | 1832-1840, 1701-1786 |

They are three independent code paths. The Excel export shares nothing with
the Silinmə report: `xlsWriteOff()` is a separate writer with its own header,
its own per-cell types and its own second sheet, and its own comment states
that the shared `xls()` is untouched (`index.html:1735-1737`).

## 3. What already exists and must be reused

Verified by reading the files, not assumed:

- **`web/src/lib/xls.ts`** — `xls(rows, name, sheet)` is already a faithful
  port of `index.html:1219-1236`: same per-cell `toNum` rule, same 400-row
  width measurement, same autofilter, same freeze pane, same
  `<name>_<today()>.xlsx` filename. Used today only by
  `pages/NomenclaturePage.tsx:7`. **I-7 must call it, not re-implement it.**
  One deliberate difference: the legacy CSV fallback and the toast are absent
  (§7, U1).
- **`lib/movementKey.ts`** — `movKeyText(m, warehouses)` exists, and its own
  docstring names the export as a consumer. This is the İstiqamət column.
- **`lib/movementValuation.ts`** — `movementValuation()` and
  `writeOffUnitPrice()` already port the Silinmə price rule (`M8-05`).
- **`lib/movementRoute.ts`** — `whLabel()`.
- **`lib/format.ts`** — `today()`.
- **`store/movements.store.ts`** — the FULL filtered set is already derived for
  the KPI line (`M8-12`), independent of the 3000-row cap. The export needs
  exactly that set; no new selector is required.
- **`components/PrintHead.tsx`** — already exists and already ports
  `printHead()`, including the stamp-at-click rule.

## 4. Exact Excel contract (`#mov-exp`, index.html:1841-1845)

15 columns, this order, header row first:

`Tarix · Anbar · Kod · Malın adı · Ölçü · Növü · İstiqamət / Kontragent ·
Alınma kanalı · Giriş · Çıxış · Vahid qiyməti · Məbləğ · Müqavilə · Qaimə ·
Qeyd edən`

Cell rules, read literally from that line:

- `Tarix` = `m.d` **raw**, NOT `fmtD()`. The screen formats; the export does not.
- `Anbar` = `whLabel(m.w)` — the alias, as on screen.
- `Malın adı` / `Ölçü` = `itemBy.get(m.c)` `name` / `unit`, `''` when absent.
- `İstiqamət / Kontragent` = `movKeyText(m)` — the canonical route for a
  resolved transfer, otherwise the partner text.
- `Giriş` / `Çıxış` = `m.i || ''` / `m.o || ''` — **empty, not 0**.
- `Vahid qiyməti` = for `Silinmə`, `final/qty` to 4 dp when `final != null` and
  `qty > 0`, else `m.pr`; for every other type `m.pr || item.price || 0`;
  then `pr || ''`.
- `Məbləğ` = for `Silinmə`, `final` (empty when null); otherwise
  `((i + o) * pr).toFixed(2)`, empty when `pr` is falsy. Note the legacy
  asymmetry, to be ported as-is: the Silinmə amount is a NUMBER, the ordinary
  amount a 2-dp STRING. `toNum` converts both, so the sheet is numeric either
  way.
- `Müqavilə` / `Qaimə` = `m.ct || ''` / `m.iv || ''`.
- `Qeyd edən` = `m.by || ''`.

Other properties:

- **Source set: the full filtered set (`all`), never the capped 3000-row
  slice.** Same rule as the KPI line.
- **Filters apply; sort applies** — `all` is `movFiltered()`, already sorted
  `date desc, ts desc`.
- **Filename** `mal_hereketi_<yyyy-mm-dd>.xlsx`; sheet name `Hesabat` (the
  default, since `rMov()` passes no third argument).
- **No totals row.** The legacy export has none — the KPI line is screen-only.
- **Ungated.** There is no `isAdmin()` check on `#mov-exp`, unlike `#mov-batch`
  (1827-1829). Every role that sees the screen may export, and RLS scopes an
  anbardar's rows server-side (`D2`, `M8-42`).

## 5. What I-7 must add — the smallest complete Excel scope

1. **`lib/movementExport.ts`** — one pure function
   `movementExportMatrix(rows, itemBy, warehouses): unknown[][]` returning the
   header plus body exactly as §4. Pure, so it is testable without a DOM and
   without XLSX. This is the only new logic.
2. **`MovementFilterItem` gains `unit`.** The one real data gap: `unit` is
   already SELECTed by `items.api.ts:45` and already reaches the store inside
   `snapshot.items`, but `derive()` in `store/movements.store.ts` builds
   `itemBy` as `{ name, price }` only, discarding it. Adding one field to that
   map is the whole fix — **no read widening, no new query, no SQL.**
3. **The «Excel» button in `pages/MovementsPage.tsx`**, currently deliberately
   not rendered (`M8-02`), calling `xls(matrix, 'mal_hereketi')`.
4. **Tests** — column count and order; raw date; empty-not-zero for Giriş /
   Çıxış; the Silinmə price/amount branch against the ordinary branch; the
   full-set-not-capped rule; the ungated rule. Mutation-check at least the
   capped-slice substitution and a column reorder.

Not in scope: any change to `lib/xls.ts`, any refactor of the Nomenklatura
export, any new API module, any store read change.

## 6. Silinmə report and printing — separate

**Silinmə (`#mov-wo-exp`) is deliberately NOT in this scope**, matching the
original `D1` recommendation. It is materially larger and carries a dependency
the Excel export does not:

- A separate 17-column header and a separate writer (`xlsWriteOff`) with
  explicit per-cell types — `Sənəd №`, `Kod` and `Qaimə №` are written as TEXT
  (`z: '@'`) to preserve leading zeros, and absent price/amount/note cells are
  **not created at all**. The shared `xls()` cannot express this.
- A second sheet, «Mənbə partiyalar», built from `DB.woAllocs` — that is,
  from **`stock_layer_allocations`, a table the React app has never read.**
  Its 11 snapshot columns and its RLS are unconfirmed; `M8-51` covered
  `writeoff_valuations` only. This is a new live read, gated by principles §3.
- It is enabled only when the type filter is exactly `Silinmə`, with its own
  disabled-state title text and hint.
- Legacy skips an allocation whose `reversedAt` is set, while the React
  valuation API deliberately does not read `reversed_at` at all
  (`writeoffValuations.api.ts`, "deliberately left unread").

Recommendation: a separate milestone, after a read-only live confirmation of
`stock_layer_allocations`. Deferring it leaves no dangling UI, because the
button is simply not rendered.

**Printing** is nearly free but is not required for export progress, and its
scope stays a separate decision. `PrintHead.tsx` already exists and
`NomenclaturePage.tsx:99-102` already demonstrates the exact stamp-then-print
pattern; the legacy note is `nf(all.length) + ' qeyd'`. If approved it is a few
lines — but it does not block, gate, or share code with the Excel work.

## 7. Material unresolved decisions

Only these; everything else above is settled by evidence.

- **U1 — the missing CSV fallback and toasts.** Legacy `xls()` falls back to
  `csv()` when XLSX failed to load, and toasts on success. The React port has
  neither, and `lib/csv.ts` exports no `csv()` writer. This is a pre-existing
  property of the already-shipped Nomenklatura export, not something I-7
  introduces. Proposed: record it and leave it, rather than change a shipped
  helper inside an unrelated milestone.
- **U2 — legacy reads valuations only when `DB.layerActive` is true**
  (`index.html:957`), while React reads `writeoff_valuations` unconditionally
  (`M8-51`). For the export this can only mean React produces a valued Silinmə
  amount where legacy would fall back to `qty × pr`. The deviation was
  introduced in I-2 and is already CODE VERIFIED; I-7 inherits it. Confirm it
  stays inherited rather than being re-litigated here.
- **U3 — Çap in or out of I-7** (§6). Excel does not depend on the answer.

Nothing else in §4 is open: every rule there was read from
`index.html:1789-1845` and matched against existing React helpers.

## 8. Implementation record (2026-09-07)

The ordinary Excel export shipped. **`M8-50` is PARTIAL**: the Silinme report
and «Cap» of §6 remain deferred and unrendered.

### Files

- NEW `web/src/lib/movementExport.ts` — `MOVEMENT_EXPORT_HEADER` and the pure
  `movementExportMatrix()`.
- NEW `web/src/lib/movementExport.test.ts` — 32 tests.
- NEW `web/src/pages/MovementsPageExport.test.tsx` — 18 tests.
- `web/src/lib/movementFilters.ts` — `MovementFilterItem` gains `unit`.
- `web/src/store/movements.store.ts` — `derive()` keeps `i.unit`.
- `web/src/pages/MovementsPage.tsx` — the «Excel» button, `exportXls()`, the
  `canExport` gate.
- `web/src/store/movements.store.test.ts` — the `itemBy` shape assertion now
  includes `unit`.
- `web/src/pages/MovementsPage.test.tsx` — the I-2 "no export affordance" test
  now asserts «Cap» and the Silinme report only, plus a new test that «Excel»
  IS rendered.

`lib/xls.ts` was NOT modified. No API module, read or dependency changed.

### Two corrections to §5, both applied

1. **The signature carries the valuation map and the recorder inputs.**
   §5 proposed `movementExportMatrix(rows, itemBy, warehouses)`. That is
   insufficient and would have exported wrong accounting amounts. The shipped
   signature is:

   ```ts
   movementExportMatrix(rows, itemBy, warehouses, valuations, emails, me)
   ```

   `valuations` is passed EXPLICITLY — the function reads no store state —
   because `movementValuation()` already requires the map (it has taken it
   since I-2) and without it every Silinme row silently falls back to
   `qty × price`. A mutation check pins this: the same row exports `33.6` with
   the map and `40` without.

   `emails`/`me` are the second half of the same correction. §4 recorded the
   recorder column as `m.by || ''`, which is accurate but incomplete: legacy
   REWRITES `m.by` in place at `index.html:990` before any export reads it, so
   the exported value is the FINAL mapped label. Exporting `created_by`
   directly would have written a raw UUID into the sheet — the same defect the
   I-2 audit found in the table cell (M8-04). The export therefore calls
   `recorderLabel()`, and the legacy `|| ''` is unreachable.

2. **`all` is derived in `MovementsPage`, not in the store.** §3 attributed the
   full filtered set to `store/movements.store.ts`. That is wrong: the store
   exposes `operational`, and `MovementsPage.tsx:238-242` derives `all` with
   `sortMovements(filterMovements(...))`; the KPI line and the cap both consume
   it there. No store selector was added — the export reads the same in-page
   `all`. The conclusion of §3 is unchanged: nothing new had to be derived.

### One legacy consequence pinned, deliberately not "fixed"

A stored `final_amount` of **0** exports amount `0` but unit price **empty**.
Verified against the source rather than assumed:

```text
pr   = v.final != null && +(m.o||0)>0 ? +(v.final/m.o).toFixed(4) : (m.pr||0)
     = 0 != null && 4 > 0  ->  +(0/4).toFixed(4)  ->  0
cell = pr || ''            ->  0 || ''           ->  ''
```

So a zero valuation does NOT fall back to the row's own price; the quotient
branch is taken, yields 0, and `|| ''` blanks it — while the amount column has
no `||` guard and keeps the 0. It looks like an inconsistency and is legacy's
own behaviour; a test states it so it cannot be "tidied" later.

### Gate

Export is disabled until `loaded` — at least one COMPLETE successful snapshot.
Before that the rows, the nomenclature index and the valuation map are all
empty, and a header-only file would look like a valid empty result rather than
an unfinished read. After a FAILED REFRESH `loaded` stays true and the export
carries the retained last-good snapshot, which is exactly what the
«Yenilenmedi» banner says is on screen; a failed refresh writes no rows, so no
partial fresh data can reach the file (M8-45). A successfully loaded EMPTY
filtered set exports the legacy header-only workbook.

### Access

Ungated by role, matching `#mov-exp`. Tested for `admin`, `rehber` and
`anbardar`; a non-admin gets «Excel» but still not «Qrup uzre legv». Access was
not widened: RLS decides which rows exist to export.

### Checks (Claude, implementation session)

- Focused: `movementExport.test.ts` **32 passed**;
  `MovementsPageExport.test.tsx` **18 passed**.
- Full suite: **121 files, 2562 passed, 0 failed** (I-6 baseline: 119 / 2511;
  I-7 adds 2 files and 51 tests, one of which replaces an I-2 assertion).
- `npm run typecheck` clean · `npx oxlint` exit 0 · `npm run build` succeeded ·
  `git diff --check` exit 0 (its output is pre-existing CRLF advisories).
- Root `index.html` NOT edited — MD5 `b9be15c5ca59b68337863369620d72fa`,
  unchanged from the I-6 baseline; mtime 2026-09-01, predating this session.
- **Three mutation checks, all caught**: `page` substituted for `all` (1
  failure), the valuations map replaced with an empty map (1), `unit` dropped
  again in `derive()` (1).

### Independent I-7 verification (Codex)

Recorded as reported, unchanged, and kept separate from Claude's run above —
the two are different check sets, not two reports of the same numbers:

- **91 tests across four focused suites passed.**
- `typecheck`, `lint`, `build` and diff checks passed.
- Root `index.html` hash unchanged.

Codex ran four focused suites; Claude ran the focused pair plus the full suite
(2562 / 121 files). Neither figure supersedes the other, and neither is a live
check.

**I-7 is CODE VERIFIED.** It is **not** LIVE VERIFIED and **not** ACCEPTED.
Module I remains one acceptance boundary; the `D5` live checks stay open.

### Serialization follow-up (Claude, 2026-09-07)

Added `web/src/lib/movementExportWorkbook.test.ts` — **20 tests, passing**.
Nothing else changed: the shared writer, the matrix and the dependency set were
not touched.

It closes one gap the suites above could not reach. Every existing export suite
mocks `xlsx`: `movementExport.test.ts` stops at the matrix, `xls.test.ts`
replaces `XLSX.utils` with stubs, and `MovementsPageExport.test.tsx` mocks
`xls()` itself — so no test had ever proved the matrix serializes into a
readable workbook. The new suite intercepts **only** `XLSX.writeFile` (the
filesystem boundary), lets the real `xlsx@0.18.5` build the workbook, then
writes it to an in-memory buffer with `XLSX.write` and reads it back with
`XLSX.read`. Assertions are made against bytes that went through the real
writer and reader.

Confirmed in the produced file: sheet name (and the port's own 28-char
truncation), the exact 15-column header as string cells, one body row per
movement, numeric vs. empty cells, the stored write-off valuation
(`final / qty` unit price, stored `final` as the amount, empty amount when
`final_amount` is null), the inherited leading-zero conversion (R-F9), and the
«Qeyd edən» mapping. A **header-only workbook** is included and serializes to a
valid one-row file.

Two drafted expectations were **wrong and were corrected against the evidence**,
not the other way round:

- An empty cell is **not absent** from the sheet. `toNum('')` returns `''` and
  SheetJS writes a present `{ t: 's', v: '' }` cell, which reads back as `''`,
  not `null`. The rule the matrix enforces still holds — the cell is blank,
  carries no `0`, and cannot sum into a spreadsheet total — but the earlier
  assumption about *how* the blank is represented was unverifiable while the
  writer was mocked.
- The «Anbar» column exports the **display alias**: `whLabel()` maps stored
  «Xocahəsən» to «Xocəsən» (`WH_DISPLAY`), so the sheet matches the screen.
  The stored value is unchanged. Both behaviours now have explicit tests.

**Scope of the proof, stated narrowly:** this proves workbook *serialization*.
It is **not** live verification and **not** visual Excel compatibility —
SheetJS reading its own output says nothing about how Microsoft Excel renders
column widths, the freeze pane or the autofilter, and no live data was read.
Those remain open checks for I-8.

### Unresolved decisions after implementation

- **U1 stands.** `lib/xls.ts` still has no CSV fallback and no toast of its
  own; it was not modified. The legacy success toast is raised at the CALL SITE
  in `MovementsPage`, so the user-visible confirmation matches legacy without
  changing a helper shared with Nomenklatura. The missing CSV fallback remains
  a pre-existing limitation of the shipped helper, documented, not fixed here.
- **U2 stands, and is NOT newly approved.** Legacy reads valuations only when
  `DB.layerActive` is true (`index.html:957`); React reads
  `writeoff_valuations` unconditionally. I-7 changed nothing about this and
  inherits it from I-2. The two are therefore NOT proven equivalent: where a
  stored valuation exists while layers are inactive, React exports the stored
  amount and legacy would export `qty × price`. Recorded as an open inherited
  deviation.
- **U3 stands.** «Cap» remains out of scope and unrendered.

### Not verified

Nothing here is LIVE VERIFIED. No workbook was generated against live data: the
writer is mocked in tests and no Supabase read was performed. The exported file
has not been opened in Excel, and the export has never run against the TEST or
production project.
