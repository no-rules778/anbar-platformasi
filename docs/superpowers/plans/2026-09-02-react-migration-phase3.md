# Phase 3 implementation plan — the six remaining Soraqçalar kinds

**Not approved for execution.** This plan is the research output required by
principles §10. It becomes executable only after the user answers Q1-Q8 in the
design, [`2026-09-02-react-migration-phase3-reference-kinds-design.md`](../specs/2026-09-02-react-migration-phase3-reference-kinds-design.md),
which is the authority for every rule referenced below.

Two answers change the plan's shape and are therefore marked at each task:
**Q6** (split the phase in two) and **Q7** (registry ID prefix).

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

## Task sequence

| # | Task | Depends on | Deliverable | Done when |
|---|---|---|---|---|
| T1 | Regenerate `web/src/types/database.ts` from the live schema. **Controller-run** — it needs the Supabase access token, which must not reach a subagent | — | Updated generated types | `reference_values`, `serfiyyat_projects`, `serfiyyat_documents` present; `typecheck` clean; no hand edits |
| T2 | `types/referenceDirectory.ts`: the eight-row `KIND_RULES` table (design §4.3), `WIRED_KINDS` derived from it, `ReferenceReadiness`, the usage-key helper that distinguishes id-keyed `project` from name-keyed kinds. Pure data and pure functions | T1 | Rule table + unit tests | Labels match `REF_KINDS` (`index.html:2934-2943`) verbatim; every kind has exactly one rule; the key helper is proven to keep a renamed project's count separate |
| T3 | `api/referenceValues.api.ts` — one `get_reference_values()` call split into the four `reference_values` kinds. Failure reports readiness, never throws | T2 | API module + mocked tests | The RPC is called **once** for four kinds; a failure yields `ready:false` + empty list; admin sees inactive rows (the RPC's own rule) |
| T4 | `api/serfiyyatProjects.api.ts` — paginated reads of `serfiyyat_projects` and `serfiyyat_documents` (`id, project_id, alinma_kanali` only). Failure reports readiness | T2 | API module + mocked tests | Both reads must succeed for `serfiyyat: true`, matching `smLoad()` (`index.html:6191-6206`) |
| T5 | `api/referenceUsage.api.ts` — extend to all eight kinds per design §4.3: items and serfiyyat sources, `project` counted by `project_id`, operational-only filtering for `channel` and `location`, `exact:false` propagated per source | T2-T4 | Extended API + tests per kind | A failed `items` read makes only `unit`/`category` inexact; cancelled movements excluded for `channel`/`location` and irrelevant elsewhere; existing Phase 2 usage tests unchanged and passing |
| T6 | `store/referenceDirectory.store.ts` — load the new sources in parallel, expose per-kind readiness alongside the existing `{ok, error}` load contract | T3-T5 | Extended store + tests | Rows from every available kind; an unready kind contributes no rows and is flagged; a failed refresh keeps previously loaded rows |
| T7 | `ReferenceDirectoryFormDialog` — `project` linked-warehouse selector (active `anbar` warehouses, `— bağlanmayıb —`, the original hint, `{linked_warehouse}` meta, always resent per **Q4**); `location` added to the name lock; hint wording extended | T6 | Dialog + component tests | The field renders only for `project`; a used `location` is read-only with no «Yadda saxla»; a used `channel` stays editable; the server's invalid-warehouse refusal is surfaced verbatim |
| T8 | `ReferenceDirectoryPage` — all eight kinds in the create selector and the filter; unavailable kinds disabled and named in a banner; their rows omitted (design §4.4) | T6 | Page + component tests | The banner names exactly the unready kinds; a disabled option cannot open the dialog; Phase 2's page tests pass unchanged |
| T9 | Realtime: add `reference_values`, `items`, `serfiyyat_projects`, `serfiyyat_documents` to the watched tables — subject to **Q5** | T8 | Hook/page change + test | One channel, one subscription, 400 ms debounce preserved; unsubscribe on unmount |
| T10 | Registry rows merged as a new module (prefix per **Q7**), risks H-1…H-9 recorded, D-12 closed, C-17 reconciled per **Q8**; Phase 3 final report with its live checklist | T9 | Documentation | Statuses honest: `CODE VERIFIED` at most; nothing `LIVE VERIFIED` without a live pass on the final code |
| T11 | Live verification (design §9). **Separate approval per write action.** Read-only comparison of usage numbers against the old platform first | T10 + user | Checklist results in the registry | Only items actually performed are recorded; `location` and `project` writes are gated on Q1/Q2 |

**If Q6 is answered "split":** T1-T6 and T8-T10 run twice — phase 3a covers
`channel`, `unit`, `category`, `serfiyyat_channel` (one source shape, no new
dialog field, no name lock change); phase 3b covers `location` and `project`
(the two structural outliers, and every risk in design §8). T7 belongs entirely
to 3b. Recommended, and the default unless the user says otherwise.

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
