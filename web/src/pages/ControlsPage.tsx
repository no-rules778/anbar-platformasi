import { useEffect, useMemo, useState } from 'react'
import type { Me } from '../lib/roles'
import { useAnalysisStore } from '../store/analysis.store'
import { useRealtimeRefresh } from '../hooks/useRealtimeRefresh'
import { controlIssues } from '../lib/controlIssues'
import { controlExportMatrix, controlKpis } from '../lib/controlReport'
import { nf, today } from '../lib/format'
import { recorderLabel } from '../lib/recorderLabel'
import { useAuditLogStore } from '../store/auditLog.store'
import { applyCut } from '../lib/showAllCut'
import { csvDownload } from '../lib/xls'
import { Button } from '../components/ui/Button'
import { PrintHead } from '../components/PrintHead'
import { ItemCard } from '../components/nomenclature/ItemCard'
import { useToastStore } from '../store/toast.store'

const WATCHED = ['movements', 'items', 'warehouses', 'partners'] as const
interface Props { me: Me; onOpenOperation?: (code: string) => void; onEditItem?: (code: string) => void }
const riskText = (sev: string) => sev === 'high' ? 'yüksək risk' : sev === 'low' ? 'xatırlatma' : 'orta risk'
const riskClass = (sev: string) => sev === 'high' ? 't-rm' : sev === 'low' ? 't-mut' : 't-out'

export function ControlsPage({ me, onOpenOperation, onEditItem }: Props) {
  const { items, locations, partners, indexes, loading, loaded, error, load } = useAnalysisStore()
  const emails = useAuditLogStore((s) => s.emails)
  const show = useToastStore((s) => s.show)
  const [printStamp, setPrintStamp] = useState<Date | null>(null)
  const [cardCode, setCardCode] = useState<string | null>(null)
  useEffect(() => { void load() }, [load])
  useRealtimeRefresh(true, WATCHED, () => { void load() })
  const warehouses = useMemo(() => locations.filter((x) => x.active && x.type === 'anbar').map((x) => x.name), [locations])
  const groups = useMemo(() => controlIssues({ bal: indexes.bal, byItem: indexes.byItem, operational: indexes.operational, items, partners, locationNames: locations.map((x) => x.name), warehouses, today: today(), recorder: (m) => recorderLabel(m.created_by, emails, me) }), [indexes, items, partners, locations, warehouses, emails, me])
  const k = useMemo(() => controlKpis(groups, indexes.operational.length, today()), [groups, indexes.operational.length])
  function onPrint() { setPrintStamp(new Date()); setTimeout(() => window.print(), 60) }
  return <>
    <PrintHead title="Nəzarət və risklər" userName={me.name} stampedAt={printStamp} />
    <div className="phead"><div><h2>Nəzarət və risklər</h2><p>Uçotun düzgünlüyünü və sənəd intizamını pozan halların avtomatik siyahısı.</p></div><div className="sp" /><Button variant="secondary" onClick={() => { csvDownload(controlExportMatrix(groups), 'nezaret_hesabati'); show('nezaret_hesabati faylı yükləndi') }}>Excel</Button><Button variant="secondary" onClick={onPrint}>Çap</Button></div>
    {loading && !loaded && <div className="empty"><b>Yüklənir…</b>Nəzarət yoxlamaları hazırlanır.</div>}
    {error && !loaded && <div className="empty"><b>Yükləmə xətası</b>{error}</div>}
    {error && loaded && <div className="hint"><span className="tag t-rm">Yenilənmədi</span> {error}</div>}
    {loaded && <>
      <div className="kpis">
        <div className={`kpi ${k.total ? 'o' : 'g'}`}><div className="eyebrow">Ümumi hal</div><div className="v">{nf(k.total)}</div><div className="s">{nf(k.categories)} kateqoriya</div></div>
        <div className={`kpi ${k.high ? 'r' : 'g'}`}><div className="eyebrow">Yüksək risk</div><div className="v">{nf(k.high)}</div><div className="s">təcili baxış tələb edir</div></div>
        <div className="kpi g"><div className="eyebrow">Uçotun tamlığı</div><div className="v">{k.completeness}</div><div className="s">problemsiz qeydlərin payı</div></div>
        <div className="kpi"><div className="eyebrow">Yoxlama tarixi</div><div className="v">{k.date}</div><div className="s">hər dəyişiklikdə avtomatik</div></div>
      </div>
      <div style={{ marginTop: 12 }}>{groups.length ? groups.map((g) => {
        const shown = applyCut(g.rows, false)
        return <div className="card" style={{ marginBottom: 12 }} key={g.id}>
          <header><span className={`tag ${riskClass(g.sev)}`}>{riskText(g.sev)}</span><h3>{g.title}</h3><div className="sp" /><b className="num">{nf(g.rows.length)}</b></header>
          <div className="pad hint" style={{ paddingBottom: 0 }}>{g.why}</div>
          <div className="tw" style={{ maxHeight: 320 }}><table><thead><tr>{g.cols.map((c) => <th key={c} className={/Qalıq|Miqdar|Məbləğ/.test(c) ? 'r' : ''}>{c}</th>)}</tr></thead><tbody>{shown.map((row, i) => <tr key={i} className="clk" onClick={() => g.codes[i] && setCardCode(g.codes[i])}>{row.map((cell, j) => <td key={j} className={/Qalıq|Miqdar|Məbləğ/.test(g.cols[j] ?? '') ? 'num' : undefined}>{cell}</td>)}</tr>)}</tbody></table></div>
          {g.rows.length > 100 && <div className="pad hint">İlk 100 sətir göstərilir.</div>}
        </div>
      }) : <div className="card"><div className="empty"><b>Problem aşkarlanmadı</b>Bütün avtomatik nəzarət yoxlamaları uğurla keçdi.</div></div>}</div>
    </>}
    {cardCode && <ItemCard code={cardCode} items={items} indexes={indexes} me={me} warehouses={warehouses} onEdit={(c) => onEditItem?.(c)} onOperation={(c) => onOpenOperation?.(c)} onClose={() => setCardCode(null)} />}
  </>
}
