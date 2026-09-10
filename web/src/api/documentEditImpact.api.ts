import { supabase } from './supabase'

/* `document_edit_impact(p_doc_num)` — index.html:5140-5160.

   ADMIN ONLY — the live function raises «İcazə yoxdur: sənədi yalnız Admin
   redaktə edə bilər» for anybody else, so the refusal must be surfaced, not
   swallowed into an "empty" result.

   Read-only: it inspects the document and reports whether a correction is
   possible. It writes nothing. The blocks it can report include mixed types, a
   transfer document, an initial-balance document, an unsupported type, mixed
   direction, a reversal document, an already-cancelled document, a row whose
   item was replaced, and any later movement on the same warehouse+item. */

export interface EditImpactLine {
  date: string
  warehouse: string
  code: string
  type: string
  in_qty: number
  out_qty: number
  partner: string
  channel: string
  contract: string
  invoice: string
  price: number
  note: string
}

export interface EditImpactBlock {
  code: string
  message: string
}

export interface EditImpactResult {
  ok: boolean
  error: string | null
  editable: boolean
  blocks: EditImpactBlock[]
  lines: EditImpactLine[]
  type: string
  direction: string
  exportWarning: string
}

/**
 * Never throws; a server refusal arrives as `ok:false` with the message intact
 * so the caller can show it verbatim.
 */
export async function fetchDocumentEditImpact(docNum: string): Promise<EditImpactResult> {
  const empty = {
    editable: false,
    blocks: [] as EditImpactBlock[],
    lines: [] as EditImpactLine[],
    type: '',
    direction: '',
    exportWarning: '',
  }
  try {
    const { data, error } = await supabase.rpc('document_edit_impact', { p_doc_num: docNum })
    if (error) {
      return { ok: false, error: error.message || 'server xətası', ...empty }
    }
    const d = (data ?? {}) as Record<string, unknown>
    return {
      ok: true,
      error: null,
      editable: d.editable === true,
      blocks: Array.isArray(d.blocks) ? (d.blocks as EditImpactBlock[]) : [],
      lines: Array.isArray(d.lines) ? (d.lines as EditImpactLine[]) : [],
      type: String(d.type ?? ''),
      direction: String(d.direction ?? ''),
      exportWarning: String(d.export_warning ?? ''),
    }
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'server xətası',
      ...empty,
    }
  }
}
