# Phase 8 M8-47 — React submit-gate live check (2026-09-09)

## Scope

TEST project `alkjjbaawmsirsfvqljm` only. This is the live continuation of the
M8-47 acceptance gap: two authenticated TEST-admin browser tabs opened the same
real purchase card, then submitted cancellation concurrently.

## Steps and evidence

- Created exact 0.01 receipt for `0000001` in `Test Anbar`: `SND-6EC3E09726`.
- Opened the same card in both React tabs while it was cancellable.
- Dispatched both real `Əməliyyatı ləğv et` submits concurrently.
- Both browser actions fulfilled, but authenticated read-back showed exactly one
  reversal: `SND-C-56395DEBD0` (`Ləğv: SND-6EC3E09726`). No second reversal or
  duplicate document was created.
- The still-open peer card refreshed to the explicit already-cancelled state
  `Ləğv edilib · əks sənəd: SND-C-56395DEBD0`, with no cancellation action.
- Movement count was 93 immediately before this M8-47 fixture and 95 after it;
  the two added rows are one source / one reversal pair. Session baseline was
  91 before the earlier M8-46 follow-up pair.
- `get_stock_layers('Test Anbar','0000001')` returned the unchanged active
  baseline layers (legacy-unresolved 7 + receipt 1) and balance 8.0.

## Safety / closure

The fixture was net-zero after cancellation: source remains unchanged,
reversal is the sole compensating row, and balances/layers are restored with no
negative quantity. The local server was immediately restarted with
`VITE_ALLOW_LOCAL_WRITES=false` and remained HTTP 200. No production project,
commit, stage, push, or deploy was touched; dirty working tree was preserved.

## Assessment

**NARROW PASS for concurrent ordinary-document cancellation and the ordinary
M8-22 already-cancelled presentation.** This proves the live shared submit gate
prevents a duplicate write under a two-tab race. Batch, correction,
row/replacement and other M8-47 matrix branches remain open.
