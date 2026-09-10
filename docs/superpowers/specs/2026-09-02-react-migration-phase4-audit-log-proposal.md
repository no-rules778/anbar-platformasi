# Phase 4 proposal — Audit jurnalı (audit log)

**Status: APPROVED 2026-09-02.** Q1-Q5 answered by the user (§4). Implementation
may begin per the plan
([`2026-09-02-react-migration-phase4-audit-log.md`](../plans/2026-09-02-react-migration-phase4-audit-log.md)).

Behavioural reference: the production platform, `origin/main:index.html`
lines 7056-7175 (`rLog`, `auditFetch`, `logFilters`, `auditSummary`),
1020-1035 (`loadAuditUsers`), and 1057-1067 (`loadAuditTotal` — the nav-badge
total, §3.12, added on pre-implementation re-verification).

**Supabase contract, confirmed against `web/src/types/database.ts`:**

- `audit_log` (table) — columns `id`, `ts`, `user_id`, `table_name`, `action`,
  `record_id`, `old_values`, `new_values`, `reason`. **Every one of these is
  nullable** in the generated `Row` type (including `ts` and `action`) — the
  API layer and `auditSummary` must not assume a value is present.
- `get_user_directory()` (RPC) — `Args: never`, `Returns: { id: string; email:
  string }[]`. No pagination; returns the full directory in one call, matching
  `loadAuditUsers`'s single unpaginated `await`.

Both were re-confirmed present in the generated types immediately before this
implementation began (2026-09-02); no regeneration needed.

## 1. Why this module next

Remaining scope (registry «Modules not yet migrated»): Dashboard; Yeni
əməliyyat; Mal hərəkəti; Anbar qalıqları; stock layers and Silinmə;
nomenclature and item requests; group operations; documents/cancellation/
correction; Excel import/export; reports; finance; Azpetrol/Araz; audit log;
users administration.

Audit jurnalı is proposed for these reasons:

- **It is read-only by construction.** The original renders it from a plain
  `select` and *deliberately disables* its Excel export (`#log-exp`, commented
  at 7168). There is no create, update, hide or delete path to build — so the
  module can be taken to full acceptance while live mutations remain untested,
  which is exactly the gap Module D is currently blocked on.
- **It is self-contained.** One table (`audit_log`), one helper RPC
  (`get_user_directory`). It does not depend on stock layers, documents or
  pricing, so it cannot be invalidated by later modules.
- **It buys infrastructure the heavy modules need.** Server-side filtering,
  server-side pagination with an exact count, and stale-response discarding are
  all introduced here at low risk, then reused by Mal hərəkəti and Anbar
  qalıqları, which are far larger and carry real money.
- **It is small.** Roughly one API module, one store, one page, ~5 components'
  worth of table markup already present in the design system.

**Alternative considered:** Mal hərəkəti (movements) is the higher-value
screen, but it is also the largest, is a write surface, and depends on
cancellation/correction semantics that have their own approved decisions. Doing
audit first keeps the risky work behind a proven pagination/filter layer.

## 2. Scope

**In scope**

- The `Audit jurnalı` page: filter bar, table, pager, print button.
- Reading `audit_log` with every filter applied **server-side**, so the count
  always agrees with the rows shown (the original states this explicitly at
  7056-7060).
- Actor resolution through `get_user_directory()`, with its failure surfaced.
- The five filters: object/table, action, actor, date-from, date-to, plus reset.
- The row summary derived from `old_values`/`new_values`.

**Explicitly out of scope**

- **Excel export stays disabled.** The original disables it on purpose and says
  so; enabling it in React would be a parity break and a data-exposure change.
- No new tables, triggers, RPCs or schema changes. No SQL is written.
- No writes of any kind — this module has none.

## 3. Behaviour to preserve exactly

Drawn from the original; each becomes a checklist row in §5.

1. **Server-side filtering.** Every filter is a PostgREST clause, never a
   client-side array filter. The `count: 'exact'` total must describe the
   filtered set.
2. **Fixed page size of 50**, with `range()` paging and a `← Əvvəlki /
   Növbəti →` pager whose buttons disable at the ends.
3. **Sort: `ts` descending.**
4. **Actor display never invents a name.** `get_user_directory()` returns
   `id` + `email` only; `users.name` is deliberately not used. A null
   `user_id` renders `Sistem/naməlum`; an unknown id renders the raw id.
5. **A failed user-directory read is not fatal.** The page still renders, with
   a visible warning that users are shown by id (`UMAIL_ERR` at 7147).
6. **Permission errors read differently from load errors.** The original
   pattern-matches `permission|denied|rls|401|403` and shows «İcazə yoxdur»
   rather than «Yükləmə xətası» (7145).
7. **Stale responses are discarded.** `LOG_REQ` is incremented per request and
   a late reply for a superseded filter set is dropped (7143). Without this,
   fast filter changes render the wrong page.
8. **Row summaries** follow `auditSummary`: DELETE lists up to 3 old keys,
   INSERT up to 4 new keys, UPDATE lists up to 6 *changed* keys compared by
   `JSON.stringify`. Values truncate at 40 chars; objects stringify then
   truncate. A malformed row must not break the table.
9. **Table and action labels** are the original's Azerbaijani maps verbatim,
   including `reference_values → 'Soraqça dəyəri'` and
   `warehouses → 'Anbar / ünvan'`.
10. **Action tag colours**: DELETE `t-rm`, UPDATE `t-out`, INSERT `t-in`.
11. **Excel button present but disabled**, carrying the original's `title`.
12. **Nav-badge total is a SEPARATE, unfiltered count.** `loadAuditTotal()`
    (1057-1067) runs `select('id', { count: 'exact', head: true })` with no
    filters, once, at boot — not when the audit page is opened, and not
    per-filter. It renders in the nav badge as `…` while loading, `!` on
    error, else the formatted count (1528). This is **distinct** from the
    on-page filtered `res.total` shown in `#log-count`. Missing this would
    silently drop the nav badge, which is present at every screen, not only
    on the audit page. **Added M4-16.**
13. **`loadAuditUsers()` runs eagerly at boot** (7516), immediately after
    `loadFromDB()` and before `loadUsersAdmin()` — not lazily on first opening
    the audit page. The directory is therefore already warm by the time a user
    navigates there. **Added M4-17.**

## 4. Decisions (approved 2026-09-02)

| # | Question | Decision |
|---|---|---|
| Q1 | The original has **no role gate** on this nav entry — visibility is left to RLS. Should React add an `isAdmin()` gate? | **No UI role gate. Preserve the original behavior.** |
| Q2 | Excel export: keep disabled? | **Yes, keep disabled**, with the original's tooltip. |
| Q3 | Realtime: should the audit page subscribe to `audit_log`? | **No Realtime subscription.** |
| Q4 | `record_id` is shown under the object name in a `.code` span. Keep? | **Yes**, keep `record_id` under the object name exactly as in the original. |
| Q5 | Date filters use `T00:00:00`/`T23:59:59` string concatenation against a `ts` column. Preserve exactly, including any timezone behaviour? | **Yes, preserve exactly**, including timezone behaviour. Any correction is a separate approved product change, not part of this migration. |

## 5. Parity checklist (draft rows `M4-01…M4-17`)

To be merged into the registry as a new Module E **on approval**, before code.
17 rows, all `NOT STARTED` at merge time.

| # | Function | Old ref | Roles |
|---|---|---|---|
| M4-01 | Page lists audit rows: time, actor, action, object, detail, reason | 7150-7160 | per RLS (Q1) |
| M4-02 | All five filters applied **server-side**; count agrees with rows | 7122-7133 | — |
| M4-03 | Object filter over the four known tables, plus «Bütün obyektlər» | 7061-7067, 7082 | — |
| M4-04 | Action filter INSERT/UPDATE/DELETE, plus «Bütün əməliyyatlar» | 7068, 7083 | — |
| M4-05 | Actor filter incl. «Sistem/naməlum» → `is('user_id', null)` | 7084, 7126 | — |
| M4-06 | Date range filters, preserving the original's boundary strings and timezone behaviour exactly (Q5) | 7128-7129 | — |
| M4-07 | «Sıfırla» clears every filter and returns to page 0 | 7092 | — |
| M4-08 | Page size 50, `range()` paging, ends disable the pager buttons | 7069, 7130, 7162-7166 | — |
| M4-09 | Sort `ts` descending | 7130 | — |
| M4-10 | Actor resolution via `get_user_directory()`; never `users.name`; null → «Sistem/naməlum»; unknown id → raw id | 1020-1035, 7074-7077 | — |
| M4-11 | Failed user directory: page still renders, warning shown, ids displayed | 7147 | — |
| M4-12 | Permission errors distinguished from load errors | 7145 | — |
| M4-13 | Stale-response discarding across rapid filter changes | 7136-7143 | — |
| M4-14 | Row summaries: DELETE/INSERT/UPDATE key limits, 40-char truncation, malformed rows tolerated. **All source columns are nullable in the DB** — a null `action`, `ts`, `old_values` or `new_values` must render, not throw | 7099-7118, `database.ts` `audit_log.Row` | — |
| M4-15 | Excel export present but disabled, tooltip preserved (Q2) | 7168, HTML 442 | — |
| M4-16 | Nav-badge total (`#c-log`) is a **separate unfiltered** `count-only head` query, loaded once at boot, independent of the page's own filtered count; renders `…` while loading, `!` on error, else the formatted total | 1057-1067, 1528 | — |
| M4-17 | User directory (`UMAIL`) is loaded **eagerly at boot** (`loadAuditUsers`), not lazily when the audit page opens | 7516 | — |

### M4-16/M4-17 — a scope note found on re-verification

`App.tsx` (`web/src/App.tsx:144-157`) currently has **no router and no real
nav rail**: it renders `<ReferenceDirectoryPage>` directly inside a hardcoded
`<nav>` whose only entry is a static, non-clickable «Soraqçalar» label, with a
note that "other sections are in the old platform"
(`Digər bölmələr köhnə platformadadır`). There is no second page slot, no
route switch, and nowhere yet for a boot-time nav badge to live.

Porting M4-16 (badge) and M4-17 (eager directory load) *literally* therefore
requires first deciding how the shell grows: a minimal internal router/tab
switch between «Soraqçalar» and «Audit jurnalı», and where boot-time loads
(`loadAuditTotal`, `loadAuditUsers`) attach now that there is more than one
page. That is a small, self-contained addition, not a redesign — but it is
shell scope, not audit-log scope, and is called out here rather than decided
silently mid-implementation.

**Proposed handling (needs a decision before T6-T7, not before T0):** add the
minimal nav switch as part of this phase (it is required for the page to be
reachable at all), keep it in the same "only migrated entries are real links"
style the existing nav already uses, and load the badge total + user
directory in `App.tsx` once at `status === 'ready'`, mirroring the original's
boot sequence (7513-7516) rather than the page's own mount. This is *not* a
new open question requiring the user to re-approve Q1-Q5 — it is an
implementation detail of already-approved scope — but is flagged here in case
the user wants to weigh in before T6.

## 6. Verification plan

- **Unit**: filter→query mapping (each filter alone and combined), pagination
  maths, `auditSummary` across DELETE/INSERT/UPDATE/malformed, actor
  resolution including both failure modes, error classification.
- **Stale-response test**: two overlapping requests, the older resolving last,
  asserting the newer result survives — verified to fail without the guard.
- **Store/page**: rendering, empty state, pager disabling, warning banner.
- **Live**: read-only browser comparison against the original on the same
  filters — this module can reach that bar because it has no writes.
- Full `test`/`typecheck`/`lint`/`build`, and `git diff --check`.

## 7. Constraints

Unchanged from Phase 3: no Supabase, SQL, root `index.html`, GitHub remote or
Vercel changes; `VITE_ALLOW_LOCAL_WRITES` stays unset (this module has no
writes to guard, but the guard is not touched); no new dependencies without
approval; registry rows merged before implementation.
