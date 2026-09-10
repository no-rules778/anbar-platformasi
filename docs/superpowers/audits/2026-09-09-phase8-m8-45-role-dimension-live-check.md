# Phase 8 — M8-45 role dimension live check (`anbardar`, `rehber`)

Date: 2026-09-09 (Asia/Baku)

Target: TEST Supabase `alkjjbaawmsirsfvqljm`. Production
`bbjmhaerssakbreykxiw` was never contacted (0 attempts).

## Scope

Closes the last scope note carried by `M8-45`: every prior live leg ran as TEST
admin. This runs the **smallest sufficient** matrix — one `movements` HTTP 503
retention leg plus recovery per role — for `anbardar` and `rehber`.

The completed admin matrix (all four core reads, both failure shapes) is **not
repeated**. `M8-44` concurrent stale-response interleaving is **not** claimed
here.

### A note on the ledger contract

The `M8-45` contract is "Failed refresh retains the previous snapshot"
(proposal §10, row `M8-45`). It carries **no role requirement of its own**.
The role gap was a scope limitation recorded by the two earlier 2026-09-09
audits, not an invented acceptance criterion; this check retires that
limitation rather than satisfying a new requirement.

## Environment

- `web/.env.sandbox.local` → TEST URL, `VITE_ALLOW_LOCAL_WRITES=false`,
  `VITE_TEST_ENVIRONMENT=true`, verified before browser use.
- Localhost was the already-running verified sandbox instance (PID 24452),
  started earlier only as
  `npm run dev -- --mode sandbox --host 127.0.0.1 --port 5175`; HTTP 200
  throughout.
- Playwright 1.63.0 driving installed Chrome from the npm `_npx` cache; not
  added to `web/package.json` or `web/node_modules`.
- **A fresh browser context per role**, so no cookie or `localStorage` state
  crossed between accounts.

## Role identity, as the UI reports it

The session chip was read from the real header button, not assumed:

- `anbar-anbardar-codex-test · Anbardar`
- `anbar-rehber-codex-test · Rəhbər`

## RLS scope — the two roles legitimately differ

Raw `movements` response rows, captured from the live network:

| Role | Raw rows | Matches |
| --- | --- | --- |
| `anbardar` | **85** | the 85 `Test Anbar` rows of the 2026-09-09 role/RLS partition |
| `rehber` | **101** | the full TEST set |

This independently re-confirms server-side warehouse scoping (85 allowed / 16
foreign denied) from a second, unrelated code path, and it is why the two role
snapshots must not be assumed identical.

Both roles nevertheless render the same **3-row operational table**, because
the screen shows `excludeCancelled()` output and all 16 foreign rows plus the
cancelled/reversal history fall outside it for this fixture. The footer is
therefore identical for both roles:
`3 qeyd · mədaxil 11.00 · məxaric 3.00 · mədaxil dəyəri 111.00 ₼`.
That is a fixture coincidence at the operational layer, **not** evidence that
RLS is inactive — the raw counts above prove it is active.

## Results — both roles PASS

Failed endpoint (both roles):
`/rest/v1/movements?select=id,item_code,warehouse,date,in_qty,out_qty,…`,
HTTP **503**. Auth and every `/rest/v1/rpc/` request were excluded from
interception by an explicit guard.

| Proof | `anbardar` | `rehber` |
| --- | --- | --- |
| failure actually observed | YES | YES |
| role-specific table stays visible (3 rows) | YES | YES |
| row identity unchanged | YES | YES |
| footer totals unchanged | YES | YES |
| stale-data banner shown | YES | YES |
| no full-screen «Yükləmə xətası» | YES | YES |
| loading settled | YES | YES |
| allowed controls usable (search, «Sıfırla», «Excel») | YES | YES |
| admin-only «Qrup üzrə ləğv» absent | YES (count 0) | YES (count 0) |
| recovery returns the identical role snapshot | YES | YES |
| banner cleared after recovery | YES | YES |
| device session ended | YES | YES |

Banner text per role:

- `anbardar` —
  `Yenilənmədi Service Unavailable (M8-45 anbardar) · Ekranda son uğurlu oxunuşun məlumatı göstərilir.`
- `rehber` —
  `Yenilənmədi Service Unavailable (M8-45 rehber) · Ekranda son uğurlu oxunuşun məlumatı göstərilir.`

`failedRequestCount` was 8 per role. That is the failure **window's** total
(React StrictMode double-issues each snapshot read, and the read is paged); it
is **one logical refresh per role**, not eight.

## Harness discipline applied

- The interception is a **window**, armed only after the Nomenklatura away-page
  settled, because Nomenklatura issues its own reads and StrictMode duplicates
  each snapshot read — a one-shot disarms on the wrong request. This is the
  correction established by the previous audit and reused unchanged.
- Every sample was taken after a 10 s settle; no early DOM read was accepted.
- Each leg asserts the failure was actually observed before the retention
  result is counted.
- No application code was changed at any point in this check.

## Session hygiene

Each role's device session was ended through the **real «Çıxış» control**
(`App.tsx:148` → `unregisterSession()` then `signOut()`), not by discarding the
browser context. `rpc/end_session` was observed for both roles and each page
returned to the login form. Contexts were then closed.

## Safety

- Production contact attempts: **0** (blanket abort on any
  `bbjmhaerssakbreykxiw` URL; counter asserted).
- Non-GET requests were read-only/session RPCs only: `register_session`,
  `get_user_directory`, `stock_layers_supported`, `get_reference_values`,
  `list_my_sessions`, `end_session`. **No mutation RPC was called.**
- **No database fixture was created, modified or deleted.**
- Raw TEST movement count: **101** as freshly measured through the `rehber`
  session; `anbardar` sees 85 by RLS. Unchanged.
- Localhost remains TEST sandbox/read-only, `VITE_ALLOW_LOCAL_WRITES=false`,
  HTTP 200.
- `git diff --cached` empty; dirty working tree (213 entries) preserved. No
  commit, staging, push or deployment. No I-10 row.

## Result

With this check, `M8-45` has live evidence across **all four core reads**, both
failure shapes (HTTP 503 and transport abort) and **all three roles**
(`admin`, `anbardar`, `rehber`), each with snapshot retention, the correct
banner, settled loading, usable controls and clean recovery.

`M8-45` is therefore promoted to **LIVE VERIFIED** for its actual contract —
"a failed refresh retains the previous snapshot". No broader endpoint coverage
is claimed: the role legs used `movements`/503 only, and the non-`movements`
reads were covered under admin.

`M8-44` concurrent stale-response interleaving remains OPEN and is explicitly
not claimed from these sequential per-role failures.

Phase 8 remains **NOT ACCEPTED** because unrelated OPEN rows remain.
