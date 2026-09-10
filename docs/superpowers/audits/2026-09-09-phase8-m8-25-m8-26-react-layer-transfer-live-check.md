# Phase 8 — M8-25/M8-26 React exact-layer transfer cancellation

Date: 2026-09-09 (Asia/Baku)  
Environment: TEST `alkjjbaawmsirsfvqljm` only  
Actor: TEST admin  
Result: narrow PASS; Phase 8 remains NOT ACCEPTED

This run supersedes the browser/session blocker recorded on 2026-09-08 for the
React transfer-routing half. It does not supersede the remaining OPEN branches
of M8-25 or M8-26.

## Live path

1. Logged in through the real React app at `127.0.0.1:5175` as TEST admin.
2. Created a one-unit transfer of `0000001` from `Test Anbar` to
   `CODEX Phase8 Transfer Anbar`.
3. The layer picker showed the legacy-unresolved layer with 7.00 and the exact
   receipt layer `fcb7f7b1-cb77-4814-8ef6-9f73b1c664f9` with 1.00 at 15.00;
   only the exact receipt layer was selected.
4. The real React write produced transfer document `SND-456860F655`.
5. Its real transfer card showed the layer-active immutability warning and the
   transfer-specific cancellation action. Submitting that action produced
   reversal `SND-R-C1D167C46E`.

The live capability-dependent component route for this transfer card selects
`cancel_layer_transfer_document(p_doc_num, p_reversal_date)`. The resulting
database semantics independently confirm that layer variant: the transfer link
was marked reversed, the child destination layer was consumed/deactivated, and
the exact source layer was restored. The non-layer transfer cancellation cannot
produce those layer/link mutations.

## Authenticated read-back

- Movement count: 85 -> 89, exactly the two original transfer legs plus the two
  immutable reversal legs.
- Source legs, document `SND-456860F655`:
  - `Test Anbar`: out 1.00;
  - `CODEX Phase8 Transfer Anbar`: in 1.00.
- Reversal legs, document `SND-R-C1D167C46E`:
  - destination: out 1.00;
  - source: in 1.00;
  - both notes identify `SND-456860F655` as the cancelled transfer.
- Transfer link `25194135-066a-4e81-9864-251695879571`: qty 1.00, correct
  source/destination movement ids, and non-null `reversed_at` equal to the
  reversal timestamp.
- Exact source layer `fcb7f7b1-cb77-4814-8ef6-9f73b1c664f9`: restored to
  `available_qty=1`, `active=true`, `unit_price=15`, `price_status=known`.
- Destination child layer `a0c23ca4-4e74-47f3-bcee-2641076377af`: parent is
  that exact source layer, `source_type=transfer`, initial 1, available 0,
  `active=false`, `unit_price=15`, `price_status=known`.
- Final item balances match the starting baseline: `Test Anbar=8.00`, transfer
  warehouse `=0.00`; negative balance count across TEST is zero. The condition
  balance at source is restored to `icare_qty=1.00`.

The fixture is therefore net-zero in stock and condition state. Its four
immutable audit movements and reversed transfer link intentionally remain.

## Safety and scope

The write-enabled localhost process was stopped immediately after cancellation
and read-back. A new localhost process is running with
`VITE_ALLOW_LOCAL_WRITES=false`; `web/.env.sandbox.local` also remains false and
`http://127.0.0.1:5175/` returned HTTP 200. Production was never contacted.
No commit, stage, push or deploy occurred, and the dirty working tree was
preserved. No `I-10` ledger row was added. Production build and the existing
focused checks were not repeated because they were already green immediately
before this live continuation and no application code changed.

M8-25 and M8-26 gain narrow real-React exact-layer transfer routing evidence.
Malformed shapes, other roles, stale/transport/unknown-outcome and remaining
concurrency/refusal combinations stay OPEN. **Phase 8 remains NOT ACCEPTED.**
