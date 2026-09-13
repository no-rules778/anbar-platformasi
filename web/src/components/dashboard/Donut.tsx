import type { DonutDatum } from '../../lib/dashboard'
import { donutSegments } from '../../lib/dashboardCharts'
import { nf } from '../../lib/format'

/* donut() — index.html:1382-1395 (M11-34, M11-35): the SVG with one path
   per type (legacy `<title>` text), then the legend rows with a 9 px swatch,
   the type name and the bold count. The geometry lives in
   lib/dashboardCharts.ts. */

export function Donut({ data }: { data: readonly DonutDatum[] }) {
  const segs = donutSegments(data)
  return (
    <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }} data-testid="donut">
      <svg viewBox="0 0 148 148" width="148" height="148" className="chart">
        {segs.map((s) => <path key={s.k} d={s.d} fill={s.color}><title>{s.k + ': ' + nf(s.v)}</title></path>)}
      </svg>
      <div style={{ flex: 1, minWidth: 150, display: 'grid', gap: 5 }} data-testid="donut-legend">
        {data.map((d) => (
          <div key={d.k} style={{ display: 'flex', gap: 7, fontSize: 12, alignItems: 'center' }}>
            <i style={{ width: 9, height: 9, borderRadius: 2, background: d.color }} />
            <span style={{ flex: 1 }}>{d.k}</span>
            <b className="num">{nf(d.v)}</b>
          </div>
        ))}
      </div>
    </div>
  )
}
