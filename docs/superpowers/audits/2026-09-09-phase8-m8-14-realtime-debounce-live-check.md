# Phase 8 — M8-14 realtime `movements` subscription and 400 ms debounced refresh

Date: 2026-09-09 (Asia/Baku)
Environment: TEST `alkjjbaawmsirsfvqljm` only
Actor: TEST admin (`anbar-admin-test@example.com`)
Result: PASS — M8-14 moves from CODE VERIFIED to LIVE VERIFIED

This is the first M8-14 evidence produced from a **real TEST
`postgres_changes` event**. The prior row was code-only: a unit test asserting
that `MovementsPage` does not override the hook's 400 ms debounce. A second
browser session alone does not generate an event, so this run used a separate
authenticated writer session issuing one supported RPC.

## Method

Two independent Chrome sessions, both driven through the real React UI, both
under a blanket route that ABORTS any URL containing the production ref
`bbjmhaerssakbreykxiw`.

- **Observer** — read-only sandbox `127.0.0.1:5175`
  (`VITE_ALLOW_LOCAL_WRITES=false`), on «Mal hərəkəti». It observed the actual
  realtime **WebSocket frames** and every `GET /rest/v1/movements` with a
  millisecond timestamp. It never called `useRealtimeRefresh` or any
  application helper under test.
- **Writer** — a separate, temporary write-enabled sandbox process on
  `127.0.0.1:5176`. The write flag was passed to that process's environment
  only; `web/.env.sandbox.local` on disk remained `VITE_ALLOW_LOCAL_WRITES=false`
  throughout, and port 5175 stayed read-only (both verified by reading the
  served `import.meta.env`).

## 1. The channel reaches SUBSCRIBED

Observer WebSocket to `wss://alkjjbaawmsirsfvqljm.supabase.co/realtime/v1/websocket`:

- `+8062 ms` — `system` / `status: ok` / **`"Subscribed to PostgreSQL"`**.
- The app's own sync indicator rendered **`sinxron`**, its SUBSCRIBED state.

An earlier `system/error` frame at `+2903 ms` concerns the **login screen's**
channel for an unrelated table (`serfiyyat_documents`), not the movements
subscription. `MovementsPage` passes `WATCHED_TABLES = ['movements']`
(`web/src/pages/MovementsPage.tsx:81,178`), and that subscription succeeded.

Baseline before the write: 4 `movements` GETs at `2815, 2823, 7909, 7917` ms —
two logical loads, each doubled by StrictMode. Then quiet.

## 2. One supported RPC, two real movement changes

Writer created the smallest supported multi-change operation: an **exact-layer
transfer of 0.01** of `0000001` from `Test Anbar` to
`CODEX Phase8 Transfer Anbar`, taking the quantity from the exact receipt layer
`fcb7f7b1-cb77-4814-8ef6-9f73b1c664f9` (15.00, `known`) and NOT the legacy
`Köhnə qalıq` layer.

`rpc/post_layer_transfer_document` → HTTP 200:

- document `SND-8DC5E59E8D`, `row_count 1`, `layer_version 36`;
- `out_id ad4e3d8a-f119-4da5-bc5e-af9474508528` (source leg);
- `in_id  e3cf6955-541a-4a44-a902-8f95018a34fc` (destination leg).

## 3. The debounce — observed, not inferred

Observer frames and requests, same clock:

| t (ms) | event |
| --- | --- |
| 81574 | `postgres_changes` INSERT `movements` id `ad4e3d8a-f119-4da5-bc5e-af9474508528` |
| 81574 | `postgres_changes` INSERT `movements` id `e3cf6955-541a-4a44-a902-8f95018a34fc` |
| 82013 | `GET /rest/v1/movements` — the refresh |

Both events carry commit timestamp `2026-09-09T13:48:14.663Z` and the exact two
movement ids the RPC returned, so these are the real database changes, not a
synthetic or app-generated signal.

- **No refresh began before the debounce interval.** Between the events and
  `+439 ms` there was no `movements` request of any kind.
- **Exactly one logical refresh began after ~400 ms:** a single GET at
  `82013 ms`, **439 ms after the last event** — the 400 ms debounce plus
  scheduling overhead. Two events in one burst produced ONE refresh.
- **StrictMode is accounted for.** The four baseline GETs are two logical loads
  doubled by StrictMode's double-mount. The debounced refresh fires from a
  `setTimeout` callback outside the mount cycle and is therefore **not**
  doubled: one logical refresh, one request. Total for the session: 5 GETs.
- **Visible without manual refresh.** The observer's final DOM sample — taken
  with no navigation, reload or user action after the write — showed both new
  legs at the top of the table:
  `09.09.2026 | Test Anbar | 0000001 | Yerdəyişmə | … 0.01` and
  `09.09.2026 | CODEX Phase8 Transfer Anbar | 0000001 | Yerdəyişmə | … 0.01`.
- **Screen state intact.** The observer kept its «Mal hərəkəti» heading, its
  full unfiltered registry and its `sinxron` indicator across the refresh; no
  dialog was open and none appeared.

## 4. Cancellation through the supported path

The transfer card for `SND-8DC5E59E8D` showed the layer-active immutability
warning and the transfer-specific action «Yerdəyişməni ləğv et». Submitting it
issued `rpc/cancel_layer_transfer_document(p_doc_num, p_reversal_date)` — the
LAYER variant with its own argument name — HTTP 200:

- reversal document `SND-R-2550716DCD`, `row_count 2`;
- `orig_id ad4e3d8a…` → `reverse_in_id 10926ab6-df87-43f3-a863-26c5669cf8d5`;
- `orig_id e3cf6955…` → `reverse_out_id 6bbb2b0f-a2fd-45e8-b617-5d96d30a3bea`.

The cancellation burst is a second two-change event set from one RPC. The
coalescing contract is already established by section 3 from a burst of the
same shape; no separate claim is made about frames during the cancellation,
because no observer was subscribed for it.

## 5. Reconciliation

Authenticated server read-back after the fixture:

- Movements `109 → 113`: the 2 transfer legs plus the 2 immutable reversal
  legs. No movement or audit row was deleted.
- `Test Anbar / 0000001 = 8.00` — identical to baseline;
  `CODEX Phase8 Transfer Anbar / 0000001 = 0` (in 9.02 / out 9.02);
  `Test Anbar / 0000002 = 0`.
- **Negative balances across TEST: 0.**
- Exact source layer `fcb7f7b1-cb77-4814-8ef6-9f73b1c664f9` restored to
  `available_qty 1`, `unit_price 15`, `price_status known`, `source_type
  receipt`. Legacy layer `b633360d…` unchanged at 7, `legacy_unresolved`.
  Destination warehouse holds no residual layer. Layers active, version 36.

Stock and layer state are therefore **net-zero**; the four immutable movement
rows and the reversal document intentionally remain.

## Safety

- Production ref `bbjmhaerssakbreykxiw` was never contacted: the blanket abort
  guard counted **0** production requests in every session (observer, writer,
  cancel).
- The write-enabled process on 5176 was stopped immediately after the
  cancellation and read-back; 5176 no longer listens.
- `web/.env.sandbox.local` still reads `VITE_ALLOW_LOCAL_WRITES=false`; the
  read-only sandbox on `127.0.0.1:5175` is running and returns HTTP 200.
- Both browser sessions were closed. No commit, stage, push or deploy occurred.
  The dirty working tree is preserved. No `I-10` ledger row was created.

M8-14 is satisfied live. Phase 8 acceptance status is unchanged by this row
alone; see the ledger for remaining rows.
