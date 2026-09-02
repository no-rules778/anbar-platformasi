import { useEffect, useMemo, useState } from 'react'
import type { Me } from '../lib/roles'
import { isAdmin } from '../lib/roles'
import { useReferenceDirectoryStore, usageOf } from '../store/referenceDirectory.store'
import { WIRED_KINDS, kindLabel, type ReferenceEntity, type WiredKind } from '../types/referenceDirectory'
import type { ReferenceUsage } from '../api/referenceUsage.api'
import { Table, Thead, Th, Td } from '../components/ui/Table'
import { Button } from '../components/ui/Button'
import { ReferenceDirectoryFormDialog } from '../components/reference-directory/ReferenceDirectoryFormDialog'
import { useRealtimeRefresh } from '../hooks/useRealtimeRefresh'
import { useToastStore } from '../store/toast.store'

interface Props {
  me: Me
}

const PAGE_SIZES = [10, 25, 50, 100]

/** Tables this screen reads: the two entity tables plus the two the usage counters use. */
const WATCHED_TABLES = ['warehouses', 'partners', 'movements', 'users'] as const

function usageLabel(usage: ReferenceUsage): string {
  return usage.exact ? String(usage.count) : '?'
}

type Editing = { entity: ReferenceEntity | null; kind: WiredKind; presetName?: string }

/* The unified «Soraqçalar» screen, ported from rRefs() (index.html:3008-3074):
   one table for every reference kind, a kind filter, a status filter, a name
   search, paging, and one create row at the top. Admin-only, exactly as the
   original hides the nav entry (7505), refuses in go() (1496) and bounces in
   rRefs() itself (3009). */
export function ReferenceDirectoryPage({ me }: Props) {
  const { rows, usage, loading, error, load } = useReferenceDirectoryStore()
  const [editing, setEditing] = useState<Editing | null>(null)
  const [newKind, setNewKind] = useState<WiredKind>('warehouse')
  const [newName, setNewName] = useState('')
  const [kindFilter, setKindFilter] = useState<'' | WiredKind>('')
  const [status, setStatus] = useState<'' | 'active' | 'off'>('')
  const [query, setQuery] = useState('')
  const [pageSize, setPageSize] = useState(PAGE_SIZES[0])
  const [page, setPage] = useState(0)
  const admin = isAdmin(me)
  const show = useToastStore((s) => s.show)

  useEffect(() => {
    if (admin) load()
  }, [admin, load])

  useRealtimeRefresh(admin, WATCHED_TABLES, () => {
    void load().then(({ ok, error: loadError }) => {
      if (ok) show('Məlumatlar yeniləndi (digər istifadəçi)')
      else show('Məlumatlar yenilənmədi: ' + (loadError ?? 'server xətası'), true)
    })
  })

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return rows
      .filter((r) => (kindFilter === '' ? true : r.kind === kindFilter))
      .filter((r) => (status === '' ? true : status === 'active' ? r.active : !r.active))
      .filter((r) => (q === '' ? true : r.name.toLowerCase().includes(q)))
  }, [rows, kindFilter, status, query])

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
        <div className="phead"><div><h2>Soraqçalar</h2></div></div>
        <div className="card"><div className="pad"><p className="err">Soraqçalar yalnız Admin üçündür.</p></div></div>
      </>
    )
  }

  return (
    <>
      <div className="phead">
        <div>
          <h2>Soraqçalar</h2>
          <p>Anbarlar və kontragentlər — ad, istifadə sayı və status.</p>
        </div>
        <div className="sp" />
      </div>

      <div className="card">
        <div className="pad">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr auto', alignItems: 'end', gap: 10 }}>
            <label className="f">
              <span>Soraqça növünü seçin</span>
              <select
                aria-label="Soraqça növünü seçin"
                value={newKind}
                onChange={(e) => setNewKind(e.target.value as WiredKind)}
              >
                {WIRED_KINDS.map((k) => <option key={k.kind} value={k.kind}>{k.label}</option>)}
              </select>
            </label>
            <label className="f">
              <span>Soraqça adı</span>
              <input
                type="text"
                aria-label="Soraqça adı"
                autoComplete="off"
                placeholder="Ad yazın"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') setEditing({ entity: null, kind: newKind, presetName: newName.trim() }) }}
              />
            </label>
            <Button onClick={() => setEditing({ entity: null, kind: newKind, presetName: newName.trim() })}>
              Əlavə et +
            </Button>
          </div>
          <p className="hint" style={{ marginTop: 8 }}>
            Eyni dəyər bütün bölmələrdə bu siyahıdan oxunur. İstifadə olunmuş dəyər silinmir — gizlədilir;
            tarixçə dəyişməz qalır.
          </p>
        </div>
      </div>

      <div className="card" style={{ marginTop: 12 }}>
        <header>
          <h3>Soraqçalar</h3>
          <div className="sp" />
          <select
            aria-label="Soraqça növü"
            style={{ width: 'auto' }}
            value={kindFilter}
            onChange={(e) => resetPage(setKindFilter)(e.target.value as '' | WiredKind)}
          >
            <option value="">Bütün növlər</option>
            {WIRED_KINDS.map((k) => <option key={k.kind} value={k.kind}>{k.label}</option>)}
          </select>
          <select
            aria-label="Status"
            style={{ width: 'auto' }}
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
            style={{ width: 'auto', minWidth: 170 }}
            value={query}
            onChange={(e) => resetPage(setQuery)(e.target.value)}
          />
        </header>

        {loading ? (
          <div className="pad hint">Yüklənir...</div>
        ) : error ? (
          <div className="pad"><p className="err">Soraqçalar yüklənmədi: {error}</p></div>
        ) : (
          <>
            <Table>
              <Thead>
                <tr>
                  <Th right>No</Th>
                  <Th>Soraqça növü</Th>
                  <Th>Soraqça adı</Th>
                  <Th right>İstifadə</Th>
                  <Th>Status</Th>
                  <Th>Əməliyyatlar</Th>
                </tr>
              </Thead>
              <tbody>
                {pageRows.map((r, i) => (
                  <tr key={`${r.kind}|${r.id}`}>
                    <Td className="num">{from + i + 1}</Td>
                    <Td>{kindLabel(r.kind)}</Td>
                    <Td><b>{r.name}</b></Td>
                    <Td className="num">{usageLabel(usageOf(usage, r.kind, r.name))}</Td>
                    <Td>
                      {r.active
                        ? <span className="tag t-in">Aktiv</span>
                        : <span className="tag t-mut">Gizli</span>}
                    </Td>
                    <Td>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setEditing({ entity: r, kind: r.kind })}
                      >
                        Redaktə et
                      </Button>
                    </Td>
                  </tr>
                ))}
                {pageRows.length === 0 && (
                  <tr><Td className="empty">Bu filtrlərə uyğun soraqça tapılmadı.</Td></tr>
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
          </>
        )}
      </div>

      <div className="card" style={{ marginTop: 12 }}>
        <div className="pad hint">
          <b>Sistem siyahıları</b>: <span className="code">Bütün anbarlar</span>,
          {' '}<span className="code">Təyin edilməyib</span>, istifadəçi rolları və əməliyyat növləri uçot
          məntiqinə bağlıdır; bu bölmədən silinmir və dəyişdirilmir.
        </div>
      </div>

      {editing && (
        <ReferenceDirectoryFormDialog
          entity={editing.entity}
          kind={editing.kind}
          presetName={editing.presetName}
          usage={editing.entity ? usageOf(usage, editing.entity.kind, editing.entity.name) : { count: 0, exact: true }}
          onClose={() => setEditing(null)}
          onDone={() => { setEditing(null); setNewName(''); load() }}
        />
      )}
    </>
  )
}
