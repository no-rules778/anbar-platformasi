# Phase 10 design scope — owner decision

Date: 2026-09-10  
Status: **APPROVED**

The owner approved all three Phase 10 design recommendations:

1. **D-K1 — dead-stock placement.** Phase 10 exposes the inactive/dead-stock
   view from the new «Anbar və layihələr» surface as a read-only tab/action.
   The derivation and export stay reusable by the later Reports phase; no other
   `rRep()` branch is migrated early.
2. **D-K2 — inactive locations.** Preserve the legacy page behaviour: the
   location/project table renders every warehouse/location row supplied by the
   snapshot, including inactive rows, without inventing an active-only filter.
3. **D-K3 — roles and scoping.** Keep the page available to every authenticated
   role. Render the server/RLS-shaped data as returned and do not add a new
   client-side warehouse restriction. The «Yeni ünvan» management affordance
   remains admin-only and navigates to the existing reference-directory page.

Phase 10 remains read-only. This decision authorises implementation of the
accepted proposal/ledger/plan on TEST-safe local code only; it does not
authorise a Supabase mutation, production contact, fixture, layer change,
cutover, stage, commit, push or deploy. `Çap` remains outside acceptance.

