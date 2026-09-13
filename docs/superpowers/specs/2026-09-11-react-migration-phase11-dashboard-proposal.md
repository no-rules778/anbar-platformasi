# Phase 11 draft proposal — «İdarə paneli» (legacy `rDash()`)

Date: 2026-09-11  
Status: **DESIGN DRAFT — NOT STARTED / NOT ACCEPTED; no implementation authorised**  
[Ledger](./2026-09-11-phase11-registry-rows.md) ·
[TEST-only plan](../plans/2026-09-11-react-migration-phase11-dashboard.md) ·
[Design handoff audit](../audits/2026-09-11-phase11-design-handoff.md) ·
[Roadmap](../plans/2026-09-10-post-phase9-migration-roadmap.md)

## 1. Scope and dependency

Phase 11 follows the accepted Phase 9 (balances) and Phase 10 (warehouses /
dead stock) and covers only the legacy page `dash` — the shell at
`index.html:277-292`, the renderer `rDash()` at `1534-1589`, and the helpers
it calls directly: `barChart()` (1368-1381), `donut()` (1382-1395), `tbl()`
(1409-1414), `TYPE_TAG` (1415-1418), `controlIssues()` (6996-7031), the
`[data-card]` / `[data-goto]` click delegation (1361-1364, 1851-1858) and the
formatters (592-602).

It does not include «Nəzarət və risklər» (`rCtrl()`, Phase 15), «Hesabatlar»,
«Parametrlər və ixrac», the rail counters, or any write path. The dashboard
carries no «Çap» button (277-292), so print is not merely outside acceptance —
there is nothing to print here. Two header exports and the alerts drill-down
target are owner decisions (§6).

Everything below was read from the legacy source in this session; line
numbers refer to the repository `index.html` as of 2026-09-11.

## 2. Verified legacy contract

### 2.1 Route, rail, role

- `<a data-p="dash" class="on">İdarə paneli</a>` is the FIRST entry of the
  «Əməliyyat» group, above «Yeni əməliyyat» (250-251). It has no id and no
  `display:none`; `go()` has no `dash` branch (1495-1503). The page is
  reachable by every role. What a role sees is decided by RLS.
- After sign-in the app lands on the dashboard: `renderAll(); go('dash')`
  (7523). `rRefs()` also uses `go('dash')` as its non-admin fallback (3009).
  The React shell currently lands on `refs` (admin) or `log` (others) because
  the dashboard was not migrated (`App.tsx:111`) — decision D-L1.

### 2.2 Data sources

`rDash()` reads only in-memory state built by `loadFromDB()` and `index()`:

| Legacy symbol | Built from | React equivalent (accepted) |
|---|---|---|
| `normalMovements()` / `IX.movs` | `movements` minus cancelled pairs (1249-1270) | `buildItemIndexes().operational` via `excludeCancelled()` (M9-20, M10-14) |
| `IX.bal` | per warehouse × item; `q = +(in-out).toFixed(4)`, `price` from the ITEM, `val = q × price` (1271-1319) | `buildItemIndexes().bal` (unchanged, M10-15) |
| `IX.dates` | sorted distinct operational dates (1320) | derive from `operational` (Phase 10 did the same for M10-41) |
| `DB.whs` | `warehouses` rows with `active && type === 'anbar'` (933) | `fetchWarehouses()` + the same filter (M9-15 / Phase 10 page) |
| `DB.locs` | every `warehouses` row (935) | `fetchWarehouses()` |
| `DB.itemBy` | `items` by code (1013) | `fetchItems()` |
| `DB.partners` | `partners` (869, 880-883) — read ONLY by `controlIssues()` for the VÖEN rule (7003) | `fetchPartners()` (exists, throws; normalise as Phase 9 does for warehouses) |
| `m.by` (recorder) | `created_by` → directory email / own name / «Excel idxalı» / «digər istifadəçi» (943, 990) | `recorderLabel()` + the App-warmed directory map (Phase 8) |

No `stock_conditions`, `stock_layers`, valuation table or RPC is read by the
dashboard. The four tables above are exactly the legacy realtime set
(`['movements','items','partners','warehouses']`, 1174).

RLS assumption: unchanged from Phases 8-10 — the client sends no warehouse
narrowing; an anbardar receives the RLS-shaped `movements` set and the
UNscoped warehouse list (M8-42, M9-17/18, D-K3, M10-51).

### 2.3 Warehouse selector and derived scope

- `#dash-wh` offers «Bütün anbarlar» (value `''`) plus every `DB.whs` name,
  displayed through `whLabel()` with the RAW name as value (1537). The options
  are built once — `if (!sel.options.length)` (1536) — and never rebuilt after
  a realtime reload (decision D-L4). `onchange` re-runs `rDash()`.
- With `w` selected: `bal = IX.bal.filter(b.w === w)`, `movs =
  normalMovements().filter(m.w === w)`; otherwise the full sets (1541-1542).
- `pos = bal.filter(|q| > 1e-9)` (1543). Exactly `1e-9` is excluded.
- The DOM select is long-lived, so the selection survives navigation. React
  unmounts pages; the filter must live in the store (the M4-18 / M9-06 rule).

### 2.4 Subtitle

`(w || 'Bütün anbarlar') + ' · son əməliyyat tarixi ' + last + ' · ' +
nf(movs.length) + ' hərəkət qeydi'` (1550), where `last =
IX.dates[IX.dates.length-1] || '—'` (1548) — the newest operational date over
ALL warehouses, raw ISO, even when a warehouse is selected. The selected
warehouse prints RAW (`w`), not through `whLabel()`. Both are legacy facts to
preserve, not to fix.

### 2.5 Five KPIs (1551-1556), all over the selector-scoped sets

| # | Label | Value | Sub | Class |
|---|---|---|---|---|
| 1 | Qalıq dəyəri | `money(Σ bal.val)` (`0` renders `—`) | `nf(pos.length) + ' aktiv mövqe'` | `g` |
| 2 | Ümumi mədaxil | `nf(Σ (m.i or 0), 2)` | `bütün dövr üzrə` | (none) |
| 3 | Ümumi məxaric | `nf(Σ (m.o or 0), 2)` | `(tin ? (tout / tin * 100).toFixed(1) : 0) + '% dövriyyə'` — literal `0% dövriyyə` when `tin` is 0, otherwise JS `toFixed(1)` with a DOT decimal, not az-AZ | `o` |
| 4 | Satınalma məbləği | `money(Σ over m.t === 'Satınalma' of (m.i or 0) × (m.pr or itemPrice or 0))` — MOVEMENT price first; only a falsy value (including `0`/`null`) falls back to item price, while a negative value is truthy and remains in the calculation; this differs from `IX.bal`, which values stock by item price only | `qiyməti bəlli sətirlər üzrə` | `v` |
| 5 | Qiyməti olmayan mövqe | `nf(count of pos with !b.price)` | `noPrice ? 'dəyərləndirmə natamamdır' : 'hamısı qiymətlidir'` | `r` if `noPrice`, else `g` |

Markup per KPI: `.kpi.{cls} > .eyebrow(label) + .v(value) + .s(sub)`.

### 2.6 Two charts

**«Anbarlar üzrə dəyər və mövqe sayı»** (1558-1563) — `barChart()` over
EVERY `DB.whs` warehouse, INDEPENDENT of the selector: `v = Math.round(Σ
IX.bal[w].val)`, `sub = nf(count |q| > 1e-9) + ' mövqe'`, sorted by `v`
descending. Rendering (1368-1381): `max = Math.max(1, ...v)`; each row shows
the label (`title` attribute, ellipsis), `money(v)` in bold, the sub
right-aligned (`min-width:64px`), and `<div class="bar"><i style="width:
{(v/max*100).toFixed(1)}%;background:var(--steel)">`. Below the chart a
`.hint`: «Dəyər = qalıq × son məlum vahid qiyməti. Qiyməti daxil edilməmiş
mallar sıfır dəyərlə iştirak edir.»

**«Əməliyyat növləri»** (1565-1567) — `donut()` over the distinct `m.t`
values of the selector-scoped `movs`, `v = count`, colours `Satınalma
#0E7C6B · Əvvələ qalıq #1F4E6B · Yerdəyişmə #5B4B9E · Silinmə #A9231C ·
Sahəyə #B06A11 · Qaytarma #71838F · İcarə #7A5C29`, any other type (e.g.
`Satış`) `#71838F`; sorted by count descending. Geometry (1382-1395):
`viewBox 0 0 148 148`, `R 62`, `r 38`, centre `74,74`, start `−π/2`,
`tot = Σv || 1`; one `<path>` per type with `<title>{k}: {nf(v)}</title>`;
legend rows: 9 px swatch, name, bold count. With no movements the SVG has no
paths and the legend is empty. A single type yields an arc whose end point
equals its start point — legacy renders it as it renders it; Phase 11 must
not silently "fix" this (listed under §7 optional improvements).

### 2.7 Two tables (`tbl()`, `{clk: 1}`)

**«Dəyərə görə ilk 10 mövqe»** (1570-1574): `pos` sorted by `val` descending,
first 10. Columns `Mal · Anbar · Qalıq(r) · Dəyər(r)`; cells `<div>{name}</div>
<span class="code">{code}</span>`, `whLabel(w)`, `nf(q,2) + ' ' + unit`,
`money(val)`. `name` is the index name, i.e. `(nomenklaturada yoxdur: CODE)`
for an orphan (1311).

**«Son əməliyyatlar»** (1576-1583): `movs` sorted by `(b.ts||0)-(a.ts||0) ||
dsort(b.d, a.d)` — `created_at` DESC first, date DESC second — first 10.
Columns `Tarix · Mal · Növ · Miqdar(r)`; cells `fmtD(d)` + `<div class="hint">
{recorder}</div>`, `<div>{itemName || code}</div><span class="code">{whLabel(w)}
</span>` (`||`, so an empty name falls to the code), `TYPE_TAG(t)`, and
`+nf(i,2)` in `var(--in)` when `i`, `−nf(o,2)` (U+2212) in `var(--out)` when
`o`, both when both. Header button «Hamısı» → `go('mov')` (289, 1363).

Both tables: rows carry `data-card={code}`; a click opens `itemCard(code)`
(1856-1858). Zero rows render the `tbl()` empty block «Məlumat yoxdur —
Filtrləri dəyişin və ya yeni qeyd əlavə edin.» (1411).

### 2.8 «Diqqət tələb edən məsələlər» (1585-1588)

`groups = controlIssues()` — GLOBAL, not selector-scoped. Empty → `<span
class="hint">Avtomatik yoxlamalar problem aşkarlamadı.</span>`. Otherwise a
`.pill-row` of `<button class="btn{ dgr if sev === 'high'}" data-goto="ctrl">
{title} — <b class="num">{nf(rows.length)}</b></button>`.

`controlIssues()` (6996-7031) evaluates ten rules in a FIXED order and pushes a
group only when it has rows:

| id | sev | title | rows |
|---|---|---|---|
| neg | high | Mənfi qalıq | `IX.bal` with `q < −1e-9` |
| nop | med | Qiyməti olmayan qalıq | `IX.positions` with `!price` |
| doc | low | Sənədsiz satınalma | operational `Satınalma` with `!iv && !ct` |
| voen | low | VÖEN-siz kontragentdən alış | operational `Satınalma` with `p` set, `p` not in `internal`, and no partner with `name === p && voen`; `internal` = all `DB.locs` names ∪ `DB.whs` ∪ {Bazar, Nağd alış, Kommersiya şirkəti, Sahə üzrə məsul şəxs, Əvvələ anbar qalığı, Anbar qalığı} |
| orph | high | Nomenklaturada olmayan mal | operational rows whose code is not in `DB.itemBy` |
| tr | high | Cütü olmayan yerdəyişmə | `Yerdəyişmə` rows with no pair; `pair(m)`: `other = DB.whs.find(w => (m.p or '').indexOf(w) === 0)` (first configured warehouse that is a PREFIX of the partner text, in `DB.whs` order); candidates = other `Yerdəyişmə` rows, same code, `w === other`, opposite direction, abs((x.i or x.o) − (m.i or m.o)) < 1e-6; prefer the same date, else the first |
| lag | med | Yerdəyişmənin tarixləri uyğun gəlmir | transfer rows with `o > 0` whose pair exists and abs(Δdays) > 3 (`dd` = 0 when either date is missing) |
| dup | med | Nomenklaturada təkrar | item groups sharing `name.toLowerCase().replace(/[\s/.,"'-]+/g,'')`, size > 1 — the COUNT IS GROUPS, not items |
| fut | med | Gələcək tarixli qeyd | operational rows with `d > today()` (UTC ISO date) |
| wo | high | İri məbləğli silinmə | `Silinmə` rows with `(o or 0) × itemPrice > 500` — ITEM price, exactly 500 excluded |

Only `id`, `sev`, `title` and `rows.length` reach the dashboard; the `why`,
`cols`, `rows` and `codes` fields are `rCtrl()` (Phase 15) concerns and are
NOT rendered here.

### 2.9 Loading, errors, refresh, realtime

Legacy has no per-page loading or error state: `loadFromDB()` toasts
«Yükləmə xətası: {table}» per failed read (855), sets `LOAD_ERR`, and the
page renders whatever partial arrays exist. Realtime (`subscribeRealtime()`,
1163-1181) debounces 400 ms, reloads everything, re-renders and toasts
«Məlumatlar yeniləndi (digər istifadəçi)» (1169).

Phases 8-10 replaced the partial-render behaviour with the accepted atomic
snapshot model: first load shows a loading block, a first-load failure shows
an error block, a failed REFRESH keeps the previous complete snapshot and
flags «Yenilənmədi», and a stale response never overwrites a newer one
(M10-11/12/15 precedent). Phase 11 inherits that model; it is an accepted
deviation, not parity, and the ledger words it that way. The realtime toast
IS legacy behaviour; Phase 10 did not port it (M10-13 wording), the migrated
«Soraqçalar» page did (`ReferenceDirectoryPage.tsx:62`). Phase 11 ports it
(M11-14) so Codex can judge the Phase 10 omission separately.

### 2.10 Header exports

`⬇ Tam ixrac` (`fullExport`, 7597-7673: eight sheets — Hərəkət registri,
Anbar qalıqları, Satınalmalar, Nomenklatura, Kontragentlər, `_items`,
`_movements`, `_partners`) and `⬇ Excel (SON formatı)` (`sonExport`,
7900-7928: JSZip rewrite of `export-template.xlsx`). Both are whole-platform
backup/export functions that read `price_source` and partner contract fields
the dashboard otherwise never touches, and the roadmap already assigns «Excel
import/export and SON export» to Phase 16. Decision D-L2.

### 2.11 Limits, sorting, dates

- Limits: 10 rows in each table; no `cut()` / «Hamısını göstər» on this page.
- Sorts: bar chart by rounded value desc; donut by count desc; top-10 by
  `val` desc; recent by `created_at` desc then date desc.
- Dates: raw ISO in the subtitle; `fmtD` (DD.MM.YYYY) in the recent table;
  `today()` is the UTC ISO date (600) for the `fut` rule.
- Formatting: `nf` / `money` (az-AZ separators, `money(0) = '—'`); the only
  non-locale number is KPI 3's `toFixed(1)` percentage.

## 3. Reuse decision — what is identical, what is not

**Reused unchanged (accepted contracts):** `fetchItemMovements`, `fetchItems`,
`fetchWarehouses`, `fetchPartners`; `buildItemIndexes` / `excludeCancelled`
(`IX.bal`, `IX.byItem`, operational rows, item-price valuation);
`nf`, `money`, `fmtD`, `today`, `typeTagClass`; `whLabel`; `recorderLabel`
with the App-warmed directory; `useRealtimeRefresh` (400 ms default);
`ItemCard` with the Phase 10 handoffs (`prefill` → `op`, `openCard` → `nom`);
the Phase 10 first-load / refresh-error surface pattern and the `tbl()`
empty block.

**Why the Phase 10 store is NOT reused as-is.** Its snapshot is exactly three
reads and that fact is `LIVE VERIFIED` (M10-10). The dashboard's VÖEN rule
needs `partners` (7003), and the page needs a persistent selector. Widening
`warehouseOverviewSnapshot` would change an accepted live contract; adding
dashboard filter state to the Phase 10 store would couple two pages. Phase 11
therefore adds ONE read-only `dashboard` snapshot/store (four reads, same
atomic/retention/ticket semantics, no new index logic) — the same reasoning
the Phase 10 proposal §4 applied. If the owner defers the alerts card (D-L3
alternative), `partners` leaves the snapshot and the three-read set matches
Phase 10 exactly; the ledger row M11-10 names both outcomes.

**No duplicated logic.** `IX.byWh` / `IX.byType` / `IX.dates` are not ported
as indexes; each dashboard figure is a small pure function over `bal` and
`operational`, tested against boundary matrices. `controlIssues()` becomes a
pure `lib/controlIssues.ts` designed so Phase 15 (`rCtrl()`) consumes the same
function with its full `why/cols/rows/codes` payload — Phase 11 renders only
title / severity / count.

**Regression obligations:** `itemIndex.ts`, `operationalMovements.ts`,
`warehouseOverview.*`, `balances.*`, `ItemCard.tsx`, `useRealtimeRefresh.ts`
must show no diff after Phase 11 (git status), and the accepted Phase 9/10
suites must stay green. The new shared stylesheet rules (D-L5) may not alter
any Phase 9/10 test.

## 4. Proposed React architecture (design only)

- `lib/dashboard.ts` — pure: `scopeByWarehouse`, `dashboardKpis`,
  `warehouseValueBars`, `movementTypeCounts`, `topPositions`,
  `recentMovements`, `dashboardSubtitle`.
- `lib/controlIssues.ts` — pure port of 6996-7031 returning the full group
  shape; `lib/controlIssues.test.ts` with one positive, one negative and the
  equality boundary per rule.
- `api/dashboardSnapshot.api.ts` — four reads, atomic result type identical
  in shape to the Phase 10 API.
- `store/dashboard.store.ts` — snapshot, `indexes` via `buildItemIndexes`,
  `warehouse` filter, ticket ordering, retention.
- `components/dashboard/BarChart.tsx`, `Donut.tsx` — JSX renderings of
  1368-1395 with identical class names, inline styles, `title`s and path
  construction.
- `pages/DashboardPage.tsx` — shell 277-292; `App.tsx` gains the `dash` route
  as the FIRST «Əməliyyat» entry and (D-L1) the default landing page.
- `index.css` — verbatim port of the legacy rules the page needs (D-L5).

## 5. Strict parity versus proposed improvements

Strict parity (ledger rows): everything in §2 except where a row names an
accepted-deviation precedent (loading/error/retention/stale) or an owner
decision. Improvements are listed in §7 and are NOT in the ledger unless the
owner opts in.

## 6. Decisions requiring owner authority

1. **D-L1 — default landing page.** Legacy lands on `dash` for every role
   (7523). Recommended: once `dash` exists, make it the default `activePage`
   for admin, rehber and anbardar, replacing the interim `refs`/`log` default
   (`App.tsx:111`). Ungated, as legacy.
2. **D-L2 — header exports.** Recommended: exclude both `Tam ixrac` and
   `Excel (SON formatı)` from Phase 11 and render no export button; record
   them as Phase 16 deliverables (backup/import/export). They are not ledger
   rows; if the owner brings either forward, rows are added and the total
   re-derived before design acceptance.
3. **D-L3 — alerts card and its drill-down.** Recommended: port
   `controlIssues()` now as the shared pure function and render the pill row
   with exact titles, severities and counts; because «Nəzarət və risklər» is
   Phase 15, a pill click is inert and the pill carries a `title` naming the
   unmigrated screen (the M5-55 precedent), and Phase 15 wires `onOpenControl`.
   Alternative: defer the whole card to Phase 15 (then `partners` leaves the
   snapshot).
4. **D-L4 — selector options.** Legacy builds the option list once and never
   rebuilds it after a realtime reload (1536), so a warehouse added or
   deactivated elsewhere is missing/stale until page reload. Recommended
   deviation: derive the options from the current snapshot on every render
   and keep the selection when the value still exists, otherwise reset to
   «Bütün anbarlar». Recorded as an approved deviation, never as parity.
5. **D-L5 — stylesheet.** The React `index.css` has NO rule for `.kpis`,
   `.kpi*`, `.eyebrow`, `.grid`, `.bar`, `.bar i`, `.pill-row` or `.chart`
   (verified: zero matches). Without `.bar{height:6px…}` the bar chart is
   invisible and cannot be evidenced live. Recommended: port those legacy
   rules verbatim (`index.html:30, 66-72, 89-90, 121, 151`) in Phase 11. Side
   effect: Phase 9/10 KPI blocks become styled as legacy — a visual change
   toward parity, no test impact. Alternative: leave to Phase 18 and accept
   that M11-31/M11-72 can only be source-verified.

## 7. Optional improvements (NOT parity, NOT in the ledger)

- Single-type donut renders a degenerate arc (start = end point); a full
  ring would be the visual intent. Owner may opt in later.
- KPI 3 uses `toFixed(1)` (dot decimal) while everything else is az-AZ.
- The bar chart rounds per warehouse (`Math.round`) while KPI 1 sums
  unrounded values; the two can differ by rounding.
- The subtitle prints the raw warehouse name, not `whLabel()`.

## 8. Safety and evidence plan

Read-only. TEST `alkjjbaawmsirsfvqljm` in sandbox mode only; never contact
production `bbjmhaerssakbreykxiw`. No Supabase mutation, fixture, layer
change, cutover, stage, commit, push or deploy. Evidence classes stay
separate: unit/source, browser interception (sandbox dev server, request
log, injected failures), persisted TEST (none planned), unavailable external
(a TEST admin/rehber identity, as in M10-51). Rows are promoted only from
exact exercised contracts, after Codex accepts this design.
