import { useEffect, useMemo, useRef, useState } from 'react'
import type { ItemRow } from '../../api/items.api'
import { requestNewItem } from '../../api/itemRequests.api'
import { nreqSimilar, type ItemRequestView } from '../../lib/nomenclatureRequests'
import { useToastStore } from '../../store/toast.store'
import { Dialog } from '../ui/Dialog'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'

/* «Yeni nomenklatura sorğusu» — nreqCreateDialog() (index.html:2568-2632).

   The caller decides WHETHER to render this (an anbardar only, M12-07/M12-50);
   the server re-checks the same rule and is the only authority
   (sql/017:223-225). Nothing here is a permission.

   On FAILURE the dialog stays open with the user's input intact (M12-62) — the
   same rule ItemFormDialog already follows, so a silent refusal can never look
   like a success. */

/** index.html:2590-2610 — the four validation states, in precedence order. */
export type ValidationState =
  | { kind: 'none' }
  | { kind: 'tooShort' }
  | { kind: 'exactItem'; item: ItemRow }
  | { kind: 'exactRequest' }
  | { kind: 'similar'; items: ItemRow[]; reqs: ItemRequestView[] }

/* M12-56 / M12-57 — precedence, and the `nm.length &&` guard that makes an
   EMPTY name produce no message at all (distinct from the 1-2 char case). */
export function validationState(
  name: string,
  items: readonly ItemRow[],
  requests: readonly ItemRequestView[],
): ValidationState {
  const nm = name.trim()
  const s = nreqSimilar(nm, items, requests)
  if (nm.length && nm.length < 3) return { kind: 'tooShort' }
  if (s.exact) return { kind: 'exactItem', item: s.exact }
  if (s.exactReq) return { kind: 'exactRequest' }
  if (s.items.length || s.reqs.length) return { kind: 'similar', items: s.items, reqs: s.reqs }
  return { kind: 'none' }
}

/** M12-58 — `nm.length >= 3 && !exact && !exactReq`; SIMILAR stays enabled. */
export function canSubmit(state: ValidationState, name: string): boolean {
  if (name.trim().length < 3) return false
  return state.kind !== 'exactItem' && state.kind !== 'exactRequest'
}

interface Props {
  items: ItemRow[]
  requests: ItemRequestView[]
  units: string[]
  categories: string[]
  onCreated: () => void
  onClose: () => void
}

export function RequestCreateDialog({ items, requests, units, categories, onCreated, onClose }: Props) {
  const show = useToastStore((s) => s.show)
  const [name, setName] = useState('')
  const [unit, setUnit] = useState('')
  const [category, setCategory] = useState('')
  const [note, setNote] = useState('')
  const [sending, setSending] = useState(false)

  /* index.html:2611 — the live check is debounced 160 ms (M12-56). The
     BUTTON follows the debounced state, exactly as legacy's sync() sets
     `#nq-go.disabled` from the same computation. */
  const [debouncedName, setDebouncedName] = useState('')
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  useEffect(() => {
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setDebouncedName(name), 160)
    return () => clearTimeout(timer.current)
  }, [name])

  const state = useMemo(
    () => validationState(debouncedName, items, requests),
    [debouncedName, items, requests],
  )
  const submittable = canSubmit(state, debouncedName) && !sending

  async function submit() {
    const nm = name.trim()
    /* M12-60 — a second guard re-checks the length at submit time and makes
       no call at all. */
    if (nm.length < 3) return
    setSending(true)
    const r = await requestNewItem({ name: nm, unit, category, note })
    if (!r.ok) {
      /* M12-62 — stays open, input intact, button re-enabled. */
      setSending(false)
      show('Sorğu göndərilmədi: ' + (r.error || 'server xətası'), true)
      return
    }
    /* M12-61 — close, reload, navigate, toast. */
    onCreated()
    show('Sorğu göndərildi — Admin təsdiqini gözləyir')
  }

  return (
    <Dialog
      title="Yeni nomenklatura sorğusu"
      onClose={onClose}
      footer={<>
        <div style={{ flex: 1 }} />
        <Button variant="secondary" onClick={onClose}>İmtina</Button>
        <Button data-testid="nq-go" disabled={!submittable} onClick={() => void submit()}>Sorğu göndər</Button>
      </>}
    >
      {/* index.html:2574-2576 — the fixed explanatory block (M12-51). */}
      <div className="hint" style={{ padding: 9, background: 'var(--out-l)', borderRadius: 4, marginBottom: 10 }}>
        Bu, mal yaratmır. Sorğu Admin təsdiqinə göndərilir; təsdiqə qədər mal nomenklaturada
        görünmür, kod almır və əməliyyatlarda istifadə edilə bilməz.
      </div>

      <label className="f"><span>Malın tam adı</span>
        <Input
          type="text" autoComplete="off" placeholder="məs. Kabel NYM 3x1.5"
          data-testid="nq-name" value={name} onChange={(e) => setName(e.target.value)}
        />
      </label>

      <div data-testid="nq-sim">
        {state.kind === 'tooShort' && (
          <div className="hint" style={{ color: 'var(--alarm)' }}>Ad ən azı 3 simvol olmalıdır.</div>
        )}
        {state.kind === 'exactItem' && (
          <div className="hint" style={{ color: 'var(--alarm)' }}>
            <b>Bu mal nomenklaturada artıq var:</b>{' '}
            {state.item.name} · <span className="code">{state.item.code}</span> — sorğu göndərilə bilməz.
          </div>
        )}
        {state.kind === 'exactRequest' && (
          <div className="hint" style={{ color: 'var(--alarm)' }}>
            <b>Bu ad üzrə gözləyən sorğu artıq var</b> — təkrar göndərilə bilməz.
          </div>
        )}
        {state.kind === 'similar' && (
          <div className="hint" style={{ padding: 8, background: 'var(--out-l)', borderRadius: 4 }}>
            <b>Oxşar adlar tapıldı</b> — sorğu göndərilə bilər, qərarı Admin verir.
            <ul style={{ margin: '5px 0 0 16px' }}>
              {state.items.map((i) => (
                <li key={i.code}>{i.name} · <span className="code">{i.code}</span></li>
              ))}
              {state.reqs.map((r) => <li key={r.id}>{r.name} — gözləyən sorğu</li>)}
            </ul>
          </div>
        )}
      </div>

      {/* M12-52 — the SHARED active reference options, each with a leading
          «Seçilməyib»; no second definition of those helpers is introduced. */}
      <div className="row" style={{ gridTemplateColumns: '1fr 1fr' }}>
        <label className="f"><span>Ölçü vahidi (istəyə bağlı)</span>
          <select data-testid="nq-unit" value={unit} onChange={(e) => setUnit(e.target.value)}>
            <option value="">Seçilməyib</option>
            {units.map((u) => <option key={u} value={u}>{u}</option>)}
          </select>
        </label>
        <label className="f"><span>Kateqoriya (istəyə bağlı)</span>
          <select data-testid="nq-cat" value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="">Seçilməyib</option>
            {categories.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>
      </div>

      <label className="f"><span>Qeyd (istəyə bağlı)</span>
        <Input
          type="text" placeholder="məs. hansı iş üçün lazımdır"
          data-testid="nq-note" value={note} onChange={(e) => setNote(e.target.value)}
        />
      </label>
    </Dialog>
  )
}
