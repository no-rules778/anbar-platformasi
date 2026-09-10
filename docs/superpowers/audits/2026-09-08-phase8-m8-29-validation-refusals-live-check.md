# Phase 8 M8-29 legacy validation refusals — 2026-09-08

## Result

Narrow PASS for six TEST-admin, non-layer server validation/no-write paths of
the two legacy cancellation RPCs. Phase 8 remains **NOT ACCEPTED**.

Only TEST project `alkjjbaawmsirsfvqljm` was contacted. Production project
`bbjmhaerssakbreykxiw` was not contacted. No successful mutation or new fixture
was needed; localhost remained read-only.

## Evidence

| Case | Server result (HTTP 400 / P0001) |
|---|---|
| repeat `cancel_legacy_movement` on cancelled ordinary source | `Bu köhnə qeyd artıq ləğv edilib` |
| ordinary legacy RPC on document-less transfer source | `Köhnə yerdəyişmə üçün cancel_legacy_transfer çağırılmalıdır` |
| ordinary legacy RPC on a numbered ordinary row | `Bu qeydin sənəd nömrəsi var — sənəd üzrə ləğv funksiyasından istifadə edin` |
| transfer legacy RPC on document-less ordinary source | `Bu köhnə, sənədsiz yerdəyişmə qeydi deyil` |
| ordinary legacy RPC with absent movement id | `Hərəkət qeydi tapılmadı` |
| transfer legacy RPC with absent movement id | `Hərəkət qeydi tapılmadı` |

The admin-visible movement count was 28 before and 28 after all calls. None
created a reversal or partial row.

## Status impact and limits

`M8-29` gains already-cancelled ordinary, both wrong-family, numbered-row and
both movement-not-found server refusal/no-write paths. The layer variants,
zero/ambiguous-pair and stock refusals, other roles, stale UI, transport/unknown
outcomes, refresh failure and concurrency remain open.

