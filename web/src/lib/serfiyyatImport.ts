import type { ItemRow } from '../api/items.api'
import { today } from './format'
import type { SmDraftLine, SmProject } from './serfiyyat'

/* The TWO independent Excel import paths of «Sərfiyyat Materialları».

   Legacy is explicit that they must never be conflated (index.html:6397-6403):
   the LINE-level import appends rows to the OPEN draft document, while the
   DOCUMENT-level import creates entirely new documents, one RPC call per
   group. They are separate parsers here for exactly that reason (M13-60).

   Both take a 2-D array, so neither needs a file or a workbook to be tested;
   the XLSX → 2-D conversion is a thin adapter that lives with the page. */

/* ------------------------------------------------------------------ *
 * Line-level import — smImportLines() (index.html:6368-6395)          *
 * ------------------------------------------------------------------ */

export interface LineImportResult {
  /** Lines to append to the OPEN draft, in worksheet order. */
  lines: SmDraftLine[]
  /** Rejected rows, each already carrying its exact message (M13-62). */
  rejected: string[]
}

/** A cell to a trimmed string; null/undefined become ''. */
const cell = (v: unknown): string => String(v == null ? '' : v).trim()

/** `parseFloat(String(x).replace(',', '.'))` — the decimal-comma rule (6386). */
const num = (v: unknown): number => parseFloat(String(v ?? '').replace(',', '.'))

/**
 * M13-61, M13-62, M13-63 — parses a line-level workbook.
 *
 * Header detection tests the FIRST row against `/kod|code|miqdar|qty|qiymət|price/`;
 * when a header exists the three columns are located by name and parsing
 * starts at row 2, otherwise the columns are positional `0,1,2` from row 1.
 *
 * The three row outcomes are deliberately different (6381-6391):
 *   * an EMPTY code is skipped SILENTLY and counted nowhere;
 *   * an unknown code is rejected as «{code} (mal tapılmadı)»;
 *   * a non-positive qty is rejected as «{code} (miqdar yanlış)».
 *
 * Guard ORDER matters: the unknown-code check runs BEFORE the quantity check,
 * so an unknown code with a bad quantity is reported as «mal tapılmadı».
 * A missing or unparseable price defaults to 0.
 */
export function parseLineImport(
  rows2d: readonly unknown[][],
  itemsByCode: ReadonlyMap<string, ItemRow>,
): LineImportResult {
  const lines: SmDraftLine[] = []
  const rejected: string[] = []
  if (!rows2d || !rows2d.length) return { lines, rejected }

  const head = (rows2d[0] || []).map((x) => String(x).toLowerCase())
  const hasHeader = head.some((h) => /kod|code|miqdar|qty|qiymət|price/.test(h))
  let start = 0
  let ci = 0
  let qi = 1
  let pi = 2
  if (hasHeader) {
    start = 1
    const fc = head.findIndex((h) => /kod|code/.test(h)); if (fc >= 0) ci = fc
    const fq = head.findIndex((h) => /miqdar|qty/.test(h)); if (fq >= 0) qi = fq
    const fp = head.findIndex((h) => /qiymət|price/.test(h)); if (fp >= 0) pi = fp
  }

  for (let r = start; r < rows2d.length; r++) {
    const row = rows2d[r]
    if (!row || !row.length) continue
    const code = cell(row[ci])
    /* Silently skipped — counted in NEITHER tally (6383-6384). */
    if (!code) continue
    const qty = num(row[qi])
    const price = num(row[pi]) || 0
    if (!itemsByCode.has(code)) { rejected.push(code + ' (mal tapılmadı)'); continue }
    if (!(qty > 0)) { rejected.push(code + ' (miqdar yanlış)'); continue }
    lines.push({ code, qty, price })
  }
  return { lines, rejected }
}

/** M13-63 — the exact result toast (index.html:6393). */
export function lineImportToast(result: LineImportResult): { text: string; isError: boolean } {
  const added = result.lines.length
  const bad = result.rejected.length
  return {
    text: added + ' sətir əlavə olundu'
      + (bad ? ', ' + bad + ' sətir rədd edildi (konsola bax)' : ''),
    /* The original's own flag: an error only when everything was rejected. */
    isError: !!bad && !added,
  }
}

/* ------------------------------------------------------------------ *
 * Document-level import — smParseDocsImport() (index.html:6415-6459)  *
 * ------------------------------------------------------------------ */

/** One parsed document group, ready for one `create_serfiyyat_document` call. */
export interface DocsImportGroup {
  projectId: string
  projectName: string
  kontragent: string
  avto: string
  kanal: string
  iv: string
  date: string
  note: string
  lines: { code: string; name: string; qty: number; price: number }[]
}

export interface DocsImportResult {
  groups: DocsImportGroup[]
  /** Per-row errors, each naming the 1-BASED worksheet line (M13-65, M13-68). */
  errors: string[]
}

/** `smFindProjectByName()` — EXACT case-insensitive name match (6404-6407). */
export function findProjectByName(
  name: unknown,
  allowed: readonly SmProject[],
): SmProject | undefined {
  const q = cell(name).toLowerCase()
  return allowed.find((p) => p.name.toLowerCase() === q)
}

/** `smFindItemByNameOrCode()` — exact CODE first, then exact name (6408-6414). */
export function findItemByNameOrCode(
  text: unknown,
  itemsByCode: ReadonlyMap<string, ItemRow>,
  items: readonly ItemRow[],
): ItemRow | null {
  const raw = cell(text)
  if (!raw) return null
  const byCode = itemsByCode.get(raw)
  if (byCode) return byCode
  const q = raw.toLowerCase()
  return items.find((i) => (i.name || '').toLowerCase() === q) || null
}

/**
 * M13-65…M13-68 — parses a document-level workbook into groups.
 *
 * `allowed` MUST be the WRITE-scoped project list: a project the user may not
 * write to produces the per-row error rather than a silent document (M13-65).
 *
 * One deliberate subtlety in the column map (M13-66): the avtomobil column
 * matches `/avtomobil|nömrə|nomre/` AND NOT `/qaim|invoice/`, because «Qaimə
 * nömrəsi» also contains «nömrə» and would otherwise bind two different fields
 * to the same column.
 *
 * Rows group by the SEVEN-component key
 * `projectId|kontragent|avto|kanal|iv|date|note` — every text component
 * lower-cased, the project id and the date not (M13-67). A date cell that is
 * not an ISO prefix falls back to `today()`.
 */
export function parseDocsImport(
  rows2d: readonly unknown[][],
  allowed: readonly SmProject[],
  itemsByCode: ReadonlyMap<string, ItemRow>,
  items: readonly ItemRow[],
): DocsImportResult {
  const groups = new Map<string, DocsImportGroup>()
  const errors: string[] = []
  if (!rows2d || !rows2d.length) return { groups: [], errors }

  const head = (rows2d[0] || []).map((x) => String(x).toLowerCase())
  const hasHeader = head.some((h) => /layih|material|mal|miqdar|qty|qiym|price|tarix|date/.test(h))
  let ci = { proj: 0, item: 1, qty: 2, price: 3, date: 4, note: 5, kontragent: -1, avto: -1, kanal: -1, iv: -1 }
  let start = 0
  if (hasHeader) {
    start = 1
    const f = (re: RegExp, def: number): number => {
      const i = head.findIndex((h) => re.test(h))
      return i >= 0 ? i : def
    }
    ci = {
      proj: f(/layih/, 0), item: f(/material|mal/, 1), qty: f(/miqdar|qty/, 2), price: f(/qiym|price/, 3),
      date: f(/tarix|date/, 4), note: f(/qeyd|note/, 5),
      kontragent: f(/kontragent/, -1), kanal: f(/kanal/, -1),
      iv: f(/qaim|invoice/, -1),
      /* M13-66 — the exclusion; without it «Qaimə nömrəsi» captures this too. */
      avto: head.findIndex((h) => /avtomobil|nömrə|nomre/.test(h) && !/qaim|invoice/.test(h)),
    }
  }

  for (let r = start; r < rows2d.length; r++) {
    const row = rows2d[r]
    if (!row || !row.length || row.every((c) => String(c).trim() === '')) continue
    /* 1-based WORKSHEET line, not the array index (M13-65). */
    const rn = r + 1

    const proj = findProjectByName(row[ci.proj], allowed)
    if (!proj) {
      errors.push('Sətir ' + rn + ': layihə tapılmadı və ya icazəniz yoxdur: "' + row[ci.proj] + '"')
      continue
    }
    const it = findItemByNameOrCode(row[ci.item], itemsByCode, items)
    if (!it) {
      errors.push('Sətir ' + rn + ': mal tapılmadı: "' + row[ci.item] + '"')
      continue
    }
    const qty = num(row[ci.qty])
    if (!(qty > 0)) {
      errors.push('Sətir ' + rn + ': miqdar yanlış: "' + row[ci.qty] + '"')
      continue
    }
    const price = num(row[ci.price]) || 0
    const rawDate = ci.date >= 0 ? String(row[ci.date] ?? '') : ''
    const date = /^\d{4}-\d{2}-\d{2}/.test(rawDate) ? rawDate.slice(0, 10) : today()
    const note = ci.note >= 0 ? cell(row[ci.note]) : ''
    const kontragent = ci.kontragent >= 0 ? cell(row[ci.kontragent]) : ''
    const avto = ci.avto >= 0 ? cell(row[ci.avto]) : ''
    const kanal = ci.kanal >= 0 ? cell(row[ci.kanal]) : ''
    const iv = ci.iv >= 0 ? cell(row[ci.iv]) : ''

    const key = [
      proj.id, kontragent.toLowerCase(), avto.toLowerCase(), kanal.toLowerCase(),
      iv.toLowerCase(), date, note.toLowerCase(),
    ].join('|')
    if (!groups.has(key)) {
      groups.set(key, {
        projectId: proj.id, projectName: proj.name, kontragent, avto, kanal, iv, date, note, lines: [],
      })
    }
    groups.get(key)!.lines.push({ code: it.code, name: it.name, qty, price })
  }

  return { groups: Array.from(groups.values()), errors }
}

/** The preview dialog's per-group total — raw `qty * price` (6486). */
export const groupTotal = (g: DocsImportGroup): number =>
  g.lines.reduce((s, l) => s + l.qty * l.price, 0)
