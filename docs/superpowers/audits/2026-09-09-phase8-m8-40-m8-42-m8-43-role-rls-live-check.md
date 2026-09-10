# Phase 8 — M8-40/M8-42/M8-43 role and RLS live check

Date: 2026-09-09 (Asia/Baku)

Acceptance probes: TEST Supabase `alkjjbaawmsirsfvqljm`. See the explicitly
recorded localhost-mode deviation under Safety.

## Preconditions

Two dedicated auto-confirmed TEST Auth identities were created, then assigned
through the existing admin RPC:

- `anbar-anbardar-codex-test@example.com` — active `anbardar`, warehouse
  `Test Anbar`;
- `anbar-rehber-codex-test@example.com` — active `rehber`.

Passwords are intentionally absent from repository files. All three sessions
reported their expected role through `current_user_role()`.

## M8-40 — live server refusal

The `anbardar` session called `cancel_layer_documents_batch` with an empty
selection. The role check executes before payload validation and returned HTTP
400 / `P0001` with the exact server message:

`Yalnız Admin sənədləri ləğv edə bilər`

Authenticated admin read-back was 101 movements before and 101 after. No
cancellation, fixture or other movement write occurred. This supplies live
server-boundary evidence for one representative layer-batch mutation family.

## M8-42 — exact allowed/denied RLS comparison

The admin session read all 101 movements and independently partitioned them by
the assigned warehouse. Exactly 85 rows belonged to `Test Anbar`; 16 belonged
to `CODEX Phase8 Transfer Anbar`.

The `anbardar` session made the same unfiltered REST read and received exactly
the 85 `Test Anbar` rows: 0 allowed rows missing, 0 unexpected rows, 0 foreign
rows visible, and all 16 independently known destination rows denied. This
closes the previously open allowed/denied comparison for the current TEST
fixture and confirms that the server, not React, performs warehouse scoping.

## M8-43 — intended-role audit visibility

The admin session still received 0 `audit_log` rows, exactly matching
`p_audit_read`. The `rehber` session received 543 rows. Seven rows matched
known Phase 8 fixture document numbers, including the ordinary double-submit,
two-tab cancellation and row-cancellation fixtures. Examples include the
`UPDATE` audit for movement `e6c30903-615d-45dd-a0fb-0c90c2ec968a` with reason
`Sətir ləğv edildi: M8-46 row double-submit live check`, and counter movement
`6aff78b7-7e16-491f-9234-d608f274dc15`.

This resolves the intended-role visibility gap. It does not invent uniform
audit coverage for RPC families that do not write audit rows; the uneven
coverage recorded in the earlier M8-43 audit remains factual scope.

The real React audit page was then opened from a correctly started
`vite --mode sandbox` read-only localhost. It identified the user as
`anbar-rehber-codex-test · Rəhbər`, rendered `1–50 / 544`, and visibly showed
the M8-46 row-cancel `UPDATE` reason and counter movement IDs. The one-row
increase from the REST snapshot is the expected `register_session` audit. The
device session was subsequently ended through the TEST RPC and its active
device list returned empty.

## Safety

The only intended persistent changes were the two dedicated TEST identities,
their TEST role rows, and normal TEST session audit history. The refusal/RLS
probes wrote no movement and the baseline remains 101.

During the later React follow-up, localhost was first restarted without the
required `--mode sandbox`. Because default Vite mode reads `web/.env`, one
sign-in attempt using the new TEST-only `rehber` email/password was sent to the
production Auth endpoint and rejected; the UI remained at the login form. No
production session was established and no authenticated production REST read,
application write or fixture action followed. The process was stopped
immediately and replaced by `vite --mode sandbox`. This is a production-contact
policy deviation and is recorded rather than hidden; it supplied no acceptance
evidence.

The final localhost state is sandbox/read-only:
`VITE_ALLOW_LOCAL_WRITES=false`, HTTP 200. No commit, stage, push or deploy
occurred; the dirty working tree was preserved. No I-10 ledger row was created.
Phase 8 remains NOT ACCEPTED because unrelated OPEN rows remain.
