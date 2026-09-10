/* Local draft persistence — index.html:3765-3833.

   PROBLEM the original solved: `OP.lines` lived only in memory, so a dropped
   connection or a page reload lost every unposted line without trace.

   BOUNDARIES, all preserved here:
     · a draft is ONLY a draft — nothing is written to Supabase; a real movement
       still requires «Sənədi qeyd et»;
     · the key is per-user, so another user on the same device sees their own
       draft and never somebody else's;
     · it is cleared after a successful post and after «Təmizlə»;
     · a draft older than 7 days is NOT restored — it prevents accidentally
       posting a stale-dated document;
     · restoration re-checks permissions: lines for a warehouse the user no
       longer has are dropped. The binding refusal is still the server's. */

export const DRAFT_V = 1
export const DRAFT_TTL_MS = 7 * 24 * 60 * 60 * 1000
export const DRAFT_MAX_LINES = 2000

/** index.html:3790. */
export const draftKey = (userId: string | null | undefined): string =>
  'anbar_op_draft_' + (userId || 'anon')

export interface DraftLine {
  kind: string
  w: string
  c: string
  [k: string]: unknown
}

export interface DraftPayload {
  v: number
  ts: number
  kind: string
  lines: DraftLine[]
  hdr: unknown
  requestKey: string
}

/** index.html:3782-3787. Display-only stamp: dd.mm.yyyy hh:mm. */
export function draftStamp(ts: number): string {
  const d = new Date(ts)
  if (isNaN(d.getTime())) return '—'
  const p = (n: number) => String(n).padStart(2, '0')
  return `${p(d.getDate())}.${p(d.getMonth() + 1)}.${d.getFullYear()} `
    + `${p(d.getHours())}:${p(d.getMinutes())}`
}

/**
 * Whether a draft should be written at all — index.html:3798-3800.
 *
 * Edit mode NEVER stores a draft. If it did, a restored session would lose the
 * correction context and post the lines as a NEW document, leaving the original
 * uncancelled — a duplicate.
 */
export function shouldSaveDraft(lines: readonly unknown[], editMode: boolean): boolean {
  if (editMode) return false
  return lines.length > 0 && lines.length <= DRAFT_MAX_LINES
}

export function serialiseDraft(args: {
  kind: string
  lines: DraftLine[]
  hdr: unknown
  requestKey: string
  now?: number
}): DraftPayload {
  return {
    v: DRAFT_V,
    ts: args.now ?? Date.now(),
    kind: args.kind,
    lines: args.lines,
    hdr: args.hdr ?? null,
    requestKey: args.requestKey || '',
  }
}

export type RestoreResult =
  | { ok: false; reason: 'absent' | 'malformed' | 'version' | 'empty' | 'expired' | 'no-permission' }
  | { ok: true; kind: string; lines: DraftLine[]; hdr: unknown; requestKey: string; ts: number; dropped: number }

/**
 * `restoreDraft()` — index.html:3809-3833.
 *
 * Every rejection is explicit so the caller can clear the stored draft for the
 * right reason. `dropped` counts lines removed by the permission re-filter and
 * drives the toast's «N sətir icazə səbəbindən atıldı».
 */
export function restoreDraft(
  raw: string | null,
  allowedWarehouses: readonly string[],
  now: number = Date.now(),
): RestoreResult {
  if (!raw) return { ok: false, reason: 'absent' }
  let d: DraftPayload | null = null
  try {
    d = JSON.parse(raw) as DraftPayload
  } catch {
    return { ok: false, reason: 'malformed' }
  }
  if (!d || typeof d !== 'object') return { ok: false, reason: 'malformed' }
  if (d.v !== DRAFT_V) return { ok: false, reason: 'version' }
  if (!Array.isArray(d.lines) || !d.lines.length) return { ok: false, reason: 'empty' }
  if (!d.ts || now - d.ts > DRAFT_TTL_MS) return { ok: false, reason: 'expired' }

  const okWh = new Set(allowedWarehouses)
  const kept = d.lines.filter((l) => l && l.c && okWh.has(l.w))
  if (!kept.length) return { ok: false, reason: 'no-permission' }

  return {
    ok: true,
    kind: d.kind,
    lines: kept,
    hdr: d.hdr ?? null,
    requestKey: d.requestKey || '',
    ts: d.ts,
    dropped: d.lines.length - kept.length,
  }
}
