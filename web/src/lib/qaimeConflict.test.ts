import { describe, it, expect } from 'vitest'
import { normKey, bareWh, qaimeConflict, documentQaimeConflict } from './qaimeConflict'

const M = (o: Record<string, unknown>) =>
  ({ iv: '83951', d: '2026-09-01', p: 'Kontragent A', doc: 'SND-1', ...o }) as never

describe('normKey / bareWh — M7-86', () => {
  it('normKey trims and lowercases', () => {
    expect(normKey('  ABC ')).toBe('abc')
    expect(normKey(null)).toBe('')
  })

  /* A transfer's legs store "B anbarına" and "A anbarı" — the SAME route must
     not look like two different counterparties. */
  it('bareWh strips both declension suffixes', () => {
    expect(bareWh('Astara anbarına')).toBe('astara')
    expect(bareWh('Elet anbarı')).toBe('elet')
    expect(bareWh('Elet anbar')).toBe('elet')
  })

  it('bareWh leaves a plain name alone', () => {
    expect(bareWh('Kontragent A')).toBe('kontragent a')
  })
})

describe('qaimeConflict — M7-84', () => {
  it('an empty Qaimə № is never checked', () => {
    expect(qaimeConflict('', '2026-09-02', 'X', [M({})])).toBeNull()
    expect(qaimeConflict(null, '2026-09-02', 'X', [M({})])).toBeNull()
    expect(qaimeConflict('   ', '2026-09-02', 'X', [M({})])).toBeNull()
  })

  it('allows reuse with the SAME date and counterparty (a continuation)', () => {
    expect(qaimeConflict('83951', '2026-09-01', 'Kontragent A', [M({})])).toBeNull()
  })

  it('blocks reuse with a DIFFERENT date', () => {
    const c = qaimeConflict('83951', '2026-09-05', 'Kontragent A', [M({})])
    expect(c).not.toBeNull()
    expect(c!.doc).toBe('SND-1')
    expect(c!.iv).toBe('83951')
  })

  it('blocks reuse with a DIFFERENT counterparty', () => {
    const c = qaimeConflict('83951', '2026-09-01', 'Başqa', [M({})])
    expect(c).not.toBeNull()
    expect(c!.partner).toBe('kontragent a')
  })

  it('ignores documents carrying a different invoice', () => {
    expect(qaimeConflict('83951', '2026-09-05', 'X', [M({ iv: '99999' })])).toBeNull()
  })

  it('matches the invoice case-insensitively and trimmed', () => {
    const c = qaimeConflict('  AB-1 ', '2026-09-05', 'X', [M({ iv: 'ab-1' })])
    expect(c).not.toBeNull()
  })

  /* A transfer document is TWO rows with different counterparties, and row
     order is not guaranteed. Collecting sets — rather than taking the first
     row — is what keeps a legitimate continuation from being blocked at
     random. */
  it('collects ALL rows of a document, not the first — M7-85', () => {
    const transfer = [
      M({ doc: 'SND-T', p: 'Astara anbarına' }),
      M({ doc: 'SND-T', p: 'Elet anbarı' }),
    ]
    // continuing the same route on the same date is allowed from either leg
    expect(qaimeConflict('83951', '2026-09-01', 'Astara', transfer)).toBeNull()
    expect(qaimeConflict('83951', '2026-09-01', 'Elet', transfer)).toBeNull()
  })

  it('still blocks a transfer continuation on a different date', () => {
    const transfer = [
      M({ doc: 'SND-T', p: 'Astara anbarına' }),
      M({ doc: 'SND-T', p: 'Elet anbarı' }),
    ]
    expect(qaimeConflict('83951', '2026-09-09', 'Astara', transfer)).not.toBeNull()
  })

  it('reports every date and partner of the conflicting document', () => {
    const c = qaimeConflict('83951', '2026-09-09', 'Z', [
      M({ doc: 'SND-1', d: '2026-09-01', p: 'A' }),
      M({ doc: 'SND-1', d: '2026-09-02', p: 'B' }),
    ])
    expect(c!.date).toBe('2026-09-01, 2026-09-02')
    expect(c!.partner).toBe('a, b')
  })

  it('excludes the document being corrected — M7-87', () => {
    expect(qaimeConflict('83951', '2026-09-09', 'Z', [M({})], 'SND-1')).toBeNull()
  })

  it('a different document still conflicts in edit mode', () => {
    const c = qaimeConflict('83951', '2026-09-09', 'Z', [M({ doc: 'SND-2' })], 'SND-1')
    expect(c).not.toBeNull()
    expect(c!.doc).toBe('SND-2')
  })

  it('groups rows with a null doc_num under one empty key', () => {
    const c = qaimeConflict('83951', '2026-09-09', 'Z', [M({ doc: null })])
    expect(c).not.toBeNull()
    expect(c!.doc).toBe('')
  })
})

describe('documentQaimeConflict — M7-88', () => {
  const line = (o: Record<string, unknown>) =>
    ({ kind: 'in', iv: '83951', d: '2026-09-01', p: 'Kontragent A', ...o }) as never

  it('returns the first conflicting line', () => {
    const c = documentQaimeConflict([line({ d: '2026-09-09' })], [M({})])
    expect(c).not.toBeNull()
  })

  it('passes when no line conflicts', () => {
    expect(documentQaimeConflict([line({})], [M({})])).toBeNull()
  })

  /* On a transfer the counterparty for the comparison is the DESTINATION. */
  it('uses w2 as the counterparty on a transfer line', () => {
    const mv = line({ kind: 'mv', p: 'ignored', w2: 'Astara' })
    const rows = [M({ doc: 'SND-T', p: 'Astara anbarına' })]
    expect(documentQaimeConflict([mv], rows)).toBeNull()

    const wrong = line({ kind: 'mv', p: 'Astara', w2: 'Harmony' })
    expect(documentQaimeConflict([wrong], rows)).not.toBeNull()
  })

  it('checks every line, not only the first', () => {
    const ok = line({})
    const bad = line({ iv: '77777', d: '2026-09-09' })
    const rows = [M({}), M({ doc: 'SND-2', iv: '77777', d: '2026-09-01' })]
    expect(documentQaimeConflict([ok, bad], rows)).not.toBeNull()
  })

  it('forwards selfDoc', () => {
    expect(documentQaimeConflict([line({ d: '2026-09-09' })], [M({})], 'SND-1')).toBeNull()
  })
})
