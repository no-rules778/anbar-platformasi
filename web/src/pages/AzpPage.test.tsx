import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

/* Azpetrol / Araz — the page rows of Module T (Phase 17).

   THE SNAPSHOT READ IS MOCKED and the workbook WRITER is mocked. This suite
   performs no network call, touches no live data and writes no file.

   WHAT IT CANNOT PROVE (protocol §7, ledger M17-17…M17-21). Every role
   assertion below is a BROWSER AFFORDANCE — what renders, never what the
   server permits. The authority is `azp_user_role()`, `azp_can_read()` and
   the RLS SELECT policies, all BLOCKED and unsatisfiable by any test here.
   A hidden control is not a permission. */

const fetchAzpSnapshot = vi.fn()
vi.mock('../api/azpSnapshot.api', () => ({
  fetchAzpSnapshot: (m: string) => fetchAzpSnapshot(m),
}))

/* Only the WRITER is replaced; `azpReportRows()` and the report model run for
   real, so what is asserted is the real matrix reaching a real writer call. */
const azpReportExport = vi.fn((_rep: { module: string; mode: string }, _day?: string) => ({
  fileName: 'Azpetrol_hesabat_2026-09-12.xlsx',
  sheetName: 'Qrup hesabatı',
  rows: [] as unknown[][],
}))
vi.mock('../lib/azpReportExport', () => ({
  azpReportExport: (rep: { module: string; mode: string }, day?: string) =>
    azpReportExport(rep, day),
}))

import { AzpPage } from './AzpPage'
import { useAzpStore, __resetAzpRequestSeq } from '../store/azp.store'
import { useToastStore } from '../store/toast.store'
import { nf } from '../lib/format'
import type { Me } from '../lib/roles'

const ME_ID = '11111111-1111-4111-8111-111111111111'
const me = (role: string): Me => ({
  id: ME_ID, sbId: ME_ID, email: 'a@example.com', name: 'Anar İbrahimov', role, wh: 'Ələt',
})

const card = (over: Record<string, unknown> = {}) => ({
  card_id: 'c1', card_no: '0012', holder: 'Anar', project: 'L1', module: 'azpetrol',
  active: true, sort_order: 1, balance: 10, medaxil_total: 30, mexaric_total: 20, mov_count: 2,
  ...over,
})

const mov = (over: Record<string, unknown> = {}) => ({
  id: 5, module: 'azpetrol', card_id: 'c1', kind: 'medaxil', amount: 30,
  op_date: '2026-09-01', doc_num: 'Q-1', note: 'qeyd', cancelled: false,
  cancel_reason: null, vat_included: false, replaces_id: null, replaced_by: null,
  created_by: 'anar', created_at: '2026-09-01T10:00:00Z', app_balance_effect: true,
  cancelled_at: null, cancelled_by: null,
  ...over,
})

const log = (over: Record<string, unknown> = {}) => ({
  id: 9, module: 'azpetrol', entity: 'card', action: 'create',
  detail: { card_no: '0012' }, at: '2026-09-01T10:00:00Z', actor: 'anar', entity_id: 'c1',
  ...over,
})

function snapshot(over: Record<string, unknown> = {}) {
  return {
    ok: true as const,
    snapshot: { cards: [card()], movs: [mov()], log: [log()], appBalance: 500, ...over },
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  __resetAzpRequestSeq()
  useAzpStore.getState().reset()
  useToastStore.setState({ messages: [] })
  fetchAzpSnapshot.mockResolvedValue(snapshot())
})

const renderPage = (role = 'admin') => render(<AzpPage me={me(role)} />)

/** Waits until the board has applied its snapshot. */
async function loaded() {
  await waitFor(() => expect(useAzpStore.getState().data.azpetrol.ready).toBe(true))
}

/* ------------------------------------------------------------- the gate */

describe('the access gate is a browser affordance (M17-07, M17-08)', () => {
  it('shows the exact refusal for an anbardar and loads nothing', async () => {
    renderPage('anbardar')
    expect(screen.getByText('Giriş yoxdur')).toBeTruthy()
    expect(
      screen.getByText('Bu modul yalnız Admin, Rəhbər və Mühasib üçün açıqdır.'),
    ).toBeTruthy()
    /* A refused role issues NO read — the gate is checked before the load. */
    expect(fetchAzpSnapshot).not.toHaveBeenCalled()
  })

  it('refuses an unknown role too — fail-closed', () => {
    renderPage('nobody')
    expect(screen.getByText('Giriş yoxdur')).toBeTruthy()
    expect(fetchAzpSnapshot).not.toHaveBeenCalled()
  })

  it('hides the board body entirely for a refused role', () => {
    const { container } = renderPage('anbardar')
    expect(container.querySelector('#azp-body')).toBeNull()
    expect(container.querySelector('#azp-switch')).toBeNull()
  })

  /* The four read roles and admin all reach the board (M17-11…M17-13). */
  for (const role of ['admin', 'rehber', 'muhasib', 'techizat', 'baxis']) {
    it(`opens the board for ${role}`, async () => {
      renderPage(role)
      await loaded()
      expect(screen.queryByText('Giriş yoxdur')).toBeNull()
      expect(fetchAzpSnapshot).toHaveBeenCalled()
    })
  }
})

/* ------------------------------------------------------- shell / switch */

describe('the shell and the board switch (M17-06, M17-09, M17-10)', () => {
  it('carries the #p-azp scope the 27 CSS rules depend on (M17-101)', async () => {
    const { container } = renderPage()
    await loaded()
    expect(container.querySelector('#p-azp')).toBeTruthy()
  })

  it('names the SELECTED board in the subtitle', async () => {
    const { container } = renderPage()
    await loaded()
    expect(container.querySelector('#azp-sub')?.textContent)
      .toBe('Azpetrol — yanacaq kartlarının uçotu (ANBAR-dan tam ayrı modul)')
  })

  it('starts on Azpetrol, with exactly one board carrying `on`', async () => {
    const { container } = renderPage()
    await loaded()
    expect(container.querySelector('#azp-board-azpetrol')?.className).toContain('on')
    expect(container.querySelector('#azp-board-araz')?.className).not.toContain('on')
  })

  it('switches to Araz and loads THAT board separately', async () => {
    const { container } = renderPage()
    await loaded()
    await userEvent.click(screen.getByRole('button', { name: 'Araz' }))
    await waitFor(() => expect(useAzpStore.getState().board).toBe('araz'))
    expect(fetchAzpSnapshot).toHaveBeenCalledWith('araz')
    expect(container.querySelector('#azp-board-araz')?.className).toContain('on')
    expect(container.querySelector('#azp-board-azpetrol')?.className).not.toContain('on')
  })

  it('a late reply for the previous board cannot steal the active board (M17-27)', async () => {
    let resolveAzpetrol!: (value: ReturnType<typeof snapshot>) => void
    fetchAzpSnapshot
      .mockReturnValueOnce(new Promise((r) => { resolveAzpetrol = r }))
      .mockResolvedValueOnce(snapshot({ cards: [card({ module: 'araz' })] }))

    const { container } = renderPage()
    await waitFor(() => expect(fetchAzpSnapshot).toHaveBeenCalledTimes(1))
    await userEvent.click(screen.getByRole('button', { name: 'Araz' }))
    await waitFor(() => expect(useAzpStore.getState().data.araz.ready).toBe(true))

    resolveAzpetrol(snapshot())
    await waitFor(() => expect(useAzpStore.getState().data.azpetrol.ready).toBe(true))
    expect(useAzpStore.getState().board).toBe('araz')
    expect(container.querySelector('#azp-sub')?.textContent).toMatch(/^Araz —/)
    expect(container.querySelectorAll('.azp-board.on')).toHaveLength(1)
    expect(container.querySelector('#azp-board-araz')?.className).toContain('on')
  })

  it('renders the Araz VAT tag only on the Araz board', async () => {
    const { container } = renderPage()
    await loaded()
    const azpetrol = container.querySelector('#azp-board-azpetrol')!
    const araz = container.querySelector('#azp-board-araz')!
    expect(within(azpetrol as HTMLElement).queryByText('ƏDV DAXİL')).toBeNull()
    expect(within(araz as HTMLElement).getByText('ƏDV DAXİL')).toBeTruthy()
  })
})

/* ------------------------------------------------------------------ KPIs */

describe('the KPI row (M17-64, M17-65, M17-66)', () => {
  it('aggregates ACTIVE cards while the subtitle names the FULL count', async () => {
    fetchAzpSnapshot.mockResolvedValue(snapshot({
      cards: [
        card({ card_id: 'c1', medaxil_total: 30, mexaric_total: 20, balance: 10 }),
        card({ card_id: 'c2', active: false, medaxil_total: 500, mexaric_total: 0, balance: 500 }),
      ],
    }))
    const { container } = renderPage()
    await loaded()
    const kpis = container.querySelector('#azp-kpi-azpetrol')!
    /* index.html:8258 — the VALUE is the active count, the SUBTITLE is the
       FULL card count: `['Aktiv kart', nf(act.length), st.cards.length + '
       kartdan']`. So one active card out of two reads «2 kartdan», not
       «1 kartdan». An earlier draft of this test asserted the latter, from a
       misreading of the tile rather than from the source. */
    expect(within(kpis as HTMLElement).getByText('2 kartdan')).toBeTruthy()
    /* The inactive card's 500 is excluded from the totals. */
    expect(within(kpis as HTMLElement).getByText('30,00 ₼')).toBeTruthy()
    expect(within(kpis as HTMLElement).getByText('20,00 ₼')).toBeTruthy()
  })

  it('adds the sixth «Mənfi balans» tile only when an active card is negative', async () => {
    const { container } = renderPage()
    await loaded()
    expect(within(container.querySelector('#azp-kpi-azpetrol') as HTMLElement)
      .queryByText('Mənfi balans')).toBeNull()

    useAzpStore.setState((s) => ({
      data: { ...s.data, azpetrol: { ...s.data.azpetrol, cards: [card({ balance: -5 })] } },
    }))
    await waitFor(() =>
      expect(within(container.querySelector('#azp-kpi-azpetrol') as HTMLElement)
        .getByText('Mənfi balans')).toBeTruthy())
  })

  it('shows the application balance from the snapshot', async () => {
    const { container } = renderPage()
    await loaded()
    const kpis = container.querySelector('#azp-kpi-azpetrol') as HTMLElement
    expect(within(kpis).getByText('Tətbiqin cari balansı')).toBeTruthy()
    expect(within(kpis).getByText('500,00 ₼')).toBeTruthy()
  })

  /* azpMoney renders a real zero, unlike the shared money() em-dash — the
     difference the pure-slice audit pinned. A card with no movements must
     read 0,00 ₼. */
  it('renders a zero balance as «0,00 ₼», not an em-dash', async () => {
    fetchAzpSnapshot.mockResolvedValue(snapshot({
      cards: [card({ medaxil_total: 0, mexaric_total: 0, balance: 0 })], movs: [], appBalance: 0,
    }))
    const { container } = renderPage()
    await loaded()
    expect(within(container.querySelector('#azp-kpi-azpetrol') as HTMLElement)
      .getAllByText('0,00 ₼').length).toBeGreaterThan(0)
  })
})

/* ------------------------------------------------------------ card table */

describe('the card table (M17-68, M17-69, M17-79)', () => {
  it('shows the exact loading state while the first snapshot is pending (M17-79)', async () => {
    let resolve!: (value: ReturnType<typeof snapshot>) => void
    fetchAzpSnapshot.mockReturnValueOnce(new Promise((r) => { resolve = r }))
    const { container } = renderPage()
    await waitFor(() =>
      expect(within(container.querySelector('#azp-cards-azpetrol') as HTMLElement)
        .getByText('Yüklənir…')).toBeTruthy())
    resolve(snapshot())
    await loaded()
  })

  it('renders the module cardHead and the tfoot totals', async () => {
    const { container } = renderPage()
    await loaded()
    const cards = container.querySelector('#azp-cards-azpetrol') as HTMLElement
    expect(within(cards).getByText('Sahib / Layihə')).toBeTruthy()
    expect(within(cards).getByText('Kartların balansı')).toBeTruthy()
  })

  it('marks a negative card balance with `neg`', async () => {
    fetchAzpSnapshot.mockResolvedValue(snapshot({ cards: [card({ balance: -5 })] }))
    const { container } = renderPage()
    await loaded()
    /* Scoped to the ROW: the tfoot total carries the same text, so an
       unscoped query legitimately finds two. */
    const row = within(container.querySelector('#azp-cards-azpetrol') as HTMLElement)
      .getByText('0012').closest('tr') as HTMLElement
    const cell = within(row).getByText('-5,00 ₼')
    expect(cell.className).toContain('neg')
  })

  it('renders aktiv/deaktiv status tags', async () => {
    fetchAzpSnapshot.mockResolvedValue(snapshot({
      cards: [card({ card_id: 'c1' }), card({ card_id: 'c2', active: false })],
    }))
    const { container } = renderPage()
    await loaded()
    const cards = container.querySelector('#azp-cards-azpetrol') as HTMLElement
    expect(within(cards).getByText('aktiv')).toBeTruthy()
    expect(within(cards).getByText('deaktiv')).toBeTruthy()
  })

  it('shows the empty-card state, worded per role', async () => {
    fetchAzpSnapshot.mockResolvedValue(snapshot({ cards: [], movs: [], log: [] }))
    const { container, unmount } = renderPage('admin')
    await loaded()
    expect(within(container.querySelector('#azp-cards-azpetrol') as HTMLElement)
      .getByText('“+ Kart” düyməsi ilə ilk kartı əlavə edin.')).toBeTruthy()
    unmount()

    useAzpStore.getState().reset()
    const r2 = renderPage('rehber')
    await loaded()
    expect(within(r2.container.querySelector('#azp-cards-azpetrol') as HTMLElement)
      .getByText('Admin hələ kart əlavə etməyib.')).toBeTruthy()
  })

  it('shows the exact module-unavailable state on a failed load (M17-79)', async () => {
    fetchAzpSnapshot.mockResolvedValue({ ok: false as const, error: 'permission denied' })
    renderPage()
    await waitFor(() =>
      expect(screen.getAllByText('Modul bazası əlçatan deyil').length).toBeGreaterThan(0))
    expect(screen.getAllByText(/sql\/020_azpetrol_module\.sql/).length).toBeGreaterThan(0)
  })
})

/* -------------------------------------------------------- movement table */

describe('the movement register (M17-71 … M17-74)', () => {
  it('renders a row through the SHARED filter', async () => {
    const { container } = renderPage()
    await loaded()
    const movs = container.querySelector('#azp-movs-azpetrol') as HTMLElement
    expect(within(movs).getByText('Q-1')).toBeTruthy()
    expect(within(movs).getByText('01.09.2026')).toBeTruthy()
  })

  it('announces rows hidden SOLELY for being undated (M17-71)', async () => {
    fetchAzpSnapshot.mockResolvedValue(snapshot({
      movs: [mov({ id: 1, op_date: '2026-09-01' }), mov({ id: 2, op_date: null })],
    }))
    const { container } = renderPage()
    await loaded()
    useAzpStore.getState().setFilter('azpetrol', { d1: '2026-09-01' })
    await waitFor(() =>
      expect(within(container.querySelector('#azp-movs-azpetrol') as HTMLElement)
        .getByText(/1 tarixsiz qeyd seçilmiş tarix aralığına daxil edilmədi/)).toBeTruthy())
  })

  it('shows no undated note when no date bound is set', async () => {
    fetchAzpSnapshot.mockResolvedValue(snapshot({ movs: [mov({ op_date: null })] }))
    const { container } = renderPage()
    await loaded()
    expect(within(container.querySelector('#azp-movs-azpetrol') as HTMLElement)
      .queryByText(/tarixsiz qeyd/)).toBeNull()
  })

  it('marks a cancelled row and excludes it from the totals (M17-72)', async () => {
    fetchAzpSnapshot.mockResolvedValue(snapshot({
      movs: [
        mov({ id: 1, kind: 'medaxil', amount: 30 }),
        mov({ id: 2, kind: 'medaxil', amount: 999, cancelled: true, note: null, cancel_reason: 'səhv' }),
      ],
    }))
    const { container } = renderPage()
    await loaded()
    const movs = container.querySelector('#azp-movs-azpetrol') as HTMLElement
    expect(within(movs).getByText('ləğv edilib')).toBeTruthy()
    /* The cancelled row's reason stands in for its missing note. */
    expect(within(movs).getByText('Ləğv səbəbi: səhv')).toBeTruthy()
    /* 2 rows shown, 1 counted. */
    expect(within(movs).getByText(/Cəmi \(ləğv edilməmiş\): 1 qeyd/)).toBeTruthy()
    expect(within(movs).getByText('Mədaxil 30,00 ₼ · Y/D 0,00 ₼')).toBeTruthy()
  })

  it('caps the table at 1000 rows and states the real count (M17-73)', async () => {
    const many = Array.from({ length: 1001 }, (_, i) => mov({ id: i + 1, doc_num: 'D' + (i + 1) }))
    fetchAzpSnapshot.mockResolvedValue(snapshot({ movs: many }))
    const { container } = renderPage()
    await loaded()
    const movs = container.querySelector('#azp-movs-azpetrol') as HTMLElement
    /* The separator is DERIVED from `nf()`, never guessed: az-AZ renders
       1001 as «1.001», and an earlier draft of this test hardcoded a space
       and failed. Deriving it means a locale change cannot silently break
       the assertion into a false pass either. */
    expect(within(movs).getByText(`İlk 1000 sətir göstərilir (${nf(1001)} uyğun qeyd). Filtri daraldın.`))
      .toBeTruthy()
    expect(movs.querySelectorAll('tbody tr').length).toBe(1000)
  })

  it('shows the empty-filter state when nothing matches', async () => {
    const { container } = renderPage()
    await loaded()
    useAzpStore.getState().setFilter('azpetrol', { q: 'yoxdur' })
    await waitFor(() =>
      expect(within(container.querySelector('#azp-movs-azpetrol') as HTMLElement)
        .getByText('Əməliyyat yoxdur')).toBeTruthy())
  })

  it('clears every filter with «Təmizlə»', async () => {
    renderPage()
    await loaded()
    useAzpStore.getState().setFilter('azpetrol', { q: 'abc', kind: 'medaxil', d1: '2026-01-01' })
    await userEvent.click(screen.getAllByRole('button', { name: 'Təmizlə' })[0])
    await waitFor(() => {
      const f = useAzpStore.getState().filter.azpetrol
      expect(f).toEqual({ card: '', kind: '', d1: '', d2: '', q: '' })
    })
  })
})

/* ------------------------------------------------------------- audit log */

describe('the module audit list (M17-75, M17-76)', () => {
  it('translates a known action and renders the detail as JSON', async () => {
    const { container } = renderPage()
    await loaded()
    const el = container.querySelector('#azp-log-azpetrol') as HTMLElement
    expect(within(el).getByText('Kart')).toBeTruthy()
    expect(within(el).getByText('yaradıldı')).toBeTruthy()
    expect(within(el).getByText('{"card_no":"0012"}')).toBeTruthy()
  })

  it('falls back to the RAW action code when unknown (M17-76)', async () => {
    fetchAzpSnapshot.mockResolvedValue(snapshot({ log: [log({ action: 'frobnicate' })] }))
    const { container } = renderPage()
    await loaded()
    expect(within(container.querySelector('#azp-log-azpetrol') as HTMLElement)
      .getByText('frobnicate')).toBeTruthy()
  })

  it('shows the empty state with no rows', async () => {
    fetchAzpSnapshot.mockResolvedValue(snapshot({ log: [] }))
    const { container } = renderPage()
    await loaded()
    expect(within(container.querySelector('#azp-log-azpetrol') as HTMLElement)
      .getByText('Hələ qeyd yoxdur.')).toBeTruthy()
  })
})

/* --------------------------------------------------------------- history */

describe('the card history (M17-77, M17-78)', () => {
  it('opens for a READ role, not only for admin', async () => {
    renderPage('rehber')
    await loaded()
    await userEvent.click(screen.getAllByRole('button', { name: 'Tarixçə' })[0])
    expect(await screen.findByRole('dialog', { name: /Tarixçə — 0012/ })).toBeTruthy()
  })

  it('sorts by date then id, through the shared filter', async () => {
    fetchAzpSnapshot.mockResolvedValue(snapshot({
      movs: [
        mov({ id: 3, op_date: '2026-09-02', doc_num: 'C' }),
        mov({ id: 1, op_date: '2026-09-01', doc_num: 'A' }),
        mov({ id: 2, op_date: '2026-09-01', doc_num: 'B' }),
      ],
    }))
    renderPage()
    await loaded()
    await userEvent.click(screen.getAllByRole('button', { name: 'Tarixçə' })[0])
    const dialog = await screen.findByRole('dialog')
    const codes = within(dialog).getAllByText(/^[ABC]$/).map((e) => e.textContent)
    expect(codes).toEqual(['A', 'B', 'C'])
  })

  it('shows the replacement linkage in both directions (M17-78)', async () => {
    fetchAzpSnapshot.mockResolvedValue(snapshot({
      movs: [
        mov({ id: 1, cancelled: true, cancel_reason: 'səhv', replaced_by: 2 }),
        mov({ id: 2, replaces_id: 1 }),
      ],
    }))
    renderPage()
    await loaded()
    await userEvent.click(screen.getAllByRole('button', { name: 'Tarixçə' })[0])
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByText('əvəz: #2')).toBeTruthy()
    expect(within(dialog).getByText('düzəliş: #1')).toBeTruthy()
    expect(within(dialog).getByText('səhv')).toBeTruthy()
  })

  it('states that cancelled rows are shown but not counted', async () => {
    fetchAzpSnapshot.mockResolvedValue(snapshot({
      movs: [mov({ id: 1, amount: 30 }), mov({ id: 2, amount: 999, cancelled: true })],
    }))
    renderPage()
    await loaded()
    await userEvent.click(screen.getAllByRole('button', { name: 'Tarixçə' })[0])
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByText(/Cəmi \(ləğv edilməmiş 1 qeyd\)/)).toBeTruthy()
    expect(within(dialog).getByText(/1 ləğv edilmiş sətir cəmlərə daxil deyil/)).toBeTruthy()
  })
})

/* ---------------------------------------------------------------- report */

describe('the report (M17-52, M17-53, M17-56, M17-63)', () => {
  it('opens for a READ role — legacy leaves «Hesabat» visible to them', async () => {
    renderPage('muhasib')
    await loaded()
    await userEvent.click(screen.getAllByRole('button', { name: 'Hesabat' })[0])
    expect(await screen.findByRole('dialog', { name: 'Hesabat — Azpetrol' })).toBeTruthy()
  })

  it('covers ACTIVE cards when nothing is selected (M17-52)', async () => {
    fetchAzpSnapshot.mockResolvedValue(snapshot({
      cards: [card({ card_id: 'c1' }), card({ card_id: 'c2', card_no: '0099', active: false })],
    }))
    renderPage()
    await loaded()
    await userEvent.click(screen.getAllByRole('button', { name: 'Hesabat' })[0])
    const dialog = await screen.findByRole('dialog')
    const body = dialog.querySelector('#azp-r-body') as HTMLElement
    expect(within(body).getByText('1 kart', { exact: false })).toBeTruthy()
    /* The inactive card is offered for SELECTION but is not in the default
       report body. */
    expect(within(body).queryByText('0099')).toBeNull()
  })

  it('delegates the export to the SEPARATE plain writer and toasts (M17-63)', async () => {
    renderPage()
    await loaded()
    await userEvent.click(screen.getAllByRole('button', { name: 'Hesabat' })[0])
    await userEvent.click(await screen.findByRole('button', { name: 'Excel-ə ixrac' }))
    expect(azpReportExport).toHaveBeenCalledTimes(1)
    /* The model handed to the writer is the one the screen rendered. */
    const rep = azpReportExport.mock.calls[0][0]
    expect(rep.module).toBe('azpetrol')
    expect(rep.mode).toBe('group')
    await waitFor(() =>
      expect(useToastStore.getState().messages.map((t) => t.text))
        .toContain('Azpetrol_hesabat_2026-09-12.xlsx yükləndi'))
  })
})

/* ----------------------------------------------- the Phase 17 boundaries */

/* SUPERSEDED. The four assertions that stood here required «+ Kart»,
   «+ Əməliyyat», the quick row buttons and «✎ Düzəliş» to be ABSENT for every
   role. That was true of the read-only slice, but it is NOT the contract:
   M17-15, M17-67 and M17-70 specify those controls as ADMIN-ONLY, not as
   missing. They are now asserted by role below, which is the row.

   The boundary they were really protecting still holds and is asserted
   explicitly: no live write is performed (D-T1). */

describe('admin-only toolbar controls — M17-15', () => {
  /* The three `azpSyncButtons()` governs, for an admin. */
  for (const label of ['+ Kart', '+ Əməliyyat', 'Excel idxalı']) {
    it(`shows «${label}» to an admin`, async () => {
      renderPage('admin')
      await loaded()
      expect(screen.getAllByRole('button', { name: label }).length).toBeGreaterThan(0)
    })

    it(`hides «${label}» from a read role`, async () => {
      renderPage('rehber')
      await loaded()
      expect(screen.queryByRole('button', { name: label })).toBeNull()
    })
  }

  /* THE load-bearing half of M17-15: `azpSyncButtons()` names exactly those
     three, so «Hesabat» is NOT hidden. A read role keeps the report — taking
     it away would leave the module's read users with nothing to do. */
  it('keeps «Hesabat» visible for a read role', async () => {
    renderPage('rehber')
    await loaded()
    expect(screen.getAllByRole('button', { name: 'Hesabat' }).length).toBeGreaterThan(0)
  })
})

describe('admin-only card row controls — M17-70', () => {
  /* Scoped to the AZPETROL board: both boards render, so the fixture card
     number appears twice in the document. */
  const row = (container: HTMLElement) =>
    within(container.querySelector('#azp-cards-azpetrol') as HTMLElement)
      .getByText('0012').closest('tr') as HTMLElement

  it('shows the quick Mədaxil/Y-D buttons to an admin on an ACTIVE card', async () => {
    const { container } = renderPage('admin')
    await loaded()
    const r = row(container)
    expect(within(r).getByRole('button', { name: 'Mədaxil' })).toBeTruthy()
    expect(within(r).getByRole('button', { name: 'Y/D' })).toBeTruthy()
    expect(within(r).getByRole('button', { name: 'Redaktə' })).toBeTruthy()
  })

  it('hides them from a read role, keeping Tarixçə', async () => {
    const { container } = renderPage('rehber')
    await loaded()
    const r = row(container)
    expect(within(r).queryByRole('button', { name: 'Mədaxil' })).toBeNull()
    expect(within(r).queryByRole('button', { name: 'Y/D' })).toBeNull()
    expect(within(r).queryByRole('button', { name: 'Redaktə' })).toBeNull()
    /* Tarixçə is open to every READING role — legacy 8312. */
    expect(within(r).getByRole('button', { name: 'Tarixçə' })).toBeTruthy()
  })

  /* The second half of the row: admin AND ACTIVE. A deactivated card takes no
     new movements, so even an admin sees no quick buttons on one — but
     «Redaktə» and «Tarixçə» stay, which is what distinguishes this from the
     read-role case above. */
  it('hides the quick buttons on a DEACTIVATED card even for an admin', async () => {
    fetchAzpSnapshot.mockResolvedValue(snapshot({
      cards: [card({ card_id: 'c2', card_no: '0099', active: false })],
    }))
    const { container } = renderPage('admin')
    await loaded()
    const r = within(container.querySelector('#azp-cards-azpetrol') as HTMLElement)
      .getByText('0099').closest('tr') as HTMLElement
    expect(within(r).queryByRole('button', { name: 'Mədaxil' })).toBeNull()
    expect(within(r).queryByRole('button', { name: 'Y/D' })).toBeNull()
    expect(within(r).getByRole('button', { name: 'Tarixçə' })).toBeTruthy()
    expect(within(r).getByRole('button', { name: 'Redaktə' })).toBeTruthy()
  })
})

describe('application-balance edit button — M17-67', () => {
  it('shows the inline edit button to an admin', async () => {
    renderPage('admin')
    await loaded()
    expect(screen.getAllByRole('button', { name: '✎ Düzəliş' }).length).toBeGreaterThan(0)
  })

  it('hides it from a read role, which still SEES the balance', async () => {
    const { container } = renderPage('rehber')
    await loaded()
    expect(screen.queryByRole('button', { name: '✎ Düzəliş' })).toBeNull()
    /* The figure itself is not admin-gated — only the control is. */
    const kpi = container.querySelector('#azp-kpi-azpetrol') as HTMLElement
    expect(within(kpi).getByText('Tətbiqin cari balansı')).toBeTruthy()
  })

  /* The button sits INSIDE the application-balance tile, not loose in the
     KPI row — legacy 8262-8263 appends it to that eyebrow. */
  it('renders inside the application-balance tile', async () => {
    const { container } = renderPage('admin')
    await loaded()
    const tile = (container.querySelector('#azp-kpi-azpetrol') as HTMLElement)
      .querySelector('.kpi.app') as HTMLElement
    expect(within(tile).getByRole('button', { name: '✎ Düzəliş' })).toBeTruthy()
  })
})

/* ----------------------------------------------- the Phase 17 boundary */

describe('the write surfaces open but perform NO write (D-T1)', () => {
  /* The affordance and the admin gate are real; the write is not wired.
     Phase 17 executed zero azp writes. */
  it('opens an explicit not-yet-active surface instead of writing', async () => {
    renderPage('admin')
    await loaded()
    await userEvent.click(screen.getAllByRole('button', { name: '+ Kart' })[0])
    expect(await screen.findByText('Bu əməliyyat hələ aktiv deyil')).toBeTruthy()
  })

  it('names the surface per module and kind', async () => {
    renderPage('admin')
    await loaded()
    await userEvent.click(screen.getAllByRole('button', { name: 'Excel idxalı' })[0])
    expect(await screen.findByText('Excel idxalı — Azpetrol')).toBeTruthy()
  })

  /* No destructive control ships at all: there is no delete affordance on
     this screen in Phase 17, so `azp_delete_card` has no UI path (D-T3). */
  it('offers no delete control anywhere', async () => {
    renderPage('admin')
    await loaded()
    for (const label of ['Sil', 'Kartı sil', 'Ləğv et', 'Düzəliş et']) {
      expect(screen.queryByRole('button', { name: label })).toBeNull()
    }
  })
})
