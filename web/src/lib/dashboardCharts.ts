import type { BarDatum, DonutDatum } from './dashboard'

/* The pure arithmetic of barChart() (index.html:1368-1381) and donut()
   (1382-1395), kept out of the component files so the components export
   nothing but components (fast-refresh rule) and the strings can be pinned
   before the CSSOM normalises them. */

/** `Math.max(1, ...v)` — index.html:1370. */
export const barMax = (data: readonly BarDatum[]): number => Math.max(1, ...data.map((d) => d.v))

/** `(d.v / max * 100).toFixed(1) + '%'` — index.html:1379. The CSSOM
    (browser and jsdom alike) normalises `100.0%` to `100%` on read-back, so
    the legacy string is only observable before it is applied. */
export const barWidth = (v: number, max: number): string => (v / max * 100).toFixed(1) + '%'

export interface DonutSegment {
  k: string
  v: number
  color: string
  d: string
}

const R = 62
const r = 38
const cx = 74
const cy = 74

/** The `<path d>` strings the legacy loop builds (1383-1391), in data order.
    `tot` falls back to 1 so an empty series yields no paths; a single type
    yields an arc whose end point equals its start point — reproduced, not
    fixed (proposal §7). */
export function donutSegments(data: readonly DonutDatum[]): DonutSegment[] {
  const tot = data.reduce((s, d) => s + d.v, 0) || 1
  let a = -Math.PI / 2
  return data.map((d) => {
    const ang = d.v / tot * Math.PI * 2, b = a + ang, big = ang > Math.PI ? 1 : 0
    const p = (rad: number, an: number): [number, number] => [cx + rad * Math.cos(an), cy + rad * Math.sin(an)]
    const [x1, y1] = p(R, a), [x2, y2] = p(R, b), [x3, y3] = p(r, b), [x4, y4] = p(r, a)
    const seg = { k: d.k, v: d.v, color: d.color, d: `M${x1} ${y1} A${R} ${R} 0 ${big} 1 ${x2} ${y2} L${x3} ${y3} A${r} ${r} 0 ${big} 0 ${x4} ${y4} Z` }
    a = b
    return seg
  })
}
