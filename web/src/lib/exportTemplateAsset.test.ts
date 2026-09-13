import { describe, it, expect } from 'vitest'
import { existsSync, statSync } from 'node:fs'
import { resolve } from 'node:path'
import { SON_TPL_URL } from './sonExportRun'

/* THE DEPLOY GUARD for «⬇ Excel (SON formatı)».

   The SON export fetches its template at runtime from the site root. If the
   asset is not in `web/public/` it is not copied into `dist/` by Vite, the
   fetch 404s and the button fails with «Şablon tapılmadı» — a failure that
   only shows up in a browser, after a deploy, on a feature nobody exercises
   daily.

   The asset was missing when this work started: `export-template.xlsx`
   existed only at the repository root, where the React build cannot see it.
   These assertions make that state fail a test instead of a user's export. */

const PUBLIC_DIR = resolve(__dirname, '../../public')

/** The fetch URL is site-root relative, so the file name is the asset name. */
const ASSET = SON_TPL_URL.replace(/^\.\//, '')

describe('export-template.xlsx is deployed with the app', () => {
  it('exists in web/public so Vite copies it into the build', () => {
    expect(existsSync(resolve(PUBLIC_DIR, ASSET))).toBe(true)
  })

  /* A zero-byte or truncated placeholder would pass an existence check and
     fail only when JSZip tried to open it. The real template is ~690 KB. */
  it('is a real workbook, not an empty placeholder', () => {
    expect(statSync(resolve(PUBLIC_DIR, ASSET)).size).toBeGreaterThan(100_000)
  })

  it('is named exactly what the exporter fetches', () => {
    expect(ASSET).toBe('export-template.xlsx')
  })
})
