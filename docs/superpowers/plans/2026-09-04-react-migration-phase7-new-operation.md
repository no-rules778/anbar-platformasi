# Phase 7 implementation plan — «Yeni əməliyyat» (Module H)

**Status: PLAN — not started. Implementation begins only after the user
approves the proposal.**

**Revision 2 (2026-09-04)** — corrected after the Codex design audit
[`../audits/2026-09-04-phase7-design-codex-audit.md`](../audits/2026-09-04-phase7-design-codex-audit.md).
`A01` → §Milestones replaces the withdrawn 7a/7b phase split; `A02` → `T2b` and
`T4` follow the load/readiness matrix; `A03` → new task `T6b`; `A04` → `T1`
rewritten with exact query scopes. Q1-Q7 are now decided, not open.

Proposal: [`../specs/2026-09-04-react-migration-phase7-new-operation-proposal.md`](../specs/2026-09-04-react-migration-phase7-new-operation-proposal.md) ·
Registry rows: [`../specs/2026-09-04-phase7-registry-rows.md`](../specs/2026-09-04-phase7-registry-rows.md)

Baseline to re-confirm before the first edit: **986 tests / 61 files**,
typecheck, oxlint, build, `git diff --check` — all clean.

---

## Entry criteria

1. The proposal is approved.
2. `M5-55` is carried in explicitly (registry Module F requires it).
3. The baseline suite is re-run and confirmed green **before** any file changes.
4. `VITE_ALLOW_LOCAL_WRITES` verified unset in `web/.env`.
5. Draft registry rows merged into the registry as `NOT STARTED`
   (principles §10).

---

## Milestones — sequencing only, no status meaning

Module H is **one acceptance boundary** (proposal §3). The milestones below
exist so implementation can run in short chats without exhausting context.

| Milestone | Tasks | What may be claimed at its end |
|---|---|---|
| H-1 | T1, T1b, T2, T2b, T3 | `CODE VERIFIED` on the pure-logic and API rows only |
| H-2 | T4, T5 | `CODE VERIFIED` on store/form rows |
| H-3 | T6, T6b | `CODE VERIFIED` on dialog rows |
| H-4 | T7, T8 | `CODE VERIFIED` on navigation, `M5-55` and pinning rows |
| H-5 | T9, T10 | Phase-level result, after the single live gate |

**Binding rules on these milestones:**

- No milestone is ever described as `ACCEPTED`, `LIVE VERIFIED`, or as complete
  posting parity.
- **No live write of any kind before H-4 is finished**, i.e. before all five
  posting routes (`post_movement_document`, `post_transfer_document`,
  `post_layer_movement_document`, `post_layer_transfer_document`,
  `correct_document`) are implemented. The live gate is `T10`, and it opens
  once.
- A milestone finishing does not promote any row it lacks evidence for.

---

## Task sequence

Each task ends with its own tests. Nothing is promoted in the registry until
the checks for that task pass.

### T1 — Payload measurement (test project only, read-only)

Clears `M6-40` and establishes `M7-123`. Method for **every** read: execute
once in the isolated test project via devtools Network with cache disabled, and
record (a) the exact query, (b) row count, (c) transferred bytes and
uncompressed bytes, (d) request count for paged reads, per page and total.

**`M6-40` — Phase 6 scope** (the three reads of `fetchItemGroupsSnapshot()`):

1. `items` — `code, name, unit, price, category`, order `code`, page 1000.
2. `movements` — the `itemMovements.api.ts` column list including
   `created_at`, order `date, created_at`, page 1000.
3. `warehouses` — `select('*')`, page 1000.

**`M7-123` — Phase 7 incremental scope** (reads 1-3 are shared and referenced,
not re-measured):

4. `partners` — `select('*')`, order `name`, page 1000.
5. `stock_conditions` — `select('*')`, page 1000.
6. `get_reference_values()`.
7. `movement_split_supported()`.
8. `stock_layers_supported()`.
9. `get_transfer_destinations()`.
10. `get_stock_layers(warehouse, code)` — representative item, reported as
    per-invocation cost, **excluded** from the page-load total.

`M7-123` additionally records the combined page-load total for reads 1-9.
**Neither row closes until every read in its own scope is recorded.** A partial
measurement leaves the row open and says which reads are missing.

Also record, in the TEST project: `stock_layers_supported()` and
`movement_split_supported()` results (the live production capture says split =
TRUE; layer activity cannot be read from a schema-only capture). These decide
whether the Q2 live layer test is possible at all.

### T1b — Initial-balance preflight design (read-only, no SQL applied)

Per Q4. Write — but do **not** execute against production — a read-only
preflight that counts existing `movements` rows matching the initial-balance
combination grouped by the creating user's effective role, so the size of the
H-D2 gap is knowable. It must contain no DDL, DML, GRANT or REVOKE outside
comments (CLAUDE.md §7). The proposed server migration is written up separately
for its own approval and is **not** part of Phase 7's deliverable.

### T2 — Pure logic libraries

No React, no Supabase. Ordered so later modules consume earlier ones:

1. `lib/opTypes.ts` — `OP_TYPES`, per-tab field matrix, `partnerOptions`,
   `channelOptions`, `optsWith`, `isWoOut`/`isMvPick`. (M7-04, M7-09, M7-10,
   M7-16, M7-47, M7-48, M7-56)
2. `lib/condSplit.ts` — the whole 2060-2145 block. (M7-25…M7-30)
3. `lib/icareExposure.ts` — 3484-3512 plus the marker regex. (M7-78…M7-82)
4. `lib/qaimeConflict.ts` — 3517-3567. (M7-84…M7-90)
5. `lib/opLineValidation.ts` — `validateOpLine` and `editRestoreQty`, in the
   original's exact check order and message strings. (M7-32…M7-37)
6. `lib/bulkWriteOff.ts` — rows/filter/summary/select-row. (M7-58…M7-65)
7. `lib/layerAllocation.ts` — the two calc functions, source labels,
   tolerances. (M7-74, M7-76, M7-77)
8. `lib/opDraft.ts` — serialise, restore, TTL, permission re-filter, stamp.
   (M7-51…M7-55)
9. `lib/opPayload.ts` — the four payload shapes. (M7-99, M7-100)

**`lib/warehouseScope.ts` gains the `D-H1` narrowing** for anbardar transfer
sources and the «Ofis» destination exclusion (Q3). Existing exported helpers
keep their current behaviour where other phases depend on them; the narrowing
is a new, separately named export so Phase 6's `allowedWarehouses()` usage is
untouched. Tests pin both halves: anbardar narrowed, admin unchanged.

### T2b — The readiness matrix (audit `A02`)

`lib/opReadiness.ts`, written **before** the store so the store cannot invent
its own rules:

- classify each read as core / optional per proposal §5.2;
- expose `canPost(state)` as the single derived predicate every button and
  every handler consults (proposal §5.3);
- expose `splitEligible(lines, splitReady)` and
  `layerEligible(lines, layerActive)`.

Tests: `M7-S1`…`M7-S6`, including the two that fail against a straight legacy
port — a **partial** `movements` page failure treated as fatal, and a failed
`stock_conditions` read refusing rather than silently posting all-normal.

### T3 — API layer

- `api/stockConditions.api.ts` — read `stock_conditions`, paged, absorbing both
  failure shapes, and **reporting a partial page failure as a failure**, not as
  a short result.
- `api/stockLayers.api.ts` — `stock_layers_supported()`, `get_stock_layers()`.
- `api/movementSplit.api.ts` — `movement_split_supported()`.
- `api/transferDestinations.api.ts` — `get_transfer_destinations()` with the
  documented fallback to the warehouse list.
- `api/documentEditImpact.api.ts` — `document_edit_impact()`.
- `api/postMovementDocument.api.ts` — the four post RPCs and
  `correct_document`, each consulting `mutationGuard` first.
- Widen `lib/mutationGuard.ts` with `op.post`, `op.post-transfer`,
  `op.correct`, `op.layer-post`. (M7-122)
- Extend `api/partners.api.ts` if the active-partner read is not already
  sufficient. Apply the same partial-page rule to every core read.

**No API module may be written against the documentation.** Every signature was
read from `production-functions-2026-09-03.json`; if anything looks different
at implementation time, re-read the capture rather than trusting this plan.

### T4 — Store

`store/operation.store.ts` holding the legacy `OP`, `BW`, `EL`, `DLP`/`BLP`
state in one place:

- kind, header, lines, pick, condSplit, editDoc, restoredAt, requestKey;
- bulk selection/split/lots/values/note/icareOk;
- edit-line working copy; layer-picker state for both entry points;
- `load()` — **atomic over the five core reads only** (`items`, `movements`,
  `warehouses`, `partners`, `stock_conditions`), with the four optional probes
  loaded separately into their own readiness flags, exactly as the matrix
  prescribes. A core failure yields `loaded:false` and an explicit error; no
  partial dataset is ever committed;
- a failed **refresh** after a good load keeps the previous snapshot and shows
  the error in the footer (Phase 6 `M6-S3`), and never renders the empty-result
  state (Phase 6 `A01`);
- `prefill(code)` for `M5-55`;
- `enterEditMode(impact)` / `exitEditMode()`;
- draft save on every line mutation, restore on boot;
- request-key invalidation on every mutation (M7-106) and the in-flight lock
  (M7-108, Q5);
- posting gated exclusively through `canPost` from `T2b`.

### T5 — Page and form

`pages/NewOperationPage.tsx`, `components/operation/OperationForm.tsx`,
`ItemStatePanel.tsx`, `DraftLinesPanel.tsx`, `LoadErrorState.tsx`.
Page-scoped Realtime on `['items','movements','warehouses']`, with a test
asserting the draft survives a refresh (M7-119).

### T6 — Dialogs

`EditLineDialog`, `BulkPickDialog`, `LayerPickDialog`, `IcareConfirmDialog`,
`QaimeConflictDialog`, `PostConfirmDialog`, `ClearLinesDialog`,
`EditModeBanner`. Every gate implemented twice where the original does so
(disabled button AND an independent refusal in the handler) — the Phase 5
`A02`/`A03` precedent.

### T6b — «Yeni mal yarat» transition (audit `A03`)

Rows `M7-21a`…`M7-21e`. **Reuses the Phase 5 `ItemFormDialog`; no item-creation
logic is reimplemented.**

- Add one additive optional prop `presetName?: string` (default `''`) to
  `ItemFormDialog`, consumed only where legacy consumes it — the initial name
  value when `item === null`. Editing ignores it, as legacy does. Every
  existing call site and test is unaffected; a test pins that.
- Wire the combobox link: renders only with `item.add`, only in the "not found"
  branch; the click closes the result list and opens the dialog with
  `item={null}` and the **untrimmed** current search text as `presetName`
  (legacy passes `inp.value` verbatim).
- Permission and the localhost guard come from the reused dialog. Phase 7 adds
  no second gate that could disagree with it.
- On success: reload items, close, and leave the operation form's header, draft
  lines and search text intact; the new item is then selectable.
- On refusal: the dialog stays open with input preserved; the operation form's
  state is untouched.
- Tests: preset name reaches the field; the link is hidden without `item.add`;
  the guard blocks on localhost without the opt-in; items reload after success;
  state preserved after both success and refusal; the no-active-units refusal
  still fires.

### T7 — Navigation and the `M5-55` transition

- `App.tsx`: an `op` entry in the «Əməliyyat» group, above the migrated
  «Bazalar» group, matching the original rail order (250-252).
- `ItemCard`'s «Bu mal üzrə əməliyyat» loses `disabled` and the tooltip **in
  this commit only**, and calls `prefill(code)` + navigation.
- Tests assert the item, unit, balance panel and condition split are all
  populated after the transition — navigation alone fails the row.

### T8 — Regression pinning

Tests that must be **verified to fail** against a plausible wrong
implementation before being kept:

| Pinned behaviour | Wrong implementation it catches |
|---|---|
| Partial `movements` page failure is fatal | a straight port of `fetchAll` |
| `stock_conditions` failure refuses the post | a straight port, where the split silently vanishes |
| `canPost` is the single gate | per-button ad-hoc conditions |
| Bulk apply rollback (`OP.lines.length = base`) | pushing inside the loop |
| Qaimé two-leg collection | taking the first matching row |
| `icareExposure` cumulative `alreadyTaken` | per-line independent calculation |
| Split cut mismatch rejects rather than trims | applying `v.q` blindly |
| `condSplitPayload` omits `normal` | sending every bucket |
| Stale re-check adds the edit restore ONCE per key | adding it per line |
| Item state panel ignores pending lines | reusing the combobox's availability |
| Draft cleared (not written) in edit mode | uniform draft saving |
| İcarə marker stripped before re-append | plain concatenation |
| `mv` exposure uses the source warehouse | using `w2` |
| Post button locked while in flight | relying on the dialog closing |
| `D-H1` narrowing applies to anbardar only | narrowing admin too |
| `presetName` ignored when editing | seeding the name on edit as well |

### T9 — Checks and documentation

`npm test`, `typecheck`, `oxlint`, `build`, `git diff --check`. Update registry
rows to `CODE VERIFIED` **only where evidence exists**, update
`CLAUDE_HANDOFF.md`, and report `DONE` for the Codex audit.

### T10 — The single live gate (test project only)

Runs **only after T1-T9 are complete**, i.e. after every posting route exists.
Per-write user approval at the moment of each write. This is the only point at
which any row may become `LIVE VERIFIED`.

---

## Server refusals to reproduce faithfully

Each must surface as a toast carrying the server message, with the draft lines
left untouched.

**`post_movement_document`** — no session · profile missing/inactive · role not
admin/anbardar · empty lines · invalid type · missing date/warehouse · unknown
warehouse · unknown item · outbound «İcarə» · anbardar warehouse mismatch ·
non-numeric quantities · in/out XOR violation · a split on an inbound line ·
insufficient balance · duplicate `doc_num`.

**`post_transfer_document`** — the same session/role/date/warehouse/item checks
· source = destination · **anbardar source ≠ own warehouse** · **anbardar
destination = «Ofis»** · insufficient balance · duplicate `doc_num`.
(After `D-H1` the client no longer offers the two anbardar cases, but the
handling stays — an admin-to-anbardar role change mid-session, or a stale tab,
can still reach them.)

**`post_layer_*`** — the above plus: missing request key · reused key with a
different payload · layers inactive · unsupported outbound type · missing
allocations · malformed final amount.

**`correct_document`** — non-admin · missing document · missing reason · empty
lines · not editable (with the block list) · type not correctable · direction
flip · mixed types.

**`document_edit_impact`** — non-admin · unknown document.

**`trg_guard_movement_labels`** — a channel or partner that is no longer active
in the directories. The client cannot pre-empt this; the message tells the user
to refresh.

**`get_stock_layers`** — layers inactive · an anbardar reading another
warehouse.

---

## Isolated-test scenarios (project `alkjjbaawmsirsfvqljm` only)

All of these run at `T10`, not earlier, and each needs per-write approval at
the moment it runs. Nothing here touches `bbjmhaerssakbreykxiw`.

1. Admin inbound «Satınalma» with price, channel, contract and Qaimə № — one
   document, correct balance and last-purchase price effect.
2. Admin inbound «İcarə» — the İcarədə figure rises.
3. Admin outbound «Silinmə» via the single form.
4. Admin outbound «Qaytarma» of rented goods — the İcarədə figure falls, and
   the İcarə confirmation dialog does NOT appear.
5. Outbound exceeding free stock but within total — the İcarə dialog appears,
   the reason lands in the note, and the server logs the exposure.
6. Transfer between two warehouses — two legs, both with the same Qaimə №, the
   declined partner labels correct.
7. Group write-off through «Malları seç» — several lines, one document.
8. Multi-item transfer through «Malları seç».
9. Qaimé № reuse with a different date — hard block, nothing written.
10. Qaimé № reuse with the same date and counterparty — allowed.
11. A deliberately failed post (invalid warehouse, or a hidden channel) — the
    lines survive, the message is verbatim.
12. Duplicate submit: click post twice rapidly — assert the in-flight lock and,
    on the non-layer path, confirm honestly whether one or two documents were
    created.
13. Document correction end to end via `correct_document` — old cancelled, new
    written, audit row present, reason recorded.
14. `M5-55`: open an item card, press «Bu mal üzrə əməliyyat», and confirm the
    form arrives pre-filled — item, unit, balance panel, split.
15. **«Yeni mal yarat»**: type an unknown name in the combobox, follow the link,
    confirm the name is preset, create the item, confirm the list reloads and
    the item becomes selectable with the draft lines intact.
16. **Load-failure behaviour**: with a deliberately broken core read, confirm
    the load-error state and that no post is possible; then a broken optional
    probe, and confirm the screen still works. (Also clears Phase 6's
    outstanding deliberately-failed-read check.)

**anbardar scenarios** (need a non-admin test fixture, which also clears a
Phase 6 debt): warehouse scoping in the picker under `D-H1` — the group-sibling
warehouse and «Ofis» are **not offered**; a direct attempt at either (stale
state) is still refused by the server; and an attempt at an «Əvvələ qalıq» +
«Anbar qalığı» line, which will confirm or refute H-D2 empirically.

Layer-mode scenarios run only if `T1` found layers activatable in the test
project; otherwise the layer rows stay `CODE VERIFIED` with that stated
explicitly, per Q2.

---

## What this phase does NOT do

- No SQL, RPC, schema, RLS or trigger change. The H-D2 preflight is read-only
  and is not executed against production; the proposed server migration is a
  separate approval.
- No production write, no root `index.html` edit, no push, no deploy.
- No reduced movements screen (Q6) — the edit-mode contract is exposed for
  Phase 8 instead.
- No recent-document duplicate heuristic (Q5).
- No `xlsx` change; no import/export path added.
- No shell-wide sync-indicator refactor (still deferred).
- No visual-backlog work (`V-01…V-03` remain deferred).
- No duplication of the Phase 5 item-creation implementation (`T6b`).
- Existing working-tree changes are preserved; nothing is committed or staged.
