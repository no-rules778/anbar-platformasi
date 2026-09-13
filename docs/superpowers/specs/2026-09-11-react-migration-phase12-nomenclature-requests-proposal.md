# Phase 12 draft proposal — «Nomenklatura sorğuları» (legacy `rNreq()`)

Date: 2026-09-11  
Status: **SUPERSEDED AS A STATUS LINE — 2026-09-11.** This began as a design
draft; the owner then accepted D-M1 and D-M3…D-M6 and Phase 12 was implemented
(61 `CODE VERIFIED`, 3 `IN PROGRESS`, 6 `NOT STARTED` of 70). The design
CONTENT below still stands; only the "no implementation authorised" status is
HISTORY. D-M2 remains deferred, so the write rows stay unpromoted. Phase 12 is
**NOT ACCEPTED** pending Codex's independent audit.
[Implementation audit](../audits/2026-09-11-phase12-implementation.md)  
[Ledger (70 rows)](./2026-09-11-phase12-registry-rows.md) ·
[TEST-only plan](../plans/2026-09-11-react-migration-phase12-nomenclature-requests.md) ·
[Design handoff audit](../audits/2026-09-11-phase12-design-handoff.md) ·
[Roadmap](../plans/2026-09-10-post-phase9-migration-roadmap.md)

## 1. Scope and dependency

Phase 12 follows the independently accepted Phases 9, 10 and 11 and covers
only the legacy page `nreq`: the rail entry (`index.html:257`), the page shell
(`346-350`), the renderer `rNreq()` (`2485-2551`), the helpers it calls
directly — `nreqNorm()` (`2480-2483`), `nreqCanCreate()` (`2484`),
`nreqSimilar()` (`2555-2567`), `nreqCreateDialog()` (`2568-2632`),
`nreqReviewDialog()` (`2633-2700`), `nreqCancel()` (`2701-2711`) — the
`DB.itemReqs` loader (`889-903`), the nav gate (`7506`) and the `go()` guard
(`1499`).

Its server contract is `sql/017_nomenclature_requests.sql`, **applied and
confirmed live 2026-08-23**, plus `sql/018_import_new_items_admin_only.sql`,
which closes the direct item-creation bypass. Phase 12 changes neither: it is
a UI migration onto an existing, already-audited server contract. **No SQL
change is proposed and none is required.**

Out of scope: «Nomenklatura» itself (`rNom()`, migrated in Phase 5), the rail
pending-counter badge (Phase 18 shell work, D-M5), and any export or print —
the page has neither.

Everything below was read from primary sources in this session: the legacy
page and helpers, and `sql/017` in full. Line numbers refer to
`platform/index.html` and `sql/017_nomenclature_requests.sql` as of
2026-09-11.

## 2. Verified legacy contract

### 2.1 Why this phase is different

Earlier phases already included controlled write paths. **Phase 12 is the
migration's first multi-role approval workflow**, and the first where the same screen shows
different *actions* to different roles against the same row. Three facts
follow, and they shape every row in the ledger:

1. **The browser is not the authority.** Every button on this page has a
   server-side counterpart in `sql/017` that re-checks the same rule. The
   ledger keeps them as separate rows (M12-07 vs M12-91, M12-40/41 vs
   M12-91) so a hidden button can never be recorded as a permission
   (protocol §5, §7).
2. **A pending request is not an item.** It lives in its own table, holds no
   code, and is structurally unable to reach balances, movements, exports,
   reports or item search (M12-93; `sql/017` header 18-25). The React port
   must preserve that separation — the requests must never be merged into the
   items collection.
3. **Writes are RPC-only.** `item_requests` carries a SELECT policy and a
   SELECT grant and nothing else, so a direct PostgREST write is refused for
   every role including admin (M12-90; `sql/017:111-132`).

### 2.2 Route, rail, role

- `<a data-p="nreq" id="nav-nreq" style="display:none">` is the LAST entry of
  the «Bazalar» group (257). Unlike the Phase 9-11 entries it carries **both**
  an id and a `display:none`, and is revealed by
  `isAdmin() || isAnbardar() || isRehber()` (7506).
- `go()` refuses the page for anything else (1499).
- Because `effectiveRole()` maps every legacy role to one of those three
  (641-642), the practical effect is that **every user with a resolvable
  effective role sees the entry** — including the legacy `techizat`,
  `muhasib` and `baxis` values. The gate is real but excludes nobody in the
  current role model (M12-03). This is worth stating plainly rather than
  describing the entry as "role-gated" and leaving the reader to assume some
  role is excluded.

### 2.3 Data sources

`rNreq()` reads `DB.itemReqs`, loaded by a dedicated legacy block
(889-903) that is deliberately fault-tolerant: if `item_requests` does not
exist the legacy list stays empty and the rest of the platform keeps working
(M12-11). The React port deliberately does not turn a failed read into a
successful empty snapshot: under the accepted atomic/retention model
(M12-13/14), either failure shape produces `ok:false`; an existing snapshot
is retained, and an initial failure shows the page-level load error. The
create and review dialogs additionally read `DB.items` for the duplicate and
similarity warnings, and the shared `unitOptions()` / `categoryOptions()`.

The loader's field mapping is not cosmetic — it renames almost every column
(`created_by`→`by`, `created_warehouse`→`w`, `created_at`→`ts` as epoch ms,
`decision_reason`→`reason`, `item_code`→`code`) and defaults each empty value
(894-901). M12-12 pins it exactly, because the React types must mirror the
same view model or every downstream row shifts.

RLS does the row filtering, and the three visibility rules differ
(`sql/017:124-129`): admin sees every request, rehber sees every request
read-only, an anbardar sees **only rows they created**. The client sends no
filter of its own (M12-10).

The create/review dialogs also consume the globally loaded unit/category
reference values. The React page therefore performs one dedicated
`get_reference_values` read alongside `item_requests` and `items`; it MUST
NOT mount the whole Soraqçalar store, which would introduce unrelated
warehouses, partners, Sərfiyyat and usage reads. Reference readiness is
non-fatal under the accepted A14 fallback rule.

### 2.4 Filters

`NREQ = { q: '', status: 'pending' }` (2470) — a long-lived module object, so
in React it belongs in the store, not the component (M12-17).

Four status segments in fixed order: «Gözləyən», «Təsdiqlənən», «Rədd edilən»,
«Hamısı» (2489-2494). **There is deliberately no «Ləğv edilən» segment** — a
withdrawn request is reachable only through «Hamısı» (M12-21). The search box
is debounced 200 ms and matches `name + unit + category + code`; the note and
warehouse are *not* searchable (M12-23, M12-24). The two filters AND together
and there is no paging on this screen, unlike Nomenklatura (M12-25).

### 2.5 The table

Eight columns, none right-aligned, rows **not** clickable (2519-2521, 2539 —
`tbl()` is called without `clk`, so there is no item-card handoff here).

Cells worth pinning individually:

| Cell | Contract | Row |
|---|---|---|
| Tarix | `fmtD()` of `new Date(ts).toISOString().slice(0,10)`; a `ts` of 0 renders `01.01.1970`, not `—` | M12-31 |
| Malın adı | name in `.nm`, then the note as a `.hint`, then — only when rejected AND a reason exists — «Səbəb: …» in `var(--alarm)` | M12-32, M12-33 |
| Anbar | the raw stored name or `—`; `whLabel()` is **not** applied here, unlike movements and balances | M12-35 |
| Status | four exact tag markups; an unknown status falls back to escaped raw text with no tag | M12-36 |
| Kod | `.code` span, or a `.muted` em-dash; a pending request never has one | M12-37 |

The empty-table text depends on the active filter — «Gözləyən sorğu yoxdur.»
under the pending segment, «Sorğu tapılmadı.» otherwise (M12-38) — and the
footer count is the **filtered** count, with an anbardar-only suffix
explaining that only their own requests are listed (M12-39).

### 2.6 Row actions

- «Nəzərdən keçir» — admin AND `pending` only (M12-40).
- «Geri götür» — `pending` AND (admin OR the author) (M12-41).
- A decided row offers nothing to anyone (M12-42).

### 2.7 Create dialog (anbardar)

Guarded by `nreqCanCreate()` — anbardar only, **not** admin (2484, 2569):
an admin creates items directly through Nomenklatura and has no reason to
file a request, and the server enforces the same rule (`017:223-225`).

Live validation is debounced 160 ms with a strict precedence (M12-56): too
short → exact item match → exact pending match → similar list. The first
three block; the fourth explicitly does not, and says «qərarı Admin verir».
The submit button needs `length >= 3 && !exact && !exactReq` (M12-58) — a
merely similar name stays submittable, which is the whole point of the
distinction.

The call sends exactly four parameters and **no creator, warehouse or status**
(M12-59) — the RPC signature accepts none, so a client cannot file for
another warehouse or pre-set a decision (`017:194-198`). On failure the
dialog stays open with the input intact (M12-62), the same rule
`ItemFormDialog` already follows.

### 2.8 Review dialog (admin)

Refuses a non-admin and a non-pending row before rendering (M12-70). Shows
similar existing items, lets the admin correct name, unit and category before
approving (M12-73), and carries a mandatory-on-rejection reason field
(M12-74).

Approval is the consequential action: one transaction allocates the next
7-digit code under advisory lock **424242** — the same key the bulk importer
uses, so an import and an approval can never collide — inserts the item and
marks the request approved (M12-94; `017:361-385`). It is idempotent: a
repeated approval returns the existing code and creates nothing (M12-78).

Rejection requires a reason at three independent layers: the client, the RPC,
and a table CHECK constraint (M12-79).

### 2.9 Withdrawal

The browser helper `nreqCancel()` calls `cancel_item_request` with a null
reason and returns silently before the RPC for a missing or non-pending row;
**there is no confirmation prompt** in legacy (M12-82). The server itself is
not silent when invoked directly: it raises «Sorğu tapılmadı» for a missing
id and «Sorğu artıq qapanıb …» for a non-pending row. Those server refusals
belong to M12-92 and may not be satisfied by the client-side early return.
Whether to add a confirmation is D-M6.

### 2.10 Server guard order

`request_new_item` refuses in a fixed order (M12-92; `017:217-271`): no
session → no active profile → not anbardar → no warehouse → name < 3 →
inactive category → inactive unit → duplicate item → duplicate pending. Every
refusal test must name the **first** guard reached; attributing a refusal to a
later guard is the §5 defect this ledger is written to prevent.

### 2.11 Deliberately not ledger rows

The rail pending-counter `#c-nreq` (2548-2550) is shell state shared with
Phase 18 (D-M5); `item_request_candidates()` server-side similarity is
unused by the legacy browser path (D-M3); the page has no print or export.

## 3. Reuse boundary

Everything this page needs already exists and is accepted:

| Need | Existing accepted primitive |
|---|---|
| Role predicates | `lib/roles.ts` — `isAdmin`/`isAnbardar`/`isRehber`, `effectiveRole` |
| Formatting | `lib/format.ts` — `nf`, `fmtD` |
| Table / dialog / buttons | `components/ui/{Table,Dialog,Button,Input}` |
| Unit and category options | `api/referenceValues.api.ts` + the `refsReady` fallback rule (A14) |
| Items read | `api/items.api.ts` |
| Snapshot + retention + stale ordering | `warehouseOverview` / `dashboard` store precedent |
| Realtime | `hooks/useRealtimeRefresh.ts` |
| Localhost write guard | `lib/mutationGuard.ts` (extended with four action names, M12-97) |
| Generated types | `item_requests` row type and all four RPCs are **already** in `types/database.ts` — no type addition needed |

New code is therefore one pure module, one API module, one store, one page
and two dialog components. **No accepted module's file is modified**, with the
single exception of the additive `GuardedAction` union in `mutationGuard.ts`
and the rail/route entry in `App.tsx`.

## 4. Proposed React structure

```
lib/nomenclatureRequests.ts     nreqNorm, nreqSimilar, filtering, status tags
api/itemRequests.api.ts         fetchItemRequests + the four RPC wrappers
store/itemRequests.store.ts     snapshot, filters, retention, stale ordering
pages/ItemRequestsPage.tsx      shell, subtitle, segments, table, actions
components/item-requests/RequestCreateDialog.tsx
components/item-requests/RequestReviewDialog.tsx
```

## 5. Accepted deviations carried forward

Worded as deviations, not parity, exactly as Phases 8-11 did: atomic snapshot
(M12-13), first-load error block and failed-refresh retention (M12-14),
stale-response discarding (M12-15). Legacy renders partial data after a
per-table toast; these are Phase 8-11 precedents.

## 6. Owner decisions (each with a recommendation)

| Id | Question | Recommendation |
|---|---|---|
| D-M1 | Rail placement — legacy puts «Nomenklatura sorğuları» last in «Bazalar» (257), after «Soraqçalar», which is admin-only and therefore invisible to the anbardar who uses this page most | Keep legacy order. Placement is parity; a usability change belongs to the Phase 18 shell review, not to a module migration |
| D-M2 | Whether Phase 12 may write to TEST at all. Persisted/server-live evidence for M12-59, M12-61, M12-62, M12-76…M12-82, M12-91, M12-92, M12-95 and M12-96 requires a real write/refusal window; structural M12-93 and source/unit portions of M12-94 do not | Authorise a **narrow TEST-only write window with immutable-history accounting**: create then withdraw and create then reject are item-catalogue-neutral but NOT database-net-zero because the decided request and audit rows remain; approval permanently creates an item and consumes a code and is not reversible. Without this explicit residual-data acceptance, run read-only/code verification and leave the live/persisted clauses unpromoted |
| D-M3 | Port `item_request_candidates()` so an anbardar is warned about another anbardar's pending request their RLS hides | Defer. Legacy's browser path does not call it; adding it is an improvement, not parity. Raise as a Phase 18 follow-up |
| D-M4 | Realtime table set — legacy's fixed list (1174) does not include `item_requests`, so a new request does not appear until a manual reload | Subscribe to `item_requests` and `items` (M12-16). Recorded as an improvement, not parity |
| D-M5 | The rail pending-counter badge `#c-nreq` (2548-2550) | Defer to Phase 18 with the other rail counters, as Phase 11 did |
| D-M6 | «Geri götür» has no confirmation prompt in legacy | Keep legacy behaviour. The action is reversible in effect (the same name may be proposed again) and adding a prompt is a UX change |

## 7. Optional improvements, explicitly not proposed for this phase

The epoch-date rendering of a null `created_at` (M12-31), the absent
«Ləğv edilən» segment (M12-21), the unsearchable note (M12-23), and the raw
warehouse name (M12-35) are all legacy behaviours the port reproduces. They
are listed here so a future reviewer can see they were noticed and kept
deliberately, not missed.

## 8. Known CSS gap (source-verified this session)

`web/src/index.css` contains **no** `.t-op`, `.t-mv`, `.t-out`, `.seg` or
`td.nm` rule (`grep -c` → 0 for each). The status tags this page depends on
are therefore partly unstyled today: «Gözləyir» uses `t-op` and would render
without its steel background, and the filter segment control has no styling
at all. Legacy defines them at `index.html:81, 84-87, 115-118`.

This is the same class of finding as Phase 11's D-L5 and the recommendation
is the same: port those five rules verbatim as part of the implementation
task, not as a separate phase. It is folded into the plan's T4 rather than
raised as a sixth decision, because the D-L5 precedent already settled how
such a gap is handled.
