# Phase 18 cutover package — legacy retirement and production release

Date: 2026-09-12 · Status: **OPEN — REQUIRES EXPLICIT OWNER APPROVAL**

These four contracts were transferred intact out of Phase 18 by the owner
decision of 2026-09-12 (D-P2 deferred:
[decision](../decisions/2026-09-12-phase18-shell-acceptance-scope.md)). They do
not block Phase 18's acceptance of its implemented shell/read-only scope, and
**not one of them was promoted by the transfer**. Each retains `BLOCKED`.

Every row here is irreversible or production-affecting. Nothing in this package
may be executed on the strength of Phase 18's acceptance: accepting a migrated
shell is not authority to retire the platform it replaces.

## Transferred rows

| Id | Contract | Class | Blocking condition |
|---|---|---|---|
| M18-60 | Legacy `index.html` retirement | Irreversible | Explicit owner approval, a retirement date, and M18-63 agreed first |
| M18-61 | Production release preparation and cutover rehearsal | Production-affecting | Explicit owner approval; depends on the authority package's live legs |
| M18-62 | Production deployment | Production-affecting | Explicit owner approval — outside every migration phase's authority |
| M18-63 | Post-cutover rollback plan is written and agreed | Prerequisite | Must be complete and agreed BEFORE M18-60 or M18-62 is considered |

## Required ordering

1. The [authority verification package](./2026-09-12-phase18-authority-verification-package.md)
   completes its live legs — in particular M18-43 (server-side role
   enforcement) and M18-45 (export parity). Retiring legacy while server
   enforcement is unverified would remove the fallback before the replacement
   is proved.
2. M18-63 is written and agreed. A rollback plan authored after a cutover is
   not a rollback plan.
3. The owner approves a retirement date (M18-60) and a deployment window
   (M18-62) explicitly, in writing, per change-control.
4. M18-61's rehearsal runs on TEST before anything touches production.

No step may be inferred from the completion of an earlier one.

## Standing prohibitions

- Production project `bbjmhaerssakbreykxiw` must not be contacted until
  step 3 is explicitly approved. Phase 18 contacted it zero times.
- No deployment to Vercel, no push, no publish or overwrite of
  `platform/index.html`, and no legacy layer deactivation.
- The legacy platform stays the operational system of record until M18-60 is
  approved and executed.
