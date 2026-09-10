# Phase 8 — M8-45 failed-refresh snapshot retention live check

Date: 2026-09-09 (Asia/Baku)

Target: TEST Supabase `alkjjbaawmsirsfvqljm`. Production
`bbjmhaerssakbreykxiw` was never contacted; see Safety.

## Scope

This closes the live half of `M8-45` — "a failed refresh retains the previous
snapshot". The row was previously `CODE VERIFIED (I-2)` on store and component
tests only. What was missing was a real browser, a real TEST session, a real
transport failure and the real React screen. That is what this check supplies.

It does not promote any other row, and it does not repeat the existing unit
tests.

## Environment

- `web/.env.sandbox.local` → `VITE_SUPABASE_URL=https://alkjjbaawmsirsfvqljm.supabase.co`,
  `VITE_ALLOW_LOCAL_WRITES=false`, `VITE_TEST_ENVIRONMENT=true`.
- Localhost started as
  `npm run dev -- --mode sandbox --host 127.0.0.1 --port 5175`. Vite reported
  the `sandbox` mode badge and answered HTTP 200.
- Two pre-existing dev-server processes (PIDs 3124 on 5175, 16892 on 5176) were
  stopped first, because a server whose mode could not be established must not
  supply acceptance evidence. Exactly one verified sandbox server then ran.
- Browser control: Playwright 1.63.0 driving **installed Chrome**
  (`channel: 'chrome'`), imported from the npm `_npx` cache. It was
  deliberately **not** added to `web/package.json` or `web/node_modules`;
  `git diff web/package.json` shows only the pre-existing `xlsx` line.
- Session: real React login as the TEST admin `anbar-admin-test@example.com`.
  The auth response was HTTP 200 with issuer
  `https://alkjjbaawmsirsfvqljm.supabase.co/auth/v1`.

## Baseline snapshot (leg A, success)

Recorded from the real «Mal hərəkəti» screen after a successful load:

- table rows: **3**
- footer KPI line:
  `3 qeyd · mədaxil 11.00 · məxaric 3.00 · mədaxil dəyəri 111.00 ₼`
- row identity (first rows, trimmed):
  - `03.09.2026 Test Anbar 0000001 TEST Mal 1 Alış … 1.00 — 11.00 11.00 ₼`
  - `02.09.2026 Test Anbar 0000001 TEST Mal 1 Silinmə … 3.00 …`
  - `01.09.2026 Test Anbar 0000001 TEST Mal 1 Alış … 10.00 — 10.00 100.00 ₼`
- no «Yenilənmədi» banner, no «Yükləmə xətası», loading finished.

### Count reconciliation — 101 vs 3

The expected baseline of **101 movements was verified, not assumed**, and both
figures are correct at the same time. The captured `movements` REST response
returned **101 rows**
(`/rest/v1/movements?select=id,item_code,warehouse,date,in_qty,out_qty,price,partner,type,invo…`),
matching the 2026-09-09 role/RLS audit exactly. The table shows 3 because the
screen renders `excludeCancelled()` output, and the accumulated Phase 8
cancellation/reversal fixtures account for the difference. The 101-row figure
is the raw admin-visible set; the 3-row figure is the operational set. No
fixture was added or removed by this check.

## Injected failure

Exactly one required TEST read was failed, by URL pattern
`**/rest/v1/movements**`, fulfilled with HTTP **503** and body
`{"message":"Service Unavailable (M8-45 injected)"}`.

- Auth requests were **never** intercepted.
- No mutation RPC was called or intercepted.
- The interception was armed only for the middle leg and removed for leg C.

## Leg B — failed refresh through the real UI

The refresh was triggered through the real React UI by navigating to
«Nomenklatura» and back to «Mal hərəkəti», which remounts the page and calls
the store's `load()`. 16 intercepted `movements` requests were answered 503
across the run.

Observed live, with the interception active:

| Proof | Result |
| --- | --- |
| previously loaded table still visible | YES — 3 rows still rendered |
| row/document identity unchanged | YES — byte-identical first-row strings |
| footer count/totals unchanged | YES — `3 qeyd · mədaxil 11.00 · məxaric 3.00 · mədaxil dəyəri 111.00 ₼` |
| refresh-failure warning displayed | YES — `Yenilənmədi Service Unavailable (M8-45 injected) · Ekranda son uğurlu oxunuşun məlumatı göstərilir.` |
| no hard error screen | YES — «Yükləmə xətası» absent |
| loading finished | YES — «Yüklənir…» absent |
| controls usable | YES — search, «Sıfırla», «Excel», «Yeni əməliyyat» all enabled |

This is the exact contract of `movements.store.ts:218`, where a failed fold
sets only `loading` and `error` and leaves `rows`, `valuations` and `loaded`
untouched, and of `MovementsPage.tsx:647-653`, where the banner renders ABOVE
the retained table under `error && loaded`.

### One instrumentation correction, recorded rather than hidden

The first scripted attempt reported `banner:false` and was **not** accepted as
evidence. Its post-navigation wait (7 s) sampled the DOM before the failed load
settled. The wait was raised to 9 s and the run repeated; the banner was then
observed, together with the retained rows. The corrected run is the evidence
above. No code was changed to obtain it.

## Leg C — recovery

The interception was removed and the same real navigation refresh was repeated:

- table rows: **3**
- footer: `3 qeyd · mədaxil 11.00 · məxaric 3.00 · mədaxil dəyəri 111.00 ₼`
- «Yenilənmədi» banner: **absent**

The page recovers on its own and the successful snapshot still matches TEST.

## Safety

- Production contact attempts: **0**. A blanket route aborted any URL
  containing `bbjmhaerssakbreykxiw`; the counter stayed 0 in every run.
- Every non-GET request in the audited run was a read-only RPC:
  `register_session`, `get_reference_values`, `get_user_directory`,
  `stock_layers_supported`. **No mutation RPC, no fixture write, no database
  write.**
- Movement count unchanged: the server returned 101 rows before and the
  operational view stayed 3 throughout; nothing was created, cancelled or
  corrected.
- Localhost remains TEST sandbox and read-only:
  `VITE_ALLOW_LOCAL_WRITES=false`, HTTP 200.
- `git diff --cached` is empty — nothing staged. The dirty working tree (213
  entries) is preserved. No commit, push or deployment.
- Playwright was not installed into the project; `web/package.json` carries
  only its pre-existing `xlsx` modification.
- No I-10 row was created.

## Result

`M8-45` is **LIVE VERIFIED** for this scope: TEST admin, the real React
«Mal hərəkəti» screen, a controlled HTTP 503 on the `movements` read, snapshot
retention, the exact warning text, usable controls and clean recovery.

Not covered by this check, and still narrow: other roles (`anbardar`,
`rehber`), the `writeoff_valuations` / `items` / `warehouses` failure legs
(each fatal by the same atomic fold, but only `movements` was exercised live),
a transport-level abort as distinct from an HTTP 503, and concurrent
refresh/stale-response interleaving (`M8-44`).

Phase 8 remains **NOT ACCEPTED** because unrelated OPEN rows remain.
