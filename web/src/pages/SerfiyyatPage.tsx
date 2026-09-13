import { useEffect } from 'react'
import type { Me } from '../lib/roles'
import { useSerfiyyatStore } from '../store/serfiyyat.store'
import { useRealtimeRefresh } from '../hooks/useRealtimeRefresh'
import { DocumentForm } from '../components/serfiyyat/DocumentForm'
import { ReportView } from '../components/serfiyyat/ReportView'

/* «Sərfiyyat Materialları» — the legacy `p-sm` shell (index.html:382-390) and
   rSm() (6230-6246).

   The page writes NO `movements` row (M13-95). Its documents cannot reach
   balances, the item index, the movements register or any stock export, and
   that structural isolation is the module's entire design premise: nothing
   here routes a row through a movement primitive.

   D-N5 (owner-approved IMPROVEMENT, not parity): legacy's fixed realtime list
   (1174) is `movements, items, partners, warehouses` and contains NO
   `serfiyyat_*` table, so another user's document did not appear until a
   manual reload. Here both document tables are watched. */

/** M13-19 — the D-N5 improvement's table set. */
const WATCHED = ['serfiyyat_documents', 'serfiyyat_lines'] as const

/** index.html:384-387 — exactly two buttons, in this fixed order (M13-16). */
export const SM_SEGMENTS: { value: 'doc' | 'rep'; label: string }[] = [
  { value: 'doc', label: 'Yeni sənəd' },
  { value: 'rep', label: 'Hesabat' },
]

/** index.html:383 — FIXED for every role; this page has no role variant (M13-04). */
export const SM_SUBTITLE =
  'Layihə üzrə dərhal istifadə olunan tikinti materialları — anbar qalığına təsir etmir.'

interface Props {
  me: Me
}

export function SerfiyyatPage({ me }: Props) {
  const { ready, loading, loaded, error, tab, setTab, load } = useSerfiyyatStore()

  useEffect(() => { void load() }, [load])
  useRealtimeRefresh(true, WATCHED, () => { void load() })

  return <>
    <div className="phead">
      <div>
        <h2>Sərfiyyat Materialları</h2>
        <p data-testid="sm-sub">{SM_SUBTITLE}</p>
      </div>
      <div className="sp" />
      <div className="seg" data-testid="sm-seg">
        {SM_SEGMENTS.map((s) => (
          <button
            key={s.value}
            className={tab === s.value ? 'on' : undefined}
            onClick={() => setTab(s.value)}
          >
            {s.label}
          </button>
        ))}
      </div>
    </div>

    {loading && !loaded && (
      <div className="empty" data-testid="sm-loading">
        <b>Yüklənir…</b>Sərfiyyat sənədləri Supabase-dən oxunur.
      </div>
    )}

    {/* M13-13/M13-14 — an INITIAL failure shows the load error and no page
        body; a failed REFRESH keeps the previous complete snapshot and only
        flags it. A failed read is never applied as a successful empty list. */}
    {error && !loaded && (
      <div className="empty" data-testid="sm-load-error"><b>Yükləmə xətası</b>{error}</div>
    )}
    {error && loaded && (
      <div className="hint" data-testid="sm-refresh-error">
        <span className="tag t-rm">Yenilənmədi</span> {error}
      </div>
    )}

    {/* M13-10 — the readiness gate. When any of the three core reads failed
        the WHOLE body is one hint: no form, no report. */}
    {loaded && !ready && (
      <div className="card"><div className="pad hint" data-testid="sm-not-ready">
        Sərfiyyat Materialları hələ aktiv deyil: sql/032 migrasiyası Supabase-ə tətbiq edilməyib.
      </div></div>
    )}

    {loaded && ready && (
      <div data-testid="sm-out">
        {tab === 'rep' ? <ReportView me={me} /> : <DocumentForm me={me} />}
      </div>
    )}
  </>
}
