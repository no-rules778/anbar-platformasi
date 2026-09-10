# Handoff — I-5 batch cancellation, local implementation (2026-09-07)

Milestone I-5 («Qrup üzrə ləğv») implemented against the corrected proposal
(`specs/2026-09-07-phase8-i5-batch-cancellation-proposal.md`, revision 2) plus
four refinements given at implementation time. `M8-30`, `M8-31`, `M8-32` are now
`CODE VERIFIED`.

**`D3` recorded as INCLUDED for local implementation only.** No live execution.
Nothing is `LIVE VERIFIED` or `ACCEPTED`. I-6 is not started.

## Files

New: `web/src/lib/batchCancel.ts`, `web/src/lib/batchOutcome.ts`,
`web/src/store/batchCancel.store.ts`,
`web/src/components/movements/BatchCancelDialog.tsx`, and three test files
(`batchCancel.test.ts`, `batchOutcome.test.ts`, `BatchCancel.test.tsx`).

Modified: `web/src/api/documentCancel.api.ts` (both batch wrappers),
`web/src/pages/MovementsPage.tsx` (admin-gated entry point + dialog),
`web/src/api/documentCancel.api.test.ts` and
`web/src/pages/MovementsPage.test.tsx` (assertions that encoded the old
contract), the registry rows, and `CLAUDE_HANDOFF.md`.

Root `index.html` was NOT edited. Its one pending diff (`manage_reference`
argument at :3164) predates this work.

## The four refinements, verified before coding

### 1. Error classification — CONFIRMED against the installed SDK

Verified directly in
`web/node_modules/@supabase/postgrest-js/dist/index.cjs:422-437` (version
2.112.4). Any fetch rejection returns:

```
{ success: false,
  error: { message: `${name}: ${message}`, details, hint, code },
  data: null, count: null, status: 0, statusText: '' }
```

A structured `{message, details, hint, code}` object with `status: 0`, arriving
in the SAME `error` field a genuine rejection uses. Network failures, DNS
failures and `AbortError` all produce it, and it never reaches the `catch`
block. A real rejection instead carries the response status (`processResponse`,
`:487-505`).

**This invalidated the corrected proposal's own §5.3 rule** — that a structured
PostgREST error body proves rejection — and would have made the planned
`outcome` discriminator misclassify every network failure as "nothing was
cancelled". The discriminator implemented is the HTTP status: 4xx → rejected;
`status: 0`, a gateway 5xx, 500, or an absent status → UNKNOWN. The wrappers now
carry `status` and `code` rather than collapsing everything into a message
string.

500 is deliberately UNKNOWN, not a rejection: an internal error can be raised
after a commit as easily as before one.

### 2. Success validation — one validator, and the proposal contradiction resolved

`validateSuccessBody()` in `lib/batchOutcome.ts` is the single validator. A 2xx
is necessary but not sufficient: an empty object, a non-object body, an explicit
failure marker, a non-integer or contradictory count, a non-array `results`, or
`results` disagreeing with the count all yield `incoherent` → outcome UNKNOWN,
never confirmed success. Count-free success is allowed only with other valid
evidence (a coherent `results` array); a body with neither is refused.

**The contradiction between §4.4 rule 4 and rule 5 is resolved explicitly** (and
documented in the module):

> A count NEVER decides HOW MANY documents were cancelled.
> A count MAY decide WHETHER THE RESPONSE IS COHERENT.

The first is forbidden because both server counts are counts of ATTEMPTS —
`010:203` is `COUNT(*) FROM _sel` (the SELECTED count) and `036:832` is
`jsonb_array_length(v_results)` (an iteration count). The second is ordinary
payload validation. Selection size is never substituted as a completed count;
legacy's `docNums.length` fallback (`index.html:5498`) is not ported. A missing
count is `null`, never `0`, and renders a count-free success with no numeral.

### 3. Unknown-outcome reconciliation — refresh cannot resolve it

`unknownResolvedBy()` clears the record only on a POSITIVE observation: every
submitted document visibly cancelled. An empty or partial result never resolves
it, because the original transaction may still be running and the read may not
see it yet — absence of evidence is not evidence of rollback.

The record lives in `store/batchCancel.store.ts`, deliberately outside both the
dialog and `movements.store` (whose `load()` replaces its snapshot wholesale),
so it survives dialog close/reopen and any refresh. The block is per DOCUMENT:
documents untouched by the unresolved batch stay cancellable. No status RPC was
invented and no SQL was added.

**Limitation, stated rather than papered over:** the record is not persisted, so
a full page reload loses it. Persisting a claim about live data in the browser
would let it outlive its own truth. A reload therefore returns the user to
manual reconciliation with no in-app marker.

### 4. Stale handoff paragraph — corrected

`CLAUDE_HANDOFF.md` claimed the layer batch has "no pre-validation, no locks and
no balance simulation". Withdrawn. `cancel_layer_document`
(`ANBAR_SHARED/sql/036_stock_layers.sql:604-680`) takes a `cancel|<doc>`
advisory lock (`:607`), per-`(warehouse|item_code)` locks (`:622`, `:642`),
`FOR UPDATE` on affected `stock_layers` (`:623`, `:660`), and pre-validates
before writing; `cancel_layer_transfer_document` (`:685-710`) mirrors it. Those
are transaction-scoped locks, so iteration N's locks are held during N+1.

The real difference is lock ORDERING and failure TIMING, not absent protection —
a design difference, not a proven defect. Deployment-specific guarantees remain
explicitly UNVERIFIED: only existence and signatures are live-verified, from
Codex's read-only catalogue query against TEST `alkjjbaawmsirsfvqljm`
(2026-09-06). Deployed bodies and `EXECUTE` privileges were never read.

## What was implemented

- **Grouping and eligibility** (`lib/batchCancel.ts`) — legacy's seven-step
  ladder with ORDER preserved; ineligible documents listed with their reason,
  never hidden; a group whose every line was row-level cancelled disappears
  (5330); doc strings kept byte-exact (no trim), so `' D-1 '` and `'D-1'` are
  different documents; doc-less rows never merged into a synthetic document.
- **Filters** — six inputs, INCLUSIVE date bounds against the group's EARLIEST
  row date, item search over both codes and names. Selection survives filtering,
  so the selected count is reported independently of the visible list.
- **Shared render/submit gate** — `resolveBatchSelection()` is called once to
  render and again inside the submit handler against REBUILT documents. This
  closes legacy's stale-snapshot bug (`BC.docs` built once at 5375, confirm step
  re-filtering the stale flag at 5454). A changed payload returns the user to
  the confirm step and requires renewed confirmation; nothing is sent silently.
- **Gates** — admin-only entry point and execute check; fail-closed capability
  readiness (`canWriteCancellation`), reusing I-4's helpers unchanged.
- **Synchronous duplicate-submit protection** — a `useRef` written before the
  first `await`. `useState` is async and batched, so two clicks in one tick
  would both observe `inFlight === false`; the ref makes the second return
  immediately. `inFlight` is released on every path, but only a CONFIRMED
  REJECTION re-enables execute — releasing the flag is not re-enablement.
- **Four outcomes** — confirmed success, confirmed rejection, unknown, and
  success-then-refresh-failure. The RPC outcome is decided and reported BEFORE
  the refresh, closing legacy's §8 bug where a failed refresh after a successful
  cancellation reported "heç bir sənəd ləğv edilmədi". A failed refresh after an
  UNKNOWN stays UNKNOWN, never a success.
- **Both count shapes** through the API layer, `cancelled_count` then
  `document_count`, never `docNums.length`.
- Server refusal text passes through verbatim; HTTP statuses, codes, hints and
  stack details never reach the UI.

## Verification — exact results

| check | command | result |
|---|---|---|
| focused: outcomes | `vitest run src/lib/batchOutcome.test.ts` | **37 passed** |
| focused: grouping/filters | `vitest run src/lib/batchCancel.test.ts` | **29 passed** |
| focused: dialog | `vitest run src/components/movements/BatchCancel.test.tsx` | **30 passed** |
| focused: API | `vitest run src/api/documentCancel.api.test.ts` | **40 passed** |
| focused: page | `vitest run src/pages/MovementsPage.test.tsx` | **57 passed** |
| full suite | `vitest run` | **2217 passed, 111 files, 0 failed** |
| typecheck | `tsc -b --noEmit` | clean, exit 0 |
| lint | `oxlint` | clean, no output |
| build | `npm run build` | ✓ built in 2.54s (pre-existing chunk-size warning) |
| whitespace | `git diff --check` | no errors (CRLF warnings pre-existing) |

Test coverage includes structured SDK transport errors (status 0, including
`AbortError`), gateway 502/503/504, six malformed-response shapes, stale
eligibility mid-dialog, three clicks in one tick, unknown-state close/reopen,
failed refresh after both success and unknown, and the localhost guard.

**A first full-suite run showed 8 failures**; 7 were timeouts in
`OperationForm.test.tsx` and `LayerPickDialog.test.tsx`, which import nothing
touched here and pass in isolation (51 passed) — a known jsdom
accessible-name-walk cost under parallel load, documented at
`MovementsPage.test.tsx:116-125`. The 8th was genuinely caused by this work: a
MovementsPage test asserting no batch-cancel affordance exists. That assertion
was correct for I-3 and is now wrong, so it was narrowed to exports only and two
tests added (admin sees the button, non-admin does not). The rerun is clean.

**Deviation from the plan's test count:** the assertions updated in
`documentCancel.api.test.ts` encoded the OLD contract (`cancelledCount` 0 for a
missing count, `BatchCancelResult`). They were changed, not deleted, and the
batch section gained six tests covering both count shapes and status
preservation.

## Remaining live checks — none performed here

1. Both batch RPCs' DEPLOYED bodies still match the rank-4 migration files.
2. `EXECUTE` privileges for `authenticated` on both, on TEST and production.
3. One batch cancellation actually executed against TEST, confirming the
   response shape each RPC really returns — especially whether the layer RPC's
   body carries `results` alongside `document_count`, since the validator
   requires coherent evidence and a body with neither a count nor results is
   treated as UNKNOWN.
4. Behaviour of a real mid-batch failure (message text and status).
5. Whether a real transport failure in this deployment surfaces as `status: 0`
   as the SDK source indicates.

Items 3-5 need a live write and are a user decision (`D5`).

## Open decisions

- **The layer batch asymmetry** — implemented as option (a)+(b) equivalent: a
  faithful port, with the submit-time recheck serving as the client pre-check.
  Option (c), server-defect escalation, stays withdrawn.
- **Unresolved-record persistence across a page reload** — currently not
  persisted (see refinement 3). Changing this is a decision, not an oversight.
- **`D1`, `D5`** unchanged. `D3` is INCLUDED for local implementation only.
