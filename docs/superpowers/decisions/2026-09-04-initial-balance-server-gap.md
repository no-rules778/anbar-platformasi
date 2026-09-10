# H-D2 — the initial-balance restriction is client-only in production

**Status: FINDING RECORDED + PREFLIGHT DESIGNED. No SQL written, executed or
applied. Server enforcement is a SEPARATE future migration needing its own
approval.**

Recorded 2026-09-04 during Phase 7, milestone H-1, task `T1b` (decision Q4).
Evidence source: the read-only capture
`docs/superpowers/test-environment/production-functions-2026-09-03.json` and
`production-schema-2026-09-03.json`. **The production project
`bbjmhaerssakbreykxiw` was not connected to or queried.**

---

## 1. The claim, and what is actually there

`index.html` states in two places that the database enforces the rule:

> `Bu YALNIZ rahatlıq üçün UI yoxlamasıdır; məcburi qadağa serverdədir`
> `(sql/016_initial_balance_admin_only.sql — movements üzərində BEFORE INSERT)`
> — index.html:1919-1921

> `Yekun məcburi qadağa serverdədir (sql/016).` — index.html:4694

`CLAUDE.md` §12 says the same:

> The restriction must be enforced server-side in the posting RPC and in the UI.

**In the 2026-09-03 live capture none of that is present:**

| Check | Result |
|---|---|
| Any function whose body mentions «Anbar qalığı» | **none** |
| Any function whose body mentions «Əvvələ qalıq» | 7, all of them merely LISTING it as a valid type (`post_movement_document`, `cancel_document`, `cancel_documents_batch`, `cancel_legacy_movement`, `cancel_movement_row`, `document_edit_impact`, `replace_movement_item`) |
| An admin-only initial-balance check inside `post_movement_document` | **absent** — the function checks role ∈ (admin, anbardar), warehouse scope, quantities and balance, and nothing else |
| Triggers on `movements` | exactly three: `trg_stock_layer_movement` (AFTER INSERT), `movements_audit` (AFTER INSERT/UPDATE/DELETE), `trg_guard_movement_labels` (BEFORE INSERT) |
| `trg_guard_movement_labels` body | validates channel/partner against the ACTIVE directories and permits cancellation counter-entries. It contains no role check and no initial-balance rule |

**Conclusion.** As of that capture the «Əvvələ qalıq» + «Anbar qalığı»
restriction exists **only in the browser**. An `anbardar` calling
`post_movement_document` directly — with a REST client, or from a console —
would not be refused on those grounds.

`document_edit_impact` does block *correcting* an initial-balance document
(`'initial_balance'`, «Tarixi ilkin qalıq sənədi redaktə edilmir»), but that
governs corrections, not creation.

## 2. What Phase 7 does about it

Per decision **Q4**, Phase 7 **preserves** the client rule exactly and describes
it honestly:

- `lib/opLineValidation.ts` ports `isInitialBalanceLine()` verbatim, including
  the three historical partner spellings, the ğ/q tolerance on the partner, the
  strict type match, and the fact the marker counts in **both** the counterparty
  and the channel field.
- The check runs at line-add time (`M7-35`) and again at post time (`M7-95`,
  arriving in H-2), where the WHOLE document is refused rather than the line
  silently dropped — it is a permission violation, not a stock race.
- The code comment states plainly that this is client-only as of the capture and
  must not be described as server-enforced.

**Phase 7 applies no SQL and changes no server object.**

## 3. Read-only preflight (designed, NOT executed)

Purpose: size the gap before anyone decides whether to close it. Answers "do
non-admin-created initial-balance rows already exist, and how many?".

It contains **no DDL, no DML, no GRANT and no REVOKE** outside comments
(CLAUDE.md §7). It is `SELECT`-only and safe to run in a read-only transaction.

```sql
-- READ-ONLY PREFLIGHT — H-D2. Run inside: BEGIN; SET TRANSACTION READ ONLY;
-- Counts existing historical opening-balance rows by the effective role of
-- whoever created them. Executes no DDL/DML/GRANT/REVOKE.
-- Mirrors the client predicate isInitialBalanceLine(): the type must be
-- «Əvvələ qalıq» and the marker may appear in EITHER partner or channel.
WITH marked AS (
  SELECT
    m.id,
    m.date,
    m.warehouse,
    m.item_code,
    m.created_by,
    m.created_at
  FROM public.movements m
  WHERE lower(btrim(m.type)) = lower('Əvvələ qalıq')
    AND (
      replace(lower(btrim(coalesce(m.partner, ''))), 'ğ', 'q') IN (
        replace(lower('Əvvələ anbar qalıqı'), 'ğ', 'q'),
        replace(lower('Əvvələ anbar qalığı'), 'ğ', 'q'),
        replace(lower('Anbar qalığı'),        'ğ', 'q')
      )
      OR
      replace(lower(btrim(coalesce(m.channel, ''))), 'ğ', 'q') IN (
        replace(lower('Əvvələ anbar qalıqı'), 'ğ', 'q'),
        replace(lower('Əvvələ anbar qalığı'), 'ğ', 'q'),
        replace(lower('Anbar qalığı'),        'ğ', 'q')
      )
    )
)
SELECT
  COALESCE(public.effective_role(u.role), 'naməlum / silinmiş istifadəçi') AS creator_role,
  COUNT(*)                                   AS row_count,
  COUNT(DISTINCT marked.warehouse)           AS warehouses,
  MIN(marked.date)                           AS earliest_date,
  MAX(marked.date)                           AS latest_date,
  MAX(marked.created_at)                     AS last_created_at
FROM marked
LEFT JOIN public.users u ON u.id = marked.created_by
GROUP BY 1
ORDER BY row_count DESC;
```

Notes on the query:

- `effective_role()` exists in the live capture and maps the legacy roles
  (`techizat`/`muhasib`/`baxis`) to `rehber`, matching the client.
- Rows imported from Excel carry a null or 'sistem' `created_by`; they group
  under «naməlum / silinmiş istifadəçi» and are **expected** — they predate the
  rule and are not evidence of a violation.
- A non-zero `anbardar` bucket would be the finding that matters.

**Not run anywhere yet.** Running it against production is itself a separate
request, even though it is read-only, because §5 of the principles puts live
production access behind explicit user approval. It could be run in the test
project, but the test project has no such historical data, so the result would
be uninformative.

## 4. Proposed server migration — for SEPARATE approval, not Phase 7

Sketched here so the decision is informed; **not written as a migration file,
not applied, and explicitly out of Phase 7's scope.**

Two shapes are possible:

**(a) A check inside `post_movement_document`.** Add, after the existing role
gate, a refusal when the line matches the initial-balance predicate and
`v_role <> 'admin'`. Narrow and easy to review, but it protects only that one
entry point.

**(b) A `BEFORE INSERT` trigger on `movements`.** What the code comments already
claim exists. Protects every path, including any future RPC, but interacts with
`trg_guard_movement_labels` ordering and must exempt cancellation counter-entries
the same way that trigger does — otherwise reversing a historical opening balance
would itself be refused.

Both need decisions the user has not been asked for yet:

1. Is `admin`-only still the intended rule, or should a named role be allowed?
2. What happens to the **existing** rows the preflight finds? (Recommendation:
   nothing — the rule applies to new creation attempts, exactly as CLAUDE.md §12
   already says.)
3. Must a cancellation of a historical opening balance stay possible for a
   non-admin? (`cancel_document` is already admin-gated, so probably moot.)

**Recommendation:** shape **(b)**, with an explicit reversal exemption, because
it is what the platform's own documentation already promises. But it is a
production schema change and belongs in its own approved task with its own
preflight, dry run and rollback plan.

## 5. Registry

Tracked as divergence **H-D2** in the Phase 7 draft rows, and referenced from
`M7-35` (the client check) and `M7-95` (the post-time re-check). It is **not** a
deviation — the legacy behaviour is reproduced exactly; what is recorded is that
the documented server half does not exist.
