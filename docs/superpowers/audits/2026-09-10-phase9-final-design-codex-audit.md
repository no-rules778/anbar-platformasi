# Phase 9 final design Codex audit — 2026-09-10

## Verdict

**NOT YET DESIGN-ACCEPTED — two narrow documentation corrections remain.**

The revision-3 reconciliation otherwise satisfies the prior re-audit. In
particular, a separate `M9-134c` row is **not required**: the mandatory
falsifiable realtime/stale-overwrite test is part of the exact `M9-134b`
contract. The authoritative ledger therefore correctly contains **124 unique
ids (115 plain + 9 lettered)** after removal of conditional `M9-141c`.

No application or database work is authorised by this audit.

## Finding 1 — T0A currently violates the approved no-write-before-T10 gate

**Priority: blocking.**

The owner-approved proposal says that the single reversible TEST write window
is T10 and that no design or implementation step authorises a write before it.
However, T0A currently includes:

- calling the seven-argument `set_stock_condition` RPC to observe whether it
  returns `PGRST202`; and
- a real `rehber` `set_stock_condition` attempt to observe the server refusal.

A refused mutation is still a live mutation **attempt**. More importantly, the
seven-argument signature probe can reach the valid function and mutate data if
supplied with an authorised identity and valid arguments. “No lasting
mutation” is not equivalent to “no live write”. These checks therefore cannot
sit in the pre-implementation, read-only T0A gate under Q4.

Required correction:

1. Make T0A strictly read-only.
2. Obtain the exposed RPC argument list without invoking a mutation (for
   example from the PostgREST OpenAPI/schema description), or leave the exact
   signature/body to T0B.
3. Move the `rehber` refusal call and every executable `PGRST202` fallback leg
   to T10 after the separately authorised write window opens. Unit/mocked
   coverage may still be prepared earlier.
4. Reconcile the affected proposal, plan and `M9-91`/`M9-92`/`M9-99`/`M9-100`/
   `M9-108` evidence wording without creating new ledger ids.

## Finding 2 — `rDxtm` does not mean “only r”

**Priority: blocking for factual exactness, documentation-only.**

The 2026-09-03 schema capture records the table ACL as:

```text
authenticated=rDxtm/postgres
```

The proposal and T0B describe that as `authenticated` holding “only `r`”. That
is not an exact decoding of the ACL string. It correctly lacks the DML grants
`a` (INSERT), `w` (UPDATE) and `d` (DELETE), but it also contains `D`, `x`, `t`
and `m`. The design may state the security-relevant conclusion — **no direct
INSERT/UPDATE/DELETE table privilege** — but must not call the captured ACL
“only r”. T0B should capture and compare the full ACL, or explicitly test for
absence of `a/w/d`, without collapsing the other privilege letters.

Required correction: replace every “only `r`” claim in the proposal, plan and
reconciliation report with an exact full-ACL statement plus the narrower DML
conclusion. Preserve the earlier wording as corrected history where needed.

## Confirmed closed from the prior re-audit

- `correct_document` is now described correctly: cancellation of the original,
  inverse reversal, and a separately posted replacement that survives in both
  raw and operational calculations.
- Q1 and D-J1 through D-J4 cite the explicit owner decision.
- D-J3 specifies Escape-cancel/latest-snapshot, blur/Enter commit, and the
  edited-key plus latest-other-fields merge; `M9-134b` contains the required
  falsifiable regression test.
- D-J4 recognises the initial-balance marker in partner **or** channel.
- T0 is correctly separated conceptually into behavioural and catalog-access
  evidence, and no UI password is claimed to expose `pg_policy` or `pg_proc`.
- Conditional `M9-141c` is absent from the authoritative ledger and may be
  created only if M9-141a finds unequal data.
- Ledger count: 124 unique ids; no standalone `M9-134c` needed.

## Final acceptance rule

After the two corrections above, rerun only document integrity checks (ledger
count/uniqueness, Markdown tables, links, `git diff --check`, staged state) and
return for one narrow Codex confirmation. Do not reopen already closed design
findings and do not implement application code yet.

Phase 9 remains **NOT STARTED / NOT ACCEPTED**.
