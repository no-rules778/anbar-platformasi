# Phase 17 independent Codex design audit

Date: 2026-09-12 · Scope: Azpetrol / Araz design package and safe pure slice

## Verdict

The six pure modules match the inspected legacy contracts and their 93 tests
pass. The design is usable after three documentation/tooling corrections
below. Phase 17 remains **NOT ACCEPTED**: no page, snapshot, writer, import or
write path has been accepted or exercised.

## Corrections applied

1. **M17-110 evidence attribution.** Absence of a top-level data seed in the
   restore scripts proves only fresh-restore behaviour; it cannot prove the
   current TEST row counts. The package now requires a read-only measurement
   before deciding whether a fixture is necessary.
2. **M17-63 classification.** The report writer is not owner-blocked. Legacy
   unambiguously uses a separate plain writer, avoiding the autofilter and
   freeze pane added by shared `xls()`. The row is now NOT STARTED. Tally:
   44 CODE VERIFIED / 49 NOT STARTED / 17 BLOCKED / 110 unique.
3. **Ledger checker coverage.** The ledger claimed contiguous M17-01…M17-110,
   but the checker did not test gaps. It now validates the sequence and has a
   failing gap fixture; self-test is 10/10.

The proposal also now records D-T8, which had appeared in the plan and handoff
but was missing from the proposal's owner-decision list.

## Verification

- Phase 17 focused tests: 6 files / 93 tests passed.
- Phase 17 checker: PASS, 110 contiguous unique rows, 10/10 fixtures.
- Phase 9 checker: PASS, 124 rows, 27/27 fixtures.
- No Supabase contact or application write was needed for this audit.
- Production was not contacted; staging remains empty and the dirty tree was
  preserved.

## Next boundary

The read-only snapshot/API/store, page/route/CSS, and separate plain report
writer can proceed now without a data fixture. Realtime is isolated as T1B
until D-T6 is resolved and does not block the page. D-T1…D-T5
continue to gate writes, permanent TEST residue, hard delete, import and bulk
template-export egress. D-T7 and D-T8 are documentation/tooling choices.
