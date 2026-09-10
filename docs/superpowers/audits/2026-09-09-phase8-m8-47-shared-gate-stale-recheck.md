# Phase 8 — M8-47: one gate shared by button and handler, proved on stale state

Date: 2026-09-09 (Asia/Baku)
Environment: TEST `alkjjbaawmsirsfvqljm`, read-only sandbox
Actor: TEST admin
Result: PASS with a valid negative control

## The approved contract

> **M8-47 | One gate shared by button and handler (`M7-S5` rule)**

The distinguishing property is that the gate is not evaluated once at render
and then trusted. `DocumentViewDialog.tsx:217-244` re-reads the clicked row,
RE-ASSEMBLES the view from CURRENT rows, and re-runs **the same gate the button
used** — so a document cancelled by someone else while the dialog stands open
is refused rather than cancelled twice. Critically, that re-check sits **before
`setInFlight` and before any API call**, so the localhost write guard cannot
mask it and a read-only sandbox is a valid place to exercise it.

The prior M8-47 evidence covered concurrent submission of the same cancellation
from two tabs (one reversal resulted). This run covers the other half: what the
gate does when the underlying rows change beneath an open dialog.

## Method

Read-only sandbox `127.0.0.1:5175` (`VITE_ALLOW_LOCAL_WRITES=false`, HTTP 200),
blanket abort on any `bbjmhaerssakbreykxiw` URL. Browser-only response
interception — **nothing was written to TEST by the harness**.

1. Open the real document card for the cancellable `Silinmə` document
   `TEST-OUT-1` (the one the batch dialog independently reports as
   «Ləğv edilə bilər»). The BUTTON gate allowed the action:
   «Əməliyyatı ləğv et» was present and enabled.
2. Arm a response rewrite adding a cancellation-marker row for that same
   document (`note: 'Ləğv: TEST-OUT-1'`, `doc_num: SND-C-M847STALE`) — the
   exact shape a real cancellation takes, because `cancelledDocFor()`
   classifies on `note`.
3. Drive a genuine reload of the mounted screen **without closing the dialog**.
   The only such path is the realtime callback (`MovementsPage.tsx:178`), so a
   real TEST `postgres_changes` event was fired by an external supported write
   (posted and immediately reversed), exactly the mechanism M8-14 proved.
   The harness ABORTS rather than reporting a pass if no reload is observed;
   here `reloadObserved: {reloaded: true}`.
4. Submit through the real control.

## Evidence

**Before the swap** — the open dialog offered the action:

```
… "İmtina", "Əməliyyatı ləğv et"          (both enabled)
"Ləğv zamanı əks mədaxil yeni sənəd kimi yazılır. Orijinal sətirlər dəyişmir."
```

**After the reload** — the SAME open dialog, re-rendered from current rows:

```
Silinmə sənədi · TEST-OUT-1
Ləğv edilib · əks sənəd: SND-C-M847STALE. Orijinal sətirlər dəyişməz saxlanılır.
… "Bağla"
```

- The «Əməliyyatı ləğv et» control is **gone entirely** — omitted, not
  disabled — and «Sətri ləğv et» with it. Only «Bağla» remains.
- The dialog now states the document is cancelled and names the reversal.
- **`cancelRpcs: 0`.** No cancellation RPC of any kind was dispatched.

The gate therefore revoked the action the moment the rows changed, on a dialog
that was already open with the action enabled. This is a **stronger** outcome
than a handler-side refusal toast: the shared gate re-ran at render and removed
the control, so the handler branch was never even reachable.

## Negative control — valid, and it discriminates

The identical flow WITHOUT the stale swap was run first. There the gate
**passed**: execution proceeded past the re-check to the write guard, producing

> «Ləğv edilmədi: Bu əməliyyat lokal rejimdə bloklanıb: localhost CANLI
> Supabase bazasına qoşulub …»

and the «Əməliyyatı ləğv et» button remained present and enabled throughout.

So the control removal in the positive run is caused by the staleness, not
emitted unconditionally, and the gate is not simply refusing everything on a
read-only sandbox.

## What is NOT claimed

- The handler-side refusal toast «Bu sənəd artıq ləğv edilib və ya ləğv edilə
  bilməz» (`DocumentViewDialog.tsx:242`) was NOT observed, because the render
  gate removed the control first. That specific string remains covered by unit
  tests, not by this live run.
- Other roles, and the batch dialog's own `resolveBatchSelection()` re-check
  (a separate one-function-two-calls instance), are not claimed here.

## Safety

0 production contacts; 0 cancellation RPCs; the two event-source fixtures were
posted through supported RPCs and immediately reversed; read-only sandbox
throughout; session closed. No commit, stage, push or deploy; dirty tree
preserved; no `I-10` row.
