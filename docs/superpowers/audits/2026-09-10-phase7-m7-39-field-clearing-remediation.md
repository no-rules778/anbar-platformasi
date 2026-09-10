# Phase 7 — M7-39 field-clearing remediation

Date: 2026-09-10
Scope: the field-clearing defect raised by
`2026-09-10-phase7-commit-signal-codex-reaudit.md`.
Environment: TEST `alkjjbaawmsirsfvqljm` only. `VITE_ALLOW_LOCAL_WRITES=false`.
Phase 7 remains **NOT ACCEPTED** pending independent Codex audit.

## Finding addressed

The accepted explicit `commitSignal` moved focus but cleared almost nothing.
Two concrete defects:

1. **Header «Qiymət» (`pr`) was never cleared.** The earlier live audit observed
   it retaining `10` after a commit and recorded that as "retained by design".
   That was wrong: legacy `commitDraftLine()` runs `$('#o-price').value = ''`
   (`index.html:3668`) alongside clearing item, unit, quantity and split, and
   M7-39 requires clearing `pick/qty/unit/split/price`.
2. **On the confirmed layer-dialog route, local quantity/split were only
   HIDDEN.** That route leaves `OperationForm` through `onNeedsLayerPick`, so
   the `onCommitLine()` call site — the only place that cleared quantity — never
   ran. The page then nulls `pick`, which unmounts the quantity and split
   controls while their state survives inside the still-mounted form. Picking a
   second item remounts them holding the previous line's values. **Hidden is not
   cleared.**

The `commitSignal` design itself was accepted and is unchanged.

## Change

`OperationForm.tsx` — the commit-signal effect is now the **single post-commit
transition**. On a forward step of the signal it clears, in order: search query,
quantity, condition split, line error, line warning, and the inbound header
price (`onSetHeaderField({ pr: '' })`, guarded on `kind === 'in'` so a
non-inbound commit does not issue a no-op write); then it focuses item search.

The redundant `setQty('')` at the ordinary `onCommitLine()` call site was
removed — clearing now happens in one place that covers both routes.

Deliberately unchanged: the signal's ownership and advance points in
`NewOperationPage`; the M7-22 quantity-focus behaviour; and every other header
field (date, warehouse, type, destination, partner, channel, contract, invoice,
note), which legacy keeps for the next line of the same document.

Exclusions hold by construction: restore, bulk application, edit hydration,
refresh, removal/clearing, failed validation and an opened-but-unconfirmed
dialog never advance the signal, so none of them clear anything.

## Falsifiability — proven before the fix

4 tests added in a new `post-commit field clearing (M7-39)` block. Run against
the pre-fix tree, **3 of 4 failed**, each reproducing a named defect:

| Test | Pre-fix result |
| --- | --- |
| ordinary commit clears price/qty/pick, then focuses search | **FAIL** — `expected "" / received 12` |
| unrelated header fields byte-identical across a commit | **FAIL** — price `10` retained |
| confirmed layer commit + second pick starts empty | **FAIL** — `expected '7' not to be '7'` (stale quantity resurrected) |
| restored draft does NOT clear price or focus | PASS (guards against over-clearing; passes both before and after) |

All 4 pass after the fix.

## Verification

| Check | Result |
| --- | --- |
| Focused `OperationForm` + `NewOperationPage` | **143/143** passed (139 + 4 new) |
| Full suite | 126 files / **2723** tests passed (2719 + 4) |
| `tsc --noEmit` | clean (exit 0) |
| `oxlint` | clean (exit 0) |
| Sandbox production build | ✓ 199 modules, large-chunk advisory only (known, non-fatal) |
| `git diff --check` | exit 0 (16 lines, all pre-existing CRLF advisories; zero whitespace errors) |

## Live browser re-check — NOT EXECUTED

The three required read-only browser checks were **not** run. The Playwright +
installed-Chrome harness works and the sandbox server on 127.0.0.1:5175 was
reachable (HTTP 200, `.env.sandbox.local` pinned to TEST `alkjjbaawmsirsfvqljm`
with `VITE_ALLOW_LOCAL_WRITES=false`), but the login form could not be
authenticated: the prior harness read the TEST admin password from
`process.env.ANBAR_TEST_PASSWORD`, which is **not set in this session**, and no
saved Playwright storage state exists. The probe reached the login screen and
stopped there — `localStorage` held only `anbar_device_id`, and zero
`/auth/v1/` responses were recorded.

No live result is claimed for the clearing behaviour. Nothing was mutated: the
run never reached the operation form, «Sənədi qeyd et» was never pressed, and
the blanket production-ref abort guard was armed throughout.

To complete this, set `ANBAR_TEST_PASSWORD` for the TEST admin
`anbar-admin-test@example.com` and re-run the probe; the required assertions are
(a) ordinary local commit clears visible price/pick/quantity and focuses search,
(b) a confirmed local layer line followed by another pick does not resurrect the
old quantity/split, (c) zero mutation RPCs.

The **M7-22 live result** and the **M7-39 / M7-38 scoped live evidence** from
2026-09-09 are unchanged and were not re-driven — application behaviour they
covered (quantity focus, refocus-after-commit, dialog routing) is untouched by
this change.

## Documentation

- Registry M7-39 text rewritten: the stale `lines.length` explanation and the
  false "retained by design" price claim are both preserved as explicitly
  superseded history beside the accepted `commitSignal` + clearing contract.
- `2026-09-09-phase7-m7-39-commit-signal-remediation.md`: the retained-price
  bullet is struck through with a correction note; the pre-fix live measurement
  is kept as historical evidence.
- **M7-38 reconciled** — ledger `NOT STARTED` vs. the audit's live claim is
  resolved to `IN PROGRESS (narrow)`, recording only the outbound active-layer
  single-line dialog-routing / unconfirmed-close branch. The split check,
  `validateOpLine` clamp/`warn`, inbound non-routing and inactive-layer branches
  are explicitly not claimed.

## Status

`M7-22` remains **LIVE VERIFIED**. `M7-39` remains **IN PROGRESS** — the
clearing contract has unit evidence only, with no live assertion. Phase 7
remains **NOT ACCEPTED**.
