# Phase 7 — Codex re-audit of commit-signal correction

Date: 2026-09-10
Verdict: **commit signal accepted; M7-39 field clearing still defective**

The missing test prop is fixed at the sole incomplete direct caller. Codex
checked all six `OperationForm` constructions and independently ran:

- focused `OperationForm` + `NewOperationPage`: 139/139 passed;
- complete suite: 126 files / 2719 tests passed;
- typecheck, oxlint and sandbox production build: passed;
- `git diff --check`: passed; staging empty.

The explicit monotonic commit signal and post-mount restored-draft regression
are accepted. The previous length-based ambiguity is closed.

## New confirmed finding — price and local line state are not cleared

The live audit records that header «Qiymət» remains `10` after a local line
commit and labels that retention “by design”. That conflicts with both primary
sources:

- legacy `commitDraftLine()` explicitly executes `$('#o-price').value = ''`
  (`index.html:3659-3670`);
- M7-39 explicitly requires clearing `pick/qty/unit/split/price`.

No approved deviation permits retaining price. React `addLineRaw()` clears the
store pick/request key but not `header.pr`; `OperationForm` clears quantity only
on the direct ordinary route. On the confirmed layer-dialog route, local
quantity/split state can disappear because `pick` becomes null while remaining
stored inside the mounted form, which is not proof that it was cleared.

Use the accepted explicit commit signal as the single post-commit transition:
clear query, quantity, split, line error/warning and inbound price, then focus
item search. This must run for both ordinary and confirmed single-layer commits,
but never restore, bulk, removal, refresh, validation failure or an unconfirmed
dialog. Preserve all other header fields. Add positive tests for price clearing
and for stale local quantity/split not reappearing after a layer commit and a
subsequent pick. Prove the positive assertions fail against the current tree.

## Documentation reconciliation

The M7-39 ledger text still says `lines.length` drives focus and must be updated
to the accepted explicit signal. M7-38 remains `NOT STARTED` in the ledger even
though the latest audit claims narrow live evidence; either record that exact
partial branch or withdraw the promotion. Do not leave the contradiction.

M7-22 remains LIVE VERIFIED. M7-39 remains IN PROGRESS and Phase 7 remains NOT
ACCEPTED.
