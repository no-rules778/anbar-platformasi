import { useMemo, useState } from 'react'
import type { ItemRow } from '../../api/items.api'
import { approveItemRequest, rejectItemRequest } from '../../api/itemRequests.api'
import {
  nreqSimilar, requestDateLabel, type ItemRequestView,
} from '../../lib/nomenclatureRequests'
import { useToastStore } from '../../store/toast.store'
import { Dialog } from '../ui/Dialog'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'

/* «Sorğunu nəzərdən keçir» — nreqReviewDialog() (index.html:2633-2700).

   The caller decides whether to render this (admin AND a pending row,
   M12-40/M12-70); sql/017:317-319 and 413-415 re-check it server-side and are
   the only authority.

   APPROVAL IS IRREVERSIBLE: the server permanently creates an `items` row and
   consumes the next 7-digit code (sql/017:361-385). It is idempotent — a
   repeat returns the existing code and creates nothing (M12-78). */

interface Props {
  request: ItemRequestView
  items: ItemRow[]
  requests: ItemRequestView[]
  units: string[]
  categories: string[]
  onDecided: () => void
  onClose: () => void
}

export function RequestReviewDialog({
  request, items, requests, units, categories, onDecided, onClose,
}: Props) {
  const show = useToastStore((s) => s.show)
  const [name, setName] = useState(request.name)
  const [unit, setUnit] = useState(request.unit)
  const [category, setCategory] = useState(request.category)
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState<'approve' | 'reject' | null>(null)

  /* M12-72 — the similar block shows existing ITEMS only. When `items` is
     empty but requests matched, the heading still renders with a single
     `.muted` «yoxdur» entry; with neither, the "not found" line replaces the
     whole block (index.html:2638-2644). */
  const similar = useMemo(
    () => nreqSimilar(request.name, items, requests),
    [request.name, items, requests],
  )
  const hasAny = similar.items.length > 0 || similar.reqs.length > 0

  async function approve() {
    const nm = name.trim()
    /* M12-76 — the client guard refuses a short name and makes NO call. */
    if (nm.length < 3) {
      show('Ad ən azı 3 simvol olmalıdır', true)
      return
    }
    setBusy('approve')
    const r = await approveItemRequest({ requestId: request.id, name: nm, unit, category })
    if (!r.ok) {
      /* M12-81 — stays open, that button re-enabled. */
      setBusy(null)
      show('Təsdiqlənmədi: ' + (r.error || 'server xətası'), true)
      return
    }
    /* M12-77 — the toast names the new code, or reports an idempotent repeat;
       a missing code prints an em-dash. */
    const code = r.data?.code || '—'
    onDecided()
    show(r.data?.already_approved
      ? 'Sorğu artıq təsdiqlənib — kod: ' + code
      : 'Təsdiqləndi — yeni mal kodu: ' + code)
  }

  async function reject() {
    const why = reason.trim()
    /* M12-79 — a reason is mandatory; the client refuses and makes no call.
       The server enforces the same rule independently, plus a table CHECK. */
    if (!why) {
      show('Rədd səbəbi tələb olunur', true)
      return
    }
    setBusy('reject')
    const r = await rejectItemRequest({ requestId: request.id, reason: why })
    if (!r.ok) {
      setBusy(null)
      show('Rədd edilmədi: ' + (r.error || 'server xətası'), true)
      return
    }
    onDecided()
    show('Sorğu rədd edildi')
  }

  return (
    <Dialog
      title="Sorğunu nəzərdən keçir"
      onClose={onClose}
      /* M12-75 — «Rədd et» (danger, left), spacer, «Bağla», «Təsdiqlə və mal
         yarat» (primary, right). */
      footer={<>
        <Button variant="danger" data-testid="nv-rej" disabled={busy !== null} onClick={() => void reject()}>
          Rədd et
        </Button>
        <div style={{ flex: 1 }} />
        <Button variant="secondary" onClick={onClose}>Bağla</Button>
        <Button data-testid="nv-ok" disabled={busy !== null} onClick={() => void approve()}>
          Təsdiqlə və mal yarat
        </Button>
      </>}
    >
      {/* M12-71 — raw warehouse or em-dash, the formatted date, and the note
          only when one exists. */}
      <div className="hint" style={{ marginBottom: 10 }} data-testid="nv-head">
        {(request.w || '—') + ' · ' + requestDateLabel(request.ts)
          + (request.note ? ' · qeyd: ' + request.note : '')}
      </div>

      <div data-testid="nv-sim">
        {hasAny ? (
          <div className="hint" style={{ padding: 8, background: 'var(--out-l)', borderRadius: 4, marginBottom: 10 }}>
            <b>Oxşar mövcud mallar</b>
            <ul style={{ margin: '5px 0 0 16px' }}>
              {similar.items.map((i) => (
                <li key={i.code}>{i.name} · <span className="code">{i.code}</span></li>
              ))}
              {similar.items.length === 0 && <li className="muted">yoxdur</li>}
            </ul>
          </div>
        ) : (
          <div className="hint" style={{ marginBottom: 10 }}>Oxşar mövcud mal tapılmadı.</div>
        )}
      </div>

      {/* M12-73 — the name is pre-filled and editable before approval. */}
      <label className="f"><span>Malın adı (təsdiqdən əvvəl düzəldilə bilər)</span>
        <Input type="text" data-testid="nv-name" value={name} onChange={(e) => setName(e.target.value)} />
      </label>

      <div className="row" style={{ gridTemplateColumns: '1fr 1fr' }}>
        <label className="f"><span>Ölçü vahidi</span>
          {/* The empty option NAMES the server default (sql/017:339-340). */}
          <select data-testid="nv-unit" value={unit} onChange={(e) => setUnit(e.target.value)}>
            <option value="">Seçilməyib (ədəd)</option>
            {units.map((u) => <option key={u} value={u}>{u}</option>)}
          </select>
        </label>
        <label className="f"><span>Kateqoriya</span>
          <select data-testid="nv-cat" value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="">Seçilməyib</option>
            {categories.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>
      </div>

      {/* M12-74 — mandatory for rejection ONLY. */}
      <label className="f"><span>Rədd səbəbi (yalnız rədd üçün məcburidir)</span>
        <Input
          type="text" placeholder="məs. bu mal artıq başqa adla mövcuddur"
          data-testid="nv-why" value={reason} onChange={(e) => setReason(e.target.value)}
        />
      </label>

      <div className="hint">
        Təsdiq zamanı mal yaradılır və növbəti 7 rəqəmli kod verilir. Əməliyyat atomikdir.
      </div>
    </Dialog>
  )
}
