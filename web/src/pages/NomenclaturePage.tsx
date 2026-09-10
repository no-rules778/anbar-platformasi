import { useEffect, useMemo, useState } from 'react'
import { useNomenclatureStore } from '../store/nomenclature.store'
import { useRealtimeRefresh } from '../hooks/useRealtimeRefresh'
import { filterItems, type ItemOnlyFilter } from '../lib/itemFilters'
import { applyCut, SHOW_MAX } from '../lib/showAllCut'
import { nf, money } from '../lib/format'
import { xls, nomenclatureExportMatrix } from '../lib/xls'
import { can, isAdmin, type Me } from '../lib/roles'
import type { ItemRow } from '../api/items.api'
import { Table, Thead, Th, Td } from '../components/ui/Table'
import { Button } from '../components/ui/Button'
import { PrintHead } from '../components/PrintHead'
import { ItemFormDialog } from '../components/nomenclature/ItemFormDialog'
import { ItemCard } from '../components/nomenclature/ItemCard'
import { BulkItemsDialog } from '../components/nomenclature/BulkItemsDialog'
import { ImportItemsDialog } from '../components/nomenclature/ImportItemsDialog'
import { CategoryImportDialog } from '../components/nomenclature/CategoryImportDialog'

/* Nomenklatura — rNom() (index.html:2413-2461). */

/* The tables this screen's data comes from (A10). `items` drives the list and
   the card; `movements` drives every balance, value, movement count and the
   card's history; `warehouses` drives the transfer-route resolution.
   `reference_values` is deliberately absent — the original's own subscription
   does not watch it either (index.html:1174), and the unit/category lists are
   re-read by load() anyway whenever one of these fires. */
const WATCHED_TABLES = ['items', 'movements', 'warehouses'] as const

const SEGMENTS: { key: ItemOnlyFilter; label: string }[] = [
  { key: '', label: 'Hamısı' },
  { key: 'nop', label: 'Qiyməti yox' },
  { key: 'nomv', label: 'Hərəkəti yox' },
  { key: 'dup', label: 'Oxşar adlar' },
]

interface Props {
  me: Me
  /* M5-55 — «Bu mal üzrə əməliyyat». The page does not navigate itself: the
     rail lives in App, so the switch is handed up. Optional, so the page
     stays renderable on its own (and every existing test keeps working); when
     it is absent the card's button simply does nothing, which is the same
     inert state H-3 shipped rather than a broken navigation. */
  onOpenOperation?: (code: string) => void
}

type Dialog =
  | { kind: 'edit'; item: ItemRow | null }
  | { kind: 'bulk' }
  | { kind: 'import' }
  | { kind: 'category' }
  | null

export function NomenclaturePage({ me, onOpenOperation }: Props) {
  const {
    items, indexes, units, categories, warehouses, loading, error,
    filters, showAll, cardCode, setFilters, setShowAll, openCard, load,
  } = useNomenclatureStore()

  const [dialog, setDialog] = useState<Dialog>(null)
  const [printedAt, setPrintedAt] = useState<Date | null>(null)
  /* Debounced search text, mirroring the original's 200 ms debounce (2418). */
  const [search, setSearch] = useState(filters.q)

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /* A10 — shared-data Realtime, subscribeRealtime() (index.html:1162-1181).
     Without it this screen went stale the moment another user changed a name,
     price or movement, and the sync indicator read «bağlı deyil» throughout.

     Only the tables this screen actually reads are watched. `audit_log` is
     NOT among them and must not be added — Phase 4 Q3 forbids it.

     What the refresh does and does not touch matters: load() replaces the
     server-owned data only. Filters, the search box, the «show all»
     expansion and any open dialog are component/store state it never writes,
     so a colleague's edit cannot discard what this user is in the middle of
     typing. The hook owns the debounce, the single-channel guard, the
     teardown and the late-response protection. */
  useRealtimeRefresh(true, WATCHED_TABLES, () => { void load() })

  useEffect(() => {
    const t = setTimeout(() => setFilters({ q: search.trim().toLowerCase() }), 200)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search])

  const rows = useMemo(
    () => filterItems(items, filters, indexes.byItem),
    [items, filters, indexes],
  )
  const page = applyCut(rows, showAll)

  const canAdd = can(me, 'item.add')
  const canEdit = can(me, 'item.edit')

  function print() {
    /* Stamp at click, then commit before printing — the M4-18d pattern. */
    setPrintedAt(new Date())
    setTimeout(() => window.print(), 60)
  }

  function exportXls() {
    xls(
      nomenclatureExportMatrix(rows.map((i) => {
        const b = indexes.byItem.get(i.code)
        return {
          code: i.code, name: i.name, unit: i.unit, price: i.price,
          q: b ? b.q : 0, val: b ? b.val : 0,
        }
      })),
      'nomenklatura',
    )
  }

  function reload() { setDialog(null); void load() }

  return (
    <>
      <PrintHead title="Nomenklatura" userName={me.name} note={nf(rows.length) + ' mal'} stampedAt={printedAt} />

      <div className="phead">
        <div>
          <h2>Nomenklatura</h2>
          <p>Malların kodu, adı, ölçüsü, son qiyməti və ümumi qalığı.</p>
        </div>
        <div className="sp" />
        {/* Disabled vs hidden is the original's own distinction (2455-2460):
            add/bulk/import are DISABLED without item.add, while the category
            import is HIDDEN entirely from a non-admin. */}
        <Button variant="secondary" onClick={print}>Çap</Button>
        <Button variant="secondary" onClick={exportXls}>Excel</Button>
        <Button disabled={!canAdd} onClick={() => setDialog({ kind: 'edit', item: null })}>Yeni mal</Button>
        <Button variant="secondary" disabled={!canAdd} onClick={() => setDialog({ kind: 'bulk' })}>
          Toplu əlavə
        </Button>
        <Button variant="secondary" disabled={!canAdd} onClick={() => setDialog({ kind: 'import' })}>
          İdxal
        </Button>
        {isAdmin(me) && (
          <Button variant="secondary" onClick={() => setDialog({ kind: 'category' })}>
            Kateqoriya idxalı
          </Button>
        )}
      </div>

      <div className="filters">
        <input
          type="search"
          aria-label="Axtarış"
          placeholder="Ad və ya kod üzrə axtarış…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="seg">
          {SEGMENTS.map((s) => (
            <button
              key={s.key || 'all'}
              className={filters.only === s.key ? 'on' : undefined}
              aria-pressed={filters.only === s.key}
              onClick={() => setFilters({ only: s.key })}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {error && <div className="empty"><b>{error}</b></div>}

      <div className="card">
        <Table>
          <Thead>
            <tr>
              <Th>Kod</Th><Th>Malın adı</Th><Th>Ölçü</Th>
              <Th right>Son qiymət</Th><Th right>Ümumi qalıq</Th>
              <Th right>Dəyər</Th><Th right>Hərəkət</Th><Th> </Th>
            </tr>
          </Thead>
          <tbody>
            {page.map((i) => {
              const b = indexes.byItem.get(i.code)
              return (
                <tr key={i.code} onClick={() => openCard(i.code)} style={{ cursor: 'pointer' }}>
                  <Td><span className="code">{i.code}</span></Td>
                  <Td><div className="nm">{i.name}</div></Td>
                  <Td>{i.unit}</Td>
                  <Td>{i.price ? nf(i.price, 2) : <span className="muted">—</span>}</Td>
                  <Td>{b ? <b className={b.q < 0 ? 'neg' : undefined}>{nf(b.q, 2)}</b> : <span className="muted">0</span>}</Td>
                  <Td>{b ? money(b.val) : '—'}</Td>
                  <Td>{b ? nf(b.n) : <span className="muted">0</span>}</Td>
                  <Td>
                    {canEdit && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={(e) => { e.stopPropagation(); setDialog({ kind: 'edit', item: i }) }}
                      >
                        Düzəliş
                      </Button>
                    )}
                  </Td>
                </tr>
              )
            })}
          </tbody>
        </Table>
      </div>

      {/* Footer (2448-2450): the total-in-database suffix appears ONLY when
          the filtered count differs from the whole directory. */}
      <div className="pager">
        <span className="hint">
          {nf(rows.length)} mal
          {rows.length !== items.length ? ` (bazada cəmi ${nf(items.length)})` : ''}
          {!showAll && rows.length > SHOW_MAX && (
            <>
              {' · '}<b>{nf(SHOW_MAX)}</b> göstərilir{' '}
              <Button variant="secondary" size="sm" onClick={() => setShowAll(true)}>
                Hamısını göstər ({nf(rows.length)})
              </Button>
            </>
          )}
        </span>
      </div>

      {loading && <div className="hint">Yüklənir…</div>}

      {dialog?.kind === 'edit' && (
        <ItemFormDialog
          item={dialog.item}
          items={items}
          units={units}
          categories={categories}
          me={me}
          onSaved={reload}
          onClose={() => setDialog(null)}
        />
      )}
      {dialog?.kind === 'bulk' && (
        <BulkItemsDialog items={items} units={units} me={me} onDone={reload} onClose={() => setDialog(null)} />
      )}
      {dialog?.kind === 'import' && (
        <ImportItemsDialog items={items} onDone={reload} onClose={() => setDialog(null)} />
      )}
      {dialog?.kind === 'category' && (
        <CategoryImportDialog
          items={items}
          categories={categories}
          me={me}
          onDone={reload}
          onClose={() => setDialog(null)}
        />
      )}

      {cardCode && (
        <ItemCard
          code={cardCode}
          items={items}
          indexes={indexes}
          me={me}
          warehouses={warehouses}
          onEdit={(c) => setDialog({ kind: 'edit', item: items.find((i) => i.code === c) ?? null })}
          onOperation={(c) => onOpenOperation?.(c)}
          onClose={() => openCard(null)}
        />
      )}
    </>
  )
}
