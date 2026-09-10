# Phase 7 — M7-38 failed `get_stock_layers` refusal branch, LIVE

Date: 2026-09-10
Scope: the failed-layer-read refusal branch of `M7-38` only.
Environment: TEST `alkjjbaawmsirsfvqljm`, **read-only** origin `127.0.0.1:5175`,
`VITE_ALLOW_LOCAL_WRITES=false`. No write-enabled process was used.
Phase 7 remains **NOT ACCEPTED** pending independent Codex audit.

## Contract under test

`NewOperationPage.tsx:267-279` — when the layer route is taken but
`fetchStockLayers()` fails, the page must:

1. **not** open `LayerPickDialog`;
2. **not** append the draft line;
3. surface `Partiyalar yüklənmədi: <error>` as an error toast.

Legacy parity: `openDraftLineLayers()` (`index.html:3672-3680`).

## Method — failure injection with a WINDOW

The line was built through the real UI: «Məxaric» → `TEST Mal 1 (0000001)` →
the active condition split «İCARƏDƏ (MAX 0.01)» → «Sətri əlavə et», which is
the action that routes to the layer read.

Injection was a **window**, not a one-shot: React StrictMode can issue the same
read twice, and a one-shot would disarm on the first, letting the second
succeed. While armed, every `/rest/v1/rpc/get_stock_layers` was fulfilled with
HTTP **503** (`Service Unavailable (injected)`). All mutation RPCs were aborted
independently, and any URL containing the production ref would have been
aborted.

**The injection was proven observed** — 1 request served 503 — so the negative
results below are attributable to the failure, not to the action never running.

## Results — ALL PASS

| Assertion | Observed |
|---|---|
| `get_stock_layers` actually failed | **1 request served 503** |
| No `LayerPickDialog` opened | dialogs after = **0** |
| No draft line appended | draft rows **0 → 0** |
| Exact refusal surfaced | «**Partiyalar yüklənmədi: Service Unavailable (injected)**» |
| Refusal styled as an error | rendered with `.toast.bad` |
| Recovery after disarming | the identical action **opened** `LayerPickDialog` on a healthy read |
| Baseline restored | dialog closed via «İmtina»; draft rows still **0** |

**Sampling note.** Toasts auto-dismiss after 4000 ms
(`components/ui/Toast.tsx:12`). A first attempt sampled the DOM once at 5000 ms
and saw no toast — a harness error, not an application defect. The refusal is
now polled every 150 ms inside the visible window and was captured at ~150 ms.
The earlier "refusal not shown" reading is superseded by this measurement.

The recovery leg matters as much as the refusal: it proves the same gesture
against a healthy read *does* open the dialog, so the refusal was caused by the
injected failure rather than by an unrelated blocker.

## Containment

- mutation RPCs attempted: **none** (`blocked mutation attempts: []`);
- production requests: **0**;
- no post was attempted; «Sənədi qeyd et» was never pressed;
- session ended through the real «Çıxış» flow; fresh context closed;
- TEST baseline compared before and after: **3 movement rows, identical first
  row, identical page digest** — unchanged.

## Status — scoped promotion only

`M7-38` advances from `IN PROGRESS (narrow)` to `IN PROGRESS (two branches
evidenced)`. Live evidence now covers exactly:

1. the outbound active-layer single-line **dialog-routing / unconfirmed-close**
   branch (2026-09-09); and
2. the **failed `get_stock_layers` refusal** branch (this audit).

**Still not claimed:** the split check, the `validateOpLine` clamp and its
`warn` surface, the inbound non-routing branch, and the inactive-layer branch.
`M7-38` is deliberately **not** promoted to `LIVE VERIFIED`.

`M7-39` is `LIVE VERIFIED`; `M7-22` remains `LIVE VERIFIED`. Phase 7 remains
**NOT ACCEPTED**.
