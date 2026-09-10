import type { ItemRow } from '../api/items.api'

/* Bulk nomenclature paste — parseItemList (index.html:5640-5688).

   NOTE the normaliser: NORM (5638) is NOT the duplicate-filter normaliser.
   It additionally strips backtick, curly apostrophe, en/em dash and
   parentheses. Three normalisers exist in this platform on purpose; see
   lib/itemFilters.ts and registry R-F4. */
export const NORM = (s: string): string =>
  String(s || '').toLowerCase().replace(/[\s/.,"'`’\-–—()]+/g, '')

export type BulkStatus = 'new' | 'upd' | 'dup' | 'rep' | 'err'

export interface BulkRow {
  /** 1-based line number, for the preview. */
  n: number
  code: string
  name: string
  unit: string
  price: number
  raw: string
  /** Whether this row is applied — only `new`/`upd` default to true. */
  use: boolean
  st: BulkStatus
  msg: string
  /** True when the code was assigned locally rather than supplied. */
  auto?: boolean
}

export interface BulkParseContext {
  items: ItemRow[]
  /** Active units from the reference directory. */
  allowedUnits: string[]
  /** The «mövcudları yenilə» checkbox. */
  updateExisting: boolean
}

/** True for a heading line the original skips (5654). */
function isHeading(parts: string[]): boolean {
  const a = (parts[0] || '').trim()
  const b = (parts[1] || '').trim()
  return (/^(kod|code|№|nn?)$/i.test(a) || /^(ad|adı|malın adı|name|наименование)$/i.test(a))
    || /^(ad|adı|malın adı|name)$/i.test(b)
}

export function parseItemList(text: string, ctx: BulkParseContext): BulkRow[] {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)

  const uSet = new Set(ctx.allowedUnits.map((u) => u.trim().toLowerCase()))
  const uDef = uSet.has('ədəd') ? 'ədəd' : (ctx.allowedUnits[0] || '')

  const itemBy = new Map(ctx.items.map((i) => [i.code, i]))
  const byName = new Map<string, ItemRow>()
  for (const i of ctx.items) {
    const k = NORM(i.name)
    if (!byName.has(k)) byName.set(k, i)
  }
  let maxCode = 0
  for (const i of ctx.items) {
    const n = parseInt(i.code, 10)
    if (!isNaN(n) && n > maxCode) maxCode = n
  }

  const seenName = new Set<string>()
  const seenCode = new Set<string>()
  const out: BulkRow[] = []

  lines.forEach((line, ix) => {
    const p = line.split(/\t|;|\|/).map((s) => s.trim())
    if (ix === 0 && isHeading(p)) return

    let code = ''
    let name = ''
    let unit = ''
    let price = 0
    if (p.length === 1) {
      name = p[0]
    } else if (/^\d{1,7}$/.test(p[0]) && p[1]) {
      code = p[0].padStart(7, '0')
      name = p[1]
      unit = p[2] || ''
      price = parseFloat(String(p[3] || '').replace(',', '.')) || 0
    } else {
      name = p[0]
      unit = p[1] || ''
      price = parseFloat(String(p[2] || '').replace(',', '.')) || 0
    }
    unit = unit.replace(/\.$/, '')

    const r: BulkRow = {
      n: ix + 1, code, name, unit: unit || uDef, price, raw: line, use: false, st: 'err', msg: '',
    }
    const key = NORM(name)

    if (!name || name.length < 2) {
      r.st = 'err'; r.msg = 'Ad boşdur və ya çox qısadır'
    } else if (!uSet.has(String(r.unit).trim().toLowerCase())) {
      /* A unit outside the reference directory is refused here as well as by
         the server's guard_item_unit(). */
      r.st = 'err'
      r.msg = r.unit ? 'Ölçü vahidi Soraqçalarda yoxdur: ' + r.unit : 'Soraqçalarda aktiv ölçü vahidi yoxdur'
    } else if (code && itemBy.has(code)) {
      const ex = itemBy.get(code)!
      if (ctx.updateExisting) { r.st = 'upd'; r.msg = 'Mövcud kod — yenilənəcək: ' + ex.name; r.use = true }
      else { r.st = 'dup'; r.msg = 'Bu kod artıq var: ' + ex.name }
    } else if (byName.has(key)) {
      const ex = byName.get(key)!
      if (ctx.updateExisting && (price || unit !== (ex.unit ?? ''))) {
        r.st = 'upd'; r.code = ex.code
        r.msg = 'Bazada var (' + ex.code + ') — qiymət/ölçü yenilənəcək'
        r.use = true
      } else {
        r.st = 'dup'; r.msg = 'Bazada artıq var: ' + ex.code
      }
    } else if (seenName.has(key)) {
      r.st = 'rep'; r.msg = 'Siyahının içində təkrarlanır'
    } else if (code && seenCode.has(code)) {
      r.st = 'rep'; r.msg = 'Kod siyahının içində təkrarlanır'
    } else {
      r.st = 'new'; r.use = true
      if (!r.code) { maxCode++; r.code = String(maxCode).padStart(7, '0'); r.auto = true }
      seenName.add(key); seenCode.add(r.code)
      r.msg = r.auto ? 'Yeni — kod avtomatik verildi' : 'Yeni'
    }
    if (r.st === 'new' || r.st === 'upd') {
      seenName.add(key)
      if (r.code) seenCode.add(r.code)
    }
    out.push(r)
  })

  return out
}
