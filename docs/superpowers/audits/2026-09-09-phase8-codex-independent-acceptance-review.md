# Phase 8 — Codex independent acceptance review

Date: 2026-09-09. Verdict: **NOT ACCEPTED**. This is a source/evidence review, not a new live verification.

## Independently established findings

1. The latest M8-14 and M8-44 realtime audit files exist. Their described debounce and stale-ticket behaviour agrees with `useRealtimeRefresh.ts` (clear/reset timeout, default 400 ms) and `movements.store.ts` (monotonic request ticket checked before state publication). Their historical network observations were not independently replayed in this review.
2. The layer-gate audit uses transfer `SND-8DC5E59E8D` as an otherwise valid correction/replacement candidate. That attribution is incorrect: `canEditDocument()` rejects `!isOrdinaryDoc` BEFORE the layer check; `DocumentViewDialog` supplies `view.kind === 'ordinary-doc'`; `canReplaceItems()` rejects both transfer kinds even with layers inactive. Absence of those controls on a transfer does not isolate the layer gate. This is an evidence defect, not an application defect.
3. Do not repeat valid older gate checks: the 2026-09-08 M8-26/M8-38 React audit already inspected an ordinary receipt without edit, and the M8-28 layer-replacement UI audit inspected a second ordinary receipt AFTER the fix without replacement but WITH row cancellation. These support current active-layer refusal. They do not prove the distinct M8-39 second-document edit guard or M8-46 correction/replacement double-submit branches with layers inactive. The approved proposal lists M8-38, M8-39 and M8-46 separately. Restricting acceptance to the current active-layer configuration needs an explicit scope decision; a gate cannot silently replace another contract.
4. Missing legacy stock on this TEST baseline does not prove the M8-29 supported legacy-transfer success branch correct or remove it from scope. Preserve the baseline; do not perform a new cutover or invent layers merely to turn the row green. The claimed necessity of a new cutover is not independently established here.
5. Independent audit is not the only recorded remaining condition: current M8-32 explicitly retains transport/unknown outcome, refresh failure and independent multi-tab concurrency; M8-47 retains other handler-gate branches; M8-54 retains fully-resolved route/key branches. Reconcile these against actual contracts and existing evidence before declaring the queue empty. Do not invent exhaustive matrices beyond the approved contracts.

## Safety and limits

Independent automated checks: 126 test files / 2708 tests passed; typecheck and oxlint completed successfully; production-optimized build with `--mode sandbox` passed. Non-fatal React `act(...)` test warnings and the large-chunk build advisory remain. `git diff --check` passed before this documentation addition; staged diff was empty. These checks do not substitute for live branch evidence.

No production or TEST database request, browser mutation, source edit, fixture, staging, commit, push or deployment in this review. The starting dirty listing had 214 entries; count alone is not proof of content preservation. Existing files were not reverted. `skills/MAIN.md` and `CLAUDE.md` are absent from this checkout; available migration principles and ledger were used instead. Prior audits remain unchanged.

## Next owner and bounded task

Claude: reconcile the acceptance matrix using the actual approved row contracts. Correct the transfer-based attribution using the existing ordinary-document evidence, without re-running those checks. Keep configuration-gated branches scoped, not universally verified. Choose a remaining read-only browser-harness contract such as the fully resolved M8-54 route/key branches, prove it with positive/negative controls, restore the real snapshot, and distinguish browser-only evidence from database evidence. Do not deactivate layers or create a new cutover. Return the minimal genuine acceptance gaps and any explicit owner scope decision required. Codex must then review the resulting evidence independently.
