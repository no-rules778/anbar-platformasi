# Phase 8 — M8-11 soft cap / «Hamısını göstər» / stickiness live check

Date: 2026-09-09 (Asia/Baku)

Target: TEST Supabase `alkjjbaawmsirsfvqljm`. Production `bbjmhaerssakbreykxiw`
was never contacted — a context-level `route.abort()` guard counted
**0 attempts**.

Read-only throughout: **no database mutation, no fixture write, no
application-code change**, no commit/stage/push/deploy, no I-10 row. `Çap` is
outside acceptance. M8-09, M8-44 and M8-45 were not repeated.

## Scope statement — read this before quoting any number

This is a **controlled browser-only presentation fixture**. The 3001-row set
existed **only as an HTTP response body inside one Chrome context**. It is:

- **NOT** 3001 rows stored in TEST — the real TEST table held **105** rows
  before, during and after the run;
- **NOT** backend-volume evidence;
- **NOT** payload-performance evidence;
- **NOT** M8-53 evidence, and no payload claim is made here.

It verifies exactly one thing: the **React soft-cap contract** — that the cap,
the reveal control, the footer source and the stickiness behave as the ledger
specifies. Nothing about the server was measured.

## Environment

- `web/.env.sandbox.local` → TEST URL only, `VITE_ALLOW_LOCAL_WRITES=false`,
  0 production refs; verified before browser use and never edited.
- Localhost freshly started as
  `npm run dev -- --mode sandbox --host 127.0.0.1 --port 5175` (PID 21080,
  no write flag in the process command line); HTTP 200 at start and close.
- Playwright driving installed Chrome from the npm `_npx` cache.
- Real React login as TEST admin; session ended through the real «Çıxış».

## Contract read from source before testing

- `SHOW_MAX = 3000` (`lib/showAllCut.ts:9`) — used as-is, **not** reduced.
- `applyCut(all, showAll)` returns `all` when `showAll` or `all.length <= SHOW_MAX`.
- `MovementsPage.tsx:259` — `kpis` is computed over **`all`** (the full filtered
  set), `:262` — the cap applies only to `page` (the rendered slice).
- `:709` — the control renders only while `!showAll && all.length > SHOW_MAX`.
- `store/movements.store.ts:179-180` — `showAll` is **NOT** reset by «Sıfırla».
- The ledger requires stickiness across **filter changes and «Sıfırla»** only.
  It does **not** require navigation/remount persistence, so that was not
  invented or tested.

## Real TEST baseline (measured, preserved for recovery comparison)

| Fact | Value |
| --- | --- |
| RAW movements | **105** (freshly measured; one page, StrictMode-duplicated = one logical load) |
| operational / rendered rows | **3** |
| footer | `3 qeyd · mədaxil 11.00 · məxaric 3.00 · mədaxil dəyəri 111.00 ₼` |
| «Hamısını göstər» at/below the cap | **absent** — the required negative control |

## The synthetic browser-only dataset

Modelled structurally on ONE real operational row
(`43036d8e-…`, `Alış`, Test Anbar). Built and asserted **outside** the browser:

| Property | Value |
| --- | --- |
| rows | **3001** = `SHOW_MAX + 1` |
| unique ids | 3001 (asserted) |
| unique `doc_num` | 3001 (asserted, `SYN-M811-00000…`) |
| cancellation/reversal marker notes | **none** (asserted by regex) |
| types | `Satınalma` **3000** + `Silinmə` **1** |
| warehouses | `Test Anbar` / `CODEX Phase8 Transfer Anbar` |
| per-row identity | `note` = `M8-11 SYNTHETIC BROWSER-ONLY <i>` |

`Satınalma` was chosen deliberately: `MOVEMENT_TYPE_FILTERS` is a **fixed
eight-type list** that does not contain `Alış`, so a first attempt using `Alış`
produced a type option that could not be selected. That was a flaw in the
fixture, corrected — not an application defect.

**Interception discipline.** Only the exact full-column
`GET /rest/v1/movements` snapshot (matched by `created_by` + `contract_num`) was
fulfilled. Auth, every `/rpc/`, `items`, `warehouses` and `writeoff_valuations`
were **never** intercepted. Interception was switched on only after login and
off again before recovery.

Paging was honoured per request (`offset`/`limit`), so the app's own paging loop
assembled the set exactly as it does live:

| offset | served |
| --- | --- |
| 0 | 1000 |
| 1000 | 1000 |
| 2000 | 1000 |
| 3000 | **1** (short page → loop stops) |

8 intercepted requests = **4 distinct offsets, each duplicated by StrictMode** —
one logical load of **3001** rows, every duplicate fulfilled with the identical
dataset.

**No synthetic row left the browser and no Supabase write occurred.**

---

## Leg A — boundary and cap

| Assertion | Expected | Observed |
| --- | --- | --- |
| full filtered result | 3001 | **3001** (footer `3,001 qeyd`) |
| table renders | 3000 | **3000 DOM rows** |
| footer computed from the FULL set, not the slice | 3001 | `3,001 qeyd · mədaxil 3,000.00 · məxaric 1.00 · mədaxil dəyəri 6,000.00 ₼` |
| control appears | yes | **`Hamısını göstər (3,001)`** |
| cap notice | — | `· 3,000 göstərilir` |

The footer proves the key separation: `məxaric 1.00` comes from the single
`Silinmə` row, which is **row 3001** — the one row the cap hides. A footer
computed from the rendered slice could not have counted it.

### Positive boundary controls

| Filter | Result size | Control |
| --- | --- | --- |
| type = `Satınalma` | **exactly 3000** (`3,000 qeyd`) | **absent** — no affordance at exactly `SHOW_MAX` |
| type = `Silinmə` | **1** (well below cap) | **absent** |
| filter cleared | back to 3001 | **returns** — `Hamısını göstər (3,001)` before expansion |

## Leg B — expansion through the real control

The control was clicked as a real visible button. The Zustand store was never
set directly, no internal helper was called, and no page state was mutated
through JavaScript.

| Assertion | Expected | Observed |
| --- | --- | --- |
| rendered rows after expansion | 3001 | **3001** |
| footer unchanged | identical | `3,001 qeyd · mədaxil 3,000.00 · məxaric 1.00 · mədaxil dəyəri 6,000.00 ₼` — **unchanged** |
| control after expansion | disappears | **absent** (`!showAll` no longer holds) |

## Leg C — stickiness

| Step | Expected | Observed |
| --- | --- | --- |
| filter to `Satınalma` after expanding | renders normally, uncapped | **3000 rows**, footer `3,000 qeyd`, no control |
| click real «Sıfırla» | result returns to 3001 | **3001** |
| all rows still rendered | 3001, **not** re-capped to 3000 | **3001 DOM rows** |
| expansion choice survived filter change AND reset | yes | **yes** — the control did not reappear |

Navigation/remount persistence was **not** tested: the ledger does not require
it, and inventing the requirement would risk a false failure or a false claim.

## Falsifiability — exact ID accounting

DOM identity was read from the `Qeyd` column, which carries the unique
per-row index, and compared against the independently generated set.

| Leg | DOM | expected | missing | unexpected | duplicates | verdict |
| --- | --- | --- | --- | --- | --- | --- |
| A initial (capped) | 3000 | subset of 3001 | — | 0 non-synthetic | **0** | proper subset, every row synthetic |
| B expanded | 3001 | 3001 | **0** | **0** | **0** | **EXACT MATCH** |
| A exactly-3000 | 3000 | 3000 | **0** | **0** | **0** | **EXACT MATCH** |
| C filtered | 3000 | 3000 | **0** | **0** | **0** | **EXACT MATCH** |
| C after reset | 3001 | 3001 | **0** | **0** | **0** | **EXACT MATCH** |

**Rows hidden by the cap and revealed by expansion: exactly 1** —
`M8-11 SYNTHETIC BROWSER-ONLY 0`. Counts came from DOM rows, independently
generated IDs and footer text; no screenshot was relied upon.

## Recovery

Interception was removed completely, then a real refresh was triggered by
navigating to Nomenklatura and back (a genuine remount, not a forced reload).

| Assertion | Baseline | After recovery | Match |
| --- | --- | --- | --- |
| rendered rows | 3 | **3** | YES |
| footer | `3 qeyd · mədaxil 11.00 · məxaric 3.00 · mədaxil dəyəri 111.00 ₼` | **identical string** | YES |
| synthetic identity remaining | — | **none** (`Synthetic price observation`, `Synthetic outgoing`, `Synthetic incoming` — the real rows) | YES |
| error banner | — | **none** | YES |

## Reconciliation

- Real TEST movement count: **105**, unchanged — the synthetic set never
  reached Supabase.
- Non-GET traffic, all read-only/session RPCs: `register_session`,
  `get_reference_values`, `get_user_directory`, `stock_layers_supported`,
  `touch_session`, plus a `HEAD` count probe on `audit_log`. **No mutation RPC,
  no INSERT/UPDATE/DELETE, no fixture write.**
- Production contact attempts: **0**.
- Session ended through the real «Çıxış»; no active device session.
- Localhost remains TEST sandbox/read-only, HTTP **200**,
  `VITE_ALLOW_LOCAL_WRITES=false`.
- Nothing staged; 24 modified tracked files, identical to the pre-run list; no
  application source touched (verified by mtime).
- Focused tests: `MovementsPage.test.tsx` **67 passed / 67**, against the real
  `SHOW_MAX`.

## Verdict

**M8-11 → LIVE VERIFIED** for the cap, the reveal control, the full-set footer
source, the boundary behaviour at exactly `SHOW_MAX`, and stickiness across a
filter change and «Sıfırla» — all through the real UI at the real `SHOW_MAX`,
with exact ID accounting. The evidence is **React-contract evidence only**; no
backend-volume, payload or M8-53 claim is made.
