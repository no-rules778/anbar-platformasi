import { useEffect, useMemo, useState } from 'react'
import type { Me } from '../lib/roles'
import { useReportsStore } from '../store/reports.store'
import { useRealtimeRefresh } from '../hooks/useRealtimeRefresh'
import {
  REPORT_KINDS, REPORT_LABELS, REPORT_NAMES, type ReportKind,
  partnerReportRows, partnerExportMatrix, partnerTopBars,
  typeReportRows, typeExportMatrix, typeSharePercent,
  warehouseReportRows, warehouseExportMatrix, turnoverPercent,
  monthReportRows, monthExportMatrix, dailyCountSeries,
  abcReport, abcKpis, abcExportMatrix, abcScreenPercent,
  ABC_STALE_HINT, ABC_TAG_CLASS, ABC_KPI_CLASS, ABC_KPI_SUFFIX,
  transferMatrixRows, transferExportMatrix, TRANSFER_EMPTY,
  printRowCount, printTitle,
} from '../lib/reports'
import {
  qaimeReportRows, qaimeExportMatrix, selectedColumns, isNumericColumn,
  screenCell, dateCell, QAIME_COLS, QAIME_FIXED_HEADER, QAIME_SOURCE_NOTE,
  QAIME_EMPTY,
} from '../lib/qaimeReport'
import { deadStockRows, deadStockKpis, deadStockExportMatrix } from '../lib/warehouseOverview'
import { nf, money, fmtD, fmtM, today, typeTagClass } from '../lib/format'
import { whLabel } from '../lib/movementRoute'
import { applyCut } from '../lib/showAllCut'
import { xls } from '../lib/xls'
import { Button } from '../components/ui/Button'
import { PrintHead } from '../components/PrintHead'
import { BarChart } from '../components/dashboard/BarChart'
import { Sparkline } from '../components/reports/Sparkline'
import { ItemCard } from '../components/nomenclature/ItemCard'
import type { WriteoffValuationRow } from '../api/writeoffValuations.api'

/* «Hesabatlar» — the legacy `p-rep` shell (index.html:399-415), rRep()
   (6730-6828) and rQaimeReport() (6878-6931).

   READ-ONLY: no RPC, no write, no mutation guard entry (M14-97).

   THE EXPORT/PRINT EQUIVALENCE (M14-95). Legacy wires `#rep-exp` and
   `#rep-print` exactly ONCE, behind `if (!pick.dataset.done)` (6732-6733), so
   both handlers close over the module globals `REP_ROWS` / `REP_NAME` (6729)
   and always act on whatever branch rendered LAST. There are no globals and no
   latch here: the current matrix and name are derived by the same `useMemo`
   that feeds the table, so the buttons cannot drift from the screen. The
   observable behaviour is identical; the mechanism is not, which is why the
   ledger records this as an equivalence rather than parity of implementation. */

/** Exactly the tables the snapshot reads (M14-17) — the legacy realtime set. */
const WATCHED = ['movements', 'items', 'warehouses', 'partners'] as const

/* The `qaime` branch values a Silinmə row through movementValuation(), which
   takes the valuation map. This page issues no fifth read (see the snapshot's
   own note), so every Silinmə uses the documented legacy per-row fallback. */
const NO_VALUATIONS: ReadonlyMap<string, WriteoffValuationRow> = new Map()

interface Props {
  me: Me
  onOpenOperation?: (code: string) => void
  onEditItem?: (code: string) => void
}

/** `tbl()` with no rows — index.html:1411. */
function EmptyRows({ text }: { text?: string }) {
  return (
    <div className="empty">
      <b>Məlumat yoxdur</b>
      {text ?? 'Filtrləri dəyişin və ya yeni qeyd əlavə edin.'}
    </div>
  )
}

function Kpi({ label, value, sub, cls }: { label: string; value: string; sub: string; cls?: string }) {
  return (
    <div className={'kpi' + (cls ? ' ' + cls : '')} data-kpi={label}>
      <div className="eyebrow">{label}</div>
      <div className="v">{value}</div>
      <div className="s">{sub}</div>
    </div>
  )
}

export function ReportsPage({ me, onOpenOperation, onEditItem }: Props) {
  const {
    items, locations, partners, indexes, aggregates,
    loading, loaded, error, kind, qaimeSel,
    load, setKind, toggleQaimeColumn,
  } = useReportsStore()
  const [cardCode, setCardCode] = useState<string | null>(null)
  const [printStamp, setPrintStamp] = useState<Date | null>(null)

  useEffect(() => { void load() }, [load])
  useRealtimeRefresh(true, WATCHED, () => { void load() })

  /* `DB.whs` — active `anbar` rows only (index.html:933). */
  const warehouses = useMemo(
    () => locations.filter((r) => r.active && r.type === 'anbar').map((r) => r.name),
    [locations],
  )
  const itemPrice = useMemo(
    () => new Map(items.map((i) => [i.code, i.price == null ? 0 : Number(i.price)])),
    [items],
  )

  /* ---- the seven derivations, each feeding BOTH the table and the export ---- */
  const knt = useMemo(() => partnerReportRows(aggregates, partners), [aggregates, partners])
  const type = useMemo(() => typeReportRows(aggregates), [aggregates])
  const wh = useMemo(
    () => warehouseReportRows(warehouses, aggregates, indexes.bal),
    [warehouses, aggregates, indexes.bal],
  )
  const per = useMemo(() => monthReportRows(aggregates), [aggregates])
  const spark = useMemo(() => dailyCountSeries(aggregates), [aggregates])
  const abc = useMemo(() => abcReport(aggregates), [aggregates])
  /* M14-60 — the ACCEPTED Phase 10 functions, as the single derivation. */
  const dead = useMemo(
    () => deadStockRows(indexes.bal, indexes.operational, today()),
    [indexes],
  )
  const tr = useMemo(
    () => transferMatrixRows(indexes.operational, warehouses, itemPrice),
    [indexes.operational, warehouses, itemPrice],
  )
  const qaime = useMemo(
    () => qaimeReportRows(indexes.operational, NO_VALUATIONS),
    [indexes.operational],
  )

  /* THE STATE-HELD MATRIX AND NAME (M14-95). Derived from the SAME inputs the
     table renders, so «Excel» and «Çap» always describe what is on screen. */
  const matrix = useMemo((): unknown[][] => {
    switch (kind) {
      case 'knt': return partnerExportMatrix(knt)
      case 'type': return typeExportMatrix(type)
      case 'wh': return warehouseExportMatrix(wh)
      case 'per': return monthExportMatrix(per)
      case 'abc': return abcExportMatrix(abc.rows)
      case 'dead': return deadStockExportMatrix(dead)
      case 'tr': return transferExportMatrix(tr)
      case 'qaime': return qaimeExportMatrix(qaime, qaimeSel)
    }
  }, [kind, knt, type, wh, per, abc, dead, tr, qaime, qaimeSel])

  const name = REPORT_NAMES[kind]

  /* The cut applies to the TABLE only; the export keeps the full set
     (M14-92). `abc` and `dead` carry no «Hamısını göstər» affordance, so
     `showAll` is permanently false for them (M14-96). */
  const abcShown = useMemo(() => applyCut(abc.rows, false), [abc.rows])
  const deadShown = useMemo(() => applyCut(dead, false), [dead])
  const qaimeShown = useMemo(() => applyCut(qaime, false), [qaime])

  const deadKpis = useMemo(() => deadStockKpis(dead), [dead])
  const abcKpiRows = useMemo(() => abcKpis(abc.rows), [abc.rows])
  const qaimeCols = useMemo(() => selectedColumns(qaimeSel), [qaimeSel])
  const totalOperational = indexes.operational.length

  function onPrint() {
    /* printHead() stamps at PRINT time, then prints after the legacy 60ms
       (index.html:6732). The stamp is the caller's, per PrintHead's contract. */
    setPrintStamp(new Date())
    setTimeout(() => window.print(), 60)
  }

  return <>
    <PrintHead
      title={printTitle(name)}
      userName={me.name}
      note={nf(printRowCount(matrix)) + ' sətir'}
      stampedAt={printStamp}
    />

    <div className="phead">
      <div>
        <h2>Hesabatlar</h2>
        <p>Hesabatlar hər əməliyyatdan sonra dərhal yenilənir.</p>
      </div>
      <div className="sp" />
      <select
        aria-label="Hesabat"
        data-testid="rep-pick"
        style={{ width: 'auto', minWidth: 250 }}
        value={kind}
        onChange={(e) => setKind(e.target.value as ReportKind)}
      >
        {REPORT_KINDS.map((k) => <option key={k} value={k}>{REPORT_LABELS[k]}</option>)}
      </select>
      <Button variant="secondary" data-testid="rep-exp" onClick={() => xls(matrix, name)}>Excel</Button>
      <Button variant="secondary" data-testid="rep-print" onClick={onPrint}>Çap</Button>
    </div>

    {/* Only `qaime` populates the filter strip; every other branch clears it
        (index.html:6739), so it is simply not rendered (M14-88). */}
    {loaded && kind === 'qaime' && (
      <div className="filters" data-testid="rep-filters">
        <div className="hint" style={{ marginBottom: 6 }}>Göstəriləcək sütunlar:</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 14px' }}>
          {QAIME_COLS.map((c) => (
            <label key={c.k} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, cursor: 'pointer' }}>
              <input
                type="checkbox"
                data-qc={c.k}
                checked={qaimeSel[c.k]}
                onChange={() => toggleQaimeColumn(c.k)}
              />
              {c.t}
            </label>
          ))}
        </div>
      </div>
    )}

    {loading && !loaded && (
      <div className="empty" data-testid="rep-loading"><b>Yüklənir…</b>Hesabat məlumatları Supabase-dən oxunur.</div>
    )}
    {error && !loaded && (
      <div className="empty" data-testid="rep-load-error"><b>Yükləmə xətası</b>{error}</div>
    )}
    {/* M14-14 — a failed REFRESH keeps the previous snapshot and only flags it. */}
    {error && loaded && (
      <div className="hint" data-testid="rep-refresh-error">
        <span className="tag t-rm">Yenilənmədi</span> {error}
      </div>
    )}

    {loaded && <div data-testid="rep-out">
      {kind === 'knt' && (
        <div className="grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
          <div className="card">
            <header><h3>Dəyərə görə ilk 12 kontragent</h3></header>
            <div className="pad"><BarChart data={partnerTopBars(knt)} fmt={money} /></div>
          </div>
          {/* M18-03 — legacy gives this card a «Tam siyahı» header
              (index.html:6749), matching the «Dəyərə görə ilk 12 kontragent»
              header beside it. It was dropped when the report was migrated,
              leaving the right-hand card headerless and visually unbalanced
              against its own pair. */}
          <div className="card"><header><h3>Tam siyahı</h3></header><div className="tw" data-testid="rep-knt">
            {knt.length === 0 ? <EmptyRows /> : <table>
              <thead><tr>
                <th>Kontragent / Layihə</th><th>VÖEN</th><th className="r">Əməliyyat</th>
                <th className="r">Mədaxil</th><th className="r">Məxaric</th><th className="r">Dəyər</th>
              </tr></thead>
              <tbody>{knt.map((r) => (
                <tr key={r.name}>
                  <td>{r.name}</td>
                  <td>{r.voen ? <span className="code">{r.voen}</span> : <span className="muted">—</span>}</td>
                  <td className="num">{nf(r.n)}</td>
                  <td className="num">{nf(r.in, 2)}</td>
                  <td className="num">{nf(r.out, 2)}</td>
                  <td className="num">{money(r.val)}</td>
                </tr>
              ))}</tbody>
            </table>}
          </div></div>
        </div>
      )}

      {kind === 'type' && (
        <div className="card"><div className="tw" data-testid="rep-type">
          {type.length === 0 ? <EmptyRows /> : <table>
            <thead><tr>
              <th>Əməliyyat növü</th><th className="r">Qeyd sayı</th><th className="r">Mədaxil miqdarı</th>
              <th className="r">Məxaric miqdarı</th><th className="r">Dəyər</th><th>Payı</th>
            </tr></thead>
            <tbody>{type.map((r) => (
              <tr key={r.type}>
                <td><span className={'tag ' + typeTagClass(r.type)}>{r.type}</span></td>
                <td className="num">{nf(r.n)}</td>
                <td className="num">{nf(r.in, 2)}</td>
                <td className="num">{nf(r.out, 2)}</td>
                <td className="num">{money(r.val)}</td>
                <td><div className="bar"><i style={{ width: typeSharePercent(r.n, totalOperational) + '%' }} /></div></td>
              </tr>
            ))}</tbody>
          </table>}
        </div></div>
      )}

      {kind === 'wh' && (
        <div className="card"><div className="tw" data-testid="rep-wh">
          {wh.length === 0 ? <EmptyRows /> : <table>
            <thead><tr>
              <th>Anbar</th><th className="r">Aktiv mövqe</th><th className="r">Mədaxil</th>
              <th className="r">Məxaric</th><th className="r">Dövriyyə %</th>
              <th className="r">Qalıq dəyəri</th><th className="r">Mənfi qalıq</th>
            </tr></thead>
            <tbody>{wh.map((r) => (
              <tr key={r.w}>
                <td><b>{whLabel(r.w)}</b></td>
                <td className="num">{nf(r.pos)}</td>
                <td className="num">{nf(r.in, 2)}</td>
                <td className="num">{nf(r.out, 2)}</td>
                <td className="num">{turnoverPercent(r)}</td>
                <td className="num">{money(r.val)}</td>
                <td className="num">{r.neg ? <span className="neg">{nf(r.neg)}</span> : '0'}</td>
              </tr>
            ))}</tbody>
          </table>}
        </div></div>
      )}

      {kind === 'per' && <>
        <div className="card">
          <header><h3>Günlük əməliyyat sayı</h3></header>
          <div className="pad"><Sparkline points={spark} /></div>
        </div>
        <div className="card" style={{ marginTop: 12 }}><div className="tw" data-testid="rep-per">
          {per.length === 0 ? <EmptyRows /> : <table>
            <thead><tr>
              <th>Ay</th><th className="r">Əməliyyat</th><th className="r">Mədaxil</th>
              <th className="r">Məxaric</th><th className="r">Mədaxil dəyəri</th>
            </tr></thead>
            <tbody>{per.map((r) => (
              <tr key={r.month}>
                <td>{fmtM(r.month)}</td>
                <td className="num">{nf(r.n)}</td>
                <td className="num">{nf(r.in, 2)}</td>
                <td className="num">{nf(r.out, 2)}</td>
                <td className="num">{money(r.val)}</td>
              </tr>
            ))}</tbody>
          </table>}
        </div></div>
      </>}

      {kind === 'abc' && <>
        <div className="kpis">{abcKpiRows.map((k) => (
          <Kpi
            key={k.cls}
            label={`${k.cls} sinfi — ${ABC_KPI_SUFFIX[k.cls]}`}
            value={nf(k.count)}
            sub={money(k.value)}
            cls={ABC_KPI_CLASS[k.cls]}
          />
        ))}</div>
        <p className="hint" style={{ margin: '10px 0' }}>
          A sinfi mallar üzrə inventarizasiya rüblük, B üzrə yarımillik, C üzrə illik aparılması tövsiyə olunur. Nəzarət səyi dəyərlə mütənasib olmalıdır.
        </p>
        <div className="card"><div className="tw" data-testid="rep-abc">
          {abcShown.length === 0 ? <EmptyRows /> : <table>
            <thead><tr>
              <th>Sinif</th><th>Kod</th><th>Mal</th><th>Anbar</th>
              <th className="r">Qalıq</th><th className="r">Dəyər</th><th className="r">Kumulyativ pay</th>
            </tr></thead>
            <tbody>{abcShown.map((r) => (
              <tr className="clk" key={r.b.w + '|' + r.b.c} onClick={() => setCardCode(r.b.c)}>
                <td><span className={'tag ' + ABC_TAG_CLASS[r.cls]}>{r.cls}</span></td>
                <td><span className="code">{r.b.c}</span></td>
                <td><div className="nm">{r.b.name}</div></td>
                <td>{r.b.w}</td>
                <td className="num">{nf(r.b.q, 2)}</td>
                <td className="num">{money(r.b.val)}</td>
                <td className="num">{abcScreenPercent(r, abc.tot)}</td>
              </tr>
            ))}</tbody>
          </table>}
          {/* M14-59 / D-P2 — stale legacy copy, reproduced verbatim. */}
          <div className="pad hint">{ABC_STALE_HINT}</div>
        </div></div>
      </>}

      {kind === 'dead' && <>
        <div className="kpis">
          <Kpi label="Hərəkətsiz mövqe" value={nf(deadKpis.positions)} sub="30 gündən çox" cls="o" />
          <Kpi label="Dondurulmuş dəyər" value={money(deadKpis.value)} sub="dövriyyədən kənar vəsait" cls="r" />
          <Kpi label="Heç istifadə olunmayıb" value={nf(deadKpis.neverUsed)} sub="yalnız mədaxil olub" />
        </div>
        <div className="card" style={{ marginTop: 12 }}><div className="tw" data-testid="rep-dead">
          {deadShown.length === 0 ? <EmptyRows /> : <table>
            <thead><tr>
              <th>Kod</th><th>Mal</th><th>Anbar</th><th className="r">Qalıq</th>
              <th className="r">Dəyər</th><th>Son hərəkət</th><th className="r">Gün</th><th>Status</th>
            </tr></thead>
            <tbody>{deadShown.map(({ balance: b, days, moved }) => (
              <tr className="clk" key={b.w + '|' + b.c} onClick={() => setCardCode(b.c)}>
                <td><span className="code">{b.c}</span></td>
                <td><div className="nm">{b.name}</div></td>
                <td>{b.w}</td>
                <td className="num">{nf(b.q, 2)}</td>
                <td className="num">{money(b.val)}</td>
                <td>{fmtD(b.last)}</td>
                <td className="num">{nf(days)}</td>
                <td><span className={'tag ' + (moved ? 't-mut' : 't-rm')}>{moved ? 'hərəkətsiz' : 'istifadəsiz'}</span></td>
              </tr>
            ))}</tbody>
          </table>}
        </div></div>
      </>}

      {kind === 'tr' && (
        <div className="card">
          <header><h3>Anbarlararası axın</h3></header>
          <div className="tw" data-testid="rep-tr">
            {tr.length === 0 ? <EmptyRows text={TRANSFER_EMPTY} /> : <table>
              <thead><tr>
                <th>Haradan</th><th>Hara</th><th className="r">Əməliyyat</th>
                <th className="r">Miqdar</th><th className="r">Dəyər</th>
              </tr></thead>
              <tbody>{tr.map((r) => (
                <tr key={r.from + '→' + r.to}>
                  <td><b>{r.from}</b></td>
                  <td><b>{r.to}</b></td>
                  <td className="num">{nf(r.n)}</td>
                  <td className="num">{nf(r.q, 2)}</td>
                  <td className="num">{money(r.val)}</td>
                </tr>
              ))}</tbody>
            </table>}
          </div>
          <div className="pad hint">
            Yerdəyişmə hər iki anbarda cüt qeyd yaratmalıdır. Cütü olmayan qeydlər «Nəzarət və risklər» bölməsində göstərilir.
          </div>
        </div>
      )}

      {kind === 'qaime' && <>
        <div className="hint" style={{ marginBottom: 10 }}>
          {nf(qaime.length)} qaimə (sənəd birləşməsi) · {QAIME_SOURCE_NOTE}
          {' '}Bir Qaimə № bir neçə Sənəd № altında ola bilər — eyni göndərişin bir neçə əməliyyatla yazılması halında (bax: Nəzarət bölməsi).
        </div>
        <div className="card"><div className="tw" data-testid="rep-qaime">
          {qaimeShown.length === 0 ? <EmptyRows text={QAIME_EMPTY} /> : <table>
            <thead><tr>
              {QAIME_FIXED_HEADER.map((t) => <th key={t}>{t}</th>)}
              {qaimeCols.map((c) => <th key={c.k} className={isNumericColumn(c.k) ? 'r' : ''}>{c.t}</th>)}
            </tr></thead>
            <tbody>{qaimeShown.map((g) => (
              <tr key={g.iv + '|' + g.doc}>
                <td><span className="code">{g.iv}</span></td>
                <td><span className="code">{g.doc}</span></td>
                {qaimeCols.map((c) => {
                  if (c.k === 'type') {
                    return <td key={c.k}>{Array.from(g.types).map((t) => (
                      <span key={t} className={'tag ' + typeTagClass(t)}>{t}</span>
                    ))}</td>
                  }
                  if (c.k === 'date') return <td key={c.k}>{dateCell(g, true)}</td>
                  if (c.k === 'lines') return <td key={c.k} className="num">{nf(g.n)}</td>
                  if (c.k === 'qty') return <td key={c.k} className="num">{nf(g.qty, 2)}</td>
                  if (c.k === 'val') return <td key={c.k} className="num">{money(g.val)}</td>
                  const text = screenCell(g, c.k)
                  return <td key={c.k}>{text === '—' ? <span className="muted">—</span> : text}</td>
                })}
              </tr>
            ))}</tbody>
          </table>}
        </div></div>
      </>}
    </div>}

    {cardCode && (
      <ItemCard
        code={cardCode}
        items={items}
        indexes={indexes}
        me={me}
        warehouses={warehouses}
        onEdit={(c) => onEditItem?.(c)}
        onOperation={(c) => onOpenOperation?.(c)}
        onClose={() => setCardCode(null)}
      />
    )}
  </>
}
