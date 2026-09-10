# Phase 8 M8-27 layer row-cancellation live check — 2026-09-08

## Scope

- TEST Supabase project `alkjjbaawmsirsfvqljm` only, authenticated admin.
- Direct RPC/read-back evidence; the browser debugger was unavailable, so this is not React UI-routing evidence.
- Stock-layer capability was active at version 36.

## Exact receipt-layer success

`post_movement_document` created purchase document
`CODEX-P8-LAYER-ROW-20260908201111`, movement
`7fe4ad24-5f79-4940-9c84-4adf9535042c`, for one unit of item `0000002` at
12.5 AZN. The active layer trigger created exact receipt layer
`f45fcfb4-d091-4e55-89fc-421484a3e235` with initial/available quantity 1.

Direct `cancel_layer_movement_row` with a non-blank reason succeeded:

- the source movement remained unchanged;
- counter-row `8172611f-d469-4e1c-94ab-5bd4caa85081` was added under the same document, with outbound quantity 1 and the source date, item, invoice and price preserved;
- the result reported `historical_layers = exact`, `layer_version = 36`;
- the exact layer changed from available 1/active to available 0/inactive;
- total movement count changed 33→35.

## Used receipt refusal and allocated write-off reversal

A second exact receipt layer
`7c7f0379-a332-4620-a5a9-7c178b3a16a4` was created with quantity 2 from
movement `68718793-58ce-4894-9972-69461b904856`. A one-unit exact layer
`Silinmə` was then posted as document `SND-4E10E23D8B`, movement
`d14bac90-2ee6-499b-919a-8fb0772f1211`, using the fresh server revision and
the receipt layer allocation.

While one unit was consumed, cancelling the receipt movement returned HTTP 400
/ P0001 with the exact stock-safety refusal:

`Mədaxil sətri ləğv edilmir: onun partiyasından artıq istifadə olunub`

The refusal is recorded as server validation evidence; this run did not promote
it to a separately measured failure-atomicity result.

Cancelling the allocated `Silinmə` movement through
`cancel_layer_movement_row` then succeeded:

- reversal movement `831f3a1e-944d-493b-a9a7-fa51293202db` restored the
  selected layer from available 1→2;
- allocation `176a1ac7-f6f1-4234-9427-204369dda23b` gained `reversed_at`;
- its `writeoff_valuations` row retained `valuation_method = source` and
  `final_amount = 12.5`, and gained both `reversed_by_movement_id` and
  `reversed_at`.

After restoration, cancelling the receipt movement succeeded and changed its
layer from available 2/active to available 0/inactive. The complete scenario
left 39 movements and no unfinished quantity from either temporary receipt.

## Acceptance effect

M8-27 now has narrow direct TEST-admin success evidence for both the exact
receipt-layer branch and the allocated write-off branch, plus the used-receipt
stock refusal. React routing, other roles, stale UI, transport/unknown outcome
and concurrency remain open. **Phase 8 remains NOT ACCEPTED.**
