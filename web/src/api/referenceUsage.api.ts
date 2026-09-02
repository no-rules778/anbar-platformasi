import { supabase } from './supabase'
import { excludeCancelled } from '../lib/operationalMovements'
import { refEq } from '../lib/refEq'
import { usageKey, type WiredKind } from '../types/referenceDirectory'

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
}

const PAGE_SIZE = 1000

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
      .select('id,note,doc_num,warehouse,partner')
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

/* Usage counts behind the "İstifadə" column and the rename/delete decisions,
   ported from refUsage() (index.html:2977-2988). The two wired kinds count
   different things, exactly as the original does:

     warehouse — operational movements whose `warehouse` OR `partner` equals
                 the name (index.html:2986), plus the users assigned to it
                 (refStaffCount, 2973-2976);
     partner   — operational movements whose `partner` equals the name only
                 (index.html:2983). Users are irrelevant to a partner.

   Both read the same single pass over the data, so adding kinds costs no
   extra round trips. A failed `users` read only makes warehouse rows
   inexact — a partner's count does not depend on that table. */
export async function fetchReferenceUsage(
  entities: readonly { kind: WiredKind; name: string }[],
): Promise<Map<string, ReferenceUsage>> {
  const needsUsers = entities.some((e) => e.kind === 'warehouse')
  const [movements, staff] = await Promise.all([
    fetchMovementRefs(),
    needsUsers ? fetchUserWarehouses() : Promise.resolve({ warehouses: [], ok: true }),
  ])
  const operational = excludeCancelled(movements.rows)

  const result = new Map<string, ReferenceUsage>()
  for (const { kind, name } of entities) {
    const inMovements = operational.filter((m) =>
      kind === 'warehouse'
        ? refEq(m.warehouse, name) || refEq(m.partner, name)
        : refEq(m.partner, name),
    ).length
    const inStaff = kind === 'warehouse' ? staff.warehouses.filter((w) => refEq(w, name)).length : 0

    const ok = movements.ok && (kind === 'warehouse' ? staff.ok : true)
    const count = inMovements + inStaff
    result.set(usageKey(kind, name), ok ? { count, exact: true } : { count: Math.max(count, 1), exact: false })
  }
  return result
}
