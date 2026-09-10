import { useEffect, useMemo, useState } from 'react'
import { flushSync } from 'react-dom'
import { useAuditLogStore } from '../store/auditLog.store'
import { AUDIT_PAGE_SIZE, type AuditRow } from '../api/auditLog.api'
import { auditSummary } from '../lib/auditSummary'
import { Table, Thead, Th, Td } from '../components/ui/Table'
import { Button } from '../components/ui/Button'
import { PrintHead } from '../components/PrintHead'

/* AUDIT_TABLE_LABEL (index.html:7061-7067). The set of tables audit_log
   actually records is closed — SQL 011's manage_reference() writes here for
   warehouses/reference_values, and movements/partners already had a trigger.
   No other table appears, so this map is not meant to be exhaustive of the
   schema, only of what audit_log contains. */
const AUDIT_TABLE_LABEL: Record<string, string> = {
  movements: 'Mal hərəkəti',
  partners: 'Kontragent',
  warehouses: 'Anbar / ünvan',
  reference_values: 'Soraqça dəyəri',
}

/** AUDIT_ACTION_LABEL (index.html:7068). */
const AUDIT_ACTION_LABEL: Record<string, string> = { INSERT: 'əlavə', UPDATE: 'düzəliş', DELETE: 'silinmə' }

function actionTagClass(action: string | null): string {
  return action === 'DELETE' ? 't-rm' : action === 'UPDATE' ? 't-out' : 't-in'
}

/* auditActor (index.html:7074-7077): a resolved email, else the raw id; a
   null user_id reads as a system action. Never falls back to users.name. */
function actorLabel(userId: string | null, emails: Map<string, string>): string {
  if (!userId) return 'Sistem/naməlum'
  return emails.get(userId) || userId
}

interface Props {
  /** The signed-in user — only the display name, for the print header. */
  me: { name: string }
  /* Injectable clock, defaulting to the real one. The print stamp must be
     taken at click time, and a test has to be able to open the page at one
     time and print at another without replacing the global clock. */
  now?: () => Date
}

export function AuditLogPage({ me, now = () => new Date() }: Props) {
  const {
    filters, rows, total, loading, error, errorKind, emails, directoryError,
    setFilters, setPage, reset, load,
  } = useAuditLogStore()

  /* Rows are re-read on every visit — the original's rLog() runs whenever the
     page is opened (index.html:7134). The user DIRECTORY is not: App loads it
     once at authenticated boot (loadAuditUsers, 7516), and refetching it here
     would let a transient failure on a revisit replace an already-good map
     with an empty one, silently downgrading every actor to a raw id. */
  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /* null until the user prints: the sheet carries no timestamp before there
     has been a print run to date, matching the original's empty #printhead. */
  const [printedAt, setPrintedAt] = useState<Date | null>(null)

  /* logFilters' actor list (index.html:7080-7081): sorted by email, falling
     back to id when the email is empty, using locale compare. */
  const actorOptions = useMemo(
    () => Array.from(emails.entries()).sort((a, b) => (a[1] || a[0]).localeCompare(b[1] || b[0])),
    [emails],
  )

  /* «Çap» — index.html:7167: `printHead('Audit jurnalı', ''); setTimeout(() =>
     window.print(), 60)`. Two things matter and both are reproduced here.

     First, the ORDER: the header is stamped, then the sheet is printed. The
     original evaluates `new Date()` inside printHead, at click time, so the
     sheet is dated when it was printed. Rendering the stamp instead would date
     it to when the page was opened — on a tab left open overnight, the printed
     date would be yesterday's.

     Second, the header must be in the DOM BEFORE window.print() reads it: the
     original buys that with a 60ms setTimeout after writing innerHTML. React
     batches state updates, so a plain setPrintedAt would still be pending when
     print() ran and the first sheet would print undated. flushSync commits the
     re-render synchronously, which is the guarantee the timeout only approximates. */
  function print() {
    flushSync(() => setPrintedAt(now()))
    window.print()
  }

  const from = total ? filters.page * AUDIT_PAGE_SIZE + 1 : 0
  const to = Math.min(total, filters.page * AUDIT_PAGE_SIZE + rows.length)
  const pageCount = Math.max(1, Math.ceil(total / AUDIT_PAGE_SIZE))

  return (
    <>
      {/* printHead('Audit jurnalı', '') — index.html:7167. Hidden on screen,
          revealed by the print stylesheet so the sheet carries a title,
          timestamp and the user who produced it. The timestamp is stamped by
          «Çap» below, not at render, so it dates the print run. */}
      <PrintHead title="Audit jurnalı" userName={me.name} stampedAt={printedAt} />

      <div className="phead">
        <div>
          <h2>Audit jurnalı</h2>
          <p>Kim, nə vaxt, hansı qeydi dəyişdi. Supabase-dəki daimi jurnaldan canlı oxunur, jurnal silinmir.</p>
        </div>
        <div className="sp" />
        <span className="hint">{total ? `${from}–${to} / ${total}` : ''}</span>
        {/* Excel export stays disabled — a deliberate original decision
            (Q2, index.html:7168, 442), not an unfinished feature. */}
        <Button
          variant="secondary"
          disabled
          title="Audit jurnalı üçün Excel ixracı bu mərhələdə deaktivdir"
        >
          Excel
        </Button>
        <Button variant="secondary" onClick={print}>Çap</Button>
      </div>

      <div className="filters">
        <select
          aria-label="Obyekt"
          value={filters.table}
          onChange={(e) => setFilters({ table: e.target.value })}
        >
          <option value="">Bütün obyektlər</option>
          {Object.entries(AUDIT_TABLE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select
          aria-label="Əməliyyat"
          value={filters.action}
          onChange={(e) => setFilters({ action: e.target.value })}
        >
          <option value="">Bütün əməliyyatlar</option>
          {Object.entries(AUDIT_ACTION_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select
          aria-label="İstifadəçi"
          value={filters.actor}
          onChange={(e) => setFilters({ actor: e.target.value })}
        >
          <option value="">Bütün istifadəçilər</option>
          <option value="__null">Sistem/naməlum</option>
          {actorOptions.map(([id, email]) => <option key={id} value={id}>{email || id}</option>)}
        </select>
        <input
          type="date"
          aria-label="Başlanğıc tarix"
          title="Başlanğıc tarix"
          value={filters.d1}
          onChange={(e) => setFilters({ d1: e.target.value })}
        />
        <input
          type="date"
          aria-label="Son tarix"
          title="Son tarix"
          value={filters.d2}
          onChange={(e) => setFilters({ d2: e.target.value })}
        />
        <Button variant="secondary" onClick={reset}>Sıfırla</Button>
      </div>

      <div className="card">
        <div className="tw" id="t-log">
          {loading ? (
            <div className="empty"><b>Yüklənir…</b>Audit jurnalı Supabase-dən oxunur.</div>
          ) : error ? (
            <div className="empty">
              <b>{errorKind === 'permission' ? 'İcazə yoxdur' : 'Yükləmə xətası'}</b>{error}
            </div>
          ) : (
            <>
              {directoryError && (
                <div className="hint" style={{ padding: '8px 4px', color: 'var(--out)' }}>
                  Diqqət: istifadəçi e-poçtları yüklənə bilmədi — istifadəçilər ID ilə göstərilir.
                </div>
              )}
              <Table>
                <Thead>
                  <tr>
                    <Th>Vaxt</Th>
                    <Th>İstifadəçi</Th>
                    <Th>Əməliyyat</Th>
                    <Th>Obyekt</Th>
                    <Th>Detal</Th>
                    <Th>Səbəb</Th>
                  </tr>
                </Thead>
                <tbody>
                  {rows.map((r: AuditRow, i) => (
                    <tr key={i}>
                      <Td>{r.ts ? new Date(r.ts).toLocaleString('az-AZ') : '—'}</Td>
                      <Td>{actorLabel(r.user_id, emails)}</Td>
                      <Td>
                        <span className={`tag ${actionTagClass(r.action)}`}>
                          {(r.action && AUDIT_ACTION_LABEL[r.action]) || r.action || '—'}
                        </span>
                      </Td>
                      <Td>
                        {(r.table_name && AUDIT_TABLE_LABEL[r.table_name]) || r.table_name || '—'}
                        <div className="hint"><span className="code">{r.record_id || '—'}</span></div>
                      </Td>
                      <Td>{auditSummary(r)}</Td>
                      <Td>{r.reason || '—'}</Td>
                    </tr>
                  ))}
                  {rows.length === 0 && (
                    <tr><Td className="empty">Bu filtrlərə uyğun audit qeydi tapılmadı.</Td></tr>
                  )}
                </tbody>
              </Table>
            </>
          )}
        </div>
        {!loading && !error && (
          <div className="pad" style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <Button variant="secondary" disabled={filters.page === 0} onClick={() => setPage(filters.page - 1)}>
              ← Əvvəlki
            </Button>
            <span className="hint">{filters.page + 1} / {pageCount}</span>
            <Button variant="secondary" disabled={to >= total} onClick={() => setPage(filters.page + 1)}>
              Növbəti →
            </Button>
          </div>
        )}
      </div>
    </>
  )
}
