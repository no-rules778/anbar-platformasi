/* Stock-layer allocation maths — index.html:3686-3716, 4318-4403.

   When layer accounting is active every outbound quantity must be attributed to
   real inbound layers. The dialogs differ (single draft line vs. bulk row) but
   the arithmetic is identical, so it lives here once. */

export interface StockLayer {
  id: string
  source_type: string
  source_movement_id?: string | null
  received_date: string | null
  source_doc_num: string
  source_invoice_num: string
  /** 'unknown' means the layer carries no usable price. */
  price_status: string
  unit_price: number | null
  available_qty: number
}

export interface Allocation {
  layer_id: string
  qty: number
}

export interface LayerCalc {
  allocations: Allocation[]
  qty: number
  knownAmount: number
  unknownQty: number
  /** null when ANY selected quantity has no price — the total is unknowable. */
  sourceAmount: number | null
}

const num = (v: unknown): number => {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

/**
 * `draftLayerCalc()` / `bulkLayerCalc()` — index.html:3689-3691, 4373-4380.
 * The two originals are the same function; they are unified here.
 *
 * A layer whose `price_status` is 'unknown' contributes QUANTITY but no amount,
 * and its presence makes `sourceAmount` null: a partial total would read as a
 * complete one.
 */
export function layerCalc(
  selection: ReadonlyMap<string, number>,
  layers: readonly StockLayer[],
): LayerCalc {
  let known = 0
  let unknown = 0
  const allocations: Allocation[] = []
  for (const [id, q0] of selection) {
    const q = num(q0)
    const l = layers.find((x) => x.id === id)
    if (!l || !(q > 0)) continue
    allocations.push({ layer_id: id, qty: +q.toFixed(4) })
    if (l.price_status === 'unknown') unknown += q
    else known += Math.round(q * num(l.unit_price) * 100) / 100
  }
  return {
    allocations,
    qty: selectedQty(selection),
    knownAmount: +known.toFixed(2),
    unknownQty: +unknown.toFixed(4),
    sourceAmount: unknown > 0 ? null : +known.toFixed(2),
  }
}

/** index.html:3688, 4372. Includes rows whose layer has since disappeared. */
export function selectedQty(selection: ReadonlyMap<string, number>): number {
  return Array.from(selection.values()).reduce((s, q) => s + num(q), 0)
}

/** index.html:4404-4409. */
export function layerSourceLabel(l: Pick<StockLayer, 'source_type'>): string {
  if (l.source_type === 'legacy_unresolved') return 'Köhnə qalıq · mənbə dəqiqləşməyib'
  if (l.source_type === 'legacy_adjustment') return 'Tarixi bərpa'
  if (l.source_type === 'transfer') return 'Yerdəyişmə partiyası'
  return 'Mədaxil partiyası'
}

/** The tolerance both dialogs use when comparing sums (3708, 4392). */
export const LAYER_QTY_TOLERANCE = 0.00005

/** True when the selected layers add up to the required quantity. */
export function layerQtyMatches(selected: number, required: number): boolean {
  return Math.abs(selected - required) <= LAYER_QTY_TOLERANCE
}

/** index.html:3697, 4397. An admin's optional final amount. */
export const FINAL_AMOUNT_RE = /^\d{1,16}(?:\.\d{1,2})?$/

export interface FinalAmountCheck {
  ok: boolean
  error?: string
}

/**
 * Validates the Admin final-amount override — index.html:3694-3700, 4395-4400.
 * A reason is MANDATORY whenever an amount is given.
 */
export function checkFinalAmount(finalAmount: string, reason: string): FinalAmountCheck {
  const amount = String(finalAmount ?? '').trim()
  if (amount && !FINAL_AMOUNT_RE.test(amount)) {
    return { ok: false, error: 'Yekun məbləğ düzgün deyil.' }
  }
  if (amount !== '' && !String(reason ?? '').trim()) {
    return { ok: false, error: 'Məbləğ dəyişikliyinin səbəbi tələb olunur.' }
  }
  return { ok: true }
}

/**
 * `priceVariants` — index.html:3705-3707.
 *
 * The DISTINCT source prices, sorted. No average is ever displayed: the source
 * layers can carry different prices and one blended figure would misrepresent
 * them.
 */
export function priceVariants(
  allocations: readonly Allocation[],
  layers: readonly StockLayer[],
): number[] {
  const vals = allocations
    .map((a) => {
      const l = layers.find((r) => r.id === a.layer_id)
      return l && l.price_status !== 'unknown' ? +num(l.unit_price).toFixed(2) : null
    })
    .filter((v): v is number => v != null)
  return Array.from(new Set(vals)).sort((a, b) => a - b)
}

/** index.html:3703-3704. The per-unit price shown for a layered line. */
export function layerUnitPrice(shownAmount: number | null, qty: number): number {
  if (shownAmount == null || !(qty > 0)) return 0
  return +(shownAmount / qty).toFixed(4)
}
