# Phase 7 — `M7-123` read 10 live measurement (`get_stock_layers`)

Date: 2026-09-09
Environment boundary: TEST `alkjjbaawmsirsfvqljm` only
Class: read-only measurement — **zero writes, zero setup writes**
Verdict: **`M7-123` CLOSED — read 10 recorded**

## Why this was executable now and was not in H-5

`M7-123` stayed OPEN since 2026-09-04 for exactly one reason: read 10,
`rpc/get_stock_layers(warehouse, code)`, was **not measurable** because
`stock_layers_supported()` returned `null` in TEST (no `stock_layer_settings`
singleton), and `get_stock_layers` raises «Partiya uçotu aktiv deyil» whenever
layer accounting is inactive. The plan's S-11 therefore budgeted **1 setup
write** (insert the singleton `active=TRUE`) plus a non-exact cleanup, and
flagged the exact-restoration `DELETE` as a separate class D approval.

**That precondition is now satisfied by the accepted Phase 8 baseline, at no
cost.** Phase 8's owner-approved cutover left layer accounting active. Verified
live, read-only, this session:

```
POST /rest/v1/rpc/stock_layers_supported
→ {"active": true, "version": 36, "cutover_at": "2026-09-08T15:55:29.879391+00:00"}
```

So S-11's **setup write is no longer required**: the measurement is now purely
read-only and needs no configuration change, no cleanup, and no class D delete.
This is a strict improvement on the plan, not a deviation from it — the plan's
`If refused` branch (close `M7-123` as NOT MEASURABLE) is **not** taken, because
the read succeeded.

## The measurement

Method matches reads 4-9 exactly: one HTTPS request, `Accept-Encoding: gzip`,
`Prefer: count=exact`, authenticated test-admin session, uncompressed and gzip
body sizes recorded. Representative item: the same `Test Anbar / 0000001` that
every other Phase 7/8 balance assertion uses.

| # | Query | Rows | Uncompressed | Gzip | Requests |
|---|---|---|---|---|---|
| 10 | `rpc/get_stock_layers(p_warehouse='Test Anbar', p_item_code='0000001')` | 1 object · **2 layers** | **709 B** | **394 B** | **1** |

`Content-Range: 0-0/1` — one request, no pagination.

**Per-invocation and EXCLUDED from the page-load total**, as the row's scope
requires. The combined page-load total for reads 1-9 (2 427 B uncompressed /
1 219 B gzip / 9 requests) is therefore **unchanged**.

### Observed payload shape

The measurement is stronger than the plan anticipated. S-11 expected
`layers: []` at zero layers, which would still have been a valid measurement of
framing overhead only. The live read instead returned **two real layers**, so
these bytes reflect genuine per-layer payload cost:

- `legacy_unresolved`, `available_qty` 7.0000, `unit_price` null,
  `price_status` `unknown`, no source movement;
- `receipt`, `available_qty` 1.0000, `unit_price` 15.0000, `price_status`
  `known`, `source_invoice_num` `CODEX-P8-LAYER-LEGACY-SUCCESS`.

`balance_qty` 8.0000, `revision` `699393fd4565933fa91cff10f368e0dc`. The two
layers sum to the baseline balance, and the `7 + 1` split is exactly the accepted
Phase 8 active layer inventory — independent corroboration that this read was
served by the accepted baseline and not a fabricated state.

Caveat that travels with the number, unchanged in spirit from the 2026-09-04
table: 709 B is two layers in a synthetic project. It establishes the request
count and per-read overhead. It says nothing about production layer depth, where
an item with many partiya rows would return proportionally more. A
production-scale measurement remains a separate, separately approved read-only
exercise.

## Safety state

- Environment guard asserted before every call: the sandbox env resolves to
  `alkjjbaawmsirsfvqljm`; production `bbjmhaerssakbreykxiw` was **never
  contacted**. Production credentials live only in `web/.env`, which was read for
  its project ref and write flag and otherwise untouched; no secret was printed.
- `VITE_ALLOW_LOCAL_WRITES=false` in the sandbox env — unchanged.
- **Zero writes.** Post-check against the reconciled Phase 8 baseline:
  **125 movement rows**, `Test Anbar / 0000001 = 8.00`, **0 negative balances** —
  all three identical to the values the final Phase 8 acceptance recorded.
- No cutover, no layer deactivation, no `stock_layer_settings` mutation, no
  fixture, no cleanup, no I-10 row.
- No source file changed; the automated suite is untouched and was deliberately
  not re-run. Dirty worktree preserved (214 entries), staged state empty; no
  stage, commit, push or deploy.

Incidental read-only observation, recorded not acted on: `SELECT` on
`public.stock_layer_settings` is denied to `authenticated` (42501), while the
`stock_layers_supported()` RPC exposes the same capability facts. That is a
deliberate definer-function boundary, consistent with the `p_audit_read` pattern
`M7-120` already documents. It is not a Phase 7 row and needs no change.

## Effect on the ledger

`M7-123` moves `NOT STARTED` → **`LIVE VERIFIED` / CLOSED**. Its own stop
condition is met: every read 4-10 plus the combined total is now recorded.

**No other Phase 7 row is promoted by this evidence.** Phase 7 remains
**INCOMPLETE and NOT `ACCEPTED`**, pending its own independent Codex audit.
