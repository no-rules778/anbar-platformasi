import { useMemo } from 'react'
import {
  bulkWriteOffFiltered, bulkWriteOffSummary, bwSelectRow,
  type BulkRow, type BulkLot, type BulkOverride,
} from '../../lib/bulkWriteOff'
import { condBuckets, COND_COLS, type CondRecord, type CondSplit } from '../../lib/condSplit'
import { nf, money } from '../../lib/format'
import { Dialog } from '../ui/Dialog'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Table, Thead, Th, Td } from '../ui/Table'

/* «Malları seç» — M7-61…M7-65, M7-70 (index.html:4120-4302).

   This dialog SELECTS; it never writes. Confirming only hands the selection to
   the caller, which appends draft lines all-or-nothing (M7-66/M7-67); the real
   write is still the main «Sənədi qeyd et». Any description of group write-off
   as a direct write is stale (the <<2026-08-24 fix>> comment at 4494-4498).

   Quantity edits deliberately do NOT re-render the row list (M7-61): the
   legacy input keeps focus while typing, and rebuilding the list would steal
   it after every keystroke. `rows` is therefore computed by the CALLER and
   passed in — this component never recomputes it from a changing selection.

   H3-A05 — the draft (search, selection, splits, note) is OWNED BY THE STORE
   and passed in, because «Partiya seç» unmounts this dialog: component-local
   state was silently lost on every layer round trip. Editing calls back to
   the parent instead of a local setState. Only the LAYOUT is local. */
interface Props {
  mode: 'wo' | 'mv'
  warehouse: string
  rows: readonly BulkRow[]
  condOf: (code: string) => CondRecord | null
  condPendingOf: (code: string) => Partial<Record<string, number>>
  layerActive: boolean
  lots: ReadonlyMap<string, BulkLot>
  values: ReadonlyMap<string, BulkOverride>
  /* The surviving draft (H3-A05). */
  query: string
  sel: ReadonlyMap<string, number>
  split: ReadonlyMap<string, Partial<CondSplit>>
  note: string
  onQueryChange: (q: string) => void
  onSelChange: (sel: Map<string, number>, split: Map<string, Partial<CondSplit>>) => void
  onNoteChange: (note: string) => void
  /** M7-75 — a bulk row's layer selection opens the shared LayerPickDialog. */
  onPickLayers: (row: BulkRow, qty: number) => void
  /** H-3 — the stored lot and admin override for a row become meaningless the
      moment its quantity or its condition split changes: an allocation made
      for 5 units does not describe a row that now asks for 3. The parent owns
      `bulkLots`/`bulkValues`, so only the parent can drop them; this dialog
      reports the change and never silently keeps a mismatched payload. */
  onInvalidateLot: (code: string) => void
  onApply: (selection: {
    sel: Map<string, number>
    split: Map<string, Partial<CondSplit>>
    note: string
  }) => void
  onClose: () => void
}

function num(v: string): number {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

export function BulkPickDialog({
  mode, warehouse, rows, condOf, condPendingOf, layerActive,
  lots, values, query, sel, split, note,
  onQueryChange, onSelChange, onNoteChange,
  onPickLayers, onInvalidateLot, onApply, onClose,
}: Props) {
  /* The draft is the caller's; these only forward an edited copy upward. */
  const setQuery = onQueryChange
  const setNote = onNoteChange
  function commit(nextSel: Map<string, number>, nextSplit: Map<string, Partial<CondSplit>>) {
    onSelChange(nextSel, nextSplit)
  }

  const filtered = useMemo(() => bulkWriteOffFiltered(rows, query), [rows, query])

  const summary = useMemo(
    () => bulkWriteOffSummary({
      rows, sel, split, lots, values, condOf, condPendingOf, layerActive,
    }),
    [rows, sel, split, lots, values, condOf, condPendingOf, layerActive],
  )

  /* M7-63 — the post button needs at least one ready row and NO bad row. */
  const ready = summary.n > 0 && summary.bad.length === 0

  /* M7-65 — checked only when EVERY filtered row is selected; a partial
     selection leaves it unchecked. */
  const allSelected = filtered.length > 0 && filtered.every((r) => sel.has(r.c))

  /* M7-60 — selection takes the whole available quantity, and a marked item
     fills each bucket to its own max. Individual selection and select-all use
     the SAME function: two paths would let one skip the split and be blocked
     later as «bölgü göstərilməyib». */
  function selectRow(row: BulkRow) {
    const patch = bwSelectRow(row, condOf(row.c), condPendingOf(row.c))
    const nextSel = new Map(sel)
    const nextSplit = new Map(split)
    nextSel.set(row.c, patch.sel)
    if (patch.split) nextSplit.set(row.c, patch.split)
    else nextSplit.delete(row.c)
    commit(nextSel, nextSplit)
  }

  function deselectRow(code: string) {
    const nextSel = new Map(sel)
    const nextSplit = new Map(split)
    nextSel.delete(code)
    nextSplit.delete(code)
    commit(nextSel, nextSplit)
    /* A deselected row keeps no allocation either. */
    onInvalidateLot(code)
  }

  function toggleAll() {
    if (allSelected) {
      const nextSel = new Map(sel)
      const nextSplit = new Map(split)
      for (const r of filtered) { nextSel.delete(r.c); nextSplit.delete(r.c) }
      commit(nextSel, nextSplit)
      for (const r of filtered) onInvalidateLot(r.c)
      return
    }
    const nextSel = new Map(sel)
    const nextSplit = new Map(split)
    for (const r of filtered) {
      const patch = bwSelectRow(r, condOf(r.c), condPendingOf(r.c))
      nextSel.set(r.c, patch.sel)
      if (patch.split) nextSplit.set(r.c, patch.split)
    }
    commit(nextSel, nextSplit)
  }

  /* M7-61 — the typed quantity clamps to what is available. Changing it also
     drops any stored lot via `onInvalidateLot`: an allocation made for 5 units
     is meaningless once the row asks for 3, and silently keeping it would post
     a mismatched payload. */
  function setQty(row: BulkRow, raw: string) {
    const v = Math.min(Math.max(num(raw), 0), row.avail)
    const next = new Map(sel)
    next.set(row.c, v)
    commit(next, new Map(split))
    onInvalidateLot(row.c)
  }

  /* M7-62 — each bucket clamps to its own maximum and the row total is
     recomputed from the sum, never typed directly. Because that sum IS the
     row quantity, a bucket edit invalidates the stored lot exactly as a
     direct quantity edit does. */
  function setBucket(row: BulkRow, key: string, raw: string) {
    const bk = condBuckets(condOf(row.c), row.avail, condPendingOf(row.c))
    const max = (bk as unknown as Record<string, number>)[key] ?? 0
    const cur = split.get(row.c) ?? {}
    const nextRow = { ...cur, [key]: Math.min(Math.max(num(raw), 0), max) } as Partial<CondSplit>
    const total = COND_COLS.reduce(
      (s, c) => s + ((nextRow as Record<string, number>)[c.k] || 0),
      (nextRow as Record<string, number>).normal || 0,
    )
    const nextSplit = new Map(split)
    nextSplit.set(row.c, nextRow)
    const nextSel = new Map(sel)
    nextSel.set(row.c, total)
    commit(nextSel, nextSplit)
    onInvalidateLot(row.c)
  }

  function apply() {
    /* Independent refusal — never rely on the disabled button alone. */
    if (!ready) return
    onApply({ sel: new Map(sel), split: new Map(split), note })
  }

  return (
    <Dialog
      title={mode === 'wo' ? 'Silinəcək malları seçin' : 'Köçürüləcək malları seçin'}
      onClose={onClose}
      footer={(
        <>
          <span className="hint" data-testid="bulk-footer">
            {summary.n > 0
              ? `${nf(summary.n)} sətir · ${nf(summary.qty, 2)} vahid · ${money(summary.amount)}`
              : mode === 'wo' ? 'Silinəcək mal seçin' : 'Köçürüləcək mal seçin'}
          </span>
          <div style={{ flex: 1 }} />
          <Button variant="secondary" onClick={onClose}>İmtina</Button>
          <Button onClick={apply} disabled={!ready}>Əlavə et</Button>
        </>
      )}
    >
      <div data-testid="bulk-pick-dialog">
        <div className="hint">{warehouse}</div>

        <label className="f">
          <span>Axtar</span>
          <Input
            value={query}
            aria-label="Mal axtarışı"
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>

        <div className="phead">
          <label>
            <input
              type="checkbox"
              aria-label="Hamısını seç"
              checked={allSelected}
              onChange={toggleAll}
            />{' '}
            Hamısını seç
          </label>
          <div className="sp" />
          <span className="hint" data-testid="bulk-counters">
            {nf(filtered.length)} mövqe göstərilir · {nf(sel.size)} seçilib
          </span>
        </div>

        {filtered.length === 0 ? (
          <div className="empty">Bu anbarda uyğun müsbət qalıq yoxdur.</div>
        ) : (
          <Table>
            <Thead>
              <tr>
                <Th>{''}</Th>
                <Th>Mal</Th>
                <Th right>Mövcud</Th>
                <Th right>Miqdar</Th>
                {layerActive && <Th>Partiya</Th>}
              </tr>
            </Thead>
            <tbody>
              {filtered.map((r) => {
                const picked = sel.has(r.c)
                const bk = condBuckets(condOf(r.c), r.avail, condPendingOf(r.c))
                return (
                  <tr key={r.c}>
                    <Td>
                      <input
                        type="checkbox"
                        aria-label={`Seç ${r.c}`}
                        checked={picked}
                        onChange={() => (picked ? deselectRow(r.c) : selectRow(r))}
                      />
                    </Td>
                    <Td>{r.name} ({r.c})</Td>
                    <Td className="num r">{nf(r.avail, 2)} {r.unit}</Td>
                    <Td className="num r">
                      <Input
                        type="number" step="0.01"
                        aria-label={`Miqdar ${r.c}`}
                        value={sel.get(r.c) ?? 0}
                        /* A marked row's total is the bucket sum — M7-62. */
                        readOnly={bk.marked}
                        disabled={!picked}
                        onChange={(e) => setQty(r, e.target.value)}
                      />
                      {picked && bk.marked && (
                        <div data-testid={`bulk-split-${r.c}`}>
                          {COND_COLS.map((cc) => (
                            <label key={cc.k} className="f">
                              <span>{cc.t} (max {nf(bk[cc.k], 2)})</span>
                              <Input
                                type="number" step="0.01"
                                aria-label={`${cc.t} ${r.c}`}
                                value={(split.get(r.c) as Record<string, number> | undefined)?.[cc.k] ?? 0}
                                onChange={(e) => setBucket(r, cc.k, e.target.value)}
                              />
                            </label>
                          ))}
                        </div>
                      )}
                    </Td>
                    {layerActive && (
                      <Td>
                        <Button
                          variant="secondary" size="sm"
                          disabled={!picked}
                          onClick={() => onPickLayers(r, sel.get(r.c) ?? 0)}
                        >
                          {lots.has(r.c) ? 'Partiya seçilib' : 'Partiya seç'}
                        </Button>
                      </Td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </Table>
        )}

        {/* M7-70 — «Ümumi qeyd» is written to EVERY produced line. */}
        <label className="f">
          <span>Ümumi qeyd</span>
          <Input value={note} aria-label="Ümumi qeyd" onChange={(e) => setNote(e.target.value)} />
        </label>

        {summary.bad.length > 0 && (
          <div className="alarm" data-testid="bulk-bad">
            {summary.bad.map((b) => <div key={b.code}>{b.code} — {b.why}</div>)}
          </div>
        )}
      </div>
    </Dialog>
  )
}
