# Phase 17 execution plan — Azpetrol / Araz (TEST only)

Authoritative ledger:
[`specs/2026-09-12-phase17-registry-rows.md`](../specs/2026-09-12-phase17-registry-rows.md)
— **110 unique rows**, mechanically derived as 44 `CODE VERIFIED`,
49 `NOT STARTED`, 17 `BLOCKED`, 0 `LIVE VERIFIED`, 0 `IN PROGRESS`,
0 unclassified.

Phase 17 inherits **no** write, import, egress or destructive authority from
any earlier phase. The roadmap says so explicitly for Phases 16 and 17.

## T0 — safe pure-logic slice (NO owner decision required)

Implemented in this round. Every contract below is client-pure, contacts no
server, and is unambiguous from the legacy source.

1. `lib/azpRole.ts` — the role mapping, named explicitly as a browser
   affordance (M17-11…M17-14).
2. `lib/azpNum.ts` — `azpN`, `azpR2`, `azpMoney` (M17-31…M17-33).
3. `lib/azpDate.ts` — `azpDate`, `azpDayKey`, `azpInRange`,
   `azpUndatedHidden` (M17-34…M17-40).
4. `lib/azpFilter.ts` — `azpFilterRows`, `azpTotals`, `azpOpeningBalance`
   (M17-41…M17-48).
5. `lib/azpLabels.ts` — `AZP_MODULES`, `AZP_LABEL`, `azpKindLabel`, `azpMod`
   (M17-49…M17-51).
6. `lib/azpReport.ts` — `buildAzpReport`, `azpPeriodText`, `azpReportRows`
   (M17-52, M17-54, M17-55, M17-57, M17-60, M17-61).

Rules for this slice:

- reuse `nf` and `fmtD` from the accepted `lib/format.ts`; build no second
  formatter;
- no file imports `api/supabase`, so no accidental read is reachable;
- every test is falsifiable — a positive case, a negative case and a boundary
  case, with the equality case present wherever a threshold exists (§3, §4);
- nothing touches an accepted Phase 9-16 file.

## T1A — page, route and CSS (safe now)

Not implemented. These contracts need no write authority and do not depend on
whether realtime is later added. Implement the rail/route, both boards, states
and the 27 legacy CSS rules without a subscription.

## T1B — realtime (D-T6)

Keep separate from T1A. Legacy has no azp subscription. D-T6 decides whether
to preserve that behaviour or add an improvement; it cannot block the page.

## T2 — read-only store and API (BLOCKED on evidence value)

Not implemented. The four-read snapshot is unambiguous. Restore scripts seed
no azp data, but current TEST contents are unknown until an authenticated
read. Build the read path, measure first, and reuse any existing rows read-only;
do not assume D-T2 is needed before that measurement.

## T3 — writes (BLOCKED on D-T1, D-T2, D-T3, D-T4)

Not implemented and not invoked. No `azp_save_card`, `azp_delete_card`,
`azp_post_movements`, `azp_cancel_movement`, `azp_correct_movement` or
`azp_set_application_balance` call exists in Phase 17 code.

## T4 — import and export writers (partly BLOCKED on D-T4, D-T5)

Not implemented. The separate plain report writer (M17-63) is an unambiguous
parity contract and is NOT owner-blocked. Import is blocked on D-T4 and the
full-module template export is blocked on D-T5.

## Verification gate (run after the last edit)

1. focused tests for each new lib file;
2. regressions for every file touched;
3. full suite (`npx vitest run`);
4. `npx tsc -b --noEmit`;
5. `npx oxlint src` — must stay at the four pre-existing Fast Refresh warnings;
6. sandbox production build (`npx vite build --mode sandbox`);
7. `git diff --check`;
8. `node tools/ledger-check-m17.mjs` and `--self-test`;
9. `node tools/ledger-check.mjs` — the Phase 9 checker must stay green,
   proving Phase 17 changed nothing in its evidence base;
10. staged-file count 0 and the dirty tree preserved.

Measured baseline before any Phase 17 file existed: **190 files / 3986 tests**,
tsc exit 0, oxlint 4 warnings, `git diff --check` exit 0, 0 staged, branch
`react-migration`.

## Owner decisions, each with a recommendation

- **D-T1 — write containment.** *Recommendation: keep Phase 17 read/pure-only.*
  Every azp write leaves permanent `azp_audit_log` rows and consumes sequence
  values; a movement can never be deleted, only cancelled. A separate, narrow
  window with explicit residual accounting is safer than folding writes into a
  migration phase.
- **D-T2 — TEST fixture.** *Recommendation: defer until the current TEST row
  counts are measured.* Restore scripts seed none, but they do not prove the
  current database is empty. If non-empty evidence still needs created cards
  and movements, a card that has
  received any movement can **never** be deleted (`azp_delete_card` refuses),
  so the fixture is **not exactly restorable**. Approving it means accepting
  permanent TEST residue.
- **D-T3 — destructive cleanup.** *Recommendation: exclude from Phase 17.*
  `azp_delete_card` is the only hard `DELETE` in the module.
- **D-T4 — import.** *Recommendation: defer to its own phase.* The
  card-creation loop is not atomic with the movement post, so a mid-import
  failure leaves orphan cards — a real residual, not a theoretical one.
- **D-T5 — bulk export.** *Recommendation: allow client-only, TEST-only.* It
  egresses a module's full card and movement set, but writes nothing; against
  an empty TEST database it egresses nothing of value.
- **D-T6 — realtime.** *Recommendation: preserve legacy behaviour (no
  subscription).* Adding one is an improvement, not parity, and Phase 11's
  precedent is to record such a change as an improvement rather than assume it.
- **D-T7 — stale headers.** *Recommendation: correct them.* `sql/020` and
  `sql/021` say `-- NOT APPLIED` although both are provably live. This is a
  one-line documentation fix per file, exactly as was done for five other
  migrations on 2026-08-23. It changes no SQL behaviour.
- **D-T8 — ledger tooling.** *Recommendation: keep the checkers separate for
  now.* `tools/ledger-check.mjs` is hard-wired to Phase 9 in five places and
  carries 27 fixtures pinning them; parameterising it edits an accepted tool.
  `tools/ledger-check-m17.mjs` is additive and hardcodes no total. Unify later,
  deliberately.

## Hard constraints

TEST project `alkjjbaawmsirsfvqljm` only. Production `bbjmhaerssakbreykxiw`
must never be contacted. Sandbox mode only. Preserve the dirty tree. No stage,
commit, push, deploy or unrelated cleanup. No Phase 16 D-S1/D-S2/D-S3 action.
No Phase 17 mutation without a new explicit owner decision. Never store
passwords or secrets. Phase 17 remains NOT ACCEPTED pending independent Codex
audit.
