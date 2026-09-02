import { useEffect, useMemo, useState } from 'react'
import type { Me } from '../lib/roles'
import { isAdmin } from '../lib/roles'
import { useWarehousesStore } from '../store/warehouses.store'
import type { WarehouseRow, WarehouseUsage } from '../api/warehouses.api'
import { Table, Thead, Th, Td } from '../components/ui/Table'
import { Button } from '../components/ui/Button'
import { WarehouseFormDialog } from '../components/warehouses/WarehouseFormDialog'
import { useRealtimeRefresh } from '../hooks/useRealtimeRefresh'
import { useToastStore } from '../store/toast.store'

interface Props {
  me: Me
}

/** Cautious default when a warehouse has no usage entry at all: treat as in use. */
const UNKNOWN_USAGE: WarehouseUsage = { count: 1, exact: false }

const PAGE_SIZES = [10, 25, 50, 100]

/** Tables this screen's data comes from: the list itself, plus the two the usage counters read. */
const WATCHED_TABLES = ['warehouses', 'movements', 'users'] as const

function usageLabel(usage: WarehouseUsage | undefined): string {
  if (!usage) return '?'
  return usage.exact ? String(usage.count) : '?'
}

export function WarehousesPage({ me }: Props) {
  const { rows, usage, loading, error, load } = useWarehousesStore()
  const [editing, setEditing] = useState<WarehouseRow | null | 'new'>(null)
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<'' | 'active' | 'off'>('')
  const [pageSize, setPageSize] = useState(PAGE_SIZES[0])
  const [page, setPage] = useState(0)
  const admin = isAdmin(me)
  const show = useToastStore((s) => s.show)

  /* Soraqçalar is an Admin-only screen in the production platform: the nav
     entry is hidden (index.html:7505), go('refs') refuses non-Admin
     (index.html:1496) and rRefs() bounces them back to the dashboard
     (index.html:3009). Non-Admin therefore never loads this data at all —
     not even the usage counters. */
  useEffect(() => {
    if (admin) load()
  }, [admin, load])

  /* Another Admin's change must appear here on its own — the original
     subscribes and announces it (index.html:1163-1181). */
  useRealtimeRefresh(admin, WATCHED_TABLES, () => {
    void load().then(({ ok, error: loadError }) => {
      if (ok) show('Məlumatlar yeniləndi (digər istifadəçi)')
      else show('Məlumatlar yenilənmədi: ' + (loadError ?? 'server xətası'), true)
    })
  })

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return rows
      .filter((r) => r.type === 'anbar')
      .filter((r) => (status === '' ? true : status === 'active' ? r.active !== false : r.active === false))
      .filter((r) => (q === '' ? true : r.name.toLowerCase().includes(q)))
  }, [rows, status, query])

  const pages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const safePage = Math.min(page, pages - 1)
  const from = filtered.length ? safePage * pageSize : -1
  const pageRows = filtered.slice(safePage * pageSize, safePage * pageSize + pageSize)
  const to = from < 0 ? 0 : from + pageRows.length

  function resetPage<T>(setter: (value: T) => void) {
    return (value: T) => { setter(value); setPage(0) }
  }

  if (!admin) {
    return (
      <>
        <div className="phead"><div><h2>Anbarlar</h2></div></div>
        <div className="card"><div className="pad"><p className="err">Soraqçalar yalnız Admin üçündür.</p></div></div>
      </>
    )
  }

  return (
    <>
      <div className="phead">
        <div>
          <h2>Anbarlar</h2>
          <p>Soraqçalar — anbar siyahısı, istifadə sayı və status.</p>
        </div>
        <div className="sp" />
        <Button onClick={() => setEditing('new')}>Əlavə et +</Button>
      </div>

      <div className="filters">
        <select
          aria-label="Status"
          value={status}
          onChange={(e) => resetPage(setStatus)(e.target.value as '' | 'active' | 'off')}
        >
          <option value="">Bütün statuslar</option>
          <option value="active">Aktiv</option>
          <option value="off">Gizli</option>
        </select>
        <input
          type="search"
          aria-label="Ada görə axtarış"
          placeholder="Ada görə axtarış"
          value={query}
          onChange={(e) => resetPage(setQuery)(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="card"><div className="pad hint">Yüklənir...</div></div>
      ) : error ? (
        <div className="card"><div className="pad"><p className="err">Anbarlar yüklənmədi: {error}</p></div></div>
      ) : (
        <div className="card">
          <header><h3>Anbarlar</h3><div className="sp" /></header>
          <Table>
            <Thead>
              <tr>
                <Th right>No</Th>
                <Th>Anbarın adı</Th>
                <Th right>İstifadə</Th>
                <Th>Status</Th>
                <Th>Əməliyyatlar</Th>
              </tr>
            </Thead>
            <tbody>
              {pageRows.map((r, i) => (
                <tr key={r.id}>
                  <Td className="num">{from + i + 1}</Td>
                  <Td><b>{r.name}</b></Td>
                  <Td className="num">{usageLabel(usage.get(r.name))}</Td>
                  <Td>
                    {r.active !== false
                      ? <span className="tag t-in">Aktiv</span>
                      : <span className="tag t-mut">Gizli</span>}
                  </Td>
                  <Td>
                    <Button variant="secondary" size="sm" onClick={() => setEditing(r)}>Redaktə et</Button>
                  </Td>
                </tr>
              ))}
              {pageRows.length === 0 && (
                <tr><Td className="empty">Bu filtrlərə uyğun anbar tapılmadı.</Td></tr>
              )}
            </tbody>
          </Table>
          <div className="pad" style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            <span className="hint">Hər səhifədə</span>
            <select
              aria-label="Hər səhifədə"
              style={{ width: 'auto' }}
              value={pageSize}
              onChange={(e) => resetPage(setPageSize)(Number(e.target.value))}
            >
              {PAGE_SIZES.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
            <span className="hint">
              {filtered.length ? `${from + 1}–${to}` : '0'}, cəmi {filtered.length}
            </span>
            <Button variant="secondary" size="sm" disabled={safePage === 0} onClick={() => setPage(safePage - 1)}>&lsaquo;</Button>
            <span className="hint">Səhifə {safePage + 1} / {pages}</span>
            <Button variant="secondary" size="sm" disabled={safePage >= pages - 1} onClick={() => setPage(safePage + 1)}>&rsaquo;</Button>
          </div>
        </div>
      )}

      {editing && (
        <WarehouseFormDialog
          warehouse={editing === 'new' ? null : editing}
          usage={editing === 'new' ? { count: 0, exact: true } : usage.get(editing.name) ?? UNKNOWN_USAGE}
          onClose={() => setEditing(null)}
          onDone={() => { setEditing(null); load() }}
        />
      )}
    </>
  )
}
