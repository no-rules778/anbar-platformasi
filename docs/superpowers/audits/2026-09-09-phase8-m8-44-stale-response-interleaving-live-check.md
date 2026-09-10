# Phase 8 — M8-44 concurrent stale-response interleaving live check

Date: 2026-09-09 (Asia/Baku)

Target: TEST Supabase `alkjjbaawmsirsfvqljm`. Production `bbjmhaerssakbreykxiw`
was never contacted (0 attempts, blanket abort route asserted).

## Scope

Closes `M8-44` — the monotonic request sequence in
[`store/movements.store.ts`](../../../web/src/store/movements.store.ts) that
discards late responses. Proven live, through the real React UI, for the two
orderings the row specifies plus the stale-failure shape the row's own contract
names ("a late reply writes no rows, raises no error and does not settle the
`loading` flag owned by the newer request").

This is **not** claimed from any `M8-45` evidence and does not repeat it: every
`M8-45` leg failed requests SEQUENTIALLY, never with two loads in flight. The
M8-45 audits remain separate.

## Environment

- `web/.env.sandbox.local` → TEST URL, `VITE_ALLOW_LOCAL_WRITES=false`,
  `VITE_TEST_ENVIRONMENT=true`, all verified before browser use.
- Localhost started only as
  `npm run dev -- --mode sandbox --host 127.0.0.1 --port 5175`. The previous
  server (PID 24452, itself `--mode sandbox`) was stopped and replaced by a
  freshly started instance (PID 5572) so the `sandbox` badge provably belongs
  to the process under test. Vite reported the `sandbox` mode badge. HTTP 200.
- Playwright 1.63.0 driving installed Chrome from the npm `_npx` cache; not
  added to `web/package.json` or `web/node_modules`.
- Real React login as TEST admin `anbar-admin-test@example.com`.

## Harness design

Network control **delayed or fulfilled TEST GET responses only**. Auth and every
`/rest/v1/rpc/` request were excluded by an explicit guard and never
intercepted.

**One logical load = 8 held requests.** Traced first, not assumed: one
«Mal hərəkəti» visit issues `movements`, `items`, `warehouses`,
`writeoff_valuations` and `rpc/stock_layers_supported`, and React StrictMode
issues the whole set TWICE. `movements` returns 101 rows in a single page (the
pager's limit is 1000), so paging adds nothing here. All four GET endpoints of
both StrictMode invocations are held together, because
`fetchMovementsSnapshot()` awaits `Promise.all` over all four — holding fewer
would let the load settle and there would be nothing stale to release.

**The loading probe is application-owned, not inferred.**
`[data-testid="mv-export-writeoff"]` is rendered `disabled={!canExportWriteOff}`
where `canExportWriteOff = loaded && isWriteOffFilter && !loading`
([`MovementsPage.tsx:323`](../../../web/src/pages/MovementsPage.tsx#L323),
`:554-555`). With the type filter pinned to «Silinmə» and `loaded` already true,
that button's disabled state **is** the store's `loading` flag, projected into
the DOM. No application code was changed to expose it. The full-screen
«Yüklənir…» is gated on `loading && !loaded` and is therefore invisible on a
refresh — which is exactly why it is not used as the probe.

**No application code was changed to make the harness pass.**

## The distinguishable stale payload, and why the first two attempts were rejected

The stale release fulfils `movements` with the REAL TEST rows plus a
browser-only marker `M844STALE` written into `partner` of one row. It is
produced inside the interception harness and **never written to Supabase**;
`note` is deliberately left untouched because `excludeCancelled()` classifies on
`note`, so writing there could change which rows survive and confound the proof.

Two earlier executions were **rejected as evidence rather than reported**, both
for the same class of fault — an unfalsifiable marker:

1. The marker was written to the first raw `Alış` row, which is not one of the
   three rows `excludeCancelled()` leaves visible. Its absence proved nothing.
2. After pinning the «Silinmə» filter for the loading probe, the visible set
   narrowed to one row (`TEST-OUT-1`) while the marker still targeted an `Alış`
   row the filter hides.

The accepted run marks `bd8369ee-f802-4cc5-b735-48b784b98b59` (`TEST-OUT-1`),
the row actually on screen under the active filter, and adds a **positive
control** (below) that makes every negative result falsifiable.

## Same store instance across remounts

Loads are triggered by real React navigation («Nomenklatura» → «Mal hərəkəti»),
which unmounts and remounts the page. A separate check
(`m844realm.mjs`) stamped `window` once and re-read it across three remount
cycles: the stamp was **identical every time**, main-frame navigations after the
stamp were **0**, and the run performed a single `page.goto` with zero reloads.
The module-level `requestSeq` therefore persisted, and both load invocations of
every leg reached the SAME module-level store instance. Had the document
reloaded, the counter would have reset and the argument would be void.

## Baseline (settled successful snapshot)

- visible rows: **1** under the pinned «Silinmə» filter
  (`02.09.2026 Test Anbar 0000001 TEST Mal 1 Silinmə — — — — 3.00 — — Synthetic outgoing anbar-admin-test@example.com Baxış`)
- footer: `1 qeyd · mədaxil 0.00 · məxaric 3.00 · mədaxil dəyəri —`
- raw `movements` response: **101 rows** — measured this run, matching the
  established baseline; the only distinct raw count observed all run was 101.
- refresh-error / stale banner: **absent**; no «Yükləmə xətası»
- loading probe: `false` (settled); search/«Sıfırla»/«Excel» all enabled

## Recorded request / release ordering

Times are seconds from harness start. Every leg holds A (8 requests) before B is
issued, and releases in the order the scenario requires.

| t | event | detail |
| --- | --- | --- |
| 31.4 | ARM A | hold window opened |
| 37.4 | DISARM A | **8 requests held, 0 responses delivered** |
| 41.5 | B nav | newer load issued via real remount |
| 53.6 | B settled | B displayed and loading settled |
| 53.7 | **RELEASE A** | 8 held, marked payload, HTTP 200 — *Leg A* |
| 67.3 | ARM A (2) | second logical A held |
| 77.5 | ARM B (2) | B held **separately**, both in flight |
| 83.6 | **RELEASE A** | marked payload while **B still pending** — *Leg B* |
| 92.0 | RELEASE B | real TEST response |
| 122.5 | **RELEASE A** | **HTTP 503** while B still pending — *sub-leg* |
| 130.6 | RELEASE B | real TEST response |
| 150.8 | RELEASE A | marked payload as the NEWEST load — *positive control* |

## Leg A — older success arrives after newer success: PASS

A was proved genuinely pending, not assumed: 8 requests held with **zero**
responses delivered, and the loading probe read `true` at that moment.

| Proof | Result |
| --- | --- |
| load A genuinely pending (probe `true`, 8 requests held, 0 delivered) | YES |
| B's table identity and footer displayed, loading settled | YES |
| stale marker `M844STALE` never appears | YES |
| B's table byte-identical after A's release | YES |
| B's footer byte-identical after A's release | YES |
| no refresh-error banner | YES |
| no full-screen «Yükləmə xətası» | YES |
| loading does not restart (probe stays `false`) | YES |
| controls usable (search/«Sıfırla»/«Excel») | YES |

## Leg B — stale A settles while newer B is still pending: PASS

Both loads were observed in flight simultaneously: `aHeld: 8`, `bHeld: 8`, probe
`true`.

| Proof | Result |
| --- | --- |
| A and B both genuinely in flight before any release | YES |
| A does not replace the current snapshot | YES |
| A shows no stale marker | YES |
| A shows no stale error (no banner, no full-screen error) | YES |
| A does not clear or settle the loading owned by B (probe stays `true`) | YES |
| B then becomes the final settled snapshot | YES |
| final snapshot carries no stale marker and no stale error | YES |
| final snapshot identical to baseline | YES |

## Sub-leg — stale A returns HTTP 503 while B is still pending: PASS

Included because the `M8-44` ledger row itself states a late reply "raises no
error and does not settle the `loading` flag owned by the newer request". This
is the row's own contract, **not an invented criterion**; the stale-failure case
is also one of the three focused store tests
(`movements.store.test.ts:214`).

Stale A was answered `503 Service Unavailable (M8-44 stale A)` while B was held.

| Proof | Result |
| --- | --- |
| B still pending when A failed | YES |
| no refresh-error banner | YES |
| no full-screen «Yükləmə xətası» | YES |
| snapshot unchanged | YES |
| loading not settled by the stale failure (probe stays `true`) | YES |
| B then settled cleanly, no banner, identical snapshot | YES |

## Positive control — the marker is genuinely visible

The decisive check against "the table looks correct, therefore it is protected".
The **identical marked payload** was released to a load that was the NEWEST
(nothing issued after it), so the sequence guard must not discard it.

- `M844STALE` **rendered in the visible İSTIQAMƏT / KONTRAGENT column**:
  `02.09.2026 Test Anbar 0000001 TEST Mal 1 Silinmə M844STALE — — — 3.00 — — Synthetic outgoing …`
- loading settled normally.

So the marker demonstrably reaches the screen when a load wins. Its absence in
Leg A, Leg B and the sub-leg is therefore a real discrimination, not an artefact
of an invisible marker.

A final real navigation restored the unmodified TEST snapshot: marker gone,
table and footer identical to baseline.

## Reconciliation

- raw TEST `movements` count: **101**, measured this run; the only distinct raw
  count observed was 101.
- non-GET requests observed, all read-only RPCs: `register_session`,
  `get_reference_values`, `get_user_directory`, `stock_layers_supported`,
  `touch_session`. **No mutation RPC, no fixture, no INSERT/UPDATE/DELETE.**
- production contact attempts: **0**.
- device session ended through the real «Çıxış» (login form returned).
- localhost remains TEST sandbox/read-only, HTTP 200,
  `VITE_ALLOW_LOCAL_WRITES=false`.
- staged state empty; dirty working tree preserved at **213** entries.
- no I-10 row created.

## Scope of the promotion

`M8-44` is promoted to LIVE VERIFIED for exactly what was demonstrated: the
«Mal hərəkəti» movements load, TEST admin, both response orderings (older
success after newer success; stale settling while the newer load is pending)
and the stale HTTP 503 failure shape, with the stale reply proved to write no
rows, raise no error and not settle the loading state owned by the newer
request.

Not claimed: other roles (the row's contract carries no role requirement — the
guard is a module-level counter with no role dimension), other screens' stores,
and stale interleaving arising from the realtime refresh path rather than a
navigation remount.
