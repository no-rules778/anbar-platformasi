# Phase 15 proposal — Maliyyə göstəriciləri və Nəzarət və risklər

**Status:** IMPLEMENTED / NOT ACCEPTED. The authoritative contracts are in
[`2026-09-11-phase15-registry-rows.md`](2026-09-11-phase15-registry-rows.md).

## Scope

Port the two ungated analytical pages `rFin()` and `rCtrl()` from
`index.html:6931-7054`. Both consume the same cancellation-filtered four-table
snapshot as Phase 14: movements, items, warehouses and partners. They do not
write data and issue no RPC.

## Approved implementation choices

- Keep the accepted `buildItemIndexes()`, `buildReportAggregates()` and
  `controlIssues()` implementations unchanged and reuse them as the single
  derivations.
- Give Phase 15 its own store lifecycle while reusing the already explicit
  four-read snapshot function. A failed refresh retains the last complete
  generation and a late older response is discarded.
- Preserve the distinct valuation rules: financial purchase spend uses only a
  positive movement price; estimated write-off value uses the current item
  price; stock value uses the accepted balance index.
- Preserve the actual financial workbook: seven worksheets, despite the
  legacy success toast saying six. Screen supplier bars remain top-12 while
  export contains every supplier.
- Preserve the Controls export boundary: its button says Excel but legacy
  downloads semicolon CSV. Preserve the stale `İlk 100 sətir göstərilir.` hint
  while the shared table cut remains 3000.
- Complete D-L3: dashboard issue pills now navigate to the migrated Controls
  page. They remain globally derived and carry no selected issue state.

## Acceptance boundary

Offline/source evidence can establish all pure derivations, presentation,
navigation, export matrices, atomic retention and stale-response protection.
Authenticated TEST observation of the four reads, realtime refresh and role
scoping remains separate live evidence. Phase 15 cannot become ACCEPTED before
an independent Codex audit.
