# Phase 13 — independent Codex design audit

Date: 2026-09-11
Verdict: **DESIGN ACCEPTED AFTER CORRECTIONS.** Phase 13 remains `NOT STARTED /
NOT ACCEPTED`; application implementation requires the owner's decisions
D-N1…D-N3 and D-N5…D-N7.

## Corrections required and applied

1. **D-N4 was based on false JavaScript semantics and is withdrawn.** The
   filter values come from `HTMLInputElement.value`, so they are strings.
   `''` is falsy, but `'0'` is truthy; consequently an exact zero bound runs
   and `parseFloat('0')` supplies numeric zero. Proposal §2.8/§6/§7, M13-84,
   plan T2 and the handoff decision table now state the real contract. The
   falsifiable test uses zero-price/zero-sum and positive rows; a zero maximum
   must retain only the zero row.
2. **The atomic snapshot wording contradicted the non-fatal reference rule.**
   M13-12 correctly preserves readiness when `get_reference_values` fails, but
   the old M13-13 and T4 text said *any reader* failure applies nothing. The
   design-time atomic failure rule was limited to the three core table reads.
   The implementation audit later refined the React generation to include the
   required item catalogue as fatal; reference failure still applies the
   complete snapshot with an empty channel list, and author labels reuse the
   boot-warmed application directory.
3. **D-N1 understated the live-window residuals.** One base
   create/edit/delete cycle does leave one sequence advance and three audit
   rows, but the required M13-70 partial-success leg creates additional
   documents. Each successful group consumes another sequence value; cleanup
   restores the document catalogue but adds a permanent DELETE audit row to
   that group's INSERT history. The plan now requires per-document capture,
   cleanup and exact final-delta reconciliation rather than promising a fixed
   residual count.

No ledger id was added or removed and no status was promoted.

## Primary-source checks

- `nav-sm` is present once, has no hidden style, and is absent from both the
  sign-in visibility assignments and `go()` role gates: the route is ungated.
- Legacy `smLoad()` makes projects/documents/lines jointly fatal and reads
  reference values in a separate non-fatal try/catch.
- The two import paths, seven-part document grouping key, qaimə/avtomobil
  header exclusion, per-group non-atomic create loop and two-sheet export all
  match `index.html:6368-6726`.
- The captured TEST schema confirms RPC-only writes, role/project binding,
  first-pass edit validation followed by line delete/reinsert, cascade delete,
  audit writes, sequence consumption and RLS scope. This is source evidence,
  not a live catalog verification.
- The proposed page-specific reader avoids widening the accepted Phase 3
  `fetchSerfiyyat()` contract.

## Mechanical and safety checks

The ledger contains 77 rows, 77 unique ids, 0 duplicates and 0 unclassified;
all 77 remain `NOT STARTED` and every row has five cells. Relative links and
Markdown tables were checked, `git diff --check` is clean and staging is empty.
No Supabase project was contacted and no application, test, SQL, CSS or env
file was changed by this audit.

## Owner decisions

The design recommends: D-N1 narrow TEST write window with exact per-document
sequence/audit residual accounting and cleanup; D-N2 page-specific reader; D-N3 retain the legacy
non-atomic group-import loop; D-N5 add document/line realtime as a declared
improvement; D-N6 retain raw-UUID fallback; D-N7 retain no-CSV export. D-N4 is
not an owner decision.
