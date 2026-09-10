# Phase 3 implementation plan — the six remaining Soraqçalar kinds

**Research and design approved (Q1-Q8 decided 2026-09-02, design §10). Not yet
approved for code execution** — that approval is separate and covers actually
starting task T1. The design,
[`2026-09-02-react-migration-phase3-reference-kinds-design.md`](../specs/2026-09-02-react-migration-phase3-reference-kinds-design.md),
is the authority for every rule referenced below; this plan's task list is
updated to match all eight decisions.

## Decisions in effect (design §10, 2026-09-02)

| Q | Decision | Plan effect |
|---|---|---|
| Q1 | Implement `location` + empty state; automated tests + **read-only** live verification only. No artificial record created. Write path stays `NOT LIVE VERIFIED` until a legitimate record exists or a one-off live write is separately approved | T11's write checks exclude `location`; T10's registry rows for `location` (M3-03/04/05) note the ceiling |
| Q2 | Typed project-name confirmation required before permanent `project` deletion — approved safety difference, client-side gate, no SQL change | New task **T7a**; new deviation row **M3-17** |
| Q3 | Preserve original behaviour: UI usage excludes cancelled movements; server delete-block counts all rows; refusal surfaced verbatim; no SQL change | No task change — T5/T8 already implement this; H-3 is accepted, not fixed |
| Q4 | `project` edits always resend the stored `linked_warehouse`, even when only `name` changes | T7's done-criteria gain a regression test |
| Q5 | Add `items` to the existing single Realtime subscription; same channel, same debounce | T9 unchanged in shape, decision now final rather than open |
| Q6 | Split at the corrected readiness boundary: 3a = `channel`/`unit`/`category`; 3b = `location`/`project`/`serfiyyat_channel` | Split is final; task table below reflects it directly rather than as a conditional |
| Q7 | New registry rows use the `M3-` prefix | All task deliverables below reference `M3-` IDs |
| Q8 | `C-17` stays open and separate, linked to the new cross-kind row (`M3-16`); closes only after its own refusal paths are verified live | T10's registry step is explicit about this |

## Progress

**Phase 3a (`channel`, `unit`, `category`) and Phase 3b (`location`,
`project`, `serfiyyat_channel`) — both implemented 2026-09-02,
`CODE VERIFIED`.** All eight kinds reach the screen. Mocked tests and source
review only; no live browser check and no live CRUD. Awaiting Codex's
independent audit and the combined 3a + 3b live comparison.

### Phase 3b task outcomes

| Task | 3b status |
|---|---|
| T4 | Done — `api/serfiyyatProjects.api.ts` reads all three tables; `serfiyyat_lines` is a bare `id` existence probe whose only contribution is the gate. S1-S5 sub-matrix covered; **S4 confirmed to fail against a two-read variant** |
| T5 | Done — `location` (movements ∥ partner + users), `project` (by `project_id`), `serfiyyat_channel` (by name over documents); documents are passed in from the store rather than re-read |
| T6 | Done — serfiyyat loaded in parallel, `activeWarehouseNames` exposed for the project selector, both gates honoured independently |
| T7 | Done — linked-warehouse selector with the original's label, empty option and hint; **Q4's always-resend** pinned by a name-only-edit test |
| T7a | Done — **Q2's typed-name gate**, enforced in `send()` as well as on the button, and provably absent for the other seven kinds |
| T8 | Done — all eight kinds in both selectors; banner and disabled options driven by whichever flag is down |
| T9 | Done — `serfiyyat_projects` and `serfiyyat_documents` added to the one channel. `serfiyyat_lines` deliberately not watched: a readiness probe only, so a write there changes no row or count on this screen |
| T10 | Registry rows updated with evidence; this block; handoff rewritten |
| T11 | Not performed — live verification is Codex's step and needs separate approval |

Verification at 3b completion: **358 tests passing in 24 files**, `typecheck`,
`lint` (oxlint), `build` and `git diff --check` all clean.

`D-12` stays **open** until the combined 3a + 3b live browser comparison
passes — all eight kinds exist in code, which is not the same as verified.

### Phase 3a task outcomes

| Task | 3a status |
|---|---|
| T1 | **Not needed** — `reference_values`, `items` and `get_reference_values` were already present in the generated `types/database.ts`; no regeneration, no hand edits |
| T2 | Done — `KIND_RULES` (8 rows, readiness as its own field), `WIRED_KINDS` derived, `ReferenceReadiness`, `isKindReady`; `types/referenceDirectory.test.ts` |
| T3 | Done — `api/referenceValues.api.ts`, one RPC call split into four kinds, failure reported as readiness; 11 tests. **Audit fix:** the first version guarded only the returned-`{ error }` shape, so a rejected RPC promise escaped into the store's `Promise.all` and blanked the page; now wrapped in try/catch like the original (995-1004), pinned by `mockRejectedValue` tests + a store integration case (registry M3-06a) |
| T4 | Deferred to 3b (all three Sərfiyyat reads) |
| T5 | Done for the 3a kinds — `items` source added, `channel` counted from `movements.channel`, per-source `exact:false` isolation |
| T6 | Done — store loads reference values in parallel, exposes `readiness`, omits unready kinds' rows; `store/referenceDirectory.store.test.ts` |
| T7 / T7a | Deferred to 3b (project field; typed-name delete gate) |
| T8 | Done for the 5 wired kinds — banner, disabled options, `refOpen` refusal via `openEditor` |
| T9 | Done in part — `reference_values` + `items` added to the one existing channel (Q5). The two `serfiyyat_*` tables join in 3b |
| T10 | Registry rows updated with evidence; this progress block; handoff rewritten |
| T11 | Not performed — live verification is Codex's step and needs separate approval |

Verification at 3a completion (after the audit fix): **296 tests passing in 23
files**, `typecheck`, `lint` (oxlint), `build` and `git diff --check` all clean.

Phase 3b remains untouched: `location`, `project` and `serfiyyat_channel` have
no UI, `D-12` stays open, and `VITE_ALLOW_LOCAL_WRITES` was never set.

## Standing constraints for every task

- Branch `react-migration`, local commits only. No push, PR, merge or deploy.
- No change to Supabase, SQL, the repository-root `index.html`, GitHub or
  Vercel. No production write except one the user approves at that moment.
- No change to Phase 2 behaviour for `warehouse` and `partner`. Their existing
  tests must pass unmodified; a test that has to be edited to accommodate
  Phase 3 is a signal to stop and report.
- The visual design stays as ported (principles §9). No new layout concepts.
- Before each commit: `npm test`, `npm run typecheck`, `npm run lint`,
  `npm run build`, `git status --short`, `git diff --check`.
- The localhost write guard stays on. Live writes need
  `VITE_ALLOW_LOCAL_WRITES=true` set deliberately, per approved action.
- No artificial `location` (`warehouses type='layihə'`) record is created to
  force write-path verification (Q1, decided). That path stays
  `NOT LIVE VERIFIED` by decision, not by omission.
- Permanent `project` deletion requires a typed name match before the RPC is
  called (Q2/T7a, decided) — a client-side addition, no SQL change.

## Task sequence

| # | Task | Depends on | Deliverable | Done when |
|---|---|---|---|---|
| T1 | Regenerate `web/src/types/database.ts` from the live schema. **Controller-run** — it needs the Supabase access token, which must not reach a subagent | — | Updated generated types | `reference_values`, `serfiyyat_projects`, `serfiyyat_documents` present; `typecheck` clean; no hand edits |
| T2 | `types/referenceDirectory.ts`: the eight-row `KIND_RULES` table (design §4.3), `WIRED_KINDS` derived from it, `ReferenceReadiness`, the usage-key helper that distinguishes id-keyed `project` from name-keyed kinds. **Readiness is a rule field in its own right, never derived from the source field** (design §4.4) | T1 | Rule table + unit tests | Labels match `REF_KINDS` (`index.html:2934-2943`) verbatim; every kind has exactly one rule; the key helper is proven to keep a renamed project's count separate; **`serfiyyat_channel`'s readiness flag asserts as `serfiyyat`** |
| T3 | `api/referenceValues.api.ts` — one `get_reference_values()` call split into the four `reference_values` kinds. Failure reports readiness, never throws | T2 | API module + mocked tests | The RPC is called **once** for four kinds; a failure yields `ready:false` + empty list; admin sees inactive rows (the RPC's own rule); **`serfiyyat_channel` rows are parsed and returned here unconditionally — this module knows nothing about the `serfiyyat` gate** |
| T4 | `api/serfiyyatProjects.api.ts` — paginated reads of `serfiyyat_projects` and `serfiyyat_documents` (`id, project_id, alinma_kanali` only), **plus a readability probe of `serfiyyat_lines` whose data is never used** (design §4.4). Failure reports readiness. **Produces the `serfiyyat` flag that gates `project` *and* `serfiyyat_channel`** | T2 | API module + mocked tests | **All three** reads must succeed for `serfiyyat: true`, matching `smLoad()` (`index.html:6185-6206`), where `DB.smReady = true` sits after a combined `pj.error \|\| docs.error \|\| lns.error` throw. The §5.1.1 sub-matrix passes, **S4 included** — a `serfiyyat_lines` failure alone yields `serfiyyat:false` |
| T5 | `api/referenceUsage.api.ts` — extend to all eight kinds per design §4.3: items and serfiyyat sources, `project` counted by `project_id`, operational-only filtering for `channel` and `location`, `exact:false` propagated per source | T2-T4 | Extended API + tests per kind | A failed `items` read makes only `unit`/`category` inexact; cancelled movements excluded for `channel`/`location` and irrelevant elsewhere; existing Phase 2 usage tests unchanged and passing |
| T6 | `store/referenceDirectory.store.ts` — load the new sources in parallel, expose per-kind readiness alongside the existing `{ok, error}` load contract. **A kind is available only when its readiness flag is true AND its source resolved** (design §4.4) | T3-T5 | Extended store + tests | Rows from every available kind; an unready kind contributes no rows and is flagged; a failed refresh keeps previously loaded rows; **the four-state readiness matrix (design §5.1) passes in full, M2 included** |
| T7 | `ReferenceDirectoryFormDialog` — `project` linked-warehouse selector (active `anbar` warehouses, `— bağlanmayıb —`, the original hint, `{linked_warehouse}` meta, **always resent per Q4, decided**); `location` added to the name lock; hint wording extended | T6 | Dialog + component tests | The field renders only for `project`; a used `location` is read-only with no «Yadda saxla»; a used `channel` stays editable; the server's invalid-warehouse refusal is surfaced verbatim; **a regression test edits only `name` on a project with a stored `linked_warehouse` and asserts the resend (Q4, M3-11)** |
| T7a | **New task (Q2, decided).** Typed-name confirmation gate for permanent `project` deletion: the delete control for `project` requires the user to type the exact project name before the `manage_reference(action:'delete')` call is issued. Client-side only — no RPC or SQL change. Applies to `project` alone, not the other seven kinds (`warehouse`, `location`, `partner`, `channel`, `unit`, `category`, `serfiyyat_channel`) | T7 | Dialog change + component tests | Deletion is blocked while the typed name does not match; blocked while empty; case-sensitive exact match (documented choice — record the comparison rule used); the RPC is not called until the match succeeds; a test asserts plain «Tamamilə sil» (no typed-name gate) is unchanged for **all seven** other kinds, not spot-checked on a subset |
| T8 | `ReferenceDirectoryPage` — all eight kinds in the create selector and the filter; unavailable kinds disabled and named in a banner; their rows omitted (design §4.4) | T6, T7a | Page + component tests | The banner names exactly the unready kinds; a disabled option cannot open the dialog; Phase 2's page tests pass unchanged; **with `serfiyyat` false and `referenceValues` true (M2), `serfiyyat_channel` is hidden/disabled/banner-named while `channel`/`unit`/`category` stay available, and `refOpen` refuses it verbatim** |
| T9 | Realtime: add `reference_values`, `items`, `serfiyyat_projects`, `serfiyyat_documents` to the watched tables (**Q5, decided**) | T8 | Hook/page change + test | One channel, one subscription, 400 ms debounce preserved; unsubscribe on unmount |
| T10 | **Module D's rows (`M3-01`…`M3-17`) are already merged into the registry** as `NOT STARTED`, ahead of code, per principles §10 — this was done at design-decision time, not deferred to this task. T10 **updates** those rows' statuses to match what T1-T9 actually built and verified, records risks H-1…H-9 with their decisions against the relevant rows, closes existing `D-12`, and writes the Phase 3 final report with its live checklist (`location`-write and Q1 verification-ceiling note included). `C-17` stays **linked to, not merged with,** `M3-16` and left open per Q8 | T9 | Updated registry statuses + final report | Every `M3-` row's status reflects real evidence: `CODE VERIFIED` at most from T1-T9 alone; nothing `LIVE VERIFIED` without a live pass on the final code; `location`'s write path explicitly marked `NOT LIVE VERIFIED` by decision, not omission |
| T11 | Live verification (design §9). **Separate approval per write action.** Read-only comparison of usage numbers against the old platform first | T10 + user | Checklist results in the registry | Only items actually performed are recorded; **`location` writes are excluded by decision (Q1)** — no artificial record is created; a throwaway `project` deletion exercises the T7a typed-name gate before the RPC is approved to run |

**Q6 decided: split.** T1-T6 and T8-T10 run twice.

| | Kinds | Tasks |
|---|---|---|
| **3a** | `channel`, `unit`, `category` | T1-T3, T5, T6, T8-T10. No `serfiyyat` plumbing, no new dialog field, no name-lock change |
| **3b** | `location`, `project`, `serfiyyat_channel` | T4 (**all three** serfiyyat reads), T7 (the project field), **T7a (Q2 typed-delete gate, `project` only)**, then T5, T6, T8-T10 again |

**`serfiyyat_channel` belongs to 3b, not 3a.** The earlier draft of this plan
put it in 3a because it shares `get_reference_values()` with the other three
`reference_values` kinds. That was an error corrected in design §4.4: the kind
is gated on the `serfiyyat` readiness flag (`refServerReady`,
`index.html:2952`), and that flag does not exist until T4 — a 3b task. Shipping
it in 3a would mean either pulling T4 forward into 3a (making the split
pointless) or shipping a kind whose availability rule cannot yet be evaluated,
which would leave it visible in exactly the state the old platform hides it.

That flag needs **all three** Sərfiyyat reads — `serfiyyat_projects`,
`serfiyyat_documents` and `serfiyyat_lines` — even though Phase 3 consumes no
column of `serfiyyat_lines` (design §4.4). So "pull T4 forward" would mean
pulling all of it, including a read that exists purely to reproduce the gate.
There is no partial-T4 shortcut that makes `serfiyyat_channel` correct in 3a.

The cost of this correction to 3b is small and one-directional: 3a's
`referenceValues.api.ts` already parses `serfiyyat_channel` rows out of the
shared RPC call and must keep doing so — 3a simply never surfaces them. 3b adds
only the gate. **3a must therefore carry a test asserting that
`serfiyyat_channel` is parsed but not listed**, so the intermediate state is
deliberate and pinned rather than an accident that 3b happens to fix.

**Decided (Q6, design §10): split, at this boundary.** The T4-before-T8
dependency would hold in a single phase too; the split only draws the commit
boundary at that same line.

## Out of scope, explicitly

The screens that *consume* these values — item form, movement form, bulk import,
category CSV import, item requests, Sərfiyyat Materialları documents, the
dashboard `Ünvan / layihə` table — are later phases. Design §7 records their
rules so those phases inherit the research instead of repeating it.

## Ordering rationale

Data and pure logic first (T2), then I/O (T3-T5), then state (T6), then UI
(T7-T8). Each layer is testable before the one above exists, and each task
leaves the screen working. This mirrors Phase 1's ordering, which is the reason
its per-layer regressions were caught by unit tests rather than by a reviewer.
