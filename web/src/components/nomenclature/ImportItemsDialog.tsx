import { useState } from 'react'
import * as XLSX from 'xlsx'
import type { ItemRow } from '../../api/items.api'
import { importNewItems } from '../../api/importNewItems.api'
import {
  classifyNewRecords, extractNewRecords, parseNewText, recomputePredictedCodes,
  type ImportPreviewRow,
} from '../../lib/importItemParse'
import { blockedReason } from '../../lib/mutationGuard'
import { nf } from '../../lib/format'
import { useToastStore } from '../../store/toast.store'
import { Dialog } from '../ui/Dialog'
import { Button } from '../ui/Button'

/* Excel import of NEW items — importNewItems() / niImport()
   (index.html:6095-6171).

   Only new items are created: an exact name match is reported and skipped,
   never updated. No price is imported at all, and the real codes come from
   the server's import_new_items RPC — the preview's codes are predictions. */

interface Props {
  items: ItemRow[]
  onDone: () => void
  onClose: () => void
}

const TAG: Record<string, string> = { new: 'yeni', sim: 'oxşar', dup: 'bazada var', err: 'səhv' }

/** The preview cap — index.html:6079. Rows beyond it are still imported. */
const PREVIEW_MAX = 250

export function ImportItemsDialog({ items, onDone, onClose }: Props) {
  const show = useToastStore((s) => s.show)
  const [text, setText] = useState('')
  const [rows, setRows] = useState<ImportPreviewRow[] | null>(null)
  const [busy, setBusy] = useState(false)

  function previewText() {
    setRows(text.trim().length ? classifyNewRecords(extractNewRecords(parseNewText(text)), items) : [])
  }

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    const isXlsx = /\.(xlsx|xls)$/i.test(f.name)
    const rd = new FileReader()
    rd.onload = () => {
      try {
        if (isXlsx) {
          const wb = XLSX.read(rd.result as ArrayBuffer, { type: 'array' })
          const ws = wb.Sheets[wb.SheetNames[0]]
          const rows2d = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', raw: false }) as unknown[][]
          setRows(classifyNewRecords(extractNewRecords(rows2d), items))
        } else {
          const txt = String(rd.result).replace(/^﻿/, '')
          setText(txt)
          setRows(classifyNewRecords(extractNewRecords(parseNewText(txt)), items))
        }
      } catch (err) {
        show('Fayl oxunmadı: ' + (err instanceof Error ? err.message : ''), true)
      }
    }
    if (isXlsx) rd.readAsArrayBuffer(f); else rd.readAsText(f, 'utf-8')
  }

  /* A05: per-row checkboxes (index.html:6072-6075). `err` and `dup` rows are
     locked off; selecting or deselecting anything else re-derives the code
     predictions, because the sequence must stay contiguous over the rows that
     are actually going to be created. */
  function toggle(n: number, use: boolean) {
    setRows((prev) => prev && recomputePredictedCodes(
      prev.map((r) => (r.n === n ? { ...r, use } : { ...r })),
      items,
    ))
  }

  /* Only `new` and `sim` rows are ever sent (index.html:6096). */
  const applicable = (rows ?? []).filter((r) => r.use && (r.st === 'new' || r.st === 'sim'))
  /* A03/I-14: ANY malformed row blocks the whole file — niCount()
     (index.html:6086-6094) disables the button whenever `errs > 0`, however
     many valid rows sit beside them. */
  const errs = (rows ?? []).filter((r) => r.st === 'err')

  async function apply() {
    /* Second barrier, mirroring the category import's: the handler refuses
       independently of the button's disabled state. */
    if (errs.length) {
      show('Səhv sətirlər var (' + nf(errs.length) + ') — əvvəlcə düzəldin', true)
      return
    }
    if (!applicable.length) return
    const blocked = blockedReason('item.import')
    if (blocked) { show(blocked, true); return }

    setBusy(true)
    const res = await importNewItems(applicable.map((r) => ({ name: r.name, unit: r.unit })))
    setBusy(false)

    if (!res.ok) { show('Xəta: ' + (res.error ?? 'idxal alınmadı'), true); return }
    show(
      nf(res.created.length) + ' yeni mal yaradıldı'
      + (res.skipped.length ? ', ' + nf(res.skipped.length) + ' sətir ötürüldü' : ''),
    )
    onDone()
  }

  return (
    <Dialog
      title="Excel-dən yeni mallar idxalı"
      onClose={onClose}
      footer={(
        <>
          <div style={{ flex: 1 }} />
          <Button variant="secondary" onClick={onClose}>İmtina</Button>
          {/* niCount() (index.html:6086-6094) — the error count replaces the
              label outright when the file has any malformed row. */}
          <Button onClick={apply} disabled={busy || !!errs.length || !applicable.length}>
            {errs.length
              ? `Səhv sətirləri düzəldin (${nf(errs.length)})`
              : applicable.length
                ? `Yeni malları yarat (${nf(applicable.length)})`
                : 'Yeni malları yarat'}
          </Button>
        </>
      )}
    >
      <p className="hint" style={{ marginTop: 0 }}>
        Yalnız <b>yeni</b> mallar yaradılır. Mövcud malların adı, ölçüsü və qiyməti dəyişdirilmir.
        Qiymət bu idxalda alınmır.
      </p>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 8 }}>
        <input
          type="file"
          aria-label="Fayl"
          accept=".xlsx,.xls,.csv,.tsv,.txt"
          style={{ width: 'auto' }}
          onChange={onFile}
        />
      </div>
      <label className="f">
        <span>Və ya Excel-dən yapışdırın (birinci sətir başlıq ola bilər)</span>
        <textarea rows={6} aria-label="Sətirlər" value={text} onChange={(e) => setText(e.target.value)} />
      </label>
      <div style={{ display: 'flex', gap: 10, margin: '6px 0' }}>
        <div style={{ flex: 1 }} />
        <Button variant="secondary" onClick={previewText}>Yoxla</Button>
      </div>

      {rows !== null && (rows.length === 0
        ? <div className="empty"><b>Sətir tapılmadı</b>Mətni yapışdırın və yenidən yoxlayın.</div>
        : (
          <>
            <table>
              <thead>
                <tr>
                  <th> </th><th>#</th><th>Kod (proqnoz)</th><th>Ad</th>
                  <th>Ölçü</th><th>Status</th><th>Qeyd</th>
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, PREVIEW_MAX).map((r) => (
                  <tr key={r.n}>
                    <td>
                      <input
                        type="checkbox"
                        aria-label={`Sətir ${r.n}`}
                        checked={r.use}
                        disabled={r.st === 'err' || r.st === 'dup'}
                        style={{ width: 'auto' }}
                        onChange={(e) => toggle(r.n, e.target.checked)}
                      />
                    </td>
                    <td>{r.n}</td>
                    <td>{r.predCode ?? <span className="muted">—</span>}</td>
                    <td>{r.name}</td><td>{r.unit}</td>
                    <td>{TAG[r.st]}</td><td>{r.msg}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {/* index.html:6079 — the preview is capped, the import is not. */}
            {rows.length > PREVIEW_MAX && (
              <div className="pad hint">
                İlk {nf(PREVIEW_MAX)} sətir göstərilir, idxal bütün sətirlərə tətbiq olunur.
              </div>
            )}
            <div className="hint" style={{ marginTop: 6 }}>
              Son kodlar yazılma anında server tərəfindən verilir. Yuxarıdakı kodlar yalnız proqnozdur.
            </div>
          </>
        ))}
    </Dialog>
  )
}
