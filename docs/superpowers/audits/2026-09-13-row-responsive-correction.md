# Responsive `.row` correction — 2026-09-13

Corrects one conclusion from the authenticated-live route sweep. The two CSS
fixes that sweep produced are preserved unchanged; this adds a third, narrower
one and records honestly what was and was not browser-falsified.

## 1. The conclusion being corrected

The sweep reported the `.row` mobile-legibility hypothesis as falsified, on two
grounds that do not support it:

- **Absence of horizontal overflow was read as proof of usable rendering.** It
  is not. A row can sit inside the viewport while its fields are too narrow to
  read or its values are clipped.
- **The populated five-column «Sərfiyyat Materialları» filter row never
  mounted.** No eligible TEST data reached it, so the browser never rendered
  it. An unmounted component cannot falsify anything.

**Status: the hypothesis was NOT falsified. Measurement has now confirmed it
for the five-column rows and refuted it for the three-column rows.**

## 2. Method

jsdom applies no stylesheet and has no layout engine, so no vitest test in this
repo can measure a width. Measurements were taken in **real Chrome via
Playwright at 390×844**, against the shipped `web/src/index.css`, on synthetic
fixtures carrying markup copied verbatim from the components — including the
populated five-column row that never mounted live. Selects carry real option
text so intrinsic widths are the real ones. Each fixture is wrapped in `.main`,
which supplies the phone padding that decides available width.

Read-only: no network, no TEST contact, no writes outside the repo files listed
in §6.

## 3. Measurements at 390px — shipped CSS, before the fix

| Fixture | Row | Doc width | Fields | Verdict |
|---|---|---|---|---|
| A · `Yeni əməliyyat` 3-col (`OperationForm:638`) | 366px | 390px — clean | 115.3 / 115.3 / 115.3 | **legible** |
| B · `Sərfiyyat → Hesabat` 5-col (`ReportView:115`) | 366px | **474px — OVERFLOW** | 122 / 122 / **42.3** / **57.3** / **77.9** | **broken** |
| C · `Sərfiyyat → Hesabat` 5-col (`ReportView:142`) | 366px | 390px — clean | 67.8 / 64.5 / 64.5 / 64.5 / 64.6 | **illegible** |
| D · `Sərfiyyat → Yeni sənəd` 3-col (`DocumentForm:295`) | 366px | 390px — clean | 112 / 122 / 112 | **legible** |

Clipping and label detail:

- **B** — `repeat(5,1fr)` is `minmax(auto,1fr)`, so the two `input[type=date]`
  refuse to shrink below their intrinsic width and the other three collapse
  **unequally**. «Kontragent» clips its value: 135px of text into a 76px box.
  Native date and select controls remain operable but «Layihə» is a 42.3px
  select — its option text is unreadable.
- **C** — no overflow, but four captions wrap to two lines
  («Avtomobil nömrəsi», «Alınma kanalı», «Qeyd axtar», «Kim daxil edib») and
  «Avtomobil nömrəsi» clips its value (78px into 66px).
- **A, D** — no overflow, no clipped value, no wrapped caption. Native date and
  select controls usable at 112–122px.

**The three-column row at 390px measures 115.3px per field, not 46px.** The
46px figure does not reproduce for this row.

### Candidate rules, measured

| Candidate | 5-col result | 3-col result |
|---|---|---|
| shipped (none) | doc 474px, narrowest 42.3px, 1 clipped | clean |
| `min-width:0` clamp only | **doc 391px — still overflows**, 65.2px, still 1 clipped | unchanged |
| **two columns** | **doc 390px, 178px per field, 0 clipped** | unchanged |
| one column | doc 390px, 366px per field, 0 clipped | unchanged |

A `min-width:0` clamp is **not sufficient**. Two columns is the smallest rule
that clears both overflow and clipping; one column fixes nothing further.

## 4. The fix

One rule, inside the existing `@media (max-width:900px)` block, hooked to an
explicit semantic class on the two `ReportView` filter rows:

```css
.main .row.sm-report-filter-row{grid-template-columns:minmax(0,1fr) minmax(0,1fr)!important}
```

- **Not** `.main .row` or `.row` — the three-column rows measured clean and
  collapsing them would be an unmeasured behaviour change, not a fix.
- **Not** the `[style*="repeat(5,1fr)"]` attribute match this fix originally
  shipped with. That form was brittle: it silently stops matching if the inline
  template is ever reformatted, reordered or given a space, unhooking the fix
  with no test failure anywhere. The class states the intent and survives any
  such edit.
- `!important` is required: `grid-template-columns` is set inline on the
  element, so a plain declaration would silently lose to the style attribute.
- The class carries **no desktop styling**. The inline `repeat(5,1fr)` remains
  the desktop template at every width above the breakpoint.
- Scoped to the phone breakpoint; desktop templates are untouched.

### After the fix, re-measured at 390px

| Fixture | Doc width | Fields |
|---|---|---|
| A · 3-col operation | 390px clean | 115.3 / 115.3 / 115.3 — **unchanged** |
| B · 5-col report | **390px clean** | 178 × 5, **0 clipped** |
| C · 5-col report | 390px clean | 178 × 5, **0 clipped**, no wrapped caption |
| D · 3-col document | 390px clean | 112 / 122 / 112 — **unchanged** |

## 5. Test

`web/src/index.css.row-responsive.test.ts` — 17 assertions in five groups. It
reads **both sides of the contract** (the stylesheet and three components),
because the fix only works if they agree on one class name; a test asserting
only the CSS would still pass if the class were dropped from the markup.

- **component side**: exactly two five-column rows exist in `ReportView`, both
  carry the class, both keep their inline desktop template, and nothing else in
  the file carries it;
- **negative control — three-column rows**: the `OperationForm` and
  `DocumentForm` three-column rows do not carry the class, and no component
  outside `ReportView` uses it at all;
- **stylesheet side**: the phone rule targets the class, carries `!important`,
  lives inside the breakpoint, and the retired `.row[style*=` selector is gone;
- **negative control — desktop**: no `.main .row` or `.row` rule in the phone
  block, the base `.row` is still `display:grid;gap:10px`, and the class has no
  rule outside the phone block;
- **regression**: both preserved sweep fixes (`.main .grid>*{min-width:0}`
  unconditional, `.card>header{flex-wrap:wrap}` phone-scoped) and the shell
  rules still stand.

**Falsification, actually executed** — three mutants, each run against the real
test with its source reads redirected at the mutated tree:

| Mutant | Result |
|---|---|
| class stripped from both `ReportView` rows | **2 failed** — component-side assertions |
| phone CSS rule deleted | **4 failed** — stylesheet-side assertions |
| class wrongly added to a three-column `OperationForm` row | **2 failed** — negative control |

An earlier probe attempt reported "17 passed" on a mutant; that run was
**invalid** — `vitest/config` could not resolve from the scratchpad tree, so no
test executed and the filtered output hid the startup error. The table above is
from runs that genuinely executed. The probe files were removed afterwards.

## 6. Verification

| Check | Result |
|---|---|
| Focused tests (5 files, incl. `ReportView.test.tsx`) | **69 passed** |
| Full suite (pre-hardening rule) | **213 files, 4421 tests, all passed** |
| `npm run typecheck` | clean |
| `npm run lint` | 4 pre-existing `only-export-components` warnings, unchanged; none from this work |
| `npm run build` (sandbox) | succeeded; pre-existing chunk-size warning only |
| Diff hygiene | `index.css` + `ReportView.tsx` changed; one new test file; temporary probe files removed (0 remaining); **staged 0**, no commit, push or deploy |

Files changed:
- `web/src/index.css` — one rule inside the existing phone block
- `web/src/components/serfiyyat/ReportView.tsx` — the semantic class on the two
  five-column filter rows; **no business logic touched**
- `web/src/index.css.row-responsive.test.ts` — new
- this report

`ReportView.tsx` appears as untracked in `git status` because its whole
`components/serfiyyat/` directory has been untracked since Phase 13; this work
added no new untracked path beyond the test file.

## 7. Honest status

- **16 routes authenticated-live inspected** in the sweep. That sweep was not
  repeated here.
- **The populated «Sərfiyyat Materialları» five-column row remains
  COMPONENT-RENDERED, not live-verified.** It never mounted on TEST because no
  eligible data exists there. The measurements above come from synthetic
  fixtures with the shipped markup and shipped CSS — strong evidence for the
  CSS contract, but not a live-data observation. It stays SOURCE/COMPONENT ONLY
  until real eligible data renders it.
- The `.row` hypothesis is **confirmed for the five-column rows** (B, C) and
  **refuted for the three-column rows** (A, D) — by rendered measurement, not
  by absence of overflow.
- No prior on-disk sweep report exists in this repo to amend; this document is
  the correction of record.
