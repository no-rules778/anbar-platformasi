# Phase 8 M8-26/M8-38 React layer routing — 2026-09-08

## Scope and safety

- TEST `alkjjbaawmsirsfvqljm`, fresh local React tab, authenticated admin.
- One exact receipt fixture was created directly, then inspected and cancelled through the real React UI.
- Localhost was temporarily started with a process-local `VITE_ALLOW_LOCAL_WRITES=true` only for the UI action. The checked-in/local env file remained `false`, and localhost was returned to read-only immediately afterward.
- No production access, deployment, commit, reset, stash or dirty-tree cleanup.

## Fixture

Document `CODEX-P8-LAYER-UI-20260908221451` contained one `Satınalma` row:

- movement `248ab509-8f7e-4691-8b78-558790d2d9bb`;
- `Test Anbar / 0000002`, inbound quantity 1, price 12.5;
- invoice `CODEX-P8-LAYER-UI`;
- exact receipt layer `c3f5b5af-a2f1-4e39-ad41-e1a90a3473c5`, available 1/active.

## M8-38 UI evidence

The live movements table rendered the fixture and its real `Baxış` button.
The ordinary document dialog showed the source line, replacement and row-cancel
actions, reversal-date field and the layer warning:

`Partiya uçotu aktiv olduqda sənəd birbaşa redaktə edilmir. Dəyişiklik üçün təhlükəsiz ləğv edin və düzgün partiyalarla yeni sənəd yaradın.`

The `Sənədi redaktə et` action was absent, not disabled. The whole-document
cancel action remained available. This live-verifies the M8-38 React
layers-active presentation branch for TEST admin.

## M8-26 routing evidence

Clicking the real `Əməliyyatı ləğv et` button closed the dialog, removed the
effective row and rendered toast:

`Əməliyyat ləğv edildi · əks sənəd: SND-C-857A9630B4`

Direct read-back proved that the UI selected layer semantics:

- original movement remained unchanged;
- reversal movement `8ce0e31a-d6d5-4a86-91b2-c6ebbd9b50fe` was created with
  equal outbound quantity, preserved date/item/warehouse/invoice/price and
  note `Ləğv: CODEX-P8-LAYER-UI-20260908221451`;
- exact receipt layer changed 1/active → 0/inactive;
- movement count changed 74→75;
- balances remained `Test Anbar / 0000001 = 8`, item `0000002 = 0`, transfer
  warehouse item `0000001 = 0`.

The layer mutation distinguishes `cancel_layer_document` routing from a plain
non-layer cancellation. This is real React selection evidence for the ordinary
family.

## Acceptance effect

- M8-26 is PARTIALLY LIVE VERIFIED for the ordinary React layer-selection path.
- M8-38 is LIVE VERIFIED for the TEST-admin layers-active document dialog branch.
- Transfer, legacy, row and batch React layer selection, other roles and stale/unknown capability remain open.
- Localhost ended HTTP 200 with `VITE_ALLOW_LOCAL_WRITES=false`.
- **Phase 8 remains NOT ACCEPTED.**
