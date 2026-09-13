import * as XLSX from 'xlsx'
import { azpN, azpR2 } from './azpNum'
import { AZP_LABEL, azpMod, type AzpModule } from './azpLabels'

/* Azpetrol / Araz — the export SHEET MODEL, shared by both export paths.

   Ported from `azpCardLists` (index.html:9232-9249), `azpRowPlan`
   (9258-9280) and `azpBuildSheet` (9282-9430).

   ═══ SYNTHETIC FIXTURES ONLY. NO REAL DATA WAS EXPORTED. ═══

   WHY ONE MODEL FEEDS TWO WRITERS. The template path and the SheetJS
   fallback must carry THE SAME numbers: a user who falls back has lost the
   design, and must not silently also lose or gain a row. So the block plan
   below is computed once, and both writers consume it. If they each built
   their own, a divergence between them would be invisible — the two files are
   never produced in the same run.

   The card lists are two INDEPENDENT columns, not two sides of one entry: a
   Mədaxil and an out row can share a printed line without being related.
   Legacy says so explicitly (index.html:9229-9231) and it is preserved. */

/** A movement, narrowed to the fields the export reads. */
export interface AzpExportMovement {
  id?: number | string | null
  card_id?: string | null
  kind?: string | null
  amount?: number | string | null
  op_date?: string | null
  cancelled?: boolean | null
}

/** A card row, narrowed to the fields the export reads. */
export interface AzpExportCard {
  card_id?: string | null
  card_no?: string | null
  holder?: string | null
  project?: string | null
  balance?: number | string | null
  medaxil_total?: number | string | null
  mexaric_total?: number | string | null
}

/** Everything one module's export needs; nothing is read from a store here. */
export interface AzpExportInput {
  cards: readonly AzpExportCard[]
  movs: readonly AzpExportMovement[]
  appBalance?: number | null
}

export interface AzpCardList {
  medaxil: AzpExportMovement[]
  mexaric: AzpExportMovement[]
}

/**
 * `azpCardLists(m)` — index.html:9232-9249.
 *
 * Splits each card's NON-CANCELLED movements into the two independent
 * columns, ordered by `op_date` then `id`. An undated row sorts LAST, not
 * first: an empty string compares below every real date, which would put
 * undated rows at the top and misalign every printed line.
 *
 * A movement whose card is not in `cards` is dropped — it has no block to
 * print in. A `kind` other than the two is dropped for the same reason.
 */
export function azpCardLists(
  cards: readonly AzpExportCard[], movs: readonly AzpExportMovement[],
): Map<string, AzpCardList> {
  const lists = new Map<string, AzpCardList>()
  cards.forEach((c) => lists.set(String(c.card_id ?? ''), { medaxil: [], mexaric: [] }))
  movs.forEach((r) => {
    if (r.cancelled) return
    const b = lists.get(String(r.card_id ?? ''))
    if (b && (r.kind === 'medaxil' || r.kind === 'mexaric')) b[r.kind].push(r)
  })
  const ord = (a: AzpExportMovement, b: AzpExportMovement) => {
    const da = a.op_date || '', db = b.op_date || ''
    if (da !== db) return da === '' ? 1 : db === '' ? -1 : (da < db ? -1 : 1)
    return azpN(a.id) - azpN(b.id)
  }
  lists.forEach((b) => { b.medaxil.sort(ord); b.mexaric.sort(ord) })
  return lists
}

/** One printed group: a date (Araz) or the single undated group (Azpetrol). */
export interface AzpRowGroup {
  date: string
  /** How many printed lines this group occupies. */
  n: number
}

/**
 * `azpRowPlan(m, lists)` — index.html:9258-9280.
 *
 * Azpetrol prints ONE group: its source sheet has no date column, so the
 * blocks are simply as tall as the tallest column. Araz shares ONE `Tarix`
 * column across every block, so its lines must be grouped by date or the
 * dates printed on the left would not describe the amounts on the right.
 *
 * Both always return at least one group of at least one line, so an empty
 * module still produces a well-formed sheet rather than a zero-row range.
 */
export function azpRowPlan(m: AzpModule, lists: Map<string, AzpCardList>): AzpRowGroup[] {
  if (m !== 'araz') {
    let n = 0
    lists.forEach((b) => { n = Math.max(n, b.medaxil.length, b.mexaric.length) })
    return [{ date: '', n: Math.max(n, 1) }]
  }
  const seen: string[] = []
  lists.forEach((b) => b.medaxil.concat(b.mexaric).forEach((r) => {
    const d = r.op_date || ''
    if (seen.indexOf(d) < 0) seen.push(d)
  }))
  seen.sort((a, b) => (a === '' ? 1 : b === '' ? -1 : (a < b ? -1 : a > b ? 1 : 0)))
  const plan = seen.map((d) => {
    let n = 1
    lists.forEach((b) => {
      n = Math.max(
        n,
        b.medaxil.filter((r) => (r.op_date || '') === d).length,
        b.mexaric.filter((r) => (r.op_date || '') === d).length,
      )
    })
    return { date: d, n }
  })
  return plan.length ? plan : [{ date: '', n: 1 }]
}

/** The per-line slice of one group, per card, in card order. */
export interface AzpPlannedLine {
  /** The group's date, '' when undated. */
  date: string
  /** 1-based running serial across the whole sheet — legacy `ss`. */
  serial: number
  /** Per card, in `cards` order: the Mədaxil and out row on THIS line. */
  cells: { medaxil?: AzpExportMovement; mexaric?: AzpExportMovement }[]
}

/** The fully resolved sheet model both writers consume. */
export interface AzpSheetModel {
  module: AzpModule
  cards: AzpExportCard[]
  /** 2 for Araz (Tarix + s/s), 1 for Azpetrol (s/s). */
  lead: number
  dated: boolean
  lines: AzpPlannedLine[]
  appBalance: number | null
  /** Σ of every card balance, rounded once. */
  grand: number
}

/**
 * Resolves the whole printed body ONCE, so the two writers cannot disagree.
 *
 * M17-98 — NO FILTER IS APPLIED. The input is the module's complete card set
 * and its complete non-cancelled movement set. A filtered export would print
 * block totals that disagree with each card's own balance, and the file's one
 * purpose is to reconcile.
 */
export function azpBuildSheetModel(m: AzpModule, input: AzpExportInput): AzpSheetModel {
  azpMod(m)
  const cards = input.cards.slice()
  const lists = azpCardLists(cards, input.movs)
  const plan = azpRowPlan(m, lists)
  const dated = m === 'araz'
  const lines: AzpPlannedLine[] = []
  let serial = 1

  plan.forEach((g) => {
    /* For a dated module the group narrows each card's list to this date;
       for an undated one the whole list is the group. */
    const slice = cards.map((c) => {
      const b = lists.get(String(c.card_id ?? '')) || { medaxil: [], mexaric: [] }
      return dated
        ? {
            medaxil: b.medaxil.filter((x) => (x.op_date || '') === g.date),
            mexaric: b.mexaric.filter((x) => (x.op_date || '') === g.date),
          }
        : b
    })
    for (let k = 0; k < g.n; k++) {
      lines.push({
        date: g.date,
        serial,
        cells: slice.map((s) => ({ medaxil: s.medaxil[k], mexaric: s.mexaric[k] })),
      })
      serial++
    }
  })

  return {
    module: m,
    cards,
    lead: dated ? 2 : 1,
    dated,
    lines,
    appBalance: input.appBalance == null ? null : azpR2(azpN(input.appBalance)),
    grand: azpR2(cards.reduce((s, c) => s + azpN(c.balance), 0)),
  }
}

/* ------------------------------------------------------- the AOA fallback */

/**
 * The PLAIN worksheet the SheetJS fallback writes (M17-99) — the data half of
 * `azpBuildSheet` (index.html:9282-9430) with none of its styling.
 *
 * ═══ WHY THIS IS DELIBERATELY NOT THE FULL LEGACY STYLED SHEET. ═══
 *
 * Legacy's `azpBuildSheet` also emits `!merges`, `!freeze`, `!cols` and a
 * per-cell `z` — presentation the OPEN SheetJS build cannot render anyway
 * (that is the whole reason the template path exists). This writer's contract
 * is that the DATA survives a template failure and that the user is told the
 * design did not. Reproducing a partial imitation of the design here would
 * make the two files harder to tell apart, which is the exact failure the
 * warning toast exists to prevent.
 *
 * CARD NUMBERS STAY TEXT. `card_no` is emitted as a string and pinned with
 * `t:'s'`/`z:'@'` by `azpForceTextCells`, because `0012` read as a number
 * becomes `12` and no longer names a physical card.
 */
export function azpSheetAoa(model: AzpSheetModel): unknown[][] {
  const L = AZP_LABEL[model.module]
  const { cards, lead, dated } = model
  const width = lead + cards.length * 4 + 1
  const totalsCol = lead + cards.length * 4
  const blank = () => new Array<unknown>(width).fill('')

  const rows: unknown[][] = []

  /* Row 1 — the owner/object name over each block. */
  const r1 = blank()
  cards.forEach((c, b) => {
    r1[lead + b * 4] = String(c.holder ?? '') + (c.project ? ' ' + c.project : '')
  })
  r1[totalsCol] = dated ? 'Kartların cari balansı' : 'Tədbiqin cari balansı'
  rows.push(r1)

  /* Row 2 — the card number, as TEXT. */
  const r2 = blank()
  cards.forEach((c, b) => { r2[lead + b * 4] = String(c.card_no ?? '') })
  /* The application fund and the card total are DIFFERENT figures and never
     substitute for one another (index.html:9375-9390). An unknown fund stays
     blank rather than borrowing the card total. */
  r2[totalsCol] = dated ? model.grand : (model.appBalance == null ? '' : model.appBalance)
  rows.push(r2)

  /* Row 3 — the column headings. */
  const r3 = blank()
  if (dated) { r3[0] = 'Tarix'; r3[1] = 's/s' } else { r3[0] = 's/s' }
  cards.forEach((_c, b) => {
    r3[lead + b * 4] = 'Mədaxil'
    r3[lead + b * 4 + 1] = L.out
    r3[lead + b * 4 + 2] = 'Kart balansı'
  })
  if (!dated) r3[totalsCol] = 'Kartların cari balansı'
  rows.push(r3)

  /* The data lines. The card balance prints on the FIRST line only, exactly
     as the template merges it down the block. */
  model.lines.forEach((ln, i) => {
    const r = blank()
    if (dated && ln.date) r[0] = ln.date
    r[lead - 1] = ln.serial
    ln.cells.forEach((s, b) => {
      if (s.medaxil) r[lead + b * 4] = azpR2(azpN(s.medaxil.amount))
      if (s.mexaric) r[lead + b * 4 + 1] = azpR2(azpN(s.mexaric.amount))
      if (i === 0) r[lead + b * 4 + 2] = azpR2(azpN(cards[b].balance))
    })
    if (i === 0 && dated) r[totalsCol] = ''
    rows.push(r)
  })

  /* The CƏMİ line. */
  const rt = blank()
  rt[0] = 'CƏMİ'
  cards.forEach((c, b) => {
    rt[lead + b * 4] = azpR2(azpN(c.medaxil_total))
    rt[lead + b * 4 + 1] = azpR2(azpN(c.mexaric_total))
  })
  rows.push(rt)

  /* The grand total, on its own trailing line for the undated board where the
     right-hand column already carries the fund figure above. */
  if (!dated) {
    const rg = blank()
    rg[totalsCol] = model.grand
    rows.push(rg)
  }

  return rows
}

/* ------------------------------------------------- the template sheet XML */

function azpXesc(s: unknown): string {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

/** `azpColName(c)` — index.html:9494. 0-based index → `A`, `B`, … `AA`. */
export function azpColName(c: number): string {
  let s = ''
  let n = c + 1
  while (n > 0) {
    const r = (n - 1) % 26
    s = String.fromCharCode(65 + r) + s
    n = (n - r - 1) / 26
  }
  return s
}

/** `azpAddr(r, c)` — index.html:9495. 1-based row, 0-based column. */
export function azpAddr(r: number, c: number): string {
  return azpColName(c) + r
}

/**
 * `azpSerial(iso)` — index.html:9497-9500.
 *
 * The template's date cells carry a SERIAL number style, so an ISO string
 * written verbatim would render as text in a date-formatted cell. Returns
 * null for anything that is not a leading `YYYY-MM-DD`, and the caller then
 * writes an empty cell rather than a wrong one.
 */
export function azpSerialDate(iso: unknown): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso == null ? '' : iso))
  return m
    ? Math.round((Date.UTC(+m[1], +m[2] - 1, +m[3]) - Date.UTC(1899, 11, 30)) / 86400000)
    : null
}

interface XcOpts { t?: string | null; v?: number | null; f?: string | null }

/**
 * One `<c>` cell — index.html:9502-9512.
 *
 * Text is written INLINE, so `sharedStrings.xml` is never touched: adding to
 * it would renumber every existing string index in the template and corrupt
 * the design's own labels.
 */
export function azpXc(r: number, c: number, s: number | null, o?: XcOpts | null): string {
  const a = ' r="' + azpAddr(r, c) + '"' + (s == null ? '' : ' s="' + s + '"')
  if (!o) return '<c' + a + '/>'
  if (o.t != null && o.t !== '') {
    return '<c' + a + ' t="inlineStr"><is><t xml:space="preserve">' + azpXesc(o.t) + '</t></is></c>'
  }
  let body = ''
  if (o.f) body += '<f>' + azpXesc(o.f) + '</f>'
  if (o.v != null && isFinite(o.v)) body += '<v>' + o.v + '</v>'
  return body ? '<c' + a + '>' + body + '</c>' : '<c' + a + '/>'
}

/* The style and width dictionary lifted out of the template's own
   `styles.xml` — index.html:9462-9487. Every number is a `cellXfs` index INTO
   THE TEMPLATE, so these are not arbitrary: changing one changes the design.
   They live here rather than in `azpTemplateExport.ts` because only the XML
   writer reads them, and that module is the package-surface contract. */
export interface AzpTplStyle {
  lead: number
  minLastRow: number
  w: {
    lead: number[]; in: number; out: number; bal: number
    gap: number; tot: number; colSty: number; gapSty: number
  }
  s: {
    hLead: number[]; hIn: number; hOut: number; hBal: number
    dLead: number[]; dIn: number; dOut0: number; dOut: number; dBal: number
    tIn: number; tOut: number; tBal: number; gap: number
    r1First: number; r1Rest: number; r2First: number; r2Rest: number
    totLbl: number; totAgg: number; totApp?: number; totAggLbl?: number
  }
  ht: { r1: string; r2: string; r3: string; d: string; t: string }
}

export const AZP_TPL_STYLE: Record<AzpModule, AzpTplStyle> = {
  azpetrol: {
    lead: 1,
    minLastRow: 14,
    w: {
      lead: [3.88671875], in: 11.44140625, out: 8.44140625, bal: 8.5546875,
      gap: 0.77734375, tot: 29, colSty: 2, gapSty: 3,
    },
    s: {
      r1First: 38, r1Rest: 47, r2First: 45, r2Rest: 46,
      hLead: [8], hIn: 9, hOut: 10, hBal: 10,
      dLead: [8], dIn: 14, dOut0: 15, dOut: 16, dBal: 41,
      tIn: 22, tOut: 23, tBal: 41, gap: 2,
      totLbl: 48, totApp: 39, totAggLbl: 43, totAgg: 44,
    },
    ht: { r1: '53.25', r2: '30', r3: '63', d: '20.25', t: '17.25' },
  },
  araz: {
    lead: 2,
    minLastRow: 4,
    w: {
      lead: [12.44140625, 3.88671875], in: 9.6640625, out: 10.77734375, bal: 9,
      gap: 0.77734375, tot: 31.77734375, colSty: 25, gapSty: 26,
    },
    s: {
      r1First: 38, r1Rest: 47, r2First: 54, r2Rest: 55,
      hLead: [29, 29], hIn: 30, hOut: 31, hBal: 31,
      dLead: [37, 29], dIn: 32, dOut0: 33, dOut: 34, dBal: 51,
      tIn: 35, tOut: 35, tBal: 51, gap: 25,
      totLbl: 53, totAgg: 52,
    },
    ht: { r1: '53.25', r2: '30', r3: '63', d: '20.25', t: '17.25' },
  },
}

/**
 * Builds the four patched worksheet elements from the model — the data half
 * of `azpSheetXml` (index.html:9515-9702), reusing the template's own style
 * indices so the design repeats for any number of cards.
 *
 * Returns the patch rather than applying it: `azpPatchSheetXml` owns the
 * patch surface (M17-95), and keeping the two apart means widening the
 * surface takes an edit to THAT function, where the contract is stated.
 */
export function azpSheetPatch(model: AzpSheetModel): {
  dimension: string; cols: string; sheetData: string; mergeCells: string
} {
  const m = model.module
  const T = AZP_TPL_STYLE[m]
  const S = T.s, W = T.w
  const L = AZP_LABEL[m]
  const { cards, dated } = model
  const lead = T.lead
  const R0 = 4
  const nRows = model.lines.length
  const R1 = R0 + nRows - 1
  const RT = R1 + 1
  const totalsCol = lead + cards.length * 4
  const lastRow = Math.max(RT, T.minLastRow)
  const lastColName = azpColName(totalsCol)
  const merges: string[] = []
  const mc = (b: number) => lead + b * 4
  const oc = (b: number) => lead + b * 4 + 1
  const bc = (b: number) => lead + b * 4 + 2
  const gc = (b: number) => lead + b * 4 + 3
  const RNG = (c: number, r0: number, r1: number) => azpAddr(r0, c) + ':' + azpAddr(r1, c)
  const grandF = cards.length ? cards.map((_c, b) => azpAddr(R0, bc(b))).join('+') : null

  /* Column widths: the template's block pattern repeated per card. */
  let cols = '<cols>'
  W.lead.forEach((w, i) => {
    cols += '<col min="' + (i + 1) + '" max="' + (i + 1) + '" width="' + w
      + '" style="' + W.colSty + '" customWidth="1"/>'
  })
  cards.forEach((_c, b) => {
    const spec: [number, number, number][] = [
      [mc(b), W.in, W.colSty], [oc(b), W.out, W.colSty],
      [bc(b), W.bal, W.colSty], [gc(b), W.gap, W.gapSty],
    ]
    spec.forEach((p) => {
      cols += '<col min="' + (p[0] + 1) + '" max="' + (p[0] + 1) + '" width="' + p[1]
        + '" style="' + p[2] + '" customWidth="1"/>'
    })
  })
  cols += '<col min="' + (totalsCol + 1) + '" max="' + (totalsCol + 1) + '" width="' + W.tot
    + '" style="' + W.colSty + '" customWidth="1"/>'
  cols += '<col min="' + (totalsCol + 2) + '" max="16384" width="8.88671875" style="'
    + W.colSty + '"/></cols>'

  /* The rightmost column's style, per row — index.html:9545-9564. */
  const totSty = (r: number) => {
    if (dated) return r <= 3 ? S.totLbl : S.totAgg
    if (r <= 2) return S.totLbl
    if (r <= 9) return S.totApp as number
    if (r <= 13) return S.totAggLbl as number
    return S.totAgg
  }
  const totCell = (r: number) => {
    const s = totSty(r)
    if (dated) {
      if (r === 1) return azpXc(r, totalsCol, s, { t: 'Kartların cari balansı' })
      if (r === R0) return azpXc(r, totalsCol, s, { v: model.grand, f: grandF })
      return azpXc(r, totalsCol, s)
    }
    if (r === 1) return azpXc(r, totalsCol, s, { t: 'Tədbiqin cari balansı' })
    if (r === 3) {
      return azpXc(r, totalsCol, s, model.appBalance == null ? null : { v: model.appBalance })
    }
    if (r === 10) return azpXc(r, totalsCol, s, { t: 'Kartların cari balansı' })
    if (r === 14) return azpXc(r, totalsCol, s, { v: model.grand, f: grandF })
    return azpXc(r, totalsCol, s)
  }

  const row = (r: number, ht: string, cells: string) =>
    '<row r="' + r + '" spans="1:' + (totalsCol + 1) + '" ht="' + ht
    + '" customHeight="1" x14ac:dyDescent="0.3">' + cells + '</row>'

  let sd = '<sheetData>'

  /* Row 1 — owner/object over each block. */
  let c1 = ''
  W.lead.forEach((_w, i) => { c1 += azpXc(1, i, i === 0 ? S.r1First : S.r1Rest) })
  cards.forEach((c, b) => {
    c1 += azpXc(1, mc(b), S.r1First, {
      t: String(c.holder ?? '') + (c.project ? ' ' + c.project : ''),
    })
    c1 += azpXc(1, oc(b), S.r1Rest)
    c1 += azpXc(1, bc(b), S.r1Rest)
    c1 += azpXc(1, gc(b), S.gap)
  })
  c1 += totCell(1)
  sd += row(1, T.ht.r1, c1)

  /* Row 2 — the card number, written as INLINE TEXT (M17-62's sibling): a
     numeric write would drop `0012`'s leading zeros. */
  let c2 = ''
  W.lead.forEach((_w, i) => { c2 += azpXc(2, i, i === 0 ? S.r2First : S.r2Rest) })
  cards.forEach((c, b) => {
    c2 += azpXc(2, mc(b), S.r2First, { t: String(c.card_no ?? '') })
    c2 += azpXc(2, oc(b), S.r2Rest)
    c2 += azpXc(2, bc(b), S.r2Rest)
    c2 += azpXc(2, gc(b), S.gap)
  })
  c2 += totCell(2)
  sd += row(2, T.ht.r2, c2)

  /* Row 3 — headings. */
  let c3 = ''
  const heads = dated ? ['Tarix', 's/s'] : ['s/s']
  heads.forEach((t, i) => { c3 += azpXc(3, i, S.hLead[i], { t }) })
  cards.forEach((_c, b) => {
    c3 += azpXc(3, mc(b), S.hIn, { t: 'Mədaxil' })
    c3 += azpXc(3, oc(b), S.hOut, { t: L.out })
    c3 += azpXc(3, bc(b), S.hBal, { t: 'Kart balansı' })
    c3 += azpXc(3, gc(b), S.gap)
  })
  c3 += totCell(3)
  sd += row(3, T.ht.r3, c3)

  /* The data lines. */
  model.lines.forEach((ln, i) => {
    const r = R0 + i
    let cc = ''
    if (dated) {
      const sr = azpSerialDate(ln.date)
      cc += azpXc(r, 0, S.dLead[0], sr == null ? null : { v: sr })
      cc += azpXc(r, 1, S.dLead[1], { v: ln.serial })
    } else {
      cc += azpXc(r, 0, S.dLead[0], { v: ln.serial })
    }
    ln.cells.forEach((s, b) => {
      cc += azpXc(r, mc(b), S.dIn, s.medaxil ? { v: azpR2(azpN(s.medaxil.amount)) } : null)
      cc += azpXc(r, oc(b), b === 0 ? S.dOut0 : S.dOut,
        s.mexaric ? { v: azpR2(azpN(s.mexaric.amount)) } : null)
      /* The card balance prints on the FIRST data row only; the rest of the
         block is the merge below. */
      cc += (r === R0)
        ? azpXc(r, bc(b), S.dBal, {
            v: azpR2(azpN(cards[b].balance)),
            f: 'ROUND(SUM(' + RNG(mc(b), R0, R1) + ')-SUM(' + RNG(oc(b), R0, R1) + '),2)',
          })
        : azpXc(r, bc(b), S.dBal)
      cc += azpXc(r, gc(b), S.gap)
    })
    cc += totCell(r)
    sd += row(r, T.ht.d, cc)
  })

  /* The CƏMİ line. */
  let ct = ''
  ct += azpXc(RT, 0, S.dLead[0], { t: 'CƏMİ' })
  if (dated) ct += azpXc(RT, 1, S.dLead[1])
  cards.forEach((c, b) => {
    ct += azpXc(RT, mc(b), S.tIn, {
      v: azpR2(azpN(c.medaxil_total)), f: 'ROUND(SUM(' + RNG(mc(b), R0, R1) + '),2)',
    })
    ct += azpXc(RT, oc(b), S.tOut, {
      v: azpR2(azpN(c.mexaric_total)), f: 'ROUND(SUM(' + RNG(oc(b), R0, R1) + '),2)',
    })
    ct += azpXc(RT, bc(b), S.tBal)
    ct += azpXc(RT, gc(b), S.gap)
  })
  ct += totCell(RT)
  sd += row(RT, T.ht.t, ct)

  /* The template's empty tail, so the totals column's merge has rows to span. */
  for (let rr = RT + 1; rr <= lastRow; rr++) {
    let e = ''
    for (let cc = 0; cc < totalsCol; cc++) e += azpXc(rr, cc, null)
    e += totCell(rr)
    sd += row(rr, T.ht.d, e)
  }
  sd += '</sheetData>'

  /* Merges — index.html:9679-9692. */
  cards.forEach((_c, b) => merges.push(RNG(bc(b), R0, Math.max(R0, RT))))
  if (dated) {
    merges.push(RNG(totalsCol, 1, 3))
    if (lastRow > R0) merges.push(RNG(totalsCol, R0, lastRow))
  } else {
    merges.push(RNG(totalsCol, 1, 2))
    merges.push(RNG(totalsCol, 3, 9))
    merges.push(RNG(totalsCol, 10, 13))
    if (lastRow > 14) merges.push(RNG(totalsCol, 14, lastRow))
  }
  const mergeCells = '<mergeCells count="' + merges.length + '">'
    + merges.map((x) => '<mergeCell ref="' + x + '"/>').join('') + '</mergeCells>'

  return {
    dimension: 'A1:' + lastColName + lastRow,
    cols,
    sheetData: sd,
    mergeCells,
  }
}

/** The AOA worksheet the fallback writes, with card numbers pinned as text. */
export function azpFallbackWorksheet(model: AzpSheetModel): XLSX.WorkSheet {
  const ws = XLSX.utils.aoa_to_sheet(azpSheetAoa(model)) as unknown as Record<string, unknown>
  /* Card numbers are entirely-numeric strings; without this Excel reads
     `0012` as 12. Same rule and same reason as `azpForceTextCells`
     (azpReportExport.ts), applied to this writer's own sheet. */
  Object.keys(ws).forEach((a) => {
    if (a[0] === '!') return
    const c = ws[a] as { v?: unknown; t?: string; z?: string } | undefined
    if (c && typeof c.v === 'string' && /^[0-9]+$/.test(c.v)) {
      c.t = 's'
      c.z = '@'
    }
  })
  return ws as unknown as XLSX.WorkSheet
}
