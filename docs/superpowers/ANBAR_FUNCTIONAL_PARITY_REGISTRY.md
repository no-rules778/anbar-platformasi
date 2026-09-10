# ANBAR Functional Parity Registry

> **PHASE 9 T3 PAGE / STORE / API — 2026-09-10 (latest).** The `bal` route is
> wired (M9-01, M9-04) and `pages/BalancesPage.tsx` plus its store, snapshot
> API, condition write API, `ConditionCell` and the export/xls modules were
> audited row by row against legacy and the owner-approved Q1 / D-J1…D-J4
> decisions. Promoted on unit/page evidence (72 rows incl. the closed M9-71);
> M9-92, M9-99, M9-100, M9-108 are `IN PROGRESS` (client half verified,
> server/live leg open). Measured mechanically across the 124 ledger rows:
> **112 `CODE VERIFIED`, 6 `NOT STARTED`, 1 `LIVE VERIFIED` (M9-141a), 5 `IN PROGRESS` (M9-19, M9-92, M9-99, M9-100, M9-108), 0 `BLOCKED`, 0 unclassified.** Phase 9 remains `NOT ACCEPTED`.
> [Evidence](audits/2026-09-10-phase9-t3-balances-page.md).
>
> **PHASE 9 STATUS — 2026-09-10 (authoritative).** Phase 9 design is
> `ACCEPTED`; Phase 9 **implementation is IN PROGRESS, not `NOT STARTED`** —
> the banner below dating from the design acceptance is superseded on that
> point. **SUPERSEDED (T3):** measured then as 37 `CODE VERIFIED`,
> 84 `NOT STARTED`, 1 `LIVE VERIFIED` (M9-141a), 2 `IN PROGRESS` (M9-19,
> M9-71), 0 unclassified — HISTORY, see the T3 banner above. (An earlier 38 / 84 / 1 / 1 / 0 figure is HISTORY:
> the Codex correction round demoted **M9-71** to `IN PROGRESS` — its sorting
> clause is verified, but the `normalMovements()` operational-source clause is
> not implemented or proved.)
>
> **PHASE 9 T2 «ƏVVƏLƏ QALIQ» — 2026-09-10 (latest).** `lib/initialBalance.ts`
> ports the opening-balance reconstruction and its view filter/sort from
> `index.html:1898-1952, 1959-2048, 2240-2253`: **M9-55, M9-70, M9-72…M9-77,
> M9-79, M9-79a, M9-79b and M9-84 are `CODE VERIFIED`; M9-71 is
> `IN PROGRESS`** — **12 rows, 25 → 37**, after
> the Codex round demoted **M9-71** to `IN PROGRESS` (an earlier "13 rows,
> 25 → 38" figure is HISTORY). **M9-84 is
> the owner-approved D-J4 correction** — the read now recognises the historical
> marker in partner **or** channel, matching the write guard; this is
> explicitly NOT byte-identical legacy behaviour. M9-78, M9-80…M9-83 and M9-85
> are presentation rows and were **not** promoted.
> [Evidence](audits/2026-09-10-phase9-t2-initial-balance.md).
>
> The earlier tally was 25 / 97 — the Codex review measured 21 / 101 before the
> T2 filters/sorts/KPI slice promoted M9-51, M9-52, M9-54 and M9-61
> ([audit](audits/2026-09-10-phase9-t2-balance-filters.md)).
> **M9-51 boundary correction (Codex-found, 2026-09-10):** the ledger wording
> `zero |q| < 1e-9` was wrong and now reads `<= 1e-9`. Legacy 2327-2329 rejects
> only `< 1e-9` for `act` and only `> 1e-9` for `zero`, so exactly `q = ±1e-9`
> belongs to **both** segments. The implementation already reproduced this and
> was **not** changed; three boundary tests were added. Contract/evidence
> correction only — M9-51 stays `CODE VERIFIED` and the tally is unaffected.
> Codex independently verified the `balanceRows` implementation
> against legacy `index.html:2280-2324`, focused tests 24/24, `tsc -b --noEmit`
> clean, 124 unique rows, 0 staged, `git diff --check` clean; M9-36 and M9-41
> remain unpromoted. Phase 9 remains `NOT ACCEPTED`.

> **PHASE 9 T2 BALANCE ROWS — 2026-09-10.** `lib/balanceRows.ts` ports the
> three balance-table source shapes, the no-movement catalogue rows and the
> display-only condition markers from `index.html:2280-2324`: M9-30…M9-35,
> M9-42, M9-43 and M9-45 are `CODE VERIFIED`. M9-36 and M9-41 are deliberately
> not promoted — both need presentation/KPI/export code that does not exist yet.
> Phase 9 remains `NOT ACCEPTED`.
> [Evidence](audits/2026-09-10-phase9-t2-balance-rows.md).

> **PHASE 9 T2 CONDITION RULES — 2026-09-10.** M9-90/M9-91 and M9-96/M9-97
> are `CODE VERIFIED`: the pure editor-permission and numeric-input rules now
> mirror legacy `canEditCond()`/`saveCond()`, including rehber refusal, exact
> warehouse matching, comma parsing, blank-to-zero, exact error text and
> two-decimal rounding. [Evidence](audits/2026-09-10-phase9-t2-condition-pure-rules.md).

> **PHASE 9 T1 — 2026-09-10.** The shared warehouse × item index now carries
> `last/first/price/val/name/unit` with the exact legacy catalogue/fallback and
> four-decimal balance rules. M9-21…M9-28 are `CODE VERIFIED`; all existing
> consumers remain green. No Supabase or production contact, mutation, staging,
> commit, push or deploy. Phase 9 remains `NOT ACCEPTED`.
> [Evidence](audits/2026-09-10-phase9-t1-balance-index.md).

> **AUTHORITATIVE CODEX UPDATE — 2026-09-10. Phase 9 / Module J design is
> `ACCEPTED`; the pre-implementation T0A gate is `IN PROGRESS`, application
> implementation is `NOT STARTED`, and Phase 9 is `NOT ACCEPTED`.**
> The final design contains 124 unique `M9-*` rows. T0A is a strictly read-only
> TEST gate; T0B requires authorised catalog access or a fresh trusted capture;
> all mutation/refusal/fallback probes remain deferred to the separately
> authorised T10 window. See the
> [final design acceptance](audits/2026-09-10-phase9-design-codex-acceptance.md),
> [proposal](specs/2026-09-10-react-migration-phase9-balances-proposal.md),
> [ledger](specs/2026-09-10-phase9-registry-rows.md), and
> [plan](plans/2026-09-10-react-migration-phase9-balances.md).

> **T0A progress — 2026-09-10.** Admin read-only evidence is live: 127
> movements, 6 items, 2 `stock_conditions` rows with all ten requested columns
> including `icare_qty`, and 3 warehouses. M9-141a is `LIVE VERIFIED`: an
> independent reconstruction produced 127 raw → 3 operational rows and equal
> balances on all 3 warehouse × item keys. The T0A admin **and anbardar** legs
> are complete: anbardar receives 107 movements and 1 condition, all `Test
> Anbar`, from the same unfiltered REST reads. The owner accepted the unavailable
> rehber read as a non-blocking T0A scope waiver; it is not claimed as evidence.
> T0B metadata remains separately open. See
> [audit](audits/2026-09-10-phase9-t0a-admin-and-m9-141a-live-check.md).

> **AUTHORITATIVE CODEX UPDATE — 2026-09-10. Phase 7 / Module H is
> `ACCEPTED`.** The final audit reconciled all 135 `M7-*` rows, fixed the last
> implementation defect (M7-40 layered draft price variants), closed the
> remaining exact code contracts, and live-verified M7-121's channel/partner
> guard refusals at TEST count 127→127. Full gate: 126 files / 2730 tests,
> typecheck, oxlint and sandbox build. Owner-approved scope remains active
> layers/active splits, no deactivation or cutover, `Çap` excluded. See
> [final Codex acceptance](audits/2026-09-10-phase7-final-codex-acceptance.md).


**2026-09-09 M8-04 LIVE VERIFIED — the remaining formatting branches, via a
browser-only presentation harness.** Read-only: no TEST write, no persistent
fixture, no code change, 0 production contact, TEST movement count **unchanged
at 109**. **Scope first, because the row is easy to misquote:** the 12 `M804`
rows existed **only as an intercepted HTTP response body inside one Chrome
context**; the real TEST table held **109** rows before, during and after. This
is **React presentation-contract evidence only** — NOT stored TEST data, NOT
backend generation, NOT payload/performance. Application helpers were **never
imported**: `whLabel`, `resolveWh`, `normWhName`, `nf`, `money`, `fmtD` and
`recorderLabel` were reimplemented independently, cells addressed by
**header-name → column index** rather than class selectors, and the store never
touched. 12 synthetic rows → **12 rendered, 0 missing, 0 unexpected**.
**Closed branches:** the `Xocahəsən` → **`Xocəsən`** alias (raw payload still
carrying `Xocahəsən`, so display-only); all three channel cases —
`Yerdəyişmə`+`Test anbar` → **`—`**, `Yerdəyişmə`+`Təcili` → **`Təcili`**,
`Alış`+`Test anbar` → **`Test anbar`** (every channel non-empty, so an empty
value is never mistaken for suppression; `"Test anbar"` resolves to the real
configured `Test Anbar` through the historical «… anbar» form, **not** the known
TEST «… Anbar» artifact); the note boundary at **41 → 40+`…`** and **exactly 40
→ no ellipsis**, full text in `title` byte-for-byte; and the recorder branches
`null`/`'sistem'` → **`Excel idxalı`**, unknown UUID → **`digər istifadəçi`**,
with **no UUID in any cell or anywhere in the DOM**. **Current-user-name branch,
separate leg:** the directory warms **once at boot** (`App.tsx:92-99`), so a
remount-time override is too late — a first attempt rendered the email and was
rerun with the override armed **before login**. Only `/rpc/get_user_directory`
was overridden (never sign-in, `register_session`, `current_user_role`, profile
reads or any mutation/session RPC), removing **exactly one** entry: the row
rendered the live profile name **`ANBAR Test Admin`**, while a control row for
another still-listed id resolved to its email — proving a surgical trim, not a
broken response. **12/12** in that leg. **Recovery:** raw back to 109, directory
back to 4 entries, rendered rows back to **3 byte-identical** to baseline, no
`M804` or `Xocəsən` left in the DOM, no banner; sessions closed through «Çıxış».
**Two harness-side expectation errors, neither an application defect:** the
harness expected `1,00` because **Node's ICU** renders `az-AZ` with a decimal
comma while **Chrome** renders `1.00`; and a “zero price” row rendered `12.50`
because `pr = m.price || it.price` correctly fell back to the nomenclature price
(`items.api.ts:45` selects `price`), so that row was simply not a valid
zero-price fixture — `money()`'s zero → em-dash branch passed and was already
LIVE from real data. No mutation RPC; nothing staged; dirty tree preserved; no
application source touched; no I-10 row.
**Recalculated: 18 LIVE / 26 PARTIAL / 8 CODE-ONLY.** Phase 8 remains NOT
ACCEPTED.
[Evidence](audits/2026-09-09-phase8-m8-04-formatting-branches-live-check.md).


**2026-09-09 M8-06 LIVE VERIFIED — «ləğv edilib» tag, via a browser-only
historical presentation fixture; and a documented contradiction resolved.**
Read-only: no TEST write, no database fixture, no code change, 0 production
contact, TEST movement count unchanged at **109**. **The contradiction first:**
the latest M8-05 report recommended M8-06 because cancellation markers already
exist; the `M8-51` handoff said no surviving operational row carries a
tag-capable marker. Recomputed from the current raw **109**-row snapshot with
the application helpers never imported — **`M8-51` was right**. M8-05's premise
is true (53 markers exist; **44** raw rows have a non-null `cancelledDocFor()`)
but its inference fails: **0 of those 44 are operational**. The reason is
structural, not a counting error — `excludeCancelled()` adds to `hiddenDocs`
only under `if (docMatch && doc)`, where `doc` is the **marker row's own**
`doc_num`, while `docCancelledBy()` carries no such guard. A doc'd marker
therefore both produces the tag and deletes the row that would display it, so a
doc'd row can never be operational and tag-positive at once. The only escaping
shape is a **doc-less** marker — source survives, `'—'` fallback returned — and
that shape is *historical*: all four server-written shapes carry a generated
`doc_num`, so **no claim is made that current RPCs generate it**. Because no
real tag-positive row exists, no database fixture was created and **no
real-backend branch coverage is claimed**; the React presentation contract was
proved with a **controlled browser-only fixture**, on the same basis as
`M8-11`. **Positive:** source rendered, marker row NOT rendered as a live
movement, İstiqamət cell exactly `ləğv edilib`, `—` fallback, no banner.
**Negative control:** only the marker note neutralised, source row
byte-identical — tag 1 → 0 on the **same rendered identity**, so filtering
cannot explain it. **RAW-vs-operational:** a source-only payload rendered 0 tag
spans, proving the marker row `excludeCancelled()` removes is required — shown
by payload→DOM correlation, no internal helper called. **Recovery:** raw back
to 109, rendered rows back to 3 cell-by-cell identical to baseline, no `M806`
or `ləğv edilib` left in the DOM, no banner, both sessions closed through
«Çıxış». No mutation RPC; every non-GET was a read RPC or session bookkeeping.
Nothing staged, dirty tree preserved, no I-10 row. Focused tests 78/78. On the
present TEST snapshot the tag is **structurally unreachable** from live data.
Phase 8 remains NOT ACCEPTED.
[Evidence](audits/2026-09-09-phase8-m8-06-cancellation-tag-live-check.md).

**2026-09-09 M8-11 LIVE VERIFIED — soft cap, «Hamısını göstər» and stickiness,
via a browser-only presentation fixture.** Read-only: no database mutation, no
fixture write, no code change, 0 production contact. **Scope stated first,
because the numbers invite misquoting:** the 3001-row set existed **only as an
intercepted HTTP response body inside one Chrome context**; the real TEST table
held **105** rows before, during and after. This is **React-contract evidence
only** — NOT 3001 rows in TEST, NOT backend-volume, NOT payload-performance,
**NOT M8-53**. Only the exact full-column `movements` snapshot GET was
intercepted (Auth, every `/rpc/`, `items`, `warehouses`, `writeoff_valuations`
never were), with `offset`/`limit` honoured per request, so 8 intercepted
requests are 4 offsets duplicated by StrictMode = one logical load of 3001.
**Cap**: full result 3001, exactly **3000** DOM rows, footer `3,001 qeyd ·
mədaxil 3,000.00 · məxaric 1.00` — computed from the FULL set, proved by the
`məxaric 1.00` that belongs to the single hidden row. **Control**: `Hamısını
göstər (3,001)`, absent at exactly SHOW_MAX (3000) and below (1), returning when
the filter cleared. **Expansion** through the real visible button (store never
set directly): 3001 rows, footer unchanged, control gone. **Stickiness**: after
expanding, a filter rendered 3000 uncapped and the real «Sıfırla» returned 3001
with all 3001 still rendered — no revert to the cap. Navigation/remount
persistence deliberately NOT tested (the ledger does not require it).
**Falsifiable ID accounting**: 0 missing, 0 unexpected, 0 duplicates in every
leg; exactly 1 row revealed by expansion. **Recovery**: interception removed,
real remount restored the baseline 3 rows with a byte-identical footer, no
synthetic identity, no error banner. Tests 67/67 at the real `SHOW_MAX`. Phase 8
remains NOT ACCEPTED.
[Evidence](audits/2026-09-09-phase8-m8-11-soft-cap-live-check.md).

**2026-09-09 M8-09 LIVE VERIFIED · M8-54 advanced · M8-04 stays PARTIAL —
the first authorised WRITE run of Phase 8 acceptance.** One minimal reversible
exact-layer transfer (`post_layer_transfer_document` → **`SND-833CFA7E90`**,
0.01 units of `0000001`, Test Anbar → CODEX Phase8 Transfer Anbar, OUT leg
`d0f01e27…`, IN leg `6c68a39c…`) was created and cancelled entirely through the
real React UI. Write access came from `VITE_ALLOW_LOCAL_WRITES=true` given to a
**temporary process only**; `web/.env.sandbox.local` was never edited.
**M8-09**: the selector went 0 → 2 options, selecting one narrowed the table to
exactly the matching leg, and — the contract's real claim — a filter that
removed the key from the option source reset the selection to empty AND
re-filtered the table on the **resolved** value, so control and rows never
disagreed. **M8-54**: expectations recomputed **independently** (app helpers
never imported) matched the DOM exactly, promoting `transferRoute()`'s two
half-resolved branches, `movKey()`'s `raw:` branch and `movKeyLabel()`; the
fully-resolved `route:` branch **stays CODE VERIFIED** because `normWhName()`
strips one trailing «anbar…» token and both TEST warehouses are themselves
named «… Anbar» — a **TEST-data naming artifact, not a production defect**, as
the five real warehouses resolve correctly under the same computation.
**M8-04** stays PARTIAL: both legs carry `channel: ""`, so suppression of a
non-empty warehouse-valued channel is NOT claimed. Closure via
**`cancel_layer_transfer_document`** with **`p_doc_num`** (`D-I1` confirmed
live) → `SND-R-0F906E6B89`; Test Anbar restored to **8**, destination to **0**,
no negative balances. **Raw movements 101 → 105 (+4) is correct** — movement
rows are immutable audit history and net-zero means inventory/layers/balances,
not row deletion. Exactly two write RPCs, 0 production contact, no code change,
no I-10 row; `M8-06` not attempted. Phase 8 remains NOT ACCEPTED.
[Evidence](audits/2026-09-09-phase8-m8-09-m8-54-transfer-fixture-live-check.md).

**2026-09-09 M8-03 LIVE VERIFIED · M8-52 LIVE VERIFIED · M8-05 stays PARTIAL:**
one read-only TEST-admin pass over the real React «Mal hərəkəti». Three
datasets were kept separate — RAW **101** → OPERATIONAL **3** → RENDERED **3**.
**M8-03**: the surviving set was reimplemented independently from the legacy
rules (the app's `excludeCancelled()` was never imported or called) and proved
equal element-by-element **by id** — 0 missing, 0 unexpected, footer recomputed
from the same set. All three cancellation families are materially exercised
(35 document reversals, 12 legacy row-level, 2 legacy transfer pairs → 59
hidden docs, 14 hidden ids; 98 of 101 rows excluded), including `SND-C-*`
correction and `SND-R-*`/`SND-LR-*` transfer pairs. The **M8-20 distinction is
proven live**: 11 documents reach zero visible rows through row-level counters
alone without ever entering `hiddenDocs`, so a partially modified document is
not mistaken for a whole-document cancellation. **M8-52**: verified on the
exact request the page issues (matched by full column signature so a narrower
`movements` read from another screen could not be latched) — 16 explicit
columns in order, both widened fields present, 0 missing, not `select=*`,
deterministic `order=date.asc,created_at.asc`, one paging leg; the two observed
requests are one logical load duplicated by StrictMode. Payload size is not
claimed (that is M8-53). **M8-05 remains PARTIAL**: only one `Silinmə` row is
visible and it takes the unvalued `pr<=0` → em-dash branch. `writeoff_valuations`
does hold 3 rows, but **every one belongs to a row-level-cancelled movement**,
so the stored-valuation, stored-`unknown` and legacy `qty × price` branches have
no live fixture and stay CODE VERIFIED — **no data was created** to reach them.
No mutation RPC, no fixture, 0 production contact. Phase 8 remains NOT ACCEPTED.
[Evidence](audits/2026-09-09-phase8-m8-03-m8-05-m8-52-live-check.md).

**2026-09-09 presentation sweep — eight rows LIVE VERIFIED, two PARTIAL:** one
read-only pass over the non-live presentation rows on TEST admin plus a
sequential `anbardar`/`rehber` role leg, all on a freshly started verified
`--mode sandbox` read-only localhost. Evidence is DOM assertion plus
independent recomputation from the raw snapshot response, not screenshots.

`M8-01` (rail entry visible, **second** in the `Əməliyyat` group, real click
opens the screen, exactly one active entry), `M8-02` (heading, subtitle and the
four-action row; **the `rehber` gap is closed** — both non-admin roles render
both exports and NOT `mv-batch-cancel`; «Çap» absent entirely, not disabled),
`M8-07` (match / no-match / clear, with byte-identical restoration), `M8-08`
(the fixed eight-type list, type + warehouse filters, **both date bounds proved
inclusive live**, «Sıfırla» restores baseline), `M8-10` (the **default**
`date desc` order — the contract is not interactive sorting, and no sort
affordance was invented), `M8-12` (footer KPI **independently recomputed** and
matching exactly, before and after a filter), `M8-13` (plain navigation, no
prefill, no submission, byte-identical return) and `M8-41` (all three roles
reach the screen; RLS re-confirmed at **85** raw rows for `anbardar` vs **101**
for `rehber`/`admin`) are promoted **LIVE VERIFIED**.

`M8-04` and `M8-54` are promoted **PARTIALLY**, per branch, and the unexercised
branches are named rather than quietly included: no live fixture exists for
40-character note truncation, `Yerdəyişmə` channel suppression, three of the
four recorder branches, `transferRoute()` or `movKey`/`movKeyLabel` — those stay
CODE VERIFIED, **and no data was created to reach them**. Within M8-04, the
recorder label is the notable live gain: `created_by` is a UUID in the raw
response and renders as the directory email, with **the UUID in zero rendered
cells** — the I-2 finding-2 correction proven falsifiably.

Two harness faults were caught and corrected rather than reported as results: a
reconnaissance pass latched the wrong `movements` response (other screens issue
their own narrower select) and a footer comparison failed only because Node and
Chrome render `az-AZ` decimals differently. No application code was changed. Raw
`movements` **101**; no mutation RPC, no fixture, 0 production contact; all
sessions ended through the real «Çıxış». Phase 8 remains NOT ACCEPTED.
[Evidence](audits/2026-09-09-phase8-presentation-sweep-live-check.md).

**2026-09-09 M8-44 → LIVE VERIFIED (concurrent stale-response interleaving):**
the monotonic request sequence was proved live on TEST admin through the real
React «Mal hərəkəti» screen, on a freshly started verified `--mode sandbox`
read-only localhost. Network control delayed or fulfilled TEST GET responses
only; Auth and every `/rest/v1/rpc/` request were excluded by an explicit guard.
**One logical load was traced to 8 held requests** — four snapshot GETs ×
StrictMode duplication, `movements` single-paged at 101 rows — and all four
endpoints are held together because `fetchMovementsSnapshot()` awaits
`Promise.all` over all four. **Leg A:** load A held genuinely pending (8
requests, **0** responses delivered), newer load B issued via a second real
remount and completed on the real TEST response; releasing A afterwards with a
valid but visibly distinguishable payload left B's table and footer
byte-identical, with no marker, no banner, no full-screen error, no restarted
loading and all controls usable. **Leg B:** both loads observed in flight (8
held each); the stale A release did not replace the snapshot, raised no stale
error and **did not clear or settle the loading state owned by B**, which then
became the final settled snapshot. **Stale-failure sub-leg:** a stale HTTP 503
while B was pending produced no banner and did not settle B's loading — the
row's own contract, not an invented criterion. `loading` was read through an
application-owned DOM projection (`mv-export-writeoff`'s disabled state under a
pinned «Silinmə» filter); **no application code was changed**. **The decisive
check is a positive control:** the identical marked payload, released as the
NEWEST load, rendered `M844STALE` in the visible İSTIQAMƏT column — so the
marker reaches the screen when a load wins, and its absence elsewhere is a real
discrimination. Two earlier executions were **rejected as evidence rather than
reported**, both for an unfalsifiable marker (a row `excludeCancelled()` removes,
then a row the pinned filter hides). The same module-level `requestSeq` was
proved to receive both invocations: an identical window stamp across three
remounts, 0 main-frame navigations, no reload. Raw `movements` **101**. No
mutation RPC, no fixture, 0 production contact; session ended through the real
«Çıxış». Not claimed: other roles (the guard has no role dimension), other
screens' stores, and interleaving via the realtime refresh path. Phase 8 remains
NOT ACCEPTED — other OPEN rows are unrelated to this one.
[Evidence](audits/2026-09-09-phase8-m8-44-stale-response-interleaving-live-check.md).

**2026-09-09 M8-45 → LIVE VERIFIED (role dimension closed):** the smallest
sufficient matrix — one `movements` HTTP 503 retention leg plus recovery — was
run for `anbardar` and `rehber` in a fresh browser context each; the admin
matrix was not repeated. Both roles kept their table visible with unchanged row
identity and footer, showed their own banner, produced no full-screen error,
settled loading, kept allowed controls usable, recovered identically with the
banner cleared, and rendered no admin-only «Qrup üzrə ləğv» (count 0). RLS was
re-confirmed from a second code path: raw `movements` returned **85 rows for
`anbardar`** and **101 for `rehber`**, matching the role/RLS partition. Both
still render the same 3-row operational table because the screen shows
`excludeCancelled()` output — a fixture coincidence, not inactive RLS. Each
device session was ended through the real «Çıxış» (`rpc/end_session` observed).
`M8-45` now has live evidence across all four core reads, both failure shapes
and all three roles, so it is **promoted to LIVE VERIFIED** for its actual
contract; the contract carries no role requirement of its own, and no broader
endpoint coverage is claimed. No mutation RPC, no fixture, 0 production
contact. **M8-44 concurrent stale-response interleaving is not claimed here**
(it was OPEN when this entry was written and was closed separately the same day
by the M8-44 entry above; that statement of non-claim still stands — none of
this M8-45 evidence contributes to M8-44). Phase 8 remains NOT ACCEPTED.
[Evidence](audits/2026-09-09-phase8-m8-45-role-dimension-live-check.md).

**2026-09-09 M8-45 matrix COMPLETED — all four core reads, both failure
shapes:** the three legs left open by the movements/503 pass were exercised on
TEST admin through the real React UI, plus a transport abort. `items` 503,
`warehouses` 503, `writeoff_valuations` 503 and an `items` `route.abort` each
kept the loaded table visible with identical row identity and footer, showed a
distinct and correct banner, produced no full-screen «Yükləmə xətası», settled
loading, kept every control enabled, and recovered to the identical snapshot
with the banner cleared. Two results carry extra weight: `warehouses` correctly
shows `Anbar siyahısı yüklənmədi` rather than the server text, because
`fetchWarehouses()` throws and the normaliser converts the rejection — the
documented both-failure-shapes contract; and `writeoff_valuations` is live proof
of the I-2 correction that a failed valuation read is FATAL and retains the
whole snapshot instead of degrading to an empty valuation map. Raw `movements`
re-measured at 101 before and after. **A first run of this matrix showed no
banner on all four legs and was rejected as evidence** — Nomenklatura issues its
own same-signature `items`/`warehouses` reads and StrictMode double-issues each
read, so the interceptor was disarming on the wrong request; the harness was
fixed, **not the application code**. No mutation RPC, no fixture, 0 production
contact. M8-44 interleaving is NOT claimed from these sequential failures. Other
roles remain open. Phase 8 remains NOT ACCEPTED.
[Evidence](audits/2026-09-09-phase8-m8-45-remaining-read-legs-live-check.md).

**2026-09-09 M8-45 failed-refresh retention — NARROW LIVE PASS:** browser
network interception was available, so the row moved off code-only evidence.
Playwright drove installed Chrome against a verified `--mode sandbox`
read-only localhost and failed exactly one required TEST read
(`**/rest/v1/movements**`, HTTP 503); Auth was never intercepted and no
mutation RPC ran. Through a real navigation-remount refresh the loaded table
stayed visible with identical row identity and footer
(`3 qeyd · mədaxil 11.00 · məxaric 3.00 · mədaxil dəyəri 111.00 ₼`), the
«Yenilənmədi» banner rendered above it, loading finished and every control
stayed enabled; removing the interception recovered the same snapshot with no
banner. The `movements` response carried **101 rows**, confirming the audit
baseline — the table shows 3 because it renders `excludeCancelled()` output.
No write of any kind; production contact attempts 0. Other roles, the
non-`movements` failure legs, transport aborts and M8-44 interleaving stay
open. Phase 8 remains NOT ACCEPTED.
[Evidence](audits/2026-09-09-phase8-m8-45-failed-refresh-retention-live-check.md).

**2026-09-09 M8-40/M8-42/M8-43 role/RLS continuation:** dedicated TEST
`anbardar` and `rehber` identities removed the credential blocker. The
`anbardar` server mutation was refused verbatim with P0001 and 101→101
movements; its unfiltered read exactly matched all 85 `Test Anbar` rows and
excluded all 16 destination-warehouse rows. Admin still saw zero audit rows,
while `rehber` saw 543 including seven known Phase 8 fixture matches. M8-42's
current-fixture allowed/denied comparison is closed; M8-40/M8-43 retain only
their explicitly broader untested-family scope. Phase 8 remains NOT ACCEPTED.
[Evidence](audits/2026-09-09-phase8-m8-40-m8-42-m8-43-role-rls-live-check.md).

The same audit records the real read-only React `rehber` page (`1–50 / 544`)
and an operational deviation: localhost was briefly started without
`--mode sandbox`, causing one rejected TEST-credential sign-in request to the
production Auth endpoint. No production session, authenticated REST read or
application write followed; the process was stopped immediately and the final
localhost is TEST sandbox/read-only.

**2026-09-09 autonomous continuation boundary:** all currently reachable narrow
browser branches were completed with net-zero TEST fixtures. Remaining items
require inactive-layer/edit state, non-admin/rehber credentials, a fresh cutover
or a controlled fault/volume harness. Phase 8 remains NOT ACCEPTED; see the
boundary audit.

**2026-09-09 M8-22/M8-32 evidence reconciliation:** the M8-47 two-tab run also
showed the peer ordinary card's exact already-cancelled presentation and
reversal number. The M8-46 batch double-click closes the narrow same-control
UI-concurrency gap for M8-32. Other families/multi-tab batch remain OPEN.

**2026-09-09 M8-20/M8-46 row-cancel follow-up — NARROW PASS:** a real row
submit double-click produced one counter only, restored layers/balance, and the
emptied card correctly remained a partially modified document rather than a
whole-document cancellation. Correction/replacement M8-46 branches remain OPEN.

**2026-09-09 M8-46 batch double-submit follow-up — NARROW PASS:** a real
double-click on the two-document TEST-admin batch submit produced exactly one
reversal per source, no duplicates, and net-zero layer/balance restoration.
Correction, row and replacement M8-46 branches remain OPEN.

**2026-09-09 M8-47 React submit-gate follow-up — NARROW PASS:** two authenticated
TEST-admin tabs submitted the same ordinary cancellation concurrently; exact
one-reversal read-back and net-zero layer/balance restoration are recorded in
the live audit. Batch, correction, row/replacement branches remain OPEN.

**2026-09-09 M8-46 React double-submit follow-up — NARROW PASS:** TEST admin
created a 0.01 exact-layer receipt `SND-BD8A2AB48F`, opened its real document
card and dispatched a genuine browser double-click on the cancellation submit.
The UI produced one reversal `SND-C-015729F809`; authenticated read-back found
exactly one source and one reversal (count 89→91), the receipt layer consumed
to 0/inactive, balances restored to 8/0 and zero negative balances. This
supersedes the same-day blocker for the ordinary cancellation branch. M8-46 is
PARTIALLY LIVE VERIFIED; its other UI branches stay OPEN.
[Evidence](audits/2026-09-09-phase8-m8-46-react-double-submit-live-check.md).
**Phase 8 remains NOT ACCEPTED.**

**Historical 2026-09-09 M8-46 attempt — SUPERSEDED:** the last open M8-46
gap ("no live write was used to prove this") was attempted and could not be
executed. The session had no browser-automation tool of any kind (checked
including a deferred-tool search) and no documented TEST-admin or
`rehber`/`anbardar` credentials were available to substitute an already
authenticated session. No TEST write, fixture, or credential guess was made.
M8-46 stays `CODE VERIFIED (I-4/I-5/I-6)` only; the live-proof gap remains
open. [Evidence](audits/2026-09-09-phase8-m8-46-double-submit-lock-blocked.md).
**Phase 8 remains NOT ACCEPTED.**

**Product decision 2026-09-08:** `Çap` has never worked anywhere in the platform and is accepted as a non-functional baseline. It is not a parity defect and cannot block phase acceptance. Historical print implementation/checklist text is retained as chronology but no longer defines a required live-preview gate. Excel/report export requirements remain separate. [Decision record](decisions/2026-09-08-print-nonfunctional-baseline.md).

**2026-09-08 Phase 8 update:** TEST admin ordinary cancellation, successful two-document batch cancellation and ordinary correction now have UI plus read-only database/audit evidence. Narrow partial live coverage applies to M8-24/32/33/43 and the exercised M7-109/M7-120 paths. [Evidence and remaining limitations](audits/2026-09-08-phase8-cancellation-correction-live-check.md). Earlier no-live-write statements are historical for these paths. **Phase 8 remains NOT ACCEPTED.**

**2026-09-08 stock-layer cutover update:** the official atomic cutover was
executed on TEST after a clean preflight (28 movements, no negative balance).
`stock_layers_supported()` now reports active, layer version 36, with two
seeded `legacy_unresolved` layers. Direct TEST-admin RPC checks then cancelled
one ordinary layer document and one exact layer transfer; read-back proved the
expected reversal rows, layer quantity restoration/consumption and reversed
allocation link. A stale transfer-post revision was also rejected without a
write. These are server RPC/read-back results, not React UI-routing evidence.
M8-24/M8-25 gain layer-variant partial live coverage; M8-26 remains CODE
VERIFIED pending observation of the React selection path. Historical statements
that layers were inactive describe their earlier snapshots only.
[Evidence](audits/2026-09-08-phase8-layer-cutover-and-cancellation-live-check.md).
**Phase 8 remains NOT ACCEPTED.**

**2026-09-08 M8-27 layer-row follow-up:** direct TEST-admin checks exercised
both exact branches of `cancel_layer_movement_row`. An unused receipt layer was
cancelled 1→0; a separately allocated `Silinmə` reversal restored its source
layer, marked the allocation reversed and linked the source-valuation reversal.
A receipt whose layer was partially used returned the exact stock-safety P0001;
after reversing that write-off, the receipt itself cancelled cleanly. These are
direct RPC/read-back results, not React routing evidence.
[Evidence](audits/2026-09-08-phase8-m8-27-layer-row-cancel-live-check.md).

**2026-09-08 M8-38 layer-edit follow-up:** on a fresh open TEST purchase,
`document_edit_impact` returned `editable:true`, but direct `correct_document`
returned the exact layer-selection P0001 and movement count stayed 40→40.
This proves the server refusal and demonstrates why the React capability gate
is required independently of document impact. The button-absence UI branch is
still not observed. The fixture was neutralised by layer cancellation.
[Evidence](audits/2026-09-08-phase8-m8-38-layer-edit-refusal-live-check.md).

**2026-09-08 M8-32 layer-batch follow-up:** direct TEST-admin
`cancel_layer_documents_batch` cancelled two exact receipt-layer documents,
created two reversals and deactivated both layers. A separate valid-first /
missing-second call returned P0001 and rolled back completely: count 46→46,
no reversal marker, valid layer still available 1/active. These are server
RPC/read-back results, not React dialog evidence.
[Evidence](audits/2026-09-08-phase8-m8-32-layer-batch-live-check.md).

**2026-09-08 M8-24 concurrency follow-up:** two simultaneous direct
`cancel_layer_document` requests against one fresh exact receipt produced one
success and one P0001. Count changed 48→49, exactly one reversal existed and
the layer was consumed once. This is layer-server single-commit evidence, not
M8-46 React double-click-lock evidence.
[Evidence](audits/2026-09-08-phase8-m8-24-layer-cancel-concurrency-live-check.md).

**2026-09-08 M8-29 layer-legacy follow-up:** a document-less exact receipt
sent to `cancel_layer_legacy_movement` returned the exact unresolved-balance
shortage P0001. Read-back retained the source, wrote no reversal and left the
exact layer 1/active. This confirms the historical safety boundary rather than
a success path. The fixture was neutralised through exact row cancellation.
[Evidence](audits/2026-09-08-phase8-m8-29-layer-legacy-stock-refusal-live-check.md).

**2026-09-08 M8-29 layer-legacy success follow-up:** direct
`cancel_layer_legacy_movement` succeeded for a document-less item with
sufficient unresolved stock. It retained the source, added reversal
`SND-L-01905D9CEE`, changed the legacy layer 8→7 and retained the exact receipt
layer 1; movement balance and total active layers both ended at 8. This is
server/read-back evidence, not React routing.
[Evidence](audits/2026-09-08-phase8-m8-29-layer-legacy-success-live-check.md).

**2026-09-08 M8-25 layer-transfer concurrency follow-up:** two simultaneous
direct cancellations of exact transfer `SND-0A92A2EF71` produced one success,
one already-cancelled P0001 and exactly one two-leg reversal (count 55→57).
Source quantity was restored, destination layer consumed once and the transfer
link marked reversed. This is server concurrency evidence, not M8-46 UI lock
evidence.
[Evidence](audits/2026-09-08-phase8-m8-25-layer-transfer-concurrency-live-check.md).

**2026-09-08 M8-24 layer-document stock follow-up:** cancelling a two-unit
receipt after one exact unit had been consumed returned the used-layer P0001.
Movement count stayed 59→59, no reversal marker appeared and the layer stayed
1/active. The write-off and receipt were then neutralised in dependency order.
[Evidence](audits/2026-09-08-phase8-m8-24-layer-document-stock-refusal-live-check.md).

**2026-09-08 M8-25 layer-transfer stock follow-up:** cancelling a two-unit
exact transfer after one destination unit had been consumed returned the
destination-used P0001. Count stayed 64→64, destination layer stayed 1/active
and the transfer link remained unreversed. The write-off and transfer were
then neutralised in dependency order.
[Evidence](audits/2026-09-08-phase8-m8-25-layer-transfer-stock-refusal-live-check.md).

**2026-09-08 M8-30/M8-32 mixed layer-batch follow-up:** one direct batch
combined an ordinary exact receipt and exact transfer. The dispatcher returned
ordered one-row and two-row reversals; count changed 70→73, both destination
layers were consumed and the transfer source restored. This is server
dispatcher evidence, not React eligibility/dialog evidence.
[Evidence](audits/2026-09-08-phase8-m8-30-m8-32-mixed-layer-batch-live-check.md).

**2026-09-08 M8-26/M8-38 React follow-up:** browser control recovered. The
real layers-active ordinary document dialog displayed the layer warning,
omitted `Sənədi redaktə et`, and cancelled the fixture through its real action.
Toast named `SND-C-857A9630B4`; read-back proved the exact receipt layer changed
1→0 and count 74→75. M8-26 is partially live verified for ordinary React layer
routing; M8-38 is live verified for this TEST-admin UI branch.
[Evidence](audits/2026-09-08-phase8-m8-26-m8-38-react-layer-routing-live-check.md).

**2026-09-08 M8-28 layers-active UI follow-up:** a real replacement submit
against an exact receipt reached the ordinary no-layer RPC and received the
exact layer-selection P0001; count stayed 76→76, no replacement/reason row was
written and the source layer stayed 1/active. The exposed impossible action
was fixed: replacement now renders only after the capability probe confirms
layers inactive, while layer-aware row cancellation remains available. A
fresh real React dialog showed the corrected action set and explanation;
64 focused tests and the production build passed. Both fixtures were fully
neutralised. [Evidence](audits/2026-09-08-phase8-m8-28-layer-replacement-ui-check.md).

**2026-09-08 M8-30/M8-32 React layer-batch follow-up:** the real eligibility
matrix showed two fresh exact receipts as selectable and retained multiple
ineligible families with explicit reasons. Its confirmation named both
documents and the all-or-nothing rule. The real submit reported two cancelled;
read-back found exactly two reversals, count 81→83, both layers 1→0/inactive
and item balance restored to zero. M8-26 gains batch React-routing evidence;
M8-30/M8-32 gain narrow UI live coverage.
[Evidence](audits/2026-09-08-phase8-m8-30-m8-32-react-layer-batch-live-check.md).

**2026-09-08 M8-25/M8-26 React transfer-routing follow-up — BLOCKED:** the
remaining React transfer destination was attempted and could not be executed.
The session had no authenticated browser-control tool, and a TEST read with only
the publishable anon key returned HTTP 401, removing the authenticated read-back
as well. No write was attempted, no fixture was created and the TEST baseline is
unchanged. Offline inspection reconfirmed the correct `D-I1` argument split and
the existing component test for the layer transfer call, which is CODE VERIFIED
coverage and does NOT close the gap. Focused tests 142/142, typecheck, oxlint,
production build and `git diff --check` pass; localhost stayed read-only.
M8-25/M8-26 statuses are unchanged and their React transfer halves stay OPEN.
[Evidence](audits/2026-09-08-phase8-m8-25-m8-26-react-transfer-routing-blocked.md).

**2026-09-09 M8-25/M8-26 React exact-layer transfer follow-up — NARROW
PASS:** an authenticated TEST-admin session created a real one-unit transfer
from `Test Anbar` to `CODEX Phase8 Transfer Anbar`, selecting only the exact
known-price receipt layer, then cancelled it from the real transfer card. The
React action produced source document `SND-456860F655` and reversal
`SND-R-C1D167C46E`. Authenticated read-back proved four immutable legs
(count 85→89), the transfer link marked reversed, the exact source layer
restored to 1/active, its destination child consumed to 0/inactive, balances
restored to 8/0, and zero negative balances. These mutations confirm the live
`cancel_layer_transfer_document(p_doc_num, ...)` route and supersede the prior
browser/session blocker for this narrow branch. Other OPEN M8-25/M8-26 branches
remain unchanged. Localhost was immediately returned to read-only.
[Evidence](audits/2026-09-09-phase8-m8-25-m8-26-react-layer-transfer-live-check.md).

**2026-09-09 M8-29 layer-legacy transfer follow-up — BLOCKED BY DESIGN:** the
last unproven legacy success path was analysed and probed. With layers active,
`apply_legacy_layer_delta` must consume `legacy_unresolved`/`legacy_adjustment`
stock at the DESTINATION warehouse, while `guard_and_capture_stock_layer_movement`
refuses every `out_qty>0` insert and turns `in_qty>0` inserts into `receipt`
layers. The required document-less transfer pair therefore cannot be created at
all. One authorized outbound-leg INSERT returned the exact guard P0001 and wrote
nothing: movement count 89→89, zero probe movements and zero probe layers.
TEST holds no unresolved legacy stock outside `Test Anbar`. The branch is a
design boundary rather than an outstanding test; reaching it would need a fresh
cutover seeding unresolved stock in a second warehouse, which is an owner
decision and was not taken. No layer state was fabricated.
[Evidence](audits/2026-09-09-phase8-m8-29-layer-legacy-transfer-structural-block.md).

**2026-09-09 M8-43 audit-log follow-up — contradiction RESOLVED, read-only:**
the standing "zero visible audit_log rows" warning is explained. `audit_log`
carries one SELECT policy, `p_audit_read`, with qual `(my_role() = 'rehber')`,
so a TEST admin can never read a row. Live as admin: `current_user_role()` =
`admin`, every read HTTP 200 with 0 rows, exact count `*/0`. The timestamp
column is `ts`; ordering by `created_at` fails `42703` and can look like an
empty table. Since RLS returns 200-with-no-error, the client permission
classifier cannot fire and an admin sees the ordinary empty state instead of
«İcazə yoxdur» — legacy `index.html:7145` does exactly the same, so this is
confirmed parity and NOT a defect. A separate observation: direct `audit_log`
inserts exist in `cancel_transfer_document` and `cancel_movement_row` (inherited
by their layer variants) but not in `cancel_document`, `cancel_legacy_movement`,
`cancel_legacy_transfer` or any `cancel_layer_*`, making audit coverage across
the cancellation family uneven. M8-43 still must not be promoted from admin
reads; a `rehber` session is required and no such credential is documented. No
writes were made.
[Evidence](audits/2026-09-09-phase8-m8-43-audit-log-rls-and-coverage.md).

**2026-09-09 M8-30/M8-32 layer-batch server refusals — read-only PASS:** the
LAYER batch validation branches, previously unproven because the 2026-09-08
texts belonged to the non-layer path, are now live. `cancel_layer_documents_batch`
returned exact P0001 for a null/empty array, a blank entry, a whitespace-only
entry, a missing document, a duplicate missing document and an existing reversal
document. Whitespace normalisation and deduplication are demonstrated: `'   '`
is rejected like `''` (`btrim` runs first) and a repeated missing document
yields exactly ONE refusal (`SELECT DISTINCT`). Movement count stayed 89→89
with balances, all stock layers and capability byte-for-byte unchanged.
Divergence recorded, not a defect: an empty selection answers
`Ləğv üçün heç bir sənəd seçilməyib` on the non-layer RPC but
`Sənəd seçilməyib` on the layer one. Roles, unknown-outcome/transport, refresh
failure, UI concurrency and layer-batch concurrency stay OPEN.
[Evidence](audits/2026-09-09-phase8-m8-30-m8-32-layer-batch-server-refusals.md).

**2026-09-08 M8-31 read-only UI follow-up:** real document search isolated
eligible `TEST-OUT-1`; after selection, filtering to an empty result retained
the independent selected count and enabled continuation. Restoring the filter
returned the row still checked. A second pass produced the identical result set
for item code `0000001` and item name `TEST Mal 1`. The dialog was closed
without submitting, so TEST state did not change.
[Evidence](audits/2026-09-08-phase8-m8-31-batch-search-selection-live-check.md).

The same M8-31 read-only pass then retained `TEST-OUT-1` when both date bounds
equalled its earliest date (`2026-09-02`), proving the inclusive boundary for
that fixture, and retained it under combined `Test Anbar + Silinmə` filters.
An excluding lower bound and an excluding upper bound each removed the row;
the real type selector also omitted unsupported `Sifariş`, confirming the
documented cancellable-only option-list quirk.

**2026-09-08 M8-27 React layer-row follow-up:** a fresh exact receipt was
cancelled through the real `Sətri ləğv et` action with its mandatory reason.
The UI reported success and kept the document open with zero effective lines.
Read-back proved count 84→85, original retained, exactly one same-document
counter-row, preserved price/invoice, layer 1→0/inactive and zero item balance.
[Evidence](audits/2026-09-08-phase8-m8-27-react-layer-row-cancel-live-check.md).

**2026-09-08 M8-21/M8-30 legacy-reversal classification follow-up:** the
real batch matrix exposed generated legacy-transfer counter
`SND-LR-AE5EEE3FF0` as selectable. Its server marker uses
`Ləğv (əks yerdəyişmə) ID:`, while the client recognised only the numbered
transfer `...):` shape. The state and batch matchers now recognise both
terminal transfer-counter forms. The same live row then rendered disabled with
the explicit reversal reason; no submit occurred. Expanded tests pass 270/270
and the production build passes.
[Evidence](audits/2026-09-08-phase8-m8-21-m8-30-legacy-reversal-classification-live-check.md).

**2026-09-08 marker-contract cross-check:** a static check of the TEST restore
SQL closed that defect class. The server writes exactly four marker shapes,
every `cancel_layer_*` function delegates its movement write to the non-layer
function and so adds none, and all nine shipped client matchers classify the
four shapes correctly while matching no near-miss string. The ordinary sibling —
the numbered `SND-L-*` document from `cancel_legacy_movement` — is excluded from
the batch matrix by `stripRowLevelCancelled()` (legacy 5330), which is parity;
a mutation-checked regression test now pins it. This is code/contract evidence,
not live verification.
[Evidence](audits/2026-09-08-phase8-marker-contract-crosscheck.md).

**2026-09-08 correction-impact follow-up:** the real TEST-admin UI path for
`SND-76074E451C` returned `editable:false` and rendered all seven populated
later-movement block reasons. This adds narrow partial live evidence to
M8-33/M8-34; malformed/transport, role, layer/transfer and correction-write
failure paths remain open. [Evidence](audits/2026-09-08-phase8-correction-not-editable-live-check.md).

**2026-09-08 read-only action-preflight follow-up:** the real TEST-admin UI
verified the unsupported legacy `Alış` refusal (M8-15), the rendered/defaulted
reversal-date control (M8-23), the row-cancellation mandatory-reason gate
(M8-27), and the item-replacement picker plus mandatory-reason gate (M8-28).
No replacement or cancellation RPC was submitted.
[Evidence](audits/2026-09-08-phase8-replacement-preflight-live-check.md).

**2026-09-08 M8-28 execution follow-up:** one real TEST-admin replacement was
then executed on the currently eligible ordinary document `SND-12B8BCDD3A`.
Direct read-back proved the original `0000001` row retained, an equal counter-
row plus `0000002` replacement row added inside the same document, and the
date, warehouse, quantity, price and invoice preserved. M8-28 is now partially
live verified for this ordinary non-layer success path; races, refusals, roles,
failure/concurrency and lot/transfer exclusions remain open. M8-43 was not
promoted because the admin read policy exposed no audit row for the unique
reason. [Evidence](audits/2026-09-08-phase8-m8-28-replacement-live-check.md).

**2026-09-08 M8-27 execution follow-up:** the effective `0000002` line in the
same ordinary document was then cancelled through the real TEST-admin row
action. The refreshed UI showed zero effective lines; direct read-back proved
the source retained and one equal counter-entry added under the same document,
with date/item/quantity/price/invoice preserved. M8-27 is now partially live
verified for this ordinary non-layer success path. Layer, races, refusals,
roles, failure/concurrency and independently readable audit consequences remain
open. [Evidence](audits/2026-09-08-phase8-m8-27-row-cancel-live-check.md).

**2026-09-08 M8-23 blank-date follow-up:** the real TEST-admin cancellation
form for `SND-76074E451C` was submitted after its reversal-date field was
cleared. The UI created `SND-C-2D6E6E714D`; direct read-back proved the original
retained and the reversal dated `2026-09-08`, confirming the code-verified
omitted-parameter/server-`CURRENT_DATE` path end to end. This is ordinary
non-layer evidence only; other families, roles, layer routing and failures stay
open. [Evidence](audits/2026-09-08-phase8-m8-23-blank-reversal-date-live-check.md).

**2026-09-08 M8-25 transfer follow-up:** a minimal TEST warehouse and one-unit
transfer fixture were created, then the real transfer-specific view cancelled
`SND-3550711E4C`. Read-back proved its two original legs retained and reverse
document `SND-R-5D4231E5E8` added with equal/opposite legs. M8-15/M8-17 gain
narrow transfer dispatcher/view evidence and M8-25 is partially live verified
for the non-layer admin success path. The fixture name's trailing `Anbar`
exposed the same one-pass route-normalisation edge in legacy and React; it is
recorded as inherited parity, not changed. Layer/refusal/role/failure branches
remain open. [Evidence](audits/2026-09-08-phase8-m8-25-transfer-cancel-live-check.md).

**2026-09-08 M8-32 atomicity follow-up:** a direct TEST-admin batch placed an
open valid document first and a guaranteed-absent document second. The server
returned `P0001` for the missing document; immediate read-back proved the first
document remained unchanged and had no reversal marker. This live-verifies the
ordinary non-layer server rollback/no-partial-cancellation branch. React error
rendering, unknown outcome, refresh failure, layer, roles and concurrency remain
open. [Evidence](audits/2026-09-08-phase8-m8-32-batch-atomicity-live-check.md).

**2026-09-08 M8-29 legacy-ordinary follow-up:** a minimal document-less
`Satınalma` fixture opened through the real `Köhnə əməliyyat` branch and was
cancelled through its whole-operation action. Direct TEST read-back proved the
`doc_num = null` source retained and a separately numbered equal/opposite row
created with the exact `Ləğv ID: <source id>` marker. M8-15/M8-18 gain narrow
document-less ordinary UI evidence and M8-29 is partially live verified for
`cancel_legacy_movement`, TEST admin, layers inactive. Document-less transfer,
both layer variants, roles, refusals/failures and concurrency remain open.
[Evidence](audits/2026-09-08-phase8-m8-29-legacy-cancel-live-check.md).

**2026-09-08 M8-29 legacy-transfer follow-up:** one unique document-less TEST
transfer pair opened the real `Köhnə yerdəyişmə` view and was cancelled through
its whole-transfer action. Both source legs remained; reverse document
`SND-LR-AE5EEE3FF0` added two equal/opposite legs with the canonical two-id
marker. A repeat direct call returned the server's already-cancelled P0001 and
left the reverse document at two rows. M8-15 now has narrow evidence for all
four dispatcher destinations; M8-19 gains legacy-transfer UI evidence; M8-29
has both non-layer TEST-admin success families. Layer variants and the remaining
refusal/role/failure/concurrency cases stay open.
[Evidence](audits/2026-09-08-phase8-m8-29-legacy-transfer-live-check.md).

These transfer fixtures also provide independently known raw movements in the
second TEST warehouse for M8-42. The allowed/denied `anbardar` RLS comparison
is still open because this continuation has no usable fresh `anbardar`
credential/session; a saved role tab could not be attached through browser
control. Do not guess the password. The remaining blocker is identity access,
not foreign-warehouse fixture data.

**2026-09-08 M8-24/M8-25 refusal follow-up:** direct repeat cancellation of
already-cancelled ordinary `SND-76074E451C` and transfer `SND-3550711E4C`
each returned HTTP 400 / P0001 with the exact already-cancelled message. The
admin-visible movement count stayed 28→28 across both calls, proving no
duplicate/partial write for these two non-layer server refusal paths. This is
not M8-21/M8-22 UI evidence; cancelled rows remain absent from the effective
registry. [Evidence](audits/2026-09-08-phase8-m8-24-m8-25-recancel-refusal-live-check.md).

**2026-09-08 M8-27/M8-28 transfer-exclusion follow-up:** direct TEST-admin
calls against an existing `Yerdəyişmə` source returned the exact server
refusals for row cancellation (cancel the whole document) and item replacement
(cancel and recreate). Movement count stayed 28→28. These are narrow server
backstop/no-write results; the transfer views already omit both row actions.
[Evidence](audits/2026-09-08-phase8-m8-27-m8-28-transfer-refusal-live-check.md).

The same no-write follow-up then used the existing legacy `Alış` fixture.
`cancel_movement_row` and `replace_movement_item` each returned the exact
unsupported-type P0001; movement count again stayed 28→28. M8-27/M8-28 gain
narrow unsupported-type server-backstop evidence.
[Evidence](audits/2026-09-08-phase8-m8-27-m8-28-unsupported-type-refusal-live-check.md).

**2026-09-08 M8-27/M8-28 validation follow-up:** six further direct TEST-admin
calls proved the whitespace-reason, absent-movement, same-item and absent-item
P0001 validations. Movement count stayed 28 across both three-call groups; no
refusal wrote a row. [Evidence](audits/2026-09-08-phase8-m8-27-m8-28-validation-refusals-live-check.md).

**2026-09-08 M8-24/M8-25 validation follow-up:** five direct TEST-admin calls
proved blank/missing document and wrong cancellation-family P0001 validations.
Movement count stayed 28→28; no call wrote a reversal or partial row.
[Evidence](audits/2026-09-08-phase8-m8-24-m8-25-validation-refusals-live-check.md).

**2026-09-08 M8-30/M8-32 batch-validation follow-up:** six direct TEST-admin
batch calls proved empty selection, blank legacy entry, duplicate document,
already-cancelled original and both reversal-document P0001 branches. Movement
count stayed 28→28; no partial or duplicate reversal was written.
[Evidence](audits/2026-09-08-phase8-m8-30-m8-32-batch-validation-refusals-live-check.md).

**2026-09-08 M8-29 validation follow-up:** six direct TEST-admin legacy calls
proved ordinary already-cancelled, both wrong-family, numbered-row and both
absent-movement P0001 branches. Movement count stayed 28→28; no call wrote a
reversal or partial row.
[Evidence](audits/2026-09-08-phase8-m8-29-validation-refusals-live-check.md).

**2026-09-08 M8-53 update:** the Phase 8 four-read snapshot is partially
measured on TEST: 4 logical requests, 22 returned rows, 6,873 decoded JSON
bytes and 1,532 encoded body bytes. Exact queries and per-read counts are
recorded. Transfer size including headers/protocol overhead remains open;
cross-origin page Resource Timing does not expose it.
[Measurement evidence](audits/2026-09-08-phase8-m8-53-payload-measurement.md).

**M8-53 protocol closeout:** a later raw HTTP/1.1 capture of the same four
contracts, now containing 18 movement rows after the documented TEST writes,
measured 4,304 response-header bytes, 1,796 encoded-body bytes and 34 bytes of
chunk framing: 6,134 raw response bytes total. A paired dechunk/decode pass
confirmed 26 rows and 8,843 decoded bytes. M8-53 is measured for this named
TEST-admin HTTP/1.1 contract; the result excludes request/TLS/TCP bytes and is
not treated as a phase-acceptance claim.
[Evidence](audits/2026-09-08-phase8-m8-53-payload-measurement.md).

**2026-09-08 export-concurrency update:** the Silinmə report's unmount-abort
subpath is live-verified on TEST. Navigation away during a controlled delayed
allocation read produced no file; a follow-up double click issued exactly one
allocation read, live-verifying the synchronous duplicate-click lock. Two
read-only follow-ups also produced no file and the correct visible refusal when
a refresh completed mid-read or was still in progress. Unmount, duplicate,
changed-snapshot and refresh-in-progress aborts are therefore live-verified;
the changed-session guard was then exercised through a synthetic in-memory
identity transition, also with no file and the correct warning. No Auth
operation was performed. This current update supersedes the older M8-50b
cell's blanket statement that concurrency paths are unverified.
[Evidence](audits/2026-09-08-phase8-writeoff-export-unmount-live-check.md).

Project-wide registry of every old-platform function and its React counterpart.
Governed by [`ANBAR_REACT_MIGRATION_PRINCIPLES.md`](ANBAR_REACT_MIGRATION_PRINCIPLES.md).
Phase 1 outcome and the manual acceptance checklist: [`PHASE1_FINAL_REPORT.md`](PHASE1_FINAL_REPORT.md).

- **Behavioural reference:** `origin/main:index.html` (the deployed production
  platform). Line numbers below refer to that file.
- **React implementation:** `web/` on branch `react-migration`.
- **Last updated:** 2026-09-09. **Phase 7 (Yeni əməliyyat, Module H) is
  INCOMPLETE and NOT `ACCEPTED`.** Milestone H-5 (2026-09-05) produced the
  first real writes of the migration, in the isolated TEST project
  `alkjjbaawmsirsfvqljm` only, after the user confirmed Gate `G0`. It is
  **partial** live evidence covering the inbound `Satınalma` path, the Qaimə №
  block, the duplicate-submit reality, item creation and `M5-55`. A follow-up
  read-only TEST inspection found that audit rows for both H-5 movement
  documents (`SND-76074E451C`, `SND-D512FAAC59`) DO exist and that trigger
  `movements_audit` is enabled: the Audit jurnalı screen showed zero rows
  because live RLS policy `p_audit_read` (`my_role() = 'rehber'`) filtered
  them from the `admin` account used in H-5, not because of a missing trigger
  or a defect in the React write path or query. `items` has no audit trigger,
  so the item write correctly produced no row. `M7-120` is corrected from
  `LIVE CHECK FAILED` to `LIVE VERIFIED` for the ordinary movement-INSERT
  consequence only. **Phase 8 B4 (2026-09-08) subsequently live-verified the
  ordinary non-layer `correct_document` caller and its explicit `UPDATE` audit
  row on TEST.** Layer/transfer variants and `log_icare_exposure` remain OPEN.
  Whether `admin` should be able to read Audit jurnalı is a separate
  parity/product decision, not yet checked against production. Transfers,
  layers, İcarə/conditions, anbardar scoping, `M7-96`'s stale recheck and the
  `M7-S2` is not live verified. `M7-S3` was subsequently `LIVE VERIFIED` on
  2026-09-05 by blocking `stock_conditions` in Chrome DevTools, observing the
  fatal load state, then removing the rule and confirming recovery. Details:
  [`specs/2026-09-04-phase7-registry-rows.md`](specs/2026-09-04-phase7-registry-rows.md),
  milestone H-5.
- **Previously updated:** 2026-09-03. **Phase 4 (Audit jurnalı, Module E) is
  `ACCEPTED` by explicit user decision**, taken without the populated-data
  live comparison — see the accepted exception in Module E. Module D (all
  eight Soraqçalar kinds) passed Codex's read-only audit (90/90 rows) but
  stays `ACCEPTED`-blocked on its live mutation pass.
- **Automated test suite:** **450 passing in 30 files; `typecheck`, `lint`
  (oxlint) and `build` clean, `git diff --check` clean.** (222/20 at the end
  of Phase 2; 296/23 end of Phase 3a; 358/24 end of Phase 3b/Codex's audit;
  432/30 at Phase 4 implementation; 448 after the three audit fixes.)

## Statuses

| Status | Meaning |
|---|---|
| `NOT STARTED` | No React implementation. |
| `IN PROGRESS` | Started, incomplete. |
| `CODE VERIFIED` | Source-inspected against the old platform + automated tests. **Mocks only.** |
| `LIVE VERIFIED` | Verified in a real browser against the live environment, on the current code. |
| `ACCEPTED` | Both levels passed, no blocking issues. |

## ✅ Live-verification state of Phase 1 — accepted by user

On 2026-09-02 the user confirmed that the complete live/manual Phase 1
checklist in `PHASE1_FINAL_REPORT.md` passed. Phase 1 is therefore **ACCEPTED**.
The per-function rows below retain `CODE VERIFIED` as their evidence level;
the acceptance decision is the phase-level result based on the completed live
checklist.

## ⚠️ Historical live-verification note

The user did perform a live browser test (admin login, the warehouse list with
real data, and warehouse create/edit/hide/delete — reported as "anbarla pass").
**That test was run at commit `05cf22f`, before the comparative audit.**

Commits `4073ea1`, `3d7a0cd`, `68b69fe`, `8a8f99c`, `390fabe` and `958db31`
then rewrote or added: the entire usage-count query path, the Admin gate, the
two-step delete, remember-me restoration, e-mail trimming, the restore-state
screen, the session window, logout, password change, the unload beacon,
realtime refresh and every list control.

Per §6 of the principles, that earlier live pass did not carry forward across
the rewrite. The user subsequently completed the current checklist, so the
phase-level result is now **ACCEPTED**.

---


## Audit findings F1–F12 — true status

Each finding from the comparative audit, its fix commit, and where it is
verified. **Every one is `CODE VERIFIED` only** — see the live-verification
warning above.

| F | Finding | Fixed in | React location | Tests | Status |
|---|---|---|---|---|---|
| F1 | No session window: no logout, device management or password change existed | `68b69fe` | `components/SessionDialog.tsx`, `components/PasswordChangeDialog.tsx`, header in `App.tsx` | `SessionDialog.test` (15), `PasswordChangeDialog.test` (10), `App.test` | `CODE VERIFIED` |
| F2 | Tab close did not free this device's slot | `68b69fe`, hardened in `03f38e1` | `hooks/useReleaseDeviceOnUnload.ts`, `api/session.api.ts` `releaseDeviceBeacon` | `session.api.test` (6), `App.test` (2) | `CODE VERIFIED` |
| F3 | `register_session().devices` typed from assumption; device name rendered blank | `4073ea1` | `api/session.api.ts` `SessionDevice`, `components/SessionLimitDialog.tsx` | `sessionDevices.test` (13), `SessionDialog.test` | `CODE VERIFIED` — shape re-read from the live RPC |
| F4 | Warehouse screen rendered for every signed-in user | `4073ea1` | `pages/WarehousesPage.tsx` | `WarehousesPage.test` (3 roles + no-subscribe) | `CODE VERIFIED` |
| F5 | Usage query errors became `0`, so a used warehouse could look free | `4073ea1` | `api/warehouses.api.ts` `WarehouseUsage`, `WarehouseFormDialog.tsx` | `warehouses.api.test` (3), `WarehouseFormDialog.test` | `CODE VERIFIED` |
| F6 | Usage counted cancelled movements | `4073ea1`, matching fixed in `3d7a0cd` | `lib/operationalMovements.ts`, `lib/refEq.ts`, `api/warehouses.api.ts` | `operationalMovements.test` (11), `refEq.test` (16), `warehouses.api.test` | `CODE VERIFIED` — no SQL change was needed |
| F7 | No Realtime subscription | `390fabe`, corrected in `609f4ca` | `hooks/useRealtimeRefresh.ts`, `store/sync.store.ts`, `components/SyncIndicator.tsx` | `WarehousesPage.test` (realtime + sync transitions), `SyncIndicator.test` (6) | `CODE VERIFIED` |
| F8 | Login form shown while restoring a session | `4073ea1`, completed in `3d7a0cd` | `App.tsx`, `store/auth.store.ts` (boots `loading`) | `App.test` (3), `auth.store.test` | `CODE VERIFIED` |
| F9 | Remember-me checkbox not restored | `4073ea1` | `pages/LoginPage.tsx` | `LoginPage.test` (3) | `CODE VERIFIED` |
| F10 | E-mail not trimmed | `4073ea1` | `pages/LoginPage.tsx` | `LoginPage.test` (3) | `CODE VERIFIED` |
| F11 | Warehouse deleted without confirmation | `4073ea1` | `components/warehouses/WarehouseFormDialog.tsx` | `WarehouseFormDialog.test` (5) | `CODE VERIFIED` |
| F12 | List had no search, filter, paging or numbering | `390fabe` | `pages/WarehousesPage.tsx` | `WarehousesPage.test` (6) | `CODE VERIFIED` |

### Follow-up review corrections (after F1–F12)

| # | Issue | Fixed in | Tests | Status |
|---|---|---|---|---|
| P-01 | Logout sent `end_session` twice (status-dependent cleanup + explicit call) | `03f38e1` | `App.test` (4) | `CODE VERIFIED` |
| P-02 | Beacon's rejected fetch promise was unconsumed | `03f38e1` | `session.api.test` (2) | `CODE VERIFIED` |
| P-03 | Realtime announced success before the refresh finished | `609f4ca` | `WarehousesPage.test` (2) | `CODE VERIFIED` |
| P-04 | Subscription status ignored; no sync indicator | `609f4ca` | `WarehousesPage.test` (6), `SyncIndicator.test` (6) | `CODE VERIFIED` |
| P-05 | `SessionDialog`/`PasswordChangeDialog` had no direct tests | `bc09b18` | 25 new tests | `CODE VERIFIED` |

---

## Module A — Authentication & Session

Tables/RPCs: `users`, `sessions`; `register_session`, `touch_session`,
`end_session`, `end_other_sessions`, `list_my_sessions`; Supabase Auth
(`signInWithPassword`, `updateUser`, `getSession`).
RLS: `users` readable per `current_user_role()`; `sessions` has **no** write
policy — all writes go through the SECURITY DEFINER RPCs.

| # | Function | Old ref | React ref | Roles | Tests | Status |
|---|---|---|---|---|---|---|
| A-01 | Sign in with e-mail + password | 7557-7582 | `pages/LoginPage.tsx`, `api/auth.api.ts` | all | `auth.api.test`, `LoginPage.test` | `CODE VERIFIED` |
| A-02 | E-mail trimmed before validate/sign-in/save (F10) | 7558 | `pages/LoginPage.tsx:32` | all | `LoginPage.test` (3 cases) | `CODE VERIFIED` |
| A-03 | Remember-me checkbox restored from storage (F9) | 7554 | `pages/LoginPage.tsx:20` | all | `LoginPage.test` (3 cases) | `CODE VERIFIED` |
| A-04 | Session persistence: localStorage when remembered, else sessionStorage | 761-771 | `api/supabase.ts` `authStorage()` | all | `supabase.test` (8 cases) | `CODE VERIFIED` |
| A-05 | Saved e-mail prefill | 7552-7553 | `pages/LoginPage.tsx:18` | all | `LoginPage.test` | `CODE VERIFIED` |
| A-06 | Session restore on page load | 7584-7595 | `App.tsx` restore effect | all | `App.test` (3 cases) | `CODE VERIFIED` |
| A-07 | No interactive login form while restoring (F8) | 7589 | `App.tsx`, `store/auth.store.ts` (boots `loading`) | all | `App.test`, `auth.store.test` | `CODE VERIFIED` |
| A-08 | Profile fetch; reject missing profile / inactive account | 7495-7497 | `api/auth.api.ts` `fetchProfile`, `App.tsx` | all | `auth.api.test` | `CODE VERIFIED` |
| A-09 | Role mapping incl. legacy roles → read-only | 617-643 | `lib/roles.ts` `effectiveRole` | all | `roles.test` (full matrix) | `CODE VERIFIED` |
| A-10 | Permission table `can()` / denial message | 626-638 | `lib/roles.ts` | all | `roles.test` | `CODE VERIFIED` |
| A-11 | Warehouse scoping helpers (Astara↔Harmony group) | 709-723 | `lib/warehouseScope.ts` | anbardar | `warehouseScope.test` | `CODE VERIFIED` — **ported but not yet consumed by any screen** (belongs to Movements) |
| A-12 | Device registration on sign-in and on restore | 7320-7335, 7569, 7587 | `api/session.api.ts`, `App.tsx`, `LoginPage.tsx` | all | `session.api.test`, `App.test` | `CODE VERIFIED` |
| A-13 | Degrade to "allowed" if SQL 026 absent | 7329-7334 | `api/session.api.ts` `registerSession` catch | all | `session.api.test` | `CODE VERIFIED` |
| A-14 | Device-limit rejection → sign out + dialog (F3 contract) | 7481-7492, 7570-7574 | `components/SessionLimitDialog.tsx` | all | `sessionDevices.test` | `CODE VERIFIED` — RPC shape re-read from live DB |
| A-15 | Heartbeat every 60 s; forced sign-out when closed elsewhere | 7343-7359 | `hooks/useHeartbeat.ts` | all | `session.api.test` (`touchSession`) | `CODE VERIFIED` — **hook itself still has no test** (R-02) |
| A-16 | Release this device on tab close (F2) | 7380-7393 | `hooks/useReleaseDeviceOnUnload.ts`, `api/session.api.ts` `releaseDeviceBeacon` | all | `session.api.test` (4 cases), `App.test` (2) | `CODE VERIFIED` |
| A-17 | «Sessiya» window: identity, role, warehouse, permissions, remember state (F1) | 7422-7440 | `components/SessionDialog.tsx` | all | `App.test` | `CODE VERIFIED` |
| A-18 | Active-device list (`list_my_sessions`) | 7452-7478 | `components/SessionDialog.tsx` | all | `SessionDialog.test` (rows, current-device marker, missing label, degraded mode) | `CODE VERIFIED` — contract read from the live DB |
| A-19 | Close one other device / close all others | 7441-7448, 7468-7476 | `components/SessionDialog.tsx` | all | `SessionDialog.test` (close one, close others, reload, errors, busy, current device excluded) | `CODE VERIFIED` |
| A-20 | Change password with all validations (F1) | 7398-7420 | `components/PasswordChangeDialog.tsx` | all | `PasswordChangeDialog.test` (10: every validation, server rejection, success-only close, busy label) | `CODE VERIFIED` |
| A-21 | Logout: free device → forget remember → sign out, exactly one release (F1, P-01) | 7444 | `App.tsx` `logout()` | all | `App.test` (order, exactly-once, no double release on later unmount) | `CODE VERIFIED` |

## Module B — Warehouses directory (Soraqçalar, `kind='warehouse'`)

Tables/RPCs: `warehouses` (`id int`, `name`, `type`, `active`), `movements`,
`users`; `manage_reference(p_kind,p_action,p_id,p_name,p_meta)`.
RLS: `warehouses_select` = `is_admin() OR is_rehber() OR (is_anbardar() AND name <> 'Ofis')`;
no write policy — all mutations via `manage_reference` (Admin-only, SECURITY DEFINER).

| # | Function | Old ref | React ref | Roles | Tests | Status |
|---|---|---|---|---|---|---|
| B-01 | Screen is Admin-only; non-Admin loads nothing (F4) | 1496, 3009, 7505 | `pages/WarehousesPage.tsx` | admin only | `WarehousesPage.test` (3 roles) | `CODE VERIFIED` |
| B-02 | List warehouses (`type='anbar'`), paginated fetch | 848-861, 933-935 | `api/warehouses.api.ts` `fetchWarehouses` | admin | `warehouses.api.test` | `CODE VERIFIED` |
| B-03 | Usage count = operational movements (warehouse OR partner) + assigned users (F6) | 2977-2988, 1249-1270, 2970 | `api/warehouses.api.ts`, `lib/operationalMovements.ts`, `lib/refEq.ts` | admin | `operationalMovements.test` (11), `refEq.test` (16), `warehouses.api.test` | `CODE VERIFIED` |
| B-04 | Usage fail-safe: unreadable ⇒ treat as in use (F5) | 2971-2976, 3096-3100 | `api/warehouses.api.ts`, `WarehouseFormDialog.tsx` | admin | `warehouses.api.test` (3), `WarehouseFormDialog.test` | `CODE VERIFIED` |
| B-05 | Create warehouse | 3118, 3152-3183 | `WarehouseFormDialog.tsx` `send('create')` | admin | `referenceDirectory.api.test` | `CODE VERIFIED` |
| B-06 | Rename only when unused; name locked when in use | 3085, 3101-3117 | `WarehouseFormDialog.tsx` `nameLocked` | admin | `WarehouseFormDialog.test` | `CODE VERIFIED` |
| B-07 | Deactivate / activate | 3115-3120 | `WarehouseFormDialog.tsx` | admin | — | `CODE VERIFIED` — **no dedicated test** |
| B-08 | Delete only when unused, two-step confirmation (F11) | 3125-3150 | `WarehouseFormDialog.tsx` | admin | `WarehouseFormDialog.test` (5) | `CODE VERIFIED` |
| B-09 | Server error surfacing incl. duplicate-name wording | 3178-3182 | `WarehouseFormDialog.tsx` | admin | `referenceDirectory.api.test` | `CODE VERIFIED` |
| B-10 | Cascade notice after rename (`cascaded_rows`) | 3172-3177 | `WarehouseFormDialog.tsx` | admin | — | `CODE VERIFIED` — **no test** |
| B-11 | List controls: numbering, search, status filter, page size, paging (F12) | 3036-3057 | `pages/WarehousesPage.tsx` | admin | `WarehousesPage.test` (6) | `CODE VERIFIED` |
| B-12 | Realtime refresh + «Məlumatlar yeniləndi» notice, announced only after a successful reload (F7, P-03) | 1163-1181 | `hooks/useRealtimeRefresh.ts`, `store/warehouses.store.ts` `LoadResult` | admin | `WarehousesPage.test` (5) | `CODE VERIFIED` |
| B-14 | Sync indicator driven by subscription status (P-04) | 1177-1180, 1184-1188 | `store/sync.store.ts`, `components/SyncIndicator.tsx` | admin | `WarehousesPage.test` (6), `SyncIndicator.test` (6) | `CODE VERIFIED` |
| B-13 | Server-side rules relied upon but never exercised: zero-balance check before deactivate, active-anbardar check, partner/warehouse name collision | `manage_reference` body | — (server) | admin | — | `NOT STARTED` — behaviour never triggered from React |

## Server-side rules inherited, not reimplemented

Deliberate: these live in `manage_reference` and must NOT be duplicated in the
client. They are listed so a future phase does not mistake them for missing
work — but note the UI has never been observed reacting to them (B-13).

- Deactivation refused when the warehouse holds a non-zero balance.
- Deactivation refused when an active `anbardar` is assigned to it.
- Create/rename refused when the name collides with a `partners` name.
- Rename refused entirely once the warehouse is used anywhere.
- Delete refused once used; audit row written for every mutation.


## Module C — Reference directories: unified «Soraqçalar» + Partners (Phase 2)

Tables/RPCs: `warehouses`, `partners`, `movements`, `users`;
`manage_reference(p_kind,p_action,p_id,p_name,p_meta)`.
RLS (verified live 2026-09-02): `partners` has exactly one policy,
`partners_select` = `current_user_role() IS NOT NULL` — readable by any
recognised role, **no write policy**; every mutation goes through
`manage_reference` (SECURITY DEFINER, Admin-only). `partners.id` is a `uuid`,
so no C-15-style type concern.
Live shape at implementation time: 32 partners (all active), 1915 movements.

| # | Function | Old ref | React ref | Roles | Tests | Status |
|---|---|---|---|---|---|---|
| C-01 | One table for all kinds, with a kind filter | 3008-3074, 2934-2944 | `pages/ReferenceDirectoryPage.tsx`, `types/referenceDirectory.ts` | admin only | `ReferenceDirectoryPage.test` (kind filter, mixed listing) | `CODE VERIFIED` |
| C-02 | Create row: kind selector + name + «Əlavə et +» | 3021-3031, 3064-3065 | `pages/ReferenceDirectoryPage.tsx` | admin | `ReferenceDirectoryPage.test` (2) | `CODE VERIFIED` |
| C-03 | Partner list source (all partners, active and hidden) | 2958, 869-874, 880-883 | `api/partners.api.ts`, `store/referenceDirectory.store.ts` | admin | `ReferenceDirectoryPage.test` | `CODE VERIFIED` |
| C-04 | Warehouse rows keep the `type='anbar'` filter; `layihə` belongs to the `location` kind | 2962 | `store/referenceDirectory.store.ts` | admin | `ReferenceDirectoryPage.test` | `CODE VERIFIED` |
| C-05 | Usage per kind: warehouse = movements(warehouse OR partner) + users; partner = movements(partner) only | 2977-2988, 2973-2976 | `api/referenceUsage.api.ts` | admin | `referenceUsage.api.test` (10) | `CODE VERIFIED` |
| C-06 | Usage excludes cancelled movements for every kind | 1249-1270 | `api/referenceUsage.api.ts` + `lib/operationalMovements.ts` | admin | `referenceUsage.api.test` | `CODE VERIFIED` |
| C-07 | Usage fail-safe; a failed `users` read makes warehouses inexact but leaves partners exact | 2971-2976, 3096-3100 | `api/referenceUsage.api.ts` | admin | `referenceUsage.api.test` (2) | `CODE VERIFIED` |
| C-08 | Partner create/update with VÖEN, Müqavilə tarixi, Müqavilə № | 3086-3089, 3156-3159 | `components/reference-directory/ReferenceDirectoryFormDialog.tsx` | admin | `ReferenceDirectoryFormDialog.test` (6, incl. a typed date reaching the RPC on both create and update) | `CODE VERIFIED` — **investigated 2026-09-02** after a report that the contract date came back empty. Not reproduced: the client path is proven by tests, and the live RPC (`manage_reference` → `manage_reference_uuid_internal`) writes `contract_date = nullif(p_meta->>'contract_date','')::date` on both actions. `audit_log` for the CRUD smoke test (`TEST_REACT_MIGRATION_PHASE2`, 10:36 UTC) shows `voen` and `contract` persisted while `contract_date` was NULL **already at INSERT**, i.e. nothing was sent — consistent with the field being left empty or typed incompletely, which a `type=date` input reports as an empty value. The production platform behaves identically |
| C-09 | VÖEN must be 10 digits; field capped at 10 chars | 3163, 3087 | same | admin | `ReferenceDirectoryFormDialog.test` (5) | `CODE VERIFIED` |
| C-10 | Name lock applies to warehouse/location only — a used partner stays renameable | 3085 | same | admin | `ReferenceDirectoryFormDialog.test` (2) | `CODE VERIFIED` |
| C-11 | Rename cascade notice (`cascaded_rows`) | 3172-3177 | same | admin | `ReferenceDirectoryFormDialog.test` | `CODE VERIFIED` |
| C-12 | Two-step delete, offered only for an unused value | 3125-3150 | same | admin | `ReferenceDirectoryFormDialog.test` (3) | `CODE VERIFIED` |
| C-13 | Hide / reactivate | 3115-3120 | same | admin | `ReferenceDirectoryFormDialog.test` | `CODE VERIFIED` |
| C-14 | Server refusals surfaced verbatim, incl. partner/warehouse name collision and duplicate name | 3178-3182 | same | admin | `ReferenceDirectoryFormDialog.test` (2) | `CODE VERIFIED` |
| C-15 | List controls (numbering, search, status, page size, paging) across kinds | 3036-3057 | `pages/ReferenceDirectoryPage.tsx` | admin | `ReferenceDirectoryPage.test` (6) | `CODE VERIFIED` |
| C-16 | Realtime refresh over all four source tables | 1163-1181 | `hooks/useRealtimeRefresh.ts` + page | admin | `ReferenceDirectoryPage.test` (2) | `CODE VERIFIED` |
| C-17 | Server-side partner rules never exercised from React: name collision against `warehouses`, delete blocked when used in movements | `manage_reference` body | — (server) | admin | — | `NOT STARTED` |

### Phase 2 live-verification status (corrected 2026-09-02)

The earlier line "live verification: not started" was wrong. A live localhost
pass **was** performed against production Supabase before the write guard
existed, and it covered part of Module C:

| Checked live | Outcome | Rows it touches |
|---|---|---|
| Partner creation (`TEST_REACT_MIGRATION_PHASE2`) | Passed | C-02, C-08 |
| Partner name / contract editing | Passed | C-08, C-10 |
| Partner hiding (`deactivate`) | Passed | C-13 |

Not covered, and therefore still unproven live: C-01, C-03…C-07, C-09, C-11,
C-12, C-14, C-15, C-16, C-17 — the unified listing itself, usage counting
against the old platform's numbers, VÖEN refusal, the cascade notice, the
two-step delete, server refusals, list controls and Realtime.

Physical deletion of the temporary test partner was deliberately **not**
performed and must not be performed without the user's explicit confirmation.

No Module C row is promoted to `LIVE VERIFIED` on the strength of that pass:
it ran on code that has since changed (`cc0e8ba`, and the wider write guard
below), and principles §6 does not carry a live pass across a rewrite of the
same function. `ACCEPTED` additionally needs the untouched items above, which
now require the local opt-in flag (D-14) or a deployed preview.

## Explicitly approved deviations

| ID | Deviation | Approval | Registry effect |
|---|---|---|---|
| D-01 | Pure logic extracted to `src/lib/` (roles, refEq, cancellation, device formatting) instead of inline globals; `need()`'s toast side effect split from the pure check | Structural improvement disclosed in the Phase 1 spec; user approved the spec | Behaviour identical; message text preserved verbatim |
| D-02 | Toast is a Zustand store + host component instead of a global `toast()` | Same as D-01 | Same messages, same error styling |
| D-03 | `components/ui/` are hand-written Tailwind primitives, not shadcn/ui | User: "точное использование shadcn/ui … желательно, но не важнее сохранения поведения" | Open deviation from `anbar-platform-tovsiyeler.md`; swap possible without touching pages |
| D-04 | No `router/` yet; `App.tsx` renders the single screen directly | Phase 1 had one screen | Must be resolved in Phase 2 (two kinds on one page) |
| D-05 | Logout resets the store instead of `location.reload()` | Same end state, no tab discard | Behaviour equivalent |
| D-06 | Access token kept fresh via `onAuthStateChange` instead of a one-shot capture | Avoids reproducing `BUG_REGISTRY` C-12 | Strictly safer; no user-visible change |
| D-07 | Warehouse-only page instead of the unified multi-kind «Soraqçalar» table | User then decided navigation must match the original | Phase 2 corrects this; tracked in the Phase 2 spec |
| D-08 | Usage counting loads the `movements` table (paginated) rather than issuing per-name SQL counts | Chosen to match `REF_EQ` semantics exactly; the old platform loads the same table in full on every login | Accurate, but see R-01 |
| D-09 | **Scoped exception to Supabase-isolation:** `App.tsx:77-78` calls `supabase.auth.getSession()` and `supabase.auth.onAuthStateChange()` directly | Needed so the unload beacon (A-16) has the access token synchronously; the subscription's lifetime is tied to the component, which is why it sits in `App`. Not yet moved because the task that surfaced it was documentation-only, and moving an auth subscription can change teardown timing | **Cleanup pending:** extract to an auth-session API wrapper. Prerequisite per principles §9: regression tests for token refresh and for beacon-after-refresh first. Tests today: `App.test` (beacon fires only while signed in), `session.api.test` (beacon contract) |
| D-10 | **Scoped exception to Supabase-isolation:** `hooks/useRealtimeRefresh.ts:45,54` calls `supabase.channel()` / `supabase.removeChannel()` directly | The hook owns the channel's lifecycle (subscribe on mount, remove on unmount); splitting lifecycle from subscription risks leaking a channel or removing it twice | **Cleanup pending:** extract the client calls into `api/realtime.api.ts`, keeping lifecycle in the hook. Tests today: `WarehousesPage.test` (subscribes once to the three tables, burst collapses into one refresh, channel removed on unmount) |

| D-11 | Phase 1 screens did not reproduce the production platform's visual design | **Resolved** by `d8fbd43` (user chose to re-skin rather than accept the interim look) | Closed: `web/src/index.css` now carries the production design contract ported from `origin/main:index.html` (11-211) — same `:root` tokens, topbar, rail, cards, dense tables, tags, buttons, form fields, modal, toast and login gate. Behaviour untouched |

| D-12 | Only `warehouse` and `partner` appear in the kind selector; the original lists eight kinds | Phase 2 non-goal, stated in its approved design | The other six (`location`, `channel`, `unit`, `category`, `project`, `serfiyyat_channel`) need only a row in `WIRED_KINDS` plus an entity fetcher — no structural change |
| D-13 | A partner whose stored `contract_date` is not ISO cannot be displayed by the `type=date` field. Live data (verified 2026-09-02): 15 non-empty values — **8 ISO, 7 legacy** (six `dd.MM.yyyy`, one bare `2026`). Saving such a partner clears the date, exactly as the production platform does; this build additionally **warns** the user, showing the stored value | **APPROVED — user decision 2026-09-02, option (a):** keep the original's behaviour, add the warning. Nothing changes in data or logic; the date still disappears if the admin saves, but they are told first | Pinned by regression tests in `ReferenceDirectoryFormDialog.test.tsx` (a legacy value still saves as `''`; an ISO value survives an unrelated edit; the warning appears only for unshowable values). Changing this behaviour later means revisiting D-13. **Returning the stored value unchanged is NOT viable:** the RPC casts with `::date` under `DateStyle = ISO, MDY`, so 5 rows raise `date/time field value out of range`, `2026` raises `invalid input syntax`, and `08.06.2026` silently becomes 6 August instead of 8 June — all verified by direct read-only queries. Option (c), a one-off normalisation of the 7 rows, remains available as a separate, separately-approved data task |

| D-14 | **Development-only:** when the page is served from localhost, every reference write (`create`, `update`, `delete`, `deactivate`, `activate`) is refused before the RPC leaves the browser unless `VITE_ALLOW_LOCAL_WRITES=true` is set in `web/.env`; the screen carries a red banner saying the local session is wired to the live database and whether writes are open | **Approved — user instruction 2026-09-02** ("block all localhost reference writes by default, allow only with an explicit opt-in flag"). Widens `cc0e8ba`, which covered only `delete`/`deactivate`/`activate` | **No production effect by construction:** the guard fires only for hostname `localhost`/`127.0.0.1`/`::1`, asserted in `mutationGuard.test.ts` for every action with and without the flag. Consequence for verification: live checks from localhost now need the flag deliberately set, which is the point — see R-14 for what the guard cannot do |

Checked and **not** violations: `pages/LoginPage.tsx` and
`components/SessionDialog.tsx` import only `rememberOn`/`setRemember`/
`savedEmail`/`saveEmail` from `api/supabase.ts` — browser-storage helpers, not
table, RPC, auth-subscription or Realtime client calls.

## Known risks and deferred work

| ID | Risk / deferred item | Impact |
|---|---|---|
| R-01 | Usage counting reads all `movements` rows (1915 today). Cost grows with the table | Performance only; revisit if the table grows by an order of magnitude |
| R-02 | `useHeartbeat`, deactivate/activate (B-07) and the cascade notice (B-10) still have no automated tests. A-19 and A-20 were closed by `bc09b18` | Regressions in the remaining three would not be caught |
| R-03 | Server-side refusals (B-13) never exercised from React | The UI's handling of those exact server errors is unproven |
| R-04 | `ANBAR_SHARED/docs/DB_SCHEMA.md` and `RLS_POLICIES.md` remain stale and contradict the live database | Any future phase trusting them will be misled — principles §3 |
| R-05 | `manage_reference` type mismatch (`BUG_REGISTRY` C-15) was fixed live by others during Phase 1; the React code depends on the fixed contract | If that fix were reverted, warehouse mutations break |
| R-06 | Repository-root `index.html` carries an uncommitted user edit that removes the `String(id)` conversion | Never staged by migration work; must not be swept into a React commit |
| R-07 | Two scoped exceptions to Supabase-isolation remain open (D-09 auth subscription in `App.tsx`, D-10 Realtime client in `useRealtimeRefresh`) | Architectural debt, not behavioural. Cleanup is gated on regression tests first, per principles §9 |
| R-08 | ~~React screens look nothing like the production platform~~ — **closed** by `d8fbd43`. Residual: only the classes Phase 1 renders were ported; later phases must extend `index.css` from the original rather than invent styling | Low. Side-by-side acceptance comparison is now meaningful |
| R-09 | **Accepted risk** (D-13, user decision option (a)): 7 of 15 non-empty `partners.contract_date` values are legacy non-ISO, and editing such a partner and saving still clears the date. The warning makes it visible, not impossible | Data loss on an unrelated edit; 7 rows, disclosed, warned about in the UI, and pinned by tests. Removable only by option (c) — a separate data task |
| R-10 | Module C's server-side partner rules (C-17) — the name collision against `warehouses` and the delete-when-used refusal — have never been triggered from React | The UI's handling of those exact refusals is unproven |
| R-11 | Usage now reads `movements` once per refresh for the whole table rather than per name — cheaper than Phase 1, but still a full-table read that grows with the table (see R-01) | Performance only |
| R-12 | Final visual-parity pass is deferred until all migration phases are complete. Current known visual differences: thousands separators in `İstifadə` (`1221` vs `1,221`; `1034` vs `1,034`) and a text `Redaktə et` action instead of the old separate `✎` / `✕` row buttons | Non-functional only. Governed by Principles §12; must be reviewed before the final platform cutover |
| R-13 | An `<input type="date">` reports an empty value until the date is complete, so a partly typed date is silently not saved — in this build and in the production platform alike. Not a migration defect; noted because it was mistaken for one | Low; user-visible only as "my date did not save". Would need a UI change (and a decision) to address |
| R-14 | The localhost write guard (D-14) is a client-side convenience only. It cannot stop a write issued from the console, from a build served on a non-localhost dev host (e.g. `--host` on the LAN address), or by any other client — the server's only real control remains `manage_reference`'s admin check | Low, and by design: the guard protects against accidental clicks, not against a determined or misconfigured client |

## Historical live-verification checklist (completed)

| # | Item | Why it needs a live check |
|---|---|---|
| L-01 | Admin sign-in, restore on reload, logout | Rewritten after the last live pass |
| L-02 | `rehber` and `anbardar` sign-in → refusal screen, no admin queries | Role gating has **never** been tested live, with any role |
| L-03 | Warehouse list + usage numbers vs the old platform on the same data | Counting was rewritten entirely; numbers must be compared side by side |
| L-04 | Create / rename / hide / activate / delete with the two-step confirm | Delete flow changed; usage-based gating changed |
| L-05 | Session window: device list, close one device, close all others | Never existed at the time of the live pass |
| L-06 | Password change end to end | Same |
| L-07 | Device-limit dialog with a real second device (esp. a 1-device role) | Requires occupying the limit |
| L-08 | Tab-close beacon actually frees the slot | Requires observing `sessions` after closing a tab |
| L-09 | Realtime: a change by a second Admin appears automatically | Requires two browsers |
| L-10 | List controls against the real five warehouses | Cheap, but unverified |

## Modules not yet migrated — `NOT STARTED`

Dashboard; Yeni əməliyyat; Mal hərəkəti; Anbar qalıqları; stock layers and
Silinmə; item requests (`nreq`); group operations; documents, cancellation and
correction; Excel import/export and SON export; reports; finance;
Azpetrol/Araz; users administration.

**Mal qrupları (`grp`) left this list in Phase 6** — Module G below is
`CODE VERIFIED` (implemented, independently re-audited, and live verified for
the available Admin read-only and real-workbook scenarios on 2026-09-04). It
is a read/select/export screen with no write path. Note that
«group operations» above is a DIFFERENT, still-unmigrated feature: it writes,
whereas Mal qrupları does not.

(The six remaining reference kinds left this list in Phase 3 — all eight are
now implemented under Module D. Audit log left this list in Phase 4 — see
Module E. **Nomenklatura left this list in Phase 5: Module F below is
`CODE VERIFIED` — implemented 2026-09-03, Codex-audited, its fourteen findings
remediated and re-audited — except `M5-55`, which was `BLOCKED` on the
Yeni əməliyyat phase and is now `LIVE VERIFIED` (Phase 7 H-5, 2026-09-05).
Module F is still not `ACCEPTED`: apart from `M5-55`, no live verification of
its rows has been performed.** An earlier revision of this paragraph said Nomenklatura's
implementation «has not started»; that predated Phase 5 and is corrected here.
`Nomenklatura sorğuları` (`nreq`) and `Mal qrupları` (`grp`) remain separate
screens with their own future phases, not parts of Module F. The full-app
nav/router remains unbuilt: `App.tsx` still uses the minimal two-page switch
Phase 4 added, not a router.)

Their absence is expected — the React app is a parallel test platform and must
not replace the production one (principles §8).

## Phase 2 entry criteria

Phase 2 (unified «Soraqçalar» + Kontragentlər,
`docs/superpowers/specs/2026-09-02-react-migration-phase2-partners-design.md`)
must add its registry rows during research, before implementation, and must
carry D-04 and D-07 to resolution.

## Module D — Reference directories: the six remaining Soraqçalar kinds (Phase 3)

**Phase 3a (`channel`, `unit`, `category`) and Phase 3b (`location`,
`project`, `serfiyyat_channel`) both implemented — `CODE VERIFIED`. All eight
kinds now reach the screen.** Rows were merged here before implementation per
principles §10, from
[`2026-09-02-react-migration-phase3-reference-kinds-design.md`](specs/2026-09-02-react-migration-phase3-reference-kinds-design.md)
§6. Task sequence:
[`2026-09-02-react-migration-phase3.md`](plans/2026-09-02-react-migration-phase3.md).
IDs use the `M3-` prefix (Q7) to avoid colliding with the existing `D-01…D-14`
deviation table.

Kinds covered: `location`, `channel`, `unit`, `category`, `project`,
`serfiyyat_channel`.

**Evidence level for every `CODE VERIFIED` row below: source review against
`origin/main:index.html` plus mocked automated tests. No live browser check and
no live CRUD has been performed — nothing here is `LIVE VERIFIED` or
`ACCEPTED`.** Codex's independent audit and browser comparison come next.
Automated checks at Phase 3b completion: **358 tests passing in 24 files**,
`typecheck`, `lint` (oxlint) and `build` clean, `git diff --check` clean.
(296 in 23 files at the end of Phase 3a.)

| # | Function | Old ref | React ref | Tests | Status |
|---|---|---|---|---|---|
| M3-01 | All eight kinds listed and filterable in one table | 2934-2943, 2990-2999 | `types/referenceDirectory.ts` `KIND_RULES`, `pages/ReferenceDirectoryPage.tsx` | `referenceDirectory.test` (order, labels, uniqueness, **no kind left unwired**), `ReferenceDirectoryPage.test` (all eight in both selectors, in REF_KINDS order) | `CODE VERIFIED` — complete: all eight kinds reach the screen |
| M3-02 | Readiness probe: unavailable kinds disabled, rows omitted, banner listing them, `refOpen` refusal | 2949-2953, 3010, 3024, 3079 | `isKindReady`, `ReferenceDirectoryPage.tsx` (banner, `disabled` options, `openEditor`) | `ReferenceDirectoryPage.test` — banner names exactly the unready kinds for **either** flag; options disabled per kind; refusal toast verbatim; the always-available kinds unaffected | `CODE VERIFIED` — both flags now exercised |
| M3-02a | Readiness is per-kind and independent of the data source: `serfiyyat_channel` is gated on `serfiyyat` despite sharing `get_reference_values()` with `channel`/`unit`/`category` (design §4.4, matrix §5.1) | 2949-2953 | `readiness` field in `KIND_RULES`, separate from the source | `referenceDirectory.test` (gated on serfiyyat while channel stays available), `store` test (**withheld when `serfiyyat` is down although parsed**; listed when both agree; absent when the gate is open but the source failed — matrix M3), `ReferenceDirectoryPage.test` (only the two Sərfiyyat kinds disabled when that subsystem is down) | `CODE VERIFIED` — the rule and its user-visible effect are both asserted |
| M3-02b | `serfiyyat` requires **all three** reads — `serfiyyat_projects`, `serfiyyat_documents`, `serfiyyat_lines` — to succeed; a `serfiyyat_lines` failure alone hides `project` and `serfiyyat_channel`, although Phase 3 uses none of its columns (design §4.4, sub-matrix §5.1.1 S4) | 6185-6206 | `api/serfiyyatProjects.api.ts` (three reads, combined guard) | `serfiyyatProjects.api.test` — the **full S1-S5 sub-matrix**, plus a test that `serfiyyat_lines` is requested as a bare `id` probe. **S4 was confirmed to fail** against a two-read variant before the guard was kept | `CODE VERIFIED` |
| M3-03 | `location` rows sourced from `warehouses.type='layihə'` | 2962 | `store/referenceDirectory.store.ts` (one table split by `type`) | `referenceDirectory.store.test` (anbar→warehouse, layihə→location), `ReferenceDirectoryPage.test` (row labelled «Ünvan / layihə») | `CODE VERIFIED` — see the Q1 ceiling below |
| M3-04 | `location` usage = operational movements(warehouse ∥ partner) + assigned users | 2977-2987 | `api/referenceUsage.api.ts` (falls through to the warehouse rule) | `referenceUsage.api.test` (5: movements ∥ partner + users, cancelled excluded, users read, inexact on a failed users read, no collision with a same-named warehouse) | `CODE VERIFIED` — see the Q1 ceiling below |
| M3-05 | `location` name lock when used; hide/activate/delete rules; no rename cascade | 3085, wrapper | `KIND_RULES.nameLockedWhenUsed`, `ReferenceDirectoryFormDialog.tsx` | `referenceDirectory.test` (locked for warehouse+location only), `ReferenceDirectoryFormDialog.test` (4: locked when used, editable when unused, locked when usage unknown, empty meta) | `CODE VERIFIED` — see the Q1 ceiling below |
| M3-06 | `channel`/`unit`/`category`/`serfiyyat_channel` rows from `get_reference_values()` in **one** call — including `serfiyyat_channel`, which is fetched here and gated later (M3-02a) | 995-1004, 2955-2957, 6208 | `api/referenceValues.api.ts` | `referenceValues.api.test` (11: one RPC call for four kinds, stored→UI kind mapping, serfiyyat_channel parsed, inactive rows kept, `active:null`→true, id stringified, **both failure shapes**) | `CODE VERIFIED` |
| M3-06a | **Degraded load:** a reference-values failure never breaks the screen — the original's try/catch covers a returned `{ error }` *and* a rejected promise (network/fetch), warning and carrying on with the kinds that did load | 995-1004 | `api/referenceValues.api.ts` (try/catch), `store/referenceDirectory.store.ts` | `referenceValues.api.test` (returned error; **`mockRejectedValue`**; non-Error rejection), `referenceDirectory.store.test` (warehouse/partner rows survive with `referenceValues:false`; plus an integration case running the real API against a rejecting client) | `CODE VERIFIED` — **found by the Phase 3a audit.** The first implementation handled only the returned-error shape; a rejected promise escaped into the store's `Promise.all` and blanked the whole page. Fixed and pinned; the three new tests were confirmed to fail against the unguarded version |
| M3-07 | `channel` usage over operational movements only | 2980 | `api/referenceUsage.api.ts` | `referenceUsage.api.test` (channel counted from `movements.channel` only; cancelled excluded; REF_EQ; items never read) | `CODE VERIFIED` |
| M3-08 | `unit` usage = `items.unit`; `category` usage = `items.category` | 2981-2982 | `api/referenceUsage.api.ts` `fetchItemRefs` | `referenceUsage.api.test` (per-column counting, no cross-contamination, **unaffected by cancelled movements**, REF_EQ, single ordered pass) | `CODE VERIFIED` |
| M3-09 | Rename cascade reported for channel/unit/category (`cascaded_rows`) | 3172-3177, RPC | `ReferenceDirectoryFormDialog.tsx` (unchanged Phase 2 path) | `ReferenceDirectoryFormDialog.test` — cascade count surfaced in the toast for a channel rename | `CODE VERIFIED` — client-side reporting only; the server's actual cascade is unexercised (see M3-16) |
| M3-10 | `project` rows from `serfiyyat_projects`, incl. `linked_warehouse` | 2960, 6198 | `api/serfiyyatProjects.api.ts`, `store/referenceDirectory.store.ts` | `serfiyyatProjects.api.test` (mapping, null link → '', inactive kept, `active:null`→true), `referenceDirectory.store.test` (linked_warehouse carried onto the row) | `CODE VERIFIED` |
| M3-11 | `project` linked-warehouse selector: active `anbar` warehouses, empty option, original hint, server validation surfaced; edit always resends the stored value even when unchanged (Q4) | 3093-3095, RPC | `ReferenceDirectoryFormDialog.tsx`, `store` `activeWarehouseNames` | `ReferenceDirectoryFormDialog.test` (7, incl. **always-resend on a name-only edit**, changed link, deliberate clear, create unlinked, invalid-warehouse refusal verbatim, field absent for other kinds); `store` test (only active `anbar` names offered) | `CODE VERIFIED` |
| M3-12 | `project` usage counted by `project_id`, not by name | 2984 | `KIND_RULES.usageById`, `entityUsageKey`, `api/referenceUsage.api.ts` | `referenceUsage.api.test` — **two same-named projects with different ids get different counts**; a name lookup finds nothing. `referenceDirectory.test` (key helper), `ReferenceDirectoryPage.test` (id-keyed count renders) | `CODE VERIFIED` |
| M3-13 | `serfiyyat_channel` rows (from `get_reference_values()`) and usage by `serfiyyat_documents.alinma_kanali`; availability gated on `serfiyyat` readiness per M3-02a | 2961, 2985, 6207-6212, 2952 | `api/referenceValues.api.ts` (rows), `api/referenceUsage.api.ts` (usage), `store` (gate) | `referenceUsage.api.test` (counted by name over documents, REF_EQ), `referenceDirectory.store.test` (**withheld when `serfiyyat` is down although its rows were parsed**; and when its gate is open but its source failed), `ReferenceDirectoryPage.test` (surfaced when ready; hidden with `project` when not) | `CODE VERIFIED` |
| M3-14 | Server refusals for the six Phase 3 kinds surfaced verbatim (rename-when-used, delete-when-used, invalid linked warehouse, duplicate name) | 3178-3182, RPC | `ReferenceDirectoryFormDialog.tsx` (unchanged Phase 2 path) | `ReferenceDirectoryFormDialog.test` — a delete refusal for a unit and the **invalid-linked-warehouse refusal for a project**, both surfaced verbatim | `CODE VERIFIED` — against **mocked** errors. The real server refusals remain unexercised (M3-16) |
| M3-15 | Realtime refresh covers `reference_values`, `items`, `serfiyyat_projects`, `serfiyyat_documents` | 1163-1181 | `ReferenceDirectoryPage.tsx` `WATCHED_TABLES` | `ReferenceDirectoryPage.test` — eight tables on one channel, one subscription | `CODE VERIFIED` — all four tables of the row named are now watched. `serfiyyat_lines` is deliberately **not** watched: it is only a readiness probe, so a write there changes no row or count on this screen |
| M3-16 | Server-side rules never exercised from React (linked to Module C's C-17, not a merge — closed independently per Q8): each kind's delete-block and the linked-warehouse validation | RPC body | — (server) | — | `NOT STARTED` — no live CRUD was performed in 3a or 3b; every mutation test is mocked |
| M3-17 | **New deviation (Q2):** typed name confirmation required before permanent `project` deletion — a client-side gate added ahead of the RPC call, not a server change. Explicitly approved safety difference from the old platform, which offers plain «Tamamilə sil» for every kind | design §3.4, H-2 | `ReferenceDirectoryFormDialog.tsx` (`deleteArmed`, enforced in `send()` as well as on the button) | `ReferenceDirectoryFormDialog.test` (8: button disabled until exact match, **RPC not called on a click that bypasses the disabled attribute**, deletes on exact match, whitespace tolerated, warning shown, «Gizlət» still offered, **the other seven kinds provably ungated**, localhost guard still applies) | `CODE VERIFIED` |

### Codex audit of Phase 3a + 3b — completed 2026-09-02

Independent audit by Codex, covering both phases together.

**Passed:**

- Automated checks reproduced: 358 tests, typecheck, lint, build.
- **Read-only browser comparison against the old platform: all eight reference
  kinds and all 90 rows matched** in names, statuses and numerical usage
  counts. This is the check the registry has been calling the highest-value
  one since Phase 3a, and it now has a result.
- Kind filters exercised; the empty hidden-status view checked.

**Explicitly NOT covered — these limitations stand unchanged:**

- **Live create / update / hide / delete were not tested.** Every mutation
  remains exercised only against mocks. `M3-16` stays `NOT STARTED`, and no
  write path in Module D may be described as `LIVE VERIFIED`.
- The **`location` dataset is still empty** live, so Q1's ceiling is unmoved:
  its write path stays `NOT LIVE VERIFIED` regardless of this audit.

**Three visual differences found, deferred by decision to the final visual
review** — recorded here so they are not rediscovered as bugs, and not fixed
piecemeal before that review:

| # | Difference | Status |
|---|---|---|
| V-01 | Thousands separators in usage counts | `DEFERRED` — final visual review |
| V-02 | Action-button presentation | `DEFERRED` — final visual review |
| V-03 | Empty-state width | `DEFERRED` — final visual review |

**Resulting status:** Module D is `CODE VERIFIED` + `READ-ONLY LIVE VERIFIED`.
It is **not** `ACCEPTED`: acceptance needs the live mutation pass, and `D-12`
stays open until then.

### Phase 3b — what was verified, and what was not

Verified by source review + mocked tests:

- `location` rows come from the same `warehouses` table as `warehouse`, split
  by `type`, and inherit the warehouse usage rule (movements ∥ partner, plus
  assigned users) and the name lock.
- The three-read Sərfiyyat gate, with the full S1-S5 sub-matrix. **S4 (a
  `serfiyyat_lines` failure alone) was confirmed to fail against a two-read
  variant before the guard was kept**, so the test genuinely pins the rule.
- `project` and `serfiyyat_channel` appear and disappear together, and
  `serfiyyat_channel` is withheld when the Sərfiyyat subsystem is down even
  though its rows arrived with the reference values (M3-02a, matrix M2/M3).
- `project` usage is keyed by id: two same-named projects get different counts.
- Q4's always-resend rule: editing only the name still sends the stored
  `linked_warehouse`.
- Q2's typed-name delete gate, enforced in `send()` and not only by disabling
  the button, and provably absent for the other seven kinds.
- The localhost write guard still blocks every Phase 3b mutation.

**Not verified, and not claimed:**

- No live browser check, no live CRUD, no comparison of any usage number
  against the old platform. `VITE_ALLOW_LOCAL_WRITES` was not set.
- **`location` has zero live rows** (design §2.2). Its listing and empty state
  are covered by tests, but per approved decision **Q1** its
  create/rename/hide/delete write path stays `NOT LIVE VERIFIED` — no
  artificial record was created to force it.
- **`serfiyyat_documents` is empty live**, so every project counts as unused
  and the server would not refuse a deletion. That is exactly why M3-17's
  typed-name gate exists; the underlying server behaviour is unchanged.
- The real server refusals and cascades have never been triggered from React
  (M3-16).

### Phase 3a — what was verified, and what was not

Verified by source review + mocked tests:

- The three kinds list, filter, page and search alongside warehouse/partner,
  with the original's labels and per-kind usage numbers.
- Usage counting matches `refUsage` per kind, including the distinction the
  original draws: `channel` filters cancelled movements, `unit`/`category`
  count `items` with no cancellation concept at all.
- Per-source failure isolation: a failed `items` read makes only `unit`/
  `category` inexact; a failed `movements` read leaves them exact.
- Degraded load (M3-06a): both reference-values failure shapes — a returned
  `{ error }` and a **rejected promise** — leave warehouse and partner rows on
  screen with `referenceValues: false`, rather than failing the page.
- The readiness probe's four visible effects for the `referenceValues` flag.
- `serfiyyat_channel` is parsed from the shared RPC response and deliberately
  not surfaced — asserted in both directions.
- Phase 1/2 behaviour: all pre-existing tests pass, with three assertions
  updated only for the larger row set they now legitimately see (row totals
  4→8, watched tables 4→6), not for changed behaviour.

**Not verified, and not claimed:**

- No live browser check of any kind. No comparison of usage numbers against the
  old platform on real data — the single most valuable check, still outstanding.
- No live CRUD. Every mutation assertion is against a mocked `manageReference`;
  the localhost write guard stayed at its default (`VITE_ALLOW_LOCAL_WRITES`
  was **not** set).
- The server's own refusals, cascades and duplicate-name errors have never been
  triggered from React (M3-16).
- Row counts against live data (design §2.2 expects 8 channels, 18 units,
  16 categories) are unconfirmed.

### Registry housekeeping this module performs

- `D-12` ("only two of eight kinds wired") — all eight kinds are implemented,
  and Codex's read-only browser comparison of all 90 rows passed
  (2026-09-02). The row nonetheless **stays OPEN**: the audit covered reading
  only, so no kind's create/update/hide/delete path has been exercised live.
  It closes when the live mutation pass is done and accepted.
- `C-17` is **not** closed by `M3-16` — see Q8 (design §10): the two rows are
  linked, and `C-17` closes only after its own server-refusal paths are
  exercised live.
- **Verification-ceiling note (Q1):** `M3-03`/`M3-04`/`M3-05` (the `location`
  rows) may reach `CODE VERIFIED` and read-only `LIVE VERIFIED`, but their
  create/rename/hide/delete write path stays `NOT LIVE VERIFIED` by decision —
  no artificial record is created to force it. This is a deliberate, standing
  exception to the phase's `ACCEPTED` bar, not a gap to be silently closed
  later.

### Decisions applied to this module (Q1-Q8, design §10, 2026-09-02)

| ID | Decision | Registry consequence |
|---|---|---|
| Q1 | `location`: implement + read-only live verification only; no artificial record | `M3-03`/`M3-04`/`M3-05` carry the standing `NOT LIVE VERIFIED` ceiling above |
| Q2 | Typed project-name confirmation before permanent delete | `M3-17` |
| Q3 | Cancelled-movements UI/server mismatch preserved unchanged | Accepted risk, unchanged from design §8 H-3 |
| Q4 | `project` edits always resend stored `linked_warehouse` | Folded into `M3-11`'s done-criteria |
| Q5 | `items` added to the existing single Realtime subscription | `M3-15` |
| Q6 | Phase split: 3a = `channel`/`unit`/`category`; 3b = `location`/`project`/`serfiyyat_channel` | Determines commit/task grouping only; row numbering unaffected |
| Q7 | New rows prefixed `M3-` | Applied throughout this module |
| Q8 | `C-17` stays open, linked to `M3-16`, closes only after its own live verification | See housekeeping above |

## Module E — Audit jurnalı (Phase 4)

## STATUS: `ACCEPTED` — by explicit user decision, 2026-09-03

**The user accepted Phase 4 / Module E on 2026-09-03 without performing the
populated-data live comparison.** This is a deliberate acceptance *with a
recorded exception*, not a claim that the module was fully live verified.
Read the exception below before treating any row here as proven in a browser.

Q1-Q5 approved by the user; rows merged before implementation per principles
§10, from
[`2026-09-02-react-migration-phase4-audit-log-proposal.md`](specs/2026-09-02-react-migration-phase4-audit-log-proposal.md);
task sequence in
[`2026-09-02-react-migration-phase4-audit-log.md`](plans/2026-09-02-react-migration-phase4-audit-log.md).
IDs use the `M4-` prefix.

This module is read-only: it has no create/update/hide/delete path at all
(the original disables even its Excel export), so it carries no
live-mutation gap.

### Automated verification — passed

**450 tests passing in 30 files** (was 358/24 before this module; 432 at
implementation; 448 after the three Codex audit fixes), `typecheck`, `lint`
(oxlint) and `build` clean, `git diff --check` clean.

### ⚠ Accepted exception — NOT live compared, standing reminder

At acceptance time **both the old and the new platform showed zero
`audit_log` rows**, so the live comparison could only confirm that the two
render an identical empty state. The following were therefore **never
compared against live data** and are **not** covered by this acceptance:

- non-empty row rendering;
- actor, action and object detail resolution (including the boot-loaded user
  directory resolving real actors rather than raw ids);
- filtered counts, and the nav-badge total against a real unfiltered count;
- multi-page navigation at 50 rows per page.

Every row below marked `CODE VERIFIED` rests on source review against
`origin/main:index.html` plus mocked automated tests — not on a live browser
check with data.

**Standing reminder — do not drop this when the module is next touched:** run
the populated-data comparison as soon as `audit_log` contains records, and
only then promote the affected rows to `LIVE VERIFIED`. Accepting the module
did not discharge this check; it deferred it. Until it runs, no row here may
be described as live verified.

**Also still open and deliberately carried forward:**

- Printed output has never been inspected in a real print preview; `M4-18b`
  and `M4-18d` are verified by DOM structure, CSS presence and call ordering
  only.
- Sync indicator shows «bağlı deyil» on Audit jurnalı (shell-scope review —
  **do not** fix with an `audit_log` subscription, Q3 forbids it).
- Deferred visual backlog V-01…V-03.
- No performance check against a large `audit_log` table.

| # | Function | Old ref | React ref | Tests | Status |
|---|---|---|---|---|---|
| M4-01 | Page lists audit rows: time, actor, action, object, detail, reason | 7150-7160 | `pages/AuditLogPage.tsx` | `AuditLogPage.test` (renders time/actor/action/object/record_id/summary/reason; raw table_name/action fallback for an unmapped value) | `CODE VERIFIED` |
| M4-02 | All five filters applied **server-side**; count agrees with rows | 7122-7133 | `api/auditLog.api.ts` `fetchAuditLog` | `auditLog.api.test` — captures the exact PostgREST clause list per filter, alone and combined; no filter clause when every filter is empty | `CODE VERIFIED` |
| M4-03 | Object filter over the four known tables (`movements`, `partners`, `warehouses`, `reference_values`), plus «Bütün obyektlər» | 7061-7067, 7082 | `pages/AuditLogPage.tsx` `AUDIT_TABLE_LABEL` | `AuditLogPage.test` (selecting the object filter reloads with the chosen table) | `CODE VERIFIED` |
| M4-04 | Action filter INSERT/UPDATE/DELETE, plus «Bütün əməliyyatlar» | 7068, 7083 | `pages/AuditLogPage.tsx` `AUDIT_ACTION_LABEL` | `AuditLogPage.test` (selecting the action filter reloads with the chosen action) | `CODE VERIFIED` |
| M4-05 | Actor filter incl. «Sistem/naməlum» → `is('user_id', null)` | 7084, 7126 | `api/auditLog.api.ts`, `pages/AuditLogPage.tsx` | `auditLog.api.test` (`__null` maps to `.is`, not `.eq`), `AuditLogPage.test` (selecting «Sistem/naməlum» sends the sentinel; actor list sorted by email) | `CODE VERIFIED` |
| M4-06 | Date range filters, preserving the original's boundary strings and timezone behaviour exactly (Q5) | 7128-7129 | `api/auditLog.api.ts` | `auditLog.api.test` — asserts the literal `d1 + 'T00:00:00'` / `d2 + 'T23:59:59'` concatenation, not a timezone-correct range | `CODE VERIFIED` |
| M4-07 | «Sıfırla» clears every filter and returns to page 0 | 7092 | `store/auditLog.store.ts` `reset`, `pages/AuditLogPage.tsx` | `auditLog.store.test` (reset clears every field), `AuditLogPage.test` («Sıfırla» reloads with `EMPTY_FILTERS`) | `CODE VERIFIED` |
| M4-08 | Page size 50, `range()` paging, ends disable the pager buttons | 7069, 7130, 7162-7166 | `api/auditLog.api.ts` `AUDIT_PAGE_SIZE`, `pages/AuditLogPage.tsx` | `auditLog.api.test` (`range(100,149)` for page 2), `AuditLogPage.test` (both buttons disabled on a single, full page; «Növbəti» enabled with more rows; advancing sends `page:1`) | `CODE VERIFIED` |
| M4-09 | Sort `ts` descending | 7130 | `api/auditLog.api.ts` | `auditLog.api.test` (`.order('ts', {ascending:false})` asserted) | `CODE VERIFIED` |
| M4-10 | Actor resolution via `get_user_directory()`; never `users.name`; null → «Sistem/naməlum»; unknown id → raw id | 1020-1035, 7074-7077 | `api/userDirectory.api.ts`, `pages/AuditLogPage.tsx` `actorLabel` | `userDirectory.api.test` (RPC name, id→email map, missing email → `''`, never a name field), `AuditLogPage.test` (resolved email; raw-id fallback; null → «Sistem/naməlum») | `CODE VERIFIED` |
| M4-11 | Failed user directory: page still renders, warning shown, ids displayed | 7147 | `store/auditLog.store.ts` `directoryError`, `pages/AuditLogPage.tsx` | `auditLog.store.test` (failure sets the flag without touching rows/total), `AuditLogPage.test` (warning shown; table still renders with raw ids) | `CODE VERIFIED` |
| M4-12 | Permission errors distinguished from load errors | 7145 | `api/auditLog.api.ts` `classifyError` | `auditLog.api.test` — pins the classifier's literal `permission|denied|rls|401|403` regex, including a negative case («row-level security» alone does NOT match) | `CODE VERIFIED` |
| M4-13 | Stale-response discarding across rapid filter changes | 7136-7143 | `store/auditLog.store.ts` `requestSeq` | `auditLog.store.test` — a slower reply for an older filter set does not overwrite a newer, already-resolved one. **Verified to fail** when the sequence guard is removed, confirming the test is load-bearing | `CODE VERIFIED` |
| M4-14 | Row summaries: DELETE/INSERT/UPDATE key limits, 40-char truncation, malformed rows tolerated. All `audit_log` display columns are nullable in the DB — a null `action`/`ts`/`old_values`/`new_values` must render, not throw | 7099-7118, `database.ts` `audit_log.Row` | `lib/auditSummary.ts` | `auditSummary.test` (15: per-action key limits, JSON.stringify-based change detection incl. nested-object equality, 40-char truncation, null-field rendering, non-object values, never throws) | `CODE VERIFIED` |
| M4-15 | Excel export present but disabled, tooltip preserved (Q2) | 7168, HTML 442 | `pages/AuditLogPage.tsx` | `AuditLogPage.test` (button disabled, exact tooltip text) | `CODE VERIFIED` |
| M4-16 | Nav-badge total (`#c-log`) is a **separate unfiltered** `count-only head` query, loaded once at boot, independent of the page's own filtered count; renders `…` while loading, `!` on error, else the formatted total | 1057-1067, 1528 | `api/auditTotal.api.ts`, `App.tsx` | `auditTotal.api.test` (`select('id',{count:'exact',head:true})`), `App.test` (loads once at boot; shows `…` before resolving, `!` on failure, the count on success) | `CODE VERIFIED` |
| M4-17 | User directory (`UMAIL`) is loaded **eagerly at boot** (`loadAuditUsers`), not lazily when the audit page opens | 7516 | `App.tsx` (`loadDirectory` called at `status==='ready'`) | `App.test` (directory load fires at boot, asserted via the same effect as M4-16) | `CODE VERIFIED` |
| M4-18 | **List controls survive navigation.** The kind filter, status filter, name search, page size and page number persist when the user leaves Soraqçalar and returns. The original's screens are long-lived DOM that `go()` shows and hides (1496-1530), so its inputs are never destroyed; React unmounts the page, so these must live in the store, not in component state | 1496-1530, 3016-3022 | `store/referenceDirectory.store.ts` (`controls`, `setControls`), `pages/ReferenceDirectoryPage.tsx` | `ReferenceDirectoryPage.test` (5: kind+search, status, page size, page number each survive an unmount/remount; a filter change still returns to page 0). **All four preservation tests verified to fail** against component-local state before the fix was kept. `referenceDirectory.store.test` (6: merge, page-0 reset rules, `load()` does not clobber) | `CODE VERIFIED` — **found by Codex's Phase 4 audit** |
| M4-18b | **Print parity.** The original populates a `#printhead` block (title, `Anbar Platforması · timestamp · user`) and applies a print stylesheet that strips the rail, topbar, filters and buttons; calling `window.print()` alone yields an untitled, undated, unattributed sheet | 1238-1243, 7167, 203, HTML 275 | `components/PrintHead.tsx`, `index.css` (`@media print`, `.printonly`), `pages/AuditLogPage.tsx` | `AuditLogPage.test` (4: hidden `#printhead` carries title/platform/user; «Çap» still calls `window.print()`; plus the two M4-18d cases) | `CODE VERIFIED` — **found by Codex's Phase 4 audit.** Printed output itself is not live-verified |
| M4-18d | **The print timestamp is stamped at «Çap», not at render.** `printHead()` evaluates `new Date()` inside the click handler (1242, called at 7167), so the sheet is dated when it was printed. Computing it during render dated the sheet to when the page was *opened* — a tab left open overnight printed yesterday's date. The header must also be in the DOM *before* `window.print()` reads it: the original buys that with `setTimeout(…, 60)` after writing `innerHTML`; React's batching needs `flushSync`, or the first sheet prints undated | 1242, 7167 | `pages/AuditLogPage.tsx` (`printedAt` state, `flushSync` in the «Çap» handler, injectable `now`), `components/PrintHead.tsx` (`stampedAt` prop; no subtitle before the first print, matching the original's empty `#printhead`) | `AuditLogPage.test` (3): open at time A / print at time B asserts the header shows **B and not A**; the header is present in the DOM when `window.print()` fires; no `.ph-s` before the first «Çap». **All three verified to fail against the pre-fix code** — the A/B and no-subtitle cases against render-time stamping, the DOM-ordering case against a batched `setPrintedAt` without `flushSync` | `CODE VERIFIED` — printed output still not inspected in a real print preview |
| M4-18c | **The user directory is boot-scoped, never refetched on page mount.** A refetch let a transient failure on a revisit replace an already-good directory with an empty map, silently downgrading every actor to a raw id. Rows *are* re-read per visit (`rLog`, 7134) — only the directory is boot-scoped | 7516 vs 7134 | `pages/AuditLogPage.tsx` (mount effect loads rows only) | `AuditLogPage.test` (3: never calls `fetchUserDirectory` on mount; a loaded directory survives a reopen; rows still re-read every visit) | `CODE VERIFIED` — **found by Codex's Phase 4 audit** |

### Registry housekeeping this module performs

- Removes "audit log" from «Modules not yet migrated».
- Adds the minimal internal nav switch (`App.tsx`) needed to reach this page,
  approved as in-scope because the module is otherwise unreachable — not a
  shell redesign, and no links are added for any unmigrated module. A non-admin
  now defaults to Audit jurnalı (the only migrated page it can reach, since
  Soraqçalar stays admin-gated); an admin still defaults to Soraqçalar.

### Decisions applied to this module (Q1-Q5, 2026-09-02)

| ID | Decision | Registry consequence |
|---|---|---|
| Q1 | No UI role gate — preserve the original's RLS-only visibility | `M4-01` |
| Q2 | Excel export stays disabled, original tooltip preserved | `M4-15` |
| Q3 | No Realtime subscription for this page | Absence is the correct behaviour, not a gap |
| Q4 | `record_id` shown under the object name exactly as in the original | `M4-01` |
| Q5 | Date-filter boundary strings and timezone behaviour preserved exactly; any correction is a separate approved product change | `M4-06` |

### What was verified, and what was not

Verified by source review + mocked tests:

- Every filter (object/action/actor/date range) becomes a server-side
  PostgREST clause; no client-side filtering exists to disagree with the
  server's count.
- The permission-vs-load error classifier's actual regex, including a case
  that reads as "about RLS" in English but does not match the pattern (a
  negative test, not just a positive one).
- Stale-response discarding — the one piece of new infrastructure this module
  exists partly to prove out for later modules — verified to fail without its
  guard before being accepted as passing.
- Every nullable `audit_log` column (`ts`, `action`, `old_values`,
  `new_values`, `table_name`, `record_id`, `reason`) renders without throwing.
- The two easy-to-miss boot-time behaviours found on pre-implementation
  re-verification (M4-16 nav badge, M4-17 eager directory load) that were not
  in the original proposal.

### Codex audit of Phase 4 — 2026-09-03

Reproduced 432 tests, typecheck, lint and build (the count is now 450 after
the fixes below). Found three defects, **all fixed**: `M4-18` (list controls
lost on navigation), `M4-18b` (print parity), `M4-18c` (redundant directory
refetch). Each fix carries its own regression test, and M4-18's four
preservation tests were verified to fail against the pre-fix code.

A fourth print-parity correction, `M4-18d`, followed on 2026-09-03: the print
timestamp was computed during render rather than at «Çap», so a long-open tab
printed the date the page was *opened*. Stamping now happens in the click
handler and is committed with `flushSync` so the header is in the DOM before
`window.print()` reads it — the two properties the original gets from calling
`printHead()` and then `setTimeout(…, 60)`. Three tests pin it, all verified
to fail against the pre-fix code.

**Live-comparison limitation — preserve this.** The live check found **zero
visible audit records in both platforms**, so the comparison could only
confirm that both render an empty state identically. **Non-empty rows and
multi-page navigation are `NOT LIVE VERIFIED`** and cannot be claimed until a
comparison runs against a populated `audit_log`. Every row-rendering,
pagination and filter-result behaviour in this module rests on mocked tests
alone.

**This limitation survived the user's 2026-09-03 acceptance** — it was
accepted as a recorded exception, not resolved. See the module's STATUS
section above for the standing reminder.

**Open observation, not a defect to fix here:** the sync indicator switches to
«bağlı deyil» when entering Audit jurnalı, because the Realtime subscription
belongs to the reference page and unmounts with it. **Do not add an
`audit_log` subscription — Q3 forbids it.** The correct fix is for the sync
indicator to reflect connection state that is not owned by a single page;
that is shell scope, deferred for review rather than patched here.

**Not verified, and not claimed:**

- No live browser check of populated data — see the limitation above.
- Printed output has not been inspected in a real print preview; `M4-18b` is
  verified by DOM structure and CSS presence only, and `M4-18d` by call
  ordering only.
- No performance check against a large `audit_log` table; page-50 pagination
  is verified for correctness, not for behaviour at production row counts.
- The minimal nav switch added to `App.tsx` has not been checked against the
  original in a live browser for visual or interaction parity beyond the
  automated click/label tests.

## Module F — Nomenklatura, FULL parity (Phase 5)

**Status: IMPLEMENTED 2026-09-03; audited by Codex the same day; the fourteen
audit findings remediated 2026-09-03; the Codex RE-AUDIT confirmed the
implementation and all 843 tests — `CODE VERIFIED`.** Every row below is
`CODE VERIFIED` except `M5-55`, which was `BLOCKED` by a cross-module
dependency (see below) and must not be closed by *this* phase — it was
unblocked in Phase 7 H-4 and live verified in H-5.

**Not `ACCEPTED`.** Code verification is only half the bar (principles §6): no
live verification has been performed, every write path is still exercised
against mocks only, and `VITE_ALLOW_LOCAL_WRITES` remains unset.

**Automated checks: 843 tests in 54 files, typecheck, oxlint, build and
`git diff --check` all clean** (716/50 at first implementation; 450/30 before
this phase).

### Codex audit 2026-09-03 — verdict CHANGES REQUIRED, now remediated

The first implementation was audited and **rejected**: fourteen findings,
[`audits/2026-09-03-phase5-codex-audit.md`](audits/2026-09-03-phase5-codex-audit.md).
Each was independently re-confirmed against `origin/main:index.html` before
being fixed, and each fix carries regression tests that were verified to fail
against the pre-fix code.

**A correction to this section's own history:** between implementation and this
remediation, the heading above claimed `CODE VERIFIED` while all 54 rows still
read `NOT STARTED`, and `M5-36` was recorded as delivered although no
implementation existed. Both were audit finding §1. The row statuses are now
set individually, and `M5-36` was actually built (`lib/suggestCategory.ts`)
rather than re-marked.

| Finding | Resolution | Code | Tests |
|---|---|---|---|
| `A01` P1 | Bulk update no longer erases a stored price when the pasted row omits one — the legacy `r.price \|\| existing.price` fallback restored | `BulkItemsDialog.tsx` | 5 cases incl. omitted / explicit-0 / replacement / create |
| `A02` P1 | Category import: full legacy bucket classification, seven-digit and duplicate checks, blank codes kept as errors, and the whole-file error gate on BOTH the button and the handler | `lib/categoryImportClassify.ts`, `lib/csv.ts`, `CategoryImportDialog.tsx` | 15 + 7 |
| `A03` P1 | New-item import blocks the entire apply while any row is `err` (I-14) | `ImportItemsDialog.tsx` | 4 |
| `A04` P1 | `.drawer` / `.drawer.on` ported; card is reachable and layered mask < drawer < modal | `index.css` | 6, via a stylesheet-text contract test |
| `A05` P2 | Per-row checkboxes restored in both previews, with counts, price column, code re-prediction and the >250-row scope warning | both dialogs, `lib/importItemParse.ts` | 4 + 5 |
| `A06` P2 | Toggling «Mövcudları yenilə» recomputes the bulk preview | `BulkItemsDialog.tsx` | 3 |
| `A07` P2 | CSV/TXT/TSV file inputs restored in the bulk and category dialogs, with BOM handling and auto-preview | both dialogs | 3 |
| `A08` P2 | Item code editable on create, readonly on edit; validation still enforced | `ItemFormDialog.tsx` | 4 |
| `A09` P2 | Hidden current category retained for that item only; the advisory suggestion actually implemented | `lib/suggestCategory.ts`, `ItemFormDialog.tsx` | 6 + 6 + 10 |
| `A10` P2 | Shared Realtime on `items`/`movements`/`warehouses`; **no `audit_log`** (Phase 4 Q3) | `NomenclaturePage.tsx` | 7 |
| `A11` P2 | Paged movement reads ordered by `date, created_at` again | `api/itemMovements.api.ts` | 3 |
| `A12` P2 | `whLabel` and `routeOrPartner` ported; transfer route, `Xocahəsən→Xocəsən` display alias, em dash for a missing partner | `lib/movementRoute.ts`, `ItemCard.tsx` | 22 + 8 |
| `A13` P2 | «Hamısını göstər» is sticky again — `setFilters` no longer clears it | `store/nomenclature.store.ts` | 4 + 4 |
| `A14` P2 | «Not ready» and «ready but empty» separated; built-in fallbacks only on failure; the no-unit refusal restored | `store/nomenclature.store.ts`, `lib/referenceFallbacks.ts`, `ItemFormDialog.tsx` | 3 + 3 |

Documentation and risk items from the audit's closing section:
`xlsx@0.18.5` now carries an explicit decision/risk record
([`decisions/2026-09-03-xlsx-dependency-risk.md`](decisions/2026-09-03-xlsx-dependency-risk.md),
`R-F7`) — the version was **not** changed; and the incorrect `toNum` comment
is corrected with the inherited zero-padding behaviour pinned by a test
(`R-F9`).

**No live verification has been performed.** Evidence for every row is source
review against `origin/main:index.html` plus mocked automated tests. Live
verification happens only after Codex's audit and must cover **every function
of this screen**, including the five write paths — which need
`VITE_ALLOW_LOCAL_WRITES=true` set deliberately plus per-write approval.

Proposal: [`2026-09-03-react-migration-phase5-nomenclature-proposal.md`](specs/2026-09-03-react-migration-phase5-nomenclature-proposal.md)
· Plan: [`2026-09-03-react-migration-phase5-nomenclature.md`](plans/2026-09-03-react-migration-phase5-nomenclature.md).

**Scope: the whole legacy `nom` screen** — list, search, filters, balances,
values, movement counts, duplicate logic, formatting, print, the 3000-row cut,
Excel export, create, edit, bulk creation, item import, category import, the
item card and its transitions, and role/server-refusal behaviour.

**The earlier read-only scope is withdrawn.** Deviation `D-F1` **no longer
exists** — the user rejected a read-only slice on 2026-09-03 because live
verification must cover every function of this screen.

**Approved decisions:** Q1 **option (c)** (read the needed movement columns,
derive client-side — no SQL change; sets the precedent for later data-heavy
modules) · Q2 **superseded, Excel export is IN scope** · Q3 keep
«Hamısını göstər» as-is · Q4 port `nf`/`money` verbatim, V-01 stays deferred ·
Q5 **RESOLVED as (a)**, 2026-09-03: the card's «Bu mal üzrə əməliyyat» targets
the unmigrated `op` screen, so the button stays visible but disabled with a
tooltip — no dead click and no unreliable deep link to the old platform.
(An earlier revision of this section still described Q5 as open; that was
audit finding §1 and is corrected here.)

`Nomenklatura sorğuları` (`nreq`) and `Mal qrupları` (`grp`) are **separate
screens with their own future phases**, not gaps in Module F.

### Read, list and derivation

| # | Function | Old ref | Planned React ref | Planned tests | Status |
|---|---|---|---|---|---|
| M5-01 | Read `items`, ordered by `code`; a read failure never throws or blanks the page | 849-862, 930 | `api/items.api.ts` | returned `{error}` and rejected-promise both non-fatal (Phase 3a lesson) | `CODE VERIFIED` |
| M5-02 | Read the movement columns the indexes need (Q1c), paged to exhaustion (1000/page) | 847-862, 936-946 | `api/itemMovements.api.ts` | paging past 1000; partial-page stop; error absorbed | `CODE VERIFIED` |
| M5-03 | Exclude cancelled movements and their reversals before deriving anything | 1249-1269, 1281 | `lib/itemIndex.ts` via `lib/operationalMovements.ts` | an all-cancelled item counts as having no movements | `CODE VERIFIED` |
| M5-04 | `q = +(in - out).toFixed(4)`, displayed at 2 decimals | 1313 | `lib/itemIndex.ts` | a case where a naive float sum diverges | `CODE VERIFIED` |
| M5-05 | `val = q × price`, `price` from the **item**, not the movement | 1313 | `lib/itemIndex.ts` | movement priced differently from its item | `CODE VERIFIED` |
| M5-06 | `n` = operational movement count («Hərəkət») | 1289 | `lib/itemIndex.ts` | count excludes cancelled rows | `CODE VERIFIED` |
| M5-22 | `IX.bal` — per-warehouse in/out/q keyed `warehouse\|code` (card) | 1284-1288 | `lib/itemIndex.ts` | one item across two warehouses | `CODE VERIFIED` |
| M5-23 | `IX.priceObs` — `{p,d,k}` collected **only when `m.pr > 0`** | 1283 | `lib/itemIndex.ts` | zero/null-priced movements excluded | `CODE VERIFIED` |
| M5-07 | Search over `name + ' ' + code`, lowercased substring, 200 ms debounce, resets paging | 2418, 2429 | `lib/itemFilters.ts` | matches by code and by name | `CODE VERIFIED` |
| M5-08 | Filter `nop` — price falsy | 2430 | `lib/itemFilters.ts` | null and `0` both included | `CODE VERIFIED` |
| M5-09 | Filter `nomv` — absent from `byItem` | 2431 | `lib/itemFilters.ts` | all-cancelled item qualifies | `CODE VERIFIED` |
| M5-10 | Filter `dup` — own normaliser (lowercase; strip whitespace and `/ . , " ' -`); flags every code in a group > 1 | 2422-2426 | `lib/itemFilters.ts` | a pair `REF_EQ` treats differently; a pair `NORM` treats differently (R-F4) | `CODE VERIFIED` |
| M5-11 | The four segments are mutually exclusive | 2419 | `pages/NomenclaturePage.tsx` | selecting one clears the others | `CODE VERIFIED` |
| M5-12 | Empty/zero rendering: `—`, muted `0`, `.neg` on negative balance | 2441-2446 | `pages/NomenclaturePage.tsx` | null `unit`/`price` never render `null`/`NaN`/`0.00` (R-F3) | `CODE VERIFIED` |
| M5-13 | Footer `<n> mal` + `(bazada cəmi <N>)` **only** when filtered ≠ total | 2448-2450 | `pages/NomenclaturePage.tsx` | suffix present filtered, absent unfiltered | `CODE VERIFIED` |
| M5-17 | Column set and right-alignment | 2437 | `pages/NomenclaturePage.tsx` | header order, alignment | `CODE VERIFIED` |
| M5-18 | «Hamısını göstər»: first `SHOW_MAX = 3000`, sticky flag, exact footer note (Q3) | 1678-1690 | `pages/NomenclaturePage.tsx` | under/over 3000; flag persists | `CODE VERIFIED` |
| M5-16 | List controls live in the **store**, surviving navigation | M4-18 precedent | `store/nomenclature.store.ts` | controls survive unmount/remount | `CODE VERIFIED` |

### Formatting, print, export

| # | Function | Old ref | Planned React ref | Planned tests | Status |
|---|---|---|---|---|---|
| M5-14 | `nf(n,d)` — az-AZ locale, `—` for null/NaN (Q4) | 594-598 | `lib/format.ts` | separators, decimals, null/NaN | `CODE VERIFIED` |
| M5-15 | `money(n)` — `—` for null/NaN **and exactly 0** | 599 | `lib/format.ts` | the zero case explicitly | `CODE VERIFIED` |
| M5-19 | Print with the **non-empty** note `nf(rows.length) + ' mal'`, stamped at click (M4-18d) | 2451 | `pages/NomenclaturePage.tsx`, `components/PrintHead.tsx` | note reflects the filtered count; stamped at click | `CODE VERIFIED` |
| M5-20 | Excel export matching legacy output: header row, `price \|\| ''`, `b.val.toFixed(2)`, `{q:0,val:0}` fallback, filename `nomenklatura_<today>.xlsx` | 2452 | `lib/xls.ts`, `pages/NomenclaturePage.tsx` | exported matrix equals the legacy matrix for a fixture | `CODE VERIFIED` |
| M5-24 | `xls()` workbook shaping: column widths (first 400 rows), autofilter, freeze pane, 28-char sheet name | 1219-1236 | `lib/xls.ts` | width/autofilter/freeze arguments pinned (R-F7, A5) | `CODE VERIFIED` |

### Create and edit

| # | Function | Old ref | Planned React ref | Planned tests | Status |
|---|---|---|---|---|---|
| M5-25 | Code must match `^\d{7}$`; duplicate code rejected on create; readonly on edit | 5616-5618, 5576 | `lib/itemValidation.ts` | short/non-numeric/duplicate rejected | `CODE VERIFIED` |
| M5-26 | Name ≥ 3 characters | 5617 | `lib/itemValidation.ts` | boundary at 3 | `CODE VERIFIED` |
| M5-27 | Category **mandatory on create** when `canEditCategory()`; on **edit** empty is allowed and means NULL | 5620-5625 | `lib/itemValidation.ts` | create blocked, edit permitted | `CODE VERIFIED` |
| M5-28 | Unit required, and only from the reference directory — never free text | 5571-5573, 5621, 703 | `lib/itemValidation.ts` | a unit outside the directory is rejected | `CODE VERIFIED` |
| M5-29 | Create writes `items` and **fails unless exactly one row returns** | 1111-1117 | `api/itemWrite.api.ts` | zero-row insert surfaces as failure (R-F5) | `CODE VERIFIED` |
| M5-30 | Update sends a **partial** patch of provided keys only | 1119-1126 | `api/itemWrite.api.ts` | untouched fields absent from the patch | `CODE VERIFIED` |
| M5-31 | Update requires `.select('code')` returning exactly one row — **an RLS refusal reports no error while updating zero rows** | 1127-1131 | `api/itemWrite.api.ts` | `{data: [], error: null}` surfaces as failure, no success toast. **Verify it fails without the guard** (R-F5) | `CODE VERIFIED` |
| M5-32 | On failure the dialog stays open and success is never claimed | 5628-5630, 1145-1148 | `components/ItemFormDialog.tsx` | dialog open, error toast, no success message | `CODE VERIFIED` |
| M5-33 | `nextCode()` — max numeric code + 1, zero-padded to 7 | 5561-5564 | `lib/itemValidation.ts` | padding and max selection | `CODE VERIFIED` |
| M5-34 | Price input disabled without `price.edit` | 5583 | `components/ItemFormDialog.tsx` | non-admin sees it disabled | `CODE VERIFIED` |
| M5-35 | Similar-name warning while typing (≥ 4 normalised chars, up to 4 matches) | 5605-5610 | `components/ItemFormDialog.tsx` | appears above threshold, lists matches | `CODE VERIFIED` |
| M5-36 | Category suggestion is **advisory only** — never auto-selects or auto-saves | 5595-5602 | `components/ItemFormDialog.tsx` | suggestion applied only on explicit click | `CODE VERIFIED` |

### Bulk creation, imports

| # | Function | Old ref | Planned React ref | Planned tests | Status |
|---|---|---|---|---|---|
| M5-37 | Bulk parse: delimiter/heading detection, code padding, decimal comma, unit fallback `ədəd`, units restricted to the directory | 5639-5665 | `lib/bulkItemParse.ts` | each parse branch; a rejected out-of-directory unit | `CODE VERIFIED` |
| M5-38 | Bulk preview classifies rows `new`/`upd`/`sim`/`err`; only checked, non-error rows apply | 5749-5751 | `components/BulkItemsDialog.tsx` | error rows never sent | `CODE VERIFIED` |
| M5-39 | Bulk apply is a **sequential, non-atomic** loop (`emitMany`); a mid-run failure leaves earlier rows written | 5752-5760, 1155-1159 | `components/BulkItemsDialog.tsx` | mid-run failure reported honestly, not as a rollback (R-F6) | `CODE VERIFIED` |
| M5-40 | Item import accepts `.xlsx`/`.xls`/CSV/TSV/paste; first row may be a header | 6122-6171 | `components/ImportItemsDialog.tsx` | each input path previews identically | `CODE VERIFIED` |
| M5-41 | Import calls **`import_new_items`**; the server assigns codes | 6102 | `api/importNewItems.api.ts` | payload is `{name, unit}` only | `CODE VERIFIED` |
| M5-42 | Import creates **only new** items — never updates existing rows, and **never imports price** | 6126, 6100 | `api/importNewItems.api.ts` | existing item untouched; no price sent; `{created, skipped}` drives the toast | `CODE VERIFIED` |
| M5-43 | Category import is **Admin-only**, with an explicit refusal for everyone else | 5788 | `components/CategoryImportDialog.tsx` | non-admin refused and **no RPC issued** | `CODE VERIFIED` |
| M5-44 | CSV parsing handles quoted fields and doubled quotes | 5793, 5808-5822 | `lib/csv.ts` | quoted commas, escaped quotes | `CODE VERIFIED` |
| M5-45 | Leading zeros in codes preserved through parse and send | 5791 | `lib/csv.ts` | `0000001` stays `0000001` | `CODE VERIFIED` |
| M5-46 | Category import writes via **atomic `set_item_categories`** (all-or-none) after explicit confirmation; sends only `{code, category}` | 5891 | `api/setItemCategories.api.ts` | confirmation required; payload shape pinned | `CODE VERIFIED` |

### Item card and transitions

| # | Function | Old ref | Planned React ref | Planned tests | Status |
|---|---|---|---|---|---|
| M5-47 | Card opens from any `[data-card]` row | 1856-1858, 2442 | `pages/NomenclaturePage.tsx` | row click opens the card | `CODE VERIFIED` |
| M5-48 | Three KPIs: total balance (`.r/.g` by sign), `money(tot × price)`, movement count with first→last dates | 1873-1877 | `components/nomenclature/ItemCard.tsx` | negative total takes `.r`; zero value renders `—` | `CODE VERIFIED` |
| M5-49 | Per-warehouse balance table | 1879-1881 | `components/nomenclature/ItemCard.tsx` | one item across two warehouses | `CODE VERIFIED` |
| M5-50 | Price history shown **only when `obs.length > 1`**, sorted date-desc | 1882 | `components/nomenclature/ItemCard.tsx` | hidden at exactly 1 observation | `CODE VERIFIED` |
| M5-51 | Movement history sorted date-descending; unknown code renders `(nomenklaturada yoxdur)` | 1863-1864, 1884 | `components/nomenclature/ItemCard.tsx` | ordering; unknown-code text | `CODE VERIFIED` |
| M5-52 | After a successful edit, an open card on that code **re-renders** instead of closing | 5633 | `components/nomenclature/ItemCard.tsx` | card shows the new name without reopening | `CODE VERIFIED` |
| M5-53 | «Malı redaktə et» gated on `item.edit` | 1888-1889 | `components/nomenclature/ItemCard.tsx` | hidden without permission | `CODE VERIFIED` |
| M5-55 | **«Bu mal üzrə əməliyyat» — UNBLOCKED in Phase 7 H-4.** The button is enabled and the temporary tooltip is removed; clicking it calls the operation store's `prefill(code)` and THEN navigates to «Yeni əməliyyat», in that order (`prefillOp()`, 3452). Navigation alone is explicitly not parity: after the target page finishes loading the item, its unit, the balance panel and the applicable condition split are all populated. The prefill is held as a pending request so a page load or a refresh that cannot yet resolve the code does not discard it, and is consumed exactly once | 1888, 3452 | `components/nomenclature/ItemCard.tsx` + `App.tsx` + store `prefill()`/`consumePrefill()` | enabled with no deferral tooltip; prefill AND navigation both asserted; the complete populated transition pinned; the late-resolution race mutation-checked | `LIVE VERIFIED` (Phase 7 H-5) — live in TEST, Item Card → «Bu mal üzrə əməliyyat» opened the operation form prefilled with item `0000002`, its unit and the Test Anbar balance 1. The row is no longer `BLOCKED`. The late-resolution race and the condition-split half of the populated transition remain `CODE VERIFIED` only |

### Roles and navigation

| # | Function | Old ref | Planned React ref | Planned tests | Status |
|---|---|---|---|---|---|
| M5-21 | Add / bulk / import **disabled** (not hidden) without `item.add`; category import **hidden** unless `isAdmin()` — the disabled-vs-hidden distinction is real | 2455-2460 | `pages/NomenclaturePage.tsx` | each role sees the exact control set | `CODE VERIFIED` |
| M5-54 | Nav entry with **no role gate** — `nom` carries no `id`/`display:none`, like `log` | 256 | `App.tsx` | page renders for a non-admin | `CODE VERIFIED` |

### Cross-module dependency — `M5-55`, must not be closed by Phase 5

`prefillOp(code)` (index.html:3452) is **two** actions in one:
`OP.pick = code; go('op'); setTimeout(() => pickItem(code), 60)`. It navigates
to Yeni əməliyyat **and pre-fills the selected item into that screen's
in-memory operation form** (`OP.pick`, then `pickItem`).

**That second half is why an old-platform link cannot satisfy this row.** A
deep link into the legacy `op` screen would land the user on an empty form: the
selection lives in the old platform's in-memory `OP` state, not in a URL, so
the item the user clicked is lost in the transition. Substituting a link would
therefore be a silent behavioural regression, not a parity-preserving
workaround — which is precisely why Q5(c) was rejected.

**Phase 5 delivers the button visibly, disabled, with an explanatory tooltip
(Q5(a)).** `M5-55` stayed **`BLOCKED`** and could **not be marked complete,
`CODE VERIFIED` or `LIVE VERIFIED` until the Yeni əməliyyat phase was
implemented *and* live verified**, at which point the transition is wired to
the migrated screen and its item pre-fill is verified end to end.

**That condition is now met.** Phase 7 H-4 wired the transition and H-5
(2026-09-05) verified it live in the TEST project: Item Card → «Bu mal üzrə
əməliyyat» opened the operation form prefilled with item `0000002`, its unit
and the Test Anbar balance 1. The row is `LIVE VERIFIED`. Note that this closes
`M5-55` alone — **Phase 7 as a whole is NOT `ACCEPTED`**.

The Yeni əməliyyat phase must carry this row forward as an explicit entry
criterion.

### Deviations

**None.** `D-F1` (read-only scope) was **removed** on 2026-09-03 when the user
required full parity. No deviation is proposed for Module F.

`M5-55` is **not** a deviation: the legacy function is in scope and
acknowledged, its completion is sequenced behind a module that does not exist
yet, and it is tracked as `BLOCKED` rather than waived.

### Risks carried into implementation

| # | Risk | Handling |
|---|---|---|
| R-F1 | Payload size — live `items`/`movements` counts unknown (A1) | Plan task T1 measures them read-only before code |
| R-F2 | Rounding divergence from `toFixed(4)` then 2-decimal display | A test whose naive float sum differs from the original |
| R-F3 | Nullable `unit`/`price` rendering as `null`/`NaN`/`0.00` | Explicit null cases per column |
| R-F4 | **Three** distinct normalisers (`dup` 2422, `NORM` 5638, `REF_EQ`) | A test pinning a pair each treats differently |
| R-F5 | **Silent RLS refusal** — an UPDATE reports no error while changing zero rows | `.select()` + `length === 1` guards, with tests verified to fail without them. Highest severity in this phase |
| R-F6 | Bulk apply is non-atomic (`emitMany`) | Preserve it; never present it as transactional |
| R-F7 | **`xlsx@0.18.5` carries two high-severity advisories** (prototype pollution `< 0.19.3`, ReDoS `< 0.20.2`), both about PARSING a workbook — so the `.xlsx` **import** path is exposed; export is generation-only and is not | **ACCEPTED RISK, kept for parity — not assessed as safe.** Fixed builds exist only on SheetJS's own CDN; npm's newest published version is still 0.18.5, so `fixAvailable:false` is accurate for this channel. Full record, verification and reopening conditions: [`decisions/2026-09-03-xlsx-dependency-risk.md`](decisions/2026-09-03-xlsx-dependency-risk.md). Changing it is a platform-wide supply-chain decision needing explicit approval |
| R-F8 | This phase has real write paths | `VITE_ALLOW_LOCAL_WRITES` stays unset through coding and testing; writes exercised against mocks only |
| R-F9 | **Inherited:** `toNum` converts a zero-padded code, so `0000001` exports to Excel as the number `1`. The legacy implementation does the same | Preserved for parity and **pinned by a test** (`lib/xls.test.ts`) so it cannot change silently. A comment in `lib/xls.ts` previously claimed codes were protected here — corrected. Changing the behaviour alters the Excel output contract and needs its own decision under principles §7 |

### Relationship to the deferred visual backlog

`nf()` produces az-AZ thousands separators — the question already deferred as
**V-01**. Module F inherits it rather than creating a new one (Q4). **V-01…V-03
stay `DEFERRED`** and are not reopened by this phase.

---

## Phase 5 — deferred check carried forward (recorded 2026-09-04)

**CURRENT DECISION (2026-09-08): the print-preview check below is historical
and superseded as an acceptance requirement. `Çap` has never worked anywhere
in the platform; it is not a parity defect and cannot block Phase 5 or any
later phase. Do not mark print as verified, but do not wait for it either.**

**The user-visible Windows print-preview inspection of Nomenklatura «Çap» is
DEFERRED by explicit user decision, 2026-09-04. It does not block Phase 6.**

It is **NOT verified and must not be recorded as verified.** `M5-51` (print)
rests on DOM structure, CSS presence and call ordering only — the same standing
limitation Phase 4 carries for `M4-18b`/`M4-18d`. The «Çap» button stays
enabled and unchanged; nothing in Phase 6 touches it.

**`M5-55` remained `BLOCKED`** at the time of Phase 6 until Yeni əməliyyat was
migrated and live verified. Phase 6 neither touched nor unblocked it; it was
carried as an explicit Phase 7 entry criterion and closed there
(`LIVE VERIFIED`, H-5, 2026-09-05).

---

## Module G — Mal qrupları (Phase 6)

**Status: IMPLEMENTED 2026-09-04 — `CODE VERIFIED`.** Rows were merged as
`NOT STARTED` before implementation began (principles §10) and promoted only
after the checks below passed. Approved by the user the
same day (Q1, Q2, Q3), with a set of mandatory safety corrections recorded in
the proposal §7 and reproduced per row below.

**Not `ACCEPTED`.** No live verification has been performed. The read-only live
comparison, the `anbardar` scoping check, opening a **real generated workbook**
and exercising the refresh-failure abort all happen after Codex's independent
audit. Nothing below may be promoted to `LIVE VERIFIED` before that.

Documents:
[proposal](specs/2026-09-04-react-migration-phase6-item-groups-proposal.md) ·
[plan](plans/2026-09-04-react-migration-phase6-item-groups.md).
Behavioural reference: `origin/main:index.html`; every line number is that file.

**Automated checks: 974 tests in 61 files, typecheck, oxlint, build and
`git diff --check` all clean.** Baseline before implementation was 843 / 54,
re-run and confirmed at the start of the phase; this module adds 131 tests in
7 files and changed no Phase 1-5 behaviour.

### One divergence found during implementation, and corrected

**Export drop-count ordering.** `grpExport()` is synchronous after
`loadFromDB()`: it reads `GRP.sel`, counts `dropped`, exports, reports the
count, and only then calls `rGroups()` (index.html:2845-2850), so the
re-render that prunes the selection happens *after* the count exists.

React inverts that order — `refresh()` commits the new snapshot, the pruning
effect runs on the next render, and the resumed export then read a selection
that had already lost exactly the rows whose disappearance it was supposed to
report. «dropped» came out `0` every time. The selection is now snapshotted
*before* the refresh, restoring the original's read order. A test pins it
(`prunes rows that lost their positive balance and reports the exact count`)
and was verified to fail against the pre-fix code.

**This module has NO write path.** It reads, selects and exports.
`VITE_ALLOW_LOCAL_WRITES` was not touched and remains unset. No SQL, no RPC, no
Supabase change, no new import path, no SheetJS version change.

### Decisions applied to this module (Q1-Q3, 2026-09-04)

**Q1** — `created_at` is added to the existing movement query. Supabase returns
it as a **nullable string**, so it is converted with
`new Date(created_at).getTime()` and a `NaN`/`null` result is treated as
*unavailable* before the legacy date → timestamp → id comparison.
`Number.isFinite()` is never called on the raw string. **Q2** — the existing
page-scoped Realtime pattern is used for `items`, `movements` and `warehouses`;
no shell-wide sync refactor, no duplicate subscriptions, no `audit_log`.
**Q3** — the complete legacy screen is implemented.

### Read and derivation

| # | Function | Old behaviour | Old location | New location | Status |
|---|---|---|---|---|---|
| M6-01 | Screen shell | `p-grp` section: heading, subtitle, selection counter, export button, filter panel, table, pager | 354-361 | `pages/ItemGroupsPage.tsx` | CODE VERIFIED |
| M6-02 | Positive-balance source | Rows come from `IX.bal`; `b.q > 1e-9` only — zero and negative excluded | 2740 | `lib/groupFilters.ts` | CODE VERIFIED |
| M6-03 | Warehouse permission scope | `allowedWarehouses()`; `anbardar` sees only their own warehouse, **not** the source group | 715-718, 2741 | `lib/warehouseScope.ts` (ported) + `groupFilters` | CODE VERIFIED |
| M6-04 | Last-purchase price map | Global last valid `Satınalma` price per code; `items.price` is **not** a fallback | 739-750 | `lib/lastPurchase.ts` | CODE VERIFIED |
| M6-05 | Purchase tiebreak order | date → `created_at` (`ts`) → `id` | 727-738 | `lib/lastPurchase.ts` | CODE VERIFIED |
| M6-06 | Cancelled rows excluded | Source is `normalMovements()` | 739, 1270 | `lib/operationalMovements.ts` (ported) | CODE VERIFIED |
| M6-07 | Category resolution | `it.category` or the `CAT_UNSET` pseudo-category «Təyin edilməyib» | 653, 2744 | `lib/groupFilters.ts` | CODE VERIFIED |
| M6-08 | Row sort | `warehouse` then `name`, both `localeCompare(…, 'az')` | 2755 | `lib/groupFilters.ts` | CODE VERIFIED |
| M6-09 | Row cut | `cut(rows, 'grp')`, `SHOW_MAX = 3000`, sticky «Hamısını göstər» | 1678-1691, 2804 | `lib/showAllCut.ts` (ported) + store | CODE VERIFIED |
| M6-10 | Table columns | checkbox · Kod · Malın adı · Kateqoriya · Anbar · Miqdar + unit · Son alış qiyməti | 2805-2818 | `pages/ItemGroupsPage.tsx` | CODE VERIFIED |
| M6-11 | Priceless cell | `—` in a `muted` span when no last purchase price | 2816 | `pages/ItemGroupsPage.tsx` | CODE VERIFIED |
| M6-12 | Pager line | `<n> sətir (müsbət qalıq)` + the cut note | 2820 | `pages/ItemGroupsPage.tsx` | CODE VERIFIED |

### Filters

| # | Function | Old behaviour | Old location | New location | Status |
|---|---|---|---|---|---|
| M6-13 | Warehouse multi-select | Checkbox tags from `allowedWarehouses()`; OR within the filter; empty = no restriction | 2781, 2784 | store + page | CODE VERIFIED |
| M6-14 | Empty-warehouse state | «İcazəli anbar yoxdur» when the allowed list is empty | 2783 | page | CODE VERIFIED |
| M6-15 | Category multi-select | `CAT_UNSET` prepended to `categoryOptions()`; OR within the filter | 2785 | store + page | CODE VERIFIED |
| M6-16 | Min/Max price | Inclusive bounds; blank allowed | 2719-2726, 2747-2751 | `lib/groupFilters.ts` | CODE VERIFIED |
| M6-17 | Min/Max validation | Negative or non-finite rejected; Min > Max rejected; three exact messages | 2721-2725 | `lib/groupFilters.ts` | CODE VERIFIED |
| M6-18 | Validation blocks the screen | On a validation error the table shows «Süzgəc xətası» and the pager turns alarm-coloured; rows are not computed | 2795-2800 | page | CODE VERIFIED |
| M6-19 | Priceless excluded by a bound | An item with no last-purchase price is dropped when Min **or** Max is set — never treated as 0 | 2747-2748 | `lib/groupFilters.ts` | CODE VERIFIED |
| M6-20 | Text search | Case-insensitive over `code + ' ' + name`; ANDed with every other filter | 2753 | `lib/groupFilters.ts` | CODE VERIFIED |
| M6-21 | Debounce | 200 ms on the three text/number inputs | 2789-2791 | page | CODE VERIFIED |
| M6-22 | Reset | Clears every filter **and** the selection, and rebuilds the filter panel | 2792 | store + page | CODE VERIFIED |
| M6-23 | Filter-semantics hint | AND between filters, OR within one; bounds inclusive; priceless excluded; positive balances only | 2780 | page | CODE VERIFIED |

### Selection

| # | Function | Old behaviour | Old location | New location | Status |
|---|---|---|---|---|---|
| M6-24 | Selection key | `code + '\|' + warehouse` — the same item in two warehouses is two selections | 2802, 2808 | store | CODE VERIFIED |
| M6-25 | Pruning | Selections no longer in the visible set are dropped on every render | 2802-2803 | store | CODE VERIFIED |
| M6-26 | Selection counter | «<n> sətir seçilib» / «Sətir seçilməyib» | 2823-2824 | page | CODE VERIFIED |
| M6-27 | Export button gate | Disabled when nothing is selected | 2825, 2853 | page | CODE VERIFIED |

### Export

| # | Function | Old behaviour | Old location | New location | Status |
|---|---|---|---|---|---|
| M6-28 | Pre-export validation | Min/Max revalidated before anything happens; invalid → toast, no refresh, no export | 2828-2829 | page | CODE VERIFIED |
| M6-29 | Refresh before export | `loadFromDB()` immediately before writing; a **failed refresh aborts** and is never shown as zero balance | 2833-2841 | store `refresh()` + page | CODE VERIFIED |
| M6-30 | Two failure shapes | A thrown error and an `ok:false` result produce two distinct messages | 2834-2840 | `api/itemGroupsSnapshot.api.ts` + page | CODE VERIFIED |
| M6-31 | Snapshot instant | Stamp is taken **only after** a successful refresh | 2842 | page | CODE VERIFIED |
| M6-32 | Pruned rows | Selected rows that lost their positive balance are dropped and the count toasted; abort only when nothing remains | 2845-2850 | page | CODE VERIFIED |
| M6-33 | Workbook shape | Kod · Malın adı · Miqdar · Son alış qiyməti · Anbar · İxrac tarixi; `!cols` widths; sheet «Mal qrupları» | 2858-2878 | `lib/xlsGroups.ts` | CODE VERIFIED |
| M6-34 | Code as text | `{t:'s', z:'@'}` — leading zeros preserved. **Different from `toNum`/`R-F9`**; must not route through `xls()` | 2865 | `lib/xlsGroups.ts` | CODE VERIFIED |
| M6-35 | Missing price | **No cell is created** — the cell stays empty rather than 0 | 2868-2869 | `lib/xlsGroups.ts` | CODE VERIFIED |
| M6-36 | Export stamp | `toLocaleString('az-AZ', {timeZone:'Asia/Baku'})` of the snapshot instant, repeated on every row | 2857, 2871 | `lib/xlsGroups.ts` | CODE VERIFIED |
| M6-37 | Filename and toast | `mal_qruplari_<today>.xlsx`; toast reports the row count | 2879-2880 | `lib/xlsGroups.ts` | CODE VERIFIED |
| M6-38 | SheetJS absent | «Excel kitabxanası yüklənmədi», no download | 2856 | `lib/xlsGroups.ts` | CODE VERIFIED |

### Contract change

| # | Function | Old behaviour | Old location | New location | Status |
|---|---|---|---|---|---|
| M6-39 | `created_at` on `MovementRow` | The tiebreaker `m.ts` exists in the legacy `DB.movs`; the React read ordered by `created_at` but did not select it | 874, `api/itemMovements.api.ts` | `api/itemMovements.api.ts` | CODE VERIFIED — Q1 |
| M6-40 | Payload measurement | Phase 5's `T1` is recorded as pending with no counts | — | plan T1 | **NOT DONE** — needs the test environment; recorded honestly rather than claimed |

### Navigation

| # | Function | Old behaviour | Old location | New location | Status |
|---|---|---|---|---|---|
| M6-41 | Nav entry | «Mal qrupları» under «Bazalar»; no counter badge; no role gate in `go()` | 259, 1495-1512 | `App.tsx` | CODE VERIFIED |
| M6-42 | Realtime / sync indicator | Legacy has one global connection state; React's is page-scoped | 1162-1181 | `pages/ItemGroupsPage.tsx` | CODE VERIFIED — Q2 (contained; shell fix stays deferred) |

### Safety corrections required by the user (proposal §7)

Each is implemented and pinned by its own test.

| # | Correction | Where | Status |
|---|---|---|---|
| M6-S1 | Data loads on direct navigation to Mal qrupları straight after login — no dependency on visiting Nomenklatura first | `ItemGroupsPage` mount effect | CODE VERIFIED |
| M6-S2 | `useNomenclatureStore.load()` is **not** reused for refresh-before-export; a typed snapshot loader returns explicit success/failure | `api/itemGroupsSnapshot.api.ts` | CODE VERIFIED |
| M6-S3 | Refresh is **atomic** — any failed core read keeps the previous screen state, aborts the export and shows the real error | `store/itemGroups.store.ts` `refresh()` | CODE VERIFIED |
| M6-S4 | A failed **movements or items** read is fatal for this screen (unlike Nomenklatura, where movements are survivable) | `api/itemGroupsSnapshot.api.ts` | CODE VERIFIED |
| M6-S5 | Warehouse choices match legacy `DB.whs`: `active && type === 'anbar'` only, not every `fetchWarehouses()` row | `api/itemGroupsSnapshot.api.ts` | CODE VERIFIED |
| M6-S6 | `allowedWarehouses()` applied **after** that filtering; `anbardar` sees only their assigned warehouse | `lib/groupFilters.ts` + page | CODE VERIFIED |
| M6-S7 | `whLabel()` used only where the legacy screen uses it; raw stored values are not renamed elsewhere | page + `lib/xlsGroups.ts` | CODE VERIFIED |
| M6-S8 | Unknown item renders `(nomenklaturada yoxdur: <code>)`, never an empty name | `lib/groupFilters.ts` | CODE VERIFIED |
| M6-S9 | Last-purchase price never falls back to `items.price` | `lib/lastPurchase.ts` | CODE VERIFIED |
| M6-S10 | `created_at` converted via `new Date(...).getTime()`; `NaN`/`null` treated as unavailable; `Number.isFinite()` never applied to the raw string | `lib/lastPurchase.ts` | CODE VERIFIED |
| M6-S11 | Four-decimal balance rounding preserved before filtering and display | `lib/itemIndex.ts` (ported) + `groupFilters` | CODE VERIFIED |
| M6-S12 | Selections pruned against the **complete filtered result, before** the 3000-row cut | `store/itemGroups.store.ts` | CODE VERIFIED |
| M6-S13 | «Hamısını göstər» sticky across filtering, reset and navigation | `store/itemGroups.store.ts` | CODE VERIFIED |
| M6-S14 | Reset clears filters and selection without altering unrelated page state | `store/itemGroups.store.ts` | CODE VERIFIED |
| M6-S15 | Reference behaviour preserved: failed directory load → fallback list; loaded-but-empty active directory stays empty | `api/itemGroupsSnapshot.api.ts` | CODE VERIFIED |
| M6-S16 | No new import path; SheetJS version unchanged | — | CODE VERIFIED (verified constraint: nothing added) |
| M6-S17 | A failed INITIAL load shows an explicit load-error state and makes no empty-result or row-count claim; a failed refresh after a good snapshot still retains the rows and reports the error in the footer | `pages/ItemGroupsPage.tsx` | CODE VERIFIED — audit A01 |

### Deviations

**None.** Every legacy behaviour is ported as-is, including the six documented
in proposal §3.3 that could be mistaken for defects:

- the price column is the **last purchase price**, not `items.price`, so a row
  can show `—` here while Nomenklatura shows a price for the same item;
- a priceless item disappears when either Min or Max is set;
- «Süzgəcləri sıfırla» also clears the selection;
- export **prunes** lost rows rather than failing, aborting only when nothing
  remains;
- the sort is warehouse-then-name in `az`, not the value sort used elsewhere;
- selection is keyed per warehouse.

### Risks

| # | Risk | Handling |
|---|---|---|
| R-G1 | Widening `MovementRow` with `created_at` touches every Phase 5 consumer | Full suite run before and after; no consumer behaviour changed |
| R-G2 | Legacy `Number.isFinite(m.ts)` assumes a number; Supabase returns a nullable string | Explicit `new Date(...).getTime()` conversion; tests for null, malformed and valid values (Q1) |
| R-G3 | `R-F7` (`xlsx@0.18.5`, two high-severity **parsing** advisories) | Export is generation-only and unaffected. **No import path added.** `R-F7` is **not reopened** |
| R-G4 | Zero-padded codes in Excel | `xlsGroups` writes `{t:'s', z:'@'}` — deliberately different from `toNum`'s inherited `R-F9`; not routed through `xls()` |
| R-G5 | Refresh-before-export must abort on failure | Both failure shapes tested separately (the `M3-06a` lesson) |
| R-G6 | The `az-AZ` / `Asia/Baku` stamp is environment-sensitive | Timestamp injected; asserted against a fixed instant |
| R-G7 | Selection pruning is easy to lose in a React rewrite | Pinned by tests, including the before-the-cut case |
| R-G8 | `App.tsx` is still a minimal switch, not a router | One nav entry added; a router remains a separate decision |
| R-G9 | Reusing the Nomenklatura loader would export on a partial refresh | Separate typed snapshot loader; items **and** movements fatal |
| R-G10 | `fetchWarehouses()` returns locations too | Legacy `active && type === 'anbar'` filter applied first |
| R-G11 | Pruning against the rendered page would drop reachable selections | Pruned against the full filtered set, before the cut |

### Relationship to the deferred visual backlog

`nf()`'s az-AZ thousands separators are **V-01**, already deferred. Module G
inherits the question rather than creating a new one. **V-01…V-03 stay
`DEFERRED`** and are not reopened by this phase.

---

## Module H — Yeni əməliyyat (Phase 7)

**Status: INCOMPLETE, NOT `ACCEPTED`.** Implementation started 2026-09-04 and
has progressed through milestones H-1 to H-5. The full `M7-*` row-by-row
ledger (~135 rows) is **not duplicated here** — it lives in
[`specs/2026-09-04-phase7-registry-rows.md`](specs/2026-09-04-phase7-registry-rows.md),
which is the authoritative Module H status source; that row `Status` column,
not this summary, is what to check per row.

Documents:
[proposal](specs/2026-09-04-react-migration-phase7-new-operation-proposal.md) ·
[plan](plans/2026-09-04-react-migration-phase7-new-operation.md) ·
[Module H ledger](specs/2026-09-04-phase7-registry-rows.md) ·
[design audit](audits/2026-09-04-phase7-design-codex-audit.md) ·
[Phase 8 reconciliation: `M7-123` read 10](audits/2026-09-09-phase7-m7-123-read10-live-measurement.md) ·
[Phase 8 reconciliation: fixture preconditions](audits/2026-09-09-phase7-fixture-precondition-reconciliation.md) ·
[Codex review of M7-123](audits/2026-09-09-phase7-m7-123-codex-review.md) ·
[read-only UI sweep M7-18/M7-22/M7-116](audits/2026-09-09-phase7-m7-18-m7-22-m7-116-readonly-ui-sweep.md) ·
[Codex focus finding](audits/2026-09-09-phase7-m7-22-focus-codex-finding.md) ·
[focus-parity remediation](audits/2026-09-09-phase7-m7-22-m7-39-focus-parity-remediation.md).

**Phase 8 reconciliation (2026-09-09).** Phase 8 evidence was reconciled against
the Module H ledger. **`M7-123` is CLOSED** — read 10 `get_stock_layers` was
measured read-only (709 B / 394 B gzip / 1 request, 2-layer payload), because
Phase 8's accepted cutover already left layer accounting active in TEST, so the
setup write the plan budgeted was not needed. **No other Phase 7 row is
promoted:** Phase 8 exercised `M8-*` movements-screen contracts, not Phase 7
«Yeni əməliyyat» posting-path contracts, and adjacency is not evidence.
Separately, **H-5's fixture blocker is retracted as stale** — TEST now has active
layers, 125 movements, `stock_conditions`, anbardar and rehber users and a second
`anbar` warehouse; only `partners` = 0 survives. Those rows are open because their
contracts were not executed, not because they cannot be run. Phase 7 is still
**NOT `ACCEPTED`**, pending its own independent Codex audit.

**Read-only real-UI sweep (2026-09-09).** After Codex accepted the `M7-123`
closure, a zero-mutation sweep through the real React UI in TEST promoted
**`M7-18`** (unit tracked the nomenclature across an ədəd→kg→metr control and is
non-editable text) and **`M7-116`** (the real in-page action navigated Mal
hərəkəti → Yeni əməliyyat with no prefill, no edit mode, no submission, and a
byte-identical movements snapshot; a negative control confirmed the assertions do
detect the `M5-55` prefill) to `LIVE VERIFIED`. **`M7-22`** advanced
`NOT STARTED` → `IN PROGRESS`: five of six sub-assertions live verified,
including price-only-when-empty and the live condition split
(`İCARƏDƏ (MAX 0.01)`). The sweep found **an unrecorded parity gap** — the
quantity-focus rule of legacy `index.html:3400` was implemented in neither branch
(no `.focus()`/`autoFocus` anywhere in `web/src`, no `keep` parameter), and
`commitDraftLine`'s item-search refocus (3669) likewise. Audit:
[read-only UI sweep](audits/2026-09-09-phase7-m7-18-m7-22-m7-116-readonly-ui-sweep.md).

**Focus-parity remediation (2026-09-09).** Codex confirmed the defect and it was
fixed the same day using element refs plus transition-scoped one-shot state (no
global DOM selectors): quantity focus is armed only by an explicit pick or the
M5-55 prefill and applied only when no split exists. **10 focused tests added, 4
verified to fail against the pre-fix code**; full suite 126 files / **2718**
tests, typecheck, oxlint, sandbox build and `git diff --check` clean; the three
behaviours re-verified read-only in the real browser with zero TEST mutations.
**`M7-22` is now `LIVE VERIFIED` (complete)**. Audit:
[focus-parity remediation](audits/2026-09-09-phase7-m7-22-m7-39-focus-parity-remediation.md).

**M7-39 commit signal and field clearing (2026-09-10).** Two successive Codex
audits corrected this row; the superseded text is retained here as history.

- *Superseded:* item-search focus was originally described as driven by **the
  committed-line count (`lines.length`) growing**. Codex rejected that: the real
  page mounts with `lines = []` and only then does `restoreDraftOnBoot()` replace
  them from localStorage, so a post-mount 0→N growth is a RESTORE, not a commit.
- *Accepted:* focus is now driven by an **explicit monotonic `commitSignal`**
  owned by `NewOperationPage` and advanced at exactly the two points where a
  single line reaches `addLineRaw` — the ordinary commit and a **confirmed**
  `LayerPickDialog` return. Restore, bulk application, edit hydration, refresh,
  removal/clearing and an opened-but-unconfirmed dialog never advance it, so
  they are excluded by construction rather than by heuristic.
- *Superseded:* the live audit observed header «Qiymət» retaining `10` after a
  commit and recorded it as **“retained by design”**. That was **wrong** —
  legacy `commitDraftLine()` runs `$('#o-price').value = ''`
  (`index.html:3668`) and M7-39 requires clearing `pick/qty/unit/split/price`.
- *Accepted:* the commit-signal effect is the **single post-commit transition**
  and now clears search query, quantity, condition split, line error/warning and
  the inbound header price before focusing item search — on both the ordinary
  and the confirmed-dialog route. Clearing lives in the effect, not at the
  `onCommitLine()` call site, because the dialog route leaves the component
  entirely; nulling `pick` there only UNMOUNTS the quantity/split controls while
  their local state survives, so a later pick would resurrect stale values.
  **Hidden is not cleared.** All other header fields (date, warehouse, type,
  destination, partner, channel, contract, invoice, note) are preserved.
- **4 further focused tests added, 3 verified to FAIL against the pre-fix tree**
  (retained price on the ordinary route; retained price with unrelated headers
  intact; quantity `7` resurrected after a confirmed layer commit and a second
  pick). Focused 143/143, full suite 126 files / **2723** tests, typecheck,
  oxlint, sandbox build and `git diff --check` clean.

**Codex live correction (2026-09-10).** The credential/tool boundary no longer
applies: Codex authenticated on the real TEST localhost and independently
verified both post-commit routes. An ordinary inbound local commit cleared the
seeded price, pick, quantity and unit and refocused item search. A confirmed
active-layer outbound local commit cleared quantity/split and refocused search;
selecting the item again showed a fresh empty quantity, so stale `0.01` did not
resurrect. The final document-post action was never invoked, and the TEST device
session was closed through «Çıxış».

**M7-39 request-key attempt — Codex correction (2026-09-10).** Field clearing
and refocus remain live-verified by the independent Codex audit. The later
request-key run was safely contained on an
owner-authorised temporary write-enabled TEST origin (`:5176`, flag set in the
process environment only — no environment file was edited, and the read-only
`:5175` server was preserved) under fail-closed interception: a real confirmed
post captured `p_request_key` **K1**; an unchanged retry reused **K1 exactly**
— the positive control proving the harness can observe a STABLE key, which is
valuable evidence.

However, Codex rejected the load-bearing **`K2 != K_MID`** attribution. TEST
stock forced removal of the sole line, and `removeLine` independently clears
the key. With zero lines the document cannot post and K_MID cannot be captured;
rebuilding it is already a commit, while another K2 requires another line or
state change that the current one-bucket fixture cannot supply without a
second invalidator. Therefore the run did not isolate `commitDraftLine` as the
only cause of the changed key.

Containment: four `post_layer_movement_document` calls aborted at the router,
**zero reached TEST**, zero production contact, session ended through the real
«Çıxış» flow, and the TEST baseline (3 movement rows, identical first row) was
byte-identical before and after. Audits:
[commit-signal remediation](audits/2026-09-09-phase7-m7-39-commit-signal-remediation.md),
[Codex audit](audits/2026-09-10-phase7-commit-signal-codex-audit.md),
[Codex re-audit](audits/2026-09-10-phase7-commit-signal-codex-reaudit.md),
[field-clearing Codex audit](audits/2026-09-10-phase7-m7-39-field-clearing-codex-audit.md),
[request-key live attempt](audits/2026-09-10-phase7-m7-39-request-key-live.md),
[Codex evidence-defect audit](audits/2026-09-10-phase7-m7-39-request-key-codex-audit.md).

**M7-39 request-key CORRECTION (2026-09-10) — `M7-39` is now
`LIVE VERIFIED`.** The corrective rerun was executed exactly as Codex
prescribed, with two **simultaneously postable** outbound lines so that no
removal was needed between the captured keys.

A minimal supported TEST-only fixture supplied the second postable item: a
`0.01` inbound receipt of `0000002` into Test Anbar (doc `SND-BAE2EF3FBF`,
movement `fbcd736d…`), created through the real UI as the run's only
intentional write.

- **K1** `88c6dd88…` captured from a real intercepted layer post;
- unchanged retry reused **K1 exactly** — the stability control;
- **line B committed while line A still stood** (draft rows 1 → 2) with every
  header field byte-identical;
- **K2** `021f1b9e…` ≠ K1.

**Causal isolation:** the recorded action trail between the two captures holds
only item search, local quantity entry, the layer read and line B's real
`addLineRaw` commit — asserted against a forbidden-action pattern
(remove/edit/header/tab/clear/restore/bulk) which matched nothing. Item search,
quantity entry and layer reads do not touch `requestKey`, so line B's commit is
the only invalidator in the window.

**Containment and rollback:** three `post_layer_movement_document` calls
aborted, **zero reached TEST**, zero production contact. The fixture was closed
net-zero through the real «Sətri ləğv et» flow (`cancel_layer_movement_row`,
reversal `b960da62…`, `historical_layers: "exact"`): item `0000002` returned to
exactly zero, visible movements back to the identical 3 baseline rows, immutable
history retained (original not deleted; count growth explained solely by fixture
+ reversal), no negative balances. Read-only `:5175` restored and
`.env.sandbox.local` unchanged. Audit:
[request-key correction](audits/2026-09-10-phase7-m7-39-request-key-correction.md).

**Independent Codex acceptance.** The corrected two-line causal isolation is
valid: `setPick`, local quantity entry and layer reads do not clear
`requestKey`; line A remained, headers were byte-identical, and line B's
`addLineRaw` was the only invalidator between K1 and K2. The fixture closed
net-zero with immutable history retained. **M7-39 is LIVE VERIFIED.** Audit:
[corrected-run Codex audit](audits/2026-09-10-phase7-m7-39-correction-m7-38-split-codex-audit.md).

**M7-38 reconciliation (2026-09-10).** The ledger row said `NOT STARTED` while
the 2026-09-09 audit reported live evidence; the contradiction is resolved by
recording only the branch actually exercised. `M7-38` is **`IN PROGRESS`
(narrow)**: with layer accounting ACTIVE, an outbound single line routed through
`POST rpc/get_stock_layers`, `LayerPickDialog` OPENED, the draft was **not**
appended before confirmation, and an «İmtina» close left rows at 0 — i.e. the
**outbound active-layer single-line dialog-routing and unconfirmed-close branch
only**.

**M7-38 second branch (2026-09-10) — failed `get_stock_layers` refusal, LIVE.**
On the read-only origin, a 503 was injected over a WINDOW (a one-shot would
disarm on StrictMode's first of two reads) and the failure was **proven
observed**. Result: no `LayerPickDialog` opened, no draft line was appended, the
exact refusal «Partiyalar yüklənmədi: …» surfaced as an error toast
(`.toast.bad`), and after disarming, the identical action opened the dialog —
proving the refusal came from the injected failure. Baseline unchanged (3
movement rows), zero mutations attempted, zero production contact. Audit:
[M7-38 layer-read failure](audits/2026-09-10-phase7-m7-38-layer-read-failure-live.md).

**M7-38 split-guard measurement (2026-09-10) — PARTIAL after Codex review.**
Positive overflow is clamped to the bucket maximum and a non-positive total
disables the add button. But `Math.min(value,max)` has no lower bound: a small
negative in a max-0 bucket plus positive `0.01` İcarədə leaves total quantity
positive and can reach `condSplitCheck`'s exact negative refusal. That leg was
not tested, so the claim that all three messages are unreachable is rejected.
Audits:
[M7-38 split-guard chain](audits/2026-09-10-phase7-m7-38-split-guard-chain-live.md).
[Codex review](audits/2026-09-10-phase7-m7-39-correction-m7-38-split-codex-audit.md).

**M7-38 negative split + inbound non-routing (2026-09-10) — both CLOSED, live.**
Codex's hypothesis was confirmed exactly. With `Yararsız = -0.001` (stored
intact — `Math.min` bounds only the upper side) and `İcarədə = +0.01`, the
derived total was **`0.009`**, «Sətri əlavə et» was **ENABLED**, and the real
click produced the exact refusal **«Yararsız: miqdar mənfi ola bilməz»** with
**0** `get_stock_layers`, no `LayerPickDialog` and no draft row. The healthy
control (Yararsız back to `0`, İcarədə `0.01`) then **did** reach the layer read
and open the dialog, closed via «İmtina» at 0 rows. In the same session the
**inbound non-routing** branch completed: «Mədaxil» renders no split, the line
appends directly 0→1 with **0** `get_stock_layers` and no dialog. Zero
mutations, zero production contact, «Sənədi qeyd et» never pressed. Audit:
[negative split + inbound](audits/2026-09-10-phase7-m7-38-negative-split-inbound-live.md).

**`validateOpLine` clamp/`warn` — NOT claimed, measured UNREACHABLE read-only.**
The clamp only applies when `showSplit` is false (with a split active the same
condition becomes an outright rejection, M7-31). A live enumeration of both TEST
warehouses found `TEST Mal 1 (0000001)` to be the **only** outbound-eligible
item, and it always renders a split because İcarədə `0.01` makes
`condBuckets().marked` true (`condSplit.ts:73-76`). Reaching the clamp would
require inventing accounting state, which is out of scope.

The `validateOpLine` clamp/`warn` surface and the **inactive-layer branch**
(needs layer deactivation, out of scope) are **still not** claimed, so `M7-38`
remains `IN PROGRESS` rather than `LIVE VERIFIED`.

**Summary of where H-5 left it (2026-09-05):**

- **Partial live verification only, in the isolated TEST project
  `alkjjbaawmsirsfvqljm`**, covering the inbound `Satınalma` path, the Qaimə №
  duplicate block, the duplicate-submit reality, item creation and the
  `M5-55` entry point.
- **`M7-120` (ordinary movement-INSERT audit consequence) is `LIVE VERIFIED`**
  after a follow-up read-only RLS inspection explained the initially empty
  Audit jurnalı result (live policy `p_audit_read` filtering the `admin`
  account, not a missing trigger or a write-path defect).
- **Still `OPEN`/untested:** `correct_document`'s explicit audit row,
  İcarə/`log_icare_exposure`, transfers, layers, anbardar scoping, the stale
  re-check (`M7-96`) and the `M7-S2` broken-read check. `M7-S3` is now
  `LIVE VERIFIED` for the TEST failure-and-recovery path (2026-09-05). *(These
  remain open after the 2026-09-09 reconciliation — the fixtures now exist, but
  the contracts were not executed.)*
- **Phase 7 / Module H is INCOMPLETE and NOT `ACCEPTED`** as a whole; no
  production, schema, RPC, GitHub, Vercel or root `index.html` action has
  occurred.

See the ledger file for the complete per-row status and evidence trail.

## Module I — «Mal hərəkəti», document inspection and cancellation (Phase 8)

**Status: `ACCEPTED` (2026-09-09) for the owner-approved active-layer TEST
scope after the mandatory independent Codex audit.** Inactive-layer M8-39/M8-46
branches and M8-29's historical layer-legacy transfer success remain explicit
scoped exclusions, not claimed live passes. See the
[owner decision](decisions/2026-09-09-phase8-active-layer-and-legacy-scope.md)
and [final Codex audit](audits/2026-09-09-phase8-final-codex-acceptance.md).
Registry rows were created before implementation, as principles
§10 requires. The full `M8-*` row-by-row ledger (54 rows) is **not duplicated
here** — it lives in
[`specs/2026-09-05-phase8-registry-rows.md`](specs/2026-09-05-phase8-registry-rows.md),
which is the authoritative Module I status source; that row `Status` column,
not this summary, is what to check per row.

Documents:
[proposal](specs/2026-09-05-react-migration-phase8-movements-proposal.md) ·
[Module I ledger](specs/2026-09-05-phase8-registry-rows.md).

- **Module I is ONE acceptance boundary.** No milestone is `ACCEPTED` alone.
- **I-1 (2026-09-05)** delivered the read-only pure-logic foundation only:
  `lib/movementKey.ts`, `lib/documentCancelState.ts`,
  `lib/movementFilters.ts`, and the `contract_num` / `created_by` widening of
  the explicit `movements` column list.
- **I-2 (2026-09-06)** delivered the read-only «Mal hərəkəti» SCREEN: the rail
  entry in the legacy position, the page shell, the 15-column table, the
  filters and grouped İstiqamət select, sort, the 3000-row soft cap, the KPI
  line, the realtime subscription, the `writeoff_valuations` read and
  `movementValuation()`, plus monotonic request sequencing and snapshot
  retention on a failed refresh. Sixteen further rows are now `CODE VERIFIED`;
  see the ledger for the per-row detail.
- **I-2 Codex audit corrections (2026-09-06).** Two findings were confirmed
  against primary evidence and fixed; neither is a new feature and no
  milestone status changes.
  1. **The four-read snapshot was not atomic.** A failed `writeoff_valuations`
     read was treated as a degraded SUCCESS (`ok: true`, empty `valuations`,
     `valuationsReady: false`). The store cannot distinguish that from a real
     empty result, so it replaced a good valuation map with an empty one and
     existing `Silinmə` rows silently re-rendered at a different fallback
     amount after one transient network failure — a breach of the
     atomic-snapshot contract and of `M8-45`. **All four reads are now fatal**,
     so a failed refresh retains the previous snapshot WHOLE, valuation rows
     and displayed amounts included. A read that SUCCEEDS with zero rows
     remains valid and uses the legacy per-row fallback. `valuationsReady` and
     the degraded-value warning are removed, and
     `api/movementsSnapshot.api.test.ts` now covers the returned error, the
     rejected request, the successful-empty set and valuation-map retention.
     **This path must no longer be described anywhere as an accepted degraded
     success.**
  2. **«Qeyd edən» did not match final legacy behaviour.** The cell rendered
     the INTERMEDIATE mapping `created_by || 'sistem'` (`index.html:943`),
     which can put a raw UUID on screen. It now renders the FINAL mapping
     (`index.html:990`) via the pure `lib/recorderLabel.ts`: «Excel idxalı» for
     a missing recorder, the `get_user_directory()` email for a known id, the
     current user's name for their own id absent from the directory, and
     «digər istifadəçi» otherwise. The directory is the one App.tsx already
     warms at boot, so the screen adds **no** RPC and remains a four-read
     screen.
- **I-3 (2026-09-06)** delivered the READ-ONLY document inspection layer:
  «Baxış» is now enabled and opens `components/movements/DocumentViewDialog.tsx`
  through the pure four-way dispatcher in `lib/documentView.ts` — transfer
  document, legacy transfer, ordinary document, legacy ordinary, plus the
  legacy immutable-record refusal for an unsupported type. The read-only
  portions of `M8-15` … `M8-22` are `CODE VERIFIED`; the ACTION portions of
  `M8-16` … `M8-19` stay open and are named row by row in the ledger. The page
  stores only the selected movement ID and recomputes the dialog from the
  current rows on every render, so a realtime refresh cannot leave stale copied
  data on screen.
- **Two I-3 parity defects were corrected (2026-09-06, after the I-3 close).**
  (1) `doc_num` was trimmed before the dispatcher's truthiness test and in
  document grouping; legacy maps `r.doc_num || ''` (`index.html:943`) and
  compares exactly, so a whitespace-only number is TRUTHY and opens a document
  view, and rows group by exact equality. The value is now retained untrimmed
  for the dispatcher, the header number and the grouping filter, with `null`
  and `''` still doc-less. (2) The transfer header counted the rendered preview,
  showing «1 sətir» for a two-leg transfer; legacy prints `rows.length`, the
  post-strip document rows, while the preview is outbound-only
  (`index.html:5211-5217, 5238`). `DocumentView.headerLineCount` now carries the
  header count separately from `lines`, so a two-leg transfer reads «2 sətir»
  while rendering the item once. Both are covered by mutation-checked tests;
  full suite **1952 / 104**. No I-4 work and no new control was added.
- **I-4 (2026-09-06)** delivered DOCUMENT CANCELLATION: the action half of the
  four views. `api/documentCancel.api.ts` carries thirteen typed RPC functions —
  ordinary, transfer, single-row, item replacement, both doc-less legacy
  families and the two batch wrappers — each written out separately with its own
  literal argument object, never through a generic family helper. Every one
  consults `blockedReason()` BEFORE Supabase, never throws, and passes the
  server's Azerbaijani refusal text through verbatim. `M8-24` … `M8-29`,
  `M8-48` and `M8-49` are `CODE VERIFIED`. Layer routing follows the live
  `stock_layers_supported()` flag, and the argument name follows the CHOSEN
  RPC, never the family.
- **I-4 AUDIT CORRECTIONS (2026-09-07).** Four findings were validated against
  primary evidence; three were confirmed and fixed, and the fourth was
  confirmed as a symptom but its stated cause was DISPROVED by measurement.
  (1) The two per-row actions are now separate gates: a doc-less legacy
  ordinary record offers «Malı əvəz et» and whole-record cancellation but
  never «Sətri ləğv et», matching `legacyCancelView()` (`index.html:5264-5275`)
  rather than `documentCancelView()`. (2) `CancelRowDialog` and
  `ReplaceItemDialog` now re-evaluate the COMPLETE eligibility — document
  status, `lotDoc`, family, row marker and CURRENT admin — immediately before
  the API call, instead of the row-local half only; nothing is captured when
  the child opens. (3) Cancellation writes are FAIL-CLOSED on layer
  capability: `layerReady` is retained separately from `layerActive`, an
  unanswered probe selects NO write family and shows an honest retry, and a
  failed refresh probe preserves a previously known capability. This is a
  documented safety deviation from the legacy degraded fallback
  (`index.html:949-975`) affecting only the uncertain/error state. (4) The
  `SHOW_MAX` expansion test no longer times out: the cost was a single
  `getByRole` accessibility walk in the TEST (~96 s at 3001 rows), not the
  O(n²) `cancelledDocFor()` the audit proposed (223 ms over the same set), so
  no cancellation index was introduced and the pure helper remains the single
  source of truth, now pinned by per-family equivalence tests. `SHOW_MAX`, the
  3001-row assertion and the 240 s budget are all unchanged.
  Full suite **2110 / 2110 passed, 108 / 108 files, exit code 0**; focused 321
  tests across the eight affected files. Three correction mutants, three
  caught (4, 12 and 5 failures respectively).
- **Deviation `D-I1` is APPROVED and APPLIED (2026-09-06).** A read-only
  catalogue query against TEST `alkjjbaawmsirsfvqljm` found all thirteen RPCs
  (`jsonb`, `SECURITY DEFINER`) and confirmed that the transfer variants take
  DIFFERENT argument names: `cancel_transfer_document` declares
  `p_original_doc_num`, `cancel_layer_transfer_document` declares `p_doc_num`.
  Legacy sends `p_original_doc_num` to both (`index.html:5250-5251`), which
  cannot bind against the live layer function. Each RPC now receives the names
  its own signature declares — an approved migration deviation, mutation-checked
  in both directions. This is signature evidence only: no RPC was executed.
- **Decision `D4` is RESOLVED as INCLUDED (2026-09-06).** Item replacement
  ships with the legacy conditions preserved exactly (`index.html:5023`): none
  for transfers, for a reversal or already-cancelled document, for a separately
  cancelled or replaced row, or for any `lotDoc` document.
- **No correction, edit or batch-selection control exists** (I-5, I-6).
  `document_edit_impact()` has no caller, there is no edit-mode transition, no
  batch cancellation UI (the two batch RPC wrappers exist and are tested, but
  nothing drives them) and no Excel/print affordance. Decisions `D1`, `D3` and
  `D5` remain unresolved.
- **No live Supabase read or write from the React app, no SQL, schema, RLS,
  trigger or fixture change, no commit and no deployment has occurred** in any
  of the four milestones. Supabase is mocked at the API boundary in every test,
  and no cancellation RPC has been executed against any project.
- **`D2` is RESOLVED** (2026-09-06) as recommendation (b): Codex read the live
  `movements` SELECT policy read-only on TEST, and the client adds **no**
  anbardar warehouse filter. The SERVER scopes an anbardar's rows; the React
  client does not, and must not be described as doing so (`M8-42`).
- **The READ half of R2 is resolved, and `M8-51` is now LIVE VERIFIED
  (2026-09-09).** The live column set and SELECT policy of
  `writeoff_valuations` were first confirmed read-only on TEST in I-2; a
  read-only browser pass then captured the real request and a **populated**
  response together — column-explicit (7 named columns, not `select=*`), in the
  `COLUMNS` order, `order=movement_id.asc` before the range, HTTP 200, **3
  rows**, returned keys mapping 1:1 onto `WriteoffValuationRow`. The SELECT
  policy is now proved **behaviourally** as well as textually: a second
  `anbardar` leg received **2** of the 3 rows, the withheld one being exactly
  the row whose parent movement lies outside the anbardar warehouse scope, with
  no client-side warehouse filter in the request (`D2` / `M8-42`). This
  authorises **no write** to that table. See
  [`audits/2026-09-09-phase8-m8-51-writeoff-valuations-read-contract.md`](audits/2026-09-09-phase8-m8-51-writeoff-valuations-read-contract.md).
- **Decisions `D1`, `D3` and `D5` remain undecided** and are not resolved in
  code. No export, print, batch-cancel or correction affordance is rendered.
- **Module I export evidence, scoped (2026-09-07).** TWO export rows carry
  narrowly scoped live evidence, both **PARTIALLY LIVE VERIFIED**, neither
  `LIVE VERIFIED`. A previous version of this bullet called `M8-50b` the ONLY
  Module I row with live evidence; **that was wrong and is withdrawn** — the
  ordinary Excel export was exercised live FIRST, and other Module I rows rest
  on earlier read-only live evidence of their own (for example the `D-I1` RPC
  signature catalogue read and the `D2` / `M8-51` policy and column-set reads,
  each read-only and none of them an executed RPC).
  - **Ordinary Excel export (`M8-50`, part a)** — TEST, admin, the five-row
    existing dataset: real-button download, 15 headers over A1:O6, KPI
    reconciliation, the inherited `toNum` code conversion observed live, a
    header-only workbook from a zero-match search, and native Excel
    readability/no-repair PASS on **user-executed, screenshot-supported**
    observation. A 2026-09-08 TEST follow-up downloaded the same five visible
    rows through a fresh `anbardar`; the 20,034-byte A1:O6 workbook was
    byte-identical to the admin artifact. See
    [`audits/2026-09-07-phase8-i8-readonly-export-codex.md`](audits/2026-09-07-phase8-i8-readonly-export-codex.md)
    and
    [`audits/2026-09-08-phase8-anbardar-writeoff-export-live-check.md`](audits/2026-09-08-phase8-anbardar-writeoff-export-live-check.md).
  - **Silinmə report (`M8-50b`)** — TEST, admin, one existing row: real-button
    download, the ACTUAL workbook inspected read-only, an empty-result filter
    that refused and wrote no file, and native Excel readability/no-repair PASS
    on **user-operated** observation. A 2026-09-08 follow-up also exercised a
    fresh `anbardar` assigned to `Test Anbar`: the action rendered/enabled, the
    one visible Silinmə row downloaded, and the 18,113-byte workbook was
    byte-identical to the admin artifact. This is observed visibility and
    download evidence, not a complete allowed/denied RLS proof. See
    [`audits/2026-09-07-phase8-i9-live-export-attempt.md`](audits/2026-09-07-phase8-i9-live-export-attempt.md)
    and
    [`audits/2026-09-08-phase8-anbardar-writeoff-export-live-check.md`](audits/2026-09-08-phase8-anbardar-writeoff-export-live-check.md)
    and «Milestone I-9» in the ledger.

  Not promoted by either: the stored non-null Silinmə valuation branch,
  populated source-lot sheets,
  `rehber` and ordinary Excel under non-admin, the >3000-row cap and pagination/volume, allocation
  schema/RLS, and concurrency/refresh-abort paths — all still CODE VERIFIED
  only. **This bullet also supersedes the stale statement above that no export
  affordance is rendered:** «Excel» (I-7), «Qrup üzrə ləğv» (I-5) and «Silinmə
  hesabatı» (I-9) now render. «Çap» does not, which is the accepted
  non-functional baseline and not a blocker. The I-1…I-4 bullets above remain
  the record of those milestones and are not restated for I-5 … I-9 here — the
  ledger is authoritative per row.
- **No Module I row is `LIVE VERIFIED`.** The two rows above are partial and narrowly scoped; the live gate is I-8, and
  **Phase 8 is NOT ACCEPTED.**
- **Phase 8 changes no Phase 7 status.** `M7-109`'s caller now exists and is
  CODE VERIFIED through I-6, but its required live correction evidence remains
  open. Live scenario `S-6` (BLOCKED) stays distinct from registry row `M7-S6`
  (`CODE VERIFIED`).

**2026-09-09 M8-14 → LIVE VERIFIED (real TEST `postgres_changes` event).**
A read-only observer on «Mal hərəkəti» (5175, writes disabled) proved the
channel reached `system/ok` «Subscribed to PostgreSQL» with the app's own
`sinxron` indicator. A SEPARATE authenticated writer on a temporary
write-enabled process (5176) posted an exact-layer 0.01 transfer through ONE
supported RPC `post_layer_transfer_document` → `SND-8DC5E59E8D`; its two legs
produced **two real `postgres_changes` INSERTs at the same millisecond**
carrying exactly the ids the RPC returned. The observer then recorded **no**
movements request before the debounce and **exactly one** logical refresh
**439 ms after the last event** — two events coalesced into one refresh.
StrictMode is accounted for (the debounced refresh fires from a `setTimeout`
outside the mount cycle and is not doubled). Both legs became visible with no
manual refresh; heading/registry/indicator state stayed intact. Closed via the
real «Yerdəyişməni ləğv et» → `cancel_layer_transfer_document` →
`SND-R-2550716DCD`; balances, exact layer `fcb7f7b1…` and layer version 36
returned to baseline. 0 production contact.
[Evidence](audits/2026-09-09-phase8-m8-14-realtime-debounce-live-check.md).

**2026-09-09 M8-44 realtime-path exclusion CLOSED.** This supersedes the
"not claimed: … interleaving via the realtime refresh path" limit recorded
above. A real INSERT drove a genuine debounced realtime `load()` whose response
was HELD; a newer load (navigation remount) settled first; releasing the stale
reply with the marker in the DISPLAYED `partner` column of all 120 rows left it
**invisible**, while the POSITIVE CONTROL released the identical payload as the
NEWEST load and DID render it. Browser-only interception — nothing synthetic was
stored in TEST. **Two earlier executions were rejected rather than reported**
(one used «Sıfırla», which issues no read at all; one marked only the first
positive-control response and was unfalsifiable). Fixtures net-zero.
[Evidence](audits/2026-09-09-phase8-m8-44-realtime-path-stale-interleaving.md).

**2026-09-09 M8-39 / M8-46 correction+replacement → SATISFIED-BY-GATE, not
OPEN.** `canEditDocument()` refuses `layer-active` (`documentEdit.ts:105`) and
`mayReplace = layerReady && !layerActive` (`DocumentViewDialog.tsx:196`,
because `replace_movement_item` has no layer variant), so with layers active
there is no control to submit or double-submit. Confirmed live on the fresh
OPEN layer-accounted document `SND-8DC5E59E8D`, whose card showed the layer
warning and neither «Malı əvəz et» nor «Sənədi redaktə et». Row cancellation
carries NO layer gate (line 198) and is separately live-verified, so this is a
specific gate rather than a blanket block. This supersedes the earlier
"requires an inactive-layer edit state" blocker note; no such state was
fabricated.
[Evidence](audits/2026-09-09-phase8-layer-gate-correction-replacement-boundary.md).

**2026-09-09 FINAL ACCEPTANCE GATE — Phase 8 remains NOT ACCEPTED, and the
remaining blocker is an authority gate, not coverage.** Full suite 126 files /
**2708 tests** pass; typecheck, oxlint and production build clean;
`git diff --check` exit 0. TEST reconciled: 121 movements (every fixture posted
and reversed, no immutable row deleted), balance `Test Anbar/0000001 = 8.00`,
**0 negative balances**, layers 7+1 at version 36. Localhost read-only
(`VITE_ALLOW_LOCAL_WRITES=false`, HTTP 200); the temporary write process was
stopped; staged state empty; 214 dirty files preserved; 0 production contact.
**Claude cannot mark Phase 8 ACCEPTED**: the ledger (`…phase8-registry-rows.md`
lines 31-32) and principles §11 require Codex's independent audit, and
`CLAUDE.md` §4 fixes that sequence.
[Evidence](audits/2026-09-09-phase8-final-acceptance-gate.md).

**2026-09-09 CORRECTION after Codex independent review — the layer-gate
attribution is RETRACTED.** The earlier entry claiming M8-39/M8-46
correction+replacement "SATISFIED-BY-GATE" cited transfer `SND-8DC5E59E8D` as
an otherwise-eligible candidate. That is wrong: `canEditDocument()` refuses
`!isOrdinaryDoc` (`documentEdit.ts:99`) **three checks before** the
`layerActive` branch, and `canReplaceItems()` rejects `transfer-doc` /
`legacy-transfer` unconditionally (`documentCancelGate.ts:136`) with no layer
input at all — so a transfer card shows neither control even with layers
INACTIVE, and nothing about the layer gate can be inferred from it. This was an
evidence defect, not an application defect. **M8-38's active-layer refusal
stands** on the reused ordinary-document evidence (2026-09-08 M8-26/M8-38 and
the post-fix M8-28 audit, the latter showing no replacement control but WITH row
cancellation on the same card — the exact asymmetry the code predicts). **M8-39
and M8-46's correction/replacement branches remain UNEXERCISED**, and treating
the gate as satisfying those separate approved contracts is an **explicit owner
scope decision**, not an audit call.
[Corrected audit](audits/2026-09-09-phase8-layer-gate-correction-replacement-boundary.md).

**2026-09-09 M8-54 → fully LIVE (last two branches closed).**
`transferRoute()`'s fully-resolved `A → B` rendered
`Test Anbar → CODEX Phase8 Transfer Anbar`, and `movKey()`'s `route:` branch
appeared as the literal filter OPTION VALUE
`route:Test Anbar → CODEX Phase8 Transfer Anbar` — each equal to an
INDEPENDENTLY recomputed expectation (the helpers under test were never
imported). **Two negative controls held**: the real stored form
`CODEX Phase8 Transfer Anbar anbarı` and an unconfigured `Qeyri-mövcud Anbar
XYZ` both stayed `Test Anbar → —` under `raw:`. **Browser-contract evidence,
NOT persisted TEST data** — the rows existed only in a rewritten `movements`
response; 0 mutation RPCs, 0 non-GET `movements` requests, no warehouse renamed.
Interception removed and the real snapshot restored exactly
(`anySynthetic: false`, 3 rows, identical footer).
[Evidence](audits/2026-09-09-phase8-m8-54-resolved-route-key-browser-contract.md).

**2026-09-09 M8-32 message half → LIVE.** The approved contract is "Batch
atomic execute + all-or-nothing failure message". Atomicity was already proved
server-side by rollback read-back; the message is now proved in the real dialog:
the confirm step rendered «…Hər hansı sənəd ləğv edilə bilməzsə, heç bir sənəd
ləğv olunmur», and submitting produced «**Qrup üzrə ləğv baş tutmadı:** … **—
heç bir sənəd ləğv edilmədi**», exactly `rejectedMessage()`. 0 batch RPCs left
the browser, which also confirms M8-48/M8-49 for `doc.cancel-batch` live.
**Negative control NOT claimed**: the write guard short-circuits before the
network, so a transport-abort mode produced the identical message and could not
discriminate `rejected` from `unknown`.
[Evidence](audits/2026-09-09-phase8-m8-32-all-or-nothing-message-live.md).

**2026-09-09 M8-47 stale re-check → LIVE, with a valid negative control.** The
real card for `TEST-OUT-1` opened with «Əməliyyatı ləğv et» ENABLED; a
browser-only rewrite added that document's cancellation marker; a genuine reload
was driven through the REALTIME path by a real `postgres_changes` event with the
dialog left open (the harness ABORTS if no reload occurs). The still-open dialog
re-rendered as «Ləğv edilib · əks sənəd: SND-C-M847STALE…» with the action
control **omitted entirely** and **0 cancellation RPCs**. The control run
without the swap kept the button enabled and reached the write guard, so the
revocation is caused by staleness. Fixtures posted and immediately reversed.
[Evidence](audits/2026-09-09-phase8-m8-47-shared-gate-stale-recheck.md).
