# Phase 6 proposal — Mal qrupları (`grp`), Module G

**Status: APPROVED 2026-09-04 by the user — Q1, Q2 and Q3 decided (§5).
Implemented 2026-09-04, `CODE VERIFIED`, awaiting Codex's independent audit.**
Revised 2026-09-04 with the user's mandatory safety corrections (§7), which
supersede any earlier wording in this document.

Predecessor status carried forward, not discharged here: **Phase 5's
user-visible Windows print-preview inspection is DEFERRED by explicit user
decision and does not block Phase 6. It is NOT verified.** `M5-55` stays
`BLOCKED` until Yeni əməliyyat is migrated.

Governed by [`ANBAR_REACT_MIGRATION_PRINCIPLES.md`](../ANBAR_REACT_MIGRATION_PRINCIPLES.md)
and the [parity registry](../ANBAR_FUNCTIONAL_PARITY_REGISTRY.md).
Behavioural reference: `origin/main:index.html`. Every line number below is
that file, read via `git show origin/main:index.html`.

Predecessor: Phase 5 (Module F, Nomenklatura) is `CODE VERIFIED` with its
test-environment checks complete; its print-preview inspection and `M5-55`
remain open and are **not** discharged here.

---

## 1. Why this module is next

The remaining unmigrated modules (registry §«Modules not yet migrated») are
Dashboard, Yeni əməliyyat, Mal hərəkəti, Anbar qalıqları, stock layers and
Silinmə, `nreq`, group operations, documents/cancellation, reports, finance,
Azpetrol/Araz and users administration.

Measured against the legacy source, the three smallest coherent candidates are:

| Candidate | Legacy source | Write paths | New dependencies not yet ported |
|---|---|---|---|
| **Mal qrupları (`grp`)** | `rGroups` 2758-2820, `GRP`/`grpPriceRange`/`grpRows` 2716-2757, `grpUpdateSel`/`grpExport` 2820-2854, `xlsGroups` 2855-2881 · markup 354-361 | **None** — read + select + export only (explicit header comment, 2713-2715) | `buildLastPurchaseMap` (739-750) + `laterPurchase` (727-738). `allowedWarehouses` and the `categoryOptions` fallback are **already ported** |
| Anbar qalıqları (`bal`) | `rBal` 2209-2380, `condEditStart` 2382-2412, `getInitialBalanceRows` (~1950-2060), `COND_COLS`/`condOf`/`canEditCond`/`saveCond` 2068-2207 | **Yes** — `set_stock_condition` RPC, inline cell editing | `stock_conditions` load, the FIFO opening-balance provenance engine, four condition columns, two KPI/view modes, two export shapes |
| Mal hərəkəti (`mov`) | `rMov` 1789-1849, `MF`/`movFilters`/`movFiltered` 1592-1690, `writeOffExportRows`/`xlsWriteOff` 1709-1787 | **Yes** — `editMov` (5506) routes into `documentCancelView` (5012), `transferDocView` (5209), `legacyCancelView` (5264), `legacyTransferCancelView` (5286), `batchCancelOpen` (5378) | The whole cancellation/document sub-system, write-off valuation (`DB.woVals`/`woAllocs`), `movKey` option grouping |

**Recommendation: Mal qrupları.** It is the only remaining candidate with no
write path at all, it reuses the Phase 5 data spine unchanged, and its entire
legacy surface is roughly 170 lines. Both `bal` and `mov` pull in a complete
un-migrated sub-system (stock conditions + opening-balance provenance;
document cancellation) and each is a phase in its own right.

`grp` also has no ordering dependency on Yeni əməliyyat, so it does not inherit
the `M5-55` block.

## 2. Scope

The whole legacy `grp` screen, and nothing else:

**Read:** positive-balance rows only (`b.q > 1e-9`, 2740), warehouse-permission
scoping, the six-column table, «Hamısını göstər» via `cut(rows, 'grp')`.

**Filters:** multi-select warehouse, multi-select category (including the
`CAT_UNSET` pseudo-category), Min/Max price with validation, free-text search
over code + name, and «Süzgəcləri sıfırla». Semantics: AND between filters, OR
inside one filter; Min/Max bounds inclusive; priceless items excluded when
either bound is set (2739-2752, matching the hint text at 2780).

**Selection:** per-row checkboxes keyed `code|warehouse`, the selection count,
and pruning of selections that leave the visible set (2802-2803).

**Export:** `xlsGroups` — its own six-column workbook, code written as **text**
so leading zeros survive, an empty cell for a missing price, and the export
stamp in `az-AZ` / `Asia/Baku` (2855-2881).

**Refresh-before-export:** `grpExport` re-reads all data immediately before
writing the file; a failed refresh **aborts the export** and is never presented
as "zero balance" (2826-2836).

**Out of scope:** everything else. No SQL, no new RPC, no change to `xls()`,
the SON export, Tam ixrac, or any Phase 1-5 module.

## 3. Data and contract research

### 3.1 Sources

No new table and no new RPC. The screen consumes exactly what Phase 5 already
loads:

| Legacy source | React equivalent | State |
|---|---|---|
| `IX.bal` (`index()` 1285-1310) | `buildItemIndexes().bal` (`lib/itemIndex.ts`) | Ported |
| `DB.itemBy` (name, unit, category, price) | `fetchItems()` `ItemRow` — `category` already selected | Ported |
| `DB.whs` = warehouses filtered `active && type === 'anbar'` (933) | `fetchWarehouses()` returns **every** row, locations included — needs the legacy filter applied | **Gap — see §7.5** |
| `categoryOptions()` reference fallback | `lib/referenceFallbacks.ts` + the reference-values load | Ported |
| `allowedWarehouses()` (715-718) | `lib/warehouseScope.ts` | Ported |
| `cut`/`cutNote` | `lib/showAllCut.ts` (`SHOW_MAX = 3000`) | Ported |
| `nf`/`money`/`today` | `lib/format.ts` | Ported |
| `buildLastPurchaseMap` (739) + `laterPurchase` (727) | **not ported** | New |
| `xlsGroups` (2855) | **not ported** — a new module beside `lib/xls.ts` | New |

### 3.2 The one real contract gap — `laterPurchase` needs `created_at`

`buildLastPurchaseMap` picks each item's **global** last valid `Satınalma`
price, breaking ties deterministically by (1) `m.d` date, (2) `m.ts` =
`created_at`, (3) `m.id` (727-750). `items.price` is explicitly **not** used as
a fallback.

`api/itemMovements.api.ts` currently *orders by* `created_at` but does **not
select it** (`COLUMNS`, line 43). The tiebreaker is therefore unavailable
client-side today. This is exactly the "widen the column list, never fall back
to `select('*')`" case that file's own header describes.

**Approved (Q1):** add `created_at` to `COLUMNS` and to `MovementRow`. It is
one additional column on an already-read row set; no SQL change, consistent
with the approved Q1(c) precedent.

**Type correction.** The legacy `m.ts` is already a number, so the original can
write `Number.isFinite(m.ts)` (735). Supabase returns `created_at` as a
**nullable ISO string**, so the same guard applied to the raw value would be
`false` for *every* row and silently disable the second tie-break level.
The port must convert explicitly — `new Date(created_at).getTime()` — and treat
a `NaN` result (and `null`) as *unavailable*, falling through to the `id`
comparison. `Number.isFinite()` is never called on the raw string.

Two consequences to verify rather than assume:

- `MovementRow` widens, so every existing consumer's fixtures gain a field.
  Behaviour must be unchanged; the Phase 5 suite is the guard.
- Payload grows by one timestamp per movement row. Phase 5's `T1` payload
  measurement is recorded as **pending** in the handoff, so this phase should
  record actual row and byte counts rather than inherit an unmeasured claim.

### 3.3 Behaviours that look like defects and are not

Each is preserved and pinned by a test, per principles §7 — none is "fixed":

- **The price shown is the last purchase price, not `items.price`.** A row can
  show `—` in Mal qrupları while Nomenklatura shows a price for the same item.
  Two deliberately separate price concepts (739-750 vs `IX.bal.price`).
- **A priceless item disappears when either Min or Max is set** (2747). It is
  not treated as price 0.
- **«Süzgəcləri sıfırla» rebuilds the filter DOM** by clearing
  `el.dataset.done` (2792), which also clears the selection. Reset therefore
  drops selections.
- **Export prunes, it does not fail**, when a selected row lost its positive
  balance during the refresh: the rest is exported and the dropped count is
  toasted (2843-2846). It aborts only when *nothing* remains.
- **Sort is warehouse, then name, both `localeCompare(…, 'az')`** (2755) — not
  the value sort used on other screens.
- **`GRP.sel` is keyed `code + '|' + wh`**, so the same item in two warehouses
  is two independent selections.

### 3.4 Roles and permissions

There is no role gate on the screen or its export. The only role-dependent
behaviour is `allowedWarehouses()` (715-718): an `anbardar` sees only their own
warehouse — the source-group variant is **not** used here. `rehber` and `admin`
see all. Server-side, RLS on `movements`/`items` already applies; the screen
adds no write and needs no new server rule.

## 4. Risks

| # | Risk | Handling |
|---|---|---|
| R-G1 | Widening `MovementRow` with `created_at` touches every Phase 5 consumer | Run the full Phase 5 suite before and after; no consumer may change behaviour |
| R-G2 | `laterPurchase` ordering is subtle — three levels, and the legacy `Number.isFinite` guard assumes a **number** while Supabase returns a **nullable string** | Convert with `new Date(...).getTime()`, treat `NaN`/`null` as unavailable (Q1). One test per tie level plus null and malformed `created_at` |
| R-G9 | Reusing `useNomenclatureStore.load()` before export would export on a partial refresh — it returns `void` and survives a failed movements read | A separate typed snapshot loader returning explicit success/failure; movements **and** items fatal for this screen (§7.2-7.4) |
| R-G10 | `fetchWarehouses()` returns locations as well as warehouses | Apply the legacy `active && type === 'anbar'` filter before `allowedWarehouses()` (§7.5-7.6) |
| R-G11 | Pruning selections against the rendered page instead of the full filtered set would drop reachable selections | Prune against the complete filtered result, before the cut (§7.14) |
| R-G3 | `xlsGroups` shares SheetJS with Phase 5, so `R-F7` (`xlsx@0.18.5`, two high-severity **parsing** advisories) is in scope | Export is generation-only and unaffected. This phase adds **no import path**, and must not without a separate decision. `R-F7` is not reopened |
| R-G4 | Zero-padded codes in Excel | `xlsGroups` writes `{t:'s', z:'@'}` (2865) — deliberately different from `toNum`'s inherited `R-F9` behaviour. It must **not** be routed through the shared `xls()` |
| R-G5 | Refresh-before-export re-reads everything; a slow or failed read must abort | Port the abort path and both distinct failure messages; test the thrown case and the `ok:false` case separately (the Phase 3a `fetchReferenceValues` lesson) |
| R-G6 | The `az-AZ` / `Asia/Baku` export stamp is environment-sensitive | Inject the timestamp; assert the formatted string against a fixed instant |
| R-G7 | Selection pruning on filter change is easy to lose in a React rewrite | Test that a selection outside the visible set is dropped (2802-2803) |
| R-G8 | `App.tsx` is still a minimal switch, not a router | Add one nav entry only. A router is a separate decision and must not be smuggled in |

## 5. Decisions — APPROVED by the user, 2026-09-04

| Q | Decision | Effect |
|---|---|---|
| **Q1** | **Approved** — add `created_at` to the existing movement query. Supabase returns it as a **nullable string**. Convert explicitly with `new Date(created_at).getTime()` and treat an invalid result (`NaN`) as *unavailable* before applying the legacy date → timestamp → id comparison. **Never call `Number.isFinite()` on the raw string.** | Corrects proposal §3.2, which named `Number.isFinite` without accounting for the string type. See `R-G2` |
| **Q2** | **Approved** — keep the phase contained. Use the existing page-scoped Realtime pattern (`useRealtimeRefresh`) for `items`, `movements` and `warehouses`. **No shell-wide sync refactor, no duplicate active subscriptions, no `audit_log` subscription.** | The shell-scope fix stays a separate future item; Phase 4 Q3 remains in force |
| **Q3** | **Approved** — implement the complete legacy Mal qrupları screen | Full parity, as scoped in §2 |

## 7. Mandatory safety corrections — user instruction, 2026-09-04

These **supersede** any conflicting wording earlier in this document. Each is
carried into the plan as a task and into the registry as its own row.

**Loading and refresh**

1. **Direct navigation must work.** Phase 6 data loads when the user opens Mal
   qrupları straight after login. It must not depend on visiting Nomenklatura
   first.
2. **Do not reuse `useNomenclatureStore.load()` for refresh-before-export.** It
   returns `void` (no success result) and treats a failed movements read as
   non-fatal, so an export could silently proceed on empty balances. A clearly
   typed snapshot loader returning explicit success/failure is required.
3. **A refresh used before export must be atomic.** If any required core read
   fails, keep the previous screen state, abort the export and show the real
   error. Never export stale or partially refreshed data.
4. **For this screen a failed movement OR item read is fatal** — balances and
   last-purchase prices cannot be computed safely without either. This differs
   from Nomenklatura, where a failed movements read is survivable.

**Warehouses**

5. **Warehouse choices must match legacy `DB.whs`: active rows with
   `type === 'anbar'` only** (index.html:933). Not every row
   `fetchWarehouses()` returns — that list also contains locations
   (`DB.locs`, 935).
6. **Apply `allowedWarehouses()` after that filtering.** An `anbardar` sees
   only their assigned warehouse, **not** the Astara/Harmony source group.
7. **Use `whLabel()` only where the legacy screen uses it.** Do not rename raw
   stored warehouse values anywhere else.

**Data correctness**

8. Preserve the legacy unknown-item name `(nomenklaturada yoxdur: <code>)`
   (index.html:1307); never render an empty name.
9. Last-purchase price comes **only** from the latest valid operational
   `Satınalma` movement with `price > 0`. **Never** fall back to `items.price`.
10. Exclude cancelled movements using the existing cancellation model.
11. Preserve date → valid `created_at` timestamp → string `id` tie-breaking
    exactly.
12. Preserve four-decimal balance rounding **before** filtering and display.

**Selection, cut and reset**

13. Selection keys are `code|warehouse`.
14. **Prune selections against the complete filtered result, before the
    3000-row display cut** — not merely against the rendered rows. Pruning
    against the cut page would silently drop selections the user made and can
    still reach via «Hamısını göstər».
15. «Hamısını göstər» stays **sticky** across filtering, reset and navigation,
    as the legacy global `SHOW_ALL` is.
16. Reset clears filters and selection but must not alter unrelated page state.

**References, filters, sorting**

17. Failed category-directory loading uses the fallback list; a successfully
    loaded but **empty** active directory stays empty (the `A14` distinction).
18. Preserve the exact Min/Max validation messages and inclusive boundaries.
    Priceless rows disappear when either boundary is active.
19. Preserve warehouse-then-name Azerbaijani sorting.

**Export**

20. Keep `xlsGroups` separate from the shared `xls()`.
21. Excel codes stay text with leading zeros; a missing price produces a
    genuinely empty cell. Preserve the six columns, sheet name, widths,
    filename and `az-AZ` / `Asia/Baku` timestamp.
22. Refresh immediately before export. Abort on rejected reads and on explicit
    failure results. If selected rows lose positive balance, prune them and
    report the exact dropped count; abort only when none remain.
23. **This phase adds export only.** No new import path, no change to the
    accepted SheetJS version (`R-F7` is not reopened).

## 6. Acceptance criteria

1. Every row in Module G reaches `CODE VERIFIED` with a colocated test.
2. Full suite, typecheck, oxlint, build and `git diff --check` clean; test and
   file counts recorded against the Phase 5 baseline of 843 tests / 54 files.
3. Read-only live comparison, old vs new, on identical filters: row count,
   order, all six columns, and the pager line.
4. A **real generated workbook** opened and compared against the legacy file —
   header, code as text with leading zeros, empty price cell, stamp.
5. Role scoping for an `anbardar` and the refresh-failure abort verified in the
   test environment.
6. Registry Module G merged **before** implementation begins (principles §10).
