import { useEffect, useMemo, useState } from 'react'
import { useItemGroupsStore, selectionKey } from '../store/itemGroups.store'
import { useRealtimeRefresh } from '../hooks/useRealtimeRefresh'
import { useToastStore } from '../store/toast.store'
import { groupRows, groupPriceRange, CAT_UNSET, type GroupRow } from '../lib/groupFilters'
import { allowedWarehouses } from '../lib/warehouseScope'
import { applyCut, SHOW_MAX } from '../lib/showAllCut'
import { whLabel } from '../lib/movementRoute'
import { xlsGroups } from '../lib/xlsGroups'
import { nf } from '../lib/format'
import type { Me } from '../lib/roles'
import { Table, Thead, Th, Td } from '../components/ui/Table'
import { Button } from '../components/ui/Button'

/* Mal qrupları — rGroups() (index.html:2758-2820) and grpExport() (2822-2854).
   Markup ported from the `p-grp` section (354-361).

   Read and select only. The screen has NO write path: it never posts, never
   changes a balance, a price, the nomenclature or a movement. Its single
   outbound action is generating an Excel file in the browser. */

/* Q2 — the page-scoped Realtime pattern, deliberately contained.

   These are exactly the tables this screen reads: `items` (name, unit,
   category), `movements` (every balance and the last-purchase price) and
   `warehouses` (the filter panel and the permission scope). `audit_log` is NOT
   among them and must not be added — Phase 4 Q3 forbids it.

   One channel, one subscription, torn down on unmount: the hook owns the
   debounce, the single-channel guard and the teardown. Moving connection state
   into the shell remains the real fix and stays out of this phase. */
const WATCHED_TABLES = ['items', 'movements', 'warehouses'] as const

interface Props {
  me: Me
}

export function ItemGroupsPage({ me }: Props) {
  const {
    itemBy, indexes, lastPurchase, warehouses, categories,
    loading, error, loaded,
    filters, selection, showAll,
    setFilters, toggleWarehouse, toggleCategory, toggleSelection,
    pruneSelection, setShowAll, reset, load, refresh,
  } = useItemGroupsStore()

  const toast = useToastStore((s) => s.show)
  const [exporting, setExporting] = useState(false)

  /* Local mirrors of the three debounced inputs (2789-2791). The store holds
     the committed value; these hold what the user is typing. */
  const [minText, setMinText] = useState(filters.min)
  const [maxText, setMaxText] = useState(filters.max)
  const [search, setSearch] = useState(filters.q)

  /* M6-S1 — direct navigation. The screen loads its own data on mount, so
     opening Mal qrupları straight after login works without visiting
     Nomenklatura first. `loaded` guards against a redundant second read when
     the user navigates away and back. */
  useEffect(() => {
    if (!loaded) void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useRealtimeRefresh(true, WATCHED_TABLES, () => { void load() })

  useEffect(() => {
    const t = setTimeout(() => setFilters({ min: minText.trim() }), 200)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [minText])

  useEffect(() => {
    const t = setTimeout(() => setFilters({ max: maxText.trim() }), 200)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [maxText])

  useEffect(() => {
    const t = setTimeout(() => setFilters({ q: search.trim().toLowerCase() }), 200)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search])

  /* M6-03 / M6-S6 — active `anbar` warehouses (already filtered by the
     snapshot loader), then the role scope. An anbardar sees ONLY their own
     warehouse here; the Astara/Harmony source group belongs to transfers. */
  const allowed = useMemo(() => allowedWarehouses(me, warehouses), [me, warehouses])

  const result = useMemo(
    () => groupRows({ bal: indexes.bal, itemBy, lastPurchase, allowed, filters }),
    [indexes, itemBy, lastPurchase, allowed, filters],
  )

  const rows: GroupRow[] = result.ok ? result.rows : []

  /* M6-25 / M6-S12 — prune against the COMPLETE filtered result, before the
     display cut below. A selected row past the 3000-row boundary is still
     reachable through «Hamısını göstər» and must not be silently dropped.

     Skipped while a validation error is showing: `rows` is empty then only
     because the filter is invalid, and wiping the user's selection over a
     half-typed number would be a data-losing side effect the original does
     not have (it returns before touching GRP.sel, 2795-2800). */
  useEffect(() => {
    if (!result.ok) return
    pruneSelection(new Set(rows.map(selectionKey)))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result.ok, rows])

  const page = applyCut(rows, showAll) // M6-09

  const selectedCount = selection.size

  async function onExport() {
    if (!selection.size || exporting) return

    /* M6-28 — revalidate first. An invalid range stops everything: no
       refresh, no export (2828-2829). */
    const pre = groupPriceRange(filters)
    if (!pre.ok) { toast(pre.msg, true); return }

    /* M6-32, ordering — capture the selection BEFORE the refresh.

       The original is synchronous after loadFromDB(): it reads GRP.sel, counts
       `dropped`, exports, reports the count, and only THEN calls rGroups()
       (2845-2850), so the re-render that prunes the selection happens after
       the count exists.

       React inverts that. `refresh()` commits new data, the pruning effect
       runs on the next render, and by the time this function resumed the
       selection had already lost exactly the rows whose disappearance it is
       supposed to report — «dropped» came out 0 every time. Snapshotting here
       restores the original's read order. */
    const selectedKeys = [...selection]

    setExporting(true)
    try {
      /* M6-29 / M6-30 / M6-S3 — refresh immediately before writing. A failed
         refresh ABORTS; it is never allowed to look like "zero balance", and
         the previous screen state is kept intact by the store. */
      const res = await refresh()
      if (!res.ok) {
        toast('Məlumat yenilənmədi — ixrac dayandırıldı: ' + (res.error || 'şəbəkə xətası'), true)
        return
      }

      const snapTs = Date.now() // M6-31 — only after a successful refresh

      /* Recompute against the REFRESHED data, exactly as the original calls
         grpRows() again at 2843. */
      const fresh = groupRows({
        bal: useItemGroupsStore.getState().indexes.bal,
        itemBy: useItemGroupsStore.getState().itemBy,
        lastPurchase: useItemGroupsStore.getState().lastPurchase,
        allowed: allowedWarehouses(me, useItemGroupsStore.getState().warehouses),
        filters: useItemGroupsStore.getState().filters,
      })
      if (!fresh.ok) { toast(fresh.error, true); return } // safety re-check (2844)

      const byKey = new Map(fresh.rows.map((r) => [selectionKey(r), r]))

      /* M6-32 — keep the selection; drop only rows that no longer have a
         positive balance, and report exactly how many were dropped. */
      const chosen: GroupRow[] = []
      let dropped = 0
      for (const k of selectedKeys) {
        const r = byKey.get(k)
        if (r) chosen.push(r)
        else dropped++
      }

      if (!chosen.length) {
        toast('Seçilmiş sətirlərin müsbət qalığı qalmayıb — ixrac dayandırıldı', true)
        return
      }

      const out = xlsGroups(chosen, snapTs)
      if (!out.ok) { toast(out.error || 'Excel kitabxanası yüklənmədi', true); return }

      toast('mal_qruplari.xlsx yükləndi (' + out.count + ' sətir)')
      if (dropped) toast(dropped + ' sətir qalıqsız olduğu üçün ixracdan çıxarıldı', true)
    } catch (e) {
      toast('İxrac xətası: ' + (e instanceof Error && e.message ? e.message : 'bilinmir'), true)
    } finally {
      setExporting(false)
    }
  }

  function onReset() {
    reset()
    setMinText('')
    setMaxText('')
    setSearch('')
  }

  return (
    <>
      <div className="phead">
        <div>
          <h2>Mal qrupları</h2>
          <p>
            Kateqoriya, anbar və qiymət üzrə süzgəc. Yalnız müsbət qalıqlar.
            Seçilmiş sətirləri ayrıca sadə Excel-ə ixrac edin (SON şablonu ilə əlaqəsizdir).
          </p>
        </div>
        <div className="sp" />
        <span className="hint" style={{ marginRight: 8 }}>
          {selectedCount ? nf(selectedCount) + ' sətir seçilib' : 'Sətir seçilməyib'}
        </span>
        <Button onClick={() => void onExport()} disabled={!selectedCount || exporting}>
          ⬇ Seçilənləri Excel-ə ixrac et
        </Button>
      </div>

      <div
        className="pad"
        style={{ border: '1px solid var(--line-2)', borderRadius: 6, marginBottom: 12 }}
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
          <div style={{ minWidth: 170 }}>
            <div className="eyebrow" style={{ marginBottom: 5 }}>Anbar (bir və ya bir neçə)</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {allowed.length === 0 ? (
                <span className="hint">İcazəli anbar yoxdur</span>
              ) : (
                allowed.map((w) => (
                  <label key={w} className="tag t-mut" style={{ cursor: 'pointer', userSelect: 'none' }}>
                    <input
                      type="checkbox"
                      checked={filters.whs.has(w)}
                      onChange={() => toggleWarehouse(w)}
                      style={{ marginRight: 5 }}
                    />
                    {/* M6-S7 — whLabel() only here, as the original does (2782). */}
                    {whLabel(w)}
                  </label>
                ))
              )}
            </div>
          </div>

          <div style={{ minWidth: 260, flex: 1 }}>
            <div className="eyebrow" style={{ marginBottom: 5 }}>Kateqoriya (bir və ya bir neçə)</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {[CAT_UNSET, ...categories].map((c) => (
                <label key={c} className="tag t-mut" style={{ cursor: 'pointer', userSelect: 'none' }}>
                  <input
                    type="checkbox"
                    checked={filters.cats.has(c)}
                    onChange={() => toggleCategory(c)}
                    style={{ marginRight: 5 }}
                  />
                  {c}
                </label>
              ))}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'end', marginTop: 12 }}>
          <label className="f" style={{ maxWidth: 150 }}>
            <span>Min qiymət (₼)</span>
            <input
              type="number" step="0.01" placeholder="—" aria-label="Min qiymət"
              value={minText} onChange={(e) => setMinText(e.target.value)}
            />
          </label>
          <label className="f" style={{ maxWidth: 150 }}>
            <span>Max qiymət (₼)</span>
            <input
              type="number" step="0.01" placeholder="—" aria-label="Max qiymət"
              value={maxText} onChange={(e) => setMaxText(e.target.value)}
            />
          </label>
          <label className="f" style={{ flex: 1, minWidth: 200 }}>
            <span>Axtarış (kod və ya ad)</span>
            <input
              type="search" placeholder="məs. 0000152 və ya nasos" aria-label="Axtarış"
              value={search} onChange={(e) => setSearch(e.target.value)}
            />
          </label>
          <Button variant="secondary" onClick={onReset}>Süzgəcləri sıfırla</Button>
        </div>

        <div className="hint" style={{ marginTop: 7 }}>
          Süzgəclər arasında VƏ (AND); eyni süzgəc daxilində VƏ YA (OR).
          Min/Max sərhədləri daxildir. Qiymətsiz mal Min/Max seçiləndə siyahıya düşmür.
          Yalnız müsbət qalıqlar göstərilir.
        </div>
      </div>

      <div className="card">
        {/* M6-18 — a validation error replaces the table entirely (2795-2800). */}
        {!result.ok ? (
          <div className="empty"><b>Süzgəc xətası</b>{result.error}</div>
        ) : loading && !loaded ? (
          <div className="empty"><b>Yüklənir…</b></div>
        ) : error && !loaded ? (
          /* A01 / M6-S17 — a FAILED INITIAL LOAD is not an empty result.

             `loaded` is false only when no snapshot has ever been applied, so
             `rows` is empty because the read failed, not because the filters
             matched nothing. Rendering «Nəticə yoxdur … müsbət qalıq yoxdur»
             here would state a calculated fact the platform does not have —
             precisely the failure mode M6-S3/M6-S4 exist to prevent, and the
             same «never present a failure as zero balance» rule the original
             applies to the export path (index.html:2833-2841).

             A failed REFRESH after a good snapshot is different and is left
             alone: `loaded` is true there, the retained rows stay on screen,
             and the error is reported in the footer below. */
          <div className="empty">
            <b>Məlumat yüklənmədi</b>
            {error}
          </div>
        ) : rows.length === 0 ? (
          <div className="empty"><b>Nəticə yoxdur</b>Bu süzgəclərə uyğun müsbət qalıq yoxdur.</div>
        ) : (
          <Table>
            <Thead>
              <tr>
                <Th>{''}</Th>
                <Th>Kod</Th>
                <Th>Malın adı</Th>
                <Th>Kateqoriya</Th>
                <Th>Anbar</Th>
                <Th right>Miqdar</Th>
                <Th right>Son alış qiyməti</Th>
              </tr>
            </Thead>
            <tbody>
              {page.map((r) => {
                const k = selectionKey(r)
                return (
                  <tr key={k}>
                    <Td>
                      <input
                        type="checkbox"
                        aria-label={'Seç ' + r.code + ' ' + r.wh}
                        checked={selection.has(k)}
                        onChange={() => toggleSelection(k)}
                      />
                    </Td>
                    <Td><span className="code">{r.code}</span></Td>
                    <Td><div className="nm">{r.name}</div></Td>
                    <Td>
                      {r.cat === CAT_UNSET ? <span className="muted">{CAT_UNSET}</span> : r.cat}
                    </Td>
                    {/* M6-S7 — raw stored value, as the original renders it (2811). */}
                    <Td>{r.wh}</Td>
                    <Td className="num r">{nf(r.qty, 2) + ' ' + r.unit}</Td>
                    <Td className="num r">
                      {r.price != null ? nf(r.price, 2) : <span className="muted">—</span>}
                    </Td>
                  </tr>
                )
              })}
            </tbody>
          </Table>
        )}

        <div
          className="pad"
          style={{ borderTop: '1px solid var(--line-2)', display: 'flex', alignItems: 'center', gap: 10 }}
        >
          {!result.ok ? (
            <span className="hint" style={{ color: 'var(--alarm)' }}>{result.error}</span>
          ) : error && !loaded ? (
            /* A01 — the same rule as the table above: with no snapshot ever
               loaded there is no row count to report, so «0 sətir (müsbət
               qalıq)» would assert a calculation that never ran. The error
               itself is already shown in the table area, so this slot stays
               empty rather than repeating it. */
            null
          ) : (
            <span className="hint">
              {nf(rows.length)} sətir (müsbət qalıq)
              {!showAll && rows.length > SHOW_MAX && (
                <>
                  {' · '}<b>{nf(SHOW_MAX)}</b> göstərilir{' '}
                  <Button variant="secondary" size="sm" onClick={() => setShowAll(true)}>
                    {'Hamısını göstər (' + nf(rows.length) + ')'}
                  </Button>
                </>
              )}
            </span>
          )}
          {/* M6-S3 — a failed REFRESH after a good snapshot: the retained rows
              stay on screen and the error is reported here. Guarded on
              `loaded` so an initial failure, already shown in the table area
              above, is not repeated. */}
          {error && loaded && (
            <span className="hint" style={{ color: 'var(--alarm)' }}>{error}</span>
          )}
        </div>
      </div>
    </>
  )
}
