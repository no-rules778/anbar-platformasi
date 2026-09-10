# Phase 4 plan — Audit jurnalı

**Status: `ACCEPTED` 2026-09-03 by explicit user decision.** T0-T9 complete
and Codex-audited (four findings, all fixed). **T10, the populated-data live
comparison, was NOT performed** — the user accepted the phase without it, as
a recorded exception. See §"Definition of done" and §"Acceptance" below;
the exception is a standing item, not a closed one.

## Standing constraints

Do not change Supabase, SQL/RPCs, root `index.html`, production data, the
GitHub remote or Vercel. Keep `VITE_ALLOW_LOCAL_WRITES` unset. No new
dependencies without approval. Preserve unrelated changes. Registry rows
(`M4-01…M4-17`, new Module E) are merged **before** implementation, per
principles §10.

## Pre-implementation re-verification (done 2026-09-02, before T0)

Every contract claim in the proposal was checked against source, not assumed:

- `audit_log` and `get_user_directory()` confirmed present in
  `web/src/types/database.ts` — no regeneration needed. **All `audit_log`
  display columns are nullable**, including `ts` and `action`; T2/T4 must
  handle that, not assume presence.
- Nav placement (HTML 270) and boot sequence (7510-7520) re-read: the audit
  link carries no `id` and no `style="display:none"` — confirms Q1 (no gate)
  matches the source exactly, not just the proposal's summary of it.
- Found on this pass, **not in the original proposal**: a nav-badge total
  (`loadAuditTotal`, 1057-1067) separate from the page's filtered count, and
  `loadAuditUsers` running eagerly at boot (7516), not on page mount. Added as
  **M4-16 / M4-17** — see proposal §5 note.
- Found separately: `web/src/App.tsx` currently has **no router and no real
  nav rail** — see T7 below.

## Tasks

| # | Task | Notes | Outcome |
|---|---|---|---|
| T0 | Merge the `M4-*` rows into the registry as Module E, all `NOT STARTED` | Before any code | Done — merged before T2 began |
| T1 | Re-confirm `audit_log` and `get_user_directory` are in the generated `types/database.ts` immediately before coding | Already done in pre-implementation re-verification above; re-check only if time has passed | Confirmed already current, no regeneration needed |
| T2 | `api/auditLog.api.ts` — filter→query mapping, `count:'exact'`, `range()`, `ts` desc. Failure returns a classified error, never throws. Handles null `ts`/`action`/etc. from the nullable schema | M4-02…M4-09, M4-12, M4-14 | Done — 14 tests |
| T3 | `api/userDirectory.api.ts` — `get_user_directory()`, id→email map, failure flagged not thrown | M4-10, M4-11 | Done — 6 tests |
| T3a | `api/auditTotal.api.ts` — the separate unfiltered `count-only head` query | M4-16 | Done — 5 tests |
| T4 | `lib/auditSummary.ts` — the DELETE/INSERT/UPDATE summary rules, pure and independently testable, tolerant of null fields | M4-14 | Done — 15 tests |
| T5 | `store/auditLog.store.ts` — filters, page, rows, total, error, directory warning. **Request sequencing so a stale reply is discarded** | M4-13 | Done — 8 tests, incl. the stale-response guard verified to fail when removed |
| T6 | `pages/AuditLogPage.tsx` — filter bar, table, pager, print, disabled Excel button | M4-01, M4-03…M4-08, M4-15 | Done — 21 tests |
| T7 | **Minimal nav switch in `App.tsx`** between «Soraqçalar» and «Audit jurnalı» — the app has neither a router nor a clickable nav today (see re-verification above). Boot-time loads (badge total, user directory) attach at `status === 'ready'`, mirroring the original's boot sequence rather than page mount | M4-01, M4-16, M4-17 | Done — 5 new tests in `App.test.tsx`; a non-admin now defaults to Audit jurnalı, the one page it can reach |
| T8 | Tests for T2-T6, incl. the stale-response case verified to fail without its guard, and null-field handling in T2/T4 | §6 of the proposal | Done — covered task-by-task above |
| T9 | Registry evidence, plan progress, handoff | — | Done — this update |
| T10 | Read-only live browser comparison against the original | Codex's step | **Outstanding** — not performed in this session |

## Sequencing note

T4 and T2 are independent and can be written in either order. T3a is
independent of T2/T3. T5 depends on T2/T3/T3a. T6 depends on T5. T7 depends on
T6 (needs a page to switch to) but is otherwise independent of Module D, so
this plan is not blocked by Module D's outstanding live-mutation pass.

## Definition of done for this phase

- `M4-01…M4-18d` `CODE VERIFIED` with named test evidence. **Done** — see the
  registry Module E table.
- Read-only live comparison passed (achievable here — no writes exist).
  **NOT done — waived by the user at acceptance.** Both platforms held zero
  `audit_log` rows, so only the empty state could be compared.
- **This module reached `ACCEPTED`** on the user's explicit decision rather
  than on that comparison. It has no mutation surface, which is why the
  remaining gap is a display-parity gap only.

## Acceptance — 2026-09-03

**The user explicitly accepted Phase 4 / Module E without performing the live
comparison.**

**Automated verification passed:** 450 tests in 30 files, `typecheck`, `lint`
(oxlint) and `build` clean, `git diff --check` clean.

**Accepted exception — carried forward, not closed.** Both the old and the new
platform currently show **zero `audit_log` rows**, so these were never
compared against live data:

- non-empty row rendering;
- actor / action / object detail resolution;
- filtered counts and the nav-badge total against a real unfiltered count;
- multi-page navigation.

**Standing reminder:** run this comparison once `audit_log` holds records, and
only then promote the affected registry rows to `LIVE VERIFIED`. Acceptance
deferred the check; it did not discharge it.

**Also carried forward:** printed output has never been seen in a real print
preview (`M4-18b`/`M4-18d` rest on DOM structure, CSS presence and call
ordering); the sync indicator shows «bağlı deyil» on this page and awaits a
shell-scope review (**no `audit_log` subscription — Q3 forbids it**); the
deferred visual backlog V-01…V-03 stands; no performance check against a
large `audit_log`.

## Result at implementation completion (2026-09-02)

**432 tests passing in 30 files** (was 358/24 before this phase — 74 new
tests across 6 new files plus `App.test.tsx`), `typecheck`, `lint` (oxlint)
and `build` clean, `git diff --check` clean. No Supabase, SQL, root
`index.html`, GitHub remote or Vercel change. `VITE_ALLOW_LOCAL_WRITES` was
never set — this module has no write path to guard, and the guard itself was
not touched.

One correction made mid-implementation, worth recording: the permission-error
classifier test originally asserted that "row-level security" (spelled out)
would be classified as a permission error. Running it against the real
classifier showed that is false — the regex matches the literal substring
"rls", not the general concept. The test was corrected to pin the actual
regex, including an explicit negative case, rather than an idealised one.
