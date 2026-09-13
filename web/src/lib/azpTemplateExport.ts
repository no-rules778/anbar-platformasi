/* Azpetrol / Araz — the TEMPLATE workbook export (M17-95 … M17-99).

   Ported from index.html:9458-9478 (the template dictionary), 9694-9713
   (the XML patch and the cross-module sheet removal) and 9719-9755
   (`azpExport`, including the plain-SheetJS fallback).

   ═══ SYNTHETIC FIXTURES ONLY. NO REAL DATA WAS EXPORTED. ═══

   D-T5 authorises implementation and synthetic testing only. Nothing here was
   run against TEST or production data, and M17-100 — the egress contract,
   which is about WHAT LEAVES the system rather than how the file is built —
   remains BLOCKED. Every test fixture is a hand-written XML string.

   WHY THE EXPORT PATCHES A TEMPLATE AT ALL. The workbook carries a hand-made
   design: column widths, merged card blocks, number formats and a style table
   that no SheetJS write can reproduce. So the real template is opened as a zip
   and only its DATA is replaced, leaving the design bytes untouched. That is
   what makes the patch surface below a correctness boundary rather than an
   implementation detail: widening it would start overwriting the design the
   whole approach exists to preserve. */

import { AZP_LABEL, azpMod, type AzpModule } from './azpLabels'

/** The template the export fetches (index.html:9458). */
export const AZP_TPL_URL = './azpetrol-template.xlsx'

/** Per-module sheet identity — index.html:9462-9478. */
export interface AzpTemplateParts {
  /** The worksheet part THIS module writes. */
  part: string
  /** The OTHER module's worksheet part, removed entirely. */
  other: string
  /**
   * The other sheet's name as `workbook.xml` spells it.
   *
   * M17-97 — Araz's counterpart is `'AZP kartların hesabatı '` WITH A
   * TRAILING SPACE. That is not a typo to tidy: the name is matched verbatim
   * against the real workbook's `<sheet name="…">`, so trimming it would make
   * the removal silently fail and leak the other module's sheet into the file.
   */
  otherName: string
}

export const AZP_TPL: Record<AzpModule, AzpTemplateParts> = {
  azpetrol: {
    part: 'xl/worksheets/sheet1.xml',
    other: 'xl/worksheets/sheet2.xml',
    otherName: 'ARAZ',
  },
  araz: {
    part: 'xl/worksheets/sheet2.xml',
    other: 'xl/worksheets/sheet1.xml',
    otherName: 'AZP kartların hesabatı ',
  },
}

/** The sheet name each module writes — index.html:9225. */
export const AZP_SHEET_NAME: Record<AzpModule, string> = {
  azpetrol: 'AZP kartların hesabatı',
  araz: 'ARAZ',
}

/** The download stem each module uses — index.html:9226. */
export const AZP_FILE_NAME: Record<AzpModule, string> = {
  azpetrol: 'Azpetrol_kart_hesabati',
  araz: 'Araz_kart_hesabati',
}

/**
 * The FOUR — and only four — parts of the worksheet XML the export rewrites
 * (M17-95), index.html:9694-9702.
 *
 * `styles.xml` and `theme1.xml` are NOT in this list and are never touched:
 * the whole point of patching a template is that the design survives. Widening
 * this set would start overwriting the very bytes the approach preserves.
 */
export const AZP_PATCHED_PARTS = ['dimension', 'cols', 'sheetData', 'mergeCells'] as const

/** The parts that must remain byte-identical after a patch. */
export const AZP_UNTOUCHED_PARTS = ['xl/styles.xml', 'xl/theme/theme1.xml'] as const

export interface AzpSheetPatch {
  /** `A1:<lastCol><lastRow>` */
  dimension: string
  /** A complete `<cols>…</cols>` element. */
  cols: string
  /** A complete `<sheetData>…</sheetData>` element. */
  sheetData: string
  /** A complete `<mergeCells …>…</mergeCells>` element. */
  mergeCells: string
}

/**
 * `azpPatchSheetXml(tplXml, patch)` — index.html:9694-9702 (M17-95).
 *
 * Replaces exactly four elements in the template worksheet and returns the
 * rest verbatim. `<mergeCells>` is the one special case: when the template
 * has none, the element is INSERTED after `</sheetData>` rather than
 * replaced, because a worksheet with no merges carries no element to swap.
 */
export function azpPatchSheetXml(tplXml: string, patch: AzpSheetPatch): string {
  let x = tplXml
  x = x.replace(/<dimension ref="[^"]*"\/>/, '<dimension ref="' + patch.dimension + '"/>')
  x = x.replace(/<cols>[\s\S]*?<\/cols>/, patch.cols)
  x = x.replace(/<sheetData>[\s\S]*?<\/sheetData>/, patch.sheetData)
  x = /<mergeCells[\s\S]*?<\/mergeCells>/.test(x)
    ? x.replace(/<mergeCells[\s\S]*?<\/mergeCells>/, patch.mergeCells)
    : x.replace('</sheetData>', '</sheetData>' + patch.mergeCells)
  return x
}

/** The three package parts a sheet removal must edit, plus the worksheet. */
export interface AzpZipParts {
  workbook: string
  rels: string
  contentTypes: string
}

export interface AzpDropResult extends AzpZipParts {
  /** Parts to delete from the archive — the sheet and its own rels file. */
  removed: string[]
}

/** Escapes a literal for use inside a RegExp — index.html:9708. */
function reEscape(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * `azpDropSheet(zip, part, sheetName)` — index.html:9704-9713 (M17-96).
 *
 * ═══ MODULE SEPARATION. This is the cross-module leak boundary. ═══
 *
 * Every export carries EXACTLY ONE module. The template ships both sheets, so
 * the other one is removed from all THREE places that reference it — miss any
 * and the other module's data ships inside the file:
 *
 *   1. `xl/workbook.xml`            — the `<sheet>` entry (by name AND r:id)
 *   2. `xl/_rels/workbook.xml.rels` — the relationship
 *   3. `[Content_Types].xml`        — the part override
 *
 * plus the worksheet part itself and its own `_rels` file.
 *
 * Returning the edited strings rather than mutating a zip keeps this pure and
 * testable without a real archive.
 */
export function azpDropSheet(
  parts: AzpZipParts, part: string, sheetName: string,
): AzpDropResult {
  const base = part.split('/').pop() as string
  let rels = parts.rels
  const rid = (new RegExp('Id="(rId\\d+)"[^>]*Target="worksheets/' + reEscape(base) + '"').exec(rels)
    || new RegExp('Target="worksheets/' + reEscape(base) + '"[^>]*Id="(rId\\d+)"').exec(rels)
    || [])[1]

  let wb = parts.workbook
  wb = wb.replace(new RegExp('<sheet[^>]*name="' + reEscape(sheetName) + '"[^>]*/>'), '')
  if (rid) {
    wb = wb.replace(new RegExp('<sheet[^>]*r:id="' + rid + '"[^>]*/>'), '')
    rels = rels.replace(new RegExp('<Relationship[^>]*Id="' + rid + '"[^>]*/>'), '')
  }
  const ct = parts.contentTypes.replace(
    new RegExp('<Override[^>]*PartName="/' + part.replace(/\//g, '\\/') + '"[^>]*/>'), '',
  )

  return {
    workbook: wb, rels, contentTypes: ct,
    /* `calcChain.xml` goes too: the template's stale chain refers to cells
       this export rewrote, and Excel rebuilds it. */
    removed: [part, 'xl/worksheets/_rels/' + base + '.rels', 'xl/calcChain.xml'],
  }
}

/**
 * M17-98 — the export applies NO FILTER.
 *
 * This is a real contract, not an omission. The screen's filters are per
 * board; the export is always the FULL card report, with every non-cancelled
 * movement of the module. A filtered export would print block totals that
 * disagree with each card's own balance, so the file would not reconcile —
 * which is the one property this workbook exists to have.
 *
 * Cancelled rows are excluded, because they are not movements; that is not a
 * filter, it is the definition of the balance.
 */
export function azpExportRows<T extends { cancelled?: boolean | null }>(
  movs: readonly T[],
): T[] {
  return movs.filter((r) => !r.cancelled)
}

/** True when the module has nothing to export — index.html:9723. */
export const AZP_EXPORT_NOT_READY = 'Məlumat yüklənməyib'

/** The no-cards refusal, per module — index.html:9724. */
export function azpExportNoCards(m: AzpModule): string {
  return AZP_LABEL[m].title + ' üçün kart yoxdur'
}

/**
 * M17-99 — the template fallback.
 *
 * When anything in the template path fails — JSZip missing, the template not
 * fetched, the worksheet part absent — the export does NOT silently fail and
 * does NOT silently produce a different file. It writes a PLAIN SheetJS sheet
 * with the same data and tells the user, in so many words, that the design
 * was not applied. Losing the design is acceptable; losing the data, or
 * shipping an undesigned file that looks like the designed one, is not.
 */
export const AZP_FALLBACK_PREFIX = 'Şablonsuz ixrac (dizayn tətbiq olunmadı): '

export function azpFallbackMessage(err: unknown): string {
  const m = err && typeof err === 'object' && 'message' in err
    ? String((err as { message?: unknown }).message ?? '')
    : typeof err === 'string' ? err : ''
  return AZP_FALLBACK_PREFIX + m
}

/** The success toast — index.html:9741. */
export function azpExportDoneMessage(m: AzpModule, cardCount: string): string {
  return AZP_LABEL[m].title + ' hesabatı yükləndi — ' + cardCount + ' kart'
}

/** The download name, `<stem>_<today>.xlsx` — index.html:9737. */
export function azpExportFileName(m: AzpModule, today: string): string {
  azpMod(m)
  return AZP_FILE_NAME[m] + '_' + today + '.xlsx'
}

/**
 * The fallback sheet name. SheetJS refuses a name over 31 characters, and
 * legacy slices to 28 (index.html:9751) — kept verbatim so the fallback file
 * names its sheet exactly as legacy does.
 */
export function azpFallbackSheetName(m: AzpModule): string {
  return AZP_SHEET_NAME[m].slice(0, 28)
}
