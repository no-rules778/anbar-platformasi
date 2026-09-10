# Phase 7 — Codex review of M7-123 closure

Date: 2026-09-09
Verdict: **M7-123 closure accepted; Phase 7 remains NOT ACCEPTED**

Codex independently compared the reported read-10 measurement with the Phase 7
proposal, plan and authoritative row. The row requires reads 4-10, the combined
reads 1-9 total, and read 10 as a per-invocation cost excluded from that total.
Reads 4-9 and their combined total were already recorded; the new read records
the missing `get_stock_layers` invocation as 709 uncompressed bytes, 394 gzip
bytes and one request. A two-layer response is valid and more representative
than the previously anticipated empty response. It does not claim production
volume or production layer depth.

The accepted Phase 8 cutover genuinely removes S-11's old setup precondition:
the capability is active/version 36 and the read can run without changing
`stock_layer_settings`. Closing M7-123 therefore satisfies its explicit stop
condition without taking the plan's obsolete setup/cleanup path.

The fixture reconciliation is also correctly limited: current runnability is
not evidence that another M7 contract passed. No other row is promoted by this
review. The next lowest-cost evidence is a read-only real-UI sweep of M7-18,
M7-22 and M7-116; each must be asserted against its own Phase 7 contract rather
than inherited from Phase 8.

No source, TEST data or environment was changed by this review. Dirty tree was
preserved, staging remained empty and `git diff --check` passed. Automated
checks were not repeated because the underlying application source is
unchanged.
