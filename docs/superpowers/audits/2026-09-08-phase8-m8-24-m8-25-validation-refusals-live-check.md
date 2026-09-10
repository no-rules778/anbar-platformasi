# Phase 8 M8-24/M8-25 document validation refusals — 2026-09-08

## Result

Narrow PASS for five TEST-admin, non-layer server validation/no-write paths of
ordinary and transfer document cancellation. Phase 8 remains **NOT ACCEPTED**.

Only TEST project `alkjjbaawmsirsfvqljm` was contacted. Production project
`bbjmhaerssakbreykxiw` was not contacted. No successful mutation or new fixture
was needed; localhost remained read-only.

## Evidence

| RPC case | response |
|---|---|
| `cancel_document` with whitespace document number | HTTP 400 / P0001: `Etibarlı sənəd nömrəsi yoxdur — bu düzəliş ayrıca təsdiqlənmiş storno əməliyyatı tələb edir` |
| `cancel_document` with guaranteed-absent document | HTTP 400 / P0001: `Sənəd tapılmadı: SND-NOT-EXIST-M824-20260908` |
| `cancel_document` with transfer document `SND-3550711E4C` | HTTP 400 / P0001: `Yerdəyişmə sənədi bu funksiya ilə ləğv edilmir — cancel_transfer_document istifadə edin: SND-3550711E4C` |
| `cancel_transfer_document` with whitespace document number | HTTP 400 / P0001: the same valid-document-number refusal |
| `cancel_transfer_document` with ordinary document `SND-D512FAAC59` | HTTP 400 / P0001: `Yerdəyişmə sənədi tapılmadı: SND-D512FAAC59` |

The admin-visible movement count was 28 immediately before and 28 immediately
after all five calls. None created a reversal or partial row.

## Status impact and limits

- `M8-24`: adds blank-document, missing-document and wrong-family transfer
  refusal/no-write evidence.
- `M8-25`: adds blank-document and wrong-family ordinary-document
  refusal/no-write evidence.

This is direct server-contract evidence, not React error rendering. Layer
variants, other roles, malformed mixed documents, stock shortage, stale races,
transport/unknown outcomes, refresh failure and concurrency remain open.

