# Phase 7 H-2 Codex implementation audit

**Date:** 2026-09-04  
**Scope:** milestone H-2 (`T4`, `T5`)  
**Verdict:** CHANGES REQUIRED before H-3

Independent checks passed: **1441 tests / 84 files**, typecheck, oxlint, build
and `git diff --check`. No live read or write was performed by this audit.
Root `index.html` has only the previously recorded `manage_reference.p_id`
diff; H-2 did not add to it. `VITE_ALLOW_LOCAL_WRITES` remains unset.

## Findings

### A01 — Page mount deletes the saved draft before restore (P1)

`NewOperationPage` starts the asynchronous load in its first effect, then its
second effect immediately calls `saveDraftNow()` for the initial empty `lines`.
`saveDraftNow()` removes the user's localStorage key when lines are empty. The
later `load().then(restoreDraftOnBoot)` therefore finds no draft. This defeats
the recovery contract and silently destroys exactly the data M7-51…M7-55 are
intended to protect.

Required correction: do not enable the line-save effect until the one-time
restore attempt has completed. Add a page-level regression test with a real
stored draft that proves first mount restores it and does not remove it before
restore. Also prove later clear/remove still updates/removes storage.

### A02 — Changing source warehouse leaves the old quantity armed (P1)

`OperationForm.onWarehouseChange()` clears pick, query and split for `out`/`mv`
but does not clear `qty`. Legacy `clearPickedItem()` clears quantity too, and
M7-23 explicitly requires that. After choosing a new warehouse and another
item, the stale quantity can be submitted unintentionally.

Required correction: clear quantity together with the picked item on an
`out`/`mv` source change, but retain both on `in`. Add direct tests for both
branches.

### A03 — Outbound «Qaytarma» offers the wrong counterparty directory (P1)

The rendered counterparty list always calls `partnerOptions(kind)`. For
`out + Qaytarma`, legacy switches to `partnerOptions('in')` because the goods
are returned to their owner. The current form instead offers project/location
recipients, so a later enabled post path could record the wrong counterparty.
M7-10 correctly remains incomplete despite the H-2 form being present.

Required correction: implement the legacy list swap, preserve a still-valid
current value, otherwise select the first valid partner, and add the M7-10
transition tests.

### A04 — Failed reference-directory fallback treats operation types as channels (P2)

`operation.store.ts` derives `observedChannels` from `MovementRow.type`.
The legacy fallback derives it from `movement.channel`. `MovementRow` and the
Phase 5 narrow movement query currently do not select `channel`, so on a
reference-values failure the form offers values such as movement types and
omits real historical channels.

Required correction: make the core movement snapshot carry `channel` and
derive the fallback from that field after cancellation filtering. Add an
integration-level store/form regression. Because this widens read 2, keep the
old M6-40 evidence historical and re-measure the current read when completing
M7-123.

### A05 — Combobox search does not implement M7-19 (P2)

The form searches immediately instead of using the required 160 ms debounce,
and code matching is disabled unless the query starts with a digit. Legacy and
M7-19 require a case-sensitive code substring regardless of the first
character. Existing tests only exercise names, so the regression is hidden.

Required correction: port the 160 ms debounced query and unconditional code
substring matching, with fake-timer tests for the delay and a code substring
whose query does not start with a digit.

### A06 — Lines table is promoted beyond what it renders (P2)

M7-40 is reported `CODE VERIFIED`, but `routeText()` renders only the warehouse
for `in`/`out`. Legacy renders `partner → warehouse` for inbound and
`warehouse → partner` for outbound, together with the operation type. The
component also has no `sourceAmount`/`priceVariants` model, so its layered
amount/price behaviour cannot yet satisfy M7-40/M7-74.

Required correction: render and test all three plain route forms and their
operation type. Implement the layered fields with H-3, or keep the affected
row explicitly `IN PROGRESS`; do not claim the complete table contract early.

### A07 — Restore feedback and status ledger overclaim completion (P2)

`restoreDraftOnBoot()` returns the dropped-line count, but
`NewOperationPage` ignores it and never shows the M7-54 toast. The H-2 narrative
nevertheless says the full restore cycle is complete. In addition, the
individual registry table rows still carry their old `NOT STARTED` statuses
while the appended H-2 narrative claims promotions, leaving two contradictory
status sources in the same file.

Required correction: surface the exact restored/dropped feedback through the
page, test it, then reconcile the actual row statuses and totals in the
registry/handoff. Keep every row affected by A01-A06 incomplete until its
regression test passes.

## Verified positives

- The five core reads are folded before committing a snapshot; failed refresh
  retains the last good core while blocking posting.
- Optional probes are kept outside the core gate.
- D-H1 source/destination narrowing is used by the rendered form.
- The page subscribes only to `items`, `movements`, and `warehouses`, and store
  refresh does not clear in-memory lines.
- H-2 contains no post RPC, browser-native confirmation bypass, navigation,
  Supabase mutation, GitHub/Vercel action or production access.

H-3 must not start until A01-A07 are remediated and independently re-audited.

## Re-audit after A01-A07 remediation

**Verdict:** CHANGES STILL REQUIRED before H-3.

The submitted corrections for A02-A07 are present and their direct regression
tests pass. A01 is fixed for a successful initial load, but its failure path is
still unsafe. Independent checks after remediation pass: **1459 tests / 84
files**, typecheck, oxlint, build and `git diff --check`. No live read or write
was performed.

### A08 — A failed initial core load can still delete the saved draft (P1)

`NewOperationPage` calls `restoreDraftOnBoot()` after `load()` resolves without
checking whether the core load succeeded. If warehouses failed to load, the
store supplies an empty permission set; `restoreDraft()` classifies every line
as `no-permission`, and `restoreDraftOnBoot()` removes the localStorage draft.
This turns a temporary network/read failure into permanent local data loss.

Required correction: attempt permission-filtered restoration only after a
healthy core snapshot exists. On an initial core failure, preserve the stored
draft untouched for a later retry/remount. When mounting with an already
healthy snapshot and empty lines, actually attempt restoration rather than
only arming future saves. Add both page-level regression tests.

### A09 — The 12-result cut happens before the outbound stock filter (P2)

`OperationForm` takes the first 12 text/code matches and only then filters them
by positive stock. Legacy filters by the selected warehouse first and applies
`.slice(0, 12)` afterwards. If the first 12 matching nomenclature rows have no
stock but a later matching row does, React incorrectly reports no result.

Required correction: apply the outbound/mv stock predicate before the 12-row
cut; inbound remains unfiltered. Add a regression with at least 13 matching
items where only the last item has stock.

### A10 — Basic form defaults and the `Silinmə` transition remain incomplete (P2)

The legacy form renders today's date, the first allowed operation type, the
user/default warehouse and the first valid counterparty immediately. React
adds blank options and initializes all of those fields to empty. In addition,
selecting `Silinmə` only changes the displayed option list; it does not pin
`header.p` to `Sahə üzrə məsul şəxs` as M7-11 requires. Existing tests seed the
already-correct value and therefore do not exercise the transition.

Required correction: initialize the effective header defaults through the
store/form without creating a second rules source; pin `Silinmə` on every type
change; preserve the per-tab header capture contract. Add tests from a genuinely
empty header and a real type transition.

### A11 — H-2 status ledger remains internally contradictory (P2)

The H-2 narrative says rows such as M7-03, M7-05, M7-09, M7-21, M7-24,
M7-42/43, M7-105/106/108/111 and M7-119 were promoted, while their actual
registry-table status remains `NOT STARTED` or still names completion in H-2.
The remediation handoff says the per-row statuses were corrected in place, but
they were not corrected consistently.

Required correction: after the application fixes, reconcile every H-2 row's
table status against its complete contract. Use `CODE VERIFIED` only for a
fully implemented row and `IN PROGRESS` for a real remaining H-3/H-4 half; do
not leave a contradictory narrative addendum as the effective status source.

## Re-audit result

**H-2 CODE APPROVED; Phase 7 remains incomplete and is not live verified.**

A08–A11 are remediated and regression-tested. The final independent run is
**1474 tests / 84 files passed**, with typecheck, oxlint, build and
`git diff --check` clean. The one heavy `ItemGroupsPage` test also passed on a
repeat run; the earlier full-suite timeout was environmental contention, not a
failure. No Supabase connection, live read, live write, deployment or root
`index.html` change was made by this audit.

H-3 may now begin. H-2 itself still has no dialogs, navigation or posting, and
the Phase 7 acceptance boundary remains open until H-3, H-4 and H-5 are done.
