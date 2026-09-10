# Phase 9 independent Codex design audit

Date: 2026-09-10  
Scope: research/proposal/plan/ledger only; no implementation and no database mutation  
Result: **DESIGN NOT APPROVED — corrections required before implementation**

## Sources checked independently

- `index.html`: `operationalMovements()`, `index()`, balance filters and both
  balance views, condition reads/writes, export, realtime, and the shared
  `rAnb()` consumer.
- `web/src`: the current item index, condition read, movement read and every
  consumer of `WarehouseBalance`.
- 2026-09-03 schema/function captures, including `stock_conditions`,
  `set_stock_condition`, `stock_condition_balance` and
  `cancel_legacy_movement`.
- the Phase 9 proposal, 112-row ledger and implementation plan.
- the accepted print decision and Phase 7/8 evidence relevant to cancellation
  and initial-balance handling.

`skills/MAIN.md`, required by `AGENTS.md`, is absent from this workspace. The
permanent migration principles were therefore used as the project fallback.

The current TEST contract was not independently re-read live: the process has
no `ANBAR_TEST_PASSWORD`, and attaching to the already-open localhost browser
tab timed out before a usable session was obtained. Capture-time server facts
must therefore be re-confirmed read-only before implementation.

## Blocking finding — Q3 is not proved and its example is false

The two functions do read different row sets:

- `stock_condition_balance()` sums all physical `movements` rows;
- the screen derives `IX.bal` from `operationalMovements()`.

But a different set does not imply a different numeric balance. The proposal's
row-level-cancellation example is mathematically wrong. The captured
`cancel_legacy_movement` function inserts the exact inverse of the source row:
`in_qty := original.out_qty`, `out_qty := original.in_qty`. The raw pair sums
to zero; `operationalMovements()` removes both rows, which also sums to zero.
Supported whole-document and transfer reversals preserve the same net-zero
invariant.

Therefore no owner decision between two proven balances is required yet.
Unequal results are possible only for malformed, missing or unequal historical
counter-rows, and the proposal supplies no evidence that such data exists.
Correct Q3/M9-141 to require:

1. a read-only raw-versus-operational comparison on current TEST data;
2. invariant tests for every supported cancellation family;
3. a narrowly worded corrupt-history policy only if a real unequal pair is
   found.

The proposal also points to `M9-73` at line 184; the divergence row is
`M9-141`.

## Other required design corrections

1. **Condition-read failure is an undeclared deviation.** Legacy deliberately
   swallows a failed/missing `stock_conditions` read (`index.html:904-923`) and
   keeps the platform working with blank marker cells. M9-11/T3 instead make
   the read fatal and retain the previous atomic snapshot. That safer behavior
   is reasonable, but it must be recorded and approved as a deliberate
   deviation, not attributed to legacy parity.

2. **Realtime scope is an undeclared improvement.** Legacy subscribes only to
   `movements`, `items`, `partners`, and `warehouses`
   (`index.html:1163-1181`). M9-130 adds `stock_conditions` and removes the
   irrelevant `partners` subscription. This is the correct design for the new
   screen, but its departure from legacy must be explicit and regression-tested.

3. **Q2 is already resolved.** The 2026-09-08 owner decision states that a
   missing, disabled, or non-working `Çap` action cannot block any phase.
   Proposal/plan/ledger references that still call Q2 open are contradictory.
   Keep M9-120/M9-121 outside acceptance; whether a dead button is rendered is
   presentation work, not an implementation gate.

4. **Q5 needs a wider regression guard.** `WarehouseBalance` is consumed by
   `ItemGroupsPage`, `NewOperationPage`, `operation.store`, `ItemStatePanel`,
   `ItemCard`, and tests/fixtures in addition to `groupFilters`. Extending it in
   place is acceptable only with focused coverage of every consumer plus the
   full suite and typecheck, or with a separate richer derived type. A Phase 6
   suite alone is insufficient.

5. **Ledger metadata and schema transcription are wrong.** The handoff says
   90 rows; the ledger contains 112 unique M9 rows. In the capture,
   `icare_qty` is `numeric(14,2) NOT NULL DEFAULT 0` and `created_at` is
   `timestamptz NOT NULL DEFAULT now()`, not the nullable shapes in the
   proposal.

6. **Two export claims overstate parity.** M9-111 says the opening export
   header matches the table, but legacy table order begins
   `Kod · Malın adı · Anbar`, while export begins
   `Anbar · Kod · Malın adı`. M9-118 cannot say export contains "exactly the
   rows RLS returned": the screen aggregates movements and may append
   nomenclature items with no movement. State instead that export is derived
   from the complete filtered UI dataset built from the RLS-scoped snapshot.

7. **Missing ledger contracts.** Add exact rows for the current table's full
   14-column order and formatting; named-warehouse filtering in the opening
   view; opening-view search; and the full opening KPI values/subtitles.

8. **Initial-balance marker asymmetry needs an explicit row.** Phase 7's write
   guard recognises the historical marker in partner **or channel**
   (`isInitialBalanceLine()`), while `getInitialBalanceRows()` recognises only
   partner (`index.html:2001`). Do not silently claim those definitions are the
   same. Preserve it as a documented legacy limitation unless live data proves
   the channel-only form must also be reconstructed.

9. **M9-134 is an undeclared improvement and needs a concrete concurrency
   rule.** Legacy keeps the editor only in transient DOM and `rBal()` replaces
   the table wholesale; a realtime `renderAll()` can therefore discard an
   in-progress input. "Must not silently discard" is not parity and is not
   precise enough to implement or test. Record the improvement, then specify
   whether a realtime snapshot is deferred while editing, merged around the
   active cell, or allowed to replace the row after an explicit conflict
   message. The proposal's current mitigation (re-render from the RPC result)
   covers post-submit confirmation, not a refresh before submit.

## Decisions that are ready

- **Q1:** include the condition write path in Phase 9. A read-only port would
  omit the screen's unique business action.
- **Q2:** already resolved; outside acceptance.
- **Q4:** keep one separately authorised, reversible TEST write window at the
  final live gate. This design audit authorises no write.
- **Q5:** extend in place only with the expanded consumer guard above.
- **Q3:** no owner decision in its current form; first repair the hypothesis
  and measure it.

## Safety and status

No Supabase request, mutation, fixture, application source edit, stage, commit,
push, deploy, layer deactivation or cutover was performed by this audit.
Production `bbjmhaerssakbreykxiw` was not contacted. The pre-existing dirty
tree was preserved. Phase 9 remains **NOT STARTED / NOT ACCEPTED**.
