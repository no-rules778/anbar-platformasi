# Phase 12 TEST-only implementation plan — Module M («Nomenklatura sorğuları»)

Status: **EXECUTED — 2026-09-11 (SUPERSEDED as a gating line).** Codex passed
the design and the owner answered D-M1 and D-M3…D-M6, so **T1-T6 and T8 have
run**; the "no task below may run" instruction is HISTORY. **T7 has NOT run
and must not be started: D-M2 is still deferred**, so no request may be
created, withdrawn, rejected or approved and no permanent TEST item or
7-digit code may be produced. Measured result: 61 `CODE VERIFIED`, 0
`LIVE VERIFIED`, 3 `IN PROGRESS`, 6 `NOT STARTED` of 70. T6's authenticated
legs are unexercised — no TEST identity was available. Phase 12 remains
**NOT ACCEPTED**.
[Implementation audit](../audits/2026-09-11-phase12-implementation.md)  
[Proposal](../specs/2026-09-11-react-migration-phase12-nomenclature-requests-proposal.md) ·
[Ledger (70 rows)](../specs/2026-09-11-phase12-registry-rows.md) ·
[Design handoff audit](../audits/2026-09-11-phase12-design-handoff.md)

## Hard constraints for every task

TEST `alkjjbaawmsirsfvqljm` only; **never** contact production
`bbjmhaerssakbreykxiw`; sandbox mode; preserve the dirty tree; no stage,
commit, push or deploy; no SQL change (017 and 018 are applied and unchanged);
never store or print a password. The localhost dev server is started with
`npm run dev -- --mode sandbox --host 127.0.0.1 --port 5175`; if that port is
taken, **inspect and reuse** the existing server after confirming the TEST
ref and `ALLOW_LOCAL_WRITES=false`, rather than killing an unknown process.

## T0 — design closure (external, blocking)

1. Codex independent design audit of the proposal, the 70-row ledger and this
   plan against `index.html:257, 346-350, 641-642, 889-903, 1499, 2470-2551,
   2555-2711, 7506` and `sql/017` in full.
2. Owner decisions D-M1…D-M6. **D-M2 is the gate for every write row**: with
  no TEST write window, persisted/server-live clauses in M12-59, M12-61,
  M12-62, M12-76…M12-82, M12-91, M12-92, M12-95 and M12-96 cannot be
  promoted beyond `CODE VERIFIED`. M12-93 is structural and M12-94 still has
  source/unit evidence available; neither is falsely labelled write-blocked.
3. Confirm no other session is editing `App.tsx`, `index.css` or
   `mutationGuard.ts` (the three shared files this phase touches).

No row is promoted by T0.

## T1 — pure logic (`lib/nomenclatureRequests.ts`), tests first

Falsifiable positive / negative / boundary cases per protocol §4, §3.

- `nreqNorm(s)` — M12-53. Positive: `'Kabel NYM 3x1.5'` and
  `'  KABEL/NYM.3x1,5  '` collapse to the same key. Negative: `'Sement M400'`
  ≠ `'Sement M500'`. Boundary: `null`/`undefined`/`''` → `''`. **Cross-check
  against the server rule** by reusing the existing
  `tests/nomenclature_requests_simulation.js` case list, so browser and SQL
  cannot drift.
- `nreqSimilar(name, items, requests)` — M12-54, M12-55. Boundary matrix on
  the length rule: a 1-char normalised name returns empty; a 3-char query
  matches only by equality (the `>= 4` containment arms must NOT fire);
  exactly 4 chars enables containment both ways. Negative control: an
  `approved`/`rejected`/`cancelled` request never appears as a candidate.
  Cap: 11 matching items yield 10.
- `filterRequests(rows, { status, q })` — M12-22…M12-25. Positive: each of
  the four segments; `''` includes a `cancelled` row (the one path that
  reaches it). Negative: the note and the warehouse do **not** match the
  query — a row whose note alone contains the term is excluded, which is the
  falsifiable half of M12-23.
- `statusTag(status)` — M12-36. All four known statuses plus an unknown one,
  asserting the fallback renders raw text with no tag.
- `requestDateLabel(ts)` — M12-31, including the `ts = 0` → `01.01.1970` case
  that a "sensible" implementation would wrongly render as `—`.
- `canReview(me, row)` / `canWithdraw(me, row)` — M12-40…M12-43. Full role ×
  status matrix: {admin, anbardar-author, anbardar-other, rehber} ×
  {pending, approved, rejected, cancelled}. These are **affordance** helpers;
  each test asserts that fact in its name so no reader mistakes them for
  permission evidence.

## T2 — API and snapshot sources

- `fetchItemRequests()` — M12-10, M12-11, M12-12. Reads `item_requests`
  SELECT `*` ordered `created_at` DESC, maps to the exact legacy view model,
  and normalises BOTH failure shapes (returned `{ error }` and a rejected
  promise) into an explicit failed result. It never represents failure as a
  successful empty list. Tests assert the full field mapping including every
  legacy empty-value default and the `ts = 0` fallback, plus both failure
  shapes. The snapshot/store tests prove an initial error and retained prior
  snapshot on refresh, so M12-11 cannot contradict M12-13/14.
- The item-request store also calls the dedicated accepted
  `fetchReferenceValues()` once for unit/category choices. Its `ready:false`
  result is non-fatal and activates A14 fallbacks. It must never call
  `referenceDirectory.store.load()`, whose warehouses/partners/Sərfiyyat and
  usage reads are outside M12-10.
- Four RPC wrappers — `requestNewItem`, `approveItemRequest`,
  `rejectItemRequest`, `cancelItemRequest`. Each: passes exactly the
  documented parameters with empties as `null` (M12-59, M12-76, M12-80,
  M12-82), returns `{ ok, data, error }`, never throws, and calls
  `blockedReason()` first (M12-97).
- `mutationGuard.ts` gains an additive
  `ItemRequestWriteAction = 'nreq.create' | 'nreq.approve' | 'nreq.reject' |
  'nreq.cancel'` union plus the four `WRITE_ACTIONS` entries. Nothing
  existing is modified.

## T3 — store (`store/itemRequests.store.ts`)

Mirrors the accepted `warehouseOverview` / `dashboard` shape: module-level
`requestSeq` ticket, atomic apply, retention on a failed refresh, filters
held in the store.

Tests: M12-13 (any reader failure applies nothing), M12-14 (a failed refresh
retains the previous rows and raises the stale flag; recovery clears it),
M12-15 (an older success **and** an older failure settling after a newer
reply are both discarded), M12-17 (filters survive a reload).

## T4 — page, dialogs and CSS

`pages/ItemRequestsPage.tsx` — M12-05, M12-06, M12-20, M12-30…M12-39.
`components/item-requests/RequestCreateDialog.tsx` — M12-50…M12-62.
`components/item-requests/RequestReviewDialog.tsx` — M12-70…M12-81.
`App.tsx` — the `nreq` route and rail entry (M12-01…M12-04).

CSS: port `index.html:81, 84-87, 115-118` verbatim into `web/src/index.css`
(`td.nm`, `.t-op`, `.t-mv`, `.t-out`, `.seg` and its three sub-rules). This
closes the gap recorded in proposal §8 and follows the D-L5 precedent.

Subtitle tests drive all three role branches (M12-06). The create-dialog
precedence test drives all four validation states in order and asserts that a
merely similar name leaves the button ENABLED (M12-56, M12-58) — the
negative control that separates "similar" from "exact".

## T5 — full gate

`tsc -b --noEmit`, `oxlint src`, full vitest suite, `vite build --mode
sandbox`, `git diff --check`, staging empty. Focused suites run during T1-T4;
the full gate runs once after code completion.

## T6 — live read-only sweep (no D-M2 needed)

As the existing TEST anbardar, read-only, on the sandbox server with the
production abort guard armed:

- rail entry present and last in «Bazalar»; the page opens (M12-01, M12-02);
- exactly `item_requests`, `items` and `get_reference_values`, with no whole
  Soraqçalar/warehouse/partner/Sərfiyyat/usage reads (M12-10);
- the anbardar subtitle variant and the footer's own-requests suffix
  (M12-06, M12-39);
- each segment filters correctly and «Hamısı» is the only route to a
  cancelled row (M12-20…M12-22);
- table cells: raw warehouse, status tag markup, code em-dash, and the
  filter-dependent empty text (M12-35…M12-38);
- retention under an injected 503 **and** under a network abort, with clean
  recovery (M12-14);
- **0 production hits, 0 write attempts** — asserted, not assumed.

## T7 — live write window (**requires D-M2**)

Only if the owner authorises it, and with the boundary stated in advance:
**approval permanently creates an item and consumes a 7-digit code. That is
not reversible by any supported interface.** No write leg is database-net-zero:
withdrawal and rejection preserve decided request rows and server audit rows.
Those two legs are only item-catalogue-neutral. The window must therefore be
planned as: create → withdraw (catalogue unchanged, immutable request/audit
history retained); create → reject (same residual-history rule); create →
approve (one permanent TEST item, consumed code, decided request and audit
history, all acknowledged and recorded).

Per-row: M12-59/61/62 (create, success and failure), M12-76/77/81 (approve),
M12-79/80 (reject, including the empty-reason refusal reaching the server),
M12-82 (withdraw), M12-91 (each role refusal observed as a **server**
refusal), M12-92 (first refusing guard named for at least the
not-anbardar and duplicate-pending cases), M12-95 (the duplicate-pending
refusal), M12-96 (`audit_log` rows read back — needs a TEST admin identity).

Identities required: a TEST **anbardar** (exists) and a TEST **admin** (does
not — the same boundary M10-51 and M11-91 carry). Supply either only as a
process-only variable, never in a repo file.

## T8 — documentation and reconciliation

Update the ledger statuses from measured evidence only, re-derive the tally
mechanically, update the four authoritative summary surfaces, run the
documentation integrity checks, and write one implementation audit. Phase 12
stays `NOT ACCEPTED` until Codex's final independent audit.
