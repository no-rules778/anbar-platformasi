import { useState } from 'react'
import { manageReference, type ReferenceAction } from '../../api/referenceDirectory.api'
import type { ReferenceUsage } from '../../api/referenceUsage.api'
import { kindLabel, type ReferenceEntity, type WiredKind } from '../../types/referenceDirectory'
import { Dialog } from '../ui/Dialog'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { useToastStore } from '../../store/toast.store'
import { blockedReason } from '../../lib/mutationGuard'

interface Props {
  /** null = create a new value of `kind` */
  entity: ReferenceEntity | null
  kind: WiredKind
  usage: ReferenceUsage
  presetName?: string
  onDone: () => void
  onClose: () => void
}

/** ISO is the only format an <input type="date"> can display. */
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

/* Generalises Phase 1's warehouse dialog to any reference kind, ported from
   refOpen() (index.html:3077-3122) and refRemove() (3125-3150). Every rule the
   original applies per kind is preserved:

     * only Admin reaches this dialog at all (checked by the page);
     * a warehouse/location name is locked once the value is in use — it is the
       accounting and access key (3085). A partner's name stays editable: the
       server cascades the rename into movements.partner;
     * a used value is never deleted, only hidden;
     * deletion is a second, explicit step;
     * partner-only fields VÖEN / Müqavilə tarixi / Müqavilə № (3086-3089),
       with the original's 10-digit VÖEN check (3163). */
export function ReferenceDirectoryFormDialog({ entity, kind, usage, presetName, onDone, onClose }: Props) {
  const [name, setName] = useState(entity?.name ?? presetName ?? '')
  const [voen, setVoen] = useState(entity?.voen ?? '')
  const [contract, setContract] = useState(entity?.contract ?? '')
  const storedDate = entity?.contractDate ?? ''
  const [contractDate, setContractDate] = useState(ISO_DATE.test(storedDate) ? storedDate : '')
  const [busy, setBusy] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const show = useToastStore((s) => s.show)

  const label = kindLabel(kind)
  const usedCount = usage.count
  const usageUnknown = !usage.exact

  /* Name lock applies to the accounting keys only (warehouse/location). */
  const nameLocked = !!entity && kind === 'warehouse' && (usedCount > 0 || usageUnknown)
  const canDelete = !!entity && usedCount === 0 && usage.exact
  /* A legacy non-ISO date cannot be shown by a date input; saying so prevents
     silently dropping it on save. See the Phase 2 report. */
  const unshowableDate = kind === 'partner' && storedDate !== '' && !ISO_DATE.test(storedDate)

  async function send(action: ReferenceAction) {
    /* Localhost shares the production database, so destructive actions need an
       explicit opt-in there. Off localhost this is always null. */
    const blocked = blockedReason(action)
    if (blocked) {
      show(blocked, true)
      return
    }
    if ((action === 'create' || action === 'update') && name.trim().length < 2) {
      show('Ad ən azı 2 simvol olmalıdır', true)
      return
    }
    const meta =
      kind === 'partner'
        ? { voen: voen.trim(), contract: contract.trim(), contract_date: contractDate }
        : {}
    if (kind === 'partner' && meta.voen && !/^\d{10}$/.test(meta.voen)) {
      show('VÖEN 10 rəqəm olmalıdır', true)
      return
    }

    setBusy(true)
    const { data, error } = await manageReference(kind, action, entity?.id ?? null, name.trim() || null, meta)
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

  if (confirmingDelete && entity) {
    return (
      <Dialog
        title="Soraqçanın silinməsi"
        onClose={onClose}
        footer={
          <>
            <Button variant="secondary" disabled={busy} onClick={() => setConfirmingDelete(false)}>İmtina</Button>
            <div className="sp" style={{ flex: 1 }} />
            {entity.active && (
              <Button variant="secondary" disabled={busy} onClick={() => send('deactivate')}>Gizlət</Button>
            )}
            <Button variant="danger" disabled={busy} onClick={() => send('delete')}>Tamamilə sil</Button>
          </>
        }
      >
        <p>{label}: <b>{entity.name}</b></p>
        <p className="hint">
          Bu dəyər heç bir qeyddə istifadə olunmayıb, ona görə tamamilə silinə bilər.
          Alternativ olaraq onu yalnız siyahılardan gizlədə bilərsiniz.
        </p>
      </Dialog>
    )
  }

  return (
    <Dialog
      title={entity ? `${label} — redaktə` : `${label} — yeni dəyər`}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>İmtina</Button>
          <div className="sp" style={{ flex: 1 }} />
          {entity && entity.active && (
            <Button variant="secondary" disabled={busy} onClick={() => send('deactivate')}>Gizlət</Button>
          )}
          {entity && !entity.active && (
            <Button variant="secondary" disabled={busy} onClick={() => send('activate')}>Aktiv et</Button>
          )}
          {canDelete && (
            <Button variant="danger" disabled={busy} onClick={() => setConfirmingDelete(true)}>Tamamilə sil</Button>
          )}
          {!nameLocked && (
            <Button disabled={busy} onClick={() => send(entity ? 'update' : 'create')}>Yadda saxla</Button>
          )}
        </>
      }
    >
      <label className="f">
        <span>Ad</span>
        <Input type="text" value={name} onChange={(e) => setName(e.target.value)} readOnly={nameLocked} />
      </label>

      {kind === 'partner' && (
        <>
          <label className="f">
            <span>VÖEN</span>
            <Input type="text" maxLength={10} value={voen} onChange={(e) => setVoen(e.target.value)} />
          </label>
          <label className="f">
            <span>Müqavilə tarixi</span>
            <Input type="date" value={contractDate} onChange={(e) => setContractDate(e.target.value)} />
          </label>
          <label className="f">
            <span>Müqavilə №</span>
            <Input type="text" value={contract} onChange={(e) => setContract(e.target.value)} />
          </label>
          {unshowableDate && (
            <p className="err">
              Saxlanılmış müqavilə tarixi «{storedDate}» köhnə formatdadır və bu sahədə göstərilə bilmir.
              Yadda saxlasanız, həmin dəyər silinəcək — saxlamaq istəyirsinizsə tarixi yenidən seçin.
            </p>
          )}
        </>
      )}

      {usageUnknown && (
        <p className="err">
          İstifadə məlumatı yüklənmədi — bu dəyərin neçə qeyddə işlədildiyi dəqiq bilinmir.
          Ehtiyatlı olaraq «istifadədə» sayılır: silinmir{kind === 'warehouse' ? ' və adı dəyişdirilmir' : ''}.
        </p>
      )}
      {entity && nameLocked && !usageUnknown && (
        <p className="hint" style={{ padding: 9, background: 'var(--out-l)', borderRadius: 4 }}>
          Bu {label.toLowerCase()} <b>{usedCount}</b> qeyddə istifadə olunub. Adı uçot və giriş hüquqlarının
          açarıdır, ona görə dəyişdirilmir. Siyahılardan çıxarmaq üçün <b>Gizlət</b> seçin — keçmiş əməliyyatlar
          və hesabatlar olduğu kimi qalır.
        </p>
      )}
      {entity && !nameLocked && usedCount > 0 && !usageUnknown && (
        <p className="hint">
          İstifadə sayı: <b>{usedCount}</b>. Ad dəyişdirilsə, keçmiş qeydlərdəki mətn də avtomatik yenilənəcək
          ki, hesabatlar parçalanmasın. Bu dəyər silinmir — yalnız gizlədilə bilər.
        </p>
      )}
      {entity && usedCount === 0 && !usageUnknown && (
        <p className="hint">Bu dəyər heç bir qeyddə istifadə olunmayıb — adı dəyişdirilə və ya tamamilə silinə bilər.</p>
      )}
    </Dialog>
  )
}
