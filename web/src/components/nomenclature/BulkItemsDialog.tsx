import { useMemo, useState } from 'react'
import type { ItemRow } from '../../api/items.api'
import { createItem, updateItem } from '../../api/itemWrite.api'
import { parseItemList, type BulkRow } from '../../lib/bulkItemParse'
import { blockedReason } from '../../lib/mutationGuard'
import { nf } from '../../lib/format'
import type { Me } from '../../lib/roles'
import { useToastStore } from '../../store/toast.store'
import { Dialog } from '../ui/Dialog'
import { Button } from '../ui/Button'

/* Bulk nomenclature paste — bulkItems() (index.html:5718-5762).

   THE APPLY LOOP IS NOT ATOMIC. The original calls emitMany() (1155-1159),
   which awaits one emit() per row in sequence; a failure part-way through
   leaves every earlier row already written. That is the production behaviour
   and it is preserved here deliberately (registry R-F6) — do not wrap it in a
   transaction or present it as all-or-none. The result message therefore
   reports what actually landed, including a partial run. */

interface Props {
  items: ItemRow[]
  units: string[]
  me: Me
  onDone: () => void
  onClose: () => void
}

const TAG: Record<string, string> = {
  new: 'yeni', upd: 'yenilənir', dup: 'bazada var', rep: 'təkrar', err: 'səhv',
}

/** The preview cap — index.html:5710. Rows beyond it are still applied. */
const PREVIEW_MAX = 250

export function BulkItemsDialog({ items, units, me, onDone, onClose }: Props) {
  const show = useToastStore((s) => s.show)
  const [text, setText] = useState('')
  const [updateExisting, setUpdateExisting] = useState(false)
  const [rows, setRows] = useState<BulkRow[] | null>(null)
  const [busy, setBusy] = useState(false)

  const itemBy = useMemo(() => new Map(items.map((i) => [i.code, i])), [items])

  function build(source: string, upd: boolean): BulkRow[] {
    return parseItemList(source, { items, allowedUnits: units, updateExisting: upd })
  }

  function preview() { setRows(build(text, updateExisting)) }

  /* A05: per-row checkboxes (index.html:5706-5711). `err` rows are locked
     off; every other row the user may include or exclude by hand. */
  function toggle(n: number, use: boolean) {
    setRows((prev) => prev && prev.map((r) => (r.n === n ? { ...r, use } : r)))
  }

  /* A06: the original re-runs bulkPreview() when this checkbox changes and a
     preview already exists (index.html:5740). Without it the stale preview
     keeps `upd` rows the new setting would no longer produce, and the apply
     would still write them. */
  function changeUpdateExisting(v: boolean) {
    setUpdateExisting(v)
    if (rows !== null) setRows(build(text, v))
  }

  /* A07: the original's CSV/TXT/TSV file input (index.html:5742-5747) —
     read as UTF-8, BOM stripped, and previewed automatically. */
  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    const rd = new FileReader()
    rd.onload = () => {
      const txt = String(rd.result).replace(/^﻿/, '')
      setText(txt)
      setRows(build(txt, updateExisting))
    }
    rd.onerror = () => show('Fayl oxunmadı', true)
    rd.readAsText(f, 'utf-8')
  }

  const applicable = (rows ?? []).filter((r) => r.use && r.st !== 'err')

  async function apply() {
    if (!applicable.length) return
    const blocked = blockedReason('item.bulk')
    if (blocked) { show(blocked, true); return }

    setBusy(true)
    let added = 0
    let updated = 0
    let failed = 0
    let failure: string | null = null

    /* Sequential, one row at a time — emitMany()'s shape exactly. */
    for (const r of applicable) {
      /* A01: an omitted price must NOT erase the stored one. The original
         sends `r.price || (r.st === 'upd' ? existing.price || 0 : 0)`
         (index.html:5754) — on an update with no pasted price the item keeps
         the price it already has; on a create the fallback is 0. */
      const price = r.price || (r.st === 'upd' ? (itemBy.get(r.code)?.price ?? 0) : 0)
      const res = r.st === 'upd'
        ? await updateItem({ code: r.code, name: r.name, unit: r.unit, price })
        : await createItem({ code: r.code, name: r.name, unit: r.unit, price }, me.sbId)
      if (res.ok) {
        if (r.st === 'upd') updated++; else added++
      } else {
        failed++
        if (!failure) failure = res.error
      }
    }
    setBusy(false)

    if (failed) {
      /* Honest partial report: earlier rows really were written. */
      show(
        `${nf(added)} əlavə, ${nf(updated)} yeniləndi, ${nf(failed)} sətir alınmadı`
        + (failure ? ': ' + failure : ''),
        true,
      )
    } else {
      show(nf(added) + ' yeni mal əlavə edildi' + (updated ? ', ' + nf(updated) + ' mal yeniləndi' : ''))
    }
    onDone()
  }

  return (
    <Dialog
      title="Nomenklatura siyahısının toplu əlavəsi"
      onClose={onClose}
      footer={(
        <>
          <div style={{ flex: 1 }} />
          <Button variant="secondary" onClick={onClose}>İmtina</Button>
          {/* bulkCount() (index.html:5714-5718) puts the row count in the label. */}
          <Button onClick={apply} disabled={busy || !applicable.length}>
            {applicable.length ? `Bazaya yaz (${nf(applicable.length)} sətir)` : 'Bazaya yaz'}
          </Button>
        </>
      )}
    >
      <p className="hint" style={{ marginTop: 0 }}>
        Excel-dən sütunları seçib kopyalayın və aşağıya yapışdırın. Sistem sətirləri yoxlayacaq,
        təkrarları tapacaq və yalnız təsdiqlədiyiniz sətirləri bazaya yazacaq.
      </p>
      <label className="f">
        <span>Sətirlər</span>
        <textarea
          rows={7}
          aria-label="Sətirlər"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
      </label>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', margin: '6px 0' }}>
        <input
          type="file"
          aria-label="Fayl"
          accept=".csv,.txt,.tsv"
          style={{ width: 'auto' }}
          onChange={onFile}
        />
        <label>
          <input
            type="checkbox"
            aria-label="Mövcudları yenilə"
            checked={updateExisting}
            onChange={(e) => changeUpdateExisting(e.target.checked)}
          /> Mövcudları yenilə
        </label>
        <div style={{ flex: 1 }} />
        <Button variant="secondary" onClick={preview}>Yoxla</Button>
      </div>

      {rows !== null && (rows.length === 0
        ? <div className="empty"><b>Sətir tapılmadı</b>Mətni yapışdırın və yenidən yoxlayın.</div>
        : (
          <>
            <table>
              <thead>
                <tr>
                  <th> </th><th>#</th><th>Kod</th><th>Ad</th><th>Ölçü</th>
                  <th>Qiymət</th><th>Status</th><th>Qeyd</th>
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
                        disabled={r.st === 'err'}
                        style={{ width: 'auto' }}
                        onChange={(e) => toggle(r.n, e.target.checked)}
                      />
                    </td>
                    <td>{r.n}</td>
                    <td>
                      {r.code || '—'}
                      {r.auto && <span className="hint"> avto</span>}
                    </td>
                    <td>{r.name}</td><td>{r.unit}</td>
                    <td>{r.price ? nf(r.price, 2) : '—'}</td>
                    <td>{TAG[r.st]}</td><td>{r.msg}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {/* index.html:5710 — the preview is capped, the write is not. */}
            {rows.length > PREVIEW_MAX && (
              <div className="pad hint">
                İlk {nf(PREVIEW_MAX)} sətir göstərilir, yüklənmə bütün {nf(rows.length)} sətrə tətbiq olunacaq.
              </div>
            )}
          </>
        ))}
    </Dialog>
  )
}
