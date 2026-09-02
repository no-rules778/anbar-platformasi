import { useState } from 'react'
import type { WarehouseRow, WarehouseUsage } from '../../api/warehouses.api'
import { manageReference } from '../../api/referenceDirectory.api'
import { Dialog } from '../ui/Dialog'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { useToastStore } from '../../store/toast.store'

interface Props {
  warehouse: WarehouseRow | null // null = create
  usage: WarehouseUsage
  onDone: () => void
  onClose: () => void
}

export function WarehouseFormDialog({ warehouse, usage, onDone, onClose }: Props) {
  const [name, setName] = useState(warehouse?.name ?? '')
  const [busy, setBusy] = useState(false)
  /* Deleting is two-step, like the original: the ✕ action opens a separate
     «Soraqçanın silinməsi» confirmation before anything is sent
     (index.html refRemove, lines 3125-3150). */
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const show = useToastStore((s) => s.show)

  const usedCount = usage.count
  /* When a source query failed we do not know the real usage. The original
     takes the cautious side (`if (USERS_ERR) return 1`, index.html:2973-2976)
     and warns the user, so an unreadable state can never unlock a rename or
     offer a delete the server would reject. */
  const usageUnknown = !usage.exact

  /* Name is locked once the warehouse is in use — it's the accounting and
     access-control key. Ported from index.html refOpen (line 3085). */
  const nameLocked = !!warehouse && (usedCount > 0 || usageUnknown)
  const canDelete = !!warehouse && usedCount === 0 && usage.exact

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

  if (confirmingDelete && warehouse) {
    return (
      <Dialog
        title="Soraqçanın silinməsi"
        onClose={onClose}
        footer={
          <>
            <Button variant="secondary" disabled={busy} onClick={() => setConfirmingDelete(false)}>İmtina</Button>
            {warehouse.active !== false && (
              <Button variant="secondary" disabled={busy} onClick={() => send('deactivate')}>Gizlət</Button>
            )}
            <Button variant="danger" disabled={busy} onClick={() => send('delete')}>Tamamilə sil</Button>
          </>
        }
      >
        <p className="mb-2 text-sm">Anbar: <b>{warehouse.name}</b></p>
        <p className="text-sm text-slate-500">
          Bu dəyər heç bir qeyddə istifadə olunmayıb, ona görə tamamilə silinə bilər.
          Alternativ olaraq onu yalnız siyahılardan gizlədə bilərsiniz.
        </p>
      </Dialog>
    )
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
          {canDelete && (
            <Button variant="danger" disabled={busy} onClick={() => setConfirmingDelete(true)}>Tamamilə sil</Button>
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
      {usageUnknown && (
        <p className="mb-2 text-sm text-red-600">
          İstifadə məlumatı yüklənmədi — bu anbarın neçə qeyddə işlədildiyi dəqiq bilinmir.
          Dəyər ehtiyatlı olaraq «istifadədə» sayılır: adı dəyişdirilmir və silinmir.
        </p>
      )}
      {warehouse && nameLocked && !usageUnknown && (
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
