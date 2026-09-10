# Phase 8 — TEST M8-32 batch failure-atomicity live check

Date: 2026-09-08  
Project: TEST `alkjjbaawmsirsfvqljm` only  
Role: `anbar-admin-test@example.com` (admin)  
Layer capability: inactive; RPC: `cancel_documents_batch`

## Scenario

The batch RPC was called with an intentionally ordered pair:

1. existing open ordinary document `SND-D512FAAC59` first;
2. guaranteed-absent `SND-NOT-EXIST-M832-20260908` second.

Putting the valid document first is deliberate: if the server wrote each
reversal outside one transaction, the first document could be cancelled before
the second failed. The requested reversal date was `2026-09-08`.

## Result

PostgREST returned PostgreSQL error `P0001` with the server message:

`Sənəd tapılmadı: SND-NOT-EXIST-M832-20260908`

An immediate authenticated TEST read then searched both the document number
and any note naming `SND-D512FAAC59`. Exactly one related row existed: the
unchanged original `facacff5-c008-4005-9259-234a9db1be97`, inbound quantity 1
of item `0000002`, created on 2026-09-05. No reversal document or marker was
present.

This proves the successful work for the first array element was rolled back
when the second element failed. There was no partial cancellation.

## Scope

M8-32 gains live server evidence for one ordinary, non-layer, admin rejection
and all-or-nothing rollback path. The earlier UI check already covers the
successful two-document path. This direct RPC check does not promote the React
batch dialog's visible error-message path, unknown transport outcome,
refresh-failure reconciliation, layer variant, other roles or concurrency.

No lasting movement, reversal, audit fixture or configuration change resulted
from the rejected transaction. Phase 8 remains **NOT ACCEPTED**.
