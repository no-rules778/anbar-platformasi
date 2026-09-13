import { describe, it, expect, vi } from 'vitest'
import {
  SON_EXPORT_BUSY, SON_NO_JSZIP, SON_TPL_MISSING, SON_TPL_URL, SON_XLSX_MIME,
  buildAnbarExport, sonDoneMessage, sonExportFileName, sonInputFromSnapshot,
  sonRunExport, type SonZip,
} from './sonExportRun'
import { nomSequenceError } from './sonExport'

/* «⬇ Excel (SON formatı)» — the ORCHESTRATION (index.html:7843-7928).

   ═══ SYNTHETIC FIXTURES ONLY. NO REAL EXPORT WAS RUN. ═══

   The zip is a hand-built in-memory fake, `fetch` and the download are
   injected, and the real 690 KB template is never read. No network call, no
   TEST/production data, no file written to disk. */

/** A minimal but structurally complete template archive. */
function fakeZip(over: Record<string, string> = {}) {
  const parts: Record<string, string> = {
    'xl/workbook.xml':
      '<workbook><sheets>'
      + '<sheet name="Filtrasiya" r:id="rId1"/>'
      + '<sheet name="Nomenklatura bazası" r:id="rId2"/>'
      + '<sheet name="Kontragent bazası" r:id="rId3"/>'
      + '<sheet name="Ələt (Anbar)" r:id="rId4"/>'
      + '<sheet name="Mal hereket" r:id="rId5"/>'
      + '</sheets><calcPr calcId="191029"/></workbook>',
    'xl/_rels/workbook.xml.rels':
      '<Relationships>'
      + '<Relationship Id="rId1" Target="worksheets/sheet3.xml"/>'
      + '<Relationship Id="rId2" Target="worksheets/sheet11.xml"/>'
      + '<Relationship Id="rId3" Target="worksheets/sheet12.xml"/>'
      + '<Relationship Id="rId4" Target="worksheets/sheet6.xml"/>'
      + '<Relationship Id="rId5" Target="worksheets/sheet1.xml"/>'
      + '<Relationship Id="rC" Target="calcChain.xml"/>'
      + '</Relationships>',
    'xl/worksheets/sheet3.xml': dataSheet('B3:M100', 3, '2:13'),
    'xl/worksheets/sheet11.xml': dataSheet('B2:E100', 2, '2:5'),
    'xl/worksheets/sheet12.xml': dataSheet('B2:G22', 2, '2:7'),
    'xl/worksheets/sheet6.xml':
      '<?xml version="1.0"?><worksheet><dimension ref="A3:I45"/><sheetData>'
      + '<row r="3" spans="2:9"><c r="B3" s="2" t="s"><v>0</v></c></row>'
      + '<row r="4" spans="2:9" ht="15.6"><c r="B4" s="26"/><c r="C4" s="27"/>'
      + '<c r="D4" s="28"/><c r="E4" s="29"><f>Table4[Mal</f></c></row>'
      + '</sheetData></worksheet>',
    'xl/worksheets/sheet1.xml': '<worksheet><sheetData/></worksheet>',
    'xl/worksheets/_rels/sheet3.xml.rels': '<Relationships><Relationship Target="../tables/table1.xml"/></Relationships>',
    'xl/tables/table1.xml':
      '<table name="Table4" ref="B3:M100"><autoFilter ref="B3:M100">'
      + '<filterColumn colId="6"><filters><filter val="Silinmə"/></filters></filterColumn>'
      + '</autoFilter></table>',
    'xl/sharedStrings.xml': '<sst count="1" uniqueCount="1"><si><t>Sement</t></si></sst>',
    '[Content_Types].xml':
      '<Types><Override PartName="/xl/calcChain.xml" ContentType="c"/>'
      + '<Override PartName="/xl/styles.xml" ContentType="s"/></Types>',
    'xl/styles.xml': '<styleSheet>DESIGN</styleSheet>',
    'xl/theme/theme1.xml': '<theme>THEME</theme>',
    'xl/calcChain.xml': '<calcChain><c r="B4"/></calcChain>',
    ...over,
  }
  const removed: string[] = []
  const zip = {
    files: parts,
    file(path: string, data?: string) {
      if (data !== undefined) { parts[path] = data; return zip }
      const v = parts[path]
      return v === undefined ? null : { async: async () => v }
    },
    remove(path: string) { removed.push(path); delete parts[path]; return zip },
    generateAsync: vi.fn(async () => new Blob(['zip'])),
  }
  return { zip: zip as unknown as SonZip, parts, removed }
}

function dataSheet(dim: string, headRow: number, spans: string) {
  return '<?xml version="1.0"?><worksheet><dimension ref="' + dim + '"/><sheetData>'
    + '<row r="' + headRow + '" spans="' + spans + '"><c r="B' + headRow + '" s="2" t="s"><v>0</v></c></row>'
    + '</sheetData></worksheet>'
}

const ITEMS = [{ code: '0000001', name: 'Sement', unit: 'kq', price: 10 }]
const PARTNERS = [{ name: 'Azpetrol', voen: '111', contract: 'C1', contract_date: '2026-01-01' }]
const MOVS = [{
  date: '2026-01-05', warehouse: 'Ələt', item_code: '0000001', in_qty: 4, out_qty: 0,
  type: 'Satınalma', partner: 'Azpetrol', channel: 'Nağd alış',
  contract_num: 'CT-1', invoice_num: 'IV-1', price: 12,
}]
const DB = { items: ITEMS, partners: PARTNERS, movements: MOVS }

function okFetch(body = 'x') {
  return vi.fn(async (url: string) => {
    expect(url).toBe(SON_TPL_URL)
    return { ok: true, arrayBuffer: async () => new TextEncoder().encode(body).buffer } as unknown as Response
  }) as unknown as typeof globalThis.fetch
}

describe('buildAnbarExport — the patch surface (7843-7898)', () => {
  it('writes the three named sheets and the warehouse sheet', async () => {
    const { zip, parts } = fakeZip()
    const r = await buildAnbarExport(zip, DB)
    expect(r.filt).toBe(1)
    expect(r.nom).toBe(1)
    expect(r.knt).toBe(1)
    expect(r.warehouses).toEqual([{ name: 'Ələt', n: 1 }])
    expect(parts['xl/worksheets/sheet3.xml']).toContain('<row r="4"')
  })

  it('patches each dimension to the new last row', async () => {
    const { zip, parts } = fakeZip()
    await buildAnbarExport(zip, DB)
    expect(parts['xl/worksheets/sheet3.xml']).toContain('<dimension ref="B3:M4"/>')
    expect(parts['xl/worksheets/sheet11.xml']).toContain('<dimension ref="B2:E3"/>')
    expect(parts['xl/worksheets/sheet6.xml']).toContain('<dimension ref="A3:I4"/>')
  })

  /* DEFECTIVE VARIANT: patching the ref but leaving the saved filter, so the
     exported workbook opens with rows hidden. */
  it('patches the table ref AND clears its saved filter', async () => {
    const { zip, parts } = fakeZip()
    await buildAnbarExport(zip, DB)
    expect(parts['xl/tables/table1.xml']).toContain('ref="B3:M4"')
    expect(parts['xl/tables/table1.xml']).not.toContain('Silinmə')
    expect(parts['xl/tables/table1.xml']).toContain('<autoFilter ref="B3:M4"/>')
  })

  it('removes calcChain from the archive, the rels and the content types', async () => {
    const { zip, parts, removed } = fakeZip()
    await buildAnbarExport(zip, DB)
    expect(removed).toContain('xl/calcChain.xml')
    expect(parts['[Content_Types].xml']).not.toContain('calcChain')
    expect(parts['xl/_rels/workbook.xml.rels']).not.toContain('calcChain')
  })

  it('adds fullCalcOnLoad so cached formulas recalculate', async () => {
    const { zip, parts } = fakeZip()
    await buildAnbarExport(zip, DB)
    expect(parts['xl/workbook.xml']).toContain('fullCalcOnLoad="1"')
  })

  /* ═══ THE DESIGN BOUNDARY. ═══
     DEFECTIVE VARIANT: regenerating the workbook instead of patching it,
     which is exactly what destroys the styles, theme and pivots. */
  it('leaves styles, theme and the pivot sheet BYTE-IDENTICAL', async () => {
    const { zip, parts } = fakeZip()
    const before = {
      s: parts['xl/styles.xml'], t: parts['xl/theme/theme1.xml'], m: parts['xl/worksheets/sheet1.xml'],
    }
    await buildAnbarExport(zip, DB)
    expect(parts['xl/styles.xml']).toBe(before.s)
    expect(parts['xl/theme/theme1.xml']).toBe(before.t)
    expect(parts['xl/worksheets/sheet1.xml']).toBe(before.m)
  })

  it('appends new strings to the shared pool without disturbing index 0', async () => {
    const { zip, parts } = fakeZip()
    await buildAnbarExport(zip, DB)
    const ss = parts['xl/sharedStrings.xml']
    expect(ss).toContain('<si><t>Sement</t></si>')
    expect(ss).toContain('Azpetrol')
    expect(ss).not.toContain('count="1"')
  })

  /* ═══ THE DATA-LOSS GUARD (7855-7861). ═══
     DEFECTIVE VARIANT: skipping the unknown warehouse, which silently drops
     every one of its movements from the exported file. */
  it('REFUSES when a data warehouse has no template sheet', async () => {
    const { zip } = fakeZip()
    await expect(buildAnbarExport(zip, {
      ...DB, movements: [...MOVS, { ...MOVS[0], warehouse: 'Yeni Anbar' }],
    })).rejects.toThrow(/Şablonda bu anbar\(lar\)ın vərəqi yoxdur: Yeni Anbar \(1 hərəkət\)/)
  })

  it('keeps an EMPTY warehouse sheet structurally valid (dimension row 4)', async () => {
    const { zip, parts } = fakeZip()
    await buildAnbarExport(zip, { ...DB, movements: [] })
    expect(parts['xl/worksheets/sheet6.xml']).toContain('<dimension ref="A3:I4"/>')
  })

  it('propagates the nomenclature sequence refusal', async () => {
    const { zip } = fakeZip()
    await expect(buildAnbarExport(zip, {
      ...DB, items: [{ code: '0000002', name: 'X', unit: 'kq', price: 1 }],
    })).rejects.toThrow(nomSequenceError('0000002', '0000001'))
  })
})

describe('sonRunExport — the control flow (7900-7927)', () => {
  it('fetches the template, downloads, and reports the legacy toast', async () => {
    const { zip } = fakeZip()
    const download = vi.fn()
    const out = await sonRunExport(DB, {
      fetch: okFetch(), jsZip: () => ({ loadAsync: async () => zip }), download, day: '2026-09-13',
    })
    expect(out.ok).toBe(true)
    expect(out.fileName).toBe('Anbar_2026-09-13.xlsx')
    expect(download).toHaveBeenCalledTimes(1)
    expect(download.mock.calls[0][1]).toBe('Anbar_2026-09-13.xlsx')
    expect(out.message).toBe('Excel (SON formatı) yükləndi — Filtrasiya 1, Nomenklatura 1 | Ələt 1')
  })

  it('asks JSZip for a DEFLATE blob with the xlsx mime type', async () => {
    const { zip } = fakeZip()
    await sonRunExport(DB, {
      fetch: okFetch(), jsZip: () => ({ loadAsync: async () => zip }), download: vi.fn(), day: 'd',
    })
    const opts = (zip.generateAsync as unknown as { mock: { calls: unknown[][] } }).mock.calls[0][0] as Record<string, unknown>
    expect(opts.compression).toBe('DEFLATE')
    expect(opts.mimeType).toBe(SON_XLSX_MIME)
  })

  /* Every failure path must DOWNLOAD NOTHING — a misleading file is worse
     than no file. */
  it('reports the template-missing refusal and downloads nothing', async () => {
    const download = vi.fn()
    const out = await sonRunExport(DB, {
      fetch: (async () => ({ ok: false })) as unknown as typeof globalThis.fetch,
      jsZip: () => ({ loadAsync: async () => fakeZip().zip }), download,
    })
    expect(out.ok).toBe(false)
    expect(out.isError).toBe(true)
    expect(out.message).toBe(SON_TPL_MISSING)
    expect(download).not.toHaveBeenCalled()
  })

  it('reports the JSZip-missing refusal and downloads nothing', async () => {
    const download = vi.fn()
    const out = await sonRunExport(DB, { jsZip: () => null, download })
    expect(out.message).toBe(SON_NO_JSZIP)
    expect(download).not.toHaveBeenCalled()
  })

  it('surfaces a missing-warehouse refusal as an error outcome, not a throw', async () => {
    const { zip } = fakeZip()
    const download = vi.fn()
    const out = await sonRunExport(
      { ...DB, movements: [{ ...MOVS[0], warehouse: 'Yoxdur' }] },
      { fetch: okFetch(), jsZip: () => ({ loadAsync: async () => zip }), download },
    )
    expect(out.ok).toBe(false)
    expect(out.message).toContain('Şablonda bu anbar(lar)ın vərəqi yoxdur')
    expect(download).not.toHaveBeenCalled()
  })

  it('never throws, even when the archive is unusable', async () => {
    const out = await sonRunExport(DB, {
      fetch: okFetch(),
      jsZip: () => ({ loadAsync: async () => { throw new Error('ZIP corrupt') } }),
      download: vi.fn(),
    })
    expect(out.ok).toBe(false)
    expect(out.message).toBe('ZIP corrupt')
  })
})

describe('labels, filename and the snapshot adapter', () => {
  it('uses legacy’s busy label verbatim (three ASCII dots)', () => {
    expect(SON_EXPORT_BUSY).toBe('Hazırlanır...')
  })

  it('shares the Anbar_<day>.xlsx stem with Tam ixrac', () => {
    expect(sonExportFileName('2026-09-13')).toBe('Anbar_2026-09-13.xlsx')
  })

  it('formats the done message from the report', () => {
    expect(sonDoneMessage({ filt: 2, nom: 3, knt: 1, warehouses: [{ name: 'A', n: 4 }, { name: 'B', n: 0 }] }))
      .toBe('Excel (SON formatı) yükləndi — Filtrasiya 2, Nomenklatura 3 | A 4, B 0')
  })

  /* ═══ PRICE STRICTLY FROM THE MOVEMENT (7911). ═══
     DEFECTIVE VARIANT: falling back to the item's price, which would give a
     historical opening-balance row a price it never had. */
  it('takes the price from the movement only, never the item card', () => {
    const inp = sonInputFromSnapshot(
      [{ code: '0000001', name: 'Sement', unit: 'kq', price: 99 }],
      [],
      [{ item_code: '0000001', warehouse: 'Ələt', date: '2026-01-01', type: 'Əvvələ qalıq', in_qty: 5 }],
    )
    expect(inp.movements[0].price).toBe(0)
    expect(inp.items[0].price).toBe(99)
  })

  it('normalises nulls to empty strings and zeros', () => {
    const inp = sonInputFromSnapshot(
      [{ code: 'C', name: 'N', unit: null, price: null }],
      [{ name: 'P', voen: null, contract: null, cdate: '2026-02-02' }],
      [{ item_code: 'C', warehouse: 'W', date: 'd', type: 't', in_qty: null, out_qty: null, partner: null }],
    )
    expect(inp.items[0].price).toBe(0)
    /* `cdate` is legacy's spelling; the Supabase column is contract_date. */
    expect(inp.partners[0].contract_date).toBe('2026-02-02')
    expect(inp.movements[0].in_qty).toBe(0)
    expect(inp.movements[0].partner).toBe('')
  })
})
