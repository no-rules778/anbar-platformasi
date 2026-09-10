# Phase 7 — Codex audit of M7-22/M7-39 focus remediation

Date: 2026-09-09
Verdict: **M7-22 implementation direction passes; one M7-39 edge remains**

The refs and one-shot quantity-focus flag correctly implement explicit pick,
M5-55 prefill, split refusal and keep/rerender behaviour. Codex independently
ran the focused file (48/48), full suite (126 files / 2718 tests), typecheck,
oxlint and the production-optimised sandbox build; all passed. Existing React
`act(...)` warnings and the large-chunk advisory remain non-fatal.

## Finding — restored-draft growth is indistinguishable from a commit

The M7-39 search-focus effect treats any `lines.length` increase after the
first `OperationForm` render as a committed line. Its negative test covers only
a draft already present on the first render. The real page can mount against an
already-healthy core with `lines=[]`; the parent `useEffect` then calls
`restoreDraftOnBoot()`, which replaces `lines` from localStorage after mount.
That 0→N transition satisfies the current `lines.length > prev` test and can
focus item search even though no line was committed. This violates the stated
requirement not to focus on restored-draft loading.

Do not infer commit intent from collection size. Pass an explicit monotonic
commit signal from `NewOperationPage` to `OperationForm`, incremented only
after the two single-line commit points: ordinary `onCommitLine` and confirmed
single-line `LayerPickDialog` return. Draft restoration, removal, bulk updates,
refresh and edit-mode hydration must not increment it. Key the focus effect on
that signal and establish its initial value as a baseline.

Add a regression test where the component first renders with zero lines and
then receives restored lines asynchronously; item search must retain the user's
existing focus / must not be focused. The test must fail under the current
length-based implementation. Retain the four positive focus controls.

M7-22 may retain its completed live evidence because this finding affects only
post-commit search focus. M7-39 remains IN PROGRESS. Phase 7 is NOT ACCEPTED.
