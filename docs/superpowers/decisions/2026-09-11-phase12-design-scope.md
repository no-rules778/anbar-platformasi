# Phase 12 — owner design-scope decision

Date: 2026-09-11

The owner accepts D-M1 and D-M3…D-M6 and authorises complete Phase 12
application implementation plus read-only TEST verification:

- D-M1: preserve the legacy rail placement;
- D-M3: defer `item_request_candidates()` to the later improvement review;
- D-M4: subscribe to `item_requests` and `items`, recorded as an improvement;
- D-M5: defer the rail pending counter to Phase 18;
- D-M6: preserve withdrawal without a confirmation prompt.

D-M2 is explicitly **DEFERRED / NOT AUTHORISED**. No TEST request may be
created, withdrawn, rejected or approved under this decision. In particular,
no permanent TEST item or consumed seven-digit code is authorised. All
write/server-live ledger clauses remain unpromoted unless the owner later
authorises a separate window with immutable residual-history accounting.

This decision permits implementation, unit/source verification, the complete
offline gate and read-only browser verification. It does not permit
production contact, SQL changes, database mutation, fixtures, staging,
commit, push or deployment. Phase 12 remains NOT ACCEPTED pending
implementation and independent Codex acceptance.

