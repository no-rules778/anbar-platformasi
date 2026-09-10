# Phase 8 M8-27/M8-28 unsupported-type server refusals — 2026-09-08

## Result

Narrow PASS for the TEST-admin server exclusion of the legacy unsupported
`Alış` type from row cancellation and item replacement. Phase 8 remains
**NOT ACCEPTED**.

Only TEST project `alkjjbaawmsirsfvqljm` was contacted. Production project
`bbjmhaerssakbreykxiw` was not contacted. No successful mutation or new fixture
was needed; localhost remained read-only.

## Evidence

The two authenticated RPCs were called directly against the existing visible
`Alış` fixture, with valid mandatory reasons and valid replacement item
`0000002` where applicable:

| RPC | response |
|---|---|
| `cancel_movement_row` | HTTP 400 / P0001: `Bu əməliyyat növü üçün sətir ləğvi dəstəklənmir: Alış` |
| `replace_movement_item` | HTTP 400 / P0001: `Bu əməliyyat növü üçün mal əvəzlənməsi dəstəklənmir: Alış` |

The admin-visible movement count was 28 immediately before and 28 immediately
after both calls. Neither rejection wrote a reversal or replacement row.

## Status impact and limits

- `M8-27`: adds narrow live server evidence for the unsupported-type refusal.
- `M8-28`: adds narrow live server evidence for the unsupported-type refusal.

The earlier real `Baxış` preflight already proved that the dispatcher presents
the immutable-record refusal instead of opening a false action dialog. This
direct follow-up proves the server backstop and no-write consequence. Other
types, layer/role/race/transport/unknown-outcome/concurrency paths remain open.

