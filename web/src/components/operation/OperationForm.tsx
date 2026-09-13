import { useEffect, useMemo, useRef, useState } from 'react'
import type { OperationState, DraftOpLineState } from '../../store/operation.store'
import { selectBalance, selectCondOf, selectCondPending } from '../../store/operation.store'
import { OP_TYPES, SAHE_MESUL, channelOptions, partnerOptions, isWoOut, isMvPick, type OpKind } from '../../lib/opTypes'
import { validateOpLine, editRestoreQty, type OpLineInput } from '../../lib/opLineValidation'
import { condBuckets, condSplitCheck, condSplitZero, COND_COLS, type CondSplit } from '../../lib/condSplit'
import { allowedWarehouses, transferSourceWarehouses, transferDestWarehouses } from '../../lib/warehouseScope'
import { today } from '../../lib/format'
import { can, isAdmin, type Me } from '../../lib/roles'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'

/* Operation form — the header fields (3218-3300), item combobox (3305-3401)
   and single-item condition split (3413-3442). The «Malları seç» bulk entry
   points (isWoOut/isMvPick) render only their OPENING affordance here — the
   dialogs themselves are H-3 (BulkPickDialog). Layer selection (H-3,
   LayerPickDialog) is likewise out of this component's scope; when layer
   accounting is active this form still builds the line and hands it to the
   store, and the caller (NewOperationPage) is responsible for routing a
   non-in line to the layer dialog before it is committed — T5 exposes the
   boundary via `onNeedsLayerPick`, it does not invent a temporary substitute
   for that dialog. */
interface Props {
  me: Me
  state: OperationState
  onSetKind: (k: OpKind) => void
  onSetHeaderField: (patch: Partial<Record<string, string>>) => void
  onSetPick: (code: string | null) => void
  /** M7-115 — clears the pending prefill once this form has applied it. */
  onConsumePrefill: () => void
  onCommitLine: (line: DraftOpLineState) => void
  /** M7-39 — an explicit, monotonically increasing COMMIT signal owned by the
      caller. It is incremented only when a single draft line has actually been
      committed through `addLineRaw`, on either of the two commit routes:
      ordinary `onCommitLine`, and a CONFIRMED single-line LayerPickDialog
      return. Restoring a boot draft, hydrating edit mode, applying bulk lines,
      removing or clearing lines, refreshing and opening an unconfirmed layer
      dialog all leave it untouched. Commit intent is therefore never inferred
      from the size of `lines`: a `restoreDraftOnBoot()` that replaces an empty
      `lines` after mount is a 0->N growth that is NOT a commit (Codex audit
      2026-09-09). */
  commitSignal: number
  /** Called instead of committing directly when layers are active and the
      line is not inbound — H-3 supplies the real dialog; T5 only refuses to
      invent a bypass. */
  onNeedsLayerPick: (line: DraftOpLineState) => void
  onCreateItem: (searchText: string) => void
  /** M7-56/M7-57 — opens «Malları seç»; the open guards live in the caller. */
  onOpenBulk: (mode: 'wo' | 'mv') => void
}

function num(v: string): number {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

export function OperationForm({
  me, state, onSetKind, onSetHeaderField, onSetPick, onConsumePrefill, onCommitLine,
  commitSignal, onNeedsLayerPick, onCreateItem, onOpenBulk,
}: Props) {
  const {
    core, header, kind, lines, pick, pendingPrefill, editDoc, layerActive, refsReady,
    channels, observedChannels,
  } = state
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [qty, setQty] = useState('')
  const [split, setSplit] = useState<CondSplit | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [warn, setWarn] = useState<string | null>(null)

  /* M7-22 / M7-39 — focus parity with legacy `pickItem()` (index.html:3400)
     and `commitDraftLine()` (index.html:3669).

     Legacy could call `$('#o-qty').focus()` synchronously because it had just
     written the DOM itself. React has not rendered the picked-item block yet
     at that point, so the focus target does not exist when `pickItem()` runs.
     Both transitions are therefore expressed as REFS + a one-shot flag that a
     post-render effect consumes.

     The flags are what keep this from stealing focus: only an explicit item
     choice (or the M5-55 prefill resolving, which legacy reaches through the
     same `pickItem(code)` with `keep` undefined) arms the quantity focus, and
     only a real commit — the caller's explicit `commitSignal` advancing —
     arms the search focus. An ordinary rerender of an existing pick arms
     neither, which is the legacy `keep = true` case. */
  const qtyRef = useRef<HTMLInputElement | null>(null)
  const searchRef = useRef<HTMLInputElement | null>(null)
  /** Set only by an explicit pick or a resolving prefill; consumed once. */
  const focusQtyOnRenderRef = useRef(false)
  /** Baseline for the explicit commit signal. `null` until the first render,
      so whatever value the caller mounts with — including a remount that
      already carries earlier commits — establishes the baseline instead of
      being mistaken for a commit. */
  const lastCommitSignalRef = useRef<number | null>(null)

  const editMode = editDoc != null
  const admin = isAdmin(me)

  const allowedWh = useMemo(() => allowedWarehouses(me, core.warehouses), [me, core.warehouses])
  const transferSources = useMemo(() => transferSourceWarehouses(me, core.warehouses), [me, core.warehouses])
  const transferDests = useMemo(() => transferDestWarehouses(me, state.transferDests), [me, state.transferDests])

  const types = OP_TYPES[kind]

  /* M7-10 — outbound «Qaytarma» hands goods back to their OWNER, so the
     counterparty is a contragent, not a project/location: the list swaps to
     partnerOptions('in') for that one type only (index.html:3338-3344). */
  const isOutboundReturn = kind === 'out' && header.t === 'Qaytarma'
  const partnerList = useMemo(
    () => partnerOptions(isOutboundReturn ? 'in' : kind, { warehouses: core.warehouses, locations: core.locations, partners: core.partners }),
    [isOutboundReturn, kind, core.warehouses, core.locations, core.partners],
  )

  /* A10 — the legacy form renders EFFECTIVE defaults the moment a tab is
     drawn (index.html:3264-3277): the date is `H.d || today()`, and the type /
     warehouse / destination / counterparty selects carry NO blank option at
     all, so the browser selects the first entry (`H.w || ME.wh` for the
     warehouse, the first non-`ME.wh` warehouse for a transfer destination).
     React previously offered a blank `—` in each and left `header` empty, so
     a user who never touched those selects submitted an empty header.

     These defaults are FILLED INTO the store rather than only displayed, so
     the per-tab header capture (M7-05), the draft payload and the line
     builder all see the same values the user sees. No second rules source is
     created: the option lists themselves (`types`, `allowedWh`,
     `transferSources`, `transferDests`, `partnerList`) remain the only place
     the allowed values are defined, and this effect merely selects the first
     valid one when the field is empty or has fallen out of its list.

     M7-11 — «Silinmə» PINS the counterparty to `Sahə üzrə məsul şəxs`
     (index.html:3350, `if (isWo) $('#o-p').value = 'Sahə üzrə məsul şəxs'`).
     Legacy applies it on every type change through `syncSil()`, not merely by
     rendering a single-entry list, so the pin is written into the header
     here on every transition into that type. */
  useEffect(() => {
    const patch: Partial<Record<string, string>> = {}

    if (!header.d) patch.d = today()

    if (!types.includes(header.t) && types.length > 0) patch.t = types[0]

    const effectiveType = patch.t ?? header.t

    if (kind === 'mv') {
      if (!transferSources.includes(header.w) && transferSources.length > 0) {
        patch.w = transferSources.includes(me.wh) ? me.wh : transferSources[0]
      }
      if (!transferDests.includes(header.w2) && transferDests.length > 0) {
        /* index.html:3269 — the destination pre-selects the first warehouse
           that is NOT the user's own, falling back to the first when that is
           the only one. */
        patch.w2 = transferDests.find((w) => w !== me.wh) ?? transferDests[0]
      }
    } else {
      if (!allowedWh.includes(header.w) && allowedWh.length > 0) {
        patch.w = allowedWh.includes(me.wh) ? me.wh : allowedWh[0]
      }
      if (kind === 'out' && effectiveType === 'Silinmə') {
        if (header.p !== SAHE_MESUL) patch.p = SAHE_MESUL
      } else if (!partnerList.includes(header.p) && partnerList.length > 0) {
        patch.p = partnerList[0]
      }
    }

    if (Object.keys(patch).length > 0) onSetHeaderField(patch)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind, header.t, header.d, header.w, header.w2, header.p, types, allowedWh, transferSources, transferDests, partnerList])

  const channelList = useMemo(
    () => channelOptions({ ready: refsReady, channels }, observedChannels),
    [refsReady, channels, observedChannels],
  )

  const showBulkWo = isWoOut(kind, header.t, editMode)
  const showBulkMv = isMvPick(kind, editMode)

  const pickedItem = pick ? core.itemBy.get(pick) : null

  /* M5-55 / M7-115 — prefill(code) sets `pick` directly on the store,
     independently of the combobox click path. This effect applies the same
     "seed price when empty on `in`" half of pickItem() (3390-3401) so a
     transition from Nomenklatura is a real prefill, not bare navigation. The
     60 ms legacy setTimeout is a DOM-readiness workaround (proposal §8.4);
     this effect is its React equivalent.

     It deliberately depends on `pickedItem` too, NOT on `pick` alone. A
     prefill arrives before this screen has loaded, so on the first render the
     code resolves to nothing; keyed on `pick` only, the effect would fire once
     against the empty snapshot and never again once the items land — the item
     would be selected with no price seeded. `pendingPrefill` keeps the request
     alive across that load and is consumed exactly once, here, when the code
     finally resolves. `header.pr` is intentionally NOT a dependency: seeding
     is a one-shot, and reacting to the user's own price edit would re-seed it. */
  useEffect(() => {
    if (!pick || !pickedItem) return
    if (kind === 'in' && !header.pr) {
      onSetHeaderField({ pr: String(pickedItem.price ?? '') })
    }
    /* M7-22 — the prefill is legacy `pickItem(code)` reached from Nomenklatura,
       so it arms quantity focus exactly like an explicit choice. It is armed
       ONLY while a prefill is actually being consumed: this effect also runs on
       an ordinary rerender of an existing pick (the `keep = true` case), and
       arming there would steal focus. */
    if (pendingPrefill) {
      focusQtyOnRenderRef.current = true
      onConsumePrefill()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pick, pickedItem])

  /* M7-19 — the combobox search runs 160 ms after the last keystroke
     (index.html:3327, `debounce(search, 160)`), not on every keystroke. */
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 160)
    return () => clearTimeout(t)
  }, [query])

  /* Outbound stock filter — M7-20. `in` has no filter at all. Code matching
     is an UNCONDITIONAL substring test regardless of the first character
     (index.html:3316, `i.code.indexOf(q) >= 0`) — M7-19 requires this even
     when the query does not start with a digit.

     A09 — the stock predicate runs BEFORE the 12-row cut, exactly as
     index.html:3311-3317 does (`DB.items.filter(i => (!stock || stock.has(
     i.code)) && (name/code hit)).slice(0, 12)`). Cutting first and filtering
     afterwards would report «no result» whenever the first 12 text matches
     happen to be out of stock while a later one is not. Like the legacy
     `stock` set, the filter is skipped entirely when no warehouse is selected
     yet. */
  const candidates = useMemo(() => {
    const q = debouncedQuery.trim().toLowerCase()
    if (q.length < 2) return []
    const wh = header.w
    const stockFiltered = kind === 'in' || !wh
    return core.items.filter((it) => {
      if (!stockFiltered && !(selectBalance(state, wh, it.code) > 1e-9)) return false
      const nameHit = it.name.toLowerCase().includes(q)
      const codeHit = it.code.includes(q)
      return nameHit || codeHit
    }).slice(0, 12)
  }, [debouncedQuery, core.items, kind, header.w, state])

  const cond = pick ? selectCondOf(state, header.w, pick) : null
  const pending = pick ? selectCondPending(state, header.w, pick) : {}
  const avail = pick ? selectBalance(state, header.w, pick) + editRestoreQty(editDoc?.restore, header.w, pick) : 0
  const buckets = pick ? condBuckets(cond, avail, pending) : null
  const showSplit = !!buckets?.marked && kind !== 'in'

  /* M7-22 — apply the armed quantity focus, now that the picked-item block has
     rendered and `showSplit` is known.

     Legacy: `if (!keep && !OP.condSplit) $('#o-qty').focus()`. The `!keep` half
     is the flag (only an explicit pick or a resolving prefill arms it); the
     `!OP.condSplit` half is `showSplit`, read here rather than in `pickItem()`
     because the split is derived from the resolved item and its live stock
     conditions. The flag is cleared in BOTH branches: a split pick consumes the
     arm without focusing, so the intent cannot leak into a later render. */
  useEffect(() => {
    if (!focusQtyOnRenderRef.current) return
    if (!pick || !pickedItem) return
    focusQtyOnRenderRef.current = false
    if (showSplit) return
    qtyRef.current?.focus()
  }, [pick, pickedItem, showSplit])

  /* M7-39 — after a draft line is ACTUALLY committed, focus returns to item
     search (legacy `commitDraftLine()`, index.html:3669).

     The signal is the caller's explicit `commitSignal`, not `onAddLine()`
     completing and not the size of `lines`. `onAddLine()` alone is wrong
     because a layered non-inbound line LEAVES this component through
     `onNeedsLayerPick` and is committed later by LayerPickDialog →
     `addLineRaw` in the page. `lines.length` is wrong because collection size
     does not carry intent: the real page mounts with `lines = []` and only
     then does `restoreDraftOnBoot()` replace them from localStorage, and that
     post-mount 0→N growth is a RESTORE, not a commit (Codex audit
     2026-09-09). NewOperationPage instead increments `commitSignal` at exactly
     the two points where a single line reaches `addLineRaw`, which covers both
     routes and excludes restore, bulk application, edit hydration, refresh,
     removal/clearing and an unconfirmed layer dialog by construction.

     `lastCommitSignalRef` starts as `null` so the first render only
     establishes a baseline — mounting against a caller whose counter is
     already non-zero is not a commit. */
  useEffect(() => {
    const prev = lastCommitSignalRef.current
    lastCommitSignalRef.current = commitSignal
    /* First render only establishes the baseline. */
    if (prev === null) return
    /* Only a forward step is a commit. */
    if (commitSignal <= prev) return

    /* Codex re-audit 2026-09-10 — this is the SINGLE post-commit transition,
       so it must reproduce the whole of legacy `commitDraftLine()`
       (index.html:3661-3670), not focus alone. The legacy function clears the
       item search, the unit, the quantity, the condition split and the price
       before focusing `#o-item`.

       Clearing here rather than at the `onCommitLine()` call site is what
       makes the CONFIRMED layer-dialog route correct. That route leaves this
       component through `onNeedsLayerPick`, so the call site never runs; the
       page then nulls `pick`, which merely UNMOUNTS the quantity and split
       controls while their local state survives inside this still-mounted
       form. Picking a second item would remount those controls holding the
       previous line's values. Hidden is not cleared.

       `pick` and `unit` are owned by the page and already released by
       `addLineRaw()`; `pr` is a header field, so it is cleared through
       `onSetHeaderField`. Only the inbound price exists, and clearing it on a
       non-inbound commit would be a no-op write, so the write is guarded on
       `kind`. Every other header field — date, warehouse, type, destination,
       partner, channel, contract, invoice, note — is deliberately preserved:
       legacy keeps them for the next line of the same document. */
    setQuery('')
    setQty('')
    setSplit(null)
    setError(null)
    setWarn(null)
    if (kind === 'in') onSetHeaderField({ pr: '' })

    /* The search input is absent while the «Malları seç» bulk affordance
       replaces it; `?.` keeps that a no-op rather than a crash. */
    searchRef.current?.focus()
    /* `kind` and `onSetHeaderField` are read, not reacted to: the effect must
       fire ONLY on a commit-signal step, never when the tab or the page's
       callback identity changes. */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [commitSignal])

  function pickItem(code: string) {
    /* M7-22 — this is the EXPLICIT choice, legacy `pickItem(code)` with `keep`
       falsy, so quantity focus is armed here. Whether it is actually applied
       depends on the resolved item having no active split, which is only known
       after the render that reveals the split; the effect below decides. */
    focusQtyOnRenderRef.current = true
    onSetPick(code)
    setQuery('')
    setSplit(null)
    setError(null)
    setWarn(null)
    const it = core.itemBy.get(code)
    if (it && kind === 'in' && !header.pr) {
      onSetHeaderField({ pr: String(it.price ?? '') })
    }
  }

  function onWarehouseChange(w: string) {
    onSetHeaderField({ w })
    if (kind !== 'in') {
      onSetPick(null)
      setQuery('')
      setSplit(null)
      setQty('')
    }
  }

  function buildLine(): OpLineInput {
    return {
      kind,
      t: header.t || types[0] || '',
      w: header.w,
      w2: kind === 'mv' ? header.w2 : undefined,
      c: pick ?? '',
      q: num(qty),
      p: kind === 'out' && header.t === 'Silinmə' ? SAHE_MESUL : header.p,
      ch: header.ch,
    }
  }

  function onAddLine() {
    setError(null)
    setWarn(null)

    if (showSplit) {
      const check = condSplitCheck(split, buckets!)
      if (!check.ok) { setError(check.error ?? null); return }
    }

    const line = buildLine()
    const ctx = {
      itemBy: new Map(Array.from(core.itemBy.entries()).map(([c, it]) => [c, { code: it.code, name: it.name, unit: it.unit ?? '' }])),
      balanceOf: (w: string, c: string) => selectBalance(state, w, c),
      allowedWarehouses: allowedWh,
      transferSources,
      transferDests,
      lines: lines as unknown as OpLineInput[],
      isAdmin: admin,
      restore: editDoc?.restore,
    }
    const res = validateOpLine(line, ctx)
    if (!res.ok) {
      /* M7-31 — a split cut mismatch is REJECTED, not silently trimmed. */
      if (showSplit && res.code === 'stock') { setError(res.error); return }
      setError(res.error)
      return
    }
    if (showSplit && res.q !== line.q) {
      setError('Tiplərə görə bölgü mövcud olduğu üçün miqdar avtomatik endirilə bilməz — miqdarı özünüz azaldın.')
      return
    }
    if (res.warn) setWarn(res.warn)

    const draftLine: DraftOpLineState = {
      kind, w: line.w, w2: line.w2 ?? undefined, c: line.c, q: res.q,
      d: header.d || today(), t: line.t, p: line.p ?? undefined, ch: line.ch ?? undefined,
      ct: header.ct, iv: header.iv, note: header.note,
      cond: showSplit ? (split ?? condSplitZero()) : null,
      name: res.item.name, unit: res.item.unit,
      pr: kind === 'in' ? num(header.pr ?? '') : null,
    }

    if (layerActive && kind !== 'in') {
      onNeedsLayerPick(draftLine)
      return
    }
    /* Clearing is NOT done here: the commit-signal effect is the single
       post-commit transition and covers this route and the confirmed
       layer-dialog route alike. */
    onCommitLine(draftLine)
  }

  return (
    <div className="card" data-testid="operation-form">
      <div className="seg" role="tablist" aria-label="Əməliyyat növü">
        {(['in', 'out', 'mv'] as OpKind[]).map((k) => (
          <button
            key={k}
            role="tab"
            aria-selected={kind === k}
            /* M18-43 — the selected tab's class is `on`, not `active`.
               `.seg button.on` is the platform rule (index.css, index.html:116);
               `active` is defined nowhere, so the chosen tab rendered with no
               steel background at all — measured in Chrome as a transparent
               background against `.on`'s rgb(31,78,107). Every other segment
               control on the platform (Balances, Nomenklatura, Sərfiyyat,
               Anbar və layihələr, Azpetrol) already uses `on`; this was the
               single outlier. */
            className={kind === k ? 'on' : undefined}
            onClick={() => onSetKind(k)}
          >
            {k === 'in' ? 'Mədaxil' : k === 'out' ? 'Məxaric' : 'Yerdəyişmə'}
          </button>
        ))}
      </div>

      {/* M18-44 — the header field grid, index.html:3262. Legacy builds every
          header block as `.row` with an INLINE grid-template-columns; `.row`
          is `display:grid;gap:10px` (index.css:132) and the template is what
          gives it columns. `grid2` is defined nowhere, so these fields
          stacked one per row at full width — which is what turned empty
          inputs into large blank blocks down the page. */}
      <div className="row" style={{ gridTemplateColumns: '1fr 1fr' }}>
        <label className="f">
          <span>Tarix</span>
          <Input type="date" value={header.d} onChange={(e) => onSetHeaderField({ d: e.target.value })} />
        </label>

        <label className="f">
          {/* M18-56 — index.html:3265. «Növ» was a React abbreviation. */}
          <span>Əməliyyatın növü</span>
          <select value={header.t} onChange={(e) => onSetHeaderField({ t: e.target.value })}>
            {types.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </label>

        {kind === 'mv' ? (
          <>
            {/* M18-56 — index.html:3268-3269 captions. «Mənbə anbar» /
                «Təyinat anbar» were React paraphrases. */}
            <label className="f">
              <span>Haradan (anbar)</span>
              <select value={header.w} onChange={(e) => onWarehouseChange(e.target.value)}>
                {transferSources.map((w) => <option key={w} value={w}>{w}</option>)}
              </select>
            </label>
            <label className="f">
              <span>Hara (anbar)</span>
              <select value={header.w2} onChange={(e) => onSetHeaderField({ w2: e.target.value })}>
                {transferDests.map((w) => <option key={w} value={w}>{w}</option>)}
              </select>
            </label>
          </>
        ) : (
          <label className="f">
            <span>Anbar</span>
            <select value={header.w} onChange={(e) => onWarehouseChange(e.target.value)}>
              {allowedWh.map((w) => <option key={w} value={w}>{w}</option>)}
            </select>
          </label>
        )}

        {kind !== 'mv' && (
          <label className="f">
            <span>{kind === 'in' ? 'Kontragent' : 'Təhvil alan / layihə'}</span>
            <select
              value={header.p}
              disabled={kind === 'out' && header.t === 'Silinmə'}
              onChange={(e) => onSetHeaderField({ p: e.target.value })}
            >
              {(kind === 'out' && header.t === 'Silinmə' ? [SAHE_MESUL] : partnerList).map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </label>
        )}

      </div>

      {/* M7-56 — the bulk entry point. On `out`+«Silinmə» it REPLACES the
          single-item block; on `mv` it stands alongside «Sətri əlavə et».
          Neither renders in edit mode (M7-112). */}
      {(showBulkWo || showBulkMv) && (
        <div className="pad" data-testid="bulk-pick-affordance">
          <Button variant="secondary" onClick={() => onOpenBulk(showBulkWo ? 'wo' : 'mv')}>
            Malları seç
          </Button>
        </div>
      )}

      {!showBulkWo && (
        <div className="pad">
          {/* M18-47 — the relative wrapper legacy puts around the input and
              its result box (index.html:3299). The `.combobox-results` rule is
              `position:absolute`, which resolves against the nearest
              positioned ancestor — without this wrapper the list would
              position against the page instead of the field. */}
          <label className="f combobox-wrap">
            {/* M18-56 — index.html:3279 caption and placeholder. «Mal axtar»
                was a React abbreviation. */}
            <span>Mal (ad və ya kod yazın)</span>
            <Input
              ref={searchRef}
              type="text"
              autoComplete="off"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="məs. kabel, 0000123…"
              aria-label="Mal axtarışı"
            />
            {/* index.html:3282 — `#o-itemsel`, the current selection readout. */}
            <span className="hint">{pickedItem ? `${pickedItem.name} (${pick})` : 'Seçilməyib'}</span>
          </label>
          {debouncedQuery.trim().length >= 2 && (
            candidates.length === 0 ? (
              <div className="empty">
                {kind !== 'in' && header.w
                  ? `"${header.w}" anbarında bu axtarışa uyğun qalıq yoxdur.`
                  : 'Tapılmadı.'}
                {kind === 'in' || !header.w ? null : null}
                {!(kind !== 'in' && header.w) && can(me, 'item.add') && (
                  <div>
                    <button
                      type="button"
                      className="link"
                      onClick={(e) => { e.preventDefault(); onCreateItem(query) }}
                    >
                      Yeni mal yarat →
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <ul className="combobox-results">
                {candidates.map((it) => (
                  <li key={it.code}>
                    <button type="button" onClick={() => pickItem(it.code)}>{it.name} ({it.code})</button>
                  </li>
                ))}
              </ul>
            )
          )}

          <div className="pad" data-testid="picked-item">
            {/* M18-57 — the quantity / unit / price row is ALWAYS present in
                the ordinary single-item flow, not gated on a pick.

                Legacy emits this row unconditionally inside the `isWoOut ? ''
                : …` branch (index.html:3278-3282): the only state in which it
                does not exist is out + «Silinmə», where «Malları seç»
                replaces the whole single-item route — and that branch already
                excludes this block through `!showBulkWo` above. Gating on
                `pickedItem` meant an empty «Mədaxil» form showed no quantity,
                no unit and no price at all until an item was chosen, so the
                form a user first sees was three fields short of production.

                Before a pick the row is simply EMPTY: `qty` is '', the unit
                resolves to '' and shows its `—` placeholder, and the price
                renders the header value it is bound to. «Sətri əlavə et»
                stays disabled on `!pick`, so a visible row cannot commit a
                line without a selected item. */}
            <div className="row" style={{ gridTemplateColumns: kind === 'in' ? '1fr 1fr 1fr' : '1fr 1fr' }}>
              <label className="f">
                <span>Miqdar</span>
                <Input
                  ref={qtyRef}
                  type="number" step="0.01" min="0" placeholder="0"
                  value={qty} readOnly={showSplit}
                  onChange={(e) => setQty(e.target.value)}
                />
              </label>
              <label className="f">
                <span>Ölçü vahidi</span>
                <Input value={pickedItem?.unit ?? ''} readOnly placeholder="—" />
              </label>
              {kind === 'in' && (
                <label className="f">
                  <span>Vahidin qiyməti (₼)</span>
                  <Input
                    type="number" step="0.01" min="0" value={header.pr ?? ''}
                    placeholder="0.00"
                    onChange={(e) => onSetHeaderField({ pr: e.target.value })}
                  />
                </label>
              )}
            </div>

            {/* `showSplit` already implies a pick (`buckets` is null without
                one), so the split block keeps its existing gating. */}
            {showSplit && buckets && (
              <div data-testid="cond-split">
                {COND_COLS.map((cc) => (
                  <label key={cc.k} className="f">
                    <span>{cc.t} (max {buckets[cc.k]})</span>
                    <Input
                      type="number" step="0.01"
                      value={split?.[cc.k] ?? 0}
                      onChange={(e) => {
                        const v = Math.min(num(e.target.value), buckets[cc.k])
                        const base = split ?? condSplitZero()
                        const next = { ...base, [cc.k]: v }
                        setSplit(next)
                        setQty(String(COND_COLS.reduce((s, c2) => s + (next[c2.k] || 0), next.normal || 0)))
                      }}
                    />
                  </label>
                ))}
              </div>
            )}

          </div>
        </div>
      )}

      {/* M18-56 — index.html:3290-3296. These trail the item block in
          production; React had hoisted them into the header grid ABOVE the
          item search. Every field keeps its own header key and handler, so
          only the position changes. */}
      <div className="pad">
        {kind === 'in' && (
          <div className="row" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
            <label className="f">
              <span>Alınma kanalı</span>
              <select value={header.ch} onChange={(e) => onSetHeaderField({ ch: e.target.value })}>
                <option value="">—</option>
                {channelList.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>
            <label className="f">
              <span>Müqavilə №</span>
              <Input
                value={header.ct} placeholder="məs. №06/2026"
                onChange={(e) => onSetHeaderField({ ct: e.target.value })}
              />
            </label>
            <label className="f">
              <span>Qaimə №</span>
              <Input
                value={header.iv} placeholder="məs. 83951"
                onChange={(e) => onSetHeaderField({ iv: e.target.value })}
              />
            </label>
          </div>
        )}

        {/* M7-13 / M7-14 — the out and mv hints differ (index.html:3292-3295):
            on a transfer the single number is written to BOTH legs, which is
            what the mv wording tells the user. */}
        {kind !== 'in' && (
          <div className="row" style={{ gridTemplateColumns: '1fr' }}>
            <label className="f">
              <span>Qaimə №</span>
              <Input
                value={header.iv}
                placeholder={kind === 'mv' ? 'məs. YD-2026/041' : 'məs. 83951'}
                onChange={(e) => onSetHeaderField({ iv: e.target.value })}
              />
              <span className="hint">
                {kind === 'mv'
                  ? 'Anbarlararası təhvil-təslim sənədinin nömrəsi — əl ilə yazılır, kontragentə bağlı deyil. Hər iki sətirdə eyni saxlanılır.'
                  : 'Məxaric sənədinin nömrəsi — əl ilə yazılır.'}
              </span>
            </label>
          </div>
        )}

        <label className="f">
          <span>Qeyd</span>
          <Input
            value={header.note}
            placeholder="istəyə bağlı — əsaslandırma, sifariş nömrəsi, məsul şəxs"
            onChange={(e) => onSetHeaderField({ note: e.target.value })}
          />
        </label>

        {/* M18-56 — index.html:3296. «Sətri əlavə et» is the LAST control of
            the form, after Qeyd, sharing its row with `#o-err`. It previously
            sat inside the picked-item block, which put it ABOVE channel,
            contract, invoice and note. It stays disabled until a quantity is
            entered, and it is absent on out+«Silinmə», where «Malları seç»
            replaces the whole single-item route (isWoOut, index.html:3297). */}
        {!showBulkWo && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <Button onClick={onAddLine} disabled={!pick || !qty || num(qty) <= 0}>Sətri əlavə et</Button>
            {/* M18-48 — `.err` is the platform's error class (index.html:110);
                `alarm` is defined nowhere and rendered as plain ink instead
                of red. */}
            {error && <span className="err">{error}</span>}
            {warn && <span className="hint">{warn}</span>}
          </div>
        )}
      </div>
    </div>
  )
}
