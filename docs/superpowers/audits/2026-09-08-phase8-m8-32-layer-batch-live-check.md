# Phase 8 M8-32 layer batch cancellation — 2026-09-08

## Scope

- TEST `alkjjbaawmsirsfvqljm`, authenticated admin, stock layers active/version 36.
- Direct RPC/read-back evidence; the React selection/dialog path was not available.

## Two-document success

Two one-unit exact purchase-layer fixtures were created:

- `CODEX-P8-LAYER-BATCH-A-20260908201841`, movement `d9b57c26-de2f-4b43-affc-e5a24c4c4478`, layer `b18a7b6b-5b51-48d0-8304-74ada2e8fcd6`;
- `CODEX-P8-LAYER-BATCH-B-20260908201841`, movement `6b2a03c2-2f13-42b7-b7cc-661d4e58ab17`, layer `4bbd265f-6a01-4924-962a-50e389fe9722`.

Movement count was 41 before setup and 43 before the batch call.
`cancel_layer_documents_batch` returned `document_count = 2`,
`layer_version = 36` and two ordered results:

- A → reversal `SND-C-50D53E87DD`, row `d2f63480-c8df-4ee9-9ce3-de7309d4099b`;
- B → reversal `SND-C-91038A0332`, row `b7820fca-151b-48dc-afb3-311abb93e6b4`.

Both source rows remained. Both reversals preserved item, warehouse, date,
invoice and price with equal outbound quantity. Both exact layers changed from
available 1/active to available 0/inactive. Movement count became 45.

## All-or-nothing failure

A third one-unit fixture
`CODEX-P8-LAYER-BATCH-ATOMIC-20260908201928` created movement
`63cc7a7c-786b-40e6-b830-6eb5811791b2` and exact layer
`cfbd8eea-1b35-4cf7-b2ae-99ecff48a52f`.

The batch input placed that valid document first and guaranteed-absent document
`CODEX-P8-MISSING-LAYER-7290d9170ec646819e6e198f20baa612` second. The RPC
returned HTTP 400 / P0001 `Sənəd tapılmadı: ...`.

Read-back proved the whole layer transaction rolled back:

- movement count stayed 46→46;
- the valid document had no reversal marker;
- its layer remained available 1/active.

The fixture was then separately neutralised through `cancel_layer_document`,
creating `SND-C-BD42DE57CC`; final movement count was 47.

## Acceptance effect

M8-32 now has narrow direct TEST-admin success and rollback evidence for the
layer batch RPC. React success/error rendering, roles, unknown outcome, refresh
failure and concurrency remain open. **Phase 8 remains NOT ACCEPTED.**
