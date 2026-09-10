# Phase 9 design package — owner decision

Date: 2026-09-10  
Decision maker: product owner  
Status: **APPROVED**

The owner explicitly approved the Phase 9 design package after the independent
Codex re-audit.

1. **Q1 — condition write path:** included in Phase 9.
2. **D-J1 — failed condition read:** a failed `stock_conditions` refresh is
   fatal for the new snapshot; the last successful snapshot remains visible.
3. **D-J2 — realtime scope:** the Phase 9 screen subscribes to
   `stock_conditions` and does not subscribe to the irrelevant `partners`
   table.
4. **D-J3 — mid-edit refresh:** an active condition editor survives realtime
   refresh. Escape adopts the latest snapshot; blur commits. A commit sends the
   user's value for the edited key and the latest snapshot values for the other
   three condition keys and note, preventing a stale-field overwrite. The RPC
   response remains authoritative.
5. **D-J4 — initial-balance marker:** reconstruction recognises the historical
   marker in `partner` **or** `channel`, matching the already-supported write
   definition. The legacy partner-only omission is not copied.

This decision approves design behaviour only. It does not authorise an
implementation-time or live database write. The single reversible TEST write
still requires the separately defined final T10 gate. It authorises no
production contact, deployment, layer deactivation, cutover, commit, push or
merge.

Phase 9 remains **NOT STARTED / NOT ACCEPTED** until implementation and the
required independent verification are complete.

