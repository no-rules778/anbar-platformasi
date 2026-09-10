# Phase 8 — M8-54 fully-resolved `transferRoute()` and `movKey()` `route:`

Date: 2026-09-09 (Asia/Baku)
Environment: TEST `alkjjbaawmsirsfvqljm` only, read-only sandbox
Actor: TEST admin
Result: PASS — the two branches previously CODE VERIFIED are now proved

**EVIDENCE CLASS: browser-contract evidence, NOT persisted TEST data.** The
three rows below existed only in a `movements` response this harness rewrote in
flight. Nothing was written to TEST: `0` mutation RPCs and `0` non-GET
`movements` requests were observed, and the database is unchanged.

## Why a harness is required, not merely convenient

`transferRoute()`'s fully-resolved `A → B` branch and `movKey()`'s `route:`
branch cannot be reached by any real TEST transfer, for a reason that is a
**TEST-data naming artifact, not a product defect**:

- the server stores a transfer's `partner` as `"<Warehouse> anbarı/anbarına"` —
  confirmed on real rows, e.g. `SND-8DC5E59E8D` stores
  `"CODEX Phase8 Transfer Anbar anbarına"`;
- `normWhName()` (`movementRoute.ts`) strips exactly ONE trailing
  `anbar|anbarı|anbarına` token;
- both TEST warehouses are themselves named `"… Anbar"`, so
  `"CODEX Phase8 Transfer Anbar anbarı"` → `"codex phase8 transfer anbar"`,
  while the configured warehouse normalises to `"codex phase8 transfer"`.
  `resolveWh()` matches exactly and never guesses, so it returns `null`.

Every real TEST transfer is therefore half-resolved. The five production
warehouses (`Ələt`, `Astara`, `Xocahəsən`, `Harmony`, `Ofis`) do not end in
`Anbar` and resolve in one pass under the same rule.

**No warehouse was renamed, no TEST row was written, and no application code
was changed.** The fully-resolved input was supplied only in the browser's copy
of the response.

## Method

Read-only sandbox `127.0.0.1:5175` (`VITE_ALLOW_LOCAL_WRITES=false`, HTTP 200),
blanket route aborting any `bbjmhaerssakbreykxiw` URL. Three synthetic
`Yerdəyişmə` rows were prepended to every `movements` response inside a WINDOW
(4 responses marked — a remount issues several reads, and marking only the
first would let a later unmarked load win).

Expectations were recomputed **independently** in the harness from the legacy
rules (`index.html:1430-1452, 1476-1483`); the application helpers under test
were never imported or called.

| control | `partner` supplied | purpose |
| --- | --- | --- |
| POSITIVE | `CODEX Phase8 Transfer Anbar` | must fully resolve |
| NEGATIVE | `CODEX Phase8 Transfer Anbar anbarı` (the REAL stored form) | must stay half-resolved — proves the harness is not forcing resolution |
| NEG2 | `Qeyri-mövcud Anbar XYZ` | must stay half-resolved — proves resolution requires a CONFIGURED warehouse |

All three share `warehouse: Test Anbar`, `out_qty: 0.01`, so only `partner`
differs — the single variable under test.

## Result — DOM vs independent computation

| control | independently computed | DOM İSTIQAMƏT / KONTRAGENT | match |
| --- | --- | --- | --- |
| POSITIVE | `Test Anbar → CODEX Phase8 Transfer Anbar` | `Test Anbar → CODEX Phase8 Transfer Anbar` | **yes** |
| NEGATIVE | `Test Anbar → —` | `Test Anbar → —` | **yes** |
| NEG2 | `Test Anbar → —` | `Test Anbar → —` | **yes** |

`transferRoute()`'s **fully-resolved `A → B` branch is LIVE**, and both
negative controls held — the harness discriminates rather than resolving
everything it touches.

### `movKey()`'s `route:` branch, read as literal option values

The «İstiqamət / kontragent» filter is built from `movKey()`/`movKeyLabel()`,
so its OPTION VALUES expose the key prefix directly. Observed:

- **`route:Test Anbar → CODEX Phase8 Transfer Anbar`** ← the `route:` branch
- `raw:CODEX Phase8 Transfer Anbar anbarı`
- `raw:Qeyri-mövcud Anbar XYZ`

This is the exact prefix discrimination the contract specifies: a transfer with
BOTH sides recognised takes `route:`, and a half-resolved route is deliberately
NOT merged — it keeps its own stored text under `raw:`. Each option value
equals the independently computed `movKey()` for its row.

## Interception removed, real snapshot restored

The route was unrouted and the screen remounted. The recovered screen shows
**`anySynthetic: false`**, 3 rows, footer
`3 qeyd · mədaxil 11.00 · məxaric 3.00 · mədaxil dəyəri 111.00 ₼` — identical
to the pre-injection snapshot captured at the start of the same run.

## Safety

0 production contacts; 0 mutation RPCs; 0 non-GET `movements` requests; no TEST
fixture created or deleted; read-only sandbox throughout; session closed. No
commit, stage, push or deploy; dirty tree preserved; no `I-10` row.

## Scope

Closes M8-54's last two branches for TEST admin. Not claimed: other roles, and
production-name resolution (asserted only as the reason the artifact is
TEST-specific, and computed independently — not observed live against
production, which was never contacted).
