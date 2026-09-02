# Phase 3 design — the six remaining Soraqçalar kinds

**Status: research and design only. No code was written and none may be
written until this document is approved.**

Governed by [`ANBAR_REACT_MIGRATION_PRINCIPLES.md`](../ANBAR_REACT_MIGRATION_PRINCIPLES.md)
and [`ANBAR_FUNCTIONAL_PARITY_REGISTRY.md`](../ANBAR_FUNCTIONAL_PARITY_REGISTRY.md).
Continues the Phase 2 spec, [`2026-09-02-react-migration-phase2-partners-design.md`](2026-09-02-react-migration-phase2-partners-design.md).

Everything below was read from the behavioural reference (`origin/main:index.html`)
and from the **live** Supabase database in read-only mode on 2026-09-02.
Nothing here is taken from `docs/DB_SCHEMA.md` or `docs/RLS_POLICIES.md`, which
principles §3 records as stale.

---

## 1. Scope

Phase 2 wired two of the eight `REF_KINDS` (`index.html:2934-2943`) into the
unified «Soraqçalar» screen. Phase 3 adds the remaining six:

| `kind` | Azerbaijani label (verbatim from `REF_KINDS`) | Storage |
|---|---|---|
| `location` | Ünvan / layihə | `warehouses` where `type = 'layihə'` |
| `channel` | Alınma kanalı | `reference_values` where `kind = 'purchase_channel'` |
| `unit` | Ölçü vahidi | `reference_values` where `kind = 'unit'` |
| `category` | Mal kateqoriyası | `reference_values` where `kind = 'item_category'` |
| `project` | Layihə (Sərfiyyat Materialları) | `serfiyyat_projects` |
| `serfiyyat_channel` | Alınma kanalı (Sərfiyyat Materialları) | `reference_values` where `kind = 'serfiyyat_channel'` |

After Phase 3 the «Soraqçalar» screen is complete: all eight kinds, no eighth
kind left behind. Registry deviation **D-12** ("only two kinds are wired") is
closed by this phase.

### Non-goals

- **No** Items (Nomenklatura), Movements, Sərfiyyat Materialları documents or
  report screens. Phase 3 manages the *directory values*; the screens that
  *consume* them stay unmigrated. Section 7 lists those dependencies so the
  later phases inherit them rather than rediscover them.
- **No** change to `manage_reference`, `get_reference_values`, any table, any
  RLS policy, any trigger. The server contract is consumed exactly as it is.
- **No** visual redesign (principles §9). The existing screen and its ported
  production stylesheet absorb the new kinds without new layout concepts.
- **No** change to Phase 2 behaviour for `warehouse` and `partner`. Their rows,
  rules and tests must come out of Phase 3 byte-identical in behaviour.

---

## 2. What the live database actually says

### 2.1 Tables and columns (read from `information_schema`, 2026-09-02)

```
reference_values     id uuid pk (gen_random_uuid) · kind text NOT NULL · name text NOT NULL
                     active boolean NOT NULL default true · created_at · updated_at
serfiyyat_projects   id uuid pk · name text NOT NULL · linked_warehouse text NULL
                     active boolean NOT NULL default true · created_at · updated_at
serfiyyat_documents  id uuid pk · doc_num text NOT NULL UNIQUE · project_id uuid NOT NULL FK→serfiyyat_projects
                     kontragent · avtomobil_nomresi · alinma_kanali · doc_date date NOT NULL
                     note · invoice_num · created_by · created_at
warehouses           id integer pk (sequence) · name text NOT NULL UNIQUE · type text default 'anbar' · active boolean
items                code text pk · name · unit text default 'ədəd' · price · price_source · category text · …
```

Constraints that matter to this phase:

| Constraint | Effect |
|---|---|
| `reference_values_kind_chk` | `kind ∈ {purchase_channel, unit, item_category, serfiyyat_channel}` — the table physically cannot hold any other kind |
| `reference_values_kind_name_ci_uq` | UNIQUE `(kind, lower(name))` — duplicate names are rejected **case-insensitively**, per kind |
| `reference_values_name_check` | `length(trim(name)) >= 2` — the client's 2-character rule is also a table constraint |
| `serfiyyat_projects_name_ci_uq` | UNIQUE `lower(name)` — project names are globally unique, case-insensitively |
| `serfiyyat_projects_name_check` | `length(trim(name)) >= 2` |
| `serfiyyat_documents_project_id_fkey` | FK — a project with documents cannot be deleted at the database level either |
| `warehouses_name_key` | UNIQUE `name` — **case-sensitive**; `location` shares this namespace with `warehouse` |

Note the asymmetry: `reference_values` and `serfiyyat_projects` are unique
*case-insensitively*, `warehouses` and `partners` only *case-sensitively*. So
"Ofis" and "ofis" can both exist as locations but not as two units.

### 2.2 Row counts (live, 2026-09-02)

| Kind | Rows | Active |
|---|---|---|
| `location` (`warehouses.type='layihə'`) | **0** | 0 |
| `channel` (`purchase_channel`) | 8 | 8 |
| `unit` | 18 | 18 |
| `category` (`item_category`) | 16 | 16 |
| `project` (`serfiyyat_projects`) | 9 | 9 (4 have a `linked_warehouse`) |
| `serfiyyat_channel` | 2 | 2 |
| — context — `items` 1531 · `movements` 1915 · `serfiyyat_documents` **0** | | |

Two of these numbers drive real risk and are carried into section 8:
`location` has **no data at all**, and `serfiyyat_documents` is **empty**, so
every project and every serfiyyat channel currently counts as unused and is
therefore physically deletable.

### 2.3 RLS

| Table | Policy | Meaning |
|---|---|---|
| `reference_values` | `p_reference_values_read` (SELECT): `active = true OR current_user_role() = 'admin'` | A non-admin never sees a hidden value; an admin sees all. No write policy — writes only through the RPC |
| `serfiyyat_projects` | `p_serfiyyat_projects_read` (SELECT): `active = true OR current_user_role() = 'admin'` | Same shape |
| `serfiyyat_documents` | `p_serfiyyat_documents_read` (SELECT): admin/rehber see all; an anbardar sees only documents of projects linked to their warehouse | Matters for the project usage count — see 4.5 |
| `items` | `items_select`: any recognised role reads; insert/update/delete admin-only | Usage source for `unit` / `category` |
| `warehouses` | (unchanged from Phase 1) | Usage source and namespace for `location` |

### 2.4 `get_reference_values()` — the read path

```sql
CREATE FUNCTION public.get_reference_values()
RETURNS TABLE(id uuid, kind text, name text, active boolean)
LANGUAGE sql STABLE SECURITY DEFINER
AS $$ SELECT r.id, r.kind, r.name, r.active FROM public.reference_values r
      WHERE public.current_user_role() IS NOT NULL
        AND (r.active = TRUE OR public.current_user_role() = 'admin')
      ORDER BY r.kind, r.active DESC, r.name; $$
```

Consequences the React code must respect:

1. It returns **all four** `reference_values` kinds in one call. One RPC feeds
   `channel`, `unit`, `category` and `serfiyyat_channel` — do not call it four
   times.
2. It is the only read path the old platform uses for these kinds
   (`index.html:997`, `6208`). It is `SECURITY DEFINER`, so it also works where
   a direct table read would be filtered.
3. Ordering is `kind, active DESC, name` — hidden values sort last within a
   kind. The «Soraqçalar» table re-sorts anyway, but the default order should
   not be assumed to be plain `name`.
4. A non-admin gets active rows only — invisible to this screen, which is
   admin-only, but relevant to the consumer screens in section 7.

### 2.5 `manage_reference` — the write path, per kind

The public wrapper (read in full during the Phase 2 follow-up) splits on kind:

- `warehouse` and `location` are handled **inside the wrapper**, against
  `warehouses`, with an INTEGER id (`p_id` must match `^[0-9]+$`, ≤ 10 chars,
  ≤ 2147483647);
- every other kind is delegated to `manage_reference_uuid_internal(p_kind,
  p_action, p_id::UUID, p_name, p_meta)` — so `p_id` must be a **UUID string**.

Both require `auth.uid() IS NOT NULL AND current_user_role() = 'admin'`, accept
only `create|update|deactivate|activate|delete`, require a name of ≥ 2
characters for `create`/`update`, and require `p_id` for everything except
`create`.

Kind-by-kind, from the live function bodies:

#### `location` (wrapper, `type = 'layihə'`)

| Action | Server rule |
|---|---|
| create | Rejects if the name already exists in `partners` (case-insensitive): `Bu ad artıq kontragent kimi mövcuddur`. Inserts into `warehouses(name, 'layihə', true)` |
| update | Rejects outright if the value is used: `İstifadə olunmuş anbar/ünvanın adı dəyişdirilmir. Siyahılardan çıxarmaq üçün "Gizlət" istifadə edin.` Otherwise renames. **No cascade** (`cascaded_rows` is always 0) |
| deactivate | The zero-balance check is `p_kind = 'warehouse'` **only** — a location is not balance-checked. The active-anbardar check **does** apply: `Anbara aktiv anbardar təyin olunub` |
| activate | Plain flag flip |
| delete | Rejected if used: `İstifadə olunmuş anbar/ünvan silinmir: "Gizlət" istifadə edin` |
| used = | `EXISTS movements WHERE lower(trim(warehouse)) = old OR lower(trim(partner)) = old` **OR** `EXISTS users WHERE lower(trim(warehouse)) = old` |
| audit | `audit_log`, `table_name = 'warehouses'`, reason `Sorğuçalar: location/<action>` |

#### `channel`, `unit`, `category` (`reference_values`)

| Action | Server rule |
|---|---|
| create | `INSERT reference_values(kind, name)` with kind mapped to `purchase_channel` / `unit` / `item_category`. No collision check beyond the unique index |
| update | Renames, then **cascades**: `channel` → `UPDATE movements SET channel = new WHERE lower(trim(channel)) = lower(trim(old))` (preceded by `lock_reference_labels('ref:channel:', …)`); `unit` → `UPDATE items SET unit = new`; `category` → `UPDATE items SET category = new`. Returns the row count as `cascaded_rows`. **A used name is renameable** — unlike warehouse/location |
| deactivate / activate | Plain flag flip |
| delete | Refused when used: `Dəyər istifadə olunub: silinmir, yalnız gizlədilə bilər`. used = `EXISTS movements WHERE channel = old` / `EXISTS items WHERE unit = old` / `EXISTS items WHERE category = old`, all `lower(trim(...))` |
| audit | `table_name = 'reference_values'` |

#### `project` (`serfiyyat_projects`)

| Action | Server rule |
|---|---|
| meta | `p_meta->>'linked_warehouse'`, trimmed, empty → NULL. **Validated:** must exist in `warehouses` with `type='anbar' AND active=TRUE`, else `Bağlı anbar tapılmadı və ya aktiv deyil: <name>` |
| create | `INSERT serfiyyat_projects(name, linked_warehouse)` |
| update | Sets `name` **and** `linked_warehouse` (so an omitted meta silently clears the link — see Q4). No cascade: `serfiyyat_documents` references the project by `project_id`, so a rename propagates automatically |
| deactivate / activate | Flag flip |
| delete | Refused if any `serfiyyat_documents.project_id = id`: `Layihə sənədlərdə istifadə olunub: silinmir, yalnız gizlədilə bilər` |

#### `serfiyyat_channel` (`reference_values`)

Identical to `channel`, except the cascade target is
`UPDATE serfiyyat_documents SET alinma_kanali = new WHERE lower(trim(alinma_kanali)) = lower(trim(old))`
(with `lock_reference_labels('ref:serfiyyat_channel:', …)`), and the
delete-block checks `serfiyyat_documents.alinma_kanali`.

### 2.6 What "hidden" means on the server

Deactivation is not cosmetic. Three `SECURITY DEFINER` triggers reject writes
that reference a hidden or unknown value:

- `guard_item_unit()` — `Yanlış ölçü vahidi: "%" Sorğuçalarda mövcud deyil və ya
  gizlədilmişdir`, and it only fires when the value actually changes, so an
  unrelated edit of an item whose unit was hidden still saves;
- `guard_item_category()` — the same rule for `items.category`;
- `guard_movement_labels()` — validates `movements.partner` / `movements.channel`
  and takes the same advisory locks (`ref:partner:`, `ref:channel:`) that
  `manage_reference` takes, so a rename and a concurrent insert are serialised.

So: hiding a value keeps history intact and blocks new use — enforced by the
database, not by the UI. Phase 3 must not attempt to re-implement or soften it.

---

## 3. What the old platform's screen does with these kinds

`rRefs()` (`index.html:3008-3074`), `refOpen()` (3077-3122), `refRemove()`
(3125-3150) and `refSend()` (3152-3183) are already ported for two kinds. The
kind-specific parts still missing:

### 3.1 Availability probe — `refServerReady` (2949-2953)

```js
if (kind === 'channel' || kind === 'unit' || kind === 'category') return !!(DB.refs && DB.refs.ready);
if (kind === 'project' || kind === 'serfiyyat_channel') return !!DB.smReady;
return true;                       // warehouse, location, partner
```

`DB.refs.ready` is set only when `get_reference_values()` succeeds (997-1004);
`DB.smReady` only when all three `serfiyyat_*` reads succeed (6191-6206). When a
kind is not ready the old screen:

- greys the kind out in the create selector (`disabled`, 3024);
- omits its rows from the table entirely (`refAllRows`, 2993);
- names it in a banner listing what is unavailable (3010);
- refuses `refOpen` with `Əvvəlcə SQL 011/012 tətbiq edilməlidir` (3079).

This is a real, reachable state, not defensive dead code: `serfiyyat_documents`
is empty today and `sql/032` is described in the source as possibly unapplied.
Phase 3 must reproduce the four behaviours, not silently show an empty table.

### 3.2 Entity sources — `refEntities` (2954-2963)

```js
channel            → DB.refs.channels             (reference_values kind=purchase_channel)
unit               → DB.refs.units                (kind=unit)
category           → DB.refs.cats                 (kind=item_category)
serfiyyat_channel  → DB.refs.serfiyyatChannels    (kind=serfiyyat_channel)
project            → DB.smProjects → {id, name, active, linked_warehouse: p.wh || ''}
location           → DB.locs.filter(kind === 'layihə')      (warehouses.type)
```

### 3.3 Usage counting — `refUsage` (2977-2988)

| kind | Counted over | Cancelled movements excluded? |
|---|---|---|
| `channel` | `normalMovements().filter(m => REF_EQ(m.ch, name))` | **yes** |
| `unit` | `DB.items.filter(i => REF_EQ(i.unit, name))` | n/a |
| `category` | `DB.items.filter(i => REF_EQ(i.category, name))` | n/a |
| `project` | `DB.smDocs.filter(d => d.projectId === x.id)` — **by id, not name** | n/a |
| `serfiyyat_channel` | `DB.smDocs.filter(d => REF_EQ(d.kanal, name))` | n/a |
| `location` | falls through to the default: `normalMovements()` where `warehouse` **or** `partner` matches, **plus** `refStaffCount(name)` (users assigned to it; `1` when the users read failed) | **yes** |

`normalMovements()` (1270) is `IX.movs || operationalMovements()` — the same
cancellation filter Phase 1 ported as `lib/operationalMovements.ts`. No new
cancellation logic is needed; `channel` and `location` reuse it, and the other
four kinds do not filter at all.

`REF_EQ` (2970) is `trim().toLowerCase()` on both sides — already ported as
`lib/refEq.ts`. `project` is the sole kind that matches by **id**.

### 3.4 Dialog fields and the name lock

- `nameLocked = x && used > 0 && (kind === 'warehouse' || kind === 'location')`
  (3085). So `location` behaves like `warehouse`: a used name is read-only and
  «Yadda saxla» is not offered. The other four Phase 3 kinds stay renameable and
  cascade.
- `projectFields` (3093-3095): one `<select>` labelled **Bağlı anbar (anbardar
  giriş haqqı üçün)** listing `DB.whs` (the active `anbar` warehouses) with a
  `— bağlanmayıb —` empty option, plus the hint *«Bu anbara təyin olunmuş
  anbardar yalnız bu layihədə sənəd yarada və hesabatını görə bilər.»*
- The `USERS_ERR` warning (3097-3100) is shown for `warehouse` **and**
  `location`.
- `refSend` meta (3156-3162): `partner` → `{voen, contract, contract_date}`;
  `project` → `{linked_warehouse}`; everything else → `{}`.

---

## 4. Design

### 4.1 Principle: extend, do not fork

Phase 2's `ReferenceDirectoryPage` / `ReferenceDirectoryFormDialog` /
`referenceDirectory.store` are already kind-parameterised. Phase 3 adds data
sources and a per-kind rule table; it does not add a second screen, a second
dialog or a second store. Anything that cannot be expressed as data in the rule
table is a signal that the generalisation is wrong — stop and report rather
than branching the components further.

### 4.2 New and changed modules

```
web/src/
  api/
    referenceValues.api.ts        NEW  get_reference_values() → the 4 rv kinds
    serfiyyatProjects.api.ts      NEW  serfiyyat_projects + serfiyyat_documents (read)
    referenceUsage.api.ts         EXT  usage for all 8 kinds in one pass
    warehouses.api.ts             EXT  (unchanged read; the 'layihə' rows are already fetched)
  types/
    referenceDirectory.ts         EXT  WIRED_KINDS → 8; KIND_RULES table; readiness type
  store/
    referenceDirectory.store.ts   EXT  loads rv + projects + docs; per-kind readiness
  components/reference-directory/
    ReferenceDirectoryFormDialog.tsx  EXT  project field; name lock covers 'location'
  pages/
    ReferenceDirectoryPage.tsx    EXT  8 kinds in both selectors; unavailable-kind banner
```

### 4.3 The rule table (the heart of the phase)

One exported, typed table in `types/referenceDirectory.ts`, so every per-kind
difference is visible in one place and testable without rendering:

| kind | label | source | id | usage | name locked when used | cascade on rename | delete blocked by |
|---|---|---|---|---|---|---|---|
| `warehouse` | Anbar | `warehouses type=anbar` | int→string | movements(wh∥partner)+users | yes | — | movements ∥ users |
| `location` | Ünvan / layihə | `warehouses type=layihə` | int→string | movements(wh∥partner)+users | **yes** | — | movements ∥ users |
| `partner` | Kontragent | `partners` | uuid | movements(partner) | no | movements.partner | movements.partner |
| `channel` | Alınma kanalı | `reference_values purchase_channel` | uuid | movements(channel), operational | no | movements.channel | movements.channel |
| `unit` | Ölçü vahidi | `reference_values unit` | uuid | items(unit) | no | items.unit | items.unit |
| `category` | Mal kateqoriyası | `reference_values item_category` | uuid | items(category) | no | items.category | items.category |
| `project` | Layihə (Sərfiyyat Materialları) | `serfiyyat_projects` | uuid | serfiyyat_documents **by project_id** | no | — (FK) | serfiyyat_documents |
| `serfiyyat_channel` | Alınma kanalı (Sərfiyyat Materialları) | `reference_values serfiyyat_channel` | uuid | serfiyyat_documents(alinma_kanali) | no | serfiyyat_documents.alinma_kanali | serfiyyat_documents.alinma_kanali |

The "cascade" and "delete blocked by" columns are **documentation of the
server's behaviour**, used only to word the dialog's hints. The client never
re-implements them; the refusal always comes from the RPC and is surfaced
verbatim, as Phase 2 already does.

### 4.4 Readiness

`ReferenceReadiness = { referenceValues: boolean; serfiyyat: boolean }`, derived
exactly as the old platform derives it:

- `referenceValues` — `get_reference_values()` resolved without error;
- `serfiyyat` — the `serfiyyat_projects` **and** `serfiyyat_documents` reads
  both resolved without error.

A failed read is **not** an error state for the whole screen: the old platform
logs a warning and carries on with the remaining kinds. The page must show the
same banner naming the unavailable kinds, disable them in the create selector,
and omit their rows. A store-level `error` still applies to the kinds that did
fail in a way Phase 2 already treats as fatal (warehouses/partners), so the two
mechanisms must not be conflated.

### 4.5 Usage counting

`fetchReferenceUsage` keeps its shape — one pass over each source table, all
rows counted at once, `{count, exact}` per `kind|name` key — and gains:

- `items` (paginated, `code, unit, category`) — read only when a `unit` or
  `category` row is listed;
- `serfiyyat_documents` (`id, project_id, alinma_kanali`) — read only when a
  `project` or `serfiyyat_channel` row is listed;
- `project` counts by `project_id`, so its map key must be the **id**, not the
  name. Proposal: extend the key helper to `kind|id-or-name` with the kind's
  rule deciding which — and cover it with a test that a project renamed to
  another project's old name does not inherit its count.

The `exact:false` fail-safe from Phase 2 extends unchanged: if a source a kind
depends on could not be read, that kind's rows are inexact and are treated as in
use (`count ≥ 1`, `?` in the table, no delete offered).

**Known and deliberate divergence, inherited from the old platform:** the UI
counts *operational* movements while the server's delete-block counts *all*
movements. A channel used only by cancelled movements therefore shows `0` and
offers «Tamamilə sil», and the server then refuses. The old platform behaves
identically (`refUsage` uses `normalMovements()`, the RPC does not), so parity
requires copying it. Logged as a risk, not fixed. See Q3.

### 4.6 Dialog

Two additions only:

1. `nameLocked` becomes `entity && usedOrUnknown && (kind === 'warehouse' || kind === 'location')`.
2. A `project` branch rendering the linked-warehouse `<select>` from the active
   `anbar` warehouses already in the store, with the original's label, empty
   option and hint, sending `{linked_warehouse}` as meta.

The `USERS_ERR`-equivalent warning already exists (Phase 2's `usageUnknown`
branch); its wording must extend to `location`.

### 4.7 Realtime

`WATCHED_TABLES` grows from `warehouses, partners, movements, users` to add
`reference_values`, `items`, `serfiyyat_projects`, `serfiyyat_documents` —
eight tables on the one existing `anbar_changes` channel, keeping the single
subscription and the 400 ms debounce. `items` is the busiest of the new four;
if that proves noisy in live use it is a tuning question, not a parity one.

---

## 5. Phased implementation plan

Each step is independently committable, keeps the suite green, and leaves the
screen working. No step may begin before this document is approved.

| Step | Content | Verification |
|---|---|---|
| **3.0** | Regenerate `types/database.ts` from the live schema (controller-run: it needs the access token). Confirm `reference_values`, `serfiyyat_projects`, `serfiyyat_documents` and the `get_reference_values` return type are present | `typecheck` clean; the three tables greppable in the generated file |
| **3.1** | `types/referenceDirectory.ts`: the eight-row `KIND_RULES` table, `WIRED_KINDS` derived from it, the readiness type, the usage-key helper. **Pure data + pure functions, no I/O** | Unit tests: every kind has a rule; labels match `REF_KINDS` verbatim; the key helper separates id-keyed from name-keyed kinds |
| **3.2** | `api/referenceValues.api.ts` — one `get_reference_values()` call, split into the four kinds. `api/serfiyyatProjects.api.ts` — paginated reads of `serfiyyat_projects` and `serfiyyat_documents`. Both report failure as readiness, not as a thrown error | Mocked tests: the RPC is called once for four kinds; a failing read yields `ready:false` and an empty list, never a rejection |
| **3.3** | `api/referenceUsage.api.ts` — items and serfiyyat sources, per-kind counting per the 4.3 table, `exact:false` propagation per source, id-keyed projects | Tests per kind, including: a project counted by id; a serfiyyat channel counted by name; `unit`/`category` unaffected by cancelled movements; a failed `items` read making only unit/category inexact |
| **3.4** | `store/referenceDirectory.store.ts` — load the new sources in parallel, expose readiness, keep the `{ok, error}` load contract | Tests: rows from all available kinds; a kind whose source failed is absent and marked not ready; a failed refresh keeps previous rows |
| **3.5** | `ReferenceDirectoryFormDialog` — the `project` linked-warehouse field, `location` in the name lock, extended hint wording | Component tests: the field renders only for `project`; meta is `{linked_warehouse}`; empty selection sends `''`; a used location is read-only with no «Yadda saxla»; a used channel stays editable |
| **3.6** | `ReferenceDirectoryPage` — eight kinds in both selectors, unavailable kinds disabled in the create selector and named in a banner, their rows omitted | Component tests: the banner names exactly the unavailable kinds; a disabled option cannot open the dialog; the kind filter offers all eight |
| **3.7** | Realtime table list; registry rows merged; final report; full check run | `test`, `typecheck`, `lint`, `build`; registry updated honestly |

Live verification is a separate, explicitly approved step (section 9) — it is
**not** part of any implementation step, and with the Phase 2 write guard in
place it now requires `VITE_ALLOW_LOCAL_WRITES=true` to be set deliberately.

---

## 6. Proposed parity-registry rows

To be merged into `ANBAR_FUNCTIONAL_PARITY_REGISTRY.md` as **Module D** when
implementation begins (principles §10 requires the rows before code, not
after). All start at `NOT STARTED`.

| # | Function | Old ref | Roles | Status |
|---|---|---|---|---|
| D-01 | All eight kinds listed and filterable in one table | 2934-2943, 2990-2999 | admin | `NOT STARTED` |
| D-02 | Readiness probe: unavailable kinds disabled, rows omitted, banner listing them, `refOpen` refusal | 2949-2953, 3010, 3024, 3079 | admin | `NOT STARTED` |
| D-03 | `location` rows sourced from `warehouses.type='layihə'` | 2962 | admin | `NOT STARTED` |
| D-04 | `location` usage = operational movements(warehouse ∥ partner) + assigned users | 2977-2987 | admin | `NOT STARTED` |
| D-05 | `location` name lock when used; hide/activate/delete rules; no rename cascade | 3085, wrapper | admin | `NOT STARTED` |
| D-06 | `channel`/`unit`/`category` rows from `get_reference_values()` in one call | 995-1004, 2955-2957 | admin | `NOT STARTED` |
| D-07 | `channel` usage over operational movements only | 2980 | admin | `NOT STARTED` |
| D-08 | `unit` usage = `items.unit`; `category` usage = `items.category` | 2981-2982 | admin | `NOT STARTED` |
| D-09 | Rename cascade reported for channel/unit/category (`cascaded_rows`) | 3172-3177, RPC | admin | `NOT STARTED` |
| D-10 | `project` rows from `serfiyyat_projects`, incl. `linked_warehouse` | 2960, 6198 | admin | `NOT STARTED` |
| D-11 | `project` linked-warehouse selector: active `anbar` warehouses, empty option, original hint, server validation surfaced | 3093-3095, RPC | admin | `NOT STARTED` |
| D-12 | `project` usage counted by `project_id`, not by name | 2984 | admin | `NOT STARTED` |
| D-13 | `serfiyyat_channel` rows and usage by `serfiyyat_documents.alinma_kanali` | 2961, 2985, 6207-6212 | admin | `NOT STARTED` |
| D-14 | Server refusals for the six kinds surfaced verbatim (rename-when-used, delete-when-used, invalid linked warehouse, duplicate name) | 3178-3182, RPC | admin | `NOT STARTED` |
| D-15 | Realtime refresh covers `reference_values`, `items`, `serfiyyat_projects`, `serfiyyat_documents` | 1163-1181 | admin | `NOT STARTED` |
| D-16 | Server-side rules never exercised from React (as C-17): each kind's delete-block and the linked-warehouse validation | RPC body | admin | `NOT STARTED` |

Registry housekeeping this phase also performs: **D-12 (only two kinds wired)
is closed**, and Module C's `NOT STARTED` row C-17 is superseded by D-16, which
covers all eight kinds. Note the ID collision — the existing deviation table
already uses `D-01…D-14`. Module D's rows must therefore be prefixed
differently (proposal: `M3-01…M3-16`) or the deviation table renamed. Flagged
as Q7 rather than decided unilaterally.

---

## 7. Dependencies the later phases inherit

Phase 3 manages the values; these screens consume them and are **out of scope**.
Documented here so no later phase re-derives them:

| Consumer | Old ref | Rule |
|---|---|---|
| Item form: unit selector | `unitOptions()` 694 | Active `unit` values; falls back to `DEFAULT_UNITS` **only** when the directory never loaded — never to re-expose a hidden value (the source cites "Codex audit v2, F3") |
| Item form: category selector | `categoryOptions()` 695, `categoryOptionsFor()` 699 | Active values, **plus** the item's own current value even if hidden — so opening and saving a card cannot silently change it |
| Movement form: channel | `channelOptions()` 3212-3216 | Active `channel` values; before the directory loads, `DEFAULT_CHANNELS` ∪ channels observed in movements |
| Movement form: destination | `partnerOptions('out')` 3218-3225 | `Sahə üzrə məsul şəxs` + active **locations** + active warehouses. **This is what `location` is for** — outgoing destinations written into `movements.partner` |
| Bulk item import | `parseItemList()` 5640-5647 | Rejects any unit outside the directory; server mirror `guard_item_unit()` |
| Category CSV import | `catImpPreview()` 5808-5813 | Validates against `categoryOptions()`; server mirror `set_item_categories()` |
| Item request (nomenklatura sorğusu) | 2568-2572 | Uses the same two lists; server re-checks in `request_new_item` / `approve_item_request` |
| Auto-categorisation | `CAT_KEYWORDS` 679 | Iterates `categoryOptions()` — a renamed category silently stops matching its keywords |
| Sərfiyyat Materialları | `smActiveChannelNames()` 6216, `smAllowedProjects()` 6220-6225 | Active serfiyyat channels; projects filtered by role — an anbardar may write only to projects whose `linked_warehouse` is their warehouse |
| Dashboard | 2908-2913 | An `Ünvan / layihə` table listing `DB.locs` with turnover per name |

Excel: no export or import writes these directory values. Import **validates**
against them, so a hidden or renamed value changes what an import accepts —
which is exactly why the guards live in the database.

---

## 8. Historical-data and behavioural risks

| # | Risk | Evidence | Consequence |
|---|---|---|---|
| H-1 | **`location` has zero live rows.** The kind can be implemented from the code and the RPC, but nothing can be verified against real data, and creating one to test writes to production | `warehouses type='layihə'` = 0 | `location` cannot reach `LIVE VERIFIED` without a deliberate, approved write. See Q1 |
| H-2 | **`serfiyyat_documents` is empty.** Every project and serfiyyat channel therefore counts as unused, so «Tamamilə sil» is offered for all 11 of them, and the server will not refuse | `serfiyyat_documents` = 0 rows | A misclick during live testing permanently deletes a real project. The Phase 2 write guard is the only thing standing in the way. See Q2 |
| H-3 | UI counts operational movements; the server's delete-block counts all movements | `refUsage` 2980 vs RPC `v_used` | «Tamamilə sil» can be offered and then refused. Faithful to the old platform; copied deliberately. See Q3 |
| H-4 | `project` update sets `linked_warehouse` unconditionally from meta | RPC line 62 | A client that omits the key clears an existing link silently. The old UI always sends the select's value, so it never happens there — the React port must be equally careful. See Q4 |
| H-5 | Case-sensitivity differs by table: `reference_values` and `serfiyyat_projects` are unique case-insensitively, `warehouses`/`partners` case-sensitively | Live indexes | "Ədəd" vs "ədəd" is rejected as a unit but accepted as a location. Surfacing the raw server message is the safe behaviour |
| H-6 | A renamed category silently stops matching `CAT_KEYWORDS`, so auto-categorisation quietly degrades | 679 | Not a Phase 3 defect; a documented consequence of renaming, inherited |
| H-7 | Hidden values are enforced by database triggers, not by the UI | `guard_item_unit`, `guard_item_category`, `guard_movement_labels` | Hiding a unit that 1531 items may reference is safe for history but blocks future edits of those items' unit field. Users should be told this is the server's rule |
| H-8 | Live data is clean today: 0 orphan units, 0 orphan categories, 0 orphan channels, 0 case-duplicates, 0 orphan `linked_warehouse` values | Verified by query | No migration/normalisation task is needed — but this must be re-checked at implementation time, not assumed |
| H-9 | `items` is 1531 rows and `movements` 1915; usage counting now reads both on every refresh | Live counts | Extends existing risk R-01/R-11. Still one pass, not per name; revisit if the tables grow by an order of magnitude |

---

## 9. Live-verification plan (requires separate approval)

Read-only, no approval needed beyond signing in:

1. All eight kinds appear; the kind filter lists all eight in `REF_KINDS` order.
2. Row counts match section 2.2 exactly: 8 channels, 18 units, 16 categories,
   9 projects, 2 serfiyyat channels, 0 locations.
3. Usage numbers compared **side by side with the old platform** on the same
   data — the single most valuable check, and the one that would have caught a
   counting divergence in Phase 1.
4. A used unit/category/channel offers no «Tamamilə sil»; a used location is
   read-only.
5. Unavailable-kind banner: verifiable only by simulating a failed read
   (offline/devtools), not by changing the database.

Write checks, each needing explicit approval at the moment of the action:

6. Create, rename (observing `cascaded_rows`), hide, re-activate and delete a
   throwaway value **of a `reference_values` kind** — the least dangerous,
   since the directory is small and the value is new.
7. A project with and without a linked warehouse, plus the invalid-warehouse
   refusal.
8. `location` — creation is the only way to test it at all (H-1).

The existing temporary test partner must not be deleted without explicit
confirmation.

---

## 10. Questions requiring a user decision

**Q1 — `location` with no data.** There are zero `layihə` rows live. Options:
(a) implement and ship it unverified, marked `CODE VERIFIED` only; (b) approve
creating one throwaway location live so the whole path can be verified, then
delete it; (c) leave `location` out of Phase 3 and keep D-12 partially open.
Recommendation: (b) — it is the only kind whose UI rules (name lock, no
cascade) differ from its siblings, so unverified code is the weaker outcome.

**Q2 — deletable projects.** With `serfiyyat_documents` empty, all 9 projects
show «Tamamilə sil» and the server will not stop a deletion. Options: (a) leave
it — faithful to the old platform, which behaves the same today; (b) require a
typed confirmation of the name for `project` deletion specifically; (c) hide
delete for `project` entirely until documents exist. (a) is the parity answer,
(b) is the safe one and a deliberate, documented deviation.

**Q3 — cancelled-movements mismatch (H-3).** Copy the old platform exactly
(delete offered, server refuses) or count all movements in the UI so the button
matches the server? Copying is the default under principles §1; changing it is
an approved deviation. Recommendation: copy, and log the risk.

**Q4 — project meta.** Should an edit that does not touch the linked-warehouse
select always resend the stored value (the old UI's effective behaviour), or is
clearing on omission acceptable? Recommendation: always resend, and add a
regression test — this is a silent-data-loss shape identical to D-13's date.

**Q5 — Realtime scope.** Adding `items` (1531 rows, actively edited) to the
subscription means a directory screen refreshes whenever anyone edits an item.
Accept, or watch only the four directory tables and accept that a usage number
can be stale until the next manual refresh?

**Q6 — phase size.** Six kinds, three new data sources, one new dialog field.
Split into 3a (`reference_values` kinds: channel/unit/category/serfiyyat_channel
— one source, one shape) and 3b (`location` + `project` — the two structural
outliers)? Recommendation: yes, split; principles §2 warns against migrating
several things at once, and 3b carries every risk in section 8.

**Q7 — registry ID prefix.** The deviations table already uses `D-01…D-14`, so
Module D's function rows would collide. Rename the module rows to `M3-01…M3-16`,
or rename the deviations table's prefix? Recommendation: `M3-` for the new
rows, leaving existing IDs referenced elsewhere untouched.

**Q8 — closing C-17.** Module C's `NOT STARTED` row for "server-side partner
rules never exercised from React" is really the same gap as the proposed D-16
for all eight kinds. Merge them into one cross-kind row, or keep C-17 separate
for traceability?
