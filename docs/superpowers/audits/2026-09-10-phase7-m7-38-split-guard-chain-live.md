# Phase 7 — M7-38 split-check guard chain, LIVE

Date: 2026-09-10
Scope: the **split-check** element of `M7-38` only — the cheapest branch
reachable without layer deactivation.
Environment: TEST `alkjjbaawmsirsfvqljm`, **read-only** `127.0.0.1:5175`,
`VITE_ALLOW_LOCAL_WRITES=false`. No write window was opened.
Phase 7 remains **NOT ACCEPTED** pending independent Codex audit.

> **CORRECTED 2026-09-10 — the central claim below is PARTIALLY FALSE.** This
> audit concluded that **all three** `condSplitCheck` messages are unreachable
> from the UI. That is wrong for the **negative** branch and is withdrawn.
> `Math.min(num(value), buckets[k])` bounds only the UPPER side, so
> `Math.min(-0.001, 0) === -0.001`: a negative entry survives. With
> `Yararsız = -0.001` and `İcarədə = +0.01` the derived total is `+0.009`, the
> button gate opens, and the live UI DOES surface
> «**Yararsız: miqdar mənfi ola bilməz**» before any layer read — measured in
> `2026-09-10-phase7-m7-38-negative-split-inbound-live.md`.
>
> The over-generalisation came from testing only `+1` in a max-0 bucket. What
> remains VALID below: positive overflow is clamped down (`5` → `0.01`), a
> max-0 bucket refuses a positive entry (`1` → `0`), and a zero total disables
> «Sətri əlavə et» before `onAddLine` runs. Those measurements stand; the
> "all three unreachable" conclusion drawn from them does not.

## Finding — the split guard is a CHAIN, and `condSplitCheck` is not its face

`onAddLine()` calls `condSplitCheck(split, buckets)` before `validateOpLine`
and before any layer read (`OperationForm.tsx:374-377`), and `condSplit.ts`
defines three refusals: negative (`163`), over-bucket (`167`) and zero-sum
(`172`).

The first harness assumed those messages were reachable and **failed** — the
correct outcome, because the assumption was wrong. Measurement shows two
upstream guards refuse first, so **none of the three `condSplitCheck` messages
can be produced through the UI**:

| Guard | Where | Effect |
|---|---|---|
| **G1 input clamp** | `OperationForm.tsx:611` — `Math.min(num(value), buckets[k])` | an over-bucket entry is clamped on `onChange`; the invalid state never exists |
| **G2 button gate** | `OperationForm.tsx:626` — `disabled={!qty \|\| num(qty) <= 0}` | a zero split disables «Sətri əlavə et», so `onAddLine` never runs |
| **G3 max-0 bucket** | same clamp with `buckets[k] === 0` | a bucket with no stock cannot receive any quantity at all |

~~`condSplitCheck` is therefore a **defence-in-depth backstop** for
programmatic/bulk callers, not the user-visible refusal.~~ **(Superseded: its
negative branch IS the user-visible refusal on the mixed negative/positive
path.)** It retains its own
unit coverage; this audit records what the live UI actually does.

## Measured results — ALL PASS

Live split for `TEST Mal 1 (0000001)` in «Test Anbar», read from real stock:

```
Yararsız (max 0) · Təmirə ehtiyaclı (max 0) · Sahədə (max 0) · İcarədə (max 0.01)
```

| Assertion | Observed |
|---|---|
| **G1** typed `5` into «İcarədə (max 0.01)» | stored **`0.01`**, derived MIQDAR `0.01` — over-bucket state unreachable |
| **G2** zero split | «Sətri əlavə et» **disabled**; 0 dialogs; 0 draft rows; **0** `get_stock_layers` |
| **G3** typed `1` into «Yararsız (max 0)» | stored **`0`** — empty-bucket refusal unreachable |
| **Positive control** — valid split `0.01` | button **enabled**, dialog opened, **1** `get_stock_layers` issued |
| Baseline | draft rows back to **0** after «İmtina» |

The positive control is what makes the negatives meaningful: the same screen,
one valid entry later, **does** pass the guards and reach the layer read — so
the refusals above are caused by the guard chain, not by an inert form.

Phase-tagged layer reads were `["valid"]` — the only `get_stock_layers` of the
entire run came from the positive control, confirming no malformed split ever
reached the RPC.

## Containment

- mutation RPCs attempted: **none**;
- production requests: **0**;
- no post attempted; «Sənədi qeyd et» never pressed;
- session ended through «Çıxış»; fresh context closed;
- read-only origin only — no write window, no layer deactivation.

## Status — scoped promotion only

`M7-38` live evidence now covers three branches:

1. outbound active-layer single-line **dialog-routing / unconfirmed-close**
   (2026-09-09);
2. **failed `get_stock_layers` refusal** (2026-09-10);
3. **split-guard chain** — over-bucket, zero-sum and max-0 all refused upstream,
   with a positive control proving the valid path (this audit).

**Still not claimed:** the `validateOpLine` clamp and its `warn` surface, the
inbound non-routing branch, and the **inactive-layer branch** (which would
require layer deactivation and is explicitly out of scope). `M7-38` therefore
remains **`IN PROGRESS`**, not `LIVE VERIFIED`.

`M7-39` is `LIVE VERIFIED`; `M7-22` remains `LIVE VERIFIED`. Phase 7 remains
**NOT ACCEPTED**.
