# Phase 17 offline write/import/export slice — independent Codex audit

Date: 2026-09-12 · Scope: offline-only Phase 17 continuation

## Verdict

The import parser, admin affordances and mutation-guard expansion are accepted
at their stated CODE evidence level after correcting the write payload model.
The template export integration is not complete. Phase 17 remains **NOT
ACCEPTED**.

## Application defects corrected

The mocked write-client tests had encoded incomplete or incorrect payloads:

- `azp_save_card` reads `p_card.id`; the client type exposed `card_id`, which
  would make an intended update look like a create. The type and regression
  now require the SQL-recognised `id` and include the editable `project` field.
- Manual `azp_post_movements` rows lost `doc_num` and `note` at the type
  boundary. Both are now expressible and their exact RPC passthrough is tested.
- `azp_correct_movement` reads `doc_num`, but the correction type omitted it.
  The field and passthrough assertion are added.

These are payload-shape corrections only. No RPC was invoked.

## Over-promotion corrected

`azpTemplateExport.ts` is a collection of pure helpers. It does not perform
the legacy `azpExport()` workflow: fetch the template, load/generate a ZIP,
write patched archive parts, remove the other sheet and calc chain, trigger a
download, or execute the plain SheetJS fallback from a catch branch. Testing
the patch transform and fallback message cannot prove that orchestration.

M17-95, M17-96, M17-98 and M17-99 are therefore `IN PROGRESS`. Their helper
halves remain valid; no work was discarded. The authoritative tally is now
89 CODE VERIFIED / 4 IN PROGRESS / 17 BLOCKED / 110 unique.

## Verification

- Corrected write API: 36 tests passed.
- Focused offline slice: 6 files / 216 tests passed.
- Full suite: 203 files / 4302 tests passed.
- Typecheck: clean.
- M17 checker: PASS, 10/10 self-tests; 110 contiguous unique rows.
- `git diff --check`: exit 0; staged files: 0.

No Supabase contact, TEST mutation, fixture, import, delete, real-data export,
production contact, stage, commit, push or deploy occurred. The dirty tree is
preserved.

## Required continuation

Implement one real client-side template-export orchestrator that composes the
already-tested helpers and is called by the page's export control. Its tests
must execute both the designed-template success path and the real SheetJS
fallback path, assert the ZIP part writes/removals, prove the full unfiltered
non-cancelled module set reaches both paths, and prove the other module cannot
leak. Synthetic data only; M17-100 stays blocked because no real data may be
exported in this step.
