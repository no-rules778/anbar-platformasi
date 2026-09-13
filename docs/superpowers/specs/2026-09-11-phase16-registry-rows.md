# Phase 16 authoritative registry — Module R

**Current tally:** 16 `CODE VERIFIED`, 0 `LIVE VERIFIED`, 0 `IN PROGRESS`,
0 `NOT STARTED`, 8 `BLOCKED`, 0 unclassified; **24 unique rows**,
0 duplicates.

**Correction, 2026-09-11.** A first revision of this ledger marked M16-02
`CODE VERIFIED` citing a page test. No settings page exists yet — only the
matrix library was implemented — so that row was unearned and is restored to
`NOT STARTED`. The superseded claim is recorded here rather than silently
overwritten.

**Correction, 2026-09-11 (M16-11 implementation).** The first implementation
of the delegation consumed the pending export request on ARRIVAL, before the
destination page's `canExport` gate was satisfied. Settings navigates while
the snapshot is still in flight, so the first render is always gated: the
request was cleared a tick before the data arrived and the user received no
file at all. The defect was proved by a failing test, corrected by consuming
only when the export actually runs (with an unmount cleanup so an unsatisfied
request cannot leak into a later visit), and the corrected behaviour is pinned
by a regression test that fails against the superseded form on both gated
pages. Recorded here rather than silently overwritten.

`BLOCKED` means the row requires authority Phase 16 does not hold (server write,
bulk egress, user mutation) or an authenticated identity that does not exist.

| ID | Surface | Exact contract | Evidence | Status |
|---|---|---|---|---|
| M16-01 | Route | Parametrlər is ungated — `go()` has no `set` branch | index.html:1495-1512 and App source | CODE VERIFIED |
| M16-02 | Shell | Heading and subtitle are exact legacy strings | SettingsPage test | CODE VERIFIED |
| M16-03 | Perms | Matrix has 10 permission rows in legacy order | Matrix test | CODE VERIFIED |
| M16-04 | Perms | Columns are all six `ROLES` in declaration order | Matrix test | CODE VERIFIED |
| M16-05 | Perms | Cell is `var`/`yox` by `ROLE_PERMS[effectiveRole(r)]` | Matrix test | CODE VERIFIED |
| M16-06 | Perms | Legacy roles map to rehber, so their columns are all `yox` | Matrix test | CODE VERIFIED |
| M16-07 | Source | Counts render items, partners and operational movements | Settings helper and page tests | CODE VERIFIED |
| M16-08 | Source | Uses operational (cancellation-filtered) movement count | Settings helper test | CODE VERIFIED |
| M16-09 | Export | Kontragent export matrix is the exact four-column legacy shape | Settings helper test | CODE VERIFIED |
| M16-10 | Export | Audit jurnalı button is disabled with the legacy title | SettingsPage test | CODE VERIFIED |
| M16-11 | Export | mov/bal/nom buttons record a pending export and navigate; the destination consumes it once and runs its OWN existing export. `log` stays disabled and delegates to nothing | Store, Settings and per-page delegation tests | CODE VERIFIED |
| M16-12 | Users | Non-admin sees the exact non-admin empty state | SettingsPage test | CODE VERIFIED |
| M16-13 | Users | `USERS_ERR` renders the distinct load-failure empty state | SettingsPage test | CODE VERIFIED |
| M16-14 | Users | Rows sort by email with `localeCompare` | SettingsPage test | CODE VERIFIED |
| M16-15 | Users | Own row carries the `siz` tag | SettingsPage test | CODE VERIFIED |
| M16-16 | Users | Active/inactive render as `aktiv`/`deaktiv` tags | SettingsPage test | CODE VERIFIED |
| M16-17 | Users | Admin-only `users` SELECT | No authenticated admin TEST identity | BLOCKED |
| M16-18 | Users | `admin_update_user` role/warehouse/active mutation | Owner authority not granted | BLOCKED |
| M16-19 | Users | Anbardar must receive a non-Ofis operational warehouse | Owner authority not granted | BLOCKED |
| M16-20 | Users | Server lockout protection for last admin / self | Owner authority not granted | BLOCKED |
| M16-21 | Backup | Full JSON backup egresses the entire dataset | D-S1 undecided | BLOCKED |
| M16-22 | Import | Paste parser rejects bad warehouse/code/type/direction | D-S2 undecided | BLOCKED |
| M16-23 | Import | Writes only through `post_movement_document` | D-S2 undecided | BLOCKED |
| M16-24 | Import | All-or-nothing: a failed RPC writes no row | D-S2 undecided | BLOCKED |
