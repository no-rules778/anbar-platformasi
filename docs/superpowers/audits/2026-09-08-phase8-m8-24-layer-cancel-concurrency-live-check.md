# Phase 8 M8-24 layer cancellation concurrency — 2026-09-08

## Scope

- TEST `alkjjbaawmsirsfvqljm`, authenticated admin, layers active/version 36.
- Direct server concurrency check. It does not test the React M8-46 submission lock.

## Result

A fresh exact one-unit purchase document
`CODEX-P8-LAYER-RACE-20260908202417` created movement
`b6f8cfe7-58a1-4987-be62-5a8561e74606` and layer
`c487021f-8b53-4468-a54d-869d487de0dd`.

Two `cancel_layer_document` HTTP requests for that document were started
concurrently against the same authenticated session:

- one returned HTTP 200 and reversal `SND-C-3C44D3ABEE`, movement
  `5975ca20-1c8a-48ae-8cc2-827e3a92e284`;
- the other returned HTTP 400 / P0001
  `Mədaxil ləğv edilmir: onun partiyasından artıq istifadə olunub`.

Read-back proved single-commit behaviour:

- movement count changed 48→49, not 50;
- the original remained and exactly one equal opposite row existed;
- the exact layer changed from available 1/active to available 0/inactive.

The losing request's message is the stock-state refusal, not the ordinary
already-cancelled wording. That distinction is recorded as observed server
behaviour, not normalised by the client.

## Acceptance effect

M8-24 gains narrow layer-server concurrency/single-reversal evidence. M8-46's
React pre-await/double-click lock remains CODE VERIFIED only because these were
direct parallel requests. Other document families, roles and unknown outcomes
remain open. **Phase 8 remains NOT ACCEPTED.**
