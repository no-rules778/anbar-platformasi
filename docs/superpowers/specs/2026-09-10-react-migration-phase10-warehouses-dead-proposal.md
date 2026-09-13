# Phase 10 draft proposal — «Anbar və layihələr» and inactive/dead stock

Date: 2026-09-10  
Status: **DESIGN ACCEPTED — implementation authorised**  
[Owner decision](../decisions/2026-09-10-phase10-design-scope.md) ·
[Independent design audit](../audits/2026-09-10-phase10-design-codex-acceptance.md)

## 1. Scope and dependency

Phase 10 follows the accepted Phase 9 and consumes its shared operational
movement and balance computation. It covers only:

1. legacy page `anb` / `rAnb()` — «Anbar və layihələr»;
2. the legacy `dead` report branch — «Hərəkətsiz və ölü qalıq».

It does not include general reports, dashboard, reference-directory mutation,
settings, import/export administration, or any later roadmap phase. `Çap`
remains outside acceptance under the existing product decision.

## 2. Verified legacy contracts — warehouse/project page

Source: `index.html:371-376`, `2900-2917`.

- Heading and subtitle distinguish physical warehouses from project/delivery
  destinations.
- The page is not role-gated.
- «Yeni ünvan» is enabled only for admin and navigates to the already migrated
  reference-directory screen; Phase 10 adds no write API.
- Physical warehouses come from active rows of type `anbar` (`DB.whs`).
- Columns are Anbar, Mövqe, Qalıq dəyəri, Hərəkət, Son əməliyyat.
- Mövqe counts warehouse balance rows with `abs(q) > 1e-9`.
- Qalıq dəyəri sums the shared balance row values for the warehouse.
- Hərəkət is the operational movement count from `IX.byWh`.
- Son əməliyyat is the maximum operational movement date for the warehouse;
  empty renders `—`.
- Warehouse names use the display-only `whLabel()` alias.
- The second table is built from all loaded warehouse/location rows (`DB.locs`),
  including their active flag in the data object but without filtering on it.
- Columns are Ünvan / layihə, Tipi, Əməliyyat, Dövriyyə.
- The type badge uses `t-op` for `anbar`, otherwise `t-mut`.
- Əməliyyat and Dövriyyə use the shared partner index keyed by the location
  name; turnover is inbound plus outbound quantity, not monetary value.

## 3. Verified legacy contracts — inactive/dead-stock report

Source: `index.html:6788-6804` plus the common report shell.

- Input rows are non-zero shared balance positions (`IX.positions`).
- Reference date is the newest operational movement date, falling back to
  `today()` when there are none.
- Inactive days are `Math.round((reference - last movement date) / 86400000)`.
- `moved` is true only when the same warehouse/item has an operational outbound
  movement with quantity greater than zero whose type is not `Yerdəyişmə`.
- A row is included when inactive for at least 30 days **or** never used.
- Rows sort by balance value descending.
- KPIs are row count, frozen value sum, and count never used.
- Table columns are Kod, Mal, Anbar, Qalıq, Dəyər, Son hərəkət, Gün, Status.
- Status is `hərəkətsiz` (`t-mut`) when used before, otherwise `istifadəsiz`
  (`t-rm`).
- Item identity opens the existing item card; Phase 10 must reuse that card
  contract rather than create another implementation.
- Export matrix columns are Kod, Mal, Anbar, Qalıq, Dəyər, Son hərəkət,
  Hərəkətsiz gün, Heç vaxt istifadə olunmayıb.

## 4. Proposed React architecture

- Reuse Phase 9 `operationalMovements`, balance-index output, formatting,
  warehouse alias and item-card components.
- Add a read-only snapshot/store/page for the warehouse/project view only when
  an existing Phase 9 snapshot cannot be reused without coupling page state.
- Watch only tables actually read by the screen: movements, items and
  warehouses. No stock-condition or layer read belongs here unless the final
  ledger identifies an exact consumer.
- Implement the dead-stock derivation as a pure function with boundary tests
  for 29/30 days, transfer-only outbound activity, ordinary outbound activity,
  never-used stock, empty dates, sorting and value aggregation.
- Keep all navigation and role checks in the UI, but rely on existing server
  RLS for returned rows; do not add client-side warehouse narrowing unless an
  authoritative contract requires it.

## 5. Design decisions required before implementation

1. **D-K1 — placement of `dead`:** Phase 14 owns the general Reports page.
   Recommended: expose the inactive/dead-stock view from the Phase 10 page as
   a read-only tab/action while keeping the pure report/export contract reusable
   by Phase 14. Do not migrate the rest of `rRep()` early.
2. **D-K2 — inactive locations:** legacy renders every `DB.locs` row and does
   not show its active state. Recommended: preserve this behaviour for parity,
   with an explicit test, rather than silently filtering inactive rows.
3. **D-K3 — role visibility:** the legacy page is ungated but its data is
   whatever the backend returns. Recommended: keep it ungated and perform an
   admin/anbardar read-only comparison without introducing client scoping.

All three recommendations were owner-approved on 2026-09-10. Implementation
may proceed under the accepted ledger and TEST-only plan; no row is promoted
by the decision itself.

## 6. Safety and evidence plan

Phase 10 is expected to be read-only. Use TEST `alkjjbaawmsirsfvqljm` in
sandbox mode only; never contact production `bbjmhaerssakbreykxiw`. Preserve
the dirty tree and do not stage, commit, push or deploy. Browser interceptions
must be labelled separately from persisted TEST and source/unit evidence.
