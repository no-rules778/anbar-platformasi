import { describe, expect, it } from 'vitest'
import { AZP_LABEL, AZP_MODULES, azpKindLabel, azpMod, isAzpModule } from './azpLabels'

/* T0 — M17-49, M17-50, M17-51.

   PURE UNIT EVIDENCE ONLY. `azpMod()`'s throw is a CLIENT guard; the
   server's `azp_check_module()` (sql/020 §5) is the authority and is not
   exercised by anything here (protocol §7). */

describe('AZP_MODULES', () => {
  it('is exactly the two boards, azpetrol first', () => {
    expect([...AZP_MODULES]).toEqual(['azpetrol', 'araz'])
  })
})

describe('AZP_LABEL', () => {
  it('carries the exact Azpetrol labels', () => {
    expect(AZP_LABEL.azpetrol).toEqual({
      title: 'Azpetrol',
      out: 'Y/D',
      total: 'Kartların balansı',
      vat: false,
      cardHead: 'Sahib / Layihə',
      unit: '₼',
    })
  })

  it('carries the exact Araz labels', () => {
    expect(AZP_LABEL.araz).toEqual({
      title: 'Araz',
      out: 'Məxaric',
      total: 'Kartların cari balansı',
      vat: true,
      cardHead: 'Obyekt / Kart seriyası',
      unit: '₼',
    })
  })

  /* The boards differ in five keys and agree only on `unit`. A test that
     checked one board alone would pass against a copy-paste bug that gave
     both the same labels, so both halves are asserted against each other. */
  it('differs between the boards in title, out, total, vat and cardHead', () => {
    expect(AZP_LABEL.azpetrol.title).not.toBe(AZP_LABEL.araz.title)
    expect(AZP_LABEL.azpetrol.out).not.toBe(AZP_LABEL.araz.out)
    expect(AZP_LABEL.azpetrol.total).not.toBe(AZP_LABEL.araz.total)
    expect(AZP_LABEL.azpetrol.vat).not.toBe(AZP_LABEL.araz.vat)
    expect(AZP_LABEL.azpetrol.cardHead).not.toBe(AZP_LABEL.araz.cardHead)
    expect(AZP_LABEL.azpetrol.unit).toBe(AZP_LABEL.araz.unit)
  })

  it('marks Araz as VAT-inclusive and Azpetrol as not', () => {
    expect(AZP_LABEL.araz.vat).toBe(true)
    expect(AZP_LABEL.azpetrol.vat).toBe(false)
  })
})

describe('azpMod', () => {
  it('returns each valid module unchanged', () => {
    expect(azpMod('azpetrol')).toBe('azpetrol')
    expect(azpMod('araz')).toBe('araz')
  })

  it('throws the exact legacy message for an unknown module', () => {
    expect(() => azpMod('anbar')).toThrow('AZP: yanlış modul: anbar')
  })

  /* Boundary: near-misses must throw too, not be coerced to a default. */
  it('throws for empty, whitespace and case variants', () => {
    expect(() => azpMod('')).toThrow('AZP: yanlış modul: ')
    expect(() => azpMod(' azpetrol')).toThrow()
    expect(() => azpMod('AZPETROL')).toThrow()
    expect(() => azpMod('Araz')).toThrow()
  })
})

describe('isAzpModule', () => {
  it('accepts the two boards and rejects everything else', () => {
    expect(isAzpModule('azpetrol')).toBe(true)
    expect(isAzpModule('araz')).toBe(true)
    expect(isAzpModule('anbar')).toBe(false)
    expect(isAzpModule('')).toBe(false)
    expect(isAzpModule(null)).toBe(false)
    expect(isAzpModule(undefined)).toBe(false)
    expect(isAzpModule(7)).toBe(false)
  })
})

describe('azpKindLabel', () => {
  it('labels medaxil identically on both boards', () => {
    expect(azpKindLabel('azpetrol', 'medaxil')).toBe('Mədaxil')
    expect(azpKindLabel('araz', 'medaxil')).toBe('Mədaxil')
  })

  /* The out label is the one place the two boards visibly diverge. */
  it('labels mexaric with the board-specific out label', () => {
    expect(azpKindLabel('azpetrol', 'mexaric')).toBe('Y/D')
    expect(azpKindLabel('araz', 'mexaric')).toBe('Məxaric')
  })

  /* Legacy does NOT validate `k`: anything that is not `medaxil` falls to the
     out label. Preserved verbatim rather than "hardened". */
  it('falls back to the out label for an unknown or empty kind', () => {
    expect(azpKindLabel('azpetrol', 'nonsense')).toBe('Y/D')
    expect(azpKindLabel('araz', '')).toBe('Məxaric')
  })
})
