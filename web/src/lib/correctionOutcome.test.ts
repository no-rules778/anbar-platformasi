import { describe, it, expect } from 'vitest'
import {
  classifyCorrectionFailure, validateCorrectionBody,
  correctionRejectedMessage, correctionSuccessMessage,
  correctionUnknownMessage, correctionRefreshFailedMessage,
  correctionBlockedMessage,
} from './correctionOutcome'

/* I-6, decision `D6`. The classification rule is SHARED with I-5 (it is
   transport-level); the success contract is correction-specific. */

describe('classifyCorrectionFailure — reuses the shared transport rule', () => {
  it('a synthesised transport error (status 0) is UNKNOWN, never rejected', () => {
    expect(classifyCorrectionFailure({ message: 'TypeError: fetch failed', status: 0, code: '' }))
      .toBe('unknown')
  })

  it('a real PostgREST rejection (4xx + a server code) is REJECTED', () => {
    expect(classifyCorrectionFailure({ message: 'İcazə yoxdur', status: 403, code: '42501' }))
      .toBe('rejected')
    expect(classifyCorrectionFailure({ message: 'raise', status: 400, code: 'P0001' }))
      .toBe('rejected')
  })

  it('a 4xx with NO recognisable server code is UNKNOWN — an intermediary', () => {
    expect(classifyCorrectionFailure({ message: '<html>404</html>', status: 404, code: null }))
      .toBe('unknown')
  })

  it('gateway 5xx and a missing status stay UNKNOWN', () => {
    expect(classifyCorrectionFailure({ message: 'bad gateway', status: 502, code: null }))
      .toBe('unknown')
    expect(classifyCorrectionFailure({ message: 'x', status: null, code: null }))
      .toBe('unknown')
  })

  it('408 and 429 are carved out of the 4xx band', () => {
    expect(classifyCorrectionFailure({ message: 't', status: 408, code: 'PGRST000' }))
      .toBe('unknown')
    expect(classifyCorrectionFailure({ message: 't', status: 429, code: 'PGRST000' }))
      .toBe('unknown')
  })
})

describe('validateCorrectionBody — the CORRECTION contract, not the batch one', () => {
  it('accepts a well-formed correction body', () => {
    const r = validateCorrectionBody(
      {
        original_doc_num: 'SND-1',
        new_doc_num: 'SND-2',
        reversal_doc_num: 'SND-R',
        row_count: 3,
      },
      'SND-1',
    )
    expect(r).toEqual({
      ok: true,
      body: { newDocNum: 'SND-2', reversalDocNum: 'SND-R', rowCount: 3 },
    })
  })

  it('does NOT require the batch keys this RPC never emits', () => {
    /* `cancelled_count` / `document_count` / `results` belong to the batch
       validator; requiring them here would reject every genuine success. */
    const r = validateCorrectionBody({ new_doc_num: 'SND-2' }, 'SND-1')
    expect(r.ok).toBe(true)
    expect(r.ok && r.body).toEqual({ newDocNum: 'SND-2', reversalDocNum: null, rowCount: null })
  })

  it('rejects a body with no new_doc_num — the load-bearing field', () => {
    expect(validateCorrectionBody({ original_doc_num: 'SND-1' }, 'SND-1').ok).toBe(false)
    expect(validateCorrectionBody({ new_doc_num: '' }, 'SND-1').ok).toBe(false)
    expect(validateCorrectionBody({ new_doc_num: '   ' }, 'SND-1').ok).toBe(false)
  })

  it('rejects a non-object body', () => {
    expect(validateCorrectionBody(null, 'SND-1').ok).toBe(false)
    expect(validateCorrectionBody([], 'SND-1').ok).toBe(false)
    expect(validateCorrectionBody('ok', 'SND-1').ok).toBe(false)
  })

  it('rejects a response describing a DIFFERENT document', () => {
    const r = validateCorrectionBody(
      { original_doc_num: 'SND-9', new_doc_num: 'SND-2' },
      'SND-1',
    )
    expect(r).toMatchObject({ ok: false })
  })

  it('tolerates an absent original_doc_num but not a mismatching one', () => {
    expect(validateCorrectionBody({ new_doc_num: 'SND-2' }, 'SND-1').ok).toBe(true)
  })

  it('ignores an unusable row_count rather than failing on it', () => {
    const r = validateCorrectionBody({ new_doc_num: 'SND-2', row_count: -1 }, 'SND-1')
    expect(r.ok && r.body.rowCount).toBe(null)
    const r2 = validateCorrectionBody({ new_doc_num: 'SND-2', row_count: 1.5 }, 'SND-1')
    expect(r2.ok && r2.body.rowCount).toBe(null)
  })
})

describe('the messages — only ONE may claim the document is unchanged', () => {
  it('a CONFIRMED rejection says the document is unchanged', () => {
    expect(correctionRejectedMessage('İcazə yoxdur', 'SND-1'))
      .toBe('Düzəliş qeyd edilmədi: İcazə yoxdur — SND-1 sənədi dəyişməyib.')
  })

  it('an UNKNOWN outcome NEVER says the document is unchanged', () => {
    const m = correctionUnknownMessage('şəbəkə xətası', 'SND-1')
    expect(m).not.toContain('dəyişməyib')
    expect(m).toContain('TƏSDİQLƏNMƏDİ')
    expect(m).toContain('SND-1')
  })

  it('a success names both documents', () => {
    expect(correctionSuccessMessage('SND-1', 'SND-2', 3))
      .toBe('Sənəd düzəldildi · köhnə: SND-1 → yeni: SND-2 · 3 sətir')
  })

  it('a stale success confirms the write BEFORE mentioning the stale list', () => {
    const m = correctionRefreshFailedMessage('SND-1', 'SND-2')
    expect(m.indexOf('düzəldildi')).toBeLessThan(m.indexOf('yenilənmədi'))
    expect(m).not.toContain('dəyişməyib')
  })

  it('the repeat block explains the double-replacement risk', () => {
    const m = correctionBlockedMessage('SND-1')
    expect(m).toContain('SND-1')
    expect(m).toContain('iki dəfə')
  })
})


/* I-6 finding 1 — an explicit failure body, and contradictory identifiers.

   PostgREST answers 200 for anything an RPC returns normally, so a function
   that reports its own refusal as a VALUE arrives with a success status. The
   pre-fix validator read `new_doc_num` first and declared such a body a
   CONFIRMED success — the one verdict that clears the D6 record and tells the
   admin their document was replaced. */

describe('validateCorrectionBody — explicit failure bodies', () => {
  const failures: [string, Record<string, unknown>][] = [
    ['ok:false', { ok: false, new_doc_num: 'SND-2' }],
    ['success:false', { success: false, new_doc_num: 'SND-2' }],
    ['a string error', { error: 'icazə yoxdur', new_doc_num: 'SND-2' }],
    ['an object error', { error: { code: '42501' }, new_doc_num: 'SND-2' }],
    ['ok:false with every other field intact', {
      ok: false,
      original_doc_num: 'SND-1',
      new_doc_num: 'SND-2',
      reversal_doc_num: 'SND-R',
      row_count: 3,
    }],
  ]

  for (const [label, body] of failures) {
    it(`refuses a 2xx body declaring ${label}, even with a new_doc_num`, () => {
      expect(validateCorrectionBody(body, 'SND-1').ok).toBe(false)
    })
  }

  it('states the declared failure in the reason', () => {
    const r = validateCorrectionBody({ ok: false, new_doc_num: 'SND-2' }, 'SND-1')
    expect(r.ok).toBe(false)
    expect(!r.ok && r.reason).toContain('ok:false')
  })

  it('carries the server text through when the body names one', () => {
    const r = validateCorrectionBody({ error: 'icazə yoxdur', new_doc_num: 'X' }, 'SND-1')
    expect(!r.ok && r.reason).toContain('icazə yoxdur')
  })

  it('still ACCEPTS the positive forms of those fields', () => {
    /* The RPC does not emit `ok`, but a wrapper that adds `ok:true` must not
       be refused — only a declared FAILURE is disqualifying. */
    expect(validateCorrectionBody({ ok: true, new_doc_num: 'SND-2' }, 'SND-1').ok).toBe(true)
    expect(validateCorrectionBody({ error: null, new_doc_num: 'SND-2' }, 'SND-1').ok).toBe(true)
    expect(validateCorrectionBody({ error: '', new_doc_num: 'SND-2' }, 'SND-1').ok).toBe(true)
    expect(validateCorrectionBody({ error: '   ', new_doc_num: 'SND-2' }, 'SND-1').ok).toBe(true)
  })
})

describe('validateCorrectionBody — contradictory identifiers', () => {
  it('refuses a replacement identical to the submitted document', () => {
    /* A correction cancels the original and posts under a NEW number. A body
       naming the original as the replacement contradicts sql/030 and would
       tell the admin the document was replaced by itself. */
    const r = validateCorrectionBody({ new_doc_num: 'SND-1' }, 'SND-1')
    expect(r.ok).toBe(false)
  })

  it('refuses a reversal equal to the ORIGINAL', () => {
    const r = validateCorrectionBody(
      { original_doc_num: 'SND-1', new_doc_num: 'SND-2', reversal_doc_num: 'SND-1' },
      'SND-1',
    )
    expect(r.ok).toBe(false)
  })

  it('refuses a reversal equal to the REPLACEMENT', () => {
    const r = validateCorrectionBody(
      { new_doc_num: 'SND-2', reversal_doc_num: 'SND-2' },
      'SND-1',
    )
    expect(r.ok).toBe(false)
  })

  it('accepts three mutually distinct identifiers', () => {
    const r = validateCorrectionBody(
      { original_doc_num: 'SND-1', new_doc_num: 'SND-2', reversal_doc_num: 'SND-R' },
      'SND-1',
    )
    expect(r.ok).toBe(true)
    expect(r.ok && r.body.reversalDocNum).toBe('SND-R')
  })

  it('an absent reversal is still fine', () => {
    expect(validateCorrectionBody({ new_doc_num: 'SND-2' }, 'SND-1').ok).toBe(true)
  })
})
