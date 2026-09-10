# ANBAR — Claude handoff

## Phase 8 — ACCEPTED (2026-09-09)

The owner explicitly accepted both remaining scope boundaries: Phase 8 targets
the current active-layer configuration, so inactive-layer M8-39/M8-46
correction/replacement branches are not required live; and M8-29's historical
layer-legacy transfer success may remain unexecuted without a new cutover or
fabricated layer state. Codex then completed the mandatory independent audit and
recorded Module I / Phase 8 as **ACCEPTED**.

This is scoped acceptance, not a claim that the excluded branches ran. No
production action, commit, push or deploy is authorised. TEST remains reconciled
and localhost read-only. Decision:
[2026-09-09-phase8-active-layer-and-legacy-scope.md](decisions/2026-09-09-phase8-active-layer-and-legacy-scope.md).
Audit:
[2026-09-09-phase8-final-codex-acceptance.md](audits/2026-09-09-phase8-final-codex-acceptance.md).

## Phase 8 — M8-04 LIVE VERIFIED: the remaining formatting branches (2026-09-09)

Read-only run on the verified `--mode sandbox` localhost (`127.0.0.1:5175`,
HTTP 200, `VITE_ALLOW_LOCAL_WRITES=false`). No TEST write, no persistent
fixture, no source change, no I-10 row. TEST movement count **unchanged at
109**.

`M8-04` was PARTIAL with its unexercised branches explicitly named. All of them
are now closed with a **controlled browser-only presentation harness**, on the
same basis as `M8-11` and `M8-06`. Application helpers were **never imported**
— `whLabel`, `resolveWh`, `normWhName`, `nf`, `money`, `fmtD` and
`recorderLabel` were each reimplemented independently — cells were addressed by
**header-name → column index** rather than class selectors, and the Zustand
store was never touched. 12 synthetic `M804` rows: **12 rendered, 0 missing, 0
unexpected**.

**Closed:** the `Xocahəsən` → `Xocəsən` alias (raw payload still carrying
`Xocahəsən`); all three channel cases; the note boundary at 41 and at exactly
40; and the recorder branches `null` / `'sistem'` / unknown-UUID / current-user
name, with no UUID anywhere in the DOM.

### Two things worth reusing rather than rediscovering

**The user directory warms ONCE at boot** (`App.tsx:92-99`), not per
navigation. The current-user-name recorder branch needs the signed-in id absent
from that map, and a first attempt that armed the `/rpc/get_user_directory`
override at *remount* time was too late — the map was already populated and the
row rendered the email. Arming it **before login** worked, removing **exactly
one** entry and leaving the other three real ones unchanged; a control row for
another still-listed id resolved to its email, which is what proves the trim was
surgical rather than a broken response.

**Locale expectations must be computed in the browser, not in Node.** Node's
ICU renders `az-AZ` with a decimal comma (`1,00`); Chrome renders `1.00`. A
harness expectation computed in Node will disagree with a correct DOM. The
related “zero price” surprise was also harness-side: `pr = m.price || it.price`
correctly falls back to the nomenclature price, and the app's own `items` query
selects `price` (`items.api.ts:45`) even though a narrower items response
captured in the baseline lacked that column.

### Recalculated: 18 LIVE / 26 PARTIAL / 8 CODE-ONLY

**Cheapest supported next scenario: `M8-14`** — the realtime `movements`
subscription and its 400 ms debounced refresh. It is the only remaining
CODE-ONLY row that needs neither a write window nor invented data: a second
browser context subscribed to the same TEST project can be observed receiving
the change event and coalescing refreshes, and the debounce is observable as
request timing on the existing 109-row set. **Not started in this run, per
instruction.**

Ranked alternatives, all more expensive: `M8-16`'s transfer/layer/role/failure
branches and the `M8-21…M8-34` cancellation/correction families (write-heavy,
several fixtures); `M8-05`'s stored-valuation branches (needs a `Silinmə` write
whose valuation row survives `excludeCancelled()`); `M8-53`/`M8-45`, which need
payload or fault harnesses. «Çap» remains outside acceptance.

Phase 8 remains **NOT ACCEPTED**.


## Phase 8 — M8-06 LIVE VERIFIED, and the M8-05/M8-51 contradiction resolved (2026-09-09)

Read-only run on the verified `--mode sandbox` localhost
(`127.0.0.1:5175`, HTTP 200, `VITE_ALLOW_LOCAL_WRITES=false`). No TEST write,
no database fixture, no source change, no I-10 row. TEST movement count
**unchanged at 109**.

### The contradiction, and which side was right

Two prior statements disagreed and the task was to recalculate rather than
trust either:

- **M8-05 (latest)** recommended M8-06 because cancellation markers already
  exist in TEST;
- **`M8-51` handoff** said no surviving operational row carries a tag-capable
  marker relationship.

**`M8-51` was right.** M8-05's *premise* is true — 53 markers exist, and **44**
raw rows have a non-null `cancelledDocFor()` — but the inference from "markers
exist" to "a tag is reachable" is false: **0 of those 44 are operational**.

The reason is structural, and worth keeping because it settles the row
permanently rather than for one snapshot. `excludeCancelled()` adds to
`hiddenDocs` only under `if (docMatch && doc)` — where `doc` is the **marker
row's own** `doc_num` (`operationalMovements.ts:37`) — while `docCancelledBy()`
has **no such guard** (`documentCancelState.ts:96`). A marker that carries its
own `doc_num` therefore *both* produces the tag *and* removes the row that
would display it. **A doc'd row can never be simultaneously operational and
tag-positive.**

The only shape that escapes is a marker with **no `doc_num`**: the source
survives and `docCancelledBy()` returns the `'—'` fallback. That shape is
*historical* — all four server-written shapes carry a generated `doc_num` (see
the marker-contract cross-check) — so **no claim is made that current
cancellation RPCs generate it**. This is the concrete content of the earlier
"needs a historical marker shape current RPCs may not produce".

### What was proved

No real tag-positive row exists, so **no database fixture was created and no
real-backend branch coverage is claimed**. The React presentation contract was
proved with a **controlled browser-only fixture**, on the same basis as
`M8-11`: source row rendered with the İstiqamət cell reading exactly
`ləğv edilib` and the `—` fallback; the marker row NOT rendered as a live
movement; a **negative control** that changed only the marker note and left the
source byte-identical, taking the tag 1 → 0 on the **same rendered identity**;
and a **RAW-vs-operational** leg where a source-only payload rendered 0 tag
spans, proving the marker row `excludeCancelled()` removes is required. All by
payload→DOM correlation — `cancelledDocFor()` and `excludeCancelled()` were
never imported or called by the harness.

Recovery: raw back to **109**, rendered rows back to **3** cell-by-cell
identical to baseline, no `M806` or `ləğv edilib` left in the DOM, no banner,
both sessions closed through «Çıxış». 0 production contact; no mutation RPC
(every non-GET was a read RPC or session bookkeeping). Focused tests 78/78.
Evidence:
[M8-06 audit](audits/2026-09-09-phase8-m8-06-cancellation-tag-live-check.md).

**Two measurement traps, recorded so they are not re-paid.** The narrow
marker-column snapshot (`id,note,doc_num,warehouse,partner,channel`) has **no
`type`**, which silently bypasses the `CANCELLABLE_TYPES` branch — reconstruct
from the **full-column** payload. And a bare `span.tag.t-rm` query also matches
the **type** tag («Silinmə» shares the class); scope the M8-06 tag to the
İstiqamət cell (`td[5]`).

### Cheapest remaining scenario: the M8-04 formatting branches

`M8-04`'s unexercised branch is the **non-empty, non-warehouse `channel`**
suppression rule (`index.html:1811-1814`): every real TEST leg carries
`channel: ""`, so the rule that a meaningful channel is *shown* while a
warehouse-valued one is *hidden* has never been seen live. It needs no write
window — the browser-only payload technique proved here reaches it directly,
and the same fixture can carry the remaining `nf()`/`money()`/`fmtD()` and
40-char-note formatting cases. **Not started in this run, per instruction.**

Phase 8 remains **NOT ACCEPTED**.

## Phase 8 — M8-11 LIVE VERIFIED via a browser-only cap fixture (2026-09-09)

Read-only run on a freshly started verified `--mode sandbox` localhost
(PID 21080, HTTP 200). No database mutation, no fixture write, no code change,
0 production contact.

**Scope, stated first because the numbers invite misquoting.** The 3001-row set
existed **only as an intercepted HTTP response body inside one Chrome context**.
The real TEST table held **105** rows before, during and after. This is
**React-contract evidence only** — not 3001 rows in TEST, not backend-volume,
not payload-performance, and **not M8-53**.

**Cap.** Full filtered result 3001, table rendered **exactly 3000**, footer
`3,001 qeyd · mədaxil 3,000.00 · məxaric 1.00 · mədaxil dəyəri 6,000.00 ₼`.
That footer is the load-bearing proof: `məxaric 1.00` comes from the single
`Silinmə` row that **is** the row the cap hides, so a footer computed from the
rendered slice could not have counted it. `kpis` over `all`, cap only on `page`
— exactly as `MovementsPage.tsx:259/262` specify.

**Control.** `Hamısını göstər (3,001)` plus the `· 3,000 göstərilir` notice.
Absent at exactly `SHOW_MAX` (type=`Satınalma` → 3000) and below (type=`Silinmə`
→ 1), and it **returned** when the filter was cleared.

**Expansion and stickiness.** Clicked as a real visible button — the Zustand
store was never set directly and no internal helper was called. 3001 rows
rendered, footer unchanged, control gone. Then filtering to `Satınalma`
rendered 3000 uncapped, and the real «Sıfırla» returned 3001 with **all 3001
still rendered** — the page did not revert to the cap. Navigation/remount
persistence was **not** tested: the ledger does not require it, and inventing
the requirement risks a false result either way.

**Falsifiability.** DOM identity (the `Qeyd` column) compared against the
independently generated set: **0 missing, 0 unexpected, 0 duplicates** in every
leg, and **exactly 1 row** revealed by expansion. No screenshot was relied on.

**Two harness facts worth carrying forward.** `MOVEMENT_TYPE_FILTERS` is a
**fixed eight-type list that does not contain `Alış`** — a synthetic fixture
typed `Alış` produces a filter option that cannot be selected (that was a
fixture flaw, corrected to `Satınalma`, not an app defect). And the movements
read pages at 1000, so a 3001-row interception must honour `offset`/`limit` per
request: 8 intercepted requests were **4 offsets duplicated by StrictMode** =
one logical load.

**Recovery.** Interception removed, real remount restored the baseline **3**
rows with a **byte-identical** footer, no synthetic identity, no error banner.
Session ended through «Çıxış»; nothing staged; dirty tree preserved; no source
touched; no I-10 row. Focused tests `MovementsPage.test.tsx` **67/67** against
the real `SHOW_MAX`. Evidence:
[M8-11 audit](audits/2026-09-09-phase8-m8-11-soft-cap-live-check.md).

### Recalculated: 16 LIVE / 27 PARTIAL / 12 CODE-ONLY

**Cheapest next: a minimal real `Silinmə` write fixture for the reachable
`M8-05` stored-valuation branches.** M8-05 is the highest-value PARTIAL left:
`writeoff_valuations` already holds 3 rows on TEST, but every one belongs to a
row-level-cancelled movement, so the stored-valuation hit, the stored
`unknown`/null-final branch and `writeOffUnitPrice()`'s 4-dp quotient have no
visible fixture. One small `Silinmə` posted through the real UI — priced so the
valuation row survives `excludeCancelled()` — would reach them, and the same
document can be cancelled afterwards for net-zero closure exactly as the
transfer fixture was. It needs a write window, so it was **not** started here.

Ranked alternatives: `M8-04`'s remaining branches (needs a non-empty
warehouse-valued channel, which the supported flows do not produce — likely
unreachable without unsupported data); the cancellation/correction families
`M8-21…M8-34`; and `M8-53`/`M8-14`, which need payload or fault harnesses.
`M8-06` remains blocked — its tag needs a historical marker shape current
cancellation RPCs may not produce.
**RESOLVED 2026-09-09 — `M8-06` is now LIVE VERIFIED for the React
presentation contract.** The diagnosis was right: the shape needed is a marker
with no `doc_num`, which no current RPC writes. It was reached with a
browser-only payload, never a database fixture.

Phase 8 remains NOT ACCEPTED.

## Phase 8 — M8-09 LIVE, M8-54 advanced, via one reversible transfer fixture (2026-09-09)

The first authorised **write** run of Phase 8 acceptance. One minimal
exact-layer transfer was created and cancelled through the real React UI, and
its whole lifecycle used as the fixture for three presentation rows. Write
access was opened by giving `VITE_ALLOW_LOCAL_WRITES=true` to a **temporary
process only** — `web/.env.sandbox.local` was never edited and still reads
`false`.

**Fixture:** `post_layer_transfer_document` → doc **`SND-833CFA7E90`**, 0.01
units of `0000001`, Test Anbar → CODEX Phase8 Transfer Anbar, OUT leg
`d0f01e27…`, IN leg `6c68a39c…`, source layer `b633360d…`, request key
`ededd1f6…`. Layers being active, the supported flow forced an explicit
LayerPickDialog allocation — a genuine exact-layer transfer, not a plain one.

**`M8-09` → LIVE VERIFIED.** The selector went 0 → 2 options; selecting one
through the real control narrowed the table to exactly the matching leg. The
contract's real claim — the invalid-selection reset — was proved by applying a
type filter that removed the key from the option source: the selection reset to
empty, the optgroups vanished, and **the table re-filtered on the resolved
value** (1 `Silinmə` row, not an empty result), so control and rows never
disagreed.

**`M8-54` advanced, still PARTIAL.** Expectations were recomputed
**independently** from the legacy rules — the app helpers were never imported —
and matched the DOM exactly. Newly LIVE: `transferRoute()`'s two half-resolved
branches, `movKey()`'s `raw:` branch, and `movKeyLabel()` (proved as both the
rendered label and the live filter value).

**The finding worth carrying forward.** The route rendered as `Test Anbar → —`,
not `A → B`, and the option landed in the `raws` group. Proved cause:
`normWhName()` strips ONE trailing «anbar/anbarı/anbarına», and **both TEST
warehouses are themselves named «… Anbar»**, so `Test Anbar`→`test` while
partner `Test Anbar anbarı`→`test anbar` and `resolveWh()` returns null. This
is a **TEST-data naming artifact, not a production defect** — the five real
warehouses do not end in «Anbar» and resolve correctly under the same
computation. So `transferRoute()`'s fully-resolved branch and `movKey()`'s
`route:` branch **stay CODE VERIFIED and are unreachable with current TEST
warehouse names**. No warehouse was renamed and no code was changed to force a
pass.

**`M8-04` stays PARTIAL, deliberately.** Both legs render `—` in «Kanal», but
the raw response and the posting payload both carry `channel: ""`. The ledger
rule suppresses a channel that is non-empty AND resolves to a warehouse; an
empty channel takes the ordinary empty-value path. Suppression of a non-empty
value is therefore **not** claimed.

**Net-zero closure.** Cancelled via «Yerdəyişməni ləğv et» →
**`cancel_layer_transfer_document`** with **`p_doc_num`** (deviation `D-I1`
confirmed live), HTTP 200, reversal doc `SND-R-0F906E6B89`. Test Anbar restored
to **8**, destination to **0**, no negative balances. **Raw movements 101 → 105
(+4) and that is correct** — the 2 original and 2 reversal legs are immutable
audit history; net-zero means inventory/layers/balances, not row deletion. After
the refresh the selector offered no route option and the table returned to 3
rows.

Exactly **two** write RPCs in the whole run, both HTTP 200. 0 production contact
attempts across five browser legs; every session ended through «Çıxış»;
localhost restarted read-only (`--mode sandbox`, HTTP 200, no write flag);
nothing staged; dirty tree preserved; no application source touched; no I-10
row. `M8-06` was not attempted, per instruction. Evidence:
[M8-09/M8-54 transfer-fixture audit](audits/2026-09-09-phase8-m8-09-m8-54-transfer-fixture-live-check.md).

### Recalculated: 15 LIVE / 27 PARTIAL / 13 CODE-ONLY

**Cheapest remaining scenario: `M8-11` (3000-row soft cap + «Hamısını
göstər»).** It is the only remaining row whose contract can be exercised
without either inventing data or opening a write window — the sticky
«Hamısını göstər» choice and its persistence across filter changes and
«Sıfırla» are observable on the existing 3-row set, since the *stickiness* is
the contract, not the cap itself. The 3000-row cap boundary stays CODE VERIFIED
(TEST has 105 rows; reaching it would need ~30× the data, which must not be
manufactured).

**SUPERSEDED 2026-09-09 — `M8-11` is now fully LIVE VERIFIED, cap boundary
included.** The pessimism above was wrong on one point: reaching the boundary
did **not** require ~30× the TEST data. A browser-only response interception
served 3001 rows to the real React screen while the TEST table stayed at 105,
so the cap, the reveal control and the boundary controls were all exercised
without writing a single row. See the M8-11 section at the top of this file.

Ranked alternatives, both more expensive: `M8-05`'s stored-valuation branches
(needs a write fixture whose valuation row survives `excludeCancelled()`), and
the cancellation/correction families `M8-21…M8-34` (write-heavy, several
fixtures). `M8-06` remains blocked as instructed — its tag needs a historical
marker shape current cancellation RPCs may not produce.
**RESOLVED 2026-09-09 — see the M8-06 section at the top of this file.**

Phase 8 remains NOT ACCEPTED.

## Phase 8 — M8-03 / M8-05 / M8-52 read-only live check (2026-09-09)

One read-only TEST-admin pass over the real React «Mal hərəkəti», on a freshly
started `--mode sandbox` localhost. Three datasets kept separate throughout:
RAW **101** → OPERATIONAL **3** → RENDERED **3**.

**M8-03 → LIVE VERIFIED.** The surviving set was **reimplemented independently**
in the harness from the legacy rules; the application's `excludeCancelled()` was
never imported or called. Equality was proved **element-by-element by id** — 0
missing, 0 unexpected, count equal — with the DOM→id tuple asserted unique
first, and the footer recomputed from the same surviving set. The live fixture
turned out far richer than the earlier sweep implied: **all three cancellation
families** are present (35 document reversals, 12 legacy row-level, 2 legacy
transfer pairs → 59 hidden documents, 14 hidden ids), excluding **98 of 101**
rows, and covering `SND-C-*` correction and `SND-R-*`/`SND-LR-*` transfer pairs.

**The M8-20 distinction is proven live**, which is the part worth remembering:
**11 documents reach zero visible rows purely through row-level `Ləğv ID:`
counters while never entering `hiddenDocs`** — so a partially modified document
is not mistaken for a whole-document cancellation. Worked example
`SND-12B8BCDD3A` (2 replacement rows named by legacy id + 2 `Ləğv ID:` markers).

**M8-52 → LIVE VERIFIED.** The page's snapshot reuses `fetchItemMovements()` via
`movementsSnapshot.api.ts`, so the contract was checked on **the exact request
the page issues** — matched by its full column signature, because another
screen issues a narrower `movements` select that has latched wrongly before.
16 explicit columns in order, both widened fields (`contract_num`,
`created_by`), 0 missing, 0 extra, not `select=*`, deterministic
`order=date.asc,created_at.asc` before the range, one paging leg
(`offset=0&limit=1000`). The two observed requests are **one logical load**
duplicated by StrictMode. Payload size is deliberately not claimed — that is
M8-53.

**M8-05 stays PARTIAL — this is the honest limit of the run.** Only one
`Silinmə` row is visible (`bd8369ee…`, `TEST-OUT-1`, `out_qty` 3, `price` 0,
no matching valuation row) and it exercises only the unvalued `pr<=0` →
`final null` → em-dash branch. `writeoff_valuations` **does** hold 3 rows, so
the table is populated — but **every one belongs to a row-level-cancelled
movement** (`53b5bd5a…`, `8d8f82eb…`, `d14bac90…`), so none reaches the screen.
The stored-valuation hit, the stored `unknown`/null-final branch, the legacy
`qty × price` fallback and `writeOffUnitPrice()`'s 4-dp quotient therefore have
no live fixture and stay CODE VERIFIED. **No data was created to reach them.**

No mutation RPC, no fixture, no application-code change, 0 production contact
attempts; session ended through the real «Çıxış»; nothing staged, dirty tree
preserved, no I-10 row. Evidence:
[M8-03/05/52 audit](audits/2026-09-09-phase8-m8-03-m8-05-m8-52-live-check.md).

### Where Phase 8 stands, and the cheapest next step

Superseded by the M8-51 section below (2026-09-09). The counts and the
"recommended next" in this paragraph are stale; the current figures are
**14 LIVE / 27 PARTIAL / 14 CODE-ONLY** and `M8-51` is now LIVE VERIFIED.
The work-type split below still holds, minus `M8-51`:

- **Fixture-dependent:** the M8-05 valuation branches, M8-04's truncation and
  transfer-channel branches, M8-54's `transferRoute`/`movKey` — each needs data
  that does not exist and must not be invented.
- **Write-dependent:** the cancellation/correction families (M8-21…M8-34),
  M8-46 double-submit.
- **Cutover/fault-harness-dependent:** M8-14 Realtime, M8-53 payload.

Phase 8 remains NOT ACCEPTED.

## Phase 8 — M8-51 `writeoff_valuations` read contract: LIVE VERIFIED (2026-09-09)

One read-only TEST pass, admin plus a short `anbardar` leg, on a freshly started
verified `--mode sandbox` localhost (PID 18976, HTTP 200). The run was scoped
first against existing evidence: the live column set, the SELECT policy text,
the column-explicit request shape and the M8-45 failure matrix were **already**
proved, so only two things were actually open — a request contract captured
together with a **populated** response, and a behavioural test of the policy.

**Request contract.** Column-explicit, 7 named columns in the exact `COLUMNS`
order, **not** `select=*`; `order=movement_id.asc` before `offset=0&limit=1000`;
HTTP **200**, `Content-Range 0-2/*`; no query params beyond
`select,order,offset,limit`. The 2 observed requests are **one logical load**
duplicated by StrictMode — identical URL and identical body — and no other
screen issues this endpoint.

**Response.** **3 rows**, freshly measured. The returned key set is exactly the
7 requested and maps **1:1** onto `WriteoffValuationRow`: zero live keys missing
from the type, zero typed fields absent from the response — **no undocumented
field dependency**. Live nulls (`source_amount`, `final_amount` on the
`unknown`-method row) confirm the deliberately nullable typing.

**The RLS gain is the part worth carrying forward.** The policy was previously
known only as text. A second `anbardar` leg turned it into a falsifiable result:
85 movements and **2** valuation rows, the withheld one being exactly
`8d8f82eb…`, whose parent movement lives in `CODEX Phase8 Transfer Anbar` —
outside that anbardar's scope. **3/3 predictions match, zero leakage**, and the
anbardar request URL is **byte-identical** to the admin's with **no** client
warehouse filter, so the server scopes and the client does not (`D2` / `M8-42`).

**Not claimed.** All three valuation movements exist in the RAW 101 but each is
row-level cancelled by an explicit `Ləğv ID:` counter-row, so none reaches the
screen — **no M8-05 valuation-rendering branch is promoted** and no data was
created to reach one. No M8-53 payload claim; the M8-45 matrix was not repeated.

RAW **101** unchanged. No mutation RPC, no fixture, no code change, 0 production
attempts; both sessions ended through the real «Çıxış»; nothing staged, dirty
tree preserved, no I-10 row. Focused tests 24/24. Evidence:
[M8-51 audit](audits/2026-09-09-phase8-m8-51-writeoff-valuations-read-contract.md).

### Recalculated: 14 LIVE / 27 PARTIAL / 14 CODE-ONLY

**The previously advertised "read-only reachable now" list is now empty, and
that is this run's second finding.** Measured against the real 101-row snapshot
captured in the same pass:

- **`M8-06`** («ləğv edilib» tag) — 49 marker rows over 41 documents exist in
  RAW, but **no visible row carries the tag**: the tag marks a surviving row
  whose *document* was cancelled, and all 3 visible rows are clean.
  **Fixture-dependent**, not read-only reachable.
  **CONFIRMED 2026-09-09 — this assessment was correct, and `M8-06` is now
  LIVE VERIFIED for the React presentation contract.** Recomputed on the raw
  **109**-row snapshot: 44 raw rows are tag-positive, **0 of them
  operational**. The exclusion is structural, not incidental — a marker
  carrying its own `doc_num` both produces the tag and removes the row that
  would show it — so "no visible row carries the tag" holds for *any* snapshot
  the current RPCs can produce, not just this one. A later M8-05 report
  recommended M8-06 on the opposite premise; that recommendation was **wrong**.
  Reaching the tag needed a **browser-only** historical payload, not a database
  fixture. See the M8-06 section at the top of this file.
- **`M8-09`** (grouped İstiqamət select) — all 3 visible rows render `—` for
  partner; every non-empty partner value in RAW belongs to a cancelled
  transfer. The select's only live option is the empty one, exactly as the
  presentation sweep recorded. **Fixture-dependent.**
  **RESOLVED 2026-09-09 — `M8-09` is now LIVE VERIFIED.** The assessment above
  was correct that no *read-only* pass could reach it, but a write fixture was
  subsequently authorised: one reversible exact-layer transfer supplied the
  options and the invalid-selection reset. See the M8-09/M8-54 section at the
  top of this file.
- **`M8-11`** (3000-row soft cap) — RAW is **101**. The cap is structurally
  unreachable without ~30× the data. **Fixture-dependent.**
  **CORRECTED 2026-09-09 — this was wrong and `M8-11` is now LIVE VERIFIED.**
  The cap is reachable without any TEST data at all: intercepting the movements
  snapshot response in the browser served 3001 rows to the real screen while
  the TEST table stayed at 105. "Fixture-dependent" conflated a *database*
  fixture with a *presentation* one.

**Recommendation: no cheap read-only scenario remains.** The honest next step is
a decision, not another browser pass — either (a) approve a TEST fixture for the
M8-06 / M8-09 / M8-05 branches, or (b) approve the write-dependent
cancellation/correction families (M8-21…M8-34, M8-46). Both need explicit user
approval; neither was started. Phase 8 remains NOT ACCEPTED.

## Phase 8 — presentation sweep: eight rows LIVE, two PARTIAL (2026-09-09)

One read-only pass over the non-live presentation rows, TEST admin plus a
sequential `anbardar`/`rehber` leg, on a freshly started verified
`--mode sandbox` read-only localhost (PID 27084). DOM assertions plus
independent recomputation from the raw snapshot response — not screenshots.

**LIVE VERIFIED:** `M8-01`, `M8-02`, `M8-07`, `M8-08`, `M8-10`, `M8-12`,
`M8-13`, `M8-41`.
**PARTIALLY LIVE VERIFIED, per branch:** `M8-04`, `M8-54`.

Results worth carrying forward:

- **`M8-02`'s `rehber` gap is closed.** Both non-admin roles render «Excel» and
  «Silinmə hesabatı» and do NOT render `mv-batch-cancel`; «Çap» is absent
  entirely for every role, not rendered as a disabled control.
- **`M8-10` is a DEFAULT-ORDER contract, not interactive sorting.** The table
  exposes no sort control and none was invented. Its `ts desc` tie-break is NOT
  promoted — the three visible rows have distinct dates, so nothing ties.
- **`M8-08` proved both date bounds inclusive live** with a single-day range.
- **`M8-04`'s recorder label is the notable gain:** `created_by` is the UUID
  `aa0fd092…` in the raw response and renders as the directory email, with the
  UUID in **zero** rendered cells — the I-2 finding-2 correction proven
  falsifiably rather than assumed.

**What was deliberately NOT claimed, because TEST has no visible fixture — and
no data was created to reach it:** 40-character note truncation (longest
visible note is 27 chars); `Yerdəyişmə` channel suppression (28 transfers exist
in the raw 101, none survives `excludeCancelled()`); three of the four recorder
branches; `transferRoute()`; `movKey`/`movKeyLabel`; and the grouped
«İstiqamət / kontragent» select, whose only live option is the empty one.

**Two harness facts for the next interception/DOM run.** Other screens issue
their OWN narrower `movements` select, so a response listener must match the
snapshot read by its full column signature (`created_by` + `contract_num`) or
it samples the wrong payload and reports null fields. And **Node and Chrome
render `az-AZ` decimals differently** (comma vs dot): compute expected numbers
in Node but format them inside `page.evaluate` so a locale difference cannot
masquerade as an application mismatch. Both faults were caught and corrected
rather than reported as results; no application code was changed.

Raw `movements` **101** (admin/`rehber`) and **85** (`anbardar`), re-measuring
the known RLS partition — all three still render the same 3-row operational
table, which is a fixture coincidence at the operational layer, not inactive
RLS. No mutation RPC, no fixture, 0 production contact; every session ended
through the real «Çıxış»; nothing staged, dirty tree preserved (213), no I-10
row. Evidence:
[presentation sweep audit](audits/2026-09-09-phase8-presentation-sweep-live-check.md).

**Next cheapest genuinely open scenario: `M8-03`** — the row source is
`excludeCancelled()`. This sweep already observed raw **101** → visible **3**
and recomputed the operational set independently; closing the row needs only a
dedicated element-by-element assertion that the rendered rows equal
`excludeCancelled(raw)`, on the same read-only harness. After it, `M8-05`
(Silinmə valuation, whose em-dash amount row is already visible) and `M8-52`
(the widened column list) are the next cheapest. `M8-09`, `M8-11` and `M8-14`
are **fixture-blocked**, not merely unattempted: there are no İstiqamət values,
only 3 rows against a 3000-row cap, and realtime needs a write. Phase 8 remains
NOT ACCEPTED.

## Phase 8 — M8-44 is LIVE VERIFIED: stale-response interleaving (2026-09-09)

The monotonic request sequence in `store/movements.store.ts` now has live
evidence, so `M8-44` moves off code-only verification. TEST admin, the real
React «Mal hərəkəti» screen, a freshly started verified `--mode sandbox`
read-only localhost (PID 5572; the prior sandbox server was stopped and
replaced). Network control delayed or fulfilled TEST GET responses only; Auth
and every `/rest/v1/rpc/` request were excluded by an explicit guard.

**Know this before writing another interleaving harness: one logical load is 8
held requests.** Four snapshot GETs (`movements`, `items`, `warehouses`,
`writeoff_valuations`) × React StrictMode duplication. `movements` returns its
101 rows in a single page, so paging adds nothing. All four must be held
together — `fetchMovementsSnapshot()` awaits `Promise.all` over all four, so
holding fewer lets the load settle and there is nothing stale left to release.

| Leg | Ordering | Result |
| --- | --- | --- |
| A | A held (8 req, 0 delivered) → B issued + settled → A released, marked | table/footer byte-identical, no marker, no banner, loading not restarted |
| B | A held → B held → A released, marked → B released | A replaced nothing, raised nothing, **did not settle B's loading**; B settled clean |
| sub | A held → B held → **A 503** → B released | no banner, B's loading untouched, B settled clean |

The 503 sub-leg is the row's OWN contract ("raises no error and does not settle
the `loading` flag"), not an invented criterion.

**Two harness lessons worth carrying forward.**

*The loading flag needs an application-owned probe.* The full-screen
«Yüklənir…» is gated on `loading && !loaded`, so it is invisible on a refresh
and useless here. `mv-export-writeoff` is rendered
`disabled={!(loaded && isWriteOffFilter && !loading)}`, so with the type filter
pinned to «Silinmə» its disabled state **is** `store.loading` in the DOM. No
application code was changed to expose it.

*A stale marker must be proved visible, or it proves nothing.* Two executions
were **rejected as evidence rather than reported**: the first marked a row
`excludeCancelled()` removes, the second a row the pinned «Silinmə» filter
hides — in both, the marker could not have appeared even if the stale payload
had won. The accepted run marks the row actually on screen, writes only
`partner` (never `note`, which `excludeCancelled()` classifies on), and adds a
**positive control**: the identical payload released as the NEWEST load rendered
`M844STALE` in the visible İSTIQAMƏT column. That is what makes every negative
result falsifiable.

Both invocations provably reached the same module-level `requestSeq`: an
identical window stamp across three navigation remounts, 0 main-frame
navigations, no reload.

Raw `movements` **101**. No mutation RPC, no fixture, 0 production contact
attempts; session ended through the real «Çıxış»; nothing staged, dirty tree
preserved (213), no I-10 row. Evidence:
[M8-44 interleaving audit](audits/2026-09-09-phase8-m8-44-stale-response-interleaving-live-check.md).

Not claimed: other roles (the guard is a module-level counter with no role
dimension), other screens' stores, and interleaving arising from the realtime
refresh path rather than a navigation remount.

**Phase 8 remains NOT ACCEPTED** — the remaining OPEN rows are unrelated to this
one. (The "cheapest next scenario" note that stood here named the presentation
rows and `M8-46`; the presentation sweep above has since run, so use ITS
recommendation — `M8-03` — rather than this entry's.)

## Phase 8 — M8-45 is LIVE VERIFIED: role dimension closed (2026-09-09)

The last scope note on `M8-45` was that every live leg had run as admin. Closed
with the smallest sufficient matrix: one `movements` HTTP 503 retention leg
plus recovery per role, in a **fresh browser context each** so no session state
crossed accounts. The admin matrix was not repeated.

Both `anbardar` (`anbar-anbardar-codex-test · Anbardar`) and `rehber`
(`anbar-rehber-codex-test · Rəhbər`) kept their table visible with unchanged
row identity and footer, showed their own banner
(`Yenilənmədi Service Unavailable (M8-45 anbardar|rehber) · …`), produced no
full-screen «Yükləmə xətası», settled loading, kept search/«Sıfırla»/«Excel»
usable, recovered to the identical snapshot with the banner cleared, and
rendered **no admin-only «Qrup üzrə ləğv»** (count 0).

**RLS re-confirmed from a second code path.** Raw `movements` returned **85
rows for `anbardar`** (the `Test Anbar` partition) and **101 for `rehber`**
(the full set), matching the same-day role/RLS audit. Both roles nevertheless
render the same 3-row operational table, because the screen shows
`excludeCancelled()` output and the 16 foreign plus cancelled/reversal rows
fall outside it. **That identical footer is a fixture coincidence at the
operational layer, not evidence that RLS is inactive** — the raw counts prove
it is active. Do not read the matching footers as a parity problem.

`failedRequestCount` was 8 per role. That is the failure **window's** total
(StrictMode duplication × paging) — **one logical refresh per role**, not
eight.

Each device session was ended through the **real «Çıxış»** (`App.tsx:148` →
`unregisterSession()` then `signOut()`; `rpc/end_session` observed), not by
discarding the browser context.

**`M8-45` is therefore promoted to LIVE VERIFIED** — all four core reads, both
failure shapes (HTTP 503 and transport abort) and all three roles. Two limits
on that promotion, stated deliberately: the row's contract is "a failed refresh
retains the previous snapshot" and **carries no role requirement of its own**,
so the role gap was a scope note now retired rather than a criterion invented
and then satisfied; and the role legs used `movements`/503 only, so no broader
per-role endpoint coverage is claimed.

No mutation RPC, no fixture, 0 production contact attempts; nothing staged,
dirty tree preserved, no I-10 row. Evidence:
[M8-45 role-dimension audit](audits/2026-09-09-phase8-m8-45-role-dimension-live-check.md).

**`M8-44` was the next executable scenario after this entry and is now CLOSED**
(see the M8-44 section at the top). It was explicitly NOT claimed by any M8-45
work, because every M8-45 leg failed requests sequentially, never concurrently —
that separation still holds. Phase 8 remains NOT ACCEPTED.

## Phase 8 — M8-45 matrix completed: remaining read legs (2026-09-09)

The movements/503 pass below left three core reads and the transport shape
open. All four are now closed on TEST admin through the real React UI, on a
freshly started `--mode sandbox` localhost (the previous server was stopped and
replaced so the sandbox badge provably belongs to the process under test).

| Leg | Endpoint | Failure | Banner |
| --- | --- | --- | --- |
| 1 | `items?select=code,name,unit,price,category&order=code.asc` | HTTP 503 | `Yenilənmədi Service Unavailable (M8-45 items) …` |
| 2 | `warehouses?select=*&offset=0&limit=1000` | HTTP 503 | `Yenilənmədi Anbar siyahısı yüklənmədi …` |
| 3 | `writeoff_valuations?select=movement_id,source_amount,…` | HTTP 503 | `Yenilənmədi Service Unavailable (M8-45 writeoff_valuations) …` |
| 4 | `items?select=code,name,unit,price,category&order=code.asc` | transport abort | `Yenilənmədi TypeError: Failed to fetch …` |

Every leg kept 3 rows with identical row identity and the unchanged footer
`3 qeyd · mədaxil 11.00 · məxaric 3.00 · mədaxil dəyəri 111.00 ₼`, showed the
banner, produced no full-screen «Yükləmə xətası», settled loading, kept
search/«Sıfırla»/«Excel»/«Yeni əməliyyat» enabled, and recovered to the
identical snapshot with the banner cleared — so no failure state leaked into
the next leg. Raw `movements` re-measured at **101** before and after.

**Two results worth carrying forward.** `warehouses` deliberately does NOT show
the server's message: `fetchWarehouses()` THROWS instead of returning
`{ error }`, and the snapshot normaliser converts that rejection to the
`FAIL_WAREHOUSES` constant. That is the both-failure-shapes contract working,
not a lost message — do not "fix" it into a pass-through. And
`writeoff_valuations` is the **live confirmation of the I-2 correction**: a
failed valuation read is FATAL and retains the whole snapshot, so displayed
`Silinmə` amounts cannot shift under a transient failure.

**A first run of this matrix reported no banner on all four legs and was
rejected as evidence rather than reported as a pass.** Tracing the real request
sequence found two harness faults, both worth knowing before writing another
interception test: Nomenklatura issues its OWN `items` and `warehouses` reads
with the same select signature, so a one-shot interceptor armed before
navigation disarms on the wrong page; and React StrictMode issues each snapshot
read TWICE, so failing only the first still lets the second succeed. The fix
was a failure WINDOW armed only after Nomenklatura settles and closed once the
leg is sampled. **No application code was changed to obtain the passes.**

`M8-44` stale-response interleaving is deliberately NOT claimed from these
sequential failures. Other roles (`anbardar`, `rehber`) remain open for this
row. No mutation RPC, no fixture, 0 production contact attempts; nothing
staged, dirty tree preserved, no I-10 row. Evidence:
[M8-45 remaining-legs audit](audits/2026-09-09-phase8-m8-45-remaining-read-legs-live-check.md).
Phase 8 remains NOT ACCEPTED.

## Phase 8 — M8-45 failed-refresh retention live check (2026-09-09)

Browser network interception **was** available this continuation, so `M8-45`
no longer rests on store/component tests alone. Playwright 1.63.0 drove
installed Chrome (imported from the npx cache — deliberately NOT added to
`web/package.json` or `web/node_modules`) against a verified
`npm run dev -- --mode sandbox` localhost on TEST `alkjjbaawmsirsfvqljm`.

Exactly one required read was failed: `**/rest/v1/movements**`, answered HTTP
503 with `Service Unavailable (M8-45 injected)`. Auth was never intercepted
and no mutation RPC was called. The refresh was triggered through the real UI
by navigating «Nomenklatura» → «Mal hərəkəti», which remounts the page and
calls the store's `load()`.

With the failure active the previously loaded table stayed visible: 3 rows,
byte-identical row identity, unchanged footer
`3 qeyd · mədaxil 11.00 · məxaric 3.00 · mədaxil dəyəri 111.00 ₼`, the exact
banner `Yenilənmədi Service Unavailable (M8-45 injected) · Ekranda son uğurlu
oxunuşun məlumatı göstərilir.` rendered ABOVE the table, no «Yükləmə xətası»,
loading finished, and search/«Sıfırla»/«Excel»/«Yeni əməliyyat» all enabled.
Removing the interception recovered the identical snapshot with no banner.
This is exactly `movements.store.ts:218` and `MovementsPage.tsx:647-653`.

**Count reconciliation — 101 vs 3, both correct.** The captured `movements`
response returned **101 rows**, matching the same-day role/RLS audit baseline;
it was verified, not assumed. The table shows 3 because the screen renders
`excludeCancelled()` output and the accumulated Phase 8 cancellation/reversal
fixtures account for the rest.

One instrumentation correction is recorded rather than hidden: the first
scripted attempt sampled the DOM 7 s after navigation, before the failed load
settled, and reported no banner. It was **not** accepted as evidence; the wait
was raised to 9 s and the run repeated. No code was changed to obtain the pass.

Two pre-existing dev servers (PIDs 3124/16892) were stopped first, because a
server whose mode could not be established must not supply evidence. Zero
production contact attempts (a blanket route aborted any `bbjmhaerssakbreykxiw`
URL). No movement, fixture or database write; the only non-GET requests were
the read-only RPCs `register_session`, `get_reference_values`,
`get_user_directory`, `stock_layers_supported`. Final state:
`VITE_ALLOW_LOCAL_WRITES=false`, HTTP 200, nothing staged, dirty working tree
preserved, no I-10 row. Evidence:
[M8-45 retention audit](audits/2026-09-09-phase8-m8-45-failed-refresh-retention-live-check.md).

Still open for this row: other roles, the `items`/`warehouses`/
`writeoff_valuations` failure legs, a transport abort as distinct from HTTP
503, and concurrent stale-response interleaving (`M8-44`).
Phase 8 remains NOT ACCEPTED.

## Product decision — `Çap` is not a gate (2026-09-08)

The product owner confirmed that `Çap` has never worked anywhere in the platform. Treat this as the accepted baseline: missing/non-working print is not a defect and must not block Phase 4, Phase 5, Phase 8 or any later acceptance. Earlier print-preview TODOs are historical and superseded as acceptance requirements. Excel and dedicated report exports remain independently in scope. Decision: [2026-09-08-print-nonfunctional-baseline.md](decisions/2026-09-08-print-nonfunctional-baseline.md).

## Read-only continuation check (2026-09-08)

The safe localhost (`VITE_ALLOW_LOCAL_WRITES=false`) loaded «Mal hərəkəti»
without browser warnings or errors. It showed 6 records, inbound 19, outbound
3 and inbound value 211 AZN. Opening replacement document
`SND-12B8BCDD3A` showed quantity 2, unit price 12.50 and amount 25.00, matching
the B4 read-back. No database mutation was performed in this check.

`M8-53` is now **PARTIALLY MEASURED / OPEN**. A temporary local-only response
instrument (removed after use) recorded the exact queries, row counts,
decoded JSON bytes and request counts for the four-read snapshot: 14/6,140
(`movements`), 6/598 (`items`), 2/133 (`warehouses`), 0/2
(`writeoff_valuations`), total 4 requests / 6,873 decoded bytes. React dev
`StrictMode` issued the identical set twice. A TEST-only HTTP/1.1 follow-up with
automatic decompression disabled measured 1,532 encoded body bytes total
(1,194 + 226 + 110 + 2) and re-confirmed the same rows and decoded sizes.
Transfer size including response headers/protocol overhead remains open because
cross-origin Resource Timing exposed zero; it is not inferred from encoded body
size.
Evidence: [2026-09-08-phase8-m8-53-payload-measurement.md](audits/2026-09-08-phase8-m8-53-payload-measurement.md).

M8-53 was later closed at protocol level after the documented TEST writes. A
raw HTTP/1.1 replay of the same four reads measured the current 18-movement
snapshot as 4,304 response-header bytes + 1,796 encoded-body bytes + 34 bytes
chunk framing = 6,134 raw response bytes. A paired decoded pass confirmed 26
rows and 8,843 JSON bytes. The figure excludes request/TLS/TCP bytes and belongs
to that named capture; dynamic headers can vary. M8-53 is therefore measured,
not an open transfer-size gap. Phase 8 remains NOT ACCEPTED.

The Silinmə report's **unmount-abort subpath is LIVE VERIFIED**. With a
temporary local-only wrapper (removed after the check), the capability probe
was made unknown and `stock_layer_allocations` was delayed for two seconds.
The real report button was clicked and the page immediately changed to
Nomenklatura; no download event occurred during the 3.5-second observation.
This proves the `mounted.current` abort. Refresh-start, changed-snapshot and
changed-session paths were initially open. Evidence:
[2026-09-08-phase8-writeoff-export-unmount-live-check.md](audits/2026-09-08-phase8-writeoff-export-unmount-live-check.md).

A follow-up double-click run against the same delayed read observed exactly
one `stock_layer_allocations` request (`allocationReads=1`) and no download
after navigation. The synchronous duplicate-click lock is therefore also LIVE
VERIFIED for this asynchronous report branch. Refresh-start,
changed-snapshot and changed-session aborts were initially open.

Two further read-only follow-ups now live-verify refresh-in-progress and
changed-snapshot handling. A refresh that remained pending produced no file and
showed `Məlumat yenilənir — hesabatı yenidən yaradın`; a refresh that completed
before the allocation read returned also produced no file and showed
`Məlumat yeniləndi — hesabatı yenidən yaradın`. All temporary wrappers were
removed. A final synthetic in-memory auth identity transition produced no file
and showed `Sessiya dəyişdi — hesabatı yenidən yaradın`; this verifies the UI
guard but not real Supabase authentication behaviour. All five report
concurrency guards have now been observed through the real button.

## 2026-09-08 — cancellation/correction TEST follow-up

B1 ordinary cancellation, B3 two-document batch cancellation and B4 ordinary correction succeeded through React UI. Read-only TEST SQL verified retained originals, reversal/replacement rows and ten matching audit entries (B1: 2; B3: 4; B4: 4 including the explicit correct_document UPDATE with reason). B4 maps `SND-5DE0837805` to `SND-12B8BCDD3A`; the replacement has quantity 2 at price 12.5.

A live defect was fixed: NewOperationPage did not call openEditLine(index), so saving the dialog silently discarded edits. It now initializes the store edit index. Post-fix verification: **2702 tests / 126 files passed** with one worker; the focused page/dialog/store run passed **147 tests / 3 files**; typecheck and oxlint exit 0; the production build succeeded with only the existing large-chunk warning. The earlier full **2701/126** result is the pre-fix baseline.

Lasting TEST state: an inactive stock_layer_settings default row was added; B1/B3 reversal history and B4 replacement remain. The sandbox flag was changed to false and the running localhost UI confirmed all writes blocked. No production change, commit, staging or deployment. Phase 8 remains NOT ACCEPTED.

Evidence and scope: [cancellation/correction live audit](audits/2026-09-08-phase8-cancellation-correction-live-check.md). This supersedes earlier statements that no cancellation/correction RPC had run, only for these ordinary admin paths. Layer/transfer, failure atomicity, concurrency, broader roles and complete RLS comparisons remain open.

A subsequent read-only TEST-admin follow-up opened existing document
`SND-76074E451C` through the real correction control. The
`document_edit_impact` caller returned `editable:false`, and the UI rendered
seven server-provided reasons naming later movements for the same
warehouse/item. No draft transition or mutation occurred. This gives M8-33
and M8-34 narrow live evidence for the populated not-editable branch only;
malformed/transport, role, layer/transfer and correction-write failure paths
remain open. Evidence: [not-editable live audit](audits/2026-09-08-phase8-correction-not-editable-live-check.md).

Another read-only TEST-admin follow-up used the same document to inspect the
real item-replacement preflight. Candidate `0000002` resolved to `TEST Mal 2`,
the mandatory reason gate behaved correctly, and submit was deliberately not
clicked. The row-cancellation dialog likewise kept submit disabled until its
mandatory reason was present and was then cancelled without dispatch. The same
pass observed the reversal-date control defaulted to the current date and the
exact immutable-record refusal for a visible legacy `Alış` row. This gives
M8-15/M8-23/M8-27/M8-28 narrow UI evidence only; no mutation RPC was
dispatched. Evidence: [replacement preflight audit](audits/2026-09-08-phase8-replacement-preflight-live-check.md).

A later authorized TEST-only write executed M8-28 on the then-current eligible
ordinary document `SND-12B8BCDD3A`. The real UI replaced `0000001` with
`0000002`; direct read-back showed the original row unchanged, an equal
old-item counter-row and new-item replacement row added under the same document,
and date/warehouse/quantity/price/invoice preserved. The server retained the
existing correction marker and appended the transition plus mandatory reason.
This promotes only the ordinary non-layer TEST-admin success path to partial
live evidence. Stale races, refusal families, roles, lot/transfer exclusions,
failure atomicity and concurrency remain open. The admin read policy exposed no
matching `audit_log` row, so M8-43 was not promoted. Evidence:
[M8-28 live audit](audits/2026-09-08-phase8-m8-28-replacement-live-check.md).
Phase 8 remains NOT ACCEPTED.

## Phase 8 — M8-27 React layer row cancellation (2026-09-08)

The real layers-active React dialog cancelled exact receipt movement
`a60504a6-4c11-4ea6-89ef-d3998e4603e0` through `Sətri ləğv et` with a
mandatory reason. The document remained open with zero effective lines.
Read-back proved one same-document counter-row, count 84→85, preserved
quantity/price/invoice, exact layer 1→0/inactive and item balance zero.
Localhost was returned to read-only. Evidence:
[`audits/2026-09-08-phase8-m8-27-react-layer-row-cancel-live-check.md`](audits/2026-09-08-phase8-m8-27-react-layer-row-cancel-live-check.md).

M8-31 also now has narrow live evidence for inclusive equal date bounds and
combined warehouse/type filters in addition to its earlier search/selection
checks. Phase 8 remains NOT ACCEPTED.

## Phase 8 — M8-31 batch selection persistence (2026-09-08)

On read-only localhost, real document search isolated eligible `TEST-OUT-1`.
After it was selected, a no-result filter retained `1 sənəd seçilib` and the
enabled continuation; restoring the filter returned the checkbox still
selected. The dialog was closed without execution. No TEST mutation occurred.
Evidence:
[`audits/2026-09-08-phase8-m8-31-batch-search-selection-live-check.md`](audits/2026-09-08-phase8-m8-31-batch-search-selection-live-check.md).

Phase 8 remains NOT ACCEPTED.

The next cheapest open success path, M8-27, was executed on the effective
`0000002` line in the same TEST document. The real UI reported row-cancellation
success and refreshed the document to zero effective lines. Direct read-back
proved all prior rows retained and one `0000002` outbound counter-entry added
under `SND-12B8BCDD3A`, preserving date, quantity, price and invoice. This is
partial live evidence for ordinary non-layer TEST admin only; layer, races,
refusals, other roles, failure atomicity and concurrency remain open. The admin
read policy again exposed no audit row for the unique reason, so M8-43 was not
promoted. The temporary write-enabled Vite process was stopped, the tracked
sandbox flag remained false, and localhost was restarted read-only. Evidence:
[M8-27 live audit](audits/2026-09-08-phase8-m8-27-row-cancel-live-check.md).
Phase 8 remains NOT ACCEPTED.

M8-23's remaining ordinary blank-date path was then exercised without
repeating the earlier default-render check. The TEST-admin form for
`SND-76074E451C` was submitted with the date visibly empty; the UI created
`SND-C-2D6E6E714D`, and direct read-back proved its server date is `2026-09-08`
while the original remains unchanged. This confirms the code-verified omission
of `p_reversal_date` and server default end to end for ordinary non-layer
`cancel_document`. Other families, roles, layer routing, refusals and failures
remain open. The write-enabled process was stopped and localhost restarted from
the unchanged `VITE_ALLOW_LOCAL_WRITES=false` sandbox file. Evidence:
[M8-23 blank-date audit](audits/2026-09-08-phase8-m8-23-blank-reversal-date-live-check.md).
Phase 8 remains NOT ACCEPTED.

A current-state implementation reconciliation removed stale I-3-era wording
from ledger rows M8-16…M8-19 and M8-21. Those rows had still said their I-4
cancellation controls were “not implemented”, although the current source and
tests contain the ordinary, transfer, legacy and layer routes plus submit-time
gates. No application code was missing or changed by this correction. Current
TEST prerequisites were also read: layers `active:false` (version 36), one
active warehouse, zero transfer rows and zero doc-less movements. Therefore the
remaining transfer/layer/legacy live branches require new fixtures or a config
transition; they are evidence gaps, not unfinished Claude implementation.

One minimal transfer fixture was then authorized and executed on TEST. The
admin created active warehouse `CODEX Phase8 Transfer Anbar`, posted one unit
of item `0000001` from `Test Anbar`, opened the resulting
`SND-3550711E4C` through the transfer-first dispatcher and cancelled it through
the real transfer action. Direct read-back proved both original legs retained
and reverse document `SND-R-5D4231E5E8` added with two equal/opposite legs.
This gives M8-15/M8-17 narrow transfer dispatcher/view evidence and M8-25
partial live evidence for `cancel_transfer_document` with layers inactive.
The layer RPC, refusals, roles and failure/concurrency remain open. The fixture
name ending in `Anbar` produced a half-resolved display route because both the
legacy and React one-pass normalizer remove only the appended `anbarına`; this
is an inherited parity edge and was not “fixed”. The write-enabled process was
stopped and localhost returned to read-only. Evidence:
[M8-25 transfer audit](audits/2026-09-08-phase8-m8-25-transfer-cancel-live-check.md).
Phase 8 remains NOT ACCEPTED.

M8-32's ordinary non-layer server rollback was then live-checked without
creating another fixture. `cancel_documents_batch` received open
`SND-D512FAAC59` first and a guaranteed-absent document second. It returned
`P0001` / `Sənəd tapılmadı`; immediate read-back proved the first original was
still the only related row and no reversal marker existed. This closes the
partial-write atomicity concern for that rejection shape, but not the React
dialog error display, unknown outcome, refresh failure, layer, roles or
concurrency. Evidence:
[M8-32 atomicity audit](audits/2026-09-08-phase8-m8-32-batch-atomicity-live-check.md).

M8-29's document-less ordinary path was then exercised with one minimal TEST
fixture. Its real `Baxış` action opened `Köhnə əməliyyat · 0000002`, exposed
the legacy whole-operation cancel and item-replacement controls, and showed no
row-cancel control. The real cancel retained source
`e3cc15d4-d6f5-44f7-b723-989af25d4ac6` with `doc_num = null` and created
opposite row `7e912e34-8e03-4617-8898-355029b7bf7b` under
`SND-L-26844B5387`, marked `Ləğv ID: <source id>`. This gives M8-15/M8-18
narrow document-less ordinary UI evidence and M8-29 partial live evidence for
`cancel_legacy_movement`, TEST admin, layers inactive. The transfer and layer
variants, roles, refusal/failure and concurrency paths remain open. The
write-enabled listener was stopped and sandbox localhost restored from
`VITE_ALLOW_LOCAL_WRITES=false`, returning HTTP 200. Evidence:
[M8-29 legacy cancellation audit](audits/2026-09-08-phase8-m8-29-legacy-cancel-live-check.md).
Phase 8 remains NOT ACCEPTED.

The remaining document-less transfer dispatcher/RPC path was then exercised
with one unique two-leg TEST pair. The real `Köhnə yerdəyişmə` view submitted
the cancellation and reported `SND-LR-AE5EEE3FF0`; direct read-back proved both
`doc_num = null` source legs retained and two equal/opposite reverse legs added
with the canonical paired-id marker. A direct repeat call returned HTTP 400 /
P0001 (`Bu köhnə yerdəyişmə artıq ləğv edilib`) and the reverse-document row
count remained two. This gives M8-15 all four dispatcher destinations in narrow
TEST-admin live scope, M8-19 its legacy-transfer view/action, and M8-29 both
non-layer success families plus one refusal. Layer variants, other roles and
remaining refusal/failure/concurrency paths stay open. Localhost was again
returned to the unchanged read-only sandbox and answered HTTP 200. Evidence:
[M8-29 legacy transfer audit](audits/2026-09-08-phase8-m8-29-legacy-transfer-live-check.md).
Phase 8 remains NOT ACCEPTED.

The transfer fixtures also supersede M8-42's old statement that TEST had no
known foreign-warehouse movement: raw rows now exist in
`CODEX Phase8 Transfer Anbar`. A fresh allowed/denied RLS comparison is still
open because this continuation has no usable `anbardar` credential/session;
the saved Chrome role tab was visible in the tab inventory but could not be
attached through browser control. Do not guess its password. The blocker is
identity access, no longer fixture data.

The cheapest next no-write refusal check then directly repeated cancellation
of already-cancelled ordinary `SND-76074E451C` and transfer
`SND-3550711E4C`. Both returned HTTP 400 / P0001 with the exact
`Bu sənəd artıq ləğv edilib: <doc>` message; the admin-visible movement count
remained 28 before and after both calls. M8-24/M8-25 gain narrow non-layer
server refusal/no-duplicate-write evidence. This does not promote M8-21/M8-22
UI presentation because the effective registry excludes these rows. Evidence:
[M8-24/M8-25 refusal audit](audits/2026-09-08-phase8-m8-24-m8-25-recancel-refusal-live-check.md).
Phase 8 remains NOT ACCEPTED.

The next no-write server backstop check called `cancel_movement_row` and
`replace_movement_item` against existing transfer source
`f8a47ad3-3cc5-4b94-ac5b-9e3fa6245f57`. Both returned their exact transfer-
specific P0001 instructions (whole-document cancellation; cancel-and-recreate)
and movement count stayed 28→28. M8-27/M8-28 gain narrow transfer-exclusion
server evidence; their remaining layer/role/race/failure/concurrency gaps are
unchanged. Evidence:
[M8-27/M8-28 transfer refusal audit](audits/2026-09-08-phase8-m8-27-m8-28-transfer-refusal-live-check.md).
Phase 8 remains NOT ACCEPTED.

A further no-write backstop check called the same two RPCs against the existing
legacy `Alış` fixture. Both returned their exact unsupported-type P0001 and the
movement count again stayed 28→28. M8-27/M8-28 gain narrow unsupported-type
server refusal evidence. Evidence:
[M8-27/M8-28 unsupported-type audit](audits/2026-09-08-phase8-m8-27-m8-28-unsupported-type-refusal-live-check.md).
Phase 8 remains NOT ACCEPTED.

Six additional no-write validation calls covered whitespace reasons for both
row cancellation and replacement, absent movement for both functions, and
replacement with the same or an absent item code. Every call returned its exact
P0001; movement count stayed 28 across both groups. M8-27/M8-28 gain these
narrow server-backstop results. Evidence:
[M8-27/M8-28 validation audit](audits/2026-09-08-phase8-m8-27-m8-28-validation-refusals-live-check.md).
Phase 8 remains NOT ACCEPTED.

Five document-family validation calls then covered whitespace/missing document
numbers and ordinary-vs-transfer wrong-RPC routing. Every direct TEST-admin call
returned the exact P0001 and movement count stayed 28→28. M8-24/M8-25 gain
these narrow server validation/no-write results. Evidence:
[M8-24/M8-25 validation audit](audits/2026-09-08-phase8-m8-24-m8-25-validation-refusals-live-check.md).
Phase 8 remains NOT ACCEPTED.

Six direct batch calls then covered empty selection, whitespace legacy entry,
duplicate document, already-cancelled ordinary original and both ordinary and
transfer reversal documents. Every call returned its exact P0001 and movement
count stayed 28→28. M8-30/M8-32 gain narrow server eligibility/atomic no-write
evidence; this does not promote M8-21/M8-22 UI presentation. Evidence:
[M8-30/M8-32 batch validation audit](audits/2026-09-08-phase8-m8-30-m8-32-batch-validation-refusals-live-check.md).
Phase 8 remains NOT ACCEPTED.

Six direct legacy cancellation calls then covered ordinary already-cancelled,
ordinary/transfer wrong-family routing, numbered-row rejection and both absent-
movement cases. Every call returned the exact P0001 and movement count stayed
28→28. M8-29 gains these narrow non-layer server refusal/no-write results.
Evidence: [M8-29 validation audit](audits/2026-09-08-phase8-m8-29-validation-refusals-live-check.md).
Phase 8 remains NOT ACCEPTED.

## Project rule

The old production platform (`origin/main:index.html`) is the behavioural reference. The React/Vite platform must preserve the same data, calculations, permissions, documents, actions and visible outcomes. Architecture may change; unexplained behaviour may not.

Old and new platforms use the same Supabase project. Therefore localhost writes are real production writes. Do not change Supabase, the root `index.html`, GitHub remote, or Vercel without explicit user approval.

## Collaboration rule

Claude implements one migration phase at a time. When Claude reports `DONE`, Codex independently audits the spec, plan, ledger, registry, git diff, old platform and live Supabase contract, then runs tests/typecheck/lint/build and performs read-only browser comparison. Codex reports every divergence; Claude fixes only user-approved issues. An audit finding is a hypothesis until independently verified: Claude must challenge it with exact evidence when behaviour is intentional, parity-required or an approved deviation, and Codex must evaluate that objection by the same source-of-truth hierarchy. Only the proven part of a finding may be changed; unresolved conflicts go to the user. After each audit or correction, if Claude has a safe concrete next task, Codex supplies the complete next prompt immediately without waiting for the user to request it; otherwise Codex names the real owner or blocker.

## Current migration state

- Branch: `react-migration`
- Phase 1: ACCEPTED by the user after code and live browser checks.
- Phase 2 (unified `Soraqçalar` with warehouse + partner kinds): code implemented.
- Phase 3 (the remaining six Soraqçalar kinds): **design approved, Q1-Q8
  decided by the user 2026-09-02** (design §10 in
  `docs/superpowers/specs/2026-09-02-react-migration-phase3-reference-kinds-design.md`).
  Parity rows `M3-01`…`M3-17` live in Module D of the registry.
  - **Phase 3a + 3b implemented and audited by Codex (2026-09-02).** All eight
    Soraqçalar kinds are wired. The read-only browser comparison **passed:
    all 90 rows matched** the original in names, statuses and usage counts;
    kind filters and the empty hidden view were checked.
  - **Live create/update/hide/delete were NOT tested.** Every mutation is still
    exercised only against mocks, and no write path may be called
    `LIVE VERIFIED`. `M3-16` stays `NOT STARTED`; the `location` dataset is
    still empty, so Q1's ceiling is unmoved.
  - **Module D is `CODE VERIFIED` + `READ-ONLY LIVE VERIFIED`, not `ACCEPTED`.**
    `D-12` stays open until the live mutation pass.
  - Three visual differences are **deferred to the final visual review**, not
    bugs to fix piecemeal: thousands separators, action-button presentation,
    empty-state width (registry V-01…V-03).
- Latest relevant commits (newest first): `239b8a0` (Phase 3 design + plan
  committed), `0b4b2bf` (handoff file itself committed and brought current),
  `fdccc7c` (localhost write guard widened to every reference write, not just
  destructive ones — supersedes `cc0e8ba`), `09ad567` (contract-date
  investigation), `cc0e8ba` (original destructive-action guard, kept for
  context on what `fdccc7c` widened), `8bd917e` (Phase 2 base: unified
  Soraqçalar with the partner kind).
- **Phase 4 (Audit jurnalı, Module E) is `ACCEPTED`** — by explicit user
  decision on 2026-09-03, taken **without** the populated-data live
  comparison, which is recorded as an accepted exception and a standing
  check. See «Phase 4 — Audit jurnalı: current state» below.
- Automated checks after Phase 4 + its three audit fixes: **448 tests passed**
  in 30 files, typecheck, oxlint, build and `git diff --check` all clean.
  (222/20 end of Phase 2; 296/23 end of Phase 3a; 358/24 end of Phase 3b;
  432/30 before the Phase 4 audit fixes.)

### Phase 3 decisions in effect (2026-09-02)

Q1 `location`: implement + read-only live verification, no artificial record,
write path stays NOT LIVE VERIFIED by decision. Q2 typed project-name
confirmation required before permanent delete (new deviation). Q3 cancelled-
movements UI/server mismatch preserved unchanged, no SQL touched. Q4 `project`
edits always resend the stored `linked_warehouse`. Q5 `items` added to the
existing single Realtime subscription. Q6 phase split at the corrected
readiness boundary (3a: `channel`/`unit`/`category`; 3b: `location`/`project`/
`serfiyyat_channel`). Q7 new registry rows use the `M3-` prefix. Q8 `C-17`
stays open, linked to (not merged with) the new cross-kind row, closes only
after its own live verification. Full reasoning: design §10.

## Phase 2 findings

- Live localhost checks passed for partner creation, name/contract editing and hiding before the safety guard was added.
- Physical deletion of the temporary test partner was deliberately not performed. Do not delete it without the user's explicit confirmation.
- Localhost visibly warns that it uses the live Supabase database.
- **All** reference writes (`create`, `update`, `delete`, `deactivate`, `activate`) are blocked on localhost unless `VITE_ALLOW_LOCAL_WRITES=true`. Production behaviour is unchanged. The earlier gap — `create` and `update` still writing to the live database from localhost — is closed; the flag was renamed because its meaning widened, so an old `VITE_ALLOW_DESTRUCTIVE` line in a local `web/.env` no longer opens anything (it fails safe, i.e. blocked).
- The contract-date report was investigated. React sends a complete ISO date correctly in tests; the live audit showed the test date was already NULL at insert. This is consistent with an incomplete/empty `input[type=date]` value and matches production behaviour.
- The duplicate risk ID (`R-12`) is fixed — the date-input note is now `R-13`, the visual-parity item keeps `R-12`, and the guard's own limits are `R-14`. The registry no longer claims Phase 2 live verification "has not started": it lists what was actually checked live (partner create, name/contract edit, hide) and everything still unproven, and explains why no row is promoted to `LIVE VERIFIED` — that pass ran on code which has since changed.

## Phase 3a — what was built (2026-09-02)

New files: `api/referenceValues.api.ts` (+ test), `types/referenceDirectory.test.ts`,
`store/referenceDirectory.store.test.ts`.
Changed: `types/referenceDirectory.ts` (`KIND_RULES` with a readiness field),
`api/referenceUsage.api.ts` (+`items` source, `channel` column),
`store/referenceDirectory.store.ts` (reference-values load + readiness),
`pages/ReferenceDirectoryPage.tsx` (banner, disabled options, `refOpen`
refusal, `WATCHED_TABLES` +2), and three test files.

Key decisions embedded in the code, worth knowing before touching it:

- **Readiness is a `KIND_RULES` field, never derived from the data source.**
  `serfiyyat_channel` shares `get_reference_values()` with the three 3a kinds
  but is gated on `serfiyyat`. Deriving one from the other is the bug M3-02a
  exists to prevent.
- **`unit`/`category` count `items` with no cancellation filter**, while
  `channel` filters cancelled movements. That asymmetry is the original's
  (`refUsage`, index.html:2980-2982), not an oversight.
- **`serfiyyat_channel` rows are parsed and deliberately withheld.** Both
  directions are asserted, so 3b only adds the gate rather than a second RPC.
- `T1` (regenerating `database.ts`) proved unnecessary — `reference_values`,
  `items` and `get_reference_values` were already in the generated types.
- **`fetchReferenceValues` must absorb BOTH failure shapes.** A returned
  `{ error }` *and* a rejected promise (network/fetch) both have to yield
  `ready:false`; the original's try/catch (995-1004) covers both. Found by the
  Phase 3a audit — the first version handled only the returned error, so a
  rejection escaped into the store's `Promise.all` and blanked the whole page.
  Any future API in this load path needs the same treatment.

## Phase 3b — what was built (2026-09-02)

New: `api/serfiyyatProjects.api.ts` (+ test). Changed:
`types/referenceDirectory.ts` (all eight wired; `nameLockedWhenUsed` and
`usageById` rule fields; `entityUsageKey`; `linkedWarehouse` on the entity),
`api/referenceUsage.api.ts` (location/project/serfiyyat_channel counting,
`UsageEntity` now carries `id`, documents passed in via `UsageSources`),
`store/referenceDirectory.store.ts` (serfiyyat load, `activeWarehouseNames`),
`ReferenceDirectoryFormDialog.tsx` (linked-warehouse field, typed-name delete
gate), `ReferenceDirectoryPage.tsx` (`usageOfEntity`, two more watched tables),
and four test files.

Things worth knowing before touching Phase 3b code:

- **The Sərfiyyat gate needs all three reads.** `serfiyyat_lines` is read as a
  bare `id` probe and none of its columns are used — only its success. A
  two-read implementation passes S1-S3/S5 and fails only S4, which is why that
  test exists and was verified to fail against the shorter version.
- **`project` usage is keyed by id, everything else by name.** Use
  `usageOfEntity`/`entityUsageKey`, never a raw name lookup, or two same-named
  projects silently share a count.
- **`linked_warehouse` is always resent** (Q4). The dialog seeds its state from
  the stored value precisely so a name-only edit cannot clear the link.
- **`serfiyyat_lines` is not in `WATCHED_TABLES`** on purpose: it drives no row
  or count on this screen, only the readiness probe at load time.
- `REF_EQ` inherits JS `toLowerCase()`, so Azerbaijani `SM KANALI` does **not**
  match `SM kanalı` (dotted vs dotless ı). The old platform behaves the same;
  a test pins it so nobody "fixes" it into a divergence.

### Audit fix applied (Phase 3a)

One blocking resilience gap was found and closed: `fetchReferenceValues()` is
now wrapped in try/catch (registry **M3-06a**). Three tests pin it — a
`mockRejectedValue` case, a non-Error rejection, and a store integration case
running the real API against a rejecting client — and all three were confirmed
to fail against the unguarded version before the fix was kept.

Three pre-existing test assertions were updated for the larger row set they now
legitimately see (totals 4→8, watched tables 4→6). No Phase 1/2 behaviour was
changed.

## Phase 4 — Audit jurnalı: current state (2026-09-03)

**Status: `ACCEPTED` — explicit user decision, 2026-09-03, without the live
comparison.** Module E (`M4-01…M4-18d`) is implemented and Codex-audited.
Read-only module — no create/update/hide/delete path exists, so it carries no
live-mutation gap, unlike Module D.

The acceptance is **conditional in substance**: it closes the phase but
explicitly carries the unrun populated-data comparison forward. Do not read
`ACCEPTED` here as "live verified" — see the accepted exception below.

**Automated verification passed:** 450 tests / 30 files, typecheck, lint,
build, `git diff --check` — all clean. (432 at implementation; 448 before
`M4-18d`.)

### Accepted exception — standing check, not closed

Both the old and the new platform currently show **zero `audit_log` rows**, so
the live comparison could only confirm an identical empty state. **Never
compared against live data, and not covered by this acceptance:**

- non-empty row rendering;
- actor / action / object detail resolution;
- filtered counts, and the nav badge against a real unfiltered count;
- multi-page navigation.

**Run this comparison once `audit_log` holds records**, and only then promote
the affected registry rows to `LIVE VERIFIED`. Durable record: registry
Module E STATUS section and the Phase 4 plan §Acceptance.

### Files

`web/src/api/auditLog.api.ts` · `userDirectory.api.ts` · `auditTotal.api.ts` ·
`web/src/lib/auditSummary.ts` · `web/src/store/auditLog.store.ts` ·
`web/src/pages/AuditLogPage.tsx` (owns the print stamp; takes an injectable
`now` so a test can open at one time and print at another) ·
`web/src/components/PrintHead.tsx` (stateless; `stampedAt` comes from the
caller) ·
`web/src/App.tsx` (minimal two-page nav switch) ·
`web/src/store/referenceDirectory.store.ts` + `pages/ReferenceDirectoryPage.tsx`
(list controls moved into the store). Each has a colocated `.test.ts(x)`.

### Codex findings — all FIXED

1. **M4-18** — Soraqçalar list controls (kind, status, search, page size, page)
   were lost on navigation. Moved from component state into the store. Five
   regression tests; the four preservation tests were verified to fail against
   the pre-fix code.
2. **M4-18b** — print parity. Added `PrintHead` + `@media print` CSS ported
   from `index.html:1238-1243/203`; «Çap» previously produced an untitled,
   undated, unattributed sheet.
3. **M4-18c** — the page refetched the user directory on every mount, letting
   a transient failure replace a good directory with an empty map. Now
   boot-scoped only; rows still re-read per visit, matching `rLog()`.
4. **M4-18d** (2026-09-03, after Codex confirmed 1-3) — the print timestamp
   was computed during render, so a tab left open printed the date the page
   was *opened*, not the date it was printed. The original evaluates
   `new Date()` inside `printHead()`, which the «Çap» handler calls before
   printing (index.html:1242/7167). Now stamped in the click handler and
   committed with `flushSync`, because React's batching would otherwise leave
   the header empty when `window.print()` reads the DOM — that ordering is
   what the original's `setTimeout(…, 60)` buys. `PrintHead` takes a
   `stampedAt` prop and renders no subtitle before the first print, matching
   the original's empty `#printhead`. Three tests pin it (A/B stamping, DOM
   present at print time, no subtitle before the first «Çap»), **all verified
   to fail against the pre-fix code** — including the ordering case against a
   batched `setPrintedAt` without `flushSync`.

### Pending — carried through acceptance, deliberately

- **Live comparison still not done** — see the accepted exception above. It
  remains the one check that would make this module's row rendering,
  filtering and pagination live verified.
- **Printed output has never been inspected in a real print preview.**
  `M4-18b` rests on DOM structure and CSS presence, `M4-18d` on call
  ordering.
- **Sync indicator shows «bağlı deyil» on Audit jurnalı**, because the Realtime
  subscription belongs to the reference page and unmounts with it. Recorded for
  review. **Do not add an `audit_log` subscription — Q3 forbids it.** The real
  fix is shell-scope (connection state not owned by one page).
- **Deferred visual backlog** unchanged: V-01 thousands separators, V-02
  action-button presentation, V-03 empty-state width (Module D audit).

### Approved decisions in force

Phase 4 Q1-Q5 (no UI role gate · Excel export stays disabled · no Realtime ·
`record_id` under the object name · date-boundary strings and timezone
behaviour preserved exactly) — full text in
`docs/superpowers/specs/2026-09-02-react-migration-phase4-audit-log-proposal.md` §4.
Phase 3 Q1-Q8 remain in force; see that phase's design §10. Registry evidence
per row: `ANBAR_FUNCTIONAL_PARITY_REGISTRY.md` Module E.

### Production safety — unchanged

Old and new platforms share one Supabase project, so localhost writes are real
production writes. `VITE_ALLOW_LOCAL_WRITES` stays unset; this module has no
write path and the guard was not touched. No change to Supabase, SQL/RPCs, root
`index.html`, GitHub remote, Vercel or production data.

## Required next action

### Latest handoff — test environment and Phase 5 live evidence (2026-09-04)

**Use only this working repository:**
`C:\\Users\\HP\\Desktop\\MY COMPUTER Torsion\\MY\\Anbar platforması\\ANBAR_SHARED\\anbar-platformasi-github`.
The earlier `Codex_Code_chat` copy is no longer the working copy.

An isolated **test** Supabase project is available for live checks. Start it
only with `scripts/start-test-environment.ps1`; its git-ignored
`web/.env.sandbox.local` is test-only and allows test writes. Never copy its
values to `web/.env`, and never write to the production Supabase project.

Phase 5 test checks already passed: test-admin sign-in; Nomenklatura list and
card; create/edit, paste import, category assignment and bulk add; non-admin
server refusal with no unintended rows; movement-derived balance/value/count;
and generated Excel workbook inspection. The test list currently shows
`TEST Mal 1`: balance `8.00`, value `100.00 ₼`, 3 movements. These are test
records only.

**Historical status at this point in the chronology (superseded 2026-09-08):**
visual Windows print-preview inspection from Nomenklatura `Çap` was still
listed as open. It is no longer an acceptance requirement because the product
owner confirmed that `Çap` has never worked anywhere in the platform.
`M5-55` remained BLOCKED by the unmigrated
Yeni əməliyyat screen. Do not begin a new implementation phase until Codex
records the final Phase 5 result and the user requests the next phase. Do not
use subagents.

0. **Phase 5 Codex re-audit.** The fourteen findings are fixed and the checks
   are clean, but Phase 5 is **not** `ACCEPTED` and must not be marked so
   before Codex re-audits the changed paths and resumes browser acceptance.
   Still outstanding for that pass, and explicitly **not** claimed here: the
   live mutation pass on all five write paths (per-write approval required),
   `T1`'s payload measurement (marked done previously with no recorded counts
   — treat as pending), comparison of a **real generated Excel file**, and a
   **print-preview** inspection. `M5-55` stays `BLOCKED`.
1. **Phase 4 populated-data comparison — standing check, deferred not
   dropped.** Module E is `ACCEPTED`, so this no longer blocks the phase, but
   it is the only thing that can make its row rendering, actor/action/object
   detail, filtered counts and multi-page navigation `LIVE VERIFIED`. Run it
   as soon as `audit_log` holds records, and check the nav-badge total against
   the real unfiltered count.
2. **Phase 2 live verification** and **Phase 3 live mutation pass** — unchanged;
   both need `VITE_ALLOW_LOCAL_WRITES=true` set deliberately plus per-write
   approval. Phase 3 Q1 keeps `location`'s write path `NOT LIVE VERIFIED`.
   Module D stays `ACCEPTED`-blocked on this.
3. **Sync-indicator review** (shell-scope; **no `audit_log` subscription**,
   Q3) and the **final visual review** (V-01…V-03).
   Note: Phase 5's `A10` fix gives **Nomenklatura** its own subscription, so
   that screen no longer reads «bağlı deyil». This does **not** close the
   item — Audit jurnalı still shows it, and the real fix remains moving
   connection state out of any single page into the shell. Per-page
   subscriptions are a workaround, not the design.

## Phase 5 — Nomenklatura, FULL parity (Module F): `CODE VERIFIED`

**Implemented 2026-09-03 · audited by Codex the same day (verdict CHANGES
REQUIRED, 14 findings) · all 14 findings remediated 2026-09-03. Awaiting the
Codex RE-AUDIT; still no live verification of anything.**
Documents:
[proposal](specs/2026-09-03-react-migration-phase5-nomenclature-proposal.md) ·
[plan](plans/2026-09-03-react-migration-phase5-nomenclature.md) ·
[audit](audits/2026-09-03-phase5-codex-audit.md) ·
[xlsx risk record](decisions/2026-09-03-xlsx-dependency-risk.md) · registry
Module F (`M5-01…M5-55`).

**Checks: 843 tests / 54 files, typecheck, oxlint, build, `git diff --check` —
all clean** (716/50 at first implementation; 450/30 before this phase).

### The audit and what it changed (2026-09-03)

The first Phase 5 implementation was **rejected**. Four findings were P1 and
two of them were real defects against production data:

- **`A01`** — a bulk update whose pasted row omitted a price **erased the
  stored price** (sent 0 where the original sends the existing value).
- **`A02`/`A03`** — both import dialogs would apply the *valid subset* of a
  file containing invalid rows; the original blocks the **entire** file.
- **`A04`** — the item card was unreachable: `.drawer` styles were never
  ported, so the aside rendered `position:static` at the bottom of the
  document, behind the fixed mask.

The other ten (`A05`-`A14`) restored lost selection checkboxes, file uploads,
the editable create-code, the hidden-category exception and the missing
category suggestion, Realtime, movement read ordering, the transfer route and
warehouse alias, the sticky «Hamısını göstər», and the
reference-load-failure distinction.

Every finding was **re-confirmed against `origin/main:index.html` before being
fixed** — not taken on the audit's word — and every fix has regression tests
verified to fail against the pre-fix code. Per-finding detail: registry Module
F header; implementation notes: the plan's «Audit remediation» section.

**Two documentation defects the audit also caught, now corrected:** the
registry claimed `CODE VERIFIED` while all 54 rows read `NOT STARTED`; and
`M5-36` (category suggestion) was recorded as delivered when no implementation
existed. It was **built**, not re-marked.

Full scope delivered: list, search, four filters, balances, values, movement
counts, duplicate logic, formatting, print, the 3000-row cut, Excel export,
create, edit, bulk creation, item import, category import, the item card, and
role + server-refusal behaviour. `nreq` and `grp` remain separate future
phases. **`D-F1` does not exist** — the read-only scope was withdrawn.

**Approved decisions in force:** Q1 **(c)** (read the needed movement columns,
derive client-side — no SQL change; the precedent for later data-heavy
modules) · Q2 superseded, Excel **in scope** · Q3 keep the 3000-row cut · Q4
`nf`/`money` verbatim, V-01 still deferred · Q5 **(a)**.

### The one row that is NOT complete

**`M5-55` is `BLOCKED`, not `CODE VERIFIED`.** The card's «Bu mal üzrə
əməliyyat» renders visibly but **disabled** with a tooltip. `prefillOp()`
(index.html:3452) both navigates to Yeni əməliyyat **and pre-fills the item
into that screen's in-memory form**, so an old-platform link could not carry
the selection across — which is why a link was rejected. **Do not close this
row until Yeni əməliyyat is implemented and live verified**; that phase must
carry it as an entry criterion.

### Before touching this code

- **R-F5, silent RLS refusal.** `items` is written directly, not via an RPC. An
  RLS-blocked UPDATE returns `{data: [], error: null}` — success-shaped, zero
  rows. The `.select()` + `length === 1` checks in `api/itemWrite.api.ts` are
  the contract; removing them was tried, and four tests fail without them.
- **Bulk apply is NOT atomic** (`emitMany`, 1155-1159) — preserve it, and never
  report it as a rollback. Category import, by contrast, **is** atomic.
- **Three name normalisers coexist** (`dupNormalise`, `NORM`, `refEq`), each
  pinned by a test against a pair the others treat differently.
- **`xlsx@0.18.5`** is exactly what production loads (index.html:5). Two
  high-severity advisories, both about **parsing** — so the `.xlsx` import
  path is genuinely exposed; export is generation-only and is not. Kept for
  parity as an **accepted, documented risk, not a safe choice**: fixed builds
  exist only on SheetJS's own CDN and npm's newest published version is still
  0.18.5, so `fixAvailable:false` is accurate for this channel. **Do not
  upgrade or replace it without explicit approval** — it is a platform-wide
  supply-chain decision. Full record:
  [`decisions/2026-09-03-xlsx-dependency-risk.md`](decisions/2026-09-03-xlsx-dependency-risk.md).
  **The bundle grew 476 kB → 938 kB.**
- **`toNum` does NOT protect zero-padded codes.** `0000001` exports to Excel as
  the number `1`. The legacy implementation does the same, so it is inherited,
  preserved for parity and **pinned by a test** (`R-F9`). A comment in
  `lib/xls.ts` used to claim the opposite; it was wrong and is corrected.
- **Both import dialogs gate the whole file twice** — disabled button *and* an
  independent refusal inside the handler — because the original distrusts
  button state against DOM tampering (index.html:5879-5884). Do not simplify
  either barrier away.
- **`csv.ts` deliberately keeps blank-code rows.** They must reach the
  classifier and fail there; skipping them made a malformed file look clean.
- **The `.drawer` CSS is load-bearing, not cosmetic.** Without it the item card
  is unreachable. A stylesheet-text test (`src/index.css.test.ts`) pins the
  rule and the mask(100) < drawer(101) < modal(120) layering, because jsdom
  applies no styles and a DOM test cannot see this class of failure.
- **«Show all» must stay sticky.** `SHOW_ALL['nom']` survives filter changes in
  the original; `setFilters` must not clear it (Q3, `A13`).
- **Reference load: «failed» ≠ «ready but empty».** Failure falls back to the
  built-in lists; a ready-but-empty directory stays empty, or an Admin's
  hidden values would silently reappear (`A14`).
- `VITE_ALLOW_LOCAL_WRITES` stays **unset**; all five write paths are tested
  against mocks only. Live verification comes after the audit, covers every
  function of the screen, and needs per-write approval.

## Source documents to read first

1. `docs/superpowers/ANBAR_REACT_MIGRATION_PRINCIPLES.md`
2. `docs/superpowers/ANBAR_FUNCTIONAL_PARITY_REGISTRY.md`
3. Relevant phase spec and plan
4. `.superpowers/sdd/` ledger/progress for the current phase
5. `origin/main:index.html` and the actual live Supabase contract


## Phase 7 — Yeni əməliyyat (Module H): milestone H-1 done, phase INCOMPLETE

**Status: H-1 implemented 2026-09-04. NOT `ACCEPTED`. NOT `LIVE VERIFIED`. NO
LIVE WRITE HAS OCCURRED.** Module H is ONE acceptance boundary; H-1 is a
sequencing step with no status meaning of its own.

Documents:
[proposal](specs/2026-09-04-react-migration-phase7-new-operation-proposal.md) ·
[plan](plans/2026-09-04-react-migration-phase7-new-operation.md) ·
[Module H ledger](specs/2026-09-04-phase7-registry-rows.md) ·
[design audit](audits/2026-09-04-phase7-design-codex-audit.md) ·
[H-D2 finding](decisions/2026-09-04-initial-balance-server-gap.md).

### What H-1 delivered — T1, T1b, T2, T2b, T3

Pure logic, the load/readiness matrix and the API transport layer. **No page, no
store, no dialogs, no navigation, no posting UI.**

**Row status, corrected after the H-1 audit (`A03`): 31 `CODE VERIFIED` + 25
`IN PROGRESS`** — mocks only, never live. The first pass promoted all 56 touched
rows, which overstated 25 whose helper/API half is done but whose full contract
also needs the store, form, dialog or handler H-1 deliberately omits. Each of
those now names its H-1 evidence and its completing milestone. Everything else
stays `NOT STARTED`, `M5-55` included.

**Checks after audit remediation: 1356 tests / 78 files, typecheck, oxlint,
build, `git diff --check` — all clean** (986/61 baseline; 1350/78 at audit
time). No Phase 1-6 behaviour changed.

New `lib/`: `opTypes` · `condSplit` · `icareExposure` · `qaimeConflict` ·
`opLineValidation` · `bulkWriteOff` · `layerAllocation` · `opDraft` ·
`opPayload` · `opReadiness`. New `api/`: `stockConditions` · `stockLayers` ·
`movementSplit` · `transferDestinations` · `documentEditImpact` ·
`postMovementDocument`. Modified: `warehouseScope.ts`, `mutationGuard.ts`,
`partners.api.ts`.

### Before touching this code

- **`lib/opReadiness.ts` is the single post gate.** `canPost()` /
  `postBlockReason()` are consulted by every future button AND handler. Do not
  add a second condition anywhere — that scattering is what allowed the two
  silent-write paths this module exists to close.
- **Two legacy hazards are CORRECTED, not copied** (principles §7, rows
  `M7-S2`/`M7-S3`). (1) `fetchAll()` returns rows gathered before an error
  (index.html:855) and the op-screen refresh callers ignore the `ok` flag, so a
  truncated `movements` read overstates stock — here a partial read is FATAL.
  (2) `condsReady` gates only `canEditCond()` (2149), NOT `condBuckets()`
  (2087), so a failed `stock_conditions` read makes every bucket 0 and posts
  rented/unfit stock as `normal` — here that read is CORE and blocks posting.
  **Both were verified to fail against a deliberately naive port (7 failures)
  before the correct version was kept.**
- **Core reads are `items`, `movements`, `warehouses`, `partners`,
  `stock_conditions`.** Optional: the four probes/fallbacks. Every core read
  must absorb BOTH failure shapes and report a partial page as a failure.
- **`readPartners()` is the Phase 7 contract; `fetchPartners()` is untouched**
  because Phase 2/3 depend on its throwing behaviour. Do not merge them.
- **`D-H1` lives in two NEW exports** — `transferSourceWarehouses()` and
  `transferDestWarehouses()`. The legacy `sourceWarehouses()` keeps its wider
  behaviour for Phase 6. Admin behaviour is unchanged; both halves are pinned.
- **Idempotency is NOT uniform.** Only the two LAYER RPCs take a request key.
  `post_movement_document` and `post_transfer_document` take none, so a
  duplicated submit creates a duplicate document — the in-flight lock (H-2) is
  the only protection. Never call those two server-guaranteed.
- **The `Json` cast lives at the RPC boundary**, in `postMovementDocument.api.ts`,
  deliberately: widening the payload interfaces with an index signature would
  let any key through and weaken the contract they exist to express.
- Inherited quirks pinned by tests: the İcarə `.005` float rounding
  (`(5.005-5)*100 = 0.4999…` → 0) and the Azerbaijani dotless-ı casing in
  `isInitialBalanceLine` (an ALL-CAPS type does not match). Do not "fix" either.
- **`fetchSplitSupported()` returns `data === true`, not `!error`** (audit A01).
  A server that exposes the function but answers `false` is saying it cannot
  preserve a split; reading that as "supported" sends `conditions` the server
  silently drops. No truthiness coercion — `'true'` and `1` are false.
- **Every paged read MUST carry a deterministic `order()` before `range()`**
  (audit A02). `stock_conditions` is ordered by `warehouse, item_code`, its
  PRIMARY KEY. Without it PostgREST page boundaries can skip rows *while every
  request succeeds*, and a skipped condition row posts rented stock as `normal`.
  The same rule already applies to `fetchItemMovements` (Phase 5 A11).

### Measurements

**`M6-40` CLOSED** — 3 reads, 10 rows, 1 573 B uncompressed / 689 B gzip.
**`M7-123` OPEN** — reads 4-9 recorded (854 B / 530 B; combined 1-9: 2 427 B /
1 219 B). **Read 10 `get_stock_layers` is NOT measured**: the test project's
`stock_layers_supported()` returns `null`, so layer mode is inactive and the RPC
raises. All figures are TEST-project only and say nothing about production
volume.

### H-D2 — a real finding, reported not fixed

**The «Əvvələ qalıq» + «Anbar qalığı» admin-only rule is CLIENT-ONLY in
production.** No live function or trigger mentions «Anbar qalığı», and
`post_movement_document` has no such check, despite the code comments citing
`sql/016` and CLAUDE.md §12 asserting server enforcement. The client rule is
ported verbatim and described honestly; a read-only preflight and a proposed
migration are designed in
[decisions/2026-09-04-initial-balance-server-gap.md](decisions/2026-09-04-initial-balance-server-gap.md)
for SEPARATE approval. **No SQL was written to any database.**

### Safety confirmation for H-1

`VITE_ALLOW_LOCAL_WRITES` remains unset in `web/.env`. **No live write was
performed anywhere.** Test-project access was read-only (`SELECT`s and read-only
RPC probes) and created, updated or deleted nothing. Production
`bbjmhaerssakbreykxiw` was never connected to. No Supabase schema, RPC, RLS,
trigger, root `index.html`, GitHub or Vercel change. Nothing staged or committed;
all pre-existing working-tree changes preserved.

### Milestone H-2 — T4 (store) + T5 (page/form): implemented 2026-09-04

**Status: NOT `ACCEPTED`. NOT `LIVE VERIFIED`. NO LIVE WRITE HAS OCCURRED.**
Module H remains ONE acceptance boundary (proposal §3); H-2 only extends how
much of it now has evidence. H-3 (dialogs), H-4 (navigation, `M5-55`, pinning)
and H-5 (checks + the single live gate `T10`) are still ahead. **No live write
before H-4 is complete and every posting route exists.**

**Checks after H-2: 1441 tests / 84 files, typecheck, oxlint, build and
`git diff --check` — all clean** (1356/78 baseline, re-confirmed green before
the first edit; H-2 adds 85 tests in 6 new files). *Superseded twice since: the
`A01`-`A07` pass reached 1459/84 and the `A08`-`A11` pass 1474/84 — see the
two remediation sections below.* No Phase 1-6 behaviour
changed, and every pre-existing uncommitted working-tree change (the ~24 files
already modified before this session, plus `index.html`/`web/package.json`/
`web/package-lock.json`) is untouched.

#### Files delivered

`store/operation.store.ts` (+ colocated test, 37 cases) — the Zustand store
holding kind/header/lines/pick/editDoc/requestKey/inFlight and the bulk/edit-
line/layer-picker fields H-3 will wire dialogs against. `load()`/`refresh()`
are atomic over the five core reads only (`items`, `movements`, `warehouses`,
`partners`, `stock_conditions`), folded through T2b's `foldCoreReads()` before
any `set()` touches the committed snapshot; the four optional probes
(`reference_values`, `movement_split_supported`, `stock_layers_supported`,
`transfer_destinations`) load independently into their own readiness flags and
never gate the core commit. Also: per-tab header capture (M7-05), request-key
generation/invalidation on every mutation, the in-flight lock, draft
save/restore/TTL/permission-refilter (delegated to `lib/opDraft.ts`), edit-mode
enter/exit (draft cleared, never saved, per M7-52), and `prefill(code)` for
`M5-55`. `canPost`/`postBlockReason` are re-exported as selectors that call
T2b's functions directly — no second gate was added anywhere.

`pages/NewOperationPage.tsx` (+ test, 6 cases), `components/operation/`:
`OperationForm.tsx` (+ test, 19 cases — tabs, per-tab type list, header fields,
D-H1 route narrowing, the item combobox with the M7-20 outbound stock filter,
the M7-21 «Yeni mal yarat» empty-result link, condition-split rendering and
M7-31's reject-not-trim rule), `ItemStatePanel.tsx` (+ test, 5 cases — M7-24,
pending lines ignored by construction), `DraftLinesPanel.tsx` (+ test, 15
cases — totals/priceless counter, remove/edit hooks, the restore banner,
the post/clear buttons gated on the store's `canPost`), `LoadErrorState.tsx`
(+ test, 2 cases — M7-S1, no row-count claim on a failed initial load).
Page-scoped Realtime is wired on exactly `['items','movements','warehouses']`
(Q2 pattern); a Realtime refresh never discards `OP.lines` (M7-119, pinned in
both the store and the page test suites).

#### Explicitly NOT in H-2 — real gaps, not oversights

- **No dialogs.** `EditLineDialog`, `BulkPickDialog`, `LayerPickDialog`,
  `IcareConfirmDialog`, `QaimeConflictDialog`, `PostConfirmDialog`,
  `ClearLinesDialog`, `EditModeBanner` are all H-3. `OperationForm` exposes the
  boundary honestly: the bulk-pick affordance (`isWoOut`/`isMvPick`) renders a
  placeholder notice instead of the real dialog, layer routing calls
  `onNeedsLayerPick` instead of opening `LayerPickDialog`, and «Yeni mal yarat»
  calls `onCreateItem` instead of opening the reused `ItemFormDialog`. None of
  these invent a temporary browser-native substitute (no `confirm()`/`prompt()`
  bypass) — each is a named, tested handler boundary a future milestone fills.
- **No posting.** `NewOperationPage`'s «Sənədi qeyd et» consults `canPost`
  (blocks correctly when false) but its success path is a toast saying H-3/H-4
  will wire the real confirm-dialog → Qaimə-conflict → İcarə-confirmation →
  post-RPC sequence (M7-91). No RPC is called from anywhere in H-2.
  `VITE_ALLOW_LOCAL_WRITES` stays unset in `web/.env` (verified before and
  after this milestone).
- **No navigation, no `M5-55` wiring, no `ItemCard` change.** `App.tsx` is
  untouched; `prefill()` exists on the store and is tested, but nothing calls
  it yet outside the store's own test. `ItemCard`'s disabled tooltip is
  unchanged — that removal is explicitly reserved for the T7/H-4 commit.
- Registry rows are updated below only where H-2 completes a row's full
  contract; rows whose dialog/posting half is still missing keep their H-1
  `IN PROGRESS` wording, now naming H-3/H-4 as before.

#### A real bug found and fixed during H-2 (not by audit — caught by the
     store's own test suite before any review)

While writing the M7-S6 "failed refresh retains the snapshot" test, `load()`
was found to re-derive `core` from the FAILED read's (empty) rows whenever
`folded.loaded` was `true` — which is also true in the RETAINED-after-failure
case, not only on a fresh success. That silently overwrote a good snapshot
with an empty one on every failed refresh, the opposite of M7-S6. Fixed by
gating the `core` re-derivation on `folded.coreError == null`, not on
`folded.loaded` alone. The test that caught it is kept as a regression pin
(`operation.store.test.ts` → "keeps the previous core and sets the error in
the footer on a failed refresh").

#### Before touching this code

- **`DraftOpLineState` redeclares `q: number`.** It extends `opDraft.ts`'s
  `DraftLine`, whose `[k: string]: unknown` index signature would otherwise
  widen `q` to `unknown` for every consumer — caught by `tsc -b` (the build's
  project-reference typecheck), not by a plain `tsc --noEmit -p .` run on the
  app config alone. Run the real `npm run build` before trusting a typecheck
  pass on this store.
- **`core` is only ever replaced by `deriveCore()`, and only on a
  `coreError == null` fold.** Do not add a second branch that writes `core`
  outside `load()`/`refresh()` — M7-S6 depends on there being exactly one
  place that can overwrite the committed snapshot.
- **`OperationForm` hides the single-item combobox entirely under
  `isWoOut`.** Testing the combobox or the condition-split block requires an
  `out` type OTHER than «Silinmə» (e.g. «Sahəyə») — «Silinmə» routes to the
  bulk-pick affordance and the single-item block does not render at all. This
  is legacy behaviour (M7-56), not a test artifact.
- **jest-dom matchers are not available** (`toBeInTheDocument()` etc. — no
  `setupFiles` registers them in `vitest.config.ts`). Every component test in
  this codebase uses `.toBeTruthy()` / `.toBeNull()` instead; follow that
  convention, not the jest-dom one.
- **The draft is protected in TWO layers on purpose (`A08`).**
  `restoreDraftOnBoot()` refuses an unloaded/errored snapshot AND
  `NewOperationPage` refuses to attempt the restore or arm saving on a failed
  load. Do not «simplify» by deleting either check: the store guard alone
  still lets the page's save effect wipe the key with the error screen's empty
  `lines`, and the page guard alone breaks the moment another caller invokes
  the action. `restoreDraftOnBoot()` returns `skipped` to distinguish
  «refused, draft untouched» from «read and rejected».
- **The header defaults effect writes THROUGH the store (`A10`), and its
  option lists are the only rules source.** If you add a header field, add its
  default to that one effect rather than a second initialiser — a second
  source is exactly what lets a tab offer a value its validator rejects. The
  selects for type/warehouse/destination/counterparty deliberately have NO
  blank option (legacy renders none); the channel select legitimately keeps
  its «—».
- **The outbound stock predicate must stay BEFORE `.slice(0, 12)` (`A09`).**
  Filtering after the cut silently hides in-stock items whenever 12 unstocked
  text matches sort ahead of them. The regression fixture builds exactly that
  case.
- **Module H row statuses live in the registry TABLE, not in prose (`A11`).**
  The milestone sections in
  [`specs/2026-09-04-phase7-registry-rows.md`](specs/2026-09-04-phase7-registry-rows.md)
  say what changed and why; they must not restate a row's status. A promotion
  list in prose is what made the ledger self-contradictory in the first place.

### H-2 remediation (2026-09-04) — Codex audit A01-A07

**Status unchanged: NOT `ACCEPTED`, NOT `LIVE VERIFIED`, no live write.** An
independent Codex audit
([`audits/2026-09-04-phase7-h2-codex-audit.md`](audits/2026-09-04-phase7-h2-codex-audit.md))
found seven defects against `T4`/`T5` — two at P1. All seven are fixed here,
each with a regression test verified to fail against the wrong implementation
the audit described:

- **A01 (P1)** — `NewOperationPage`'s save-on-every-mutation effect ran before
  the one-time boot restore completed, so `saveDraftNow()` deleted the stored
  draft (empty initial `lines`) before `restoreDraftOnBoot()` ever read it —
  silently destroying the exact data `M7-51`…`M7-55` exist to protect. Fixed
  with a `restoreArmed` ref that gates the save effect until the restore
  attempt (success or failure) has completed.
- **A02 (P1)** — `OperationForm.onWarehouseChange()` cleared pick/query/split
  on `out`/`mv` but left `qty` armed, so a stale quantity could reach the next
  item. Fixed: `qty` is now cleared alongside the pick on `out`/`mv`, left
  alone on `in`.
- **A03 (P1)** — outbound «Qaytarma» rendered the project/location list
  instead of switching to `partnerOptions('in')` (the goods return to their
  OWNER). Fixed with the legacy list swap, keeping a still-valid current
  value or selecting the first option otherwise.
- **A04 (P2)** — `observedChannels` was derived from `MovementRow.type`
  instead of `movement.channel`. `MovementRow`/the movement read now select
  `channel` (additive column, no schema change) and the fallback derives from
  it after cancellation filtering.
- **A05 (P2)** — the combobox searched on every keystroke with no debounce,
  and gated code matching behind a leading-digit check. Fixed: 160 ms
  debounce and unconditional code substring matching, both fake-timer tested.
- **A06 (P2)** — `DraftLinesPanel`'s `routeText()` rendered only the warehouse
  for `in`/`out`, dropping the counterparty and the operation type. Fixed:
  all three plain route forms (`p → w` / `w → p` / `w → w2`) now render with
  the operation type. The layered `sourceAmount`/`priceVariants` model this
  row also needs is still open — `M7-40` stays `IN PROGRESS`, named for H-3.
- **A07 (P2)** — the restored/dropped toast (`M7-54`) was never surfaced by
  the page despite the narrative claiming the restore cycle complete, and the
  registry's per-row statuses still said `NOT STARTED` while the narrative
  claimed promotions. Fixed: the page now shows the exact legacy toast
  wording on a successful restore, and
  [`specs/2026-09-04-phase7-registry-rows.md`](specs/2026-09-04-phase7-registry-rows.md)
  is corrected in place — overclaiming bullets are marked with the
  correction, not silently rewritten.

**Checks after remediation:** see the test/typecheck/lint/build run reported
at the end of this remediation session. No `H-3` dialog, navigation or
posting work was started — scope was strictly the seven findings plus their
regression tests. `VITE_ALLOW_LOCAL_WRITES` remains unset; no live read or
write was performed.

### H-2 remediation, second pass (2026-09-04) — Codex audit `A08`-`A11`

**Status unchanged: NOT `ACCEPTED`, NOT `LIVE VERIFIED`, no live write.** The
independent re-audit of the `A01`-`A07` pass (same audit file, section
«Re-audit after A01-A07 remediation») confirmed `A02`-`A07` and their tests,
but found `A01` fixed only for a SUCCESSFUL initial load and raised four
further defects, one at P1. All four are fixed here. `A02`-`A07` are
preserved unchanged — their regression tests still pass.

- **`A08` (P1)** — a failed initial core load could still DELETE the saved
  draft. `A01`'s fix armed the save effect after `load()` resolved without
  checking whether the core load succeeded; on a core failure the store
  supplies an empty permission set, `restoreDraft()` classifies every stored
  line as `no-permission`, and that branch removes the localStorage key,
  turning a transient network/read failure into permanent local data loss.
  Fixed in BOTH layers so neither alone can cause the loss:
  `restoreDraftOnBoot()` now refuses an unloaded or errored snapshot and
  returns `skipped:true` without touching storage or state, and
  `NewOperationPage` neither attempts the restore nor arms saving unless the
  load returned `ok` with no error. Mounting onto an already-healthy snapshot
  now actually ATTEMPTS the restore rather than only arming future saves.
- **`A09` (P2)** — `OperationForm` took the first 12 text/code matches and
  only then filtered by positive stock, so a search whose first 12 matches
  were all out of stock reported «no result» even when a later match had
  stock. The outbound/mv stock predicate now runs BEFORE the 12-row cut,
  matching `index.html:3311-3317`; inbound stays unfiltered and still cut to
  12.
- **`A10` (P2)** — the form rendered a blank `—` option in the type,
  warehouse, destination and counterparty selects and initialised those
  header fields to empty, where the legacy form renders effective defaults
  immediately (`H.d || today()`, `H.w || ME.wh`, the first allowed type, the
  first valid counterparty, the first destination ≠ `ME.wh`). Selecting
  «Silinmə» also only changed the displayed option list without pinning
  `header.p` to `Sahə üzərə məsul şəxs` as `M7-11` requires. Both are fixed
  by ONE effect that writes the defaults into the store through
  `onSetHeaderField`, so the per-tab header capture, the draft payload and
  the line builder all see the same values the user sees. No second rules
  source was created: the existing option lists (`types`, `allowedWh`,
  `transferSources`, `transferDests`, `partnerList`) remain the only place
  the allowed values are defined.
- **`A11` (P2)** — the H-2 status ledger was internally contradictory: the
  narrative claimed rows were promoted while their registry-table `Status`
  still read `NOT STARTED`. Every H-2 row was reconciled against its real
  implementation, and the narrative promotion list that was acting as a
  competing status source was DELETED. The per-row `Status` column is now
  the single effective status source for Module H.

**Reconciliation was not a blanket promotion.** Rows whose complete contract
H-2 delivers are `CODE VERIFIED` (`M7-01`, `M7-03`, `M7-05`, `M7-06`,
`M7-07`, `M7-08`, `M7-09`, `M7-11`, `M7-12`, `M7-15`, `M7-17`, `M7-24`,
`M7-27`, `M7-42`, `M7-43`, `M7-51`, `M7-53`, `M7-56`, `M7-105`, `M7-106`,
`M7-108`, `M7-111`, `M7-119`, `M7-S1`-`M7-S4`, `M7-S6`). Rows with a real
remaining half were DEMOTED from the narrative's claim to `IN PROGRESS`
naming the completing milestone: `M7-21` (the «Yeni mal yarat» dialog
transition is H-3), `M7-109` (the `document_edit_impact` caller is
H-4/Phase 8 per Q6), `M7-115` (navigation is H-4, and navigation alone is
explicitly not parity), `M7-S5` (H-3's dialog buttons must consult the same
gate), and `M7-13` (the out Qaimə hint is a generic shared string, not the
row's exact sentence, and is untested). `M7-14`, `M7-18`, `M7-22`, `M7-38`,
`M7-39` and `M7-44` were checked and left `NOT STARTED` — the mv both-legs
payload, the read-only unit FIELD (only a hint span exists), the focus
behaviour, the layer-routing/commit orchestration and the clear-lines
confirmation dialog are genuinely absent.

**15 regression tests were added**, each verified to FAIL against the
implementation the audit described and to pass after the fix: 5 for `A08`
(3 page-level — draft preserved byte-for-byte on a failed load, restored on a
later successful retry, restored when mounting onto a healthy snapshot; 2
store-level — skip on no snapshot, skip on a core error), 3 for `A09`
(the audit's required 13-matching-items fixture where only the last has
stock, the outbound-list contents, and inbound still unfiltered at 12 rows),
6 for `A10` (defaults from a genuinely EMPTY header, `ME.wh` default for an
anbardar, no blank option in the four selects, the transfer destination
default, the pin on a REAL type transition into «Silinmə», and no re-pin when
already correct). The `A09`/`A10` combobox tests use «Sahəyə» rather than
«Silinmə», because «Silinmə» routes to the bulk affordance and the combobox is
not rendered at all (`M7-56`, legacy behaviour).

**Checks after this pass: 1474 tests / 84 files passing, `npm run typecheck`
clean, `oxlint` clean (exit 0), `npm run build` succeeded, `git diff --check`
clean** (1459/84 was the re-audit's own confirmed baseline, re-confirmed green
here before the first edit; this pass adds 15 tests and no new test file).
`VITE_ALLOW_LOCAL_WRITES` remains absent from `web/.env`, verified before and
after. **No live read or write was performed, and no SQL, RPC contract, root
`index.html`, GitHub, Vercel or deployment change was made.** No `H-3` dialog,
navigation or posting work was started.

### Milestone H-3 — T6 (dialogs) + T6b («Yeni mal yarat»): implemented 2026-09-04

**Status: NOT `ACCEPTED`. NOT `LIVE VERIFIED`. NO LIVE WRITE HAS OCCURRED.**
Module H remains ONE acceptance boundary (proposal §3). H-4 (navigation,
`M5-55`, the post RPC) and H-5 (checks + the single live gate `T10`) are still
ahead. **No live write before H-4 is complete and every posting route exists.**

**Checks after H-3: 1559 tests / 92 files, typecheck, oxlint (exit 0), build
and `git diff --check` — all clean** (1474/84 baseline, re-confirmed green
before the first edit; H-3 adds 85 tests in 8 new files). `oxlint` was
sanity-probed with a deliberate `debugger` statement to confirm it is actually
linting rather than silently passing. No Phase 1-6 behaviour changed, and every
pre-existing uncommitted working-tree change is untouched — `index.html` still
carries only the previously recorded `manage_reference.p_id` diff.

#### Files delivered

`components/operation/`: `EditLineDialog.tsx` (15 tests), `BulkPickDialog.tsx`
(17), `LayerPickDialog.tsx` (13), `IcareConfirmDialog.tsx` (5),
`QaimeConflictDialog.tsx` (3), `PostConfirmDialog.tsx` (8),
`ClearLinesDialog.tsx` (4), `EditModeBanner.tsx` (2) — each with a colocated
test. Modified: `ItemFormDialog.tsx` (the ONE additive `presetName` prop, T6b),
`OperationForm.tsx` (the real «Malları seç» button replacing the H-2
placeholder; the mv Qaimə hint, `M7-14`), `NewOperationPage.tsx` (dialog
orchestration and the post GATE sequence).

#### What H-3 does and does not do

- **The post gate sequence is real** (`M7-91`): `canPost` → Qaimə conflict
  (hard block) → İcarə confirmation → the confirm dialog. What is still absent
  is only the final RPC call: `confirmPost()` toasts that posting is H-4
  instead of writing. No RPC is called from anywhere in H-3, and no
  browser-native `confirm()`/`prompt()` substitute was introduced.
- **`M7-S5` is now genuinely satisfied**: `PostConfirmDialog` receives
  `canPost`/`inFlight` as props from the same selector the panel uses and adds
  no local condition. Two tests pin that it refuses when either is false.
- **Every mandatory-reason gate is implemented TWICE** — disabled button AND an
  independent refusal in the handler (`IcareConfirmDialog`,
  `PostConfirmDialog`, `LayerPickDialog`, `BulkPickDialog`), the Phase 5
  `A02`/`A03` precedent.
- **Bulk apply is all-or-nothing and writes nothing** (`M7-66`/`M7-67`/
  `M7-68`): every produced line is validated against the draft AS IT GROWS, so
  two bulk rows on the same warehouse+item cannot together exceed the balance;
  one failure adds zero lines.
- **`M7-123` is unchanged and still OPEN** — H-3 measured nothing.

#### Before touching this code

- **`BulkPickDialog` never recomputes its own rows.** `rows` is built by the
  PAGE and passed in, because recomputing from a changing selection would
  rebuild the list on every keystroke and steal focus from the quantity input
  (`M7-61`). Do not move `bulkWriteOffRows()` inside the dialog.
- **`QaimeConflictDialog` has no continue button on purpose** (`M7-89`). A test
  asserts that no button matches /davam|anladım|təsdiq|qeyd et/. Adding one
  would turn a hard block into an advisory notice.
- **`applyIcareMark` strips before appending** (`M7-82`) — the user can confirm
  İcarə and then cancel the post dialog, so a plain concatenation stacks two
  markers on the second attempt.
- **The T6b dialog is REUSED, not reimplemented.** `presetName` is consumed
  only when `item === null`; a test verified to FAIL against seeding the name
  on edit pins that, because seeding on edit would silently rename the item.
  The permission and localhost guards remain the reused dialog's own.
- **`ItemFormDialog` refuses to render a form with no active unit** (`M7-21f`).
  Any page test exercising the create transition must seed a unit into the
  `fetchReferenceValues` mock, or it will hit that refusal instead.

#### Tests verified to FAIL against the wrong implementation

Per plan `T8`, three were checked by deliberately reverting the code and
re-running: `presetName` ignored when editing (1 failure), the split-cut
mismatch rejecting rather than trimming in `EditLineDialog` (1 failure), and
the `A01`/`A08` draft-restore pins which were re-run unchanged from H-2. The
correct implementations were restored and re-verified green in every case; no
wrong version was left on disk.

#### Still open for H-4 — **superseded; see the H-4 section below**

`M7-02`/`M7-115`/`M5-55` (navigation and the prefill transition), `M7-96`
(the stale-response re-check), `M7-97`/`M7-101`-`M7-104` (the post RPCs and
success cleanup), `M7-109`'s `document_edit_impact` caller, and `M7-123`'s
read 10. **All of these are closed by H-4 except `M7-109`'s caller (deferred
to Phase 8 per Q6) and `M7-123` (still OPEN, nothing measured).** `VITE_ALLOW_LOCAL_WRITES` remains absent from `web/.env`, verified
before and after this milestone.


## Milestone H-4 — T7 (navigation + `M5-55`) and the real post orchestration: implemented 2026-09-05

**Status: `CODE VERIFIED`. NOT `ACCEPTED`. NOT `LIVE VERIFIED`. NO LIVE
SUPABASE READ OR WRITE HAS OCCURRED.** Every posting route now exists, so the
single live gate `T10` (H-5) is the next step — and it needs separate user
approval for every individual write. Both production and test-project writes
remained forbidden throughout H-4 and none was attempted.

**Checks: 1649 tests / 93 files, typecheck, oxlint (exit 0), build and
`git diff --check` — all clean** (1574/92 baseline, re-confirmed green before
the first edit; H-4 adds 75 tests and one new file). `oxlint` was
sanity-probed with a deliberate `debugger` statement in the new library to
confirm it is actually linting the added code rather than silently passing.

### Files changed

**New:** `lib/opStaleRecheck.ts` + `lib/opStaleRecheck.test.ts` (15 tests).

**Modified:**

- `store/operation.store.ts` — the `postDocument()` action (M7-96…M7-104),
  the `pendingPrefill` field with `consumePrefill()`, and `clearStoredDraft()`.
- `pages/NewOperationPage.tsx` — `confirmPost()` now calls `postDocument()`
  and renders its outcome; the H-3 stub toast is gone.
- `components/operation/OperationForm.tsx` — the prefill effect and the new
  `onConsumePrefill` prop.
- `App.tsx` — the «Əməliyyat» rail group with «Yeni əməliyyat», the `op` page,
  and the `prefill → navigate` wiring handed to Nomenklatura.
- `pages/NomenclaturePage.tsx` — the optional `onOpenOperation` prop passed
  through to the card.
- `components/nomenclature/ItemCard.tsx` — the button is enabled, the
  `OP_TRANSITION_TOOLTIP` export is removed, `onOperation` is called.
- Tests: `NewOperationPage.test.tsx` (+52), `App.test.tsx` (+7),
  `ItemCard.test.tsx` (rewritten M5-55 block), `OperationForm.test.tsx`
  (helper types only).

### Posting routes wired

| Condition | RPC | Request key |
|---|---|---|
| transfer, layers inactive | `post_transfer_document` | none (no such parameter) |
| transfer, layers active | `post_layer_transfer_document` | yes |
| non-transfer, layers inactive | `post_movement_document` | none |
| non-transfer OUTBOUND, layers active | `post_layer_movement_document` | yes |
| edit mode | `correct_document` | n/a |

A layered movement post happens **only** when the document is outbound; an
inbound-only document takes the plain route even with layers active.

### What H-4 does

- **`M7-96`** is a pure module, not inline code. The layered-line rule — never
  trim, abort the whole post and keep the draft — is the reason: buried inside
  the handler it could not be tested without a page render. The edit restore is
  added ONCE per warehouse+item key, availability is decremented as lines
  consume it, drops and trims are reported in ONE message, and a trim returns a
  COPY so a refused document leaves the draft byte-identical. Any line mutation
  invalidates the request key.
- **`M7-103` is reported honestly.** The legacy screen toasts «Əməliyyat qeyd
  edilmədi» when the second of two sequential calls fails, which reads as
  "nothing was written" and is false — the transfer leg is already committed.
  The store returns a distinct `partial` outcome and the page says so, naming
  the written document. Nothing was made transactional; the two-call reality is
  preserved and pinned by test in both directions (second-call failure reports
  partial, first-call failure does not).
- **The in-flight lock** is set before the first await and released in a
  `finally` on every path — refusal, thrown rejection and success. A second
  click calls nothing because `canPost` already reads `inFlight`; a test drives
  the handler directly rather than relying on the dialog being closed.
- **One `canPost`.** The panel button, the confirm dialog and `postDocument()`
  all read the same selector value; a test flips it once and asserts all three
  follow.
- **`M7-122`** — every write API consults `blockedReason` itself. All four
  Phase 7 actions are tested blocked on localhost without the opt-in.

### The `M5-55` prefill race

`prefill(code)` is called from Nomenklatura BEFORE «Yeni əməliyyat» mounts, so
`core.itemBy` is empty at that moment. The form's seeding effect was keyed on
`[pick]` alone: it would fire once against an empty snapshot and never again.
The request is therefore held separately as `pendingPrefill` and consumed only
when the code actually resolves, so it survives the page load and any refresh
in between. Committing a line clears it, since the request is then spent.

**The mutation check for this one initially passed against the wrong
implementation**, which showed the first test was not exercising the real race
— a cold navigation renders the form only after `load()` resolves, so `[pick]`
happened to suffice there. A second test was added for the case that genuinely
depends on it: the page is already open when a prefill names a code the current
snapshot does not contain, and a LATER refresh brings it in. That test does
fail against `[pick]`.

### Deferred, and deliberately not faked

- **`M7-109`'s `document_edit_impact()` CALLER stays deferred.** Q6 (plan
  §"What this phase does NOT do") keeps the movements/document screen out of
  Phase 7 entirely, so there is no migrated caller to wire it to. H-4 invented
  no temporary navigation path and did NOT mark the row complete: the API and
  store half is `CODE VERIFIED`, the caller is Phase 8. The correction WRITE
  itself (`M7-97`) IS wired and tested — only its entry point is missing.
- **`M7-123` remains OPEN.** H-4 measured nothing. No browser Network
  measurement exists and none was estimated or fabricated.
- **`M7-118`** is `CODE VERIFIED` against MOCKS only. The live refusal texts
  are server-side and stay unverified until T10.
- **`M7-120`** — H-5 plus a follow-up read-only TEST inspection live-verified
  the ordinary movement-INSERT consequence (see the H-5 section below); the
  `correct_document`/İcarə half of the row is still unverified.

### Tests mutation-checked

Each was verified to FAIL against a plausible wrong implementation, then the
correct code was restored and re-verified green. No wrong version was left on
disk (each file was diffed against its backup afterwards):

| Reverted behaviour | Tests that failed |
|---|---|
| layered lines trimmed instead of aborting | 2 |
| edit restore added per line, not per key | 1 |
| trimming mutates the caller's line | 1 |
| no «Yazılacaq etibarlı sətir yoxdur.» refusal | 3 |
| route choice ignored (always non-layer) | 1 |
| layered movement route not outbound-only | 1 |
| partial success reported as "nothing written" | 1 |
| in-flight lock never set | 1 |
| lock not released in `finally` | 5 |
| invoice/contract not blanked on success | 1 |
| layer-mixing refusal removed | 1 |
| opening-balance admin-only refusal removed | 1 |
| navigation without the prefill | 2 |
| prefill effect keyed on `pick` alone | 1 |

The remaining `T8` rows were already pinned by earlier milestones and were
re-confirmed present rather than duplicated: the fatal partial `movements`
page, the `stock_conditions` refusal, the shared `canPost` gate, the Qaimə
two-leg collection (`qaimeConflict.test.ts:63`), cumulative `alreadyTaken`
(`icareExposure.test.ts:98`), transfer exposure using the SOURCE warehouse
(`icareExposure.test.ts:85`), the split-cut mismatch rejecting rather than
trimming, `condSplitPayload` omitting `normal`, the item-state panel ignoring
pending lines, edit mode clearing rather than saving drafts, the İcarə marker
staying singular, `D-H1` narrowing the anbardar only, and `presetName` ignored
when editing. Bulk all-or-nothing gained two new pins (the dialog guard and
`applyBulk`'s independent second guard).

### Safety confirmation

- **No live Supabase read or write occurred.** The five write transports are
  mocked at the API-module boundary in every test, so the store exercises the
  real routing and the real payload builders while no request leaves the
  process. No Supabase client is constructed.
- Root `index.html` — **byte-identical**, md5
  `b9be15c5ca59b68337863369620d72fa` before and after. Its pre-existing
  `manage_reference.p_id` working-tree diff is untouched.
- `VITE_ALLOW_LOCAL_WRITES` remains **absent** from `web/.env`, verified before
  and after. No env file was modified.
- No Supabase schema, SQL, function, RPC contract or data was touched.
- GitHub, Vercel, remotes, deployment and production were not touched. Nothing
  was committed, staged or pushed.
- `docs/CHANGELOG.md` was NOT updated, as instructed for this task.
- No direct Supabase call was added outside the existing API layer: the seven
  touched source files contain zero occurrences of `.rpc(`, `.from('` or a
  `supabase` import, except `App.tsx`'s pre-existing auth-session code, which
  H-4 did not change.
- No browser-native `confirm()`/`prompt()` bypass exists; a test spies on both
  and asserts neither is called during a post.

### Before touching this code

- **`postDocument()` is the only posting rule.** The page closes the dialog and
  formats the outcome; it decides nothing. Adding a refusal in the page would
  recreate exactly the scattered-gate problem `M7-S5` exists to prevent.
- **`staleRecheck()` must not mutate.** It returns trimmed COPIES precisely so
  that an aborted or refused post leaves the draft untouched. Switching it to
  in-place mutation would silently reduce quantities on a document that was
  never written; a test pins this.
- **`layerRevision` on a bulk row is `get_stock_layers`'s revision**, never
  `layerVersion` — unchanged from the H-3 audit fix and still load-bearing.
- **The correction payload is deliberately narrower** than the movement one: no
  layer or split fields, and no «Əvəz edir: …» note, which the server appends
  itself. A test asserts all four absences.
- `NewOperationPage.test.tsx` scopes dialog buttons through
  `screen.getByRole('dialog')`. In edit mode the panel button and the confirm
  dialog's button carry the SAME label («Düzəlişi qeyd et»), so an unscoped
  query matches two elements.

## Phase 6 — Mal qrupları (Module G): `CODE VERIFIED`

**Implemented 2026-09-04 · approved the same day (Q1, Q2, Q3) with a set of
mandatory safety corrections · Codex-audited the same day (verdict CHANGES
REQUIRED, three P2 findings) · all three remediated and independently
re-audited 2026-09-04. Code is verified; the available Admin read-only and
real-workbook scenarios are live verified in the isolated test environment.**
Documents:
[proposal](specs/2026-09-04-react-migration-phase6-item-groups-proposal.md) ·
[plan](plans/2026-09-04-react-migration-phase6-item-groups.md) · registry
Module G (`M6-01…M6-42`, plus `M6-S1…M6-S16` for the safety corrections).

**Checks: 986 tests / 61 files, typecheck, oxlint, build, `git diff --check` —
all clean** (974/61 before the audit remediation; 843/54 baseline, re-run
before implementation). No Phase 1-5 behaviour changed.

### The audit and what it changed (2026-09-04)

Three P2 findings, all fixed —
[audit](audits/2026-09-04-phase6-codex-audit.md):

- **`A01`** — a failed INITIAL load also rendered «Nəticə yoxdur / Bu
  süzgəclərə uyğun müsbət qalıq yoxdur», presenting a fatal read failure as a
  completed zero-result calculation, and the pager claimed «0 sətir (müsbət
  qalıq)» alongside it. Now an explicit «Məlumat yüklənmədi» state, with no
  row-count claim. A failed REFRESH after a good snapshot is untouched: rows
  retained, error in the footer. New registry row `M6-S17`.
- **`A02`** — `M6-39`, `M6-42` and `M6-S16` still read `NOT STARTED` although
  implemented and tested; the bulk promotion had missed them because their
  status cells carry trailing qualifier text. Now `CODE VERIFIED`. `M6-40`
  stays **NOT DONE**.
- **`A03`** — the rail rendered «Bazalar» twice. Now one heading, entries in
  the original's order (index.html:255-261), Soraqçalar still admin-gated.

Every fix carries tests **verified to fail against the pre-fix code** (three
for `A01`, three for `A03`), plus tests that pin the halves which must NOT
change — the refresh-retention path and the genuine empty result.

### Phase 5 status carried forward — read this before claiming anything

**CURRENT DECISION (2026-09-08): the print-preview text below is historical.
`Çap` is an accepted non-functional baseline and cannot block acceptance. It
must not be claimed as verified, but no phase should wait for it.**

**The user-visible Windows print-preview inspection of Nomenklatura «Çap» is
DEFERRED by explicit user decision, 2026-09-04, and does not block Phase 6.
It is NOT verified — do not record it as verified.** The «Çap» button stays
enabled and untouched.

**`M5-55` remains `BLOCKED`** until Yeni əməliyyat is migrated and live
verified. Phase 6 neither touches nor unblocks it; that phase must still carry
it as an explicit entry criterion.

### Decisions in force

**Q1** — `created_at` added to the existing movement query. Supabase returns it
as a **nullable string**, so it is converted with `new Date(...).getTime()` and
a `NaN`/`null` result is treated as *unavailable*. `Number.isFinite()` is never
applied to the raw string. **Q2** — the page-scoped Realtime pattern for
`items`/`movements`/`warehouses` only; no shell-wide sync refactor, no
duplicate subscriptions, no `audit_log`. **Q3** — the complete legacy screen.

### Before touching this code

- **`fetchItemGroupsSnapshot()` exists because `useNomenclatureStore.load()`
  must NOT be reused here.** `load()` returns `void` and survives a failed
  movements read — correct for Nomenklatura, wrong for a screen whose every row
  IS a balance. The snapshot loader is atomic and returns explicit
  success/failure; **items and movements are both fatal**. A failed refresh
  keeps the previous state and aborts the export rather than exporting an
  apparent "zero balance" (`M6-S2`-`M6-S4`).
- **The export snapshots the selection BEFORE refreshing.** The original counts
  `dropped` before `rGroups()` re-renders (2845-2850); React's pruning effect
  runs first and had been zeroing the count. Restoring the read order is what
  makes «N sətir qalıqsız…» truthful. A test pins it and was verified to fail
  against the pre-fix code.
- **Warehouses are `active && type === 'anbar'` only** (index.html:933).
  `fetchWarehouses()` also returns locations (`DB.locs`, 935). `allowedWarehouses()`
  is applied AFTER that filter, and an `anbardar` sees only their own warehouse
  — the Astara/Harmony source group belongs to transfers, not here.
- **`whLabel()` is used in exactly one place** — the warehouse filter tag
  (2782). The table cell (2811) and the Excel cell (2870) write the RAW stored
  value. Three tests pin the distinction.
- **The price column is the last PURCHASE price, never `items.price`.** A row
  legitimately shows «—» here while Nomenklatura shows a price for the same
  item. Do not "reconcile" the two.
- **Selections are pruned against the COMPLETE filtered result, before the
  3000-row cut**, and not at all while a validation error is showing. Pruning
  against the rendered page would drop rows the user can still reach through
  «Hamısını göstər».
- **`xlsGroups` must stay separate from `xls()`.** Routing it through the
  shared exporter would send codes through `toNum`, turning `0000001` into the
  number 1 (`R-F9`), and would write a `0` where the original leaves a
  genuinely empty cell.
- **This phase adds export only.** No import path was added and the accepted
  SheetJS version is unchanged, so `R-F7` is not reopened.
- `VITE_ALLOW_LOCAL_WRITES` was not touched and remains unset. This module has
  no write path at all.

### Re-audit and live evidence (2026-09-04)

- Post-fix checks are clean: **986 tests / 61 files**, typecheck, oxlint,
  build and `git diff --check`.
- Localhost showed the expected test row `0000001 / TEST Mal 1 / Test
  kateqoriya / Test Anbar / 8.00 ədəd / —`.
- The production legacy screen was compared read-only: screen structure,
  filter families, columns, positive-balance rule, quantity/unit display and
  missing-price representation match.
- A real generated workbook was inspected at `A1:F2`: expected headers,
  quantity `8`, raw warehouse `Test Anbar`, empty last-purchase-price cell,
  Baku export stamp, explicit widths and no formula errors. Code `0000001` is
  stored as an Excel text cell, so its leading zeroes are preserved.
- No production or test data was changed by this verification.

### Still open

- **The rail's behaviour is now tested behaviourally**, not by reading
  `App.tsx` as text. `App.nav.test.ts` remains only as a cheap wiring check;
  «App — navigation rail (A03)» in `App.test.tsx` is the acceptance evidence.
- **`M6-40` — the payload measurement is NOT DONE** and is recorded as such,
  not claimed. It needs the test environment.
- `anbardar` warehouse scoping still needs a suitable live non-admin fixture.
- The refresh-failure abort still needs a deliberately failed live read; its
  behaviour is covered by the automated suite.
- The sync-indicator shell fix stays deferred (Q2 kept this phase contained),
  and the visual backlog `V-01…V-03` is unchanged.


## H-3 Codex audit fixes (2026-09-05)

Four required fixes from the Codex audit of H-3. Scope was limited to the React
app under `web/`: no Supabase, SQL/RPC, root `index.html`, GitHub, Vercel or
production data was touched, and `VITE_ALLOW_LOCAL_WRITES` remains unset.

### 1. A changed bulk quantity now drops the row's stored lot

`BulkPickDialog` gained an explicit `onInvalidateLot(code)` callback, fired by
both `setQty` and `setBucket`. The dialog cannot clear the lot itself: the
parent owns `bulkLots`/`bulkValues`, so it is the only one that can. The
M7-61 comment already CLAIMED this behaviour while no code performed it.

A bucket edit invalidates for the same reason a direct quantity edit does —
the row total IS the bucket sum, so changing a bucket changes the quantity the
allocation was built for.

### 2. Bulk apply now produces the same layered payload as a single line

In `applyBulk`, a row carrying a lot now keeps:

- the layer price, derived as `sourceAmount ÷ qty` exactly as M7-74 does, with
  a null amount staying null so the panel renders «—» rather than `0`;
- `layerRevision` = **the `revision` returned by `get_stock_layers` for that
  row**, not `layerVersion`. Those are different values — `layerVersion` is the
  capability version from `stock_layers_supported()` — and sending the wrong
  one would fail the server's concurrency check.
- the admin `finalAmount` / `overrideReason` override.

`BulkLot` therefore carries a `revision` field, stored when the allocation is
confirmed. A cleared override now also deletes the previous one rather than
leaving it standing.

### 3. The bulk mode survives the shared LayerPickDialog

The layer dialog state carries `bulkMode`, captured **before** the `await` in
`onPickBulkLayers` (the layer dialog replaces the bulk dialog in `dialog`, so
it cannot be re-derived later). Confirm and «Geri» both reopen the list in
that mode. Two hard-coded `'wo'` literals were the defect: a bulk **transfer**
returned as a **write-off**.

### 4. confirmIcare invalidates the request key

The post path of `confirmIcare` edits draft lines (it appends the reason marker
to each exposed line) through a raw `setState`, which left `requestKey` intact.
It now calls `invalidateRequestKey()`, matching `addLineRaw`, `removeLine` and
`saveEditLine`. A key computed for the previous note no longer describes the
document being sent.

### Checks run

All from `web/`:

- `npx vitest run` — **92 files / 1568 tests passed** (baseline before the fix
  was 1559; the 9 added tests are the difference, no regressions).
- `npx tsc -b --noEmit` — clean.
- `npx oxlint` — clean, exit 0.
- `npm run build` — succeeded. The >500 kB chunk notice is the pre-existing
  advisory, unchanged by this task.
- `git diff --check` — exit 0. The accompanying output is the repository's
  pre-existing CRLF warnings, not whitespace errors.
- Root `index.html` — **byte-identical**, md5 `b9be15c5ca59b68337863369620d72fa`
  before and after.
- No RPC or write call added: the touched files contain no `supabase`, `.rpc(`,
  `.from(`, `insert`, `upsert`; the only `delete` calls are in-memory
  `Map.delete`.

Each new test was **mutation-checked**: the fix was reverted and the test
observed to fail, then restored. Without the fixes, 2 BulkPickDialog tests and
5 NewOperationPage tests fail.

### Notes for the next session

- Returning from the layer dialog **remounts** `BulkPickDialog`, resetting its
  internal `sel`, so the row must be re-selected before «Əlavə et». This is
  pre-existing behaviour, left as found; the H-3 tests re-select accordingly.
  It is worth deciding deliberately whether the selection should survive.
- With layer accounting ACTIVE every row is gated on a picked lot
  («mənbə partiyası seçilməyib»), so an "unlayered bulk row" only exists when
  the capability is inactive — that test sets it so.
- `NewOperationPage.test.tsx` inherits a `localStorage` stub from an earlier
  suite that is never unstubbed and has no `clear()`. The H-3 helper removes
  the draft key directly so a previous test's persisted draft is not restored.


## H3-A05 — the bulk draft survives the layer round trip (2026-09-05)

Single fix from the updated Codex audit. Scope stayed inside `web/`: no
Supabase, SQL/RPC, root `index.html`, GitHub, Vercel, deployment or
production/test data was touched, and no write call was added.

### The defect

`BulkPickDialog` owned selection, splits, search and note in component-local
state. «Partiya seç» UNMOUNTS it, so the draft died on every layer round trip.
That blocked partial layered quantities outright:

1. available 10, user selects 3;
2. allocates layers totalling 3;
3. returning remounts the dialog with no selection;
4. re-selecting resets the quantity to the full 10;
5. correcting it back to 3 invalidates the just-stored lot (the H-3 fix, doing
   its job) — an impossible loop with no way to post 3 of 10.

### The fix

The draft was lifted into the store, which is where the legacy screen keeps it:
a module-level `BW` object (index.html:4020) reset **only when the bulk dialog
is opened** (4120-4124), never when returning from the layer picker.

`bulkSel`, `bulkSplit` and `bulkNote` already existed in the store, declared
and reset but never read or written — the original design had anticipated
this and the dialog kept a private copy instead. Those are now wired up, and
`bulkMode` and `bulkQuery` joined them. `BulkPickDialog` is fully controlled:
it owns no draft state at all, only layout.

Three store actions carry it: `openBulk(mode, note)` (the sole reset point,
seeding the shared note from the document note as the legacy does),
`setBulkDraft(patch)`, and `invalidateBulkLot(code)`. The draft is also cleared
on a successful apply, since the batch is then spent.

Preserved across the round trip: selected rows and quantities, condition
splits, shared note, `wo`/`mv` mode, stored lots and overrides, and search
text. **Search text is preserved deliberately** — the legacy `BW.q` is
re-rendered from state at index.html:4134 and is cleared only on open.

### M7-75 — the revision contract

`LayerPickDialog` now accepts `initialSelection` and reopens a bulk row with
the allocation already chosen for it, but **only when the stored per-row
revision equals the revision `get_stock_layers` just returned**. A differing
revision means the underlying layers moved, so the stale allocation is
discarded and the row is re-picked. This mirrors index.html:4327-4329:
`old.revision === BLP.revision ? old.allocations : []`. The stored admin
override is restored on the same condition.

### Tests

Six added (1568 → **1574**), each **mutation-checked** — the fix was reverted,
the test observed to fail, then restored:

- 3 of 10 survives and posts with no re-selection or re-entry (fails when the
  draft is wiped on confirm);
- transfer mode and destination survive (fails when wiped on «Geri»);
- shared note and search text survive (same);
- a marked row's condition split survives (same);
- a MATCHING revision restores the allocation (fails when restore is removed);
- a CHANGED revision drops it (fails when the revision check is removed).

Both revision directions are pinned, so neither "never restore" nor "always
restore" can pass.

Two existing H-3 tests were updated: they re-selected the row after returning,
which is now wrong — the selection survives, so clicking again deselects it.
`BulkPickDialog.test.tsx` gained a small stateful `Harness` that plays the
store's part, keeping every existing behavioural test exercising a live,
editable dialog.

### Checks run

All from `web/`:

- `npx vitest run` — **92 files / 1574 tests passed**.
- `npx tsc -b --noEmit` — clean.
- `npx oxlint` — clean, exit 0.
- `npm run build` — succeeded (the >500 kB chunk notice is pre-existing).
- `git diff --check` — exit 0 (accompanying output is the repo's pre-existing
  CRLF warnings, not whitespace errors).
- Root `index.html` — **byte-identical**, md5
  `b9be15c5ca59b68337863369620d72fa`.
- No write call added: the seven touched files contain zero occurrences of
  `supabase`, `.rpc(` or `.from('`.
- `VITE_ALLOW_LOCAL_WRITES` remains unset in the active `.env`; no env file
  was modified.

### Note for the next session

The earlier handoff flagged the remount-loses-selection behaviour as
pre-existing and worth a deliberate decision. That decision is now made and
implemented: the draft survives, matching the legacy screen.

---

## Milestone H-5 — the first live writes of the migration (TEST only), 2026-09-05

**Read this before touching Phase 7.** H-5 is the first milestone in the whole
React migration in which anything was actually written to a database. It was
executed by **Codex**, through the real React UI, against the **isolated TEST
Supabase project `alkjjbaawmsirsfvqljm`** — never production. This session
(Claude) performed **no writes and no code changes**; it recorded the evidence
only.

**Phase 7 is NOT `ACCEPTED`. Module H remains ONE acceptance boundary and is
INCOMPLETE.**

### Gate G0

Before any write, the user visually confirmed in the running localhost app's
DevTools Network panel that the live Supabase Request URL host was exactly
`alkjjbaawmsirsfvqljm.supabase.co`. No authorization header, API key or token
was inspected or recorded. The approved subset ran only after that
confirmation.

### What was done

1. **`CODEX-P7-IN-1`** — UI inbound `Satınalma` to Test Anbar. **Posted.** Item
   `0000001` balance 8 → 13, movement count 3 → 4.
2. **`CODEX-P7-IN-1` reused with a different date** — **blocked before
   posting**; the UI reported the Qaimə № already belongs to document
   `SND-76074E451C`. **No new movement.**
3. **`CODEX-P7-DUP-1`** — the double-click duplicate-submit test created
   **exactly one** document (item `0000002`, balance 1, movements 1). No second
   document appeared. **This live-verifies `M7-108`** (the client-side
   in-flight lock prevented the second submission) and is scoped to that.
   It is **not** evidence for `M7-107`, which stays `CODE VERIFIED` (H-1):
   H-5 proved neither the presence nor the absence of server-side
   idempotency on the non-layer route.
4. **«Yeni mal yarat»** through the React operation form — created item
   `CODEX-P7-MAL-1`, code `0000006`, unit `ədəd`, category `Test kateqoriya`;
   it reappeared immediately in item search.
5. **`M5-55`** — Item Card → «Bu mal üzrə əməliyyat» opened the operation form
   prefilled with item `0000002`, its unit and Test Anbar balance 1. The row is
   now `LIVE VERIFIED` and is no longer `BLOCKED` anywhere in the registry.

### The apparent failure — resolved by a follow-up read-only check

**Audit jurnalı showed ZERO matching records** in the admin UI after both
document writes and the item write. A follow-up read-only, SELECT-only
inspection of the TEST project (`alkjjbaawmsirsfvqljm`) found:

- Audit rows for both H-5 movement documents exist in `public.audit_log`
  (`SND-76074E451C`, `SND-D512FAAC59`).
- Trigger `movements_audit` is live and enabled (`tgenabled = 'O'`).
- The live SELECT policy on `audit_log` is `p_audit_read`, `USING (my_role() =
  'rehber')`.
- The H-5 session's user (uid `aa0fd092-af7d-4e0e-baac-34ce1a0389fa`) has role
  `admin`, so the policy evaluated false for every row and PostgREST correctly
  returned an empty, error-free result — RLS filtered the rows silently.

**`M7-120` is corrected to `LIVE VERIFIED` for the ordinary movement-INSERT
consequence only** (`movements_audit` → `log_changes()`); the React query and
write path were not the cause. `correct_document`'s explicit `UPDATE` audit
row and `log_icare_exposure` were **not** exercised in H-5 and the row stays
**OPEN** for those. The item write (`CODEX-P7-MAL-1`) correctly produced no
audit row, because `items` carries no audit trigger.

Whether an `admin` account being unable to read Audit jurnalı reflects
intended product behaviour, and whether production carries the same policy, is
**not determined** by this check — it is a separate parity/product decision
requiring its own read-only production comparison, and must not be assumed
either way.

### Not executed — and why

- **The over-stock (`qty 99`) scenario was explicitly NOT approved.** Codex's
  final review established that the implementation trims a non-layer line to
  the available quantity and may then post the trimmed document, so the earlier
  report's expectation of "zero writes" was wrong. **`M7-96` keeps its H-4
  status**; its live recheck is recorded as not executed.
- **`M7-S2` / `M7-S3`** deliberately-broken-read checks (browser Network
  request blocking) were not executed.
- **Transfer, layer, İcarə/condition and anbardar scenarios** remain blocked by
  the documented TEST fixture limitations — see
  [`test-environment/README.md`](test-environment/README.md). They were not
  skipped by choice.
- `correct_document`, partner/stock-condition/warehouse/user/role creation and
  any direct database write were outside the approved subset.

### Safety state

Production, root `index.html`, the schema, SQL/RPC, RLS, triggers, GitHub,
Vercel and deployment were **untouched**. No fixture was created. No code was
modified in H-5, so the automated suite is unchanged from H-4 (**1649 tests /
93 files**). **No cleanup was performed by design**: all `CODEX-P7-*` evidence
remains in the TEST project, and no audit row was deleted. Nothing was staged,
committed, pushed or deployed.

**Fixture limitation.** A read-only live inspection of the TEST project found
**1 public user (`admin`), 0 partners, 0 `stock_conditions`, 0
`stock_layer_settings` and only 5 movements**. The anbardar, İcarə, layer,
valid-transfer and partial-page failure scenarios are therefore untestable
there without separately approved fixture creation. **No fixture was created
and no database mutation was performed.**

### Phase 7 post-H-5 — S-8 live broken-read check (2026-09-05)

`M7-S3` is now **LIVE VERIFIED** for its TEST failure-and-recovery path. The
user enabled a Chrome DevTools `Request conditions` block matching
`*stock_conditions*`, reloaded `Yeni əməliyyat`, and observed
`Məlumat yüklənmədi` with `TypeError: Failed to fetch`; the normal operation
form/post path was unavailable. The rule was then disabled and a reload
restored normal loading. This was a zero-write, zero-fixture check. It does not
promote `M7-S2`, any posting path, or Phase 7 as a whole. Phase 7 remains
INCOMPLETE / NOT ACCEPTED.

### What the next session must not claim

Do not record Phase 7 as `ACCEPTED`. Do not describe `M7-120` as fully
verified — only the ordinary movement-INSERT consequence is `LIVE VERIFIED`;
`correct_document` and İcarə audit paths were not live-tested and the row
stays OPEN for those. Do not claim that excluding `admin` from Audit jurnalı
is confirmed intended product behaviour, and do not claim production has been
checked — that comparison has not been performed. Do
not treat the single inbound `Satınalma` path as covering transfers, layers,
İcarə or anbardar scoping — those rows are still `CODE VERIFIED` (mocks only).

## Phase 8 — «Mal hərəkəti» (Module I): PROPOSAL ONLY, 2026-09-05

**Nothing is implemented. No Phase 7 status changed.**
[proposal](specs/2026-09-05-react-migration-phase8-movements-proposal.md)

Research-only pass. No application code, SQL, RPC, schema, Supabase data,
`.env`, dependency, root `index.html`, GitHub, Vercel or production state was
changed; no live Supabase read or write was performed; the test suite was not
run. The only artefact is the proposal linked above.

It covers the full «Mal hərəkəti» screen, navigation to «Yeni əməliyyat»,
document details, authenticated cancellation through the React Supabase
session, the three separate cancellation families (ordinary / transfer /
layered, plus row-level, item-replacement, legacy and batch), the
`document_edit_impact()` correction flow, roles/RLS/audit consequences,
stale-response and double-submit protection, scope, 8 milestones, acceptance
gates, 6 risks, 5 open decisions and 54 proposed `M8-*` registry rows
(`NOT STARTED`).

**Statuses this proposal explicitly preserves:** `M7-S3` stays `LIVE VERIFIED`
(TEST failure-and-recovery path only); Phase 7 stays INCOMPLETE / NOT ACCEPTED;
live scenario **`S-6`** stays BLOCKED as a server/RPC gap; `M7-120` stays
`LIVE VERIFIED` for the ordinary movement-INSERT consequence only and OPEN for
`correct_document` and İcarə; `M7-123` stays OPEN; `M7-109` stays `IN PROGRESS`.

**Do not confuse `S-6` with `M7-S6`.** `S-6` is the condition-split transfer
LIVE SCENARIO, blocked by the `apply_cond_split` → `apply_cond_delta` →
`log_icare_exposure` call-order defect (`test-environment/2026-09-05-phase7-remaining-live-verification-plan.md`
§0.-2). Registry row **`M7-S6`** is "failed refresh keeps the snapshot" and is
`CODE VERIFIED` (H-2) — a different, unblocked row. This proposal's first
revision conflated the two; corrected 2026-09-05.

Phase 8 makes the blocked Phase 7 live reversals *executable* — it does not
promote them. Each affected row is re-verified only after an individually
approved live write, paired with its reversal in the same session.

**Two research findings that contradict prior assumptions**, both recorded in
the proposal rather than silently adopted:

1. **«Mal hərəkəti» is NOT anbardar-scoped client-side.** `movFiltered()`
   (index.html:1660-1676) filters only on the user’s own chosen warehouse, and
   the warehouse select is built from all of `DB.whs` — unlike
   `sourceWarehouses()`/`allowedWarehouses()` (716-721), which the operation
   form uses. Whether an anbardar sees other warehouses depends entirely on the
   live RLS SELECT policy on `movements`, which has NOT been read. Adding a
   client-side scope filter would be an unapproved behaviour change (decision
   D2).
2. **The cancellation RPCs take DIFFERENT first-parameter names, and the name
   varies between the LAYER and NON-LAYER variants of the same family.** Read
   from the local SQL sources: `cancel_document` → `p_doc_num`
   (`sql/007_role_security_migration.sql:840`); `cancel_transfer_document` →
   `p_original_doc_num` (same file, 746); `cancel_layer_transfer_document` →
   **`p_doc_num`** (`sql/036_stock_layers.sql:680`). A shared `cancel(docNum)`
   helper would send the wrong name to some of them.

   **Deviation `D-I1` — a latent legacy defect, corrected deliberately.** Legacy
   `transferDocView` (5249-5251) picks the RPC dynamically but always sends
   `p_original_doc_num`, so on the layer-active branch it passes an argument
   `cancel_layer_transfer_document` does not declare and the call cannot resolve.
   It fails closed, which is why it is plausibly unnoticed — layers are inactive
   in the environments exercised so far. Phase 8 proposes to correct it (send
   `p_doc_num`) rather than copy a call that cannot succeed, recorded as an
   approved deviation on `M8-25`/`M8-26` with a **mutation-checked** test
   asserting each function's argument name and verified to FAIL against the
   legacy behaviour.

**Before implementation the RPC signatures must be read from the live database.**
Every RPC name and parameter in the proposal was taken from local SQL migration
files and legacy call sites — rank-4 approved specifications, not the rank-3
live contract. Principles §3 requires the live read first, and that gate covers
all thirteen cancellation RPCs including `D-I1`'s premise. If a live signature
differs, the live definition wins and the proposal is corrected.

## Phase 8 milestone I-1 — read-only foundation implemented, 2026-09-05

**I-1 only. Module I is NOT complete and NOT `ACCEPTED`.** Module I is ONE
acceptance boundary; no milestone is accepted alone.

**No live Supabase read or write, no SQL, RPC call, schema, RLS, trigger or
fixture change, no `.env`, dependency or root `index.html` change, no commit,
staging, push or deployment occurred.** The parity-registry rows were created
BEFORE the code, as principles §10 requires.

### Registry

The 54 `M8-*` rows now exist in the new Module I ledger,
`docs/superpowers/specs/2026-09-05-phase8-registry-rows.md`, linked from a new
Module I section of `ANBAR_FUNCTIONAL_PARITY_REGISTRY.md`. **No Phase 7 status
was changed.** Live scenario `S-6` (BLOCKED, server/RPC gap) remains distinct
from registry row `M7-S6` (`CODE VERIFIED`).

Statuses set by I-1: `M8-10`, `M8-52`, `M8-54` are `CODE VERIFIED` (mocks and
unit tests only, never live). `M8-06`, `M8-07`, `M8-08`, `M8-09`, `M8-11`,
`M8-12`, `M8-20`, `M8-21`, `M8-22` are `IN PROGRESS` — the I-1 pure half is
implemented and tested, and each row names the milestone that finishes it.
Everything else stays `NOT STARTED`.

### Code

New pure modules, each with focused unit tests:

- `web/src/lib/movementKey.ts` — `movKey`, `movKeyKind`, `movKeyLabel`,
  `movKeyText` (M8-54). `routeOrPartner` / `transferRoute` were already ported
  in A12 (`lib/movementRoute.ts`) and are **reused, not reimplemented**.
- `web/src/lib/documentCancelState.ts` — `CANCELLABLE_TYPES`,
  `docReversalDoc`, `isReversalDoc`, `docCancelledBy`, `isCancelDoc`,
  `cancelledDocFor`, `rowReplacedOrCancelled`, `stripRowLevelCancelled`.
  `lib/operationalMovements.ts` keeps answering the different question of which
  rows are operational; the two are deliberately not merged.
- `web/src/lib/movementFilters.ts` — `MOVEMENT_TYPE_FILTERS`, `searchableNote`,
  `filterMovements`, `sortMovements`, `movementKpis`, `movKeyOptions`,
  `resolveMovKeySelection`. The 3000-row soft cap reuses the existing
  `lib/showAllCut.ts` rather than introducing a second cap.

Changed: `web/src/api/itemMovements.api.ts` — the explicit column list gains
`contract_num` and `created_by` (M8-52). `select('*')` was **not** used.

### M8-52 evidence, and one correction to the proposal's wording

The proposal (R3) speaks of widening the read for `contract_num` and "the
recorder (`by`)". **There is no `by` column.** `by` is only the legacy
in-memory field name: `index.html:943` maps `by: r.created_by || 'sistem'`. The
real column is `created_by`, confirmed independently by the generated types
(`web/src/types/database.ts:372-390`, `movements.Row`) and by
`ANBAR_SHARED/docs/DB_SCHEMA.md`. Both requested fields were therefore
confirmed and widened; the `'sistem'` value is display formatting and stays
out of the read, for I-2. Note it is only the INTERMEDIATE legacy value: the
final pass at `index.html:990` rewrites it, and I-2 renders that final pass —
see `lib/recorderLabel.ts`. This is a rank-4 + rank-5 confirmation — the live
column set was not inspected.

### Deliberately NOT done

- **`writeoff_valuations` is neither read nor typed** (risk R2 / `M8-51`), so
  `movementValuation()` and the `Silinmə` price/amount rule (`M8-05`) are not
  ported. Its live shape and RLS are unconfirmed.
- **`D-I1` (the transfer-cancellation parameter correction) is NOT
  implemented.** It belongs to I-4, after the live RPC signature is read.
- No UI, page, dialog, navigation, realtime, cancellation API, mutation-guard
  extension or RPC call.
- Decisions `D1`–`D5` remain undecided and are not resolved in code.

### Checks (run once, at the end, from `web/`)

- Targeted: **109 tests / 4 files** passed
  (`movementKey`, `documentCancelState`, `movementFilters`,
  `itemMovements.api`).
- Full suite: **1746 tests / 96 files** passed. I-1 adds **97 tests in 3 new
  files** (95 in the three new `lib` test files, plus 2 added to the existing
  `itemMovements.api.test.ts`), so the pre-I-1 baseline was 1649 / 93. The
  targeted figure of 109 is the four-file RUN total and includes 12
  pre-existing API tests — it is not a count of new tests.
- `npm run typecheck` clean · `npx oxlint` exit 0 · `npm run build` succeeded ·
  `git diff --check` exit 0.
- `VITE_ALLOW_LOCAL_WRITES` verified absent from `web/.env` after the run; the
  file was not modified.

### Mutation checks

Every new behavioural test was verified against a plausible wrong
implementation and the correct version restored and re-verified green. Fifteen
mutations, each caught: merging a half-resolved route into `route:`;
`split(':')` in `movKeyLabel`; substring matching in the ordinary legacy branch
of `cancelledDocFor`; dropping the marker-row predicate in
`stripRowLevelCancelled`; removing the `'—'` fallback in `docCancelledBy` /
`docReversalDoc`; letting `movKeyOptions` narrow itself by `MF.p`; dropping the
`created_at` tiebreak; a naive `new Date().getTime()` that yields `NaN`; a
non-global `searchableNote` regex; searching the raw note instead of
`searchableNote`; valuing both directions in the KPI; reversing the KPI price
fallback chain; checking only one option group in `resolveMovKeySelection`;
exclusive date bounds; and removing the `contract_num` / `created_by` columns.
No wrong version is left on disk.

### What the next session must not claim

That Module I is complete or `ACCEPTED`; that any `M8-*` row is
`LIVE VERIFIED`; that any RPC signature was read from the live database; that
`D-I1` was applied or approved; that decision `D1`, `D3`, `D4` or `D5` was
resolved; or that any Phase 7 status moved.

*(Superseded in part by the I-2 section below: `writeoff_valuations` HAS since
been inspected read-only, and `D2` HAS since been resolved. Everything else in
this I-1-era list still stands. The current, authoritative "must not claim"
list for the next session is the I-5 one at the end of this file.)*

---

## Phase 8 milestone I-2 — the read-only screen implemented, 2026-09-06

**I-2 only. Module I is NOT complete and NOT `ACCEPTED`.** Module I is ONE
acceptance boundary, and `ACCEPTED` additionally requires Codex's independent
audit. **No Phase 7 status changed.** `M7-109`'s caller is still I-6.

I-1 passed Codex's independent audit before this milestone began: 1746 tests /
96 files, typecheck / oxlint / build / `git diff --check` clean, root
`index.html` MD5 `b9be15c5ca59b68337863369620d72fa`,
`VITE_ALLOW_LOCAL_WRITES` absent, no blocking defect.

### What I-2 ships

The «Mal hərəkəti» screen, read-only, end to end:

- **`pages/MovementsPage.tsx`** — page shell, the 15-column legacy table with
  `nf()`/`money()`/`fmtD()` formatting, the warehouse display alias, the
  channel suppression rule, the contract hint, the 40-char note truncation with
  full `title`, the «Qeyd edən» recorder label (`lib/recorderLabel.ts`, the
  FINAL legacy mapping at `index.html:990`) and the «ləğv edilib» tag; the
  six filters including the grouped İstiqamət select with invalid-selection
  reset; the 3000-row soft cap with a sticky «Hamısını göstər»; and the KPI
  line, computed over the FULL filtered set.
- **`store/movements.store.ts`** — filters, sticky `showAll`, a monotonic
  request sequence (`M8-44`) and snapshot retention on a failed refresh
  (`M8-45`).
- **`api/movementsSnapshot.api.ts`** + `.test.ts` — the atomic four-read
  snapshot. **All four reads are fatal**, `writeoff_valuations` included.
- **`lib/recorderLabel.ts`** + `.test.ts` — the pure «Qeyd edən» helper: the
  four legacy branches of `index.html:990`, resolving ids against the
  `get_user_directory()` map App.tsx already warms at boot. No second RPC.
- **`api/writeoffValuations.api.ts`** — the READ-ONLY, column-explicit,
  never-throwing `writeoff_valuations` read.
- **`lib/movementValuation.ts`** — `movementValuation()` and the 4-dp
  `writeOffUnitPrice()`, matching the legacy fallback exactly.
- **`App.tsx`** — `'mov'` in `MigratedPage`, the rail entry SECOND in the
  `Əməliyyat` group and ungated for every role, and the plain no-prefill
  «Yeni əməliyyat» switch.

Also: `fmtD()` and the `TYPE_TAG` class map ported into `lib/format.ts`; and
`MovementFilterRow` additively gains `doc_num` (required, so a filtered row
satisfies `CancelStateMovement` without a cast), `channel` and `created_by`.

**One comment-only correction.** `documentCancelState.ts`'s `cancelledDocFor()`
docstring claimed every unsupported type returns null. That holds only for a
row that HAS a `doc_num`; a doc-less row never reaches the type gate, because
legacy checks the per-id marker first (index.html:4902-4907) and the ordinary
branch matches `Ləğv ID: <id>` for any non-transfer type. **The behaviour was
not changed** and still mirrors legacy exactly.

### Two questions the read-only TEST evidence closed

Codex inspected the TEST project (`alkjjbaawmsirsfvqljm`) read-only through the
Supabase SQL editor. **Do not repeat that inspection.**

1. **`D2` is RESOLVED as (b).** Live policy `movements_select`, role
   `authenticated`:
   `is_admin() OR is_rehber() OR (is_anbardar() AND warehouse = current_user_warehouse())`.
   So the legacy unscoped client behaviour is ported exactly, **no client-side
   anbardar filter was added**, and live RLS restricts an anbardar's rows.
   State this precisely: the SERVER scopes the rows; the React client does not
   and must never be described as doing so. A test asserts the page renders
   every row it is given across warehouses and takes no role/user prop at all.
2. **The READ half of R2 is resolved.** The live column set and SELECT policy
   of `writeoff_valuations` are confirmed; the read selects only the seven
   columns the screen consumes, out of the eleven that exist. This authorises
   **no write** to that table, and none was made.

### Deliberately NOT done

«Baxış» renders but is `disabled`, with a tooltip saying document inspection
arrives in the next milestone — the table keeps its legacy shape with no dead
click and no partial I-3. There is no document view, dispatcher, cancellation
dialog, cancellation API, RPC call or mutation-guard extension (I-3 … I-6); no
Excel / Çap / Silinmə-report affordance is rendered (`D1` / I-7); and no batch
cancellation, item replacement or correction flow exists (`D3`, `D4`, I-5,
I-6).

### Checks after I-2 (run once, from `web/`)

- Full suite: **1873 tests / 102 files** passed — the CLOSING I-2 result,
  after both Codex audit corrections. Up from the 1746 / 96 baseline Codex
  confirmed, i.e. **+127 tests in 6 new test files** plus additions to
  `App.test.tsx`. (The first, pre-fix I-2 run reported 1845 / 100; that figure
  is history, not the current result.)
- `npm run typecheck` clean · `npx oxlint` exit 0 · `npm run build` succeeded ·
  `git diff --check` exit 0.
- Root `index.html` MD5 still `b9be15c5ca59b68337863369620d72fa`.
- `VITE_ALLOW_LOCAL_WRITES` verified absent from `web/.env`; the file was not
  modified.
- **No live Supabase read or write, no SQL, no RPC invocation, no schema /
  RLS / trigger / fixture change, no dependency or `.env` change, no commit, no
  staging, no push and no deployment.** Unrelated working-tree changes were
  preserved.

### Mutation checks

Twelve, each verified to FAIL against a plausible wrong implementation before
the correct version was restored and re-verified green; every touched file was
then diffed against its pre-mutation copy, so **no wrong version is left on
disk**. The sequencing guard removed; a failed refresh clearing the snapshot;
KPIs from the capped slice (reports `3.000` of 3001); a client-side anbardar
filter injected; the Silinmə valuation replaced by the ordinary price chain;
`writeoff_valuations` read with `select('*')`; the realtime debounce overridden
to 0; `resolveMovKeySelection()` bypassed; the channel suppressed for every
transfer; the recorder fallback changed to an em-dash; the contract hint
rendering `doc_num`; and the rail entry wrapped in `isAdmin()`.

### What the next session (I-3) must not claim

That Module I is complete or `ACCEPTED`; that any `M8-*` row is
`LIVE VERIFIED` — nothing is, and the live gate is I-8; that any cancellation
RPC signature was read from the live database; that `D-I1` was applied or
approved; that `D1`, `D3`, `D4` or `D5` was resolved; that any export, print,
batch, replacement or correction path exists; or that any Phase 7 status moved.
I-3 is the document views, READ-ONLY, with no action wired — and it is what
gives «Baxış» its destination.

## Phase 8 — milestone I-3 (2026-09-06): read-only document inspection

**I-3 is not Phase 8 completion and Module I is not `ACCEPTED`.** It delivered
the document INSPECTION layer and nothing else.

### Two documentation corrections made first

1. **The final legacy recorder mapping is at `index.html:990`, not `:996`.**
   Verified against the file: 990 is the
   `DB.movs.forEach(m => { m.by = … })` pass; 996 is the unrelated
   `get_reference_values()` `try {`. The incorrect `:996` citations introduced
   by I-2 were replaced in the code comments, the Module I ledger, the central
   registry and this handoff. The pre-existing `index.html:996-1004` citation
   in `referenceValues.api.test.ts` is CORRECT and was left alone.
2. **The verified I-2 closing baseline is 1873 tests / 102 files**, re-measured
   locally rather than taken on trust. Relative to I-1's 1746 / 96 that is
   +127 tests in 6 test files. The stale `1845 / 100` figures were replaced
   wherever they were presented as the current closing result; the statement
   describing the pre-fix run is preserved as history.

### What I-3 ships

- **`lib/documentView.ts`** + `.test.ts` — the PURE dispatcher and document
  assembler. `documentViewKind()` implements the four legacy branches
  (`Yerdəyişmə` + `doc_num` → transfer document; `Yerdəyişmə` without →
  legacy transfer; `CANCELLABLE_TYPES` + `doc_num` → ordinary document;
  without → legacy ordinary) plus `unsupported`. "Without" means legacy
  truthiness on `r.doc_num || ''` (`index.html:943`): ONLY `null` and `''`
  are doc-less, so a whitespace-only `doc_num` is truthy and DOES open a
  document view. `assembleDocumentView()`
  groups on `doc_num` AND type, applies `stripRowLevelCancelled()`, derives the
  read-only status branches with each family's OWN markers, the `docRefsLine()`
  unique values and `lotDoc` over the whole document. No React, no Supabase.
- **`components/movements/DocumentViewDialog.tsx`** + `.test.tsx` — the dialog.
  The four legacy views with their ACTION halves REMOVED, not disabled: the
  only control is «Bağla». Imports no api module and no Supabase client.
- **`pages/MovementsPage.tsx`** — «Baxış» is enabled and wired; an unsupported
  type gets the legacy refusal toast, verbatim, and opens nothing.

### Points worth carrying forward

- **Only the ID is state.** The page holds `viewId: string | null`, never a
  copied movement, and the dialog resolves it against the CURRENT store rows on
  every render. A refresh that removes the row yields an honest unavailable
  state; a FAILED refresh keeps the retained snapshot (`M8-45`).
- **`lotDoc` is derived but gates nothing.** The control it gates in legacy is
  item replacement — `D4` / I-4 — which is not built.
- **An emptied-by-stripping document is NOT cancelled** (risk R6); it has its
  own flag and wording, and `status` stays `open`.
- **The header count and the rendered rows are two different things.** The
  legacy header prints `nf(rows.length)` — the POST-strip DOCUMENT rows — while
  a transfer's preview is the OUTBOUND legs only (`index.html:5211-5217, 5238`).
  A normal two-leg transfer therefore reads «2 sətir» while showing the item
  once. `DocumentView` keeps both: `headerLineCount` for the header,
  `lines` for the table. The renderer must never derive one from the other.
- **A cancelled document's «Baxış» is unreachable from the table**, because the
  row source is `excludeCancelled()` — the legacy table hides those rows too.
  Those status branches are therefore tested by rendering the dialog directly.

### Checks after I-3 (run once, from `web/`)

- Full suite: **1952 tests / 104 files** passed — +79 tests in 2 new test
  files over the re-measured 1873 / 102 baseline. (The I-3 closing figure was
  1947; the two parity corrections below added 5 tests and changed no file
  count.)
- `npm run typecheck` clean · `npx oxlint` exit 0 · `npm run build` succeeded ·
  `git diff --check` exit 0.
- Root `index.html` MD5 still `b9be15c5ca59b68337863369620d72fa`;
  `VITE_ALLOW_LOCAL_WRITES` absent and `web/.env` unmodified.
- **No Supabase read or write, no SQL, no RPC, no schema / RLS / trigger /
  fixture / dependency / `.env` change, no root `index.html` change, no commit,
  no staging, no push and no deployment.**

### Mutation checks

Thirteen, each verified to FAIL against a plausible wrong implementation before
the correct version was restored; every touched file was then diffed against
its pre-mutation copy, so **no wrong version is left on disk**. `Yerdəyişmə`
tested after `CANCELLABLE_TYPES`; the unsupported type falling through; ordinary
grouping on `doc_num` alone; stripping not applied; an emptied document called
cancelled; the transfer view rendering both legs; transfer status read with the
ordinary markers; Qaimə fed from `doc_num`; `lotDoc` from the clicked row only;
the refusal removed from the dispatcher; a copied movement snapshot kept across
a refresh; a cancellation control rendered enabled; and the recorder rendered
as the intermediate `created_by || 'sistem'`. Two (the copied snapshot and the
recorder) first appeared to pass because the PATCH had not applied; both were
re-applied and then failed as expected, and that is recorded rather than
reported as a clean result.

### I-3 parity corrections (2026-09-06, after the I-3 close)

Two parity defects found in the shipped I-3 code and fixed. No I-4 work.

1. **`doc_num` truthiness and grouping were trimmed.** `documentViewKind()`
   tested `String(doc_num ?? '').trim()`, so a whitespace-only number was
   routed to the LEGACY doc-less view, and grouping compared trimmed values.
   Legacy does neither: it maps `r.doc_num || ''` (`index.html:943`) and
   dispatches on `m.doc ? … : …`, so whitespace is truthy and opens a document
   view, and rows are grouped by EXACT equality (`x.doc === doc`). A new
   `retainedDocNum()` keeps the stored string verbatim and now feeds the
   dispatcher, the retained `docNum` and the grouping filter. `null` and `''`
   stay doc-less. The old test asserting `'  '` → `legacy-ordinary` was WRONG
   and was replaced by three mutation-checked parity tests.
   `docRefsLine()`'s Qaimə/Müqavilə values are still trimmed — legacy trims
   those, and that behaviour is unchanged.
2. **The transfer header under-counted.** The header derived its count from
   `view.lines.length`, showing «1 sətir» for a normal two-leg transfer.
   Legacy prints `rows.length`, the post-strip document rows, while the preview
   is outbound-only. `DocumentView` gained `headerLineCount` (post-strip
   document rows) alongside `lines` (rendered preview); the dialog reads the
   former. `rawLineCount` keeps its pre-strip meaning, and its stale comment
   claiming `lines.length` was the header count was corrected.

Both corrections were mutation-checked: reinstating the trim failed all three
Finding-1 tests, and deriving the header from `lines.length` failed the two new
count tests at both the lib and dialog level. The correct sources were then
restored from pre-mutation copies and re-verified, so no wrong version is left
on disk. Full suite **1952 / 104** green; typecheck, `npx oxlint`, `npm run
build` and `git diff --check` all clean; root `index.html` still MD5
`b9be15c5ca59b68337863369620d72fa`; `VITE_ALLOW_LOCAL_WRITES` absent from
`web/.env`. Files changed: `lib/documentView.ts`, `lib/documentView.test.ts`,
`components/movements/DocumentViewDialog.tsx` and its `.test.tsx`.

### What the next session (I-4) must not claim

That Module I is complete or `ACCEPTED`; that any `M8-*` row is
`LIVE VERIFIED`; that the action portions of `M8-16` … `M8-19` shipped — only
their read-only halves did; that any cancellation RPC signature was read from
the live database; that `D-I1` was applied or approved; that `D1`, `D3`, `D4`
or `D5` was resolved; or that any Phase 7 status moved.

## Phase 8 — milestone I-4 (2026-09-06): document cancellation

**I-4 is not Phase 8 completion and Module I is not `ACCEPTED`.** It delivered
the ACTION half of the four document views I-3 rendered read-only, and nothing
beyond it.

### Live-signature evidence (read-only, no execution)

Codex ran ONE SELECT-only catalogue query against the **TEST** project
`alkjjbaawmsirsfvqljm`. All thirteen cancellation RPCs were found; each returns
`jsonb` and is `SECURITY DEFINER`. This is signature evidence only — **no RPC
was executed** against TEST or production, and it does not make anything
`LIVE VERIFIED`.

### `D-I1` is APPROVED and APPLIED

The live signatures confirm the two transfer variants take different argument
names: `cancel_transfer_document(p_original_doc_num …)` and
`cancel_layer_transfer_document(p_doc_num …)`. Legacy sends
`p_original_doc_num` to both (`index.html:5250-5251`), which cannot bind
against the live layer function — a real legacy defect, now corrected and
recorded as an approved migration deviation.

This is why `api/documentCancel.api.ts` has **no generic family helper**: a
helper parameterised by family is the exact shape that produced the legacy bug.
All thirteen functions are written out separately with their own literal
argument objects. Do not "tidy" that repetition away.

### `D4` is RESOLVED as INCLUDED

Item replacement ships with the legacy conditions preserved exactly
(`index.html:5023`): none for transfers, for a reversal or already-cancelled
document, for a separately cancelled or replaced row, or for any `lotDoc`
document.

### What I-4 ships

- `api/documentCancel.api.ts` — thirteen typed functions. Guard-first (every
  one calls `blockedReason()` before Supabase), never throws, returns typed
  results, preserves server Azerbaijani text verbatim, and OMITS
  `p_reversal_date` when blank so the server default applies.
- `lib/documentCancelGate.ts` — the pure gate SHARED by the visible control and
  the submit handler. There is no second, separately written check.
  **Corrected after the I-4 audit:** the two row actions are now SEPARATE
  gates. `canReplaceItems()` covers «Malı əvəz et» (ordinary document AND
  doc-less legacy ordinary — `index.html:5023` / `5275`); `canCancelRows()`
  covers «Sətri ləğv et» (ordinary document ONLY, because
  `legacyCancelView()` has no such control and `cancel_movement_row` cancels a
  line inside a document). `rowActionEligibility()` re-evaluates the COMPLETE
  matrix — row marker, document status, `lotDoc`, family and CURRENT admin —
  immediately before every child-dialog API call.
- `lib/replaceItemSearch.ts` — the picker search, current item excluded.
- `components/movements/CancelRowDialog.tsx`, `ReplaceItemDialog.tsx` — the two
  row-level dialogs, each with a mandatory trimmed reason.
- `DocumentViewDialog.tsx` — extended with the four document-level families.
- `lib/mutationGuard.ts` — the seven `doc.*` actions, added ADDITIVELY.
- `store/movements.store.ts` — `layerActive` AND `layerReady` from the live
  capability probe. **Corrected after the I-4 audit (fail-closed):** a probe
  that did not answer leaves the capability UNKNOWN and selects NO cancellation
  write family; a refresh whose probe fails preserves the previously known
  capability instead of flipping families. `{ready:true, active:false}` still
  selects the non-layer RPCs exactly as before.
- `pages/MovementsPage.tsx` — wires `isAdmin`, `layerActive`, `layerReady`,
  refresh, toast.

Actions are Admin-only in the UI; the server stays authoritative. Every dialog
holds an ID and re-reads the row AND re-assembles the document view from the
CURRENT rows immediately before submitting — the child dialogs included, which
before the audit correction re-ran only the row-local half — so a stale dialog
cannot act on a changed row or a changed document. `inFlight` is set
before the first `await` and released in `finally`. A failed refresh retains the
previous snapshot and says the list is stale. The dialog states on screen that
reversals create new rows and never modify originals.

### Checks after I-4 + the I-4 audit corrections (from `web/`)

All figures in this subsection are **Claude's own reported runs**, superseded by
the 2026-09-07 correction below. Codex's independent verification is a
separate, focused run — see "Test-result provenance" at the end of this file.

- Focused: **321 tests / 8 files** green (gate, cancel-state, document view,
  movements store, `DocumentCancel`, `DocumentViewDialog`, cancellation API,
  `MovementsPage`).
- Full suite: **2110 / 2110 passed, 108 / 108 files**, process exit code `0`,
  ~81 s. Nothing skipped, nothing timed out, no unhandled error.
- `tsc -b --noEmit` clean; `npx oxlint` clean; `vite build` succeeds;
  `git diff --check` clean.
- Root `index.html` still MD5 `b9be15c5ca59b68337863369620d72fa` (verified
  unchanged); `VITE_ALLOW_LOCAL_WRITES` absent from `web/.env`.
- Supabase mocked at the API boundary in every test. No live write, SQL
  mutation, RPC execution, fixture, schema/RLS/trigger change, dependency or
  env change, deployment, commit, staging or push.

### I-4 UI consistency correction (2026-09-07) — the child dialogs gate at RENDER

**The defect.** After the audit corrections, `CancelRowDialog` and
`ReplaceItemDialog` re-ran the full `rowActionEligibility()` in their SUBMIT
handlers, so no ineligible action ever reached an RPC. But their button
`disabled` conditions checked only presence, the typed inputs, `inFlight` and
(row cancellation only) capability readiness — `CancelRowDialog.tsx:129`,
`ReplaceItemDialog.tsx:111`. A dialog left open while the document was
cancelled, became a reversal, turned `lotDoc`, or the user lost admin therefore
kept offering an ENABLED submit button that answered a click with an error
toast. Safe, but dishonest: the UI said the action was available when the rule
had already refused it.

**The correction.** Both dialogs now call the SAME
`rowActionEligibility()` during render, into `eligibilityRefusal`. When it is
non-null the submit button is disabled and the refusal text is displayed in the
dialog body (`data-testid="rc-ineligible"` / `"rp-ineligible"`). The rule is
NOT duplicated — the render gate and the submit gate are two calls to the one
shared function, exactly as the document-level control already worked.

**The submit-time recheck is kept and is not redundant.** The store can change
between React committing an enabled button and the handler running, so the
handler still refuses on its own re-read rather than trusting render.

**Preserved:** the typed reason and the picked item survive the transition,
«İmtina» and the × stay enabled (an ineligible dialog is never a trap), and the
row-local refusals keep their SPECIFIC text (transfer, already-cancelled)
rather than collapsing into the generic document sentence.

**Tests.** `DocumentCancel.test.tsx` grew from 58 to 62 cases. The eight
finding-2 cases that previously clicked and asserted a toast now assert the
disabled button, the visible reason, the preserved input, the usable «İmtina»
and zero RPC calls. Because a click on a disabled button proves nothing about
the handler, the handler safeguard is proven SEPARATELY by two new cases that
drive submit through a button the render gate still considers ENABLED — the
rows are served through a proxy whose contents change after render commits.

Both directions were mutation-checked:

| mutant | result |
| --- | --- |
| submit-time `rowActionEligibility()` neutralised, render gate kept | the 2 handler cases FAIL |
| render gate neutralised, submit gate kept | 10 cases FAIL |

So neither gate's tests pass on the other gate's behaviour.

**Checks (from `web/`, 2026-09-07).** Focused
`DocumentCancel.test.tsx`: **62 / 62** green. Full suite: **2114 / 2114 passed,
108 / 108 files**, exit code `0`, ~76 s — the baseline 2110 plus the 4 net new
cases, nothing skipped or timed out. `npm run typecheck` (`tsc -b --noEmit`)
clean; `npm run lint` (`oxlint`) clean; `npm run build` succeeds (the >500 kB
chunk notice is the pre-existing warning, not new). The corrected action
matrix, the capability-readiness handling and the `SHOW_MAX` full-size cap test
are unchanged and still green. No live write, SQL, configuration, dependency,
staging, commit or deployment. I-5 not started.

### The `SHOW_MAX` timeout — CORRECTED CAUSE

The earlier entry recorded **2062 / 2063** with
`MovementsPage.test.tsx > caps at SHOW_MAX rows and offers to show them all`
timing out, and named the pre-existing O(n²) `cancelledDocFor()` per registry
row as the likely underlying cost. **That attribution was wrong, and the
measurements are recorded here so it is not repeated.**

Measured on the same 3001-row set the test builds:

| phase | cost |
| --- | --- |
| `cancelledDocFor()` for all 3001 rows over all 3001 rows | **223 ms** |
| initial render of 3001 rows | ~2.1 s |
| `userEvent.click` | ~1.0 s |
| `waitFor` the expansion | ~46 ms |
| React unmount / cleanup | ~0.4 s |
| **`screen.getByRole('button', …)`** | **~96 s** |

The cost was one accessibility-tree query in the TEST: a role query computes
the accessible name of every node in the document. The file already avoids
`getAllByRole('row')` for exactly this reason (its `bodyRowCount()` helper);
the same technique is now applied to the one remaining role query on a
full-size table, via a `buttonByText()` helper that still asserts the button
exists, is unique and carries the expected label.

Result: that test went from **~104 s to ~3.7 s**. `SHOW_MAX` is unchanged at
3000, the 3001-row assertion is unchanged, and the 240 s budget was NOT raised
— it is retained as headroom.

**No cancellation index was introduced.** It would have added a second
implementation of the marker semantics, with its own drift risk, to save
~223 ms of a ~104 s problem that was not in application code. The pure helper
remains the single source of truth, and `documentCancelState.test.ts` now pins
its exact semantics per family — ordinary, transfer, doc-less ordinary
(exact-match), doc-less transfer (containment, either side of the pair,
including the substring consequence for tricky ids), the `'—'` fallback and
the doc-less-unsupported case — so any future optimisation has an oracle.

### I-4 audit findings — disposition

- **Finding 1 (wrong row action in the doc-less ordinary view)** — CONFIRMED
  against `index.html:5264-5275` and `5019-5022`. Gates split; fixed.
- **Finding 2 (child handlers do not re-run the full gate)** — CONFIRMED
  against both child dialogs. `rowActionEligibility()` added; fixed. The
  earlier documentation claim that the visible control and the handler shared
  one FULL gate was false for the child dialogs and has been corrected above.
- **Finding 3 (unverified write family on capability failure)** — CONFIRMED;
  the store discarded `ready`. Fail-closed behaviour implemented as a
  documented safety deviation from the legacy degraded fallback
  (`index.html:949-975`): it changes ONLY the uncertain/error state.
- **Finding 4 (full suite not green)** — the SYMPTOM is confirmed and now
  fixed. The finding's proposed CAUSE is **contradicted by measurement**:
  `cancelledDocFor()` costs 223 ms over the 3001-row set, not seconds. The real
  cost was a single `getByRole` accessibility walk in the test (~96 s). No
  memoized/indexed lookup was introduced, for the reasons and with the
  equivalence-test oracle recorded above.

### I-4 mutation checks (the milestone and its audit corrections)

Five mutants from I-4 itself, five caught. One (removing the row-cancel stale
re-check) initially SURVIVED because the first stale test drove a REMOVED row,
which the component's own `!row` early return already caught without exercising
the handler. A second test that keeps the row present but ineligible does catch
it. The weak test is recorded rather than quietly replaced.

Three further mutants for the audit corrections, each reverting the fix to the
audited pre-fix behaviour and each caught:

- **Finding 1** — letting `canCancelRows()` accept `legacy-ordinary` again:
  **4 tests fail**, including the component test proving a doc-less ordinary
  row offers «Malı əvəz et» and whole cancellation but never «Sətri ləğv et».
- **Finding 2** — dropping the document half of `rowActionEligibility()`:
  **12 tests fail**, covering the document-level marker, the document becoming
  a reversal, a valuation making it `lotDoc`, the transfer branch, the legacy
  per-ID marker and the non-admin case, for both child dialogs.
- **Finding 3** — discarding `ready` in the store: **5 tests fail**, covering
  the unknown-capability state, the preserved known capability across a failed
  refresh probe, zero cancellation RPCs while unknown, and the honest retry.

The 2026-09-07 render-gate correction adds its own two-direction mutation table,
recorded in the UI-consistency section above.

### Test-result provenance — two DIFFERENT runs, do not merge them

| run | scope | result |
| --- | --- | --- |
| Claude, 2026-09-07, after the render-gate correction | full suite | **2114 / 2114 passed, 108 / 108 files**, exit code `0`, ~76 s; focused `DocumentCancel.test.tsx` **62 / 62** |
| Codex, independent, latest | focused: **2 files** | **101 tests** green; typecheck, lint and build passed |

These are not the same measurement and neither supersedes the other. Codex's
run is an INDEPENDENT focused re-verification over two files, not a full-suite
run, so it neither confirms nor contradicts the 2114 / 108 figure. Do not quote
"101" as the suite total, and do not quote "2114" as an independently audited
number. The last full-suite figure is Claude's own; the last independent
verification is Codex's focused one.

### I-5 — IMPLEMENTED LOCALLY (2026-09-07)

`specs/2026-09-07-phase8-i5-batch-cancellation-proposal.md` (revision 2,
corrected) and `audits/2026-09-07-phase8-i5-implementation-handoff.md`.
Batch cancellation («Qrup üzrə ləğv») is now built: `M8-30`, `M8-31` and `M8-32`
are `CODE VERIFIED`. `D3` is recorded as INCLUDED **for local implementation
only** — no live execution, and no `LIVE VERIFIED` row.

**CORRECTION — the layer-batch claim in the previous version of this section was
WRONG and is withdrawn.** It said "the layer batch RPC has no pre-validation, no
locks and no balance simulation". That compared only the OUTER function bodies.
Reading the callees shows `cancel_layer_document` (`ANBAR_SHARED/sql/036_stock_layers.sql:604-680`)
takes a `cancel|<doc>` advisory lock, per-`(warehouse|item_code)` advisory
locks, `FOR UPDATE` on the affected `stock_layers` rows, and pre-validates
before writing; `cancel_layer_transfer_document` (`:685-710`) mirrors it. Those
locks are `pg_advisory_xact_lock` — transaction-scoped — so locks taken in
iteration N are still held in N+1.

The real asymmetry is narrower: `sql/010` acquires its whole lock set up front
in a deterministic order and pre-simulates the batch's balance impact, while the
layer path acquires locks incrementally per document. That is a lock-ORDERING
and failure-TIMING difference (a deadlock between concurrent overlapping batches
would abort one transaction, not corrupt data), not an absence of protection.
**It is not a proven server defect**, and no SQL task is raised.

All statements about either RPC's body are claims about the rank-4 migration
files at the hashes recorded in the proposal's §4.0 — the DEPLOYED bodies and
`EXECUTE` privileges remain **UNVERIFIED**. What IS verified live is only
existence and signatures, from Codex's read-only catalogue query against TEST
`alkjjbaawmsirsfvqljm` (2026-09-06).

The other two findings stand and are both fixed in I-5: the layer RPC returns
`document_count` where the wrapper read only `cancelled_count` (so the layer
path reported 0), and the legacy execute path reports a post-success refresh
failure as "nothing was cancelled", which is false.

### What the next session (I-6) must not claim

That Module I is complete or `ACCEPTED`; that any `M8-*` row is
`LIVE VERIFIED`; that any cancellation RPC has been executed against any
project; that the batch path was exercised against real data (it was not — every
test mocks the write transport, and the localhost guard stays active); that the
correction flow (I-6), exports (I-7) or the live gate (I-8) started; that `D1`
or `D5` was resolved; or that any Phase 7 status moved.

`D3` is INCLUDED for local implementation only. That is not approval for a live
batch cancellation, which remains a user decision.

### I-5 audit fixes — 2026-09-07, still LOCAL ONLY, still not `LIVE VERIFIED`

Five findings against the I-5 local implementation were independently
re-verified against the actual code (not taken on faith) and all five held.
Fixes below; `M8-30`/`M8-31`/`M8-32` remain `CODE VERIFIED`, nothing moved to
`LIVE VERIFIED`, `D3` is unchanged (INCLUDED for local implementation only),
and I-6 was not started.

1. **Success validation was incomplete** (`lib/batchOutcome.ts`,
   `validateSuccessBody`). Reproduced exactly as reported:
   `{results:[]}`, `{results:[{ok:false}]}`,
   `{cancelled_count:1, document_count:9}` and
   `{cancelled_count:1, results:[{error:'failed'}]}` all validated as
   success before the fix. Now: a count-free `results` array must account
   for every submitted document (a short or empty array against a nonzero
   submission is refused, not accepted as silent evidence); a `results`
   element carrying `ok:false` / `success:false` / a truthy `error` is
   refused even under an otherwise-coherent count; and when BOTH
   `cancelled_count` and `document_count` are present they must agree —
   disagreement is refused rather than the first key silently winning. No
   field beyond the ones already documented in the proposal (`cancelled_count`,
   `document_count`, `results`, and the known non-layer results shape
   `doc_num`/`is_transfer`/`reversal_doc_num`/`row_count` from
   `sql/010_batch_cancel_documents_rpc.sql:188-197`) was invented.

2. **`classifyFailure` treated every 4xx as confirmed rejection.** 408
   (Request Timeout) and 429 (rate limited) are now carved out of the
   4xx→`rejected` rule and stay `unknown`: both are proxy/gateway-shaped
   ambiguity (a client giving up on a slow request, not the server refusing
   it), and a statement already committing when the timeout fires can still
   land. Genuine rejections (400/401/403/404/409/422/499, tested explicitly)
   are unaffected, and the server's real message still passes through
   verbatim on those.

3. **Unresolved state held only one batch.** `batchCancel.store.ts` changed
   from a single `unresolved: UnresolvedBatch | null` slot to a map of
   records keyed by id (`unresolvedById`/`unresolvedList`), so a second
   `markUnresolved` call no longer silently drops the block on an earlier
   batch's documents. `blockedByUnresolved` and `allUnresolvedDocNums` now
   union across every held record. In the dialog's `recordUnknown`, the
   record is written via `markUnresolved` BEFORE the follow-up `onRefresh()`
   is even attempted (previously after), and a failed or thrown refresh only
   updates the `refreshFailed` flag on that same record via the new
   `setRefreshFailed` action — it can no longer lose the record entirely by
   throwing before it was written.

4. **Submission protection was component-local.** Two layers were added
   (a third — a PERSISTED pre-dispatch record covering a page RELOAD, which
   neither layer below survives — was added by the 2026-09-07 corrections),
   because the existing `useRef` guard only ever protected one mounted
   instance:
   - `Dialog`'s × and mask call `onClose` unconditionally
     (`components/ui/Dialog.tsx`); `BatchCancelDialog` now wraps every path to
     `onClose` (both dialog steps' `Dialog` prop, the «Bağla» button) in a
     `guardedClose()` that refuses and toasts while `inFlight`, instead of
     passing the raw `onClose` straight through.
   - A pending-submission reservation (`beginPending`/`endPending`/
     `isPending`) was added to the STORE, which outlives the dialog exactly
     as the unresolved-batch records do. `execute()` reserves the submitted
     documents before the RPC call and releases them in every exit path
     (rejection, unknown, success, and the `finally`). A freshly reopened
     dialog instance — with a brand-new, non-reserved `useRef` — still
     refuses to resend documents whose earlier request is reserved in the
     store.
   - Tested directly: closing mid-request and reopening sends zero further
     RPC calls for the same documents until the original request resolves;
     the mask click is a no-op while `inFlight`.

5. **Reconciliation was unwired.** `unknownResolvedBy` and `clearUnresolved`
   now have a real caller: a `useEffect` in `BatchCancelDialog` runs on every
   render against the CURRENT `allRows`, checking each unresolved record's
   documents through the existing `docCancelledBy()` marker read
   (`lib/documentCancelState.ts`) — no new RPC, no new SQL. A record clears
   only when every one of its documents shows a real `Ləğv: <doc>` marker
   row; a missing marker or an unrelated record is left untouched (tested:
   clearing one of two coexisting records leaves the other blocking).
   **SUPERSEDED 2026-09-07 — see «I-5 corrections» below.** This paragraph
   described the reconciliation as reading every document through
   `docCancelledBy()`, and the persistence as failing "conservatively". Both
   statements are withdrawn. `docCancelledBy()` alone never matches a
   TRANSFER (which carries `Ləğv (əks yerdəyişmə): <doc>`), so a batch
   containing one could not reconcile at all; and the "conservative" read
   fallback returned `{}` on any storage error, which `hydrate` then assigned
   over live in-memory records — REMOVING protection rather than preserving
   it. The scope was also the account id alone, not the Supabase project. The
   corrected behaviour is recorded in the section below.

**Verification.** Focused: `batchOutcome.test.ts` (51, was 37),
`BatchCancel.test.tsx` (36, was 30), new `batchCancel.store.test.ts` (18, new
file), `batchCancel.test.ts` (29, unchanged), `documentCancel.api.test.ts` (40,
unchanged), `MovementsPage.test.tsx` (57, unchanged) — all passed on a single
run. Full suite: `vitest run` — **2255 passed, 112 files, 0 failed**, one clean
run (no rerun needed, unlike the prior I-5 session's jsdom flake). `tsc -b
--noEmit` clean. `oxlint` clean, no output. `npm run build` — built in 1.91s
(same pre-existing chunk-size warning). `git diff --check` — no whitespace
errors. None of the five touched files (`lib/batchOutcome.ts`,
`store/batchCancel.store.ts`, `components/movements/BatchCancelDialog.tsx`,
`pages/MovementsPage.tsx`, plus their test files) were ever committed to this
branch, so there is no prior committed baseline to diff against for them —
consistent with the original I-5 handoff's statement that nothing from that
work was committed.

**Not done here, by design:** no live RPC call, no SQL, no fixture, no
environment or dependency change, no staging, no commit, no deployment, and
I-6 was not started. The remaining live checks listed in the original I-5
implementation handoff (deployed-body match, `EXECUTE` privileges, one real
batch cancellation against TEST, real mid-batch failure behaviour, whether a
real transport failure actually surfaces as `status: 0` in this deployment)
are still outstanding and still need `D5`.

---

## I-5 corrections — five audit findings closed (2026-09-07, local only)

Five gaps were reported against the I-5 implementation after Codex's 174-test
run. **All five were independently verified as real before any code changed**
— two by executing the shipped helpers directly, one against the installed
SDK source, one against the deployed-migration SQL, one by reading the effect.
No finding was disputed.

### What was verified, and how

| # | Finding | Independent evidence |
|---|---|---|
| 1 | Success + failed refresh loses protection | `BatchCancelDialog.tsx` released `endPending` **before** `onRefresh()` and called `onClose()` unconditionally, recording nothing. Reopening against the un-refreshed rows re-permitted the identical batch. |
| 2 | Persistence fails open | `readStore` returned `{}` for every read error/corrupt JSON, and `hydrate` **assigned** it over existing memory. Scope was `me.id` alone. Nothing was persisted before dispatch. |
| 3 | Reconciliation is ordinary-only | The effect called `docCancelledBy` for every document. Transfers are marked `Ləğv (əks yerdəyişmə): <doc>`, read only by `docReversalDoc` (`documentCancelState.ts:61-69`) — a transfer batch could **never** auto-resolve. |
| 4 | Success validation accepts invalid evidence | Executed `validateSuccessBody(data, 1)`: `{results:[null]}`, `{results:[{}]}`, `{results:['garbage']}` **all returned `valid`**. The loop tested for absence of a failure marker, which is not presence of a success. |
| 5 | Classification ignores provenance | Executed `classifyFailure`: 400/401/403/**404**/409/**418**/422/**451** all returned `rejected`. And `processResponse` (`postgrest-js/dist/index.cjs:489-497`) sets `error = {message: body}` with **no `code`** when a non-2xx body is not JSON — so a proxy's HTML 404 page was being reported as a confirmed server rejection. |

### What changed

**1 — a confirmed success awaiting refresh is now its own state.** Records
carry a `phase` (`'pending' | 'unknown' | 'success'`). On a confirmed success
whose refresh fails or throws, the record is **kept** in the `'success'`
phase, the dialog stays open, and the block holds. The success message stays
accurate in both cases — the server confirmed before the refresh was ever
attempted — and `blockMessageFor()` renders a confirmed success as «artıq
ləğv edilib», never as unconfirmed. A succeeding refresh closes the dialog as
before; the retained record clears automatically once fresh rows show the
markers.

**2 — persistence fails CLOSED.** A read error or corrupt JSON is now an
error, not an empty history: existing in-memory records are **preserved**, and
`persistenceError` is exposed and treated as a **blocking gate** — the dialog
disables execute, shows the reason, and refuses to dispatch. Stored records
are validated field by field (~~a malformed entry is dropped; well-formed
siblings survive~~ — **SUPERSEDED 2026-09-07, see «Correction 2b» below**: a
malformed entry is *not* dropped; it raises a blocking error, because dropping
it silently freed its documents for resubmission). The scope is **project + account** (`scopeOf()` =
Supabase project ref + `me.sbId`, not the app-internal `me.id`), and each
record **carries the scope it was written under**, so a response arriving
after an account change cannot redirect its record into the new account.
Attempts are **persisted before dispatch** in the `'pending'` phase: a reload
mid-RPC restores uncertainty. If the record cannot be persisted, the request
is **refused** with an actionable message. No credentials, no expiry, no
silent reset.

**3 — reconciliation is per family.** New `observedCancelledDocs()` dispatches
each document to `docCancelledBy` or `docReversalDoc` using the **same rule
`buildBatchDocs` already applies** (`batchCancel.ts:147-160`): rows including
`Yerdəyişmə` read the reversal marker, everything else the ordinary one. The
`'—'` fallback (a marker row with no `doc_num`) is still positive evidence.
Partial evidence never resolves.

**4 — a results entry must be positive evidence.** Every entry must be a plain
object carrying a non-empty `reversal_doc_num` — the identifier of the
counter-document actually written. This is the real contract of both RPCs:
`sql/010:193-198` builds `{doc_num, is_transfer, reversal_doc_num, row_count}`,
and `sql/036:831` nests `cancel_document`'s own `{original_doc_num,
reversal_doc_num, …}` (`sql/003:144`). Count-free bodies still succeed when
`results` is coherent.

**5 — a rejection needs a recognised server contract.** `'rejected'` now
requires an unambiguous 4xx **and** a recognised code: a PostgREST
`PGRST\d{3}` or a five-character Postgres SQLSTATE (`P0001`, `23505`,
`42501`). A code-free 4xx, an empty code, or an unrecognised shape
(`WAF_DENY`) is **UNKNOWN**, because it cannot be shown that the database —
rather than an intermediary — answered. 408/429 stay UNKNOWN even with a valid
code. `PostgrestError` declares `code` as required (`dist/index.d.cts:26-29`),
which is what makes its absence meaningful.

### Regression tests — full user sequences, not just store methods

Added as complete rendered-dialog sequences, asserting **RPC call counts**:

- success → failed refresh → reopen → attempted resubmit → **zero additional
  RPCs** (execute disabled, and clicking it anyway sends nothing);
- success whose refresh **throws** → message still accurate;
- retained success record **clears** once fresh rows show markers;
- persistence read failure → **zero RPCs**, reason displayed;
- persistence write failure at dispatch → **zero RPCs**, actionable message;
- reload while the RPC is outstanding → `'pending'` restored, documents blocked;
- transfer / ordinary / **mixed** batches, partial evidence, wrong-family
  marker, and failed refresh;
- invalid `results` entries through the **rendered outcome path**;
- code-free 403/404/400 → UNKNOWN, never «heç bir sənəd ləğv edilmədi»;
  a real `P0001` rejection still surfaces verbatim and holds no block.

**Two mutation checks** confirmed the tests are not vacuous: reverting only
correction 1 fails the resubmit sequence; reverting only correction 3 (reading
transfers with `docCancelledBy`) fails the transfer-reconciliation test.

### Verification — exact results

| check | command | result |
|---|---|---|
| focused: outcomes | `vitest run src/lib/batchOutcome.test.ts` | **83 passed** (was 51) |
| focused: dialog | `vitest run src/components/movements/BatchCancel.test.tsx` | **55 passed** (was 36) |
| focused: store | `vitest run src/store/batchCancel.store.test.ts` | **25 passed** (was 18) |
| focused: grouping | `vitest run src/lib/batchCancel.test.ts` | **29 passed** |
| focused: API + page | `vitest run src/api/documentCancel.api.test.ts src/pages/MovementsPage.test.tsx` | **97 passed** |
| full suite | `vitest run` | **2313 passed, 112 files, 0 failed** — one clean run |
| typecheck | `tsc -b --noEmit` | clean, exit 0 |
| lint | `oxlint` | clean, no output |
| build | `npm run build` | ✓ built in 2.30s (pre-existing chunk-size warning) |
| whitespace | `git diff --check` | exit 0, no errors (CRLF warnings pre-existing) |

Files changed (7, all I-5): `lib/batchOutcome.ts`,
`store/batchCancel.store.ts`, `components/movements/BatchCancelDialog.tsx`,
`pages/MovementsPage.tsx` (hydrate scope → `me.sbId`), and three test files.
Root `index.html` was NOT edited — its single pending diff
(`manage_reference` at :3164) predates this work and is untouched.

### Tests whose assertions were CHANGED, not merely added

Four encoded the old contract and would otherwise have locked the defects in:

- `'D. a failed refresh after SUCCESS…'` asserted `onClose` was called and
  **no record was kept** — exactly finding 1's defect. Rewritten to assert the
  retained `'success'` record and that the dialog stays open.
- The store's `'read failure falls back to empty, conservatively'` and
  `'corrupted JSON is treated as empty'` asserted the fail-OPEN behaviour
  finding 2 reverses. Rewritten to assert `persistenceError` and preserved
  memory.
- Several `results: [{}]` fixtures were success cases the stricter validator
  correctly refuses; updated to the real RPC element shape.

### Remaining limits — unchanged and still unverified

The corrections are **client-side only**. No live RPC, no SQL, no migration,
no fixture, no deploy. Every live item from the original I-5 handoff stands
open: both batch RPCs' **deployed bodies**, `EXECUTE` privileges on TEST and
production, the **real response shape** each RPC returns (item 3 there is now
sharper — the validator requires `reversal_doc_num` in every `results` entry,
so a live run must confirm the layer batch actually emits it), real mid-batch
failure text and status, and whether a real transport failure surfaces as
`status: 0`. These need a live write and remain user decision `D5`.

Two honest client-side limits remain:

- `sessionStorage` is per tab. A record does not cross tabs, and a batch
  submitted in one tab does not block the same documents in another. Making
  it cross-tab means `localStorage`, which would outlive the browser session
  — a trade deliberately not taken here.
- A `'pending'` record restored after a reload can never be resolved by the
  client on its own if the request truly vanished; it clears on positive
  observation, or by explicit informed dismissal. That is the intended
  behaviour, not a gap.

I-6 not started.

---

## I-5 correction 2b — a damaged stored record no longer fails open (2026-09-07, local only)

**Finding, independently verified before changing anything.** `readStore` in
`store/batchCancel.store.ts` validated each stored record and then did
`if (rec) out[id] = rec`, returning `ok: true` regardless. A record that
PARSED but was structurally invalid was therefore silently discarded.

Verified by execution, not by reading. Seeding one valid record for `A` and
one record for `B` with a single damaged field (`refreshFailed: 'CORRUPT'`),
then hydrating, produced:

```
persistenceError = null
records          = 1          (B's record gone)
B blocked        = []
beginAttempt(B)  = ub-…       ← SUCCEEDED — dispatch permitted
```

So a stored attempt for `B` lost its protection and `B` could be resubmitted
while its server outcome was still unconfirmed. This is the same fail-open
hole the read-error path was closed against in correction 2, one level down:
**valid JSON does not imply a readable attempt history.** The prior session's
own code comment claimed the entry "is never silently treated as absent",
which the executed probe disproved. The test
`'a malformed RECORD is dropped while well-formed siblings survive'`
explicitly asserted `persistenceError: null`, so it encoded the defect.

**Fix, narrow.**

- An invalid record **belonging to the current scope** now yields a blocking
  read failure with its own message (`RECORD_INVALID`, distinct from
  `READ_FAILED`: storage answered and the JSON was well-formed, so the fault
  is the content). A record carrying **another scope** is not counted — that
  is ordinary isolation, not damage — via a new `belongsToScope()` helper. A
  blob with no readable scope counts as ours, since we cannot prove otherwise.
- Valid siblings are still returned and **merged into** in-memory state, so
  real blocks keep blocking while dispatch is refused. Existing in-memory
  protection is never removed.
- The **stored value is left intact** for diagnosis — hydration never rewrites
  or prunes storage (asserted by test).
- `beginAttempt` now **refuses while `persistenceError` stands**, so the gate
  is in the store rather than only in the rendered button; no caller can route
  around a disabled attribute. It also no longer *clears* `persistenceError`
  on a successful write — a successful write proves that record was stored,
  not that the earlier unreadable history became readable. Only a clean
  `hydrate` clears it.

**Preserved and re-asserted by test:** normal hydration and dispatch, scope
isolation, pending-before-dispatch persistence, multiple coexisting attempts,
and positive reconciliation — all unchanged.

**Two mutation checks** confirmed the tests are not vacuous: making `readStore`
drop silently again fails 4 tests; removing the `beginAttempt` gate fails 3.

**Verification (exact).** `batchCancel.store.test.ts` **31 passed** (was 25);
`BatchCancel.test.tsx` **59 passed** (was 55); six focused files together
(`store`, `dialog`, `batchOutcome`, `batchCancel`, `documentCancel.api`,
`MovementsPage`) **299 passed, 0 failed**. `tsc -b --noEmit` exit 0.
`oxlint` exit 0, no output. `git diff --check` no errors (a stray
blank-line-at-EOF introduced in this file by the previous session was also
corrected). Root `index.html` **not edited** — MD5 `b9be15c5ca59b68337863369620d72fa`;
no unresolved Git merge entries found in `index.html` or `web/src`.

Files changed (3, all I-5): `web/src/store/batchCancel.store.ts` and its two
test files (`store/batchCancel.store.test.ts`,
`components/movements/BatchCancel.test.tsx`). The earlier «Files changed (2)»
count was wrong: it named three files.

**Local only.** No live query or write, no SQL, no dependency or configuration
change, no staging, commit or deployment. All `D5` live checks remain open.
I-6 not started.

## I-6 correction flow — PROPOSAL ONLY (2026-09-07)

Proposal: [`specs/2026-09-07-phase8-i6-correction-flow-proposal.md`](specs/2026-09-07-phase8-i6-correction-flow-proposal.md).

**Nothing was implemented.** Documentation only: no code, test, SQL, fixture,
dependency, environment, live query or write, staging, commit or deployment.
The application test suite was deliberately not run. Root `index.html` not
edited. All I-5 protections are untouched.

**What the trace established.** I-6 is a CALLER, not a feature rebuild. Already
built and tested: `fetchDocumentEditImpact`, the store's `EditDocState` /
`enterEditMode` / `exitEditMode` contract, `editRestoreQty` in validation, the
edit-mode banner and «Düzəlişi qeyd et» dialog, the Qaimə self-exclusion, and
the write (`correctDocument` + the store's edit branch). Missing: the entry
button, its gate, the one-document-at-a-time guard, the two impact modals, the
line→draft mapping, and the store-then-navigate wiring (`M8-33` … `M8-39`).

**Two findings worth carrying forward.**

1. The Phase 8 proposal §3.6 says `enterEditMode` "clears the saved draft". It
   does not call `clearStoredDraft`; the draft is removed indirectly because
   `shouldSaveDraft` returns false in edit mode and `saveDraftNow` then removes
   the key. End state matches legacy, so I-6 must NOT add a second clear.
2. `correctDocument` reports a lost-after-commit response as «sənəd
   dəyişməyib», which can be false — the same class of defect `lib/batchOutcome.ts`
   exists to prevent. Recorded as new decision `D6`, not silently changed.

**Statuses unchanged.** `M7-109` stays `IN PROGRESS`; `M7-120` stays
`LIVE VERIFIED` for the ordinary movement-INSERT consequence only; nothing in
Module I is `LIVE VERIFIED`; I-5 remains local-only and not `ACCEPTED`. Its
latest persistence correction passed Codex's independent review at 90 tests
across the store and dialog suites with typecheck and lint clean and the root
`index.html` hash unchanged — a scoped local result, not live acceptance.

**Also corrected here:** the previous handoff section's «Files changed (2)»
line, which named three files.

## I-6 — IMPLEMENTED LOCALLY (2026-09-07)

Full detail: [`specs/2026-09-05-phase8-registry-rows.md`](specs/2026-09-05-phase8-registry-rows.md)
§«Milestone I-6». Proposal: [`specs/2026-09-07-phase8-i6-correction-flow-proposal.md`](specs/2026-09-07-phase8-i6-correction-flow-proposal.md).

`M8-33` … `M8-39` are `CODE VERIFIED`. **Nothing is `LIVE VERIFIED` or
`ACCEPTED`.** No live query or write, no SQL, fixture, dependency or
environment change, no root `index.html` edit, no staging, commit or
deployment. I-7 was NOT started.

**Files changed (17).** New (9): `lib/documentEdit.ts`,
`lib/correctionOutcome.ts`, `store/correction.store.ts`,
`components/movements/EditDocumentDialog.tsx`, plus five test files
(`documentEdit`, `correctionOutcome`, `correction.store`, `correctionWrite`,
`DocumentEdit`). Modified (8): `App.tsx`, `pages/MovementsPage.tsx`,
`pages/NewOperationPage.tsx`, `components/movements/DocumentViewDialog.tsx`,
`api/postMovementDocument.api.ts`, `store/operation.store.ts`, and two existing
test files.

**Correction to this section's own count (2026-09-07, I-6 audit follow-up).**
It read «Files changed (12)» while the prose beneath it enumerated 17 files —
9 new and 8 modified. The list was right and the number was wrong; 17 is the
count of the files this section names. This is the THIRD count error in the
handoff (after «Files changed (2)» naming three files, and its own correction),
so the number is now derived by counting the enumeration rather than stated
alongside it.

**Three real defects were found by testing, not by reading:**

1. A stale closure froze the dialog's gate inputs at the render that started
   the impact request, so a second document entering edit mode mid-flight
   rendered the CONFIRMATION instead of the refusal. Inputs moved to a ref.
2. `load()` reports `ok` from `folded.loaded`, which stays TRUE when a previous
   snapshot exists (M8-45). Reading only `ok` made `correction-stale`
   unreachable and would have claimed a confirmed success over a stale list.
   It now also reads `coreError`.
3. Hydrating the correction store only on «Mal hərəkəti» left it unscoped for a
   user who reloads straight onto «Yeni əməliyyat» — where the correction is
   actually submitted — and `beginAttempt` refuses without a scope. Both
   screens hydrate now.

**Two proposal inaccuracies corrected before coding** (both independently
verified): `fetchDocumentEditImpact` CASTS rather than validates, so the impact
contract is validated before anything renders or a draft is replaced; and the
helper is `classifyFailure`, not `classifyOutcome` — reused for transport
classification, while `validateSuccessBody` is NOT reused because its
`cancelled_count`/`results` keys are batch-only.

**SQL provenance.** `030_correct_document.sql` is NOT in this repository; it is
at `ANBAR_SHARED/sql/030_correct_document.sql`, MD5
`ae0f3f16b5aea2979053e7f9311e40be`. A local definition proves nothing about
deployed behaviour, and no RPC's existence was taken as evidence of a working
frontend path.

**`D6` resolved as implemented:** only a CONFIRMED rejection may say «sənəd
dəyişməyib»; an UNKNOWN outcome records the attempt and blocks a repeat
correction of that document across close/reopen and reload.

**Verification.** Focused I-6 **115 passed** across five files; I-5 regression
**173 passed**; full suite **2441 passed, 1 failed / 118 files**. The one
failure is `probe/probe.test.ts`, a leftover diagnostic scratch file from the
earlier I-5 session that fails identically in isolation and was not touched.
Four mutation checks all caught. `tsc -b --noEmit` 0, `oxlint` 0,
`vite build` succeeded, `git diff --check` 0. Root `index.html` unedited —
MD5 `b9be15c5ca59b68337863369620d72fa`. **I-5 protections intact**: its store,
outcome module and dialog were not modified, and the correction records live in
a separate store with a separate storage key.

**Remaining live checks (I-8, `D5`).** `document_edit_impact` has never been
executed from React against any project; `correct_document` has never been
executed on TEST; `M7-120`'s `correct_document` audit row stays `OPEN`; none of
the four correction outcomes has been observed against a real server.

## I-6 audit findings — FIXED LOCALLY (2026-09-07)

All five findings of the I-6 audit were independently verified against the code
before any change, and all five were **confirmed**. No finding was disputed.
Nothing is `LIVE VERIFIED` or `ACCEPTED`; I-7 was NOT started. No live query or
write, no SQL, fixture, dependency or environment change, no root `index.html`
edit, no staging, commit or deployment.

**Files changed (13, counted from the list):** new — `lib/correctionReconcile.ts`,
`lib/correctionReconcile.test.ts`, `store/batchCancelCorrupt.test.ts`; modified —
`lib/correctionOutcome.ts`, `lib/correctionOutcome.test.ts`,
`lib/documentEdit.ts`, `lib/documentEdit.test.ts`, `store/correction.store.ts`,
`store/correction.store.test.ts`, `store/correctionWrite.test.ts`,
`store/operation.store.ts`, `pages/MovementsPage.tsx`,
`pages/MovementsPage.test.tsx`. Deleted — `web/probe/` (one scratch file).

### 1. `validateCorrectionBody` accepted explicit failure bodies

CONFIRMED. The validator read `new_doc_num` first and never looked at `ok`,
`success` or `error`, so `{ok:false, error:'…', new_doc_num:'X'}` — an ordinary
shape, since PostgREST returns 200 for anything an RPC returns normally — was a
CONFIRMED success: the one verdict that clears the `D6` record and announces a
replacement document.

Fixed by reading an explicit failure marker BEFORE anything positive, and by
checking the three identifiers for mutual coherence (`new_doc_num` must differ
from the submitted document; `reversal_doc_num` must differ from both). The
positive forms (`ok:true`, `error:null`, `error:''`) are still accepted. Every
refusal maps to `unknown`, never to «sənəd dəyişməyib» — absence of a coherent
body is not evidence of a rollback.

Tested at BOTH levels, as the finding required: the helper contract, and the
store outcome (`correctionWrite.test.ts`) asserting `correction-unknown`, the
retained block, and that a second `correctDocument` is never dispatched.

### 2. `blockingFor` released protection before reconciliation

CONFIRMED, including the throw path the finding predicted. `operation.store`
sets `success` with `refreshFailed:false` at line 706, then awaits
`get().load(me)`; `blockingFor` skipped exactly `success && !refreshFailed`. So
protection was absent for the whole reload — the window in which the screen
still shows the pre-correction rows. And `load()` is not exception-safe (only
its `fetchWarehouses` leg has a rejection handler), so a rejecting reader threw
out of `postDocument` entirely: no outcome reported, and a record left
permanently `success`/`refreshFailed:false`, blocking nothing for the session.

Fixed by retaining protection POSITIVELY. A new `reconciled` flag starts false
and is set true only on the path that observed a good refresh; `blockingFor`
releases only a `success` that is `reconciled` and not `refreshFailed`. The
reload is wrapped so a throw becomes `correction-stale` — the confirmed success
is preserved and reported, with the block retained. A record persisted without
the field reads as NOT reconciled (fail-closed). The block survives
navigation and reload via the existing `sessionStorage` record.

### 3. Unknown/stale reconciliation was not wired

CONFIRMED. `clearUnresolved` was reachable only from the write path, so the one
outcome the write path never sees — a lost response — was permanent.

New `lib/correctionReconcile.ts`: a pure, read-only derivation over the rows
«Mal hərəkəti» has ALREADY loaded. No query, no write, no RPC. A record
resolves only on BOTH halves of `correct_document` (sql/030): the original's
cancellation marker AND a replacement line carrying `Əvəz edir: <doc>`, which is
what establishes the correction RELATIONSHIP. **A cancellation alone never
clears a record** — an ordinary «Ləğv» or an I-5 batch cancellation leaves the
identical marker, and clearing on it would unblock a resend in precisely the
case where the document was cancelled but never replaced. Missing markers, an
empty row set or a failed read yield `unobserved`: the block is retained, never
read as a rollback. A recorded replacement contradicting the observed one also
retains the block.

The affected document and its state are now DISPLAYED on «Mal hərəkəti» (a
record that blocks without explanation is a refusal with no reason on screen),
and a standing `persistenceError` both suppresses reconciliation and is shown.
I-5's records are untouched: separate store, separate readers, separate key.

### 4. Impact validation accepted incoherent quantities

CONFIRMED. `isValidImpactLine` allowed both `in_qty` and `out_qty` positive and
never compared a line against the document direction, while `mapImpact` stamps
`kind` from the direction and takes `q` from the line. An outbound row inside an
inbound document therefore became an INBOUND draft line, reversing the sign of a
posted movement; the outbound-only restore map compounded it.

Both shapes are now rejected before anything is rendered or replaced — the
contract returns `malformed`, which carries no `lines`, so the draft cannot be
touched and no navigation occurs. Asserted directly.

### 5. `probe/probe.test.ts` was an unconditional failure

CONFIRMED: `expect(out).toEqual([])` against an array that always held four
strings — the only red test in the suite, failing identically in isolation.

Its diagnostic content was genuinely meaningful (it demonstrates that a corrupt
I-5 record fails CLOSED), so it was converted rather than discarded or excluded:
`store/batchCancelCorrupt.test.ts` states the same scenario as five assertions,
including the load-bearing one — B is not individually blocked, yet
`beginAttempt(['B'])` still returns null because the persistence error blocks
every dispatch. The scratch `web/probe/` directory was removed. No test was
excluded from discovery and no unrelated failure was blamed.

**One pre-existing test encoded the defect.** `correction.store.test.ts`'s «a
reconciled success does NOT block» never reconciled anything — it asserted the
very rule finding 2 identifies. Its name was already correct; its body now sets
`reconciled: true`, and a companion case pins that an unreconciled success still
blocks.

### Verification (all run in this session)

- Focused I-6, 7 files: **237 passed**.
- I-5 regression, 5 files: **207 passed** — protections intact.
- Full suite: **119 files, 2511 passed, 0 failed**. The baseline measured
  before any change was 2441 passed / 1 failed (the probe), reproducing the
  previous section's figure exactly.
- `tsc -b --noEmit` 0 · `oxlint` 0 · `vite build` succeeded ·
  `git diff --check` clean (its output is pre-existing CRLF advisories, not
  whitespace errors).
- **Five mutation checks, all caught**: pre-fix `blockingFor` (2 failures),
  reload `try`/`catch` removed (1), explicit-failure check removed (12),
  quantity/direction coherence removed (6), reconciliation clearing on a
  cancellation alone (1), reconciliation effect disabled (2).
- Root `index.html` NOT edited — MD5 `b9be15c5ca59b68337863369620d72fa`,
  unchanged. Its one working-tree diff is a Phase-3 `manage_reference` change
  with an mtime of 2026-09-01, predating this session.

**I-6 is NOT marked accepted.** These are local, code-level results. The `D5`
live checks remain open: `document_edit_impact` has never been executed from
React against any project, `correct_document` has never run on TEST, `M7-120`'s
`correct_document` audit row stays `OPEN`, and none of the four correction
outcomes has been observed against a real server.

## I-6 independent verification + I-7 export proposal (2026-09-07)

### Codex's independent I-6 verification

- Full suite **2511 passed / 119 files**, exit 0.
- `typecheck`, `lint`, `build` and diff checks passed.
- Root `index.html` MD5 unchanged.

**I-6 is CODE VERIFIED — not LIVE VERIFIED and not ACCEPTED.** Module I stays
one acceptance boundary and the `D5` live checks remain open:
`document_edit_impact` has never been executed from React against any project,
and `correct_document` has never run on TEST.

### I-7 proposal

[`specs/2026-09-07-phase8-i7-export-proposal.md`](specs/2026-09-07-phase8-i7-export-proposal.md)
— the smallest complete **Excel** scope for `M8-50` (decision `D1`),
prioritised per the user's instruction.

- Excel reuses the existing `lib/xls.ts`, `movKeyText`, `movementValuation`,
  `whLabel` and the already-derived full filtered set. New work is one pure
  matrix builder, one `unit` field added to `MovementFilterItem` (already read,
  currently discarded in `derive()`), the button, and tests. No new read.
- **Silinmə is deferred**: its second sheet needs `stock_layer_allocations`, a
  table React has never read, whose shape and RLS are unconfirmed.
- **Printing is a separate decision**; it does not block Excel.
  `components/PrintHead.tsx` already exists.
- Open: U1 (missing CSV fallback/toasts, pre-existing), U2 (React reads
  valuations unconditionally, legacy only when `layerActive`), U3 (Çap in or
  out).

Documentation only: no application change, no live query or write, no SQL,
fixture, dependency or environment change, no commit, no deployment.


## I-7 — ordinary Excel export implemented (2026-09-07)

Spec + implementation record:
[`specs/2026-09-07-phase8-i7-export-proposal.md`](specs/2026-09-07-phase8-i7-export-proposal.md)
§8. Ledger: `M8-50` and «Milestone I-7» in
[`specs/2026-09-05-phase8-registry-rows.md`](specs/2026-09-05-phase8-registry-rows.md).

### What changed

New `lib/movementExport.ts` builds the legacy 15-column matrix as a PURE
function; `pages/MovementsPage.tsx` gained the «Excel» button and hands the
matrix to the EXISTING `lib/xls.ts`. **The shared writer was not modified**, no
API module changed, and no read was widened: `MovementFilterItem` gained `unit`
and `derive()` stopped discarding it — `items.api.ts` already selected it.

Two I-2-era test assertions were updated to the shipped scope, and two new test
files added (`movementExport.test.ts`, `MovementsPageExport.test.tsx`).

### Behaviour worth knowing

- Exports the FULL filtered, sorted set, never the 3000-row display slice.
- Disabled until the first COMPLETE successful snapshot (`loaded`). After a
  FAILED refresh it stays enabled and exports the retained last-good snapshot
  — what the «Yenilənmədi» banner already says is on screen (M8-45). A
  successfully loaded EMPTY set exports the legacy header-only workbook.
- Ungated by role, exactly as `#mov-exp` is. Access was not widened.

### Deviations from the proposal, both deliberate

1. The matrix takes `valuations`, `emails` and `me` explicitly. The proposal's
   three-argument signature would have exported `qty × price` for every
   Silinmə row that HAS a stored valuation, and a raw UUID in «Qeyd edən» —
   legacy rewrites `m.by` in place (`index.html:990`) before the export reads
   it. No store state is read inside the pure function.
2. The proposal said `all` is derived in the store. It is derived in
   `MovementsPage`. No selector was added.

### Checks (this session)

- Focused: 32 passed (`movementExport`), 18 passed (`MovementsPageExport`).
- Full suite: **121 files, 2562 passed, 0 failed** (I-6 baseline 119 / 2511).
- `typecheck` clean · `oxlint` exit 0 · `build` succeeded · `git diff --check`
  exit 0 (pre-existing CRLF advisories only).
- Root `index.html` NOT edited — MD5 `b9be15c5ca59b68337863369620d72fa`,
  unchanged; mtime 2026-09-01, predating this session.
- **Three mutation checks, all caught**: `page` for `all`, an emptied
  valuations map, and `unit` dropped again in `derive()`.

### Still deferred / still open

- **`M8-50` is PARTIAL.** «Çap» and the separate Silinmə report are NOT built.
  The Silinmə report needs `stock_layer_allocations` — a table this app has
  never read, shape and RLS unconfirmed — so it needs a read-only live check
  before it can be built at all. SON export and import remain out of scope.
- **Inherited, not newly approved:** React reads `writeoff_valuations`
  unconditionally while legacy reads them only when `DB.layerActive`
  (`index.html:957`). I-7 changed nothing here and does not claim equivalence.
- `lib/xls.ts` still has no CSV fallback (pre-existing; the legacy success
  toast is raised at the call site instead).

### Remaining live checks

**Nothing in I-7 is LIVE VERIFIED.** No workbook has been generated against
live data — the writer is mocked in tests and no Supabase read was performed.
The exported file has not been opened in Excel, and the export has never run
against TEST or production. The `D5` live checks from I-6 also remain open.


## I-7 follow-up / I-8 — real XLSX serialization verified locally (2026-09-07)

The I-8 safety corrections were independently checked. This entry records what
that verification does and does not establish. **No new proposal, no full-suite
rerun, no application change, no live access.**

### What is now verified — real serialization, not a mocked writer

I-7 closed with the writer mocked; the produced workbook had never been
serialized. `lib/movementExportWorkbook.test.ts` now drives the REAL
`lib/xls.ts` and reads the sheet XML back out of the produced `.xlsx`
package.

- `MovementsPage.exportXls()` calls `xls(matrix, 'mal_hereketi')` with **no
  sheet override** (`MovementsPage.tsx:280`). The file is therefore
  `mal_hereketi_<yyyy-mm-dd>.xlsx` and its single sheet is `Hesabat` — the
  default in `xls()` (`(sheet || 'Hesabat')`, `xls.ts:81`).
- An earlier version of that suite asserted the name `Mal_hereketi`. That was
  wrong and is corrected; the assertions above are what the shipped call
  actually produces.

### The absent freeze pane is an INHERITED limitation, pinned not fixed

`xls()` sets `ws['!freeze'] = { xSplit: 0, ySplit: 1 }` (`xls.ts:78`), ported
verbatim from legacy. **`xlsx@0.18.5` does not consume that key**: a workbook
built with `!freeze` set is byte-identical (same MD5) to one built without it,
and the key is absent from the parsed sheet. Legacy exports carry no freeze
pane either, so the React port reproduces legacy behaviour exactly. The test
pins the gap as the writer's, not the port's. Nothing was changed to "fix" it.

### Codex's independent verification

- **74 export tests** and `typecheck`, independently verified by Codex.

That is the whole of the independent check. It is a targeted export
verification — **not** a full-suite rerun, and no full-suite number from this
session should be quoted.

### What this entry does NOT establish

- **The running target is UNVERIFIED.** Which build/bundle a live check would
  actually exercise has not been established this session.
- **Mutation-guard state is UNVERIFIED.** `lib/mutationGuard.ts` is modified in
  the working tree and its state was not checked here.
- **TEST hostname verification is MANDATORY before any live check.** No live
  check may be run until the host is confirmed to be TEST. This gate is not
  satisfied by anything in this entry.
- **Group B writes remain UNAUTHORIZED.** No write in that group is approved.
- **Deployed atomicity remains UNVERIFIED.** Nothing here observed the deployed
  behaviour.
- The `D5` live checks from I-6 and the I-7 live checks remain open:
  `document_edit_impact` has never been executed from React against any
  project, and `correct_document` has never run on TEST.

### Status

**Phase 8 remains NOT ACCEPTED.** I-7 is code-verified for serialization only
— not `LIVE VERIFIED`, not accepted. `M8-50` stays PARTIAL: «Çap» and the
separate Silinmə report are still not built, and the Silinmə report still needs
a read-only live check of `stock_layer_allocations` before it can be built at
all.

## I-8 — Codex TEST-only browser export check (2026-09-07)

Evidence: [I-8 read-only export audit](audits/2026-09-07-phase8-i8-readonly-export-codex.md).
Observed browser resource requests confirmed `alkjjbaawmsirsfvqljm.supabase.co`.
Started sandbox localhost:5175 with process-local writes explicitly disabled;
existing admin session restored. No env/code/SQL/data mutation or deployment.
Actual browser downloads succeeded for the five-row full report and a
header-only filtered report. File inspection confirmed Hesabat, 15 columns,
inbound 17, outbound 3 and inbound amount 186 AZN. A1/A2/A4/A6 passed within
the audit's stated scope; A5 covered only the existing unvalued Silinmə row.
Microsoft Excel visual inspection, other roles, large-volume cap, allocation
schema and every Group B write remain unexecuted. Local server and test tab
left available to the user. **Phase 8 remains NOT ACCEPTED.**

### I-8 A3 follow-up — user confirmed Microsoft Excel visual check

The user supplied screenshots of both exports opened in Microsoft Excel,
then explicitly confirmed all columns are readable and no restore/repair
prompt appeared. **A3 PASS (user-executed; screenshots plus confirmation)**
for the current TEST exports, superseding the earlier unexecuted visual-check
status above. See the linked audit's A3 follow-up for evidence boundaries.
No code or database change. A1b/A7/A8, A5's non-null stored-valuation branch
and Group B remain open/unexecuted. **Phase 8 remains NOT ACCEPTED.**

### I-8 A8 follow-up — TEST allocation metadata inspected

Codex completed the SELECT-only metadata check in anbar-test. See
[A8 metadata evidence](audits/2026-09-07-phase8-i8-a8-allocation-metadata.md).
stock_layer_allocations exists with 14 columns, including the source snapshot
fields and reversed_at. RLS is enabled; authenticated has SELECT privilege;
the SELECT policy checks existence of the referenced movements row. Effective
per-role visibility and populated allocation data remain untested. No database
mutation; dashboard auto-saved the private query. This supersedes only A8's
previous unexecuted metadata status. Report implementation and all Group B
writes remain unapproved. **Phase 8 remains NOT ACCEPTED.**


## I-9 — separate Silinme Excel report: PROPOSAL ONLY (2026-09-07)

[`specs/2026-09-07-phase8-i9-silinme-report-proposal.md`](specs/2026-09-07-phase8-i9-silinme-report-proposal.md)
— the second half of `M8-50`, deferred by I-7.

Grounded in [`audits/2026-09-07-phase8-i8-a8-allocation-metadata.md`](audits/2026-09-07-phase8-i8-a8-allocation-metadata.md),
independently corroborated here: the 14 columns, types and nullability match
the generated `web/src/types/database.ts:722-737` exactly. The audit's stated
limits stand and are carried as planning constraints — `has_table_privilege`
is a GRANT check, not effective per-role visibility; the SELECT policy defers
entirely to movement RLS, which was never exercised; no allocation row was
counted; TEST is not production parity. One point is recorded against a
planning assumption rather than the audit: the policy has no `reversed_at`
condition, so excluding reversed allocations is CLIENT-side work and must not
be described as an RLS guarantee.

Key positions: `lib/xls.ts` is NOT reused — its `toNum()` would strip the
leading zeros that legacy protects with `z:'@'` text cells (R-F9); the
allocation read is all-or-nothing, never the partial set legacy `fetchAll()`
returns on error; a failed read writes NO file, since a one-sheet workbook is
indistinguishable from the legitimate no-allocations case; orphaned allocations
are counted and surfaced rather than silently dropped. Three real open
decisions remain (`D-I9a`-`D-I9c`), including whether a read-only TEST check
precedes implementation.

Documentation only: no application change, no live query or write, no SQL,
RLS, fixture, dependency or environment change, no commit, no deployment.
Group B remains unauthorized. **Phase 8 remains NOT ACCEPTED.**


## I-9 — separate Silinme Excel report: IMPLEMENTED, CODE VERIFIED (2026-09-07)

[`specs/2026-09-07-phase8-i9-silinme-report-proposal.md`](specs/2026-09-07-phase8-i9-silinme-report-proposal.md)
— updated inline with the audited refinements; no second proposal round.

Delivered: `api/writeoffAllocations.api.ts` (the allocation read),
`lib/writeOffExport.ts` (pure row builders), `lib/xlsWriteOff.ts` (a separate
workbook writer), and the button plus export handler in `pages/MovementsPage.tsx`.
Four new suites add 102 tests.

Four proposal positions were corrected, each on evidence:

- **Price parity.** The proposal's claim that `writeOffUnitPrice()` "already
  matches" was WRONG. It shares only the first branch; its fallback ends
  `Number(m.price ?? 0) || 0`, returning 0 for a missing/zero price and the
  negative value for a negative one, where this report requires null (an
  OMITTED cell). `writeOffReportPrice()` implements the legacy expression in
  the report module; `movementValuation()` is reused unchanged and no shared
  valuation helper was modified.
- **Capability.** `layerActive === false` is NOT confirmed-inactive on its own —
  a FAILED probe reports the same value. The gate is `layerReady && !layerActive`;
  confirmed-inactive preserves legacy exactly (no read, no sheet 2), while an
  UNRESOLVED capability reads rather than silently omitting the sheet. The
  inherited difference is documented: legacy reads allocations at page load and
  cannot reach an unresolved capability at export; this reads on demand and can.
- **Completeness.** The "orphan" framing and its toast are withdrawn: a parent
  outside the exported filter is ordinary filtering, not an error. Counts are
  internal diagnostics only, and cannot prove absence of truncated or RLS-hidden
  rows — only the read's `ok:false` speaks to that. Ordering is `created_at`
  then `id`, preserving legacy chronology with a unique tie-breaker rather than
  reordering by parent. Stated honestly: stable ordering makes pagination sound
  but gives NO transaction snapshot across concurrent changes.
- **Async safety.** The full filtered parent set and its item/valuation/recorder
  inputs are captured at click time and never mixed with a refreshed snapshot;
  duplicate in-flight export is blocked; the export aborts before download if
  the snapshot identity or session changed or the page unmounted.

All-or-nothing pagination and the full-last-page limit failure are retained.
Both sheets are ported cell by cell — raw warehouse values in this report,
mapped recorder labels, `z:'@'` text identifiers, omitted-versus-zero cells,
fixed widths, conditional source sheet, no autofilter. The ordinary Excel
writer and export are untouched.

Verification (actual results): full suite **126 files / 2687 tests passing**
(baseline 122/2585); typecheck clean; oxlint 0 warnings 0 errors; build
succeeds. Mutation checks each confirmed failing: price-null handling (7 tests),
reversed-allocation exclusion (3), partial-read refusal (4), capability gate (1);
all mutants reverted and the suite re-run green. Nine files touched, all in
scope; `movementValuation.ts`, `xls.ts`, `movementExport.ts`,
`writeoffValuations.api.ts` and `movements.store.ts` verified unmodified. One
pre-existing I-7 test asserting this report's absence was NARROWED, not deleted:
«Çap» is still asserted absent, the Silinmə control now asserted present.

No live access, no fixture, no SQL or RLS, no dependency or environment change,
no database write, no staging, no commit, no deployment. Printing and the import
path unchanged.

Remaining live gaps, none claimed as settled: whether an authenticated React
read returns allocation rows at all (a zero-row read is indistinguishable from a
correct empty result); effective per-role visibility through movement RLS
(`has_table_privilege` is a GRANT check only); TEST-to-production parity;
Microsoft Excel visual rendering of THIS report's two sheets (I-8's A3 covered
the ordinary export only); behaviour at real volume including the `MAX_PAGES`
boundary. Group B remains unauthorized.

I-9 is **CODE VERIFIED only**. **Phase 8 remains NOT ACCEPTED.**

## I-9 — two export-safety gaps CLOSED: stale capability, refresh in progress (2026-09-07)

Two audit findings against the I-9 export as shipped above. Both were
independently reproduced against the source before any change; both are
confirmed, and no part of either is disputed.

### Finding 1 — a CACHED capability was treated as fresh evidence

`movements.store.ts::load()` deliberately RETAINS `layerReady`/`layerActive`
when a later probe fails: losing a probe is not evidence the capability
changed, and flipping the cancellation write family on a lost probe would be
worse. That retention is correct for cancellation ROUTING and is unchanged.

It was not sufficient for the export, which used the same pair to decide
whether to SKIP the allocation read entirely. Sequence: boot confirms
`{ready:true, active:false}`; a later snapshot SUCCEEDS but its probe FAILS;
the store keeps the confirmed-inactive pair; `exportWriteOff()` reads it as
"confirmed inactive", skips the read, and writes a one-sheet workbook. That
file is indistinguishable from a genuine no-source-lots report, so
«Mənbə partiyalar» is omitted on evidence the latest probe never reconfirmed.
The pre-existing suite covered only a COLD failed probe (`ready:false` from the
start), never the retained-then-stale state.

Fix, export-scoped: a new store field `layerFresh` records whether the probe
belonging to the APPLIED snapshot actually answered. It is set from that probe
alone and never retained, so it says nothing about the capability's value —
only about its freshness. The export gate becomes
`layerFresh && layerReady && !layerActive`. A stale confirmation now falls into
the existing UNKNOWN branch and READS, which either settles the question or
refuses the file outright. `layerFresh` is read by the export only:
cancellation routing still uses `layerReady` alone and its intentionally
retained capability is untouched (asserted by a test).

Preserved: a FRESH `{ready:true, active:false}` still skips the read and writes
one sheet, exactly as legacy. Fails safely: when freshness cannot be
established and the settling read also fails, NO file is written.

### Finding 2 — the report was reachable during an unresolved refresh

`canExportWriteOff` checked `loaded` and the type filter only, and the
post-await abort compares snapshot IDENTITIES. A refresh that has STARTED but
not settled changes neither: `loaded` stays true and `rows`/`valuations` still
hold their previous objects. Both the click-time capture and the post-await
check therefore observe the same pre-refresh objects, and the file could be
downloaded from a snapshot the store was already in the act of replacing.

Fix, three narrow guards, all keyed on the store's own `loading` flag:

- `canExportWriteOff` gains `&& !loading` — the button is disabled while a
  refresh runs.
- The handler rechecks `loading` at click time. The disabled attribute lags the
  store by one render, so a refresh beginning between that render and the click
  would otherwise reach the handler.
- The post-await guard rechecks `loading` alongside the identity comparison,
  catching a refresh that started during the allocation read and has not yet
  replaced the objects.

All three refuse with `Məlumat yenilənir — hesabatı yenidən yaradın`, the same
shape as the existing mid-read refusals: nothing is written, and the user
re-runs the report once the refresh settles.

The ordinary «Excel» export is UNCHANGED and stays gated on `loaded` alone: it
is synchronous and issues no second read, so an in-flight refresh is not a
window for it. A test asserts it stays enabled during a refresh.

### Files changed (2)

- `web/src/store/movements.store.ts` — `layerFresh` added to the interface,
  the initial state and the successful-load branch. NOTE: the I-9 entry above
  records this file as verified unmodified; that is no longer true as of this
  entry.
- `web/src/pages/MovementsPage.tsx` — the `REFRESH_IN_PROGRESS` refusal
  constant, the `!loading` button gate, the click-time and post-await `loading`
  rechecks, and the `layerFresh` term in the capability gate.

Tests added (2 files, +15): `store/movements.store.test.ts` +5 freshness tests;
`pages/MovementsPageWriteOffExport.test.tsx` +10 across two new describes. The
page-level tests drive the REAL store transitions through `load()` — the stale
state is produced by an actual successful-snapshot/failed-probe refresh, and
the in-progress refreshes by an actual unresolved `load()` — never by assigning
flags by hand.

### Verification (actual results)

- Four I-9 suites: **112 passed** (was 102 — the 10 new page tests).
- Store suite: **27 passed** (was 22).
- Affected report/store/movements suites (10 files): **390 passed**.
- Full suite: **126 files / 2701 tests passed** (baseline 2687 in the entry
  above; +14 net — 15 added, and one pre-existing count difference is not
  claimed as investigated).
- `npm run typecheck` clean; `npm run lint` (oxlint) clean; `npm run build`
  succeeds (the >500 kB chunk notice is pre-existing).
- Mutation checks, each run and each confirmed FAILING, then reverted:
  1. drop `layerFresh` from the capability gate → 2 failed;
  2. button gate back to `loaded && isWriteOffFilter` → 1 failed;
  3. remove the click-time `loading` recheck → 1 failed;
  4. remove the post-await `loading` recheck → 1 failed;
  5. store `layerFresh = true` unconditionally → 5 failed.
  Suite re-run green after every revert.

No live reads or writes, no SQL or RLS, no fixture, no environment or
dependency change, no commit, no stash or reset, no deployment.

Not settled by this work: every live gap listed in the I-9 entry above stands
unchanged. These two fixes are **CODE VERIFIED only**.
**Phase 8 remains NOT ACCEPTED.**

## Phase 8 — M8-21/M8-30 legacy reversal classification (2026-09-08)

The real TEST-admin batch matrix exposed legacy-transfer counter document
`SND-LR-AE5EEE3FF0` as selectable. This was a client classification gap, not a
server mutation result: `cancel_legacy_transfer` writes the terminal marker
`Ləğv (əks yerdəyişmə) ID: <source>:<pair>`, while the React state and batch
matchers recognised only `Ləğv (əks yerdəyişmə): <doc>`.

Both matchers now recognise the two server transfer-counter forms, with
regressions at state, document-view and batch levels. Expanded tests pass
270/270 and the production build passes. In the same live dialog after hot
reload, the document remained visible but its checkbox was disabled and its
status became `Əks/ləğv sənədi — ləğv edilmir`; no cancellation was submitted.
Evidence:
[`audits/2026-09-08-phase8-m8-21-m8-30-legacy-reversal-classification-live-check.md`](audits/2026-09-08-phase8-m8-21-m8-30-legacy-reversal-classification-live-check.md).

Phase 8 remains NOT ACCEPTED.

## Phase 8 — M8-30/M8-32 React layer batch (2026-09-08)

The real batch UI listed fresh exact receipts
`CODEX-P8-LAYER-BATCH-UI-A-20260908224700` and
`CODEX-P8-LAYER-BATCH-UI-B-20260908224700` as eligible, retained explicit
reasons for several ineligible families, and rendered the two-document
all-or-nothing confirmation. Submit reported two cancelled. Read-back proved
two distinct reversal documents (`SND-C-1B1EE224AF`, `SND-C-8E4649973F`),
count 81→83, both layers 1→0/inactive and item `0000002` balance zero.
Localhost was returned to read-only. Evidence:
[`audits/2026-09-08-phase8-m8-30-m8-32-react-layer-batch-live-check.md`](audits/2026-09-08-phase8-m8-30-m8-32-react-layer-batch-live-check.md).

Phase 8 remains NOT ACCEPTED.

## Phase 8 — M8-38 layers-active edit refusal (2026-09-08)

Fresh TEST document `CODEX-P8-LAYER-EDIT-20260908201647` returned
`editable:true` from `document_edit_impact`, proving that impact alone does not
encode the global layer gate. Direct `correct_document` returned the exact
layer-selection P0001; movement count stayed 40→40. The fixture was then
neutralised with `cancel_layer_document` (`SND-C-C4D411CAB6`), leaving 41
movements. This is direct server evidence only; the React button-absence branch
remains open because the browser debugger was unavailable. Evidence:
[`audits/2026-09-08-phase8-m8-38-layer-edit-refusal-live-check.md`](audits/2026-09-08-phase8-m8-38-layer-edit-refusal-live-check.md).

## Phase 8 — M8-32 layer batch success and rollback (2026-09-08)

Direct TEST-admin `cancel_layer_documents_batch` cancelled two fresh exact
receipt-layer documents in one call, produced reversals `SND-C-50D53E87DD`
and `SND-C-91038A0332`, and changed both layers 1→0/inactive (movement count
43→45). A separate valid-first/missing-second layer batch returned P0001 and
rolled back the valid first item completely: count 46→46, no marker, layer
still 1/active. That fixture was then neutralised, leaving 47 movements.
Evidence:
[`audits/2026-09-08-phase8-m8-32-layer-batch-live-check.md`](audits/2026-09-08-phase8-m8-32-layer-batch-live-check.md).
React layer-batch rendering, roles, unknown outcome, refresh failure and
concurrency remain open. **Phase 8 remains NOT ACCEPTED.**

## I-9 export-safety fixes — Codex independent verification, count reconciled (2026-09-07)

Documentation only. No application file, test, fixture, environment or
dependency was changed by this entry.

### Codex result

Codex independently audited the two export-safety fixes in the entry above and
**passed** them: **138 tests passed**; typecheck, lint and diff checks passed;
the root `index.html` MD5 was **unchanged**.

Corroborated locally: `index.html` was last modified 2026-09-01, six days
before this work, and neither fix task touched it. Its single-line working-tree
diff is pre-existing and unrelated. Both fixes remain confined to
`web/src/store/movements.store.ts` and `web/src/pages/MovementsPage.tsx`.

### The 138 vs 139 discrepancy — RESOLVED: different files were selected

The two runs did not disagree about any suite. They selected **different sets
of five files**, each internally consistent, and every shared suite reported an
identical count in both.

| file | Codex (138) | handoff entry above (139) |
|---|---|---|
| `api/writeoffAllocations.api.test.ts` | 17 | — |
| `pages/MovementsPageExport.test.tsx` | — | 18 |
| `lib/writeOffExport.test.ts` | 35 | 35 |
| `lib/xlsWriteOffWorkbook.test.ts` | 27 | 27 |
| `pages/MovementsPageWriteOffExport.test.tsx` | 32 | 32 |
| `store/movements.store.test.ts` | 27 | 27 |
| **total** | **138** | **139** |

The difference is exactly one file substituted for another:
`writeoffAllocations.api` (17) in Codex's selection versus
`MovementsPageExport` (18) in the run behind the entry above — a one-test gap
that is a scope difference, not a missing, skipped or failing test. Codex
independently reran the allocation API suite on its own: **17 passed**.

**Both results stand, each with its exact scope.** 138 is correct for the four
I-9 suites as Codex scoped them — counting the allocation API suite — plus
`movements.store`. 139 is correct for the scope stated in the entry above,
which counts `MovementsPageExport` instead. Neither figure is revised, and no
test was altered to reconcile them.

### Status, unchanged

The code audit remains **passed**. I-9 remains **CODE VERIFIED**, NOT LIVE
VERIFIED — every live gap listed in the original I-9 entry stands unaddressed.
**Phase 8 remains NOT ACCEPTED.**

**Next functional step:** a TEST-only browser download of the Silinmə report.
Not executed here.

## I-9 TEST Chrome export — scoped live evidence (2026-09-07)

Supersedes the preceding next-step instruction, not the historical code-audit results. Codex completed the actual Chrome download after user login. See [live export audit](audits/2026-09-07-phase8-i9-live-export-attempt.md) for the file path/hash, exact cells, browser limitation and scope.

PASS: one-row admin Silinmə download; 17-column worksheet; text code 0000001; quantity 3; unavailable price/amount/source amount omitted; known amount zero retained; recorder mapped; no-match filter refused with explanation and no additional file. Verified the actual downloaded workbook using read-only Artifact Tool import and ZIP/XML inspection. Not a regenerated test workbook.

The prior browser tab had stale code after its dev server stopped. Restarted the existing dev script in sandbox mode on loopback port 5175 with process-only TEST URL and local writes false; no env file changed. In-app downloads were not found despite success toasts (ordinary Excel control also affected); Chrome saved the real file successfully. Internal in-app cause unproven.

Native Excel opening/no-repair and populated source-lot paths, other roles and larger/concurrent scenarios remain unverified. No registry-wide promotion. No business data mutation, SQL, RLS/schema, application code, tests, dependencies, commit or deployment changed. Normal session bookkeeping is not claimed absent. Phase 8 remains NOT ACCEPTED.

Next smallest user-visible check: open the downloaded Silinme_hesabati_2026-09-07.xlsx in Excel and confirm readability and no repair prompt. Do not repeat the successful browser/content checks unless the file or relevant code changes.

## I-9 native Excel confirmation received (2026-09-07)

The user confirmed the exact downloaded Silinme_hesabati_2026-09-07.xlsx is readable in Excel with no repair prompt. This supersedes the preceding pending-native-check instruction. Record as PASS, user-operated evidence; Codex did not independently operate Excel. Details are appended to the [live export audit](audits/2026-09-07-phase8-i9-live-export-attempt.md).

Completed scope: admin one-row report download, inspected content, empty-result refusal and user-confirmed native opening/readability. Do not repeat these checks on the unchanged artifact. Populated source-lot paths, other roles, large-data/concurrency and other Phase 8 gates are not promoted. Phase 8 remains NOT ACCEPTED.

Next: reconcile only the applicable export-evidence rows with this scoped evidence and identify the next unverified scenario executable on existing TEST data without mutations. Do not create fixtures or change SQL/RLS, roles, configuration or business data to unblock it without separate authorization. No application code or workbook was changed by this confirmation entry.

## I-9 export evidence reconciled into the registry (2026-09-07)

Documentation only. No application code, test, fixture, SQL, RLS, schema,
configuration, database mutation, commit or deployment. Sources used: the
latest CLAUDE_HANDOFF entries above and
[the live export audit](audits/2026-09-07-phase8-i9-live-export-attempt.md).

### Independent verification of the three conclusions — all three CONFIRMED

Each was checked against the audit's own primary evidence, not against the
summary sentences in the entries above.

1. **TEST admin one-row download and workbook-content checks — PASS.**
   Supported: a named artifact with a size and SHA256, cell-by-cell content
   from two independent read-only inspections that agree, and an explicit
   statement that the ACTUAL downloaded file was inspected rather than a
   regenerated test workbook. The A1:Q2 range, text `0000001`, quantity 3, and
   the omitted-versus-genuine-zero distinction (H2/I2/J2 omitted, K2 a real 0)
   are recorded at cell level.
2. **Empty-result refusal — PASS.** The refusal text was observed and no
   additional workbook appeared.
3. **Native Excel readability / no repair — PASS by user confirmation.**
   Recorded with its correct weaker basis: user observation of the exact
   downloaded file, no independent Codex-operated Excel check, no new hash or
   screenshot.

**No evidence-backed disagreement with the three conclusions.** Two scope
points are stated rather than disputed: the earlier missing in-app file is
NOT established as a report defect (its cause is unproven, and success toasts
do not prove a save), and conclusion 3 is user-operated evidence, so it is
recorded as such and not upgraded to independent verification.

### Two staleness defects found in the registry and corrected

Neither changes any status claim; both are documents contradicting evidence
already accepted in the entries above.

1. **`M8-50b` still stated the pre-fix capability gate** `layerReady &&
   !layerActive`, which the export-safety entry above replaced with
   `layerFresh && layerReady && !layerActive` plus the refresh-in-progress
   refusals. The row now records the gate as superseded while keeping the
   original I-9 correction text as the shipped-at-I-9 record.
2. **The parent registry's Module I summary still asserted that no export,
   print, batch-cancel or correction affordance is rendered**, and its bullets
   stopped at I-4. That predates I-5, I-6, I-7 and I-9. A superseding bullet
   was added rather than rewriting the historical I-1…I-4 bullets.

### Changes made (3 edits, 2 files)

- `specs/2026-09-05-phase8-registry-rows.md` — `M8-50b` moved from
  «NOT LIVE VERIFIED» to **PARTIALLY LIVE VERIFIED, narrow scope**, carrying
  the file path, hash, exact evidenced checks and an explicit
  still-not-verified list; `M8-02` gained the live admin-only observation of
  the button's enable/disable behaviour; a new «Milestone I-9» section records
  the full chronology, INCLUDING the superseded inconclusive in-app attempt.
- `ANBAR_FUNCTIONAL_PARITY_REGISTRY.md` — Module I summary bullet added.

### Deliberately NOT done

No source-lot, role, pagination or concurrency row was promoted. No milestone
status changed. `M8-50` stays PARTIAL, I-8 stays NOT STARTED, and
**Phase 8 remains NOT ACCEPTED.**

### Next scenario identified, NOT executed

The next existing-data, TEST-only, read-only scenario is: **sign in to TEST
localhost as a NON-ADMIN role and open «Mal hərəkəti» with the «Silinmə» type
filter, to observe whether the «Silinmə hesabatı» button renders and is
enabled, and — if a row is visible — whether the report downloads.** It needs
no fixture, no new data and no mutation, and it exercises the largest
completely unobserved dimension (`M8-42` server-side scoping and the row's
«per-role visibility unproven» clause). It uses the already-running sandbox dev
server.

**Blocker, exact:** a working non-admin TEST credential. The audit records that
Chrome does not share the in-app session and that Codex stopped at login rather
than guessing a password or copying tokens; only `anbar-admin-test@example.com`
has been exercised. **The user must supply or create a `rehber` or `anbardar`
TEST login and sign in.** Creating that account is itself a mutation and is not
authorized here.

Every alternative was checked and each is blocked for a stated reason:
populated source-lot needs layered allocation data that the one visible TEST
row does not provide (creating it is a write); pagination needs volume beyond
the single row (creating it is a write); concurrency needs a live refresh race
that cannot be induced without additional data or timing control. **The
non-admin read-only check is therefore the only next scenario blocked solely on
a credential rather than on data creation.**

## I-9 / I-8 export-status correction — five claims fixed (2026-09-07)

Documentation only. No account creation, credentials search, database access,
application code, configuration, commit or deployment. Sources: the export rows,
the latest handoff entries above, and the two named audits
([I-8 ordinary export](audits/2026-09-07-phase8-i8-readonly-export-codex.md),
[I-9 live export attempt](audits/2026-09-07-phase8-i9-live-export-attempt.md)).
Two of the corrections are against claims the PRECEDING entry made; both are
confirmed against primary evidence and neither is disputed.

### 1. `M8-50b` had two statuses in one cell — CONFIRMED, corrected

The cell opened «**CODE VERIFIED (I-9)**, NOT LIVE VERIFIED» and closed with
«PARTIALLY LIVE VERIFIED», so a reader could take either as current. The cell
now opens with ONE current status — **PARTIALLY LIVE VERIFIED, narrowly
scoped** — and explicitly labels the earlier NOT LIVE VERIFIED phrases as
historical I-9 wording retained for chronology. No evidence changed.

### 2. `M8-50` ignored the earlier ordinary-export live evidence — CONFIRMED

`M8-50` still read «NOT LIVE VERIFIED: no workbook was generated against live
data». The I-8 audit contradicts that for the ORDINARY export half: real-button
download of `mal_hereketi_2026-09-07.xlsx` (20,034 bytes, SHA256 `a0aa03a7…`),
`Hesabat` A1:O6, 15 headers, 5 rows, KPI reconciliation (17 / 3 / 186 AZN),
the inherited `toNum` conversion observed live, a header-only zero-match
workbook (17,418 bytes, SHA256 `8e0e8024…`), and native Excel readability with
no repair prompt PASS — **user-executed and screenshot-supported**, not
agent-operated.

The row is now split into three explicit parts: (a) ordinary export PARTIALLY
LIVE VERIFIED, narrowly scoped; (b) the Silinmə report, which is `M8-50b`;
(c) **«Çap» NOT STARTED and not promoted**. This is now the accepted
non-functional baseline and does not affect acceptance. `M8-50` stays
**PARTIAL** only for the other unverified Excel/report dimensions listed below.
The I-8 audit's own not-executed list is carried into the row rather than
dropped: the stored non-null Silinmə valuation branch (A5 was PARTIAL — the one
existing Silinmə row has blank price/amount, so that branch was never
exercised), the >3000-row cap (A1b), roles (A7) and allocation schema/RLS (A8).

### 3. «`M8-50b` is the ONLY Module I row with live evidence» — WRONG, withdrawn

This was my claim in the preceding entry and it does not survive its own
sources. The ordinary export was exercised live FIRST (I-8 audit, same TEST
project and admin session). Separately, other Module I rows already rested on
earlier read-only live evidence: the `D-I1` RPC signature catalogue read and
the `D2` / `M8-51` policy and column-set reads — read-only reads, none an
executed RPC, but live evidence nonetheless. The parent summary now records TWO
partially-verified export rows, names the earlier read-only live reads, and
states plainly that the «only row» claim is withdrawn. The surrounding bullet
was also corrected from «Nothing ELSE in Module I is LIVE VERIFIED» to **no
Module I row is `LIVE VERIFIED`** — the two export rows are partial, not
verified.

### 4. The proposed non-admin check was described too broadly — CONFIRMED

The preceding entry implied the check would settle `M8-42` server-side scoping.
It cannot. The scenario now states that it observes **button/download behaviour
and OBSERVED VISIBILITY only**, and that full RLS correctness requires an
**expected allowed/denied comparison** — an independently derived set of rows
the role should and should not see. Observed visibility alone cannot
distinguish correct scoping from an empty or coincidentally-matching result.

Its prerequisite was also overstated. The preceding entry said the blocker was
«a working non-admin TEST credential», implying the account exists and only a
password is missing. **That is not established.** No account inventory was
read; only `anbar-admin-test@example.com` has ever been exercised. Whether a
`rehber` or `anbardar` TEST account EXISTS is unknown.

### 5. «Every alternative requires data creation» — WRONG, corrected

Also mine, and overstated. The blockers differ in KIND, and the ledger now
distinguishes them: populated source-lot and pagination/volume are blocked on
DATA (creating it is a write); non-admin roles are blocked on unconfirmed
ACCOUNT AVAILABILITY; **concurrency and the refresh-in-progress refusals are
TIMING paths** needing the ability to induce or intercept a refresh at a chosen
moment — request interception, latency injection or another controllable
trigger. Whether that capability exists read-only here has not been assessed,
so it must not be described as requiring writes.

### Files changed (2), documentation only

- `specs/2026-09-05-phase8-registry-rows.md` — `M8-50b` current-status line and
  historical labelling; `M8-50` three-part reconciliation; and, in «Milestone
  I-9», a chronology note tying the I-8 evidence to this one, the precise
  scenario statement, and the blockers-by-kind list.
- `ANBAR_FUNCTIONAL_PARITY_REGISTRY.md` — Module I summary bullet rewritten.

Chronology preserved throughout: the superseded in-app attempt, the I-8
ordinary-export check and the I-9 report check all remain, in order, with their
original scope. No milestone status changed, no untested path promoted, «Çap»
untouched. **Phase 8 remains NOT ACCEPTED.**

### Next concrete prerequisite

**Confirm whether a usable non-admin (`rehber` or `anbardar`) TEST account
already exists**, by reading account/role state — a separately authorized
read-only step, not performed here. Until that answer exists, the non-admin
check cannot be scheduled, and it should not be assumed that only a password is
missing. If no such account exists, enabling this check requires account
creation, which is a mutation and needs its own authorization.

## Non-admin TEST account inventory — BLOCKED, not performed (2026-09-07)

Documentation only. **No account inventory was read.** No account creation,
invitation, password reset, role change, impersonation, SQL/RPC, fixture,
production access or application change. The admin session was not disturbed
and no credential was entered or guessed.

### Blocker: no authorized connection to `alkjjbaawmsirsfvqljm` exists here

The read requires a connection this session does not have. Checked, in order:

- **No Supabase connector/MCP tool is available** in this session's tool set.
- **No peer session offers one** — the session list is Claude sessions only.
- The **Supabase CLI IS installed** (`AppData/Roaming/npm/supabase`) but is
  **NOT authorized**: `~/.supabase/` holds only telemetry files and traces, with
  **no `access-token`**, and `SUPABASE_ACCESS_TOKEN`, `SUPABASE_DB_URL` and
  `SUPABASE_SERVICE_ROLE_KEY` are all unset. A read-only `supabase projects
  list` returned `LegacyPlatformAuthRequiredError` — «Access token not
  provided».

Running `supabase login` would ESTABLISH new access rather than use an
already-authorized connection, so it was not run. `web/.env`, `.env.example`
and `.env.sandbox.local` exist but were **NOT opened** — they hold keys, project
rules forbid reading them, and their contents would not constitute authorized
access in any case.

### Project verification, as far as it could go without a connection

The TEST project id `alkjjbaawmsirsfvqljm` is corroborated in three source
comments (`api/documentCancel.api.ts:14`, `api/movementsSnapshot.api.ts:18`,
`api/writeoffValuations.api.ts:17`) and matches the id recorded in both export
audits. **This is a reference check only.** The project was NOT contacted, so
its identity was not verified live — the scope guard «verify the project before
reading» could not be satisfied, and consequently nothing was read.

### What remains unknown — unchanged from the previous entry

Whether any `rehber` or `anbardar` application user exists on TEST, and whether
such users have corresponding Auth accounts, is **still unknown**. Only
`anbar-admin-test@example.com` has ever been exercised. Nothing here narrows
this either way: absence of evidence was NOT recorded as confirmed absence.

### Next step

**A connection decision by the user, before any inventory is possible.** Either
authorize a read-only connection to `alkjjbaawmsirsfvqljm` for this work, or
run the inventory yourself and report the result. The minimal read is: for
application users whose role is `rehber` or `anbardar`, their identity, role
and account-status fields, joined to whether a corresponding Auth account
exists — **no password hashes, tokens, secrets or unrelated metadata.**

Two constraints carry forward unchanged. **Account existence does not prove
successful login**, so a positive inventory result still requires a separately
arranged non-admin test session — the current admin session must not be logged
out and no credential may be guessed. And when that session eventually runs,
**button visibility or a successful download does NOT establish RLS
correctness**: that needs an expected allowed/denied row comparison, which does
not exist yet.

**Phase 8 remains NOT ACCEPTED.**

## Phase 8 — `anbardar` Silinmə-report live follow-up (2026-09-08)

**Result: narrow PASS; Phase 8 remains NOT ACCEPTED.** This entry supersedes
the preceding account-inventory blocker: the user created the missing TEST
identity and supplied its login credential for this run.

- TEST project only: `alkjjbaawmsirsfvqljm` (`anbar-test`).
- The user created Auth identity `anbar-anbardar-test@example.com`
  (`089440eb-94a1-4560-ac12-6dbf0a4914ca`). The Auth trigger produced a
  `baxis`/null-warehouse application profile.
- After explicit action-time approval, one guarded TEST update assigned
  `role='anbardar'`, `warehouse='Test Anbar'`, `active=true`; a separate SELECT
  confirmed all three fields. No production object was contacted or changed.
- A fresh Chrome localhost session logged in without saving the password. The
  existing in-app admin session was left intact.
- «Mal hərəkəti» showed five rows, all from `Test Anbar`; the selector exposed
  no other warehouse. With «Silinmə», exactly the existing 02.09.2026 row for
  item `0000001`, quantity 3, remained visible. The admin-only «Qrup üzrə
  ləğv» action did not render.
- «Silinmə hesabatı» rendered, enabled and downloaded
  `Silinme_hesabati_2026-09-08.xlsx`: 18,113 bytes, one sheet, A1:Q2, SHA-256
  `EDDFCEE67D2CBE53E0A1F64167C12EE7590CC69E77832EFFE646716F14082DC1`.
  The actual downloaded file was inspected read-only and is byte-identical to
  the 2026-09-07 admin artifact.
- Returning to all movement types and clicking ordinary «Excel» downloaded
  `mal_hereketi_2026-09-08.xlsx`: 20,034 bytes, `Hesabat` A1:O6, five rows,
  SHA-256 `A0AA03A7ACA69732957A69A7360049A457FFB51B0823B0FB13AD593801E9C085`.
  It is byte-identical to the 2026-09-07 admin ordinary-export artifact.

Status impact: `M8-02` gains `anbardar` action visibility evidence; `M8-42`
becomes PARTIALLY LIVE VERIFIED for observed Test-Anbar visibility only;
`M8-50` stays PARTIAL but now includes one real `anbardar` ordinary download;
`M8-50b` stays PARTIALLY LIVE VERIFIED and now includes one real `anbardar`
report download. Do not call this complete RLS verification: there is no independently
known foreign-warehouse movement in TEST to prove a denied row. `rehber`,
source lots, pagination/volume and concurrency
remain open. Native Excel was not reopened for the new file; the prior
user-operated check applies to identical bytes but was not relabelled.

Full evidence:
[`audits/2026-09-08-phase8-anbardar-writeoff-export-live-check.md`](audits/2026-09-08-phase8-anbardar-writeoff-export-live-check.md).

## Phase 8 — status reconciliation after the `anbardar` follow-up (2026-09-08)

Documentation-only correction. A compact re-audit found stale `NOT STARTED`
labels that contradicted code and tests already present in the same workspace.
No application code, SQL, RPC, fixture, account, deployment or production
object was changed by this reconciliation.

- Milestone `I-5` is recorded as implemented locally (`M8-30` … `M8-32` are
  CODE VERIFIED), not `NOT STARTED`.
- Milestone `I-8` is `IN PROGRESS`: the 2026-09-07/08 TEST read/download checks
  exist, while write scenarios and the acceptance boundary remain open.
- `M8-23` is CODE VERIFIED: the reversal-date control exists and blank input
  omits `p_reversal_date` at the API boundary.
- `M8-40` is CODE VERIFIED for the client/server-boundary contract. Non-admin
  controls are absent/disabled, handlers re-check, and server errors are
  surfaced verbatim. The server refusal itself remains not live-verified.
- `M8-46` and `M8-47` are CODE VERIFIED: mutation paths have pre-await
  submission locks and independently re-run the same eligibility gate inside
  their handlers. Batch cancellation additionally has a synchronous same-tick
  lock.

Focused verification after the correction: **259 tests / 5 files passed**
(`documentCancel.api`, `DocumentCancel`, `BatchCancel`, `batchCancel.store`,
`MovementsPage`). The correction deliberately did not promote `M8-43`
(live audit consequences), `M8-53` (payload measurement), full cross-warehouse
RLS correctness, `rehber`, source-lot, volume or
concurrency scenarios. **Phase 8 remains NOT ACCEPTED.**

## Phase 8 — M8-27 exact layer row cancellation (2026-09-08)

Direct TEST-admin RPC/read-back coverage now includes both exact branches of
`cancel_layer_movement_row`:

- unused purchase movement `7fe4ad24-5f79-4940-9c84-4adf9535042c` retained,
  counter-row `8172611f-d469-4e1c-94ab-5bd4caa85081` added and its exact
  receipt layer changed 1→0/inactive;
- exact `Silinmə` movement `d14bac90-2ee6-499b-919a-8fb0772f1211` cancelled,
  its allocation and valuation were marked reversed and the source layer was
  restored 1→2;
- trying to cancel that receipt while one unit was still allocated returned
  the exact used-layer P0001; after restoration, the receipt cancelled and its
  layer changed 2→0/inactive.

The temporary scenarios left 39 movements and no unfinished quantity. The
browser debugger remained unavailable, so M8-26 React routing is still open.
Evidence:
[`audits/2026-09-08-phase8-m8-27-layer-row-cancel-live-check.md`](audits/2026-09-08-phase8-m8-27-layer-row-cancel-live-check.md).
**Phase 8 remains NOT ACCEPTED.**

## Phase 8 — TEST stock-layer cutover and first layer cancellations (2026-09-08)

TEST project `alkjjbaawmsirsfvqljm` was preflighted at 28 movements with no
negative balance and zero layer rows, then activated through the official
atomic `activate_stock_layers` contract. The current persistent TEST baseline
is `active=true`, layer version 36, cutover
`2026-09-08T19:55:29.879391+04:00`, with two seeded `legacy_unresolved`
layers (item `0000001`: 8; item `0000002`: 1 in `Test Anbar`). Historical
inactive-layer observations remain chronology but no longer describe current
TEST state.

Direct authenticated admin RPC/read-back checks succeeded for both document
families:

- `cancel_layer_document('SND-D512FAAC59')` retained the source, created
  `SND-C-B7B77DCCB4` and consumed the matching item-`0000002` seed layer 1→0.
- A stale `post_layer_transfer_document` revision was rejected with no write.
  A fresh revision then posted exact transfer `SND-8CFB378D7D`; direct
  `cancel_layer_transfer_document` created `SND-R-8182DFCD7D`, restored the
  source layer 7→8, consumed the destination transfer layer 1→0 and marked the
  allocation link reversed.

These calls were direct RPCs because the browser debugger was unavailable.
They add layer-variant server evidence to M8-24/M8-25 but do not prove M8-26's
React routing. Localhost was returned to sandbox read-only mode
(`VITE_ALLOW_LOCAL_WRITES=false`) on `127.0.0.1:5175`. Full evidence:
[`audits/2026-09-08-phase8-layer-cutover-and-cancellation-live-check.md`](audits/2026-09-08-phase8-layer-cutover-and-cancellation-live-check.md).
Role, UI, malformed-data, concurrency and unknown-outcome branches remain open;
**Phase 8 remains NOT ACCEPTED.**

## Phase 8 — M8-24 layer cancellation concurrency (2026-09-08)

Two simultaneous direct `cancel_layer_document` calls against fresh exact
document `CODEX-P8-LAYER-RACE-20260908202417` produced one HTTP 200 reversal
`SND-C-3C44D3ABEE` and one P0001 stock-state refusal. Movement count changed
48→49, exactly one reversal existed, and the layer changed 1→0 only once.
This is server single-commit evidence, not M8-46 React double-click evidence.
Current movement count is 49. Evidence:
[`audits/2026-09-08-phase8-m8-24-layer-cancel-concurrency-live-check.md`](audits/2026-09-08-phase8-m8-24-layer-cancel-concurrency-live-check.md).

## Phase 8 — M8-29 layer-legacy stock refusal (2026-09-08)

Document-less exact receipt `a591d9d5-c9d8-421f-8814-077a2af2e657`
created a 1-unit exact layer. Direct `cancel_layer_legacy_movement` returned
the unresolved-legacy-balance P0001; read-back showed no reversal and the
layer remained 1/active. The fixture was neutralised through exact row
cancellation, leaving 51 movements. This proves a stock-safety refusal, not a
successful layer-legacy path. Evidence:
[`audits/2026-09-08-phase8-m8-29-layer-legacy-stock-refusal-live-check.md`](audits/2026-09-08-phase8-m8-29-layer-legacy-stock-refusal-live-check.md).

Final read-back after this continuation: capability remains active/version 36;
51 movements; zero negative balances; effective balances are 8 units of
`0000001` in `Test Anbar`, 0 of `0000002`, and 0 in the transfer fixture
warehouse. The only active layer is the 8-unit `legacy_unresolved` layer for
`Test Anbar / 0000001`. Localhost remains read-only.

## Phase 8 — M8-29 layer-legacy ordinary success (2026-09-08)

Direct `cancel_layer_legacy_movement` succeeded for document-less source
`a84a5b87-e60e-4e99-ac3f-943670915d0b`, creating reversal
`SND-L-01905D9CEE`. Source/reversal fields matched, movement count changed
51→53 and effective balance stayed 8. The historical wrapper reported
`historical_layers=unresolved`: the legacy layer changed 8→7 while the exact
receipt layer remained 1, so active layer availability still reconciles to
balance 8. Evidence:
[`audits/2026-09-08-phase8-m8-29-layer-legacy-success-live-check.md`](audits/2026-09-08-phase8-m8-29-layer-legacy-success-live-check.md).

## Phase 8 — M8-25 exact layer-transfer concurrency (2026-09-08)

Exact transfer `SND-0A92A2EF71` was posted from a fresh layer snapshot. Two
simultaneous `cancel_layer_transfer_document` calls produced one success and
one already-cancelled P0001. Exactly one reverse document
`SND-R-EE3FD1B1B5` with two legs was created (count 55→57); source quantity
was restored, destination layer consumed and transfer link marked reversed.
Balances remain `Test Anbar / 0000001 = 8` and transfer warehouse = 0. This is
server concurrency evidence, not M8-46 React locking evidence. See
[`audits/2026-09-08-phase8-m8-25-layer-transfer-concurrency-live-check.md`](audits/2026-09-08-phase8-m8-25-layer-transfer-concurrency-live-check.md).

## Phase 8 — M8-24 exact layer-document stock refusal (2026-09-08)

Fresh two-unit receipt `CODEX-P8-LAYER-DOC-STOCK-20260908220311` was partially
consumed by exact write-off `SND-9F8C5810B4`. Direct layer-document cancellation
returned the used-layer P0001; movement count stayed 59→59, no marker appeared
and the receipt layer remained 1/active. The write-off was then reversed and
the receipt cancelled, leaving its layer 0/inactive and total movement count
61. Evidence:
[`audits/2026-09-08-phase8-m8-24-layer-document-stock-refusal-live-check.md`](audits/2026-09-08-phase8-m8-24-layer-document-stock-refusal-live-check.md).

## Phase 8 — M8-25 stock refusal and mixed layer batch (2026-09-08)

Exact transfer `SND-E2E9CED735` was partially consumed at its destination.
Cancellation returned the destination-used P0001 with count 64→64, destination
layer unchanged and link unreversed. After reversing the write-off, the
transfer cancelled successfully. Evidence:
[`audits/2026-09-08-phase8-m8-25-layer-transfer-stock-refusal-live-check.md`](audits/2026-09-08-phase8-m8-25-layer-transfer-stock-refusal-live-check.md).

A later direct layer batch combined ordinary receipt
`CODEX-P8-LAYER-MIXED-20260908220903` and exact transfer `SND-8115BFC4EB`.
It returned ordered one-row and two-row reversals, count 70→73, deactivated
both destination layers, restored the transfer source and marked its link
reversed. Evidence:
[`audits/2026-09-08-phase8-m8-30-m8-32-mixed-layer-batch-live-check.md`](audits/2026-09-08-phase8-m8-30-m8-32-mixed-layer-batch-live-check.md).

Current read-back after these scenarios supersedes the earlier 51-movement
snapshot: 73 movements, zero negative balances, `Test Anbar / 0000001 = 8`,
`Test Anbar / 0000002 = 0`, transfer warehouse `0000001 = 0`. Active layers
are legacy-unresolved 7 plus exact receipt 1 for `Test Anbar / 0000001`.
Capability remains active/version 36; localhost remains HTTP 200 and read-only.

## Phase 8 — M8-26/M8-38 real React layer routing (2026-09-08)

Browser control recovered and a fresh local React admin session opened exact
receipt document `CODEX-P8-LAYER-UI-20260908221451`. Its real dialog displayed
the layer warning, omitted `Sənədi redaktə et` entirely, and retained safe
cancellation. Clicking `Əməliyyatı ləğv et` produced toast/reversal
`SND-C-857A9630B4`; direct read-back proved original retained, one opposite
row added, exact receipt layer 1→0 and movement count 74→75. This gives M8-26
ordinary React layer-selection evidence and live-verifies M8-38 for the
TEST-admin layers-active dialog branch. Localhost was immediately returned to
`VITE_ALLOW_LOCAL_WRITES=false`. Evidence:
[`audits/2026-09-08-phase8-m8-26-m8-38-react-layer-routing-live-check.md`](audits/2026-09-08-phase8-m8-26-m8-38-react-layer-routing-live-check.md).

## Phase 8 — M8-28 layers-active replacement affordance (2026-09-08)

A real React replacement submit against exact receipt
`CODEX-P8-LAYER-REPLACE-UI-20260908221925` returned the exact layer-selection
P0001. Read-back proved count 76→76, one untouched source row, zero reason
markers and its layer still 1/active. This exposed a UI gap: the ordinary
`replace_movement_item` action was offered although it has no layer variant.

`DocumentViewDialog` now offers replacement only for a confirmed
layers-inactive capability. Layer-aware row cancellation remains available,
and the visible explanation names row replacement. Two regression tests were
added; the focused file passes 64/64 and `npm run build` passes. A second real
React exact-receipt dialog showed no replacement button and retained
`Sətri ləğv et`. Both fixtures were layer-cancelled; latest movement count is
79 and item `0000002` balance is zero. Localhost is read-only. Evidence:
[`audits/2026-09-08-phase8-m8-28-layer-replacement-ui-check.md`](audits/2026-09-08-phase8-m8-28-layer-replacement-ui-check.md).

**Phase 8 remains NOT ACCEPTED.**

## M8-25/M8-26 React transfer routing — attempted, BLOCKED (2026-09-08)

The preferred continuation was the last open React layer-routing destination:
cancel a fresh exact `Test Anbar` → `CODEX Phase8 Transfer Anbar` transfer
through the real React document view and confirm React selects
`cancel_layer_transfer_document`.

It was **not executed**. This session had no authenticated browser-control tool
of any kind, so the React action could not be driven or observed. An independent
probe then showed a TEST read with only the publishable anon key returns
HTTP 401, so the authenticated read-back half was unavailable too. With neither
the driver nor the verification available, a write would have been an
unverifiable mutation, so it was refused rather than attempted. No fixture was
created; the TEST baseline is unchanged.

Offline re-inspection (not new evidence) reconfirmed `documentCancel.api.ts`
keeps the `D-I1` argument names separate, `DocumentViewDialog` routes the
transfer family on the live capability flag, and `DocumentCancel.test.tsx`
already asserts the layer call including the absence of `p_original_doc_num`.

Checks: focused tests **142 passed / 3 files**; `tsc --noEmit` exit 0; `oxlint`
exit 0; production build exit 0 (known chunk-size warning); `git diff --check`
exit 0. Localhost `127.0.0.1:5175` returned HTTP 200 and stayed read-only with
`VITE_ALLOW_LOCAL_WRITES=false`; no write window was opened. No commit, stage,
push or deploy; the dirty tree is preserved. Evidence:
[`audits/2026-09-08-phase8-m8-25-m8-26-react-transfer-routing-blocked.md`](audits/2026-09-08-phase8-m8-25-m8-26-react-transfer-routing-blocked.md).

**Phase 8 remains NOT ACCEPTED.**

### Marker-contract cross-check continuation (2026-09-08)

The preferred M8-25/M8-26 React transfer-routing scenario was attempted again
and is still blocked, now with a sharper reason: browser control itself WAS
available this time, but the app has no attachable admin session. Both origins
(`127.0.0.1:5175` and `localhost:5175`) hold only `anbar_device_id` in
localStorage — no `sb-*-auth-token` and no saved e-mail — and
`api/supabase.ts` keeps a non-remembered session in per-tab `sessionStorage`,
which a new tab cannot reach. Signing in would require entering a password,
which is not permitted. No speculative write was made, no fixture was created
and the TEST baseline is unchanged.

The cheapest safe OPEN alternative was executed instead: a STATIC cross-check of
the whole cancellation-marker contract, i.e. the defect class that produced the
`SND-LR-AE5EEE3FF0` finding. Results: the server writes exactly four marker
shapes; every `cancel_layer_*` function delegates its movement write to the
non-layer function and therefore adds no layer-era shape; all nine shipped
client matchers classify the four shapes correctly and match no near-miss
string. The ordinary sibling — the numbered `SND-L-*` document created by
`cancel_legacy_movement`, of which TEST holds `SND-L-01905D9CEE` — is kept out
of the batch matrix by `stripRowLevelCancelled()` rather than by the reversal
matcher, which is legacy-identical parity but was unpinned. A mutation-checked
regression test now pins it in `web/src/lib/batchCancel.test.ts` (two
independent mutations of the strip helper each fail it).

Checks: focused **240 passed / 6 files** (`batchCancel` 30 → 31);
`npm run typecheck` exit 0; `npx oxlint src` exit 0; production build exit 0
with the known chunk warning. Localhost stayed read-only
(`VITE_ALLOW_LOCAL_WRITES=false`, HTTP 200); no write window was opened, no
Supabase call was made, and no commit, stage, push or deploy occurred. Evidence:
[`audits/2026-09-08-phase8-marker-contract-crosscheck.md`](audits/2026-09-08-phase8-marker-contract-crosscheck.md).

**Phase 8 remains NOT ACCEPTED.**

## M8-25/M8-26 React exact-layer transfer route — narrow PASS (2026-09-09)

The previously blocked React transfer destination is now live verified for TEST
admin. Through the real UI, a one-unit exact known-price layer was transferred
`Test Anbar` → `CODEX Phase8 Transfer Anbar` as `SND-456860F655`, opened in its
real transfer card and cancelled to `SND-R-C1D167C46E`. Authenticated read-back
proved count 85→89, both source and reversal legs, the transfer link's non-null
`reversed_at`, source exact layer restored to 1/active, destination child layer
0/inactive, final balances 8/0 and zero negative balances. These layer/link
effects confirm the live `cancel_layer_transfer_document(p_doc_num, ...)` route.

The write process was stopped immediately; localhost is again HTTP 200 with
`VITE_ALLOW_LOCAL_WRITES=false`. No application code, commit, staging, push or
deploy changed. Dirty tree preserved. Evidence:
[`audits/2026-09-09-phase8-m8-25-m8-26-react-layer-transfer-live-check.md`](audits/2026-09-09-phase8-m8-25-m8-26-react-layer-transfer-live-check.md).

Remaining OPEN branches are unchanged. **Phase 8 remains NOT ACCEPTED.**

## M8-29 layer-legacy transfer — blocked by design (2026-09-09)

Continuation after the React exact-layer transfer run. The cheapest remaining
OPEN item needing no browser control was `cancel_layer_legacy_transfer`.

It cannot be exercised on this baseline. The RPC delegates to
`cancel_legacy_transfer` and then applies `apply_legacy_layer_delta` per
warehouse; the destination leg has a negative delta and must consume
`legacy_unresolved`/`legacy_adjustment` stock, which exists only in
`Test Anbar`. Creating the needed document-less pair is itself impossible while
layers are active: `guard_and_capture_stock_layer_movement` refuses any
`out_qty>0` insert and records `in_qty>0` inserts as `receipt` layers, which
that consumption set excludes.

One authorized outbound-leg INSERT confirmed this live:
`HTTP 400 / P0001 — Partiya seçimi tələb olunur…`, with read-back showing
movement count 89→89 and zero probe movements/layers. Nothing was written and
no layer state was fabricated.

M8-29's transfer branch is therefore recorded as a design boundary, not an
outstanding test. Reaching it legitimately needs a fresh cutover seeding
unresolved stock in a second warehouse — an owner decision, not taken
autonomously. Baseline unchanged: 89 movements, `Test Anbar/0000001=8`,
`0000002=0`, transfer warehouse 0, zero negatives. Evidence:
[`audits/2026-09-09-phase8-m8-29-layer-legacy-transfer-structural-block.md`](audits/2026-09-09-phase8-m8-29-layer-legacy-transfer-structural-block.md).

**Phase 8 remains NOT ACCEPTED.**

## M8-43 audit_log visibility — contradiction resolved (2026-09-09)

Read-only continuation; no writes. The standing warning that a fresh admin read
returned zero `audit_log` rows is now explained rather than outstanding.

`audit_log` has a single SELECT policy `p_audit_read` with qual
`(my_role() = 'rehber')`. A TEST admin therefore can never see a row. Live:
`current_user_role()` = `admin`; `select=id`, `action=eq.INSERT` and
`table_name=eq.movements` each returned HTTP 200 with 0 rows; exact count
`*/0`. The emptiness is policy filtering, not missing data or a missing trigger.
Note also the timestamp column is `ts` — ordering by `created_at` fails
`42703` and can be misread as a broken table.

Because RLS returns 200 with no error, the client's permission classifier
(`/permission|denied|rls|401|403/i` over an error message) cannot fire, so an
admin sees the ordinary empty state, not «İcazə yoxdur». Legacy
`index.html:7145` gates its permission branch the same way inside
`if (res.error)`. This is confirmed parity and NOT a defect.

Separate coverage observation: direct `audit_log` inserts exist in
`cancel_transfer_document` and `cancel_movement_row`, inherited by their layer
variants, but not in `cancel_document`, `cancel_legacy_movement`,
`cancel_legacy_transfer` or any `cancel_layer_*`. Audit coverage across the
cancellation family is therefore uneven; recorded as scope, not a defect.

M8-43 must NOT be promoted from admin reads. The decisive check is the same
read performed by a `rehber` session, and no `rehber` credential is documented
in `test-environment/README.md`; passwords must not be guessed. Baseline
unchanged: 89 movements, `Test Anbar/0000001=8`, `0000002=0`, transfer
warehouse 0, zero negatives. Evidence:
[`audits/2026-09-09-phase8-m8-43-audit-log-rls-and-coverage.md`](audits/2026-09-09-phase8-m8-43-audit-log-rls-and-coverage.md).

**Phase 8 remains NOT ACCEPTED.**

## M8-30/M8-32 layer-batch server refusals (2026-09-09)

Read-only continuation; six refused calls, no successful write.

The 2026-09-08 batch validation texts (`Ləğv üçün heç bir sənəd seçilməyib`,
`Sıra 1: …`, `Təkrar seçilmiş sənəd(lər): …`) match neither
`cancel_layer_documents_batch` nor anything in `web/src`/`index.html`, so they
came from the non-layer path and the LAYER batch validation was unproven. It is
now live:

| Case | Response |
|---|---|
| null / empty array | `Sənəd seçilməyib` |
| blank entry | `Etibarsız sənəd nömrəsi` |
| whitespace-only entry | `Etibarsız sənəd nömrəsi` |
| missing document | `Sənəd tapılmadı: SND-DOES-NOT-EXIST-0000` |
| duplicate missing document | same message, exactly ONE refusal |
| existing reversal document | `Bu sənəd artıq bir ləğv (əks yazı) sənədidir…` |

All HTTP 400 / P0001. This demonstrates `btrim` running before the emptiness
test and `SELECT DISTINCT` collapsing duplicates before dispatch.

Divergence recorded (not a defect): an empty selection returns
`Ləğv üçün heç bir sənəd seçilməyib` from `cancel_documents_batch` but
`Sənəd seçilməyib` from `cancel_layer_documents_batch`. Both refuse and write
nothing; the client shows server text verbatim.

State after the run is the starting baseline exactly: 89 movements, balances
`Test Anbar/0000001=8`, `0000002=0`, transfer warehouse 0, zero negatives,
layers legacy-unresolved 7 + receipt 1 active, capability active/36. Evidence:
[`audits/2026-09-09-phase8-m8-30-m8-32-layer-batch-server-refusals.md`](audits/2026-09-09-phase8-m8-30-m8-32-layer-batch-server-refusals.md).

Still OPEN: roles (no `rehber`/`anbardar` password documented),
unknown-outcome/transport failure, refresh failure, UI concurrency and
layer-batch concurrency.

**Phase 8 remains NOT ACCEPTED.**

## M8-46 double-submit live-check — BLOCKED, no live evidence added (2026-09-09)

The one remaining M8-46 gap ("no live write was used to prove this" against
the CODE VERIFIED `inFlight`/synchronous-ref locks in I-4/I-5/I-6) was
attempted and could not be executed.

This session has no browser-automation tool of any kind — a deferred-tool
search for Playwright/Chrome-DevTools/browser-automation tooling returned
nothing, and the available tool set is limited to `Bash`, `PowerShell`, file
read/write/edit tools, `WebFetch`/`WebSearch` (neither can drive an
authenticated interactive click sequence), and non-browser subagents. A real
double-click on a submit control cannot be dispatched or observed.

Independently, no TEST-admin (or `rehber`/`anbardar`) credentials are
documented anywhere in this repo's `docs/superpowers/` references, and the
most recent same-day entry above already lists this as OPEN. The task forbids
guessing credentials, so no sign-in attempt was made either.

With neither the UI driver nor credentials available, no TEST write, fixture,
or Supabase call of any kind was made. `VITE_ALLOW_LOCAL_WRITES` was never
touched and stays `false`. No commit, stage, push or deploy; the 213
pre-existing dirty files are preserved. Evidence:
[`audits/2026-09-09-phase8-m8-46-double-submit-lock-blocked.md`](audits/2026-09-09-phase8-m8-46-double-submit-lock-blocked.md).

**Phase 8 remains NOT ACCEPTED.**

## M8-46 real React double-submit — narrow PASS (2026-09-09)

The blocker above is superseded for the ordinary document-cancellation branch.
Codex had browser automation and used the TEST-admin credential documented in
`docs/superpowers/test-environment/README.md`. A 0.01 receipt
`SND-BD8A2AB48F` was opened in its real React card and a genuine browser
double-click was dispatched on the cancellation submit. The UI produced one
reversal only, `SND-C-015729F809`.

Authenticated read-back proved count 89→91, exactly one source plus one
reversal, the exact receipt layer at 0/inactive, balances restored to 8/0 and
zero negative balances. Localhost was immediately restored to read-only
(`VITE_ALLOW_LOCAL_WRITES=false`, HTTP 200). Dirty tree preserved; no production
contact, code change, commit, staging, push or deploy. Evidence:
[`audits/2026-09-09-phase8-m8-46-react-double-submit-live-check.md`](audits/2026-09-09-phase8-m8-46-react-double-submit-live-check.md).

Other M8-46 UI branches remain OPEN. **Phase 8 remains NOT ACCEPTED.**
## M8-47 concurrent React submit-gate live-check — NARROW PASS (2026-09-09)

Two authenticated TEST-admin browser tabs opened the same real 0.01 receipt
(`SND-6EC3E09726`) and submitted `Əməliyyatı ləğv et` concurrently. Read-back
showed exactly one reversal (`SND-C-56395DEBD0`), with net-zero restoration,
unchanged active layers (7 legacy-unresolved + 1 receipt), balance 8.0 and no
negative quantity. The local server was returned to `VITE_ALLOW_LOCAL_WRITES=false`.
This is a narrow ordinary-cancellation pass; batch, correction, row/replacement
and other M8-47 branches remain OPEN. See
`docs/superpowers/audits/2026-09-09-phase8-m8-47-react-submit-gate-live-check.md`.
## M8-46 React batch double-submit — NARROW PASS (2026-09-09)

TEST-admin created `SND-973DBDDB0B` and `SND-82A44E221E` (0.01 each), selected
both in the real batch flow and double-clicked the final submit. Read-back found
one reversal per source (`SND-C-EE226B292E`, `SND-C-7E56D0995C`) and no
duplicates; count 95→99, layer revision and balance 8.0 restored. Localhost is
read-only again. Correction, row and replacement double-submit branches remain
OPEN. See `docs/superpowers/audits/2026-09-09-phase8-m8-46-react-batch-double-submit-live-check.md`.
## M8-20 / M8-46 React row double-submit — NARROW PASS (2026-09-09)

TEST-admin double-clicked the final row-cancel submit for 0.01 receipt
`SND-17FAC1216F`. Read-back found one source and exactly one row counter
(`6aff78b7-7e16-491f-9234-d608f274dc15`), count 99→101, restored layer revision
and balance 8.0. The refreshed zero-row card explicitly stayed partially
modified, not whole-document cancelled, covering M8-20's empty-after-strip
branch. Localhost is read-only. See
`docs/superpowers/audits/2026-09-09-phase8-m8-20-m8-46-react-row-double-submit-live-check.md`.
## M8-22 / M8-32 evidence reconciliation (2026-09-09)

The M8-47 two-tab run also live-rendered the ordinary peer card as
`Ləğv edilib · əks sənəd: SND-C-56395DEBD0`, so M8-22 now has narrow ordinary
live evidence. The later M8-46 batch double-click also closes M8-32's narrow
same-control UI-concurrency gap; independent multi-tab batch concurrency remains
OPEN.
## Phase 8 autonomous continuation boundary (2026-09-09)

Current reachable browser work is exhausted after M8-47 concurrent ordinary,
M8-46 ordinary/batch/row double-click, M8-20 and M8-22 presentation, and M8-32
same-control concurrency checks. Count is 101; balance 8.0 and layer revision
`0c1daafebbdd9402383fb8fe4b535a02` are restored; localhost is read-only.

Remaining work needs one of: supported inactive-layer/edit state, usable
`anbardar`/`rehber` credentials, owner-approved fresh cutover, or a controlled
fault/volume harness. Details:
`docs/superpowers/audits/2026-09-09-phase8-autonomous-closure-boundary.md`.
No I-10 row. **Phase 8 remains NOT ACCEPTED.**

## M8-40/M8-42/M8-43 role and RLS live check (2026-09-09)

The prior role-credential blocker is superseded. Two dedicated identities were
created only in TEST `alkjjbaawmsirsfvqljm` and assigned as active `anbardar`
(`Test Anbar`) and active `rehber`; credentials are intentionally not stored in
the repository.

The `anbardar` layer-batch mutation probe returned HTTP 400 / P0001 with exact
server text `Yalnız Admin sənədləri ləğv edə bilər`; movements stayed 101→101.
For RLS, admin saw 101 movements partitioned into 85 `Test Anbar` and 16
`CODEX Phase8 Transfer Anbar`; `anbardar` saw exactly the 85 allowed IDs and no
foreign row. Admin saw zero `audit_log` rows while `rehber` saw 543, including
seven known Phase 8 fixture matches.

See `docs/superpowers/audits/2026-09-09-phase8-m8-40-m8-42-m8-43-role-rls-live-check.md`.
Localhost remains read-only; no production contact, commit, staging, push or
deploy. No I-10 row. **Phase 8 remains NOT ACCEPTED.**

React follow-up: correctly started `vite --mode sandbox` showed the real audit
page as `anbar-rehber-codex-test · Rəhbər`, `1–50 / 544`, including the M8-46
row-cancel reason and counter IDs. The TEST device session was ended and the
device list is empty.

Operational deviation: before that valid run, localhost was accidentally
started without `--mode sandbox`; one TEST-only rehber credential attempt was
therefore sent to the production Auth endpoint and rejected. No production
session, authenticated REST request, application write or fixture action
followed. That Vite process was stopped immediately. Final localhost is TEST
sandbox/read-only, HTTP 200. See the role/RLS audit for the full record.

## 2026-09-09 — Phase 8 final acceptance gate reached

**Completed this session (all TEST `alkjjbaawmsirsfvqljm`, 0 production contact):**

1. **M8-14 → LIVE VERIFIED.** The first M8-14 evidence from a real TEST
   `postgres_changes` event. A read-only observer proved the channel reached
   «Subscribed to PostgreSQL»; a separate write-enabled writer posted an
   exact-layer 0.01 transfer (`post_layer_transfer_document` →
   `SND-8DC5E59E8D`) whose two legs fired two INSERT events at the same
   millisecond. Observer recorded no refresh before the debounce and exactly
   ONE refresh **439 ms** after the last event, with StrictMode accounted for.
   Cancelled through the real «Yerdəyişməni ləğv et» →
   `cancel_layer_transfer_document` → `SND-R-2550716DCD`.
2. **M8-44 realtime-path exclusion CLOSED**, with a passing positive control.
   Two invalid runs were rejected rather than reported.
3. **M8-39 / M8-46 correction+replacement reclassified SATISFIED-BY-GATE.**
   The layers-active gate makes them intentionally unreachable; no
   inactive-layer state was fabricated. The earlier "needs an inactive-layer
   edit state" blocker note is superseded.

**Checks:** 126 files / 2708 tests pass; typecheck, oxlint, production build
clean; `git diff --check` exit 0.

**TEST state:** 121 movements (every fixture posted AND reversed — no immutable
movement or audit row was deleted), `Test Anbar/0000001 = 8.00`, 0 negative
balances, layers 7+1 active at version 36.

**Environment:** only `127.0.0.1:5175` listens, `--mode sandbox`, HTTP 200,
`VITE_ALLOW_LOCAL_WRITES=false` both on disk and in the served bundle. The
temporary write-enabled process (port 5176, env-var only, never persisted) was
stopped. No orphaned automation browser. Staged state empty; 214 dirty files
preserved; no commit/stage/push/deploy; no I-10 row.

### THE NEXT OWNER IS CODEX, NOT CLAUDE

**Phase 8 remains NOT ACCEPTED**, and no further Claude work will change that.
The ledger (`specs/2026-09-05-phase8-registry-rows.md:31-32`) and
`ANBAR_REACT_MIGRATION_PRINCIPLES.md` §11 require **Codex's independent audit**
before any phase is `ACCEPTED`; `CLAUDE.md` §4 fixes the same sequence. Every
executable, safe, authorized TEST scenario found in the ledger normalization
has been completed.

Two items are classification judgements for that audit to rule on, not
uncollected evidence:

- whether **satisfied-by-gate** is accepted for the M8-39/M8-46
  correction/replacement branches (recommendation: yes — the required
  behaviour is the refusal, and it is verified live);
- whether **M8-29** layer-legacy transfer success may remain unexecuted rather
  than destroying the TEST evidence baseline with a fresh cutover.

Full reasoning and the separated mandatory/optional blocker list:
`docs/superpowers/audits/2026-09-09-phase8-final-acceptance-gate.md`.

## 2026-09-09 (later) — post-Codex reconciliation

Codex's independent review returned **NOT ACCEPTED** with one evidence defect
and a reconciliation instruction. Both were acted on; **no source file was
touched**, so Codex's automated pass (126 files / 2708 tests, typecheck, lint,
production-optimized sandbox build) still holds and was deliberately NOT re-run.

**Correction accepted (Codex finding #2).** The layer-gate audit had cited
transfer `SND-8DC5E59E8D` as an otherwise-eligible correction/replacement
candidate. Verified in source that this is wrong: `canEditDocument()` refuses
`!isOrdinaryDoc` three checks BEFORE the `layerActive` branch
(`documentEdit.ts:99`), and `canReplaceItems()` rejects transfer kinds
unconditionally (`documentCancelGate.ts:136`). A transfer card shows neither
control even with layers INACTIVE. The audit section is retracted and rewritten,
the M8-39/M8-46 rows corrected, and the registry carries the retraction. The
older ordinary-document M8-38 and post-fix M8-28 checks were **reused, not
re-run**, per instruction.

**Contracts closed this session** (all read-only harness work):

- **M8-54** — the last two branches: fully-resolved `transferRoute()` `A → B`
  and `movKey()`'s `route:`, each matching an independently recomputed
  expectation, with TWO negative controls and the real snapshot restored.
- **M8-32** — the all-or-nothing failure message live in the real dialog
  (atomicity was already server-side); also confirms M8-48/M8-49 live. The
  negative control is explicitly NOT claimed — the write guard short-circuits
  before the network, so `rejected` could not be separated from `unknown`.
- **M8-47** — the stale re-check: the action control was revoked on an OPEN
  dialog when the rows changed (0 RPCs), with a valid negative control.

Browser-contract evidence is labelled distinctly from persisted TEST data in
every audit and row.

**TEST reconciled:** movements 125, all fixtures posted AND reversed, balance
`Test Anbar/0000001 = 8.00`, 0 negatives, layers 7+1 at version 36. Localhost
read-only HTTP 200; no write-enabled process was opened. Staged empty, 214 dirty
entries preserved, 0 production contacts, no I-10 row.

### Minimal remaining gaps — TWO OWNER DECISIONS, then Codex

1. **Scope decision:** are M8-39 and M8-46's correction/replacement branches
   accepted as out of scope for the ACTIVE-LAYER configuration? They cannot be
   reached without layer deactivation, which would destroy the evidence
   baseline. Recording them silently as satisfied is what Codex objected to.
2. **Scope decision:** M8-29's legacy-transfer success branch. Per Codex, the
   missing legacy stock does NOT prove it correct or remove it from scope, and
   the necessity of a fresh cutover is NOT independently established. Baseline
   preserved; no cutover performed.
3. **Then:** independent Codex acceptance.

Full reasoning: `audits/2026-09-09-phase8-post-codex-reconciliation.md`.
## 2026-09-10 — Phase 7 M7-39 field-clearing Codex audit

Codex independently accepted the `commitSignal` field-clearing remediation.
Focused 143/143, full 126/2723, typecheck, oxlint, sandbox build and
`git diff --check` all passed. Live TEST browser evidence now covers both an
ordinary inbound local commit and a confirmed active-layer outbound local
commit: pick/qty/unit/split/price clear, search refocuses, and a subsequent pick
does not resurrect the old `0.01`. The final «Sənədi qeyd et» action was never
invoked; the TEST session ended via «Çıxış».

The remediation report's claim that the M7-39 ledger row had already been
rewritten was false: the working row still said `lines.length GROWING` and
claimed only refocus was live. The row, registry and next-prompt banner are now
corrected. Audit:
`audits/2026-09-10-phase7-m7-39-field-clearing-codex-audit.md`.

`M7-39` remains `IN PROGRESS` only for its request-key invalidation clause. The
cheapest falsifiable next leg is a browser interception test: capture and abort
a first layer-post request after it creates key K1; perform a real local line
commit; attempt the same guarded post again and prove the request carries a new
non-empty K2 (`K2 != K1`). Both post RPCs must be aborted before TEST, with zero
database mutation. Phase 7 remains **NOT ACCEPTED**.
## 2026-09-10 — M7-39 request-key claim rejected by Codex

The fail-closed interception and K1→K1 positive control are accepted, but the
promotion to `LIVE VERIFIED` is retracted. The claimed K2≠K_MID comparison did
not isolate commit: removing the only line independently clears the key; an
empty document cannot produce K_MID; rebuilding it is itself a commit; and the
one-bucket TEST fixture cannot support another simultaneous line without a
further invalidating action. Audit:
`audits/2026-09-10-phase7-m7-39-request-key-codex-audit.md`.

M7-39 is `IN PROGRESS`. Rerun with two simultaneously postable outbound lines:
capture K1 for line A, then commit line B without removing/editing A or changing
headers, capture K2, and prove K2≠K1. A small supported TEST second-item layer
fixture may be created and closed net-zero. M7-38's failed-read branch is
accepted at narrow scope and remains `IN PROGRESS`. Phase 7 is NOT ACCEPTED.
## 2026-09-10 — M7-39 accepted; M7-38 negative split still open

Codex accepts the corrected two-simultaneous-line K1→K1→K2 proof. No removal,
edit, header/tab/clear/restore/bulk action occurred; line B's `addLineRaw` was
the only request-key invalidator between captures. Fixture `SND-BAE2EF3FBF`
was closed net-zero with immutable original/reversal history. M7-39 is
`LIVE VERIFIED`.

Codex only partly accepts the M7-38 split-chain audit. `Math.min(value,max)`
does not clamp below zero. A small negative in a max-0 bucket plus positive
`0.01` İcarədə can leave total quantity positive and reach the exact negative
`condSplitCheck` refusal. Run that read-only leg; do not claim all three
messages unreachable. M7-38 remains `IN PROGRESS`; Phase 7 is NOT ACCEPTED.
Audit: `audits/2026-09-10-phase7-m7-39-correction-m7-38-split-codex-audit.md`.

## 2026-09-10 — Phase 7 final Codex acceptance

**Phase 7 / Module H is ACCEPTED.** Codex reconciled every effective open row,
fixed M7-40's missing layered `priceVariants` propagation/rendering, added exact
full-form/caller regressions for M7-16, M7-38, M7-69, M7-83, M7-90 and M7-121,
and reclassified stale rows only where their exact contract was exercised.

Live TEST proof added without a committed mutation: unknown channel and partner
both returned exact HTTP 400 / P0001 label-guard messages; movements remained
127→127. Existing transfer `SND-3550711E4C` proves M7-14's invoice on both legs.

Gate: focused 180/180; full one-worker suite 126 files / 2730 tests; typecheck,
oxlint and sandbox build clean. Dirty tree 214 entries preserved, 0 staged, no
commit/push/deploy, production untouched, on-disk writes flag false. Accepted
scope: active layers and splits; no deactivation/new cutover; `Çap` excluded.

Audit: `audits/2026-09-10-phase7-final-codex-acceptance.md`.

## 2026-09-10 — Phase 9 T3: page/store/API audited, bal route wired

A separate session had written the whole T3 surface (BalancesPage, store,
snapshot API, set_stock_condition API, ConditionCell, balanceExport, xls) and
stopped on a red suite with no audit, no route and no page tests. The code was
preserved and audited row by row: the `bal` route is wired (M9-01, M9-04),
`BalancesPage.test.tsx` adds 56 tests incl. the M9-134b cross-key regression,
the `xlsFallback` BOM harness defect and the `ConditionCell` set-state-in-effect
lint defect are fixed. Ledger: 112 `CODE VERIFIED`, 6 `NOT STARTED`, 1 `LIVE VERIFIED` (M9-141a), 5 `IN PROGRESS` (M9-19, M9-92, M9-99, M9-100, M9-108), 0 `BLOCKED`, 0 unclassified (124 unique). Remaining work is live only
(T0B, Q4/T10) plus the independent Codex audit. Full suite 139 files / 3087
tests, tsc/oxlint/sandbox build clean, 0 staged, dirty tree preserved, no
Supabase contact. Phase 9 is NOT ACCEPTED.
Audit: `audits/2026-09-10-phase9-t3-balances-page.md`.
