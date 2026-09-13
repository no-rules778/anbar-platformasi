import { useEffect, useMemo, useState } from 'react'
import type { Me } from '../lib/roles'
import { useAnalysisStore } from '../store/analysis.store'
import { useRealtimeRefresh } from '../hooks/useRealtimeRefresh'
import { buildFinanceView } from '../lib/finance'
import { controlIssues } from '../lib/controlIssues'
import { financeSheets, downloadFinanceWorkbook } from '../lib/financeExport'
import { nf, money, today } from '../lib/format'
import { recorderLabel } from '../lib/recorderLabel'
import { useAuditLogStore } from '../store/auditLog.store'
import { useToastStore } from '../store/toast.store'
import { BarChart } from '../components/dashboard/BarChart'
import { Button } from '../components/ui/Button'
import { ItemCard } from '../components/nomenclature/ItemCard'
import { applyCut } from '../lib/showAllCut'

const WATCHED = ['movements', 'items', 'warehouses', 'partners'] as const
interface Props { me: Me; onOpenOperation?: (code: string) => void; onEditItem?: (code: string) => void }
const Empty = ({ text }: { text: string }) => <div className="empty"><b>Məlumat yoxdur</b>{text}</div>

export function FinancePage({ me, onOpenOperation, onEditItem }: Props) {
  const { items, locations, partners, indexes, aggregates, loading, loaded, error, load } = useAnalysisStore()
  const emails = useAuditLogStore((s) => s.emails)
  const show = useToastStore((s) => s.show)
  const [cardCode, setCardCode] = useState<string | null>(null)
  useEffect(() => { void load() }, [load])
  useRealtimeRefresh(true, WATCHED, () => { void load() })
  const view = useMemo(() => buildFinanceView(indexes, aggregates, items), [indexes, aggregates, items])
  const warehouses = useMemo(() => locations.filter((x) => x.active && x.type === 'anbar').map((x) => x.name), [locations])
  const groups = useMemo(() => controlIssues({ bal: indexes.bal, byItem: indexes.byItem, operational: indexes.operational, items, partners, locationNames: locations.map((x) => x.name), warehouses, today: today(), recorder: (m) => recorderLabel(m.created_by, emails, me) }), [indexes, items, partners, locations, warehouses, emails, me])
  const prices = useMemo(() => applyCut(view.prices, false), [view.prices])
  const k = view.kpis
  const kpis = [
    ['Qalıq dəyəri', money(k.stockValue), 'bütün anbarlar', 'g'],
    ['Satınalma məbləği', money(k.spend), `${nf(k.priced)}/${nf(k.purchaseCount)} sətir qiymətli`, 'v'],
    ['Qiymətlə örtülmə', `${k.purchaseCount ? (k.priced / k.purchaseCount * 100).toFixed(0) : 0}%`, 'qiyməti (m.pr>0) daxil edilmiş sətirlər', k.priced / Math.max(1, k.purchaseCount) > .8 ? 'g' : 'r'],
    ['Sənədsiz satınalma', nf(k.noDocument), 'qaimə/müqavilə göstərilməyib', k.noDocument ? 'r' : 'g'],
    ['Nağd satınalma', nf(k.cashCount), 'kanal = Nağd, əlavə nəzarət', 'o'],
    ['Silinmə dəyəri (təxmini)', money(k.writeoffValue), `${nf(k.writeoffCount)} qeyd · cari qiymətlə`, k.writeoffValue ? 'r' : 'g'],
  ]
  return <>
    <div className="phead"><div><h2>Maliyyə göstəriciləri</h2><p>Satınalma məbləği, qalıq dəyəri, kontragent öhdəlikləri və qiymət intizamı.</p></div><div className="sp" /><Button variant="secondary" title="Rəhbərlik üçün maliyyə hesabatını Excel-ə ixrac et" onClick={() => { downloadFinanceWorkbook(financeSheets(view, indexes, aggregates, items, partners, groups, me.name)); show('Maliyyə hesabatı yükləndi — 6 vərəq') }}>⬇ Hesabatı ixrac et</Button></div>
    {loading && !loaded && <div className="empty"><b>Yüklənir…</b>Maliyyə göstəriciləri hazırlanır.</div>}
    {error && !loaded && <div className="empty"><b>Yükləmə xətası</b>{error}</div>}
    {error && loaded && <div className="hint"><span className="tag t-rm">Yenilənmədi</span> {error}</div>}
    {loaded && <>
      <div className="kpis">{kpis.map(([label, value, sub, cls]) => <div className={`kpi ${cls}`} key={label}><div className="eyebrow">{label}</div><div className="v">{value}</div><div className="s">{sub}</div></div>)}</div>
      <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', marginTop: 12 }}>
        <div className="card"><header><h3>Satınalma xərcinin kontragentlər üzrə bölgüsü</h3></header><div className="pad"><BarChart data={view.supplierSpend.map((x) => ({ k: x.name, v: x.value }))} fmt={money} /><div className="hint" style={{ marginTop: 11 }}>Yalnız qeyd olunmuş satınalma qiyməti (m.pr) əsasında. Bir kontragentin payı 30%-i keçdikdə alternativ təchizatçı ilə müqayisəli qiymət sorğusu tövsiyə olunur.</div></div></div>
        <div className="card"><header><h3>Ödəniş üsulu və sənədləşmə</h3><div className="sp" /><span className="hint">yalnız satınalma</span></header><div className="tw">{view.paymentMethods.length === 0 ? <Empty text="Satınalma qeydi yoxdur." /> : <table><thead><tr><th>Ödəniş kanalı</th><th className="r">Əməliyyat</th><th className="r">Dəyər</th><th className="r">Sənədlə örtülmə</th></tr></thead><tbody>{view.paymentMethods.map((x) => <tr key={x.name}><td>{x.name}</td><td className="num">{nf(x.n)}</td><td className="num">{money(x.value)}</td><td className="num">{x.n ? (x.documented / x.n * 100).toFixed(0) : 0}%</td></tr>)}</tbody></table>}</div></div>
      </div>
      <div className="card" style={{ marginTop: 12 }}><header><h3>Anbar hərəkəti (ödənişsiz əməliyyatlar)</h3><div className="sp" /><span className="hint">yerdəyişmə, qalıq, silinmə, satış və s. — ödəniş statistikasına daxil deyil</span></header><div className="tw">{view.flow.length === 0 ? <Empty text="Ödənişsiz hərəkət qeydi yoxdur." /> : <table><thead><tr><th>Əməliyyat növü</th><th className="r">Say</th><th className="r">Giriş miqdarı</th><th className="r">Çıxış miqdarı</th><th className="r">Sənədlə örtülmə</th></tr></thead><tbody>{view.flow.map((x) => <tr key={x.type}><td>{x.type}</td><td className="num">{nf(x.n)}</td><td className="num">{nf(x.incoming, 2)}</td><td className="num">{nf(x.outgoing, 2)}</td><td className="num">N/A</td></tr>)}</tbody></table>}</div></div>
      <div className="card" style={{ marginTop: 12 }}><header><h3>Qiymət intizamı — eyni malın müxtəlif qiymətləri</h3><div className="sp" /><span className="hint">Təchizat şöbəsi üçün danışıq bazası</span></header><div className="tw">{prices.length === 0 ? <Empty text="Eyni mal üzrə birdən çox qiymət müşahidəsi yoxdur." /> : <table><thead><tr><th>Kod</th><th>Mal</th><th className="r">Ən aşağı</th><th className="r">Ən yüksək</th><th className="r">Fərq</th><th>Ən ucuz təchizatçı</th></tr></thead><tbody>{prices.map((x) => <tr className="clk" key={x.code} onClick={() => setCardCode(x.code)}><td><span className="code">{x.code}</span></td><td><div className="nm">{x.name}</div></td><td className="num">{nf(x.min, 2)} ₼</td><td className="num">{nf(x.max, 2)} ₼</td><td className="num"><b className={x.spread > .2 ? 'neg' : ''}>{(x.spread * 100).toFixed(0)}%</b></td><td>{x.best}</td></tr>)}</tbody></table>}</div></div>
    </>}
    {cardCode && <ItemCard code={cardCode} items={items} indexes={indexes} me={me} warehouses={warehouses} onEdit={(c) => onEditItem?.(c)} onOperation={(c) => onOpenOperation?.(c)} onClose={() => setCardCode(null)} />}
  </>
}
