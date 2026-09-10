import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

/* M9-119 — the CSV fallback when the workbook library is unavailable
   (index.html:1220). The `xlsx` module is stubbed to an object WITHOUT the
   API `xls()` calls, which is the only way the bundled import can be
   "missing" at runtime. The ordinary path is covered by xls.test.ts, where
   the same module is stubbed WITH the API. */

/* The exports exist but carry no API — vitest's strict mocks throw on an
   undeclared export, so both names are declared and left useless. */
vi.mock('xlsx', () => ({ utils: {}, writeFile: undefined }))

import { xls, csvDownload } from './xls'
import { today } from './format'

const clicks: HTMLAnchorElement[] = []
const blobs: Blob[] = []

beforeEach(() => {
  clicks.length = 0
  blobs.length = 0
  /* jsdom has no URL.createObjectURL; capture the blob and hand back a token. */
  vi.stubGlobal('URL', {
    ...URL,
    createObjectURL: (b: Blob) => { blobs.push(b); return 'blob:test' },
    revokeObjectURL: () => {},
  })
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
    clicks.push(this)
  })
})
afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('xls() falls back to CSV when the workbook API is absent (M9-119)', () => {
  it('reports the csv outcome and downloads a .csv named like the workbook', () => {
    const outcome = xls([['A', 'B'], [1, 'x']], 'anbar_qaliqlari')
    expect(outcome).toBe('csv')
    expect(clicks).toHaveLength(1)
    expect(clicks[0].download).toBe('anbar_qaliqlari_' + today() + '.csv')
    expect(clicks[0].href).toContain('blob:test')
  })

  it('leaves no anchor behind in the document', () => {
    xls([['A']], 'n')
    expect(document.querySelectorAll('a').length).toBe(0)
  })
})

describe('csvDownload — the legacy csv() body (index.html:1199-1209)', () => {
  /* HARNESS NOTE (§8): `Blob.text()` decodes through a TextDecoder whose
     default `ignoreBOM: false` CONSUMES a leading U+FEFF, so the BOM the
     implementation writes is invisible to it and every BOM assertion below
     failed against a correct implementation. Decoding the raw bytes with
     `ignoreBOM: true` keeps the BOM observable. */
  async function text(): Promise<string> {
    const bytes = new Uint8Array(await blobs[0].arrayBuffer())
    return new TextDecoder('utf-8', { ignoreBOM: true }).decode(bytes)
  }

  it('joins cells with «;», rows with CRLF, and prefixes a UTF-8 BOM', async () => {
    csvDownload([['A', 'B'], [1, 2]], 'n')
    expect(blobs).toHaveLength(1)
    expect(blobs[0].type).toBe('text/csv;charset=utf-8;')
    expect(await text()).toBe('﻿A;B\r\n1;2')
  })

  it('quotes a cell containing a quote, a semicolon or a newline — and doubles the quote', async () => {
    csvDownload([['a"b', 'c;d', 'e\nf', 'plain']], 'n')
    expect(await text()).toBe('﻿"a""b";"c;d";"e\nf";plain')
  })

  it('exports null and undefined as empty cells', async () => {
    csvDownload([[null, undefined, 0]], 'n')
    expect(await text()).toBe('﻿;;0')
  })
})
