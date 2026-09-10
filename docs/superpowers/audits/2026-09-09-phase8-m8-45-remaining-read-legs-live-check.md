# Phase 8 — M8-45 remaining failed-refresh legs live check

Date: 2026-09-09 (Asia/Baku)

Target: TEST Supabase `alkjjbaawmsirsfvqljm`. Production
`bbjmhaerssakbreykxiw` was never contacted (0 attempts).

## Scope

Completes the `M8-45` failed-refresh matrix left open by
[the movements/503 check](2026-09-09-phase8-m8-45-failed-refresh-retention-live-check.md).
That audit covered `movements` + HTTP 503 only; it is **not repeated here**.

This check adds the three remaining core reads and the transport-failure
shape:

| Leg | Endpoint | Failure |
| --- | --- | --- |
| 1 | `/rest/v1/items?select=code,name,unit,price,category&order=code.asc` | HTTP 503 |
| 2 | `/rest/v1/warehouses?select=*&offset=0&limit=1000` | HTTP 503 |
| 3 | `/rest/v1/writeoff_valuations?select=movement_id,source_amount,known_amount,unknown_q…` | HTTP 503 |
| 4 | `/rest/v1/items?select=code,name,unit,price,category&order=code.asc` | **transport abort** (`route.abort('failed')`) |

Auth and every `/rest/v1/rpc/` request were excluded from interception by an
explicit guard. `M8-44` stale-response interleaving is deliberately NOT claimed
from these sequential failures.

## Environment

- `web/.env.sandbox.local` → TEST URL, `VITE_ALLOW_LOCAL_WRITES=false`,
  `VITE_TEST_ENVIRONMENT=true`, all verified before browser use.
- Localhost started only as
  `npm run dev -- --mode sandbox --host 127.0.0.1 --port 5175`. The previously
  running server (PID 18776) was stopped and replaced by a freshly started
  sandbox instance (PID 24452) so the `sandbox` mode badge provably belongs to
  the process under test. HTTP 200.
- Playwright 1.63.0 driving installed Chrome from the npm `_npx` cache; not
  added to `web/package.json` or `web/node_modules`.
- Real React login as TEST admin `anbar-admin-test@example.com`.

## Baseline (leg A, success)

- table rows: **3**
- footer: `3 qeyd · mədaxil 11.00 · məxaric 3.00 · mədaxil dəyəri 111.00 ₼`
- row identity (first rows, trimmed):
  - `03.09.2026 Test Anbar 0000001 TEST Mal 1 Alış … 1.00 — 11.00 11.00 ₼`
  - `02.09.2026 Test Anbar 0000001 TEST Mal 1 Silinmə … 3.00 …`
  - `01.09.2026 Test Anbar 0000001 TEST Mal 1 Alış … 10.00 — 10.00 100.00 ₼`
- stale-data banner: **absent**
- raw `movements` response: **101 rows** — re-measured this run, matching the
  established baseline. The table shows 3 because it renders
  `excludeCancelled()` output.

## Results — all four legs PASS

Every leg was proved on the settled failure state, with the failed request(s)
observed in the network log before the DOM was accepted.

| Proof | items/503 | warehouses/503 | writeoff_valuations/503 | items/abort |
| --- | --- | --- | --- | --- |
| failure actually observed | YES | YES | YES | YES |
| previous table still visible (3 rows) | YES | YES | YES | YES |
| row identity unchanged | YES | YES | YES | YES |
| footer totals unchanged | YES | YES | YES | YES |
| stale-data banner shown | YES | YES | YES | YES |
| no full-screen «Yükləmə xətası» | YES | YES | YES | YES |
| loading settled | YES | YES | YES | YES |
| controls enabled (search/Sıfırla/Excel/Yeni əməliyyat) | YES | YES | YES | YES |
| recovery returns identical snapshot | YES | YES | YES | YES |
| banner cleared after recovery | YES | YES | YES | YES |

### Banner text per leg — each distinct, and each meaningful

- `items` 503 —
  `Yenilənmədi Service Unavailable (M8-45 items) · Ekranda son uğurlu oxunuşun məlumatı göstərilir.`
- `warehouses` 503 —
  `Yenilənmədi Anbar siyahısı yüklənmədi · Ekranda son uğurlu oxunuşun məlumatı göstərilir.`
  The server message is NOT passed through here because `fetchWarehouses()`
  THROWS rather than returning `{ error }`; the snapshot normaliser converts
  the rejection to the `FAIL_WAREHOUSES` constant. That is the documented
  both-failure-shapes contract behaving correctly, not a lost message.
- `writeoff_valuations` 503 —
  `Yenilənmədi Service Unavailable (M8-45 writeoff_valuations) · Ekranda son uğurlu oxunuşun məlumatı göstərilir.`
  **This is the live confirmation of the I-2 audit correction.** A failed
  valuation read is FATAL and retains the whole snapshot; it does not degrade
  into `ok: true` with an empty valuation map, so displayed `Silinmə` amounts
  cannot shift under a transient failure.
- `items` transport abort —
  `Yenilənmədi TypeError: Failed to fetch · Ekranda son uğurlu oxunuşun məlumatı göstərilir.`
  A transport failure surfaces as a rejected promise and is absorbed by the
  same retention path as an HTTP error, with a visibly different message.

Recovery after every leg returned the identical snapshot (3 rows, identical
footer, identical row identity) with no banner, so no stale failure state
leaked into the following leg.

## Method correction — recorded, not hidden

The first execution of this matrix reported `bannerShown: false` on **all four
legs** and was **rejected as evidence**, not reported as a pass. Two real
instrumentation faults were found by tracing the actual request sequence:

1. **Nomenklatura issues its own `items` and `warehouses` reads with the same
   select signature.** A one-shot interceptor armed before navigation disarmed
   on Nomenklatura's request, so the Mal hərəkəti snapshot read then succeeded
   normally — the absent banner was correct behaviour for a refresh that never
   failed.
2. **React StrictMode issues each snapshot read twice.** Failing only the first
   still let the second succeed, so the fold stayed `ok`.

The interceptor was changed from a one-shot to a failure **window** opened only
after Nomenklatura settles and closed once the leg is sampled, and every failed
request is recorded rather than assumed. `failedRequestCount` is 8 per leg,
which is the window's total (StrictMode double-issue plus paging), not eight
distinct reads.

**No application code was changed to obtain these passes.** The correction was
entirely in the test harness. The settle wait was 10 s per sample.

## Safety

- Production contact attempts: **0** (blanket route aborting any
  `bbjmhaerssakbreykxiw` URL; counter asserted).
- Raw movement count: **101 before and after** — unchanged.
- Non-GET requests observed across the whole run were read-only RPCs only:
  `register_session`, `get_reference_values`, `get_user_directory`,
  `stock_layers_supported`, `touch_session`. **No mutation RPC was called.**
- **No database fixture was created, modified or deleted.**
- Localhost remains TEST sandbox/read-only: `VITE_ALLOW_LOCAL_WRITES=false`,
  HTTP 200.
- `git diff --cached` empty; dirty working tree (213 entries) preserved. No
  commit, staging, push or deployment. No I-10 row.

## Result

Combined with the earlier movements/503 audit, `M8-45` now has live evidence
for **all four core reads** (`movements`, `items`, `warehouses`,
`writeoff_valuations`) and for **both failure shapes** (HTTP 503 and transport
abort), each with retention, the correct banner, settled loading, usable
controls and clean recovery — TEST admin, real React UI.

Still NOT covered for this row: other roles (`anbardar`, `rehber`), and
concurrent stale-response interleaving, which belongs to `M8-44` and is not
claimed here.

Phase 8 remains **NOT ACCEPTED** because unrelated OPEN rows remain.
