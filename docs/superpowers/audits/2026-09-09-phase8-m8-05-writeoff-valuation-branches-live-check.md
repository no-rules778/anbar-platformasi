# Phase 8 — M8-05 write-off valuation branches, live fixture check

Date: 2026-09-09 (Asia/Baku)

Target: TEST Supabase `alkjjbaawmsirsfvqljm`. Production `bbjmhaerssakbreykxiw`
was never contacted — **0 attempts**, enforced by an abort guard in both the
REST harness and the Playwright context (any request URL containing the
production ref kills the process before the request completes).

Scope: M8-05 only. No M8-03 / M8-11 / M8-45 / M8-51 re-run, no M8-53
volume/payload claim, no I-10 row, no application-code change, no commit,
staging, push or deploy. `Çap` is outside acceptance.

## Environment

- `web/.env.sandbox.local` → TEST URL, `VITE_ALLOW_LOCAL_WRITES=false`,
  `VITE_TEST_ENVIRONMENT=true`; verified before and after the write window.
- Read-only localhost: `npm run dev -- --mode sandbox --host 127.0.0.1 --port 5175`.
- The write window used a **temporary process** with `VITE_ALLOW_LOCAL_WRITES=true`
  supplied only in that process environment. **`true` was never written to any
  env file** — re-verified after closure.
- Playwright 1.63.0 driving installed Chrome from the npm `_npx` cache; not added
  to `web/package.json` or `web/node_modules`.
- All writes were performed through the **real React UI** (Yeni əməliyyat →
  Məxaric → Silinmə), never by direct table access or fabricated SQL.

---

## 1. The M8-05 branch matrix, established before any fixture

Read from `lib/movementValuation.ts` and `pages/MovementsPage.tsx:825-832`.
`movementValuation()` has exactly two sources (stored row, else legacy derive),
and `writeOffUnitPrice()` picks the quotient or the row own price.

| # | Branch | Condition | Rendered QIYMƏT / MƏBLƏĞ |
| --- | --- | --- | --- |
| B1 | stored, non-null `final_amount` | valuation row present | `final/qty` @4dp → `nf(pr,2)` / `money(final)` |
| B2 | stored, `final_amount = null` | valuation row present | falls to `m.price` / `—` |
| B3 | `writeOffUnitPrice()` quotient | B1 where `final/qty` is not exact | 4-dp rounding |
| B4 | legacy, no valuation row, `pr > 0` | no row | `price` / `money(qty×price)` |
| B5 | legacy, no valuation row, `pr <= 0` | no row | `—` / `—` |

B3 is a **sub-case of B1**, not an independent fixture. B5 was already LIVE
VERIFIED by the 2026-09-09 M8-03/M8-05/M8-52 check and is not re-run here.

## 2. Read-only baseline

| Item | Value |
| --- | --- |
| RAW `movements` | **105** |
| `writeoff_valuations` | 3 rows, **all reversed**, all parents row-level cancelled |
| layer capability | `active: true`, `version: 36` |
| Test Anbar / 0000001 | balance **8**, 2 active layers |
| Test Anbar / 0000002 | balance 0, no layers |
| CODEX Phase8 Transfer Anbar (both codes) | balance 0, no layers |
| negative balances | **none** |

RAW-derived balances were recomputed independently and match
`get_stock_layers()` exactly.

The only warehouse/item with active stock carried **precisely the two layer
states the matrix needs**:

| Layer | source_type | price_status | unit_price | available |
| --- | --- | --- | --- | --- |
| `b633360d-5035-4ed2-83c0-90f9d0f7e912` | `legacy_unresolved` | **unknown** | null | 7 |
| `fcb7f7b1-cb77-4814-8ef6-9f73b1c664f9` | `receipt` | **known** | 15 | 1 |

## 3. Structural constraint discovered in the supported UI

`Silinmə` uses the **bulk** picker (`BulkPickDialog`), not the single-item form.
For this item the row is condition-**marked**, so `Miqdar` is `readOnly` and the
total is `7.01 + the İcarədə bucket` (max 0.99). Measured directly:

- all buckets `0` → required qty **7.01** (the floor)
- İcarədə `0.5` → required qty 7.51

**Consequence:** the smallest supported write-off is **7.01**, which exceeds the
known layer 1.00, so *any* allocation-only write-off on this fixture must draw
from the unknown-price layer. By `layerCalc()`, unknown > 0 forces
`sourceAmount = null`. **A stored non-null `final_amount` is therefore NOT
reachable by layer allocation alone here** — only through the supported admin
«Yekun məbləğ» override in `LayerPickDialog`. That override is a real, supported
UI control (`checkFinalAmount()` requires a reason), not a fabrication.

No supporting receipt was created. No unrelated quantity was consumed.

---

## 4. Leg B — stored unknown / null-final: **LIVE VERIFIED**

Posted through the React UI, 7.01 split 7 (unknown layer) + 0.01 (known layer),
no override.

| Field | Value |
| --- | --- |
| document | **`SND-7FD2038C2E`** |
| movement id | **`ff961a32-2aab-4e02-bc85-f0c5393fc8b9`** |
| posting RPC | `post_layer_movement_document` |
| request key | `7affa40e-e969-49a6-8942-a1aef676e10b` |
| allocations | `b633360d… : 7`, `fcb7f7b1… : 0.01` |

Stored `writeoff_valuations` row read back by id:

```
source_amount     null
known_amount      0.15
unknown_qty       7
final_amount      null
valuation_method  "unknown"
override_reason   null
```

**Independent expectation** (plain arithmetic, no application helper imported):
known part = 0.01 × 15 = **0.15** ✓ · unknown qty = **7** ✓ · unknown > 0 ⇒
source and final null ✓.

**Operational and rendered.** The surviving set was recomputed independently
from the legacy cancellation rules (`excludeCancelled()` was NOT imported or
called): RAW 106 → OPERATIONAL **4**, and the DOM `<tbody>` held exactly **4**
rows, element-for-element, including `ff961a32…`.

Rendered cells: **QIYMƏT `—`, MƏBLƏĞ `—`** — the em-dash behaviour M8-05
requires for a stored null-final row.

### The stored-unknown branch is distinct from the price-zero branch

Both print `—`, for structurally different reasons, and both were visible in the
same DOM snapshot:

| Row | Branch | Why `—` |
| --- | --- | --- |
| `ff961a32…` (7.01) | **stored unknown** — valuation row exists, `final_amount` null, method `unknown` | `val.final == null` |
| `bd8369ee…` (3.00) | no-valuation / price-zero (already verified) | legacy derive, `pr <= 0` |

## 5. Leg A + Leg C — stored known final and quotient precision: **LIVE VERIFIED**

Posted through the React UI for the remaining 0.99 (known layer only) with the
supported admin override «Yekun məbləğ» = `10.00` and a mandatory reason. The
app own İcarə gate («İcarədə olan maldan istifadə») demanded a written reason
and was satisfied through the dialog, as a real user must.

| Field | Value |
| --- | --- |
| document | **`SND-4C3E500866`** |
| movement id | **`b317fe0b-9059-48d1-bbcb-645a32c50f16`** |
| posting RPC | `post_layer_movement_document` |
| request key | `0b3f4398-72a0-4020-9766-2defdd240ad8` |
| allocation | `fcb7f7b1… : 0.99` |

Stored valuation row:

```
source_amount     14.85
known_amount      14.85
unknown_qty       0
final_amount      10          <-- non-null: B1
valuation_method  "admin_override"
override_reason   "M8-05 Leg C quotient precision fixture"
```

`valuation_method = "admin_override"` is a **third live method value**, not
previously recorded on TEST alongside `source` and `unknown`.

### The DOM uses the stored `final_amount`, not the ordinary price chain

Rendered cells for this row: **QIYMƏT `10.10`, MƏBLƏĞ `10.00 ₼`** at out_qty 0.99.

| Candidate chain | Would render | Observed |
| --- | --- | --- |
| stored `final_amount` (M8-05) | `10.00 ₼` | ✅ **this** |
| layer/source amount 14.85 | `14.85 ₼` | ✗ |
| item nomenclature price | 10.00/11.00 chain | ✗ |

The amount can only come from `final_amount`: the source amount was 14.85 and is
absent from the DOM.

### Quotient precision — the real rounding rule, not trailing zeros

Computed independently (no application helper):

```
final_amount / out_qty = 10 / 0.99 = 10.101010101010…   (non-terminating)
required 4-dp value                = 10.101
movements.price stored by server   = 10.101              ← exact match
DOM QIYMƏT = nf(price, 2)          = 10.10               ← observed
```

The 4-dp claim is earned, not cosmetic: **2 dp (10.10) differs from 4 dp
(10.1010)**, so the fixture genuinely discriminates the rounding depth.

## 6. Branches NOT promoted

| Branch | Status | Exact reason |
| --- | --- | --- |
| B4 — legacy no-valuation, `pr > 0` | **CODE VERIFIED**, not promoted | Every supported current posting path writes a `writeoff_valuations` row (both fixtures did). Producing a `Silinmə` row with `price > 0` and **no** valuation row would require fabricating an unsupported historical row, which the brief forbids. The four RAW rows in that shape are all cancelled. |
| B5 — legacy `pr <= 0` | already LIVE VERIFIED | 2026-09-09 M8-03/M8-05/M8-52 check; not re-run. |

## 7. Net-zero closure

Both documents were cancelled through their real layer-aware document cards
(«Əməliyyatı ləğv et»), newest first.

| Check | Baseline | Final | Result |
| --- | --- | --- | --- |
| Test Anbar / 0000001 balance | 8 | **8** | restored |
| layer `b633360d…` available | 7 | **7** | restored |
| layer `fcb7f7b1…` available | 1 | **1** | restored |
| negative balances | 0 | **0** | clean |
| unreversed valuation rows | 0 | **0** | clean |
| RAW `movements` | 105 | **109** | +4, immutable |

Reversal linkage read back per row:

| source movement | reversal movement | reversal doc | `reversed_at` |
| --- | --- | --- | --- |
| `b317fe0b…` (0.99 out) | `2b4e90e5-2599-469b-8018-5cf506978f4c` (0.99 in) | `SND-C-832404E6E0` | 2026-09-09T12:20:24Z |
| `ff961a32…` (7.01 out) | `b528ac1b-098b-4cc8-8d78-602990e66a91` (7.01 in) | `SND-C-AFB3B32539` | 2026-09-09T12:20:39Z |

Each valuation row carries `reversed_at` and `reversed_by_movement_id` pointing
at its reversal. **The honest raw count increase is +4** — 2 fixture movements
plus 2 reversal movements. Net-zero means stock, layers and balances, not row
deletion: no movement, valuation, reversal, link or audit history was deleted.

The registry returned to its original 3 visible rows, confirmed in the DOM after
cancellation.

No supporting receipts were required, so no receipt cancellation was needed.

## 8. Closure state

| Check | Result |
| --- | --- |
| write-enabled process | stopped; port closed |
| localhost restarted read-only | `--mode sandbox --host 127.0.0.1 --port 5175`, **HTTP 200** |
| `VITE_ALLOW_LOCAL_WRITES` | **`false`** in the env file; write banner absent from the UI |
| project ref | TEST `alkjjbaawmsirsfvqljm` |
| production contact attempts | **0** |
| active device sessions | **0** (all released) |
| staged changes | **0** |
| dirty working tree | preserved (213 entries, unchanged) |
| application code changed | **none** |

## 9. Evidence discipline

Raw movement rows, valuation rows, selected-layer state, the independently
recomputed operational set and the rendered DOM were kept as separate artefacts.
Every row is identified by UUID and document number. Expected values were
computed with plain arithmetic in the harness — `movementValuation()` and
`writeOffUnitPrice()` were never imported to produce an expectation.
