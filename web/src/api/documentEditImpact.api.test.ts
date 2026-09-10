import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('./supabase', () => ({ supabase: { rpc: vi.fn() } }))

import { supabase } from './supabase'
import { fetchDocumentEditImpact } from './documentEditImpact.api'

beforeEach(() => vi.clearAllMocks())

describe('fetchDocumentEditImpact — M7-109, M7-114', () => {
  it('passes the document number and reads the editable payload', async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({
      data: {
        editable: true, blocks: [], type: 'Satınalma', direction: 'in',
        lines: [{ date: '2026-09-01', warehouse: 'Elet', code: 'A', type: 'Satınalma',
                  in_qty: 3, out_qty: 0, partner: 'K', channel: '', contract: '',
                  invoice: '1', price: 5, note: '' }],
        export_warning: 'Excel ixracı sistemdə qeyd edilmir',
      },
      error: null,
    } as never)

    const r = await fetchDocumentEditImpact('SND-1')
    expect(supabase.rpc).toHaveBeenCalledWith('document_edit_impact', { p_doc_num: 'SND-1' })
    expect(r.ok).toBe(true)
    expect(r.editable).toBe(true)
    expect(r.type).toBe('Satınalma')
    expect(r.direction).toBe('in')
    expect(r.lines).toHaveLength(1)
    expect(r.exportWarning).toBe('Excel ixracı sistemdə qeyd edilmir')
  })

  it('reads a non-editable document with its block list', async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({
      data: {
        editable: false,
        blocks: [
          { code: 'transfer', message: 'Yerdəyişmə sənədi bu yolla redaktə edilmir' },
          { code: 'later_movement', message: 'Bu sənəddən sonra əməliyyat aparılıb' },
        ],
      },
      error: null,
    } as never)
    const r = await fetchDocumentEditImpact('SND-T')
    expect(r.ok).toBe(true)
    expect(r.editable).toBe(false)
    expect(r.blocks).toHaveLength(2)
    expect(r.blocks[0].code).toBe('transfer')
  })

  /* ADMIN ONLY — the refusal must be surfaced, never swallowed into an
     "empty" result that would look like a document with no lines. */
  it('surfaces the admin-only refusal instead of returning an empty document', async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({
      data: null,
      error: { message: 'İcazə yoxdur: sənədi yalnız Admin redaktə edə bilər (rol: anbardar)' },
    } as never)
    const r = await fetchDocumentEditImpact('SND-1')
    expect(r.ok).toBe(false)
    expect(r.error).toContain('yalnız Admin redaktə edə bilər')
    expect(r.editable).toBe(false)
  })

  it('surfaces an unknown-document refusal', async () => {
    vi.mocked(supabase.rpc)
      .mockResolvedValue({ data: null, error: { message: 'Sənəd tapılmadı: SND-X' } } as never)
    expect((await fetchDocumentEditImpact('SND-X')).error).toBe('Sənəd tapılmadı: SND-X')
  })

  it('absorbs a rejected promise', async () => {
    vi.mocked(supabase.rpc).mockRejectedValue(new Error('network') as never)
    const r = await fetchDocumentEditImpact('SND-1')
    expect(r.ok).toBe(false)
    expect(r.error).toBe('network')
  })

  it('tolerates missing arrays in the payload', async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({ data: { editable: true }, error: null } as never)
    const r = await fetchDocumentEditImpact('SND-1')
    expect(r.blocks).toEqual([])
    expect(r.lines).toEqual([])
  })

  it('treats anything but true as not editable', async () => {
    vi.mocked(supabase.rpc)
      .mockResolvedValue({ data: { editable: 'yes' }, error: null } as never)
    expect((await fetchDocumentEditImpact('SND-1')).editable).toBe(false)
  })

  it('never throws', async () => {
    vi.mocked(supabase.rpc).mockRejectedValue('x' as never)
    await expect(fetchDocumentEditImpact('SND-1')).resolves.toBeDefined()
  })
})
