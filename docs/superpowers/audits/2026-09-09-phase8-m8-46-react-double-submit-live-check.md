# Phase 8 — M8-46 real React double-submit lock

Date: 2026-09-09 (Asia/Baku)  
Environment: TEST `alkjjbaawmsirsfvqljm` only  
Actor: TEST admin  
Result: narrow PASS; Phase 8 remains NOT ACCEPTED

This run supersedes the same-day blocker audit for the ordinary document
cancellation branch. The earlier session lacked browser control; its additional
credential claim was incorrect because the TEST-admin login is documented in
`docs/superpowers/test-environment/README.md`.

## Live scenario

1. Started from the authenticated TEST-admin React session and baseline 89
   movements, `Test Anbar/0000001=8`, destination warehouse 0 and no negative
   balances.
2. Created the smallest practical layer receipt fixture: 0.01 of `0000001` at
   12.50 in `Test Anbar`. The real UI created `SND-BD8A2AB48F` and one exact
   receipt layer.
3. Opened that document's real movement card.
4. Dispatched a genuine browser `dblclick` on `Əməliyyatı ləğv et`. This sends
   the rapid repeated click sequence required by M8-46 rather than substituting
   a direct RPC.
5. The UI produced one success toast and one reversal document only:
   `SND-C-015729F809`.

## Authenticated read-back

- Movement count is 91: baseline 89 plus exactly one 0.01 receipt and exactly
  one 0.01 reversal. A duplicate dispatch would have produced another reversal
  attempt/row or a second surfaced outcome; neither exists.
- Source `SND-BD8A2AB48F`: one `Satınalma` row, in 0.01, price 12.50.
- Reversal `SND-C-015729F809`: one row, out 0.01, price 12.50, with note
  `Ləğv: SND-BD8A2AB48F`.
- Exact receipt layer `c33c667e-42e3-41c0-bf2e-658e6d3f9130`: initial 0.01,
  available 0, inactive, known price 12.50.
- Final balances returned to `Test Anbar/0000001=8` and transfer warehouse 0;
  negative balance count is zero.

The fixture is stock-net-zero. Its source and reversal movements remain as
immutable audit history. This is narrow live evidence for the ordinary
document-cancellation implementation of M8-46; batch, correction, row and
replacement double-submit UI branches remain unexercised.

## Safety

The write-enabled localhost process was stopped immediately after authenticated
read-back. Localhost was restarted with `VITE_ALLOW_LOCAL_WRITES=false`;
`web/.env.sandbox.local` also remains false and HTTP 200 was verified.
Production was never contacted. No application code, dependency, commit,
staging, push or deployment changed; the dirty working tree was preserved. No
`I-10` row was created. Previously green build/tests were not repeated because
this continuation changed documentation only.

M8-46 is now **PARTIALLY LIVE VERIFIED for TEST admin, ordinary document
cancellation**. Remaining branches stay OPEN. **Phase 8 remains NOT ACCEPTED.**
