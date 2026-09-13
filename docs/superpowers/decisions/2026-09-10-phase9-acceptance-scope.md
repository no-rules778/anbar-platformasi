# Phase 9 acceptance scope — TEST metadata and external evidence boundaries

Date: 2026-09-10  
Owner decision: **APPROVED**

The owner accepts the T10 change to the TEST-only `stock_conditions` row
`Test Anbar | 0000001` as a bounded identity-metadata residual. All four
condition quantities and the note were restored to their baseline values, but
the accidental six-argument DELETE followed by the full INSERT changed
`created_at` and `updated_by`. This is not described as byte-identical or exact
net-zero restoration.

No direct table write, audit deletion, or repetition of the six-argument probe
is authorised to recreate the old metadata. The existing server audit history
is preserved.

For Phase 9 acceptance, the following remain explicit external evidence
boundaries rather than silently claimed passes:

- T0B catalog facts require catalog/service-role authority that was unavailable;
  captured trusted metadata remains the stated evidence class.
- M9-109 server audit rows were not readable with the exercised `anbardar`
  identity; browser evidence proves only that the client issued no audit write.
- The remaining M9-108 inactive-profile and `rehber` refusal legs lack the
  required identity/state; the anonymous-session and NaN legs are unavailable
  through the supported interface described in the ledger.

These limitations do not authorise production contact, schema changes, direct
table repair, layer deactivation, cutover, staging, commit, push, or deploy.
They also do not promote the affected ledger rows beyond their recorded
evidence levels.

