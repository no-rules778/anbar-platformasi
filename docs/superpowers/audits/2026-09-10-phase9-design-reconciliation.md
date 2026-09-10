# Phase 9 design reconciliation — response to the Codex design audit

Date: 2026-09-10
Scope: documentation corrections only — no implementation, no database contact
Status: **Phase 9 remains NOT STARTED / NOT ACCEPTED**

Audits answered:

- **Round 1** — [`2026-09-10-phase9-design-codex-audit.md`](2026-09-10-phase9-design-codex-audit.md)
  (verdict: DESIGN NOT APPROVED — corrections required). Answered in §1–§6 below.
- **Round 2** — [`2026-09-10-phase9-design-codex-reaudit.md`](2026-09-10-phase9-design-codex-reaudit.md)
  (verdict: DESIGN NOT APPROVED — narrow reconciliation still required). Answered
  in **§7**, together with the owner decision
  [`../decisions/2026-09-10-phase9-design-package.md`](../decisions/2026-09-10-phase9-design-package.md).
- **Round 3** — [`2026-09-10-phase9-final-design-codex-audit.md`](2026-09-10-phase9-final-design-codex-audit.md)
  (verdict: two final documentation corrections). Answered in **§8**.

This supersedes the earlier handoff
[`2026-09-10-phase9-design-codex-handoff.md`](2026-09-10-phase9-design-codex-handoff.md),
whose "90 rows" figure and Q3 framing were both wrong.

**Correction history is preserved deliberately.** §1–§6 record the round-1
response **as it was made**, including two statements the round-2 re-audit later
overturned — the `correct_document` description (§1) and the D-J4 disposition
(§2, finding 8). Those are **not** edited in place; §7 states what replaced them
and why, so the sequence of reasoning stays auditable. Where §1–§6 and §7
disagree, **§7 is authoritative**.

---

## 1. The blocking finding — accepted in full, claim withdrawn

**Codex was right and my Q3 claim was wrong.** I verified the captured function
bodies myself rather than accepting the finding on authority (principles §11.7),
and the evidence is unambiguous. Every supported path inserts an **exact inverse
row**:

| Family | Function | Inverse construction (verbatim from the capture) |
|---|---|---|
| Legacy row | `cancel_legacy_movement(uuid,date)` | inserts `COALESCE(v_orig.out_qty, 0), COALESCE(v_orig.in_qty, 0)` into the `(in_qty, out_qty)` slots |
| Legacy transfer | `cancel_legacy_transfer(uuid,date)` | matches the opposite leg on exact quantity (`in_qty = v_qty AND out_qty = 0`, and the mirror) before inserting both counter-rows |
| Whole document | `cancel_document(text,date)` | `IF r.in_qty > 0` → `VALUES (…, 0, r.in_qty, …)`; `ELSIF r.out_qty > 0` → `VALUES (…, r.out_qty, 0, …)` |
| Transfer document | `cancel_transfer_document(text,date)` | same mirrored construction on both `Yerdəyişmə` legs |
| Layer transfer | `cancel_layer_transfer_document(text,date)` | reverses on `SUM(out_qty - in_qty)` per warehouse × item |
| Correction | `correct_document(text,jsonb,text,date)` | appends a note marker; does not fabricate unbalanced quantities — **⚠ WRONG, superseded by §7.1** |

A source row and its counter-row therefore sum to **zero** in the raw set, and
`excludeCancelled()` removes **both**, which also sums to zero. **Raw and
operational balances are algebraically equal on every supported history**, so
`exceeds_balance` compares against the number the screen actually shows.

My row-level-cancellation example asserted the marker row survives the raw sum
uncancelled. It does not — `cancel_legacy_movement` writes the inverse. I stated
a hypothesis as a finding, which is exactly what principles §11.7 warns against.

**Q3 reframed, no owner decision requested:**

- **M9-141** — claim withdrawn, with the inverse-row evidence recorded inline.
- **M9-141a** — read-only raw-versus-operational comparison per warehouse × item
  across the whole TEST `movements` table, expected equal everywhere. Now
  gate step **T0.4**.
- **M9-141b** — invariant tests for all five supported cancellation families
  plus `correct_document`. Now task **T2c**.
- **M9-141c** — a narrowly worded corrupt-history policy, written **only if**
  M9-141a finds a real unequal pair, and only with an owner decision at that
  point. Not written speculatively. **⚠ It was nevertheless created as a
  `NOT STARTED` authoritative row, which contradicted that intent; removed in
  §7.5.**

Also corrected: the proposal's stale pointer to `M9-73` now reads `M9-141`.

## 2. Disposition of the other findings

| # | Finding | Disposition |
|---|---|---|
| 1 | Condition-read failure is an undeclared deviation | **Accepted.** Verified at `index.html:904-923`: the read is wrapped in `try/catch` and `DB.condsReady` is set **only** inside `if (!condErr)`, so legacy genuinely keeps working with blank markers. Recorded as **D-J1** (proposal §5A) and rewritten into M9-11/12/13. T3 adds a test asserting the deviation. No longer attributed to parity |
| 2 | Realtime scope is an undeclared improvement | **Accepted.** Verified at `index.html:1174`: legacy subscribes exactly `['movements','items','partners','warehouses']`. Recorded as **D-J2**; new row **M9-130a** states the departure (adds `stock_conditions`, drops `partners`) and T5 pins the subscribed set by test |
| 3 | Q2 is already resolved | **Accepted.** Q2 is marked **SETTLED, NOT OPEN** in proposal §6, the ledger decision table and the plan. M9-120/M9-121 stay outside acceptance; a dead button is presentation work, not a gate |
| 4 | Q5 needs a wider regression guard | **Accepted.** Grepped the real consumer set: **12 files**, not just `groupFilters` — `itemIndex`, `groupFilters`(+test), `opLineValidation`, `bulkWriteOff.test`, `operation.store`, `itemGroups.store.test`, `ItemGroupsPage`, `NewOperationPage`, `ItemStatePanel`(+test), `ItemCard`. All are named in M9-28, risk R1 and task T1. "Phase 6 suite alone" removed everywhere |
| 5 | Ledger metadata and schema transcription wrong | **Accepted.** Codex's 112 was correct for revision 1; the "90" claim is retracted. Revision 2 adds the rows required by findings 1, 2, 7, 8, 9 and the Q3 reframing, so the ledger now holds **125** unique ids (115 plain + 10 lettered), verified by enumerating the file after the rewrite rather than carrying a figure forward. Schema corrected from the capture: `icare_qty` = `numeric(14,2)` **NOT NULL DEFAULT 0** (last column, added by sql/031), `created_at` = `timestamptz` **NOT NULL DEFAULT `now()`**. Both my nullable transcriptions were wrong |
| 6 | Two export claims overstate parity | **Accepted.** Verified 2268 vs 2276 and 2357 vs 2374 — table order begins `Kod · Malın adı · Anbar`, export begins `Anbar · Kod · Malın adı`, in **both** views. M9-111 rewritten to state the difference; new **M9-110a** records it for the current view; T2 pins it by test so it cannot be "tidied" into false parity. M9-118 rewritten: export carries **the complete filtered UI dataset built from the RLS-scoped snapshot**, which is not "exactly the rows RLS returned" — the screen aggregates movements and may append no-movement nomenclature items |
| 7 | Missing ledger contracts | **Accepted.** Added **M9-110b** (current table's 14-column order and every cell formatter), **M9-79a** (named-warehouse filtering in the opening view), **M9-79b** (opening-view search haystack), **M9-85** (all four opening KPI values and subtitles, including the always-`money(0)` value column and the absence of a Mənfi qalıq KPI). M9-64 added for the current view's KPI values/subtitles |
| 8 | Initial-balance marker asymmetry needs a row | **Accepted.** Recorded as **D-J4** and new row **M9-84**: the write guard recognises partner **or** channel (1926-1928), the read recognises **partner only** (2001). Phase 9 preserves the legacy read unchanged and does not claim equivalence; T2 adds a test pinning that a channel-only row is not reconstructed. Widening needs evidence such rows exist plus an owner decision — not in Phase 9. **⚠ The owner decided the opposite; superseded by §7.4 — the read IS widened and the omission is NOT preserved** |
| 9 | M9-134 is an undeclared improvement and imprecise | **Accepted.** Recorded as **D-J3** with an exact, testable policy (proposal §5A): the snapshot is applied to the store but **deferred for the editing cell only**; that cell keeps the uncommitted input and its pre-edit baseline; **cancel adopts the latest snapshot value, not the stale one**; commit sends one RPC and the returned row is authoritative, with no conflict dialog because the RPC sends all four quantities and is last-write-wins. Split into M9-134/134a/134b, with three named tests in T7. **⚠ Incomplete — it still permitted a lost update and said «Escape / blur without commit», contradicting M9-94. Superseded by §7.3: blur commits, and commit composes the edited key with the latest snapshot for the other three keys and note, with the stale-overwrite regression test added to M9-134b** |

## 3. Decisions as recorded

| id | Status |
|---|---|
| Q1 | **APPROVED in-phase** — condition write path ships in Phase 9 |
| Q2 | **SETTLED, NOT OPEN** — outside acceptance |
| Q3 | **REFRAMED to measurement** — no owner decision unless real unequal data is found |
| Q4 | One separately authorised reversible TEST write window at T10; nothing before it |
| Q5 | Extend `WarehouseBalance` only with the 12-consumer guard |

## 4. Live reconfirmation — blocked, and now a gate

The task asked me to re-confirm the schema/RPC/RLS facts and the
raw-versus-operational equality live on TEST if credentials were available.
**They are not:** no `ANBAR_TEST_PASSWORD` or equivalent is present in this
environment. Codex hit the same wall.

So **no live reconfirmation was performed, and none is claimed.** Every server
statement still rests on the 2026-09-03 captures. This is now a **blocking
pre-implementation gate**:

- proposal **§7A** — the four read-only checks;
- ledger **M9-19** and **M9-141a**;
- plan **T0**, which explicitly blocks every other task.

If credentials stay unavailable, T0 stays open and implementation does not start.

## 5. What changed on disk

| File | Change |
|---|---|
| `specs/…phase9-balances-proposal.md` | §3.1 schema corrected; §3.3 rewritten (claim withdrawn + inverse-row table); §4.5 Q2 settled; **new §5A** declaring D-J1…D-J4; §5 Q5 note; §6 decisions rewritten; §7 risks rewritten (R1 12 consumers, R4 reframed, new R8); **new §7A** live gate |
| `specs/2026-09-10-phase9-registry-rows.md` | Revision 2. Row count corrected to **125** (from Codex's correct 112 for revision 1, and the earlier wrong 90); decision + deviation tables added; M9-11/12/13, M9-28, M9-111, M9-118, M9-130, M9-134, M9-141 rewritten; **new** M9-19, M9-64, M9-79a, M9-79b, M9-84, M9-85, M9-110a, M9-110b, M9-130a, M9-134a, M9-134b, M9-141a, M9-141b, M9-141c |
| `plans/…phase9-balances.md` | Revision 2. **New T0** blocking gate; T1 guard widened to 12 consumers; **new T2c** invariant coverage; D-J1…D-J4 tests placed in T2/T3/T5/T7; Q-status table; entry and exit criteria reference 125 rows (**now 124 — see §7.6**) |
| `audits/2026-09-10-phase9-design-reconciliation.md` | This document |

No application source, SQL, schema, `.env`, dependency or Phase 7/8 evidence file
was modified.

## 6. Safety

No Supabase request of any kind (production `bbjmhaerssakbreykxiw` not
contacted, TEST not contacted — no credentials). No mutation, fixture, layer
deactivation or cutover. Nothing staged, committed, pushed or deployed. The
pre-existing dirty tree is preserved. `VITE_ALLOW_LOCAL_WRITES=false` untouched.

Phase 9 remains **NOT STARTED / NOT ACCEPTED**. Ready for Codex re-audit.

---

# §7. Round-2 reconciliation — response to the Codex design re-audit

Date: 2026-09-10
Answering [`2026-09-10-phase9-design-codex-reaudit.md`](2026-09-10-phase9-design-codex-reaudit.md)
(verdict: DESIGN NOT APPROVED — narrow reconciliation still required) and
applying the owner decision
[`../decisions/2026-09-10-phase9-design-package.md`](../decisions/2026-09-10-phase9-design-package.md).

Scope unchanged: **documentation only.** No application code, SQL, RPC, schema,
Supabase data, fixture, `.env`, dependency, layer deactivation, cutover, stage,
commit, push or deploy. No database of any kind was contacted.

## 7.1 `correct_document` — corrected everywhere (re-audit finding 1)

**Accepted, and verified from the capture rather than on authority.** I read the
captured body of `correct_document(text,jsonb,text,date)` in
`test-environment/production-functions-2026-09-03.json` before changing any
wording. The re-audit is right:

```text
v_marker := 'Əvəz edir: ' || v_doc;       -- note text on the REPLACEMENT lines
v_lines  := p_lines, each with that note;
v_cancel := public.cancel_document(v_doc, p_reversal_date);
v_posted := public.post_movement_document(v_lines, NULL);
```

The old description — "appends a note marker" — named a real artefact but the
**wrong mechanism**. The marker is provenance text carrying no quantity. What
actually happens is a **cancellation pair plus a replacement document**:

1. the original and its `cancel_document` reversal sum to **zero** in the raw
   set, and `excludeCancelled()` removes **both** (also zero);
2. the **replacement** document is ordinary and uncancelled — present in **both**
   the raw and the operational sets, contributing identically to each.

The equality conclusion is unchanged; it now rests on the real reason.

**M9-141b's invariant is updated accordingly**: the `correct_document` case is a
three-part fixture (original + reversal + replacement) asserting **raw sum ==
`excludeCancelled()` sum**, failing if the replacement is treated as cancelled or
the pair as unbalanced. Corrected in proposal §3.3, ledger M9-141 and M9-141b,
plan T2c, and marked superseded in §1 above.

## 7.2 Owner approval recorded (re-audit finding 2)

**Accepted.** The owner decision now exists and is cited by path in every
document. Q1 and D-J1…D-J4 are labelled **OWNER-APPROVED** with a section
reference; the interim `RECOMMENDED / OWNER DECISION PENDING` label is gone.

| id | Status | Cited at |
|---|---|---|
| Q1 | **OWNER-APPROVED** — condition write path in Phase 9 | decision §1 |
| D-J1 | **OWNER-APPROVED** — failed condition read fatal; last good snapshot stays visible | decision §2 |
| D-J2 | **OWNER-APPROVED** — subscribe `stock_conditions`, omit `partners` | decision §3 |
| D-J3 | **OWNER-APPROVED** — editor survives refresh; Escape cancels, blur commits, commit merges | decision §4 |
| D-J4 | **OWNER-APPROVED** — read widened to partner **or** channel | decision §5 |

The decision approves **design behaviour only**. It authorises no live write, no
production contact, no deployment, cutover, commit, push or merge, and the single
reversible TEST write still requires the separate T10 gate.

## 7.3 D-J3 — lost update closed, blur contradiction resolved (re-audit finding 3)

**Accepted in full.** Two distinct defects, both fixed:

1. **The blur contradiction.** M9-94 says Enter/blur commits and Escape cancels;
   M9-134a said «Escape / blur without commit» adopts the latest snapshot. That
   made blur both a commit and a cancel. **Resolved: Escape is the only cancel
   gesture; blur commits.** M9-134a and M9-134b are reworded, and the withdrawn
   phrasing is named so the change is visible.

2. **The lost update.** `set_stock_condition` takes all four quantities plus the
   note, so a commit that replayed the pre-edit baseline would silently revert a
   concurrent change to a **different** condition key. **Resolved by the approved
   composition rule:** the commit sends the **user's value for the actively
   edited key** and the **latest snapshot values for the other three keys and the
   note**. The baseline is never resent for untouched keys.

**The falsifiable regression test the re-audit required is stated inside
M9-134b**: realtime changes another condition key mid-edit; on commit the single
RPC must carry that key's **new** value, and the test **fails if the pre-edit
baseline is resent**. Escape after such a refresh shows the latest complete
snapshot row. The RPC response remains authoritative.

**Why it is not a separate row.** An intermediate draft of this revision added
`M9-134c` for it. That was a mistake of bookkeeping rather than of substance: it
would have left the ledger at 125 while the recount below claims 124, since the
new row replaced the removed one. Finding 3 requires the **test** to exist and be
falsifiable — not a distinct ledger id — and M9-134b already governs the commit
payload the test falsifies, so the assertion belongs there. **There is no
M9-134c.** Recorded in proposal §5A (D-J3), ledger M9-134a/134b, plan T7 (four
named tests, the fourth carried by M9-134b) and risk R3.

## 7.4 D-J4 — reversed; the legacy omission is not preserved (re-audit finding 5 of round 1, owner decision §5)

**Accepted, reversing my round-1 disposition.** I verified both sides in the
legacy source before changing the design:

- `index.html:1927` — `_isInitBalType(type) && (_isInitBalPartner(partner) || _isInitBalPartner(channel))`
- `index.html:2001` — `_isInitBalType(m.t) && _isInitBalPartner(m.p)`

The asymmetry is real: a channel-only historical row is refused at write time for
a non-admin yet never reconstructed into the «Əvvələ qalıq» view, so its opening
lot silently vanishes from the provenance report. Round 1 proposed **preserving**
that omission. The owner decided the opposite.

**Phase 9 widens the read to recognise the marker in partner OR channel**,
matching the already-supported write definition. The test direction is inverted
accordingly: a channel-only opening row **IS** reconstructed, and partner-marked
rows are unchanged. This is a **deliberate correction of a legacy defect** and is
never to be described as parity. Recorded in proposal §5A (D-J4), ledger M9-84,
plan T2 and the verification section.

## 7.5 T0 split into T0A / T0B (re-audit finding 4)

**Accepted.** Round 1 treated "no TEST password" as the single blocker for the
entire gate. That was wrong in **both** directions, and the re-audit is precise
about why: an ordinary authenticated PostgREST session can prove more than I
credited, and no UI password can ever prove the catalog facts.

- **T0A — ordinary TEST identities:** behavioural RLS matrix, exposed column set,
  exposed RPC signature, role refusals requiring no lasting mutation, and the
  raw-versus-operational comparison (M9-141a).
- **T0B — catalog authority:** exact `pg_policy` rows, table/function ACLs, exact
  column definitions and constraints, and the current `pg_proc` body. Obtainable
  **only** through an authorised Supabase catalog connection or a fresh trusted
  capture.

**No document now claims a TEST UI password provides catalog access.** If that
authority is unavailable it is reported as unavailable and the dependent rows
stay blocked. T0A may pass while T0B remains open. The 2026-09-03 capture remains
valid **design** evidence; its **freshness is proved only by T0B**. Recorded in
proposal §7A and plan T0.

## 7.6 M9-141c removed; ledger recounted to 124 (re-audit finding 5)

**Accepted.** M9-141c was written as a `NOT STARTED` authoritative row while the
plan said it is created only if M9-141a finds unequal data. Since the exit rule
requires **every** row to be evidenced or excluded, an equal measurement would
have left a permanently unclosable row.

**M9-141c is removed from the authoritative ledger.** It is created **only if**
M9-141a discovers a real unequal pair, and only with an owner decision at that
point; if that ever happens, the ledger total and the exit rule are updated
together in the same revision.

**Recount, measured not carried forward:**

| Revision | Count | Note |
|---|---|---|
| handoff | 90 | wrong |
| 1 | 112 | correct for that revision (Codex) |
| 2 | 125 | 115 plain + 10 lettered |
| **3** | **124** | **115 plain + 9 lettered** — `−` M9-141c |

Verified by **enumerating the row ids in the ledger file after the rewrite**, not
by arithmetic on the previous figure: **124 unique ids, no duplicates.**

That enumeration caught a real error before this document was finished. An
intermediate draft removed M9-141c **and** added a new `M9-134c`, which left the
file at **125** while the header claimed 124 — the removal and the addition
cancelled out. The check failed, the draft was corrected (finding 3's test folded
into M9-134b, §7.3), and the count was re-measured. This is exactly the failure
mode the "enumerate, never carry forward" rule exists to catch, and it is
recorded rather than quietly fixed.

Every count reference is reconciled — ledger header and count history, plan entry
criterion 5 and exit criteria. No "125" remains as a live figure; it survives
only in the count history, labelled as superseded.

## 7.7 What changed on disk in round 2

| File | Change |
|---|---|
| `specs/…phase9-balances-proposal.md` | §3.3 `correct_document` rewritten with the captured call sequence; §5A preamble records owner approval; D-J1/D-J2 headed **OWNER-APPROVED**; **D-J3 rewritten** (Escape cancels / blur commits / composed commit payload, stale-overwrite test under M9-134b); **D-J4 reversed** to the widened read; §6 Q1 cites the decision; **§7A split into T0A/T0B**; R3 updated |
| `specs/2026-09-10-phase9-registry-rows.md` | **Revision 3.** Count **125 → 124**; M9-141c **removed**; M9-141 and M9-141b corrected for `correct_document`; M9-134a/134b rewritten (M9-134b now carries the stale-overwrite regression test); **M9-84 reversed**; decision and deviation tables cite the owner decision |
| `plans/…phase9-balances.md` | **Revision 3.** T0 **split into T0A/T0B**; decision + deviation status tables; entry criterion 5 and exit criteria **124**; T2 D-J4 test **inverted**; T2c `correct_document` fixture corrected; T7 **four** D-J3 tests, the fourth carried by M9-134b; verification section updated |
| `audits/2026-09-10-phase9-design-reconciliation.md` | This §7, plus supersede markers on the round-1 statements that were overturned. **Round-1 text preserved, not rewritten** |

No application source, SQL, schema, `.env`, dependency or Phase 7/8 evidence file
was modified.

## 7.8 Safety

No Supabase request of any kind — production `bbjmhaerssakbreykxiw` not
contacted; TEST not contacted (no credentials). No mutation, fixture, layer
deactivation or cutover. Nothing staged, committed, pushed or deployed. The
pre-existing dirty tree is preserved. `VITE_ALLOW_LOCAL_WRITES=false` untouched.
No application code was implemented — this round is documentation only.

Phase 9 remains **NOT STARTED / NOT ACCEPTED**. Ready for the final Codex design
re-audit.

---

## 8. Final narrow Codex audit reconciliation

Section 8 supersedes only the two faulty round-2 statements identified below;
all other §7 dispositions remain authoritative.

### 8.1 T0A is strictly read-only

**Accepted.** The round-2 phrase “role refusals requiring no lasting mutation”
was unsafe: a refused RPC is still a live mutation attempt, and a valid
seven-argument signature probe may write. T0A now contains only:

1. behavioural read/RLS comparison;
2. exposed `stock_conditions` columns;
3. M9-141a's raw-versus-operational read-only comparison.

The real `rehber` refusal and every executable `PGRST202` fallback probe move to
the separately authorised T10 window. M9-92, M9-99, M9-100 and M9-108 carry that
boundary; no new ledger row is needed. If a fallback branch cannot be reached on
the live schema, its live portion is not claimed.

T0A must pass before any implementation. If T0B remains unavailable, only work
independent of exact policy/ACL/constraint/function-body facts may proceed;
T0B-dependent tasks and rows stay blocked.

**Live routing correction after design acceptance:** a TEST-only GET of
`/rest/v1/` with the sandbox publishable key returned HTTP 401 `Secret API key
required`. No RPC was invoked. The exposed signature therefore moves wholly to
T0B; it is not obtainable through the ordinary T0A key path. This uses the
explicit alternative allowed by the final audit (“or leave the exact signature
to T0B”) and does not reopen the accepted design.

### 8.2 ACL wording corrected

**Accepted.** The capture says `authenticated=rDxtm/postgres`; calling that
“only `r`” was factually wrong. Revision 4 records the complete captured string
and the narrower security conclusion: it lacks the direct DML privilege letters
`a` (INSERT), `w` (UPDATE) and `d` (DELETE). T0B must compare the full current ACL
and must not discard `D`/`x`/`t`/`m` from its report.

### 8.3 Scope and status

The ledger remains **124 unique ids**. `M9-134b` still contains the required
falsifiable stale-overwrite test; no `M9-134c` is created. This reconciliation
changes documentation only and authorises no implementation or live write.

The final Codex confirmation is recorded in
[`2026-09-10-phase9-design-codex-acceptance.md`](2026-09-10-phase9-design-codex-acceptance.md):
the **design is accepted**, while Phase 9 remains **NOT STARTED / NOT ACCEPTED**.
