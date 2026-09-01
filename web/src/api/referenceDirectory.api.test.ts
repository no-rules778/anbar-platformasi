import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('./supabase', () => ({ supabase: { rpc: vi.fn() } }))

import { supabase } from './supabase'
import { manageReference } from './referenceDirectory.api'

beforeEach(() => vi.clearAllMocks())

describe('manageReference', () => {
  it('calls manage_reference with p_-prefixed params', async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({ data: { ok: true, kind: 'warehouse', action: 'create', id: '1', cascaded_rows: 0 }, error: null } as never)
    const res = await manageReference('warehouse', 'create', null, 'TEST_REACT_MIGRATION', {})
    expect(supabase.rpc).toHaveBeenCalledWith('manage_reference', {
      p_kind: 'warehouse', p_action: 'create', p_id: null, p_name: 'TEST_REACT_MIGRATION', p_meta: {},
    })
    expect(res.data?.ok).toBe(true)
  })
  it('surfaces server errors (e.g. non-admin, or name locked) without throwing', async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({ data: null, error: { message: 'İcazə yoxdur: Sorğuçaları yalnız Admin idarə edir' } } as never)
    const res = await manageReference('warehouse', 'create', null, 'X', {})
    expect(res.error?.message).toMatch(/Admin/)
  })
})
