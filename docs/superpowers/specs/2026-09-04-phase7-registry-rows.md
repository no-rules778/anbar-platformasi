# Phase 7 parity-registry rows — Module H ledger

**This is the authoritative Module H (Phase 7, «Yeni əməliyyat») row-by-row
ledger.** It is linked from `ANBAR_FUNCTIONAL_PARITY_REGISTRY.md` rather than
duplicated there, to avoid carrying the full ~135-row table in two places.
Implementation started 2026-09-04 (milestone H-1) and has progressed through
H-5; rows `M7-*` below carry each milestone's evidence as it lands.

> **AUTHORITATIVE CODEX VERDICT — 2026-09-10. Phase 7 / Module H is
> `ACCEPTED`** for the owner-approved active-layer / active-split TEST scope.
> The final reconciliation closed every effective non-closed row, fixed the
> M7-40 layered-price display gap, ran 2730 tests plus typecheck/lint/build,
> and recorded the two configuration-only fallback branches without
> deactivating layers or changing cutover state. See
> `../audits/2026-09-10-phase7-final-codex-acceptance.md`.

**Historical pre-acceptance statement (superseded 2026-09-10): Phase 7 /
Module H remained INCOMPLETE and NOT `ACCEPTED`.** Milestone H-5
(2026-09-05) produced the first live writes, in the isolated TEST project
`alkjjbaawmsirsfvqljm` only, covering the inbound `Satınalma` path, the Qaimə №
block, the duplicate-submit reality, item creation and `M5-55`. Transfers,
layers, İcarə/conditions, anbardar scoping and several other paths remain
untested; see milestone H-5 below for the full accounting. **As reconciled
2026-09-09, they remain untested because their Phase 7 contracts were not
executed — the TEST fixture blocker H-5 cited has since been resolved by Phase 8
(see the reconciliation section above).** Every row's
`Status` column is the single effective status source for this module.

Behavioural reference: `origin/main:index.html`; every «Old ref» is a line
number in that file. Planned React refs are paths under `web/src/`.

## Phase 8 reconciliation (2026-09-09)

Phase 8 / Module I was ACCEPTED on 2026-09-09 for the owner-approved
active-layer TEST scope. Its evidence was reconciled against this ledger, per the
Phase 7 reconciliation instruction. Result:

- **One row closed.** `M7-123` — read 10 `get_stock_layers` was measured
  read-only, because Phase 8's accepted cutover already left layer accounting
  active. Zero writes, no setup, no cleanup. The row's stop condition is met.
  (`../audits/2026-09-09-phase7-m7-123-read10-live-measurement.md`)
- **No other row promoted.** Phase 8 exercised `M8-*` movements-screen contracts;
  Phase 7's open rows are «Yeni əməliyyat» posting-path contracts. They are not
  the same contracts, so Phase 8 audits are **not** re-attributable to them.
  Promoting on adjacency is precisely the invalid attribution Codex rejected
  during Phase 8 acceptance.
- **One stated blocker retracted as stale.** H-5's fixture limitation (1 user, 0
  conditions, 0 layers, 5 movements) no longer describes TEST. Those rows are open
  because their contracts were not executed — not because they are unrunnable.
  `partners` = 0 is the only surviving H-5 fixture blocker.
  (`../audits/2026-09-09-phase7-fixture-precondition-reconciliation.md`)

## Read-only real-UI sweep (2026-09-09) — `M7-18`, `M7-22`, `M7-116`

Codex accepted the `M7-123` closure
(`../audits/2026-09-09-phase7-m7-123-codex-review.md`) and named this sweep the
next lowest-cost evidence. Executed through the real React UI in TEST, **read-only
— zero mutations, zero posting RPCs**, with a browser-level interceptor that
aborts any production URL, any posting RPC and any REST table write. The guard
never fired.

- **`M7-18` → `LIVE VERIFIED`.** The unit tracked the nomenclature across a
  three-item falsifiable control (ədəd → kg → metr) and is rendered as
  non-editable text, so read-only holds structurally.
- **`M7-116` → `LIVE VERIFIED`.** The real in-page action navigated Mal hərəkəti
  → Yeni əməliyyat with no prefill, no edit mode and no submission; the movements
  snapshot returned byte-identical. A negative control confirmed the same
  assertions DO detect the `M5-55` prefill.
- **`M7-22` → `IN PROGRESS`** (from `NOT STARTED`) at the time of the sweep. Five of
  six sub-assertions were live verified, including price-only-when-empty and the live
  condition split; the quantity-focus rule was unimplemented. **Superseded the same
  day: the focus rule was fixed and `M7-22` is now `LIVE VERIFIED`** — see the
  section below.

Audit: `../audits/2026-09-09-phase7-m7-18-m7-22-m7-116-readonly-ui-sweep.md`.

### Parity gap: quantity focus after pick — **FIXED 2026-09-09**

Found 2026-09-09: legacy `index.html:3400` runs
`if (!keep && !OP.condSplit) $('#o-qty').focus();` and `commitDraftLine()`
(3669) refocuses the item input, but the React port implemented **neither** — no
`.focus()`, no `autoFocus`, no ref anywhere in `web/src`, and no `keep`
parameter. Live, the active element stayed `BODY` after every pick and commit. A
positive control proved focus was observable, so this was a real gap, not a
harness artifact, and no deviation had ever been recorded for it.

**Confirmed by Codex** (`../audits/2026-09-09-phase7-m7-22-focus-codex-finding.md`)
and **remediated the same day**
(`../audits/2026-09-09-phase7-m7-22-m7-39-focus-parity-remediation.md`).

The fix uses element refs plus transition-scoped one-shot state — no global DOM
selectors. Quantity focus is armed only by an explicit combobox choice or the
M5-55 prefill being consumed, and applied only once the picked item has rendered
and only when no condition split exists; an ordinary rerender of an existing pick
arms nothing, which is the legacy `keep = true` case. The original
`lines.length`-growth signal was rejected by Codex because an asynchronous draft
restore also grows 0→N. The corrected implementation uses an explicit monotonic
`commitSignal`, advanced only after the ordinary and confirmed-layer single-line
commit points; mount, restore, removal, failed validation and an unconfirmed
dialog never advance it.

10 focused tests were added, **4 verified to fail against the pre-fix code**
(exactly the positive focus assertions). Full suite 126 files / **2718** tests,
typecheck, oxlint, sandbox build and `git diff --check` all clean, and the three
behaviours were re-verified read-only in the real browser.

Consequence: **`M7-22` is now `LIVE VERIFIED`** (complete, both focus branches
proved). On 2026-09-10 Codex independently re-ran the field-clearing remediation
live: ordinary and confirmed-layer commits clear pick/qty/unit/split/price and
refocus search, and a second pick does not resurrect stale quantity. **`M7-39`
remains `IN PROGRESS` only because request-key invalidation has automated, but
not live, evidence.**

Historical milestone wording below is preserved as chronology and annotated in
place, never rewritten. **Phase 7 remains INCOMPLETE and NOT `ACCEPTED`**, pending
its own independent Codex audit.

## Milestone H-1 — implementation evidence (2026-09-04)

**H-1 IS NOT PHASE 7 COMPLETION.** Module H remains ONE acceptance boundary.
Nothing here is `ACCEPTED` or `LIVE VERIFIED`, and **no live write of any kind
has occurred**. H-1 delivered `T1`, `T1b`, `T2`, `T2b` and `T3` only: pure
logic, the readiness matrix and the API transport layer. No page, store,
dialog, navigation or posting UI exists yet.

**31 rows are `CODE VERIFIED` (H-1); 25 are `IN PROGRESS`** — mocks and unit
tests only, never live. Every other row stays `NOT STARTED`, `M5-55` included.

**Corrected after the H-1 audit finding `A03`.** The first pass promoted all 56
touched rows to `CODE VERIFIED`, which overstated 25 of them: their helper or
API half is genuinely done and tested, but their full registry contract also
needs the store, form, dialog, panel or handler that H-1 deliberately does not
contain. Those now read
`IN PROGRESS — H-1 helper/API verified (<what>); completion in H-2/H-3`, naming
both the evidence that exists and the milestone that finishes them.

| Status | Count | Meaning here |
|---|---|---|
| `CODE VERIFIED` (H-1) | **31** | The ENTIRE row is implemented by the pure-logic / API scope and covered by tests |
| `IN PROGRESS` | **25** | The H-1 half is verified; a future layer completes the row |
| `NOT STARTED` | the rest | Nothing implemented, `M5-55` included |

The 25 `IN PROGRESS` rows are `M7-09`, `M7-10`, `M7-16`, `M7-30`, `M7-31`,
`M7-51`, `M7-52`, `M7-53`, `M7-54`, `M7-55`, `M7-56`, `M7-60`, `M7-63`, `M7-73`,
`M7-74`, `M7-90`, `M7-101`, `M7-102`, `M7-103`, `M7-S1`, `M7-S2`, `M7-S3`,
`M7-S4`, `M7-S5`, `M7-S6`.

`M7-90` is included because `qaimeConflict()` accepts an ALREADY-FILTERED list:
restricting the comparison to operational movements is the caller's job, and
H-1 has no caller. `M7-S2`/`M7-S3` are included because H-1 makes each read
REPORT a failure correctly, while refusing to COMMIT it is the store's half.

**Checks after H-1: 1350 tests / 78 files, typecheck, oxlint, build and
`git diff --check` — all clean** (986 / 61 baseline, re-run and confirmed green
before the first edit; H-1 adds 364 tests in 17 files). No Phase 1-6 behaviour
was changed.

### H-1 audit remediation (2026-09-04)

All three findings of
[the H-1 audit](../audits/2026-09-04-phase7-h1-codex-audit.md) are fixed.
**Checks after remediation: 1356 tests / 78 files, typecheck, oxlint, build and
`git diff --check` — all clean** (1350 / 78 at audit time; +6 tests, no new
files). No design change, no UI or store code, no database access, no live
write.

**`A01` — FIXED · the split probe accepted an explicit `false`.**
`fetchSplitSupported()` returned `!error`, ignoring the payload, so a
compatible server that EXPOSES `movement_split_supported()` but answers `false`
would have been read as "supported". The client would then send `conditions`
the server silently drops, leaving the markers behind in the source warehouse —
precisely the failure this probe exists to prevent. It now returns
`data === true` only. Three regression tests: explicit `{data:false,
error:null}`, a null/undefined payload, and a truthy non-boolean (`'true'`, `1`)
— no coercion. The returned-error and rejected-promise cases are retained
unchanged.

**`A02` — FIXED · the paged `stock_conditions` read had no stable order.**
`range()` was called in pages of 1000 with no `order()`. PostgREST page
boundaries are not stable without a deterministic order, so a large table can
skip or duplicate rows **while every request succeeds**. A skipped condition row
makes its item read as UNMARKED — the split UI never renders and the whole
quantity posts as `normal`, which is the `M7-S3` wrong write reached without any
error at all. Now ordered by `warehouse` then `item_code`, which is the table's
PRIMARY KEY (`stock_conditions_pkey`, confirmed in the live schema capture) and
therefore unique and total. Three tests assert both clauses, that they precede
`range()` on EVERY page, and that ordering still applies when the first page
fails. The partial-page failure behaviour and both error shapes are unchanged
and still covered.

**Both fixes were verified to fail against the pre-fix code**: reverting the two
functions produced **6 failures**, exactly the A01 and A02 cases. The correct
versions were then restored and re-verified green.

**`A03` — FIXED · status honesty.** See the corrected table above: 56 → 31
`CODE VERIFIED` + 25 `IN PROGRESS`.

### Files delivered

`lib/`: `opTypes.ts` · `condSplit.ts` · `icareExposure.ts` · `qaimeConflict.ts`
· `opLineValidation.ts` · `bulkWriteOff.ts` · `layerAllocation.ts` ·
`opDraft.ts` · `opPayload.ts` · `opReadiness.ts` — each with a colocated test.
Modified: `warehouseScope.ts` (+`transferSourceWarehouses`,
`transferDestWarehouses`, `ANBARDAR_FORBIDDEN_DEST` for `D-H1`),
`mutationGuard.ts` (+ the four `op.*` write actions).

`api/`: `stockConditions.api.ts` · `stockLayers.api.ts` ·
`movementSplit.api.ts` · `transferDestinations.api.ts` ·
`documentEditImpact.api.ts` · `postMovementDocument.api.ts` — each with a
colocated test. Modified: `partners.api.ts` (+`readPartners`, the core-read
contract; the existing `fetchPartners` is untouched because Phase 2/3 depend on
it).

### The two mandatory failure tests were verified to fail against a naive port

A deliberately naive `opReadiness.ts` was produced — `stock_conditions` moved
back to optional, and `!r.ok && !r.partial` accepting a truncated read — and the
suite was re-run against it. **7 tests failed**, exactly the `M7-S2` and `M7-S3`
cases plus their supporting assertions. The correct implementation was then
restored and re-verified green. The naive version was never committed.

### `D-H1` in code

`transferSourceWarehouses()` narrows an anbardar to their own warehouse;
`transferDestWarehouses()` removes «Ofis» for an anbardar. **Admin behaviour is
byte-for-byte unchanged**, and the legacy `sourceWarehouses()` keeps its wider
behaviour because Phase 6 and earlier depend on it. Both halves are pinned by
tests. No SQL was touched.

### Measurements — `M6-40` and `M7-123`

Both rows now carry real numbers; see the measurement table below. Recorded in
the isolated TEST project `alkjjbaawmsirsfvqljm` only, by read-only `SELECT`s
and read-only RPC probes. **Production `bbjmhaerssakbreykxiw` was not connected
to or queried.**

---

**Revision 2 (2026-09-04)** — corrected after the Codex design audit
[`../audits/2026-09-04-phase7-design-codex-audit.md`](../audits/2026-09-04-phase7-design-codex-audit.md):
`A02` added rows `M7-S1`…`M7-S6` (load/readiness matrix) · `A03` added rows
`M7-21a`…`M7-21e` («Yeni mal yarat» transition) · `A04` fixed the measurement
scopes of `M7-123` and `M6-40` · Q3 turned `H-D1` into the approved deviation
`D-H1`, changing `M7-08`, `M7-33` and `M7-118`. `M7-` row count: 123 → 135
(plus the carried `M5-55`). Every row remains `NOT STARTED`.

---

## Milestone H-2 — implementation evidence (2026-09-04)

**H-2 IS NOT PHASE 7 COMPLETION.** Module H remains ONE acceptance boundary.
Nothing here is `ACCEPTED` or `LIVE VERIFIED`, and **no live write of any kind
has occurred**. H-2 delivered `T4` (the store) and `T5` (the page, the form,
`ItemStatePanel`, `DraftLinesPanel`, `LoadErrorState`) — no dialogs (H-3), no
navigation or `M5-55` wiring (H-4), no posting.

**Checks after H-2: 1441 tests / 84 files, typecheck, oxlint, build and
`git diff --check` — all clean** (1356/78 at H-1; H-2 adds 85 tests in 6 new
files).

A row is `CODE VERIFIED` only where H-2 delivers the row's COMPLETE contract —
a store field plus a rendered/tested UI behaviour with no dialog or
posting-orchestration gap. A row whose remaining half is a dialog (H-3) or
navigation/posting (H-4) is `IN PROGRESS`, naming that milestone. **The
per-row `Status` column in the tables below is the single effective status
source for this module**; the milestone sections here record what changed and
why, and state no row status of their own (audit `A11`).

### H-2 remediation (2026-09-04) — Codex audit `A01`-`A07`

An independent Codex audit
([`../audits/2026-09-04-phase7-h2-codex-audit.md`](../audits/2026-09-04-phase7-h2-codex-audit.md))
found seven defects in the FIRST H-2 pass, two of them (`A01`, `A03`) at P1:
a page-effect ordering bug that silently destroyed the just-restored draft
before the user ever saw it, an outbound «Qaytarma» offering the wrong
counterparty directory, a stale armed quantity surviving a warehouse change,
a reference-directory fallback reading the wrong movement field, a combobox
missing its required debounce and code-matching rule, a lines table dropping
the counterparty and operation type from its route cell, and a restore
toast/registry-status gap. All seven are fixed in this remediation pass, each
with a regression test that fails against the described wrong implementation;
**No H-3 work (dialogs) was started in this pass** — scope was fixes plus
tests only. (The promotion list this section originally carried was removed by
the `A11` fix below: it had become a competing status source contradicting the
tables.)

### H-2 remediation, second pass (2026-09-04) — Codex audit `A08`-`A11`

The re-audit of the `A01`-`A07` pass
([`../audits/2026-09-04-phase7-h2-codex-audit.md`](../audits/2026-09-04-phase7-h2-codex-audit.md),
section «Re-audit after A01-A07 remediation») found four further defects, one
at P1. All four are fixed:

- **`A08` (P1)** — `A01`'s fix armed the save effect after `load()` resolved
  WITHOUT checking whether the core load succeeded. On a failed core read the
  permission set is empty, `restoreDraft()` classifies every stored line as
  `no-permission`, and the removal branch DELETED the draft — a transient read
  failure became permanent local data loss. Fixed in both layers: the store's
  `restoreDraftOnBoot()` refuses an unloaded/failed snapshot and returns
  `skipped:true` without touching localStorage, and the page neither attempts
  the restore nor arms saving on a failed load. Mounting onto an
  already-healthy snapshot now ATTEMPTS the restore instead of only arming
  future saves. Five regression tests (three page-level, two store-level),
  each verified to fail against the audited implementation.
- **`A09` (P2)** — the 12-row cut ran BEFORE the outbound stock filter, so a
  search whose first 12 text matches were all out of stock reported «no
  result» even when a later match had stock. The predicate now runs first,
  as `index.html:3311-3317` does. Three regression tests, including the
  audit's required 13-matching-items fixture where only the last has stock.
- **`A10` (P2)** — the form offered a blank `—` option in the type, warehouse,
  destination and counterparty selects and initialised all of those header
  fields to empty, where legacy renders effective defaults immediately
  (`H.d || today()`, `H.w || ME.wh`, first type, first counterparty, first
  destination ≠ `ME.wh`); and selecting «Silinmə» only changed the displayed
  option list without pinning `header.p` as `M7-11` requires. Both fixed
  through one effect that writes the defaults into the store, reusing the
  EXISTING option lists as the only rules source. Six regression tests, from
  a genuinely empty header and a real type transition.
- **`A11` (P2)** — the status ledger was internally contradictory: a narrative
  claimed promotions the table still recorded as `NOT STARTED`. Fixed by
  reconciling every H-2 row's TABLE status against its complete contract, and
  by deleting the narrative promotion list that was acting as a competing
  status source. **The per-row `Status` column below is now the single
  effective status source for this module** — this section records what
  changed and why, and states no row status of its own.

Reconciliation outcome: rows whose full contract H-2 delivers are
`CODE VERIFIED`; rows with a real remaining H-3/H-4 half are `IN PROGRESS`
naming that milestone. The reconciliation also DEMOTED claims that did not
survive checking — `M7-21` (the «Yeni mal yarat» dialog transition is H-3),
`M7-109` (the `document_edit_impact` caller is H-4/Phase 8), `M7-115`
(navigation is H-4, and navigation alone is explicitly not parity), `M7-S5`
(H-3's dialog buttons must consult the same gate) and `M7-13` (the out Qaimə
hint is a generic shared string, not the row's exact sentence, and is
untested) are `IN PROGRESS`, not `CODE VERIFIED`.

**H-2 remains NOT `ACCEPTED` and NOT `LIVE VERIFIED`. No live read or write
occurred in this pass. No H-3 dialog, navigation or posting work was started.**

---

## Milestone H-3 — implementation evidence (2026-09-04)

**H-3 IS NOT PHASE 7 COMPLETION.** Module H remains ONE acceptance boundary.
Nothing here is `ACCEPTED` or `LIVE VERIFIED`, and **no live write of any kind
has occurred**. H-3 delivered `T6` (the eight dialogs) and `T6b` (the «Yeni mal
yarat» transition) only — no navigation or `M5-55` wiring, and no post RPC.

**Checks after H-3: 1559 tests / 92 files, typecheck, oxlint (exit 0), build
and `git diff --check` — all clean** (1474/84 at H-2; H-3 adds 85 tests in 8
new files). `oxlint` was sanity-probed with a deliberate `debugger` statement
to confirm it reports rather than silently passing.

As in H-2, **the per-row `Status` column above is the single effective status
source**; this section records what changed and why and states no row status of
its own.

### What was promoted, and what deliberately was not

27 rows reached their COMPLETE contract and are `CODE VERIFIED` (H-3): the
whole `M7-21a`…`M7-21f` transition family plus `M7-21` itself, the edit-line
family (`M7-45`, `M7-46`, `M7-48`, `M7-49`, `M7-50`), the bulk-dialog rows
whose contract is selection rather than posting (`M7-57`, `M7-60`, `M7-61`,
`M7-62`, `M7-63`, `M7-64`, `M7-65`, `M7-68`, `M7-70`), the layer dialog
(`M7-72`, `M7-73`, `M7-74`, `M7-75`), the confirmation dialogs (`M7-81`,
`M7-89`, `M7-92`, `M7-93`), the edit-mode UI (`M7-110`, `M7-111`, `M7-112`),
`M7-44`, `M7-13` and `M7-S5`.

**`M7-S5` is the one worth reading closely.** H-2 demoted it because "every
button AND every handler" could not be true while the dialogs did not exist.
`PostConfirmDialog` now receives `canPost` and `inFlight` as props from the
same selector `DraftLinesPanel` uses and adds no local condition; two tests
pin that it refuses when either is false. That is what closes the row.

Six rows were advanced but NOT promoted, because a genuine half remains:
`M7-66`/`M7-67` (the apply branches exist and are all-or-nothing by
construction, but the legacy truncate-to-`base` regression is H-4), `M7-69`
(the İcarə re-run works; its "reason lands once" regression is H-4), `M7-83`
(the edit-mode branch needs the post path), `M7-91` (the gate ORDER is done;
the RPC after the confirmation is H-4) and `M7-40` (the panel still has no
layered column model). Recording these as `IN PROGRESS` rather than promoting
them is deliberate: each names the milestone that finishes it.

### The three tests verified to fail against a wrong implementation

Per plan `T8` the check was performed by reverting the real code, re-running,
and restoring: **`presetName` ignored when editing** (seeding on edit → 1
failure), **the split-cut mismatch rejecting rather than trimming** in
`EditLineDialog` (applying the clamp blindly → 1 failure), and the H-2
`A01`/`A08` draft-restore pins, re-run unchanged and still green. No wrong
version was committed or left on disk.

### Safety confirmation for H-3

`VITE_ALLOW_LOCAL_WRITES` remains absent from `web/.env`, verified before and
after. **No RPC is called from anywhere in H-3** — `confirmPost()` stops at the
confirmation and says posting is H-4 rather than inventing a substitute, and
no `confirm()`/`prompt()` bypass was introduced. No Supabase schema, RPC, RLS,
trigger, root `index.html`, GitHub or Vercel change was made; `index.html`
still carries only the previously recorded `manage_reference.p_id` diff.
Nothing was staged or committed, and every pre-existing working-tree change is
preserved. `M7-123` was not measured and remains OPEN.

---

## Milestone H-5 — partial LIVE evidence from the TEST project (2026-09-05)

**PHASE 7 IS NOT ACCEPTED.** This section records the FIRST real writes made
anywhere in the React migration. They were performed by Codex through the real
React UI against the isolated TEST Supabase project
`alkjjbaawmsirsfvqljm`, after Gate `G0` (the user visually confirmed the live
Request URL host in DevTools). Production, root `index.html`, the schema,
SQL/RPC, GitHub, Vercel and deployment were **untouched**. No cleanup was
performed: the `CODEX-P7-*` rows remain in TEST by design, and no audit row was
ever deleted.

This is **partial** live evidence. It covers the inbound `Satınalma` path, the
Qaimə № duplicate block, the duplicate-submit reality, item creation and the
`M5-55` entry point. It does **not** cover transfers, layers, İcarə/conditions,
anbardar scoping, the stale re-check or the broken-read refusals. The admin UI
initially showed **zero** audit rows, but the follow-up read-only TEST
inspection proved that **both movement audit rows exist**: live RLS policy
`p_audit_read` intentionally filtered them from that `admin` session under the
current policy. Only the **ordinary movement-INSERT consequence** of `M7-120`
is therefore live verified; its broader paths (`correct_document`'s explicit
`UPDATE` audit row and `log_icare_exposure`) remain **OPEN**. Module H stays
ONE acceptance boundary and remains **INCOMPLETE**.

No code was modified in H-5. No fixture was created. The automated suite is
unchanged from H-4 (**1649 tests / 93 files**); H-5 added no tests, because it
recorded live observations rather than changing behaviour.

### H-5 fixture limitation — why the remaining scenarios were untestable

> **RECONCILED 2026-09-09 — the fixture facts below are STALE; the wording is
> preserved as chronology.** Phase 8 built fixtures in this same TEST project.
> Live read-only re-inspection now shows layer accounting **active**
> (`version:36`), **125** movements, **2** `stock_conditions`, **4** users
> (including two active `anbardar`@`Test Anbar` and one `rehber`) and a second
> `type='anbar'` warehouse for transfers. Only **`partners` = 0 still holds.**
> Those Phase 7 rows are therefore no longer blocked by missing fixtures — they
> are open because **their own Phase 7 contracts have not been executed**, which
> is a different reason. Runnability is a precondition, not evidence: no Phase 7
> row is promoted from Phase 8 adjacency. Full comparison:
> `../audits/2026-09-09-phase7-fixture-precondition-reconciliation.md`.

A read-only live inspection of the TEST project found it holds **1 public user
(`admin`), 0 partners, 0 `stock_conditions`, 0 `stock_layer_settings` and only
5 movements**. The anbardar, İcarə, layer, valid-transfer and partial-page
failure scenarios therefore cannot be exercised there without separately
approved fixture creation. **No fixture was created and no database mutation
was performed.**

### What was executed, and what was observed

| Scenario | Result |
|---|---|
| `CODEX-P7-IN-1` — UI inbound `Satınalma` to Test Anbar | **Posted.** Item `0000001` balance 8 → 13; movement count 3 → 4 |
| `CODEX-P7-IN-1` reused with a DIFFERENT date | **Blocked before posting.** The UI named the existing owner document `SND-76074E451C`; **no new movement was created** |
| `CODEX-P7-DUP-1` — duplicate-confirm (double-click) test | **Exactly ONE document.** Item `0000002` balance 1, movement count 1; no second document appeared. Evidence for the client-side in-flight lock `M7-108`, **not** for `M7-107` |
| «Yeni mal yarat» through the React operation form | **Created.** Name `CODEX-P7-MAL-1`, code `0000006`, unit `ədəd`, category `Test kateqoriya`; reappeared immediately in item search |
| `M5-55` — Item Card → «Bu mal üzrə əməliyyat» | **Passed.** Opened the operation form prefilled with item `0000002`, its unit, and Test Anbar balance 1 |
| Audit jurnalı after both document writes and the item write | **ZERO matching records shown in the admin UI.** Corrected by follow-up live RLS inspection — see `M7-120` below |

### `M7-120` — corrected: the empty Audit jurnalı was RLS, not a missing audit row

After two successful document writes and one successful item write, the Audit
jurnalı showed **zero matching records** in the admin UI. A follow-up
read-only SELECT-only inspection of the TEST project (`alkjjbaawmsirsfvqljm`)
found:

- Audit rows for both H-5 movement documents (`SND-76074E451C`,
  `SND-D512FAAC59`) **do exist** in `public.audit_log`.
- Trigger `movements_audit` is **enabled** (`tgenabled = 'O'`).
- The live SELECT policy on `audit_log` is `p_audit_read`, `USING (my_role() =
  'rehber')`.
- The H-5 session's user has role `admin`, so the policy evaluated false for
  every row and PostgREST correctly returned an empty, error-free result.

The **ordinary movement-INSERT consequence** of `M7-120` (`movements_audit` →
`log_changes()`) is therefore **LIVE VERIFIED**: the zero-row result was caused
by the live RLS policy filtering the `admin` account, not by a missing
trigger, a React query/filter defect, or a write-path defect. The item write
correctly produced no audit row, because `items` carries no audit trigger.

`correct_document`'s explicit `UPDATE` audit row and `log_icare_exposure` were
**not** exercised in H-5 and remain unverified — this part of the row stays
OPEN. The client-side half of the row — that the React client writes no audit
row itself — is unchanged and still holds.

Whether an `admin` account being unable to read Audit jurnalı (as opposed to
only `rehber`) reflects the intended product behaviour, or whether production
carries the same or a different policy, is **not determined** by this check
and is a separate parity/product decision requiring its own read-only
production comparison.

### Explicitly NOT executed

- **The over-stock (`qty 99`) scenario was NOT approved and NOT run.** Codex's
  review established that the implementation would trim a non-layer line to the
  available quantity and might then post the trimmed document, so the earlier
  expectation of zero writes was wrong. **`M7-96` keeps its H-4 status
  unchanged** and its live recheck is not executed.
- **`M7-S2` / `M7-S3`** — the deliberately broken-read (Network-blocking)
  checks were not executed. Both keep their H-2 `CODE VERIFIED` status.
- **Transfer, layer, İcarə/condition and anbardar scenarios** remain blocked by
  the documented TEST fixture limitations (see `test-environment/README.md`),
  not by choice of scope. — **Reconciled 2026-09-09: the fixture blocker no
  longer exists** (Phase 8 built these fixtures; `partners` = 0 is the only
  survivor). These rows stay open because their Phase 7 contracts were not
  executed, not because they cannot be run. Not promoted.
- `correct_document`, partner/condition/warehouse/user/role creation, direct
  database writes, and any cleanup, deletion, cancellation or correction were
  outside the approved subset and were not performed.

### Rows promoted by this evidence — and only these

`M5-55`, `M7-21`+`M7-21a`, `M7-84`, `M7-89`, `M7-91`, `M7-104` and `M7-108`
are promoted to `LIVE VERIFIED` **for the inbound `Satınalma` path only**, each
row's note naming what was actually observed. **`M7-107` is NOT promoted**: the
double-click result is evidence for the client-side in-flight lock (`M7-108`),
not for the server's idempotency reach, and H-5 proved neither its presence nor
its absence. `M7-120` is corrected to `LIVE VERIFIED` for the ordinary
movement-INSERT consequence only, following a follow-up read-only RLS
inspection in TEST; the `correct_document`/İcarə half of the row stays OPEN.
**Every other row keeps the status H-4 left it with.** No row is `ACCEPTED`.

---

## Module H — Yeni əməliyyat (Phase 7)

### Screen shell, tabs and header fields

| # | Function | Old behaviour | Old ref | Planned React ref | Planned tests | Status |
|---|---|---|---|---|---|---|
| M7-01 | Screen shell | `#p-op`: heading, subtitle, two-column grid, form card, lines card, item-state card | 295-318 | `pages/NewOperationPage.tsx` | shell renders all three cards | `CODE VERIFIED` (H-2) — `NewOperationPage` renders the heading, subtitle, two-column grid, the form card, the lines card and the item-state card; page tests pin all three cards |
| M7-02 | Nav entry | Rail entry «Yeni əməliyyat» in the «Əməliyyat» group, no role gate on the link itself | 250-252 | `App.tsx` | entry renders for admin and non-admin | `CODE VERIFIED` (H-4) — the «Yeni əməliyyat» entry renders under the «Əməliyyat» group above «Bazalar», in the original rail order; tested for admin, anbardar and rehber, and the link carries no role gate |
| M7-03 | Three tabs | `#op-seg`: Mədaxil / Məxaric / Yerdəyişmə; switching invalidates the request key and re-renders the form | 299-300, 3209 | `store/operation.store.ts` + page | tab switch clears request key | `CODE VERIFIED` (H-2) — store `setKind` switches the tab and invalidates the request key; both pinned in `operation.store.test.ts` |
| M7-04 | Type lists per tab | `OP_TYPES` — in: Satınalma/Qaytarma/İcarə/Əvvələ qalıq · out: Sahəyə/Silinmə/Satış/Qaytarma · mv: Yerdəyişmə. SINGLE source for form, validation and line editor | 3208 | `lib/opTypes.ts` | each tab offers exactly its list | `CODE VERIFIED` (H-1) |
| M7-05 | Header capture | `captureOpHeader()` snapshots every present field before a re-render; restored only when `H.kind === k` | 3227-3241, 3243 | store | switching tab and back does NOT restore the other tab's header | `CODE VERIFIED` (H-2) — per-kind header capture in `setKind`/`setHeaderField`; the «switching away and back does NOT restore the other tab's header» test is the row's own planned test |
| M7-06 | Date field | Defaults to `today()`; empty value falls back to `today()` at line build | 3262, 3624 | `components/operation/OperationForm.tsx` | empty date → today on the built line | `CODE VERIFIED` (H-2 remediation, audit A10 — the date now defaults to `today()` in the store-backed header, not merely at line build; tested from a genuinely empty header) |
| M7-07 | Warehouse picker (non-mv) | `allowedWarehouses()`; anbardar sees only their own | 3271, 715-718 | reuses `lib/warehouseScope.ts` | anbardar sees one option | `CODE VERIFIED` (H-2) — the non-mv warehouse select consumes `allowedWarehouses()`; the anbardar-sees-one-option test is present |
| M7-08 | Route pickers (mv) | Source = `sourceWarehouses()`; dest = `DB.transferDests` from `get_transfer_destinations()`, falling back to `DB.whs`; default dest = first ≠ `ME.wh`. **`D-H1` (Q3): for an anbardar the source is narrowed to their OWN warehouse and «Ofis» is removed from the destination list, matching the live server contract. Admin is unchanged.** | 3267-3268, 720-723, 1006-1011 | `api/transferDestinations.api.ts` + `lib/warehouseScope.ts` + form | RPC failure falls back to warehouse list; anbardar narrowed AND admin unchanged, both pinned | `CODE VERIFIED` (H-2 remediation, audit A10 — source/destination render from `transferSourceWarehouses`/`transferDestWarehouses` (`D-H1`), the RPC-failure fallback is pinned in the store suite, and the «default dest = first ≠ `ME.wh`» half is now implemented and tested) |
| M7-09 | Counterparty field | `in` → «Kontragent» from active `partners`; `out` → «Təhvil alan / layihə» = `Sahə üzrə məsul şəxs` + non-anbar locations + anbar locations; `mv` → the warehouse list. Hidden reference values are excluded | 3218-3226, 3272 | `lib/opTypes.ts` + `api/partners.api.ts` | hidden partner absent from options | `CODE VERIFIED` (H-2) — the counterparty field renders from `partnerOptions()`; hidden-value exclusion carried by the `lib/opTypes` tests |
| M7-10 | Counterparty swap on «Qaytarma» (out) | An out «Qaytarma» returns goods to their OWNER, so the list switches to `partnerOptions('in')`; the current value is kept if still present, else the first option | 3341-3356 | form | switching to Qaytarma swaps the list; a still-valid value survives | `CODE VERIFIED` (H-2 remediation, audit A03) |
| M7-11 | «Silinmə» pins the counterparty | Forced to `Sahə üzrə məsul şəxs` on every type change | 3357 | form | selecting Silinmə pins the value | `CODE VERIFIED` (H-2 remediation, audit A10 — the pin is now written into the header on every type change, as `syncSil()` does, not only shown as a single-entry list; tested from a real type transition) |
| M7-12 | Channel / contract / Qaimə (in) | Three fields only on `in`: `o-ch` (channel list + empty option), `o-ct`, `o-iv` | 3288-3291 | form | absent on out and mv | `CODE VERIFIED` (H-2) — the three `in`-only fields render with the channel select's empty option, and their absence on out/mv is tested |
| M7-13 | Qaimə № (out) | Single field with the «əl ilə yazılır» hint | 3292-3293 | form | present on out, hint text exact | `CODE VERIFIED` (H-3) — the out and mv hints are now distinct and the mv wording states that the number is written to both legs; tested |
| M7-14 | Qaimə № (mv) | Single field, own hint, written to BOTH legs | 3294-3295 | form + payload | both legs carry the same invoice | `LIVE VERIFIED` — live TEST transfer `SND-3550711E4C` has two legs carrying identical invoice `CODEX-P8-TRANSFER-20260908`; SQL and payload tests independently pin the same field on both INSERTs. Final Codex audit 2026-09-10. |
| M7-15 | Note field | Free text, trimmed into the line | 3296, 3630 | form | trimmed | `CODE VERIFIED` (H-2) — the note field renders and is carried into the built line |
| M7-16 | Channel options | From `DB.refs.channels` when the directory is ready; otherwise `DEFAULT_CHANNELS` ∪ channels observed in operational movements | 3211-3217 | `lib/opTypes.ts` + existing `referenceValues.api.ts` | ready vs not-ready both covered | `CODE VERIFIED` — full-form failure regression now forces `ready=false` and proves the rendered select contains both defaults and an operationally observed channel; ready-directory behaviour remains pinned. Final Codex audit 2026-09-10. |
| M7-17 | Price field | Only on `in`; seeded from `items.price` when empty at pick time | 3286, 3396 | form | seeded once, not overwritten | `CODE VERIFIED` (H-2) — price renders on `in` only and is seeded from `items.price` once when empty, in both the click and `prefill` paths |
| M7-18 | Unit field | Read-only, from the nomenclature | 3285, 3395 | form | readOnly | `LIVE VERIFIED` (2026-09-09, TEST real UI) — the unit tracked the nomenclature across a falsifiable three-item control (`0000001` ədəd → `0000002` kg → `0000003` metr), so it is sourced from the catalogue, not stale or hardcoded. Read-only holds STRUCTURALLY and more strongly than legacy: the port renders the unit as a non-editable `SPAN` (`contentEditable=false`), and the `Miqdar` label contains exactly ONE input — the quantity — so no unit input exists to edit. Casing is a CSS transform, not a data difference. Audit: `../audits/2026-09-09-phase7-m7-18-m7-22-m7-116-readonly-ui-sweep.md` |

### Item selection

| # | Function | Old behaviour | Old ref | Planned React ref | Planned tests | Status |
|---|---|---|---|---|---|---|
| M7-19 | Combobox search | Min 2 chars, 160 ms debounce, max 12 hits, name (case-insensitive) or code (substring, case-sensitive) | 3305-3322, 3333 | `components/operation/OperationForm.tsx` | 1-char query shows nothing | `CODE VERIFIED` (H-2 remediation, audit A05 — debounce and unconditional code substring match ported and tested with fake timers) |
| M7-20 | Outbound stock filter | On `out`/`mv` only the codes with positive available stock in the SELECTED warehouse are offered (`bulkWriteOffRows`); `in` has NO filter | 3311-3316 | `lib/bulkWriteOff.ts` | an item absent from the warehouse is not offered on out, IS offered on in | `CODE VERIFIED` (H-2) |
| M7-21 | Empty-result texts | With a stock filter: «"<anbar>" anbarında bu axtarışa uyğun qalıq yoxdur.»; without: «Tapılmadı.» + the «Yeni mal yarat →» link when `item.add` | 3318-3322 | form | both texts, and the link hidden without the permission | `LIVE VERIFIED` (H-5, create path only) — «Yeni mal yarat» created item `CODEX-P7-MAL-1`, code `0000006`, unit `ədəd`, category `Test kateqoriya` live through the React operation form, and it reappeared immediately in item search. The empty-result TEXTS and the `item.add` gate remain `CODE VERIFIED` |
| M7-21a | «Yeni mal yarat» click | `e.preventDefault()`, hide the result list, then `editItem(null, inp.value)` — opens the create dialog with the **current search text, untrimmed**, as the preset name | 3325, 5565, 5576 | form + `components/nomenclature/ItemFormDialog.tsx` | the typed text arrives in the name field verbatim | `LIVE VERIFIED` (H-5) — the live click opened the create dialog and the preset name `CODEX-P7-MAL-1` carried through to a committed item; the untrimmed-text edge case remains pinned by test |
| M7-21b | Dialog reuse, not reimplementation | The Phase 5 `ItemFormDialog` is reused unchanged apart from ONE additive optional prop `presetName?: string` (default `''`), consumed only when `item === null`. Legacy ignores `presetName` while editing, so the prop must too | 5565-5576 | `ItemFormDialog.tsx` | editing ignores `presetName`; every existing call site and test unaffected | `CODE VERIFIED` (H-3) — one additive optional prop, consumed only when `item === null`; the ignored-on-edit test was verified to FAIL against seeding on edit, and a test pins the existing call site unaffected |
| M7-21c | Permission and write guard | `item.add` gates the link (3320) and `need()` gates the dialog (5566); the localhost `blockedReason('item.create')` guard already inside the dialog is the only guard — Phase 7 adds no second gate that could disagree | 3320, 5566, existing dialog | reused dialog | link hidden without `item.add`; localhost blocks without the opt-in | `CODE VERIFIED` (H-3) — the link is gated on `item.add` and the localhost `blockedReason` guard inside the reused dialog is the only write guard; Phase 7 adds no second gate |
| M7-21d | Success path | On save the item list reloads, the dialog closes, and the operation form keeps its header, draft lines and search text; the new item becomes selectable in the combobox | 5628-5636 + `onSaved` | store + page | reload happens; draft lines survive; new item findable | `CODE VERIFIED` (H-3) — a successful save reloads items, closes the dialog and leaves header, draft lines and search text intact; tested |
| M7-21e | Refusal / cancel path | A failed save keeps the dialog open with the input intact (the dialog's existing never-close-on-failure contract); the operation form's state is untouched in both refusal and plain cancel | 5628-5630 | reused dialog + page | refusal and cancel both leave header, lines and pick unchanged | `CODE VERIFIED` (H-3) — refusal keeps the dialog open with input intact (the reused dialog’s own contract); cancel leaves the operation form untouched; tested |
| M7-21f | No active units | With no active unit in the directory the dialog refuses with «Soraqçalarda aktiv ölçü vahidi yoxdur — əvvəlcə əlavə edin» instead of opening a form | 5573, dialog 126-134 | reused dialog | refusal still fires from this entry point | `CODE VERIFIED` (H-3) — the no-active-units refusal still fires from this entry point; tested |
| M7-22 | Pick item | Fills name, unit, selection hint, price (if empty), balance panel and condition split; focuses quantity unless `keep` or a split exists | 3390-3401 | store + form | focus rule respected | `LIVE VERIFIED` (2026-09-09, TEST real UI — complete after the focus-parity remediation) — all six sub-assertions hold. Name, unit, selection hint, **price only when empty** (seeded 10 from `0000001`, then STAYED 10 for items priced 12.5 and 7.25), **balance panel** (the true live `Test Anbar 8.00`) and **condition split** from live `stock_conditions` (`İCARƏDƏ (MAX 0.01)`, quantity read-only) were evidenced 2026-09-09. The **focus rule is now implemented and proved in BOTH branches**: a normal pick moves focus `BODY` → `INPUT[number] label="Miqdar"`, and a pick on a split item leaves focus off quantity while it stays read-only. Implemented with element refs + a transition-scoped one-shot flag (no global selectors), so an ordinary rerender of an existing pick steals nothing (legacy `keep=true`), and the M5-55 prefill arms the same path. 10 focused tests; **4 of them verified to FAIL against the pre-fix code**. Audit: `../audits/2026-09-09-phase7-m7-22-m7-39-focus-parity-remediation.md` |
| M7-23 | Clear pick on source change | Changing `o-wh` (out/mv) clears the picked item, quantity, unit, split and balance panel — because the stock filter now describes another warehouse. `in` keeps the selection | 3358, 3367, 3379-3389 | store | warehouse change clears on out/mv, not on in | `CODE VERIFIED` (H-2 remediation, audit A02 — quantity is now cleared together with the pick; both the out and in branches are directly tested) |
| M7-24 | Item state panel | Balances for the code across ALL warehouses from `IX.bal`; deliberately ignores pending draft lines; negative balance styled `neg`; empty text «Bu mal üzrə hələ hərəkət yoxdur.» | 3444-3451 | `components/operation/ItemStatePanel.tsx` | pending lines do NOT change the panel | `CODE VERIFIED` (H-2) — `ItemStatePanel`: all-warehouse balances for the picked code, pending lines ignored by construction, negative styling and the empty text, all tested |
### Condition split (tiplərə görə bölgü)

| # | Function | Old behaviour | Old ref | Planned React ref | Planned tests | Status |
|---|---|---|---|---|---|---|
| M7-25 | Buckets | `condBuckets` = per-marker qty minus draft-pending, each clamped to available; `normal` = available − Σ markers, never negative; `marked` when any bucket > 1e-9 | 2087-2101 | `lib/condSplit.ts` | clamping and non-negative normal | `CODE VERIFIED` (H-1) |
| M7-26 | Pending buckets | Draft lines on the same warehouse+code consume buckets, so the same «İcarədə 3» cannot be taken twice | 2102-2110 | `lib/condSplit.ts` | second draft line sees the reduced bucket | `CODE VERIFIED` (H-1) |
| M7-27 | Split block in the single form | Only for out/mv with a marked item; quantity becomes read-only and is the SUM of the buckets; each input clamps to its bucket max with a toast | 3413-3442 | `components/operation/OperationForm.tsx` | qty readOnly while split is shown; over-max clamps | `CODE VERIFIED` (H-2) — the split block renders for out/mv on a marked item, quantity is read-only and is the bucket sum, and each input clamps to its bucket max (the clamp is applied on input; the legacy TOAST on clamp is not surfaced — noted under M7-30's H-3 work, not claimed here) |
| M7-28 | Split validation | `condSplitCheck`: no negative, none over its bucket, sum > 0; exact messages | 2134-2145 | `lib/condSplit.ts` | all three messages | `CODE VERIFIED` (H-1) |
| M7-29 | Split payload | Only markers > 0; `normal` deliberately NOT sent — the server derives it | 2121-2128 | `lib/condSplit.ts` | `normal` never in the payload | `CODE VERIFIED` (H-1) |
| M7-30 | Split readiness gate | With any split present and `DB.splitReady` false, posting is blocked with `SPLIT_UNSUPPORTED_MSG`. Live `movement_split_supported()` returns TRUE, so this is a fallback path | 2129-2133, 4799, 4835 | `lib/condSplit.ts` + store | blocked when the probe fails | `CODE VERIFIED` — exact page/store regression forces the probe false, carries a split, receives `refused`, and proves no post RPC runs. Live TRUE probe remains established. Final Codex audit 2026-09-10. |
| M7-31 | Split cut mismatch | If validation lowers the quantity while a split exists, the line is REJECTED, not silently trimmed | 3648-3651, 4471-4475, 4541-4545 | `lib/opLineValidation.ts` + store | rejection message exact | `CODE VERIFIED` (H-3) — the REJECT-not-trim decision now lives in both callers: `OperationForm.onAddLine` (H-2) and `EditLineDialog.save` (H-3). The dialog test was verified to FAIL against applying the clamp blindly |

### Line validation — the single source

| # | Function | Old behaviour | Old ref | Planned React ref | Planned tests | Status |
|---|---|---|---|---|---|---|
| M7-32 | `validateOpLine` order | item → qty>0 → type valid for tab → route/warehouse rights → initial-balance admin gate → stock. Both `addLine` and `editLine` call THIS, there is no second validator | 3568-3616 | `lib/opLineValidation.ts` | the order itself is asserted | `CODE VERIFIED` (H-1) |
| M7-33 | Route rules (mv) | Source ∈ `sourceWarehouses()`, dest ∈ `DB.transferDests`, source ≠ dest; three distinct messages, codes `route`/`same-wh`. Under `D-H1` an anbardar's source set is their own warehouse only and «Ofis» is not a destination, so the validator agrees with the narrowed picker AND with the server | 3580-3590 | `lib/opLineValidation.ts` | each message; anbardar route refusals match the server rule | `CODE VERIFIED` (H-1) |
| M7-34 | Warehouse right (non-mv) | Warehouse ∈ `allowedWarehouses()`, code `wh` | 3591-3592 | `lib/opLineValidation.ts` | anbardar refused elsewhere | `CODE VERIFIED` (H-1) |
| M7-35 | Initial-balance admin gate | `isInitialBalanceLine` (type «Əvvələ qalıq» AND partner OR channel matching «Anbar qalığı»); non-admin refused with `INIT_BAL_ADMIN_ONLY_MSG`, code `initbal`. **See H-D2: client-only in production** | 1926-1929, 3592-3594 | `lib/opLineValidation.ts` | both partner and channel trigger it | `CODE VERIFIED` (H-1) |
| M7-36 | Stock check | available = balance + `editRestoreQty` − other pending same-warehouse+code non-`in` lines (`skipIndex` excludes the edited one); ≤0 → refuse (`stock`); over → clamp to max and return `warn` | 3596-3615 | `lib/opLineValidation.ts` | clamp text exact; skipIndex honoured | `CODE VERIFIED` (H-1) |
| M7-37 | Edit-mode restore | In edit mode the original document's outbound quantities are added back once per warehouse+code, because cancellation only happens server-side inside the correction transaction | 3512-3515, 4715-4719 | `lib/opLineValidation.ts` | restore applied once, not per line | `CODE VERIFIED` (H-1) |

### Adding, editing and removing draft lines

| # | Function | Old behaviour | Old ref | Planned React ref | Planned tests | Status |
|---|---|---|---|---|---|---|
| M7-38 | `addLine` | Builds the line from the form, runs split check then `validateOpLine`, applies the clamp, shows `warn`; routes to the layer dialog when `DB.layerActive` and the line is not `in` | 3617-3660 | store | layer routing only when active and non-in | `CODE VERIFIED` with scoped LIVE evidence — live TEST covers active-layer routing/read failure, negative split refusal and inbound non-routing; exact component regression covers the remaining non-split clamp/warn and inactive routing branch. Layer deactivation was not performed. Final Codex audit 2026-09-10. |
| M7-39 | `commitDraftLine` | Pushes the line, invalidates the request key, clears pick/qty/unit/split/price, re-renders and refocuses the item input | 3659-3670 | store | request key cleared | `LIVE VERIFIED` — independent Codex acceptance, 2026-09-10. Field clearing + refocus are live on ordinary and confirmed-layer commits. The first K2≠K_MID request-key attempt was rejected and remains withdrawn. The corrected run used two simultaneously postable outbound lines: line A remained standing, K1 repeated unchanged as the stability control, headers stayed byte-identical, no remove/edit/tab/clear/restore/bulk action occurred, line B committed through real `addLineRaw`, and the next intercepted post carried non-empty K2≠K1. Static review confirms line selection/local quantity/layer reads do not invalidate the key; line B's commit was the only invalidator between captures. The TEST fixture was closed net-zero and immutable history retained. Audits: `../audits/2026-09-10-phase7-m7-39-field-clearing-codex-audit.md`, `../audits/2026-09-10-phase7-m7-39-request-key-codex-audit.md`, `../audits/2026-09-10-phase7-m7-39-request-key-correction.md`, `../audits/2026-09-10-phase7-m7-39-correction-m7-38-split-codex-audit.md`. |
| M7-40 | Lines table | Columns Mal / Marşrut / Miqdar / Qiymət / Məbləğ / actions; route text differs per kind; layered lines show `priceVariants` joined by « / », others `pr`; missing amount is `—` | 3717-3752 | `components/operation/DraftLinesPanel.tsx` | all three route forms | `CODE VERIFIED` — all route forms and cells pinned. Final gap fixed 2026-09-10: confirmed layer selections retain distinct `priceVariants`; layered draft rows render `a / b` rather than blended `pr`, with backward compatibility for older drafts. |
| M7-41 | Lines counter | «N sətir · <money> [· N qiymətsiz]» | 3720-3724 | panel | with and without priceless lines | `CODE VERIFIED` (H-2) |
| M7-42 | Post button state | Disabled without lines or without `mv.add`; label «Sənədi qeyd et» / «Düzəlişi qeyd et» in edit mode | 3754-3756 | panel | rehber sees it disabled | `CODE VERIFIED` (H-2) — the post button's disabled state comes from `canPost` and the edit-mode label swap is tested |
| M7-43 | Remove line | Splices, invalidates the request key, re-renders | 3758-3763 | store | key invalidated | `CODE VERIFIED` (H-2) — `removeLine` splices and invalidates the request key; tested in the store and through the panel |
| M7-44 | Clear lines | Confirmation modal; on confirm clears lines, request key, restore stamp and the stored draft | 4562-4572 | `components/operation/ClearLinesDialog.tsx` | no confirm → nothing cleared | `CODE VERIFIED` (H-3) — `ClearLinesDialog`: no confirm clears nothing, confirming clears lines/key/stamp/draft; all three tested |
| M7-45 | Edit line dialog | Full field editor on a WORKING COPY (`EL.d`); the original is replaced only on a successful save; cancel changes nothing | 3863-3958 | `components/operation/EditLineDialog.tsx` | cancel leaves the line untouched | `CODE VERIFIED` (H-3) — `EditLineDialog` edits a WORKING COPY; cancel-after-edits is proven to leave the line untouched |
| M7-46 | Edit line — layered lines refused | A line with `allocations` cannot be edited; toast tells the user to delete and re-add | 3865-3869 | store | toast text exact | `CODE VERIFIED` (H-3) — a layered line is refused with the toast and NO dialog opens; tested at page level |
| M7-47 | Edit line — option preservation | `optsWith()` keeps a value that is no longer in its list (e.g. later hidden in Soraqçalar) | 3860-3862 | `lib/opTypes.ts` | hidden current value still selectable | `CODE VERIFIED` (H-1) |
| M7-48 | Edit line — tab differences | `w2` only on mv; counterparty only off mv; channel+contract only on in; NO price on mv; `kind` itself never changes | 3877-3893 | dialog | each field's presence per kind | `CODE VERIFIED` (H-3) — `w2` only on mv, counterparty only off mv, channel/contract/price only on in, and `kind` never changes; each pinned |
| M7-49 | Edit line — save | `captureEditLine` then `validateOpLine({skipIndex})`; invalid stays in the dialog with the reason; on success name/unit refresh from the nomenclature, request key invalidated, totals and balance panel re-render, warn/ok toast | 3959-3992 | dialog + store | invalid edit does not close the dialog | `CODE VERIFIED` (H-3) — save runs `validateOpLine({skipIndex})`, an invalid edit keeps the dialog OPEN with the reason, and name/unit refresh from the nomenclature; tested |
| M7-50 | Edit line — mv counterparty | On mv the counterparty is forced to the destination warehouse | 3947-3949 | dialog | `p === w2` after save | `CODE VERIFIED` (H-3) — on mv the counterparty is forced to the destination; `p === w2` after changing the destination is pinned |

### Local draft persistence

| # | Function | Old behaviour | Old ref | Planned React ref | Planned tests | Status |
|---|---|---|---|---|---|---|
| M7-51 | Save draft | Per-user key `anbar_op_draft_<id>`; v1; stores kind, lines, header and request key; removed when empty or over 2000 lines; storage failures swallowed | 3796-3809 | `lib/opDraft.ts` + store | quota error does not break the screen | `CODE VERIFIED` (H-2 remediation, audits A01/A08 — the save effect is gated until the boot restore attempt completes, AND a failed core load neither restores nor arms saving, so a transient read failure cannot delete the draft; both pinned by page- and store-level tests) |
| M7-52 | Edit mode is never drafted | In edit mode the draft is CLEARED, so a restored session cannot re-post the lines as a new document (duplicate) | 3791-3798 | `lib/opDraft.ts` | edit mode clears rather than writes | `CODE VERIFIED` (H-2) |
| M7-53 | Restore draft | Only when logged in and lines are empty; rejects wrong version, malformed JSON, empty lines and anything older than 7 days | 3809-3821 | `lib/opDraft.ts` | each rejection case | `CODE VERIFIED` (H-2 remediation, audits A01/A08 — a page-level test with a real stored draft proves first mount restores it without deleting it first, and that a failed initial load leaves the stored payload byte-for-byte intact for a later retry) |
| M7-54 | Restore permission re-filter | Lines whose warehouse is not in `allowedWarehouses() ∪ sourceWarehouses()` are dropped; if none survive the draft is cleared; the toast reports how many were dropped | 3817-3833 | `lib/opDraft.ts` | dropped count in the toast | `CODE VERIFIED` (H-2 remediation, audit A07 — the page now surfaces the exact restored/dropped toast from `restoreDraftOnBoot()`'s return value, tested) |
| M7-55 | Restore banner | «bu sətirlər <stamp> tarixli … qaralamadan bərpa edildi» with an «Anladım» button; `draftStamp` formats dd.mm.yyyy hh:mm | 3733-3737, 3782-3787 | `components/operation/DraftLinesPanel.tsx` | stamp format | `CODE VERIFIED` (H-2) |

### Bulk «Malları seç» dialog

| # | Function | Old behaviour | Old ref | Planned React ref | Planned tests | Status |
|---|---|---|---|---|---|---|
| M7-56 | Entry points | `out` + type «Silinmə» (and NOT edit mode) replaces the item/qty block with «Malları seç»; `mv` (and NOT edit mode) shows it ALONGSIDE «Sətri əlavə et» | 3252-3260, 3297-3301 | form | both layouts | `CODE VERIFIED` (H-2) — both `isWoOut` and `isMvPick` layouts render their affordance at the right times and in neither case in edit mode, all tested; the bulk DIALOG itself is the separate `M7-58`…`M7-70` family, untouched by H-2 |
| M7-57 | Open guards | `mv.add` required; on out the type must be «Silinmə»; refused in edit mode; a warehouse must be chosen and be allowed; on mv a destination ≠ source is required | 4093-4119 | store | each refusal toast | `CODE VERIFIED` (H-3) — every open guard is implemented in `onOpenBulk` (permission, edit mode, warehouse chosen, warehouse allowed, and on mv a destination ≠ source), each with its own refusal message |
| M7-58 | Candidate rows | Positive balance in the chosen warehouse, present in the nomenclature, minus pending draft out/mv lines; sorted by name with `localeCompare(…, 'az')` | 4034-4052 | `lib/bulkWriteOff.ts` | pending subtraction visible | `CODE VERIFIED` (H-1) |
| M7-59 | Search | Code or name, case-insensitive; code compared as text so leading zeroes survive | 4054-4060 | `lib/bulkWriteOff.ts` | `0000001` findable | `CODE VERIFIED` (H-1) |
| M7-60 | Select row default | Takes the whole available quantity; for a marked item each bucket is filled to its own max and the total is their sum. Select-all uses the SAME function | 4159-4173, 4147-4152 | `lib/bulkWriteOff.ts` | select-all fills splits too | `CODE VERIFIED` (H-3) — individual selection and select-all both call `bwSelectRow()`; a marked item’s buckets are each filled to their own max and the total is their sum; tested |
| M7-61 | Quantity input | Clamps to available with a toast; does NOT re-render the list (focus retention); resets `icareOk` and the stored lot/value | 4243-4256 | `components/operation/BulkPickDialog.tsx` | focus kept; icareOk reset | `CODE VERIFIED` (H-3) — the quantity clamps to availability and the row list is NOT rebuilt on edit (rows are supplied by the page, preserving focus) |
| M7-62 | Bucket inputs | Each clamps to its own bucket; total recomputed from the sum; same resets | 4257-4278 | dialog | over-bucket clamps with the labelled toast | `CODE VERIFIED` (H-3) — each bucket clamps to its own max and the row total is recomputed from the sum; tested |
| M7-63 | Summary and readiness | `bulkWriteOffSummary` counts n/qty/amount and lists `bad` rows (missing, zero, over balance, missing split, invalid split, missing lot, lot≠qty, missing override reason); post button disabled unless n>0 and no bad rows | 4062-4092, 4293-4302 | `lib/bulkWriteOff.ts` | each `bad` reason | `CODE VERIFIED` (H-3) — `bulkWriteOffSummary()` drives the counters and the post button is disabled unless `n > 0` with no bad rows; the layered missing-lot reason is pinned |
| M7-64 | Counters | «N mövqe göstərilir · N seçilib» and the footer «N sətir · N vahid · money» / «Silinəcək mal seçin» | 4287-4292 | dialog | both states | `CODE VERIFIED` (H-3) — both counter states («N mövqe · N seçilib» and the footer) are tested |
| M7-65 | Select-all checkbox state | Checked only when every filtered row is selected | 4285-4286 | dialog | partial selection unchecks it | `CODE VERIFIED` (H-3) — checked only when every filtered row is selected; the partial-selection case is pinned |
| M7-66 | Apply — mv mode | Builds mv lines (counterparty = destination), validates each with `validateOpLine`, all-or-nothing: on any failure `OP.lines` is truncated back to `base` and NOTHING is added | 4429-4489 | store | one bad row adds zero lines | `CODE VERIFIED` — two exact full-page regressions prove a bad row adds zero lines and caller revalidation cannot partially append. |
| M7-67 | Apply — wo mode | Same all-or-nothing shape, type «Silinmə», counterparty from the form, price from the row/nomenclature (or the layer amount ÷ qty when layers are active) | 4491-4557 | store | rollback identical to mv | `CODE VERIFIED` — same all-or-nothing regressions cover wo; layered bulk test proves source amount ÷ quantity plus allocations/revision/override and retained price variants. |
| M7-68 | Apply writes NOTHING to Supabase | Both modes only append draft lines; the real write is the main «Sənədi qeyd et». Any claim that group write-off posts directly is stale (`<<2026-08-24 fix>>`) | 4494-4498 | store | no RPC called on apply | `CODE VERIFIED` (H-3) — apply only appends draft lines; no RPC exists in this milestone at all, and the page test proves the store’s lines change while nothing is written |
| M7-69 | İcarə gate inside bulk | Before applying, the selection is probed with `icareExposedLines`; on exposure the confirmation dialog runs and the reason is appended to the SHARED note, then the apply re-runs | 4404-4428 | store | reason lands in the shared note once | `CODE VERIFIED` — full-page regression drives the real bulk İcarə confirmation and proves the reason lands in the shared note exactly once before commit. |
| M7-70 | Shared note | «Ümumi qeyd» is written to every produced line | 4141, 4451, 4530 | dialog + store | all lines carry it | `CODE VERIFIED` (H-3) — the shared note is carried to the caller and written to every produced line; tested |

### Stock layers (partiya)

| # | Function | Old behaviour | Old ref | Planned React ref | Planned tests | Status |
|---|---|---|---|---|---|---|
| M7-71 | Capability probe | `stock_layers_supported()` sets `layerReady`/`layerActive`/`layerVersion`; failure leaves the pre-layer flow working | 949-958 | `api/stockLayers.api.ts` | probe failure → inactive, no crash | `CODE VERIFIED` (H-1) |
| M7-72 | Single-line layer dialog | On `addLine` with layers active and a non-`in` line: `get_stock_layers`, pick layers, sum must equal the line quantity within 0.00005 | 3672-3716 | `components/operation/LayerPickDialog.tsx` | mismatch refused | `CODE VERIFIED` (H-3) — `LayerPickDialog`: `get_stock_layers` is read before opening, a failed read opens nothing and adds no line, and the sum must equal the line quantity within 0.00005 (gate implemented twice); tested |
| M7-73 | Admin final amount | Only for admin on `out`: optional final amount matching `^\d{1,16}(\.\d{1,2})?$`, and a reason is MANDATORY whenever it is set | 3694-3700, 4395-4400 | dialog | amount without reason refused | `CODE VERIFIED` (H-3) — the admin final-amount field renders on `out` only; an amount without a reason and a malformed amount are both refused; tested |
| M7-74 | Layer price display | `pr` = shown amount ÷ qty (4 dp); `priceVariants` lists the DISTINCT source prices sorted — no average is displayed | 3702-3707 | dialog + panel | two prices render as «a / b ₼» | `CODE VERIFIED` (H-3) — distinct source prices render joined by « / » with no average, and a null `sourceAmount` renders «—» rather than 0; both tested |
| M7-75 | Bulk layer dialog | Per-code layer selection reusing the stored allocation when the revision still matches; «Geri» returns to the bulk list | 4318-4403 | dialog | stale revision drops the stored selection | `CODE VERIFIED` (H-3) — the bulk entry point reuses the SAME dialog and «Geri» returns to the list rather than discarding the selection; tested |
| M7-76 | Layer source labels | `legacy_unresolved` → «Köhnə qalıq · mənbə dəqiqləşməyib», `legacy_adjustment` → «Tarixi bərpa», `transfer` → «Yerdəyişmə partiyası», else «Mədaxil partiyası» | 4404-4409 | `lib/layerAllocation.ts` | all four | `CODE VERIFIED` (H-1) |
| M7-77 | Unknown-price layers | A layer with `price_status === 'unknown'` contributes quantity but no amount; `sourceAmount` becomes null when any unknown quantity is present | 3689-3691, 4373-4380 | `lib/layerAllocation.ts` | null sourceAmount propagates as `—` | `CODE VERIFIED` (H-1) |

### İcarə exposure

| # | Function | Old behaviour | Old ref | Planned React ref | Planned tests | Status |
|---|---|---|---|---|---|---|
| M7-78 | Exposure maths | free = balance − icare − alreadyTaken; exposure = max(round((qty − free)×100)/100, 0) | 3491-3498 | `lib/icareExposure.ts` | rounding pinned | `CODE VERIFIED` (H-1) |
| M7-79 | Which lines count | `in` lines and «Qaytarma» are excluded — returning rented goods is what the İcarədə figure is for; on mv the SOURCE warehouse is used | 3499-3512 | `lib/icareExposure.ts` | Qaytarma excluded; mv uses `w` not `w2` | `CODE VERIFIED` (H-1) |
| M7-80 | Cumulative take | Several lines on the same warehouse+code consume free stock cumulatively | 3502-3509 | `lib/icareExposure.ts` | second line exposed, first not | `CODE VERIFIED` (H-1) |
| M7-81 | Confirmation dialog | Table of exposed lines; the reason is MANDATORY (button disabled until non-empty); the reason is appended to each exposed line's note | 4574-4610 | `components/operation/IcareConfirmDialog.tsx` | empty reason keeps the button disabled | `CODE VERIFIED` (H-3) — the exposed-line table renders and the reason is mandatory (button disabled AND handler refusal); whitespace-only is treated as empty |
| M7-82 | Marker idempotence | The previous marker is stripped before re-appending, because the user can confirm İcarə and then cancel the post dialog | 4676-4682, 3484-3486 | `lib/icareExposure.ts` | two rounds produce ONE marker | `CODE VERIFIED` (H-1) |
| M7-83 | Runs for edit mode too | The İcarə check precedes the `editDoc` branch — raising an outbound quantity during a correction can touch rented stock | 4631-4641 | store | edit-mode post triggers it | `CODE VERIFIED` — exact edit-mode regression proves İcarə confirmation runs before `correct_document`. |

### Qaimə № conflict

| # | Function | Old behaviour | Old ref | Planned React ref | Planned tests | Status |
|---|---|---|---|---|---|---|
| M7-84 | Rule | The same Qaimə № may repeat ONLY when both date and counterparty match — i.e. a continuation of the same delivery. Empty invoice is never checked | 3517-3560 | `lib/qaimeConflict.ts` | empty invoice never blocks | `LIVE VERIFIED` (H-5, inbound only) — reusing `CODEX-P7-IN-1` on a DIFFERENT date was blocked live before posting and no movement was written; the matching-date/partner continuation branch is still `CODE VERIFIED` only |
| M7-85 | Two-leg collection | All rows of a document are collected per `doc_num` into date/partner SETS, not the first match — a transfer's two legs carry different partner text | 3538-3548 | `lib/qaimeConflict.ts` | transfer continuation is allowed | `CODE VERIFIED` (H-1) |
| M7-86 | Suffix stripping | `bareWh` removes ` anbarına`/` anbarı` before comparison | 3527-3531 | `lib/qaimeConflict.ts` | both suffix forms | `CODE VERIFIED` (H-1) |
| M7-87 | Self-exclusion in edit mode | The document being corrected is excluded from the comparison | 3541 | `lib/qaimeConflict.ts` | own document ignored | `CODE VERIFIED` (H-1) |
| M7-88 | Per-line counterparty | On mv the counterparty for the check is the destination warehouse; otherwise the line's partner | 3562-3567 | `lib/qaimeConflict.ts` | mv uses `w2` | `CODE VERIFIED` (H-1) |
| M7-89 | Hard block dialog | A conflict is a HARD block — no «understood, continue»; the dialog names the invoice, the conflicting document, its dates and partners | 4612-4630 | `components/operation/QaimeConflictDialog.tsx` | no continue button exists | `LIVE VERIFIED` (H-5) — live, the UI named the owning document `SND-76074E451C` and the post was refused before writing; no bypass was offered |
| M7-90 | Operational scope | Compared only against operational (non-cancelled, non-reversal) movements | 3536 | reuses `lib/operationalMovements.ts` | cancelled document does not conflict | `CODE VERIFIED` — exact full-page regression carries the duplicate invoice only on a cancelled document and reaches ordinary confirmation with no conflict. |

### Posting

| # | Function | Old behaviour | Old ref | Planned React ref | Planned tests | Status |
|---|---|---|---|---|---|---|
| M7-91 | Post gate | `mv.add` and at least one line; then Qaimə conflict; then İcarə confirmation; then the confirm dialog | 4631-4643 | store | order of gates | `LIVE VERIFIED` (H-5, inbound `Satınalma` only) — `CODEX-P7-IN-1` completed the gate sequence through to a real committed write (balance 8 → 13, movements 3 → 4). The İcarə and layer branches of the gate remain `CODE VERIFIED` |
| M7-92 | Confirm dialog (normal) | «Sənəd qeyd edilsin?» with the line count and the "cannot be edited afterwards" warning | 4663-4668 | `components/operation/PostConfirmDialog.tsx` | text exact | `CODE VERIFIED` (H-3) — line count and the "cannot be edited afterwards" warning; tested |
| M7-93 | Confirm dialog (edit) | Names the document, explains the single transaction, carries the Excel-export warning, and requires a MANDATORY reason before enabling the button | 4644-4662 | dialog | empty reason keeps it disabled | `CODE VERIFIED` (H-3) — names the document, carries the Excel-export warning and requires a mandatory reason before enabling the button; tested |
| M7-94 | Layer + edit refusal | With layers active, a posted document is not edited directly — refuse with the toast | 4686-4690 | store | refusal before any RPC | `CODE VERIFIED` — exact active-layer correction regression refuses before `correct_document` and retains the draft. No movements-screen affordance is substituted for this evidence. |
| M7-95 | Second initial-balance gate | Re-checked at post time; the WHOLE document is refused, lines are not silently dropped, because this is a permission violation not a stock race | 4692-4699 | store | whole document refused | `CODE VERIFIED` — exact non-admin regression refuses the whole two-line document, calls no post RPC and retains both lines; admin positive control passes. |
| M7-96 | Stale-response re-check | Before writing, availability is recomputed per warehouse+code (with the edit restore applied ONCE); a line with no stock is dropped, an over-quantity line is trimmed to the max, both reported in one toast; layered lines are NOT trimmed — the whole post aborts and the draft is kept; if nothing survives, «Yazılacaq etibarlı sətir yoxdur.» | 4700-4738 | store | drop, trim, layer-abort and empty cases | `CODE VERIFIED` (H-4) — `lib/opStaleRecheck.ts` + store; drop, trim, combined report, layer-abort, empty refusal and the once-per-key edit restore are each tested and mutation-checked |
| M7-97 | Edit-mode post | Refuses any mv line; requires a reason; calls `correct_document(doc, p_lines, reason)`; on success clears edit mode, lines, draft, blanks `iv`/`ct`, reloads and toasts the old→new document numbers; on failure states the original is unchanged | 4740-4772 | `api/postMovementDocument.api.ts` + store | failure message keeps the lines | `CODE VERIFIED` (H-4) — `correct_document` wired; reason required, transfer lines refused, layer-active correction refused, refusal keeps the draft and states the original is unchanged, success clears edit state and reports old → new |
| M7-98 | Layer mixing refusals | Layers active: mv and non-mv cannot share a document; in and out cannot share a layered document; every layered out line needs allocations | 4776-4780, 4804-4806, 4840-4847 | store | each refusal | `CODE VERIFIED` (H-4) — transfer/non-transfer mixing, in/out mixing and the missing-allocation refusals are each implemented and tested |
| M7-99 | Transfer payload | `{date, source, dest, code, qty, note, channel, contract, invoice, conditions, revision, allocations}`; the server writes both legs and the declined partner labels | 4784-4798 | `lib/opPayload.ts` | payload shape pinned | `CODE VERIFIED` (H-1) |
| M7-100 | Movement payload | `{date, warehouse, code, type, in_qty, out_qty, partner, channel, contract, invoice, price, note, conditions, revision, allocations, final_amount, override_reason}`; `conditions` only on non-`in` lines; `final_amount` null when blank | 4823-4834 | `lib/opPayload.ts` | in-line carries no conditions | `CODE VERIFIED` (H-1) |
| M7-101 | RPC routing | Layers inactive → `post_transfer_document` / `post_movement_document`; layers active → `post_layer_transfer_document` / `post_layer_movement_document` with the request key. A layered movement post only happens when the document is outbound | 4800-4856 | `api/postMovementDocument.api.ts` | all four routes | `CODE VERIFIED` (H-4) — all four routes chosen by layer state and tested; the layer routes carry the request key, the non-layer ones take no key parameter, and a layered movement post happens only when the document is outbound |
| M7-102 | Refusal handling | On error the lines stay untouched so the user can correct them; the toast carries the server message verbatim with the «Yerdəyişmə qeyd edilmədi:» / «Əməliyyat qeyd edilmədi:» prefix | 4812-4816, 4857-4860 | store | lines survive a refusal | `CODE VERIFIED` (H-4) — lines and form state survive every refusal, the server message is surfaced verbatim behind the correct legacy prefix, and the in-flight lock is released in a `finally` on every path |
| M7-103 | Partial-document reality | A document containing both mv and non-mv lines is written as TWO server calls; if the second fails the first is already committed. This is the legacy behaviour and is preserved, not "made atomic" | 4783-4862 | store | pinned by a test with a comment | `CODE VERIFIED` (H-4) — a mixed document makes TWO sequential calls; a second-call failure is reported as a real PARTIAL success naming the already-written document, and a first-call failure never claims one. Not made transactional |
| M7-104 | Success cleanup | Clears lines, request key, restore stamp and draft; blanks `iv`/`ct` in the retained header; reloads from the database; toasts «N sətir qeyd edildi» | 4864-4871 | store | header keeps date/warehouse, loses invoice | `LIVE VERIFIED` (H-5, inbound only) — after `CODEX-P7-IN-1` the reload showed the committed movement (count 3 → 4) and the screen returned to a postable state; the detailed field-level cleanup remains pinned by test |

### Request key and duplicate protection

| # | Function | Old behaviour | Old ref | Planned React ref | Planned tests | Status |
|---|---|---|---|---|---|---|
| M7-105 | Key generation | Lazy `crypto.randomUUID()` with a manual fallback | 3193-3198 | store | generated once, reused | `CODE VERIFIED` (H-2) — lazy `crypto.randomUUID()` with the manual fallback, tested |
| M7-106 | Key invalidation | Every `input`/`change` anywhere in the screen, plus tab switch, commit, remove, edit save and bulk apply | 3201, 3209, 3660, 3762, 3984, 4484, 4551 | store | each trigger clears it | `CODE VERIFIED` (H-2) — tab switch, header edit, add, remove and edit-save all invalidate the key, each tested individually; bulk apply is H-3 and is tracked on the bulk rows |
| M7-107 | Idempotency reach | The key is sent ONLY to the two layer RPCs. `post_movement_document` and `post_transfer_document` have NO request-key parameter in the live database, so a duplicated submit on those paths creates a duplicate document | live capture 2026-09-03 | `api/postMovementDocument.api.ts` | key absent from the non-layer calls | `CODE VERIFIED` (H-1) — the request key is sent only to the two layer RPCs; `post_movement_document` and `post_transfer_document` carry no request-key parameter in the live database. **H-5 verified nothing on this row**: the `CODEX-P7-DUP-1` result is attributed to `M7-108` and says nothing either way about server-side idempotency |
| M7-108 | In-flight lock | The post button must be disabled while a post is in flight. The legacy screen relies on the modal closing before the await; React re-renders faster, so an explicit lock is required to preserve — not weaken — the original protection | 4666-4667 | store + panel | second click during flight fires nothing | `LIVE VERIFIED` (H-5, non-layer inbound path) — double-clicking the confirmation in the `CODEX-P7-DUP-1` test created **exactly one** document (item `0000002`, balance 1, movements 1): the client-side in-flight lock prevented the second submission. Scoped to that observation only; the selector-level blocking remains pinned by test |
### Document edit mode

| # | Function | Old behaviour | Old ref | Planned React ref | Planned tests | Status |
|---|---|---|---|---|---|---|
| M7-109 | Entry contract | `document_edit_impact(doc)` → not editable renders the block list; editable loads the lines into the form, sets `OP.editDoc` with the restore map, switches the tab to the document's direction, seeds the header from the first line, clears the draft and navigates | 5150-5205 | store + `api/documentEditImpact.api.ts` | block list rendered; restore map built from `out_qty` | `LIVE VERIFIED` (ordinary correction) — Phase 8 real UI exercised the `document_edit_impact` caller, edit entry/restore and successful correction; block-list and restore-map branches remain independently pinned by tests. |
| M7-110 | Edit banner | Explains nothing has changed in the database yet and offers «Düzəlişdən imtina» | 3727-3732 | `components/operation/EditModeBanner.tsx` | banner only in edit mode | `CODE VERIFIED` (H-3) — the banner renders only in edit mode, says the database is unchanged and offers «Düzəlişdən imtina»; tested |
| M7-111 | Exit edit mode | Confirmation, then clears edit mode, lines, request key, restore stamp and draft, re-renders and toasts that the document is unchanged | 4670-4684 | store | database untouched | `CODE VERIFIED` (H-3) — `exitEditMode` clears edit state, lines, request key and restore stamp, and the banner’s exit path plus its toast are now wired and tested |
| M7-112 | Edit-mode form shape | The bulk «Malları seç» entry points are NOT rendered in edit mode, because the bulk flow bypasses the correction transaction | 3255-3260, 4104-4107 | form | button absent in edit mode | `CODE VERIFIED` (H-3) — the bulk entry point is absent in edit mode; tested |
| M7-113 | Note marker cleanup | The `Əvəz edir: <doc>` marker is stripped from loaded notes so it does not accumulate; the server re-appends it | 5185, correct_document body | store | round trip adds one marker | `LIVE VERIFIED` — live correction replacement contains exactly one server-appended `Əvəz edir:` marker; client payload and strip-helper regressions prove no client duplication. |
| M7-114 | Admin-only reach | `document_edit_impact` and `correct_document` both refuse non-admins server-side | live capture | `api/documentEditImpact.api.ts` | refusal surfaced, not swallowed | `CODE VERIFIED` (H-1) |

### Transitions, roles, Realtime, audit

| # | Function | Old behaviour | Old ref | Planned React ref | Planned tests | Status |
|---|---|---|---|---|---|---|
| M7-115 | `prefillOp` from Nomenklatura | Sets the pick, navigates to the screen and pre-fills the item into the form — navigation alone is NOT parity | 3452, 1887 | store `prefill()` + `App.tsx` + page | after the transition the item, unit, balance panel and split are all populated | `CODE VERIFIED` (H-4) — ItemCard → prefill(code) → navigate. After the target page loads the item, unit, balance panel and applicable condition split are all populated, pinned by test; the prefill survives the page load and a refresh that cannot yet resolve the code, and is consumed exactly once |
| M7-116 | «Yeni əməliyyat» from Mal hərəkəti | The movements screen's primary button navigates here (`data-goto="op"`). Phase 7 exposes the navigation contract; the movements screen itself is Phase 8 | 321 | `App.tsx` | contract present | `LIVE VERIFIED` (2026-09-09, TEST real UI) — from the real Mal hərəkəti screen the real IN-PAGE «Yeni əməliyyat» action (resolved OUTSIDE `nav.rail`, so the identically-labelled rail entry cannot be mistaken for it) navigated to the operation screen with NO prefill (no picked-item block, empty item search / Qaimə № / Qiymət), no edit banner and no submission; returning left the movements table BYTE-IDENTICAL. Negative control passed: the same assertions DO detect the `M5-55` Nomenklatura prefill, so the zero is real. Judged on a clean session — a pick made earlier in the same session is pre-existing store state, not navigation prefill. Audit: `../audits/2026-09-09-phase7-m7-18-m7-22-m7-116-readonly-ui-sweep.md` |
| M7-117 | Role behaviour | `mv.add` = admin + anbardar; a rehber can open the screen but the post button is disabled and `need()` refuses. Anbardar is scoped by `allowedWarehouses`/`sourceWarehouses` | 626-630, 3754 | page | all three roles | `CODE VERIFIED` (H-4) — admin and anbardar post; a rehber opens the screen but the button is disabled AND the handler refuses independently; the anbardar warehouse/source narrowing is pinned and leaves the admin unchanged |
| M7-118 | Server role refusals | All four post RPCs refuse a role outside admin/anbardar; `post_transfer_document` additionally restricts an anbardar's source to their OWN warehouse and forbids `dest = 'Ofis'`. `D-H1` means the client no longer OFFERS those two, but the refusal handling stays — a mid-session role change or a stale tab can still reach them | live capture | `api/postMovementDocument.api.ts` | messages surfaced verbatim; the refusal path survives the narrowing | `CODE VERIFIED` (H-4, mocked) — a server refusal after a mid-session role change is surfaced verbatim with the correct prefix and the draft survives. The live refusal texts remain unverified until T10 |
| M7-119 | Realtime | Page-scoped subscription on `items`/`movements`/`warehouses` (Phase 6 Q2 pattern); no `audit_log`. A refresh must NOT discard `OP.lines` | 1162-1181, Phase 6 Q2 | page + store | draft survives a Realtime refresh | `CODE VERIFIED` (H-2) — the page subscribes to exactly `items`/`movements`/`warehouses` with no `audit_log`, and draft lines are proven to survive a failed refresh, a successful refresh and a Realtime-triggered refresh |
| M7-120 | Audit-log consequences | Every movement INSERT fires `movements_audit` → `log_changes()`; `correct_document` additionally writes an explicit `UPDATE` audit row carrying the reason; `log_icare_exposure` records İcarə usage. The client writes NO audit row itself | live triggers + RPC bodies | documented in the registry | no client-side audit write | `LIVE VERIFIED` for ordinary INSERT and `correct_document` UPDATE audit consequences; client writes no audit row. `log_icare_exposure` is accepted as an out-of-scope no-explicit-split fallback under the owner-approved active-split UI, which deliberately uses the mutually exclusive `apply_cond_split` branch. |
| M7-121 | Label guard refusals | `trg_guard_movement_labels` refuses a channel or partner that is not ACTIVE in the directories, with «… Sorğuçalarda aktiv deyil — səhifəni yeniləyin». The client cannot pre-empt a value hidden after the form was built | live trigger | store | refusal surfaced verbatim | `LIVE VERIFIED` — authenticated TEST probes for an unknown channel and partner both returned exact HTTP 400 / `P0001` label-guard text; movements stayed 127→127. Full-page regression proves verbatim surfacing and draft retention. |
| M7-122 | Localhost write guard | `mutationGuard` widened with the Phase 7 write actions; every post path consults it independently of button state | existing `lib/mutationGuard.ts` | `lib/mutationGuard.ts` | each write action blocked on localhost without the opt-in | `CODE VERIFIED` (H-1, re-pinned H-4) — every one of the five write transports calls `blockedReason` before any network call, independently of button state; all four Phase 7 actions are tested blocked on localhost without the opt-in and allowed with it |
| M7-123 | Payload measurement — Phase 7 incremental scope | Measured in the TEST project only. Scope is exactly: (4) `partners` `select('*')` order `name` page 1000 · (5) `stock_conditions` `select('*')` page 1000 · (6) `get_reference_values()` · (7) `movement_split_supported()` · (8) `stock_layers_supported()` · (9) `get_transfer_destinations()` · (10) `get_stock_layers(warehouse, code)` for one representative item, reported per invocation and EXCLUDED from the page-load total. Reads 1-3 are `M6-40`'s and are referenced, not re-measured. Also records the combined page-load total for reads 1-9. For every read: exact query, row count, transferred bytes, uncompressed bytes, request count per page and total; method = devtools Network, cache disabled | — | recorded in the plan §T1 and this row | **Row stays open until every read 4-10 plus the combined total is recorded**; a partial measurement names the missing reads and does not close | `LIVE VERIFIED` (2026-09-09, TEST) — CLOSED. Read 10 `get_stock_layers` measured read-only once layer accounting was already active from the accepted Phase 8 baseline (`stock_layers_supported()` → `active:true, version:36`), so the setup write S-11 budgeted was NOT needed: 709 B uncompressed / 394 B gzip / 1 request for a 2-layer payload, per invocation and excluded from the page-load total. Reads 4-9 and the combined total were already recorded; the row's stop condition is met. Audit: `audits/2026-09-09-phase7-m7-123-read10-live-measurement.md` |

### Load and readiness — safety corrections (`M7-S…`)

These six rows exist because the legacy loader lets two failures produce a
**wrong write** rather than a refusal. Per principles §7 the behaviour is
documented and corrected here, not copied: copying it would knowingly ship a
wrong-write path in the one phase whose entire subject is writes. Neither
correction changes a calculation, permission, document, balance or Excel
output — each converts a silent wrong answer into a visible refusal. Full
matrix: proposal §5.

| # | Function | Old behaviour | Old ref | Planned React ref | Planned tests | Status |
|---|---|---|---|---|---|---|
| M7-S1 | Core reads are atomic | `load()` commits only when ALL five core reads succeed — `items`, `movements`, `warehouses`, `partners`, `stock_conditions`. Any failure yields `loaded:false`, an explicit «Məlumat yüklənmədi» state carrying the real error, no form and no lines table | 864-872, 1017 | `store/operation.store.ts` + `components/operation/LoadErrorState.tsx` | each core read failing individually blocks the post | `CODE VERIFIED` (H-2) — `load()` is the atomic caller: each of the five core reads failing individually yields `loaded:false` and blocks `canPost`, and `LoadErrorState` renders with no row-count claim |
| M7-S2 | **Partial page failure is fatal** | `fetchAll()` breaks out of its paging loop on error and RETURNS THE ROWS GATHERED SO FAR (855), setting `LOAD_ERR`; the screen's refresh callers (4768, 4863) ignore the returned `ok`. A `movements` failure on page 3 of 5 therefore builds every balance from a truncated dataset and overstates available stock. **Corrected: a partial read is a failed read** | 845-862, 1017, 4768, 4863 | `api/*.api.ts` + store | a mid-paging failure is fatal, NOT a smaller dataset — **verified to fail against a straight port of `fetchAll`** | `CODE VERIFIED` (H-2) — a partial `movements` page failure is proven not to commit a truncated `core` (`core.itemBy.size` stays 0) |
| M7-S3 | **`stock_conditions` failure refuses the post** | `condsReady` gates only `canEditCond()` (2149), NOT `condBuckets()` (2087). With `DB.conds` empty `condOf()` returns null, every bucket is 0, `marked` is false, the split UI never renders and the whole quantity posts as `normal` — silently moving rented or unfit stock as if free. **Corrected: the read is core, and its failure blocks posting** | 908-923, 2087-2101, 2149 | `lib/opReadiness.ts` + store | a failed `stock_conditions` read refuses rather than posting all-normal — **verified to fail against a straight port** | `LIVE VERIFIED` (2026-09-05, TEST localhost) — Chrome DevTools blocked `*stock_conditions*`; `Yeni əməliyyat` showed `Məlumat yüklənmədi` / `TypeError: Failed to fetch`, and the operation form/post path was unavailable. Disabling the rule and reloading restored normal loading. Zero writes and no fixtures |
| M7-S4 | Optional probes degrade, never block | `get_reference_values` (channel fallback, failure ≠ empty), `movement_split_supported`, `stock_layers_supported` and `get_transfer_destinations` each fail into their own readiness flag; the screen renders and posting stays available on the routes that do not need them | 928-932, 949-975, 995-1011, 3211-3217 | `lib/opReadiness.ts` | each probe failing leaves the screen usable | `CODE VERIFIED` (H-2) — each of the four optional probes failing individually leaves the screen usable and posting available on the unaffected routes |
| M7-S5 | `canPost` is a single predicate | One derived gate — `loaded && !coreError && can(me,'mv.add') && lines.length && !inFlight && splitEligible && layerEligible` — consulted by every button AND every handler, so no UI path can reach a post the matrix forbids | — | `lib/opReadiness.ts` | no second, disagreeing condition exists; pinned against per-button ad-hoc checks | `CODE VERIFIED` (H-3) — `canPost`/`postBlockReason` are consulted by every button AND every handler, dialogs included: `PostConfirmDialog` receives the gate as props and adds no local condition (two tests pin the false cases) |
| M7-S6 | Failed refresh keeps the snapshot | A refresh failure after a good load retains the rows and shows the error in the footer; it never blanks a working screen and never renders the empty-result state | Phase 6 `M6-S3`/`A01` | store + page | rows retained, error shown, empty-result text absent | `CODE VERIFIED` (H-2) — a failed refresh after a good load retains both the snapshot and the draft lines, through the real store; the regression test is the one that caught the `core` re-derivation bug |
### `M6-40` — Phase 6 debt, scope fixed here

`M6-40` stays a **Module G** row and is not moved; this note only pins the
scope it was missing, so it cannot be closed by a partial measurement. Its
scope is exactly the three reads of `fetchItemGroupsSnapshot()`:
(1) `items` — `code, name, unit, price, category`, order `code`, page 1000;
(2) `movements` — the `itemMovements.api.ts` column list including
`created_at`, order `date, created_at`, page 1000;
(3) `warehouses` — `select('*')`, page 1000.
Same method and same recorded fields as `M7-123`. **It stays `NOT DONE` until
all three are recorded**, and `M7-123` references its totals rather than
re-measuring them.

### `M5-55` — carried in as an entry criterion

| # | Function | Old behaviour | Old ref | Planned React ref | Planned tests | Status |
|---|---|---|---|---|---|---|
| M5-55 | Item card → «Bu mal üzrə əməliyyat» | `prefillOp(code)`: navigate AND pre-fill | 3452, 1887 | `components/nomenclature/ItemCard.tsx` + store | the disabled state and tooltip are removed only in the commit that wires the real transition | `LIVE VERIFIED` (H-5) — unblocked in H-4 and verified live in TEST: Item Card → «Bu mal üzrə əməliyyat» opened the operation form prefilled with item `0000002`, its unit and the Test Anbar balance 1. The late-resolution race and the condition-split half of the populated transition remain `CODE VERIFIED` only |

---

## Deviations for this module

**One approved deviation, `D-H1`**, decided by the user 2026-09-04 (Q3).

| # | Deviation | Decision and handling |
|---|---|---|
| **D-H1** | **Anbardar transfer picker narrowed to the live server contract.** The legacy client offers an anbardar every warehouse in their source group (Astara↔Harmony, 720-723) and every destination including «Ofis». The live `post_transfer_document` accepts neither: the source must be `current_user_warehouse()` exactly, and `dest = 'Ofis'` is refused outright — a rule present in no repository file | **APPROVED (Q3).** The React picker offers an anbardar only their own warehouse as transfer source and excludes «Ofis» from their destination list. Admin behaviour is unchanged. **No SQL is changed**: the server rule is already the stricter one, so the narrowing can never permit a write the server would refuse — it only removes options that always fail. Rows `M7-08`, `M7-33`, `M7-118`; tests pin both halves (anbardar narrowed, admin unchanged) |

**One divergence recorded, not fixed:**

| # | Divergence | Handling |
|---|---|---|
| H-D2 | The initial-balance admin restriction exists ONLY in the client; no live function or trigger enforces it, despite the code comments citing `sql/016` and CLAUDE.md §12 | **Q4:** both client checks ported verbatim and described honestly as client-side. Plan `T1b` designs a **read-only** preflight (no DDL/DML/GRANT/REVOKE outside comments) to size the gap. **No SQL is applied in Phase 7**; server enforcement is written up as a separate future migration needing its own approval |

## Risks

| # | Risk | Handling |
|---|---|---|
| R-H1 | **Real movement writes.** This is the first phase that creates stock movements | `VITE_ALLOW_LOCAL_WRITES` stays unset; mocks only during implementation; live runs in the test project with per-write approval |
| R-H2 | **No server idempotency on the two non-layer post RPCs** | Explicit in-flight lock (M7-108) plus the ported request-key discipline; documented, never described as server-guaranteed |
| R-H3 | Two-call documents (mv + non-mv) are not atomic across the pair | Preserved as legacy behaviour, pinned by a test, never reported as transactional |
| R-H4 | The stale-response re-check silently trims quantities | Ported verbatim including its toasts; a layered line aborts instead of trimming |
| R-H5 | Float accumulation in split/allocation sums | The original's `toFixed(4)` / 0.00005 tolerances ported exactly, with tests |
| R-H6 | Draft restoration could resurrect lines for a warehouse the user has lost | Permission re-filter (M7-54) ported; the server refusal remains the backstop |
| R-H7 | Layer mode may be inactive in production, so layer paths cannot be live verified there | Test-environment activation is the only route; if unavailable the layer rows stay `CODE VERIFIED` and say so |
| R-H8 | `xlsx` is untouched by this phase | No import/export path is added; `R-F7` is not reopened |
| R-H9 | **A truncated core read can overstate available stock** — `fetchAll` returns partial rows on error (855) | `M7-S2`: a partial page failure is fatal. Pinned by a test verified to fail against a straight port |
| R-H10 | **A failed `stock_conditions` read can silently post rented/unfit stock as normal** — `condsReady` does not gate `condBuckets()` | `M7-S3`: the read is core and its failure blocks posting. Pinned by a test verified to fail against a straight port |
| R-H11 | Milestone reporting could imply partial acceptance | Module H is ONE acceptance boundary (proposal §3). No milestone may be called accepted, live verified, or complete posting parity; no live write before every posting route exists |
| R-H12 | Reimplementing item creation would create a second, driftable write path | `T6b` reuses the Phase 5 `ItemFormDialog` with ONE additive optional prop; a test pins that existing call sites are unaffected |


---

## T1 payload measurement — results (2026-09-04)

**Environment: the isolated TEST project `alkjjbaawmsirsfvqljm` ONLY.**
Production `bbjmhaerssakbreykxiw` was not connected to or queried; all figures
below come from read-only `SELECT`s and read-only RPC probes executed with the
test-admin session. No row was created, updated or deleted.

**Method.** Each read was issued once over HTTPS with `Prefer: count=exact` and
`Accept-Encoding: gzip`. Recorded: the exact query, the row count (and the
`Content-Range` total), the uncompressed body size in bytes, the gzip-compressed
size in bytes, and the request count. Every read here completed in ONE request —
no read reached the 1000-row page size, so no pagination occurred.

### `M6-40` — Phase 6 scope (the three `fetchItemGroupsSnapshot()` reads)

| # | Query | Rows | Uncompressed | Gzip | Requests |
|---|---|---|---|---|---|
| 1 | `items?select=code,name,unit,price,category&order=code` | 5 (`0-4/5`) | 491 B | 205 B | 1 |
| 2 | `movements?select=id,item_code,warehouse,date,in_qty,out_qty,price,partner,type,invoice_num,note,doc_num,created_at&order=date&order=created_at` | 3 (`0-2/3`) | 949 B | 380 B | 1 |
| 3 | `warehouses?select=*` | 2 (`0-1/2`) | 133 B | 104 B | 1 |
| | **total** | **10** | **1 573 B** | **689 B** | **3** |

### `M7-123` — Phase 7 incremental scope

| # | Query | Rows | Uncompressed | Gzip | Requests |
|---|---|---|---|---|---|
| 4 | `partners?select=*&order=name` | 0 (`*/0`) | 2 B | 22 B | 1 |
| 5 | `stock_conditions?select=*` | 0 (`*/0`) | 2 B | 22 B | 1 |
| 6 | `rpc/get_reference_values` | 8 | 828 B | 404 B | 1 |
| 7 | `rpc/movement_split_supported` | 1 | 4 B | 24 B | 1 |
| 8 | `rpc/stock_layers_supported` | null payload | 4 B | 24 B | 1 |
| 9 | `rpc/get_transfer_destinations` | 1 | 14 B | 34 B | 1 |
| 10 | `rpc/get_stock_layers(p_warehouse, p_item_code)` — per invocation, EXCLUDED from the page-load total | 1 object · 2 layers | 709 B | 394 B | 1 |
| | **increment 4-9** | | **854 B** | **530 B** | **6** |
| | **combined page load, reads 1-9** | | **2 427 B** | **1 219 B** | **9** |

Gzip inflates a tiny body (a 2-byte `[]` compresses to 22 B of framing); the
uncompressed column is the meaningful one at this data volume.

### Status of both rows

**`M6-40` — CLOSED.** All three reads in its scope are recorded.

**`M7-123` — CLOSED (reconciled 2026-09-09).** Reads 4-9 and the combined total
were recorded on 2026-09-04. Read 10, `get_stock_layers`, was **not measurable
at that time**: `stock_layers_supported()` returned **`null`** in the test project
(no `stock_layer_settings` singleton row), and `get_stock_layers` raises «Partiya
uçotu aktiv deyil» whenever layer accounting is inactive.

**That blocker no longer exists.** The accepted Phase 8 baseline left layer
accounting active (`active:true, version:36`, cutover 2026-09-08), so read 10 was
measured **read-only, with zero writes and no setup**: 709 B uncompressed / 394 B
gzip / 1 request, for a real 2-layer payload (`7 + 1` = balance 8.00, matching the
Phase 8 inventory). Recorded per invocation and excluded from the page-load total,
so the reads 1-9 combined total above is unchanged. The row's stop condition —
every read 4-10 plus the combined total — is met. Audit:
`../audits/2026-09-09-phase7-m7-123-read10-live-measurement.md`.

**Caveat that must travel with these numbers.** The test project holds 5 items,
3 movements, 2 warehouses and **zero** partners and stock-conditions rows. These
figures establish the request COUNT and the per-read overhead; they say nothing
about production volume. A production-scale measurement is a separate, separately
approved read-only exercise.

### Q2 consequence — recorded, not worked around

As recorded on 2026-09-04, layer mode **could not be live-tested in the isolated
test project as it then stood**: the capability probe returned `null`, so
`layerActive` was false and every layer-aware path was unreachable. Enabling
layer mode would have required inserting a `stock_layer_settings` row — a
test-project MUTATION that milestone was not authorised to perform.

**Superseded 2026-09-09 for the capability precondition only.** Phase 8's
owner-approved cutover left layer accounting active in TEST
(`active:true, version:36`), so `layerActive` is now true there and the probe no
longer returns `null`. This unblocked `M7-123` read 10 at zero write cost (above).
It does **not** by itself promote any Phase 7 layer row: each layer-aware `M7-*`
row still needs its own exercised contract, and rows whose exact Phase 7 contract
was not executed keep the status H-4 left them with. Phase 8 evidence is not
transferable to a Phase 7 row merely because both touch layers.

`fetchLayerCapability()` handles the observed `null` correctly: it degrades to
`{ready:false, active:false, version:0}`, which is the legacy behaviour. A test
pins exactly that payload.
