# Phase 8 — M8-44 stale-response interleaving on the REALTIME refresh path

Date: 2026-09-09 (Asia/Baku)
Environment: TEST `alkjjbaawmsirsfvqljm` only
Actor: TEST admin (`anbar-admin-test@example.com`)
Result: PASS — closes the branch the earlier M8-44 audit explicitly excluded

## Why this run exists

The accepted M8-44 evidence
(`2026-09-09-phase8-m8-44-stale-response-interleaving-live-check.md`) ends with
an explicit exclusion: *"stale interleaving arising from the realtime refresh
path rather than a navigation remount"* was NOT claimed. Once M8-14 was proved
live, that path became reachable: a real `postgres_changes` burst issues a
genuine realtime-triggered `load()`, which can then be held while a newer load
overtakes it.

The guard under test is the module-level monotonic ticket in
`web/src/store/movements.store.ts:139,192,206` — `const reqId = ++requestSeq`
and `if (reqId !== requestSeq) return`. It is shared by ALL callers, so the
question is whether a REALTIME-issued load that loses its ticket is discarded
exactly like a remount-issued one.

## Method

One real TEST-admin session on the read-only sandbox `127.0.0.1:5175`
(`VITE_ALLOW_LOCAL_WRITES=false`), blanket route aborting any
`bbjmhaerssakbreykxiw` URL. Interception is **browser-only**: the marked rows
below exist solely in a response this harness rewrote in-flight. **Nothing
synthetic was written to TEST**, and no application helper under test was
called — the result is read from the DOM.

1. Waited for the realtime channel: `system/ok` **"Subscribed to PostgreSQL"**
   at `+7845 ms`.
2. Armed a HOLD capturing the FIRST subsequent `movements` response without
   delivering it.
3. Fired a real TEST event from a separate authenticated REST session: an
   inbound 0.01 `Satınalma` document via the supported `post_movement_document`
   (inbound documents use the ordinary RPC even with layers active —
   `operation.store.ts:823`, "a LAYERED movement post is outbound only").
4. Observed the genuine `postgres_changes` INSERT and let the 400 ms debounce
   issue the realtime-triggered load — that load is the one held.
5. Issued a NEWER user-driven load while the realtime reply was held, by
   navigation remount (Nomenklatura → Mal hərəkəti). «Sıfırla» is deliberately
   NOT used: `reset` only clears filters (`movements.store.ts:189`) and issues
   no read at all.
6. Let the newer load settle, then released the held stale reply with a marker
   written into the DISPLAYED `partner` column of **all 120 rows** (never
   `note` — `excludeCancelled()` classifies on `note`).
7. POSITIVE CONTROL: released the identical marked payload as the NEWEST load.

## Evidence (marker `M844RTFCDIAW`)

| t (ms) | event |
| --- | --- |
| 7845 | channel `system/ok` "Subscribed to PostgreSQL" |
| 17930 | real `postgres_changes` INSERT on `movements`, id `18259a16-03dc-49b1-8157-e37c8aa14e72` |
| 18350 | realtime-triggered `GET /rest/v1/movements` (debounced) |
| 18805 | that response CAPTURED and held (54,131 bytes) |
| 22978+ | newer load issued by navigation remount |
| 32006 | newer load settled on screen |
| 40042 | held stale reply released, all 120 rows marked |
| 43713+ | positive-control remount |

- **Stale realtime reply DISCARDED.** After the release, `markerVisible:
  false` — none of the 120 marked rows reached the screen, and the table still
  showed the newer load's rows. The realtime load's ticket was no longer the
  newest, so it did not write rows.
- **POSITIVE CONTROL PASSED.** The identical marked payload delivered as the
  NEWEST load rendered `M844RTFCDIAW` in the visible İSTIQAMƏT / KONTRAGENT
  column (`pcMarked: 4` responses marked across the remount's StrictMode-doubled
  reads). The marker demonstrably reaches the screen when a load wins, so its
  absence above is a real discrimination, not an invisible-marker artefact.

## Two earlier executions were REJECTED, not reported

- **Run 1** used «Sıfırla» as the "newer load". It issues no read, so no newer
  ticket was ever drawn and the held reply was legitimately still the newest;
  the marker correctly appeared. Reported as a pass it would have been false.
  The harness now asserts `getsAfterHold >= 1` and ABORTS otherwise.
- **Run 2** fixed the newer load but marked only the FIRST positive-control
  response. A remount issues several reads (StrictMode doubling plus the
  settle), so a later unmarked load won and the control came back
  `markerVisible: false` — unfalsifiable, therefore rejected. The control now
  marks every response in a WINDOW.

No application code was changed to obtain any of this.

## Reconciliation

Four event-source fixtures were used across the three runs; every one was
compensated through the supported `cancel_layer_document` immediately after
posting.

- Movements 113 → 121 — only posted-plus-reversed pairs; **no movement or audit
  row was deleted**.
- `Test Anbar / 0000001 = 8.00` (baseline), `CODEX Phase8 Transfer Anbar = 0`,
  `Test Anbar / 0000002 = 0`. **Negative balances: 0.**
- Layers unchanged: `b633360d…` avail 7 `legacy_unresolved`, `fcb7f7b1…`
  avail 1 @ 15 `known`; capability active, version 36.

## Safety

0 production contacts (guard counter 0 in the harness), **0 mutation RPCs from
the browser session** — the only writes came from the separate supported REST
event source and were all reversed. Read-only sandbox HTTP 200,
`VITE_ALLOW_LOCAL_WRITES=false` on disk and in the served bundle. No commit,
stage, push or deploy; dirty tree preserved; no `I-10` row.

## Scope

Closes M8-44's realtime-path exclusion for TEST admin. Not claimed: other
roles (the guard is a module-level counter with no role dimension), other
screens' stores, and concurrent multi-tab interleaving.
