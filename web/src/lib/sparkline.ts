/* The pure geometry of `sparkline()` (index.html:1397-1408), kept out of the
   component so the path strings can be asserted without a DOM and the
   component file exports nothing but a component (fast-refresh rule) —
   the same split `lib/dashboardCharts.ts` uses for barChart/donut.

   M14-48 … M14-50. */

export interface SparkPoint {
  /** The point's label — the date, shown in the `<title>`. */
  k: string
  v: number
}

export interface SparklineGeometry {
  /** The filled area path, closed down to the baseline and back. */
  area: string
  /** The stroked line path. */
  line: string
  dots: { cx: string; cy: string }[]
}

/**
 * `sparkline(pts, w, h)` — index.html:1398-1407.
 *
 * Two details are load-bearing:
 *
 *  - the scale is `Math.max(...v, 1)`, so an all-zero series does not divide
 *    by zero and simply draws flat along the baseline (M14-49);
 *  - the step is `w / (n - 1)` for more than one point and `w` for exactly
 *    one, which is the other divide-by-zero guard — a single point would
 *    otherwise compute `w / 0` (M14-49).
 *
 * The vertical map is `h - v / max * (h - 10)`, leaving the legacy 10px of
 * head-room at the top. Coordinates are emitted at ONE decimal place, exactly
 * as the original's `toFixed(1)` does.
 *
 * The caller renders nothing at all for an empty set (M14-50); this function
 * is not called in that case.
 */
export function sparklinePath(
  pts: readonly SparkPoint[],
  w = 620,
  h = 90,
): SparklineGeometry {
  const max = Math.max(...pts.map((p) => p.v), 1)
  const step = pts.length > 1 ? w / (pts.length - 1) : w

  const x = (i: number): string => (i * step).toFixed(1)
  const y = (v: number): string => (h - v / max * (h - 10)).toFixed(1)

  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${x(i)} ${y(p.v)}`).join(' ')
  const area = line + ` L${w} ${h} L0 ${h} Z`

  return {
    area,
    line,
    dots: pts.map((p, i) => ({ cx: x(i), cy: y(p.v) })),
  }
}
