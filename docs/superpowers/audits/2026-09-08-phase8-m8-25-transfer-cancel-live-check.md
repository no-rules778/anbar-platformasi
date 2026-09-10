# Phase 8 — TEST M8-25 transfer cancellation live check

Date: 2026-09-08  
Project: TEST `alkjjbaawmsirsfvqljm` only  
Role: `anbar-admin-test@example.com` (admin)  
Layer capability: `active:false`, version 36

## Minimal TEST fixture

Current TEST had one active warehouse and zero transfer rows, so the transfer
branch could not be exercised from existing data. One explicitly named active
warehouse, `CODEX Phase8 Transfer Anbar`, was created through the real
Soraqçalar UI. A one-unit transfer of item `0000001` was then posted through
the real New Operation UI from `Test Anbar` to that warehouse with invoice
`CODEX-P8-TRANSFER-20260908` and note
`CODEX Phase 8 M8-25 transfer fixture`.

The post created ordinary transfer document `SND-3550711E4C` with two retained
physical legs at the same server timestamp:

- outbound 1 from `Test Anbar`, partner
  `CODEX Phase8 Transfer Anbar anbarına`;
- inbound 1 to `CODEX Phase8 Transfer Anbar`, partner `Test Anbar anbarı`.

## Dispatcher and cancellation

Clicking the outbound row's real `Baxış` action opened the transfer-specific
`Yerdəyişmə sənədi · SND-3550711E4C` view, not the ordinary document view.
It rendered only the outbound leg, the reverse-transfer explanation and
`Yerdəyişməni ləğv et`, with no replacement or row-cancellation controls.
This is narrow live evidence for M8-15's transfer-first dispatcher and M8-17's
transfer document branch.

Submitting the real cancellation created reversal transfer document
`SND-R-5D4231E5E8`. The refreshed effective registry removed both transfer
legs and returned to 4 rows / inbound 12 / outbound 3 / inbound value 123.50
AZN.

Direct TEST read-back returned exactly four physical rows for the fixture
invoice: the two unchanged original legs plus two reversal legs created at
`2026-09-08T18:32:36.622632+04:00`:

- inbound 1 to `Test Anbar`, partner
  `CODEX Phase8 Transfer Anbar anbarı`;
- outbound 1 from `CODEX Phase8 Transfer Anbar`, partner
  `Test Anbar anbarına`;
- both carry note `Ləğv (əks yerdəyişmə): SND-3550711E4C` and the original
  invoice number.

The original and reversal nets are equal and opposite; no original row was
updated or deleted.

## Display-name edge observed, not a React defect

The fixture warehouse name ends with the literal word `Anbar`. The server
therefore stores the outbound partner as
`CODEX Phase8 Transfer Anbar anbarına`. Both the legacy `index.html` and React
port use the same one-pass `normWhName()` suffix removal. One pass removes
`anbarına` but leaves the configured-name suffix `Anbar`, so the displayed
route is the legacy-compatible half-route `Test Anbar → —` and the grouped
filter classifies it as an unrecognised/legacy direction.

This is an inherited naming edge reproduced by both implementations, not a
React regression; changing the normalizer would be an unapproved parity change.
The stored two-leg transfer and server cancellation were correct.

## Scope and remaining gaps

M8-25 is partially live verified for `cancel_transfer_document` in the
non-layer TEST-admin success path. M8-15 and M8-17 gain narrow live transfer
dispatcher/view evidence. The layer transfer RPC and its distinct `p_doc_num`
argument, insufficient-destination-stock refusal, stale-state races, other
roles, failure atomicity and audit visibility remain unverified live.

The fixture warehouse and all four immutable movement rows remain in TEST as
explicit acceptance history. The write-enabled Vite process was stopped; the
tracked sandbox file remains `VITE_ALLOW_LOCAL_WRITES=false`, and localhost was
restarted read-only.

Phase 8 remains **NOT ACCEPTED**.
