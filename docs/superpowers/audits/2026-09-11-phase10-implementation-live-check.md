# Phase 10 — implementation audit, gate and live read-only sweep

Date: 2026-09-11 (Asia/Baku, ~00:10–00:32)
Scope: the Module K implementation written before this session
(`lib/warehouseOverview.ts`, `api/warehouseOverviewSnapshot.api.ts`,
`store/warehouseOverview.store.ts`, `pages/WarehouseOverviewPage.tsx`, the
`anb` wiring in `App.tsx`) audited line by line against the accepted 36-row
ledger and legacy `index.html:255-262, 371-376, 930-946, 1174, 1247-1320,
1409-1414, 1678-1681, 2900-2917, 6788-6804`; missing tests added; one final
offline gate; one read-only TEST browser sweep.
Verdict: **three concrete defects fixed, no application logic rewritten; 9
rows `LIVE VERIFIED`, 26 `CODE VERIFIED`, 1 `IN PROGRESS` (M10-51, admin leg
needs an unavailable identity). Phase 10 remains `NOT ACCEPTED`** pending
Codex's final independent audit. The tally is stated once, in the ledger, and
was derived mechanically (command in § Tally).

## Evidence classes (kept distinct)

| Class | Source |
|---|---|
| **Unit / source** | vitest over the pure lib, the snapshot API (readers mocked), the store (API mocked), the page (store + hook mocked, REAL `ItemCard`), the App rail (pages stubbed) |
| **Browser interception** | Playwright 1.63.0 + installed Chrome driving the sandbox dev server on 5175 (`VITE_ALLOW_LOCAL_WRITES=false`, served bundle verified to reference only the TEST ref); every `/rest/v1/` request recorded; 503 / network-abort injection on a window |
| **Persisted TEST** | none — no write was attempted; the TEST rows read are those RLS returns to the anbardar |
| **Captured server metadata** | none used in this phase |
| **Unavailable external** | a TEST admin identity (M10-51 admin leg); a rehber identity |

## Concrete defects found and fixed (source-demonstrated, test-falsified)

| # | Row | Legacy | Was | Now | Falsification |
|---|---|---|---|---|---|
| 1 | M10-49 | `REP_ROWS` exports `whLabel(r.b.w)` (6796) while the table prints the raw name (6803) | export wrote the raw `b.w` | `whLabel(b.w)` in the export only | reverting the one line fails «exports the exact eight columns … aliasing the warehouse» (Xocahəsən → `Xocəsən` expected in the matrix, raw kept on the derived row and in the table) |
| 2 | M10-33 | `IX.byPartner` is keyed `m.p \|\| '(göstərilməyib)'` (1297); the location lookup is by exact name (2911) | matched `(m.partner ?? '') === name`, so a partner-less movement matched nothing | `(m.partner \|\| '(göstərilməyib)') === name` | reverting fails «attributes partner-less movements to «(göstərilməyib)» only and matches names exactly» (null and '' partners → 2 movements / turnover 3 on that name; `P` ≠ `p` ≠ `P `) |
| 3 | M10-21 / M10-31 / M10-47 | `tbl()` renders «Məlumat yoxdur …» for an empty row set (1411); numeric headers carry class `r` (1412); `cut(rows,'dead')` shows the first `SHOW_MAX` rows with no show-all note (6802, 1680) | empty `<tbody>`, no `r` class, no cut | the legacy empty block on all three tables, `th.r` on numeric columns, `applyCut(deadRows, false)` for the table while the export keeps the full set | page tests «prints the legacy empty block …» (×2) and «cuts the table at SHOW_MAX rows but exports all of them» (SHOW_MAX mocked to 3; the real 3000 pinned by the new `showAllCut.test.ts`) |

Also aligned, not a parity defect: the error surface now follows the Phase 9
pattern — a first-ever failure shows «Yükləmə xətası» and no tables; a failed
refresh keeps the tables and shows the «Yenilənmədi» tag (`anb-load-error` /
`anb-refresh-error`); the previous `error-banner` class had no stylesheet
rule. `data-testid`/`data-kpi` hooks were added for tests and the harness.

Mutation check: with the two lib fixes reverted, exactly the two new tests
fail (13 pass); restored and re-verified.

## Audit findings that required NO change (recorded so they are not re-derived)

- `warehouseSummaries` / `locationSummaries` / `deadStockRows` take the
  OPERATIONAL rows the store derives through `buildItemIndexes()` →
  `excludeCancelled()`; `itemIndex.ts` is untouched (M10-14, M10-15).
- Reference date: `IX.dates` is built from `byDate` keys of the operational
  set, sorted ascending, last element (1320); the port sorts the operational
  dates and takes the last, `today()` only when none — equivalent, incl. the
  empty-string edge (`filter(Boolean)` vs `'' || today()`).
- Physical table `last` prints the raw ISO date (`esc(last || '—')`, 2907),
  NOT `fmtD` — kept raw; the dead table uses `fmtD` (6803) — kept.
- Rail: legacy Bazalar order is Nomenklatura, [nreq hidden], Mal qrupları,
  [Kontragentlər unmigrated], Anbar və layihələr, Soraqçalar; the React rail
  places it after Mal qrupları and before Soraqçalar. The `c-anb` counter
  badge (1526) is not ported, consistent with the other migrated Bazalar
  entries (no counter on Nomenklatura either) and outside M10-01's wording.
- `today()` is the shared `lib/format.ts` helper (UTC ISO date, as legacy 600).
- `go('refs')` refuses non-admins (1496); here the button is disabled for
  non-admins, so `onManage` cannot fire (page test proves the click is inert).

## Tests added (falsifiable; mutation noted where load-bearing)

| File | Added | Covers |
|---|---|---|
| `lib/warehouseOverview.test.ts` | +10 (15 total) | epsilon equality (M10-22), value sum incl. negative/zero (M10-23), own-warehouse count/max date (M10-24/25), partner-key fallback + exact match (M10-33), quantity-only turnover (M10-34), 29/30 boundary with used rows (M10-44), transfer-only / foreign-warehouse / zero / inbound = never used + desc sort (M10-43/45), ordinary outbound = used and excluded under 30 days, newest-date reference vs today fallback (M10-41), whole days (M10-42), zero/eps/negative source (M10-40), three KPIs (M10-46), eight-column export with alias (M10-49) |
| `api/warehouseOverviewSnapshot.api.test.ts` | +4 (6) | exactly three readers once each, raw rows through (M10-10); items/movements failure → whole generation fails, fallback messages, rejected reads absorbed (M10-11) |
| `store/warehouseOverview.store.test.ts` | new, 7 | atomic apply; `excludeCancelled` through the shared indexes (M10-14/15, unbalanced fixture); success clears error; first failure = error + not loaded; failed refresh retains rows/items/locations/indexes by identity and `loaded` (M10-12); stale success and stale failure discarded (ordering) |
| `pages/WarehouseOverviewPage.test.tsx` | rewritten, 19 | exact heading/subtitle (M10-02); `load` on mount + realtime with exactly `movements, items, warehouses` and no debounce override, callback re-loads (M10-13); admin «Yeni ünvan» → `onManage`; anbardar/rehber see the page, button disabled and inert (M10-03/04); physical table = active `anbar` only, alias, «—», exact headers (M10-20/21/25/26); every location incl. inactive/anbar, badge classes, headers (M10-30/31/32); empty blocks; loading / first-error / failed-refresh states (M10-11/12); dead tab swaps views, no Reports module (M10-50, D-K1); three KPIs with classes, rows, raw warehouse, status tags, `clk` (M10-46/47); Excel → matrix + `hereketsiz_qaliq` (M10-49); cut vs full export; row click opens the REAL `ItemCard` whose buttons reach both page callbacks (M10-48) |
| `lib/showAllCut.test.ts` | new, 3 | `SHOW_MAX = 3000`, cut at 3001 / not at 3000, `showAll` |
| `App.test.tsx` | +8 | position after Mal qrupları / before Soraqçalar (admin), last Bazalar entry (non-admin), exactly one entry, present + opens for admin/rehber/anbardar, only that entry active, «Yeni ünvan» → refs page + active entry moves, both card handoffs on the REAL operation/nomenclature stores (M10-01/03/04/48) |
| `App.nav.test.ts` | +5 | the cheap source-level wiring check, as for `grp`/`bal` |

## Offline gate (measured after the last code edit)

| Check | Result |
|---|---|
| focused Phase 10 + App (7 files) | 6 files / 119 tests at the code gate, then page + showAllCut 22 after the cut-test change |
| full suite | **144 files / 3153 tests passed** (was 143 / 3150 + the new showAllCut file; the earlier single failure was the 3001-row render test timing out under parallel load — replaced by the mocked-cap test) |
| `tsc -b --noEmit` | exit 0 |
| `oxlint src` | exit 0 |
| `vite build --mode sandbox` | built, exit 0 (pre-existing >500 kB chunk advisory) |
| `git diff --check` | exit 0 |
| staged files | **0** |

## Live read-only sweep — browser interception (anbardar)

Identity: `anbar-anbardar-test@example.com` (TEST-only password taken from
the 2026-09-10 T0A audit, passed as a process-only variable; `.env` never
read). Dev server `--mode sandbox --host 127.0.0.1 --port 5175`, started for
the sweep and stopped afterwards. Guards: every URL containing the production
ref aborted (**0 hits**); every non-GET `/rest/v1/` table request and every
`/rpc/` call outside the session/read allowlist aborted and counted
(**0 blocked**); no fixture, no write, no cutover. The account's one-device
limit blocked two earlier attempts whose sessions had not been released; the
accepted run signed out through the real session dialog and the login form
returned. Harness `p10-ui.mjs` and logs live in the session scratchpad.

| Contract | Observed |
|---|---|
| M10-01 | rail `Yeni əməliyyat, Mal hərəkəti, Anbar qalıqları, Nomenklatura, Mal qrupları, Anbar və layihələr, Audit jurnalı` — one entry; after the click `a.on` = `['Anbar və layihələr']` |
| M10-02 | heading «Anbar və layihələr»; subtitle exactly «Fiziki anbarlar qalıq saxlayır; layihə/təhvil məntəqələri isə məxaric ünvanı kimi çıxış edir.» |
| M10-04 (anbardar half) | «Yeni ünvan» rendered, `disabled = true`; hidden in the dead view |
| M10-10 | the page's requests: `GET movements, items, warehouses` ×2 (StrictMode) — nothing else; **no `stock_conditions`, no `stock_layers`, no RPC** |
| M10-21 / M10-31 | headers `Anbar · Mövqe · Qalıq dəyəri · Hərəkət · Son əməliyyat` and `Ünvan / layihə · Tipi · Əməliyyat · Dövriyyə` |
| M10-25 | `Test Anbar … 2026-09-03`; `CODEX Phase8 Transfer Anbar … —` (both branches) |
| M10-32 | badges `t-op, t-mut, t-op` for `anbar, layihə, anbar` |
| M10-51 (anbardar half, D-K3) | the warehouse LIST is unscoped (both TEST anbars listed); the DATA is RLS-shaped: `Test Anbar 1 · 80.00 ₼ · 3 · 2026-09-03`, the foreign anbar `0 · — · 0 · —`; 3 location rows, all with 0 — consistent with the Phase 9 anbardar reads (107 raw movements, one condition, all Test Anbar) and the known 3 operational rows |
| D-K1 | the «Hərəkətsiz və ölü qalıq» tab renders the three KPIs (`kpi o`, `kpi r`, `kpi`) — values 0 / — / 0 — and the empty block «Məlumat yoxdur»: TEST's only position (`0000001`, balance 8) has an ordinary outbound and its last movement IS the newest date, so no row qualifies; the export button is present (not clicked) |
| **M10-12** | window A — every `GET /rest/v1/movements` answered 503 (CORS-complete): **8 failures observed**, «Yenilənmədi injected 503 …» first seen **7.2 s** after the remount, `anb-load-error` absent, both tables retained with identical rows; recovery remount: flag gone, rows identical. Window B — the same requests ABORTED at the network layer (`net::ERR_FAILED`): **8 aborted**, «Yenilənmədi TypeError: Failed to fetch» at **7.2 s**, tables retained |
| M10-52 | 0 write attempts, 0 production hits, 55 TEST requests all reads/session RPCs, signed out |

Not claimed from the sweep: M10-20/M10-30's inactive-row branches (TEST has
no inactive warehouse row), M10-46/47/48/49's populated dead view (TEST has
no dead position), the admin/rehber legs, realtime events (none occurred).
An earlier attempt whose injected 503 lacked CORS headers showed the tables
retained but no flag within a single 6 s sample; it was superseded by the
polled runs above and is recorded here, not relied on.

## Tally

Derived mechanically from the ledger's `| M10-* |` rows:

```
awk -F'|' '/^\| M10-/{s=$5; sub(/^ *`/,"",s); sub(/`.*/,"",s); c[s]++; n++} END{for(k in c) print k, c[k]; print "total", n}' docs/superpowers/specs/2026-09-10-phase10-registry-rows.md
```

Result: `CODE VERIFIED 26 · LIVE VERIFIED 9 · IN PROGRESS 1 · total 36`.

## Safety

TEST `alkjjbaawmsirsfvqljm` only; production never contacted (guard counter
0). No Supabase mutation, RPC write, fixture, layer deactivation, cutover,
stage, commit, push or deploy. No `.env` file read or edited. Dirty tree
preserved, 0 staged. `Çap` outside acceptance. Phase 10 remains
`NOT ACCEPTED`; only Codex's independent audit can change that.
