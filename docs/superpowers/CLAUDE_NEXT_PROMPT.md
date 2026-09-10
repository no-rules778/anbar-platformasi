# Claude next task — Phase 9

> **MANDATORY — read first.** [`CLAUDE_RELIABILITY_PROTOCOL.md`](./CLAUDE_RELIABILITY_PROTOCOL.md)
> is binding for every ANBAR task: exact contract before implementation,
> boundary matrices including the equality case, falsifiable positive/negative
> tests, first refusing guard, no generalisation beyond the tested dimension,
> distinct evidence levels, mechanically computed ledger tallies, contradiction
> sweep and final self-review. Independent Codex review remains authoritative
> for acceptance.

> **CURRENT T3 PROGRESS — 2026-09-10 (latest).** The page/store/API slice
> is complete and audited: the `bal` route is wired, `BalancesPage.test.tsx`
> carries 56 tests including the M9-134b cross-key regression, the
> `xlsFallback` harness defect and the `ConditionCell` lint defect are fixed.
> Do not repeat it. **Authoritative tally, measured mechanically from the 124
> `| M9-* |` rows: 112 `CODE VERIFIED`, 6 `NOT STARTED`, 1 `LIVE VERIFIED` (M9-141a), 5 `IN PROGRESS` (M9-19, M9-92, M9-99, M9-100, M9-108), 0 `BLOCKED`, 0 unclassified.**
> **Remaining Phase 9 work is live/server only:** T0B (M9-19, M9-99 signature),
> the Q4/T10 write window (M9-92 refusal, M9-100 probe, M9-108 texts, M9-109),
> then the independent Codex acceptance audit. No pure-logic slice remains.
> See `audits/2026-09-10-phase9-t3-balances-page.md`.

> **CURRENT T2 PROGRESS — 2026-09-10.** The «Əvvələ qalıq»
> reconstruction slice is complete: **M9-55, M9-70, M9-72…M9-77, M9-79, M9-79a,
> M9-79b and M9-84 are `CODE VERIFIED`; M9-71 is `IN PROGRESS`** (its sorting
> clause is verified, its `normalMovements()` source clause is not) in
> `lib/initialBalance.ts` (legacy
> `index.html:1898-1952, 1959-2048, 2240-2253`). Do not repeat it. **M9-84 is
> the owner-approved D-J4 correction** — the read recognises the marker in
> partner OR channel, delegating to the same predicate the write path uses;
> it is explicitly NOT byte-identical legacy behaviour. **M9-78, M9-80…M9-83
> and M9-85 were deliberately NOT promoted** — `BalancesPage.tsx` presentation
> that no pure test can evidence.
>
> **SUPERSEDED (T3):** at that slice the 124 rows measured 37 `CODE VERIFIED`, 84 `NOT STARTED`, 1 `LIVE VERIFIED` (M9-141a), 2
> `IN PROGRESS` (M9-19, M9-71), 0 unclassified (HISTORY); the current figure is in the T3 banner above.
>
> **CODEX CORRECTION ROUND — 2026-09-10.** **M9-71 is `IN PROGRESS`, not
> `CODE VERIFIED`:** its sorting clause is verified, but the
> `normalMovements()` operational-source clause is unimplemented —
> `buildInitialBalanceRows()` never calls `excludeCancelled()` and no caller
> imports it yet. It closes when the real `BalancesPage`/snapshot caller
> supplies `excludeCancelled()` output. Also corrected: `??` → legacy `||` on
> both item-name fallbacks (a real code defect), M9-70 now defers the marker
> FIELD SET to M9-84, and M9-79b's guard order is verified by source
> comparison only — the predicates commute, so order cannot be falsified from
> outputs. See `audits/2026-09-10-phase9-t2-initial-balance.md`.
>
> **SUPERSEDED next step:** the `lib/balanceExport.ts` slice named here is
> DONE and audited in T3; see the banner at the top of this file.

> **M9-51 BOUNDARY CORRECTION — 2026-09-10 (Codex-found).** The ledger wording
> `zero |q| < 1e-9` was wrong and now reads `<= 1e-9`. Legacy 2327-2329 rejects
> only `< 1e-9` for `act` and only `> 1e-9` for `zero`, so exactly `q = ±1e-9`
> belongs to **both** segments — intentional legacy behaviour the
> implementation already reproduced. **No application code changed**; three
> boundary tests were added (32 focused tests, was 29). This is a
> contract/evidence correction, so M9-51 stays `CODE VERIFIED`. **HISTORY —**
> the tally of that moment (25 / 97 / 1 / 1 / 0) was unaffected and is now
> superseded. The 37 / 84 / 1 / 2 / 0 tally that followed is likewise
> (SUPERSEDED — T3); the current figure is at the top of this file.

> **CURRENT T2 PROGRESS — 2026-09-10 (latest).** The filters/sorts/KPI slice is
> complete: **M9-51, M9-52, M9-54, M9-61 are `CODE VERIFIED`** in
> `lib/balanceFilters.ts` (legacy `index.html:2326-2345`). Do not repeat it.
> **M9-50 was deliberately NOT promoted** — its 200 ms debounce and paging
> reset are page concerns no pure test can evidence.
>
> **SUPERSEDED — tally and next step (2026-09-10).** **HISTORY —** this banner's
> tally (25 / 97 / 1 / 1 / 0) and its "next slice" instruction are superseded.
> The `initialBalance` slice named here is **DONE**; the 37 / 84 / 1 / 2 / 0
> tally that followed it is (SUPERSEDED — T3). The current figure is at the
> top of this file.
> The M9-51/52/54/61 promotions in this banner still stand.

> **EARLIER T2 PROGRESS — 2026-09-10.** The `balanceRows` slice is
> complete: **M9-30…M9-35, M9-42, M9-43, M9-45 are `CODE VERIFIED`**. Do not
> repeat it. `lib/balanceRows.ts` builds the three source shapes, the
> no-movement catalogue rows (with the exact `nomv` marker the future UI needs)
> and the display-only marker attachment. **M9-36 and M9-41 were deliberately
> NOT promoted** — they depend on presentation, KPI and export code that does
> not exist yet.
>
> **Next T2 slice:** filters, sorts and KPI aggregates (M9-51, M9-52, M9-54,
> M9-61) reading `BalanceRow` as input, and/or `lib/initialBalance.ts`
> (M9-70…M9-79b, M9-84) and `lib/balanceExport.ts` (M9-110…M9-116).
> See `audits/2026-09-10-phase9-t2-balance-rows.md`.
> **SUPERSEDED (2026-09-10):** this "next slice" instruction is HISTORY — the
> `initialBalance` slice is DONE and the ranges above are the slice's *scope*,
> not a status claim. Current statuses are in the banner at the top of this
> file: M9-71 is `IN PROGRESS`, M9-78 is `NOT STARTED`.
>
> **Baseline note:** `src/pages/ItemGroupsPage.test.tsx` can time out under full
> parallel load; it passes in isolation and passed in the latest full run. It is
> a flake, not a regression — do not "fix" it as part of another slice.

> **EARLIER T2 PROGRESS — 2026-09-10.** The condition pure-rule slice is
> complete: M9-90/M9-91 and M9-96/M9-97 are `CODE VERIFIED`. Do not repeat it.
> T0B remains separately blocked.
> See `audits/2026-09-10-phase9-t2-condition-pure-rules.md`.

> **CURRENT IMPLEMENTATION HANDOFF — 2026-09-10.** T0A passed under the owner
> waiver and **T1 is complete**: M9-21…M9-28 are `CODE VERIFIED`; see
> `audits/2026-09-10-phase9-t1-balance-index.md`. Do not repeat T0A or T1.
> Continue with **T2 pure logic**, starting with the smallest independently
> testable module. T0B-dependent work remains blocked on authorised catalog
> evidence. TEST/sandbox only; preserve the dirty tree; no production contact,
> stage, commit, push or deploy. Phase 9 remains `NOT ACCEPTED`.

> **SUPERSEDED ON ONE POINT — the banner below says «Phase 9 implementation is
> `NOT STARTED`». That was true when it was written and is now false:** T1 and
> part of T2 are complete. **HISTORY —** the tally at that point was 21
> `CODE VERIFIED` / 101 `NOT STARTED`. **The 37 / 84 / 1 / 2 / 0 figure that
> followed the T2 «Əvvələ qalıq» slice is (SUPERSEDED — T3)**; the current
> tally is at the top of this file.
> Everything else in the banner — the design acceptance, the T0A/T0B split and
> the safety boundary — still stands.

> **AUTHORITATIVE CODEX UPDATE — 2026-09-10. Phase 9 design is
> `ACCEPTED`; Phase 9 implementation is `NOT STARTED`.** Do not repeat the
> Phase 9 design audit and do not resume historical Phase 7 text below. Read
> `audits/2026-09-10-phase9-design-codex-acceptance.md`, then execute **T0A
> read-only** from `plans/2026-09-10-react-migration-phase9-balances.md` against
> TEST `alkjjbaawmsirsfvqljm`. T0A must issue no mutation attempt: obtain the
> exposed RPC signature only under T0B metadata authority (the publishable-key
> OpenAPI probe returned HTTP 401); defer the `rehber` refusal and executable
> `PGRST202` probes to separately authorised T10. Never contact production
> `bbjmhaerssakbreykxiw`. If ordinary TEST
> identities are unavailable, report that exact credential blocker without
> changing code or promoting rows. T0B requires authorised catalog access or a
> fresh trusted capture and cannot be satisfied by a UI password.

> The Phase 7 body below is retained as chronology and is superseded by this
> current Phase 9 assignment.

> **T0A PROGRESS — 2026-09-10.** Do not repeat the admin leg or M9-141a.
> Admin reads are recorded in
> `audits/2026-09-10-phase9-t0a-admin-and-m9-141a-live-check.md`: 127 movements,
> 6 items, 2 complete condition rows, 3 warehouses; M9-141a passed on all 3
> warehouse × item keys. The admin and `anbar-anbardar-test@example.com` legs
> are complete; the latter proves current warehouse RLS (107 movements and one
> condition, all `Test Anbar`). The only remaining T0A role leg is
> `anbar-rehber-codex-test@example.com`; both available candidate passwords were
> rejected. Obtain its TEST-only password/session without writing it to the
> repo, then run only GET/read checks. T0B remains a separate authorised-metadata
> task.

> **AUTHORITATIVE CODEX UPDATE — 2026-09-10. STOP: Phase 7 is `ACCEPTED`.**
> Do not run another Phase 7 scenario and do not reopen M7 rows from historical
> text below. Read `audits/2026-09-10-phase7-final-codex-acceptance.md` and the
> authoritative status column in `specs/2026-09-04-phase7-registry-rows.md`.
> The next phase/task must be chosen separately; no automatic continuation is
> assigned by this file.


> **AUTHORITATIVE CODEX UPDATE — 2026-09-10 (latest).** The corrected
> two-simultaneous-line request-key run is accepted: `M7-39` is
> **LIVE VERIFIED**. The K_MID attempt remains withdrawn history.
>
> The M7-38 split audit is only partly accepted. Positive overflow is clamped
> and a non-positive total disables the button, but the UI clamp has no lower
> bound. Run a read-only leg with `-0.001` in the max-0 Yararsız bucket plus
> `+0.01` İcarədə; the positive derived total should enable the button and reach
> the exact negative `condSplitCheck` refusal before any layer read. Read
> `audits/2026-09-10-phase7-m7-39-correction-m7-38-split-codex-audit.md`.

> **AUTHORITATIVE UPDATE — 2026-09-10 (latest).** `M7-39` is now
> **`LIVE VERIFIED`**: the corrected request-key rerun used two simultaneously
> postable outbound lines (minimal TEST fixture `SND-BAE2EF3FBF`, closed
> net-zero via reversal `b960da62…`), so K1 → K1 → commit line B → K2 ≠ K1 with
> the action trail proving line B's `addLineRaw` was the only invalidator
> between captures. Zero mutations reached TEST; baseline byte-identical;
> read-only restored. See
> `audits/2026-09-10-phase7-m7-39-request-key-correction.md`.
>
> **Superseded below (retained as chronology):** `M7-39` was
> **`IN PROGRESS`**. Field clearing + refocus are accepted code/live evidence.
> The request-key run was safely contained and K1→K1 is a valid stability
> control, but Codex rejected the claimed K2≠K_MID causal attribution: removing
> the only line also clears the key; with zero lines K_MID cannot be captured;
> rebuilding a postable line is already a commit, and current stock prevents a
> second simultaneous line without another invalidating action. Read
> `audits/2026-09-10-phase7-m7-39-request-key-codex-audit.md`.
>
> The body below is retained as chronology and is superseded where it still
> describes `lines.length`, says only M7-39 refocus is live, or calls retained
> price "by design". Read
> `audits/2026-09-10-phase7-m7-39-request-key-live.md` and
> `audits/2026-09-10-phase7-m7-39-field-clearing-codex-audit.md` before the next
> action.
>
> **`M7-38` — negative split + inbound non-routing CLOSED (2026-09-10).** The
> earlier "all three `condSplitCheck` messages unreachable" claim was FALSE and
> is corrected: `Math.min` bounds only the upper side, so `Yararsız = -0.001`
> with `İcarədə = +0.01` gives total `0.009`, opens the button gate, and yields
> the exact «Yararsız: miqdar mənfi ola bilməz» with 0 layer reads, no dialog,
> no row; the healthy control then reached the layer read. Inbound «Mədaxil»
> appends directly with 0 layer reads and no dialog. **`validateOpLine`
> clamp/`warn` is NOT claimed** — measured unreachable read-only (the only
> outbound-eligible TEST item always renders a split). The inactive-layer branch
> stays out of scope. `M7-38` remains `IN PROGRESS`. See
> `audits/2026-09-10-phase7-m7-38-negative-split-inbound-live.md`.
>
> **`M7-38` — third branch closed (2026-09-10).** The **split-guard chain** is
> live measured: `condSplitCheck`'s messages are UNREACHABLE from the UI because
> the bucket input clamps (`Math.min(value, buckets[k])`, `OperationForm.tsx:611`)
> and the button gate (`disabled={!qty || num(qty) <= 0}`, `:626`) refuse first;
> a valid-split positive control did reach `get_stock_layers`. `M7-38` stays
> `IN PROGRESS` — `validateOpLine` clamp/`warn`, the inbound non-routing branch
> and the inactive-layer branch (needs deactivation, out of scope) are unclaimed.
> See `audits/2026-09-10-phase7-m7-38-split-guard-chain-live.md`.
>
> **`M7-38` — second branch (2026-09-10).** The failed
> `get_stock_layers` refusal path is now **live verified** on the read-only
> origin: 503 injected over a window and proven observed, no dialog, no line
> appended, exact `.toast.bad` refusal, and recovery proving causation.
> `M7-38` stays `IN PROGRESS` (two branches evidenced) — the split check, the
> `validateOpLine` clamp/`warn` surface, the inbound non-routing branch and the
> inactive-layer branch are still unevidenced. See
> `audits/2026-09-10-phase7-m7-38-layer-read-failure-live.md`.
>
> **Next required correction:** rerun M7-39 with two simultaneously postable
> active-layer outbound lines: capture K1 with line A, commit line B without
> removing/editing A or changing any header, capture K2, and prove K2≠K1. A
> small supported TEST-only second-item layer fixture may be created and closed
> net-zero under the existing TEST authorisation. Then continue with the
> remaining `M7-38` branches above;
> then `M7-96` stale re-check, `M7-S2` broken-read, İcarə/`log_icare_exposure`,
> transfers and anbardar scoping. Phase 7 remains **NOT ACCEPTED**.

> **STATE 2026-09-09.** Phase 8 is ACCEPTED. On Phase 7: `M7-123` CLOSED
> (Codex-reviewed), `M7-18` and `M7-116` `LIVE VERIFIED`, and the confirmed
> focus-parity defect is **FIXED** — `M7-22` is now `LIVE VERIFIED` (complete)
> and `M7-39` is `IN PROGRESS` with **only its refocus clause** evidenced.
> **Phase 7 remains INCOMPLETE and NOT `ACCEPTED`; the next step is independent
> Codex audit.** TEST `alkjjbaawmsirsfvqljm` only; never contact production
> `bbjmhaerssakbreykxiw`; preserve the dirty tree (214 entries); no
> stage/commit/push/deploy; no cutover, no layer deactivation; no I-10 row; no
> `Çap` work.

## What the last session did — focus-parity remediation

Acted on `audits/2026-09-09-phase7-m7-22-focus-codex-finding.md` (Codex:
**CONFIRMED DEFECT**). Legacy has two focus transitions the port implemented in
neither branch: `pickItem()`'s `if (!keep && !OP.condSplit) $('#o-qty').focus()`
(`index.html:3400`) and `commitDraftLine()`'s `$('#o-item').focus()` (3669).

**One file changed:** `web/src/components/operation/OperationForm.tsx`.

Implemented with **element refs + transition-scoped one-shot state, no global DOM
selectors**:

- `qtyRef` / `searchRef` on the existing `Input` (which already forwarded refs).
- Quantity focus is armed **only** by an explicit combobox choice or by the M5-55
  prefill actually being consumed, then applied by a post-render effect **only
  when `showSplit` is false**. The flag clears in both branches, so a split pick
  consumes the arm without focusing. An ordinary rerender of an existing pick
  arms nothing — the legacy `keep = true` case.
- Item-search focus is driven by **`lines.length` growing**, not by `onAddLine()`
  completing. A layered non-inbound line leaves the form via `onNeedsLayerPick`
  and is committed later by `LayerPickDialog → addLineRaw`; both routes converge
  on `addLineRaw`, so one rule covers both and **inherently excludes** an
  unconfirmed dialog. A `null` starting baseline means mount and restored drafts
  are not commits; a removal lowers the count and is not either.

No other logic touched: fields, draft persistence, request-key invalidation,
validation and posting behaviour are unchanged.

Audit: `audits/2026-09-09-phase7-m7-22-m7-39-focus-parity-remediation.md`.

## Verification

**10 focused tests added, and proved falsifiable:** the pre-fix file was restored
and the suite re-run — **4 failed, exactly the positive focus assertions**
(explicit pick, M5-55 prefill, ordinary commit, layer-dialog return). The six
negative controls pass pre-fix too, which is correct: code that focuses nothing
trivially satisfies "does not focus". The fix was restored and re-verified green.

The tests drive a small controlled wrapper because the file's existing
`renderForm` passes a mock `onSetPick` — without it a pick never reaches the
rendered state and every focus assertion would be **vacuous**.

| Check | Result |
|---|---|
| Focused tests | 10 passed |
| Full suite | **126 files / 2718 tests passed** (2708 before; +10, no regressions) |
| `tsc --noEmit` | clean |
| `oxlint src` | clean (exit 0) |
| `vite build --mode sandbox` | built, 199 modules |
| `git diff --check` | clean |

The «chunks larger than 500 kB» advisory is the pre-existing Phase 8 one.
`web/dist` is git-ignored, so no tracked artefact was left.

**Real read-only browser verification** — normal pick moved focus `BODY` →
`INPUT[number] label="Miqdar"`; a real TEST condition split
(`İCARƏDƏ (MAX 0.01)`) left focus off quantity while it stayed read-only; adding
one local draft line moved focus to `INPUT label="Mal axtar"` and cleared the
picked-item block. **The final document-post button was never pressed**, the
interceptor for production URLs / posting RPCs / table writes **never fired**, and
only read-only RPCs were dispatched.

**Port note:** 5175 was already occupied by a pre-existing server. Per
instruction it was **inspected and reused, not terminated** — verified to serve
TEST `alkjjbaawmsirsfvqljm`, `ALLOW_LOCAL_WRITES=false`, zero production refs,
and (via a source marker) the edited working tree rather than stale code.

**Net-zero:** 125 movements, 6 items, 2 `stock_conditions`,
`Test Anbar / 0000001 = 8.00`, 0 negative balances — identical to the accepted
Phase 8 baseline. Dirty tree preserved at 214 entries, staging empty.

## Why `M7-39` was NOT fully promoted

Its contract is «pushes the line, invalidates the request key, clears
pick/qty/unit/split/price, re-renders **and refocuses the item input**». Only the
**refocus** clause (plus the observed pick clear) is live-evidenced. The
request-key invalidation and the full field-clearing set have unit coverage but
were not live-asserted, and the row's planned test («request key cleared») still
has no live evidence. It therefore stays `IN PROGRESS`.

## Next step

**Independent Codex audit** of the remediation and of `M7-22`'s completion.
Claude must not mark Phase 7 `ACCEPTED` (`registry-rows.md`, principles §11,
`CLAUDE.md` §4). Points for Codex:

1. Whether `lines.length` growth is accepted as the commit signal for `M7-39`'s
   refocus clause, given it covers the layer-dialog return without the page
   needing a new callback.
2. Whether `M7-22` is complete, or whether the split branch being satisfied by an
   explicit «arm then decline» (rather than never arming) needs its own note.
3. Whether `M7-39`'s remaining clauses should be closed by live assertion or
   accepted on existing unit coverage.

Remaining OPEN rows need either a write authorisation or a blocked precondition:
`M7-94` needs a route into edit mode (the «Baxış» dialog did not open on probe);
`M7-121` needs a real counterparty (`partners` = 0, the last surviving H-5
fixture blocker); `M7-14`, `M7-38`, `M7-95`, `M7-113` are posting/draft contracts.

## If a new Claude task is assigned

Preserve the dirty tree; TEST `alkjjbaawmsirsfvqljm` only; never contact
production; start localhost only with
`npm run dev -- --mode sandbox --host 127.0.0.1 --port 5175` — if that port is
already taken, **inspect and reuse the existing server** (confirm the TEST ref,
`ALLOW_LOCAL_WRITES=false` and that it serves the current tree) rather than
killing an unknown process. Keep it read-only for harness work; do not repeat
evidenced scenarios; no new cutover, no layer deactivation, no fabricated
accounting state; no I-10 row. `Çap` is outside the acceptance boundary.
