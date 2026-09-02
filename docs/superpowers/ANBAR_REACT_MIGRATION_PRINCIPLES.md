# ANBAR React Migration — Mandatory Parity Principles

**Status: permanent project rules.** Every current and future React migration
phase must read this document and
[`ANBAR_FUNCTIONAL_PARITY_REGISTRY.md`](ANBAR_FUNCTIONAL_PARITY_REGISTRY.md)
before any implementation begins.

Established: 2026-09-02, by explicit user instruction, after the comparative
audit of Phase 1.

---

## 1. Primary objective

We are rebuilding ANBAR with React, TypeScript and a modern modular
architecture.

We are **not** rewriting the old code line by line. But every confirmed
business rule and every user-visible behaviour of the working production
platform must be preserved **unless the user explicitly approves a change**.

The current production platform remains the behavioural reference until the
React platform reaches complete functional parity and passes live acceptance.

## 2. Mandatory migration sequence

```text
Old production platform — behavioral reference
                     ↓
Research one module completely
                     ↓
Document entities, contracts, and business rules
                     ↓
Implement the module in the new architecture
                     ↓
Compare old and new behavior on equivalent data
                     ↓
Automated tests + manual acceptance
                     ↓
Record the result in the parity registry
                     ↓
Proceed to the next module
```

**Do not migrate several large business modules simultaneously.**

## 3. Source-of-truth hierarchy

When sources disagree, this order decides:

1. The user's latest explicit decision.
2. Confirmed behaviour of the working production platform.
3. The real current Supabase schema, RPC contracts, RLS, Storage
   configuration and operational data.
4. Approved specifications, plans and decision ledgers.
5. The current React implementation.

Documentation may be stale. **Never trust documentation instead of checking
the old production code and the actual Supabase contract.**

This is not theoretical. Phase 1 hit it three times:

- `docs/DB_SCHEMA.md` and `docs/RLS_POLICIES.md` claimed role enforcement was
  client-only; the live database contradicted both.
- The `register_session()` device shape was written from assumption
  (`device_label`/`started_at`) instead of read from the RPC, which actually
  returns `label`/`since` — the device name rendered blank (finding F3).
- `manage_reference`'s `p_id` type could only be settled by reading the live
  function definition (finding C-15).

Before implementing against any RPC, read its definition from the live
database. Before relying on any column, read the live schema.

## 4. Data model

The old platform and the React platform use the **same Supabase project**.

Operational data is not copied into another database. The primary migration
risk is therefore **not** data loss during copying. The primary risk is
reading, calculating, filtering, displaying, exporting or changing the same
data **differently**.

Do not change production Supabase, SQL, GitHub, Vercel or the production
platform without separate explicit user approval.

## 5. Mandatory research for every module

Before implementation, identify and document:

1. All tables, columns, RPCs, RLS policies, Storage buckets and relationships
   the module uses.
2. All roles, permissions, warehouse restrictions and Admin-only actions.
3. All calculations, balances, prices, stock layers, rounding rules and totals.
4. Documents, `doc_num`, Qaimə №, contracts and historical records.
5. Cancellation, reversal, editing, replacement and audit behaviour.
6. Excel import, export, formulas, formatting and compatibility where relevant.
7. Realtime behaviour, concurrent-user behaviour, loading states and error
   handling.
8. Historical and exceptional data, including records without Qaimə №, price,
   document number or exact stock-layer attribution.

**Do not treat the visible form alone as the complete specification.** In
Phase 1 the warehouse screen's real rules lived in `manage_reference`'s body
(zero-balance check before deactivation, active-anbardar check, name-collision
against `partners`), none of which were visible in the UI code.

## 6. Functional parity registry

One project-wide registry is maintained at
[`ANBAR_FUNCTIONAL_PARITY_REGISTRY.md`](ANBAR_FUNCTIONAL_PARITY_REGISTRY.md).
Each completed phase also gets a final report — Phase 1's is
[`PHASE1_FINAL_REPORT.md`](PHASE1_FINAL_REPORT.md), which carries its manual
acceptance checklist.

For every old-platform function it records: module and function; confirmed old
behaviour; location of the old implementation; tables, fields, RPCs and
relationships used; location of the React implementation; roles and permission
restrictions; automated tests; result of old-versus-new comparison;
live/manual verification status; explicitly approved differences; known risks
and deferred work; current status.

### Statuses

| Status | Meaning |
|---|---|
| `NOT STARTED` | No React implementation exists. |
| `IN PROGRESS` | Implementation started, not yet complete. |
| `CODE VERIFIED` | Code review and automated tests passed. Mocks and unit tests only. |
| `LIVE VERIFIED` | Verified in a real browser against the actual environment, **on the code as it stands now**. |
| `ACCEPTED` | Both verification levels passed and all blocking issues closed. |

**Never mark a feature `ACCEPTED` based only on mocks or unit tests.**

A `LIVE VERIFIED` mark is invalidated when the code behind it changes
materially. Re-verification is required — an old live pass does not carry
forward across a rewrite of the same feature.

## 7. Handling suspected defects in the old platform

Do not silently copy a suspected defect, and do not silently "improve" it.

If old behaviour appears incorrect:

1. Document the existing behaviour.
2. Explain its effect and risk.
3. Propose the safest alternative.
4. Ask the user for a decision.
5. Record the approved difference in the parity registry.
6. Add regression tests for the decision.

A redesign must not alter calculations, permissions, documents, balances,
exports or stored data without explicit approval.

Worked example from Phase 1: the `manage_reference` type mismatch (C-15) was
documented in `ANBAR_SHARED/docs/BUG_REGISTRY.md` and `CHANGELOG.md`, reported
to the user, and left for a separate decision — it was not "fixed on the way
past".

## 8. Deployment boundary

The React application remains a **parallel test platform** until:

- the entire parity registry is complete;
- every critical function is `ACCEPTED`;
- real roles and permission scenarios have been tested;
- balances, movements, documents, cancellations, prices, stock layers and
  Excel behaviour have been reconciled;
- the user explicitly authorises replacement of the old platform.

Do not delete, disable, overwrite or replace the old production platform
prematurely.

Operationally, for every phase: work stays on the `react-migration` branch,
local commits only. No push, no PR, no merge to `main`, no Vercel deploy, and
no modification of the repository-root `index.html` without separate explicit
approval.

## 9. Relationship to the approved technology recommendations

This document complements, and does not replace,
`ANBAR_SHARED/platform/anbar-platform-tovsiyeler.md`. The two have different
responsibilities:

- **`anbar-platform-tovsiyeler.md`** defines the target technology stack,
  architecture, module boundaries, TypeScript requirements, API isolation and
  the gradual migration strategy.
- **This document** defines behavioural parity, verification, risk control,
  acceptance and deployment boundaries.

Apply both together.

If an architectural recommendation conflicts with confirmed production
behaviour, **do not sacrifice business parity**. Preserve the behaviour first,
document the architectural exception, and propose a later safe refactor.

The required technology direction is **React + TypeScript + Vite + Zustand**
with strict type checking and modular domain separation.

Exact folder names, package versions and the use of shadcn/ui are
implementation guidance unless an approved phase specification makes them
mandatory. **Do not rewrite already verified components solely to match a
suggested folder tree or UI library.**

### Supabase access isolation

Supabase access stays behind the API layer. Components, pages, stores and
hooks must not contain direct table, RPC, authentication-subscription or
Realtime client calls.

Where existing code imports the Supabase client directly, verify the case
independently and either:

1. move it into an appropriate API module (`realtime.api.ts`, an auth-session
   wrapper, …); or
2. document a narrowly scoped exception with its reason, tests and future
   cleanup status in the parity registry.

**Do not perform this cleanup if it could change observable behaviour without
first adding regression tests.**

Note: importing pure helpers that merely live in `api/supabase.ts`
(`rememberOn`, `setRemember`, `savedEmail`, `saveEmail`) is not a violation —
they touch browser storage, not the Supabase client.

### Interface design: keep the existing one

**User decision, 2026-09-02: the platform's existing interface design stays as
it is. A redesign is a separate, later piece of work and must not be smuggled
into a migration phase.**

A migration phase changes the technology under the screen, not how the screen
looks. Unless the user explicitly asks for a visual change, port the existing
appearance along with the behaviour: same layout, same visual hierarchy, same
Azerbaijani wording and terminology, same table density, same colour meanings.

The production platform's design is defined in `origin/main:index.html`'s
`:root` block (lines 11-22) and the shell rules that follow it:

| Element | Production value |
|---|---|
| Ink / paper | `--ink #0E141A`, `--ink-2 #3C4C5A`, `--ink-3 #71838F`, `--paper #EEF1F3`, `--panel #FFFFFF` |
| Lines | `--line #D6DEE3`, `--line-2 #E9EEF1` |
| Accent (steel) | `--steel #1F4E6B`, `--steel-d #143548`, `--steel-l #E7F0F5` |
| Semantic | in `#0E7C6B`, out `#B06A11`, alarm `#A9231C`, move `#5B4B9E`, each with a light pair |
| Type | `--sans "Segoe UI", Inter, system-ui…` at 13px/1.45; `--mono` for every number (`.num`, tabular figures, right-aligned) |
| Shell | 46px sticky dark-steel topbar; 212px sticky left rail (`--rail`); content area below |
| Surfaces | `.card` = white panel, 1px `--line` border, 5px radius; `.kpi` with a 3px semantic left bar |
| Tables | sticky `th`, 10px uppercase letter-spaced headers in `--ink-3`, dense 7-9px cells |
| Buttons | `.btn` white with a `--line` border; `.btn.pri` filled `--steel` |
| Tags | `.tag` 10.5px, 3px radius, semantic light background |

**Known open item:** Phase 1's screens do **not** yet follow this. They were
built with neutral Tailwind primitives (white cards, slate palette, a plain
header) and have no topbar/rail shell. This is registry deviation D-03/D-11 and
must be resolved — either by re-skinning the Phase 1 screens to the production
design, or by an explicit user decision to accept the interim look until the
planned redesign. It is not licence to keep inventing new styling in later
phases.

### Priority order when priorities conflict

1. The user's latest explicit decision.
2. Data safety and confirmed business behaviour.
3. The real current Supabase contract.
4. Approved migration specifications and parity rules.
5. Architectural recommendations.
6. Implementation convenience.

## 10. How a phase must read these rules

Any plan, spec or dispatch for a migration phase must link to this document
and to the registry, and the phase's research step must produce registry rows
before implementation starts — not after.
