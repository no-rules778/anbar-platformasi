import { describe, it, expect } from 'vitest'
import { cn } from './utils'

describe('cn', () => {
  it('merges class names and drops falsy values', () => {
    expect(cn('a', false, 'b', undefined, null)).toBe('a b')
  })

  it('lets a later Tailwind class win over an earlier conflicting one', () => {
    expect(cn('px-2', 'px-4')).toBe('px-4')
  })
})
