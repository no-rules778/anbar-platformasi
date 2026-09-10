# Phase 9 T2 — condition pure rules

Date: 2026-09-10  
Scope: M9-90, M9-91, M9-96, M9-97  
Verdict: `CODE VERIFIED`

Added two side-effect-free modules transcribed from legacy
`index.html:2148-2159`:

- `canEditCond()` refuses while conditions are not ready, synthetic/aggregate
  warehouses, missing users, rehber and legacy read-only roles; admin may edit
  any concrete warehouse and anbardar only their exact assigned warehouse.
- `normaliseCondInput()` trims, replaces the first decimal comma, maps blank or
  null to zero, refuses negative/non-finite/malformed values with the exact
  Azerbaijani message, and applies the legacy two-decimal `Math.round` rule.

Seven focused assertions pass, including role and malformed-input negative
controls. Typecheck and focused oxlint are clean. These functions issue no RPC,
so the invalid-input no-RPC property holds by construction at this pure layer;
UI wiring and the server write path remain later Phase 9 tasks.

No Supabase or production contact, mutation, fixture, staging, commit, push or
deploy occurred. Phase 9 remains `NOT ACCEPTED`.
