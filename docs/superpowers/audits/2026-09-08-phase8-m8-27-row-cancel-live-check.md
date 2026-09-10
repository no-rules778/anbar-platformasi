# Phase 8 — TEST M8-27 row-cancellation live check

Date: 2026-09-08  
Project: TEST `alkjjbaawmsirsfvqljm` only  
Role: `anbar-admin-test@example.com` (admin)  
Write scope: one ordinary `cancel_movement_row` execution with
`VITE_ALLOW_LOCAL_WRITES=true` only in the local Vite process

## Executed scenario

After the M8-28 replacement check, the real React document view for
`SND-12B8BCDD3A` exposed one effective line: `TEST Mal 2 · 0000002`, inbound
quantity `2.00`, price `12.50`, amount `25.00`. The admin opened
`Sətri ləğv et`, supplied the mandatory reason
`CODEX Phase 8 M8-27 live check 2026-09-08`, and submitted the real action.

The UI reported
`Sətir ləğv edildi · sənəd: SND-12B8BCDD3A`. The refreshed document retained
the same document number but showed zero effective lines and explained that
the original rows remain while the row was cancelled by a new counter-entry.
The movements list returned to 5 effective records with inbound `17`, outbound
`3` and inbound value `186 AZN`.

## Read-back evidence

A direct authenticated TEST read returned four physical rows under
`SND-12B8BCDD3A`. The three rows already documented by the M8-28 check remain
unchanged. The fourth row is the M8-27 counter-entry:

- id `92b6d863-43b9-4555-b107-a73287e49cd3`;
- date `2026-09-08`;
- item `0000002`;
- inbound `0`, outbound `2`, price `12.5`;
- invoice `CODEX-P8-B4-20260908`;
- note `Ləğv ID: faa34c68-102f-480b-b0d9-367e7440d782`, pointing to the
  effective replacement row rather than modifying it;
- server timestamp `2026-09-08T17:09:33.254962+04:00`.

The physical original, the M8-28 old-item counter, the M8-28 replacement and
the M8-27 counter are all retained. Net quantity for both item codes within the
document is zero.

The admin REST policy returned zero rows when `audit_log` was queried by the
unique M8-27 reason. This run therefore does not promote M8-43 and does not
claim that an audit consequence is absent; that consequence is not visible
through this identity's read policy.

## Scope and remaining gaps

This is narrow live verification of M8-27's ordinary, non-layer,
TEST-admin success path: mandatory reason, real RPC dispatch, same-document
counter-entry, preserved source fields, retained original and refreshed UI.
It does not verify the layer variant, stale-state races, refusal families,
non-admin roles, failure atomicity, concurrency or independently readable audit
consequences.

The write-enabled Vite process was stopped after the check. The tracked sandbox
file remained `VITE_ALLOW_LOCAL_WRITES=false`, and a fresh read-only Vite server
was started on `127.0.0.1:5175`.

Phase 8 remains **NOT ACCEPTED**.
