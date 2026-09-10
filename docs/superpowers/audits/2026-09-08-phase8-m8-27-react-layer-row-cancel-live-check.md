# Phase 8 M8-27 React layer row-cancellation live check — 2026-09-08

## Scope

- TEST `alkjjbaawmsirsfvqljm` only, authenticated admin.
- Real local React UI and direct authenticated read-back.
- Stock-layer capability active, version 36.
- One temporary exact receipt, fully countered by the tested row action.

## Result

Fresh document `CODEX-P8-LAYER-ROW-UI-20260908231000` contained movement
`a60504a6-4c11-4ea6-89ef-d3998e4603e0`, one inbound unit of item `0000002`
at 12.5. Its exact source layer was available 1/active.

The real layers-active document dialog rendered `Sətri ləğv et` while the
non-layer-safe replacement action remained absent. The row dialog required a
reason; after entering `CODEX Phase 8 React layer row cancellation live check`,
the real submit produced toast
`Sətir ləğv edildi · sənəd: CODEX-P8-LAYER-ROW-UI-20260908231000`.

The refreshed document remained open but displayed zero effective lines and
the explicit partially-modified-state explanation. Direct read-back proved:

- movement count changed 84→85;
- the original row remained unchanged;
- exactly one counter-row `3558f95c-9c17-4283-ae64-af70ed4de0f9` was added
  under the same document;
- item, quantity, price and invoice were preserved, with direction inverted;
- the counter-row carried `Ləğv ID: <source id>`;
- the exact layer changed available 1/active → 0/inactive;
- effective `Test Anbar / 0000002` balance returned to zero.

The temporary write-enabled Vite process was stopped immediately and
localhost restarted without an override; the environment file remained
`VITE_ALLOW_LOCAL_WRITES=false`.

## Acceptance effect

M8-26 gains real React row-family layer-routing evidence. M8-27 now has real
TEST-admin React success evidence for its exact receipt layer branch, including
the zero-effective-lines document state and direct reconciliation. Allocated
write-off React routing, other roles, stale/transport/unknown outcomes and
concurrency remain open. **Phase 8 remains NOT ACCEPTED.**
