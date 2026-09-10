# Phase 9 T0A rehber scope decision — 2026-09-10

## Owner decision

The owner accepts the completed **admin** and **anbardar** behavioural legs as
sufficient for the T0A pre-implementation gate. The unavailable live
`rehber`-identity read leg is a **non-blocking scoped waiver**.

## What this means

- T0A may be marked passed for the purpose of beginning Phase 9 work that is
  independent of T0B catalog facts.
- It does **not** convert the missing rehber live read into evidence, and it
  does not promote any rehber-specific M9 row.
- T0B remains independently open: exact policies, ACLs, constraints, function
  body and exposed RPC metadata still require authorised catalog access or a
  fresh trusted capture.
- The T10 write authorisation remains separate and is not granted by this
  decision.

## Evidence accepted

- admin: 127 movements across both TEST warehouses, 2 conditions, 6 items and
  3 warehouses;
- anbardar: the same unfiltered REST reads returned 107 movements and one
  condition, all `Test Anbar`;
- M9-141a: raw and independently reconstructed operational balances agreed on
  all three warehouse × item keys.

Phase 9 remains **NOT ACCEPTED**.
