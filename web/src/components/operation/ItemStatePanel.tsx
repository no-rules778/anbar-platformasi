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
    <div className="card" data-testid="op-state">
      <h3>Mal üzrə vəziyyət</h3>
      {!code ? (
        <div className="empty">Mal seçilməyib.</div>
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
