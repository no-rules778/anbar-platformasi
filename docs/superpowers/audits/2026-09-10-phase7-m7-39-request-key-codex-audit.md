# Phase 7 — Codex audit of M7-39 request-key live claim

Date: 2026-09-10
Verdict: **EVIDENCE DEFECT — M7-39 request-key clause remains unverified**.

## Accepted evidence

The containment design is sound as recorded: the temporary write-enabled
localhost process was isolated, mutation RPCs were intercepted and aborted,
the unchanged retry reused K1, no mutation completed, the TEST baseline was
unchanged, the on-disk sandbox flag stayed false, and the temporary process was
stopped. This audit does not reject those safety results.

The separate M7-38 failed-layer-read audit is also accepted at its deliberately
narrow scope: the observed 503 produced no dialog/no line, surfaced the exact
error toast, and the healthy control opened the dialog. M7-38 correctly remains
IN PROGRESS.

## Defect in the load-bearing M7-39 comparison

The audit says K_MID was captured "after the removal and before the commit
under test", leaving commit as the only event between K_MID and K2. The
described UI sequence cannot establish that attribution with the current
fixture:

1. The document initially contains exactly one outbound line.
2. `removeLine` removes it and clears `requestKey`
   (`operation.store.ts:436-439`).
3. With zero lines the document is not postable, so the layer-post RPC cannot
   be used to mint/capture K_MID.
4. Rebuilding a postable line requires `addLineRaw`, which is itself the real
   commit whose invalidation is under test (`operation.store.ts:435`). Thus a
   K_MID captured after "remove line-1, rebuild, post" is already **after a
   commit**, not before it.
5. The audit also states that current TEST capacity prevents a second outbound
   line from standing beside the rebuilt one. Therefore reaching K2 requires
   another removal or another state-changing path; `removeLine` independently
   clears the key and confounds `K2 != K_MID`.

The unchanged retry K1→K1 proves that the harness can observe stability, but
it does not repair the missing causal isolation between K_MID and K2.

## Required falsifiable rerun

Use two simultaneously postable active-layer outbound lines so no removal is
needed between the captured keys:

1. Build line A; intercepted post captures K1 and aborts.
2. Retry unchanged; capture K1 again as the stability control.
3. Without removing/editing line A and without changing a header, commit line
   B through the real UI.
4. Intercept the next post and capture K2.
5. Prove K2 is non-empty and K2 != K1; the only request-key-invalidating store
   action between captures must be line B's `addLineRaw`.

The current TEST data has only one usable 0.01 outbound bucket, so this may
require a small supported TEST-only second-item layer fixture. It must be
created and closed net-zero through supported UI/RPC paths, with immutable
history retained and the read-only environment restored immediately.

## Status

- M7-39 field clearing/refocus: accepted code + live evidence.
- M7-39 request-key invalidation: automated evidence only; live attempt is
  inconclusive.
- M7-39: **IN PROGRESS**.
- M7-38: **IN PROGRESS (two live branches evidenced)**.
- Phase 7: **NOT ACCEPTED**.
