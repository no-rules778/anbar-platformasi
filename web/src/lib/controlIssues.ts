import type { MovementRow } from '../api/itemMovements.api'
import type { ItemRow } from '../api/items.api'
import type { WarehouseBalance } from './itemIndex'
import { fmtD, money, nf } from './format'
import { whLabel } from './movementRoute'

/* controlIssues() — index.html:6996-7031, ported WHOLE so that the later
   «Nəzarət və risklər» phase consumes this same function. The dashboard
   (M11-50) renders only `sev`, `title` and `rows.length`; `why`, `cols`,
   `rows` and `codes` are carried for rCtrl() parity and are not displayed
   in Phase 11.

   Ten rules in a FIXED order; a rule with no rows pushes no group. The
   function is GLOBAL — it never sees the dashboard's warehouse selector. */

export type ControlSeverity = 'high' | 'med' | 'low'

export interface ControlGroup {
  id: string
  sev: ControlSeverity
  title: string
  why: string
  cols: string[]
  rows: string[][]
  codes: string[]
}

export interface ControlIssuesInput {
  /** `IX.bal`. */
  bal: readonly WarehouseBalance[]
  /** `IX.byItem` — only `q` is read (7021). */
  byItem: ReadonlyMap<string, { q: number }>
  /** `normalMovements()`. */
  operational: readonly MovementRow[]
  /** `DB.items`. */
  items: readonly ItemRow[]
  /** `DB.partners` — only `name` and `voen` are read (7004). */
  partners: readonly { name: string; voen?: string | null }[]
  /** `DB.locs.map(l => l.name)` — EVERY warehouse/location row (7003). */
  locationNames: readonly string[]
  /** `DB.whs` — active `anbar` names, in configured order (7003, 7010). */
  warehouses: readonly string[]
  /** `today()` — injected so tests are date-stable. */
  today: string
  /** `m.by` — the final recorder label (index.html:990), for the `fut` rows. */
  recorder: (m: MovementRow) => string
}

const EPS = 1e-9

const num = (v: number | string | null | undefined): number => {
  if (v == null) return 0
  const n = Number(v)
  return isNaN(n) ? 0 : n
}

/** The six literal internal counterparties of 7003, verbatim. */
export const INTERNAL_PARTNER_LITERALS = [
  'Bazar', 'Nağd alış', 'Kommersiya şirkəti', 'Sahə üzrə məsul şəxs', 'Əvvələ anbar qalığı', 'Anbar qalığı',
] as const

export function controlIssues(input: ControlIssuesInput): ControlGroup[] {
  const { bal, byItem, operational, items, partners, locationNames, warehouses, today, recorder } = input
  const itemBy = new Map(items.map((i) => [i.code, i]))
  /* `(DB.itemBy.get(c) || {}).price || 0` — the loader's `parseFloat(price) || 0`. */
  const itemPrice = (code: string): number => num(itemBy.get(code)?.price)
  const G: ControlGroup[] = []

  const neg = bal.filter((b) => b.q < -EPS)
  if (neg.length) G.push({ id: 'neg', sev: 'high', title: 'Mənfi qalıq', why: 'Məxaric mədaxildən çoxdur — ya mədaxil qeydə alınmayıb, ya da məxaric səhv anbara yazılıb. Maliyyə hesabatını təhrif edir.', cols: ['Anbar', 'Kod', 'Mal', 'Qalıq'], rows: neg.map((b) => [whLabel(b.w), b.c, b.name, nf(b.q, 2)]), codes: neg.map((b) => b.c) })

  const nop = bal.filter((b) => Math.abs(b.q) > EPS).filter((b) => !b.price)
  if (nop.length) G.push({ id: 'nop', sev: 'med', title: 'Qiyməti olmayan qalıq', why: 'Qiymət daxil edilmədən qalığın dəyəri sıfır kimi hesablanır; balans və sığorta dəyəri əskik göstərilir.', cols: ['Anbar', 'Kod', 'Mal', 'Qalıq'], rows: nop.map((b) => [whLabel(b.w), b.c, b.name, nf(b.q, 2)]), codes: nop.map((b) => b.c) })

  const nodoc = operational.filter((m) => m.type === 'Satınalma' && !m.invoice_num && !m.contract_num)
  if (nodoc.length) G.push({ id: 'doc', sev: 'low', title: 'Sənədsiz satınalma', why: 'Qaimə və ya müqavilə nömrəsi göstərilməyib. Bu, əməliyyatı bloklamır — yalnız xatırlatma üçündür.', cols: ['Tarix', 'Anbar', 'Kod', 'Kontragent'], rows: nodoc.map((m) => [fmtD(m.date), whLabel(m.warehouse), m.item_code, m.partner || '—']), codes: nodoc.map((m) => m.item_code) })

  const internal = new Set<string>([...locationNames, ...warehouses, ...INTERNAL_PARTNER_LITERALS])
  const noVoen = operational.filter((m) => m.type === 'Satınalma' && m.partner && !internal.has(m.partner) && !partners.some((p) => p.name === m.partner && p.voen))
  if (noVoen.length) G.push({ id: 'voen', sev: 'low', title: 'VÖEN-siz kontragentdən alış', why: 'Kontragent bazasında VÖEN yoxdur. Bu, əməliyyatı bloklamır — yalnız xatırlatma üçündür.', cols: ['Tarix', 'Kontragent', 'Kod', 'Miqdar'], rows: noVoen.map((m) => [fmtD(m.date), m.partner ?? '', m.item_code, nf(num(m.in_qty), 2)]), codes: noVoen.map((m) => m.item_code) })

  const orphan = operational.filter((m) => !itemBy.has(m.item_code))
  if (orphan.length) G.push({ id: 'orph', sev: 'high', title: 'Nomenklaturada olmayan mal', why: 'Hərəkət qeydi mövcud olmayan mal koduna istinad edir — hesabatlarda ad görünmür.', cols: ['Tarix', 'Anbar', 'Kod', 'Miqdar'], rows: orphan.map((m) => [fmtD(m.date), whLabel(m.warehouse), m.item_code, nf(num(m.in_qty) - num(m.out_qty), 2)]), codes: orphan.map((m) => m.item_code) })

  /* Unpaired transfers — 7009-7016. `other` is the FIRST configured
     warehouse that is a PREFIX of the partner text; a pair is an
     opposite-direction transfer of the same code IN that warehouse whose
     quantity differs by less than 1e-6, preferring the same date. */
  const tr = operational.filter((m) => m.type === 'Yerdəyişmə')
  const dd = (a: string | null | undefined, b: string | null | undefined): number =>
    (!a || !b) ? 0 : Math.abs(new Date(a).getTime() - new Date(b).getTime()) / 86400000
  const pair = (m: MovementRow): MovementRow | null => {
    const other = warehouses.find((w) => (m.partner || '').indexOf(w) === 0)
    if (!other) return null
    const mi = num(m.in_qty), mo = num(m.out_qty)
    const cands = tr.filter((x) => {
      const xi = num(x.in_qty), xo = num(x.out_qty)
      return x !== m && x.item_code === m.item_code && x.warehouse === other
        && ((mi > 0 && xo > 0) || (mo > 0 && xi > 0))
        && Math.abs((xi || xo) - (mi || mo)) < 1e-6
    })
    return cands.find((x) => x.date === m.date) || cands[0] || null
  }
  const unp = tr.filter((m) => !pair(m))
  if (unp.length) G.push({ id: 'tr', sev: 'high', title: 'Cütü olmayan yerdəyişmə', why: 'Bir anbardan çıxan mal digərində mədaxil edilməyib — yolda itki və ya uçot boşluğu deməkdir.', cols: ['Tarix', 'Anbar', 'Kod', 'Miqdar', 'Qarşı tərəf'], rows: unp.map((m) => [fmtD(m.date), whLabel(m.warehouse), m.item_code, nf(num(m.in_qty) || num(m.out_qty), 2), m.partner || '—']), codes: unp.map((m) => m.item_code) })

  const lag = tr.filter((m) => num(m.out_qty) > 0).map((m) => ({ m, x: pair(m) })).filter((r): r is { m: MovementRow; x: MovementRow } => !!r.x && dd(r.x.date, r.m.date) > 3)
  if (lag.length) G.push({ id: 'lag', sev: 'med', title: 'Yerdəyişmənin tarixləri uyğun gəlmir', why: 'Malın çıxışı və mədaxili fərqli tarixlərdə qeyd olunub. Ay sonunda qalıq iki anbarda birdən və ya heç birində görünmür — dövr kəsiliş (cut-off) səhvidir.', cols: ['Kod', 'Göndərən anbar', 'Çıxış tarixi', 'Qəbul tarixi', 'Fərq (gün)'], rows: lag.map((r) => [r.m.item_code, whLabel(r.m.warehouse), fmtD(r.m.date), fmtD(r.x.date), nf(dd(r.x.date, r.m.date))]), codes: lag.map((r) => r.m.item_code) })

  /* Duplicate names — 7019-7022. The COUNT is the number of GROUPS. */
  const norm = (s: string): string => s.toLowerCase().replace(/[\s/.,"'-]+/g, '')
  const dupm = new Map<string, ItemRow[]>()
  items.forEach((i) => { const k = norm(i.name); if (!dupm.has(k)) dupm.set(k, []); dupm.get(k)!.push(i) })
  const dups = Array.from(dupm.values()).filter((v) => v.length > 1)
  if (dups.length) G.push({ id: 'dup', sev: 'med', title: 'Nomenklaturada təkrar', why: 'Eyni mal iki kodla qeydə alınıb — qalıq bölünür, satınalma tələbi səhv hesablanır.', cols: ['Adı', 'Kodlar', 'Qalıqlar'], rows: dups.map((v) => [v[0].name, v.map((x) => x.code).join(', '), v.map((x) => nf((byItem.get(x.code) || { q: 0 }).q, 2)).join(' / ')]), codes: dups.map((v) => v[0].code) })

  const future = operational.filter((m) => m.date > today)
  if (future.length) G.push({ id: 'fut', sev: 'med', title: 'Gələcək tarixli qeyd', why: 'Əməliyyat tarixi bugünkü tarixdən sonradır — yazılış səhvi ehtimalı yüksəkdir.', cols: ['Tarix', 'Anbar', 'Kod', 'Qeyd edən'], rows: future.map((m) => [fmtD(m.date), whLabel(m.warehouse), m.item_code, recorder(m) || '—']), codes: future.map((m) => m.item_code) })

  /* Large write-offs — 7025-7026: ITEM price (never the movement price), strictly above 500. */
  const bigwo = operational.filter((m) => m.type === 'Silinmə' && num(m.out_qty) * itemPrice(m.item_code) > 500)
  if (bigwo.length) G.push({ id: 'wo', sev: 'high', title: 'İri məbləğli silinmə', why: '500 ₼-dən yuxarı silinmə komissiya aktı və rəhbər təsdiqi tələb edir. Məbləğ cari mal qiyməti ilə təxmini hesablanıb.', cols: ['Tarix', 'Anbar', 'Kod', 'Məbləğ (təxmini)'], rows: bigwo.map((m) => [fmtD(m.date), whLabel(m.warehouse), m.item_code, money(num(m.out_qty) * itemPrice(m.item_code))]), codes: bigwo.map((m) => m.item_code) })

  return G
}
