import { supabase } from './supabase'

/** One row of `serfiyyat_projects`. */
export interface SerfiyyatProject {
  id: string
  name: string
  active: boolean
  /** '' when the project is not bound to a warehouse yet. */
  linkedWarehouse: string
}

/** The `serfiyyat_documents` fields the directory screen counts usage over. */
export interface SerfiyyatDocumentRef {
  id: string
  projectId: string
  /** The serfiyyat channel name written on the document. */
  kanal: string
}

export interface SerfiyyatResult {
  projects: SerfiyyatProject[]
  documents: SerfiyyatDocumentRef[]
  /* DB.smReady (index.html:6206). True only when ALL THREE reads succeeded —
     see the note on fetchSerfiyyat below. */
  ready: boolean
}

const PAGE_SIZE = 1000

function empty(): SerfiyyatResult {
  return { projects: [], documents: [], ready: false }
}

/** Paginated read; `ok:false` on the first error, like the other API modules. */
async function readAll<T>(
  table: 'serfiyyat_projects' | 'serfiyyat_documents' | 'serfiyyat_lines',
  columns: string,
  orderBy: string,
): Promise<{ rows: T[]; ok: boolean }> {
  const rows: T[] = []
  let from = 0
  for (let guard = 0; guard < 200; guard++) {
    const { data, error } = await supabase
      .from(table)
      .select(columns)
      .order(orderBy)
      .range(from, from + PAGE_SIZE - 1)
    if (error) return { rows, ok: false }
    const batch = (data ?? []) as T[]
    rows.push(...batch)
    if (batch.length < PAGE_SIZE) break
    from += PAGE_SIZE
  }
  return { rows, ok: true }
}

/* Ported from smLoad() (index.html:6185-6206).

   THE READINESS RULE, which is easy to get wrong: `serfiyyat` is true only when
   `serfiyyat_projects`, `serfiyyat_documents` AND `serfiyyat_lines` all read
   successfully. The original issues one Promise.all over the three tables and
   guards with a single combined check —

       if (pj.error || docs.error || lns.error) throw (...);
       ...
       DB.smReady = true;              // last statement of the try

   — so a `serfiyyat_lines` failure alone throws before `DB.smReady = true` is
   ever reached, leaving the whole Sərfiyyat subsystem (BOTH `project` and
   `serfiyyat_channel`) unavailable. That is the contract, not an accident: the
   sql/032 warning in its catch tells the user the whole subsystem is
   unapplied, not one table of it.

   Phase 3 therefore reads `serfiyyat_lines` even though it maps and displays
   none of its columns — only its success or failure is consumed. The read is a
   minimal existence probe rather than the original's `select('*')`, which is a
   permitted efficiency difference: the OUTCOME must match smLoad()'s, and it
   does. Skipping the read, or treating its failure as non-fatal, would be a
   parity break (design §4.4, registry M3-02b, sub-matrix S4).

   Like the reference-values load, failure is reported as `ready:false` and
   never thrown — including a rejected promise (network/fetch), which is a
   distinct shape from a returned `{ error }`. See M3-06a: an escaping
   rejection would break the whole Soraqçalar page via the store's Promise.all. */
export async function fetchSerfiyyat(): Promise<SerfiyyatResult> {
  try {
    const [projects, documents, lines] = await Promise.all([
      readAll<{ id: string; name: string; active: boolean | null; linked_warehouse: string | null }>(
        'serfiyyat_projects',
        'id,name,active,linked_warehouse',
        'name',
      ),
      readAll<{ id: string; project_id: string; alinma_kanali: string | null }>(
        'serfiyyat_documents',
        'id,project_id,alinma_kanali',
        'id',
      ),
      /* Readability probe only — no column of this table is used. */
      readAll<{ id: string }>('serfiyyat_lines', 'id', 'id'),
    ])

    if (!projects.ok || !documents.ok || !lines.ok) return empty()

    return {
      projects: projects.rows.map((p) => ({
        id: String(p.id),
        name: p.name,
        active: p.active !== false,
        linkedWarehouse: p.linked_warehouse ?? '',
      })),
      documents: documents.rows.map((d) => ({
        id: String(d.id),
        projectId: String(d.project_id),
        kanal: d.alinma_kanali ?? '',
      })),
      ready: true,
    }
  } catch {
    return empty()
  }
}
