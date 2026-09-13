import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'

/* T6 — M13-03, M13-04, M13-10, M13-14, M13-16, M13-19.

   The store and the realtime hook are mocked; the two tab components are
   mocked too, so this file pins the SHELL and the readiness gate only. Their
   own behaviour is covered by DocumentForm.test.tsx / ReportView.test.tsx. */

const load = vi.fn()
const setTab = vi.fn()

let state: Record<string, unknown>

vi.mock('../store/serfiyyat.store', () => ({ useSerfiyyatStore: () => state }))
vi.mock('../hooks/useRealtimeRefresh', () => ({ useRealtimeRefresh: vi.fn() }))
vi.mock('../components/serfiyyat/DocumentForm', () => ({
  DocumentForm: () => <div data-testid="mock-form" />,
}))
vi.mock('../components/serfiyyat/ReportView', () => ({
  ReportView: () => <div data-testid="mock-report" />,
}))

import { SerfiyyatPage, SM_SEGMENTS, SM_SUBTITLE } from './SerfiyyatPage'
import { useRealtimeRefresh } from '../hooks/useRealtimeRefresh'

const me = { id: 'u1', sbId: 'u1', email: 'a@x', name: 'A', role: 'anbardar', wh: 'Test Anbar' }
const admin = { ...me, role: 'admin', wh: '' }
const rehber = { ...me, role: 'rehber', wh: '' }

const baseState = (over: Record<string, unknown> = {}) => ({
  ready: true, loading: false, loaded: true, error: null, tab: 'doc', setTab, load, ...over,
})

beforeEach(() => {
  vi.clearAllMocks()
  state = baseState()
})

describe('shell — M13-03, M13-04', () => {
  it('renders the heading', () => {
    render(<SerfiyyatPage me={me} />)
    expect(screen.getByRole('heading', { name: 'Sərfiyyat Materialları' })).toBeTruthy()
  })

  /* M13-04 — the subtitle is FIXED; unlike «Nomenklatura sorğuları» this page
     has no role-dependent variant. The three roles are asserted so a future
     role branch cannot be added unnoticed. */
  it.each([['admin', admin], ['anbardar', me], ['rehber', rehber]])(
    'shows the SAME fixed subtitle for %s', (_r, who) => {
      render(<SerfiyyatPage me={who} />)
      expect(screen.getByTestId('sm-sub').textContent).toBe(SM_SUBTITLE)
    })

  it('states that the page does not affect stock', () => {
    expect(SM_SUBTITLE).toContain('anbar qalığına təsir etmir')
  })

  it('loads once on mount', () => {
    render(<SerfiyyatPage me={me} />)
    expect(load).toHaveBeenCalledTimes(1)
  })

  /* M13-19 / D-N5 — the improvement's table set, and the negative control
     that no stock table is watched. */
  it('watches exactly the two serfiyyat tables for realtime changes', () => {
    render(<SerfiyyatPage me={me} />)
    const tables = vi.mocked(useRealtimeRefresh).mock.calls[0][1]
    expect([...tables]).toEqual(['serfiyyat_documents', 'serfiyyat_lines'])
    expect([...tables]).not.toContain('movements')
  })
})

describe('the segment control — M13-16', () => {
  it('renders exactly two buttons in the fixed order', () => {
    expect(SM_SEGMENTS.map((s) => s.label)).toEqual(['Yeni sənəd', 'Hesabat'])
    render(<SerfiyyatPage me={me} />)
    const buttons = screen.getByTestId('sm-seg').querySelectorAll('button')
    expect(buttons).toHaveLength(2)
    expect([...buttons].map((b) => b.textContent)).toEqual(['Yeni sənəd', 'Hesabat'])
  })

  it('marks the active tab and only the active tab', () => {
    render(<SerfiyyatPage me={me} />)
    const [doc, rep] = screen.getByTestId('sm-seg').querySelectorAll('button')
    expect(doc.className).toBe('on')
    expect(rep.className).toBe('')
  })

  it('switches the tab through the store', () => {
    render(<SerfiyyatPage me={me} />)
    fireEvent.click(screen.getByText('Hesabat'))
    expect(setTab).toHaveBeenCalledWith('rep')
  })

  it('renders the FORM on the doc tab and the REPORT on the rep tab', () => {
    const { unmount } = render(<SerfiyyatPage me={me} />)
    expect(screen.queryByTestId('mock-form')).toBeTruthy()
    expect(screen.queryByTestId('mock-report')).toBeNull()
    unmount()

    state = baseState({ tab: 'rep' })
    render(<SerfiyyatPage me={me} />)
    expect(screen.queryByTestId('mock-report')).toBeTruthy()
    expect(screen.queryByTestId('mock-form')).toBeNull()
  })
})

/* M13-10 — the readiness gate: when any of the three core reads failed the
   WHOLE body is one hint. Not a form, not a report, not an empty table. */
describe('the readiness gate — M13-10', () => {
  it('renders ONLY the hint when the snapshot loaded but is not ready', () => {
    state = baseState({ ready: false })
    render(<SerfiyyatPage me={me} />)
    expect(screen.getByTestId('sm-not-ready').textContent)
      .toContain('sql/032 migrasiyası Supabase-ə tətbiq edilməyib')
    expect(screen.queryByTestId('mock-form')).toBeNull()
    expect(screen.queryByTestId('mock-report')).toBeNull()
  })

  it('renders the body when ready (positive control)', () => {
    render(<SerfiyyatPage me={me} />)
    expect(screen.queryByTestId('sm-not-ready')).toBeNull()
    expect(screen.queryByTestId('sm-out')).toBeTruthy()
  })

  /* The gate applies to every role — it is about the SQL being applied, not
     about who is looking. */
  it.each([['admin', admin], ['anbardar', me], ['rehber', rehber]])(
    'gates %s identically', (_r, who) => {
      state = baseState({ ready: false })
      render(<SerfiyyatPage me={who} />)
      expect(screen.queryByTestId('sm-not-ready')).toBeTruthy()
    })
})

/* M13-14 — the three load surfaces, kept strictly apart. */
describe('loading, first-error and retained-refresh surfaces — M13-14', () => {
  it('shows the loading block on a FIRST load only', () => {
    state = baseState({ loading: true, loaded: false })
    render(<SerfiyyatPage me={me} />)
    expect(screen.queryByTestId('sm-loading')).toBeTruthy()
  })

  it('does NOT show the loading block while refreshing an existing snapshot', () => {
    state = baseState({ loading: true, loaded: true })
    render(<SerfiyyatPage me={me} />)
    expect(screen.queryByTestId('sm-loading')).toBeNull()
    /* The previous snapshot stays on screen during a refresh. */
    expect(screen.queryByTestId('sm-out')).toBeTruthy()
  })

  it('shows the load-error block and NO page body on a first-load failure', () => {
    state = baseState({ loaded: false, error: 'boom', ready: false })
    render(<SerfiyyatPage me={me} />)
    expect(screen.getByTestId('sm-load-error').textContent).toContain('boom')
    expect(screen.queryByTestId('sm-out')).toBeNull()
    expect(screen.queryByTestId('sm-not-ready')).toBeNull()
  })

  it('shows the «Yenilənmədi» tag and KEEPS the body on a failed refresh', () => {
    state = baseState({ loaded: true, error: 'refresh failed' })
    render(<SerfiyyatPage me={me} />)
    expect(screen.getByTestId('sm-refresh-error').textContent).toContain('Yenilənmədi')
    /* The retained snapshot — the whole point of the rule. */
    expect(screen.queryByTestId('sm-out')).toBeTruthy()
    expect(screen.queryByTestId('sm-load-error')).toBeNull()
  })

  it('shows neither error surface once recovered', () => {
    render(<SerfiyyatPage me={me} />)
    expect(screen.queryByTestId('sm-refresh-error')).toBeNull()
    expect(screen.queryByTestId('sm-load-error')).toBeNull()
  })
})
