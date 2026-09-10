# Phase 9 — «Anbar qalıqları» (Module J): research and proposal

**Status: PROPOSAL ONLY. NOTHING IMPLEMENTED.** No application code, SQL, RPC,
schema, Supabase data, `.env`, dependency, root `index.html`, GitHub, Vercel or
production state was changed while producing this document. **No live Supabase
read or write was performed** — every server fact below comes from the
2026-09-03 captures in `test-environment/` and from live definitions already
transcribed in accepted Phase 7/8 evidence. The test suite was not run.

Read with [`ANBAR_REACT_MIGRATION_PRINCIPLES.md`](../ANBAR_REACT_MIGRATION_PRINCIPLES.md)
and [`ANBAR_FUNCTIONAL_PARITY_REGISTRY.md`](../ANBAR_FUNCTIONAL_PARITY_REGISTRY.md).
Row ledger: [`2026-09-10-phase9-registry-rows.md`](2026-09-10-phase9-registry-rows.md).
Plan: [`../plans/2026-09-10-react-migration-phase9-balances.md`](../plans/2026-09-10-react-migration-phase9-balances.md).
Codex handoff: [`../audits/2026-09-10-phase9-design-codex-handoff.md`](../audits/2026-09-10-phase9-design-codex-handoff.md).

**Revision 4 (2026-09-10)** — corrected after the final narrow Codex design
audit [`../audits/2026-09-10-phase9-final-design-codex-audit.md`](../audits/2026-09-10-phase9-final-design-codex-audit.md): T0A is now strictly
read-only; every executable mutation/refusal/fallback probe is deferred to the
separately authorised T10 window; and the captured `rDxtm` ACL is described
exactly rather than incorrectly as “only `r`”.

**Design accepted:** [`../audits/2026-09-10-phase9-design-codex-acceptance.md`](../audits/2026-09-10-phase9-design-codex-acceptance.md).
This accepts the design only; Phase 9 implementation and acceptance have not
started.

---

## 0. Statuses this document preserves

Phase 9 changes **no** Phase 7 or Phase 8 status. Restated so nothing below can
be read as promotion:

- **Phase 7 / Module H is `ACCEPTED`** (2026-09-10) for the owner-approved TEST
  configuration: active layers, active movement splits, no layer deactivation,
  no new cutover, `Çap` outside scope.
- **Phase 8 / Module I is `ACCEPTED`** (2026-09-09) for the owner-approved
  active-layer TEST scope. M8-39/M8-46 inactive-layer branches and M8-29's
  historical layer-legacy transfer success remain **scoped exclusions, not
  claimed live passes**.
- `Çap` remains an accepted historically non-functional feature
  ([decision](../decisions/2026-09-08-print-nonfunctional-baseline.md)) and is
  **outside the Phase 9 acceptance boundary** by the user's instruction for this
  phase. Phase 9 still ports the button and records its rows as excluded.
- No Phase 9 row is `ACCEPTED`, and none may become so without Codex's
  independent audit (principles §11).

## 1. Why Phase 9 exists, and why it is not a small screen

«Anbar qalıqları» is the third and last entry of the rail's `Əməliyyat` group
(`index.html:254`), and the only remaining unmigrated screen in it. Phases 7 and
8 migrated the surfaces that *write* and *inspect* movements; this is the
surface that *states what is in the warehouse*.

Three things make it materially harder than «Mal qrupları», which it superficially
resembles:

1. **It is the first migrated screen with a write path that is not a document
   post.** The condition cells («Yararsız / Təmirə ehtiyaclı / Sahədə /
   İcarədə») are edited in place and saved through `set_stock_condition`. Every
   previously migrated read screen had exactly one outbound action: generating a
   file.
2. **It contains two different screens behind one heading.** The `Əvvələ qalıq`
   filter switches the whole page — different source function, different
   columns, different KPIs, different empty states, different export header — and
   that view itself has two sub-modes («İlkin miqdar» / «Cari qalıq»).
3. **It carries a FIFO provenance computation** (`getInitialBalanceRows()`,
   `index.html:1930-2051`) that reconstructs opening-balance lots across
   transfers, including legacy Excel-imported transfers with no document number.
   Nothing comparable has been ported so far.

## 2. Evidence base — what was read

Legacy (`platform/index.html`, this repository's working copy):

| Concern | Lines |
|---|---|
| Rail entry `data-p="bal"` | 254 |
| `p-bal` section markup, Excel/Çap buttons | 326-333 |
| `go()` navigation gate (no `bal` branch) | 1495-1512 |
| `render()` dispatch → `rBal` | 1517 |
| `operationalMovements()` / `normalMovements()` | 1249-1270 |
| `index()` — `IX.bal`, `byItem`, `byWh`, `priceObs`, `totVal/totQty/negs` | 1271-1322 |
| `esc`/`whLabel`/`WH_DISPLAY`/`nf`/`money`/`dsort`/`fmtD` | 580-603 |
| `xls()` + `toNum()` | 1210-1235 |
| `printHead()` | 1237-1243 |
| `cut()` / `cutNote()` / `SHOW_MAX` | 1677-1690 |
| `itemCard()` — the drawer `data-card` opens | 1861-1891 |
| `BF` filter state | 1894 |
| `INIT_BAL_PARTNERS` / `INIT_BAL_TYPE` / `_normBase` / `_normPartner` / `_isInitBalType` / `_isInitBalPartner` | 1898-1916 |
| `isInitialBalanceLine()` + admin-only message | 1917-1929 |
| `getInitialBalanceRows()` — FIFO lots, transfers, pending legs | 1930-2051 |
| `COND_COLS` / `condOf` | 2052-2074 |
| `condBuckets` / `condPending` / `condSplitZero` / `condSplitSum` / `condSplitPayload` / `condSplitCheck` | 2075-2145 |
| `canEditCond()` | 2146-2152 |
| `saveCond()` — RPC, PGRST202 fallback, toast branches | 2153-2207 |
| `rBal()` — filters, both views, KPIs, table, pager, print, export | 2209-2378 |
| `condEditStart()` — inline editor | 2380-2410 |
| Warehouse-value view (`rAnb`) reusing `IX.bal` | 2900-2916 |

React (`web/src`): `App.tsx` (rail, internal switch), `lib/itemIndex.ts`,
`lib/operationalMovements.ts`, `lib/condSplit.ts`, `lib/format.ts`,
`lib/movementRoute.ts` (`whLabel`), `lib/showAllCut.ts`, `lib/warehouseScope.ts`,
`lib/groupFilters.ts`, `store/itemGroups.store.ts`, `pages/ItemGroupsPage.tsx`,
`api/items.api.ts`, `api/itemMovements.api.ts`, `api/stockConditions.api.ts`,
`api/itemGroupsSnapshot.api.ts`, `api/movementsSnapshot.api.ts`,
`hooks/useRealtimeRefresh.ts`.

Server evidence (**captures only, no live probe in this session**):
`test-environment/production-schema-2026-09-03.json`,
`production-functions-2026-09-03.json`,
`production-permissions-2026-09-03.json`.

**Not read, deliberately:** chat history, the full bug registry, the Azpetrol
module, and legacy ranges outside the table above.

## 3. Confirmed server contract

### 3.1 `stock_conditions`

From the schema capture (`rls: true`, `kind: "r"`):

| Column | Type | Notes |
|---|---|---|
| `warehouse` | `text` NOT NULL | PK part |
| `item_code` | `text` NOT NULL | PK part, FK → `items(code)` |
| `unfit_qty` | `numeric(14,2)` NOT NULL default 0 | |
| `repair_qty` | `numeric(14,2)` NOT NULL default 0 | |
| `onsite_qty` | `numeric(14,2)` NOT NULL default 0 | |
| `note` | `text` | nullable |
| `updated_by` | `uuid` | nullable |
| `updated_at` | `timestamptz` NOT NULL default `now()` | |
| `created_at` | `timestamptz` **NOT NULL** default `now()` | |
| `icare_qty` | `numeric(14,2)` **NOT NULL** default 0 | `CHECK (icare_qty >= 0)` — **sql/031 IS applied on the captured project** |

**Transcription corrected 2026-09-10 (Codex finding 5).** An earlier revision of
this document recorded `icare_qty` as a bare nullable `numeric` and `created_at`
as a nullable `timestamptz`. Both were wrong; the shapes above are the captured
ones. Column order above follows the capture, in which `icare_qty` is the last
column (added by sql/031), not an inline addition next to the other quantities.

Indexes: `idx_stock_conditions_warehouse`, `idx_stock_conditions_item`.

**Policies: exactly one.**

```text
stock_conditions_select  SELECT  authenticated  PERMISSIVE
  is_admin() OR is_rehber() OR (is_anbardar() AND warehouse = current_user_warehouse())
```

There is **no INSERT, UPDATE or DELETE policy**, and RLS is enabled. The legacy
comment at `index.html:2061-2064` is therefore correct: a direct PostgREST write
to this table is refused for every role, and `set_stock_condition` (SECURITY
DEFINER) is the only application write path. The captured table ACL is
`{...authenticated=rDxtm/postgres...}`: it includes `r`, `D`, `x`, `t` and `m`,
but crucially lacks the DML privilege letters `a` (INSERT), `w` (UPDATE) and `d`
(DELETE). The earlier shorthand “only `r`” was an incorrect decoding and is
superseded by this exact statement.

### 3.2 `set_stock_condition(text,text,numeric,numeric,numeric,numeric,text)`

`SECURITY DEFINER`, `search_path = public`. Enforcement order, transcribed from
the captured definition:

1. `auth.uid() IS NULL` → «İcazə yoxdur: sessiya tapılmadı».
2. `current_user_role()` NULL → «İcazə yoxdur: istifadəçi profili tapılmadı və ya aktiv deyil».
3. role NOT IN (`admin`,`anbardar`) → «İcazə yoxdur: mal vəziyyətini yalnız Admin və ya anbardar dəyişə bilər (cari rol: %)». **`rehber` is refused server-side.**
4. warehouse NFKC-normalised + trimmed; empty → «Anbar seçilməyib»; item code empty → «Mal kodu tələb olunur».
5. warehouse must exist `AND active = TRUE AND type = 'anbar'` → «Anbar tapılmadı və ya aktiv deyil: %».
6. `anbardar` and `current_user_warehouse() <> v_wh` → «İcazə yoxdur: yalnız öz anbarınızda mal vəziyyətini dəyişə bilərsiniz».
7. item must exist in `items` → «Mal nomenklaturada tapılmadı: %».
8. NaN/±Infinity → «Miqdar düzgün ədəd olmalıdır»; negative → «Miqdar mənfi ola bilməz»; `> 999999999999` → «Miqdar həddindən böyükdür».
9. All four quantities `ROUND(...,2)`; note trimmed to NULL when empty.
10. `v_bal := stock_condition_balance(v_wh, v_code)`; `v_sum :=` the four quantities.
11. Row locked `FOR UPDATE`. If `v_sum = 0 AND note IS NULL`: `DELETE` when a row exists, else `NOOP`. Otherwise `INSERT … ON CONFLICT (warehouse,item_code) DO UPDATE`, action `INSERT`/`UPDATE`.
12. Non-`NOOP` actions write an `audit_log` row (`table_name='stock_conditions'`, `record_id = warehouse||'|'||code`, old/new JSON, fixed Azerbaijani reason).
13. Returns `jsonb`: `warehouse, item_code, unfit_qty, repair_qty, onsite_qty, icare_qty, note, action, balance, exceeds_balance`.

**`exceeds_balance` never blocks.** It is advisory, and the client only warns.

### 3.3 Two row sets, one balance — the withdrawn divergence claim

```sql
CREATE OR REPLACE FUNCTION public.stock_condition_balance(p_warehouse text, p_item_code text)
 RETURNS numeric LANGUAGE sql STABLE SECURITY DEFINER
AS $$ SELECT COALESCE(SUM(in_qty - out_qty), 0)
       FROM public.movements
      WHERE warehouse = p_warehouse AND item_code = p_item_code; $$
```

This sums **every** `movements` row. The screen's own `Qalıq` column sums only
`operationalMovements()` — cancelled documents and their reversal rows removed
(`index.html:1279`, ported at `lib/itemIndex.ts:66`).

**A different row set does not imply a different number, and an earlier revision
of this document wrongly claimed it did.** That claim is **WITHDRAWN**
(Codex blocking finding, 2026-09-10). Its supporting example — a row-level
legacy cancellation leaving an uncancelled marker row in the raw sum — was
mathematically false.

Verified independently against the captured function bodies. Every supported
path inserts an **exact inverse row**:

| Family | Function | Inverse construction |
|---|---|---|
| Legacy row-level | `cancel_legacy_movement(uuid,date)` | inserts `COALESCE(v_orig.out_qty,0), COALESCE(v_orig.in_qty,0)` into the `(in_qty,out_qty)` slots |
| Legacy transfer pair | `cancel_legacy_transfer(uuid,date)` | matches the opposite leg on exact equal quantity (`in_qty = v_qty AND out_qty = 0`, and the mirror) before inserting both counter-rows |
| Whole document | `cancel_document(text,date)` | `in_qty > 0` → `(0, r.in_qty)`; `out_qty > 0` → `(r.out_qty, 0)` |
| Transfer document | `cancel_transfer_document(text,date)` | same mirrored construction on both `Yerdəyişmə` legs |
| Layer transfer | `cancel_layer_transfer_document(text,date)` | reverses on `SUM(out_qty - in_qty)` per warehouse × item |

So a source row and its counter-row sum to **zero** in the raw set, and
`excludeCancelled()` removes **both**, which also sums to zero.

**`correct_document` is a different mechanism, and an earlier revision of this
document described it wrongly** (re-audit finding 1). It does **not** merely
append a note marker. Transcribed from the captured body
(`correct_document(text,jsonb,text,date)`), after the admin gate, the
editability check and per-line validation it does exactly this:

```text
v_marker := 'Əvəz edir: ' || v_doc;      -- decorates the REPLACEMENT's note only
v_lines  := p_lines each with that note   -- no quantity is derived from the marker
v_cancel := public.cancel_document(v_doc, p_reversal_date);
v_posted := public.post_movement_document(v_lines, NULL);
```

A correction is therefore **the cancellation pair plus a replacement document**:

1. the original document and the `cancel_document` reversal it triggers sum to
   **zero** in the raw set, and `excludeCancelled()` removes **both** (also
   zero); and
2. the **replacement** document posted by `post_movement_document` is an
   ordinary, uncancelled document — **present in both the raw and the
   operational sets**, contributing the same quantities to each.

The note marker carries no quantity; it is provenance text on the replacement's
lines. The equality conclusion is unchanged, but it holds **for this reason**,
not because a marker is inert.

Raw and operational balances are therefore **algebraically equal on every
supported history**, and `exceeds_balance` compares against the same number the
screen shows.

Unequal results remain *possible* only for malformed, missing or unequal
historical counter-rows — data no evidence currently shows exists. Q3 is
accordingly reframed from "an owner decision between two proven balances" to a
**measurement task**: see §6 Q3 and row `M9-141`. **No owner decision is
requested unless a real unequal pair is demonstrated on live data.**

### 3.4 Reads the screen needs

| Table | Policy (captured) | Effect here |
|---|---|---|
| `movements` | `is_admin() OR is_rehber() OR (is_anbardar() AND warehouse = current_user_warehouse())` | An anbardar's balances are **server-scoped**; the client adds no filter (the D2 precedent, M8-42) |
| `items` | `items_select`: `current_user_role() IS NOT NULL` | Every active role reads the whole nomenclature |
| `stock_conditions` | as §3.1 | anbardar sees only their own warehouse's markers |
| `warehouses` | (Module B) | `DB.whs` = `active && type='anbar'` |

## 4. What Phase 9 covers

### 4.1 The current-balance view (default)

Source: `IX.bal`, already ported as `buildItemIndexes().bal`.

- **Row identity:** warehouse × item. `q = +(in - out).toFixed(4)`;
  `price` from `items.price` (**never** a movement price); `val = q × price`.
- **Warehouse modes:** «Anbarlar üzrə ayrı» (default, one row per warehouse ×
  item), «Ümumi (anbarlar birlikdə)» (`__sum`, re-aggregated by code with
  `q`/`val` recomputed after summing), or one named warehouse.
- **Nomenclature rows with no movement:** in the "ayrı" and `__sum` modes only,
  every `items` code absent from `IX.bal` is appended with zeros, warehouse
  `bütün anbarlar` (`__sum`) or `—` (ayrı), and flagged `nomv` → «hərəkət yoxdur»
  tag in the last column. **Not** added when a specific warehouse is selected.
- **Condition columns:** four, from `stock_conditions`; in `__sum` mode summed
  across warehouses and **not editable**.
- **Zero-filter segment:** `act` (default, `|q| ≥ 1e-9`), `all`, `neg` (`q < 0`),
  `zero` (`|q| < 1e-9`).
- **Condition filter:** all / `any` (any marker > 0) / one of the four.
- **Sort:** `val` (default), `q`, `name` (az collation), `last`, or `cond:<key>`.
- **KPIs (5):** Mövqe sayı · Ümumi miqdar · Ümumi dəyər (`g`) · Sıfır qalıq ·
  Mənfi qalıq (`r` when any negative, else `g`).
- **Columns (14):** Kod · Malın adı · Anbar · Ölçü · Mədaxil · Məxaric · Qalıq ·
  Yararsız · Təmirə ehtiyaclı · Sahədə · İcarədə · Vahid qiyməti · Dəyər ·
  Son hərəkət.
- **Soft cap:** `SHOW_MAX` 3000 with «Hamısını göstər», sticky (`SHOW_ALL['bal']`).
- **Row click:** opens the item card drawer (`data-card`).

### 4.2 The «Əvvələ qalıq» view

Source: `getInitialBalanceRows()` — a FIFO reconstruction over
`normalMovements()` sorted by date, with transfer-out legs ordered before other
same-date rows, then by `ts`.

- Opening lots are created only for rows where `_isInitBalType(type)` **and**
  `_isInitBalPartner(partner)`. Type matching is strict (NFKC+trim+lowercase,
  equal to `Əvvələ qalıq`); partner matching additionally folds `ğ→q`, so all
  three historical spellings match.
- Outbound quantities consume lots FIFO; transfer-out legs park consumed opening
  lots in `pendingTransfers`, keyed by `doc|<doc>|<code>` or, for legacy
  document-less transfers, `legacy|<date>|<code>|<from>|<to>`.
- Transfer-in legs take from that pending queue, so a transferred opening layer
  moves warehouse **without** creating a new `initial_qty`.
- `current_qty` = the opening-origin lots still held; `initial_qty` = the sum
  originally posted in that warehouse.
- Sub-modes: «İlkin miqdar» (default) filters `initial_qty > 1e-9`, «Cari qalıq»
  filters `current_qty > 1e-9`; the mode label becomes the quantity column
  header.
- `__sum` does **not** merge warehouses in this view; it is treated as "no
  warehouse filter".
- **Condition filter and condition columns are hidden** in this view.
- **KPIs (4):** Mövqe sayı · Ümumi miqdar · Ümumi dəyər — always `money(0)` →
  «—», subtitle «bu görünüşdə hesablanmır» · Sıfır qalıq.
- **Columns (8):** Kod · Malın adı · Anbar · Ölçü · `<modeLabel>` · İlk mənbə
  anbar · Əvvələ qalıq tarixi · Son hərəkət.
- **Three distinct empty states**, chosen in this order: no opening rows at all;
  else «Cari qalıq» with nothing; else filtered-to-nothing.

### 4.3 The condition write path

`canEditCond(w)` hides the editor when conditions have not loaded, when the
warehouse is `bütün anbarlar` or `—`, and for any user who is neither admin nor
the anbardar of that exact warehouse. This is **UI convenience only** — the
binding rule is §3.2 step 3/6, server-side.

`condEditStart()` swaps the cell for a `number` input (`min=0`, `step=0.01`),
commits on Enter/blur, cancels on Escape, and **always re-renders from the
server's returned row**, so a rejected write reverts visibly.

`saveCond()` sends all four quantities plus the existing note, so a concurrent
partial edit cannot produce an inconsistent row. On `PGRST202` it retries with
the pre-031 six-argument signature — except for the `icare` key, which reports
«İcarə sütunu bazada yoxdur — sql/031 hələ tətbiq edilməyib» and sets the sync
indicator to failed.

### 4.4 Export

`bal-exp` → `xls(...)`, filename `anbar_qaliqlari_<today>.xlsx`, sheet
«Hesabat», autofilter, frozen header, computed column widths, numeric coercion
via `toNum` for every non-header cell.

- Current view header (14): Anbar · Kod · Malın adı · Ölçü · Mədaxil · Məxaric ·
  Qalıq · **the four `COND_COLS` titles, generated from the same array as the
  table header** · Vahid qiyməti · Dəyər · Son hərəkət.
- Opening view header (8): Anbar · Kod · Malın adı · Ölçü · `<modeLabel>` ·
  İlk mənbə anbar · Əvvələ qalıq tarixi · Son hərəkət.
- **Exports the full filtered set, not the 3000-row page.**
- `whLabel()` is applied to warehouse cells (display alias in the file, agreed
  2026-08-25); `b.price || ''` leaves a priceless cell empty; `val.toFixed(2)`;
  raw ISO dates for `last`/`opening_date` (**not** `fmtD`).

### 4.5 Out of scope for Phase 9

- **`Çap`** — excluded from acceptance by the settled 2026-09-08 owner decision
  (§0, Q2). Not an open question.
- **`rAnb`** (Anbar və layihələr) and the `dead` report, both of which read
  `IX.bal`. They belong to their own later phases; Phase 9 must not migrate them
  and must not break the shared computation they will reuse.
- **Stock layers.** This screen never reads `stock_layers`. No layer
  deactivation, no cutover.

## 5. Proposed architecture

Reuse first — the point of the earlier phases:

**Q5 note.** `WarehouseBalance` currently lacks `last`, `first`, `price`, `val`,
`name`, `unit`. Extending it is additive, but it is consumed by **12 files**
(listed in R1), not only `groupFilters.ts`. The guard is focused coverage of
every one of those consumers plus the full suite and typecheck.

| Need | Existing module | New? |
|---|---|---|
| Cancellation model | `lib/operationalMovements.ts` | reuse |
| `bal` aggregation | `lib/itemIndex.ts` (`buildItemIndexes`) | reuse, **extend** |
| Condition maths/keys | `lib/condSplit.ts` (`COND_COLS`, `condKey`) | reuse |
| Conditions read | `api/stockConditions.api.ts` | reuse |
| Items / movements / warehouses reads | existing api modules | reuse |
| Formatting | `lib/format.ts`, `lib/movementRoute.ts#whLabel` | reuse |
| Soft cap | `lib/showAllCut.ts` | reuse |
| Role scope | `lib/roles.ts` | reuse |
| Realtime | `hooks/useRealtimeRefresh.ts` | reuse |

New modules:

- `api/balancesSnapshot.api.ts` — atomic four-read snapshot (movements, items,
  warehouses, stock_conditions), all fatal, following
  `movementsSnapshot.api.ts` exactly.
- `api/setStockCondition.api.ts` — the single RPC wrapper, behind
  `lib/mutationGuard.ts`.
- `lib/balanceRows.ts` — the three source shapes (ayrı / `__sum` / named), the
  no-movement nomenclature rows, condition attachment, filters, sorts, KPIs.
- `lib/initialBalance.ts` — `getInitialBalanceRows()` and its normalisation
  helpers.
- `lib/balanceExport.ts` — both header shapes and row builders.
- `store/balances.store.ts` — `BF` state, snapshot, sticky `showAll`.
- `pages/BalancesPage.tsx`, `components/balances/ConditionCell.tsx`.

**`buildItemIndexes` must be extended, not forked**, per Q5 — with the
12-consumer regression guard, not the Phase 6 suite alone.

## 5A. Declared deviations and improvements

These depart from legacy behaviour. Each is deliberate, and **none may be
described as parity**. Recorded after the Codex design audit (findings 1, 2, 9).

**All four are OWNER-APPROVED** by the
[2026-09-10 Phase 9 design decision](../decisions/2026-09-10-phase9-design-package.md).
The interim `RECOMMENDED / OWNER DECISION PENDING` label required by re-audit
finding 2 no longer applies to any of them. The decision approves **design
behaviour only** — it authorises no implementation-time or live write, no
production contact, deployment, cutover, commit, push or merge.

### D-J1 — a failed `stock_conditions` read is FATAL (deviation) — **OWNER-APPROVED**

Approved by [decision §2](../decisions/2026-09-10-phase9-design-package.md): a
failed `stock_conditions` refresh is fatal for the new snapshot, and the last
successful snapshot remains visible.

Legacy deliberately swallows it. `index.html:908-923` wraps the read in
`try/catch`, sets `DB.condsReady = true` **only** inside `if (!condErr)`, and
otherwise leaves `DB.conds` empty so the platform keeps working with blank
marker cells (the comment at 904-907 says so explicitly).

Phase 9 instead makes the read fatal within the atomic snapshot (M9-11), so a
failed refresh retains the **previous** snapshot whole rather than silently
blanking every marker column.

Rationale: a blank marker column is indistinguishable from "nothing is marked",
and on this screen that misrepresents rented and unfit stock. This is the same
reasoning the Phase 7 `opReadiness` gate applies to the write path, and the
Phase 8 I-2 audit applied to `writeoff_valuations`. **The user-visible
consequence differs from legacy** — legacy shows a working screen with empty
markers, Phase 9 shows the prior data plus an error — so it is declared, not
assumed. Rows: M9-11, M9-12, M9-13.

### D-J2 — realtime subscribes `stock_conditions`, drops `partners` (improvement) — **OWNER-APPROVED**

Approved by [decision §3](../decisions/2026-09-10-phase9-design-package.md): the
Phase 9 screen subscribes to `stock_conditions` and does not subscribe to the
irrelevant `partners` table.

Legacy subscribes exactly `['movements','items','partners','warehouses']`
(`index.html:1174`) — one global subscription serving every screen, which is why
it includes `partners` (this screen never reads it) and excludes
`stock_conditions` (so a marker changed by another user does **not** refresh the
balance screen until something else does).

Phase 9 subscribes exactly what this screen reads: `movements`, `items`,
`warehouses`, `stock_conditions`. Rows: M9-130, M9-130a.

### D-J3 — mid-edit refresh policy (improvement, made exact) — **OWNER-APPROVED**

Legacy keeps the editor in transient DOM and `rBal()` replaces the table
wholesale, so a realtime `renderAll()` **can** discard an in-progress input.
"Must not silently discard" was not parity and was not testable.

Approved by [decision §4](../decisions/2026-09-10-phase9-design-package.md). The
exact contract, replacing that wording and resolving the blur contradiction
raised by re-audit finding 3:

> While a condition cell is in edit mode, an arriving snapshot is **applied to
> the store but deferred for that one cell**. The rest of the table re-renders
> normally, and the store's latest values for the row remain available to the
> editor.
>
> **Escape cancels.** The cell discards the uncommitted input and adopts the
> **latest** snapshot value, not the stale pre-edit one, showing the latest
> complete snapshot row.
>
> **Blur commits**, as does Enter. Escape is the **only** cancel gesture — this
> matches legacy (M9-94). The earlier «Escape / blur without commit» phrasing
> contradicted M9-94 and is **withdrawn**.
>
> **A commit composes its payload; it never replays the pre-edit baseline.**
> `set_stock_condition` takes all four quantities plus the note, so the single
> RPC sends:
>
> - the **user's edited value** for the **actively edited key**; and
> - the **latest snapshot values** for the **other three condition keys and the
>   note**.
>
> The RPC response remains authoritative and replaces the local row. There is no
> conflict dialog: the call is last-write-wins by design, and composing the
> payload this way is what prevents it from silently reverting a concurrent
> change to a different key.

**Why the composition rule matters.** If commit resent the values captured when
editing began, a realtime change to another condition key on the same warehouse ×
item would be **overwritten** by that stale baseline — a lost update the user
never sees. Sending the latest snapshot values for the untouched keys removes
that failure mode.

Testable as:

1. edit in progress + snapshot arrives → input retained, other rows updated
   (M9-134);
2. Escape after such a refresh → the cell shows the **new** value (M9-134a);
3. commit after such a refresh → exactly **one** RPC, cell shows the server's
   returned value (M9-134b);
4. **required regression test** — realtime changes a **different** condition key
   mid-edit; on commit the one RPC carries that key's **new** value, and the
   test **fails if the pre-edit baseline is resent** (M9-134b).

Rows: M9-134, M9-134a, M9-134b. The stale-overwrite regression test is stated
**inside M9-134b** rather than as a separate row: the re-audit requires the test
to exist and be falsifiable, not a distinct ledger id, and M9-134b already
governs the commit payload it falsifies.

### D-J4 — initial-balance marker asymmetry CORRECTED — **OWNER-APPROVED**

Phase 7's write guard `isInitialBalanceLine(type, partner, channel)`
(`index.html:1926-1928`) recognises the historical marker in **partner OR
channel**:

```js
return _isInitBalType(type) && (_isInitBalPartner(partner) || _isInitBalPartner(channel));
```

The read side, `getInitialBalanceRows()` (`index.html:2001`), recognises
**partner only**:

```js
if (_isInitBalType(m.t) && _isInitBalPartner(m.p)) {
```

These are **not** the same definition. A historical row carrying the marker only
in `channel` is refused at write time for a non-admin, yet is never reconstructed
into the «Əvvələ qalıq» view — the opening lot silently disappears from the
provenance report.

Per [decision §5](../decisions/2026-09-10-phase9-design-package.md), **Phase 9
widens the read to recognise the marker in partner OR channel**, matching the
already-supported write definition. **The legacy partner-only omission is NOT
preserved** — an earlier revision of this document proposed preserving it, and
that proposal is withdrawn.

Consequence to test explicitly: a channel-only opening row **IS** reconstructed
into the opening view, and partner-marked rows behave exactly as before. This is
a **deliberate correction of a legacy defect**, not parity, and must never be
described as parity. Row: M9-84.

## 6. Decisions

| id | Question | Status |
|---|---|---|
| **Q1** | Condition WRITE path in Phase 9, or read-only first? | **OWNER-APPROVED in-phase** — [2026-09-10 decision §1](../decisions/2026-09-10-phase9-design-package.md). A read-only port would omit the screen's unique business action. |
| **Q2** | `Çap` | **ALREADY RESOLVED — not an open question.** The [2026-09-08 owner decision](../decisions/2026-09-08-print-nonfunctional-baseline.md) makes a missing, disabled or non-working `Çap` incapable of blocking any phase. M9-120/M9-121 stay **outside acceptance**; whether a dead button is rendered is presentation work, not an implementation gate. |
| **Q3** | Raw vs operational balance | **REFRAMED — no owner decision requested.** The divergence claim is withdrawn (§3.3). Q3 is now a measurement task: (1) a read-only raw-versus-operational comparison on current TEST data; (2) invariant coverage for every supported cancellation family; (3) a narrowly worded corrupt-history policy **only if** a real unequal pair is found. Rows: M9-141, M9-141a, M9-141b. |
| **Q4** | Live write policy on TEST | **One separately authorised, reversible TEST write window at the final live gate (T10).** No design or implementation step authorises a write before it. |
| **Q5** | Extend `WarehouseBalance` in place? | **Yes, but only with the expanded consumer guard** — the Phase 6 suite alone is insufficient (§5, R1). |

## 7. Risks

| id | Risk | Mitigation |
|---|---|---|
| R1 | Extending `WarehouseBalance` silently changes another screen. It is consumed by **12 files**, not just `groupFilters`: `lib/itemIndex.ts`, `lib/groupFilters.ts`(+test), `lib/opLineValidation.ts`, `lib/bulkWriteOff.test.ts`, `store/operation.store.ts`, `store/itemGroups.store.test.ts`, `pages/ItemGroupsPage.tsx`, `pages/NewOperationPage.tsx`, `components/operation/ItemStatePanel.tsx`(+test), `components/nomenclature/ItemCard.tsx` | Additive fields only, **plus focused coverage of every consumer above**, plus the full suite and `tsc --noEmit`. A Phase 6 run alone does not discharge this (Q5, M9-28) |
| R2 | FIFO opening-balance reconstruction is subtle and has no existing tests | Port as a pure module with tests written from the legacy source before the page exists |
| R3 | Condition edit races a realtime refresh mid-edit | The exact policy in **D-J3**, with its four named test cases — including the stale-overwrite regression test required by **M9-134b** |
| R4 | A historical unequal counter-row pair exists and is currently unknown | Q3's measurement task (M9-141a); a policy is written **only if** one is found |
| R5 | A failed `stock_conditions` read blanks the marker columns | All four reads fatal — declared as deviation **D-J1**, not parity |
| R6 | `__sum` mode hides that markers are per-warehouse | Port exactly: summed and non-editable |
| R7 | Export/table header drift | Both generated from `COND_COLS`, as the legacy comment at 2369-2373 insists. Note the orders genuinely differ (M9-110a, M9-111) — that is legacy behaviour, not drift |
| R8 | Capture-time server facts have drifted since 2026-09-03 | **Mandatory live read-only reconfirmation gate before implementation** (§8) |

## 7A. Mandatory pre-implementation live gate — split T0A / T0B

**No `M9-*` row may be promoted, and no implementation task may begin, until
T0A's behavioural facts are re-confirmed read-only on TEST
`alkjjbaawmsirsfvqljm`. T0B-dependent implementation or promotion additionally
requires T0B to pass.** This session had **no TEST credentials available**
(no `ANBAR_TEST_PASSWORD` in the environment), so every server statement in §3
rests on the **2026-09-03 captures**, not on current live state.

**Re-audit finding 4 corrected a false blocker here.** An earlier revision said
"no TEST password" blocked the whole gate. That is not accurate: an ordinary
authenticated PostgREST session can prove a great deal, while some of the gate
needs authority a UI password **cannot** supply at all. The gate is therefore
split, and the two halves have **different blockers**.

### T0A — behavioural checks through ordinary TEST identities

Achievable with ordinary authenticated TEST logins (admin, anbardar, rehber). No
catalog access required.

1. **Behavioural RLS matrix** — what each role actually reads from `movements`,
   `items`, `stock_conditions` and `warehouses`, including that an anbardar's
   rows are server-scoped to their own warehouse.
2. **Exposed column set** — the columns `stock_conditions` actually returns,
   including whether `icare_qty` is present and readable.
3. **The raw-versus-operational comparison (M9-141a)** — raw
   `SUM(in_qty − out_qty)` versus the operational sum, per warehouse × item,
   across the readable `movements` set. Expected **equal everywhere**; any
   unequal pair is reported with its rows.

All three checks are read-only. A refused mutation is still a mutation attempt:
the `rehber` refusal and every executable seven-/six-argument fallback probe are
therefore deferred to the separately authorised T10 window. T0A requires no
write, fixture or production contact.

### T0B — catalog authority

**Not obtainable from an ordinary TEST identity, and a TEST UI password does not
provide it.** These require an authorised Supabase catalog connection or a fresh
trusted capture:

1. the **exact `pg_policy` rows** on `stock_conditions` — that there is
   **exactly one** policy (`stock_conditions_select`) and **no**
   INSERT/UPDATE/DELETE policy;
2. the **full table and function ACLs** — the captured table entry is
   `authenticated=rDxtm/postgres`; verify the full string and, specifically,
   the absence of `a`/`w`/`d` direct DML privileges rather than calling it
   “only `r`”;
3. the **exact column definitions and constraints** — `icare_qty`
   `numeric(14,2)` NOT NULL DEFAULT 0 with its `>= 0` CHECK, and `created_at`
   `timestamptz` NOT NULL DEFAULT `now()`;
4. the **current `pg_proc` body** of `set_stock_condition` — the enforcement
   order in §3.2, especially the role gate and the anbardar warehouse check.
5. the **currently exposed PostgREST RPC signature**, obtained without invoking
   the mutation. A live TEST probe with the publishable key returned HTTP 401
   `Secret API key required`, so ordinary T0A identities must not be claimed to
   provide this metadata.

**If that authority is unavailable, it must be reported explicitly as
unavailable.** It must not be claimed as satisfied by an admin UI password, and
T0B's rows are not promoted on capture-age evidence.

The 2026-09-03 capture remains legitimate **design** evidence — this proposal is
built on it — but its **freshness is not proved until T0B**. T0A can pass while
T0B remains open; in that case only work independent of exact
policy/ACL/constraint/function-body facts may proceed. T0B-dependent
implementation and row promotion stay blocked. The live rehber read leg is a
non-blocking owner-approved scope waiver for T0A only; see
[decision](../decisions/2026-09-10-phase9-t0a-rehber-waiver.md).

## 8. Environment and containment

- Target: **TEST `alkjjbaawmsirsfvqljm`** only, via `web/.env.sandbox.local`
  (`VITE_ALLOW_LOCAL_WRITES=false`, `VITE_TEST_ENVIRONMENT=true`).
- `web/.env` targets **production `bbjmhaerssakbreykxiw`** and must not be used
  for any Phase 9 work. This is the pre-existing condition recorded in the
  Phase 8 `D5`/`Q1` finding; Phase 9 does not change it.
- No stage, commit, push, deploy, cutover or layer deactivation. The dirty
  working tree is preserved.
