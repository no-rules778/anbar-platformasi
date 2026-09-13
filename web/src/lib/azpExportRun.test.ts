import { describe, expect, it, vi } from 'vitest'
import {
  azpRunExport, AZP_XLSX_MIME, type AzpExportDeps, type AzpJsZip, type AzpZip,
} from './azpExportRun'
import { AZP_TPL, AZP_TPL_URL, AZP_EXPORT_NOT_READY } from './azpTemplateExport'

/* T5 — the export ORCHESTRATION rows: M17-95, M17-96, M17-98, M17-99.

   ═══ SYNTHETIC FIXTURES ONLY. NO REAL DATA WAS EXPORTED. ═══

   Every card, movement and XML string below is hand-written in this file.
   `fetch`, JSZip, SheetJS and the anchor download are all mocked, so nothing
   here reaches a network, a disk or a real workbook.

   WHAT THIS SUITE DELIBERATELY DOES NOT PROVE (protocol §7). M17-100 is the
   EGRESS row — whether the real card and movement set may actually leave the
   system — and it stays BLOCKED. Running this orchestration over invented
   rows says nothing about that, and a passing test here is not authority to
   export anything real. */

/* ------------------------------------------------------------- fixtures */

const CARDS = [
  {
    card_id: 'c1', card_no: '0012', holder: 'Anar', project: 'L1',
    balance: 10, medaxil_total: 30, mexaric_total: 20,
  },
  {
    card_id: 'c2', card_no: '0034', holder: 'Rəna', project: null,
    balance: 5, medaxil_total: 15, mexaric_total: 10,
  },
]

const MOVS = [
  { id: 1, card_id: 'c1', kind: 'medaxil', amount: 30, op_date: '2026-09-01', cancelled: false },
  { id: 2, card_id: 'c1', kind: 'mexaric', amount: 20, op_date: '2026-09-02', cancelled: false },
  { id: 3, card_id: 'c2', kind: 'medaxil', amount: 15, op_date: '2026-09-01', cancelled: false },
  { id: 4, card_id: 'c2', kind: 'mexaric', amount: 10, op_date: '2026-09-03', cancelled: false },
  /* A cancelled row — excluded by definition, not by a filter. */
  { id: 5, card_id: 'c1', kind: 'medaxil', amount: 999, op_date: '2026-09-04', cancelled: true },
]

const INPUT = { cards: CARDS, movs: MOVS, appBalance: 500, ready: true }

/** A worksheet in the template's shape, with a design marker per module. */
function sheetXml(marker: string): string {
  return '<?xml version="1.0"?><worksheet xmlns="x">'
    + '<dimension ref="A1:Z99"/>'
    + '<sheetViews><sheetView workbookViewId="0"/></sheetViews>'
    + '<cols><col min="1" max="1" width="3.88" style="2"/></cols>'
    + '<sheetData><row r="1"><c r="A1" s="38"/></row></sheetData>'
    + '<mergeCells count="1"><mergeCell ref="A1:B1"/></mergeCells>'
    + '<pageMargins left="0.7"/><!--' + marker + '--></worksheet>'
}

const WORKBOOK_XML =
  '<workbook xmlns:r="rr"><sheets>'
  + '<sheet name="AZP kartların hesabatı " sheetId="1" r:id="rId1"/>'
  + '<sheet name="ARAZ" sheetId="2" r:id="rId2"/>'
  + '</sheets></workbook>'

const RELS_XML =
  '<Relationships>'
  + '<Relationship Id="rId1" Target="worksheets/sheet1.xml"/>'
  + '<Relationship Id="rId2" Target="worksheets/sheet2.xml"/>'
  + '<Relationship Id="rId3" Target="styles.xml"/>'
  + '</Relationships>'

const CT_XML =
  '<Types>'
  + '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="ws"/>'
  + '<Override PartName="/xl/worksheets/sheet2.xml" ContentType="ws"/>'
  + '<Override PartName="/xl/styles.xml" ContentType="st"/>'
  + '</Types>'

/**
 * A fake JSZip whose archive is a plain Map — every write, read and removal
 * is observable, so the assertions are about what the export ACTUALLY did to
 * the package, not about what a helper returned.
 */
function fakeZip() {
  const files = new Map<string, string>([
    ['xl/worksheets/sheet1.xml', sheetXml('SHEET1-AZPETROL-DESIGN')],
    ['xl/worksheets/sheet2.xml', sheetXml('SHEET2-ARAZ-DESIGN')],
    ['xl/worksheets/_rels/sheet1.xml.rels', '<Relationships/>'],
    ['xl/worksheets/_rels/sheet2.xml.rels', '<Relationships/>'],
    ['xl/workbook.xml', WORKBOOK_XML],
    ['xl/_rels/workbook.xml.rels', RELS_XML],
    ['[Content_Types].xml', CT_XML],
    ['xl/styles.xml', '<styleSheet>DESIGN-STYLES</styleSheet>'],
    ['xl/theme/theme1.xml', '<theme>DESIGN-THEME</theme>'],
    ['xl/calcChain.xml', '<calcChain><c r="B4"/></calcChain>'],
  ])
  const removed: string[] = []
  const written: string[] = []
  const generate = vi.fn(async (opts: Record<string, unknown>) => {
    generate.mock.calls.at(-1)
    return { __blob: true, opts } as unknown as Blob
  })

  const zip: AzpZip = {
    file(path: string, data?: string) {
      if (data === undefined) {
        const v = files.get(path)
        return v === undefined ? null : { async: async () => v }
      }
      written.push(path)
      files.set(path, data)
      return undefined
    },
    remove(path: string) {
      removed.push(path)
      files.delete(path)
      return undefined
    },
    generateAsync: generate,
  } as AzpZip

  const loadAsync = vi.fn(async (_buf: ArrayBuffer) => zip)
  const jsZip: AzpJsZip = { loadAsync }
  return { files, removed, written, zip, jsZip, loadAsync, generate }
}

/** A `fetch` that answers the template URL with a byte buffer. */
function fakeFetch(ok = true) {
  return vi.fn(async (url: string | URL | Request) => {
    void url
    return {
      ok,
      arrayBuffer: async () => new ArrayBuffer(8),
    } as unknown as Response
  }) as unknown as typeof globalThis.fetch
}

/** A SheetJS double whose every write is observable. */
function fakeXlsx() {
  const appended: { sheetName: string; ws: unknown }[] = []
  const written: string[] = []
  return {
    appended,
    written,
    ns: {
      utils: {
        book_new: () => ({ Sheets: {}, SheetNames: [] }),
        book_append_sheet: (_wb: unknown, ws: unknown, sheetName: string) => {
          appended.push({ sheetName, ws })
        },
        aoa_to_sheet: (rows: unknown[][]) => {
          /* A minimal real-shaped worksheet: address-keyed cells, so
             `azpFallbackWorksheet`'s text pinning has something to act on. */
          const ws: Record<string, unknown> = { '!ref': 'A1' }
          rows.forEach((r, ri) => r.forEach((v, ci) => {
            if (v === '' || v == null) return
            ws[String.fromCharCode(65 + ci) + (ri + 1)] =
              typeof v === 'number' ? { t: 'n', v } : { t: 's', v: String(v) }
          }))
          return ws
        },
      },
      writeFile: (_wb: unknown, fileName: string) => { written.push(fileName) },
    } as unknown as NonNullable<AzpExportDeps['xlsx']>,
  }
}

function deps(over: Partial<AzpExportDeps> = {}): AzpExportDeps & {
  z: ReturnType<typeof fakeZip>
  downloads: { blob: Blob; fileName: string }[]
} {
  const z = fakeZip()
  const downloads: { blob: Blob; fileName: string }[] = []
  return {
    z,
    downloads,
    fetch: fakeFetch(),
    jsZip: () => z.jsZip,
    download: (blob, fileName) => { downloads.push({ blob, fileName }) },
    day: '2026-09-12',
    ...over,
  }
}

/* ------------------------------------------------ the success orchestration */

describe('the template export runs end to end (M17-95, M17-96)', () => {
  it('fetches the template, patches the sheet, drops the other one and downloads once', async () => {
    const d = deps()
    const out = await azpRunExport('azpetrol', INPUT, d)

    expect(out).toMatchObject({ ok: true, path: 'template', isError: false })

    /* 1. the template was actually fetched, at the legacy URL */
    expect(d.fetch).toHaveBeenCalledWith(AZP_TPL_URL)
    expect(d.z.loadAsync).toHaveBeenCalledTimes(1)

    /* 2. the module's own worksheet was WRITTEN back, patched */
    expect(d.z.written).toContain(AZP_TPL.azpetrol.part)
    const patched = d.z.files.get(AZP_TPL.azpetrol.part) as string
    expect(patched).toContain('<dimension ref="A1:')
    expect(patched).toContain('<sheetData><row r="1"')
    expect(patched).toContain('<mergeCells count=')
    /* the template's own design bytes outside the four elements survived */
    expect(patched).toContain('<sheetViews><sheetView workbookViewId="0"/></sheetViews>')
    expect(patched).toContain('SHEET1-AZPETROL-DESIGN')
    /* and the four replaced elements' OLD values are gone */
    expect(patched).not.toContain('A1:Z99')
    expect(patched).not.toContain('width="3.88"')
    expect(patched).not.toContain('ref="A1:B1"')

    /* 3. the three package parts were rewritten */
    expect(d.z.written).toContain('xl/workbook.xml')
    expect(d.z.written).toContain('xl/_rels/workbook.xml.rels')
    expect(d.z.written).toContain('[Content_Types].xml')

    /* 4. the other sheet's parts and the calc chain were REMOVED */
    expect(d.z.removed).toContain('xl/worksheets/sheet2.xml')
    expect(d.z.removed).toContain('xl/worksheets/_rels/sheet2.xml.rels')
    expect(d.z.removed).toContain('xl/calcChain.xml')
    expect(d.z.files.has('xl/calcChain.xml')).toBe(false)

    /* 5. exactly one blob was generated and one file downloaded */
    expect(d.z.generate).toHaveBeenCalledTimes(1)
    expect(d.z.generate.mock.calls[0][0]).toMatchObject({
      type: 'blob', compression: 'DEFLATE', mimeType: AZP_XLSX_MIME,
    })
    expect(d.downloads).toHaveLength(1)
    expect(d.downloads[0].fileName).toBe('Azpetrol_kart_hesabati_2026-09-12.xlsx')
    expect(out.fileName).toBe('Azpetrol_kart_hesabati_2026-09-12.xlsx')

    /* 6. the exact success toast */
    expect(out.message).toBe('Azpetrol hesabatı yükləndi — 2 kart')
  })

  /* THE FALSIFYING CONTROL for the preservation claim above. If the export
     touched the design parts, this would fail — so "styles.xml is untouched"
     is a measured fact here, not an assumption. */
  it('leaves styles.xml and theme1.xml byte-identical and never writes them', async () => {
    const d = deps()
    const before = {
      styles: d.z.files.get('xl/styles.xml'),
      theme: d.z.files.get('xl/theme/theme1.xml'),
    }
    await azpRunExport('azpetrol', INPUT, d)
    expect(d.z.files.get('xl/styles.xml')).toBe(before.styles)
    expect(d.z.files.get('xl/theme/theme1.xml')).toBe(before.theme)
    expect(d.z.written).not.toContain('xl/styles.xml')
    expect(d.z.written).not.toContain('xl/theme/theme1.xml')
    expect(d.z.removed).not.toContain('xl/styles.xml')
    expect(d.z.removed).not.toContain('xl/theme/theme1.xml')
  })

  it('writes the module sheet exactly once and never the other module’s sheet', async () => {
    const d = deps()
    await azpRunExport('azpetrol', INPUT, d)
    expect(d.z.written.filter((p) => p === 'xl/worksheets/sheet1.xml')).toHaveLength(1)
    expect(d.z.written).not.toContain('xl/worksheets/sheet2.xml')
  })
})

/* ------------------------------------------------------- cross-module leak */

describe('one module’s file carries no trace of the other (M17-96)', () => {
  it('removes the ARAZ sheet from every reference in an Azpetrol export', async () => {
    const d = deps()
    await azpRunExport('azpetrol', INPUT, d)

    const wb = d.z.files.get('xl/workbook.xml') as string
    const rels = d.z.files.get('xl/_rels/workbook.xml.rels') as string
    const ct = d.z.files.get('[Content_Types].xml') as string

    expect(wb).not.toContain('name="ARAZ"')
    expect(wb).not.toContain('rId2')
    expect(rels).not.toContain('worksheets/sheet2.xml')
    expect(ct).not.toContain('/xl/worksheets/sheet2.xml')
    expect(d.z.files.has('xl/worksheets/sheet2.xml')).toBe(false)
    expect(d.z.files.has('xl/worksheets/_rels/sheet2.xml.rels')).toBe(false)

    /* The CONTROL: the module's OWN sheet survives everywhere. Without this,
       a removal that deleted both sheets would pass the assertions above. */
    expect(wb).toContain('name="AZP kartların hesabatı "')
    expect(rels).toContain('worksheets/sheet1.xml')
    expect(ct).toContain('/xl/worksheets/sheet1.xml')
    expect(d.z.files.has('xl/worksheets/sheet1.xml')).toBe(true)
    /* and the styles relationship, which belongs to neither sheet, is intact */
    expect(rels).toContain('rId3')
  })

  it('removes the Azpetrol sheet — by its TRAILING-SPACE name — in an Araz export', async () => {
    const d = deps()
    const out = await azpRunExport('araz', INPUT, d)
    expect(out.path).toBe('template')

    const wb = d.z.files.get('xl/workbook.xml') as string
    expect(wb).not.toContain('AZP kartların hesabatı')
    expect(wb).toContain('name="ARAZ"')
    expect(d.z.files.has('xl/worksheets/sheet1.xml')).toBe(false)
    expect(d.z.files.has('xl/worksheets/sheet2.xml')).toBe(true)
    expect(d.z.written).toContain('xl/worksheets/sheet2.xml')

    /* The patched sheet is the ARAZ one, carrying ITS design marker. */
    expect(d.z.files.get('xl/worksheets/sheet2.xml') as string)
      .toContain('SHEET2-ARAZ-DESIGN')
    expect(out.fileName).toBe('Araz_kart_hesabati_2026-09-12.xlsx')
    expect(out.message).toBe('Araz hesabatı yükləndi — 2 kart')
  })

  /* M17-97's load-bearing trailing space, proven at the ORCHESTRATION level.
     A workbook whose sheet name is trimmed no longer matches, the removal
     silently fails, and the other module leaks — which is exactly what this
     asserts happens. */
  it('LEAKS the other sheet when the trailing space is trimmed — the control', async () => {
    const d = deps()
    d.z.files.set(
      'xl/workbook.xml',
      WORKBOOK_XML.replace('name="AZP kartların hesabatı "', 'name="AZP kartların hesabatı"'),
    )
    /* Also break the rId path so ONLY the name match could have removed it. */
    d.z.files.set(
      'xl/_rels/workbook.xml.rels',
      '<Relationships><Relationship Id="rId9" Target="styles.xml"/></Relationships>',
    )
    await azpRunExport('araz', INPUT, d)
    const wb = d.z.files.get('xl/workbook.xml') as string
    /* The name in the workbook does not equal `AZP_TPL.araz.otherName`, so the
       entry survives — the leak the trailing space prevents. */
    expect(wb).toContain('AZP kartların hesabatı')
  })
})

/* ------------------------------------------------------ the unfiltered set */

describe('the export takes the FULL non-cancelled module set (M17-98)', () => {
  it('writes every non-cancelled movement of every card, cancelled ones excluded', async () => {
    const d = deps()
    await azpRunExport('azpetrol', INPUT, d)
    const sheet = d.z.files.get('xl/worksheets/sheet1.xml') as string

    /* Both cards' identities reached the sheet. */
    expect(sheet).toContain('<t xml:space="preserve">0012</t>')
    expect(sheet).toContain('<t xml:space="preserve">0034</t>')
    /* Every non-cancelled amount reached it. */
    for (const v of ['30', '20', '15', '10']) {
      expect(sheet).toContain('<v>' + v + '</v>')
    }
    /* The cancelled row's distinctive amount did NOT. */
    expect(sheet).not.toContain('<v>999</v>')
  })

  /* THE CONTROL for the exclusion above: with the same row un-cancelled, the
     amount DOES appear. Otherwise "999 is absent" could just mean the writer
     drops amounts. */
  it('writes that same amount once the row is no longer cancelled', async () => {
    const d = deps()
    await azpRunExport(
      'azpetrol',
      { ...INPUT, movs: MOVS.map((r) => ({ ...r, cancelled: false })) },
      d,
    )
    expect(d.z.files.get('xl/worksheets/sheet1.xml') as string).toContain('<v>999</v>')
  })

  it('keeps a leading-zero card number as inline TEXT, never a number', async () => {
    const d = deps()
    await azpRunExport('azpetrol', INPUT, d)
    const sheet = d.z.files.get('xl/worksheets/sheet1.xml') as string
    expect(sheet).toContain('t="inlineStr"><is><t xml:space="preserve">0012</t>')
    /* The control: the number 12 is never written as a value in its place. */
    expect(sheet).not.toContain('<v>0012</v>')
    expect(sheet).not.toContain('<v>12</v>')
  })
})

/* ------------------------------------------------------------- the refusals */

describe('the two refusals precede any work (index.html:9723-9724)', () => {
  it('refuses an unloaded board and touches nothing', async () => {
    const d = deps()
    const out = await azpRunExport('azpetrol', { ...INPUT, ready: false }, d)
    expect(out).toMatchObject({ ok: false, path: 'refused', isError: true })
    expect(out.message).toBe(AZP_EXPORT_NOT_READY)
    expect(d.fetch).not.toHaveBeenCalled()
    expect(d.downloads).toHaveLength(0)
  })

  it('refuses a module with no cards, naming it', async () => {
    const d = deps()
    const out = await azpRunExport('araz', { ...INPUT, cards: [] }, d)
    expect(out.message).toBe('Araz üçün kart yoxdur')
    expect(d.fetch).not.toHaveBeenCalled()
  })
})

/* ------------------------------------------------------------- the fallback */

describe('a template failure really runs the SheetJS fallback (M17-99)', () => {
  /** Each way the template path can fail, and the message it must carry. */
  const failures: [string, Partial<AzpExportDeps>, string][] = [
    ['JSZip is absent', { jsZip: () => null }, 'JSZip kitabxanası yüklənmədi'],
    ['the template 404s', { fetch: fakeFetch(false) }, 'Şablon tapılmadı (azpetrol-template.xlsx)'],
  ]

  for (const [name, over, msg] of failures) {
    it('falls back when ' + name + ', with the exact warning', async () => {
      const x = fakeXlsx()
      const d = deps({ ...over, xlsx: x.ns })
      const out = await azpRunExport('azpetrol', INPUT, d)

      expect(out.path).toBe('fallback')
      expect(out.isError).toBe(true)
      expect(out.message).toBe('Şablonsuz ixrac (dizayn tətbiq olunmadı): ' + msg)

      /* The REAL writer ran: a sheet was appended and a file written. */
      expect(x.appended).toHaveLength(1)
      expect(x.written).toEqual(['Azpetrol_kart_hesabati_2026-09-12.xlsx'])
      /* And the template path produced nothing. */
      expect(d.downloads).toHaveLength(0)
    })
  }

  it('falls back when the template lacks the module’s worksheet part', async () => {
    const x = fakeXlsx()
    const d = deps({ xlsx: x.ns })
    d.z.files.delete('xl/worksheets/sheet1.xml')
    const out = await azpRunExport('azpetrol', INPUT, d)
    expect(out.path).toBe('fallback')
    expect(out.message)
      .toBe('Şablonsuz ixrac (dizayn tətbiq olunmadı): Şablonda xl/worksheets/sheet1.xml vərəqi yoxdur')
    expect(x.written).toHaveLength(1)
  })

  /* THE ROW. The fallback must carry the SAME complete dataset — losing the
     design is acceptable, losing a row is not. */
  it('gives the fallback the same full unfiltered non-cancelled set', async () => {
    const x = fakeXlsx()
    const d = deps({ jsZip: () => null, xlsx: x.ns })
    await azpRunExport('azpetrol', INPUT, d)

    const ws = x.appended[0].ws as Record<string, { v?: unknown }>
    const values = Object.entries(ws)
      .filter(([k]) => k[0] !== '!')
      .map(([, c]) => c.v)

    /* both cards, as TEXT with the leading zero intact */
    expect(values).toContain('0012')
    expect(values).toContain('0034')
    expect((ws as Record<string, { t?: string; z?: string }>)[
      Object.keys(ws).find((k) => (ws[k] as { v?: unknown }).v === '0012') as string
    ]).toMatchObject({ t: 's', z: '@' })
    /* every non-cancelled amount */
    for (const v of [30, 20, 15, 10]) expect(values).toContain(v)
    /* and not the cancelled one */
    expect(values).not.toContain(999)
    /* the sheet name is the 28-char-sliced legacy one */
    expect(x.appended[0].sheetName).toBe('AZP kartların hesabatı')
  })

  /* THE CONTROL for the dataset claim: un-cancel the row and it appears in
     the FALLBACK too, so its absence above is the cancellation, not the
     writer silently dropping rows. */
  it('the fallback writes that amount once the row is no longer cancelled', async () => {
    const x = fakeXlsx()
    const d = deps({ jsZip: () => null, xlsx: x.ns })
    await azpRunExport(
      'azpetrol',
      { ...INPUT, movs: MOVS.map((r) => ({ ...r, cancelled: false })) },
      d,
    )
    const ws = x.appended[0].ws as Record<string, { v?: unknown }>
    expect(Object.entries(ws).filter(([k]) => k[0] !== '!').map(([, c]) => c.v))
      .toContain(999)
  })

  /* Neither mechanism available: the ORIGINAL error surfaces and nothing
     claims success. This is the branch that keeps a silent failure from
     looking like a completed export. */
  it('surfaces the original error when SheetJS is also unavailable', async () => {
    const d = deps({ jsZip: () => null, xlsx: null })
    const out = await azpRunExport('azpetrol', INPUT, d)
    expect(out).toMatchObject({ ok: false, path: 'failed', isError: true, fileName: null })
    expect(out.message).toBe('JSZip kitabxanası yüklənmədi')
    /* It must NOT wear the fallback prefix: no fallback happened. */
    expect(out.message).not.toContain('Şablonsuz ixrac')
    expect(d.downloads).toHaveLength(0)
  })

  it('never reports the success toast on any failing path', async () => {
    const x = fakeXlsx()
    for (const over of [
      { jsZip: () => null, xlsx: x.ns },
      { jsZip: () => null, xlsx: null },
    ] as Partial<AzpExportDeps>[]) {
      const out = await azpRunExport('azpetrol', INPUT, deps(over))
      expect(out.message).not.toContain('hesabatı yükləndi')
    }
  })
})

/* ------------------------------------------------------------ module guard */

describe('the module argument is validated before anything runs', () => {
  it('throws the exact legacy message for an unknown module', async () => {
    await expect(azpRunExport('x' as never, INPUT, deps()))
      .rejects.toThrow('AZP: yanlış modul: x')
  })
})
