# Phase 8 — TEST cancellation and correction evidence

2026-09-08. Target: `alkjjbaawmsirsfvqljm` only. Phase 8 remains NOT ACCEPTED.

The React localhost UI ran these operations as the TEST admin. SQL Editor SELECT queries checked the resulting movements and audit_log.

| Scenario | Original | Result | Audit entries including fixture creation |
| --- | --- | --- | --- |
| B1 ordinary cancellation | SND-19BC90E738, incoming 1 | SND-C-0CF02C71FD, outgoing 1 | 2 INSERT |
| B3 batch cancellation | SND-5443574E03 and SND-018C524431, incoming 1 each | SND-C-1BCA3DC328 and SND-C-47CF6234DA, outgoing 1 each | 4 INSERT |
| B4 correction | SND-5DE0837805, incoming 1 | SND-C-B48FFF4DBE reverses 1; SND-12B8BCDD3A replaces with incoming 2 at price 12.5 | 3 INSERT plus 1 explicit correct_document UPDATE |

Original rows remain. B3 UI reported 2 cancelled documents. B4 UI reported old-to-new document numbers and cleared edit mode. B4 reversal and replacement share timestamp `2026-09-08T05:33:36.180431+00:00`. Replacement note: `CODEX Phase 8 correction replacement · Əvəz edir: SND-5DE0837805`. Explicit audit reason: `Sənəd düzəlişi (correct_document): Phase 8 TEST canlı yoxlama`; record_id is the original document, new_values names the replacement and row_count 1. Ten matching audit entries were read in total.

## Fix discovered during B4

NewOperationPage opened EditLineDialog without calling the store's openEditLine(index). saveEditLine consequently returned on a null editLineIndex while the dialog closed, discarding quantity/note changes. The page now initializes that index after its existing layered-line refusal. A regression drives a valid inbound edit through the real page and checks quantity and note in the resulting line. It passed independently. Its initial outbound fixture had no stock and correctly failed validation; the fixture was corrected to inbound to reproduce B4.

The live retest showed quantity 2 and amount 25 before the final submission. B4 was submitted only after that verification.

## Lasting changes and scope

An absent TEST stock_layer_settings row was inserted with defaults: singleton true, schema_version 36, active false, cutover_at null. This is a lasting configuration change, not restoration of the absent-row state. Layers were not activated. B1/B3 remain with reversals; B4 remains with original, reversal and replacement, contributing net quantity 2 to TEST stock. No cleanup deletion occurred.

The sandbox write flag was found true in `.env.sandbox.local` and changed to false. The localhost UI subsequently confirmed all writes blocked. No secrets are recorded here. No production change, staging, commit or deployment occurred.

Success evidence is limited to these ordinary admin paths. Layer/transfer behaviour, failure atomicity, unknown network outcomes, concurrency, other roles and complete RLS correctness are not established. M8-24, M8-32, M8-33 and M8-43 gain only this narrow partial live evidence; M7-109's ordinary caller and M7-120's ordinary correct_document audit consequence were exercised. No complete milestone acceptance follows.

## Verification

Before the fix: 2701 tests / 126 files passed with one worker; typecheck, lint and build passed. After the fix: **2702 tests / 126 files passed with one worker**; the focused page/dialog/store run passed **147 tests / 3 files**; typecheck and oxlint passed; the production build succeeded. The build emitted only the existing large-chunk warning.
