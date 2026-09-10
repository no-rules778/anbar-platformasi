# Phase 8 M8-27/M8-28 validation refusals — 2026-09-08

## Result

Narrow PASS for six TEST-admin, non-layer server validation/no-write paths of
row cancellation and item replacement. Phase 8 remains **NOT ACCEPTED**.

Only TEST project `alkjjbaawmsirsfvqljm` was contacted. Production project
`bbjmhaerssakbreykxiw` was not contacted. No successful mutation or new fixture
was needed; localhost remained read-only.

## Evidence

The real open ordinary source in `SND-D512FAAC59` was used where a stored row
was required. A guaranteed-absent UUID was used for not-found cases.

| RPC case | response |
|---|---|
| row cancel with whitespace reason | HTTP 400 / P0001: `Ləğvin səbəbi tələb olunur (audit üçün məcburi)` |
| replacement with whitespace reason | HTTP 400 / P0001: `Əvəzləmənin səbəbi tələb olunur (audit üçün məcburi)` |
| replacement with the existing item code `0000002` | HTTP 400 / P0001: `Yeni mal kodu köhnə ilə eynidir: 0000002` |
| replacement with absent item code `9999999` | HTTP 400 / P0001: `Yeni mal kodu nomenklaturada tapılmadı: 9999999` |
| row cancel with absent movement id | HTTP 400 / P0001: `Hərəkət qeydi tapılmadı` |
| replacement with absent movement id | HTTP 400 / P0001: `Hərəkət qeydi tapılmadı` |

The admin-visible movement count was 28 before and 28 after each three-call
group. None of the six refusals created a movement row.

## Status impact and limits

- `M8-27`: adds the mandatory-reason and movement-not-found server refusals.
- `M8-28`: adds mandatory-reason, movement-not-found, same-item and unknown-item
  server refusals.

The mandatory-reason controls were already exercised through the React UI;
this audit adds their server backstops. It does not cover other roles, layer
routing, stale races, stock shortages, transport/unknown outcomes, refresh
failure or concurrency.

