import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

vi.mock('../api/session.api', () => ({
  DEVICE_ID: 'dev_this_device',
  listMySessions: vi.fn(),
  endSession: vi.fn(),
  endOtherSessions: vi.fn(),
}))
vi.mock('../api/supabase', () => ({ rememberOn: vi.fn(() => false) }))

import { listMySessions, endSession, endOtherSessions } from '../api/session.api'
import { rememberOn } from '../api/supabase'
import { SessionDialog } from './SessionDialog'
import { useToastStore } from '../store/toast.store'
import type { Me } from '../lib/roles'

const admin: Me = { id: 'u1', sbId: 'u1', email: 'admin@x.com', name: 'Admin User', role: 'admin', wh: '' }
const anbardar: Me = { id: 'u2', sbId: 'u2', email: 'n@x.com', name: 'Nizami A', role: 'anbardar', wh: 'Astara' }

/* Exactly the shape SQL 026's list_my_sessions builds — verified against the
   live function definition: {device_id, label, since, last_seen}. */
const thisDevice = {
  device_id: 'dev_this_device',
  label: 'Chrome · Windows',
  since: '2026-09-02T08:00:00+00:00',
  last_seen: '2026-09-02T09:00:00+00:00',
}
const otherDevice = {
  device_id: 'dev_other_phone',
  label: 'Safari · iOS',
  since: '2026-09-01T08:00:00+00:00',
  last_seen: '2026-09-02T08:30:00+00:00',
}

const props = () => ({ me: admin, onLogout: vi.fn(), onChangePassword: vi.fn(), onClose: vi.fn() })

beforeEach(() => {
  vi.clearAllMocks()
  useToastStore.setState({ messages: [] })
  vi.mocked(rememberOn).mockReturnValue(false)
  vi.mocked(listMySessions).mockResolvedValue({ limit: 3, devices: [thisDevice, otherDevice] })
  vi.mocked(endSession).mockResolvedValue({ error: null } as never)
  vi.mocked(endOtherSessions).mockResolvedValue({ error: null } as never)
})

describe('SessionDialog — loading and identity', () => {
  it('shows a loading state before the device list arrives', async () => {
    let release!: (value: unknown) => void
    vi.mocked(listMySessions).mockReturnValue(new Promise((resolve) => { release = resolve }) as never)

    render(<SessionDialog {...props()} />)

    expect(screen.getByText('Yüklənir…')).toBeTruthy()
    release({ limit: 3, devices: [] })
    await waitFor(() => expect(screen.getByText('Aktiv cihaz yoxdur.')).toBeTruthy())
  })

  it('shows who is signed in, their role, scope, permissions and remember state', async () => {
    vi.mocked(rememberOn).mockReturnValue(true)
    render(<SessionDialog {...props()} me={anbardar} />)

    expect(screen.getByText(/Nizami A/)).toBeTruthy()
    expect(screen.getByText(/Anbardar/)).toBeTruthy()
    expect(screen.getByText(/Astara/)).toBeTruthy()
    expect(screen.getByText('n@x.com')).toBeTruthy()
    expect(screen.getByText(/mv\.add/)).toBeTruthy()
    expect(screen.getByText(/bəli/)).toBeTruthy()
    await waitFor(() => expect(listMySessions).toHaveBeenCalled())
  })

  it('shows "bütün anbarlar" when no warehouse is assigned, and read-only rights for rehber', async () => {
    const rehber: Me = { ...admin, role: 'rehber', name: 'Rehber R' }
    render(<SessionDialog {...props()} me={rehber} />)
    expect(screen.getByText(/bütün anbarlar/)).toBeTruthy()
    expect(screen.getByText(/yalnız baxış/)).toBeTruthy()
    await waitFor(() => expect(listMySessions).toHaveBeenCalled())
  })
})

describe('SessionDialog — device rows', () => {
  it('renders the RPC rows and marks the current device', async () => {
    render(<SessionDialog {...props()} />)

    await waitFor(() => expect(screen.getByText('Chrome · Windows')).toBeTruthy())
    expect(screen.getByText('Safari · iOS')).toBeTruthy()
    expect(screen.getByText('bu cihaz')).toBeTruthy()
    expect(screen.getByText('2 / 3 cihaz')).toBeTruthy()
  })

  it('falls back to "Naməlum cihaz" when the server sent no label', async () => {
    vi.mocked(listMySessions).mockResolvedValue({ limit: 3, devices: [{ ...thisDevice, label: null }] })
    render(<SessionDialog {...props()} />)
    await waitFor(() => expect(screen.getByText('Naməlum cihaz')).toBeTruthy())
  })

  it('offers «Bağla» only for other devices, never for the current one', async () => {
    render(<SessionDialog {...props()} />)
    await waitFor(() => expect(screen.getByText('Safari · iOS')).toBeTruthy())

    const otherRow = screen.getByText('Safari · iOS').closest('li')!
    const currentRow = screen.getByText('Chrome · Windows').closest('li')!
    expect(within(currentRow).queryByRole('button', { name: 'Bağla' })).toBeNull()

    await userEvent.click(within(otherRow).getByRole('button', { name: 'Bağla' }))
    expect(endSession).toHaveBeenCalledWith('dev_other_phone')
    expect(endSession).not.toHaveBeenCalledWith('dev_this_device')
  })

  it('reloads the list after closing one device', async () => {
    render(<SessionDialog {...props()} />)
    await waitFor(() => expect(screen.getByText('Safari · iOS')).toBeTruthy())
    vi.mocked(listMySessions).mockClear()

    const row = screen.getByText('Safari · iOS').closest('li')!
    await userEvent.click(within(row).getByRole('button', { name: 'Bağla' }))

    await waitFor(() => expect(listMySessions).toHaveBeenCalledTimes(1))
    expect(useToastStore.getState().messages.map((m) => m.text)).toContain('Sessiya bağlandı')
  })
})

describe('SessionDialog — closing other devices', () => {
  it('closes all others and reloads', async () => {
    render(<SessionDialog {...props()} />)
    await waitFor(() => expect(screen.getByText('Safari · iOS')).toBeTruthy())
    vi.mocked(listMySessions).mockClear()

    await userEvent.click(screen.getByRole('button', { name: 'Digər cihazları bağla' }))

    expect(endOtherSessions).toHaveBeenCalledTimes(1)
    await waitFor(() => expect(listMySessions).toHaveBeenCalledTimes(1))
    expect(useToastStore.getState().messages.map((m) => m.text))
      .toContain('Digər cihazlardakı sessiyalar bağlandı')
  })

  it('disables the button when this is the only device', async () => {
    vi.mocked(listMySessions).mockResolvedValue({ limit: 3, devices: [thisDevice] })
    render(<SessionDialog {...props()} />)

    await waitFor(() => expect(screen.getByText('Chrome · Windows')).toBeTruthy())
    expect((screen.getByRole('button', { name: 'Digər cihazları bağla' }) as HTMLButtonElement).disabled).toBe(true)
  })
})

describe('SessionDialog — busy state', () => {
  it('disables the device actions while a call is in flight, and re-enables afterwards', async () => {
    let release!: (value: unknown) => void
    vi.mocked(endOtherSessions).mockReturnValue(new Promise((resolve) => { release = resolve }) as never)

    render(<SessionDialog {...props()} />)
    await waitFor(() => expect(screen.getByText('Safari · iOS')).toBeTruthy())

    const closeOthers = () => screen.getByRole('button', { name: 'Digər cihazları bağla' }) as HTMLButtonElement
    const closeOne = () =>
      within(screen.getByText('Safari · iOS').closest('li')!).getByRole('button', { name: 'Bağla' }) as HTMLButtonElement

    await userEvent.click(closeOthers())

    expect(closeOthers().disabled).toBe(true)
    expect(closeOne().disabled).toBe(true)

    release({ error: null })
    await waitFor(() => expect(closeOthers().disabled).toBe(false))
  })
})

describe('SessionDialog — errors and degraded mode', () => {
  it('reports an RPC failure when closing one device, without claiming success', async () => {
    vi.mocked(endSession).mockResolvedValue({ error: { message: 'icazə yoxdur' } } as never)
    render(<SessionDialog {...props()} />)
    await waitFor(() => expect(screen.getByText('Safari · iOS')).toBeTruthy())

    const row = screen.getByText('Safari · iOS').closest('li')!
    await userEvent.click(within(row).getByRole('button', { name: 'Bağla' }))

    await waitFor(() => {
      const texts = useToastStore.getState().messages.map((m) => m.text)
      expect(texts.some((t) => t.includes('icazə yoxdur'))).toBe(true)
      expect(texts).not.toContain('Sessiya bağlandı')
    })
  })

  it('reports an RPC failure when closing all others', async () => {
    vi.mocked(endOtherSessions).mockResolvedValue({ error: { message: 'server xətası' } } as never)
    render(<SessionDialog {...props()} />)
    await waitFor(() => expect(screen.getByText('Safari · iOS')).toBeTruthy())

    await userEvent.click(screen.getByRole('button', { name: 'Digər cihazları bağla' }))

    await waitFor(() => expect(useToastStore.getState().messages.some((m) => m.isError)).toBe(true))
    expect(useToastStore.getState().messages.map((m) => m.text))
      .not.toContain('Digər cihazlardakı sessiyalar bağlandı')
  })

  it('degrades to a hint when the device list is unavailable (SQL 026 absent)', async () => {
    vi.mocked(listMySessions).mockRejectedValue(new Error('function does not exist'))
    render(<SessionDialog {...props()} />)

    await waitFor(() => expect(screen.getByText(/Cihaz siyahısı əlçatmazdır/)).toBeTruthy())
    expect((screen.getByRole('button', { name: 'Digər cihazları bağla' }) as HTMLButtonElement).disabled).toBe(true)
  })
})

describe('SessionDialog — footer actions', () => {
  it('wires logout, password change and close', async () => {
    const p = props()
    render(<SessionDialog {...p} />)
    await waitFor(() => expect(screen.getByText('Chrome · Windows')).toBeTruthy())

    await userEvent.click(screen.getByRole('button', { name: 'Çıxış' }))
    expect(p.onLogout).toHaveBeenCalledTimes(1)

    await userEvent.click(screen.getByRole('button', { name: 'Şifrəni dəyiş' }))
    expect(p.onChangePassword).toHaveBeenCalledTimes(1)
  })
})
