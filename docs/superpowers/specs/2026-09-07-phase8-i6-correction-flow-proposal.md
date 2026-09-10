# Phase 8 milestone I-6 — document correction / edit flow: proposal

**Status: PROPOSAL ONLY. NOTHING IMPLEMENTED.** No application code, SQL, RPC,
schema, Supabase data, `.env`, dependency, root `index.html`, GitHub or Vercel
state was changed while producing this document, and no live Supabase read or
write was performed. The application test suite was NOT run: this is
documentation-only work.

Source proposal §3.6:
[`2026-09-05-react-migration-phase8-movements-proposal.md`](2026-09-05-react-migration-phase8-movements-proposal.md).
Row ledger: [`2026-09-05-phase8-registry-rows.md`](2026-09-05-phase8-registry-rows.md)
(`M8-33` … `M8-39`). Behavioural reference: `index.html` in this repository.

**No Phase 7 or Phase 8 status changes here.** `M7-109` stays `IN PROGRESS`;
`M7-120` stays `LIVE VERIFIED` for the ordinary movement-INSERT consequence
only, with `correct_document`'s explicit audit row still `OPEN`; nothing in
Module I is `LIVE VERIFIED`; I-5 is local-only and unaccepted.

---

## 0. I-5's standing, recorded exactly

I-5's latest persistence correction (a damaged stored record no longer fails
open) passed Codex's independent review. The scoped result, as reported:
**90 tests across the store and dialog suites** (`batchCancel.store.test.ts`
31, `BatchCancel.test.tsx` 59), typecheck and lint passed, and the root
`index.html` hash was unchanged.

That is a **local, scoped verification result only**. It is **not** live
acceptance, not `LIVE VERIFIED`, and not `ACCEPTED`: Module I is one
acceptance boundary and its live gate is I-8. I-6 must leave every I-5
protection intact — in particular the `beginAttempt` refusal while
`persistenceError` stands, scope isolation via `belongsToScope()`, and the
rule that hydration never rewrites or prunes storage.

**Correction to the previous handoff.** Its «Files changed (2)» line named
three files (`store/batchCancel.store.ts`, `store/batchCancel.store.test.ts`,
`components/movements/BatchCancel.test.tsx`). The count is corrected to three
in `CLAUDE_HANDOFF.md`; no code or test was touched.

---

## 1. The complete path, and who owns each step

Traced end to end against the legacy source and the current React tree.

| # | Step | Legacy | React today | I-6 work |
|---|---|---|---|---|
| 1 | Entry button «Sənədi redaktə et» | `index.html:5052`, handler 5065 | **absent** — `DocumentViewDialog.tsx:44` says so in its own header comment | ADD |
| 2 | Admin + doc-number + layer refusals | 5130-5137 | partial: `isAdmin`/`layerActive`/`layerReady` already props | ADD gate |
| 3 | One-document-at-a-time guard | 5138-5140 (`OP.editDoc`) | store field `editDoc` exists; **no guard** | ADD |
| 4 | `document_edit_impact(p_doc_num)` call | 5142-5148 | **`api/documentEditImpact.api.ts` EXISTS and is tested** | reuse |
| 5 | `editable === false` → block table | 5150-5170 | absent | ADD |
| 6 | `editable === true` → confirmation + `export_warning` | 5170-5190 | absent | ADD |
| 7 | Line→draft mapping, marker strip, `restore` map | 5178-5205 | absent (`EDIT_REPLACES_MARKER` has no React equivalent) | ADD |
| 8 | Edit-mode transition + navigate to «Yeni əməliyyat» | 5190-5205 (`go('op')`) | `enterEditMode()` **exists**; navigation does not reach it | ADD wiring |
| 9 | Edit-mode banner, «Düzəlişi qeyd et» label, exit | 3727-3755, 4670-4684 | **EXISTS** — `EditModeBanner`, `PostConfirmDialog`, `onExitEditMode` | none |
| 10 | Qaimə self-exclusion during correction | 4632 | **EXISTS** — `NewOperationPage.tsx:522` passes `editDoc.docNum` | none |
| 11 | Restore-map arithmetic in validation | 3513 | **EXISTS** — `editRestoreQty`, used by form and stale re-check | none |
| 12 | The WRITE (`correct_document`) | 4745-4776 | **EXISTS and is tested** — `correctDocument()`, store `postDocument` edit branch | none |

**So I-6 is a caller, not a feature rebuild.** Roughly steps 1-8. The API, the
store contract, the write, the banner, the guard and the validation arithmetic
are already built and tested; adding a second copy of any of them would be a
parity regression, not an improvement.

### Evidence for the two claims most easily overstated

- `fetchDocumentEditImpact` genuinely exists (`web/src/api/documentEditImpact.api.ts`,
  with `documentEditImpact.api.test.ts`), returns
  `ok/error/editable/blocks/lines/type/direction/exportWarning`, and **never
  throws** — a refusal arrives as `ok:false` with the message intact.
- `correctDocument` genuinely exists (`api/postMovementDocument.api.ts:160`),
  is guarded by `mutationGuard`'s `op.correct` capability, and the store's
  `postDocument` edit branch (`operation.store.ts:571-607`) already refuses
  `mv` lines, requires a reason, and on failure reports that the original
  document is unchanged.

---

## 2. What must be added, by row

`M8-33` caller · `M8-34` block list · `M8-35` confirmation + `export_warning`
· `M8-36` line→draft mapping · `M8-37` transition · `M8-38` layers refusal
· `M8-39` one-at-a-time guard.

Proposed shape, smallest that satisfies them:

1. **`lib/documentEdit.ts`** — pure: `EDIT_REPLACES_MARKER` stripping, the
   `EditImpactLine[] → DraftOpLineState[]` mapping (`kind` from
   `direction === 'in'`, quantity from `in_qty` else `out_qty`), the `restore`
   map keyed `w|c` built from `out_qty` **for outbound documents only**, the
   header seed from the first line, and one `canEditDocument(view, isAdmin,
   layerActive, layerReady, editDocNum)` gate returning an explicit refusal
   reason. Pure, so it is testable without a DOM and reusable by both the
   button's render condition and its handler — the `documentCancelGate`
   pattern I-4 already established.
2. **`components/movements/EditDocumentDialog.tsx`** — the two modals: the
   not-editable block table and the editable confirmation.
3. **`DocumentViewDialog`** — render «Sənədi redaktə et» only when the gate
   allows, and re-run the same gate in the handler.
4. **`MovementsPage` → `App`** — an `onEditDocument(payload)` callback that
   calls `enterEditMode(...)` and **then** `setPage('op')`, in that order.

### Navigation: the one structural addition

`App.tsx` is «a minimal internal switch, not a router». Two precedents exist
and I-6 needs neither invented nor extended: `onOpenOperation` (Nomenklatura —
seeds the store first, navigates second, `App.tsx:264`) and `onNewOperation`
(movements header — a plain switch). I-6 follows the **Nomenklatura order**
exactly, because it carries state: store first, `setPage('op')` second, so
both happen or neither does.

---

## 3. The safety questions, answered against the code

**Current-role check.** The UI gate uses the same `isAdmin` prop the
cancellation controls use; it is a usability filter only. The server is
authoritative twice over, and this is local SQL evidence, not deployed
behaviour: `sql/030_correct_document.sql:80-83` raises «İcazə yoxdur: sənədi
yalnız Admin redaktə edə bilər» inside `document_edit_impact`, and lines
291-294 raise it again inside `correct_document`, which additionally re-runs
the impact gate at 321-324. `mutationGuard`'s `op.correct` is a third,
client-side layer. Legacy behaviour is preserved: refuse in the UI, and let
the server refuse independently.

**Stale document.** The dialog already receives an **id**, never a copied
movement, and re-resolves the row from `allRows` on every render; every submit
handler re-runs its gate against current rows before calling an RPC
(`DocumentViewDialog.tsx:204-215`). I-6 adopts the same rule: re-check
immediately before calling `document_edit_impact`, and treat a vanished row as
«Bu qeyd artıq mövcud deyil». Beyond that, the impact RPC is itself the
authoritative freshness check — it blocks a cancelled document, a reversal, a
replaced row and any later movement on the same warehouse+item.

**Failed or malformed impact response.** Three distinct cases, none collapsed:

- `ok: false` → show `error` **verbatim**, prefixed as legacy does
  («Təsir yoxlaması alınmadı: …»). Never re-labelled as "empty".
- `ok: true`, `editable: false` → the block table (`blocks[].message`, falling
  back to `code`, then `—`). No navigation, no state change.
- `ok: true`, `editable: true`, but `lines` empty → legacy refuses with
  «Sənəddə redaktə ediləcək sətir yoxdur» (5182). Preserve it: entering edit
  mode with zero lines would produce an unpostable form.

A malformed payload cannot crash the caller — the API already coerces
`blocks`/`lines` to arrays and every scalar to a string.

**Preservation of an existing draft.** This is the one place where the
proposal's §3.6 wording («clear the saved draft») needs a correction of record.
`enterEditMode` (`operation.store.ts:450`) does **not** call
`clearStoredDraft`. The persisted draft is nonetheless removed, indirectly and
reliably: `saveDraftNow` runs on every `lines` change
(`NewOperationPage.tsx:150-155`), and `shouldSaveDraft` returns `false`
whenever `editMode` is true (`lib/opDraft.ts:57-60`), whereupon `saveDraftNow`
**removes** the stored key. So the end state matches legacy `clearDraft()`.
I-6 must therefore **not** add a second clearing call — that would be a
redundant write on a path already covered, and would risk clearing a draft on
a refused entry.

The real risk is the opposite one, and it is a decision below: entering edit
mode **discards the in-memory lines** a user may be composing, because
`enterEditMode` replaces `lines` wholesale. Legacy does the same, silently.
Proposed deviation, documented: **warn before discarding** when
`lines.length > 0`, in the same confirmation modal that already exists at step
6 — one extra sentence, no new dialog. This is additive and refusable; it does
not change what is written to the database.

**Safe navigation / back / cancel.** Cancelling either modal must leave
**nothing** changed: no store write, no navigation, no draft touched — legacy
guarantees this by doing all its mutation inside the `#de-go` handler, and the
React version keeps the same shape (all mutation inside the confirm handler).
Exit from edit mode is already built (`onExitEditMode`, banner) and already
says the document is unchanged. There is no browser-history back to handle:
`App.tsx` holds page state in `useState`, so no history entry exists.

**Duplicate submission.** Two separate risks:

- *Duplicate impact calls* — `document_edit_impact` is `STABLE` and read-only,
  so a duplicate is harmless, but the button still takes the `inFlight` lock
  the cancellation controls use, so a double click cannot open two modals.
- *Duplicate corrections* — this is the dangerous one, and it is **already
  handled**: `postDocument` sets `inFlight` before the await, and the edit
  branch clears `editDoc` on success so a second submit has no document to
  correct. The one-document-at-a-time guard (`M8-39`) closes the remaining
  entry-side hole: while `editDoc` is set, opening a **different** document's
  edit is refused naming the one in progress, exactly as legacy 5138-5140.
  Re-entering the **same** document is permitted, as legacy permits it.

**Ambiguous write outcomes.** `correctDocument`'s `catch` currently maps any
transport failure to `ok:false`, and the store then tells the user
«… — <doc> sənədi dəyişməyib». Under a response lost **after** the server
committed, that sentence is false in exactly the way I-5's `lib/batchOutcome.ts`
was written to prevent: `correct_document` is one transaction, so the database
has two end states but the client can be in a third — *not yet known which*.
The reasoning transfers verbatim, including the discriminator (a synthesised
transport error carries `status: 0`; a real PostgREST rejection carries 4xx).

I-6 **does not** silently inherit the false sentence, and equally does not
rewrite the I-5 module. Two options, and this is decision `D6` below:
(a) reuse `classifyOutcome` from `lib/batchOutcome.ts` for the correction
write, so an unknown outcome says the result is not yet confirmed and does
**not** claim the document is unchanged; or (b) leave the legacy wording and
record the known-false case as an accepted parity deviation.
Recommendation: **(a)**, because the failure mode is identical to the one
already accepted as real for I-5 and the module is already built and reviewed.
Note this touches `postMovementDocument.api.ts` / the store's edit branch,
which are `M7-97`/`M7-109` territory — hence a decision, not a silent change.

---

## 4. What this proposal explicitly does not claim

- **No RPC's existence implies a working frontend path.** `document_edit_impact`
  and `correct_document` are declared in `types/database.ts` and wrapped in the
  API layer; that is signature and wrapper evidence only. Neither has been
  executed from React against any project.
- **Local SQL evidence ≠ deployed behaviour.** Everything asserted about the
  functions' bodies above comes from `sql/030_correct_document.sql` in this
  repository. `docs/CHANGELOG.md` (2026-08-23) records 030 as applied to the
  **production** project with a postcheck that both functions exist; Phase 8
  works against **TEST** `alkjjbaawmsirsfvqljm`, and the only TEST evidence for
  `document_edit_impact` is the 2026-09-03 body capture in
  `decisions/2026-09-04-initial-balance-server-gap.md` (it blocks correcting an
  initial-balance document). `correct_document` has **never** been executed on
  TEST, and `M7-120`'s `correct_document` audit row stays `OPEN`. The
  thirteen-RPC TEST catalogue query was about **cancellation** RPCs and says
  nothing about these two.
- **Nothing here is `LIVE VERIFIED`.** The live gate is I-8, under `D5`.

---

## 5. Proposed acceptance criteria

1. The button appears **only** for an admin, on an ordinary document view with
   a real `doc_num`, not a reversal, not already cancelled, and **not** while
   `layerActive` (`M8-38`, legacy 5085) — and is refused by the same gate in
   its handler.
2. A non-admin, a doc-less record and a layers-active document each produce
   the legacy message, and **no RPC call is made**.
3. A second document's edit is refused naming the one already in edit mode.
4. `ok:false` shows the server message verbatim; `editable:false` renders every
   `blocks[].message`; neither navigates nor mutates the store.
5. Confirming maps lines exactly: `kind` from direction, quantity from
   `in_qty`/`out_qty`, the `· Əvəz edir: <doc>` suffix stripped once, `restore`
   built from `out_qty` for outbound documents only, header from the first line.
6. After confirming: `editDoc` set, direction tab switched, page is «Yeni
   əməliyyat», banner visible, stored draft absent, and **the database is
   untouched** — asserted by the absence of any write call.
7. Cancelling either modal changes nothing at all.
8. Every I-5 test still passes unchanged.

Verification: focused Vitest files plus mutation checks in both directions,
`tsc -b --noEmit`, `oxlint`, and an assertion that root `index.html` is
unedited. No live call, at any point, in any test.

## 6. Decisions

- **`D6` (new)** — ambiguous correction-write outcome: reuse `classifyOutcome`
  (recommended) or accept the false «unchanged» sentence as a documented
  deviation.
- **Entry-time draft discard** — warn before discarding composed lines
  (recommended, additive), or preserve legacy's silent replacement.
- `D1`, `D5` remain undecided and are untouched here. `D3` and `D4` are
  resolved and unaffected.
