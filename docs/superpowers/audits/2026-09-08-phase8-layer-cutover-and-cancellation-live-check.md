# Phase 8 TEST layer cutover and cancellation live check — 2026-09-08

## Scope and safety

- Target: TEST Supabase project `alkjjbaawmsirsfvqljm` only.
- Actor: authenticated TEST administrator.
- This was a direct Supabase RPC/read-back check. It is **not** evidence that the React UI selected or rendered the layer branches.
- The existing dirty working tree was preserved. No commit, push or deployment was performed.
- The local sandbox was returned to `VITE_ALLOW_LOCAL_WRITES=false` after the checks.

## Cutover preflight and activation

Immediately before activation, `stock_layers_supported()` reported inactive capability, layer version `36`, no cutover timestamp and zero `stock_layer` rows. The movement snapshot contained 28 rows, its maximum `created_at` was `2026-09-08T18:53:57.061365+04:00`, and no negative balance existed. Effective balances were 8 units of item `0000001` and 1 unit of item `0000002` in `Test Anbar`; the transfer-fixture warehouse held zero.

The official atomic `activate_stock_layers(28, <snapshot max created_at>)` call succeeded. Read-back reported:

- `active = true`, `layer_version = 36`;
- cutover at `2026-09-08T19:55:29.879391+04:00`;
- two seeded `legacy_unresolved` layers: 8 units for `0000001` and 1 unit for `0000002` in `Test Anbar`.

This is the new persistent TEST baseline. It supersedes current-state statements that TEST layers are inactive; historical observations remain valid for the time at which they were recorded.

## Ordinary layer-document cancellation — M8-24

Direct `cancel_layer_document` cancellation of open ordinary document `SND-D512FAAC59` succeeded:

- the original inbound row `facacff5-c008-4005-9259-234a9db1be97` was retained;
- reversal document `SND-C-B7B77DCCB4` added row `d1a683ed-3c2d-43a7-b4c3-e811051b12dd`, dated `2026-09-08`, with one outbound unit and note `Ləğv: SND-D512FAAC59`;
- result: `row_count = 1`, `layer_version = 36`, historical layer status `unresolved`;
- the item `0000002` seed layer moved from available 1/active to available 0/inactive.

This is narrow TEST-admin server evidence for the M8-24 layer variant. It does not promote M8-26's React routing or any role/concurrency dimension.

## Exact layer transfer and reverse transfer — M8-25

The first `post_layer_transfer_document` attempt intentionally used no current revision. It returned the stale-revision refusal and wrote no movement. A fresh `get_stock_layers` snapshot then supplied revision `6603c9d7e2a57d80224801b0bbb064ad`.

Posting the exact one-unit transfer succeeded as document `SND-8CFB378D7D`:

- outbound row `802fe72e-5ec7-4201-8121-840020c93f07` from `Test Anbar`;
- inbound row `511cf899-b1bf-49fb-970a-3e2bf8938bb4` into `CODEX Phase8 Transfer Anbar`;
- invoice `CODEX-P8-LAYER-TRANSFER-20260908` and note `CODEX Phase 8 layer transfer fixture` were retained;
- source layer availability changed 8→7;
- destination transfer layer `c6c0b80c-5337-4445-abde-f7d000ab040e` was created with quantity 1;
- allocation link `14fe785a-f121-4f09-a960-e30ad0cf081a` was initially unreversed.

Direct `cancel_layer_transfer_document(p_doc_num = 'SND-8CFB378D7D')` then succeeded:

- movement count changed 31→33;
- reverse document `SND-R-8182DFCD7D` added destination-out row `e83b9ca3-25f1-49c4-9ac2-47ea6de9afad` and source-in row `8c597ec5-25a9-4d4a-8eaa-453a30391d9d`;
- both reversal rows use date `2026-09-08`, item `0000001`, the preserved invoice and note `Ləğv (əks yerdəyişmə): SND-8CFB378D7D`;
- the source layer was restored 7→8 and active; the destination layer changed 1→0 and inactive;
- the allocation link gained `reversed_at = 2026-09-08T20:00:43.641815+04:00`;
- result: `row_count = 2`, `layer_version = 36`.

This is narrow TEST-admin server evidence for the M8-25 layer-transfer variant, plus stale-revision/no-write evidence for posting. It proves the layer RPCs themselves, not the React selection path.

## Acceptance effect

- M8-24 and M8-25 gain direct live evidence for their layer variants.
- M8-26 gains server-side feasibility evidence only; React selection from the live capability flag remains CODE VERIFIED because the browser debugger was unavailable during these calls.
- Layer-dependent scenarios are no longer blocked by inactive TEST capability.
- Role/RLS, remaining UI branches, malformed data, unknown outcome and concurrency coverage remain open.
- A fresh authenticated admin SELECT of `audit_log` returned zero visible rows even without a filter. Therefore none of these layer checks is promoted as independently readable M8-43 audit evidence.
- **Phase 8 remains NOT ACCEPTED.**
