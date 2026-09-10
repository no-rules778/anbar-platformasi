# Phase 8 — M8-32 all-or-nothing failure message, live in the real dialog

Date: 2026-09-09 (Asia/Baku)
Environment: TEST `alkjjbaawmsirsfvqljm`, read-only sandbox
Actor: TEST admin
Result: PASS for the message half of the contract, with an explicitly limited
negative control (see "What this run could NOT discriminate")

## The approved contract

The approved proposal states M8-32 as exactly:

> **M8-32 | Batch atomic execute + all-or-nothing failure message**

Two halves. The **atomic execute** half is already proved server-side on
2026-09-08: the batch RPC was called with a valid document FIRST and a
guaranteed-absent document second; it returned `P0001`, and an authenticated
read-back found the valid document unchanged with no reversal row — a real
rollback, not a partial cancellation
([evidence](2026-09-08-phase8-m8-32-batch-atomicity-live-check.md)). The layer
variant's own validation branches were proved separately
([evidence](2026-09-09-phase8-m8-30-m8-32-layer-batch-server-refusals.md)).

This run closes the remaining half: the **all-or-nothing failure message** as
the user actually sees it.

## Method

Read-only sandbox `127.0.0.1:5175` (`VITE_ALLOW_LOCAL_WRITES=false`, HTTP 200),
blanket abort on any `bbjmhaerssakbreykxiw` URL. The real «Qrup üzrə ləğv»
dialog was driven end to end through the genuine UI: open → select the single
eligible document → «Davam et» → the confirmation step → the final
«1 sənədi ləğv et».

**Nothing was written.** `doc.cancel-batch` is a guarded write
(`mutationGuard.ts:53,63`), so on read-only localhost `blockedReason()` returns
non-null and `BatchCancelDialog.tsx:307-311` takes the `res.blocked` branch
**before any Supabase call**. Observed directly: `0` batch RPC requests left
the browser.

## Evidence

The confirmation step rendered the atomicity contract to the user verbatim:

> «Aşağıdakı 1 sənəd bir atomar əməliyyatda ləğv ediləcək. Hər sənəd üçün
> əks-yazı yaradılır, orijinal sətirlər dəyişmir. **Hər hansı sənəd ləğv edilə
> bilməzsə, heç bir sənəd ləğv olunmur.**»

Submitting produced the all-or-nothing failure toast, captured live:

> «**Qrup üzrə ləğv baş tutmadı:** Bu əməliyyat lokal rejimdə bloklanıb:
> localhost CANLI Supabase bazasına qoşulub. İcazə vermək üçün web/.env
> faylında VITE_ALLOW_LOCAL_WRITES=true yazın. **— heç bir sənəd ləğv
> edilmədi**»

That is exactly `rejectedMessage(serverText)` from `batchOutcome.ts:365-367`:
`Qrup üzrə ləğv baş tutmadı: ${serverText} — heç bir sənəd ləğv edilmədi`,
with the refusal text echoed verbatim between the two fixed halves.

It also confirms two further approved contracts on a real screen:

- **M8-48** — `blockedReason()` is consulted INSIDE the API function and a
  blocked call reaches no network at all (0 batch requests observed).
- **M8-49** — `doc.cancel-batch`, one of the seven new `doc.*` actions, is
  genuinely guarded.

## What this run could NOT discriminate — stated, not glossed

A second mode was attempted as a negative control: abort the batch request at
the transport layer, which the outcome model must classify as UNKNOWN (only a
4xx may claim nothing was written — `batchOutcome.ts` and
`BatchCancelDialog.tsx:315-320`). **It produced the identical message**, and
the reason is structural: the write guard short-circuits before the network, so
the interception never fires and both modes exercise the same `res.blocked`
branch.

**The negative control is therefore NOT claimed.** This run proves the
all-or-nothing message renders correctly on a confirmed rejection; it does NOT
discriminate the `rejected` classification from the `unknown` one. Separating
those would require a write-enabled window so the request actually leaves the
browser — deliberately not opened here, since this is read-only harness work
and the atomicity half is already proved server-side.

`UNKNOWN_OUTCOME_MESSAGE`, `REFRESH_FAILED_MESSAGE` and
`UNKNOWN_AND_REFRESH_FAILED_MESSAGE` remain CODE VERIFIED, covered by
`batchOutcome.test.ts`. They are **not** part of M8-32's approved one-line
contract, which names the all-or-nothing failure message only.

## Safety

0 production contacts; 0 batch RPCs dispatched; no TEST row created, changed or
deleted; read-only sandbox throughout; session closed. No commit, stage, push
or deploy; dirty tree preserved; no `I-10` row.
