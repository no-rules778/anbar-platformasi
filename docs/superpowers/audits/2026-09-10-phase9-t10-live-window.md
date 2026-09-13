# Phase 9 T10 — the single live TEST window (Q4) and live UI read-only pass

Date: 2026-09-10 (Asia/Baku, ~22:49 local)
Project: TEST `alkjjbaawmsirsfvqljm` only. Production `bbjmhaerssakbreykxiw`
was rejected by a guard on every URL (REST harness) and aborted at the network
layer (browser harness); **0 production hits** in both.
Identity: the documented TEST anbardar `anbar-anbardar-test@example.com`
(role confirmed live by `current_user_role` → `anbardar`, warehouse
`Test Anbar`). No admin or rehber identity was available.
Verdict: **M9-10, M9-17, M9-18, M9-92, M9-146 → `LIVE VERIFIED`**; M9-99,
M9-100, M9-108 keep `IN PROGRESS` with live findings; M9-109 stays open.
The tally is stated once, in the ledger banner, derived by the checker.

> **CORRECTION — 2026-09-10 (acceptance closure).** The window's end state is
> **content-equivalent to the baseline, NOT byte-identical and NOT an exact
> net-zero restoration**: the six-argument probe deleted the row and the next
> call re-inserted it, so `created_at` and `updated_by` differ from the
> baseline. Every earlier sentence in this file or in a banner that reads
> "exact revert" / "exact restoration" is superseded by
> [§ Correction — reconciliation claim](#correction--reconciliation-claim-2026-09-10-acceptance-closure)
> below, which carries the exact baseline and current identity values and the
> pending owner decision. The window's data evidence (refusals, edit,
> `exceeds_balance`, quantity/note revert) is unchanged by this correction.

## Evidence classes (kept distinct)

| Class | Source |
|---|---|
| **Persisted TEST** | REST harness (`t10-harness.mjs`, outside the repo): Auth password grant, PostgREST GETs and `rpc/set_stock_condition` POSTs, read-back after every step |
| **Browser interception** | Playwright + installed Chrome driving the sandbox dev server on 5175 (`VITE_ALLOW_LOCAL_WRITES=false`, so the page itself could not write); every `/rest/v1/` request recorded |
| **Unit / source** | the T3 audit — not repeated here |

The project URL and publishable key were taken from the dev server's **served**
`src/api/supabase.ts` (what the browser receives), not from any `.env` file.
The password lived only in process memory.

## Persisted TEST — the write window

Baseline (read-only): one visible `stock_conditions` row —
`Test Anbar | 0000001 | unfit 0 · repair 0 · onsite 0 · icare 0.01 · note null`.
Balance for that line (server figure from a NOOP call): **8**.

### Refusals — no row written

| Probe | HTTP / code | Exact server text |
|---|---|---|
| unknown item `ZZZ-NO-SUCH-ITEM` | 400 / P0001 | `Mal nomenklaturada tapılmadı: ZZZ-NO-SUCH-ITEM` |
| negative (`onsite −1`) | 400 / P0001 | `Miqdar mənfi ola bilməz` |
| too large (`onsite 1e15`) | 400 / P0001 | `Miqdar həddindən böyükdür` |
| unknown/inactive warehouse | 400 / P0001 | `Anbar tapılmadı və ya aktiv deyil: ZZZ-NO-SUCH-WH` |
| **foreign warehouse** `CODEX Phase8 Transfer Anbar` (**M9-92 binding**) | 400 / P0001 | `İcazə yoxdur: yalnız öz anbarınızda mal vəziyyətini dəyişə bilərsiniz` |

Read-back after the five refusals: rows byte-identical to the baseline.

### Live finding 1 — the six-argument call is NOT a no-op (M9-99 / M9-100)

The harness sent the pre-031 six-argument payload with the baseline values
(intended as a NOOP probe of the PGRST202 fallback). Result: **HTTP 200,
`action: DELETE`** — no PGRST202. On this 031-applied schema PostgREST resolves
the six-argument call to the seven-argument function with `p_icare_qty
DEFAULT 0`; the row's only marker was `icare 0.01`, so the server saw an
all-zero row without a note and deleted it. This is exactly the hazard the
legacy comment at `index.html:2163-2167` describes. Consequences:

- the client's PGRST202 fallback branch (M9-99) is **structurally unreachable**
  on a schema where the seven-argument function exists, so its live leg cannot
  be exercised — unit evidence stands, the row stays `IN PROGRESS` (T0B);
- M9-100 likewise cannot be provoked live; unit evidence only;
- the probe was a **real mutation**, recorded as such (§T10 plan: "a refusal is
  recorded as a mutation attempt" — this one was not even a refusal).

### The minimal write, the exceeds branch, the revert

| Step | Result |
|---|---|
| full seven-argument call with baseline values | `action: INSERT` (re-created the row deleted above), balance 8 |
| `onsite 0 → 1` | `action: UPDATE`, `exceeds_balance: false`, read-back `onsite_qty 1` |
| `onsite → 9` (= balance + 1) | `action: UPDATE`, **`exceeds_balance: true`**, balance 8 (M9-102 server half) |
| revert to baseline (`0 · 0 · 0 · 0.01`, note null) | `action: UPDATE`, returned row equals baseline |

### Reconciliation — exact on content, not on row identity

> **SUPERSEDED wording (2026-09-10 closure):** the heading's word "exact" and
> the earlier banners' "exact revert" apply to the four quantities and the
> note only. The row identity did change; see § Correction below for the
> exact values. Kept as written for history.

Final read-back: `unfit 0 · repair 0 · onsite 0 · icare 0.01 · note null` —
**all four quantities and the note equal the baseline**. The harness's strict
comparison (ignoring only `updated_at`/`updated_by`) reported **false** because
`created_at` changed: the six-argument probe deleted the row and the next call
re-inserted it. That is reported here as observed; it is not a data loss (the
content is identical) but it is a row-identity change the harness did not
anticipate, and it is why the raw run exited non-zero.

Server actions written in the window: DELETE, INSERT, UPDATE, UPDATE, UPDATE
(five non-NOOP actions → five server-written `audit_log` rows by the function's
contract, §3.2 item 12).

### Live finding 2 — audit rows invisible to the anbardar (M9-109)

`audit_log?table_name=eq.stock_conditions` returned **0 rows both before and
after** the five actions. This is the `p_audit_read` RLS policy (Phase 8
M8-43), not a missing write. The server-written rows exist by contract but are
**not observable** with this identity; M9-109 stays `NOT STARTED — Q4` until an
admin identity reads them back.

## Browser interception — live UI read-only pass (anbardar)

| Contract | Observed |
|---|---|
| M9-01 rail order | `Yeni əməliyyat, Mal hərəkəti, Anbar qalıqları, …` — third in the group |
| M9-02 | heading «Anbar qalıqları» |
| M9-60/63/64 | five KPIs: Mövqe sayı 1 · Ümumi miqdar 8.00 · Ümumi dəyər 80.00 ₼ (class `g`) · Sıfır qalıq 0 · Mənfi qalıq 0 (class `g`) — consistent with balance 8 × price 10 |
| **M9-17** no client scoping | the page rendered exactly the RLS-narrowed set: one row, warehouse `Test Anbar` only; in «Hamısı» the only other warehouse text is the catalogue «—» |
| **M9-18** unscoped filter list | options `['', '__sum', 'Test Anbar', 'CODEX Phase8 Transfer Anbar']` — both anbars for a `Test Anbar` anbardar |
| M9-93/canEditCond | 4 editable condition cells on the own-warehouse row |
| M9-53 | «Əvvələ qalıq» view hides the condition filter; TEST has no opening rows → `bal-empty-noinit` (M9-82 first state, live) |
| M9-118 | export button enabled and ungated (not clicked — it would download) |
| **M9-10 / M9-146** | the page's own requests: `GET movements, items, warehouses, stock_conditions` ×2 (StrictMode); **no RPC, no `stock_layers`** (the two `register_session`/`get_user_directory` POSTs belong to App boot, not the snapshot) |
| M9-106/M9-107 | `rpc/set_stock_condition` calls from the page: **0** |

## Rows promoted to `LIVE VERIFIED` and why exactly

- **M9-92** — the binding server refusal was exercised with the exact text.
- **M9-10** — exactly four table reads, no RPC, observed live.
- **M9-17** — unfiltered read → RLS-narrowed rows → rendered as returned.
- **M9-18** — full `DB.whs` in the filter list for a scoped user.
- **M9-146** — no `stock_layers` read in the live load; no deactivation/cutover.

Not promoted despite live observation (contract broader than what was
exercised, §6): M9-01 («exactly one rail entry active» not sampled), M9-102
(the warning toast is UI; only the server flag was observed), M9-101 (client
handling of DELETE/UPDATE is unit-tested; the actions were observed server-side).

## What could NOT be done, and why

| Item | Reason |
|---|---|
| rehber refusal text | no rehber identity authenticates (T0A) |
| M9-109 audit rows | RLS hides them from the anbardar; admin identity needed |
| PGRST202 fallback (M9-99/100) | unreachable on the 031-applied schema (finding 1) |
| session / inactive-profile / NaN refusal texts (M9-108) | not representable with a valid session and JSON |
| T0B catalog facts | separate authority, untouched |

## Final gate (measured after every edit of this delivery)

| Check | Result |
|---|---|
| `BalancesPage.test.tsx` | **57 passed** (M9-83: one misleading test replaced by two) |
| full suite | **139 files / 3089 tests passed** |
| `tsc -b --noEmit` | exit 0 |
| `oxlint src` | exit 0 |
| `vite build --mode sandbox` | built, exit 0 |
| `git diff --check` | exit 0 |
| staged files | **0** |
| ledger checker | `--self-test` 27/27; real run **PASS** (26 numeric claims across ledger / registry / next-prompt compared; every asserted range expanded) |
| REST harness | exit 5 by its own strict identity comparison (`created_at` changed) — content reconciled, see above; production hits 0 |
| UI harness | exit 0; mutation RPCs 0; production hits 0 |

## Safety

Production never contacted (guard counter 0 in both harnesses). Sandbox dev
server on 5175 with `VITE_ALLOW_LOCAL_WRITES=false`; the write leg went through
the REST harness under the authorised T10 window, not through the app. No
`.env` file was read or edited. No layer deactivation, cutover, fixture,
stage, commit, push or deploy. Harness scripts and logs live in the session
scratchpad, outside the repository. The dev server was stopped afterwards.

Phase 9 remains `NOT ACCEPTED`; only Codex's independent audit can change that.

## Correction — reconciliation claim (2026-09-10, acceptance closure)

The earlier text said the revert was "exact" and the raw harness reported
`RECONCILED … false`. Both are kept above as history. The precise statement,
taken from the harness log's `stock_conditions BEFORE` and
`stock_conditions AFTER` read-backs (persisted TEST evidence, anbardar
identity, read-only GETs), is:

| Field | Baseline (`BEFORE` read-back, taken before the first probe) | Current (`AFTER` read-back, after the revert) | Same? |
|---|---|---|---|
| `warehouse` / `item_code` | `Test Anbar` / `0000001` | `Test Anbar` / `0000001` | yes |
| `unfit_qty` / `repair_qty` / `onsite_qty` / `icare_qty` | `0` / `0` / `0` / `0.01` | `0` / `0` / `0` / `0.01` | yes |
| `note` | `null` | `null` | yes |
| `created_at` | `2026-09-09T13:52:35.264964+00:00` | `2026-09-10T18:49:22.687817+00:00` | **no** |
| `updated_at` | `2026-09-09T13:52:35.264964+00:00` | `2026-09-10T18:49:24.215342+00:00` | no (expected for any write) |
| `updated_by` | `aa0fd092-af7d-4e0e-baac-34ce1a0389fa` (= `anbar-admin-test@example.com`, per the Phase 8 M8-04 audit) | `089440eb-94a1-4560-ac12-6dbf0a4914ca` (= `anbar-anbardar-test@example.com`, the T10 identity) | **no** |

Classification:

- The final state is **content-equivalent** (all four quantities and the note
  equal the baseline). It is **not byte-identical** and **not an exact
  net-zero restoration**: the row was physically deleted (six-argument probe,
  `action: DELETE`) and re-inserted (`action: INSERT`), so its `created_at`
  and `updated_by` now record the T10 window, not the 2026-09-09 admin
  creation.
- Cause: PostgREST resolved the six-argument payload to the seven-argument
  function with `p_icare_qty DEFAULT 0`; with every quantity 0 and no note the
  function's `v_sum = 0 AND v_note IS NULL` branch deletes the row (captured
  schema `test-environment/restore-test-schema.sql`, function body at its
  `DELETE FROM public.stock_conditions` branch — captured server metadata, not
  a live catalog read).
- The five server-written `audit_log` rows (DELETE, INSERT, UPDATE ×3) are the
  correction history of this event and are **not** to be deleted or rewritten.
- The identity difference **cannot be restored** through the supported
  interface: `set_stock_condition` is the only application write, it sets
  `updated_by = auth.uid()` and never touches `created_at`; restoring the
  2026-09-09 values would require a direct table write, which is outside
  every authorised boundary and was **not** performed.
- **Owner decision pending — not classified as an accepted residual.** No
  existing decision record (`decisions/2026-09-10-phase9-design-package.md`,
  the T0A rehber waiver, or any later handoff entry) authorises accepting this
  identity drift. It is therefore an **owner-decision item**: either (a) accept
  it as a residual TEST mutation of row identity only (content equal, history
  preserved in `audit_log`), or (b) direct a separate, explicitly authorised
  restoration. Until decided, TEST is described as "content-reconciled, row
  identity changed", never as "reconciled exactly" or "net-zero".
- The destructive six-argument probe is **not to be repeated**.

## Closure pass — remaining items, checked once (2026-09-10)

No application or test code was changed in this pass; no Supabase call, RPC,
login or browser session was made. Every item below was checked against the
evidence already on disk.

| Item | Evidence class | Result |
|---|---|---|
| T0B (M9-19, M9-99 signature) | unavailable external evidence | No catalog authority exists in this session (no service-role or SQL access; the publishable-key OpenAPI probe returned 401 earlier). A TEST UI password cannot read `pg_policy`, `pg_proc`, ACLs or constraints and no such claim is made. The only catalog-level facts cited anywhere in Phase 9 come from the trusted capture `test-environment/restore-test-schema.sql` and are labelled *captured server metadata*. **Narrow external boundary**; M9-19 stays `IN PROGRESS`. |
| M9-109 admin `audit_log` read-back | unavailable external evidence | No TEST admin identity is available: the T10 harness took its password from a process-only `T10_PASSWORD` variable that is not set in this session, no password was supplied, and `.env` files are not read by rule. The five server-written rows exist by the function's contract (captured body: `INSERT INTO public.audit_log(… user_id … ) VALUES (now(), auth.uid(), v_action, 'stock_conditions', …)`) and the browser-interception log shows **0** `audit_log` writes from the page, but "the browser did not write them" is proven only for the page and "the server did write them" is not observed. M9-109 stays `NOT STARTED — Q4`. |
| M9-108 — «sessiya tapılmadı» leg | captured server metadata | The captured grants are `REVOKE ALL … FROM PUBLIC, anon, authenticated, service_role` then `GRANT EXECUTE … TO authenticated` on the seven-argument function. An anonymous call is therefore refused by the ACL before the body's `auth.uid() IS NULL` guard runs, so the text is not reachable from the supported interface; a session-less probe would also be a mutation attempt outside the closed Q4 window. Not executed. |
| M9-108 — inactive-profile leg | unavailable state | Requires a profile set inactive in TEST; no such profile exists and none was fabricated. Not executed. |
| M9-108 — rehber-role leg | unavailable identity | No rehber identity authenticates (T0A, owner waiver). Not executed. |
| M9-108 — NaN leg | unit / source | Structurally unavailable through the application's interface: the client sends the quantity as a JSON number via `supabase.rpc`, and `JSON.stringify(NaN)` is `null`, which the function `COALESCE`s to `0`. The guard `Miqdar düzgün ədəd olmalıdır` is reachable only by a hand-built REST body carrying the string `"NaN"`, which is not the application contract and was not sent. |
| M9-108 overall | mixed | 5 of the 9 texts remain live-observed (T10); the other 4 are bounded as above. Stays `IN PROGRESS`. |
| M9-99 / M9-100 | unit / source + live finding | Unchanged: the fallback is unreachable on the 031-applied schema. Not re-probed. |
| T3 code, M9-83, browser snapshot, full suite | already confirmed | Not repeated (no code change in this pass). |

Ledger totals after this pass: unchanged; derived by `tools/ledger-check.mjs`
(the ledger banner is the single stated figure).
