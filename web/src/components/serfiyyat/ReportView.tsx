import { useMemo, useState } from 'react'
import { isAdmin, type Me } from '../../lib/roles'
import { fmtD, money, nf } from '../../lib/format'
import { activeChannelNames, allowedProjects, projById, reportRows } from '../../lib/serfiyyat'
import {
  EMPTY_FILTERS, filterReportRows, summariseByItem, summariseByProject, type SmFilters,
} from '../../lib/serfiyyatFilters'
import { exportSerfiyyatWorkbook } from '../../lib/serfiyyatExport'
import { deleteSerfiyyatDocument } from '../../api/serfiyyatDocuments.api'
import { useSerfiyyatStore } from '../../store/serfiyyat.store'
import { useAuditLogStore } from '../../store/auditLog.store'
import { useToastStore } from '../../store/toast.store'
import { Button } from '../ui/Button'

/* The `rep` tab — smRenderReport() (index.html:6593-6646), smRenderDocsTable()
   (6650-6667), smRenderReportTable() (6692-6712) and smExportExcel()
   (6714-6726).

   The report scope uses `forWrite: false` (M13-76): a rehber, who may write
   nothing, still sees every active project's rows. Using the write-scoped
   list here would silently blank the report for them. */

interface Props {
  me: Me
}

export function ReportView({ me }: Props) {
  const {
    projects, documents, lines, itemsByCode, channels,
    filters, setFilters, clearFilters, openEdit, load,
  } = useSerfiyyatStore()
  /* Legacy UMAIL is application-wide. App warms this accepted directory once
     at boot; subscribing here avoids a page-scoped duplicate RPC. */
  const emails = useAuditLogStore((s) => s.emails)
  const show = useToastStore((s) => s.show)

  /* The pending input values. Legacy holds these in the DOM and snapshots
     them on «Filtrləri tətbiq et»; `filters` is the APPLIED set (M13-81). */
  const [pending, setPending] = useState<SmFilters>(filters)
  const set = (patch: Partial<SmFilters>) => setPending((p) => ({ ...p, ...patch }))

  const readProjects = useMemo(() => allowedProjects(me, projects, false), [me, projects])
  const allowedIds = useMemo(() => new Set(readProjects.map((p) => p.id)), [readProjects])

  const rows = useMemo(
    () => reportRows(lines, documents, projects, itemsByCode, emails, allowedIds),
    [lines, documents, projects, itemsByCode, emails, allowedIds],
  )
  const shown = useMemo(() => filterReportRows(rows, filters), [rows, filters])
  const byProject = useMemo(() => summariseByProject(shown), [shown])
  const byItem = useMemo(() => summariseByItem(shown), [shown])

  /* M13-81 — applies as ONE snapshot, trimming and lower-casing the text
     fields exactly as legacy does when it reads the inputs (6631-6639). */
  function apply() {
    const t = (v: string) => v.trim().toLowerCase()
    setFilters({
      d1: pending.d1, d2: pending.d2, proj: pending.proj, kanal: pending.kanal,
      item: t(pending.item), kontragent: t(pending.kontragent), avto: t(pending.avto),
      iv: t(pending.iv), note: t(pending.note), by: t(pending.by),
      q1: pending.q1, q2: pending.q2, p1: pending.p1, p2: pending.p2,
      s1: pending.s1, s2: pending.s2,
    })
  }

  /* M13-82 — «Təmizlə» resets the applied set AND every input. */
  function clear() {
    setPending(EMPTY_FILTERS)
    clearFilters()
  }

  function exportExcel() {
    const res = exportSerfiyyatWorkbook(shown)
    /* M13-89 / D-N7 — on a missing library nothing is written and there is
       no CSV fallback. */
    if (!res.ok) { show(res.error ?? 'Excel kitabxanası yüklənmədi', true); return }
    show('Excel yükləndi (' + res.count + ' sətir)')
  }

  /* M13-71 — the module's ONLY confirm() prompt; its text states plainly
     that the deletion is not reversible. Declining makes NO call. */
  async function removeDocument(docId: string, docNum: string) {
    const okToDelete = globalThis.confirm(
      'Sənəd silinsin? ' + docNum + ' — bu geri qaytarılmır (audit jurnalında iz qalır).',
    )
    if (!okToDelete) return
    const res = await deleteSerfiyyatDocument(docId)
    if (!res.ok) { show('Xəta: ' + (res.error || 'server xətası'), true); return }
    show('Sənəd silindi: ' + docNum)
    await load()
  }

  /* M13-73 — admin-only document table, sorted by doc_date DESCENDING, with
     the per-document sum taken from the STORED line_sum values. */
  const docRows = useMemo(() => {
    if (!isAdmin(me)) return []
    return documents
      .filter((d) => allowedIds.has(d.projectId))
      .slice()
      .sort((a, b) => (b.d || '').localeCompare(a.d || ''))
      .map((d) => {
        const own = lines.filter((l) => l.docId === d.id)
        return {
          doc: d,
          count: own.length,
          sum: own.reduce((s, l) => s + l.sum, 0),
          projName: projById(projects, d.projectId)?.name ?? '',
        }
      })
  }, [me, documents, lines, projects, allowedIds])

  return <>
    <div className="card"><div className="pad">
      {/* M13-80 — fifteen inputs across three rows. */}
      {/* M19-10 — `sm-report-filter-row` is the hook for the phone-width
          re-flow (index.css, the max-width:900px block). The inline template
          is the DESKTOP one and stays; the class carries no desktop styling. */}
      <div className="row sm-report-filter-row" style={{ gridTemplateColumns: 'repeat(5,1fr)' }}>
        <label className="f"><span>Tarix (dan)</span>
          <input type="date" data-testid="sm-f-d1" value={pending.d1} onChange={(e) => set({ d1: e.target.value })} />
        </label>
        <label className="f"><span>Tarix (kimi)</span>
          <input type="date" data-testid="sm-f-d2" value={pending.d2} onChange={(e) => set({ d2: e.target.value })} />
        </label>
        <label className="f"><span>Layihə</span>
          <select data-testid="sm-f-proj" value={pending.proj} onChange={(e) => set({ proj: e.target.value })}>
            <option value="">Hamısı</option>
            {readProjects.map((p) => <option key={p.id} value={p.name}>{p.name}</option>)}
          </select>
        </label>
        <label className="f"><span>Material</span>
          <input
            type="text" placeholder="ad axtar" data-testid="sm-f-item"
            value={pending.item} onChange={(e) => set({ item: e.target.value })}
          />
        </label>
        <label className="f"><span>Kontragent</span>
          <input
            type="text" data-testid="sm-f-kontragent"
            value={pending.kontragent} onChange={(e) => set({ kontragent: e.target.value })}
          />
        </label>
      </div>

      <div className="row sm-report-filter-row" style={{ gridTemplateColumns: 'repeat(5,1fr)' }}>
        <label className="f"><span>Avtomobil nömrəsi</span>
          <input type="text" data-testid="sm-f-avto" value={pending.avto} onChange={(e) => set({ avto: e.target.value })} />
        </label>
        <label className="f"><span>Alınma kanalı</span>
          <select data-testid="sm-f-kanal" value={pending.kanal} onChange={(e) => set({ kanal: e.target.value })}>
            <option value="">Hamısı</option>
            {activeChannelNames(channels).map((k) => <option key={k} value={k}>{k}</option>)}
          </select>
        </label>
        <label className="f"><span>Qaimə №</span>
          <input type="text" data-testid="sm-f-iv" value={pending.iv} onChange={(e) => set({ iv: e.target.value })} />
        </label>
        <label className="f"><span>Qeyd axtar</span>
          <input type="text" data-testid="sm-f-note" value={pending.note} onChange={(e) => set({ note: e.target.value })} />
        </label>
        <label className="f"><span>Kim daxil edib</span>
          <input type="text" data-testid="sm-f-by" value={pending.by} onChange={(e) => set({ by: e.target.value })} />
        </label>
      </div>

      <div className="row" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
        <label className="f"><span>Miqdar (min—max)</span>
          <div style={{ display: 'flex', gap: 6 }}>
            <input type="number" placeholder="min" data-testid="sm-f-q1" value={pending.q1} onChange={(e) => set({ q1: e.target.value })} />
            <input type="number" placeholder="max" data-testid="sm-f-q2" value={pending.q2} onChange={(e) => set({ q2: e.target.value })} />
          </div>
        </label>
        <label className="f"><span>Qiymət (min—max)</span>
          <div style={{ display: 'flex', gap: 6 }}>
            <input type="number" placeholder="min" data-testid="sm-f-p1" value={pending.p1} onChange={(e) => set({ p1: e.target.value })} />
            <input type="number" placeholder="max" data-testid="sm-f-p2" value={pending.p2} onChange={(e) => set({ p2: e.target.value })} />
          </div>
        </label>
        <label className="f"><span>Cəm (min—max)</span>
          <div style={{ display: 'flex', gap: 6 }}>
            <input type="number" placeholder="min" data-testid="sm-f-s1" value={pending.s1} onChange={(e) => set({ s1: e.target.value })} />
            <input type="number" placeholder="max" data-testid="sm-f-s2" value={pending.s2} onChange={(e) => set({ s2: e.target.value })} />
          </div>
        </label>
      </div>

      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        <Button variant="secondary" data-testid="sm-f-apply" onClick={apply}>Filtrləri tətbiq et</Button>
        <Button variant="secondary" data-testid="sm-f-clear" onClick={clear}>Təmizlə</Button>
        <div className="sp" style={{ flex: 1 }} />
        <Button variant="secondary" data-testid="sm-exp" onClick={exportExcel}>⬇ Excel-ə ixrac et</Button>
      </div>
    </div></div>

    {/* M13-72 — the document table is rendered ONLY for an admin. */}
    {isAdmin(me) && (
      <div className="card" style={{ marginTop: 12 }}>
        <header>
          <h3>Sənədlər</h3>
          <p className="hint" style={{ margin: 0 }}>
            Provedildikdən sonra düzəliş/silinmə yalnız Admin üçündür.
          </p>
        </header>
        <div className="tw" data-testid="sm-docs-tbl">
          {!docRows.length ? <div className="pad hint">Sənəd yoxdur.</div> : (
            <table>
              <thead><tr>
                <th>Sənəd №</th><th>Qaimə №</th><th>Tarix</th><th>Layihə</th>
                <th>Sətir sayı</th><th>Cəm</th><th />
              </tr></thead>
              <tbody>
                {docRows.map((r) => (
                  <tr key={r.doc.id}>
                    <td className="code">{r.doc.num}</td>
                    <td className="code">{r.doc.iv}</td>
                    <td>{fmtD(r.doc.d)}</td>
                    <td>{r.projName}</td>
                    <td>{nf(r.count)}</td>
                    <td>{money(r.sum)}</td>
                    <td>
                      <a
                        href="#" data-testid={'sm-doc-edit-' + r.doc.id}
                        onClick={(e) => {
                          e.preventDefault()
                          /* M13-74 — seed the draft from the stored lines. */
                          openEdit(r.doc.id, lines.filter((l) => l.docId === r.doc.id)
                            .map((l) => ({ code: l.code, qty: l.qty, price: l.price })))
                        }}
                      >Düzəliş</a>
                      {' · '}
                      <a
                        href="#" data-testid={'sm-doc-del-' + r.doc.id}
                        onClick={(e) => { e.preventDefault(); void removeDocument(r.doc.id, r.doc.num) }}
                      >Sil</a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    )}

    <div className="card" style={{ marginTop: 12 }}>
      <div className="tw" data-testid="sm-rep-tbl">
        <table>
          {/* M13-85 — exactly fourteen columns, none right-aligned. */}
          <thead><tr>
            <th>Tarix</th><th>Sənəd №</th><th>Layihə</th><th>Material</th><th>Ölçü</th>
            <th>Miqdar</th><th>Qiymət</th><th>Cəm</th><th>Kontragent</th><th>Avtomobil</th>
            <th>Alınma kanalı</th><th>Qaimə №</th><th>Qeyd</th><th>Daxil edən</th>
          </tr></thead>
          <tbody>
            {/* Rows are NOT clickable. */}
            {shown.map((r, i) => (
              <tr key={i}>
                <td>{fmtD(r.d)}</td>
                <td className="code">{r.docNum}</td>
                <td>{r.proj}</td>
                <td>{r.item}</td>
                <td>{r.unit}</td>
                <td>{nf(r.qty, 2)}</td>
                <td>{nf(r.price, 2)}</td>
                <td>{money(r.sum)}</td>
                <td>{r.kontragent}</td>
                <td>{r.avto}</td>
                <td>{r.kanal}</td>
                <td className="code">{r.iv}</td>
                <td>{r.note}</td>
                <td>{r.by}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {/* M13-85 — the empty message sits BELOW the still-rendered header. */}
        {!shown.length && <div className="pad hint" data-testid="sm-rep-empty">Uyğun sətir tapılmadı.</div>}
      </div>
    </div>

    <div className="card" style={{ marginTop: 12 }}>
      <header><h3>Yekun</h3></header>
      <div className="pad" data-testid="sm-rep-sum">
        <div className="row" style={{ gridTemplateColumns: '1fr 1fr' }}>
          <div>
            <b>Layihə üzrə</b>
            <table data-testid="sm-sum-proj"><tbody>
              {byProject.length ? byProject.map((s) => (
                <tr key={s.key}><td>{s.key}</td><td>{money(s.sum)}</td></tr>
              )) : <tr><td className="hint">—</td></tr>}
            </tbody></table>
          </div>
          <div>
            <b>Material üzrə</b>
            <table data-testid="sm-sum-item"><tbody>
              {byItem.length ? byItem.map((s) => (
                <tr key={s.key}><td>{s.key}</td><td>{money(s.sum)}</td></tr>
              )) : <tr><td className="hint">—</td></tr>}
            </tbody></table>
          </div>
        </div>
      </div>
    </div>
  </>
}
