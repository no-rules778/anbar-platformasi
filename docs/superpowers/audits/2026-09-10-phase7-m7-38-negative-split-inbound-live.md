# Phase 7 — M7-38 negative split refusal + inbound non-routing, LIVE

Date: 2026-09-10
Scope: the negative `condSplitCheck` branch Codex identified as untested, its
healthy control, and the inbound non-routing branch.
Environment: TEST `alkjjbaawmsirsfvqljm`, **read-only** `127.0.0.1:5175`,
`VITE_ALLOW_LOCAL_WRITES=false` throughout. Zero mutations, no final post.
Phase 7 remains **NOT ACCEPTED** pending independent Codex audit.

## Correction — the previous "all three unreachable" claim was FALSE

`2026-09-10-phase7-m7-38-split-guard-chain-live.md` concluded that **all three**
`condSplitCheck` messages are unreachable from the UI. **That claim is wrong and
is withdrawn.** It over-generalised from a single positive test (`+1` into a
max-0 bucket).

Codex identified the error precisely: the input clamp is
`Math.min(num(value), buckets[k])` (`OperationForm.tsx:611`), which bounds only
the **upper** side. `Math.min(-0.001, 0) === -0.001`, so a **negative** entry
survives untouched. Combined with a valid positive bucket the derived total is
positive, the button gate (`disabled={!qty || num(qty) <= 0}`, `:626`) opens,
and `condSplitCheck`'s negative branch (`condSplit.ts:163`) is reached.

What survives from that audit, unchanged and still accurate:

- **positive overflow** is genuinely clamped down (`5` → `0.01`);
- a **max-0 bucket** rejects a positive entry (`1` → `0`);
- a **zero total** disables the action before `onAddLine` runs.

What is corrected: those three measurements do **not** establish that the
negative and over-bucket *messages* are unreachable. The negative one is live
reachable, as proven below.

## Measured results — ALL PASS

Live buckets for `TEST Mal 1 (0000001)` in «Test Anbar»:

```
Yararsız (max 0) · Təmirə ehtiyaclı (max 0) · Sahədə (max 0) · İcarədə (max 0.01)
```

### Negative split refusal

| Assertion | Observed |
|---|---|
| `Yararsız` ← `-0.001` | **stored `-0.001`** — survives the clamp |
| `İcarədə` ← `+0.01` | stored `0.01` |
| Derived MIQDAR | **`0.009000000000000001`** — positive, as predicted |
| «Sətri əlavə et» | **ENABLED** — the button gate does not catch this |
| Inline refusal after the real click | **«Yararsız: miqdar mənfi ola bilməz»** — exact match |
| `get_stock_layers` | **0** — the refusal precedes the layer read |
| `LayerPickDialog` | **not opened** |
| Draft rows | **0 → 0** |

### Healthy control (step 8-9)

`Yararsız` reset to `0`, `İcarədə` kept at `0.01` — the identical add action
then **did** issue `get_stock_layers` (1 read) and **did** open
`LayerPickDialog`. Closed via «İmtina»: draft rows **0**, baseline unchanged.

This control is what makes the negative result meaningful: the same screen, one
field later, reaches the layer read — so the refusal was caused by the negative
value, not by an inert form.

### Inbound non-routing (steps 11-13)

Same fresh session, «Mədaxil» tab, item `0000001`, quantity `1`:

| Assertion | Observed |
|---|---|
| Condition split rendered | **0 blocks** — `showSplit` requires `kind !== 'in'` |
| Draft rows | **0 → 1**, appended directly |
| `get_stock_layers` | **0** — layer routing is outbound-only |
| `LayerPickDialog` | **not opened** |

Phase-tagged layer reads for the whole run were `["healthy"]` — the single read
came from the control, confirming neither the negative attempt nor the inbound
commit touched the RPC.

## Containment

- mutation RPCs attempted: **none**;
- production requests: **0**;
- «Sənədi qeyd et» **never pressed**; no document posted;
- fresh browser context; session ended through «Çıxış»;
- read-only origin only; no write window, no layer deactivation.

## `validateOpLine` clamp/`warn` — NOT reachable read-only

Investigated and **deliberately not claimed**. The clamp
(`opLineValidation.ts:222-227`) fires only when an outbound quantity exceeds
availability, and only matters when `showSplit` is **false** — with a split
active the same condition becomes an outright rejection instead
(`OperationForm.tsx:398`, M7-31).

A live enumeration of both TEST warehouses measured the outbound-eligible set:

```
[Test Anbar]                  TEST Mal 1 (0000001) → cond-split present, MIQDAR readOnly ⇒ showSplit TRUE
[CODEX Phase8 Transfer Anbar] (no outbound-eligible items)
```

`condBuckets().marked` is true whenever any condition bucket holds stock
(`condSplit.ts:73-76`), and `0000001` holds İcarədə `0.01`, so `showSplit` is
always true for the only available item. Reaching the clamp would require
inventing accounting state (a second stocked item with no marked condition),
which is out of scope. **No claim is made for this branch.**

## Status — scoped promotion only

`M7-38` live evidence now covers:

1. outbound active-layer dialog-routing / unconfirmed close (2026-09-09);
2. failed `get_stock_layers` refusal (2026-09-10);
3. positive-overflow clamp and zero-total button gate (2026-09-10);
4. **negative split refusal** with exact message, plus its healthy control
   (this audit);
5. **inbound non-routing** (this audit).

**Still not claimed:** `validateOpLine` clamp/`warn` (unreachable read-only, see
above) and the **inactive-layer configuration branch** (needs layer
deactivation, explicitly out of scope). `M7-38` remains **`IN PROGRESS`**.

`M7-39` is **LIVE VERIFIED**; `M7-22` remains **LIVE VERIFIED**. Phase 7 remains
**NOT ACCEPTED**.
