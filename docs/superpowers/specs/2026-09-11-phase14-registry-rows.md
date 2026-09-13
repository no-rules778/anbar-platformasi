# Phase 14 parity ledger — Module P («Hesabatlar»)

> **PHASE 14 IMPLEMENTED ON CLAUDE'S SIDE — 2026-09-11 (authoritative,
> latest).** T1-T7 ran as one block; **T8 was NOT run: no TEST identity was
> supplied to the session**, so **0 Supabase contacts, 0 authenticated reads,
> 0 writes and 0 RPCs** occurred. This phase performs no write by design, so
> the all-zero residual is the expected result, not a deferred obligation.
> **Tally, measured mechanically from the 99 `| M14-* |` status cells: 96
> `CODE VERIFIED`, 0 `LIVE VERIFIED`, 0 `IN PROGRESS`, 3 `NOT STARTED`
> (M14-10, M14-17, M14-99), 0 `BLOCKED`, 0 unclassified; 99 unique ids, 0
> duplicates, every row a uniform 5-cell row, ids M14-01…M14-99 with no gaps.**
> Gate: 177 files / 3741→3935 tests, `tsc -b --noEmit` clean, `oxlint src`
> clean for Phase 14, sandbox build clean, `git diff --check` clean, 0 staged,
> dirty tree preserved. Phase 14 remains **NOT ACCEPTED** pending Codex's
> independent audit.
> [Implementation audit](../audits/2026-09-11-phase14-implementation.md)

> **SUPERSEDED STATUS BANNER — 2026-09-11.** The prior banner read «DESIGN
> DRAFTED … no application code exists for this module and no row is
> promoted», with all 99 rows `NOT STARTED`. That was true of the design
> session and is now false; the banner above is authoritative.
> **CORRECTION (recorded, not erased):** a first draft of that banner and of
> the proposal asserted **96** rows from an uncounted prose estimate; the
> mechanical parse returned **99** and every stated figure was corrected before
> any downstream document was written (protocol §10, §12). No Supabase project
> was contacted in the design session either.
> [Proposal](./2026-09-11-react-migration-phase14-reports-proposal.md) ·
> [TEST-only plan](../plans/2026-09-11-react-migration-phase14-reports.md) ·
> [Design handoff audit](../audits/2026-09-11-phase14-design-handoff.md) ·
> [Roadmap](../plans/2026-09-10-post-phase9-migration-roadmap.md)

Evidence classes: *unit/source* = vitest / static source comparison;
*browser* = interception on the sandbox dev server against TEST; *live* = the
row's exact contract exercised against TEST `alkjjbaawmsirsfvqljm`;
*persisted TEST* = written and re-read in TEST; *server/RLS* = proven by a
refused or allowed call. Legacy refs are repository-root `index.html` lines.

**This phase performs NO write and issues NO RPC.** There is no write gate, no
sequence to consume, no `audit_log` residual and nothing to clean up. Every
row is either a pure derivation provable by unit test, a read-path contract, or
a browser/live observation. No row's evidence may be claimed from the adjacent
accepted Phase 10 dead-stock implementation: rows M14-60…M14-64 record the
REUSE, not a re-verification of Phase 10's own accepted contracts.

Browser affordances and server-authoritative behaviour stay separate rows
throughout (protocol §5, §7). Every row whose contract is a refusal or an
absence names the FIRST guard, and «has no gate» is recorded as evidence of
ungatedness, never inferred from a rendered link.

Rows deliberately NOT in this ledger (prose boundary, see proposal §1 and §7):
«Maliyyə göstəriciləri» (`rFin()`) and «Nəzarət və risklər» (`rCtrl()`), which
the roadmap assigns to Phase 15; the rail counter badges (Phase 18); the
unused colour map `C` at `6736` (recorded once as M14-09 and not ported); and
the accepted Phase 10 dead-stock derivation contracts themselves, which remain
Phase 10 rows.

| Row | Contract | Legacy ref | Server ref | Status |
|---|---|---|---|---|
| M14-01 | Rail contains one «Hesabatlar» entry, the FIRST of the «Təhlil» group, after the «Bazalar» group and before «Maliyyə göstəriciləri»; clicking it opens the page and it becomes the only active entry | 263-265 | — | `CODE VERIFIED` |
| M14-02 | The entry carries NO `id`, NO `display:none`, no sign-in visibility assignment and no `go()` branch, so the page is UNGATED for every effective role; access is never narrowed client-side | 264, 1495-1512, 7505-7507 | — | `CODE VERIFIED` |
| M14-03 | Page shell: a `.phead` with heading «Hesabatlar», the fixed subtitle «Hesabatlar hər əməliyyatdan sonra dərhal yenilənir.», a spacer, then the selector and the two buttons | 399-412 | — | `CODE VERIFIED` |
| M14-04 | The subtitle is FIXED for every role — this page has no role-dependent subtitle variant | 400 | — | `CODE VERIFIED` |
| M14-05 | `#rep-pick` is ONE `<select>` carrying exactly eight options in the fixed legacy order: `knt`, `type`, `wh`, `per`, `abc`, `dead`, `tr`, `qaime` | 401-410 | — | `CODE VERIFIED` |
| M14-06 | The eight option LABELS are exact: «Kontragentlər üzrə dövriyyə», «Əməliyyat növləri üzrə xülasə», «Anbarlar üzrə müqayisə», «Dövr (gün/ay) üzrə hərəkət», «ABC təhlili», «Hərəkətsiz və ölü qalıq», «Anbarlararası yerdəyişmə matrisi», «Qaimələr üzrə hesabat» | 402-409 | — | `CODE VERIFIED` |
| M14-07 | `knt` is the FIRST option and therefore the default selection on first render; no explicit default assignment exists | 402 | — | `CODE VERIFIED` |
| M14-08 | Two action buttons follow the selector in fixed order: «Excel» (`#rep-exp`) then «Çap» (`#rep-print`); both are present for every role with no permission gate | 411 | — | `CODE VERIFIED` |
| M14-09 | The local colour map `C` is ASSIGNED and never read by any branch — dead legacy code, deliberately NOT ported. Recorded so its absence is evidenced, not accidental | 6736 | — | `CODE VERIFIED` |
| M14-10 | `fetchReportsSnapshot()` reads EXACTLY four tables — `movements`, `items`, `warehouses`, `partners` — with no RPC, no write and no capability probe | 867-871, 6746 | — | `NOT STARTED` |
| M14-11 | It is a NEW snapshot, not a widening of the accepted Phase 11 dashboard snapshot, whose exact read set is an accepted contract that must not change under Phase 14 | — | — | `CODE VERIFIED` |
| M14-12 | All four reads are FATAL and the snapshot is atomic: any reader's returned error OR rejected promise yields `ok:false` and nothing partial is returned | 855 | — | `CODE VERIFIED` |
| M14-13 | A read that SUCCEEDS with zero rows is a VALID snapshot, not a failure; an empty table renders empty reports, never an error surface | — | — | `CODE VERIFIED` |
| M14-14 | A failed REFRESH retains the previous complete snapshot on screen and only flags it; it never blanks a populated page | — | — | `CODE VERIFIED` |
| M14-15 | NO client-side warehouse scoping anywhere in the snapshot or any branch; the warehouse list is the unscoped `DB.whs` catalogue (`active && type==='anbar'`) | 933 | — | `CODE VERIFIED` |
| M14-16 | Deterministic read order is owned by the reused readers (`movements` by date+created_at, `items` by code, `partners` by name); nothing is re-sorted in the snapshot | 874 | — | `CODE VERIFIED` |
| M14-17 | Realtime watches exactly the four snapshot tables; this MATCHES the legacy `subscribeRealtime()` set, so it is parity, NOT an improvement | 1163-1181 | — | `NOT STARTED` |
| M14-18 | Every aggregate is derived from OPERATIONAL rows only — `operationalMovements()` runs before any aggregate exists; no branch re-filters cancellations and no branch reads a raw movement | 1249-1270, 1279 | — | `CODE VERIFIED` |
| M14-19 | The accepted `buildItemIndexes()` is NOT widened; the six missing aggregates live in a separate module, preserving the Phase 9/10 read contract unchanged | — | — | `CODE VERIFIED` |
| M14-20 | The shared price rule: `pr` is the movement price when `m.pr != null && m.pr > 0`, else the ITEM CARD price, else 0 | 1282 | — | `CODE VERIFIED` |
| M14-21 | `byPartner` is keyed `m.p \|\| '(göstərilməyib)'`; its `val` accrues `(m.i \|\| 0) * pr` — INCOMING only | 1296-1297 | — | `CODE VERIFIED` |
| M14-22 | `byType.val` accrues `((m.i \|\| 0) + (m.o \|\| 0)) * pr` — BOTH directions. Deliberately unlike `byPartner` and `byDate`; the asymmetry is load-bearing | 1298 | — | `CODE VERIFIED` |
| M14-23 | `byDate.val` accrues `(m.i \|\| 0) * pr` — INCOMING only, like `byPartner` and unlike `byType` | 1299 | — | `CODE VERIFIED` |
| M14-24 | `byWh` accumulates `in`/`out`/`n` per warehouse and its `val` is added in the FINALISATION pass from balance values, not during the movement pass | 1294-1295, 1311 | — | `CODE VERIFIED` |
| M14-25 | `positions` is `bal` filtered by `Math.abs(q) > 1e-9`; exactly 1e-9 is NOT a position, and a negative beyond the epsilon IS one | 1319 | — | `CODE VERIFIED` |
| M14-26 | `dates` is the `byDate` key set sorted by `dsort`, ascending ISO order | 1320 | — | `CODE VERIFIED` |
| M14-27 | `knt` rows are `byPartner` entries sorted by `s.val` DESCENDING | 6742 | — | `CODE VERIFIED` |
| M14-28 | Each `knt` row resolves VÖEN and contract from the partner directory by EXACT name match; a partner absent from the directory yields `{}`, so both cells are empty in the export and «—» on screen | 6746, 6750 | — | `CODE VERIFIED` |
| M14-29 | The `knt` per-row directory lookup is a Map in React (D-P4) with output IDENTICAL to the legacy linear `find()`; the equivalence is pinned by a test including the missing-partner case | 6746 | — | `CODE VERIFIED` |
| M14-30 | `knt` renders a bar chart of the TOP 12 by value beside the full table; the chart is capped at 12 while the table is not | 6748 | — | `CODE VERIFIED` |
| M14-31 | `knt` export header is exactly `['Kontragent/Layihə','Əməliyyat sayı','Mədaxil miqdarı','Məxaric miqdarı','Mədaxil dəyəri','VÖEN','Müqavilə']` and `REP_NAME` is `kontragent_dovriyye` | 6743-6745 | — | `CODE VERIFIED` |
| M14-32 | `type` rows are `byType` entries sorted by `s.n` DESCENDING | 6753 | — | `CODE VERIFIED` |
| M14-33 | The `type` «Payı» bar width is `r.s.n / Math.max(1, TOTAL_OPERATIONAL) * 100` at 1dp — the denominator is the GLOBAL operational count, never the branch's own sum | 6756 | — | `CODE VERIFIED` |
| M14-34 | `type` renders each row's type through the tag class map; an unmapped type falls back to `t-mut` | 1415-1418, 6756 | — | `CODE VERIFIED` |
| M14-35 | `type` export header is exactly `['Növ','Sayı','Mədaxil','Məxaric','Dəyər']` and `REP_NAME` is `novler_uzre` | 6753 | — | `CODE VERIFIED` |
| M14-36 | `wh` renders one row per configured warehouse in `DB.whs` ORDER — not sorted, and including a warehouse with no movements at all | 6759 | — | `CODE VERIFIED` |
| M14-37 | `wh` `val` sums ALL balance values for the warehouse, including zero-quantity and negative rows — not only active positions | 6761 | — | `CODE VERIFIED` |
| M14-38 | `wh` reads `in`/`out`/`n` from `byWh` with a `{in:0,out:0,n:0}` fallback for a warehouse absent from the index | 6760 | — | `CODE VERIFIED` |
| M14-39 | `wh` `neg` counts balances with `q < 0` (strict, no epsilon — unlike the `positions` rule) and renders them in a `.neg` span when non-zero, else the literal «0» | 6761, 6766 | — | `CODE VERIFIED` |
| M14-40 | The `wh` «Dövriyyə %» cell is `r.in ? (r.out / r.in * 100).toFixed(1) + '%' : '—'`; a zero-intake warehouse shows an em-dash, never «0.0%» or a division error | 6766 | — | `CODE VERIFIED` |
| M14-41 | The `wh` EXPORT column set differs from the screen set: export carries `whLabel`, pos, in, out, val(2dp), neg, n and omits the percentage | 6762 | — | `CODE VERIFIED` |
| M14-42 | `wh` export header is exactly `['Anbar','Mövqe','Mədaxil','Məxaric','Dəyər','Mənfi qalıq','Əməliyyat']` and `REP_NAME` is `anbarlar_muqayise` | 6762 | — | `CODE VERIFIED` |
| M14-43 | `per` folds `byDate` into months on `d.slice(0,7)`, summing in/out/n/val per month | 6769-6770 | — | `CODE VERIFIED` |
| M14-44 | `per` months are sorted by `dsort` on the ISO month key, ascending — NOT by the formatted `MM.YYYY` label, which would order wrongly across years | 6770 | — | `CODE VERIFIED` |
| M14-45 | The `per` sparkline plots one point per entry of `dates`, valued by that date's movement COUNT | 6771 | — | `CODE VERIFIED` |
| M14-46 | The `per` month label is `fmtM()` → `MM.YYYY`; the EXPORT carries the same formatted label, not the ISO key | 6772-6773 | — | `CODE VERIFIED` |
| M14-47 | `per` export header is exactly `['Ay','Əməliyyat','Mədaxil','Məxaric','Mədaxil dəyəri']` and `REP_NAME` is `dovr_uzre` | 6772 | — | `CODE VERIFIED` |
| M14-48 | A React `Sparkline` reproduces `sparkline()`: viewBox 620×90, an area path closed to the baseline, a stroke path, and one circle per point with a `<title>` | 1397-1408 | — | `CODE VERIFIED` |
| M14-49 | The sparkline scales by `Math.max(...v, 1)` and its step is `w/(n-1)` for n>1, else `w` — a single point does not divide by zero | 1400-1401 | — | `CODE VERIFIED` |
| M14-50 | `sparkline()` returns EMPTY for an empty point set; the branch renders nothing rather than an empty chart frame | 1399 | — | `CODE VERIFIED` |
| M14-51 | `abc` sorts `positions` by `val` DESCENDING, then assigns a running cumulative share | 6777-6779 | — | `CODE VERIFIED` |
| M14-52 | The ABC boundaries are `p <= .8 → 'A'`, `p <= .95 → 'B'`, else `'C'` — inclusive at both thresholds, tested below/equal/above | 6779 | — | `CODE VERIFIED` |
| M14-53 | `tot` falls back to 1 when the value sum is zero, so an all-zero portfolio classes every row `A` rather than dividing by zero | 6778 | — | `CODE VERIFIED` |
| M14-54 | `abc` renders three KPIs — count and summed value per class — in the fixed order A, B, C with the fixed classes `g`, ``, `o` | 6782 | — | `CODE VERIFIED` |
| M14-55 | The three ABC KPI eyebrows are exactly «A sinfi — dəyərin 80%-i», «B sinfi — növbəti 15%», «C sinfi — qalan 5%» | 6782 | — | `CODE VERIFIED` |
| M14-56 | The `abc` class tag colour is `A→t-in`, `B→t-op`, `C→t-mut` | 6785 | — | `CODE VERIFIED` |
| M14-57 | The `abc` SCREEN percentage is `cum/tot*100` at 1dp (cumulative) while the EXPORT percentage is `share*100` at 2dp (individual) — two DIFFERENT numbers in one branch | 6781, 6785 | — | `CODE VERIFIED` |
| M14-58 | `abc` export header is exactly `['Sinif','Kod','Mal','Anbar','Qalıq','Dəyər','Pay %']`, uses `whLabel` for the warehouse, and `REP_NAME` is `abc_tehlili` | 6781 | — | `CODE VERIFIED` |
| M14-59 | The fixed hint «İlk 200 sətir göstərilir — tam siyahı üçün CSV ixrac edin.» is reproduced VERBATIM even though it contradicts `SHOW_MAX = 3000` (D-P2). Stale legacy text preserved as parity; correcting it is a product decision | 6787, 1678 | — | `CODE VERIFIED` |
| M14-60 | The `dead` branch REUSES the accepted Phase 10 `deadStockRows()` as its single derivation; no second implementation exists and Phase 10 behaviour is unchanged | 6788-6794 | — | `CODE VERIFIED` |
| M14-61 | The `dead` KPIs REUSE the accepted `deadStockKpis()`; the three eyebrows/subs are «Hərəkətsiz mövqe»/«30 gündən çox», «Dondurulmuş dəyər»/«dövriyyədən kənar vəsait», «Heç istifadə olunmayıb»/«yalnız mədaxil olub» | 6797-6799 | — | `CODE VERIFIED` |
| M14-62 | The `dead` export REUSES the accepted `deadStockExportMatrix()`; header and `whLabel` handling are Phase 10's, and `REP_NAME` is `hereketsiz_qaliq` | 6795-6796 | — | `CODE VERIFIED` |
| M14-63 | The `dead` reference date is the LAST operational date, falling back to `today()` when there is none — supplied by the caller so the derivation stays date-stable | 6789 | — | `CODE VERIFIED` |
| M14-64 | The `dead` TABLE cell prints the RAW warehouse name while the EXPORT prints `whLabel()` — a divergence already encoded in the accepted Phase 10 functions and reused, not reimplemented | 6796, 6803 | — | `CODE VERIFIED` |
| M14-65 | `tr` considers ONLY operational rows whose type is exactly «Yerdəyişmə» | 6807 | — | `CODE VERIFIED` |
| M14-66 | The far-side warehouse is resolved by BARE CASE-SENSITIVE PREFIX MATCH `partner.indexOf(w) === 0` over `DB.whs` | 6808 | — | `CODE VERIFIED` |
| M14-67 | A transfer row whose partner text matches NO warehouse prefix is SILENTLY DROPPED from the matrix — no error, no «—» row, no counter | 6809 | — | `CODE VERIFIED` |
| M14-68 | Direction is `out>0 ? {from: own, to: other} : {from: other, to: own}`, keyed `from + '→' + to`; the two directions of one corridor are SEPARATE rows | 6810-6811 | — | `CODE VERIFIED` |
| M14-69 | `tr` quantity accrues `(m.i \|\| m.o)` — a JS `\|\|`, so a zero/absent incoming falls through to the outgoing quantity | 6813 | — | `CODE VERIFIED` |
| M14-70 | `tr` value accrues `(m.i \|\| m.o) * (m.pr \|\| itemPrice \|\| 0)` — the movement price wins whenever truthy, then the item card price, then 0 | 6813 | — | `CODE VERIFIED` |
| M14-71 | `tr` deliberately does NOT use the accepted `movKey()`/`transferRoute()` normaliser: no lower-casing, no `ı`→`i`, no «anbar/anbarı/anbarına» stripping. The two CAN disagree («astara anbarı» resolves under the normaliser and is dropped by `tr`); the legacy prefix match is preserved and substituting it is out of scope | 6808, 1430-1454 | — | `CODE VERIFIED` |
| M14-72 | `tr` rows are sorted by quantity DESCENDING; its empty state is exactly «Yerdəyişmə qeydi tapılmadı.» | 6816-6818 | — | `CODE VERIFIED` |
| M14-73 | `tr` export header is exactly `['Haradan','Hara','Əməliyyat','Miqdar','Dəyər']` and `REP_NAME` is `yerdeyisme_matrisi`; the from/to cells carry the RAW stored names, not `whLabel` | 6817 | — | `CODE VERIFIED` |
| M14-74 | `qaimeReportRows()` groups operational rows by `invoice_num + '\|' + (doc_num \|\| '—')` — BOTH components, because one Qaimə may legitimately span several documents | 6854-6856 | — | `CODE VERIFIED` |
| M14-75 | A row with an empty/whitespace `invoice_num` is SKIPPED entirely and appears in no group | 6854-6855 | — | `CODE VERIFIED` |
| M14-76 | Notes are de-duplicated by linear scan, joined with ` · `, order-preserving, with NO length cap and NO truncation anywhere in screen or export. Any visual shortening is CSS ellipsis on a different column | 6870, 88 | — | `CODE VERIFIED` |
| M14-77 | A group's `val` uses `movementValuation(m)` for a «Silinmə» row, taking `final ?? 0`; every other type uses `((i)+(o)) * (m.pr \|\| 0)` with NO item-price fallback — unlike every other branch on this page | 6872-6873 | — | `CODE VERIFIED` |
| M14-78 | Group quantity is `(m.i \|\| 0) + (m.o \|\| 0)` — a SUM, deliberately unlike the `tr` branch's `\|\|` fallthrough | 6871 | — | `CODE VERIFIED` |
| M14-79 | The date range renders as a single date when `dMin === dMax`, else `fmtD(dMin) + ' – ' + fmtD(dMax)`; the EXPORT uses raw ISO dates with the same range rule | 6891, 6909 | — | `CODE VERIFIED` |
| M14-80 | Groups are sorted by `dsort(b.dMax, a.dMax)` DESCENDING, tie-broken by `a.iv.localeCompare(b.iv, 'az')` ascending — the az collation is load-bearing | 6876 | — | `CODE VERIFIED` |
| M14-81 | `QAIME_COLS` is exactly eleven columns in fixed order: date, type, wh, partner, ch, ct, lines, qty, val, note, by | 6835-6847 | — | `CODE VERIFIED` |
| M14-82 | Exactly seven columns default ON (date, type, wh, partner, lines, qty, val) and four default OFF (ch, ct, note, by) | 6836-6846 | — | `CODE VERIFIED` |
| M14-83 | Two FIXED columns «Qaimə №» and «Sənəd №» always precede the selected ones and cannot be deselected | 6888, 6906 | — | `CODE VERIFIED` |
| M14-84 | Numeric right-alignment is decided by `/qty\|val\|lines/` on the column key | 6888 | — | `CODE VERIFIED` |
| M14-85 | Set-valued cells (type, wh, partner, ch, ct, by) join with `', '`; an empty set renders «—» on screen and an EMPTY STRING in the export | 6892-6900, 6909-6919 | — | `CODE VERIFIED` |
| M14-86 | Toggling a column checkbox re-renders the sub-report and rebuilds both the table and the export matrix | 6884 | — | `CODE VERIFIED` |
| M14-87 | The column selection persists across navigation away and back for the page's lifetime (legacy module-level `QAIME_SEL`); it is held in the store, not component state (D-P3) | 6848-6849 | — | `CODE VERIFIED` |
| M14-88 | `#rep-filters` is CLEARED by every non-`qaime` branch and populated only by `qaime`, so the column picker disappears on switch away and is rebuilt from the retained selection on return | 6739, 6879 | — | `CODE VERIFIED` |
| M14-89 | `qaime` export header is `['Qaimə №','Sənəd №']` plus the SELECTED column titles, and `REP_NAME` is `qaimeler_uzre`; the matrix follows the same selection as the table | 6905-6907 | — | `CODE VERIFIED` |
| M14-90 | The `qaime` header hint states the group count and the fixed source sentence «mənbə: qeyd edilmiş və ləğv edilməmiş əməliyyatlar.»; its empty state is «Qaimə № yazılmış sənəd tapılmadı.» | 6920-6924 | — | `CODE VERIFIED` |
| M14-91 | Export writes `REP_ROWS` under `REP_NAME` through the accepted `xls()`; the file is `<name>_<yyyy-mm-dd>.xlsx`, falling back to CSV when the workbook library is unavailable | 6733, 1219-1236 | — | `CODE VERIFIED` |
| M14-92 | The exported matrix is the UNCUT set for every branch, even where the on-screen table is cut at `SHOW_MAX` | 6781, 6796, 6906 | — | `CODE VERIFIED` |
| M14-93 | Print stamps `'Hesabat: ' + REP_NAME` — the export SLUG, never the human option label | 6732 | — | `CODE VERIFIED` |
| M14-94 | The printed row count is `Math.max(0, REP_ROWS.length - 1)` — the header row excluded and floored at zero, so an empty report prints «0 sətir», never «-1 sətir» | 6732 | — | `CODE VERIFIED` |
| M14-95 | Legacy wires both buttons ONCE behind a `dataset.done` latch, so they close over the module globals and always act on the LAST-RENDERED report. React holds the current matrix and name in state, refreshed by the same render; observable behaviour is identical, the mechanism is not, and this is recorded as an equivalence rather than claimed as implementation parity | 6732-6733, 6729 | — | `CODE VERIFIED` |
| M14-96 | `abc` and `dead` cut at `SHOW_MAX` with NO «Hamısını göstər» affordance, while `qaime` cuts AND renders `cutNote()`; the asymmetry is legacy and preserved | 6785, 6802, 6928 | — | `CODE VERIFIED` |
| M14-97 | `mutationGuard.ts` gains NO entry: this page performs no write, so there is no action to guard. Recorded so the absence is an evidenced decision, not an omission | — | — | `CODE VERIFIED` |
| M14-98 | `web/src/index.css` gains exactly three ADDITIVE rules — `.neg`, `.clk` and a bare `.nm` — and no existing rule is modified; only `td.nm` existed before | 6766, 6785, 1412 | — | `CODE VERIFIED` |
| M14-99 | An anbardar's report rows are narrowed by the live RLS SELECT policy on `movements`, never by client code; the row set difference is a SERVER contract and cannot be claimed from a single role's browser session | — | policy | `NOT STARTED` |

## Authoritative tally

Derived mechanically from the 99 `| M14-* |` status cells by classifying each
row on the PRIMARY status at the start of its final cell (protocol §17), by a
parser that splits on UNESCAPED pipes only so an escaped `\|` inside a contract
cell is literal text rather than a column separator.

| Status | Rows |
|---|---|
| `CODE VERIFIED` | 96 |
| `LIVE VERIFIED` | 0 |
| `IN PROGRESS` | 0 |
| `NOT STARTED` | 3 |
| `BLOCKED` | 0 |
| unclassified | 0 |
| **total unique** | **99** |

99 rows, 99 unique ids, 0 duplicates, every row a uniform 5-cell row, ids
M14-01…M14-99 contiguous with no gaps, sum of status counts = 99 = unique ids.

The 3 `NOT STARTED` rows are **M14-10, M14-17 and M14-99** — the live
four-read observation, the live realtime subscription and the RLS row-set
comparison. Each needs a TEST identity the session did not have; M14-99 needs
two. **No row is `LIVE VERIFIED`: nothing was executed against TEST.**

The same parser was run against the independently `ACCEPTED` Phase 13 ledger as
a POSITIVE CONTROL and returned 77 rows / 68 `CODE VERIFIED` / 9
`LIVE VERIFIED` / 0 otherwise — matching that ledger's own accepted banner
exactly. The 99 above is therefore a real count, not a parser artefact.
