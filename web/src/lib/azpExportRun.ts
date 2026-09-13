import * as XLSXns from 'xlsx'
import JSZip from 'jszip'
import { nf, today } from './format'
import { azpMod, type AzpModule } from './azpLabels'
import {
  AZP_TPL, AZP_TPL_URL, azpDropSheet, azpExportDoneMessage, azpExportFileName,
  azpExportNoCards, azpExportRows, azpFallbackMessage, azpFallbackSheetName,
  azpPatchSheetXml, AZP_EXPORT_NOT_READY,
} from './azpTemplateExport'
import {
  azpBuildSheetModel, azpFallbackWorksheet, azpSheetPatch,
  type AzpExportInput,
} from './azpSheetBuild'

/* Azpetrol / Araz — the TEMPLATE EXPORT ORCHESTRATION (M17-95, M17-96,
   M17-98, M17-99).

   Ported from `azpExport(m)` — index.html:9715-9756.

   ═══ SYNTHETIC FIXTURES ONLY. NO REAL DATA WAS EXPORTED. ═══

   M17-100 — the EGRESS row, about what actually leaves the system — is a
   different question from whether this orchestration is correct, and it stays
   BLOCKED. Running this function against synthetic rows proves the control
   flow; it does not authorise, and is not evidence about, a real export.

   WHY THE BOUNDARIES ARE INJECTED. `fetch`, JSZip, SheetJS's `writeFile` and
   the anchor download are the four places this function leaves the program.
   Passing them in means a test drives the REAL control flow — the same
   branches, the same order, the same catch — and asserts what was written,
   rather than re-asserting what a helper returns. Every default is the real
   thing, so production behaviour is unchanged by their existence.

   DELIVERY NOTE. Legacy obtains JSZip from a CDN script. The React build uses
   the package dependency instead, so the designed path is available without
   relying on an undeclared global. The fallback remains required for fetch,
   template, ZIP or browser failures. */

/** The minimal JSZip surface this orchestration uses. */
export interface AzpZipFile {
  async(kind: 'text'): Promise<string>
}

export interface AzpZip {
  file(path: string): AzpZipFile | null
  file(path: string, data: string): unknown
  remove(path: string): unknown
  generateAsync(opts: Record<string, unknown>): Promise<Blob>
}

export interface AzpJsZip {
  loadAsync(data: ArrayBuffer): Promise<AzpZip>
}

/** The three package parts a sheet removal edits, by path. */
const WB_PATH = 'xl/workbook.xml'
const REL_PATH = 'xl/_rels/workbook.xml.rels'
const CT_PATH = '[Content_Types].xml'

/** The MIME type legacy asks JSZip to stamp on the blob (index.html:9735). */
export const AZP_XLSX_MIME =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

export interface AzpExportDeps {
  /** Defaults to the real `fetch`. */
  fetch?: typeof globalThis.fetch
  /** Resolves JSZip, or returns null when it is unavailable. */
  jsZip?: () => AzpJsZip | null
  /** The SheetJS namespace, or null to prove the both-unavailable branch. */
  xlsx?: Pick<typeof XLSXns, 'utils' | 'writeFile'> | null
  /** Triggers the browser download of a generated blob. */
  download?: (blob: Blob, fileName: string) => void
  /** The export date, so a test need not depend on the clock. */
  day?: string
}

/** What the caller — the page's button — reports to the user. */
export interface AzpExportOutcome {
  ok: boolean
  /** 'template' | 'fallback' | 'refused' | 'failed' */
  path: 'template' | 'fallback' | 'refused' | 'failed'
  fileName: string | null
  message: string
  isError: boolean
}

/**
 * The production JSZip resolver. Kept behind a dependency seam so tests can
 * drive corrupt/missing-template branches without touching the real package.
 */
function defaultJsZip(): AzpJsZip | null {
  return JSZip as unknown as AzpJsZip
}

/**
 * The default download: an anchor click, then a deferred revoke.
 *
 * The 4-second delay is legacy's (index.html:9739). Revoking immediately can
 * race the browser's own read of the object URL, and the download then fails
 * silently — the worst outcome, because the user believes it succeeded.
 */
function defaultDownload(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  document.body.appendChild(a)
  a.click()
  setTimeout(() => { URL.revokeObjectURL(url); a.remove() }, 4000)
}

/**
 * `azpExport(m)` — index.html:9715-9756.
 *
 * ═══ THE FULL, UNFILTERED, NON-CANCELLED MODULE SET (M17-98). ═══
 *
 * `input` is the module's whole snapshot. No screen filter is consulted and
 * none may be: the workbook's block totals must reconcile with each card's
 * own balance, and a filtered export would print figures that do not.
 * Cancelled movements are dropped by `azpExportRows` — that is the definition
 * of the balance, not a filter.
 *
 * ═══ ONE MODULE PER FILE (M17-96). ═══
 *
 * The template ships BOTH worksheets. The other one is removed from the
 * workbook, its rels and the content types, and its parts are deleted, so an
 * Azpetrol file can never carry Araz data.
 *
 * ═══ THE FALLBACK IS A REAL PATH (M17-99). ═══
 *
 * Any failure in the template path — JSZip absent, template not fetched, the
 * worksheet part missing, a ZIP error — lands in the catch, which WRITES the
 * same data through SheetJS and says the design was not applied. Only when
 * SheetJS is also unavailable does the export report the ORIGINAL error; it
 * never reports success it did not achieve.
 */
export async function azpRunExport(
  m: AzpModule,
  input: AzpExportInput & { ready?: boolean },
  deps: AzpExportDeps = {},
): Promise<AzpExportOutcome> {
  azpMod(m)

  /* The two refusals, in the legacy order (index.html:9723-9724). */
  if (input.ready === false) {
    return {
      ok: false, path: 'refused', fileName: null,
      message: AZP_EXPORT_NOT_READY, isError: true,
    }
  }
  if (!input.cards.length) {
    return {
      ok: false, path: 'refused', fileName: null,
      message: azpExportNoCards(m), isError: true,
    }
  }

  const day = deps.day ?? today()
  const fileName = azpExportFileName(m, day)
  /* M17-98 — the full set, cancelled rows excluded, screen filters ignored.
     Computed ONCE and given to BOTH paths, so a fallback cannot ship a
     different dataset than the template path would have. */
  const model = azpBuildSheetModel(m, {
    cards: input.cards,
    movs: azpExportRows(input.movs),
    appBalance: input.appBalance,
  })

  try {
    const JSZip = (deps.jsZip ?? defaultJsZip)()
    if (!JSZip) throw new Error('JSZip kitabxanası yüklənmədi')

    const doFetch = deps.fetch ?? globalThis.fetch
    if (!doFetch) throw new Error('Şablon tapılmadı (azpetrol-template.xlsx)')
    const resp = await doFetch(AZP_TPL_URL)
    if (!resp.ok) throw new Error('Şablon tapılmadı (azpetrol-template.xlsx)')

    const zip = await JSZip.loadAsync(await resp.arrayBuffer())
    const T = AZP_TPL[m]

    const tpl = zip.file(T.part) as AzpZipFile | null
    if (!tpl) throw new Error('Şablonda ' + T.part + ' vərəqi yoxdur')

    /* M17-95 — exactly four elements are rewritten. `styles.xml` and
       `theme1.xml` are never read and never written here; the design is the
       reason the template is patched instead of regenerated. */
    zip.file(T.part, azpPatchSheetXml(await tpl.async('text'), azpSheetPatch(model)))

    /* M17-96 — the other module's sheet, from all three references. */
    const wbFile = zip.file(WB_PATH) as AzpZipFile | null
    const relFile = zip.file(REL_PATH) as AzpZipFile | null
    const ctFile = zip.file(CT_PATH) as AzpZipFile | null
    if (!wbFile || !relFile || !ctFile) throw new Error('Şablonun paket faylları natamamdır')

    const dropped = azpDropSheet(
      {
        workbook: await wbFile.async('text'),
        rels: await relFile.async('text'),
        contentTypes: await ctFile.async('text'),
      },
      T.other,
      T.otherName,
    )
    zip.file(WB_PATH, dropped.workbook)
    zip.file(REL_PATH, dropped.rels)
    zip.file(CT_PATH, dropped.contentTypes)
    /* The worksheet part, its own rels and the stale `xl/calcChain.xml`,
       which names cells this export rewrote — Excel rebuilds it. */
    dropped.removed.forEach((p) => zip.remove(p))

    const blob = await zip.generateAsync({
      type: 'blob', compression: 'DEFLATE', mimeType: AZP_XLSX_MIME,
    });
    (deps.download ?? defaultDownload)(blob, fileName)

    return {
      ok: true, path: 'template', fileName,
      message: azpExportDoneMessage(m, nf(input.cards.length)), isError: false,
    }
  } catch (e) {
    /* M17-99 — the template is unavailable, so the DATA must not be. A plain
       SheetJS sheet carries the same model, and the user is told, in so many
       words, that the design was not applied. */
    const XLSX = deps.xlsx === undefined ? XLSXns : deps.xlsx
    if (!XLSX) {
      const msg = e && typeof e === 'object' && 'message' in e
        ? String((e as { message?: unknown }).message ?? '') : String(e)
      return {
        ok: false, path: 'failed', fileName: null,
        message: msg || 'İxrac alınmadı', isError: true,
      }
    }
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, azpFallbackWorksheet(model), azpFallbackSheetName(m))
    XLSX.writeFile(wb, fileName)
    return {
      ok: true, path: 'fallback', fileName,
      message: azpFallbackMessage(e), isError: true,
    }
  }
}

/** The label used while an export is running — index.html:9726. */
export const AZP_EXPORT_BUSY = 'Hazırlanır…'

/** The export control's resting label. */
export const AZP_EXPORT_LABEL = 'Excel ixracı'
