# Phase 8 M8-20 / M8-46 — React row double-submit live check (2026-09-09)

## Scope and action

TEST `alkjjbaawmsirsfvqljm` only. TEST admin created one 0.01 `Satınalma`
document, `SND-17FAC1216F`, opened its real document card, entered an audit
reason and double-clicked the final row-cancellation submit.

## Evidence

- UI reported one row cancellation.
- Authenticated read-back found the unchanged source movement
  `e6c30903-615d-45dd-a0fb-0c90c2ec968a` and exactly one counter movement
  `6aff78b7-7e16-491f-9234-d608f274dc15`, with the same document number and
  marker `Ləğv ID: e6c30903-615d-45dd-a0fb-0c90c2ec968a`.
- No duplicate counter was created; movement count was 99 -> 101.
- Layer revision stayed `0c1daafebbdd9402383fb8fe4b535a02`; the baseline
  7 + 1 layers and balance 8.0 were restored.
- After refresh, the live card rendered zero visible rows and explicitly said
  all rows were separately replaced/cancelled while the document itself was
  not cancelled. This is the required M8-20 `emptyAfterStrip` distinction.

## Assessment and closure

**NARROW PASS** for M8-46 row-cancel double-submit and M8-20 empty-after-strip
presentation. The fixture is net-zero. Localhost was immediately restarted
with `VITE_ALLOW_LOCAL_WRITES=false` and HTTP 200. No production access,
staging, commit, push or deploy occurred; the dirty tree was preserved.

