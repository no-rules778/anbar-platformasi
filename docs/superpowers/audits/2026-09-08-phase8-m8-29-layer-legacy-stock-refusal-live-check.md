# Phase 8 M8-29 layer legacy stock refusal — 2026-09-08

## Scope

- TEST `alkjjbaawmsirsfvqljm`, authenticated admin, layers active/version 36.
- Direct RPC/read-back check, not React UI evidence.

## Fixture and refusal

A document-less purchase fixture was inserted to exercise the true legacy
shape: movement `a591d9d5-c9d8-421f-8814-077a2af2e657`, item `0000002`, one
inbound unit, `doc_num = null`. The active layer trigger created exact receipt
layer `b8e087bf-da9b-41a6-8e77-f2c6cfa2ed5e`, initial/available 1, active,
known price 12.5.

Direct `cancel_layer_legacy_movement` returned HTTP 400 / P0001:

`Tarixi ləğv təhlükəsiz deyil: Test Anbar / 0000002 üzrə dəqiqləşdirilməmiş qalıq 1.0000 vahid çatmır`

Read-back after the refusal showed only the source row, no legacy reversal,
and the exact layer still available 1/active. This exposes the intended
historical-layer safety boundary: this RPC applies an unresolved legacy delta;
a newly created exact receipt layer is not silently substituted for the
required unresolved balance.

The fixture was then neutralised through the exact
`cancel_layer_movement_row` path. Counter-row
`442716ee-2c79-4b48-b52a-aeed89919085` was created and the layer changed
1→0/inactive. Movement count was 49 before fixture creation, 50 before cleanup
and 51 after cleanup.

## Acceptance effect

M8-29 gains narrow TEST-admin stock-safety refusal evidence for
`cancel_layer_legacy_movement`. A successful layer-legacy ordinary call, the
layer-legacy transfer variant, other refusal shapes, UI, roles and concurrency
remain open. **Phase 8 remains NOT ACCEPTED.**
