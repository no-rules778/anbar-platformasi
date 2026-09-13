# Phase 10 implementation plan — Module K

Status: **APPROVED — implementation authorised**  
[Owner decision](../decisions/2026-09-10-phase10-design-scope.md) ·
[Design audit](../audits/2026-09-10-phase10-design-codex-acceptance.md)

## T0 — design closure

1. **COMPLETE:** proposal and 36-row ledger independently audited.
2. **COMPLETE:** D-K1, D-K2 and D-K3 owner-approved.
3. **COMPLETE:** row count and acceptance boundary reconciled.

## T1 — pure derivations

- Add warehouse/project summary derivation over accepted Phase 9 indexes.
- Add dead-stock derivation and export matrix.
- Pin epsilon, 29/30-day boundary, transfer exclusion, never-used status,
  sorting, empty-date fallback and value aggregation with falsifiable tests.

## T2 — snapshot and store

- Reuse existing table readers and operational movement/index logic.
- Fetch one atomic generation of movements, items and warehouse/location rows.
- Add whole-snapshot failure retention and debounced realtime refresh.
- Do not read stock layers or add a write path.

## T3 — React surface

- Add the `anb` rail/page route, exact two-table presentation and admin-only
  navigation affordance to `refs`.
- Add the approved dead-stock presentation without migrating unrelated report
  families.
- Reuse the item card, formatters and export mechanism.

## T4 — verification

- During implementation run focused pure/store/page tests.
- At the final code gate run the full suite once, typecheck, oxlint, sandbox
  production build and `git diff --check`.
- Perform one read-only TEST browser sweep for admin and anbardar, with a hard
  production abort and mutation intercept. Verify request set, RLS-shaped data,
  role affordances, navigation, table/KPI/export preparation and recovery.
- No live write window is planned or authorised for Phase 10.

## T5 — acceptance

- Update proposal, ledger, registry and handoff once after the coherent block.
- Preserve evidence classes and promote only exact exercised contracts.
- Independent Codex audit is required before Phase 10 can be `ACCEPTED`.

## Hard constraints

TEST `alkjjbaawmsirsfvqljm` only; sandbox mode; never production
`bbjmhaerssakbreykxiw`; preserve the dirty working tree; no stage, commit,
push, deploy, fixture, mutation, layer deactivation or cutover. `Çap` remains
outside acceptance.
