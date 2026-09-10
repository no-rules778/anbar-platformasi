# Phase 7 — fixture-precondition reconciliation against the accepted Phase 8 baseline

Date: 2026-09-09
Environment boundary: TEST `alkjjbaawmsirsfvqljm` only
Class: read-only inspection — **zero writes**
Purpose: reconcile Phase 7's recorded blockers against later Phase 8 evidence,
per the Phase 7 reconciliation instruction

## Why this reconciliation was required

Phase 7 milestone H-5 (2026-09-05) deferred transfers, layers, İcarə/conditions
and anbardar scoping **not by choice of scope but by a recorded fixture
limitation**: TEST then held «1 public user (`admin`), 0 partners, 0
`stock_conditions`, 0 `stock_layer_settings` and only 5 movements». Phase 8 then
built fixtures in the same project. Several of Phase 7's stated blockers are
therefore **factually stale**, and leaving them unexamined would misrepresent why
those rows are still open.

## Live read-only comparison

| Precondition | H-5 (2026-09-05) | Live now (2026-09-09) | Blocker still real? |
|---|---|---|---|
| `stock_layer_settings` / layer capability | 0 rows → probe `null` | **`active:true, version:36`** | **NO — resolved** |
| `movements` | 5 | **125** | **NO** |
| `stock_conditions` | 0 | **2** (`Test Anbar`, `CODEX Phase8 Transfer Anbar`; both `icare_qty` 0.01) | **NO** |
| `public.users` | 1 (`admin`) | **4** — `admin`, **2 × `anbardar`@`Test Anbar`**, `rehber`; all active | **NO** |
| Second `type='anbar'` warehouse (transfer dest) | absent | **`CODEX Phase8 Transfer Anbar`** (plus `Test Layihə Ünvanı`, `layihə`) | **NO** |
| `partners` | 0 | **0** | **YES — unchanged** |
| `items` | 5 | 6 | n/a |

Balance/integrity unchanged by this inspection: 125 movements,
`Test Anbar / 0000001 = 8.00`, 0 negative balances — identical to the accepted
Phase 8 state.

## What this does and does not change

**Closed by it:** `M7-123` read 10, which needed only the layer capability. It is
measured and the row is closed — see
`2026-09-09-phase7-m7-123-read10-live-measurement.md`.

**Deliberately NOT promoted.** No other Phase 7 row is promoted here, and the
stale-blocker finding is **not** itself evidence that any row's contract passed.
The distinction that the Phase 8 independent review enforced applies with equal
force in the other direction:

- A Phase 8 fixture existing means a Phase 7 scenario is now **runnable**, not
  that it was **run**. Runnability is a precondition, not evidence.
- Phase 8 exercised its own `M8-*` contracts through the movements screen and its
  cancellation/correction/export families. Phase 7's open rows are «Yeni
  əməliyyat» **posting-path** contracts — `addLine` layer routing (`M7-38`),
  `commitDraftLine` (`M7-39`), the mv Qaimə № written to both legs (`M7-14`), the
  layer+edit refusal (`M7-94`), the second initial-balance gate at post time
  (`M7-95`), the note-marker round trip (`M7-113`), the label-guard refusal
  (`M7-121`), the pick-item focus rule (`M7-22`), the read-only unit field
  (`M7-18`), the Mal hərəkəti navigation contract (`M7-116`). None of these is the
  same contract as any `M8-*` row, so no Phase 8 audit can be re-attributed to
  them. Promoting them on adjacency would be exactly the invalid attribution
  Codex rejected in Phase 8 (the transfer/layer-gate defect).
- The remaining `IN PROGRESS` rows (`M7-16`, `M7-30`, `M7-40`, `M7-66`, `M7-67`,
  `M7-69`, `M7-83`, `M7-90`, `M7-109`) still need their own store/handler halves
  exercised.
- `M7-107` (server idempotency reach) remains unproven in either direction, as
  H-5 already recorded.
- `M7-96`, `M7-S2`, `M7-S3` keep their recorded statuses; nothing here touches
  them.

**Correction to the H-5 wording.** H-5's sentence «Transfer, layer,
İcarə/condition and anbardar scenarios remain blocked by the documented TEST
fixture limitations» is **no longer accurate as a statement of present fact**. The
fixtures now exist. Those rows are open because **their Phase 7 contracts have not
been executed**, which is a different and more honest reason. The H-5 text is
preserved as chronology and annotated rather than rewritten.

**Consequence for the remaining-verification plan.** Much of
`test-environment/2026-09-05-phase7-remaining-live-verification-plan.md` prices
scenarios by the setup writes they need. Those prices are now **overstated** for
any scenario whose fixture Phase 8 already built — S-11 fell from «1 setup write
+ non-exact cleanup + a class D delete for exact restoration» to **zero writes**.
The plan should be re-costed against this table before any further batch is
proposed. Re-costing is not re-approval: every write-bearing scenario still needs
its own owner authorisation, and the net-zero rule still governs.

**`partners` = 0 is the one surviving H-5 blocker.** Any Phase 7 row whose
contract needs a real counterparty directory value still cannot be exercised
without separately approved fixture creation. `M7-121`'s label guard («… Sorğuçalarda
aktiv deyil») is in this class.

## Safety state

Read-only throughout: `SELECT`s and one read-only capability RPC. Environment
guard asserted before each call; production `bbjmhaerssakbreykxiw` never
contacted. No write, no fixture, no cleanup, no cutover, no layer deactivation,
no I-10 row. No source file changed; the suite was not re-run because no
behaviour changed. Dirty worktree preserved, staged state empty.

Phase 7 remains **INCOMPLETE and NOT `ACCEPTED`**, pending independent Codex audit.
