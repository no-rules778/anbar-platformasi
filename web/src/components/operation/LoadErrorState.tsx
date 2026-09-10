import { LOAD_FAILED_TITLE } from '../../lib/opReadiness'

/* A failed INITIAL core load — M7-S1. No form, no lines table, no calculated
   row count: rendering «Nəticə yoxdur» here would state a fact the platform
   does not have, exactly the Phase 6 A01 lesson this component exists to
   avoid repeating. A failed REFRESH after a good load is a DIFFERENT state —
   the page keeps rendering the form and shows the error in its own footer
   instead (M7-S6); this component is for the "nothing has ever loaded" case
   only. */
interface Props {
  error: string | null
}

export function LoadErrorState({ error }: Props) {
  return (
    <div className="card">
      <div className="empty">
        <b>{LOAD_FAILED_TITLE}</b>
        {error}
      </div>
    </div>
  )
}
