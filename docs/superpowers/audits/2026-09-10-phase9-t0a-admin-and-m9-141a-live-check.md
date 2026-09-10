# Phase 9 T0A admin + M9-141a live read-only check — 2026-09-10

## Outcome

**M9-141a LIVE VERIFIED. T0A remains IN PROGRESS for the role matrix and T0B.**

All accepted evidence came from TEST `alkjjbaawmsirsfvqljm` with the documented
admin identity. No mutation RPC or REST write was sent.

## Admin read matrix

| Read | Result |
|---|---|
| `movements` | HTTP 200, `Content-Range 0-126/127`, 127 rows, warehouses `Test Anbar` and `CODEX Phase8 Transfer Anbar` |
| `items` | 6 rows |
| `stock_conditions` | HTTP 200, `Content-Range 0-1/2`, 2 rows, one in each TEST warehouse |
| `warehouses` | 3 rows |

The live `stock_conditions` response exposed exactly the requested ten fields:
`warehouse`, `item_code`, `unfit_qty`, `repair_qty`, `onsite_qty`, `icare_qty`,
`note`, `updated_at`, `updated_by`, `created_at`. `icare_qty` is therefore live
and readable. Exact types, defaults, constraints, policies, ACLs and function
bodies remain T0B metadata work and are not inferred from this response.

## M9-141a independent comparison

The harness reimplemented the cancellation-marker rules and did not import or
call the React `excludeCancelled()` helper.

| Dataset | Count |
|---|---:|
| raw movements | 127 |
| independently reconstructed operational movements | 3 |
| warehouse × item keys compared | 3 |
| unequal raw-vs-operational sums | **0** |

The reconstruction found 78 hidden document numbers and 15 hidden legacy ids.
For every key, raw `SUM(in_qty - out_qty)` equalled the independently computed
operational sum. No conditional M9-141c row is created.

## Rejected harness outputs

Two outputs were rejected rather than promoted:

1. PowerShell rejected a manually supplied `Range: 0-999` header before the
   admin GET; the harness was changed to explicit `offset=0&limit=1000`.
2. The first aggregate pass contained `return$map` instead of `return $map`, so
   its zero-key comparison was invalid. The corrected pass returned three keys
   and zero differences, as recorded above.

## Role-matrix correction — anbardar completed

The supplied admin password authenticated only the admin account. The candidate
`123456` was then tested once per documented TEST role identity. It did not
authenticate either dedicated `*-codex-test` identity, but it **did**
authenticate `anbar-anbardar-test@example.com`.

| Role | Current live result |
|---|---|
| admin | 127 movements across both TEST warehouses; 2 conditions across both warehouses; 6 items; 3 warehouses |
| anbardar | 107 movements, all `Test Anbar`; 1 condition, also only `Test Anbar`; 6 items; 3 warehouses |
| rehber | not run: `anbar-rehber-codex-test@example.com` rejected both available candidate passwords |

The anbardar response used the same unfiltered REST URLs as admin. The narrowed
movement and condition sets therefore prove current server-side warehouse RLS,
not a client filter. The admin `get_user_directory` read confirmed that
`anbar-rehber-codex-test@example.com` is the sole current rehber identity.

The earlier sentence saying the older anbardar identity returned HTTP 400 is
**superseded** by this later `123456` run; it remains above as chronology.

## Safety

The password and access tokens existed only in process memory and were cleared
before process exit. They were not written to a repository file or audit.
Production `bbjmhaerssakbreykxiw` was rejected before every request. Network
traffic consisted only of TEST Auth password grants and REST GET reads. Mutation
RPCs: 0; REST writes: 0; fixtures: 0.

Phase 9 application implementation remains **NOT STARTED**. Phase 9 remains
**NOT ACCEPTED**.
