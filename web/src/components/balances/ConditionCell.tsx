import { useEffect, useRef, useState, type KeyboardEvent, type MouseEvent } from 'react'
import { nf } from '../../lib/format'
import type { CondKey } from '../../lib/condSplit'

/* One condition-marker cell of the balance table — the `condCell` renderer
   (index.html:2349-2354) and the inline editor `condEditStart()` (2380-2410).

   READ SIDE (every role):
     M9-44  a marker of 0 renders a muted em-dash, never `0`;
     M9-93  a user without edit rights sees the same number as plain text.

   WRITE SIDE (admin / anbardar, decided by the caller via `canEdit`):
     M9-94  `<input type="number" min="0" step="0.01">`, pre-filled only when
            the value is > 0; Enter and blur COMMIT, Escape CANCELS;
     M9-95  clicking the cell or its input does not open the item card
            (`stopPropagation`);
     M9-135 the `done` latch — Enter followed by the blur it causes sends ONE
            commit, never two.

   D-J3 — MID-EDIT REFRESH (owner-approved, M9-134 / M9-134a / M9-134b):
     Legacy holds the editor in transient DOM and `rBal()` rebuilds the whole
     table, so a realtime `renderAll()` CAN discard an in-progress input. Here
     the draft is component state: a new `value` prop (a refreshed snapshot)
     re-renders the surrounding row while THIS cell keeps the user's
     uncommitted input. Escape then shows the LATEST `value`, not the
     pre-edit one, because the display always reads the prop. The commit
     PAYLOAD is composed by the caller from the latest snapshot at commit time
     (M9-134b) — this component only hands over the raw string it holds.

   The cell never formats a `value` it did not receive: after a commit it
   shows «…» while `pending` is true and then whatever the store now holds —
   the server-confirmed value on success, the previous value on failure
   (M9-104, M9-105). No optimistic value is ever rendered. */

export interface ConditionCellProps {
  warehouse: string
  code: string
  condKey: CondKey
  /** The column title — the tooltip prefix (2352). */
  title: string
  /** The LATEST snapshot value for this cell — the display source. */
  value: number
  /** `canEditCond(b.w)` — decided by the caller. */
  canEdit: boolean
  /** True while a commit for THIS cell is in flight (the legacy «…»). */
  pending: boolean
  /** Receives the RAW input string exactly once per edit session. */
  onCommit: (raw: string) => void
}

export function ConditionCell({
  warehouse, code, condKey, title, value, canEdit, pending, onCommit,
}: ConditionCellProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  /* The legacy `done` latch (2393-2394): the first finish wins, whether it
     came from Enter, blur or Escape; everything after it is ignored until a
     new edit session starts. A ref, not state — it must take effect on the
     very next synchronous event, before React re-renders. */
  const doneRef = useRef(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus()
      inputRef.current?.select()
    }
  }, [editing])

  /* Losing edit rights (a role/warehouse change under a refresh) ends any
     open session without committing — there is no longer anyone to commit as.
     Adjusted DURING render (React's "adjusting state when a prop changes"
     pattern), not in an effect: an effect would first paint the editor for a
     user who may no longer edit and then re-render, and oxlint flags that
     cascade (react/set-state-in-effect). Here the corrected state applies
     before anything is committed to the DOM. */
  if (!canEdit && editing) setEditing(false)

  const display = value > 0 ? nf(value, 2) : <span className="muted">—</span>

  if (pending) return <span data-cond-pending={`${warehouse}|${code}|${condKey}`}>…</span>

  if (!canEdit) return <>{display}</>

  function start(ev: MouseEvent) {
    ev.stopPropagation()
    if (editing) return
    doneRef.current = false
    /* Pre-filled ONLY when > 0 (2387), from the value at edit START — the
       pre-edit baseline the user is editing from. */
    setDraft(value > 0 ? String(value) : '')
    setEditing(true)
  }

  function finish(commit: boolean) {
    if (doneRef.current) return
    doneRef.current = true
    const raw = draft
    setEditing(false)
    /* Cancel shows the LATEST value (the display reads `value`) — M9-134a. */
    if (commit) onCommit(raw)
  }

  function onKeyDown(ev: KeyboardEvent<HTMLInputElement>) {
    if (ev.key === 'Enter') { ev.preventDefault(); finish(true) }
    else if (ev.key === 'Escape') { ev.preventDefault(); finish(false) }
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        type="number"
        min={0}
        step={0.01}
        value={draft}
        aria-label={`${title} — ${warehouse} ${code}`}
        data-cond-editor={`${warehouse}|${code}|${condKey}`}
        style={{ width: 76, padding: '2px 4px', font: 'inherit', textAlign: 'right' }}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={onKeyDown}
        onBlur={() => finish(true)}
        onClick={(e) => e.stopPropagation()}
      />
    )
  }

  return (
    <span
      className="cond-ed"
      role="button"
      tabIndex={0}
      data-cond-cell={`${warehouse}|${code}|${condKey}`}
      title={`${title} — dəyişmək üçün klikləyin`}
      style={{ cursor: 'pointer' }}
      onClick={start}
    >
      {display}
    </span>
  )
}
