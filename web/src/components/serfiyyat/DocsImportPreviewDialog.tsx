import { useState } from 'react'
import { fmtD, money, nf } from '../../lib/format'
import { groupTotal, type DocsImportGroup } from '../../lib/serfiyyatImport'
import { createSerfiyyatDocument } from '../../api/serfiyyatDocuments.api'
import { useToastStore } from '../../store/toast.store'
import { Button } from '../ui/Button'
import { Dialog } from '../ui/Dialog'

/* The document-import preview — smPreviewDocsImport() (index.html:6477-6491)
   and smConfirmDocsImport() (6494-6512).

   NOTHING IS WRITTEN SILENTLY (M13-69): every parsed group and every rejected
   row is listed first, and only «Təsdiqlə və yarat» issues any RPC.

   THE LOOP IS NOT ATOMIC ACROSS GROUPS (M13-70, D-N3). Each document is
   atomic in its OWN transaction, so a mid-loop failure leaves every earlier
   document permanently created — they are not rolled back. That is legacy
   behaviour, kept deliberately: making it atomic would need a new server RPC,
   a SQL change this phase does not propose. The summary says so in the UI. */

interface Props {
  groups: DocsImportGroup[]
  errors: string[]
  onClose: () => void
  onDone: () => void | Promise<void>
}

export function DocsImportPreviewDialog({ groups, errors, onClose, onDone }: Props) {
  const show = useToastStore((s) => s.show)
  const [busy, setBusy] = useState(false)

  const totalLines = groups.reduce((s, g) => s + g.lines.length, 0)

  async function confirm() {
    setBusy(true)
    let ok = 0
    const fail: string[] = []
    /* One RPC per group, sequentially, tallying both outcomes (6496-6507). */
    for (const g of groups) {
      const res = await createSerfiyyatDocument({
        projectId: g.projectId, docDate: g.date, kontragent: g.kontragent,
        avtomobil: g.avto, kanal: g.kanal, invoiceNum: g.iv, note: g.note,
        lines: g.lines.map((l) => ({ code: l.code, qty: l.qty, price: l.price })),
      })
      if (!res.ok) fail.push(g.projectName + ' (' + g.date + '): ' + (res.error || 'server xətası'))
      else ok++
    }
    setBusy(false)
    show(
      nf(ok) + ' sənəd yaradıldı' + (fail.length ? ', ' + nf(fail.length) + ' xəta ilə (konsola bax)' : ''),
      !!fail.length,
    )
    if (fail.length) console.warn('smConfirmDocsImport xətalar:', fail)
    await onDone()
  }

  return (
    <Dialog
      title="Excel-dən sənəd idxalı — yoxlama"
      onClose={onClose}
      footer={<>
        <Button variant="secondary" onClick={onClose}>İmtina</Button>
        <div style={{ flex: 1 }} />
        {/* M13-69 — DISABLED when no group parsed. */}
        <Button
          data-testid="sm-import-go" disabled={!groups.length || busy}
          onClick={() => void confirm()}
        >
          {'Təsdiqlə və yarat (' + nf(groups.length) + ' sənəd)'}
        </Button>
      </>}
    >
      <p className="hint" data-testid="sm-import-summary">
        {nf(groups.length)} sənəd yaradılacaq, {nf(totalLines)} sətir.
        {errors.length ? ' ' + nf(errors.length) + ' sətir rədd edildi (aşağıda).' : ''}
      </p>

      {groups.length > 0 && (
        <div style={{ maxHeight: 320, overflow: 'auto' }}>
          <table data-testid="sm-import-groups">
            <thead><tr>
              <th>Layihə</th><th>Tarix</th><th>Kontragent</th><th>Avtomobil</th>
              <th>Kanal</th><th>Qaimə №</th><th>Sətir</th><th>Cəm</th>
            </tr></thead>
            <tbody>
              {groups.map((g, i) => (
                <tr key={i}>
                  <td>{g.projectName}</td>
                  <td>{fmtD(g.date)}</td>
                  <td>{g.kontragent}</td>
                  <td>{g.avto}</td>
                  <td>{g.kanal}</td>
                  <td className="code">{g.iv}</td>
                  <td>{nf(g.lines.length)}</td>
                  <td>{money(groupTotal(g))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {errors.length > 0 && (
        <p
          className="hint" data-testid="sm-import-errors"
          style={{ color: 'var(--alarm)', marginTop: 8, whiteSpace: 'pre-line' }}
        >
          {errors.join('\n')}
        </p>
      )}

      {/* D-N3 stated in the UI, as the decision requires. */}
      {groups.length > 1 && (
        <p className="hint" data-testid="sm-import-atomicity" style={{ marginTop: 8 }}>
          Hər sənəd ayrıca yaradılır: ortada xəta olsa, ondan əvvəlkilər yaradılmış qalır.
        </p>
      )}
    </Dialog>
  )
}
