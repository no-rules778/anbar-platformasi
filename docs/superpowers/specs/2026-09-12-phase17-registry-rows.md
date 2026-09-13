# Phase 17 authoritative registry — Module T (Azpetrol / Araz)

**PHASE STATUS: ACCEPTED (owner decision, 2026-09-12).** The 17 authority-
gated contracts retain `BLOCKED` as verification-package statuses but no longer
block acceptance of the implemented read/pure migration. No status was promoted
without evidence. [Decision](../decisions/2026-09-12-phase17-read-pure-acceptance-scope.md) ·
[verification package](../plans/2026-09-12-phase17-authority-verification-package.md).

**Current tally:** 85 `CODE VERIFIED`, 8 `LIVE VERIFIED`, 0 `IN PROGRESS`,
0 `NOT STARTED`, 17 `BLOCKED`, 0 unclassified; **110 unique rows**,
0 duplicates.

**Correction, 2026-09-12.** The first draft of this banner and its tally table
asserted 24 / 53 / 12 / 89 from an uncounted construction estimate. The
HISTORY: the first mechanical parse returned 44 / 48 / 18 / 110. The Codex
design audit corrected M17-63 from an owner-blocked divergence to the
unambiguous legacy separate-writer contract; the current parse is
44 / 49 / 17 / 110, confirmed by the checker and by a second,
independently written tally and by a contiguous id sequence M17-01…
M17-110 with no gaps and no duplicates. All figures were corrected before any
downstream document cited them. This is the fourth occurrence of that defect
class after Phase 12 (58→70), Phase 13 (86→77) and Phase 14 (96→99); it is
recorded here rather than silently overwritten, per protocol §10/§12.

**Update, 2026-09-12 (offline write/import/export slice).** The 13 remaining
`NOT STARTED` rows were implemented and promoted, taking 80 → **93**
`CODE VERIFIED` and 13 → **0** `NOT STARTED`. The 17 `BLOCKED` rows are
unchanged and NONE was promoted: every one of them needs a live server answer,
an exercised identity, a TEST fixture or real egress, and no mocked test may
satisfy any of them. M17-109 was already `CODE VERIFIED`; the stale SQL
headers it describes were corrected this round against the 2026-09-03
read-only production schema capture, with no SQL executed.

**Codex correction, 2026-09-12.** Four export rows were over-promoted from
pure helper tests: no function yet fetches the template, mutates a ZIP,
downloads the result, or actually executes the SheetJS fallback. M17-95,
M17-96, M17-98 and M17-99 are therefore `IN PROGRESS`, not fully CODE
VERIFIED. Codex also corrected the write payload types: `azp_save_card` reads
`p_card.id` (not `card_id`), manual rows carry `doc_num` and `note`, and a
correction patch carries `doc_num`.

**Export integration, 2026-09-12 (this round).** The four over-promoted export
rows were COMPLETED, not re-promoted on the same evidence. A real
client-side orchestrator (`web/src/lib/azpExportRun.ts`) now fetches the
template, loads it through JSZip, writes the patched worksheet back, removes
the other module's sheet from `workbook.xml`, `workbook.xml.rels` and
`[Content_Types].xml` along with its part, its rels and `xl/calcChain.xml`,
generates one blob and downloads it — and its catch branch actually executes
the SheetJS fallback writer. The page's `azp-exp-<m>` control is wired to it.
M17-95, M17-96, M17-98 and M17-99 are therefore `CODE VERIFIED`, taking
89 → **93** and 4 → **0** `IN PROGRESS`. The tally was DERIVED by
`node tools/ledger-check-m17.mjs`, which first FAILED against the stale banner
(89/4) and was corrected to the derived 93/0 — the checker caught it, no
figure was copied forward.

**M17-100 WAS NOT PROMOTED and remains `BLOCKED`.** Every fixture in both new
suites is hand-written, `fetch`, JSZip, SheetJS and the anchor download are
all injected doubles, and no real card or movement was exported. Synthetic
export tests are not authority for, and not evidence about, real egress.

**Scope note — SUPERSEDED 2026-09-12, retained as chronology.** Codex closed
this gap in its delivery correction: `jszip` is now a production dependency,
the resolver imports that package rather than `globalThis`, and
`web/public/azpetrol-template.xlsx` is published (21,427 bytes, SHA-256
matching the repository source). The designed template path is therefore
reachable in the shipped app. The paragraph below is what was true before that
correction.

**Scope note (recorded, not silently absorbed).** JSZip is NOT a package
dependency of `web/`; legacy loads it from a CDN `<script>`
(index.html:6) and tests `typeof JSZip === 'undefined'`. Adding a dependency
needs approval and was not in scope, so the orchestrator resolves JSZip from
`globalThis` exactly as legacy does. In the React app as it ships today that
global is absent and `web/public/` carries no `azpetrol-template.xlsx`, so a
real click would take the FALLBACK path — which is why that path is built and
tested as a real one rather than a theoretical one. Shipping the template
asset and the JSZip loader is a separate, approval-bearing step and is NOT
claimed here.

Derive these figures only with `node tools/ledger-check-m17.mjs`, which parses
the `| M17-* |` status cells below. Never copy a tally forward.

`BLOCKED` means the row needs authority Phase 17 does not hold — an `azp_*`
write, a TEST fixture that cannot be exactly restored, bulk egress, or an
identity that has not been exercised. `NOT STARTED` means the row is in scope
and simply not built yet.

**Evidence-level rule (protocol §7).** Every browser affordance row is
separate from its server counterpart. No client test may satisfy a server row,
and a hidden or disabled control is never recorded as a permission.

| Status | Rows |
|---|---|
| `CODE VERIFIED` | **85** |
| `NOT STARTED` | **0** |
| `LIVE VERIFIED` | **8** |
| `IN PROGRESS` | **0** |
| `BLOCKED` | **17** |
| unclassified | **0** |
| **total unique** | **110** |

## Access, route and shell

| ID | Surface | Exact contract | Evidence | Status |
|---|---|---|---|---|
| M17-01 | Rail | `azp` is the sole entry of its own «Yanacaq» group, after «Nəzarət və risklər» and before «Sistem» | `LIVE VERIFIED` — TEST admin saw the sole «Yanacaq» entry in that exact rail position; [audit](../audits/2026-09-12-phase17-admin-anbardar-readonly-live-check.md) | LIVE VERIFIED |
| M17-02 | Rail | The entry ships `style="display:none"` and is revealed at sign-in only when `azpCanRead()` | `LIVE VERIFIED` — present for TEST admin and absent for TEST anbardar in fresh authenticated sessions; [audit](../audits/2026-09-12-phase17-admin-anbardar-readonly-live-check.md) | LIVE VERIFIED |
| M17-03 | Rail | The entry carries NO `<b>` counter, and `counters()` never touches azp | index.html:268, counters() | CODE VERIFIED |
| M17-04 | Route | `go('azp')` refuses with the exact toast «Azpetrol / Araz moduluna girişiniz yoxdur» when `azpCanRead()` is false | AzpPage.test.tsx gate; App.nav.test.ts route branch | CODE VERIFIED |
| M17-05 | Route | `render()` dispatches `azp` through a `typeof rAzp === 'function'` guard | App.nav.test.ts — activePage dispatch | CODE VERIFIED |
| M17-06 | Shell | Band title «Azpetrol / Araz» and the subtitle replaced per board by `rAzp()` | `LIVE VERIFIED` — exact title and both Azpetrol/Araz subtitles observed under TEST admin; [audit](../audits/2026-09-12-phase17-admin-anbardar-readonly-live-check.md) | LIVE VERIFIED |
| M17-07 | Shell | Gate empty state is the exact «Giriş yoxdur» / Admin-Rəhbər-Mühasib string | `LIVE VERIFIED` — exact refusal rendered for TEST anbardar; [audit](../audits/2026-09-12-phase17-admin-anbardar-readonly-live-check.md) | LIVE VERIFIED |
| M17-08 | Shell | `#azp-gate` shown and `#azp-body` hidden when read access is absent, and inverted otherwise | `LIVE VERIFIED` — anbardar saw only the gate; admin saw the board and no gate; [audit](../audits/2026-09-12-phase17-admin-anbardar-readonly-live-check.md) | LIVE VERIFIED |
| M17-09 | Switch | Two buttons, `azpetrol` first and active by default; clicking sets `AZP.board` and re-renders | `LIVE VERIFIED` — Azpetrol was first/default; real Araz click replaced the board and subtitle; [audit](../audits/2026-09-12-phase17-admin-anbardar-readonly-live-check.md) | LIVE VERIFIED |
| M17-10 | Switch | Exactly one `.azp-board` carries `on`, matching the selected module | `LIVE VERIFIED` — one board only before and after the real switch; [audit](../audits/2026-09-12-phase17-admin-anbardar-readonly-live-check.md) | LIVE VERIFIED |

## Role model — affordance vs server

| ID | Surface | Exact contract | Evidence | Status |
|---|---|---|---|---|
| M17-11 | Affordance | `azpRole()` maps admin→admin, anbardar→none, rehber/muhasib/techizat/baxis→read, unknown→none | `azpRole` test | CODE VERIFIED |
| M17-12 | Affordance | `azpCanRead()` is true for admin and read, false for none | `azpRole` test | CODE VERIFIED |
| M17-13 | Affordance | `azpIsAdmin()` is true only for admin | `azpRole` test | CODE VERIFIED |
| M17-14 | Affordance | A null/absent `ME` yields `none` — fail-closed | `azpRole` test | CODE VERIFIED |
| M17-15 | Affordance | `azpSyncButtons()` hides only newcard, newmov and imp; export and report stay visible for read roles | azpRole test — governs exactly those three keys, never exp/rep; AzpPage.test.tsx — admin sees all three, rehber sees none, Hesabat stays | CODE VERIFIED |
| M17-16 | Affordance | `azpNeedAdmin()` toasts «Bu əməliyyat yalnız Admin üçündür» and returns false | azpRole test — exact string with the error flag, true for admin with no toast, refuses read/anbardar/null | CODE VERIFIED |
| M17-17 | Server | `azp_user_role()` is SECURITY DEFINER, reads `users` by `auth.uid()`, requires `active = TRUE`, defaults to `none` | sql/020 §1 — needs a live refused/allowed call | BLOCKED |
| M17-18 | Server | RLS grants SELECT only, to `authenticated`, gated on `azp_can_read()`, on all four tables | sql/020 §3, sql/022 — needs live evidence | BLOCKED |
| M17-19 | Server | `sql/021` revokes every table privilege and re-grants SELECT alone; no direct write policy exists | sql/021 — needs live evidence | BLOCKED |
| M17-20 | Server | An anbardar identity is refused every azp read | No anbardar azp session exercised | BLOCKED |
| M17-21 | Server | A rehber/muhasib identity reads and exports but every write RPC refuses | No such azp session exercised | BLOCKED |

## Load and snapshot

| ID | Surface | Exact contract | Evidence | Status |
|---|---|---|---|---|
| M17-22 | Reads | Exactly four reads, each `.eq('module', m)`: card balances, movements, audit log, application balance | azpSnapshot.api test — four reads, no ANBAR table | CODE VERIFIED |
| M17-23 | Reads | Cards order by `sort_order` then `card_no`; movements by `id` desc limit 5000; audit by `at` desc limit 300 | azpSnapshot.api test — order/limit per read | CODE VERIFIED |
| M17-24 | Reads | Any of the four erroring fails the whole load; `st.err` set, `st.ready` false | azpSnapshot.api + azp.store tests — each read varied independently | CODE VERIFIED |
| M17-25 | Reads | A missing application-balance row is NOT an error: `maybeSingle()` null yields balance 0 | azpSnapshot.api test — null row vs failed read | CODE VERIFIED |
| M17-26 | Reads | `st.loading` guard prevents a concurrent second load; `ready && !force` prevents a reload | azp.store test — both guards, per board | CODE VERIFIED |
| M17-27 | Reads | Load is triggered once from `rAzp()` and re-renders only if still on that board and page | AzpPage test — one initial read and a late previous-board reply cannot steal the active board; azp.store test — genuinely overlapping stale reply | CODE VERIFIED |
| M17-28 | Reads | Authenticated TEST page emits exactly those four reads and no ANBAR table read | Needs an exercised azp session | BLOCKED |
| M17-29 | Realtime | Legacy subscribes to NO azp table; the module refreshes only on force | subscribeRealtime has no azp entry | CODE VERIFIED |
| M17-30 | Isolation | No azp path reads or writes items, movements, partners, warehouses or ANBAR `audit_log` | index.html:8057-8064, sql/020 header | CODE VERIFIED |

## Pure calculations

| ID | Surface | Exact contract | Evidence | Status |
|---|---|---|---|---|
| M17-31 | Number | `azpN` returns 0 for NaN, Infinity, null, undefined and non-numeric strings | `azpNum` test | CODE VERIFIED |
| M17-32 | Number | `azpR2` rounds half-up at 2dp and is applied to every stored and displayed money figure | `azpNum` test | CODE VERIFIED |
| M17-33 | Money | `azpMoney` yields `—` for null and non-finite, else `nf(n,2) + ' ₼'`, including for negatives and 0 | `azpNum` test | CODE VERIFIED |
| M17-34 | Date | `azpDate` converts an Excel serial strictly inside 1..60000, rejecting both bounds' outside | `azpDate` test | CODE VERIFIED |
| M17-35 | Date | `azpDate` accepts an ISO prefix and `D.M.YYYY`/`DD.MM.YYYY` with `.`, `/` or `-`, zero-padding both parts | `azpDate` test | CODE VERIFIED |
| M17-36 | Date | Any unparseable value yields `''`, never a partial or guessed date | `azpDate` test | CODE VERIFIED |
| M17-37 | Filter | `azpInRange` includes BOTH bounds; a blank bound imposes no limit | `azpRange` test | CODE VERIFIED |
| M17-38 | Filter | With any bound set, an undated row is excluded; with no bound it passes | `azpRange` test | CODE VERIFIED |
| M17-39 | Filter | A timestamp value normalises to its date, so `2026-08-08T00:00+04:00` falls inside an `08-08` end bound | `azpRange` test | CODE VERIFIED |
| M17-40 | Filter | `azpUndatedHidden` counts rows excluded SOLELY for being undated, and is 0 when no bound is set | `azpRange` test | CODE VERIFIED |
| M17-41 | Filter | `azpFilterRows` drops any row whose `module` disagrees, before every other predicate | `azpFilter` test | CODE VERIFIED |
| M17-42 | Filter | `f.cards` (multi-select) takes precedence over `f.card` (single) | `azpFilter` test | CODE VERIFIED |
| M17-43 | Filter | The text query matches doc_num, note, card_no or holder, case-insensitively | `azpFilter` test | CODE VERIFIED |
| M17-44 | Filter | A row whose card is missing from the card map still matches on doc_num/note alone | `azpFilter` test | CODE VERIFIED |
| M17-45 | Totals | `azpTotals` excludes cancelled rows from medaxil, mexaric and net, and reports the cancelled count | `azpTotals` test | CODE VERIFIED |
| M17-46 | Totals | `net` is `R2(medaxil − mexaric)`, rounded once at the end | `azpTotals` test | CODE VERIFIED |
| M17-47 | Opening | `azpOpeningBalance` is 0 when no start date is given, whatever the rows | `azpOpening` test | CODE VERIFIED |
| M17-48 | Opening | It sums strictly BEFORE the start date, signs medaxil `+` and mexaric `−`, and skips cancelled, other-module and undated rows | `azpOpening` test | CODE VERIFIED |
| M17-49 | Labels | The six-key label table is exact for both modules, including Araz `vat: true` | `azpLabels` test | CODE VERIFIED |
| M17-50 | Labels | `azpKindLabel` yields «Mədaxil» for medaxil and the module's `out` otherwise | `azpLabels` test | CODE VERIFIED |
| M17-51 | Module | `azpMod` throws «AZP: yanlış modul: x» for anything outside the two names | `azpLabels` test | CODE VERIFIED |

## Report model

| ID | Surface | Exact contract | Evidence | Status |
|---|---|---|---|---|
| M17-52 | Report | With no card selection the report covers ACTIVE cards only; an explicit selection may include inactive ones | `azpReport` test | CODE VERIFIED |
| M17-53 | Report | Single mode keeps only the first selected card | AzpPage.test.tsx — single mode keeps the first card | CODE VERIFIED |
| M17-54 | Report | Per card: opening, medaxil, mexaric, closing = R2(opening + net), current = card balance | `azpReport` test | CODE VERIFIED |
| M17-55 | Report | Totals accumulate each field with R2 at every step, matching legacy's per-step rounding | `azpReport` test | CODE VERIFIED |
| M17-56 | Report | Screen and export consume ONE model, so an exported figure cannot differ from the displayed one | azpReportExport test — the exported matrix is the rendered model | CODE VERIFIED |
| M17-57 | Report | `azpPeriodText` yields «bütün dövr» with no bounds, else `d1 — d2` with `…` for a missing side | `azpReport` test | CODE VERIFIED |
| M17-58 | Report | Cancelled rows are listed but excluded from every total, and the count is stated | AzpPage.test.tsx — cancelled listed, excluded, counted | CODE VERIFIED |
| M17-59 | Report | `undatedHidden` is computed over the selected cards only | AzpPage.test.tsx — undatedHidden over selected cards | CODE VERIFIED |
| M17-60 | Export | The report matrix is the exact legacy row sequence for both single and group mode | `azpReportRows` test | CODE VERIFIED |
| M17-61 | Export | Cancelled rows carry the literal status `LƏĞV EDİLİB`, active ones `aktiv` | `azpReportRows` test | CODE VERIFIED |
| M17-62 | Export | Card numbers stay text so leading zeros survive | azpReportExport test — leading zeros survive as text | CODE VERIFIED |
| M17-63 | Export | The report uses its own plain writer rather than shared `xls()`, preserving the legacy absence of an autofilter and freeze pane | azpReportExport test — no autofilter/freeze/cols, with an xls() control | CODE VERIFIED |

## Screen rendering

| ID | Surface | Exact contract | Evidence | Status |
|---|---|---|---|---|
| M17-64 | KPI | Five KPIs in legacy order, plus a sixth «Mənfi balans» card only when a negative-balance card exists | AzpPage.test.tsx — five tiles plus the conditional sixth | CODE VERIFIED |
| M17-65 | KPI | KPIs aggregate ACTIVE cards only, while the subtitle names the full card count | AzpPage.test.tsx — active aggregate, full-count subtitle | CODE VERIFIED |
| M17-66 | KPI | The fourth KPI turns `al` only when some active card has a negative balance | AzpPage.test.tsx — the al severity only on a negative active card | CODE VERIFIED |
| M17-67 | KPI | The application-balance KPI carries an inline edit button for admin only | AzpPage.test.tsx — admin sees it inside the `.kpi.app` tile, rehber does not but still sees the balance figure | CODE VERIFIED |
| M17-68 | Cards | Column set and the `tfoot` totals row are exact, with `cardHead` per module | AzpPage.test.tsx — cardHead and tfoot totals | CODE VERIFIED |
| M17-69 | Cards | A negative card balance adds `neg`; status renders `aktiv`/`deaktiv` tags | AzpPage.test.tsx — the neg cell class and aktiv/deaktiv tags | CODE VERIFIED |
| M17-70 | Cards | Quick Mədaxil/out buttons appear only for an admin AND an active card; Tarixçə is always shown | AzpPage.test.tsx — admin+active shows both, read role shows neither, admin on a DEACTIVATED card shows neither but keeps Redaktə; Tarixçə present in all three | CODE VERIFIED |
| M17-71 | Movs | Undated-row exclusions are announced with the exact hint before the table | AzpPage.test.tsx — the exact undated hint; legacy source index.html:8382-8434 | CODE VERIFIED |
| M17-72 | Movs | Cancelled rows render at opacity .5 with a «ləğv edilib» tag and show `cancel_reason` when no note exists | AzpPage.test.tsx — cancelled row, tag and cancel_reason; legacy source index.html:8382-8434 | CODE VERIFIED |
| M17-73 | Movs | The first 1000 filtered rows render, with the exact overflow hint beyond that | AzpPage.test.tsx — 1000 rows and the overflow hint; legacy source index.html:8382-8434 | CODE VERIFIED |
| M17-74 | Movs | The footer shows the non-cancelled count and net, with medaxil/out split in the hint | AzpPage.test.tsx — footer count, net and split; legacy source index.html:8382-8434 | CODE VERIFIED |
| M17-75 | Log | The module's own audit list renders time, entity, translated action and JSON detail | AzpPage.test.tsx — time, entity, action, JSON detail; legacy source index.html:8436-8450 | CODE VERIFIED |
| M17-76 | Log | Unknown action codes fall back to the raw value | AzpPage.test.tsx — raw fallback for an unknown action; legacy source index.html:8436-8450 | CODE VERIFIED |
| M17-77 | History | Card history filters through the SAME `azpFilterRows`, sorted by date then id ascending | AzpPage.test.tsx — shared filter, date then id | CODE VERIFIED |
| M17-78 | History | It shows replacement linkage: «əvəz: #id» on a cancelled row and «düzəliş: #id» on a replacement | AzpPage.test.tsx — both linkage directions | CODE VERIFIED |
| M17-79 | States | Loading, module-unavailable and empty-card states are the exact legacy strings | AzpPage.test.tsx — loading/unavailable/empty strings | CODE VERIFIED |

## Writes — every row needs authority

| ID | Surface | Exact contract | Evidence | Status |
|---|---|---|---|---|
| M17-80 | Write | `azp_save_card` creates or updates and writes one `azp_audit_log` row | D-T1 undecided | BLOCKED |
| M17-81 | Write | `azp_delete_card` hard-DELETEs and refuses any card with movements | D-T3 undecided; irreversible | BLOCKED |
| M17-82 | Write | `azp_post_movements` is atomic for 1..5000 rows and refuses row 5001 | D-T1/D-T2 undecided | BLOCKED |
| M17-83 | Write | `app_balance_effect` is set only for a `medaxil` whose `p_source <> 'import'`, so an import never moves the fund | D-T1 undecided | BLOCKED |
| M17-84 | Write | An insufficient application balance refuses the whole batch with the exact message | D-T1 undecided | BLOCKED |
| M17-85 | Write | `azp_cancel_movement` restores the fund only when the original carried the effect | D-T1 undecided | BLOCKED |
| M17-86 | Write | `azp_correct_movement` cancels and replaces in one transaction, linked both ways, and refuses a `kind` change | D-T1 undecided | BLOCKED |
| M17-87 | Write | Correction checks sufficiency on the NET delta, so lowering a Mədaxil cannot fail for funds | D-T1 undecided | BLOCKED |
| M17-88 | Import | A single parse error blocks the entire import — no partial write | D-T4 undecided | BLOCKED |
| M17-89 | Import | Card creation is a per-card RPC loop that is NOT atomic with the movement post | D-T4 undecided; residual risk | BLOCKED |

## Import parser and export writer (pure)

| ID | Surface | Exact contract | Evidence | Status |
|---|---|---|---|---|
| M17-90 | Parse | The Azerbaijani lowercaser maps `İ`→`i` and `I`→`ı`, so `CƏMİ` matches the total pattern | azpImportParse test — with a plain toLowerCase() control proving the decomposed form does NOT match; synthetic fixtures | CODE VERIFIED |
| M17-91 | Parse | A block is `Mədaxil` + an out column; a balance column is optional | azpImportParse test — block without a balance column parses; a Mədaxil with no out column opens none and throws | CODE VERIFIED |
| M17-92 | Parse | Card number and holder are searched leftwards but never past the previous block's boundary | azpImportParse test — an empty template block is dropped silently, not credited with the neighbour's card; the same block WITH data errors | CODE VERIFIED |
| M17-93 | Parse | A running-sum subtotal is skipped only after ≥2 counted rows, so two equal consecutive amounts are not eaten | azpImportParse test — 200,200 keeps both; 100,50,150 skips the third; counters tracked per kind | CODE VERIFIED |
| M17-94 | Parse | A labelled total row is skipped outright and counted in `skippedTotals` | azpImportParse test — a CƏMİ row after a SINGLE movement is skipped without reaching the cnt>=2 heuristic; all five spellings | CODE VERIFIED |
| M17-95 | Export | Only `<cols>`, `<sheetData>`, `<mergeCells>` and `<dimension>` are patched; `styles.xml` and `theme1.xml` are untouched | azpExportRun test — the real orchestration fetches the template, loads the ZIP, writes the patched worksheet back and downloads one blob; `styles.xml`/`theme1.xml` asserted byte-identical and never written or removed; synthetic ZIP double | CODE VERIFIED |
| M17-96 | Export | The other module's sheet is removed from workbook.xml, rels and [Content_Types].xml, so no cross-module leak | azpExportRun test — both directions run through the real archive; the other sheet and its rels are removed and `xl/calcChain.xml` deleted, with a control proving the OWN sheet and the unrelated styles relationship survive, and a trimmed-trailing-space control proving the leak the exact name prevents | CODE VERIFIED |
| M17-97 | Export | `AZP_TPL.araz.otherName` is `'AZP kartların hesabatı '` WITH a trailing space, matching the real workbook | Template workbook.xml, verified | CODE VERIFIED |
| M17-98 | Export | Export applies NO filter — it is always the full non-cancelled card report | AzpExportButton test — with the board filtered to one card, one kind and a one-day window, the written worksheet still carries BOTH cards and every out-of-filter amount; a control proves that same filter really does narrow the on-screen table; a cancelled row is absent and a control proves the same row appears once un-cancelled | CODE VERIFIED |
| M17-99 | Export | A template failure falls back to a plain SheetJS sheet with an explicit "design not applied" toast | azpExportRun + AzpExportButton tests — three forced template failures each execute the real SheetJS writer (`book_append_sheet` + `writeFile`) with the SAME full dataset and emit the exact `Şablonsuz ixrac (dizayn tətbiq olunmadı): …` toast; when SheetJS is also absent the ORIGINAL error surfaces with no fallback prefix and no success claim | CODE VERIFIED |
| M17-100 | Egress | The template export egresses every card and non-cancelled movement of a module | D-T5 undecided | BLOCKED |

## Presentation

| ID | Surface | Exact contract | Evidence | Status |
|---|---|---|---|---|
| M17-101 | CSS | The legacy azp block is 27 rules scoped to `#p-azp` / `.azp-*`, touching no ANBAR `:root` variable | index.css — 27 rules ported; AzpPage.test.tsx #p-azp scope | CODE VERIFIED |
| M17-102 | CSS | `web/src/index.css` currently has ZERO azp rules; all of them must be ported | Measured: 0 matches | CODE VERIFIED |
| M17-103 | CSS | Base classes the module reuses already exist in React and must not be redefined | Measured per class | CODE VERIFIED |
| M17-104 | CSS | `.azp-table` is emitted twice but DEFINED NOWHERE in legacy; it must stay inert | index.html:8669, 8791; 0 definitions | CODE VERIFIED |
| M17-105 | CSS | `.kpi.app` is emitted but DEFINED NOWHERE in legacy; it must stay inert | index.html:8262; 0 definitions | CODE VERIFIED |
| M17-106 | CSS | azp KPI severities are `gd`/`wn`/`al`, distinct from ANBAR's `g`/`o`/`r`/`v`, and exist only under `#p-azp` | index.html:175-177 | CODE VERIFIED |
| M17-107 | Guard | `mutationGuard.ts` has NO `azp.*` action today; any write path must add one | Measured: 0 matches | CODE VERIFIED |
| M17-108 | Types | All four tables, the view and all nine RPCs are already in `types/database.ts`; no type addition is needed | types/database.ts | CODE VERIFIED |
| M17-109 | Schema | `sql/020` and `sql/021` carry stale `-- NOT APPLIED` headers although both are live | Production capture + CHANGELOG pattern | CODE VERIFIED |
| M17-110 | TEST restore | The restore scripts create the azp schema but contain no top-level azp data seed; current TEST row counts require a live read and are not inferred | `LIVE VERIFIED` — authenticated TEST admin rendered 0 cards, 0 movements and 0 module-audit rows on both boards; each application balance rendered 0.00 ₼. These are observed UI counts, not inferred restore-script counts; [audit](../audits/2026-09-12-phase17-admin-anbardar-readonly-live-check.md) | LIVE VERIFIED |
