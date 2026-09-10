import { describe, it, expect } from 'vitest'
import {
  CAT_UNSET, categoryImportBlocked, classifyCategoryRows,
} from './categoryImportClassify'
import type { ItemRow } from '../api/items.api'

/* A02 — catImpPreview()/catImpCount()/catImpApply(), index.html:5809-5884.

   These pin the classification contract the dialog renders and the apply
   handler consults. Each case below fails against the pre-fix implementation,
   which checked only three conditions (unknown code, empty category, unknown
   category), had no seven-digit test, no duplicate test and no unset bucket,
   and discarded blank-code rows before they were ever classified. */

const item = (over: Partial<ItemRow> = {}): ItemRow => ({
  code: '0000001', name: 'Sement', unit: 'kq', price: 10, category: null, ...over,
})

const ITEMS = [item(), item({ code: '0000002', name: 'Filtr' })]
const CATS = ['Filtrlər', 'Ehtiyat']

const classify = (csv: string) => classifyCategoryRows(csv, ITEMS, CATS)

describe('bucket classification', () => {
  it('accepts a valid mapping', () => {
    const [r] = classify('code,category\n0000001,Filtrlər')
    expect(r.bucket).toBe('ok')
    expect(r.name).toBe('Sement')
  })

  /* The seven-digit test runs BEFORE the directory lookup, so the reason the
     user sees is about the format, not about the item being missing. */
  it('reports a malformed code as a format error, not as a missing item', () => {
    const [r] = classify('code,category\n123,Filtrlər')
    expect(r).toMatchObject({ bucket: 'err', reason: 'Kod 7 rəqəm olmalıdır' })
  })

  it('keeps a blank code as an error row', () => {
    const rows = classify('code,category\n,Filtrlər\n0000001,Filtrlər')
    expect(rows).toHaveLength(2)
    expect(rows[0]).toMatchObject({ bucket: 'err', reason: 'Kod 7 rəqəm olmalıdır' })
    expect(rows[1].bucket).toBe('ok')
  })

  it('rejects a well-formed code that is not in the directory', () => {
    const [r] = classify('code,category\n9999999,Filtrlər')
    expect(r).toMatchObject({ bucket: 'err', reason: 'Bazada yoxdur' })
  })

  it('rejects an empty category', () => {
    const [r] = classify('code,category\n0000001,')
    expect(r).toMatchObject({ bucket: 'err', reason: 'Kateqoriya boşdur' })
  })

  it('rejects a category outside the reference directory', () => {
    const [r] = classify('code,category\n0000001,Uydurma')
    expect(r).toMatchObject({ bucket: 'err', reason: 'Yanlış kateqoriya' })
  })

  /* The duplicate message names the FIRST line the code appeared on, 1-based
     over the body rows (index.html:5831). */
  it('rejects a repeated code and names the line it first appeared on', () => {
    const rows = classify('code,category\n0000001,Filtrlər\n0000001,Ehtiyat')
    expect(rows[0].bucket).toBe('ok')
    expect(rows[1]).toMatchObject({ bucket: 'err', reason: 'Təkrar kod (sətir 1)' })
  })

  /* `Təyin edilməyib` is allowed input, but it is its own bucket: reported to
     the user, never written, and NOT an error. */
  it('puts CAT_UNSET in the unset bucket rather than ok or err', () => {
    const [r] = classify(`code,category\n0000001,${CAT_UNSET}`)
    expect(r.bucket).toBe('unset')
  })

  it('accepts proposed_category as the category column', () => {
    const [r] = classify('code,proposed_category\n0000001,Filtrlər')
    expect(r.bucket).toBe('ok')
    expect(r.cat).toBe('Filtrlər')
  })

  /* Codes are identifiers: a numeric round-trip would turn 0000001 into 1. */
  it('preserves leading zeros', () => {
    const [r] = classify('code,category\n0000001,Filtrlər')
    expect(r.code).toBe('0000001')
  })
})

/* catImpCount()/catImpApply(): ANY error blocks the WHOLE file. This is the
   gate the apply handler consults as its second barrier, independently of
   the button's disabled state. */
describe('whole-file gate', () => {
  it('blocks when a single error sits among valid rows', () => {
    const rows = classify('code,category\n0000001,Filtrlər\n9999999,Filtrlər')
    expect(rows.filter((r) => r.bucket === 'ok')).toHaveLength(1)
    expect(categoryImportBlocked(rows)).toBe(true)
  })

  it('does not block on an unset row, which is informational only', () => {
    const rows = classify(`code,category\n0000001,Filtrlər\n0000002,${CAT_UNSET}`)
    expect(categoryImportBlocked(rows)).toBe(false)
  })

  it('does not block a clean file', () => {
    expect(categoryImportBlocked(classify('code,category\n0000001,Filtrlər'))).toBe(false)
  })

  it('blocks an entirely empty-code file rather than treating it as clean', () => {
    expect(categoryImportBlocked(classify('code,category\n,Filtrlər'))).toBe(true)
  })
})
