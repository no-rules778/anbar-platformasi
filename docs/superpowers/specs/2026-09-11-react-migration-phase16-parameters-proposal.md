# Phase 16 proposal — Parametrlər və ixrac

**Status:** DESIGN / IN PROGRESS. Safe client-pure slices are being implemented;
every server-write, import, backup-egress and user-mutation slice is BLOCKED on
explicit owner authority and is NOT implemented.

## Scope

Port `rSet()` (`index.html:7172-7246`) and its page shell (`index.html:449-470`).
The legacy section holds five cards:

1. **Məlumatların ixracı** — five per-screen export buttons plus one full JSON backup.
2. **Məlumatların idxalı** — a tab/semicolon paste box posting `post_movement_document`.
3. **Hüquq matrisi** — a static permission matrix, 10 permission rows × 6 role columns.
4. **Sistemdə olan istifadəçilər** — admin-only user list plus `admin_update_user`.
5. **Məlumat mənbəyi** — three counts rendered as a sentence.

## Access contract

`go()` (`index.html:1495-1512`) has **no `set` branch**: the page is reachable by
every role, exactly like `fin`/`ctrl`. Gating lives *inside* `rSet()` — only the
users card is `isAdmin()`-gated, with a distinct non-admin empty state and a
separate `USERS_ERR` failure state. The permission matrix, export card, import
card and source card render for every role; `need('import')` guards the import
action itself, not its visibility.

## Safe / unsafe separation

Phase 16 inherits **no** write or destructive authority from Phases 9-15.

| Slice | Nature | Phase 16 treatment |
|---|---|---|
| Hüquq matrisi | pure client render over `ROLES`/`ROLE_PERMS` | **implement now** |
| Məlumat mənbəyi | three counts over the existing snapshot | **implement now** |
| Kontragent export | client-only `xls()` over loaded partners | **implement now** |
| mov/bal/nom/log export delegation | cross-page navigation + click relay | design only — depends on a routing decision |
| Tam ehtiyat nüsxə (JSON) | bulk egress of the entire dataset | **BLOCKED — owner authority** |
| Toplu idxal | `post_movement_document` RPC, writes stock | **BLOCKED — owner authority** |
| İstifadəçi siyahısı | admin-only `users` SELECT | **BLOCKED — needs authenticated admin session** |
| Rol təyin et | `admin_update_user` RPC, role/lockout mutation | **BLOCKED — owner authority** |

`ROLES` and `ROLE_PERMS` in `web/src/lib/roles.ts` were verified byte-identical
to `index.html:617-630` during this design, so the matrix reuses the accepted
module and introduces no second source of permission truth.

## Open owner decisions

- **D-S1** — may the JSON full backup be ported as a client-only download, given
  it egresses every movement, item and partner row in one file?
- **D-S2** — is the bulk import in Phase 16 scope at all, or deferred to its own
  phase with its own live gate?
- **D-S3** — user administration requires an authenticated admin TEST identity,
  which does not exist in `web/.env.sandbox.local`. Defer, or provision one?

## Acceptance boundary

Offline evidence can establish the matrix, the source card, the partner export
matrix and every access-state branch. Nothing in the blocked set may be marked
verified without owner authority and live evidence. Phase 16 cannot become
ACCEPTED before an independent Codex audit.
