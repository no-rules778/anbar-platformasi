/* Minimal CSV parser — ported from parseCsvText (index.html:5808-5822).

   Handles quoted fields and doubled quotes inside them. Blank rows are
   dropped. Deliberately hand-rolled, matching the original rather than
   introducing a CSV dependency whose edge cases would differ. */
export function parseCsvText(text: string): string[][] {
  const rows: string[][] = []
  let i = 0
  let field = ''
  let row: string[] = []
  let inQ = false

  const pushF = () => { row.push(field); field = '' }
  const pushR = () => { rows.push(row); row = [] }

  while (i < text.length) {
    const c = text[i]
    if (inQ) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i += 2; continue }
        inQ = false; i++; continue
      }
      field += c; i++; continue
    }
    if (c === '"') { inQ = true; i++; continue }
    if (c === ',') { pushF(); i++; continue }
    if (c === '\r') { i++; continue }
    if (c === '\n') { pushF(); pushR(); i++; continue }
    field += c; i++
  }
  if (field.length || row.length) { pushF(); pushR() }
  return rows.filter((r) => r.length && r.some((c) => String(c).trim() !== ''))
}

/* Category-import row extraction — index.html:5791 documents the contract:
   columns `code` and `category` (or `proposed_category`), with LEADING ZEROS
   IN CODES PRESERVED. Codes are identifiers, never numbers: parsing one as a
   number would turn 0000001 into 1 and silently target the wrong row. */
export interface CategoryCsvRow {
  code: string
  category: string
}

export function extractCategoryRows(rows: string[][]): CategoryCsvRow[] {
  if (!rows.length) return []

  const head = rows[0].map((h) => h.trim().toLowerCase())
  const codeIx = head.indexOf('code')
  const catIx = head.indexOf('category') >= 0 ? head.indexOf('category') : head.indexOf('proposed_category')
  const hasHeader = codeIx >= 0 && catIx >= 0

  const body = hasHeader ? rows.slice(1) : rows
  const ci = hasHeader ? codeIx : 0
  const gi = hasHeader ? catIx : 1

  const out: CategoryCsvRow[] = []
  for (const r of body) {
    const code = String(r[ci] ?? '').trim()
    const category = String(r[gi] ?? '').trim()
    /* A blank code is KEPT, not skipped. The original pushes every body row
       into CATIMP and lets catImpPreview() classify it — a blank code fails
       the seven-digit test and becomes an `err`, which blocks the whole file
       (index.html:5824-5835). Dropping it here would silently let a
       malformed file write its remaining rows. */
    out.push({ code, category })
  }
  return out
}
