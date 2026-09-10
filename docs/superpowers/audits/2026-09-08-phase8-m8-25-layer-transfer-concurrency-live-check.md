# Phase 8 M8-25 layer transfer cancellation concurrency — 2026-09-08

## Scope

- TEST `alkjjbaawmsirsfvqljm`, authenticated admin, layers active/version 36.
- Direct parallel RPC/read-back evidence; not React M8-46 evidence.

## Fixture

Using a fresh `get_stock_layers` revision, one unit of item `0000001` was
posted from `Test Anbar` to `CODEX Phase8 Transfer Anbar` through
`post_layer_transfer_document`:

- document `SND-0A92A2EF71`;
- outbound movement `87e3525b-51d2-4d39-bcb0-524e247bc9e0`;
- inbound movement `92076248-00ba-419e-a53c-04f3a41267e9`;
- allocation came from legacy-unresolved source layer
  `b633360d-5035-4ed2-83c0-90f9d0f7e912`;
- movement count changed 53→55.

## Concurrent cancellation

Two `cancel_layer_transfer_document` requests for the same document were
started concurrently:

- one returned HTTP 200, reverse document `SND-R-EE3FD1B1B5`, and two reverse
  movements `4aa16b3c-0cb5-41f3-b326-9f14ba04365e` /
  `547756fb-e12c-4c68-ad11-5a38ff62099c`;
- the other returned HTTP 400 / P0001
  `Bu sənəd artıq ləğv edilib: SND-0A92A2EF71`.

Read-back proved single-commit behaviour:

- movement count changed 55→57, exactly two reversal legs rather than four;
- both original legs remained and both reversal legs preserved date, item,
  invoice and equal/opposite route quantities;
- source layer availability was restored to 7;
- destination layer `779808f5-5439-4800-b142-06bcde4701a2` became 0/inactive;
- transfer link `4106299f-bce7-435c-9834-d0ea00ebfa28` gained `reversed_at`;
- final movement balances remained `Test Anbar / 0000001 = 8` and transfer
  warehouse `0000001 = 0`.

## Acceptance effect

M8-25 gains narrow exact layer-transfer cancellation concurrency evidence.
M8-46 remains CODE VERIFIED only because these requests bypassed the React
double-submit lock. UI routing, roles, malformed transfer shapes and unknown
outcome remain open. **Phase 8 remains NOT ACCEPTED.**
