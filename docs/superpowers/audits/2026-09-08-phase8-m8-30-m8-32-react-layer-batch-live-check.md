# Phase 8 M8-30/M8-32 React layer-batch live check — 2026-09-08

## Scope

- TEST `alkjjbaawmsirsfvqljm` only, authenticated admin.
- Real local React UI with a process-only write enablement; the environment
  file remained `VITE_ALLOW_LOCAL_WRITES=false`.
- Stock-layer capability active, version 36.

## Eligibility and confirmation UI

Two fresh one-line exact receipt documents were created:

- `CODEX-P8-LAYER-BATCH-UI-A-20260908224700`, movement
  `1281ee44-c52d-46bb-9efc-f4212f63dbc4`;
- `CODEX-P8-LAYER-BATCH-UI-B-20260908224700`, movement
  `c5f16fc6-5ab7-43a4-b155-e6f405b6ea35`.

The real `Qrup üzrə ləğv` search dialog listed both as selectable
`Ləğv edilə bilər`. In the same rendered matrix it kept ineligible history
visible with explicit reasons, including already-cancelled documents,
reversal documents, document-less legacy records and unsupported `Alış`
records. Selecting both fixtures changed the independent selected count to
`2 sənəd seçilib` and enabled `Davam et`.

The confirmation step named both documents and their line details, showed
the aggregate `2` documents / `2` lines / quantity `2.00`, and stated the
all-or-nothing rule before execution.

## Execution and read-back

The real React submit displayed `2 sənəd qrup üzrə ləğv edildi`. Direct
authenticated read-back proved:

- movement count changed 81→83;
- source A remained and reversal `SND-C-1B1EE224AF` added one outbound unit;
- source B remained and reversal `SND-C-8E4649973F` added one outbound unit;
- both reversal rows share the same server timestamp;
- both exact source layers changed from available 1/active to 0/inactive;
- effective `Test Anbar / 0000002` balance returned to zero.

The temporary write-enabled Vite process was stopped immediately after the
read-back. Localhost was restarted in sandbox mode with no override and the
environment file still says `VITE_ALLOW_LOCAL_WRITES=false`.

## Acceptance effect

M8-26 gains real React evidence for the layer-batch RPC selection. M8-30 gains
narrow real rendering evidence for eligible and several ineligible reason
families. M8-32 gains real TEST-admin React layer-batch success and database
reconciliation evidence. Search/filter edge cases, roles, malformed or unknown
outcomes, refresh failure and UI concurrency remain open. **Phase 8 remains
NOT ACCEPTED.**
