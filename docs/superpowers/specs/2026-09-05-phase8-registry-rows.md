# Phase 8 parity-registry rows — Module I ledger

**FINAL STATUS — ACCEPTED (2026-09-09).** Codex completed the independent
acceptance audit required by principles §11 after the owner explicitly approved
the two remaining scope boundaries: inactive-layer M8-39/M8-46 branches are
outside this active-layer acceptance, and M8-29 layer-legacy transfer success
may remain unexecuted without a destructive new cutover. These are scoped
exceptions, not claimed live passes. [Owner decision](../decisions/2026-09-09-phase8-active-layer-and-legacy-scope.md) · [final Codex audit](../audits/2026-09-09-phase8-final-codex-acceptance.md).

**Product decision 2026-09-08:** `Çap` is an accepted historically non-functional feature and is excluded from the Phase 8 acceptance boundary. Its absence is not a defect and does not keep M8-50 or Phase 8 open. M8-50 remains partial only for the explicitly unverified Excel/report dimensions listed in its row. This statement supersedes older text below that attributes `PARTIAL` status to missing print. [Decision](../decisions/2026-09-08-print-nonfunctional-baseline.md).

**2026-09-08 current evidence update:** M8-24 (ordinary cancellation), M8-32 (successful ordinary batch), M8-33 (ordinary correction caller) and M8-43 (their audit consequences) are **PARTIALLY LIVE VERIFIED for TEST admin only**. This explicitly supersedes older no-RPC-executed statements below for those paths. M7-109's ordinary caller and M7-120's ordinary correct_document consequence were exercised. A later read-only follow-up also observed the real `editable:false` impact outcome and its seven-row block list for `SND-76074E451C`, giving M8-34 narrow partial live evidence. See [B1/B3/B4 evidence](../audits/2026-09-08-phase8-cancellation-correction-live-check.md) and [not-editable evidence](../audits/2026-09-08-phase8-correction-not-editable-live-check.md). Failure atomicity and all untested branches remain open; **Phase 8 NOT ACCEPTED**.

**2026-09-08 export-concurrency update:** the Silinmə report's unmount-abort
subpath is **LIVE VERIFIED** on TEST: navigation away during a deliberately
delayed allocation read produced no download. A follow-up double click issued
exactly one allocation read, live-verifying the synchronous duplicate-click
lock. Read-only follow-ups live-verified both refresh-in-progress and
changed-snapshot refusals: neither downloaded a file and both showed the exact
user-facing retry message. A synthetic in-memory identity transition also
exercised the changed-session guard: no file and the exact session-change
warning, without a real Auth operation. This current statement supersedes the
older row text below that lists concurrency paths as unverified.
[Evidence](../audits/2026-09-08-phase8-writeoff-export-unmount-live-check.md).

**This is the authoritative Module I (Phase 8, «Mal hərəkəti», document
inspection and cancellation) row-by-row ledger.** It is linked from
[`ANBAR_FUNCTIONAL_PARITY_REGISTRY.md`](../ANBAR_FUNCTIONAL_PARITY_REGISTRY.md)
rather than duplicated there, following the Module H precedent
([`2026-09-04-phase7-registry-rows.md`](2026-09-04-phase7-registry-rows.md)).

Source proposal:
[`2026-09-05-react-migration-phase8-movements-proposal.md`](2026-09-05-react-migration-phase8-movements-proposal.md).
Rows are created **before implementation**, as required by
[`ANBAR_REACT_MIGRATION_PRINCIPLES.md`](../ANBAR_REACT_MIGRATION_PRINCIPLES.md)
§10.

**Module I is ONE acceptance boundary.** No milestone is `ACCEPTED` alone, and
`ACCEPTED` additionally requires Codex's independent audit (principles §11).

**Phase 8 changes no Phase 7 status.** `M7-S3` stays `LIVE VERIFIED` for its
TEST failure-and-recovery path only; Module H stays INCOMPLETE / NOT
`ACCEPTED`; the live scenario `S-6` stays BLOCKED (a server/RPC gap) and is
**not** the same thing as registry row `M7-S6` ("failed refresh keeps the
snapshot", `CODE VERIFIED`); `M7-120` stays `LIVE VERIFIED` for the ordinary
movement-INSERT consequence only; `M7-109`'s caller remains open until
milestone I-6 actually ships it.

Behavioural reference: `index.html` in this repository; every «Old ref» is a
line number in that file. React refs are paths under `web/src/`.

## Decisions still open

`D3` (batch cancellation in-phase or deferred), `D4` (item replacement
in-phase or deferred) and `D5` (live-write policy for I-8) remain
**undecided**. No row below silently resolves them. Rows that depend on an
open decision stay `NOT STARTED` and name the decision they wait on.

`D5` now has a written plan awaiting approval —
[`2026-09-07-phase8-i8-live-gate-proposal.md`](2026-09-07-phase8-i8-live-gate-proposal.md).
It is a PROPOSAL only: nothing in it has been executed, and it resolves no
decision. It records a blocking finding — `web/.env` targets PRODUCTION
`bbjmhaerssakbreykxiw` while the TEST project appears only in
`web/.env.sandbox.local`, which no npm script selects — so every I-8 write
scenario is blocked until that is settled (`Q1`).

**`D1` is PARTIALLY resolved** (2026-09-07): the ORDINARY Excel export is
included and shipped in I-7. The «Çap» affordance and the separate Silinmə
report are **still undecided and unbuilt** — the Silinmə report additionally
depends on `stock_layer_allocations`, a table this app has never read and whose
shape and RLS are unconfirmed, so it cannot be built without a read-only live
check first. `M8-50` is therefore PARTIAL, not complete. See
[`2026-09-07-phase8-i7-export-proposal.md`](2026-09-07-phase8-i7-export-proposal.md).

**`D2` is RESOLVED** (2026-09-06), as recommendation (b). Codex read the live
`movements` SELECT policy on the TEST project (`alkjjbaawmsirsfvqljm`)
read-only through the Supabase SQL editor. Policy `movements_select`, role
`authenticated`:

```text
is_admin()
OR is_rehber()
OR (is_anbardar() AND warehouse = current_user_warehouse())
```

The resolution is therefore: **port the unscoped client behaviour exactly, add
no client-side anbardar filter, and rely on live RLS to restrict an
anbardar's rows.** Stated precisely, so no later reader can overstate it: the
SERVER scopes the rows; the React client does not scope them and must never be
described as doing so. See `M8-42`.

This resolves the READ half of **R2** as well: the live column set and SELECT
policy of `writeoff_valuations` were confirmed in the same read-only session.
It authorises **no write** to that table, and none was made.

## Milestones

| # | Content | Status |
|---|---|---|
| I-1 | Read-only foundation: pure helpers, filter/sort/cap/search/KPI logic, `movements` read widening | implemented 2026-09-05 — see «Milestone I-1» below |
| I-2 | The screen | implemented 2026-09-06 - see the Milestone I-2 section below |
| I-3 | Document views, read-only | implemented 2026-09-06 — see «Milestone I-3» below |
| I-4 | `api/documentCancel.api.ts`, guard extension, cancellation families | implemented 2026-09-06 — see «Milestone I-4» below |
| I-5 | Batch cancellation | implemented 2026-09-07; `M8-30` … `M8-32` are CODE VERIFIED and the successful ordinary TEST-admin batch path is partially live verified |
| I-6 | Correction flow (`document_edit_impact()` caller) | implemented 2026-09-07; ordinary TEST-admin success and populated not-editable paths are partially live verified — see «Milestone I-6» below |
| I-7 | Exports and print, if `D1` approves | ordinary Excel and the separate Silinmə report are implemented and partially live verified; `Çap` is excluded from acceptance by the 2026-09-08 product decision |
| I-8 | Live gate — individually approved actions only | COMPLETE — Phase 8 ACCEPTED 2026-09-09 for the owner-approved active-layer TEST scope after independent Codex audit; exclusions remain explicit in M8-29/M8-39/M8-46 and the decision record |

## Row ledger

| ID | Function | Old ref | Status |
|---|---|---|---|
| M8-01 | Rail entry «Mal hərəkəti» — ungated, second in the `Əməliyyat` group | 251-253, 1495-1503 | CODE VERIFIED (I-2) — `App.tsx`; position and the absence of a role gate both mutation-checked. **LIVE VERIFIED (2026-09-09, presentation sweep):** on TEST `alkjjbaawmsirsfvqljm`, real React UI, freshly started verified `--mode sandbox` read-only localhost (PID 27084); DOM assertions plus independent recomputation, not screenshots. No mutation RPC, no fixture, 0 production contact; sessions ended through the real «Çıxış». The rail entry «Mal hərəkəti» is visible, is the **SECOND** member of the `Əməliyyat` group (`[Yeni əməliyyat, Mal hərəkəti]`), was activated by a real click (not a URL), opened the heading `Mal hərəkəti`, and left **exactly one** rail entry active — that entry. Observed present for `admin`, `anbardar` and `rehber`, so the absence of a role gate is live too. Evidence: [`audits/2026-09-09-phase8-presentation-sweep-live-check.md`](../audits/2026-09-09-phase8-presentation-sweep-live-check.md) |
| M8-02 | Page shell: heading, subtitle, header action row | 319-323 | CODE VERIFIED (I-2) — `pages/MovementsPage.tsx`. **At I-2 the export/print/batch buttons were NOT rendered**, waiting on `D1` / I-5 / I-7. **Corrected 2026-09-07:** «Excel» (I-7, ungated by role, `mv-export`) and «Qrup üzrə ləğv» (I-5, admin-only, `mv-batch-cancel`) now render. **Corrected 2026-09-07 (I-9):** «Silinmə hesabatı» (`mv-export-writeoff`, ungated by role, enabled only for the «Silinmə» type filter) now renders too. **Observed live on TEST 2026-09-07 (admin):** the button was disabled for other types and enabled after selecting «Silinmə» and finishing load. **Observed live on TEST 2026-09-08 (`anbardar`):** both export actions rendered; «Silinmə hesabatı» enabled after selecting «Silinmə» and both real-button downloads succeeded, while admin-only «Qrup üzrə ləğv» did not render. See the follow-up audit below. The Silinmə action is additionally disabled while a refresh is in progress (export-safety fixes). `rehber` remains unobserved live. «Çap» alone is still NOT rendered and is not shown as a disabled control — see the `D1` note above and `M8-50`. **LIVE VERIFIED (2026-09-09, presentation sweep):** on TEST `alkjjbaawmsirsfvqljm`, real React UI, freshly started verified `--mode sandbox` read-only localhost (PID 27084); DOM assertions plus independent recomputation, not screenshots. No mutation RPC, no fixture, 0 production contact; sessions ended through the real «Çıxış». Heading `Mal hərəkəti` and subtitle `Bütün mədaxil, məxaric və yerdəyişmələrin vahid registri.`; action row in rendered order `Excel` (`mv-export`, enabled) · `Silinmə hesabatı` (`mv-export-writeoff`, disabled under a non-Silinmə filter, title `Yalnız Silinmə süzgəci seçildikdə`, observed **enabled** after selecting «Silinmə») · `Qrup üzrə ləğv` (`mv-batch-cancel`, admin-only) · `Yeni əməliyyat`. **The `rehber` gap named above is now CLOSED:** `rehber` and `anbardar` both render both export actions and NOT `mv-batch-cancel`. «Çap» is absent entirely for all three roles — not a disabled control. Presentation only: no export was executed and no batch dialog submitted, so no mutation behaviour is claimed. Evidence: [`audits/2026-09-09-phase8-presentation-sweep-live-check.md`](../audits/2026-09-09-phase8-presentation-sweep-live-check.md) |
| M8-03 | Row source = `excludeCancelled()`, reusing `lib/operationalMovements.ts` | 1249-1270 | **LIVE VERIFIED (2026-09-09)** — originally CODE VERIFIED (I-2): derived once per load in `store/movements.store.ts`; the RAW set is kept alongside it for the cancellation-state lookups. On TEST `alkjjbaawmsirsfvqljm`, TEST admin, real React UI, read-only. The surviving set was **reimplemented independently** in the harness from the legacy rules (`index.html:1249-1270`); the application's `excludeCancelled()` was never imported or called. RAW **101** rows → OPERATIONAL **3** → RENDERED **3**, with **element-by-element id equality**: 0 missing, 0 unexpected, count equal, and the tuple used to resolve DOM rows back to ids was asserted unique. Surviving ids `43036d8e…`/`bd8369ee…`/`27dbfbe2…` = docs `TEST-IN-1`/`TEST-OUT-1`/`TEST-IN-2`. The footer was recomputed from the SAME surviving set (`{count:3, in:11, out:3}`) and matched. **All three cancellation families are materially exercised**: whole-document reversal (35 markers), legacy row-level `Ləğv ID:` (12) and legacy transfer pair (2), resolving to 59 hidden document numbers and 14 hidden movement ids; exclusion tally 70 document-hidden + 14 legacy-id + 14 self-marker = 98 of 101. Ordinary/correction (`SND-C-*`) and transfer reverse (`SND-R-*`, `SND-LR-*`) pairs are included. **M8-20 distinction proven live**: 11 documents reach zero visible rows purely through row-level counters while never entering `hiddenDocs`, so a partially modified document is NOT treated as a whole-document cancellation — worked example `SND-12B8BCDD3A` (4 rows: 2 replacements named by legacy id, 2 `Ləğv ID:` markers). No mutation RPC, no fixture, 0 production contact. Evidence: [`audits/2026-09-09-phase8-m8-03-m8-05-m8-52-live-check.md`](../audits/2026-09-09-phase8-m8-03-m8-05-m8-52-live-check.md) |
| M8-04 | 15-column table, legacy order and formatting | 1797-1824 | CODE VERIFIED (I-2) — column order, `nf()`/`money()`/`fmtD()`, warehouse alias, channel suppression, 40-char note truncation with full `title`, and the «Qeyd edən» recorder label each tested. **Corrected after the I-2 Codex audit (finding 2):** the recorder rendered the INTERMEDIATE legacy mapping `created_by || 'sistem'` (`index.html:943`), which puts a raw UUID on screen. It now renders the FINAL mapping (`index.html:990`) through the pure `lib/recorderLabel.ts` — «Excel idxalı» / directory email / current-user name / «digər istifadəçi» — resolved against the `get_user_directory()` map App.tsx already warms, adding no RPC. All four branches and the no-raw-UUID rule are tested and mutation-checked. **LIVE VERIFIED (2026-09-09, presentation sweep):** on TEST `alkjjbaawmsirsfvqljm`, real React UI, freshly started verified `--mode sandbox` read-only localhost (PID 27084); DOM assertions plus independent recomputation, not screenshots. No mutation RPC, no fixture, 0 production contact; sessions ended through the real «Çıxış». **LIVE VERIFIED (2026-09-09) — every ledger branch now covered; see the supersede note below.** Earlier state: PARTIAL — promoted per branch, with the unexercised branches named. All **15** headers render in the exact contract order (`TARIX · ANBAR · KOD · MALIN ADI · NÖVÜ · İSTIQAMƏT / KONTRAGENT · KANAL · QAIMƏ № · GIRIŞ · ÇIXIŞ · QIYMƏT · MƏBLƏĞ · QEYD · QEYD EDƏN · ∅`), for admin, `anbardar` and `rehber`. LIVE branches: `fmtD()` (`2026-09-03`→`03.09.2026`); `nf(_,2)` quantities (`1.00`/`3.00`/`10.00`) and prices (`11.00`/`10.00`); `money()` both ways — `11.00 ₼`/`100.00 ₼` **and its zero→em-dash branch**, live on the `Silinmə` row; `whLabel()` (`Test Anbar`); the note cell carrying the FULL note in `title` (the ≤40-char branch); em-dash fallbacks for empty channel/invoice/route; and the «Qeyd edən» recorder label — `created_by` is the UUID `aa0fd092-af7d-4e0e-baac-34ce1a0389fa` in the raw response and renders as `anbar-admin-test@example.com`, with **the UUID appearing in ZERO rendered cells**, which proves the I-2 finding-2 no-raw-UUID correction live and falsifiably. **SUPERSEDED 2026-09-09 — `M8-04` is now LIVE VERIFIED; the branches below were the ones still open and are now closed.** They had been left CODE VERIFIED for want of a live fixture: 40-char note truncation with `…`; channel suppression on `Yerdəyişmə`; and the recorder branches «Excel idxalı» / current-user-name / «digər istifadəçi». Closed by a **controlled browser-only presentation harness** (same basis as `M8-11`/`M8-06`), read-only, with application helpers **never imported** — `whLabel`, `resolveWh`, `normWhName`, `nf`, `money`, `fmtD` and `recorderLabel` were each reimplemented independently — and cells addressed by **header-name → column index**, never by class selector. 12 synthetic `M804` rows: **12 rendered, 0 missing, 0 unexpected**. **Alias:** a row stored `Xocahəsən` rendered **`Xocəsən`** while the raw payload still carried `Xocahəsən` — display-only, and it holds even though `Xocahəsən` is not a configured TEST warehouse, `whLabel()` being a pure map. **Channel, three rows differing only in type/channel** (every value non-empty, so an empty channel is never mistaken for suppression): `Yerdəyişmə` + `Test anbar` → **`—`** (hidden); `Yerdəyişmə` + `Təcili` → **`Təcili`** (shown); `Alış` + `Test anbar` → **`Test anbar`** (shown). Independently computed: `normWhName("Test anbar")="test"` resolves to the configured **`Test Anbar`** — a genuine resolution via the historical «… anbar» suffix form, **not** the known TEST «… Anbar» artifact — while `Təcili` resolves to null. **Note boundary:** 41 chars → 40 + `…` with the full 41 in `title` byte-for-byte; **exactly 40 → no ellipsis** (proving the test is `> 40`, not `>= 40`); a 55-char mixed note likewise truncated with full `title`. **Recorder:** `created_by=null` → **`Excel idxalı`**; legacy `'sistem'` sentinel → **`Excel idxalı`**; unknown UUID → **`digər istifadəçi`**; known directory id → email (control). No recorder cell holds a UUID or the literal `sistem`, and the unknown UUID appears **nowhere in the DOM**. **Current-user-name branch, separate leg:** the directory warms **once at boot** (`App.tsx:92-99`), so a remount-time override is too late — a first attempt rendered the email and was rerun with the override armed **before login**. Only `/rpc/get_user_directory` was overridden (never sign-in, `register_session`, `current_user_role`, profile reads or any mutation/session RPC), removing **exactly one** entry (the current user) and returning the other 3 unchanged: the row rendered the live profile name **`ANBAR Test Admin`** — not the email, not `Excel idxalı`, not `digər istifadəçi`, not a UUID — while a control row for another still-listed id resolved to its email, proving the trim was surgical rather than a broken response. **12/12 checks in that leg.** **Recovery:** raw back to **109**, directory back to 4 entries, rendered rows back to **3 byte-identical** to baseline, no `M804` or `Xocəsən` left in the DOM, no banner. **Two harness-side expectation errors, neither an application defect and neither on a branch needed here:** the harness expected `1,00` because **Node's ICU** renders `az-AZ` with a decimal comma while **Chrome** renders `1.00` (the real baseline already shows `1.00`); and a “zero price” row rendered `12.50` because `pr = m.price || it.price` correctly fell back to the nomenclature price (`items.api.ts:45` selects `price`), so the row was simply not a valid zero-price fixture — the `money()` zero → em-dash branch passed and was already LIVE from real data. **Scope, to be preserved when quoting:** the `M804` rows existed **only as an intercepted HTTP response body inside one Chrome context**; the real TEST table held **109** rows before, during and after. React presentation-contract evidence only — NOT stored TEST data, NOT backend generation, NOT payload/performance. TEST count unchanged at 109, no mutation RPC, 0 production contact, no code change, no I-10 row. Evidence: [`audits/2026-09-09-phase8-m8-04-formatting-branches-live-check.md`](../audits/2026-09-09-phase8-m8-04-formatting-branches-live-check.md). Prior real-TEST evidence retained: [`audits/2026-09-09-phase8-presentation-sweep-live-check.md`](../audits/2026-09-09-phase8-presentation-sweep-live-check.md) |
| M8-05 | `Silinmə` price/amount via `movementValuation()`; others via `m.pr → item.price` | 1796-1815 | **PARTIAL — 4 of 5 branches LIVE VERIFIED (2026-09-09), one structurally unreachable.** On TEST, TEST admin, real React UI. The branch matrix was established from code before any fixture: B1 stored non-null `final_amount`; B2 stored `final_amount=null`; B3 the `writeOffUnitPrice()` 4-dp quotient (a sub-case of B1, not independent); B4 legacy no-valuation with `pr > 0`; B5 legacy no-valuation with `pr <= 0`. **B5 was already LIVE VERIFIED** (`bd8369ee…`/`TEST-OUT-1`, `pr <= 0` → `final = null` → both cells `—`). **B2 now LIVE VERIFIED**: doc `SND-7FD2038C2E`, movement `ff961a32-2aab-4e02-bc85-f0c5393fc8b9`, posted via `post_layer_movement_document` (request key `7affa40e-e969-49a6-8942-a1aef676e10b`) allocating 7 from the unknown-price layer `b633360d…` + 0.01 from the known layer `fcb7f7b1…`; stored row `source_amount null · known_amount 0.15 · unknown_qty 7 · final_amount null · valuation_method "unknown"`, independently expected (0.01 × 15 = 0.15) and matching; the row is operational (independently recomputed surviving set, `excludeCancelled()` NOT reused: RAW 106 → 4, DOM 4) and renders **QIYMƏT `—`, MƏBLƏĞ `—`**. This stored-unknown branch is **distinct from the price-zero branch** — both print `—`, one because a stored `final_amount` is null, the other because no valuation row exists and `pr <= 0`; both were visible in the same DOM snapshot. **B1 + B3 now LIVE VERIFIED**: doc `SND-4C3E500866`, movement `b317fe0b-9059-48d1-bbcb-645a32c50f16` (request key `0b3f4398-72a0-4020-9766-2defdd240ad8`), 0.99 from the known layer with the supported admin «Yekun məbləğ» override = 10.00 plus mandatory reason; stored row `source_amount 14.85 · known_amount 14.85 · unknown_qty 0 · final_amount 10 · valuation_method "admin_override"` — a **third live method value** beside `source` and `unknown`. The DOM renders **QIYMƏT `10.10`, MƏBLƏĞ `10.00 ₼`**, which **proves the stored `final_amount` wins over the ordinary chain**: the source amount 14.85 is absent from the DOM. Quotient precision is genuinely exercised, not cosmetic — `10 / 0.99 = 10.101010…` (non-terminating), required 4-dp `10.101`, server-stored `movements.price = 10.101`, and **2 dp (10.10) differs from 4 dp (10.1010)**. **B4 remains CODE VERIFIED and is NOT promoted**: every supported current posting path writes a `writeoff_valuations` row (both fixtures did), so a `Silinmə` row with `pr > 0` and no valuation row is reachable only by fabricating an unsupported historical row, which was refused; the 4 RAW rows in that shape are all cancelled. A further structural boundary was recorded: this item is condition-marked, so `Miqdar` is readOnly and the minimum supported write-off is **7.01**, exceeding the known layer 1.00 — hence a stored non-null `final_amount` is **not reachable by allocation alone** here, only via the admin override. Net-zero closed: both documents cancelled through their real layer-aware cards, balances/layers back to baseline (Test Anbar/0000001 = 8; layers 7 and 1 available), 0 negatives, 0 unreversed valuations; RAW 105 → **109** (+2 fixtures, +2 reversals, no deletion). Evidence: [`audits/2026-09-09-phase8-m8-05-writeoff-valuation-branches-live-check.md`](../audits/2026-09-09-phase8-m8-05-writeoff-valuation-branches-live-check.md) |
| M8-06 | «ləğv edilib» tag driven by `cancelledDocFor()` | 1810, 4899-4909 | **LIVE VERIFIED (2026-09-09)** — [audit](../audits/2026-09-09-phase8-m8-06-cancellation-tag-live-check.md). Proved through the real React screen using a **controlled browser-only presentation fixture**, on the same basis as `M8-11`. **Explicitly NOT** a stored TEST fixture, NOT backend-generation proof, and **no claim that current RPCs produce this marker shape**. **Contradiction resolved:** the M8-05 recommendation was wrong and the `M8-51` handoff was right — recomputed from the raw **109**-row snapshot (application helpers never imported), **44** raw rows have a non-null `cancelledDocFor()` but **0 are operational**, and **0** of the 53 real markers lack their own `doc_num`. Structural reason: `excludeCancelled()` adds to `hiddenDocs` only via `if (docMatch && doc)` — the **marker's own** `doc_num` — while `docCancelledBy()` has no such guard, so a doc'd marker both produces the tag and removes the row that would show it; a doc'd row can never be simultaneously operational and tag-positive. The only escaping shape is a **doc-less** marker (source survives, `'—'` fallback returned), which is historical: all four server-written shapes carry a generated `doc_num`. **Positive:** source row rendered, marker row NOT rendered as a live movement, İstiqamət cell read exactly `ləğv edilib` (`M806 Tərəfdaş ləğv edilib`), fallback label `—`, no banner. **Negative control:** identical payload with ONLY the marker note changed (`Ləğv: M806-SRC-DOC-1` → `M806 neytral qeyd`), source row byte-identical — tag spans 1 → 0 on the **same rendered identity**, so filtering cannot explain it. **RAW-vs-operational:** a source-only payload (what the operational set would supply) rendered the row with **0** tag spans, proving the marker row — the very row `excludeCancelled()` removes — is required; shown by payload→DOM correlation, no internal helper called. Only the exact full-column `movements` GET was intercepted; Auth, every `/rpc/`, `items`, `warehouses`, `writeoff_valuations` never were; StrictMode duplicates served the identical body. **Recovery:** raw returned to 109, rendered rows to 3 cell-by-cell identical to baseline, no `M806` or `ləğv edilib` left in the DOM, no banner. 0 production contact, no mutation RPC, TEST count unchanged at 109, no code change. On the present TEST snapshot the tag is **structurally unreachable** from live data, so the real-backend branch stays unexercised by design. Earlier evidence retained: CODE VERIFIED (I-2) — the cell renders the tag, fed the RAW row set (not `operational`, which drops the marker rows the lookup needs) |
| M8-07 | Free-text search over the exact legacy field set, with `searchableNote()` | 1657-1674 | CODE VERIFIED (I-2) — the input and its 200 ms debounce (`debounce(upd, 200)`, 1626) ship; the value is trimmed and lowercased before it reaches the store, as `upd()` does. **LIVE VERIFIED (2026-09-09, presentation sweep):** on TEST `alkjjbaawmsirsfvqljm`, real React UI, freshly started verified `--mode sandbox` read-only localhost (PID 27084); DOM assertions plus independent recomputation, not screenshots. No mutation RPC, no fixture, 0 production contact; sessions ended through the real «Çıxış». Searching a value from a currently visible row (`Synthetic outgoing`) left **1** row — the expected one, its QEYD cell equal to the term — and recalculated the footer to `1 qeyd · mədaxil 0.00 · məxaric 3.00 · mədaxil dəyəri —`. A guaranteed non-matching value (`ZZZ-NO-SUCH-VALUE-M8SWEEP`) left **0** rows with the empty state `Qeyd yoxdur` / `Seçilmiş süzgəclərə uyğun qeyd tapılmadı.` and footer `0 qeyd · …`. Clearing the input restored the baseline table and footer **byte-identically**. Evidence: [`audits/2026-09-09-phase8-presentation-sweep-live-check.md`](../audits/2026-09-09-phase8-presentation-sweep-live-check.md) |
| M8-08 | Warehouse / type / date filters; the fixed 8-type list | 1616-1622, 1662-1666 | CODE VERIFIED (I-2) — controls ship; the warehouse select is built from ALL configured warehouses, and both date bounds are inclusive (mutation-checked). **LIVE VERIFIED (2026-09-09, presentation sweep):** on TEST `alkjjbaawmsirsfvqljm`, real React UI, freshly started verified `--mode sandbox` read-only localhost (PID 27084); DOM assertions plus independent recomputation, not screenshots. No mutation RPC, no fixture, 0 production contact; sessions ended through the real «Çıxış». The fixed **eight**-type list renders exactly (`Əvvələ qalıq, Satınalma, Yerdəyişmə, Silinmə, Sahəyə, Qaytarma, İcarə, Satış`, plus «Bütün növlər»). type=`Silinmə` → 1 row, **all rendered rows are `Silinmə`**, and `mv-export-writeoff` became enabled; type=`Yerdəyişmə` (a valid option with no visible rows) → 0 rows + empty state. warehouse=`Test Anbar` → 3 rows all `Test Anbar`; warehouse=`CODEX Phase8 Transfer Anbar` → 0 rows; the select is built from ALL configured warehouses (both active `anbar` rows), not the user's scope. **Both date bounds proved INCLUSIVE live:** `2026-09-02`→`2026-09-02` returns exactly the row dated `02.09.2026`, and `2026-09-01`→`2026-09-03` returns all three. «Sıfırla» restored the baseline byte-identically. **Not claimed:** the grouped «İstiqamət / kontragent» select, whose only live option is the empty one (every visible row has a null partner and no route) — no live fixture, and none was manufactured. Evidence: [`audits/2026-09-09-phase8-presentation-sweep-live-check.md`](../audits/2026-09-09-phase8-presentation-sweep-live-check.md) |
| M8-09 | Grouped İstiqamət/kontragent select, rebuilt from the filtered set, invalid selection reset | 1597-1655 | **LIVE VERIFIED (2026-09-09)** — [audit](../audits/2026-09-09-phase8-m8-09-m8-54-transfer-fixture-live-check.md). Proved on TEST with one reversible exact-layer transfer fixture (`SND-833CFA7E90`, 0.01 units) created and cancelled through the real React UI. The selector went 0 → **2** options, correctly grouped under «Tanınmayan / köhnə idxal» (`raws`) for this data; selecting `raw:CODEX Phase8 Transfer Anbar anbarına` through the real control narrowed the table to **exactly 1 row**, the OUT leg, whose invoice and `doc_num` match the new document. **The reset half is the core proof:** applying a type filter that legitimately removed the key from the option source auto-reset the selection to the empty value, emptied the optgroups, and re-filtered the table on the **resolved** value (1 `Silinmə` row, NOT an empty result) — control and rows never disagreed. Restoring the filter and reselecting restored the selection; after cancellation the selector returned to 0 optgroups and the table to the baseline 3 rows. Earlier evidence retained: CODE VERIFIED (I-2) — the three optgroups ship; a selection the rebuilt list no longer offers resets to «all» AND the table re-filters on the resolved value, so the control and the rows can never disagree. Mutation-checked |
| M8-10 | Sort `date desc, ts desc` | 1675 | CODE VERIFIED (I-1, rendered I-2) — `sortMovements()`, mutation-checked in I-1; I-2 adds a rendered-order assertion. **LIVE VERIFIED (2026-09-09, presentation sweep):** on TEST `alkjjbaawmsirsfvqljm`, real React UI, freshly started verified `--mode sandbox` read-only localhost (PID 27084); DOM assertions plus independent recomputation, not screenshots. No mutation RPC, no fixture, 0 production contact; sessions ended through the real «Çıxış». The contract is a **default order**, not interactive sorting, and that is what was verified — no sort affordance was invented. Rendered order `03.09.2026, 02.09.2026, 01.09.2026` is strictly descending and the table exposes **no clickable sort control** (0 header buttons). **`ts desc` is NOT promoted:** all three visible rows have distinct dates, so the live data contains no tie to exercise the `created_at` tie-break; it stays CODE VERIFIED (mutation-checked at I-1). Evidence: [`audits/2026-09-09-phase8-presentation-sweep-live-check.md`](../audits/2026-09-09-phase8-presentation-sweep-live-check.md) |
| M8-11 | 3000-row soft cap + «Hamısını göstər» | 1677-1690 | **LIVE VERIFIED (2026-09-09)** — [audit](../audits/2026-09-09-phase8-m8-11-soft-cap-live-check.md). Proved through the real React screen at the REAL `SHOW_MAX` (3000), using a **controlled browser-only presentation fixture**: 3001 rows served as an intercepted response body inside one Chrome context. **Explicitly NOT** 3001 rows stored in TEST (the real table held **105** throughout), NOT backend-volume, NOT payload-performance, and **NOT M8-53 evidence**. Only the exact full-column `movements` snapshot GET was intercepted — Auth, every `/rpc/`, `items`, `warehouses` and `writeoff_valuations` never were; paging was honoured per request (1000/1000/1000/1), so 8 intercepted requests are **4 offsets duplicated by StrictMode** = one logical load. **Cap:** full result 3001, table rendered **exactly 3000**, and the footer read `3,001 qeyd · mədaxil 3,000.00 · məxaric 1.00` — computed from the FULL filtered set, not the capped slice (the `məxaric 1.00` comes from the single row the cap hides, which a slice-based footer could not have counted). **Control:** `Hamısını göstər (3,001)` with the `· 3,000 göstərilir` notice; **absent** at exactly SHOW_MAX (type=`Satınalma` → 3000) and below (type=`Silinmə` → 1), and it RETURNED when the filter was cleared. **Expansion** through the real visible button (store never set directly, no internal helper called): **3001** DOM rows, footer unchanged, control gone. **Stickiness:** after expanding, filtering to `Satınalma` rendered 3000 uncapped, then the real «Sıfırla» returned 3001 with **all 3001 still rendered** — the page did not revert to the cap. Navigation/remount persistence was NOT tested because the ledger does not require it. **Falsifiable ID accounting** (DOM `Qeyd` column vs the independently generated set): 0 missing, 0 unexpected, 0 duplicates in every leg, and **exactly 1 row** revealed by expansion. **Recovery:** interception removed, real remount restored the baseline **3** rows with a byte-identical footer, no synthetic identity and no error banner. 0 production contact, no mutation RPC, no fixture write, no code change. Earlier evidence retained: CODE VERIFIED (I-2) — the button ships and the choice is sticky across filter changes and «Sıfırla», matching the legacy global. Tested against the REAL `SHOW_MAX`, not a reduced stand-in |
| M8-12 | Footer KPI line: count, inbound, outbound, inbound value | 1796, 1826-1828 | CODE VERIFIED (I-2) — computed over the FULL filtered set, never the capped slice; mutation-checked (the wrong version reports 3.000 of 3.001 rows). **LIVE VERIFIED (2026-09-09, presentation sweep):** on TEST `alkjjbaawmsirsfvqljm`, real React UI, freshly started verified `--mode sandbox` read-only localhost (PID 27084); DOM assertions plus independent recomputation, not screenshots. No mutation RPC, no fixture, 0 production contact; sessions ended through the real «Çıxış». The KPI numbers were computed **independently** from the raw snapshot response (`count`, `Σ in_qty`, `Σ out_qty`, `Σ in_qty × (price \|\| item.price \|\| 0)`), the application never being asked for them. Baseline `{count:3, in:11, out:3, value:111}` → `3 qeyd · mədaxil 11.00 · məxaric 3.00 · mədaxil dəyəri 111.00 ₼`, matching the DOM exactly; after type=`Silinmə`, `{count:1, in:0, out:3, value:0}` → `1 qeyd · mədaxil 0.00 · məxaric 3.00 · mədaxil dəyəri —`, also exact — so the line **recalculates on filter change** and the zero inbound value correctly renders the em-dash. A first comparison reported a mismatch and was **investigated rather than reported as a defect**: Node and Chrome render `az-AZ` decimals differently (comma vs dot), so the expected STRING was wrong, not the app; only formatting was then delegated to the browser's own ICU while the arithmetic stayed independent. No application change. Evidence: [`audits/2026-09-09-phase8-presentation-sweep-live-check.md`](../audits/2026-09-09-phase8-presentation-sweep-live-check.md) |
| M8-13 | «Yeni əməliyyat» button — plain navigation, no prefill | 321, 1363 | CODE VERIFIED (I-2) — a plain page switch; no prefill, no draft seeding, no state transfer, deliberately unlike the Nomenklatura handoff. **LIVE VERIFIED (2026-09-09, presentation sweep):** on TEST `alkjjbaawmsirsfvqljm`, real React UI, freshly started verified `--mode sandbox` read-only localhost (PID 27084); DOM assertions plus independent recomputation, not screenshots. No mutation RPC, no fixture, 0 production contact; sessions ended through the real «Çıxış». Clicking the real header button opened the **«Yeni əməliyyat»** page and moved the rail active state to that entry. **No operation was submitted.** The only prefilled input was the form's own date field (today, `2026-09-09`) — no movement data crossed over, matching «plain page switch, no prefill, no draft seeding». Navigating back to «Mal hərəkəti» restored the snapshot **byte-identically** (rows and footer). Evidence: [`audits/2026-09-09-phase8-presentation-sweep-live-check.md`](../audits/2026-09-09-phase8-presentation-sweep-live-check.md) |
| M8-14 | Realtime `movements` subscription and debounced refresh | — | CODE VERIFIED (I-2) — `useRealtimeRefresh` on the `movements` table, reusing the 400 ms debounce the hook already owns; a test asserts the page does NOT override it. **LIVE VERIFIED (2026-09-09) with a REAL TEST `postgres_changes` event.** On TEST `alkjjbaawmsirsfvqljm`: a read-only observer session on «Mal hərəkəti» (5175, writes disabled) proved the channel reached `system/ok` **«Subscribed to PostgreSQL»** (+8062 ms) with the app's own `sinxron` indicator. A SEPARATE authenticated writer on a temporary write-enabled process (5176) posted an exact-layer 0.01 transfer via ONE supported RPC `post_layer_transfer_document` → `SND-8DC5E59E8D`, whose two legs (`out ad4e3d8a…`, `in e3cf6955…`) produced **two real `postgres_changes` INSERTs on `movements` at the same millisecond (81574 ms, commit `13:48:14.663Z`), carrying exactly those two ids**. The observer then showed: **no** movements request before the debounce, and **exactly one** logical refresh GET at 82013 ms = **439 ms after the last event** — two events coalesced into ONE refresh. StrictMode is accounted for: the 4 baseline GETs are 2 logical loads doubled by double-mount, while the debounced refresh fires from a `setTimeout` outside the mount cycle and is NOT doubled (5 GETs total). Both new legs became visible with no manual refresh, reload or navigation, and the heading/registry/indicator state stayed intact. Closed via the real «Yerdəyişməni ləğv et» → `cancel_layer_transfer_document` → `SND-R-2550716DCD`; balances, exact layer `fcb7f7b1…` (avail 1 @ 15 known) and layer version 36 returned to baseline, 0 negatives, movements 109→113 (immutable audit rows retained). 0 production contacts. Evidence: [`audits/2026-09-09-phase8-m8-14-realtime-debounce-live-check.md`](../audits/2026-09-09-phase8-m8-14-realtime-debounce-live-check.md) |
| M8-15 | `editMov()` four-way dispatcher, including the unsupported-type refusal | 5506-5512 | **PARTIALLY LIVE VERIFIED, narrow TEST-admin scope (2026-09-08).** The real `Baxış` control on a visible legacy `Alış` row produced the exact unsupported immutable-record refusal and no false dialog. Real numbered ordinary/transfer rows opened their respective document views, a document-less ordinary fixture opened `Köhnə əməliyyat`, and a document-less transfer pair opened `Köhnə yerdəyişmə`. All four dispatcher destinations therefore have narrow TEST-admin live evidence. Other roles, stale/concurrent state and broader data shapes remain outside this evidence. Evidence: [`audits/2026-09-08-phase8-replacement-preflight-live-check.md`](../audits/2026-09-08-phase8-replacement-preflight-live-check.md), [`audits/2026-09-08-phase8-m8-25-transfer-cancel-live-check.md`](../audits/2026-09-08-phase8-m8-25-transfer-cancel-live-check.md), [`audits/2026-09-08-phase8-m8-29-legacy-cancel-live-check.md`](../audits/2026-09-08-phase8-m8-29-legacy-cancel-live-check.md), [`audits/2026-09-08-phase8-m8-29-legacy-transfer-live-check.md`](../audits/2026-09-08-phase8-m8-29-legacy-transfer-live-check.md) |
| M8-16 | `documentCancelView`: preview, `docRefsLine`, status branches | 5012-5087 | **CODE VERIFIED (I-3/I-4/I-6), with narrow ordinary TEST-admin live evidence.** Grouping on `doc_num` AND type, `stripRowLevelCancelled()`, the separated system number, `docRefsLine()`, line table and status branches remain verified. The historical I-3 statement that cancellation/edit/row controls were not implemented is superseded: the admin cancellation branch, reversal-date input, document edit, replacement and row-cancel controls are implemented and share the current eligibility gates. Ordinary non-layer cancellation, replacement, row cancellation and correction paths have partial live evidence; transfer/layer/role/failure branches remain open. |
| M8-17 | `transferDocView`: outbound-leg-only preview, route display | 5209-5263 | **PARTIALLY LIVE VERIFIED for a TEST-admin transfer document (2026-09-08).** `SND-3550711E4C` opened the transfer-specific view, rendered only its outbound leg, showed the reverse-transfer explanation/date/action and exposed neither replacement nor row-cancel controls. The fixture name ending in `Anbar` intentionally revealed the same one-pass legacy normalisation edge in both implementations, producing `Test Anbar → —`; this is parity, not a React regression. Reversal/already-cancelled display branches, roles and layer mode remain CODE VERIFIED only. Evidence: [`audits/2026-09-08-phase8-m8-25-transfer-cancel-live-check.md`](../audits/2026-09-08-phase8-m8-25-transfer-cancel-live-check.md) |
| M8-18 | `legacyCancelView` (doc-less ordinary) | 5264-5285 | **PARTIALLY LIVE VERIFIED for TEST admin, layers inactive (2026-09-08).** A real `doc_num = null` `Satınalma` fixture opened the `Köhnə əməliyyat` view with system document `—`, the original row, storno explanation, replacement control and whole-operation cancellation action, but no row-cancel control. Submitting the real action retained the original and created a separately numbered equal/opposite row marked `Ləğv ID: <source id>`. Per-id already-cancelled/reversal presentation, layer mode, roles, refusals and concurrency remain open. Evidence: [`audits/2026-09-08-phase8-m8-29-legacy-cancel-live-check.md`](../audits/2026-09-08-phase8-m8-29-legacy-cancel-live-check.md) |
| M8-19 | `legacyTransferCancelView` (doc-less transfer) | 5286-5308 | **PARTIALLY LIVE VERIFIED for TEST admin, layers inactive (2026-09-08).** A unique two-leg `doc_num = null` transfer fixture opened the `Köhnə yerdəyişmə` view with the source row, server pair/refusal explanation, default reversal date and whole-transfer action. The action created an equal/opposite two-leg reverse document and hid both source legs from the effective registry. The route displayed the already documented legacy one-pass suffix edge for a warehouse whose name ends in `Anbar`; this is parity. Other roles, layer mode, already-cancelled UI presentation, ambiguous/zero-pair, stock, stale and concurrency branches remain open. Evidence: [`audits/2026-09-08-phase8-m8-29-legacy-transfer-live-check.md`](../audits/2026-09-08-phase8-m8-29-legacy-transfer-live-check.md) |
| M8-20 | `stripRowLevelCancelled` in every document view | 4934-4941 | **PARTIALLY LIVE VERIFIED for a TEST-admin ordinary document (2026-09-09).** A real row cancellation emptied `SND-17FAC1216F`; the refreshed card rendered zero visible rows and explicitly stated that the rows were separately cancelled while the document itself was not cancelled. Other views/roles remain CODE VERIFIED. [Live evidence](../audits/2026-09-09-phase8-m8-20-m8-46-react-row-double-submit-live-check.md). |
| M8-21 | Reversal-document detection — a reversal cannot be re-cancelled | 4877-4881, 4894-4898 | **PARTIALLY LIVE VERIFIED for TEST admin (2026-09-08).** Each family uses its own marker helper, the reversal branch wins over the cancelled branch, and the I-4 gate removes/disables actions and re-checks at submit. A live batch audit found that the generated `SND-LR-*` counter from a document-less legacy transfer used `Ləğv (əks yerdəyişmə) ID:` and was incorrectly selectable because only the numbered-transfer `...):` form was recognised. Both state and batch matchers now cover the two server transfer-counter shapes; 270 focused/expanded tests and the production build pass. The same real document then rendered disabled as `Əks/ləğv sənədi — ləğv edilmir`; no submit occurred. A later STATIC cross-check of the SQL artifacts proved the server writes exactly four marker shapes, that every `cancel_layer_*` function delegates its movement write to the non-layer function and so adds no marker shape, and that the shipped client matchers recognise all four with no accidental near-miss matches. Other roles, stale/transport/concurrency and direct re-cancellation refusal remain open. Evidence: [`audits/2026-09-08-phase8-marker-contract-crosscheck.md`](../audits/2026-09-08-phase8-marker-contract-crosscheck.md), [`audits/2026-09-08-phase8-m8-21-m8-30-legacy-reversal-classification-live-check.md`](../audits/2026-09-08-phase8-m8-21-m8-30-legacy-reversal-classification-live-check.md) |
| M8-22 | Already-cancelled display with the reversal doc number | 4870-4876, 4886-4893 | **PARTIALLY LIVE VERIFIED for an ordinary TEST-admin document (2026-09-09).** After a two-tab cancellation race, the peer card refreshed to `Ləğv edilib · əks sənəd: SND-C-56395DEBD0` and exposed no cancellation action. Transfer/legacy views and the legacy `—` fallback remain CODE VERIFIED. [Live evidence](../audits/2026-09-09-phase8-m8-47-react-submit-gate-live-check.md). |
| M8-23 | Reversal-date input; omitted when blank so the server default applies | 5072 | **PARTIALLY LIVE VERIFIED for ordinary non-layer TEST admin (2026-09-08).** The earlier preflight proved the control renders defaulted to `2026-09-08`. A later real cancellation of `SND-76074E451C` was submitted with the field visibly empty; the code-verified API omission path dispatched and direct TEST read-back proved reversal `SND-C-2D6E6E714D` received server date `2026-09-08` while the original remained unchanged. Other families, roles, layer routing, refusals and failure/concurrency remain open. Evidence: [`audits/2026-09-08-phase8-replacement-preflight-live-check.md`](../audits/2026-09-08-phase8-replacement-preflight-live-check.md), [`audits/2026-09-08-phase8-m8-23-blank-reversal-date-live-check.md`](../audits/2026-09-08-phase8-m8-23-blank-reversal-date-live-check.md) |
| M8-24 | Ordinary family: `cancel_document` / `cancel_layer_document` | 5060-5080 | **PARTIALLY LIVE VERIFIED (2026-09-08, TEST admin, both non-layer and layer server variants)** — non-layer successes and validation/refusal groups retained originals and avoided partial writes. Layer success retained the source, added one reversal and consumed its layer. Two concurrent layer cancellations produced one success, one refusal and exactly one reversal. A two-unit receipt whose exact layer had one unit consumed returned the exact used-layer P0001; count stayed 59→59, no marker appeared and the layer remained 1/active. These layer calls were direct RPCs, not React UI evidence. Mixed document/other stock shapes, roles, stale/transport/unknown-outcome remain open. Evidence: [`audits/2026-09-08-phase8-m8-23-blank-reversal-date-live-check.md`](../audits/2026-09-08-phase8-m8-23-blank-reversal-date-live-check.md), [`audits/2026-09-08-phase8-m8-24-m8-25-recancel-refusal-live-check.md`](../audits/2026-09-08-phase8-m8-24-m8-25-recancel-refusal-live-check.md), [`audits/2026-09-08-phase8-m8-24-m8-25-validation-refusals-live-check.md`](../audits/2026-09-08-phase8-m8-24-m8-25-validation-refusals-live-check.md), [`audits/2026-09-08-phase8-layer-cutover-and-cancellation-live-check.md`](../audits/2026-09-08-phase8-layer-cutover-and-cancellation-live-check.md), [`audits/2026-09-08-phase8-m8-24-layer-cancel-concurrency-live-check.md`](../audits/2026-09-08-phase8-m8-24-layer-cancel-concurrency-live-check.md), [`audits/2026-09-08-phase8-m8-24-layer-document-stock-refusal-live-check.md`](../audits/2026-09-08-phase8-m8-24-layer-document-stock-refusal-live-check.md) |
| M8-25 | Transfer family: `cancel_transfer_document` (`p_original_doc_num`) and `cancel_layer_transfer_document` (**`p_doc_num`**) as SEPARATE typed functions — includes deviation `D-I1`, mutation-checked | 5249-5251 | **PARTIALLY LIVE VERIFIED for both transfer server variants and the exact-layer React route, TEST admin (2026-09-09).** Non-layer and exact-layer successes retained both source legs and added two-leg reversals; read-back proved source restoration, destination consumption and reversed links. Concurrent exact cancellation produced one success, one already-cancelled P0001 and only one reversal. A two-unit exact transfer whose destination layer had one unit consumed returned the exact destination-used P0001; count stayed 64→64, layer stayed 1/active and link unreversed. Direct validation/refusal groups wrote nothing. The 2026-09-09 React run created `SND-456860F655`, cancelled it from its real transfer card to `SND-R-C1D167C46E`, and proved count 85→89, reversed link, source exact layer 1/active, destination child 0/inactive and balances 8/0. This supersedes the prior browser/session blocker for that narrow route. Malformed legs/other stock shapes, roles, stale/transport/unknown-outcome and non-layer concurrency remain open. Evidence: [`audits/2026-09-08-phase8-m8-25-transfer-cancel-live-check.md`](../audits/2026-09-08-phase8-m8-25-transfer-cancel-live-check.md), [`audits/2026-09-08-phase8-m8-24-m8-25-recancel-refusal-live-check.md`](../audits/2026-09-08-phase8-m8-24-m8-25-recancel-refusal-live-check.md), [`audits/2026-09-08-phase8-m8-24-m8-25-validation-refusals-live-check.md`](../audits/2026-09-08-phase8-m8-24-m8-25-validation-refusals-live-check.md), [`audits/2026-09-08-phase8-layer-cutover-and-cancellation-live-check.md`](../audits/2026-09-08-phase8-layer-cutover-and-cancellation-live-check.md), [`audits/2026-09-08-phase8-m8-25-layer-transfer-concurrency-live-check.md`](../audits/2026-09-08-phase8-m8-25-layer-transfer-concurrency-live-check.md), [`audits/2026-09-08-phase8-m8-25-layer-transfer-stock-refusal-live-check.md`](../audits/2026-09-08-phase8-m8-25-layer-transfer-stock-refusal-live-check.md), [`audits/2026-09-09-phase8-m8-25-m8-26-react-layer-transfer-live-check.md`](../audits/2026-09-09-phase8-m8-25-m8-26-react-layer-transfer-live-check.md). |
| M8-26 | Layer-variant RPC selection driven by the live capability flag; the argument name follows the chosen RPC, never the family | 833, 949-957 | **PARTIALLY LIVE VERIFIED for ordinary, row, batch and transfer React routing, TEST admin (2026-09-09).** With capability active/version 36, real React actions cancelled an ordinary document, an exact receipt row, a two-document batch and an exact-layer transfer. The 2026-09-09 transfer card produced `SND-R-C1D167C46E`; authenticated read-back showed the layer-transfer-only consequences (reversed link, exact source restored, destination child consumed), confirming `cancel_layer_transfer_document(p_doc_num, ...)`. Legacy React routing, allocated-writeoff row routing, other roles and stale/unknown capability remain CODE VERIFIED only. Evidence: [`audits/2026-09-08-phase8-layer-cutover-and-cancellation-live-check.md`](../audits/2026-09-08-phase8-layer-cutover-and-cancellation-live-check.md), [`audits/2026-09-08-phase8-m8-26-m8-38-react-layer-routing-live-check.md`](../audits/2026-09-08-phase8-m8-26-m8-38-react-layer-routing-live-check.md), [`audits/2026-09-08-phase8-m8-27-react-layer-row-cancel-live-check.md`](../audits/2026-09-08-phase8-m8-27-react-layer-row-cancel-live-check.md), [`audits/2026-09-08-phase8-m8-30-m8-32-react-layer-batch-live-check.md`](../audits/2026-09-08-phase8-m8-30-m8-32-react-layer-batch-live-check.md), [`audits/2026-09-09-phase8-m8-25-m8-26-react-layer-transfer-live-check.md`](../audits/2026-09-09-phase8-m8-25-m8-26-react-layer-transfer-live-check.md). |
| M8-27 | Row cancellation: `cancel_movement_row` / layer variant, mandatory reason | 5088-5122 | **PARTIALLY LIVE VERIFIED for TEST admin, both non-layer and layer React success branches (2026-09-08).** The non-layer UI success retained its source and added an equal counter-entry; direct validations covered transfer, unsupported type, whitespace reason and absent movement. With layers active, a real React exact-receipt row cancellation required a reason, reported success, retained the open document with zero effective lines and produced exactly one same-document counter-row (84→85), preserving price/invoice and consuming its layer 1→0. Direct layer RPC success also covered an allocated `Silinmə` reversal with allocation/valuation links, while a partially used receipt produced the stock-safety P0001. Allocated-writeoff React routing, other roles, stale UI, transport/unknown outcome, concurrency and independently readable audit consequences remain open. Evidence: [`audits/2026-09-08-phase8-replacement-preflight-live-check.md`](../audits/2026-09-08-phase8-replacement-preflight-live-check.md), [`audits/2026-09-08-phase8-m8-27-row-cancel-live-check.md`](../audits/2026-09-08-phase8-m8-27-row-cancel-live-check.md), [`audits/2026-09-08-phase8-m8-27-layer-row-cancel-live-check.md`](../audits/2026-09-08-phase8-m8-27-layer-row-cancel-live-check.md), [`audits/2026-09-08-phase8-m8-27-react-layer-row-cancel-live-check.md`](../audits/2026-09-08-phase8-m8-27-react-layer-row-cancel-live-check.md), [`audits/2026-09-08-phase8-m8-27-m8-28-transfer-refusal-live-check.md`](../audits/2026-09-08-phase8-m8-27-m8-28-transfer-refusal-live-check.md), [`audits/2026-09-08-phase8-m8-27-m8-28-unsupported-type-refusal-live-check.md`](../audits/2026-09-08-phase8-m8-27-m8-28-unsupported-type-refusal-live-check.md), [`audits/2026-09-08-phase8-m8-27-m8-28-validation-refusals-live-check.md`](../audits/2026-09-08-phase8-m8-27-m8-28-validation-refusals-live-check.md) |
| M8-28 | Item replacement: `replace_movement_item`, mandatory reason, no layer variant | 4942-5011 | **PARTIALLY LIVE VERIFIED for TEST admin (2026-09-08).** The preflight verified picker/reason gating; a real layers-inactive execution retained the original and added old-item counter plus new-item replacement rows with preserved fields. Direct calls proved exact no-write P0001 backstops for transfer exclusion, unsupported `Alış`, whitespace reason, absent movement, same item and absent new item. A real layers-active submission then returned the layer-selection P0001 with count 76→76, no reason marker and its source layer unchanged; the impossible UI affordance was fixed so replacement renders only after a successful inactive-capability probe. Real React follow-up showed no replacement button, retained layer-aware row cancellation and displayed the safe cancel/re-post explanation; 64 focused tests and the production build passed. Stale transitions, document-specific lot exclusion, non-admin roles, transport/unknown outcomes, concurrency and independently readable audit consequences remain open. Evidence: [`audits/2026-09-08-phase8-replacement-preflight-live-check.md`](../audits/2026-09-08-phase8-replacement-preflight-live-check.md), [`audits/2026-09-08-phase8-m8-28-replacement-live-check.md`](../audits/2026-09-08-phase8-m8-28-replacement-live-check.md), [`audits/2026-09-08-phase8-m8-28-layer-replacement-ui-check.md`](../audits/2026-09-08-phase8-m8-28-layer-replacement-ui-check.md), [`audits/2026-09-08-phase8-m8-27-m8-28-transfer-refusal-live-check.md`](../audits/2026-09-08-phase8-m8-27-m8-28-transfer-refusal-live-check.md), [`audits/2026-09-08-phase8-m8-27-m8-28-unsupported-type-refusal-live-check.md`](../audits/2026-09-08-phase8-m8-27-m8-28-unsupported-type-refusal-live-check.md), [`audits/2026-09-08-phase8-m8-27-m8-28-validation-refusals-live-check.md`](../audits/2026-09-08-phase8-m8-27-m8-28-validation-refusals-live-check.md) |
| M8-29 | Legacy cancellations: `cancel_legacy_movement` / `cancel_legacy_transfer` + layer variants | 5264-5308 | **PARTIALLY LIVE VERIFIED for both non-layer successes plus layer-legacy ordinary success/refusal, TEST admin (2026-09-08).** Ordinary and transfer non-layer runs retained their document-less sources and created expected reversals; validation calls covered already-cancelled, wrong-family, numbered and absent rows. With layers active, direct `cancel_layer_legacy_movement` succeeded against a document-less item backed by sufficient unresolved stock: source retained, one reversal added, legacy layer 8→7, exact receipt layer 1 retained and total layers reconciled to balance 8. A separate item lacking unresolved stock returned the exact shortage P0001 without a reversal. Layer-legacy transfer success, zero/ambiguous-pair, other stock shapes, roles, UI routing, stale/transport/unknown-outcome, refresh and concurrency remain open. Evidence: [`audits/2026-09-08-phase8-m8-29-legacy-cancel-live-check.md`](../audits/2026-09-08-phase8-m8-29-legacy-cancel-live-check.md), [`audits/2026-09-08-phase8-m8-29-legacy-transfer-live-check.md`](../audits/2026-09-08-phase8-m8-29-legacy-transfer-live-check.md), [`audits/2026-09-08-phase8-m8-29-validation-refusals-live-check.md`](../audits/2026-09-08-phase8-m8-29-validation-refusals-live-check.md), [`audits/2026-09-08-phase8-m8-29-layer-legacy-stock-refusal-live-check.md`](../audits/2026-09-08-phase8-m8-29-layer-legacy-stock-refusal-live-check.md), [`audits/2026-09-08-phase8-m8-29-layer-legacy-success-live-check.md`](../audits/2026-09-08-phase8-m8-29-layer-legacy-success-live-check.md) **2026-09-09 continuation:** the remaining layer-legacy TRANSFER success path is now understood as BLOCKED BY DESIGN on this TEST baseline, not outstanding. `apply_legacy_layer_delta` must consume `legacy_unresolved`/`legacy_adjustment` stock at the DESTINATION, and `guard_and_capture_stock_layer_movement` refuses any `out_qty>0` insert while layers are active and converts `in_qty>0` inserts into `receipt` layers, so the required document-less pair cannot be created. A single authorized outbound-leg INSERT returned the exact guard P0001 and wrote nothing (count 89→89, zero probe rows/layers). Reaching this branch needs a fresh cutover seeding unresolved stock in a second warehouse — an owner decision, not taken autonomously. See [`audits/2026-09-09-phase8-m8-29-layer-legacy-transfer-structural-block.md`](../audits/2026-09-09-phase8-m8-29-layer-legacy-transfer-structural-block.md). |
| M8-30 | `buildBatchDocs()` eligibility matrix, identical to `cancel_documents_batch` | 5364-5372 | **PARTIALLY LIVE VERIFIED for TEST admin (2026-09-08).** `D3` is INCLUDED. The real React matrix listed two fresh exact receipts as selectable while retaining ineligible history with explicit reasons; selection count and the detailed all-or-nothing confirmation were observed. Direct validation calls proved exact no-write refusals, and a mixed layer batch dispatched ordinary plus transfer families in order. A later live matrix audit found generated legacy-transfer counter `SND-LR-AE5EEE3FF0` incorrectly selectable because its `... ID:` marker was absent from the client matcher. The matcher and document-state helper were corrected and regression-tested; the same live row then remained visible but disabled with the reversal reason. The same static cross-check additionally pinned the ordinary sibling shape: the numbered `SND-L-*` document that `cancel_legacy_movement` creates is kept out of the matrix by `stripRowLevelCancelled()` (legacy 5330), not by the reversal matcher, and a mutation-checked regression test now covers that real shape. Remaining balance/ambiguous shapes, roles and stale/transport states remain open. Evidence: [`audits/2026-09-08-phase8-marker-contract-crosscheck.md`](../audits/2026-09-08-phase8-marker-contract-crosscheck.md), [`audits/2026-09-08-phase8-m8-30-m8-32-batch-validation-refusals-live-check.md`](../audits/2026-09-08-phase8-m8-30-m8-32-batch-validation-refusals-live-check.md), [`audits/2026-09-08-phase8-m8-30-m8-32-mixed-layer-batch-live-check.md`](../audits/2026-09-08-phase8-m8-30-m8-32-mixed-layer-batch-live-check.md), [`audits/2026-09-08-phase8-m8-30-m8-32-react-layer-batch-live-check.md`](../audits/2026-09-08-phase8-m8-30-m8-32-react-layer-batch-live-check.md), [`audits/2026-09-08-phase8-m8-21-m8-30-legacy-reversal-classification-live-check.md`](../audits/2026-09-08-phase8-m8-21-m8-30-legacy-reversal-classification-live-check.md) **2026-09-09 continuation:** the LAYER batch's own server validation is now live-proven. `cancel_layer_documents_batch` returned exact P0001 for null/empty array (`Sənəd seçilməyib`), blank and whitespace-only entries (`Etibarsız sənəd nömrəsi`), a missing document (`Sənəd tapılmadı: …`) and an existing reversal document. Whitespace normalisation (`btrim` before the emptiness test) and deduplication (a repeated missing document yields exactly ONE refusal, proving `SELECT DISTINCT`) are demonstrated rather than assumed. Recorded divergence, not a defect: an empty selection returns `Ləğv üçün heç bir sənəd seçilməyib` from the non-layer `cancel_documents_batch` but `Sənəd seçilməyib` from the layer variant; the 2026-09-08 texts were the non-layer path. See [`audits/2026-09-09-phase8-m8-30-m8-32-layer-batch-server-refusals.md`](../audits/2026-09-09-phase8-m8-30-m8-32-layer-batch-server-refusals.md). |
| M8-31 | Batch search, filters and selection | 5309-5505 | **PARTIALLY LIVE VERIFIED for TEST admin across all six control families (2026-09-08).** Real read-only React checks covered document search, item code/name search, date bounds, warehouse, type and selection. Equal start/end bounds retained the boundary-date document; a later lower bound and an earlier upper bound each excluded it. Selecting `TEST-OUT-1`, filtering to no results and restoring the filter retained the independent count and checked state. Combined `Test Anbar + Silinmə` retained the expected document. The real type selector exposed only `Yerdəyişmə` plus cancellable types and omitted unsupported `Sifariş`, confirming the legacy option-list quirk. No mutation was submitted. Broader combined matrices, other roles and stale refresh remain open. Evidence: [`audits/2026-09-08-phase8-m8-31-batch-search-selection-live-check.md`](../audits/2026-09-08-phase8-m8-31-batch-search-selection-live-check.md) |
| M8-32 | Batch atomic execute + all-or-nothing failure message | 5440-5505 | **PARTIALLY LIVE VERIFIED (2026-09-09, TEST admin).** Non-layer and layer React successes, server rollback/mixed dispatch and exact layer validation refusals are covered by the linked earlier audits. A real two-document layer-active React batch double-click additionally produced exactly one reversal per source and no duplicates, closing the narrow same-control UI-concurrency branch. **BOTH HALVES OF THE APPROVED CONTRACT ARE NOW EVIDENCED (2026-09-09).** The approved proposal states this row as exactly "Batch atomic execute + all-or-nothing failure message". *Atomic execute* is proved server-side (valid document FIRST, absent document second → `P0001` and an authenticated read-back showing the valid document unchanged with no reversal row — a real rollback), plus the layer variant's own validation branches. *All-or-nothing failure message* is now proved in the REAL dialog: the confirmation step rendered «…Hər hansı sənəd ləğv edilə bilməzsə, heç bir sənəd ləğv olunmur», and submitting produced the live toast «**Qrup üzrə ləğv baş tutmadı:** … **— heç bir sənəd ləğv edilmədi**», exactly `rejectedMessage()` (`batchOutcome.ts:365-367`) with the refusal echoed between the fixed halves. 0 batch RPCs left the browser, which additionally confirms M8-48/M8-49 for `doc.cancel-batch` on a real screen. **Negative control NOT claimed and the reason is recorded**: the write guard short-circuits before the network, so a transport-abort mode produced the identical message and could not discriminate `rejected` from `unknown`. `UNKNOWN_OUTCOME_MESSAGE`/`REFRESH_FAILED_MESSAGE` stay CODE VERIFIED (covered by `batchOutcome.test.ts`) and are **not part of this row's approved contract**. [Message evidence](../audits/2026-09-09-phase8-m8-32-all-or-nothing-message-live.md). Roles and independent multi-tab batch concurrency are scope notes beyond the approved one-line contract, not acceptance blockers. [Batch double-click evidence](../audits/2026-09-09-phase8-m8-46-react-batch-double-submit-live-check.md); [layer server refusals](../audits/2026-09-09-phase8-m8-30-m8-32-layer-batch-server-refusals.md); [prior React layer batch](../audits/2026-09-08-phase8-m8-30-m8-32-react-layer-batch-live-check.md). |
| M8-33 | `document_edit_impact()` caller — closes `M7-109`'s deferred half | 5124-5205 | **PARTIALLY LIVE VERIFIED (2026-09-08, TEST admin ordinary non-layer correction)** — the caller loaded `SND-5DE0837805`, mapped it into edit mode and `correct_document` produced reversal `SND-C-B48FFF4DBE` plus replacement `SND-12B8BCDD3A`. A read-only follow-up called the same real UI path for `SND-76074E451C` and received `editable:false` because later same-warehouse/item movements exist. This live-closes only M7-109's ordinary caller path; malformed/transport, layer/transfer and role branches remain open. Evidence: [`audits/2026-09-08-phase8-correction-not-editable-live-check.md`](../audits/2026-09-08-phase8-correction-not-editable-live-check.md) |
| M8-34 | Not-editable block list rendering | 5150-5170 | **PARTIALLY LIVE VERIFIED, narrow TEST-admin scope (2026-09-08).** The real `SND-76074E451C` impact modal rendered seven server-provided later-movement reasons and did not navigate or replace a draft. CODE VERIFIED (I-6) still covers message→code→`—` fallback and the fail-closed malformed-empty-list branch; those fallback/malformed cases are not live verified. Evidence: [`audits/2026-09-08-phase8-correction-not-editable-live-check.md`](../audits/2026-09-08-phase8-correction-not-editable-live-check.md) |
| M8-35 | Editable confirmation modal + `export_warning` with the legacy fallback | 5170-5190 | CODE VERIFIED (I-6) — states «Bazada heç nə dəyişməyəcək»; `exportWarningOf()` falls back to the legacy sentence. ADDITION: warns before replacing an existing draft (approved deviation) |
| M8-36 | Line→draft mapping, `EDIT_REPLACES_MARKER` stripping, `restore` map from `out_qty` | 5124-5205 | CODE VERIFIED (I-6) — `mapImpact()`. Quantity from `in_qty` else `out_qty`; marker stripped once; `restore` built from `out_qty` for OUTBOUND documents only and accumulated per `w\|c`. The impact contract is VALIDATED first (`readImpactContract`): the API layer only casts, so a malformed payload would otherwise replace a draft with garbage. All-or-nothing on lines — a partial map would post a document missing rows |
| M8-37 | Edit-mode transition: header seed, draft cleared, direction tab, navigate | 5190-5205 | CODE VERIFIED (I-6) — store FIRST, `setPage('op')` second (the Nomenklatura order). `enterEditMode` now merges over `emptyHeader()`, NOT the current header: it previously inherited a previous draft's Qaimə №, contract, note and price. The persisted draft is removed by `saveDraftNow` (`shouldSaveDraft` is false in edit mode) — no second clearing call was added |
| M8-38 | Layers-active → direct edit refused; «Sənədi redaktə et» not rendered | 5085 | **LIVE VERIFIED for the TEST-admin layers-active document-dialog branch (2026-09-08).** The real dialog displayed the layer warning, omitted `Sənədi redaktə et` entirely and retained safe cancellation. Earlier direct evidence showed `document_edit_impact` can still return `editable:true`, while `correct_document` returns the layer-selection P0001 with no write, confirming the independent capability gate. Other roles and UNKNOWN/failed capability remain CODE VERIFIED only. Evidence: [`audits/2026-09-08-phase8-m8-38-layer-edit-refusal-live-check.md`](../audits/2026-09-08-phase8-m8-38-layer-edit-refusal-live-check.md), [`audits/2026-09-08-phase8-m8-26-m8-38-react-layer-routing-live-check.md`](../audits/2026-09-08-phase8-m8-26-m8-38-react-layer-routing-live-check.md) |
| M8-39 | One-document-at-a-time edit-mode guard | 5124-5140 | CODE VERIFIED (I-6) — a second document is refused naming the one in edit mode; re-entering the SAME document is permitted, as legacy permits it. **UNEXERCISED in the current TEST configuration — OWNER SCOPE DECISION REQUIRED (2026-09-09, corrected after Codex independent review).** Edit mode cannot be entered while stock layers are active: `canEditDocument()` refuses `layer-active` (`web/src/lib/documentEdit.ts:105`) before the one-document guard is ever consulted, so M8-39's actual contract — *a second document refused BY NAME while a first is in edit mode* — is never reached here. **A retracted earlier note claimed this was proven on transfer `SND-8DC5E59E8D`; that attribution was invalid**, because `canEditDocument()` refuses `!isOrdinaryDoc` three checks BEFORE the layer branch and `canReplaceItems()` rejects transfer kinds unconditionally (`documentCancelGate.ts:136`), so a transfer card shows no such controls even with layers INACTIVE. M8-38's active-layer refusal is satisfied by the ordinary-document evidence, but **a gate cannot silently replace a separate approved contract**: restricting M8-39 acceptance to the active-layer configuration is an explicit owner decision. Reaching the branch would require layer deactivation, which is out of scope (it would destroy the evidence baseline). Row remains CODE VERIFIED. Evidence: [`audits/2026-09-09-phase8-layer-gate-correction-replacement-boundary.md`](../audits/2026-09-09-phase8-layer-gate-correction-replacement-boundary.md) |
| M8-40 | Admin-only gates client-side, with the server refusal surfaced verbatim | 640-645 | **PARTIALLY LIVE VERIFIED (2026-09-09).** A dedicated TEST `anbardar` called `cancel_layer_documents_batch`; the server returned HTTP 400 / `P0001`, exact message `Yalnız Admin sənədləri ləğv edə bilər`, and the movement count stayed 101→101. Document, row, replacement and batch client gates remain CODE VERIFIED (I-4/I-5), including independent submit-handler re-checks and verbatim server errors. This live probe covers the representative layer-batch server refusal, not every mutation RPC. [Evidence](../audits/2026-09-09-phase8-m8-40-m8-42-m8-43-role-rls-live-check.md) |
| M8-41 | Screen itself ungated for all roles | 1495-1503 | CODE VERIFIED (I-2) — the rail entry carries no role gate; asserted for `admin`, `rehber` and `anbardar`, and mutation-checked against an `isAdmin()` wrapper. **LIVE VERIFIED (2026-09-09, presentation sweep):** on TEST `alkjjbaawmsirsfvqljm`, real React UI, freshly started verified `--mode sandbox` read-only localhost (PID 27084); DOM assertions plus independent recomputation, not screenshots. No mutation RPC, no fixture, 0 production contact; sessions ended through the real «Çıxış». Live role observation, run sequentially in a **fresh browser context per role**, each ended through the real «Çıxış» (`rpc/end_session` observed). For `admin`, `anbardar` (`anbar-anbardar-codex-test · Anbardar`) and `rehber` (`anbar-rehber-codex-test · Rəhbər`) alike the rail entry is present, is second in the `Əməliyyat` group, opens the screen, and renders the full 15-column table. RLS re-confirmed from a second code path: raw `movements` **85** for `anbardar` (the `Test Anbar` partition) vs **101** for `rehber`/`admin`; all three nevertheless render the same 3-row operational table because the screen shows `excludeCancelled()` output — a fixture coincidence at the operational layer, **not** evidence that RLS is inactive. Evidence: [`audits/2026-09-09-phase8-presentation-sweep-live-check.md`](../audits/2026-09-09-phase8-presentation-sweep-live-check.md) |
| M8-42 | Anbardar visibility — parity recorded, RLS dependency stated | — | **LIVE VERIFIED for the current TEST fixture (2026-09-09).** `D2` remains RESOLVED as (b): the client adds NO warehouse filter and the SERVER scopes the rows. Admin independently saw 101 rows: 85 allowed `Test Anbar` rows and 16 denied `CODEX Phase8 Transfer Anbar` rows. The dedicated `anbardar` received exactly the 85 allowed IDs, with 0 missing, 0 unexpected and 0 foreign-warehouse rows. The I-2 no-client-filter rendering contract remains mutation-checked. [Exact comparison](../audits/2026-09-09-phase8-m8-40-m8-42-m8-43-role-rls-live-check.md); [earlier UI/export evidence](../audits/2026-09-08-phase8-anbardar-writeoff-export-live-check.md) |
| M8-43 | Audit consequences of reversal/correction; no client-side audit write | — | **PARTIALLY LIVE VERIFIED, including intended-role REST and React visibility (2026-09-09).** A dedicated TEST `rehber` read 543 `audit_log` rows while the same fresh admin read returned 0, exactly proving `p_audit_read` behaviour. Seven rows matched known Phase 8 fixtures. The correctly started TEST-sandbox React page then rendered `1–50 / 544` and visibly showed the row-cancel `UPDATE` reason and counter IDs (the extra row is normal session registration). This resolves the missing `rehber` evidence and prior zero-row contradiction. Existing B1/B3/B4 consequences remain live evidence and no client audit write exists. Direct audit coverage is still uneven across cancellation RPC families, as previously documented; this is scope, not a fabricated uniform guarantee. [Role/RLS evidence and localhost-mode deviation](../audits/2026-09-09-phase8-m8-40-m8-42-m8-43-role-rls-live-check.md); [coverage analysis](../audits/2026-09-09-phase8-m8-43-audit-log-rls-and-coverage.md) |
| M8-44 | Stale-response protection: monotonic sequence, late responses discarded | — | **LIVE VERIFIED (2026-09-09)** — both response orderings and the stale-failure shape proved through the real React UI; see the promotion note at the end of this cell. Originally CODE VERIFIED (I-2) — a module-level request sequence in `store/movements.store.ts`; a late reply writes no rows, raises no error and does not settle the `loading` flag owned by the newer request. All three mutation-checked. **PROMOTED TO LIVE VERIFIED (2026-09-09):** on TEST `alkjjbaawmsirsfvqljm`, TEST admin, the real React «Mal hərəkəti» screen on a freshly started, verified `--mode sandbox` read-only localhost (PID 5572; the prior server was stopped and replaced). Playwright drove installed Chrome; network control delayed or fulfilled TEST GET responses only, and Auth and every `/rest/v1/rpc/` request were excluded by an explicit guard and never intercepted. **One logical load was traced, not assumed, to be 8 held requests** — four snapshot GETs (`movements`/`items`/`warehouses`/`writeoff_valuations`) × React StrictMode duplication, with `movements` returning its 101 rows in a single page; all four are held together because `fetchMovementsSnapshot()` awaits `Promise.all` over all four. **Leg A (older success arrives after newer success):** load A was proved genuinely pending — 8 requests held, **zero** responses delivered — then load B was issued through a second real remount and allowed to complete on the real TEST response; releasing A afterwards with a valid but visibly distinguishable payload left B's table and footer byte-identical, showed no marker, no banner, no «Yükləmə xətası», did not restart loading and kept search/«Sıfırla»/«Excel» usable. **Leg B (stale A settles while newer B is still pending):** both loads were observed in flight simultaneously (8 held each); releasing A did not replace the snapshot, showed no marker and no stale error, and **did not clear or settle the loading state owned by B**; B then became the final settled snapshot, clean and identical to baseline. **Stale-failure sub-leg:** stale A answered HTTP 503 while B was still pending produced no error banner and did not settle B's loading — this is the row's OWN contract ("raises no error and does not settle the `loading` flag"), not an invented criterion. The `loading` flag was observed through an application-owned DOM projection, `mv-export-writeoff`'s `disabled={!(loaded && isWriteOffFilter && !loading)}` with the type filter pinned to «Silinmə» — **no application code was changed** to expose it or to obtain any pass. **The decisive check is a POSITIVE CONTROL:** the identical marked payload released to the NEWEST load rendered `M844STALE` in the visible İSTIQAMƏT column, so the marker demonstrably reaches the screen when a load wins and its absence elsewhere is a real discrimination, not an invisible-marker artefact. **Two earlier executions were rejected as evidence rather than reported**, both for an unfalsifiable marker: the first marked a row `excludeCancelled()` removes, the second a row the pinned «Silinmə» filter hides; the accepted run marks the row actually on screen and writes only `partner`, leaving `note` untouched because `excludeCancelled()` classifies on `note`. The same module-level `requestSeq` was proved to receive both invocations: a window stamp was identical across three navigation remounts with 0 main-frame navigations and no reload. Raw `movements` measured **101**, the only distinct count observed. No mutation RPC, no fixture, 0 production contact attempts; the session was ended through the real «Çıxış». Evidence: [`audits/2026-09-09-phase8-m8-44-stale-response-interleaving-live-check.md`](../audits/2026-09-09-phase8-m8-44-stale-response-interleaving-live-check.md). Not claimed: other roles (the guard is a module-level counter with no role dimension), other screens' stores. **THE REALTIME-PATH EXCLUSION IS NOW CLOSED (2026-09-09):** once M8-14 was live, a real `postgres_changes` INSERT (`18259a16…`) drove a genuine debounced realtime `load()` whose response was HELD at +18805 ms; a newer load was then issued by navigation remount and settled first. Releasing the held stale reply with the marker written into the DISPLAYED `partner` column of **all 120 rows** left `markerVisible: false` — the realtime-issued load lost its ticket and wrote nothing — while the POSITIVE CONTROL released the identical marked payload as the NEWEST load and DID render `M844RTFCDIAW` (4 marked responses across StrictMode duplication). Browser-only interception; nothing synthetic was stored in TEST. **Two earlier executions were rejected rather than reported**: one used «Sıfırla», which issues no read at all (`reset` only clears filters, `movements.store.ts:189`) so no newer ticket existed; the other marked only the first positive-control response and was therefore unfalsifiable. The harness now asserts a newer load actually occurred and marks a WINDOW. Fixtures net-zero (movements 113→121, all posted-plus-reversed; balance 8.00, 0 negatives, layers 7+1 at version 36). Evidence: [`audits/2026-09-09-phase8-m8-44-realtime-path-stale-interleaving.md`](../audits/2026-09-09-phase8-m8-44-realtime-path-stale-interleaving.md) |
| M8-45 | Failed refresh retains the previous snapshot | — | **LIVE VERIFIED (2026-09-09)** — all four core reads, both failure shapes and all three roles; see the promotion note at the end of this cell. Originally CODE VERIFIED (I-2) — a failed refresh changes only `error`/`loading`; the table stays visible under a «Yenilənmədi» banner. Mutation-checked at both store and UI level. **Corrected after the I-2 Codex audit (finding 1):** a failed `writeoff_valuations` read was previously a degraded SUCCESS (`ok: true`, empty `valuations`, `valuationsReady: false`), so the store replaced a good valuation map with an empty one and Silinmə amounts shifted after a transient failure — a real breach of this row. All four reads are now fatal, so the retained snapshot includes the valuation map as one unit. A successful read returning zero rows stays valid and uses the legacy per-row fallback. `valuationsReady` and the degraded-value warning are removed. **PARTIALLY LIVE VERIFIED (2026-09-09), narrowly scoped:** on TEST `alkjjbaawmsirsfvqljm`, TEST admin, the real React «Mal hərəkəti» screen on a verified `--mode sandbox` read-only localhost. Playwright drove installed Chrome and failed exactly one required read — `**/rest/v1/movements**` — with HTTP 503 (`Service Unavailable (M8-45 injected)`); Auth was never intercepted and no mutation RPC was called. Across a real navigation-remount refresh the previously loaded table stayed visible with byte-identical row identity and an unchanged footer (`3 qeyd · mədaxil 11.00 · məxaric 3.00 · mədaxil dəyəri 111.00 ₼`), the «Yenilənmədi … Ekranda son uğurlu oxunuşun məlumatı göstərilir.» banner rendered ABOVE the retained table, «Yükləmə xətası» never appeared, loading finished, and search/«Sıfırla»/«Excel»/«Yeni əməliyyat» all stayed enabled. Removing the interception recovered the identical snapshot with no banner. Count reconciliation: the `movements` response carried **101 rows**, matching the 2026-09-09 role/RLS baseline; the table shows 3 because it renders `excludeCancelled()` output. No movement, fixture or database write occurred; production was never contacted (0 attempts). Evidence: [`audits/2026-09-09-phase8-m8-45-failed-refresh-retention-live-check.md`](../audits/2026-09-09-phase8-m8-45-failed-refresh-retention-live-check.md). **MATRIX COMPLETED (2026-09-09, second pass):** the three remaining core reads and the transport-failure shape were then exercised the same way, so the row now has live evidence for ALL FOUR core reads and BOTH failure shapes. `items` 503 → `Yenilənmədi Service Unavailable (M8-45 items) …`; `warehouses` 503 → `Yenilənmədi Anbar siyahısı yüklənmədi …` (the server text is correctly NOT passed through, because `fetchWarehouses()` THROWS and the normaliser converts the rejection to `FAIL_WAREHOUSES` — the documented both-failure-shapes contract); `writeoff_valuations` 503 → `Yenilənmədi Service Unavailable (M8-45 writeoff_valuations) …`, which is the **live confirmation of the I-2 correction** that a failed valuation read is FATAL and retains the whole snapshot rather than degrading to an empty valuation map; `items` transport abort (`route.abort`) → `Yenilənmədi TypeError: Failed to fetch …`. Every leg kept 3 rows with identical row identity and footer, showed the banner, produced no full-screen «Yükləmə xətası», settled loading, kept search/«Sıfırla»/«Excel»/«Yeni əməliyyat» enabled, and recovered to the identical snapshot with the banner cleared, leaking no failure state into the next leg. Raw `movements` re-measured at **101** before and after. A first execution of this matrix reported no banner on all four legs and was **rejected as evidence**, not reported: tracing showed Nomenklatura issues its own same-signature `items`/`warehouses` reads (disarming a one-shot interceptor) and React StrictMode double-issues each snapshot read. The harness was changed to a failure WINDOW armed only after Nomenklatura settles; **no application code was changed to obtain the passes**. No mutation RPC, no fixture, 0 production contact attempts. Evidence: [`audits/2026-09-09-phase8-m8-45-remaining-read-legs-live-check.md`](../audits/2026-09-09-phase8-m8-45-remaining-read-legs-live-check.md). **ROLE DIMENSION CLOSED → PROMOTED TO LIVE VERIFIED (2026-09-09, third pass):** the smallest sufficient matrix — one `movements` HTTP 503 retention leg plus recovery — was run for `anbardar` and `rehber` in a fresh browser context each, without repeating the admin matrix. Both roles kept their table visible with unchanged row identity and footer, showed their own banner (`Yenilənmədi Service Unavailable (M8-45 anbardar` / `rehber) …`), produced no full-screen «Yükləmə xətası», settled loading, kept search/«Sıfırla»/«Excel» usable, recovered to the identical snapshot with the banner cleared, and rendered **no admin-only «Qrup üzrə ləğv»** (count 0). RLS was independently re-confirmed from a second code path: the raw `movements` read returned **85 rows for `anbardar`** (the `Test Anbar` partition) and **101 for `rehber`** (the full set), matching the 2026-09-09 role/RLS audit. Both roles still render the same 3-row operational table because the screen shows `excludeCancelled()` output and the 16 foreign plus cancelled/reversal rows fall outside it — a fixture coincidence at the operational layer, NOT evidence that RLS is inactive. `failedRequestCount` was 8 per role, which is the failure WINDOW's total (StrictMode duplication × paging), i.e. **one logical refresh per role**, not eight. Each device session was ended through the REAL «Çıxış» (`unregisterSession()` + `signOut()`; `rpc/end_session` observed) rather than by discarding the context. No mutation RPC, no fixture, 0 production contact attempts. **The M8-45 contract carries no role requirement of its own** — the role gap was a scope note from the two earlier audits, now retired, so this promotion satisfies the actual ledger contract without inventing a criterion. No broader endpoint coverage is claimed: the role legs used `movements`/503 only, the other reads being covered under admin. **M8-44 concurrent stale-response interleaving remains OPEN and is NOT claimed from these sequential per-role failures.** Evidence: [`audits/2026-09-09-phase8-m8-45-role-dimension-live-check.md`](../audits/2026-09-09-phase8-m8-45-role-dimension-live-check.md) |
| M8-46 | Double-submit: `inFlight` before the first await, released in `finally` | — | **PARTIALLY LIVE VERIFIED for TEST admin across ordinary document, batch and row cancellation (2026-09-09).** Genuine browser double-clicks produced exactly one ordinary reversal, exactly one batch reversal per source, and exactly one row-level counter. Counts and layers/balances reconciled after every net-zero fixture. The correction and replacement UI double-submit branches remain **UNEXERCISED — OWNER SCOPE DECISION REQUIRED (2026-09-09, corrected after Codex independent review).** While stock layers are active both controls are intentionally absent — `mayReplace = layerReady && !layerActive` (`DocumentViewDialog.tsx:196`, because `replace_movement_item` has no layer variant) and `canEditDocument()` refuses `layer-active` (`documentEdit.ts:105`) — so there is no submit control to double-submit, and the branches cannot be reached in this configuration. **An earlier note claiming these SATISFIED-BY-GATE via transfer `SND-8DC5E59E8D` is retracted**: transfer-family guards forbid both actions independently of the layer state (`canEditDocument()` refuses `!isOrdinaryDoc` before the layer check; `canReplaceItems()` rejects transfer kinds unconditionally), so that card proves nothing about `layerActive`. The supporting active-layer refusal comes instead from the ordinary-document M8-38 and post-fix M8-28 evidence, which showed no replacement control but WITH row cancellation still present on the same card — the exact asymmetry the code predicts (`mayCancelRow`, line 198, carries no layer term). Treating the gate as satisfying these separate approved contracts is an explicit owner decision, not an audit call. [Gate classification](../audits/2026-09-09-phase8-layer-gate-correction-replacement-boundary.md); [Ordinary evidence](../audits/2026-09-09-phase8-m8-46-react-double-submit-live-check.md); [batch evidence](../audits/2026-09-09-phase8-m8-46-react-batch-double-submit-live-check.md); [row evidence](../audits/2026-09-09-phase8-m8-20-m8-46-react-row-double-submit-live-check.md); [historical blocker](../audits/2026-09-09-phase8-m8-46-double-submit-lock-blocked.md). |
| M8-47 | One gate shared by button and handler (`M7-S5` rule) | — | **NARROW LIVE PASS for concurrent ordinary-document cancellation (2026-09-09).** Two authenticated TEST-admin React tabs submitted the same real 0.01 receipt cancellation concurrently; read-back showed exactly one reversal and net-zero restoration. **THE STALE RE-CHECK — the contract's distinguishing property — IS NOW PROVED (2026-09-09).** `DocumentViewDialog.tsx:217-244` re-reads the clicked row, RE-ASSEMBLES the view from CURRENT rows and re-runs the SAME gate the button used, BEFORE `setInFlight` and before any API call (so the localhost write guard cannot mask it). Live: the real card for `TEST-OUT-1` opened with «Əməliyyatı ləğv et» present and ENABLED; a browser-only response rewrite then added that document's cancellation marker (`Ləğv: TEST-OUT-1`, the exact shape a real cancellation takes, since `cancelledDocFor()` classifies on `note`); a genuine reload of the mounted screen was driven through the REALTIME path (`MovementsPage.tsx:178`) by a real TEST `postgres_changes` event, with the dialog left open — the harness ABORTS rather than passing if no reload occurs (`reloadObserved: true`). The still-open dialog then re-rendered as «Ləğv edilib · əks sənəd: SND-C-M847STALE…» with the action control **omitted entirely** (only «Bağla» left) and **0 cancellation RPCs** dispatched. **Valid NEGATIVE CONTROL:** the identical flow without the swap left the button enabled and proceeded past the re-check to the write guard («Ləğv edilmədi: … bloklanıb»), so the revocation is caused by the staleness, not emitted unconditionally. Browser-only evidence; the two event-source fixtures were posted and immediately reversed. NOT claimed: the handler-side toast string «Bu sənəd artıq ləğv edilib…», which the render gate pre-empted (unit-tested), other roles, and the batch dialog's separate `resolveBatchSelection()` instance. [Stale re-check evidence](../audits/2026-09-09-phase8-m8-47-shared-gate-stale-recheck.md); [concurrent-tab evidence](../audits/2026-09-09-phase8-m8-47-react-submit-gate-live-check.md). |
| M8-48 | `blockedReason()` consulted inside every cancellation API function | — | CODE VERIFIED (I-4) — all thirteen functions consult the guard BEFORE Supabase; a blocked call reaches no network at all, proven for every function in one test |
| M8-49 | Guard extension: the seven new `doc.*` actions | — | CODE VERIFIED (I-4) — the seven actions are added ADDITIVELY; the fourteen pre-existing actions are asserted unchanged |
| M8-50 | Excel / Çap / Silinmə report | 1701-1745, 1830-1845 | **PARTIAL** — the ORDINARY Excel export is CODE VERIFIED (I-7) and the separate Silinmə report is CODE VERIFIED (I-9, see the dedicated row below); «Çap» remains NOT STARTED. `D1` resolved for the Excel half only. `lib/movementExport.ts` builds the 15-column matrix and `pages/MovementsPage.tsx` hands it to the EXISTING `lib/xls.ts` — the shared writer was not modified. The full filtered `all` is exported, never the capped slice, and the button is gated on `loaded` so nothing exports before the first complete snapshot; after a failed refresh it exports the retained last-good snapshot (M8-45). Ungated by role, as `#mov-exp` is. Two proposal corrections applied: the matrix takes the `valuations` map EXPLICITLY (without it every Silinmə row silently falls back to `qty × price`), and «Qeyd edən» goes through `recorderLabel()` because legacy rewrites `m.by` in place at `index.html:990` before the export reads it — exporting `created_by` would write a raw UUID. Three mutation checks caught. *(The preceding «NOT LIVE VERIFIED: no workbook was generated against live data» wording was accurate at I-7 and is HISTORICAL; it is superseded by the line below.)* **CURRENT STATUS: PARTIAL overall.** Three distinct parts, each with its own status: (a) the ORDINARY Excel export is **PARTIALLY LIVE VERIFIED, narrowly scoped (2026-09-07, extended 2026-09-08)** — on TEST, admin, the five-row existing dataset, no mutation, the real «Excel» button downloaded `mal_hereketi_2026-09-07.xlsx` (20,034 bytes, SHA256 `a0aa03a7aca69732957a69a7360049a457ffb51b0823b0fb13ad593801e9c085`), one `Hesabat` sheet, A1:O6, the 15 expected headers and 5 body rows, KPI reconciliation matching the file (inbound 17, outbound 3, inbound value 186 AZN), the inherited `toNum` code conversion observed live (`0000002`/`0000001` → numeric 2/1, confirming R-F9 rather than fixing it), a zero-match search downloading a header-only workbook (17,418 bytes, SHA256 `8e0e8024c389502fb6ccde29cc954f22c99c46837da34759af0ff8fabc0dec94`, used range A1:O1), and native Excel readability with no repair prompt PASS on **user-executed, screenshot-supported** observation — not agent-operated. Evidence: [`audits/2026-09-07-phase8-i8-readonly-export-codex.md`](../audits/2026-09-07-phase8-i8-readonly-export-codex.md). The 2026-09-08 follow-up exercised the same five-row export through a fresh TEST `anbardar`: `mal_hereketi_2026-09-08.xlsx`, 20,034 bytes, A1:O6, byte-identical SHA-256 `a0aa03a7aca69732957a69a7360049a457ffb51b0823b0fb13ad593801e9c085`; evidence: [`audits/2026-09-08-phase8-anbardar-writeoff-export-live-check.md`](../audits/2026-09-08-phase8-anbardar-writeoff-export-live-check.md). Still NOT covered: `rehber`, the stored non-null Silinmə valuation branch, >3000-row volume, concurrency and a denied foreign-warehouse comparison. (b) the separate Silinmə report is row `M8-50b` and carries its own scoped live evidence. (c) **«Çap» remains NOT STARTED and is NOT promoted by any of this** — no print affordance is rendered and none was exercised. `M8-50` therefore stays **PARTIAL**. |
| M8-50b | Separate «Silinmə» report — `writeOffExportRows` / `xlsWriteOff` | 1699-1789 | **CURRENT STATUS: PARTIALLY LIVE VERIFIED, narrowly scoped (2026-09-07, extended 2026-09-08).** This single line is the row's status; every «NOT LIVE VERIFIED» phrase later in this cell is HISTORICAL I-9 wording, retained for chronology and superseded by it. The scope of the live evidence, and everything still unverified, are stated at the end of this cell. — Implementation record (I-9, CODE VERIFIED, historical wording follows): `api/writeoffAllocations.api.ts` reads `stock_layer_allocations`; `lib/writeOffExport.ts` builds both sheets' rows; `lib/xlsWriteOff.ts` is a SEPARATE writer — `lib/xls.ts` is neither modified nor reused, because its `toNum()` would strip the leading zeros legacy protects with `z:'@'` text cells (R-F9). Four audited corrections against the proposal: (1) the price expression is report-specific — `writeOffUnitPrice()` does NOT match, its fallback yields 0 for a missing/zero price and the negative value for a negative one, where this report requires null; `movementValuation()` is reused unchanged and no shared valuation helper was modified. (2) The capability gate is `layerReady && !layerActive` — `layerActive === false` alone also describes a FAILED probe, and an unresolved capability reads rather than silently omitting sheet 2; confirmed-inactive preserves legacy exactly. (3) The «orphan» framing and its toast are withdrawn — a parent outside the exported filter is ordinary filtering; counts stay internal and cannot prove absence of truncated or RLS-hidden rows. (4) Ordering is `created_at` then `id`, preserving legacy chronology with a unique tie-breaker instead of reordering by parent; stable ordering gives NO transaction snapshot across concurrent changes. Async safety: the full filtered parent set and its item/valuation/recorder inputs are captured at click time and never mixed with a refreshed snapshot, duplicate in-flight export is blocked, and the export aborts before download on a changed snapshot/session or unmount. All-or-nothing pagination, full-last-page limit failure, and a failed read writes NO file. Both sheets ported cell by cell — raw warehouse values, mapped recorder labels, text identifiers, omitted-versus-zero cells, fixed widths, conditional source sheet, no autofilter. Verified by real xlsx serialization round trip. Four mutation checks caught (price-null 7, reversed exclusion 3, partial-read 4, capability gate 1). *(End of historical I-9 wording.)* **Gate superseded 2026-09-07 (export-safety fixes):** correction (2) above records the gate as shipped at I-9; the export gate is now `layerFresh && layerReady && !layerActive`, and a refresh in progress refuses the report. Cancellation routing still uses `layerReady` alone. **Live evidence supporting the current status — narrow scope only.** On TEST `alkjjbaawmsirsfvqljm`, admin, one existing row, no mutation: the report downloaded through the real button (`Silinme_hesabati_2026-09-07.xlsx`, 18113 bytes, SHA256 `EDDFCEE67D2CBE53E0A1F64167C12EE7590CC69E77832EFFE646716F14082DC1`); the actual downloaded file — not a regenerated one — was inspected read-only and carries one worksheet «Silinmə hesabatı», A1:Q2, 17 headers, text code `0000001`, quantity 3, omitted price/amount/source-amount cells distinguished from a genuine numeric 0, and the mapped recorder label. An empty-result filter refused with «Seçilmiş filtrlərə uyğun silinmə qeydi yoxdur» and wrote no file. Native Excel readability with no repair prompt is PASS on USER-OPERATED observation of this exact file; Codex did not operate Excel. Evidence: [`audits/2026-09-07-phase8-i9-live-export-attempt.md`](../audits/2026-09-07-phase8-i9-live-export-attempt.md). **2026-09-08 role follow-up:** a fresh TEST `anbardar` assigned to `Test Anbar` saw the one existing Silinmə row, the action rendered/enabled, and the real button downloaded `Silinme_hesabati_2026-09-08.xlsx` (18,113 bytes) with the same SHA-256 and cells as the admin artifact. Evidence: [`audits/2026-09-08-phase8-anbardar-writeoff-export-live-check.md`](../audits/2026-09-08-phase8-anbardar-writeoff-export-live-check.md). **STILL NOT LIVE VERIFIED:** populated source-lot / «Mənbə partiyalar» sheet 2, `rehber`, ordinary Excel under non-admin, multi-page/`MAX_PAGES` volume, concurrency/refresh-abort paths, and a denied foreign-warehouse comparison. |
| M8-51 | `writeoff_valuations` read: live shape and RLS confirmed before use | 950-975 | **LIVE VERIFIED (2026-09-09)** — [audit](../audits/2026-09-09-phase8-m8-51-writeoff-valuations-read-contract.md). TEST admin: the request is column-explicit (7 named columns, NOT `select=*`), in the exact `COLUMNS` order, `order=movement_id.asc` before `offset=0&limit=1000`, HTTP 200, `Content-Range 0-2/*`, one logical load (the 2 observed requests are a StrictMode pair — identical URL and body). Response **3 rows**; returned key set is exactly the 7 requested and maps 1:1 onto `WriteoffValuationRow` — no undocumented field dependency, no phantom field. All 3 parent movements exist in the RAW 101 and each is row-level cancelled by an explicit `Ləğv ID:` counter-row, so none reaches the visible set (M8-05 branches NOT promoted; no data created). **RLS proved behaviourally**, not just as policy text: a second read-only `anbardar` leg saw 85 movements and **2** valuation rows — the row whose parent lives in `CODEX Phase8 Transfer Anbar` was withheld, 3/3 predictions match, zero leakage, and the anbardar URL is byte-identical to the admin one with no client warehouse filter (`D2`/`M8-42`). The read is one leg of the atomic snapshot and triggers no second read, write or audit action. Earlier evidence retained: CODE VERIFIED (I-2) — its FAILURE is fatal to the snapshot (I-2 audit, finding 1), never a degraded success. `api/writeoffValuations.api.ts`, READ-ONLY, explicit seven-column list drawn from the confirmed live set, paged, never-throwing, and returning NO partial rows on failure. Wildcard reads are mutation-checked. The four confirmed-but-unused columns are deliberately unread |
| M8-52 | `movements` column-list widening for `contract_num` and the recorder | 941-943 | **LIVE VERIFIED (2026-09-09)** — originally CODE VERIFIED (I-1): `api/itemMovements.api.ts` selects `contract_num` and `created_by`. On TEST, TEST admin, real React UI, read-only. The «Mal hərəkəti» snapshot reuses `fetchItemMovements()` via `movementsSnapshot.api.ts`, so this was verified on **the exact request the page issues**, matched by its full column signature so the one narrower `movements` request from another screen could not be mistaken for it. Decoded select list, in request order, **16 columns**: `id, item_code, warehouse, date, in_qty, out_qty, price, partner, type, invoice_num, note, doc_num, created_at, channel, contract_num, created_by`. Both widened fields requested; **0 required fields missing**, 0 extra; column-explicit, **not** `select=*`; returned row keys cover the required set exactly (16). Deterministic `order=date.asc,created_at.asc` precedes the range (A11). Paging: a single leg `offset=0&limit=1000` — one short page ends the loop. Two snapshot-signature requests were seen, which is **one logical load** duplicated by React StrictMode (1 distinct URL), not two. Fields consumed by M8-03/M8-04/M8-05 are sourced from this response. **Payload size / large-volume behaviour is NOT claimed** — M8-52 does not require it (that is M8-53) and it was not measured. Evidence: [`audits/2026-09-09-phase8-m8-03-m8-05-m8-52-live-check.md`](../audits/2026-09-09-phase8-m8-03-m8-05-m8-52-live-check.md) |
| M8-53 | Payload measurement for the new reads | — | **MEASURED for the TEST-admin HTTP/1.1 contract (2026-09-08).** The original 14-movement snapshot measured 4 requests / 22 rows / 6,873 decoded / 1,532 encoded-body bytes. After the M8-23/M8-27/M8-28 TEST writes, a raw protocol capture of the same four contracts measured the current 18-movement snapshot: 26 rows, 8,843 decoded bytes, 1,796 encoded-body bytes, 4,304 response-header bytes and 34 bytes of HTTP chunk framing, for **6,134 raw HTTP/1.1 response bytes**. This excludes request/TLS/TCP bytes and is a named one-run measurement because dynamic header values may vary. Exact queries, both snapshots and method: [`audits/2026-09-08-phase8-m8-53-payload-measurement.md`](../audits/2026-09-08-phase8-m8-53-payload-measurement.md). |
| M8-54 | Ported legacy helpers: `movKey`, `movKeyLabel`, `routeOrPartner`, `transferRoute` | 1440-1491 | CODE VERIFIED (I-1, consumed I-2) — `lib/movementKey.ts`; `routeOrPartner` / `transferRoute` reused from A12. I-2 additionally ports `fmtD()` and the `TYPE_TAG` class map into `lib/format.ts`. **LIVE VERIFIED (2026-09-09, presentation sweep):** on TEST `alkjjbaawmsirsfvqljm`, real React UI, freshly started verified `--mode sandbox` read-only localhost (PID 27084); DOM assertions plus independent recomputation, not screenshots. No mutation RPC, no fixture, 0 production contact; sessions ended through the real «Çıxış». **PARTIAL — promoted per helper.** LIVE: `fmtD()` (TARIX cells from ISO dates), `whLabel()` (`Test Anbar`), and the `TYPE_TAG` class map for its two live entries (`Alış → tag t-mut`, `Silinmə → tag t-rm`). `routeOrPartner()` is promoted **only for its em-dash fallback branch**, which is the sole branch current data exercises (every visible row has a null partner and no route). **UPDATED 2026-09-09 by the transfer-fixture run** ([audit](../audits/2026-09-09-phase8-m8-09-m8-54-transfer-fixture-live-check.md)): a reversible exact-layer transfer fixture (`SND-833CFA7E90`, 0.01 units, created and cancelled through the real React UI) exercised three more helpers. Expectations were recomputed **independently** in the harness from the legacy rules — the application helpers were never imported or called — and matched the DOM exactly. **NEWLY LIVE:** `transferRoute()` for both **half-resolved** branches (`Test Anbar → —` on the OUT leg, `— → CODEX Phase8 Transfer Anbar` on the IN leg, each equal to the independently computed value); `movKey()`'s **`raw:`** branch, including its deliberate refusal to merge a half-resolved route; and `movKeyLabel()`, proved through the rendered option label AND as the live filter value that drove the table to exactly the expected single row. **THE LAST TWO BRANCHES ARE NOW PROVED (2026-09-09, browser-contract harness):** `transferRoute()`'s fully-resolved `A → B` branch rendered `Test Anbar → CODEX Phase8 Transfer Anbar`, and `movKey()`'s `route:` branch appeared as the literal filter OPTION VALUE `route:Test Anbar → CODEX Phase8 Transfer Anbar`, each equal to an **independently recomputed** expectation (the helpers under test were never imported or called). **Two negative controls held**: the REAL stored form `CODEX Phase8 Transfer Anbar anbarı` and an unconfigured `Qeyri-mövcud Anbar XYZ` both stayed `Test Anbar → —` under `raw:`, so the harness discriminates rather than resolving everything it touches. **This is browser-contract evidence, NOT persisted TEST data** — the three rows existed only in a `movements` response rewritten in flight; 0 mutation RPCs, 0 non-GET `movements` requests, no warehouse renamed, no code changed. Interception was removed and the real snapshot restored exactly (`anySynthetic: false`, 3 rows, identical footer). Evidence: [`audits/2026-09-09-phase8-m8-54-resolved-route-key-browser-contract.md`](../audits/2026-09-09-phase8-m8-54-resolved-route-key-browser-contract.md). The reason a live TEST transfer could not reach these branches is proved, not assumed: `normWhName()` strips ONE trailing «anbar/anbarı/anbarına» token, and both TEST warehouses are themselves named «… Anbar», so `Test Anbar`→`test` while partner `Test Anbar anbarı`→`test anbar` and `resolveWh()` returns null. This is a **TEST-data naming artifact, not a production defect** — the five real warehouses (`Ələt`, `Astara`, `Xocahəsən`, `Harmony`, `Ofis`) do not end in «Anbar» and resolve correctly under the same independent computation. No warehouse was renamed and no application code was changed to force a `route:` result. Evidence: [`audits/2026-09-09-phase8-presentation-sweep-live-check.md`](../audits/2026-09-09-phase8-presentation-sweep-live-check.md) |

### Final row-status reconciliation (2026-09-09)

The final owner decision supersedes any earlier phrase inside M8-29, M8-39 or
M8-46 saying that an owner decision is still required. M8-39/M8-46 retain their
honest code/partial-live labels and the inactive-layer branches remain
unexecuted, but that excluded configuration no longer blocks the phase. M8-29
retains its partial-live label and named historical branch, which likewise no
longer blocks this scoped acceptance. The module-level result is **ACCEPTED**;
row evidence labels are not rewritten into false `LIVE VERIFIED` claims.

## Milestone I-1 — implementation evidence (2026-09-05)

**I-1 IS NOT PHASE 8 COMPLETION, and Module I is not `ACCEPTED`.** I-1
delivered the read-only, pure-logic foundation only: no page, component,
dialog, navigation, realtime subscription, cancellation API, mutation-guard
extension or RPC call exists for this module. **No live Supabase read or
write, no SQL, no schema/RLS/trigger change, no fixture change, no commit and
no deployment occurred.**

New files:

- `web/src/lib/movementKey.ts` + `movementKey.test.ts` — `movKey`,
  `movKeyKind`, `movKeyLabel`, `movKeyText` (M8-54).
- `web/src/lib/documentCancelState.ts` + `documentCancelState.test.ts` —
  `CANCELLABLE_TYPES`, `docReversalDoc`, `isReversalDoc`, `docCancelledBy`,
  `isCancelDoc`, `cancelledDocFor`, `rowReplacedOrCancelled`,
  `stripRowLevelCancelled` (M8-06, M8-20, M8-21, M8-22).
- `web/src/lib/movementFilters.ts` + `movementFilters.test.ts` —
  `MOVEMENT_TYPE_FILTERS`, `searchableNote`, `filterMovements`,
  `sortMovements`, `movementKpis`, `movKeyOptions`, `resolveMovKeySelection`
  (M8-07 … M8-12).

Changed file:

- `web/src/api/itemMovements.api.ts` — the explicit column list gains
  `contract_num` and `created_by` (M8-52). `select('*')` was not used.

### Evidence for M8-52

Two independent local sources agree:

1. **Generated database types** — `web/src/types/database.ts:372-390` declares
   `contract_num: string | null` and `created_by: string | null` on
   `movements.Row`.
2. **Local schema documentation** — `ANBAR_SHARED/docs/DB_SCHEMA.md`, table
   «movements», lists `contract_num text` and `created_by text / uuid`.

The legacy mapping fixes the semantics: `index.html:941-943` sets
`ct: r.contract_num || ''` and `by: r.created_by || 'sistem'`. **There is no
`by` column.** `by` is the legacy in-memory field name for `created_by`, so
the React row type exposes `created_by`; the `'sistem'` value is display
formatting and belongs to I-2, not to the read. Note that `'sistem'` is only
an INTERMEDIATE value: the final legacy pass at `index.html:990` rewrites it,
and it is that pass the screen must render — see `lib/recorderLabel.ts`.

This is a rank-4 (generated types) plus rank-5 (docs) confirmation. Nothing
here claims the live column set was inspected.

### Deliberately NOT done in I-1

- `writeoff_valuations` is neither read nor typed (R2 / M8-51), so
  `movementValuation()` and the `Silinmə` price/amount rule (M8-05) are not
  ported.
- The transfer-cancellation parameter correction (`D-I1`) is **not**
  implemented; it belongs to I-4, after the live RPC signature is verified.
- No decision `D1`–`D5` is resolved in code.

### Checks after I-1 (run once, from `web/`)

- Targeted run: **109 tests / 4 files** passed (`movementKey`,
  `documentCancelState`, `movementFilters`, `itemMovements.api`).
- Full suite: **1746 tests / 96 files** passed. I-1 adds **97 tests in 3 new
  files** — 95 in the three new `lib` test files, plus 2 added to the existing
  `itemMovements.api.test.ts`; the pre-I-1 baseline was 1649 / 93. The 109
  figure is the targeted RUN total and includes 12 pre-existing API tests.
- `npm run typecheck` clean · `npx oxlint` exit 0 · `npm run build` succeeded ·
  `git diff --check` exit 0.
- `VITE_ALLOW_LOCAL_WRITES` verified absent from `web/.env` after the run; the
  file was not modified.

### Mutation checks

Every new behavioural test was verified to FAIL against a plausible wrong
implementation, after which the correct version was restored and re-verified
green. Fifteen mutations, each caught:

1. `movKey` merges a half-resolved route («Ələt → —») into `route:`.
2. `movKeyLabel` uses `split(':')`, breaking a label containing a colon.
3. `cancelledDocFor` matches the ordinary legacy marker by substring, so
   «Ləğv ID: 777» would cancel row 77.
4. `stripRowLevelCancelled` drops the marker-row predicate, leaving the
   technical row visible.
5. `docCancelledBy` / `docReversalDoc` drop the `'—'` fallback, so a cancelled
   document reads as not cancelled.
6. `movKeyOptions` applies `MF.p`, letting the İstiqamət selection narrow its
   own option list.
7. `sortMovements` drops the `created_at` tiebreak.
8. `movementTs` uses a naive `new Date().getTime()`, yielding `NaN`.
9. `searchableNote` uses a non-global regex, stripping only the first fragment.
10. `filterMovements` searches the RAW note, so a query for the replaced old
    code surfaces a different item.
11. `movementKpis` values both directions instead of inbound only.
12. `movementKpis` reverses the price fallback chain.
13. `resolveMovKeySelection` checks only the partners group.
14. Date bounds made exclusive instead of inclusive.
15. `contract_num` / `created_by` removed from the column list.

No wrong version is left on disk.


## Milestone I-2 — implementation evidence (2026-09-06)

**I-2 IS NOT PHASE 8 COMPLETION, and Module I is not `ACCEPTED`.** I-2
delivered the read-only «Mal hərəkəti» screen and nothing beyond it. **No live
Supabase read or write, no SQL, no RPC invocation, no schema/RLS/trigger
change, no fixture change, no dependency change, no `.env` change, no root
`index.html` change, no commit, no staging, no push and no deployment
occurred.** No Phase 7 status changed.

### What ships

New files:

- `web/src/api/writeoffValuations.api.ts` + `.test.ts` — the READ-ONLY
  `writeoff_valuations` read: explicit seven-column list, paged, never-throwing,
  returning no partial rows on failure (M8-51).
- `web/src/api/movementsSnapshot.api.ts` + `.test.ts` — the atomic four-read
  snapshot. **All four reads are fatal**, including `writeoff_valuations`
  (I-2 Codex audit, finding 1). The earlier design returned `ok: true` with an
  empty `valuations` array plus a `valuationsReady: false` flag; because the
  store cannot distinguish that from a genuinely empty result, it replaced a
  good valuation map with an empty one and every existing Silinmə row silently
  switched to a different fallback amount after one transient failure. That
  broke both the atomic-snapshot contract and M8-45. A read that SUCCEEDS with
  zero rows remains valid and uses the legacy per-row fallback; only a failed
  or rejected read is an error. `valuationsReady` and the degraded-value
  warning are removed.
- `web/src/lib/movementValuation.ts` + `.test.ts` — `movementValuation()` and
  the 4-dp `writeOffUnitPrice()` (M8-05).
- `web/src/store/movements.store.ts` + `.test.ts` — filters, sticky
  `showAll`, the monotonic request sequence (M8-44) and snapshot retention on
  failure (M8-45).
- `web/src/pages/MovementsPage.tsx` + `.test.tsx` — the screen.

Changed files:

- `web/src/App.tsx` — `'mov'` added to `MigratedPage`, the rail entry in the
  legacy position, and the page case with the plain `onNewOperation` switch.
- `web/src/App.test.tsx` — rail position, role-ungatedness, and the plain
  navigation.
- `web/src/lib/format.ts` — `fmtD()` and the `TYPE_TAG` class map, ported from
  index.html:602 and 1415-1418.
- `web/src/lib/movementFilters.ts` — `MovementFilterRow` additively gains
  `doc_num` (required), `channel` and `created_by`, the three display fields
  the table renders. `doc_num` is REQUIRED rather than optional so a filtered
  row satisfies `CancelStateMovement` without a cast at the `cancelledDocFor()`
  call site — the one place a missing document number would read as "no
  document" instead of failing to compile.
- `web/src/lib/movementFilters.test.ts` — the row factory gains `doc_num`.
- `web/src/lib/documentCancelState.ts` — **comment only.** The `cancelledDocFor()`
  docstring claimed every unsupported type yields null. That is true only for a
  row that HAS a `doc_num`; a doc-less row never reaches the type gate, because
  legacy checks the per-id marker first (index.html:4902-4907) and the ordinary
  branch matches `Ləğv ID: <id>` for any non-transfer type. The comment now says
  so. **The behaviour is unchanged** and still mirrors legacy exactly.

### Deliberately NOT done in I-2

- **«Baxış» is inert.** It renders, so the table keeps its legacy 15-column
  shape, but it is `disabled` with a tooltip saying document inspection arrives
  in the next milestone. There is no dead click and no partial I-3.
- No document view, dispatcher, cancellation dialog, cancellation API, RPC
  call or mutation-guard extension exists (I-3 … I-6).
- No Excel, «Silinmə hesabatının ixracı» or Çap affordance is rendered: they
  wait on `D1` / I-7, and a disabled export button would imply a decision that
  has not been made.
- No batch cancellation, item replacement or correction flow (`D3`, `D4`, I-5,
  I-6).
- `M7-109` is unchanged: its caller is still I-6.

### Checks after I-2 (run once, from `web/`)

- Full suite: **1873 tests / 102 files** passed. This is the CLOSING I-2
  result, after both Codex audit corrections. The pre-I-2 baseline was
  **1746 / 96**, independently confirmed by Codex before this milestone, so
  I-2 plus its corrections add **127 tests in 6 new test files**. (The first,
  pre-fix I-2 run reported 1845 / 100; that figure is history and is no longer
  the current result.)
- `npm run typecheck` clean · `npx oxlint` exit 0 · `npm run build` succeeded ·
  `git diff --check` exit 0.
- Root `index.html` MD5 remains `b9be15c5ca59b68337863369620d72fa`.
- `VITE_ALLOW_LOCAL_WRITES` verified absent from `web/.env` after the run; the
  file was not modified.
- No `insert`, `update`, `delete`, `upsert` or `rpc` call exists anywhere in the
  new modules — checked by grep as well as by review.

### Mutation checks

Every new behavioural test was verified to FAIL against a plausible wrong
implementation, after which the correct version was restored and re-verified
green. **No wrong version is left on disk** (each file was diffed against its
pre-mutation copy afterwards). Twelve mutations, each caught:

1. The request-sequence guard removed — a stale success overwrites newer rows.
   *(3 tests failed.)*
2. A failed refresh clearing the snapshot instead of keeping it.
3. KPIs computed over the capped slice — reports `3.000 qeyd` for 3001 rows.
4. A client-side anbardar warehouse filter injected into the row source —
   4 rendered rows collapse to 2.
5. The Silinmə valuation replaced by the ordinary `m.pr → item.price` chain —
   the cell reads `9,00` instead of the stored `16,00`.
6. `writeoff_valuations` read as `select('*')`. *(3 tests failed.)*
7. The realtime debounce overridden with `0`.
8. `resolveMovKeySelection()` bypassed — an invalid İstiqamət selection stays
   active over an unexplainable empty table.
9. The channel suppressed for every transfer, not only warehouse-resolving
   ones — a meaningful non-warehouse channel disappears.
10. The recorder rendered as `created_by || 'sistem'` — the INTERMEDIATE
    legacy mapping (`index.html:943`) rather than the final one at
    `index.html:990`, which puts a raw UUID on screen. *(I-2 audit, finding 2.)*
11. The contract hint rendering `doc_num` instead of `contract_num`.
12. The rail entry wrapped in `isAdmin(me)` — `rehber` and `anbardar` lose the
    screen. *(2 tests failed.)*

### Status of this milestone

`CODE VERIFIED` for the rows named above. **Nothing is `LIVE VERIFIED`**: no
live read or write was performed from the React app in this milestone, and the
live gate remains I-8. Module I stays ONE acceptance boundary and is **not**
`ACCEPTED`; `ACCEPTED` additionally requires Codex's independent audit.


## Milestone I-3 — implementation evidence (2026-09-06)

**I-3 IS NOT PHASE 8 COMPLETION, and Module I is not `ACCEPTED`.** I-3
delivered the READ-ONLY document inspection layer and nothing beyond it. **No
cancellation, replacement, row-cancel, correction or edit control exists —
neither enabled nor disabled. No cancellation API, no cancellation or
correction RPC, no mutation-guard extension, no `document_edit_impact()`
caller, no edit-mode transition, no batch cancellation, no Excel or print, no
new live read, no Supabase/SQL/data write, no schema, RLS, trigger, fixture,
dependency or `.env` change, no root `index.html` change, no commit, no
staging, no push and no deployment occurred.** No Phase 7 status changed.
Decisions `D1`, `D3`, `D4` and `D5` remain unresolved and are not touched.

### What ships

New files:

- `web/src/lib/documentView.ts` + `.test.ts` — the PURE dispatcher and
  document assembler: `documentViewKind()` (the four branches plus the
  unsupported refusal), `IMMUTABLE_RECORD_REFUSAL` (the legacy sentence,
  verbatim) and `assembleDocumentView()`, which groups, strips, derives the
  status, the `docRefsLine()` values and `lotDoc`. No React, no Supabase.
- `web/src/components/movements/DocumentViewDialog.tsx` + `.test.tsx` — the
  dialog. It renders the four legacy views with their ACTION halves removed,
  and imports no api module and no Supabase client.

Changed files:

- `web/src/pages/MovementsPage.tsx` — «Baxış» is ENABLED and wired to the
  dispatcher; the selected row is held as `viewId: string | null`.
- `web/src/pages/MovementsPage.test.tsx` — the I-2 assertion that «Baxış» is
  disabled is replaced by one asserting it is the row's ONLY control and is
  enabled; the dialog's own behaviour is covered by its test file.

### Design decisions worth recording

**Only the ID is state.** The page stores `viewId`, never a copied movement.
The dialog resolves that id against the CURRENT store rows on every render, so
a realtime refresh is reflected immediately. If the refresh removes the row,
the dialog shows an honest «Qeyd artıq mövcud deyil» state and can still be
closed; it never renders a pre-refresh copy. A FAILED refresh retains the
snapshot (M8-45), so the dialog keeps showing the retained data — which is the
current store content, not a copy.

**`lotDoc` is derived but wires nothing.** Legacy uses it to gate
`canReplaceRows` (index.html:5023); item replacement is `D4` / I-4 and is not
built, so I-3 derives `lotDoc` over the WHOLE document and renders it as
information only.

**A document emptied by row-level stripping is NOT cancelled.** It is reported
through a separate `emptyAfterStrip` flag with its own wording; `status` stays
`open`. Risk R6.

**Some states are unreachable from the table, by design.** The registry's row
source is `excludeCancelled()`, which removes a cancelled document's rows, the
reversing rows and every marker row (index.html:1249-1270) — the legacy table
hides them too. Their «Baxış» therefore cannot be clicked, so those status
branches are tested by rendering the dialog directly against the same raw set
the store holds. The four dispatcher branches, the refusal and the stale-data
behaviour are all driven through the real screen.

### Deliberately NOT done in I-3

- No `api/documentCancel.api.ts`, no `blockedReason()` extension, none of the
  seven `doc.*` guard actions (I-4).
- No reversal-date input (`M8-23`), no `cancel_document` / `cancel_layer_*` /
  transfer / legacy cancellation family (`M8-24` … `M8-29`).
- No item replacement (`M8-28`, `D4`), no batch cancellation (`M8-30` …
  `M8-32`, `D3`), no correction flow (`M8-33` … `M8-39`, I-6).
  *(Superseded for `M8-28` by I-4 and for `M8-30` … `M8-32` by I-5; this line
  records the I-3 scope boundary as it stood and is not restated as current.)*
- No Excel / Çap / Silinmə report (`M8-50`, `D1`).
- `M7-109` is unchanged: its caller is still I-6.

### Checks after I-3 (run once, from `web/`)

- Full suite: **1947 tests / 104 files** passed. I-3 adds **74 tests in 2 new
  test files**; the pre-I-3 baseline was **1873 / 102**, re-measured locally at
  the start of this milestone rather than taken on trust.
- `npm run typecheck` clean · `npx oxlint` exit 0 · `npm run build` succeeded ·
  `git diff --check` exit 0.
- Root `index.html` MD5 remains `b9be15c5ca59b68337863369620d72fa`.
- `VITE_ALLOW_LOCAL_WRITES` verified absent from `web/.env` after the run; the
  file was not modified.
- No `insert`, `update`, `delete`, `upsert` or `rpc` call, and no Supabase or
  api import, exists in either new module — checked by grep as well as review.

### Mutation checks

Every new behavioural test was verified to FAIL against a plausible wrong
implementation, after which the correct version was restored and re-verified
green. **No wrong version is left on disk** (each file was diffed against its
pre-mutation copy afterwards). Thirteen mutations, each caught:

1. `Yerdəyişmə` tested AFTER `CANCELLABLE_TYPES` — transfers take an ordinary
   branch and the wrong marker family. *(13 tests failed.)*
2. An unsupported type falling through to the ordinary view instead of the
   legacy immutable-record refusal.
3. Ordinary grouping on `doc_num` ALONE — a `Qaytarma` row sharing the number
   joins a `Satınalma` document and is counted and displayed in it.
4. `stripRowLevelCancelled()` not applied inside the views — the cancelled
   original and its technical marker row both stay visible. *(5 tests failed.)*
5. A document emptied by stripping reported as document-CANCELLED.
6. The transfer view rendering BOTH database legs — one logical transfer shown
   twice, with a doubled line count.
7. The transfer status read with the ORDINARY markers — a cancelled transfer
   reads as open. *(5 tests failed.)*
8. Qaimə fed from `doc_num` instead of `invoice_num` — the system document
   number confused with the manual reference. *(8 tests failed.)*
9. `lotDoc` checked on the CLICKED ROW only rather than the whole document.
10. The unsupported-type refusal removed from the dispatcher — a dialog opens
    for a type that has no view.
11. A COPIED movement snapshot kept in page state across a refresh — the
    dialog keeps rendering pre-refresh values, and a removed row still renders.
12. A cancellation control rendered (enabled) in the dialog footer.
    *(9 tests failed.)*
13. The recorder rendered as `created_by || 'sistem'` — the INTERMEDIATE
    legacy mapping (`index.html:943`) rather than the final one at
    `index.html:990`, putting a raw UUID on screen.

Two of these (11 and 13) initially appeared to pass; in both cases the patch
had failed to apply rather than the test failing to catch it. Each was
re-applied correctly and then failed as expected. Both are recorded here
because a mutation that silently does not apply is a false negative, not a
clean result.

### Status of this milestone

`CODE VERIFIED` for the READ-ONLY portions of `M8-15` … `M8-22` named in the
ledger above, and for nothing else. The action and cancellation portions of
`M8-16` … `M8-19` remain open and are named row by row. **Nothing is
`LIVE VERIFIED`**: no live read or write was performed from the React app, and
the live gate remains I-8. Module I stays ONE acceptance boundary and is
**not** `ACCEPTED`; `ACCEPTED` additionally requires Codex's independent audit.

---

## Milestone I-4 — document cancellation (implemented 2026-09-06)

The ACTION half of the four document views I-3 rendered read-only. I-3 built
inspection; I-4 adds cancellation, single-row cancellation and item
replacement. The correction flow (I-6), the batch UI (I-5), exports (I-7) and
the live gate (I-8) remain untouched.

### Live-signature evidence (read-only)

Codex ran ONE SELECT-only catalogue query against the TEST project
`alkjjbaawmsirsfvqljm` on 2026-09-06. All thirteen cancellation RPCs were
found; every one returns `jsonb` and is `SECURITY DEFINER`:

```
cancel_document(p_doc_num text, p_reversal_date date)
cancel_layer_document(p_doc_num text, p_reversal_date date)
cancel_transfer_document(p_original_doc_num text, p_reversal_date date)
cancel_layer_transfer_document(p_doc_num text, p_reversal_date date)
cancel_movement_row(p_movement_id uuid, p_reason text)
cancel_layer_movement_row(p_movement_id uuid, p_reason text)
replace_movement_item(p_movement_id uuid, p_new_item_code text, p_reason text)
cancel_legacy_movement(p_movement_id uuid, p_reversal_date date)
cancel_layer_legacy_movement(p_movement_id uuid, p_reversal_date date)
cancel_legacy_transfer(p_movement_id uuid, p_reversal_date date)
cancel_layer_legacy_transfer(p_movement_id uuid, p_reversal_date date)
cancel_documents_batch(p_doc_nums text[], p_reversal_date date)
cancel_layer_documents_batch(p_doc_nums text[], p_reversal_date date)
```

This is **read-only signature evidence**. It authorises no write, and no RPC
was executed against TEST or production. It is not `LIVE VERIFIED`: nothing was
called, only described.

### Deviation `D-I1` — APPROVED and APPLIED

The two transfer variants take **different argument names**:

| RPC | argument |
|---|---|
| `cancel_transfer_document` | `p_original_doc_num` |
| `cancel_layer_transfer_document` | `p_doc_num` |

Legacy (`index.html:5250-5251`) sends `p_original_doc_num` to BOTH, switching
only the function name from `DB.layerActive` while keeping one argument object.
Against the live layer signature that call cannot bind — PostgREST resolves an
overload by argument name — so the legacy layer transfer cancellation fails
there. This is a real legacy defect, now confirmed against the live catalogue
rather than the rank-4 migration file the earlier premise rested on.

I-4 sends each RPC the names its own signature declares, and records this as an
**approved migration deviation**, not accidental parity drift.

It is also why `api/documentCancel.api.ts` has **no generic family helper**:
one shared helper parameterised by family is precisely the shape that produced
the legacy bug. The thirteen functions are written out separately, each with
its own literal argument object. The repetition is the safety property.

### Decision `D4` — RESOLVED as INCLUDED

Item replacement ships in I-4 for parity, with the legacy conditions preserved
exactly (`canReplaceRows`, `index.html:5023`): no replacement for transfers,
for a reversal or already-cancelled document, for a separately cancelled or
replaced row, or for any document where `lotDoc` is true.

### Files

| File | Role |
|---|---|
| `web/src/api/documentCancel.api.ts` | NEW — thirteen typed RPC functions; never throws, guard-first, server text verbatim |
| `web/src/lib/documentCancelGate.ts` | NEW — the pure gate shared by the visible control and the submit handler |
| `web/src/lib/replaceItemSearch.ts` | NEW — the picker search, current item excluded |
| `web/src/components/movements/CancelRowDialog.tsx` | NEW — «Sətri ləğv et» |
| `web/src/components/movements/ReplaceItemDialog.tsx` | NEW — «Malı əvəz et» |
| `web/src/components/movements/DocumentViewDialog.tsx` | EXTENDED — the four document-level families |
| `web/src/lib/mutationGuard.ts` | EXTENDED additively — the seven `doc.*` actions |
| `web/src/store/movements.store.ts` | EXTENDED — `layerActive` from the live capability probe |
| `web/src/pages/MovementsPage.tsx` | Wires `isAdmin`, `layerActive`, refresh and toast |

### Safety properties

- **One gate.** A control renders only when `documentCancelGate` allows it, and
  every submit handler re-runs the SAME function against the CURRENT rows
  before calling the API. There is no second, separately written check to
  drift.
- **Stale rows.** Every dialog holds an ID, never a copied movement, and
  re-reads the row (and re-assembles the document view) immediately before
  submitting. A document cancelled by someone else while a dialog stood open is
  refused rather than cancelled twice.
- **Double submission.** `inFlight` is set before the first `await` and released
  in `finally`, so a refusal cannot leave a dialog permanently disabled.
- **Refresh failure.** A failed refresh RETAINS the previous snapshot (the
  store's M8-45 rule); the message says the list is stale rather than implying
  the write failed.
- **Reversals create new rows.** Stated on screen wherever a cancellation is
  offered. Nothing in I-4 updates or deletes an original movement.
- **The UI gate is not the security boundary.** Every RPC is `SECURITY DEFINER`
  and re-checks the role; the client gate only avoids offering an action that
  would certainly be refused.
- **No anbardar warehouse filtering** was added (`D2` / `M8-42` unchanged).

### Verification

Targeted: 177 tests across the six affected files. Full suite run once.
`tsc --noEmit` clean, `oxlint src` clean, `vite build` succeeds,
`git diff --check` clean. Root `index.html` MD5 unchanged at
`b9be15c5ca59b68337863369620d72fa`; `VITE_ALLOW_LOCAL_WRITES` remains absent.

Supabase is mocked at the API boundary in every test. No live write, no SQL
mutation, no RPC execution against TEST, no fixture, schema, RLS or trigger
change, no dependency or env change, no deployment, commit or push.

### Mutation checks

| # | Mutation | Result |
|---|---|---|
| 1 | `cancel_layer_transfer_document` sent the legacy `p_original_doc_num` (`D-I1` reverted) | 2 tests failed |
| 2 | The admin gate removed from `canCancelDocument` | 3 tests failed |
| 3 | `lotDoc` no longer gating the per-row controls | 2 tests failed |
| 4 | The stale-row refusal re-check removed from the row-cancel handler | 1 test failed |
| 5 | `inFlight` set AFTER the awaits instead of before | 1 test failed |

Mutation 4 initially SURVIVED: the first stale test drove a row that had been
REMOVED, which the component's own `!row` early return already caught, so it
never exercised the handler's re-read. A second test was added that keeps the
row present but makes it ineligible — that one fails against the mutant. The
weak test is recorded rather than quietly replaced, because a mutation that
survives is a gap in the test, not a property of the code.

### Status of this milestone

`CODE VERIFIED` for `M8-24` … `M8-29`, `M8-48` and `M8-49`, and for nothing
else. **Nothing is `LIVE VERIFIED`**: no cancellation RPC has been executed
against any project, and the live gate remains I-8. Phase 8 is **not** complete
and Module I is **not** `ACCEPTED`; `ACCEPTED` additionally requires Codex's
independent audit.

Open: `D1`, `D3` and `D5` remain unresolved. I-5 (batch UI — the two batch
wrappers exist and are tested, but no selection UI is built), I-6, I-7 and I-8
are not started.

## Milestone I-6 — correction / edit flow (2026-09-07, LOCAL ONLY)

Implements `M8-33` … `M8-39` against
[`2026-09-07-phase8-i6-correction-flow-proposal.md`](2026-09-07-phase8-i6-correction-flow-proposal.md),
with the corrections listed below applied before coding.

**Nothing is `LIVE VERIFIED` and nothing is `ACCEPTED`.** No live Supabase read
or write, no SQL, schema, RLS, trigger or fixture change, no dependency or
environment change, no root `index.html` edit, no staging, commit or
deployment. Every transport is mocked in every test. Module I remains ONE
acceptance boundary and its live gate is I-8. `M7-109` stays `IN PROGRESS`:
its caller now EXISTS, which is a code fact, not a live one.

### What was built

| Area | File |
|---|---|
| Gate, impact contract, mapping (pure) | `lib/documentEdit.ts` |
| Correction outcome model (D6) | `lib/correctionOutcome.ts` |
| Unresolved-correction records | `store/correction.store.ts` |
| The two modals | `components/movements/EditDocumentDialog.tsx` |
| Entry button | `components/movements/DocumentViewDialog.tsx` |
| Dialog wiring + hydration | `pages/MovementsPage.tsx` |
| Hydration on the submitting screen | `pages/NewOperationPage.tsx` |
| Store-then-navigate | `App.tsx` |
| Correction write: status/code preserved | `api/postMovementDocument.api.ts` |
| Four outcomes + header fix | `store/operation.store.ts` |

### Proposal corrections applied before coding, each verified first

1. **`fetchDocumentEditImpact` validates nothing.** Confirmed by reading it:
   `Array.isArray(d.lines) ? (d.lines as EditImpactLine[]) : []` is a CAST with
   no runtime check, so an array of nulls or a NaN quantity passes through with
   the declared type. `readImpactContract()` now validates the whole response
   before anything renders or a draft is touched; a malformed response is an
   error with no navigation and no draft mutation.
2. **Re-checks after the await.** The gate is re-run on the response and again
   at confirmation, and obsolete responses (unmounted, superseded by a newer
   request token, or arriving after close) are discarded. **A real defect was
   found while testing this:** a plain closure over the props froze the gate
   inputs at the render that started the effect, so a second document entering
   edit mode mid-flight rendered the CONFIRMATION instead of the refusal. The
   inputs now live in a ref refreshed every render.
3. **`classifyFailure`, not `classifyOutcome`.** Confirmed — `lib/batchOutcome.ts`
   exports `classifyFailure`. It is reused (transport-level, batch-agnostic);
   `validateSuccessBody` is deliberately NOT reused, because it validates
   `cancelled_count` / `document_count` / `results`, which `correct_document`
   never emits. Corrections get `validateCorrectionBody()`.
4. **SQL provenance corrected.** `030_correct_document.sql` is NOT in this
   repository. It lives at `ANBAR_SHARED/sql/030_correct_document.sql`
   (MD5 `ae0f3f16b5aea2979053e7f9311e40be`, read read-only). It is a LOCAL
   definition and proves nothing about deployed behaviour.

### Decisions implemented

- **Draft replacement is WARNED, not silent.** Legacy replaces the form's lines
  without notice; the confirmation now says so when lines exist. Cancelling or
  any refusal leaves the draft untouched.
- **`D6` — uncertain correction outcomes are reported honestly.** The four
  outcomes are separated: confirmed rejection, confirmed success, UNKNOWN, and
  success-followed-by-refresh-failure. Only a CONFIRMED rejection (an
  unambiguous 4xx carrying a recognised PostgREST/Postgres code, or a guard
  refusal that never reached the network) may say «sənəd dəyişməyib». An
  UNKNOWN outcome records the attempt and BLOCKS a repeat correction of that
  document across modal close/reopen and page reload, until reconciled.

**A second real defect was found here:** `load()` reports `ok` from
`folded.loaded`, which STAYS TRUE when a previous snapshot exists (the M8-45
rule). Reading only `ok` would have reported a confirmed success over a stale
list, so `correction-stale` was unreachable. It now also reads `coreError`.

**A third gap was found by the existing suite:** the correction is submitted
from «Yeni əməliyyat», so that screen must hydrate the correction store too —
hydrating only on «Mal hərəkəti» left the store unscoped for a user who
reloads straight onto the operation screen, and `beginAttempt` refuses without
a scope. Both screens now hydrate; hydration is idempotent.

### I-5 is untouched

`store/batchCancel.store.ts`, `lib/batchOutcome.ts` and `BatchCancel.test.tsx`
were not modified. The correction records live in a SEPARATE store with a
separate `sessionStorage` key, so neither can read or clear the other's
blocks — asserted by test. I-5's three suites re-run: **173 passed**.

### Verification (exact)

- Focused: `documentEdit.test.ts` **35**, `correctionOutcome.test.ts` **17**,
  `correction.store.test.ts` **23**, `correctionWrite.test.ts` **17**,
  `DocumentEdit.test.tsx` **23** — **115 passed**.
- I-5 regression: `batchCancel.store.test.ts` + `BatchCancel.test.tsx` +
  `batchOutcome.test.ts` — **173 passed**.
- `NewOperationPage.test.tsx` **89 passed**;
  `DocumentViewDialog.test.tsx` **38 passed**.
- **Full suite: 2441 passed, 1 failed, 118 files.** The single failure is
  `probe/probe.test.ts` — a leftover DIAGNOSTIC scratch file from the earlier
  I-5 session (untracked, outside `src/`, dated before this session), which
  asserts `toEqual([])` purely to print values and fails identically in
  isolation with no I-6 code loaded. Its printed output shows I-5's protection
  working (`beginAttempt(B)=null`). It was NOT modified or deleted.
- Four mutation checks, all caught: restore map built for inbound too (1
  failure), header merged over the current header again (1), every failure
  treated as rejected (6), the on-arrival gate re-check removed (1).
- `tsc -b --noEmit` exit 0. `oxlint src` exit 0, no output. `vite build`
  succeeded. `git diff --check` exit 0. Root `index.html` NOT edited —
  MD5 `b9be15c5ca59b68337863369620d72fa`. No merge markers in `index.html` or
  `web/src`.

### Two existing tests were updated, and why

- `DocumentViewDialog.test.tsx` asserted «Sənədi redaktə et» was absent from
  EVERY branch — it encoded "I-6 has not shipped". Split: the batch-control
  assertion is unchanged for all four branches, and the edit-control absence is
  now asserted for the three branches that must still never offer it (transfer,
  doc-less, legacy transfer).
- `NewOperationPage.test.tsx`'s `correctDocument` mocks predated the
  status/code/data fields and so classified as UNKNOWN. Updated to the real
  `CorrectionResult` shape; no assertion was weakened.

### Remaining live checks (historical I-6 list; corrected 2026-09-08)

- The ordinary non-layer `document_edit_impact` React caller and successful
  `correct_document` outcome were executed on TEST in B4. The replacement
  `SND-12B8BCDD3A` and reversal `SND-C-B48FFF4DBE` were read back, together
  with the explicit correction audit entry. This supersedes the three stale
  statements that previously followed this heading.
- One non-success outcome is now narrowly live-observed: the real caller
  returned `editable:false` for `SND-76074E451C` and rendered seven populated
  block reasons. Still OPEN: the other non-success/malformed/transport paths,
  layer and transfer correction branches, failure atomicity, and role variants.
  The B4 and not-editable evidence must not be generalized to those paths.
- Whether the server's own admin refusal text matches what the UI shows is
  unverified live.


## Milestone I-7 — implementation evidence (2026-09-07)

**Updated 2026-09-07 (I-9):** the Silinmə report half of `M8-50` is now CODE
VERIFIED (row `M8-50b`). «Çap» is still not started, so `M8-50` remains
PARTIAL, and every live gate below still stands.

**CURRENT DECISION (2026-09-08): the preceding print-based reason is
superseded. `Çap` is an accepted historically non-functional feature and is
outside the acceptance boundary. `M8-50` remains PARTIAL only for the other
unverified Excel/report dimensions in its current row.**

**I-7 IS NOT PHASE 8 COMPLETION, `M8-50` IS NOT COMPLETE, and Module I is not
`ACCEPTED`.** I-7 delivered the ORDINARY «Mal hərəkəti» Excel export only.
«Çap» and the separate Silinmə report are not built and not rendered. **No live
Supabase read or write, no SQL, no schema/RLS/trigger change, no fixture
change, no dependency change, no commit and no deployment occurred.** No
workbook was generated against live data: the writer is mocked in the tests.

New files:

- `web/src/lib/movementExport.ts` + `movementExport.test.ts` —
  `MOVEMENT_EXPORT_HEADER` and the pure `movementExportMatrix()` (32 tests).
- `web/src/pages/MovementsPageExport.test.tsx` — button wiring, filters and
  ordering, the display-cap rule, the valuation map, the load gate, and the
  role rule (18 tests).

Changed files:

- `web/src/lib/movementFilters.ts` — `MovementFilterItem` gains `unit`.
- `web/src/store/movements.store.ts` — `derive()` keeps `i.unit`. **No read
  changed**: `items.api.ts` already selected `unit` and the snapshot already
  carried it; `derive()` was discarding it.
- `web/src/pages/MovementsPage.tsx` — the «Excel» button, `exportXls()` and
  the `canExport` gate.
- `web/src/store/movements.store.test.ts` and `web/src/pages/MovementsPage.test.tsx`
  — two I-2-era assertions updated to the shipped scope (the `itemBy` shape now
  includes `unit`; the "no export affordance" test now covers «Çap» and the
  Silinmə report only, and a new test asserts «Excel» IS rendered).

`lib/xls.ts` was **not** modified.

### Reuse, not reimplementation

`xls()`, `movKeyText()`, `whLabel()`, `movementValuation()` and
`writeOffUnitPrice()` are all reused as they stand. The only new logic is the
matrix builder.

### Deviations from the I-7 proposal, both deliberate

1. The pure function takes `valuations`, `emails` and `me` in addition to
   `rows`/`itemBy`/`warehouses`. The proposal's three-argument signature would
   have exported `qty × price` for every Silinmə row that has a stored
   valuation, and a raw UUID in «Qeyd edən». No store state is read inside the
   function; everything is passed in.
2. The proposal attributed the full filtered set `all` to the store. It is
   derived in `pages/MovementsPage.tsx` (`sortMovements(filterMovements(...))`),
   which is where the KPI line and the cap already consume it. No selector was
   added.

### Checks after I-7 (run once, from `web/`)

- Focused: **32 passed** (`movementExport`), **18 passed**
  (`MovementsPageExport`).
- Full suite: **121 files, 2562 passed, 0 failed**. The I-6 baseline was
  119 / 2511.
- `npm run typecheck` clean · `npx oxlint` exit 0 · `npm run build` succeeded ·
  `git diff --check` exit 0 (output is pre-existing CRLF advisories).
- Root `index.html` NOT edited — MD5 `b9be15c5ca59b68337863369620d72fa`,
  unchanged from the I-6 baseline; its mtime is 2026-09-01, predating this
  session.

### Mutation checks — three, all caught

- `page` substituted for `all` at the call site → 1 failure (the export would
  stop at `SHOW_MAX`).
- the `valuations` map replaced with an empty map → 1 failure (a stored 33.6
  becomes the 40 fallback).
- `unit` dropped again in `derive()` → 1 failure («Ölçü» exports blank).

### A legacy consequence pinned rather than "fixed"

A stored `final_amount` of 0 exports amount `0` but unit price EMPTY, because
legacy computes `+(0/4).toFixed(4)` = 0 and then blanks it through `pr || ''`,
while the amount column has no such guard. Stated in a test so it is not tidied
away later.

### Inherited, NOT newly approved

Legacy reads valuations only when `DB.layerActive` (`index.html:957`); React
reads `writeoff_valuations` unconditionally (I-2, `M8-51`). I-7 changed nothing
here and does not claim the two are equivalent: where a stored valuation exists
while layers are inactive, the React export carries the stored amount and
legacy would carry `qty × price`. Recorded as an open inherited deviation.

`lib/xls.ts` also still lacks the legacy CSV fallback — a pre-existing
limitation of the shipped helper, documented and not changed inside this
milestone. The legacy success toast is raised at the call site instead.


## Milestone I-9 — TEST live export evidence (2026-09-07)

Documentation only. This section records what a scoped TEST run actually
observed. It changes no application file, test, fixture, SQL, RLS, schema,
configuration or dependency, and no business data was mutated. It promotes no
milestone and does not close I-8.

### Chronology (preserved, including the superseded attempt)

1. **First in-app attempt — inconclusive, not a defect finding.** The existing
   `localhost:5175` tab held an older page without the report button; the dev
   script was restarted in sandbox mode on loopback 127.0.0.1:5175 with
   process-only `VITE_ALLOW_LOCAL_WRITES=false` and the TEST Supabase URL, no
   env file edited. Observed Supabase hosts were exclusively TEST
   `alkjjbaawmsirsfvqljm`. The report click issued a
   `/rest/v1/stock_layer_allocations` request and a success toast, but no
   workbook was located; an ordinary Excel control click behaved the same way.
   **A success toast is not evidence a file was saved, and the missing file is
   NOT established as a report defect.** Its internal cause remains unproven,
   and no application code was changed to work around it.
2. **Chrome download after user login — PASS.** The real button produced
   `Silinme_hesabati_2026-09-07.xlsx`, 18113 bytes, SHA256
   `EDDFCEE67D2CBE53E0A1F64167C12EE7590CC69E77832EFFE646716F14082DC1`.
3. **Native Excel opening — PASS on user observation** of that same file.

### What is now evidenced (and only this)

| Check | Result | Basis |
|---|---|---|
| Admin one-row report downloads through the real button | PASS | Codex-observed Chrome download of the actual file |
| Workbook content: one sheet, A1:Q2, 17 headers, text `0000001`, qty 3, omitted vs zero cells, mapped recorder | PASS | read-only import + independent ZIP/XML inspection of the downloaded artifact |
| Empty-result filter refuses and writes no file | PASS | observed refusal text, no additional workbook |
| Native Excel readability, no repair prompt | PASS | **user-operated**, on the unchanged file; Codex did not operate Excel |

These four need no repetition while the file and the relevant code are
unchanged.

### Explicitly NOT promoted by this section

- **Populated source-lot / «Mənbə partiyalar» sheet.** The downloaded artifact
  contains no source worksheet. That is consistent with the confirmed-inactive
  legacy path, but it neither exercises populated layered rows nor proves
  database-wide absence of allocations.
- **Roles (historical I-9 statement).** Only an admin session was exercised in
  the 2026-09-07 run. Superseded for `anbardar` by the 2026-09-08 follow-up
  below; `rehber` remains unobserved.
- **Pagination / volume.** One row exercises no page boundary, no `MAX_PAGES`
  behaviour and no all-or-nothing partial-read path.
- **Concurrency.** The refresh-in-progress refusals and the post-await abort
  were not triggered live; they remain CODE VERIFIED only.
- Normal session bookkeeping RPCs (`register_session` / `touch_session`)
  appeared in the resource inventory, so this record does not claim zero
  database-side session-metadata effects.

`M8-50` stays **PARTIAL** for the remaining Excel/report evidence gaps; `Çap`
is excluded from the acceptance boundary by the 2026-09-08 product decision.
`M8-50b` moves to
**PARTIALLY LIVE VERIFIED, narrow scope**, not `LIVE VERIFIED`.
**Module I remains ONE acceptance boundary, I-8 remains the live gate, and
Phase 8 is NOT ACCEPTED.**

### Relationship to the earlier ordinary-export evidence (chronology)

The ordinary «Excel» export was exercised live FIRST, in
[`audits/2026-09-07-phase8-i8-readonly-export-codex.md`](../audits/2026-09-07-phase8-i8-readonly-export-codex.md),
on the same TEST project and admin session. That check is not superseded by
this one: they cover different buttons and different rows (`M8-50` part a
versus `M8-50b`), and both remain partial. The I-8 audit's own not-executed
list (A1b volume, A7 roles, A8 allocation schema/RLS, and the A5 PARTIAL
stored-valuation branch) still stands unchanged.

### Follow-up check definition (subsequently executed on 2026-09-08)

**Scenario:** with a non-admin TEST session (`rehber` or `anbardar`), open
«Mal hərəkəti» and select the «Silinmə» type filter, then observe ONLY:

1. whether the «Silinmə hesabatı» button renders, and whether it is enabled or
   disabled;
2. if enabled and rows are visible, whether the download produces a workbook,
   and what that workbook contains;
3. which rows are visible on screen for that session.

**What this can and cannot establish.** It observes button and download
behaviour and OBSERVED VISIBILITY only. It is **not** an RLS-correctness check:
proving the server scopes rows correctly requires an EXPECTED
allowed/denied comparison — a known set of rows that role should and should not
see, derived independently and compared against what is returned. Observed
visibility alone cannot distinguish correct scoping from an empty or
coincidentally-matching result. No such expected set exists today, and building
one is a separate, separately-authorized step.

### Follow-up executed on 2026-09-08 — narrow `anbardar` PASS

The prerequisite was resolved by creating the TEST Auth identity
`anbar-anbardar-test@example.com` and, after separate action-time approval,
assigning it `role='anbardar'`, `warehouse='Test Anbar'`, `active=true` in
`public.users`. The auto-created `baxis` profile and the final assigned profile
were both verified read-only. These were explicit TEST account/fixture writes;
no production object was touched.

In a fresh Chrome localhost session (password not retained), the UI identified
the account as `Anbardar`. «Mal hərəkəti» showed five rows, all `Test Anbar`;
the Silinmə filter showed the one expected existing row and enabled «Silinmə
hesabatı». The real button downloaded
`Silinme_hesabati_2026-09-08.xlsx` (18,113 bytes), SHA-256
`EDDFCEE67D2CBE53E0A1F64167C12EE7590CC69E77832EFFE646716F14082DC1`,
one `Silinmə hesabatı` sheet, A1:Q2. It is byte-identical to the admin artifact
from 2026-09-07 and its inspected cells match the visible row.

This executed the proposed button/download/observed-visibility scenario, but
did **not** convert it into an RLS correctness proof: at the time of that run,
TEST had no independently known denied foreign-warehouse movement for
comparison. Later Phase 8 transfer fixtures supplied such raw rows, but no
fresh `anbardar` credential/session is available for the comparison. `rehber`, ordinary
Excel under non-admin, source-lot, pagination/volume and concurrency paths stay
open. Evidence:
[`audits/2026-09-08-phase8-anbardar-writeoff-export-live-check.md`](../audits/2026-09-08-phase8-anbardar-writeoff-export-live-check.md).

### Blockers on the other unverified paths, distinguished by KIND

Not all of them require data creation. They differ:

- **Populated source-lot sheet 2** — blocked on DATA: the visible TEST row
  produces no layered allocation. Creating one is a write.
- **Pagination / `MAX_PAGES` volume** — blocked on DATA: five movements and one
  Silinmə row exercise no page boundary. Creating volume is a write.
- **Remaining non-admin coverage** — `anbardar` Silinmə observed/downloaded on
  2026-09-08; `rehber` and ordinary Excel under non-admin remain unexecuted.
- **Concurrency / refresh-abort and the refresh-in-progress refusals** — NOT
  necessarily blocked on data. These are TIMING paths: they need the ability to
  induce or intercept a refresh at a chosen moment (request interception,
  latency injection, or another controllable trigger). Whether that capability
  is available read-only in this environment has not been established. It is a
  capability question, not a data-creation question, and it should not be
  described as requiring writes until it has actually been assessed.
