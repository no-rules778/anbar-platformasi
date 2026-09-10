# Phase 8 — M8-51 `writeoff_valuations` live read-contract check

Date: 2026-09-09 (Asia/Baku)

Target: TEST Supabase `alkjjbaawmsirsfvqljm`. Production `bbjmhaerssakbreykxiw`
was never contacted — a context-level `route.abort()` guard counted
**0 attempts** in both legs.

Read-only throughout: no mutation RPC, no fixture, no application-code change,
no commit/stage/push/deploy, no I-10 row. `Çap` is outside acceptance.

## Why this run happened at all

The repository already held partial M8-51 evidence, and it was checked first so
the run would not duplicate it:

| Requirement | Pre-existing evidence | Sufficient? |
| --- | --- | --- |
| live column set of `writeoff_valuations` | I-2 SQL-editor read on TEST, recorded in `writeoffValuations.api.ts` and registry line ~1918 | YES |
| live SELECT policy **text** | same I-2 session (`EXISTS (SELECT 1 FROM movements m WHERE m.id = …movement_id)`) | YES, as text |
| column-explicit request, order, paging, HTTP 200 | [M8-53 payload measurement](2026-09-08-phase8-m8-53-payload-measurement.md) | YES, but on a **0-row** response |
| failure is fatal / no partial rows / both failure shapes | [M8-45 remaining read legs](2026-09-09-phase8-m8-45-remaining-read-legs-live-check.md) | YES |
| a **non-empty** response: row count, key set, typed mapping | [M8-03/05/52](2026-09-09-phase8-m8-03-m8-05-m8-52-live-check.md) recorded 3 rows and their values, but **not** the request signature or returned key set | **NO — the gap** |
| SELECT policy proved **behaviourally** across roles | none | **NO — the gap** |

So exactly two things were missing: the request contract and a populated
response captured **together**, and a falsifiable test that the policy really
derives visibility from the parent movement rather than merely saying so.

## Environment

- `web/.env.sandbox.local` → TEST URL only, `VITE_ALLOW_LOCAL_WRITES=false`,
  `VITE_TEST_ENVIRONMENT=true`; verified before browser use; 0 production refs.
- Localhost freshly started as
  `npm run dev -- --mode sandbox --host 127.0.0.1 --port 5175` (PID 18976,
  `--mode sandbox`); HTTP 200 at start and at close.
- Playwright 1.63.0 driving installed Chrome from the npm `_npx` cache; not
  added to `web/package.json` or `web/node_modules`.
- Real React login and real «Çıxış» logout in both legs.

---

## 1 — Request-contract evidence (TEST admin)

The valuation request belonging to the movements snapshot, matched by full
endpoint plus select signature, decoded verbatim:

```
/rest/v1/writeoff_valuations
  ?select=movement_id,source_amount,known_amount,unknown_qty,final_amount,valuation_method,override_reason
  &order=movement_id.asc
  &offset=0&limit=1000
```

| Proof | Observed |
| --- | --- |
| column-explicit, not `select=*` | **not a wildcard** — 7 named columns |
| columns, in request order | `movement_id, source_amount, known_amount, unknown_qty, final_amount, valuation_method, override_reason` |
| matches the `COLUMNS` constant exactly, same order | YES |
| deterministic ordering before the range (A11) | `order=movement_id.asc` present, **before** the range params |
| paging | one leg, `offset=0&limit=1000`; short page → no second leg |
| HTTP status | **200** |
| `Content-Range` | `0-2/*` |
| extra/undeclared query params | none — only `select,order,offset,limit` |

**StrictMode, not two logical loads.** Exactly 2 requests hit the endpoint;
both URLs are byte-identical and both bodies are identical. That is one logical
load duplicated by development StrictMode. The valuation endpoint is issued by
no other screen in the observed traffic, so no unrelated request could latch.

## 2 — Live response evidence (TEST admin)

**3 rows**, freshly measured this run (not assumed):

| movement_id | source_amount | known_amount | unknown_qty | final_amount | valuation_method | override_reason |
| --- | --- | --- | --- | --- | --- | --- |
| `53b5bd5a-…50836` | 12.5 | 12.5 | 0 | 12.5 | `source` | null |
| `8d8f82eb-…c0ec` | null | 0 | 1 | null | `unknown` | null |
| `d14bac90-…1211` | 12.5 | 12.5 | 0 | 12.5 | `source` | null |

Returned key set, union over all rows — exactly the 7 requested, no more:

```
movement_id, source_amount, known_amount, unknown_qty, final_amount,
valuation_method, override_reason
```

**Typed client mapping, field by field.** `WriteoffValuationRow` declares
exactly these 7 fields. Set difference computed both directions:

- live keys not present in the type: **none**
- typed fields not returned live: **none**

So there is **no undocumented field dependency**, and no phantom field. The
observed runtime types also confirm the deliberately-nullable typing: row 2
returns `source_amount: null` and `final_amount: null` while the type declares
both nullable, and `known_amount`/`unknown_qty` arrive as numbers though the
live schema marks them NOT NULL — the defensive nullable typing is not
contradicted by live data.

## 3 — Correlation with the movements snapshot

RAW `movements`: **101**, freshly measured this run — unchanged.

All three valuation movements **do** exist in the RAW 101:

| movement_id | type | doc_num | in RAW 101 |
| --- | --- | --- | --- |
| `53b5bd5a…` | `Silinmə` | `SND-9F8C5810B4` | YES |
| `8d8f82eb…` | `Silinmə` | `SND-16E86D43A9` | YES |
| `d14bac90…` | `Silinmə` | `SND-4E10E23D8B` | YES |

**Why none is visible after `excludeCancelled()`** — established mechanically
by searching the RAW notes for each id, not by re-running the M8-03 logic:

| valuation movement | named by | marker |
| --- | --- | --- |
| `53b5bd5a…` | `9a821e02…` (same doc) | `Ləğv ID: 53b5bd5a-…` |
| `8d8f82eb…` | `3e3a5ff5…` (same doc) | `Ləğv ID: 8d8f82eb-…` |
| `d14bac90…` | `831f3a1e…` (same doc) | `Ləğv ID: d14bac90-…` |

Each is row-level cancelled by an explicit `Ləğv ID:` counter-row. This
**re-confirms and does not re-promote** M8-03 or M8-05.

The DOM rendered **3** rows; its single `Silinmə` row renders `—` in both the
QIYMƏT and MƏBLƏĞ cells — the already-recorded unvalued branch. **No M8-05
valuation-rendering branch is claimed here:** all three valuation rows remain
outside the visible operational set, exactly as the previous audit established.
No data was created to make them visible.

## 4 — RLS evidence: the policy proved behaviourally

The policy text was already read read-only in I-2. What was open is whether the
live behaviour matches it. The cheapest falsifiable test was a second
read-only leg as the existing TEST `anbardar`, whose warehouse scope differs.

| Leg | movements visible | valuation rows | warehouses visible |
| --- | --- | --- | --- |
| admin | 101 | **3** | `Test Anbar`, `CODEX Phase8 Transfer Anbar` |
| anbardar | 85 | **2** | `Test Anbar` |

Per-row prediction from the policy
`EXISTS (… movements m WHERE m.id = movement_id)`, against what the anbardar
actually received:

| valuation row | parent warehouse | parent visible to anbardar | valuation returned | match |
| --- | --- | --- | --- | --- |
| `53b5bd5a…` | `Test Anbar` | yes | yes | MATCH |
| `8d8f82eb…` | `CODEX Phase8 Transfer Anbar` | **no** | **no** | MATCH |
| `d14bac90…` | `Test Anbar` | yes | yes | MATCH |

**3 of 3 match, zero leakage** — every valuation row the anbardar received has
its parent inside the anbardar own movement set. The withheld row is the
falsifying case: had visibility not been derived from the parent movement, it
would have been returned. This is live proof of the policy, not a restatement
of its text.

**The client adds no scoping of its own.** The anbardar valuation URL is
byte-identical to the admin one — same select, same order, same paging, and
**no warehouse filter**. The server scopes; the client does not, consistent
with `D2` / `M8-42`. No RLS policy was altered.

## 5 — Application-behaviour evidence

- The valuation read is one of the four legs of the **atomic** snapshot
  (`fetchMovementsSnapshot()` — `Promise.all` over movements/items/warehouses/
  valuations, with `!valuations.ok` returning `ok: false`), so a successful
  valuation read is included in the same snapshot rather than applied
  separately. Observed live: the valuation 200 and the movements 200 belong to
  the same load in both legs.
- **The response causes no second client-side read, write or audit action.**
  The endpoint was hit exactly twice (the StrictMode pair) and not again after
  the body arrived. The only non-GET traffic in either leg was session/read
  RPCs (`register_session`, `get_reference_values`, `get_user_directory`,
  `stock_layers_supported`, `end_session`) plus a `HEAD` count probe on
  `audit_log` — identical in both legs and not triggered by the valuation
  response. **No mutation RPC, no INSERT/UPDATE/DELETE, no fixture.**
- The M8-45 failure-retention matrix was **not** repeated; it is already closed.
- No M8-53 payload/volume claim is made here.

## 6 — Focused tests

`web/src/api/writeoffValuations.api.test.ts` and
`web/src/api/movementsSnapshot.api.test.ts` — **24 passed / 24**. The
column-explicit assertions in those tests now have a matching live observation.

## Reconciliation

- RAW TEST `movements`: **101**, freshly measured — unchanged.
- Valuation rows: **3** (admin), recorded from the real response; **2**
  (anbardar) under RLS.
- Production contact attempts: **0**, both legs.
- No mutation RPC and no non-read database request occurred.
- Both device sessions ended through the real «Çıxış» flow.
- Localhost remains TEST sandbox/read-only, HTTP 200;
  `VITE_ALLOW_LOCAL_WRITES=false`.
- Nothing staged; the dirty working tree is preserved unchanged (24 modified
  tracked files, identical to the pre-run list); no source file was edited.

## Verdict

**M8-51 → LIVE VERIFIED.** The request contract, a populated live response, the
1:1 typed mapping and the behaviourally-proved SELECT policy are all now
covered by live evidence. M8-03, M8-05 and M8-52 are unchanged by this run.
