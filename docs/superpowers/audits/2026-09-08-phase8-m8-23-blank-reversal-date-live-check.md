# Phase 8 — TEST M8-23 blank reversal-date live check

Date: 2026-09-08  
Project: TEST `alkjjbaawmsirsfvqljm` only  
Role: `anbar-admin-test@example.com` (admin)  
Write scope: one ordinary `cancel_document` execution with the rendered
reversal-date input deliberately cleared before submit

## Executed scenario

The real React document view opened the eligible ordinary document
`SND-76074E451C` with its date control initially defaulted to `2026-09-08`.
The date field was then cleared to an empty value and the real
`Əməliyyatı ləğv et` control was submitted.

The UI reported
`Əməliyyat ləğv edildi · əks sənəd: SND-C-2D6E6E714D`. The refreshed movement
summary changed from 5 records / inbound 17 / outbound 3 / inbound value 186
AZN to 4 records / inbound 12 / outbound 3 / inbound value 123.50 AZN.

## Read-back evidence

A direct authenticated TEST read proved:

- original `SND-76074E451C` remains unchanged with date `2026-09-05`, item
  `0000001`, inbound `5`, price `12.5` and invoice `CODEX-P7-IN-1`;
- reversal `SND-C-2D6E6E714D` was created with date **`2026-09-08`**, item
  `0000001`, outbound `5`, price `12.5`, the same invoice and note
  `Ləğv: SND-76074E451C`;
- the reversal server timestamp is
  `2026-09-08T18:11:59.620325+04:00`.

Because the rendered date field was visibly empty immediately before submit,
and the API boundary is already code-verified to omit `p_reversal_date` for an
empty value, the server-produced current date confirms the omitted-parameter
default path end to end.

## Scope and remaining gaps

This promotes M8-23 from render-only evidence to narrow live verification of
the blank-date omission/server-default path for an ordinary non-layer TEST-admin
cancellation. It also adds a second ordinary M8-24 success observation, without
promoting its layer variant. Transfer/legacy families, layer routing, refusal
families, other roles, failure atomicity and concurrency remain open.

The write-enabled local process was stopped after the check. The tracked
`web/.env.sandbox.local` remained `VITE_ALLOW_LOCAL_WRITES=false`, and localhost
was restarted in read-only sandbox mode.

Phase 8 remains **NOT ACCEPTED**.
