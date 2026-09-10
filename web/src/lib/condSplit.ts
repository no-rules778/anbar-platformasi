/* Condition split («tiplərə görə bölgü») — index.html:2060-2145.

   A balance line is divided into buckets: each marker is its own bucket and
   whatever is left is «Normal». When goods LEAVE a warehouse the user states
   explicitly how much came out of each bucket — the system never guesses.

   «İcarədə» differs from the other markers in that the SERVER maintains it:
   an «İcarə» inbound raises it and an outbound «Qaytarma» lowers it (sql/031).
   Manual correction stays possible because documents cannot cover every case. */

export interface CondColumn {
  k: CondKey
  t: string
}

export type CondKey = 'unfit' | 'repair' | 'onsite' | 'icare'
export type SplitKey = CondKey | 'normal'

/** index.html:2068-2073 — order is the display order. */
export const COND_COLS: readonly CondColumn[] = [
  { k: 'unfit', t: 'Yararsız' },
  { k: 'repair', t: 'Təmirə ehtiyaclı' },
  { k: 'onsite', t: 'Sahədə' },
  { k: 'icare', t: 'İcarədə' },
]

/** A stored `stock_conditions` row, keyed by warehouse|code. */
export interface CondRecord {
  unfit: number
  repair: number
  onsite: number
  icare: number
}

export type CondSplit = Record<SplitKey, number>

export interface CondBuckets extends Record<CondKey, number> {
  normal: number
  keys: CondKey[]
  marked: boolean
}

const num = (v: unknown): number => {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

/**
 * `condBuckets(w, code, avail, pend)` — index.html:2087-2101.
 *
 * Each marker bucket is its stored quantity minus what draft lines already
 * hold, clamped to the available balance; `normal` is the remainder and is
 * never negative. Markers CAN exceed the balance — `set_stock_condition` only
 * warns — which is exactly why each bucket is clamped individually.
 *
 * `marked` decides whether the split UI appears at all. That makes an absent
 * `cond` record indistinguishable from "nothing is marked", which is safe only
 * because a FAILED stock_conditions read is fatal upstream (M7-S3): without
 * that gate this function would silently post rented stock as normal.
 */
export function condBuckets(
  cond: CondRecord | null | undefined,
  avail: number,
  pending?: Partial<Record<CondKey, number>> | null,
): CondBuckets {
  const cd = cond ?? null
  const p = pending ?? {}
  const out = { keys: [] as CondKey[], marked: false } as CondBuckets
  let sum = 0
  for (const cc of COND_COLS) {
    const v = Math.max(0, num(cd?.[cc.k]) - num(p[cc.k]))
    out[cc.k] = +Math.min(v, avail).toFixed(4)
    if (out[cc.k] > 1e-9) {
      out.keys.push(cc.k)
      out.marked = true
    }
    sum += v
  }
  out.normal = +Math.max(0, avail - sum).toFixed(4)
  return out
}

/** A draft line as the bucket maths sees it. */
export interface PendingLine {
  kind: string
  w: string
  c: string
  cond?: Partial<CondSplit> | null
}

/**
 * `condPending(w, code)` — index.html:2102-2110.
 *
 * Bucket-by-bucket total already held by draft lines on this warehouse+item.
 * Without it the same «İcarədə 3» could be taken twice across two draft lines:
 * the form would allow it and the server would reject the whole document.
 */
export function condPending(
  lines: readonly PendingLine[],
  w: string,
  code: string,
): Partial<Record<CondKey, number>> {
  const p: Partial<Record<CondKey, number>> = {}
  for (const l of lines) {
    if (l.kind === 'in' || l.w !== w || l.c !== code || !l.cond) continue
    for (const cc of COND_COLS) {
      p[cc.k] = (p[cc.k] ?? 0) + num(l.cond[cc.k])
    }
  }
  return p
}

/** `condSplitZero()` — index.html:2111-2115. */
export function condSplitZero(): CondSplit {
  const s = { normal: 0 } as CondSplit
  for (const cc of COND_COLS) s[cc.k] = 0
  return s
}

/** `condSplitSum(s)` — index.html:2116-2117. Includes `normal`. */
export function condSplitSum(s: Partial<CondSplit> | null | undefined): number {
  const base = num(s?.normal)
  return +COND_COLS.reduce((a, cc) => a + num(s?.[cc.k]), base).toFixed(4)
}

/**
 * `condSplitPayload(split)` — index.html:2121-2128.
 *
 * ONLY the marker buckets above zero. `normal` is deliberately NOT sent: the
 * server derives it by subtracting the markers from the balance, and writing it
 * too would create a second source of truth for the same number.
 */
export function condSplitPayload(
  split: Partial<CondSplit> | null | undefined,
): Partial<Record<CondKey, number>> | null {
  const out: Partial<Record<CondKey, number>> = {}
  for (const cc of COND_COLS) {
    const v = num(split?.[cc.k])
    if (v > 1e-9) out[cc.k] = +v.toFixed(4)
  }
  return Object.keys(out).length ? out : null
}

/** index.html:2129-2133. Shown when the server cannot store a split. */
export const SPLIT_UNSUPPORTED_MSG =
  'Tiplərə görə bölgü serverdə hələ aktiv deyil (sql/031 tətbiq edilməyib) — '
  + 'bölgü yazılmadan sənəd qeyd edilsəydi, işarələr mənbədə qalardı. '
  + 'İşarəli malı seçimdən çıxarın və ya migrasiyanı tətbiq edin.'

export interface SplitCheck {
  ok: boolean
  error?: string
}

/** `condSplitCheck(split, buckets)` — index.html:2134-2145. */
export function condSplitCheck(
  split: Partial<CondSplit> | null | undefined,
  buckets: CondBuckets,
): SplitCheck {
  const all: { k: SplitKey; t: string }[] = [{ k: 'normal', t: 'Normal' }, ...COND_COLS]
  for (const cc of all) {
    const v = num(split?.[cc.k])
    if (v < 0) return { ok: false, error: `${cc.t}: miqdar mənfi ola bilməz` }
    if (v > num(buckets[cc.k]) + 1e-9) {
      return {
        ok: false,
        error: `${cc.t} statuslu mal kifayət deyil. Mövcud: ${fmt2(num(buckets[cc.k]))}`,
      }
    }
  }
  if (!(condSplitSum(split) > 1e-9)) {
    return { ok: false, error: 'Ən azı bir tipdən miqdar göstərin' }
  }
  return { ok: true }
}

/* The message embeds nf(v, 2); importing format.ts here would drag a
   presentation module into the write path, so the same az-AZ formatting is
   produced locally and pinned by a test against nf(). */
function fmt2(v: number): string {
  return v.toLocaleString('az-AZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

/** Key of the `stock_conditions` map — `w + '|' + c` (index.html:2074). */
export const condKey = (w: string, c: string): string => `${w}|${c}`
