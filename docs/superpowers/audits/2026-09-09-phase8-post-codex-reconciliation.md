# Phase 8 — post-Codex reconciliation and minimal remaining gaps

Date: 2026-09-09 (Asia/Baku)
Environment: TEST `alkjjbaawmsirsfvqljm` only
Status: **SUPERSEDED — ACCEPTED** after the owner decisions and final Codex audit
Supersedes the blocker list in
[`2026-09-09-phase8-final-acceptance-gate.md`](2026-09-09-phase8-final-acceptance-gate.md)

> Final resolution: the owner accepted both scope boundaries described below,
> and Codex completed the independent audit. See
> [`../decisions/2026-09-09-phase8-active-layer-and-legacy-scope.md`](../decisions/2026-09-09-phase8-active-layer-and-legacy-scope.md)
> and
> [`2026-09-09-phase8-final-codex-acceptance.md`](2026-09-09-phase8-final-codex-acceptance.md).

## 1. Codex's evidence defect — accepted and corrected

Codex finding #2 was correct and is fixed, not argued with. The layer-gate
audit had cited transfer `SND-8DC5E59E8D` as an otherwise-eligible
correction/replacement candidate. Verified directly in source:

- `canEditDocument()` (`documentEdit.ts:98-105`) refuses `!isOrdinaryDoc`
  **three checks before** the `layerActive` branch;
- `canReplaceItems()` (`documentCancelGate.ts:136`) rejects `transfer-doc` and
  `legacy-transfer` unconditionally, with **no layer input at all**.

A transfer card therefore shows neither control even with layers INACTIVE, so
the observation could not isolate the layer gate. The audit section is
retracted and rewritten; the M8-39 and M8-46 ledger rows are corrected; the
registry carries the retraction. **This was an evidence defect, not an
application defect** — no product behaviour changed.

Per Codex's instruction the older ordinary-document checks were **reused, not
re-run**: the 2026-09-08 M8-26/M8-38 audit (ordinary receipt, no edit control)
and the post-fix M8-28 audit (ordinary receipt, no replacement control **but
with row cancellation present**). That second pairing is load-bearing: it is
exactly the asymmetry the code predicts, since `mayReplace`
(`DocumentViewDialog.tsx:196`) carries the layer term and `mayCancelRow`
(line 198) does not.

**Active-layer refusal does not verify the inactive-layer contracts**, and that
is now stated in the rows rather than glossed.

## 2. Contracts completed this session (no source changed)

| Row | Approved contract | What was proved |
| --- | --- | --- |
| **M8-54** | ported helpers incl. `transferRoute`, `movKey` | the last two branches: fully-resolved `A → B` and the `route:` key, with two negative controls; snapshot restored |
| **M8-32** | "Batch atomic execute + all-or-nothing failure message" | the *message* half live in the real dialog (atomicity was already proved server-side); also confirms M8-48/M8-49 live |
| **M8-47** | "One gate shared by button and handler" | the stale re-check: the action control was revoked on an open dialog when rows changed, 0 RPCs, with a valid negative control |

Scoped audits:
[M8-54](2026-09-09-phase8-m8-54-resolved-route-key-browser-contract.md) ·
[M8-32](2026-09-09-phase8-m8-32-all-or-nothing-message-live.md) ·
[M8-47](2026-09-09-phase8-m8-47-shared-gate-stale-recheck.md)

**Evidence classes are kept distinct.** M8-54 and the M8-32/M8-47 harnesses are
**browser-contract evidence**: the rows and refusals existed only in responses
rewritten in flight, and are labelled as such in every audit and ledger row.
The M8-47 reload was driven by a **real** TEST `postgres_changes` event, and
its two event-source fixtures were posted and immediately reversed. Persisted
database evidence (M8-32 atomicity rollback, layer-batch refusals) is cited
separately as server-side.

## 3. Reconciliation against the APPROVED contracts

Codex finding #5 asked that M8-32, M8-47 and M8-54's residual notes be
reconciled against actual contracts rather than treated as an open matrix. The
approved proposal states each row as one line. Reconciled:

- **M8-32** — both halves now evidenced. `UNKNOWN_OUTCOME_MESSAGE` /
  `REFRESH_FAILED_MESSAGE` are **not named** in this row's contract; they stay
  CODE VERIFIED under `batchOutcome.test.ts`. Multi-tab batch concurrency is a
  scope note, not part of "atomic execute + all-or-nothing failure message".
- **M8-47** — both the concurrent-tab half (earlier) and the stale re-check
  (now) are live. "Other handler-gate branches" is not a contract term.
- **M8-54** — complete; every named helper has live evidence.

No additional criteria were invented, and no exhaustive matrices were
constructed.

## 4. Minimal remaining acceptance gaps

**A. Owner scope decision required (not evidence — a judgement):**

1. **M8-39 and M8-46 correction/replacement.** Both are unexercised because the
   controls do not exist while layers are active, and reaching them needs layer
   deactivation — out of scope (it would destroy the evidence baseline). The
   owner must decide whether Phase 8 acceptance is **scoped to the active-layer
   configuration**. Recording it silently as satisfied is exactly what Codex
   objected to, so it is surfaced instead.
2. **M8-29 legacy-transfer success branch.** Per Codex finding #4, missing
   legacy stock does **not** prove the branch correct or remove it from scope,
   and the claimed necessity of a fresh cutover is **not** independently
   established. The baseline was preserved and no cutover was performed. The
   owner must decide: leave the branch unexercised, or authorise a safe route
   to it that does not destroy the current baseline.

**B. Authority gate:** independent Codex acceptance
(`registry-rows.md:31-32`, principles §11, `CLAUDE.md` §4).

**C. Optional future coverage — explicitly NOT acceptance-blocking:** role
dimensions on rows already live for admin; multi-tab batch concurrency;
transport/unknown-outcome classification separated from the write guard (needs
a write-enabled window); volume beyond the measured M8-53 contract.

## 5. Verification state

**Automated checks were NOT re-run**, per instruction: `find web/src -newermt`
confirms **0 source files modified** this session, so Codex's independent pass
(126 files / 2708 tests, typecheck, oxlint, production-optimized sandbox build)
still holds. Only `docs/superpowers/**` was edited.

TEST reconciled: movements **125** — every fixture posted through a supported
RPC and reversed through a supported cancellation RPC, no immutable movement or
audit row deleted. `Test Anbar / 0000001 = 8.00`, `CODEX Phase8 Transfer
Anbar = 0`, `Test Anbar / 0000002 = 0`, **0 negative balances**. Layers active,
version 36; `b633360d…` avail 7 `legacy_unresolved`, `fcb7f7b1…` avail 1 @ 15
`known` — unchanged.

Localhost: single listener `127.0.0.1:5175`, `--mode sandbox`, HTTP 200,
`VITE_ALLOW_LOCAL_WRITES=false` on disk and in the served bundle. No
write-enabled process was opened this session. Staged state empty; 214
dirty/untracked entries preserved; no commit, stage, push or deploy; no `I-10`
row; `Çap` outside the boundary; **0 production contacts**.
