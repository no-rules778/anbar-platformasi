import { describe, expect, it } from 'vitest'
import type { ItemRow } from '../api/items.api'
import { today } from './format'
import type { SmProject } from './serfiyyat'
import {
  findItemByNameOrCode, findProjectByName, groupTotal, lineImportToast,
  parseDocsImport, parseLineImport,
} from './serfiyyatImport'

/* T3 — M13-61, M13-62, M13-63, M13-65, M13-66, M13-67, M13-68.

   The phase's largest new risk surface. Both parsers are pure and take a 2-D
   array, so no file or workbook is needed: nothing here reads a file or calls
   Supabase. */

const item = (over: Partial<ItemRow> = {}): ItemRow =>
  ({ code: '0000001', name: 'Sement M400', unit: 'kq', price: 5, category: null, ...over })

const ITEMS: ItemRow[] = [
  item(),
  item({ code: '0000002', name: 'Qum', unit: 'ton', price: 2 }),
]
const BY_CODE = new Map(ITEMS.map((i) => [i.code, i]))

const proj = (over: Partial<SmProject> = {}): SmProject =>
  ({ id: 'p1', name: 'Layihə A', wh: 'Test Anbar', active: true, ...over })

const ALLOWED: SmProject[] = [proj(), proj({ id: 'p2', name: 'Layihə B' })]

/* ------------------------------------------------------------------ *
 * Line-level import                                                    *
 * ------------------------------------------------------------------ */

describe('parseLineImport — header vs positional detection (M13-61)', () => {
  it('detects a header row and locates the three columns BY NAME', () => {
    const out = parseLineImport([
      ['Qiymət', 'Kod', 'Miqdar'],
      ['9', '0000001', '3'],
    ], BY_CODE)
    expect(out.lines).toEqual([{ code: '0000001', qty: 3, price: 9 }])
  })

  it('falls back to POSITIONAL columns 0,1,2 and parses from row 1 when no header matches', () => {
    const out = parseLineImport([['0000001', '3', '9']], BY_CODE)
    expect(out.lines).toEqual([{ code: '0000001', qty: 3, price: 9 }])
  })

  /* The negative control for header detection: with a header present, row 1
     must be SKIPPED. A parser that ignored `start` would try to import the
     header itself and reject «Kod» as an unknown code. */
  it('does NOT import the header row itself (negative control)', () => {
    const out = parseLineImport([['Kod', 'Miqdar', 'Qiymət'], ['0000001', '1', '1']], BY_CODE)
    expect(out.lines).toHaveLength(1)
    expect(out.rejected).toEqual([])
  })

  it('returns nothing at all for an empty sheet', () => {
    expect(parseLineImport([], BY_CODE)).toEqual({ lines: [], rejected: [] })
  })
})

describe('parseLineImport — the THREE row outcomes (M13-62)', () => {
  /* Each outcome is its own case: they are deliberately not alike. */
  it('SKIPS an empty code silently — counted in NEITHER tally', () => {
    const out = parseLineImport([['', '5', '1'], ['   ', '5', '1']], BY_CODE)
    expect(out.lines).toEqual([])
    expect(out.rejected).toEqual([])
  })

  it('REJECTS an unknown code with its exact message', () => {
    const out = parseLineImport([['9999999', '5', '1']], BY_CODE)
    expect(out.lines).toEqual([])
    expect(out.rejected).toEqual(['9999999 (mal tapılmadı)'])
  })

  it.each([['0'], ['-3'], ['abc'], ['']])(
    'REJECTS a non-positive or unparseable quantity %j with its exact message', (qty) => {
      const out = parseLineImport([['0000001', qty, '1']], BY_CODE)
      expect(out.lines).toEqual([])
      expect(out.rejected).toEqual(['0000001 (miqdar yanlış)'])
    })

  /* GUARD ORDER (protocol §5) — an unknown code with a bad quantity reaches
     the CODE guard first, so «mal tapılmadı» is the message, not «miqdar». */
  it('attributes an unknown code + bad quantity to the FIRST guard reached', () => {
    const out = parseLineImport([['9999999', '-1', '1']], BY_CODE)
    expect(out.rejected).toEqual(['9999999 (mal tapılmadı)'])
  })

  it('converts a decimal COMMA in both quantity and price', () => {
    const out = parseLineImport([['0000001', '2,5', '3,25']], BY_CODE)
    expect(out.lines).toEqual([{ code: '0000001', qty: 2.5, price: 3.25 }])
  })

  it('defaults a missing or unparseable price to 0 (boundary)', () => {
    expect(parseLineImport([['0000001', '2']], BY_CODE).lines).toEqual([{ code: '0000001', qty: 2, price: 0 }])
    expect(parseLineImport([['0000001', '2', 'abc']], BY_CODE).lines[0].price).toBe(0)
  })

  it('trims a padded code before looking it up', () => {
    expect(parseLineImport([['  0000001  ', '2', '1']], BY_CODE).lines[0].code).toBe('0000001')
  })

  it('keeps the good rows and rejects only the bad ones in a mixed sheet', () => {
    const out = parseLineImport([
      ['0000001', '2', '5'],
      ['9999999', '2', '5'],
      ['', '2', '5'],
      ['0000002', '0', '5'],
      ['0000002', '4', '2'],
    ], BY_CODE)
    expect(out.lines).toEqual([
      { code: '0000001', qty: 2, price: 5 },
      { code: '0000002', qty: 4, price: 2 },
    ])
    expect(out.rejected).toEqual(['9999999 (mal tapılmadı)', '0000002 (miqdar yanlış)'])
  })
})

describe('lineImportToast — M13-63', () => {
  it('reports the added count alone when nothing was rejected', () => {
    expect(lineImportToast({ lines: [{ code: 'a', qty: 1, price: 0 }], rejected: [] }))
      .toEqual({ text: '1 sətir əlavə olundu', isError: false })
  })

  it('reports BOTH counts when some rows were rejected', () => {
    expect(lineImportToast({ lines: [{ code: 'a', qty: 1, price: 0 }], rejected: ['x'] }))
      .toEqual({ text: '1 sətir əlavə olundu, 1 sətir rədd edildi (konsola bax)', isError: false })
  })

  /* The original's own flag: an error only when EVERYTHING was rejected. */
  it('is flagged as an error only when nothing was added (boundary)', () => {
    expect(lineImportToast({ lines: [], rejected: ['x'] }).isError).toBe(true)
    expect(lineImportToast({ lines: [], rejected: [] }).isError).toBe(false)
  })
})

/* ------------------------------------------------------------------ *
 * Document-level import                                                *
 * ------------------------------------------------------------------ */

describe('findProjectByName / findItemByNameOrCode (M13-65, M13-68)', () => {
  it('matches a project by EXACT case-insensitive name, not a substring', () => {
    expect(findProjectByName('  layihə a  ', ALLOWED)?.id).toBe('p1')
    expect(findProjectByName('Layihə', ALLOWED)).toBeUndefined()
  })

  it('resolves an item by CODE first, then by exact case-insensitive name', () => {
    expect(findItemByNameOrCode('0000002', BY_CODE, ITEMS)?.code).toBe('0000002')
    expect(findItemByNameOrCode('sement m400', BY_CODE, ITEMS)?.code).toBe('0000001')
    expect(findItemByNameOrCode('Sement', BY_CODE, ITEMS)).toBeNull()
    expect(findItemByNameOrCode('', BY_CODE, ITEMS)).toBeNull()
  })
})

describe('parseDocsImport — per-row errors name the 1-BASED worksheet line (M13-65, M13-68)', () => {
  const HEAD = ['Layihə', 'Material', 'Miqdar', 'Qiymət', 'Tarix', 'Qeyd']

  it('rejects a project outside the WRITE-allowed set, naming the sheet line', () => {
    const out = parseDocsImport([
      HEAD,
      ['Layihə A', 'Sement M400', '1', '1', '2026-09-11', ''],
      ['Qadağan Layihə', 'Sement M400', '1', '1', '2026-09-11', ''],
    ], ALLOWED, BY_CODE, ITEMS)
    expect(out.groups).toHaveLength(1)
    /* Row index 2 → worksheet line 3, proving the number is the SHEET's. */
    expect(out.errors).toEqual(['Sətir 3: layihə tapılmadı və ya icazəniz yoxdur: "Qadağan Layihə"'])
  })

  it('a project the user may not WRITE to is refused even though it exists', () => {
    const narrow = [proj()]
    const out = parseDocsImport([
      HEAD, ['Layihə B', 'Sement M400', '1', '1', '2026-09-11', ''],
    ], narrow, BY_CODE, ITEMS)
    expect(out.groups).toEqual([])
    expect(out.errors[0]).toContain('layihə tapılmadı və ya icazəniz yoxdur')
  })

  it('rejects an unknown material and a non-positive quantity with their exact messages', () => {
    const out = parseDocsImport([
      HEAD,
      ['Layihə A', 'Yoxdur', '1', '1', '2026-09-11', ''],
      ['Layihə A', 'Sement M400', '0', '1', '2026-09-11', ''],
    ], ALLOWED, BY_CODE, ITEMS)
    expect(out.errors).toEqual([
      'Sətir 2: mal tapılmadı: "Yoxdur"',
      'Sətir 3: miqdar yanlış: "0"',
    ])
  })

  /* GUARD ORDER — a bad project AND a bad item reaches the PROJECT guard. */
  it('attributes a row failing several checks to the FIRST guard reached', () => {
    const out = parseDocsImport([
      HEAD, ['Yox', 'Yox', '0', '1', '2026-09-11', ''],
    ], ALLOWED, BY_CODE, ITEMS)
    expect(out.errors).toEqual(['Sətir 2: layihə tapılmadı və ya icazəniz yoxdur: "Yox"'])
  })

  it('skips a wholly blank row without producing an error', () => {
    const out = parseDocsImport([
      HEAD, ['', '', '', '', '', ''], ['Layihə A', 'Sement M400', '1', '1', '2026-09-11', ''],
    ], ALLOWED, BY_CODE, ITEMS)
    expect(out.groups).toHaveLength(1)
    expect(out.errors).toEqual([])
  })
})

describe('parseDocsImport — the avtomobil/qaimə column exclusion (M13-66)', () => {
  /* THE FIXTURE MUST CARRY BOTH HEADERS or the exclusion is vacuous: with
     only «Avtomobil nömrəsi» present, any implementation passes. */
  const HEAD = ['Layihə', 'Material', 'Miqdar', 'Qiymət', 'Tarix', 'Qeyd', 'Avtomobil nömrəsi', 'Qaimə nömrəsi']
  const ROW = ['Layihə A', 'Sement M400', '1', '1', '2026-09-11', '', '10-AA-123', '83951']

  it('binds avtomobil and qaimə to DIFFERENT columns when both headers are present', () => {
    const out = parseDocsImport([HEAD, ROW], ALLOWED, BY_CODE, ITEMS)
    expect(out.groups).toHaveLength(1)
    expect(out.groups[0].avto).toBe('10-AA-123')
    expect(out.groups[0].iv).toBe('83951')
    /* Without the `!/qaim|invoice/` exclusion «Qaimə nömrəsi» could capture
       the avtomobil slot and both fields would read the same cell. */
    expect(out.groups[0].avto).not.toBe(out.groups[0].iv)
  })

  it('still finds «Qaimə nömrəsi» when no avtomobil column exists at all', () => {
    const head = ['Layihə', 'Material', 'Miqdar', 'Qiymət', 'Tarix', 'Qeyd', 'Qaimə nömrəsi']
    const out = parseDocsImport([
      head, ['Layihə A', 'Sement M400', '1', '1', '2026-09-11', '', '83951'],
    ], ALLOWED, BY_CODE, ITEMS)
    expect(out.groups[0].iv).toBe('83951')
    expect(out.groups[0].avto).toBe('')
  })
})

describe('parseDocsImport — the SEVEN-component grouping key (M13-67)', () => {
  const HEAD = [
    'Layihə', 'Material', 'Miqdar', 'Qiymət', 'Tarix', 'Qeyd',
    'Kontragent', 'Avtomobil nömrəsi', 'Kanal', 'Qaimə nömrəsi',
  ]
  /* The baseline row; each case below varies exactly ONE component. */
  const BASE = ['Layihə A', 'Sement M400', '1', '1', '2026-09-11', 'qeyd', 'MMC', '10-AA-123', 'Nağd', '83951']
  const vary = (i: number, v: string): string[] => BASE.map((c, n) => (n === i ? v : c))

  /* THE CONTROL: all seven identical → ONE document with both lines. Without
     it, a parser that never groups would pass every split case below. */
  it('MERGES two rows whose seven components all match (control)', () => {
    const out = parseDocsImport([HEAD, BASE, [...BASE]], ALLOWED, BY_CODE, ITEMS)
    expect(out.groups).toHaveLength(1)
    expect(out.groups[0].lines).toHaveLength(2)
  })

  /* Each component varied INDEPENDENTLY — one mismatched component does not
     prove the other six participate (protocol §4). */
  it.each([
    ['projectId', 0, 'Layihə B'],
    ['date', 4, '2026-09-12'],
    ['note', 5, 'başqa qeyd'],
    ['kontragent', 6, 'Digər MMC'],
    ['avto', 7, '99-ZZ-999'],
    ['kanal', 8, 'Bank'],
    ['iv', 9, '00000'],
  ])('SPLITS into two documents when only %s differs', (_name, idx, value) => {
    const out = parseDocsImport([HEAD, BASE, vary(idx, value)], ALLOWED, BY_CODE, ITEMS)
    expect(out.groups).toHaveLength(2)
    expect(out.groups[0].lines).toHaveLength(1)
    expect(out.groups[1].lines).toHaveLength(1)
  })

  /* The text components are lower-cased into the key, so case alone must NOT
     split — while the project id and date are compared as-is. */
  it('does NOT split on letter case alone in the text components', () => {
    const out = parseDocsImport([HEAD, BASE, vary(6, 'mmc')], ALLOWED, BY_CODE, ITEMS)
    expect(out.groups).toHaveLength(1)
    expect(out.groups[0].lines).toHaveLength(2)
    /* The FIRST row's casing is what the created document carries. */
    expect(out.groups[0].kontragent).toBe('MMC')
  })
})

describe('parseDocsImport — dates, defaults and totals', () => {
  const HEAD = ['Layihə', 'Material', 'Miqdar', 'Qiymət', 'Tarix', 'Qeyd']

  it('keeps an ISO date prefix and truncates it to ten characters', () => {
    const out = parseDocsImport([
      HEAD, ['Layihə A', 'Sement M400', '1', '1', '2026-09-11T08:30:00Z', ''],
    ], ALLOWED, BY_CODE, ITEMS)
    expect(out.groups[0].date).toBe('2026-09-11')
  })

  it.each([['11.09.2026'], [''], ['sabah']])(
    'falls back to today() for the non-ISO date %j', (raw) => {
      const out = parseDocsImport([
        HEAD, ['Layihə A', 'Sement M400', '1', '1', raw, ''],
      ], ALLOWED, BY_CODE, ITEMS)
      expect(out.groups[0].date).toBe(today())
    })

  it('defaults an absent price to 0 and converts a decimal comma', () => {
    const out = parseDocsImport([
      HEAD,
      ['Layihə A', 'Sement M400', '2', '', '2026-09-11', ''],
      ['Layihə A', 'Qum', '1,5', '2,25', '2026-09-11', ''],
    ], ALLOWED, BY_CODE, ITEMS)
    expect(out.groups[0].lines).toEqual([
      { code: '0000001', name: 'Sement M400', qty: 2, price: 0 },
      { code: '0000002', name: 'Qum', qty: 1.5, price: 2.25 },
    ])
  })

  it('groupTotal sums raw qty*price across the group’s lines', () => {
    const out = parseDocsImport([
      HEAD,
      ['Layihə A', 'Sement M400', '2', '5', '2026-09-11', ''],
      ['Layihə A', 'Qum', '3', '2', '2026-09-11', ''],
    ], ALLOWED, BY_CODE, ITEMS)
    expect(groupTotal(out.groups[0])).toBe(16)
  })

  it('returns no groups and no errors for an empty sheet', () => {
    expect(parseDocsImport([], ALLOWED, BY_CODE, ITEMS)).toEqual({ groups: [], errors: [] })
  })

  /* Positional fallback: no header keyword anywhere in row 1 → columns 0..5
     parsed from row 1 itself. The project name here is deliberately «Obyekt»,
     NOT «Layihə …» — see the contract note in the next test for why. */
  it('uses POSITIONAL columns when the first row matches no header keyword', () => {
    const allowed = [proj({ id: 'p9', name: 'Obyekt 7' })]
    const out = parseDocsImport([
      ['Obyekt 7', 'Sement M400', '2', '5', '2026-09-11', 'qeyd'],
    ], allowed, BY_CODE, ITEMS)
    expect(out.groups).toHaveLength(1)
    expect(out.groups[0].note).toBe('qeyd')
    /* With no header the optional columns are absent entirely. */
    expect(out.groups[0].kontragent).toBe('')
    expect(out.groups[0].avto).toBe('')
  })

  /* LEGACY CONTRACT, recorded rather than "fixed" (proposal §7 style).

     Header detection tests row 1 against
     /layih|material|mal|miqdar|qty|qiym|price|tarix|date/ (index.html:6433).
     A data row whose project is named «Layihə A» therefore MATCHES `layih`
     and is consumed as a header, so a headerless sheet whose first row names
     such a project silently loses that row. «Sement M400» would trip `mal`
     on its own too.

     This is legacy behaviour reproduced deliberately, not a defect
     introduced here: the same sheet loses the same row in index.html. It is
     pinned so a future reader sees it was measured, and so any change to the
     detection regex fails this test. */
  it('CONSUMES a headerless first row whose project name contains «layih» (legacy trap)', () => {
    const out = parseDocsImport([
      ['Layihə A', 'Sement M400', '2', '5', '2026-09-11', 'qeyd'],
    ], ALLOWED, BY_CODE, ITEMS)
    expect(out.groups).toEqual([])
    expect(out.errors).toEqual([])
  })
})
