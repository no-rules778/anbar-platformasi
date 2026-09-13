# Phase 13 — independent Codex implementation audit (2026-09-11)

> **CLOSURE RECONCILIATION — 2026-09-11 (latest).** The owner accepted the
> unobserved rehber refusal in M13-91 as non-blocking. A TEST Supabase
> Dashboard SQL Editor read-only query, run as database role `postgres`,
> returned persisted `serfiyyat_documents` audit rows: 7 INSERT, 2 UPDATE and
> 7 DELETE, with the exact three fixed Azerbaijani reasons. All seven DELETE
> `old_values` payloads contain the original header fields and `lines` array.
> Thus M13-94 is LIVE VERIFIED. The zero rows seen by the ordinary TEST admin
> remains valid evidence of client-side RLS, not a contradiction. No SQL
> mutation was executed. The historical open-boundary text below is superseded
> only as to M13-91/M13-94; Phase 13 still requires this final independent
> acceptance audit before it can be marked ACCEPTED.

## Final acceptance update — 2026-09-11

**ACCEPTED.** This independent closure review re-ran the current full suite:
168 files / 3741 tests passed. `tsc -b --noEmit`, `oxlint src`, and
`vite build --mode sandbox` all passed; the build retains only its known
chunk-size advisory. `git diff --check` passed and staging is empty.

The only prior two acceptance boundaries are resolved: the owner accepted
M13-91's unobserved rehber refusal as non-blocking, and the Dashboard read-back
above independently verified M13-94 against persisted TEST audit records. The
authoritative ledger has 77 unique rows: 68 `CODE VERIFIED`, 9 `LIVE
VERIFIED`, and zero rows in every open status. No application code or TEST data
was changed by this acceptance review.

**Documentation correction recorded:** M13-90's pre-existing ledger row had
four cells because its empty Server-ref cell was absent. The contract and
status were unchanged; the explicit `—` cell restores the authoritative table
to five columns. This was caught by the final table-shape validation.

## Historical pre-closure verdict

**NOT ACCEPTED (SUPERSEDED by the final acceptance update above).** The implemented/code-verified scope passes the independent
gate after two defects were corrected. A narrow T7 TEST create/edit/delete leg
subsequently ran and closed cleanly, but the grouped-import and server-refusal
matrix remain open.

## Defects found and corrected

1. `serfiyyat.store` fetched the user directory on every page load although
   `App` already warms the accepted application-wide directory at boot. The page
   now consumes `useAuditLogStore.emails`; the exact page source set is three
   `serfiyyat_*` tables, the required item catalogue and reference values, with
   no duplicate directory RPC. The three tables plus items are fatal/atomic;
   reference failure remains non-fatal.
2. A successful create cleared only Zustand draft state. Because create mode
   keeps `editDocId === null`, the edit-id effect did not run and component-local
   fields survived into the next create. The success transition now clears the
   complete local editor. Its regression test fills the relevant fields and
   proves they are empty after success.

## Independent verification

- Focused Phase 13 scope: 13 files / 418 tests passed.
- Full suite: 168 files / 3741 tests passed.
- Typecheck and oxlint: exit 0; four existing Fast Refresh warnings remain.
- Sandbox production build: 238 modules, success; existing chunk advisory only.
- `git diff --check`: exit 0 (line-ending advisories only).
- Ledger: 77 rows / 77 unique; 67 CODE VERIFIED, 8 LIVE VERIFIED, 2 IN
  PROGRESS, 1 NOT STARTED, 0 unclassified.
- Staged files: 0; dirty working tree preserved.

## Open acceptance boundary

Both TEST identities authenticated successfully. With the owner's continuation
approval, admin `manage_reference` created temporary project
`CODEX Phase13 T7 Project`, linked to `Test Anbar`. The real React UI then:

- created `SM-2026-000001` as anbardar with one `0000001` line;
- showed it in the anbardar report;
- edited it as admin and read back note `CODEX T7 edit verified`;
- cleared the complete editor after the async reload;
- displayed the exact irreversible-delete confirmation; and
- deleted it, after which both document and line tables were empty.

The project was then deleted through admin `manage_reference`; read-back showed
0 documents before project cleanup and 0 project rows afterwards. A separate,
fresh temporary-project server leg then proved that an authenticated admin's
direct PostgREST INSERT is refused, and an admin edit replaces the document's
line-id set before the document/project were again deleted. A third temporary
project made every safe create refusal observable: anonymous session,
nonexistent project, missing date, unknown channel, empty lines, empty or
unknown code, invalid quantity forms and invalid price were all refused. These
permanent project/document-sequence/audit residuals are within
D-N1. However this TEST admin receives 0 rows from `audit_log`, so M13-94
cannot be closed by read-back. The real UI group-import failure path proved two
preview groups, two create RPCs, one persisted first document and one refusal
after the second project was deactivated. The document was deleted. The two
projects are inactive rather than deleted because their document history makes
deletion server-refused. A fresh channel was created, deactivated, used only in
a refused create RPC, and deleted; M13-92 is therefore closed. An anbardar
foreign-project refusal was observed through TEST RPC. The known rehber TEST
identity did not authenticate with any explicitly supplied credential candidate,
so that role refusal remains open in M13-91. No further guesses are permitted.
The temporary write-enabled 5176 server was stopped; 5175 remains HTTP 200
read-only. Production was never contacted.
