import { describe, it, expect } from 'vitest'
import {
  CH2USUL, FMT, SON_UNTOUCHED_PARTS, SON_UNTOUCHED_SHEETS, SharedStrings,
  buildFiltrasiya, buildKontragent, buildNomenklatura, buildWarehouse, cleanCT,
  cleanCalcPr, cleanRels, clearTableFilter, discover, excelSerial,
  missingWarehouseError, nomSequenceError, numstr, patchDim, patchTable,
  readWhTemplate, split, toDDMMYYYY, whFormat, xesc, type SonMovement,
} from './sonExport'

/* «⬇ Excel (SON formatı)» — index.html:7684-7898.

   ═══ SYNTHETIC FIXTURES ONLY. NO REAL EXPORT WAS RUN. ═══

   Every XML string below is hand-written here. The real 690 KB template was
   inspected to learn its SHAPE (sheet names, row offsets, style ids), but no
   test reads it, nothing was downloaded and no TEST/production data was
   touched.

   Each block names the DEFECTIVE VARIANT it catches. */

const SS_XML = '<?xml version="1.0"?><sst xmlns="x" count="2" uniqueCount="2">'
  + '<si><t>Sement</t></si><si><t>kq</t></si></sst>'

const sheet = (rows: string, dim = 'B3:M100') =>
  '<?xml version="1.0"?><worksheet xmlns="x"><dimension ref="' + dim + '"/>'
  + '<sheetData><row r="3" spans="2:13"><c r="B3" s="4" t="s"><v>0</v></c></row>'
  + rows + '</sheetData><pageMargins left="0.7"/></worksheet>'

const mv = (over: Partial<SonMovement> = {}): SonMovement => ({
  date: '2026-01-05', warehouse: 'Ələt', item_code: '0000001', in_qty: 4, out_qty: 0,
  type: 'Satınalma', partner: 'Azpetrol', channel: 'Nağd alış',
  contract_num: 'CT-1', invoice_num: 'IV-1', price: 12, ...over,
})

const itemBy = new Map([
  ['0000001', { code: '0000001', name: 'Sement', unit: 'kq', price: 10 }],
  ['0000002', { code: '0000002', name: 'Mismar & Co', unit: 'ədəd', price: 2 }],
])

describe('primitives (7684-7692)', () => {
  it('xesc escapes the three XML metacharacters', () => {
    expect(xesc('a & b < c > d')).toBe('a &amp; b &lt; c &gt; d')
  })

  /* DEFECTIVE VARIANT: returning '' or 'NaN'. A non-numeric must become '0'
     or the cell value is invalid XML content for a numeric cell. */
  it('numstr returns 0 for empty and non-finite input', () => {
    expect(numstr('')).toBe('0')
    expect(numstr(null)).toBe('0')
    expect(numstr('abc')).toBe('0')
    expect(numstr(4.5)).toBe('4.5')
  })

  /* DEFECTIVE VARIANT: using local-time Date(), which shifts the serial by a
     day in negative-offset zones. The epoch is 1899-12-30. */
  it('excelSerial converts ISO dates in UTC', () => {
    expect(excelSerial('1900-01-01')).toBe(2)
    expect(excelSerial('2026-01-05')).toBe(46027)
  })

  it('excelSerial accepts DD.MM.YYYY and rejects anything else', () => {
    expect(excelSerial('05.01.2026')).toBe(46027)
    expect(excelSerial('not-a-date')).toBeNull()
    expect(excelSerial(null)).toBeNull()
  })

  it('toDDMMYYYY reformats ISO and passes other text through', () => {
    expect(toDDMMYYYY('2026-01-05')).toBe('05.01.2026')
    expect(toDDMMYYYY('already')).toBe('already')
  })
})

describe('SharedStrings (7694-7706)', () => {
  /* ═══ THE INDEX-STABILITY CONTRACT. ═══
     DEFECTIVE VARIANT: rebuilding or de-duplicating the pool. Every untouched
     sheet points into this table BY NUMBER, so an existing string must keep
     its index or unrelated sheets silently display the wrong text. */
  it('keeps existing entries at their original index', () => {
    const ss = new SharedStrings(SS_XML)
    expect(ss.sid('Sement')).toBe(0)
    expect(ss.sid('kq')).toBe(1)
  })

  it('appends a new string and returns its new index', () => {
    const ss = new SharedStrings(SS_XML)
    expect(ss.sid('Yeni')).toBe(2)
    expect(ss.sid('Yeni')).toBe(2)
    expect(ss.serialize()).toContain('<si><t>Yeni</t></si>')
  })

  it('rewrites count and uniqueCount to the new total', () => {
    const ss = new SharedStrings(SS_XML)
    ss.sid('A'); ss.sid('B')
    const out = ss.serialize()
    expect(out).toContain('count="4"')
    expect(out).toContain('uniqueCount="4"')
  })

  /* DEFECTIVE VARIANT: omitting xml:space, so Excel eats the spacing. */
  it('preserves whitespace-significant strings', () => {
    const ss = new SharedStrings(SS_XML)
    ss.sid(' leading')
    expect(ss.serialize()).toContain('<si><t xml:space="preserve"> leading</t></si>')
  })

  it('escapes an appended string', () => {
    const ss = new SharedStrings(SS_XML)
    ss.sid('A & B')
    expect(ss.serialize()).toContain('A &amp; B')
  })
})

describe('discover (7708-7722)', () => {
  const files = new Map([
    ['xl/workbook.xml',
      '<workbook><sheets>'
      + '<sheet name="Filtrasiya" sheetId="1" r:id="rId1"/>'
      + '<sheet name="Ələt (Anbar)" sheetId="2" r:id="rId2"/>'
      + '<sheet name="Mal hereket" sheetId="3" r:id="rId3"/>'
      + '</sheets></workbook>'],
    ['xl/_rels/workbook.xml.rels',
      '<Relationships>'
      + '<Relationship Id="rId1" Target="worksheets/sheet3.xml"/>'
      + '<Relationship Id="rId2" Target="worksheets/sheet6.xml"/>'
      + '<Relationship Id="rId3" Target="worksheets/sheet1.xml"/>'
      + '</Relationships>'],
    ['xl/worksheets/_rels/sheet3.xml.rels', '<Relationships><Relationship Target="../tables/table1.xml"/></Relationships>'],
    ['xl/tables/table1.xml', '<table name="Table4" ref="B3:M1278"><autoFilter ref="B3:M1278"/></table>'],
  ])

  it('resolves each sheet name to its part via the rels map', () => {
    const s = discover(files)
    expect(s.byName['Filtrasiya'].sheet).toBe('xl/worksheets/sheet3.xml')
    expect(s.byName['Mal hereket'].sheet).toBe('xl/worksheets/sheet1.xml')
  })

  /* DEFECTIVE VARIANT: a hardcoded warehouse list. Discovery is by the
     «(Anbar)» SUFFIX so a template with 3, 5 or 10 warehouses just works. */
  it('discovers warehouses by the (Anbar) suffix and strips it', () => {
    const s = discover(files)
    expect(s.warehouses).toHaveLength(1)
    expect(s.warehouses[0].name).toBe('Ələt')
    expect(s.warehouses[0].display).toBe('Ələt (Anbar)')
  })

  it('does NOT treat a non-Anbar sheet as a warehouse', () => {
    expect(discover(files).warehouses.map((w) => w.name)).not.toContain('Mal hereket')
  })

  it('attaches the table when the sheet has one, null otherwise', () => {
    const s = discover(files)
    expect(s.byName['Filtrasiya'].table).toEqual({ file: 'xl/tables/table1.xml', name: 'Table4' })
    expect(s.byName['Mal hereket'].table).toBeNull()
  })
})

describe('XML patch helpers (7738-7743)', () => {
  it('patchDim rewrites only the last row of the dimension', () => {
    expect(patchDim('<dimension ref="B3:M100"/>', 7)).toBe('<dimension ref="B3:M7"/>')
  })

  it('patchTable rewrites every ref in the part', () => {
    const out = patchTable('<table ref="B3:I45"><autoFilter ref="B3:I45"/></table>', 9)
    expect(out).toBe('<table ref="B3:I9"><autoFilter ref="B3:I9"/></table>')
  })

  /* ═══ THE HIDDEN-ROW DEFECT. ═══
     DEFECTIVE VARIANT: leaving the saved filter in place. The template ships
     a «Silinmə» filter and hidden Nomenklatura rows; without clearing, the
     exported file opens with data invisible and looks like it is missing. */
  it('clearTableFilter drops filterColumn children but keeps the element', () => {
    const t = '<autoFilter ref="B3:I45" xr:uid="{X}"><filterColumn colId="6">'
      + '<filters><filter val="Silinmə"/></filters></filterColumn></autoFilter>'
    const out = clearTableFilter(t)
    expect(out).toBe('<autoFilter ref="B3:I45" xr:uid="{X}"/>')
    expect(out).not.toContain('Silinmə')
  })

  it('split keeps the header row in the prefix', () => {
    const { prefix, suffix } = split(sheet(''))
    expect(prefix).toContain('<row r="3"')
    expect(prefix).toContain('</row>')
    expect(suffix.startsWith('</sheetData>')).toBe(true)
  })
})

describe('package-level cleanups (7839-7841)', () => {
  it('cleanCT removes the calcChain override', () => {
    const ct = '<Types><Override PartName="/xl/calcChain.xml" ContentType="x"/><Override PartName="/xl/styles.xml"/></Types>'
    const out = cleanCT(ct)
    expect(out).not.toContain('calcChain')
    expect(out).toContain('styles.xml')
  })

  it('cleanRels removes the calcChain relationship only', () => {
    const r = '<Relationships><Relationship Id="r1" Target="calcChain.xml"/><Relationship Id="r2" Target="styles.xml"/></Relationships>'
    const out = cleanRels(r)
    expect(out).not.toContain('calcChain')
    expect(out).toContain('styles.xml')
  })

  /* DEFECTIVE VARIANT: omitting fullCalcOnLoad. Every formula this export
     writes carries a CACHED value; without the flag Excel shows the cache. */
  it('cleanCalcPr adds fullCalcOnLoad and is idempotent', () => {
    const out = cleanCalcPr('<calcPr calcId="191029" iterateDelta="1E-4"/>')
    expect(out).toBe('<calcPr calcId="191029" iterateDelta="1E-4" fullCalcOnLoad="1"/>')
    expect(cleanCalcPr(out)).toBe(out)
  })
})

describe('buildFiltrasiya (7750-7773)', () => {
  const movs = [mv(), mv({ type: 'Sahəyə' }), mv({ type: 'Əvvələ qalıq', price: 0, channel: 'Əvvələ anbar qalığı' })]

  /* DEFECTIVE VARIANT: including every movement. Filtrasiya is the PURCHASE
     register: only «Satınalma» and «Əvvələ qalıq». */
  it('includes only Satınalma and Əvvələ qalıq rows', () => {
    const out = buildFiltrasiya(sheet(''), new SharedStrings(SS_XML), movs, itemBy)
    /* Three movements in, the «Sahəyə» one dropped: rows 4 and 5 only, so
       the register stops before the row a third entry would occupy. */
    expect(out.n).toBe(2)
    expect(out.xml).toContain('<row r="4"')
    expect(out.xml).toContain('<row r="5"')
    expect(out.xml).not.toContain('<row r="6"')
    /* And the excluded type never reaches the pool at all. */
    expect(out.xml).not.toContain('Sahəyə')
  })

  it('starts data at spreadsheet row 4', () => {
    const out = buildFiltrasiya(sheet(''), new SharedStrings(SS_XML), [mv()], itemBy)
    expect(out.xml).toContain('<row r="4"')
  })

  it('keeps the D and I formulas with a cached value', () => {
    const out = buildFiltrasiya(sheet(''), new SharedStrings(SS_XML), [mv()], itemBy)
    expect(out.xml).toContain('_xlfn.XLOOKUP')
    expect(out.xml).toContain('Malın miqdarı]]*Table4')
    expect(out.xml).toContain('<v>48</v>')
  })

  /* DEFECTIVE VARIANT: writing a 0 price cell. A priceless opening balance
     must leave H EMPTY, not claim a price of zero. */
  it('writes an EMPTY price cell when there is no price', () => {
    const out = buildFiltrasiya(sheet(''), new SharedStrings(SS_XML), [mv({ price: 0 })], itemBy)
    expect(out.xml).toContain('<c r="H4" s="4"/>')
  })

  it('maps the channel through CH2USUL', () => {
    expect(CH2USUL['Nağd alış']).toBe('Nağd')
    expect(CH2USUL['Əvvələ anbar qalığı']).toBe('Əvvələ qalıq')
  })

  it('omits contract and invoice cells when absent', () => {
    const out = buildFiltrasiya(sheet(''), new SharedStrings(SS_XML), [mv({ contract_num: '', invoice_num: '' })], itemBy)
    expect(out.xml).not.toContain('r="L4"')
    expect(out.xml).not.toContain('r="M4"')
  })
})

describe('buildNomenklatura (7775-7791)', () => {
  const nomSheet = '<?xml version="1.0"?><worksheet><dimension ref="B2:E100"/>'
    + '<sheetData><row r="2" spans="2:5"><c r="B2" s="2" t="s"><v>0</v></c></row>'
    + '</sheetData></worksheet>'

  it('starts data at row 3 and derives the code from ROW()', () => {
    const out = buildNomenklatura(nomSheet, new SharedStrings(SS_XML),
      [{ code: '0000001', name: 'A', unit: 'kq', price: 1 }])
    expect(out.xml).toContain('<row r="3"')
    expect(out.xml).toContain('TEXT(ROW()-2,"0000000")')
    expect(out.xml).toContain('<v>0000001</v>')
  })

  /* ═══ THE SEQUENCE GUARD. ═══
     DEFECTIVE VARIANT: exporting anyway. Column D is a ROW()-derived formula,
     so a gap would silently RELABEL every later item — the export must refuse. */
  it('REFUSES a gap in the code sequence', () => {
    expect(() => buildNomenklatura(nomSheet, new SharedStrings(SS_XML), [
      { code: '0000001', name: 'A', unit: 'kq', price: 1 },
      { code: '0000003', name: 'C', unit: 'kq', price: 1 },
    ])).toThrow(nomSequenceError('0000003', '0000002'))
  })

  it('counts duplicate names for the COUNTIF cache', () => {
    const out = buildNomenklatura(nomSheet, new SharedStrings(SS_XML), [
      { code: '0000001', name: 'Eyni', unit: 'kq', price: 1 },
      { code: '0000002', name: 'Eyni', unit: 'kq', price: 1 },
    ])
    expect(out.xml).toContain('COUNTIF')
    expect((out.xml.match(/<v>2<\/v>/g) ?? []).length).toBeGreaterThanOrEqual(1)
  })
})

describe('buildKontragent (7793-7810)', () => {
  const kSheet = '<?xml version="1.0"?><worksheet><dimension ref="B2:G22"/>'
    + '<sheetData><row r="2" spans="2:7"><c r="B2" s="2" t="s"><v>0</v></c></row>'
    + '</sheetData></worksheet>'
  const ps = [
    { name: 'A', voen: '111', contract: 'C1', contract_date: '2026-01-01' },
    { name: 'B', voen: null, contract: null, contract_date: null },
    { name: 'C', voen: '333', contract: null, contract_date: null },
  ]

  /* DEFECTIVE VARIANT: a uniform formula on every row. The template uses
     Excel SHARED formulas — declaration, references, then a plain last row. */
  it('writes the three-way shared-formula shape', () => {
    const out = buildKontragent(kSheet, new SharedStrings(SS_XML), ps)
    expect(out.xml).toContain('<f t="shared" ref="B3:B4" si="0">ROW()-2</f>')
    expect(out.xml).toContain('<f t="shared" si="0"/>')
    expect(out.xml).toContain('<c r="B5" s="4"><f>ROW()-2</f>')
  })

  it('omits VÖEN and contract cells when absent, but always writes E and G', () => {
    const out = buildKontragent(kSheet, new SharedStrings(SS_XML), ps)
    expect(out.xml).toContain('<c r="E4"/>')
    expect(out.xml).toContain('<c r="G4" s="5"/>')
    expect(out.xml).not.toContain('r="C4"')
  })

  it('formats the contract date as DD.MM.YYYY', () => {
    const ss = new SharedStrings(SS_XML)
    const out = buildKontragent(kSheet, ss, [ps[0]])
    expect(ss.value).toContain('01.01.2026')
    expect(out.n).toBe(1)
  })
})

describe('buildWarehouse (7812-7837)', () => {
  const whSheet = (e = 'Table4[Mal') =>
    '<?xml version="1.0"?><worksheet><dimension ref="A3:I45"/><sheetData>'
    + '<row r="3" spans="2:9"><c r="B3" s="2" t="s"><v>0</v></c></row>'
    + '<row r="4" spans="2:9" ht="15.6" x14ac:dyDescent="0.3">'
    + '<c r="B4" s="26"/><c r="C4" s="27"/><c r="D4" s="28"/>'
    + '<c r="E4" s="29"><f>' + e + '</f></c></row>'
    + '</sheetData></worksheet>'

  it('reads the row-4 style model and E formula', () => {
    const t = readWhTemplate(whSheet())
    expect(t.styles.B).toBe('26')
    expect(t.eformula).toContain('Table4[Mal')
    expect(t.rowAttrs).toContain('ht="15.6"')
  })

  it('selects the dialect from the E formula', () => {
    expect(whFormat('Table4[Malın kodu]')).toBe('elet')
    expect(whFormat('SOMETHING ELSE')).toBe('astara')
    expect(whFormat(null)).toBe('astara')
    expect(FMT.elet.gEmpty).toBe('26')
    expect(FMT.astara.gEmpty).toBeNull()
  })

  /* DEFECTIVE VARIANT: exporting every movement into every warehouse sheet. */
  it('includes only movements of that warehouse', () => {
    const out = buildWarehouse(whSheet(), new SharedStrings(SS_XML),
      [mv(), mv({ warehouse: 'Astara' })], itemBy, { name: 'Ələt' })
    expect(out.n).toBe(1)
  })

  /* DEFECTIVE VARIANT: writing <v>0</v>. A zero would read as a real
     zero-quantity movement and sum into the pivot. */
  it('writes an EMPTY styled cell for a zero in/out quantity', () => {
    const out = buildWarehouse(whSheet(), new SharedStrings(SS_XML),
      [mv({ in_qty: 0, out_qty: 3 })], itemBy, { name: 'Ələt' })
    expect(out.xml).toContain('<c r="F4" s="26"/>')
    expect(out.xml).toContain('<v>3</v>')
  })

  it('keeps the template E formula with the resolved name cached', () => {
    const out = buildWarehouse(whSheet(), new SharedStrings(SS_XML), [mv()], itemBy, { name: 'Ələt' })
    expect(out.xml).toContain('<f>Table4[Mal</f>')
    expect(out.xml).toContain('<v>Sement</v>')
  })

  it('escapes an item name containing an ampersand', () => {
    const out = buildWarehouse(whSheet(), new SharedStrings(SS_XML),
      [mv({ item_code: '0000002' })], itemBy, { name: 'Ələt' })
    expect(out.xml).toContain('Mismar &amp; Co')
  })
})

describe('the untouched-design contract', () => {
  /* Pinned as a named list so a future change that starts rewriting styles,
     the theme or a pivot sheet fails here rather than shipping a workbook
     with its design destroyed. */
  it('never names styles or theme as writable parts', () => {
    expect(SON_UNTOUCHED_PARTS).toContain('xl/styles.xml')
    expect(SON_UNTOUCHED_PARTS).toContain('xl/theme/theme1.xml')
  })

  it('lists the pivot and derived sheets as untouched', () => {
    expect(SON_UNTOUCHED_SHEETS).toContain('Mal hereket')
    expect(SON_UNTOUCHED_SHEETS).toContain('Hesabat Anbar')
    expect(SON_UNTOUCHED_SHEETS).toContain('Layihə anbarlarının siyahısı')
  })

  it('builds the legacy missing-warehouse refusal text', () => {
    const m = missingWarehouseError(['Yeni (3 hərəkət)'])
    expect(m).toContain('Şablonda bu anbar(lar)ın vərəqi yoxdur: Yeni (3 hərəkət)')
    expect(m).toContain('yoxsa məlumat itərdi')
  })
})
