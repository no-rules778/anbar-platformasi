import { useEffect, useMemo, useState } from 'react'
import type { Me } from '../lib/roles'
import { isAdmin, ROLES } from '../lib/roles'
import { PERMISSION_COLUMNS, PERMISSION_ROWS, hasPermission } from '../lib/permissionMatrix'
import { sourceCounts, partnerExportMatrix } from '../lib/settings'
import { useAnalysisStore } from '../store/analysis.store'
import { useRealtimeRefresh } from '../hooks/useRealtimeRefresh'
import { fetchSettingsUsers, type SettingsUserRow } from '../api/settingsUsers.api'
import { xls } from '../lib/xls'
import { nf } from '../lib/format'
import { Button } from '../components/ui/Button'
import { useToastStore } from '../store/toast.store'
import { useExportRequestStore, type ExportTarget } from '../store/exportRequest.store'

const WATCHED = ['movements', 'items', 'warehouses', 'partners'] as const
const AUDIT_DISABLED_TITLE = 'Audit jurnalı üçün Excel ixracı bu mərhələdə deaktivdir'

interface Props {
  me: Me
  /* M16-11 — the page switch half of the legacy delegation. Optional so the
     page stays renderable on its own, the same precedent `onOpenOperation`
     sets on Balances/Nomenklatura; when it is absent the export request is
     still recorded but no navigation happens. */
  onOpenPage?: (target: ExportTarget) => void
}

export function SettingsPage({ me, onOpenPage }: Props) {
  const { items, partners, indexes, loading, loaded, error, load } = useAnalysisStore()
  const show = useToastStore((s) => s.show)
  const [users, setUsers] = useState<SettingsUserRow[]>([])
  const [usersError, setUsersError] = useState(false)
  useEffect(() => { void load() }, [load])
  useRealtimeRefresh(true, WATCHED, () => { void load() })
  useEffect(() => {
    if (!isAdmin(me)) return
    void fetchSettingsUsers().then((result) => {
      if (!result.ok) { setUsersError(true); return }
      setUsers(result.rows); setUsersError(false)
    })
  }, [me])
  const requestExport = useExportRequestStore((s) => s.request)

  /* M16-11 — legacy `rSet()` (index.html:7197) delegates mov/bal/nom to the
     destination page's OWN export button rather than exporting here:

       mov: () => { go('mov'); setTimeout(() => $('#mov-exp').click(), 50); }

     The two halves are kept in the legacy ORDER — record the pending export
     FIRST, switch the page SECOND — which is the same M5-55 sequencing every
     other cross-page handoff uses. Navigating first would mount the
     destination before the request existed, and it would export nothing.

     Settings deliberately performs NO export derivation for these three: the
     matrices belong to `movementExport`, `balanceExport` and
     `nomenclatureExportMatrix`, each reached through its page's own gate.
     «Kontragentlər» is the one Settings export with no page of its own
     (index.html:7197) and keeps its direct `xls()` call below. */
  function delegateExport(target: ExportTarget) {
    requestExport(target)
    onOpenPage?.(target)
  }

  const counts = useMemo(() => sourceCounts(items, partners, indexes.operational), [items, partners, indexes.operational])
  const sortedUsers = useMemo(() => [...users].sort((a, b) => (a.email || '').localeCompare(b.email || '')), [users])
  return <>
    <div className="phead"><div><h2>Parametrlər və ixrac</h2><p>Məlumat mübadiləsi, ehtiyat nüsxə və istifadəçi hüquqları.</p></div></div>
    {loading && !loaded && <div className="empty"><b>Yüklənir…</b>Parametrlər üçün məlumatlar hazırlanır.</div>}
    {error && !loaded && <div className="empty"><b>Yükləmə xətası</b>{error}</div>}
    {error && loaded && <div className="hint"><span className="tag t-rm">Yenilənmədi</span> {error}</div>}
    {loaded && <>
      <div className="grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
        <div className="card"><header><h3>Məlumatların ixracı</h3></header><div className="pad">
          <p className="hint" style={{ marginTop: 0 }}>CSV faylları Excel-də birbaşa açılır (UTF-8 BOM, nöqtəli vergül ayırıcı).</p>
          <div className="pill-row">
            <Button variant="secondary" data-testid="set-exp-mov" onClick={() => delegateExport('mov')}>Mal hərəkəti</Button>
            <Button variant="secondary" data-testid="set-exp-bal" onClick={() => delegateExport('bal')}>Anbar qalıqları</Button>
            <Button variant="secondary" data-testid="set-exp-nom" onClick={() => delegateExport('nom')}>Nomenklatura</Button>
            <Button variant="secondary" onClick={() => { xls(partnerExportMatrix(partners), 'kontragentler'); show('kontragentler faylı yükləndi') }}>Kontragentlər</Button>
            <Button variant="secondary" disabled title={AUDIT_DISABLED_TITLE}>Audit jurnalı</Button>
            <Button disabled title="D-S1 owner decision pending">Tam ehtiyat nüsxə (JSON)</Button>
          </div>
        </div></div>
        <div className="card"><header><h3>Məlumatların idxalı</h3></header><div className="pad">
          <p className="hint" style={{ marginTop: 0 }}>Excel-dən sətirləri kopyalayıb aşağıya yapışdırın. Sütun ardıcıllığı: <span className="code">Tarix; Anbar; Malın kodu; Giriş; Çıxış; Növü; Kontragent</span></p>
          <textarea rows={6} disabled aria-label="Toplu idxal" placeholder={'2026-07-01\tƏlət\t0000123\t5\t\tSatınalma\t"Neq MMC"'} />
          <div style={{ display: 'flex', gap: 8, marginTop: 9 }}><Button disabled title="D-S2 owner decision pending">Yoxla və yüklə</Button></div>
        </div></div>
      </div>
      <div className="card" style={{ marginTop: 12 }}><header><h3>Hüquq matrisi</h3></header><div className="tw"><table><thead><tr><th>Səlahiyyət</th>{PERMISSION_COLUMNS.map((role) => <th key={role}>{ROLES[role]?.name || role}</th>)}</tr></thead><tbody>{PERMISSION_ROWS.map((row) => <tr key={row.key}><td>{row.label}</td>{PERMISSION_COLUMNS.map((role) => <td key={role}><span className={`tag ${hasPermission(role, row.key) ? 't-in' : 't-mut'}`}>{hasPermission(role, row.key) ? 'var' : 'yox'}</span></td>)}</tr>)}</tbody></table></div></div>
      <div className="card" style={{ marginTop: 12 }}><header><h3>Sistemdə olan istifadəçilər</h3></header><div className="tw">
        {!isAdmin(me) ? <div className="empty"><b>İstifadəçi idarəetməsi</b>Yalnız Admin bütün istifadəçiləri görə və rol təyin edə bilər.</div>
          : usersError ? <div className="empty"><b>Yükləmə xətası</b>İstifadəçilər yüklənə bilmədi.</div>
            : sortedUsers.length === 0 ? <div className="empty"><b>Məlumat yoxdur</b>İstifadəçi tapılmadı.</div>
              : <table><thead><tr><th>İstifadəçi (e-poçt)</th><th>Rol</th><th>Anbar</th><th>Status</th><th /></tr></thead><tbody>{sortedUsers.map((user) => <tr key={user.id}><td><b>{user.email}</b>{user.id === me.id && <> <span className="tag t-op">siz</span></>}</td><td>{ROLES[user.role]?.name || user.role}</td><td>{user.warehouse || '—'}</td><td><span className={`tag ${user.active === false ? 't-mut' : 't-in'}`}>{user.active === false ? 'deaktiv' : 'aktiv'}</span></td><td><Button size="sm" disabled title="D-S3 owner decision pending">Rol təyin et</Button></td></tr>)}</tbody></table>}
      </div></div>
      <div className="card" style={{ marginTop: 12 }}><header><h3>Məlumat mənbəyi</h3></header><div className="pad"><div className="hint">Məlumat bazası: Supabase (PostgreSQL). Cari vəziyyət: <b>{nf(counts.items)}</b> nomenklatura mövqeyi, <b>{nf(counts.partners)}</b> kontragent, <b>{nf(counts.movements)}</b> mal hərəkəti qeydi.</div></div></div>
    </>}
  </>
}
