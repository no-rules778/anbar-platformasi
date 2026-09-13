# Phase 18 implementation audit — skeptical self-review of the diff

Date: 2026-09-12 · Auditor: Claude (self-review) · Verdict: **superseded by the
independent Codex audit; Phase 18 is now ACCEPTED for its shell / read-only
scope**

> **UPDATE — 2026-09-12.** The independent audit found no application defect.
> Two of the five residual concerns in §5 are now closed by owner decision and
> one by the audit's live rehearsal; the other two stand. The §3 M18-14 note is
> also closed: the dead `partners` count it flagged has been REMOVED, not
> justified. See the [decision](../decisions/2026-09-12-phase18-shell-acceptance-scope.md).

Self-review, not independent review. Read as a maintainer looking for
regressions, over-claims and wrong-reason passes.

## 1. Files touched in this phase

| File | Change |
|---|---|
| `web/src/App.tsx` | `go()` / `goEditItem()` / `goOperation()` helpers; every rail entry and handoff routed through them; rail order fix; badges; burger; presence chip; stale notice removed |
| `web/src/api/navCounters.api.ts` | **new** — count-only badge reads. Post-decision: `partners` leg removed (D-P1) |
| `web/src/lib/format.ts` | `initials()` appended |
| `web/src/index.css` | presence chip rules, `#burger`, `@media (max-width:900px)` block |
| `web/src/pages/ReportsPage.tsx` | «Tam siyahı» card header |
| `web/src/App.shell.test.tsx` | **new** — 14 shell tests |
| `web/src/lib/navCounters.test.ts` | **new** — 8 count-layer tests |
| `web/src/index.css.shell.test.ts` | **new** — 8 stylesheet tests |
| `web/src/App.test.tsx` | fixtures updated for the new rail |
| `web/src/App.nav.test.ts` | source assertions updated for `go()` |
| `web/src/lib/format.test.ts` | 5 `initials()` tests appended |
| `web/src/pages/ReportsPage.test.tsx` | 1 header test appended |

Documentation: the Phase 18 proposal, ledger, plan, this audit, the design
handoff audit, the final handoff, and the authority banners. Added
2026-09-12 after the audit: the
[owner decision](../decisions/2026-09-12-phase18-shell-acceptance-scope.md), the
[authority verification package](../plans/2026-09-12-phase18-authority-verification-package.md)
and the [cutover package](../plans/2026-09-12-phase18-cutover-package.md).

## 2. Regression review

**Did routing every navigation through `go()` change any accepted behaviour
beyond the intended side effects?**

`go()` does four things: set the page, clear `cardCode`, close the rail drawer,
scroll to top. Reviewed each against accepted contracts:

- Clearing `cardCode` is M18-21, intended, and its one exemption
  («Malı redaktə et») is implemented by ordering and tested.
- Closing the drawer is invisible above 900px, where `railOpen` is always
  false at desktop because nothing but the burger sets it.
- Scrolling is new behaviour by design.
- The operation-store handoffs (`prefill`, `enterEditMode`) still seed BEFORE
  navigating, preserving the M5-55 / M8-37 order, because `go()` does not
  touch the operation store.

The sequential full suite passed 4366 tests, which is evidence that no accepted
screen contract broke. **Corrected 2026-09-12:** a PARALLEL run additionally
surfaces five load-sensitive failures in pre-existing Phase 7/8 files that pass
in isolation, so "full suite green" is not an unqualified claim — see §5.5.

**Did adding badges break anything beyond label text?** The badge is a `<b>`
inside the existing anchor, the same structure the audit badge has used since
Phase 4. Three rail fixtures needed updating; no behaviour changed.

**Did the CSS additions displace the print block?** Explicitly regression-
tested (`index.css.shell.test.ts`, print block still strips `.rail,.topbar,…`).
`.rail` now has rules in three places (base, print, responsive) and the cascade
order is base → print → responsive, all appended after the originals.

## 3. Over-claim review

Re-read every `CODE VERIFIED` row against its test. Two rows were tightened
during implementation:

- **M18-42** was initially drafted as "role visibility and access". "Access"
  was removed: nothing here tests access. It now reads as visibility, a client
  affordance, with M18-43 carrying enforcement as BLOCKED.
- **M18-54** was drafted as "visual parity verified". It now says
  *source-comparison sweep*, because no rendering was compared.

**M18-14 deserved a note — now CLOSED.** `fetchNavCounts` fetched `partners`
and nothing displayed it: a real, if tiny, wasted request on every boot. It was
left in place pending D-P1 rather than quietly justified.

**Resolution, 2026-09-12:** D-P1 was ACCEPTED with "no rail entry", so the count
can never acquire a consumer. The `partners` leg was removed from
`navCounters.api.ts`, `NavCounts` narrowed to `items` + `warehouses`, and a
control (`expect(tables).not.toContain('partners')`) now proves the request is
not issued. Flagging it rather than justifying it is what made the removal
straightforward once the decision arrived.

## 4. Wrong-reason-pass review

The controls in the plan's §3.2 were each checked to confirm they would
actually fail if the corresponding claim were implemented wrongly:

- The card-survival control fails if `openCard(null)` were called on render
  rather than on navigation — the most likely wrong implementation.
- The badge zero/null pair fails if `null` and `0` were conflated, which is the
  single most likely bug in a count renderer (`count ?? 0`, `!count`).
- The burger control fails if `#burger` were given `display:inline-flex`
  unconditionally, which is what a careless port produces.
- The warehouse-sum control fails if only one leg were counted and returned.

One control was **added during implementation** rather than planned: the
genuine-zero rendering test. Writing `badge()` made it obvious that an empty
table and a failed count must not collapse to the same glyph.

## 5. Residual concerns for the independent auditor — dispositioned 2026-09-12

1. **M18-15 is a judgement call.** Three legacy badges stay unimplemented. The
   reasoning (no whole-platform boot load) is architectural, not evidential.
   An auditor may reasonably rule that legacy parity requires them and that the
   cost is acceptable. D-P4 exists for exactly that.
   → **CLOSED: D-P4 ACCEPTED.** The owner ruled the omission intentional. The
   row is `ACCEPTED` — a settled disposition, not an evidence claim.
2. **M18-52 / D-P1.** Phase 18 declines to decide whether «Kontragentlər»
   regains a rail entry. An auditor may consider migration completeness
   unprovable while one legacy rail entry has no disposition.
   → **CLOSED: D-P1 ACCEPTED — no rail entry.** M18-50's completeness claim now
   rests on a decided disposition rather than an open question.
3. **The responsive work is unrendered.** M18-30 is proved in two layers and
   neither is a browser. M18-34 holds that honestly, but nobody has seen this
   layout on a phone.
   → **CLOSED by live evidence.** Codex rendered it on TEST at 800×700 (rail
   off-canvas, burger opens, navigation closes) and 1200×800 (desktop rail
   returns). M18-30 and M18-34 are `LIVE VERIFIED`. Side-by-side parity against
   legacy (M18-55) remains BLOCKED.
4. **`initials()` placement.** It went into `lib/format.ts` beside the other
   legacy display helpers. It is arguably a UI concern, not a format concern.
   Cosmetic. → **STANDS.** Not raised by the audit; left as is.
5. **Test churn.** 25 existing tests were edited. Each has an inline reason and
   no application source was changed to satisfy a test, but the volume deserves
   an auditor's eye — that is exactly the shape a bad migration also has.
   → **STANDS, and the concern was justified.** The audit found two further
   HARNESS defects this self-review had missed — `window.scrollTo` errors from
   the new navigation side effect, and React `act()` warnings around direct
   store writes — and fixed them by stubbing `scrollTo` and wrapping both
   `openCard()` transitions. It also found that a full PARALLEL run produces
   five load-sensitive failures in pre-existing Phase 7/8 tests that pass in
   isolation. So this audit's own "full suite green" conclusion in §2 was
   **over-stated**: it was a clean sequential result, not a clean parallel one.
   Corrected in the plan's gate table. No application defect was found.

## 6. Safety confirmation

No Supabase call executed. No credential used. No dev server started. No TEST
mutation, fixture, import, delete or egress. Production contacts: 0. Staged
files: 0. No stage, commit, push or deploy. Dirty tree preserved. No I-10 row.
`web/.env` not read or modified. Permanent residuals: 0.
