# Phase 8 M8-29 legacy transfer cancellation live check — 2026-09-08

## Result

Narrow PASS for the TEST-admin, non-layer, document-less transfer success path
and the server's already-cancelled refusal. Phase 8 remains **NOT ACCEPTED**.

Only TEST Supabase project `alkjjbaawmsirsfvqljm` was used. Production project
`bbjmhaerssakbreykxiw` was not contacted. The existing dirty working tree was
preserved; no commit, staging, push or deployment occurred.

## Fixture

With stock layers inactive, one atomic TEST insert created the exact two-leg,
document-less legacy pair for item `0000001`, quantity `1`, date `2026-09-08`:

| id | warehouse | in | out | partner | doc_num |
|---|---|---:|---:|---|---|
| `f8a47ad3-3cc5-4b94-ac5b-9e3fa6245f57` | `Test Anbar` | 0 | 1 | `CODEX Phase8 Transfer Anbar anbarına` | `null` |
| `9cc66c49-db51-4136-868e-eed0f876353a` | `CODEX Phase8 Transfer Anbar` | 1 | 0 | `Test Anbar anbarı` | `null` |

Both source rows carry invoice `CODEX-P8-LEGACY-TRANSFER-20260908` and note
`CODEX Phase 8 M8-29 docless transfer fixture`. The pair is unique under the
server contract's date/item/warehouse/quantity/opposite-direction matching.

## Browser path

The effective «Mal hərəkəti» table rendered both document-less
`Yerdəyişmə` rows. Opening the outbound row's real `Baxış` action selected the
legacy-transfer branch and showed:

- title `Köhnə yerdəyişmə · 0000001`;
- system document number `—` and the source invoice separately;
- the single clicked source leg;
- the explanation that the server writes only when exactly one valid opposite
  pair exists and writes nothing for ambiguity or stock shortage;
- the `Əks yerdəyişmə tarixi` field defaulted to `2026-09-08`;
- only the whole-transfer `Yerdəyişməni ləğv et` action.

The route appeared as `Test Anbar → —`. This is the same inherited one-pass
suffix-normalisation edge already observed in the numbered transfer audit when
a warehouse name itself ends in `Anbar`; both the old and React implementations
behave this way, so it is not a React regression.

Submitting the real action produced the UI result
`Yerdəyişmə ləğv edildi · əks sənəd: SND-LR-AE5EEE3FF0`. The refreshed
effective registry returned from 6 rows / inbound 13 / outbound 4 / value 136
to 4 rows / inbound 12 / outbound 3 / value 123.50.

## Direct TEST read-back

Both `doc_num = null` source legs remained unchanged. The RPC added exactly two
rows at `2026-09-08T18:53:57.061365+04:00` under
`SND-LR-AE5EEE3FF0`:

| id | warehouse | in | out | partner |
|---|---|---:|---:|---|
| `c75fea83-995e-4a9b-b0f8-f7db4bd76f20` | `Test Anbar` | 1 | 0 | `CODEX Phase8 Transfer Anbar anbarı` |
| `ec762d9f-4e0c-4616-86b2-94d8769a6549` | `CODEX Phase8 Transfer Anbar` | 0 | 1 | `Test Anbar anbarına` |

Both reversal rows have date `2026-09-08`, item `0000001`, price `0`, empty
invoice and the canonical marker:

`Ləğv (əks yerdəyişmə) ID: 9cc66c49-db51-4136-868e-eed0f876353a:f8a47ad3-3cc5-4b94-ac5b-9e3fa6245f57`

The equal/opposite rows restore both warehouse balances.

## Already-cancelled refusal

A direct authenticated repeat call to `cancel_legacy_transfer` for source
`f8a47ad3-3cc5-4b94-ac5b-9e3fa6245f57` returned HTTP 400 / PostgreSQL `P0001`
with `Bu köhnə yerdəyişmə artıq ləğv edilib`. The reversal document contained
two rows before and two rows immediately after the rejected call: no partial or
duplicate write occurred.

## Status impact and limits

- `M8-15`: all four dispatcher families now have narrow TEST-admin live
  evidence (ordinary document, transfer document, document-less ordinary and
  document-less transfer), in addition to the unsupported-type refusal.
- `M8-19`: partial live evidence for the legacy-transfer view and action.
- `M8-29`: both non-layer legacy cancellation RPC success families now have
  narrow TEST-admin evidence; this run additionally covers the transfer
  already-cancelled server refusal.

Not proved here: either layer variant, other roles, zero/ambiguous-pair and
stock-shortage refusals, stale UI races, transport/unknown outcomes, refresh
failure, concurrency, or independently readable audit consequences.

After the check, the temporary write-enabled listener was stopped.
`web/.env.sandbox.local` remained `VITE_ALLOW_LOCAL_WRITES=false`; sandbox Vite
was restarted and localhost returned HTTP 200.

