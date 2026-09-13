# M18-63 — post-cutover rollback plan

Date: 2026-09-13 · Status: **DRAFT — NOT YET AGREED BY THE OWNER**

This plan satisfies the M18-63 contract from the
[cutover package](./2026-09-12-phase18-cutover-package.md): *a post-cutover
rollback plan is written and agreed BEFORE M18-60 (legacy retirement) or M18-62
(production deployment) is considered.*

Writing it promotes nothing. M18-63 moves from `BLOCKED` only when the owner
explicitly agrees to this document; M18-60, M18-61 and M18-62 remain `BLOCKED`
regardless, each needing its own authority.

## What makes rollback possible here

Four measured facts, each verified on 2026-09-13 against the working tree at
commit `2749243`. They are stated first because the whole plan depends on them —
if any one stops holding, the plan must be revised before cutover.

| # | Fact | How it was measured | Why it matters |
|---|---|---|---|
| F1 | Legacy `index.html` (603,999 bytes) is intact on `main` and the React branch does not modify it | `git diff origin/main react-migration -- index.html` → 1 line changed, and that line is a `manage_reference` RPC argument fix unrelated to the migration | The rollback target still exists and is not a reconstruction |
| F2 | The React app lives entirely under `web/`; every other migration file is an addition | `git diff --shortstat origin/main react-migration` → 701 files, 157,614 insertions, **1 deletion** | Reverting the frontend cannot damage legacy code |
| F3 | Legacy and React read the SAME production database | `index.html` hardcodes `bbjmhaerssakbreykxiw.supabase.co`; `web/.env` sets the identical `VITE_SUPABASE_URL` | Rollback is frontend-only. No data migration, no dual-write, no reconciliation |
| F4 | No deployment configuration is committed | `git ls-files` matches no `vercel.json`, no `.github/workflows`, no Dockerfile | Deployment is driven by Vercel's GitHub integration, configured in Vercel's dashboard — so rollback is a Vercel/Git operation, not a config edit |

**F3 is the load-bearing fact.** Both frontends are clients of one unchanged
Postgres schema. Rolling the frontend back does not roll any data back, because
the migration never forked the data. This is what makes a fast rollback
credible.

## What rollback does NOT undo

Stated plainly, because a rollback plan that overclaims is worse than none.

1. **Data written while React was live stays written.** Every movement,
   document, write-off and audit row created through the new UI persists after
   rollback. Legacy will read them, because it is the same database.
2. **Applied SQL migrations stay applied.** 37 files exist under `sql/`. Nothing
   in this plan reverts a migration, and none should be reverted as part of a
   frontend rollback — legacy depends on the same schema.
3. **Consumed sequences and audit history are permanent.** Document numbers and
   `audit_log` rows are never returned.
4. **Sessions may need re-login.** The two frontends do not share a session
   store; users active at the moment of rollback may be asked to sign in again.

Therefore: rollback restores the **interface**, not the **state**. Anyone
approving cutover must accept that data created in the new UI is kept.

## Preconditions — all must hold BEFORE cutover

Cutover must not proceed while any of these is open.

- [ ] **M18-43** server-side role enforcement is LIVE VERIFIED (RLS, grants,
      function refusals observed refusing). Retiring legacy while enforcement is
      unproved removes the fallback before the replacement is proved.
- [ ] **M18-45** export parity verified against the approved Excel
      specification.
- [ ] This document is explicitly agreed by the owner (that is M18-63 itself).
- [ ] A named rollback decision-maker and a reachable contact channel.
- [ ] The exact production commit SHA that is live before cutover is recorded
      below, in writing, at cutover time.
- [ ] A full production database backup taken immediately before cutover, and
      its restorability confirmed — not merely that the job reported success.

```
Pre-cutover live commit SHA: ______________________   (fill in at cutover)
Backup id / timestamp:       ______________________
Rollback decision-maker:     ______________________
```

## Rollback triggers

Roll back immediately, without further debate, on any of these:

| Trigger | Why it is non-negotiable |
|---|---|
| Any write produces wrong stock quantities or balances | Corrupts the record the warehouse depends on |
| A role sees data it must not see, or can act beyond its role | Security boundary failure |
| An export disagrees with the approved specification on real data | Downstream accounting consumes these files |
| Posting/write-off/transfer fails for more than one user | Core operation unavailable |
| Any data-loss symptom, even unconfirmed | Investigate from a known-good state, never from a live suspect one |

Judgement-call (decision-maker decides, with a time limit): cosmetic defects,
a single user's issue, slow but correct pages.

**Rule: when unsure, roll back.** Rollback is cheap here (F1–F3); a corrupted
warehouse record is not.

## Rollback procedure

The mechanism depends on how cutover was performed, which is an M18-61 decision
not yet taken. Both variants below are frontend-only and neither touches the
database.

**Variant A — cutover replaced the site's production deployment.**

1. Open the Vercel project's Deployments list.
2. Find the last deployment whose commit is the recorded pre-cutover SHA.
3. Use Vercel's "Promote to Production" / instant rollback on that deployment.
4. Confirm the production URL serves legacy: the page must load
   `cdn.jsdelivr.net/npm/@supabase/supabase-js` and show the legacy layout.

This is the fastest path and requires no Git operation.

**Variant B — cutover merged the React branch into `main`.**

1. `git revert` the merge commit on `main` (never `reset --hard`, never a
   force-push — the history must retain both the cutover and its reversal).
2. Push the revert; let Vercel's GitHub integration redeploy.
3. Confirm as in A.4.

**In both variants:**

- Do not delete or rewrite the React branch. Rollback is a pause, not a
  cancellation.
- Do not revert any SQL migration.
- Record the wall-clock time of the decision and of the confirmed restoration.

## Post-rollback verification

Rollback is not complete until these are checked on production, in this order:

1. The legacy UI loads and a real user can sign in.
2. Balances for one known warehouse match what they were before cutover.
3. One read-only report opens and its totals are sane.
4. Data created during the React window is visible in legacy (expected per F3 —
   its absence would indicate a far more serious problem than the one that
   triggered rollback).
5. Only then: write the incident note — what failed, what was rolled back, what
   must be fixed before cutover is attempted again.

Do not attempt a second cutover on the same day as a rollback.

## Rehearsal requirement

This plan is unproven until it is rehearsed. M18-61 must include one rehearsal
on TEST (`alkjjbaawmsirsfvqljm`) that performs a deploy and then executes
Variant A or B end to end, measuring how long restoration actually takes. A
rollback plan that has never been executed is an assumption.

## Standing prohibitions

Unchanged from the cutover package, and not relaxed by this document:

- Production `bbjmhaerssakbreykxiw` must not be contacted until the owner
  explicitly approves a deployment window.
- No deployment, no push to `main`, no publish or overwrite of legacy
  `index.html`, no legacy layer deactivation.
- The legacy platform remains the operational system of record until M18-60 is
  approved and executed.
- Agreeing to this plan is NOT authority to deploy. It is a precondition for
  considering deployment.
