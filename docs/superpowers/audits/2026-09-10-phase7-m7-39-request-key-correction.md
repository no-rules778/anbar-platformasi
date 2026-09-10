# Phase 7 — M7-39 request-key attribution CORRECTION, LIVE

Date: 2026-09-10
Scope: re-run of the request-key invalidation clause after the Codex evidence
rejection in `2026-09-10-phase7-m7-39-request-key-codex-audit.md`.
Environment: TEST `alkjjbaawmsirsfvqljm` only.
Phase 7 remains **NOT ACCEPTED** pending independent Codex audit.

## The rejected attempt, preserved as superseded history

The earlier run (`2026-09-10-phase7-m7-39-request-key-live.md`) claimed
`K2 != K_MID` isolated the commit. **Codex rejected that attribution and was
right.** With a single-line fixture the sequence collapses:

1. the document held exactly one outbound line;
2. `removeLine` cleared `requestKey` (`operation.store.ts:436-439`);
3. with zero lines the document is not postable, so no key could be captured;
4. rebuilding a postable line calls `addLineRaw` — **already the commit under
   test**, so `K_MID` was captured *after* a commit, not before it;
5. stock capacity then forced a further removal to reach `K2`, and
   `removeLine` independently clears the key.

`K_MID` therefore isolated nothing. That claim is **withdrawn**. The
containment results and the `K1 → K1` stability control from that run were
accepted by Codex and are unchanged.

## Fixture — minimal, supported, net-zero

TEST had only one usable 0.01 outbound bucket, so a second simultaneously
postable line required a fixture. Created through the **real supported UI**:

| Field | Value |
|---|---|
| Document | `SND-BAE2EF3FBF` (`Satınalma`) |
| Movement id | `fbcd736d-47d6-4ae0-9068-07fef8012422` |
| Item / warehouse | `0000002` TEST Mal 2 / Test Anbar |
| Quantity / price | `0.01` @ `12.50` |
| Movements before → after | **3 → 4** |

Exactly one RPC was permitted to complete (`post_movement_document`); every
other write was aborted; production was aborted. This was the only intentional
write of the run.

## Corrected sequence — ALL PASS

Both lines stood **simultaneously**, so no removal, edit, header change, tab
switch, clear, restore or bulk action occurred between the captures.

| Step | Observation |
|---|---|
| Line A — `0000001`, split bucket «İCARƏDƏ» 0.01, real `LayerPickDialog`, «Təsdiq et» | committed, draft rows **0 → 1** |
| Guarded post → **K1** | `88c6dd88-5ccd-4b99-8d69-cf8151258445`, aborted |
| Unchanged retry (**stability control**) | reused **K1 exactly**, aborted |
| Line B — `0000002`, real dialog, «Təsdiq et» | committed, draft rows **1 → 2** |
| Line A still present | **yes** (1 → 2, nothing removed) |
| Header fields across the window | **byte-identical** |
| Guarded post → **K2** | `021f1b9e-43d6-4071-ad59-2d1813c5f5f0`, aborted |
| Comparison | **K2 ≠ K1** |

### Causal isolation (step 7)

Every UI action between the K1 capture and the K2 capture was recorded:

```
1. line-B: item search + pick TEST Mal 2 (0000002)
2. line-B: local quantity entry
3. line-B: «Sətri əlavə et» (routes to layer read)
4. line-B: dialog «Təsdiq et» → real addLineRaw COMMIT
5. post-3: «Sənədi qeyd et» → confirm «Qeyd et» (aborted)
```

Item search, quantity entry and layer reads do not touch `requestKey`. The
**only** request-key-invalidating store action in the window is line B's real
`addLineRaw` (`operation.store.ts:435`). The trail was asserted against a
forbidden-action pattern (remove/edit/header/tab/clear/restore/bulk) and
matched none.

## Containment

- `post_layer_movement_document`: **3 issued, 3 aborted, 0 completed**;
- unknown-RPC fail-closed catches: 0;
- production requests: **0**;
- no un-intercepted post was ever attempted.

## Fixture closed net-zero (steps 9-10)

Closed through the real «Sətri ləğv et» flow — `cancel_layer_movement_row`,
mandatory reason supplied:

```
original_movement_id: fbcd736d-47d6-4ae0-9068-07fef8012422
reversal_movement_id: b960da62-d5d2-4272-83a0-cda43fa54f47
doc_num: SND-BAE2EF3FBF   layer_version: 36   historical_layers: "exact"
```

Reconciliation:

- item `0000002` balance back to **exactly zero** — absent from the outbound
  list again, which is the same stock filter that excluded it before the run;
- visible movement rows back to **3**, identical to the pre-run baseline
  (same three rows, same order, same text);
- **immutable history retained** — the original row was not deleted; the
  reversal is a new row, and both are hidden from the default view by
  `excludeCancelled()`. The movement-count increase is explained solely by
  fixture + reversal history;
- layer state closed correctly (`historical_layers: "exact"`, version 36);
- no negative balances (`0000002` returned to 0, never below).

## Post-conditions

| Check | Result |
|---|---|
| Temporary write-enabled `:5176` | stopped (HTTP 000) |
| Read-only `:5175` | HTTP 200, preserved |
| `.env.sandbox.local` | md5 `7244be4a…` unchanged, `VITE_ALLOW_LOCAL_WRITES=false` |
| TEST sessions | ended through «Çıxış» in every script |
| Dirty tree | 214 entries, 0 staged |

## Status

`M7-39` → **LIVE VERIFIED**. All three exact-contract clauses now have live
evidence: request-key invalidation (this audit, with causal isolation), field
clearing and refocus (`2026-09-10-phase7-m7-39-field-clearing-codex-audit.md`).

`M7-22` remains **LIVE VERIFIED**. `M7-38` remains **IN PROGRESS**. Phase 7
remains **NOT ACCEPTED**.
