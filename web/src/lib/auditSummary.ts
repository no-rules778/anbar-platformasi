import type { Json } from '../types/database'

/** The columns `auditSummary` reads. All are nullable in `audit_log` (M4-14). */
export interface AuditRowForSummary {
  action: string | null
  old_values: Json | null
  new_values: Json | null
}

/* auditVal (index.html:7097-7101) — a short, display-only rendering of one
   field's value. Never computes or mutates anything. */
function auditVal(v: unknown): string {
  if (v === null || v === undefined) return '—'
  if (typeof v === 'object') {
    try {
      return JSON.stringify(v).slice(0, 40)
    } catch {
      return '[obyekt]'
    }
  }
  return String(v).slice(0, 40)
}

/* auditSummary (index.html:7102-7118). DELETE lists up to 3 old keys, INSERT
   up to 4 new keys, UPDATE lists up to 6 keys whose value actually changed
   (compared by JSON.stringify, matching the original's own comparison, not a
   deep-equal library). Any other action, or a malformed row that makes the
   original throw inside its own try/catch, falls through to '—'. */
export function auditSummary(row: AuditRowForSummary): string {
  try {
    if (row.action === 'DELETE') {
      const o = (row.old_values && typeof row.old_values === 'object' ? row.old_values : {}) as Record<string, unknown>
      const keys = Object.keys(o).slice(0, 3)
      return keys.length ? 'Silindi: ' + keys.map((k) => `${k}=${auditVal(o[k])}`).join(', ') : 'Silindi'
    }
    if (row.action === 'INSERT') {
      const n = (row.new_values && typeof row.new_values === 'object' ? row.new_values : {}) as Record<string, unknown>
      const keys = Object.keys(n).slice(0, 4)
      return keys.length ? 'Yeni: ' + keys.map((k) => `${k}=${auditVal(n[k])}`).join(', ') : 'Yeni qeyd'
    }
    if (row.action === 'UPDATE') {
      const o = (row.old_values && typeof row.old_values === 'object' ? row.old_values : {}) as Record<string, unknown>
      const n = (row.new_values && typeof row.new_values === 'object' ? row.new_values : {}) as Record<string, unknown>
      const changed = Object.keys(n).filter((k) => JSON.stringify(n[k]) !== JSON.stringify(o[k]))
      return changed.length ? 'Dəyişdi: ' + changed.slice(0, 6).join(', ') : 'Dəyişiklik detalı yoxdur'
    }
  } catch {
    /* Unexpected shape — do not break the row, just show '—'. */
  }
  return '—'
}
