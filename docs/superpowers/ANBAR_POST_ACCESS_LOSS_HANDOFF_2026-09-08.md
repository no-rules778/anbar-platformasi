# ANBAR post-access-loss handoff — 2026-09-08

## Purpose

This file preserves the actionable project history from the period when the
original Codex chat temporarily could not write to the ANBAR repository. It is
an index and continuity record, not a replacement for the detailed audit files,
the central parity registry, or `CLAUDE_HANDOFF.md`.

The full conversational chronology remains available through the shared old
chat. Project truth must be taken from the repository evidence linked below.

## Repository and safety boundary

- Repository: `ANBAR_SHARED/anbar-platformasi-github`.
- Preserve the existing dirty working tree. Do not run reset, clean, stash,
  checkout-overwrite, commit, push, deploy, or destructive cleanup unless the
  owner explicitly requests it.
- Live work is restricted to TEST Supabase project
  `alkjjbaawmsirsfvqljm`.
- Production project `bbjmhaerssakbreykxiw` must not be contacted or changed.
- Never copy passwords, access tokens, API keys, bearer values, cookies, or
  session material into documentation.
- `Çap` is an accepted historically non-functional feature and is not an
  acceptance blocker. Excel and dedicated report exports remain separate
  requirements. See
  `decisions/2026-09-08-print-nonfunctional-baseline.md`.

## Work and evidence preserved from the affected period

### Phase 7

- Phase 7 remained **INCOMPLETE / NOT ACCEPTED** after H-5.
- Ordinary movement audit rows were proved to exist; the initially empty Audit
  jurnalı result was caused by live RLS visibility, not by a missing trigger
  consequence.
- `M7-120` was therefore narrowed to live verification for the ordinary
  movement-INSERT consequence. `correct_document` and İcarə paths were not
  promoted by that evidence.
- `M7-108`, not `M7-107`, is the row supported by the observed double-click
  client lock. Server idempotency was not proved.
- The Phase 7 ledger was renamed from the obsolete `-DRAFT` filename to
  `specs/2026-09-04-phase7-registry-rows.md`; links were updated.
- Remaining-live-verification planning identified fixture, identity, role,
  layer-setting, cleanup and RPC-mechanism constraints. Planning did not itself
  authorize or execute live writes.

### Phase 8 implementation and live evidence

- Module I / Phase 8 remains **NOT ACCEPTED**. There is no official `I-10`
  milestone in the current ledger; “I-10” was only shorthand for the next
  continuation step. Continue from the genuinely open `M8-*` rows.
- Cancellation and correction evidence for the TEST admin is recorded in
  `audits/2026-09-08-phase8-cancellation-correction-live-check.md`.
- A later read-only TEST-admin correction check observed the real
  `editable:false` outcome for `SND-76074E451C` and all seven populated block
  reasons. This is narrow M8-33/M8-34 evidence only; see
  `audits/2026-09-08-phase8-correction-not-editable-live-check.md`.
- A further read-only pass verified the unsupported `Alış` refusal, the
  reversal-date control's rendered default, the row-cancellation reason gate,
  and the item-replacement preflight through candidate selection and mandatory-
  reason validation. Submit was not clicked in either action; see
  `audits/2026-09-08-phase8-replacement-preflight-live-check.md`.
- A later authorized TEST-only write executed `replace_movement_item` on the
  currently eligible ordinary document `SND-12B8BCDD3A`, replacing `0000001`
  with `0000002`. Direct read-back proved the original retained, a matching
  counter-row and replacement row added under the same document, and preserved
  date/warehouse/quantity/price/invoice. This is narrow M8-28 success-path
  evidence only; see
  `audits/2026-09-08-phase8-m8-28-replacement-live-check.md`.
- The next narrow TEST-admin write executed ordinary `cancel_movement_row` on
  that document's effective `0000002` line. Direct read-back proved the source
  retained and one equal counter-entry added inside `SND-12B8BCDD3A`; the UI
  refreshed to zero effective lines. This is M8-27 ordinary non-layer success-
  path evidence only; see
  `audits/2026-09-08-phase8-m8-27-row-cancel-live-check.md`.
- M8-23's blank-date half was subsequently executed on
  `SND-76074E451C`: the rendered date was cleared before the real cancellation,
  and read-back proved reversal `SND-C-2D6E6E714D` received server date
  `2026-09-08` while the original remained unchanged. See
  `audits/2026-09-08-phase8-m8-23-blank-reversal-date-live-check.md`.
- A ledger reconciliation superseded stale I-3 text in M8-16…M8-19/M8-21:
  the current I-4 ordinary, transfer, legacy and layer controls are implemented
  and tested. At that reconciliation point TEST had layers inactive, one active
  warehouse, zero transfer rows and zero doc-less rows; the later fixtures
  below supersede those data counts.
- A minimal TEST transfer fixture was then created and cancelled through the
  real UI. `SND-3550711E4C` retained both original legs and reverse document
  `SND-R-5D4231E5E8` added two equal/opposite legs. M8-15/M8-17 gain narrow
  transfer dispatcher/view evidence; M8-25 is partial-live for the non-layer
  admin success path. The named fixture warehouse remains as acceptance data.
  See `audits/2026-09-08-phase8-m8-25-transfer-cancel-live-check.md`.
- M8-32 failure atomicity was then checked directly: a valid document first
  plus a missing document second returned `P0001`, and immediate read-back
  proved the first remained unchanged with no reversal marker. See
  `audits/2026-09-08-phase8-m8-32-batch-atomicity-live-check.md`.
- A minimal document-less ordinary fixture then exercised the real legacy view
  and `cancel_legacy_movement`. Read-back proved the `doc_num = null` source
  retained and a separately numbered equal/opposite row added with the per-id
  cancellation marker. This gives M8-15/M8-18 narrow document-less ordinary
  UI evidence and M8-29 partial live evidence for TEST admin with layers
  inactive. Document-less transfer and both layer variants remain open. See
  `audits/2026-09-08-phase8-m8-29-legacy-cancel-live-check.md`.
- A unique two-leg document-less transfer fixture then exercised the real
  legacy-transfer view and `cancel_legacy_transfer`. Both sources remained and
  `SND-LR-AE5EEE3FF0` added two equal/opposite marker rows. A repeat RPC returned
  the already-cancelled P0001 without another write. M8-15 now has narrow live
  evidence for all four dispatcher destinations; M8-19 and the second non-layer
  half of M8-29 gain partial live evidence. Layer variants and broader refusals,
  roles, failures and concurrency remain open. See
  `audits/2026-09-08-phase8-m8-29-legacy-transfer-live-check.md`.
- The transfer fixtures mean M8-42 now has independently known raw rows in a
  foreign warehouse. Its remaining allowed/denied comparison is blocked on a
  usable fresh `anbardar` session/credential, not on fixture absence. A saved
  role tab was visible but could not be attached; do not guess the password.
- Direct repeat cancellation of already-cancelled ordinary
  `SND-76074E451C` and transfer `SND-3550711E4C` each returned P0001 and left
  the movement count 28→28. M8-24/M8-25 gain narrow non-layer server
  refusal/no-duplicate-write evidence; M8-21/M8-22 UI presentation remains
  open. See
  `audits/2026-09-08-phase8-m8-24-m8-25-recancel-refusal-live-check.md`.
- Direct row-cancel and item-replacement calls against an existing transfer
  source returned the exact transfer-specific P0001 refusals and left movement
  count 28→28. This adds narrow M8-27/M8-28 server exclusion/no-write evidence.
  See `audits/2026-09-08-phase8-m8-27-m8-28-transfer-refusal-live-check.md`.
- The same two RPCs against the existing legacy `Alış` fixture returned exact
  unsupported-type P0001 refusals with movement count still 28→28. M8-27/M8-28
  gain narrow unsupported-type server-backstop evidence. See
  `audits/2026-09-08-phase8-m8-27-m8-28-unsupported-type-refusal-live-check.md`.
- Six more no-write calls covered whitespace reason, absent movement, same-item
  and absent-item validations for M8-27/M8-28. All returned exact P0001
  responses and movement count stayed 28. See
  `audits/2026-09-08-phase8-m8-27-m8-28-validation-refusals-live-check.md`.
- Five no-write ordinary/transfer document calls covered blank/missing document
  and wrong-family validation. All returned exact P0001 responses and movement
  count stayed 28. See
  `audits/2026-09-08-phase8-m8-24-m8-25-validation-refusals-live-check.md`.
- Six no-write batch calls covered empty selection, blank legacy entry,
  duplicate selection, already-cancelled original and both reversal-document
  branches. All returned exact P0001 responses and movement count stayed 28.
  See `audits/2026-09-08-phase8-m8-30-m8-32-batch-validation-refusals-live-check.md`.
- Six no-write legacy calls covered ordinary already-cancelled, both
  wrong-family, numbered-row and both absent-movement branches. All returned
  exact P0001 responses and movement count stayed 28. See
  `audits/2026-09-08-phase8-m8-29-validation-refusals-live-check.md`.
- The ordinary Excel export and the separate Silinmə report have narrowly
  scoped live evidence. Their status remains partial; untested role, volume,
  source-lot, concurrency and foreign-warehouse dimensions must not be inferred.
- The TEST `anbardar` follow-up exercised the ordinary and Silinmə exports and
  confirmed the admin-only batch-cancel action was not rendered. This does not
  prove every RLS allowed/denied comparison. See
  `audits/2026-09-08-phase8-anbardar-writeoff-export-live-check.md`.
- `M8-53` was partially measured from the TEST read snapshot: four logical
  reads, 6,873 decoded JSON bytes and 1,532 encoded body bytes in the captured
  admin contract. Transfer size including headers/protocol overhead remains
  open. See
  `audits/2026-09-08-phase8-m8-53-payload-measurement.md`.
- A later protocol-level replay closed that gap for the current TEST snapshot:
  4,304 response-header bytes + 1,796 encoded-body bytes + 34 bytes HTTP chunk
  framing = 6,134 raw HTTP/1.1 response bytes across the same four reads. The
  paired decoded pass confirmed 26 rows / 8,843 bytes. Request/TLS/TCP bytes
  are explicitly outside this metric.
- Silinmə export safety evidence covers unmount abort, duplicate-click lock,
  refresh-in-progress refusal, changed-snapshot abort and a synthetic in-memory
  changed-session guard. The synthetic session case is not a real authentication
  transition. See
  `audits/2026-09-08-phase8-writeoff-export-unmount-live-check.md`.
- The actual downloaded Excel artifacts were readable. Native Excel
  no-repair/readability evidence remains user-operated where the audit says so;
  it must not be upgraded to agent-operated evidence.

### Last code correction and verification baseline

- A live defect was corrected in `NewOperationPage`: the edit flow did not call
  `openEditLine(index)`, so saving the dialog could discard edits. The store edit
  index is now initialized.
- Post-fix full verification recorded in `CLAUDE_HANDOFF.md`:
  **2702 tests / 126 files passed** with one worker.
- Focused page/dialog/store verification: **147 tests / 3 files passed**.
- Typecheck and oxlint exited successfully.
- Production build succeeded with only the known large-chunk warning.
- No production mutation, deployment, commit, staging or push was performed.

## Transfer verification

Two Codex chats now exist inside the `Anbar Platforması` project and both point
to the correct repository directory:

- `Review shared ChatGPT conversation` — opened the shared old-chat link, read
  the current handoff, central registry, Phase 8 ledger, audits and decisions,
  and performed repository checks.
- `Продолжить работу над ANBAR` — read the supplied continuation context and the
  same project evidence, then ran local verification. This run was interrupted,
  so it should not be treated as the sole handoff source.

The shared chat preserves conversational detail. This file plus the repository
documents preserve the operational state needed to continue even if the shared
page later becomes unavailable.

## Current continuation rule

1. Read `CLAUDE_HANDOFF.md`, `ANBAR_FUNCTIONAL_PARITY_REGISTRY.md`,
   `specs/2026-09-05-phase8-registry-rows.md`, and the 2026-09-08 Phase 8 audits.
2. Inspect the current dirty tree before editing; preserve unrelated changes.
3. Treat disagreement critically: if an audit calls normal behaviour a defect,
   reject that finding with primary evidence and explanation rather than
   accepting it automatically.
4. Work only against TEST. Do not expose secrets and do not infer permission for
   production.
5. Continue from open `M8-*` evidence gaps. Do not invent an `I-10` ledger row
   merely because the old chat used that shorthand.
6. Do not promote Phase 8 until the documented acceptance boundary is actually
   satisfied. `Çap` is excluded from that boundary.

## Latest continuation — TEST layers are active (2026-09-08)

The official atomic layer cutover was completed on TEST only. Current state is
`active=true`, layer version 36, cutover
`2026-09-08T19:55:29.879391+04:00`, with two seeded `legacy_unresolved`
layers. This is now the current baseline; earlier inactive-layer statements are
historical snapshots.

Direct TEST-admin RPC/read-back checks proved:

- M8-24 layer document cancellation: `SND-D512FAAC59` → reversal
  `SND-C-B7B77DCCB4`, source retained, affected seed layer 1→0;
- stale layer-transfer post revision: refused with no write;
- exact layer transfer `SND-8CFB378D7D` and M8-25 cancellation → reverse
  `SND-R-8182DFCD7D`, source layer 7→8, destination layer 1→0, allocation link
  marked reversed.

The browser debugger was unavailable, so these are server RPC results and not
React UI-routing evidence. M8-26 therefore remains CODE VERIFIED. Localhost is
again running read-only at `127.0.0.1:5175` with
`VITE_ALLOW_LOCAL_WRITES=false`. Evidence:
`audits/2026-09-08-phase8-layer-cutover-and-cancellation-live-check.md`.
Continue from the cheapest safe OPEN layer/UI/role scenario without repeating
these calls. **Phase 8 remains NOT ACCEPTED.**

### M8-27 continuation

Direct TEST-admin `cancel_layer_movement_row` checks now cover an unused exact
receipt layer, an allocated `Silinmə` reversal and the stock-safety refusal for
a partially used receipt. Read-back proved receipt-layer deactivation,
write-off layer restoration and allocation/valuation reversal links. Temporary
fixtures were fully countered; current movement count is 39. This is direct RPC
evidence only; React layer selection remains open. See
`audits/2026-09-08-phase8-m8-27-layer-row-cancel-live-check.md`.

### M8-38 continuation

On fresh open TEST document `CODEX-P8-LAYER-EDIT-20260908201647`, impact was
`editable:true`, while direct correction returned the layer-selection P0001
and wrote nothing (40→40). This proves the server refusal and the necessity of
the separate React capability gate; UI button absence remains open. The fixture
was layer-cancelled, leaving 41 movements. See
`audits/2026-09-08-phase8-m8-38-layer-edit-refusal-live-check.md`.

### M8-32 layer-batch continuation

Direct TEST-admin layer batch cancellation succeeded for two exact receipt
documents and atomically rolled back a separate valid-first/missing-second
batch (46→46, no reversal, valid layer unchanged). Fixtures were neutralised;
current movement count is 47. UI/error/role/concurrency branches remain open.
See `audits/2026-09-08-phase8-m8-32-layer-batch-live-check.md`.

### Layer audit-log visibility

A fresh direct admin read returned zero visible `audit_log` rows, including an
unfiltered latest-rows query. Do not promote M8-43 from the layer movement,
layer, allocation or valuation read-backs alone; independently readable layer
audit consequences remain open.

**Updated 2026-09-09:** the cause is now known. `audit_log` has one SELECT
policy, `p_audit_read`, with qual `(my_role() = 'rehber')`, so an admin can
never read a row; the zero-row result was correct RLS filtering, not missing
data. The timestamp column is also `ts`, not `created_at`. The instruction not
to promote M8-43 from admin reads still stands, but the decisive check is now
specific: repeat the same reads in a `rehber` session. See
`audits/2026-09-09-phase8-m8-43-audit-log-rls-and-coverage.md`.

### M8-24 layer concurrency

Two simultaneous direct cancellations of fresh exact document
`CODEX-P8-LAYER-RACE-20260908202417` produced one success and one P0001,
count 48→49 and exactly one reversal/layer consumption. Current movement count
is 49. This is server concurrency evidence only; M8-46 React locking remains
CODE VERIFIED. See
`audits/2026-09-08-phase8-m8-24-layer-cancel-concurrency-live-check.md`.

### M8-29 layer-legacy stock refusal

A fresh document-less exact receipt sent to
`cancel_layer_legacy_movement` returned the unresolved-legacy-balance P0001,
wrote no reversal and left its exact layer unchanged. It was then neutralised
through exact row cancellation. Current movement count is 51. Successful
layer-legacy ordinary/transfer paths remain open. See
`audits/2026-09-08-phase8-m8-29-layer-legacy-stock-refusal-live-check.md`.

### Current TEST baseline after this continuation

- stock-layer capability active, version 36;
- 51 movements, zero negative balances;
- `Test Anbar / 0000001` balance 8; `Test Anbar / 0000002` balance 0;
- transfer-fixture warehouse balance 0;
- only active layer: 8-unit `legacy_unresolved` layer for
  `Test Anbar / 0000001`;
- localhost `127.0.0.1:5175` is read-only (`VITE_ALLOW_LOCAL_WRITES=false`).

### M8-29 layer-legacy ordinary success

`cancel_layer_legacy_movement` succeeded for document-less source
`a84a5b87-e60e-4e99-ac3f-943670915d0b`, creating reversal
`SND-L-01905D9CEE`. Movement balance stayed 8; active layer composition became
legacy-unresolved 7 plus exact receipt 1. Movement count is 53. The layer-
legacy transfer success remains open. See
`audits/2026-09-08-phase8-m8-29-layer-legacy-success-live-check.md`.

### M8-25 exact layer-transfer concurrency

Two simultaneous cancellations of `SND-0A92A2EF71` produced one success, one
already-cancelled P0001 and one two-leg reverse document
`SND-R-EE3FD1B1B5`; count 55→57. Source layer was restored, destination layer
consumed and the transfer link marked reversed. Balances remain 8/0. See
`audits/2026-09-08-phase8-m8-25-layer-transfer-concurrency-live-check.md`.

### M8-24 exact layer-document stock refusal

A partially consumed two-unit receipt returned the exact used-layer P0001;
count stayed 59→59, no marker appeared and its layer stayed 1/active. The
write-off was reversed first and the receipt then cancelled successfully.
Current movement count is 61. See
`audits/2026-09-08-phase8-m8-24-layer-document-stock-refusal-live-check.md`.

### M8-25 destination-layer-used refusal

A two-unit exact transfer with one destination unit consumed returned the
exact destination-used P0001; count stayed 64→64, layer stayed 1/active and
link unreversed. After reversing the write-off, transfer cancellation
succeeded. Current movement count is 67. See
`audits/2026-09-08-phase8-m8-25-layer-transfer-stock-refusal-live-check.md`.

### M8-30/M8-32 mixed layer batch

A single direct batch combined an ordinary exact receipt and exact transfer,
returning ordered one-row/two-row reversals. Count changed 70→73; layers and
transfer link reconciled with no outstanding fixture quantity. React batch UI
remains open. See
`audits/2026-09-08-phase8-m8-30-m8-32-mixed-layer-batch-live-check.md`.

### Latest baseline (supersedes earlier counts above)

- 73 movements; zero negative balances;
- effective balances: `Test Anbar / 0000001 = 8`, item `0000002 = 0`,
  transfer warehouse item `0000001 = 0`;
- active layers for `Test Anbar / 0000001`: legacy-unresolved 7 plus exact
  receipt 1; total 8;
- capability active/version 36; localhost HTTP 200 and read-only;
- `git diff --check` PASS; dirty tree preserved.

### M8-26/M8-38 React layer routing

Browser control recovered. A fresh exact receipt opened in the real React
document dialog. The layer warning rendered, `Sənədi redaktə et` was absent,
and the real cancel action produced toast/reversal `SND-C-857A9630B4`.
Read-back proved exact layer 1→0 and count 74→75. M8-26 now has ordinary React
layer-routing evidence; M8-38 is live verified for this TEST-admin branch.
Localhost was returned to read-only immediately. See
`audits/2026-09-08-phase8-m8-26-m8-38-react-layer-routing-live-check.md`.

### M8-28 layers-active replacement UI continuation

The real React UI initially exposed `Malı əvəz et` on an exact layer receipt.
Submitting it returned the layer-selection P0001 and direct read-back proved a
fully atomic refusal (76→76, no reason marker, source layer unchanged). The
client gap was fixed by requiring a confirmed layers-inactive capability for
replacement; row cancellation remains available because it has a layer RPC.
A fresh real React dialog verified the corrected action set and explanation.
Focused tests pass 64/64 and the production build passes. Both fixtures were
neutralised; latest count is 79 and item `0000002` balance is zero. See
`audits/2026-09-08-phase8-m8-28-layer-replacement-ui-check.md`.

Phase 8 remains NOT ACCEPTED.

### M8-21/M8-30 legacy reversal classification continuation

The real TEST-admin batch matrix exposed legacy-transfer counter document
`SND-LR-AE5EEE3FF0` as selectable because its terminal server marker is
`Ləğv (əks yerdəyişmə) ID:` rather than the previously recognised
`Ləğv (əks yerdəyişmə):` form. No cancellation was submitted. The state and
batch matchers now recognise both transfer-counter shapes; regression coverage
was added at state, document-view and batch levels. Expanded tests pass 270/270
and the production build passes. The same live row then rendered visible but
disabled with `Əks/ləğv sənədi — ləğv edilmir`. See
`audits/2026-09-08-phase8-m8-21-m8-30-legacy-reversal-classification-live-check.md`.

Phase 8 remains NOT ACCEPTED.

### M8-27 React layer-row and M8-31 filter continuation

Real React `Sətri ləğv et` cancelled one exact receipt row with a mandatory
reason. Read-back proved count 84→85, one same-document counter-row, source
retained, layer 1→0/inactive and zero item balance. The write-enabled process
was stopped and localhost returned to read-only. M8-31 additionally gained
inclusive equal-date, excluding lower/upper bounds, the cancellable-only type
option-list quirk and combined `Test Anbar + Silinmə` live evidence. See
`audits/2026-09-08-phase8-m8-27-react-layer-row-cancel-live-check.md` and
`audits/2026-09-08-phase8-m8-31-batch-search-selection-live-check.md`.

Phase 8 remains NOT ACCEPTED.

### M8-31 read-only batch search continuation

Real document search isolated `TEST-OUT-1`; selecting it and then filtering to
no results retained the independent selected count and enabled continuation.
Restoring the filter returned the row still checked. The dialog was closed
without submit, so TEST state remained at the post-batch baseline. See
`audits/2026-09-08-phase8-m8-31-batch-search-selection-live-check.md`.

Phase 8 remains NOT ACCEPTED.

### M8-30/M8-32 React layer-batch continuation

Two fresh exact receipt documents were selected and cancelled through the real
React batch flow. The eligibility matrix kept explicit disabled reasons, the
confirmation showed both documents and the atomic rule, and the success toast
reported two cancellations. Read-back proved exactly two reversal rows,
movement count 81→83, both layers consumed once and item `0000002` balance
returned to zero. The write-enabled process was stopped and localhost is
read-only. See
`audits/2026-09-08-phase8-m8-30-m8-32-react-layer-batch-live-check.md`.

Phase 8 remains NOT ACCEPTED.

### M8-25/M8-26 React transfer routing — BLOCKED, no evidence added

The preferred continuation (a fresh exact `Test Anbar` → `CODEX Phase8 Transfer
Anbar` transfer cancelled through the real React document view) was **not
executed**. The session had no authenticated browser-control tool of any kind,
and an independent probe showed that a TEST read with only the publishable anon
key returns HTTP 401, so an authenticated read-back was unavailable too. Since
both the UI driver and the verification half were missing, no write was
attempted. No fixture was created and the TEST baseline is untouched.

Offline re-inspection confirmed the routing is correct in code and already
covered by tests (`documentCancel.api.ts` keeps the `D-I1` argument names
separate; `DocumentViewDialog` dispatches the transfer family on the live
capability flag; `DocumentCancel.test.tsx` asserts the layer call and the
absence of `p_original_doc_num`). This is pre-existing CODE VERIFIED coverage
and does not close the live gap.

Checks: focused tests 142/142 across 3 files, typecheck, oxlint, production
build and `git diff --check` all pass. Localhost stayed read-only at
`127.0.0.1:5175` with `VITE_ALLOW_LOCAL_WRITES=false`; no write window was ever
opened. See
`audits/2026-09-08-phase8-m8-25-m8-26-react-transfer-routing-blocked.md`.

**Next step when browser control returns:** run exactly that transfer scenario
with a small quantity, read back rows/layers/link, finish net-zero, and restore
read-only immediately.

Phase 8 remains NOT ACCEPTED.

### Marker-contract cross-check (2026-09-08)

React transfer/legacy layer routing (M8-25/M8-26) stays blocked: no attachable
authenticated TEST-admin session exists in the browser profile (empty auth
storage on both localhost origins; non-remembered sessions live in per-tab
`sessionStorage`), and entering a password is not permitted. No speculative
write was made.

Executed instead, entirely offline: the four server marker shapes were extracted
from the TEST restore SQL, every `cancel_layer_*` function was shown to delegate
its movement write to the non-layer function (so the layer cutover added no
marker shape), and the nine shipped client matchers were evaluated against all
four shapes plus near-miss strings. All are handled. The `SND-L-*`
legacy-ordinary reversal document is excluded from the batch matrix by
`stripRowLevelCancelled()`, matching legacy 5330; a mutation-checked regression
test now pins that real shape. Focused tests 240/6 files, typecheck, oxlint and
build all pass; localhost remains read-only. See
`audits/2026-09-08-phase8-marker-contract-crosscheck.md`.

**Phase 8 remains NOT ACCEPTED.**

### M8-25/M8-26 React exact-layer transfer route — narrow PASS (2026-09-09)

The prior browser/session blocker is superseded for this branch. A real TEST
admin React session transferred one exact known-price unit from `Test Anbar` to
`CODEX Phase8 Transfer Anbar` (`SND-456860F655`) and cancelled it from the real
transfer card (`SND-R-C1D167C46E`). Authenticated read-back proved 85→89
movements, both two-leg documents, the reversed transfer link, source exact
layer 1/active, destination child 0/inactive, balances 8/0 and no negative
balances. This confirms the layer transfer cancellation route and its `p_doc_num`
contract. The fixture is stock-net-zero; immutable audit history remains.

Localhost was immediately restored to `VITE_ALLOW_LOCAL_WRITES=false` and HTTP
200. Dirty tree preserved; no production contact, commit, staging, push or
deploy. See
`audits/2026-09-09-phase8-m8-25-m8-26-react-layer-transfer-live-check.md`.

Other OPEN lines remain. **Phase 8 remains NOT ACCEPTED.**

### M8-46 real React double-submit — narrow PASS (2026-09-09)

Using the documented TEST-admin account and browser automation, Codex created
the 0.01 receipt `SND-BD8A2AB48F` and dispatched a genuine double-click on its
real React cancellation button. Only one reversal was created:
`SND-C-015729F809`. Read-back proved movement count 89→91, one source and one
reversal, exact receipt layer 0/inactive, restored balances 8/0 and no negative
balances. The write process was stopped immediately and localhost is read-only
with HTTP 200. See
`audits/2026-09-09-phase8-m8-46-react-double-submit-live-check.md`.

The ordinary cancellation branch is narrow live verified; other M8-46 branches
remain OPEN. **Phase 8 remains NOT ACCEPTED.**

### M8-47 concurrent React submit gate — narrow PASS (2026-09-09)

Two authenticated TEST-admin browser tabs submitted cancellation of the same
real receipt `SND-6EC3E09726` concurrently. Read-back showed exactly one
reversal `SND-C-56395DEBD0`, net-zero restoration, unchanged active layers and
balance 8.0 with no negatives. Localhost was returned to read-only (HTTP 200).
See `audits/2026-09-09-phase8-m8-47-react-submit-gate-live-check.md`.

This is only the ordinary-cancellation branch; remaining M8-47 matrix branches
are OPEN. **Phase 8 remains NOT ACCEPTED.**

### M8-46 batch double-submit — narrow PASS (2026-09-09)

The real two-document batch submit was double-clicked under TEST admin. Sources
`SND-973DBDDB0B` / `SND-82A44E221E` received exactly one reversal each
(`SND-C-EE226B292E` / `SND-C-7E56D0995C`), with no duplicates and net-zero
layer/balance restoration. Localhost is read-only. Correction, row and
replacement M8-46 branches remain OPEN. **Phase 8 remains NOT ACCEPTED.**

### M8-20 / M8-46 row double-submit — narrow PASS (2026-09-09)

The real row-cancel submit for `SND-17FAC1216F` was double-clicked. Exactly one
row counter was created, count 99→101, layers/balance restored, and the emptied
card correctly rendered as partially modified rather than whole-document
cancelled. Localhost is read-only. Correction/replacement M8-46 branches remain
OPEN. **Phase 8 remains NOT ACCEPTED.**

The M8-47 peer card additionally supplied narrow M8-22 live evidence for the
exact already-cancelled/reversal-number presentation. The batch double-click
supplied M8-32 same-control UI-concurrency evidence; multi-tab batch remains
OPEN.

### Autonomous continuation boundary (2026-09-09)

All currently reachable narrow browser checks are complete and net-zero.
Remaining acceptance requires inactive-layer/edit state, non-admin/rehber
credentials, a fresh cutover or a controlled fault/volume harness. See
`audits/2026-09-09-phase8-autonomous-closure-boundary.md`. No I-10 row was
created. **Phase 8 remains NOT ACCEPTED.**

### Role/RLS credential blocker resolved (2026-09-09)

Dedicated TEST-only `anbardar` and `rehber` identities now exist. Live evidence
closed M8-42's current-fixture comparison: exactly 85/85 allowed `Test Anbar`
rows visible and 0/16 destination rows visible. M8-40 gained a genuine P0001
server refusal with 101→101 movements, and M8-43 gained the decisive `rehber`
read (543 rows, seven known Phase 8 fixture matches) against admin's expected
zero. Evidence:
`audits/2026-09-09-phase8-m8-40-m8-42-m8-43-role-rls-live-check.md`.
Passwords are not stored in repository files. Localhost remains read-only; no
production contact or Git/deploy action. **Phase 8 remains NOT ACCEPTED.**

The valid React follow-up ran in TEST sandbox/read-only and rendered the
`rehber` audit page at `1–50 / 544`, including known M8-46 rows; its device
session was then closed. Before that valid run, localhost was mistakenly
started once without `--mode sandbox`, producing one rejected TEST-credential
request to production Auth. No production session, authenticated REST call or
application write followed. This deviation is recorded in the linked audit;
final localhost is TEST sandbox/read-only.

### Browser-control blocker resolved for network interception (2026-09-09)

This supersedes, for this branch, the earlier statement that the session had
"no authenticated browser-control tool of any kind". Playwright 1.63.0 driving
**installed Chrome** (`channel: 'chrome'`) gives both authenticated TEST
sessions and request-level interception, without adding a project dependency:
it is imported from the npm `_npx` cache, and `web/package.json` still shows
only its pre-existing `xlsx` modification.

This unblocked `M8-45`. Exactly one required TEST read
(`**/rest/v1/movements**`) was failed with HTTP 503 while Auth was left
untouched; the real «Mal hərəkəti» screen retained its snapshot under the
«Yenilənmədi» banner and recovered cleanly when the interception was removed.
The `movements` response carried 101 rows, confirming the same-day baseline.
Evidence:
`audits/2026-09-09-phase8-m8-45-failed-refresh-retention-live-check.md`.

Practical notes for the next continuation: kill any dev server whose mode
cannot be established before collecting evidence, and allow ~9 s after a
navigation-remount refresh before sampling the DOM — a shorter wait samples
before the failed load settles and falsely reads as "no banner".

No write, no fixture change, no production contact (0 attempts), nothing
staged, dirty working tree preserved, no I-10 row.
**Phase 8 remains NOT ACCEPTED.**
