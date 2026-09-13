# Phase 18 — TEST-only implementation and verification plan

Date: 2026-09-12 · Status: **ACCEPTED** for the implemented shell / read-only
scope (owner decision, 2026-09-12, after the independent Codex audit).

> **UPDATE — 2026-09-12 (latest).** The independent Codex audit found no
> application defect. It corrected two HARNESS defects this plan's gate had not
> caught — `window.scrollTo` errors from the new navigation side effect and
> React `act()` warnings around direct store writes — by stubbing `scrollTo` in
> `App.test.tsx` and stubbing plus wrapping both `openCard()` transitions in
> `App.shell.test.tsx`. The focused shell gate is 97/97 with no warning output.
>
> Codex also recorded that a post-fix full PARALLEL run produced five failures
> in pre-existing Phase 7/8 tests under load (timeouts, one temporarily
> non-editable input) which pass immediately in isolation at 218/218. That is a
> **load-sensitive test-runner boundary, not a Phase 18 regression and not a
> clean full-suite claim.** The §4 gate table below is corrected accordingly:
> this plan's original "full suite PASS" line described a run that predated the
> parallel-load finding.
>
> Owner decisions applied: D-P1 and D-P4 ACCEPTED, D-P3 partially complete,
> D-P2 deferred. Ten contracts transferred to the
> [authority](./2026-09-12-phase18-authority-verification-package.md) and
> [cutover](./2026-09-12-phase18-cutover-package.md) packages, all retaining
> BLOCKED.

Authoritative row statuses: [M18 ledger](../specs/2026-09-12-phase18-registry-rows.md).
Scope and defect evidence: [proposal](../specs/2026-09-12-react-migration-phase18-whole-platform-parity-proposal.md).

## 1. Safety envelope (binding)

| Rule | State in this phase |
|---|---|
| TEST project only — `alkjjbaawmsirsfvqljm` | Claude's implementation round executed no Supabase call of any kind. Codex's read-only rehearsal used TEST only (see §7). |
| Never contact production — `bbjmhaerssakbreykxiw` | Production contacts: **0**. No source or test file names it; the only occurrence in this phase is this row, which records the prohibition. |
| `VITE_ALLOW_LOCAL_WRITES=false` | Unchanged; no write window was requested or opened. |
| Do not read or modify `web/.env` | Not read, not modified. |
| Credentials process-only | No credential was used, printed, or written to any file, log or audit. |
| No mutation, fixture, import, delete, bulk egress, layer deactivation, cutover | None performed. Permanent residuals: **0**. |
| Preserve the dirty tree | Preserved. Staged files: **0**. No stage, commit, push or deploy. |
| Do not create an I-10 row | Not created. |
| Localhost runs use the pinned sandbox command | Claude started no dev server; the offline slice needed none. Codex's rehearsal used a dedicated port-5176 sandbox server, stopped afterwards with the port verified closed (§7). |

No Phase 18 row was promoted on offline evidence where a live leg was required.
Five presentation rows were subsequently promoted by Codex's EXECUTED TEST
rehearsal (§7); the remaining ten are `BLOCKED` in the authority and cutover
packages.

## 2. What was implemented

All eight defects in the proposal's table were dispositioned. Seven were
repaired; one (D5's `closeOverlays()`) was investigated and deliberately NOT
ported, with the reasoning recorded in source and in M18-22.

| Slice | Files | Rows |
|---|---|---|
| Page-switch side effects — one `go()` helper carrying scroll reset and card clear, with the «Malı redaktə et» ordering exemption | `src/App.tsx` | M18-20…M18-24 |
| Rail order — «Nomenklatura sorğuları» to its legacy second position | `src/App.tsx` | M18-01 |
| Stale «Miqrasiya» notice removed | `src/App.tsx` | M18-02 |
| Counter badges — new count-only API, `c-nom` and `c-anb` restored | `src/api/navCounters.api.ts` (new), `src/App.tsx` | M18-10…M18-14 |
| Responsive rail and burger | `src/App.tsx`, `src/index.css` | M18-30 |
| Presence chip and `initials()` | `src/App.tsx`, `src/lib/format.ts`, `src/index.css` | M18-31, M18-32 |
| `knt` report «Tam siyahı» header | `src/pages/ReportsPage.tsx` | M18-03 |

## 3. Verification strategy

### 3.1 Why two evidence layers for the responsive work

`App.shell.test.tsx` proves the burger toggles `rail`/`rail open`.
`index.css.shell.test.ts` proves that class actually does something.

Neither alone is sufficient. jsdom applies no stylesheet, so a rail that
toggles a class perfectly and still occupies a fixed 210px column on a phone
would pass every render test — this is the A04 defect class recorded in
`index.css.test.ts`, where a `.drawer` element rendered correctly in the DOM
and was unreachable in a real browser. Both layers are asserted, and M18-34
still records that neither is a substitute for rendering at a real viewport.

### 3.2 Falsifying controls

Positive claims carry a control that fails if the claim passes for the wrong
reason:

| Claim | Control |
|---|---|
| A page switch clears the open card | The card SURVIVES when the page does not change — otherwise a clear on every render would pass |
| The warehouse badge sums two legs | A non-coincidence case (2 + 5 = 7, asserted ≠ 2 and ≠ 5) |
| A failed count shows `!` | A genuine zero shows `0` and NOT `!` — the two must be distinguishable |
| The burger is revealed at the breakpoint | Outside the query it is `display:none` — otherwise an always-visible burger would pass |
| The presence chip shows the user | A second user renders different initials, asserted not to contain the first |
| The migration notice is gone | The rail still renders «Hesabatlar» and «Sistem» — the absence is not a blank rail |
| «Tam siyahı» header restored | The paired card's header is also present |

### 3.3 Defect classification discipline

Twenty-five existing tests failed after the source change. Each was classified
before anything was edited, per execution rule 11:

| Failures | Classification | Resolution |
|---|---|---|
| 17 in `App.nav.test.ts` | **Test defect.** They pin `setPage('x')` as source text — an implementation detail deliberately replaced by `go('x')`. | Updated to the new helper; two searches anchored to the rail because `go('dash')`/`go('op')` now also appear in comments and helpers above it |
| 7 in `App.test.tsx` | **Test-expectation defect.** Exhaustive label fixtures that legitimately change when the rail changes; the badge appends text to two labels. | Updated with the reason recorded inline |
| 1 in `App.test.tsx` (audit badge) | **Test-specificity defect.** `getByText('!')` was unambiguous when one badge existed; three more now share the rail. | Scoped to the «Audit jurnalı» link — querying the document would pass on any badge and prove nothing about this one |
| 2 in the new `App.shell.test.tsx` | **Harness defect,** then **my own test defect:** `registerSession` unmocked; then `getByText('Nomenklatura', {exact:false})` became ambiguous precisely because M18-01 moved «Nomenklatura sorğuları» adjacent to it. | Mock added; matcher tightened |

**No application source was changed to make a test pass.** The only source
changes are the seven repairs in §2.

## 4. Gate results

| Gate | Result |
|---|---|
| Focused Phase 18 tests | PASS — `App.shell.test.tsx` 14, `navCounters.test.ts` 8, `index.css.shell.test.ts` 8, `format.test.ts` 20, `ReportsPage.test.tsx` 29 |
| Full suite | **CORRECTED — not a clean claim.** The pre-audit run passed 208 files / 4366 tests (baseline 205 / 4330). Codex's post-harness-fix PARALLEL run produced five failures in pre-existing Phase 7/8 tests under load; the same three files pass in isolation (218/218). Recorded as a load-sensitive runner boundary, not a Phase 18 regression |
| Focused shell gate (post-audit) | PASS — 97/97, no warning output, after the Codex harness fixes |
| `tsc -b --noEmit` | PASS (exit 0) |
| `oxlint src` | PASS — 4 warnings, all pre-existing `only-export-components` in files this phase did not touch. **No new warnings.** |
| `vite build --mode sandbox` | PASS |
| `git diff --check` | PASS (exit 0) |
| Staged files | 0 |
| Ledger ids unique, mechanically counted | PASS — 42 unique, 0 duplicates, 0 unclassified |
| Markdown tables structurally valid | PASS — every table's column count is uniform |
| `tools/ledger-check.mjs` (Phase 9) | PASS — 124 rows, unaffected |
| Production contacts | 0 |
| Dirty tree preserved | Yes |

## 5. Explicitly untested boundaries

These are claims Phase 18 does **not** make. All ten are `BLOCKED` and live in
the [authority](./2026-09-12-phase18-authority-verification-package.md) and
[cutover](./2026-09-12-phase18-cutover-package.md) packages:

- No RLS policy, grant, function body or server refusal was exercised (M18-43).
  The rail's role behaviour is a client affordance only — and the admin/anbardar
  rehearsal did not change that, because a rendered screen is not a server
  decision.
- No realtime event was received from a server (M18-41).
- No rehber session was run, so `azpCanRead` was never discriminated from
  `isAdmin` live (both admin and anbardar pass both predicates).
- **Corrected:** the React layout WAS rendered at 800×700 and 1200×800 by
  Codex, which promoted M18-34. Legacy was not rendered beside it, so
  side-by-side visual parity (M18-55) remains unproved.
- No export was produced or compared against the Excel specification (M18-45).
- No cross-module live dataset read was performed (M18-46). The rehearsal's
  balance/dashboard agreement is one screen pair in one session.
- No stale-session or token-refresh window was observed (M18-57).
- Nothing about cutover, retirement or deployment was executed (M18-60…M18-63).

## 6. Owner decisions — resolved 2026-09-12

| Id | Outcome | Effect |
|---|---|---|
| D-P1 | **ACCEPTED — no «Kontragentlər» rail entry** | M18-52, M18-53 → `ACCEPTED`; `c-knt` fetch removed from `navCounters.api.ts` (M18-14), because with the entry declined the count had no consumer |
| D-P4 | **ACCEPTED — badges intentionally omitted** | M18-15 → `ACCEPTED`; no whole-platform boot load introduced |
| D-P3 | **PARTIALLY COMPLETE** | Codex's TEST admin/anbardar read-only rehearsal promoted M18-01, M18-02, M18-30, M18-31, M18-34 to `LIVE VERIFIED`. Remaining legs → authority package |
| D-P2 | **DEFERRED** | M18-60…M18-63 → cutover package; legacy not retired, nothing deployed |

None remains open. Acceptance covers the implemented shell / read-only scope
only, and confers no authority over the transferred contracts.

## 7. Live evidence preserved (Codex rehearsal, 2026-09-12)

Recorded here so it is not re-run. One TEST admin and one TEST anbardar session
through the real React UI:

- at 800×700 the rail was off-canvas, the burger opened it, and real navigation
  to «Anbar qalıqları» closed it; at 1200×800 the desktop rail returned;
- both roles showed the presence chip and the corrected rail with no stale
  migration notice;
- live badges displayed 6 nomenclature rows and 5 combined warehouse/location
  rows;
- the balance screen showed 1 position, quantity 8.00, value 80.00 ₼,
  consistent with the dashboard in the same session.

Both sessions ended through «Çıxış». The dedicated port-5176 sandbox server was
stopped and the port verified closed. No mutation, fixture, import, egress,
deployment or production contact occurred.

**What it did NOT prove:** the badge values do not prove `head:true`; admin and
anbardar cannot discriminate `azpCanRead` from `isAdmin` because both pass both;
and no rehber session was run.
