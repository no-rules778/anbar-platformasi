# Phase 18 design handoff audit — self-review before implementation

Date: 2026-09-12 · Auditor: Claude (self-review) · Verdict: **proceed with the
offline slice; 14 rows held at BLOCKED**

> **HISTORY — figures below are AS-DESIGNED, superseded 2026-09-12.** This is the
> pre-implementation review; its 28 / 14 / 42 tally predates both the independent
> Codex audit (which promoted five rows to LIVE VERIFIED) and the owner decisions
> (which settled three rows and transferred ten). Current authoritative tally:
> **24 CODE VERIFIED / 5 LIVE VERIFIED / 3 ACCEPTED / 10 BLOCKED / 42 unique** —
> see the [ledger](../specs/2026-09-12-phase18-registry-rows.md) and the
> [decision](../decisions/2026-09-12-phase18-shell-acceptance-scope.md). The
> reasoning in this document is retained unchanged as the design record.

This is a self-audit, not an independent one. Independent Codex review remains
authoritative for acceptance.

## 1. Is the scope the roadmap's Phase 18?

The roadmap defines Phase 18 as cross-module navigation, roles, exports,
realtime, visual differences, legacy retirement and production release
preparation, and rules that it "cannot accept deferred visual parity,
cross-screen role behaviour or legacy retirement by implication."

The design covers all of those, but converts most into `BLOCKED` rows rather
than claimed ones. That is the honest reading of the rule: the roadmap forbids
accepting them *by implication*, and an explicit `BLOCKED` row with a named
blocking decision is the opposite of an implication. Fourteen of forty-two rows
are BLOCKED at design time, and every one names what it needs. (HISTORY: ten
remain BLOCKED after the audit and the owner decisions.)

**Risk accepted:** a reader who skims the tally could read the CODE VERIFIED
figure as "Phase 18 is two-thirds done". The ledger's evidence-ceiling banner
exists to prevent that, and the phase status was NOT ACCEPTED regardless at the
time of this review.

## 2. Did the design find real defects, or manufacture work?

Each of the eight defects was found by reading legacy source against React
source, and each cites both sides. Three checks were applied:

1. **Is the legacy behaviour real?** Every defect cites an `index.html` line
   that was read, not remembered.
2. **Is the React absence real?** Confirmed by grep over `web/src`, not by
   assumption.
3. **Would a user notice?** D1 (rail order), D3 (no mobile layout), D4
   (scroll), D5 (card reappears), D6 (missing chip), D7 (missing header), D8
   (false notice) are all user-visible. D2 (badges) is user-visible but its
   derived half is not implementable without an architectural regression.

**One near-miss is recorded.** The first reading of the module inventory
treated the absent «Kontragentlər» rail entry as a missing *page*. Checking
`lib/reports.ts` showed its content is migrated as the `knt` report,
column-for-column. Had that not been checked, Phase 18 would have "migrated" a
duplicate screen and called it parity. The row became a decision (D-P1), not a
repair.

**A second correction is recorded.** The first draft of `navCounters.api.ts`
counted a `locations` table. Reading `index.html:933-935` showed no such table
exists: `DB.whs` and `DB.locs` both derive from `warehouses`. The typed
Supabase schema caught it at `tsc`, but the fix came from the legacy source,
not from silencing the type error.

## 3. Is any row over-scoped for its evidence?

Reviewed every `CODE VERIFIED` row against what its cited test actually
executes:

- **M18-42 (role visibility)** is the highest-risk row. It is worded as a
  client affordance and its status text says so explicitly. A reader must not
  take it as role enforcement; M18-43 carries that and is BLOCKED.
- **M18-40 (realtime wiring)** claims only that every page calls the hook.
  Whether an event arrives is M18-41, BLOCKED.
- **M18-44 (export entry points)** claims entry points and delegation, not
  workbook correctness; that is M18-45, BLOCKED.
- **M18-54 (visual sweep)** is worded as a *source-comparison* sweep and
  explicitly defers rendered comparison to M18-55.
- **M18-30 (responsive)** is the row most likely to be over-read. It is proved
  in two layers and still leaves M18-34 BLOCKED for real-viewport rendering.

No row was found claiming more than its evidence. The pattern throughout is a
CODE VERIFIED client row paired with a BLOCKED server/live row.

## 4. Is M18-22 (not porting `closeOverlays`) a disguised omission?

This deserved the most scrutiny, because "we decided not to" is how genuine
gaps get buried.

The reasoning: legacy overlays were singleton DOM nodes (`#modal`, `#drawer`,
`#mask`) living outside the page, so nothing destroyed them on navigation and
`go()` had to. React dialogs are children of their page and unmount with it.

The falsifiable part is the claim "React dialog state does not outlive the
page". That claim is **false in general** — which is exactly how M18-21 was
found: `cardCode` lives in a Zustand store and does outlive the page. So the
investigation did not conclude "React cleans up, nothing to do"; it
distinguished component-local state (dies) from store state (does not), ported
the one that needed porting, and documented why the other did not.

**Accepted as a reasoned exclusion, not an omission.** A residual risk remains:
if any other page later moves dialog state into a store, it will need the same
treatment. That is noted here rather than in the source, where it would be
speculative.

## 5. Does the design preserve accepted Phase 1–17 behaviour?

- No accepted contract was reopened. M18-01 executes a move Phase 12 explicitly
  deferred to Phase 18, citing its own comment.
- The per-page snapshot architecture is preserved; M18-15 is BLOCKED
  specifically to avoid reintroducing the global cache the migration removed.
- No page component was rewritten. The only page edit is a one-line header.
- Phase 17's transferred rows are named and excluded in the ledger banner.

## 6. Pre-implementation risks

| Risk | Mitigation |
|---|---|
| Routing every switch through `go()` could break a handoff that depends on ordering | The «Malı redaktə et» ordering trap was identified *before* implementation and given its own row (M18-23) and test |
| Adding badges changes rail label text, breaking exhaustive fixtures | Expected; classified as test-expectation defects and updated with reasons, not deleted |
| A count query could be expensive | `head:true` fetches no rows; three parallel counts at boot, beside the audit total that already runs |
| The new count API could leak across roles | It cannot bypass RLS — the server applies it. But nothing here *verifies* the per-role result, which is why no row claims it |
