# Phase 14 TEST-only implementation plan — Module P («Hesabatlar»)

Status: **IMPLEMENTED ON CLAUDE'S SIDE — 2026-09-11.** T1-T7 ran as one block.
**T8 did NOT run: no TEST identity was supplied**, so 0 Supabase contacts and
0 authenticated reads occurred.
**Tally, measured mechanically from the 99 `| M14-* |` status cells: 96
`CODE VERIFIED`, 0 `LIVE VERIFIED`, 0 `IN PROGRESS`, 3 `NOT STARTED`
(M14-10, M14-17, M14-99), 0 `BLOCKED`, 0 unclassified; 99 unique ids, 0
duplicates.**
Phase 14 remains `NOT ACCEPTED` pending Codex's independent audit.
[Implementation audit](../audits/2026-09-11-phase14-implementation.md).

**SUPERSEDED (HISTORY):** this status line originally read «DRAFTED —
implementation authorised …» with all 99 rows `NOT STARTED`. That was true
when written and is now false; the T1-T8 task text below is retained as the
executed plan of record.
[Proposal](../specs/2026-09-11-react-migration-phase14-reports-proposal.md) ·
[Ledger (99 rows)](../specs/2026-09-11-phase14-registry-rows.md) ·
[Design handoff audit](../audits/2026-09-11-phase14-design-handoff.md)

## Hard constraints for every task

TEST `alkjjbaawmsirsfvqljm` only; **never** contact production
`bbjmhaerssakbreykxiw`; sandbox mode; preserve the dirty tree; no stage,
commit, push or deploy; **no SQL change** (this page has no server contract of
its own); never store or print a credential. The localhost dev server is
started with `npm run dev -- --mode sandbox --host 127.0.0.1 --port 5175`; if
that port is taken, **inspect and reuse** the existing server after confirming
the TEST ref and `VITE_ALLOW_LOCAL_WRITES=false`, rather than killing an
unknown process.

**This phase opens NO write window.** It performs no write and issues no RPC,
so there is no D-N1/D-M2-style gate, no sequence advance, no `audit_log`
residual and nothing to clean up. Any task below that appears to need a write
is mis-specified and must be raised, not improvised.

## T0 — design closure

1. Owner instruction of 2026-09-11 resolves **D-P1**; D-P2, D-P3 and D-P4 are
   recommendations implemented as proposed, each with a pinning test, and are
   reported to the owner at the end rather than blocking a slice.
2. Confirm no other session is editing `App.tsx`, `index.css` or
   `App.nav.test.ts` / `App.test.tsx` — the shared files this phase touches.
3. Codex's independent audit of proposal, ledger and plan remains the
   acceptance gate and is NOT satisfied by this session.

No row is promoted by T0.

## T1 — aggregates (`lib/reportAggregates.ts`), tests first

The six `IX.*` aggregates React lacks — M14-18…M14-26. **The accepted
`buildItemIndexes()` is NOT touched** (M14-19): this is a separate module over
the same operational rows.

Falsifiable positive / negative / boundary cases per protocol §3, §4:

- The shared price rule (M14-20): movement price wins only when
  `!= null && > 0`; a **zero** and a **negative** movement price each fall back
  to the item card price; a missing item yields 0. Four cells, not one.
- **The three value asymmetries are the load-bearing test** (M14-21, M14-22,
  M14-23). One fixture row carrying BOTH `in` and `out` must produce a
  different `val` in `byPartner` (incoming only), `byType` (both directions)
  and `byDate` (incoming only). A fixture with only incoming makes all three
  agree and proves nothing — that fixture is explicitly rejected.
- `byPartner` key fallback to `'(göstərilməyib)'` for null/empty partner
  (M14-21), with a control row carrying a real partner.
- `byWh.val` arrives in the FINALISATION pass from balance values, not the
  movement pass (M14-24) — a warehouse with movements but zero balances has
  `n > 0` and `val === 0`.
- `positions` epsilon (M14-25): below, **exactly `1e-9`**, above, and the
  negative equivalent. Exactly 1e-9 is NOT a position.
- `dates` ascending by `dsort` (M14-26) with a **deliberately unsorted**
  fixture; an already-sorted fixture does not test sorting (§4).

## T2 — branch derivations (`lib/reports.ts`), tests first

The seven non-`dead` branches as pure functions returning `{rows, matrix, name}`.
Every export matrix is verified by **independently recomputing the expected
2-D array in the test**, never by snapshotting the implementation's output.

- `knt` — M14-27…M14-31. Sort by value descending with an opposing fixture;
  the missing-partner case yields EMPTY VÖEN/contract cells (M14-28); the Map
  optimisation (D-P4) is pinned as output-identical to a linear `find()`
  including that missing case (M14-29); top-12 cap tested with 13 partners
  (M14-30).
- `type` — M14-32…M14-35. **The bar denominator is the global operational
  count, not the branch sum** (M14-33): the fixture must make those two
  numbers differ, or the test is vacuous. Unmapped type → `t-mut` (M14-34).
- `wh` — M14-36…M14-42. Configured order preserved with a fixture whose
  alphabetical order differs (M14-36); a warehouse with no movements still
  renders (M14-38); `val` includes zero-quantity and negative rows (M14-37);
  `neg` is strict `q < 0` with **no** epsilon, contrasted against the
  `positions` epsilon in the same test file (M14-39); `in === 0` → «—», not
  «0.0%» (M14-40); export column set differs from screen (M14-41).
- `per` — M14-43…M14-47. **Month ordering is by ISO key, not by the `MM.YYYY`
  label** (M14-44): the fixture must span a year boundary (e.g. `2025-12`,
  `2026-01`) so label-sorting and key-sorting disagree. Export carries the
  FORMATTED label (M14-46).
- `abc` — M14-51…M14-59. Boundary matrix on both thresholds: cumulative share
  just below `.8`, **exactly `.8`**, just above; and the same at `.95`. The
  all-zero portfolio classes every row `A` via the `tot || 1` fallback
  (M14-53). **Screen 1dp cumulative vs export 2dp individual** (M14-57) needs
  a fixture where those two percentages differ for the same row. The stale
  «İlk 200 sətir» hint is asserted VERBATIM (M14-59).
- `tr` — M14-65…M14-73. Prefix match is case-sensitive (M14-66) — a fixture
  with «astara anbarı» is DROPPED while «Astara anbarına» resolves, which is
  also the M14-71 divergence test against `transferRoute()`; an unmatched
  partner is silently dropped with no placeholder row (M14-67); the two
  directions of one corridor are separate keys (M14-68); `(i || o)`
  fallthrough tested with `in === 0` (M14-69).
- Every branch's `REP_NAME` slug and exact header array (M14-31, M14-35,
  M14-42, M14-47, M14-58, M14-73).

## T3 — qaimə report (`lib/qaimeReport.ts`), tests first

- Grouping by **both** components (M14-74): two rows sharing `invoice_num` but
  differing `doc_num` must produce TWO groups, and the `doc_num || '—'`
  fallback is a third case.
- Empty/whitespace `invoice_num` skipped entirely (M14-75).
- Notes: de-duplicated, order-preserving, ` · ` joined, **no cap** (M14-76) —
  a long-note fixture asserts the full string survives.
- **Value branching** (M14-77): a «Silinmə» row takes `movementValuation`'s
  `final ?? 0` (including the null→0 case); every other type uses
  `(i+o) * (pr || 0)` with **no item-price fallback** — the fixture gives the
  item a price and asserts it is NOT used.
- Quantity is a SUM (M14-78), contrasted in the same file against `tr`'s `||`.
- Sort by `dMax` descending then `localeCompare(…, 'az')` (M14-80) with an
  opposing fixture; the az collation is asserted on a pair that orders
  differently under the default collation.
- Column model: eleven columns, seven on / four off, fixed order (M14-81,
  M14-82); two fixed leading columns (M14-83); numeric alignment by
  `/qty|val|lines/` (M14-84); set joins and the «—» vs empty-string screen/export
  split (M14-85).

## T4 — snapshot and store

`api/reportsSnapshot.api.ts` — M14-10…M14-16. Exactly four reads; atomicity
proved for BOTH failure shapes of every reader (returned error AND rejected
promise); a zero-row success is a valid snapshot (M14-13).

`store/reports.store.ts` — M14-14, M14-87. Stale-ticket guard so a slow
refresh cannot overwrite a newer one; a failed refresh retains the previous
snapshot whole; `QAIME_SEL` equivalent lives HERE, not in component state, so
the column choice survives navigation (D-P3).

## T5 — page, route, rail, CSS

`pages/ReportsPage.tsx` — the shell (M14-03, M14-04), the eight-option
selector (M14-05…M14-07), the two buttons (M14-08).

**The export/print equivalence (M14-95) is the slice's central risk.** The
current matrix and name are held in state and refreshed by the same render
that draws the table. Tests assert: switching report changes what Excel would
write; the print title is the SLUG not the label (M14-93); the count is
`Math.max(0, length - 1)` with an **empty-report case asserting «0 sətir»**
(M14-94); the exported matrix is UNCUT while the table is cut (M14-92).

`App.tsx` — additive route + rail entry (M14-01, M14-02), with a source-level
nav test and a runtime rail test asserting the entry is rendered for all three
roles with **no `isAdmin` anywhere around it**.

`index.css` — exactly three additive rules `.neg`, `.clk`, bare `.nm`
(M14-98), pinned by a stylesheet-text test in the established
`index.css.test.ts` style. `components/reports/Sparkline.tsx` — M14-48…M14-50,
including the single-point no-divide-by-zero case and the empty-set render.

`mutationGuard.ts` — **no entry** (M14-97), asserted by a test that no `rep.*`
action exists, so the absence is evidenced.

## T6 — `dead` reuse

M14-60…M14-64. The branch calls the accepted Phase 10 functions directly. The
tests assert REUSE (same module imported, identical output for a shared
fixture) — they do **not** re-verify Phase 10's own accepted derivation
contracts, which remain Phase 10 rows and must not be double-counted as new
Phase 14 evidence.

## T7 — offline gate

Focused tests per slice, then: full suite, `tsc -b --noEmit`, `oxlint src`,
sandbox build, `git diff --check`, staged-file count = 0, and the mechanical
M14 tally re-derived from the ledger's status cells.

## T8 — read-only TEST browser verification

The cheapest matrix that proves the read path, on the sandbox dev server
against TEST. **Read-only; no write window.**

- The page loads and the snapshot issues exactly the four expected reads and
  no RPC (M14-10) — observed by request interception, labelled browser
  evidence, never as `LIVE VERIFIED` of a server contract.
- All eight options render without error over live TEST data (M14-05).
- Realtime subscribes to the four tables (M14-17).
- Excel and print paths are exercised only far enough to confirm the state-held
  matrix tracks the selected report; **no file is claimed as persisted
  evidence**.

M14-99 (an anbardar's RLS-narrowed row set) requires comparing two identities.
A TEST admin identity remains unavailable (the M10-51 / M11-91 / M12-98 /
M13-93 boundary), so M14-99 stays unpromoted rather than claimed from one
role's session. This is a disclosed boundary, not a silent gap.
