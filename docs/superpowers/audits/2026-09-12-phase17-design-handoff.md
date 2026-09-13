# Phase 17 design handoff audit — Azpetrol / Araz (`rAzp()`)

Date: 2026-09-12 · Author: Claude · For independent Codex audit
**Phase 17 is NOT ACCEPTED.**

## 1. What this round did

Produced the complete Phase 17 design package and implemented ONLY the
decision-independent, server-free pure-logic slice.

Design: [proposal](../specs/2026-09-12-react-migration-phase17-azpetrol-araz-proposal.md),
[110-row ledger](../specs/2026-09-12-phase17-registry-rows.md),
[TEST-only plan](../plans/2026-09-12-react-migration-phase17-azpetrol-araz.md),
this audit.

Code: six `lib/azp*.ts` modules and six test files. No page, route, rail entry,
store, API module, CSS rule, write path, import or export writer was built.
**No Supabase project was contacted — 0 reads, 0 writes, 0 RPCs.**

## 2. Ledger tally — measured, not asserted

**110 unique rows, 0 duplicates: 44 `CODE VERIFIED`, 0 `LIVE VERIFIED`,
0 `IN PROGRESS`, 49 `NOT STARTED`, 17 `BLOCKED`, 0 unclassified; uniform 5
cells per row; ids contiguous M17-01…M17-110.**

Derived by `tools/ledger-check-m17.mjs` and independently reproduced by a
separately written `awk` pass that agreed on every figure.

**Correction recorded rather than overwritten (§10/§12).** The first draft of
the banner and tally table asserted **24 / 53 / 12 / 89** from an uncounted
construction estimate. HISTORY: the first mechanical parse returned
**44 / 48 / 18 / 110**. Codex later corrected M17-63's classification, so
the current parse is **44 / 49 / 17 / 110**.
All figures were corrected before any downstream document cited them. This is
the **fourth** occurrence of this defect class — Phase 12 (58→70), Phase 13
(86→77), Phase 14 (96→99), now Phase 17 (89→110). The pattern is now
predictable enough that the count should be taken from the parser *before* the
banner is written, not after.

## 3. Findings from primary sources

**The applied-status contradiction is resolved.** `sql/020` and `sql/021`
still carry `-- NOT APPLIED` headers, but both are provably live: the
production schema capture contains every `azp_*` table, index, check
constraint, policy and the view; the function capture contains all nine
`azp_*` functions; `sql/023` (corrected to APPLIED on 2026-08-23) declares
020/021/022 as prerequisites and was confirmed live byte-for-byte; and
`CHANGELOG.md` records the identical stale-header pattern for five other
migrations. These are **documentation defects, not schema defects** (M17-109).
Correcting them is D-T7, not a silent edit.

**CORRECTION — restore contents are not current TEST contents** (M17-110).
Both restore scripts carry 129 `azp_` references but no top-level data seed.
That proves a fresh restore's seed behaviour only. The earlier claim that
current TEST has zero rows was unsupported and is withdrawn; current row
counts require an authenticated live read before deciding whether a fixture
is needed.

**M17-63 was misclassified.** Shared `xls()` would add an autofilter/freeze
pane absent from legacy, but no owner decision is needed to avoid that drift:
legacy already specifies a separate plain report writer. M17-63 is therefore
NOT STARTED, not BLOCKED.

**An azp fixture is not exactly restorable.** `azp_delete_card` refuses any
card that has received a movement, and movements are never deleted, only
soft-cancelled. So a fixture leaves a permanent card, permanent movement rows,
consumed `azp_movements_id_seq` / `azp_audit_log_id_seq` values and permanent
`azp_audit_log` rows. **Nothing in this module is database-net-zero.** That is
D-T2, and it must be accepted explicitly or not at all.

**`mutationGuard.ts` has no `azp.*` action** (M17-107), so the entire azp write
family currently sits outside the localhost write guard. Any future write path
must add one; that belongs to D-T1/D-T2 rather than being an incidental edit.

**The template's trailing space is load-bearing** (M17-97). Sheet 1 of
`azpetrol-template.xlsx` is genuinely named `"AZP kartların hesabatı "` with a
trailing space, which `AZP_TPL.araz.otherName` matches exactly. "Tidying" it
would make `azpDropSheet`'s regex miss, leaving the other module's sheet in the
workbook — a cross-module data leak in an export whose whole point is module
separation.

**Two classes are emitted but undefined in legacy itself** — `.azp-table`
(twice) and `.kpi.app` — in BOTH copies of `index.html`. They are inert today
and must stay inert (M17-104, M17-105). Inventing rules would be a visual
change, not parity.

**Legacy subscribes to no azp table** (M17-29): `subscribeRealtime()` covers
exactly `movements`, `items`, `partners`, `warehouses`. Adding an azp channel
is an improvement, not parity — raised as D-T6.

**Source-of-truth check.** `platform/index.html` and
`anbar-platformasi-github/index.html` differ in exactly one place (a
`manage_reference` id cast at line 3166) and **no azp line differs**, so every
citation in this package holds for both copies.

## 4. Implementation defects found and corrected

Two, both mine, both the same root cause the Phase 14 audit named: **an
expected value derived by assumption instead of from execution.** Neither was
an implementation defect — the implementation matched legacy in both cases and
was not changed.

1. `azpDate(46000)` was asserted as `2025-12-17` from mental arithmetic; the
   real value is `2025-12-09`. Corrected, and the new expectations were derived
   from the serial epoch in both directions — forward from 1899-12-30, and
   backward as `(2025-12-09 − 1899-12-30) = 46000` days exactly. The boundary
   case now asserts its real converted value (`60000 → 2064-04-08`) instead of
   merely "not empty", so it can no longer pass vacuously.
2. `azpR2(-0.004)` was asserted with `toBe(0)`, which fails because the value
   is negative zero and `toBe` is `Object.is`. Corrected to assert `-0`
   deliberately, with a positive-side control — the same fact the neighbouring
   `-0.005` case pins.

## 5. Falsifiability evidence

Eight defective alternatives were implemented in a throwaway scratchpad script
and shown to disagree with the values the tests assert. **No source file was
mutated** (§9). Every probe differed:

| Defective alternative | Produces | Tests assert |
|---|---|---|
| exclusive lower bound | `false` | `true` |
| exclusive upper bound | `false` | `true` |
| raw string date compare | `false` | `true` |
| undated rows admitted under a bound | `true` | `false` |
| module predicate applied last | 2 rows | 1 row |
| cancelled rows included in totals | 1099 | 100 |
| opening balance inclusive of the start day | 60 | 100 |
| `azpMoney` reusing shared `money()` | `—` | `0,00 ₼` |

The last one matters beyond style: legacy's `azpMoney` renders exactly zero as
`0,00 ₼`, while the shared `money()` renders an em-dash. A card with no
movements must show a real zero balance. Reusing `money()` would have been the
"obvious" simplification and is blocked by a failing test.

## 6. Evidence level — stated exactly

Everything promoted this round is **`CODE VERIFIED`: unit/static evidence
only.** Nothing is browser-harness, persisted-TEST, server/RLS or
`LIVE VERIFIED`.

Specifically, `azpRole`/`azpCanRead`/`azpIsAdmin` are **browser affordances**
and are documented as such in the source file itself. They prove nothing about
what the server permits. The server contract — `azp_user_role()`,
`azp_is_admin()`, `azp_can_read()`, the RLS SELECT policies and the sql/021
privilege lockdown — is rows M17-17…M17-21, all `BLOCKED`, and **no assertion
in this round can satisfy them.**

## 7. Gate

Measured baseline before any Phase 17 file existed: **190 files / 3986 tests.**

| Check | Result |
|---|---|
| focused azp tests | 6 files / **93 passed** |
| full suite | **196 files / 4079 passed** (exactly +6 / +93) |
| `tsc -b --noEmit` | exit 0 |
| `oxlint src` | 4 warnings — the pre-existing Fast Refresh ones, none from new files |
| `vite build --mode sandbox` | clean (chunk-size advisory pre-existing) |
| `git diff --check` | exit 0 |
| `ledger-check-m17.mjs` | PASS; `--self-test` 9/9 |
| `ledger-check.mjs` (Phase 9) | PASS; `--self-test` 27/27 — unchanged by Phase 17 |
| staged files | 0 |
| branch | `react-migration`, dirty tree preserved |

**Files: 17 created, 0 modified** (the four design documents, this audit, the
M17 checker, and six libs with six tests). An earlier draft of this line said
16, counted before this audit file itself existed; corrected by re-measuring
rather than left stale. `tools/ledger-check.mjs` shows as modified
in the working tree, but that change predates this session — mtime 2026-09-11,
a two-line T3→T10 audit-path swap from the Phase 9 round, containing zero
azp/M17 content. It was not touched here.

Structural proof of no server contact: the six new libs import only `format`
and each other. Zero `supabase` or `api/` imports, so no read is reachable
from this slice even by mistake.

## 8. Why a second ledger checker exists

`tools/ledger-check.mjs` is hard-wired to Phase 9 in five places — ledger path,
`EXPECTED_TOTAL`, the `/^\|\s*M9-/` row regex, the M9 range regex and the
`phase9` summary scope — and carries 27 fixtures pinning them. Parameterising
an accepted tool would change Phase 9's evidence base, which is outside the
approved Phase 17 scope. `tools/ledger-check-m17.mjs` is therefore additive,
derives every total from the ledger rows and **hardcodes no count** (§18). Its
10 fixtures include the §17 mixed-wording case, a duplicate id, a missing id
in the claimed contiguous sequence, an unclassified cell, an omitted tally
category, a stale banner and a stale tally figure.
Unifying the two checkers is raised as D-T8 rather than done unilaterally.

## 9. Owner decisions still required

**D-T1** write containment · **D-T2** TEST fixture with permanent residuals ·
**D-T3** destructive `azp_delete_card` · **D-T4** import · **D-T5** bulk
export egress · **D-T6** realtime · **D-T7** stale SQL headers · **D-T8**
ledger tooling. Each carries a recommendation in the plan; none is assumed.

Until D-T1…D-T4 are decided, **no Phase 17 write path may be implemented or
invoked.**

## 10. Verdict

The design package is internally consistent and the safe slice is implemented
and gated. **Phase 17 remains NOT ACCEPTED** pending independent Codex audit.
No production contact, no TEST mutation, no stage, commit, push or deploy
occurred, and the dirty working tree is preserved.
