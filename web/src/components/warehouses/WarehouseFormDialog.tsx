import { useState } from 'react'
import type { WarehouseRow } from '../../api/warehouses.api'
import { manageReference } from '../../api/referenceDirectory.api'
import { Dialog } from '../ui/Dialog'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { useToastStore } from '../../store/toast.store'

interface Props {
  warehouse: WarehouseRow | null // null = create
  usedCount: number
  onDone: () => void
  onClose: () => void
}

export function WarehouseFormDialog({ warehouse, usedCount, onDone, onClose }: Props) {
  const [name, setName] = useState(warehouse?.name ?? '')
  const [busy, setBusy] = useState(false)
  const show = useToastStore((s) => s.show)

  /* Name is locked once the warehouse is in use — it's the accounting and
     access-control key. Ported from index.html refOpen (line 3085). */
  const nameLocked = !!warehouse && usedCount > 0

  async function send(action: 'create' | 'update' | 'deactivate' | 'activate' | 'delete') {
    if ((action === 'create' || action === 'update') && name.trim().length < 2) {
      show('Ad ən azı 2 simvol olmalıdır', true)
      return
    }
    setBusy(true)
    const { data, error } = await manageReference('warehouse', action, warehouse?.id != null ? String(warehouse.id) : null, name.trim() || null, {})
    setBusy(false)
    if (error) {
      const msg = error.message || 'server xətası'
      show(/duplicate key|unique/i.test(msg) ? 'Bu ad artıq mövcuddur' : 'Soraqça yenilənmədi: ' + msg, true)
      return
    }
    const cascaded = data?.cascaded_rows ?? 0
    show(
      action === 'delete' ? 'Soraqça silindi'
        : action === 'deactivate' ? 'Soraqça gizlədildi'
        : action === 'activate' ? 'Soraqça aktivləşdirildi'
        : cascaded ? `Soraqça yeniləndi (${cascaded} tarixi qeydin mətni uzlaşdırıldı)`
        : 'Soraqça yadda saxlanıldı',
    )
    onDone()
  }

  return (
    <Dialog
      title={warehouse ? 'Anbar — redaktə' : 'Anbar — yeni dəyər'}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>İmtina</Button>
          {warehouse && warehouse.active !== false && (
            <Button variant="secondary" disabled={busy} onClick={() => send('deactivate')}>Gizlət</Button>
          )}
          {warehouse && warehouse.active === false && (
            <Button variant="secondary" disabled={busy} onClick={() => send('activate')}>Aktiv et</Button>
          )}
          {warehouse && usedCount === 0 && (
            <Button variant="danger" disabled={busy} onClick={() => send('delete')}>Tamamilə sil</Button>
          )}
          {!nameLocked && (
            <Button disabled={busy} onClick={() => send(warehouse ? 'update' : 'create')}>Yadda saxla</Button>
          )}
        </>
      }
    >
      <label className="mb-2 block text-sm">
        <span className="mb-1 block text-slate-600">Ad</span>
        <Input value={name} onChange={(e) => setName(e.target.value)} readOnly={nameLocked} />
      </label>
      {warehouse && nameLocked && (
        <p className="rounded bg-slate-50 p-3 text-sm text-slate-600">
          Bu anbar <b>{usedCount}</b> qeyddə istifadə olunub. Adı uçot və giriş hüquqlarının açarıdır, ona görə
          dəyişdirilmir. Siyahılardan çıxarmaq üçün <b>Gizlət</b> seçin — keçmiş əməliyyatlar və hesabatlar
          olduğu kimi qalır.
        </p>
      )}
      {warehouse && !nameLocked && usedCount === 0 && (
        <p className="text-sm text-slate-500">Bu dəyər heç bir qeyddə istifadə olunmayıb — adı dəyişdirilə və ya tamamilə silinə bilər.</p>
      )}
    </Dialog>
  )
}
