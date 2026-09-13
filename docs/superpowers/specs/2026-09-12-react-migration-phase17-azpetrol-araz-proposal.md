# Phase 17 proposal — Azpetrol / Araz (legacy `rAzp()`)

**Status:** DESIGN. No Phase 17 write path is implemented or authorised. The
safe, decision-independent pure-logic slice is implemented; everything that
mutates `azp_*` data is BLOCKED on an explicit owner decision.

## 1. Scope

Port `rAzp()` (`index.html:8201-8228`) and the whole `azp*` block
(`index.html:8055-9758`, ~1,590 lines including the export/import writers),
plus its page markup (`index.html:479-563`), rail entry (`index.html:268`),
route gate (`index.html:1503`), render dispatch (`index.html:1517`), sign-in
visibility assignment (`index.html:7507`) and CSS block
(`index.html:158-201`).

The module is deliberately isolated from ANBAR. `index.html:8057-8072` states
the contract and `sql/020` enforces it: only `azp_*` tables and RPCs are used;
`items`, `movements`, `partners`, `warehouses` and ANBAR's `audit_log` are
never read or written. The single shared dependency is `public.users`, read
by `azp_user_role()` for the role, plus the browser helpers `esc/nf/toast/
modal/fmtD/today/debounce` and the Supabase client.

## 2. Two dashboards, never merged

`AZP_MODULES = ['azpetrol', 'araz']` (`index.html:8074`). `AZP.data.azpetrol`
and `AZP.data.araz` are separate objects; every function takes a mandatory `m`
and `azpMod(m)` throws on anything else. `azpFilterRows()` additionally drops
any row whose `module` disagrees (`8394`), so cross-module leakage is refused
twice — client and server (`p_module` on every RPC).

Label divergence (`index.html:8077-8082`) is the only substantive behavioural
difference between the two boards:

| Key | `azpetrol` | `araz` |
|---|---|---|
| `title` | Azpetrol | Araz |
| `out` | `Y/D` | `Məxaric` |
| `total` | `Kartların balansı` | `Kartların cari balansı` |
| `vat` | `false` | `true` |
| `cardHead` | `Sahib / Layihə` | `Obyekt / Kart seriyası` |
| `unit` | `₼` | `₼` |

`vat` drives three things: the ƏDV hint in the movement modal, the
`vat_included` value written with each row, and the `ƏDV daxil` KPI subtitle.
Araz additionally defaults the operation date to `today()` while Azpetrol
leaves it blank, because the Azpetrol source sheet has no date column
(`index.html:8553`, `sql/020` header).

## 3. Access contract — browser affordance vs server authority

Kept strictly separate, per reliability protocol §7 and the Phase 12/13
precedent.

**Browser affordance.** `azpRole()` (`8098-8104`) maps `admin`→`admin`,
`anbardar`→`none`, `rehber`/`muhasib`/`techizat`/`baxis`→`read`, everything
else→`none`. `azpCanRead()` hides the whole page behind `#azp-gate`;
`azpSyncButtons()` (`8232-8238`) hides only `newcard`, `newmov` and `imp`;
`azpNeedAdmin()` toasts and returns false. Note that `azp-exp` and `azp-rep`
are NOT hidden — read roles may export and report by design.

**Server authority.** `sql/020` defines `azp_user_role()` with the same table
but as `SECURITY DEFINER`, fail-closed on unknown role, inactive user or no
session. RLS grants `SELECT` only, to `authenticated`, gated on
`azp_can_read()`. `sql/021` revokes every table privilege and re-grants
`SELECT` alone, so there is **no direct write policy at all** — the "one door"
rule. Every write is a `SECURITY DEFINER` RPC that re-checks `azp_is_admin()`
first.

A hidden button is therefore never recorded as a permission. Each affordance
row in the ledger has a separate server row, and the server rows cannot be
satisfied by any client test.

## 4. Data model and reads

`azpLoad(m, force)` (`8171-8199`) issues exactly four reads in one
`Promise.all`, all filtered by `module`:

1. `azp_card_balances` — `select('*').eq('module',m).order('sort_order').order('card_no')`
2. `azp_movements` — `.order('id',{ascending:false}).limit(5000)`
3. `azp_audit_log` — `.order('at',{ascending:false}).limit(300)`
4. `azp_application_balances` — `.select('current_balance').maybeSingle()`

If any of the four returns an error the whole load fails and `st.err` is set;
`st.ready` stays false. A missing application-balance row is NOT an error —
`maybeSingle()` yields null and the balance silently becomes 0 (`8190`). The
guard `if (st.loading) return; if (st.ready && !force) return;` means the page
loads once and thereafter only on explicit `force`.

**There is no realtime subscription.** Legacy never adds `azp_*` to
`subscribeRealtime()`. Adding one would be an improvement, not parity, and is
raised as D-T6 rather than assumed.

`azp_card_balances` is a `security_invoker` view aggregating only
non-cancelled movements, with the module boundary repeated in the join
(`sql/020` §4).

## 5. Calculations

All pure and all reusable without any server contact:

- `azpN` / `azpR2` — non-finite→0, round to 2dp (`8118-8119`).
- `azpMoney` — `—` for null/non-finite, else `nf(n,2) + ' ₼'` (`8120`).
- `azpDate` — Excel serial (bounded 1..60000), ISO prefix, or `DD.MM.YYYY`;
  anything else → `''` (`8124-8138`).
- `azpInRange` — both bounds inclusive, undated rows excluded whenever any
  bound is set, no bounds → everything passes (`8155-8163`).
- `azpUndatedHidden` — how many rows are excluded *solely* for being undated,
  reported to the user rather than silently dropped (`8165-8168`).
- `azpFilterRows` — the single shared filter behind the register, card
  history, report and report export, so those four can never diverge
  (`8390-8407`).
- `azpTotals` — cancelled rows excluded from every total, everywhere
  (`8425-8431`).
- `azpOpeningBalance` — signed sum of non-cancelled rows strictly before the
  start date; no start date → 0 (`8412-8423`).
- `azpBuildReport` / `azpReportRows` — one model feeding both screen and
  export, so an exported figure cannot differ from the displayed one.
- `azpCardLists` / `azpRowPlan` — the export's block layout; Araz groups rows
  by shared date, Azpetrol lays out parallel lists.
- `azpParseSheet` — the import reader, including the Azerbaijani-aware
  lowercaser (JS `toLowerCase()` decomposes `İ`, so `CƏMİ` would not match a
  naive `/cəmi/i`), the running-sum subtotal heuristic (needs ≥2 prior rows so
  two equal consecutive amounts are not eaten) and the block-boundary guard
  that stops an empty template block stealing its neighbour's card number.

## 6. Writes — all admin-only, all through RPCs

| RPC | Effect | Reversible? |
|---|---|---|
| `azp_save_card` | insert or update a card; writes an `azp_audit_log` row | catalogue-reversible only if it has no movements |
| `azp_delete_card` | hard `DELETE`; refuses if any movement references the card | **irreversible**; audit row remains |
| `azp_post_movements` | inserts 1..5000 rows atomically; deducts the application balance for manual `medaxil`; one audit row | only by cancellation, which leaves both rows |
| `azp_cancel_movement` | soft-cancel, restores the application balance if the original had `app_balance_effect` | the cancelled row and audit row remain forever |
| `azp_correct_movement` | cancel + replacement in one transaction, linked by `replaces_id`/`replaced_by`; net application-balance delta | never net-zero: two movement rows and an audit row remain |
| `azp_set_application_balance` | sets the fund balance; audit row | prior value recoverable only from the audit detail |

`azp_post_movements` sets `app_balance_effect = (kind='medaxil' AND p_source
<> 'import')`, so an **import deliberately does not touch the application
balance** while a manual Mədaxil does — in both modules, including Araz. The
2026-08-08 handoff flags the Araz case as a known deviation from the original
task text and `023` deliberately preserves it.

**Nothing in this module is database-net-zero.** Even a "clean" create→delete
cycle leaves `azp_audit_log` rows and consumes `azp_movements_id_seq` /
`azp_audit_log_id_seq` values that never return.

## 7. Import and export

**Import** (`azpImportModal`, `9088-9196`) reads a workbook client-side, shows
a per-card preview with Excel-balance vs parsed-balance differences, blocks
entirely if any error is present (no partial import), then creates missing
cards one RPC at a time and posts all rows in one atomic `azp_post_movements`
with `p_source:'import'`. The card-creation loop is **not** atomic with the
post: if the post fails, cards already created remain.

**Export** has two writers that must not be conflated:

- `azpExport` (`9715-9756`) — the template-based writer. Fetches
  `azpetrol-template.xlsx`, patches only `<cols>`, `<sheetData>`,
  `<mergeCells>` and `<dimension>` inside one sheet via JSZip, drops the other
  module's sheet from `workbook.xml`/rels/`[Content_Types].xml`, and removes
  `calcChain.xml`. `styles.xml` and `theme1.xml` are untouched, so the design
  survives — SheetJS CE reads styles but cannot write them. Falls back to
  `azpBuildSheet` + plain SheetJS with an explicit "design not applied" toast.
- `azpReportExport` (`8915-8939`) — a separate, plain report writer that
  forces numeric-looking strings to text so leading zeros in card numbers
  survive.

Export applies **no filters**: it is the full card report, because filtered
block totals would disagree with the card balance.

I verified the template's real sheet names against the file itself:
`"AZP kartların hesabatı "` (with a trailing space) and `"ARAZ"`. The trailing
space in `AZP_TPL.araz.otherName` is therefore correct and load-bearing — a
"tidying" edit would silently break the sheet-drop and leak the other module's
data into the export.

## 8. Migration state and CSS

`web/src/types/database.ts` already carries all four `azp_*` tables, the
`azp_card_balances` view, the `replaces_id`/`replaced_by`/`app_balance_effect`
columns and all nine RPCs, so **no type addition is needed**.

`web/src/index.css` contains **zero** `azp` rules. The legacy block
(`index.html:158-201`) is 27 rules: the `#p-azp` custom-property scope, ten
`#p-azp`-scoped overrides, the `.azp-band`, `.azp-switch` and `.azp-board`
component rules, and two rail rules. Base classes the module reuses
(`.card`, `.kpis`, `.kpi`, `.tag`, `.filters`, `.tw`, `.pill-row`, `.seg`,
`.empty`, `.hint`, `.num`, `.code`, `.neg`, `.muted`, `.eyebrow`, `.btn.sm`,
`.btn.dgr`, `.f`, `.row`) are already present.

Two classes the module emits are **undefined in legacy itself**, in both
copies of `index.html`: `.azp-table` (used at `8669` and `8791`) and
`.kpi.app` (emitted at `8262`). They are inert in legacy and must stay inert —
inventing rules for them would be a visual change, not parity. Recorded as
M17-96 and M17-97.

Legacy's azp KPI severity classes are `gd`/`wn`/`al`, which are distinct from
ANBAR's `g`/`o`/`r`/`v` and exist only under `#p-azp`.

## 9. Source-of-truth note

`platform/index.html` and `anbar-platformasi-github/index.html` differ in
exactly one place — a `manage_reference` id cast at line 3166 — and **no azp
line differs**. Line citations in this package are against
`anbar-platformasi-github/index.html` and hold for both copies.

## 10. Applied-status correction

`sql/020` and `sql/021` still carry `-- NOT APPLIED` headers. That is stale.
Primary evidence that both are live:

- `docs/superpowers/test-environment/production-schema-2026-09-03.json`
  contains every `azp_*` table, index, check constraint, RLS policy and the
  view;
- `production-functions-2026-09-03.json` contains all nine `azp_*` functions;
- `sql/023` (header corrected to APPLIED on 2026-08-23) declares 020/021/022
  as prerequisites and was confirmed live byte-for-byte;
- `docs/CHANGELOG.md` records the identical stale-header pattern for
  `015`/`017`/`018`/`023`/`025`/`026`/`027`/`028`.

This is a documentation defect, not a schema defect. Correcting those two
headers is a file edit outside the approved Phase 17 scope, so it is raised as
D-T7 rather than done silently.

## 11. TEST environment reality

`web/.env.sandbox.local` targets TEST `alkjjbaawmsirsfvqljm` with
`VITE_ALLOW_LOCAL_WRITES=false` and `VITE_TEST_ENVIRONMENT=true`. The launcher
`scripts/start-test-environment.ps1` refuses any other URL **and** refuses to
start unless writes are explicitly enabled — so with the current file it does
not start at all, which is the correct default.

The TEST restore scripts create the azp schema (129 `azp_` references each)
but contain **no data section at all** — zero top-level `COPY`, and every
`INSERT INTO public.azp_*` occurrence sits inside a function body. This proves
only what a fresh restore seeds. It does **not** prove the current TEST row
counts; those require an authenticated live read.

Consequence for acceptance: first measure the current TEST contents. If the
four module reads are empty, they evidence only the empty/gate branches; if
rows already exist, reuse them read-only before proposing a fixture. A new
fixture is a write, and a card that has received any movement can never be deleted
(`azp_delete_card` refuses), so an azp fixture is **not exactly restorable**.
That is D-T2 and D-T3.

`mutationGuard.ts` currently has **no `azp.*` action**, so the whole azp write
family sits outside the localhost write guard. Any future write path must add
one; that is part of D-T2 rather than an incidental edit.

## 12. What Phase 17 implements now

Only decision-independent, unambiguous pure logic with no server contact:
the money/number/date normalisers, the shared row filter, the inclusive date
range and undated-row counter, the totals rule, the opening balance, the
report model, the report export matrix, the label table and the role mapping
(named explicitly as a browser affordance).

Not implemented: the page, route, rail entry, read-only store/API, every write
path, import, template export and CSS port. The page/read-only slice and the
separate plain report writer are decision-independent and may proceed now;
realtime, writes, import and bulk egress retain their named decision gates.

## 13. Owner decisions

- **D-T1** — write containment: may Phase 17 implement any `azp_*` write path
  at all, or is the phase read/pure-only until a separate window?
- **D-T2** — TEST fixture: may cards and movements be created in TEST to
  produce non-empty evidence, accepting permanent sequence and audit
  residuals and a card that can never be deleted once it has a movement?
- **D-T3** — destructive cleanup: `azp_delete_card` is a hard DELETE. Is it in
  scope at all?
- **D-T4** — import: the Excel import writes stock-equivalent financial rows
  and its card-creation loop is not atomic with the post. Defer to its own
  phase?
- **D-T5** — bulk export: the template export egresses every card and every
  non-cancelled movement of a module. Client-only download acceptable?
- **D-T6** — realtime: legacy has none. Add a subscription (improvement) or
  preserve the manual-refresh behaviour (parity)?
- **D-T7** — may the stale `-- NOT APPLIED` headers in `sql/020` and `sql/021`
  be corrected in place, as was done for the other five migrations?
- **D-T8** — keep the additive Phase 17 checker separate for now, or refactor
  the Phase 9 checker and its accepted fixtures into a shared parameterised
  checker? Recommendation: keep them separate during this phase.

Each carries a recommendation in the plan. None is silently assumed.

## 14. Acceptance boundary

Offline unit evidence can establish every pure calculation, the label table
and the affordance mapping. It can establish **nothing** about RLS, RPC
refusal, the application-balance accounting or the real workbook. Phase 17
cannot become ACCEPTED without an independent Codex audit, and no row may be
promoted past `CODE VERIFIED` without the exact evidence its ledger row names.
