import { useCallback, useEffect, useState } from 'react'
import { DEVICE_ID, endOtherSessions, endSession, listMySessions, type MySessionsResult, type SessionDevice } from '../api/session.api'
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

  const applyInfo = useCallback((info: MySessionsResult | null) => {
    setDevices(info?.devices ?? [])
    setLimit(info?.limit ?? null)
    setUnavailable(false)
  }, [])

  /* SQL 026 not applied — the original degrades to a hint, not an error. */
  const applyUnavailable = useCallback(() => {
    setUnavailable(true)
    setDevices([])
  }, [])

  const loadDevices = useCallback(async () => {
    try {
      applyInfo(await listMySessions())
    } catch {
      applyUnavailable()
    }
  }, [applyInfo, applyUnavailable])

  useEffect(() => {
    let alive = true
    void listMySessions()
      .then((info) => { if (alive) applyInfo(info) })
      .catch(() => { if (alive) applyUnavailable() })
    return () => { alive = false }
  }, [applyInfo, applyUnavailable])

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
          <div className="sp" style={{ flex: 1 }} />
          <Button variant="secondary" disabled={busy} onClick={onLogout}>Çıxış</Button>
          <Button onClick={onClose}>Bağla</Button>
        </>
      }
    >
      <p>
        <b>{me.name}</b> · {roleLabel} · {me.wh || 'bütün anbarlar'}
      </p>
      <p className="hint">{me.email}</p>
      <p className="hint">
        Səlahiyyətləriniz: {perms.length ? perms.join(', ') : 'yalnız baxış'}.
      </p>
      <p className="hint">
        Bu cihazda yadda saxlanılıb: <b>{rememberOn() ? 'bəli' : 'xeyr'}</b>.
      </p>

      <div className="card" style={{ marginTop: 12 }}>
        <header>
          <h3>Aktiv cihazlar</h3>
          <div className="sp" />
          {limit !== null && devices && (
            <span className="hint">{devices.length} / {limit} cihaz</span>
          )}
        </header>

        {unavailable ? (
          <p className="pad hint">
            Cihaz siyahısı əlçatmazdır. (SQL 026 tətbiq edilməyibsə bu normaldır.)
          </p>
        ) : devices === null ? (
          <p className="pad hint">Yüklənir…</p>
        ) : devices.length === 0 ? (
          <p className="pad hint">Aktiv cihaz yoxdur.</p>
        ) : (
          <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {devices.map((d) => (
              <li key={d.device_id} className="pad" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, borderTop: '1px solid var(--line-2)' }}>
                <div className="min-w-0">
                  <div>
                    {deviceLabel(d)}
                    {isCurrentDevice(d, DEVICE_ID) && (
                      <span className="tag t-in" style={{ marginLeft: 8 }}>bu cihaz</span>
                    )}
                  </div>
                  <div className="hint">
                    <span className="code">{shortDeviceId(d.device_id)}</span>
                    {' · '}{formatSince(d.since)}{' · '}{formatLastSeen(d.last_seen)}
                  </div>
                </div>
                {!isCurrentDevice(d, DEVICE_ID) && (
                  <Button variant="danger" size="sm" disabled={busy} onClick={() => closeOne(d.device_id)}>Bağla</Button>
                )}
              </li>
            ))}
          </ul>
        )}

        <div className="pad" style={{ borderTop: '1px solid var(--line-2)' }}>
          <Button
            variant="danger"
            disabled={busy || unavailable || !devices || devices.length < 2}
            onClick={closeOthers}
          >
            Digər cihazları bağla
          </Button>
          <span className="hint" style={{ marginLeft: 8 }}>
            Tanımadığınız cihaz görürsünüzsə, onu bağlayın və şifrəni dəyişin.
          </span>
        </div>
      </div>
    </Dialog>
  )
}
