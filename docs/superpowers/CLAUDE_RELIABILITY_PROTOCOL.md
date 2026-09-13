# Claude reliability protocol — ANBAR

Status: **MANDATORY for all ANBAR work.** Adopted 2026-09-10 after recurring
defect classes found by independent Codex reviews.

This protocol governs *how a claim is earned*, not what to build. It does not
replace `CLAUDE.md`, `ANBAR_REACT_MIGRATION_PRINCIPLES.md` or the change-control
gateway; it constrains the evidence behind every status promotion.
Independent Codex review remains authoritative for acceptance.

---

## 1. Observation is not causation

A passing result proves only what was directly observed. Before claiming
causation, enumerate every state-changing action between the baseline and the
observation. If another action can explain the result, **do not** promote the
contract.

## 2. Exact contract first

Before implementation, copy the exact authoritative M9 (or phase) contract text
and inspect the cited legacy lines directly. Explicitly enumerate:

- branches;
- equality boundaries;
- null/empty cases;
- role or mode dimensions;
- guard order.

Never rely on a summary when the primary source is available.

## 3. Boundary matrix

For every numeric threshold, test **below**, **exactly equal**, **above**, and
the **negative equivalents** where meaningful. A threshold claimed from tests
that omit the equality case is not evidenced.

## 4. Falsifiability

Every load-bearing assertion needs a **positive** case, a **negative** case, and
a **boundary/control** case where applicable. Confirm the test would fail if the
target rule were absent or reversed. Vacuous tests — those that pass against an
implementation without the rule — are not evidence.

For ordering contracts, fixture input must deliberately oppose the expected
output order; already-sorted input does not test sorting. For a composite key,
vary every named load-bearing component independently—one mismatched component
does not prove the others participate in the key.

## 5. First refusing guard

When UI controls are absent or an RPC is not emitted, identify the **first**
guard that rejected the operation. Never attribute the result to a later guard
that was never reached.

## 6. No generalisation

One role, endpoint, branch, mode, fixture or screen proves only that case. Do
not write "all", "fully", "structurally unreachable" or "complete" unless every
named dimension was enumerated and tested.

## 7. Evidence levels

Keep these strictly distinct, and never promote one as another:

| Level | Means |
|---|---|
| `CODE VERIFIED` | unit/static evidence only |
| browser-harness | observed in a driven browser harness |
| persisted TEST | written and re-read in the TEST project |
| server/RLS | enforced server-side, proven by a refused/allowed call |
| `LIVE VERIFIED` | the ledger's **exact** live contract was exercised |

## 8. Harness validity

Before accepting browser/harness evidence, rule out:

- StrictMode duplicate requests;
- wrong-page request interception;
- early/late sampling;
- disappearing toasts;
- selectors matching the wrong element;
- hidden/filtered rows;
- focus changes caused by the harness;
- unfalsifiable injected markers;
- failed backup/restore.

After correcting a harness defect, **rerun the complete affected scenario
cleanly**. A partially rerun scenario is not evidence.

## 9. No source-mutation theatre

Do not mutate implementation files merely to claim falsifiability unless
specifically required. Prefer clear positive, negative and boundary tests. If
mutation testing is used: verify the backup exists **before** editing, restore
after **each individual** mutant, and verify the final file **byte-for-byte**.

## 10. Mechanical ledger tally

Calculate status totals only from authoritative `| M9-* |` table rows. After
every promotion, verify:

- total rows;
- unique ids;
- duplicate ids;
- each status count;
- unclassified count;
- sum of status counts equals unique row count.

Never count prose tokens and never copy a previous tally forward.

## 11. Contradiction sweep

Before reporting completion, search the proposal, plan, ledger header and body,
parity registry, `CLAUDE_NEXT_PROMPT.md` and the new audit for:

- stale `NOT STARTED` claims;
- stale next-step instructions;
- superseded blockers;
- conflicting status totals;
- claims broader than the evidence.

Historical text may remain **only** when explicitly marked `SUPERSEDED`/
`HISTORY`.

## 12. Proportional documentation

One audit per coherent slice. Do **not** create separate audits for failed
harness attempts; record concise correction history inside the final scoped
audit. Update authoritative documents only after implementation and checks pass.

## 13. Safe autonomy

If one task is blocked, continue with another independent authorised pure-logic
or read-only task. Stop only when every safe in-scope alternative is exhausted.

For the multi-phase migration, an isolated evidence gap in one phase does not
justify waiting when the next roadmap phase is independent and already within
the owner's standing migration scope. Preserve the open row and its exact
blocker in the ledger/handoff, leave that phase `NOT ACCEPTED`, and continue
the next safe phase. Pause only when the blocker is a real dependency of all
remaining work, a new owner decision would change behaviour, or the next step
requires authority not already granted. Never ask the owner to say “continue”
merely because a coherent slice or phase report has been completed.

## 14. Final self-review

Before saying "Done", verify:

- exact legacy comparison;
- exact ledger wording;
- guard order and causal isolation;
- positive/negative/boundary tests;
- evidence level;
- mechanically computed tally;
- contradiction sweep;
- focused tests;
- typecheck/lint;
- full suite/build when required;
- `git diff --check` hygiene;
- staged files = 0;
- environment and safety constraints restored;
- every authoritative summary location read back (§15);
- every claimed range expanded against the status map (§16).

## 15. Authoritative summary consistency

A correct tally in the final report is **insufficient**. Every authoritative
summary location must agree with the parsed ledger rows:

- ledger latest banner;
- ledger authoritative tally table;
- parity registry latest banner;
- `CLAUDE_NEXT_PROMPT.md` latest banner;
- current audit verdict.

After updating them, **read back each concrete location**. A broad grep alone is
insufficient: it can find correct text elsewhere in the file while missing a
stale table. The 2026-09-10 Phase 9 round failed exactly this way — every banner
read 37 / 84 / 1 / 2 while the ledger's own tally table still read 38 / 84 / 1 / 1.

## 16. Exception-safe row enumeration

Never use a continuous range such as `M9-70…M9-77` when any row inside that
range has a different status.

When a range contains an exception:

- split the range around the exception; or
- list every row explicitly;
- and name the exception and its status **in the same sentence**.

Correct form:

> `M9-55, M9-70, M9-72…M9-77, M9-79, M9-79a, M9-79b and M9-84 are`
> `CODE VERIFIED; M9-71 is IN PROGRESS`

Before reporting, **expand every claimed range** mentally or mechanically and
compare each included row against its authoritative status. A range used purely
as slice *scope* ("rows examined") is not a status claim, but must say so.

**Judge the whole wrapped statement, not the single line.** In these banners a
range and the status token that qualifies it routinely land on different lines:

> `> ... complete: **M9-55, M9-70…M9-77, M9-79, M9-79a,`
> `> M9-79b and M9-84 are `CODE VERIFIED`** ...`

A line-scoped check sees no status word on the range line, skips it, and lets a
real inclusive-range defect pass. This gap was found in this checker's own first
implementation and is pinned by the `wrapped claim` fixtures.

## 17. Status-cell parsing

Ledger tallies must be calculated from the **authoritative status cell**, not by
searching the whole row for status words.

This is load-bearing: M9-71's status cell begins `IN PROGRESS`, but its
explanation legitimately contains the phrase `CODE VERIFIED` for the sorting
sub-clause. A whole-row text search misclassifies it and reproduces the stale
38 / 84 / 1 / 1 tally.

The checker must:

- identify each `| M9-* |` row;
- read the **final** authoritative status cell;
- classify by the **primary status at the start** of that cell;
- allow explanatory text to contain other status words without changing
  classification;
- verify total, unique ids, duplicates, every status count and unclassified rows.

`tools/ledger-check.mjs` implements this; `--self-test` carries the M9-71 mixed
wording, duplicate-id, unclassified-status and range-split fixtures.

## 18. Validator claims require end-to-end proof

A parser test is not a validation test. Every claimed failure mode must have an
end-to-end fixture using the real validation path. A checker must not print
broader PASS text than the checks performed. Status totals are derived from
ledger rows and must not be duplicated as manually maintained checker
constants.

Concretely, for `tools/ledger-check.mjs`:

- only **structural** facts are configuration — ledger path, allowed status
  vocabulary, required tally categories, expected total row count;
- every status total is **derived** from the `| M9-* |` status cells, so a
  future promotion edits the ledger alone and never this checker;
- the tally table must carry each required category **exactly once** — missing,
  duplicate and unknown categories all fail (an earlier version skipped absent
  categories with `continue`, so an omitted row passed vacuously);
- each current summary location is parsed and compared, or must explicitly
  defer to the ledger; `HISTORY`/`SUPERSEDED` statements are never read as
  current;
- the PASS line states what was actually checked and how many summaries were
  compared.
