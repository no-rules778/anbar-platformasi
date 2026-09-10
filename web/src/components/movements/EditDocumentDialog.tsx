import { useEffect, useRef, useState } from 'react'
import { Dialog } from '../ui/Dialog'
import { Button } from '../ui/Button'
import { fetchDocumentEditImpact } from '../../api/documentEditImpact.api'
import {
  canEditDocument, readImpactContract, mapImpact, exportWarningOf,
  IMPACT_FAILED_PREFIX,
  type EditGateInput, type ImpactContract, type MappedEdit,
} from '../../lib/documentEdit'
import { nf } from '../../lib/format'

/* «Sənədi redaktə et» — Phase 8, milestone I-6 (`M8-33` … `M8-39`),
   ported from index.html:5124-5205.

   TWO MODALS, ONE COMPONENT: the not-editable BLOCK LIST and the editable
   CONFIRMATION. They are the same dialog in two states because the second is
   only reachable through the first's absence, and splitting them would
   duplicate the gate.

   NOTHING HERE WRITES. `document_edit_impact` is read-only, and confirming
   only loads the document into «Yeni əməliyyat» — the database is untouched
   until the admin presses «Düzəlişi qeyd et» on that screen. The confirmation
   says so, because it is the one fact an admin must not misunderstand.

   THE ASYNC RACE, and why the gate is re-run three times.

   Between the click and the response the user can be demoted, the document can
   be cancelled by someone else, the layer probe can go unknown, another
   document can enter edit mode, and the dialog can be closed or pointed at a
   different document. A response is therefore checked against the CURRENT
   world, not the one that dispatched it:

     1. before the RPC     — the button's own gate, re-read
     2. on arrival         — the gate again, plus a request-token check
     3. at confirmation    — the gate again, because the modal can stand open

   OBSOLETE RESPONSES ARE DISCARDED. Each request takes a monotonic token; a
   response whose token is not the latest, or which arrives after unmount, is
   dropped without touching state. Without that, a slow first response could
   overwrite a newer one and load the WRONG document into the form. */

export interface EditDocumentTarget {
  docNum: string
  isOrdinaryDoc: boolean
  isCancelledOrReversal: boolean
  /** The document's type, carried for the confirm callback. The impact
      response's own `type` is preferred when present. */
  type: string
}

interface Props {
  target: EditDocumentTarget
  /** Re-read on every render — the current session's role, never a capture. */
  isAdmin: boolean
  layerActive: boolean
  layerReady: boolean
  /** The document already in edit mode, if any (`M8-39`). */
  editDocNum: string | null
  /** Whether the form currently holds unsaved lines (the draft warning). */
  draftLineCount: number
  itemBy: Map<string, { name?: string | null; unit?: string | null }>
  onClose: () => void
  /** Store-then-navigate. Called ONLY from the confirm handler. */
  onConfirm: (mapped: MappedEdit, docNum: string, type: string) => void
  onToast: (text: string, isError?: boolean) => void
}

type Phase =
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'contract'; contract: ImpactContract }

export function EditDocumentDialog({
  target, isAdmin, layerActive, layerReady, editDocNum, draftLineCount,
  itemBy, onClose, onConfirm, onToast,
}: Props) {
  const [phase, setPhase] = useState<Phase>({ kind: 'loading' })
  /* Monotonic request token. Bumped per dispatch; a response carrying a stale
     token is ignored. `useRef` so a re-render never resets it. */
  const token = useRef(0)
  const alive = useRef(true)

  /* THE GATE INPUTS LIVE IN A REF, and this is load-bearing.

     A plain closure over the props would freeze them at the render that
     STARTED the effect, so CHECK 2 — which runs after an await — would re-read
     values that are already obsolete and permit an edit the current world
     refuses. That is precisely the race the check exists to catch, and it was
     observed: with another document entering edit mode mid-flight, the stale
     closure rendered the CONFIRMATION instead of the refusal.

     The ref is refreshed on EVERY render, so `gate()` always reads what is
     true now, whether it is called from the render pass, from the async body
     or from the confirm handler. */
  const gateInput = useRef<EditGateInput>({
    isAdmin,
    docNum: target.docNum,
    isOrdinaryDoc: target.isOrdinaryDoc,
    isCancelledOrReversal: target.isCancelledOrReversal,
    layerActive,
    layerReady,
    editDocNum,
  })
  gateInput.current = {
    isAdmin,
    docNum: target.docNum,
    isOrdinaryDoc: target.isOrdinaryDoc,
    isCancelledOrReversal: target.isCancelledOrReversal,
    layerActive,
    layerReady,
    editDocNum,
  }

  /** The gate, built from CURRENT values every time it is asked. */
  function gate(): ReturnType<typeof canEditDocument> {
    return canEditDocument(gateInput.current)
  }

  useEffect(() => {
    alive.current = true
    const mine = ++token.current
    setPhase({ kind: 'loading' })

    /* CHECK 1 — before the RPC. The dialog can be opened by a caller whose own
       gate passed a moment ago; conditions may already have changed. */
    const before = gate()
    if (!before.allowed) {
      setPhase({ kind: 'error', message: before.message })
      return
    }

    void (async () => {
      const res = await fetchDocumentEditImpact(target.docNum)
      /* Obsolete: unmounted, or a newer request superseded this one. */
      if (!alive.current || token.current !== mine) return

      /* CHECK 2 — on arrival. Role, document state, layer readiness and the
         edit session are ALL re-read here, against the current props. */
      const after = gate()
      if (!after.allowed) {
        setPhase({ kind: 'error', message: after.message })
        return
      }

      if (!res.ok) {
        /* The server's refusal, verbatim (legacy 5147) — never re-labelled
           as "empty" and never turned into a block list. */
        setPhase({ kind: 'error', message: IMPACT_FAILED_PREFIX + (res.error ?? 'server xətası') })
        return
      }
      setPhase({ kind: 'contract', contract: readImpactContract(res) })
    })()

    return () => { alive.current = false }
    /* Re-run when the TARGET changes. The gate inputs are re-read inside the
       async body and at confirmation, so they do not need to re-dispatch. */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target.docNum])

  function confirm(contract: Extract<ImpactContract, { kind: 'editable' }>) {
    /* CHECK 3 — at confirmation. The modal can stand open indefinitely. */
    const now = gate()
    if (!now.allowed) {
      onToast(now.message, true)
      onClose()
      return
    }
    const mapped = mapImpact(contract, itemBy)
    onConfirm(mapped, target.docNum, contract.type || target.type)
  }

  const closeFooter = (
    <>
      <div style={{ flex: 1 }} />
      <Button variant="secondary" onClick={onClose}>Bağla</Button>
    </>
  )

  if (phase.kind === 'loading') {
    return (
      <Dialog title={'Sənəd redaktəsi · ' + target.docNum} footer={closeFooter} onClose={onClose}>
        <div className="empty" data-testid="edit-loading"><b>Təsir yoxlanılır…</b></div>
      </Dialog>
    )
  }

  if (phase.kind === 'error') {
    return (
      <Dialog title={'Sənəd redaktə edilmədi · ' + target.docNum} footer={closeFooter} onClose={onClose}>
        <div
          className="hint"
          data-testid="edit-error"
          style={{ padding: 9, background: 'var(--out-l)', borderRadius: 4 }}
        >
          {phase.message}
        </div>
      </Dialog>
    )
  }

  const c = phase.contract

  if (c.kind === 'malformed') {
    return (
      <Dialog title={'Sənəd redaktə edilmədi · ' + target.docNum} footer={closeFooter} onClose={onClose}>
        <div
          className="hint"
          data-testid="edit-error"
          style={{ padding: 9, background: 'var(--out-l)', borderRadius: 4 }}
        >
          {c.message}
        </div>
      </Dialog>
    )
  }

  if (c.kind === 'blocked') {
    /* index.html:5152-5168 — the reasons, in a table, and nothing else. */
    return (
      <Dialog
        title={'Sənəd redaktə edilə bilməz · ' + target.docNum}
        footer={closeFooter}
        onClose={onClose}
      >
        <div className="hint" style={{ marginBottom: 10 }}>
          Bu sənədə əsaslanan sonrakı əməliyyatlar var və ya sənədin özü redaktəyə uyğun
          deyil. Düzəliş üçün əvvəlcə aşağıdakıları həll edin, ya da sənədi bütövlükdə
          ləğv edib yenisini yazın.
        </div>
        <div className="card">
          <div className="tw">
            <table data-testid="edit-blocks">
              <thead><tr><th>Səbəb</th></tr></thead>
              <tbody>
                {c.blocks.map((b, i) => (
                  <tr key={i}><td>{b.message || b.code || '—'}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Dialog>
    )
  }

  /* EDITABLE — the confirmation (index.html:5170-5190). */
  return (
    <Dialog
      title={'Sənəd redaktə edilsin? · ' + target.docNum}
      footer={
        <>
          <div style={{ flex: 1 }} />
          <Button variant="secondary" onClick={onClose}>İmtina</Button>
          <Button variant="primary" data-testid="de-go" onClick={() => confirm(c)}>
            Bəli, redaktəyə keç
          </Button>
        </>
      }
      onClose={onClose}
    >
      <div className="hint" style={{ marginBottom: 10 }}>
        {nf(c.lines.length)} sətir «Yeni əməliyyat» formasına yüklənəcək.{' '}
        <b>Bazada heç nə dəyişməyəcək</b> — köhnə sənəd yalnız siz «Düzəlişi qeyd et»
        basdığınız anda, yeni sənədlə eyni tranzaksiyada ləğv olunacaq.
      </div>

      {/* THE DRAFT WARNING (I-6 decision). Entering edit mode REPLACES the
          lines currently in the form. Legacy does this silently; here the
          admin is told before it happens, and «İmtina» keeps the draft
          untouched — nothing is discarded until «Bəli» is pressed. */}
      {draftLineCount > 0 && (
        <div
          className="hint"
          data-testid="edit-draft-warning"
          style={{ padding: 9, background: 'var(--out-l)', borderRadius: 4, marginBottom: 10 }}
        >
          Formada qeyd edilməmiş <b>{nf(draftLineCount)} sətir</b> var və bu sətirlər
          sənədin sətirləri ilə ƏVƏZ OLUNACAQ. İmtina etsəniz, mövcud sətirlər olduğu
          kimi qalır.
        </div>
      )}

      <div className="hint" style={{ padding: 9, background: 'var(--out-l)', borderRadius: 4 }}>
        {exportWarningOf(c.exportWarning)}
      </div>
    </Dialog>
  )
}
