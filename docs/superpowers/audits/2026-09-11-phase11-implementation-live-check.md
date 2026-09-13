# Phase 11 — implementation, gate and live read-only sweep

Date: 2026-09-11 (Asia/Baku)  
Scope: Module L («İdarə paneli», legacy `rDash()`) implemented against the
accepted 55-row ledger and legacy `index.html:250-251, 277-292, 592-602,
844-1017, 1162-1181, 1246-1320, 1361-1418, 1534-1589, 1851-1858, 6996-7031,
7523`; one offline gate; one read-only TEST browser sweep.  
Verdict: **implementation complete on Claude's side; 26 rows `LIVE VERIFIED`,
28 `CODE VERIFIED`, 1 `IN PROGRESS` (M11-91, the admin comparison leg).
Phase 11 remains `NOT ACCEPTED`** pending Codex's final independent audit.
The tally is stated once, in the ledger, and was derived mechanically
(command in § Tally).

## Authorisation

Owner accepted the complete recommended package D-L1…D-L5
([decision](../decisions/2026-09-11-phase11-design-scope.md)) after the
independent [design audit](./2026-09-11-phase11-design-codex-audit.md)
passed. Codex's M11-24 correction (a negative movement price is truthy and is
NOT replaced by the item price) was carried into the implementation and is
pinned by its own test.

## Evidence classes (kept distinct)

| Class | Source |
|---|---|
| **Unit / source** | vitest over the pure libs, the snapshot API (readers mocked), the store (API mocked), the chart components, the page (store/hook/toast/directory mocked, REAL `ItemCard`), the App rail (pages stubbed), and the stylesheet read as text |
| **Browser interception** | Playwright + installed Chrome driving the sandbox dev server on 127.0.0.1:5175 (`VITE_ALLOW_LOCAL_WRITES=false`; the served `supabase.ts` was fetched and verified to carry the TEST ref and no production ref); every `/rest/v1/` request recorded; 503 and network-abort injection over windows |
| **Persisted TEST** | none — no write was attempted; the TEST rows read are those RLS returns to the anbardar |
| **Unavailable external** | a TEST admin identity (M11-91 admin leg); a rehber identity |

## What was built

| Layer | File | Role |
|---|---|---|
| Pure | `lib/dashboard.ts` | scope, five KPIs, bar data, donut data, top-10, recent, subtitle |
| Pure | `lib/dashboardCharts.ts` | `barMax`/`barWidth` and the donut path geometry |
| Pure | `lib/controlIssues.ts` | the ten legacy rules, whole group shape, for Phase 15 to reuse |
| Read | `api/dashboardSnapshot.api.ts` | one atomic four-read generation |
| State | `store/dashboard.store.ts` | snapshot, shared indexes, warehouse selection, retention, ticket ordering |
| UI | `components/dashboard/BarChart.tsx`, `Donut.tsx` | the two legacy chart renderings |
| UI | `pages/DashboardPage.tsx` | the `p-dash` shell |
| Shell | `App.tsx` | the `dash` route, rail entry and D-L1 default landing |
| Style | `index.css` | the D-L5 verbatim CSS port |

No accepted Phase 9/10 file was modified. `lib/itemIndex.ts`,
`lib/operationalMovements.ts`, `lib/format.ts`, `lib/movementRoute.ts`,
`lib/recorderLabel.ts`, `hooks/useRealtimeRefresh.ts`, the
`warehouseOverview.*` set, the `balances.*` set and `ItemCard.tsx` all show
no diff (`git status`). The only edits to existing files are `App.tsx` (route
+ rail + default), `index.css` (the D-L5 additions) and the two App test
files whose expectations D-L1 deliberately changes.

## Decisions that shaped the code, and the legacy facts behind them

- **Selector asymmetry preserved.** KPIs, donut, both tables and the
  subtitle's movement COUNT follow `#dash-wh`; the bar chart (1558, `IX.bal`),
  the subtitle's `last` date (1548, `IX.dates`) and the alerts card (1585) do
  not. Both halves were exercised live in the same run.
- **Two valuation rules on one page.** KPI 4 uses the movement price with an
  item-price fallback (1546); KPI 1, the bar chart, top-10 and the `wo` rule
  use the item price only (1313, 7025). Separate rows, separate tests.
- **`||` not `??` on both name fallbacks**, matching the legacy truthiness
  (1581), including the negative-price case Codex corrected.
- **A new four-read snapshot**, not a widening of Phase 10's `LIVE VERIFIED`
  three-read snapshot (M10-10). `partners` is read only for the VÖEN rule.
- **Accepted deviations, worded as such:** atomic snapshot, first-load error
  block, failed-refresh retention and stale-response ordering replace legacy's
  per-table toast plus partial render (855). Phase 8-10 precedent.

## Two harness/implementation facts worth not re-deriving

**The CSSOM normalises the bar width.** `style.width` reads back `100%` where
the legacy string is `100.0%`, in jsdom and in Chrome alike. Asserting
`100.0%` on the DOM fails for the wrong reason. The legacy `toFixed(1)`
string is therefore pinned on the pure `barWidth()` helper and the DOM
assertion uses the normalised value. Moving those helpers into
`lib/dashboardCharts.ts` also cleared the three fast-refresh lint warnings
that exporting them from the component files produced.

**`:root` is not isolable by a whole-selector matcher** in this stylesheet:
it follows the `@tailwind` directives with no intervening `}`, so the
existing `rule()` helper returns empty for it. The token check matches
`:root{…}` directly instead.

## Tests added

| File | Tests | Covers |
|---|---:|---|
| `lib/dashboard.test.ts` | 20 | scope identity + epsilon matrix (M11-20), five KPIs incl. the `0%` vs `0.0%` literal, 66.7% rounding, `money(0)`, the purchase fallback chain and the negative-price control (M11-21…25), selector-independent bars with a positive control (M11-30), donut colours + fallback (M11-33), top-10 cap (M11-40), `created_at`-then-date ordering with an invalid timestamp (M11-42), subtitle global-date vs scoped-count (M11-04) |
| `lib/controlIssues.test.ts` | 22 | group order and omission (M11-51) plus one positive, one negative and the equality boundary for each of the ten rules (M11-52…61), including the FIRST-prefix warehouse choice and the `1e-6` pair boundary |
| `api/dashboardSnapshot.api.test.ts` | 4 | four readers once each with raw rows (M11-10); every reader's error and rejection shape (M11-11) |
| `store/dashboard.store.test.ts` | 12 | atomic apply, `excludeCancelled` through the shared indexes (M11-16/17), first-failure vs failed-refresh retention by identity (M11-12), stale success and stale failure (M11-15), selection persistence and the D-L4 reset rule (M11-06/07) |
| `components/dashboard/charts.test.tsx` | 7 | bar rendering and the `barWidth`/`barMax` contract (M11-31), donut paths against the legacy formula recomputed in the test with a wrong-start-angle negative control, titles, legend, empty states (M11-34/35) |
| `pages/DashboardPage.test.tsx` | 20 | heading/subtitle, selector, realtime table set and toast-on-success-only, five KPIs with classes, chart asymmetry, both tables incl. all four recorder branches and the both-signs row, «Hamısı», the REAL `ItemCard` handoffs, alerts pills and hint, all four load states, anbardar rendering |
| `index.css.dashboard.test.ts` | 17 | all sixteen D-L5 declaration blocks verbatim plus the `:root` tokens they reference (M11-72) |
| `App.nav.test.ts` / `App.test.tsx` | wiring + rail | import, union, first-entry position, `page ?? 'dash'` with no `isAdmin` branch, the mount block, and the runtime rail/default/handoffs for every role (M11-01…03) |

## Gate (offline)

| Check | Result |
|---|---|
| Full suite | **151 files / 3270 tests passed** |
| `tsc -b --noEmit` | clean (exit 0) |
| `oxlint src` | clean (exit 0) |
| `vite build --mode sandbox` | built (exit 0); the large-chunk advisory is the pre-existing Phase 8 one |
| `git diff --check` | no whitespace errors |
| Staged | 0 |

`web/dist` is git-ignored, so no tracked artefact was left.

## Live read-only TEST sweep

Identity: `anbar-anbardar-test@example.com`. The TEST-only password was read
at runtime from the existing 2026-09-10 T0A audit text into process memory
only; it was never printed, logged into the harness output, or written to any
file. Production `bbjmhaerssakbreykxiw` was aborted by a blanket route guard;
every non-GET `/rest/v1/` request outside the session/RPC allowlist was
aborted and counted.

**Safety result: 0 production hits, 0 write attempts.** The only non-GET
traffic was `rpc/register_session`, `rpc/get_user_directory`,
`rpc/stock_layers_supported`, `rpc/list_my_sessions`, `rpc/end_session` and
`HEAD audit_log` — all session/shell, none from the dashboard. Sign-out ran
through the real dialog.

| Leg | Observed |
|---|---|
| Landing (M11-01/02/03) | Sign-in landed on the dashboard; rail order `Əməliyyat → İdarə paneli → Yeni əməliyyat → Mal hərəkəti → Anbar qalıqları`, with `a.on` = «İdarə paneli» only |
| Request set (M11-10) | `GET movements, items, warehouses, partners`, each twice under StrictMode, and nothing else — no `stock_conditions`, no `stock_layers`, no snapshot RPC |
| Subtitle (M11-04) | «Bütün anbarlar · son əməliyyat tarixi 2026-09-03 · 3 hərəkət qeydi» |
| KPIs (M11-21…26) | `80.00 ₼` / «1 aktiv mövqe» (`kpi g`), `11.00` (`kpi`), `3.00` / «27.3% dövriyyə» (`kpi o`), `—` (`kpi v`), `0` / «hamısı qiymətlidir» (`kpi g`) |
| Reconciliation (M11-17) | The dashboard's `80.00 ₼` / 1 position equals the Phase 9 balances page's «Ümumi dəyər» `80.00 ₼` / «Mövqe sayı» `1` on the same data, read in the same session |
| Bar chart (M11-30/31/32) | Both active anbars, value-descending, `100%` and `0%` widths over a `.bar` computed height of `6px`, the exact legacy hint below |
| Donut (M11-33/34/35) | `Alış: 2` (palette fallback `#71838F`) and `Silinmə: 1` (`#A9231C`); empty SVG and legend on the movement-less anbar |
| Selector (M11-05/06) | Options `['', 'Test Anbar', 'CODEX Phase8 Transfer Anbar']` with raw values; selecting one re-derived everything with ZERO new requests; the choice survived navigating to «Mal hərəkəti» and back |
| Asymmetry (M11-30 vs M11-33) | With the foreign anbar selected the donut emptied and the tables showed the legacy empty block, while the bar chart stayed unchanged |
| Tables (M11-41/42/43) | Exact headers with `th.r` on numeric columns; `clk` rows; `03.09 → 02.09 → 01.09` ordering; recorder `anbar-admin-test@example.com`; `+1.00` in `var(--in)` and `−3.00` in `var(--out)` |
| Navigation (M11-44/45) | «Hamısı» opened «Mal hərəkəti» and moved the active entry; a top-10 row and a recent row each opened «Mal kartoçkası · 0000001», and closing returned to the dashboard |
| Alerts (M11-50) | No rule fired on TEST, so the exact hint «Avtomatik yoxlamalar problem aşkarlamadı.» rendered |
| Retention (M11-12) | 8 injected 503s → «Yenilənmədi injected 503» with 5 KPIs / 1 top row / 3 recent rows retained and no load-error block, then clean recovery; a second window of network aborts → «Yenilənmədi TypeError: Failed to fetch», same retention, same recovery |
| RLS shape (M11-18) | The warehouse list was unscoped (both anbars) while the data was RLS-shaped: the foreign anbar rendered `—` / `0 mövqe` / empty tables |

Harness validity (protocol §8): StrictMode duplicates were counted as one
generation; the failure windows were armed only AFTER the away page settled
and every failed request was recorded, so the retention passes rest on
observed failures rather than assumed ones; recovery was sampled by polling
for the flag to clear rather than by a fixed wait; no application helper was
imported by the harness.

## Rows deliberately NOT promoted to `LIVE VERIFIED`

- **M11-24** — the TEST purchases carry type «Alış», not «Satınalma», so the
  live KPI summed to `—`. The fallback chain and the negative-price case are
  unit-evidenced only.
- **M11-51…M11-61, M11-62** — TEST is clean, so no control rule fired and no
  pill rendered. Only the empty branch is live.
- **M11-40, M11-73, M11-74** — TEST has one position with a real name and no
  orphan, so the 10-row cap, the empty-name fallback and the orphan label are
  unit-evidenced only.
- **M11-07, M11-13, M11-14, M11-15** — no warehouse deactivation, no realtime
  event from a second writer, and no stale-reply race occurred live.
- **M11-71** — block order was observed live, but exact pixel geometry is a
  Phase 18 visual-review matter.

## Tally

Measured mechanically from the 55 `| M11-* |` rows, not from prose:

```
grep -E '^\| *M11-' docs/superpowers/specs/2026-09-11-phase11-registry-rows.md \
  | awk -F'|' '{id=$2; gsub(/[ `*]/,"",id); st=$(NF-1); gsub(/^[ `*_]+/,"",st);
      s="unclassified";
      if(st ~ /^CODE VERIFIED/)s="CODE VERIFIED"; else if(st ~ /^LIVE VERIFIED/)s="LIVE VERIFIED";
      else if(st ~ /^NOT STARTED/)s="NOT STARTED"; else if(st ~ /^IN PROGRESS/)s="IN PROGRESS";
      else if(st ~ /^BLOCKED/)s="BLOCKED";
      c[s]++; tot++; if(seen[id]++)dup++; else uniq++}
    END{print tot, uniq, dup+0; for(k in c) print k, c[k]}'
```

**55 total, 55 unique, 0 duplicates: 28 `CODE VERIFIED`, 26 `LIVE VERIFIED`,
1 `IN PROGRESS`, 0 `NOT STARTED`, 0 `BLOCKED`, 0 unclassified.** The status
counts sum to 55.

A parsing defect was found and fixed during validation: M11-73's evidence
text originally contained a literal `||`, and `tools/ledger-check.mjs` splits
a row on raw `|` and classifies by the LAST cell, so that row parsed as
unclassified. Escaping does not help because the split is literal. The text
now says «legacy `or` semantics» and every row has exactly four cells.

## Safety and residuals

- TEST `alkjjbaawmsirsfvqljm` only; production never contacted (0 hits under
  a hard abort guard).
- No Supabase mutation, no fixture, no layer change, no cutover, no write
  window; the dev server ran with `VITE_ALLOW_LOCAL_WRITES=false`.
- Nothing staged, committed, pushed or deployed; the pre-existing dirty tree
  is preserved.
- No password or token was printed or written to any file.
- **External boundary:** no TEST admin (or rehber) identity is available, so
  M11-91's admin comparison leg stays open and unpromoted. Supply one only as
  a process-only variable if that leg is to be run.

Phase 11 remains **NOT ACCEPTED**; Codex's independent audit is required.
