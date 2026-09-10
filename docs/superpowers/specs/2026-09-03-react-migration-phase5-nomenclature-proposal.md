# Phase 5 proposal — Nomenklatura, FULL parity, Module F

**Status: APPROVED SCOPE — IMPLEMENTED 2026-09-03, Codex-audited the same day
(verdict CHANGES REQUIRED), all fourteen findings remediated 2026-09-03.
`CODE VERIFIED`, awaiting the Codex re-audit and any live verification.**
Revised 2026-09-03. (This line previously read «awaiting implementation» long
after the code existed — audit finding §1.)

Implementation record: [`../plans/2026-09-03-react-migration-phase5-nomenclature.md`](../plans/2026-09-03-react-migration-phase5-nomenclature.md)
· audit: [`../audits/2026-09-03-phase5-codex-audit.md`](../audits/2026-09-03-phase5-codex-audit.md)
· per-row evidence: registry Module F.
Governed by [`ANBAR_REACT_MIGRATION_PRINCIPLES.md`](../ANBAR_REACT_MIGRATION_PRINCIPLES.md)
and the [parity registry](../ANBAR_FUNCTIONAL_PARITY_REGISTRY.md).
Behavioural reference: `origin/main:index.html`. Line numbers below are that file.

Phase 4 (Module E) is `ACCEPTED`; its deferred populated-data live check remains
a standing item and is **not** reopened or discharged here.

## 0. Revision note — read this first

The first draft of this proposal scoped Phase 5 as a **read-only slice** and
excluded every write path under a deviation `D-F1`.

**The user rejected that scope on 2026-09-03.** A read-only slice cannot pass
live verification, because live verification covers *every function of the
Nomenklatura screen*. **`D-F1` is removed** and does not exist as a deviation.
Phase 5 now delivers **full functional parity** for the legacy `nom` screen.

**Decisions recorded as APPROVED by the user in the same instruction:**

| Q | Decision | Effect |
|---|---|---|
| **Q1** | **Option (c) approved** — read `movements` filtered to the columns the index needs, derive client-side. No SQL change; arithmetic identical to the original | Sets the precedent for every later data-heavy module |
| **Q2** | **Superseded — Excel export is IN scope**, matching the legacy output | SheetJS is required (also for `.xlsx` *import*) |
| **Q3** | **Approved** — keep «Hamısını göstər» exactly as-is (`SHOW_MAX = 3000`, sticky flag) | Parity over internal consistency |
| **Q4** | **Approved** — port `nf`/`money` verbatim; V-01 stays deferred and Module F inherits the same question | The final visual review settles both |

## 1. Scope — the whole `nom` screen

Everything reachable from the legacy Nomenklatura screen is in scope:

**Read:** list, search, all four filters, balances, values, movement counts,
duplicate-name logic, formatting, print, and the 3000-row
«Hamısını göstər» behaviour.
**Export:** Excel export matching the legacy output (2452 via `xls()`, 1219).
**Write:** create item · edit item · bulk item creation · item import ·
category import.
**Navigation:** the item-card drill-down and every transition available from it.
**Permissions:** role-based availability *and* server-refusal handling exactly
as in the legacy platform.

### Explicitly separate phases, not part of Phase 5

`Nomenklatura sorğuları` (`nreq`, nav 257 — separate `item_requests` table,
SQL 017) and `Mal qrupları` (`grp`, nav 258) are **separate screens** and will
be planned as their own full phases. They are not partial gaps in Phase 5.

## 2. Verified facts

Each checked against source this session, not assumed.

### Entity and schema — VERIFIED
`items` is in the generated `web/src/types/database.ts` (328-370): `code`
(PK, `string`), `name` (`string`), and **nullable** `unit`, `price`,
`category`, `price_source`, `created_by`, `created_at`, `updated_at`.
No regeneration needed. **Every display column except `code`/`name` is
nullable** — the same trap Phase 4 hit with `audit_log`.

`movements` is present (372+) with `item_code`, `in_qty`, `out_qty`, `price`,
`date`, `note`, `doc_num`, `type`, `warehouse` — all quantity columns nullable.

**Both write RPCs exist in the generated types** (no regeneration, no SQL
change): `import_new_items(p_items Json) → Json` (1443) and
`set_item_categories(p_mappings Json) → Json` (1537).

### List screen — VERIFIED (`rNom`, 2413-2461)
- **Columns:** Kod, Malın adı, Ölçü, Son qiymət (right), Ümumi qalıq (right),
  Dəyər (right), Hərəkət (right), action cell.
- **Search** `#nf-q`: matches `name + ' ' + code`, lowercased substring,
  debounced 200 ms, resets to page 0.
- **Four exclusive filter segments** `#nf-o`: `''` Hamısı; `nop` Qiyməti yox
  (`i.price` falsy); `nomv` Hərəkəti yox (**not** present in `IX.byItem`);
  `dup` Oxşar adlar.
- **`dup` normalisation** (2422): lowercase, then strip whitespace and
  `/ . , " ' -`; every code in a group of size > 1 is flagged. A *different*
  normaliser from `REF_EQ` (Soraqçalar) **and** from `NORM` (5638, bulk import,
  which additionally strips backtick, curly apostrophe, en/em dash and
  parentheses). **Three distinct normalisers must coexist.**
- **Empty/zero rendering:** no price renders a muted `—`; no balance a muted
  `0`; no value `—`; no movement a muted `0`. Negative balance gets `.neg`.
- **Footer** (2448): `<n> mal`, plus `(bazada cəmi <N>)` **only when the
  filtered count differs** from the total.
- **Print** (2451): `printHead('Nomenklatura', nf(rows.length) + ' mal')` then
  `setTimeout(window.print, 60)` — a **non-empty note**, unlike Audit jurnalı.
- **Excel export** (2452): header row
  `['Kod','Malın adı','Ölçü vahidi','Son qiymət','Ümumi qalıq','Dəyər']`, then
  per row `[code, name, unit, price || '', b.q, b.val.toFixed(2)]` where a
  missing balance falls back to `{q:0, val:0}`. Filename `nomenklatura_<today>.xlsx`.

### Pagination — VERIFIED, and it differs from every migrated module
`cut()`/`cutNote()` (1680-1690) with `SHOW_MAX = 3000` (1678): show the first
3000 rows plus a **«Hamısını göstər (N)»** button setting a sticky
`SHOW_ALL['nom']` flag. **Not the numbered pager** of Soraqçalar (M4-18) or
Audit jurnalı. Q3 approves keeping it.

### Derived quantities — VERIFIED (`index()`, 1272-1317)
From a **full scan of `operationalMovements()`**:
- `IX.byItem`: `q = +(in - out).toFixed(4)` (4 decimals, displayed at 2);
  `price` from the **item**, not the movement (1313); `val = q × price`;
  `n` = operational movement count.
- `IX.bal`: keyed `warehouse|code` — per-warehouse in/out/q, needed by the card.
- `IX.priceObs`: `code → [{p, d, k}]`, collected **only when `m.pr > 0`**
  (1283) — the card's price history.
Cancelled rows and their reversals are excluded by `operationalMovements()`
(1249-1269), already ported as `excludeCancelled`.

### Item card — VERIFIED (`itemCard`, 1861-1891)
Opens from any `[data-card]` row (1856-1858). Contains: three KPIs (Ümumi
qalıq with `.r/.g` by sign; Qalıq dəyəri = `money(tot × it.price)`; Hərəkət
sayı with first→last dates); per-warehouse balance table; **price history only
when `obs.length > 1`**; full movement history sorted date-descending; and two
actions — «Bu mal üzrə əməliyyat» (`prefillOp`, 3452) and «Malı redaktə et»
(gated on `item.edit`). An unknown code renders `(nomenklaturada yoxdur)`.
After a successful edit, **if the card is open on that code it re-renders**
(5633) rather than closing.

### Write paths — VERIFIED
- **Create/edit** (`emit('item', …)`, 1109-1135) write **directly to the
  `items` table**, not through an RPC.
  - Insert selects `code` back and **fails if `data.length !== 1`** — an
    explicit guard against a silent RLS refusal.
  - Update builds a **partial** patch (only provided keys) and **requires
    `.select('code')` returning exactly one row**, because *under RLS an
    UPDATE can report no error while updating zero rows* (comment at 1128).
    **This is the server-refusal handling that must be preserved.**
  - `emit()` catches, toasts `Xəta: <message>`, and calls `setSync(false)`;
    the dialog stays open and **must not claim success** (5628-5630).
- **Create/edit validation** (5566-5626): code must match `^\d{7}$`; name ≥ 3
  chars; duplicate code rejected on create; **category mandatory on create**
  when `canEditCategory()` (= `isAdmin()`, 661) — *not* on edit, where empty
  means NULL; unit must be non-empty and comes **only from the reference
  directory** (`unitOptionsFor`, 703), never free text; price disabled without
  `price.edit`. A live similar-name warning (5605-5610) and a
  non-binding category suggestion (5595-5602) render as the user types.
  `nextCode()` (5561) derives the next code **in the browser**.
- **Bulk creation** (`bulkItems`, 5718-5762): paste/parse preview, then
  `emitMany` (1155-1159) — a **sequential per-row loop, NOT atomic**. Rows may
  be `new` or `upd`. This non-atomicity is original behaviour and must be
  preserved, not "fixed".
- **Item import** (`importNewItems`, 6122-6171 → `niImport`, 6095-6121):
  `.xlsx`/CSV/TSV/paste → preview → **`import_new_items` RPC**, which assigns
  codes **server-side**. Only *new* items are created; existing rows are never
  updated and **price is not imported**. Response `{created[], skipped[]}`
  drives the toast.
- **Category import** (`categoryImport`, 5787-5800 → 5891): **Admin-only**
  (`isAdmin()`, explicit refusal toast otherwise), CSV preview + confirm →
  **`set_item_categories` RPC, atomic all-or-none**. Sends only
  `{code, category}`; leading zeros in codes preserved.

### Roles — VERIFIED (626-661)
`ROLE_PERMS.admin` = `item.add`, `item.edit`, `price.edit`, `import`,
`category.edit`, …; `rehber` = **none**; `anbardar` = `mv.add` only. Legacy
roles map to `rehber` (631). `canEditCategory() === isAdmin()` (661).
The nav entry `nom` (256) carries **no `id` and no `display:none`** — so, like
Audit jurnalı, **the page itself has no role gate**; only its actions do:
`#nom-add`/`#nom-bulk`/`#nom-import` disabled without `item.add` (2455-2459),
`#nom-catimp` **hidden** (`display:none`) unless `isAdmin()` (2460).
**Disabled vs hidden is a real distinction to reproduce.**

### Formatting — VERIFIED (594-599)
`nf(n,d)` uses `toLocaleString('az-AZ')`; `money(n)` returns `—` for
null/NaN/**zero**, else `nf(n,2)` + manat sign. Neither is ported yet.

## 3. Assumptions — explicitly NOT verified

- **A1. Row volume.** `fetchAll` pages at 1000 (847-862) and `SHOW_MAX` is
  3000, implying items can exceed 3000. **Live counts unknown** — no live query
  run. Drives T1.
- **A3. RLS on `items`.** Assumed readable by every authenticated role and
  writable only per `ROLE_PERMS`. **Not confirmed against the live policy** —
  which is exactly why the `.select()` refusal guards must be ported verbatim.
- **A4. `price_source`.** Written by `emit` (`psrc`) but never set by the
  Nomenklatura dialogs and not displayed. Assumed out of scope for this screen.
- **A5. SheetJS parity.** Assumed the library reproduces the legacy column
  widths / autofilter / freeze-pane output (1219-1236). To be confirmed on a
  real generated file at live verification, not by unit test.

## 4. Dependency decision (Q1) — APPROVED: option (c)

`IX.byItem`, `IX.bal` and `IX.priceObs` all require every operational movement
row. The original loads the whole `movements` table into the browser
(`fetchAll`, 847-862; `DB.movs`, 936-946).

**Approved: option (c)** — read `movements` restricted to the columns the
indexes actually need (`id`, `item_code`, `warehouse`, `date`, `in_qty`,
`out_qty`, `price`, `partner`, `type`, `note`, `doc_num`, `invoice_num`),
paged to exhaustion client-side, deriving the indexes in the browser.

No SQL change; arithmetic identical to the original by construction; materially
smaller payload than `select('*')`; avoids entrenching a full-table load.
**This sets the precedent for `Mal hərəkəti`, `Anbar qalıqları`, `Dashboard`
and `Nəzarət`.** Note the card needs more columns than the list alone — the
column list above is the union across list, card and export.

## 5. Out of scope

`nreq` and `grp` (separate phases, §1); the full app router (still the Phase 4
two-page switch); stock layers and `conditions`; the Yeni əməliyyat screen
itself — see Q5.

## 6. Q5 — RESOLVED as (a), 2026-09-03

**Decided: option (a).** The button renders visibly but **disabled**, with a
tooltip saying Yeni əməliyyat is migrated in a later phase. `M5-55` stays
`BLOCKED` until that phase, which must carry it as an entry criterion.

Option (c) was rejected: `prefillOp()` both navigates **and** pre-fills the
item into the target screen's in-memory form, so a link to the old platform
could not carry the selection across — it would look like a working transition
while silently losing the item.

The original text of the question is kept below for the record.

**Q5 — «Bu mal üzrə əməliyyat» (`prefillOp`, 3452).** This card button
navigates to `Yeni əməliyyat` (`op`) and pre-selects the item. That screen is
**not migrated**, so the transition has no destination in React.
- **(a)** Render the button **disabled** with a tooltip saying the operation
  screen is still on the old platform. Honest, visible, no dead click.
- **(b)** Omit the button entirely — diverges from the legacy card layout.
- **(c)** Keep it enabled and deep-link to the **old platform's** `op` screen.
- **Recommendation: (a)**, consistent with how Phase 4 handled a deliberately
  unavailable action. **Not a blocker** — implementation proceeds on (a) unless
  the user says otherwise; the parity row records it either way.

## 7. Deviations

**None proposed.** `D-F1` (read-only scope) is **removed** — see §0.

## 8. Risks

- **R-F1 — payload size (A1).** Live counts unknown; T1 measures them first.
- **R-F2 — rounding divergence.** `toFixed(4)` then 2-decimal display must be
  exact; a naive float sum drifts.
- **R-F3 — nullable columns.** Null `unit`/`price` must render the original's
  muted `—`/`0`, never `null`, `NaN` or `0.00`.
- **R-F4 — three distinct name normalisers** (`dup` 2422, `NORM` 5638,
  `REF_EQ`). Sharing one silently changes which rows are flagged or merged.
- **R-F5 — silent RLS refusal.** Dropping the `.select()`/`length === 1` guards
  would report a save that never happened. The single highest-severity risk in
  this phase.
- **R-F6 — non-atomic bulk.** `emitMany` is a sequential loop; a mid-run
  failure leaves earlier rows written. Original behaviour — preserve, and do
  not present it as transactional.
- **R-F7 — SheetJS is a new dependency** and is now required for **both**
  export and `.xlsx` import. Approved in substance by Q2 (Excel in scope), but
  the dependency addition itself should be confirmed at review.
- **R-F8 — localhost writes.** This phase has real write paths for the first
  time since Phase 3. `VITE_ALLOW_LOCAL_WRITES` stays **unset** through coding
  and testing; all write tests run against mocks. No write is exercised live
  without per-write user approval.
