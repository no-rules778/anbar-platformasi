import { describe, it, expect, beforeEach } from 'vitest'
import { act, render, screen } from '@testing-library/react'
import { SyncIndicator } from './SyncIndicator'
import { useSyncStore } from '../store/sync.store'

beforeEach(() => useSyncStore.setState({ state: 'idle' }))

/* Wording matches the production indicator: «sinxron» / «xəta»
   (index.html setSync, 1184-1188). */
describe('SyncIndicator', () => {
  it.each([
    ['idle', 'bağlı deyil'],
    ['connecting', 'qoşulur…'],
    ['synced', 'sinxron'],
    ['error', 'xəta'],
  ] as const)('renders %s as "%s"', (state, label) => {
    useSyncStore.setState({ state })
    render(<SyncIndicator />)
    expect(screen.getByText(label)).toBeTruthy()
  })

  it('never says "sinxron" before the channel reports SUBSCRIBED', () => {
    useSyncStore.setState({ state: 'connecting' })
    render(<SyncIndicator />)
    expect(screen.queryByText('sinxron')).toBeNull()
  })

  it('follows later state changes', () => {
    const { container } = render(<SyncIndicator />)
    const chip = () => container.querySelector('[data-sync-state]')!

    expect(chip().getAttribute('data-sync-state')).toBe('idle')
    act(() => useSyncStore.setState({ state: 'synced' }))
    expect(chip().getAttribute('data-sync-state')).toBe('synced')
    act(() => useSyncStore.setState({ state: 'error' }))
    expect(chip().getAttribute('data-sync-state')).toBe('error')
    expect(screen.getByText('xəta')).toBeTruthy()
  })
})
