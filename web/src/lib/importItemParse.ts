import type { ItemRow } from '../api/items.api'
import { NORM } from './bulkItemParse'

/* Excel/CSV import of NEW items — index.html:5915-6045.

   Distinct from the bulk paste: this path creates only NEW items, never
   updates an existing one, and carries no price at all. The server assigns
   the real codes (import_new_items); the codes shown in the preview are
   BROWSER PREDICTIONS for display only (6042-6044). */

/* Category words are stripped before similarity is judged, so two unrelated
   filters are not flagged as similar merely because both say "filtr"
   (index.html:5915-5953). */
export const SIM_GENERIC = new Set([
  'üçün', 'ilə', 'olan', 'olaraq', 'da', 'də', 'bir', 'bu', 'o', 'həm', 'artıq',
  'yeni', 'köhnə', 'digər', 'başqa', 'əlavə', 'normal', 'standart', 'hər',
  'kiçik', 'böyük', 'orta', 'uzun', 'qısa', 'çox', 'az',
  'parti', 'lot', 'seriya',
  'ağ', 'qara', 'qırmızı', 'sarı', 'mavi', 'yaşıl', 'narıncı', 'boz',
  'plastik', 'rezin', 'rezini', 'metal', 'metalik',
  'dəmir', 'dəmiri', 'polad', 'poladı', 'mis', 'misi',
  'alüminium', 'alüminiumlu', 'paslanmayan',
  'taxta', 'ağac', 'şüşə', 'şüşəli', 'keramika',
  'yağ', 'yağı', 'yağın', 'yağla', 'oil',
  'filtr', 'filtri', 'filtrin', 'filter',
  'kabel', 'kabeli', 'kabelin', 'cable', 'məftil', 'məftili', 'sim', 'simi',
  'generator', 'generatoru', 'generatorun',
  'mühərrik', 'mühərriki', 'mühərrikin',
  'motor', 'motoru', 'motorun', 'engine',
  'nasos', 'nasosun', 'nasosa', 'pump',
  'ventil', 'ventili', 'kran', 'kranı', 'valve',
  'şlang', 'şlanqı', 'hose', 'boru', 'borusu', 'borunun', 'pipe',
  'transformator', 'kompressor', 'kondisioner', 'aggregat',
  'bolt', 'boltu', 'vida', 'vidası', 'qayka', 'qaykası', 'pərçim',
  'hissə', 'hissəsi', 'part', 'spare', 'ehtiyat', 'ehtiyatı',
  'komplekt', 'set', 'kit', 'dəst', 'dəsti',
  'tip', 'type', 'növ', 'model', 'ölçü', 'ölçüsü', 'size',
])

/** index.html:5955-5959 — tokens under 3 chars and category words are dropped. */
export function simTokenize(name: string): string[] {
  return String(name || '').toLowerCase()
    .split(/[^a-z0-9əıöşüçğ]+/)
    .filter((t) => t.length >= 3 && !SIM_GENERIC.has(t))
}

/** A model/code token (contains a digit) or a long brand word (index.html:5961). */
export function isStrongToken(t: string): boolean {
  return /[0-9]/.test(t) || t.length >= 5
}

/** Two or more shared tokens, or one strong shared token (index.html:5967-5973). */
export function isSimilar(a: string, b: string): boolean {
  const ta = new Set(simTokenize(a))
  const tb = new Set(simTokenize(b))
  if (!ta.size || !tb.size) return false
  const common = [...ta].filter((t) => tb.has(t))
  return common.length >= 2 || (common.length === 1 && isStrongToken(common[0]))
}

const NAME_KEYS = ['malın adı', 'malin adi', 'ad', 'adı', 'adi', 'name', 'наименование']
const UNIT_KEYS = ['ölçü vahidi', 'olcu vahidi', 'ölçü', 'olcu', 'unit', 'ölçü vahid']

const nrmHdr = (s: unknown): string => String(s ?? '').toLowerCase().trim().replace(/\s+/g, ' ')

function pickCol(headers: unknown[], keys: string[]): number {
  for (let i = 0; i < headers.length; i++) if (keys.includes(nrmHdr(headers[i]))) return i
  return -1
}

export interface NewRecord {
  name: string
  unit: string
}

/** `parseNewText` — index.html:6011-6014. */
export function parseNewText(txt: string): string[][] {
  return txt.split(/\r?\n/).filter((l) => l.trim().length).map((l) => l.split(/\t|;|\|/).map((s) => s.trim()))
}

/**
 * `extractNewRecords` — index.html:5984-6009. Looks for a header row in the
 * first five rows; failing that, treats column 0 as the name and 1 as the unit.
 */
export function extractNewRecords(rows2d: unknown[][]): NewRecord[] {
  if (!rows2d.length) return []
  let hdrIx = -1
  let nameCol = -1
  let unitCol = -1
  for (let i = 0; i < Math.min(rows2d.length, 5); i++) {
    const nc = pickCol(rows2d[i] ?? [], NAME_KEYS)
    if (nc >= 0) { hdrIx = i; nameCol = nc; unitCol = pickCol(rows2d[i] ?? [], UNIT_KEYS); break }
  }
  const recs: NewRecord[] = []
  if (hdrIx >= 0) {
    for (let i = hdrIx + 1; i < rows2d.length; i++) {
      const r = rows2d[i]
      if (!r) continue
      const name = String(r[nameCol] ?? '').trim()
      const unit = unitCol >= 0 ? String(r[unitCol] ?? '').trim() : ''
      if (!name && !unit) continue
      recs.push({ name, unit })
    }
  } else {
    for (const r of rows2d) {
      if (!r || !r.length) continue
      const name = String(r[0] ?? '').trim()
      if (!name) continue
      recs.push({ name, unit: String(r[1] ?? '').trim() })
    }
  }
  return recs
}

export type ImportStatus = 'new' | 'sim' | 'dup' | 'err'

export interface ImportPreviewRow {
  n: number
  name: string
  unit: string
  use: boolean
  st: ImportStatus
  msg: string
  /** Display-only prediction; the SERVER assigns the real code (6042-6044). */
  predCode?: string
}

/** `classifyNewRecords` — index.html:6016-6045. */
export function classifyNewRecords(records: NewRecord[], items: ItemRow[]): ImportPreviewRow[] {
  const byName = new Map<string, ItemRow>()
  for (const i of items) {
    const k = NORM(i.name)
    if (!byName.has(k)) byName.set(k, i)
  }
  let maxCode = 0
  for (const i of items) {
    const n = parseInt(i.code, 10)
    if (!isNaN(n) && n > maxCode) maxCode = n
  }

  const seen = new Set<string>()
  const out: ImportPreviewRow[] = []

  records.forEach((rec, ix) => {
    const name = String(rec.name || '').trim()
    const unit = String(rec.unit || '').trim().replace(/\.$/, '') || 'ədəd'
    const r: ImportPreviewRow = { n: ix + 1, name, unit, use: false, st: 'err', msg: '' }
    const key = NORM(name)

    if (!name || name.length < 3) {
      r.st = 'err'; r.msg = 'Ad boşdur və ya 3 simvoldan qısadır'
    } else if (byName.has(key)) {
      const ex = byName.get(key)!
      r.st = 'dup'; r.msg = 'Bazada dəqiq uyğunluq: ' + ex.code + ' — ' + ex.name
    } else if (seen.has(key)) {
      r.st = 'dup'; r.msg = 'Bu fayl içində təkrarlanır — bir dəfə yaradılır'
    } else {
      seen.add(key)
      const sim = items.find((it) => isSimilar(name, it.name)) ?? null
      if (sim) {
        r.st = 'sim'; r.use = true
        r.msg = 'Oxşar ad mövcuddur: ' + sim.code + ' — ' + sim.name + ' (istəsəniz yenə də yarada bilərsiniz)'
      } else {
        r.st = 'new'; r.use = true; r.msg = 'Yeni mal'
      }
    }
    out.push(r)
  })

  return recomputePredictedCodes(out, items)
}

/**
 * `niRecompute()` — index.html:6047-6053. Re-derives the display-only code
 * predictions after the user changes a row's checkbox, so the sequence stays
 * contiguous over the rows that are actually selected. A deselected row loses
 * its prediction entirely, exactly as the original clears `r.predCode`.
 */
export function recomputePredictedCodes(
  rows: ImportPreviewRow[],
  items: ItemRow[],
): ImportPreviewRow[] {
  let maxCode = 0
  for (const i of items) {
    const n = parseInt(i.code, 10)
    if (!isNaN(n) && n > maxCode) maxCode = n
  }
  let pc = maxCode
  for (const r of rows) {
    r.predCode = undefined
    if ((r.st === 'new' || r.st === 'sim') && r.use) { pc++; r.predCode = String(pc).padStart(7, '0') }
  }
  return rows
}
