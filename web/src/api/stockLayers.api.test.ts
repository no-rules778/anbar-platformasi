import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('./supabase', () => ({ supabase: { rpc: vi.fn() } }))

import { supabase } from './supabase'
import { fetchLayerCapability, fetchStockLayers, LAYERS_INACTIVE } from './stockLayers.api'

beforeEach(() => vi.clearAllMocks())

const rpcOk = (data: unknown) => vi.mocked(supabase.rpc).mockResolvedValue({ data, error: null } as never)
const rpcErr = (message: string) =>
  vi.mocked(supabase.rpc).mockResolvedValue({ data: null, error: { message } } as never)
const rpcThrows = (err: unknown) => vi.mocked(supabase.rpc).mockRejectedValue(err as never)

describe('fetchLayerCapability — M7-71', () => {
  it('reads active + version from the probe', async () => {
    rpcOk({ version: 36, active: true, cutover_at: null })
    expect(await fetchLayerCapability()).toEqual({ ready: true, active: true, version: 36 })
  })

  it('reports inactive when the server says so', async () => {
    rpcOk({ version: 36, active: false })
    expect(await fetchLayerCapability()).toEqual({ ready: true, active: false, version: 36 })
  })

  it('treats anything but true as inactive', async () => {
    rpcOk({ version: 36, active: 'yes' })
    expect((await fetchLayerCapability()).active).toBe(false)
  })

  /* A failed probe leaves the pre-layer flow working — the legacy degraded
     state (index.html:949-975). */
  it('degrades to inactive on a returned error', async () => {
    rpcErr('function does not exist')
    expect(await fetchLayerCapability()).toEqual(LAYERS_INACTIVE)
  })

  it('degrades to inactive on a rejected promise', async () => {
    rpcThrows(new Error('network'))
    expect(await fetchLayerCapability()).toEqual(LAYERS_INACTIVE)
  })

  it('degrades to inactive on a null payload', async () => {
    rpcOk(null)
    expect(await fetchLayerCapability()).toEqual(LAYERS_INACTIVE)
  })

  it('never throws', async () => {
    rpcThrows('x')
    await expect(fetchLayerCapability()).resolves.toBeDefined()
  })
})

describe('fetchStockLayers — M7-72', () => {
  it('passes the warehouse and code, and returns revision + layers', async () => {
    rpcOk({ revision: 'r1', layers: [{ id: 'L1' }] })
    const r = await fetchStockLayers('Elet', '0000001')
    expect(supabase.rpc).toHaveBeenCalledWith('get_stock_layers', {
      p_warehouse: 'Elet', p_item_code: '0000001',
    })
    expect(r.ok).toBe(true)
    expect(r.revision).toBe('r1')
    expect(r.layers).toHaveLength(1)
  })

  /* The RPC raises when layers are inactive, and for an anbardar reading
     another warehouse — the message must survive verbatim. */
  it('surfaces a server refusal verbatim', async () => {
    rpcErr('İcazə yoxdur: yalnız öz anbarınızın partiyalarını görə bilərsiniz')
    const r = await fetchStockLayers('Ofis', 'A')
    expect(r.ok).toBe(false)
    expect(r.error).toBe('İcazə yoxdur: yalnız öz anbarınızın partiyalarını görə bilərsiniz')
    expect(r.layers).toEqual([])
  })

  it('surfaces the inactive-layers refusal', async () => {
    rpcErr('Partiya uçotu aktiv deyil')
    expect((await fetchStockLayers('Elet', 'A')).error).toBe('Partiya uçotu aktiv deyil')
  })

  it('absorbs a rejected promise', async () => {
    rpcThrows(new Error('socket closed'))
    const r = await fetchStockLayers('Elet', 'A')
    expect(r.ok).toBe(false)
    expect(r.error).toBe('socket closed')
  })

  it('falls back to a generic message', async () => {
    rpcThrows('plain')
    expect((await fetchStockLayers('Elet', 'A')).error).toBe('server xətası')
  })

  it('tolerates a missing layers array', async () => {
    rpcOk({ revision: 'r1' })
    const r = await fetchStockLayers('Elet', 'A')
    expect(r.ok).toBe(true)
    expect(r.layers).toEqual([])
  })

  it('never throws', async () => {
    rpcThrows(new Error('x'))
    await expect(fetchStockLayers('Elet', 'A')).resolves.toBeDefined()
  })
})
