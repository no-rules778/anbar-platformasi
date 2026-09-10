# Phase 8 — TEST M8-28 item-replacement live check

Date: 2026-09-08  
Project: TEST `alkjjbaawmsirsfvqljm` only  
Role: `anbar-admin-test@example.com` (admin)  
Write scope: one `replace_movement_item` execution with
`VITE_ALLOW_LOCAL_WRITES=true` only in the local Vite process

## Executed scenario

The current movements snapshot no longer exposed the earlier preflight target
`SND-76074E451C` as an open effective row. To avoid acting on stale UI evidence,
the live write used the currently visible and eligible ordinary document
`SND-12B8BCDD3A` instead.

Through the real React row action, the admin replaced `TEST Mal 1 · 0000001`
with `TEST Mal 2 · 0000002` and supplied the mandatory reason
`CODEX Phase 8 M8-28 live check 2026-09-08`. The UI completed successfully and
re-rendered the document with `TEST Mal 2`, quantity `2.00`, price `12.50` and
amount `25.00`.

## Read-back evidence

A direct authenticated read from the TEST `movements` table returned exactly
three rows for `SND-12B8BCDD3A`, in creation order:

1. The original row remains unchanged: item `0000001`, inbound `2`, outbound
   `0`, price `12.5`, invoice `CODEX-P8-B4-20260908`, created at
   `2026-09-08T09:33:36.180431+04:00`.
2. A counter-row was added: item `0000001`, inbound `0`, outbound `2`, price
   `12.5`, the same invoice, and note
   `Ləğv ID: 424f6af4-161d-40bc-8d56-e21334c99665`.
3. A replacement row was added: item `0000002`, inbound `2`, outbound `0`,
   price `12.5`, the same invoice, and a note preserving the prior correction
   marker while appending the item transition and submitted reason.

The two new rows share server timestamp
`2026-09-08T16:04:03.587109+04:00`. Net quantity for the old item within the
document is now zero; the new item carries the original inbound quantity and
value. The original record was neither updated nor deleted.

The admin REST policy returned zero rows when `audit_log` was queried by the
unique reason. Therefore this run does **not** promote M8-43 or claim that the
audit consequence is absent; it is simply not visible through this identity's
read policy.

## Scope and remaining gaps

This is narrow live verification of M8-28's ordinary, non-layer,
TEST-admin success path: real picker, mandatory reason, RPC dispatch,
same-document counter/replacement semantics, preserved date/warehouse/quantity/
price/invoice and retained original. It does not verify stale-state races,
server refusal families, transfer or lot-valued exclusions, non-admin roles,
failure atomicity, concurrency, or independently readable audit consequences.

Phase 8 remains **NOT ACCEPTED**.
