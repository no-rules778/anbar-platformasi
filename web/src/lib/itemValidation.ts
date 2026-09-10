import type { ItemRow } from '../api/items.api'

/* Item create/edit validation — editItem()'s save handler
   (index.html:5616-5626). The messages are the original's, verbatim: they are
   what the user sees in a toast, so they are part of the parity surface. */

export interface ItemDraft {
  code: string
  name: string
  unit: string
  /** Empty means "not set"; on edit that is allowed and stores NULL. */
  category: string
}

export interface ValidationContext {
  /** true when editing an existing item, false when creating. */
  editing: boolean
  /** Codes already in the directory — duplicate check on create. */
  existingCodes: Set<string>
  /** `canEditCategory()` — isAdmin() in the original (661). */
  canEditCategory: boolean
  /** Active units from the reference directory (unitOptionsFor, 703). */
  allowedUnits: string[]
}

/** Returns the original's message, or null when the draft is acceptable. */
export function validateItem(draft: ItemDraft, ctx: ValidationContext): string | null {
  const code = draft.code.trim()
  const name = draft.name.trim()

  /* 7 digits exactly — index.html:5616. */
  if (!/^\d{7}$/.test(code)) return 'Kod 7 rəqəmli olmalıdır'
  if (name.length < 3) return 'Malın adını yazın'
  if (!ctx.editing && ctx.existingCodes.has(code)) return 'Bu kod artıq mövcuddur'

  /* Category is mandatory ONLY when creating, and only for a user who can
     edit categories. Editing an existing item to an empty category is
     allowed and means NULL — index.html:5620 and its comment. */
  if (!ctx.editing && ctx.canEditCategory && !draft.category) return 'Yeni mal üçün kateqoriya seçin'

  const unit = draft.unit.trim()
  if (!unit) return 'Ölçü vahidini seçin'
  /* A unit outside the reference directory can never be created from here:
     the original renders a <select> built from the directory, and the server
     enforces the same rule in guard_item_unit(). Validating it explicitly
     keeps a tampered form from bypassing the select. */
  if (!ctx.allowedUnits.includes(unit)) return 'Ölçü vahidini seçin'

  return null
}

/**
 * `nextCode()` — index.html:5561-5564. Highest numeric code + 1, zero-padded
 * to 7 characters.
 *
 * Note this derives the code IN THE BROWSER, which is the original's
 * behaviour and is preserved here for parity. It is inherently racy under
 * concurrent creation; the server-side alternative already exists for the
 * import path (`import_new_items` assigns codes itself).
 */
export function nextCode(items: ItemRow[]): string {
  let max = 0
  for (const i of items) {
    const n = parseInt(i.code, 10)
    if (!isNaN(n) && n > max) max = n
  }
  return String(max + 1).padStart(7, '0')
}

/* The similar-name warning shown while typing — index.html:5605-5610.
   It uses the SAME normaliser as the duplicate filter, then matches on a
   prefix of the typed name. Advisory only: it never blocks a save. */
export function similarItems(name: string, code: string, items: ItemRow[]): ItemRow[] {
  const v = name.trim().toLowerCase().replace(/[\s/.,"'-]+/g, '')
  if (v.length < 4) return []
  const probe = v.slice(0, Math.max(8, v.length - 6))
  return items
    .filter((x) => x.code !== code
      && x.name.toLowerCase().replace(/[\s/.,"'-]+/g, '').indexOf(probe) >= 0)
    .slice(0, 4)
}
