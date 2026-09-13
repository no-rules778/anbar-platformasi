# Phase 17 implementation audit — read-only Azpetrol / Araz slice

Date: 2026-09-12 · Author: Claude · For independent Codex audit
**Phase 17 remains NOT ACCEPTED.**

> **CODEX CORRECTION — 2026-09-12.** The original implementation copied the
> Phase 9 failed-refresh retention policy into `azp.store`, but legacy
> `azpLoad()` sets `ready = false` on every failure (`index.html:8192-8195`).
> That claim and implementation are superseded. The store now retains old
> arrays only in memory while setting `ready = false`, so the exact
> module-unavailable state replaces them. Codex also added the missing live
> component assertion for `Yüklənir…`, replaced a sequential "stale reply"
> test with a genuinely overlapping pair, proved that a late previous-board
> reply cannot steal the active board, and corrected M17-71…M17-76 citations.
> See `2026-09-12-phase17-readonly-codex-audit.md`.

## 1. What this round did

Implemented the decision-independent read-only slice on top of the six
accepted `lib/azp*.ts` pure modules, which were **not** rewritten.

Built: the four-read snapshot API, the two-board store, the page/route/rail
with the 27 CSS rules, and the separate plain report writer required by
M17-63. Not built and not invoked: every write RPC, the TEST fixture,
`azp_delete_card`, the import, the full template export, realtime, and the
SQL-header edits — D-T1…D-T7 all stand.

**No Supabase project was contacted: 0 reads, 0 writes, 0 RPCs.** The API
module's suite mocks the client entirely.

## 2. Files

Created (8): `api/azpSnapshot.api.ts` (129) + test (241);
`store/azp.store.ts` (159) + test (208); `lib/azpReportExport.ts` (99) +
test (177); `pages/AzpPage.tsx` (945) + test (527).

Modified (4): `App.tsx` (route, «Yanacaq» group, gated entry);
`App.test.tsx` (extended the exhaustive rail fixture; added three runtime
role-gate tests); `App.nav.test.ts` (appended the M17 wiring block);
`index.css` (+27 azp rules).

Ledger and this audit. Nothing else was touched. The three untracked
`index.css.{dashboard,reports,serfiyyat}.test.ts` files predate this session
and are not mine.

## 3. Contracts promoted — 36 rows, `NOT STARTED` → `CODE VERIFIED`

M17-01, 02, 04-10 (rail, route, shell, gate, switch), 22-27 (the four reads
and both load guards), 53, 56, 58, 59 (report), 62, 63 (the separate writer),
64-66, 68, 69, 71-79 (screen rendering), 101 (the CSS port).

Tally moves 44 → **80 CODE VERIFIED**, 49 → **13 NOT STARTED**, 17 BLOCKED
unchanged, 110 unique. Derived by the checker, not copied.

**Rows deliberately NOT promoted although adjacent work shipped** — each
names a contract this slice does not satisfy:

- **M17-15** — `azpSyncButtons()` hides newcard/newmov/imp while export and
  report stay visible. Those three controls are ABSENT for every role here,
  so the "hides only these three" half is unexercised. Only the read-role
  report visibility is evidenced, which is not the row.
- **M17-16** — `azpNeedAdmin()`'s toast. Not implemented.
- **M17-67** — the application-balance KPI's inline edit button is a write
  path (D-T1) and was omitted, so the row's contract is unmet.
- **M17-70** — quick Mədaxil/out buttons are writes and were omitted; only
  the «Tarixçə» half ships.

M17-17…M17-21 (server), M17-28 (needs a live session), M17-80…M17-89
(writes/import), M17-90…M17-94 (import parser), M17-95/96/98/99/100
(template export) stay BLOCKED or NOT STARTED. **No client test in this round
can satisfy a server row.**

## 4. Defects found, each caught by execution

Four, all in code I wrote this round, all found by a failing check rather
than by review. Two are the defect class the Phase 14 and 17 design audits
named: **an expected value derived by assumption instead of from execution.**

1. **The positive control failed loudly** (`azpReportExport.test.ts`). The
   control that proves the three absence-assertions are not vacuous called
   shared `xls()`, which needs `XLSX.utils.encode_range`; my mock omitted it.
   Failing before: `TypeError: utils.encode_range is not a function`. Fixed
   in the MOCK, not the source — the control now really does exercise
   `xls()` and shows it setting `!autofilter`, `!freeze` and `!cols` where
   the azp writer sets none.
2. **A misread KPI contract** (`AzpPage.test.tsx`). I asserted the first
   tile's subtitle reads «1 kartdan» for one active card of two. Legacy
   (index.html:8258) is `['Aktiv kart', nf(act.length), st.cards.length + '
   kartdan']` — the VALUE is the active count, the SUBTITLE is the FULL
   count, so the real value is «2 kartdan». The page was already correct;
   the test encoded my misreading. Corrected against the source.
3. **A guessed thousands separator.** The 1000-row overflow hint asserted
   `1[ ]?001`. az-AZ renders `nf(1001)` as **`1.001`**, measured by probe.
   The assertion now derives the string from `nf()` itself, so neither a
   guess nor a locale change can produce a false pass.
4. **Two unscoped queries.** `-5,00 ₼` and `0012` each matched twice — the
   tfoot total and the second board's table. Scoped to the row and to the
   Azpetrol board respectively.

5. **Ledger corruption the checker cannot see.** The promotion was scripted,
   and bash expanded three backtick sequences inside the evidence text I was
   writing (`` `on` ``, `` `al` ``, `` `neg` ``) as command substitutions —
   visible only as three "command not found" lines. M17-10, M17-66 and M17-69
   were written with those words missing from their evidence cells. **The
   checker still passed**, because it validates row count, contiguity, cell
   shape and the three-way banner/tally/row agreement — not evidence prose.
   Found by reading the rows back rather than by trusting the PASS, and
   repaired. This bounds what a green checker certifies: structure and
   totals, never the truth of an evidence claim.

Also corrected during implementation, before any test existed: hand-written
row interfaces that disagreed with the generated schema in eight places (now
derived from `Database`), a conditional-type cast that defeated type checking
rather than resolving it (deleted — the view row satisfies
`AzpReportCardInput` structurally), a `useMemo` whose dependency changed every
render, and a `Map` keyed on a nullable column.

## 5. A ledger-citation defect worth recording

The ledger's line citations for the register and log rows are approximately
ten lines off: M17-71…M17-74 cite 8443-8485 and M17-75/76 cite 8494-8505, but
the real `azpRenderMovs` is **8382-8434** and `azpRenderLog` **8436-8450**. I
first read the cited range, landed inside `azpAppBalanceModal`, and would have
ported the wrong contract had I trusted the citation. Caught by re-reading
primary source. The citations should be corrected, but that is a ledger edit
beyond this slice's approved scope.

## 6. Evidence level — stated exactly

Everything promoted is **`CODE VERIFIED`: unit/component/static evidence
only.** Nothing is browser-harness, persisted-TEST, server/RLS or
`LIVE VERIFIED`.

The role assertions are **browser affordances**. `App.test.tsx` proves an
anbardar's rail entry is absent and a rehber's is present; that says nothing
about what the server permits. `azp_user_role()`, `azp_can_read()`, the RLS
SELECT policies and the sql/021 lockdown remain M17-17…M17-21, BLOCKED.

## 7. TEST measurement — NOT PERFORMED, and why

**No live row counts were measured. M17-110 is unchanged.**

The prompt authorised a read-only sweep *if* an authenticated TEST
read-capable identity were available as a process-only variable. None is.
`web/.env.sandbox.local` carries a URL and an **anon key**, and no
`AZP|ANBAR|TEST|SUPABASE|VITE` process variable is set. An anon key is not an
identity: `azp_user_role()` reads `users` by `auth.uid()` and is fail-closed
with no session, so an anon sweep would measure a refusal, not row counts —
and reporting a refusal as a count would be the exact M17-110 defect the
design audit corrected.

No fixture was created to manufacture a number. Every offline item was
completed regardless, as instructed.

## 8. Gate — measured at final state

Baseline measured before any change this round: **196 files / 4079 tests**,
tsc exit 0, oxlint 4 warnings, `git diff --check` exit 0, 0 staged.

| Check | Result |
|---|---|
| focused Phase 17 suites (10 files) | **187 passed** |
| `App.test.tsx` | **67 passed** |
| `App.nav.test.ts` | **43 passed** |
| full suite | **200 files / 4183 passed** (+4 files / +104 tests) |
| `tsc -b --noEmit` | exit 0 |
| `oxlint src` | 4 warnings — the pre-existing Fast Refresh ones, **none from new files** |
| `vite build --mode sandbox` | clean (chunk-size advisory pre-existing) |
| `git diff --check` | exit 0 |
| `ledger-check-m17.mjs` | PASS; `--self-test` **10/10** |
| `ledger-check.mjs` (Phase 9) | PASS, 124 rows; `--self-test` **27/27** |
| staged files | **0** |
| branch | `react-migration`, dirty tree preserved |

One full-suite failure occurred and was resolved: `App.test.tsx`'s exhaustive
rail fixture enumerates every label between «Bazalar» and «Sistem», so a real
new entry necessarily extends it — the same extension its own M13-01 and
M14-01 comments record. The ten prior labels kept their order and position.

## 9. Boundaries still standing

**D-T1** writes · **D-T2** TEST fixture · **D-T3** `azp_delete_card` ·
**D-T4** import · **D-T5** bulk template export · **D-T6** realtime (T1B —
kept separate and absent, so it never blocked T1A) · **D-T7** stale SQL
headers. **D-T8** unchanged: the M17 checker stays additive and the accepted
Phase 9 checker was not refactored.

`mutationGuard.ts` still has **no `azp.*` action** (M17-107 holds), which is
correct while no write path exists.

## 10. Verdict

The read-only slice is implemented, gated and promoted to `CODE VERIFIED`
only. **Phase 17 remains NOT ACCEPTED** pending independent Codex audit. No
production contact, no TEST mutation, no fixture, no stage, commit, push or
deploy occurred, and the dirty working tree is preserved.
