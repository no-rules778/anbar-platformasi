# Phase 10 parity ledger — Module K

> **PHASE 10 ACCEPTED — 2026-09-11 (authoritative).** Independent Codex
> review found no further application defect. Final gate: focused Phase 10 +
> App 7 files / 122 tests, full suite 144 files / 3153 tests, typecheck,
> oxlint, sandbox build and `git diff --check` clean; staging empty. The
> 36-row tally remains 26 `CODE VERIFIED`, 9 `LIVE VERIFIED`, 1 `IN PROGRESS`
> (M10-51 admin comparison evidence boundary), 0 `NOT STARTED`, 0 `BLOCKED`.
> The retained M10-51 limitation does not block the approved read-only D-K3
> scope and is not promoted. [Final audit](../audits/2026-09-11-phase10-final-codex-acceptance.md).

> **IMPLEMENTATION AUDITED + LIVE SWEEP — 2026-09-11 (latest).** The
> pre-existing Module K code was audited line by line against legacy
> `index.html` and preserved; three concrete defects were fixed (export
> warehouse alias M10-49, partner-key fallback M10-33, legacy empty block /
> `th.r` / dead-table cut), 56 tests added, one offline gate (144 files /
> 3153 tests, tsc, oxlint, sandbox build, `git diff --check` all clean) and
> one read-only TEST browser sweep as the anbardar (0 production hits, 0 write
> attempts, both failure shapes of the retention leg observed). **Tally,
> measured mechanically from the 36 `| M10-* |` rows: 26 `CODE VERIFIED`, 9
> `LIVE VERIFIED` (M10-01, M10-02, M10-10, M10-12, M10-21, M10-25, M10-31,
> M10-32, M10-52), 1 `IN PROGRESS` (M10-51 — admin leg needs an unavailable
> TEST admin identity), 0 `NOT STARTED`, 0 `BLOCKED`.** Phase 10 remains
> **NOT ACCEPTED** pending Codex's final independent audit.
> [Evidence](../audits/2026-09-11-phase10-implementation-live-check.md).

Status history: **DESIGN ACCEPTED — 36 rows, all `NOT STARTED`** (2026-09-10,
HISTORY). D-K1…D-K3 are
[owner-approved](../decisions/2026-09-10-phase10-design-scope.md) and the
[independent design audit](../audits/2026-09-10-phase10-design-codex-acceptance.md)
passed.

Evidence classes: *unit/source* = vitest; *live* = browser interception on
the sandbox dev server against TEST with the anbardar identity; nothing in
this phase is persisted-write evidence.

| Row | Contract | Legacy ref | Status |
|---|---|---|---|
| M10-01 | Rail contains one «Anbar və layihələr» entry and opens the page | 260, 1517 | `LIVE VERIFIED` — live: exactly one rail entry, click opens the page, `a.on` = that entry only; App tests: position after Mal qrupları / before Soraqçalar, present for admin/rehber/anbardar, one active entry ([audit](../audits/2026-09-11-phase10-implementation-live-check.md)) |
| M10-02 | Heading/subtitle exactly describe physical warehouses versus project/delivery destinations | 371 | `LIVE VERIFIED` — live heading «Anbar və layihələr» and the exact legacy subtitle text; page test |
| M10-03 | Page is visible to all authenticated roles; no client role gate | 371, 1517 | `CODE VERIFIED` — App tests: the entry renders and opens for admin, rehber and anbardar; page tests: anbardar and rehber see the tables. Live: anbardar only (admin/rehber identities unavailable) |
| M10-04 | «Yeni ünvan» navigates to `refs`; enabled only for admin | 373, 2915-2916 | `CODE VERIFIED` — page tests: admin enabled → `onManage`; anbardar/rehber disabled and a click is inert; App test: `onManage` opens the Soraqçalar page and moves the active entry. Live: anbardar `disabled = true` (admin live leg unavailable) |
| M10-05 | Phase 10 introduces no warehouse/location mutation API | 2915-2916 | `CODE VERIFIED` — source: no write module exists under Module K; api test proves exactly three reads; live: the page issued only GETs, 0 write attempts under a blanket mutation intercept |
| M10-10 | Snapshot reads movements, items and warehouse/location rows needed by both views | 930-946 | `LIVE VERIFIED` — live: `GET movements, items, warehouses` ×2 (StrictMode) and nothing else, no `stock_conditions`/`stock_layers`/RPC; api test: three readers once each, raw rows through |
| M10-11 | Snapshot failures are explicit and do not mix partial generations | Phase 8/9 atomic precedent | `CODE VERIFIED` — api tests: any reader error/rejection → `ok:false` with no snapshot; store test: a first failure leaves nothing applied |
| M10-12 | Failed refresh retains the previous complete snapshot | Phase 8/9 precedent | `LIVE VERIFIED` — live: 8 injected 503s → «Yenilənmədi» flag, tables retained row-for-row, recovery clears the flag; a second window with network aborts → same retention with «TypeError: Failed to fetch»; store test: rows/items/locations/indexes retained by identity, `loaded` untouched; page test |
| M10-13 | Realtime watches only the snapshot tables and debounces refresh | 1174 + Phase 9 improvement | `CODE VERIFIED` — page test: `useRealtimeRefresh(true, ['movements','items','warehouses'], fn)` with no debounce override (hook default 400 ms, pinned by the hook's own M9-131 tests); the callback re-loads the store. No realtime event occurred live |
| M10-14 | Operational movement filtering reuses the accepted cancellation/reversal rules | 1247-1270 | `CODE VERIFIED` — store test: an unbalanced cancelled pair leaves only the operational row (`operational = ['c']`, `q = 3`) through the shared `buildItemIndexes()` → `excludeCancelled()` |
| M10-15 | Balance and movement indexes reuse Phase 9 outputs without changing their inputs | 1271-1319 | `CODE VERIFIED` — the store calls `buildItemIndexes(items, movements)` unchanged; `lib/itemIndex.ts` and `lib/operationalMovements.ts` are not modified (git status) |
| M10-20 | Physical table contains active `anbar` names only | 943, 2902-2908 | `CODE VERIFIED` — page test: an inactive `anbar` and a `layihə` are excluded, order preserved. Live: both active TEST anbars listed, the layihə absent (TEST has no inactive row to exercise) |
| M10-21 | Physical columns: Anbar · Mövqe · Qalıq dəyəri · Hərəkət · Son əməliyyat | 2902 | `LIVE VERIFIED` — exact headers observed live; page test. Legacy `tbl()` empty block and `th.r` on numeric columns ported (correction 3) |
| M10-22 | Mövqe counts rows with `abs(q) > 1e-9` per warehouse | 2904-2907 | `CODE VERIFIED` — lib test: exactly `1e-9` excluded, `1.1e-9` and `−0.5` counted |
| M10-23 | Qalıq dəyəri sums shared balance values per warehouse | 2904-2907 | `CODE VERIFIED` — lib test: 10 − 4 + 0 = 6, other warehouse untouched; live `80.00 ₼` = balance 8 × price 10 (consistent with Phase 9) |
| M10-24 | Hərəkət is operational movement count from the warehouse index | 2904-2907 | `CODE VERIFIED` — lib test counts only the supplied warehouse's rows; store test proves the supplied rows are the operational set; live `3` equals the known TEST operational row count |
| M10-25 | Son əməliyyat is max operational movement date; no movement renders `—` | 2905-2907 | `LIVE VERIFIED` — live: `2026-09-03` on Test Anbar and `—` on the foreign anbar; lib + page tests (raw ISO date, not `fmtD`, as 2907) |
| M10-26 | Warehouse label uses display-only `whLabel()` | 2906 | `CODE VERIFIED` — page test: `Xocahəsən` renders `Xocəsən` in the physical table while the location table and the key stay raw (TEST has no aliased warehouse) |
| M10-30 | Location table receives every loaded warehouse/location row; inactive-row policy follows D-K2 | 943-944, 2909-2913 | `CODE VERIFIED` — api test keeps inactive rows; page test renders an inactive `layihə` and an inactive `anbar` among four rows. Live: all three TEST rows rendered (all active) |
| M10-31 | Location columns: Ünvan / layihə · Tipi · Əməliyyat · Dövriyyə | 2909 | `LIVE VERIFIED` — exact headers observed live; page test |
| M10-32 | Type badge uses `t-op` for `anbar`, otherwise `t-mut` | 2912 | `LIVE VERIFIED` — live classes `t-op, t-mut, t-op` for `anbar, layihə, anbar`; page test |
| M10-33 | Location statistics use partner-index lookup by exact location name | 2911-2912 | `CODE VERIFIED` — **corrected**: the key is `m.p \|\| '(göstərilməyib)'` (1297); lib test: null/'' partners count only for a location named «(göstərilməyib)», `P` ≠ `p` ≠ `P ` |
| M10-34 | Əməliyyat is count; Dövriyyə is inbound plus outbound quantity, not money | 2911-2912 | `CODE VERIFIED` — lib test: 1.5 + 0.25 = 1.75 with price 1000 ignored; page test `4,00` for in 2 + out 2 |
| M10-40 | Dead-stock source is non-zero shared balance positions | 6789-6795 | `CODE VERIFIED` — lib test: `q = 0` and `1e-9` dropped, `−1` kept |
| M10-41 | Reference date is newest operational date, falling back to today | 6789-6791 | `CODE VERIFIED` — lib test: newest date wins over a later `today`; `today` only with no movements |
| M10-42 | Inactive days use rounded calendar-millisecond difference | 6791-6794 | `CODE VERIFIED` — lib test: 2026-01-01 → 2026-03-01 = 59 whole days |
| M10-43 | Prior use requires same item/warehouse ordinary outbound; transfer outbound does not count | 6793 | `CODE VERIFIED` — lib tests: transfer-only, foreign-warehouse, zero-quantity and inbound rows all «never used»; an ordinary `Sahəyə` outbound of the same item/warehouse marks it used |
| M10-44 | Include rows at 30+ days OR never used; prove 29/30 boundary | 6794 | `CODE VERIFIED` — lib test: two USED rows, 29 days excluded, exactly 30 included; a used row under 30 excluded; never-used rows included at 0 days |
| M10-45 | Dead rows sort by balance value descending | 6794 | `CODE VERIFIED` — lib test order `20, 9, 7, 5`; page test |
| M10-46 | KPIs: inactive position count, frozen value, never-used count | 6797-6799 | `CODE VERIFIED` — lib test `{2, 20, 1}`; page test values and classes `kpi o`, `kpi r`, `kpi`. Live: the three KPIs render with those classes on an empty set (0 / — / 0) |
| M10-47 | Table columns and status labels/classes match legacy | 6800-6803 | `CODE VERIFIED` — page test: eight headers, `istifadəsiz`/`t-rm` and `hərəkətsiz`/`t-mut`, raw warehouse, `fmtD` date, `clk` rows, legacy empty block, `SHOW_MAX` cut. Live: TEST has no dead position, so only the empty block was observed |
| M10-48 | Item click opens the existing item card | 6801 | `CODE VERIFIED` — page test with the REAL `ItemCard`: row click opens «Mal kartoçkası · B», its buttons reach `onOpenOperation('B')` / `onEditItem('B')`, close works; App tests: the handoffs prefill the operation store / open the nomenclature card. Not exercisable live (no dead row) |
| M10-49 | Export matrix has eight exact columns and preserves the full derived set | 6795-6796 | `CODE VERIFIED` — **corrected**: warehouse column through `whLabel()` (6796); lib test: exact header, `toFixed(2)`, raw `last`, days, «bəli»; page tests: `xls(matrix, 'hereketsiz_qaliq')` over the full set while the table is cut. Live: export button present, not clicked |
| M10-50 | Dead-report placement follows owner decision D-K1 without migrating the rest of Reports | roadmap + proposal | `CODE VERIFIED` — page test: the tab swaps this page's views and no Reports module exists (no `rep` route in `App.tsx`); live: the tab rendered on this page |
| M10-51 | Admin/anbardar live comparison proves server scoping without added client narrowing | D-K3 | `IN PROGRESS` — **anbardar half live**: unscoped warehouse LIST (both anbars) with RLS-shaped DATA (only Test Anbar carries positions/movements; the foreign anbar `0 · — · 0 · —`), no client narrowing in the API (test). **Admin half open**: no TEST admin identity available in this session |
| M10-52 | TEST recovery is read-only: no mutation RPC/table write, production contact, fixture or cutover | safety boundary | `LIVE VERIFIED` — the retention/recovery legs ran under a blanket intercept: 0 write attempts, 0 production hits, no fixture, no cutover; signed out through the real dialog |

Rows may be promoted only from exact implementation/live evidence. Phase 10
is **NOT ACCEPTED** until Codex's final independent audit.
