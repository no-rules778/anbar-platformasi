import { supabase } from './supabase'
import { blockedReason } from '../lib/mutationGuard'
import type { SmDocument, SmDraftLine, SmLine, SmProject } from '../lib/serfiyyat'

/* «Sərfiyyat Materialları» data access — the legacy smLoad() (index.html:6186-6213)
   and the three RPCs of sql/032.

   THIS IS THE PAGE'S OWN SNAPSHOT READER (D-N2, M13-10).
   It deliberately does NOT reuse or widen `fetchSerfiyyat()`
   (api/serfiyyatProjects.api.ts), whose narrow column set —
   `id,name,active,linked_warehouse`, `id,project_id,alinma_kanali` and a bare
   existence probe over lines — is the ACCEPTED Phase 3 contract for the
   Soraqçalar usage counter. This page needs every document header column and
   every line column. Widening a shared narrow reader to serve a new page is
   exactly the M12-10 fan-out defect Codex corrected in Phase 12.

   THE READINESS RULE (M13-10, M13-13), which is easy to get wrong: readiness
   is true only when ALL THREE core table reads succeed. Legacy issues one
   Promise.all over projects, documents and lines and throws if ANY errored,
   setting `DB.smReady = true` only as the try block's last statement, so a
   `serfiyyat_lines` failure alone leaves the whole subsystem unavailable.

   THE REFERENCE READ IS DIFFERENT, AND THE TWO MUST NOT MERGE (M13-12).
   `get_reference_values` sits in its OWN try/catch (6207-6212): its failure
   empties the channel list but does NOT clear readiness. That is why the
   channels are fetched by the STORE alongside this reader rather than inside
   it — folding them in here would make a reference failure fatal.

   EVERY WRITE IS AN RPC (M13-90). All three `serfiyyat_*` tables grant
   `authenticated` only SELECT (schema 5876-5898), so a direct PostgREST write
   is refused for every role INCLUDING admin. Nothing in this file INSERTs,
   UPDATEs or DELETEs. */

export interface SerfiyyatSnapshot {
  projects: SmProject[]
  documents: SmDocument[]
  lines: SmLine[]
  ok: boolean
  error: string | null
}

const FAIL_READ = 'Sərfiyyat Materialları yüklənmədi'

const msg = (e: unknown, fallback: string): string =>
  (e instanceof Error && e.message ? e.message : fallback)

const PAGE_SIZE = 1000
const MAX_PAGES = 200

interface ProjectRow { id: string; name: string; linked_warehouse: string | null; active: boolean | null }
interface DocumentRow {
  id: string; doc_num: string; project_id: string; kontragent: string | null
  avtomobil_nomresi: string | null; alinma_kanali: string | null; invoice_num: string | null
  doc_date: string; note: string | null; created_by: string | null; created_at: string | null
}
interface LineRow {
  id: string; document_id: string; item_code: string
  qty: number | string | null; price: number | string | null; line_sum: number | string | null
}

/** PostgREST caps a response at 1000 rows, so read in pages (fetchAll, 847-862). */
async function readAll<T>(
  table: 'serfiyyat_projects' | 'serfiyyat_documents' | 'serfiyyat_lines',
  order: { column: string; ascending?: boolean },
): Promise<{ rows: T[]; ok: boolean; error: string | null }> {
  const rows: T[] = []
  for (let page = 0; page < MAX_PAGES; page++) {
    const from = page * PAGE_SIZE
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .order(order.column, { ascending: order.ascending ?? true })
      .range(from, from + PAGE_SIZE - 1)
    if (error) return { rows: [], ok: false, error: error.message || FAIL_READ }
    const batch = (data ?? []) as T[]
    rows.push(...batch)
    if (batch.length < PAGE_SIZE) break
  }
  return { rows, ok: true, error: null }
}

/** index.html:6197 — the project view model. */
export const mapProject = (r: ProjectRow): SmProject => ({
  id: String(r.id),
  name: r.name,
  wh: r.linked_warehouse || '',
  active: r.active !== false,
})

/** index.html:6198-6202 — the document view model, every empty value defaulted. */
export const mapDocument = (r: DocumentRow): SmDocument => ({
  id: String(r.id),
  num: r.doc_num,
  projectId: String(r.project_id),
  kontragent: r.kontragent || '',
  avto: r.avtomobil_nomresi || '',
  kanal: r.alinma_kanali || '',
  iv: r.invoice_num || '',
  d: r.doc_date,
  note: r.note || '',
  by: r.created_by || '',
  /* `new Date(...).getTime()` else 0; `|| 0` also absorbs an unparseable
     date, which yields NaN in legacy. */
  ts: r.created_at ? new Date(r.created_at).getTime() || 0 : 0,
})

/** index.html:6203 — the line view model; `sum` is the STORED generated column. */
export const mapLine = (r: LineRow): SmLine => ({
  id: String(r.id),
  docId: String(r.document_id),
  code: r.item_code,
  qty: parseFloat(String(r.qty)) || 0,
  price: parseFloat(String(r.price)) || 0,
  sum: parseFloat(String(r.line_sum)) || 0,
})

/**
 * M13-10, M13-11, M13-13 — reads the three `serfiyyat_*` tables and nothing
 * else. The client sends NO row filter: RLS decides what an anbardar, a
 * rehber or an admin sees (schema 5753-5764).
 *
 * Never throws. Both failure shapes are normalised into an explicit failed
 * result — a returned `{ error }` and a rejected promise — and a failure is
 * never represented as a successful empty snapshot, which would tell the user
 * "no documents" when the truth is "we could not find out".
 */
export async function fetchSerfiyyatSnapshot(): Promise<SerfiyyatSnapshot> {
  try {
    const [projects, documents, lines] = await Promise.all([
      readAll<ProjectRow>('serfiyyat_projects', { column: 'name' }),
      readAll<DocumentRow>('serfiyyat_documents', { column: 'doc_date', ascending: false }),
      readAll<LineRow>('serfiyyat_lines', { column: 'id' }),
    ])

    /* ALL THREE must succeed — a lines failure alone is fatal (M13-10). */
    if (!projects.ok || !documents.ok || !lines.ok) {
      const error = (!projects.ok ? projects.error : !documents.ok ? documents.error : lines.error)
      return { projects: [], documents: [], lines: [], ok: false, error: error ?? FAIL_READ }
    }

    return {
      projects: projects.rows.map(mapProject),
      documents: documents.rows.map(mapDocument),
      lines: lines.rows.map(mapLine),
      ok: true,
      error: null,
    }
  } catch (e) {
    return { projects: [], documents: [], lines: [], ok: false, error: msg(e, FAIL_READ) }
  }
}

export interface RpcResult<T = unknown> {
  ok: boolean
  data: T | null
  error: string | null
}

/* Every wrapper below calls blockedReason() FIRST (M13-97), so a stray
   localhost write is refused before the RPC is dispatched, and returns
   `{ ok, data, error }` rather than throwing. */
async function callRpc<T>(
  action: Parameters<typeof blockedReason>[0],
  fn: string,
  args: Record<string, unknown>,
): Promise<RpcResult<T>> {
  const blocked = blockedReason(action)
  if (blocked) return { ok: false, data: null, error: blocked }
  try {
    /* The generated Args types are per-RPC unions; this module is the single
       typed boundary in front of them, so the cast is contained here. */
    const { data, error } = await supabase.rpc(fn as never, args as never)
    if (error) return { ok: false, data: null, error: error.message || 'server xətası' }
    return { ok: true, data: (data ?? null) as T, error: null }
  } catch (e) {
    return { ok: false, data: null, error: msg(e, 'server xətası') }
  }
}

/** M13-51 — empty → null, exactly as legacy sends it (`$('#sm-kontragent').value || null`). */
const orNull = (v: string | null | undefined): string | null => (v ? v : null)

/** The header + lines every submit sends (index.html:6533-6541). */
export interface SerfiyyatDocumentInput {
  projectId: string
  docDate: string
  kontragent?: string | null
  avtomobil?: string | null
  kanal?: string | null
  invoiceNum?: string | null
  note?: string | null
  lines: readonly SmDraftLine[]
}

/** M13-51 — the shared argument object; `p_doc_id` is prepended for an edit. */
function documentArgs(input: SerfiyyatDocumentInput): Record<string, unknown> {
  return {
    p_project_id: input.projectId,
    p_doc_date: input.docDate,
    p_kontragent: orNull(input.kontragent),
    p_avtomobil_nomresi: orNull(input.avtomobil),
    p_alinma_kanali: orNull(input.kanal),
    p_invoice_num: orNull(input.invoiceNum),
    p_note: orNull(input.note),
    /* Exactly {code, qty, price} — no creator, warehouse or document number
       is sent, because the signature accepts none (schema 2398). */
    p_lines: input.lines.map((l) => ({ code: l.code, qty: l.qty, price: l.price })),
  }
}

export interface SerfiyyatDocumentReply {
  ok?: boolean
  id?: string
  doc_num?: string
  lines?: number
}

/**
 * M13-51, M13-52 — `create_serfiyyat_document`.
 *
 * The server independently re-checks role ∈ {admin, anbardar}, the anbardar's
 * warehouse-to-project binding, project activity, the date, the channel and
 * every line (schema 2416-2474). None of those refusals is satisfied by this
 * client's own validation.
 */
export function createSerfiyyatDocument(
  input: SerfiyyatDocumentInput,
): Promise<RpcResult<SerfiyyatDocumentReply>> {
  return callRpc('sm.create', 'create_serfiyyat_document', documentArgs(input))
}

/**
 * M13-52, M13-93 — `edit_serfiyyat_document`, ADMIN-ONLY server-side.
 *
 * It locks the document `FOR UPDATE`, validates every line in a FIRST PASS
 * before any write, then DELETEs and re-INSERTs every line — so line ids are
 * NOT stable across an edit (schema 2716-2795). Nothing in the browser
 * reveals that.
 */
export function editSerfiyyatDocument(
  docId: string,
  input: SerfiyyatDocumentInput,
): Promise<RpcResult<SerfiyyatDocumentReply>> {
  return callRpc('sm.edit', 'edit_serfiyyat_document', { p_doc_id: docId, ...documentArgs(input) })
}

/**
 * M13-71, M13-94 — `delete_serfiyyat_document`, ADMIN-ONLY server-side.
 *
 * IRREVERSIBLE: the document row is DELETEd and its lines cascade (schema
 * 5505). There is no reversal document, unlike the movements module — only
 * the `audit_log` row survives, carrying the full prior document and its
 * lines in `old_values`.
 */
export function deleteSerfiyyatDocument(docId: string): Promise<RpcResult<SerfiyyatDocumentReply>> {
  return callRpc('sm.delete', 'delete_serfiyyat_document', { p_doc_id: docId })
}
