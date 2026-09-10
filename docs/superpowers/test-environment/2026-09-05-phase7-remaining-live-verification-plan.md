# Phase 7 — remaining live-verification plan (TEST project)

**Status: PLAN ONLY.** Nothing in this document has been executed. No SQL was
run, no fixture was created, no Supabase row was mutated, no application code
was changed. This is the proposal Codex is asked to approve or reject scenario
by scenario.

**Audit verdict: `PLAN APPROVED AS A DECISION DOCUMENT; NO LIVE WRITE BATCH
APPROVED OR EXECUTED.`**

**Phase 7 status: INCOMPLETE / NOT ACCEPTED.** Nothing in this plan changes that.
Executing every batch below would still leave rows deferred to Phase 8, one row
**blocked by live server behaviour** (§0.-2), and a further set unrunnable for
want of an execution mechanism (§0.3A). See §4.

**Revision 5 (2026-09-05).** Fourth reciprocal audit. **S-6 is removed from the
executable plan and recorded as `BLOCKED — live server/RPC gap`** (§0.-2): the
explicit condition-split path cannot produce the audit row its own reversal
needs, because `apply_cond_split` mutates the source bucket *before* it logs and
`log_icare_exposure` then recomputes an exposure of 0. Running S-6 would write
condition state that no normal reversal restores. **M5/M6 are additionally
marked `BLOCKED pending execution mechanism / user approval`** (§0.3A): the
Supabase SQL Editor does not carry a browser user's `auth.uid()`, and all three
RPCs this plan schedules refuse a NULL one. Revisions 1–4 corrections are
preserved except where §0.-2 and §0.6 explicitly withdraw them.

**Revision 4 (2026-09-05).** Third reciprocal audit — five execution blockers.
Four accepted, one **partly rejected on primary evidence** (§0.-1). Two were
plan-breaking: S-2a/S-2b were **not reachable at all** through the React flow
(the client refuses before the server ever sees the request), and S-6's İcarə
reversal depended on an audit row that `apply_cond_split` **does not
unconditionally write** — `log_icare_exposure` recomputes exposure and returns
early when the source still holds free stock. Revisions 1–3 corrections are
preserved unchanged in §0.0 and §0.1.

**Revision 3 (2026-09-05).** Second Codex reciprocal audit. Six new findings;
**all six independently verified against the live function bodies and the React
source before acceptance** (§0.0). One was a latent data-loss-of-evidence bug:
every transfer reversal in revision 2 named an RPC that **refuses transfers
outright**, so every transfer cleanup would have failed at run time. The nine
revision-1 corrections are preserved unchanged in §0.1.

**Revision 2 (2026-09-05).** First Codex reciprocal audit. Nine findings, all
verified and accepted (§0.1). Revision 1 scheduled an admin transfer the React
picker cannot reach, and scheduled `correct_document` (S-9) through a UI entry
point that does not exist in Phase 7.

- Target project: `alkjjbaawmsirsfvqljm` (`anbar-test`) only. Production was not
  inspected for this plan.
- Source of the contract facts below: the read-only captures already in this
  directory (`production-functions-2026-09-03.json`,
  `production-schema-2026-09-03.json`), the approved spec
  `../specs/2026-09-04-phase7-registry-rows.md`, and the React implementation
  under `web/src/`.
- Verified TEST inventory taken as given: 1 public user (`admin`), 0 `partners`,
  0 `stock_conditions`, 0 `stock_layer_settings`, **2 warehouse rows of which
  exactly one has `type='anbar'`**, 5 movements. Automated baseline:
  **1649 tests / 93 files**.
- **No fixed item balance is assumed anywhere in this plan.** See §0.4 and §2A.

---

## 0.-2 S-6 is BLOCKED — a live server/RPC gap, independently verified

**Disposition: ACCEPTED in full. S-6 is removed from every executable batch,
preflight, cleanup step and total.** This is **not** a React failure and not a
fixture-design failure. It is a defect in the interaction between three live
server functions, and no arrangement of test data reachable through this plan
works around it.

### The call order — verified against the captured body

`apply_cond_split(text,text,text,jsonb,numeric,text,text,text)`, second loop:

```
line 45:  PERFORM public.apply_cond_delta(p_src, p_item_code, v_k, -v_v);   -- mutate source
line 47:  PERFORM public.apply_cond_delta(p_dst, p_item_code, v_k,  v_v);   -- mutate dest
line 59:  IF v_k = 'icare' THEN
line 60:    PERFORM public.log_icare_exposure(p_src, p_item_code, v_v, ...); -- log AFTER
```

`apply_cond_delta` with `v_k = 'icare'` delegates immediately:
`IF v_k = 'icare' THEN PERFORM public.apply_icare_delta(v_wh, v_code, v_d); RETURN;`
— so the source `icare_qty` is **already reduced** by the time line 60 runs.

And the movement rows do not exist yet: `post_transfer_document` calls
`apply_cond_split` at its line 138, while `INSERT INTO public.movements` is at
lines 148 and 154 of the same loop iteration. **The balance is still the
pre-transfer balance when logging happens.**

### The arithmetic, with the revision-4 preconditions B = I = v = 1

`log_icare_exposure` does not record the quantity handed to it. It recomputes:

```
v_exp := icare_exposure(p_warehouse, p_item_code, p_out_qty)
       = GREATEST(p_out_qty - GREATEST(balance - icare_qty, 0), 0)
IF COALESCE(v_exp, 0) <= 0 THEN RETURN;    -- no audit row is written
```

Substituting the state that actually holds at line 60:

```
balance   = 1     (movement INSERT has not run)
icare_qty = 0     (line 45 already subtracted v_v = 1 from I = 1)
p_out_qty = v_v = 1

icare_exposure(1) = max(1 - max(1 - 0, 0), 0)
                  = max(1 - 1, 0)
                  = 0                       -> RETURN, no audit row
```

`cancel_transfer_document` then runs its `<<031-fix §12>>` lookup, sums
`from_icare` over zero matching rows, obtains `v_exp = 0`, and its
`IF v_exp > 0 THEN` guard is false. **Neither `apply_icare_delta(source, +v_exp)`
nor `apply_icare_delta(dest, -v_exp)` runs. The condition transfer is not
reversed.**

### Revision 4's precondition was wrong, and is withdrawn

Revision 4 (§0.-1, closing note) required `B_src = I_src` so that the audit row
would be written. **That is exactly the case that guarantees it is not.** The
error was applying the exposure formula to the *pre-split* `icare_qty` when the
executable order applies it to the *post-split* value. Withdrawn.

### There is no reachable fixture that fixes this

Solving `icare_exposure(v, B, I - v) > 0` over the values the split itself
permits (`v <= I`, and `v <= q <= B`):

```
exposure = max(v - max(B - (I - v), 0), 0) = max(v - max(B - I + v, 0), 0)
positive  <=>  B - I + v < v  <=>  B < I
```

**The audit row is written only when `icare_qty` exceeds the movement balance** —
a warehouse recorded as having more units out on rent than it holds in stock.
`set_stock_condition` does permit reaching that state (it returns
`exceeds_balance` as an informational flag and never raises on it), but doing so
deliberately would mean fabricating an internally inconsistent inventory in
order to make an audit trail appear. **This plan does not propose that.** It is
the definition of adjusting the fixture to fit the expectation, which §2's own
stop conditions forbid.

### The consequence that makes this blocking rather than merely deferrable

If S-6 were run as revision 4 specified:

| # | Effect | Reversible? |
|---|---|---|
| 1 | Source `icare_qty` 1 → 0 (`apply_cond_delta`) | **No** — the reversal reads exposure 0 and skips the restore |
| 2 | Destination `stock_conditions` row created at `icare_qty` 1 | **No** — same skipped branch |
| 3 | 2 `movements` rows | Yes — `cancel_transfer_document` reverses the quantities normally |

**The movement quantities would be reversed while the condition state stayed
transferred**, leaving TEST holding an İcarə figure at a warehouse that, by the
movement ledger, never received the goods. Restoring it would require direct
`set_stock_condition` calls against **two** warehouses to repair state the
system's own reversal path was supposed to handle — a manual repair of a
silent server-side failure, not a cleanup. **That is why S-6 is blocked rather
than merely re-parameterised.**

### Scope statement

**No Supabase change is proposed, designed or scheduled by this task.** The
finding is recorded; the remedy is a user decision (§7 decision 8). Preserving
current server behaviour and leaving the row blocked is a legitimate outcome.
A server fix, if ever authorised, is a **separate investigation with its own
audit and approval** — it is explicitly **not** folded into any migration or
implementation scope here.

### What this costs the registry

`M7-120`'s condition-split half was the only row S-6 served. It stays
`CODE VERIFIED` and is now additionally annotated `BLOCKED — live server/RPC
gap` (§4). The İcarə half of `M7-120` is unaffected: **S-5 remains
independently executable** and keeps its own fixture, evidence and cleanup
(§2 S-5, §5 Batch 2).

## 0.-1 Reciprocal audit — the five revision-4 execution blockers

Each blocker was checked against the captured function bodies and the React
source before disposition. **Four accepted; one partly rejected**, because the
arithmetic it asserted is contradicted by the document's own table.

| # | Blocker | Disposition | Independent evidence |
|---|---|---|---|
| 1 | S-2a/S-2b unreachable through the stated React flow | **ACCEPTED — both were unreachable, and for two different reasons** | S-2a: `ROLE_PERMS.rehber = []` (`lib/roles.ts:26`), so `can(me,'mv.add')` is false, `selectCanPost` returns false (`operation.store.ts:901-908`), and `onPost()` returns at `if (!canPost) return` (`NewOperationPage.tsx:511`). **The request is never sent; the server RAISE never fires.** S-2b: `selectTransferSources` = `transferSourceWarehouses(me, …)`, which for an anbardar returns `[me.wh]` only (`warehouseScope.ts:68`) — a refreshed anbardar client cannot name a foreign source. Rebuilt as stale-admin-tab sequences in §2 S-2a/S-2b and §2D |
| 2 | `cancel_document` does not restore `icare_qty` for `Silinmə`/`Satış` | **ACCEPTED — verbatim correct** | `cancel_document` calls `apply_icare_delta` in exactly two branches: `IF r.type = 'İcarə'` (inbound leg) and `IF r.type = 'Qaytarma'` (outbound leg). A `Silinmə`/`Satış` outbound matches neither, so the movement is reversed and `icare_qty` stays at **I − 1**. *(Rev-5: the remedy changed. S-6 is `BLOCKED` (§0.-2), so rather than restoring I for S-6's benefit, S-5 now deletes its own fixture outright in a final `set_stock_condition(…,0,NULL)`. The underlying fact is unchanged and is asserted at Q-6 checkpoint 3.)* |
| 3 | Batch 7 runs after retirement and after its fixtures are disabled | **ACCEPTED** | Batch 5 step 28 ends `active=FALSE` (or DELETEs) `stock_layer_settings`; Batch 6 sets `users.active=false` and deactivates `CODEX-P7-ANBAR-2`. S-7 needs layer settings **active**, a live posting identity, and — for `post_layer_transfer_document` — a second active `type='anbar'` warehouse. Batch 7 becomes an **alternative branch (Batch 5-ALT)** taken *instead of* Batch 5, before Batch 6 (§5) |
| 4 | Recalculate the write ledger | **ACCEPTED.** *(Rev-5: the partial rejection recorded here is **WITHDRAWN** — see the note below the table.)* | **Accepted:** the *composition* was wrong — the S-5 `apply_icare_delta` UPDATE, the second S-6 condition mutation, both S-6 reversal mutations, and the conditional inbound were all missing or understated. Ledger rebuilt as a **conditional** total in §6 |
| 5 | Q-1…Q-5 unsafe / non-executable | **ACCEPTED** | `:name` is a client bind placeholder; the Supabase SQL Editor executes raw SQL and rejects it. `doc_num NOT IN (:known_docs)` is unsafe by construction — it asserts a negative over an open set. Q-2's `record_id LIKE '%0000001%'` matches every historical row for that item, not this batch's. All five rebuilt in §2D, plus a new Q-6 for the condition-state assertions S-5 and S-6 now make |

**Revision-5 withdrawal — blocker 4's partial rejection.** Revision 4 rejected
the premise that revision 3's visible Count values summed to **40**, asserting
they summed to **43**. **That rejection is withdrawn.** The displayed values
summed to **40**; the **43** figure was revision 3's own stated total, and
reproducing it required reading the table in a way the displayed column does not
support. Rejecting a correct observation about the document's own visible
content was not warranted, and under the reciprocal-audit rule a rejection needs
executable primary evidence that this one did not have.

**What is unaffected:** the substantive composition correction. The missing
S-5 `apply_icare_delta` UPDATE, the second S-6 condition mutation, both S-6
reversal mutations and the unrepresented conditional inbound were all real, were
verified against the function bodies, and drove the §6 rebuild. The withdrawal
concerns only the arithmetic claim about the old table's displayed column — the
figure that matters now is the **revision-5** base of **37 / 41** (§6.3),
computed from scratch rather than by adjusting any earlier total.

**Added constraint found during verification, not raised by any blocker — this
one breaks S-6 as written:**

`apply_cond_split` logs the İcarə move by calling
`log_icare_exposure(p_src, code, v_v, …)`, and `log_icare_exposure` **does not
write the passed quantity**. It recomputes

```
v_exp := icare_exposure(p_warehouse, p_item_code, p_out_qty)
       = GREATEST(p_out_qty − GREATEST(balance − icare_qty, 0), 0)
IF COALESCE(v_exp, 0) <= 0 THEN RETURN;   -- no audit row
```

So an explicit `conditions.icare = 1` writes the audit row **only if the source
has no free stock left** — i.e. only if `balance − icare_qty < 1`. Otherwise the
split still moves the bucket (via `apply_cond_delta` → `apply_icare_delta`) but
logs **nothing**, and `cancel_transfer_document`'s `<<031-fix §12>>` block reads
`v_exp = 0` and moves the İcarə figure back **not at all** — silently stranding
it at the destination.

**Revision-5 supersession.** The finding above is correct as far as it goes, but
the *remedy* it proposed is not. Revision 4 concluded that posting from a source
where **`B_src = I_src`** would make the audit row appear. **It does the
opposite**, because `apply_cond_split` subtracts the split quantity from
`icare_qty` *before* `log_icare_exposure` recomputes: at `B = I = v = 1` the
recomputed exposure is `max(1 − max(1 − 0, 0), 0) = 0`. The precondition, and
the Q-3 gate built on it, are **withdrawn**; S-6 is `BLOCKED` (§0.-2).

The general statement survives: the audit row is written only when the source
has no free stock **at the moment of logging**, which after the pre-subtraction
means only when `B < I`. §0.-2 shows why no fixture this plan may create reaches
that state legitimately.

## 0.0 Reciprocal audit — the six revision-3 findings

**All six ACCEPTED.** Each was checked against the captured function bodies and
the React source. No finding conflicted with stronger evidence, so no rejection
was warranted; three are accepted with an added constraint that the finding did
not state and that materially changes the plan.

| # | Finding | Disposition | Independent evidence |
|---|---|---|---|
| 1 | Transfers need `cancel_transfer_document`, not `cancel_document` | **ACCEPTED — this was a latent run-time failure** | `cancel_document` body: `IF EXISTS (SELECT 1 FROM movements WHERE doc_num=v_doc AND type='Yerdəyişmə') THEN RAISE EXCEPTION 'Yerdəyişmə sənədi bu funksiya ilə ləğv edilmir — cancel_transfer_document istifadə edin: %'`. Every revision-2 transfer cleanup (S-3, S-4, S-6) would have raised. `cancel_transfer_document(text,date)` exists and is the correct RPC |
| 2 | Do not deactivate `CODEX-P7-ANBAR-2` after Batch 1 | **ACCEPTED, and the constraint is stronger than stated** | S-4 and S-6 need it selectable, and `get_transfer_destinations()` filters `active = TRUE`. **Additionally:** `enforce_anbardar_warehouse()` requires the anbardar's *own* warehouse to be `type='anbar' AND active=TRUE` on every `INSERT OR UPDATE OF role, warehouse` — so deactivating a warehouse while a class B anbardar points at it would make later role UPDATEs raise. Deactivation moves to the very end (§5 Batch 6) |
| 3 | An inactive `Ofis` is not selectable through React | **ACCEPTED — it overturns revision 2's own mitigation** | `get_transfer_destinations()` returns `WHERE active = TRUE AND type='anbar'`. Revision 2 proposed `active=false` to keep `Ofis` out of pickers; that also keeps it out of the *client list*, so it can never be selected. The stale-session sequence in §2 S-2c is the only reachable path, and it requires `Ofis` **active** and temporarily visible |
| 4 | The balance contradiction: documents left in place vs. "balance 13" | **ACCEPTED** | "balance 13" traces to H-5's own posting (`CODEX-P7-IN-1`, balance 8 → 13). It is a snapshot, not an invariant, and this plan's own documents move it further. Policy P-B adopted (§0.4): **read-only preflight before every balance-dependent scenario**, quantities derived, never assumed |
| 5 | Rebuild the class B role-transition ledger | **ACCEPTED, with a correction to revision 2's wording** | `public.users.id = auth.uid()`; `current_user_role()` filters `active = TRUE`. So `active=false` neutralizes the **application** role but the **auth identity still exists and can still sign in**. Revision 2's "auth users are deactivated" was wrong. Full ledger in §2B |
| 6 | Audit rows are unverifiable through the admin UI | **ACCEPTED** | The only SELECT policy on `audit_log` is `p_audit_read`, `qual = (my_role() = 'rehber')`. An admin session reads **zero** rows. Note `my_role()` reads `role` directly and does **not** filter `active`, unlike `current_user_role()`. Read-only SQL Editor evidence queries in §2C |

**Added constraints found during verification, not raised by Codex:**

- **`trg_enforce_anbardar_warehouse` fires `BEFORE INSERT OR UPDATE OF role, warehouse`.**
  Flipping a user to `anbardar` **must set `role` and `warehouse` in the same
  `UPDATE`**, or the trigger raises «anbardar rolu üçün konkret anbar təyin
  edilməlidir». Revision 2's "flip `users.role`" as a single-column update would
  have failed. Corrected in §2B.
- **`enforce_anbardar_warehouse()` explicitly forbids `warehouse = 'Ofis'`**
  («anbardar Ofisə təyin edilə bilməz»). The S-2c anbardar must be based in a
  normal anbar and *target* `Ofis`, never be assigned to it.
- **`cancel_transfer_document` reverses the İcarə figure by reading
  `audit_log`** keyed `doc_num|warehouse|item_code`. So in S-6 the audit row is
  not merely evidence — it is an **input** to correct reversal. Recorded in §2C.

## 0.1 The nine revision-2 findings (preserved, unchanged)

All nine were verified and accepted in revision 2 and remain in force.

| # | Finding | Evidence (condensed) |
|---|---|---|
| 1 | Admin transfer unreachable — only one `type='anbar'` warehouse | `get_transfer_destinations()`: `WHERE active=TRUE AND type='anbar'`. Returns `['Test Anbar']`; source=dest → «mənbə və təyinat anbarı eyni ola bilməz» |
| 2 | «Ofis» refusal needs an `Ofis` row | Dest-existence check precedes the anbardar block, so «təyinat anbar tapılmadı» fires first. *Revision 3 note: the `active=false` mitigation proposed here is withdrawn — see §0.0 finding 3* |
| 3 | S-9 unreachable; `document_edit_impact()` caller is Phase 8 | "Q6 keeps the movements/document screen out of Phase 7 entirely… the caller is Phase 8" |
| 4 | Layer deactivation is not exact restoration | `stock_layers_supported()` returns SQL `NULL` at zero rows; `fetchLayerCapability()` maps `!data`→`ready:false` but `{active:false}`→`ready:true` |
| 5 | The `M7-117` §4 entry belongs to `M7-21` | Spec 448 = `M7-21 | Empty-result texts`; spec 608 = `M7-117 | Role behaviour` |
| 6 | M7-96 needs an outbound document to create stale state | `opStaleRecheck.ts` decides from a re-read balance; only a committed movement lowers it |
| 7 | M7-S3 needs a user-driven DevTools session | Request blocking is a browser capability, not an application one |
| 8 | Rebuild Batch 1 without admin transfer | Consequence of finding 1 |
| 9 | M7-S2 stays CODE VERIFIED; no promotion | Registry: "NOT live verified". The deterministic test is the *reason* no live run is needed |

## 0.2 What earlier revisions got wrong, stated plainly

1. **Revision 1: "2 warehouses exist" was a count without a `type` breakdown**,
   treated as proof of transfer reachability. `Test Layihə Ünvanı`
   (`type='layihə'`) is never offered as a transfer destination.
2. **Revision 1: S-9 was scheduled as executable.** Its UI entry point is Phase 8.
3. **Revision 2: every transfer reversal named an RPC that refuses transfers.**
   Not a wording slip — the cleanup step would have raised at run time, leaving
   TEST holding uncancelled transfer documents while the plan claimed reversal.
4. **Revision 2: it claimed auth identities were "deactivated".** Only
   `public.users.active` was ever being set; the auth identity was untouched.
5. **Revision 2: it relied on a fixed balance of 13** while also proposing to
   leave documents in place — mutually inconsistent (§0.4).

6. **Revision 3: S-2a and S-2b were scheduled as ordinary submissions.**
   Neither is reachable that way — the React client refuses first and sends no
   request, so the server refusals they exist to observe would never have
   fired. Revision 3 had already found this exact failure mode for S-2c and did
   not generalise it to its two siblings.
7. **Revision 3: S-6 assumed `cancel_document` restored `icare_qty`.** It does
   not, for `Silinmə`/`Satış`. S-6 would have started from `I − 1` while its
   arithmetic assumed `I`.
8. **Revision 3: S-6 assumed the split's audit row was unconditional.** It is
   written only when the source has no free stock left, so the row that
   `cancel_transfer_document` reads to reverse the İcarə move could legitimately
   have been absent — the same stranding failure revision 3 wrote a stop
   condition for, arriving through a path it had not modelled.
9. **Revision 3: Batch 7 depended on fixtures Batches 5 and 6 had retired.**

The recurring cause: **a server-side capability read as end-to-end reachability**,
and **a named RPC not checked against its own refusal branches.** Revision 4 adds
a third: **a server-side refusal read as observable without checking whether the
client ever lets the request leave the browser.** §2 now records the client path
and the exact RPC identity for every scenario; §2D records the client's cache
lifetime, which is what decides reachability for every role refusal.

## 0.3 Execution owners and mechanisms (all non-UI actions)

No step is described without naming who performs it and by what mechanism.

| Mechanism | Who | Used for | Constraint |
|---|---|---|---|
| **M1 — React UI in a normal browser** | User | All document posting; S-1 observation | The only mechanism that verifies a React path |
| **M2 — Chrome/Edge DevTools request blocking** | **User only** | S-8 | The agent's in-app browser automation cannot safely intercept this request |
| **M1s — a STALE React tab** | User (M1) driving the tab; M5 performing the flip | S-2a, S-2b, S-2c — the only mechanism that reaches any server role refusal | A variant of M1, not a new tool: an ordinary tab whose cached `me` is deliberately left behind the server's. Governed by §2C; step 5 of that invariant (no refresh, no navigation) is what makes it valid |
| **M3 — Supabase dashboard, Auth → Users** | **User only**, separately approved | Creating the two class B auth identities; any later auth-side disable/delete | The application UI offers no auth-user creation. Roles are seeded from `raw_user_meta_data` (§2B) |
| **M4 — SQL Editor, read-only SELECT** | User (agent may draft the exact query text) | **All audit evidence** (§2D); every balance preflight (§2A) | **No `INSERT`/`UPDATE`/`DELETE`/DDL in any evidence query.** Read-only by inspection before it is run |
| **M5a — SQL Editor, plain-table write** | User, per approved batch step | `warehouses` inserts/deactivations; `users` role flips; `stock_layer_settings` | Ordinary DML on tables. **No `auth.uid()` needed** — these are not RPC calls. Runnable |
| **M5b — authenticated RPC write** (`set_stock_condition`) | **BLOCKED** — see §0.3A | The İcarə fixture and its cleanup | **Not runnable from the SQL Editor.** §0.3A |
| **M6 — Reversal RPC** (`cancel_document`, `cancel_transfer_document`) | **BLOCKED** — see §0.3A | Every document reversal in this plan | **Not runnable from the SQL Editor.** Choosing the wrong RPC also raises (§0.0 finding 1) |

The agent performs **none** of M1–M6. It drafts query text, predicts expected
results, and records outcomes.

## 0.3A M5b and M6 are BLOCKED pending an execution mechanism

**Revision 4 asserted these RPCs were runnable "M5 — SQL Editor / RPC, write".
That is wrong and is withdrawn.**

**The defect.** The Supabase SQL Editor executes as a Postgres role, not as a
signed-in application user. It does **not** carry a browser session's JWT, so
`auth.uid()` returns `NULL` there. Every RPC this plan schedules refuses that
outright — verified in the captured bodies, identical first statement in all
three:

```
IF auth.uid() IS NULL THEN RAISE EXCEPTION 'İcazə yoxdur: sessiya tapılmadı'; END IF;
```

Present in `set_stock_condition`, `cancel_document` and
`cancel_transfer_document`. `post_movement_document` and
`post_transfer_document` carry the same guard, but those are reached through
M1 (the React UI) and are therefore unaffected.

The guard is not the only barrier. `current_user_role()` resolves through
`WHERE id = auth.uid() AND active = TRUE`, so even were the first check passed,
role resolution would return `NULL` and `cancel_document`'s admin check would
raise «İcazə yoxdur: yalnız Admin əməliyyatı ləğv edə bilər (rol: naməlum)».

**Mechanisms considered.**

| Candidate | Verdict |
|---|---|
| Supabase SQL Editor | **Rejected.** `auth.uid()` is NULL; all three RPCs raise |
| Transaction-local SQL impersonation (setting the request JWT claim inside a SQL session) | **NOT REJECTED, NOT APPROVED — separate candidate, blocked for this plan.** *Revision-5 correction:* revision 4 rejected this on the ground that it requires handling a service-role or signing secret. **That reason is unsupported** — setting a transaction-local claim need not involve reading a signing secret at all, so the rejection is withdrawn. The mechanism is **not thereby approved**. It is recorded as a candidate that requires an **independently reviewed, SELECT-only preflight** and **explicit user approval** before it is used for any RPC mutation. **Until both exist, it remains blocked and must not be used in this plan** |
| `curl`/REST call to `/rest/v1/rpc/...` with a user access token | **Rejected.** Requires obtaining and passing a bearer token — a credential this plan may not handle — and is a new external mechanism |
| A script or CLI added to the repo | **Rejected.** Installing dependencies or changing code is outside this task |
| The **React app's own UI** | **Partially available — see below** |
| The **legacy `index.html`** | **Rejected for TEST.** It calls all three RPCs from an authenticated session (`index.html:2174` `set_stock_condition`, `:5071` `cancel_document`, `:5249` `cancel_transfer_document`), but `SB_URL` at `index.html:752` is hard-coded to the **production** project `bbjmhaerssakbreykxiw`. Using it would execute against production; re-pointing it is a code change this task forbids |

**What the React app does and does not provide.** Phase 7's React client posts
documents (M1) but **calls none of these three RPCs** — `cancel_document`,
`cancel_transfer_document` and `set_stock_condition` appear in `web/src` only
inside the generated `types/database.ts`, with no caller in any component,
store or api module. Q6 keeps the movements/document screen out of Phase 7, so
no cancellation UI exists to reach.

**Audit verdict: `PLAN APPROVED AS A DECISION DOCUMENT; NO LIVE WRITE BATCH
APPROVED OR EXECUTED.`**

**Disposition: M5b and M6 are `BLOCKED pending execution mechanism / user
approval`.** No already-available safe mechanism has been identified. This
blocks, in order:

- every **reversal** step in Batches 1, 2, 3 and 4 — so every scenario that
  posts a document leaves it standing;
- the S-5 İcarə **fixture** and its **cleanup**, hence S-5 itself;
- consequently **Batch 2 in its entirety**, and the reversal halves of
  Batches 1, 3 and 4.

**What remains runnable without M5b/M6:** Batch 0 (S-8, zero writes) in full;
S-1; the zero-write assertions S-2a/S-2b/S-2c; the S-11 measurement; and the
M5a table writes. Anything that must be *undone* by an RPC cannot currently be
undone. **Do not post a document whose reversal depends on M6 until the
mechanism is resolved** — see §7 decision 9 and the §8 stop conditions.

## 0.4 Balance policy — P-B (resolves the revision-2 contradiction)

Revision 2 both assumed "balance 13" and proposed leaving documents in place.
Those cannot both hold. **Adopted policy: P-B — preflight, derive, never assume.**

- Before **every** balance-dependent scenario, run a **read-only** balance
  preflight (M4) and derive the scenario's quantities from the returned value.
- No scenario hard-codes a quantity that depends on prior state.
- Documents **are** reversed when a later scenario depends on the balance, using
  the **correct** RPC per §0.0 finding 1. Reversal is a compensating write, so
  the balance returns to its pre-scenario value while the row count grows.
- The canonical preflight, used verbatim throughout (M4, read-only):

```sql
-- P-B preflight. Read-only. Copy-safe: edit only the params CTE.
-- (Rev-4: the ":wh / :code" form used here in revision 3 is a client bind
--  placeholder and does not parse in the Supabase SQL Editor. Same fix as
--  §2D.0, applied to the preflight every scenario runs.)
WITH params AS (
  SELECT 'Test Anbar'::text AS wh,
         '0000001'::text    AS code
)
SELECT m.warehouse, m.item_code,
       COALESCE(SUM(m.in_qty - m.out_qty), 0) AS balance
FROM public.movements m, params p
WHERE m.warehouse = p.wh AND m.item_code = p.code
GROUP BY m.warehouse, m.item_code;
```

**A zero-row result is not a zero balance** — it means no movement row exists
for that pair at all. Treat it as `B = 0` and re-check the item code before
deriving any quantity from it.

Let **B** denote the value this returns immediately before a scenario. Every
quantity below is expressed as a function of **B**, never as a literal.

---

## 0.5 Independent review of the H-5 gap list

| Claimed gap | Verdict | Evidence |
|---|---|---|
| Anbardar permissions / server refusals (`M7-117`, `M7-118`) | **REAL, fixture-requiring** | With 1 `admin` user no anbardar or rehber session can exist. **Rev-4: all three `M7-118` refusals additionally need a stale session** (§2C) — the client refuses (a) and (b) before the request leaves the browser, exactly as it does (c). Refusal (c) needs an **active** `Ofis` row on top of that |
| Valid transfer (admin) | **REAL — not current-data reachable** | Needs a second active `type='anbar'` warehouse |
| Valid transfer (anbardar) | **REAL** | Needs the class B anbardar **and** the second anbar warehouse |
| İcarə / stock-condition split | **SPLIT VERDICT (rev-5).** İcarə half: **REAL**, covered by S-5 — `icare_exposure()` returns 0 with no `stock_conditions` row, and the fixture is one RPC call. Condition-split half: **BLOCKED — live server/RPC gap** (§0.-2), not a fixture gap at all |
| Layer paths | **REAL, STRUCTURAL** | `stock_layers_supported()` returns `NULL` at zero rows; `get_stock_layers` raises «Partiya uçotu aktiv deyil» |
| `M7-96` stale-stock recheck | **REAL, every branch needs a setup write** | Only a committed outbound movement lowers the re-read balance |
| `M7-S2` partial-page failure | **NOT a fixture gap** | `PAGE_SIZE = 1000` in both API modules. See §3 |
| `M7-S3` load failure | **Reachable with no DB fixture — needs a user-driven browser** | See S-8 |
| `correct_document` + audit consequence | **DEFERRED TO PHASE 8** | See S-9 |
| `M7-123` remaining measurement | **REAL, exactly ONE read** | Only read 10, `get_stock_layers` |

**`M7-107`** stays `CODE VERIFIED`: the absence of a request-key parameter is a
captured live schema fact. No runtime test can prove a parameter that does not exist.

---

## 1. Fixture classification

### Class A — ordinary reversible TEST data
Rows created through normal application RPCs, `CODEX-P7-*` namespace.
- `stock_conditions` via `set_stock_condition()`. **Reversible by deletion:** the
  `IF v_sum = 0 AND v_note IS NULL` branch executes `DELETE` and sets
  `v_action := 'DELETE'`. The cleanup call itself writes one `audit_log` row.
  **Two rev-5 caveats.** (i) Reversibility holds only for state written *by*
  `set_stock_condition`; a bucket moved by `apply_cond_split` on a transfer is
  **not** restored by any normal reversal (§0.-2), which is what blocks S-6.
  (ii) The call needs an authenticated session and is therefore **M5b —
  currently `BLOCKED`** (§0.3A).
- Movement documents via the React UI. **Reversible only by reversal:**
  `cancel_document` (non-transfers) / `cancel_transfer_document` (transfers)
  write compensating rows; the row count grows.

### Class A′ — ordinary TEST data that is *reference* data
A `warehouses` row is ordinary DML but is **reference data the whole project reads**:
- `warehouses.name` is the FK target of `movements.warehouse`
  (`movements_warehouse_fkey`), so a row referenced by any movement
  **cannot be deleted**, only deactivated;
- it changes what every warehouse picker offers for every user;
- **an active anbar warehouse is a precondition of `enforce_anbardar_warehouse()`**
  for any user based there — deactivating it breaks later role UPDATEs (§0.0 f2);
- for `Ofis`, the name is product-meaningful and the row must be **active** to be
  selectable at all (§0.0 f3).

Required if approved: `CODEX-P7-ANBAR-2` (`type='anbar'`, `active=true`) and —
**separately** — `Ofis` (`type='anbar'`, `active=true`, temporarily visible).

### Class B — structural fixtures: auth identities and role mappings
New Supabase **auth** identities (M3) each producing a `public.users` row via
`handle_new_auth_user()`, which seeds `role` and `warehouse` from
`raw_user_meta_data`. Removing them is an auth-side action, not an application one.

### Class C — structural configuration: layer settings
One `stock_layer_settings` row (`singleton=TRUE`, `active=TRUE`), switching the
project into layer mode. Two irreversibility problems:
1. **Movement residue** — `stock_layers` rows no application path removes.
2. **Probe-state residue** — zero rows → `ready:false`; one inactive row →
   `ready:true, active:false`. Exact restoration needs a DELETE (class D).

### Class D — structural deletion
A DELETE against a configuration table with no application path. One candidate:
removing the `stock_layer_settings` singleton. **Separate approval from the
class C insert that creates the need for it.**

---

## 2. Scenario matrix

Every scenario names its client path, its exact RPC identities, and its owner.

### S-1 · Anbardar client-side scoping (`M7-117`)

| Field | Value |
|---|---|
| Class | Requires auth/role fixtures |
| Owner | M3 (fixture) + M1 (observation) |
| Client path | `allowedWarehouses` / `transferSourceWarehouses` in `OperationForm.tsx` |
| Setup writes | 1 auth identity + 1 `public.users` row (auto, via trigger) + **T1**, the promotion to `anbardar` — rev-4: the identity is now seeded `admin` (§2B), so S-1 cannot observe anbardar scoping until T1 has run and the client has been **refreshed or signed in afresh**. This is the one scenario that needs a *fresh* cache, not a stale one |
| Scenario writes | **ZERO — read-only observation** |
| «Ofis» half | Vacuous unless `Ofis` exists: `transferDestWarehouses()` filters a name never in the list. Assert only the warehouse-scoping half here |
| Cleanup writes | None in this batch — the identity is reused by S-4/S-2 and retired in Batch 6 |
| Stop condition | `handle_new_auth_user()` yields an unexpected role or warehouse; **or** the client still shows every warehouse after T1 — that means the tab was not refreshed and is testing the stale admin cache, not anbardar scoping |

### S-2 · Server role refusals (`M7-118`) — three distinct refusals

**Revision-4 correction: none of the three is ordinary.** All three require the
same stale-admin-tab technique, for the same structural reason — the React
client derives every gate from a **cached** `me`, and the cache is written
exactly twice (login, and one mount-time restore effect). §2D states the
technique once; each scenario below names only its own deltas.

**S-2a · rehber role refusal — stale-admin-tab sequence (rebuilt)**

Revision 3 asserted a rehber "submits and is refused". **It cannot submit.**
`ROLE_PERMS.rehber = []`, so `can(me,'mv.add')` is false, `selectCanPost`
returns false, and `onPost()` returns at its first line. The button is inert and
**no request reaches the server** — the `RAISE` this scenario exists to observe
would never fire. The rehber identity must therefore be flipped *underneath* an
already-loaded admin tab.

| Step | Action | Owner | Writes |
|---|---|---|---|
| 1 | Sign in **tab A** as `CODEX-P7-REHBER` **while its `public.users.role` is still `admin`** (§2B seeds it that way). `App.tsx` caches `me.role='admin'` | M1 | 0 |
| 2 | In tab A, build a complete, valid **transfer** line (source `Test Anbar` → dest `CODEX-P7-ANBAR-2`, q = 1). Do **not** submit. Confirm the post button is enabled — that is the proof the client gate is open | M1 | 0 |
| 3 | Flip the server-side role to `rehber` **without refreshing tab A**: `UPDATE users SET role='rehber', warehouse=NULL WHERE id=…`. No trigger constraint applies — `trg_enforce_anbardar_warehouse` only guards the `anbardar` case | M5 | 1 `UPDATE users` |
| 4 | Submit from the stale tab A | M1 | **ZERO — the assertion** |
| 5 | Expect the server refusal «İcazə yoxdur: "%" rolu yerdəyişmə əlavə edə bilməz». A *client* toast «İcazəniz yoxdur.» instead means the tab refreshed and the test is void — re-run, do not record | — | — |
| 6 | Restore: `UPDATE users SET role='admin', warehouse=NULL WHERE id=…` | M5 | 1 `UPDATE users` |

Tabs/sessions: **1 tab, 1 browser session.** Role transitions: **2**
(admin→rehber, rehber→admin).

**S-2b · foreign-source refusal — stale-admin-tab sequence (rebuilt)**

Revision 3 assumed a refreshed anbardar could name a foreign source. **It
cannot.** `selectTransferSources` → `transferSourceWarehouses(me, …)` returns
`[me.wh]` for an anbardar (`warehouseScope.ts:68`), so `CODEX-P7-ANBAR-2` is
never offered as a source and the payload the server must refuse cannot be
built. Same technique, different flip target.

| Step | Action | Owner | Writes |
|---|---|---|---|
| 1 | `CODEX-P7-ANBARDAR` must be **`role='admin'`** at this moment. After T1 it is `anbardar`, so **T2 must precede this scenario** (§2B, §5 ordering) | M5 | (counted as T2) |
| 2 | Sign in **tab B** as `CODEX-P7-ANBARDAR` while it is admin; the cached `me.role='admin'` makes every warehouse a legal source | M1 | 0 |
| 3 | In tab B, build a transfer whose **source is `CODEX-P7-ANBAR-2`** (the foreign warehouse) and whose dest is `Test Anbar`, q = 1. Do not submit | M1 | 0 |
| 4 | Flip: `UPDATE users SET role='anbardar', warehouse='Test Anbar' WHERE id=…` — **both columns in one statement** (T3-equivalent constraint) | M5 | 1 `UPDATE users` |
| 5 | Submit from stale tab B | M1 | **ZERO — the assertion** |
| 6 | Expect «yalnız öz anbarınızdan yerdəyişmə edə bilərsiniz». The source named (`CODEX-P7-ANBAR-2`) is not `current_user_warehouse()` (`Test Anbar`), which is exactly the branch under test | — | — |
| 7 | Restore: `UPDATE users SET role='admin', warehouse=NULL WHERE id=…` | M5 | 1 `UPDATE users` |

Tabs/sessions: **1 tab, 1 browser session** — but it is a *different* identity
from S-2a, so S-2a and S-2b together use **2 tabs across 2 sessions**, and they
may run concurrently only if each tab holds its own identity. Role transitions
for S-2b: **2** (admin→anbardar, anbardar→admin), **plus** the T2 that had to
precede step 2.

**S-2c · «Ofis» refusal — reachable stale-session sequence (rebuilt in rev 3)**

Revision 2's `active=false` mitigation is **withdrawn**: an inactive `Ofis` is
never returned by `get_transfer_destinations()`, so it can never be selected.
The store loads `transferDests` **once** in `load()` and holds it
(`operation.store.ts:744,773`); `fetchMe` likewise reads `users` once at sign-in.
That caching is what makes the sequence reachable:

| Step | Action | Owner | Writes |
|---|---|---|---|
| 1 | Create `Ofis` (`type='anbar'`, **`active=true`**). It is now visible in every picker for every user | M5 | 1 `warehouses` row |
| 2 | Sign in as `CODEX-P7-ANBARDAR` **while its `public.users.role` is still `admin`**, open the operation screen, let `load()` cache `transferDests` including `Ofis`, and select `Ofis` as destination | M1 | 0 |
| 3 | Flip the server-side role to `anbardar` **without refreshing the client**: one `UPDATE users SET role='anbardar', warehouse='Test Anbar' WHERE id=…`. **Both columns in one statement** — `trg_enforce_anbardar_warehouse` fires `BEFORE UPDATE OF role, warehouse` and raises if `warehouse` is absent or not an active anbar | M5 | 1 `UPDATE users` |
| 4 | Submit from the stale tab | M1 | **ZERO — the assertion** |
| 5 | Expect exactly «Sətir 1: Ofisə yerdəyişməyə icazəniz yoxdur». Any other message — especially «təyinat anbar tapılmadı» — means the fixture is wrong, not the code | — | — |
| 6 | Restore: `UPDATE users SET role='admin', warehouse=NULL`; then deactivate `Ofis` | M5 | 2 UPDATEs |

Constraints verified for this sequence:
- The anbardar's **own** warehouse must be a normal anbar.
  `enforce_anbardar_warehouse()` raises «anbardar Ofisə təyin edilə bilməz» if
  `warehouse='Ofis'`. The user is based in `Test Anbar` and *targets* `Ofis`.
- The dest-existence check has no `active` filter, so step 6's deactivation does
  not retroactively invalidate the evidence already recorded.
- **`Ofis` is temporarily visible to every user in every picker** between steps 1
  and 6. That exposure is the reason this needs separate approval (§7 decision 2).

**If any step cannot be demonstrated end to end, refusal (c) stays
`CODE VERIFIED`** — a legitimate closure, not a gap.

### S-3 · Valid transfer — admin path

| Field | Value |
|---|---|
| Class | Runnable after ordinary TEST-data approval (class A′) — *not* current-data ready |
| Owner | M1 (post) + M4 (preflight, evidence) |
| Client path | `fetchTransferDestinations()` → `get_transfer_destinations()`. Returns `['Test Anbar']` today; admin passes it through unchanged, so source=dest and `opLineValidation` refuses with `same-wh` |
| Why the fallback does not save it | The fallback triggers only on error or an **empty** array. A non-empty one-element array yields `ok:true` — no fallback, and `Test Layihə Ünvanı` is never offered |
| Setup writes | 1 `warehouses` row (`CODEX-P7-ANBAR-2`) |
| **Preflight (P-B)** | Read B for (`Test Anbar`, `0000001`). **Require B ≥ 1**; transfer **q = 1** |
| Expected arithmetic | `Test Anbar` → B − 1; `CODEX-P7-ANBAR-2` → +1 |
| Scenario writes | 2 `movements` rows (one out, one in) under one `SND-*` doc number + the `movements_audit` consequence |
| **Reversal RPC** | **`cancel_transfer_document(doc, date)`** — *not* `cancel_document`, which refuses `Yerdəyişmə` outright |
| Reversal writes | 2 compensating `movements` rows under a **`SND-R-*`** doc number, note «Ləğv (əks yerdəyişmə): \<doc\>». Balance returns to B; row count grows by 2 |
| Fixture cleanup | **Not here.** `CODEX-P7-ANBAR-2` stays active for **S-4** and is deactivated only in Batch 6 (§0.0 f2). *(Rev-5: S-6 also required it; S-6 is `BLOCKED` (§0.-2), so S-4 and Batch 5-ALT are now the only consumers.)* |
| Stop condition | Balance moves by anything other than q |

### S-4 · Valid transfer — anbardar path

| Field | Value |
|---|---|
| Class | Requires auth/role fixtures + class A′ |
| Owner | M1 + M4 |
| Prerequisite | `CODEX-P7-ANBARDAR` **and** an active `CODEX-P7-ANBAR-2`. Source must equal `current_user_warehouse()` = `Test Anbar` |
| Setup writes | None additional (reuses S-1 and S-3 fixtures) |
| **Preflight (P-B)** | Read B for (`Test Anbar`, `0000001`). Require B ≥ 1; transfer **q = 1** |
| Scenario writes | 2 `movements` rows + audit consequence |
| **Reversal RPC** | **`cancel_transfer_document`**. Note it is **admin-only** (`v_role <> 'admin'` raises), so the reversal is performed in the admin session, not the anbardar's |
| Stop condition | A transfer succeeding from a warehouse other than the anbardar's own |

### S-5 · İcarə exposure on an outbound document (`M7-120`, İcarə half)

| Field | Value |
|---|---|
| Class | Runnable after ordinary TEST-data approval (class A) |
| Owner | M5 (fixture) + M1 (post) + M4 (audit evidence) |
| **Preflight (P-B)** | Read B for (`Test Anbar`, `0000001`) **before** setting the fixture |
| Fixture | `set_stock_condition('Test Anbar','0000001',0,0,0,I,'CODEX-P7-ICARE')` with **I = min(5, B)** — derived, never assumed |
| Setup writes | 1 `stock_conditions` row + 1 `audit_log` row |
| Outbound quantity | **q = B − I + 1**, chosen so the document necessarily eats into the rented units. Requires B ≥ I + 1; if B is too small, post an inbound `Satınalma` first and record it as an extra setup write |
| Expected arithmetic | `icare_exposure = q − max(B − I, 0)`. With q = B − I + 1 this is exactly **1** |
| Scenario writes | 1 outbound `movements` row + its `movements_audit` consequence + **1 `log_icare_exposure` audit row** + **1 `apply_icare_delta` UPDATE on `stock_conditions`** (rev-4: this was missing from the ledger) |
| **`icare_qty` after posting** | **I − 1, not I.** `post_movement_document` runs `apply_icare_delta(wh, code, −v_exp)` with `v_exp = 1` immediately after logging. Call this observed post-state **J** |
| Audit evidence | §2D query Q-1. `record_id = '<doc>|Test Anbar|0000001'`, `new_values->>'from_icare' = '1'`, reason prefixed «İcarədə olan maldan məxaric: » |
| Silent-failure risk | `log_icare_exposure` swallows every exception (`EXCEPTION WHEN OTHERS THEN RETURN`). **A missing audit row produces no visible error** and is a real finding |
| **Reversal RPC** | **`cancel_document`** — correct for the *movement*, because the type is `Silinmə`/`Satış`, not `Yerdəyişmə` |
| **Reversal does NOT restore `icare_qty`** | Verified: `cancel_document` calls `apply_icare_delta` in exactly two branches, `r.type = 'İcarə'` (inbound) and `r.type = 'Qaytarma'` (outbound). A `Silinmə`/`Satış` outbound matches **neither**. After reversal the balance is back to B but `icare_qty` is still **J = I − 1** |
| **Rev-5 cleanup — S-5 now tears itself down completely** | S-6 is removed (§0.-2), so nothing downstream inherits this row and there is no reason to restore it to a working value. **Two steps, in this order:** (1) reverse the movement with `cancel_document` — balance returns to B, `icare_qty` stays at J = I − 1; (2) **final** `set_stock_condition('Test Anbar','0000001',0,0,0,0,NULL)` → the `v_sum = 0 AND v_note IS NULL` branch **DELETEs** the row and writes 1 `audit_log` row with `action='DELETE'`. **S-5 is independently executable and leaves no condition residue.** *(Revision 4's intermediate "restore to literal 1" step existed only to feed S-6 and is withdrawn — one restore write and one audit row removed from the ledger.)* |
| Cleanup writes | the `cancel_document` reversal (1 `movements`) + the final `set_stock_condition` DELETE (1 `stock_conditions` + 1 `audit_log`) |
| **Ordering requirement** | The `set_stock_condition` teardown must run **after** the movement reversal. Run before it and `stock_condition_balance` differs, which changes nothing functionally but makes the Q-6 checkpoint sequence unreadable |
| **Execution dependency** | Both the fixture and the cleanup are `set_stock_condition` calls (**M5b**) and the reversal is `cancel_document` (**M6**). Both mechanisms are **BLOCKED** (§0.3A), so **S-5 is not currently executable end to end** despite being independently *designed*. Do not post the S-5 document until M6 is resolved — the fixture would be strandable and the movement irreversible |
| Stop condition | `icare_exposure` ≠ `q − max(B − I, 0)`; **or** `icare_qty` after posting ≠ I − 1 — record the arithmetic, do not adjust the fixture to fit |

### S-6 · Condition split on a transfer — **BLOCKED — live server/RPC gap**

**Status: BLOCKED. Removed from every executable batch, preflight, cleanup step
and total.** Full derivation in §0.-2; the essentials:

| Field | Value |
|---|---|
| Class | **Not executable.** Not a fixture-approval decision |
| Root cause | `apply_cond_split` mutates the source İcarə bucket (line 45, via `apply_cond_delta` → `apply_icare_delta`) **before** calling `log_icare_exposure` (line 60), and the movement rows are not inserted until after `apply_cond_split` returns (`post_transfer_document` lines 138 vs 148/154). `log_icare_exposure` recomputes exposure from that already-mutated state and returns without writing |
| Arithmetic at B = I = v = 1 | `icare_exposure(1) = max(1 − max(1 − 0, 0), 0) = 0` → early `RETURN`, **no audit row** |
| Downstream effect | `cancel_transfer_document` sums `from_icare` over 0 rows, gets `v_exp = 0`, and its `IF v_exp > 0` guard is false. **Neither condition restore runs** |
| Why no fixture fixes it | The row is written only when `B < I` (§0.-2), i.e. only from a warehouse recorded as renting out more than it holds. Manufacturing that state to satisfy an expectation is precisely what §2's stop conditions forbid |
| **Why running it is unsafe** | The movement quantities **would** reverse normally while the condition state stayed transferred: source `icare_qty` left at 0, a destination row left at 1, at a warehouse the movement ledger says never received the goods. **Normal reversal cannot restore this.** Repair would need direct `set_stock_condition` calls against two warehouses — manual correction of a silent server failure, not cleanup |
| **Not a React failure** | The client emits the payload correctly (`toTransferPayload` → `conditions: {"icare": 1}`, `lib/opPayload.ts:137`). Nothing in `web/src` is implicated |
| Scope | **No Supabase change is proposed here.** §7 decision 8 puts the choice to the user: preserve current server behaviour and leave the row blocked, or authorise a **separate** future server investigation with its own audit and approval. Not migration scope |
| Registry effect | The condition-split half of `M7-120` stays `CODE VERIFIED`, annotated `BLOCKED — live server/RPC gap` (§4). The İcarə half is unaffected — S-5 covers it independently |
| Withdrawn with it | The revision-4 `B_src = I_src` precondition (it guarantees the failure, §0.-2); Q-3 (nothing left to gate); the S-6 rows of §2A, §5 Batch 2, §6.1 and the C2 conditional in §6.2 |

### S-7 · Layer posting paths

| Field | Value |
|---|---|
| Class | Requires structural configuration (class C); cleanup requires class D |
| Owner | M5 |
| Setup writes | 1 `stock_layer_settings` row |
| Scenario writes | Every posted movement additionally writes `stock_layers` rows via `guard_and_capture_stock_layer_movement()`; posting routes through `post_layer_movement_document` / `post_layer_transfer_document` |
| Reversal note | Layer documents need the **layer** cancellation family (`cancel_layer_document` / `cancel_layer_transfer_document`), a third RPC pair distinct from both used above |
| Cleanup | **Not available.** `active=FALSE` leaves every `stock_layers` row written while active and does not restore the probe state |
| **Ordering (rev 4)** | Runs in **Batch 5-ALT**, which *replaces* Batch 5 and runs **before Batch 6**. Revision 3 scheduled it as "Batch 7" after Batch 5 had already disabled the settings row and Batch 6 had retired the identities and deactivated `CODEX-P7-ANBAR-2` — every fixture it needs would have been gone. It shares Batch 5's single `stock_layer_settings` insert rather than adding one, and needs **no** reactivation or recreation writes |
| Fixture dependencies, all live at Batch 5-ALT | `stock_layer_settings` **active**; `CODEX-P7-ANBAR-2` **active** (transfer destination); at least one **non-retired** identity able to post |
| Recommendation | Approve only if Codex accepts that TEST becomes a layer-mode project permanently; otherwise layer rows stay `CODE VERIFIED` |

### S-8 · `M7-S3` — `stock_conditions` load failure

**Executed 2026-09-05 — PASS / `LIVE VERIFIED` for this failure-and-recovery
path.** In Chrome DevTools `Request conditions`, the user enabled a blocking
rule matching `*stock_conditions*`. Reloading `Yeni əməliyyat` displayed
`Məlumat yüklənmədi` with `TypeError: Failed to fetch`; the normal operation
form/post path was unavailable. After disabling the rule and reloading, the
screen recovered normally. No fixture and no database write were made.

| Field | Value |
|---|---|
| Class | **Runnable now without writes** — the only scenario in that class |
| Owner | **M2 — user-executed in Chrome DevTools; result reviewed and recorded by Codex** |
| Fixture | **None.** A read *failure*; zero rows is a valid starting state |
| Setup / scenario writes | **ZERO / ZERO — that is the entire assertion** |
| Method | DevTools → Network → block `*/rest/v1/stock_conditions*`, reload the operation screen, confirm it **refuses to post** rather than silently rendering every quantity as `normal` |
| Cleanup | **Completed:** block rule disabled, page reloaded, normal screen recovered. Nothing persisted |
| Stop condition | The post button is enabled with the read blocked → R-H10 reproduced live |

### S-9 · `correct_document` — **REMOVED from the executable plan**

| Field | Value |
|---|---|
| Class | **Deferred until Phase 8** |
| Reason | `M7-109`'s `document_edit_impact()` caller is deferred; Q6 keeps the movements/document screen out of Phase 7, so **no UI path reaches edit mode** |
| Why not call the RPC directly | It would verify the server, not the missing React transition — an irreversible correction chain bought for evidence the row does not ask for |
| Consequence | The `correct_document` half of `M7-120` stays unverified until Phase 8. **Not** a Phase 7 fixture gap; no approval decision needed now |

### S-10 · `M7-96` stale-stock recheck

| Field | Value |
|---|---|
| Class | Runnable after ordinary TEST-data approval (class A) — *not* current-data ready |
| Owner | M1 (two sessions) + M4 (preflight) |
| Why setup writes are unavoidable | Every branch is driven by a **re-read balance that fell** after the screen was opened. Only a committed outbound movement lowers it |
| **Preflight (P-B)** | Read B for (`Test Anbar`, `0000001`) immediately before opening session 1 |
| **Drop/empty branch** | Session 1 types **q = B**. Session 2 posts an outbound of **exactly B**, taking the balance to 0. Session 1 submits: the only line has no stock, is dropped, nothing survives → refused with «Yazılacaq etibarlı sətir yoxdur.» (`NOTHING_TO_POST_MSG`). **Scenario writes: ZERO** |
| **Trim branch** | Session 1 types **q = B**. Session 2 posts an outbound of **⌊B/2⌋** (requires B ≥ 2), leaving **B − ⌊B/2⌋**. Session 1 submits: the line is trimmed to **B − ⌊B/2⌋** and a document **is** written at that size, both facts in one toast. **Scenario writes: 1 movement row at the trimmed quantity** — the H-5 correction: expect a write, not zero |
| Setup writes (each branch) | 1 outbound document from session 2 = 1 `movements` row + `movements_audit` consequence |
| **Reversal RPC** | **`cancel_document`** for both the setup outbound and the trimmed document — these are `Silinmə`-family, not transfers |
| Stop condition | A document written at the *typed* quantity rather than the trimmed one |
| Scope note | The layer-abort branch stays `CODE VERIFIED` unless S-7 is approved. A LAYERED line is never trimmed by design (`opStaleRecheck.ts:25-27`) |

### S-11 · `M7-123` remaining measurement (read 10)

| Field | Value |
|---|---|
| Class | Requires structural configuration (class C); exact restoration requires class D |
| Owner | M5 (config) + M1 (measurement) |
| Setup writes | 1 `stock_layer_settings` row |
| Scenario writes | **ZERO — read-only measurement** |
| Cleanup | `active=FALSE` is **1 UPDATE and NOT exact restoration** — it leaves `ready:true, active:false` where the pre-state was `ready:false`. Exact restoration is `DELETE FROM stock_layer_settings WHERE singleton=TRUE` — 1 class D delete, separate approval |
| Measurement scope | Exactly `rpc/get_stock_layers(warehouse, code)` for one representative item, per invocation, excluded from the page-load total, same recorded fields as reads 4-9. With zero layers it returns `layers: []` — still a valid measurement |
| Stop condition | Any movement posted while `active = TRUE` |
| If refused | `M7-123` should be **closed as NOT MEASURABLE in this environment**, naming read 10 |

---

## 2A. Balance preflight schedule

Every balance-dependent scenario, its preflight, and its derived quantities.
No literal balance appears anywhere.

| Scenario | Preflight target | Requires | Derived quantity | Expected post-state |
|---|---|---|---|---|
| S-3 | (`Test Anbar`, `0000001`) | B ≥ 1 | q = 1 | source B−1, dest +1; after reversal source B, dest 0 |
| S-4 | (`Test Anbar`, `0000001`) | B ≥ 1 | q = 1 | as S-3 |
| S-5 | (`Test Anbar`, `0000001`) | B ≥ I+1, I = min(5, B) | q = B−I+1 | exposure exactly 1; balance B−q |
| ~~S-6~~ | — | **REMOVED — `BLOCKED`** (§0.-2). Its revision-4 precondition `B = I = 1` is the case that guarantees the audit row is *not* written | — | — |
| S-10 drop | (`Test Anbar`, `0000001`) | B ≥ 1 | session 2 posts B; session 1 types B | balance 0; **zero** scenario writes |
| S-10 trim | (`Test Anbar`, `0000001`) | B ≥ 2 | session 2 posts ⌊B/2⌋; session 1 types B | document written at B−⌊B/2⌋ |

If a precondition fails, the remedy is an **extra recorded inbound setup write**,
never a silently adjusted expectation.

## 2B. Class B role-transition ledger

Two auth identities (M3, separately approved). `handle_new_auth_user()` seeds the
`public.users` row from `raw_user_meta_data`, so the **initial metadata** decides
the created role — that is the cheapest way to get the row right first time.

| Identity | Initial `raw_user_meta_data` | Resulting `public.users` row | Purpose |
|---|---|---|---|
| `CODEX-P7-REHBER` | **`{"name":"CODEX-P7-REHBER","role":"admin"}`** *(rev-4 change)* | role `admin`, warehouse `NULL`, active `true` | S-2a; **and the only identity that can read `audit_log` through the UI** once flipped to `rehber` (`p_audit_read` = `my_role()='rehber'`). **Seeded as `admin`, like the other identity:** revision 3 seeded it `rehber`, but a client that loads as `rehber` can never submit (`ROLE_PERMS.rehber = []` → `canPost` false → `onPost()` returns), so S-2a's server refusal would never be reached. §2D |
| `CODEX-P7-ANBARDAR` | `{"name":"CODEX-P7-ANBARDAR","role":"admin"}` | role `admin`, warehouse `NULL`, active `true` | S-1, S-4, S-2b, S-2c. **Seeded as `admin` deliberately** so S-2c step 2 can cache an admin-shaped client before the flip |

**Ordered transitions.** Every UPDATE is counted in §6.

| # | Step | Statement shape | Why |
|---|---|---|---|
| T1 | Promote to anbardar for S-1/S-4/S-2b | `UPDATE users SET role='anbardar', warehouse='Test Anbar' WHERE id=…` | **Both columns in one statement.** `trg_enforce_anbardar_warehouse` fires `BEFORE UPDATE OF role, warehouse` and raises «anbardar rolu üçün konkret anbar təyin edilməlidir» if `warehouse` is absent, and «Anbar tapılmadı və ya aktiv deyil» if it is not an active `type='anbar'` row |
| T2 | Revert to admin **before S-2b**, not before S-2c | `UPDATE users SET role='admin', warehouse=NULL WHERE id=…` | Rev-4: S-2b now needs an admin-shaped cache too (§2C), and it runs before S-2c. One T2 serves both — S-2b restores the identity to `admin` when it finishes, so S-2c inherits the admin state and needs no second revert |
| **T2b** | S-2b stale-tab flip **and** restore | `UPDATE users SET role='anbardar', warehouse='Test Anbar' …` then `SET role='admin', warehouse=NULL …` | **New in rev 4.** 2 UPDATEs. Same single-statement constraint as T1 on the flip |
| **T2a** | S-2a stale-tab flip **and** restore (rehber identity) | `UPDATE users SET role='rehber', warehouse=NULL …` then `SET role='admin', warehouse=NULL …` | **New in rev 4.** 2 UPDATEs. No trigger constraint — `trg_enforce_anbardar_warehouse` guards only the `anbardar` case |
| T3 | S-2c mid-session flip | `UPDATE users SET role='anbardar', warehouse='Test Anbar' WHERE id=…` | Same single-statement constraint as T1. `warehouse='Ofis'` is **forbidden** here — «anbardar Ofisə təyin edilə bilməz» |
| T4 | S-2c restore | `UPDATE users SET role='admin', warehouse=NULL WHERE id=…` | Returns the identity to a neutral state |
| T5 | Retire both | `UPDATE users SET active=false WHERE id IN (…)` | Neutralizes `current_user_role()`, which filters `active=TRUE` |

**Deactivation vs. auth deletion — the revision-2 correction.**
`UPDATE public.users SET active=false` makes `current_user_role()` and
`current_user_warehouse()` return `NULL`, so the identity can do nothing in the
application. **It does not disable or delete the `auth.users` identity, which
still exists and can still authenticate.** Two consequences:

- Revision 2's phrase "auth users are deactivated" was inaccurate and is withdrawn.
- **Caveat:** `my_role()` reads `role` **without** an `active` filter. So an
  identity left with `role='rehber'` and `active=false` still satisfies
  `p_audit_read` at the RLS layer. Retiring the rehber identity therefore does
  **not** by itself revoke its `audit_log` read reachability.
- **Any actual auth-side disable or delete (M3) is a separate action requiring
  its own approval (§7 decision 3b).** It is not scheduled by this plan.

## 2C. The stale-admin-tab technique — stated once, used by S-2a/S-2b/S-2c

**Why it is needed at all.** Every server refusal in `M7-118` is guarded by a
*client* check that fires first and never sends the request. The client's checks
read a **cached** `me`; the server's read the live row. Diverging the two is the
only way to make the server speak.

**Why the cache is divergeable — verified.** `me` is written in exactly two
places: `LoginPage`'s `onLoggedIn` callback (`App.tsx:286`) and one mount-time
restore effect (`App.tsx:75`, dependency array `[setMe, setStatus]`, so it runs
once per mount). There is **no polling, no refetch on focus, no revalidation on
submit**. `api/auth.api.ts:34` reads `users` only when one of those two fires.
A tab left open therefore holds its sign-in-time role indefinitely.

**The invariant every S-2 sequence follows:**

1. Seed the identity's `public.users.role` as **`admin`** (§2B does this via
   `raw_user_meta_data`, so no extra UPDATE is needed at creation).
2. Sign in and let the client cache `me.role = 'admin'`.
3. Build the complete line while the client still believes it is admin.
4. Change the server-side role (and warehouse) in **one** `UPDATE`.
5. **Do not refresh, do not navigate away, do not re-open the app.** Any of the
   three re-runs the restore effect and re-caches `me`, which voids the test.
6. Submit. The client gate passes on the stale `me`; the server refuses on the
   live row. That refusal is the evidence.
7. Restore the role.

**Tab and session budget across all three refusals.**

| Scenario | Identity | Tabs | Browser sessions | Role transitions |
|---|---|---|---|---|
| S-2a | `CODEX-P7-REHBER` | 1 (tab A) | 1 | 2 — admin→rehber, rehber→admin |
| S-2b | `CODEX-P7-ANBARDAR` | 1 (tab B) | 1 | 2 — admin→anbardar, anbardar→admin |
| S-2c | `CODEX-P7-ANBARDAR` | 1 (tab C, fresh) | 1 | 2 — admin→anbardar (T3), anbardar→admin (T4) |

**Totals: 3 tabs across 2 browser sessions** (tabs B and C are the same identity
and may reuse one session, but tab C **must be freshly opened** after T4 — a tab
carrying a stale `anbardar` `me` cannot cache the `Ofis` destination S-2c needs).
Tab A is a different identity and therefore needs its own session (a separate
browser profile or a private window).

**Role transitions, counted end to end: 6** (2 per S-2 scenario) — plus **T1**
(the initial promotion for S-1/S-4), **T2** (the revert to admin that S-2b
requires before it can cache an admin client) and **T5** (retirement), giving
**9 `users` UPDATEs** in total.

*(Revision 4 said "8" here. That was an omission, not a different count: it
tallied the 6 scenario transitions with T1 and T5 but left out **T2**, which its
own §5 Batch 3 step 16 and its own §6 ledger both list. The itemised ledger has
always summed to 9 — T1 + T2 + S-2b×2 + S-2a×2 + T3 + T4 + T5 — and **9 is the
correct figure**.)*

Every one is itemised in §6.1. **What T2 does subsume:** revision 3 scheduled a
*second* revert before S-2c; the anbardar identity is already returned to
`admin` by S-2b's own restore step, so no additional revert is needed there.
§5 orders the batches so this holds.

**Restoration count.** Each of the three scenarios restores its identity to
`role='admin', warehouse=NULL` — **3 restorations**, one per scenario, all
included in the 6 scenario transitions above (T1, T2 and T5 are not
restorations and are counted separately, for the total of 9).

## 2D. Audit evidence — read-only SQL Editor queries (M4)

The admin Audit jurnalı **cannot** show these rows: the only SELECT policy on
`audit_log` is `p_audit_read`, `qual = (my_role() = 'rehber')`. Every audit
assertion is therefore verified by read-only SQL (M4), or through a
`CODEX-P7-REHBER` UI session once it exists.

**No evidence query contains `INSERT`, `UPDATE`, `DELETE`, or DDL.**

### 2D.0 Executable-parameter convention (revision-4 correction)

Revision 3's queries used `:doc`, `:batch_started_at`, `:known_docs`. **`:name`
is a client-library bind placeholder. The Supabase SQL Editor executes raw SQL
and rejects it** — every one of Q-1…Q-5 would have failed to parse. All five are
rewritten as **copy-safe `WITH params AS (...)` queries**: fill the literals in
the single `params` CTE at the top, copy the whole block, run it unmodified.

**Two literals must be captured before any batch begins**, because the scoped
queries below depend on them.

**Revision-5 correction: `auth.uid()` cannot be used here.** Revision 4's G1 was
`SELECT now(), auth.uid();`. In the Supabase SQL Editor `auth.uid()` returns
**NULL** — the editor executes as a Postgres role and carries no browser JWT
(§0.3A). G1 would have silently produced a NULL actor, and every zero-write
query scoping on `created_by = NULL` would have matched **nothing** and passed
unconditionally. **A zero-write assertion that always passes is worse than none.**

G1 is replaced by a **read-only lookup of the acting identity from
`public.users`**, resolved by the exact TEST identity rather than by session
context:

```sql
-- G1 (read-only). Run at the start of each batch AND before each zero-write
-- assertion. Write both values down.
-- Fill in exactly ONE of the three identifiers; leave the others NULL.
WITH ident AS (
  SELECT NULL::text AS want_email,             -- e.g. 'codex-p7-anbardar@example.test'
         'CODEX-P7-ANBARDAR'::text AS want_name,
         NULL::uuid AS want_id
)
SELECT now()   AS batch_started_at,
       u.id    AS batch_actor,
       u.name, u.email, u.role, u.warehouse, u.active
FROM public.users u, ident i
WHERE (i.want_id    IS NULL OR u.id    = i.want_id)
  AND (i.want_email IS NULL OR u.email = i.want_email)
  AND (i.want_name  IS NULL OR u.name  = i.want_name);
```

**Expect exactly 1 row.** Zero rows means the identity does not exist yet (the
Batch 3 fixtures have not run) or the identifier is misspelled — **stop, do not
substitute a guess**. More than one row means the identifier is not unique;
re-run using `want_id`.

`batch_started_at` is the exact start timestamp. `batch_actor` is the
`public.users.id` of the identity that will actually perform the writes — and
because `public.users.id = auth.uid()` (§0.0 finding 5), it is the same UUID
that lands in `movements.created_by` and `audit_log.user_id`.

**Each zero-write query must use the identity that actually submits that
scenario, not a single batch-wide actor.** The three S-2 scenarios are submitted
by two different identities:

| Scenario | Submitting identity | `want_name` for G1 |
|---|---|---|
| S-2a | `CODEX-P7-REHBER` | `'CODEX-P7-REHBER'` |
| S-2b | `CODEX-P7-ANBARDAR` | `'CODEX-P7-ANBARDAR'` |
| S-2c | `CODEX-P7-ANBARDAR` | `'CODEX-P7-ANBARDAR'` |
| S-10 drop submit | the session-1 admin identity | the admin's own name |

Re-run G1 for the correct identity immediately before each assertion. **A
zero-write check that omits the timestamp, the actor, or the item scope is not
a zero-write check** — it either sweeps in history, sweeps in another session's
activity, or sweeps in another item's.

### 2D.1 The queries

**Q-1 — S-5 İcarə exposure row.** Expect **exactly 1** row.

```sql
WITH params AS (
  SELECT 'SND-XXXXXXXXXX'::text AS doc      -- S-5 document number
)
SELECT a.action, a.table_name, a.record_id,
       a.new_values->>'from_icare' AS from_icare,
       a.new_values->>'doc_num'    AS doc_num,
       a.reason
FROM public.audit_log a, params p
WHERE a.table_name = 'movements'
  AND a.record_id  = p.doc || '|Test Anbar|0000001'
ORDER BY a.ts DESC;
```
Expected: 1 row; `action='UPDATE'`; `from_icare='1'` (§2A);
reason `LIKE 'İcarədə olan maldan məxaric: %'`.

**Q-2 — condition-fixture audit rows, scoped to THIS batch.** Revision 3's
`record_id LIKE '%0000001%'` matched every historical row for that item and
would have inflated the count. Scoped on `ts` and `user_id`:

```sql
WITH params AS (
  SELECT TIMESTAMPTZ '2026-09-05 00:00:00+04' AS batch_started_at,  -- from G1
         UUID '00000000-0000-0000-0000-000000000000' AS batch_actor -- from G1
)
SELECT a.action, a.record_id, a.reason, a.ts
FROM public.audit_log a, params p
WHERE a.table_name = 'stock_conditions'
  AND a.record_id  = 'Test Anbar|0000001'   -- exact, not LIKE
  AND a.ts        >= p.batch_started_at
  AND a.user_id    = p.batch_actor
ORDER BY a.ts;
```

**Expected under the revised S-5-only Batch 2 — exactly 2 rows** for
`record_id = 'Test Anbar|0000001'`, in this order:

| # | `action` | Written by |
|---|---|---|
| 1 | `INSERT` | the S-5 İcarə fixture create (`set_stock_condition(…, I, 'CODEX-P7-ICARE')`) |
| 2 | `DELETE` | the S-5 **final** cleanup `set_stock_condition(…, 0, NULL)` |

**and exactly 0 rows** for `record_id = 'CODEX-P7-ANBAR-2|0000001'`.

**Why 2 and not 3 — a correction to the brief.** The revision-5 instruction
specified "3 source rows", which holds only if the intermediate
restore-to-`icare_qty = 1` call is kept. That call existed **solely** to hand
S-6 a known starting value (§2 S-5, revision-4 row); with S-6 removed it has no
consumer, and keeping it would mean writing a fixture value that nothing reads
and then deleting it — an unjustified mutation. It is therefore withdrawn, and
the expectation is 2. Verified by tracing the only two writers of an
`audit_log` row keyed to this `record_id`:

- `set_stock_condition` writes one row per non-NOOP call — here `INSERT` then
  `DELETE`, 2 calls, 2 rows;
- `apply_icare_delta` (the S-5 post's `I → I − 1`) contains **no** `audit_log`
  statement at all, and there is **no audit trigger on `stock_conditions`** in
  the captured schema — so the post's condition UPDATE is invisible to Q-2. It
  is asserted by Q-6 checkpoint 2 instead.

**If the third row is wanted as an explicit evidence artefact**, re-instate the
intermediate restore as a deliberate, itemised write (+1 `stock_conditions`
UPDATE, +1 `audit_log`) and the expectation returns to 3. That is a user call;
this plan takes the smaller-footprint option by default and records both.

The destination key must return **nothing**: with S-6 removed (§0.-2) no
condition row is ever created at the second warehouse, so a row there means a
transfer split was executed contrary to this plan — a **global stop condition**
(§8). Run the query twice, once per `record_id`, rather than widening it back to
a `LIKE`. *(Revision 4 expected 4 rows here, of which one belonged to S-6's
cleanup; that row no longer exists.)*

**Q-3 — WITHDRAWN.** It existed solely to gate S-6's reversal by previewing the
`from_icare` audit row. §0.-2 establishes that, on the explicit-split path, that
row is **never written** for any fixture state this plan may create, so the
query has nothing to gate and no expectation that could be met. Removed rather
than left with an unreachable "expect 1 row". Q-4, Q-5 and Q-6 keep their
revision-4 numbering so existing cross-references stay valid.

**Q-4 — zero-write assertion (S-2a/S-2b/S-2c, S-10 drop submit).** Expect **0**
rows. The `doc_num NOT IN (:known_docs)` alternative is **removed**: asserting a
negative over an open set silently passes whenever the list is stale.

```sql
WITH params AS (
  SELECT TIMESTAMPTZ '2026-09-05 00:00:00+04' AS batch_started_at,  -- from G1
         UUID '00000000-0000-0000-0000-000000000000' AS batch_actor, -- from G1
         '0000001'::text AS item
)
SELECT m.id, m.doc_num, m.type, m.warehouse, m.item_code,
       m.in_qty, m.out_qty, m.date, m.created_at
FROM public.movements m, params p
WHERE m.created_at >= p.batch_started_at
  AND m.created_by  = p.batch_actor
  AND m.item_code   = p.item
ORDER BY m.id DESC;
```

Scoped on **all three** of start timestamp, actor and item, per the zero-write
rule. For an S-2 scenario run immediately after a known-good post, tighten
`batch_started_at` to a timestamp captured **between** that post and the
submission under test — otherwise the earlier legitimate document appears and
the assertion is unreadable. Any row here where a scenario asserted zero writes
is a **global stop condition**.

**Q-5 — document and reversal shape.** Confirms the correct reversal RPC ran.

```sql
WITH params AS (
  SELECT 'SND-XXXXXXXXXX'::text AS orig,
         'SND-R-ZZZZZZZZZZ'::text AS reversal
)
SELECT m.doc_num, m.type, m.warehouse, m.item_code,
       m.in_qty, m.out_qty, m.note
FROM public.movements m, params p
WHERE m.doc_num IN (p.orig, p.reversal)
ORDER BY m.doc_num, m.id;
```
Expected for a transfer: `orig` = 2 rows `type='Yerdəyişmə'`; `reversal`
matches **`SND-R-%`** with note «Ləğv (əks yerdəyişmə): \<orig\>».
For a non-transfer: `reversal` matches **`SND-C-%`** with note «Ləğv: \<orig\>».
A `SND-C-%` reversal against a `Yerdəyişmə` document is impossible — that call
raises — so seeing one would mean the plan was not followed.

**Q-6 — condition-state read (new in revision 4).** S-5 makes assertions about
`icare_qty` that no other query can see — in particular the post's
`apply_icare_delta` UPDATE, which writes no `audit_log` row and is therefore
invisible to Q-2. *(Rev-5: S-6 also relied on this query; S-6 is `BLOCKED`
(§0.-2) and its checkpoint is removed below.)*

```sql
WITH params AS (
  SELECT '0000001'::text AS item
)
SELECT sc.warehouse, sc.item_code, sc.unfit_qty, sc.repair_qty,
       sc.onsite_qty, sc.icare_qty, sc.note, sc.updated_at
FROM public.stock_conditions sc, params p
WHERE sc.item_code = p.item
ORDER BY sc.warehouse;
```

Run it at four points and record each: **(1)** after the S-5 fixture — expect
`Test Anbar` at `icare_qty = I`; **(2)** after the S-5 post — expect
`icare_qty = I − 1`, the rev-4 blocker-2 fact; **(3)** after the S-5 movement
reversal — expect `icare_qty` **still `I − 1`**, because `cancel_document`
restores the quantity but not the condition (§0.-1 blocker 2); **(4)** after
S-5's final cleanup — expect **no row at all** for `Test Anbar`, and **no row**
for `CODEX-P7-ANBAR-2` at any point.

*(Revision 4's point 4 read "after the S-6 reversal". S-6 is removed (§0.-2);
the destination warehouse must never acquire a condition row.)*

**All six queries are `SELECT`-only. `params` is a CTE, not a write.**

---

## 3. What `M7-S2` actually needs — and why not thousands of rows

`PAGE_SIZE = 1000` in both `api/stockConditions.api.ts:24` and
`api/partners.api.ts:7`. A *live* partial-page failure requires **>1000 rows in a
core table** and a failure injected precisely between page 1 and page 2 — a
window no manual tester controls.

| Method | Cost | Determinism | Verdict |
|---|---|---|---|
| Bulk-insert >1000 rows, then kill the network mid-paging | Very high; pollutes TEST irreversibly; window is milliseconds | Poor — you cannot choose *which* page fails | **REJECT** |
| Browser interception blocking page 2 | No data written | Page 2 is only *requested* if >1000 rows exist — inherits the same rejected bulk cost | **Not usable** |
| The existing automated test | Already written and passing; mutation-checked against a straight port of legacy `fetchAll` | Exact: `api/stockConditions.api.test.ts:113-155` builds a full 1000-row page-1 success followed by both a page-2 **error** and a page-2 **rejection**, asserting `ok===false`, `partial===true`, 1000 rows returned but never committed | **ACCEPT as acceptance evidence** |

**`M7-S2` keeps its existing `CODE VERIFIED` status. It is not promoted.**
The deterministic, mutation-checked test is the *reason a live reproduction is
unnecessary* — it exercises the exact branch a live run could only reach by luck,
pinned against regression.

This explicitly does **not** claim: that `M7-S2` becomes `LIVE VERIFIED`; that its
status changes at all; or that **any part of Phase 7 acceptance follows from it**.

Browser interception remains right for **S-8**, where the first request is the one
to block and no row volume is involved.

---

## 4. Rows that remain CODE VERIFIED — Phase 7 stays INCOMPLETE

| Row / branch | Reason |
|---|---|
| `M7-S2` | §3. Status unchanged |
| `M7-107` | Absence of a request-key parameter is a captured live schema fact |
| `M7-96` layer-abort branch | Unreachable without class C |
| **`M7-21`** empty-result texts and the `item.add` gate | Corrected from `M7-117` (rev-2 finding 5). `LIVE VERIFIED` for the create path only; remaining halves pinned by test |
| `M7-117` role behaviour | Distinct row, `CODE VERIFIED` (H-4); subject of S-1 |
| `M7-118` refusals (a), (b) and (c) | **All three** stay `CODE VERIFIED` unless the §2C stale-tab technique is approved (§7 decision 5) **and** demonstrated end to end. Rev-4: revision 3 listed only (c) here, on the mistaken basis that (a) and (b) were ordinary submissions |
| All layer **posting** rows | Stay `CODE VERIFIED` unless S-7 is approved |
| `M7-108` selector-level blocking | `LIVE VERIFIED` for the observed behaviour; selector detail pinned by test |
| `M7-109` / `correct_document` half of `M7-120` | **Deferred to Phase 8**, not closed |
| **condition-split half of `M7-120`** | **`CODE VERIFIED` — annotated `BLOCKED — live server/RPC gap`** (§0.-2). S-6 cannot produce the audit row its own reversal reads. Not a fixture gap and not a React gap; see §7 decision 8 |
| **İcarə half of `M7-120`** | Covered by S-5, which remains independently designed — but **not currently executable**, because its fixture and cleanup need M5b and its reversal needs M6 (§0.3A, §7 decision 9) |

**Phase 7 is INCOMPLETE and NOT ACCEPTED, and revision 5 moves it further from
acceptance, not closer.** Even with every executable batch run successfully:

- `M7-109` and the `correct_document` half of `M7-120` remain **deferred**;
- the **condition-split half of `M7-120`** is now **blocked by live server
  behaviour** (§0.-2) and cannot be verified in this environment at all;
- the layer rows remain `CODE VERIFIED` unless the irreversible class C full
  form is approved;
- and **15 of the 37 base writes have no execution mechanism** (§0.3A), which
  currently prevents Batch 2 entirely and every reversal elsewhere.

**No combination of these batches yields acceptance.**

---

## 5. Ordered batches

Ordering now respects two dependencies revision 2 got wrong: the class A′
warehouse must stay **active** until every dependent scenario is done, and the
class B identity's role must be **admin** at the moment S-2c caches its client.

**Batch 0 — runnable now, zero writes, zero fixtures.**
0. **G1 capture** (M4, read-only): run the **revised §2D G1 identity lookup** —
   the `WITH ident AS (...)` `public.users` read that resolves the acting
   identity by explicit TEST identifier, together with `now()`. **Select the
   identity that will submit the steps being asserted**, filling in exactly one
   identifier in the `ident` CTE, and **the query must return exactly one user
   row** — zero rows or more than one means the actor is not established, and
   the batch does not start. Write both values down. **No executable evidence
   instruction in this plan may use `auth.uid()` in the SQL Editor** — it
   returns NULL there (§0.3A), and a zero-write assertion scoped on a NULL actor
   always passes. Every zero-write check in this batch and the next scopes on
   the two captured values (§2D.0). **Re-capture G1 at the start of every
   batch**, and again between any legitimate post and a zero-write assertion
   that follows it.
1. **S-8 — COMPLETED / PASS (2026-09-05).** `M7-S3` broken-read refusal and
   recovery live-verified. **Owner: M2, user-executed; Codex recorded the
   evidence.** Zero writes.

**Batch 1 — one class A′ reference row; admin transfer.**
2. Create `CODEX-P7-ANBAR-2` (`type='anbar'`, `active=true`) — 1 `warehouses` row (M5).
3. P-B preflight (M4).
4. **S-3** — admin transfer, q = 1 (M1).
5. Reverse with **`cancel_transfer_document`** (M6). Q-5 evidence (M4).
   **The warehouse row is NOT deactivated here** — S-4 (and Batch 5-ALT, if
   taken) still need it. *(Rev-5: S-6 was the third consumer; it is `BLOCKED`.)*

**Batch 2 — one class A fixture (İcarə). S-5 ONLY.**
**Gated on §0.3A: steps 7, 9 and 10 need M5b/M6, both currently `BLOCKED`. Do
not begin this batch — in particular do not run step 8 — until that decision is
resolved**, or the İcarə fixture and the S-5 document become unremovable.
6. G1 capture + P-B preflight; derive I and q (M4).
7. `set_stock_condition('Test Anbar','0000001',0,0,0,I,'CODEX-P7-ICARE')` (**M5b**).
   Q-6 checkpoint 1: `icare_qty = I`.
8. **S-5** — outbound document (M1). Q-1 evidence (M4).
   Q-6 checkpoint 2: `icare_qty = I − 1`.
9. Reverse S-5's document with **`cancel_document`** (**M6**) — non-transfer.
   Q-6 checkpoint 3: `icare_qty` **still `I − 1`** — the reversal does not
   restore it (§0.-1 blocker 2).
10. **Final cleanup:** `set_stock_condition('Test Anbar','0000001',0,0,0,0,NULL)`
    (**M5b**) → DELETE branch. Q-6 checkpoint 4: **no row** for `Test Anbar`.
11. Q-2 evidence: **exactly 2 rows** for `'Test Anbar|0000001'` (`INSERT`, then
    `DELETE`) and **0 rows** for `'CODEX-P7-ANBAR-2|0000001'`. See the Q-2 note
    on why this is 2 rather than the 3 the brief assumed.

*(Revision 4's step 10 ran **S-6** here and its step 11 zeroed two warehouses'
rows. S-6 is `BLOCKED` (§0.-2); both are removed. Batch 2 is now S-5 only, and
S-5 tears down its own fixture completely.)*

**Batch 3 — class B identities (M3, separately approved).**
Revision-4 ordering: the anbardar identity must end this batch **as `admin`**,
because S-2b (step 17) consumes the admin-shaped cache and S-2c (Batch 3b)
needs a fresh admin tab. T2 is therefore no longer a standalone step.
12. Create both auth identities with the metadata of §2B (M3). Both are seeded
    **`role='admin'`** — see the §2B revision-4 note.
13. **T1** — promote `CODEX-P7-ANBARDAR` to anbardar, role+warehouse in one
    statement (M5).
14. **S-1** — anbardar client scoping, read-only (M1). Warehouse-scoping half only.
15. P-B preflight; **S-4** — anbardar transfer (M1); reverse with
    **`cancel_transfer_document`** from the **admin** session (M6, admin-only RPC).
16. **T2** — revert `CODEX-P7-ANBARDAR` to `admin` (M5). **Now required here**,
    not in Batch 3b: S-2b's tab B must cache an admin `me`.
17. **S-2b** — foreign-source refusal via the §2C stale-tab sequence, in a fresh
    tab B (M1 + M5). Ends with the identity restored to `admin`.
    G1 re-capture, then Q-4 evidence: 0 rows.
18. **S-2a** — rehber refusal via the §2C stale-tab sequence, in tab A under a
    **separate browser session** (M1 + M5). Ends with `CODEX-P7-REHBER` restored
    to `admin`. G1 re-capture, then Q-4 evidence: 0 rows.
19. Optional: flip `CODEX-P7-REHBER` to `rehber` once more and re-read the S-5
    audit row through its **UI** session — materially better evidence than SQL,
    and the only UI path that can see `audit_log` at all. **Counts as 2 further
    role transitions** if taken; excluded from the §6 base total as optional.

**Batch 3b — S-2c «Ofis». Conditional on §7 decision 2 only.**
20. Create `Ofis` (`type='anbar'`, **`active=true`**) (M5). *Temporarily visible
    to all users.* `CODEX-P7-ANBARDAR` is already `admin` from step 17 — **no
    separate revert is needed**.
21. **S-2c steps 2–5** — open a **fresh tab C**, cache the admin client
    including `Ofis`, **T3** flip, submit from the stale tab, expect «Ofisə
    yerdəyişməyə icazəniz yoxdur» (M1 + M5). Q-4 evidence: 0 rows.
22. **T4** restore; deactivate `Ofis` (M5).
    **If any step cannot be demonstrated, stop and leave refusal (c) CODE VERIFIED.**

**Batch 4 — S-10 stale recheck (after Batch 1 so a reversal path exists).**
23. P-B preflight (M4).
24. **S-10 drop branch** — two sessions; **zero** scenario writes (M1).
25. Reverse session 2's setup outbound with **`cancel_document`** (M6).
26. P-B preflight again; **S-10 trim branch** (M1).
27. Reverse both the setup outbound and the trimmed document with
    **`cancel_document`** (M6).

**Batch 5 and Batch 5-ALT are ALTERNATIVES. Take exactly one.**

Revision 3 placed the layer work in a "Batch 7" that ran *after* Batch 5 had
already disabled or deleted `stock_layer_settings` and after Batch 6 had
retired the identities and deactivated `CODEX-P7-ANBAR-2`. **Every fixture S-7
needs would already have been retired**: it requires the settings row
**active**, a live posting identity, and — for `post_layer_transfer_document` —
a second active `type='anbar'` warehouse. Revision 4 makes it a branch taken
*instead of* Batch 5 and *before* Batch 6, so no layer scenario depends on a
retired fixture and no reactivation writes are needed.

**Batch 5 — class C configuration, NARROW form (default branch).**
28. **S-11** — insert the singleton `active=TRUE`, measure `get_stock_layers`,
    post **nothing**, then `active=FALSE` (residual `ready:true`) **or**, with
    §7 decision 4(b), DELETE for exact restoration (M5).

**Batch 5-ALT — class C FULL form. Replaces Batch 5 entirely.**
Taken only under §7 decision 4(c). Runs **before Batch 6**, while
`CODEX-P7-ANBAR-2` is still active and both identities are still live.
28-ALT-a. Insert the singleton `active=TRUE` (M5) — the **same** row Batch 5
    would insert, not a second one.
28-ALT-b. **S-11** measurement first, while zero `stock_layers` rows exist —
    taking it after any layer posting measures a different state (M1).
28-ALT-c. **S-7** — full layer posting paths, using the still-active
    `CODEX-P7-ANBAR-2` as the transfer destination (M1). Reversal, where
    attempted at all, needs the **layer** cancellation family
    (`cancel_layer_document` / `cancel_layer_transfer_document`) — a third RPC
    pair distinct from both used elsewhere in this plan.
28-ALT-d. **S-10's layer-abort branch** becomes reachable here and only here
    (`opStaleRecheck.ts:25-27`: a LAYERED line is never trimmed). Run it now or
    leave it `CODE VERIFIED`.
28-ALT-e. **No cleanup.** `active=FALSE` leaves every `stock_layers` row written
    while active, and the class D DELETE does not remove them either. **TEST
    becomes a layer-mode project permanently.**

**Batch 6 — retirement. Runs last, after Batch 5 *or* Batch 5-ALT.**
29. **T5** — `UPDATE users SET active=false` for both identities (M5).
    **This does not disable the auth identities** (§2B).
30. Deactivate `CODEX-P7-ANBAR-2` — **only now**, because
    `enforce_anbardar_warehouse()` would raise on any earlier role UPDATE
    pointing at an inactive warehouse (M5), and because Batch 5-ALT still needs
    it as a live transfer destination.

**There is no Batch 7 in revision 4.** The layer work is Batch 5-ALT.

**Not scheduled in Phase 7:** **S-9** (`correct_document`) — deferred to Phase 8.

---

## 6. Write ledger — recomputed mechanically (revision 5)

### 6.0 Counting convention — stated once, applied without exception

Revision 3 mixed two conventions in one column: some rows counted an
`audit_log` consequence (the `set_stock_condition` rows), others said "+
`movements_audit` consequence" and counted it as nothing. **Revision 4 fixed one
convention and applied it everywhere; revision 5 restates it at the 37-write
base:**

- **COUNTED:** every row this plan's actions cause to be inserted, updated or
  deleted in `movements`, `warehouses`, `users`, `stock_conditions`,
  `stock_layer_settings`, `auth.users` — **and** every `audit_log` row written
  by an *explicitly invoked* function (`set_stock_condition`,
  `log_icare_exposure`). One mutation = 1, whether INSERT, UPDATE or DELETE.
- **NOTED, NOT COUNTED:** rows written by the **automatic `movements_audit`
  trigger**. It fires once per `movements` row as an unavoidable database
  consequence, is never invoked by a step of this plan, and is not separately
  approvable. Its volume is exactly **one row per counted `movements` row** — so
  if Codex prefers the other convention, add the `movements` subtotal (**16** at the 37-write base)
  to the total rather than re-reading the table.

**These two conventions are never mixed.** A row is in one column or the other.

### 6.1 The ledger

**Revision-5 removals**, all consequences of §0.-2: the six S-6 rows (post
movements, both post condition mutations, the split's audit row, both reversal
movements, both reversal condition mutations, the cleanup) and the S-5
intermediate restore. **−11 counted writes, −4 `movements` rows.**

| Batch | Step | Writes | Count |
|---|---|---|---|
| 0 | S-8 | none | **0** |
| 1 | `CODEX-P7-ANBAR-2` insert (M5a) | 1 `warehouses` | 1 |
| 1 | S-3 post | 2 `movements` | 2 |
| 1 | S-3 reversal (`cancel_transfer_document`, **M6**) | 2 `movements` (`SND-R-*`) | 2 |
| 1 | *(no warehouse deactivation — deferred to Batch 6)* | — | 0 |
| 2 | `set_stock_condition` create (İcarə fixture, **M5b**) | 1 `stock_conditions` + 1 `audit_log` | 2 |
| 2 | S-5 post — movement | 1 `movements` | 1 |
| 2 | S-5 post — `log_icare_exposure` | 1 `audit_log` | 1 |
| 2 | S-5 post — `apply_icare_delta(−1)` | 1 `stock_conditions` UPDATE (I → I−1) | 1 |
| 2 | S-5 reversal (`cancel_document`, **M6**) | 1 `movements` (`SND-C-*`) | 1 |
| 2 | **S-5 final cleanup** (`set_stock_condition(…,0,NULL)`, **M5b**) | 1 `stock_conditions` DELETE + 1 `audit_log` | 2 |
| ~~2~~ | ~~S-5 intermediate restore~~ | **REMOVED** — existed only to seed S-6 | ~~2~~ → 0 |
| ~~2~~ | ~~S-6 post / reversal / cleanup (7 rows)~~ | **REMOVED — `BLOCKED`** (§0.-2) | ~~9~~ → 0 |
| 3 | auth identities (M3) | 2 `auth.users` + 2 `public.users` (trigger) | 4 |
| 3 | **T1** promote (M5a) | 1 `UPDATE users` | 1 |
| 3 | S-1 | **0 — read-only** | 0 |
| 3 | S-4 post | 2 `movements` | 2 |
| 3 | S-4 reversal (`cancel_transfer_document`, admin session, **M6**) | 2 `movements` | 2 |
| 3 | **T2** revert anbardar to admin (M5a) | 1 `UPDATE users` | 1 |
| 3 | S-2b flip + restore (M5a) | 2 `UPDATE users` | 2 |
| 3 | S-2b submit | **0 — the assertion** | 0 |
| 3 | S-2a flip + restore (M5a) | 2 `UPDATE users` | 2 |
| 3 | S-2a submit | **0 — the assertion** | 0 |
| 3b | `Ofis` insert (**active**, M5a) | 1 `warehouses` | 1 |
| 3b | **T3** mid-session flip (M5a) | 1 `UPDATE users` | 1 |
| 3b | S-2c submit | **0 — the assertion** | 0 |
| 3b | **T4** restore + `Ofis` deactivate (M5a) | 2 UPDATEs | 2 |
| 4 | S-10 drop: session-2 setup outbound | 1 `movements` | 1 |
| 4 | S-10 drop: session-1 submit | **0 — the assertion** | 0 |
| 4 | S-10 drop: setup reversal (**M6**) | 1 `movements` | 1 |
| 4 | S-10 trim: session-2 setup outbound | 1 `movements` | 1 |
| 4 | S-10 trim: session-1 submit | 1 `movements` at trimmed qty | 1 |
| 4 | S-10 trim: 2 reversals (**M6**) | 2 `movements` | 2 |
| 5 | S-11 settings insert (M5a) | 1 `stock_layer_settings` | 1 |
| 5 | S-11 measurement | **0 — read-only** | 0 |
| 5 | S-11 cleanup (M5a) | 1 `UPDATE` (inexact) **or** 1 class D `DELETE` | 1 |
| 6 | **T5** retire identities (M5a) | 1 `UPDATE users` (both rows) | 1 |
| 6 | `CODEX-P7-ANBAR-2` deactivate (M5a) | 1 `UPDATE warehouses` | 1 |

### 6.2 Conditional writes

| Conditional write | Trigger condition | Count if taken |
|---|---|---|
| **C1 — S-5 inbound top-up** | P-B returns `B < I + 1` where `I = min(5, B)`. Post a `Satınalma`, then reverse it after S-5 | +2 (1 `movements` post, 1 `movements` reversal) |
| ~~**C2 — S-6 surplus drawdown**~~ | **WITHDRAWN.** It existed to force `B_src = I_src` for S-6, a precondition now known to *guarantee* the failure it was meant to avoid (§0.-2) | ~~+2~~ → 0 |
| **C3 — S-10 trim precondition** | P-B returns `B < 2` at S-10 time. An inbound top-up is needed for the trim branch to exist | +2 (1 post, 1 reversal) |
| **C4 — S-5 intermediate restore** *(optional evidence artefact)* | Only if the user wants Q-2 to show 3 rows rather than 2 (see the Q-2 note) | +2 (1 `stock_conditions` UPDATE, 1 `audit_log`) |

### 6.3 Totals — conditional, not exact

| Scope | Steps | Counted writes |
|---|---|---|
| Batches 0–6, Batch 5 narrow, **excluding** Batch 3b and all conditionals | 31 | **37** |
| **+ Batch 3b** (§7 decision 2) | +4 | **+4 → 41** |
| **+ C1 / C3 / C4**, each independently | +2 each | **up to +6 → 47** |
| **+ optional rehber-UI audit re-read** (Batch 3 step 19) | +2 | **+2 → 49** |
| **Batch 5-ALT instead of Batch 5** | replaces 3 steps | **unbounded** |

**The honest statement of the total is therefore: 37 counted writes minimum,
41 with the «Ofis» branch, and up to 49 once every conditional and the optional
re-read are taken.** Under Batch 5-ALT the total is unbounded and no ceiling can
be given.

**Change from revision 4:** 48 → **37** (excl. 3b), 52 → **41** (incl. 3b).
The −11 is S-6's nine writes plus the two of the withdrawn S-5 intermediate
restore. The withdrawal of conditional C2 removes a further potential +2 from
the ceiling.

**Zero-write steps: 7** — S-8, S-1, S-2a submit, S-2b submit, S-2c submit,
S-10 drop submit, S-11 measurement. Each is asserted by Q-4 under the exact
timestamp / **submitting-identity** actor / item scope of §2D.0.

**Not counted, per §6.0:** `movements_audit` trigger rows — exactly one per
counted `movements` row: **16** at the 37-write base (was 20). Batch 3b adds
none (its 4 writes are `warehouses` and `users` rows); C1 and C3 add 2 each;
C4 adds none. All `M4` evidence queries are read-only and appear nowhere here.

**Role-transition cross-check.** The ledger contains T1 (1) + T2 (1) + S-2b (2)
+ S-2a (2) + T3 (1) + T4 (1) + T5 (1) = **9 `users` UPDATEs**. §2C's transition
narrative now reaches the same 9. *(Revision 4's §2C prose stated **8**, having
omitted T2 from its tally while listing it in this ledger and in §5 Batch 3
step 16. **The correct total is 9**; §2C is corrected.)*

**How much of this is currently executable.** Under §0.3A:

| | Writes |
|---|---|
| Directly **M5b/M6**-tagged (the calls that cannot be made) | **12** — **M5b contributes 4**: the İcarə fixture `stock_conditions` row + its `audit_log` row, and the cleanup `stock_conditions` DELETE + its `audit_log` row. **M6 contributes 8** reversal `movements` rows: S-3 = 2, S-5 = 1, S-4 = 2, S-10 = 3 |
| **Blocked-dependent** — the above plus the writes made unremovable by them: the whole of Batch 2 (**8**) plus the 7 reversal writes in Batches 1, 3 and 4 | **15 of the 37 base writes** |

**15 of 37 depend on a mechanism that does not yet exist.** The documents whose
reversals are blocked (S-3, S-4, S-5, both S-10 branches) **must not be posted
until it is resolved** — posting them would leave TEST holding uncancellable
documents, which is the failure mode §0.0 finding 1 was written to prevent.

## 7. Decisions that genuinely require user approval

1. **Class A′ — `CODEX-P7-ANBAR-2`.** One warehouse row; the single unlock for
   S-3 and S-4 — and Batch 5-ALT, if taken. **Must remain active until
   Batch 6**, then deactivated — not deletable once a movement references it.
   *(Rev-5: S-6 was previously listed as a third unlock; it is `BLOCKED`
   (§0.-2). The decision itself is unchanged — S-3 and S-4 alone still require
   the row.)*
2. **Class A′ — an active `Ofis` row, for S-2c.** *Revision 3 raises the cost of
   this decision.* Revision 2 proposed `active=false` to keep it out of pickers;
   that is now known to make it unselectable, so the row must be **active and
   visible to every user in every picker** for the duration of Batch 3b. It also
   requires the T2/T3/T4 role sequence. **If refused, `M7-118` refusal (c) stays
   `CODE VERIFIED`** — a legitimate closure, not a gap.
3. **Class B auth identities (M3).** Two identities unlock `M7-117`, refusals
   (a)/(b), the anbardar transfer, and the only UI path that can read `audit_log`.
   Created via the Supabase dashboard — no application UI offers this.
   **3b. Auth-side disable or deletion is a *separate* decision.** This plan sets
   `public.users.active=false` only; the auth identities remain able to
   authenticate, and `my_role()` (no `active` filter) still returns `rehber` for
   the retired rehber identity at the RLS layer.
4. **Class C and class D (layer mode).** Three choices: (a) the narrow form
   (Batch 5, read-only); (b) whether to also approve the **class D DELETE** that
   alone restores the `ready:false` probe state; (c) the full form, now
   **Batch 5-ALT**, permanently irreversible. *(Rev-4: (c) was "Batch 7", which
   ran after its own fixtures had been retired — see §0.-1 blocker 3. It is now
   an alternative to (a), taken instead of it and before Batch 6, and (a) and
   (c) are **mutually exclusive**: choosing (c) means the narrow measurement
   happens inside 5-ALT, not twice.)* If all are refused, **`M7-123` should be
   closed as NOT MEASURABLE** — itself a decision.

4b. **The conditional writes C1/C2/C3 (§6.2).** Whether the executor may post
   and reverse an extra document when a preflight precondition fails, without
   returning for a fresh approval. If refused, a failed precondition stops the
   batch instead. This is why §6.3 gives a range and not one number.
5. **The mid-session role flips — now SIX, not three.** *Revision 4 raises this
   decision's cost.* Revision 3 asked approval for T2/T3/T4 (S-2c only). It is
   now established that **S-2a and S-2b are equally unreachable without the same
   technique** (§0.-1 blocker 1, §2D): the React client refuses before the
   server is ever asked. The full set is T1, T2, T2a ×2, T2b ×2, T3, T4, T5 =
   **9 `users` UPDATEs**, of which **6 mutate the authority of a live, loaded
   browser session**. If this is refused, `M7-118` loses **all three** refusals
   to `CODE VERIFIED`, not just refusal (c) — the scope of decision 2 changes
   accordingly.

5b. **The stale-tab technique itself.** It deliberately diverges a signed-in
   client's cached authority from the server's. It writes nothing beyond the
   role UPDATEs already counted, touches only `CODEX-P7-*` identities in TEST,
   and every sequence ends by restoring `role='admin'`. It is nonetheless a
   deliberate desynchronisation of a live session and is named here rather than
   buried in a scenario step.
6. **Balance policy P-B is adopted** (§0.4): documents are reversed before later
   balance-dependent scenarios, and every quantity is derived from a read-only
   preflight. This **replaces** revision 2's "leave documents in place"
   assumption, which contradicted its own reliance on a fixed balance.
7. **S-8's execution owner (M2) — RESOLVED 2026-09-05.** The user ran the
   DevTools request-blocking scenario; Codex reviewed the observed failure and
   recovery. Result: PASS / `M7-S3` `LIVE VERIFIED`, zero writes.

8. **The S-6 server/RPC gap — preserve, or authorise a separate investigation.**
   *New in revision 5.* §0.-2 establishes that the explicit condition-split path
   cannot produce the audit row its own reversal reads, for any fixture state
   this plan may legitimately create. Two options, and **only these two are in
   scope**:

   - **(a) Preserve current server behaviour.** S-6 stays `BLOCKED`, the
     condition-split half of `M7-120` stays `CODE VERIFIED` with the gap
     recorded, and nothing in Supabase changes. **This is the default** and
     requires no further action.
   - **(b) Authorise a separate future investigation** into the ordering of
     `apply_cond_split`'s bucket mutation versus its logging call. If taken,
     it is a **standalone task with its own audit, its own approval and its own
     verification** — a server-behaviour change affecting live İcarə accounting,
     not a Phase 7 test-plan item.

   **Explicitly not on the table:** folding a server fix into migration,
   implementation or deployment scope, or treating (b) as implied by approving
   any batch in this plan. **This task proposes no Supabase change of any kind.**
   Note also that the gap is not TEST-only — the same function bodies were
   captured from production, so any change would carry production consequences
   and must be weighed as such.

9. **An execution mechanism for M5b and M6 — or the plan stays partly
   unrunnable.** *New in revision 5.* §0.3A shows that `set_stock_condition`,
   `cancel_document` and `cancel_transfer_document` all refuse a NULL
   `auth.uid()`, which is what the Supabase SQL Editor supplies. No safe
   already-available mechanism has been found within this task's constraints
   (no tokens or keys handled, no dependencies installed, no code changed, and
   the legacy `index.html` is hard-pinned to **production**). The user's options:

   - **(a) Supply an authenticated mechanism** — any route that executes these
     RPCs as a signed-in TEST user. Naming it is a user decision; this plan does
     not select one, and does not ask for a credential.
   - **(b) Run only the mechanism-independent scenarios** — Batch 0, S-1, the
     three zero-write S-2 assertions, the S-11 measurement and the M5a table
     writes. **Post no document whose reversal needs M6.**
   - **(c) Defer** the affected rows and close them as NOT EXECUTABLE in this
     environment, as `M7-123` would be closed under decision 4.

   Until this is resolved, **15 of the 37 base writes cannot be performed or
   undone** (§6.3), and Batch 2 cannot start at all.

**No longer requiring a decision:** `correct_document` (revision 1 decision 5).
S-9 is removed from Phase 7 — its irreversibility never has to be weighed here.
**S-6 is no longer a decision about fixtures either** — it is blocked by server
behaviour, and the only choice it now presents is decision 8 above.

---

## 8. Global stop conditions

Stop the batch and report, rather than continuing, if any of these occur:

- A write appears where a scenario expects zero writes (**Q-4 returns any row**).
- Any server refusal listed in S-2 fails to fire.
- A refusal fires with the **wrong message** — in particular «təyinat anbar
  tapılmadı» where «Ofisə yerdəyişməyə icazəniz yoxdur» was expected. That is the
  fixture failing, not the code.
- **A cancellation RPC raises «Yerdəyişmə sənədi bu funksiya ilə ləğv edilmir».**
  The wrong reversal RPC was used; the document is still live.
- **Any attempt to execute S-6.** It is `BLOCKED` (§0.-2) and removed from every
  batch. Posting a condition-split transfer would move İcarə state that no
  reversal restores. *(This replaces revision 4's Q-3 gate, which is withdrawn
  along with the query.)*
- **A condition row appears at `CODEX-P7-ANBAR-2`** (Q-2 destination key, or
  Q-6 at any checkpoint). Nothing in the revised plan creates one; a row there
  means a split transfer was executed contrary to §0.-2.
- **Any `set_stock_condition`, `cancel_document` or `cancel_transfer_document`
  call raises «İcazə yoxdur: sessiya tapılmadı».** The call was made without an
  authenticated session — the M5b/M6 mechanism is still unresolved (§0.3A).
  Stop; do not retry through another SQL route.
- **G1 returns 0 rows, or `batch_actor` comes back NULL.** The identity lookup
  failed, and every zero-write query scoped on it would pass vacuously
  (§2D.0).
- **`icare_qty` is still I after an S-5 post** (Q-6 point 2). The expected value
  is **I − 1**; seeing I means `apply_icare_delta` did not run and the inferred
  branch never fired.
- **`icare_qty` is not `I − 1` after the S-5 reversal** (Q-6 checkpoint 3), or
  the row still exists after S-5's final cleanup (checkpoint 4).
- **A client-side toast appears where a server refusal was expected** in any S-2
  scenario — «İcazəniz yoxdur.» or a missing warehouse option instead of the
  server's message. The tab refreshed and re-cached `me`; the run is void
  (§2C step 5). Re-run it; do not record the client refusal as evidence.
- **An evidence query fails to parse.** A `:name` placeholder survived from
  revision 3 — use the §2D.0 `WITH params AS (...)` form.
- **A zero-write check was run without all three of start timestamp, actor and
  item scope** (§2D.0). The result is not a zero-write assertion and must not be
  recorded as one.
- A role UPDATE raises «anbardar rolu üçün konkret anbar təyin edilməlidir» or
  «Anbar tapılmadı və ya aktiv deyil» — role and warehouse were not set together,
  or the warehouse was deactivated too early.
- An evidence query is found to contain anything other than `SELECT`.
- The Request URL host is anything other than the TEST project. Re-check gate
  `G0` before **every** batch, not once per session.
- A cleanup call does not return the state this plan predicts.
- Any prompt appears for production, GitHub, Vercel or deployment.
