# Phase 7 — `M7-22` / `M7-39` focus-parity remediation

Date: 2026-09-09
Environment boundary: TEST `alkjjbaawmsirsfvqljm` only
Class: source change + read-only browser verification — **zero TEST mutations,
zero posting RPCs**
Verdict: **`M7-22` LIVE VERIFIED (complete) · `M7-39` partially promoted — only
its focus half is evidenced**

Remediates the defect confirmed in
`2026-09-09-phase7-m7-22-focus-codex-finding.md`, found live in
`2026-09-09-phase7-m7-18-m7-22-m7-116-readonly-ui-sweep.md`.

## What was wrong

Legacy has two focus transitions the React port did not implement at all:

- `pickItem(code, keep)` — `index.html:3400`:
  `if (!keep && !OP.condSplit) $('#o-qty').focus();`
- `commitDraftLine(line)` — `index.html:3669`: `renderLines(); $('#o-item').focus();`

No `.focus()` call, `autoFocus` attribute or element ref existed anywhere in
`web/src`, and `pickItem()` had no `keep` parameter, so neither branch of either
contract was reachable. Live, the active element stayed `BODY` after every pick
and after every commit.

## The implementation

One file changed: `web/src/components/operation/OperationForm.tsx`.

Legacy could call `.focus()` synchronously because it had just written the DOM
itself. React has not rendered the picked-item block when `pickItem()` runs, so
the focus target does not exist yet. Both transitions are therefore expressed as
**element refs plus transition-scoped state**, never global selectors:

- `qtyRef` / `searchRef` — `useRef<HTMLInputElement>` passed to the existing
  `Input` component, which already forwarded refs (no change needed there). **No
  `document.querySelector`, no `getElementById`, no global DOM access.**
- `focusQtyOnRenderRef` — a one-shot flag armed **only** by an explicit combobox
  choice or by the M5-55 pending prefill actually being consumed. A post-render
  effect consumes it and applies focus **only when `showSplit` is false**. The
  flag is cleared in **both** branches, so a split pick consumes the arm without
  focusing and the intent cannot leak into a later render.
- `lastLineCountRef` — the committed-line baseline, starting at `null`. One
  effect compares `lines.length` against it: **growth is a commit** and focuses
  item search; the first render only establishes the baseline; a removal lowers
  the count and is not a commit.

### Why the commit signal is `lines.length`, not `onAddLine()`

A layered non-inbound line **leaves this component** through `onNeedsLayerPick`
and is committed later by `LayerPickDialog → confirmLayers → addLineRaw` in
`NewOperationPage`. Both routes converge on `addLineRaw`, which appends to
`lines`. Watching the committed count therefore covers the ordinary path and the
dialog-return path with one rule, and **inherently excludes** a layer dialog that
was opened but never confirmed — nothing was appended, so nothing focuses.

### How each requirement is met

| Requirement | Mechanism |
|---|---|
| Refs and scoped flags, no global selectors | `qtyRef`/`searchRef` + two refs; no `document.*` lookups added |
| Focus quantity after explicit selection, only once rendered, only when no split | flag armed in `pickItem()`, consumed by an effect keyed on `[pick, pickedItem, showSplit]` |
| M5-55 prefill behaves like `pickItem(code)` | the same flag is armed where `pendingPrefill` is consumed |
| Do not steal focus when an existing pick rerenders (`keep=true`) | the effect is gated on the flag, which an ordinary rerender never sets |
| Split ⇒ quantity unfocused and read-only | `if (showSplit) return` after clearing the flag; `readOnly={showSplit}` unchanged |
| Focus item search once after a real commit, incl. layer-dialog return | single `lines.length` growth effect |
| Never on mount, restored draft, refresh, failed validation, unconfirmed dialog | `null` baseline; growth-only comparison |
| Preserve fields, draft, request key, posting behaviour | no other logic touched; `addLineRaw`, validation, request-key invalidation and payload paths unchanged |

## Focused tests — and proof they are falsifiable

Ten tests added to `OperationForm.test.tsx`. They drive a small **controlled
wrapper**, because the file's existing `renderForm` passes a mock `onSetPick`, so
a pick never reaches the rendered state — without the wrapper the component could
never show a picked item and every focus assertion would be **vacuous**.

Positive assertions compare `document.activeElement` by **identity** against the
real element, not merely "something is focused".

| Test | Asserts |
|---|---|
| explicit pick, no split | `activeElement` **is** the quantity input; `readOnly` false |
| split pick | quantity `readOnly` true and **not** focused |
| existing pick rerenders (`keep=true`) | mount-with-pick does not focus; an unrelated field edit keeps its own focus |
| M5-55 prefill, no split | quantity focused |
| M5-55 prefill onto a split item | quantity not focused, read-only |
| ordinary commit | item search focused |
| layer-dialog return committed | item search focused after the committed line arrives |
| restored draft on mount | item search **not** focused |
| failed validation (qty 0) | item search **not** focused |
| layer dialog opened, never confirmed | item search **not** focused |

**Verified against the pre-fix code.** The original `OperationForm.tsx` was
restored and the suite re-run: **4 tests failed — exactly the four positive
focus assertions** (explicit pick, M5-55 prefill, ordinary commit, layer-dialog
return). The six negative controls passed pre-fix too, which is correct: code
that never focuses anything trivially satisfies "does not focus". That asymmetry
is the point — the positives are what the fix earns, and they fail without it.
The fix was then restored and re-verified green.

## Checks

| Check | Result |
|---|---|
| Focused tests | **10 passed** |
| Full suite | **126 files / 2718 tests passed** (2708 before; +10, no regressions) |
| `tsc --noEmit` | **clean** |
| `oxlint src` | **clean** (exit 0) |
| `vite build --mode sandbox` | **built**, 199 modules |
| `git diff --check` | **clean** |

The build's «chunks larger than 500 kB» advisory is the **pre-existing** one
already recorded in Phase 8; this change did not introduce it. `web/dist` is
git-ignored, so the build left no tracked artefact.

## Real read-only browser verification

Driven through the real React UI as the TEST admin. **Port 5175 was already
occupied by a pre-existing server; per instruction it was inspected and REUSED,
not terminated.** It was verified to serve project `alkjjbaawmsirsfvqljm`,
`ALLOW_LOCAL_WRITES=false`, **zero** occurrences of the production ref, and — via
a source marker — the edited working tree rather than stale code.

| Scenario | Observed |
|---|---|
| Normal pick (`in`, `0000001`) | focus moved `BODY` → **`INPUT[number] label="Miqdar"`**; 0 split blocks |
| Real TEST condition split (`Məxaric`, `Test Anbar`, `0000001`) | split rendered `İCARƏDƏ (MAX 0.01)` from live `stock_conditions`; quantity **read-only**; focus **`BODY`**, not quantity |
| Add one local draft line (`0000002`, qty 1) | focus moved to **`INPUT label="Mal axtar"`**; picked-item block cleared; 1 draft row |

The final document-post button was **not pressed**. A browser-level interceptor
aborted any production URL, any `post_movement_document` / `post_layer_*` /
`apply_cond_*` / `correct_document` / `cancel_document` RPC and any REST table
write; **it never fired**. Only read-only RPCs were dispatched:
`register_session`, `get_reference_values`, `get_user_directory`,
`movement_split_supported`, `stock_layers_supported`,
`get_transfer_destinations`.

The draft line exists **only in browser/local state** — it is what «Sətri əlavə
et» produces, and posting is a separate confirmed action that was never taken.

## Safety state

- **Zero TEST mutations.** Post-verification reconciliation, identical to the
  accepted Phase 8 baseline: **125 movements**, **6 items**, **2
  `stock_conditions`**, `Test Anbar / 0000001 = 8.00`, **0 negative balances**.
- Production `bbjmhaerssakbreykxiw` never contacted; no secret printed; the
  pre-existing server was left running.
- No cutover, layer deactivation, fixture, cleanup, I-10 row or `Çap` work.
- Dirty worktree preserved at **214 entries**, staged state **empty**, no commit,
  push or deploy.

## Ledger effect

- **`M7-22` → `LIVE VERIFIED`.** All six sub-assertions now hold: name, unit,
  selection hint, price-only-when-empty, balance panel, condition split, and the
  focus rule in **both** branches — quantity focused on a normal pick, and
  deliberately not focused when a split exists.
- **`M7-39` → `IN PROGRESS`, focus half only.** Deliberately **not** promoted to
  `LIVE VERIFIED`. Its contract is «pushes the line, invalidates the request key,
  clears pick/qty/unit/split/price, re-renders and refocuses the item input». Only
  the **refocus** clause is evidenced here (plus the observed pick clear). The
  request-key invalidation and the full field-clearing set are covered by existing
  unit tests but were **not** live-asserted in this sweep, and its planned test
  («request key cleared») remains without live evidence.

Phase 7 remains **INCOMPLETE and NOT `ACCEPTED`**, pending the next independent
Codex audit.
