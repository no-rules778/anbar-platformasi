# Phase 8 — milestone I-5: batch cancellation («Qrup üzrə ləğv»)

> **REVISION 2 — 2026-09-07, corrected before implementation.** Implementation
> has NOT started. Four corrections were applied after independent
> re-verification against primary evidence; each is marked in place.
>
> 1. **§5 rewritten.** The claim that any error means "nothing was written" is
>    **withdrawn as false** — a response can be lost after commit. The UI now
>    distinguishes four outcomes: confirmed success, confirmed rejection,
>    unknown, and success-then-refresh-failure.
> 2. **§4.0 added.** The cited SQL files are NOT in this repository. Their real
>    out-of-repo paths and sha256 hashes are recorded; they are unversioned
>    rank-4 evidence. **§4.1 withdraws** the "existence unknown" claim: Codex
>    verified both batch RPCs' existence and signatures on TEST on 2026-09-06.
>    Deployed bodies and `EXECUTE` privileges remain unverified.
> 3. **§4.2 and §5.2 corrected.** Atomicity is no longer inferred from the outer
>    loop lacking an `EXCEPTION` handler. Callee return-value handling was
>    checked directly, and the layer callees' own locks and pre-validation were
>    read. The "server defect" framing is **withdrawn** (§10).
> 4. **§4.4 tightened.** The response-count fix stands, but selected-count is
>    never substituted as proof of completed cancellations, and malformed
>    success responses are specified.
>
> Unchanged and still in force: the eligibility/filter parity of §2-3, the
> capability readiness gate (§4.3), the fresh submit-time recheck (§6) and the
> duplicate-submit safeguards (§7). No SQL repair is proposed.

**PROPOSAL ONLY, 2026-09-07. Nothing is implemented.** No batch UI, no store
slice, no component and no test exists for I-5. The only I-5-adjacent code on
disk is the pair of transport wrappers in
`web/src/api/documentCancel.api.ts:396-450`, which are explicitly marked
"TRANSPORT ONLY … the selection UI is milestone I-5 and is NOT built here".

This document does not restate the Phase 8 plan. It refines the batch section of
`2026-09-05-react-migration-phase8-movements-proposal.md` (§3.5 lines 301-306,
§3.9 line 409, D3 lines 537-541) with the primary evidence actually read, and it
records where that evidence CONTRADICTS or EXTENDS the plan.

Registry rows in scope: `M8-30` (eligibility matrix), `M8-31` (search, filters,
selection), `M8-32` (atomic execute + all-or-nothing message) — all currently
`NOT STARTED` (`2026-09-05-phase8-registry-rows.md:66`).

`M8-32`'s title says "all-or-nothing message". **§5 refines that**: all-or-
nothing describes the DATABASE outcome, not the message space. The message space
has four states, because a lost or ambiguous response leaves the client unable to
tell which of the two database states occurred. `M8-32`'s acceptance text should
be read through §5.3 when the row is worked; the row itself is not edited here.

## 1. D3 — recommendation

**Include batch cancellation in Phase 8 as milestone I-5.** D3 is still
formally UNRESOLVED and this proposal does not resolve it; only the user can.

The plan's own recommendation (line 539) was to keep it in Phase 8 "so the
cancellation surface is migrated once", with the escape hatch "accept splitting
it out if I-1…I-4 run long". I-1…I-4 did not run long — they are complete, and
the eligibility helpers batch needs (`cancelledDocFor`, `docCancelledBy`,
`docReversalDoc`, `stripRowLevelCancelled`, `CANCELLABLE_TYPES`) already exist,
tested, from I-2/I-3/I-4. Deferring now would leave the batch RPC wrappers as
dead typed code with no caller, and would split one eligibility rule across two
milestones — the exact drift risk the I-4 audit already caught once.

Cost is bounded: the legacy subsystem is ~200 lines (`index.html:5309-5505`),
and the two RPCs are already wrapped and covered.

## 2. Eligibility (`M8-30`)

The client matrix must mirror `cancel_documents_batch`. Both sides were read.

**Legacy client classifier** — `buildBatchDocs()`, `index.html:5314-5372`.
Grouping key is `'doc:'+m.doc` when a doc number exists, else `'legacy:'+m.id`:
doc-less rows are never merged into a synthetic document. Rows are passed
through `stripRowLevelCancelled()` first, and a group whose rows are all
stripped is dropped entirely (`5330`). Classification order (`5364-5372`), first
match wins:

| order | condition | eligible | status shown |
|---|---|---|---|
| 1 | any row's note matches `^Ləğv( \(əks yerdəyişmə\))?:` | no | reversal document |
| 2 | doc-less (`legacy`) | no | individual cancellation only |
| 3 | already cancelled (`cancelledBy`) | no | already cancelled, with the reversal doc |
| 4 | transfer **and** non-transfer rows | no | mixed — unsupported |
| 5 | pure transfer | **yes** | transfer, cancellable |
| 6 | exactly one type, in `CANCELLABLE_TYPES` | **yes** | cancellable |
| 7 | otherwise | no | unsupported type |

**Server matrix** — `ANBAR_SHARED/sql/010_batch_cancel_documents_rpc.sql`
(out-of-repo, rank 4; see §4.0 for its hash and why the path in an earlier draft
was wrong), pass 1 at lines 99-139. It raises on: doc-less/empty entry (85-88), duplicate selection (92-96),
document not found (102-104), mixed transfer+other (107-111), transfer already
reversed or already cancelled (114-120), ordinary with
`COUNT(DISTINCT type) <> 1` (123-126), type outside
`('Satınalma','Əvvələ qalıq','Qaytarma','Silinmə','Sahəyə','Satış')` (127-130),
already a reversal (131-133), already cancelled (134-136).

The two agree on every row of the table. **Two server rules have no client
counterpart** and must be added on the React side:

- **Duplicate `doc_num` in the payload is a server ERROR** (`Təkrar seçilmiş
  sənəd(lər)`), not a silent dedupe. A `Set`-keyed selection makes this
  unreachable, but the payload builder must still dedupe defensively.
- **Document-not-found** is a server error the client cannot anticipate, because
  the client only ever offers documents it read from its own snapshot.

Admin-only is enforced in three places: legacy `batchCancelOpen()` (`5374`) and
`batchCancelExecute()` (`5487`), and the server (`010:66-72`, layer variant
`036:819-821`). The React client gate is UX; the RPC refusal is the enforcement
and must be surfaced verbatim (plan §3.7).

## 3. Selection and filters (`M8-31`)

`batchFilterDocs()` (`index.html:5379-5403`) filters the built snapshot on six
inputs: date from/to (inclusive string compare on the group's EARLIEST row date,
`5338`), warehouse (membership in the group's warehouse set), type (membership
in the group's type set), document number (case-insensitive substring), and item
(case-insensitive substring over BOTH codes and names). Empty inputs are no-ops.

**Ineligible documents are listed, not hidden.** The dialog hint (`5408`) states
that already-cancelled, reversal, mixed and doc-less records appear with their
reason and cannot be selected. I-5 must keep this: hiding them would make the
absence of a document indistinguishable from a filter miss.

**Selection survives filtering.** `BC.selected` is a `Set` of group keys, and
`updateBatchSel()` carries the explicit comment "seçim filtrlə itmir" — selection
is deliberately NOT intersected with the visible list (`5446-5453`). A user may
filter, select, re-filter, select more, and execute all of them. I-5 must
reproduce this, and must therefore show the selected COUNT independently of the
filtered list, since selected rows can be off-screen.

**This selected-count is a SELECTION indicator only.** It says how many
documents the user has picked and is about to submit. It is never reused as
evidence of how many were cancelled, and it never substitutes for the
server-reported count in a result message — see §4.4 rule 1 and §5.5.

Filter option sources: warehouses from `DB.whs`, types from
`['Yerdəyişmə'] + CANCELLABLE_TYPES` (`5405-5406`). Note this type list is the
CANCELLABLE set, so an unsupported-type document cannot be reached by the type
filter at all — it is only visible with that filter cleared. Faithful port;
flagged as a legacy quirk, not to be "improved" without approval.

## 4. Layer capability readiness

### 4.0 Evidence provenance (corrected)

An earlier draft of this proposal cited `sql/010_batch_cancel_documents_rpc.sql`
and `sql/036_stock_layers.sql` as if they were files of THIS repository. **They
are not.** `git ls-files` in this repository returns no `sql/` path at all; the
directory does not exist here. The correction:

| cited as | actual path | size | mtime | sha256 |
|---|---|---|---|---|
| `sql/010_batch_cancel_documents_rpc.sql` | `ANBAR_SHARED/sql/010_batch_cancel_documents_rpc.sql` | 10290 B | 2026-08-01 15:20 | `f497a5d74092dddbe63d2699baeb5c9d52430ba7170c7bbb36a70bea9d424917` |
| `sql/036_stock_layers.sql` | `ANBAR_SHARED/sql/036_stock_layers.sql` | 52257 B | 2026-08-31 16:58 | `1ac151c4754dcc9eada4aa7bc719755bf98ecc14008621a9e75f2d2296ba20a2` |

`ANBAR_SHARED` is the working folder that CONTAINS this git clone
(`anbar-platformasi-github`, HEAD `239b8a0`); it is not itself a repository, so
these two files carry **no revision and no git history**. Their identity is the
sha256 above and nothing stronger. Every line reference in §2, §4 and §5 is to
those two out-of-repo files at those hashes, and is reproducible only against
them. Line numbers cited from an unversioned file are a weak anchor: a
re-verification must re-hash first.

Anyone auditing this proposal must therefore treat the SQL evidence as
**rank 4** in the source-of-truth order (`CLAUDE.md` §5) — migration scripts —
never as rank 1 live data.

### 4.1 What live verification actually established (corrected)

The earlier draft claimed under §5 that "whether both RPCs exist and are
`EXECUTE`-granted on the TEST project" is unverified. **The existence half of
that claim is wrong and is withdrawn.**

Codex ran ONE SELECT-only catalogue query against the TEST project
`alkjjbaawmsirsfvqljm` on 2026-09-06, recorded at
`2026-09-05-phase8-registry-rows.md:494-513`. It found all thirteen
cancellation RPCs, including both batch functions, with these live signatures:

```
cancel_documents_batch(p_doc_nums text[], p_reversal_date date)
cancel_layer_documents_batch(p_doc_nums text[], p_reversal_date date)
```

Both return `jsonb` and are `SECURITY DEFINER`. So the corrected status is:

| property | status | evidence |
|---|---|---|
| both batch RPCs EXIST on TEST | **VERIFIED** (read-only catalogue) | registry rows `:496-513` |
| their argument names and types | **VERIFIED** | same |
| return type `jsonb`, `SECURITY DEFINER` | **VERIFIED** | same |
| the deployed function BODIES | **NOT VERIFIED** | never read; `pg_get_functiondef` was not queried |
| `EXECUTE` privileges on TEST | **NOT VERIFIED** | grants appear in the scripts (`010:206-207`, `036` REVOKE/GRANT block); live `has_function_privilege` was not queried |
| behaviour of either RPC | **NOT VERIFIED** | neither was ever called; the catalogue describes, it does not execute |

The consequence for I-5 is narrow and must not be overstated: the wrappers'
function names and argument names are known to bind against TEST. Everything
this proposal says about what the functions DO rests on rank-4 files, not on
the live database.

This distinction has already cost the project once. Deviation `D-I1`
(`registry-rows:518-535`) exists precisely because the live catalogue
contradicted a migration-file premise about `cancel_layer_transfer_document`'s
argument name. The lesson is applied here, not re-learned.

### 4.2 Guarantee asymmetry — corrected, and materially weaker than claimed

The earlier draft asserted that `cancel_layer_documents_batch` has "no
pre-validation pass, no advisory lock, and no balance simulation", and treated
that as a layer-path defect. **Reading the callees shows this was wrong**, and
the finding is corrected as follows.

The distinction that matters is between protections in the OUTER function and
protections inside its CALLEES. The earlier draft compared outer bodies only.

**`cancel_documents_batch` (`010`) — protections in the OUTER function:**

- pass 1 validates EVERY selected document before any write (`99-139`)
- deterministic advisory locks per document and per `(warehouse|item_code)`
  key, taken for the WHOLE batch up front (`141-152`)
- a sequential balance simulation with a running balance, so document N sees
  documents 1…N-1's effects (`160-182`)
- then pass 2 delegates to `cancel_document` / `cancel_transfer_document`
  (`188-197`)

**`cancel_layer_documents_batch` (`036:815-834`) — outer function:** after the
admin/session/empty checks it is a bare `FOR … LOOP` over
`cancel_layer_document` / `cancel_layer_transfer_document`, with `DISTINCT` and
`ORDER BY btrim(x)` on the input array. It holds no cross-document
pre-validation, no batch-wide lock acquisition and no balance simulation of its
own. **That part of the earlier finding stands.**

**But the callees are not unprotected.** `cancel_layer_document`
(`036:604-680`) itself:

- takes `pg_advisory_xact_lock(hashtext('cancel|'||doc))` (`607`)
- takes `pg_advisory_xact_lock` per `(warehouse|item_code)` (`622`, `642`)
- takes `SELECT … FOR UPDATE` on the affected `stock_layers` rows (`623`, `660`)
- pre-validates before writing: mixed in/out on an exact-layer document (`621`),
  a consumed receipt layer (`625-627`), an already-reversed write-off (`656-658`)
- and delegates the ledger reversal to `cancel_document`, which runs its OWN
  admin check, document validation, reversal-of-reversal guard,
  duplicate-cancellation guard and per-key balance check (current revision in
  `ANBAR_SHARED/sql/031_icare_operation_type.sql`)

`cancel_layer_transfer_document` (`036:685-710`) has the same shape: a
`cancel-transfer|<doc>` advisory lock (`687`), per-key locks (`693`), and
`FOR UPDATE` on both source and destination layers (`706`).

Because these are `pg_advisory_xact_lock` — **transaction**-scoped — locks taken
inside iteration N are still held during iteration N+1. So the batch does
accumulate its lock set as it proceeds; it simply does not acquire it in one
deterministic up-front pass.

**The corrected statement of the asymmetry** is therefore not "protected vs
unprotected" but:

1. **Lock-ordering.** `010` sorts and takes every lock before any work. The
   layer path takes locks incrementally in document order. Two concurrent
   batches with overlapping-but-differently-ordered key sets can therefore
   deadlock on the layer path in a way `010`'s up-front deterministic ordering
   avoids. Postgres detects and aborts one of them, so this is a
   failed-transaction risk, not a corruption risk.
2. **Failure timing and message quality.** `010` reports a document-level
   insufficient-stock reason from its simulation BEFORE any write. The layer
   path discovers the same class of problem inside iteration N, after 1…N-1 were
   already processed in-transaction. The rollback is equally complete; the
   message names the failing document but is not a whole-batch pre-flight.
3. **Cross-document balance interaction.** `010` simulates the batch's combined
   effect. The layer path relies on each callee's own check seeing the
   in-transaction effect of earlier iterations — which it does, since they share
   one transaction.

**What remains genuinely UNKNOWN** and must not be closed by inference: whether
the DEPLOYED bodies of these functions match the rank-4 files above. Every claim
in this subsection is a claim about those files.

**This is not a proven server defect.** The earlier draft's option (c) —
"treat it as a server defect and raise a separate SQL task" — rested on the
outer-body comparison alone, and that basis is now withdrawn. A weaker
lock-acquisition discipline in an outer function whose callees each lock and
pre-validate is a design difference, not a demonstrated fault. Calling it a
defect would require evidence this proposal does not have: a deadlock or a
wrong-result reproduction against the deployed functions. §10 is corrected
accordingly.

### 4.3 Readiness gate

I-4 established fail-closed capability handling: the store keeps `ready` and
refuses to choose a write family while the capability is unknown (I-4 audit
finding 3; `movements.store.test.ts:290-291`). **I-5 inherits this unchanged:**
while `ready === false` the execute button is disabled with the honest
capability-unknown reason and zero RPCs are sent. Selection and filtering stay
usable — only execution is gated.

### 4.4 Return-shape divergence — the correction stands, its justification does not

The divergence is real and is confirmed in the rank-4 files:

- `cancel_documents_batch` returns `cancelled_count` (`010:203`)
- `cancel_layer_documents_batch` returns `document_count`, and NO
  `cancelled_count` (`036:832`)

Both wrappers read only `cancelled_count` (`documentCancel.api.ts:420`,
`:445`), and only the non-layer shape is asserted in the test
(`documentCancel.api.test.ts:136`). So on the layer path `cancelledCount`
silently becomes `0`, and a successful layer batch would report "0 documents
cancelled". Legacy masks this by falling back to `docNums.length` in the toast
(`index.html:5498`). **The fix stays in I-5's scope; it changes no RPC.**

**But the legacy fallback must NOT be copied, and here is why.** Read what the
two counts actually are:

- `010:203` — `'cancelled_count', (SELECT COUNT(*) FROM _sel)`. This is the
  count of SELECTED documents, recomputed from the validated selection set. It
  is **not** a count of confirmed cancellations. Pass 2 never counts what it
  cancelled.
- `036:832` — `'document_count', jsonb_array_length(v_results)`, i.e. the number
  of loop iterations that appended a result. Also a count of attempts, not of
  confirmed cancellations.

So `cancelled_count` on the non-layer path is *already* a selected-count wearing
a completion-count's name. Substituting `docNums.length` on the layer path would
not introduce a new inaccuracy — it would reproduce the existing one. Both are
only trustworthy because these functions raise on failure rather than returning
a failure value (§5.2), and that property is asserted of rank-4 files, not of
the deployed bodies.

**Corrected rule for I-5:**

1. The layer wrapper reads `cancelled_count` first, then falls back to
   `document_count`. Both are server-reported. `docNums.length` is **never**
   used as the count.
2. If neither key is present, or the value is not a finite non-negative integer,
   the count is `null` — not `0`, not the selection size.
3. A `null` count is rendered as a count-free success: the documents were
   cancelled, with the submitted document list shown and no numeral. Never
   "0 documents cancelled" after an `ok` response.
4. **Malformed or inconsistent success responses.** If the RPC returns `ok` but
   the response is unusable — count present and greater than the submitted
   count; count present and less than the submitted count; `results` present but
   its length disagreeing with the count; `data` null or not an object — I-5
   does NOT reconcile it silently and does NOT fall back to the selection size.
   It renders the **unconfirmed** outcome of §5.3: the write is presumed to have
   happened, the submitted list is preserved, resubmission is blocked, and the
   user is told to verify against the refreshed list. An `ok` with an incoherent
   body is weaker evidence than an `ok` with a coherent one, and the UI must not
   erase that difference.
5. The count is a REPORTING value only. It never drives control flow: not the
   success/failure decision, not the resubmission gate, not the selection reset.
   Those are decided by §5's outcome classification alone.
6. Tests assert both shapes and every malformed case in 4. The existing
   single-shape assertion (`documentCancel.api.test.ts:136`) is extended, not
   replaced.

## 5. Atomicity, and the four outcomes the UI must distinguish

### 5.1 The error that this section corrects

An earlier draft of this proposal stated that the UI "must therefore treat any
error as *nothing was written*". **That is wrong, and it is the most dangerous
sentence in the draft.** It conflates server-side atomicity with end-to-end
certainty.

Server atomicity guarantees that the DATABASE ends in one of two states: the
whole batch is committed, or none of it is. It guarantees nothing at all about
whether the CLIENT learns which. Between `COMMIT` and the response arriving in
the browser there is a PostgREST process, a load balancer, a TLS connection and
a network. A response lost after the commit is an ordinary event, not an exotic
one:

- the `fetch` rejects with a network error while the commit has already
  succeeded;
- a proxy or gateway timeout (504) is returned after the statement committed;
- a client-side statement timeout or `AbortController` fires after the server
  committed;
- the tab is backgrounded, suspended or closed mid-flight;
- the connection drops during response streaming.

In every one of those the transaction committed and every selected document IS
cancelled, while the client holds only an error. Telling the user "nothing was
written" in that case is a **false statement of fact about their data** — the
same class of error as §8's refresh-failure bug, and worse, because it invites a
resubmission that will then fail against a batch already cancelled.

Atomicity therefore reduces the outcome space from `2^n` partial states to
**three** database states — committed, rolled back, and *not yet known which* —
and the UI must render all three. It does not reduce it to two.

### 5.2 What atomicity IS proven to be (rank-4 files)

Read, not inferred from the RPC name.

`cancel_documents_batch`: atomicity is a documented contract (`010:11-20`) and
visible in the body. Pass 1 raises before any write; the balance simulation
raises before any write; pass 2's own comment states "Any RAISE here rolls back
the entire transaction (all-or-none)".

`cancel_layer_documents_batch`: the same transactional rollback applies (§4.2),
though by the default behaviour of an unguarded loop rather than by engineered
contract.

**Verified for both, by grep over the two rank-4 files:** neither file contains
a single `EXCEPTION WHEN` block or bare `EXCEPTION` handler section. All 72
occurrences of the token `EXCEPTION` in `036` are `RAISE EXCEPTION`; `010` has
no handler either. With no handler and no savepoint, an unhandled `RAISE` in a
function called from a single statement aborts that statement's transaction, so
no partial-commit path exists in either function.

**The callee-failure question, checked rather than assumed.** The earlier draft
inferred end-to-end atomic success from the outer loop merely lacking an
`EXCEPTION` handler. That inference is invalid on its own, because a callee can
signal failure by RETURNING a value instead of raising, and a caller that
ignores the returned value would then commit a partial batch silently. So both
halves were checked:

- **Do the batch functions check their callees' return values? NO — neither
  does.** `010:188-197` assigns `v_res` and reads only
  `reversal_doc_num` / `row_count` out of it for the report. `036:823-831`
  assigns `v_result` and appends it to `v_results` verbatim. Neither inspects
  any status field, and neither would notice a failure value.
- **Can the callees return a failure value without raising? In these files, no.**
  `cancel_document` (current revision, `031`) has exactly one `RETURN` — the
  terminal success `jsonb_build_object(...)` — and every other exit is a
  `RAISE EXCEPTION`: session missing, non-admin, no valid doc number, document
  not found, transfer sent to the wrong function, mixed types, unsupported type,
  already a reversal, already cancelled, insufficient balance, no rows to
  cancel. There is no `RETURN` carrying an error status and no early `RETURN NULL`.
  The layer callees follow the same discipline.

So the guarantee holds **because the callees raise, not because the batch checks
them**. That is a real fragility worth recording: the batch functions have no
defence if a callee is ever changed to return a status instead of raising. It is
a note for whoever next edits that SQL, not a finding against I-5, and it is
explicitly **not** a justification for expanding this milestone into SQL repairs.

And it holds only for these rank-4 file bodies. Against the DEPLOYED functions
the property is **UNKNOWN** (§4.1). I-5's UI must not be built as if the
guarantee were certain — which is exactly what §5.3 ensures, since the
unconfirmed outcome is safe whether or not the server committed.

### 5.3 The four outcomes I-5 must render

The client can distinguish four states. Each has its own message, its own effect
on the selection, and its own resubmission rule.

| # | outcome | how it is recognised | what actually happened |
|---|---|---|---|
| **A** | **Confirmed success** | transport succeeded, `error` is null, a well-formed `data` object came back (§4.4) | every selected document was cancelled |
| **B** | **Confirmed rejection** | transport succeeded and the server returned a structured PostgREST error (a `code`/`message` body — a raised exception, a permission refusal, a constraint violation) | the transaction rolled back; **nothing was written** |
| **C** | **Unknown outcome** | transport failed, or the response is ambiguous: network error, abort, timeout, a gateway status (502/503/504) with no PostgREST error body, an unparseable body, or an `ok` whose body is malformed per §4.4 | the batch was either fully committed or fully rolled back, and the client **cannot tell which** |
| **D** | **Success, then refresh failure** | outcome A was reached, and the subsequent reload failed | the documents WERE cancelled; only the on-screen list is stale |

Outcome D stays a separate outcome, exactly as §8 requires — it is never folded
into B or C. The distinction between B and C is the correction this section
exists to make; the distinction between A and D is §8's, and both stand.

**Recognising B versus C is the load-bearing classification.** The rule: a
confirmed rejection requires positive evidence from the SERVER that it rejected
— a PostgREST error body carrying a `message`, which is what a `RAISE EXCEPTION`
in these RPCs produces. Absence of a response, or a response the client cannot
parse, is never evidence of rejection. The API layer must therefore preserve
enough of the failure to classify it; the current `failure(message(err))` shape
collapses transport rejections and server errors into one string and **cannot**
support this. The wrappers must additionally carry a discriminator
(`outcome: 'rejected' | 'unknown'`) derived from whether a structured
PostgREST error body was present. This is an API-layer change inside I-5's
scope; it changes no RPC.

When classification is itself uncertain, **classify as C.** C is the safe
default: it is honest under both database states, and its only cost is a
reconciliation the user must perform.

### 5.4 Required behaviour per outcome

**A — confirmed success.** Report the cancellation with the server-reported
count, or count-free if the count is unusable (§4.4). Clear the selection. Keep
the execute button disabled. Proceed to the refresh (§8).

**B — confirmed rejection.** Report the server message verbatim (plan §3.7),
stating plainly that no document was cancelled and the batch is unchanged. The
selection is PRESERVED so the user can correct and retry. Re-enable execute:
retry is safe here, because the server is known not to have written. This is the
only outcome where the "nothing was written" wording is true, and it is the only
outcome where automatic re-enablement is correct.

**C — unknown outcome. This is the outcome the earlier draft erased.**

1. **Message.** Do not claim success and do not claim failure. State that the
   result could not be confirmed: the request was sent, the answer did not
   arrive, and the cancellation may or may not have been applied.
2. **Preserve the submitted document list.** The exact `p_doc_nums` payload as
   sent is retained and DISPLAYED, so the user knows precisely which documents
   to reconcile. It is not cleared, not filtered, not silently reduced.
3. **Prevent automatic resubmission.** No retry button, no auto-retry, no
   re-enabled execute button for this payload. `inFlight` (§7) is released so
   the UI is not frozen, but the execute path stays blocked for this submitted
   set. A blind resubmission is exactly the harm §7 describes: if the first call
   committed, the second aborts against already-cancelled documents and reports
   a failure for a batch that in fact succeeded.
4. **Require reconciliation.** The only route forward is to refresh and inspect
   the actual state of the listed documents. The UI directs the user there
   explicitly. Once refreshed data shows the documents cancelled, outcome C
   resolves to "already done"; if they are not cancelled, the user may select
   them again — a NEW selection, built from fresh rows through the normal §6
   recheck, not a replay of the retained payload.
5. **Never fold C into A or B for convenience.** Not in the toast, not in
   telemetry, not in tests.

**D — success then refresh failure.** §8, unchanged: the cancellation is
reported as succeeded, the refresh failure is reported separately as a stale
list, and execute stays disabled.

### 5.5 Partial results

**None by design, subject to §5.2.** Given these rank-4 bodies, no
`cancelled_count < selected` success state exists: if the RPC returns ok, every
selected document was cancelled. So I-5 renders one all-or-nothing outcome for
A, never a per-document result table — though both RPCs return a `results`
array, which is useful for a success detail view only.

Note the limit of that statement precisely, since §4.4 established that the
count is a selected-count: `cancelled_count` could not report a partial result
even if one occurred, because it is not derived from what was cancelled. The
all-or-nothing claim rests on the transaction semantics of §5.2, **not** on the
count agreeing with the selection. The UI must not present the count as
corroboration of atomicity.

## 6. Rechecking before submission

The legacy flow has a real gap I-5 must close.

`BC.docs` is built ONCE by `batchCancelOpen()` (`5374-5378`) and never rebuilt.
`renderBatchConfirm()` re-filters on `d.eligible` (`5454`), but that flag comes
from the same stale snapshot, so it is not a fresh check. Between opening the
dialog and pressing execute, another admin can cancel a document, and legacy
will still submit it. The server catches it (`Bu sənəd artıq ləğv edilib`) and
aborts the WHOLE batch — so the user loses every other document too, with a
message naming one they did not touch.

I-5 recomputes eligibility from the CURRENT store rows immediately before
submitting, using the same shared helper the render gate uses — the two-call
pattern I-4 established for `rowActionEligibility()` (render gate and submit
gate are two calls to one function; the rule is never duplicated). Any selected
document that has become ineligible is removed from the payload, named in the
dialog, and the user re-confirms. Nothing is sent silently.

The submit-time recheck is not redundant with the render gate: the store can
change between React committing an enabled button and the handler running.

## 7. Duplicate-submit protection

Legacy sets `btn.disabled = true` and keeps no state flag (`index.html:5489`),
re-enabling it only in the `catch` (`5502`). A re-render can re-enable it
mid-flight — the weakness the plan already records at §3.9.

I-5 uses the H-4 pattern the rest of Phase 8 uses: one `inFlight` flag set
BEFORE the first `await` and released in a `finally` on every path — refusal,
rejection, success. The button's `disabled` and the handler read the SAME value
(`M7-S5`, one gate). A second click calls nothing.

This matters more for batch than anywhere else: a duplicated batch submit whose
first call succeeded would resend the same document numbers, and the server
would reject them as already cancelled — aborting a batch the user believes is
still pending.

**`inFlight` is not the resubmission gate.** The two are separate, and §5.3's
outcome C is why. `inFlight` answers "is a call in progress" and is always
released in the `finally`, so the UI never freezes. Whether execute is
re-enabled afterwards is decided by the OUTCOME:

| outcome | `inFlight` after | execute re-enabled |
|---|---|---|
| A confirmed success | released | **no** — selection cleared, nothing to resend |
| B confirmed rejection | released | **yes** — the server is known not to have written, so retry is safe |
| C unknown outcome | released | **no** — blocked for this submitted payload (§5.4) |
| D success + refresh failure | released | **no** — §8 |

Only outcome B re-enables. An implementation that re-enables execute in the
`finally` — the natural reading of "released on every path" — would reintroduce
precisely the blind-resubmission hazard this section exists to prevent, in the
one case where it is most damaging.

## 8. Refresh failure — a legacy bug not to port

`batchCancelExecute()` (`index.html:5491-5504`) puts `await loadFromDB()`,
`loadAuditTotal()` and `renderAll()` INSIDE the same `try` as the RPC. A refresh
that fails AFTER a successful cancellation therefore lands in the `catch` and
shows:

> `Qrup üzrə ləğv baş tutmadı: … — heç bir sənəd ləğv edilmədi`

which is **false**: the documents were cancelled. The user is told the opposite
of what happened, and the button is re-enabled, inviting a duplicate submit.

I-5 separates the two phases. The RPC outcome is decided and reported first; the
refresh is attempted afterwards and its failure produces a distinct message —
the cancellation succeeded, the on-screen list may be stale, retry the refresh.
The execute button stays disabled after a successful RPC regardless of the
refresh result.

This is compatible with `M8-45`, already implemented: a failed refresh keeps the
previous snapshot whole rather than blanking the screen
(`movements.store.ts:178`, `MovementsPage.tsx:265`).

**Refresh failure after outcome C is not outcome D.** D presupposes a CONFIRMED
success. If the refresh fails after an unconfirmed outcome, the state is still
C: the result was never confirmed, and the user now also cannot reconcile it
from the screen. The message must say both — the cancellation could not be
confirmed AND the list could not be refreshed — and execute stays blocked for
that payload. Collapsing this into D would assert a success that was never
observed.

## 9. Scope boundary

**In:** batch selection UI, filters, eligibility mirror, submit-time recheck,
`inFlight`, atomic execute, the four-outcome classification and its messaging
(§5.3-5.4), the `outcome: 'rejected' | 'unknown'` discriminator in the two batch
wrappers, the layer `cancelled_count` / `document_count` fix and its malformed-
response handling (§4.4), tests and mutation checks.

**Out:** any live write or RPC execution; any SQL, schema, RLS, grant or
migration change; fixtures; dependency or env changes; `index.html`; staging;
commits; deployment. `D1`, `D3`, `D5` stay open. No Phase 7 status moves. No
`M8-*` row becomes `LIVE VERIFIED`.

## 10. Unresolved decisions

- **D3 itself** — user approval to run I-5 in Phase 8 (this proposal recommends
  yes).
- **The layer batch asymmetry (restated after correction).** The earlier draft
  offered an option (c) — "treat it as a server defect and raise a separate SQL
  task". **Option (c) is WITHDRAWN.** It rested on comparing outer function
  bodies only; §4.2 shows the layer callees each take advisory and row locks and
  pre-validate before writing, so the difference is one of lock-acquisition
  ordering and failure timing, not an absence of protection. No defect has been
  demonstrated, and nothing here justifies opening a SQL task.

  The remaining choice is narrow: (a) port faithfully and state the weaker
  pre-flight guarantee in the UI, or (a)+(b) additionally pre-validate every
  selected document client-side before calling the layer RPC.
  *Recommendation: (a) plus (b)* — the client pre-check is an honest UX
  improvement that changes no server behaviour and is already required by §6's
  submit-time recheck, so (b) costs nothing extra.

- **Outcome classification requires an API-layer shape change (§5.3).** The
  wrappers currently collapse transport failures and server rejections into one
  `failure(message(err))` string, which cannot distinguish outcome B from
  outcome C. I-5 needs them to carry an `outcome: 'rejected' | 'unknown'`
  discriminator. This is inside I-5's scope and changes no RPC, but it modifies
  two functions that the I-4 audit already signed off, so it is flagged rather
  than assumed.

- **Post-`C` reconciliation is manual (§5.4).** After an unconfirmed outcome the
  user must refresh and inspect the listed documents themselves; I-5 adds no
  automatic reconciliation query and no "check status" RPC. Confirm this is
  acceptable, or the alternative — a read-only re-query of the submitted
  document numbers to resolve C automatically — becomes a scope addition needing
  approval.
