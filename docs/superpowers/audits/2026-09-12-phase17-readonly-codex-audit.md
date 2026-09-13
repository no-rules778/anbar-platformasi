# Phase 17 read-only implementation — independent Codex audit

Date: 2026-09-12 · Scope: Module T read-only implementation

## Verdict

The implemented read-only slice is accepted at `CODE VERIFIED` evidence
level after one application correction and two evidence corrections. Phase
17 remains **NOT ACCEPTED**: 13 rows are not started and 17 remain blocked by
owner authority, authenticated identities, or non-restorable TEST state.

## Application defect corrected

`azp.store` incorrectly retained a successful snapshot on a failed refresh,
leaving `ready = true`. That is Phase 9 behaviour, not legacy Azpetrol/Araz
behaviour. `index.html:8192-8195` sets `st.ready = false` on every exception,
and M17-24 states the same contract. The failure branch now retains arrays
only in memory and sets `ready = false`, `loading = false`, and the error, so
the module-unavailable surface replaces the board until a successful load.

The corrected assertion would fail on the prior source (`expected false,
received true`) and passes on the corrected source.

## Evidence defects corrected

- M17-79 claimed the loading string without exercising it. A pending first
  snapshot now proves exact `Yüklənir…` rendering before resolution.
- The store's "out-of-order replies" test was sequential. It now creates a
  genuinely overlapping pair across a lifecycle reset, lets B win, then
  releases A and proves A cannot overwrite B.
- M17-27 now also has a component overlap: a late Azpetrol reply cannot change
  the selected Araz board, subtitle, or single active-board state.
- M17-71…M17-76 now cite the actual legacy ranges: `azpRenderMovs` at
  8382-8434 and `azpRenderLog` at 8436-8450.

No other mismatch was found in the four-read API, two-board isolation,
read-role gate, card/movement/log/history/report presentation, separate plain
workbook writer, or scoped CSS port. The six accepted pure `azp*` libraries
were not rewritten.

## Verification

- Focused audit set before correction: 12 files / 297 tests passed.
- Corrected store/page set: 2 files / 63 tests passed.
- Full suite: 200 files / **4184 tests** passed.
- Typecheck clean; lint has only four pre-existing Fast Refresh warnings.
- Sandbox production build clean; pre-existing chunk advisory remains.
- M17 checker PASS, 10/10 self-tests, 110 contiguous unique rows.
- Phase 9 checker PASS, 27/27 self-tests.
- `git diff --check` exit 0; line-ending advisories only.
- Staged files: 0; dirty tree preserved.

No Supabase project was contacted, no TEST mutation or fixture was created,
and production `bbjmhaerssakbreykxiw` was never contacted. No stage, commit,
push, deploy, layer change, cutover, or destructive cleanup occurred.

## Status

The authoritative tally remains 80 `CODE VERIFIED`, 0 `LIVE VERIFIED`, 0
`IN PROGRESS`, 13 `NOT STARTED`, 17 `BLOCKED`, 0 unclassified; 110 unique
rows. The read-only implementation is ready. Phase 17 remains **NOT
ACCEPTED** until the remaining owner decisions and evidence boundaries are
resolved and a final independent acceptance audit is completed.
