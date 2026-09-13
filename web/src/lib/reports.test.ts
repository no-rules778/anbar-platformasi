import { describe, expect, it } from 'vitest'
import {
  REPORT_KINDS, REPORT_LABELS, REPORT_NAMES, INITIAL_REPORT_NAME,
  partnerReportRows, partnerExportMatrix, partnerTopBars, PARTNER_EXPORT_HEADER,
  typeReportRows, typeExportMatrix, typeSharePercent, TYPE_EXPORT_HEADER,
  warehouseReportRows, warehouseExportMatrix, turnoverPercent, WAREHOUSE_EXPORT_HEADER,
  monthReportRows, monthExportMatrix, dailyCountSeries, MONTH_EXPORT_HEADER,
  abcReport, abcKpis, abcExportMatrix, abcScreenPercent, ABC_EXPORT_HEADER,
  ABC_STALE_HINT, ABC_TAG_CLASS, ABC_KPI_CLASS, ABC_KPI_SUFFIX,
  transferMatrixRows, transferExportMatrix, TRANSFER_EXPORT_HEADER, TRANSFER_EMPTY,
  printRowCount, printTitle,
} from './reports'
import { buildReportAggregates } from './reportAggregates'
import { transferRoute } from './movementRoute'
import type { MovementRow } from '../api/itemMovements.api'
import type { PartnerRow } from '../api/partners.api'
import type { WarehouseBalance } from './itemIndex'

/* T2 — the seven non-`dead` branches of rRep() (M14-27 … M14-73).
   Unit evidence only. Every export matrix is verified by INDEPENDENTLY
   recomputing the expected 2-D array here, never by snapshotting output. */

const movement = (over: Partial<MovementRow>): MovementRow => ({
  id: 'm', item_code: 'A', warehouse: 'W', date: '2026-02-01', in_qty: 0,
  out_qty: 0, price: 0, partner: '', type: 'Satınalma', invoice_num: '', note: '',
  doc_num: '', created_at: '', channel: '', contract_num: '', created_by: '', ...over,
})

const balance = (over: Partial<WarehouseBalance>): WarehouseBalance => ({
  w: 'W', c: 'A', in: 1, out: 0, n: 1, q: 1, last: '2026-01-01', first: '2026-01-01',
  price: 10, val: 10, name: 'Item A', unit: 'ədəd', ...over,
})

/* The real `partners` Row shape (types/database.ts:452-461). An earlier draft
   used an `as` cast AND omitted `...over`, so every override was silently
   discarded and every VÖEN read back as ''. No cast here deliberately: the
   fixture must fail to compile if the row shape changes. */
const partner = (over: Partial<PartnerRow> = {}): PartnerRow => ({
  id: 'p1', name: 'P', voen: null, contract: null, contract_date: null,
  active: true, created_at: null, created_by: null, ...over,
})

const agg = (
  movs: MovementRow[],
  items: Parameters<typeof buildReportAggregates>[1] = [],
  bal: WarehouseBalance[] = [],
) => buildReportAggregates(movs, items, bal)

/* ===================== selector model ===================== */

describe('report selector — index.html:402-409 (M14-05, M14-06, M14-07)', () => {
  it('carries exactly eight kinds in the legacy order', () => {
    expect(REPORT_KINDS).toEqual(['knt', 'type', 'wh', 'per', 'abc', 'dead', 'tr', 'qaime'])
  })

  it('uses the exact legacy option labels', () => {
    expect(REPORT_LABELS.knt).toBe('Kontragentlər üzrə dövriyyə')
    expect(REPORT_LABELS.type).toBe('Əməliyyat növləri üzrə xülasə')
    expect(REPORT_LABELS.wh).toBe('Anbarlar üzrə müqayisə')
    expect(REPORT_LABELS.per).toBe('Dövr (gün/ay) üzrə hərəkət')
    expect(REPORT_LABELS.abc).toBe('ABC təhlili')
    expect(REPORT_LABELS.dead).toBe('Hərəkətsiz və ölü qalıq')
    expect(REPORT_LABELS.tr).toBe('Anbarlararası yerdəyişmə matrisi')
    expect(REPORT_LABELS.qaime).toBe('Qaimələr üzrə hesabat')
  })

  it('knt is the first kind, so it is the default selection', () => {
    expect(REPORT_KINDS[0]).toBe('knt')
  })

  /* M14-93 — the export SLUG differs from the human label for every kind. */
  it('maps every kind to its legacy export slug, all distinct from the labels', () => {
    expect(REPORT_NAMES).toEqual({
      knt: 'kontragent_dovriyye', type: 'novler_uzre', wh: 'anbarlar_muqayise',
      per: 'dovr_uzre', abc: 'abc_tehlili', dead: 'hereketsiz_qaliq',
      tr: 'yerdeyisme_matrisi', qaime: 'qaimeler_uzre',
    })
    for (const k of REPORT_KINDS) expect(REPORT_NAMES[k]).not.toBe(REPORT_LABELS[k])
  })

  it('starts from the legacy initial REP_NAME before any branch renders', () => {
    expect(INITIAL_REPORT_NAME).toBe('hesabat')
  })
})

/* ===================== knt ===================== */

describe('knt — index.html:6741-6751 (M14-27 … M14-31)', () => {
  /* Fixture deliberately OPPOSES the expected order: the first-inserted
     partner has the LOWEST value, so an unsorted implementation fails (§4). */
  const movs = [
    movement({ id: 'a', partner: 'Low', in_qty: 1, price: 10 }),
    movement({ id: 'b', partner: 'High', in_qty: 5, price: 100 }),
    movement({ id: 'c', partner: 'Mid', in_qty: 2, price: 50 }),
  ]

  it('sorts by value DESCENDING from an opposing fixture', () => {
    const rows = partnerReportRows(agg(movs), [])
    expect(rows.map((r) => r.name)).toEqual(['High', 'Mid', 'Low'])
  })

  /* M14-28 — a partner absent from the directory yields EMPTY cells, not
     «—» and not undefined: legacy's `|| {}` then `p.voen || ''`. */
  it('leaves VÖEN and contract empty for a partner absent from the directory', () => {
    const rows = partnerReportRows(agg([movement({ partner: 'Ghost', in_qty: 1 })]), [])
    expect(rows[0].voen).toBe('')
    expect(rows[0].contract).toBe('')
  })

  it('resolves VÖEN and contract by exact name match', () => {
    const rows = partnerReportRows(
      agg([movement({ partner: 'Real', in_qty: 1 })]),
      [partner({ name: 'Real', voen: '1234567890', contract: 'C-1' })],
    )
    expect(rows[0].voen).toBe('1234567890')
    expect(rows[0].contract).toBe('C-1')
  })

  /* M14-29 / D-P4 — the Map must behave exactly like legacy's linear
     `find()`, which returns the FIRST match for a duplicated name. */
  it('matches legacy find() semantics for a duplicated partner name', () => {
    const rows = partnerReportRows(
      agg([movement({ partner: 'Dup', in_qty: 1 })]),
      [partner({ name: 'Dup', voen: 'FIRST' }), partner({ name: 'Dup', voen: 'SECOND' })],
    )
    expect(rows[0].voen).toBe('FIRST')
  })

  it('does not match a partner by a different name', () => {
    const rows = partnerReportRows(
      agg([movement({ partner: 'Wanted', in_qty: 1 })]),
      [partner({ name: 'Other', voen: 'X' })],
    )
    expect(rows[0].voen).toBe('')
  })

  /* M14-30 — the CHART caps at 12 while the TABLE does not. */
  it('caps the bar chart at the top 12 while the table keeps every row', () => {
    const many = Array.from({ length: 13 }, (_, i) =>
      movement({ id: 'm' + i, partner: 'P' + i, in_qty: i + 1, price: 1 }))
    const rows = partnerReportRows(agg(many), [])
    expect(rows).toHaveLength(13)
    expect(partnerTopBars(rows)).toHaveLength(12)
    /* Highest value first — P12 has in_qty 13. */
    expect(partnerTopBars(rows)[0].k).toBe('P12')
  })

  it('builds the export matrix independently recomputed', () => {
    const rows = partnerReportRows(
      agg([movement({ partner: 'Real', in_qty: 2, out_qty: 1, price: 10 })]),
      [partner({ name: 'Real', voen: 'V1', contract: 'C1' })],
    )
    expect(partnerExportMatrix(rows)).toEqual([
      ['Kontragent/Layihə', 'Əməliyyat sayı', 'Mədaxil miqdarı', 'Məxaric miqdarı',
        'Mədaxil dəyəri', 'VÖEN', 'Müqavilə'],
      ['Real', 1, 2, 1, '20.00', 'V1', 'C1'],
    ])
    expect(partnerExportMatrix(rows)[0]).toEqual(PARTNER_EXPORT_HEADER)
  })
})

/* ===================== type ===================== */

describe('type — index.html:6752-6757 (M14-32 … M14-35)', () => {
  it('sorts by COUNT descending from an opposing fixture', () => {
    const rows = typeReportRows(agg([
      movement({ id: 'a', type: 'Rare' }),
      movement({ id: 'b', type: 'Common' }),
      movement({ id: 'c', type: 'Common' }),
      movement({ id: 'd', type: 'Common' }),
    ]))
    expect(rows.map((r) => r.type)).toEqual(['Common', 'Rare'])
    expect(rows[0].n).toBe(3)
  })

  /* M14-33 — THE load-bearing case. The denominator is the GLOBAL operational
     count, not the branch's own sum. The fixture makes those differ: 1 row of
     this type out of 4 operational rows is 25%, whereas dividing by the
     branch's own sum would give 100%. */
  it('computes the share against the GLOBAL operational count, not the branch sum', () => {
    expect(typeSharePercent(1, 4)).toBe('25.0')
    expect(typeSharePercent(1, 1)).toBe('100.0')
  })

  it('floors the denominator at 1 so an empty set does not divide by zero', () => {
    expect(typeSharePercent(0, 0)).toBe('0.0')
  })

  it('builds the export matrix independently recomputed', () => {
    const rows = typeReportRows(agg([movement({ type: 'Satınalma', in_qty: 2, out_qty: 3, price: 10 })]))
    expect(typeExportMatrix(rows)).toEqual([
      ['Növ', 'Sayı', 'Mədaxil', 'Məxaric', 'Dəyər'],
      /* byType.val counts BOTH directions: (2+3)*10 = 50. */
      ['Satınalma', 1, 2, 3, '50.00'],
    ])
    expect(typeExportMatrix(rows)[0]).toEqual(TYPE_EXPORT_HEADER)
  })
})

/* ===================== wh ===================== */

describe('wh — index.html:6758-6767 (M14-36 … M14-42)', () => {
  /* M14-36 — configured order is preserved. The fixture's order is NOT
     alphabetical, so a sorting implementation fails. */
  it('keeps configured warehouse order and renders a warehouse with no movements', () => {
    const rows = warehouseReportRows(['Zed', 'Alpha'], agg([movement({ warehouse: 'Alpha' })]), [])
    expect(rows.map((r) => r.w)).toEqual(['Zed', 'Alpha'])
    expect(rows[0]).toEqual({ w: 'Zed', pos: 0, val: 0, in: 0, out: 0, n: 0, neg: 0 })
  })

  it('sums ALL balance values including zero-quantity and negative rows', () => {
    const rows = warehouseReportRows(['W'], agg([movement({ warehouse: 'W' })]), [
      balance({ w: 'W', c: 'A', val: 10 }),
      balance({ w: 'W', c: 'B', q: -1, val: -4 }),
      balance({ w: 'W', c: 'C', q: 0, val: 0 }),
    ])
    expect(rows[0].val).toBe(6)
  })

  /* M14-39 — `pos` uses the epsilon, `neg` is a STRICT `q < 0` with none.
     The `-1e-9` row is the discriminator: excluded from pos, counted in neg. */
  it('applies the epsilon to positions but a strict q<0 to the negative count', () => {
    const rows = warehouseReportRows(['W'], agg([movement({ warehouse: 'W' })]), [
      balance({ w: 'W', c: 'eq', q: 1e-9 }),
      balance({ w: 'W', c: 'negTiny', q: -1e-9 }),
      balance({ w: 'W', c: 'negReal', q: -5 }),
      balance({ w: 'W', c: 'pos', q: 3 }),
    ])
    expect(rows[0].pos).toBe(2)
    expect(rows[0].neg).toBe(2)
  })

  it('shows an em-dash rather than a percentage when nothing came in', () => {
    expect(turnoverPercent({ in: 0, out: 5 })).toBe('—')
    expect(turnoverPercent({ in: 10, out: 5 })).toBe('50.0%')
    expect(turnoverPercent({ in: 10, out: 0 })).toBe('0.0%')
  })

  /* M14-41 — the export omits the percentage the screen shows. */
  it('builds an export matrix whose column set differs from the screen set', () => {
    const rows = warehouseReportRows(['W'], agg([movement({ warehouse: 'W', in_qty: 4, out_qty: 2 })]), [
      balance({ w: 'W', q: 2, val: 25 }),
    ])
    expect(warehouseExportMatrix(rows)).toEqual([
      ['Anbar', 'Mövqe', 'Mədaxil', 'Məxaric', 'Dəyər', 'Mənfi qalıq', 'Əməliyyat'],
      ['W', 1, 4, 2, '25.00', 0, 1],
    ])
    expect(warehouseExportMatrix(rows)[0]).toEqual(WAREHOUSE_EXPORT_HEADER)
    expect(warehouseExportMatrix(rows)[0]).not.toContain('Dövriyyə %')
  })

  it('applies the display alias to the exported warehouse name', () => {
    const rows = warehouseReportRows(['Xocahəsən'], agg([]), [])
    expect(warehouseExportMatrix(rows)[1][0]).toBe('Xocəsən')
  })
})

/* ===================== per ===================== */

describe('per — index.html:6768-6775 (M14-43 … M14-47)', () => {
  /* M14-44 — THE load-bearing ordering case. The fixture crosses a year
     boundary, so sorting by the formatted `MM.YYYY` label would put
     «01.2026» before «12.2025». Sorting by the ISO key is the only pass. */
  const yearCrossing = agg([
    movement({ id: 'a', date: '2026-01-15', in_qty: 1 }),
    movement({ id: 'b', date: '2025-12-20', in_qty: 1 }),
  ])

  it('orders months by the ISO key, not the formatted label', () => {
    expect(monthReportRows(yearCrossing).map((r) => r.month)).toEqual(['2025-12', '2026-01'])
  })

  it('proves the label order would differ, so the test is not vacuous', () => {
    const labels = monthExportMatrix(monthReportRows(yearCrossing)).slice(1).map((r) => r[0])
    expect(labels).toEqual(['12.2025', '01.2026'])
    /* Sorted as text, the labels would invert — which is exactly the defect. */
    expect([...labels].sort()).toEqual(['01.2026', '12.2025'])
  })

  it('folds daily buckets into months, summing every measure', () => {
    const rows = monthReportRows(agg([
      movement({ id: 'a', date: '2026-03-01', in_qty: 1, out_qty: 2, price: 10 }),
      movement({ id: 'b', date: '2026-03-15', in_qty: 3, out_qty: 4, price: 10 }),
    ]))
    expect(rows).toHaveLength(1)
    /* byDate.val is INCOMING only: (1+3)*10 = 40. */
    expect(rows[0]).toEqual({ month: '2026-03', n: 2, in: 4, out: 6, val: 40 })
  })

  it('builds the daily series as one point per date valued by COUNT', () => {
    const series = dailyCountSeries(agg([
      movement({ id: 'a', date: '2026-01-02', in_qty: 99 }),
      movement({ id: 'b', date: '2026-01-01' }),
      movement({ id: 'c', date: '2026-01-02' }),
    ]))
    expect(series).toEqual([{ k: '2026-01-01', v: 1 }, { k: '2026-01-02', v: 2 }])
  })

  it('builds the export matrix with the FORMATTED month label', () => {
    const rows = monthReportRows(agg([movement({ date: '2026-03-01', in_qty: 2, out_qty: 1, price: 5 })]))
    expect(monthExportMatrix(rows)).toEqual([
      ['Ay', 'Əməliyyat', 'Mədaxil', 'Məxaric', 'Mədaxil dəyəri'],
      ['03.2026', 1, 2, 1, '10.00'],
    ])
    expect(monthExportMatrix(rows)[0]).toEqual(MONTH_EXPORT_HEADER)
  })
})

/* ===================== abc ===================== */

describe('abc — index.html:6776-6787 (M14-51 … M14-59)', () => {
  /* Four positions of 40/40/15/5 out of 100 give cumulative shares of
     .40 / .80 / .95 / 1.00 — landing EXACTLY on both thresholds, which is
     the boundary matrix the protocol requires (§3). */
  const boundary = agg([], [], [
    balance({ c: 'a', val: 40 }), balance({ c: 'b', val: 40 }),
    balance({ c: 'c', val: 15 }), balance({ c: 'd', val: 5 }),
  ])

  it('includes the exact .8 and .95 boundaries in the lower class', () => {
    const { rows } = abcReport(boundary)
    expect(rows.map((r) => r.cls)).toEqual(['A', 'A', 'B', 'C'])
    expect(rows[1].cum / 100).toBe(0.8)
    expect(rows[2].cum / 100).toBe(0.95)
  })

  it('pushes a row just past a boundary into the next class', () => {
    const { rows } = abcReport(agg([], [], [
      balance({ c: 'a', val: 81 }), balance({ c: 'b', val: 19 }),
    ]))
    /* .81 > .8 → the FIRST row is already B. */
    expect(rows.map((r) => r.cls)).toEqual(['B', 'C'])
  })

  it('sorts positions by value descending from an opposing fixture', () => {
    const { rows } = abcReport(agg([], [], [
      balance({ c: 'small', val: 1 }), balance({ c: 'big', val: 99 }),
    ]))
    expect(rows.map((r) => r.b.c)).toEqual(['big', 'small'])
  })

  /* M14-53 — an all-zero portfolio must not divide by zero. Every cumulative
     share becomes 0/1 = 0 <= .8, so every row classes A. */
  it('classes every row A for an all-zero portfolio via the tot||1 fallback', () => {
    const { rows, tot } = abcReport(agg([], [], [
      balance({ c: 'a', q: 5, val: 0 }), balance({ c: 'b', q: 5, val: 0 }),
    ]))
    expect(tot).toBe(1)
    expect(rows.map((r) => r.cls)).toEqual(['A', 'A'])
  })

  it('computes the three KPIs per class in the fixed A/B/C order', () => {
    const { rows } = abcReport(boundary)
    expect(abcKpis(rows)).toEqual([
      { cls: 'A', count: 2, value: 80 },
      { cls: 'B', count: 1, value: 15 },
      { cls: 'C', count: 1, value: 5 },
    ])
  })

  it('carries the exact KPI eyebrow suffixes, KPI classes and tag classes', () => {
    expect(ABC_KPI_SUFFIX).toEqual({ A: 'dəyərin 80%-i', B: 'növbəti 15%', C: 'qalan 5%' })
    expect(ABC_KPI_CLASS).toEqual({ A: 'g', B: '', C: 'o' })
    expect(ABC_TAG_CLASS).toEqual({ A: 't-in', B: 't-op', C: 't-mut' })
  })

  /* M14-57 — screen shows CUMULATIVE at 1dp, export shows INDIVIDUAL at 2dp.
     The fixture makes the two differ for the same row: row `b` has an
     individual share of 40% but a cumulative share of 80%. */
  it('prints a cumulative screen percentage that differs from the exported individual one', () => {
    const { rows, tot } = abcReport(boundary)
    expect(abcScreenPercent(rows[1], tot)).toBe('80.0%')
    expect(abcExportMatrix(rows)[2][6]).toBe('40.00')
  })

  /* A SOLE position has a cumulative share of exactly 1.0, which is > .95, so
     legacy classes it `C` — not `A`. An earlier draft of this test asserted
     `A` by assuming the first row is always the top class; the cumulative
     rule says otherwise, and the module was right. Kept as a boundary case in
     its own right: «the only position in the portfolio is class C». */
  it('classes a sole position C and exports it with the display alias', () => {
    const { rows } = abcReport(agg([], [], [
      balance({ w: 'Xocahəsən', c: '0000001', name: 'Sement', q: 2, val: 100 }),
    ]))
    expect(rows[0].cls).toBe('C')
    expect(abcExportMatrix(rows)).toEqual([
      ['Sinif', 'Kod', 'Mal', 'Anbar', 'Qalıq', 'Dəyər', 'Pay %'],
      ['C', '0000001', 'Sement', 'Xocəsən', 2, '100.00', '100.00'],
    ])
    expect(abcExportMatrix(rows)[0]).toEqual(ABC_EXPORT_HEADER)
  })

  /* M14-59 / D-P2 — reproduced verbatim although it contradicts SHOW_MAX. */
  it('carries the stale legacy hint verbatim even though SHOW_MAX is 3000', () => {
    expect(ABC_STALE_HINT).toBe('İlk 200 sətir göstərilir — tam siyahı üçün CSV ixrac edin.')
    expect(ABC_STALE_HINT).toContain('200')
  })
})

/* ===================== tr ===================== */

describe('tr — index.html:6805-6820 (M14-65 … M14-73)', () => {
  const WHS = ['Ələt', 'Astara']
  const prices = new Map([['A', 7]])

  it('considers only Yerdəyişmə rows', () => {
    const rows = transferMatrixRows([
      movement({ id: 'a', type: 'Satınalma', warehouse: 'Ələt', partner: 'Astara anbarına', out_qty: 5 }),
    ], WHS, prices)
    expect(rows).toEqual([])
  })

  /* M14-66 / M14-71 — THE divergence test. The prefix match is
     case-SENSITIVE, so «astara anbarı» is dropped here while the accepted
     `transferRoute()` normaliser resolves it. Both halves are asserted so the
     divergence is proven, not assumed. */
  it('drops a lower-case partner that the accepted route normaliser would resolve', () => {
    const m = movement({
      type: 'Yerdəyişmə', warehouse: 'Ələt', partner: 'astara anbarı', out_qty: 5,
    })
    expect(transferMatrixRows([m], WHS, prices)).toEqual([])
    /* The normaliser DOES resolve it — this is the divergence, not a bug. */
    expect(transferRoute(
      { type: 'Yerdəyişmə', warehouse: 'Ələt', partner: 'astara anbarı', in_qty: 0, out_qty: 5 },
      WHS,
    )).toBe('Ələt → Astara')
  })

  it('resolves a partner whose text begins with a configured warehouse name', () => {
    const rows = transferMatrixRows([
      movement({ type: 'Yerdəyişmə', warehouse: 'Ələt', partner: 'Astara anbarına', out_qty: 5 }),
    ], WHS, prices)
    expect(rows).toHaveLength(1)
    expect(rows[0].from).toBe('Ələt')
    expect(rows[0].to).toBe('Astara')
  })

  /* M14-67 — silently dropped: no row, no placeholder, no counter. */
  it('silently drops a transfer whose partner matches no warehouse prefix', () => {
    const rows = transferMatrixRows([
      movement({ type: 'Yerdəyişmə', warehouse: 'Ələt', partner: 'Some Supplier Ltd', out_qty: 5 }),
    ], WHS, prices)
    expect(rows).toEqual([])
  })

  it('does not match a warehouse name appearing later in the partner text', () => {
    const rows = transferMatrixRows([
      movement({ type: 'Yerdəyişmə', warehouse: 'Ələt', partner: 'Köçürmə Astara', out_qty: 5 }),
    ], WHS, prices)
    expect(rows).toEqual([])
  })

  /* M14-68 — the two directions of one corridor are SEPARATE rows. */
  it('keeps the two directions of one corridor as separate keys', () => {
    const rows = transferMatrixRows([
      movement({ id: 'out', type: 'Yerdəyişmə', warehouse: 'Ələt', partner: 'Astara anbarına', out_qty: 5 }),
      movement({ id: 'in', type: 'Yerdəyişmə', warehouse: 'Ələt', partner: 'Astara anbarı', in_qty: 3 }),
    ], WHS, prices)
    expect(rows).toHaveLength(2)
    expect(rows.map((r) => r.from + '→' + r.to).sort())
      .toEqual(['Astara→Ələt', 'Ələt→Astara'])
  })

  /* M14-69 — `(i || o)` is a FALLTHROUGH, not a sum. A row with both
     quantities contributes only the incoming one. */
  it('falls through to the outgoing quantity, and never sums the two', () => {
    const both = transferMatrixRows([
      movement({ type: 'Yerdəyişmə', warehouse: 'Ələt', partner: 'Astara anbarına', in_qty: 2, out_qty: 5 }),
    ], WHS, prices)
    expect(both[0].q).toBe(2)

    const outOnly = transferMatrixRows([
      movement({ type: 'Yerdəyişmə', warehouse: 'Ələt', partner: 'Astara anbarına', in_qty: 0, out_qty: 5 }),
    ], WHS, prices)
    expect(outOnly[0].q).toBe(5)
  })

  /* M14-70 — movement price wins when TRUTHY, then item price, then 0. */
  it('prices by the movement price, then the item price, then zero', () => {
    const withMovPrice = transferMatrixRows([
      movement({ type: 'Yerdəyişmə', warehouse: 'Ələt', partner: 'Astara anbarına', out_qty: 2, price: 50 }),
    ], WHS, prices)
    expect(withMovPrice[0].val).toBe(100)

    const withItemPrice = transferMatrixRows([
      movement({ type: 'Yerdəyişmə', warehouse: 'Ələt', partner: 'Astara anbarına', out_qty: 2, price: 0 }),
    ], WHS, prices)
    expect(withItemPrice[0].val).toBe(14)

    const noPrice = transferMatrixRows([
      movement({ type: 'Yerdəyişmə', warehouse: 'Ələt', partner: 'Astara anbarına', out_qty: 2, price: 0, item_code: 'UNKNOWN' }),
    ], WHS, prices)
    expect(noPrice[0].val).toBe(0)
  })

  it('aggregates repeated movements on the same corridor and sorts by quantity desc', () => {
    const rows = transferMatrixRows([
      movement({ id: 'a', type: 'Yerdəyişmə', warehouse: 'Ələt', partner: 'Astara anbarına', out_qty: 1 }),
      movement({ id: 'b', type: 'Yerdəyişmə', warehouse: 'Ələt', partner: 'Astara anbarına', out_qty: 2 }),
      movement({ id: 'c', type: 'Yerdəyişmə', warehouse: 'Astara', partner: 'Ələt anbarına', out_qty: 9 }),
    ], WHS, prices)
    expect(rows.map((r) => r.q)).toEqual([9, 3])
    expect(rows[1].n).toBe(2)
  })

  it('builds the export matrix with RAW stored names, not the display alias', () => {
    const rows = transferMatrixRows([
      movement({ type: 'Yerdəyişmə', warehouse: 'Xocahəsən', partner: 'Astara anbarına', out_qty: 2, price: 10 }),
    ], ['Xocahəsən', 'Astara'], prices)
    expect(transferExportMatrix(rows)).toEqual([
      ['Haradan', 'Hara', 'Əməliyyat', 'Miqdar', 'Dəyər'],
      ['Xocahəsən', 'Astara', 1, 2, '20.00'],
    ])
    expect(transferExportMatrix(rows)[0]).toEqual(TRANSFER_EXPORT_HEADER)
  })

  it('carries the exact empty-state text', () => {
    expect(TRANSFER_EMPTY).toBe('Yerdəyişmə qeydi tapılmadı.')
  })
})

/* ===================== print contract ===================== */

describe('print contract — index.html:6732 (M14-93, M14-94)', () => {
  /* M14-94 — the header row is excluded and the count is floored at 0, so an
     EMPTY matrix prints «0 sətir» rather than «-1 sətir». */
  it('excludes the header row from the printed count', () => {
    expect(printRowCount([['h'], ['a'], ['b']])).toBe(2)
  })

  it('floors an empty matrix at zero rather than reporting -1', () => {
    expect(printRowCount([])).toBe(0)
  })

  it('reports zero for a header-only matrix', () => {
    expect(printRowCount([['h']])).toBe(0)
  })

  /* M14-93 — the title carries the SLUG, never the human label. */
  it('titles the print with the export slug, not the option label', () => {
    expect(printTitle(REPORT_NAMES.abc)).toBe('Hesabat: abc_tehlili')
    expect(printTitle(REPORT_NAMES.abc)).not.toContain(REPORT_LABELS.abc)
  })
})
