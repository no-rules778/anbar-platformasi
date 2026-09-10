# Phase 8 — M8-43: the audit_log visibility contradiction resolved, and an uneven audit coverage finding

Date: 2026-09-09 (Asia/Baku)
Environment: TEST `alkjjbaawmsirsfvqljm` only. Production was never contacted.
Actor: TEST admin (`anbar-admin-test@example.com`).
Writes: **none.** This was an entirely read-only investigation.
Result: the open contradiction is explained; one real coverage asymmetry is
recorded. **Phase 8 remains NOT ACCEPTED.**

## Why this scenario was selected

M8-43 carried an unresolved contradiction: ordinary-path audit rows were
evidenced on 2026-09-08, yet a later fresh admin read returned zero rows,
prompting the standing warning not to promote M8-43. Resolving that needs no
browser control and no writes, making it the cheapest genuinely open item.

## Finding 1 — the zero-row read was correct RLS behaviour, not missing data

`public.audit_log` has RLS enabled with a single SELECT policy:

```
policyname: p_audit_read
cmd:        SELECT
roles:      authenticated
qual:       (my_role() = 'rehber')
```

Audit rows are therefore readable **only by `rehber`**. The TEST admin is not
`rehber`, so it can never see a row.

Live confirmation as TEST admin:

- `current_user_role()` returned `admin`;
- `audit_log?select=id&limit=1` → **HTTP 200, 0 rows**;
- filtered by `action=eq.INSERT` → HTTP 200, 0 rows;
- filtered by `table_name=eq.movements` → HTTP 200, 0 rows;
- exact-count header → `*/0`.

Every read succeeded. The emptiness is the policy filtering rows, not an error,
a missing trigger or absent data.

A secondary cause of earlier confusion is also corrected: the table's timestamp
column is **`ts`**, not `created_at`. An unfiltered read ordered by `created_at`
fails outright with `42703 column audit_log.created_at does not exist`, which is
easy to misread as an empty or broken table.

## Finding 2 — the client cannot surface this as a permission problem, and that is correct parity

`api/auditLog.api.ts` classifies `permission` vs `load` with
`/permission|denied|rls|401|403/i` applied to an **error message**. RLS here
returns HTTP 200 with zero rows and no error, so no classifier runs: an admin
sees the ordinary empty-state text, not «İcazə yoxdur».

Legacy behaves identically (`index.html:7145`): the permission branch is only
reached inside `if (res.error)`, otherwise the empty table message is rendered.

**This is not a defect.** React reproduces legacy exactly, and the row's
mutation-checked classifier remains correct for genuine error responses. It is
recorded because it explains why the visibility question looked ambiguous.

## Finding 3 — audit coverage across the cancellation family is uneven

From the captured function definitions, direct `INSERT INTO public.audit_log`
appears in `cancel_transfer_document`, `cancel_movement_row`,
`correct_document`, `replace_movement_item` and others — but **not** in
`cancel_document`, `cancel_legacy_movement`, `cancel_legacy_transfer`, nor in
any `cancel_layer_*` function.

The layer functions delegate, so their audit consequence follows the delegate:

| RPC | delegates to | audit row written |
|---|---|---|
| `cancel_layer_transfer_document` | `cancel_transfer_document` | yes (inherited) |
| `cancel_layer_movement_row` | `cancel_movement_row` | yes (inherited) |
| `cancel_layer_document` | `cancel_document` | **no** |
| `cancel_layer_legacy_movement` | `cancel_legacy_movement` | **no** |
| `cancel_layer_legacy_transfer` | `cancel_legacy_transfer` | **no** |

So ordinary-document and legacy cancellations leave no `audit_log` entry in
either the layer or non-layer variant, while transfer-document and row
cancellations do. This is a server-contract observation from the captured
definitions; it is stated as coverage scope, not as a defect, because no
requirement asserting a uniform audit row for every cancellation family has been
identified in the Phase 8 boundary.

## What remains OPEN for M8-43

The decisive check — reading the same rows as `rehber` to prove the entries
exist and are visible to the intended role — could not be performed. Only the
TEST admin credential is documented in
`docs/superpowers/test-environment/README.md`; no `rehber` credential is
available and passwords must not be guessed.

Consequently M8-43 must NOT be promoted on admin reads. The correct next step is
a `rehber` session performing the same reads.

## Safety

- No writes of any kind. Movement count unchanged at 89; balances
  `Test Anbar/0000001=8`, `0000002=0`, transfer warehouse `0`; zero negatives.
- Localhost untouched and read-only (`VITE_ALLOW_LOCAL_WRITES=false`); no write
  window was opened, since none was needed.
- No commit, stage, push or deploy. Dirty tree preserved. No `I-10` row created.
- No credential or token is recorded in this file.
