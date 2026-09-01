import type { RegisterSessionResult } from '../api/session.api'
import { Button } from './ui/Button'

interface Props {
  info: RegisterSessionResult
  onClose: () => void
}

export function SessionLimitDialog({ info, onClose }: Props) {
  const devices = info.devices ?? []
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <h2 className="mb-3 text-lg font-semibold">Cihaz limiti doludur</h2>
        <p className="mb-4 text-sm text-slate-600">
          Bu hesab üçün eyni vaxtda <b>{info.limit ?? 1}</b> cihaza icazə verilir və hazırda hamısı doludur.
          Aşağıdakı cihazlardan birində çıxış edin və ya 3 dəqiqə gözləyin — fəaliyyəti dayanmış sessiya avtomatik boşalır.
        </p>
        <ul className="mb-4 space-y-1 text-sm">
          {devices.map((d) => (
            <li key={d.device_id} className="rounded border border-slate-200 px-3 py-2">
              {d.device_label} — son fəaliyyət: {new Date(d.last_seen).toLocaleString()}
            </li>
          ))}
        </ul>
        <div className="flex justify-end">
          <Button onClick={onClose}>Bağla</Button>
        </div>
      </div>
    </div>
  )
}
