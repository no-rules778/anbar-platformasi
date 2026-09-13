# Phase 11 TEST-only implementation plan — Module L («İdarə paneli»)

Status: **EXECUTED — 2026-09-11.** The owner approved D-L1…D-L5
([decision](../decisions/2026-09-11-phase11-design-scope.md)) and the
[design audit](../audits/2026-09-11-phase11-design-codex-audit.md) passed, so
T1-T4 ran as one block. Phase 11 remains `NOT ACCEPTED` pending Codex's final
independent audit; evidence in
[the implementation/live audit](../audits/2026-09-11-phase11-implementation-live-check.md).  
[Proposal](../specs/2026-09-11-react-migration-phase11-dashboard-proposal.md) ·
[Ledger (55 rows)](../specs/2026-09-11-phase11-registry-rows.md) ·
[Handoff audit](../audits/2026-09-11-phase11-design-handoff.md)

## T0 — design closure (external)

1. Codex independent design audit of proposal, ledger and this plan against
   `index.html:250-251, 277-292, 592-602, 855-871, 933-946, 990, 1163-1181,
   1249-1320, 1361-1364, 1368-1418, 1534-1589, 1851-1858, 6996-7031, 7523`.
2. Owner decisions D-L1 (landing page), D-L2 (exports), D-L3 (alerts card /
   drill-down), D-L4 (selector rebuild), D-L5 (stylesheet).
3. Reconcile the row count: if D-L2 brings an export forward, add rows and
   re-derive the total; if D-L3 defers the card, rows M11-50…M11-62 move to a
   Phase 15 ledger and the total is re-derived. No row is promoted by T0.

## T1 — pure derivations (`lib/`), tests first

`lib/dashboard.ts` + `lib/dashboard.test.ts`:

- `scopeByWarehouse(bal, operational, w)` — M11-20; boundary matrix on
  `abs(q)`: `1e-9` out, `1.1e-9` in, `−0.5` in, `0` out; `w = ''` returns the
  same arrays by identity.
- `dashboardKpis(scope, items)` — M11-21…M11-25; matrix: Σin = 0 → sub
  `0% dövriyyə` (negative control: `0.0%` fails); Σin > 0 → `toFixed(1)` with
  dot; purchase price fallback movement → item → 0, including movement price
  `0`/`null` → item price, with a separate negative-price control proving a
  negative movement price is truthy and does NOT fall back; priceless count
  excludes zero-quantity rows; `money(0)` → `—`; class `r`/`g` flip at count
  0/1.
- `warehouseValueBars(warehouses, bal)` — M11-30; selector NOT applied
  (positive control: a scoped call and an unscoped call give identical bars);
  `Math.round` at `.5`; sort desc; a warehouse with no balance rows → `0`,
  `0 mövqe`.
- `movementTypeCounts(scopeMovs)` — M11-33; colour map, fallback colour for
  `Satış`, sort desc, empty → `[]`.
- `topPositions(pos)` — M11-40; 11 rows → 10, order, fewer → all.
- `recentMovements(scopeMovs)` — M11-42; `created_at` DESC before date DESC;
  invalid `created_at` sorts as 0 (falls to date); 11 → 10.
- `dashboardSubtitle(w, allOperational, scopeMovs)` — M11-04; `last` from ALL
  rows while the count is scoped (positive control: scoped count ≠ global
  count, `last` unchanged); no rows → `—`; `w` printed raw.

`lib/controlIssues.ts` + `lib/controlIssues.test.ts` — M11-51…M11-61, one
positive, one negative and the equality boundary per rule:

| Rule | Positive | Negative | Boundary |
|---|---|---|---|
| neg | `q = −1` | `q = 0` | `−1e-9` excluded, `−1.1e-9` included |
| nop | position `q = 2, price 0` | `price 5` | `q = 0, price 0` NOT counted |
| doc | Satınalma, no invoice, no contract | invoice only; contract only | non-Satınalma ignored |
| voen | partner «X», not internal, partner record without VÖEN | partner with VÖEN; partner in internal set (location, warehouse, each of the six literals) | empty partner ignored |
| orph | code absent from items | code present | — |
| tr | outbound transfer, partner «Ələt anbarına», no inbound in Ələt | matching inbound same code/qty | qty diff `1e-6` unpaired, `0.9e-6` paired; partner matching no warehouse → unpaired; prefix order uses the FIRST configured warehouse |
| lag | pair dated 4 days apart | 3 days apart | exactly 3 excluded; missing date → 0 |
| dup | «Boru 20mm» / «boru-20 mm» | distinct names | count = groups (3 items sharing one key → 1) |
| fut | `today + 1` | `today` | today excluded |
| wo | `out 10 × item price 51 = 510` | `500` exactly | movement price 1000 with item price 0 → NOT counted |

Group order and omission of empty groups are asserted on a mixed fixture
(M11-51). `today` is injected so tests are date-stable.

`lib/format.ts`, `lib/itemIndex.ts`, `lib/operationalMovements.ts`,
`lib/movementRoute.ts`, `lib/recorderLabel.ts` are NOT modified (M11-16/17/70).

## T2 — snapshot and store, tests first

`api/dashboardSnapshot.api.ts` + test — M11-10, M11-11:

- exactly four readers called once each (`fetchItemMovements`, `fetchItems`,
  `fetchWarehouses`, `fetchPartners`), raw rows passed through;
- each reader's returned-error AND rejection shape → `ok:false`, no snapshot;
- if D-L3 defers the card, `fetchPartners` is absent and the test asserts
  exactly three.

`store/dashboard.store.ts` + test — M11-06, M11-12, M11-15, M11-16, M11-17:

- atomic apply; `indexes = buildItemIndexes(items, movements)` (unbalanced
  cancelled-pair fixture leaves only the operational row);
- first failure → `error`, `loaded = false`, nothing applied;
- failed refresh → previous `movements/items/locations/partners/indexes`
  retained by identity, `loaded` untouched, `error` set; success clears;
- stale success and stale failure discarded (ticket ordering);
- `warehouse` filter persists across a simulated unmount/remount (the store
  is module-level); D-L4: `setWarehouse` keeps a still-valid value after a
  reload and resets when the name disappears.

## T3 — React surface, tests first

`components/dashboard/BarChart.tsx` / `Donut.tsx` + tests — M11-31, M11-34,
M11-35: class names, inline widths (`0.0%`, `100.0%`, `33.3%`), `title`
attributes, path count = type count, `<title>` texts, legend rows, empty
renders. Path `d` strings are compared against values computed by the
legacy formula in the test (positive control), and a wrong start angle is a
negative control.

`pages/DashboardPage.tsx` + test (store and hook mocked, REAL `ItemCard`):

- heading/subtitle text (M11-04); selector options and raw values (M11-05);
- five KPIs with exact labels, values, subs and classes on a fixture that
  exercises Σin = 0 and Σin > 0 (M11-21…M11-26);
- bar chart ignores the selector; donut follows it (M11-30, M11-33);
- both tables: headers, `th.r`, cells, `clk`, empty block, 10-row cap
  (M11-40…M11-43, M11-73, M11-74); the recorder hint uses `recorderLabel`
  with an injected directory map (all four branches);
- «Hamısı» → `onOpenMovements` (M11-44); row click opens `ItemCard`, its
  buttons reach `onOpenOperation` / `onEditItem`, close works (M11-45);
- alerts: hint on no groups; pills with `dgr` on high, `title — count`;
  D-L3 inert click with `title` (M11-50, M11-62);
- `useRealtimeRefresh(true, ['movements','items','partners','warehouses'],
  fn)` with no debounce override; a successful realtime reload shows the
  toast, a first load does not (M11-13, M11-14);
- loading / first-error / refresh-error / retained surfaces (M11-12).

`App.tsx` + `App.nav.test.ts` / `App.test.tsx` — M11-01…M11-03: first entry
of the group, present for all three roles, single active entry, default
landing per D-L1, «Hamısı» switches to `mov`, card handoffs on the real
stores.

`index.css` — D-L5 verbatim port; assert by source comparison only (no
computed-style test); Phase 9/10 suites re-run unchanged.

## T4 — verification

- During work: focused lib/api/store/page/App tests.
- Final gate once: full suite, `tsc -b --noEmit`, `oxlint src`,
  `vite build --mode sandbox`, `git diff --check`, staging empty,
  `git status` shows no diff in the Phase 9/10 files named in the proposal §3.
- One read-only TEST browser sweep on the sandbox dev server (port 5175 —
  inspect and reuse an existing server; `VITE_ALLOW_LOCAL_WRITES=false`;
  hard production abort; blanket mutation intercept) as the anbardar:
  request set (M11-10), rail position and single active state (M11-01),
  landing page (M11-03), subtitle, selector, KPI values reconciled to the
  Phase 9 balances page on the same data, both charts' DOM, both tables,
  alerts card, «Hamısı», `ItemCard`, retention under injected 503 and
  network abort with recovery (M11-12), zero writes (M11-90). Admin/rehber
  legs only if a TEST identity is supplied as a process-only variable
  (M11-91); otherwise recorded as a boundary.
- Harness validity (protocol §8): StrictMode double requests counted as one
  generation; sampling after the debounce; locale expectations computed in
  the browser; no application helper imported by the harness.
- No live write window is planned or authorised.

## T5 — acceptance

- Update ledger, proposal, registry banner, next-prompt banner and handoff
  once after the coherent block; derive the tally mechanically from the
  `| M11-* |` rows; read back each summary location.
- Promote only exact exercised contracts; keep evidence classes distinct.
- Independent Codex audit is required before Phase 11 can be `ACCEPTED`.

## Hard constraints

TEST `alkjjbaawmsirsfvqljm` only; sandbox mode; never production
`bbjmhaerssakbreykxiw`; preserve the dirty working tree; no stage, commit,
push, deploy, fixture, mutation, layer deactivation or cutover; no password
stored or printed. `Çap` is not present on this page; exports follow D-L2.
