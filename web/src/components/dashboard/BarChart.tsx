import type { BarDatum } from '../../lib/dashboard'
import { barMax, barWidth } from '../../lib/dashboardCharts'
import { nf } from '../../lib/format'

/* barChart() — index.html:1368-1381, as JSX with the same class names,
   inline styles and `title` attribute (M11-31). `max` is never below 1, so
   an all-zero series renders empty bars rather than dividing by zero; the
   width keeps the legacy `toFixed(1)` string. The label is `d.k` as given —
   the dashboard passes the RAW warehouse name (1559), no alias. */

interface Props {
  data: readonly BarDatum[]
  /** `opt.fmt` — the dashboard passes `money`. Default `nf(v, 0)` (1371). */
  fmt?: (v: number) => string
}

export function BarChart({ data, fmt }: Props) {
  const max = barMax(data)
  const fmtv = fmt ?? ((v: number) => nf(v, 0))
  return (
    <div style={{ display: 'grid', gap: 9 }} data-testid="bar-chart">
      {data.map((d) => (
        <div key={d.k} data-bar={d.k}>
          <div style={{ display: 'flex', gap: 8, fontSize: 12, marginBottom: 3 }}>
            <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={d.k}>{d.k}</span>
            <span className="num" style={{ fontWeight: 650 }}>{fmtv(d.v)}</span>
            {d.sub ? <span className="muted" style={{ minWidth: 64, textAlign: 'right' }}>{d.sub}</span> : null}
          </div>
          <div className="bar"><i style={{ width: barWidth(d.v, max), background: d.color || 'var(--steel)' }} /></div>
        </div>
      ))}
    </div>
  )
}
