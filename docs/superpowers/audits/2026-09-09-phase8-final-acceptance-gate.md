# Phase 8 — final acceptance gate

Date: 2026-09-09 (Asia/Baku)
Environment: TEST `alkjjbaawmsirsfvqljm` only
Status: **NOT ACCEPTED**

> **SUPERSEDED IN PART (2026-09-09, after Codex independent review).** Two
> claims below are retracted: (a) the "satisfied-by-gate" classification of the
> M8-39/M8-46 correction/replacement branches, whose supporting transfer-based
> attribution was an evidence defect; and (b) "one terminal blocker", since
> M8-29 remains in scope and two owner scope decisions are outstanding. The
> automated-check results and the TEST/environment reconciliation below remain
> accurate. See
> [`2026-09-09-phase8-post-codex-reconciliation.md`](2026-09-09-phase8-post-codex-reconciliation.md)
> for the current blocker list.

## What this run completed

| Row | Before | After |
| --- | --- | --- |
| M8-14 realtime subscription + 400 ms debounce | CODE VERIFIED only | **LIVE VERIFIED** with a real TEST `postgres_changes` burst |
| M8-44 realtime-path stale interleaving | explicitly excluded from the M8-44 claim | **CLOSED** with a passing positive control |
| M8-38 / M8-39 / M8-46 correction+replacement | recorded as "blocked, needs an inactive-layer state" | **reclassified SATISFIED-BY-GATE** on code + live evidence |

Scoped audits:
[M8-14](2026-09-09-phase8-m8-14-realtime-debounce-live-check.md) ·
[M8-44 realtime path](2026-09-09-phase8-m8-44-realtime-path-stale-interleaving.md) ·
[layer gate](2026-09-09-phase8-layer-gate-correction-replacement-boundary.md)

## Ledger normalization result

Re-reading all 55 M8 rows, the residual "PARTIAL" text on most rows is
**scope notes, not acceptance requirements** — phrases of the form "other
roles, broader data shapes and concurrency remain open" attached to rows whose
actual contract already has live evidence. Treating every such phrase as an
acceptance blocker would invent requirements the ledger does not state, which
this run explicitly avoided.

Genuine categories after normalization:

- **Acceptance-satisfied:** M8-01…M8-13, M8-15, M8-17…M8-28, M8-30…M8-34,
  M8-40…M8-45, M8-47, M8-50/50b, M8-51, M8-52, M8-54 — and now M8-14.
- **Satisfied-by-gate (intentionally unreachable):** the M8-39 edit-mode and
  M8-46 correction/replacement branches. `canEditDocument()` refuses
  `layer-active` (`documentEdit.ts:105`) and `mayReplace = layerReady &&
  !layerActive` (`DocumentViewDialog.tsx:196`) because `replace_movement_item`
  has no layer variant. Confirmed live on the fresh open layer-accounted
  document `SND-8DC5E59E8D`, which rendered the layer warning and neither
  control. Row cancellation, which carries NO layer gate (line 198), is
  separately live-verified — so this is a specific gate, not a blanket block.
- **Code-contract rows needing no live leg:** M8-16, M8-35, M8-36, M8-37,
  M8-48, M8-49.
- **Measured:** M8-53 has a real HTTP/1.1 protocol measurement (6,134 raw
  response bytes over the four contracts), kept separate from M8-11's
  presentation cap.
- **Structurally unreachable historical branch:** M8-29 layer-legacy transfer
  success needs a fresh cutover seeding unresolved stock in a second warehouse.
  Not executed: it would destroy the current evidence baseline that every other
  layer row depends on. Owner decision, recorded, not manufactured.
- **Excluded by product decision:** `Çap`.

## Automated checks (all run this session, all green)

- `npm test` — **126 files, 2708 tests passed**
- `npm run typecheck` — clean (exit 0)
- `npm run lint` (oxlint) — clean
- `npm run build` — built in 5.33s (the >500 kB chunk notice is a pre-existing
  advisory, not an error)
- `git diff --check` — exit 0; only CRLF line-ending advisories, no whitespace
  errors

## Environment and safety verification

- TEST movements **121**; every fixture this session was posted through a
  supported RPC and reversed through a supported cancellation RPC.
- `Test Anbar / 0000001 = 8.00` (baseline), `CODEX Phase8 Transfer Anbar = 0`,
  `Test Anbar / 0000002 = 0`. **Negative balances: 0.**
- Layers active, version 36; `b633360d…` avail 7 `legacy_unresolved`,
  `fcb7f7b1…` avail 1 @ 15 `known` — unchanged from baseline.
- No immutable movement or audit row was deleted to restore any count.
- Localhost: only `127.0.0.1:5175` listens, `--mode sandbox`, **HTTP 200**,
  served bundle reports `VITE_ALLOW_LOCAL_WRITES=false` and TEST ref
  `alkjjbaawmsirsfvqljm`. The temporary write-enabled process (5176) was
  stopped; `web/.env.sandbox.local` on disk was never set to true.
- No orphaned automation browser remains; every harness closed its context.
- **Production contact counter: 0** in every session (blanket abort guard on
  `bbjmhaerssakbreykxiw`).
- Staged state empty; 214 dirty/untracked files preserved; branch
  `react-migration`; no commit, stage, push or deploy; no `I-10` row.

## THE TERMINAL BLOCKER

**Phase 8 cannot be marked ACCEPTED by Claude, on any amount of evidence.**

The ledger states it directly (`2026-09-05-phase8-registry-rows.md:31-32`):

> Module I is ONE acceptance boundary. No milestone is `ACCEPTED` alone, and
> `ACCEPTED` additionally requires Codex's independent audit (principles §11).

`ANBAR_REACT_MIGRATION_PRINCIPLES.md` §11 defines that audit as Codex reading
the diff, running the checks independently, performing live browser
verification, and recording the result — concluding: *"A phase is `ACCEPTED`
only after both code and live verification pass."*
`CLAUDE.md` §4 fixes the same sequence: Codex audits → Claude implements →
**Codex independently audits** → the user approves.

This is a required external authority, not a missing test. It is exactly the
kind of irreducible boundary at which this run was instructed to stop.

## Blocker list

**Mandatory before ACCEPTED (not executable by Claude):**

1. Codex's independent Phase 8 audit per principles §11 — the only remaining
   gate. Two further boundaries are for that audit to rule on, since both are
   classification judgements rather than uncollected evidence:
   - whether **satisfied-by-gate** is accepted for the M8-39/M8-46
     correction/replacement branches (this run's recommendation: yes — the
     required behaviour is the refusal, and it is verified);
   - whether **M8-29** layer-legacy transfer success may stay unexecuted rather
     than destroying the TEST evidence baseline with a fresh cutover.
2. The user's approval of any production action (none was taken or proposed).

**Optional future coverage — genuinely not acceptance-blocking:**

- Role dimensions on presentation rows already live-verified for admin.
- Multi-tab concurrency beyond the covered ordinary/batch cases.
- Broader transport/unknown-outcome permutations beyond the covered
  `movements` 503 retention and stale-interleaving legs.
- Volume/payload evidence beyond the measured M8-53 contract.

**Phase 8 remains NOT ACCEPTED**, and correctly so: every executable, safe,
authorized TEST scenario identified in the normalization has been completed,
and what remains is an authority gate, not work.
