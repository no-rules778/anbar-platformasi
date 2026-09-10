/* Draft-line validation — index.html:3455-3616.

   THE SINGLE VALIDATION SOURCE. `addLine()` (3617) and the draft-line editor
   `saveEditLine()` (3959) both call `validateOpLine()`; the original states
   explicitly that no second validation system exists (3456-3458). Any check
   added elsewhere would let one entry point accept what the other rejects.

   Check order is part of the contract (3463-3473) — the first failure decides
   the message the user sees:
     1. item exists                       code: 'item'
     2. quantity > 0                      code: 'qty'
     3. type valid for the tab            code: 'type'
     4. route / warehouse rights          code: 'route' | 'same-wh' | 'wh'
     5. initial balance is Admin-only     code: 'initbal'
     6. negative-stock ban (outbound)     code: 'stock' */

import { isTypeAllowed, type OpKind } from './opTypes'

export type ValidationCode = 'item' | 'qty' | 'type' | 'route' | 'same-wh' | 'wh' | 'initbal' | 'stock'

export interface OpLineInput {
  kind: OpKind
  t: string
  w: string
  w2?: string | null
  c: string
  q: number
  p?: string | null
  ch?: string | null
}

export interface ValidatedItem {
  code: string
  name: string
  unit: string
}

export type ValidationResult =
  | { ok: false; code: ValidationCode; error: string }
  | { ok: true; q: number; warn: string; item: ValidatedItem }

/* ---------- Historical opening balance — Admin only ----------
   index.html:1898-1929. «Əvvələ qalıq» + «Anbar qalığı» marks a pre-inventory
   opening balance: the row creates stock from nothing, so only an active Admin
   may write it. The marker counts in BOTH the counterparty and the channel
   field — same meaning, two fields.

   ⚠ The legacy comment claims the binding restriction lives in the database
   (sql/016, a BEFORE INSERT trigger on `movements`), and CLAUDE.md §12 says the
   same. The 2026-09-03 live capture contains NO function or trigger referencing
   «Anbar qalığı», and `post_movement_document` carries no such check. As of
   that capture this rule is CLIENT-ONLY (divergence H-D2). It is ported here
   verbatim and described honestly; closing the server gap is a separate,
   separately-approved migration. Do not describe this as server-enforced. */

/** index.html:1898-1902. */
export const INIT_BAL_PARTNERS: readonly string[] = [
  'Əvvələ anbar qalıqı',  // original Excel spelling
  'Əvvələ anbar qalığı',  // legacy Excel spelling
  'Anbar qalığı',         // confirmed current Supabase value
]

/** index.html:1903. */
export const INIT_BAL_TYPE = 'Əvvələ qalıq'

/** index.html:1929. */
export const INIT_BAL_ADMIN_ONLY_MSG =
  '«Əvvələ qalıq» + «Anbar qalığı» tarixi ilkin qalığı yalnız Admin yarada bilər.'

/** index.html:1907. NFKC + trim + lowercase — neutralises invisible
    production-data differences without changing letter identity. */
const normBase = (s: unknown): string =>
  String(s ?? '').normalize('NFKC').trim().toLowerCase()

/** index.html:1910. Partner matching additionally tolerates the ğ/q variant
    seen in legacy import labels. The TYPE stays strict — no ğ/q tolerance. */
const normPartner = (s: unknown): string => normBase(s).replace(/ğ/g, 'q')

const INIT_BAL_TYPE_NORM = normBase(INIT_BAL_TYPE)
const INIT_BAL_NORMS = new Set(INIT_BAL_PARTNERS.map(normPartner))

/** index.html:1926-1928. */
export function isInitialBalanceLine(
  type: unknown,
  partner: unknown,
  channel: unknown,
): boolean {
  return normBase(type) === INIT_BAL_TYPE_NORM
    && (INIT_BAL_NORMS.has(normPartner(partner)) || INIT_BAL_NORMS.has(normPartner(channel)))
}

/* ---------- Edit-mode restore ---------- */

/**
 * `editRestoreQty(w, c)` — index.html:3513-3515.
 *
 * While correcting a document its outbound quantities are still deducted from
 * the balance: the cancellation happens ONLY on the server, inside the same
 * transaction as the correction. So they are added back before the availability
 * check, or the document would cut its own lines. Outside edit mode this is
 * always 0 and nothing changes.
 */
export function editRestoreQty(
  restore: ReadonlyMap<string, number> | null | undefined,
  w: string,
  c: string,
): number {
  if (!restore) return 0
  return restore.get(`${w}|${c}`) ?? 0
}

export interface ValidateContext {
  /** Nomenclature lookup by code. */
  itemBy: ReadonlyMap<string, ValidatedItem>
  /** Balance for a warehouse+item, from IX.bal. */
  balanceOf: (w: string, c: string) => number
  /** Non-transfer warehouses the user may operate in — allowedWarehouses(). */
  allowedWarehouses: readonly string[]
  /** Transfer sources — D-H1: transferSourceWarehouses(). */
  transferSources: readonly string[]
  /** Transfer destinations — D-H1: transferDestWarehouses(). */
  transferDests: readonly string[]
  /** Every draft line already in the document. */
  lines: readonly OpLineInput[]
  isAdmin: boolean
  /** Edit-mode restore map, `w|c` → quantity. */
  restore?: ReadonlyMap<string, number> | null
}

export interface ValidateOptions {
  /** Index of the line being edited — excluded from the pending total. */
  skipIndex?: number | null
}

const num = (v: unknown): number => {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

/* nf(v, 2) inlined — see condSplit.ts for why formatting is not imported into
   the write path. Pinned against nf() by a test. */
const fmt2 = (v: number): string =>
  v.toLocaleString('az-AZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

/**
 * `validateOpLine(line, opts)` — index.html:3568-3616.
 *
 * Returns `{ok:false, code, error}` or `{ok:true, q, warn, item}`. The caller
 * appends its own context to the message text — both entry points do that
 * differently, and the difference is deliberate.
 *
 * A quantity larger than the availability is CLAMPED (with `warn`), not
 * rejected — except where a condition split is present, which the caller then
 * rejects instead (M7-31), because silently trimming would break the split sum.
 */
export function validateOpLine(
  line: OpLineInput,
  ctx: ValidateContext,
  opts: ValidateOptions = {},
): ValidationResult {
  const skip = opts.skipIndex == null ? -1 : opts.skipIndex

  const it = ctx.itemBy.get(line.c)
  if (!it) return { ok: false, code: 'item', error: 'Əvvəlcə malı seçin.' }

  if (!(line.q > 0)) {
    return { ok: false, code: 'qty', error: 'Miqdar sıfırdan böyük olmalıdır.' }
  }

  if (!isTypeAllowed(line.kind, line.t)) {
    return {
      ok: false,
      code: 'type',
      error: `Bu tab üçün etibarsız əməliyyat növü: "${line.t}".`,
    }
  }

  if (line.kind === 'mv') {
    if (!ctx.transferSources.includes(line.w)) {
      return {
        ok: false,
        code: 'route',
        error: `"${line.w}" anbarından yerdəyişmə etməyə icazəniz yoxdur.`,
      }
    }
    if (!ctx.transferDests.includes(line.w2 ?? '')) {
      return {
        ok: false,
        code: 'route',
        error: `"${line.w2 ?? ''}" anbarına yerdəyişmə etməyə icazəniz yoxdur.`,
      }
    }
    if (line.w === line.w2) {
      return { ok: false, code: 'same-wh', error: 'Mənbə və təyinat anbarı eyni ola bilməz.' }
    }
  } else if (!ctx.allowedWarehouses.includes(line.w)) {
    return {
      ok: false,
      code: 'wh',
      error: `"${line.w}" anbarında əməliyyat aparmağa icazəniz yoxdur.`,
    }
  }

  if (!ctx.isAdmin && isInitialBalanceLine(line.t, line.p, line.ch)) {
    return { ok: false, code: 'initbal', error: INIT_BAL_ADMIN_ONLY_MSG }
  }

  let q = line.q
  let warn = ''
  if (line.kind !== 'in') {
    const have = ctx.balanceOf(line.w, line.c)
    const pending = ctx.lines
      .filter((x, j) => j !== skip && x.c === line.c && x.w === line.w && x.kind !== 'in')
      .reduce((s, x) => s + num(x.q), 0)
    const avail = have + editRestoreQty(ctx.restore, line.w, line.c) - pending
    if (avail <= 0) {
      return {
        ok: false,
        code: 'stock',
        error: `${line.w} anbarında "${it.name}" üzrə mövcud qalıq yoxdur`,
      }
    }
    if (q > avail) {
      q = avail
      warn = `${line.w} anbarında maksimum ${fmt2(avail)} ${it.unit} mövcuddur `
        + '— miqdar bu maksimuma endirildi.'
    }
  }

  return { ok: true, q, warn, item: it }
}
