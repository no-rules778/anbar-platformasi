# Phase 7 — read-only real-UI sweep: `M7-18`, `M7-22`, `M7-116`

Date: 2026-09-09
Environment boundary: TEST `alkjjbaawmsirsfvqljm` only
Class: read-only browser verification — **zero TEST mutations, zero posting RPCs**
Verdicts: **`M7-18` LIVE VERIFIED · `M7-116` LIVE VERIFIED · `M7-22` PARTIAL —
five of six sub-assertions live verified, the focus rule is an unimplemented
parity gap and is NOT promoted**

Executed after `2026-09-09-phase7-m7-123-codex-review.md`, which named this sweep
the next lowest-cost evidence and required each row be asserted against its own
Phase 7 contract rather than inherited from Phase 8. No Phase 8 evidence is
reattributed here.

## Method

Real Chrome (installed browser) driving the real React app served by
`npm run dev -- --mode sandbox`, logged in as the TEST admin through the actual
login form. The served client was verified to carry project ref
`alkjjbaawmsirsfvqljm` and `ALLOW_LOCAL_WRITES=false`, with **zero** occurrences
of the production ref `bbjmhaerssakbreykxiw` in the served module.

A request interceptor enforced the boundary in the browser itself: any URL
containing the production ref, any `post_movement_document` / `post_layer_*` /
`apply_cond_*` / `correct_document` / `cancel_document` RPC, and any
`POST/PUT/PATCH/DELETE` to a REST table were **aborted before dispatch**. The
guard never fired, which is itself the evidence that none was attempted.

Note on the dev server: port 5175 was already occupied by a pre-existing server,
so Vite bound **5176**. Both were checked and both serve the TEST project with
writes disabled; the sweep used 5176 exclusively.

## `M7-18` — Unit field · **LIVE VERIFIED**

Contract (`index.html:3285, 3395`): the unit is read-only and comes from the
nomenclature.

Three items were selected in turn through the real combobox, giving the
**falsifiable control** the task required — the TEST catalogue carries three
distinct units:

| Item | Nomenclature unit | Unit shown in the form | Element | contentEditable |
|---|---|---|---|---|
| `0000001` TEST Mal 1 | `ədəd` | `ƏDƏD` | `SPAN` | false |
| `0000002` TEST Mal 2 | `kg` | `KG` | `SPAN` | false |
| `0000003` LIVE TEST Mal EDITED | `metr` | `METR` | `SPAN` | false |

The displayed unit **tracked the nomenclature on every change**, so the field is
sourced from the catalogue and not from a stale or hardcoded value. Read-only is
satisfied **structurally and more strongly than the legacy contract**: the React
port renders the unit as non-editable text, not as a `readOnly` input. The
enclosing `Miqdar` label contains exactly one `input` — the quantity — so there
is no unit input to edit at all. Casing is a CSS presentation transform, not a
data difference.

## `M7-116` — «Yeni əməliyyat» from Mal hərəkəti · **LIVE VERIFIED**

Contract (`index.html:321`, `data-goto="op"`): the movements screen's primary
button navigates to the operation screen. Phase 7 owns the navigation contract.

Started from the **real Mal hərəkəti screen**, then clicked the **real in-page
«Yeni əməliyyat» primary action** — explicitly resolved as the button *outside*
`nav.rail`, so the rail entry could not be mistaken for it (both carry the same
label; this ambiguity broke an earlier selector and was fixed rather than worked
around).

Observed on a **clean session** (Mal hərəkəti as the first screen visited):

- navigated to `Yeni əməliyyat` (`h2` confirmed);
- **no prefill** — no picked-item block, item search empty, `Qaimə №` empty,
  `Qiymət` empty;
- **no edit mode** — no edit banner, no correction wording;
- **no submission** — zero writes, zero posting RPCs;
- returning to Mal hərəkəti left the table **byte-identical** (`3` operational
  rows before and after; full table text compared, not just the count).

**Negative control (required, and it passed).** The same assertions were run
against the Nomenklatura → «Bu mal üzrə əməliyyat» transition, which *does*
prefill by contract (`M5-55`). There the picked-item block was **1** and showed
`TEST Mal 1 (0000001)`. The assertions therefore genuinely detect a prefill, so
the `0` on the Mal hərəkəti path is real evidence rather than a blind selector.

**Honest qualification.** In one consolidated run the picked-item block read `1`
on arrival — because that run had already picked items on the operation screen
earlier in the same session, so the store still held a pick. That is pre-existing
session state, not something the navigation carried. The contract was therefore
judged on the clean-session run, where it is `0`. Recorded rather than discarded.

The `3` visible rows are the movements screen's own operational filtering of the
125 stored rows (net-zero fixtures posted and reversed), consistent with the
accepted Phase 8 behaviour. The before/after comparison is what this row needs,
and it is unchanged.

## `M7-22` — Pick item · **PARTIAL**

Contract (`index.html:3390-3401`): fills name, unit, selection hint, price **if
empty**, balance panel and condition split; **focuses quantity unless `keep` or a
split exists**.

| Sub-assertion | Result | Evidence |
|---|---|---|
| Fills item name | **PASS** | picked block shows `TEST Mal 1 (0000001)` |
| Fills unit | **PASS** | see `M7-18` |
| Selection hint | **PASS** | «name (code)» rendered on pick, absent before |
| Price only when empty | **PASS — with a real control** | seeded `10` from `0000001`; then picking `0000002` (price 12.5) and `0000003` (price 7.25) left it **`10`**. The guard genuinely tests emptiness rather than overwriting |
| Balance panel | **PASS** | `Mal seçilməyib.` before → `Test Anbar 8.00` after, the true live balance. A second item with no movements correctly showed `Bu mal üzrə hələ hərəkət yoxdur.` |
| Condition split | **PASS — live TEST data** | on `Məxaric` + `Test Anbar` + `0000001`, the split rendered `YARARSIZ (MAX 0)`, `TƏMIRƏ EHTIYACLI (MAX 0)`, `SAHƏDƏ (MAX 0)`, **`İCARƏDƏ (MAX 0.01)`** — exactly the live `stock_conditions.icare_qty` 0.01. Quantity correctly became read-only |
| **Focus rule** | **FAIL — not implemented** | see below |

### The focus rule is an unimplemented parity gap

After every pick — with and without a split — the active element remained
`BODY`. Quantity was never focused.

This is **not a harness artifact**. A positive control proved focus is fully
observable here: an explicit `.focus()` on the search input reported
`INPUT ph="min. 2 hərf"`, and focusing the quantity input reported
`INPUT/number`. The harness sees focus; the application never sets it.

Static confirmation: **no `.focus()` call and no `autoFocus` attribute exists
anywhere in `web/src`** (excluding tests), and React's `pickItem()` has **no
`keep` parameter** — so neither branch of «focuses quantity unless `keep` or a
split exists» is implemented. Legacy `index.html:3400` is unambiguous:
`if (!keep && !OP.condSplit) $('#o-qty').focus();`.

The split branch («do NOT focus when a split exists») is satisfied only
**vacuously** — nothing is ever focused, so the exception cannot be
distinguished from the rule. Vacuous satisfaction is not evidence, and is not
claimed as a pass.

No deviation for this behaviour was ever recorded in the Phase 7 proposal or
ledger, so this is a **genuine unrecorded parity gap**, not an approved
simplification. `M7-22` therefore stays open on this one sub-assertion. It is a
UI-affordance defect only: no data, permission or write path is involved, and
nothing else in the row is weakened by it.

**No data was created to force any branch.** Every branch above was reached with
existing TEST data; the one branch that could not be reached honestly is reported
as failing rather than manufactured.

## Safety state

- Environment guard verified before driving the UI; production **never
  contacted** (interceptor armed for it; never fired). No secret printed.
- **Zero TEST mutations.** Only read-only RPCs were dispatched:
  `register_session`, `get_reference_values`, `get_user_directory`,
  `movement_split_supported`, `stock_layers_supported`,
  `get_transfer_destinations`. No `post_*`, `apply_*`, `correct_*` or `cancel_*`.
- Post-sweep reconciliation, identical to the accepted Phase 8 baseline:
  **125 movements**, **6 items**, **2 `stock_conditions`**,
  `Test Anbar / 0000001 = 8.00`, **0 negative balances**.
- No cutover, layer deactivation, fixture, cleanup, I-10 row or `Çap` work.
- No application source changed — harness scripts live only in the scratchpad —
  so the automated suite was deliberately not re-run. Dirty worktree preserved at
  **214 entries**, staged state **empty**, `git diff --check` clean.

## Ledger effect

- `M7-18` → **`LIVE VERIFIED`**
- `M7-116` → **`LIVE VERIFIED`**
- `M7-22` → **`IN PROGRESS`** — five of six sub-assertions live verified; the
  quantity-focus rule is unimplemented in both its branches and is **not**
  promoted.

Phase 7 remains **INCOMPLETE and NOT `ACCEPTED`**, pending independent Codex audit.

## Continuation attempt — `M7-94`, stopped at an observation boundary

After the three rows above, the next cheapest candidate was assessed:
**`M7-94`** («with layers active, a posted document is not edited directly —
refuse with the toast», tests: *refusal before any RPC*). It is attractive because
layers are active and `postDocument()` returns the refusal
(`Partiya uçotunda keçirilmiş sənəd birbaşa dəyişdirilmir — ...`) **before any RPC
is dispatched**, so exercising it needs no write.

Reaching it requires entering edit mode, which is only offered from the movements
screen's «Baxış» document-inspection dialog (an `M8-*` affordance). Probed
read-only three times: the three «Baxış» buttons are present, but clicking the
first opened **no dialog** — body text length identical before and after
(1068 chars), no `sənədi` heading, button list unchanged, and **no new RPC
dispatched** beyond the boot reads.

**Not reported as a Phase 7 defect, and not pursued further.** `M7-94`'s contract
is the refusal, not the dialog that leads to it, and the affordance in question
belongs to accepted Phase 8 scope. The observation could equally be a harness
interaction detail (the row action may need a different event or an enabling
precondition) as an application issue, and this sweep is not authorised to change
source or to diagnose Phase 8 UI. It is recorded so the next session starts from
it rather than rediscovering it:

- `M7-94` stays **`NOT STARTED`**;
- reaching it needs either a confirmed route into edit mode from the real
  «Baxış» dialog, or an owner decision that the refusal may be evidenced by a
  narrower route;
- nothing about it was written, forced or fabricated.

Zero mutations across all probes; the post-sweep reconciliation above still holds
(**125 movements, 6 items, 2 `stock_conditions`, 4 users**, balance 8.00, 0
negatives).

