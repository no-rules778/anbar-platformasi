# Phase 8 — Silinmə export unmount-abort live check

Date: 2026-09-08  
Project: TEST `alkjjbaawmsirsfvqljm` only  
Mode: read-only localhost, `VITE_ALLOW_LOCAL_WRITES=false`

## Scenario

The test needed the asynchronous export branch, but TEST has freshly confirmed
inactive layer mode, which normally skips the allocation read and completes
synchronously. A temporary development-only fetch wrapper therefore:

1. simulated failure of `stock_layers_supported`, making capability freshness
   unknown rather than falsely active/inactive;
2. delayed only the read of `stock_layer_allocations` for two seconds;
3. left every other request unchanged.

On the loaded «Mal hərəkəti» screen, the `Silinmə` filter exposed one existing
row. The real «Silinmə hesabatı» button was clicked and the page was immediately
changed to «Nomenklatura» while the allocation read was in flight. A browser
download event was observed for 3.5 seconds.

## Result

**PASS — `DOWNLOAD_OBSERVED=false`.** The page unmounted and no workbook was
downloaded. This live-verifies only the `mounted.current` abort at
`MovementsPage.tsx:436`. It does not verify refresh-start, changed-snapshot,
changed-session or duplicate-click branches.

## Safety and cleanup

- No database write or mutating RPC was executed.
- The existing TEST row was only read.
- The temporary wrapper was removed from `web/src/main.tsx` immediately after
  the observation.
- No downloaded file was created by this scenario.

Verdict: the unmount-abort subpath of the Silinmə report is **LIVE VERIFIED**;
the broader concurrency group remains partial/open.

## Duplicate-click follow-up

The same read-only setup was repeated with two immediate clicks on the real
«Silinmə hesabatı» button before navigating away. A temporary counter at the
fetch boundary observed exactly:

```text
allocationReads=1
```

The second click therefore did not start a second allocation read. No file was
downloaded because the page was again unmounted before the delayed read
settled. This **LIVE VERIFIES the synchronous duplicate-click lock** for the
asynchronous report branch. It does not promote the remaining refresh,
snapshot-identity or session-identity abort paths.

## Refresh/snapshot follow-up

Two further read-only localhost scenarios used the same temporary capability
failure and delayed allocation read. In the first, a real store refresh was
allowed to complete while the allocation read was pending. The report produced
no download and showed `Məlumat yeniləndi — hesabatı yenidən yaradın`. This
live-verifies the changed-snapshot identity abort.

In the second, the refresh's movements read remained pending when the
allocation result returned. The report produced no download, the action became
disabled while loading, and the UI showed
`Məlumat yenilənir — hesabatı yenidən yaradın`. This live-verifies the
refresh-in-progress abort.

The temporary wrappers were removed after each observation. Both scenarios
were reads only; no database mutation, workbook or lasting application code was
created.

A final browser control-flow check changed only the in-memory auth-store
identity while the delayed read was pending. No download occurred and the UI
showed `Sessiya dəyişdi — hesabatı yenidən yaradın`. This verifies the
changed-session guard itself, but is deliberately scoped as a synthetic
identity transition: no real logout/login, token change or Auth operation was
performed.

All five concurrency guards in this group are now observed through the real
button: unmount, duplicate click, refresh in progress, completed changed
snapshot and changed session. The session observation is not evidence about
Supabase authentication behaviour.
