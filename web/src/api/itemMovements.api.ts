import { supabase } from './supabase'

/* Movement rows needed to derive the nomenclature indexes — Q1 option (c),
   approved 2026-09-03.

   The original loads the ENTIRE `movements` table with `select('*')` into the
   browser at boot (fetchAll, index.html:847-862; DB.movs, 936-946) and builds
   every index from it. Option (c) keeps that arithmetic exactly — the same
   client-side derivation over the same rows — but reads only the columns the
   indexes actually consume, so the payload is materially smaller and no SQL
   change is required.

   The column list below is the UNION across the three consumers:
     - byItem (list): item_code, in_qty, out_qty
     - bal (card, per warehouse): + warehouse
     - priceObs (card, price history): + price, date, partner
     - movement history (card): + type, invoice_num
     - cancellation model: + id, note, doc_num
     - last-purchase tiebreak (Phase 6, M6-39): + created_at
     - reference-directory fallback channels (Phase 7, H-2 audit A04): + channel
     - «Mal hərəkəti» registry (Phase 8, I-1, M8-52): + contract_num, created_by
   Adding a consumer means widening this list, not falling back to select('*'). */
export interface MovementRow {
  id: string
  item_code: string
  warehouse: string
  date: string
  in_qty: number | null
  out_qty: number | null
  price: number | null
  partner: string | null
  type: string
  invoice_num: string | null
  note: string | null
  doc_num: string | null
  /** `movements.channel` — index.html's `m.ch`. The legacy `channelOptions()`
      fallback derives its observed-channel union from THIS field, not from
      the movement's `type` (audit A04). Optional so existing fixtures in
      other consumers (nomenclature indexes, last-purchase) that predate this
      column's read need no changes. */
  channel?: string | null
  /** `movements.contract_num` — index.html's `m.ct` (941). The «Mal hərəkəti»
      registry shows it as a hint under the item name, includes it in the search
      haystack, and `docRefsLine()` lists it as «Müqavilə №», explicitly
      distinguished from the SYSTEM document number `doc_num`.

      Confirmed by the generated types (`types/database.ts`, `movements.Row`)
      and by `ANBAR_SHARED/docs/DB_SCHEMA.md`. Optional so that fixtures in the
      consumers predating this column need no change. */
  contract_num?: string | null
  /** `movements.created_by` — index.html's `m.by` (943), the «Qeyd edən»
      column. There is NO `by` column: `by` is only the legacy in-memory field
      name, and the legacy read maps `r.created_by || 'sistem'`. That `'sistem'`
      fallback is display formatting and stays out of the read. */
  created_by?: string | null
  /* M6-39 (Phase 6 Q1). The legacy `m.ts` is the SECOND tie-break level of
     laterPurchase() (index.html:727-738). This read already ORDERED by
     created_at without SELECTING it, so the column was unavailable to any
     client-side comparison.

     It arrives as a nullable ISO STRING, not the number the legacy code
     compares — see lib/lastPurchase.ts for the conversion, which is the whole
     reason `Number.isFinite()` must never be applied to this value directly. */
  created_at: string | null
}

export interface MovementsResult {
  rows: MovementRow[]
  ok: boolean
  error: string | null
}

const COLUMNS =
  'id, item_code, warehouse, date, in_qty, out_qty, price, partner, type, invoice_num, note, doc_num, created_at, channel, contract_num, created_by'

const PAGE_SIZE = 1000
const MAX_PAGES = 200

/**
 * Reads every movement row needed by the nomenclature indexes, paging until a
 * short page arrives — the original's fetchAll() contract.
 *
 * Never throws; absorbs both a returned `{ error }` and a rejected promise.
 */
export async function fetchItemMovements(): Promise<MovementsResult> {
  try {
    const out: MovementRow[] = []
    for (let page = 0; page < MAX_PAGES; page++) {
      const from = page * PAGE_SIZE
      /* A11 — the ORDER is part of the read contract, not a presentation
         detail. fetchAll('movements', ['date', 'created_at'])
         (index.html:874) orders every page the same way, which is what makes
         `range()` a stable window: without an ORDER BY, PostgREST may return
         rows in any order, so page boundaries can overlap or skip rows and
         the set assembled across pages is not guaranteed complete. */
      const { data, error } = await supabase
        .from('movements')
        .select(COLUMNS)
        .order('date')
        .order('created_at')
        .range(from, from + PAGE_SIZE - 1)
      if (error) return { rows: [], ok: false, error: error.message || 'Naməlum xəta' }
      const batch = (data ?? []) as MovementRow[]
      out.push(...batch)
      if (batch.length < PAGE_SIZE) break
    }
    return { rows: out, ok: true, error: null }
  } catch (err) {
    return { rows: [], ok: false, error: err instanceof Error ? err.message : 'Naməlum xəta' }
  }
}
