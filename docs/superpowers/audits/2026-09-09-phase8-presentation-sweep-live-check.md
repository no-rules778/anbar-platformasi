# Phase 8 — read-only presentation sweep live check (M8-01/02/04/07/08/10/12/13/41/54)

Date: 2026-09-09 (Asia/Baku)

Target: TEST Supabase `alkjjbaawmsirsfvqljm`. Production `bbjmhaerssakbreykxiw`
was never contacted (0 attempts across all three passes).

## Scope and method

One read-only sweep of the non-live presentation rows. **No row is promoted
beyond the dimensions actually observed**; branches without a suitable live
fixture are explicitly left CODE VERIFIED rather than claimed, and are listed
below by name.

Evidence is DOM assertion plus independent recomputation from the raw snapshot
response — not screenshots. No mutation, no fixture, no application-code
change. `Çap` is treated as outside acceptance per the 2026-09-08 product
decision. The M8-44/M8-45 failure and concurrency scenarios were not repeated.

## Environment

- `web/.env.sandbox.local` → TEST URL, `VITE_ALLOW_LOCAL_WRITES=false`,
  `VITE_TEST_ENVIRONMENT=true`, verified before browser use.
- Localhost started only as
  `npm run dev -- --mode sandbox --host 127.0.0.1 --port 5175`; the previous
  server was stopped and replaced by a freshly started instance (PID 27084) so
  the `sandbox` badge provably belongs to the process under test. HTTP 200.
- Playwright 1.63.0 driving installed Chrome from the npm `_npx` cache; not
  added to `web/package.json` or `web/node_modules`.
- Real React login: TEST admin, then `anbardar` and `rehber` sequentially in a
  fresh browser context each.

## Baseline — raw vs visible kept separate

- raw `movements` snapshot response: **101 rows** (admin), re-measured this run
- `excludeCancelled()` operational set: **3 rows** — the table renders these
- footer: `3 qeyd · mədaxil 11.00 · məxaric 3.00 · mədaxil dəyəri 111.00 ₼`
- raw `items` 6; `warehouses` 3 rows → 2 active `anbar`
  (`Test Anbar`, `CODEX Phase8 Transfer Anbar`)

The three visible rows (`TEST-IN-2`, `TEST-OUT-1`, `TEST-IN-1`) are all
`Test Anbar` / item `0000001`, types `Alış` and `Silinmə`, dated 2026-09-01/02/03,
with `partner`, `channel`, `invoice_num` and `contract_num` all null and notes
of 18–27 characters.

**One instrumentation correction is recorded rather than hidden.** The first
reconnaissance latched the wrong `movements` response — other screens issue
their own narrower `movements` select — and reported `type`/`date` as null. The
capture was changed to match the snapshot read by its full column signature
(`created_by` + `contract_num`) and the pass repeated. No claim rests on the
first capture.

## M8-01 — rail entry and navigation: LIVE VERIFIED

| Proof | Observed |
| --- | --- |
| rail entry «Mal hərəkəti» visible | YES |
| `Əməliyyat` group members, in order | `["Yeni əməliyyat", "Mal hərəkəti"]` |
| SECOND in that group (the row's contract) | YES |
| activated through the real UI | YES (click, not a URL) |
| correct page opened | heading `Mal hərəkəti` |
| active state on that entry | `["Mal hərəkəti"]` |
| exactly one rail entry active | YES |
| present without a role gate | YES for admin, `anbardar`, `rehber` (see M8-41) |

## M8-02 — page shell and actions: LIVE VERIFIED (presentation only)

Heading `Mal hərəkəti`; subtitle
`Bütün mədaxil, məxaric və yerdəyişmələrin vahid registri.`

Header action row, in rendered order:

| # | Text | testid | admin | anbardar | rehber |
| --- | --- | --- | --- | --- | --- |
| 1 | Excel | `mv-export` | enabled | enabled | enabled |
| 2 | Silinmə hesabatı | `mv-export-writeoff` | disabled¹ | disabled¹ | disabled¹ |
| 3 | Qrup üzrə ləğv | `mv-batch-cancel` | **present** | **absent** | **absent** |
| 4 | Yeni əməliyyat | — | enabled | enabled | enabled |

¹ disabled under a non-«Silinmə» type filter; observed **enabled** for admin
after selecting «Silinmə» (M8-08 below). Its title is the legacy hint
`Yalnız Silinmə süzgəci seçildikdə`.

«Çap» is **absent entirely** for all three roles — not rendered as a disabled
control — matching the product decision. **The `rehber` gap named in this row
is now closed.** No mutation behaviour is claimed: no export was executed and
no batch dialog was submitted in this sweep.

## M8-04 — 15-column table and formatting: PARTIALLY LIVE VERIFIED

**15 headers, exact rendered order** (14 named + the trailing action column):

`TARIX · ANBAR · KOD · MALIN ADI · NÖVÜ · İSTIQAMƏT / KONTRAGENT · KANAL ·
QAIMƏ № · GIRIŞ · ÇIXIŞ · QIYMƏT · MƏBLƏĞ · QEYD · QEYD EDƏN · (empty)`

Header count 15 for admin, `anbardar` and `rehber`.

Rendered rows:

```
03.09.2026 | Test Anbar | 0000001 | TEST Mal 1 | Alış    | — | — | — | 1.00  | —    | 11.00 | 11.00 ₼  | Synthetic price observation | anbar-admin-test@example.com | Baxış
02.09.2026 | Test Anbar | 0000001 | TEST Mal 1 | Silinmə | — | — | — | —     | 3.00 | —     | —        | Synthetic outgoing          | anbar-admin-test@example.com | Baxış
01.09.2026 | Test Anbar | 0000001 | TEST Mal 1 | Alış    | — | — | — | 10.00 | —    | 10.00 | 100.00 ₼ | Synthetic incoming          | anbar-admin-test@example.com | Baxış
```

**Branches promoted LIVE** (each exercised by current TEST data):

- column order and count — exact match
- `fmtD()` — `2026-09-03` → `03.09.2026`, for all three rows
- `nf(_, 2)` quantities — `1.00`, `3.00`, `10.00`
- `nf(_, 2)` price — `11.00`, `10.00`
- `money()` — `11.00 ₼`, `100.00 ₼`, **and its zero → em-dash branch**, live on
  the `Silinmə` row whose amount renders `—`
- `whLabel()` warehouse alias — `Test Anbar`
- note cell with the **full note in `title`** (the ≤40-character branch):
  every visible note's `title` equals its text
- «Qeyd edən» recorder label — `created_by` is the UUID
  `aa0fd092-af7d-4e0e-baac-34ce1a0389fa` in the raw response and renders as
  `anbar-admin-test@example.com`. **The UUID appears in zero rendered cells**,
  which is the I-2 finding-2 correction (no raw UUID on screen) proven live and
  falsifiably — the UUID is demonstrably present in the data being rendered.
- em-dash fallbacks for empty `channel`, `invoice_num` and route/partner

**Branches deliberately NOT promoted — no live fixture, left CODE VERIFIED:**

- 40-character note truncation with `…` — longest visible note is 27 chars
- channel suppression on `Yerdəyişmə` — no transfer row is visible
  (28 exist in the raw set but all fall outside `excludeCancelled()`)
- recorder branches «Excel idxalı» / current-user-name / «digər istifadəçi» —
  only the directory-email branch has live data

No data was created to reach these branches.

## M8-07 — search: LIVE VERIFIED

| Step | Input | Result |
| --- | --- | --- |
| match | `Synthetic outgoing` | **1 row**, and it is the expected row (its QEYD cell equals the term); footer recalculated to `1 qeyd · mədaxil 0.00 · məxaric 3.00 · mədaxil dəyəri —` |
| no match | `ZZZ-NO-SUCH-VALUE-M8SWEEP` | **0 rows**, empty state `Qeyd yoxdurSeçilmiş süzgəclərə uyğun qeyd tapılmadı.`, footer `0 qeyd · …` |
| cleared | `` (empty) | table and footer **byte-identical to baseline** |

## M8-08 — filters: LIVE VERIFIED for the dimensions with live values

The fixed **eight**-type list is present and exact:
`Əvvələ qalıq, Satınalma, Yerdəyişmə, Silinmə, Sahəyə, Qaytarma, İcarə, Satış`
(plus «Bütün növlər»).

| Filter | Input | Result |
| --- | --- | --- |
| type | `Silinmə` | 1 row, **all rendered rows are `Silinmə`**; `mv-export-writeoff` became **enabled** |
| type | `Yerdəyişmə` | 0 rows + empty state — a valid option with no visible rows |
| warehouse | `Test Anbar` | 3 rows, all `Test Anbar`, footer unchanged |
| warehouse | `CODEX Phase8 Transfer Anbar` | 0 rows |
| date (inclusive) | `2026-09-02` → `2026-09-02` | **1 row, dated 02.09.2026** — proves both bounds inclusive on a single day |
| date (inclusive) | `2026-09-01` → `2026-09-03` | 3 rows, all three dates |
| «Sıfırla» | — | table and footer **byte-identical to baseline** |

The warehouse select is built from **all** configured warehouses (both active
`anbar` rows), not the user's own scope.

**Not promoted:** the grouped «İstiqamət / kontragent» select — its only live
option is the empty one, because every visible row has a null partner and no
transfer route. That dimension has no live fixture and is not claimed.

## M8-10 — default order `date desc`: LIVE VERIFIED (as specified)

The contract is a **default order**, not interactive sorting, so that is what
was verified — no sort affordance was invented. Rendered order
`03.09.2026, 02.09.2026, 01.09.2026` is strictly descending, and the table
exposes **no clickable sort control** (0 header buttons), consistent with the
contract.

`ts desc` (the `created_at` tie-break) is **not** promoted: all three visible
rows have distinct dates, so no tie exists in the live data to exercise it. It
stays CODE VERIFIED (mutation-checked at I-1).

## M8-12 — footer KPI: LIVE VERIFIED, independently recomputed

KPI numbers were computed **independently** from the raw snapshot response —
`count`, `Σ in_qty`, `Σ out_qty`, `Σ in_qty × (price || item.price || 0)` — and
the app was never asked for them.

| Set | Independent numbers | Expected footer | Actual footer | Match |
| --- | --- | --- | --- | --- |
| baseline | `{count:3, in:11, out:3, value:111}` | `3 qeyd · mədaxil 11.00 · məxaric 3.00 · mədaxil dəyəri 111.00 ₼` | identical | YES |
| after type=`Silinmə` | `{count:1, in:0, out:3, value:0}` | `1 qeyd · mədaxil 0.00 · məxaric 3.00 · mədaxil dəyəri —` | identical | YES |

So the line **recalculates on filter change**, and the zero inbound value
correctly renders the em-dash.

**A first comparison reported a mismatch and was investigated rather than
reported as a defect**: Node's and Chrome's ICU render `az-AZ` decimals
differently (comma vs dot), so the expected string — not the application — was
wrong. Only the string FORMATTING was then delegated to the browser's own ICU;
the arithmetic stayed independent. The application was not changed.

## M8-13 — «Yeni əməliyyat» navigation: LIVE VERIFIED

Clicking the real header button opened the **«Yeni əməliyyat»** page and moved
the rail active state to that entry (`["Yeni əməliyyat"]`). **No operation was
submitted.** The only prefilled input was the form's own date field
(`2026-09-09`, today) — no movement data was carried across, consistent with
"plain page switch, no prefill, no draft seeding". Navigating back to
«Mal hərəkəti» restored the snapshot **byte-identically** (rows and footer).

## M8-41 — screen ungated for all roles: LIVE VERIFIED

The row asserts the rail entry carries no role gate, for `admin`, `rehber` and
`anbardar`. Live observation was genuinely open, so a sequential role pass was
run — fresh browser context each, each ended through the real «Çıxış»
(`rpc/end_session` observed).

| Role | Chip | Rail entry present | 2nd in group | Screen opens | Headers | Visible rows | Raw movements |
| --- | --- | --- | --- | --- | --- | --- | --- |
| admin | — | YES | YES | YES | 15 | 3 | **101** |
| anbardar | `anbar-anbardar-codex-test · Anbardar` | YES | YES | YES | 15 | 3 | **85** |
| rehber | `anbar-rehber-codex-test · Rəhbər` | YES | YES | YES | 15 | 3 | **101** |

RLS was re-confirmed from a second code path: `anbardar` reads **85** raw rows
(the `Test Anbar` partition), `rehber` **101**. All three render the same 3-row
operational table because the screen shows `excludeCancelled()` output and the
foreign/cancelled rows fall outside it — **a fixture coincidence at the
operational layer, not evidence that RLS is inactive**, exactly as recorded for
M8-45.

## M8-54 — ported helpers: PARTIALLY LIVE VERIFIED

Each helper mapped to a falsifiable DOM observation over current data:

| Helper | Live observation | Status |
| --- | --- | --- |
| `fmtD()` | TARIX cells `03.09.2026 / 02.09.2026 / 01.09.2026` from ISO `2026-09-0{3,2,1}` | **LIVE** |
| `whLabel()` | ANBAR cell `Test Anbar` | **LIVE** |
| `TYPE_TAG` map | NÖVÜ tag classes: `Alış → tag t-mut`, `Silinmə → tag t-rm` | **LIVE**, two of the map's entries |
| `routeOrPartner()` | İSTIQAMƏT cell — only the **em-dash fallback** branch (partner null, no route) | **LIVE for the fallback branch only** |
| `transferRoute()` | no visible `Yerdəyişmə` row | **NOT exercised — stays CODE VERIFIED** |
| `movKey` / `movKeyLabel` | grouped select has only the empty option | **NOT exercised — stays CODE VERIFIED** |

## Reconciliation

- raw TEST `movements`: **101** (admin and `rehber`), **85** (`anbardar`) —
  measured this run, matching the established role/RLS partition.
- non-GET requests observed, all read-only RPCs: `register_session`,
  `get_reference_values`, `get_user_directory`, `stock_layers_supported`,
  `movement_split_supported`, `get_transfer_destinations`, `list_my_sessions`,
  `end_session`. **No mutation RPC, no INSERT/UPDATE/DELETE, no fixture.**
  (`movement_split_supported` and `get_transfer_destinations` are the
  «Yeni əməliyyat» page's own read-only probes, from the M8-13 navigation.)
- production contact attempts: **0**.
- all browser device sessions ended through the real «Çıxış».
- localhost remains TEST sandbox/read-only, HTTP 200,
  `VITE_ALLOW_LOCAL_WRITES=false`.
- staged state empty; dirty working tree preserved at **213** entries.
- no I-10 row created.

## Summary of promotions

| Row | Promotion |
| --- | --- |
| M8-01 | **LIVE VERIFIED** — full contract |
| M8-02 | **LIVE VERIFIED** — presentation, all three roles; `rehber` gap closed |
| M8-04 | **PARTIALLY LIVE VERIFIED** — 3 named branches remain CODE VERIFIED |
| M8-07 | **LIVE VERIFIED** — match, no-match, clear |
| M8-08 | **LIVE VERIFIED** — type/warehouse/date/reset; İstiqamət not claimed |
| M8-10 | **LIVE VERIFIED** for `date desc`; `ts desc` tie-break not claimed |
| M8-12 | **LIVE VERIFIED** — independently recomputed, incl. recalculation |
| M8-13 | **LIVE VERIFIED** — full contract |
| M8-41 | **LIVE VERIFIED** — all three roles observed live |
| M8-54 | **PARTIALLY LIVE VERIFIED** — `transferRoute`/`movKey` not exercised |
