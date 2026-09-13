# Phase 15 authoritative registry — Module Q

**Current tally:** 56 `CODE VERIFIED`, 0 `LIVE VERIFIED`, 0 `IN PROGRESS`,
4 `NOT STARTED` (M15-10, M15-17, M15-58, M15-60), 0 `BLOCKED`,
0 unclassified; **60 unique rows**, 0 duplicates.

| ID | Surface | Exact contract | Evidence | Status |
|---|---|---|---|---|
| M15-01 | Rail | Təhlil order is Hesabatlar, Maliyyə göstəriciləri, Nəzarət və risklər | App source and suite | CODE VERIFIED |
| M15-02 | Access | Both pages are ungated for every role | App source and legacy go | CODE VERIFIED |
| M15-03 | Route | Finance rail entry opens the finance page | App switch and suite | CODE VERIFIED |
| M15-04 | Route | Controls rail entry opens the controls page | App switch and suite | CODE VERIFIED |
| M15-05 | Dashboard | Every issue pill navigates to Controls | Dashboard regression test | CODE VERIFIED |
| M15-06 | Dashboard | Pill count, severity class and global scope remain unchanged | Existing and revised tests | CODE VERIFIED |
| M15-07 | Shell | Finance heading, subtitle and export action are exact | Page test | CODE VERIFIED |
| M15-08 | Shell | Controls heading, subtitle, Excel and Çap are exact | Page test | CODE VERIFIED |
| M15-09 | Snapshot | Uses movements, items, warehouses and partners only | Reused explicit snapshot source | CODE VERIFIED |
| M15-10 | Snapshot | Authenticated TEST page emits exactly those four reads | Not run without role session | NOT STARTED |
| M15-11 | Snapshot | Any read failure rejects the complete generation | Snapshot and store tests | CODE VERIFIED |
| M15-12 | Snapshot | Failed first load shows fatal error | Page and store tests | CODE VERIFIED |
| M15-13 | Snapshot | Failed refresh retains previous complete generation | Store and page tests | CODE VERIFIED |
| M15-14 | Concurrency | Late older response cannot overwrite newer data | Store test | CODE VERIFIED |
| M15-15 | Scope | No client warehouse filter is applied | Store and page source | CODE VERIFIED |
| M15-16 | Realtime | Watches movements, items, warehouses and partners | Page source | CODE VERIFIED |
| M15-17 | Realtime | Multiple live events debounce to one refresh | Authenticated TEST not run | NOT STARTED |
| M15-18 | Source | All calculations use operational movements | Finance and control source | CODE VERIFIED |
| M15-19 | Finance KPI | Stock value is accepted aggregate total value | Finance test | CODE VERIFIED |
| M15-20 | Finance KPI | Purchases require type Satınalma and positive incoming quantity | Finance test | CODE VERIFIED |
| M15-21 | Finance KPI | Spend accepts movement price only when positive | Finance test | CODE VERIFIED |
| M15-22 | Finance KPI | Priced coverage counts positive movement prices | Finance test | CODE VERIFIED |
| M15-23 | Finance KPI | Missing both invoice and contract counts as undocumented | Finance test | CODE VERIFIED |
| M15-24 | Finance KPI | Cash means channel begins with Nağd | Finance test | CODE VERIFIED |
| M15-25 | Finance KPI | Write-off estimate uses outgoing quantity times item price | Finance test | CODE VERIFIED |
| M15-26 | Finance KPI | Six labels, subtitles and severity classes match legacy | Page source and test | CODE VERIFIED |
| M15-27 | Supplier | Empty partner uses the exact fallback label | Finance test | CODE VERIFIED |
| M15-28 | Supplier | Value uses positive recorded purchase price only | Finance test | CODE VERIFIED |
| M15-29 | Supplier | Screen rounds, sorts descending and takes top 12 | Finance source and export test | CODE VERIFIED |
| M15-30 | Payment | Empty or whitespace channel uses exact fallback label | Finance test | CODE VERIFIED |
| M15-31 | Payment | Counts operations, value and document coverage | Finance test | CODE VERIFIED |
| M15-32 | Payment | Sorts descending by value | Finance test | CODE VERIFIED |
| M15-33 | Flow | Excludes purchases and groups every other type | Finance test | CODE VERIFIED |
| M15-34 | Flow | Empty type fallback and in-out totals match legacy | Finance source | CODE VERIFIED |
| M15-35 | Flow | Document coverage is literal N/A | Page test | CODE VERIFIED |
| M15-36 | Prices | Requires at least two positive observations | Finance test | CODE VERIFIED |
| M15-37 | Prices | Difference below 0.005 is excluded | Finance test | CODE VERIFIED |
| M15-38 | Prices | Spread, best and worst supplier match observations | Finance test | CODE VERIFIED |
| M15-39 | Prices | Descending spread and 3000 screen cut are preserved | Finance source | CODE VERIFIED |
| M15-40 | Prices | Row opens the existing item card | Page source | CODE VERIFIED |
| M15-41 | Finance export | Workbook has the seven actual legacy sheets | Export test | CODE VERIFIED |
| M15-42 | Finance export | Summary rows and valuation meanings match screen | Export source | CODE VERIFIED |
| M15-43 | Finance export | Warehouse value rows use nonzero positions | Export source | CODE VERIFIED |
| M15-44 | Finance export | Supplier export is not limited by screen top 12 | Export regression test | CODE VERIFIED |
| M15-45 | Finance export | Payment and flow sheets match screen aggregates | Export source | CODE VERIFIED |
| M15-46 | Finance export | Price sheet includes unit, both suppliers and count | Export source | CODE VERIFIED |
| M15-47 | Finance export | Control summary and full details share accepted groups | Export source | CODE VERIFIED |
| M15-48 | Controls | Reuses accepted controlIssues without reimplementation | Import and source | CODE VERIFIED |
| M15-49 | Controls KPI | Total and high counts sum issue rows | Control test | CODE VERIFIED |
| M15-50 | Controls KPI | Completeness formula and zero-data branch match legacy | Control test | CODE VERIFIED |
| M15-51 | Controls KPI | Date is current ISO day | Page source | CODE VERIFIED |
| M15-52 | Controls cards | Severity labels and classes match high, medium and low | Page test and source | CODE VERIFIED |
| M15-53 | Controls cards | Numeric headings are right aligned by legacy regex | Page source | CODE VERIFIED |
| M15-54 | Controls cards | Table is cut at shared 3000 limit | Page source | CODE VERIFIED |
| M15-55 | Controls cards | Stale first-100 hint appears above 100 rows | Page source | CODE VERIFIED |
| M15-56 | Controls cards | Code-bearing rows open existing item card | Page source | CODE VERIFIED |
| M15-57 | Controls export | Excel-labelled action downloads legacy semicolon CSV matrix | Control source and test | CODE VERIFIED |
| M15-58 | Export | Real browser downloads validate filenames and sheet payloads | Not run without session | NOT STARTED |
| M15-59 | Print | Çap stamps PrintHead then calls print after 60 ms | Page source | CODE VERIFIED |
| M15-60 | RLS | Admin and anbardar see server-scoped analytical row sets | Two authenticated TEST roles unavailable | NOT STARTED |
