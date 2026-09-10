# Phase 8 M8-30/M8-32 batch validation refusals — 2026-09-08

## Result

Narrow PASS for six TEST-admin, non-layer batch validation/no-write paths.
Phase 8 remains **NOT ACCEPTED**.

Only TEST project `alkjjbaawmsirsfvqljm` was contacted. Production project
`bbjmhaerssakbreykxiw` was not contacted. No successful mutation or new fixture
was needed; localhost remained read-only.

## Evidence

Direct authenticated `cancel_documents_batch` calls returned HTTP 400 / P0001:

| Case | Server result |
|---|---|
| empty selection | `Ləğv üçün heç bir sənəd seçilməyib` |
| whitespace first entry | `Sıra 1: etibarlı sənəd nömrəsi yoxdur — sənədsiz (legacy) qeydlər yalnız fərdi ləğv edilir` |
| duplicate open document | `Təkrar seçilmiş sənəd(lər): SND-D512FAAC59` |
| already-cancelled ordinary original | `Bu sənəd artıq ləğv edilib: SND-76074E451C` |
| ordinary reversal document | `Bu sənəd artıq bir ləğv (əks yazı) sənədidir, yenidən ləğv edilə bilməz: SND-C-2D6E6E714D` |
| transfer reversal document | `Əks yerdəyişmə (ləğv) sənədi yenidən ləğv edilə bilməz: SND-R-5D4231E5E8` |

The admin-visible movement count was 28 immediately before and 28 immediately
after all six calls. None produced a partial or duplicate reversal.

## Status impact and limits

- `M8-30`: adds server evidence for empty/legacy/duplicate/already-cancelled and
  reversal-document eligibility branches.
- `M8-32`: adds six atomic no-write rejection outcomes.

This is direct server-contract evidence, not React dialog error rendering.
M8-21/M8-22 UI presentation is not promoted because cancelled/reversal rows are
excluded from the effective registry. Mixed-type, unsupported-type, balance,
layer, role, stale, transport/unknown-outcome, refresh and concurrency cases
remain open.

