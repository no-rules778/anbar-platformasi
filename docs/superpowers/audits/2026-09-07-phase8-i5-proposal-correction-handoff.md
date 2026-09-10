# Handoff — I-5 proposal correction (2026-09-07)

Corrections applied to
`docs/superpowers/specs/2026-09-07-phase8-i5-batch-cancellation-proposal.md`,
now **revision 2**. **I-5 implementation has not started and is not started by
this note.** Documentation only: no code, no configuration, no SQL, no test run,
no live query, no commit, no deployment.

## What was corrected

Four findings were raised against revision 1. Each was independently
re-verified against primary evidence before being applied; two were applied as
stated, one was applied and **strengthened**, one was applied but its stated
rationale was **found to be wrong and replaced**.

### 1. Outcome classification (§5) — applied as stated

Revision 1 said any error means "nothing was written". Withdrawn as false. A
response can be lost after `COMMIT`: network error, 502/503/504 with no
PostgREST body, client abort or timeout, tab suspension. Server atomicity
constrains the DATABASE to two states; it says nothing about which one the
CLIENT learns.

§5.3 now defines four outcomes — **A** confirmed success, **B** confirmed
rejection, **C** unknown, **D** success-then-refresh-failure — with per-outcome
messaging, selection handling and resubmission rules in §5.4. Outcome C
preserves and displays the submitted document list, blocks resubmission of that
payload, and requires manual reconciliation. Outcome D stays separate from both
A and C (§8).

Consequential knock-on, not in the original finding: §7 now states that
`inFlight` is **not** the resubmission gate. `inFlight` releases on every path,
but only outcome B re-enables execute. Releasing `inFlight` in a `finally` and
treating that as re-enablement — the natural implementation reading — would
reintroduce the blind-resubmission hazard in the exact case where it does most
damage.

### 2. Evidence provenance (§4.0, §4.1) — applied, and confirmed the files exist

`sql/010_batch_cancel_documents_rpc.sql` and `sql/036_stock_layers.sql` are
**not** in this repository — `git ls-files` returns no `sql/` path at all. They
were found at:

| file | size | mtime | sha256 |
|---|---|---|---|
| `ANBAR_SHARED/sql/010_batch_cancel_documents_rpc.sql` | 10290 B | 2026-08-01 15:20 | `f497a5d74092dddbe63d2699baeb5c9d52430ba7170c7bbb36a70bea9d424917` |
| `ANBAR_SHARED/sql/036_stock_layers.sql` | 52257 B | 2026-08-31 16:58 | `1ac151c4754dcc9eada4aa7bc719755bf98ecc14008621a9e75f2d2296ba20a2` |

`ANBAR_SHARED` contains this clone (`anbar-platformasi-github`, HEAD `239b8a0`)
but is not itself a repository, so **no revision or git history exists** for
either file. Identity is the sha256 and nothing stronger; the line numbers
throughout §2/§4/§5 are anchored to those hashes. Rank 4 in the source-of-truth
order — never rank 1.

The "existence unknown" claim is **withdrawn**. Codex's SELECT-only catalogue
query against TEST `alkjjbaawmsirsfvqljm` on 2026-09-06
(`2026-09-05-phase8-registry-rows.md:494-513`) found both batch RPCs with live
signatures `cancel_documents_batch(p_doc_nums text[], p_reversal_date date)` and
`cancel_layer_documents_batch(p_doc_nums text[], p_reversal_date date)`, both
`jsonb` and `SECURITY DEFINER`. §4.1 carries a per-property table: existence,
signatures, return type and `SECURITY DEFINER` are VERIFIED; deployed bodies,
`EXECUTE` privileges and behaviour remain NOT VERIFIED.

### 3. Atomicity inference (§4.2, §5.2) — applied and STRENGTHENED

Revision 1 inferred end-to-end atomic success from the outer loop lacking an
`EXCEPTION` handler. Both halves of the missing check were performed against the
rank-4 files:

- **Do the batch functions check callee return values? Neither does.**
  `010:188-197` assigns `v_res` and reads only `reversal_doc_num` / `row_count`
  for its report. `036:823-831` assigns `v_result` and appends it verbatim.
  Neither inspects a status field.
- **Can the callees return failure without raising? Not in these files.**
  `cancel_document` (current revision, `ANBAR_SHARED/sql/031_icare_operation_type.sql`)
  has exactly one `RETURN` — terminal success — and eleven `RAISE EXCEPTION`
  exits. No error-status return, no early `RETURN NULL`.
- Neither file contains any `EXCEPTION WHEN` block or bare handler section. All
  72 `EXCEPTION` tokens in `036` are `RAISE EXCEPTION`.

So the guarantee holds **because the callees raise, not because the batch checks
them** — recorded in §5.2 as a fragility for whoever next edits that SQL, and
explicitly not a reason to expand into SQL repairs.

**The layer-defect framing is withdrawn.** Revision 1 claimed
`cancel_layer_documents_batch` has "no pre-validation, no advisory lock, no
balance simulation" and floated raising a server-defect task (§10 option c).
Reading the callees shows the outer/callee distinction was missed:
`cancel_layer_document` (`036:604-680`) takes `pg_advisory_xact_lock` on
`cancel|<doc>` (`607`) and per `(warehouse|item_code)` (`622`, `642`), takes
`FOR UPDATE` on affected `stock_layers` (`623`, `660`), and pre-validates mixed
in/out, consumed receipt layers and already-reversed write-offs before writing.
`cancel_layer_transfer_document` (`036:685-710`) mirrors it. Because
`pg_advisory_xact_lock` is transaction-scoped, locks taken in iteration N are
still held in N+1.

The corrected asymmetry is **lock-acquisition ordering** (deadlock risk between
concurrent overlapping batches — a failed transaction, not corruption),
**failure timing and message quality** (no whole-batch pre-flight reason), and
**cross-document balance interaction**. That is a design difference, not a
demonstrated fault. Option (c) is withdrawn from §10; declaring a defect would
require a deadlock or wrong-result reproduction against the deployed functions,
which this proposal does not have.

### 4. Response counts (§4.4) — applied, rationale replaced

The fix stands: `cancel_documents_batch` returns `cancelled_count` (`010:203`),
`cancel_layer_documents_batch` returns `document_count` (`036:832`), both
wrappers read only `cancelled_count` (`documentCancel.api.ts:420`, `:445`), so a
successful layer batch reports 0.

But revision 1 proposed copying legacy's `docNums.length` fallback
(`index.html:5498`). Reading the SQL shows why that is wrong — and shows the
non-layer path is already weaker than revision 1 assumed:

- `010:203` is `'cancelled_count', (SELECT COUNT(*) FROM _sel)` — the SELECTED
  count, recomputed from the validated selection. Pass 2 never counts what it
  cancelled.
- `036:832` is `jsonb_array_length(v_results)` — an iteration count.

Both are counts of attempts. `cancelled_count` is already a selected-count
wearing a completion-count's name, trustworthy only via the raise-on-failure
property of §5.2, which is asserted of rank-4 files and not of deployed bodies.

§4.4's corrected rule: read `cancelled_count` then `document_count`, never
`docNums.length`; a missing or non-integer value yields `null`, not `0` and not
the selection size; `null` renders count-free; malformed or inconsistent `ok`
responses (count exceeding or below the submitted count, `results` length
disagreeing, non-object `data`) route to **outcome C**, not to a silent
reconciliation; and the count is a reporting value that never drives control
flow. §3 now states that the selected-count is a selection indicator only.

## Preserved unchanged

Eligibility and filter parity (§2, §3), capability readiness gate (§4.3), fresh
submit-time recheck (§6), duplicate-submit safeguards (§7 core). No SQL, schema,
RLS, grant or migration change is proposed.

## Verification performed

- Both SQL files located, hashed, and read at the cited regions; repository
  `sql/` absence confirmed via `git ls-files`.
- Callee bodies (`cancel_layer_document`, `cancel_layer_transfer_document`,
  `cancel_document`) read for locks, pre-validation, `RETURN` and `RAISE` paths.
- Exception-handler absence confirmed by grep over both files.
- Codex catalogue evidence read at `registry-rows:494-513`.
- Batch wrappers read at `documentCancel.api.ts:396-450`.
- Internal cross-references checked: §3→§4.4/§5.5, §4.2→§10, §5.3→§7/§8,
  §7→§5.3, §8→§5, §9 scope line, `M8-32` title note.
- `git diff --check` — no whitespace errors (pre-existing CRLF warnings only).
- No test run, no application launch, no live query or write, no commit.

## Remaining material decisions

1. **D3** — user approval to run I-5 in Phase 8 (proposal recommends yes;
   unchanged from revision 1).
2. **Layer batch handling** — (a) faithful port with the weaker pre-flight
   guarantee stated in the UI, or (a)+(b) plus a client-side pre-check.
   Recommended: (a)+(b); (b) is nearly free given §6's recheck. Option (c),
   server-defect escalation, is withdrawn.
3. **Wrapper shape change** — I-5 needs an `outcome: 'rejected' | 'unknown'`
   discriminator on the two batch wrappers to distinguish outcomes B and C. In
   scope and changes no RPC, but it touches two functions the I-4 audit already
   signed off, so it is flagged for approval rather than assumed.
4. **Post-C reconciliation is manual** — the user refreshes and inspects the
   listed documents. An automatic read-only re-query of the submitted document
   numbers would resolve C without user effort, but that is a scope addition
   needing approval.
