# Phase 7 — Codex finding: M7-22/M7-39 focus parity

Date: 2026-09-09
Verdict: **CONFIRMED DEFECT — remediation required**

Codex independently compared the browser finding, legacy implementation and
React source. Legacy `pickItem(code, keep)` focuses `#o-qty` only when `keep`
is false and no condition split exists (`index.html:3390-3401`). Legacy
`commitDraftLine()` clears the line form and focuses `#o-item`
(`index.html:3659-3670`).

React `OperationForm.pickItem()` updates the pick/query/split/errors and price
but performs no focus operation. No ref, `.focus()` or `autoFocus` exists on
the relevant controls. The post-commit path clears quantity, while the store
clears `pick`, but likewise never restores focus to item search. The reported
`BODY` active element is therefore consistent with source and is not an
approved deviation.

Remediation must cover both contracts without stealing focus on ordinary
rerenders:

- after an explicit item choice (and after the M5-55 pending prefill resolves),
  focus quantity only when the resolved item has no active condition split;
- do not focus quantity merely because an existing pick rerendered — the legacy
  `keep=true` path;
- after a draft line is actually committed, including the layer-dialog return
  path, focus item search once; do not trigger on initial/restored lines.

Use element refs and transition-scoped effects/flags, not global DOM selectors.
Add focused tests with a falsifiable positive focus assertion and negative
split/keep controls. M7-22 and M7-39 must not be promoted until code checks and
real browser verification pass. Phase 7 remains NOT ACCEPTED.
