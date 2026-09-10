# Phase 7 — M7-39 field-clearing independent Codex audit

Date: 2026-09-10
Environment: TEST `alkjjbaawmsirsfvqljm` only, localhost
`127.0.0.1:5175`, `VITE_ALLOW_LOCAL_WRITES=false`.

## Verdict

The field-clearing remediation is **accepted**. The code now uses the already
accepted explicit monotonic `commitSignal` as the single post-commit
transition. A forward step clears the search query, local quantity, condition
split, line error/warning and inbound header price, then focuses item search.
The signal is still advanced only after the two supported single-line
`addLineRaw` commit points (ordinary commit and confirmed layer-dialog return).

`M7-39` remains **IN PROGRESS**, not because this remediation failed, but
because the row's separate request-key invalidation clause has automated
coverage only and was not observed live in this audit.

## Independent code review

- `OperationForm.tsx` keys the effect on `commitSignal`, not `lines.length`.
- The first render establishes a baseline and only a forward signal step runs
  the transition.
- `NewOperationPage.tsx` advances the signal after ordinary `addLineRaw` and
  after confirmed single-line layer allocation. Restore, edit hydration, bulk,
  removal, clear, refresh, failed validation and an unconfirmed dialog do not
  advance it.
- Pick/unit are page-owned and cleared by `addLineRaw`; quantity/split are
  form-local and are now cleared inside the common effect. Inbound price is
  cleared through `onSetHeaderField({ pr: '' })`; unrelated document headers
  are preserved.

## Independent offline gate

| Check | Result |
|---|---|
| Focused `OperationForm` + `NewOperationPage` | **143/143 passed** |
| Full suite | **126 files / 2723 tests passed** |
| `tsc --noEmit` | exit 0 |
| `oxlint src` | exit 0 |
| `vite build --mode sandbox` | passed, 199 modules; known non-fatal chunk advisory |
| `git diff --check` | exit 0; line-ending advisories only |

## Independent live browser evidence

Authenticated through the real localhost login as TEST admin. No final
document-post action was invoked.

1. **Ordinary inbound commit.** Selected TEST item `0000001`; the form seeded
   price `10`, quantity was set to `1`, then the real «Sətri əlavə et» action
   appended one local draft row. After the commit, price was empty, the picked
   block/quantity/unit were absent, item search was empty, and focus was on the
   item-search input.
2. **Confirmed layer-dialog commit.** On the outbound active-layer path, the
   real condition split was set to `İCARƏDƏ 0.01`; `LayerPickDialog` opened from
   the real read, exactly `0.01` was allocated from the TEST layer, and the
   dialog's «Təsdiq et» appended the local draft row. The picked block and
   quantity/split controls cleared and focus returned to item search.
3. **No stale local quantity on the next pick.** Selecting item `0000001`
   again after that confirmed layer commit produced a fresh empty quantity
   control; the previous `0.01` did not reappear.

The visible final «Sənədi qeyd et» button was never pressed, so neither local
draft line was posted to Supabase. The TEST device session was ended through
the real «Çıxış» flow and the temporary browser tab was closed.

## Documentation finding

The remediation report said the M7-39 ledger row had been rewritten, but the
working file still contained the superseded `lines.length GROWING` text and
still claimed only refocus was live. This audit corrects that row and records
the live clearing evidence without erasing the earlier chronology.

## Status

- Field-clearing remediation: **CODE + LIVE VERIFIED**.
- `M7-22`: remains **LIVE VERIFIED**.
- `M7-39`: remains **IN PROGRESS** pending the request-key invalidation clause.
- Phase 7: **NOT ACCEPTED**.
