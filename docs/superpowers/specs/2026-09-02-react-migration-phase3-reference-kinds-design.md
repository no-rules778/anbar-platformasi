# Phase 3 design — the six remaining Soraqçalar kinds

**Status: research and design, approved via decisions Q1-Q8 (§10, decided
2026-09-02). No code has been written; implementation may begin only under
[`2026-09-02-react-migration-phase3.md`](../plans/2026-09-02-react-migration-phase3.md)'s
task sequence.**

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
serfiyyat_lines      id · document_id FK→serfiyyat_documents · item_code · qty · price · line_sum
                     ⚠ columns inferred from smLoad()'s mapping (index.html:6204), NOT yet read
                     from information_schema. Phase 3 never reads these columns — only whether
                     the table is readable at all (§4.4). Confirm the shape in T1 regardless
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
5. **Critical:** `serfiyyat_channel` data is fetched here, but its **visibility
   and createability** are gated by the Sərfiyyat readiness check (§4.4). Rows
   for `serfiyyat_channel` must be hidden and the create option disabled unless
   `serfiyyat: true` — see §4.4 for the readiness contract.

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

**Read the second line of that probe carefully.** `serfiyyat_channel` is
grouped with `project`, **not** with the three kinds that share its storage
table. Its rows come from `get_reference_values()`, but its availability is
`DB.smReady`. §4.4 carries this through the design; §4.3's rule table gives it
a column of its own so no implementation can accidentally derive availability
from the data source.

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
                                       + serfiyyat_lines readability probe (readiness only, §4.4)
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

| kind | label | source | **readiness** | id | usage | name locked when used | cascade on rename | delete blocked by |
|---|---|---|---|---|---|---|---|---|
| `warehouse` | Anbar | `warehouses type=anbar` | *always* | int→string | movements(wh∥partner)+users | yes | — | movements ∥ users |
| `location` | Ünvan / layihə | `warehouses type=layihə` | *always* | int→string | movements(wh∥partner)+users | **yes** | — | movements ∥ users |
| `partner` | Kontragent | `partners` | *always* | uuid | movements(partner) | no | movements.partner | movements.partner |
| `channel` | Alınma kanalı | `reference_values purchase_channel` | `referenceValues` | uuid | movements(channel), operational | no | movements.channel | movements.channel |
| `unit` | Ölçü vahidi | `reference_values unit` | `referenceValues` | uuid | items(unit) | no | items.unit | items.unit |
| `category` | Mal kateqoriyası | `reference_values item_category` | `referenceValues` | uuid | items(category) | no | items.category | items.category |
| `project` | Layihə (Sərfiyyat Materialları) | `serfiyyat_projects` | **`serfiyyat`** | uuid | serfiyyat_documents **by project_id** | no | — (FK) | serfiyyat_documents |
| `serfiyyat_channel` | Alınma kanalı (Sərfiyyat Materialları) | `reference_values serfiyyat_channel` | **`serfiyyat`** | uuid | serfiyyat_documents(alinma_kanali) | no | serfiyyat_documents.alinma_kanali | serfiyyat_documents.alinma_kanali |

The **readiness** column is deliberately independent of **source**: the two
disagree for `serfiyyat_channel`, whose rows arrive with the
`reference_values` kinds but whose availability follows `project`
(`refServerReady`, 2949-2953). See §4.4. Deriving one column from the other
reintroduces the defect this table is shaped to prevent.

The "cascade" and "delete blocked by" columns are **documentation of the
server's behaviour**, used only to word the dialog's hints. The client never
re-implements them; the refusal always comes from the RPC and is surfaced
verbatim, as Phase 2 already does.

### 4.4 Readiness

`ReferenceReadiness = { referenceValues: boolean; serfiyyat: boolean }`, derived
exactly as the old platform derives it:

- `referenceValues` — `get_reference_values()` resolved without error;
- `serfiyyat` — the `serfiyyat_projects`, `serfiyyat_documents` **and**
  `serfiyyat_lines` reads **all three** resolved without error.

#### Why `serfiyyat_lines` counts, although this phase never reads its data

`smLoad()` (`index.html:6185-6206`) issues one `Promise.all` over three tables
and then guards with a single combined check:

```js
const [pj, docs, lns] = await Promise.all([
  SB.from('serfiyyat_projects')...,
  SB.from('serfiyyat_documents')...,
  SB.from('serfiyyat_lines').select('*')
]);
if (pj.error || docs.error || lns.error) throw (pj.error || docs.error || lns.error);
...
DB.smReady = true;
```

`DB.smReady = true` is the last statement of the `try`. A `serfiyyat_lines`
failure alone therefore throws before it is ever reached, and the whole
Sərfiyyat subsystem — `project` **and** `serfiyyat_channel` — stays
unavailable. This is not incidental: it is the readiness contract, and the
`sql/032` warning in the `catch` is the platform telling the user the *whole*
subsystem is unapplied, not one table of it.

So Phase 3 must read `serfiyyat_lines` even though **no directory row, label,
usage count or dialog field consumes a single one of its columns**. The read
exists solely to reproduce the gate. Reading only projects and documents would
leave both kinds visible in a state where the old platform hides them —
precisely the divergence class principles §1 forbids.

Scope note for the implementation: the read may be a minimal existence probe
(`select('id')` with a small limit) rather than the old platform's `select('*')`,
because only its success or failure is used. That is a permitted efficiency
difference, not a behavioural one — the *outcome* of the probe must match
`smLoad()`'s exactly. Anything stricter (skipping the read, treating its
failure as non-fatal) is a parity break.

#### Readiness is per-kind, and it is not the same as the data source

This is the point the earlier draft got wrong, and it is the reason
`serfiyyat_channel` cannot be treated as "just another `reference_values`
kind". **Where a kind's rows come from and what makes a kind available are two
different questions.** The old platform's `refServerReady()`
(`index.html:2949-2953`) answers the second one, and it puts
`serfiyyat_channel` with `project`, not with its storage siblings:

| kind | data source | readiness flag it is gated on |
|---|---|---|
| `warehouse` | `warehouses type=anbar` | none — always available |
| `location` | `warehouses type=layihə` | none — always available |
| `partner` | `partners` | none — always available |
| `channel` | `get_reference_values()` | `referenceValues` |
| `unit` | `get_reference_values()` | `referenceValues` |
| `category` | `get_reference_values()` | `referenceValues` |
| `project` | `serfiyyat_projects` | **`serfiyyat`** |
| `serfiyyat_channel` | `get_reference_values()` | **`serfiyyat`** |

So `serfiyyat_channel` is the one kind whose data source and readiness gate
disagree: its rows arrive in the same single `get_reference_values()` call as
`channel`/`unit`/`category` — it is **not** fetched a second time, and no extra
RPC is added for it — but it stays hidden and uncreatable until the two
`serfiyyat_*` reads succeed, exactly like `project`.

Concretely, when `serfiyyat` is false but `referenceValues` is true:

- `serfiyyat_channel` rows are **already in memory** and must still be omitted
  from the table (`refAllRows`, 2993);
- the kind is `disabled` in the create selector (3024);
- it is named in the unavailable-kinds banner alongside `project` (3010);
- `refOpen` refuses it with `Əvvəlcə SQL 011/012 tətbiq edilməlidir` (3079);
- `channel`, `unit` and `category` are **unaffected** — they came from the same
  call and remain fully available.

The inverse also holds: when `referenceValues` is false but `serfiyyat` is
true, `serfiyyat_channel` has no rows to show and is unavailable for that
reason instead. A kind is available only when **both** the flag in the table
above and its data source have resolved.

A failed read is **not** an error state for the whole screen: the old platform
logs a warning and carries on with the remaining kinds. The page must show the
same banner naming the unavailable kinds, disable them in the create selector,
and omit their rows. A store-level `error` still applies to the kinds that did
fail in a way Phase 2 already treats as fatal (warehouses/partners), so the two
mechanisms must not be conflated.

Implementation consequence: `KIND_RULES` (§4.3) must carry the readiness flag
as its own field, independent of the source field. Deriving readiness from the
data source is the specific bug this section exists to prevent.

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
| **3.1** | `types/referenceDirectory.ts`: the eight-row `KIND_RULES` table **with readiness as its own field (§4.3)**, `WIRED_KINDS` derived from it, the readiness type, the usage-key helper. **Pure data + pure functions, no I/O** | Unit tests: every kind has a rule; labels match `REF_KINDS` verbatim; the key helper separates id-keyed from name-keyed kinds; **`serfiyyat_channel`'s readiness flag is `serfiyyat`, not `referenceValues`** |
| **3.2** | `api/referenceValues.api.ts` — one `get_reference_values()` call, split into the four kinds. `api/serfiyyatProjects.api.ts` — paginated reads of `serfiyyat_projects` and `serfiyyat_documents`, **plus a readability probe of `serfiyyat_lines`; all three must succeed for `serfiyyat: true`** (§4.4). Both report failure as readiness, not as a thrown error | Mocked tests: the RPC is called once for four kinds; a failing read yields `ready:false` and an empty list, never a rejection; **`serfiyyat_channel` rows are returned by this call even when the serfiyyat reads fail — the gate is applied downstream, not here**; **a `serfiyyat_lines` failure alone yields `serfiyyat:false` while projects and documents both succeeded** |
| **3.3** | `api/referenceUsage.api.ts` — items and serfiyyat sources, per-kind counting per the 4.3 table, `exact:false` propagation per source, id-keyed projects | Tests per kind, including: a project counted by id; a serfiyyat channel counted by name; `unit`/`category` unaffected by cancelled movements; a failed `items` read making only unit/category inexact |
| **3.4** | `store/referenceDirectory.store.ts` — load the new sources in parallel, expose readiness, keep the `{ok, error}` load contract. **Availability = the kind's readiness flag AND its source having resolved (§4.4)** | Tests: rows from all available kinds; a kind whose source failed is absent and marked not ready; a failed refresh keeps previous rows; **the readiness matrix below in full** |
| **3.5** | `ReferenceDirectoryFormDialog` — the `project` linked-warehouse field, `location` in the name lock, extended hint wording | Component tests: the field renders only for `project`; meta is `{linked_warehouse}`; empty selection sends `''`; a used location is read-only with no «Yadda saxla»; a used channel stays editable |
| **3.6** | `ReferenceDirectoryPage` — eight kinds in both selectors, unavailable kinds disabled in the create selector and named in a banner, their rows omitted | Component tests: the banner names exactly the unavailable kinds; a disabled option cannot open the dialog; the kind filter offers all eight; **with `serfiyyat` false, `serfiyyat_channel` is banner-named, disabled and row-less while `channel`/`unit`/`category` stay fully available** |
| **3.7** | Realtime table list; registry rows merged; final report; full check run | `test`, `typecheck`, `lint`, `build`; registry updated honestly |

Live verification is a separate, explicitly approved step (section 9) — it is
**not** part of any implementation step, and with the Phase 2 write guard in
place it now requires `VITE_ALLOW_LOCAL_WRITES=true` to be set deliberately.

### 5.1 Readiness test matrix (mandatory)

Four readiness states are reachable. Every one must be covered by a store test
(step 3.4) and a page test (step 3.6). The `serfiyyat_channel` column is the
whole point of the matrix: it is the only kind that moves independently of the
other three `reference_values` kinds.

`serfiyyat` is a single flag with **three** inputs — `serfiyyat_projects`,
`serfiyyat_documents` and `serfiyyat_lines` must *all* resolve (§4.4). The
matrix below varies the flag; the sub-matrix after it varies its inputs.

| # | `referenceValues` | `serfiyyat` | `channel`/`unit`/`category` | `serfiyyat_channel` | `project` | `warehouse`/`location`/`partner` |
|---|---|---|---|---|---|---|
| M1 | ✅ | ✅ | available | **available** | available | available |
| M2 | ✅ | ❌ | **available** | **hidden, disabled, banner-named** | hidden, disabled, banner-named | available |
| M3 | ❌ | ✅ | hidden, disabled, banner-named | **hidden — no rows were fetched** | available | available |
| M4 | ❌ | ❌ | hidden, disabled, banner-named | **hidden** | hidden, disabled, banner-named | available |

Assertions each row must carry:

- **M2 is the regression test for this correction.** `serfiyyat_channel` rows
  are present in the store's parsed `get_reference_values()` result and must
  still not reach the table, the create selector must offer it `disabled`, and
  `channel`/`unit`/`category` must be untouched. A test that only checks "the
  banner is non-empty" does not pin this — assert the exact kind set.
- **M3** distinguishes the two reasons a kind can be unavailable. Here
  `serfiyyat_channel` is unavailable because its *source* failed, while
  `project` is available: the flags move independently in both directions.
- **M1/M4** are the trivial ends; they exist so the matrix is exhaustive rather
  than illustrative.
- In every state, `warehouse`, `location` and `partner` are unaffected —
  Phase 2's behaviour must be provably unchanged (plan's standing constraint).

`refOpen`'s refusal (`Əvvəlcə SQL 011/012 tətbiq edilməlidir`) is asserted for
`serfiyyat_channel` in M2 specifically, since that is the state where the data
exists and only the gate prevents the dialog from opening.

#### 5.1.1 `serfiyyat` input sub-matrix (mandatory, step 3.2)

The flag is the AND of three independent reads. Each must be shown to veto it
alone, or a future refactor can drop one read without any test failing —
exactly the defect this section was added to close.

| # | `serfiyyat_projects` | `serfiyyat_documents` | `serfiyyat_lines` | `serfiyyat` | Reaches matrix state |
|---|---|---|---|---|---|
| S1 | ✅ | ✅ | ✅ | **true** | M1 / M3 |
| S2 | ❌ | ✅ | ✅ | false | M2 / M4 |
| S3 | ✅ | ❌ | ✅ | false | M2 / M4 |
| S4 | ✅ | ✅ | ❌ | **false** | M2 / M4 |
| S5 | ❌ | ❌ | ❌ | false | M2 / M4 |

**S4 is the regression test for this correction.** Projects and documents both
load, every directory row the screen needs is in memory, and `serfiyyat` must
still be false — hiding `project` and `serfiyyat_channel`. An implementation
that reads only two tables passes S1, S2, S3 and S5 and fails only S4, which is
why S4 cannot be omitted as "obviously covered".

S2 and S3 are not redundant with each other either: they prove the veto is a
genuine three-way AND rather than a check on whichever read happens to be
listed first.

Assert the resulting `serfiyyat: false` **outcome**, not the internal shape of
the probe. Whether the implementation uses `Promise.all` with a combined error
check (as `smLoad()` does) or three separate awaits is unconstrained; only the
outcome is parity.

---

## 6. Parity-registry rows (merged)

**Merged into `ANBAR_FUNCTIONAL_PARITY_REGISTRY.md` as Module D**, all
`NOT STARTED`, per principles §10 (rows before implementation, not after).
The table below is retained here as the authored source; the registry is the
live copy that T10 updates as code lands. IDs use the **`M3-` prefix**, per
the Q7 decision (§10) — this avoids the collision with the existing
deviation table's `D-01…D-14`.

| # | Function | Old ref | Roles | Status |
|---|---|---|---|---|
| M3-01 | All eight kinds listed and filterable in one table | 2934-2943, 2990-2999 | admin | `NOT STARTED` |
| M3-02 | Readiness probe: unavailable kinds disabled, rows omitted, banner listing them, `refOpen` refusal | 2949-2953, 3010, 3024, 3079 | admin | `NOT STARTED` |
| M3-02a | Readiness is per-kind and independent of the data source: `serfiyyat_channel` is gated on `serfiyyat` despite sharing `get_reference_values()` with `channel`/`unit`/`category` (§4.4, matrix §5.1) | 2949-2953 | admin | `NOT STARTED` |
| M3-02b | `serfiyyat` requires **all three** reads — `serfiyyat_projects`, `serfiyyat_documents`, `serfiyyat_lines` — to succeed; a `serfiyyat_lines` failure alone hides `project` and `serfiyyat_channel`, although Phase 3 uses none of its columns (§4.4, sub-matrix §5.1.1 S4) | 6185-6206 | admin | `NOT STARTED` |
| M3-03 | `location` rows sourced from `warehouses.type='layihə'` | 2962 | admin | `NOT STARTED` |
| M3-04 | `location` usage = operational movements(warehouse ∥ partner) + assigned users | 2977-2987 | admin | `NOT STARTED` |
| M3-05 | `location` name lock when used; hide/activate/delete rules; no rename cascade | 3085, wrapper | admin | `NOT STARTED` |
| M3-06 | `channel`/`unit`/`category`/`serfiyyat_channel` rows from `get_reference_values()` in **one** call — including `serfiyyat_channel`, which is fetched here and gated later (M3-02a) | 995-1004, 2955-2957, 6208 | admin | `NOT STARTED` |
| M3-07 | `channel` usage over operational movements only | 2980 | admin | `NOT STARTED` |
| M3-08 | `unit` usage = `items.unit`; `category` usage = `items.category` | 2981-2982 | admin | `NOT STARTED` |
| M3-09 | Rename cascade reported for channel/unit/category (`cascaded_rows`) | 3172-3177, RPC | admin | `NOT STARTED` |
| M3-10 | `project` rows from `serfiyyat_projects`, incl. `linked_warehouse` | 2960, 6198 | admin | `NOT STARTED` |
| M3-11 | `project` linked-warehouse selector: active `anbar` warehouses, empty option, original hint, server validation surfaced; edit always resends the stored value even when unchanged (Q4) | 3093-3095, RPC | admin | `NOT STARTED` |
| M3-12 | `project` usage counted by `project_id`, not by name | 2984 | admin | `NOT STARTED` |
| M3-13 | `serfiyyat_channel` rows (from `get_reference_values()`) and usage by `serfiyyat_documents.alinma_kanali`; availability gated on `serfiyyat` readiness per M3-02a | 2961, 2985, 6207-6212, 2952 | admin | `NOT STARTED` |
| M3-14 | Server refusals for the six Phase 3 kinds surfaced verbatim (rename-when-used, delete-when-used, invalid linked warehouse, duplicate name) | 3178-3182, RPC | admin | `NOT STARTED` |
| M3-15 | Realtime refresh covers `reference_values`, `items`, `serfiyyat_projects`, `serfiyyat_documents` | 1163-1181 | admin | `NOT STARTED` |
| M3-16 | Server-side rules never exercised from React (linked to Module C's C-17, not a merge — closed independently per Q8): each kind's delete-block and the linked-warehouse validation | RPC body | admin | `NOT STARTED` |
| M3-17 | **New deviation (Q2):** typed name confirmation required before permanent `project` deletion — a client-side gate added ahead of the RPC call, not a server change. Explicitly approved safety difference from the old platform, which offers plain «Tamamilə sil» for every kind | §3.4, H-2 | admin | `NOT STARTED` |

Registry housekeeping this phase also performs: the existing `D-12` ("only two
kinds wired") is closed by this phase's completion. `C-17` is **not** closed by
`M3-16` — see Q8 (§10): the two rows are linked, and `C-17` closes only after
its own server-refusal paths are exercised live.

**Verification-ceiling note (Q1, §10):** `M3-03`/`M3-04`/`M3-05` (the
`location` rows) may reach `CODE VERIFIED` and read-only `LIVE VERIFIED`, but
their create/rename/hide/delete write path stays `NOT LIVE VERIFIED` by
decision — no artificial record is created to force it. This is a deliberate,
standing exception to the phase's `ACCEPTED` bar, not a gap to be silently
closed later.

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
| Sərfiyyat documents / reports | `DB.smLines` at 6559, 6579, 6658 | **The only consumers of `serfiyyat_lines` data.** Phase 3 reads that table for its readiness gate alone (§4.4) and maps none of it. The later phase owning these screens adds the `{id, docId, code, qty, price, sum}` mapping (6204) and should reuse Phase 3's read rather than issuing a second one |
| Dashboard | 2908-2913 | An `Ünvan / layihə` table listing `DB.locs` with turnover per name |

Excel: no export or import writes these directory values. Import **validates**
against them, so a hidden or renamed value changes what an import accepts —
which is exactly why the guards live in the database.

---

## 8. Historical-data and behavioural risks

| # | Risk | Evidence | Consequence |
|---|---|---|---|
| H-1 | **`location` has zero live rows.** The kind can be implemented from the code and the RPC, but nothing can be verified against real data, and creating one to test writes to production | `warehouses type='layihə'` = 0 | **DECIDED (Q1, §10):** implement and cover with automated tests + read-only live verification; no artificial record is created. The write path (create/rename/hide/delete) stays `NOT LIVE VERIFIED` until a legitimate record exists or the user separately approves a one-off live write |
| H-2 | **`serfiyyat_documents` is empty.** Every project and serfiyyat channel therefore counts as unused, so «Tamamilə sil» is offered for all 11 of them, and the server will not refuse | `serfiyyat_documents` = 0 rows | **DECIDED (Q2, §10):** a typed name confirmation is required client-side before permanent `project` deletion — an approved safety difference from the old platform (M3-17). The underlying server behaviour (no DB-level stop) is unchanged and the risk remains open for the other kinds |
| H-3 | UI counts operational movements; the server's delete-block counts all movements | `refUsage` 2980 vs RPC `v_used` | **DECIDED (Q3, §10):** preserved unchanged — faithful to the old platform. «Tamamilə sil» can be offered and then refused server-side; the refusal is surfaced verbatim. Accepted, not fixed |
| H-4 | `project` update sets `linked_warehouse` unconditionally from meta | RPC line 62 | **DECIDED (Q4, §10):** every `project` update always resends the stored `linked_warehouse`, whether or not the field was touched. Regression test required (M3-11) |
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
   (offline/devtools), not by changing the database. **Simulate the two
   readiness flags separately**, not just "everything offline" — blocking only
   the `serfiyyat_*` reads must hide `serfiyyat_channel` and `project` while
   leaving `channel`/`unit`/`category` fully usable (matrix state M2). This is
   the live counterpart of the §5.1 regression test, and it is the state the
   old platform reaches today whenever `sql/032` is unapplied.
6. **Block `serfiyyat_lines` alone** (devtools request blocking on that URL
   only, leaving `serfiyyat_projects` and `serfiyyat_documents` to load
   normally) and confirm `project` and `serfiyyat_channel` both disappear —
   sub-matrix state S4, live. Then run the identical block against the **old
   platform** in the other tab and confirm it hides the same two kinds. This
   side-by-side pair is the only check that proves the three-read gate was
   ported rather than approximated, and it is read-only on both sides.

Write checks, each needing explicit approval at the moment of the action:

7. Create, rename (observing `cascaded_rows`), hide, re-activate and delete a
   throwaway value **of a `reference_values` kind** — the least dangerous,
   since the directory is small and the value is new.
8. A project with and without a linked warehouse, plus the invalid-warehouse
   refusal; a project edit that only touches `name` confirmed to preserve the
   stored `linked_warehouse` (Q4/H-4), observed live.
9. Deleting a throwaway project: confirm the typed-name gate (Q2/M3-17)
   actually blocks the RPC call until the name is typed correctly, distinct
   from the server's own (permissive) response once the call is made.

**`location` is excluded from this phase's write checks by decision (Q1,
§10).** No `layihə` row is created live to test it. Its create/rename/hide/
delete path remains `NOT LIVE VERIFIED` until a legitimate record exists or
the user separately approves a one-off live write outside this checklist.

The existing temporary test partner must not be deleted without explicit
confirmation.

---

## 10. Decisions (user, 2026-09-02)

Q1-Q8 were put to the user as open questions. All eight are now decided and
this section is the authority for the plan and the registry rows that follow
from them. Nothing below may be silently revisited during implementation —
new evidence that contradicts a decision is reported, not acted on unilaterally
(principles §7).

**Q1 — `location` with no data. DECIDED: (a), with an explicit live-verification
boundary.** Implement `location` and its empty state; cover it with automated
(mocked) tests and **read-only** live verification (item 1-5 in §9). Do **not**
create an artificial `warehouses type='layihə'` row in the live database to
force a write-path test. Consequence for the registry: `M3-03`, `M3-04`,
`M3-05` (location rows/usage/name-lock) may reach `CODE VERIFIED` and **read-only**
`LIVE VERIFIED` on the empty-state and listing behaviour, but the
create/rename/hide/delete write path for `location` stays **NOT LIVE
VERIFIED** until either a legitimate `layihə` record exists in production for
unrelated reasons, or the user separately approves a one-off live write test.
This is a standing exception to the phase's normal `ACCEPTED` bar — recorded
here so it is not mistaken for an oversight later, and carried into T10/T11 and
into the registry's Module D header.

**Q2 — deletable projects. DECIDED: (b), with the deviation logged.** Require
typing the project's name before its permanent deletion goes through —
specific to `project`, not applied to the other seven kinds. This is an
**explicitly approved safety difference from the old platform** (which offers
plain «Tamamilə sil» with no typed confirmation for any kind, per §3.4). Record
as a new deviation row, **`M3-17`** (same table shape as the existing
deviations like D-13, but under the Q7-decided `M3-` prefix), rather than
folding it into `M3-14`'s "verbatim server refusal" language, since this is a
**client-side gate added before the RPC is
even called**, not a change to what the server returns. `manage_reference`
itself is unchanged — H-2's underlying server behaviour (no DB-level stop) is
therefore unchanged and remains logged as a risk for the other kinds that
share the same low-friction delete.

**Q3 — cancelled-movements mismatch (H-3). DECIDED: preserve original
behaviour, unchanged.** UI usage counting continues to exclude cancelled
movements (`normalMovements()`, §3.3); the server's delete-block continues to
count all historical rows, unchanged (no SQL touched, per the non-goals in
§1). When the server refuses a deletion the UI offered, its message is
surfaced **verbatim** — Phase 2's existing pattern, not a new one. H-3 stays
open as a **known, accepted** divergence between what the UI offers and what
the server allows; it is not a defect to fix in Phase 3.

**Q4 — project meta. DECIDED: yes, always resend.** Every `project`
update — whether or not the linked-warehouse select was touched — resends the
currently saved `linked_warehouse` value as part of `meta`. An edit to `name`
alone must not silently clear an existing link. Regression test required
(§5's step 3.5 and T7; registry row `M3-11`), same shape as D-13's contract-date regression test:
assert that an edit to an unrelated field preserves the stored
`linked_warehouse`.

**Q5 — Realtime scope. DECIDED: yes, add `items`.** `items` joins the
existing single `anbar_changes` channel and subscription alongside
`reference_values`, `serfiyyat_projects`, `serfiyyat_documents` (§4.7). The
400 ms debounce and the single-channel, single-subscription shape are
unchanged — **no second channel is created**. If `items`' write volume proves
noisy in live use, that is a tuning question for a later pass, not a
reopening of this decision.

**Q6 — phase size. DECIDED: split, at the corrected readiness boundary.**

| | Kinds | Rationale |
|---|---|---|
| **3a** | `channel`, `unit`, `category` | One source, one shape, one readiness flag (`referenceValues`). No new dialog field, no name-lock change, no `serfiyyat` plumbing |
| **3b** | `location`, `project`, **`serfiyyat_channel`** | Everything gated on `serfiyyat`, plus the structural outliers. T4 (**all three** serfiyyat reads) and T7 (the project field) live here |

This is the corrected boundary from §4.4, confirmed as final: `serfiyyat_channel`
was originally drafted into 3a because it shares `get_reference_values()` with
`channel`/`unit`/`category`, which was wrong — it is gated on the `serfiyyat`
flag (`refServerReady`, `index.html:2952`), which needs **all three**
Sərfiyyat reads and does not exist until T4, a 3b task. There is no
partial-T4 shortcut that makes it correct in 3a (§ "Q6" discussion below,
retained for the reasoning trail).

3a must carry a test asserting `serfiyyat_channel` is parsed from the shared
RPC response but not listed, so the intermediate state is deliberate and
pinned rather than an accident 3b happens to fix.

**Q7 — registry ID prefix. DECIDED: `M3-`.** New Phase 3 parity-registry rows
use the `M3-` prefix (`M3-01` … `M3-17`, §6), leaving the existing `D-01…D-14`
deviation IDs untouched. §6 carries the full row set under this prefix,
including Q2's new deviation row (`M3-17`); these rows are already merged into
`ANBAR_FUNCTIONAL_PARITY_REGISTRY.md` as `NOT STARTED`, ahead of code. T10
updates their statuses and evidence as implementation proceeds — it does not
perform the merge.

**Q8 — closing C-17. DECIDED: keep C-17 separate, link it to the new Phase 3
row, close only after live verification.** C-17 ("server-side partner rules
never exercised from React") stays open as its own historical/cross-cutting
registry row. The Phase 3 equivalent, **`M3-16`** (§6), covers all eight
kinds and is added as a **linked** row, not a merge — the two
reference each other in the registry text. C-17 is closed **only** once the
server refusal paths it names have actually been exercised and observed live,
not simply because a same-shaped row exists for the newer kinds. This keeps
the traceability of what was verified when, rather than closing a gap on the
strength of an unrelated phase's code existing.

---

### Reasoning trail: why the Q6 split moved (kept for context)

The earlier draft put `serfiyyat_channel` in 3a on the grounds that it shares
a data source with `channel`/`unit`/`category`. That grouping was wrong:
`serfiyyat_channel` is gated on the `serfiyyat` readiness flag, which only
exists once T4 is built — and T4 belongs to 3b. Grouping by source would have
shipped a kind in 3a whose availability rule could not yet be evaluated, i.e.
it would have been silently shown whenever Sərfiyyat was unavailable.

`serfiyyat` requires **all three** Sərfiyyat reads, `serfiyyat_lines` included
(§4.4), even though no directory row consumes a single column of that table.
Putting `serfiyyat_channel` in 3a would therefore mean pulling the complete
three-read probe forward — the entire substance of T4. The dependency is not a
technicality that a partial read could work around; it is the whole task.

`serfiyyat_channel` in 3b costs 3b almost nothing — its rows are already parsed
in 3a's `referenceValues.api.ts`; 3b only adds the readiness gate that hides
them. Splitting the other way would mean either building T4 twice or shipping
3a with a knowingly incorrect availability rule.
