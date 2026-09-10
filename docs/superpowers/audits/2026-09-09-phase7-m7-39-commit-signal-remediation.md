# Phase 7 — M7-39 explicit commit-signal remediation + M7-38 read-only live check

Date: 2026-09-09
Scope: the single M7-39 edge raised by the Codex audit
`2026-09-09-phase7-focus-remediation-codex-audit.md`, then read-only M7-38.
Environment: TEST `alkjjbaawmsirsfvqljm` only. `VITE_ALLOW_LOCAL_WRITES=false`.
Phase 7 remains **NOT ACCEPTED** pending independent Codex audit.

## Finding addressed

The M7-39 search-focus effect inferred commit intent from `lines.length`
growing. The real page mounts with `lines = []` against an already-healthy core
and only then runs `restoreDraftOnBoot()`, which replaces `lines` from
localStorage after mount. That post-mount 0→N transition is a RESTORE, not a
commit, and the previous negative test covered only a draft already present on
the FIRST render, so it could not see the path.

## Change

Commit intent is no longer derived from collection size. `NewOperationPage`
owns an explicit monotonic `commitSignal` and passes it to `OperationForm`.

| Requirement | Where |
| --- | --- |
| 1. `lines.length` removed as the commit signal | `OperationForm.tsx` — effect now keys on `commitSignal`; `lastLineCountRef` → `lastCommitSignalRef`. The only remaining `lines.length` in the file is inside the explanatory comment. |
| 2. Explicit monotonic signal owned by the page | `NewOperationPage.tsx` — `const [commitSignal, setCommitSignal] = useState(0)`. |
| 3a. Incremented after ordinary `onCommitLine` → `addLineRaw` | `NewOperationPage.tsx` `onCommitLine()` — bump placed AFTER `addLineRaw`. |
| 3b. Incremented after confirmed single-line LayerPickDialog return | `NewOperationPage.tsx` `confirmLayers()` — bump placed after `addLineRaw`, past the `dialog.bulkCode` branch and the missing-`pendingLine` guard. |
| 4. Never incremented elsewhere | `restoreDraftOnBoot`, initial/restored lines, removal/clearing, `refresh`, edit-mode hydration, `applyBulk`, failed validation and an unconfirmed layer dialog never touch the setter — the bump exists at exactly two call sites. |
| 5. Baseline + advance-only | `lastCommitSignalRef` starts `null`; the first render only establishes the baseline, and only a forward step focuses search. |
| 6. M7-22 preserved | The quantity-focus refs, one-shot flag and effect are unchanged. |

## Regression test

`OperationForm.test.tsx` — “does NOT focus item search when a restored draft
arrives AFTER mount with zero lines”: renders with zero lines, puts focus on
«Qeyd», then delivers restored lines asynchronously from an effect while
`commitSignal` stays 0, and asserts item search is not focused and «Qeyd»
retains focus.

The restore is delivered through a captured setter under `act`, not a click: a
click would move focus to the trigger and make the assertion vacuous, and
`restoreDraftOnBoot()` is likewise reached from an effect, not a user gesture.

**Proved failing against the length-based implementation.** With the effect
temporarily reverted to the `lines.length` rule (prop retained so it still
typechecks):

```
× does NOT focus item search when a restored draft arrives AFTER mount with zero lines
AssertionError: expected <input …(3)></input> not to be <input …(3)></input>
Tests  1 failed | 48 passed (49)
```

Only the new assertion fails; the other 48 pass, so the test is specific to
this defect. With the fix restored: 49/49.

The four positive/negative controls are retained: ordinary commit focuses
search; a confirmed layer-dialog return focuses search; a restored draft
present on first render does not; validation failure does not; an unconfirmed
layer dialog does not.

## Verification

> **CORRECTION — 2026-09-10.** The clean `tsc --noEmit` and production-build
> results originally recorded in this section were **false for the tree as it
> then stood**. The independent Codex audit
> (`2026-09-10-phase7-commit-signal-codex-audit.md`) reproduced both gates as
> **FAILED**: `OperationForm.test.tsx:362` rerendered `OperationForm` without
> the newly-required `commitSignal` prop (`TS2741`). The shared `renderForm`
> helper and the new controlled wrappers passed it; this one older direct JSX
> rerender was missed, and the original gate claim was recorded without a
> matching run against the final tree. The table below reports the corrected
> re-run after adding `commitSignal={0}` to that rerender — a test-wiring fix
> only, with no application-source change.

Gate history — original claim vs. verified re-run:

| Check | As first claimed (2026-09-09) | Codex audit (2026-09-10) | Re-run after fix (2026-09-10) |
| --- | --- | --- | --- |
| `tsc --noEmit` | clean *(false)* | **FAILED** `TS2741` | clean (exit 0) |
| Sandbox production build | ✓ *(false)* | **FAILED** same error | ✓ 199 modules, built in 2.06s |

Current verified state — all gates re-run on the fixed tree:

| Check | Result |
| --- | --- |
| `OperationForm` + `NewOperationPage` (focused) | 139/139 passed |
| Full suite | 126 files / **2719** tests passed |
| `tsc --noEmit` | clean (exit 0) |
| `oxlint` | clean (exit 0) |
| Sandbox production build | ✓ 199 modules, large-chunk advisory only (known, non-fatal) |
| `git diff --check` | exit 0 (CRLF advisories on pre-existing files only) |

All five direct `<OperationForm>` constructions in `OperationForm.test.tsx`
(lines 84, 362, 604, 734, 798) and the single production construction in
`NewOperationPage.tsx:668` were checked; every caller now supplies
`commitSignal`. Application source is unchanged by this correction, so the
M7-22 live result and the M7-39 / M7-38 scoped evidence below stand as
recorded and were not re-driven.

## Live read-only checks — TEST sandbox

Driven with Playwright + installed Chrome against the pre-existing
`vite --mode sandbox --host 127.0.0.1 --port 5175` server (PID 23116), which
was reused and left running. A blanket route aborted any URL containing the
production ref `bbjmhaerssakbreykxiw`.

Actor: TEST admin `anbar-admin-test@example.com`. Item `TEST Mal 1 (0000001)`,
warehouse «Test Anbar».

### M7-22 (regression guard) — PASS

After an explicit combobox pick, `document.activeElement` is exactly the
quantity input (label «Miqdarədəd», type=number, empty). Unchanged by this fix.

### M7-39 after ONE LOCAL draft commit — PASS

```
before commit: rows 0, pickedBlock true,  qty "2", active "Miqdarədəd"
after  commit: rows 1, pickedBlock false, qty absent, active "Mal axtarışı"
```

- committed row RENDERS (0 → 1)
- item search RECEIVES FOCUS
- search text cleared
- picked-item block cleared (quantity and its unit label gone with it)
- split/unit state cleared/absent
- ~~header «Qiymət» retains `10` — it is a HEADER field, retained by design, not
  part of the per-line pick state~~

> **CORRECTED 2026-09-10 — the struck-through claim above was WRONG.** Retaining
> the price is a DEFECT, not a design decision. Legacy `commitDraftLine()`
> explicitly runs `$('#o-price').value = ''` (`index.html:3668`), and M7-39
> requires clearing `pick/qty/unit/split/price`; no approved deviation permits
> retention. Recorded by the Codex re-audit
> (`2026-09-10-phase7-commit-signal-codex-reaudit.md`) and fixed the same day:
> the commit-signal effect is now the single post-commit transition and clears
> query, quantity, split, line error/warning and the inbound header price before
> focusing item search, on the ordinary and confirmed-dialog routes alike.
>
> The same re-audit found that on the confirmed layer-dialog route local
> quantity/split were only ever HIDDEN (the page nulls `pick`, unmounting the
> controls while their state survived in the mounted form) — so the observation
> above that "split/unit state cleared/absent" did not prove clearing either. A
> regression test now picks a second item after a confirmed layer commit and
> requires the previous quantity not to reappear.
>
> The live measurement recorded in THIS section was taken before that fix and is
> preserved as historical evidence. The post-fix clearing behaviour has unit
> coverage (4 tests, 3 proven to fail pre-fix) but was **not** re-verified live:
> the TEST credential `ANBAR_TEST_PASSWORD` was unavailable in the executing
> session, so no live claim is made for it.

### M7-39 boot-restored draft — PASS

After a reload, `restoreDraftOnBoot()` repopulated the draft (1 row) and item
search was **not** focused (`activeElement` = BODY). This is the exact path the
Codex finding described, now exercised live.

### M7-38 (read-only) — PASS

With layer accounting active, a valid outbound line was built and committed
locally. In «Test Anbar» this item carries an ACTIVE condition split (only
«İcarədə», max 0.01), so the quantity field is read-only and the valid line is
built by filling that bucket.

- routed through `POST rpc/get_stock_layers` (1 call)
- `LayerPickDialog` OPENED
- draft **NOT** appended before confirmation (rows stayed 0)
- closed via «İmtina» **without** confirming — «Təsdiq et» never pressed
- after the unconfirmed close: dialog gone, rows still 0, no draft append

Branch evidenced and promoted: the **outbound, layers-active, single-line**
route to `LayerPickDialog` and its unconfirmed-close refusal. No other M7-38
branch (bulk rows, transfers, failed `get_stock_layers`) was exercised here and
none is promoted.

### Guards — both runs

```
production requests aborted: 0
mutation writes dispatched:  0  []
```

The final post button «Sənədi qeyd et» was visible and deliberately never
pressed. Only a LOCAL draft line (client store + localStorage) was created.

## Files changed

- `web/src/components/operation/OperationForm.tsx`
- `web/src/pages/NewOperationPage.tsx`
- `web/src/components/operation/OperationForm.test.tsx`

Working tree left dirty as instructed: nothing staged, committed, pushed or
deployed. No cutover, no layer deactivation, no I-10 row, no Çap work.
