import type { ItemRow } from '../api/items.api'
import { isAdmin, isAnbardar, type Me } from './roles'

/* «Sərfiyyat Materialları» pure logic — the helpers rSm() calls directly
   (index.html:6216-6228, 6317-6341, 6514-6524, 6577-6591).

   EVERYTHING here is a BROWSER AFFORDANCE or a display rule. Not one function
   in this file is a permission: `sql/032` re-checks role, warehouse binding,
   project state, channel validity and every line server-side and is the only
   authority (M13-05/M13-06 vs M13-90/M13-91). A caller that treats
   `canWrite()` or `allowedProjects()` as security has misread them. */

/** One row of `serfiyyat_projects`, as smLoad() maps it (index.html:6197). */
export interface SmProject {
  id: string
  name: string
  /** `linked_warehouse`; '' when the project is not bound to a warehouse. */
  wh: string
  active: boolean
}

/** One row of `serfiyyat_documents`, as smLoad() maps it (6198-6202). */
export interface SmDocument {
  id: string
  num: string
  projectId: string
  kontragent: string
  avto: string
  kanal: string
  iv: string
  /** `doc_date`, an ISO `YYYY-MM-DD` string. */
  d: string
  note: string
  /** `created_by` — the author's user id. */
  by: string
  /** `created_at` as epoch ms, else 0. */
  ts: number
}

/** One row of `serfiyyat_lines`, as smLoad() maps it (6203). */
export interface SmLine {
  id: string
  docId: string
  code: string
  qty: number
  price: number
  /** The STORED generated column `round(qty*price, 2)` — never recomputed. */
  sum: number
}

/** A draft line held in the store before submit (6337). */
export interface SmDraftLine {
  code: string
  qty: number
  price: number
}

/** One flattened report row — smReportRows() (6583-6589). */
export interface SmReportRow {
  d: string
  proj: string
  item: string
  code: string
  unit: string
  qty: number
  price: number
  sum: number
  kontragent: string
  avto: string
  kanal: string
  iv: string
  note: string
  /** Resolved email, falling back to the RAW uuid — D-N6 (M13-77). */
  by: string
  docNum: string
}

/**
 * M13-06, M13-07 — `smAllowedProjects(forWrite)` (index.html:6220-6225).
 *
 * Inactive projects are excluded in EVERY branch. The `forWrite` asymmetry is
 * load-bearing and deliberate: a rehber gets NO project for writing but sees
 * EVERY active project's rows in the report, so a single-value test cannot
 * separate the two (M13-07). An anbardar with no warehouse falls through to
 * the same branch as a rehber, because `ME.wh` is falsy.
 *
 * AFFORDANCE ONLY — `create_serfiyyat_document` re-checks the same
 * warehouse-to-project binding server-side (schema 2420-2427).
 */
export function allowedProjects(
  me: Me | null,
  projects: readonly SmProject[],
  forWrite: boolean,
): SmProject[] {
  const active = projects.filter((p) => p.active)
  if (isAdmin(me)) return active
  if (isAnbardar(me) && me?.wh) return active.filter((p) => p.wh === me.wh)
  return forWrite ? [] : active
}

/**
 * M13-05 — `smCanWrite()` (index.html:6226). Admin or anbardar; a rehber is
 * excluded.
 *
 * This is a browser AFFORDANCE, never the authority: the server raises
 * «İcazə yoxdur: Sərfiyyat Materialları sənədini yalnız Admin və ya Anbardar
 * yarada bilər» independently (schema 2416-2418).
 */
export const canWrite = (me: Me | null): boolean => isAdmin(me) || isAnbardar(me)

/** `smDocById()` — index.html:6227. */
export const docById = (docs: readonly SmDocument[], id: string): SmDocument | undefined =>
  docs.find((d) => d.id === id)

/** `smProjById()` — index.html:6228. */
export const projById = (projects: readonly SmProject[], id: string): SmProject | undefined =>
  projects.find((p) => p.id === id)

/** M13-30 — active channel names only, for the dropdowns (index.html:6216). */
export const activeChannelNames = (
  channels: readonly { name: string; active: boolean }[],
): string[] => channels.filter((c) => c.active).map((c) => c.name)

/**
 * M13-43 — ONE draft line's total, the browser's raw `qty * price`
 * (index.html:6520-6522).
 *
 * Deliberately NOT rounded. The stored `line_sum` is the generated column
 * `round(qty*price, 2)` (schema 180), so the draft and the reloaded report can
 * differ in the last decimal until `load()` re-reads. Rounding here would
 * silently "fix" one side of a difference the ledger records as real.
 */
export const draftLineTotal = (line: SmDraftLine): number => line.qty * line.price

/**
 * M13-42 — the draft footer's «Cəmi» over every line (index.html:6522).
 * The caller formats it with `money()`, which renders EXACTLY 0 as an
 * em-dash rather than `0,00 ₼`.
 */
export const draftGrandTotal = (lines: readonly SmDraftLine[]): number =>
  lines.reduce((s, l) => s + l.qty * l.price, 0)

/**
 * M13-32 — the item search (index.html:6317-6322).
 *
 * Fewer than 2 characters returns NOTHING and the panel stays hidden; at 2 or
 * more it matches a lower-cased NAME substring OR a `code` substring, capped
 * at 12 hits.
 *
 * The code comparison uses the RAW query, exactly as legacy does
 * (`i.code.indexOf(q)`), because codes are digits — lower-casing them would
 * change nothing and diverging here would be an invented rule.
 *
 * This is its own rule and is deliberately NOT one of the platform's three
 * existing normalisers (`dupNormalise`, `NORM`, `REF_EQ`): introducing a
 * fourth shared normaliser is not what legacy does here.
 */
export function itemSearchHits(query: string, items: readonly ItemRow[]): ItemRow[] {
  const q = query.trim().toLowerCase()
  if (q.length < 2) return []
  return items
    .filter((i) => (i.name || '').toLowerCase().indexOf(q) >= 0 || (i.code || '').indexOf(q) >= 0)
    .slice(0, 12)
}

/**
 * M13-75, M13-76, M13-77 — `smReportRows()` (index.html:6577-6591).
 *
 * Drops a line whose document is missing, and a line whose document's project
 * is outside `allowedIds`. The caller MUST build `allowedIds` from
 * `allowedProjects(me, projects, false)` — `forWrite: false`, so a rehber who
 * may write nothing still sees every active project's rows (M13-76). Passing
 * the write-scoped list would silently blank the report for a rehber.
 *
 * The author falls back to the RAW uuid when the directory does not resolve
 * it (D-N6), and an unknown item code falls back to the code itself with an
 * empty unit — the same fallbacks the audit log uses.
 */
export function reportRows(
  lines: readonly SmLine[],
  docs: readonly SmDocument[],
  projects: readonly SmProject[],
  itemsByCode: ReadonlyMap<string, ItemRow>,
  emails: ReadonlyMap<string, string>,
  allowedIds: ReadonlySet<string>,
): SmReportRow[] {
  const out: SmReportRow[] = []
  for (const l of lines) {
    const doc = docById(docs, l.docId)
    if (!doc) continue
    if (!allowedIds.has(doc.projectId)) continue
    const proj = projById(projects, doc.projectId)
    const it = itemsByCode.get(l.code)
    out.push({
      d: doc.d,
      proj: proj ? proj.name : '',
      item: it ? it.name : l.code,
      code: l.code,
      unit: it ? (it.unit ?? '') : '',
      qty: l.qty,
      price: l.price,
      /* The STORED line_sum, not a recomputation — M13-43. */
      sum: l.sum,
      kontragent: doc.kontragent,
      avto: doc.avto,
      kanal: doc.kanal,
      iv: doc.iv,
      note: doc.note,
      by: emails.get(doc.by) || doc.by,
      docNum: doc.num,
    })
  }
  return out
}
