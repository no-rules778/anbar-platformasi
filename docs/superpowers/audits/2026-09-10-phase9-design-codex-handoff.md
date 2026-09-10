# Phase 9 — handoff for an independent Codex design audit

Date: 2026-09-10
Author: Claude (research and design session)
Environment: **no live Supabase contact in this session**

## What this session did

Research and design only, as instructed. Produced:

1. [Proposal](../specs/2026-09-10-react-migration-phase9-balances-proposal.md)
2. [Implementation plan](../plans/2026-09-10-react-migration-phase9-balances.md)
3. [M9 parity ledger](../specs/2026-09-10-phase9-registry-rows.md) — 90 rows,
   all `NOT STARTED`
4. This handoff

**No application code, SQL, schema, data, `.env`, dependency or repository state
was changed.** No fixture, no mutation, no test run, no stage/commit/push/deploy,
no layer deactivation, no cutover. Three new documentation files were created;
no Phase 7 or Phase 8 evidence file was modified.

## Current-status reconciliation (no status changed)

- Phase 7 / Module H: `ACCEPTED` 2026-09-10, owner-approved active-layer TEST
  scope, `Çap` excluded.
- Phase 8 / Module I: `ACCEPTED` 2026-09-09, same active-layer boundary;
  M8-39/M8-46 and M8-29 remain scoped exclusions.
- Phase 9 / Module J: **NOT STARTED, NOT ACCEPTED.**

The Module J section is **not yet added** to
`ANBAR_FUNCTIONAL_PARITY_REGISTRY.md` — the ledger exists as a standalone file
so the registry is edited once, after this audit, in the Module H/I linking
style.

## What Codex should verify

### 1. Evidence completeness

Proposal §2 lists every legacy range read. Confirm nothing load-bearing in
`rBal()` and its dependencies was missed — in particular whether any balance
behaviour lives outside 1893-2410 that the ledger fails to capture.

### 2. The server contract (proposal §3)

All server facts came from the **2026-09-03 captures**, not a live probe.
Confirm independently, read-only, on TEST:

- `stock_conditions` has RLS enabled and **exactly one policy**
  (`stock_conditions_select`), with no INSERT/UPDATE/DELETE policy — the basis
  for M9-106.
- `set_stock_condition`'s current signature and body still match the
  transcription, especially the role gate (`admin`/`anbardar` only, `rehber`
  refused) and the anbardar warehouse check.
- `icare_qty` exists with its `>= 0` check, i.e. sql/031 is applied on TEST.

If the live TEST project differs from the capture, the ledger rows depending on
it are wrong and must be corrected before implementation.

### 3. The Q3 divergence — the finding most worth a second opinion

`stock_condition_balance()` sums **all** `movements` rows; the screen's `Qalıq`
sums only `operationalMovements()`. On a fully cancelled document + reversal
pair the two agree. They diverge where the set is unbalanced — most clearly a
legacy row-level cancellation (`Ləğv ID: <id>`), where `excludeCancelled()`
drops both the named row and the marker row while the SQL still counts the
marker.

Effect: `exceeds_balance` warns against a number the user cannot see.

I have **not** treated this as a defect to fix. Principles §7 requires
documenting it, explaining the risk, proposing the safest option and asking the
user. Codex should independently confirm or refute the divergence — ideally by
constructing the comparison read-only on TEST — and say whether my
characterisation of when it bites is correct.

### 4. Scope boundaries

- `Çap` ported but excluded (Q2) — consistent with the Phase 8 precedent.
- `rAnb` and the `dead` report consume `IX.bal` and stay unmigrated (M9-145).
  Confirm the T1 extension cannot disturb them.
- No `stock_layers` involvement (M9-146).

### 5. The T1 extension risk (Q5)

`buildItemIndexes` is shared with Mal qrupları. My recommendation is to extend
`WarehouseBalance` in place, additively, with the Phase 6 suite as the guard.
Codex should confirm no other consumer depends on the current shape.

### 6. Ledger quality

90 rows across navigation, snapshot/server dependencies, computation, warehouse
modes, condition markers, filters/sort/cap, KPIs, the opening-balance view, the
write path, export, print, realtime/concurrency/failure, and cross-screen
divergences. Codex should look for **missing** rows — a visible behaviour,
calculation, filter, role rule, export detail, failure state, realtime behaviour
or server dependency with no row — rather than only reviewing the rows present.

## Open decisions blocking implementation

| id | Question | My recommendation |
|---|---|---|
| Q1 | Condition write path in Phase 9, or read-only first? | In-phase |
| Q2 | `Çap` — port as no-op, or omit? | Port, excluded from acceptance |
| Q3 | The balance-definition divergence | Port unchanged, document, **user decides** |
| Q4 | Live-write policy on TEST | One explicit gate at T10 |
| Q5 | Extend `WarehouseBalance` in place | Yes, Phase 6 suite as guard |

Q1, Q2, Q4 and Q5 are engineering choices Codex can audit. **Q3 needs the
user's decision**, not an agent's.

## Constraints honoured

TEST `alkjjbaawmsirsfvqljm` only; production `bbjmhaerssakbreykxiw` never
contacted (no Supabase contact at all this session); dirty working tree
preserved; nothing staged, committed, pushed or deployed;
`VITE_ALLOW_LOCAL_WRITES=false` untouched; no layer deactivation or cutover;
`Çap` outside acceptance scope; Phase 9 not marked `ACCEPTED`; no Phase 7/8
evidence modified.

## Note on `web/.env`

`web/.env` targets **production** `bbjmhaerssakbreykxiw`; only
`web/.env.sandbox.local` targets TEST. This is the pre-existing condition
recorded in the Phase 8 `D5`/`Q1` finding, not something Phase 9 introduced or
changed. Every Phase 9 activity must run in `--mode sandbox`. Worth Codex
restating in its audit, since a mode slip here is a production write.
