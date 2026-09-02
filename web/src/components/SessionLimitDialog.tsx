import type { RegisterSessionResult } from '../api/session.api'
import { DEVICE_ID } from '../api/session.api'
import { deviceLabel, formatLastSeen, formatSince, isCurrentDevice, shortDeviceId } from '../lib/sessionDevices'
import { Button } from './ui/Button'

interface Props {
  info: RegisterSessionResult
  onClose: () => void
}

/* Ported from index.html sessionLimitDialog() (lines 7481-7492) + the device
   rows from sessionDeviceRows() (7364-7377). The original shows this window
   BEFORE the user is signed in, so it deliberately offers no "close this
   device" action — only information. */
export function SessionLimitDialog({ info, onClose }: Props) {
  const devices = info.devices ?? []
  return (
    <>
      <div className="mask" onClick={onClose} />
      <div className="modal" role="dialog" aria-label="Cihaz limiti doludur">
        <header><h3>Cihaz limiti doludur</h3><div className="sp" /></header>
        <div className="body">
                <p>
          Bu hesab üçün eyni vaxtda <b>{info.limit ?? 1}</b> cihaza icazə verilir və hazırda hamısı doludur.
          Aşağıdakı cihazlardan birində «Çıxış» edin və ya 3 dəqiqə gözləyin — fəaliyyəti dayanmış sessiya avtomatik boşalır.
        </p>
        <ul style={{ listStyle: 'none', margin: '12px 0', padding: 0 }}>
          {devices.map((d) => (
            <li key={d.device_id} className="card pad" style={{ marginBottom: 6 }}>
              <div>
                {deviceLabel(d)}
                {isCurrentDevice(d, DEVICE_ID) && (
                  <span className="tag t-in" style={{ marginLeft: 8 }}>bu cihaz</span>
                )}
              </div>
              <div className="hint">
                <span className="code">{shortDeviceId(d.device_id)}</span>
                {' · başlanğıc: '}{formatSince(d.since)}
                {' · son fəaliyyət: '}{formatLastSeen(d.last_seen)}
              </div>
            </li>
          ))}
          {devices.length === 0 && <li className="hint">Məlumat yoxdur.</li>}
        </ul>
        <p className="hint">
          Bu cihazları tanımırsınızsa, şifrənizi dəyişdirin və rəhbərə bildirin.
        </p>
        </div>
        <footer><Button onClick={onClose}>Bağla</Button></footer>
      </div>
    </>
  )
}
