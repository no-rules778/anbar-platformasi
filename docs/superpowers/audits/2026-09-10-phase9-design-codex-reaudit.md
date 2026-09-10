# Phase 9 independent Codex design re-audit

Date: 2026-09-10  
Input: proposal/ledger/plan revision 2 and the design-reconciliation report  
Result: **DESIGN NOT APPROVED — narrow reconciliation still required**

## What passed

- The original Q3 divergence claim is withdrawn correctly. Exact inverse rows
  preserve raw-versus-operational quantity for supported cancellation paths.
- The schema transcription is corrected.
- The ledger contains **125 unique ids** (115 plain + 10 lettered).
- Q2 is correctly treated as settled and outside acceptance.
- D-J1/D-J2 are now honestly distinguished from legacy behaviour.
- Export order/RLS wording, missing table/filter/KPI rows and the widened
  `WarehouseBalance` consumer guard are materially improved.
- No implementation or Supabase mutation was performed.

## Remaining blocking corrections

### 1. `correct_document` is described incorrectly again

The proposal, reconciliation report and M9-141/M9-141b say correction merely
appends a note marker. The captured function actually calls
`cancel_document(v_doc, ...)` and then `post_movement_document(v_lines, NULL)`.
The equality conclusion still holds, but for the real reason: the old document
plus its reversal is net zero, and the replacement document is present in both
raw and operational calculations. Correct every occurrence and make the
invariant test model the cancellation pair plus the surviving replacement.

### 2. Behaviour changes are recorded but not owner-approved

No Phase 9 owner-decision record exists. Q1 is labelled “owner approved” and
D-J1/D-J2/D-J3 are treated as chosen behaviour without a supporting decision.
D-J4 is a suspected legacy defect and principles §7 also requires an owner
choice before it is copied.

Recommended owner package:

- Q1 include condition writes;
- D-J1 make a failed condition read fatal and retain the previous snapshot;
- D-J2 subscribe to `stock_conditions` and omit irrelevant `partners`;
- D-J3 preserve an active editor across refresh using the safe merge rule in
  finding 3 below;
- D-J4 correct the opening-balance read to recognise the marker in partner **or
  channel**, matching the already-supported write definition. Preserving the
  partner-only omission is not recommended.

Until the owner accepts or rejects that package, label these as
`RECOMMENDED / OWNER DECISION PENDING`, not approved.

### 3. D-J3 still permits a lost update and contains a blur contradiction

M9-94 says blur commits, matching legacy. M9-134a says “Escape / blur without
commit”, which contradicts it. Cancellation is Escape only; blur belongs to the
commit case.

More importantly, the RPC sends all four quantities. If a refresh changes a
different condition field on the same warehouse/item while one field is being
edited, commit must compose:

- the user's input for the actively edited key; and
- the **latest snapshot values** for the other three keys and note.

It must not resend the pre-edit baseline for untouched keys. Add a falsifiable
test where realtime changes another key mid-edit and assert that the one RPC
preserves that new value. Escape must show the latest complete snapshot row.

### 4. T0 promises catalog evidence that a TEST password cannot provide

An ordinary authenticated PostgREST session can exercise RLS behaviour, read
rows/columns and inspect the exposed RPC signature, but it cannot prove the
exact number of `pg_policy` rows or read the current `pg_proc` body. Therefore
“no TEST password” is not the complete blocker.

Split T0:

1. **T0A, ordinary TEST identities:** behavioural RLS matrix, exposed column
   and RPC signature, role refusals that require no lasting mutation, and the
   raw-versus-operational comparison.
2. **T0B, catalog authority:** exact policies, ACLs, constraints and function
   body through an authorised Supabase catalog connection or a new trusted
   capture. If that authority is unavailable, report it explicitly; do not
   claim an admin UI password can supply it.

The existing 2026-09-03 capture remains design evidence, but freshness is not
proved until T0B.

### 5. Conditional M9-141c conflicts with the 125-row exit rule

M9-141c already exists as a `NOT STARTED` authoritative row, while the plan
says it is written only if M9-141a finds unequal data. The exit rule requires
every one of 125 rows to be evidenced or excluded, so an equal measurement
would leave an intentionally impossible open row.

Remove M9-141c from the authoritative ledger until its trigger occurs, reducing
the current count to 124, or define an allowed non-applicable closure state and
update the registry status vocabulary first. The simpler recommendation is to
remove it and create it only if unequal data is found.

## Environment limitation

The existing browser session could not be attached during this re-audit
(`User unavailable`), and no catalog credential is present in the process.
No live server claim was made. Production was not contacted.

## Status

Phase 9 remains **NOT STARTED / NOT ACCEPTED**. After the five corrections and
one owner decision package, Codex can perform a short final design re-audit;
implementation must not begin before T0A/T0B are resolved as specified.

