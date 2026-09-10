# Phase 8 M8-27/M8-28 transfer-row server refusals — 2026-09-08

## Result

Narrow PASS for the TEST-admin server exclusion of transfer rows from
row-cancellation and item-replacement. Phase 8 remains **NOT ACCEPTED**.

Only TEST project `alkjjbaawmsirsfvqljm` was contacted. Production project
`bbjmhaerssakbreykxiw` was not contacted. No new fixture or successful mutation
was needed; localhost remained read-only.

## Method and evidence

The two authenticated RPCs were called directly against existing document-less
transfer source row `f8a47ad3-3cc5-4b94-ac5b-9e3fa6245f57`, with valid
mandatory reasons (and valid replacement item `0000002` where applicable):

| RPC | response |
|---|---|
| `cancel_movement_row` | HTTP 400 / P0001: `Yerdəyişmə sətri bu yolla ləğv edilmir: sənədi bütövlükdə ləğv edin` |
| `replace_movement_item` | HTTP 400 / P0001: `Yerdəyişmə sətrində mal əvəzlənmir: sənədi ləğv edin və yenidən yazın` |

The admin-visible movement count was 28 immediately before and 28 immediately
after both calls. Neither refusal wrote a counter-row, replacement row or audit
consequence visible through the movement contract.

## Status impact and limits

- `M8-27`: adds narrow live server evidence for the transfer-row exclusion and
  no-write consequence.
- `M8-28`: adds narrow live server evidence for the transfer replacement
  exclusion and no-write consequence.

The document and legacy-transfer views already omit these row actions, so this
direct check verifies the server backstop rather than a visible React error.
Layer routing, other roles/types, stale races, stock/refusal families,
transport/unknown outcomes and concurrency remain open.

