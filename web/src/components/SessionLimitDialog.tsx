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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl">
        <h2 className="mb-3 text-lg font-semibold">Cihaz limiti doludur</h2>
        <p className="mb-4 text-sm text-slate-600">
          Bu hesab üçün eyni vaxtda <b>{info.limit ?? 1}</b> cihaza icazə verilir və hazırda hamısı doludur.
          Aşağıdakı cihazlardan birində «Çıxış» edin və ya 3 dəqiqə gözləyin — fəaliyyəti dayanmış sessiya avtomatik boşalır.
        </p>
        <ul className="mb-4 space-y-2 text-sm">
          {devices.map((d) => (
            <li key={d.device_id} className="rounded border border-slate-200 px-3 py-2">
              <div className="font-medium">
                {deviceLabel(d)}
                {isCurrentDevice(d, DEVICE_ID) && (
                  <span className="ml-2 rounded bg-emerald-50 px-1.5 py-0.5 text-xs text-emerald-700">bu cihaz</span>
                )}
              </div>
              <div className="text-xs text-slate-500">
                <span className="font-mono">{shortDeviceId(d.device_id)}</span>
                {' · başlanğıc: '}{formatSince(d.since)}
                {' · son fəaliyyət: '}{formatLastSeen(d.last_seen)}
              </div>
            </li>
          ))}
          {devices.length === 0 && <li className="text-slate-400">Məlumat yoxdur.</li>}
        </ul>
        <p className="mb-4 text-xs text-slate-500">
          Bu cihazları tanımırsınızsa, şifrənizi dəyişdirin və rəhbərə bildirin.
        </p>
        <div className="flex justify-end">
          <Button onClick={onClose}>Bağla</Button>
        </div>
      </div>
    </div>
  )
}
