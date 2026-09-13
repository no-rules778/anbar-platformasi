import { useMemo, useState } from 'react'
import {
  layerCalc, layerSourceLabel, layerQtyMatches, checkFinalAmount, priceVariants,
  type StockLayer, type LayerCalc,
} from '../../lib/layerAllocation'
import { nf, money } from '../../lib/format'
import { Dialog } from '../ui/Dialog'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Table, Thead, Th, Td } from '../ui/Table'

/* Layer («partiya») selection — M7-72…M7-76, index.html:3672-3716, 4318-4403.

   ONE dialog serves both entry points — a single draft line and a bulk row —
   because the arithmetic is identical (`layerCalc`). The difference is only
   who receives the result, so the caller supplies `onConfirm`.

   The sum of the selected layers must equal the required quantity within
   0.00005 (M7-72). That is a hard gate: an allocation that does not add up
   would be rejected by the server after the document is already half written.
   Implemented twice — disabled button AND a refusal in the handler.

   `onBack` renders «Geri» for the bulk entry point (M7-75), which must return
   to the list rather than discard the whole selection.

   M7-75 — reopening a bulk row RESTORES the allocation already chosen for it,
   but only when it was built from the SAME layer revision. The caller decides
   that (it holds the stored lot and the fresh revision) and passes the
   surviving selection in `initialSelection`; a stale one arrives as empty,
   exactly as index.html:4327-4329 does with
   `old.revision === BLP.revision ? old.allocations : []`. */
interface Props {
  code: string
  name: string
  unit: string
  warehouse: string
  /** The quantity the allocation must add up to. */
  requiredQty: number
  layers: readonly StockLayer[]
  /** M7-73 — the admin final-amount override renders on `out` only. */
  showFinalAmount: boolean
  /** M7-75 — a revision-matched allocation to reopen with. */
  initialSelection?: ReadonlyMap<string, number>
  /** The admin override stored alongside a restored allocation. */
  initialFinalAmount?: string
  initialOverrideReason?: string
  onConfirm: (result: LayerCalc & {
    priceVariants: number[]
    finalAmount: string
    overrideReason: string
  }) => void
  onBack?: () => void
  onClose: () => void
}

function num(v: string): number {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

export function LayerPickDialog({
  code, name, unit, warehouse, requiredQty, layers,
  showFinalAmount, initialSelection, initialFinalAmount, initialOverrideReason,
  onConfirm, onBack, onClose,
}: Props) {
  /* Seeded ONCE — later edits are the user's own (M7-75). */
  const [selection, setSelection] = useState<Map<string, number>>(
    () => new Map(initialSelection ?? []),
  )
  const [finalAmount, setFinalAmount] = useState(initialFinalAmount ?? '')
  const [overrideReason, setOverrideReason] = useState(initialOverrideReason ?? '')
  const [error, setError] = useState<string | null>(null)

  const calc = useMemo(() => layerCalc(selection, layers), [selection, layers])
  const variants = useMemo(
    () => priceVariants(calc.allocations, layers),
    [calc.allocations, layers],
  )
  const qtyOk = layerQtyMatches(calc.qty, requiredQty)

  function setQty(id: string, available: number, raw: string) {
    const v = Math.min(Math.max(num(raw), 0), available)
    const next = new Map(selection)
    if (v > 0) next.set(id, v)
    else next.delete(id)
    setSelection(next)
    setError(null)
  }

  function confirm() {
    /* Both gates repeated independently of the button's disabled state. */
    if (!qtyOk) {
      setError(`Seçilmiş partiyaların cəmi (${nf(calc.qty, 4)}) tələb olunan miqdara (${nf(requiredQty, 4)}) bərabər deyil.`)
      return
    }
    if (showFinalAmount) {
      const chk = checkFinalAmount(finalAmount, overrideReason)
      if (!chk.ok) { setError(chk.error ?? null); return }
    }
    onConfirm({
      ...calc,
      priceVariants: variants,
      finalAmount: showFinalAmount ? finalAmount.trim() : '',
      overrideReason: showFinalAmount ? overrideReason.trim() : '',
    })
  }

  return (
    <Dialog
      title="Mənbə partiyalarını seçin"
      onClose={onClose}
      footer={(
        <>
          {onBack && <Button variant="secondary" onClick={onBack}>Geri</Button>}
          <div style={{ flex: 1 }} />
          <Button variant="secondary" onClick={onClose}>İmtina</Button>
          <Button onClick={confirm} disabled={!qtyOk}>Təsdiq et</Button>
        </>
      )}
    >
      <div data-testid="layer-pick-dialog">
        <div><b>{name}</b> ({code}) — {warehouse}</div>
        <p className="hint">
          Tələb olunan miqdar: {nf(requiredQty, 2)} {unit}
        </p>

        {layers.length === 0 ? (
          <div className="empty">Bu mal üzrə partiya yoxdur.</div>
        ) : (
          <Table>
            <Thead>
              <tr>
                <Th>Mənbə</Th>
                <Th>Tarix</Th>
                <Th right>Qalıq</Th>
                <Th right>Qiymət</Th>
                <Th right>Götürülür</Th>
              </tr>
            </Thead>
            <tbody>
              {layers.map((l) => (
                <tr key={l.id}>
                  <Td>
                    {layerSourceLabel(l)}
                    {l.source_doc_num ? ` · ${l.source_doc_num}` : ''}
                  </Td>
                  <Td>{l.received_date ?? '—'}</Td>
                  <Td className="num r">{nf(l.available_qty, 2)}</Td>
                  {/* An unknown price contributes quantity but no amount
                      (M7-77) — it must not render as 0. */}
                  <Td className="num r">
                    {l.price_status === 'unknown' ? '—' : nf(l.unit_price ?? 0, 2)}
                  </Td>
                  <Td className="num r">
                    <Input
                      type="number" step="0.01"
                      aria-label={`Götürülür ${l.id}`}
                      value={selection.get(l.id) ?? 0}
                      onChange={(e) => setQty(l.id, l.available_qty, e.target.value)}
                    />
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}

        <div className="hint" data-testid="layer-totals">
          Seçilib: {nf(calc.qty, 2)} {unit} ·{' '}
          {/* sourceAmount is null when any selected layer has no price — the
              total is genuinely unknowable, so it is an em-dash, not 0. */}
          Məbləğ: {calc.sourceAmount == null ? '—' : money(calc.sourceAmount)}
          {variants.length > 0 && ` · Qiymət: ${variants.map((v) => nf(v, 2)).join(' / ')} ₼`}
        </div>

        {showFinalAmount && (
          <>
            <label className="f">
              <span>Yekun məbləğ (Admin, könüllü)</span>
              <Input
                value={finalAmount}
                aria-label="Yekun məbləğ"
                onChange={(e) => { setFinalAmount(e.target.value); setError(null) }}
              />
            </label>
            <label className="f">
              <span>Məbləğ dəyişikliyinin səbəbi</span>
              <Input
                value={overrideReason}
                aria-label="Məbləğ dəyişikliyinin səbəbi"
                onChange={(e) => { setOverrideReason(e.target.value); setError(null) }}
              />
            </label>
          </>
        )}

        {/* M18-48 — `.err`, the platform's error class; `alarm` was inert. */}
        {error && <div className="err" role="alert">{error}</div>}
      </div>
    </Dialog>
  )
}
