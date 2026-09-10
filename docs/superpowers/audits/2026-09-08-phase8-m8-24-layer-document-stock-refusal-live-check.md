# Phase 8 M8-24 layer document stock refusal — 2026-09-08

## Scope

- TEST `alkjjbaawmsirsfvqljm`, authenticated admin, layers active/version 36.
- Direct RPC/read-back evidence, not React UI evidence.

## Result

Purchase document `CODEX-P8-LAYER-DOC-STOCK-20260908220311` created movement
`df16df86-cfb8-4520-a700-fc0cf5c4e30a` and exact two-unit receipt layer
`cf8fe559-b828-4ffd-a116-509cd2cecb5c`. One unit was consumed by exact layer
write-off `SND-9F8C5810B4`, movement
`53b5bd5a-7918-4d75-9943-58b14eb50836`; the receipt layer was available 1 of
2.

Direct `cancel_layer_document` returned HTTP 400 / P0001:

`Mədaxil ləğv edilmir: onun partiyasından artıq istifadə olunub`

Read-back proved transaction safety:

- movement count stayed 59→59;
- no cancellation marker for the receipt document existed;
- the receipt layer remained available 1/active.

The fixture was neutralised in dependency order: first
`cancel_layer_movement_row` restored the write-off, then
`cancel_layer_document` created reversal `SND-C-96D66FD602` and deactivated
the receipt layer 2→0. Final movement count was 61.

## Acceptance effect

M8-24 gains narrow exact layer-document stock-refusal and no-write evidence.
UI presentation, roles, mixed document shapes, transport/unknown outcome and
other stock variants remain open. **Phase 8 remains NOT ACCEPTED.**
