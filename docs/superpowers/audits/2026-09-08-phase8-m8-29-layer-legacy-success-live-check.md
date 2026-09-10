# Phase 8 M8-29 layer legacy ordinary success — 2026-09-08

## Scope

- TEST `alkjjbaawmsirsfvqljm`, authenticated admin, layers active/version 36.
- Direct RPC/read-back evidence, not React UI evidence.

## Result

Before the scenario, `Test Anbar / 0000001` had movement balance 8 and one
active `legacy_unresolved` layer with available quantity 8. Movement count was
51.

A minimal document-less purchase movement
`a84a5b87-e60e-4e99-ac3f-943670915d0b` was inserted with quantity 1,
invoice `CODEX-P8-LAYER-LEGACY-SUCCESS` and `doc_num = null`. The active insert
trigger created exact receipt layer `fcb7f7b1-cb77-4814-8ef6-9f73b1c664f9`,
available 1, known unit price 15.

Direct `cancel_layer_legacy_movement` succeeded:

- reversal document `SND-L-01905D9CEE` and movement
  `1438dd0f-fe37-4eb8-be4c-724e81c777b5` were created;
- the original remained document-less;
- the reversal preserved warehouse, item, type, quantity, invoice and price,
  and used marker `Ləğv ID: a84a5b87-e60e-4e99-ac3f-943670915d0b`;
- the result reported `historical_layers = unresolved`, `layer_version = 36`;
- the legacy-unresolved layer changed 8→7, while the exact receipt layer
  remained 1/active;
- total active layer availability and movement balance both ended at 8;
- movement count changed 51→53.

The layer composition is the server's explicit historical reconciliation
model: the wrapper applies an unresolved legacy delta instead of rewriting the
exact layer attached by the current insert trigger. It is recorded as observed
behaviour, not reinterpreted as an exact-layer cancellation.

## Acceptance effect

M8-29 now has a narrow direct TEST-admin success for
`cancel_layer_legacy_movement`, in addition to its previously recorded stock
refusal. The layer-legacy transfer success, UI routing, roles, other stock
shapes, unknown outcome and concurrency remain open. **Phase 8 remains NOT
ACCEPTED.**
