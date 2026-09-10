# Phase 8 M8-28 layers-active replacement UI check — 2026-09-08

## Scope

- TEST Supabase project `alkjjbaawmsirsfvqljm` only, authenticated admin.
- Real local React UI plus direct authenticated database read-back.
- Stock-layer capability active, version 36.
- `Çap` is outside the acceptance boundary.

## Pre-fix live finding

A fresh exact receipt document
`CODEX-P8-LAYER-REPLACE-UI-20260908221925` exposed `Malı əvəz et` in the
real document dialog even though `replace_movement_item` has no layer-aware
variant. Submitting a valid replacement selected item `0000001` and reason
`CODEX Phase 8 layers-active replacement safety check`.

The UI surfaced the exact server refusal:

`Əvəzlənmədi: Partiya seçimi tələb olunur — səhifəni yeniləyin və əməliyyatı yenidən daxil edin`

Read-back proved failure atomicity: movement count stayed 76, the document
still had exactly its one original row, no row contained the submitted reason,
and the exact source layer remained available 1/active. The fixture was then
neutralised through `cancel_layer_document`, producing
`SND-C-82B2F75911`; the layer became 0/inactive and item `0000002` balance
returned to zero.

## Fix and verification

`DocumentViewDialog` now offers item replacement only when the layer
capability probe has positively answered and reports layers inactive. This
does not remove `Sətri ləğv et`, which has a layer-aware RPC variant. The
layers-active explanation now explicitly states that row item replacement is
unavailable and directs the user to safe whole-document cancellation and
re-posting.

Regression verification:

- `DocumentCancel.test.tsx`: 64/64 passed, including new active-layer and
  unknown-capability replacement-absence cases.
- `npm run build`: passed (`tsc -b` and Vite production build); the existing
  large-chunk advisory remains non-fatal.
- A second fresh exact receipt
  `CODEX-P8-LAYER-REPLACE-FIX-20260908224100` was opened in the real
  read-only local React UI. Its row rendered `Sətri ləğv et`, did not render
  `Malı əvəz et`, and displayed the new layer explanation.
- The second fixture was neutralised through `cancel_layer_document`,
  producing `SND-C-5B26EFEBCE`; its layer became 0/inactive and the item
  balance returned to zero.

## Acceptance effect

M8-28 now has real TEST-admin evidence for the layers-active exclusion and for
the server's atomic refusal before the UI fix. This closes the impossible
layers-active replacement affordance. It does not verify non-admin roles,
stale transitions, transport/unknown outcomes, concurrency, or every
document-specific lot-valued exclusion. **Phase 8 remains NOT ACCEPTED.**
