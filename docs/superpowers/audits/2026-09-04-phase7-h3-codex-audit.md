# Phase 7 H-3 — Codex audit

Date: 2026-09-04  
Scope: H-3 dialogs and orchestration only. No live Supabase writes were run.

## Verification

- 1559 tests / 92 files passed.
- Typecheck passed.
- Oxlint passed.
- Production build passed (only the existing large-chunk warning).
- `git diff --check` passed (only line-ending warnings).
- No H-3 RPC/posting call was found; `confirmPost` remains the declared H-4 stub.

## Findings — changes required

### H3-A01 — bulk quantity/bucket edits do not clear stored layer/override state (P1)

`BulkPickDialog.setQty()` and `setBucket()` only update the local selection/split maps. They have no callback to clear the parent `bulkLots`/`bulkValues`, although M7-61/M7-62 explicitly require a changed quantity or bucket split to reset the stored lot and final-amount override. A previously selected allocation can therefore remain attached to a changed row (and a stale override can be carried into the next apply).

Refs: `web/src/components/operation/BulkPickDialog.tsx` (`setQty`, `setBucket`); registry M7-61/M7-62.

### H3-A02 — bulk layered lines lose final amount, override reason, source amount and correct revision (P1)

`confirmLayers()` stores `sourceAmount` and `bulkValues`, but `applyBulk()` never reads `bulkValues` and emits only `allocations` plus `layerRevision`. It therefore drops the Admin final amount/reason and does not derive the layer price (`sourceAmount / qty`) for bulk rows. It also sets `layerRevision` to `String(s.layerVersion)` (the capability version), not the `res.revision` returned by `get_stock_layers`. This makes the bulk payload disagree with the single-line layer path and defeats the stale-layer revision contract.

Refs: `web/src/pages/NewOperationPage.tsx:342-346, 408-419`; registry M7-67, M7-73/M7-75.

### H3-A03 — bulk transfer returns to write-off mode (P1)

When a bulk layer dialog is confirmed or backed out, the page hard-codes `setDialog({ kind: 'bulk', mode: 'wo' })`. Opening the bulk dialog in `mv` and selecting a layer therefore returns to `wo`; the subsequent apply builds `out`/“Silinmə” lines instead of transfer lines.

Refs: `web/src/pages/NewOperationPage.tsx:419` and the `onBack` prop near the layer-dialog render; registry M7-56/M7-66.

### H3-A04 — İcarə confirmation mutates lines without invalidating the request key (P1)

The post-path of `confirmIcare()` calls `useOperationStore.setState({ lines: ... })` directly. Unlike `addLineRaw`, `removeLine`, and edit-save, this does not clear `requestKey`. After the note marker is appended, a later post can reuse an idempotency key that belongs to the pre-confirmation draft, violating M7-106.

Ref: `web/src/pages/NewOperationPage.tsx:480-487`; store `addLineRaw`/`removeLine` request-key behavior; registry M7-82/M7-106.

## Verdict

**H-3 CODE NOT APPROVED.** The dialog tests and static checks pass, but the four state/payload issues above require remediation and regression tests before H-3 can be accepted. Phase 7 remains not live-verified and no production/test Supabase writes were attempted.

## Re-audit — 2026-09-05

The remediation for H3-A01…H3-A04 is present and correct:

- quantity/bucket edits call the parent-owned lot/value invalidator;
- bulk layered lines preserve the per-call layer revision, layer-derived price and Admin override fields;
- both layer return paths preserve `wo`/`mv` mode;
- the post-path İcarə note mutation invalidates the request key.

Independent checks passed: 1568 tests / 92 files, typecheck, Oxlint, production build and `git diff --check`. No live writes were run.

### H3-A05 — returning from the layer dialog discards the bulk selection (P1)

`BulkPickDialog` owns `sel`, `split`, `query` and `note` as component-local state. Opening `LayerPickDialog` unmounts it; confirm or «Geri» creates a new bulk dialog with all of those maps/fields empty. The legacy implementation keeps them in the persistent `BW` object and `renderBulkWriteOff()` only re-renders the same selection.

This is not only a convenience difference. With layers active, a partial-quantity row cannot be applied:

1. select a row with available quantity 10 and change it to 3;
2. choose layers totalling 3 and confirm;
3. the bulk dialog remounts with the row unselected;
4. re-selecting the row resets its quantity to 10, so the stored 3-unit lot is invalid;
5. changing the quantity back to 3 correctly triggers H3-A01's invalidator, which deletes the lot.

The user is therefore trapped in a loop and cannot add that valid 3-unit layered row. The current regression tests avoid the defect by re-selecting only a full-quantity row. Preserve the bulk draft state across the layer-dialog round trip (including `sel`, `split`, note and search as applicable), restore a stored allocation only when its per-row revision still matches, and add a partial-quantity regression test that completes without re-entering state.

### Re-audit verdict

**H-3 CODE STILL NOT APPROVED.** H3-A01…H3-A04 are resolved, but H3-A05 blocks valid partial-quantity layered bulk operations and must be fixed before acceptance.

## Final re-audit — 2026-09-05

H3-A05 is resolved. The bulk draft is now controlled by the operation store and survives the layer-dialog round trip: selection/quantity, condition split, shared note, search text and mode are preserved. A 3-of-10 layered row completes without re-selection or re-entry. The layer dialog restores an existing allocation only when the fresh per-item revision matches, matching the legacy `BW`/`BLP` behavior.

Independent verification:

- 1574 tests / 92 files passed;
- typecheck passed;
- Oxlint passed;
- production build passed (existing large-chunk warning only);
- `git diff --check` passed (line-ending warnings only);
- no live Supabase reads/writes were used for this audit.

### Final verdict

**H-3 CODE APPROVED.** H3-A01…H3-A05 are resolved. This approves the H-3 code milestone only; Phase 7 remains incomplete until H-4/H-5 and the planned live verification are completed.
