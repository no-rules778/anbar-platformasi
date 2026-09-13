# Phase 15 TEST-only plan

1. Verify the ledger mechanically: 60 unique ids and the current status tally.
2. Run pure calculation and workbook tests, then page, navigation and store tests.
3. Run full suite, typecheck, lint, sandbox production build and diff hygiene.
4. With an existing TEST identity only, observe the exact four GET families,
   no RPC and no write. Inject a failed refresh and confirm retention/recovery.
5. Observe realtime coalescing without creating a new fixture where an existing
   TEST event can be used. Otherwise leave M15-17 open.
6. Compare admin and anbardar raw responses when both authenticated sessions
   exist. Do not fabricate identities and do not infer RLS from equal rendered
   totals.
7. Exercise downloads in the browser without changing TEST data. Confirm the
   Finance workbook and Controls CSV names and contents.
8. Reconcile docs once, preserve the dirty tree, then request independent Codex
   acceptance. No phase may be accepted from unit evidence alone.

Hard constraints: sandbox mode and TEST project only; production ref is an
abort condition; Phase 15 is read-only; no mutation, fixture, layer change,
cutover, stage, commit, push or deploy.
