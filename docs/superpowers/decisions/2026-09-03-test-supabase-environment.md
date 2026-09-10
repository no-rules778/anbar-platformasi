# Isolated Supabase test environment

Date: 2026-09-03.
Status: READY; isolated schema, synthetic fixtures, test Admin, and application
connection verified.

The user authorized creating a separate test project through their signed-in
Supabase account to enable migration write tests without modifying production.
Codex created the project through the dashboard and observed status Healthy.

| Environment | Project | Reference |
| --- | --- | --- |
| Production (do not modify) | anbar | bbjmhaerssakbreykxiw |
| Test | anbar-test | alkjjbaawmsirsfvqljm |

Test dashboard: https://supabase.com/dashboard/project/alkjjbaawmsirsfvqljm
Test API URL: https://alkjjbaawmsirsfvqljm.supabase.co
Organization: pltmrtnqtbnrmwrgnzyw (Free as displayed during creation).
Region: eu-central-1 (Frankfurt). Database engine: standard PostgreSQL.
Data API enabled; automatic exposure of new tables disabled. Grants and RLS
were restored explicitly from a read-only live catalog capture.
No GitHub connection was configured.

No production schema, RPC, application records, or deployment was changed by
this operation. Existing localhost configuration was not switched. Credentials
are deliberately not recorded here.

## Completed preparation

- A production catalog capture was taken inside `BEGIN READ ONLY`: 23 tables,
  2 views, 4 sequences, 110 constraints, 33 non-constraint indexes, 30 RLS
  policies, 8 triggers, and 87 public functions.
- Those objects were recreated atomically in `anbar-test`; post-restore counts
  match the capture. No production rows or production auth users were copied.
- Synthetic reference values, warehouses, items, and one confirmed Test Admin
  were created. The setup is documented in `test-environment/README.md`.
- `scripts/start-test-environment.ps1` runs the test app on port 5175 and
  refuses any Supabase URL except `alkjjbaawmsirsfvqljm`.
- The ignored `web/.env.sandbox.local` contains only browser-safe project
  configuration. No privileged key is present in Vite.
- Production-connected `web/.env` was not changed and its localhost writes
  remain blocked.

## Phase 5 live verification performed

- Test Admin login and test-reference loading passed.
- Item create and subsequent edit persisted.
- New-item import assigned the next code server-side and persisted.
- Category import persisted.
- With the same synthetic account temporarily downgraded to `baxis`, direct
  item insert, new-item import RPC, and category-import RPC were all refused.
  The account was restored to `admin`, and neither refused item exists.
- Excel export produced `nomenklatura_2026-09-03.xlsx`. It has one `Hesabat`
  sheet, the six legacy columns, four expected rows, numeric prices/balances,
  empty zero prices, and no formula-error strings. A rendered visual pass
  showed a readable table. Numeric item codes intentionally lose leading zeroes,
  matching the documented legacy export behavior.
- The print command was invoked from the live test page. Automated print tests
  were already green; operating-system printer output was not physically
  produced.

The isolated Phase 5 write/export pass is complete. The disabled
`Bu mal üzrə əməliyyat` transition remains a planned dependency on the future
`Yeni əməliyyat` screen, not a Phase 5 failure.
