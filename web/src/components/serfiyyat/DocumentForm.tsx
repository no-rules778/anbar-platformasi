import { useEffect, useMemo, useRef, useState } from 'react'
import * as XLSX from 'xlsx'
import { isAdmin, type Me } from '../../lib/roles'
import { money, nf, today } from '../../lib/format'
import {
  activeChannelNames, allowedProjects, canWrite, docById, draftGrandTotal,
  itemSearchHits,
} from '../../lib/serfiyyat'
import { lineImportToast, parseDocsImport, parseLineImport, type DocsImportGroup } from '../../lib/serfiyyatImport'
import { createSerfiyyatDocument, editSerfiyyatDocument } from '../../api/serfiyyatDocuments.api'
import { useSerfiyyatStore } from '../../store/serfiyyat.store'
import { useToastStore } from '../../store/toast.store'
import { Button } from '../ui/Button'
import { DocsImportPreviewDialog } from './DocsImportPreviewDialog'

/* The `doc` tab — smRenderForm() (index.html:6250-6362), smRenderLines()
   (6514-6524) and smSubmitDocument() (6526-6553).

   EVERY guard here is a BROWSER AFFORDANCE. `create_serfiyyat_document`
   re-checks role, the anbardar's warehouse-to-project binding, project
   activity, the date, the channel and every line independently, and
   `edit_serfiyyat_document` is admin-only server-side (schema 2416-2474,
   2732-2734). A hidden form is never a permission. */

interface Props {
  me: Me
}

export function DocumentForm({ me }: Props) {
  const {
    projects, documents, items, itemsByCode, channels,
    draft, editDocId, addDraftLine, removeDraftLine, clearDraft, cancelEdit, load,
  } = useSerfiyyatStore()
  const show = useToastStore((s) => s.show)

  const editing = !!editDocId
  const editDoc = editing ? docById(documents, editDocId) : undefined

  /* GUARD 1 (M13-20) — editing a document that no longer exists (deleted
     meanwhile) clears the edit target and the draft and FALLS THROUGH to the
     ordinary create form rather than erroring. Done in an effect because it
     is a state change, not a render decision. */
  useEffect(() => {
    if (editing && !editDoc) cancelEdit()
  }, [editing, editDoc, cancelEdit])

  const writeProjects = useMemo(
    () => allowedProjects(me, projects, true),
    [me, projects],
  )

  /* Header fields. Seeded from the edited document, else the legacy defaults
     (M13-30, M13-31). The seed re-runs when the edit target changes. */
  const [projId, setProjId] = useState('')
  const [date, setDate] = useState(today())
  const [kanal, setKanal] = useState('')
  const [kontragent, setKontragent] = useState('')
  const [avto, setAvto] = useState('')
  const [iv, setIv] = useState('')
  const [note, setNote] = useState('')
  const [err, setErr] = useState('')

  useEffect(() => {
    setProjId(editDoc ? editDoc.projectId : (writeProjects[0]?.id ?? ''))
    setDate(editDoc ? editDoc.d : today())
    setKanal(editDoc ? editDoc.kanal : '')
    setKontragent(editDoc ? editDoc.kontragent : '')
    setAvto(editDoc ? editDoc.avto : '')
    setIv(editDoc ? editDoc.iv : '')
    setNote(editDoc ? editDoc.note : '')
    setErr('')
    /* Keyed on the document ID, not the object, so an unrelated refresh does
       not discard what the user has typed. */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editDocId])

  /* The line editor (M13-32…M13-36). */
  const [query, setQuery] = useState('')
  const [debounced, setDebounced] = useState('')
  const [panelOpen, setPanelOpen] = useState(false)
  const [selCode, setSelCode] = useState('')
  const [qty, setQty] = useState('')
  const [price, setPrice] = useState('')
  const blurTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const searchTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  /* M13-32 — debounced 160 ms, exactly as legacy debounces `search`. */
  useEffect(() => {
    clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => setDebounced(query), 160)
    return () => clearTimeout(searchTimer.current)
  }, [query])

  const hits = useMemo(() => itemSearchHits(debounced, items), [debounced, items])

  /* M13-34 — hidden on blur after 150 ms, so a click on a hit still lands. */
  function hidePanelSoon() {
    clearTimeout(blurTimer.current)
    blurTimer.current = setTimeout(() => setPanelOpen(false), 150)
  }
  useEffect(() => () => { clearTimeout(blurTimer.current) }, [])

  /* M13-33 — the pick fills the NAME (or the raw code when unknown) and sets
     the price ONLY when the price field is currently empty. An existing
     price is never overwritten. */
  function pickItem(code: string) {
    const it = itemsByCode.get(code)
    setSelCode(code)
    setQuery(it ? it.name : code)
    setPanelOpen(false)
    if (it && !price) setPrice(it.price == null ? '' : String(it.price))
  }

  /* M13-35 — refuses in a FIXED order, into the inline error span, NOT a
     toast. A zero or negative quantity is refused by the SECOND guard; the
     first only ever fires for a missing or unknown item. */
  function addLine() {
    const q = parseFloat(qty)
    if (!selCode || !itemsByCode.has(selCode)) { setErr('Mal seçilməyib'); return }
    if (!(q > 0)) { setErr('Miqdar müsbət olmalıdır'); return }
    setErr('')
    addDraftLine({ code: selCode, qty: q, price: parseFloat(price) || 0 })
    /* M13-36 — all three inputs reset. */
    setSelCode(''); setQuery(''); setDebounced(''); setQty(''); setPrice('')
  }

  /* ---- the two INDEPENDENT import paths (M13-60, never conflated) ---- */

  const [importGroups, setImportGroups] = useState<DocsImportGroup[] | null>(null)
  const [importErrors, setImportErrors] = useState<string[]>([])

  function readSheet(file: File, onRows: (rows: unknown[][]) => void) {
    const rd = new FileReader()
    rd.onload = () => {
      try {
        if (typeof XLSX === 'undefined' || typeof XLSX.read !== 'function') {
          show('Excel kitabxanası yüklənmədi', true); return
        }
        const wb = XLSX.read(rd.result as ArrayBuffer, { type: 'array' })
        const ws = wb.Sheets[wb.SheetNames[0]]
        onRows(XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', raw: false }) as unknown[][])
      } catch (e) {
        show('Fayl oxunmadı: ' + (e instanceof Error ? e.message : ''), true)
      }
    }
    rd.readAsArrayBuffer(file)
  }

  /* LINE-level: appends to the OPEN draft (M13-61…M13-63). */
  function onLineFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    readSheet(f, (rows) => {
      if (!rows.length) { show('Fayl boşdur', true); return }
      const res = parseLineImport(rows, itemsByCode)
      for (const l of res.lines) addDraftLine(l)
      const t = lineImportToast(res)
      show(t.text, t.isError)
      if (res.rejected.length) console.warn('smImportLines rədd edilənlər:', res.rejected)
    })
  }

  /* DOCUMENT-level: creates entirely NEW documents. Nothing is written until
     the preview is confirmed (M13-69). */
  function onDocsFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    readSheet(f, (rows) => {
      const res = parseDocsImport(rows, writeProjects, itemsByCode, items)
      setImportGroups(res.groups)
      setImportErrors(res.errors)
    })
  }

  /* ---- submit (M13-50…M13-54) ---- */

  const [busy, setBusy] = useState(false)

  async function submit() {
    /* M13-50 — a FIXED order, each into the inline span. */
    if (!projId) { setErr('Layihə seçilməyib'); return }
    if (!date) { setErr('Tarix seçilməyib'); return }
    if (!draft.length) { setErr('Ən azı bir material sətri lazımdır'); return }
    setErr('')
    setBusy(true)

    const input = {
      projectId: projId, docDate: date, kontragent, avtomobil: avto,
      kanal, invoiceNum: iv, note, lines: draft,
    }
    /* M13-52 — ONE submit path: the same argument object routes to edit when
       editDocId is set and to create otherwise. */
    const res = editDocId
      ? await editSerfiyyatDocument(editDocId, input)
      : await createSerfiyyatDocument(input)
    setBusy(false)

    /* M13-54 — on failure the DRAFT IS KEPT: lines, header fields and the
       edit target all survive, so a refused submit loses no work. */
    if (!res.ok) { show('Xəta: ' + (res.error || 'server xətası'), true); return }

    /* M13-53 — the toast carries the RPC's returned doc_num. */
    const num = res.data?.doc_num ?? ''
    show((editDocId ? 'Sənəd düzəldildi: ' : 'Sənəd yaradıldı: ') + num)
    clearDraft()
    await load()
    /* Legacy calls rSm() after the reload, rebuilding the complete form. A
       create keeps editDocId=null, so relying on the edit-id effect would
       leave every local field stale. Reset the whole local editor explicitly
       after either successful route (M13-53). */
    setProjId(writeProjects[0]?.id ?? '')
    setDate(today())
    setKanal('')
    setKontragent('')
    setAvto('')
    setIv('')
    setNote('')
    setErr('')
    setSelCode('')
    setQuery('')
    setDebounced('')
    setPanelOpen(false)
    setQty('')
    setPrice('')
    setImportGroups(null)
    setImportErrors([])
  }

  /* ---- the remaining early-return guards, IN ORDER ---- */

  /* GUARD 2 (M13-21) — not editing AND no write affordance. Reached BEFORE
     the project check, so a rehber sees this and never the project message. */
  if (!editing && !canWrite(me)) {
    return (
      <div className="card"><div className="pad hint" data-testid="sm-guard-perm">
        Sənəd yaratmaq üçün icazəniz yoxdur (yalnız Admin və Anbardar).
      </div></div>
    )
  }
  /* GUARD 3 (M13-22) — editing AND not admin. */
  if (editing && !isAdmin(me)) {
    return (
      <div className="card"><div className="pad hint" data-testid="sm-guard-edit-admin">
        Provedilmiş sənədi yalnız Admin düzəldə bilər.
      </div></div>
    )
  }
  /* GUARD 4 (M13-23) — not editing AND no allowed active project. Deliberately
     SKIPPED in edit mode, so an admin can edit a document whose project is
     not one of their own. */
  if (!editing && !writeProjects.length) {
    return (
      <div className="card"><div className="pad hint" data-testid="sm-guard-project">
        Sizə bağlı aktiv layihə yoxdur. Admin Soraqçalar bölməsində layihəni sizin anbarınıza bağlamalıdır.
      </div></div>
    )
  }

  const kanallar = activeChannelNames(channels)
  const total = draftGrandTotal(draft)

  return <>
    {/* M13-25 — the document-import card is rendered ONLY when not editing. */}
    {!editing && (
      <div className="card" style={{ marginBottom: 12 }}><div className="pad">
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <b>Excel-dən bir neçə sənəd idxal et</b><div className="sp" />
          <input
            type="file" accept=".xlsx,.xls" style={{ width: 'auto' }}
            data-testid="sm-doc-imp-file" onChange={onDocsFile}
          />
        </div>
        <p className="hint" style={{ margin: '6px 0 0' }}>
          Sütunlar: layihə · material · ölçü · miqdar · qiymət · tarix · qeyd
          (kontragent/avtomobil/kanal da ötürülə bilər). Eyni layihə+kontragent+avtomobil+kanal+tarix+qeyd
          olan sətirlər BİR sənəd kimi qruplaşdırılır. Yoxlamadan sonra təsdiq tələb olunur —
          heç nə sükutla yazılmır.
        </p>
      </div></div>
    )}

    <div className="card"><div className="pad">
      {/* M13-24 — the edit-mode hint and its «ləğv et». */}
      {editing && editDoc && (
        <div className="hint" style={{ marginBottom: 8 }} data-testid="sm-edit-hint">
          Düzəliş rejimi: <b>{editDoc.num}</b> (provedildikdən sonra){' '}
          <a href="#" data-testid="sm-edit-cancel" onClick={(e) => { e.preventDefault(); cancelEdit() }}>
            — ləğv et
          </a>
        </div>
      )}

      <div className="row" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
        <label className="f"><span>Layihə</span>
          <select data-testid="sm-proj" value={projId} onChange={(e) => setProjId(e.target.value)}>
            {writeProjects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </label>
        <label className="f"><span>Tarix</span>
          <input type="date" data-testid="sm-date" value={date} onChange={(e) => setDate(e.target.value)} />
        </label>
        <label className="f"><span>Alınma kanalı</span>
          <select data-testid="sm-kanal" value={kanal} onChange={(e) => setKanal(e.target.value)}>
            {/* The leading empty option, exactly as legacy renders it. */}
            <option value="">—</option>
            {kanallar.map((k) => <option key={k} value={k}>{k}</option>)}
          </select>
        </label>
      </div>

      <div className="row" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
        <label className="f"><span>Kontragent</span>
          <input
            type="text" data-testid="sm-kontragent" placeholder="məs. Anbar Tədarük MMC"
            value={kontragent} onChange={(e) => setKontragent(e.target.value)}
          />
        </label>
        <label className="f"><span>Avtomobil nömrəsi</span>
          <input
            type="text" data-testid="sm-avto" placeholder="məs. 10-AA-123"
            value={avto} onChange={(e) => setAvto(e.target.value)}
          />
        </label>
        <label className="f"><span>Qaimə №</span>
          <input
            type="text" data-testid="sm-iv" placeholder="məs. 83951"
            value={iv} onChange={(e) => setIv(e.target.value)}
          />
        </label>
      </div>
      <label className="f"><span>Qeyd</span>
        <input
          type="text" data-testid="sm-note" placeholder="istəyə bağlı"
          value={note} onChange={(e) => setNote(e.target.value)}
        />
      </label>

      <div
        className="row"
        style={{ gridTemplateColumns: '1fr 1.15fr', gap: 14, marginTop: 12, alignItems: 'start' }}
      >
        <div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6, flexWrap: 'wrap' }}>
            <b>Mal əlavə et</b><div className="sp" />
            <input
              type="file" accept=".xlsx,.xls" style={{ width: 'auto' }}
              data-testid="sm-imp-file" onChange={onLineFile}
            />
            <span className="hint">↑ Excel (kod · miqdar · qiymət)</span>
          </div>
          <label className="f"><span>Mal (ad və ya kod)</span>
            <div style={{ position: 'relative' }}>
              <input
                type="text" autoComplete="off" data-testid="sm-item" value={query}
                onChange={(e) => { setQuery(e.target.value); setPanelOpen(true) }}
                onBlur={hidePanelSoon}
              />
              {panelOpen && debounced.trim().length >= 2 && (
                <div data-testid="sm-item-res" style={{
                  position: 'absolute', left: 0, right: 0, top: '100%', background: '#fff',
                  border: '1px solid var(--line)', borderRadius: '0 0 4px 4px',
                  maxHeight: 220, overflow: 'auto', zIndex: 20,
                }}>
                  {hits.length ? hits.map((i) => (
                    <div
                      key={i.code} data-testid={'sm-hit-' + i.code}
                      style={{ padding: '7px 9px', cursor: 'pointer', borderBottom: '1px solid var(--line-2)' }}
                      onMouseDown={(e) => { e.preventDefault(); pickItem(i.code) }}
                    >
                      <b>{i.name}</b>
                      <div className="hint"><span className="code">{i.code}</span> · {i.unit ?? ''}</div>
                    </div>
                  )) : <div style={{ padding: 9 }} className="hint">Tapılmadı</div>}
                </div>
              )}
            </div>
          </label>
          <div className="row" style={{ gridTemplateColumns: '1fr 1fr' }}>
            <label className="f"><span>Miqdar</span>
              <input
                type="number" step="0.01" min="0" data-testid="sm-qty"
                value={qty} onChange={(e) => setQty(e.target.value)}
              />
            </label>
            <label className="f"><span>Qiymət</span>
              <input
                type="number" step="0.01" min="0" data-testid="sm-price"
                value={price} onChange={(e) => setPrice(e.target.value)}
              />
            </label>
          </div>
          <Button
            variant="secondary" data-testid="sm-add-line"
            style={{ width: '100%' }} onClick={addLine}
          >
            Sətri əlavə et →
          </Button>
        </div>

        <div>
          <div style={{ marginBottom: 6 }}><b>Sənədin sətirləri</b></div>
          <div
            data-testid="sm-lines-tbl"
            style={{ border: '1px solid var(--line)', borderRadius: 4, padding: 8, minHeight: 120 }}
          >
            {/* M13-39 — a hand-written TWO-LINE hint, not the shared tbl() empty block. */}
            {!draft.length ? (
              <div className="hint" style={{ padding: '24px 8px', textAlign: 'center' }}>
                Hələ sətir əlavə edilməyib.<br />
                Soldan mal seçib «Sətri əlavə et» düyməsinə basın və ya Excel-dən idxal edin.
              </div>
            ) : (
              <table>
                <thead><tr>
                  {/* M13-40 — exactly these columns. */}
                  <th>Mal</th><th>Kod</th><th>Ölçü</th><th>Miqdar</th><th>Qiymət</th><th>Cəm</th><th />
                </tr></thead>
                <tbody>
                  {draft.map((l, i) => {
                    const it = itemsByCode.get(l.code)
                    return (
                      <tr key={i}>
                        <td>{it ? it.name : l.code}</td>
                        <td className="code">{l.code}</td>
                        <td>{it ? (it.unit ?? '') : ''}</td>
                        <td>{nf(l.qty, 2)}</td>
                        <td>{nf(l.price, 2)}</td>
                        <td>{money(l.qty * l.price)}</td>
                        <td>
                          {/* M13-41 — removes THAT row by index. */}
                          <a
                            href="#" data-testid={'sm-del-' + i}
                            onClick={(e) => { e.preventDefault(); removeDraftLine(i) }}
                          >✕</a>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot><tr>
                  <td colSpan={5} style={{ textAlign: 'right' }}><b>Cəmi</b></td>
                  {/* M13-42 — money() renders EXACTLY 0 as an em-dash. */}
                  <td colSpan={2} data-testid="sm-total"><b>{money(total)}</b></td>
                </tr></tfoot>
              </table>
            )}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 14 }}>
        <Button data-testid="sm-submit" disabled={busy} onClick={() => void submit()}>
          {editing ? 'Düzəlişi yadda saxla' : 'Sənədi yadda saxla'}
        </Button>
        <span className="hint" data-testid="sm-err">{err}</span>
      </div>
    </div></div>

    {importGroups !== null && (
      <DocsImportPreviewDialog
        groups={importGroups}
        errors={importErrors}
        onClose={() => { setImportGroups(null); setImportErrors([]) }}
        onDone={async () => { setImportGroups(null); setImportErrors([]); await load() }}
      />
    )}
  </>
}
