import { useEffect, useMemo, useRef, useState } from 'react'
import type { Me } from '../lib/roles'
import { cancelItemRequest } from '../api/itemRequests.api'
import { useItemRequestsStore } from '../store/itemRequests.store'
import { useRealtimeRefresh } from '../hooks/useRealtimeRefresh'
import { useToastStore } from '../store/toast.store'
import {
  canReview, canWithdraw, emptyText, filterRequests, nreqCanCreate, requestDateLabel,
  requestsSubtitle, statusTag, type ItemRequestView,
} from '../lib/nomenclatureRequests'
import { isAnbardar } from '../lib/roles'
import { DEFAULT_UNITS, ITEM_CATEGORIES } from '../lib/referenceFallbacks'
import { nf } from '../lib/format'
import { Button } from '../components/ui/Button'
import { RequestCreateDialog } from '../components/item-requests/RequestCreateDialog'
import { RequestReviewDialog } from '../components/item-requests/RequestReviewDialog'

/* «Nomenklatura sorğuları» — the legacy `p-nreq` shell (index.html:346-350)
   and rNreq() (2485-2551).

   Read-only on its own: every write leaves through an RPC wrapper, and the
   server re-checks each rule (sql/017). The action buttons here are
   AFFORDANCES — a hidden button is never a permission (M12-07 vs M12-91,
   M12-40/41 vs M12-91).

   D-M4 (owner-approved IMPROVEMENT, not parity): legacy's realtime list
   (1174) does NOT include `item_requests`, so a new request did not appear
   until a manual reload. Here both tables are watched. */

/** M12-16 — the D-M4 improvement's table set. */
const WATCHED = ['item_requests', 'items'] as const

/** index.html:2489-2494 — the four segments, in fixed order (M12-20). */
export const SEGMENTS: { value: string; label: string }[] = [
  { value: 'pending', label: 'Gözləyən' },
  { value: 'approved', label: 'Təsdiqlənən' },
  { value: 'rejected', label: 'Rədd edilən' },
  /* M12-21 — deliberately NO «Ləğv edilən» segment: a cancelled request is
     reachable only through «Hamısı». */
  { value: '', label: 'Hamısı' },
]

/** `tbl()` with no rows — index.html:1411 (M12-38). */
function EmptyRows({ status }: { status: string }) {
  return <div className="empty"><b>Məlumat yoxdur</b>{emptyText(status)}</div>
}

interface Props {
  me: Me
}

export function ItemRequestsPage({ me }: Props) {
  const {
    requests, items, referenceValues, refsReady,
    filters, loading, loaded, error, load, setFilters,
  } = useItemRequestsStore()
  const show = useToastStore((s) => s.show)
  const [createOpen, setCreateOpen] = useState(false)
  const [reviewing, setReviewing] = useState<ItemRequestView | null>(null)

  useEffect(() => { void load() }, [load])
  useRealtimeRefresh(true, WATCHED, () => { void load() })

  /* M12-24 — the search box is debounced 200 ms and its value is trimmed and
     lower-cased BEFORE matching (index.html:2495). */
  const [query, setQuery] = useState(filters.q)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  useEffect(() => {
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setFilters({ q: query.trim().toLowerCase() }), 200)
    return () => clearTimeout(timer.current)
  }, [query, setFilters])

  const rows = useMemo(() => filterRequests(requests, filters), [requests, filters])

  /* M12-52 — the SHARED active reference options, with the accepted A14
     readiness rule (lib/referenceFallbacks.ts, and the same split
     fetchItemGroupsSnapshot() uses):

       * directory NOT ready (the load failed, or the SQL is unapplied)
         → the built-in list, so the dialog is still usable;
       * directory READY but the active list is empty
         → STAYS EMPTY. An Admin who hid every unit meant it, and restoring
           the defaults would undo an intentional configuration.

     Deriving this from `rows.length` alone would conflate the two and silently
     resurrect hidden values. */
  const units = useMemo(
    () => (refsReady
      ? referenceValues.unit.filter((r) => r.active).map((r) => r.name)
      : DEFAULT_UNITS.slice()),
    [refsReady, referenceValues.unit],
  )
  const categories = useMemo(
    () => (refsReady
      ? referenceValues.category.filter((r) => r.active).map((r) => r.name)
      : ITEM_CATEGORIES.slice()),
    [refsReady, referenceValues.category],
  )

  /* M12-82 — `nreqCancel()` returns silently BEFORE any RPC for a missing or
     non-pending row. That early return is a UI affordance and does NOT satisfy
     the server refusals in M12-92: invoked directly, the RPC raises for those
     states (sql/017:447-450, 468-470). */
  async function withdraw(row: ItemRequestView) {
    if (row.status !== 'pending') return
    const r = await cancelItemRequest(row.id)
    if (!r.ok) {
      show('Ləğv edilmədi: ' + (r.error || 'server xətası'), true)
      return
    }
    await load()
    show('Sorğu geri götürüldü')
  }

  return <>
    <div className="phead">
      <div>
        <h2>Nomenklatura sorğuları</h2>
        <p data-testid="nreq-sub">{requestsSubtitle(me)}</p>
      </div>
      <div className="sp" />
      {/* M12-07 — anbardar only; an affordance, never the authority. */}
      {nreqCanCreate(me) && (
        <Button data-testid="nreq-new" onClick={() => setCreateOpen(true)}>Yeni nomenklatura sorğusu</Button>
      )}
    </div>

    <div className="filters">
      <input
        type="search" placeholder="Ad üzrə axtarış…" data-testid="nrq-q"
        value={query} onChange={(e) => setQuery(e.target.value)}
      />
      <div className="seg" data-testid="nrq-s">
        {SEGMENTS.map((s) => (
          <button
            key={s.value || 'all'}
            className={filters.status === s.value ? 'on' : undefined}
            onClick={() => setFilters({ status: s.value })}
          >
            {s.label}
          </button>
        ))}
      </div>
    </div>

    {loading && !loaded && (
      <div className="empty" data-testid="nreq-loading"><b>Yüklənir…</b>Sorğular Supabase-dən oxunur.</div>
    )}
    {/* M12-13/M12-14 — an INITIAL failure shows the load error and no table; a
        failed REFRESH keeps the previous complete snapshot and only flags it.
        A failed read is never applied as a successful empty list (M12-11). */}
    {error && !loaded && (
      <div className="empty" data-testid="nreq-load-error"><b>Yükləmə xətası</b>{error}</div>
    )}
    {error && loaded && (
      <div className="hint" data-testid="nreq-refresh-error">
        <span className="tag t-rm">Yenilənmədi</span> {error}
      </div>
    )}

    {loaded && (
      <div className="card">
        <div className="tw" data-testid="t-nreq">
          {rows.length === 0 ? <EmptyRows status={filters.status} /> : (
            <table>
              <thead>
                <tr>
                  {/* M12-30 — exactly these eight columns, none right-aligned. */}
                  <th>Tarix</th><th>Malın adı</th><th>Ölçü</th><th>Kateqoriya</th>
                  <th>Anbar</th><th>Status</th><th>Kod</th><th />
                </tr>
              </thead>
              <tbody>
                {/* Rows are NOT clickable — legacy calls tbl() without `clk`. */}
                {rows.map((r) => {
                  const tag = statusTag(r.status)
                  return (
                    <tr key={r.id}>
                      <td>{requestDateLabel(r.ts)}</td>
                      <td className="nm">
                        <div className="nm">{r.name}</div>
                        {r.note && <span className="hint">{r.note}</span>}
                        {/* M12-32/M12-33 — the reason shows ONLY on a REJECTED
                            row; a cancelled row carrying one does not show it. */}
                        {r.status === 'rejected' && r.reason && (
                          <div className="hint" style={{ color: 'var(--alarm)' }}>Səbəb: {r.reason}</div>
                        )}
                      </td>
                      <td>{r.unit || '—'}</td>
                      <td>{r.category || '—'}</td>
                      {/* M12-35 — RAW warehouse; whLabel() is NOT applied. */}
                      <td>{r.w || '—'}</td>
                      <td>{tag.cls ? <span className={tag.cls}>{tag.text}</span> : tag.text}</td>
                      <td>{r.code ? <span className="code">{r.code}</span> : <span className="muted">—</span>}</td>
                      <td>
                        {canReview(me, r) && (
                          <Button size="sm" data-testid={'nrq-rev-' + r.id} onClick={() => setReviewing(r)}>
                            Nəzərdən keçir
                          </Button>
                        )}
                        {canWithdraw(me, r) && (
                          <Button
                            size="sm" variant="secondary" data-testid={'nrq-cx-' + r.id}
                            onClick={() => void withdraw(r)}
                          >
                            Geri götür
                          </Button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
        {/* M12-39 — the FILTERED count, with the anbardar-only suffix. */}
        <div className="pad" style={{ borderTop: '1px solid var(--line-2)' }}>
          <span className="hint" data-testid="nreq-note">
            {nf(rows.length) + ' sorğu' + (isAnbardar(me) ? ' · yalnız sizin yaratdığınız sorğular göstərilir' : '')}
          </span>
        </div>
      </div>
    )}

    {createOpen && (
      <RequestCreateDialog
        items={items} requests={requests} units={units} categories={categories}
        onCreated={() => { setCreateOpen(false); void load() }}
        onClose={() => setCreateOpen(false)}
      />
    )}
    {reviewing && (
      <RequestReviewDialog
        request={reviewing} items={items} requests={requests} units={units} categories={categories}
        onDecided={() => { setReviewing(null); void load() }}
        onClose={() => setReviewing(null)}
      />
    )}
  </>
}
