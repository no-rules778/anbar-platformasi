# Phase 14 draft proposal — «Hesabatlar» (legacy `rRep()` / `rQaimeReport()`)

Date: 2026-09-11
Status: **IMPLEMENTED ON CLAUDE'S SIDE — `NOT ACCEPTED`.**
**Tally, measured mechanically from the 99 `| M14-* |` status cells: 96
`CODE VERIFIED`, 0 `LIVE VERIFIED`, 0 `IN PROGRESS`, 3 `NOT STARTED`
(M14-10, M14-17, M14-99), 0 `BLOCKED`, 0 unclassified; 99 unique ids.**
T8 did not run — no TEST identity was supplied, so 0 Supabase contacts
occurred and the three live rows stay unpromoted.
Only Codex's independent audit can accept this phase.
**SUPERSEDED (HISTORY):** this line first read «DESIGN DRAFTED — NOT STARTED»
with no application code in existence. True then, false now.
[Implementation audit](../audits/2026-09-11-phase14-implementation.md).
[Ledger (M14 rows)](./2026-09-11-phase14-registry-rows.md) ·
[TEST-only plan](../plans/2026-09-11-react-migration-phase14-reports.md) ·
[Design handoff audit](../audits/2026-09-11-phase14-design-handoff.md) ·
[Roadmap](../plans/2026-09-10-post-phase9-migration-roadmap.md)

## 1. Scope and dependency

Phase 14 follows independently `ACCEPTED` Phases 9, 10, 11, 13 and the
owner-approved scope of Phase 12. It covers only the legacy page `rep`: the
rail entry (`index.html:264`), the page shell with its report selector
(`399-415`), the module globals `REP_ROWS` / `REP_NAME` (`6729`), the renderer
`rRep()` (`6730-6828`) and the qaimə sub-report `rQaimeReport()`
(`6878-6931`), plus every helper those call directly.

| Helper | Legacy lines |
|---|---|
| `rRep()` dispatch + export/print latch | 6730-6740 |
| `knt` branch | 6741-6751 |
| `type` branch | 6752-6757 |
| `wh` branch | 6758-6767 |
| `per` branch | 6768-6775 |
| `abc` branch | 6776-6787 |
| `dead` branch | 6788-6804 |
| `tr` branch | 6805-6820 |
| `qaime` dispatch | 6821-6823 |
| `QAIME_COLS` / `QAIME_SEL` | 6835-6849 |
| `qaimeReportRows()` | 6851-6877 |
| `rQaimeReport()` | 6878-6931 |
| `printHead()` | 1238-1243 |
| `cut()` / `cutNote()` / `SHOW_MAX` / `SHOW_ALL` | 1678-1690 |
| `xls()` / `toNum()` / `csv()` | 1199-1236 |
| `index()` aggregates | 1271-1320 |
| `tbl()` / `barChart()` / `sparkline()` / `TYPE_TAG` | 1368-1418 |
| `nf` / `money` / `today` / `dsort` / `fmtD` / `fmtM` | 594-603 |
| `whLabel` / `esc` | 582, 593 |
| `movementValuation()` | 1701-1707 |
| `normalMovements()` / `operationalMovements()` | 1249-1270 |

Its server contract is **nothing new**. This page issues no RPC and performs
no write: it is a pure derivation over tables already read by accepted
phases. **No SQL change is proposed and none is required.**

Out of scope: «Maliyyə göstəriciləri» (`rFin()`) and «Nəzarət və risklər»
(`rCtrl()`), which the roadmap assigns to Phase 15; the rail counter badges
(Phase 18 shell work); and the legacy `C` colour map at `6736`, which is
assigned and never read by any branch — dead code, recorded as M14-09 rather
than ported.

Everything below was read from primary sources in this session.

## 2. Verified legacy contract

### 2.1 Navigation — ungated

`<a data-p="rep">Hesabatlar</a>` (`264`) carries **no `id`**, no
`display:none`, no sign-in visibility assignment (`7505-7507` touches only
`nav-refs`, `nav-nreq`, `nav-azp`) and **no `go()` branch** (`1495-1512`
guards only `refs`, `nreq`, `azp`). The page is open to every effective role.
Role affects the RLS-shaped rows the snapshot returns, never access. This is
the M13-02 finding repeated, and it must not be recorded as a permission.

### 2.2 The eight report variants

`#rep-pick` (`401-410`) is a single `<select>` whose `value` drives one
`if/else if` chain. The eight values and their fixed option labels:

| `k` | Option label | `REP_NAME` |
|---|---|---|
| `knt` | Kontragentlər üzrə dövriyyə | `kontragent_dovriyye` |
| `type` | Əməliyyat növləri üzrə xülasə | `novler_uzre` |
| `wh` | Anbarlar üzrə müqayisə | `anbarlar_muqayise` |
| `per` | Dövr (gün/ay) üzrə hərəkət | `dovr_uzre` |
| `abc` | ABC təhlili | `abc_tehlili` |
| `dead` | Hərəkətsiz və ölü qalıq | `hereketsiz_qaliq` |
| `tr` | Anbarlararası yerdəyişmə matrisi | `yerdeyisme_matrisi` |
| `qaime` | Qaimələr üzrə hesabat | `qaimeler_uzre` |

`knt` is the first option, so it is the default on load. The initial
`REP_NAME` before any render is the literal `'hesabat'` (`6729`).

### 2.3 The export/print latch — the phase's central parity trap

`#rep-exp` and `#rep-print` are wired **once**, inside
`if (!pick.dataset.done)` (`6732-6733`). Both handlers close over the module
globals, not over the branch that rendered:

- **Excel**: `xls(REP_ROWS, REP_NAME)` — exports whatever the last-rendered
  branch assigned.
- **Print**: `printHead('Hesabat: ' + REP_NAME, nf(Math.max(0, REP_ROWS.length - 1)) + ' sətir')`
  then `setTimeout(() => window.print(), 60)`.

Three details are load-bearing and each gets its own ledger row:

1. The printed count is `REP_ROWS.length - 1` — the header row is excluded —
   and `Math.max(0, …)` floors it at 0, so an *empty* `REP_ROWS` prints
   «0 sətir» rather than «-1 sətir».
2. The print title is `'Hesabat: ' + REP_NAME` — the export *slug*
   (`abc_tehlili`), never the human option label.
3. `REP_ROWS` is the **uncut** set for every branch; only the on-screen table
   is cut. Export and print therefore describe more rows than the table shows
   whenever the cut applies.

In React there are no globals and no latch. The equivalent contract is the
current report's matrix and name held in component state, refreshed by the
same render that draws the table. The *observable* behaviour is identical;
the mechanism is not, and the ledger says so rather than claiming parity of
implementation.

### 2.4 Data source — operational rows only

Every branch reads `IX.*`, which `index()` (`1271-1320`) builds from
`operationalMovements()` (`1279`). Cancelled documents and their reversals are
already excluded before any aggregate exists. No branch re-filters
cancellations and no branch reads a raw movement row.

The six aggregates the branches consume, none of which exists in React today:

| Aggregate | Built at | Consumed by |
|---|---|---|
| `IX.byPartner` | 1296-1297 | `knt` |
| `IX.byType` | 1298 | `type` |
| `IX.byWh` | 1294-1295 | `wh` |
| `IX.byDate` | 1299 | `per` |
| `IX.dates` | 1320 | `per`, `dead` |
| `IX.positions` | 1319 | `abc`, `dead` |
| `IX.totVal` | 1318 | not read by `rRep()` |

`IX.bal` and `IX.byItem` already exist in `web/src/lib/itemIndex.ts`.

**The price rule is uniform and must not be "fixed":** `pr` is the movement
price when `m.pr != null && m.pr > 0`, else the *item card* price (`1282`).
`byPartner.val` accrues `(m.i || 0) * pr` — **incoming only**; `byType.val`
accrues `((m.i || 0) + (m.o || 0)) * pr` — **both directions**; `byDate.val`
accrues `(m.i || 0) * pr` — incoming only. These three differ deliberately.

### 2.5 Branch contracts

**`knt`** — `IX.byPartner` entries mapped to `{n, s}`, sorted by `s.val`
descending. The partner key is `m.p || '(göstərilməyib)'` (`1296`), so
unattributed movements aggregate under that literal. Each row re-looks-up
`DB.partners.find(x => x.name === r.n)` for VÖEN and contract — a **linear
scan per row**, and a partner absent from the directory yields `{}` so both
cells fall back to `''` in the export and «—» on screen. Renders a bar chart
of the top 12 by value alongside the full table.

**`type`** — `IX.byType` entries sorted by `s.n` descending. The «Payı» column
is a `.bar` whose width is `(r.s.n / Math.max(1, normalMovements().length) * 100).toFixed(1)%`
— the denominator is the **global** operational count, not the branch's own
sum.

**`wh`** — one row per `DB.whs` entry, in configured order (not sorted). Per
warehouse: `pos` = balances with `abs(q) > 1e-9`; `val` = sum of **all**
balance values including zero-quantity and negative rows; `in`/`out`/`n` from
`IX.byWh` with a `{in:0,out:0,n:0}` fallback; `neg` = balances with `q < 0`.
The «Dövriyyə %» cell is `r.in ? (r.out / r.in * 100).toFixed(1) + '%' : '—'`.
The export column set differs from the screen column set — export carries
`whLabel(r.w)`, `pos`, `in`, `out`, `val.toFixed(2)`, `neg`, `n`; the screen
adds the percentage and omits nothing else.

**`per`** — `IX.byDate` folded into `byMonth` on `d.slice(0, 7)`, sorted by
`dsort` on the month key. A daily sparkline is built from `IX.dates` mapped to
`IX.byDate.get(d).n`. The month label is `fmtM()` (`MM.YYYY`); the export
carries the same formatted label, not the ISO key.

**`abc`** — `IX.positions` sorted by `val` descending, then a running
cumulative share: `p <= .8 → 'A'`, `p <= .95 → 'B'`, else `'C'`. `tot` falls
back to `1` when the sum is zero, so an all-zero portfolio classes every row
`A` rather than dividing by zero. Three KPIs (count and value per class), a
fixed advisory paragraph, and a table cut by `cut(rows, 'abc')` with **no**
`cutNote` — plus a fixed hint reading «İlk 200 sətir göstərilir», which
**contradicts `SHOW_MAX = 3000`**. The hint is stale legacy text; it is
reproduced verbatim as parity and recorded as M14-59 rather than corrected.
Export carries `share * 100` at 2dp; the screen prints `cum / tot * 100` at
1dp — two different percentages in the same branch.

**`dead`** — already ported and `ACCEPTED` as Phase 10's
`deadStockRows` / `deadStockKpis` / `deadStockExportMatrix`. Per the owner's
instruction those functions are the **single derivation** for both the Phase 10
tab and this dropdown branch; Phase 10 behaviour is unchanged and its accepted
rows are not re-evidenced here. The one Phase-14-specific difference is the
table's warehouse cell, which prints the raw `b.w` (`6803`) while the export
prints `whLabel(b.w)` (`6796`) — already encoded in the accepted functions.

**`tr`** — operational `Yerdəyişmə` rows only. The far-side warehouse is
resolved by **bare prefix match**: `DB.whs.find(w => (m.p || '').indexOf(w) === 0)`
(`6808`). A row whose partner text matches no warehouse prefix is **silently
dropped**. Direction is `m.o > 0 ? {from: m.w, to: other} : {from: other, to: m.w}`,
keyed `from + '→' + to`. Quantity accrues `(m.i || m.o)` — a JS `||`, so a
zero incoming falls through to outgoing. Value accrues
`(m.i || m.o) * (m.pr || itemPrice || 0)`. Sorted by `q` descending; empty
state «Yerdəyişmə qeydi tapılmadı.».

**`qaime`** — `qaimeReportRows()` (`6851-6877`) groups operational rows by
`invoice_num + '|' + (doc_num || '—')`, skipping rows with an empty
`invoice_num` entirely. Per group it accumulates a date range (`dMin`/`dMax`),
`Set`s of types, warehouses, partners, channels, contracts and recorders, a
**de-duplicated ordered array** of notes, a row count, quantity
`(m.i || 0) + (m.o || 0)`, and a value that is
`movementValuation(m)` for a `Silinmə` row — using `final ?? 0` — and
`((m.i||0)+(m.o||0)) * (m.pr || 0)` otherwise. **The non-Silinmə branch has no
item-price fallback**, unlike every other branch on this page. Sorted by
`dsort(b.dMax, a.dMax)` then `a.iv.localeCompare(b.iv, 'az')`.

### 2.6 The qaimə column picker

`QAIME_COLS` (`6835-6847`) is eleven columns, six checked by default
(`date`, `type`, `wh`, `partner`, `lines`, `qty`, `val` — seven `def: true`
entries; `ch`, `ct`, `note`, `by` default off). `QAIME_SEL` is **module-level
mutable state initialised once** (`6848-6849`), so a user's column choice
persists across navigation for the lifetime of the page load — it is not reset
by re-rendering.

Two fixed columns — «Qaimə №» and «Sənəd №» — always precede the selected
ones. Numeric right-alignment is decided by `/qty|val|lines/.test(c.k)`.
Toggling a checkbox re-renders the whole sub-report.

`#rep-filters` is cleared by every non-`qaime` branch (`6739`) and populated
only by `qaime` — so switching away from the qaimə report removes the column
picker, and switching back rebuilds it from the retained `QAIME_SEL`.

### 2.7 Cut behaviour is asymmetric

- `abc` → `cut(rows, 'abc')`, **no** `cutNote`;
- `dead` → `cut(rows, 'dead')`, **no** `cutNote`;
- `qaime` → `cut(rows, 'qaime')` **plus** `cutNote(rows, 'qaime', rerender)`.

So only the qaimə report offers «Hamısını göstər». `abc` and `dead` silently
truncate at `SHOW_MAX = 3000`. This is legacy behaviour and is preserved.

### 2.8 Note truncation — there is none

`qaimeReportRows()` joins notes with `' · '` and de-duplicates by
`g.notes.indexOf(m.note) < 0` — an O(n²) linear scan, order-preserving, with
**no length cap and no truncation**. The screen renders the full joined string
and the export carries the same. Any "truncation" is purely the CSS
`td.nm{max-width:390px}` ellipsis on a *different* column. This is recorded
explicitly (M14-76) because a reviewer may reasonably expect a cap and find
none; adding one would be a silent behaviour change.

### 2.9 Divergence: `tr` does not use the accepted route normaliser

The accepted `movKey()` / `transferRoute()` (`1430-1491`, ported in
`lib/movementRoute.ts` and `lib/movementKey.ts`) normalise warehouse text by
lower-casing, canonicalising `ı`→`i` and stripping the display suffixes
«anbar / anbarı / anbarına». The `tr` branch does **none** of that: it is a
case-sensitive `indexOf(w) === 0` prefix test.

The two can disagree. «astara anbarı» resolves under `transferRoute()` and is
dropped by `tr`. Phase 14 **preserves the legacy prefix match** and does not
substitute the normaliser. Recorded as M14-71; substituting would change which
rows appear in a financial matrix and is not in scope.

### 2.10 Stylesheet gaps

Of the rules this page needs, `web/src/index.css` is missing exactly three,
and has no sparkline support:

| Missing | Needed by | Legacy source |
|---|---|---|
| `.neg` | `wh` negative-balance cell | index.html:6766 uses `<span class="neg">` |
| `.clk` | `abc` / `dead` clickable rows | `tbl(..., {clk:1})`, 1412 |
| bare `.nm` | `abc` / `dead` name cell `<div class="nm">` | only `td.nm` exists (index.css:88) |

`.bar`, `.kpis`, `.kpi`, `.filters`, `.chart`, `.empty`, `.tw`, `.code`,
`.muted`, `.hint`, `.seg`, `.tag` and the type-tag classes are all present.
`barChart` has a React equivalent (`components/dashboard/BarChart.tsx` +
`lib/dashboardCharts.ts`); **`sparkline()` (1397-1408) has none** and must be
added for `per`. This mirrors the M13-99 precedent: additive CSS only, no rule
changed.

## 3. React modules this phase reuses

Accepted and reused **unchanged**: `lib/itemIndex.ts` (`buildItemIndexes` —
**not widened**, per the Phase 11 precedent that a LIVE VERIFIED read contract
must not change under an accepted phase), `lib/operationalMovements.ts`,
`lib/warehouseOverview.ts` (the three dead-stock functions),
`lib/showAllCut.ts`, `lib/xls.ts`, `lib/format.ts`, `lib/movementRoute.ts`
(`whLabel` only), `lib/movementValuation.ts`, `lib/dashboardCharts.ts`,
`components/dashboard/BarChart.tsx`, `components/PrintHead.tsx`,
`components/ui/Button.tsx`, `hooks/useRealtimeRefresh.ts`, `lib/roles.ts`.

New, isolated: `lib/reportAggregates.ts` (the six missing `IX.*` aggregates),
`lib/reports.ts` (the seven non-dead branch derivations + export matrices),
`lib/qaimeReport.ts` (grouping, column model, matrix),
`api/reportsSnapshot.api.ts`, `store/reports.store.ts`,
`pages/ReportsPage.tsx`, `components/reports/Sparkline.tsx`.

`mutationGuard.ts` gets **no entry**: this page performs no write, so there is
no action to guard. Recorded as M14-97 so its absence is a deliberate,
evidenced decision rather than an omission.

## 4. Snapshot contract

A new `fetchReportsSnapshot()` reading exactly four tables:
`movements`, `items`, `warehouses`, `partners` — the same four the Phase 11
dashboard snapshot reads, for a different reason (`partners` here feeds the
`knt` VÖEN/contract columns, `6746`). It is a **new** snapshot, not a widening
of the Phase 11 one, whose exact read set is an accepted contract.

Atomic like every accepted snapshot since Phase 8: any reader's error or
rejection fails the whole generation; a failed refresh retains the previous
complete snapshot. The legacy loader instead toasts per failed table and
renders whatever loaded (`855`) — an accepted deviation, not parity.

No client-side warehouse scoping. Rows are whatever RLS returns.

## 5. Realtime

Watch the four tables the snapshot reads. Legacy `subscribeRealtime()`
(`1163-1181`) subscribes to `movements`, `items`, `partners`, `warehouses` —
the same set — so this is parity, not an improvement, unlike the Phase 12 D-M4
case.

## 6. Evidence boundaries

This page issues **no RPC and performs no write**. There is therefore no
D-N1/D-M2-style write gate, no sequence to consume, no `audit_log` residual
and nothing to clean up. Every contract is either pure-derivation
(`CODE VERIFIED` by unit tests) or read-path/browser evidence.

The only rows needing live TEST evidence are the snapshot read, the realtime
subscription and the RLS-shaped row set. A TEST admin identity remains
unavailable (the M10-51 / M11-91 / M12-98 / M13-93 boundary), so any row whose
contract requires comparing an admin's row set against an anbardar's stays
unpromoted rather than claimed from a single role.

## 7. Design decisions required before implementation

1. **D-P1 — `dead` reuse.** *Resolved by the owner on 2026-09-11:* the
   accepted Phase 10 pure functions are the single derivation for both the
   Phase 10 tab and this dropdown branch. Phase 10 behaviour is unchanged and
   its accepted rows are not re-evidenced. No further decision needed.
2. **D-P2 — the stale «İlk 200 sətir» hint (`6787`).** It contradicts
   `SHOW_MAX = 3000`. *Recommended:* reproduce verbatim as parity and record
   the contradiction (M14-59); correcting user-visible text is a product
   decision, not a migration one.
3. **D-P3 — `QAIME_SEL` persistence.** Legacy retains the column choice for
   the page's lifetime, across navigation away and back. *Recommended:* keep
   it in the store (not component state) so the same retention holds; a
   component-local `useState` would silently reset it on unmount.
4. **D-P4 — the `knt` per-row partner scan (`6746`).** Legacy does a linear
   `find()` per row. *Recommended:* build one `Map` and document the
   equivalence; this is an internal optimisation with identical output, and a
   test pins that a partner missing from the directory still yields empty
   cells.

D-P2, D-P3 and D-P4 are recommendations with no behavioural difference from
legacy except D-P4's complexity. All three are implemented as recommended;
none blocks a slice. They are reported to the owner at the end.

## 8. Safety

TEST `alkjjbaawmsirsfvqljm` only; never production `bbjmhaerssakbreykxiw`;
sandbox mode only; preserve the dirty tree; no stage, commit, push or deploy;
no SQL change; no credential stored or printed. This phase opens **no write
window**.
