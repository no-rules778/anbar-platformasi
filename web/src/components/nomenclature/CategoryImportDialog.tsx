import { useState } from 'react'
import type { ItemRow } from '../../api/items.api'
import { setItemCategories } from '../../api/setItemCategories.api'
import {
  categoryImportBlocked, classifyCategoryRows,
  type CategoryPreviewRow,
} from '../../lib/categoryImportClassify'
import { blockedReason } from '../../lib/mutationGuard'
import { nf } from '../../lib/format'
import { isAdmin, type Me } from '../../lib/roles'
import { useToastStore } from '../../store/toast.store'
import { Dialog } from '../ui/Dialog'
import { Button } from '../ui/Button'

/* Admin-only CSV category import — categoryImport() (index.html:5787-5900).

   Three safety properties are preserved:
     - the write is ATOMIC on the server (set_item_categories, all-or-none);
     - it takes TWO clicks (5881-5886). The first arms an explicit confirmation
       showing how many items will change; only the second sends the RPC;
     - ANY error row blocks the ENTIRE file (catImpCount, 5862-5876). The
       button stays disabled AND catImpApply() refuses independently, because
       the original explicitly does not trust button state alone against DOM
       tampering (5879-5884). Both barriers are ported. */

interface Props {
  items: ItemRow[]
  categories: string[]
  me: Me
  onDone: () => void
  onClose: () => void
}

type PreviewRow = CategoryPreviewRow

const PREVIEW_MAX = 300

export function CategoryImportDialog({ items, categories, me, onDone, onClose }: Props) {
  const show = useToastStore((s) => s.show)
  const [text, setText] = useState('')
  const [rows, setRows] = useState<PreviewRow[] | null>(null)
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)

  const admin = isAdmin(me)

  const classify = (source: string): PreviewRow[] =>
    classifyCategoryRows(source, items, categories)

  function preview() {
    setRows(classify(text))
    setConfirming(false)
  }

  /* A07: the original's CSV/TXT file input (index.html:5800-5805). */
  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    const rd = new FileReader()
    rd.onload = () => {
      const txt = String(rd.result).replace(/^﻿/, '')
      setText(txt)
      setRows(classify(txt))
      setConfirming(false)
    }
    rd.onerror = () => show('Fayl oxunmadı', true)
    rd.readAsText(f, 'utf-8')
  }

  const all = rows ?? []
  const ok = all.filter((r) => r.bucket === 'ok')
  const unset = all.filter((r) => r.bucket === 'unset')
  const errs = all.filter((r) => r.bucket === 'err')

  async function apply() {
    if (!admin) { show('Yalnız Admin kateqoriya idxal edə bilər', true); return }

    /* The second barrier (index.html:5883): even if the button were enabled
       by DOM tampering, an error row means the RPC is never called. */
    if (categoryImportBlocked(all)) {
      show('Səhv sətirlər var (' + nf(errs.length) + ') — əvvəlcə düzəldin', true)
      return
    }
    if (!ok.length) return

    /* First click arms; second click writes (index.html:5885-5890). */
    if (!confirming) { setConfirming(true); return }

    const blocked = blockedReason('item.category-import')
    if (blocked) { show(blocked, true); return }

    setBusy(true)
    const res = await setItemCategories(ok.map((r) => ({ code: r.code, category: r.cat })))
    setBusy(false)

    if (!res.ok) {
      show('Xəta: ' + (res.error ?? 'idxal alınmadı'), true)
      setConfirming(false)
      return
    }
    show(nf(res.updated) + ' malın kateqoriyası yeniləndi')
    onDone()
  }

  /* A non-admin never sees the form — the original refuses before opening it. */
  if (!admin) {
    return (
      <Dialog
        title="Kateqoriya idxalı (CSV) — yalnız Admin"
        onClose={onClose}
        footer={<><div style={{ flex: 1 }} /><Button variant="secondary" onClick={onClose}>Bağla</Button></>}
      >
        <div className="empty"><b>Yalnız Admin kateqoriya idxal edə bilər</b></div>
      </Dialog>
    )
  }

  /* catImpCount() — index.html:5862-5876. Errors win over everything. */
  const label = errs.length
    ? `Səhv sətirləri düzəldin (${nf(errs.length)})`
    : confirming
      ? `TƏSDİQ: ${nf(ok.length)} mal yazılacaq — yenidən klikləyin`
      : ok.length ? `Bazaya yaz (RPC): ${nf(ok.length)}` : 'Bazaya yaz (RPC)'

  const mini = (arr: PreviewRow[], withReason: boolean) => (
    <table>
      <thead>
        <tr>
          <th>Kod</th><th>Ad</th>
          {withReason && <><th>Kateqoriya</th><th>Səbəb</th></>}
        </tr>
      </thead>
      <tbody>
        {arr.slice(0, PREVIEW_MAX).map((r, i) => (
          <tr key={r.code + '-' + i}>
            <td><span className="code">{r.code}</span></td>
            <td><div className="nm">{r.name}</div></td>
            {withReason && <><td>{r.cat}</td><td><span className="tag t-rm">{r.reason}</span></td></>}
          </tr>
        ))}
      </tbody>
    </table>
  )

  return (
    <Dialog
      title="Kateqoriya idxalı (CSV) — yalnız Admin"
      onClose={onClose}
      footer={(
        <>
          <div style={{ flex: 1 }} />
          <Button variant="secondary" onClick={onClose}>İmtina</Button>
          <Button onClick={apply} disabled={busy || !!errs.length || !ok.length}>{label}</Button>
        </>
      )}
    >
      <p className="hint" style={{ marginTop: 0 }}>
        Nəzərdən keçirilmiş CSV-ni yapışdırın və ya faylı seçin. Sütunlar: <b>code</b> və{' '}
        <b>category</b> (və ya <b>proposed_category</b>). Sistem hər sətri yoxlayır; yalnız
        təsdiqinizdən sonra serverə (atomar RPC) yazılır — ya hamısı, ya heç biri.
        Kodların əvvəlindəki sıfırlar qorunur.
      </p>
      <label className="f">
        <span>CSV mətni</span>
        <textarea rows={7} aria-label="CSV mətni" value={text} onChange={(e) => setText(e.target.value)} />
      </label>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', margin: '6px 0' }}>
        <input
          type="file"
          aria-label="Fayl"
          accept=".csv,.txt"
          style={{ width: 'auto' }}
          onChange={onFile}
        />
        <div style={{ flex: 1 }} />
        <Button variant="secondary" onClick={preview}>Yoxla</Button>
      </div>

      {rows !== null && (rows.length === 0
        ? <div className="hint">Məlumat yoxdur.</div>
        : (
          <>
            {/* The original's three KPI tiles (index.html:5845-5850). */}
            <div className="kpis" style={{ margin: '8px 0' }}>
              <div className="kpi g">
                <div className="eyebrow">Yazılacaq (kateqoriyalı)</div>
                <div className="v">{nf(ok.length)}</div>
                <div className="s">təsdiqdən sonra RPC</div>
              </div>
              <div className="kpi">
                <div className="eyebrow">Təyin edilməyib</div>
                <div className="v">{nf(unset.length)}</div>
                <div className="s">yazılmır — əl ilə nəzərdən keçirin</div>
              </div>
              <div className={'kpi' + (errs.length ? ' r' : '')}>
                <div className="eyebrow">Səhv</div>
                <div className="v">{nf(errs.length)}</div>
                <div className="s">yazılmır</div>
              </div>
            </div>

            {errs.length > 0 && (
              <>
                <div className="hint" style={{ color: 'var(--alarm)', margin: '6px 0' }}>
                  <b>Səhv sətirlər (yazılmayacaq):</b>
                </div>
                {mini(errs, true)}
              </>
            )}
            {unset.length > 0 && (
              <>
                <div className="hint" style={{ margin: '10px 0 4px' }}>
                  <b>
                    Təyin edilməyib ({nf(unset.length)}) — yazılmayacaq, sonra əl ilə təsnif edin:
                  </b>
                </div>
                {mini(unset, false)}
              </>
            )}
          </>
        ))}
    </Dialog>
  )
}
