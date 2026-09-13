# Phase 11 design scope — owner decision

Date: 2026-09-11  
Status: **APPROVED**

The owner accepted the complete recommended Phase 11 package. All five
decisions are approved as recommended in the
[proposal](../specs/2026-09-11-react-migration-phase11-dashboard-proposal.md)
§6, after the independent
[design audit](./../audits/2026-09-11-phase11-design-codex-audit.md) passed.

1. **D-L1 — default landing page.** Once `dash` exists it becomes the default
   page for every role, replacing the interim `refs`/`log` default. The entry
   and the page stay ungated, matching legacy `go('dash')` (index.html:7523).
2. **D-L2 — header exports.** Both whole-platform exports («Tam ixrac» and
   «Excel (SON formatı)») stay out of Phase 11 and remain Phase 16
   deliverables. The dashboard renders no export button. They are not M11
   ledger rows.
3. **D-L3 — alerts card and drill-down.** `controlIssues()` is ported now as
   one shared pure function returning the full legacy group shape; the
   dashboard renders only title, severity and count. Because «Nəzarət və
   risklər» is Phase 15, each pill is explicitly inert and carries a title
   naming the unmigrated screen. Phase 15 wires the destination.
4. **D-L4 — selector options.** Approved deviation from legacy: options are
   rebuilt from the current snapshot instead of being built once
   (index.html:1536), and a selection whose warehouse is no longer an active
   `anbar` resets to «Bütün anbarlar». This is recorded as a deviation, never
   as parity.
5. **D-L5 — stylesheet.** The legacy dashboard CSS rules (index.html:30,
   66-72, 89-91, 121, 151) are ported verbatim now. The side effect that the
   Phase 9/10 KPI blocks become styled as legacy is accepted as movement
   toward parity.

This decision authorises implementation of the accepted
proposal/ledger/plan on TEST-safe local code only. It does not authorise a
Supabase mutation, production contact, fixture, layer change, cutover, stage,
commit, push or deploy. Phase 11 remains `NOT ACCEPTED` until Codex's final
independent audit.
