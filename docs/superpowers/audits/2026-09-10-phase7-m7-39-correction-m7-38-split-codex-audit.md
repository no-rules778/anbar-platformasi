# Phase 7 — Codex audit: corrected M7-39 key proof and M7-38 split chain

Date: 2026-09-10

## Verdict

- **M7-39 request-key correction: ACCEPTED.** M7-39 is `LIVE VERIFIED`.
- **M7-38 split-chain claim: PARTIALLY REJECTED.** Positive overflow and the
  zero-total gate were measured, but the negative split branch remains
  live-reachable and was not tested. M7-38 remains `IN PROGRESS`.
- Phase 7 remains **NOT ACCEPTED**.

## M7-39 — causal isolation is now valid

The corrected run withdraws the rejected K_MID claim and uses two
simultaneously postable active-layer outbound lines. Line A remained present,
headers remained byte-identical, and no remove/edit/tab/clear/restore/bulk
action occurred between the captured keys.

- The first intercepted post produced non-empty K1.
- An unchanged retry reproduced exactly K1, proving stable-key observation.
- Line B was committed through the real UI and `LayerPickDialog`, taking draft
  rows 1→2 while line A remained.
- The next intercepted post produced non-empty K2 and K2≠K1.

Static review agrees with the recorded action trail: item selection
(`setPick`), local quantity entry and layer reads do not clear `requestKey`;
`addLineRaw` does. Because this is the outbound kind, the inbound post-commit
price clear does not call `setHeaderField`; the byte-identical header assertion
also excludes another header invalidator. Line B's commit is causally isolated.

The 0.01 receipt fixture for item `0000002` was created through a supported
TEST write and closed through real row cancellation. Original and reversal
history were retained, the effective item balance returned to zero, three
intercepted layer-post RPCs were aborted, and no harness mutation completed.
The read-only environment was restored.

## M7-38 — the negative branch was omitted

The split audit correctly demonstrates that a positive value above a bucket
maximum is clamped down by `Math.min(value,max)`, and that a non-positive total
disables «Sətri əlavə et» before `condSplitCheck` runs.

It does **not** follow that all three `condSplitCheck` messages are unreachable.
The UI clamp has no lower bound: `Math.min(-0.001,0)` remains `-0.001`. With
`-0.001` in the max-0 Yararsız bucket and `+0.01` in the live İcarədə bucket,
the derived quantity is positive (`0.009`), so the button gate opens.
`condSplitCheck` should then reach its negative branch and surface the exact
message `Yararsız: miqdar mənfi ola bilməz` before any layer read.

The prior audit tested `+1` in the max-0 bucket, not a negative value. A
read-only mixed-negative/positive browser leg is required, asserting the exact
refusal, no dialog, no draft row and no `get_stock_layers`, followed by the
valid positive control.

## Status

- M7-39: **LIVE VERIFIED**.
- M7-38 accepted live evidence: active-layer routing/unconfirmed close;
  failed-layer-read refusal; positive-overflow clamp; zero-total button gate.
- M7-38 still open: negative split refusal; `validateOpLine` clamp/warn;
  inbound non-routing; inactive-layer configuration branch.
