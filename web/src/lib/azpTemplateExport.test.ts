import { describe, expect, it } from 'vitest'
import {
  AZP_FALLBACK_PREFIX, AZP_FILE_NAME, AZP_PATCHED_PARTS, AZP_SHEET_NAME,
  AZP_TPL, AZP_UNTOUCHED_PARTS, azpDropSheet, azpExportFileName, azpExportNoCards,
  azpExportRows, azpFallbackMessage, azpFallbackSheetName, azpPatchSheetXml,
} from './azpTemplateExport'

/* T5 — M17-95, M17-96, M17-97, M17-98, M17-99.

   ═══ SYNTHETIC FIXTURES ONLY. NO REAL DATA WAS EXPORTED. ═══

   Every XML string below is hand-written in this file. No TEST or production
   workbook was read and no export was run (D-T5). M17-100 — the EGRESS
   contract, about what actually leaves the system — stays BLOCKED: it is not
   a property of these functions and nothing here can satisfy it. */

/** A minimal worksheet in the template's shape, with a design marker. */
function tplSheet(opts: { merges?: boolean } = {}): string {
  return '<?xml version="1.0"?><worksheet xmlns="x">'
    + '<dimension ref="A1:Z99"/>'
    + '<sheetViews><sheetView workbookViewId="0"/></sheetViews>'
    + '<cols><col min="1" max="1" width="3.88" style="2"/></cols>'
    + '<sheetData><row r="1"><c r="A1" s="38"/></row></sheetData>'
    + (opts.merges ? '<mergeCells count="1"><mergeCell ref="A1:B1"/></mergeCells>' : '')
    + '<pageMargins left="0.7"/></worksheet>'
}

const PATCH = {
  dimension: 'A1:D5',
  cols: '<cols><col min="1" max="1" width="9" style="7"/></cols>',
  sheetData: '<sheetData><row r="1"><c r="A1" t="inlineStr"><is><t>X</t></is></c></row></sheetData>',
  mergeCells: '<mergeCells count="2"><mergeCell ref="C1:C5"/><mergeCell ref="D1:D2"/></mergeCells>',
}

describe('azpPatchSheetXml — the patch surface (M17-95)', () => {
  it('replaces exactly the four data elements', () => {
    const out = azpPatchSheetXml(tplSheet({ merges: true }), PATCH)
    expect(out).toContain('<dimension ref="A1:D5"/>')
    expect(out).toContain(PATCH.cols)
    expect(out).toContain(PATCH.sheetData)
    expect(out).toContain(PATCH.mergeCells)
    /* And the old values are gone, so this is a replace, not an append. */
    expect(out).not.toContain('A1:Z99')
    expect(out).not.toContain('width="3.88"')
    expect(out).not.toContain('s="38"')
    expect(out).not.toContain('ref="A1:B1"')
  })

  /* THE row. Everything outside those four elements survives byte for byte —
     that is what keeps the template's design intact. */
  it('leaves every other element untouched', () => {
    const out = azpPatchSheetXml(tplSheet({ merges: true }), PATCH)
    expect(out).toContain('<sheetViews><sheetView workbookViewId="0"/></sheetViews>')
    expect(out).toContain('<pageMargins left="0.7"/>')
    expect(out.startsWith('<?xml version="1.0"?><worksheet xmlns="x">')).toBe(true)
    expect(out.endsWith('</worksheet>')).toBe(true)
  })

  /* styles.xml and theme1.xml are not even inputs to this function, so they
     cannot be edited by it. Asserted at the contract level. */
  it('names styles.xml and theme1.xml as untouched, and never patches them', () => {
    expect(AZP_PATCHED_PARTS).toEqual(['dimension', 'cols', 'sheetData', 'mergeCells'])
    expect(AZP_UNTOUCHED_PARTS).toEqual(['xl/styles.xml', 'xl/theme/theme1.xml'])
    for (const p of AZP_UNTOUCHED_PARTS) {
      expect(AZP_PATCHED_PARTS as readonly string[]).not.toContain(p)
    }
  })

  /* A template with NO merges has no element to swap, so the new one is
     inserted after </sheetData> instead. Without this branch the merges
     would vanish and every card block would lose its header spans. */
  it('inserts mergeCells when the template has none', () => {
    const out = azpPatchSheetXml(tplSheet({ merges: false }), PATCH)
    expect(out).toContain('</sheetData><mergeCells count="2">')
    expect(out).toContain('<mergeCell ref="C1:C5"/>')
  })

  it('does not duplicate mergeCells when the template already has one', () => {
    const out = azpPatchSheetXml(tplSheet({ merges: true }), PATCH)
    expect(out.match(/<mergeCells/g)).toHaveLength(1)
  })

  /* A non-greedy sheetData replace must not swallow the rest of the sheet. */
  it('does not swallow trailing elements when sheetData is replaced', () => {
    const out = azpPatchSheetXml(tplSheet({ merges: true }), PATCH)
    expect(out).toContain('<pageMargins')
  })
})

/* --- M17-96: the cross-module leak boundary --- */

const WORKBOOK = '<workbook><sheets>'
  + '<sheet name="AZP kartların hesabatı " sheetId="1" r:id="rId1"/>'
  + '<sheet name="ARAZ" sheetId="2" r:id="rId2"/>'
  + '</sheets></workbook>'

const RELS = '<Relationships>'
  + '<Relationship Id="rId1" Type="t" Target="worksheets/sheet1.xml"/>'
  + '<Relationship Id="rId2" Type="t" Target="worksheets/sheet2.xml"/>'
  + '</Relationships>'

const CT = '<Types>'
  + '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="ws"/>'
  + '<Override PartName="/xl/worksheets/sheet2.xml" ContentType="ws"/>'
  + '<Override PartName="/xl/styles.xml" ContentType="st"/>'
  + '</Types>'

const PARTS = { workbook: WORKBOOK, rels: RELS, contentTypes: CT }

describe('azpDropSheet — module separation (M17-96)', () => {
  /* An Azpetrol export removes ARAZ from all three places at once. */
  it('removes the other sheet from workbook, rels and [Content_Types]', () => {
    const r = azpDropSheet(PARTS, AZP_TPL.azpetrol.other, AZP_TPL.azpetrol.otherName)
    expect(r.workbook).not.toContain('ARAZ')
    expect(r.workbook).not.toContain('rId2')
    expect(r.rels).not.toContain('rId2')
    expect(r.rels).not.toContain('sheet2.xml')
    expect(r.contentTypes).not.toContain('worksheets/sheet2.xml')
  })

  /* The negative half: the module's OWN sheet survives all three edits. */
  it('keeps this module’s own sheet everywhere', () => {
    const r = azpDropSheet(PARTS, AZP_TPL.azpetrol.other, AZP_TPL.azpetrol.otherName)
    expect(r.workbook).toContain('AZP kartların hesabatı ')
    expect(r.workbook).toContain('rId1')
    expect(r.rels).toContain('worksheets/sheet1.xml')
    expect(r.contentTypes).toContain('/xl/worksheets/sheet1.xml')
    /* And an unrelated override is not collateral damage. */
    expect(r.contentTypes).toContain('/xl/styles.xml')
  })

  it('removes the worksheet part, its rels and the stale calcChain', () => {
    const r = azpDropSheet(PARTS, AZP_TPL.azpetrol.other, AZP_TPL.azpetrol.otherName)
    expect(r.removed).toEqual([
      'xl/worksheets/sheet2.xml',
      'xl/worksheets/_rels/sheet2.xml.rels',
      'xl/calcChain.xml',
    ])
  })

  /* M17-97 — the trailing space is LOAD-BEARING. An Araz export removes the
     Azpetrol sheet by a name that ends in a space; trimming it makes the
     `<sheet name="…">` match fail and the other module's sheet SHIPS. */
  it('removes the Azpetrol sheet from an Araz export using the exact name', () => {
    expect(AZP_TPL.araz.otherName).toBe('AZP kartların hesabatı ')
    const r = azpDropSheet(PARTS, AZP_TPL.araz.other, AZP_TPL.araz.otherName)
    expect(r.workbook).not.toContain('AZP kartların hesabatı')
    expect(r.workbook).toContain('ARAZ')
    expect(r.rels).not.toContain('rId1')
    expect(r.contentTypes).not.toContain('worksheets/sheet1.xml')
  })

  /* MEASURED, NOT ASSUMED. The first draft of this control asserted that a
     TRIMMED name leaves the sheet entry behind. It does not, and the test
     failed: removal has TWO independent paths, and the r:id path still
     catches the sheet when the name match misses. The real boundary is
     therefore narrower than "trimming leaks", and is stated as two facts.

     Fact 1 — the NAME path alone genuinely depends on the trailing space.
     With no resolvable r:id, a trimmed name leaves the entry in workbook.xml,
     which is exactly the leak M17-97 guards against. */
  it('leaks the sheet entry when the name is trimmed AND no r:id resolves', () => {
    const noRel = { ...PARTS, rels: '<Relationships></Relationships>' }
    const trimmed = azpDropSheet(noRel, AZP_TPL.araz.other, AZP_TPL.araz.otherName.trim())
    expect(trimmed.workbook).toContain('AZP kartların hesabatı ')

    /* The exact name, same conditions, removes it — so the assertion is not
       vacuous and the trailing space is what makes the difference. */
    const exact = azpDropSheet(noRel, AZP_TPL.araz.other, AZP_TPL.araz.otherName)
    expect(exact.workbook).not.toContain('AZP kartların hesabatı')
  })

  /* Fact 2 — with a resolvable r:id the second path is a genuine safety net:
     a trimmed name still ends with the sheet removed. Recorded so nobody
     later "proves" the trailing space matters by a test that would pass
     either way. */
  it('still removes the sheet via r:id when the name is trimmed', () => {
    const r = azpDropSheet(PARTS, AZP_TPL.araz.other, AZP_TPL.araz.otherName.trim())
    expect(r.workbook).not.toContain('AZP kartların hesabatı')
    expect(r.workbook).toContain('ARAZ')
  })

  /* The r:id removal is a second, independent path: even if a name changed,
     the relationship id still identifies the sheet. */
  it('removes by r:id as well as by name', () => {
    const noName = { ...PARTS, workbook: WORKBOOK.replace('name="ARAZ"', 'name="Başqa"') }
    const r = azpDropSheet(noName, 'xl/worksheets/sheet2.xml', 'ARAZ')
    expect(r.workbook).not.toContain('rId2')
    expect(r.rels).not.toContain('rId2')
  })

  it('handles a rels file whose Target precedes its Id', () => {
    const swapped = {
      ...PARTS,
      rels: '<Relationships><Relationship Target="worksheets/sheet2.xml" Id="rId2" Type="t"/></Relationships>',
    }
    const r = azpDropSheet(swapped, 'xl/worksheets/sheet2.xml', 'ARAZ')
    expect(r.rels).not.toContain('rId2')
  })

  it('pairs each module with the other module’s part', () => {
    expect(AZP_TPL.azpetrol.part).toBe('xl/worksheets/sheet1.xml')
    expect(AZP_TPL.azpetrol.other).toBe('xl/worksheets/sheet2.xml')
    expect(AZP_TPL.araz.part).toBe('xl/worksheets/sheet2.xml')
    expect(AZP_TPL.araz.other).toBe('xl/worksheets/sheet1.xml')
    /* Never its own — that would delete the sheet being written. */
    expect(AZP_TPL.azpetrol.part).not.toBe(AZP_TPL.azpetrol.other)
    expect(AZP_TPL.araz.part).not.toBe(AZP_TPL.araz.other)
  })
})

describe('azpExportRows — no filter is applied (M17-98)', () => {
  const movs = [
    { id: 1, cancelled: false }, { id: 2, cancelled: true },
    { id: 3, cancelled: null }, { id: 4, cancelled: false },
  ]

  /* Cancelled rows are excluded because they are not movements — that is the
     definition of the balance, not a filter. */
  it('keeps every non-cancelled row and drops cancelled ones', () => {
    expect(azpExportRows(movs).map((r) => r.id)).toEqual([1, 3, 4])
  })

  /* THE row: the screen's date/card/kind/text filters have NO effect here.
     A filtered export would print block totals that disagree with each card's
     own balance, so the workbook would not reconcile. */
  it('takes no filter argument at all, so no screen filter can reach it', () => {
    expect(azpExportRows).toHaveLength(1)
    const all = azpExportRows(movs)
    expect(all).toHaveLength(3)
  })

  it('returns an empty list rather than throwing when everything is cancelled', () => {
    expect(azpExportRows([{ id: 1, cancelled: true }])).toEqual([])
  })
})

describe('export refusals and fallback (M17-99)', () => {
  it('names the module in the no-cards refusal', () => {
    expect(azpExportNoCards('azpetrol')).toBe('Azpetrol üçün kart yoxdur')
    expect(azpExportNoCards('araz')).toBe('Araz üçün kart yoxdur')
  })

  /* The fallback must SAY the design was not applied — an undesigned file
     that looks like the designed one is the failure this prevents. */
  it('states explicitly that the design was not applied', () => {
    expect(azpFallbackMessage(new Error('Şablon tapılmadı')))
      .toBe('Şablonsuz ixrac (dizayn tətbiq olunmadı): Şablon tapılmadı')
    expect(AZP_FALLBACK_PREFIX).toContain('dizayn tətbiq olunmadı')
  })

  it('still names the fallback when the error carries no message', () => {
    expect(azpFallbackMessage(null)).toBe(AZP_FALLBACK_PREFIX)
    expect(azpFallbackMessage('boom')).toBe(AZP_FALLBACK_PREFIX + 'boom')
  })

  it('builds the download name per module', () => {
    expect(azpExportFileName('azpetrol', '2026-09-12')).toBe('Azpetrol_kart_hesabati_2026-09-12.xlsx')
    expect(azpExportFileName('araz', '2026-09-12')).toBe('Araz_kart_hesabati_2026-09-12.xlsx')
    expect(AZP_FILE_NAME.azpetrol).not.toBe(AZP_FILE_NAME.araz)
  })

  it('refuses an unknown module for the file name', () => {
    expect(() => azpExportFileName('x' as never, '2026-09-12')).toThrow('AZP: yanlış modul: x')
  })

  /* SheetJS refuses a sheet name over 31 chars; legacy slices to 28. */
  it('slices the fallback sheet name to 28 characters', () => {
    expect(azpFallbackSheetName('azpetrol')).toBe(AZP_SHEET_NAME.azpetrol.slice(0, 28))
    expect(azpFallbackSheetName('azpetrol').length).toBeLessThanOrEqual(28)
    expect(azpFallbackSheetName('araz')).toBe('ARAZ')
  })
})
