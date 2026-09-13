import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen, within } from '@testing-library/react'

/* T6 — M13-69, M13-70.

   THE NON-ATOMIC LOOP (M13-70, D-N3) is the load-bearing contract here: each
   document is atomic in its OWN transaction, so a mid-loop failure leaves
   every EARLIER document permanently created. The test below proves the loop
   continues past a failure and tallies both outcomes — a transactional
   implementation that aborted on the first error would fail it.

   UNIT EVIDENCE ONLY: the RPC is mocked, so nothing here is server or
   persisted-TEST evidence for M13-70's live leg. */

const createSerfiyyatDocument = vi.fn()
const show = vi.fn()

vi.mock('../../api/serfiyyatDocuments.api', () => ({
  createSerfiyyatDocument: (...a: unknown[]) => createSerfiyyatDocument(...a),
}))
vi.mock('../../store/toast.store', () => ({
  useToastStore: (sel: (s: { show: typeof show }) => unknown) => sel({ show }),
}))

import { DocsImportPreviewDialog } from './DocsImportPreviewDialog'
import type { DocsImportGroup } from '../../lib/serfiyyatImport'

const group = (over: Partial<DocsImportGroup> = {}): DocsImportGroup => ({
  projectId: 'p1', projectName: 'Layihə A', kontragent: 'MMC', avto: '10-AA-123',
  kanal: 'Nağd', iv: '83951', date: '2026-09-11', note: '',
  lines: [{ code: '0000001', name: 'Sement M400', qty: 2, price: 5 }],
  ...over,
})

const onClose = vi.fn()
const onDone = vi.fn()

beforeEach(() => {
  vi.clearAllMocks()
  createSerfiyyatDocument.mockResolvedValue({ ok: true, data: { doc_num: 'SM-1' }, error: null })
})

describe('the preview — M13-69 (nothing is written silently)', () => {
  it('summarises the group and line counts', () => {
    render(
      <DocsImportPreviewDialog
        groups={[group(), group({ projectName: 'Layihə B', date: '2026-09-12' })]}
        errors={[]} onClose={onClose} onDone={onDone}
      />,
    )
    expect(screen.getByTestId('sm-import-summary').textContent)
      .toContain('2 sənəd yaradılacaq, 2 sətir.')
  })

  it('lists every group with the eight preview columns', () => {
    render(<DocsImportPreviewDialog groups={[group()]} errors={[]} onClose={onClose} onDone={onDone} />)
    const headers = within(screen.getByTestId('sm-import-groups')).getAllByRole('columnheader')
    expect(headers.map((h) => h.textContent)).toEqual([
      'Layihə', 'Tarix', 'Kontragent', 'Avtomobil', 'Kanal', 'Qaimə №', 'Sətir', 'Cəm',
    ])
  })

  it('lists every rejected row', () => {
    render(
      <DocsImportPreviewDialog
        groups={[group()]} errors={['Sətir 3: mal tapılmadı: "Yox"']}
        onClose={onClose} onDone={onDone}
      />,
    )
    expect(screen.getByTestId('sm-import-errors').textContent).toContain('Sətir 3: mal tapılmadı')
    expect(screen.getByTestId('sm-import-summary').textContent).toContain('1 sətir rədd edildi')
  })

  /* M13-69 — DISABLED when no group parsed. */
  it('DISABLES the confirm button when no group parsed', () => {
    render(<DocsImportPreviewDialog groups={[]} errors={['bad']} onClose={onClose} onDone={onDone} />)
    expect((screen.getByTestId('sm-import-go') as HTMLButtonElement).disabled).toBe(true)
  })

  it('enables it when at least one group parsed (positive control)', () => {
    render(<DocsImportPreviewDialog groups={[group()]} errors={[]} onClose={onClose} onDone={onDone} />)
    expect((screen.getByTestId('sm-import-go') as HTMLButtonElement).disabled).toBe(false)
  })

  it('writes NOTHING until the confirm button is pressed', () => {
    render(<DocsImportPreviewDialog groups={[group()]} errors={[]} onClose={onClose} onDone={onDone} />)
    expect(createSerfiyyatDocument).not.toHaveBeenCalled()
  })

  it('«İmtina» closes without any call', () => {
    render(<DocsImportPreviewDialog groups={[group()]} errors={[]} onClose={onClose} onDone={onDone} />)
    fireEvent.click(screen.getByText('İmtina'))
    expect(createSerfiyyatDocument).not.toHaveBeenCalled()
    expect(onClose).toHaveBeenCalled()
  })
})

describe('confirming — ONE RPC PER GROUP, not atomic across them (M13-70, D-N3)', () => {
  it('issues exactly one create call per group, with that group’s header', async () => {
    const groups = [group(), group({ projectName: 'Layihə B', projectId: 'p2', date: '2026-09-12' })]
    render(<DocsImportPreviewDialog groups={groups} errors={[]} onClose={onClose} onDone={onDone} />)
    await act(async () => { fireEvent.click(screen.getByTestId('sm-import-go')) })

    expect(createSerfiyyatDocument).toHaveBeenCalledTimes(2)
    expect(createSerfiyyatDocument.mock.calls[0][0]).toMatchObject({ projectId: 'p1', docDate: '2026-09-11' })
    expect(createSerfiyyatDocument.mock.calls[1][0]).toMatchObject({ projectId: 'p2', docDate: '2026-09-12' })
    expect(show).toHaveBeenCalledWith('2 sənəd yaradıldı', false)
  })

  /* THE LOAD-BEARING CASE. Group 2 fails; groups 1 and 3 must still be
     created. An implementation that stopped at the first failure — or that
     rolled the earlier ones back — would fail here. */
  it('CONTINUES past a mid-loop failure, leaving earlier documents created', async () => {
    createSerfiyyatDocument
      .mockResolvedValueOnce({ ok: true, data: { doc_num: 'SM-1' }, error: null })
      .mockResolvedValueOnce({ ok: false, data: null, error: 'Layihə tapılmadı və ya deaktivdir' })
      .mockResolvedValueOnce({ ok: true, data: { doc_num: 'SM-3' }, error: null })

    const groups = [
      group({ projectName: 'A', date: '2026-09-11' }),
      group({ projectName: 'B', date: '2026-09-12' }),
      group({ projectName: 'C', date: '2026-09-13' }),
    ]
    render(<DocsImportPreviewDialog groups={groups} errors={[]} onClose={onClose} onDone={onDone} />)
    await act(async () => { fireEvent.click(screen.getByTestId('sm-import-go')) })

    /* All three were attempted — the loop did not abort. */
    expect(createSerfiyyatDocument).toHaveBeenCalledTimes(3)
    /* Both outcomes tallied, exactly as legacy words it. */
    expect(show).toHaveBeenCalledWith('2 sənəd yaradıldı, 1 xəta ilə (konsola bax)', true)
  })

  it('tallies every failure when all groups fail', async () => {
    createSerfiyyatDocument.mockResolvedValue({ ok: false, data: null, error: 'boom' })
    render(
      <DocsImportPreviewDialog
        groups={[group(), group({ date: '2026-09-12' })]} errors={[]}
        onClose={onClose} onDone={onDone}
      />,
    )
    await act(async () => { fireEvent.click(screen.getByTestId('sm-import-go')) })
    expect(show).toHaveBeenCalledWith('0 sənəd yaradıldı, 2 xəta ilə (konsola bax)', true)
  })

  it('sends each group’s lines as {code, qty, price}', async () => {
    render(<DocsImportPreviewDialog groups={[group()]} errors={[]} onClose={onClose} onDone={onDone} />)
    await act(async () => { fireEvent.click(screen.getByTestId('sm-import-go')) })
    const { lines } = createSerfiyyatDocument.mock.calls[0][0] as { lines: object[] }
    expect(lines).toEqual([{ code: '0000001', qty: 2, price: 5 }])
  })

  it('reloads through onDone after the loop finishes', async () => {
    render(<DocsImportPreviewDialog groups={[group()]} errors={[]} onClose={onClose} onDone={onDone} />)
    await act(async () => { fireEvent.click(screen.getByTestId('sm-import-go')) })
    expect(onDone).toHaveBeenCalled()
  })

  /* D-N3 must be STATED in the UI, not merely preserved in code. */
  it('states the non-atomicity in the dialog when more than one group parsed', () => {
    render(
      <DocsImportPreviewDialog
        groups={[group(), group({ date: '2026-09-12' })]} errors={[]}
        onClose={onClose} onDone={onDone}
      />,
    )
    expect(screen.getByTestId('sm-import-atomicity').textContent)
      .toContain('ortada xəta olsa, ondan əvvəlkilər yaradılmış qalır')
  })
})
