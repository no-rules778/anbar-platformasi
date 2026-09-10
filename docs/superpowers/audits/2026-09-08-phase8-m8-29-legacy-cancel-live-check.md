# Phase 8 M8-29 legacy ordinary cancellation live check — 2026-09-08

## Result

Narrow PASS for the TEST-admin, non-layer, document-less ordinary success
path. Phase 8 remains **NOT ACCEPTED**.

This check touched only TEST Supabase project `alkjjbaawmsirsfvqljm`.
Production project `bbjmhaerssakbreykxiw` was not contacted. The existing dirty
working tree was preserved; no commit, staging, push or deployment occurred.

## Preconditions and fixture

- `stock_layers_supported()` was already observed as `active:false`.
- A minimal document-less ordinary `Satınalma` movement was inserted in TEST
  after an initial invalid-counterparty attempt failed without a write.
- Source movement id:
  `e3cc15d4-d6f5-44f7-b723-989af25d4ac6`.
- Source values: date `2026-09-08`, `doc_num = null`, item `0000002`, warehouse
  `Test Anbar`, inbound quantity `1`, price `12.5`, invoice
  `CODEX-P8-LEGACY-20260908`, note
  `CODEX Phase 8 M8-29 docless fixture`.

The fixture is acceptance evidence and was not deleted.

## Browser path

The real React «Mal hərəkəti» table rendered the document-less fixture with
the `Baxış` action. Opening it selected the legacy ordinary branch and showed:

- title `Köhnə əməliyyat · 0000002`;
- system document number `—` and the preserved invoice separately;
- the single source row and recorder label `Excel idxalı`;
- `Malı əvəz et` and the whole-operation `Əməliyyatı ləğv et` action;
- the explanation that a document-less old record is cancelled only by an
  opposite outbound entry and the original remains unchanged;
- no ordinary document row-cancel control.

The defaulted reversal date was left at `2026-09-08` and the real legacy
cancel action was submitted. The dialog closed, the page refreshed, and the
effective KPI dropped from 5 records / inbound 13 / outbound 3 / inbound value
136 to 4 records / inbound 12 / outbound 3 / inbound value 123.50.

## Direct TEST read-back

An authenticated read immediately after the UI action returned exactly the
source and its compensating row:

| Role | id | doc_num | in | out | price | note |
|---|---|---:|---:|---:|---:|---|
| retained source | `e3cc15d4-d6f5-44f7-b723-989af25d4ac6` | `null` | 1 | 0 | 12.5 | `CODEX Phase 8 M8-29 docless fixture` |
| cancellation row | `7e912e34-8e03-4617-8898-355029b7bf7b` | `SND-L-26844B5387` | 0 | 1 | 12.5 | `Ləğv ID: e3cc15d4-d6f5-44f7-b723-989af25d4ac6` |

Both rows have date `2026-09-08`, item `0000002`, warehouse `Test Anbar`,
invoice `CODEX-P8-LEGACY-20260908`, price `12.5` and no partner. The source
retained `doc_num = null`; the RPC did not invent a document number for or
update the original. Instead it created the separately numbered opposite row
at `2026-09-08T18:43:55.564061+04:00`.

## Status impact and limits

- `M8-15`: partial live evidence now includes the document-less ordinary
  dispatcher branch. The document-less transfer branch remains open.
- `M8-18`: partial live evidence for the real legacy ordinary view and action.
- `M8-29`: partial live evidence for `cancel_legacy_movement` with TEST admin
  and layers inactive.

Not proved here: `cancel_legacy_transfer`, either layer variant, other roles,
stock/refusal cases, stale-state races, transport/unknown outcomes, refresh
failure, concurrency, or independently readable audit consequences.

After the check, the temporary write-enabled localhost process was stopped.
`web/.env.sandbox.local` still contained `VITE_ALLOW_LOCAL_WRITES=false`; Vite
was restarted in sandbox mode and `http://127.0.0.1:5175/` returned HTTP 200.

