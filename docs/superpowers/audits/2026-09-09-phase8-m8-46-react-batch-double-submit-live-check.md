# Phase 8 M8-46 — React batch double-submit live check (2026-09-09)

## Scope and action

TEST project `alkjjbaawmsirsfvqljm` only. Under the TEST-admin account, two real
0.01 `Satınalma` documents were created in `Test Anbar`: `SND-973DBDDB0B` and
`SND-82A44E221E`. Both were selected in the real `Qrup üzrə ləğv` flow and the
final `2 sənədi ləğv et` control received a genuine browser double-click.

## Evidence

The UI reported exactly two documents cancelled. Authenticated read-back found
exactly four scoped rows: the two unchanged sources and one reversal per source:

- `SND-973DBDDB0B` -> `SND-C-EE226B292E`
- `SND-82A44E221E` -> `SND-C-7E56D0995C`

There was no duplicate reversal for either source. Movement count was 95 before
the fixtures and 99 after the two source/reversal pairs. `get_stock_layers` for
`Test Anbar / 0000001` returned the unchanged revision
`0c1daafebbdd9402383fb8fe4b535a02`, the baseline 7 + 1 active layers and
balance 8.0.

## Assessment and closure

**NARROW PASS for the batch React double-submit branch.** The synchronous
in-flight lock admitted one batch request under a real double-click. The
fixture is stock-net-zero. Localhost was immediately restarted with
`VITE_ALLOW_LOCAL_WRITES=false` and HTTP 200. Production, staging, commits,
pushes and deploys were not touched; the dirty tree was preserved.

