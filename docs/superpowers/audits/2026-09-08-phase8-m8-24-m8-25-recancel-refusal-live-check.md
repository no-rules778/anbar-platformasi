# Phase 8 M8-24/M8-25 already-cancelled server refusals — 2026-09-08

## Result

Narrow PASS for the TEST-admin, non-layer server refusal/no-duplicate-write
paths of ordinary and transfer document cancellation. Phase 8 remains
**NOT ACCEPTED**.

Only TEST Supabase project `alkjjbaawmsirsfvqljm` was contacted. Production
project `bbjmhaerssakbreykxiw` was not contacted. No fixture, schema,
configuration, role, application code or dependency was changed by this check.

## Method and evidence

The authenticated TEST-admin contract was called directly for two documents
already proved cancelled in earlier audits:

| RPC | original document | response |
|---|---|---|
| `cancel_document` | `SND-76074E451C` | HTTP 400 / P0001: `Bu sənəd artıq ləğv edilib: SND-76074E451C` |
| `cancel_transfer_document` | `SND-3550711E4C` | HTTP 400 / P0001: `Bu sənəd artıq ləğv edilib: SND-3550711E4C` |

The admin-visible `movements` row count was 28 immediately before the two
calls and 28 immediately afterward. Neither refusal created a second reversal
or any partial movement write.

## Status impact and limits

- `M8-24`: adds the ordinary non-layer server already-cancelled refusal and
  no-duplicate-write evidence.
- `M8-25`: adds the transfer non-layer server already-cancelled refusal and
  no-duplicate-write evidence.

This was a direct contract check, not a React-dialog check. The effective
registry intentionally excludes cancelled originals and reversal rows, so it
did not expose these records for another `Baxış` click. M8-21/M8-22 live UI
presentation is therefore not promoted. Layer variants, other roles, stock and
malformed/stale/transport/unknown-outcome/concurrency paths remain open.

Localhost remained in read-only sandbox mode throughout this check.

