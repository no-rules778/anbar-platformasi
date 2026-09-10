# Phase 8 M8-30/M8-32 mixed layer batch — 2026-09-08

## Scope

- TEST `alkjjbaawmsirsfvqljm`, authenticated admin, layers active/version 36.
- Direct batch RPC/read-back evidence, not React selection/dialog evidence.

## Result

The batch contained two different cancellation families:

- ordinary exact receipt document `CODEX-P8-LAYER-MIXED-20260908220903`,
  movement `a8e46c3e-edd6-4541-b2b1-0dbe7f5b972f`, layer
  `61a8088f-93d3-4382-abc6-e025a4c0a340`;
- exact transfer document `SND-8115BFC4EB`, movements
  `996011e3-57e1-4f66-b161-83e08992f231` /
  `b5b6057f-cdb2-4164-bdb7-52c127f85902`, transfer link
  `be4e2c96-7b3e-42da-a7ab-34d4532c8bf9`.

Movement count was 67 before setup and 70 before the batch.
`cancel_layer_documents_batch` returned `document_count = 2`, preserved input
ordering and dispatched each family correctly:

- ordinary result: one-row reversal `SND-C-03CEA92FE2`;
- transfer result: two-row reversal `SND-R-C65AA9A5C8`.

Read-back showed movement count 70→73, ordinary layer 1→0/inactive, transfer
source layer restored to 7, destination layer 1→0/inactive and transfer link
marked reversed. No fixture quantity remained outstanding.

## Acceptance effect

M8-30/M8-32 gain narrow direct TEST-admin evidence for the mixed ordinary +
transfer layer dispatcher in one atomic batch. React eligibility rendering,
selection UX, visible outcome/error states, roles, unknown outcome and
concurrency remain open. **Phase 8 remains NOT ACCEPTED.**
