import { useMemo } from 'react'
import type { WarehouseBalance } from '../../lib/itemIndex'
import { nf } from '../../lib/format'

/* Item state panel — `#op-state`, renderItemBalance() — index.html:3444-3451.

   Balances for the picked code across ALL warehouses, taken from IX.bal.
   Deliberately ignores pending draft lines (M7-24): the combobox filter and
   bulkWriteOffRows subtract pending stock, this panel does not — both are
   correct as written, and unifying them would be a behaviour change, not a
   simplification. */
interface Props {
  code: string | null
  bal: readonly WarehouseBalance[]
}

export function ItemStatePanel({ code, bal }: Props) {
  const rows = useMemo(
    () => (code ? bal.filter((b) => b.c === code && Math.abs(b.q) > 1e-9) : []),
    [code, bal],
  )

  return (
    /* M18-51 — the legacy card, index.html:309. Two corrections:

       · the heading is «Seçilmiş malın vəziyyəti», the legacy wording. «Mal
         üzrə vəziyyət» was a React paraphrase.
       · the title sits in a `<header>`, which is what the platform's
         `.card>header` rule styles (padding + bottom border, index.css:68).
         A bare <h3> child of `.card` matches no rule, so it rendered
         unpadded and with no separator from the body. */
    <div className="card" data-testid="op-state">
      <header><h3>Seçilmiş malın vəziyyəti</h3></header>
      {/* M18-55 — index.html:309. The INITIAL state is the legacy hint that
          tells the user what the panel will show once an item is picked;
          «Mal seçilməyib.» was a React paraphrase that stated only the
          negative. The no-rows case below keeps its own legacy text
          (index.html:3450), which was already correct. */}
      {!code ? (
        <div className="empty">Mal seçin — bütün anbarlar üzrə qalıq burada görünəcək.</div>
      ) : rows.length === 0 ? (
        <div className="empty">Bu mal üzrə hələ hərəkət yoxdur.</div>
      ) : (
        <table>
          <tbody>
            {rows.map((b) => (
              <tr key={b.w}>
                <td>{b.w}</td>
                <td className={'num r' + (b.q < 0 ? ' neg' : '')}>{nf(b.q, 2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
