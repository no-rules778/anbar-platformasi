# Phase 8 — M8-30/M8-32: server-side layer-batch validation refusals

Date: 2026-09-09 (Asia/Baku)
Environment: TEST `alkjjbaawmsirsfvqljm` only. Production was never contacted.
Actor: TEST admin (`anbar-admin-test@example.com`).
Writes: **none succeeded.** Six refused calls, no fixture created.
Result: narrow PASS, plus one contract divergence recorded.
**Phase 8 remains NOT ACCEPTED.**

## Why this scenario was selected

The 2026-09-08 batch validation audit recorded six refusals whose texts
(`Ləğv üçün heç bir sənəd seçilməyib`, `Sıra 1: …`,
`Təkrar seçilmiş sənəd(lər): …`) do NOT match the strings in
`cancel_layer_documents_batch`. Those messages appear in neither `web/src` nor
`index.html`, so they came from the non-layer server path. The LAYER batch
function's own validation branches were therefore unproven. They are reachable
with calls that cannot write, making this the cheapest safe open item.

## Contract under test

`cancel_layer_documents_batch(p_doc_nums text[], p_reversal_date date)` checks
session, `admin` role, then a null/empty array, then iterates
`SELECT DISTINCT btrim(x) … ORDER BY btrim(x)`, rejecting an empty entry before
dispatching each document to the transfer or ordinary layer RPC.

## Live results (TEST admin, movement count 89 → 89 throughout)

| Case | RPC | Server response |
|---|---|---|
| empty array | `cancel_documents_batch` | `Ləğv üçün heç bir sənəd seçilməyib` |
| empty array | `cancel_layer_documents_batch` | `Sənəd seçilməyib` |
| null array | `cancel_layer_documents_batch` | `Sənəd seçilməyib` |
| blank string entry | `cancel_layer_documents_batch` | `Etibarsız sənəd nömrəsi` |
| whitespace-only entry | `cancel_layer_documents_batch` | `Etibarsız sənəd nömrəsi` |
| missing document | `cancel_layer_documents_batch` | `Sənəd tapılmadı: SND-DOES-NOT-EXIST-0000` |
| duplicate missing document | `cancel_layer_documents_batch` | `Sənəd tapılmadı: SND-DOES-NOT-EXIST-0000` (ONE error) |
| existing reversal document | `cancel_layer_documents_batch` | `Bu sənəd artıq bir ləğv (əks yazı) sənədidir, yenidən ləğv edilə bilməz: SND-C-0CF02C71FD` |

All returned HTTP 400 / `P0001`.

Two contract properties are demonstrated rather than assumed:

- **Whitespace normalisation** — a `'   '` entry is rejected with the same
  `Etibarsız sənəd nömrəsi` as `''`, proving `btrim` runs before the emptiness
  test.
- **Deduplication** — passing the same missing document twice produces exactly
  ONE refusal, proving `SELECT DISTINCT` collapses the selection before
  dispatch.

## Divergence recorded (not a defect)

The two batch families answer an empty selection with DIFFERENT text:

- non-layer `cancel_documents_batch` → `Ləğv üçün heç bir sənəd seçilməyib`
- layer `cancel_layer_documents_batch` → `Sənəd seçilməyib`

Both are correct refusals that write nothing, and the client surfaces server
text verbatim, so no behaviour is wrong. It is recorded because the earlier
audit's texts could otherwise be mistaken for the layer contract's, and because
a future parity check on message text must expect the divergence.

## Read-back — state is byte-for-byte the starting baseline

- movement count `89 → 89`;
- balances `Test Anbar/0000001 = 8`, `0000002 = 0`, transfer warehouse `= 0`;
- negative balances: `0`;
- layers unchanged: `Test Anbar/0000001` legacy-unresolved 7 (active) +
  receipt 1 (active); `0000002` both inactive/0; destination transfer layer
  inactive/0;
- capability `active=true`, version 36.

No reversal, marker row or layer mutation was produced by any call.

## Scope

M8-30 gains live server evidence for the layer batch's empty/null/blank/
whitespace/missing/duplicate/reversal branches. M8-32 gains six further atomic
no-write rejection outcomes on the LAYER path specifically.

Still OPEN and NOT addressed here: roles (no `rehber`/`anbardar` credential is
documented), unknown-outcome and transport failures, refresh failure, UI
concurrency, and layer-batch concurrency.

## Safety

- No successful write; nothing to return to net-zero, and the baseline is
  unchanged.
- Refusals are server-side, so `VITE_ALLOW_LOCAL_WRITES` does not gate direct
  REST; it remained `false` and localhost stayed read-only. No client write
  window was opened.
- No commit, stage, push or deploy. Dirty tree preserved. No `I-10` row created.
- No credential or token is recorded in this file.
