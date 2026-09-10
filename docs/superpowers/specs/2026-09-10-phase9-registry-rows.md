# Phase 9 parity-registry rows — Module J ledger

> **T3 PAGE / STORE / API — 2026-09-10 (latest).** `pages/BalancesPage.tsx`,
> `store/balances.store.ts`, `api/balancesSnapshot.api.ts`,
> `api/setStockCondition.api.ts`, `components/balances/ConditionCell.tsx`,
> `lib/balanceExport.ts` and `lib/xls.ts` (M9-117/M9-119) were written by a
> separate session and then **audited row by row, not re-implemented**: the
> `bal` route was absent and is now wired (M9-01, M9-04), `BalancesPage.test.tsx`
> was absent and now carries 56 page tests including the required M9-134b
> cross-key regression, one harness defect (`xlsFallback.test.ts` reading a
> BOM through `Blob.text()`) and one lint defect (`ConditionCell` setState in
> an effect) were fixed. Promoted on that evidence: **M9-01…M9-06, M9-10…M9-18,
> M9-20, M9-36, M9-40, M9-41, M9-44, M9-46, M9-50, M9-53, M9-56…M9-58,
> M9-60…M9-64, M9-71, M9-78, M9-80…M9-83, M9-85, M9-93…M9-95, M9-98,
> M9-101…M9-107, M9-110…M9-119, M9-130…M9-136, M9-140, M9-141b, M9-143, M9-144
> and M9-146 are `CODE VERIFIED`; M9-92, M9-99, M9-100 and M9-108 are
> `IN PROGRESS`** (client half verified, server/live leg open); M9-19 stays
> `IN PROGRESS` (T0B). Not promoted: M9-109 (server audit row, Q4), M9-120 and
> M9-121 (outside acceptance), M9-141 (withdrawn), M9-142 (deferred), M9-145
> (out of scope).
> **Authoritative tally, measured mechanically from the 124 `| M9-* |` rows:
> 112 `CODE VERIFIED`, 6 `NOT STARTED`, 1 `LIVE VERIFIED` (M9-141a), 5
> `IN PROGRESS` (M9-19, M9-92, M9-99, M9-100, M9-108), 0 `BLOCKED`, 0 unclassified.**
> No row is `ACCEPTED`; Phase 9 remains **NOT ACCEPTED** — live legs (T0B, Q4/T10)
> and the independent Codex audit are still ahead.
> [Evidence](../audits/2026-09-10-phase9-t3-balances-page.md).

> **T2 «ƏVVƏLƏ QALIQ» RECONSTRUCTION — 2026-09-10 (latest).**
> `lib/initialBalance.ts` ports `index.html:1898-1952, 1959-2048, 2240-2253`:
> **M9-55, M9-70, M9-72…M9-77, M9-79, M9-79a, M9-79b and M9-84 are
> `CODE VERIFIED`; M9-71 is `IN PROGRESS`**
> — **12 rows** `CODE VERIFIED` plus **M9-71 `IN PROGRESS`** (an earlier
> "13 rows" claim is HISTORY; see the superseded-tally note below).
> M9-84 is the **owner-approved D-J4 correction** (the read now
> recognises the marker in partner OR channel), explicitly NOT byte-identical
> legacy behaviour. M9-78, M9-80…M9-83 and M9-85 are **not** promoted — they
> are `pages/BalancesPage.tsx` presentation that pure tests cannot evidence.
> **SUPERSEDED TALLY (2026-09-10):** this banner first claimed 38 / 84 / 1 / 1 / 0.
> After the Codex correction round demoted **M9-71** to `IN PROGRESS` (sorting
> verified; the `normalMovements()` operational-source clause still open), the
> tally became 37 `CODE VERIFIED`, 84 `NOT STARTED`, 1 `LIVE VERIFIED`
> (M9-141a), 2 `IN PROGRESS` (M9-19, M9-71), 0 unclassified — **HISTORY:**
> superseded by the T3 banner above. **12 rows**, not 13, are
> `CODE VERIFIED` from this slice.
> [Evidence](../audits/2026-09-10-phase9-t2-initial-balance.md).

> **M9-51 BOUNDARY CORRECTION — 2026-09-10 (Codex-found).** The wording
> `zero |q| < 1e-9` was wrong and now reads `<= 1e-9`: legacy 2327-2329 rejects
> only `< 1e-9` for `act` and only `> 1e-9` for `zero`, so exactly `q = ±1e-9`
> belongs to **both** segments. The implementation already reproduced this and
> was **not** changed; three boundary tests were added. Contract/evidence
> correction only — M9-51 stays `CODE VERIFIED` and the tally is unaffected.

> **T2 FILTERS / SORTS / KPIs — 2026-09-10.** `lib/balanceFilters.ts`
> ports `index.html:2326-2345`: **M9-51, M9-52, M9-54 and M9-61 are
> `CODE VERIFIED`**. M9-50 is **not** promoted — its debounce and paging-reset
> clauses are page concerns a pure test cannot evidence. **HISTORY —** the tally
> table was updated at that slice to **25 `CODE VERIFIED`, 97 `NOT STARTED`**.
> [Evidence](../audits/2026-09-10-phase9-t2-balance-filters.md).
> **SUPERSEDED on the tally only (2026-09-10):** the 25 / 97 figure was correct
> at that slice and is now history — as is the later 37 / 84 / 1 / 2 / 0
> (SUPERSEDED — see the T3 banner at the top of this file). The row
> promotions in this banner still stand.

> **CODEX INDEPENDENT VERIFICATION — 2026-09-10.** Codex independently
> confirmed: the `balanceRows` implementation matches legacy
> `index.html:2280-2324`; focused `balanceRows` tests **24/24**;
> `tsc -b --noEmit` clean; **124** unique ledger rows; staged files **0**;
> `git diff --check` clean. **M9-36 and M9-41 remain unpromoted.** The review
> also corrected this file's obsolete status paragraph and the interim
> 22/103 tally — see the authoritative tally below.

> **T2 BALANCE ROWS — 2026-09-10.** `lib/balanceRows.ts` implements the three
> source shapes, the no-movement catalogue rows and the display-only marker
> attachment: **M9-30…M9-35, M9-42, M9-43 and M9-45 are `CODE VERIFIED`**.
> M9-36 and M9-41 are deliberately **not** promoted — both depend on
> presentation/KPI/export code that does not exist yet. Filters, sorts and KPI
> aggregates (M9-51…M9-64) are the next slice.
> [Evidence](../audits/2026-09-10-phase9-t2-balance-rows.md).

**STATUS: T2 PURE-LOGIC IMPLEMENTATION IN PROGRESS (authoritative, 2026-09-10).**
Rows were created before implementation as
[`ANBAR_REACT_MIGRATION_PRINCIPLES.md`](../ANBAR_REACT_MIGRATION_PRINCIPLES.md)
§10 requires, but application implementation is **no longer** "not started":
T1 and part of T2 are complete.

**Authoritative tally, measured row-by-row across all 124 table rows** (not
carried forward from any earlier claim):

| Status | Rows |
|---|---|
| `CODE VERIFIED` | **112** |
| `NOT STARTED` | **6** (M9-109, M9-120, M9-121, M9-141, M9-142, M9-145) |
| `LIVE VERIFIED` | **1** (M9-141a) |
| `IN PROGRESS` | **5** (M9-19, M9-92, M9-99, M9-100, M9-108) |
| `BLOCKED` | **0** |
| unclassified | **0** |
| **total unique** | **124** |

Tally chronology, so no reader inherits a stale figure. **HISTORY —** the Codex
review measured **21 / 101 / 1 / 1 / 0** after the T1 and T2 balance-row slices,
correcting an interim chat claim of 22 / 103. **HISTORY —** the T2
filters/sorts/KPI slice then promoted M9-51, M9-52, M9-54 and M9-61, giving
**25 / 97 / 1 / 1 / 0** at that point.
The «Əvvələ qalıq» slice then promoted 13 more rows (M9-55, M9-70, M9-71,
M9-72…M9-77, M9-79, M9-79a, M9-79b, M9-84), of which **M9-71 was later demoted
to `IN PROGRESS`** by the Codex correction round, giving 37 / 84 / 1 / 2 / 0 at
that point (HISTORY). The T3 page/store/API slice then promoted the remaining
evidenced rows and closed M9-71, giving the figures in the table above —
measured mechanically from the `| M9-* |` table rows, not carried forward.

No row is `ACCEPTED`, and Phase 9 remains **NOT ACCEPTED**.

> **Superseded chronology.** This paragraph previously read: «Application
> implementation is still **NOT STARTED** … Every other row remains
> `NOT STARTED`». That was correct only before T1, and became false once
> M9-21…M9-28 (T1) and the T2 condition-rule and balance-row slices were
> promoted. It is retained here as history, not as current status. **HISTORY —**
> an interim chat summary also reported **22** `CODE VERIFIED` / **103**
> `NOT STARTED`; that tally was produced by counting every backticked status token in this
> file, so prose lines inflated it, and its parts summed to 129 rather than
> 124. The corrected figures above come from parsing table rows only and were
> independently confirmed by the Codex review.

**Revision 2 (2026-09-10)** — corrected after the independent Codex design audit
[`../audits/2026-09-10-phase9-design-codex-audit.md`](../audits/2026-09-10-phase9-design-codex-audit.md).
Changes: **M9-141 divergence claim WITHDRAWN and reframed** as a measurement
task; deviations D-J1/D-J2/D-J3/D-J4 declared; M9-84 added; M9-111 and M9-118
corrected; missing table/filter/KPI contracts added; Q2 recorded as settled.

**Revision 3 (2026-09-10)** — corrected after the independent Codex design
**re-audit** [`../audits/2026-09-10-phase9-design-codex-reaudit.md`](../audits/2026-09-10-phase9-design-codex-reaudit.md)
and the owner decision [`../decisions/2026-09-10-phase9-design-package.md`](../decisions/2026-09-10-phase9-design-package.md).
Changes: `correct_document` described correctly everywhere (it calls
`cancel_document` then `post_movement_document` — it does **not** merely append a
note marker), and M9-141b's invariant restated accordingly; Q1 and D-J1…D-J4
marked **owner-approved**; D-J3 rewritten to the approved commit-merge contract,
with the required stale-overwrite regression test stated in **M9-134b**;
**D-J4 reversed** — the
read is widened to recognise the marker in partner **or** channel, and the legacy
partner-only omission is **not** preserved; conditional **M9-141c removed** from
this authoritative ledger.

**Revision 4 (2026-09-10)** — final narrow Codex correction: T0A is strictly
read-only, so live server refusals and executable `PGRST202` probes are assigned
to the separately authorised T10 window. The captured table ACL is recorded as
`authenticated=rDxtm/postgres` with no `a`/`w`/`d` direct DML privileges; the
earlier “only `r`” shorthand is withdrawn. Row ids and count are unchanged.

**Design accepted:** [`../audits/2026-09-10-phase9-design-codex-acceptance.md`](../audits/2026-09-10-phase9-design-codex-acceptance.md).
All 124 rows were `NOT STARTED` **at that revision**; 22 have since been
promoted by T1 and T2 (see the authoritative tally at the top of this file).
Design acceptance is not Phase 9 acceptance.

**Row count: 124 unique `M9-*` rows** — 115 plain-numeric plus 9 lettered
(`M9-79a/b`, `M9-110a/b`, `M9-130a`, `M9-134a/b`, `M9-141a/b`).

Count history, so no reader inherits a stale figure: the first handoff claimed
**90** (wrong); Codex counted **112** in revision 1 (correct for that revision);
revision 2 added the rows required by audit findings 1, 2, 7, 8 and 9 and by the
Q3 reframing, giving **125** (correct for that revision); revision 3 **removes
M9-141c** (re-audit finding 5 — a conditional row must not sit in an
authoritative ledger whose exit rule requires every row to be evidenced or
excluded), giving **124**. Verified by enumerating the row ids in this file, not
carried forward from an earlier count.

**Re-audit finding 3's stale-overwrite regression test lives in M9-134b, not in
a new row.** An intermediate draft of this revision added a separate `M9-134c`
for it, which would have kept the total at 125 and contradicted the expected
124. The finding requires the **test** to exist and be falsifiable, not a
distinct ledger id, and M9-134b already governs the commit payload the test
falsifies — so the assertion is stated inside M9-134b. There is no `M9-134c`.

**M9-141c is deliberately absent.** It is created **only if** M9-141a's
measurement discovers a real unequal warehouse × item pair, and only with an
owner decision at that point. Until that trigger occurs it does not exist, and
the ledger total stays 124.

**This is the authoritative Module J («Anbar qalıqları») row-by-row ledger.** It
is linked from
[`ANBAR_FUNCTIONAL_PARITY_REGISTRY.md`](../ANBAR_FUNCTIONAL_PARITY_REGISTRY.md)
rather than duplicated there, following the Module H and Module I precedent.

Source proposal:
[`2026-09-10-react-migration-phase9-balances-proposal.md`](2026-09-10-react-migration-phase9-balances-proposal.md).
Plan: [`../plans/2026-09-10-react-migration-phase9-balances.md`](../plans/2026-09-10-react-migration-phase9-balances.md).

**Module J is ONE acceptance boundary.** No milestone is `ACCEPTED` alone, and
`ACCEPTED` additionally requires Codex's independent audit (principles §11).

**Phase 9 changes no Phase 7 or Phase 8 status.** Module H is `ACCEPTED`
(2026-09-10); Module I is `ACCEPTED` (2026-09-09), with the M8-39/M8-46 and
M8-29 exclusions intact.

Behavioural reference: `platform/index.html`; every «Old ref» is a line number
in that file. React refs are **planned locations**, not existing files, unless
the row says «reuse».

## Decision status

| id | Status |
|---|---|
| Q1 | **OWNER-APPROVED in-phase** (2026-09-10, [decision §1](../decisions/2026-09-10-phase9-design-package.md)) — the condition write path ships in Phase 9 |
| Q2 | **SETTLED, NOT OPEN** — `Çap` cannot block a phase ([2026-09-08 decision](../decisions/2026-09-08-print-nonfunctional-baseline.md)); M9-120/M9-121 outside acceptance |
| Q3 | **REFRAMED** — divergence claim withdrawn; now a measurement task (M9-141/141a/141b). **No owner decision requested unless real unequal data is found** |
| Q4 | One separately authorised reversible TEST write window at the final gate |
| Q5 | Extend `WarehouseBalance` **only** with the 12-consumer regression guard (M9-28) |

## Declared deviations from legacy

All four are **owner-approved** by the
[2026-09-10 Phase 9 design decision](../decisions/2026-09-10-phase9-design-package.md).
None is `RECOMMENDED / OWNER DECISION PENDING` any longer.

| id | Rows | Nature | Approval |
|---|---|---|---|
| **D-J1** | M9-11, M9-12, M9-13 | Fatal `stock_conditions` read — **deviation** | **OWNER-APPROVED** ([decision §2](../decisions/2026-09-10-phase9-design-package.md)) |
| **D-J2** | M9-130, M9-130a | Realtime scope — **improvement** | **OWNER-APPROVED** ([decision §3](../decisions/2026-09-10-phase9-design-package.md)) |
| **D-J3** | M9-134, M9-134a, M9-134b | Mid-edit refresh policy — **improvement** | **OWNER-APPROVED** ([decision §4](../decisions/2026-09-10-phase9-design-package.md)) |
| **D-J4** | M9-84 | Initial-balance read widened to partner **or** channel — **corrected legacy defect** | **OWNER-APPROVED** ([decision §5](../decisions/2026-09-10-phase9-design-package.md)) |

---

## A. Navigation and shell

| Row | Contract | Old ref | React ref | Roles | Status |
|---|---|---|---|---|---|
| M9-01 | Rail entry «Anbar qalıqları» is the **THIRD** entry of the `Əməliyyat` group, after «Yeni əməliyyat» and «Mal hərəkəti»; exactly one rail entry active | 254 | `App.tsx` | ungated — no id, no `display:none`, no `go()` branch | `CODE VERIFIED` — [T3 balances-page audit](../audits/2026-09-10-phase9-t3-balances-page.md) |
| M9-02 | Heading «Anbar qalıqları» and subtitle «Qalıq = mədaxil − məxaric. Dəyər son məlum vahid qiyməti əsasında hesablanır.» verbatim | 328 | `pages/BalancesPage.tsx` | all | `CODE VERIFIED` — [T3 balances-page audit](../audits/2026-09-10-phase9-t3-balances-page.md) |
| M9-03 | Header carries «Excel» then «Çap», in that order | 329 | `pages/BalancesPage.tsx` | all | `CODE VERIFIED` — [T3 balances-page audit](../audits/2026-09-10-phase9-t3-balances-page.md) |
| M9-04 | `go('bal')` has **no role gate**; every signed-in role reaches the screen. Role affects the row set (RLS) and cell editability, not access | 1495-1512 | `App.tsx` | all | `CODE VERIFIED` — [T3 balances-page audit](../audits/2026-09-10-phase9-t3-balances-page.md) |
| M9-05 | Opening the screen directly after login loads its own data | M6-S1 precedent | `pages/BalancesPage.tsx` | all | `CODE VERIFIED` — [T3 balances-page audit](../audits/2026-09-10-phase9-t3-balances-page.md) |
| M9-06 | Filter/sort/mode state survives navigation away and back (store-held) | 1894 `BF` | `store/balances.store.ts` | all | `CODE VERIFIED` — [T3 balances-page audit](../audits/2026-09-10-phase9-t3-balances-page.md) |

## B. Data snapshot and server dependencies

| Row | Contract | Old ref | React ref | Roles | Status |
|---|---|---|---|---|---|
| M9-10 | Snapshot reads exactly four tables: `movements`, `items`, `warehouses`, `stock_conditions`. No RPC | 930-975 | `api/balancesSnapshot.api.ts` | — | `CODE VERIFIED` — [T3 balances-page audit](../audits/2026-09-10-phase9-t3-balances-page.md) |
| M9-11 | **All four reads fatal — DEVIATION D-J1.** Legacy swallows a failed `stock_conditions` read (`try/catch`, `condsReady` set only inside `if (!condErr)`) and keeps working with blank markers. Phase 9 makes it fatal instead. **Must not be described as parity** | **904-923** (legacy contrast) | `api/balancesSnapshot.api.ts` | — | `CODE VERIFIED` — [T3 balances-page audit](../audits/2026-09-10-phase9-t3-balances-page.md) |
| M9-12 | A failed refresh **retains the previous snapshot whole** — rows, conditions and displayed values — and surfaces the error without blanking | M8-45 precedent | `store/balances.store.ts` | — | `CODE VERIFIED` — [T3 balances-page audit](../audits/2026-09-10-phase9-t3-balances-page.md) |
| M9-13 | A read that SUCCEEDS with zero `stock_conditions` rows is valid: markers read 0, **no error**. This is the one case where D-J1 and legacy agree | `api/stockConditions.api.ts:41-96` | reuse | — | `CODE VERIFIED` — [T3 balances-page audit](../audits/2026-09-10-phase9-t3-balances-page.md) |
| M9-14 | Both failure shapes absorbed — returned `{error}` and rejected promise | M3-06a | `api/balancesSnapshot.api.ts` | — | `CODE VERIFIED` — [T3 balances-page audit](../audits/2026-09-10-phase9-t3-balances-page.md) |
| M9-15 | `warehouses` = `active && type === 'anbar'` only; locations and deactivated rows never appear | 933 | reuse `warehouseNames()` | — | `CODE VERIFIED` — [T3 balances-page audit](../audits/2026-09-10-phase9-t3-balances-page.md) |
| M9-16 | Paged reads keep deterministic ORDER (`movements` by `date,created_at`; `stock_conditions` by `warehouse,item_code`; `items` by `code`) | A02/A11 | reuse | — | `CODE VERIFIED` — [T3 balances-page audit](../audits/2026-09-10-phase9-t3-balances-page.md) |
| M9-17 | **NO client-side warehouse scoping of rows.** An anbardar's narrowing comes from live RLS; the client renders what the server returns | D2 / M8-42 | `api/balancesSnapshot.api.ts` | anbardar | `CODE VERIFIED` — [T3 balances-page audit](../audits/2026-09-10-phase9-t3-balances-page.md) |
| M9-18 | The warehouse **filter list** is unscoped (`DB.whs` in full), matching legacy `#bf-w` | 2214 | `pages/BalancesPage.tsx` | all | `CODE VERIFIED` — [T3 balances-page audit](../audits/2026-09-10-phase9-t3-balances-page.md) |
| M9-19 | Captured server facts (schema, RPC, RLS) re-confirmed read-only on TEST **before dependent implementation begins** — mandatory split gate. Admin exposed-column read and current admin/anbardar RLS legs are live; missing rehber read is an owner-approved non-blocking scope waiver; T0B metadata remains open | proposal §7A + [T0A audit](../audits/2026-09-10-phase9-t0a-admin-and-m9-141a-live-check.md) + [decision](../decisions/2026-09-10-phase9-t0a-rehber-waiver.md) | — (server) | — | `IN PROGRESS` — **T0A passed; T0B blocking** |

## C. Current-balance computation

| Row | Contract | Old ref | React ref | Roles | Status |
|---|---|---|---|---|---|
| M9-20 | Balances derive from `operationalMovements()` only — cancelled documents and their reversals removed before arithmetic | 1249-1269, 1279 | reuse `lib/operationalMovements.ts` | — | `CODE VERIFIED` — [T3 balances-page audit](../audits/2026-09-10-phase9-t3-balances-page.md) |
| M9-21 | Row identity is warehouse × item (`w + '\|' + c`) | 1284-1286 | `lib/itemIndex.ts` | — | `CODE VERIFIED` — [T1 audit](../audits/2026-09-10-phase9-t1-balance-index.md) |
| M9-22 | `q = +(in - out).toFixed(4)` — rounding applied BEFORE any comparison, never a raw float subtraction | 1303 | reuse | — | `CODE VERIFIED` — [T1 audit](../audits/2026-09-10-phase9-t1-balance-index.md) |
| M9-23 | `price` from `items.price`, **never** a movement price | 1305 | reuse | — | `CODE VERIFIED` — [T1 audit](../audits/2026-09-10-phase9-t1-balance-index.md) |
| M9-24 | `val = q × price`; a priceless item participates at value 0 | 1306 | reuse | — | `CODE VERIFIED` — [T1 audit](../audits/2026-09-10-phase9-t1-balance-index.md) |
| M9-25 | Unknown item code renders `(nomenklaturada yoxdur: <code>)`, never blank | 1307 | reuse | — | `CODE VERIFIED` — [T1 audit](../audits/2026-09-10-phase9-t1-balance-index.md) |
| M9-26 | `last` = max movement date for that warehouse × item; `n` = movement count | 1287-1288 | `lib/itemIndex.ts` (extension) | — | `CODE VERIFIED` — [T1 audit](../audits/2026-09-10-phase9-t1-balance-index.md) |
| M9-27 | `unit` from the item record, empty when unknown | 1308 | `lib/itemIndex.ts` (extension) | — | `CODE VERIFIED` — [T1 audit](../audits/2026-09-10-phase9-t1-balance-index.md) |
| M9-28 | Extending `WarehouseBalance` with `last/first/price/val/name/unit` changes **no** existing consumer. Guard = focused coverage of **all 12 consumer files** — `lib/itemIndex.ts`, `lib/groupFilters.ts`(+test), `lib/opLineValidation.ts`, `lib/bulkWriteOff.test.ts`, `store/operation.store.ts`, `store/itemGroups.store.test.ts`, `pages/ItemGroupsPage.tsx`, `pages/NewOperationPage.tsx`, `components/operation/ItemStatePanel.tsx`(+test), `components/nomenclature/ItemCard.tsx` — **plus** the full suite and `tsc --noEmit`. **The Phase 6 suite alone is insufficient** | `lib/itemIndex.ts` | `lib/itemIndex.ts` | — | `CODE VERIFIED` — **Q5**, [T1 audit](../audits/2026-09-10-phase9-t1-balance-index.md) |

## D. Warehouse modes

| Row | Contract | Old ref | React ref | Roles | Status |
|---|---|---|---|---|---|
| M9-30 | Default «Anbarlar üzrə ayrı» (`BF.w === ''`): one row per warehouse × item | 2214, 2293 | `lib/balanceRows.ts` | all | `CODE VERIFIED` — [T2 balance-rows audit](../audits/2026-09-10-phase9-t2-balance-rows.md) |
| M9-31 | `__sum`: re-aggregated by code; `in/out/n` summed, `last` = max, then `q` and `val` **recomputed after** summing — not summed | 2281-2289 | `lib/balanceRows.ts` | all | `CODE VERIFIED` — [T2 balance-rows audit](../audits/2026-09-10-phase9-t2-balance-rows.md) |
| M9-32 | `__sum` rows carry warehouse label `bütün anbarlar` | 2285 | `lib/balanceRows.ts` | all | `CODE VERIFIED` — [T2 balance-rows audit](../audits/2026-09-10-phase9-t2-balance-rows.md) |
| M9-33 | A named warehouse filters `IX.bal` by `w` | 2290-2291 | `lib/balanceRows.ts` | all | `CODE VERIFIED` — [T2 balance-rows audit](../audits/2026-09-10-phase9-t2-balance-rows.md) |
| M9-34 | Nomenclature items with **no movement** appended in ayrı and `__sum` modes only, zeros, warehouse `bütün anbarlar` (`__sum`) or `—` (ayrı), `nomv:1` | 2296-2302 | `lib/balanceRows.ts` | all | `CODE VERIFIED` — [T2 balance-rows audit](../audits/2026-09-10-phase9-t2-balance-rows.md) |
| M9-35 | Those rows are **NOT** added when a specific warehouse is selected | 2296 | `lib/balanceRows.ts` | all | `CODE VERIFIED` — [T2 balance-rows audit](../audits/2026-09-10-phase9-t2-balance-rows.md) |
| M9-36 | A `nomv` row shows tag «hərəkət yoxdur» instead of a date | 2364 | `pages/BalancesPage.tsx` | all | `CODE VERIFIED` — [T3 balances-page audit](../audits/2026-09-10-phase9-t3-balances-page.md) |

## E. Condition markers (read side)

| Row | Contract | Old ref | React ref | Roles | Status |
|---|---|---|---|---|---|
| M9-40 | Four columns in fixed order: Yararsız · Təmirə ehtiyaclı · Sahədə · İcarədə | 2068-2073 | reuse `lib/condSplit.ts#COND_COLS` | all | `CODE VERIFIED` — [T3 balances-page audit](../audits/2026-09-10-phase9-t3-balances-page.md) |
| M9-41 | Markers are **display-only**: never alter `q`, `val`, KPIs or export balance figures | 2052-2064 | `lib/balanceRows.ts` | all | `CODE VERIFIED` — [T3 balances-page audit](../audits/2026-09-10-phase9-t3-balances-page.md) |
| M9-42 | Non-`__sum` modes attach markers by `condOf(w, c)` | 2318-2323 | `lib/balanceRows.ts` | all | `CODE VERIFIED` — [T2 balance-rows audit](../audits/2026-09-10-phase9-t2-balance-rows.md) |
| M9-43 | `__sum` sums markers across warehouses by code | 2306-2317 | `lib/balanceRows.ts` | all | `CODE VERIFIED` — [T2 balance-rows audit](../audits/2026-09-10-phase9-t2-balance-rows.md) |
| M9-44 | A marker of 0 renders a muted em-dash, not `0` | 2351 | `components/balances/ConditionCell.tsx` | all | `CODE VERIFIED` — [T3 balances-page audit](../audits/2026-09-10-phase9-t3-balances-page.md) |
| M9-45 | Markers may legitimately exceed the balance; still displayed | 2080-2082 | `lib/balanceRows.ts` | all | `CODE VERIFIED` — [T2 balance-rows audit](../audits/2026-09-10-phase9-t2-balance-rows.md) |
| M9-46 | Condition columns **hidden entirely** in the «Əvvələ qalıq» view | 2227-2229 | `pages/BalancesPage.tsx` | all | `CODE VERIFIED` — [T3 balances-page audit](../audits/2026-09-10-phase9-t3-balances-page.md) |

## F. Filters, sort, cap

| Row | Contract | Old ref | React ref | Roles | Status |
|---|---|---|---|---|---|
| M9-50 | Search matches `name + ' ' + code`, lower-cased, debounced 200 ms; resets paging | 2219, 2330 | `pages/BalancesPage.tsx` | all | `CODE VERIFIED` — search haystack, lower-casing and the 200 ms debounce proved by page test; the «resets paging» clause is **dead legacy code** — `BF.page = 0` is written at 2219-2235 and never read, the paging model is the sticky soft cap (M9-56/M9-57). [T3 balances-page audit](../audits/2026-09-10-phase9-t3-balances-page.md) |
| M9-51 | Zero-segment: `act` (default) `\|q\| ≥ 1e-9`; `all`; `neg` `q < 0`; `zero` `\|q\| <= 1e-9`. **The boundary overlaps by design:** 2327-2329 rejects only `< 1e-9` for `act` and only `> 1e-9` for `zero`, so exactly `q = ±1e-9` belongs to **both** segments | 2327-2329 | `lib/balanceFilters.ts` | all | `CODE VERIFIED` — [T2 filters/sorts/KPI audit](../audits/2026-09-10-phase9-t2-balance-filters.md) |
| M9-52 | Condition filter: all / `any` (any of four > 0) / one named key > 0 | 2331-2332 | `lib/balanceFilters.ts` | all | `CODE VERIFIED` — [T2 filters/sorts/KPI audit](../audits/2026-09-10-phase9-t2-balance-filters.md) |
| M9-53 | Condition filter control **hidden** while «Əvvələ qalıq» is active | 2229 | `pages/BalancesPage.tsx` | all | `CODE VERIFIED` — [T3 balances-page audit](../audits/2026-09-10-phase9-t3-balances-page.md) |
| M9-54 | Sorts: `val` (default), `q`, `name` (`localeCompare(…,'az')`), `last` (`dsort` desc), one per condition key | 2335-2337 | `lib/balanceFilters.ts` | all | `CODE VERIFIED` — [T2 filters/sorts/KPI audit](../audits/2026-09-10-phase9-t2-balance-filters.md) |
| M9-55 | Opening view sorts by the ACTIVE quantity column for both `val` and `q`; `name`/`last` as above; **default falls back to `name`**, not `val` | 2251-2253 | `lib/initialBalance.ts` | all | `CODE VERIFIED` — [T2 initial-balance audit](../audits/2026-09-10-phase9-t2-initial-balance.md) |
| M9-56 | Soft cap `SHOW_MAX = 3000` with «Hamısını göstər (<total>)»; absent at exactly 3000 and below | 1677-1690 | reuse `lib/showAllCut.ts` | all | `CODE VERIFIED` — [T3 balances-page audit](../audits/2026-09-10-phase9-t3-balances-page.md) |
| M9-57 | `SHOW_ALL['bal']` **sticky**: once expanded it survives filter changes | 1679-1687 | `store/balances.store.ts` | all | `CODE VERIFIED` — [T3 balances-page audit](../audits/2026-09-10-phase9-t3-balances-page.md) |
| M9-58 | Pager reads `<n> sətir` (+ cap note); opening view `<n> sətir · <modeLabel>` | 2274, 2367 | `pages/BalancesPage.tsx` | all | `CODE VERIFIED` — [T3 balances-page audit](../audits/2026-09-10-phase9-t3-balances-page.md) |

## G. KPIs

| Row | Contract | Old ref | React ref | Roles | Status |
|---|---|---|---|---|---|
| M9-60 | Current view shows **five** KPIs: Mövqe sayı · Ümumi miqdar · Ümumi dəyər · Sıfır qalıq · Mənfi qalıq | 2339-2345 | `pages/BalancesPage.tsx` | all | `CODE VERIFIED` — [T3 balances-page audit](../audits/2026-09-10-phase9-t3-balances-page.md) |
| M9-61 | KPIs computed from the **complete filtered set**, not the capped page | 2338, 2346 | `lib/balanceFilters.ts` | all | `CODE VERIFIED` — [T2 filters/sorts/KPI audit](../audits/2026-09-10-phase9-t2-balance-filters.md) |
| M9-62 | «Mövqe sayı» subtitle `mal üzrə cəmi` in `__sum`, else `anbar × mal sətri` | 2340 | `pages/BalancesPage.tsx` | all | `CODE VERIFIED` — [T3 balances-page audit](../audits/2026-09-10-phase9-t3-balances-page.md) |
| M9-63 | «Ümumi dəyər» class `g`; «Mənfi qalıq» class `r` when any row negative, else `g` | 2342-2344 | `pages/BalancesPage.tsx` | all | `CODE VERIFIED` — [T3 balances-page audit](../audits/2026-09-10-phase9-t3-balances-page.md) |
| M9-64 | Current-view KPI values: count `nf(rows.length)`; «Ümumi miqdar» `nf(qty,2)` subtitle «ölçü vahidləri qarışıqdır»; «Ümumi dəyər» `money(val)` subtitle «son qiymətlərlə»; «Sıfır qalıq» count of `\|q\|<1e-9` subtitle «bu filtrdə»; «Mənfi qalıq» count of `q<0` subtitle «uçot xətası riski» | 2339-2345 | `pages/BalancesPage.tsx` | all | `CODE VERIFIED` — [T3 balances-page audit](../audits/2026-09-10-phase9-t3-balances-page.md) |

## H. «Əvvələ qalıq» view

| Row | Contract | Old ref | React ref | Roles | Status |
|---|---|---|---|---|---|
| M9-70 | **Base/legacy recognition rule.** Opening rows require type strictly `Əvvələ qalıq` (NFKC+trim+lowercase, **no ğ/q folding**) AND the marker in one of the three accepted spellings (**with ğ/q folding**). Legacy read (2001) tested the **partner field only**; **for Phase 9 the marker FIELD SET is governed by M9-84 (owner-approved D-J4): partner OR channel.** This row is authoritative for the type/spelling normalisation; M9-84 is authoritative for which field carries the marker | 1898-1916 | `lib/initialBalance.ts` | — | `CODE VERIFIED` — [T2 initial-balance audit](../audits/2026-09-10-phase9-t2-initial-balance.md) |
| M9-71 | Source `normalMovements()`, sorted by date, then transfer-OUT legs before other same-date rows, then `ts` | 1992-1998 | `lib/initialBalance.ts` | — | `CODE VERIFIED` — sorting clause per the [T2 initial-balance audit](../audits/2026-09-10-phase9-t2-initial-balance.md); the `normalMovements()` operational-source clause **closed**: `BalancesPage` feeds `indexes.operational` (the store derives it through `excludeCancelled()`), and the page test proves a cancelled opening document reconstructs no row. [T3 balances-page audit](../audits/2026-09-10-phase9-t3-balances-page.md) |
| M9-72 | FIFO: outbound consumes lots oldest-first; only `opening`-origin consumption counts toward provenance | 1959-1974 | `lib/initialBalance.ts` | — | `CODE VERIFIED` — [T2 initial-balance audit](../audits/2026-09-10-phase9-t2-initial-balance.md) |
| M9-73 | A transfer MOVES an opening layer between warehouses without creating a new `initial_qty`; the destination appears in «Cari qalıq» only | 2026-2037 | `lib/initialBalance.ts` | — | `CODE VERIFIED` — [T2 initial-balance audit](../audits/2026-09-10-phase9-t2-initial-balance.md) |
| M9-74 | Transfer legs pair by `doc\|<doc>\|<code>`, or for document-less legacy imports by `legacy\|<date>\|<code>\|<from>\|<to>` | 1945-1952 | `lib/initialBalance.ts` | — | `CODE VERIFIED` — [T2 initial-balance audit](../audits/2026-09-10-phase9-t2-initial-balance.md) |
| M9-75 | Counterparty warehouse recovered by stripping the ` anbar…` suffix and resolving to the canonical `DB.whs` spelling | 1935-1944 | `lib/initialBalance.ts` | — | `CODE VERIFIED` — [T2 initial-balance audit](../audits/2026-09-10-phase9-t2-initial-balance.md) |
| M9-76 | `opening_date` is the EARLIEST opening date; `last` raised from `IX.bal.last` when later | 2011-2012, 2044-2048 | `lib/initialBalance.ts` | — | `CODE VERIFIED` — [T2 initial-balance audit](../audits/2026-09-10-phase9-t2-initial-balance.md) |
| M9-77 | «İlkin miqdar» (default) filters `initial_qty > 1e-9`; «Cari qalıq» filters `current_qty > 1e-9` | 2244-2245 | `lib/initialBalance.ts` | all | `CODE VERIFIED` — [T2 initial-balance audit](../audits/2026-09-10-phase9-t2-initial-balance.md) |
| M9-78 | The quantity column header equals the active mode label | 2250, 2268 | `pages/BalancesPage.tsx` | all | `CODE VERIFIED` — [T3 balances-page audit](../audits/2026-09-10-phase9-t3-balances-page.md) |
| M9-79 | `__sum` does **not** merge warehouses here; treated as "no warehouse filter" (`wSel = ''`) | 2240 | `lib/initialBalance.ts` | all | `CODE VERIFIED` — [T2 initial-balance audit](../audits/2026-09-10-phase9-t2-initial-balance.md) |
| M9-79a | A **named** warehouse filters opening rows by `b.w === wSel`; the nomenclature/no-movement augmentation of the current view does **not** apply here | 2240-2243 | `lib/initialBalance.ts` | all | `CODE VERIFIED` — [T2 initial-balance audit](../audits/2026-09-10-phase9-t2-initial-balance.md) |
| M9-79b | Opening-view **search** matches `name + ' ' + code` lower-cased, the same haystack as the current view, and is applied before the mode filter | 2242 | `lib/initialBalance.ts` | all | `CODE VERIFIED` — **matching rule unit-tested; predicate ORDER verified by direct code/source comparison only, NOT behaviourally proved.** Search, warehouse and quantity are pure commuting predicates, so any execution order yields the same final array; ordering cannot be falsified from outputs. [T2 initial-balance audit](../audits/2026-09-10-phase9-t2-initial-balance.md) |
| M9-80 | Table columns, in order: Kod · Malın adı · Anbar · Ölçü · `<modeLabel>` · İlk mənbə anbar · Əvvələ qalıq tarixi · Son hərəkət | 2268 | `pages/BalancesPage.tsx` | all | `CODE VERIFIED` — [T3 balances-page audit](../audits/2026-09-10-phase9-t3-balances-page.md) |
| M9-81 | Missing `opening_warehouse`/`opening_date`/`last` render `—`; dates through `fmtD` | 2272 | `pages/BalancesPage.tsx` | all | `CODE VERIFIED` — [T3 balances-page audit](../audits/2026-09-10-phase9-t3-balances-page.md) |
| M9-82 | **Three distinct empty states** in order: no opening rows at all; «Cari qalıq» with none; filtered-to-nothing | 2261-2265 | `pages/BalancesPage.tsx` | all | `CODE VERIFIED` — [T3 balances-page audit](../audits/2026-09-10-phase9-t3-balances-page.md) |
| M9-83 | Negative quantities render with the `neg` class | 2271 | `pages/BalancesPage.tsx` | all | `CODE VERIFIED` — [T3 balances-page audit](../audits/2026-09-10-phase9-t3-balances-page.md) |
| M9-84 | **DEVIATION D-J4 — marker asymmetry CORRECTED (owner-approved).** Legacy is asymmetric: `isInitialBalanceLine()` (write guard, 1926-1928) recognises the marker in partner **OR channel**, while `getInitialBalanceRows()` (read, 2001) recognises **partner only** — so a channel-only historical row is refused at write for a non-admin yet never reconstructed in the «Əvvələ qalıq» view. Per the [2026-09-10 owner decision §5](../decisions/2026-09-10-phase9-design-package.md), Phase 9 **widens the read to recognise the marker in partner OR channel**, matching the already-supported write definition. **The legacy partner-only omission is NOT preserved.** A test must prove a channel-only opening row **IS** reconstructed, and that partner-marked rows behave exactly as before (no regression) | 1926-1928 vs 2001 | `lib/initialBalance.ts` | admin | `CODE VERIFIED` — **owner-approved correction (D-J4)**, [T2 initial-balance audit](../audits/2026-09-10-phase9-t2-initial-balance.md) |
| M9-85 | Opening-view KPIs are **four**: «Mövqe sayı» `nf(filtered.length)` subtitle = selected warehouse or «bütün anbarlar»; «Ümumi miqdar» `nf(totQty,2)` subtitle `<modeLabel> · ölçü vahidləri qarışıqdır`; «Ümumi dəyər» **always `money(0)` → «—»** subtitle «bu görünüşdə hesablanmır»; «Sıfır qalıq» count of `\|qty\|<1e-9` subtitle «bu filtrdə». **No «Mənfi qalıq» KPI in this view**, and no KPI carries a colour class | 2255-2260 | `pages/BalancesPage.tsx` | all | `CODE VERIFIED` — [T3 balances-page audit](../audits/2026-09-10-phase9-t3-balances-page.md) |

## I. Condition write path (Q1 — approved in-phase)

| Row | Contract | Old ref | React ref | Roles | Status |
|---|---|---|---|---|---|
| M9-90 | `canEditCond(w)` false when conditions not loaded, and for warehouse `bütün anbarlar` or `—` | 2148-2149 | `lib/canEditCond.ts` | all | `CODE VERIFIED` — [T2 audit](../audits/2026-09-10-phase9-t2-condition-pure-rules.md) |
| M9-91 | Admin may edit any warehouse; anbardar only their own; **`rehber` may not edit** | 2150-2151 | `lib/canEditCond.ts` | admin/anbardar/rehber | `CODE VERIFIED` — [T2 audit](../audits/2026-09-10-phase9-t2-condition-pure-rules.md) |
| M9-92 | The UI check is convenience only — the binding refusal is server-side in `set_stock_condition`; the live refusal call belongs to the separately authorised T10 window, not read-only T0A | 2061-2064 + live RPC at T10 | `api/setStockCondition.api.ts` | all | `IN PROGRESS` — the UI convenience gate is `CODE VERIFIED` (`canEditCond` + page role tests, [T3 balances-page audit](../audits/2026-09-10-phase9-t3-balances-page.md)); **the binding server-side refusal remains the Q4/T10 live leg** |
| M9-93 | A user without edit rights sees the same numbers as plain text | 2347-2354 | `components/balances/ConditionCell.tsx` | rehber | `CODE VERIFIED` — [T3 balances-page audit](../audits/2026-09-10-phase9-t3-balances-page.md) |
| M9-94 | Inline editor: `number`, `min=0`, `step=0.01`, pre-filled only when > 0; Enter/blur commits, Escape cancels | 2384-2398 | `components/balances/ConditionCell.tsx` | admin/anbardar | `CODE VERIFIED` — [T3 balances-page audit](../audits/2026-09-10-phase9-t3-balances-page.md) |
| M9-95 | Clicking a condition cell does **not** open the item card (`stopPropagation`) | 2366, 2392 | `components/balances/ConditionCell.tsx` | all | `CODE VERIFIED` — [T3 balances-page audit](../audits/2026-09-10-phase9-t3-balances-page.md) |
| M9-96 | Input normalisation: trim, comma→dot, empty→0; non-finite or negative → «Miqdar mənfi olmayan düzgün ədəd olmalıdır» and NO RPC | 2156-2158 | `lib/condInput.ts` | admin/anbardar | `CODE VERIFIED` — [T2 audit](../audits/2026-09-10-phase9-t2-condition-pure-rules.md) |
| M9-97 | Value rounded to 2 decimals client-side before sending | 2159 | `lib/condInput.ts` | admin/anbardar | `CODE VERIFIED` — [T2 audit](../audits/2026-09-10-phase9-t2-condition-pure-rules.md) |
| M9-98 | **All four quantities plus the existing note sent every time**, so a concurrent partial edit cannot write an inconsistent row | 2153-2162 | `api/setStockCondition.api.ts` | admin/anbardar | `CODE VERIFIED` — [T3 balances-page audit](../audits/2026-09-10-phase9-t3-balances-page.md) |
| M9-99 | On `PGRST202` the call retries with the pre-031 six-argument signature; T0B verifies the exposed signature without invocation, while any executable live fallback probe belongs to T10 | 2163-2183 | `api/setStockCondition.api.ts` | admin/anbardar | `IN PROGRESS` — the client PGRST202 six-argument retry is `CODE VERIFIED` (api test, [T3 balances-page audit](../audits/2026-09-10-phase9-t3-balances-page.md)); **T0B verification of the exposed signature still open** |
| M9-100 | On `PGRST202` for the `icare` key: no retry, message «İcarə sütunu bazada yoxdur — sql/031 hələ tətbiq edilməyib», sync set to failed; any executable live probe belongs to T10 | 2176-2181 | `api/setStockCondition.api.ts` | admin/anbardar | `IN PROGRESS` — the client branch is `CODE VERIFIED`: no retry for the `icare` key, the exact message verbatim, sync set to failed (api + page tests, [T3 balances-page audit](../audits/2026-09-10-phase9-t3-balances-page.md)); **the executable live probe belongs to T10** |
| M9-101 | Response `action === 'DELETE'` (or empty) removes the local entry; otherwise the map is replaced from the returned row | 2185-2194 | `store/balances.store.ts` | admin/anbardar | `CODE VERIFIED` — [T3 balances-page audit](../audits/2026-09-10-phase9-t3-balances-page.md) |
| M9-102 | `exceeds_balance: true` → warning toast «Diqqət: işarələnmiş miqdar qalıqdan (<balance>) çoxdur»; **the write still succeeds** | 2196-2198 | `pages/BalancesPage.tsx` | admin/anbardar | `CODE VERIFIED` — [T3 balances-page audit](../audits/2026-09-10-phase9-t3-balances-page.md) |
| M9-103 | Otherwise success toast «Vəziyyət yeniləndi» | 2199 | `pages/BalancesPage.tsx` | admin/anbardar | `CODE VERIFIED` — [T3 balances-page audit](../audits/2026-09-10-phase9-t3-balances-page.md) |
| M9-104 | On error: `Xəta: <message>`, sync failed, **cell reverts to the previous value** | 2201-2205 | `components/balances/ConditionCell.tsx` | admin/anbardar | `CODE VERIFIED` — [T3 balances-page audit](../audits/2026-09-10-phase9-t3-balances-page.md) |
| M9-105 | The table always re-renders from the server-confirmed value; an optimistic value is never left on screen | 2380-2383 | `store/balances.store.ts` | admin/anbardar | `CODE VERIFIED` — [T3 balances-page audit](../audits/2026-09-10-phase9-t3-balances-page.md) |
| M9-106 | The RPC is the ONLY application write; no direct PostgREST write to `stock_conditions` is attempted. The captured ACL is `authenticated=rDxtm/postgres` (not “only `r`”) and lacks `a`/`w`/`d`; no write policy exists | 2061-2064 + captured policies/ACL | `api/setStockCondition.api.ts` | all | `CODE VERIFIED` — client half: every call is the `set_stock_condition` RPC and no direct table write exists (api test); metadata half: the captured ACL `authenticated=rDxtm/postgres` (no `a`/`w`/`d`) and the single SELECT policy, proposal §3.1. [T3 balances-page audit](../audits/2026-09-10-phase9-t3-balances-page.md) |
| M9-107 | The write goes through `lib/mutationGuard.ts`, so `VITE_ALLOW_LOCAL_WRITES=false` blocks it on localhost | reuse | `api/setStockCondition.api.ts` | all | `CODE VERIFIED` — [T3 balances-page audit](../audits/2026-09-10-phase9-t3-balances-page.md) |
| M9-108 | Server refusals surface their exact Azerbaijani text (session, inactive profile, role, warehouse, inactive warehouse, unknown item, NaN, negative, too large) | live RPC body | `pages/BalancesPage.tsx` | all | `IN PROGRESS` — the client surfaces the server text verbatim behind the legacy «Xəta: » prefix (api + page tests, [T3 balances-page audit](../audits/2026-09-10-phase9-t3-balances-page.md)); **the nine Azerbaijani refusal texts are a live RPC-body leg (Q4)** |
| M9-109 | A successful write produces an `audit_log` row written **by the server**; the browser writes no audit row | live RPC body | — (server) | — | `NOT STARTED` — **Q4** |

## J. Export

| Row | Contract | Old ref | React ref | Roles | Status |
|---|---|---|---|---|---|
| M9-110 | Current-view export header, 14 columns: `Anbar · Kod · Malın adı · Ölçü · Mədaxil · Məxaric · Qalıq` + the four `COND_COLS` titles **generated from the array** + `Vahid qiyməti · Dəyər · Son hərəkət` | 2374-2377 | `lib/balanceExport.ts` | all | `CODE VERIFIED` — [T3 balances-page audit](../audits/2026-09-10-phase9-t3-balances-page.md) |
| M9-110a | **Current-view TABLE column order differs from the export order** and both are ported as-is: the table begins `Kod · Malın adı · Anbar · Ölçü`, the export begins `Anbar · Kod · Malın adı · Ölçü`. Same 14 fields, different first three. Legacy behaviour, not drift | 2357 vs 2374 | `pages/BalancesPage.tsx` / `lib/balanceExport.ts` | all | `CODE VERIFIED` — [T3 balances-page audit](../audits/2026-09-10-phase9-t3-balances-page.md) |
| M9-110b | Current-table cell formatting: code in `.code` span; name in `.nm` div; warehouse through `whLabel()`; `Mədaxil`/`Məxaric` `nf(_,2)`; `Qalıq` bold with `neg` class when `q < 0`; price `nf(price,2)` or muted `—` when falsy; `Dəyər` `money(val)`; last column the `hərəkət yoxdur` tag for `nomv` rows else `fmtD(last)` | 2361-2364 | `pages/BalancesPage.tsx` | all | `CODE VERIFIED` — [T3 balances-page audit](../audits/2026-09-10-phase9-t3-balances-page.md) |
| M9-111 | Opening-view export header, 8 columns: `Anbar · Kod · Malın adı · Ölçü · <modeLabel> · İlk mənbə anbar · Əvvələ qalıq tarixi · Son hərəkət`. **This is NOT the table's order** — the table begins `Kod · Malın adı · Anbar` (M9-80). Same eight fields, different first three; both ported as-is | 2276 vs 2268 | `lib/balanceExport.ts` | all | `CODE VERIFIED` — [T3 balances-page audit](../audits/2026-09-10-phase9-t3-balances-page.md) |
| M9-112 | Export covers the **full filtered set**, never the 3000-row page | 2374-2377 | `lib/balanceExport.ts` | all | `CODE VERIFIED` — [T3 balances-page audit](../audits/2026-09-10-phase9-t3-balances-page.md) |
| M9-113 | Warehouse cells pass through `whLabel()` (display alias in the file, agreed 2026-08-25), including `opening_warehouse` | 2277, 2375 | `lib/balanceExport.ts` | all | `CODE VERIFIED` — [T3 balances-page audit](../audits/2026-09-10-phase9-t3-balances-page.md) |
| M9-114 | A priceless row exports an empty price cell (`b.price \|\| ''`), not 0 | 2377 | `lib/balanceExport.ts` | all | `CODE VERIFIED` — [T3 balances-page audit](../audits/2026-09-10-phase9-t3-balances-page.md) |
| M9-115 | `Dəyər` exports as `val.toFixed(2)` | 2377 | `lib/balanceExport.ts` | all | `CODE VERIFIED` — [T3 balances-page audit](../audits/2026-09-10-phase9-t3-balances-page.md) |
| M9-116 | Date cells export the **raw ISO** value, not `fmtD` | 2277, 2377 | `lib/balanceExport.ts` | all | `CODE VERIFIED` — [T3 balances-page audit](../audits/2026-09-10-phase9-t3-balances-page.md) |
| M9-117 | Filename `anbar_qaliqlari_<YYYY-MM-DD>.xlsx`, sheet «Hesabat»; autofilter, frozen header row, computed widths (8..55), numeric coercion via `toNum` for non-header cells | 1219-1235 | `lib/xls.ts` | all | `CODE VERIFIED` — [T3 balances-page audit](../audits/2026-09-10-phase9-t3-balances-page.md) |
| M9-118 | Export is available to every role and contains **the complete filtered UI dataset built from the RLS-scoped snapshot** — which is not identical to "the rows RLS returned": the screen aggregates movements into warehouse × item rows and may append nomenclature items that have no movement at all (M9-34) | 2374 | `pages/BalancesPage.tsx` | all | `CODE VERIFIED` — [T3 balances-page audit](../audits/2026-09-10-phase9-t3-balances-page.md) |
| M9-119 | Missing XLSX library falls back to CSV with a toast | 1220 | `lib/xls.ts` | all | `CODE VERIFIED` — [T3 balances-page audit](../audits/2026-09-10-phase9-t3-balances-page.md) |

## K. Print — outside acceptance (Q2 settled)

| Row | Contract | Old ref | React ref | Roles | Status |
|---|---|---|---|---|---|
| M9-120 | Current view: `printHead('Anbar qalıqları', <scope> · <n> mövqe)` then `window.print()` after 60 ms | 2368 | `pages/BalancesPage.tsx` | all | `NOT STARTED` — **outside acceptance**; a missing or dead `Çap` cannot block Phase 9 |
| M9-121 | Opening view: title `Anbar qalıqları — Əvvələ qalıq (<modeLabel>)` | 2275 | `pages/BalancesPage.tsx` | all | `NOT STARTED` — **outside acceptance** |

## L. Realtime, concurrency, failure

| Row | Contract | Old ref | React ref | Roles | Status |
|---|---|---|---|---|---|
| M9-130 | Realtime watches exactly the tables this screen reads: `movements`, `items`, `warehouses`, `stock_conditions`. **`audit_log` is never subscribed** (Phase 4 Q3) | 1163-1181 | `pages/BalancesPage.tsx` | all | `CODE VERIFIED` — [T3 balances-page audit](../audits/2026-09-10-phase9-t3-balances-page.md) |
| M9-130a | **IMPROVEMENT D-J2 — realtime scope departs from legacy.** Legacy subscribes exactly `['movements','items','partners','warehouses']` (1174): one global channel for every screen, so it carries `partners` (unread here) and omits `stock_conditions` (a marker changed by another user does **not** refresh the legacy balance screen). Phase 9 **adds `stock_conditions` and drops `partners`**. Must be regression-tested and **must not be described as parity** | **1174** | `pages/BalancesPage.tsx` | all | `CODE VERIFIED` — [T3 balances-page audit](../audits/2026-09-10-phase9-t3-balances-page.md) |
| M9-131 | One channel, one subscription, 400 ms debounce, torn down on unmount | reuse | `hooks/useRealtimeRefresh.ts` | all | `CODE VERIFIED` — [T3 balances-page audit](../audits/2026-09-10-phase9-t3-balances-page.md) |
| M9-132 | Subscription status drives the sync indicator (SUBSCRIBED → synced; CHANNEL_ERROR/TIMED_OUT → error) | 1177-1180 | reuse | all | `CODE VERIFIED` — [T3 balances-page audit](../audits/2026-09-10-phase9-t3-balances-page.md) |
| M9-133 | Out-of-order snapshot responses cannot regress the view — monotonic request sequencing | M8-44 precedent | `store/balances.store.ts` | all | `CODE VERIFIED` — [T3 balances-page audit](../audits/2026-09-10-phase9-t3-balances-page.md) |
| M9-134 | **IMPROVEMENT D-J3 — mid-edit refresh.** Legacy holds the editor in transient DOM and `rBal()` replaces the table wholesale, so a realtime `renderAll()` **can** discard an in-progress input. Phase 9 defers the refresh **for the editing cell only**: the snapshot is applied to the store, the rest of the table re-renders, and that one cell keeps the user's uncommitted input plus its pre-edit baseline. **Not parity** | 2380-2410 (legacy contrast) | `components/balances/ConditionCell.tsx` | admin/anbardar | `CODE VERIFIED` — [T3 balances-page audit](../audits/2026-09-10-phase9-t3-balances-page.md) |
| M9-134a | **Escape after a mid-edit refresh CANCELS** the edit and adopts the **latest** snapshot value for that cell, never the stale pre-edit one. **Escape is the only cancel gesture; blur commits** (M9-94) — the earlier «Escape / blur without commit» wording contradicted M9-94 and is withdrawn | D-J3 | `components/balances/ConditionCell.tsx` | admin/anbardar | `CODE VERIFIED` — [T3 balances-page audit](../audits/2026-09-10-phase9-t3-balances-page.md) |
| M9-134b | **Commit after a mid-edit refresh** (Enter **or blur**) sends exactly one RPC and the returned row is authoritative — no extra conflict dialog. The commit payload is **composed**, not replayed: the user's edited value for the **actively edited key**, and the **latest snapshot values** for the other three condition keys and the note. The pre-edit baseline is **never** resent for untouched keys. **Required falsifiable regression test (re-audit finding 3):** while one key is being edited, a realtime refresh changes a **different** condition key on the same warehouse × item; the single commit RPC must carry that other key's **new** value, and the test **fails if the pre-edit baseline is resent** — proving a realtime change to another key is not overwritten | D-J3 + live RPC | `api/setStockCondition.api.ts` + `components/balances/ConditionCell.tsx` | admin/anbardar | `CODE VERIFIED` — [T3 balances-page audit](../audits/2026-09-10-phase9-t3-balances-page.md) |
| M9-135 | Duplicate submit of the same condition edit is prevented (the `done` latch) | 2393-2394 | `components/balances/ConditionCell.tsx` | admin/anbardar | `CODE VERIFIED` — [T3 balances-page audit](../audits/2026-09-10-phase9-t3-balances-page.md) |
| M9-136 | Loading, empty, error and permission states each distinguishable; a genuine empty result is never presented as an error, and an error is never presented as «sıfır qalıq» | 2831 | `pages/BalancesPage.tsx` | all | `CODE VERIFIED` — [T3 balances-page audit](../audits/2026-09-10-phase9-t3-balances-page.md) |

## M. Cross-screen and known divergences

| Row | Contract | Old ref | React ref | Roles | Status |
|---|---|---|---|---|---|
| M9-140 | Clicking a row opens the item-card drawer via `data-card` | 2273, 2365 | `pages/BalancesPage.tsx` | all | `CODE VERIFIED` — [T3 balances-page audit](../audits/2026-09-10-phase9-t3-balances-page.md) |
| M9-141 | **RAW vs OPERATIONAL BALANCE — earlier divergence claim WITHDRAWN.** `stock_condition_balance()` sums all `movements`; the screen sums `operationalMovements()`. **A different row set does not imply a different number.** Every supported cancellation path inserts an exact inverse row — `cancel_legacy_movement` (`out_qty,in_qty` swapped into the insert), `cancel_legacy_transfer` (exact-quantity leg match), `cancel_document` (`in>0 → (0,in)`, `out>0 → (out,0)`), `cancel_transfer_document` (same, both legs), `cancel_layer_transfer_document` (`SUM(out−in)`) — so source + counter sum to zero raw, and `excludeCancelled()` removes both, also zero. **`correct_document` is not a note-marker append**: it calls `cancel_document(v_doc, p_reversal_date)` and then `post_movement_document(v_lines, NULL)`, so a correction is *the cancellation pair (net zero) plus a **replacement document** that is present in **both** the raw and the operational sets*. The note marker (`'Əvəz edir: ' \|\| v_doc`) decorates the replacement's lines and carries no quantity. **Balances are algebraically equal on all supported histories.** No owner decision is requested | live SQL vs 1279 | — | — | `NOT STARTED` — claim withdrawn |
| M9-141a | **Measurement (read-only).** Compare raw `SUM(in_qty − out_qty)` against the operational sum per warehouse × item across the whole TEST `movements` table. **LIVE 2026-09-10:** independently reconstructed 127 raw → 3 operational rows; 3 warehouse × item keys; 0 unequal. No M9-141c created | [T0A audit](../audits/2026-09-10-phase9-t0a-admin-and-m9-141a-live-check.md) | — (server, read-only) | — | `LIVE VERIFIED` |
| M9-141b | **Invariant coverage.** Unit tests prove net-zero for every supported cancellation family (legacy row, legacy transfer pair, whole document, transfer document, layer transfer). **The `correct_document` case models the cancellation pair plus the surviving replacement**, not a note append: given an original document, its `cancel_document` reversal and the replacement posted by `post_movement_document`, the raw sum and the `excludeCancelled()` sum must be **equal** — the original and its reversal cancel to zero in both, and the replacement document survives in both. The test fails if the replacement is treated as cancelled or the pair is treated as unbalanced | live SQL bodies | `lib/operationalMovements.test.ts` | — | `CODE VERIFIED` — [T3 balances-page audit](../audits/2026-09-10-phase9-t3-balances-page.md) |
| M9-142 | `nf()`'s az-AZ separators remain deferred visual item **V-01**; Module J inherits it and creates no new question | 594-598 | reuse `lib/format.ts` | — | `NOT STARTED` — deferred |
| M9-143 | `whLabel` alias `Xocahəsən → Xocəsən` is display-only; stored values, keys and RLS scope keep the real name | 584-593 | reuse `lib/movementRoute.ts` | — | `CODE VERIFIED` — [T3 balances-page audit](../audits/2026-09-10-phase9-t3-balances-page.md) |
| M9-144 | `money(0)` renders «—», not `0,00 ₼` | 599 | reuse `lib/format.ts` | — | `CODE VERIFIED` — [T3 balances-page audit](../audits/2026-09-10-phase9-t3-balances-page.md) |
| M9-145 | `rAnb` and the `dead` report also consume `IX.bal`; Phase 9 must not change their inputs. Both stay unmigrated | 2900-2916, 407 | — | — | `NOT STARTED` — out of scope |
| M9-146 | This screen never reads `stock_layers`; no layer deactivation and no cutover occur in Phase 9 | — | — | — | `CODE VERIFIED` — the snapshot issues exactly the four reads and nothing else (no `stock_layers`), api test; no layer deactivation or cutover was performed in Phase 9. [T3 balances-page audit](../audits/2026-09-10-phase9-t3-balances-page.md) |
