# Phase 5 plan — Nomenklatura, FULL parity, Module F

**Status: IMPLEMENTED 2026-09-03 · Codex-audited (verdict CHANGES REQUIRED,
14 findings) · all 14 remediated · re-audit confirmed the implementation and
all 843 tests — `CODE VERIFIED`. Not `ACCEPTED`: no live verification has been
performed.**
T0-T21 complete. Q5 resolved as **option (a)**: the card's «Bu mal üzrə
əməliyyat» renders visibly but disabled with an explanatory tooltip, and
`M5-55` stays `BLOCKED` until Yeni əməliyyat is migrated and live verified.
Proposal: [`2026-09-03-react-migration-phase5-nomenclature-proposal.md`](../specs/2026-09-03-react-migration-phase5-nomenclature-proposal.md).
Principles: [`ANBAR_REACT_MIGRATION_PRINCIPLES.md`](../ANBAR_REACT_MIGRATION_PRINCIPLES.md).
Registry: [`ANBAR_FUNCTIONAL_PARITY_REGISTRY.md`](../ANBAR_FUNCTIONAL_PARITY_REGISTRY.md).

**Scope is FULL parity for the legacy `nom` screen.** The earlier read-only
scope and its deviation `D-F1` are withdrawn. Q1(c), Q3 and Q4 are approved;
Excel export is in scope. **Q5 is RESOLVED as option (a)** (2026-09-03): the
card's «Bu mal üzrə əməliyyat» button renders visibly but **disabled** with an
explanatory tooltip, because its destination screen is unmigrated. `M5-55`
stays `BLOCKED` until Yeni əməliyyat is migrated and live verified.

*(This paragraph previously described Q5 as still open, with option (a) as a
default to implement «unless told otherwise». That wording predated the
decision and is corrected here; the decision itself is unchanged.)*

## Standing constraints

Do not change the Supabase schema, SQL/RPC contracts, root `index.html`,
production data, the GitHub remote or Vercel. **Keep `VITE_ALLOW_LOCAL_WRITES`
unset while coding and testing**; every write path is exercised against mocks
only. Preserve unrelated behaviour. Registry rows (`M5-*`, Module F) are merged
**before** implementation, per principles §10.

Phase 4's deferred populated-data live check stays open and untouched.

`nreq` and `grp` are separate future phases, not gaps in this one.

## Pre-implementation re-verification (before T2)

Phase 3a and Phase 4 both found contract facts their proposals had wrong.
Repeat that discipline rather than trusting the proposal:

- Re-read `rNom` (2413-2461), `index()` (1272-1317), `itemCard` (1861-1891),
  `emit` item paths (1109-1135), `bulkItems` (5718-5762), `niImport`
  (6095-6121) and `categoryImport` (5787-5900).
- Re-confirm `items`, `movements`, `import_new_items` and `set_item_categories`
  in `web/src/types/database.ts`.
- Confirm `excludeCancelled` still matches `operationalMovements()`
  (1249-1269); it is shared with `referenceUsage.api.ts`, so a change there
  would silently move Module F's numbers.
- Probe RLS on `items` read-only for a non-admin role (A3).

## Tasks

Read foundation first, then writes, then the card. Each task is test-first.

| # | Task | Notes | Rows |
|---|---|---|---|
| T0 | Merge the `M5-*` rows into the registry as Module F, all `NOT STARTED` | Before any code — principles §10 | — |
| T1 | **Resolve A1**: read-only `count:'exact', head:true` on `items` and `movements`; record real numbers | Confirms Q1(c) is sufficient | — |
| T2 | `lib/format.ts` — `nf`, `money` verbatim (Q4), incl. `—` for null/NaN and `money`'s zero case | Pure, test-first | M5-14, M5-15 |
| T3 | `api/items.api.ts` — read `items`; absorbs BOTH failure shapes (returned `{error}` **and** a rejected promise), per the Phase 3a lesson | Never throws | M5-01 |
| T4 | `api/itemMovements.api.ts` — read the Q1(c) column set, paged to exhaustion (1000/page) | Union of list/card/export needs | M5-02 |
| T5 | `lib/itemIndex.ts` — `excludeCancelled`, then `byItem` (`q=+(in-out).toFixed(4)`, item price, `val`, `n`), `bal` (per warehouse), `priceObs` (**only `pr > 0`**) | Core parity risk R-F2 | M5-03…M5-06, M5-22, M5-23 |
| T6 | `store/nomenclature.store.ts` — sources, indexes and list controls **in the store** (M4-18 lesson applied up front) | | M5-16 |
| T7 | `lib/itemFilters.ts` — search, `nop`, `nomv`, `dup` with its **own** normaliser (R-F4) | Never reuse `REF_EQ`/`NORM` | M5-07…M5-11 |
| T8 | `pages/NomenclaturePage.tsx` — table, segments, debounced search, footer counts, muted empties, `.neg` | | M5-12, M5-13, M5-17 |
| T9 | «Hamısını göstər»: `SHOW_MAX = 3000`, sticky flag, exact footer note (Q3) | | M5-18 |
| T10 | Print via `PrintHead` with the **non-empty** note `nf(rows.length) + ' mal'`, stamped at click per `M4-18d` | | M5-19 |
| T11 | **Excel export** — add SheetJS (R-F7), port `xls()` (1219-1236): header row, `price \|\| ''`, `b.val.toFixed(2)`, `{q:0,val:0}` fallback, filename `nomenklatura_<today>.xlsx`, column widths, autofilter, freeze pane | Q2 superseded: in scope | M5-20, M5-24 |
| T12 | `lib/itemValidation.ts` — `^\d{7}$`, name ≥ 3, duplicate code on create, category mandatory on create **only** when `canEditCategory()`, unit required and reference-sourced | Pure, heavily tested | M5-25…M5-28 |
| T13 | `api/itemWrite.api.ts` — create/update against `items` with the **`.select()` + `length === 1` refusal guards** (R-F5); partial update patch; never claims success on a zero-row result | **Highest-severity task** | M5-29, M5-30, M5-31 |
| T14 | `components/ItemFormDialog.tsx` — create/edit dialog: readonly code on edit, `nextCode()` on create, unit select from the reference directory, price disabled without `price.edit`, category select Admin-only, similar-name warning, category suggestion (non-binding), dialog stays open on failure | | M5-32…M5-36 |
| T15 | `lib/bulkItemParse.ts` + `components/BulkItemsDialog.tsx` — parse/preview (`NORM`, its own normaliser), then a **sequential, non-atomic** apply loop mirroring `emitMany` (R-F6); result toast counts | Do not make it transactional | M5-37…M5-39 |
| T16 | `api/importNewItems.api.ts` + `components/ImportItemsDialog.tsx` — `.xlsx`/CSV/TSV/paste → preview → `import_new_items` RPC; only new items, **no price**, `{created, skipped}` toast | Server assigns codes | M5-40…M5-42 |
| T17 | `lib/csv.ts` + `api/setItemCategories.api.ts` + `components/CategoryImportDialog.tsx` — **Admin-only** with explicit refusal, CSV preview + confirm → atomic `set_item_categories`; leading zeros preserved | All-or-none | M5-43…M5-46 |
| T18 | `components/ItemCard.tsx` — three KPIs, per-warehouse balances, price history **only when `obs.length > 1`**, movement history date-desc, «Malı redaktə et» gated on `item.edit`, unknown code text, and re-render-on-open-after-edit (5633). «Bu mal üzrə əməliyyat» per **Q5(a)** | Needs `bal` + `priceObs` | M5-47…M5-52 |
| T19 | Role wiring: add/bulk/import **disabled** without `item.add`; category import **hidden** unless admin; page itself ungated | Disabled ≠ hidden | M5-21, M5-53 |
| T20 | Nav entry in `App.tsx`, no role gate | | M5-54 |
| T21 | Full checks: tests, typecheck, oxlint, build, `git diff --check`; fill in registry evidence | | — |

## Testing strategy

Test-first throughout. Cases that must exist because they encode a real trap:

- **Rounding (R-F2):** a case whose naive float sum differs from
  `+(in-out).toFixed(4)`.
- **Price source:** a movement priced differently from its item — `val` must
  use the **item's** price (1313).
- **Cancellation:** an item whose only movements are cancelled appears under
  `nomv` and shows `0`/`—`.
- **Nullable columns (R-F3):** null `unit`/`price` never render
  `null`/`NaN`/`0.00`.
- **Three normalisers (R-F4):** a name pair that `dup` groups but `REF_EQ`
  would not, and one where `NORM` differs from `dup` (backtick / curly
  apostrophe / dash / parentheses).
- **`money` zero:** exactly `0` renders `—`.
- **Silent RLS refusal (R-F5):** update returning `{data: [], error: null}`
  must surface as a failure, leave the dialog open, and **not** toast success.
  Same for an insert returning zero rows. **Verify these fail against a version
  without the guards before keeping them.**
- **Non-atomic bulk (R-F6):** a mid-run failure leaves earlier rows written and
  reports honestly.
- **Category mandatory on create only:** admin creating without a category is
  blocked; admin editing to empty is allowed (NULL).
- **Category import refusal:** a non-admin gets the refusal, and **no RPC call
  is made**.
- **Import ignores price** and never updates an existing item.
- **Card:** price history hidden at `obs.length === 1`; unknown code text; the
  card re-renders after an edit while open.
- **Roles:** add/bulk/import disabled without `item.add`; category import
  hidden for non-admin; the page renders for every role.
- **List controls survive navigation** (M4-18 lesson).

## Definition of done

- All `M5-*` rows `CODE VERIFIED` with named test evidence.
- Tests, typecheck, lint, build, `git diff --check` all clean.
- Report `DONE`. **Codex then audits independently.**
- **Live verification happens only after that audit** and covers **every
  function of the Nomenklatura screen**, including the write paths. Writes
  require `VITE_ALLOW_LOCAL_WRITES=true` set deliberately plus per-write user
  approval at that time — not during implementation.

## Explicitly NOT in this phase

`nreq`; `grp`; a real router; stock layers; `conditions`; the Yeni əməliyyat
screen itself — the card's transition to it is settled by Q5(a) as a visible
but disabled button, and `M5-55` stays `BLOCKED` on that future phase.

## Result (2026-09-03)

**716 tests passing in 50 files** (was 450/30), `typecheck`, `oxlint`, `build`
and `git diff --check` all clean.

### New files

`lib/format.ts` · `lib/itemIndex.ts` · `lib/itemFilters.ts` ·
`lib/itemValidation.ts` · `lib/bulkItemParse.ts` · `lib/importItemParse.ts` ·
`lib/csv.ts` · `lib/xls.ts` · `lib/showAllCut.ts` ·
`api/items.api.ts` · `api/itemMovements.api.ts` · `api/itemWrite.api.ts` ·
`api/importNewItems.api.ts` · `api/setItemCategories.api.ts` ·
`store/nomenclature.store.ts` · `pages/NomenclaturePage.tsx` ·
`components/nomenclature/{ItemFormDialog,ItemCard,BulkItemsDialog,ImportItemsDialog,CategoryImportDialog}.tsx`.
Each has a colocated test. Changed: `lib/mutationGuard.ts` (widened past the
reference actions), `App.tsx` (nav entry).

### Things worth knowing before touching this code

- **The R-F5 guards were verified by removing them.** With the `.select()`
  row-count checks stripped, four tests fail; restored, all pass. That is the
  proof the silent-RLS-refusal handling is real and not decorative.
- **`emitMany`'s non-atomicity is reproduced on purpose** and pinned by a test
  asserting a PARTIAL result message after a mid-run failure. Do not wrap the
  bulk apply in a transaction.
- **Three normalisers coexist** (`dupNormalise`, `NORM`, `refEq`), each with a
  test pinning a pair the others treat differently.
- **`toNum` uses the original's strict regex** (1212-1218), not a loose
  `Number()`. A loose version changes which export cells become numbers.
- **`xlsx@0.18.5` is what production loads** (index.html:5). `npm audit` flags
  two high-severity advisories; both concern PARSING a workbook, so the
  `.xlsx` **import** path is genuinely exposed while export is not. Kept for
  parity as an **accepted, documented risk — not an assessment that it is
  safe**: fixed builds exist only on SheetJS's own CDN, and npm's newest
  published version is still 0.18.5. Full record:
  `docs/superpowers/decisions/2026-09-03-xlsx-dependency-risk.md` (R-F7).
  **The bundle grew from 476 kB to 938 kB.**
- **The localhost guard covers the new write paths** (`item.create`,
  `item.update`, `item.bulk`, `item.import`, `item.category-import`). Component
  tests stub it open; one test per dialog asserts it still blocks.
- The 3000-row cut is tested through `applyCut` rather than a full render —
  mounting 3000 rows in jsdom takes over a minute and proves nothing extra.

### Not done, deliberately

No live verification of anything. `VITE_ALLOW_LOCAL_WRITES` was never set; every
write path was exercised against mocks only. No Supabase, SQL/RPC, root
`index.html`, GitHub or Vercel change.

---

## Audit remediation (2026-09-03)

Codex audited the implementation above and returned **CHANGES REQUIRED** with
fourteen findings: [`../audits/2026-09-03-phase5-codex-audit.md`](../audits/2026-09-03-phase5-codex-audit.md).
All fourteen are now fixed. Each finding was **independently re-confirmed
against `origin/main:index.html`** before any code changed — none was taken on
the audit's word — and each fix carries regression tests verified to fail
against the pre-fix code.

**Checks after remediation: 843 tests in 54 files** (was 716/50), `typecheck`,
`oxlint`, `build` and `git diff --check` all clean.

Per-finding resolutions are tabulated in the registry's Module F header. The
things worth knowing before touching the changed code:

- **A01 was a real data-loss bug, not a formatting slip.** The legacy fallback
  `r.price || (r.st === 'upd' ? existing.price || 0 : 0)` (index.html:5754)
  means an update whose pasted row omits a price keeps the stored one. The
  `||` chain also treats an explicit `0` as an omission — inherited behaviour,
  now pinned by its own test so it is not "fixed" into a divergence.
- **Both import dialogs enforce the whole-file gate TWICE.** The button is
  disabled *and* the handler refuses independently, because the original
  explicitly distrusts button state against DOM tampering (5879-5884). For the
  category import the gate is a pure function
  (`lib/categoryImportClassify.ts`) so the second barrier is testable without
  reaching into React internals.
- **`csv.ts` no longer drops blank-code rows.** It previously skipped them,
  which made a malformed file look clean and let its remaining rows write. The
  original keeps every body row and fails it on the seven-digit test.
- **A04 could not be caught by a DOM test.** jsdom applies no stylesheet, so
  the card was present in the document and unreachable in a browser. The
  regression test therefore reads `index.css` as TEXT and asserts the rule and
  the mask < drawer < modal layering. `import './index.css?raw'` is not usable
  here — Vitest returns an empty string for it.
- **A13's regression lived in the wiring, not the cut.** `applyCut` was always
  correct; the page's own debounced `setFilters` was clearing the sticky flag
  on mount, so the tests exercise the page, not the helper.
- **A14 separates two states that look alike.** «Reference load failed» falls
  back to the built-in lists; «directory ready but empty» stays empty, because
  an Admin who hid every value meant it. Collapsing both to `[]` reported a
  failure as a deliberate configuration.
- **A10 watches `items`/`movements`/`warehouses` only.** No `audit_log`
  subscription — Phase 4 Q3 forbids it. The refresh replaces server-owned data
  only, so filters, the expansion and open dialogs survive a colleague's edit.

### Still not done after remediation

Unchanged from above: **no live verification of anything**.
`VITE_ALLOW_LOCAL_WRITES` remains unset and every write path is still exercised
against mocks only. No Supabase, SQL/RPC, root `index.html`, GitHub or Vercel
change was made by the remediation either.

Additionally still open:

- **T1's payload measurement.** The audit noted it is marked complete without
  recorded counts. No counts were taken during remediation, so it is **not**
  claimed as done here; it needs a read-only `count:'exact', head:true` pass
  whose numbers are written down.
- **The real generated Excel file** has never been opened and compared, and
  **print output** has never been inspected in a print preview.
- **`M5-55`** stays `BLOCKED` on the Yeni əməliyyat phase.
