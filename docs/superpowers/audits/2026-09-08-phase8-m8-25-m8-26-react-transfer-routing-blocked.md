# Phase 8 — M8-25/M8-26 React layer-transfer routing: BLOCKED, no live evidence added

Date: 2026-09-08
Scope: TEST project `alkjjbaawmsirsfvqljm` only. Production `bbjmhaerssakbreykxiw`
was not contacted.
Outcome: **The preferred scenario was NOT executed.** No TEST write was made and
no fixture was created. This file records the blocker and the checks that were
actually run, so the attempt is not repeated blindly.

## Intended scenario (not performed)

The preferred continuation was a fresh exact transfer from `Test Anbar` to
`CODEX Phase8 Transfer Anbar`, cancelled through the real React document view,
to prove that React selects `cancel_layer_transfer_document` for the transfer
family while the layer capability is active — the last open React-routing
destination in M8-26.

## Blocker (exact)

This agent session has **no authenticated browser-control capability**. There is
no Playwright/CDP/browser MCP tool and no browser-automation tool of any kind in
the session tool set. The React transfer-cancel action cannot be driven, and the
real document dialog cannot be observed.

A second, independent blocker was confirmed empirically: a direct read against
TEST with only the publishable anon key returns **HTTP 401** for
`GET /rest/v1/movements` (count request, `Range: 0-0`). Row visibility is behind
an authenticated session, so even a read-only server-side read-back of a fixture
is unavailable in this session — not only the UI half.

Because both the UI driver and an authenticated read-back are missing, executing
the write would have produced an unverifiable mutation. The task's own fallback
rule forbids speculative direct writes, so the scenario was stopped at the
boundary rather than attempted.

## What was verified instead (no repetition of confirmed live checks)

The transfer-routing claim was re-established at the level that is actually
reachable offline — code and test, explicitly **not** promoted to live evidence:

- `api/documentCancel.api.ts` keeps the `D-I1` pair separate and typed:
  `cancelTransferDocument` sends `p_original_doc_num`;
  `cancelLayerTransferDocument` sends `p_doc_num`.
- `components/movements/DocumentViewDialog.tsx` dispatches on the re-assembled
  `fresh.kind === 'transfer-doc'` after the stale re-check, choosing the layer
  variant from the live `layerActive` capability flag.
- `components/movements/DocumentCancel.test.tsx` already asserts the layer
  transfer branch end to end, including the negative assertion that
  `p_original_doc_num` is absent from the layer call.

This coverage already existed; it was inspected, not newly written. It does not
close the M8-26 transfer gap, which is a live-UI observation requirement.

## Checks run in this session

| Check | Result |
| --- | --- |
| Focused tests: `DocumentCancel`, `documentCancel.api`, `documentCancelState` | **142 passed / 3 files** |
| `tsc --noEmit` | exit 0 |
| `oxlint src` | exit 0, no findings |
| `vite build` (production) | exit 0, known large-chunk size only |
| `git diff --check` | exit 0 (CRLF advisory warnings only) |
| Localhost `127.0.0.1:5175` | HTTP 200 |
| `web/.env.sandbox.local` | `VITE_ALLOW_LOCAL_WRITES=false` |
| TEST anon read probe | HTTP 401 (RLS; documents the blocker) |

## Safety state

- No write window was opened, so none had to be closed. Localhost was already
  read-only and remains read-only; `mutationGuard` reads
  `VITE_ALLOW_LOCAL_WRITES` and it is `false`.
- No TEST mutation, no fixture, no commit, stage, push or deploy.
- The dirty working tree was preserved; no reset, clean, stash or checkout.
- No credential, token, cookie or session material is recorded here.

## Status

M8-25 and M8-26 are **unchanged**. Their React transfer-routing halves remain
OPEN and CODE VERIFIED only. **Phase 8 remains NOT ACCEPTED.**

## Exact next step when a session regains browser control

Run the intended scenario above with a safely small quantity, read back source
and reversal rows, both exact layers and the transfer link, finish the fixture
net-zero, and return localhost to read-only immediately afterwards.
