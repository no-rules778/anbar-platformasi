import { useEffect, useMemo, useState } from 'react'
import type { Me } from '../lib/roles'
import { isAdmin } from '../lib/roles'
import { useReferenceDirectoryStore, usageOfEntity } from '../store/referenceDirectory.store'
import { WIRED_KINDS, kindLabel, isKindReady, type ReferenceEntity, type WiredKind } from '../types/referenceDirectory'
import type { ReferenceUsage } from '../api/referenceUsage.api'
import { Table, Thead, Th, Td } from '../components/ui/Table'
import { Button } from '../components/ui/Button'
import { ReferenceDirectoryFormDialog } from '../components/reference-directory/ReferenceDirectoryFormDialog'
import { useRealtimeRefresh } from '../hooks/useRealtimeRefresh'
import { useToastStore } from '../store/toast.store'
import { isLocalhost, localWritesAllowed, localWriteStatusText, LOCALHOST_WARNING } from '../lib/mutationGuard'

interface Props {
  me: Me
}

const PAGE_SIZES = [10, 25, 50, 100]

/* Tables this screen reads: the entity tables plus the ones the usage counters
   use. Phase 3a added `reference_values` and `items`; Phase 3b adds
   `serfiyyat_projects` (project rows) and `serfiyyat_documents` (their usage
   source). `serfiyyat_lines` is read for the readiness probe but holds no row
   or count this screen shows, so a write there changes nothing here — it is
   deliberately not watched. Registry M3-15. */
const WATCHED_TABLES = [
  'warehouses', 'partners', 'movements', 'users',
  'reference_values', 'items',
  'serfiyyat_projects', 'serfiyyat_documents',
] as const

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
  const { rows, usage, readiness, activeWarehouseNames, loading, error, load, controls, setControls } =
    useReferenceDirectoryStore()
  /* The dialog and the create-row inputs stay component-local: the original
     does not preserve an open modal or a half-typed new name across
     navigation either. Only the list controls persist (M4-18). */
  const [editing, setEditing] = useState<Editing | null>(null)
  const [newKind, setNewKind] = useState<WiredKind>('warehouse')
  const [newName, setNewName] = useState('')
  const { kindFilter, status, query, pageSize, page } = controls
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

  /* refServerReady per kind (index.html:2949-2953). A kind whose probe fails is
     named in the banner (3010), greyed out in the create selector (3024) and
     contributes no rows (2993) — the store already omits them. */
  const notReady = useMemo(
    () => WIRED_KINDS.filter((k) => !isKindReady(k.kind, readiness)).map((k) => k.label),
    [readiness],
  )

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

  /* `setControls` already returns to page 0 for any change that is not the
     page itself, so a separate reset wrapper is no longer needed. */

  /* refOpen's readiness refusal (index.html:3079). The option is already
     disabled, but a kind can also become unavailable while the screen is open,
     so the check is repeated at the point of action. */
  function openEditor(next: Editing) {
    if (!isKindReady(next.kind, readiness)) {
      show('Əvvəlcə SQL 011/012 tətbiq edilməlidir', true)
      return
    }
    setEditing(next)
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
          <p>Anbarlar, kontragentlər və digər soraqçalar — ad, istifadə sayı və status.</p>
        </div>
        <div className="sp" />
      </div>

      {isLocalhost() && (
        <div className="card" style={{ marginBottom: 12, borderColor: 'var(--alarm)' }}>
          <div className="pad">
            <p className="err" style={{ marginTop: 0 }}>{LOCALHOST_WARNING}</p>
            <p className="hint" style={{ marginTop: 4 }}>{localWriteStatusText(localWritesAllowed())}</p>
          </div>
        </div>
      )}

      {notReady.length > 0 && (
        <div
          className="hint"
          style={{ padding: 10, background: 'var(--out-l)', borderRadius: 4, marginBottom: 12 }}
        >
          Bu soraqçalar SQL <b>011</b>/<b>012</b> tətbiq ediləndən sonra aktivləşir: {notReady.join(', ')}.
        </div>
      )}

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
                {WIRED_KINDS.map((k) => (
                  <option key={k.kind} value={k.kind} disabled={!isKindReady(k.kind, readiness)}>
                    {k.label}
                  </option>
                ))}
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
                onKeyDown={(e) => { if (e.key === 'Enter') openEditor({ entity: null, kind: newKind, presetName: newName.trim() }) }}
              />
            </label>
            <Button onClick={() => openEditor({ entity: null, kind: newKind, presetName: newName.trim() })}>
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
            onChange={(e) => setControls({ kindFilter: e.target.value as '' | WiredKind })}
          >
            <option value="">Bütün növlər</option>
            {WIRED_KINDS.map((k) => <option key={k.kind} value={k.kind}>{k.label}</option>)}
          </select>
          <select
            aria-label="Status"
            style={{ width: 'auto' }}
            value={status}
            onChange={(e) => setControls({ status: e.target.value as '' | 'active' | 'off' })}
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
            onChange={(e) => setControls({ query: e.target.value })}
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
                    <Td className="num">{usageLabel(usageOfEntity(usage, r))}</Td>
                    <Td>
                      {r.active
                        ? <span className="tag t-in">Aktiv</span>
                        : <span className="tag t-mut">Gizli</span>}
                    </Td>
                    <Td>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => openEditor({ entity: r, kind: r.kind })}
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
                onChange={(e) => setControls({ pageSize: Number(e.target.value) })}
              >
                {PAGE_SIZES.map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
              <span className="hint">
                {filtered.length ? `${from + 1}–${to}` : '0'}, cəmi {filtered.length}
              </span>
              <Button variant="secondary" size="sm" disabled={safePage === 0} onClick={() => setControls({ page: safePage - 1 })}>&lsaquo;</Button>
              <span className="hint">Səhifə {safePage + 1} / {pages}</span>
              <Button variant="secondary" size="sm" disabled={safePage >= pages - 1} onClick={() => setControls({ page: safePage + 1 })}>&rsaquo;</Button>
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
          warehouseNames={activeWarehouseNames}
          usage={editing.entity ? usageOfEntity(usage, editing.entity) : { count: 0, exact: true }}
          onClose={() => setEditing(null)}
          onDone={() => { setEditing(null); setNewName(''); load() }}
        />
      )}
    </>
  )
}
