# Phase 14 — design handoff audit (Module P, «Hesabatlar»)

Date: 2026-09-11
Verdict: **DESIGN DRAFTED — Phase 14 is `NOT STARTED` / `NOT ACCEPTED`.**
Only Codex's independent audit can accept it.

Design and reconciliation only. **No application, test, SQL, CSS or env file
was changed in the design session; no Supabase project was contacted; the
dirty tree is preserved and staging is empty.** No row is promoted.

## Mechanical tally

Derived in this session from the 99 `| M14-* |` status cells by a parser that
splits on **unescaped** pipes only and classifies each row by the **primary
status at the start of its final cell** (protocol §17). Status totals are
derived from the rows; none is copied forward from prose.

| Status | Rows |
|---|---|
| `CODE VERIFIED` | 0 |
| `LIVE VERIFIED` | 0 |
| `IN PROGRESS` | 0 |
| `NOT STARTED` | **99** |
| `BLOCKED` | 0 |
| unclassified | 0 |
| **total unique** | **99** |

99 rows, 99 unique ids, 0 duplicates, every row a uniform 5-cell row, ids
M14-01…M14-99 contiguous with no gaps, sum of status counts = 99 = unique ids.

**Parser validity (protocol §18).** The same parser was run against the
independently `ACCEPTED` Phase 13 ledger as a positive control and returned
77 rows / 68 `CODE VERIFIED` / 9 `LIVE VERIFIED` / 0 otherwise — matching that
ledger's own accepted banner exactly. The unescaped-pipe rule is load-bearing
here: several M14 contract cells quote JS `||`, escaped `\|\|`, and a naive
split would fragment those rows and undercount.

## Correction history (recorded, not erased)

A first draft of the proposal and of the ledger banner asserted **96** M14
rows from an uncounted prose estimate. The mechanical parse returned **99**.
All stated figures were corrected in the ledger banner and tally table before
the plan or this audit was written, and a sweep confirmed no stale `96`
survives in either document — the remaining textual matches are the legacy
line number `1296`, the row id `M14-96`, and this correction record itself.

This is the third occurrence of the same defect class (Phase 12: 58→70;
Phase 13: 86→77). It was caught before any downstream document copied it, but
the pattern is worth naming: **a row count must be parsed, never estimated**,
and the parse must run before the first document that cites it.

A second correction, also recorded: the session's inventory message cited the
`abc` branch as beginning at line 6781 and `dead` at 6789-6794. An offset
re-read established the exact ranges — `abc` **6776-6787**, `dead`
**6788-6804**, `tr` **6805-6820** — and the ledger and proposal carry the
corrected figures. The `REP_*` assignment line numbers in the original
inventory were correct; only the branch-start numbers were approximate.

## What makes this phase different

**It is the first migrated screen that performs no write and issues no RPC.**
Every prior phase from 7 onward carried a write gate — D-N1, D-M2, the
cancellation family, the condition marker. Phase 14 has none: no sequence to
consume, no `audit_log` residual, no cleanup, no owner write authorisation
required. The evidence profile is therefore unusually flat — almost every row
is a pure derivation provable by unit test, with a thin read-path/browser
tail and exactly one row (M14-99) gated behind an identity the project does
not have.

**It is also the first phase whose scope is eight independent report families
behind one selector.** The risk is not depth in any one branch but breadth:
eight export headers, eight `REP_NAME` slugs, eight sort orders, and a shared
export/print mechanism that in legacy is driven by two module globals.

## Findings worth carrying forward

**1. The export/print latch is the phase's central parity trap (M14-95).**
Legacy wires `#rep-exp` and `#rep-print` exactly once, behind an
`if (!pick.dataset.done)` guard (`6732-6733`). Both handlers close over the
globals `REP_ROWS` / `REP_NAME` (`6729`), so they always act on whatever branch
rendered last. React has neither globals nor a latch. The ledger records this
as an **equivalence of observable behaviour**, explicitly not as parity of
implementation — the distinction the protocol requires (§7), and the reason
M14-95's wording is longer than any other row's.

**2. Three value asymmetries that a "simplification" would silently destroy.**
`byPartner.val` and `byDate.val` accrue incoming quantity only; `byType.val`
accrues both directions (`1296-1299`). They look like copy-paste variants and
are not. The plan requires a fixture carrying both `in` and `out` on one row,
because a receipts-only fixture makes all three agree and proves nothing.

**3. `tr` does not use the accepted route normaliser, and the two disagree
(M14-71).** The branch resolves the far-side warehouse with a case-sensitive
`indexOf(w) === 0` prefix test (`6808`), while the accepted `transferRoute()`
lower-cases, canonicalises `ı`→`i` and strips «anbar/anbarı/anbarına». A
stored «astara anbarı» resolves under the normaliser and is **dropped** by
`tr`. Substituting the normaliser would change which rows appear in a
financial matrix. Legacy behaviour is preserved and the divergence is a ledger
row rather than a silent fix.

**4. `abc` carries user-visible text that contradicts the code (M14-59).** The
hint reads «İlk 200 sətir göstərilir» while `SHOW_MAX` is 3000 (`1678`). It is
reproduced verbatim. Correcting user-facing copy is a product decision, not a
migration one — recorded as D-P2 rather than resolved unilaterally.

**5. There is no note truncation anywhere (M14-76).** `qaimeReportRows()`
joins notes with ` · ` and de-duplicates by linear scan, with no length cap in
screen or export. The only shortening is the CSS `td.nm{max-width:390px}`
ellipsis on a *different* column. This is recorded explicitly because a
reviewer may reasonably expect a cap, find none, and "restore" one.

**6. Two percentages in one branch (M14-57).** `abc` prints the *cumulative*
share at 1dp on screen and exports the *individual* share at 2dp. Both are
correct; a test fixture must make the two numbers differ for the same row, or
the assertion is vacuous.

**7. Stylesheet gaps are exactly three, and one is subtler than it looks
(M14-98).** `.neg` and `.clk` are absent outright. `.nm` exists only as
`td.nm` (`index.css:88`), but the `abc`/`dead` branches render
`<div class="nm">` *inside* a `td` — so the existing rule does not apply and a
bare `.nm` is genuinely needed. `sparkline()` has no React equivalent at all.
This mirrors the M13-99 precedent: additive only, no existing rule modified.

**8. No `mutationGuard` entry, recorded deliberately (M14-97).** A read-only
page has no action to guard. The row exists so the absence is evidenced rather
than looking like an oversight to a later reviewer.

**9. The `dead` reuse must not be double-counted (M14-60…M14-64).** The
owner's instruction makes the accepted Phase 10 functions the single
derivation. The Phase 14 rows record the **reuse** — same module imported,
identical output on a shared fixture — and explicitly do not re-verify Phase
10's own accepted contracts. Claiming those as new Phase 14 evidence would
violate §6 and inflate the tally.

## Evidence boundaries, stated before implementation

- **M14-99 cannot be closed by this project's current access.** It compares an
  anbardar's RLS-narrowed row set against an admin's; no TEST admin identity
  exists (the M10-51 / M11-91 / M12-98 / M13-93 boundary). It stays unpromoted
  rather than claimed from one role's browser session.
- **Browser evidence is not server evidence.** The T8 matrix proves the read
  path and the selector; it is labelled browser-harness evidence throughout and
  no row is promoted to `LIVE VERIFIED` on the strength of a green-looking UI.
- **No write evidence will exist for this phase, by design.** Any future claim
  of a persisted or server/RLS contract here should be treated as suspect.

## Decisions

**D-P1 — resolved by the owner** (2026-09-11 FAST CONTINUATION): the accepted
Phase 10 dead-stock functions are the single derivation for both surfaces;
Phase 10 behaviour is unchanged.

**D-P2, D-P3, D-P4** are recommendations, implemented as proposed, each with a
pinning test, none blocking a slice: reproduce the stale `abc` hint verbatim;
hold the qaimə column selection in the store so it survives navigation as the
legacy module-level `QAIME_SEL` does; replace the per-row partner `find()`
with a Map whose output equivalence — including the missing-partner case — is
pinned by test. All three are reported to the owner at the end of the session.

## Status

**SUPERSEDED — 2026-09-11.** This line read «Phase 14 is **NOT STARTED /
NOT ACCEPTED**. Implementation is authorised by the owner's instruction and
proceeds under the plan's T1-T8». That was true when this design audit was
written and is now false: T1-T7 ran, 96 of 99 rows are `CODE VERIFIED`, and
3 remain `NOT STARTED` (M14-10, M14-17, M14-99). Phase 14 remains
**NOT ACCEPTED**, and acceptance remains solely with Codex's independent
audit. The current figures live in the
[implementation audit](./2026-09-11-phase14-implementation.md) and the
[ledger banner](../specs/2026-09-11-phase14-registry-rows.md).
