# Phase 9 implementation plan — «Anbar qalıqları» (Module J)

**Status: PLAN — not started. Implementation begins only after the T0 live
reconfirmation gate passes.**

**Revision 2 (2026-09-10)** — corrected after the independent Codex design audit
[`../audits/2026-09-10-phase9-design-codex-audit.md`](../audits/2026-09-10-phase9-design-codex-audit.md).
Changes: new **T0** mandatory live reconfirmation gate; **T1 guard widened to all
12 `WarehouseBalance` consumers**; Q3 invariant tests and the raw-vs-operational
measurement added; D-J1…D-J4 deviation tests added; Q2 recorded as settled.

**Revision 3 (2026-09-10)** — corrected after the independent Codex design
**re-audit** [`../audits/2026-09-10-phase9-design-codex-reaudit.md`](../audits/2026-09-10-phase9-design-codex-reaudit.md)
and the owner decision [`../decisions/2026-09-10-phase9-design-package.md`](../decisions/2026-09-10-phase9-design-package.md).
Changes: **T0 split into T0A (ordinary TEST identities) and T0B (catalog
authority)**; Q1 and D-J1…D-J4 marked owner-approved; **D-J4 reversed** — the
opening-balance read is widened to partner **or** channel and the legacy omission
is not preserved; D-J3 given the approved commit-composition contract, with the
required stale-overwrite regression test stated in **M9-134b**;
`correct_document` described correctly in T2c; **M9-141c removed** from the
authoritative ledger; row count **125 → 124**.

**Revision 4 (2026-09-10)** — corrected after the final narrow Codex design
audit [`../audits/2026-09-10-phase9-final-design-codex-audit.md`](../audits/2026-09-10-phase9-final-design-codex-audit.md).
T0A is strictly read-only; live refusal and executable `PGRST202` probes move to
the separately authorised T10 window. The captured `rDxtm` ACL is recorded in
full and no longer misdescribed as “only `r`”.

**Design accepted:** [`../audits/2026-09-10-phase9-design-codex-acceptance.md`](../audits/2026-09-10-phase9-design-codex-acceptance.md).
Implementation remains gated by T0A, and Phase 9 remains not accepted.

Proposal: [`../specs/2026-09-10-react-migration-phase9-balances-proposal.md`](../specs/2026-09-10-react-migration-phase9-balances-proposal.md) ·
Row ledger: [`../specs/2026-09-10-phase9-registry-rows.md`](../specs/2026-09-10-phase9-registry-rows.md) ·
Reconciliation report: [`../audits/2026-09-10-phase9-design-reconciliation.md`](../audits/2026-09-10-phase9-design-reconciliation.md)

---

## Decision status entering implementation

| id | Status |
|---|---|
| Q1 | **OWNER-APPROVED in-phase** ([decision §1](../decisions/2026-09-10-phase9-design-package.md)) — the condition write path ships in Phase 9 |
| Q2 | **SETTLED, NOT OPEN** — `Çap` outside acceptance; cannot block the phase |
| Q3 | **REFRAMED** — divergence claim withdrawn; measurement task only (T0A.3, T2c) |
| Q4 | **One separately authorised reversible TEST write window at T10** |
| Q5 | Extend `WarehouseBalance` **only** with the 12-consumer guard (T1) |

| deviation | Status |
|---|---|
| D-J1 | **OWNER-APPROVED** ([decision §2](../decisions/2026-09-10-phase9-design-package.md)) — failed condition read fatal; last good snapshot stays visible |
| D-J2 | **OWNER-APPROVED** ([decision §3](../decisions/2026-09-10-phase9-design-package.md)) — subscribe `stock_conditions`, omit `partners` |
| D-J3 | **OWNER-APPROVED** ([decision §4](../decisions/2026-09-10-phase9-design-package.md)) — Escape cancels, blur commits, commit composes edited key + latest snapshot for the rest |
| D-J4 | **OWNER-APPROVED** ([decision §5](../decisions/2026-09-10-phase9-design-package.md)) — opening-balance read widened to partner **or** channel; legacy omission **not** preserved |

## Entry criteria

1. The proposal (revision 3) is approved.
2. **T0A has passed** under the owner-approved rehber scope waiver
   ([decision](../decisions/2026-09-10-phase9-t0a-rehber-waiver.md)). T0B has either passed or been explicitly reported
   unavailable; if unavailable, every T0B-dependent implementation task and row
   remains blocked. No implementation task may begin before T0A.
3. The baseline suite is re-run green **before** any file change (last recorded:
   126 files / 2730 tests, typecheck, oxlint, build, `git diff --check`).
4. `web/.env.sandbox.local` confirmed on TEST `alkjjbaawmsirsfvqljm` with
   `VITE_ALLOW_LOCAL_WRITES=false`.
5. The 124 `M9-*` rows merged into the registry as `NOT STARTED`
   (principles §10).

## Milestones — sequencing only, no status meaning

Module J is **one acceptance boundary**.

| Milestone | Tasks | What may be claimed at its end |
|---|---|---|
| J-0 | T0A, T0B | Server facts re-confirmed. **No row promoted** |
| J-1 | T1, T2 | `CODE VERIFIED` on pure-logic rows only |
| J-2 | T3, T4 | `CODE VERIFIED` on snapshot/store rows |
| J-3 | T5, T6 | `CODE VERIFIED` on the read-only screen |
| J-4 | T7, T8 | `CODE VERIFIED` on the write path and export |
| J-5 | T9, T10 | Phase-level result, after the single live gate |

**Binding rules:**

- No milestone is described as `ACCEPTED` or `LIVE VERIFIED`.
- **No live write before J-4 is complete.** The write gate is T10; it opens once,
  under separate authorisation.
- A milestone finishing promotes no row it lacks evidence for.
- `Çap` is never claimed as working.

---

## T0 — Mandatory live reconfirmation gate (read-only) — **BLOCKING**

Every server fact in the proposal comes from the **2026-09-03 captures**. The
design session had **no TEST credentials** (no `ANBAR_TEST_PASSWORD`), and the
Codex audit could not re-read the contract either. No implementation that
depends on exact policy, ACL, constraint or function-body facts may proceed on
capture-age evidence.

Read-only on TEST `alkjjbaawmsirsfvqljm`; production `bbjmhaerssakbreykxiw`
rejected before every probe. Every T0A step below is read-only — no mutation
attempt, write or fixture.

**The gate is split (re-audit finding 4).** An earlier revision treated "no TEST
password" as the single blocker for everything here. It is not: an ordinary
authenticated PostgREST session proves the behavioural half, while the exact
catalog facts cannot be obtained from a UI login **at all**. The halves have
different blockers and are tracked separately.

### T0A — behavioural checks through ordinary TEST identities

Requires only ordinary authenticated TEST logins (admin, anbardar, rehber).

1. **Behavioural RLS matrix** for `movements`, `items`, `stock_conditions`,
   `warehouses` per role, including the anbardar's server-side warehouse
   scoping. → M9-17, M9-18
2. **Exposed column set** of `stock_conditions` as returned by PostgREST,
   including whether `icare_qty` is present and readable. → M9-19 (behavioural
   half only)
3. **Q3 measurement:** raw `SUM(in_qty − out_qty)` vs the operational sum, per
   warehouse × item, over the readable `movements` set. Expected **equal
   everywhere**. Any unequal pair is reported with its rows. → M9-141a

**If step 3 finds a real unequal pair**, stop and report it before writing any
policy. **M9-141c does not exist yet** — it is created only then, and only with
an owner decision. **If it finds none, no owner decision is requested and Q3
closes as measured.**

### T0B — catalog authority

**Cannot be satisfied by a TEST UI password.** Requires an authorised Supabase
catalog connection or a fresh trusted capture:

1. exact `pg_policy` rows on `stock_conditions` — **exactly one**
   (`stock_conditions_select`), **no** INSERT/UPDATE/DELETE policy. → M9-106
2. full table and function **ACLs** — verify the captured
   `authenticated=rDxtm/postgres` entry and specifically the absence of direct
   DML privileges `a`/`w`/`d`; do not collapse the ACL to “only `r`”. → M9-106
3. exact **column definitions and constraints** — `icare_qty` `numeric(14,2)`
   NOT NULL DEFAULT 0 with its `>= 0` CHECK; `created_at` `timestamptz` NOT NULL
   DEFAULT `now()`. → M9-19
4. current **`pg_proc` body** of `set_stock_condition` — the full enforcement
   order, role gate and anbardar warehouse check. → M9-91, M9-92, M9-108
5. current **PostgREST-exposed RPC signature**, obtained without invoking the
   mutation. The publishable-key TEST probe returned HTTP 401 `Secret API key
   required`, so this is not a T0A/UI-password claim. → M9-99, M9-100

**If this authority is unavailable it must be reported as unavailable.** It must
**not** be claimed as satisfied by an admin UI password, and these rows stay
blocked on capture-age evidence. The 2026-09-03 capture remains valid **design**
evidence; its **freshness is proved only by T0B**.

**The owner approved the missing rehber live read as non-blocking for T0A.**
That does not claim rehber evidence or alter its rows. T0A may pass while T0B
remains open, but only work independent
of exact policy/ACL/constraint/function-body facts may proceed; every
T0B-dependent task and row stays blocked.

## T1 — Extend the shared balance index (Q5)

Add `last`, `first`, `price`, `val`, `name`, `unit` to `WarehouseBalance` in
`lib/itemIndex.ts`, mirroring `index()` at `index.html:1286-1308`. Additive only.

**Guard — all 12 consumers, not the Phase 6 suite alone** (Codex finding 4):

`lib/itemIndex.ts` · `lib/groupFilters.ts` + `.test.ts` · `lib/opLineValidation.ts` ·
`lib/bulkWriteOff.test.ts` · `store/operation.store.ts` ·
`store/itemGroups.store.test.ts` · `pages/ItemGroupsPage.tsx` ·
`pages/NewOperationPage.tsx` · `components/operation/ItemStatePanel.tsx` +
`.test.tsx` · `components/nomenclature/ItemCard.tsx`

Each gets focused coverage proving unchanged behaviour, **plus** the full suite
and `tsc --noEmit`. Rows: M9-21…M9-28.

## T2 — Pure logic modules

- `lib/initialBalance.ts` — `getInitialBalanceRows()` and its normalisation
  helpers (1898-2051). Tests written **from the legacy source**: strict type
  matching, ğ/q partner folding, FIFO consumption, transfer pairing by document
  and by legacy key, warehouse-label recovery, `opening_date` earliest-wins,
  `last` raised from `IX.bal`, named-warehouse filter, search haystack.
  Rows: M9-70…M9-79b.
  **Plus D-J4 (owner-approved correction):** the opening-balance read recognises
  the marker in partner **OR** channel, matching `isInitialBalanceLine()`. Two
  tests — a **channel-only** opening row **IS** reconstructed, and partner-marked
  rows are unchanged (no regression). The legacy partner-only omission is **not**
  preserved. Row: M9-84.
- `lib/balanceRows.ts` — three source shapes, no-movement rows, condition
  attachment, filters, sorts, KPI aggregates.
  Rows: M9-30…M9-36, M9-40…M9-45, M9-51…M9-55, M9-60…M9-64.
- `lib/canEditCond.ts` + `lib/condInput.ts`. Rows: M9-90, M9-91, M9-96, M9-97.
- `lib/balanceExport.ts` — both header shapes from `COND_COLS`, **with the
  table-vs-export column-order difference pinned by test** so it cannot be
  "tidied" into a false parity. Rows: M9-110…M9-116, M9-110a, M9-111.

### T2c — Q3 invariant coverage

Unit tests over `excludeCancelled()` proving net-zero for every supported
cancellation family — legacy row, legacy transfer pair, whole document, transfer
document, layer transfer.

**The `correct_document` case models the cancellation pair plus the surviving
replacement** (re-audit finding 1). `correct_document` does **not** merely append
a note marker: it calls `cancel_document(v_doc, p_reversal_date)` and then
`post_movement_document(v_lines, NULL)`. The fixture is therefore three parts —
the original document, its `cancel_document` reversal, and the replacement
document — and the assertion is that the **raw sum equals the
`excludeCancelled()` sum**: the original and its reversal cancel to zero in both,
while the replacement survives in both. The test fails if the replacement is
treated as cancelled, or the pair as unbalanced. Row: M9-141b.

Reuse unmodified: `operationalMovements.ts`, `condSplit.ts`, `format.ts`,
`movementRoute.ts`, `showAllCut.ts`, `warehouseScope.ts`, `roles.ts`.

## T3 — `api/balancesSnapshot.api.ts`

Atomic four-read snapshot on the `movementsSnapshot.api.ts` pattern: all four
reads fatal (**D-J1**), both failure shapes absorbed, deterministic ordering, no
client-side warehouse scoping.

A test must assert the **deviation** explicitly: a failed `stock_conditions`
read makes the whole snapshot fail, and a successful-but-empty read does not.
Rows: M9-10…M9-18.

## T4 — `store/balances.store.ts`

`BF` state, snapshot retention on failure, sticky `showAll`, monotonic request
sequencing, condition-map replacement from the RPC response.
Rows: M9-06, M9-12, M9-57, M9-101, M9-105, M9-133.

## T5 — `pages/BalancesPage.tsx`, read-only

Rail entry in the legacy third position, page shell, both views, filters, KPIs,
soft cap, pager, empty states, realtime subscription, item-card handoff, full
table column order and cell formatting.

Realtime is **D-J2**: a test pins the subscribed set to
`movements, items, warehouses, stock_conditions` and asserts `partners` is
**not** subscribed. Rows: M9-01…M9-05, M9-46, M9-50, M9-56, M9-58,
M9-77…M9-83, M9-85, M9-110a, M9-110b, M9-130, M9-130a…M9-132, M9-136, M9-140.

## T6 — Read-only regression pass

Full suite, typecheck, oxlint, build, `git diff --check`. Nothing promoted past
`CODE VERIFIED`.

## T7 — Condition write path (Q1, approved)

`api/setStockCondition.api.ts` behind `lib/mutationGuard.ts`, plus
`components/balances/ConditionCell.tsx`. Every RPC branch tested against a
mocked response: DELETE/NOOP/INSERT/UPDATE, `exceeds_balance`, `PGRST202` retry,
the `icare` special case, each server refusal message, revert on error, the
duplicate-submit latch. Rows: M9-92…M9-108, M9-135.

**D-J3 mid-edit policy — four named tests** (Codex finding 9; re-audit finding 3):

1. Edit in progress + snapshot arrives → the input is retained, other rows
   update. (M9-134)
2. **Escape cancels** after such a refresh → the cell shows the **new** snapshot
   value, not the stale pre-edit one. **Blur commits** — Escape is the only
   cancel gesture (M9-94). (M9-134a)
3. **Commit** (Enter or blur) after such a refresh → exactly **one** RPC; the
   cell shows the server's returned row; no conflict dialog. The payload is
   **composed**: the user's value for the actively edited key, the **latest
   snapshot values** for the other three keys and the note. (M9-134b)
4. **Required stale-overwrite regression test:** realtime changes a **different**
   condition key on the same warehouse × item mid-edit; on commit the one RPC
   carries that key's **new** value. The test **fails if the pre-edit baseline is
   resent** — proving a realtime change to another key is not overwritten.
   (M9-134b — stated inside that row, not a separate ledger id)

## T8 — Export

Wire `lib/balanceExport.ts` to the button; verify both header shapes and their
distinct column orders, the full filtered set, `whLabel`, empty price cell,
`toFixed(2)`, raw ISO dates, filename. Rows: M9-110…M9-119.

`Çap` is ported as the legacy call and recorded outside acceptance
(M9-120, M9-121). Whether a dead button renders is presentation work, not a
gate.

## T9 — Full gate

Full suite one worker, typecheck, oxlint, sandbox build, `git diff --check`,
staged-file count 0, dirty-tree entry count preserved.

## T10 — The single live gate (Q4)

**Requires explicit user authorisation at that moment.** TEST only, production
rejected before every probe.

1. Read-only first: both views, all filters and sorts, KPI recomputation from
   the raw payload with application helpers **not** imported, export contents,
   soft cap.
2. Role legs: admin, anbardar (own warehouse only), rehber (reads, cannot edit).
3. **Write leg, only if separately authorised:** one minimal reversible
   condition edit, its `exceeds_balance` branch if reachable, and restoration to
   the prior value. Record before/after `stock_conditions` state and the
   server-written `audit_log` rows.
4. In the same authorised write window, observe the server-side `rehber` refusal
   and any executable seven-/six-argument `PGRST202` fallback leg that can be
   reached safely. A refusal is recorded as a mutation attempt even when it
   writes no row. If the live schema cannot expose the fallback branch, keep its
   live portion unclaimed and rely only on mocked/unit evidence.

Browser-only response harnesses may prove presentation contracts but are
**never** recorded as persisted database evidence.

---

## Verification per principles §7

- TypeScript: `tsc --noEmit`, `oxlint src`, `vitest run`.
- Role/security: offline simulation of allow and deny for `canEditCond` **and**
  the server refusals; the server rule is the binding one.
- Data changes: the T10 write leg is a single reversible edit with a recorded
  rollback.
- UI: loading, empty, error, permission and refresh states in both views.
- Exports: header, order, row count and formatting against the legacy output.
- **Deviations:** D-J1, D-J2, D-J3 and D-J4 each carry a test that fails if the
  behaviour silently reverts to legacy or drifts further from it. For D-J4 that
  means a channel-only opening row **is** reconstructed; for D-J3 it includes the
  stale-overwrite test required by M9-134b.

## Exit criteria

Module J is `ACCEPTED` only when every one of the **124** `M9-*` rows is either
evidenced or an explicitly owner-approved scoped exclusion, **and** Codex's
independent audit (principles §11) passes. M9-120/M9-121 are excluded by the
settled Q2 decision.

**M9-141c is not among the 124 and must not be counted.** It does not exist in
the authoritative ledger; it is created **only if** T0A step 3 finds a real
unequal pair, and only with an owner decision at that point. If it is ever
created, the ledger total and this exit rule are updated together in the same
revision.

## Safety boundary — unchanged throughout

TEST `alkjjbaawmsirsfvqljm` only; production `bbjmhaerssakbreykxiw` never
contacted; `VITE_ALLOW_LOCAL_WRITES=false` except inside an authorised T10 write
window granted to a temporary process only, never by editing
`.env.sandbox.local`; no layer deactivation, no cutover; no stage, commit, push
or deploy; the dirty working tree preserved.
