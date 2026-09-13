# Phase 12 parity ledger — Module M («Nomenklatura sorğuları»)

> **PHASE 12 ACCEPTED — 2026-09-11 (authoritative, scoped).** Independent
> Codex audit accepted the implemented owner-approved scope D-M1 and
> D-M3…D-M6 after correcting the M12-10 source fan-out defect. D-M2 remains a
> deferred live-write extension: its six server/write rows remain `NOT
> STARTED`, and no TEST request/item/code was created. The row tally remains
> 61 `CODE VERIFIED`, 0 `LIVE VERIFIED`, 3 `IN PROGRESS`, 6 `NOT STARTED`, 0
> `BLOCKED`, 0 unclassified; 70 unique ids. Final gate: 157 files / 3430 tests,
> typecheck, lint, sandbox build and diff hygiene clean; 0 staged.
> [Final Codex audit](../audits/2026-09-11-phase12-final-codex-acceptance.md)

> **PHASE 12 IMPLEMENTED — 2026-09-11 (authoritative, latest).** The owner
> accepted D-M1 and D-M3…D-M6; D-M2 stays DEFERRED, so no TEST request was
> created, withdrawn, rejected or approved and no permanent TEST item or code
> exists. T1-T6 and T8 ran as one block; **T7 was not run.**
> **Tally, measured mechanically from the 70 `| M12-* |` status cells: 61
> `CODE VERIFIED`, 0 `LIVE VERIFIED`, 3 `IN PROGRESS` (M12-04, M12-24,
> M12-98), 6 `NOT STARTED` (M12-78, M12-91, M12-92, M12-94, M12-95, M12-96),
> 0 `BLOCKED`, 0 unclassified; 70 unique ids, 0 duplicates.**
> Gate at Claude handoff: 157 files / 3429 tests, `tsc -b --noEmit` clean, `oxlint src` exit 0,
> sandbox build ✓, `git diff --check` clean, 0 staged, dirty tree preserved.
> **NO row is `LIVE VERIFIED`:** no TEST identity was available to this
> session, so the T6 browser sweep armed its production-abort and blanket
> mutation guards, reached the login gate and stopped. **0 Supabase
> mutations, 0 production contacts, 0 write attempts.** The six `NOT STARTED`
> rows each need a server refusal or the deferred D-M2 write window; they are
> unpromoted by design, not overlooked. Phase 12 remains **NOT ACCEPTED**
> pending Codex's independent audit.
> [Decision](../decisions/2026-09-11-phase12-design-scope.md) ·
> [Codex design audit](../audits/2026-09-11-phase12-design-codex-audit.md) ·
> [Implementation audit](../audits/2026-09-11-phase12-implementation.md)

> **DESIGN HISTORY — 2026-09-11 (SUPERSEDED by the banner above).** The design
> package was drafted and audited, and at that moment all 70 rows measured
> `NOT STARTED` with 0 in every other status. That figure is HISTORY; the
> current tally is in the banner above.
> [Proposal](./2026-09-11-react-migration-phase12-nomenclature-requests-proposal.md) ·
> [TEST-only plan](../plans/2026-09-11-react-migration-phase12-nomenclature-requests.md) ·
> [Design handoff audit](../audits/2026-09-11-phase12-design-handoff.md) ·
> [Roadmap](../plans/2026-09-10-post-phase9-migration-roadmap.md)

Evidence classes: *unit/source* = vitest / static source comparison;
*browser* = interception on the sandbox dev server against TEST; *live* = the
row's exact contract exercised against TEST `alkjjbaawmsirsfvqljm`;
*persisted TEST* = written and re-read in TEST; *server/RLS* = proven by a
refused or allowed call. Legacy refs are `platform/index.html` lines; server
refs are `sql/017_nomenclature_requests.sql`.

**This is the migration's first WRITE workflow with a multi-role approval
gate.** Browser affordances and server-authoritative permissions are separate
rows throughout: a hidden button is never evidence of a permission (protocol
§5, §7). Every row whose contract is a refusal names the FIRST refusing guard.

Rows deliberately NOT in this ledger (prose boundary, see proposal §2.11 and
§7): the rail pending-counter badge `#c-nreq` (2548-2550 — shell concern,
Phase 18, D-M5), `Çap` and any export (the page has neither, 346-350), and
`item_request_candidates()` server-side similarity (D-M3).

| Row | Contract | Legacy ref | Server ref | Status |
|---|---|---|---|---|
| M12-01 | Rail contains one «Nomenklatura sorğuları» entry; it is the LAST entry of the «Bazalar» group in legacy rail order, after «Soraqçalar»; clicking it opens the page and it becomes the only active entry | 257 | — | `CODE VERIFIED` |
| M12-02 | The rail entry is hidden unless the effective role is admin, anbardar or rehber: `display:none` by default, revealed by `isAdmin() \|\| isAnbardar() \|\| isRehber()` | 257, 7506 | — | `CODE VERIFIED` |
| M12-03 | Because all three effective roles pass that test, the entry is visible to EVERY signed-in user with a resolvable effective role; the gate excludes only a user whose effective role resolves to none of the three. Legacy `effectiveRole()` maps techizat/muhasib/baxis → rehber, so those legacy roles DO see it | 257, 641-642, 7506 | 007 `effective_role()` | `CODE VERIFIED` |
| M12-04 | `go('nreq')` refuses the page for a role outside those three and does not render it; this is a UI gate only and is NOT claimed as a permission | 1499 | — | `IN PROGRESS` |
| M12-05 | Heading «Nomenklatura sorğuları»; the page shell is a `.phead` with the heading, the role-dependent subtitle paragraph, a spacer and the «Yeni nomenklatura sorğusu» button, then the filters block, then one `.card` holding the table and a footer note | 346-350 | — | `CODE VERIFIED` |
| M12-06 | Subtitle is role-dependent, exactly three variants: admin «Anbardarların təklifləri. Təsdiq zamanı mal yaranır və 7 rəqəmli kod verilir; rədd üçün səbəb məcburidir.»; anbardar «Yeni mal təklif edin. Təsdiqə qədər mal nomenklaturada yaranmır və kod almır — yalnız Admin təsdiqləyə bilər.»; otherwise «Yalnız oxu. Sorğuları Admin təsdiqləyir və ya rədd edir.» | 2504-2510 | — | `CODE VERIFIED` |
| M12-07 | The «Yeni nomenklatura sorğusu» button is rendered only when `nreqCanCreate()` is true, i.e. the effective role is anbardar — NOT admin and NOT rehber; this is a browser affordance, never the authority | 2502-2503, 2484 | — | `CODE VERIFIED` |
| M12-10 | The page reads exactly `item_requests` (SELECT `*`, `created_at` DESC), `items`, and the dedicated `get_reference_values` RPC needed by the create/review unit/category selectors; it does not load the whole Soraqçalar store and issues no movements, warehouses, partners, Sərfiyyat, usage, balances or valuation read | 891-892, 2560, 2572, 2637 | policy `item_requests_select` | `CODE VERIFIED` — Codex correction: removed an accidental whole-reference-directory load; store/page tests pin the three necessary sources and A14 non-fatal readiness |
| M12-11 | Legacy compatibility boundary: a missing/failed `item_requests` read was swallowed and left `DB.itemReqs` empty, allowing the rest of the legacy platform to work. The React page remains isolated from the rest of the application, but under M12-13/14 it MUST surface the failed read as `ok:false` (initial load error or retained-snapshot refresh warning), never apply a successful empty snapshot | 889-903 | — | `CODE VERIFIED` |
| M12-12 | Row mapping from table columns to view fields is exactly: `id`, `name`, `unit`←`unit \|\| ''`, `category`←`category \|\| ''`, `note`←`note \|\| ''`, `status`←`status \|\| 'pending'`, `by`←`created_by \|\| ''`, `w`←`created_warehouse \|\| ''`, `ts`←`created_at` as epoch ms else `0`, `decidedBy`, `decidedAt`, `reason`←`decision_reason \|\| ''`, `code`←`item_code \|\| ''` | 894-901 | table DDL 66-93 | `CODE VERIFIED` |
| M12-13 | The snapshot is one atomic generation: any read error or rejection yields `ok:false` and nothing is applied (accepted Phase 8-11 deviation from legacy partial rendering) | 855, 889-903; M11-11 precedent | — | `CODE VERIFIED` |
| M12-14 | First load shows a loading block; a first-load failure shows a load-error block and no table; a failed REFRESH retains the previous complete snapshot and shows the «Yenilənmədi» tag; recovery clears it | M10-12 / M11-12 precedent | — | `CODE VERIFIED` |
| M12-15 | A response from an earlier load that arrives after a later load's response is discarded, success and failure alike | M10-15 / M11-15 precedent | — | `CODE VERIFIED` |
| M12-16 | Realtime watches `item_requests` and `items` through the shared hook with its 400 ms debounce; a burst produces one reload. Legacy subscribes to a FIXED set that does NOT include `item_requests` (1174), so this is a proposed IMPROVEMENT, not parity — D-M4 | 1163-1181 | — | `CODE VERIFIED` |
| M12-17 | Filter and search state lives in the store, not in the component, so it survives navigation away and back (the M4-18 / M9-06 rule; legacy state is the long-lived `NREQ` object) | 2470 | — | `CODE VERIFIED` |
| M12-20 | Status segment control offers exactly four buttons in order «Gözləyən» (`pending`), «Təsdiqlənən» (`approved`), «Rədd edilən» (`rejected`), «Hamısı» (`''`); «Gözləyən» is the initial selection and carries `.on`; clicking one moves `.on` to it and re-renders | 2489-2500, 2470 | — | `CODE VERIFIED` |
| M12-21 | There is deliberately NO «Ləğv edilən» segment: a `cancelled` request is reachable only through «Hamısı». Legacy fact to preserve, not to fix | 2489-2494 | status CHECK 73-74 | `CODE VERIFIED` |
| M12-22 | Status filter semantics: a non-empty `NREQ.status` keeps only rows whose `status` equals it exactly; `''` keeps every row including `cancelled` | 2512-2513 | — | `CODE VERIFIED` |
| M12-23 | The search box filters on the concatenation `name + ' ' + unit + ' ' + category + ' ' + code`, lower-cased, by substring; the `note` and the warehouse are deliberately NOT searchable | 2514-2515 | — | `CODE VERIFIED` |
| M12-24 | Search input is debounced 200 ms and its value is trimmed then lower-cased before matching | 2495 | — | `IN PROGRESS` |
| M12-25 | The two filters combine as AND; neither resets the other, and there is no paging on this screen (no `cut()`/`cutNote()`, unlike Nomenklatura) | 2512-2517 vs 2436 | — | `CODE VERIFIED` |
| M12-30 | Table columns are exactly «Tarix · Malın adı · Ölçü · Kateqoriya · Anbar · Status · Kod · (actions)»; no column is right-aligned and rows are NOT clickable (`tbl()` called without `clk`) | 2519-2521, 2539 | — | `CODE VERIFIED` |
| M12-31 | «Tarix» cell is `fmtD()` of the ISO date derived from `ts`, i.e. `new Date(ts).toISOString().slice(0,10)` → `DD.MM.YYYY`; a row with `ts = 0` therefore renders the epoch date `01.01.1970`, not an em-dash | 2531, 602 | — | `CODE VERIFIED` |
| M12-32 | «Malın adı» cell stacks: the name in a `.nm` div; then, when `note` is non-empty, the note in a `.hint` span; then, ONLY when `status === 'rejected'` AND `reason` is non-empty, «Səbəb: {reason}» in a `.hint` div coloured `var(--alarm)` | 2532-2533 | — | `CODE VERIFIED` |
| M12-33 | A rejection reason is shown ONLY on a rejected row: a cancelled request that carries a `decision_reason` does not display it. Legacy fact, and it matters because `cancel_item_request` can store a reason | 2533 | 472-475 | `CODE VERIFIED` |
| M12-34 | «Ölçü» and «Kateqoriya» cells render the value or `—` when empty | 2534 | — | `CODE VERIFIED` |
| M12-35 | «Anbar» cell renders `w` RAW or `—`; `whLabel()` is deliberately NOT applied here, unlike the movements and balances screens | 2534, 593 | — | `CODE VERIFIED` |
| M12-36 | «Status» cell renders the exact tag markup per status: `pending` → `<span class="tag t-op">Gözləyir</span>`; `approved` → `t-in` «Təsdiqlənib»; `rejected` → `t-rm` «Rədd edilib»; `cancelled` → bare `tag` «Ləğv edilib»; an unknown status falls back to the escaped raw status text with no tag | 2471-2476, 2535 | — | `CODE VERIFIED` |
| M12-37 | «Kod» cell renders the code in a `.code` span, or a `.muted` em-dash when absent; a pending request never has one | 2536 | 87-88 | `CODE VERIFIED` |
| M12-38 | Empty-table text depends on the active filter: «Gözləyən sorğu yoxdur.» when the `pending` segment is active, «Sorğu tapılmadı.» otherwise, both inside the legacy `tbl()` empty block whose bold lead is «Məlumat yoxdur» | 2539, 1411 | — | `CODE VERIFIED` |
| M12-39 | Footer note reads `nf(rows.length) + ' sorğu'`, with « · yalnız sizin yaratdığınız sorğular göstərilir» appended ONLY for an anbardar; the count is the FILTERED row count, not the total | 2541-2543 | — | `CODE VERIFIED` |
| M12-40 | «Nəzərdən keçir» action button appears only when the viewer is admin AND the row is `pending`; it is the first action in the cell | 2524-2526 | — | `CODE VERIFIED` |
| M12-41 | «Geri götür» action button appears when the row is `pending` AND (the viewer is admin OR the viewer is an anbardar whose id equals the row's `by`); it follows «Nəzərdən keçir» when both are present | 2527-2529 | 465-467 | `CODE VERIFIED` |
| M12-42 | A decided row (`approved`, `rejected`, `cancelled`) offers NO action to any role | 2524-2529 | 331-333, 423-425, 468-470 | `CODE VERIFIED` |
| M12-43 | The author comparison uses the authenticated user's id against `created_by`; an anbardar sees no «Geri götür» on another anbardar's row. Under RLS an anbardar cannot normally see such a row at all, so this is a defence-in-depth affordance rather than the operative filter | 2527 | policy 124-129 | `CODE VERIFIED` |
| M12-50 | The create dialog opens only for an anbardar; a non-anbardar reaching `nreqCreateDialog()` gets the exact refusal toast «Nomenklatura sorğusunu yalnız anbardar yarada bilər» and no dialog | 2568-2569 | 223-225 | `CODE VERIFIED` |
| M12-51 | Dialog title «Yeni nomenklatura sorğusu»; it opens with a fixed explanatory block stating that no item is created until approval, then the name field, the similarity area, a two-column unit/category row, and the note field | 2573-2587 | — | `CODE VERIFIED` |
| M12-52 | Unit and category selects are built from the SHARED active reference options (`unitOptions()` / `categoryOptions()`), each with a leading «Seçilməyib» empty option; no second definition of those helpers is introduced | 2572, 2582-2584 | 243-256 | `CODE VERIFIED` |
| M12-53 | `nreqNorm()` is the browser duplicate key: NFKC → trim → lower-case → remove every run of whitespace and the punctuation class `/ . , " ' ` ’ ( ) - – —`; it is an early warning only and mirrors the server's `item_request_norm()` | 2477-2483 | 54-57 | `CODE VERIFIED` |
| M12-54 | `nreqSimilar()` returns nothing when the normalised name is shorter than 2 characters; otherwise it matches an item or pending request whose normalised name is equal, or contains the query when the query is ≥ 4 chars, or is contained by the query when that name is ≥ 4 chars; each list is capped at 10 | 2555-2567 | 162-187 | `CODE VERIFIED` |
| M12-55 | `nreqSimilar()` scans `items` plus ONLY `pending` requests; approved, rejected and cancelled requests never appear as similar candidates | 2561 | 182 | `CODE VERIFIED` |
| M12-56 | Live validation is debounced 160 ms and produces exactly one of four states, in this precedence order: a non-empty name shorter than 3 chars → «Ad ən azı 3 simvol olmalıdır.»; an exact item match → the blocking «Bu mal nomenklaturada artıq var» block naming the item and its code; an exact pending-request match → the blocking «Bu ad üzrə gözləyən sorğu artıq var» block; otherwise, when any similar item or request exists → the non-blocking «Oxşar adlar tapıldı» list stating that Admin decides | 2590-2610 | — | `CODE VERIFIED` |
| M12-57 | An empty name produces NO message at all — the `nm.length &&` guard means the first branch needs a non-empty value; this is distinct from the 1-2 character case | 2594 | — | `CODE VERIFIED` |
| M12-58 | The submit button is disabled unless `name.length >= 3 && !exact && !exactReq`; a merely SIMILAR name leaves it enabled. Boundary: exactly 3 characters is allowed | 2608 | CHECK 68, 234-236 | `CODE VERIFIED` |
| M12-59 | On submit the client calls `request_new_item` with exactly `p_name` (trimmed), `p_unit`, `p_category`, `p_note` (trimmed), each empty value sent as `null`; it sends no creator, no warehouse and no status — the signature accepts none | 2611-2621 | 200-205, 273-276 | `CODE VERIFIED` |
| M12-60 | A second guard re-checks `nm.length < 3` at submit time and returns without a call; the button is then re-disabled for the duration of the in-flight request | 2612-2614 | — | `CODE VERIFIED` |
| M12-61 | On success the dialog closes, the data reloads, the page navigates to `nreq`, and the toast «Sorğu göndərildi — Admin təsdiqini gözləyir» is shown | 2622-2626 | — | `CODE VERIFIED` |
| M12-62 | On failure the dialog STAYS OPEN with the user's input intact, the button is re-enabled, and the toast «Sorğu göndərilmədi: » plus the server message (or «server xətası») is shown | 2627-2630 | — | `CODE VERIFIED` |
| M12-70 | The review dialog refuses a non-admin with «Sorğunu yalnız Admin nəzərdən keçirə bilə… bilər» and a non-pending row with «Sorğu artıq qapanıb», each before any dialog is rendered; it returns silently for a missing row | 2633-2636 | 317-319, 331-333 | `CODE VERIFIED` |
| M12-71 | Dialog title «Sorğunu nəzərdən keçir»; header line shows the raw warehouse or `—`, the formatted date, and « · qeyd: {note}» when a note exists | 2645-2648 | — | `CODE VERIFIED` |
| M12-72 | The similar block shows existing matching ITEMS only; when `items` is empty but requests matched, it still renders the «Oxşar mövcud mallar» heading with a single `.muted` «yoxdur» entry; with neither it renders «Oxşar mövcud mal tapılmadı.» | 2638-2644 | — | `CODE VERIFIED` |
| M12-73 | The name field is pre-filled with the request's name and is editable before approval; the unit and category selects pre-select the requested values, and the unit's empty option reads «Seçilməyib (ədəd)», naming the server default | 2650-2657 | 339-340 | `CODE VERIFIED` |
| M12-74 | A rejection-reason field is present in the same dialog, labelled as mandatory for rejection only | 2658-2659 | 417-418 | `CODE VERIFIED` |
| M12-75 | Footer holds «Rədd et» (danger, left), a spacer, «Bağla» and «Təsdiqlə və mal yarat» (primary, right); a closing hint states that approval creates the item, assigns the next 7-digit code and is atomic | 2660-2662 | 361-379 | `CODE VERIFIED` |
| M12-76 | Approval sends `approve_item_request` with `p_request_id`, `p_name` (trimmed), `p_unit`, `p_category`, empties as `null`; a client-side guard first refuses a name shorter than 3 chars with «Ad ən azı 3 simvol olmalıdır» and makes no call | 2668-2677 | 300-305 | `CODE VERIFIED` |
| M12-77 | On approval success the dialog closes, data reloads and the toast names the new code: «Təsdiqləndi — yeni mal kodu: {code}», or «Sorğu artıq təsdiqlənib — kod: {code}» when the server reports `already_approved`; a missing code prints `—` | 2678-2681 | 326-330, 395-397 | `CODE VERIFIED` |
| M12-78 | Approval is idempotent at the server: a repeated approval of an approved request returns the existing code, creates no second item and reports `already_approved: true` with `created_item: false` | — | 325-330 | `NOT STARTED` |
| M12-79 | Rejection requires a non-empty trimmed reason; the client refuses with «Rədd səbəbi tələb olunur» and makes no call, and the server independently enforces the same rule plus a table CHECK constraint | 2687-2689 | 417-418, 89-90 | `CODE VERIFIED` |
| M12-80 | Rejection sends `reject_item_request` with `p_request_id` and `p_reason`; on success the dialog closes, data reloads and the toast «Sorğu rədd edildi» is shown | 2690-2694 | 404-407 | `CODE VERIFIED` |
| M12-81 | Either decision failing keeps the dialog open, re-enables that button and toasts «Təsdiqlənmədi: » or «Rədd edilmədi: » plus the server message | 2682-2685, 2695-2698 | — | `CODE VERIFIED` |
| M12-82 | Browser withdrawal calls `cancel_item_request` with `p_request_id` and `p_reason: null`; `nreqCancel()` returns silently BEFORE any RPC for a missing or non-pending row, and on success reloads and toasts «Sorğu geri götürüldü», else «Ləğv edilmədi: » plus the message. Legacy shows NO confirmation prompt. This early-return evidence does not satisfy the server refusals in M12-92: a directly invoked RPC raises for missing/closed rows | 2701-2711 | 447-450 | `CODE VERIFIED` |
| M12-90 | Every write goes through an RPC; the client never INSERTs, UPDATEs or DELETEs `item_requests` directly, and the table carries a SELECT-only policy with SELECT-only grant, so a direct PostgREST write is refused for every role including admin | 540-543 | 111-132 | `CODE VERIFIED` |
| M12-91 | Server-authoritative role gate, proven by refusal: `request_new_item` is anbardar-only; `approve_item_request` and `reject_item_request` are active-admin-only; `cancel_item_request` allows admin or the pending row's own author. Each must be observed as a server refusal, never inferred from a hidden button | 2484, 2524-2529 | 223-225, 317-319, 413-415, 465-467 | `NOT STARTED` |
| M12-92 | Guard ORDER inside `request_new_item`, each refusal distinct and attributed to the FIRST guard reached: no session → no active profile → not anbardar → no warehouse assigned → name shorter than 3 → inactive category → inactive unit → exact item duplicate → existing pending duplicate | — | 217-271 | `NOT STARTED` |
| M12-93 | A pending request is structurally invisible to the item pipeline: it is a row in a separate table, holds no code, and never merges into the items collection, so it cannot reach balances, movements, exports, reports or item search | 884-903 | 18-25 | `CODE VERIFIED` |
| M12-94 | Approval atomicity and code allocation: one transaction allocates `MAX(code)+1` over `code ~ '^[0-9]{1,7}$'`, LPADs to 7, refuses above 9999999, INSERTs the item and marks the request approved — all under advisory lock 424242, the same key the bulk importer uses, so an import and an approval can never hand out the same code | — | 361-385 | `NOT STARTED` |
| M12-95 | Concurrency: two anbardars proposing the same normalised name cannot both succeed — the partial unique index on `name_norm WHERE status='pending'` decides the race and the `unique_violation` handler translates it to «Bu ad üzrə gözləyən sorğu artıq mövcuddur». After a rejection the same name may be proposed again | — | 103-104, 286-288 | `NOT STARTED` |
| M12-96 | Every write is recorded in `audit_log` by the server with the request id and a reason: «Nomenklatura sorğusu yaradıldı», «… təsdiqləndi», «… rədd edildi: {reason}», «… ləğv edildi». No request row is ever physically deleted; only its status changes | — | 278-282, 387-393, 432-436, 477-481 | `NOT STARTED` |
| M12-97 | The localhost write guard covers all four request writes with their own action names, so a stray local write is blocked unless the developer explicitly opts in | — | precedent `mutationGuard.ts` | `CODE VERIFIED` |
| M12-98 | Live evidence boundary, stated not hidden: exercising the admin approval and rejection legs, and the anbardar creation leg, requires TEST identities for both roles plus a TEST write window. Until both exist the server-authoritative rows stay unpromoted and are never satisfied by UI observation | — | — | `IN PROGRESS` |

## Authoritative tally

Derived mechanically from the `| M12-* |` rows above; never copied forward.

| Status | Rows |
|---|---|
| `CODE VERIFIED` | **61** |
| `NOT STARTED` | **6** |
| `LIVE VERIFIED` | **0** |
| `IN PROGRESS` | **3** |
| `BLOCKED` | **0** |
| unclassified | **0** |
| **total unique** | **70** |

Row groups, summing to the 70 total: shell/route/role 7 (M12-01…07),
snapshot/store/realtime 8 (M12-10…17), filters 6 (M12-20…25), table 10
(M12-30…39), row actions 4 (M12-40…43), create dialog 13 (M12-50…62), review
and withdraw 13 (M12-70…82), safety/server/evidence 9 (M12-90…98). Every
range in this paragraph is slice SCOPE, not a status claim.

Statuses do NOT follow those ranges. Expanded explicitly (protocol §16):
**`IN PROGRESS` — M12-04, M12-24, M12-98.** M12-04's `go()` refusal has no
live leg; M12-24's 200 ms debounce is implemented and page-tested but its
timing boundary was never live-asserted; M12-98 is the evidence boundary
itself and stays open while no TEST identity exists.
**`NOT STARTED` — M12-78, M12-91, M12-92, M12-94, M12-95, M12-96.** Each
needs a SERVER refusal or the deferred D-M2 write window: idempotent
re-approval (78), the role gates proven by refusal (91), the first-refusing
guard order (92), atomic code allocation (94), the concurrent duplicate race
(95) and the `audit_log` read-back (96). A browser observation can never
satisfy them (protocol §5, §7).
Every other row is `CODE VERIFIED` on unit/source evidence only.
