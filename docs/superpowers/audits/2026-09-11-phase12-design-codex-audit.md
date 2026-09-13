# Phase 12 — independent Codex design audit

Date: 2026-09-11  
Scope: «Nomenklatura sorğuları» (`rNreq()`) design only

## Verdict

**DESIGN PASS after corrections, pending explicit owner decisions D-M1…D-M6.**
Phase 12 remains **NOT STARTED / NOT ACCEPTED**. This audit alone does not
authorise application implementation or any TEST write.

Codex compared the proposal, authoritative 70-row ledger and TEST-only plan
with the legacy `rNreq()` surface and helpers and the external shared
`sql/017_nomenclature_requests.sql` contract. The role affordance/server
authority split, RPC-only write boundary, request/item separation, filter and
dialog behaviour, SQL guard order, approval lock/idempotency and immutable
audit-history model are suitable for implementation after owner closure.

## Corrections applied

1. The initial design simultaneously required a failed `item_requests` read
   to become a successful empty list and required every snapshot-read failure
   to return `ok:false` with retention. The React contract now consistently
   uses the accepted atomic model: failure is explicit; the previous snapshot
   is retained on refresh; an initial failure shows the page error. The
   legacy swallow-to-empty behaviour remains documented only as history.
2. Withdrawal and rejection were incorrectly called net-zero. They leave the
   decided request and server audit rows permanently. They are only
   item-catalogue-neutral. Approval additionally creates a permanent TEST
   item and consumes a seven-digit code.
3. The browser helper's silent early return for a missing/non-pending
   withdrawal target was ambiguously attributed to the RPC. The ledger now
   states that the server raises for those states and requires separate
   M12-92 refusal evidence.
4. The false statement that Phases 8-11 were read-only and the over-broad
   D-M2 affected-row range were corrected. Structural M12-93 is not described
   as write-blocked.

These corrections change no row id or tally.

## Owner package assessment

D-M1, D-M3, D-M4, D-M5 and D-M6 are recommended as written: preserve legacy
rail order, defer the unused cross-user candidates RPC, add the explicitly
labelled realtime improvement, defer the rail counter to Phase 18, and retain
withdrawal without confirmation.

D-M2 requires a separate explicit acknowledgement because it leaves
irreversible TEST history. Approval permanently creates one item and consumes
one code; every create/withdraw/reject/approve leg leaves request/audit rows.
Implementation and read-only verification may proceed without D-M2, but the
write window must not open from this audit or from a generic “continue”.

## Integrity

The authoritative ledger has **70 unique rows**, all `NOT STARTED`, no
duplicates and no unclassified status. The package is documentation-only;
staging remains empty and production is outside scope.

