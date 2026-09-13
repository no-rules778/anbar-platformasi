# Phase 12 — implementation and read-only verification audit

Date: 2026-09-11
Scope: «Nomenklatura sorğuları» (`rNreq()`) — T1-T6 and T8. **T7 was not run.**
Status at Claude handoff: **NOT ACCEPTED** — subsequently accepted by the
[final independent Codex audit](2026-09-11-phase12-final-codex-acceptance.md).

> **CODEX APPLICATION CORRECTION — 2026-09-11.** The implemented page called
> `referenceDirectory.store.load()` on mount, silently adding warehouses,
> partners, Sərfiyyat and usage reads while M12-10 claimed only the request
> and item sources. Codex removed that coupling. The item-request store now
> calls only the dedicated `get_reference_values` reader required by the two
> dialogs, once per generation; `ready:false` remains non-fatal under A14.
> Store/page tests pin the corrected source set. M12-10 remains `CODE
> VERIFIED`; no live claim is added and the tally is unchanged.
> Final independent gates after this correction: focused 9 files / 275 tests;
> full suite 157 files / 3430 tests; typecheck, lint and sandbox build clean.

## What was authorised, and what was not

The owner accepted D-M1 and D-M3…D-M6 and authorised complete implementation
plus read-only TEST verification.
[Decision](../decisions/2026-09-11-phase12-design-scope.md) ·
[Codex design audit](../audits/2026-09-11-phase12-design-codex-audit.md).

**D-M2 remains deferred.** No TEST request was created, withdrawn, rejected or
approved; no permanent TEST item and no consumed 7-digit code exists. No SQL
was changed: `sql/017` is applied and untouched.

## Tally

Measured mechanically from the 70 `| M12-* |` authoritative status cells
(protocol §10, §17); never copied forward.

| Status | Rows |
|---|---|
| `CODE VERIFIED` | **61** |
| `LIVE VERIFIED` | **0** |
| `IN PROGRESS` | **3** |
| `NOT STARTED` | **6** |
| `BLOCKED` | **0** |
| unclassified | **0** |
| **total unique** | **70** |

70 rows parsed, 70 unique ids, 0 duplicates.

Expanded explicitly, because statuses do not follow the row-group ranges
(protocol §16):

- **`IN PROGRESS` — M12-04, M12-24, M12-98.** M12-04's `go()` refusal has no
  live leg. M12-24's 200 ms debounce is implemented and page-tested, but the
  timing boundary itself was never live-asserted. M12-98 is the evidence
  boundary and stays open while no TEST identity exists.
- **`NOT STARTED` — M12-78, M12-91, M12-92, M12-94, M12-95, M12-96.** Each
  needs a **server** refusal or the deferred D-M2 window: idempotent
  re-approval (78), role gates proven by refusal (91), first-refusing guard
  order (92), atomic code allocation (94), the concurrent duplicate race (95),
  the `audit_log` read-back (96). A browser observation can never satisfy them
  (protocol §5, §7).
- Every other row is `CODE VERIFIED` — **unit/source evidence only.**

## What was built

| File | Contract |
|---|---|
| `lib/nomenclatureRequests.ts` | `nreqNorm`, `nreqSimilar`, `filterRequests`, `statusTag`, `requestDateLabel`, `canReview`/`canWithdraw`, subtitle, empty text |
| `api/itemRequests.api.ts` | `fetchItemRequests` + the four RPC wrappers, both failure shapes normalised |
| `store/itemRequests.store.ts` | atomic snapshot, retention, stale-ticket ordering, filters |
| `pages/ItemRequestsPage.tsx` | shell, subtitle, segments, table, actions, withdrawal |
| `components/item-requests/RequestCreateDialog.tsx` | M12-50…M12-62 |
| `components/item-requests/RequestReviewDialog.tsx` | M12-70…M12-81 |

Additive edits to shared accepted surfaces, nothing rewritten:
`mutationGuard.ts` (four `nreq.*` actions + its count assertion 22 → 26),
`index.css` (five legacy rules ported verbatim: `td.nm`, `.t-op`, `.t-mv`,
`.t-out`, `.seg` and its three sub-rules), `App.tsx` (the `nreq` route and
rail entry) and its two rail-order fixtures.

## Contract decisions worth the auditor's attention

1. **A failed read is never a successful empty list (M12-11 vs M12-13/14).**
   Legacy swallows a failed `item_requests` read; the React port surfaces
   `ok:false`, retains a prior snapshot on refresh and shows the page error on
   first load. This is the corrected contract from the Codex design audit.
2. **Affordance vs authority is kept separate throughout.** `canReview`,
   `canWithdraw` and `nreqCanCreate` are browser affordances; their tests say
   so in their own names. The server gates are M12-91/92 and stay unpromoted.
3. **`nreqSimilar`'s short-name early return omits `exactReq` entirely**,
   reproducing legacy's own object shape (`index.html:2557`) rather than
   "tidying" it to `null`.
4. **A14 readiness split honoured.** A failed reference load falls back to the
   built-in unit/category lists; a READY but empty active list stays empty, so
   values an Admin deliberately hid never reappear.
5. **`ts = 0` renders `01.01.1970`, not an em-dash** — a legacy fact the port
   reproduces deliberately (M12-31).

## Falsifiability (protocol §4, §9)

Five targeted mutants, applied one at a time against a verified backup,
restored after each and checked byte-for-byte by md5:

| Mutant | Intended failure | Result |
|---|---|---|
| containment `>= 4` → `>= 3` | the 3-char boundary test | 1 failed, the intended one |
| store applies data on reader failure | M12-13 / M12-14 | 3 failed, all intended |
| `ts = 0` → em-dash | M12-31 boundary | 1 failed, the intended one |
| search haystack includes `note` | M12-23 negative control | 1 failed, the intended one |
| failed read → `ok:true` empty | M12-11 | 1 failed, the intended one |

Final md5s equal the pre-mutation baseline for all three mutated files.

**Harness correction, recorded rather than hidden (protocol §8, §12):** the
create-dialog suite first failed because it swapped fake and real timers
mid-test, losing the mount-time debounce. It was rewritten to the accepted
`MovementsPage`/`BalancesPage` idiom (`useFakeTimers({ shouldAdvanceTime:
true })` with `act()`-wrapped advancement) and the complete suite reran clean.
Two similarity fixtures were also wrong on their own arithmetic
(`kabelnym3x25` vs `kabelnym3x15` genuinely do not match) and were corrected
to names that actually exercise the containment arm — the components were
correct in both cases.

## Gate

| Check | Result |
|---|---|
| Full suite | **157 files / 3429 tests passed** |
| `tsc -b --noEmit` | clean (exit 0) |
| `oxlint src` | exit 0 (3 `only-export-components` advisories, the existing idiom) |
| `vite build --mode sandbox` | built; the «chunks > 500 kB» advisory is the pre-existing Phase 8 one |
| `git diff --check` | clean |
| Staged files | **0** |
| Dirty tree | preserved (71 entries) |

Two `App.test.tsx` rail fixtures required updating because Phase 12 genuinely
adds a rail entry; both now assert the M12-01 placement (last in «Bazalar»,
after «Soraqçalar») rather than merely a count. Six failures seen in one
intermediate full run were the known parallel-load flake — those three suites
pass 218/218 in isolation, and the final full run is clean.

## T6 — read-only sweep, and its honest boundary

The sandbox dev server on 127.0.0.1:5175 was **inspected and reused**, not
killed: verified serving TEST `alkjjbaawmsirsfvqljm`, `MODE: sandbox`,
`VITE_ALLOW_LOCAL_WRITES=false`, and the current edited tree (it serves
`/src/pages/ItemRequestsPage.tsx`, which exists only there).

The harness armed a hard production abort on `bbjmhaerssakbreykxiw`, a blanket
abort on every non-GET/HEAD/OPTIONS Supabase request, and a name abort on the
four request RPCs. It launched Chrome, reached the login gate and **stopped**:
no `ANBAR_TEST_EMAIL`/`ANBAR_TEST_PASSWORD` was supplied to this session, and
passwords may not be read, stored or printed.

**Measured: 0 Supabase mutations, 0 production contacts, 0 write attempts.**

Consequently **no row is `LIVE VERIFIED`.** The authenticated legs — rail
placement live, the exact `item_requests` + `items` read set, subtitle and
footer, segment filtering, table cells, and retention under an injected 503 —
remain unexercised. They are unblocked by a TEST **anbardar** identity alone
(no D-M2 needed) supplied as a process-only variable.

## Next step

Codex's independent audit. Claude does not mark Phase 12 `ACCEPTED`.
Points for the auditor:

1. Whether 61 `CODE VERIFIED` on unit/source evidence is the right level for
   the presentation rows (M12-30…M12-39), which are page-test-evidenced but
   never rendered against live data.
2. Whether M12-24 belongs in `IN PROGRESS` or `CODE VERIFIED`: the debounce is
   implemented and tested, but only its behaviour, not its 200 ms timing, is
   asserted.
3. Whether M12-93 (structural invisibility of a pending request) is properly
   `CODE VERIFIED` from source and type evidence, given it asserts a negative.
