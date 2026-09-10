# Phase 8 — anbardar Silinmə report live check (2026-09-08)

## Verdict

**PASS, narrowly scoped.** The non-admin `anbardar` path was exercised on the
TEST project `alkjjbaawmsirsfvqljm` (`anbar-test`). This is evidence for the
rendered screen, observed visibility and the separate Silinmə-report download.
It is **not** a complete RLS correctness proof and does not make Phase 8
`ACCEPTED`.

## Account and role preparation

- The user created Auth identity `anbar-anbardar-test@example.com`, id
  `089440eb-94a1-4560-ac12-6dbf0a4914ca`, in the TEST project.
- `handle_new_auth_user()` created the corresponding `public.users` row as
  `role='baxis'`, `warehouse=NULL`, `active=true`.
- After an explicit action-time approval, one guarded TEST-only update changed
  that row to `role='anbardar'`, `warehouse='Test Anbar'`, `active=true`.
  The update required the exact id, email, previous `baxis` role and null
  warehouse, and the resulting row was verified by a separate SELECT.
- No password is recorded in this evidence. The Chrome login did not select
  «Məni bu cihazda yadda saxla». The existing in-app admin session was not
  logged out or altered.

These are deliberate TEST fixture/account writes. No production project,
schema, RPC body, application code or deployment was changed.

## UI observation

The fresh localhost session identified itself as
`anbar-anbardar-test · Anbardar`. On «Mal hərəkəti»:

- the unfiltered screen rendered five movement rows, all for `Test Anbar`;
- the warehouse selector offered only `Test Anbar` in addition to the
  aggregate «Bütün anbarlar» choice;
- selecting operation type «Silinmə» left exactly one visible row:
  `02.09.2026`, `Test Anbar`, item `0000001`, quantity out `3.00`, note
  `Synthetic outgoing`;
- «Silinmə hesabatı» rendered and became enabled for that filter.
- the admin-only «Qrup üzrə ləğv» action did not render.

This confirms observed warehouse-scoped output for the current fixture. It
does not prove RLS correctness because TEST contains no independently known
movement from another warehouse that this identity must be denied.

## Downloaded workbook

The real button downloaded `Silinme_hesabati_2026-09-08.xlsx`:

- size: **18,113 bytes**;
- SHA-256:
  `EDDFCEE67D2CBE53E0A1F64167C12EE7590CC69E77832EFFE646716F14082DC1`;
- one worksheet: `Silinmə hesabatı`;
- used range: `A1:Q2`;
- 17 headers and one body row;
- text item code `0000001`, quantity `3`, valuation method `legacy`;
- price, final amount and source amount are blank; known amount is numeric `0`;
- recorder is `anbar-admin-test@example.com`.

The file is byte-identical to the admin artifact checked on 2026-09-07. The
current artifact was inspected structurally and at cell level. Native Excel
open/no-repair was not repeated in this run; the prior user-operated native
check applies to identical bytes but is not relabelled as a new Codex-operated
Excel check.

## Ordinary Excel export

After returning the type filter to «Bütün növlər», the ordinary «Excel» button
downloaded `mal_hereketi_2026-09-08.xlsx`:

- size: **20,034 bytes**;
- SHA-256:
  `A0AA03A7ACA69732957A69A7360049A457FFB51B0823B0FB13AD593801E9C085`;
- one worksheet: `Hesabat`;
- used range: `A1:O6`;
- 15 headers and five body rows;
- the five rows, quantities, prices, amounts, document references and recorder
  labels match the five rows visible to the `anbardar` session;
- the file is byte-identical to the 2026-09-07 admin ordinary-export artifact.

This closes the narrow `anbardar` half of the earlier A7 button/download check.
It does not cover `rehber`, volume, concurrency or a denied foreign-warehouse
row.

## Status impact

- `M8-02`: gains narrow live evidence that the Silinmə-report action renders
  and enables for `anbardar`, while the admin-only batch-cancel action does not
  render.
- `M8-42`: **PARTIALLY LIVE VERIFIED**, observed `Test Anbar` visibility only;
  full allowed/denied RLS comparison remains open.
- `M8-50`: remains **PARTIAL**, now including one `anbardar` ordinary
  real-button download; «Çap» is still NOT STARTED.
- `M8-50b`: remains **PARTIALLY LIVE VERIFIED**, now including one
  `anbardar` real-button download.
- `rehber`, populated source lots,
  pagination/volume, concurrency/refresh-abort, and native Excel opening of
  this newly downloaded file remain unexecuted.

**Phase 8 remains NOT ACCEPTED.**
