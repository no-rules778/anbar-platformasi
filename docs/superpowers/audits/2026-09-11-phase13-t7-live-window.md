# Phase 13 T7 — TEST live write window (2026-09-11)

## Scope and safety

TEST only: `alkjjbaawmsirsfvqljm`. Production was blocked and never contacted.
The write-enabled Vite process was confined to `127.0.0.1:5176` and stopped
after the work; the normal sandbox process on 5175 remained read-only. The
repository environment files were not edited and no credential was written to
the repository or this audit.

The owner had accepted D-N1's permanent-residual accounting. Every temporary
project and document created for this window was deleted through its supported
admin RPC before closing the window. Document-number sequence advances and
server audit history are intentionally not reversible.

## Real UI leg

An authenticated TEST anbardar created a one-line Sərfiyyat document through
the real React form, using an owner-authorised temporary project linked to
`Test Anbar`. The report displayed the created document. An authenticated TEST
admin edited the same document and the changed note was read back. The success
transition cleared the local editor only after its asynchronous reload.

The exact irreversible-delete confirmation was observed and accepted. The
document and its lines disappeared from the admin tables. **CORRECTION:** the
initial claim that the project could then be deleted was too broad: the server
refuses deletion once any historical document has referenced it, even after the
documents are deleted. The project was deactivated instead.

This proves M13-52, M13-53, M13-71 and M13-98. It does not prove persisted
audit visibility: the authenticated TEST admin saw zero `audit_log` rows.

## Follow-up server leg

A separate fresh temporary project was created solely to avoid coupling the
server checks to the UI fixture. It was deactivated after document cleanup when
the server's history-preservation delete rule applied.

- `create_serfiyyat_document`, then admin `edit_serfiyyat_document`, then
  `delete_serfiyyat_document` succeeded through supported RPCs.
- The document's line-id set was read before and after edit and changed, which
  proves the delete/reinsert contract in M13-93.
- An authenticated admin direct PostgREST INSERT into `serfiyyat_documents`
  was refused, proving M13-90's direct-table-write boundary.
- An authenticated RPC create with a negative quantity was refused, advancing
  only that negative-quantity part of M13-92 in the first server pass.

## Refusal-matrix follow-up

A final disposable project made the safe first-guard matrix observable without
creating a document. Anonymous session, nonexistent project, missing date,
unknown channel, empty lines, empty code, unknown code, zero/negative/exponent
quantity and negative price were each refused through TEST RPC. The project was
then deleted. This advances M13-92 but does not exercise an inactive existing
channel; the anbardar foreign-project refusal remains M13-91 because it
requires a separately linked warehouse identity.

## Group-import UI leg

After explicit owner approval to upload the temporary workbook, the real
anbardar UI read an `.xlsx` containing two separate document groups. The
preview rendered two groups; clicking its visible confirm control dispatched
exactly two `create_serfiyyat_document` RPCs and two documents were read back.
Both documents were deleted through the supported admin RPC. **CORRECTION:**
the linked project was deactivated, not deleted, because its history causes the
server to reject physical project deletion.

This proved the real file → parser → preview → confirm → one-call-per-group
success path. A later controlled failure pass closes the non-atomic clause.

## Correction history

An initial automation attempt used PowerShell's reserved `$pid` variable as a
fixture-project variable. It created an empty temporary project but did not
create a document, so its apparent pass was rejected. The named empty project
was located, verified empty and deleted. The clean follow-up used a distinct
`$projectId` variable and is the only server-leg evidence promoted above.

The first attempted non-atomic run also used `update` with an `active` property.
That RPC changes only a name/link; it does not deactivate a project. Both group
documents therefore succeeded. They were deleted, and the two projects were
deactivated. This wrong attempt is not M13-70 evidence.

## Group-import non-atomic failure leg

The same two inactive historical projects were temporarily reactivated for a
fresh UI upload. The preview contained two groups. Between preview and confirm,
the supported `manage_reference(action:'deactivate')` action deactivated only
the second project. Confirm then dispatched exactly two create RPCs: the first
created one document; the second refused the now-inactive project. The first
document was read back, then deleted. Both projects were returned to inactive.

This is the actual D-N3 partial-success proof: a prior document remains after a
later server failure, and cleanup deletes the document but cannot erase project
history.

## Inactive-channel guard

A fresh `serfiyyat_channel` reference was created, deactivated, used only in a
refused admin create RPC, then deleted. No document was created. This closes the
otherwise unobserved inactive-channel branch of M13-92.

## Foreign-project role guard

An active project linked to a warehouse other than `Test Anbar` was created.
The authenticated Test-Anbar anbardar's create RPC was refused, and no document
was created; the unused project was then deleted. Attempts using the known TEST
rehber identity and every explicitly supplied credential candidate did not
authenticate. No further password guesses are permitted. M13-91 therefore remains
`IN PROGRESS` for the unobserved rehber refusal.

## Final state

No temporary T7 document remains. The history-bearing T7 projects remain only
as inactive rows, which is the server-required cleanup endpoint. The write
server is stopped; 5175 is read-only. No stage, commit, push or deploy
occurred.

## Dashboard audit-log read-back — closure update

The ordinary TEST admin's REST/UI view correctly remained empty under RLS. The
owner then authorised TEST Supabase Dashboard access. In SQL Editor, database
role `postgres` ran only `SELECT` statements: a grouped read returned 7
`INSERT`, 2 `UPDATE` and 7 `DELETE` `serfiyyat_documents` audit records with
the exact fixed reasons. A structural read of DELETE `old_values` returned all
seven payloads with the complete prior header keys and the `lines` key. M13-94
is therefore `LIVE VERIFIED`; no dashboard SQL mutation occurred. The owner
also accepted M13-91's unobserved rehber refusal as non-blocking. The final
independent Codex acceptance audit subsequently passed: **Phase 13 is
ACCEPTED.**
