import { supabase } from './supabase'
import { excludeCancelled } from '../lib/operationalMovements'
import { refEq } from '../lib/refEq'
import { usageKey, type WiredKind } from '../types/referenceDirectory'
import type { SerfiyyatDocumentRef } from './serfiyyatProjects.api'

export interface ReferenceUsage {
  /** Operational (non-cancelled) references, same definition as refUsage(). */
  count: number
  /** False when a source this kind depends on could not be read. The count is
      then NOT trustworthy and callers MUST treat the value as in use —
      mirroring the original's fail-safe (`if (USERS_ERR) return 1`,
      index.html:2971-2976, with the red warning at 3096-3100). */
  exact: boolean
}

interface MovementUsageRow {
  id: string | number
  note: string | null
  doc_num: string | null
  warehouse: string | null
  partner: string | null
  channel: string | null
}

interface ItemUsageRow {
  unit: string | null
  category: string | null
}

const PAGE_SIZE = 1000

/** Kinds whose usage is counted over `items` rather than `movements`. */
const ITEM_KINDS: readonly WiredKind[] = ['unit', 'category']

/* One paginated pass over `movements`, ordered by id so page boundaries are
   stable. The production platform loads this table in full on every login
   (index.html:868-874) and matches names in JavaScript, so doing the same
   reproduces REF_EQ exactly — no SQL `ilike`, which would neither trim the
   stored value nor treat `%`/`_` as literal characters. */
async function fetchMovementRefs(): Promise<{ rows: MovementUsageRow[]; ok: boolean }> {
  const rows: MovementUsageRow[] = []
  let from = 0
  for (let guard = 0; guard < 200; guard++) {
    const { data, error } = await supabase
      .from('movements')
      .select('id,note,doc_num,warehouse,partner,channel')
      .order('id')
      .range(from, from + PAGE_SIZE - 1)
    if (error) return { rows, ok: false }
    const batch = (data ?? []) as MovementUsageRow[]
    rows.push(...batch)
    if (batch.length < PAGE_SIZE) break
    from += PAGE_SIZE
  }
  return { rows, ok: true }
}

/** The warehouse assigned to each user — counted for warehouses only. */
async function fetchUserWarehouses(): Promise<{ warehouses: (string | null)[]; ok: boolean }> {
  const warehouses: (string | null)[] = []
  let from = 0
  for (let guard = 0; guard < 200; guard++) {
    const { data, error } = await supabase
      .from('users')
      .select('warehouse')
      .order('id')
      .range(from, from + PAGE_SIZE - 1)
    if (error) return { warehouses, ok: false }
    const batch = (data ?? []) as { warehouse: string | null }[]
    warehouses.push(...batch.map((u) => u.warehouse))
    if (batch.length < PAGE_SIZE) break
    from += PAGE_SIZE
  }
  return { warehouses, ok: true }
}

/** The unit/category of every item — counted for the `unit`/`category` kinds. */
async function fetchItemRefs(): Promise<{ rows: ItemUsageRow[]; ok: boolean }> {
  const rows: ItemUsageRow[] = []
  let from = 0
  for (let guard = 0; guard < 200; guard++) {
    const { data, error } = await supabase
      .from('items')
      .select('code,unit,category')
      .order('code')
      .range(from, from + PAGE_SIZE - 1)
    if (error) return { rows, ok: false }
    const batch = (data ?? []) as ItemUsageRow[]
    rows.push(...batch)
    if (batch.length < PAGE_SIZE) break
    from += PAGE_SIZE
  }
  return { rows, ok: true }
}

/* Usage counts behind the "İstifadə" column and the rename/delete decisions,
   ported from refUsage() (index.html:2977-2988). Each kind counts something
   different, exactly as the original does:

     warehouse — operational movements whose `warehouse` OR `partner` equals
                 the name (index.html:2986), plus the users assigned to it
                 (refStaffCount, 2973-2976);
     partner   — operational movements whose `partner` equals the name only
                 (index.html:2983). Users are irrelevant to a partner;
     channel   — operational movements whose `channel` equals the name
                 (index.html:2980);
     unit      — items whose `unit` equals the name (2981);
     category  — items whose `category` equals the name (2982).

   Note which kinds filter cancellations and which do not: `normalMovements()`
   wraps the movement-based kinds, while unit/category count DB.items directly,
   where cancellation has no meaning. Copying that distinction matters — adding
   a filter to the item kinds would silently change counts.

   Each source is read at most once for the whole call, so adding kinds costs no
   extra round trips. Failure is scoped per source: a failed `users` read makes
   only warehouse rows inexact, a failed `items` read only unit/category. */
export interface UsageEntity {
  kind: WiredKind
  /** Needed by `project`, which is counted by id (index.html:2984). */
  id: string
  name: string
}

export interface UsageSources {
  /* Sərfiyyat documents, already loaded by the store for the directory rows.
     Passing them in avoids a second read of the same table. `null` means the
     Sərfiyyat subsystem is unavailable, so its two kinds are inexact. */
  serfiyyatDocuments: readonly SerfiyyatDocumentRef[] | null
}

/** Kinds counted from `movements`, i.e. everything except the item and serfiyyat kinds. */
const MOVEMENT_KINDS: readonly WiredKind[] = ['warehouse', 'location', 'partner', 'channel']
/** Kinds counted from `serfiyyat_documents`. */
const SERFIYYAT_KINDS: readonly WiredKind[] = ['project', 'serfiyyat_channel']

export async function fetchReferenceUsage(
  entities: readonly UsageEntity[],
  sources: UsageSources = { serfiyyatDocuments: null },
): Promise<Map<string, ReferenceUsage>> {
  /* `location` counts users too: refUsage falls through to the warehouse
     branch for it, which adds refStaffCount (index.html:2986-2987). */
  const needsUsers = entities.some((e) => e.kind === 'warehouse' || e.kind === 'location')
  const needsMovements = entities.some((e) => MOVEMENT_KINDS.includes(e.kind))
  const needsItems = entities.some((e) => ITEM_KINDS.includes(e.kind))

  const [movements, staff, items] = await Promise.all([
    needsMovements ? fetchMovementRefs() : Promise.resolve({ rows: [], ok: true }),
    needsUsers ? fetchUserWarehouses() : Promise.resolve({ warehouses: [], ok: true }),
    needsItems ? fetchItemRefs() : Promise.resolve({ rows: [], ok: true }),
  ])
  const operational = excludeCancelled(movements.rows)
  const docs = sources.serfiyyatDocuments

  const result = new Map<string, ReferenceUsage>()
  for (const { kind, id, name } of entities) {
    let count: number
    let ok: boolean

    if (kind === 'unit' || kind === 'category') {
      count = items.rows.filter((i) => refEq(kind === 'unit' ? i.unit : i.category, name)).length
      ok = items.ok
    } else if (SERFIYYAT_KINDS.includes(kind)) {
      /* project matches by id, serfiyyat_channel by name (2984-2985). */
      count = (docs ?? []).filter((d) => (kind === 'project' ? d.projectId === id : refEq(d.kanal, name))).length
      ok = docs !== null
    } else {
      const inMovements = operational.filter((m) =>
        kind === 'warehouse' || kind === 'location'
          ? refEq(m.warehouse, name) || refEq(m.partner, name)
          : kind === 'channel'
            ? refEq(m.channel, name)
            : refEq(m.partner, name),
      ).length
      const inStaff = needsUsersFor(kind) ? staff.warehouses.filter((w) => refEq(w, name)).length : 0
      count = inMovements + inStaff
      ok = movements.ok && (needsUsersFor(kind) ? staff.ok : true)
    }

    /* project is keyed by id so a rename cannot inherit another's count. */
    const key = kind === 'project' ? usageKey(kind, id) : usageKey(kind, name)
    result.set(key, ok ? { count, exact: true } : { count: Math.max(count, 1), exact: false })
  }
  return result
}

function needsUsersFor(kind: WiredKind): boolean {
  return kind === 'warehouse' || kind === 'location'
}
