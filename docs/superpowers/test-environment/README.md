# ANBAR isolated test environment

This environment targets only Supabase project `anbar-test`
(`alkjjbaawmsirsfvqljm`). It contains synthetic fixtures and no production
business records or production auth users.

## Start

From the repository root:

```powershell
.\scripts\start-test-environment.ps1
```

Open http://localhost:5175/. The launcher refuses to start if the configured
URL is not exactly the approved test project.

Test Admin:

- email: `anbar-admin-test@example.com`
- password: `AnbarTest!2026`

The normal `web/.env` remains production-connected with local writes blocked.
Never copy `VITE_ALLOW_LOCAL_WRITES=true` into that file.

## Contents

- `production-schema-2026-09-03.json`: live catalog capture without rows.
- `production-functions-2026-09-03.json`: live function definitions.
- `production-permissions-2026-09-03.json`: schema/default access metadata.
- `restore-test-schema.sql`: readable source schema restoration.
- `restore-test-atomic.sql`: same restoration wrapped as one atomic command.

The captures were obtained through read-only transactions. Restoration is
guarded against a non-empty `public` schema and is for a new test project only.
