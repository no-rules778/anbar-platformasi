# Phase 9 T1 — shared balance index

Date: 2026-09-10  
Scope: M9-21…M9-28  
Verdict: `CODE VERIFIED`

`WarehouseBalance` was extended additively with `last`, `first`, `price`,
`val`, `name`, and `unit`, mirroring legacy `index.html:1284-1308`.

The implementation keeps warehouse × item identity, rounds `q` to four
decimals before valuation, sources price/name/unit from the item catalogue,
computes `val = q × price`, tracks minimum/maximum movement dates, and uses the
exact unknown-item label `(nomenklaturada yoxdur: <code>)` with zero price and
empty unit. Movement prices do not affect warehouse valuation.

Regression coverage includes two-warehouse identity, float-rounding,
catalogue-vs-movement price, date extrema, movement count, value, unit, and the
unknown-item fallback. Every direct typed test fixture was widened. The focused
consumer suite, full suite, typecheck, oxlint and sandbox production build are
green; the build emits only the pre-existing large-chunk advisory.

No browser or Supabase call was needed for this pure derived-index task. There
was no mutation, fixture, production contact, staging, commit, push or deploy.
The existing dirty tree was preserved. Phase 9 remains `NOT ACCEPTED`.
