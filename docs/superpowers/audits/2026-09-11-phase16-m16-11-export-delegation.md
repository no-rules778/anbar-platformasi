# Phase 16 — M16-11 export delegation audit

## Independent audit of the completed slice

The implemented safe slice was checked against the legacy `index.html`, the
Phase 16 proposal, the authoritative M16 ledger, the Phase 16 plan and
`2026-09-11-phase16-safe-slice.md`. No defect was found in it: the heading and
subtitle, the ten-by-six permission matrix, the operational (cancellation
filtered) source counts, the four-column partner export, the disabled Audit
export title, the non-admin boundary and the admin read-only user states all
match the legacy strings and shapes. Nothing in that slice was reimplemented.

## M16-11 — exact contract implemented

Legacy `rSet()` (index.html:7197) performs NO export derivation for
mov/bal/nom. Each `[data-exp]` button navigates and then clicks the
destination page's own export button:

    mov: () => { go('mov'); setTimeout(() => $('#mov-exp').click(), 50); }

That timeout is DOM readiness, not behaviour. The React form keeps the meaning
and removes the race:

- `store/exportRequest.store.ts` holds one pending target (`mov | bal | nom`),
  following the `pendingPrefill` / `consumePrefill` precedent (M5-55, M7-115);
- Settings records the request FIRST and navigates SECOND, the legacy order —
  reversing it would mount the destination before the request existed;
- the destination consumes the request once and calls its OWN `exportXls()`.

Consequently there is no second calculation or export implementation.
`movementExportMatrix`, `currentBalanceExportMatrix` /
`initialBalanceExportMatrix` and `nomenclatureExportMatrix` are reached
unchanged, each behind its own page's `canExport` gate, so a Settings-initiated
export is identical to pressing «Excel» on the destination page — including
the active-view choice on «Anbar qalıqları».

Preserved boundaries: «Kontragentlər» keeps its direct `xls()` call (the one
Settings export with no page of its own); «Audit jurnalı» stays disabled with
the exact legacy title and delegates to nothing; the D-S1 backup and D-S2
bulk-import controls remain disabled. Legacy labels are unchanged.

## Defect found and corrected

The first implementation consumed the request on ARRIVAL, before the
destination's `canExport` gate was satisfied. Settings navigates while the
snapshot is still in flight, so the first render is always gated: the request
was cleared a tick before the data arrived and the user received NO file —
a silent failure of the exact behaviour M16-11 exists to provide.

Failing before / passing after:

- before: `consumes a 'mov' request and exports through the existing
  derivation` and `exports once the snapshot arrives, even though the first
  render is gated` both fail — `xls` called 0 times; pending `null`, not
  `'mov'`. Same two failures on the balances page.
- after: both pass on both pages; 26/26 focused delegation tests pass.

Falsifiability was verified mechanically: the superseded form was restored on
each page in turn and only the regression tests failed (2 failed / 4 passed per
file), then the corrected source was restored and each file returned to 6/6.

The correction is consume-on-export plus an unmount cleanup, so an unsatisfied
request cannot leak into a later visit of the same page.

## Independent Codex correction — cold Nomenclature visit

The audit above generalized the gated-page fix to all three destinations, but
the Nomenclature test pre-populated its store and concealed a separate cold-
visit race. On a first visit its pending effect ran before `load()` settled
and exported a header-only workbook from the empty store. Unlike the legacy
global snapshot, React does not already have this page's data at that point.

Codex added a cold-load regression. It fails against the preceding source
with one premature `xls()` call containing only the header. The destination
now waits for its initial load promise to settle before consuming the request,
and abandons an unsatisfied request on unmount like the other destinations.
The ordinary Nomenclature Excel button remains ungated; only the cross-page
handoff waits for the page it has just opened to finish loading.

## Evidence level

Unit and component tests only. The snapshot APIs and the workbook writer are
mocked; the matrix builders run for real. **No browser or live evidence is
claimed**, no Supabase request was made, and no export of real data, TEST
write, import, role change or user mutation was performed.

## Measured results

HISTORY: Claude's pre-correction gate was focused delegation 26/26 and full
suite 190 files / 3985 tests. After the independent cold-visit correction,
focused delegation plus Nomenclature regression tests are 59/59 and the full
suite is **190 files / 3986 tests**. `tsc -b --noEmit` exit 0. `oxlint src`
unchanged at the four pre-existing Fast Refresh warnings. Sandbox production
build succeeded (257 modules; the chunk-size advisory is pre-existing).
`git diff --check` exit 0. 0 staged files; branch `react-migration` and the
dirty working tree preserved.

Ledger after this slice: 16 CODE VERIFIED, 0 NOT STARTED, 8 BLOCKED, 24 unique
ids, 0 duplicates, 0 unclassified — verified by a mechanical tally.

## Remaining blocked rows

M16-17 … M16-20 (users read and mutation), M16-21 (full backup), M16-22 …
M16-24 (bulk import). Each requires an explicit owner decision — D-S1, D-S2 or
D-S3 — and, for D-S2 and D-S3, a separate TEST write window and an
authenticated TEST admin identity respectively.

**Phase 16 remains NOT ACCEPTED** pending Codex's independent acceptance audit.
