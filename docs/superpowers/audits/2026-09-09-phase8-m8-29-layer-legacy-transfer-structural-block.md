# Phase 8 — M8-29 layer-legacy transfer: structurally unreachable on the current TEST baseline

Date: 2026-09-09 (Asia/Baku)
Environment: TEST `alkjjbaawmsirsfvqljm` only. Production was never contacted.
Actor: TEST admin (`anbar-admin-test@example.com`).
Result: the remaining M8-29 success path is BLOCKED BY DESIGN, not merely
untested. One atomic refusal was observed. **Phase 8 remains NOT ACCEPTED.**

## Why this scenario was selected

After the 2026-09-09 React exact-layer transfer run closed the M8-25/M8-26
routing gap, the cheapest remaining OPEN item that needs no browser control was
M8-29's last unproven success path: `cancel_layer_legacy_transfer` against a
document-less two-leg transfer while layers are active.

## Finding: the fixture cannot exist while layers are active

`cancel_layer_legacy_transfer(p_movement_id, p_reversal_date)` delegates to
`cancel_legacy_transfer` under `anbar.stock_layers_write='on'`, then calls
`apply_legacy_layer_delta` once per affected warehouse/item:

- source warehouse, delta `+1` → inserts a `legacy_adjustment` layer;
- destination warehouse, delta `-1` → must CONSUME existing
  `legacy_unresolved` / `legacy_adjustment` stock, else it raises
  `Tarixi ləğv təhlükəsiz deyil: … dəqiqləşdirilməmiş qalıq … çatmır`.

So the success path requires unresolved legacy stock **at the destination**.
Creating the required document-less transfer pair is itself impossible, because
`guard_and_capture_stock_layer_movement` fires on every `movements` INSERT while
layers are active and, without the RPC-internal bypass:

- refuses any leg with `out_qty > 0` outright;
- converts any leg with `in_qty > 0` into a **`receipt`** layer (or
  `legacy_adjustment` only when the note starts `Ləğv:`), never into
  `legacy_unresolved`.

A destination `receipt` layer does not satisfy `apply_legacy_layer_delta`, whose
consumption set is restricted to `legacy_unresolved` and `legacy_adjustment`.

## Live confirmation (one refused write, fully atomic)

A single authorized TEST INSERT of the outbound leg
(`Yerdəyişmə`, `0000001`, `Test Anbar`, `out_qty=1`, `doc_num` absent,
invoice `CODEX-P8-M829-GUARD-PROBE`) returned:

`HTTP 400 / P0001 — Partiya seçimi tələb olunur — səhifəni yeniləyin və əməliyyatı yenidən daxil edin`

Immediate authenticated read-back:

- movement count `89 → 89`;
- rows matching the probe invoice: `0`;
- `stock_layers` rows matching the probe invoice: `0`.

The refusal wrote nothing. No second leg was attempted, because the pair is
only valid as a unit.

## Current TEST layer inventory (read-only)

| warehouse / item | source_type | active | available |
|---|---|---|---:|
| `Test Anbar / 0000001` | `legacy_unresolved` | true | 7 |
| `Test Anbar / 0000001` | `receipt` | true | 1 |
| `Test Anbar / 0000002` | `legacy_unresolved` | false | 0 |
| `Test Anbar / 0000002` | `receipt` | false | 0 |
| `CODEX Phase8 Transfer Anbar / 0000001` | `transfer` | false | 0 |

No `legacy_unresolved` or `legacy_adjustment` stock exists in any warehouse
other than `Test Anbar`, and none can arise at a destination without a new
cutover seeding.

## Conclusion and boundary

The layer-legacy **transfer** success path is unreachable on this baseline
without fabricating a synthetic `legacy_unresolved` layer directly in
`stock_layers`. That would invent accounting state, contradict the audited
baseline and prove nothing about real behaviour, so it was NOT done.

This is a scope conclusion, not a defect: the server is behaving exactly as the
layer design requires. M8-29 should record the branch as **blocked by design on
the current TEST baseline** rather than as an outstanding test.

Reaching it legitimately would require a fresh cutover that seeds
`legacy_unresolved` stock in a second warehouse, i.e. a new TEST environment
shape. That is an owner decision and was not taken autonomously.

## Safety

- One refused write; no successful mutation. Movement count unchanged at 89.
- Balances unchanged: `Test Anbar / 0000001 = 8`, `0000002 = 0`, transfer
  warehouse `= 0`; zero negative balances.
- The layer guard is enforced SERVER-side, so `VITE_ALLOW_LOCAL_WRITES` does not
  gate direct REST; it was left `false` throughout and localhost stayed
  read-only. No write window was opened in the client.
- No commit, stage, push or deploy. Dirty working tree preserved. No `I-10`
  ledger row was created. No credential is recorded in this file.
