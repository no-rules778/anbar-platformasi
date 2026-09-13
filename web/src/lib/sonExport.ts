/* «⬇ Excel (SON formatı)» — the surgical template exporter, ported from
   index.html:7675-7898.

   ═══ WHY A TEMPLATE IS PATCHED INSTEAD OF A WORKBOOK WRITTEN. ═══

   The SON workbook carries two pivot tables («Mal hereket», «Hesabat»), nine
   Excel Tables, a hand-built style table and a theme. No SheetJS write can
   reproduce any of that. So the real workbook is opened as a ZIP and only its
   DATA rows are replaced, leaving every design byte untouched. That makes the
   patch surface below a CORRECTNESS BOUNDARY, not an implementation detail:
   widening it starts destroying the thing the approach exists to preserve.

   WHAT IS TOUCHED — and nothing else:
     · the sheetData of Filtrasiya, Nomenklatura bazası, Kontragent bazası
       and every «… (Anbar)» sheet
     · each of those sheets' <dimension>
     · each corresponding table's ref, with its <autoFilter> CLEARED
     · xl/sharedStrings.xml (appended to; existing entries keep their index)
     · xl/calcChain.xml (REMOVED — it names cells this export rewrote)
     · [Content_Types].xml + workbook.xml.rels (the calcChain references)
     · xl/workbook.xml (fullCalcOnLoad="1" added to <calcPr>)

   NOT touched: xl/styles.xml, xl/theme/*, every pivotCache and pivotTable
   part, «Mal hereket», «Checkup», «Hesabat Anbar», «Hesabat Filtrasiya» and
   «Layihə anbarlarının siyahısı». The pivots already carry refreshOnLoad="1"
   in the shipped template, so they recalculate on open by themselves — which
   is exactly why this export does not rewrite them.

   ═══ SYNTHETIC FIXTURES ONLY. NO REAL EXPORT WAS RUN. ═══

   Every fixture in the tests is a hand-written XML string. Nothing here was
   executed against TEST or production data, and no file was downloaded. */

/** `xesc` — index.html:7684. */
export function xesc(s: unknown): string {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

/** `numstr` — index.html:7685. A non-finite or empty value becomes `'0'`. */
export function numstr(x: unknown): string {
  if (x == null || x === '') return '0'
  const f = Number(x)
  return isFinite(f) ? String(f) : '0'
}

/**
 * `excelSerial` — index.html:7686-7690.
 *
 * Days since the 1899-12-30 epoch, computed in UTC so a local timezone can
 * never shift a date by one day. Accepts ISO (`YYYY-MM-DD`) or `DD.MM.YYYY`;
 * anything else is `null`, which the callers render as an EMPTY cell rather
 * than a wrong date.
 */
export function excelSerial(d: string | null | undefined): number | null {
  if (!d) return null
  let y: number, mo: number, da: number
  let m = /^(\d{4})-(\d{2})-(\d{2})/.exec(d)
  if (m) { y = +m[1]; mo = +m[2]; da = +m[3] } else {
    m = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(d)
    if (!m) return null
    da = +m[1]; mo = +m[2]; y = +m[3]
  }
  return Math.round((Date.UTC(y, mo - 1, da) - Date.UTC(1899, 11, 30)) / 86400000)
}

/** `toDDMMYYYY` — index.html:7692. */
export function toDDMMYYYY(s: string | null | undefined): string | null {
  if (!s) return null
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s)
  return m ? m[3] + '.' + m[2] + '.' + m[1] : s
}

/**
 * `SharedStrings` — index.html:7694-7706.
 *
 * The workbook's string pool. Existing entries KEEP their index — every
 * untouched sheet still points into this table by number, so re-ordering or
 * de-duplicating it would corrupt sheets this export never writes. New
 * strings are appended and the `count`/`uniqueCount` attributes rewritten.
 *
 * Parsed with regex rather than DOMParser: this must run under Node in tests
 * as well as in the browser, and the shape is a flat `<si><t>` list.
 */
export class SharedStrings {
  readonly value: string[] = []
  private readonly index = new Map<string, number>()
  private readonly appended: string[] = []
  /* A plain field, not a constructor parameter property: this project builds
     with `erasableSyntaxOnly`, which forbids that TypeScript-only syntax. */
  private readonly raw: string

  constructor(raw: string) {
    this.raw = raw
    const sis = raw.match(/<si\b[\s\S]*?<\/si>/g) ?? []
    for (const si of sis) {
      const ts = si.match(/<t\b[^>]*>([\s\S]*?)<\/t>/g) ?? []
      let v = ''
      for (const t of ts) v += (/<t\b[^>]*>([\s\S]*?)<\/t>/.exec(t) ?? ['', ''])[1]
      v = unescapeXml(v)
      this.value.push(v)
      if (!this.index.has(v)) this.index.set(v, this.value.length - 1)
    }
  }

  /** Returns the pool index of `s`, appending it when new. */
  sid(s: unknown): number {
    const v = s == null ? '' : String(s)
    const hit = this.index.get(v)
    if (hit !== undefined) return hit
    const idx = this.value.length
    this.value.push(v)
    this.index.set(v, idx)
    const t = xesc(v)
    /* `xml:space="preserve"` whenever trimming would change the string —
       otherwise Excel silently eats leading/trailing or doubled spaces. */
    this.appended.push(
      (v !== v.trim() || v.includes('  '))
        ? '<si><t xml:space="preserve">' + t + '</t></si>'
        : '<si><t>' + t + '</t></si>',
    )
    return idx
  }

  serialize(): string {
    const u = this.value.length
    const head = this.raw.replace(/<sst\b[^>]*>/, (tag) => tag
      .replace(/count="\d+"/, 'count="' + u + '"')
      .replace(/uniqueCount="\d+"/, 'uniqueCount="' + u + '"'))
    return head.replace('</sst>', this.appended.join('') + '</sst>')
  }
}

function unescapeXml(s: string): string {
  return s.replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&')
}

export interface SonSheetRef { sheet: string; table: { file: string; name: string } | null }
export interface SonWarehouseRef extends SonSheetRef { display: string; name: string }
export interface SonStructure {
  byName: Record<string, SonSheetRef>
  warehouses: SonWarehouseRef[]
}

/**
 * `discover` — index.html:7708-7722.
 *
 * Warehouses are found by the «(Anbar)» sheet-name SUFFIX, not by a hardcoded
 * list, so a template with 3, 5 or 10 warehouse sheets works unchanged. The
 * warehouse NAME is the sheet name with that suffix stripped, and it is what
 * movement rows are matched against.
 */
export function discover(files: Map<string, string>): SonStructure {
  const wb = files.get('xl/workbook.xml') ?? ''
  const wbRels = files.get('xl/_rels/workbook.xml.rels') ?? ''
  const rid2t: Record<string, string> = {}
  wbRels.replace(/Id="(rId\d+)"[^>]*Target="([^"]+)"/g, (_, id: string, t: string) => {
    rid2t[id] = t
    return ''
  })
  const sheets: [string, string][] = []
  wb.replace(/<sheet name="([^"]+)"[^>]*r:id="(rId\d+)"/g, (_, nm: string, rid: string) => {
    sheets.push([nm, 'xl/' + (rid2t[rid] ?? '').replace(/^\//, '')])
    return ''
  })

  function tableOf(sheetFile: string): { file: string; name: string } | null {
    const base = sheetFile.split('/').pop() as string
    const rf = 'xl/worksheets/_rels/' + base + '.rels'
    if (!files.has(rf)) return null
    const m = /Target="([^"]*tables\/table\d+\.xml)"/.exec(files.get(rf) as string)
    if (!m) return null
    const tp = 'xl/' + m[1].replace(/\.\.\//, '')
    const src = files.get(tp)
    if (!src) return null
    const nm = /name="([^"]+)"/.exec(src)
    return nm ? { file: tp, name: nm[1] } : null
  }

  const byName: Record<string, SonSheetRef> = {}
  for (const [nm, sf] of sheets) byName[nm] = { sheet: sf, table: tableOf(sf) }

  const warehouses: SonWarehouseRef[] = []
  for (const [nm, sf] of sheets) {
    if (!/\(Anbar\)\s*$/.test(nm)) continue
    warehouses.push({
      display: nm,
      name: nm.replace(/\s*\(Anbar\)\s*$/, '').trim(),
      sheet: sf,
      table: tableOf(sf),
    })
  }
  return { byName, warehouses }
}

/** `readWhTemplate` — index.html:7724-7730. Reads row 4 as the style model. */
export function readWhTemplate(sheetXml: string): {
  rowAttrs: string
  styles: Record<string, string | null>
  eformula: string | null
} {
  const a = sheetXml.indexOf('<sheetData>')
  const r4 = /<row r="4"[^>]*>[\s\S]*?<\/row>/.exec(sheetXml.slice(a))
  const row = r4 ? r4[0] : ''
  const rowAttrs = ((/<row r="4"([^>]*)>/.exec(row) ?? ['', ''])[1])
    .replace(/\s*r="4"/, '').replace(/\s*spans="[^"]*"/, '').replace(/\s*hidden="1"/, '')
  const styles: Record<string, string | null> = {}
  row.replace(/<c r="([A-Z]+)4"(?:\s+s="(\d+)")?/g, (_, col: string, s: string) => {
    styles[col] = s != null ? s : null
    return ''
  })
  const ef = /<c r="E4"[^>]*>\s*<f[^>]*>([^<]+)<\/f>/.exec(row)
  return { rowAttrs, styles, eformula: ef ? ef[1] : null }
}

/** The two warehouse-sheet style dialects — index.html:7732-7736. */
export const FMT = {
  elet: {
    sty: { B: '26', C: '27', D: '28', E: '29', F: '26', G: '26', H: '26', I: '26' } as Record<string, string | null>,
    gEmpty: '26' as string | null,
    rowAttrs: ' x14ac:dyDescent="0.25"',
  },
  astara: {
    sty: { B: '4', C: '5', D: '8', E: '12', F: '4', G: null, H: '4', I: '4' } as Record<string, string | null>,
    gEmpty: null as string | null,
    rowAttrs: ' ht="15.6" x14ac:dyDescent="0.3"',
  },
}

/** `whFormat` — index.html:7736. The E-column formula identifies the dialect. */
export function whFormat(eformula: string | null): 'elet' | 'astara' {
  return eformula && /Table4\[Mal/.test(eformula) ? 'elet' : 'astara'
}

/** `patchDim` — index.html:7739. */
export function patchDim(x: string, last: number): string {
  return x.replace(
    /<dimension ref="([A-Z]+\d+):([A-Z]+)\d+"\/>/,
    (_m, s: string, c: string) => '<dimension ref="' + s + ':' + c + last + '"/>',
  )
}

/** `patchTable` — index.html:7740. Rewrites EVERY ref in the table part. */
export function patchTable(t: string, last: number): string {
  return t.replace(
    /ref="([A-Z]+\d+):([A-Z]+)\d+"/g,
    (_m, s: string, c: string) => 'ref="' + s + ':' + c + last + '"',
  )
}

/**
 * `clearTableFilter` — index.html:7741.
 *
 * Collapses `<autoFilter …>…</autoFilter>` to a self-closing element,
 * DROPPING its `<filterColumn>` children. That is what removes the template's
 * saved «Silinmə» filter and the hidden Nomenklatura rows — without it the
 * exported workbook opens with rows invisible and the user believes data is
 * missing.
 */
export function clearTableFilter(t: string): string {
  return t.replace(/<autoFilter\s+([^>]*?)>[\s\S]*?<\/autoFilter>/, '<autoFilter $1/>')
}

/**
 * `split` — index.html:7742-7743.
 *
 * Everything up to and including the FIRST `</row>` after `<sheetData>` is
 * the prefix (the header row is kept); `</sheetData>` onward is the suffix.
 * New data rows go between them.
 */
export function split(x: string): { prefix: string; suffix: string } {
  const a = x.indexOf('<sheetData>') + '<sheetData>'.length
  const hEnd = x.indexOf('</row>', a) + '</row>'.length
  const b = x.indexOf('</sheetData>')
  return { prefix: x.slice(0, hEnd), suffix: x.slice(b) }
}

/** Channel → «Üsul» mapping — index.html:7745. */
export const CH2USUL: Record<string, string> = {
  'Əvvələ anbar qalığı': 'Əvvələ qalıq',
  'Nağd alış': 'Nağd',
  'Kommersiya şirkəti': 'Köçürmə',
  'Köçürmə': 'Köçürmə',
  'Sahə üzrə məsul şəxs': 'Sahə üzrə məsul şəxs',
}

const D_F = '_xlfn.XLOOKUP(Table4[[#This Row],[Malın kodu]],Table1[[#All],[Malın kodu]],Table1[[#All],[Malın adı]],"xəta",0)'
const I_F = 'Table4[[#This Row],[Malın miqdarı]]*Table4[[#This Row],[Vahidin qiyməti]]'

export interface SonMovement {
  date: string
  warehouse: string
  item_code: string
  in_qty: number
  out_qty: number
  type: string
  partner: string
  channel: string
  contract_num: string
  invoice_num: string
  price: number
}
export interface SonItem { code: string; name: string; unit: string | null; price: number }
export interface SonPartner {
  name: string
  voen?: string | null
  contract?: string | null
  contract_date?: string | null
}

/**
 * `buildFiltrasiya` — index.html:7750-7773.
 *
 * Only «Əvvələ qalıq» and «Satınalma» rows — the purchase register. Rows
 * start at spreadsheet row 4 (`i + 3`). The D and I columns keep their
 * FORMULAS with a cached `<v>`, so Excel shows a value immediately and
 * recalculates on open.
 */
export function buildFiltrasiya(
  x: string, SS: SharedStrings, movs: readonly SonMovement[], itemBy: Map<string, SonItem>,
): { xml: string; n: number } {
  const { prefix, suffix } = split(x)
  const inc = movs.filter((m) => m.type === 'Əvvələ qalıq' || m.type === 'Satınalma')
  const rows = inc.map((m, i) => {
    const n = i + 1, r = n + 3
    const it = itemBy.get(m.item_code)
    const qty = numstr(m.in_qty)
    const pnum = Number(m.price) || 0
    const hasP = pnum > 0
    const total = hasP ? numstr(parseFloat(qty) * pnum) : '0'
    const usul = CH2USUL[m.channel] || m.channel || ''
    const se = excelSerial(m.date)
    let c = '<c r="B' + r + '" s="4"><f>ROW()-3</f><v>' + n + '</v></c>'
    c += se != null ? '<c r="C' + r + '" s="5"><v>' + se + '</v></c>' : '<c r="C' + r + '" s="5"/>'
    c += '<c r="D' + r + '" s="10" t="str" cm="1"><f t="array" ref="D' + r + '">' + D_F + '</f><v>' + xesc(it?.name || '') + '</v></c>'
    c += '<c r="E' + r + '" s="8" t="s"><v>' + SS.sid(m.item_code) + '</v></c>'
    c += '<c r="F' + r + '" s="4" t="s"><v>' + SS.sid(it?.unit || '') + '</v></c>'
    c += '<c r="G' + r + '" s="4"><v>' + qty + '</v></c>'
    c += hasP ? '<c r="H' + r + '" s="4"><v>' + numstr(m.price) + '</v></c>' : '<c r="H' + r + '" s="4"/>'
    c += '<c r="I' + r + '" s="4"><f>' + I_F + '</f><v>' + total + '</v></c>'
    c += '<c r="J' + r + '" s="4" t="s"><v>' + SS.sid(usul) + '</v></c>'
    c += '<c r="K' + r + '" s="4" t="s"><v>' + SS.sid(m.partner || '') + '</v></c>'
    if (m.contract_num) c += '<c r="L' + r + '" s="4" t="s"><v>' + SS.sid(m.contract_num) + '</v></c>'
    if (m.invoice_num) c += '<c r="M' + r + '" s="4" t="s"><v>' + SS.sid(m.invoice_num) + '</v></c>'
    return '<row r="' + r + '" spans="2:13" x14ac:dyDescent="0.3">' + c + '</row>'
  })
  return { xml: prefix + rows.join('') + suffix, n: inc.length }
}

/** The refusal when nomenclature codes are not a dense 1..N run (7778-7779). */
export function nomSequenceError(actual: string, expected: string): string {
  return 'Nomenklatura kod ardıcıllığı pozulub: ' + actual + ' (gözlənilən ' + expected + ')'
}

/**
 * `buildNomenklatura` — index.html:7775-7791.
 *
 * ═══ THE SEQUENCE GUARD IS LOAD-BEARING. ═══
 *
 * Column D is the FORMULA `TEXT(ROW()-2,"0000000")`, i.e. the code is derived
 * from the row's position, not written. That is only correct while the codes
 * are exactly `0000001…000000N` with no gaps. If a code is ever missing or
 * out of order the sheet would silently relabel every later item — so the
 * export REFUSES instead. Rows start at spreadsheet row 3 (`i + 2`).
 */
export function buildNomenklatura(
  x: string, SS: SharedStrings, items: readonly SonItem[],
): { xml: string; n: number } {
  const { prefix, suffix } = split(x)
  const it = items.slice().sort((a, b) => a.code.localeCompare(b.code))
  for (let i = 0; i < it.length; i++) {
    const expected = String(i + 1).padStart(7, '0')
    if (it[i].code !== expected) throw new Error(nomSequenceError(it[i].code, expected))
  }
  const freq = new Map<string, number>()
  it.forEach((x2) => freq.set(x2.name, (freq.get(x2.name) || 0) + 1))
  const rows = it.map((x2, i) => {
    const n = i + 1, r = n + 2, code = String(n).padStart(7, '0')
    const c = '<c r="B' + r + '" s="4"><f>ROW()-2</f><v>' + n + '</v></c>'
      + '<c r="C' + r + '" s="10" t="s"><v>' + SS.sid(x2.name) + '</v></c>'
      + '<c r="D' + r + '" s="4" t="str"><f>TEXT(ROW()-2,"0000000")</f><v>' + code + '</v></c>'
      + '<c r="E' + r + '" s="4"><f>COUNTIF(Table1[Malın adı],Table1[[#This Row],[Malın adı]])</f><v>' + freq.get(x2.name) + '</v></c>'
    return '<row r="' + r + '" spans="2:5" x14ac:dyDescent="0.3">' + c + '</row>'
  })
  return { xml: prefix + rows.join('') + suffix, n: it.length }
}

/**
 * `buildKontragent` — index.html:7793-7810.
 *
 * The B column uses Excel SHARED formulas: the first row declares the shared
 * range and `si="0"`, the middle rows reference it with an empty `<f t="shared" si="0"/>`,
 * and the LAST row carries its own plain formula. That three-way split is the
 * template's own shape and is reproduced exactly — a uniform formula would
 * change the file Excel writes back.
 */
export function buildKontragent(
  x: string, SS: SharedStrings, partners: readonly SonPartner[],
): { xml: string; n: number } {
  const { prefix, suffix } = split(x)
  const N = partners.length, secondLast = N + 1, lastRow = N + 2
  const rows = partners.map((p, i) => {
    const n = i + 1, r = n + 2
    let c = ''
    if (n === 1) c += '<c r="B' + r + '" s="4"><f t="shared" ref="B3:B' + secondLast + '" si="0">ROW()-2</f><v>' + n + '</v></c>'
    else if (r === lastRow) c += '<c r="B' + r + '" s="4"><f>ROW()-2</f><v>' + n + '</v></c>'
    else c += '<c r="B' + r + '" s="4"><f t="shared" si="0"/><v>' + n + '</v></c>'
    if (p.voen) c += '<c r="C' + r + '" s="4" t="s"><v>' + SS.sid(String(p.voen)) + '</v></c>'
    c += '<c r="D' + r + '" s="4" t="s"><v>' + SS.sid(p.name) + '</v></c>'
    c += '<c r="E' + r + '"/>'
    if (p.contract) c += '<c r="F' + r + '" s="4" t="s"><v>' + SS.sid(p.contract) + '</v></c>'
    const d = toDDMMYYYY(p.contract_date)
    c += d ? '<c r="G' + r + '" s="5" t="s"><v>' + SS.sid(d) + '</v></c>' : '<c r="G' + r + '" s="5"/>'
    return '<row r="' + r + '" spans="2:7" x14ac:dyDescent="0.3">' + c + '</row>'
  })
  return { xml: prefix + rows.join('') + suffix, n: N }
}

/**
 * `buildWarehouse` — index.html:7812-7837.
 *
 * Per-warehouse movement register. Styles come from the template's own row 4
 * where present, falling back to the dialect table; the E column keeps the
 * template's lookup FORMULA with the resolved name cached in `<v>`.
 *
 * `F`/`G` (in/out) are written only when POSITIVE — a zero is an empty styled
 * cell, not a `0`, so the sheet does not claim a zero-quantity movement.
 */
export function buildWarehouse(
  x: string, SS: SharedStrings, movs: readonly SonMovement[],
  itemBy: Map<string, SonItem>, wh: { name: string },
): { xml: string; n: number } {
  const { prefix, suffix } = split(x)
  const tpl = readWhTemplate(x)
  const fmt = FMT[whFormat(tpl.eformula)]
  const sty: Record<string, string | null> = {
    ...fmt.sty,
    ...Object.fromEntries(Object.entries(tpl.styles).filter(([, v]) => v != null)),
  }
  const eS = sty.E
  const gEmpty = sty.G != null ? sty.G : fmt.gEmpty
  const rowAttrs = tpl.rowAttrs || fmt.rowAttrs
  const eformula = tpl.eformula
  const wm = movs.filter((m) => m.warehouse === wh.name)
  const rows = wm.map((m, i) => {
    const n = i + 1, r = n + 3
    const name = itemBy.get(m.item_code)?.name || ''
    const se = excelSerial(m.date)
    const inq = Number(m.in_qty || 0), outq = Number(m.out_qty || 0)
    let c = '<c r="B' + r + '" s="' + sty.B + '"><f>ROW()-3</f><v>' + n + '</v></c>'
    c += se != null ? '<c r="C' + r + '" s="' + sty.C + '"><v>' + se + '</v></c>' : '<c r="C' + r + '" s="' + sty.C + '"/>'
    c += '<c r="D' + r + '" s="' + sty.D + '" t="s"><v>' + SS.sid(m.item_code) + '</v></c>'
    c += '<c r="E' + r + '" s="' + eS + '" t="str"><f>' + eformula + '</f><v>' + xesc(name) + '</v></c>'
    c += inq > 0
      ? '<c r="F' + r + '" s="' + sty.F + '"><v>' + numstr(m.in_qty) + '</v></c>'
      : '<c r="F' + r + '" s="' + sty.F + '"/>'
    if (outq > 0) {
      c += '<c r="G' + r + '"' + (sty.G != null ? ' s="' + sty.G + '"' : '') + '><v>' + numstr(m.out_qty) + '</v></c>'
    } else {
      c += '<c r="G' + r + '"' + (gEmpty != null ? ' s="' + gEmpty + '"' : '') + '/>'
    }
    c += '<c r="H' + r + '" s="' + sty.H + '" t="s"><v>' + SS.sid(m.type || '') + '</v></c>'
    c += '<c r="I' + r + '" s="' + sty.I + '" t="s"><v>' + SS.sid(m.channel || '') + '</v></c>'
    return '<row r="' + r + '" spans="2:9"' + rowAttrs + '>' + c + '</row>'
  })
  return { xml: prefix + rows.join('') + suffix, n: wm.length }
}

/** `cleanCT` — index.html:7839. Drops the calcChain content-type override. */
export function cleanCT(x: string): string {
  return x.replace(/<Override PartName="\/xl\/calcChain\.xml"[^>]*\/>/, '')
}

/** `cleanRels` — index.html:7840. Drops the calcChain relationship. */
export function cleanRels(x: string): string {
  return x.replace(/<Relationship [^>]*Target="calcChain\.xml"[^>]*\/>/, '')
}

/**
 * `cleanCalcPr` — index.html:7841.
 *
 * Adds `fullCalcOnLoad="1"` so Excel recomputes every formula this export
 * wrote a cached value for. Idempotent: an existing flag is left alone.
 */
export function cleanCalcPr(x: string): string {
  return x.replace(/<calcPr[^>]*\/>/, (t) => (
    t.includes('fullCalcOnLoad') ? t : t.slice(0, -2) + ' fullCalcOnLoad="1"/>'
  ))
}

/** The missing-warehouse refusal — index.html:7858-7861. */
export function missingWarehouseError(parts: readonly string[]): string {
  return 'Şablonda bu anbar(lar)ın vərəqi yoxdur: ' + parts.join(', ')
    + '. Əvvəlcə Excel şablonuna həmin anbar vərəqini əlavə edin, yoxsa məlumat itərdi.'
}

/** The three sheets the export requires by NAME — index.html:7870. */
export const SON_REQUIRED_SHEETS = [
  'Filtrasiya', 'Nomenklatura bazası', 'Kontragent bazası',
] as const

/**
 * The parts this export must NEVER write. Pinned as a named contract so a
 * future change that starts touching the design fails a test rather than
 * silently shipping a workbook with the styling destroyed.
 */
export const SON_UNTOUCHED_PARTS = [
  'xl/styles.xml', 'xl/theme/theme1.xml',
] as const

/** Sheets that carry pivots/derived views and are left entirely alone. */
export const SON_UNTOUCHED_SHEETS = [
  'Mal hereket', 'Checkup', 'Hesabat Anbar', 'Hesabat Filtrasiya',
  'Layihə anbarlarının siyahısı',
] as const
