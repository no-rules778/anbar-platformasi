# Phase 18 — final independent Codex audit

**Verdict: NOT ACCEPTED.** No application defect was found in the implemented
shell slice. Five presentation contracts are now live-verified on TEST, but 13
authority/realtime/export/cutover contracts remain blocked and the owner
decisions D-P1…D-P4 are not yet fully resolved.

## Corrections to the Claude handoff

The first full-suite run passed all 4,366 assertions but emitted repeated
`window.scrollTo` errors introduced by the Phase 18 navigation side effect, and
the new shell suite emitted React `act()` warnings around direct store writes.
These were harness defects, not application defects. `App.test.tsx` now stubs
`scrollTo`; `App.shell.test.tsx` stubs it and wraps both direct `openCard()`
transitions in `act()`. The focused shell gate is 97/97 with no warning output.

The post-fix full parallel suite produced five failures in pre-existing Phase
7/8 tests under load (timeouts plus one temporarily non-editable input). The
same three files pass immediately in isolation, 218/218. This is recorded as a
load-sensitive test-runner boundary, not a Phase 18 regression and not a clean
full-suite claim. Typecheck, lint, sandbox build and diff hygiene remain clean.

## Live read-only TEST evidence

One TEST admin and one TEST anbardar session were exercised through the real
React UI. At 800×700 the rail was off-canvas, the burger opened it, and real
navigation to «Anbar qalıqları» closed it. At 1200×800 the desktop rail returned.
Both roles showed the presence chip and the corrected rail without the stale
migration notice. The live badges displayed 6 nomenclature rows and 5 combined
warehouse/location rows. The balance screen showed 1 position, quantity 8.00
and value 80.00 ₼, consistent with the dashboard in the same session.

This promotes exactly M18-01, M18-02, M18-30, M18-31 and M18-34. It does not
promote request-shape, catalog, realtime, export, all-role or cutover contracts.
In particular, the UI badge values do not prove `head:true`; admin/anbardar do
not discriminate `azpCanRead` from `isAdmin`; and no rehber session was run.

Both sessions ended through «Çıxış». The dedicated port-5176 sandbox server was
stopped and the port verified closed. No mutation, fixture, import, egress,
deployment or production contact occurred.

## Owner decisions still required

- D-P1: recommended — do not add a duplicate «Kontragentlər» rail page; retain
  the already migrated `knt` report as the single surface.
- D-P2: defer legacy retirement/cutover until the remaining verification
  package and a rollback-ready deployment decision are complete.
- D-P3: admin/anbardar read-only rehearsal is now partially complete; rehber,
  realtime and server-enforcement legs remain separate evidence work.
- D-P4: recommended — accept `c-mov`, `c-bal` and `c-ctrl` as intentionally
  omitted rather than reintroducing a whole-platform boot load.

## Derived status

24 `CODE VERIFIED`, 5 `LIVE VERIFIED`, 13 `BLOCKED`; 42 unique rows, no
duplicates or unclassified rows. Phase 18 remains NOT ACCEPTED.
