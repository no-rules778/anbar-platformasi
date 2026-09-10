# Phase 8 M8-38 layers-active edit refusal — 2026-09-08

## Scope

- TEST `alkjjbaawmsirsfvqljm`, authenticated admin, stock layers active/version 36.
- Direct RPC/read-back check. The React button-absence branch was not observed because the browser debugger was unavailable.

## Result

A fresh one-line purchase document
`CODEX-P8-LAYER-EDIT-20260908201647` was created solely for this check. Its
source movement was `31ff71e8-eb72-46fb-b89b-9369db0f5ae8`.

`document_edit_impact` returned `editable:true`, one inbound `Satınalma` line
and no document-specific blocks. This is significant: that RPC does not encode
the global layer-capability restriction, so the React capability gate is not a
redundant presentation rule.

A direct `correct_document` call with a non-empty reason and replacement line
then returned HTTP 400 / P0001:

`Partiya seçimi tələb olunur — səhifəni yeniləyin və əməliyyatı yenidən daxil edin`

Movement count stayed 40→40 across the refusal, proving no reversal or
replacement row was committed. The temporary document was then neutralised
through `cancel_layer_document`, producing reversal `SND-C-C4D411CAB6`; the
final movement count was 41.

## Acceptance effect

M8-38 gains narrow direct TEST-admin evidence that a correction attempt is
refused while layers are active, including no-write read-back. The required
React evidence that «Sənədi redaktə et» is not rendered remains open. The
result also confirms why the client must gate on the live capability flag even
when `document_edit_impact` says the document itself is editable.

**Phase 8 remains NOT ACCEPTED.**
