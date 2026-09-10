# Phase 8 M8-31 batch search/selection live check — 2026-09-08

## Scope

- TEST `alkjjbaawmsirsfvqljm`, authenticated admin, real local React UI.
- Read-only localhost (`VITE_ALLOW_LOCAL_WRITES=false`).
- No mutation was submitted and no TEST data changed.

## Result

In `Qrup üzrə ləğv`, document-number search `TEST-OUT-1` reduced the matrix to
the one eligible `Silinmə` document. Selecting it changed the independent
counter to `1 sənəd seçilib` and enabled `Davam et`.

Changing the document filter to `NO-SUCH-DOC` rendered the empty result
`Sənəd tapılmadı`, while the selected count remained one and `Davam et`
remained enabled. Restoring `TEST-OUT-1` brought the row back with its checkbox
still selected. The dialog was then closed without continuing.

In a second read-only pass, entering item code `0000001` filtered the matrix.
Replacing it with item name `TEST Mal 1` retained the identical result set,
providing real evidence for both item-search keys.

Setting both date bounds to `2026-09-02` retained `TEST-OUT-1`, whose earliest
row date is exactly `2026-09-02`, live-verifying inclusive lower and upper
bounds for that fixture. After clearing the dates, the combined warehouse/type
filter `Test Anbar + Silinmə` retained the same matching document.

A final read-only boundary pass isolated the same document and proved the
opposite sides: a lower bound later than `2026-09-02` removed it, and with the
lower bound cleared an upper bound of `2026-09-01` removed it. The type selector
listed `Yerdəyişmə` plus the cancellable types and did not offer unsupported
`Sifariş`, confirming the documented legacy option-list quirk in the real UI.

## Acceptance effect

M8-31 gains narrow real TEST-admin evidence for document-number search,
item-code/name search and the legacy rule that selection survives filtering.
M8-31 therefore has real evidence for all six control families at least
narrowly: document and item search, inclusive/excluding date bounds, warehouse,
type (including its option-list quirk) and selection. Broader combined-filter
matrices, other roles and stale refresh transitions remain open. **Phase 8
remains NOT ACCEPTED.**
