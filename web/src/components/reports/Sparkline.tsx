import { sparklinePath, type SparkPoint } from '../../lib/sparkline'
import { nf } from '../../lib/format'

/* `sparkline()` — index.html:1397-1408. M14-48 … M14-50.

   The legacy helper returns an SVG string; JSX renders the elements, so the
   geometry lives in `lib/sparkline.ts` (testable without a DOM) and this file
   is the markup only.

   An EMPTY point set renders NOTHING at all — not an empty chart frame
   (M14-50): legacy returns `''` before building any element. */

interface Props {
  points: readonly SparkPoint[]
  width?: number
  height?: number
}

export function Sparkline({ points, width = 620, height = 90 }: Props) {
  if (!points.length) return null
  const { area, line, dots } = sparklinePath(points, width, height)

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="chart"
      preserveAspectRatio="none"
      style={{ height }}
      data-testid="sparkline"
    >
      <path d={area} fill="rgba(31,78,107,.10)" />
      <path d={line} fill="none" stroke="var(--steel)" strokeWidth="2" />
      {dots.map((d, i) => (
        <circle key={points[i].k + '|' + i} cx={d.cx} cy={d.cy} r="2.5" fill="var(--steel)">
          <title>{points[i].k}: {nf(points[i].v)}</title>
        </circle>
      ))}
    </svg>
  )
}
