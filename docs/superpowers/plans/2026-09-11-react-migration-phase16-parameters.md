# Phase 16 execution plan — Parametrlər və ixrac

## Safe slice

1. Render the ungated Settings shell and permission matrix.
2. Reuse the Phase 15 atomic four-read analysis snapshot for source counts and
   partner export; count operational rather than raw movements.
3. Read the users table only for an admin identity. Render the exact non-admin,
   read-failure, empty, sorted-row, self and active-state branches. Keep role
   mutation disabled until D-S3 is decided.
4. Keep Audit export disabled with the exact legacy title. Do not pretend the
   mov/bal/nom delegation is complete until a cross-page export signal exists.

## Authority-gated slice

- D-S1: full JSON backup is a bulk data-egress decision.
- D-S2: bulk paste calls a stock-writing RPC and needs its own TEST containment.
- D-S3: role/warehouse/active mutation can lock users out and needs explicit
  owner authority plus an authenticated TEST admin.

No Phase 16 authority is inherited from another phase. Never contact
production. Preserve the dirty tree and do not stage, commit, push or deploy.
