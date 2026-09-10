# Phase 8 — server↔client cancellation-marker contract cross-check — 2026-09-08

## Why this check exists

The `SND-LR-AE5EEE3FF0` finding proved the client mirrored the server's
cancellation-marker strings incompletely: `Ləğv (əks yerdəyişmə) ID:` was a real
server shape that no client matcher recognised, and it was found only by luck in
a live batch matrix. That was a defect of a whole class — "a server marker the
client does not know" — and the class had never been checked exhaustively.

This audit closes the class statically. **No live session, no Supabase call, no
write and no fixture were involved.** Localhost stayed read-only
(`VITE_ALLOW_LOCAL_WRITES=false`, HTTP 200 on `127.0.0.1:5175`).

## Sources

- `docs/superpowers/test-environment/restore-test-atomic.sql` (the TEST project
  restore, which contains the layer-era `cancel_layer_*` functions);
- `docs/superpowers/test-environment/production-functions-2026-09-03.json`;
- the shipped client sources under `web/src/lib/`.

Both SQL artifacts yield the identical marker set, so the finding does not
depend on which one is read.

## Finding 1 — the server writes exactly FOUR note shapes

Extracted from the actual `note` assignments, not from prose:

| SQL function | note written |
| --- | --- |
| `cancel_document` (and `cancel_documents_batch` through it) | `Ləğv: <doc>` |
| `cancel_legacy_movement`, `cancel_movement_row`, `replace_movement_item` | `Ləğv ID: <movement uuid>` |
| `cancel_transfer_document` | `Ləğv (əks yerdəyişmə): <doc>` |
| `cancel_legacy_transfer` | `Ləğv (əks yerdəyişmə) ID: <idA>:<idB>` (`LEAST:GREATEST`) |

Every other `Ləğv…` literal in those functions is an exception message or a read
guard, not a written marker.

## Finding 2 — the layer functions write NO markers of their own

`cancel_layer_document`, `cancel_layer_transfer_document`,
`cancel_layer_movement_row`, `cancel_layer_legacy_movement` and
`cancel_layer_legacy_transfer` each delegate the movement write to their
non-layer counterpart (`v_result := public.cancel_document(...)` and the
equivalents) and then adjust `stock_layers` / `writeoff_valuations`.
`cancel_layer_documents_batch` dispatches per document to
`cancel_layer_document` / `cancel_layer_transfer_document`.

Consequence: **the layer cutover introduced no new marker shape.** The four
shapes above are the complete contract in the current layers-active TEST state,
and marker-based client classification needs no layer-specific branch.

## Finding 3 — the client matrix, evaluated mechanically

The nine regex literals that match markers were read out of the shipped sources
(`lib/operationalMovements.ts`, `lib/documentCancelState.ts`,
`lib/batchCancel.ts` — no other module matches these strings) and evaluated
against the four canonical notes:

| server note shape | DOC_CANCEL | LEGACY_ONE | LEGACY_PAIR | ANY_CANCEL_MARKER | REVERSAL_PREFIX | CANCEL_PREFIX | LEGACY_ROW_MARKER | LEGACY_TRANSFER_PREFIX | REVERSAL_ANY |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `Ləğv: <doc>` | Y | n | n | Y | n | Y | n | n | Y |
| `Ləğv ID: <id>` | n | Y | n | Y | n | n | Y | n | **n** |
| `Ləğv (əks yerdəyişmə): <doc>` | Y | n | n | Y | Y | n | n | n | Y |
| `Ləğv (əks yerdəyişmə) ID: <a>:<b>` | n | n | Y | Y | Y | n | n | Y | Y |

Near-miss strings (`Ləğvin səbəbi …`, `Ləğv edilib`, `Qeyd: Ləğv: SND-X`,
`Ləğv(əks yerdəyişmə): SND-X` without the space) match nothing — the matchers
are anchored and are not accidentally broad.

Every shape is recognised by every matcher that needs it. **No second
unrecognised marker exists.** The `SND-LR-*` class has no surviving sibling.

## Finding 4 — one load-bearing asymmetry, verified safe and now pinned

`REVERSAL_ANY` (the batch eligibility matcher) deliberately does not match
`Ləğv ID:`. That marker appears in two real shapes:

1. inside an ordinary document, as the counter-row of a row cancellation or an
   item replacement — the original and the marker are both removed by
   `stripRowLevelCancelled()`, and the rest of the document classifies normally;
2. as the ONLY row of the numbered `SND-L-*` document that
   `cancel_legacy_movement` creates when a doc-less record is cancelled —
   TEST currently holds exactly such a document, `SND-L-01905D9CEE`.

In case 2 the batch safety does **not** come from the reversal matcher: it comes
from `stripRowLevelCancelled()` emptying both the `SND-L-*` group and the
doc-less original's group, after which `buildBatchDocs()` drops them (legacy
`index.html:5330`). That is legacy-identical behaviour, so it is parity, not a
defect — but it was unpinned, and a change to the strip helper would have
recreated the `SND-LR-*` defect for the ordinary family.

A regression test now pins exactly that real shape:
`web/src/lib/batchCancel.test.ts` — "drops the SND-L-\* legacy reversal document
AND its doc-less original". The pre-existing 5330 test does not cover it: it
places the marker inside the same document as its original, not in its own
numbered reversal document.

**Mutation-checked, two independent mutations of `stripRowLevelCancelled()`:**

- dropping the `^Ləğv ID:` note filter → the new test fails;
- dropping the `hidden.has(id)` filter → the new test fails.

Both mutations were reverted; `git diff` for `lib/documentCancelState.ts` is
empty.

## Verification

- Focused: `batchCancel`, `documentCancelState`, `operationalMovements`,
  `documentCancelGate`, `DocumentCancel`, `BatchCancel` — **240 passed / 6 files**
  (`batchCancel.test.ts` 30 → 31 tests).
- `npm run typecheck` exit 0 · `npx oxlint src` exit 0 · `npm run build`
  succeeded with only the known large-chunk warning.
- No production contact, no TEST write, no commit, no deployment.

## Acceptance effect

M8-21 and M8-30 gain **static server-contract completeness evidence**: the
client now provably mirrors the entire marker contract, including under active
layers, and the ordinary sibling of the previously defective transfer shape is
pinned by a mutation-checked regression test.

This is a code/contract check. It promotes no live-verification row and it does
not substitute for the outstanding React transfer/legacy routing, role,
concurrency and stale-state live scenarios. **Phase 8 remains NOT ACCEPTED.**
