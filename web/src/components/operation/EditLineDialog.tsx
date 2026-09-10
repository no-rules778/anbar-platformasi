import { useState } from 'react'
import type { DraftOpLineState } from '../../store/operation.store'
import { OP_TYPES, SAHE_MESUL, optsWith, type OpKind } from '../../lib/opTypes'
import { validateOpLine, type OpLineInput, type ValidateContext } from '../../lib/opLineValidation'
import { Dialog } from '../ui/Dialog'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'

/* Edit-line dialog — M7-45, M7-48, M7-49, M7-50 (index.html:3863-3992).

   Everything is edited on a WORKING COPY. The document's line is replaced only
   by a successful save, so «İmtina» is guaranteed to change nothing — the row
   the user was looking at is never mutated in place.

   `validateOpLine({skipIndex})` is the ONLY validator (M7-32): the edited line
   must not count itself as pending stock, which is what `skipIndex` excludes.
   An invalid save keeps the dialog OPEN with the reason visible (M7-49) —
   closing on failure would look like a successful edit. */
interface Props {
  index: number
  line: DraftOpLineState
  ctx: ValidateContext
  channels: readonly string[]
  partners: readonly string[]
  warehouses: readonly string[]
  transferDests: readonly string[]
  onSave: (line: DraftOpLineState) => void
  onClose: () => void
}

function num(v: string): number {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

export function EditLineDialog({
  index, line, ctx, channels, partners, warehouses, transferDests, onSave, onClose,
}: Props) {
  /* The working copy — `EL.d` (3870). `kind` is deliberately NOT editable:
     changing a line's direction would change which validator branch and which
     RPC it belongs to (M7-48). */
  const kind = line.kind as OpKind
  const [t, setT] = useState(line.t)
  const [w, setW] = useState(line.w)
  const [w2, setW2] = useState(line.w2 ?? '')
  const [q, setQ] = useState(String(line.q))
  const [p, setP] = useState(line.p ?? '')
  const [ch, setCh] = useState(line.ch ?? '')
  const [ct, setCt] = useState(line.ct ?? '')
  const [iv, setIv] = useState(line.iv ?? '')
  const [note, setNote] = useState(line.note ?? '')
  const [pr, setPr] = useState(line.pr != null ? String(line.pr) : '')
  const [error, setError] = useState<string | null>(null)
  const [warn, setWarn] = useState<string | null>(null)

  const types = optsWith(OP_TYPES[kind], t)
  /* M7-47 — a value hidden in Soraqçalar since the line was added stays
     selectable for THIS line, so an unrelated edit cannot silently drop it. */
  const partnerList = optsWith(partners, p)
  const channelList = optsWith(channels, ch)
  const whList = optsWith(warehouses, w)
  const destList = optsWith(transferDests, w2)

  function save() {
    setError(null)
    setWarn(null)

    /* M7-50 — on a transfer the counterparty IS the destination warehouse;
       the field is not offered and is forced here so the payload cannot carry
       a stale partner from before the destination changed. */
    const effectiveP = kind === 'mv' ? w2
      : kind === 'out' && t === 'Silinmə' ? SAHE_MESUL
      : p

    const candidate: OpLineInput = {
      kind,
      t,
      w,
      w2: kind === 'mv' ? w2 : undefined,
      c: line.c,
      q: num(q),
      p: effectiveP,
      ch,
    }

    const res = validateOpLine(candidate, ctx, { skipIndex: index })
    if (!res.ok) { setError(res.error); return }

    /* M7-31 — a clamp cannot be applied silently while a split is present:
       the split sum would no longer equal the quantity. */
    if (line.cond && res.q !== candidate.q) {
      setError('Tiplərə görə bölgü mövcud olduğu üçün miqdar avtomatik endirilə bilməz — miqdarı özünüz azaldın.')
      return
    }
    if (res.warn) setWarn(res.warn)

    /* Name and unit refresh from the nomenclature on save (3980-3983). */
    onSave({
      ...line,
      t,
      w,
      w2: kind === 'mv' ? w2 : undefined,
      q: res.q,
      p: effectiveP,
      ch,
      ct,
      iv,
      note,
      pr: kind === 'in' ? num(pr) : line.pr,
      name: res.item.name,
      unit: res.item.unit,
    })
  }

  return (
    <Dialog
      title="Sətrin düzəlişi"
      onClose={onClose}
      footer={(
        <>
          <div style={{ flex: 1 }} />
          <Button variant="secondary" onClick={onClose}>İmtina</Button>
          <Button onClick={save}>Yadda saxla</Button>
        </>
      )}
    >
      <div data-testid="edit-line-dialog">
        <div><b>{line.name ?? line.c}</b> ({line.c})</div>

        <label className="f">
          <span>Növ</span>
          <select value={t} aria-label="Növ" onChange={(e) => setT(e.target.value)}>
            {types.map((x) => <option key={x} value={x}>{x}</option>)}
          </select>
        </label>

        <label className="f">
          <span>{kind === 'mv' ? 'Mənbə anbar' : 'Anbar'}</span>
          <select value={w} aria-label="Anbar" onChange={(e) => setW(e.target.value)}>
            {whList.map((x) => <option key={x} value={x}>{x}</option>)}
          </select>
        </label>

        {/* M7-48 — `w2` exists only on a transfer. */}
        {kind === 'mv' && (
          <label className="f">
            <span>Təyinat anbar</span>
            <select value={w2} aria-label="Təyinat anbar" onChange={(e) => setW2(e.target.value)}>
              {destList.map((x) => <option key={x} value={x}>{x}</option>)}
            </select>
          </label>
        )}

        {/* The counterparty is not offered on a transfer — M7-50 forces it. */}
        {kind !== 'mv' && (
          <label className="f">
            <span>{kind === 'in' ? 'Kontragent' : 'Təhvil alan / layihə'}</span>
            <select
              value={p}
              aria-label="Qarşı tərəf"
              disabled={kind === 'out' && t === 'Silinmə'}
              onChange={(e) => setP(e.target.value)}
            >
              {(kind === 'out' && t === 'Silinmə' ? [SAHE_MESUL] : partnerList).map((x) => (
                <option key={x} value={x}>{x}</option>
              ))}
            </select>
          </label>
        )}

        <label className="f">
          <span>Miqdar</span>
          <Input
            type="number" step="0.01" value={q} aria-label="Miqdar"
            readOnly={line.cond != null}
            onChange={(e) => setQ(e.target.value)}
          />
          <span className="hint">{line.unit ?? ''}</span>
        </label>

        {/* Channel and contract are inbound-only; so is the price (M7-48 —
            a transfer carries NO price at all). */}
        {kind === 'in' && (
          <>
            <label className="f">
              <span>Kanal</span>
              <select value={ch} aria-label="Kanal" onChange={(e) => setCh(e.target.value)}>
                <option value="">—</option>
                {channelList.map((x) => <option key={x} value={x}>{x}</option>)}
              </select>
            </label>
            <label className="f">
              <span>Müqavilə №</span>
              <Input value={ct} aria-label="Müqavilə №" onChange={(e) => setCt(e.target.value)} />
            </label>
            <label className="f">
              <span>Qiymət</span>
              <Input
                type="number" step="0.01" value={pr} aria-label="Qiymət"
                onChange={(e) => setPr(e.target.value)}
              />
            </label>
          </>
        )}

        <label className="f">
          <span>Qaimə №</span>
          <Input value={iv} aria-label="Qaimə №" onChange={(e) => setIv(e.target.value)} />
        </label>

        <label className="f">
          <span>Qeyd</span>
          <Input value={note} aria-label="Qeyd" onChange={(e) => setNote(e.target.value)} />
        </label>

        {error && <div className="alarm" role="alert">{error}</div>}
        {warn && <div className="hint">{warn}</div>}
      </div>
    </Dialog>
  )
}
