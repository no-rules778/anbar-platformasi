# Phase 7 — Codex audit of explicit commit-signal remediation

Date: 2026-09-10
Verdict: **implementation logic accepted; verification gate FAILED**

The explicit `commitSignal` fixes the restored-draft ambiguity identified in
the prior Codex audit. It is owned by `NewOperationPage`, advances only after
the ordinary and confirmed single-layer `addLineRaw` calls, and remains
unchanged on restore, bulk, removal, refresh and unconfirmed-dialog paths. The
new post-mount restore regression is targeted and the former positive focus
tests remain meaningful.

Independent results:

- focused `OperationForm` + `NewOperationPage`: 139/139 passed;
- oxlint: passed;
- **typecheck: FAILED**;
- **sandbox production build: FAILED** for the same TypeScript error.

`OperationForm.test.tsx:362` directly rerenders `OperationForm` without the new
required `commitSignal` prop (`TS2741`). The shared `renderForm` and new
controlled wrappers pass the prop, but this older direct JSX call was missed.
Consequently the remediation audit's claim that typecheck/build were clean does
not match the current working tree. Add `commitSignal={0}` to that existing
rerender, rerun all gates, and correct the audit record. No application logic
change is otherwise requested by this finding.

M7-22 remains live verified. M7-39 and M7-38 are not promoted by Codex until the
verification gate is green. Phase 7 remains NOT ACCEPTED.
