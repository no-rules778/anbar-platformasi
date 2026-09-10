# Phase 9 T0A OpenAPI read-only probe — 2026-09-10

## Outcome

**Safe refusal observed; signature evidence moved to T0B.**

After design acceptance, one GET was sent to TEST
`alkjjbaawmsirsfvqljm` at `/rest/v1/` with the sandbox publishable key and
`Accept: application/openapi+json`. The response was:

```text
HTTP 401
Secret API key required
```

No RPC was invoked, no mutation was attempted, and production
`bbjmhaerssakbreykxiw` was rejected before the request was built.

## Consequence

The exact PostgREST-exposed `set_stock_condition` signature is not obtainable
through the ordinary publishable-key T0A path. Per the final Codex audit's
explicit alternative, signature verification moves wholly to **T0B**, using
authorised metadata access or a fresh trusted capture. Executable refusal and
fallback probes remain in separately authorised **T10**.

T0A is otherwise still open: the behavioural role matrix, exposed
`stock_conditions` columns, and M9-141a raw-versus-operational comparison need
authenticated TEST identities. `ANBAR_TEST_PASSWORD` was absent and browser
control returned `User unavailable`, so none of those legs was claimed.

Phase 9 implementation remains **NOT STARTED** and Phase 9 remains **NOT
ACCEPTED**.
