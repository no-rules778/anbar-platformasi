import { useEffect, useState } from 'react'
import type { Me } from '../lib/roles'
import { isAdmin } from '../lib/roles'
import { useWarehousesStore } from '../store/warehouses.store'
import type { WarehouseRow, WarehouseUsage } from '../api/warehouses.api'
import { Table, Thead, Th, Td } from '../components/ui/Table'
import { Button } from '../components/ui/Button'
import { WarehouseFormDialog } from '../components/warehouses/WarehouseFormDialog'

interface Props {
  me: Me
}

/** Cautious default when a warehouse has no usage entry at all: treat as in use. */
const UNKNOWN_USAGE: WarehouseUsage = { count: 1, exact: false }

function usageLabel(usage: WarehouseUsage | undefined): string {
  if (!usage) return '?'
  return usage.exact ? String(usage.count) : '?'
}

export function WarehousesPage({ me }: Props) {
  const { rows, usage, loading, error, load } = useWarehousesStore()
  const [editing, setEditing] = useState<WarehouseRow | null | 'new'>(null)
  const admin = isAdmin(me)

  /* Soraqçalar is an Admin-only screen in the production platform: the nav
     entry is hidden (index.html:7505), go('refs') refuses non-Admin
     (index.html:1496) and rRefs() bounces them back to the dashboard
     (index.html:3009). Non-Admin therefore never loads this data at all —
     not even the usage counters. */
  useEffect(() => {
    if (admin) load()
  }, [admin, load])

  if (!admin) {
    return (
      <div className="p-8">
        <h1 className="mb-2 text-xl font-semibold">Anbarlar</h1>
        <p className="text-sm text-red-600">Soraqçalar yalnız Admin üçündür.</p>
      </div>
    )
  }

  const warehouseRows = rows.filter((r) => r.type === 'anbar')

  return (
    <div className="p-8">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Anbarlar</h1>
        <Button onClick={() => setEditing('new')}>Əlavə et +</Button>
      </div>
      {loading ? (
        <p className="text-slate-500">Yüklənir...</p>
      ) : error ? (
        <p className="text-red-600">Anbarlar yüklənmədi: {error}</p>
      ) : (
        <Table>
          <Thead>
            <tr>
              <Th>Ad</Th>
              <Th>İstifadə</Th>
              <Th>Status</Th>
              <Th>Əməliyyatlar</Th>
            </tr>
          </Thead>
          <tbody>
            {warehouseRows.map((r) => (
              <tr key={r.id}>
                <Td><b>{r.name}</b></Td>
                <Td>{usageLabel(usage.get(r.name))}</Td>
                <Td>{r.active !== false ? <span className="text-emerald-600">Aktiv</span> : <span className="text-slate-400">Gizli</span>}</Td>
                <Td>
                  <Button variant="secondary" onClick={() => setEditing(r)}>Redaktə et</Button>
                </Td>
              </tr>
            ))}
            {warehouseRows.length === 0 && (
              <tr><Td className="text-center text-slate-400">Anbar tapılmadı</Td></tr>
            )}
          </tbody>
        </Table>
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
