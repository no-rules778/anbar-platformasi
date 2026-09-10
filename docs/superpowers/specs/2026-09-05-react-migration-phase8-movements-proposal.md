# Phase 8 — «Mal hərəkəti» (Module I): research and proposal

**Status: PROPOSAL ONLY. NOTHING IMPLEMENTED.** No application code, SQL, RPC,
schema, Supabase data, `.env`, dependency, root `index.html`, GitHub, Vercel or
production state was changed while producing this document. No live Supabase
read or write was performed. The full test suite was not run.

Read with [`ANBAR_REACT_MIGRATION_PRINCIPLES.md`](../ANBAR_REACT_MIGRATION_PRINCIPLES.md)
and [`ANBAR_FUNCTIONAL_PARITY_REGISTRY.md`](../ANBAR_FUNCTIONAL_PARITY_REGISTRY.md).
Phase 7's proposal is [`2026-09-04-react-migration-phase7-new-operation-proposal.md`](2026-09-04-react-migration-phase7-new-operation-proposal.md);
its row ledger is [`2026-09-04-phase7-registry-rows.md`](2026-09-04-phase7-registry-rows.md).

---

## 0. Phase 7 statuses this document preserves

Phase 8 changes **no** Phase 7 status. Restated so a later reader cannot infer
otherwise from anything below:

- **`M7-S3` is `LIVE VERIFIED`** for its TEST failure-and-recovery path only.
- **Phase 7 remains INCOMPLETE / NOT ACCEPTED.** Module H is ONE acceptance
  boundary and is not closed.
- **Live scenario `S-6` remains BLOCKED as a server/RPC gap.** It is the
  condition-split transfer scenario, blocked by the `apply_cond_split` →
  `apply_cond_delta` → `log_icare_exposure` call-order defect
  (`test-environment/2026-09-05-phase7-remaining-live-verification-plan.md`
  §0.-2). Phase 8 does not close it and must not be described as closing it.
  **`S-6` is a live scenario id, NOT registry row `M7-S6`** — see the next
  bullet; conflating them was an error in this proposal's first revision.
- **Registry row `M7-S6` ("failed refresh keeps the snapshot") is
  `CODE VERIFIED` (H-2) and is NOT blocked.** It is an unrelated row and Phase 8
  does not change it.
- `M7-120` stays `LIVE VERIFIED` for the ordinary movement-INSERT consequence
  ONLY; `correct_document` and İcarə audit paths stay OPEN.
- `M7-123` remains OPEN. `M7-96` keeps its H-4 status. `M7-118` stays
  `CODE VERIFIED` against mocks.
- `M7-109` stays `IN PROGRESS`: its API and store half is `CODE VERIFIED`, and
  its **caller** is what Phase 8 delivers.

---

## 1. Why Phase 8 exists

Phase 7 built «Yeni əməliyyat» and every posting route, then stopped at a wall
that is structural, not accidental: **the platform's entire read-back,
inspection, cancellation and correction surface lives on «Mal hərəkəti»**, and
that screen was explicitly excluded from Phase 7 by decision Q6. The
consequences recorded in the H-3/H-4 handoff sections are direct:

- `M7-109`'s `document_edit_impact()` caller has no entry point, because
  `editPostedDocument()` is reached only from `documentCancelView()`, which is
  reached only from the movements row (`index.html:5506-5512`). H-4 correctly
  refused to invent a temporary navigation path.
- The correction WRITE (`correctDocument()`, `M7-97`) is wired and tested but
  unreachable.
- Every live reversal check is blocked: there is no migrated way to see a posted
  document, so a posted TEST document cannot be inspected or undone from React.

Phase 8's purpose is to migrate that screen and its document dialogs, so those
paths acquire a caller and the blocked live checks become executable.

## 2. Evidence base — what was read

Legacy (`index.html`, this repository's working copy):

| Concern | Lines |
|---|---|
| «Mal hərəkəti» section markup | 319-323 |
| `MF` filter state, `movKeyOptions`, `movFilters`, `rebuildMovPartnerOptions`, `searchableNote`, `movFiltered` | 1592-1676 |
| `cut` / `cutNote` (SHOW_MAX 3000) | 1677-1690 |
| `movementValuation`, `writeOffExportRows`, `xlsWriteOff` | 1701-1745 |
| `rMov()` — columns, KPI line, batch button, print, Silinmə export | 1789-1840 |
| `operationalMovements()` / `normalMovements()` | 1249-1270 |
| `go()` navigation gate | 1495-1512 |
| `data-goto` delegation | 1363 |
| `CANCELLABLE_TYPES` | 645 |
| Reversal/cancel markers, `docReversalDoc`, `docCancelledBy`, `isCancelDoc`, `isReversalDoc`, `cancelledDocFor`, `docRefsLine`, `rowReplacedOrCancelled`, `stripRowLevelCancelled` | 4868-4941 |
| `replaceItemDialog()` | 4942-5011 |
| `documentCancelView()` | 5012-5087 |
| `cancelRowDialog()` | 5088-5122 |
| `editPostedDocument()` + `EDIT_REPLACES_MARKER` | 5124-5205 |
| `transferDocView()` | 5209-5263 |
| `legacyCancelView()` | 5264-5285 |
| `legacyTransferCancelView()` | 5286-5308 |
| Batch cancellation: `BC`, `buildBatchDocs`, `batchCancelOpen`, `batchFilterDocs`, `batchCancelExecute` | 5309-5505 |
| `editMov()` dispatcher | 5506-5512 |
| `DB.layerActive` capability probe | 833, 949-957 |
| `DB.woVals` / `DB.woAllocs` load | 950-975 |

React (`web/src`): `App.tsx` (rail, internal switch, `prefill`→navigate),
`api/documentEditImpact.api.ts`, `api/postMovementDocument.api.ts`,
`api/itemMovements.api.ts`, `lib/operationalMovements.ts`, `lib/mutationGuard.ts`,
`lib/opStaleRecheck.ts`, `store/operation.store.ts`
(`EditDocState`, `enterEditMode`, `exitEditMode`, `inFlight`, `requestKey`,
`postDocument`, `load`/`refresh`), `hooks/useRealtimeRefresh.ts`.

**Not read, deliberately:** the full handoff, the full bug registry, chat
history, and the legacy file beyond the ranges above.

## 3. What Phase 8 covers

### 3.1 The «Mal hərəkəti» screen (full)

One registry page over `normalMovements()` — i.e. `excludeCancelled()`, already
ported at `lib/operationalMovements.ts` and reused, not reimplemented.

- **Columns (15, legacy order):** Tarix · Anbar · Kod · Malın adı (+ `ct` hint)
  · Növü (`TYPE_TAG`) · İstiqamət / Kontragent (+ `ləğv edilib` tag when
  `cancelledDocFor(m)`) · Kanal · Qaimə № · Giriş · Çıxış · Qiymət · Məbləğ ·
  Qeyd (40-char truncation with full `title`) · Qeyd edən · «Baxış» button.
- **Price/amount column rule (1796-1815):** for `Silinmə`, price is derived from
  `movementValuation(m)` (`final / out_qty`, 4 dp) and amount is `final` or `—`;
  otherwise price falls back `m.pr → item.price → 0` and amount is
  `(in+out) × price`. This needs `writeoff_valuations` — see §8 risk R2.
- **Filters:** free-text search, warehouse, type (the fixed 8-type list, not
  `CANCELLABLE_TYPES`), the grouped İstiqamət/kontragent select
  (`Yerdəyişmə marşrutları` / `Kontragentlər / layihələr` /
  `Tanınmayan / köhnə idxal`), date-from, date-to, reset. The
  option list is rebuilt from the currently filtered set excluding `MF.p`
  itself, and a now-invalid selection resets to empty rather than showing an
  empty result (1638-1655).
- **Search field composition (1668-1674):** code, item name, `m.p`,
  `movKeyText(m)`, type, invoice, contract and `searchableNote(note)` — the
  latter strips the `Mal əvəzləndi: X → Y` technical fragment so a code query
  cannot surface an unrelated item.
- **Sort:** `date desc`, then `ts desc`.
- **Soft cap:** 3000 rows with the «Hamısını göstər (N)» affordance
  (`cut`/`cutNote`).
- **Footer KPI line:** record count, total inbound, total outbound, inbound
  value.
- **Actions:** Excel, «Silinmə hesabatının ixracı» (enabled only when the type
  filter is exactly `Silinmə`, with the hint span otherwise), Çap,
  «Qrup üzrə ləğv» (Admin only, `display` toggled), and «Yeni əməliyyat».

### 3.2 Navigation to «Yeni əməliyyat»

Two directions, both real parity requirements:

1. **Rail entry «Mal hərəkəti»** is added to the `Əməliyyat` group, in legacy
   order — «Yeni əməliyyat» first, «Mal hərəkəti» second (`index.html:251-253`).
   Like «Yeni əməliyyat» it carries **no role gate**: the legacy `<a data-p="mov">`
   has neither an id nor a `display:none` rule, and `go()` has no `mov` branch
   (1495-1503). The screen is open; the actions inside it are gated.
2. **The «Yeni əməliyyat» button on the movements header** (`data-goto="op"`,
   321 + 1363) navigates to the operation screen with **no prefill and no state
   transfer** — it is a plain page switch.
3. **The correction transition** (§3.6) is the third, and is not a plain
   navigation: it seeds the operation store first and navigates second, the same
   ordering `App.tsx` already uses for the Nomenklatura `prefill` → navigate
   handoff.

Since `App.tsx`'s switch is a `useState` union, Phase 8 adds `'mov'` to
`MigratedPage` and lifts the navigate callback so a page can request another
page. **This is not a router introduction** — that would be an unapproved
architectural change; it is the existing switch with one more member.

### 3.3 Document details

`editMov(id)` is a **four-way dispatcher** (5506-5512) and Phase 8 must keep
exactly that shape:

| Row | Has `doc_num` | View |
|---|---|---|
| `Yerdəyişmə` | yes | `transferDocView` |
| `Yerdəyişmə` | no | `legacyTransferCancelView` |
| type ∈ `CANCELLABLE_TYPES` | yes | `documentCancelView` |
| type ∈ `CANCELLABLE_TYPES` | no | `legacyCancelView` |
| anything else | — | toast: posted records are immutable |

`CANCELLABLE_TYPES` = `Satınalma, Əvvələ qalıq, Qaytarma, İcarə, Silinmə,
Sahəyə, Satış` (645). Note it does **not** contain `Yerdəyişmə`, which is why the
transfer family is separate rather than a branch.

`documentCancelView` shows: item name, line count, `qeyd edən`, the
`docRefsLine` (manual Qaimə № and Müqavilə №, explicitly distinguished from the
system `doc_num`), and a line table built from
`stripRowLevelCancelled(rows of the same doc AND the same type)`. Per-row
actions «Malı əvəz et» / «Sətri ləğv et» appear only when
`isAdmin && !isReversal && !alreadyCancelled && !lotDoc` — where `lotDoc` is
true if any row has a `writeoff_valuations` entry.

`transferDocView` previews **outbound legs only** (`out_qty > 0`), so one line
means one transfer rather than two.

### 3.4 Authenticated cancellation through the React Supabase session

Every cancellation RPC is called through the existing `api/supabase.ts` client,
which carries the session's access token, so `auth.uid()` and `my_role()`
resolve server-side. No service key, no anonymous path, no new client.

All of them go into **one new module, `api/documentCancel.api.ts`**, following
the Phase 7 write-API contract exactly: never throw, return a typed
`{ ok, error, … }` result, preserve the server's Azerbaijani refusal text
verbatim, and consult `blockedReason()` **inside the API function** — the
`M7-122` rule, so a caller cannot forget the localhost guard.

`lib/mutationGuard.ts` gains a `DocumentWriteAction` union, additive to the
existing ones:

`doc.cancel` · `doc.cancel-transfer` · `doc.cancel-row` · `doc.replace-item` ·
`doc.cancel-legacy` · `doc.cancel-legacy-transfer` · `doc.cancel-batch`

### 3.5 Three separate cancellation families

This is the heart of the phase, and the legacy code is emphatic that they are
**not** one generic operation. The layer variant is a **third axis**, selected by
the runtime `DB.layerActive` capability flag, not a fixed choice:

**Each RPC gets its own typed React function with its own argument name.** The
parameter name is NOT a property of the "family" — it varies per RPC, including
between the layer and non-layer variants of the *same* family. Every name below
was read from the local SQL sources named in the last column:

| Family | Entry | RPC | First parameter | Source |
|---|---|---|---|---|
| Ordinary document | `documentCancelView` | `cancel_document` | `p_doc_num` | `sql/007_role_security_migration.sql:840-841` |
| Ordinary document, layers ON | `documentCancelView` | `cancel_layer_document` | `p_doc_num` | `sql/036_stock_layers.sql:600` |
| Transfer document | `transferDocView` | `cancel_transfer_document` | **`p_original_doc_num`** | `sql/007_role_security_migration.sql:746-747` |
| Transfer document, layers ON | `transferDocView` | `cancel_layer_transfer_document` | **`p_doc_num`** | `sql/036_stock_layers.sql:680` |
| Single row inside a document | `cancelRowDialog` | `cancel_movement_row` | `p_movement_id`, `p_reason` | `sql/034_cancel_movement_row.sql:38-40` |
| Single row, layers ON | `cancelRowDialog` | `cancel_layer_movement_row` | `p_movement_id`, `p_reason` | `sql/036_stock_layers.sql:724` |
| Item replacement inside a row | `replaceItemDialog` | `replace_movement_item` (no layer variant) | `p_movement_id`, `p_new_item_code`, `p_reason` | legacy call site 5133-5134 |
| Legacy row, no doc | `legacyCancelView` | `cancel_legacy_movement` | `p_movement_id`, `p_reversal_date` | `sql/007_role_security_migration.sql:951-953` |
| Legacy row, layers ON | `legacyCancelView` | `cancel_layer_legacy_movement` | `p_movement_id`, `p_reversal_date` | `sql/036_stock_layers.sql:773-774` |
| Legacy transfer, no doc | `legacyTransferCancelView` | `cancel_legacy_transfer` | `p_movement_id`, `p_reversal_date` | `sql/027_legacy_transfer_cancellation_regex_fix.sql:108-110` |
| Legacy transfer, layers ON | `legacyTransferCancelView` | `cancel_layer_legacy_transfer` | `p_movement_id`, `p_reversal_date` | `sql/036_stock_layers.sql:792-793` |
| Batch | `batchCancelOpen` | `cancel_documents_batch` | `p_doc_nums` (TEXT[]) | `sql/010_batch_cancel_documents_rpc.sql:45-46` |
| Batch, layers ON | `batchCancelOpen` | `cancel_layer_documents_batch` | `p_doc_nums` (TEXT[]) | `sql/036_stock_layers.sql:815` |

Every RPC also takes `p_reversal_date DATE DEFAULT CURRENT_DATE` except
`cancel_movement_row` / `cancel_layer_movement_row`, whose second parameter is
`p_reason`.

#### D-I1 — a deliberate correction of a latent legacy defect

**The legacy `transferDocView` is wrong when layers are active.** At 5249-5251
it chooses the RPC dynamically but always sends the same argument name:

```js
const transferCancelRpc = DB.layerActive ? 'cancel_layer_transfer_document' : 'cancel_transfer_document';
const { data, error } = await SB.rpc(transferCancelRpc,
  dt ? { p_original_doc_num: doc, p_reversal_date: dt } : { p_original_doc_num: doc });
```

`cancel_layer_transfer_document` declares **`p_doc_num`**, not
`p_original_doc_num` (`sql/036_stock_layers.sql:680`). So on the layer-active
branch the legacy call passes an argument the function does not declare, and
PostgREST cannot resolve the overload — the transfer cancellation fails rather
than cancelling the wrong document. It is a **fail-closed** defect, which is
why it has plausibly gone unnoticed: layers are inactive in the environments
exercised so far.

Per principles §7, this is documented rather than silently copied **or**
silently fixed. Phase 8 proposes to **correct** it — the React
`cancelLayerTransferDocument()` sends `p_doc_num` — because copying it would
knowingly ship a call that cannot succeed. The correction:

- changes no calculation, permission, document, balance or stored value;
- makes a currently-failing path work, and only on the layer-active branch;
- is recorded as an approved deviation in the registry (`M8-25`/`M8-26`), not
  applied on the way past;
- carries a **mutation-checked test requirement**: a test must assert that
  `cancelLayerTransferDocument()` sends `p_doc_num` and
  `cancelTransferDocument()` sends `p_original_doc_num`, and it must be verified
  to FAIL against the legacy behaviour (both sending `p_original_doc_num`)
  before the correct implementation is restored.

**This does not weaken the live-signature gate.** These names come from local
SQL migration files, which are approved specifications (source-of-truth rank 4),
not the live database (rank 3). A migration can be unapplied or superseded. The
signatures of all thirteen RPCs above **must still be read from the live
database before implementation** — that gate is unchanged and is restated in §11.
Should the live signature differ from the migration file, the live definition
wins and this section is corrected, not the code bent to match it.

A shared `cancel(docNum)` helper is therefore forbidden: with four distinct
first-parameter names across the document-level RPCs alone, one helper would
silently send the wrong name to some of them.

Behavioural rules that must survive:

- The reversal writes a **new** document; original rows are never modified.
- Marker strings are a server contract mirrored client-side: `Ləğv: <doc>`,
  `Ləğv (əks yerdəyişmə): <doc>`, `Ləğv ID: <id>`,
  `Ləğv (əks yerdəyişmə) ID: <a>:<b>`. `lib/operationalMovements.ts` already
  encodes all four; Phase 8 reuses it and adds only the per-document lookups
  (`docCancelledBy`, `docReversalDoc`, `isCancelDoc`, `isReversalDoc`,
  `cancelledDocFor`, `rowReplacedOrCancelled`, `stripRowLevelCancelled`) as pure
  functions.
- A reversal document cannot itself be cancelled.
- An already-cancelled document shows its reversal doc number and offers no
  action.
- A row with no `doc_num` routes to the legacy family, which explains that a
  separately approved storno is required.
- Reversal-date input defaults to today; when blank the parameter is **omitted**
  so the server's `CURRENT_DATE` default applies (5072).
- The reason field is **mandatory** for row cancellation and item replacement —
  the button stays disabled until it is non-empty.
- Insufficient stock at the reversing side aborts the whole reversal server-side;
  the UI states this before the action.
- **Batch eligibility mirrors `cancel_documents_batch` exactly** (5364-5372):
  reversal document → ineligible; legacy/doc-less → ineligible (individual only);
  already cancelled → ineligible; mixed transfer + non-transfer → unsupported;
  pure transfer → eligible; single type ∈ `CANCELLABLE_TYPES` → eligible;
  anything else → unsupported. Batch is atomic: all or none, and a failure must
  say «heç bir sənəd ləğv edilmədi».

### 3.6 Correction / edit flow via `document_edit_impact()`

This closes `M7-109`'s caller. `fetchDocumentEditImpact()` already exists and is
tested; Phase 8 adds the flow around it, ported from 5124-5205:

1. **Admin-only.** Non-admin is refused before the call
   («Sənədi yalnız Rəhbər (Admin) redaktə edə bilər»), and the server refuses
   again independently.
2. **Layers active → no direct edit at all.** A modal explains that a posted
   document's item, quantity and price source are already fixed in audit, and
   that the safe route is cancel + re-post. The «Sənədi redaktə et» button is
   **not rendered** in `documentCancelView` when `layerActive` (5085).
3. **One document at a time.** If another document is already in edit mode, the
   attempt is refused naming it.
4. **`document_edit_impact(p_doc_num)`** — read-only, admin-only, never throws in
   the React API. A refusal is surfaced verbatim, not swallowed as "empty".
5. **`editable === false`** → a modal listing `blocks[].message` in a table. No
   navigation, no state change.
6. **`editable === true`** → a confirmation modal stating that **nothing changes
   in the database yet**, plus the server's `export_warning` (with the legacy
   fallback sentence when the server sends none).
7. **On confirm:** map `lines[]` into draft lines — `kind` from
   `direction === 'in'`, quantity from `in_qty` or `out_qty`, note stripped of a
   previous `· Əvəz edir: <doc>` suffix (`EDIT_REPLACES_MARKER`) so markers do
   not accumulate — build the `restore` map keyed `w|c` from `out_qty` **for
   outbound documents only**, seed the header from the first line, clear the
   saved draft, set the direction tab, then navigate to «Yeni əməliyyat».
8. **The write** is the already-wired `correctDocument()` (`M7-97`): one
   transaction — impact gate → `cancel_document` → `post_movement_document` →
   an explicit `audit_log` row carrying the reason. On failure the original
   document is **unchanged**, and the message must say so.

The store already models this: `EditDocState { docNum, restore, type, direction }`,
`enterEditMode`, `exitEditMode`. Phase 8 supplies the caller and must **not**
redefine that contract.

### 3.7 Roles, RLS and audit

- **Screen access: ungated** for every role, matching legacy (no id, no
  `display:none`, no `go()` branch). Anyone who reaches it is refused at the
  action.
- **Every cancellation, replacement, correction and batch action: Admin only**,
  client-side *and* server-side. The client gate is a UX affordance; the RPC's
  own `İcazə yoxdur…` refusal is the enforcement, and the React API must surface
  it verbatim rather than mapping it to a generic error.
- **Anbardar warehouse scoping — an assumption this research contradicts.** The
  movements *screen* applies **no** anbardar warehouse filter: `movFiltered()`
  (1660-1676) filters only on the user's own `MF.w` choice, and `movFilters()`
  builds the warehouse select from all of `DB.whs` — unlike `sourceWarehouses()`
  / `allowedWarehouses()` (716-721), which do scope, and which the operation form
  uses. Whether an anbardar actually sees other warehouses' movements therefore
  depends entirely on the live RLS SELECT policy on `movements`, **which has not
  been read**. Phase 8 must **not** "improve" this by adding a client-side scope
  filter: that would be an unapproved behaviour change and could hide rows RLS
  intentionally returns. It is decision **D2** in §9.
- **Audit consequences.** The client writes no audit row on any path. Server-side:
  every movement INSERT (including every reversal leg) fires `movements_audit` →
  `log_changes()`; `correct_document` writes an additional explicit `UPDATE` row
  carrying the reason; `log_icare_exposure` records İcarə usage. Phase 8 is the
  first phase that can exercise `correct_document`'s explicit row, so it is the
  phase in which the OPEN half of `M7-120` becomes *testable* — not automatically
  the phase in which it is closed, which requires an approved live write.
- **The Audit jurnalı readability question stays open.** H-5 found live policy
  `p_audit_read` = `USING (my_role() = 'rehber')`, so an `admin` reads nothing.
  Phase 8 must not assume that is intended, must not assume production matches,
  and must not "fix" it.

### 3.8 Stale-response protection

Two distinct hazards, both real on this screen:

1. **Stale list snapshot.** A user opens a document dialog, another user cancels
   the same document, and the first user's snapshot still shows it as
   cancellable. The mitigation is honest failure, not optimism: the dialog's
   status is recomputed from the current store snapshot on each render, realtime
   `postgres_changes` on `movements` refreshes it, and the server refuses a
   double cancellation anyway — the refusal text is shown verbatim. **No
   client-side "already cancelled" guess is treated as authoritative.**
2. **Out-of-order responses.** The legacy code calls `loadFromDB()` after every
   action and re-renders whatever arrives last. In React this is a genuine
   ordering bug risk. Phase 8 applies the pattern the operation store already
   uses for `load()`: a monotonically increasing request sequence, where a
   resolved response whose sequence is not the newest is **discarded and does not
   overwrite state** — the same discipline that made `M7-S6` ("a failed refresh
   retains the snapshot") a real behaviour rather than an accident, including its
   sibling rule that a failed refresh never replaces a good snapshot with an
   empty one.

Additionally, the `requestKey` invalidation the operation store already performs
on every header/line change must be triggered when entering edit mode, so a
correction never reuses a key minted for the pre-edit draft.

### 3.9 Double-submit protection

Ported from the H-4 pattern, which is stricter than the legacy code:

- **One `inFlight` flag per dialog action**, set **before the first await** and
  released in a `finally` on **every** path — refusal, thrown rejection, success.
- The action button's disabled state and the handler read the **same** value, so
  a second click calls nothing (the `M7-S5` "one gate" rule; scattered per-button
  `disabled = true` assignments are exactly what that rule exists to prevent).
- Batch cancellation additionally disables the execute button for the whole
  atomic call and reports the all-or-nothing outcome explicitly.
- Legacy's own weakness is noted honestly: it disables the button but keeps no
  state flag, so a re-render can re-enable it mid-flight. Phase 8 does not
  reproduce that; it is a safety improvement in the same direction, not a
  behaviour change, and it is recorded as such.

## 4. How Phase 8 unlocks the blocked Phase 7 live reversals

Phase 7's live checks stopped because a posted TEST document could be created
from React but never **seen** or **undone** from React. Concretely, Phase 8
supplies:

| Blocked Phase 7 need | What Phase 8 provides |
|---|---|
| Inspect a document posted in H-5 | «Mal hərəkəti» row → «Baxış» → `documentCancelView` |
| Reverse a posted ordinary document | `cancel_document` / `cancel_layer_document` through the session |
| Reverse a posted transfer | `cancel_transfer_document` / layer variant |
| Exercise `M7-109`'s caller | `editPostedDocument` flow, §3.6 |
| Exercise `correct_document`'s explicit audit row (`M7-120` OPEN half) | the correction write becomes reachable |
| Verify server refusal texts live (`M7-118`) | every refusal is surfaced verbatim from a real RPC |

**The unlock is a capability, not a promotion.** Nothing above changes a Phase 7
status by itself. Each affected row is re-verified only after an **individually
approved** live write, and only then re-recorded. The sequencing rule is that
**each live write must be paired with its reversal in the same approved
session**, so the TEST project is left in a known state — which is precisely what
was impossible before Phase 8.

Live scenario **`S-6` is not unlocked**: it is a server/RPC gap in the
`apply_cond_split` call order, and no client screen closes it. It stays BLOCKED.
(Registry row `M7-S6` is a different thing entirely — "failed refresh keeps the
snapshot", `CODE VERIFIED` — and is not at issue here.)

## 5. Scope boundary

**In scope:** the «Mal hərəkəti» screen; its filters, sort, soft cap and KPI
line; the four document/legacy views; row cancellation; item replacement; batch
cancellation; the `document_edit_impact()` correction flow and its transition
into «Yeni əməliyyat»; the rail entry and the `data-goto="op"` button; the
cancellation API module and the mutation-guard extension.

**Explicitly out of scope:** «Anbar qalıqları»; the dashboard «Son əməliyyatlar»
card; any SQL, RPC, schema, RLS or trigger change; the Audit jurnalı RLS
question; the anbardar-scope question (decision, not implementation); a router;
any visual redesign; and any live write without separate per-write approval.

**Undecided until §9 is answered:** the Excel and Çap exports, and the Silinmə
report export.

## 6. Milestones

| # | Content | Gate |
|---|---|---|
| **I-1** | Read-only foundation: `movements` read widening if needed, the pure cancellation-state helpers, filter/sort/cap/search logic, all as tested pure modules | typecheck, oxlint, build, unit tests; no UI |
| **I-2** | The screen: table, filters, KPI line, soft cap, rail entry, `data-goto="op"`, realtime subscription | as I-1 + component tests |
| **I-3** | Document views (all four) read-only: dispatcher, previews, status text, `docRefsLine`, no action wired | as I-2 |
| **I-4** | `api/documentCancel.api.ts` + guard extension + the three cancellation families and row cancel / item replace, with `inFlight` and stale-sequence protection | as I-3 + mutation-checked tests per family |
| **I-5** | Batch cancellation: `buildBatchDocs` eligibility, filters, selection, atomic execute | as I-4 |
| **I-6** | Correction flow: `document_edit_impact()` caller, block list, confirmation, transition into «Yeni əməliyyat» — closes `M7-109`'s caller | as I-5 |
| **I-7** | Exports and print, **if** decision D1 approves them | as I-6 |
| **I-8** | Live gate: individually approved TEST reads, then individually approved paired write+reversal checks | user approval per action |

I-1…I-7 involve **no live write**. I-8 is the only milestone that does, and each
action inside it needs its own approval at that moment.

## 7. Acceptance gates

Module I is **ONE acceptance boundary**, like Module H. No milestone is
`ACCEPTED` alone.

Per milestone: `npm run typecheck` clean · `oxlint` exit 0 · `npm run build`
succeeds · `git diff --check` clean · all tests pass · `VITE_ALLOW_LOCAL_WRITES`
verified absent from `web/.env` before and after · every new behavioural test
mutation-checked (verified to FAIL against a plausible wrong implementation, with
the correct version restored and re-verified green, and no wrong version left on
disk).

Module-level, before `CODE VERIFIED`: every registry row has a real status; the
four dispatcher branches, all three cancellation families **and** their layer
variants, the batch eligibility matrix and the correction block/editable paths
each have a test; no cancellation RPC is callable without passing through
`blockedReason()`; and no Supabase client import exists outside `api/`.

Before `LIVE VERIFIED`: each live action individually approved; each write paired
with its reversal; results recorded honestly including what was not executed.

`ACCEPTED` additionally requires Codex's independent audit per principles §11.

## 8. Risks

- **R1 — layer variants are untestable in the current TEST fixture.** H-5
  recorded 0 `stock_layer_settings` and 0 `stock_conditions` there, so
  `DB.layerActive` cannot be exercised live without separately approved fixture
  creation. The layer branches will be `CODE VERIFIED` against mocks only, and
  must be recorded that way.
- **R2 — `writeoff_valuations` is a new read.** The Silinmə price/amount column
  and the `lotDoc` guard both need it, and it has never been read by the React
  app. Its live shape and RLS must be confirmed before implementation, per
  principles §3.
- **R3 — the `movements` read may need widening.** `itemMovements.api.ts` selects
  a fixed column union that does **not** include `contract_num` or the recorder
  (`by`), both of which the screen displays. Widening the list is the documented
  correct move; falling back to `select('*')` is explicitly not.
- **R4 — full-table load at this size.** The screen reads every movement client
  side, as legacy does. Parity says keep the arithmetic; `M7-123`-style payload
  measurement should cover the new reads.
- **R5 — `movKey` / `routeOrPartner` / `transferRoute` are legacy helpers not yet
  ported.** The İstiqamət column, the grouped filter and the search text all
  depend on them; they must be ported as pure functions before I-2, not inlined.
- **R6 — a partially-cancelled document is a real state.** `stripRowLevelCancelled`
  can empty a document's visible line list while the document itself is not
  cancelled. The views must handle that without claiming the document is
  cancelled.

## 9. Decisions required before implementation

- **D1 — Excel / Çap / Silinmə report.** Are the three export affordances in
  Phase 8's scope, or deferred to a later export-parity phase? They pull in
  `xls()`, `xlsWriteOff()` and `printHead()`, which materially changes the phase's
  size. *Recommendation: include Excel and Çap; defer the Silinmə report to the
  phase that owns write-off valuation, since it depends on R2.*
- **D2 — anbardar visibility on «Mal hərəkəti».** Research contradicts the
  assumption that this screen is warehouse-scoped: it is not, client-side. Should
  Phase 8 (a) port the unscoped behaviour exactly and record the RLS dependency
  as a risk, or (b) first read the live `movements` SELECT policy and decide?
  *Recommendation: (b) — a read-only live policy check first, then port
  faithfully. No client-side scope filter without approval either way.*
- **D3 — batch cancellation in Phase 8 or deferred.** It is a self-contained
  ~200-line subsystem with its own search UI and its own eligibility matrix.
  *Recommendation: keep it in Phase 8 (milestone I-5) so the cancellation surface
  is migrated once, but accept splitting it out if I-1…I-4 run long.*
- **D4 — item replacement (`replace_movement_item`).** It is reached only from
  the document views and has no layer variant. Include in Phase 8, or defer?
  *Recommendation: include — excluding it leaves a visible, reachable button with
  no destination.*
- **D5 — live-write policy for I-8.** Confirm that the TEST project
  (`alkjjbaawmsirsfvqljm`) remains the only live write target, that each write is
  approved individually, and that each write is paired with its reversal in the
  same session.

## 10. New parity-registry rows

Proposed **Module I — «Mal hərəkəti», document inspection and cancellation
(Phase 8)**, all opening at `NOT STARTED`, recorded in the registry table before
implementation begins (principles §10). Existing `M7-*` rows are **not**
renumbered; only `M7-109` changes, and only when its caller actually ships.

| ID | Function |
|---|---|
| M8-01 | Rail entry «Mal hərəkəti» — ungated, second in the `Əməliyyat` group |
| M8-02 | Page shell: heading, subtitle, header action row |
| M8-03 | Row source = `excludeCancelled()`, reusing `lib/operationalMovements.ts` |
| M8-04 | 15-column table, legacy order and formatting |
| M8-05 | `Silinmə` price/amount via `movementValuation()`; others via `m.pr → item.price` |
| M8-06 | «ləğv edilib» tag driven by `cancelledDocFor()` |
| M8-07 | Free-text search over the exact legacy field set, with `searchableNote()` |
| M8-08 | Warehouse / type / date filters; the fixed 8-type list |
| M8-09 | Grouped İstiqamət/kontragent select, rebuilt from the filtered set, invalid selection reset |
| M8-10 | Sort `date desc, ts desc` |
| M8-11 | 3000-row soft cap + «Hamısını göstər» |
| M8-12 | Footer KPI line: count, inbound, outbound, inbound value |
| M8-13 | «Yeni əməliyyat» button — plain navigation, no prefill |
| M8-14 | Realtime `movements` subscription and debounced refresh |
| M8-15 | `editMov()` four-way dispatcher, including the unsupported-type refusal |
| M8-16 | `documentCancelView`: preview, `docRefsLine`, status branches |
| M8-17 | `transferDocView`: outbound-leg-only preview, route display |
| M8-18 | `legacyCancelView` (doc-less ordinary) |
| M8-19 | `legacyTransferCancelView` (doc-less transfer) |
| M8-20 | `stripRowLevelCancelled` in every document view |
| M8-21 | Reversal-document detection — a reversal cannot be re-cancelled |
| M8-22 | Already-cancelled display with the reversal doc number |
| M8-23 | Reversal-date input; omitted when blank so the server default applies |
| M8-24 | Ordinary family: `cancel_document` / `cancel_layer_document` |
| M8-25 | Transfer family: `cancel_transfer_document` (`p_original_doc_num`) and `cancel_layer_transfer_document` (**`p_doc_num`**) as SEPARATE typed functions — includes deviation `D-I1`, the corrected legacy layer-branch defect, mutation-checked |
| M8-26 | Layer-variant RPC selection driven by the live capability flag; the argument name follows the chosen RPC, never the family |
| M8-27 | Row cancellation: `cancel_movement_row` / layer variant, mandatory reason |
| M8-28 | Item replacement: `replace_movement_item`, mandatory reason, no layer variant |
| M8-29 | Legacy cancellations: `cancel_legacy_movement` / `cancel_legacy_transfer` + layer variants |
| M8-30 | `buildBatchDocs()` eligibility matrix, identical to `cancel_documents_batch` |
| M8-31 | Batch search, filters and selection |
| M8-32 | Batch atomic execute + all-or-nothing failure message |
| M8-33 | `document_edit_impact()` caller — closes `M7-109`'s deferred half |
| M8-34 | Not-editable block list rendering |
| M8-35 | Editable confirmation modal + `export_warning` with the legacy fallback |
| M8-36 | Line→draft mapping, `EDIT_REPLACES_MARKER` stripping, `restore` map from `out_qty` |
| M8-37 | Edit-mode transition: header seed, draft cleared, direction tab, navigate |
| M8-38 | Layers-active → direct edit refused; «Sənədi redaktə et» not rendered |
| M8-39 | One-document-at-a-time edit-mode guard |
| M8-40 | Admin-only gates client-side, with the server refusal surfaced verbatim |
| M8-41 | Screen itself ungated for all roles |
| M8-42 | Anbardar visibility — parity recorded, RLS dependency stated (see D2) |
| M8-43 | Audit consequences of reversal/correction; no client-side audit write |
| M8-44 | Stale-response protection: monotonic sequence, late responses discarded |
| M8-45 | Failed refresh retains the previous snapshot |
| M8-46 | Double-submit: `inFlight` before the first await, released in `finally` |
| M8-47 | One gate shared by button and handler (`M7-S5` rule) |
| M8-48 | `blockedReason()` consulted inside every cancellation API function |
| M8-49 | Guard extension: the seven new `doc.*` actions |
| M8-50 | Excel / Çap / Silinmə report — scope per D1 |
| M8-51 | `writeoff_valuations` read: live shape and RLS confirmed before use (R2) |
| M8-52 | `movements` column-list widening for `contract_num` and the recorder (R3) |
| M8-53 | Payload measurement for the new reads |
| M8-54 | Ported legacy helpers: `movKey`, `movKeyLabel`, `routeOrPartner`, `transferRoute` |

## 11. What this proposal does not claim

It does not claim any Phase 7 row is promoted, that Phase 7 is closer to
`ACCEPTED`, that live scenario `S-6` is unblocked, that any live check was
executed, that any
RPC signature was read from the live database (none was — the RPC names and
parameters in §3.5 come from the local SQL migration files and the legacy call
sites, which are rank-4 approved specifications, not the rank-3 live contract;
principles §3 requires reading the live definitions before implementing against
them, and that gate stands for all thirteen cancellation RPCs including the
`D-I1` correction), or that the anbardar RLS question has been answered.

It also does not claim that `D-I1`'s premise has been confirmed live: that
`cancel_layer_transfer_document` declares `p_doc_num` is established from
`sql/036_stock_layers.sql:680`, and the live database was not consulted. If the
live signature differs, `D-I1` is rewritten before any code is written.
