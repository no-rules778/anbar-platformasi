# Phase 17 template export integration — corrective implementation audit

Date: 2026-09-12 · Scope: M17-95, M17-96, M17-98, M17-99 only
Status: Phase 17 remains **NOT ACCEPTED** — awaiting independent Codex audit

> **CODEX DELIVERY CORRECTION — 2026-09-12.** The orchestrator was correct
> under injected dependencies but the shipped app had neither a JSZip loader
> nor `web/public/azpetrol-template.xlsx`, so every real click was forced into
> fallback. Codex added JSZip as a production dependency and published the
> repository's existing template asset. Source/public SHA-256 is identical
> (`0016C764…976FAE`), and the sandbox build copies the 21,427-byte template
> into `dist`. The runtime now imports JSZip rather than relying on an
> undeclared CDN global. See the final export Codex audit.

## What this round corrects

The offline-slice Codex audit
([2026-09-12-phase17-offline-slice-codex-audit.md](./2026-09-12-phase17-offline-slice-codex-audit.md))
correctly found that `azpTemplateExport.ts` was a collection of pure helpers
and that testing a patch transform cannot prove an orchestration. It demoted
four rows to `IN PROGRESS`. That finding is accepted in full and its
correction history is preserved verbatim in the ledger and in the parity
registry.

This round builds the missing orchestration. It does **not** re-promote the
four rows on the old evidence; it produces new evidence of a different kind.

Codex's payload-model corrections — `azp_save_card` reading `p_card.id`,
manual movement rows carrying `doc_num` and `note`, correction patches
carrying `doc_num` — were not touched, reworked or undone.

## What was implemented

### `web/src/lib/azpSheetBuild.ts` (new)

The shared sheet MODEL both writers consume, ported from `azpCardLists`
(index.html:9232-9249), `azpRowPlan` (9258-9280), `azpBuildSheet`
(9282-9430) and the data half of `azpSheetXml` (9515-9702).

One model, two writers, deliberately: the template path and the fallback are
never produced in the same run, so a divergence between two independently
built datasets would be invisible. `azpSheetPatch()` returns the four patched
elements and does not apply them — `azpPatchSheetXml` keeps sole ownership of
the patch surface, so widening it requires editing the function where the
contract is stated.

### `web/src/lib/azpExportRun.ts` (new)

`azpRunExport(m, input, deps)` — the orchestration, ported from `azpExport(m)`
(index.html:9715-9756):

1. `azpMod(m)`, then the two legacy refusals in order (not ready → no cards).
2. The full non-cancelled set via `azpExportRows`, built into the model ONCE
   and shared by both paths.
3. Resolve JSZip; `fetch(AZP_TPL_URL)`; `JSZip.loadAsync(arrayBuffer)`.
4. Read the module's worksheet part, patch exactly `dimension`, `cols`,
   `sheetData` and `mergeCells`, write it back.
5. Read `xl/workbook.xml`, `xl/_rels/workbook.xml.rels` and
   `[Content_Types].xml`, run `azpDropSheet`, write all three back, and remove
   the other worksheet part, its own `_rels` file and `xl/calcChain.xml`.
6. `generateAsync({ type: 'blob', compression: 'DEFLATE', mimeType })`, then
   one download under `<stem>_<today>.xlsx`.
7. Success toast: `<Title> hesabatı yükləndi — <n> kart`.
8. `catch`: run the plain SheetJS writer over the SAME model and return the
   exact `Şablonsuz ixrac (dizayn tətbiq olunmadı): <message>` warning. When
   SheetJS is also unavailable, return the ORIGINAL error, `ok: false`, with
   no fallback prefix and no success claim.

`styles.xml` and `theme1.xml` are never read, written or removed.

### `web/src/pages/AzpPage.tsx`

`AzpExportButton` renders the `azp-exp-<m>` control beside «Hesabat». It sits
OUTSIDE `azpSyncButtons`, so a read role keeps it — legacy never hides it, and
the module's reading roles exist to read and report.

It subscribes to `data[m]` and never to `filter[m]`. It shows «Hazırlanır…»
and `disabled` while running and restores both in `finally` on every path. The
in-flight guard is a `busy` check at the TOP of the handler, not merely the
`disabled` attribute: `disabled` is applied on the next render, so two clicks
inside one frame would otherwise start two exports.

## Evidence

All fixtures are hand-written; `fetch`, JSZip, SheetJS and the anchor download
are injected doubles. Every positive assertion carries a falsifying control.

| Row | What the new tests actually execute |
|---|---|
| M17-95 | The full success orchestration: template fetched at `AZP_TPL_URL`, ZIP loaded once, the worksheet WRITTEN BACK patched, the four old element values gone, the surrounding design bytes and the sheet's own marker intact; `styles.xml`/`theme1.xml` asserted byte-identical before/after and never in the written or removed lists; exactly one blob generated with the legacy MIME/compression and exactly one download with the legacy filename; the exact success toast |
| M17-96 | Both directions run through the real archive. In an Azpetrol export the ARAZ `<sheet>`, its `rId`, its relationship, its content-type override, its part and its rels are all gone, while the OWN sheet and an unrelated styles relationship survive (the control that a both-sheets deletion would fail). `xl/calcChain.xml` deleted. In an Araz export the trailing-space name matches and removes sheet1; a trimmed-name control, with the rId path broken so only the name could match, proves the entry SURVIVES — the leak M17-97's trailing space prevents |
| M17-98 | With the board filtered to one card, one kind and a one-day window, the written worksheet still carries BOTH cards and every out-of-filter amount, and the toast counts every card; the filter is left untouched. A control proves that same filter really does narrow the on-screen movement table. A cancelled row's amount is absent, and a control proves the same row appears once un-cancelled |
| M17-99 | Three forced template failures (JSZip absent, template 404, worksheet part missing) each land in the catch and run the REAL SheetJS writer — `book_append_sheet` with the 28-char sliced sheet name plus `writeFile` with the legacy filename — each with the exact warning. A dataset test asserts the fallback worksheet carries both cards (leading zero preserved, pinned `t:'s'`/`z:'@'`), every non-cancelled amount and not the cancelled one, with an un-cancel control. Both-unavailable returns the original error with no prefix and no success. A sweep asserts no failing path ever emits the success toast |
| M17-100 | **NOT PROMOTED.** No test here touches real data |

Page-level: the control renders on both boards for a `rehber`, with a control
proving the admin-only controls are absent for that same role; the busy label
and disabled state appear and are restored on both a succeeding and a failing
run; three rapid clicks produce one download and one toast; both refusals
occur without fetching the template.

## Gate

| Check | Result |
|---|---|
| Focused export + page suites | 25 files / 674 tests passed |
| Full suite | 205 files / 4330 tests passed |
| `tsc -b --noEmit` | exit 0 |
| `oxlint src` | 4 warnings, all pre-existing, none from new files |
| `vite build --mode sandbox` | clean |
| `node tools/ledger-check-m17.mjs --self-test` | 10/10 |
| `node tools/ledger-check-m17.mjs` | PASS, 110 contiguous unique rows |
| `node tools/ledger-check.mjs --self-test` | 27/27 |
| `node tools/ledger-check.mjs` | PASS, 124 rows |
| `git diff --check` | exit 0 |
| staged files | 0 |

## Mechanical tally

Derived by `node tools/ledger-check-m17.mjs`, not carried forward. The checker
FAILED on the first run against the stale banner:

```
tally table claims CODE VERIFIED = 89 but rows derive 93
tally table claims IN PROGRESS  = 4  but rows derive 0
banner claims CODE VERIFIED     = 89 but rows derive 93
banner claims IN PROGRESS       = 4  but rows derive 0
```

The banner and tally table were corrected to the derived figures and it now
passes:

**93 CODE VERIFIED / 0 LIVE VERIFIED / 0 IN PROGRESS / 0 NOT STARTED /
17 BLOCKED / 0 unclassified; 110 unique rows.**

The pre-stated estimate for this round was 93/0/17/110. It matches, but the
figures above are the checker's output, not the estimate.

## What this does NOT prove

- **M17-100 (egress) stays BLOCKED.** Whether the real card and movement set
  may leave the system is a different question from whether this orchestration
  is correct. Synthetic tests are not authority for real egress.
- **The other 16 BLOCKED rows are unchanged.** M17-17…M17-21 and M17-28 need
  an authenticated identity and a live server answer; M17-80…M17-89 need an
  authorised TEST execution window. No client test can satisfy any of them.
- **No real workbook was opened.** The ZIP double is a `Map`. The real
  `azpetrol-template.xlsx` was never read, and the produced blob was never
  written, opened in Excel or validated as an OOXML package. The orchestration
  is CODE VERIFIED; the resulting FILE is not.
- **A styled-layout parity claim is not made.** The XML writer reuses the
  template's own `cellXfs` indices, but no row contracts for the rendered
  layout and none is claimed.

## Known gap — recorded, not hidden

JSZip is not a `web/` package dependency. Legacy loads it from a CDN
`<script>` (index.html:6) and tests `typeof JSZip === 'undefined'`; adding a
dependency requires approval (CLAUDE.md §6) and was outside this scope, so the
orchestrator resolves it from `globalThis` exactly as legacy does.
`web/public/` also carries no `azpetrol-template.xlsx`.

Consequence, stated plainly: in the React app as it ships today, a real click
resolves no JSZip and takes the FALLBACK path. That is why the fallback is
built and tested as a real, exercised path rather than a theoretical one, and
it is why "the template export works in production" is NOT claimed. Shipping
the template asset and a JSZip loader is a separate, approval-bearing step.

## Safety

No Supabase contact of any kind. No production (`bbjmhaerssakbreykxiw`) or
TEST contact. Zero RPC invocations, no fixture, no import, no delete, no
mutation, no real-data export. No stage, commit, push or deploy. The dirty
tree is preserved. Phase 17 remains **NOT ACCEPTED**; only an independent
Codex audit can change that.
