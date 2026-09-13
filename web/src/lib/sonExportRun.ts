import JSZip from 'jszip'
import { today } from './format'
import {
  SharedStrings, buildFiltrasiya, buildKontragent, buildNomenklatura, buildWarehouse,
  cleanCT, cleanCalcPr, cleanRels, clearTableFilter, discover, missingWarehouseError,
  patchDim, patchTable, type SonItem, type SonMovement, type SonPartner,
} from './sonExport'

/* «⬇ Excel (SON formatı)» — the ORCHESTRATION, ported from `sonExport()`
   and `buildAnbarExport()` (index.html:7843-7928).

   ═══ SYNTHETIC FIXTURES ONLY. NO REAL EXPORT WAS RUN. ═══

   WHY THE BOUNDARIES ARE INJECTED. `fetch`, JSZip and the anchor download are
   the three places this function leaves the program. Passing them in means a
   test drives the REAL control flow — the same branches, the same order, the
   same catch — and asserts what was written into the archive, rather than
   re-asserting what a helper returned. Every default is the real thing, so
   production behaviour is unchanged by their existence.

   DELIVERY NOTE. Legacy takes JSZip from a CDN global; the React build uses
   the declared `jszip` dependency, so the designed path needs no global. */

/** The template URL, served from `web/public/` (index.html:7914). */
export const SON_TPL_URL = './export-template.xlsx'

export const SON_XLSX_MIME =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

/** The busy label — index.html:7903. Three ASCII dots, exactly as legacy. */
export const SON_EXPORT_BUSY = 'Hazırlanır...'

/** The resting label — index.html:280. */
export const SON_EXPORT_LABEL = '⬇ Excel (SON formatı)'

/** The «Tam ixrac» resting label — index.html:279. */
export const FULL_EXPORT_LABEL = '⬇ Tam ixrac'

/** Legacy button titles — index.html:279-280. */
export const FULL_EXPORT_TITLE = 'Bütün məlumatları Excel-ə ixrac et'
export const SON_EXPORT_TITLE =
  'Excel-i orijinal SON formatında ixrac et (Filtrasiya, anbarlar, pivotlar)'

/** The template-missing refusal — index.html:7915. */
export const SON_TPL_MISSING =
  'Şablon tapılmadı (export-template.xlsx). Fayl saytda deploy olunmayıb.'

/** The JSZip-missing refusal — index.html:7901. */
export const SON_NO_JSZIP = 'JSZip kitabxanası yüklənmədi'

/** The generic failure — index.html:7925. */
export const SON_FAILED = 'İxrac alınmadı'

export interface SonZipFile { async(kind: 'text'): Promise<string> }
export interface SonZip {
  file(path: string): SonZipFile | null
  file(path: string, data: string): unknown
  remove(path: string): unknown
  generateAsync(opts: Record<string, unknown>): Promise<Blob>
  files: Record<string, unknown>
}
export interface SonJsZip { loadAsync(data: ArrayBuffer): Promise<SonZip> }

export interface SonExportInput {
  items: readonly SonItem[]
  movements: readonly SonMovement[]
  partners: readonly SonPartner[]
}

export interface SonExportDeps {
  fetch?: typeof globalThis.fetch
  jsZip?: () => SonJsZip | null
  download?: (blob: Blob, fileName: string) => void
  day?: string
}

export interface SonExportReport {
  filt: number
  nom: number
  knt: number
  warehouses: { name: string; n: number }[]
}

export interface SonExportOutcome {
  ok: boolean
  fileName: string | null
  message: string
  isError: boolean
  report: SonExportReport | null
}

function defaultJsZip(): SonJsZip | null {
  return JSZip as unknown as SonJsZip
}

/** The anchor download with legacy's 4-second deferred revoke (7921). */
function defaultDownload(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  document.body.appendChild(a)
  a.click()
  setTimeout(() => { URL.revokeObjectURL(url); a.remove() }, 4000)
}

async function text(zip: SonZip, path: string): Promise<string> {
  const f = zip.file(path)
  if (!f) throw new Error('Şablonda ' + path + ' yoxdur')
  return f.async('text')
}

/**
 * `buildAnbarExport` — index.html:7843-7898.
 *
 * Patches the archive IN PLACE and returns the row counts. The order matters
 * and is legacy's: read the structural parts, resolve the shared strings,
 * REFUSE on an unknown warehouse, then write each sheet and its table, then
 * the package-level cleanups.
 */
export async function buildAnbarExport(
  zip: SonZip, db: SonExportInput,
): Promise<SonExportReport> {
  const files = new Map<string, string>()
  for (const n of ['xl/workbook.xml', 'xl/_rels/workbook.xml.rels']) {
    files.set(n, await text(zip, n))
  }
  for (const path of Object.keys(zip.files)) {
    if (/^xl\/worksheets\/_rels\//.test(path) || /^xl\/tables\/table\d+\.xml$/.test(path)) {
      files.set(path, await text(zip, path))
    }
  }

  const struct = discover(files)
  const itemBy = new Map(db.items.map((it) => [it.code, it]))
  const SS = new SharedStrings(await text(zip, 'xl/sharedStrings.xml'))

  /* ═══ THE DATA-LOSS GUARD (7855-7861). ═══
     A warehouse present in the data but absent from the template has nowhere
     to write its movements. Legacy REFUSES the whole export rather than
     dropping them silently, and names each missing warehouse with its
     movement count so the user knows the size of what would have been lost. */
  const tplWh = new Set(struct.warehouses.map((w) => w.name))
  const dataWh = new Set(db.movements.map((m) => m.warehouse))
  const missing = [...dataWh].filter((w) => !tplWh.has(w))
  if (missing.length) {
    throw new Error(missingWarehouseError(missing.map(
      (w) => w + ' (' + db.movements.filter((m) => m.warehouse === w).length + ' hərəkət)',
    )))
  }

  const report: SonExportReport = { filt: 0, nom: 0, knt: 0, warehouses: [] }

  const fS = struct.byName['Filtrasiya']
  const nS = struct.byName['Nomenklatura bazası']
  const kS = struct.byName['Kontragent bazası']
  if (!fS || !nS || !kS) throw new Error('Şablonun vərəqləri natamamdır')

  const filt = buildFiltrasiya(await text(zip, fS.sheet), SS, db.movements, itemBy)
  const nom = buildNomenklatura(await text(zip, nS.sheet), SS, db.items)
  const knt = buildKontragent(await text(zip, kS.sheet), SS, db.partners)
  report.filt = filt.n; report.nom = nom.n; report.knt = knt.n

  zip.file(fS.sheet, patchDim(filt.xml, filt.n + 3))
  zip.file(nS.sheet, patchDim(nom.xml, nom.n + 2))
  zip.file(kS.sheet, patchDim(knt.xml, knt.n + 2))
  if (fS.table) zip.file(fS.table.file, patchTable(clearTableFilter(files.get(fS.table.file) as string), filt.n + 3))
  if (nS.table) zip.file(nS.table.file, patchTable(clearTableFilter(files.get(nS.table.file) as string), nom.n + 2))
  if (kS.table) zip.file(kS.table.file, patchTable(clearTableFilter(files.get(kS.table.file) as string), knt.n + 2))

  for (const w of struct.warehouses) {
    const wx = await text(zip, w.sheet)
    const built = buildWarehouse(wx, SS, db.movements, itemBy, w)
    /* `max(last, 4)` — an EMPTY warehouse still keeps a 1-row dimension, so
       the sheet stays structurally valid (7887). */
    const last = Math.max(built.n + 3, 4)
    zip.file(w.sheet, patchDim(built.xml, last))
    if (w.table) zip.file(w.table.file, patchTable(clearTableFilter(files.get(w.table.file) as string), last))
    report.warehouses.push({ name: w.name, n: built.n })
  }

  zip.file('xl/sharedStrings.xml', SS.serialize())
  /* The stale chain names cells this export rewrote; Excel rebuilds it. */
  zip.remove('xl/calcChain.xml')
  zip.file('[Content_Types].xml', cleanCT(await text(zip, '[Content_Types].xml')))
  zip.file('xl/_rels/workbook.xml.rels', cleanRels(await text(zip, 'xl/_rels/workbook.xml.rels')))
  zip.file('xl/workbook.xml', cleanCalcPr(await text(zip, 'xl/workbook.xml')))
  return report
}

/** The success toast — index.html:7922-7923. */
export function sonDoneMessage(r: SonExportReport): string {
  const whSummary = r.warehouses.map((w) => w.name + ' ' + w.n).join(', ')
  return 'Excel (SON formatı) yükləndi — Filtrasiya ' + r.filt
    + ', Nomenklatura ' + r.nom + ' | ' + whSummary
}

/** `'Anbar_' + today() + '.xlsx'` — index.html:7920. Same stem as Tam ixrac. */
export function sonExportFileName(day: string): string {
  return 'Anbar_' + day + '.xlsx'
}

/**
 * `sonExport()` — index.html:7900-7927.
 *
 * Never throws: every failure is reported as an outcome the caller toasts,
 * and NOTHING downloads on a failure — a misleading file is worse than none.
 */
export async function sonRunExport(
  input: SonExportInput, deps: SonExportDeps = {},
): Promise<SonExportOutcome> {
  const day = deps.day ?? today()
  const fileName = sonExportFileName(day)
  try {
    const Zip = (deps.jsZip ?? defaultJsZip)()
    if (!Zip) throw new Error(SON_NO_JSZIP)

    const doFetch = deps.fetch ?? globalThis.fetch
    if (!doFetch) throw new Error(SON_TPL_MISSING)
    const resp = await doFetch(SON_TPL_URL)
    if (!resp.ok) throw new Error(SON_TPL_MISSING)

    const zip = await Zip.loadAsync(await resp.arrayBuffer())
    const report = await buildAnbarExport(zip, input)
    const blob = await zip.generateAsync({
      type: 'blob', compression: 'DEFLATE', mimeType: SON_XLSX_MIME,
    });
    (deps.download ?? defaultDownload)(blob, fileName)

    return { ok: true, fileName, message: sonDoneMessage(report), isError: false, report }
  } catch (e) {
    const msg = e && typeof e === 'object' && 'message' in e
      ? String((e as { message?: unknown }).message ?? '') : String(e)
    return { ok: false, fileName: null, message: msg || SON_FAILED, isError: true, report: null }
  }
}

/** Adapts the dashboard snapshot to the exporter's shape — index.html:7906-7913. */
export function sonInputFromSnapshot(
  items: readonly { code: string; name: string; unit: string | null; price: number | null }[],
  partners: readonly Record<string, unknown>[],
  movements: readonly Record<string, unknown>[],
): SonExportInput {
  return {
    items: items.map((i) => ({ code: i.code, name: i.name, unit: i.unit, price: i.price || 0 })),
    partners: partners.map((p) => ({
      name: String(p.name ?? ''),
      voen: (p.voen ?? null) as string | null,
      contract: (p.contract ?? null) as string | null,
      contract_date: (p.contract_date ?? p.cdate ?? null) as string | null,
    })),
    /* PRICE STRICTLY FROM THE MOVEMENT — no item-card fallback (7911). That
       is deliberate in legacy: opening stock must stay priceless, and an
       item's current price is not what that historical row was worth. */
    movements: movements.map((m) => ({
      date: String(m.date ?? ''),
      warehouse: String(m.warehouse ?? ''),
      item_code: String(m.item_code ?? ''),
      in_qty: Number(m.in_qty ?? 0) || 0,
      out_qty: Number(m.out_qty ?? 0) || 0,
      type: String(m.type ?? ''),
      partner: String(m.partner ?? ''),
      channel: String(m.channel ?? ''),
      contract_num: String(m.contract_num ?? ''),
      invoice_num: String(m.invoice_num ?? ''),
      price: Number(m.price ?? 0) || 0,
    })),
  }
}
