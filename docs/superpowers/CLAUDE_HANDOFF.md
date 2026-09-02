# ANBAR — Claude handoff

## Project rule

The old production platform (`origin/main:index.html`) is the behavioural reference. The React/Vite platform must preserve the same data, calculations, permissions, documents, actions and visible outcomes. Architecture may change; unexplained behaviour may not.

Old and new platforms use the same Supabase project. Therefore localhost writes are real production writes. Do not change Supabase, the root `index.html`, GitHub remote, or Vercel without explicit user approval.

## Collaboration rule

Claude implements one migration phase at a time. When Claude reports `DONE`, Codex independently audits the spec, plan, ledger, registry, git diff, old platform and live Supabase contract, then runs tests/typecheck/lint/build and performs read-only browser comparison. Codex reports every divergence; Claude fixes only user-approved issues.

## Current migration state

- Branch: `react-migration`
- Phase 1: ACCEPTED by the user after code and live browser checks.
- Phase 2 (unified `Soraqçalar` with warehouse + partner kinds): code implemented.
- Latest relevant commits: `8bd917e` (Phase 2), `cc0e8ba` (localhost destructive-action guard), `09ad567` (contract-date investigation).
- Automated checks at latest audit: 218 tests passed, typecheck passed, oxlint passed, build passed, git diff check passed.

## Phase 2 findings

- Live localhost checks passed for partner creation, name/contract editing and hiding before the safety guard was added.
- Physical deletion of the temporary test partner was deliberately not performed. Do not delete it without the user's explicit confirmation.
- Localhost visibly warns that it uses the live Supabase database.
- **All** reference writes (`create`, `update`, `delete`, `deactivate`, `activate`) are blocked on localhost unless `VITE_ALLOW_LOCAL_WRITES=true`. Production behaviour is unchanged. The earlier gap — `create` and `update` still writing to the live database from localhost — is closed; the flag was renamed because its meaning widened, so an old `VITE_ALLOW_DESTRUCTIVE` line in a local `web/.env` no longer opens anything (it fails safe, i.e. blocked).
- The contract-date report was investigated. React sends a complete ISO date correctly in tests; the live audit showed the test date was already NULL at insert. This is consistent with an incomplete/empty `input[type=date]` value and matches production behaviour.
- The duplicate risk ID (`R-12`) is fixed — the date-input note is now `R-13`, the visual-parity item keeps `R-12`, and the guard's own limits are `R-14`. The registry no longer claims Phase 2 live verification "has not started": it lists what was actually checked live (partner create, name/contract edit, hide) and everything still unproven, and explains why no row is promoted to `LIVE VERIFIED` — that pass ran on code which has since changed.

## Required next action

The safety gap and registry hygiene are done. Next: live verification of the untouched Module C items (unified listing, usage numbers vs the old platform, VÖEN refusal, cascade notice, two-step delete, server refusals, list controls, Realtime), which now needs `VITE_ALLOW_LOCAL_WRITES=true` set deliberately or a deployed preview. Deleting the temporary test partner still needs explicit user confirmation.

## Source documents to read first

1. `docs/superpowers/ANBAR_REACT_MIGRATION_PRINCIPLES.md`
2. `docs/superpowers/ANBAR_FUNCTIONAL_PARITY_REGISTRY.md`
3. Relevant phase spec and plan
4. `.superpowers/sdd/` ledger/progress for the current phase
5. `origin/main:index.html` and the actual live Supabase contract
