# Phase 12 — final independent Codex acceptance

Date: 2026-09-11

## Verdict

**ACCEPTED for the owner-approved scope D-M1 and D-M3…D-M6.** D-M2 remains an
explicitly deferred live-write extension and is not silently treated as
executed. No TEST request was created, withdrawn, rejected or approved, and no
permanent item or seven-digit code was created.

This acceptance means that the implemented «Nomenklatura sorğuları» React
slice is complete for the authorised code and read-only scope. The six
server/write rows remain honestly `NOT STARTED`, and the three evidence-boundary
rows remain `IN PROGRESS`; those statuses do not contradict the scoped owner
decision.

## Independent correction

The audit found one application defect before acceptance. `ItemRequestsPage`
loaded the whole reference-directory store, which added warehouses, partners,
Sərfiyyat and usage reads despite M12-10's narrow snapshot contract. The page
and item-request store now use only `item_requests`, `items`, and the dedicated
`get_reference_values` RPC. Reference-value readiness remains non-fatal as
required by A14. Focused tests pin both the exact source set and the
`ready:false` fallback.

## Verification

- Focused Phase 12 regression: 9 files / 275 tests passed.
- Full suite: **157 files / 3430 tests passed**.
- `tsc -b --noEmit`: clean.
- `oxlint src`: exit 0 (three pre-existing fast-refresh advisories only).
- Sandbox production build: passed, 228 modules; existing chunk advisory only.
- `git diff --check`: clean; staged files: 0.

An earlier full-suite attempt was rejected: it was run during a resource-starved
session and ended with worker-start failures and unrelated five-second
timeouts. It supplied no acceptance evidence. The clean full suite above was
rerun alone with four workers and is the authoritative result.

## Safety and next owner

The dirty tree was preserved. No production project was contacted, no TEST
mutation was made, and no stage, commit, push or deploy occurred. Phase 13 may
begin with design/reconciliation of the next unmigrated legacy area,
«Sərfiyyat Materialları» (`rSm()`); application implementation still requires
its own audited design and owner scope decision.

