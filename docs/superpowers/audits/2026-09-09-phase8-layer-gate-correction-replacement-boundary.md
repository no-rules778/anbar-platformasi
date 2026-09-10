# Phase 8 — the layers-active capability gate, and what it does NOT close

Date: 2026-09-09 (Asia/Baku); **corrected the same day after Codex independent
review** (see the CORRECTION section — the original transfer-based attribution
is retracted).
Environment: TEST `alkjjbaawmsirsfvqljm` only
Result: **M8-38 satisfied** for the active-layer configuration; **M8-39 and
M8-46's correction/replacement branches remain unexercised** and require an
explicit owner scope decision

## Question

Earlier Phase 8 notes recorded the remaining M8-46 correction/replacement and
M8-39 edit-mode branches as blocked on "an inactive-layer edit state", and
suggested that state might have to be created to finish acceptance. This audit
asks what the existing evidence actually establishes — and, after correction,
concludes that the layer gate satisfies M8-38 but cannot stand in for the two
distinct contracts M8-39 and M8-46.

## Code evidence — the gates keyed on `layerActive`

- `web/src/lib/documentEdit.ts:98-105` — `canEditDocument()` refuses
  `layer-active` while layers are active. **Order matters:** `!isAdmin`,
  `!isOrdinaryDoc`, `!docNum` and `isCancelledOrReversal` are all refused
  BEFORE the layer branch, so only an ORDINARY, open, numbered, admin-viewed
  document can isolate the layer term.
- `web/src/components/movements/DocumentViewDialog.tsx:196` —
  **`const mayReplace = layerReady && !layerActive && canReplaceItems(...)`**.
  The comment states the reason explicitly: `replace_movement_item` has no
  stock-layer variant, so "an action that can never succeed must not be
  presented." Note `canReplaceItems()` ALSO returns `false` for
  `transfer-doc`/`legacy-transfer` unconditionally
  (`documentCancelGate.ts:136`), independently of any layer state.
- `web/src/components/movements/DocumentViewDialog.tsx:297-324` —
  «Sənədi redaktə et» is **omitted, not disabled**, when the gate refuses,
  matching legacy `index.html:5052`.

Note the deliberate asymmetry that keeps this from over-claiming:
`mayCancelRow = canCancelRows(view, isAdmin)` at line 198 carries **no** layer
gate. Row cancellation therefore remains reachable with layers active — and it
is already live-verified (movement count 99→101, exactly one counter row,
no duplicate) in
`2026-09-09-phase8-m8-20-m8-46-react-row-double-submit-live-check.md`.
So the gate is specific to correction and replacement, not a blanket block that
would make the whole family untestable.

## CORRECTION (2026-09-09, after Codex independent review)

**The original version of this section was wrong and is retracted.** It cited
the M8-14 transfer document `SND-8DC5E59E8D` as "a document that was in every
other respect a valid correction/replacement candidate", and attributed the
absence of «Sənədi redaktə et» / «Malı əvəz et» on its card to `layerActive`.

That attribution does not hold. Transfer-family guards forbid both actions
independently of the layer state, and they run FIRST:

- `canEditDocument()` (`web/src/lib/documentEdit.ts:98-105`) refuses
  `not-editable-view` at `if (!input.isOrdinaryDoc)` — **three checks before**
  `if (input.layerActive)`. `DocumentViewDialog` passes
  `isOrdinaryDoc: view.kind === 'ordinary-doc'`, which a transfer card is not.
- `canReplaceItems()` (`web/src/lib/documentCancelGate.ts:136`) returns `false`
  for `view.kind === 'transfer-doc'` and `legacy-transfer` unconditionally —
  "Transfers have no per-row controls in any legacy view" — with no layer
  input at all.

So a transfer card would show neither control **even with layers inactive**.
The observation was real, but it cannot isolate the layer gate, and no
conclusion about `layerActive` may be drawn from it. This was an evidence
defect in this audit, not an application defect.

## Active-layer refusal — the evidence that DOES support it

Reused, not re-run (both are ORDINARY documents, where the transfer guards do
not pre-empt the layer check):

- [`2026-09-08-phase8-m8-26-m8-38-react-layer-routing-live-check.md`] — an
  ordinary receipt inspected with layers active, rendering no edit control.
- [`2026-09-08-phase8-m8-38-layer-edit-refusal-live-check.md`] — the real
  dialog showing the layer warning, omitting «Sənədi redaktə et» and retaining
  safe cancellation; plus direct evidence that `document_edit_impact` can still
  return `editable:true` while `correct_document` returns the layer-selection
  P0001 with no write, confirming an independent capability gate.
- [`2026-09-08-phase8-m8-28-replacement-live-check.md`] — a second ordinary
  receipt inspected AFTER the fix: no replacement control, but row cancellation
  still present.

That last pairing is the load-bearing one: on the SAME ordinary card,
replacement is absent while row cancellation remains, which is exactly the
asymmetry the code predicts (`mayReplace` carries the layer term at
`DocumentViewDialog.tsx:196`; `mayCancelRow` at line 198 does not).

## Classification — scoped, not universal

**M8-38 (layers-active refusal) is satisfied** by the ordinary-document
evidence above.

**M8-39 and M8-46 are NOT thereby satisfied.** The approved proposal lists
M8-38, M8-39 and M8-46 as separate contracts, and a gate cannot silently
replace another contract:

- **M8-39** is the *one-document-at-a-time edit-mode guard* — a second document
  refused by name while a first is in edit mode. Edit mode cannot be entered
  with layers active, so this branch is unexercised in the CURRENT
  configuration. It remains CODE VERIFIED.
- **M8-46**'s correction and replacement double-submit branches likewise
  require the controls to exist, i.e. layers inactive. They remain unexercised;
  M8-46's ordinary, batch and row branches are separately live-verified.

Recording these as "satisfied-by-gate" would restrict acceptance to the
active-layer configuration. **That is an explicit owner scope decision, not a
call this audit may make**, and it is surfaced as such rather than assumed.

## What is NOT claimed

- No claim that the M8-39 second-document guard or the M8-46
  correction/replacement double-submit branches are verified in ANY
  configuration.
- No claim that `correct_document` or `replace_movement_item` succeed or fail
  with layers inactive; that configuration was not created, and creating it is
  out of scope (it would destroy the evidence baseline).
- No claim about the layer gate derived from any transfer-family document.
- No application code was changed to obtain any of this evidence.

## Safety

Read-only sandbox `127.0.0.1:5175`, `VITE_ALLOW_LOCAL_WRITES=false`, HTTP 200.
0 production contacts (blanket abort guard on `bbjmhaerssakbreykxiw`), 0
mutation RPCs from the probe, no fixture created by this audit, dirty tree
preserved, no commit/stage/push/deploy, no `I-10` row.
