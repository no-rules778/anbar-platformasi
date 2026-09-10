import { supabase } from './supabase'
import type { StockLayer } from '../lib/layerAllocation'

/* Stock-layer capability and layer reads — index.html:949-975, 3673-3676.

   Live contracts, read from production-functions-2026-09-03.json:
     stock_layers_supported() → {version, active, cutover_at}
     get_stock_layers(p_warehouse, p_item_code) → {warehouse, code, revision,
       balance_qty, layers[]}, and it RAISES when layer accounting is inactive
       or when an anbardar asks about another warehouse.

   Both are OPTIONAL reads: a failed capability probe leaves the pre-layer flow
   working exactly as the original does (the try/catch at 949-975), and a failed
   `get_stock_layers` fails only the dialog that asked for it. */

export interface LayerCapability {
  ready: boolean
  active: boolean
  version: number
}

export const LAYERS_INACTIVE: LayerCapability = { ready: false, active: false, version: 0 }

/**
 * `stock_layers_supported()` — index.html:949-958.
 *
 * Never throws. A failure yields `ready:false, active:false`, which is the
 * legacy degraded state: the platform keeps working on the pre-layer path.
 */
export async function fetchLayerCapability(): Promise<LayerCapability> {
  try {
    const { data, error } = await supabase.rpc('stock_layers_supported')
    if (error || !data) return LAYERS_INACTIVE
    const d = data as { active?: unknown; version?: unknown }
    return {
      ready: true,
      active: d.active === true,
      version: Number(d.version ?? 0) || 0,
    }
  } catch {
    return LAYERS_INACTIVE
  }
}

export interface StockLayersResult {
  ok: boolean
  error: string | null
  revision: string
  layers: StockLayer[]
}

/**
 * `get_stock_layers(warehouse, code)` — index.html:3673-3676, 4322-4326.
 *
 * On failure the caller shows «Partiyalar yüklənmədi: <error>» and does NOT
 * open the dialog, so the line cannot be added — other lines are unaffected.
 */
export async function fetchStockLayers(
  warehouse: string,
  itemCode: string,
): Promise<StockLayersResult> {
  try {
    const { data, error } = await supabase.rpc('get_stock_layers', {
      p_warehouse: warehouse,
      p_item_code: itemCode,
    })
    if (error) {
      return { ok: false, error: error.message || 'server xətası', revision: '', layers: [] }
    }
    const d = (data ?? {}) as { revision?: unknown; layers?: unknown }
    return {
      ok: true,
      error: null,
      revision: String(d.revision ?? ''),
      layers: Array.isArray(d.layers) ? (d.layers as StockLayer[]) : [],
    }
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'server xətası',
      revision: '',
      layers: [],
    }
  }
}
