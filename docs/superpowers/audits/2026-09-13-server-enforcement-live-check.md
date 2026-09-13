# Live server-enforcement check — TEST admin and anbardar

Date: 2026-09-13 · Project: TEST `alkjjbaawmsirsfvqljm` · Production
`bbjmhaerssakbreykxiw` was **not contacted**.

**This is evidence collection, not acceptance.** No ledger row is promoted here.
Promotion to `LIVE VERIFIED` is Codex's independent audit decision under
CLAUDE.md §4. Statuses in every ledger are left exactly as they were.

## What made this possible

Every prior phase recorded the same boundary — "no authenticated TEST identity"
— from Phase 10 onward. That boundary is now closed: the owner supplied working
TEST identities on 2026-09-13. The `anbardar` password did not match and was
reset by the owner in the TEST SQL editor (`UPDATE auth.users SET
encrypted_password = crypt(...)`). Both identities then authenticated.

Credentials live in `web/.test-credentials.local`, which is gitignored
(`web/.gitignore:13`, `*.local`) and carries no `VITE_` prefix, so Vite cannot
inline them into a browser bundle. They were never printed or committed.

## Method

Direct REST calls against the TEST PostgREST endpoint with two separate bearer
tokens — no browser, no application code, no client-side filtering in the path.
This is deliberate: the contract under test is what the SERVER does, and any
evidence routed through the React app would prove only what the app renders.

## Results

### Read narrowing — supports M14-99, M15-60

| Query as | `movements` rows | warehouses present |
|---|---|---|
| admin | 127 | `CODEX Phase8 Transfer Anbar`, `Test Anbar` |
| anbardar | 107 | `Test Anbar` only |

The falsifiable step: the anbardar then requested the hidden warehouse
**explicitly** (`?warehouse=eq.CODEX Phase8 Transfer Anbar`) and received
**0 rows**. A client-side filter cannot produce that result — the request asked
the server for exactly those rows and the server returned none.

### `users` visibility — supports M16-17

| Query as | rows |
|---|---|
| admin | 4 |
| anbardar | 1 (its own row only) |

Same falsifiable step: the anbardar requested the admin's row by address
(`?email=eq.anbar-admin-test@example.com`) and received **0 rows**.

### Write refusal — the strongest result

An anbardar attempted a direct `INSERT` into `movements` for a warehouse it does
not own:

```
HTTP 403
42501: new row violates row-level security policy for table "movements"
```

The server refused and supplied the message itself. **Cleanup verified:** a
follow-up admin read found `item_code=PROBE-DENY` → 0 rows, and the total
movement count was 127 before and 127 after. The refused write left nothing
behind; no cleanup was required.

### azp module — INCONCLUSIVE, M17-20 NOT satisfied

| Call as | `azp_cards` | `azp_movements` | `azp_can_read()` | `azp_user_role()` |
|---|---|---|---|---|
| admin | HTTP 200, `*/0` | HTTP 200, `*/0` | `true` | `"admin"` |
| anbardar | HTTP 200, `*/0` | HTTP 200, `*/0` | `false` | `"none"` |

The function-level split is real and supports M17-17's described behaviour. But
**M17-20 is not satisfied and must stay BLOCKED.** Its contract is that an
anbardar is *refused every azp read*; both tables are genuinely empty
(`content-range: */0` for the admin too), so a refusal is indistinguishable from
an empty result. Closing it requires at least one row in `azp_cards`, which is a
TEST write and needs its own authority.

**Documentation defect found:** `azp_modules` returns `PGRST205` — the table does
not exist in the TEST schema. The identifier appears in the Phase 17 material.
Worth reconciling; not investigated further here.

## What was NOT established

- **M18-43 is not satisfied by this check.** What was measured is SELECT scoping
  plus one INSERT refusal. M18-43 spans server enforcement across modules —
  grants, function refusals, every role. A partial result is not the contract.
- **M17-21 was not run** — no rehber password. The identity
  `anbar-rehber-codex-test@example.com` exists with `role=rehber`.
- **M14-10, M15-10, M17-28** are request-shape contracts ("emits exactly these
  four reads"). Direct REST calls cannot evidence what the PAGE emits; that
  needs a captured browser session.
- Nothing here speaks to realtime delivery, export parity or cross-module
  consistency.

## Safety record

TEST only. One deliberate write attempt, refused by the server, verified to have
written nothing. No production contact, no schema change, no fixture created, no
deployment, no commit of credentials.
