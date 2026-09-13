# Phase 18 authority verification package — transferred evidence contracts

Date: 2026-09-12 · Status: **OPEN BACKLOG** — none of these rows is satisfied.

These six contracts were transferred intact out of Phase 18 by the owner
decision of 2026-09-12
([decision](../decisions/2026-09-12-phase18-shell-acceptance-scope.md)). They do
not block Phase 18's acceptance of its implemented shell/read-only scope, and
**not one of them was promoted by the transfer**. Each retains `BLOCKED`, its
original contract, its original risk and its original evidence ceiling.

The cutover-class contracts are in a
[separate cutover package](./2026-09-12-phase18-cutover-package.md).

## Why these could not be satisfied inside Phase 18

Every row here needs something Phase 18 was not authorised to do: a third role
identity, an authorised writer, real egress, a long-lived session, or a
side-by-side legacy rendering. The Codex read-only rehearsal covered TEST admin
and anbardar at two viewport sizes; that evidence is preserved and is what
promoted M18-01, M18-02, M18-30, M18-31 and M18-34. It deliberately promoted
nothing here.

## Transferred rows

| Id | Contract | Why still blocked | What would satisfy it |
|---|---|---|---|
| M18-41 | A real Supabase change event refreshes an open page | No realtime event was ever received; all 15 pages are wired, which is M18-40 and is a different claim | A live TEST window plus an authorised writer making a change while a page is open, observed refreshing |
| M18-43 | Server-side role enforcement across modules (RLS, grants, function refusals) | Not inferable from any rendered UI. The admin/anbardar rehearsal showed affordances, not enforcement | Live legs per role that attempt a refused read/write and observe the SERVER refusing |
| M18-45 | Exported workbooks match the approved Excel specification byte-for-byte | No export was produced or compared | Authorised egress plus a template comparison against the approved specification |
| M18-46 | Cross-screen data consistency for the same item/partner/warehouse | The rehearsal's balance/dashboard agreement (1 position, 8.00, 80.00 ₼) is one screen pair in one session, not a cross-module claim | One live dataset read traced across every module that displays it |
| M18-55 | Rendered visual parity against legacy at real viewport sizes | The rehearsal proved the REACT layout responds at 800×700 and 1200×800. It did not render legacy beside it | Side-by-side rendering of legacy and React at matched viewports |
| M18-57 | Stale-refresh behaviour after a token refresh or a long idle window | No session was held long enough to observe a token refresh | A live session observed across a token-refresh boundary and a long idle period |

## Boundary rules

1. A rendered UI is never evidence of a server policy, grant, function body or
   refusal. M18-43 in particular cannot be satisfied by any screenshot.
2. M18-40 (realtime WIRING, `CODE VERIFIED`) must never be read as M18-41
   (realtime DELIVERY, `BLOCKED`). The same distinction separates M18-44 from
   M18-45 and M18-42 from M18-43.
3. The admin/anbardar rehearsal did not discriminate `azpCanRead` from
   `isAdmin`, because both roles pass both predicates. A rehber leg is required
   for that, and until one is run, M18-05's gate evidence stays a client-side
   claim.
4. Each row requires its own explicit authority at execution time. This package
   authorises no mutation, fixture, import, egress, deployment, catalog access
   or production contact.
5. No row here may be promoted to `LIVE VERIFIED` except by an executed live
   leg on TEST `alkjjbaawmsirsfvqljm`, recorded with what was actually run.
