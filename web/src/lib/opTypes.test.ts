import { describe, it, expect } from 'vitest'
import {
  OP_TYPES, DEFAULT_CHANNELS, SAHE_MESUL,
  channelOptions, partnerOptions, optsWith, isWoOut, isMvPick, isTypeAllowed,
} from './opTypes'

describe('OP_TYPES — M7-04', () => {
  it('offers exactly the legacy list per tab (index.html:3208)', () => {
    expect(OP_TYPES.in).toEqual(['Satınalma', 'Qaytarma', 'İcarə', 'Əvvələ qalıq'])
    expect(OP_TYPES.out).toEqual(['Sahəyə', 'Silinmə', 'Satış', 'Qaytarma'])
    expect(OP_TYPES.mv).toEqual(['Yerdəyişmə'])
  })

  it('«İcarə» is inbound only and «Qaytarma» exists on both tabs', () => {
    expect(OP_TYPES.in).toContain('İcarə')
    expect(OP_TYPES.out).not.toContain('İcarə')
    expect(OP_TYPES.in).toContain('Qaytarma')
    expect(OP_TYPES.out).toContain('Qaytarma')
  })

  it('«Əvvələ qalıq» is inbound only', () => {
    expect(OP_TYPES.in).toContain('Əvvələ qalıq')
    expect(OP_TYPES.out).not.toContain('Əvvələ qalıq')
    expect(OP_TYPES.mv).not.toContain('Əvvələ qalıq')
  })

  it('isTypeAllowed mirrors the tab lists', () => {
    expect(isTypeAllowed('in', 'Satınalma')).toBe(true)
    expect(isTypeAllowed('out', 'Satınalma')).toBe(false)
    expect(isTypeAllowed('mv', 'Yerdəyişmə')).toBe(true)
    expect(isTypeAllowed('mv', 'Silinmə')).toBe(false)
  })
})

describe('channelOptions — M7-16', () => {
  const ch = (name: string, active = true) => ({ name, active })

  it('a READY directory yields its active channels only', () => {
    const refs = { ready: true, channels: [ch('Nağd alış'), ch('Gizli', false)] }
    expect(channelOptions(refs, ['Köçürmə'])).toEqual(['Nağd alış'])
  })

  it('a FAILED directory falls back to built-ins plus observed channels', () => {
    const refs = { ready: false, channels: [] }
    const out = channelOptions(refs, ['Xüsusi kanal', 'Nağd alış'])
    expect(out).toEqual([...DEFAULT_CHANNELS, 'Xüsusi kanal'])
  })

  /* Phase 5 A14: failure and "ready but empty" are NOT the same state. */
  it('a READY but EMPTY directory stays empty — no built-in resurrection', () => {
    expect(channelOptions({ ready: true, channels: [] }, ['Nağd alış'])).toEqual([])
  })

  it('drops empty observed values when falling back', () => {
    const out = channelOptions({ ready: false, channels: [] }, ['', 'X'])
    expect(out).not.toContain('')
    expect(out).toContain('X')
  })
})

describe('partnerOptions — M7-09', () => {
  const data = {
    warehouses: ['Elet', 'Astara'],
    locations: [
      { name: 'Elet', kind: 'anbar', active: true },
      { name: 'Layihə A', kind: 'layihe', active: true },
      { name: 'Gizli layihə', kind: 'layihe', active: false },
    ],
    partners: [
      { name: 'Kontragent A', active: true },
      { name: 'Gizli kontragent', active: false },
    ],
  }

  it('in → active partners only', () => {
    expect(partnerOptions('in', data)).toEqual(['Kontragent A'])
  })

  it('out → «Sahə üzrə məsul şəxs», then NON-anbar locations, then anbar ones', () => {
    expect(partnerOptions('out', data)).toEqual([SAHE_MESUL, 'Layihə A', 'Elet'])
  })

  it('mv → the warehouse list', () => {
    expect(partnerOptions('mv', data)).toEqual(['Elet', 'Astara'])
  })

  it('a hidden partner is absent from the options', () => {
    expect(partnerOptions('in', data)).not.toContain('Gizli kontragent')
  })

  it('a hidden location is absent from the outbound options', () => {
    expect(partnerOptions('out', data)).not.toContain('Gizli layihə')
  })

  it('de-duplicates', () => {
    const dup = { ...data, warehouses: ['Elet', 'Elet'] }
    expect(partnerOptions('mv', dup)).toEqual(['Elet'])
  })
})

describe('optsWith — M7-47', () => {
  it('appends a current value missing from the list', () => {
    expect(optsWith(['a', 'b'], 'c')).toEqual(['a', 'b', 'c'])
  })
  it('leaves the list alone when the value is present', () => {
    expect(optsWith(['a', 'b'], 'b')).toEqual(['a', 'b'])
  })
  it('ignores an empty current value', () => {
    expect(optsWith(['a'], '')).toEqual(['a'])
    expect(optsWith(['a'], null)).toEqual(['a'])
  })
  it('never mutates the input', () => {
    const src = ['a']
    optsWith(src, 'z')
    expect(src).toEqual(['a'])
  })
})

describe('isWoOut / isMvPick — M7-56', () => {
  it('the write-off layout needs out + Silinmə and NOT edit mode', () => {
    expect(isWoOut('out', 'Silinmə', false)).toBe(true)
    expect(isWoOut('out', 'Satış', false)).toBe(false)
    expect(isWoOut('in', 'Silinmə', false)).toBe(false)
  })

  /* The bulk flow calls post_movement_document directly and would bypass the
     correct_document transaction — so edit mode keeps the ordinary form. */
  it('edit mode suppresses BOTH bulk entry points', () => {
    expect(isWoOut('out', 'Silinmə', true)).toBe(false)
    expect(isMvPick('mv', true)).toBe(false)
  })

  it('the transfer tab offers the bulk picker alongside the single form', () => {
    expect(isMvPick('mv', false)).toBe(true)
    expect(isMvPick('out', false)).toBe(false)
  })
})
