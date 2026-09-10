# Module G draft registry rows — NOT MERGED

**These rows are a DRAFT. They are deliberately kept out of
`ANBAR_FUNCTIONAL_PARITY_REGISTRY.md` until the user approves Phase 6.**
Merging them is task 3 of the plan's entry criteria (principles §10 requires
them in the registry *before* implementation starts, not before approval).

Every row is `NOT STARTED`. No React implementation of Mal qrupları exists.
Line numbers are `origin/main:index.html`.

## Module G — Mal qrupları (Phase 6, proposed)

### Read and derivation

| # | Function | Old behaviour | Old location | New location | Status |
|---|---|---|---|---|---|
| M6-01 | Screen shell | `p-grp` section: heading, subtitle, selection counter, export button, filter panel, table, pager | 354-361 | `pages/ItemGroupsPage.tsx` | NOT STARTED |
| M6-02 | Positive-balance source | Rows come from `IX.bal`; `b.q > 1e-9` only — zero and negative excluded | 2740 | `lib/groupFilters.ts` | NOT STARTED |
| M6-03 | Warehouse permission scope | `allowedWarehouses()`; `anbardar` sees only their own warehouse, **not** the source group | 715-718, 2741 | `lib/warehouseScope.ts` (ported) + `groupFilters` | NOT STARTED |
| M6-04 | Last-purchase price map | Global last valid `Satınalma` price per code; `items.price` is **not** a fallback | 739-750 | `lib/lastPurchase.ts` | NOT STARTED |
| M6-05 | Purchase tiebreak order | date → `created_at` (`ts`, `Number.isFinite`-guarded) → `id` | 727-738 | `lib/lastPurchase.ts` | NOT STARTED |
| M6-06 | Cancelled rows excluded | Source is `normalMovements()` | 739, 1270 | `lib/operationalMovements.ts` (ported) | NOT STARTED |
| M6-07 | Category resolution | `it.category` or the `CAT_UNSET` pseudo-category | 2744 | `lib/groupFilters.ts` | NOT STARTED |
| M6-08 | Row sort | `warehouse` then `name`, both `localeCompare(…, 'az')` | 2755 | `lib/groupFilters.ts` | NOT STARTED |
| M6-09 | Row cut | `cut(rows, 'grp')`, `SHOW_MAX = 3000`, sticky «Hamısını göstər» | 1679-1691, 2804 | `lib/showAllCut.ts` (ported) + store | NOT STARTED |
| M6-10 | Table columns | checkbox · Kod · Malın adı · Kateqoriya · Anbar · Miqdar + unit · Son alış qiyməti | 2805-2818 | `pages/ItemGroupsPage.tsx` | NOT STARTED |
| M6-11 | Priceless cell | `—` in a `muted` span when no last purchase price | 2816 | `pages/ItemGroupsPage.tsx` | NOT STARTED |
| M6-12 | Pager line | `<n> sətir (müsbət qalıq)` + the cut note | 2820 | `pages/ItemGroupsPage.tsx` | NOT STARTED |

### Filters

| # | Function | Old behaviour | Old location | New location | Status |
|---|---|---|---|---|---|
| M6-13 | Warehouse multi-select | Checkbox tags from `allowedWarehouses()`; OR within the filter; empty = no restriction | 2781, 2784 | store + page | NOT STARTED |
| M6-14 | Empty-warehouse state | «İcazəli anbar yoxdur» when the allowed list is empty | 2783 | page | NOT STARTED |
| M6-15 | Category multi-select | `CAT_UNSET` prepended to `categoryOptions()`; OR within the filter | 2785 | store + page | NOT STARTED |
| M6-16 | Min/Max price | Inclusive bounds; blank allowed | 2719-2726, 2747-2751 | `lib/groupFilters.ts` | NOT STARTED |
| M6-17 | Min/Max validation | Negative or non-finite rejected; Min > Max rejected; three exact messages | 2721-2725 | `lib/groupFilters.ts` | NOT STARTED |
| M6-18 | Validation blocks the screen | On a validation error the table shows «Süzgəc xətası» and the pager turns alarm-coloured; rows are not computed | 2795-2800 | page | NOT STARTED |
| M6-19 | Priceless excluded by a bound | An item with no last-purchase price is dropped when Min **or** Max is set — never treated as 0 | 2747-2748 | `lib/groupFilters.ts` | NOT STARTED |
| M6-20 | Text search | Case-insensitive over `code + ' ' + name`; ANDed with every other filter | 2753 | `lib/groupFilters.ts` | NOT STARTED |
| M6-21 | Debounce | 200 ms on the three text/number inputs | 2789-2791 | page | NOT STARTED |
| M6-22 | Reset | Clears every filter **and** the selection, and rebuilds the filter panel | 2792 | store + page | NOT STARTED |
| M6-23 | Filter-semantics hint | AND between filters, OR within one; bounds inclusive; priceless excluded; positive balances only | 2780 | page | NOT STARTED |

### Selection

| # | Function | Old behaviour | Old location | New location | Status |
|---|---|---|---|---|---|
| M6-24 | Selection key | `code + '\|' + warehouse` — the same item in two warehouses is two selections | 2802, 2808 | store | NOT STARTED |
| M6-25 | Pruning | Selections no longer in the visible set are dropped on every render | 2802-2803 | store | NOT STARTED |
| M6-26 | Selection counter | «<n> sətir seçilib» / «Sətir seçilməyib» | 2823-2824 | page | NOT STARTED |
| M6-27 | Export button gate | Disabled when nothing is selected | 2825, 2853 | page | NOT STARTED |

### Export

| # | Function | Old behaviour | Old location | New location | Status |
|---|---|---|---|---|---|
| M6-28 | Pre-export validation | Min/Max revalidated before anything happens; invalid → toast, no refresh, no export | 2828-2829 | export flow | NOT STARTED |
| M6-29 | Refresh before export | `loadFromDB()` immediately before writing; a **failed refresh aborts** and is never shown as zero balance | 2833-2841 | export flow | NOT STARTED |
| M6-30 | Two failure shapes | A thrown error and an `ok:false` result produce two distinct messages | 2834-2840 | export flow | NOT STARTED |
| M6-31 | Snapshot instant | Stamp is taken **only after** a successful refresh | 2842 | export flow | NOT STARTED |
| M6-32 | Pruned rows | Selected rows that lost their positive balance are dropped and the count toasted; abort only when nothing remains | 2845-2850 | export flow | NOT STARTED |
| M6-33 | Workbook shape | Kod · Malın adı · Miqdar · Son alış qiyməti · Anbar · İxrac tarixi; `!cols` widths; sheet «Mal qrupları» | 2858-2878 | `lib/xlsGroups.ts` | NOT STARTED |
| M6-34 | Code as text | `{t:'s', z:'@'}` — leading zeros preserved. **Different from `toNum`/`R-F9`**; must not route through `xls()` | 2865 | `lib/xlsGroups.ts` | NOT STARTED |
| M6-35 | Missing price | **No cell is created** — the cell stays empty rather than 0 | 2868-2869 | `lib/xlsGroups.ts` | NOT STARTED |
| M6-36 | Export stamp | `toLocaleString('az-AZ', {timeZone:'Asia/Baku'})` of the snapshot instant, repeated on every row | 2857, 2871 | `lib/xlsGroups.ts` | NOT STARTED |
| M6-37 | Filename and toast | `mal_qruplari_<today>.xlsx`; toast reports the row count | 2879-2880 | `lib/xlsGroups.ts` | NOT STARTED |
| M6-38 | SheetJS absent | «Excel kitabxanası yüklənmədi», no download | 2856 | `lib/xlsGroups.ts` | NOT STARTED |

### Contract change

| # | Function | Old behaviour | Old location | New location | Status |
|---|---|---|---|---|---|
| M6-39 | `created_at` on `MovementRow` | The tiebreaker `m.ts` exists in the legacy `DB.movs`; the React read orders by `created_at` but does not select it | 874, `api/itemMovements.api.ts:43` | `api/itemMovements.api.ts` | NOT STARTED — **needs Q1** |
| M6-40 | Payload measurement | Phase 5's `T1` is recorded as pending with no counts | — | plan T1 | NOT STARTED |

### Navigation

| # | Function | Old behaviour | Old location | New location | Status |
|---|---|---|---|---|---|
| M6-41 | Nav entry | «Mal qrupları» under «Bazalar»; no counter badge; no role gate in `go()` | 259, 1495-1512 | `App.tsx` | NOT STARTED |
| M6-42 | Sync indicator | Legacy has one global connection state; React's is per-page | — | — | NOT STARTED — **needs Q2** |

### Deviations

**None proposed.** Every legacy behaviour above is ported as-is, including the
six documented in proposal §3.3 that could be mistaken for defects.

### Risks

`R-G1`…`R-G8` — see proposal §4. `R-F7` (`xlsx@0.18.5`) applies but is **not
reopened**: this phase adds no workbook-parsing path.
