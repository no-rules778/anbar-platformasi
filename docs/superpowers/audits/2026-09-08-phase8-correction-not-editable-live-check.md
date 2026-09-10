# Phase 8 — TEST correction not-editable live check

Date: 2026-09-08  
Project: TEST `alkjjbaawmsirsfvqljm` only  
Mode: read-only localhost, `VITE_ALLOW_LOCAL_WRITES=false`

## Scenario

The TEST admin opened the existing ordinary document `SND-76074E451C` through
the real «Baxış» control on «Mal hərəkəti», then clicked the real «Sənədi
redaktə et» control. The document is an inbound `Satınalma` dated 2026-09-05
for item `0000001` in `Test Anbar`; later movements for the same
warehouse/item already exist in TEST.

The client called the read-only `document_edit_impact(p_doc_num)` path. The
captured TEST schema declares that function `STABLE SECURITY DEFINER`; this
scenario did not call `correct_document` or any cancellation RPC.

## Result

**PASS — real not-editable outcome rendered.** The modal changed from
`Təsir yoxlanılır…` to `Sənəd redaktə edilə bilməz · SND-76074E451C` and
rendered seven server-provided block rows. Each row stated that a later
movement exists for `Test Anbar` / `0000001`; the referenced later documents
were:

- `SND-12B8BCDD3A`
- `SND-19BC90E738`
- `SND-5443574E03`
- `SND-5DE0837805`
- `SND-C-0CF02C71FD`
- `SND-C-1BCA3DC328`
- `SND-C-B48FFF4DBE`

No editable confirmation was shown, no transition to «Yeni əməliyyat»
occurred, and no draft or database mutation was made.

## Scope

This narrowly live-verifies the TEST-admin ordinary caller's
`editable:false` outcome and the rendering of a populated `blocks[]` list
(`M8-33` / `M8-34`). It does not verify malformed/transport failures, an empty
or malformed blocks payload, transfer/layer branches, non-admin refusal text,
or any `correct_document` failure/atomicity path. Phase 8 remains NOT ACCEPTED.

