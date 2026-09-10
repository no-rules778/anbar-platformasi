import { useMemo } from 'react'
import type { ItemRow } from '../../api/items.api'
import type { ItemIndexes } from '../../lib/itemIndex'
import { nf, money } from '../../lib/format'
import { routeOrPartner, whLabel } from '../../lib/movementRoute'
import { can, type Me } from '../../lib/roles'
import { Table, Thead, Th, Td } from '../ui/Table'
import { Button } from '../ui/Button'

/* Item card drill-down — itemCard() (index.html:1861-1891). */

interface Props {
  code: string
  items: ItemRow[]
  indexes: ItemIndexes
  me: Me
  /** Configured warehouse names, for resolving transfer routes (A12). */
  warehouses: string[]
  onEdit: (code: string) => void
  /** M5-55 — prefills this item into «Yeni əməliyyat» and navigates there. */
  onOperation: (code: string) => void
  onClose: () => void
}

/** `fmtD` — index.html:602. */
function fmtD(s: string | null): string {
  if (typeof s === 'string' && /^\d{4}-\d{2}-\d{2}/.test(s)) {
    return s.slice(8, 10) + '.' + s.slice(5, 7) + '.' + s.slice(0, 4)
  }
  return s ?? ''
}

/* M5-55 — the transition is LIVE as of Phase 7 H-4.

   The legacy `prefillOp()` (index.html:3452) does two things: it sets `OP.pick`
   and only THEN navigates. Navigation alone was never parity, which is why the
   button stayed inert while «Yeni əməliyyat» was unmigrated. `onOperation`
   now performs the same two steps in the same order — the operation store's
   `prefill(code)` first, the page switch second — so the target screen opens
   with the item, its unit, its balance panel and its condition split already
   populated. The temporary tooltip that named the missing screen is gone with
   it. */

export function ItemCard({ code, items, indexes, me, warehouses, onEdit, onOperation, onClose }: Props) {
  const it = useMemo(
    () => items.find((i) => i.code === code)
      ?? { code, name: '(nomenklaturada yoxdur)', unit: '', price: 0, category: null } as ItemRow,
    [items, code],
  )

  const movs = useMemo(
    () => indexes.operational
      .filter((m) => m.item_code === code)
      /* dsort descending — index.html:1864. */
      .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0)),
    [indexes, code],
  )
  const bal = useMemo(() => indexes.bal.filter((b) => b.c === code), [indexes, code])
  const tot = useMemo(() => bal.reduce((s, b) => s + b.q, 0), [bal])
  const obs = useMemo(
    () => (indexes.priceObs.get(code) ?? []).slice().sort((a, b) => (a.d < b.d ? 1 : a.d > b.d ? -1 : 0)),
    [indexes, code],
  )
  const price = it.price ?? 0

  return (
    <>
      <div className="mask" onClick={onClose} />
      <aside className="drawer on" role="dialog" aria-label="Mal kartoçkası">
        <header style={{ padding: '15px 17px', borderBottom: '1px solid var(--line)', display: 'flex', gap: 10 }}>
          <div>
            <div className="eyebrow">Mal kartoçkası · {code}</div>
            <h3 style={{ fontSize: 16, marginTop: 3 }}>{it.name}</h3>
            <div className="hint">
              {it.unit} · son qiymət {price ? nf(price, 2) + ' ₼' : 'daxil edilməyib'}
            </div>
          </div>
          <div className="sp" style={{ flex: 1 }} />
          <button className="x" onClick={onClose} aria-label="Bağla">×</button>
        </header>

        <div style={{ padding: '15px 17px' }}>
          <div className="kpis" style={{ gridTemplateColumns: 'repeat(3,1fr)' }}>
            <div className={'kpi ' + (tot < 0 ? 'r' : 'g')}>
              <div className="eyebrow">Ümumi qalıq</div>
              <div className="v">{nf(tot, 2)}</div>
              <div className="s">{it.unit}</div>
            </div>
            <div className="kpi">
              <div className="eyebrow">Qalıq dəyəri</div>
              <div className="v" style={{ fontSize: 18 }}>{money(tot * price)}</div>
              <div className="s">{price ? 'son qiymətlə' : 'qiymət yoxdur'}</div>
            </div>
            <div className="kpi v">
              <div className="eyebrow">Hərəkət sayı</div>
              <div className="v">{nf(movs.length)}</div>
              <div className="s">
                {movs.length ? movs[movs.length - 1].date + ' → ' + movs[0].date : '—'}
              </div>
            </div>
          </div>

          <h4 className="eyebrow" style={{ margin: '16px 0 7px', fontSize: 12 }}>Anbarlar üzrə qalıq</h4>
          <div className="card">
            <Table>
              <Thead>
                <tr><Th>Anbar</Th><Th right>Mədaxil</Th><Th right>Məxaric</Th><Th right>Qalıq</Th></tr>
              </Thead>
              <tbody>
                {bal.map((b) => (
                  <tr key={b.w}>
                    {/* Display alias only — the stored key is untouched. */}
                    <Td>{whLabel(b.w)}</Td>
                    <Td>{nf(b.in, 2)}</Td>
                    <Td>{nf(b.out, 2)}</Td>
                    <Td><b className={b.q < 0 ? 'neg' : undefined}>{nf(b.q, 2)}</b></Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>

          {/* Price history appears ONLY with more than one observation — a
              single price is the current price, not a history (1882). */}
          {obs.length > 1 && (
            <>
              <h4 className="eyebrow" style={{ margin: '16px 0 7px', fontSize: 12 }}>Qiymət tarixçəsi</h4>
              <div className="card">
                <Table>
                  <Thead>
                    <tr><Th>Tarix</Th><Th>Kontragent</Th><Th right>Qiymət</Th></tr>
                  </Thead>
                  <tbody>
                    {obs.map((o, i) => (
                      <tr key={i}>
                        <Td>{fmtD(o.d)}</Td><Td>{o.k}</Td><Td>{nf(o.p, 2)} ₼</Td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>
            </>
          )}

          <h4 className="eyebrow" style={{ margin: '16px 0 7px', fontSize: 12 }}>Hərəkət tarixçəsi</h4>
          <div className="card">
            <Table>
              <Thead>
                <tr>
                  <Th>Tarix</Th><Th>Anbar</Th><Th>Növ</Th>
                  <Th>İstiqamət / Kontragent</Th><Th>Qaimə №</Th>
                  <Th right>Giriş</Th><Th right>Çıxış</Th>
                </tr>
              </Thead>
              <tbody>
                {movs.map((m) => (
                  <tr key={m.id}>
                    <Td>{fmtD(m.date)}</Td>
                    <Td>{whLabel(m.warehouse)}</Td>
                    <Td>{m.type}</Td>
                    {/* A transfer renders «source → destination»; every other
                        type keeps its stored partner text, and a row with no
                        partner shows the em dash (routeOrPartner, 1454). */}
                    <Td>{routeOrPartner(m, warehouses)}</Td>
                    <Td>{m.invoice_num
                      ? <span className="code">{m.invoice_num}</span>
                      : <span className="muted">—</span>}</Td>
                    <Td>{m.in_qty ? nf(m.in_qty, 2) : '—'}</Td>
                    <Td>{m.out_qty ? nf(m.out_qty, 2) : '—'}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>

          <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
            {/* M5-55 — live. The link itself carries no role gate, matching
                the original (index.html:1888): a rehber may open the screen
                and is refused at the post, not here. */}
            <Button onClick={() => onOperation(code)}>Bu mal üzrə əməliyyat</Button>
            {can(me, 'item.edit') && (
              <Button variant="secondary" onClick={() => onEdit(code)}>Malı redaktə et</Button>
            )}
          </div>
        </div>
      </aside>
    </>
  )
}
