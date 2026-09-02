import { useEffect, useMemo, useState } from 'react'
import type { Me } from '../lib/roles'
import { isAdmin } from '../lib/roles'
import { useWarehousesStore } from '../store/warehouses.store'
import type { WarehouseRow, WarehouseUsage } from '../api/warehouses.api'
import { Table, Thead, Th, Td } from '../components/ui/Table'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
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
    load()
    show('Məlumatlar yeniləndi (digər istifadəçi)')
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
      <div className="p-8">
        <h1 className="mb-2 text-xl font-semibold">Anbarlar</h1>
        <p className="text-sm text-red-600">Soraqçalar yalnız Admin üçündür.</p>
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Anbarlar</h1>
        <Button onClick={() => setEditing('new')}>Əlavə et +</Button>
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <label className="text-sm">
          <span className="sr-only">Status</span>
          <select
            aria-label="Status"
            className="rounded-md border border-slate-300 px-2 py-2 text-sm"
            value={status}
            onChange={(e) => resetPage(setStatus)(e.target.value as '' | 'active' | 'off')}
          >
            <option value="">Bütün statuslar</option>
            <option value="active">Aktiv</option>
            <option value="off">Gizli</option>
          </select>
        </label>
        <Input
          aria-label="Ada görə axtarış"
          placeholder="Ada görə axtarış"
          className="max-w-xs"
          value={query}
          onChange={(e) => resetPage(setQuery)(e.target.value)}
        />
      </div>

      {loading ? (
        <p className="text-slate-500">Yüklənir...</p>
      ) : error ? (
        <p className="text-red-600">Anbarlar yüklənmədi: {error}</p>
      ) : (
        <>
          <Table>
            <Thead>
              <tr>
                <Th>No</Th>
                <Th>Ad</Th>
                <Th>İstifadə</Th>
                <Th>Status</Th>
                <Th>Əməliyyatlar</Th>
              </tr>
            </Thead>
            <tbody>
              {pageRows.map((r, i) => (
                <tr key={r.id}>
                  <Td>{from + i + 1}</Td>
                  <Td><b>{r.name}</b></Td>
                  <Td>{usageLabel(usage.get(r.name))}</Td>
                  <Td>{r.active !== false ? <span className="text-emerald-600">Aktiv</span> : <span className="text-slate-400">Gizli</span>}</Td>
                  <Td>
                    <Button variant="secondary" onClick={() => setEditing(r)}>Redaktə et</Button>
                  </Td>
                </tr>
              ))}
              {pageRows.length === 0 && (
                <tr><Td className="text-center text-slate-400">Bu filtrlərə uyğun anbar tapılmadı.</Td></tr>
              )}
            </tbody>
          </Table>

          <div className="mt-3 flex flex-wrap items-center justify-end gap-3 text-sm">
            <span className="text-slate-500">Hər səhifədə</span>
            <select
              aria-label="Hər səhifədə"
              className="rounded-md border border-slate-300 px-2 py-1"
              value={pageSize}
              onChange={(e) => resetPage(setPageSize)(Number(e.target.value))}
            >
              {PAGE_SIZES.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
            <span className="text-slate-500">
              {filtered.length ? `${from + 1}–${to}` : '0'}, cəmi {filtered.length}
            </span>
            <Button variant="secondary" disabled={safePage === 0} onClick={() => setPage(safePage - 1)}>‹</Button>
            <span className="text-slate-500">Səhifə {safePage + 1} / {pages}</span>
            <Button variant="secondary" disabled={safePage >= pages - 1} onClick={() => setPage(safePage + 1)}>›</Button>
          </div>
        </>
      )}

      {editing && (
        <WarehouseFormDialog
          warehouse={editing === 'new' ? null : editing}
          usage={editing === 'new' ? { count: 0, exact: true } : usage.get(editing.name) ?? UNKNOWN_USAGE}
          onClose={() => setEditing(null)}
          onDone={() => { setEditing(null); load() }}
        />
      )}
    </div>
  )
}
