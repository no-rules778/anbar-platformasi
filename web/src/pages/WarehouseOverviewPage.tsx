import { useEffect, useMemo, useState } from 'react'
import type { Me } from '../lib/roles'
import { isAdmin } from '../lib/roles'
import { useWarehouseOverviewStore } from '../store/warehouseOverview.store'
import { useRealtimeRefresh } from '../hooks/useRealtimeRefresh'
import { warehouseSummaries, locationSummaries, deadStockRows, deadStockKpis, deadStockExportMatrix } from '../lib/warehouseOverview'
import { nf, money, fmtD, today } from '../lib/format'
import { whLabel } from '../lib/movementRoute'
import { applyCut } from '../lib/showAllCut'
import { xls } from '../lib/xls'
import { Button } from '../components/ui/Button'
import { ItemCard } from '../components/nomenclature/ItemCard'

/* «Anbar və layihələr» — the legacy `p-anb` shell (index.html:371-376) and
   rAnb() (2900-2917), plus the `dead` report branch (6788-6804) exposed as a
   read-only view of THIS page under owner decision D-K1. No other `rRep()`
   branch is ported here. The page is ungated (D-K3); what it shows is the
   RLS-shaped snapshot as returned. Read-only: no write API exists (M10-05). */

/** Exactly the tables the snapshot reads (M10-13). */
const WATCHED = ['movements', 'items', 'warehouses'] as const

interface Props {
  me: Me
  /** «Yeni ünvan» → the migrated reference directory (`go('refs')`, 2915). */
  onManage: () => void
  onOpenOperation?: (code: string) => void
  onEditItem?: (code: string) => void
}

/** `tbl()` with no rows — index.html:1411. */
function EmptyRows() {
  return <div className="empty"><b>Məlumat yoxdur</b>Filtrləri dəyişin və ya yeni qeyd əlavə edin.</div>
}

export function WarehouseOverviewPage({ me, onManage, onOpenOperation, onEditItem }: Props) {
  const { locations, items, indexes, loading, loaded, error, load } = useWarehouseOverviewStore()
  const [dead, setDead] = useState(false)
  const [cardCode, setCardCode] = useState<string | null>(null)
  useEffect(() => { void load() }, [load])
  useRealtimeRefresh(true, WATCHED, () => { void load() })

  /* `DB.whs` — `active && type === 'anbar'` (933). */
  const activeWarehouses = useMemo(() => locations.filter((r) => r.active && r.type === 'anbar').map((r) => r.name), [locations])
  const warehouses = useMemo(() => warehouseSummaries(activeWarehouses, indexes.bal, indexes.operational), [activeWarehouses, indexes])
  const places = useMemo(() => locationSummaries(locations, indexes.operational), [locations, indexes])
  const deadRows = useMemo(() => deadStockRows(indexes.bal, indexes.operational, today()), [indexes])
  const kpis = useMemo(() => deadStockKpis(deadRows), [deadRows])
  /* `cut(rows, 'dead')` (6802) — the legacy branch never renders a
     «Hamısını göstər» note for this key, so the table is always the first
     SHOW_MAX rows while the export keeps the full set. */
  const deadShown = useMemo(() => applyCut(deadRows, false), [deadRows])

  return <>
    <div className="phead">
      <div><h2>Anbar və layihələr</h2><p>Fiziki anbarlar qalıq saxlayır; layihə/təhvil məntəqələri isə məxaric ünvanı kimi çıxış edir.</p></div>
      <div className="sp" />
      <div className="seg" role="group" aria-label="Görünüş">
        <button className={!dead ? 'on' : undefined} onClick={() => setDead(false)}>Anbarlar</button>
        <button className={dead ? 'on' : undefined} onClick={() => setDead(true)}>Hərəkətsiz və ölü qalıq</button>
      </div>
      {dead
        ? <Button variant="secondary" data-testid="anb-dead-export" onClick={() => xls(deadStockExportMatrix(deadRows), 'hereketsiz_qaliq')}>Excel</Button>
        : <Button data-testid="anb-add" disabled={!isAdmin(me)} onClick={onManage}>Yeni ünvan</Button>}
    </div>
    {loading && !loaded && <div className="empty" data-testid="anb-loading"><b>Yüklənir…</b>Anbar və layihələr Supabase-dən oxunur.</div>}
    {error && !loaded && <div className="empty" data-testid="anb-load-error"><b>Yükləmə xətası</b>{error}</div>}
    {/* M10-12 — a failed REFRESH keeps the previous complete snapshot on
        screen and only flags it. */}
    {error && loaded && <div className="hint" data-testid="anb-refresh-error"><span className="tag t-rm">Yenilənmədi</span> {error}</div>}
    {loaded && !dead && <div className="grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
      <div className="card"><header><h3>Fiziki anbarlar</h3></header><div className="tw" data-testid="anb-wh">
        {warehouses.length === 0 ? <EmptyRows /> : <table><thead><tr><th>Anbar</th><th className="r">Mövqe</th><th className="r">Qalıq dəyəri</th><th className="r">Hərəkət</th><th>Son əməliyyat</th></tr></thead><tbody>
          {warehouses.map((r) => <tr key={r.warehouse}><td><b>{whLabel(r.warehouse)}</b></td><td className="num">{nf(r.positions)}</td><td className="num">{money(r.value)}</td><td className="num">{nf(r.movements)}</td><td>{r.last || '—'}</td></tr>)}
        </tbody></table>}
      </div></div>
      <div className="card"><header><h3>Layihə və təhvil məntəqələri</h3></header><div className="tw" data-testid="anb-loc">
        {places.length === 0 ? <EmptyRows /> : <table><thead><tr><th>Ünvan / layihə</th><th>Tipi</th><th className="r">Əməliyyat</th><th className="r">Dövriyyə</th></tr></thead><tbody>
          {places.map((r) => <tr key={r.id}><td>{r.name}</td><td><span className={'tag ' + (r.kind === 'anbar' ? 't-op' : 't-mut')}>{r.kind}</span></td><td className="num">{nf(r.movements)}</td><td className="num">{nf(r.turnover, 2)}</td></tr>)}
        </tbody></table>}
      </div></div>
    </div>}
    {loaded && dead && <>
      <div className="kpis"><Kpi label="Hərəkətsiz mövqe" value={nf(kpis.positions)} sub="30 gündən çox" cls="o" /><Kpi label="Dondurulmuş dəyər" value={money(kpis.value)} sub="dövriyyədən kənar vəsait" cls="r" /><Kpi label="Heç istifadə olunmayıb" value={nf(kpis.neverUsed)} sub="yalnız mədaxil olub" /></div>
      <div className="card" style={{ marginTop: 12 }}><div className="tw" data-testid="anb-dead">
        {deadShown.length === 0 ? <EmptyRows /> : <table><thead><tr><th>Kod</th><th>Mal</th><th>Anbar</th><th className="r">Qalıq</th><th className="r">Dəyər</th><th>Son hərəkət</th><th className="r">Gün</th><th>Status</th></tr></thead><tbody>
          {deadShown.map(({ balance: b, days, moved }) => <tr className="clk" key={b.w + '|' + b.c} onClick={() => setCardCode(b.c)}><td><span className="code">{b.c}</span></td><td><div className="nm">{b.name}</div></td><td>{b.w}</td><td className="num">{nf(b.q, 2)}</td><td className="num">{money(b.val)}</td><td>{fmtD(b.last)}</td><td className="num">{nf(days)}</td><td><span className={'tag ' + (moved ? 't-mut' : 't-rm')}>{moved ? 'hərəkətsiz' : 'istifadəsiz'}</span></td></tr>)}
        </tbody></table>}
      </div></div>
    </>}
    {cardCode && <ItemCard code={cardCode} items={items} indexes={indexes} me={me} warehouses={activeWarehouses} onEdit={(c) => onEditItem?.(c)} onOperation={(c) => onOpenOperation?.(c)} onClose={() => setCardCode(null)} />}
  </>
}

function Kpi({ label, value, sub, cls }: { label: string; value: string; sub: string; cls?: string }) {
  return <div className={'kpi' + (cls ? ' ' + cls : '')} data-kpi={label}><div className="eyebrow">{label}</div><div className="v">{value}</div><div className="s">{sub}</div></div>
}
