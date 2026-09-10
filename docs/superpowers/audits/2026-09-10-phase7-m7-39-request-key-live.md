# Phase 7 — M7-39 request-key invalidation, LIVE

Date: 2026-09-10
Scope: the single remaining exact-contract clause of `M7-39` — request-key
invalidation after a real LOCAL draft-line commit.
Environment: TEST `alkjjbaawmsirsfvqljm` only. Owner-authorised temporary
write-enabled origin, fail-closed interception, **zero mutations reached TEST**.
Phase 7 remains **NOT ACCEPTED** pending independent Codex audit.

## Why a temporary write-enabled origin was required

Under `VITE_ALLOW_LOCAL_WRITES=false` the request key is **structurally
unobservable**. `postLayerMovementDocument()` consults
`blockedReason('op.layer-post')` and returns failure *before* `supabase.rpc(...)`
is reached (`postMovementDocument.api.ts:116-118`), so no RPC — and therefore no
`p_request_key` — ever exists on the wire. The key is minted at the call site
(`operation.store.ts:833`, `get().ensureRequestKey()` evaluated as an argument)
but lives only in store state, which is not exposed on `window`.

The owner explicitly authorised a temporary write-enabled process for this
isolated TEST harness. Safety came from interception, not from the app guard:

- a **separate** Vite process on `127.0.0.1:5176`, started with
  `VITE_ALLOW_LOCAL_WRITES=true` **in the process environment only**;
- **no environment file was edited** — `.env.sandbox.local` verified
  byte-identical before and after (md5 `7244be4a…`, still
  `VITE_ALLOW_LOCAL_WRITES=false`);
- the read-only `:5175` server was preserved untouched throughout;
- the temporary process was stopped immediately after the run.

## Fail-closed interception

Installed on a **fresh browser context** *before* any navigation:

| Class | Handling |
|---|---|
| Any URL containing `bbjmhaerssakbreykxiw` | **abort** (production never contacted) |
| Mutation RPCs (`post_*`, `correct_*`, `cancel_*`, `replace_*`, `import_*`, `set_item_*`, `manage_*`) | **abort**; body captured first |
| Explicitly allowlisted read/session RPCs | continue |
| **Any other** `/rest/v1/rpc/*` | **abort** (fail closed, not allowed) |
| Non-RPC REST `POST/PATCH/PUT/DELETE` | **abort** |

A separate `response` listener independently watched for any mutation that
*completed*; it stayed empty.

## Sequence and result — ALL PASS

Authenticated as TEST admin; issuer ref asserted `alkjjbaawmsirsfvqljm`.
Each line was built through the **real UI**: «Məxaric» → item `TEST Mal 1
(0000001)` → the active condition split (`İCARƏDƏ (MAX 0.01)`, quantity
read-only while a split is active) → real `LayerPickDialog` (2 source layers
offered from the live `get_stock_layers` read) → allocation verified by
«Seçilib» moving to `0.01` → «Təsdiq et».

| Step | Observation |
|---|---|
| 1. First active-layer outbound line | committed locally, draft rows 0 → 1 |
| 2. First guarded post, «Sənədi qeyd et» → «Qeyd et» | **K1 = `4506f70f-8e0d-4bb0-bf13-a256c20d6de3`**, non-empty; RPC aborted |
| 3. Retry unchanged document (**positive control**) | key **exactly K1** again; RPC aborted |
| 4. Remove line-1, rebuild, post | **K_MID = `09c710f0-8226-45f5-b69f-8ec49037654e`** |
| 5. Second real local commit, post again | **K2 = `a6b2db3d-6dbf-4073-9412-5698e3e29bdc`**; RPC aborted |
| 6. Comparison | **K2 ≠ K_MID** and K2 ≠ K1 |

**Why K_MID exists.** TEST stock reality forced it: «TEST Mal 1» is the only
outbound-eligible item, and its only marked condition bucket is «İcarədə» with
`MAX 0.01` at step `0.01` — one line consumes the entire outbound capacity, so a
second line cannot stand beside the first. Removing line-1 is unavoidable, but
`removeLine` *also* clears the key (`operation.store.ts:436-439`), which alone
would confound attribution. K_MID is captured **after the removal and before the
commit under test**, so the only event between K_MID and K2 is the real local
commit. **K2 ≠ K_MID is the load-bearing claim**; K2 ≠ K1 is reported alongside.

The positive control is what makes the negative meaningful: the harness is
demonstrably capable of observing an *unchanged* key, so a changed key is a real
signal rather than nondeterminism.

## Containment and baseline reconciliation

- mutation RPCs observed: **4 × `post_layer_movement_document`, all aborted**;
- mutation RPCs **completed: 0**;
- unknown-RPC fail-closed catches: 0 (allowlist was sufficient);
- production requests: **0**;
- «Sənədi qeyd et» was pressed only through the fully intercepted path; no
  un-intercepted post was ever attempted.

TEST baseline compared **before and after** on the read-only `:5175` origin:
**3 visible movement rows, identical first row, identical page digest**. No
movement, document, layer change or negative balance was created. Session ended
through the real «Çıxış» flow; the fresh browser context was closed.

## Post-conditions verified

| Check | Result |
|---|---|
| `:5175` read-only server | HTTP 200, preserved and untouched |
| `:5176` temporary process | stopped (HTTP 000) |
| `.env.sandbox.local` | md5 unchanged, `VITE_ALLOW_LOCAL_WRITES=false` |
| Dirty tree | 214 entries preserved, 0 staged |

## Status

`M7-39` → **LIVE VERIFIED**. Every exact-contract clause now has live evidence:
request-key invalidation (this audit), field clearing and refocus (Codex audit
`2026-09-10-phase7-m7-39-field-clearing-codex-audit.md`).

`M7-22` remains **LIVE VERIFIED**. Phase 7 remains **NOT ACCEPTED** pending the
final independent Codex audit.
