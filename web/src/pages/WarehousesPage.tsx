import { useEffect, useState } from 'react'
import type { Me } from '../lib/roles'
import { isAdmin } from '../lib/roles'
import { useWarehousesStore } from '../store/warehouses.store'
import type { WarehouseRow } from '../api/warehouses.api'
import { Table, Thead, Th, Td } from '../components/ui/Table'
import { Button } from '../components/ui/Button'
import { WarehouseFormDialog } from '../components/warehouses/WarehouseFormDialog'
import { useToastStore } from '../store/toast.store'

interface Props {
  me: Me
}

export function WarehousesPage({ me }: Props) {
  const { rows, usage, loading, error, load } = useWarehousesStore()
  const [editing, setEditing] = useState<WarehouseRow | null | 'new'>(null)
  const show = useToastStore((s) => s.show)

  useEffect(() => { load() }, [load])

  const warehouseRows = rows.filter((r) => r.type === 'anbar')

  function openEdit(row: WarehouseRow) {
    if (!isAdmin(me)) { show('Soraqçalar yalnız Admin üçündür', true); return }
    setEditing(row)
  }

  function openCreate() {
    if (!isAdmin(me)) { show('Soraqçalar yalnız Admin üçündür', true); return }
    setEditing('new')
  }

  return (
    <div className="p-8">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Anbarlar</h1>
        {isAdmin(me) && <Button onClick={openCreate}>Əlavə et +</Button>}
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
                <Td>{usage.get(r.name) ?? 0}</Td>
                <Td>{r.active !== false ? <span className="text-emerald-600">Aktiv</span> : <span className="text-slate-400">Gizli</span>}</Td>
                <Td>
                  {isAdmin(me) && (
                    <Button variant="secondary" onClick={() => openEdit(r)}>Redaktə et</Button>
                  )}
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
          usedCount={editing === 'new' ? 0 : usage.get(editing.name) ?? 0}
          onClose={() => setEditing(null)}
          onDone={() => { setEditing(null); load() }}
        />
      )}
    </div>
  )
}
