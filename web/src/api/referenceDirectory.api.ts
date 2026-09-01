import { supabase } from './supabase'
import type { Json } from '../types/database'

export type ReferenceKind = 'channel' | 'partner' | 'warehouse' | 'location' | 'unit' | 'category' | 'project' | 'serfiyyat_channel'
export type ReferenceAction = 'create' | 'update' | 'deactivate' | 'activate' | 'delete'

export interface ManageReferenceMeta {
  voen?: string
  contract?: string
  contract_date?: string
  linked_warehouse?: string
}

export interface ManageReferenceResult {
  ok: boolean
  kind: string
  action: string
  id: string
  cascaded_rows: number
}

export async function manageReference(
  kind: ReferenceKind,
  action: ReferenceAction,
  id: string | null,
  name: string | null,
  meta: ManageReferenceMeta = {},
): Promise<{ data: ManageReferenceResult | null; error: { message: string } | null }> {
  const { data, error } = await supabase.rpc('manage_reference', {
    p_kind: kind,
    p_action: action,
    // The generated Args type omits `| null` for p_id/p_name even though the
    // live RPC accepts NULL (BUG_REGISTRY C-15 fix confirmed p_id takes a
    // stringified id or null). Cast is type-only — the null value passed by
    // callers is preserved unchanged at runtime.
    p_id: id as string | undefined,
    p_name: name as string | undefined,
    p_meta: meta as Json,
  })
  return { data: (data as unknown as ManageReferenceResult) ?? null, error }
}
