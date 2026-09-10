# Phase 7 — final Codex acceptance audit

Date: 2026-09-10

## Verdict

**Phase 7 / Module H is ACCEPTED** for the owner-approved TEST configuration:
layer accounting and movement splits active, no layer deactivation or new
cutover, and `Çap` outside scope.

This audit did not promote contracts by proximity. It reread every effective
non-closed `M7-*` row and either exercised its exact contract, found existing
exact evidence, fixed the remaining implementation gap, or recorded why a
configuration-only branch is satisfied by the accepted active configuration.

## Final reconciliation

| Row | Final evidence |
|---|---|
| M7-14 | Existing TEST transfer `SND-3550711E4C` has two legs and the exact same invoice `CODEX-P8-TRANSFER-20260908` on both. The live SQL implementation also copies `r.iv` into both INSERTs. |
| M7-16 | Full-form regression forces `fetchReferenceValues().ready=false` and proves the rendered Kanal select contains both `DEFAULT_CHANNELS` and a channel observed in operational movements. |
| M7-30 | Existing page regression forces `movement_split_supported=false`; a document carrying a split is refused before every post RPC. |
| M7-38 | Live evidence covers negative split refusal, active-layer routing/fetch failure, and inbound non-routing. A new exact component regression proves the remaining non-split path applies `validateOpLine`'s clamp, renders its warning, and commits the clamped quantity. The inactive-layer route is that same tested non-layer branch and is accepted without deactivating TEST layers. |
| M7-40 | **Implementation defect fixed.** `LayerPickDialog` now returns distinct source prices; single and bulk commit paths retain them; `DraftLinesPanel` renders `a / b` for layered lines instead of the blended `pr`. Old persisted drafts remain compatible through an optional field. The regression uses `pr=7.5` with variants `[5,10]`, asserts `5 / 10`, and rejects `7.5`, so the old implementation cannot pass. |
| M7-66 / M7-67 | Existing exact regressions prove a bad bulk row adds zero lines and the caller revalidation cannot partially append. The layered write-off test proves source amount ÷ quantity and the retained allocation/revision/override; it now also proves retained price variants. |
| M7-69 | New full-page regression drives the real bulk İcarə confirmation and proves the reason lands in the shared note exactly once before the batch is committed. |
| M7-83 | New full-page regression proves edit-mode posting reaches İcarə confirmation before `correct_document`. |
| M7-90 | New full-page regression supplies an invoice only on a cancelled document and proves no Qaimə conflict is raised; the ordinary confirmation opens. |
| M7-94 | Existing exact store/page regression proves an active-layer correction is refused before `correct_document` and retains the draft. The movements-screen affordance is separately accepted Phase 8 scope and is not used as substitute evidence. |
| M7-95 | Existing exact full-page regression proves a non-admin historical opening-balance line refuses the whole two-line document, calls no post RPC and retains both lines; an admin positive control passes. |
| M7-109 | Phase 8's ordinary correction run exercised the real `document_edit_impact` caller, restore/edit navigation and successful correction. Unit tests independently pin the block-list and restore-map branches. |
| M7-113 | The same live correction proves the replacement note contains exactly one `Əvəz edir: <doc>` marker. The client payload regression proves it sends no marker, and the strip helper regression prevents accumulation on reload. |
| M7-120 | Ordinary INSERT auditing and the explicit `correct_document` UPDATE audit row were read live. Client regressions prove no audit write is emitted by the browser. `log_icare_exposure` is a fallback for a no-explicit-split outbound line; the accepted active-split UI always sends the explicit split and the server deliberately takes the mutually exclusive `apply_cond_split` branch. This inactive/fallback audit path is accepted as out of scope for the configured Phase 7 UI, not claimed live. |
| M7-121 | Live authenticated TEST probes sent otherwise-valid inbound documents with an unknown channel and unknown partner. Both returned HTTP 400 / `P0001` with the exact `… Sorğuçalarda aktiv deyil — səhifəni yeniləyin` messages; movements stayed **127 → 127**. A full-page regression proves the server text is surfaced and the draft retained. |

## M7-40 implementation

The only application change in this audit is display metadata. No post payload
or server contract changed:

- `LayerPickDialog` returns `priceVariants` already computed from the selected
  source layers;
- `BulkLot` retains them (optional for pre-fix saved drafts);
- both confirmed single-line and bulk-line commits copy them into the draft;
- `DraftLinesPanel.priceCell()` uses the variants for layered lines and `—`
  when no known source price exists. Plain-line price behaviour is unchanged.

## Verification

- focused changed-surface run: **180/180**;
- formerly timing-out unrelated files rerun alone: **108/108**;
- full suite, one worker: **126 files / 2730 tests**;
- `tsc --noEmit`: exit 0;
- `oxlint src`: exit 0;
- sandbox production build: 199 modules, exit 0 (known chunk-size advisory);
- `git diff --check`: exit 0;
- staged files: 0; dirty-tree entry count preserved at 214.

The first parallel full-suite run had four unrelated 5-second timeouts. All
four passed together when rerun, and the complete one-worker suite passed. The
same first gate also caught a real TypeScript compatibility issue: historical
bulk drafts do not contain `priceVariants`. The field was made optional and all
gates were rerun; the failure is not hidden.

## TEST containment and final state

- project guard: `alkjjbaawmsirsfvqljm`; production ref
  `bbjmhaerssakbreykxiw` rejected before every direct probe;
- M7-121 refusal probes: zero committed rows, count 127 before/after;
- no new successful fixture was created by this audit;
- on-disk `VITE_ALLOW_LOCAL_WRITES=false` unchanged;
- no layer deactivation, cutover, stage, commit, push or deploy;
- credentials existed only in process memory and conversation history, never
  in a repository file or audit.

The movement count is 127 rather than the earlier 125 because the already
accepted M7-39 fixture and its reversal are immutable audit history; effective
stock was restored net-zero. Phase 7 acceptance does not delete that history.

