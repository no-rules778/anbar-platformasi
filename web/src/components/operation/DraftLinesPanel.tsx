import { useMemo } from 'react'
import type { DraftOpLineState } from '../../store/operation.store'
import { draftStamp } from '../../lib/opDraft'
import { nf, money } from '../../lib/format'
import { Button } from '../ui/Button'
import { Table, Thead, Th, Td } from '../ui/Table'

/* Draft-lines document panel — renderLines() — index.html:3717-3763. Also
   carries the restore banner (3733-3737, 3782-3787). Editing a line and the
   «Malları seç» bulk entry points are H-3 (EditLineDialog, BulkPickDialog);
   this panel only lists, removes and reports totals — the H-2 scope T5
   itself gives it. */
interface Props {
  lines: readonly DraftOpLineState[]
  restoredAt: number | null
  onDismissRestoreBanner: () => void
  onRemove: (index: number) => void
  onEdit: (index: number) => void
  canPost: boolean
  editMode: boolean
  onPost: () => void
  onClear: () => void
}

/** `pr` cell — index.html:3717-3752. A layered line shows its price VARIANTS
    joined by « / »; a plain line shows its own price; a missing amount is
    an em-dash, never 0. */
function priceCell(line: DraftOpLineState): string {
  if (Array.isArray(line.allocations) && line.allocations.length > 0) {
    const variants = Array.isArray(line.priceVariants) ? line.priceVariants : []
    return variants.length > 0 ? variants.map((v) => nf(v, 2)).join(' / ') : '—'
  }
  return line.pr != null ? nf(line.pr, 2) : '—'
}

/** Route cell — index.html:3742. `mv` shows `w → w2`; `in` shows the
    counterparty arriving at the warehouse (`p → w`); `out` shows the
    warehouse handing off to the counterparty (`w → p`). Every kind also
    carries its operation type, as the legacy `TYPE_TAG(l.t)` prefix does. */
function routeText(line: DraftOpLineState): string {
  const route = line.kind === 'mv' ? `${line.w} → ${line.w2 ?? ''}`
    : line.kind === 'in' ? `${line.p ?? ''} → ${line.w}`
    : `${line.w} → ${line.p ?? ''}`
  return `${line.t} · ${route}`
}

export function DraftLinesPanel({
  lines, restoredAt, onDismissRestoreBanner, onRemove, onEdit, canPost, editMode, onPost, onClear,
}: Props) {
  const totals = useMemo(() => {
    let amount = 0
    let priceless = 0
    for (const l of lines) {
      const amt = l.pr != null ? l.pr * l.q : null
      if (amt == null) priceless++
      else amount += amt
    }
    return { amount, priceless }
  }, [lines])

  return (
    <div className="card" data-testid="draft-lines-panel">
      {/* M18-52 — index.html:303. The heading is «Sənədin sətirləri» (the
          legacy wording; «Sənəd sətirləri» was a React paraphrase), and the
          title row is the card's own `<header>` — `.card>header` is what
          carries the padding, the bottom border and the flex row, while
          `.phead` is the PAGE heading block and gives a card title neither. */}
      <header>
        <h3>Sənədin sətirləri</h3>
        <div className="sp" />
        <span className="hint">
          {nf(lines.length)} sətir · {money(totals.amount)}
          {totals.priceless > 0 && ` · ${nf(totals.priceless)} qiymətsiz`}
        </span>
      </header>

      {restoredAt != null && (
        <div className="notice" data-testid="draft-restore-banner">
          <span>bu sətirlər {draftStamp(restoredAt)} tarixli qaralamadan bərpa edildi</span>
          <Button variant="secondary" size="sm" onClick={onDismissRestoreBanner}>Anladım</Button>
        </div>
      )}

      {/* M18-54 — the legacy empty state is `tbl()`'s own shape
          (index.html:1411): a BOLD «Məlumat yoxdur» followed by the caller's
          explanatory text, which for `#op-lines` is index.html:3751. React
          showed a single paraphrased line and no bold lead. */}
      {lines.length === 0 ? (
        <div className="empty">
          <b>Məlumat yoxdur</b>
          Sətir əlavə edin — sənəd bir neçə maldan ibarət ola bilər.
        </div>
      ) : (
        <Table>
          <Thead>
            <tr>
              <Th>Mal</Th>
              <Th>Marşrut</Th>
              <Th right>Miqdar</Th>
              <Th right>Qiymət</Th>
              <Th right>Məbləğ</Th>
              <Th>{''}</Th>
            </tr>
          </Thead>
          <tbody>
            {lines.map((l, i) => (
              <tr key={i}>
                <Td>{l.name ?? l.c}</Td>
                <Td>{routeText(l)}</Td>
                <Td className="num r">{nf(l.q, 2)} {l.unit ?? ''}</Td>
                <Td className="num r">{priceCell(l)}</Td>
                <Td className="num r">{l.pr != null ? money(l.pr * l.q) : '—'}</Td>
                <Td>
                  <Button variant="secondary" size="sm" onClick={() => onEdit(i)}>Düzəlt</Button>{' '}
                  <Button variant="danger" size="sm" onClick={() => onRemove(i)}>Sil</Button>
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}

      <div className="phead" style={{ marginTop: 12 }}>
        <Button variant="secondary" onClick={onClear} disabled={lines.length === 0}>Təmizlə</Button>
        <div className="sp" />
        <Button onClick={onPost} disabled={!canPost}>
          {editMode ? 'Düzəlişi qeyd et' : 'Sənədi qeyd et'}
        </Button>
      </div>
    </div>
  )
}
