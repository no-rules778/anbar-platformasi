import { useMemo, useState } from 'react'
import type { ItemRow } from '../../api/items.api'
import { createItem, updateItem } from '../../api/itemWrite.api'
import { nextCode, similarItems, validateItem } from '../../lib/itemValidation'
import { suggestCategory } from '../../lib/suggestCategory'
import { blockedReason } from '../../lib/mutationGuard'
import { can, isAdmin, type Me } from '../../lib/roles'
import { useToastStore } from '../../store/toast.store'
import { Dialog } from '../ui/Dialog'
import { Button } from '../ui/Button'

/* Item create/edit — editItem() (index.html:5565-5636).

   The dialog NEVER closes on a failed save (5628-5630): emit() surfaces the
   real server error and the form stays open with the user's input intact, so
   a silent RLS refusal can never look like a success. */

interface Props {
  /** null = create. */
  item: ItemRow | null
  items: ItemRow[]
  units: string[]
  categories: string[]
  me: Me
  onSaved: (code: string) => void
  onClose: () => void
  /** M7-21b — the «Yeni mal yarat» entry point seeds the name field with the
      combobox's current search text, UNTRIMMED, exactly as `editItem(null,
      inp.value)` does (index.html:3325, 5576). Editing ignores it: legacy
      passes the stored name in that case, so seeding here would silently
      rename the item. */
  presetName?: string
}

/** `CAT_UNSET` — the label for an item with no category (index.html:5586). */
const CAT_UNSET = 'Təyin edilməyib'

export function ItemFormDialog({ item, items, units, categories, me, onSaved, onClose, presetName = '' }: Props) {
  const editing = item !== null
  const show = useToastStore((s) => s.show)

  /* Only an Admin may set a category — canEditCategory() (661). */
  const canCategory = isAdmin(me)
  const canPrice = can(me, 'price.edit')

  /* The unit list is the reference directory's; an item whose stored unit has
     since been hidden keeps it as an option for THIS item only (5568-5571). */
  const unitOptions = useMemo(() => {
    const cur = item?.unit ?? ''
    return cur && !units.includes(cur) ? [cur, ...units] : units
  }, [units, item])

  /* A09: categoryOptionsFor(current) — index.html:699-702. The SAME exception
     the units get: if this item's stored category has since been hidden, it
     stays in the list for THIS item only. Without it, opening the card to
     edit an unrelated field would show a different category than the one
     actually stored, and saving would silently change it. The exception is
     never offered to any other item. */
  const categoryOptions = useMemo(() => {
    const cur = item?.category ?? ''
    return cur && !categories.includes(cur) ? [...categories, cur] : categories
  }, [categories, item])

  /* A08: the code is editable when CREATING and readonly when EDITING
     (index.html:5576 applies `readonly` only when `it` exists). The proposed
     next code is a suggestion the user may override; validateItem still
     enforces the seven-digit format and the duplicate check. */
  const [code, setCode] = useState(() => (item ? item.code : nextCode(items)))
  const [name, setName] = useState(() => (item ? item.name : presetName))
  const [unit, setUnit] = useState(() => {
    if (item) return item.unit || unitOptions[0] || ''
    return units.includes('ədəd') ? 'ədəd' : (units[0] || '')
  })
  const [price, setPrice] = useState(item?.price ? String(item.price) : '')
  const [category, setCategory] = useState(item?.category ?? '')
  const [saving, setSaving] = useState(false)

  /* Advisory only — never auto-selects, never blocks a save (5605-5610). */
  const similar = useMemo(() => similarItems(name, code, items), [name, code, items])

  /* A09 / M5-36 — the category suggestion (catSug, index.html:5595-5602).
     It appears ONLY while no category is chosen: picking one, by hand or from
     the suggestion, clears it. It is never applied automatically and never
     saved on its own — the user must click it. */
  const suggestion = useMemo(
    () => (canCategory && !category ? suggestCategory(name, categoryOptions) : ''),
    [canCategory, category, name, categoryOptions],
  )

  async function save() {
    const error = validateItem(
      { code, name: name.trim(), unit, category },
      {
        editing,
        existingCodes: new Set(items.map((i) => i.code)),
        canEditCategory: canCategory,
        allowedUnits: unitOptions,
      },
    )
    if (error) { show(error, true); return }

    const blocked = blockedReason(editing ? 'item.update' : 'item.create')
    if (blocked) { show(blocked, true); return }

    setSaving(true)
    const parsedPrice = parseFloat(price) || 0
    const res = editing
      ? await updateItem({
        code,
        name: name.trim(),
        unit,
        price: parsedPrice,
        ...(canCategory ? { category } : {}),
      })
      : await createItem(
        { code, name: name.trim(), unit, price: parsedPrice, ...(canCategory ? { category } : {}) },
        me.sbId,
      )
    setSaving(false)

    /* Failure keeps the dialog open — the user must see that nothing saved. */
    if (!res.ok) { show('Xəta: ' + (res.error ?? 'bilinmir'), true); return }

    show(editing ? 'Mal yeniləndi' : 'Yeni mal əlavə edildi: ' + code)
    onSaved(code)
  }

  /* A14 — index.html:5573. With no unit options at all the original refuses
     to open the form: a <select> with nothing in it would let the user save
     an item with no unit. The existing-item exception still applies first, so
     an item whose own unit was hidden can still be edited. */
  if (!unitOptions.length) {
    return (
      <Dialog
        title={editing ? 'Malın düzəlişi' : 'Yeni mal'}
        onClose={onClose}
        footer={<><div style={{ flex: 1 }} /><Button variant="secondary" onClick={onClose}>Bağla</Button></>}
      >
        <div className="empty">
          <b>Soraqçalarda aktiv ölçü vahidi yoxdur — əvvəlcə əlavə edin</b>
        </div>
      </Dialog>
    )
  }

  return (
    <Dialog
      title={editing ? 'Malın düzəlişi' : 'Yeni mal'}
      onClose={onClose}
      footer={(
        <>
          <div style={{ flex: 1 }} />
          <Button variant="secondary" onClick={onClose}>İmtina</Button>
          <Button onClick={save} disabled={saving}>Yadda saxla</Button>
        </>
      )}
    >
      <div className="row" style={{ gridTemplateColumns: '150px 1fr' }}>
        <label className="f">
          <span>Kod</span>
          {/* Readonly when EDITING only — the code is then the item's
              identity. On create the proposed code may be overridden (A08). */}
          <input
            type="text"
            value={code}
            readOnly={editing}
            aria-label="Kod"
            onChange={(e) => setCode(e.target.value)}
          />
        </label>
        <label className="f">
          <span>Malın adı — standart: <i>Ad / ölçü / marka / mənşə</i></span>
          <input type="text" value={name} aria-label="Malın adı" onChange={(e) => setName(e.target.value)} />
        </label>
      </div>

      <div className="row" style={{ gridTemplateColumns: '1fr 1fr' }}>
        <label className="f">
          <span>Ölçü vahidi</span>
          <select value={unit} aria-label="Ölçü vahidi" onChange={(e) => setUnit(e.target.value)}>
            {unitOptions.map((u) => <option key={u} value={u}>{u}</option>)}
          </select>
        </label>
        <label className="f">
          <span>Son vahid qiyməti (₼)</span>
          <input
            type="number"
            step="0.01"
            value={price}
            aria-label="Son vahid qiyməti"
            disabled={!canPrice}
            onChange={(e) => setPrice(e.target.value)}
          />
        </label>
      </div>

      {canCategory && (
        <>
          <div className="row" style={{ gridTemplateColumns: '1fr auto' }}>
            <label className="f">
              <span>Kateqoriya{editing ? '' : ' *'}</span>
              <select value={category} aria-label="Kateqoriya" onChange={(e) => setCategory(e.target.value)}>
                {/* On create the placeholder is disabled — a category is
                    mandatory. On edit it means "not set" (NULL). */}
                <option value="" disabled={!editing}>{editing ? CAT_UNSET : 'Seçin…'}</option>
                {categoryOptions.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>
            {/* The suggestion sits beside the select, exactly as #i-cat-sug
                does (index.html:5590). Clicking it only sets the field. */}
            <div style={{ alignSelf: 'end', paddingBottom: 6 }}>
              {suggestion && (
                <Button
                  variant="secondary"
                  size="sm"
                  type="button"
                  onClick={() => setCategory(suggestion)}
                >
                  Təklif: {suggestion} — seç
                </Button>
              )}
            </div>
          </div>
          {!editing && <div className="hint">Yeni mal üçün kateqoriya seçilməlidir.</div>}
        </>
      )}

      {similar.length > 0 && (
        <div className="hint" style={{ background: 'var(--out-l)', padding: 8, borderRadius: 4 }}>
          <b>Oxşar mallar mövcuddur — təkrar yaratmayın:</b>
          {similar.map((s) => <div key={s.code}>{s.code} — {s.name}</div>)}
        </div>
      )}
    </Dialog>
  )
}
