# Phase 8 M8-25 layer transfer stock refusal — 2026-09-08

## Scope

- TEST `alkjjbaawmsirsfvqljm`, authenticated admin, layers active/version 36.
- Direct RPC/read-back evidence, not React UI evidence.

## Result

Exact two-unit transfer `SND-E2E9CED735` was posted from `Test Anbar` to
`CODEX Phase8 Transfer Anbar`. It created source/out movement
`fdc31c69-6ae3-46b5-ba38-00cabaf86185`, destination/in movement
`b8b76189-ed44-4680-8920-7b18e77a8eda`, destination layer
`f208cfec-194a-40cd-a0a4-212a4b1f10d9` and transfer link
`0f4c5bd5-1503-46be-95cc-18ce4e98aa72`.

One destination unit was consumed through exact layer write-off
`SND-16E86D43A9`, movement `8d8f82eb-0a1e-46a7-8da0-cdba848ec0ec`. The
destination transfer layer was then available 1 of 2.

Direct `cancel_layer_transfer_document` returned HTTP 400 / P0001:

`Yerdəyişmə ləğv edilmir: təyinat partiyasından artıq istifadə olunub`

Read-back proved no partial reversal:

- movement count stayed 64→64;
- destination layer remained available 1/active;
- transfer link remained `reversed_at = null`.

The fixture was neutralised in dependency order. Cancelling the write-off
restored the destination layer to 2; cancelling the transfer then created
reverse document `SND-R-00A9C42F6C`, consumed the destination layer to
0/inactive, restored the source quantity and marked the link reversed. Final
movement count was 67.

## Acceptance effect

M8-25 gains narrow exact destination-layer-used refusal and no-write evidence.
UI presentation, roles, malformed leg shapes, transport/unknown outcome and
other stock variants remain open. **Phase 8 remains NOT ACCEPTED.**
