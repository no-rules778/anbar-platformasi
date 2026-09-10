# Phase 8 / I-9 — separate «Silinmə» Excel report: IMPLEMENTED, CODE VERIFIED (2026-09-07)

Scope: the second deliverable of `M8-50`, deferred by I-7. Legacy source:
`writeOffExportRows()` (`index.html:1709-1731`) and `xlsWriteOff()`
(`index.html:1738-1789`).

**Status: implemented locally and CODE VERIFIED.** Updated inline after the
audited refinements (revised points are marked *REVISED*). No live access, no
SQL, no RLS, no dependency or environment change, no fixture, no database
write, no staging, no commit, no deployment. The ordinary Excel export,
printing and the import path are NOT touched. Authenticated per-role reads
remain a later live gate. Phase 8 remains **NOT ACCEPTED**.

Delivered files:

| File | Role |
|---|---|
| `web/src/api/writeoffAllocations.api.ts` | the allocation read (§3) |
| `web/src/lib/writeOffExport.ts` | pure row builders (§2, §4) |
| `web/src/lib/xlsWriteOff.ts` | the separate workbook writer (§2, §6B) |
| `web/src/pages/MovementsPage.tsx` | the button, capability gate, async safety |

Plus four test suites: `writeOffExport.test.ts` (35),
`writeoffAllocations.api.test.ts` (17), `xlsWriteOffWorkbook.test.ts` (27),
`MovementsPageWriteOffExport.test.tsx` (23).

## 1. Evidence check — independent verification of A8

[`audits/2026-09-07-phase8-i8-a8-allocation-metadata.md`](../audits/2026-09-07-phase8-i8-a8-allocation-metadata.md)

**Corroborated.** The 14 columns, their types and nullability match the
generated `web/src/types/database.ts:722-737` exactly — an artefact produced
independently of that SQL Editor session. `reversed_at` is nullable, `qty` and
`price_status_snapshot` NOT NULL, and the four snapshot columns nullable, as
the audit states.

**No disagreement with the audit's findings.** Its own limits are stated
correctly and are load-bearing here, so they are restated as planning
constraints, not doubts:

- `has_table_privilege('authenticated', …, 'SELECT') = true` is a GRANT check.
  It does not prove effective per-role visibility: the policy body
  `EXISTS (SELECT 1 FROM movements m WHERE m.id = …writeoff_movement_id)`
  defers entirely to movement RLS, which the metadata query did not exercise.
- Nothing establishes that allocation rows EXIST in any quantity. A zero-row
  read is indistinguishable from a correct empty result on TEST.
- TEST is not proof of production parity.

One disagreement worth recording, against a **planning assumption, not the
audit**: the policy's `EXISTS` carries no `reversed_at` condition, so reversed
allocations ARE returned by the database. Excluding them is CLIENT-side work
(legacy does it at `index.html:1775`), and must not be described as an RLS
guarantee.

## 2. Legacy contract — exact, both sheets

### Sheet 1 «Silinmə hesabatı» — 17 columns, `SILINME_EXPORT_HEADER`

`Sənəd №` · `Tarix` · `Anbar` · `Kod` · `Malın adı` · `Ölçü vahidi` ·
`Silinən miqdar` · `Yekun vahid qiyməti` · `Yekun məbləğ` · `Mənbə məbləği` ·
`Məlum qiymətli hissə` · `Qiymətsiz miqdar` · `Qiymətləndirmə üsulu` ·
`Admin dəyişiklik səbəbi` · `Qaimə №` · `Qeyd` · `Qeyd edən`

Cell types, verbatim from `xlsWriteOff()`:

| Col | Field | Type | Rule |
|---|---|---|---|
| 0 | doc | **text `z:'@'`** | cell OMITTED when falsy |
| 1,2 | date, wh | string | always |
| 3 | code | **text `z:'@'`** | always |
| 4,5 | name, unit | string | always |
| 6 | qty | number | always, including 0 |
| 7,8 | price, amount | number | cell OMITTED when `null` |
| 9,10,11 | sourceAmount, knownAmount, unknownQty | number | OMITTED when `null` |
| 12 | valuation | string | `|| ''` |
| 13 | overrideReason | string | OMITTED when falsy |
| 14 | invoice | **text `z:'@'`** | OMITTED when falsy |
| 15 | note | string | OMITTED when falsy |
| 16 | by | string | always |

Null/zero rule: **an omitted cell is a genuinely empty cell, never `0` and
never `''`.** `qty` is the exception — always written, so a real 0 stays
visible. `price` is `final/qty` to 4 dp when `final != null && qty > 0`, else
`m.pr` when `> 0`, else null. `!cols` are 17 fixed widths; `!freeze` is set
(and, per I-8, ignored by `xlsx@0.18.5` — inherited, not fixed here).

### Sheet 2 «Mənbə partiyalar» — 11 columns, `SILINME_SOURCE_HEADER`

`Silmə hərəkəti ID` · `Sənəd №` · `Kod` · `Mənbə hərəkəti ID` ·
`Mənbə sənəd №` · `Mənbə Qaimə №` · `Mənbə tarixi` · `Miqdar` ·
`Qiymət statusu` · `Mənbə vahid qiyməti` · `Mənbə məbləği`

Built with `aoa_to_sheet`, so cell types are INFERRED, and `price`/`amount` use
`== null ? '' :` — an empty string, not an omitted cell. **The sheet is
appended only when `srcRows.length > 0`**; a workbook with no allocations has
one sheet. Columns 1 and 2 come from the PARENT row, not the allocation.
Filename `Silinme_hesabati_<yyyy-mm-dd>.xlsx`; the final amount is deliberately
not repeated here (legacy comment: prevents double-counting).

## 3. Allocation read

New `api/writeoffAllocations.api.ts`, modelled on the already-verified
`writeoffValuations.api.ts`: explicit column list (no `select('*')`), ordered
pagination, `PAGE_SIZE = 1000`, `MAX_PAGES = 200`, never throws.

Fields: `writeoff_movement_id, source_movement_id, source_doc_num_snapshot,
source_invoice_snapshot, source_date_snapshot, qty, price_status_snapshot,
unit_price_snapshot, source_amount_snapshot, reversed_at`. `id`, `layer_id`,
`created_by`, `created_at` are real columns deliberately left unread.

- **`reversed_at` is SELECTED and filtered client-side** (`reversed_at == null`),
  matching `index.html:1775`. It is read precisely BECAUSE the policy does not
  filter it.
- **Ordering — REVISED:** `.order('created_at').order('id')`. The proposal
  ordered by `writeoff_movement_id` first, which would have REORDERED the
  «Mənbə partiyalar» sheet against legacy for no gain — the grouping it
  produces is not part of the exported contract. Legacy chronological order is
  preserved by `created_at`; the correctness half is `id`, the primary key, as
  a unique tie-breaker, since `created_at` alone is not unique and `range()`
  pages under a non-unique sort can overlap or skip rows.

  **HONEST LIMIT, stated rather than implied:** a stable total order makes
  PAGINATION sound. It does NOT give the read a transaction snapshot. Rows
  inserted, reversed or deleted by another session BETWEEN page requests can
  still be missed or double-read — PostgREST issues each `range()` as its own
  statement and nothing here spans them in one transaction. This is inherent to
  paged reads over a live table and is not claimed to be solved.
- **Never partial:** any page error returns `{ rows: [], ok: false }`. Unlike
  legacy `fetchAll()` (`index.html:857`), which `break`s on error and returns
  the rows read so far — the silent-truncation path this must not inherit.
- Hitting `MAX_PAGES` with a full final page is treated as **failure**, not
  success: a set that may be incomplete is never reported as complete.

The read is on-demand, inside the export handler — not added to page load, so
the I-2 read-only screen is unaffected.

## 4. Limiting allocations to exported movements, without dropping rows

Legacy keeps an allocation only when `byMovement.has(a.movementId)`
(`index.html:1775`) — a parent-scoped inner filter. Reproduced exactly.

**REVISED — no orphan signal, no new toast.** The proposal called a
non-matching parent an "orphan" and surfaced the count in the completion toast.
Both are withdrawn. A parent outside the exported filter is the ORDINARY,
expected result of filtering by warehouse, date or type — the user asked for a
subset — so it is neither an orphan nor an error, and warning about it would
raise an alarm on every normal filtered export.

The builder still returns counts (`read`, `reversed`, `outsideFilter`,
`written`) but they are **internal diagnostics only**, consumed by tests and by
a developer reading a failure. They are NOT displayed. They also cannot carry
the weight the proposal put on them: a count cannot distinguish a legitimately
filtered parent from one hidden by movement RLS, and it cannot detect rows a
truncated read never returned at all. Only the read's own `ok: false` speaks to
completeness — which is why a failed read writes no file (§5). A page-level
test asserts the success toast is the ONLY toast when allocations fall outside
the filter.

Reading all allocations and filtering client-side (rather than an `.in()` on
movement ids) matches legacy and avoids URL-length limits on large filtered
sets.

## 5. Read failure

**All-or-nothing. No partial download.** If the allocation read returns
`ok: false`, **no file is written at all** — not a one-sheet workbook, because
a workbook missing «Mənbə partiyalar» is indistinguishable from the legitimate
no-allocations case and would read as a complete report. An error toast names
the failure. This is the one deliberate divergence from legacy, which cannot
reach this state only because it reads allocations at page load.

**REVISED — `layerActive === false` is NOT by itself confirmed-inactive.**
The proposal treated it as one state; it is two, and I-4 already separated them
in the store. `fetchLayerCapability()` reports `active:false` both when the
server answers "layers are OFF" (`ready:true`) and when the probe FAILED
(`ready:false`). Gating on `active` alone would silently omit sheet 2 from a
report whose source lots may well exist — a missing sheet that reads as "this
write-off had no source lots" when the truth is "we never established whether
it did".

The gate is `layerFresh && layerReady && !layerActive`, giving three states
(the `layerFresh` term was added by the 2026-09-07 export-safety audit; see the
SUPERSEDED note below the table):

| capability | behaviour |
|---|---|
| `ready && !active` | CONFIRMED INACTIVE — legacy preserved exactly: no read is issued, sheet 2 absent, sheet 1 written normally |
| `ready && active` | read the allocations; sheet 2 per the result |
| `!ready` | UNKNOWN — read anyway. Success settles the question better than the probe did; failure refuses the file (above) rather than quietly dropping the sheet |

**INHERITED DIFFERENCE, documented:** legacy reads its allocations at PAGE LOAD
inside the same `stock_layers_supported()` branch that sets the capability, so
it can never reach an export with an unresolved capability. This report reads
ON DEMAND — which keeps the I-2 read-only screen's four-read profile unchanged
— and therefore can. The `!ready` branch is the honest handling of a state
legacy cannot enter, not a divergence in the states it can. A page test pins
that a failed probe still reads; the mutation `!layerActive` fails it.

**SUPERSEDED IN PART (2026-09-07 export-safety audit) — the table above is
correct only for a FRESHLY PROBED capability.** `layerReady`/`layerActive` are
STICKY: `movements.store.ts::load()` retains the last known capability when a
later probe fails, deliberately, so cancellation routing does not flip on a
lost probe. A capability confirmed inactive at boot and merely RETAINED across
a later SUCCESSFUL snapshot whose probe failed therefore reached the first row
of the table and skipped the read — the exact silent omission this section
exists to prevent, arrived at through the cache rather than through the probe.

The store now carries `layerFresh`, set from the probe belonging to the applied
snapshot and never retained. The gate takes it as a third term, so only a FRESH
confirmation may skip the read; a stale one falls into the `!ready` row and
reads. `layerFresh` is read by the export ONLY — cancellation routing keeps
`layerReady` alone and its retained capability. Separately, the report is now
also gated on `!loading` and rechecks the store's `loading` flag at click time
and after the allocation read, so it cannot be produced from a snapshot an
unresolved refresh is about to replace. The ordinary Excel export is unchanged.
Full detail and mutation results: the I-9 export-safety entry in
`CLAUDE_HANDOFF.md`.

## 6. Permission boundary

The button is **ungated by role**, exactly as legacy `#mov-wo-exp` and as the
I-7 Excel button. Access is not widened and the client adds no scoping: row
visibility is the server's, via movement RLS. It is enabled only when the type
filter is `Silinmə` (legacy title/hint preserved), `loaded` is true and no
snapshot refresh is in flight (the `!loading` term added by the export-safety
audit; the ordinary Excel button keeps `loaded` alone); an
empty filtered set toasts «Seçilmiş filtrlərə uyğun silinmə qeydi yoxdur» and
writes nothing, as legacy does.

Because A8 did not prove effective per-role visibility, this proposal claims
none: a `rehber` or `anbardar` may legitimately export fewer allocation rows
than an `admin`. That is server behaviour to be OBSERVED in a later live check,
not asserted now.

## 6A. Async safety (added after audit)

The allocation read is awaited, which opens four races the proposal did not
address. All are handled in `exportWriteOff()` and covered by focused tests.

- **The whole snapshot is captured at CLICK TIME.** The filtered parents,
  `itemBy`, `valuations`, `emails` and `me` are read into locals before the
  await, and sheet 1 is built from them there. Only those locals are used
  afterwards. Old parent values are NEVER combined with a refreshed snapshot.
- **Duplicate in-flight export is prevented** by a ref guard — a ref, not
  state, because it must take effect on the click itself, before a re-render.
  Three rapid clicks issue one read and produce one file.
- **Before the download, the export aborts** if the store's `rows`/`valuations`
  identity changed (the store replaces both wholesale on every successful load,
  which makes identity a reliable snapshot token), if the signed-in `sbId`
  changed, or if the page unmounted. Each abort toasts and writes nothing.

The download is the irreversible step: once the file is on disk the user treats
it as authoritative, so every check precedes it.

## 6B. Workbook parity (confirmed against legacy)

Both sheets are ported cell by cell: raw warehouse values in THIS report (the
ordinary export's `whLabel()` mapping is deliberately NOT applied here), mapped
recorder labels via `recorderLabel()`, `z:'@'` text identifiers, omitted-versus-
zero cells, the 17 and 11 FIXED legacy column widths, and the conditional
second sheet. `!freeze` is set as legacy sets it and, per I-8, is dropped by
`xlsx@0.18.5` — inherited, pinned by a test, not worked around. **No
autofilter** and no other feature absent from legacy is added; `lib/xls.ts` and
the ordinary export are untouched.

Verification is a REAL serialization round trip (the I-8 pattern): only
`XLSX.writeFile` is intercepted, the workbook is written to a buffer and parsed
back, and assertions run against those bytes — actual filename
(`Silinme_hesabati_<yyyy-mm-dd>.xlsx`) and actual sheet names («Silinmə
hesabatı», «Mənbə partiyalar»).

## 7. Implementation steps

1. `api/writeoffAllocations.api.ts` — the read in §3.
2. `lib/writeOffExport.ts` — pure: `writeOffExportRows()` and `sourceRows()`.

   **REVISED — the price expression is report-specific.** The proposal claimed
   `writeOffUnitPrice()` "already matches". It does NOT, and the difference is
   material. Both share the first branch (`final / qty` at 4dp), but the table
   helper ends `Number(m.price ?? 0) || 0`, so its fallback returns **0** for a
   missing or zero price and **the negative number itself** for a negative one.
   This report's legacy expression (`index.html:1713-1714`) admits only a
   POSITIVE fallback and yields **null** otherwise — and null here means an
   OMITTED cell, whereas 0 would read as a genuine zero price and would sum
   into a spreadsheet average.

   So `writeOffReportPrice()` implements the expression exactly, in this
   module. `movementValuation()` IS reused unchanged, and no shared valuation
   helper is modified. `writeOffExport.test.ts` pins the divergence directly,
   asserting both functions' outputs side by side, so a future
   "simplification" back to the shared helper fails a test. Covered cases:
   missing, zero and negative price, NaN price, `qty === 0`, and a stored
   `final_amount` of 0 (a REAL zero, distinct from null).
3. `lib/xlsWriteOff.ts` — a SEPARATE writer, mirroring legacy cell by cell.
   **`lib/xls.ts` is not modified and not reused**: its `toNum()` coerces every
   body cell, which would turn a zero-padded `Kod` or `Sənəd №` into a number
   and lose the leading zeros (the documented R-F9 behaviour). Legacy writes
   those as `z:'@'` text specifically to prevent that, so reuse would be a
   regression — which is why legacy keeps this writer separate too.
4. `pages/MovementsPage.tsx` — one button beside «Excel», gated per §6, calling
   the read then the writer. `exportXls()` is not changed.

## 8. Tests

- `writeOffExport.test.ts` — column order and count for both headers; omitted
  vs zero cells per §2; the `price` fallback chain including `qty === 0`;
  reversed rows excluded; orphan counting; parent-sourced `doc`/`code` in
  sheet 2.
- `writeoffAllocations.api.test.ts` — column list; ordering; paging to a short
  page; an error on page 2 yields `ok:false` with ZERO rows; `MAX_PAGES`
  overflow fails; a rejected promise is absorbed.
- `xlsWriteOffWorkbook.test.ts` — **real serialization round trip**, following
  the I-8 pattern: write with the real `xlsx`, read the package back, assert
  sheet names and order; assert a `Kod` of `0000001` and a zero-padded
  `Sənəd №` survive as **text (`t:'s'`)**, not as `1`; assert omitted cells are
  ABSENT rather than `0`; assert single-sheet output when there are no
  allocations.
- `MovementsPageWriteOffExport.test.tsx` — enabled only for `Silinmə` and
  `loaded`; a read failure writes NO file and toasts; an empty set writes
  nothing; the button is ungated by role.
- Mutation checks: drop the `reversed_at` filter; swap a `z:'@'` cell for a
  number cell; return partial rows on a page error — each must fail a test.

## 9. Decisions — resolved by the audit

1. **`D-I9a` — the orphan signal. RESOLVED: neither option.** The framing was
   wrong: a parent outside the filter is ordinary filtering, not an anomaly.
   Counts are kept internal; no toast, no UI warning. See §4.
2. **`D-I9b` — sheet 2 when layers are inactive. RESOLVED: silent, per legacy —
   but only for CONFIRMED inactive.** An unresolved capability reads instead of
   silently omitting the sheet. See §5.
3. **`D-I9c` — a read-only TEST check. STILL OPEN, and now the only remaining
   gate.** Implementation proceeded on A8's verified TEST metadata with mocked
   tests, as authorized. What no local test can settle: whether an
   authenticated React read returns allocation rows at all, and what each role
   (`admin` / `rehber` / `anbardar`) actually sees through movement RLS. Group
   B remains unauthorized; this needs its own authorization and mandatory TEST
   hostname verification.

## 10. Verification performed

Baseline before changes: 122 files / 2585 tests passing.

| Check | Result |
|---|---|
| New suites | 102 tests passing (35 + 17 + 27 + 23) |
| Full suite | **126 files / 2687 tests passing** |
| `tsc -b --noEmit` | clean |
| `oxlint` | 0 warnings, 0 errors |
| `npm run build` | succeeds |
| Scope | 9 files touched, all in scope |

Shared helpers verified UNMODIFIED: `movementValuation.ts`, `xls.ts`,
`movementExport.ts`, `writeoffValuations.api.ts`, `movements.store.ts`.
`index.html`, SQL, dependencies and environment files untouched.

**Mutation checks** — each protection removed, then confirmed to fail tests:

| Mutation | Tests failed |
|---|---|
| Price fallback returns 0/negative instead of null | 7 |
| `reversed_at` exclusion dropped | 3, across all three suites |
| Partial read accepted (legacy `fetchAll()` behaviour) | 4 |
| Capability gate ignores `layerReady` | 1 |

All mutants reverted and the full suite re-run green.

One pre-existing I-7 test — «renders no Çap and no Silinmə-report control» —
asserted this report's ABSENCE, since it was deferred when that test was
written. It is NARROWED, not deleted: «Çap» is still asserted absent, and the
Silinmə control is now asserted PRESENT, so the test still fails if either
control's status changes without a decision.

## 11. Remaining live gaps

Nothing below is settled by local work, and none of it is claimed:

- whether an authenticated React read returns allocation rows on TEST at all —
  a zero-row read is indistinguishable from a correct empty result;
- effective per-role visibility through movement RLS (`has_table_privilege` is
  a GRANT check only);
- TEST-to-production parity;
- Microsoft Excel visual rendering of THIS report's two sheets — I-8's A3
  confirmation covered the ordinary export, not this one;
- behaviour at real volume, including the `MAX_PAGES` boundary.
