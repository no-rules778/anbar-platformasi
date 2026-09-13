# Phase 18 — whole-platform final parity and cutover readiness (proposal)

Date: 2026-09-12 · Status: **ACCEPTED** for the implemented shell / read-only
scope (owner decision, 2026-09-12, after the independent Codex audit).
[Decision](../decisions/2026-09-12-phase18-shell-acceptance-scope.md) ·
[Codex audit](../audits/2026-09-12-phase18-final-codex-audit.md).

> **OWNER DECISIONS APPLIED — 2026-09-12 (latest).** D-P1 ACCEPTED (no duplicate
> «Kontragentlər» rail page; the `knt` report stays the single surface, and the
> now-consumerless `c-knt` fetch was removed). D-P4 ACCEPTED (`c-mov`, `c-bal`,
> `c-ctrl` intentionally omitted). D-P3 PARTIALLY COMPLETE (Codex's TEST
> admin/anbardar read-only responsive rehearsal promoted M18-01, M18-02, M18-30,
> M18-31, M18-34; the rest moved to the
> [authority package](../plans/2026-09-12-phase18-authority-verification-package.md)).
> D-P2 DEFERRED (cutover, retirement, rollback and deployment moved to the
> [cutover package](../plans/2026-09-12-phase18-cutover-package.md)). The 10
> transferred contracts retain BLOCKED; none was promoted by the transfer.

Phase 17 is ACCEPTED in the owner-approved read/pure scope
([decision](../decisions/2026-09-12-phase17-read-pure-acceptance-scope.md)).
Phase 18 is the final integration phase. It does **not** reopen any accepted
Phase 1–17 contract and does not absorb the transferred Phase 17 authority
package (M17-17…M17-21, M17-28, M17-80…M17-89, M17-100), which remains owned by
[its own plan](../plans/2026-09-12-phase17-authority-verification-package.md).

## 1. What Phase 18 is, and what it is not

The roadmap defines Phase 18 as "cross-module navigation, roles, exports,
realtime, visual differences, legacy retirement decision and production release
preparation", and rules that it "cannot accept deferred visual parity,
cross-screen role behaviour or legacy retirement by implication. It is a final
integration phase, not a documentation cleanup."

Phase 18 therefore treats the **application shell** as its primary subject.
Phases 1–17 each migrated a page; nobody owned the frame those pages hang in.
The defects this phase found are concentrated exactly there, which is the
expected failure mode of a page-by-page migration and the reason the roadmap
reserved a final phase for it.

Phase 18 is **not** a re-verification of the migrated pages. Their contracts are
accepted and their tests pass; re-asserting them would be a vacuous pass.

## 2. Module inventory — is the migration complete?

All 17 legacy top-level sections were enumerated from `index.html` (rail markup,
lines 250-271; the `render()` dispatch table, line 1517):

`dash`, `op`, `mov`, `bal`, `nom`, `nreq`, `grp`, `knt`, `anb`, `refs`, `sm`,
`rep`, `fin`, `ctrl`, `log`, `set`, `azp`.

React routes 16 of them through `App.tsx`'s `MigratedPage` union. The
seventeenth, `knt` («Kontragentlər»), has **no** React rail entry.

**This is not automatically a defect, and Phase 18 must not report it as one.**
Legacy `rKnt()` (index.html:2883-2897) renders a partner turnover table whose
substance is migrated as the `knt` variant of Hesabatlar
(`lib/reports.ts:59-89`, `ReportsPage.tsx:225-248`), column-for-column. What is
genuinely missing is the **rail entry**, i.e. a navigation affordance, plus its
two admin «Soraqçalarda idarə et» buttons. Whether that entry should exist in
React was an owner decision (D-P1), not a defect Claude could resolve by fiat:
re-adding a page that duplicates an existing report would itself be a parity
regression. The row was raised as a decision, and its status stayed honest.

**RESOLVED — D-P1 ACCEPTED, 2026-09-12.** No rail entry is created; the `knt`
report is the single migrated surface (M18-51, M18-52, M18-53). A code
consequence followed: `c-knt` is no longer fetched at boot, because with the
entry permanently declined the count has no possible consumer (M18-14).

## 3. Defects found by inspection

Each was found by reading legacy source against React source. Each is a
**client-side, offline-provable** claim: none asserts anything about SQL
policies, grants, function bodies or server refusals.

| # | Defect | Legacy evidence | React evidence | Class |
|---|---|---|---|---|
| D1 | «Nomenklatura sorğuları» is misplaced in the rail. Legacy: 2nd entry of «Bazalar», directly under Nomenklatura. React: 5th, after Soraqçalar. | index.html:257 | App.tsx rail order | source |
| D2 | Five counter badges are missing. Legacy `counters()` fills `c-mov`, `c-bal`, `c-nom`, `c-knt`, `c-anb`, `c-log`, `c-ctrl`. React renders a badge on «Audit jurnalı» only. | index.html:1521-1531 | App.tsx | source |
| D3 | No responsive layout. Legacy has `@media (max-width:900px)` collapsing the rail to a fixed off-canvas drawer plus a `#burger` toggle. React's `index.css` has no max-width media query and no burger at all — the rail cannot be dismissed below 900px. | index.html:204-211, 240, 1514 | index.css | source |
| D4 | Page switches do not reset scroll. Legacy `go()` ends with `window.scrollTo(0,0)`. React's `setPage` calls do not. | index.html:1511 | App.tsx | source |
| D5 | Page switches do not close open overlays. Legacy `go()` calls `closeOverlays()` and clears `CARD_CODE`. React leaves a page's dialog/card state to that page. | index.html:1351-1354, 1509-1510 | App.tsx | source |
| D6 | The topbar presence chip is missing. Legacy `renderPresence()` renders an initials chip for the signed-in user. | index.html:1191-1194, 243 | App.tsx topbar | source |
| D7 | The `knt` report's «Tam siyahı» card header is missing. Legacy wraps the full-list table in `<header><h3>Tam siyahı</h3></header>`; React renders the bare table. | index.html:6749 | ReportsPage.tsx:231 | source |
| D8 | The «Miqrasiya» rail notice claims "Digər bölmələr köhnə platformadadır" ("other sections are on the old platform"). With 16 of 17 sections migrated this is stale and, at cutover, actively misleading. | — | App.tsx | source |

D5 requires care. It is **not** self-evidently a defect: React pages own their
own dialog state and unmount on page switch, which may already close overlays
structurally. Phase 18 must establish by test whether any overlay survives a
page switch before changing anything — otherwise the "fix" is a wrong-reason
change. This is recorded as an investigation row, not a repair row.

## 4. Scope

**In scope** (client-side, offline-provable, no new authority):

- rail order, grouping, role gating and counter badges;
- responsive layout and the off-canvas rail;
- cross-page navigation side effects (scroll, overlays);
- topbar parity;
- visual parity defects found by source comparison;
- module inventory and migration-completeness accounting;
- the cutover/legacy-retirement readiness *assessment*.

**Explicitly out of scope** (requires authority Phase 18 does not have):

- any Supabase mutation, fixture, import or delete;
- any production contact;
- executing the legacy retirement or any deployment;
- the transferred Phase 17 authority package;
- promoting any row to LIVE VERIFIED without an executed live leg.

## 5. Owner decisions

| Id | Decision | Why Claude must not decide it | Blocks |
|---|---|---|---|
| D-P1 | Should «Kontragentlər» regain a rail entry, given its content is migrated as the `knt` report? | **RESOLVED 2026-09-12 — ACCEPTED: no.** The `knt` report stays the single surface. | M18-52, M18-53, M18-14 |
| D-P2 | Is the legacy `index.html` retired at cutover, and on what date? | **DEFERRED 2026-09-12** — irreversible, production-affecting; moved to the cutover package. | M18-60…M18-63 |
| D-P3 | Authorise a live cross-role cutover rehearsal on TEST (admin + anbardar + rehber, read-only)? | **PARTIALLY COMPLETE 2026-09-12** — admin/anbardar leg done by Codex; rehber and the server-side legs moved to the authority package. | M18-41, M18-43, M18-45, M18-46, M18-55, M18-57 |
| D-P4 | Accept that `c-mov`, `c-bal` and `c-ctrl` stay unimplemented rather than reintroduce a whole-platform boot load? | **RESOLVED 2026-09-12 — ACCEPTED: yes, intentionally omitted.** | M18-15 |

All four decisions are now resolved or formally deferred; none remains open.
The 2026-09-12 acceptance covers the implemented shell / read-only scope only.

## 6. Evidence ceiling

Phase 18 rows are provable by source inspection and offline tests in the
jsdom harness. A rendered rail proves the *client's* affordance and nothing
else: it is never evidence of a server policy, an RLS decision or a grant. No
Phase 18 row may reach LIVE VERIFIED without an executed live leg, and the
role-visibility rows in particular remain client-affordance rows regardless of
how convincingly the UI renders.

**UPDATE — 2026-09-12.** Five presentation rows DID reach `LIVE VERIFIED`
through Codex's executed TEST admin/anbardar read-only rehearsal: M18-01,
M18-02, M18-30, M18-31 and M18-34. That satisfies the rule above rather than
excusing it — an actual live leg was run. It promoted nothing else: per the
audit, the UI badge values do not prove `head:true`, admin and anbardar cannot
discriminate `azpCanRead` from `isAdmin` (both pass both), and no rehber session
was run. Server enforcement, realtime delivery, export parity, cross-module
consistency and stale-session behaviour remain BLOCKED in the
[authority package](../plans/2026-09-12-phase18-authority-verification-package.md).

Authoritative row statuses live in
[the M18 ledger](./2026-09-12-phase18-registry-rows.md), which is the single
source of truth for Phase 18 figures.
