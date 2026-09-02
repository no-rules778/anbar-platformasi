import { useCallback, useEffect, useState } from 'react'
import { DEVICE_ID, endOtherSessions, endSession, listMySessions, type SessionDevice } from '../api/session.api'
import { rememberOn } from '../api/supabase'
import { ROLES, ROLE_PERMS, effectiveRole, type Me } from '../lib/roles'
import { deviceLabel, formatLastSeen, formatSince, isCurrentDevice, shortDeviceId } from '../lib/sessionDevices'
import { Dialog } from './ui/Dialog'
import { Button } from './ui/Button'
import { useToastStore } from '../store/toast.store'

interface Props {
  me: Me
  onLogout: () => void
  onChangePassword: () => void
  onClose: () => void
}

/* Ported from index.html sessionDialog() (7422-7449) and loadSessionDevices()
   (7452-7478). Shows who is signed in, what they may do, whether this device is
   remembered, and the account's active devices — with the ability to close the
   others. Without this window a user has no way to sign out at all. */
export function SessionDialog({ me, onLogout, onChangePassword, onClose }: Props) {
  const [devices, setDevices] = useState<SessionDevice[] | null>(null)
  const [limit, setLimit] = useState<number | null>(null)
  const [unavailable, setUnavailable] = useState(false)
  const [busy, setBusy] = useState(false)
  const show = useToastStore((s) => s.show)

  const loadDevices = useCallback(async () => {
    try {
      const info = await listMySessions()
      setDevices(info?.devices ?? [])
      setLimit(info?.limit ?? null)
      setUnavailable(false)
    } catch {
      /* SQL 026 not applied — the original degrades to a hint, not an error. */
      setUnavailable(true)
      setDevices([])
    }
  }, [])

  useEffect(() => { loadDevices() }, [loadDevices])

  async function closeOthers() {
    setBusy(true)
    const { error } = await endOtherSessions()
    setBusy(false)
    if (error) return show('Alınmadı: ' + (error.message || 'server xətası'), true)
    show('Digər cihazlardakı sessiyalar bağlandı')
    loadDevices()
  }

  async function closeOne(deviceId: string) {
    setBusy(true)
    const { error } = await endSession(deviceId)
    setBusy(false)
    if (error) return show('Alınmadı: ' + (error.message || 'server xətası'), true)
    show('Sessiya bağlandı')
    loadDevices()
  }

  const perms = ROLE_PERMS[effectiveRole(me.role)] ?? []
  const roleLabel = ROLES[me.role ?? ''] ? ROLES[me.role ?? ''].name : me.role

  return (
    <Dialog
      title="Sessiya"
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onChangePassword}>Şifrəni dəyiş</Button>
          <div className="flex-1" />
          <Button variant="secondary" disabled={busy} onClick={onLogout}>Çıxış</Button>
          <Button onClick={onClose}>Bağla</Button>
        </>
      }
    >
      <p className="text-sm">
        <b>{me.name}</b> · {roleLabel} · {me.wh || 'bütün anbarlar'}
      </p>
      <p className="text-xs text-slate-500">{me.email}</p>
      <p className="mt-1 text-xs text-slate-500">
        Səlahiyyətləriniz: {perms.length ? perms.join(', ') : 'yalnız baxış'}.
      </p>
      <p className="text-xs text-slate-500">
        Bu cihazda yadda saxlanılıb: <b>{rememberOn() ? 'bəli' : 'xeyr'}</b>.
      </p>

      <div className="mt-4 rounded-md border border-slate-200">
        <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2">
          <h3 className="text-sm font-medium">Aktiv cihazlar</h3>
          {limit !== null && devices && (
            <span className="text-xs text-slate-500">{devices.length} / {limit} cihaz</span>
          )}
        </div>

        {unavailable ? (
          <p className="px-3 py-2 text-xs text-slate-500">
            Cihaz siyahısı əlçatmazdır. (SQL 026 tətbiq edilməyibsə bu normaldır.)
          </p>
        ) : devices === null ? (
          <p className="px-3 py-2 text-xs text-slate-500">Yüklənir…</p>
        ) : devices.length === 0 ? (
          <p className="px-3 py-2 text-xs text-slate-500">Aktiv cihaz yoxdur.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {devices.map((d) => (
              <li key={d.device_id} className="flex items-center justify-between gap-2 px-3 py-2">
                <div className="min-w-0">
                  <div className="truncate text-sm">
                    {deviceLabel(d)}
                    {isCurrentDevice(d, DEVICE_ID) && (
                      <span className="ml-2 rounded bg-emerald-50 px-1.5 py-0.5 text-xs text-emerald-700">bu cihaz</span>
                    )}
                  </div>
                  <div className="text-xs text-slate-500">
                    <span className="font-mono">{shortDeviceId(d.device_id)}</span>
                    {' · '}{formatSince(d.since)}{' · '}{formatLastSeen(d.last_seen)}
                  </div>
                </div>
                {!isCurrentDevice(d, DEVICE_ID) && (
                  <Button variant="danger" disabled={busy} onClick={() => closeOne(d.device_id)}>Bağla</Button>
                )}
              </li>
            ))}
          </ul>
        )}

        <div className="border-t border-slate-100 px-3 py-2">
          <Button
            variant="danger"
            disabled={busy || unavailable || !devices || devices.length < 2}
            onClick={closeOthers}
          >
            Digər cihazları bağla
          </Button>
          <span className="ml-2 text-xs text-slate-500">
            Tanımadığınız cihaz görürsünüzsə, onu bağlayın və şifrəni dəyişin.
          </span>
        </div>
      </div>
    </Dialog>
  )
}
