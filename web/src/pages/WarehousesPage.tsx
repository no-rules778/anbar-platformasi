import type { Me } from '../lib/roles'

interface Props {
  me: Me
}

export function WarehousesPage({ me }: Props) {
  return <div className="p-8">Logged in as {me.name} — Warehouses UI comes in Task 8.</div>
}
