# Phase 17 live read-only closure — identity boundary and owner-input request

> **SUPERSEDED FOR CURRENT STATUS (Codex, 2026-09-12).** This report correctly
> records what its Claude session could not access, but its project-wide
> conclusion is no longer current. Codex used the owner-supplied process-only
> credentials from the active conversation and completed an admin/anbardar
> read-only browser window. See
> [the live audit](./2026-09-12-phase17-admin-anbardar-readonly-live-check.md).
> No password is copied here or there.

Date: 2026-09-12 · Scope: the attempted cheapest authenticated TEST read-only
window · Status: **NOT EXECUTED — blocked at the identity boundary**

## Verdict

The live read-only closure was **not performed**. No authenticated TEST
identity is available to this session. Nothing was executed, nothing was
promoted, and no evidence was fabricated or inferred.

Phase 17 remains **NOT ACCEPTED**. The tally is unchanged at
**93 CODE VERIFIED / 0 LIVE VERIFIED / 0 IN PROGRESS / 0 NOT STARTED /
17 BLOCKED / 110 unique**, derived by `node tools/ledger-check-m17.mjs`.

## The identity boundary, stated exactly once

Everything the window needs EXCEPT an identity is already in place:

| Prerequisite | State |
|---|---|
| TEST project target | `web/.env.sandbox.local` → `alkjjbaawmsirsfvqljm` ✔ |
| Write suppression | `VITE_ALLOW_LOCAL_WRITES=false` ✔ |
| TEST marker | `VITE_TEST_ENVIRONMENT=true` ✔ |
| Production isolation | the production ref `bbjmhaerssakbreykxiw` appears only in `web/.env`, which the sandbox mode does not load ✔ |
| Page under test | `AzpPage` + `fetchAzpSnapshot` shipped ✔ |
| Template asset + JSZip | published and declared (Codex delivery correction) ✔ |
| **An authenticated read-capable identity** | **ABSENT — this is the blocker** |

What was checked, and found absent:

- **No process-only credential.** The session environment carries no
  `ANBAR_*`, `SUPABASE_*`, `TEST_*`, `VITE_*` or `AZP_*` variable.
- **No saved authenticated browser session.** No `.auth/` directory, no
  `storageState*.json`, no `*.auth.json`, no persistent browser profile
  anywhere in the tree.
- **No live harness.** No `*harness*.mjs` survives; the Phase 9 T10 harness
  was deliberately kept outside the repository and is gone.
- **No Playwright.** Not installed under `web/node_modules`.
- **`.env*` files carry no user identity.** They hold a project URL and an
  anon/publishable key only. An anon key is not an identity: every `azp_*`
  RLS SELECT policy is gated on `azp_can_read()`, which reads `auth.uid()`,
  so an unauthenticated client is refused and would prove nothing about the
  contracts below. Reading a password out of a repository file is forbidden
  in any case (CLAUDE.md §6), and none is there to read.

The precedent confirms this is the normal boundary, not a regression: the
Phase 9 T10 window recorded that its identity's *"password lived only in
process memory"* and was supplied for that window. That memory is gone.

Two TEST identities are documented **by email address only** — no secret is
recorded anywhere, and none is requested to be written down:

- `anbar-anbardar-test@example.com` — the refused-role probe (role confirmed
  live as `anbardar` during Phase 9 T10)
- `anbar-admin-test@example.com` — a read-capable probe

## Minimal owner input required

One item. Nothing else is missing.

> **Provide, interactively and for one window only, the password for ONE of
> the two documented TEST identities above** — preferably BOTH, since the
> refused/allowed pair is what makes the evidence falsifiable.

Constraints that will be honoured, and that the owner should hold this session
to:

- The secret is used in process memory for the duration of the window only.
- It is **never** written into any repository file, audit, ledger, log,
  command output, screenshot or commit — this document deliberately contains
  no secret and no placeholder to fill in.
- Every session created is ended through the real logout flow.
- `VITE_ALLOW_LOCAL_WRITES=false` stays set; production
  `bbjmhaerssakbreykxiw` and every mutation RPC / REST write are hard-aborted
  at the network layer before the window opens.

## What that one input would buy — and what it would not

Stated in advance so the promotion cannot be stretched afterwards.

**Reachable by a read-only window (at most 4 of the 17 rows):**

| Row | Contract | What the window would have to observe |
|---|---|---|
| M17-28 | The authenticated page emits exactly the four `azp_*` reads and no ANBAR table read | The recorded `/rest/v1/` request list for each module: `azp_card_balances` (`module=eq.<m>`, ordered `sort_order` then `card_no`), `azp_movements` (`order=id.desc`, `limit=5000`), `azp_audit_log` (`order=at.desc`, `limit=300`), `azp_application_balances` (`select=current_balance`, single) — and the ABSENCE of `items`, `movements`, `partners`, `warehouses`, `audit_log` and of any `rpc/` POST |
| M17-20 | An anbardar identity is refused every azp read | The anbardar session opening the page and yielding **zero** azp rows across all four relations, with the refusal shape recorded |
| M17-21 | A rehber/muhasib identity reads (export affordance present) while every write RPC refuses | Only its READ half is reachable read-only; the write-refusal half needs a refused RPC call, which is a mutation attempt and is **out of scope for this window** |
| M17-18 | RLS grants SELECT only, to `authenticated`, gated on `azp_can_read()` | Only the OBSERVABLE half — an authenticated SELECT succeeds and an unauthorised one returns nothing. The catalog claim (which policies exist, on which roles) is NOT observable from the UI and must not be promoted from it |

**Not reachable, and not to be promoted from this window under any
circumstance:**

- **M17-17, M17-19** — `azp_user_role()`'s `SECURITY DEFINER` body and
  `sql/021`'s `REVOKE`/`GRANT` state are **catalog and function-body facts**.
  A page that renders correctly is consistent with them but is not evidence
  for them. Promoting these from UI behaviour is exactly the
  observation-is-not-causation error the protocol forbids.
- **M17-80…M17-89** — every write/import contract. Each requires an executed
  mutation and an owner decision (D-T1…D-T4). A read-only window touches none.
- **M17-100** — real egress. Explicitly excluded: no real data is to be
  exported, and a synthetic export proves nothing about it.

So the realistic ceiling for this window is **M17-28 and M17-20 fully, M17-21
and M17-18 in their observable halves only** — and only if the observations
actually come out that way. If a read returns something other than the
contract, the row is recorded as a live FINDING, not promoted.

## Additional owner input needed before those partial rows are useful

- **Which module(s) to open** — Azpetrol, Araz, or both. Row counts must be
  recorded **separately per module** and must come from the observed responses,
  never inferred from restore scripts or assumed empty.
- **Confirmation that the TEST `azp_*` tables are populated at all.** If TEST
  carries zero azp rows, an empty board is consistent with both "RLS refuses"
  and "there is nothing to show", and M17-20's refusal evidence loses its
  control. In that case the anbardar refusal must be paired with a
  read-capable identity seeing a NON-zero count on the same relation, or the
  row stays BLOCKED.

## Zero-production / zero-mutation proof for this session

No window was opened, so the strongest available statement is that nothing ran:

- No Supabase contact of any kind — TEST `alkjjbaawmsirsfvqljm` included.
- No production `bbjmhaerssakbreykxiw` contact.
- No dev server started, no browser launched, no REST request issued.
- No RPC, no mutation, no fixture, no import, no delete, no export of real
  data.
- No credential read from or written to any file, and none present in any
  command output.
- No stage, commit, push or deploy. The dirty tree is preserved.

## Ledger effect

**None.** No row was promoted, demoted or reworded on the basis of this
attempt. The 17 BLOCKED rows stay BLOCKED, for the reasons already recorded
against each. This document exists so the identity boundary is recorded once
and is not rediscovered by the next session.
