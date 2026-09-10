# Phase 9 final Codex design acceptance — 2026-09-10

## Verdict

**DESIGN ACCEPTED. IMPLEMENTATION NOT STARTED. PHASE 9 NOT ACCEPTED.**

This is the final narrow confirmation after
[`2026-09-10-phase9-final-design-codex-audit.md`](2026-09-10-phase9-final-design-codex-audit.md).
Both remaining findings are corrected consistently in the proposal, authoritative
ledger, plan and reconciliation report.

## Confirmed

- T0A is strictly read-only. It contains no `set_stock_condition` invocation,
  mutation attempt, refused write or executable `PGRST202` probe. A subsequent
  TEST publishable-key OpenAPI GET returned HTTP 401 `Secret API key required`,
  so exposed-signature verification is routed wholly to T0B, as the audit's
  permitted alternative.
- The live `rehber` refusal and executable fallback probes belong only to the
  separately authorised T10 write window. A refused call is correctly treated
  as a mutation attempt even when it writes no row.
- T0B records the full captured table ACL
  `authenticated=rDxtm/postgres`; it no longer calls that ACL “only `r`”. The
  security conclusion is stated narrowly and correctly: direct DML privilege
  letters `a`/`w`/`d` are absent.
- T0A must pass before any implementation. When T0B is unavailable, all work
  dependent on exact policy/ACL/constraint/function-body facts remains blocked.
- The authoritative ledger contains **124 unique ids**: 115 plain and 9
  lettered. `M9-141c` and `M9-134c` are absent. The required stale-overwrite
  regression assertion remains inside `M9-134b`, where it belongs.
- `correct_document`, D-J1 through D-J4, Q1, Q3, Q4 and the conditional
  corrupt-history rule retain the corrected contracts from the preceding
  re-audit.

## Integrity checks

- ledger: 124 rows / 124 unique / no duplicates;
- Markdown tables: no inconsistent pipe counts in the four authoritative Phase
  9 documents;
- relative links: no broken targets in those documents;
- `git diff --check`: exit 0 (only pre-existing CRLF conversion advisories);
- staged files: 0.

## Next gate

Run **T0A** read-only against TEST `alkjjbaawmsirsfvqljm`. Never contact
production `bbjmhaerssakbreykxiw`. Do not begin application implementation until
T0A passes. T0B requires authorised catalog access or a fresh trusted capture;
an ordinary TEST UI password cannot satisfy it.

This design acceptance authorises neither a database write nor T10. Phase 9
remains **NOT STARTED / NOT ACCEPTED**.
