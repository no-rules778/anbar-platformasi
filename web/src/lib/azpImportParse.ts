/* Azpetrol / Araz — the Excel import parser (M17-90 … M17-94).

   Ported from `azpParseSheet()` (index.html:8941-9083).

   PURE. This file reads an array-of-arrays and returns a parse result. It
   contacts no Supabase project, performs no write, and knows nothing about
   RPCs. The orchestration that would turn a parse result into
   `azp_save_card` + `azp_post_movements` calls lives in the API layer and is
   guarded by `azp.import`; NOTHING here can write.

   WHY THE PARSER IS SO DEFENSIVE. The source workbooks are hand-maintained
   fuel-card sheets, not exports: cards are HORIZONTAL blocks with merged
   headers, blocks may be empty templates, and the sheets carry running-sum
   subtotal rows inside the data. Each of the four heuristics below exists
   because a simpler reading DOUBLE-COUNTED or LOST real money in the real
   files. The legacy comments naming those files are preserved. */

import { azpDate } from './azpDate'
import { AZP_LABEL, azpMod, type AzpModule } from './azpLabels'
import { azpR2 } from './azpNum'

/** One cell of the sheet, as SheetJS `sheet_to_json({header:1})` yields it. */
export type AzpCell = string | number | boolean | Date | null | undefined

/** The sheet as an array of rows of cells. */
export type AzpAoa = AzpCell[][]

/** A card discovered as a horizontal block. */
export interface AzpParsedCard {
  card_no: string
  holder: string
  /** The sheet's own «Kart balansı» figure, when the block has that column. */
  excel_balance: number | null
  /** `medaxil − mexaric` over the rows this parser actually counted. */
  parsed_balance?: number
  medaxil?: number
  mexaric?: number
}

/** One movement to post. Shaped exactly as `azp_post_movements` expects. */
export interface AzpParsedRow {
  card_no: string
  kind: 'medaxil' | 'mexaric'
  amount: number
  op_date: string | null
  vat_included: boolean
}

export interface AzpParseResult {
  cards: AzpParsedCard[]
  rows: AzpParsedRow[]
  /** Blocking. A single entry must prevent the whole import (M17-88). */
  errs: string[]
  /** Advisory only — a balance disagreement never blocks. */
  warns: string[]
  /** How many amounts were recognised as subtotals and skipped (M17-93/94). */
  skippedTotals: number
}

/**
 * The Azerbaijani lowercaser (M17-90) — index.html:8946-8949.
 *
 * JS `toLowerCase()` maps dotted `İ` (U+0130) to `i` PLUS a combining dot
 * (U+0069 U+0307), so `'CƏMİ'.toLowerCase()` does not match a plain /cəmi/
 * pattern. Dotless `I` must become `ı`, not `i`. Both replacements run BEFORE
 * `toLowerCase()`, which is what makes the total-row and header patterns work
 * at all — this is a correctness requirement, not a nicety.
 */
export function azLower(v: unknown): string {
  return String(v == null ? '' : v).replace(/İ/g, 'i').replace(/I/g, 'ı').toLowerCase()
}

/** `norm` — `azLower` plus whitespace collapsing (index.html:8950). */
export function azpNorm(v: unknown): string {
  return azLower(v).replace(/\s+/g, ' ').trim()
}

/** index.html:8956 — the accepted out-column headings. */
const OUT_NAMES = ['y/d', 'məxaric', 'mexaric']

/** index.html:8957 — the accepted balance-column headings. */
const BAL_NAMES = ['kart balansı', 'kart balansi', 'balans']

/** index.html:9068 — a labelled total row. */
const TOTAL_RE = /^(cəmi|cemi|yekun|total|toplam)$/

/** index.html:8958-8962 — blank is null, a non-number is NaN. */
function num(v: AzpCell): number | null {
  if (v == null || String(v).trim() === '') return null
  const n = Number(String(v).replace(',', '.'))
  return isFinite(n) ? n : NaN
}

/** One card block: the Mədaxil column, its out column, and an optional balance. */
interface Block {
  inCol: number
  outCol: number
  balCol: number
  /** The leftward search boundary — the previous block's out column + 1. */
  left: number
  cardNo: string
  holder: string
}

/**
 * `azpParseSheet(m, aoa)` — index.html:8941-9083.
 *
 * Throws (rather than returning an error entry) only for the two structural
 * failures that make the sheet unreadable as a whole: no header row and no
 * card block. Everything else is reported in `errs`, so the preview can show
 * every problem at once instead of one per attempt.
 */
export function azpParseSheet(m: AzpModule, aoa: AzpAoa): AzpParseResult {
  azpMod(m)
  const L = AZP_LABEL[m]

  /* Header row: the first of the first 30 rows carrying a «Mədaxil» cell. */
  let hr = -1
  for (let r = 0; r < Math.min(aoa.length, 30); r++) {
    if ((aoa[r] || []).some((v) => azpNorm(v) === 'mədaxil')) { hr = r; break }
  }
  if (hr < 0) throw new Error('Başlıq sətri tapılmadı — “Mədaxil” sütunu yoxdur.')

  const head = aoa[hr] || []
  const dateCol = head.findIndex((v) => azpNorm(v) === 'tarix')

  /* M17-91 — a block is «Mədaxil» IMMEDIATELY followed by an out column; the
     balance column is optional. Requiring the pair is what stops a stray
     «Mədaxil» caption elsewhere on the sheet from opening a phantom card. */
  const blocks: Block[] = []
  for (let c = 0; c < head.length; c++) {
    if (azpNorm(head[c]) !== 'mədaxil') continue
    if (OUT_NAMES.indexOf(azpNorm(head[c + 1])) < 0) continue
    blocks.push({
      inCol: c,
      outCol: c + 1,
      balCol: BAL_NAMES.indexOf(azpNorm(head[c + 2])) >= 0 ? c + 2 : -1,
      left: 0, cardNo: '', holder: '',
    })
  }
  if (!blocks.length) {
    throw new Error('Kart bloku tapılmadı (Mədaxil + ' + L.out + ' cütü yoxdur).')
  }

  /* M17-92 — card number and holder sit in merged cells ABOVE the header, so
     they are searched leftwards. The search must NOT cross the previous
     block's boundary: a template block with an empty header would otherwise
     "steal" its neighbour's card number and count the same card twice. That
     is exactly what the empty K and O blocks of the ARAZ sheet do. */
  blocks.forEach((b, i) => { b.left = i === 0 ? 0 : blocks[i - 1].outCol + 1 })
  const back = (r: number, c: number, left: number): string => {
    for (let i = c; i >= left; i--) {
      const v = aoa[r] && aoa[r][i]
      if (v != null && String(v).trim() !== '') return String(v).trim()
    }
    return ''
  }
  blocks.forEach((b) => {
    b.cardNo = hr >= 1 ? back(hr - 1, b.inCol, b.left) : ''
    b.holder = hr >= 2 ? back(hr - 2, b.inCol, b.left) : ''
  })

  const cards: AzpParsedCard[] = []
  const rows: AzpParsedRow[] = []
  const errs: string[] = []
  const warns: string[] = []
  let skippedTotals = 0

  /* M17-94 — an explicitly LABELLED total row is skipped outright, without
     waiting for the running-sum heuristic. Our own export writes a «CƏMİ»
     label in the lead column, so this makes export → import exact: a card
     with only ONE movement never reaches `cnt >= 2` and would otherwise be
     double-counted. */
  const leadEnd = blocks[0].inCol
  const isTotalRow = (line: AzpCell[]): boolean => {
    for (let i = 0; i < leadEnd; i++) {
      const v = line[i]
      if (v != null && TOTAL_RE.test(azpNorm(v))) return true
    }
    return false
  }

  blocks.forEach((b) => {
    /* Does the block contain any number at all? */
    let hasData = false
    for (let r = hr + 1; r < aoa.length && !hasData; r++) {
      const line = aoa[r] || []
      if (isTotalRow(line)) continue
      if (num(line[b.inCol]) || num(line[b.outCol])) hasData = true
    }
    if (!b.cardNo) {
      /* A wholly empty template block is dropped silently and must NOT block
         the import. One carrying data without a card number is an error. */
      if (hasData) errs.push('Sütun ' + (b.inCol + 1) + ': məlumat var, amma kart nömrəsi tapılmadı.')
      return
    }
    if (cards.some((c) => c.card_no === b.cardNo)) {
      errs.push('Kart ' + b.cardNo + ' vərəqdə iki dəfə rast gəlinir.')
      return
    }
    cards.push({ card_no: b.cardNo, holder: b.holder || b.cardNo, excel_balance: null })
    const card = cards[cards.length - 1]

    if (b.balCol >= 0) {
      for (let r = hr + 1; r < aoa.length; r++) {
        const v = num((aoa[r] || [])[b.balCol])
        if (v != null && !isNaN(v)) { card.excel_balance = azpR2(v); break }
      }
    }

    /* The running-sum state, PER KIND. Mədaxil and the out column are
       independent lists in the source sheet, so they get independent
       counters — a subtotal in one says nothing about the other. */
    const run: Record<'medaxil' | 'mexaric', number> = { medaxil: 0, mexaric: 0 }
    const cnt: Record<'medaxil' | 'mexaric', number> = { medaxil: 0, mexaric: 0 }

    for (let r = hr + 1; r < aoa.length; r++) {
      const line = aoa[r] || []
      if (isTotalRow(line)) {
        /* A labelled total also increments `skippedTotals`, so the preview can
           state how many rows were not treated as data. */
        ;[b.inCol, b.outCol].forEach((cc) => {
          const v = num(line[cc])
          if (v != null && !isNaN(v) && v > 0) skippedTotals++
        })
        continue
      }
      const dt = dateCol >= 0 ? azpDate(line[dateCol]) : ''
      ;([['medaxil', b.inCol], ['mexaric', b.outCol]] as const).forEach((pair) => {
        const kind = pair[0]
        const raw = line[pair[1]]
        if (raw == null || String(raw).trim() === '') return
        const amt = num(raw)
        if (amt == null || isNaN(amt)) {
          errs.push('Sətir ' + (r + 1) + ', kart ' + b.cardNo + ': “' + String(raw) + '” rəqəm deyil.')
          return
        }
        if (amt <= 0) return
        /* M17-93 — a running-sum subtotal is recognised ONLY once at least TWO
           rows have been counted. The single-row condition is not enough: two
           consecutive equal amounts (200, then 200) would otherwise be read as
           a subtotal and a REAL movement would be lost. */
        if (cnt[kind] >= 2 && Math.abs(amt - run[kind]) < 0.005) {
          skippedTotals++
          return
        }
        run[kind] = azpR2(run[kind] + amt)
        cnt[kind]++
        rows.push({
          card_no: b.cardNo, kind, amount: azpR2(amt),
          op_date: dt || null, vat_included: L.vat,
        })
      })
    }

    card.parsed_balance = azpR2(run.medaxil - run.mexaric)
    card.medaxil = run.medaxil
    card.mexaric = run.mexaric
    if (card.excel_balance != null && Math.abs(card.excel_balance - card.parsed_balance) >= 0.01) {
      warns.push('Kart ' + b.cardNo + ': Excel “Kart balansı” = ' + card.excel_balance
        + ', oxunan sətirlərdən çıxan balans = ' + card.parsed_balance + '.')
    }
  })

  return { cards, rows, errs, warns, skippedTotals }
}

/**
 * M17-88 — a SINGLE parse error blocks the entire import.
 *
 * Legacy disables the go button with `!p.rows.length || p.errs.length > 0`
 * (index.html:9157) and re-checks the same condition inside the handler
 * (9161). Both checks exist here as one predicate so the UI and the
 * orchestrator cannot drift apart: there is no partial import, ever.
 */
export function azpImportBlocked(p: AzpParseResult | null | undefined): boolean {
  if (!p) return true
  return p.rows.length === 0 || p.errs.length > 0
}

/** The exact refusal the legacy handler writes when a blocked import is run. */
export const AZP_IMPORT_BLOCKED_MESSAGE = 'İdxal bloklanıb.'

/**
 * Which parsed cards do not yet exist on the board, matched the way legacy
 * matches them (index.html:9125-9127): trimmed, lower-cased card number.
 */
export function azpNewCards(
  p: AzpParseResult,
  existing: readonly { card_no?: string | null }[],
): AzpParsedCard[] {
  const known = new Set(existing.map((c) => String(c.card_no ?? '').trim().toLowerCase()))
  return p.cards.filter((c) => !known.has(String(c.card_no).trim().toLowerCase()))
}
