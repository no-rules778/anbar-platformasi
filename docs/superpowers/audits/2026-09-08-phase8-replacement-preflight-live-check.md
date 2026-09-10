# Phase 8 — TEST replacement preflight and immutable-record check

Date: 2026-09-08  
Project: TEST `alkjjbaawmsirsfvqljm` only  
Mode: read-only localhost, `VITE_ALLOW_LOCAL_WRITES=false`

## Item-replacement preflight

The TEST admin opened existing ordinary document `SND-76074E451C` through the
real «Baxış» control. The document dialog showed the cancellation date input
with `2026-09-08` and exposed both row actions, including «Malı əvəz et».

The real replacement control opened `Malı əvəz et · sətir üzrə` and showed:

- immutable old item `TEST Mal 1 · 0000001`;
- the original date, warehouse, inbound quantity and document number;
- a new-item search and a mandatory audit-reason field;
- a disabled submit control before the required inputs were complete.

Searching for `0000002` returned exactly `TEST Mal 2 · 0000002`. Selecting it
kept submit disabled until the audit reason was populated; after the reason was
entered, the submit control became enabled. The modal was then closed with
«İmtina». The enabled submit control was **not clicked**, so
`replace_movement_item` was not dispatched.

## Row-cancellation preflight

The real «Sətri ləğv et» action was opened for the same row. Its dialog showed
the source date, warehouse, direction, quantity, item and document number, and
stated that only this row would receive a new counter-entry while the original
remains unchanged. The submit control was disabled with an empty mandatory
audit-reason field and became enabled only after a reason was entered. The
dialog was closed with «İmtina»; the enabled submit control was **not clicked**,
so neither row-cancellation RPC was dispatched.

## Unsupported legacy record

The real «Baxış» control was also invoked on the visible 2026-09-03 legacy
`Alış` row for `TEST Mal 1` (`Synthetic price observation`). No false document
dialog opened. The UI surfaced the exact immutable-record refusal:

`Keçirilmiş qeyd dəyişdirilmir və silinmir. Düzəliş üçün ayrıca storno əməliyyatı tələb olunur.`

## Scope

This adds narrow TEST-admin live evidence for the M8-15 unsupported-type
dispatcher/refusal, the rendered/defaulted half of M8-23, M8-27's row-cancel
preflight/reason gate, and M8-28's replacement preflight, item search and
mandatory-reason gate. It does not execute or live-verify any row-cancellation
RPC or `replace_movement_item`; it does not verify blank-date payload omission,
stale-state re-checks, refusal families, layer/transfer behaviour or non-admin
visibility. Phase 8 remains NOT ACCEPTED.
