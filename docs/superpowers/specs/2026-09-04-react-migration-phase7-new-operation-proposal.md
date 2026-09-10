# Phase 7 proposal — «Yeni əməliyyat», FULL legacy parity (Module H)

**Status: PROPOSAL — research only. No application code written.**
Date: 2026-09-04. Branch `react-migration`. Behavioural reference
`origin/main:index.html`; every bare line number below is that file.

**Revision 2 (2026-09-04)** — corrected after the Codex design audit
[`audits/2026-09-04-phase7-design-codex-audit.md`](../audits/2026-09-04-phase7-design-codex-audit.md)
returned CHANGES REQUIRED with four findings. All four are addressed: `A01` in
§3 and §10 (Q1), `A02` in the new §5 load/readiness matrix, `A03` in §6 and
rows `M7-21a`…`M7-21e`, `A04` in §7. The research from revision 1 — RPC
contracts, divergences, rule verification — is preserved unchanged; nothing
that the audit called sound was rewritten.

Governed by [`ANBAR_REACT_MIGRATION_PRINCIPLES.md`](../ANBAR_REACT_MIGRATION_PRINCIPLES.md)
and [`ANBAR_FUNCTIONAL_PARITY_REGISTRY.md`](../ANBAR_FUNCTIONAL_PARITY_REGISTRY.md).
Registry rows: [`2026-09-04-phase7-registry-rows.md`](2026-09-04-phase7-registry-rows.md).
Implementation plan: [`../plans/2026-09-04-react-migration-phase7-new-operation.md`](../plans/2026-09-04-react-migration-phase7-new-operation.md).

Sources actually read: the four required documents, the design audit, the
`op`/movement/cancellation/balance/role sections of `origin/main:index.html`
(lines 248-321, 625-660, 691-730, 831-1017, 1249-1317, 1887-1888, 1915-1935,
2060-2155, 3185-3990, 4034-4560, 4560-4870, 5012-5210, 5565-5580), the existing
React `api/`, `lib/`, `store/`, `pages/`, `components/` tree, and the read-only
live capture `production-functions-2026-09-03.json` +
`production-schema-2026-09-03.json`. **No connection was opened to
`bbjmhaerssakbreykxiw` and nothing was written anywhere.**

---

## 1. Scope

The complete legacy `Yeni əməliyyat` screen (`#p-op`, 295-318) and everything
that belongs to it. Nothing is reduced to a subset.

**In scope**

- The three tabs and every operation type they expose:
  `in` → Satınalma · Qaytarma · İcarə · Əvvələ qalıq;
  `out` → Sahəyə · Silinmə · Satış · Qaytarma;
  `mv` → Yerdəyişmə. (`OP_TYPES`, 3208.)
- Header fields per tab: date, type, warehouse / route (`o-wh`, `o-wh2`),
  counterparty (`o-p`), purchase channel (`o-ch`), contract № (`o-ct`),
  Qaimə № (`o-iv`), note (`o-note`); the conditional field matrix at 3262-3300.
- Item combobox with the outbound stock filter, the **«Yeni mal yarat»
  transition** (§6) and the item-state panel (`#op-state`, 3444-3451).
- Condition split (`Tiplərə görə bölgü`) in both the single-item form
  (`renderOpCondSplit`, 3413-3442) and the bulk dialog.
- The draft-lines document panel: add, edit, remove, clear, totals
  (`renderLines`, 3717-3763; `editLine`/`saveEditLine`, 3863-3992).
- Local draft persistence and restoration (`localStorage`, 3765-3833).
- The `Malları seç` bulk dialog in BOTH modes — group write-off (`wo`) and
  multi-item transfer (`mv`) — including select-all, per-bucket quantities,
  search, totals and the readiness gate (4034-4560).
- Stock-layer (`partiya`) selection dialogs, both single-line
  (`openDraftLineLayers`, 3672-3716) and bulk (`bulkLayerOpen`, 4318-4403),
  with the Admin final-amount override. **Implemented in this phase, not
  deferred** (Q2, and the reason is `A01` — see §3).
- Balance checks, İcarə exposure confirmation, Qaimə № conflict blocking.
- Document-edit mode (`OP.editDoc`) entered from `documentCancelView`
  (5150-5205) and its banner, cancel and `correct_document` posting path.
- Posting: confirmation dialogs, the stale-response re-check, all four write
  RPCs, request-key idempotency, refusal handling, post-success reload.
- Permissions and role restrictions, client and server.
- The `prefillOp` transition from Nomenklatura — this is what unblocks
  **`M5-55`** (§8).
- Realtime and audit-log consequences.

**Out of scope** (unchanged by this phase, stated so it is not assumed)

- `Mal hərəkəti` (`#p-mov`) as a screen, its filters, exports and batch
  cancellation UI. Phase 7 implements the edit-mode **contract** and exposes it
  for Phase 8 (Q6); it does **not** add a reduced movements list to reach it.
- `documentCancelView` / `transferDocView` / `legacyCancelView` themselves,
  `replaceItemDialog`, `cancel_*` RPCs. Phase 7 consumes `document_edit_impact`
  only to *load* an edit, and never cancels anything on its own.
- `nreq`, `sm` (Sərfiyyat), `azp`, dashboards, reports.
- The deferred visual backlog `V-01…V-03`.

---

## 2. Entities, contracts and rules confirmed by research

### 2.1 Server RPC contracts — read from the live capture, not from docs

| RPC | Live signature | Notes that change the client |
|---|---|---|
| `post_movement_document` | `(p_lines jsonb, p_doc_num text DEFAULT NULL)` | Legacy calls it with `{p_lines}` only. **No request key** — no server-side idempotency on this path. |
| `post_transfer_document` | `(p_lines jsonb, p_doc_num text DEFAULT NULL)` | Same: **no request key**. Writes BOTH legs itself, partner text `"<dst> anbarına"` / `"<src> anbarı"`. |
| `post_layer_movement_document` | `(p_lines jsonb, p_request_key uuid, p_doc_num text DEFAULT NULL)` | Idempotent via `stock_layer_requests`; a reused key with a **different payload** raises «Eyni sorğu açarı fərqli məlumatla istifadə edilib». Accepted types restricted to `Silinmə/Sahəyə/Satış/Qaytarma`. |
| `post_layer_transfer_document` | `(p_lines jsonb, p_request_key uuid, p_doc_num text DEFAULT NULL)` | Same idempotency contract. |
| `correct_document` | `(p_doc_num text, p_lines jsonb, p_reason text, p_reversal_date date DEFAULT CURRENT_DATE)` | Legacy passes three args; the fourth defaults. **Admin only.** Internally: `document_edit_impact` gate → `cancel_document` → `post_movement_document` → `audit_log` row, in one transaction. Appends `« · Əvəz edir: <doc>»` to every note itself. Refuses mixed types and a direction flip. |
| `document_edit_impact` | `(p_doc_num text)` | **Admin only** — raises for anbardar. Returns `editable`, `blocks[]`, `lines[]`, `type`, `direction`. |
| `get_stock_layers` | `(p_warehouse text, p_item_code text)` | Raises when layers are inactive, and for an anbardar reading another warehouse. |
| `stock_layers_supported` | `()` → `{version, active, cutover_at}` | Drives `DB.layerActive`. |
| `movement_split_supported` | `()` → `TRUE` | **Live value is `TRUE`.** `DB.splitReady` is therefore true in production; the `SPLIT_UNSUPPORTED_MSG` path is a fallback, not the normal state. |
| `get_transfer_destinations` | `()` → `text[]` | Admin/anbardar only; active `anbar` warehouses, ordered by name. Falls back to `DB.whs` on failure (1010-1011). |

Server-side refusals every write path can produce, with their exact Azerbaijani
messages, are enumerated in the plan §Server refusals. They must surface as the
original surfaces them — a toast carrying `err.message`, lines untouched.

### 2.2 Two divergences found during research

**H-D1 · anbardar transfer scope: the client is WIDER than the server.**
`sourceWarehouses()` (720-723) lets an anbardar pick any warehouse in their
source group (Astara↔Harmony), and `validateOpLine` (3581-3583) accepts it. The
live `post_transfer_document` requires `source = current_user_warehouse()`
exactly, and additionally **forbids `dest = 'Ofis'` for anbardar** — a rule that
exists in no repository file. The function body carries a transcription note
dated 2026-08-22 saying the live rule outranks `sql/007`, which is wrong in the
repo. Consequence today: an Astara anbardar can build a Harmony-sourced transfer
in the form and is refused only at post time.

**Decision (Q3, revision 2): narrow the client to the live server contract, as
an explicit approved deviation `D-H1`.** An option the server will always
refuse is not useful behaviour — it is a dead end that costs the user a full
form. The picker therefore offers an anbardar only their own warehouse as
source, and excludes «Ofis» from their destination list. This is recorded as a
deviation, not slipped in: it is the one place where Phase 7 deliberately does
not reproduce the legacy client. **No SQL is changed** — the server rule is
already the stricter one, so narrowing the client can never permit a write the
server would refuse; it only removes choices that already fail. Admin behaviour
is untouched. Rows `M7-08`, `M7-33` and `M7-118` carry it, and a test pins both
halves (anbardar narrowed, admin unchanged).

**H-D2 · the initial-balance restriction is client-only in production.**
`isInitialBalanceLine` (1926) blocks «Əvvələ qalıq» + «Anbar qalığı» for
non-admins in `validateOpLine` (3592-3594) and again in `postOpDocument`
(4695-4698), with comments citing `sql/016_initial_balance_admin_only.sql` as
the binding server rule, and CLAUDE.md §12 states the same. **In the
2026-09-03 live capture no function or trigger mentions «Anbar qalığı»,** and
`post_movement_document` contains no such check; `movements` carries only
`trg_stock_layer_movement`, `movements_audit` and `trg_guard_movement_labels`.
So an anbardar posting such a line through a direct RPC call would not be
refused by the database.

**Decision (Q4, revision 2): preserve the client restriction exactly, design a
read-only preflight, record server enforcement as a separate future
migration.** Both client checks are ported verbatim and described honestly as
client-side. The plan's `T1b` designs a **read-only** preflight query that
counts existing non-admin-created initial-balance rows; it contains no DDL,
DML, GRANT or REVOKE outside comments (CLAUDE.md §7). **No SQL is applied in
Phase 7.** The proposed server migration is written up for separate approval
and is explicitly out of this phase's scope.

### 2.3 Rules that look like defects but are intentional — verified

- `bareWh()` strips the ` anbarına`/` anbarı` suffix before comparing Qaimə №
  partners, because a transfer document's two legs carry *different* partner
  text (3527-3531). Both legs are collected per `doc_num`, and ANY matching
  line makes the reuse legitimate (3552-3557) — deliberately not "first row".
- `condSplitPayload` omits `normal` on purpose: the server derives it
  (2121-2128). Sending it would create a second source of truth.
- The İcarə marker is stripped from the note before being re-appended
  (`ICARE_USE_RE`, 4676-4680), because the user can confirm the İcarə dialog and
  then cancel the post dialog.
- The bulk dialog's «Silinmə» mode does **not** write directly any more
  (comment `<<2026-08-24 fix>>`, 4494-4498); both modes only append draft lines.
  Any description of group write-off as a direct atomic write is stale.
- `renderItemBalance` reads `IX.bal` and deliberately ignores pending draft
  lines (3444-3446), while the combobox filter and `bulkWriteOffRows` DO
  subtract pending. Both are correct as written; do not unify them.

### 2.4 Data the screen reads

`items`, `movements` (via the operational filter), `warehouses`, `partners`,
`reference_values` (channels), `stock_conditions`, and — only in layer mode —
`stock_layers` through `get_stock_layers`. Which of these are fatal and which
are optional is settled in §5, not left implicit.

---

## 3. Phase boundary — one Module H (audit `A01`)

Revision 1 proposed splitting the phase at a 7a/7b seam with posting in 7a and
stock layers in 7b. **That seam is withdrawn.** The audit is right: when
`stock_layers_supported().active === true`, the legacy screen routes every
outbound and transfer post through the layer-aware selection and RPCs
(4800-4856). A 7a without those paths would either post outbound documents
through the wrong route or refuse them — in both cases it is not posting
parity, and a live-write pass on it would certify something the platform does
not do.

**Corrected boundary:**

- **Module H is ONE acceptance boundary.** Nothing in it reaches `ACCEPTED`
  until the whole screen exists, including every layer path.
- Implementation MAY be divided into short milestones, and each milestone MAY
  run in its own chat to control context. That is a working convenience with
  **no status meaning whatsoever.**
- **No milestone may be described as accepted, live verified, or as complete
  posting parity.** A finished milestone yields `CODE VERIFIED` rows at most,
  and only for rows whose own evidence exists.
- **No live write of any kind may be executed until every posting route —
  `post_movement_document`, `post_transfer_document`,
  `post_layer_movement_document`, `post_layer_transfer_document` and
  `correct_document` — is implemented.** The isolated-test scenarios in the
  plan are a single gate that opens once, at the end, not per milestone.

The milestone division is recorded in the plan §Milestones purely as a
sequencing aid.

---

## 4. Architecture

Follows the established phase shape: pure logic in `lib/`, all Supabase behind
`api/`, one Zustand store, one page plus dialog components.

```
lib/
  opTypes.ts            OP_TYPES, tab→type matrix, isWoOut/isMvPick
  opLineValidation.ts   validateOpLine() — the SINGLE validation source
  opReadiness.ts        the load/readiness matrix and the post-eligibility gate
  opDraft.ts            draft serialise/restore, TTL, permission re-filter
  qaimeConflict.ts      normKey, bareWh, qaimeConflict, documentQaimeConflict
  icareExposure.ts      icareQtyOf, icareExposure, icareExposedLines, markers
  condSplit.ts          COND_COLS, condBuckets, condPending, condSplitZero/
                        Sum/Check/Payload, SPLIT_UNSUPPORTED_MSG
  bulkWriteOff.ts       bulkWriteOffRows/Filtered/Summary, bwSelectRow
  layerAllocation.ts    draftLayerCalc/bulkLayerCalc, allocation totals
  opPayload.ts          OP.lines → the four RPC payload shapes
api/
  stockConditions.api.ts   read stock_conditions
  partners.api.ts          (exists) — widen if needed
  stockLayers.api.ts       stock_layers_supported, get_stock_layers
  movementSplit.api.ts     movement_split_supported
  transferDestinations.api.ts  get_transfer_destinations
  postMovementDocument.api.ts  the four post RPCs + correct_document
  documentEditImpact.api.ts    document_edit_impact
store/
  operation.store.ts    OP + BW + EL + DLP/BLP state, draft, kind, editDoc
pages/
  NewOperationPage.tsx
components/operation/
  OperationForm.tsx  DraftLinesPanel.tsx  ItemStatePanel.tsx
  EditLineDialog.tsx  BulkPickDialog.tsx  LayerPickDialog.tsx
  IcareConfirmDialog.tsx  QaimeConflictDialog.tsx  PostConfirmDialog.tsx
  ClearLinesDialog.tsx  EditModeBanner.tsx  LoadErrorState.tsx
```

**Reused unchanged:** `lib/roles.ts`, `lib/warehouseScope.ts`,
`lib/operationalMovements.ts`, `lib/itemIndex.ts` (`bal`), `lib/format.ts`
(`nf`/`money`), `lib/mutationGuard.ts`, `api/items.api.ts`,
`api/itemMovements.api.ts`, `api/warehouses.api.ts`,
`api/referenceValues.api.ts`, `api/itemWrite.api.ts`, `components/ui/*`,
`components/nomenclature/ItemFormDialog.tsx` (§6), `store/toast.store.ts`.

**`mutationGuard` must be widened** with the Phase 7 write actions
(`op.post`, `op.post-transfer`, `op.correct`, `op.layer-post`). This is the
first phase whose writes create *movements*, so the localhost guard matters
more here than anywhere before. The item-creation actions (`item.create`) are
already covered and are reused, not re-added (§6).

**Realtime:** page-scoped, `['items', 'movements', 'warehouses']`, the Q2
pattern from Phase 6. Only `movements` is actually in the live
`supabase_realtime` publication, so `items`/`warehouses` subscriptions are
inert but harmless and are kept for symmetry with the ported pages. No
`audit_log` subscription (Phase 4 Q3). A refresh must NOT clobber the draft:
`OP.lines` survives a Realtime reload, exactly as the legacy `loadFromDB()`
leaves `OP.lines` alone.

---

## 5. Load and readiness matrix (audit `A02`)

Revision 1 said `load()` was atomic across seven reads while also saying the
capability probes degrade gracefully. Both cannot be true. The legacy loader
settles it, and the resolution below follows it.

### 5.1 What the legacy loader actually does

`loadFromDB()` (864-1017) has two distinct tiers:

- **Tier 1, one `Promise.all`:** `items`, `partners`, `warehouses`,
  `movements` (867-872). These go through `fetchAll()`, which on error logs,
  toasts «Yükləmə xətası: <table>», sets `LOAD_ERR` and **breaks out of the
  paging loop, returning the rows gathered so far** (855). `loadFromDB` then
  returns `{ok: !LOAD_ERR, error: LOAD_ERR}` (1017).
- **Tier 2, each in its own try/catch with a readiness flag:** `item_requests`
  (889-903), `stock_conditions` → `DB.condsReady` (908-923),
  `movement_split_supported` → `DB.splitReady` (928-932),
  `stock_layers_supported` → `DB.layerActive` (949-975),
  `get_user_directory` (976-982), `get_reference_values` → `DB.refs.ready`
  (995-1004), `get_transfer_destinations` (1006-1011).

Two consequences of the legacy design are safety-relevant and are **not**
reproduced blindly:

1. **A partial tier-1 read still reaches the balance index.** `fetchAll`
   returns the truncated array, so a `movements` failure on page 3 of 5 yields
   a balance built from 60 % of the movements — every availability check then
   overstates stock. The screen's own refresh callers (4768, 4863) ignore the
   returned `ok` flag entirely.
2. **A failed `stock_conditions` read silently disables the condition split.**
   `condsReady` gates only `canEditCond()` (2149), *not* `condBuckets()`
   (2087). With `DB.conds` empty, `condOf()` returns null, every bucket is 0,
   `marked` is false, the split UI never renders, and the entire quantity posts
   as `normal` — quietly moving rented or unfit stock as if it were free. This
   is the precise "missing dependency permits an unsafe post" case the audit
   asks to be proven impossible.

Both are pre-existing legacy weaknesses, not new ones. Per principles §7 they
are **documented and corrected here rather than copied**, because copying them
would knowingly ship a wrong-write path in a phase whose entire subject is
writes. Both corrections are recorded as safety rows (`M7-S2`, `M7-S3`), and
each is paired with a test proving the unsafe post is refused. Neither changes
any calculation, permission, document or Excel output — they only convert a
silent wrong answer into a visible refusal.

### 5.2 The matrix

| Read | Tier | Failure is | Degraded UI | Posting |
|---|---|---|---|---|
| `items` | core | **FATAL** | `LoadErrorState` — «Məlumat yüklənmədi» + the real error; no form, no lines table | Blocked |
| `movements` | core | **FATAL** | same | Blocked |
| `warehouses` | core | **FATAL** | same | Blocked |
| `partners` | core | **FATAL** | same | Blocked |
| `stock_conditions` | core-for-writes | **FATAL** (`M7-S2`, correction) | same | Blocked |
| `get_reference_values` | optional | non-fatal, established fallback | Channel list falls back to `DEFAULT_CHANNELS` ∪ observed channels (3211-3217); a "ready but empty" directory stays empty — failure ≠ empty (Phase 5 `A14`) | Allowed |
| `movement_split_supported` | optional probe | non-fatal | `splitReady = false`; the split UI still renders from `stock_conditions` | Allowed for lines with **no** split; a line carrying a split is refused with `SPLIT_UNSUPPORTED_MSG` (2129-2133, 4799, 4835) |
| `stock_layers_supported` | optional probe | non-fatal | `layerActive = false`; the pre-layer flow runs, exactly as legacy (949-975) | Allowed on the non-layer routes |
| `get_transfer_destinations` | optional | non-fatal, established fallback | Destination list falls back to the warehouse list (1006-1011) | Allowed; the server re-checks the destination anyway |
| `get_stock_layers` | on-demand | non-fatal, per-dialog | The layer dialog shows «Partiyalar yüklənmədi: <error>» and does not open | That line cannot be added; other lines unaffected |

**Why `stock_conditions` is fatal here and optional in legacy.** Legacy treats
it as a display concern; on this screen it is an input to a *write decision*.
Its absence does not blank a column — it changes what is posted, from an
explicit bucket split to an implicit all-normal one. The alternative to fatal
would be to keep loading but refuse every out/mv post, which is a worse user
experience for the same outcome. Inbound-only documents are unaffected in
either design, but the read is cheap and a split screen state ("you may post
in, not out") invites exactly the confusion this matrix exists to remove.

### 5.3 Rules the matrix imposes

- `load()` is **atomic over the five core reads only.** Any of them failing —
  including a *partial* page failure — yields `loaded: false` and an explicit
  error. No partial dataset is ever committed to the store.
- Every core read must absorb **both** failure shapes, a returned `{error}` and
  a rejected promise (the Phase 3a rule).
- Tier-2 failures never set the page-level error and never block rendering.
  Each writes its own readiness flag.
- **A failed refresh after a good load keeps the previous snapshot** and shows
  the error in the footer — the Phase 6 `M6-S3` behaviour. It must not blank a
  working screen, and it must not silently continue on stale data at post time:
  the stale-response re-check (`M7-96`) is what covers that.
- **`canPost` is a single derived predicate**, not a set of scattered
  conditions: `loaded && !coreError && can(me,'mv.add') && lines.length > 0 &&
  !inFlight && splitEligible(lines) && layerEligible(lines)`. Every button and
  every handler consults the same predicate, so no UI path can reach a post
  that the matrix forbids.

### 5.4 Tests the matrix requires

Rows `M7-S1`…`M7-S6`, each with a case verified to fail against a naive
implementation:

- each core read failing individually → load-error state, no form, `canPost`
  false;
- a **partial** `movements` page failure → treated as fatal, not as a smaller
  dataset (this is the one that fails against a straight port of `fetchAll`);
- `stock_conditions` failing → refusal, **not** a silent all-normal post (fails
  against a straight port, where the split simply disappears);
- each optional probe failing → screen renders, posting still allowed on the
  paths that do not need it;
- `splitReady` false + a split-carrying line → refused with the exact message;
- a failed refresh after a good load → rows retained, error in the footer, and
  the empty-result state NOT shown (the Phase 6 `A01` lesson).

---

## 6. «Yeni mal yarat» transition (audit `A03`)

Revision 1 covered only the empty-result text and the link's visibility. The
full legacy contract is at 3325 and 5565-5580.

`$('#o-new').onclick` does three things: `e.preventDefault()`, hides the result
list, and calls `editItem(null, inp.value)` — **the current search text becomes
the preset name of a new item.** `editItem` (5565) then:

- refuses without `item.add` via `need()` (5566);
- refuses with a toast when no active unit exists in the directory (5573);
- seeds the name field from `presetName` only when creating (5576);
- on success writes the item and the caller reloads.

**Phase 7 reuses the Phase 5 `ItemFormDialog` and does not reimplement any of
it.** That component already carries the localhost guard (`blockedReason`,
line 96), the `item.add`/`item.edit` permission split, the no-active-units
refusal (126-134), the create-vs-edit code rule, category/unit hidden-value
exceptions, and the never-close-on-failure contract. Duplicating any of that
would create a second item-creation path that could drift.

**The only change required is one additive optional prop, `presetName`,**
consumed exactly where the legacy `presetName` is consumed — the initial value
of the name field when `item === null`. It defaults to `''`, so every existing
call site and every existing test is unaffected. Editing is untouched: legacy
ignores `presetName` when `it` exists, and so must the prop.

Transition contract implemented by Phase 7:

1. The link renders only with `item.add` (3320), inside the "not found" branch
   only.
2. Clicking it closes the result list and opens `ItemFormDialog` with
   `item={null}` and `presetName={the current search text}` — untrimmed, as
   legacy passes `inp.value` verbatim.
3. Permission and the localhost guard are enforced **by the reused dialog**,
   and Phase 7 adds no second gate that could disagree with it.
4. On success: `onSaved(code)` reloads the item list, the dialog closes, and
   the operation form is still there with its header, its draft lines and the
   user's search text intact. The newly created item is then selectable.
5. On refusal: the dialog stays open with the input preserved (its existing
   contract), and the operation form's state — header, draft lines, picked item
   — is untouched.
6. Closing without saving returns to the form with nothing changed.

Rows `M7-21a`…`M7-21e` and plan task `T6b` carry this, with tests for the
preset name reaching the field, the permission gate, the guard, the reload, and
state preservation on both success and refusal.

---

## 7. Payload measurement (audit `A04`)

Revision 1 let `M6-40` stay a vague carried debt and gave `M7-123` a narrower
read list than the plan's own task. Both are now specified to the query, and
neither closes on a partial measurement.

**Method, identical for both rows:** each named read is executed once in the
isolated test project through the browser devtools Network panel with the cache
disabled; for every read record (a) the exact query, (b) row count returned,
(c) **transferred bytes** and **uncompressed bytes** as the panel reports them,
(d) the number of HTTP requests when the read pages. Paged reads are reported
per page and as a total. **A row stays open until every read in its own scope
is recorded.**

**`M6-40` — Phase 6 (Mal qrupları) scope.** Exactly the reads
`fetchItemGroupsSnapshot()` performs:

| # | Read |
|---|---|
| 1 | `items` — `code, name, unit, price, category`, ordered by `code`, paged 1000 |
| 2 | `movements` — the `itemMovements.api.ts` column list including `created_at`, ordered `date, created_at`, paged 1000 |
| 3 | `warehouses` — `select('*')`, paged 1000 |

**`M7-123` — Phase 7 incremental scope.** Reads 1-3 above are shared with
Phase 6 and are **not** re-measured; `M7-123` records the increment plus the
two shared totals by reference:

| # | Read |
|---|---|
| 4 | `partners` — `select('*')`, ordered by `name`, paged 1000 |
| 5 | `stock_conditions` — `select('*')`, paged 1000 |
| 6 | `get_reference_values()` — single RPC |
| 7 | `movement_split_supported()` — single RPC |
| 8 | `stock_layers_supported()` — single RPC |
| 9 | `get_transfer_destinations()` — single RPC |
| 10 | `get_stock_layers(warehouse, code)` — single RPC, measured once for a representative item, and reported as per-invocation cost since it is on-demand |

`M7-123` also records the **combined page-load total** for reads 1-9, since
that is the number that matters for this screen. Read 10 is excluded from that
total and reported separately.

---

## 8. How Phase 7 unblocks `M5-55`

`prefillOp(code)` (3452) is `OP.pick = code; go('op'); setTimeout(() =>
pickItem(code), 60)` — navigate **and** seed the in-memory selection. Phase 5
could not satisfy it with a link because the selection lives in `OP`, not in a
URL, so the button ships visibly disabled with a tooltip.

Phase 7 closes it as follows:

1. `operation.store.ts` exposes `prefill(code: string)` which sets `pick` and
   marks the form dirty, independently of any component being mounted.
2. `App.tsx` gains an `op` page; `ItemCard`'s button calls
   `useOperationStore.getState().prefill(code)` then `setPage('op')`.
3. `NewOperationPage` on mount applies a pending `pick` through the same
   `pickItem` logic the combobox uses — item name into the input, unit filled,
   price seeded when the tab is `in` and the field is empty, the balance panel
   rendered, the condition split rebuilt. That is the whole of `pickItem`
   (3390-3401), which is what makes it a real prefill rather than navigation.
4. The 60 ms `setTimeout` is a DOM-readiness workaround for the legacy
   re-render, not a business rule; React replaces it with a mount effect. This
   is an implementation difference with identical observable behaviour and is
   recorded as such, not as a deviation.
5. `M5-55` moves to `CODE VERIFIED` when tests cover it, and to
   `LIVE VERIFIED` only after the transition is exercised in the test
   environment end to end — per the registry's own wording, code alone must not
   close it. Under §3 that cannot happen before all of Module H exists.

The `ItemCard` tooltip and `disabled` attribute are removed **only** in the
commit that wires this, never earlier.

---

## 9. Write-path safety

- `VITE_ALLOW_LOCAL_WRITES` stays **unset** through implementation. Every write
  path is exercised against mocks.
- Live mutation testing happens ONLY in `alkjjbaawmsirsfvqljm`, started with
  `scripts/start-test-environment.ps1`, with per-write user approval, and only
  once **every** posting route exists (§3).
- Production `bbjmhaerssakbreykxiw` stays strictly read-only for the whole
  phase, including this research turn.
- No SQL, RPC, schema, root `index.html`, GitHub or Vercel change.

Dangerous write paths, ranked:

1. `post_movement_document` / `post_transfer_document` — **no request key, so a
   duplicated submit creates a duplicate document.** Protection is the legacy
   duplicate check plus an explicit in-flight lock (Q5). No recent-document
   guess is invented.
2. `correct_document` — cancels and re-posts. A failure leaves the original
   intact; a partial state is impossible (single transaction).
3. `post_layer_*` — idempotent, but a **payload change under a reused key is a
   hard refusal**, which is exactly why `invalidateOpRequestKey()` fires on
   every form input and every line mutation (3201, 3660, 3762, 3984).

---

## 10. Decisions in force (revision 2)

Set by the user 2026-09-04 after the design audit. Recorded here as decided,
not as open questions.

| # | Decision |
|---|---|
| **Q1** | **One Module H acceptance boundary**, implemented in short milestones (possibly separate chats) purely for context control. No milestone is ever described as accepted, live verified, or as complete posting parity. No live write before every posting route, layer paths included, exists. (§3) |
| **Q2** | **Implement all stock-layer paths now.** Live-test them only if the isolated test project exposes an active layer mode; if it does not, the layer rows stay `CODE VERIFIED` and say so explicitly. |
| **Q3** | **Narrow the anbardar warehouse picker to the live server contract** — own warehouse as transfer source, no «Ofis» destination — as the explicit migration deviation `D-H1`. **No SQL change.** (§2.2) |
| **Q4** | **Preserve the client-side initial-balance restriction**, add a **read-only** preflight design, and record server enforcement as a separate future migration. **No SQL applied in Phase 7.** (§2.2) |
| **Q5** | **Explicit in-flight submission lock**, alongside the preserved legacy duplicate check. No invented recent-document heuristic. |
| **Q6** | **Implement the edit-mode contract** needed by Phase 8 and expose it; do **not** create a reduced movement-list screen. |
| **Q7** | **`M7-` registry prefix**, with `M7-S…` reserved for safety corrections, as Phase 6 used `M6-S…`. |

---

## 11. Registry

All Phase 7 rows, under the `M7-` prefix (Module H), are tracked in
[`2026-09-04-phase7-registry-rows.md`](2026-09-04-phase7-registry-rows.md),
linked from the main registry rather than duplicated into it. Row status is
promoted only on evidence; see that file for current status.
